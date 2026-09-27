import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getCachedUser } from "../authStorage";
import { getChildren, unlinkChild } from "../services/parentService";
import "./ParentDashboard.css";

export default function ParentDashboard({ onLogout }) {
  const parent = getCachedUser();
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unlinking, setUnlinking] = useState(null);

  useEffect(() => {
    getChildren()
      .then((data) => setChildren(data.children || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleUnlink(studentId, name) {
    if (!window.confirm(`Bạn có chắc muốn hủy liên kết với ${name}?`)) return;
    setUnlinking(studentId);
    try {
      await unlinkChild(studentId);
      setChildren((prev) => prev.filter((c) => c.studentId !== studentId));
    } catch (err) {
      alert(err.message);
    } finally {
      setUnlinking(null);
    }
  }

  return (
    <main className="parent-shell">
      <aside className="parent-sidebar">
        <BrandLogo className="parent-brand" to="/parent/dashboard" />
        <div className="parent-nav-label">PHỤ HUYNH</div>
        <Link className="parent-nav-item active" to="/parent/dashboard"><span>🏠</span> Tổng quan</Link>
        <Link className="parent-nav-item" to="/parent/link-child"><span>🔗</span> Thêm học sinh</Link>
        <Link className="parent-nav-item" to="/lien-he"><span>🎧</span> Hỗ trợ & Liên hệ</Link>
        <div className="parent-sidebar-bottom">
          <span>👨‍👩‍👧</span>
          <div><strong>Khu vực phụ huynh</strong><small>Theo dõi việc học của con</small></div>
        </div>
      </aside>

      <section className="parent-main">
        <header className="parent-topbar">
          <div><span className="parent-breadcrumb">MathKids /</span> Phụ huynh</div>
          <div className="parent-user">
            <span className="parent-avatar-icon">👤</span>
            <span>{parent?.name || "Phụ huynh"}<small>Parent</small></span>
            <button onClick={onLogout}>Đăng xuất</button>
          </div>
        </header>

        <div className="parent-content">
          <div className="parent-welcome">
            <div>
              <span className="parent-eyebrow">THEO DÕI HỌC TẬP</span>
              <h1>Xin chào, {parent?.name || "Phụ huynh"} 👋</h1>
              <p>Theo dõi tiến độ và hỗ trợ con học Toán hiệu quả hơn.</p>
            </div>
            <span className="parent-welcome-art">👨‍👩‍👧</span>
          </div>

          {error && <div className="parent-error" role="alert">{error}</div>}

          <div className="parent-section-header">
            <h2>Con của bạn</h2>
            <Link to="/parent/link-child" className="parent-add-btn">+ Liên kết con mới</Link>
          </div>

          {loading ? (
            <div className="parent-loading">Đang tải...</div>
          ) : children.length === 0 ? (
            <div className="parent-empty">
              <span>👦</span>
              <p>Bạn chưa liên kết với con nào.</p>
              <Link to="/parent/link-child" className="parent-link-btn">Liên kết ngay</Link>
            </div>
          ) : (
            <div className="parent-children-grid">
              {children.map((child) => (
                <div className="parent-child-card" key={child.studentId}>
                  <div className="child-card-avatar">{child.name?.[0] || "🎒"}</div>
                  <div className="child-card-info">
                    <strong>{child.name}</strong>
                    <small>Lớp {child.grade}</small>
                    <span className="child-xp">⭐ {child.totalXp} XP &nbsp;·&nbsp; 🌟 {child.totalStars} sao</span>
                  </div>
                  <div className="child-card-actions">
                    <button onClick={() => navigate(`/parent/children/${child.studentId}/report`)} className="btn-view">📊 Báo cáo</button>
                    <button onClick={() => navigate(`/parent/children/${child.studentId}/alerts`)} className="btn-alerts">🔔 Cảnh báo</button>
                    <button onClick={() => handleUnlink(child.studentId, child.name)} disabled={unlinking === child.studentId} className="btn-unlink">
                      {unlinking === child.studentId ? "..." : "Hủy liên kết"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
