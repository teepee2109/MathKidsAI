import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getCachedUser } from "../authStorage";
import { getChildAlerts } from "../services/parentService";
import "./ParentDashboard.css";
import "./ParentAlerts.css";

export default function ParentAlerts({ onLogout }) {
  const { studentId } = useParams();
  const parent = getCachedUser();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getChildAlerts(Number(studentId))
      .then((data) => setAlerts(data.alerts || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [studentId]);

  const alertColorClass = { INACTIVE: "alert-orange", WEAK_TOPIC: "alert-red", NEEDS_REVIEW: "alert-blue" };

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
          <div><span className="parent-breadcrumb">MathKids / Phụ huynh /</span> Cảnh báo học tập</div>
          <div className="parent-user">
            <span>👤</span>
            <span>{parent?.name}<small>Parent</small></span>
            <button onClick={onLogout}>Đăng xuất</button>
          </div>
        </header>

        <div className="parent-content">
          <Link to={`/parent/children/${studentId}/report`} className="back-link">← Quay lại báo cáo</Link>

          <div className="alerts-header">
            <h1>🔔 Cảnh báo học tập</h1>
            <Link to={`/parent/children/${studentId}/recommendations`} className="btn-recs">💡 Xem gợi ý hỗ trợ</Link>
          </div>

          {loading && <div className="parent-loading">Đang tải...</div>}
          {error && <div className="parent-error" role="alert">{error}</div>}

          {!loading && !error && alerts.length === 0 && (
            <div className="alerts-empty">
              <span>🎉</span>
              <p>Không có cảnh báo nào! Con đang học rất tốt.</p>
            </div>
          )}

          <div className="alerts-list">
            {alerts.map((alert, i) => (
              <div className={`alert-card ${alertColorClass[alert.type] || ""}`} key={i}>
                <span className="alert-icon">{alert.icon}</span>
                <div className="alert-body">
                  <strong>{alert.title}</strong>
                  <p>{alert.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
