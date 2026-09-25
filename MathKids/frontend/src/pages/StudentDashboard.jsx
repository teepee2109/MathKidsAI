import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getAuthToken, getCachedUser, resolveAvatarUrl, saveCachedUser } from "../authStorage";
import { apiFetch, apiUrl } from "../api";
import { getLearningPath } from "../services/learning";
import "./StudentDashboard.css";
import "./StudentDashboardHeader.css";
import "./StudentAssessmentInvite.css";
import "./StudentMonthlyAssessmentInvite.css";
import "./StudentWeeklyAssessmentInvite.css";
import "./StudentLeaderboard.css";
import "./StudentPremiumInvite.css";
import "./StudentDashboardLessons.css";
import "./StudentDailyChallenge.css";

const badgeMilestones = [
  { name: "Bước đầu tiên", icon: "🌱", xp: 50 },
  { name: "Nhà khám phá", icon: "🧭", xp: 150 },
  { name: "Siêu sao Toán", icon: "🌟", xp: 500 },
  { name: "Huyền thoại Toán", icon: "🏆", xp: 1000 },
];

function vietnamDayKey(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function secondsUntilVietnamMidnight(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const nextMidnightUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1) - 7 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((nextMidnightUtc - now.getTime()) / 1000));
}

export default function StudentDashboard({ onLogout }) {
  const [student, setStudent] = useState(getCachedUser);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leaderboard, setLeaderboard] = useState(null);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [learningPath, setLearningPath] = useState(null);
  const [learningError, setLearningError] = useState("");
  const grade = Math.min(5, Math.max(1, Number(student?.grade) || 1));
  const totalXp = Number(student?.totalXp || 0);
  const currentLevel = Math.floor(totalXp / 100) + 1;
  const levelProgress = totalXp % 100;
  const equippedReward = student?.equippedReward || "";
  const learningCards = learningPath?.lessons
    ? [...learningPath.lessons].sort((a, b) => {
      if (a.lessonId === learningPath.recommendedLessonId) return -1;
      if (b.lessonId === learningPath.recommendedLessonId) return 1;
      return learningPath.lessons.findIndex((lesson) => lesson.lessonId === a.lessonId)
        - learningPath.lessons.findIndex((lesson) => lesson.lessonId === b.lessonId);
    })
    : [];
  const [challengeAnswer, setChallengeAnswer] = useState(null);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [challengeProgress, setChallengeProgress] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [challengeSubmitting, setChallengeSubmitting] = useState(false);
  const [challengeError, setChallengeError] = useState("");
  const [challengeFeedback, setChallengeFeedback] = useState("");
  const [untilNextChallenge, setUntilNextChallenge] = useState(() => secondsUntilVietnamMidnight());
  const reloadedChallengeDay = useRef(vietnamDayKey());

  const loadDashboard = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };
      const [response, premiumResponse] = await Promise.all([
        apiFetch("students/me/dashboard", { cache: "no-store", headers }),
        apiFetch("payments/premium/status", { cache: "no-store", headers }),
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
        throw new Error([data.message, data.detail].filter(Boolean).join(" — ") || "Không thể tải dữ liệu học sinh.");
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

  const loadLeaderboard = useCallback(async () => {
    try {
      const response = await apiFetch("students/me/leaderboard", {
        cache: "no-store", headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { onLogout(); return; }
      if (!response.ok) throw new Error(data.message || "Không thể tải bảng xếp hạng.");
      setLeaderboard(data);
      setLeaderboardError("");
    } catch (loadError) {
      setLeaderboardError(loadError.message || "Không thể tải bảng xếp hạng.");
    }
  }, [onLogout]);

  const loadDailyChallenge = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    setChallengeLoading(true);
    try {
      const response = await apiFetch("students/me/daily-challenge", {
        cache: "no-store", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok) throw new Error([data.message, data.detail].filter(Boolean).join(" — ") || "Không thể tải thử thách hôm nay.");
      setDailyChallenge(data.challenge);
      setChallengeProgress(data.progress);
      setChallengeAnswer(null);
      setChallengeFeedback(data.progress?.completed ? "Bạn đã hoàn thành thử thách hôm nay và nhận phần thưởng rồi!" : "");
      setChallengeError("");
    } catch (loadError) {
      setChallengeError(loadError.message || "Không thể tải thử thách hôm nay.");
    } finally {
      setChallengeLoading(false);
    }
  }, [onLogout, setChallengeAnswer, setChallengeFeedback]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const today = vietnamDayKey();
      setUntilNextChallenge(secondsUntilVietnamMidnight());
      if (today !== reloadedChallengeDay.current) {
        reloadedChallengeDay.current = today;
        loadDailyChallenge();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loadDailyChallenge]);

  const loadLearningPath = useCallback(async () => {
    try {
      const data = await getLearningPath();
      setLearningPath(data);
      setLearningError("");
    } catch (loadError) {
      setLearningError(loadError.message || "Không thể tải lộ trình học.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadDailyChallenge(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDailyChallenge]);

  useEffect(() => {
    const timer = window.setTimeout(loadLearningPath, 0);
    return () => window.clearTimeout(timer);
  }, [loadLearningPath]);

  async function submitDailyChallenge() {
    if (!challengeAnswer || challengeSubmitting || challengeProgress?.completed) return;
    setChallengeSubmitting(true);
    setChallengeFeedback("");
    try {
      const response = await fetch(apiUrl("students/me/daily-challenge/answer"), {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ answer: challengeAnswer }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        onLogout();
        return;
      }
      if (!response.ok) throw new Error(data.message || "Không thể lưu kết quả thử thách.");
      setChallengeProgress((current) => ({
        ...(current || {}), attempts: data.attempts ?? current?.attempts ?? 0,
        completed: Boolean(data.rewardClaimed ?? data.completed ?? current?.completed), rewardXp: data.rewardXp ?? 0,
        rewardStars: data.rewardStars ?? 0,
      }));
      setChallengeFeedback(data.message || (data.correct ? "Chính xác!" : "Chưa đúng, thử lại nhé!"));
      if (data.correct) {
        if (data.alreadyCompleted) {
          await loadDashboard();
        } else {
          setStudent((current) => {
            const next = {
              ...(current || getCachedUser() || {}),
              totalXp: Number(current?.totalXp || 0) + Number(data.rewardXp || 0),
              totalStars: Number(current?.totalStars || 0) + Number(data.rewardStars || 0),
            };
            saveCachedUser(next);
            return next;
          });
        }
      } else {
        setChallengeAnswer(null);
      }
    } catch (submitError) {
      setChallengeFeedback(submitError.message || "Không thể gửi đáp án.");
    } finally {
      setChallengeSubmitting(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  useEffect(() => {
    const timer = window.setTimeout(loadLeaderboard, 0);
    return () => window.clearTimeout(timer);
  }, [loadLeaderboard]);

  useEffect(() => {
    if (student?.isPremium) return undefined;
    let active = true;
    const refreshPremium = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(apiUrl("payments/premium/status"), {
          cache: "no-store",
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        const nextPremium = Boolean(data.isPremium);
        const expiresAt = data.subscription?.expiresAt || "";
        setStudent((current) => {
          const next = { ...(current || getCachedUser() || {}), isPremium: nextPremium, premiumExpiresAt: expiresAt };
          saveCachedUser(next);
          return next;
        });
      } catch {
        // Keep the current dashboard state and retry on the next interval.
      }
    };
    const interval = window.setInterval(refreshPremium, 4000);
    const onVisible = () => refreshPremium();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [student?.isPremium]);

  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") {
        loadDashboard();
        loadDailyChallenge();
        loadLeaderboard();
      }
    };
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [loadDashboard, loadDailyChallenge, loadLeaderboard]);

  function retryDashboard() {
    setError("");
    setLoading(true);
    loadDashboard();
  }

  return <main className={`student-dashboard ${equippedReward === "space-theme" ? "reward-theme-space" : ""}`}>
    <header className="dashboard-header">
      <BrandLogo className="dashboard-brand" to="/dashboard" />
      <nav aria-label="Điều hướng học sinh"><a className="selected" href="#dashboard">⌂ <span>Tổng quan</span></a><Link to="/hoc-tap">▣ <span>Học tập</span></Link><Link to="/tro-choi">🎮 <span>Trò chơi</span></Link><a href="#challenge">♜ <span>Thử thách</span></a></nav>
      <div className="dashboard-account"><Link to="/ho-so" className="dashboard-profile-link" style={{ color: "inherit", textDecoration: "none" }}><span className={`dashboard-avatar ${equippedReward === "rainbow-frame" ? "reward-frame-rainbow" : ""}`}>{student?.avatarUrl && !avatarBroken ? <img src={resolveAvatarUrl(student.avatarUrl)} alt="" onError={() => setAvatarBroken(true)} /> : "👦"}</span><span className="account-name">{student?.name || "Học sinh"}</span></Link><button onClick={onLogout}>Đăng xuất</button></div>
    </header>

    <div className="dashboard-content" id="dashboard">
      <section className="welcome-banner">
        <div className="welcome-copy"><span className="welcome-tag">✦ KHU VỰC HỌC TẬP CỦA BẠN</span><h1>Chào {student?.name?.split(" ").at(-1) || "bạn nhỏ"}! 👋 {equippedReward === "fox-companion" && <span className="equipped-companion" title="Cáo đồng hành">🦊</span>}</h1><p>Sẵn sàng khám phá thêm điều mới hôm nay chưa?</p><Link to="/hoc-tap" className="welcome-cta">Tiếp tục học <span>→</span></Link></div>
        <div className="welcome-art" aria-hidden="true"><span className="welcome-sun">☀</span><span className="welcome-mascot">🦊</span><span className="welcome-book">1&nbsp; 2&nbsp; 3</span></div>
      </section>

      {error && <div className="dashboard-error" role="alert"><span>{error}</span><button onClick={retryDashboard}>Thử lại</button></div>}

      <section className="student-stats" aria-label="Thành tích học tập">
        <article className="stat-card xp-stat"><span className="stat-emoji">⚡</span><div><small>Cấp độ {currentLevel} · {totalXp} XP</small><strong>{loading ? "…" : `${levelProgress}/100`} <i>XP tới cấp sau</i></strong><span className="xp-progress-track"><span style={{ width: `${levelProgress}%` }} /></span></div></article>
        <Link className="stat-card star-stat reward-wallet-card" to="/phan-thuong"><span className="stat-emoji">⭐</span><div><small>Sao có thể đổi</small><strong>{loading ? "…" : (student?.totalStars ?? 0)}</strong><span className="stat-foot">Mở cửa hàng phần thưởng →</span></div></Link>
        <article className="stat-card lesson-stat"><span className="stat-emoji">📚</span><div><small>Bài học hoàn thành</small><strong>{loading ? "…" : (student?.completedLessons ?? 0)}</strong><span className="stat-foot">Lớp {student?.grade || 1} · Chặng đường của bạn</span></div></article>
        <Link className="stat-card test-stat" to="/danh-gia" style={{ textDecoration: "none" }}><span className="stat-emoji">🎯</span><div><small>Bài đánh giá hoàn thành</small><strong>{loading ? "…" : (student?.completedAssessments ?? 0)}</strong><span className="stat-foot">{student?.completedAssessments ? "Xem lịch sử bài đánh giá →" : "Khám phá điểm mạnh của bạn →"}</span></div></Link>
      </section>

      <section className="leaderboard-panel" aria-label="Top 3 học sinh trong lớp">
        <div className="leaderboard-heading"><div><span className="panel-kicker">THI ĐUA LÀNH MẠNH · LỚP {leaderboard?.grade || grade}</span><h2>Top 3 học sinh</h2></div><button type="button" onClick={loadLeaderboard}>↻ Cập nhật</button></div>
        {leaderboardError ? <div className="leaderboard-empty" role="status">{leaderboardError}<button type="button" onClick={loadLeaderboard}>Thử lại</button></div>
          : leaderboard?.topStudents?.length ? <ol className="leaderboard-list">{leaderboard.topStudents.slice(0, 3).map((item) => <li key={item.rank} className={`leaderboard-row leaderboard-rank-${item.rank}`}>
            <span className="leaderboard-medal" aria-label={`Hạng ${item.rank}`}>{["🥇", "🥈", "🥉"][item.rank - 1]}</span><span className="leaderboard-student"><strong>{item.name || "Học sinh MathKids"}</strong><small>Lớp {item.grade} · {item.totalStars} ⭐</small></span><b>{item.totalXp} XP</b>
          </li>)}</ol> : <div className="leaderboard-empty">Chưa có dữ liệu xếp hạng trong lớp này.</div>}
      </section>

      <Link to="/phan-thuong" className="rewards-invite"><span className="rewards-invite-icon">🎁</span><span className="rewards-invite-copy"><strong>Phần thưởng của bạn</strong><small>{badgeMilestones.filter((badge) => totalXp >= badge.xp).length} huy hiệu · Cấp {currentLevel} · {levelProgress}/100 XP tới cấp tiếp theo</small><span className="rewards-badge-preview">{badgeMilestones.map((badge) => <i className={totalXp >= badge.xp ? "is-unlocked" : ""} key={badge.name} title={`${badge.name} · ${badge.xp} XP`}>{badge.icon}</i>)}</span></span><b>Đổi sao & xem huy hiệu →</b></Link>

      <Link to="/danh-gia" className="assessment-invite"><span>🧠</span><div><strong>{student?.completedAssessments ? "Xem bản đồ kỹ năng & lộ trình học" : "Khám phá điểm mạnh toán học của bạn"}</strong><small>Bài đánh giá vui 10 câu, giúp chọn nội dung luyện tập phù hợp với lớp {student?.grade || 1}.</small></div><b> {student?.completedAssessments ? "Xem kết quả" : "Bắt đầu"} →</b></Link>

      <Link to="/danh-gia-tuan" className="weekly-assessment-invite"><span>📈</span><div><strong>Kiểm tra năng lực tuần</strong><small>Đánh giá 10 câu để điều chỉnh độ khó bài luyện tập tuần tới.</small></div><b>Kiểm tra tuần này →</b></Link>

      <Link to="/kiem-tra-thang" className="monthly-assessment-invite"><span>🗓️</span><div><strong>Bài kiểm tra tháng</strong><small>Ôn tập kiến thức lớp {student?.grade || 1}, xem lại đáp án và nhận XP, sao.</small></div><b>Làm bài tháng này →</b></Link>

      {student?.isPremium ? <section className="premium-active-card"><span className="premium-invite-crown">👑</span><div><small>PREMIUM ĐANG HOẠT ĐỘNG</small><strong>Toàn bộ hành trình học đã được mở khóa</strong><p>Lộ trình AI, bài luyện tập nâng cao và theo dõi tiến bộ đang sẵn sàng cho bạn.</p></div><span className="premium-active-date">Đến {student.premiumExpiresAt ? new Date(student.premiumExpiresAt).toLocaleDateString("vi-VN") : "đang hoạt động"}</span></section> : <Link to="/premium" className="premium-invite"><span className="premium-invite-crown">👑</span><div><small>MATHKIDS PREMIUM</small><strong>Mở khóa lộ trình học riêng cho bạn</strong><p>AI gợi ý bài học theo điểm mạnh, điểm cần luyện và mục tiêu từng ngày.</p></div><span className="premium-invite-button">Đăng ký Premium <b>→</b></span></Link>}

      {student?.isPremium && <section className="premium-tools"><div className="panel-heading"><div><span className="panel-kicker">ĐẶC QUYỀN PREMIUM</span><h2>Công cụ dành riêng cho bạn</h2></div><span className="premium-open-label">ĐÃ MỞ KHÓA ✓</span></div><div className="premium-tools-grid"><Link to="/danh-gia"><span>🧭</span><strong>Lộ trình AI</strong><small>Xem kế hoạch học cá nhân</small></Link><Link to="/tro-choi"><span>🚀</span><strong>Luyện tập nâng cao</strong><small>Ôn đúng phần cần cải thiện</small></Link><Link to="/danh-gia"><span>📈</span><strong>Theo dõi tiến bộ</strong><small>Cập nhật bản đồ kỹ năng</small></Link></div></section>}

      <div className="dashboard-columns">
        <section className="learning-panel" id="lessons"><div className="panel-heading"><div><span className="panel-kicker">HỌC TẬP · LỚP {learningPath?.grade || grade}</span><h2>Tiếp tục hành trình</h2></div><Link to="/hoc-tap">Xem lộ trình <span>→</span></Link></div><div className="learning-list">{learningError ? <div className="learning-path-load-error" role="alert">{learningError} <button onClick={loadLearningPath}>Thử lại</button></div> : learningCards.slice(0, 3).map((card, index) => <Link className={`learning-card ${card.isCompleted ? "learning-card-completed" : ""}`} to={`/hoc-tap/${card.lessonId}`} key={card.lessonId}><span className={`learning-icon ${["coral", "violet", "mint"][index % 3]}`}>{card.isCompleted ? "✓" : ["➕", "🔷", "📏"][index % 3]}</span><span className="learning-info"><small>{card.isCompleted ? "ĐÃ HOÀN THÀNH" : `CHỦ ĐỀ · ${card.topic.name.toLocaleUpperCase("vi-VN")}`}</small><strong>{card.title}</strong><span>{card.isCompleted ? "Ôn lại bài học" : typeof card.assessmentAccuracy === "number" ? `${card.skillStatus} · ${card.assessmentSource} ${card.assessmentAccuracy}%` : card.accuracy === null ? "Bắt đầu học chủ đề này" : `Kết quả luyện tập: ${card.accuracy}% đúng`}</span></span><span className="learning-arrow">→</span></Link>)}</div></section>
        <aside className="daily-panel" id="challenge">
          <div className="daily-top"><span>☀</span><small>THỬ THÁCH HÔM NAY · LỚP {dailyChallenge?.grade || grade}</small></div>
          <h2>Khởi động trí não!</h2>
          <p>Giải câu đố nhanh để luyện tư duy, nhận XP và sao đổi quà.</p>
          {challengeLoading ? <div className="daily-question daily-question-state" role="status">Đang tải thử thách…</div> : dailyChallenge ? <>
            <div className="daily-question">
              <div className="daily-countdown" role="timer" aria-label="Thời gian đến thử thách ngày mai">
                <span>⏳ Câu tiếp theo sau</span><strong>{String(Math.floor(untilNextChallenge / 3600)).padStart(2, "0")}:{String(Math.floor((untilNextChallenge % 3600) / 60)).padStart(2, "0")}:{String(untilNextChallenge % 60).padStart(2, "0")}</strong>
              </div>
              <small className="daily-challenge-number">Mỗi ngày một câu hỏi mới</small>
              <span>{dailyChallenge.prompt}</span>
              <div>{dailyChallenge.options.map((option) => <button
                className={`daily-answer ${challengeAnswer === option ? "is-selected" : ""}`}
                key={option}
                onClick={() => { setChallengeAnswer(option); setChallengeFeedback(""); }}
                disabled={challengeSubmitting || challengeProgress?.completed}
                aria-pressed={challengeAnswer === option}
              >{option}</button>)}</div>
            </div>
            {challengeFeedback && <p className={`daily-feedback ${challengeProgress?.completed ? "is-success" : challengeAnswer === null ? "is-error" : ""}`} role="status">{challengeFeedback}</p>}
            <button onClick={submitDailyChallenge} disabled={!challengeAnswer || challengeSubmitting || challengeProgress?.completed}>
              {challengeSubmitting ? "Đang kiểm tra…" : challengeProgress?.completed ? "Câu tiếp theo vào ngày mai" : "Chọn đáp án"} <span>→</span>
            </button>
            <small className="daily-reward-note">{challengeProgress?.completed ? `Đã nhận +${challengeProgress.rewardXp || 10} XP · +${challengeProgress.rewardStars || 1} ⭐. Câu mới mở lúc 00:00.` : "Trả lời đúng để nhận +10 XP, +1 sao. Câu mới mỗi ngày."}</small>
          </> : <div className="daily-question daily-question-state" role="alert">{challengeError || "Không thể tải thử thách hôm nay."}<button type="button" onClick={loadDailyChallenge}>Thử tải lại</button></div>}
          {challengeError && dailyChallenge && <p className="daily-feedback is-error" role="alert">{challengeError}</p>}
        </aside>
      </div>

      <footer className="dashboard-footer"><span>🌱</span><strong>Mỗi ngày một chút tiến bộ!</strong><span>MathKids luôn đồng hành cùng bạn.</span></footer>
    </div>
  </main>;
}
