import express from "express";
import cors from "cors";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHmac, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { getPool, sql } from "./db.js";
import { authenticate, loginUser, loginWithGoogle, registerUser, requireAdmin, requireParent, validateCredentials } from "./auth.js";
import bcrypt from "bcrypt";

const app = express();
const port = Number(process.env.PORT || 4000);
const uploadsDirectory = fileURLToPath(new URL("./uploads/", import.meta.url));
const questionBankMigrationPath = fileURLToPath(new URL("./migrations/QuestionBank.sql", import.meta.url));
const learningPathMigrationPath = fileURLToPath(new URL("./migrations/LearningPath.sql", import.meta.url));
const monthlyAssessmentMigrationPath = fileURLToPath(new URL("./migrations/MonthlyAssessment.sql", import.meta.url));
const weeklyAssessmentMigrationPath = fileURLToPath(new URL("./migrations/WeeklyAssessment.sql", import.meta.url));
const parentModuleMigrationPath = fileURLToPath(new URL("./migrations/ParentModule.sql", import.meta.url));
const premiumPrice = 99000;
const premiumDays = 30;
const sepayCheckoutUrl = process.env.SEPAY_ENVIRONMENT === "production" ? "https://pay.sepay.vn/v1/checkout/init" : "https://pay-sandbox.sepay.vn/v1/checkout/init";
const sepayApiUrl = process.env.SEPAY_ENVIRONMENT === "production" ? "https://pgapi.sepay.vn" : "https://pgapi-sandbox.sepay.vn";
const publicAppUrl = (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");
const publicApiUrl = (process.env.PUBLIC_API_URL || `http://localhost:${port}`).replace(/\/$/, "");
let dailyChallengeSchemaPromise;
let questionBankSchemaPromise;
let learningPathSchemaPromise;
let monthlyAssessmentSchemaPromise;
let weeklyAssessmentSchemaPromise;
let parentModuleSchemaPromise;

const rewardCatalog = [
  { code: "rainbow-frame", category: "frame", name: "Khung cầu vồng", icon: "🌈", description: "Trang trí avatar bằng viền cầu vồng.", cost: 5 },
  { code: "fox-companion", category: "companion", name: "Cáo đồng hành", icon: "🦊", description: "Một người bạn nhỏ cổ vũ trên dashboard.", cost: 10 },
  { code: "space-theme", category: "theme", name: "Chủ đề vũ trụ", icon: "🚀", description: "Đổi dashboard sang phong cách không gian.", cost: 15 },
];

const xpBadges = [
  { code: "first-steps", name: "Bước đầu tiên", icon: "🌱", threshold: 50, description: "Tích lũy 50 XP" },
  { code: "explorer", name: "Nhà khám phá", icon: "🧭", threshold: 150, description: "Tích lũy 150 XP" },
  { code: "math-star", name: "Siêu sao Toán", icon: "🌟", threshold: 500, description: "Tích lũy 500 XP" },
  { code: "math-legend", name: "Huyền thoại Toán", icon: "🏆", threshold: 1000, description: "Tích lũy 1.000 XP" },
];

const dailyChallengeBank = {
  1: [
    { prompt: "8 + 7 = ?", options: ["15", "14", "16"], answer: "15" },
    { prompt: "13 − 5 = ?", options: ["8", "7", "9"], answer: "8" },
    { prompt: "9 + 6 = ?", options: ["15", "14", "16"], answer: "15" },
  ],
  2: [
    { prompt: "36 − 18 = ?", options: ["18", "16", "20"], answer: "18" },
    { prompt: "24 + 19 = ?", options: ["43", "42", "45"], answer: "43" },
    { prompt: "6 × 7 = ?", options: ["42", "36", "48"], answer: "42" },
  ],
  3: [
    { prompt: "6 × 4 = ?", options: ["24", "20", "28"], answer: "24" },
    { prompt: "7 × 8 = ?", options: ["56", "54", "64"], answer: "56" },
    { prompt: "54 ÷ 6 = ?", options: ["9", "8", "7"], answer: "9" },
  ],
  4: [
    { prompt: "1/2 + 1/4 = ?", options: ["3/4", "2/6", "1/6"], answer: "3/4" },
    { prompt: "3/8 + 2/8 = ?", options: ["5/8", "5/16", "1/8"], answer: "5/8" },
    { prompt: "36 ÷ 4 = ?", options: ["9", "8", "6"], answer: "9" },
  ],
  5: [
    { prompt: "25% của 80 là ?", options: ["20", "25", "15"], answer: "20" },
    { prompt: "3,5 + 2,4 = ?", options: ["5,9", "5,7", "6,1"], answer: "5,9" },
    { prompt: "15% của 200 là ?", options: ["30", "25", "35"], answer: "30" },
  ],
};

function vietnamDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

function vietnamMonthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}`;
}

function vietnamWeekStartKey(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  const localDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  localDate.setUTCDate(localDate.getUTCDate() - ((localDate.getUTCDay() + 6) % 7));
  return `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, "0")}-${String(localDate.getUTCDate()).padStart(2, "0")}`;
}

function getDailyChallenge(grade, date) {
  const questions = dailyChallengeBank[grade] || dailyChallengeBank[1];
  const questionIndex = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000) % questions.length;
  return questions[questionIndex];
}

async function ensureDailyChallengeSchema() {
  if (!dailyChallengeSchemaPromise) {
    dailyChallengeSchemaPromise = getPool().then((pool) => pool.request().query(`
      IF OBJECT_ID(N'[mk].[DailyChallengeAttempt]', N'U') IS NULL
      BEGIN
        CREATE TABLE [mk].[DailyChallengeAttempt] (
          StudentId INT NOT NULL,
          ChallengeDate DATE NOT NULL,
          Grade TINYINT NOT NULL,
          AttemptsCount SMALLINT NOT NULL CONSTRAINT DF_DailyChallengeAttempt_Attempts DEFAULT (0),
          LastAnswer NVARCHAR(50) NULL,
          IsCompleted BIT NOT NULL CONSTRAINT DF_DailyChallengeAttempt_Completed DEFAULT (0),
          RewardXp INT NOT NULL CONSTRAINT DF_DailyChallengeAttempt_RewardXp DEFAULT (0),
          RewardStars INT NOT NULL CONSTRAINT DF_DailyChallengeAttempt_RewardStars DEFAULT (0),
          CompletedAt DATETIME2 NULL,
          CONSTRAINT PK_DailyChallengeAttempt PRIMARY KEY (StudentId, ChallengeDate),
          CONSTRAINT FK_DailyChallengeAttempt_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId)
        );
      END
      IF OBJECT_ID(N'[mk].[StudentRewardInventory]', N'U') IS NULL
      BEGIN
        CREATE TABLE [mk].[StudentRewardInventory] (
          StudentId INT NOT NULL,
          RewardCode NVARCHAR(40) NOT NULL,
          PurchasedAt DATETIME2 NOT NULL CONSTRAINT DF_StudentRewardInventory_PurchasedAt DEFAULT (SYSUTCDATETIME()),
          IsEquipped BIT NOT NULL CONSTRAINT DF_StudentRewardInventory_IsEquipped DEFAULT (0),
          CONSTRAINT PK_StudentRewardInventory PRIMARY KEY (StudentId, RewardCode),
          CONSTRAINT FK_StudentRewardInventory_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId)
        );
      END
      IF OBJECT_ID(N'[mk].[StudentRewardClaim]', N'U') IS NULL
      BEGIN
        CREATE TABLE [mk].[StudentRewardClaim] (
          StudentId INT NOT NULL,
          ClaimDate DATE NOT NULL,
          ActivityCode NVARCHAR(30) NOT NULL,
          SourceId BIGINT NULL,
          RewardXp INT NOT NULL,
          RewardStars INT NOT NULL,
          ClaimedAt DATETIME2 NOT NULL CONSTRAINT DF_StudentRewardClaim_ClaimedAt DEFAULT (SYSUTCDATETIME()),
          CONSTRAINT PK_StudentRewardClaim PRIMARY KEY (StudentId, ClaimDate, ActivityCode),
          CONSTRAINT FK_StudentRewardClaim_Student FOREIGN KEY (StudentId) REFERENCES [mk].[Student](StudentId)
        );
      END
    `));
  }
  try {
    await dailyChallengeSchemaPromise;
  } catch (error) {
    dailyChallengeSchemaPromise = undefined;
    throw error;
  }
}

async function ensureQuestionBankSchema() {
  if (!questionBankSchemaPromise) {
    questionBankSchemaPromise = getPool().then(async (pool) => {
      const migration = await readFile(questionBankMigrationPath, "utf8");
      await pool.request().query(migration);
    });
  }
  try {
    await questionBankSchemaPromise;
  } catch (error) {
    questionBankSchemaPromise = undefined;
    throw error;
  }
}

async function ensureLearningPathSchema() {
  if (!learningPathSchemaPromise) {
    learningPathSchemaPromise = ensureQuestionBankSchema().then(async () => {
      const pool = await getPool();
      const migration = await readFile(learningPathMigrationPath, "utf8");
      await pool.request().query(migration);
    });
  }
  try {
    await learningPathSchemaPromise;
  } catch (error) {
    learningPathSchemaPromise = undefined;
    throw error;
  }
}

async function ensureMonthlyAssessmentSchema() {
  if (!monthlyAssessmentSchemaPromise) {
    monthlyAssessmentSchemaPromise = ensureQuestionBankSchema().then(async () => {
      const pool = await getPool();
      const migration = await readFile(monthlyAssessmentMigrationPath, "utf8");
      await pool.request().query(migration);
    });
  }
  try {
    await monthlyAssessmentSchemaPromise;
  } catch (error) {
    monthlyAssessmentSchemaPromise = undefined;
    throw error;
  }
}

async function ensureWeeklyAssessmentSchema() {
  if (!weeklyAssessmentSchemaPromise) {
    weeklyAssessmentSchemaPromise = ensureQuestionBankSchema().then(async () => {
      const pool = await getPool();
      const migration = await readFile(weeklyAssessmentMigrationPath, "utf8");
      await pool.request().query(migration);
    });
  }
  try {
    await weeklyAssessmentSchemaPromise;
  } catch (error) {
    weeklyAssessmentSchemaPromise = undefined;
    throw error;
  }
}

async function ensureParentModuleSchema() {
  if (!parentModuleSchemaPromise) {
    parentModuleSchemaPromise = getPool().then(async (pool) => {
      const migration = await readFile(parentModuleMigrationPath, "utf8");
      await pool.request().query(migration);
    });
  }
  try {
    await parentModuleSchemaPromise;
  } catch (error) {
    parentModuleSchemaPromise = undefined;
    throw error;
  }
}

async function hasActivePremium(pool, userId) {
  try {
    const result = await pool.request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT TOP 1 SubscriptionId
        FROM [mk].[PremiumSubscription]
        WHERE UserId = @userId AND Status = 'Active' AND ExpiresAt > SYSUTCDATETIME()
      `);
    return Boolean(result.recordset && result.recordset.length > 0);
  } catch {
    return false;
  }
}

