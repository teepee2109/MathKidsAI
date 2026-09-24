import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuthToken, getCachedUser, resolveAvatarUrl, saveCachedUser } from "../authStorage";
import "./StudentDashboard.css";
import "./StudentDashboardHeader.css";
import "./StudentAssessmentInvite.css";
import "./StudentPremiumInvite.css";
import "./StudentDashboardLessons.css";

const lessonsByGrade = {
  1: [{ icon: "➕", title: "Cộng trừ quanh em", detail: "Phạm vi 20", color: "coral" }, { icon: "🔷", title: "Hình dạng vui nhộn", detail: "Nhận biết hình cơ bản", color: "violet" }, { icon: "📏", title: "Đo lường thật vui", detail: "Dài hơn, ngắn hơn", color: "mint" }],
  2: [{ icon: "🔢", title: "Cộng trừ siêu tốc", detail: "Đến 100", color: "coral" }, { icon: "✖️", title: "Khám phá bảng nhân", detail: "Bảng 2, 5 và 10", color: "violet" }, { icon: "🕒", title: "Đồng hồ tí hon", detail: "Xem giờ và ngày tháng", color: "mint" }],
  3: [{ icon: "🚀", title: "Nhân chia vũ trụ", detail: "Bảng nhân và phép chia", color: "coral" }, { icon: "📐", title: "Khu vườn hình học", detail: "Chu vi và diện tích", color: "violet" }, { icon: "🍕", title: "Bánh pizza phân số", detail: "Làm quen với phân số", color: "mint" }],
  4: [{ icon: "🍰", title: "Vương quốc phân số", detail: "Cộng phân số cùng mẫu", color: "coral" }, { icon: "🔢", title: "Số tự nhiên kỳ thú", detail: "Ước và bội", color: "violet" }, { icon: "📐", title: "Nhà thám hiểm hình học", detail: "Diện tích và góc", color: "mint" }],
  5: [{ icon: "🔟", title: "Phòng thí nghiệm thập phân", detail: "Cộng trừ số thập phân", color: "coral" }, { icon: "%", title: "Bí mật phần trăm", detail: "Tỉ số phần trăm", color: "violet" }, { icon: "🧠", title: "Toán có lời văn", detail: "Suy luận và vận dụng", color: "mint" }],
};

const dailyChallenges = {
  1: { prompt: "8 + 7 = ?", options: [15, 14, 16], answer: 15 },
  2: { prompt: "36 − 18 = ?", options: [18, 16, 20], answer: 18 },
  3: { prompt: "6 × 4 = ?", options: [24, 20, 28], answer: 24 },
  4: { prompt: "1/2 + 1/4 = ?", options: ["3/4", "2/6", "1/6"], answer: "3/4" },
  5: { prompt: "25% của 80 là ?", options: [20, 25, 15], answer: 20 },
};

