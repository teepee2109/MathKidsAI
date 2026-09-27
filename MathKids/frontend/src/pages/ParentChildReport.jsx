import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getCachedUser } from "../authStorage";
import { getChildReport } from "../services/parentService";
import "./ParentDashboard.css";
import "./ParentChildReport.css";

export default function ParentChildReport({ onLogout }) {
  const { studentId } = useParams();
  const parent = getCachedUser();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getChildReport(Number(studentId))
      .then((data) => setReport(data.report))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [studentId]);

  return (
    <main className="parent-shell">
      <aside className="parent-sidebar">
        <BrandLogo className="parent-brand" to="/parent/dashboard" />
        <div className="parent-nav-label">PHỤ HUYNH</div>
        <Link className="parent-nav-item" to="/parent/dashboard"><span>🏠</span> Tổng quan</Link>
        <Link className="parent-nav-item" to="/parent/link-child"><span>🔗</span> Liên kết con</Link>
        <Link className="parent-nav-item" to="/lien-he"><span>🎧</span> Hỗ trợ & Liên hệ</Link>
        <div className="parent-sidebar-bottom">
          <span>👨‍👩‍👧</span>
          <div><strong>Khu vực phụ huynh</strong><small>Theo dõi việc học của con</small></div>
        </div>
      </aside>

      <section className="parent-main">
        <header className="parent-topbar">
          <div><span className="parent-breadcrumb">MathKids / Phụ huynh /</span> Báo cáo học tập</div>
          <div className="parent-user">
            <span>👤</span>
            <span>{parent?.name}<small>Parent</small></span>
            <button onClick={onLogout}>Đăng xuất</button>
          </div>
        </header>

        <div className="parent-content">
          <Link to="/parent/dashboard" className="back-link">← Quay lại</Link>

          {loading && <div className="parent-loading">Đang tải báo cáo...</div>}
          {error && <div className="parent-error" role="alert">{error}</div>}

          {report && (
            <>
              {/* Header học sinh */}
              <div className="report-header">
                <div className="report-avatar">{report.name?.[0] || "🎒"}</div>
                <div className="report-info">
                  <h1>{report.name}</h1>
                  <span className="report-grade">Lớp {report.grade} &nbsp;·&nbsp; ⭐ {report.totalXp} XP &nbsp;·&nbsp; 🌟 {report.totalStars} sao</span>
                </div>
                <div className="report-nav">
                  <Link to={`/parent/children/${studentId}/alerts`} className="btn-alerts">🔔 Cảnh báo</Link>
                  <Link to={`/parent/children/${studentId}/recommendations`} className="btn-recs">💡 Gợi ý</Link>
                </div>
              </div>

              {/* Số liệu tổng quan */}
              <div className="report-metrics">
                {[
                  ["📚", "Bài học hoàn thành", `${report.summary.lessonsCompleted} / ${report.summary.totalLessons}`],
                  ["❓", "Câu hỏi đã làm", report.summary.questionsAnswered],
                  ["✅", "Tỷ lệ đúng", `${report.summary.correctRate}%`],
                  ["📅", "Ngày học tuần này", `${report.summary.studyDaysThisWeek} / 7`],
                  ["🗓️", "Ngày học tháng này", `${report.summary.studyDaysThisMonth} / 30`],
                ].map(([icon, label, value]) => (
                  <div className="report-metric" key={label}>
                    <span className="metric-icon">{icon}</span>
                    <div>
                      <small>{label}</small>
                      <strong>{value}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chủ đề mạnh / yếu */}
              <div className="report-two-col">
                <div className="report-box">
                  <h3>📉 Cần cải thiện</h3>
                  {report.weakTopics.length === 0
                    ? <p className="no-data">Không có chủ đề yếu 🎉</p>
                    : report.weakTopics.map((t) => (
                      <div className="topic-row" key={t.topicName}>
                        <span>{t.topicName}</span>
                        <span className="topic-rate weak-rate">{t.correctRate}%</span>
                      </div>
                    ))}
                </div>
                <div className="report-box">
                  <h3>📈 Làm tốt</h3>
                  {report.strongTopics.length === 0
                    ? <p className="no-data">Chưa có đủ dữ liệu</p>
                    : report.strongTopics.map((t) => (
                      <div className="topic-row" key={t.topicName}>
                        <span>{t.topicName}</span>
                        <span className="topic-rate strong-rate">{t.correctRate}%</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Kết quả kiểm tra */}
              <div className="report-box">
                <h3>🏆 Kết quả kiểm tra</h3>
                <div className="assess-row">
                  {[
                    ["Kiểm tra đầu vào", report.assessments.placement],
                    ["Kiểm tra tuần gần nhất", report.assessments.lastWeekly],
                    ["Kiểm tra tháng gần nhất", report.assessments.lastMonthly],
                  ].map(([label, data]) => (
                    <div className="assess-card" key={label}>
                      <small>{label}</small>
                      <strong>{data.score != null ? `${data.score} / 100` : "Chưa làm"}</strong>
                      {data.completedAt && (
                        <span>{new Date(data.completedAt).toLocaleDateString("vi-VN")}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