function premiumRequired(response, feature = "") {
  return response.status(403).json({
    code: "PREMIUM_REQUIRED",
    message: "Tính năng này chỉ dành cho tài khoản Premium.",
    feature,
  });
}

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
  if (process.env.GEMINI_API_ENABLED !== "true") {
    return { ...fallback, generatedBy: "System", fallbackReason: "provider_disabled" };
  }
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[learning-advice] GEMINI_API_KEY is not configured; using fallback advice.");
    return { ...fallback, generatedBy: "Fallback", fallbackReason: "missing_key" };
  }
  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "Bạn là trợ lý giáo dục toán tiểu học Việt Nam. Chỉ dựa trên điểm kỹ năng, viết lời khích lệ ngắn, không gắn nhãn tiêu cực, đề xuất tối đa 3 bước HỌC VÀ LÀM BÀI TẬP trong mục Học tập; tuyệt đối không đề xuất trò chơi. topicCode phải là một trong các mã chính xác: ARITHMETIC_ADD_SUB, ARITHMETIC_MUL_DIV, GEOMETRY, MEASUREMENT, WORD_PROBLEM. Trả JSON với summary (string), strengths (array tên kỹ năng), focus (array tên kỹ năng), roadmap (array object gồm day, topicCode, title, activity). Hoạt động gồm đọc kiến thức, xem ví dụ và làm câu luyện tập phù hợp lớp; không chẩn đoán trẻ." }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify({ grade, skillScores }) }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const providerError = errorPayload?.error || {};
      const providerStatus = typeof providerError.status === "string" ? providerError.status : "";
      const providerMessage = typeof providerError.message === "string" ? providerError.message : "";
      const reason = response.status === 400 ? "request_rejected"
        : response.status === 401 || response.status === 403 ? "invalid_key"
          : response.status === 429 ? "quota_or_rate_limit"
            : response.status >= 500 ? "provider_unavailable" : "request_rejected";
      // Log only provider status and a truncated diagnostic, never the API key.
      console.warn(`[learning-advice] Gemini HTTP ${response.status} (${reason}); status=${providerStatus || "unknown"}; detail=${providerMessage.slice(0, 180) || "none"}.`);
      return { ...fallback, generatedBy: "Fallback", fallbackReason: reason };
    }
    const payload = await response.json();
    const responseText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "{}";
    const advice = JSON.parse(responseText);
    const allowedTopics = new Set(skillScores.map((skill) => skill.code));
    const cleanText = (value, maxLength) => typeof value === "string" ? value.trim().slice(0, maxLength) : "";
    const cleanNames = (values) => Array.isArray(values)
      ? [...new Set(values.map((value) => cleanText(value, 80)).filter(Boolean))].slice(0, 5)
      : [];
    const cleanRoadmap = Array.isArray(advice.roadmap)
      ? advice.roadmap.slice(0, 3).flatMap((item, index) => {
        const topicCode = cleanText(item?.topicCode, 40);
        const title = cleanText(item?.title, 120);
        const activity = cleanText(item?.activity, 400);
        if (!allowedTopics.has(topicCode) || !title || !activity) return [];
        return [{ day: index + 1, topicCode, title, activity }];
      })
      : [];
    const summary = cleanText(advice.summary, 500);
    if (!summary || !cleanRoadmap.length) throw new Error("Invalid or incomplete AI response");
    return {
      summary,
      strengths: cleanNames(advice.strengths),
      focus: cleanNames(advice.focus),
      roadmap: cleanRoadmap,
      generatedBy: "Gemini",
    };
  } catch (error) {
    const reason = error.name === "TimeoutError" || error.name === "AbortError" ? "timeout"
      : error instanceof SyntaxError ? "invalid_response"
        : error instanceof TypeError ? "network_error" : "invalid_response";
    console.warn(`[learning-advice] Gemini ${reason}; using fallback advice.`);
    return { ...fallback, generatedBy: "Fallback", fallbackReason: reason };
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
  const allowedRoles = ["Student", "Parent"];
  const role = allowedRoles.includes(body.role) ? body.role : "Student";
  const errors = validateCredentials(body, true);
  if (Object.keys(errors).length) return response.status(400).json({ message: "Dữ liệu không hợp lệ.", errors });
  try { return response.status(201).json(await registerUser({ ...body, role })); }
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
  let gradeInput = Number(request.body?.grade);
  const pool = await getPool();
  if (!Number.isInteger(gradeInput) || gradeInput < 1 || gradeInput > 5) {
    // Tự lấy grade từ DB nếu client không truyền
    const studentResult = await pool.request()
      .input("userId", sql.Int, request.user.userId)
      .query("SELECT Grade FROM [mk].[Student] WHERE StudentId = @userId");
    gradeInput = studentResult.recordset[0]?.Grade ?? 0;
    if (!Number.isInteger(gradeInput) || gradeInput < 1 || gradeInput > 5)
      return response.status(400).json({ message: "Lớp cần đánh giá phải từ 1 đến 5. Vui lòng cập nhật hồ sơ trước." });
  }
  const transaction = new sql.Transaction(pool);
  try {
    const topicsResult = await pool.request().query("SELECT TopicId, TopicCode, TopicName FROM [mk].[Topic]");
    const topicMap = new Map(topicsResult.recordset.map((topic) => [topic.TopicCode, topic]));
    if (assessmentSkills.some((skill) => !topicMap.has(skill.code))) return response.status(503).json({ message: "Thiếu dữ liệu chủ đề toán học. Hãy chạy script MathKidsDB.sql mới nhất." });
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const previousAttempt = await transaction.request().input("studentId", sql.Int, request.user.userId)
      .query("SELECT TOP 1 AttemptId FROM [mk].[PlacementAttempt] WITH (UPDLOCK, HOLDLOCK) WHERE StudentId = @studentId AND SubmittedAt IS NOT NULL");
    if (previousAttempt.recordset.length) {
      await transaction.rollback();
      return response.status(409).json({ code: "ASSESSMENT_ALREADY_COMPLETED", message: "Bài kiểm tra đầu vào chỉ được thực hiện một lần. Bạn có thể xem lại điểm và lộ trình học của mình." });
    }
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
    await ensureDailyChallengeSchema();
    // Ensure the GeneratedBy check constraint accepts the source before this
    // request tries to persist ChatGPT/Fallback learning paths.
    await ensureLearningPathSchema();
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
    const isPremium = await hasActivePremium(pool, request.user.userId);
    const advice = isPremium
      ? await createLearningAdvice(skillScores, attempt.Grade)
      : { summary: "Đã lưu kết quả và bản đồ kỹ năng. Nâng cấp Premium để mở lộ trình học cá nhân hóa.", strengths: [], focus: [], roadmap: [], generatedBy: "System", premiumRequired: true };
    let earnedXp = 0;
    let earnedStars = 0;
    let rewardAlreadyClaimed = false;
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const priorSubmission = await transaction.request().input("studentId", sql.Int, request.user.userId)
      .input("attemptId", sql.BigInt, attemptId)
      .query("SELECT TOP 1 AttemptId FROM [mk].[PlacementAttempt] WITH (UPDLOCK, HOLDLOCK) WHERE StudentId = @studentId AND SubmittedAt IS NOT NULL AND AttemptId <> @attemptId");
    if (priorSubmission.recordset.length) {
      await transaction.rollback();
      return response.status(409).json({ code: "ASSESSMENT_ALREADY_COMPLETED", message: "Bài kiểm tra đầu vào chỉ được thực hiện một lần. Bạn có thể xem lại điểm và lộ trình học của mình." });
    }
    const claimDate = vietnamDateKey();
    const existingClaim = await transaction.request()
      .input("studentId", sql.Int, request.user.userId)
      .input("claimDate", sql.Date, claimDate)
      .input("activityCode", sql.NVarChar(30), "ASSESSMENT")
      .query(`SELECT 1 AS IsClaimed FROM [mk].[StudentRewardClaim] WITH (UPDLOCK, HOLDLOCK)
              WHERE StudentId = @studentId AND ClaimDate = @claimDate AND ActivityCode = @activityCode`);
    rewardAlreadyClaimed = existingClaim.recordset.length > 0;
    if (!rewardAlreadyClaimed) {
      earnedXp = 10 + Math.round(overallScore / 10);
      earnedStars = overallScore >= 90 ? 2 : overallScore >= 70 ? 1 : 0;
    }
    const rewards = { xp: earnedXp, stars: earnedStars, alreadyClaimedToday: rewardAlreadyClaimed };
    const summary = { overallScore, grade: attempt.Grade, skillScores, advice, rewards };
    const submitResult = await transaction.request()
      .input("attemptId", sql.BigInt, attemptId)
      .input("score", sql.Decimal(6, 2), overallScore)
      .input("summary", sql.NVarChar(sql.MAX), JSON.stringify(summary))
      .query(`UPDATE [mk].[PlacementAttempt]
              SET Score = @score, AbilitySummary = @summary, SubmittedAt = SYSUTCDATETIME()
              WHERE AttemptId = @attemptId AND SubmittedAt IS NULL`);
    if (!submitResult.rowsAffected[0]) {
      await transaction.rollback();
      return response.status(409).json({ message: "Bài đánh giá này đã được nộp rồi." });
    }
    if (!rewardAlreadyClaimed) {
      await transaction.request()
        .input("studentId", sql.Int, request.user.userId)
        .input("claimDate", sql.Date, claimDate)
        .input("activityCode", sql.NVarChar(30), "ASSESSMENT")
        .input("attemptId", sql.BigInt, attemptId)
        .input("earnedXp", sql.Int, earnedXp)
        .input("earnedStars", sql.Int, earnedStars)
        .query(`INSERT INTO [mk].[StudentRewardClaim] (StudentId, ClaimDate, ActivityCode, SourceId, RewardXp, RewardStars)
                VALUES (@studentId, @claimDate, @activityCode, @attemptId, @earnedXp, @earnedStars)`);
      await transaction.request().input("studentId", sql.Int, request.user.userId)
        .input("earnedXp", sql.Int, earnedXp).input("earnedStars", sql.Int, earnedStars)
        .query(`UPDATE [mk].[Student]
                SET TotalXp = ISNULL(TotalXp, 0) + @earnedXp,
                    TotalStars = ISNULL(TotalStars, 0) + @earnedStars
                WHERE StudentId = @studentId`);
    }
    for (const answer of markedAnswers) {
      await transaction.request().input("attemptId", sql.BigInt, attemptId).input("questionId", sql.Int, answer.questionId)
        .input("answer", sql.NVarChar(sql.MAX), JSON.stringify({ answer: answer.answer })).input("correct", sql.Bit, answer.isCorrect)
        .query("INSERT INTO [mk].[PlacementAnswer] (AttemptId, QuestionId, AnswerData, IsCorrect) VALUES (@attemptId, @questionId, @answer, @correct)");
    }
    if (isPremium) {
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
    }
    await transaction.commit();
    return response.json({ attemptId, ...summary, isPremium });
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
    let resultData = attempt ? { attemptId: attempt.AttemptId, score: Number(attempt.Score), submittedAt: attempt.SubmittedAt, ...JSON.parse(attempt.AbilitySummary) } : null;
    if (resultData && !await hasActivePremium(pool, request.user.userId)) {
      resultData = { ...resultData, isPremium: false, advice: { summary: "Kết quả và bản đồ kỹ năng của con đã được lưu. Nâng cấp Premium để mở phân tích và lộ trình cá nhân hóa.", strengths: [], focus: [], roadmap: [], generatedBy: "System", premiumRequired: true } };
    } else if (resultData) resultData.isPremium = true;
    return response.json({ result: resultData });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải kết quả đánh giá.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/students/me/assessment/history", authenticate, async (request, response) => {
  try {
    const pool = await getPool();
    const isPremium = await hasActivePremium(pool, request.user.userId);
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
        summary: isPremium ? (summary.advice?.summary || "Đã hoàn thành bài đánh giá.") : "Đã hoàn thành bài đánh giá.",
      };
    }) });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải lịch sử đánh giá.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/students/me/monthly-assessment", authenticate, async (request, response) => {
  try {
    await ensureMonthlyAssessmentSchema();
    const pool = await getPool();
    const month = vietnamMonthKey();
    const studentResult = await pool.request().input("studentId", sql.Int, request.user.userId)
      .query("SELECT Grade FROM [mk].[Student] WHERE StudentId = @studentId");
    const student = studentResult.recordset[0];
    if (!student) return response.status(403).json({ message: "Chỉ học sinh mới có thể làm bài kiểm tra tháng." });

    const currentResult = await pool.request().input("studentId", sql.Int, request.user.userId)
      .input("month", sql.Char(7), month)
      .query(`SELECT AttemptId, Grade, StartedAt, SubmittedAt, Score, CorrectCount, TotalCount,
                     RewardXp, RewardStars, ResultSummary
              FROM [mk].[MonthlyAssessmentAttempt]
              WHERE StudentId = @studentId AND TestMonth = @month`);
    const currentRow = currentResult.recordset[0];
    let current = null;
    if (currentRow) {
      current = {
        attemptId: Number(currentRow.AttemptId), month,
        grade: Number(currentRow.Grade), startedAt: currentRow.StartedAt,
        submittedAt: currentRow.SubmittedAt,
        status: currentRow.SubmittedAt ? "Completed" : "InProgress",
        score: currentRow.Score === null ? null : Number(currentRow.Score),
        correctCount: currentRow.CorrectCount === null ? null : Number(currentRow.CorrectCount),
        totalCount: Number(currentRow.TotalCount),
        rewardXp: Number(currentRow.RewardXp), rewardStars: Number(currentRow.RewardStars),
      };
      if (currentRow.SubmittedAt) {
        try { current.result = JSON.parse(currentRow.ResultSummary || "{}"); } catch { current.result = null; }
        if (!current.result || typeof current.result !== "object") {
          current.result = {
            score: current.score, correctCount: current.correctCount,
            totalCount: current.totalCount, grade: current.grade, month,
            rewardXp: current.rewardXp, rewardStars: current.rewardStars, review: [],
          };
        }
      } else {
        const assigned = await pool.request().input("attemptId", sql.BigInt, currentRow.AttemptId).query(`
          SELECT q.QuestionId, q.QuestionText, q.OptionA, q.OptionB, q.OptionC, q.OptionD,
                 q.Difficulty, t.Name AS TopicName, ma.QuestionOrder
          FROM [mk].[MonthlyAssessmentQuestion] ma
          INNER JOIN [mk].[Questions] q ON q.QuestionId = ma.QuestionId AND q.IsActive = 1
          INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
          WHERE ma.AttemptId = @attemptId
          ORDER BY ma.QuestionOrder
        `);
        current.questions = assigned.recordset.map((row) => ({
          questionId: row.QuestionId, order: Number(row.QuestionOrder),
          topic: row.TopicName, text: row.QuestionText,
          options: [row.OptionA, row.OptionB, row.OptionC, row.OptionD]
            .map((text, index) => ({ key: String.fromCharCode(65 + index), text })),
        }));
      }
    }

    const historyResult = await pool.request().input("studentId", sql.Int, request.user.userId).query(`
      SELECT TOP 12 AttemptId, TestMonth, Grade, Score, CorrectCount, TotalCount,
             RewardXp, RewardStars, StartedAt, SubmittedAt
      FROM [mk].[MonthlyAssessmentAttempt]
      WHERE StudentId = @studentId AND SubmittedAt IS NOT NULL
      ORDER BY TestMonth DESC
    `);
    return response.json({
      month, grade: Number(student.Grade), current,
      history: historyResult.recordset.map((row) => ({
        attemptId: Number(row.AttemptId), month: row.TestMonth,
        grade: Number(row.Grade), score: Number(row.Score),
        correctCount: Number(row.CorrectCount), totalCount: Number(row.TotalCount),
        rewardXp: Number(row.RewardXp), rewardStars: Number(row.RewardStars),
        startedAt: row.StartedAt, submittedAt: row.SubmittedAt,
      })),
    });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải bài kiểm tra tháng.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/students/me/monthly-assessment/start", authenticate, async (request, response) => {
  let transaction;
  try {
    await ensureMonthlyAssessmentSchema();
    const pool = await getPool();
    const month = vietnamMonthKey();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const studentResult = await transaction.request().input("studentId", sql.Int, request.user.userId)
      .query("SELECT StudentId, Grade FROM [mk].[Student] WITH (UPDLOCK, HOLDLOCK) WHERE StudentId = @studentId");
    const student = studentResult.recordset[0];
    if (!student) {
      await transaction.rollback();
      return response.status(403).json({ message: "Chỉ học sinh mới có thể làm bài kiểm tra tháng." });
    }

    const previousResult = await transaction.request().input("studentId", sql.Int, request.user.userId)
      .input("month", sql.Char(7), month)
      .query("SELECT AttemptId, SubmittedAt FROM [mk].[MonthlyAssessmentAttempt] WITH (UPDLOCK, HOLDLOCK) WHERE StudentId = @studentId AND TestMonth = @month");
    const existing = previousResult.recordset[0];
    if (existing?.SubmittedAt) {
      await transaction.rollback();
      return response.status(409).json({ message: "Bạn đã hoàn thành bài kiểm tra tháng này rồi." });
    }

    let attemptId;
    if (existing) {
      attemptId = existing.AttemptId;
    } else {
      const questionsResult = await transaction.request().input("grade", sql.TinyInt, student.Grade).query(`
        SELECT TOP (10) q.QuestionId
        FROM [mk].[Questions] q
        INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
        WHERE t.GradeId = @grade AND q.IsActive = 1
        ORDER BY NEWID()
      `);
      if (questionsResult.recordset.length < 10) {
        await transaction.rollback();
        return response.status(503).json({ message: `Chưa đủ 10 câu hỏi cho lớp ${student.Grade}. Vui lòng bổ sung Question Bank.` });
      }
      const attemptResult = await transaction.request()
        .input("studentId", sql.Int, request.user.userId)
        .input("month", sql.Char(7), month)
        .input("grade", sql.TinyInt, student.Grade)
        .query(`INSERT INTO [mk].[MonthlyAssessmentAttempt] (StudentId, TestMonth, Grade)
                OUTPUT INSERTED.AttemptId VALUES (@studentId, @month, @grade)`);
      attemptId = attemptResult.recordset[0].AttemptId;
      for (const [index, row] of questionsResult.recordset.entries()) {
        await transaction.request().input("attemptId", sql.BigInt, attemptId)
          .input("questionId", sql.Int, row.QuestionId).input("order", sql.SmallInt, index + 1)
          .query("INSERT INTO [mk].[MonthlyAssessmentQuestion] (AttemptId, QuestionId, QuestionOrder) VALUES (@attemptId, @questionId, @order)");
      }
    }

    const assigned = await transaction.request().input("attemptId", sql.BigInt, attemptId).query(`
      SELECT q.QuestionId, q.QuestionText, q.OptionA, q.OptionB, q.OptionC, q.OptionD,
             t.Name AS TopicName, ma.QuestionOrder
      FROM [mk].[MonthlyAssessmentQuestion] ma
      INNER JOIN [mk].[Questions] q ON q.QuestionId = ma.QuestionId AND q.IsActive = 1
      INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
      WHERE ma.AttemptId = @attemptId
      ORDER BY ma.QuestionOrder
    `);
    if (assigned.recordset.length !== 10) throw new Error("Bài kiểm tra tháng không có đủ 10 câu hỏi đang hoạt động.");
    await transaction.commit();
    return response.status(existing ? 200 : 201).json({
      attemptId: Number(attemptId), month, grade: Number(student.Grade),
      status: "InProgress",
      questions: assigned.recordset.map((row) => ({
        questionId: row.QuestionId, order: Number(row.QuestionOrder),
        topic: row.TopicName, text: row.QuestionText,
        options: [row.OptionA, row.OptionB, row.OptionC, row.OptionD]
          .map((text, index) => ({ key: String.fromCharCode(65 + index), text })),
      })),
    });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    return response.status(500).json({ message: "Không thể bắt đầu bài kiểm tra tháng.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/students/me/monthly-assessment/:attemptId/submit", authenticate, async (request, response) => {
  const attemptId = Number(request.params.attemptId);
  const answers = request.body?.answers;
  if (!Number.isSafeInteger(attemptId) || attemptId < 1 || !Array.isArray(answers) || answers.length !== 10
    || answers.some((item) => !item || !Number.isSafeInteger(Number(item.questionId)) || !["A", "B", "C", "D"].includes(item.answer))) {
    return response.status(400).json({ message: "Bài làm cần đủ 10 câu trả lời hợp lệ." });
  }
  const supplied = new Map(answers.map((item) => [Number(item.questionId), item.answer]));
  if (supplied.size !== 10) return response.status(400).json({ message: "Không được gửi trùng câu hỏi." });

  let transaction;
  try {
    await ensureMonthlyAssessmentSchema();
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const attemptResult = await transaction.request().input("attemptId", sql.BigInt, attemptId)
      .input("studentId", sql.Int, request.user.userId)
      .query(`SELECT AttemptId, Grade, TestMonth, SubmittedAt FROM [mk].[MonthlyAssessmentAttempt] WITH (UPDLOCK, HOLDLOCK)
              WHERE AttemptId = @attemptId AND StudentId = @studentId`);
    const attempt = attemptResult.recordset[0];
    if (!attempt) {
      await transaction.rollback();
      return response.status(404).json({ message: "Không tìm thấy bài kiểm tra tháng này." });
    }
    if (attempt.SubmittedAt) {
      await transaction.rollback();
      return response.status(409).json({ message: "Bài kiểm tra tháng này đã được nộp." });
    }

    const questionsResult = await transaction.request().input("attemptId", sql.BigInt, attemptId).query(`
      SELECT q.QuestionId, q.QuestionText, q.OptionA, q.OptionB, q.OptionC, q.OptionD,
             q.CorrectAnswer, q.Explanation, t.Name AS TopicName, ma.QuestionOrder
      FROM [mk].[MonthlyAssessmentQuestion] ma WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN [mk].[Questions] q ON q.QuestionId = ma.QuestionId
      INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
      WHERE ma.AttemptId = @attemptId
      ORDER BY ma.QuestionOrder
    `);
    const questions = questionsResult.recordset;
    if (questions.length !== 10 || questions.some((question) => !supplied.has(question.QuestionId))) {
      await transaction.rollback();
      return response.status(400).json({ message: "Danh sách câu trả lời không khớp với bài kiểm tra." });
    }

    const review = [];
    let correctCount = 0;
    for (const question of questions) {
      const answer = supplied.get(question.QuestionId);
      const isCorrect = answer === question.CorrectAnswer;
      if (isCorrect) correctCount += 1;
      review.push({
        questionId: question.QuestionId, order: Number(question.QuestionOrder),
        topic: question.TopicName, text: question.QuestionText,
        options: [question.OptionA, question.OptionB, question.OptionC, question.OptionD]
          .map((text, index) => ({ key: String.fromCharCode(65 + index), text })),
        answer, correctAnswer: question.CorrectAnswer, isCorrect,
        explanation: question.Explanation || "",
      });
      await transaction.request().input("attemptId", sql.BigInt, attemptId)
        .input("questionId", sql.Int, question.QuestionId).input("answer", sql.Char(1), answer)
        .input("isCorrect", sql.Bit, isCorrect)
        .query("UPDATE [mk].[MonthlyAssessmentQuestion] SET Answer = @answer, IsCorrect = @isCorrect WHERE AttemptId = @attemptId AND QuestionId = @questionId");
    }

    const score = correctCount * 10;
    const rewardXp = 10 + correctCount * 2;
    const rewardStars = score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;
    const result = { score, correctCount, totalCount: 10, grade: Number(attempt.Grade), month: attempt.TestMonth, review, rewardXp, rewardStars };
    await transaction.request().input("attemptId", sql.BigInt, attemptId)
      .input("score", sql.TinyInt, score).input("correctCount", sql.TinyInt, correctCount)
      .input("rewardXp", sql.SmallInt, rewardXp).input("rewardStars", sql.TinyInt, rewardStars)
      .input("summary", sql.NVarChar(sql.MAX), JSON.stringify(result))
      .query(`UPDATE [mk].[MonthlyAssessmentAttempt]
              SET Score = @score, CorrectCount = @correctCount, RewardXp = @rewardXp,
                  RewardStars = @rewardStars, ResultSummary = @summary, SubmittedAt = SYSUTCDATETIME()
              WHERE AttemptId = @attemptId AND SubmittedAt IS NULL`);
    await transaction.request().input("studentId", sql.Int, request.user.userId)
      .input("rewardXp", sql.Int, rewardXp).input("rewardStars", sql.Int, rewardStars)
      .query(`UPDATE [mk].[Student]
              SET TotalXp = ISNULL(TotalXp, 0) + @rewardXp,
                  TotalStars = ISNULL(TotalStars, 0) + @rewardStars
              WHERE StudentId = @studentId`);
    await transaction.commit();
    return response.json({ attemptId, ...result, submittedAt: new Date().toISOString() });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    return response.status(500).json({ message: "Không thể chấm bài kiểm tra tháng.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/students/me/weekly-assessment", authenticate, async (request, response) => {
  try {
    await ensureWeeklyAssessmentSchema();
    const pool = await getPool();
    if (!await hasActivePremium(pool, request.user.userId)) return premiumRequired(response, "weekly_assessment");
    const weekStart = vietnamWeekStartKey();
    const studentResult = await pool.request().input("studentId", sql.Int, request.user.userId)
      .query("SELECT Grade FROM [mk].[Student] WHERE StudentId = @studentId");
    const student = studentResult.recordset[0];
    if (!student) return response.status(403).json({ message: "Chỉ học sinh mới có thể làm đánh giá tuần." });
    const latestResult = await pool.request().input("studentId", sql.Int, request.user.userId).input("grade", sql.TinyInt, student.Grade).query(`
      SELECT TOP 1 WeekStart, Difficulty, Score, CorrectCount, TotalCount
      FROM [mk].[WeeklyAssessmentAttempt]
      WHERE StudentId = @studentId AND Grade = @grade AND SubmittedAt IS NOT NULL
      ORDER BY WeekStart DESC
    `);
    const latest = latestResult.recordset[0];
    const recommendedDifficulty = !latest ? 1
      : Number(latest.Score) >= 80 ? Math.min(3, Number(latest.Difficulty) + 1)
        : Number(latest.Score) < 50 ? Math.max(1, Number(latest.Difficulty) - 1) : Number(latest.Difficulty);
    const currentResult = await pool.request().input("studentId", sql.Int, request.user.userId)
      .input("weekStart", sql.Date, weekStart).query(`
        SELECT AttemptId, Grade, Difficulty, Score, CorrectCount, TotalCount, StartedAt, SubmittedAt
        FROM [mk].[WeeklyAssessmentAttempt] WHERE StudentId = @studentId AND WeekStart = @weekStart
      `);
    const row = currentResult.recordset[0];
    let current = row ? {
      attemptId: Number(row.AttemptId), weekStart, grade: Number(row.Grade), difficulty: Number(row.Difficulty),
      score: row.Score === null ? null : Number(row.Score), correctCount: row.CorrectCount === null ? null : Number(row.CorrectCount),
      totalCount: Number(row.TotalCount), startedAt: row.StartedAt, submittedAt: row.SubmittedAt,
      status: row.SubmittedAt ? "Completed" : "InProgress",
    } : null;
    if (row && !row.SubmittedAt) {
      const questions = await pool.request().input("attemptId", sql.BigInt, row.AttemptId).query(`
        SELECT q.QuestionId, q.QuestionText, q.OptionA, q.OptionB, q.OptionC, q.OptionD, t.Name AS TopicName, wq.QuestionOrder
        FROM [mk].[WeeklyAssessmentQuestion] wq
        INNER JOIN [mk].[Questions] q ON q.QuestionId = wq.QuestionId
        INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
        WHERE wq.AttemptId = @attemptId ORDER BY wq.QuestionOrder
      `);
      current.questions = questions.recordset.map((q) => ({
        questionId: q.QuestionId, order: Number(q.QuestionOrder), topic: q.TopicName, text: q.QuestionText,
        options: [q.OptionA, q.OptionB, q.OptionC, q.OptionD].map((text, index) => ({ key: String.fromCharCode(65 + index), text })),
      }));
    } else if (row?.SubmittedAt) {
      const review = await pool.request().input("attemptId", sql.BigInt, row.AttemptId).query(`
        SELECT q.QuestionId, q.QuestionText, q.CorrectAnswer, q.Explanation, t.Name AS TopicName,
               wq.Answer, wq.IsCorrect, wq.QuestionOrder
        FROM [mk].[WeeklyAssessmentQuestion] wq
        INNER JOIN [mk].[Questions] q ON q.QuestionId = wq.QuestionId
        INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
        WHERE wq.AttemptId = @attemptId ORDER BY wq.QuestionOrder
      `);
      current.result = { review: review.recordset.map((q) => ({
        questionId: q.QuestionId, topic: q.TopicName, text: q.QuestionText,
        answer: q.Answer, correctAnswer: q.CorrectAnswer, isCorrect: Boolean(q.IsCorrect), explanation: q.Explanation || "",
      })) };
    }
    const historyResult = await pool.request().input("studentId", sql.Int, request.user.userId).query(`
      SELECT TOP 8 WeekStart, Difficulty, Score, CorrectCount, TotalCount
      FROM [mk].[WeeklyAssessmentAttempt] WHERE StudentId = @studentId AND SubmittedAt IS NOT NULL
      ORDER BY WeekStart DESC
    `);
    return response.json({
      weekStart, grade: Number(student.Grade), recommendedDifficulty, current,
      previous: latest ? { weekStart: latest.WeekStart, difficulty: Number(latest.Difficulty), score: Number(latest.Score), correctCount: Number(latest.CorrectCount), totalCount: Number(latest.TotalCount) } : null,
      history: historyResult.recordset.map((item) => ({ weekStart: item.WeekStart, difficulty: Number(item.Difficulty), score: Number(item.Score), correctCount: Number(item.CorrectCount), totalCount: Number(item.TotalCount) })),
    });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải đánh giá năng lực tuần.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/students/me/weekly-assessment/start", authenticate, async (request, response) => {
  let transaction;
  try {
    await ensureWeeklyAssessmentSchema();
    const pool = await getPool();
    if (!await hasActivePremium(pool, request.user.userId)) return premiumRequired(response, "weekly_assessment");
    const weekStart = vietnamWeekStartKey();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const studentResult = await transaction.request().input("studentId", sql.Int, request.user.userId)
      .query("SELECT Grade FROM [mk].[Student] WITH (UPDLOCK, HOLDLOCK) WHERE StudentId = @studentId");
    const student = studentResult.recordset[0];
    if (!student) { await transaction.rollback(); return response.status(403).json({ message: "Chỉ học sinh mới có thể làm đánh giá tuần." }); }
    const existingResult = await transaction.request().input("studentId", sql.Int, request.user.userId)
      .input("weekStart", sql.Date, weekStart).query("SELECT AttemptId, SubmittedAt, Difficulty FROM [mk].[WeeklyAssessmentAttempt] WITH (UPDLOCK, HOLDLOCK) WHERE StudentId = @studentId AND WeekStart = @weekStart");
    const existing = existingResult.recordset[0];
    if (existing?.SubmittedAt) { await transaction.rollback(); return response.status(409).json({ message: "Bạn đã hoàn thành đánh giá tuần này rồi." }); }
    let attemptId = existing?.AttemptId;
    let difficulty = Number(existing?.Difficulty || 1);
    if (!existing) {
      const previousResult = await transaction.request().input("studentId", sql.Int, request.user.userId).input("grade", sql.TinyInt, student.Grade).query(`
        SELECT TOP 1 Difficulty, Score FROM [mk].[WeeklyAssessmentAttempt]
        WHERE StudentId = @studentId AND Grade = @grade AND SubmittedAt IS NOT NULL ORDER BY WeekStart DESC
      `);
      const previous = previousResult.recordset[0];
      difficulty = !previous ? 1 : Number(previous.Score) >= 80 ? Math.min(3, Number(previous.Difficulty) + 1)
        : Number(previous.Score) < 50 ? Math.max(1, Number(previous.Difficulty) - 1) : Number(previous.Difficulty);
      const questionResult = await transaction.request().input("grade", sql.TinyInt, student.Grade).input("difficulty", sql.TinyInt, difficulty).query(`
        SELECT TOP (10) q.QuestionId FROM [mk].[Questions] q
        INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
        WHERE t.GradeId = @grade AND q.IsActive = 1
        ORDER BY CASE WHEN q.Difficulty = @difficulty THEN 0 ELSE 1 END,
                 ABS(CAST(q.Difficulty AS INT) - @difficulty), NEWID()
      `);
      if (questionResult.recordset.length < 10) { await transaction.rollback(); return response.status(503).json({ message: `Chưa đủ 10 câu hỏi trong Question Bank cho lớp ${student.Grade}.` }); }
      const attemptResult = await transaction.request().input("studentId", sql.Int, request.user.userId)
        .input("weekStart", sql.Date, weekStart).input("grade", sql.TinyInt, student.Grade).input("difficulty", sql.TinyInt, difficulty)
        .query(`INSERT INTO [mk].[WeeklyAssessmentAttempt] (StudentId, WeekStart, Grade, Difficulty)
                OUTPUT INSERTED.AttemptId VALUES (@studentId, @weekStart, @grade, @difficulty)`);
      attemptId = attemptResult.recordset[0].AttemptId;
      for (const [index, question] of questionResult.recordset.entries()) {
        await transaction.request().input("attemptId", sql.BigInt, attemptId).input("questionId", sql.Int, question.QuestionId).input("order", sql.TinyInt, index + 1)
          .query("INSERT INTO [mk].[WeeklyAssessmentQuestion] (AttemptId, QuestionId, QuestionOrder) VALUES (@attemptId, @questionId, @order)");
      }
    }
    const assigned = await transaction.request().input("attemptId", sql.BigInt, attemptId).query(`
      SELECT q.QuestionId, q.QuestionText, q.OptionA, q.OptionB, q.OptionC, q.OptionD, t.Name AS TopicName, wq.QuestionOrder
      FROM [mk].[WeeklyAssessmentQuestion] wq INNER JOIN [mk].[Questions] q ON q.QuestionId = wq.QuestionId
      INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId WHERE wq.AttemptId = @attemptId ORDER BY wq.QuestionOrder
    `);
    if (assigned.recordset.length !== 10) throw new Error("Bài đánh giá tuần không có đủ 10 câu hỏi.");
    await transaction.commit();
    return response.status(existing ? 200 : 201).json({
      attemptId: Number(attemptId), weekStart, grade: Number(student.Grade), difficulty, status: "InProgress",
      questions: assigned.recordset.map((q) => ({ questionId: q.QuestionId, order: Number(q.QuestionOrder), topic: q.TopicName, text: q.QuestionText,
        options: [q.OptionA, q.OptionB, q.OptionC, q.OptionD].map((text, index) => ({ key: String.fromCharCode(65 + index), text })) })),
    });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    return response.status(500).json({ message: "Không thể bắt đầu đánh giá năng lực tuần.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/students/me/weekly-assessment/:attemptId/submit", authenticate, async (request, response) => {
  const attemptId = Number(request.params.attemptId);
  const answers = request.body?.answers;
  if (!Number.isSafeInteger(attemptId) || attemptId < 1 || !Array.isArray(answers) || answers.length !== 10
    || answers.some((item) => !item || !Number.isSafeInteger(Number(item.questionId)) || !["A", "B", "C", "D"].includes(item.answer))
    || new Set(answers.map((item) => Number(item.questionId))).size !== 10) {
    return response.status(400).json({ message: "Bài làm cần đủ 10 câu trả lời hợp lệ, không trùng câu." });
  }
  let transaction;
  try {
    await ensureWeeklyAssessmentSchema();
    const pool = await getPool();
    if (!await hasActivePremium(pool, request.user.userId)) return premiumRequired(response, "weekly_assessment");
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const attemptResult = await transaction.request().input("attemptId", sql.BigInt, attemptId).input("studentId", sql.Int, request.user.userId)
      .query("SELECT AttemptId, Grade, Difficulty, WeekStart, SubmittedAt FROM [mk].[WeeklyAssessmentAttempt] WITH (UPDLOCK, HOLDLOCK) WHERE AttemptId = @attemptId AND StudentId = @studentId");
    const attempt = attemptResult.recordset[0];
    if (!attempt) { await transaction.rollback(); return response.status(404).json({ message: "Không tìm thấy bài đánh giá tuần." }); }
    if (attempt.SubmittedAt) { await transaction.rollback(); return response.status(409).json({ message: "Bài đánh giá tuần này đã được nộp." }); }
    const assigned = await transaction.request().input("attemptId", sql.BigInt, attemptId).query(`
      SELECT q.QuestionId, q.QuestionText, q.CorrectAnswer, q.Explanation, t.Name AS TopicName, wq.QuestionOrder
      FROM [mk].[WeeklyAssessmentQuestion] wq WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN [mk].[Questions] q ON q.QuestionId = wq.QuestionId INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
      WHERE wq.AttemptId = @attemptId ORDER BY wq.QuestionOrder
    `);
    const answersById = new Map(answers.map((item) => [Number(item.questionId), item.answer]));
    const questions = assigned.recordset;
    if (questions.length !== 10 || questions.some((q) => !answersById.has(q.QuestionId))) {
      await transaction.rollback(); return response.status(400).json({ message: "Danh sách câu trả lời không khớp với bài đánh giá." });
    }
    let correctCount = 0;
    const review = [];
    for (const q of questions) {
      const answer = answersById.get(q.QuestionId);
      const isCorrect = answer === q.CorrectAnswer;
      if (isCorrect) correctCount += 1;
      review.push({ questionId: q.QuestionId, topic: q.TopicName, text: q.QuestionText, answer, correctAnswer: q.CorrectAnswer, isCorrect, explanation: q.Explanation || "" });
      await transaction.request().input("attemptId", sql.BigInt, attemptId).input("questionId", sql.Int, q.QuestionId)
        .input("answer", sql.Char(1), answer).input("isCorrect", sql.Bit, isCorrect)
        .query("UPDATE [mk].[WeeklyAssessmentQuestion] SET Answer = @answer, IsCorrect = @isCorrect WHERE AttemptId = @attemptId AND QuestionId = @questionId");
    }
    const score = correctCount * 10;
    await transaction.request().input("attemptId", sql.BigInt, attemptId).input("score", sql.TinyInt, score).input("correct", sql.TinyInt, correctCount)
      .query("UPDATE [mk].[WeeklyAssessmentAttempt] SET Score = @score, CorrectCount = @correct, SubmittedAt = SYSUTCDATETIME() WHERE AttemptId = @attemptId AND SubmittedAt IS NULL");
    await transaction.commit();
    return response.json({ attemptId, weekStart: attempt.WeekStart, grade: Number(attempt.Grade), difficulty: Number(attempt.Difficulty), score, correctCount, totalCount: 10, review });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    return response.status(500).json({ message: "Không thể chấm đánh giá năng lực tuần.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/learning/path", authenticate, async (request, response) => {
  try {
    await ensureLearningPathSchema();
    await ensureWeeklyAssessmentSchema();
    const pool = await getPool();
    const isPremium = await hasActivePremium(pool, request.user.userId);
    const result = await pool.request().input("studentId", sql.Int, request.user.userId).query(`
      SELECT s.Grade, l.LessonId, l.Title, l.Introduction, l.KeyConcept, l.WorkedExample, l.SortOrder,
             t.TopicId, t.TopicCode, t.Name AS TopicName,
             ISNULL(p.IsCompleted, 0) AS IsCompleted, p.CompletedAt,
             stats.AnsweredCount, stats.CorrectCount
      FROM [mk].[Student] s
      INNER JOIN [mk].[Topics] t ON t.GradeId = s.Grade
      INNER JOIN [mk].[Lessons] l ON l.TopicId = t.TopicId AND l.IsActive = 1
      LEFT JOIN [mk].[StudentLessonProgress] p ON p.StudentId = s.StudentId AND p.LessonId = l.LessonId
      OUTER APPLY (
        SELECT COUNT_BIG(*) AS AnsweredCount, SUM(CASE WHEN r.IsCorrect = 1 THEN 1 ELSE 0 END) AS CorrectCount
        FROM [mk].[StudentQuestionResults] r
        INNER JOIN [mk].[Questions] q ON q.QuestionId = r.QuestionId
        WHERE r.StudentId = s.StudentId AND q.TopicId = t.TopicId
      ) stats
      WHERE s.StudentId = @studentId
      ORDER BY l.SortOrder, l.LessonId
    `);
    if (!result.recordset.length) {
      const student = await pool.request().input("studentId", sql.Int, request.user.userId)
        .query("SELECT Grade FROM [mk].[Student] WHERE StudentId = @studentId");
      if (!student.recordset.length) return response.status(403).json({ message: "Chỉ học sinh mới có lộ trình học." });
    }
    const lessons = result.recordset.map((row) => {
      const answeredCount = Number(row.AnsweredCount || 0);
      const correctCount = Number(row.CorrectCount || 0);
      return {
        lessonId: row.LessonId, title: row.Title, introduction: row.Introduction,
        keyConcept: row.KeyConcept, workedExample: row.WorkedExample,
        topic: { id: row.TopicId, code: row.TopicCode, name: row.TopicName },
        sortOrder: Number(row.SortOrder), isCompleted: Boolean(row.IsCompleted),
        completedAt: row.CompletedAt, answeredCount, correctCount,
        accuracy: answeredCount ? Math.round((correctCount / answeredCount) * 100) : null,
      };
    });
    const studentGrade = Number(result.recordset[0]?.Grade || 0);
    const weeklyLevelResult = isPremium ? await pool.request().input("studentId", sql.Int, request.user.userId).input("grade", sql.TinyInt, studentGrade).query(`
      SELECT TOP 1 Difficulty, Score FROM [mk].[WeeklyAssessmentAttempt]
      WHERE StudentId = @studentId AND Grade = @grade AND SubmittedAt IS NOT NULL ORDER BY WeekStart DESC
    `) : { recordset: [] };
    const weeklyLevel = weeklyLevelResult.recordset[0];
    const recommendedDifficulty = !weeklyLevel ? 1
      : Number(weeklyLevel.Score) >= 80 ? Math.min(3, Number(weeklyLevel.Difficulty) + 1)
        : Number(weeklyLevel.Score) < 50 ? Math.max(1, Number(weeklyLevel.Difficulty) - 1) : Number(weeklyLevel.Difficulty);
    const weeklyTopicResult = isPremium ? await pool.request().input("studentId", sql.Int, request.user.userId).input("grade", sql.TinyInt, studentGrade).query(`
      WITH LatestAttempt AS (
        SELECT TOP 1 AttemptId FROM [mk].[WeeklyAssessmentAttempt]
        WHERE StudentId = @studentId AND Grade = @grade AND SubmittedAt IS NOT NULL ORDER BY WeekStart DESC
      )
      SELECT q.TopicId, COUNT(*) AS AnsweredCount,
             SUM(CASE WHEN wq.IsCorrect = 1 THEN 1 ELSE 0 END) AS CorrectCount
      FROM LatestAttempt a
      INNER JOIN [mk].[WeeklyAssessmentQuestion] wq ON wq.AttemptId = a.AttemptId
      INNER JOIN [mk].[Questions] q ON q.QuestionId = wq.QuestionId
      GROUP BY q.TopicId
    `) : { recordset: [] };
    const weeklyTopicAccuracy = new Map(weeklyTopicResult.recordset.map((item) => [
      Number(item.TopicId), Math.round((Number(item.CorrectCount || 0) / Number(item.AnsweredCount || 1)) * 100),
    ]));
    const placementResult = isPremium ? await pool.request().input("studentId", sql.Int, request.user.userId).input("grade", sql.TinyInt, studentGrade).query(`
      SELECT TOP 1 pa.AbilitySummary FROM [mk].[PlacementAttempt] pa
      INNER JOIN [mk].[PlacementTest] pt ON pt.PlacementTestId = pa.PlacementTestId
      WHERE pa.StudentId = @studentId AND pt.Grade = @grade AND pa.SubmittedAt IS NOT NULL
      ORDER BY pa.SubmittedAt DESC
    `) : { recordset: [] };
    let placementScores = new Map();
    try {
      const summary = JSON.parse(placementResult.recordset[0]?.AbilitySummary || "{}");
      placementScores = new Map((summary.skillScores || []).map((skill) => [skill.code, Number(skill.score)]));
    } catch { placementScores = new Map(); }
    const topicPlacementSkill = {
      addition: "ARITHMETIC_ADD_SUB", subtraction: "ARITHMETIC_ADD_SUB", decimals: "ARITHMETIC_ADD_SUB",
      multiplication: "ARITHMETIC_MUL_DIV", division: "ARITHMETIC_MUL_DIV", fractions: "ARITHMETIC_MUL_DIV",
      geometry: "GEOMETRY", time: "MEASUREMENT", percentage: "WORD_PROBLEM",
    };
    for (const lesson of lessons) {
      lesson.weeklyAccuracy = weeklyTopicAccuracy.has(Number(lesson.topic.id)) ? weeklyTopicAccuracy.get(Number(lesson.topic.id)) : null;
      lesson.placementAccuracy = placementScores.get(topicPlacementSkill[lesson.topic.code]) ?? null;
      const relevantAccuracy = lesson.weeklyAccuracy ?? lesson.placementAccuracy;
      lesson.assessmentAccuracy = relevantAccuracy;
      lesson.assessmentSource = lesson.weeklyAccuracy !== null ? "Đánh giá tuần" : lesson.placementAccuracy !== null ? "Đánh giá đầu vào" : "";
      lesson.recommendedDifficulty = relevantAccuracy === null ? recommendedDifficulty
        : relevantAccuracy >= 80 ? 3 : relevantAccuracy >= 50 ? 2 : 1;
      lesson.skillStatus = relevantAccuracy === null ? "Chưa có kết quả đánh giá"
        : relevantAccuracy < 50 ? "Cần củng cố theo kết quả đánh giá"
          : relevantAccuracy >= 80 ? "Đã vững · có thể thử mức cao hơn" : "Đang tiến bộ · tiếp tục luyện";
    }
    const roadmapResult = isPremium ? await pool.request().input("studentId", sql.Int, request.user.userId).query(`
      SELECT TOP 10 lp.GeneratedBy, lp.Reason, item.ItemOrder, topic.TopicCode, topic.TopicName,
             item.PlannedDate, item.Status
      FROM [mk].[LearningPath] lp
      INNER JOIN [mk].[LearningPathItem] item ON item.LearningPathId = lp.LearningPathId
      LEFT JOIN [mk].[Topic] topic ON topic.TopicId = item.TopicId
      WHERE lp.StudentId = @studentId AND lp.Status = 'Active'
      ORDER BY item.ItemOrder, item.PlannedDate, item.LearningPathItemId
    `) : { recordset: [] };
    const topicAliases = {
      ARITHMETIC_ADD_SUB: ["addition", "subtraction", "decimals"],
      ARITHMETIC_MUL_DIV: ["multiplication", "division", "fractions", "addition", "subtraction"],
      GEOMETRY: ["geometry"],
      MEASUREMENT: ["time", "decimals", "geometry", "addition"],
      WORD_PROBLEM: ["addition", "subtraction", "multiplication", "division", "fractions", "percentage", "decimals"],
    };
    const roadmapLessonIds = [];
    for (const item of roadmapResult.recordset) {
      const aliases = topicAliases[item.TopicCode] || [item.TopicCode?.toLowerCase()];
      const candidate = aliases.map((code) => lessons.find((lesson) => lesson.topic.code === code && !lesson.isCompleted))
        .filter(Boolean).sort((a, b) => (a.accuracy ?? -1) - (b.accuracy ?? -1))[0];
      if (candidate && !roadmapLessonIds.includes(candidate.lessonId)) roadmapLessonIds.push(candidate.lessonId);
    }
    const roadmapOrder = new Map(roadmapLessonIds.map((id, index) => [id, index]));
    lessons.sort((a, b) => {
      const aRank = roadmapOrder.has(a.lessonId) ? roadmapOrder.get(a.lessonId) : Number.MAX_SAFE_INTEGER;
      const bRank = roadmapOrder.has(b.lessonId) ? roadmapOrder.get(b.lessonId) : Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      const abilityRank = (lesson) => lesson.isCompleted ? 4
        : lesson.assessmentAccuracy !== null && lesson.assessmentAccuracy < 50 ? 0
          : lesson.assessmentAccuracy !== null && lesson.assessmentAccuracy < 80 ? 1
            : lesson.assessmentAccuracy !== null ? 2 : 3;
      if (abilityRank(a) !== abilityRank(b)) return abilityRank(a) - abilityRank(b);
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      if (a.accuracy !== null && b.accuracy !== null && a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return a.sortOrder - b.sortOrder;
    });
    const recommended = lessons.find((lesson) => !lesson.isCompleted);
    const latestRoadmap = roadmapResult.recordset[0];
    return response.json({
      grade: Number(result.recordset[0]?.Grade || 0),
      isPremium,
      premiumRequired: !isPremium,
      recommendedDifficulty,
      difficultyLabel: ["", "Cơ bản", "Trung bình", "Nâng cao"][recommendedDifficulty],
      lessons,
      completedCount: lessons.filter((lesson) => lesson.isCompleted).length,
      recommendedLessonId: recommended?.lessonId || null,
      generatedBy: latestRoadmap?.GeneratedBy || (isPremium ? "Adaptive" : "System"),
      roadmapReason: latestRoadmap?.Reason || "",
      recommendation: recommended
        ? recommended.weeklyAccuracy !== null && recommended.weeklyAccuracy < 50
          ? `Ưu tiên ôn ${recommended.topic.name}: tuần này con đúng ${recommended.weeklyAccuracy}% câu ở chủ đề này.`
          : recommended.placementAccuracy !== null && recommended.placementAccuracy < 50
            ? `Bắt đầu với ${recommended.topic.name}: bài đánh giá đầu vào cho thấy đây là phần con nên củng cố.`
          : recommended.weeklyAccuracy !== null && recommended.weeklyAccuracy >= 80
            ? `Con đã nắm khá vững ${recommended.topic.name}; bài luyện được nâng lên mức ${["", "cơ bản", "trung bình", "nâng cao"][recommended.recommendedDifficulty]}.`
            : recommended.placementAccuracy !== null && recommended.placementAccuracy >= 80
              ? `Con đã vững ${recommended.topic.name}; bắt đầu với bài luyện ở mức ${["", "cơ bản", "trung bình", "nâng cao"][recommended.recommendedDifficulty]}.`
            : roadmapOrder.has(recommended.lessonId)
          ? latestRoadmap?.Reason || `Bài này nằm trong lộ trình sau đánh giá của bạn: ${recommended.topic.name}.`
          : recommended.accuracy === null
            ? "Bắt đầu chủ đề mới theo chương trình lớp bạn."
            : `Ôn lại ${recommended.topic.name} để củng cố phần đang cần luyện.`
        : "Bạn đã hoàn thành toàn bộ bài học trong lộ trình lớp này!",
    });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải lộ trình học.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/learning/lessons/:id/complete", authenticate, async (request, response) => {
  if (!/^\d+$/.test(request.params.id) || !Number.isSafeInteger(Number(request.params.id)) || Number(request.params.id) < 1) {
    return response.status(400).json({ message: "lessonId không hợp lệ." });
  }
  let transaction;
  try {
    await ensureLearningPathSchema();
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const result = await transaction.request()
      .input("studentId", sql.Int, request.user.userId)
      .input("lessonId", sql.Int, Number(request.params.id))
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM [mk].[Student] s
          INNER JOIN [mk].[Lessons] l ON l.LessonId = @lessonId AND l.IsActive = 1
          INNER JOIN [mk].[Topics] t ON t.TopicId = l.TopicId AND t.GradeId = s.Grade
          WHERE s.StudentId = @studentId
        )
          SELECT CAST(0 AS BIT) AS IsAvailable, CAST(0 AS BIT) AS WasCompleted, CAST(NULL AS DATETIME2) AS CompletedAt;
        ELSE
        BEGIN
          DECLARE @wasCompleted BIT = 0;
          IF EXISTS (SELECT 1 FROM [mk].[StudentLessonProgress] WHERE StudentId = @studentId AND LessonId = @lessonId AND IsCompleted = 1)
            SET @wasCompleted = 1;
          IF @wasCompleted = 0
            MERGE [mk].[StudentLessonProgress] AS target
            USING (SELECT @studentId AS StudentId, @lessonId AS LessonId) AS source
            ON target.StudentId = source.StudentId AND target.LessonId = source.LessonId
            WHEN MATCHED THEN UPDATE SET IsCompleted = 1, CompletedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN INSERT (StudentId, LessonId, IsCompleted, CompletedAt) VALUES (source.StudentId, source.LessonId, 1, SYSUTCDATETIME());
          SELECT CAST(1 AS BIT) AS IsAvailable, @wasCompleted AS WasCompleted, CompletedAt
          FROM [mk].[StudentLessonProgress] WHERE StudentId = @studentId AND LessonId = @lessonId;
        END
      `);
    const progress = result.recordset[0];
    if (!progress?.IsAvailable) {
      await transaction.rollback();
      return response.status(404).json({ message: "Không tìm thấy bài học của lớp bạn." });
    }
    await transaction.commit();
    return response.json({ message: progress.WasCompleted ? "Bài học này đã được hoàn thành trước đó." : "Đã lưu bài học hoàn thành!", isCompleted: true, completedAt: progress.CompletedAt });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    return response.status(500).json({ message: "Không thể cập nhật tiến độ bài học.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/questions/topics", authenticate, async (request, response) => {
  try {
    await ensureQuestionBankSchema();
    const pool = await getPool();
    const rawGrade = request.query.grade;
    let grade;
    if (rawGrade === undefined) {
      const student = await pool.request().input("studentId", sql.Int, request.user.userId)
        .query("SELECT Grade FROM [mk].[Student] WHERE StudentId = @studentId");
      grade = Number(student.recordset[0]?.Grade);
    } else {
      grade = Number(rawGrade);
    }
    if (!Number.isInteger(grade) || grade < 1 || grade > 5) return response.status(400).json({ message: "grade phải là số nguyên từ 1 đến 5." });
    const result = await pool.request().input("grade", sql.TinyInt, grade)
      .query("SELECT TopicCode AS code, Name AS name FROM [mk].[Topics] WHERE GradeId = @grade ORDER BY Name");
    return response.json({ grade, topics: result.recordset });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải danh sách chủ đề.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/questions", authenticate, async (request, response) => {
  try {
    await ensureQuestionBankSchema();
    const pool = await getPool();
    const rawGrade = request.query.grade;
    let grade;
    if (rawGrade === undefined) {
      const student = await pool.request().input("studentId", sql.Int, request.user.userId)
        .query("SELECT Grade FROM [mk].[Student] WHERE StudentId = @studentId");
      grade = Number(student.recordset[0]?.Grade);
    } else {
      grade = Number(rawGrade);
    }
    if (!Number.isInteger(grade) || grade < 1 || grade > 5) return response.status(400).json({ message: "grade phải là số nguyên từ 1 đến 5." });

    const rawTopic = request.query.topic;
    const topic = rawTopic === undefined ? null : String(rawTopic).trim().toLowerCase();
    if (topic !== null && (!topic || topic.length > 50 || !/^[a-z0-9-]+$/.test(topic))) {
      return response.status(400).json({ message: "topic chỉ được chứa chữ thường, số và dấu gạch ngang." });
    }
    const activity = request.query.activity === "game" ? "Game" : "Practice";
    const rawDifficulty = request.query.difficulty;
    const difficulty = rawDifficulty === undefined ? null : Number(rawDifficulty);
    if (difficulty !== null && (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3)) {
      return response.status(400).json({ message: "difficulty phải là 1 (Easy), 2 (Medium) hoặc 3 (Hard)." });
    }
    if (difficulty > 1 && activity !== "Game" && !await hasActivePremium(pool, request.user.userId)) return premiumRequired(response, "advanced_practice");
    const effectiveDifficulty = activity === "Game" ? difficulty : difficulty ?? 1;
    const rawCount = request.query.count;
    const count = rawCount === undefined ? 10 : Number(rawCount);
    if (!Number.isInteger(count) || count < 1 || count > 50) return response.status(400).json({ message: "count phải là số nguyên từ 1 đến 50." });

    const result = await pool.request()
      .input("grade", sql.TinyInt, grade)
      .input("topic", sql.VarChar(50), topic)
      .input("difficulty", sql.TinyInt, effectiveDifficulty)
      .input("count", sql.Int, count)
      .query(`SELECT TOP (@count) q.QuestionId, t.GradeId, t.TopicCode, t.Name AS TopicName,
                     q.QuestionText, q.OptionA, q.OptionB, q.OptionC, q.OptionD, q.Difficulty
              FROM [mk].[Questions] q
              INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
              WHERE t.GradeId = @grade AND q.IsActive = 1
                AND (@topic IS NULL OR t.TopicCode = @topic)
                AND (@difficulty IS NULL OR q.Difficulty = @difficulty)
              ORDER BY NEWID()`);
    return response.json({
      grade, topic, difficulty, count: result.recordset.length,
      questions: result.recordset.map((row) => ({
        questionId: row.QuestionId,
        grade: Number(row.GradeId),
        topic: { code: row.TopicCode, name: row.TopicName },
        questionText: row.QuestionText,
        options: [row.OptionA, row.OptionB, row.OptionC, row.OptionD].map((text, index) => ({ key: String.fromCharCode(65 + index), text })),
        difficulty: Number(row.Difficulty),
      })),
    });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải câu hỏi.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/questions/:id", authenticate, async (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(400).json({ message: "questionId không hợp lệ." });
  const questionId = Number(request.params.id);
  if (!Number.isSafeInteger(questionId) || questionId < 1) return response.status(400).json({ message: "questionId không hợp lệ." });
  try {
    await ensureQuestionBankSchema();
    const pool = await getPool();
    const result = await pool.request().input("questionId", sql.Int, questionId).query(`
      SELECT q.QuestionId, t.GradeId, t.TopicCode, t.Name AS TopicName, q.QuestionText,
             q.OptionA, q.OptionB, q.OptionC, q.OptionD, q.Difficulty
      FROM [mk].[Questions] q INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
      WHERE q.QuestionId = @questionId AND q.IsActive = 1
    `);
    const row = result.recordset[0];
    if (!row) return response.status(404).json({ message: "Không tìm thấy câu hỏi đang hoạt động." });
    if (Number(row.Difficulty) > 1 && request.query.activity !== "game" && !await hasActivePremium(pool, request.user.userId)) return premiumRequired(response, "advanced_practice");
    return response.json({ question: {
      questionId: row.QuestionId, grade: Number(row.GradeId),
      topic: { code: row.TopicCode, name: row.TopicName }, questionText: row.QuestionText,
      options: [row.OptionA, row.OptionB, row.OptionC, row.OptionD].map((text, index) => ({ key: String.fromCharCode(65 + index), text })),
      difficulty: Number(row.Difficulty),
    } });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải câu hỏi.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/questions/:id/answer", authenticate, async (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(400).json({ message: "questionId không hợp lệ." });
  const questionId = Number(request.params.id);
  const answer = typeof request.body?.answer === "string" ? request.body.answer.trim().toUpperCase() : "";
  const activityType = typeof request.body?.activityType === "string" ? request.body.activityType.trim() : "Practice";
  const timeSpent = request.body?.timeSpent === undefined ? 0 : Number(request.body.timeSpent);
  if (!Number.isSafeInteger(questionId) || questionId < 1) return response.status(400).json({ message: "questionId không hợp lệ." });
  if (!["A", "B", "C", "D"].includes(answer)) return response.status(400).json({ message: "answer phải là A, B, C hoặc D." });
  if (!["Game", "Lesson", "Practice"].includes(activityType)) return response.status(400).json({ message: "activityType không hợp lệ." });
  if (!Number.isInteger(timeSpent) || timeSpent < 0 || timeSpent > 86400) return response.status(400).json({ message: "timeSpent phải là số giây từ 0 đến 86400." });
  let transaction;
  try {
    await ensureLearningPathSchema();
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const student = await transaction.request().input("studentId", sql.Int, request.user.userId)
      .query("SELECT StudentId FROM [mk].[Student] WITH (UPDLOCK, HOLDLOCK) WHERE StudentId = @studentId");
    if (!student.recordset.length) {
      await transaction.rollback();
      return response.status(403).json({ message: "Chỉ học sinh mới có thể nộp câu trả lời." });
    }
    const questionResult = await transaction.request().input("questionId", sql.Int, questionId)
      .query("SELECT CorrectAnswer, Explanation, OptionA, OptionB, OptionC, OptionD, Difficulty FROM [mk].[Questions] WITH (UPDLOCK, HOLDLOCK) WHERE QuestionId = @questionId AND IsActive = 1");
    const question = questionResult.recordset[0];
    if (!question) {
      await transaction.rollback();
      return response.status(404).json({ message: "Không tìm thấy câu hỏi đang hoạt động." });
    }
    if (Number(question.Difficulty) > 1 && activityType !== "Game" && !await hasActivePremium(pool, request.user.userId)) {
      await transaction.rollback();
      return premiumRequired(response, "advanced_practice");
    }
    const isCorrect = answer === question.CorrectAnswer;
    const optionText = {
      A: question.OptionA, B: question.OptionB, C: question.OptionC, D: question.OptionD,
    };
    const explanation = question.Explanation?.trim() || "Hãy đọc lại lý thuyết và làm phép tính từng bước để kiểm tra đáp án.";
    const selectedOptionText = optionText[answer] ?? "";
    const correctOptionText = optionText[question.CorrectAnswer] ?? "";
    const feedback = isCorrect
      ? `Cách làm: ${explanation}`
      : `Em chọn ${answer}: “${selectedOptionText}”, nhưng đáp án này chưa đúng. Đáp án đúng là ${question.CorrectAnswer}: “${correctOptionText}”. Cách giải đúng: ${explanation}`;
    const result = await transaction.request()
      .input("studentId", sql.Int, request.user.userId)
      .input("questionId", sql.Int, questionId)
      .input("answer", sql.Char(1), answer)
      .input("activityType", sql.VarChar(12), activityType)
      .input("isCorrect", sql.Bit, isCorrect)
      .input("timeSpent", sql.Int, timeSpent)
      .query(`INSERT INTO [mk].[StudentQuestionResults] (StudentId, QuestionId, Answer, IsCorrect, TimeSpent, ActivityType)
              OUTPUT INSERTED.ResultId, INSERTED.CreatedAt
              VALUES (@studentId, @questionId, @answer, @isCorrect, @timeSpent, @activityType)`);
    await transaction.commit();
    return response.json({
      resultId: result.recordset[0].ResultId,
      questionId, answer, isCorrect,
      correctAnswer: question.CorrectAnswer,
      selectedOptionText, correctOptionText, explanation, feedback,
      createdAt: result.recordset[0].CreatedAt,
    });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    return response.status(500).json({ message: "Không thể lưu câu trả lời.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/games/rewards", authenticate, async (request, response) => {
  const rawResultIds = request.body?.resultIds;
  if (!Array.isArray(rawResultIds) || rawResultIds.length < 1 || rawResultIds.length > 50) {
    return response.status(400).json({ message: "resultIds phải là danh sách từ 1 đến 50 kết quả của lượt chơi." });
  }
  const resultIds = [...new Set(rawResultIds.map(Number))];
  if (resultIds.length !== rawResultIds.length || resultIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    return response.status(400).json({ message: "resultIds phải chứa các mã kết quả hợp lệ và không trùng nhau." });
  }
  let transaction;
  try {
    await ensureLearningPathSchema();
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const student = await transaction.request().input("studentId", sql.Int, request.user.userId)
      .query("SELECT StudentId FROM [mk].[Student] WITH (UPDLOCK, HOLDLOCK) WHERE StudentId = @studentId");
    if (!student.recordset.length) {
      await transaction.rollback();
      return response.status(403).json({ message: "Chỉ học sinh mới nhận được XP từ trò chơi." });
    }
    const requestWithIds = transaction.request().input("studentId", sql.Int, request.user.userId);
    const placeholders = resultIds.map((id, index) => {
      requestWithIds.input(`result${index}`, sql.BigInt, id);
      return `@result${index}`;
    });
    const claimed = await requestWithIds.query(`
      INSERT INTO [mk].[StudentGameRewardClaim] (ResultId, StudentId, RewardXp)
      OUTPUT INSERTED.RewardXp
      SELECT r.ResultId, @studentId, 5
      FROM [mk].[StudentQuestionResults] r WITH (UPDLOCK, HOLDLOCK)
      WHERE r.StudentId = @studentId AND r.IsCorrect = 1 AND r.ActivityType = 'Game' AND r.ResultId IN (${placeholders.join(",")})
        AND NOT EXISTS (
          SELECT 1 FROM [mk].[StudentGameRewardClaim] c WITH (UPDLOCK, HOLDLOCK)
          WHERE c.ResultId = r.ResultId
        )
    `);
    const rewardXp = claimed.recordset.reduce((sum, row) => sum + Number(row.RewardXp), 0);
    let totalXp = 0;
    if (rewardXp > 0) {
      const updated = await transaction.request()
        .input("studentId", sql.Int, request.user.userId)
        .input("rewardXp", sql.Int, rewardXp)
        .query(`UPDATE [mk].[Student] SET TotalXp = ISNULL(TotalXp, 0) + @rewardXp
                OUTPUT INSERTED.TotalXp WHERE StudentId = @studentId`);
      totalXp = Number(updated.recordset[0]?.TotalXp || 0);
    } else {
      const current = await transaction.request().input("studentId", sql.Int, request.user.userId)
        .query("SELECT TotalXp FROM [mk].[Student] WHERE StudentId = @studentId");
      totalXp = Number(current.recordset[0]?.TotalXp || 0);
    }
    await transaction.commit();
    return response.json({ rewardXp, totalXp, level: Math.floor(totalXp / 100) + 1, message: rewardXp ? `Bạn nhận được ${rewardXp} XP từ lượt chơi!` : "Lượt chơi này chưa có XP mới để nhận." });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    return response.status(500).json({ message: "Không thể cộng XP trò chơi.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/students/me/rewards", authenticate, async (request, response) => {
  try {
    await ensureDailyChallengeSchema();
    const pool = await getPool();
    const [studentResult, inventoryResult] = await Promise.all([
      pool.request().input("studentId", sql.Int, request.user.userId)
        .query("SELECT TotalXp, TotalStars FROM [mk].[Student] WHERE StudentId = @studentId"),
      pool.request().input("studentId", sql.Int, request.user.userId)
        .query("SELECT RewardCode, IsEquipped FROM [mk].[StudentRewardInventory] WHERE StudentId = @studentId"),
    ]);
    const student = studentResult.recordset[0];
    if (!student) return response.status(404).json({ message: "Không tìm thấy hồ sơ học sinh." });
    const totalXp = Number(student.TotalXp || 0);
    const totalStars = Number(student.TotalStars || 0);
    const ownedCodes = inventoryResult.recordset.map((item) => item.RewardCode);
    const equippedReward = inventoryResult.recordset.find((item) => item.IsEquipped)?.RewardCode || "";
    return response.json({
      totalXp, totalStars,
      level: Math.floor(totalXp / 100) + 1,
      levelProgress: totalXp % 100,
      nextLevelXp: 100,
      badges: xpBadges.map((badge) => ({ ...badge, unlocked: totalXp >= badge.threshold })),
      catalog: rewardCatalog.map((item) => ({ ...item, owned: ownedCodes.includes(item.code), equipped: equippedReward === item.code })),
      equippedReward,
    });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải phần thưởng.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/students/me/rewards/:code/purchase", authenticate, async (request, response) => {
  const item = rewardCatalog.find((reward) => reward.code === request.params.code);
  if (!item) return response.status(404).json({ message: "Vật phẩm không tồn tại." });
  let transaction;
  try {
    await ensureDailyChallengeSchema();
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const studentResult = await transaction.request().input("studentId", sql.Int, request.user.userId)
      .query("SELECT TotalStars FROM [mk].[Student] WITH (UPDLOCK, HOLDLOCK) WHERE StudentId = @studentId");
    const student = studentResult.recordset[0];
    if (!student) {
      await transaction.rollback();
      return response.status(404).json({ message: "Không tìm thấy hồ sơ học sinh." });
    }
    const ownedResult = await transaction.request()
      .input("studentId", sql.Int, request.user.userId)
      .input("code", sql.NVarChar(40), item.code)
      .query("SELECT 1 AS IsOwned FROM [mk].[StudentRewardInventory] WITH (UPDLOCK, HOLDLOCK) WHERE StudentId = @studentId AND RewardCode = @code");
    if (ownedResult.recordset.length) {
      await transaction.rollback();
      return response.status(409).json({ message: "Bạn đã sở hữu vật phẩm này rồi." });
    }
    const balance = Number(student.TotalStars || 0);
    if (balance < item.cost) {
      await transaction.rollback();
      return response.status(400).json({ message: `Bạn cần thêm ${item.cost - balance} sao để đổi vật phẩm này.` });
    }
    await transaction.request().input("studentId", sql.Int, request.user.userId).input("cost", sql.Int, item.cost)
      .query("UPDATE [mk].[Student] SET TotalStars = ISNULL(TotalStars, 0) - @cost WHERE StudentId = @studentId");
    await transaction.request().input("studentId", sql.Int, request.user.userId).input("code", sql.NVarChar(40), item.code)
      .query("INSERT INTO [mk].[StudentRewardInventory] (StudentId, RewardCode) VALUES (@studentId, @code)");
    await transaction.commit();
    return response.json({ message: `Đổi thành công ${item.name}!`, item, totalStars: balance - item.cost });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    return response.status(500).json({ message: "Không thể đổi vật phẩm.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/students/me/rewards/:code/equip", authenticate, async (request, response) => {
  const item = rewardCatalog.find((reward) => reward.code === request.params.code);
  if (!item) return response.status(404).json({ message: "Vật phẩm không tồn tại." });
  let transaction;
  try {
    await ensureDailyChallengeSchema();
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const owned = await transaction.request().input("studentId", sql.Int, request.user.userId)
      .input("code", sql.NVarChar(40), item.code)
      .query("SELECT 1 AS IsOwned FROM [mk].[StudentRewardInventory] WITH (UPDLOCK, HOLDLOCK) WHERE StudentId = @studentId AND RewardCode = @code");
    if (!owned.recordset.length) {
      await transaction.rollback();
      return response.status(403).json({ message: "Hãy đổi vật phẩm trước khi trang bị." });
    }
    await transaction.request().input("studentId", sql.Int, request.user.userId)
      .query("UPDATE [mk].[StudentRewardInventory] SET IsEquipped = 0 WHERE StudentId = @studentId");
    await transaction.request().input("studentId", sql.Int, request.user.userId).input("code", sql.NVarChar(40), item.code)
      .query("UPDATE [mk].[StudentRewardInventory] SET IsEquipped = 1 WHERE StudentId = @studentId AND RewardCode = @code");
    await transaction.commit();
    return response.json({ message: `Đã trang bị ${item.name}.`, equippedReward: item.code });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    return response.status(500).json({ message: "Không thể trang bị vật phẩm.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/students/me/dashboard", authenticate, async (request, response) => {
  try {
    await ensureLearningPathSchema();
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, request.user.userId).query(`
      SELECT u.UserId, u.Email, u.DisplayName, u.UserRole,
             s.Grade, s.TotalXp, s.TotalStars, s.AvatarUrl,
             (SELECT TOP 1 ri.RewardCode FROM [mk].[StudentRewardInventory] ri WHERE ri.StudentId = s.StudentId AND ri.IsEquipped = 1) AS EquippedReward,
             (SELECT COUNT_BIG(*) FROM [mk].[StudentLessonProgress] lp WHERE lp.StudentId = s.StudentId AND lp.IsCompleted = 1)
               + (SELECT COUNT_BIG(*) FROM [mk].[LessonAttempt] la WHERE la.StudentId = s.StudentId AND la.Status = 'Completed') AS CompletedLessons,
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
      equippedReward: row.EquippedReward || "",
      avatarUrl: row.AvatarUrl,
      completedLessons: Number(row.CompletedLessons),
      completedAssessments: Number(row.CompletedAssessments),
    } });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải dashboard học sinh.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/students/me/leaderboard", authenticate, async (request, response) => {
  try {
    const pool = await getPool();
    const studentResult = await pool.request().input("studentId", sql.Int, request.user.userId)
      .query("SELECT Grade FROM [mk].[Student] WHERE StudentId = @studentId");
    const student = studentResult.recordset[0];
    if (!student) return response.status(403).json({ message: "Bảng xếp hạng chỉ dành cho học sinh." });
    const result = await pool.request().input("grade", sql.TinyInt, student.Grade).query(`
      SELECT TOP (3) u.UserId, u.DisplayName, s.Grade, ISNULL(s.TotalXp, 0) AS TotalXp, ISNULL(s.TotalStars, 0) AS TotalStars
      FROM [mk].[Student] s
      INNER JOIN [mk].[AppUser] u ON u.UserId = s.StudentId
      WHERE s.Grade = @grade AND u.UserRole = 'Student' AND u.IsActive = 1
      ORDER BY ISNULL(s.TotalXp, 0) DESC, ISNULL(s.TotalStars, 0) DESC, u.DisplayName ASC
    `);
    return response.json({
      grade: Number(student.Grade),
      topStudents: result.recordset.map((row, index) => ({
        rank: index + 1, name: row.DisplayName,
        grade: Number(row.Grade), totalXp: Number(row.TotalXp), totalStars: Number(row.TotalStars),
      })),
    });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải bảng xếp hạng.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.get("/api/students/me/daily-challenge", authenticate, async (request, response) => {
  try {
    await ensureDailyChallengeSchema();
    const pool = await getPool();
    const date = vietnamDateKey();
    const studentResult = await pool.request().input("studentId", sql.Int, request.user.userId)
      .query("SELECT Grade FROM [mk].[Student] WHERE StudentId = @studentId");
    const student = studentResult.recordset[0];
    if (!student) return response.status(404).json({ message: "Không tìm thấy hồ sơ học sinh." });
    const grade = Math.min(5, Math.max(1, Number(student.Grade) || 1));
    const attemptResult = await pool.request()
      .input("studentId", sql.Int, request.user.userId)
      .input("challengeDate", sql.Date, date)
      .query(`SELECT AttemptsCount, IsCompleted, RewardXp, RewardStars, CompletedAt
              FROM [mk].[DailyChallengeAttempt] WHERE StudentId = @studentId AND ChallengeDate = @challengeDate`);
    const attempt = attemptResult.recordset[0];
    const { prompt, options } = getDailyChallenge(grade, date);
    return response.json({
      challenge: { date, grade, prompt, options },
      progress: {
        attempts: Number(attempt?.AttemptsCount || 0),
        completed: Boolean(attempt?.IsCompleted),
        rewardXp: Number(attempt?.RewardXp || 0),
        rewardStars: Number(attempt?.RewardStars || 0),
        completedAt: attempt?.CompletedAt || null,
      },
    });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải thử thách hôm nay.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

app.post("/api/students/me/daily-challenge/answer", authenticate, async (request, response) => {
  const answer = typeof request.body?.answer === "string" ? request.body.answer.trim() : "";
  if (!answer || answer.length > 50) return response.status(400).json({ message: "Vui lòng chọn một đáp án hợp lệ." });
  let transaction;
  try {
    await ensureDailyChallengeSchema();
    const pool = await getPool();
    const date = vietnamDateKey();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const studentResult = await transaction.request().input("studentId", sql.Int, request.user.userId)
      .query("SELECT Grade FROM [mk].[Student] WITH (UPDLOCK, HOLDLOCK) WHERE StudentId = @studentId");
    const student = studentResult.recordset[0];
    if (!student) {
      await transaction.rollback();
      return response.status(404).json({ message: "Không tìm thấy hồ sơ học sinh." });
    }
    const grade = Math.min(5, Math.max(1, Number(student.Grade) || 1));
    const challenge = getDailyChallenge(grade, date);
    if (!challenge.options.includes(answer)) {
      await transaction.rollback();
      return response.status(400).json({ message: "Đáp án không nằm trong các lựa chọn của thử thách hôm nay." });
    }
    const progressResult = await transaction.request()
      .input("studentId", sql.Int, request.user.userId)
      .input("challengeDate", sql.Date, date)
      .query(`SELECT AttemptsCount, IsCompleted, RewardXp, RewardStars
              FROM [mk].[DailyChallengeAttempt] WITH (UPDLOCK, HOLDLOCK)
              WHERE StudentId = @studentId AND ChallengeDate = @challengeDate`);
    const previous = progressResult.recordset[0];
    if (previous?.IsCompleted) {
      await transaction.commit();
      return response.json({
        correct: true, completed: true, alreadyCompleted: true, rewardClaimed: true,
        attempts: Number(previous.AttemptsCount), rewardXp: Number(previous.RewardXp), rewardStars: Number(previous.RewardStars),
        message: "Bạn đã nhận phần thưởng thử thách hôm nay rồi!",
      });
    }

    const correct = answer === challenge.answer;
    const attempts = Number(previous?.AttemptsCount || 0) + 1;
    const rewardXp = correct ? 10 : 0;
    const rewardStars = correct ? 1 : 0;
    if (previous) {
      await transaction.request()
        .input("studentId", sql.Int, request.user.userId)
        .input("challengeDate", sql.Date, date)
        .input("grade", sql.TinyInt, grade)
        .input("answer", sql.NVarChar(50), answer)
        .input("correct", sql.Bit, correct)
        .input("rewardXp", sql.Int, rewardXp)
        .input("rewardStars", sql.Int, rewardStars)
        .query(`UPDATE [mk].[DailyChallengeAttempt]
                SET Grade = @grade, AttemptsCount = AttemptsCount + 1, LastAnswer = @answer,
                    IsCompleted = @correct, RewardXp = @rewardXp, RewardStars = @rewardStars,
                    CompletedAt = CASE WHEN @correct = 1 THEN SYSUTCDATETIME() ELSE NULL END
                WHERE StudentId = @studentId AND ChallengeDate = @challengeDate`);
    } else {
      await transaction.request()
        .input("studentId", sql.Int, request.user.userId)
        .input("challengeDate", sql.Date, date)
        .input("grade", sql.TinyInt, grade)
        .input("answer", sql.NVarChar(50), answer)
        .input("correct", sql.Bit, correct)
        .input("rewardXp", sql.Int, rewardXp)
        .input("rewardStars", sql.Int, rewardStars)
        .query(`INSERT INTO [mk].[DailyChallengeAttempt]
                  (StudentId, ChallengeDate, Grade, AttemptsCount, LastAnswer, IsCompleted, RewardXp, RewardStars, CompletedAt)
                VALUES (@studentId, @challengeDate, @grade, 1, @answer, @correct, @rewardXp, @rewardStars,
                        CASE WHEN @correct = 1 THEN SYSUTCDATETIME() ELSE NULL END)`);
    }
    if (correct) {
      await transaction.request().input("studentId", sql.Int, request.user.userId)
        .input("rewardXp", sql.Int, rewardXp).input("rewardStars", sql.Int, rewardStars)
        .query(`UPDATE [mk].[Student]
                SET TotalXp = ISNULL(TotalXp, 0) + @rewardXp,
                    TotalStars = ISNULL(TotalStars, 0) + @rewardStars
                WHERE StudentId = @studentId`);
    }
    await transaction.commit();
    return response.json({
      correct, completed: correct, rewardClaimed: Boolean(previous?.IsCompleted || correct), attempts, rewardXp, rewardStars,
      message: correct ? "Chính xác! Bạn nhận được 10 XP và 1 ngôi sao." : "Chưa đúng rồi, thử chọn đáp án khác nhé!",
    });
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    return response.status(500).json({ message: "Không thể lưu kết quả thử thách.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
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

app.delete("/api/students/me/avatar", authenticate, async (request, response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().input("studentId", sql.Int, request.user.userId).query(`
      UPDATE [mk].[Student]
      SET AvatarUrl = NULL
      OUTPUT DELETED.AvatarUrl AS PreviousAvatarUrl
      WHERE StudentId = @studentId
    `);
    if (!result.recordset.length) return response.status(404).json({ message: "Không tìm thấy hồ sơ học sinh." });
    const previousAvatarUrl = result.recordset[0].PreviousAvatarUrl;
    const localImage = typeof previousAvatarUrl === "string"
      ? previousAvatarUrl.match(/^\/uploads\/([0-9a-f-]{36}\.(?:png|jpg|webp))$/i)
      : null;
    if (localImage) {
      try { await unlink(path.join(uploadsDirectory, localImage[1])); }
      catch (error) { if (error.code !== "ENOENT") console.error("Không thể dọn ảnh đại diện đã xóa:", error.message); }
    }
    return response.json({ message: "Đã xóa ảnh đại diện.", avatarUrl: "" });
  } catch (error) {
    return response.status(500).json({ message: "Không thể xóa ảnh đại diện.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
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


// ──────────────────────────────────────────────────────────
// INVITE CODE — Học sinh tạo mã chia sẻ với phụ huynh
// ──────────────────────────────────────────────────────────
app.get("/api/students/me/invite-code", authenticate, async (request, response) => {
  try {
    await ensureParentModuleSchema();
    const pool = await getPool();
    const studentResult = await pool.request()
      .input("userId", sql.Int, request.user.userId)
      .query("SELECT StudentId FROM [mk].[Student] WHERE StudentId = @userId");
    if (!studentResult.recordset[0]) return response.status(403).json({ message: "Chỉ học sinh mới có thể tạo mã liên kết." });
    const existing = await pool.request()
      .input("studentId", sql.Int, request.user.userId)
      .query(`SELECT TOP 1 InviteCode, ExpiresAt FROM [mk].[ChildLinkInvite]
              WHERE StudentId = @studentId AND IsUsed = 0 AND ExpiresAt > SYSUTCDATETIME()
              ORDER BY CreatedAt DESC`);
    if (existing.recordset[0]) {
      return response.json({ inviteCode: existing.recordset[0].InviteCode, expiresAt: existing.recordset[0].ExpiresAt });
    }
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = "MK" + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const check = await pool.request().input("code", sql.VarChar(10), candidate)
        .query("SELECT 1 FROM [mk].[ChildLinkInvite] WHERE InviteCode = @code");
      if (!check.recordset.length) { code = candidate; break; }
    }
    if (!code) return response.status(500).json({ message: "Không thể tạo mã liên kết. Vui lòng thử lại." });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.request()
      .input("studentId", sql.Int, request.user.userId)
      .input("code", sql.VarChar(10), code)
      .input("expiresAt", sql.DateTime2, expiresAt)
      .query("INSERT INTO [mk].[ChildLinkInvite] (StudentId, InviteCode, ExpiresAt) VALUES (@studentId, @code, @expiresAt)");
    return response.json({ inviteCode: code, expiresAt });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tạo mã liên kết.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

// ──────────────────────────────────────────────────────────
// PARENT — Danh sách con đã liên kết
// ──────────────────────────────────────────────────────────
app.get("/api/parents/me/children", authenticate, requireParent, async (request, response) => {
  try {
    await ensureParentModuleSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input("parentId", sql.Int, request.user.userId)
      .query(`
        SELECT u.UserId AS StudentId, u.DisplayName AS Name, s.Grade, s.AvatarUrl,
               ISNULL(s.TotalXp,0) AS TotalXp, ISNULL(s.TotalStars,0) AS TotalStars, l.LinkedAt
        FROM [mk].[ParentStudentLink] l
        INNER JOIN [mk].[AppUser] u ON u.UserId = l.StudentId
        INNER JOIN [mk].[Student] s ON s.StudentId = l.StudentId
        WHERE l.ParentUserId = @parentId AND l.IsActive = 1 AND u.IsActive = 1
        ORDER BY l.LinkedAt DESC
      `);
    return response.json({
      children: result.recordset.map((r) => ({
        studentId: r.StudentId, name: r.Name, grade: r.Grade,
        avatarUrl: r.AvatarUrl || "", totalXp: Number(r.TotalXp),
        totalStars: Number(r.TotalStars), linkedAt: r.LinkedAt,
      })),
    });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải danh sách con.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

// ──────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────
// PARENT — Tạo tài khoản học sinh và tự động liên kết
// ──────────────────────────────────────────────────────────
app.post("/api/parents/me/children/create", authenticate, requireParent, async (request, response) => {
  const { name, email, password, grade } = request.body || {};
  if (!name?.trim()) return response.status(400).json({ message: "Vui lòng nhập tên học sinh." });
  if (!email?.trim()) return response.status(400).json({ message: "Vui lòng nhập email học sinh." });
  if (!password || password.length < 6) return response.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự." });
  const validGrades = [1, 2, 3, 4, 5];
  const studentGrade = validGrades.includes(Number(grade)) ? Number(grade) : 1;
  try {
    await ensureParentModuleSchema();
    const pool = await getPool();
    // Kiểm tra giới hạn số con (tối đa 5 con mỗi phụ huynh)
    const childCountResult = await pool.request()
      .input("parentId", sql.Int, request.user.userId)
      .query("SELECT COUNT(*) AS Cnt FROM [mk].[ParentStudentLink] WHERE ParentUserId=@parentId AND IsActive=1");
    if (childCountResult.recordset[0].Cnt >= 5)
      return response.status(409).json({ message: "Mỗi phụ huynh chỉ được liên kết tối đa 5 học sinh." });
    // Tạo tài khoản học sinh
    const passwordHash = await bcrypt.hash(password, 12);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const userResult = await transaction.request()
        .input("email", sql.NVarChar(255), email.trim().toLowerCase())
        .input("passwordHash", sql.NVarChar(500), passwordHash)
        .input("displayName", sql.NVarChar(120), name.trim())
        .input("userRole", sql.VarChar(20), "Student")
        .query(`INSERT INTO [mk].[AppUser] (Email, PasswordHash, DisplayName, UserRole)
                OUTPUT INSERTED.UserId, INSERTED.Email, INSERTED.DisplayName, INSERTED.UserRole
                VALUES (@email, @passwordHash, @displayName, @userRole)`);
      const newUser = userResult.recordset[0];
      // Tạo bản ghi Student
      await transaction.request()
        .input("studentId", sql.Int, newUser.UserId)
        .input("grade", sql.Int, studentGrade)
        .query("INSERT INTO [mk].[Student] (StudentId, Grade) VALUES (@studentId, @grade)");
      // Tự động liên kết phụ huynh - con
      await transaction.request()
        .input("parentId", sql.Int, request.user.userId)
        .input("studentId", sql.Int, newUser.UserId)
        .query("INSERT INTO [mk].[ParentStudentLink] (ParentUserId, StudentId) VALUES (@parentId, @studentId)");
      await transaction.commit();
      return response.status(201).json({
        success: true,
        child: { studentId: newUser.UserId, name: newUser.DisplayName, email: newUser.Email, grade: studentGrade },
        message: "Đã tạo tài khoản học sinh và liên kết thành công.",
      });
    } catch (err) {
      await transaction.rollback().catch(() => {});
      throw err;
    }
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) return response.status(409).json({ message: "Email này đã được sử dụng bởi tài khoản khác." });
    return response.status(500).json({ message: "Không thể tạo tài khoản học sinh.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

// ──────────────────────────────────────────────────────────
// PARENT — Liên kết con bằng mã invite
// ──────────────────────────────────────────────────────────
app.post("/api/parents/me/children/link", authenticate, requireParent, async (request, response) => {
  const inviteCode = typeof request.body?.inviteCode === "string" ? request.body.inviteCode.trim().toUpperCase() : "";
  if (!inviteCode) return response.status(400).json({ message: "Vui lòng nhập mã liên kết của con." });
  try {
    await ensureParentModuleSchema();
    const pool = await getPool();
    const inviteResult = await pool.request()
      .input("code", sql.VarChar(10), inviteCode)
      .query(`SELECT TOP 1 i.InviteId, i.StudentId, u.DisplayName, s.Grade
              FROM [mk].[ChildLinkInvite] i
              INNER JOIN [mk].[Student] s ON s.StudentId = i.StudentId
              INNER JOIN [mk].[AppUser] u ON u.UserId = i.StudentId
              WHERE i.InviteCode = @code AND i.IsUsed = 0 AND i.ExpiresAt > SYSUTCDATETIME()`);
    const invite = inviteResult.recordset[0];
    if (!invite) return response.status(404).json({ message: "Mã liên kết không hợp lệ hoặc đã hết hạn." });
    const parentCountResult = await pool.request()
      .input("studentId", sql.Int, invite.StudentId)
      .query("SELECT COUNT(*) AS Cnt FROM [mk].[ParentStudentLink] WHERE StudentId = @studentId AND IsActive = 1");
    if (parentCountResult.recordset[0].Cnt >= 2)
      return response.status(409).json({ message: "Học sinh này đã đạt giới hạn 2 phụ huynh liên kết." });
    const existLink = await pool.request()
      .input("parentId", sql.Int, request.user.userId)
      .input("studentId", sql.Int, invite.StudentId)
      .query("SELECT 1 FROM [mk].[ParentStudentLink] WHERE ParentUserId=@parentId AND StudentId=@studentId");
    if (existLink.recordset.length)
      return response.status(409).json({ message: "Bạn đã liên kết với học sinh này rồi." });
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      await transaction.request()
        .input("parentId", sql.Int, request.user.userId)
        .input("studentId", sql.Int, invite.StudentId)
        .query("INSERT INTO [mk].[ParentStudentLink] (ParentUserId, StudentId) VALUES (@parentId, @studentId)");
      await transaction.request()
        .input("inviteId", sql.Int, invite.InviteId)
        .query("UPDATE [mk].[ChildLinkInvite] SET IsUsed = 1 WHERE InviteId = @inviteId");
      await transaction.commit();
    } catch (err) { await transaction.rollback().catch(() => {}); throw err; }
    return response.json({ success: true, child: { studentId: invite.StudentId, name: invite.DisplayName, grade: invite.Grade } });
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) return response.status(409).json({ message: "Bạn đã liên kết với học sinh này rồi." });
    return response.status(500).json({ message: "Không thể liên kết.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

// ──────────────────────────────────────────────────────────
// PARENT — Hủy liên kết con
// ──────────────────────────────────────────────────────────
app.delete("/api/parents/me/children/:studentId", authenticate, requireParent, async (request, response) => {
  const studentId = Number(request.params.studentId);
  if (!Number.isInteger(studentId)) return response.status(400).json({ message: "studentId không hợp lệ." });
  try {
    await ensureParentModuleSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input("parentId", sql.Int, request.user.userId)
      .input("studentId", sql.Int, studentId)
      .query("UPDATE [mk].[ParentStudentLink] SET IsActive = 0 WHERE ParentUserId = @parentId AND StudentId = @studentId AND IsActive = 1");
    if (!result.rowsAffected[0]) return response.status(404).json({ message: "Không tìm thấy liên kết này." });
    return response.json({ success: true });
  } catch (error) {
    return response.status(500).json({ message: "Không thể hủy liên kết.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

// Middleware: xác nhận phụ huynh sở hữu học sinh này
async function requireLinkedChild(request, response, next) {
  const studentId = Number(request.params.studentId);
  if (!Number.isInteger(studentId)) return response.status(400).json({ message: "studentId không hợp lệ." });
  try {
    const pool = await getPool();
    const linkResult = await pool.request()
      .input("parentId", sql.Int, request.user.userId)
      .input("studentId", sql.Int, studentId)
      .query("SELECT 1 FROM [mk].[ParentStudentLink] WHERE ParentUserId=@parentId AND StudentId=@studentId AND IsActive=1");
    if (!linkResult.recordset.length) return response.status(403).json({ message: "Bạn không có quyền xem thông tin học sinh này." });
    request.linkedStudentId = studentId;
    return next();
  } catch (error) {
    return response.status(500).json({ message: "Không thể xác thực liên kết.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
}

// ──────────────────────────────────────────────────────────
// PARENT — Báo cáo học tập (FR-13)
// ──────────────────────────────────────────────────────────
app.get("/api/parents/me/children/:studentId/report", authenticate, requireParent, requireLinkedChild, async (request, response) => {
  const studentId = request.linkedStudentId;
  try {
    await ensureParentModuleSchema();
    const pool = await getPool();
    const [infoResult, summaryResult, topicsResult, weeklyResult, assessResult] = await Promise.all([
      pool.request().input("studentId", sql.Int, studentId).query(`
        SELECT u.DisplayName AS Name, s.Grade, ISNULL(s.TotalXp,0) AS TotalXp, ISNULL(s.TotalStars,0) AS TotalStars, s.AvatarUrl
        FROM [mk].[AppUser] u INNER JOIN [mk].[Student] s ON s.StudentId = u.UserId WHERE u.UserId = @studentId`),
      pool.request().input("studentId", sql.Int, studentId).query(`
        SELECT
          (SELECT COUNT(*) FROM [mk].[StudentLessonProgress] WHERE StudentId=@studentId AND IsCompleted=1) AS LessonsCompleted,
          (SELECT COUNT(*) FROM [mk].[Lessons]) AS TotalLessons,
          (SELECT COUNT(*) FROM [mk].[StudentQuestionResults] WHERE StudentId=@studentId) AS QuestionsAnswered,
          (SELECT CAST(AVG(CAST(IsCorrect AS FLOAT))*100 AS DECIMAL(5,1)) FROM [mk].[StudentQuestionResults] WHERE StudentId=@studentId) AS CorrectRate,
          (SELECT COUNT(DISTINCT CAST(CreatedAt AS DATE)) FROM [mk].[StudentQuestionResults] WHERE StudentId=@studentId AND CreatedAt >= DATEADD(day,-7,SYSUTCDATETIME())) AS StudyDaysThisWeek,
          (SELECT COUNT(DISTINCT CAST(CreatedAt AS DATE)) FROM [mk].[StudentQuestionResults] WHERE StudentId=@studentId AND CreatedAt >= DATEADD(day,-30,SYSUTCDATETIME())) AS StudyDaysThisMonth`),
      pool.request().input("studentId", sql.Int, studentId).query(`
        SELECT TOP 5 t.Name AS TopicName,
               CAST(AVG(CAST(r.IsCorrect AS FLOAT))*100 AS DECIMAL(5,1)) AS CorrectRate, COUNT(*) AS Total
        FROM [mk].[StudentQuestionResults] r
        INNER JOIN [mk].[Questions] q ON q.QuestionId = r.QuestionId
        INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
        WHERE r.StudentId = @studentId AND r.CreatedAt >= DATEADD(day,-30,SYSUTCDATETIME())
        GROUP BY t.TopicId, t.Name HAVING COUNT(*) >= 3 ORDER BY CorrectRate ASC`),
      pool.request().input("studentId", sql.Int, studentId).query(`
        SELECT TOP 8
          CAST(DATEADD(day,-(DATEPART(WEEKDAY,CreatedAt)+5)%7,CAST(CreatedAt AS DATE)) AS DATE) AS WeekStart,
          COUNT(*) AS QuestionsAnswered,
          CAST(AVG(CAST(IsCorrect AS FLOAT))*100 AS DECIMAL(5,1)) AS CorrectRate
        FROM [mk].[StudentQuestionResults] WHERE StudentId=@studentId
        GROUP BY CAST(DATEADD(day,-(DATEPART(WEEKDAY,CreatedAt)+5)%7,CAST(CreatedAt AS DATE)) AS DATE)
        ORDER BY WeekStart DESC`),
      pool.request().input("studentId", sql.Int, studentId).query(`
        SELECT
          (SELECT TOP 1 Score FROM [mk].[LearningPath] WHERE StudentId=@studentId ORDER BY GeneratedAt DESC) AS PlacementScore,
          (SELECT TOP 1 GeneratedAt FROM [mk].[LearningPath] WHERE StudentId=@studentId ORDER BY GeneratedAt DESC) AS PlacementAt,
          (SELECT TOP 1 Score FROM [mk].[WeeklyAssessmentAttempt] WHERE StudentId=@studentId AND SubmittedAt IS NOT NULL ORDER BY WeekStart DESC) AS LastWeeklyScore,
          (SELECT TOP 1 SubmittedAt FROM [mk].[WeeklyAssessmentAttempt] WHERE StudentId=@studentId AND SubmittedAt IS NOT NULL ORDER BY WeekStart DESC) AS LastWeeklyAt,
          (SELECT TOP 1 Score FROM [mk].[MonthlyAssessmentAttempt] WHERE StudentId=@studentId AND SubmittedAt IS NOT NULL ORDER BY TestMonth DESC) AS LastMonthlyScore,
          (SELECT TOP 1 SubmittedAt FROM [mk].[MonthlyAssessmentAttempt] WHERE StudentId=@studentId AND SubmittedAt IS NOT NULL ORDER BY TestMonth DESC) AS LastMonthlyAt`),
    ]);
    const info = infoResult.recordset[0];
    if (!info) return response.status(404).json({ message: "Không tìm thấy học sinh." });
    const s = summaryResult.recordset[0];
    const assess = assessResult.recordset[0];
    const allTopics = topicsResult.recordset;
    return response.json({
      report: {
        studentId, name: info.Name, grade: info.Grade, avatarUrl: info.AvatarUrl || "",
        totalXp: Number(info.TotalXp), totalStars: Number(info.TotalStars),
        summary: {
          lessonsCompleted: Number(s.LessonsCompleted || 0), totalLessons: Number(s.TotalLessons || 0),
          questionsAnswered: Number(s.QuestionsAnswered || 0), correctRate: Number(s.CorrectRate || 0),
          studyDaysThisWeek: Number(s.StudyDaysThisWeek || 0), studyDaysThisMonth: Number(s.StudyDaysThisMonth || 0),
        },
        weakTopics: allTopics.filter((t) => Number(t.CorrectRate) < 70).map((t) => ({ topicName: t.TopicName, correctRate: Number(t.CorrectRate), total: Number(t.Total) })),
        strongTopics: allTopics.filter((t) => Number(t.CorrectRate) >= 80).map((t) => ({ topicName: t.TopicName, correctRate: Number(t.CorrectRate) })),
        weeklyProgress: weeklyResult.recordset.map((w) => ({ week: w.WeekStart, questionsAnswered: Number(w.QuestionsAnswered), correctRate: Number(w.CorrectRate) })),
        assessments: {
          placement: { score: assess.PlacementScore ?? null, completedAt: assess.PlacementAt ?? null },
          lastWeekly: { score: assess.LastWeeklyScore ?? null, completedAt: assess.LastWeeklyAt ?? null },
          lastMonthly: { score: assess.LastMonthlyScore ?? null, completedAt: assess.LastMonthlyAt ?? null },
        },
      },
    });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải báo cáo học tập.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

// ──────────────────────────────────────────────────────────
// PARENT — Cảnh báo học tập (FR-14)
// ──────────────────────────────────────────────────────────
app.get("/api/parents/me/children/:studentId/alerts", authenticate, requireParent, requireLinkedChild, async (request, response) => {
  const studentId = request.linkedStudentId;
  try {
    await ensureParentModuleSchema();
    const pool = await getPool();
    const now = new Date();
    const alerts = [];
    const inactiveResult = await pool.request().input("studentId", sql.Int, studentId)
      .query("SELECT MAX(CreatedAt) AS LastActive FROM [mk].[StudentQuestionResults] WHERE StudentId = @studentId");
    const lastActive = inactiveResult.recordset[0]?.LastActive;
    const daysSinceActive = lastActive ? Math.floor((now - new Date(lastActive)) / 86400000) : 999;
    if (daysSinceActive >= 3) {
      alerts.push({
        type: "INACTIVE", icon: "⏰",
        title: daysSinceActive >= 999 ? "Con chưa bắt đầu học" : `Con chưa học ${daysSinceActive} ngày liên tiếp`,
        detail: daysSinceActive >= 999 ? "Hãy khuyến khích con làm bài kiểm tra đầu vào để bắt đầu lộ trình học." : `Con chưa đăng nhập học từ ${new Date(lastActive).toLocaleDateString("vi-VN")}.`,
      });
    }
    const weakResult = await pool.request().input("studentId", sql.Int, studentId).query(`
      SELECT TOP 3 t.Name AS TopicName,
             CAST(AVG(CAST(r.IsCorrect AS FLOAT))*100 AS DECIMAL(5,1)) AS CorrectRate, COUNT(*) AS Total
      FROM [mk].[StudentQuestionResults] r
      INNER JOIN [mk].[Questions] q ON q.QuestionId = r.QuestionId
      INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
      WHERE r.StudentId = @studentId AND r.CreatedAt >= DATEADD(day,-7,SYSUTCDATETIME())
      GROUP BY t.TopicId, t.Name HAVING COUNT(*) >= 5 AND AVG(CAST(r.IsCorrect AS FLOAT)) < 0.5
      ORDER BY CorrectRate ASC`);
    for (const topic of weakResult.recordset) {
      alerts.push({ type: "WEAK_TOPIC", icon: "📉", title: `Con hay sai phần "${topic.TopicName}"`, detail: `Tỷ lệ đúng chỉ đạt ${topic.CorrectRate}% trong tuần qua (${topic.Total} câu).` });
    }
    const reviewResult = await pool.request().input("studentId", sql.Int, studentId).query(`
      SELECT TOP 1 Score FROM [mk].[WeeklyAssessmentAttempt]
      WHERE StudentId=@studentId AND SubmittedAt IS NOT NULL AND Score < 60 ORDER BY WeekStart DESC`);
    if (reviewResult.recordset[0]) {
      alerts.push({ type: "NEEDS_REVIEW", icon: "📚", title: "Con cần ôn lại kiến thức", detail: `Điểm kiểm tra tuần gần nhất chỉ đạt ${reviewResult.recordset[0].Score}/100. Hãy khuyến khích con ôn lại bài cũ.` });
    }
    return response.json({ alerts, unreadCount: alerts.length });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải cảnh báo học tập.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});

// ──────────────────────────────────────────────────────────
// PARENT — Gợi ý hỗ trợ (FR-15)
// ──────────────────────────────────────────────────────────
app.get("/api/parents/me/children/:studentId/recommendations", authenticate, requireParent, requireLinkedChild, async (request, response) => {
  const studentId = request.linkedStudentId;
  try {
    await ensureParentModuleSchema();
    const pool = await getPool();
    const recommendations = [];
    const weakResult = await pool.request().input("studentId", sql.Int, studentId).query(`
      SELECT TOP 3 t.Name AS TopicName, CAST(AVG(CAST(r.IsCorrect AS FLOAT))*100 AS DECIMAL(5,1)) AS CorrectRate
      FROM [mk].[StudentQuestionResults] r
      INNER JOIN [mk].[Questions] q ON q.QuestionId = r.QuestionId
      INNER JOIN [mk].[Topics] t ON t.TopicId = q.TopicId
      WHERE r.StudentId=@studentId AND r.CreatedAt >= DATEADD(day,-30,SYSUTCDATETIME())
      GROUP BY t.TopicId, t.Name HAVING COUNT(*) >= 3 ORDER BY CorrectRate ASC`);
    for (const topic of weakResult.recordset) {
      recommendations.push({ icon: "📝", title: `Luyện thêm phần "${topic.TopicName}"`, detail: `Dành 10–15 phút mỗi ngày luyện tập chủ đề này để cải thiện từ ${topic.CorrectRate}% lên trên 80%.`, source: "System" });
    }
    const activityResult = await pool.request().input("studentId", sql.Int, studentId).query(`
      SELECT COUNT(DISTINCT CAST(CreatedAt AS DATE)) AS ActiveDays
      FROM [mk].[StudentQuestionResults] WHERE StudentId=@studentId AND CreatedAt >= DATEADD(day,-7,SYSUTCDATETIME())`);
    const activeDays = Number(activityResult.recordset[0]?.ActiveDays || 0);
    if (activeDays < 3) {
      recommendations.push({ icon: "📅", title: "Khuyến khích con học đều đặn hơn", detail: `Con chỉ học ${activeDays} ngày trong tuần qua. Hãy đặt thời gian học cố định mỗi ngày khoảng 20–30 phút.`, source: "System" });
    }
    const scoreResult = await pool.request().input("studentId", sql.Int, studentId).query(`
      SELECT TOP 1 Score FROM [mk].[WeeklyAssessmentAttempt]
      WHERE StudentId=@studentId AND SubmittedAt IS NOT NULL ORDER BY WeekStart DESC`);
    const lastScore = scoreResult.recordset[0]?.Score;
    if (lastScore != null && lastScore < 60) {
      recommendations.push({ icon: "🔄", title: "Ôn lại kiến thức cơ bản", detail: "Điểm kiểm tra tuần còn thấp. Hãy cùng con xem lại phần bài học và làm lại các bài tập cơ bản.", source: "System" });
    }
    if (!recommendations.length) {
      recommendations.push({ icon: "🌟", title: "Con đang tiến bộ tốt!", detail: "Hãy tiếp tục khuyến khích con duy trì thói quen học tập mỗi ngày và thử sức với các thử thách khó hơn.", source: "System" });
    }
    return response.json({ recommendations });
  } catch (error) {
    return response.status(500).json({ message: "Không thể tải gợi ý hỗ trợ.", ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}) });
  }
});
app.use((_request, response) => response.status(404).json({ message: "Không tìm thấy API." }));
app.listen(port, () => {
  console.log(`MathKids API đang chạy tại http://localhost:${port}`);
  ensureDailyChallengeSchema().then(() => ensureLearningPathSchema()).then(() => ensureMonthlyAssessmentSchema()).then(() => ensureWeeklyAssessmentSchema()).then(() => ensureParentModuleSchema())
    .then(() => console.log("Đã sẵn sàng thử thách, phần thưởng, Question Bank, lộ trình học, bài kiểm tra tuần, tháng và module phụ huynh."))
    .catch((error) => console.error("Không thể chuẩn bị dữ liệu học tập:", error.message));
});