export default function StudentDashboard({ onLogout }) {
  const [student, setStudent] = useState(getCachedUser);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const grade = Math.min(5, Math.max(1, Number(student?.grade) || 1));
  const learningCards = lessonsByGrade[grade];
  const dailyChallenge = dailyChallenges[grade];
  const [challengeAnswer, setChallengeAnswer] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };
      const [response, premiumResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || "/api"}/students/me/dashboard`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || "/api"}/payments/premium/status`, { cache: "no-store", headers }),
      ]);
      const data = await response.json().catch(() => ({}));
      const premiumData = await premiumResponse.json().catch(() => ({}));
      if (response.status === 401 || premiumResponse.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok) {
        if (getCachedUser()) {
          setError("");
          return;
        }
        throw new Error(data.message || data.detail || "Không thể tải dữ liệu học sinh.");
      }
      const cached = getCachedUser() || {};
      const isPremium = premiumResponse.ok ? Boolean(premiumData.isPremium) : Boolean(cached.isPremium);
      const premiumExpiresAt = premiumResponse.ok ? premiumData.subscription?.expiresAt || "" : cached.premiumExpiresAt || "";
      setStudent({ ...data.student, isPremium, premiumExpiresAt });
      setAvatarBroken(false);
      saveCachedUser({ ...data.student, isPremium, premiumExpiresAt });
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
      <nav aria-label="Điều hướng học sinh"><a className="selected" href="#dashboard">⌂ <span>Tổng quan</span></a><a href="#lessons">▣ <span>Bài học</span></a><Link to="/tro-choi">🎮 <span>Trò chơi</span></Link><a href="#challenge">♜ <span>Thử thách</span></a></nav>
      <div className="dashboard-account"><Link to="/ho-so" className="dashboard-profile-link" style={{ color: "inherit", textDecoration: "none" }}><span className="dashboard-avatar">{student?.avatarUrl && !avatarBroken ? <img src={resolveAvatarUrl(student.avatarUrl)} alt="" onError={() => setAvatarBroken(true)} /> : "👦"}</span><span className="account-name">{student?.name || "Học sinh"}</span></Link><button onClick={onLogout}>Đăng xuất</button></div>
    </header>

    <div className="dashboard-content" id="dashboard">
      <section className="welcome-banner">
        <div className="welcome-copy"><span className="welcome-tag">✦ KHU VỰC HỌC TẬP CỦA BẠN</span><h1>Chào {student?.name?.split(" ").at(-1) || "bạn nhỏ"}! 👋</h1><p>Sẵn sàng khám phá thêm điều mới hôm nay chưa?</p><Link to="/tro-choi" className="welcome-cta">Chơi toán ngay <span>→</span></Link></div>
        <div className="welcome-art" aria-hidden="true"><span className="welcome-sun">☀</span><span className="welcome-mascot">🦊</span><span className="welcome-book">1&nbsp; 2&nbsp; 3</span></div>
      </section>

      {error && <div className="dashboard-error" role="alert"><span>{error}</span><button onClick={retryDashboard}>Thử lại</button></div>}

      <section className="student-stats" aria-label="Thành tích học tập">
        <article className="stat-card xp-stat"><span className="stat-emoji">⚡</span><div><small>Tổng kinh nghiệm</small><strong>{loading ? "…" : (student?.totalXp ?? 0)} <i>XP</i></strong><span className="stat-foot">Mỗi bài học giúp bạn tiến bộ!</span></div></article>
        <article className="stat-card star-stat"><span className="stat-emoji">⭐</span><div><small>Ngôi sao đã nhận</small><strong>{loading ? "…" : (student?.totalStars ?? 0)}</strong><span className="stat-foot">Cố lên để nhận thêm nhé!</span></div></article>
        <article className="stat-card lesson-stat"><span className="stat-emoji">📚</span><div><small>Bài học hoàn thành</small><strong>{loading ? "…" : (student?.completedLessons ?? 0)}</strong><span className="stat-foot">Lớp {student?.grade || 1} · Chặng đường của bạn</span></div></article>
        <Link className="stat-card test-stat" to="/danh-gia" style={{ textDecoration: "none" }}><span className="stat-emoji">🎯</span><div><small>Bài đánh giá hoàn thành</small><strong>{loading ? "…" : (student?.completedAssessments ?? 0)}</strong><span className="stat-foot">{student?.completedAssessments ? "Xem lịch sử bài đánh giá →" : "Khám phá điểm mạnh của bạn →"}</span></div></Link>
      </section>

      <Link to="/danh-gia" className="assessment-invite"><span>🧠</span><div><strong>{student?.completedAssessments ? "Xem bản đồ kỹ năng & lộ trình học" : "Khám phá điểm mạnh toán học của bạn"}</strong><small>Bài đánh giá vui 10 câu, giúp chọn nội dung luyện tập phù hợp với lớp {student?.grade || 1}.</small></div><b> {student?.completedAssessments ? "Xem kết quả" : "Bắt đầu"} →</b></Link>

      {student?.isPremium ? <section className="premium-active-card"><span className="premium-invite-crown">👑</span><div><small>PREMIUM ĐANG HOẠT ĐỘNG</small><strong>Toàn bộ hành trình học đã được mở khóa</strong><p>Lộ trình AI, bài luyện tập nâng cao và theo dõi tiến bộ đang sẵn sàng cho bạn.</p></div><span className="premium-active-date">Đến {student.premiumExpiresAt ? new Date(student.premiumExpiresAt).toLocaleDateString("vi-VN") : "đang hoạt động"}</span></section> : <Link to="/premium" className="premium-invite"><span className="premium-invite-crown">👑</span><div><small>MATHKIDS PREMIUM</small><strong>Mở khóa lộ trình học riêng cho bạn</strong><p>AI gợi ý bài học theo điểm mạnh, điểm cần luyện và mục tiêu từng ngày.</p></div><span className="premium-invite-button">Đăng ký Premium <b>→</b></span></Link>}

      {student?.isPremium && <section className="premium-tools"><div className="panel-heading"><div><span className="panel-kicker">ĐẶC QUYỀN PREMIUM</span><h2>Công cụ dành riêng cho bạn</h2></div><span className="premium-open-label">ĐÃ MỞ KHÓA ✓</span></div><div className="premium-tools-grid"><Link to="/danh-gia"><span>🧭</span><strong>Lộ trình AI</strong><small>Xem kế hoạch học cá nhân</small></Link><Link to="/tro-choi"><span>🚀</span><strong>Luyện tập nâng cao</strong><small>Ôn đúng phần cần cải thiện</small></Link><Link to="/danh-gia"><span>📈</span><strong>Theo dõi tiến bộ</strong><small>Cập nhật bản đồ kỹ năng</small></Link></div></section>}

      <div className="dashboard-columns">
        <section className="learning-panel" id="lessons"><div className="panel-heading"><div><span className="panel-kicker">HỌC TẬP · LỚP {grade}</span><h2>Tiếp tục hành trình</h2></div><Link to={`/tro-choi/${grade}`}>Xem tất cả <span>→</span></Link></div><div className="learning-list">{learningCards.map((card, index) => <Link className="learning-card" to={`/tro-choi/${grade}`} key={card.title}><span className={`learning-icon ${card.color}`}>{card.icon}</span><span className="learning-info"><small>CHẶNG {index + 1}</small><strong>{card.title}</strong><span>{card.detail}</span></span><span className="learning-arrow">→</span></Link>)}</div></section>
        <aside className="daily-panel" id="challenge"><div className="daily-top"><span>☀</span><small>THỬ THÁCH HÔM NAY · LỚP {grade}</small></div><h2>Khởi động trí não!</h2><p>Giải câu đố nhanh để luyện tư duy và nhận thêm XP.</p><div className="daily-question"><span>{dailyChallenge.prompt}</span><div>{dailyChallenge.options.map((option) => <button className={`daily-answer ${challengeAnswer !== null ? option === dailyChallenge.answer ? "is-correct" : option === challengeAnswer ? "is-wrong" : "is-muted" : ""}`} key={option} onClick={() => setChallengeAnswer(option)} disabled={challengeAnswer !== null}>{option}</button>)}</div></div><button onClick={() => setChallengeAnswer(null)} disabled={challengeAnswer === null}>{challengeAnswer === null ? "Chọn đáp án" : challengeAnswer === dailyChallenge.answer ? "Chính xác! Thử lại" : "Chưa đúng · Thử lại"} <span>→</span></button></aside>
      </div>

      <footer className="dashboard-footer"><span>🌱</span><strong>Mỗi ngày một chút tiến bộ!</strong><span>MathKids luôn đồng hành cùng bạn.</span></footer>
    </div>
  </main>;
}
