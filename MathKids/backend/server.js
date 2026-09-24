import express from "express";
import cors from "cors";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHmac, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { getPool, sql } from "./db.js";
import { authenticate, loginUser, loginWithGoogle, registerUser, requireAdmin, validateCredentials } from "./auth.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const uploadsDirectory = fileURLToPath(new URL("./uploads/", import.meta.url));
const premiumPrice = 99000;
const premiumDays = 30;
const sepayCheckoutUrl = process.env.SEPAY_ENVIRONMENT === "production" ? "https://pay.sepay.vn/v1/checkout/init" : "https://pay-sandbox.sepay.vn/v1/checkout/init";
const sepayApiUrl = process.env.SEPAY_ENVIRONMENT === "production" ? "https://pgapi.sepay.vn" : "https://pgapi-sandbox.sepay.vn";
const publicAppUrl = (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");
const publicApiUrl = (process.env.PUBLIC_API_URL || `http://localhost:${port}`).replace(/\/$/, "");

function signSePayFields(fields) {
  const signedFields = ["order_amount", "merchant", "currency", "operation", "order_description", "order_invoice_number", "customer_id", "payment_method", "success_url", "error_url", "cancel_url"];
  const signedString = signedFields.filter((field) => fields[field] !== undefined && fields[field] !== null && fields[field] !== "").map((field) => `${field}=${fields[field]}`).join(",");
  return createHmac("sha256", process.env.SEPAY_SECRET_KEY || "").update(signedString).digest("base64");
}

async function activatePremiumOrder(invoiceNumber, sepayOrderId = "", transactionId = "") {
  const pool = await getPool();
  const orderResult = await pool.request().input("invoice", sql.NVarChar(100), invoiceNumber)
    .query("SELECT TOP 1 * FROM [mk].[PaymentOrder] WHERE InvoiceNumber = @invoice");
  const order = orderResult.recordset[0];
  if (!order) return false;
  if (order.Status === "Paid") return true;

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const updateResult = await transaction.request()
      .input("invoice", sql.NVarChar(100), invoiceNumber)
      .input("sepayOrderId", sql.NVarChar(150), sepayOrderId)
      .input("transactionId", sql.NVarChar(150), transactionId)
      .query("UPDATE [mk].[PaymentOrder] SET Status = 'Paid', SePayOrderId = @sepayOrderId, SePayTransactionId = @transactionId, PaidAt = SYSUTCDATETIME() WHERE InvoiceNumber = @invoice AND Status = 'Pending'");
    if (!updateResult.rowsAffected[0]) {
      await transaction.commit();
      return true;
    }
    await transaction.request()
      .input("userId", sql.Int, order.UserId)
      .input("paymentOrderId", sql.BigInt, order.PaymentOrderId)
      .input("days", sql.Int, premiumDays)
      .query("IF NOT EXISTS (SELECT 1 FROM [mk].[PremiumSubscription] WHERE PaymentOrderId = @paymentOrderId) INSERT INTO [mk].[PremiumSubscription] (UserId, PaymentOrderId, PlanCode, StartsAt, ExpiresAt, Status) VALUES (@userId, @paymentOrderId, 'PREMIUM_MONTHLY', SYSUTCDATETIME(), DATEADD(day, @days, SYSUTCDATETIME()), 'Active')");
    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback().catch(() => {});
    throw error;
  }
}

