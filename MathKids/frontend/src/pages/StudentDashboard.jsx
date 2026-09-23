import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuthToken, getCachedUser, resolveAvatarUrl, saveCachedUser } from "../authStorage";
import "./StudentDashboard.css";
import "./StudentDashboardHeader.css";

const learningCards = [
  { icon: "➕", title: "Phép cộng vui", detail: "Luyện tập phép cộng", color: "coral", href: "#lessons" },
  { icon: "🔢", title: "Bí mật phép nhân", detail: "Khám phá bảng nhân", color: "violet", href: "#lessons" },
  { icon: "🧩", title: "Thử tài tư duy", detail: "Câu đố logic mỗi ngày", color: "mint", href: "#challenge" },
];

export default function StudentDashboard({ onLogout }) {
  const [student, setStudent] = useState(getCachedUser);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/students/me/dashboard`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok) throw new Error(data.message || data.detail || "Không thể tải dữ liệu học sinh.");
      setStudent(data.student);
      setAvatarBroken(false);
      saveCachedUser(data.student);
    } catch (loadError) {
      setError(loadError.message || "Không thể kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  function retryDashboard() {
    setError("");
    setLoading(true);
    loadDashboard();
  }

  return <main className="student-dashboard">
    <header className="dashboard-header">
      <Link className="dashboard-brand" to="/dashboard"><span>★</span> Math<span>Kids</span></Link>
      <nav aria-label="Điều hướng học sinh"><a className="selected" href="#dashboard">⌂ <span>Tổng quan</span></a><a href="#lessons">▣ <span>Bài học</span></a><a href="#challenge">♜ <span>Thử thách</span></a></nav>
      <div className="dashboard-account"><Link to="/ho-so" className="dashboard-profile-link" style={{ color: "inherit", textDecoration: "none" }}><span className="dashboard-avatar">{student?.avatarUrl && !avatarBroken ? <img src={resolveAvatarUrl(student.avatarUrl)} alt="" onError={() => setAvatarBroken(true)} /> : "👦"}</span><span className="account-name">{student?.name || "Học sinh"}</span></Link><button onClick={onLogout}>Đăng xuất</button></div>
    </header>

    <div className="dashboard-content" id="dashboard">
      <section className="welcome-banner">
        <div className="welcome-copy"><span className="welcome-tag">✦ KHU VỰC HỌC TẬP CỦA BẠN</span><h1>Chào {student?.name?.split(" ").at(-1) || "bạn nhỏ"}! 👋</h1><p>Sẵn sàng khám phá thêm điều mới hôm nay chưa?</p><a href="#lessons" className="welcome-cta">Tiếp tục học <span>→</span></a></div>
        <div className="welcome-art" aria-hidden="true"><span className="welcome-sun">☀</span><span className="welcome-mascot">🦊</span><span className="welcome-book">1&nbsp; 2&nbsp; 3</span></div>
      </section>

      {error && <div className="dashboard-error" role="alert"><span>{error}</span><button onClick={retryDashboard}>Thử lại</button></div>}

      <section className="student-stats" aria-label="Thành tích học tập">
        <article className="stat-card xp-stat"><span className="stat-emoji">⚡</span><div><small>Tổng kinh nghiệm</small><strong>{loading ? "…" : (student?.totalXp ?? 0)} <i>XP</i></strong><span className="stat-foot">Mỗi bài học giúp bạn tiến bộ!</span></div></article>
        <article className="stat-card star-stat"><span className="stat-emoji">⭐</span><div><small>Ngôi sao đã nhận</small><strong>{loading ? "…" : (student?.totalStars ?? 0)}</strong><span className="stat-foot">Cố lên để nhận thêm nhé!</span></div></article>
        <article className="stat-card lesson-stat"><span className="stat-emoji">📚</span><div><small>Bài học hoàn thành</small><strong>{loading ? "…" : (student?.completedLessons ?? 0)}</strong><span className="stat-foot">Lớp {student?.grade || 1} · Chặng đường của bạn</span></div></article>
        <article className="stat-card test-stat"><span className="stat-emoji">🎯</span><div><small>Bài đánh giá hoàn thành</small><strong>{loading ? "…" : (student?.completedAssessments ?? 0)}</strong><span className="stat-foot">Mỗi ngày giỏi hơn một chút</span></div></article>
      </section>

      <div className="dashboard-columns">
        <section className="learning-panel" id="lessons"><div className="panel-heading"><div><span className="panel-kicker">HỌC TẬP</span><h2>Tiếp tục hành trình</h2></div><a href="#lessons">Xem tất cả <span>→</span></a></div><div className="learning-list">{learningCards.map((card, index) => <a className="learning-card" href={card.href} key={card.title}><span className={`learning-icon ${card.color}`}>{card.icon}</span><span className="learning-info"><small>CHẶNG {index + 1}</small><strong>{card.title}</strong><span>{card.detail}</span></span><span className="learning-arrow">→</span></a>)}</div></section>
        <aside className="daily-panel" id="challenge"><div className="daily-top"><span>☀</span><small>THỬ THÁCH HÔM NAY</small></div><h2>Khởi động trí não!</h2><p>Giải câu đố nhanh để luyện tư duy và nhận thêm XP.</p><div className="daily-question"><span>12 + 9 = ?</span><div><i>21</i><i>19</i><i>23</i></div></div><button onClick={() => window.alert("Thử thách sẽ sớm mở khóa!")}>Bắt đầu thử thách <span>→</span></button></aside>
      </div>

      <footer className="dashboard-footer"><span>🌱</span><strong>Mỗi ngày một chút tiến bộ!</strong><span>MathKids luôn đồng hành cùng bạn.</span></footer>
    </div>
  </main>;
}
