import { useEffect, useState } from "react";
import BrandLogo from "../components/BrandLogo";
import { getAuthToken, getCachedUser } from "../authStorage";
import "./AdminDashboard.css";

const numberFormat = new Intl.NumberFormat("vi-VN");

export default function AdminDashboard({ onLogout }) {
  const [admin] = useState(getCachedUser);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function loadAdminDashboard() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          setError(result.message || "Tài khoản không có quyền quản trị.");
          return;
        }
        if (!response.ok) throw new Error(result.message || "Không thể tải dữ liệu quản trị.");
        setData(result);
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message || "Không thể kết nối tới máy chủ.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadAdminDashboard();
    return () => controller.abort();
  }, []);

  const metrics = [
    ["Tổng tài khoản", data?.summary.totalUsers, "👥", "metric-blue"],
    ["Học sinh", data?.summary.studentUsers, "🎒", "metric-green"],
    ["Quản trị viên", data?.summary.adminUsers, "🛡️", "metric-purple"],
    ["Tài khoản mới · 7 ngày", data?.summary.newUsersThisWeek, "✨", "metric-orange"],
  ];

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <BrandLogo className="admin-brand" to="/admin/dashboard" />
      <div className="admin-nav-label">QUẢN TRỊ</div>
      <a className="admin-nav-item active" href="#overview"><span>▦</span> Tổng quan</a>
      <a className="admin-nav-item" href="#accounts"><span>♙</span> Tài khoản</a>
      <div className="admin-sidebar-bottom"><span className="admin-shield">🛡️</span><div><strong>Khu vực quản trị</strong><small>Chỉ dành cho Admin</small></div></div>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar"><div><span className="admin-breadcrumb">MathKids /</span> Quản trị</div><div className="admin-user"><span className="admin-avatar">🛡️</span><span>{admin?.name || "Quản trị viên"}<small>Admin</small></span><button onClick={onLogout}>Đăng xuất</button></div></header>
      <div className="admin-content" id="overview">
        <div className="admin-welcome"><div><span className="admin-eyebrow">TRUNG TÂM QUẢN TRỊ</span><h1>Xin chào, {admin?.name || "Admin"} 👋</h1><p>Theo dõi hoạt động và tài khoản trên MathKids.</p></div><span className="admin-welcome-art">📊</span></div>
        {error && <div className="admin-error" role="alert">{error}</div>}
        <section className="admin-metrics">{metrics.map(([label, value, icon, tone]) => <article className={`admin-metric ${tone}`} key={label}><span>{icon}</span><div><small>{label}</small><strong>{loading ? "…" : numberFormat.format(value ?? 0)}</strong></div></article>)}</section>
        <section className="accounts-panel" id="accounts"><div className="accounts-heading"><div><span className="admin-eyebrow">NGƯỜI DÙNG</span><h2>Tài khoản gần đây</h2></div><span className="accounts-count">{data ? `${numberFormat.format(data.summary.totalUsers)} tài khoản` : "Đang tải…"}</span></div>
          <div className="accounts-table-wrap"><table className="accounts-table"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Lớp</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead><tbody>
            {loading && <tr><td colSpan="5" className="table-empty">Đang tải danh sách…</td></tr>}
            {!loading && data?.recentUsers.map((user) => <tr key={user.id}><td><div className="table-user"><span>{user.role === "Admin" ? "🛡️" : "👦"}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td><td><span className={`role-pill ${user.role === "Admin" ? "role-admin" : "role-user"}`}>{user.role === "Admin" ? "Admin" : user.role}</span></td><td>{user.grade ? `Lớp ${user.grade}` : "—"}</td><td><span className={`status-pill ${user.active ? "is-active" : "is-inactive"}`}>{user.active ? "Hoạt động" : "Đã khóa"}</span></td><td>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</td></tr>)}
            {!loading && !error && data?.recentUsers.length === 0 && <tr><td colSpan="5" className="table-empty">Chưa có tài khoản nào.</td></tr>}
          </tbody></table></div>
          <p className="admin-security-note"><span>🔒</span> Quyền quản trị được xác thực ở máy chủ. Tài khoản thường không thể truy cập dữ liệu này.</p>
        </section>
      </div>
    </section>
  </main>;
}