async function reconcileSePayOrder(invoiceNumber, sepayOrderId) {
  if (!sepayOrderId || !process.env.SEPAY_MERCHANT_ID || !process.env.SEPAY_SECRET_KEY) return false;
  const credentials = Buffer.from(`${process.env.SEPAY_MERCHANT_ID}:${process.env.SEPAY_SECRET_KEY}`).toString("base64");
  const response = await fetch(`${sepayApiUrl}/v1/order/detail/${encodeURIComponent(sepayOrderId)}`, {
    headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return false;
  const payload = await response.json().catch(() => ({}));
  const order = payload.data || {};
  if (order.order_status !== "CAPTURED" || order.order_invoice_number !== invoiceNumber || Number(order.order_amount) !== premiumPrice) return false;
  const transaction = order.transactions?.find((item) => item.transaction_status === "APPROVED") || order.transactions?.[0];
  return activatePremiumOrder(invoiceNumber, sepayOrderId, String(transaction?.transaction_id || transaction?.id || ""));
}

async function reconcileSePayInvoice(invoiceNumber) {
  if (!invoiceNumber || !process.env.SEPAY_MERCHANT_ID || !process.env.SEPAY_SECRET_KEY) return false;
  const credentials = Buffer.from(`${process.env.SEPAY_MERCHANT_ID}:${process.env.SEPAY_SECRET_KEY}`).toString("base64");
  // Sandbox search does not always match invoice numbers via `q`, so fetch the
  // recent order page and match the invoice locally before activating it.
  const response = await fetch(`${sepayApiUrl}/v1/order?per_page=50&sort=created_at:desc`, {
    headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return false;
  const payload = await response.json().catch(() => ({}));
  const order = (payload.data || []).find((item) => item.order_invoice_number === invoiceNumber && item.order_status === "CAPTURED");
  if (!order || Number(order.order_amount) !== premiumPrice) return false;
  return activatePremiumOrder(invoiceNumber, order.order_id, "");
}
const assessmentSkills = [
  { code: "ARITHMETIC_ADD_SUB", name: "Cộng và trừ", icon: "➕" },
  { code: "ARITHMETIC_MUL_DIV", name: "Nhân và chia", icon: "✖️" },
  { code: "GEOMETRY", name: "Hình học", icon: "📐" },
  { code: "MEASUREMENT", name: "Đo lường", icon: "📏" },
  { code: "WORD_PROBLEM", name: "Toán có lời văn", icon: "🧩" },
];
const assessmentRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function buildAssessmentQuestions(grade) {
  return assessmentSkills.flatMap((skill, skillIndex) => [0, 1].map((variant) => {
    const level = Math.max(1, grade + variant - (skillIndex === 4 ? 1 : 0));
    let prompt;
    let answer;
    let skillName = skill.name;
    if (skillIndex === 0) {
      const a = assessmentRandom(5 * level, 12 * level);
      const b = assessmentRandom(2 * level, 8 * level);
      const subtract = variant === 1;
      prompt = subtract ? `${a + b} − ${b} = ?` : `${a} + ${b} = ?`;
      answer = subtract ? a : a + b;
    } else if (skillIndex === 1) {
      const a = assessmentRandom(2, Math.min(12, grade + 5));
      const b = assessmentRandom(2, Math.min(10, grade + 4));
      if (grade === 1) {
        skillName = "Tư duy số";
        prompt = variant === 0 ? `${a} + ${b} = ?` : `${a + b} − ${a} = ?`;
        answer = variant === 0 ? a + b : b;
      } else {
        prompt = variant === 0 ? `${a} × ${b} = ?` : `${a * b} ÷ ${a} = ?`;
        answer = variant === 0 ? a * b : b;
      }
    } else if (skillIndex === 2) {
      const side = assessmentRandom(2, 4 + grade * 2);
      if (grade === 1) {
        prompt = variant === 0 ? "Hình tam giác có mấy cạnh?" : "Hình vuông có mấy cạnh?";
        answer = variant === 0 ? 3 : 4;
      } else if (grade === 2) {
        prompt = variant === 0 ? `Hình vuông cạnh ${side} cm có chu vi bao nhiêu cm?` : `Hình chữ nhật dài ${side + 3} cm, rộng ${side} cm. Chu vi là bao nhiêu cm?`;
        answer = variant === 0 ? side * 4 : (side + 3 + side) * 2;
      } else if (grade === 3) {
        prompt = variant === 0 ? `Hình chữ nhật dài ${side + 3} cm, rộng ${side} cm. Chu vi là bao nhiêu cm?` : `Hình vuông cạnh ${side} cm có chu vi bao nhiêu cm?`;
        answer = variant === 0 ? (side + 3 + side) * 2 : side * 4;
      } else if (grade === 4) {
        prompt = variant === 0 ? `Hình chữ nhật dài ${side + 3} cm, rộng ${side} cm. Diện tích là bao nhiêu cm²?` : `Hình vuông cạnh ${side} cm có diện tích bao nhiêu cm²?`;
        answer = variant === 0 ? (side + 3) * side : side * side;
      } else {
        prompt = variant === 0 ? `Tam giác có đáy ${side * 2} cm, chiều cao ${side} cm. Diện tích là bao nhiêu cm²?` : `Hình chữ nhật dài ${side + 3} cm, rộng ${side} cm. Diện tích là bao nhiêu cm²?`;
        answer = variant === 0 ? side * side : (side + 3) * side;
      }
    } else if (skillIndex === 3) {
      const amount = assessmentRandom(2, 9) * 10;
      if (grade === 1) {
        prompt = variant === 0 ? "Một tuần có bao nhiêu ngày?" : "Một năm có bao nhiêu tháng?";
        answer = variant === 0 ? 7 : 12;
      } else if (grade === 2) {
        prompt = variant === 0 ? "1 m bằng bao nhiêu cm?" : "1 giờ có bao nhiêu phút?";
        answer = variant === 0 ? 100 : 60;
      } else if (grade === 3) {
        prompt = variant === 0 ? "1 kg bằng bao nhiêu g?" : "2 lít bằng bao nhiêu ml?";
        answer = variant === 0 ? 1000 : 2000;
      } else if (grade === 4) {
        prompt = variant === 0 ? "1 m² bằng bao nhiêu cm²?" : `${amount} cm bằng bao nhiêu mm?`;
        answer = variant === 0 ? 10000 : amount * 10;
      } else {
        prompt = variant === 0 ? "2,5 m bằng bao nhiêu cm?" : "3,2 kg bằng bao nhiêu g?";
        answer = variant === 0 ? 250 : 3200;
      }
    } else {
      const groups = assessmentRandom(2, 5 + grade);
      const each = assessmentRandom(2, 5 + grade);
      if (grade === 1) {
        prompt = variant === 0 ? `Có ${groups} quả táo, mẹ cho thêm ${each} quả. Có tất cả bao nhiêu quả?` : `Có ${groups + each} quả bóng, cho bạn ${groups} quả. Còn lại bao nhiêu quả?`;
        answer = variant === 0 ? groups + each : each;
      } else {
        prompt = variant === 0 ? `Có ${groups} túi, mỗi túi ${each} viên bi. Có tất cả bao nhiêu viên?` : `Có ${groups * each} chiếc bánh chia đều cho ${groups} bạn. Mỗi bạn được mấy chiếc?`;
        answer = variant === 0 ? groups * each : each;
      }
    }
    const correct = String(answer);
    const choices = new Set([correct]);
    while (choices.size < 4) choices.add(String(Math.max(0, answer + assessmentRandom(-Math.max(3, grade * 3), Math.max(3, grade * 3)) || answer + choices.size)));
    return { skill: { ...skill, name: skillName }, prompt, answer: correct, options: [...choices].sort(() => Math.random() - 0.5) };
  }));
}

function fallbackLearningAdvice(skillScores, grade) {
  const ordered = [...skillScores].sort((a, b) => a.score - b.score);
  const weak = ordered.filter((item) => item.score < 60);
  const strong = ordered.filter((item) => item.score >= 80);
  const route = (weak.length ? weak : ordered.slice(0, 2)).map((item, index) => ({
    day: index + 1, topicCode: item.code, title: `Ôn tập ${item.name.toLowerCase()}`,
    activity: `Học lại kiến thức lớp ${grade}, làm 5 bài cơ bản rồi thử 3 câu vận dụng.`,
  }));
  return {
    summary: weak.length ? `Mình sẽ cùng con củng cố ${weak.map((item) => item.name.toLowerCase()).join(" và ")}. Học từng bước nhỏ sẽ giúp con tự tin hơn!` : "Con đã có nền tảng khá đồng đều. Hãy luyện thêm các dạng vận dụng để tiến bộ mỗi ngày!",
    strengths: strong.map((item) => item.name),
    focus: (weak.length ? weak : ordered.slice(0, 2)).map((item) => item.name),
    roadmap: route,
  };
}

async function createLearningAdvice(skillScores, grade) {
  const fallback = fallbackLearningAdvice(skillScores, grade);
  if (!process.env.OPENAI_API_KEY) return { ...fallback, generatedBy: "System" };
  try {
    const response = await fetch(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Bạn là trợ lý giáo dục toán tiểu học Việt Nam. Chỉ dựa trên điểm kỹ năng, viết lời khích lệ ngắn, không gắn nhãn tiêu cực, đề xuất tối đa 3 hoạt động học phù hợp. Trả JSON với summary (string), strengths (array tên kỹ năng), focus (array tên kỹ năng), roadmap (array object gồm day, topicCode, title, activity). Không chẩn đoán trẻ." },
          { role: "user", content: JSON.stringify({ grade, skillScores }) },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("AI unavailable");
    const payload = await response.json();
    const advice = JSON.parse(payload.choices?.[0]?.message?.content || "{}");
    if (typeof advice.summary !== "string" || !Array.isArray(advice.roadmap)) throw new Error("Invalid AI response");
    return { ...fallback, ...advice, generatedBy: "AI" };
  } catch {
    return { ...fallback, generatedBy: "System" };
  }
}
app.use(cors({ origin: process.env.NODE_ENV === "production" ? (process.env.FRONTEND_ORIGIN || "http://localhost:5173") : true }));
app.use(express.json({ limit: "7mb" }));

// Keep authentication compatible with older frontend builds that used either
// /auth/*, /api/auth/*, or accidentally duplicated the /api prefix.
app.use((request, _response, next) => {
  if (/^\/api\/api\//i.test(request.url)) request.url = request.url.replace(/^\/api/i, "");
  if (/^\/auth\/(login|register|google)$/i.test(request.path)) request.url = `/api${request.url}`;
  next();
});

app.use("/uploads", express.static(uploadsDirectory, { fallthrough: false, maxAge: "7d" }));

app.get("/api/health", async (_request, response) => {
  try { const pool = await getPool(); await pool.request().query("SELECT 1 AS ok"); response.json({ ok: true, database: process.env.DB_NAME || "MathKids" }); }
  catch (error) { response.status(503).json({ ok: false, message: "Không thể kết nối SQL Server.", detail: error.message }); }
});

app.post("/api/auth/register", async (request, response) => {
  const body = request.body || {};
  const errors = validateCredentials(body, true);
  if (Object.keys(errors).length) return response.status(400).json({ message: "Dữ liệu không hợp lệ.", errors });
  try { return response.status(201).json(await registerUser(body)); }
  catch (error) { return response.status(error.status || 500).json({ message: error.status ? error.message : "Đăng ký thất bại.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) }); }
});

app.post("/api/auth/login", async (request, response) => {
  const body = request.body || {};
  const errors = validateCredentials(body, false);
  if (Object.keys(errors).length) return response.status(400).json({ message: "Dữ liệu không hợp lệ.", errors });
  try { return response.json(await loginUser(body)); }
  catch (error) { return response.status(error.status || 500).json({ message: error.status ? error.message : "Đăng nhập thất bại.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) }); }
});

app.post("/api/auth/google", async (request, response) => {
  try { return response.json(await loginWithGoogle(request.body?.credential)); }
  catch (error) { return response.status(error.status || 500).json({ message: error.status ? error.message : "Đăng nhập Google thất bại.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) }); }
});

app.get("/api/auth/me", authenticate, async (request, response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, request.user.userId)
      .query("SELECT UserId, Email, DisplayName, UserRole, CreatedAt FROM [mk].[AppUser] WHERE UserId = @userId AND IsActive = 1");
    if (!result.recordset[0]) return response.status(404).json({ message: "Không tìm thấy người dùng." });
    const user = result.recordset[0];
    return response.json({ user: { id: user.UserId, email: user.Email, name: user.DisplayName, role: user.UserRole, createdAt: user.CreatedAt } });
  } catch { return response.status(500).json({ message: "Không thể tải thông tin tài khoản." }); }
});

app.get("/api/admin/dashboard", authenticate, requireAdmin, async (_request, response) => {
  try {
    const pool = await getPool();
    const summaryResult = await pool.request().query(`
      SELECT
        (SELECT COUNT_BIG(*) FROM [mk].[AppUser]) AS TotalUsers,
        (SELECT COUNT_BIG(*) FROM [mk].[AppUser] WHERE IsActive = 1) AS ActiveUsers,
        (SELECT COUNT_BIG(*) FROM [mk].[AppUser] WHERE UserRole = 'Admin') AS AdminUsers,
        (SELECT COUNT_BIG(*) FROM [mk].[Student]) AS StudentUsers,
        (SELECT COUNT_BIG(*) FROM [mk].[AppUser] WHERE CreatedAt >= DATEADD(day, -7, SYSUTCDATETIME())) AS NewUsersThisWeek
    `);
    const usersResult = await pool.request().query(`
      SELECT TOP 12 u.UserId, u.DisplayName, u.Email, u.UserRole, u.IsActive, u.CreatedAt, s.Grade
      FROM [mk].[AppUser] u
      LEFT JOIN [mk].[Student] s ON s.StudentId = u.UserId
      ORDER BY u.CreatedAt DESC
    `);
    const summary = summaryResult.recordset[0];
    return response.json({
      summary: {
        totalUsers: Number(summary.TotalUsers),
        activeUsers: Number(summary.ActiveUsers),
        adminUsers: Number(summary.AdminUsers),
        studentUsers: Number(summary.StudentUsers),
        newUsersThisWeek: Number(summary.NewUsersThisWeek),
      },
      recentUsers: usersResult.recordset.map((user) => ({
        id: user.UserId,
        name: user.DisplayName,
        email: user.Email,
        role: user.UserRole,
        active: user.IsActive,
        grade: user.Grade,
        createdAt: user.CreatedAt,
      })),
    });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải dashboard quản trị.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/payments/premium/create", authenticate, async (request, response) => {
  if (request.user.role === "Admin") return response.status(403).json({ message: "Tài khoản quản trị không thể đăng ký Premium học sinh." });
  if (!process.env.SEPAY_MERCHANT_ID || !process.env.SEPAY_SECRET_KEY) return response.status(503).json({ message: "Thanh toán Sandbox chưa được cấu hình MERCHANT_ID và SECRET_KEY." });
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(publicApiUrl)) return response.status(503).json({ message: "Thanh toán cần PUBLIC_API_URL là domain public để cấu hình IPN SePay." });
  const invoiceNumber = `MKPREM_${request.user.userId}_${Date.now()}_${randomUUID().slice(0, 8).toUpperCase()}`;
  const fields = {
    order_amount: String(premiumPrice),
    merchant: process.env.SEPAY_MERCHANT_ID,
    currency: "VND",
    operation: "PURCHASE",
    order_description: "MathKids Premium 30 ngay",
    order_invoice_number: invoiceNumber,
    customer_id: `MATHKIDS_${request.user.userId}`,
    payment_method: "BANK_TRANSFER",
    success_url: `${publicApiUrl}/api/payments/return/success?invoice=${encodeURIComponent(invoiceNumber)}`,
    error_url: `${publicApiUrl}/api/payments/return/error?invoice=${encodeURIComponent(invoiceNumber)}`,
    cancel_url: `${publicApiUrl}/api/payments/return/cancel?invoice=${encodeURIComponent(invoiceNumber)}`,
  };
  try {
    const pool = await getPool();
    await pool.request().input("userId", sql.Int, request.user.userId).input("invoice", sql.NVarChar(100), invoiceNumber)
      .input("amount", sql.Decimal(12, 2), premiumPrice).input("currency", sql.VarChar(3), "VND")
      .query("INSERT INTO [mk].[PaymentOrder] (UserId, InvoiceNumber, Amount, Currency, Status) VALUES (@userId, @invoice, @amount, @currency, 'Pending')");
    return response.json({ action: sepayCheckoutUrl, fields: { ...fields, signature: signSePayFields(fields) }, invoiceNumber });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tạo đơn thanh toán.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/payments/sepay/ipn", async (request, response) => {
  if (process.env.SEPAY_SECRET_KEY && request.headers["x-secret-key"] !== process.env.SEPAY_SECRET_KEY) return response.status(401).json({ message: "IPN không hợp lệ." });
  const payload = request.body || {};
  const invoiceNumber = payload.order?.order_invoice_number;
  const notificationType = payload.notification_type;
  if (!invoiceNumber || !["ORDER_PAID", "TRANSACTION_VOID"].includes(notificationType)) return response.status(400).json({ message: "IPN thiếu dữ liệu cần thiết." });
  try {
    const pool = await getPool();
    const orderResult = await pool.request().input("invoice", sql.NVarChar(100), invoiceNumber).query("SELECT TOP 1 * FROM [mk].[PaymentOrder] WHERE InvoiceNumber = @invoice");
    const order = orderResult.recordset[0];
    if (!order) return response.status(404).json({ message: "Không tìm thấy đơn thanh toán." });
    if (notificationType === "TRANSACTION_VOID") {
      await pool.request().input("invoice", sql.NVarChar(100), invoiceNumber).query("UPDATE [mk].[PaymentOrder] SET Status = 'Cancelled', SePayOrderId = @invoice WHERE InvoiceNumber = @invoice AND Status = 'Pending'");
      return response.json({ success: true });
    }
    if (order.Status === "Paid") return response.json({ success: true });
    await activatePremiumOrder(invoiceNumber, String(payload.order?.id || payload.order?.order_id || ""), String(payload.transaction?.transaction_id || payload.transaction?.id || ""));
    return response.json({ success: true });
  } catch (error) {
    return response.status(500).json({ message: "Không thể xử lý IPN.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/payments/return/:status", (request, response) => {
  const status = ["success", "error", "cancel"].includes(request.params.status) ? request.params.status : "error";
  const invoice = typeof request.query.invoice === "string" ? request.query.invoice : "";
  const sepayOrderId = typeof request.query.order_id === "string" ? request.query.order_id : "";
  const reconcile = status === "success" && invoice && sepayOrderId ? reconcileSePayOrder(invoice, sepayOrderId).catch(() => false) : Promise.resolve(false);
  return reconcile.then(() => response.redirect(`${publicAppUrl}/thanh-toan/${status}?invoice=${encodeURIComponent(invoice)}`));
});

app.get("/api/payments/premium/status", authenticate, async (request, response) => {
  try {
    const pool = await getPool();
    const userId = request.user.userId;
    let result = await pool.request().input("userId", sql.Int, userId).query(`
      SELECT TOP 1 PlanCode AS planCode, StartsAt AS startsAt, ExpiresAt AS expiresAt
      FROM [mk].[PremiumSubscription]
      WHERE UserId = @userId AND Status = 'Active' AND ExpiresAt > SYSUTCDATETIME()
      ORDER BY ExpiresAt DESC
    `);
    if (!result.recordset[0]) {
      const pending = await pool.request().input("userId", sql.Int, userId).query("SELECT TOP 1 InvoiceNumber FROM [mk].[PaymentOrder] WHERE UserId = @userId AND Status = 'Pending' ORDER BY CreatedAt DESC");
      if (pending.recordset[0]) {
        await reconcileSePayInvoice(pending.recordset[0].InvoiceNumber).catch(() => false);
        result = await pool.request().input("userId", sql.Int, userId).query(`
          SELECT TOP 1 PlanCode AS planCode, StartsAt AS startsAt, ExpiresAt AS expiresAt
          FROM [mk].[PremiumSubscription]
          WHERE UserId = @userId AND Status = 'Active' AND ExpiresAt > SYSUTCDATETIME()
          ORDER BY ExpiresAt DESC
        `);
      }
    }
    const subscription = result.recordset[0];
    return response.json({ isPremium: Boolean(subscription), subscription: subscription || null });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải trạng thái Premium.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/payments/:invoice/status", authenticate, async (request, response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().input("invoice", sql.NVarChar(100), request.params.invoice).input("userId", sql.Int, request.user.userId).query(`
      SELECT po.InvoiceNumber AS invoiceNumber, po.Amount AS amount, po.Status AS status, po.PaidAt AS paidAt, ps.ExpiresAt AS expiresAt
      FROM [mk].[PaymentOrder] po LEFT JOIN [mk].[PremiumSubscription] ps ON ps.PaymentOrderId = po.PaymentOrderId
      WHERE po.InvoiceNumber = @invoice AND po.UserId = @userId
    `);
    if (!result.recordset[0]) return response.status(404).json({ message: "Không tìm thấy đơn thanh toán." });
    return response.json({ payment: result.recordset[0] });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải trạng thái thanh toán.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/students/me/assessment/start", authenticate, async (request, response) => {
  const gradeInput = Number(request.body?.grade);
  if (!Number.isInteger(gradeInput) || gradeInput < 1 || gradeInput > 5) return response.status(400).json({ message: "Lớp cần đánh giá phải từ 1 đến 5." });
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    const topicsResult = await pool.request().query("SELECT TopicId, TopicCode, TopicName FROM [mk].[Topic]");
    const topicMap = new Map(topicsResult.recordset.map((topic) => [topic.TopicCode, topic]));
    if (assessmentSkills.some((skill) => !topicMap.has(skill.code))) return response.status(503).json({ message: "Thiếu dữ liệu chủ đề toán học. Hãy chạy script MathKidsDB.sql mới nhất." });
    await transaction.begin();
    const testResult = await transaction.request().input("grade", sql.TinyInt, gradeInput)
      .query("INSERT INTO [mk].[PlacementTest] (Title, Grade, IsActive) OUTPUT INSERTED.PlacementTestId VALUES (N'Đánh giá năng lực toán lớp ' + CAST(@grade AS NVARCHAR(1)), @grade, 1)");
    const testId = testResult.recordset[0].PlacementTestId;
    const questions = buildAssessmentQuestions(gradeInput);
    const savedQuestions = [];
    for (const [index, question] of questions.entries()) {
      const topic = topicMap.get(question.skill.code);
      const result = await transaction.request()
        .input("topicId", sql.Int, topic.TopicId).input("grade", sql.TinyInt, gradeInput)
        .input("difficulty", sql.TinyInt, Math.min(5, Math.max(1, gradeInput + (index % 2))))
        .input("prompt", sql.NVarChar(sql.MAX), question.prompt)
        .input("answer", sql.NVarChar(sql.MAX), JSON.stringify({ answer: question.answer }))
        .input("options", sql.NVarChar(sql.MAX), JSON.stringify(question.options))
        .query("INSERT INTO [mk].[Question] (TopicId, Grade, Difficulty, QuestionType, Prompt, AnswerData, OptionsData) OUTPUT INSERTED.QuestionId VALUES (@topicId, @grade, @difficulty, 'MultipleChoice', @prompt, @answer, @options)");
      const questionId = result.recordset[0].QuestionId;
      await transaction.request().input("testId", sql.Int, testId).input("questionId", sql.Int, questionId).input("order", sql.SmallInt, index + 1)
        .query("INSERT INTO [mk].[PlacementTestQuestion] (PlacementTestId, QuestionId, QuestionOrder) VALUES (@testId, @questionId, @order)");
      savedQuestions.push({ id: questionId, skillCode: question.skill.code, skillName: question.skill.name, prompt: question.prompt, options: question.options });
    }
    const attemptResult = await transaction.request().input("testId", sql.Int, testId).input("studentId", sql.Int, request.user.userId)
      .query("INSERT INTO [mk].[PlacementAttempt] (PlacementTestId, StudentId) OUTPUT INSERTED.AttemptId VALUES (@testId, @studentId)");
    await transaction.commit();
    return response.status(201).json({ attemptId: attemptResult.recordset[0].AttemptId, grade: gradeInput, questions: savedQuestions });
  } catch (error) {
    await transaction.rollback().catch(() => {});
    return response.status(500).json({ message: "Không thể bắt đầu bài đánh giá.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/students/me/assessment/:attemptId/submit", authenticate, async (request, response) => {
  const attemptId = Number(request.params.attemptId);
  const answers = request.body?.answers;
  if (!Number.isSafeInteger(attemptId) || attemptId < 1 || !Array.isArray(answers) || answers.length !== 10 || answers.some((item) => !item || !Number.isInteger(Number(item.questionId)) || typeof item.answer !== "string")) {
    return response.status(400).json({ message: "Bài làm chưa đầy đủ hoặc không hợp lệ." });
  }
  let transaction;
  try {
    const pool = await getPool();
    const attemptResult = await pool.request().input("attemptId", sql.BigInt, attemptId).input("studentId", sql.Int, request.user.userId).query(`
      SELECT pa.AttemptId, pa.PlacementTestId, pa.SubmittedAt, pt.Grade
      FROM [mk].[PlacementAttempt] pa JOIN [mk].[PlacementTest] pt ON pt.PlacementTestId = pa.PlacementTestId
      WHERE pa.AttemptId = @attemptId AND pa.StudentId = @studentId
    `);
    const attempt = attemptResult.recordset[0];
    if (!attempt) return response.status(404).json({ message: "Không tìm thấy bài đánh giá." });
    if (attempt.SubmittedAt) return response.status(409).json({ message: "Bài đánh giá này đã được nộp rồi." });
    const questionResult = await pool.request().input("testId", sql.Int, attempt.PlacementTestId)
      .query("SELECT q.QuestionId, q.Prompt, q.AnswerData, t.TopicCode, t.TopicName FROM [mk].[PlacementTestQuestion] ptq JOIN [mk].[Question] q ON q.QuestionId = ptq.QuestionId JOIN [mk].[Topic] t ON t.TopicId = q.TopicId WHERE ptq.PlacementTestId = @testId");
    const supplied = new Map(answers.map((item) => [Number(item.questionId), item.answer.trim()]));
    if (supplied.size !== 10 || questionResult.recordset.length !== 10 || questionResult.recordset.some((question) => !supplied.has(question.QuestionId))) return response.status(400).json({ message: "Danh sách câu trả lời không khớp bài đánh giá." });
    const skillMap = new Map(assessmentSkills.map((skill) => [skill.code, { ...skill, correct: 0, total: 0 }]));
    const markedAnswers = questionResult.recordset.map((question) => {
      const isCorrect = supplied.get(question.QuestionId) === String(JSON.parse(question.AnswerData).answer);
      const skill = skillMap.get(question.TopicCode);
      skill.total += 1;
      if (isCorrect) skill.correct += 1;
      return { questionId: question.QuestionId, answer: supplied.get(question.QuestionId), isCorrect, skillCode: question.TopicCode };
    });
    const skillScores = [...skillMap.values()].map((skill) => ({ code: skill.code, name: attempt.Grade === 1 && skill.code === "ARITHMETIC_MUL_DIV" ? "Tư duy số" : skill.name, score: Math.round(skill.correct / skill.total * 100), correct: skill.correct, total: skill.total }));
    const overallScore = Math.round(markedAnswers.filter((answer) => answer.isCorrect).length * 10);
    const advice = await createLearningAdvice(skillScores, attempt.Grade);
    const summary = { overallScore, grade: attempt.Grade, skillScores, advice };
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    for (const answer of markedAnswers) {
      await transaction.request().input("attemptId", sql.BigInt, attemptId).input("questionId", sql.Int, answer.questionId)
        .input("answer", sql.NVarChar(sql.MAX), JSON.stringify({ answer: answer.answer })).input("correct", sql.Bit, answer.isCorrect)
        .query("INSERT INTO [mk].[PlacementAnswer] (AttemptId, QuestionId, AnswerData, IsCorrect) VALUES (@attemptId, @questionId, @answer, @correct)");
    }
    await transaction.request().input("attemptId", sql.BigInt, attemptId).input("score", sql.Decimal(6, 2), overallScore)
      .input("summary", sql.NVarChar(sql.MAX), JSON.stringify(summary))
      .query("UPDATE [mk].[PlacementAttempt] SET Score = @score, AbilitySummary = @summary, SubmittedAt = SYSUTCDATETIME() WHERE AttemptId = @attemptId");
    await transaction.request().input("studentId", sql.Int, request.user.userId)
      .query("UPDATE [mk].[LearningPath] SET Status = 'Archived', EndDate = CAST(SYSUTCDATETIME() AS DATE) WHERE StudentId = @studentId AND Status = 'Active'");
    const pathResult = await transaction.request().input("studentId", sql.Int, request.user.userId)
      .input("generatedBy", sql.VarChar(20), advice.generatedBy)
      .input("reason", sql.NVarChar(1000), advice.summary.slice(0, 1000))
      .query("INSERT INTO [mk].[LearningPath] (StudentId, GeneratedBy, StartDate, Status, Reason) OUTPUT INSERTED.LearningPathId VALUES (@studentId, @generatedBy, CAST(SYSUTCDATETIME() AS DATE), 'Active', @reason)");
    const topicRows = await transaction.request().query("SELECT TopicId, TopicCode FROM [mk].[Topic]");
    const topicIds = new Map(topicRows.recordset.map((topic) => [topic.TopicCode, topic.TopicId]));
    const roadmap = Array.isArray(advice.roadmap) ? advice.roadmap.slice(0, 3) : [];
    let safeRoadmap = roadmap.filter((item) => item && topicIds.has(item.topicCode) && typeof item.title === "string" && typeof item.activity === "string");
    if (!safeRoadmap.length) safeRoadmap = fallbackLearningAdvice(skillScores, attempt.Grade).roadmap;
    const pathId = pathResult.recordset[0].LearningPathId;
    for (const [index, item] of safeRoadmap.entries()) {
      const plannedDate = new Date();
      plannedDate.setUTCDate(plannedDate.getUTCDate() + index);
      await transaction.request().input("pathId", sql.BigInt, pathId).input("topicId", sql.Int, topicIds.get(item.topicCode))
        .input("plannedDate", sql.Date, plannedDate).input("order", sql.SmallInt, index + 1)
        .query("INSERT INTO [mk].[LearningPathItem] (LearningPathId, TopicId, PlannedDate, ItemOrder) VALUES (@pathId, @topicId, @plannedDate, @order)");
    }
    await transaction.commit();
    return response.json({ attemptId, ...summary });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    return response.status(500).json({ message: "Không thể chấm bài hoặc tạo lộ trình.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/students/me/assessment/latest", authenticate, async (request, response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().input("studentId", sql.Int, request.user.userId).query(`
      SELECT TOP 1 AttemptId, Score, AbilitySummary, SubmittedAt
      FROM [mk].[PlacementAttempt]
      WHERE StudentId = @studentId AND SubmittedAt IS NOT NULL
      ORDER BY SubmittedAt DESC
    `);
    const attempt = result.recordset[0];
    return response.json({ result: attempt ? { attemptId: attempt.AttemptId, score: Number(attempt.Score), submittedAt: attempt.SubmittedAt, ...JSON.parse(attempt.AbilitySummary) } : null });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải kết quả đánh giá.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/students/me/assessment/history", authenticate, async (request, response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().input("studentId", sql.Int, request.user.userId).query(`
      SELECT TOP 20 pa.AttemptId, pt.Grade, pa.Score, pa.AbilitySummary, pa.SubmittedAt
      FROM [mk].[PlacementAttempt] pa
      INNER JOIN [mk].[PlacementTest] pt ON pt.PlacementTestId = pa.PlacementTestId
      WHERE pa.StudentId = @studentId AND pa.SubmittedAt IS NOT NULL
      ORDER BY pa.SubmittedAt DESC
    `);
    return response.json({ history: result.recordset.map((attempt) => {
      let summary = {};
      try { summary = JSON.parse(attempt.AbilitySummary || "{}"); } catch { summary = {}; }
      return {
        attemptId: attempt.AttemptId,
        grade: Number(attempt.Grade),
        score: Number(attempt.Score),
        submittedAt: attempt.SubmittedAt,
        summary: summary.advice?.summary || "Đã hoàn thành bài đánh giá.",
      };
    }) });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải lịch sử đánh giá.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/students/me/dashboard", authenticate, async (request, response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, request.user.userId).query(`
      SELECT u.UserId, u.Email, u.DisplayName, u.UserRole,
             s.Grade, s.TotalXp, s.TotalStars, s.AvatarUrl,
             (SELECT COUNT_BIG(*) FROM [mk].[LessonAttempt] la WHERE la.StudentId = s.StudentId AND la.Status = 'Completed') AS CompletedLessons,
             (SELECT COUNT_BIG(*) FROM [mk].[PlacementAttempt] pa WHERE pa.StudentId = s.StudentId AND pa.SubmittedAt IS NOT NULL) AS CompletedAssessments
      FROM [mk].[AppUser] u
      INNER JOIN [mk].[Student] s ON s.StudentId = u.UserId
      WHERE u.UserId = @userId AND u.IsActive = 1
    `);
    if (!result.recordset[0]) return response.status(404).json({ message: "Không tìm thấy hồ sơ học sinh." });
    const row = result.recordset[0];
    return response.json({ student: {
      id: row.UserId,
      name: row.DisplayName,
      email: row.Email,
      role: row.UserRole,
      grade: row.Grade,
      totalXp: row.TotalXp,
      totalStars: row.TotalStars,
      avatarUrl: row.AvatarUrl,
      completedLessons: Number(row.CompletedLessons),
      completedAssessments: Number(row.CompletedAssessments),
    } });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải dashboard học sinh.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/students/me/profile", authenticate, async (request, response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, request.user.userId).query(`
      SELECT u.UserId, u.Email, u.DisplayName, u.UserRole, u.CreatedAt,
             s.DateOfBirth, s.Grade, s.AvatarUrl
      FROM [mk].[AppUser] u
      INNER JOIN [mk].[Student] s ON s.StudentId = u.UserId
      WHERE u.UserId = @userId AND u.IsActive = 1
    `);
    const row = result.recordset[0];
    if (!row) return response.status(404).json({ message: "Không tìm thấy hồ sơ học sinh." });
    return response.json({ profile: {
      id: row.UserId, name: row.DisplayName, email: row.Email, role: row.UserRole,
      dateOfBirth: row.DateOfBirth ? row.DateOfBirth.toISOString().slice(0, 10) : "",
      grade: row.Grade, avatarUrl: row.AvatarUrl || "", createdAt: row.CreatedAt,
    } });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải hồ sơ học sinh.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/students/me/avatar", authenticate, async (request, response) => {
  const { imageData } = request.body || {};
  const match = typeof imageData === "string" && imageData.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/);
  if (!match) return response.status(400).json({ message: "Chọn ảnh PNG, JPG hoặc WEBP hợp lệ." });
  const [, imageType, encoded] = match;
  const imageBuffer = Buffer.from(encoded, "base64");
  if (imageBuffer.length > 5 * 1024 * 1024) return response.status(413).json({ message: "Ảnh không được lớn hơn 5 MB." });
  const signatures = {
    png: imageBuffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    jpeg: imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8 && imageBuffer[2] === 0xff,
    webp: imageBuffer.toString("ascii", 0, 4) === "RIFF" && imageBuffer.toString("ascii", 8, 12) === "WEBP",
  };
  if (!imageBuffer.length || !signatures[imageType]) return response.status(400).json({ message: "Nội dung ảnh không khớp định dạng đã chọn." });
  const extension = imageType === "jpeg" ? "jpg" : imageType;
  const filename = `${randomUUID()}.${extension}`;
  try {
    await mkdir(uploadsDirectory, { recursive: true });
    await writeFile(path.join(uploadsDirectory, filename), imageBuffer, { flag: "wx" });
    return response.status(201).json({ avatarUrl: `/uploads/${filename}` });
  } catch (error) {
    return response.status(500).json({ message: "Không thể lưu ảnh đại diện.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.patch("/api/students/me/profile", authenticate, async (request, response) => {
  const { name, email, dateOfBirth, grade, avatarUrl = "" } = request.body || {};
  const errors = {};
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120) errors.name = "Tên phải có từ 2 đến 120 ký tự.";
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) || email.trim().length > 255) errors.email = "Email không hợp lệ.";
  const numericGrade = Number(grade);
  if (!Number.isInteger(numericGrade) || numericGrade < 1 || numericGrade > 5) errors.grade = "Lớp phải từ 1 đến 5.";
  if (dateOfBirth && (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || Number.isNaN(Date.parse(`${dateOfBirth}T00:00:00Z`)) || new Date(`${dateOfBirth}T00:00:00Z`) > new Date())) errors.dateOfBirth = "Ngày sinh không hợp lệ.";
  if (typeof avatarUrl !== "string" || avatarUrl.length > 500 || (avatarUrl && !(/^https?:\/\//i.test(avatarUrl) || /^\/uploads\/[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(avatarUrl)))) errors.avatarUrl = "Ảnh đại diện không hợp lệ.";
  if (Object.keys(errors).length) return response.status(400).json({ message: "Thông tin hồ sơ chưa hợp lệ.", errors });

  const transaction = new sql.Transaction(await getPool());
  try {
    await transaction.begin();
    await transaction.request()
      .input("userId", sql.Int, request.user.userId)
      .input("name", sql.NVarChar(120), name.trim())
      .input("email", sql.NVarChar(255), email.trim().toLowerCase())
      .query("UPDATE [mk].[AppUser] SET DisplayName = @name, Email = @email, UpdatedAt = SYSUTCDATETIME() WHERE UserId = @userId AND IsActive = 1");
    await transaction.request()
      .input("userId", sql.Int, request.user.userId)
      .input("grade", sql.TinyInt, numericGrade)
      .input("dateOfBirth", sql.Date, dateOfBirth || null)
      .input("avatarUrl", sql.NVarChar(500), avatarUrl || null)
      .query("UPDATE [mk].[Student] SET Grade = @grade, DateOfBirth = @dateOfBirth, AvatarUrl = @avatarUrl WHERE StudentId = @userId");
    const result = await transaction.request().input("userId", sql.Int, request.user.userId).query(`
      SELECT u.UserId, u.Email, u.DisplayName, u.UserRole,
             s.DateOfBirth, s.Grade, s.AvatarUrl, s.TotalXp, s.TotalStars
      FROM [mk].[AppUser] u INNER JOIN [mk].[Student] s ON s.StudentId = u.UserId
      WHERE u.UserId = @userId
    `);
    await transaction.commit();
    const row = result.recordset[0];
    return response.json({ message: "Đã cập nhật hồ sơ.", profile: {
      id: row.UserId, name: row.DisplayName, email: row.Email, role: row.UserRole,
      dateOfBirth: row.DateOfBirth ? row.DateOfBirth.toISOString().slice(0, 10) : "",
      grade: row.Grade, avatarUrl: row.AvatarUrl || "", totalXp: row.TotalXp, totalStars: row.TotalStars,
    } });
  } catch (error) {
    await transaction.rollback().catch(() => {});
    if (error.number === 2627 || error.number === 2601) return response.status(409).json({ message: "Email này đã được tài khoản khác sử dụng.", errors: { email: "Email đã được sử dụng." } });
    return response.status(500).json({ message: "Không thể lưu hồ sơ.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.use((_request, response) => response.status(404).json({ message: "Không tìm thấy API." }));
app.listen(port, () => console.log(`MathKids API đang chạy tại http://localhost:${port}`));
