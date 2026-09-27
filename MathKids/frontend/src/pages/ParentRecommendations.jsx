import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getCachedUser } from "../authStorage";
import { getChildRecommendations } from "../services/parentService";
import "./ParentDashboard.css";
import "./ParentRecommendations.css";

export default function ParentRecommendations({ onLogout }) {
  const { studentId } = useParams();
  const parent = getCachedUser();
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getChildRecommendations(Number(studentId))
      .then((data) => setRecs(data.recommendations || []))
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
          <div><span className="parent-breadcrumb">MathKids / Phụ huynh /</span> Gợi ý hỗ trợ</div>
          <div className="parent-user">
            <span>👤</span>
            <span>{parent?.name}<small>Parent</small></span>
            <button onClick={onLogout}>Đăng xuất</button>
          </div>
        </header>

        <div className="parent-content">
          <Link to={`/parent/children/${studentId}/report`} className="back-link">← Quay lại báo cáo</Link>

          <h1 className="recs-title">💡 Gợi ý hỗ trợ con học tập</h1>
          <p className="recs-subtitle">Dựa trên kết quả học tập gần đây của con, hệ thống đề xuất:</p>

          {loading && <div className="parent-loading">Đang phân tích...</div>}
          {error && <div className="parent-error" role="alert">{error}</div>}

          <div className="recs-list">
            {recs.map((rec, i) => (
              <div className="rec-card" key={i}>
                <span className="rec-icon">{rec.icon}</span>
                <div className="rec-body">
                  <strong>{rec.title}</strong>
                  <p>{rec.detail}</p>
                  <span className={`rec-source ${rec.source === "AI" ? "source-ai" : "source-system"}`}>
                    {rec.source === "AI" ? "✨ Phân tích AI" : "🔧 Hệ thống"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
