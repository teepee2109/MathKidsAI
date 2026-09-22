import express from "express";
import cors from "cors";
import "dotenv/config";
import { getPool, sql } from "./db.js";
import { authenticate, loginUser, registerUser, validateCredentials } from "./auth.js";

const app = express();
const port = Number(process.env.PORT || 4000);
app.use(cors({ origin: process.env.NODE_ENV === "production" ? (process.env.FRONTEND_ORIGIN || "http://localhost:5173") : true }));
app.use(express.json({ limit: "1mb" }));

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

app.use((_request, response) => response.status(404).json({ message: "Không tìm thấy API." }));
app.listen(port, () => console.log(`MathKids API đang chạy tại http://localhost:${port}`));
