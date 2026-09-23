import express from "express";
import cors from "cors";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { getPool, sql } from "./db.js";
import { authenticate, loginUser, registerUser, validateCredentials } from "./auth.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const uploadsDirectory = fileURLToPath(new URL("./uploads/", import.meta.url));
app.use(cors({ origin: process.env.NODE_ENV === "production" ? (process.env.FRONTEND_ORIGIN || "http://localhost:5173") : true }));
app.use(express.json({ limit: "7mb" }));
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
