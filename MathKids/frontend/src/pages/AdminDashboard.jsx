import { useEffect, useState } from "react";
import BrandLogo from "../components/BrandLogo";
import { getAuthToken, getCachedUser } from "../authStorage";
import "./AdminDashboard.css";
import "./AdminDashboardManagement.css";
import "./AdminDashboardReports.css";
import "./AdminDashboardRevenue.css";

const numberFormat = new Intl.NumberFormat("vi-VN");
const currencyFormat = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export default function AdminDashboard({ onLogout }) {
  const [admin] = useState(getCachedUser);
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState("");
  const [reportDays, setReportDays] = useState(30);
  const [usersData, setUsersData] = useState(null);
  const [error, setError] = useState("");
  const [usersError, setUsersError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersRevision, setUsersRevision] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState(null);
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

  useEffect(() => {
    const controller = new AbortController();
    async function loadReport() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/reports/overview?days=${reportDays}`, {
          cache: "no-store", headers: { Authorization: `Bearer ${getAuthToken()}` }, signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "Không thể tải báo cáo.");
        setReport(result);
        setReportError("");
      } catch (loadError) {
        if (loadError.name !== "AbortError") setReportError(loadError.message || "Không thể tải báo cáo.");
      }
    }
    loadReport();
    return () => controller.abort();
  }, [reportDays]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setUsersLoading(true);
      try {
        const query = new URLSearchParams({ search, role: roleFilter, status: statusFilter, page: String(usersPage) });
        const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/users?${query}`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` }, signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "Không thể tải danh sách tài khoản.");
        setUsersData(result);
        setUsersError("");
      } catch (loadError) {
        if (loadError.name !== "AbortError") setUsersError(loadError.message || "Không thể tải danh sách tài khoản.");
      } finally {
        if (!controller.signal.aborted) setUsersLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, roleFilter, statusFilter, usersPage, usersRevision]);

  async function changeAccountStatus(user) {
    const active = !user.active;
    const action = active ? "mở khóa" : "khóa";
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản ${user.email}?`)) return;
    setBusyUserId(user.id);
    setUsersError("");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || `Không thể ${action} tài khoản.`);
      setUsersRevision((revision) => revision + 1);
    } catch (actionError) {
      setUsersError(actionError.message || `Không thể ${action} tài khoản.`);
    } finally {
      setBusyUserId(null);
    }
  }

  function downloadReport() {
    if (!report) return;
    const rows = [
      ["Ngày", "Tài khoản mới", "Bài học hoàn thành", "Câu đã trả lời", "Bài đánh giá", "Doanh thu VND", "Đơn đã thanh toán"],
      ...report.activity.map((day, index) => [day.date, day.registrations, day.lessons, day.answers, day.assessments, report.revenue.daily[index]?.amount || 0, report.revenue.daily[index]?.orders || 0]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mathkids-admin-report-${reportDays}-days.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const metrics = [
    ["Tổng tài khoản", data?.summary.totalUsers, "👥", "metric-blue"],
    ["Học sinh", data?.summary.studentUsers, "🎒", "metric-green"],
    ["Quản trị viên", data?.summary.adminUsers, "🛡️", "metric-purple"],
    ["Đang hoạt động", data?.summary.activeUsers, "✅", "metric-green"],
    ["Tài khoản mới · 7 ngày", data?.summary.newUsersThisWeek, "✨", "metric-orange"],
  ];

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <BrandLogo className="admin-brand" to="/admin/dashboard" />
      <div className="admin-nav-label">QUẢN TRỊ</div>
      <a className="admin-nav-item active" href="#overview"><span>▦</span> Tổng quan</a>
      <a className="admin-nav-item" href="#reports"><span>▤</span> Báo cáo</a>
      <a className="admin-nav-item" href="#accounts"><span>♙</span> Tài khoản</a>
      <div className="admin-sidebar-bottom"><span className="admin-shield">🛡️</span><div><strong>Khu vực quản trị</strong><small>Chỉ dành cho Admin</small></div></div>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar"><div><span className="admin-breadcrumb">MathKids /</span> Quản trị</div><div className="admin-user"><span className="admin-avatar">🛡️</span><span>{admin?.name || "Quản trị viên"}<small>Admin</small></span><button onClick={onLogout}>Đăng xuất</button></div></header>
      <div className="admin-content" id="overview">
        <div className="admin-welcome"><div><span className="admin-eyebrow">TRUNG TÂM QUẢN TRỊ</span><h1>Xin chào, {admin?.name || "Admin"} 👋</h1><p>Theo dõi hoạt động và tài khoản trên MathKids.</p></div><span className="admin-welcome-art">📊</span></div>
        {error && <div className="admin-error" role="alert">{error}</div>}
        <section className="admin-metrics">{metrics.map(([label, value, icon, tone]) => <article className={`admin-metric ${tone}`} key={label}><span>{icon}</span><div><small>{label}</small><strong>{loading ? "…" : numberFormat.format(value ?? 0)}</strong></div></article>)}</section>
        <section className="admin-report-panel" id="reports">
          <div className="admin-report-heading"><div><span className="admin-eyebrow">PHÂN TÍCH HOẠT ĐỘNG</span><h2>Báo cáo hệ thống</h2><p>Số liệu học tập, đánh giá và đăng ký trong khoảng thời gian đã chọn.</p></div><div className="admin-report-actions"><select aria-label="Khoảng thời gian báo cáo" value={reportDays} onChange={(event) => setReportDays(Number(event.target.value))}><option value={7}>7 ngày</option><option value={30}>30 ngày</option><option value={90}>90 ngày</option></select><button onClick={downloadReport} disabled={!report}>Tải CSV ↓</button></div></div>
          {reportError && <div className="admin-error" role="alert">{reportError}</div>}
          {report ? <>
            <div className="report-kpis">{[
              ["Học sinh hoạt động", report.summary.activeLearners, "👩‍🎓"],
              ["Tài khoản mới", report.summary.newUsers, "✨"],
              ["Bài học hoàn thành", report.summary.completedLessons, "📚"],
              ["Câu đã trả lời", report.summary.answeredQuestions, "✏️"],
              ["Bài đánh giá", report.summary.placementTests + report.summary.weeklyTests + report.summary.monthlyTests, "🎯"],
            ].map(([label, value, icon]) => <article className="report-kpi" key={label}><span>{icon}</span><div><small>{label}</small><strong>{numberFormat.format(value)}</strong></div></article>)}</div>
            <section className="admin-revenue-report"><div className="revenue-heading"><div><span className="admin-eyebrow">THANH TOÁN PREMIUM</span><h3>Báo cáo doanh thu</h3><p>Chỉ tính các đơn đã xác nhận thanh toán; đơn Premium demo được loại trừ.</p></div><strong className="revenue-total">{currencyFormat.format(report.revenue.total)}</strong></div><div className="revenue-kpis"><article><small>Đơn đã thanh toán · {reportDays} ngày</small><strong>{numberFormat.format(report.revenue.paidOrders)}</strong></article><article><small>Đơn đang chờ · {reportDays} ngày</small><strong>{numberFormat.format(report.revenue.pendingOrders)}</strong></article><article><small>Tài khoản Premium đang hoạt động</small><strong>{numberFormat.format(report.revenue.activePremiumUsers)}</strong></article></div><section className="revenue-chart-card"><div><h4>Doanh thu theo ngày</h4><small>{reportDays} ngày gần nhất · VND</small></div><div className="revenue-bars" role="img" aria-label="Biểu đồ doanh thu thanh toán theo ngày">{report.revenue.daily.map((day, index) => { const max = Math.max(1, ...report.revenue.daily.map((item) => item.amount)); const height = day.amount ? Math.max(5, day.amount / max * 100) : 2; return <span key={day.date} title={`${day.date}: ${currencyFormat.format(day.amount)} · ${day.orders} đơn`}><i style={{ height: `${height}%` }} />{(index === 0 || (index + 1) % Math.ceil(report.revenue.daily.length / 7) === 0) && <small>{day.date.slice(5)}</small>}</span>; })}</div></section><section className="revenue-orders"><h4>Giao dịch gần đây</h4><div className="accounts-table-wrap"><table className="accounts-table"><thead><tr><th>Mã hóa đơn</th><th>Ngày tạo</th><th>Trạng thái</th><th>Số tiền</th></tr></thead><tbody>{report.revenue.recentPayments.map((payment) => <tr key={payment.id}><td>{payment.invoiceNumber}</td><td>{new Date(payment.createdAt).toLocaleDateString("vi-VN")}</td><td><span className={`status-pill ${payment.status === "Paid" ? "is-active" : payment.status === "Pending" ? "payment-pending" : "is-inactive"}`}>{payment.status === "Paid" ? "Đã thanh toán" : payment.status === "Pending" ? "Đang chờ" : payment.status === "Cancelled" ? "Đã hủy" : "Thất bại"}</span></td><td>{currencyFormat.format(payment.amount)}</td></tr>)}{report.revenue.recentPayments.length === 0 && <tr><td colSpan="4" className="table-empty">Chưa có giao dịch nào.</td></tr>}</tbody></table></div></section></section>
            <div className="report-charts">
              <section className="report-chart-card"><div><h3>Đăng ký theo ngày</h3><small>{reportDays} ngày gần nhất</small></div><div className="report-bars" role="img" aria-label="Biểu đồ tài khoản đăng ký mỗi ngày">{report.activity.map((day, index) => { const max = Math.max(1, ...report.activity.map((item) => item.registrations)); const height = day.registrations ? Math.max(5, day.registrations / max * 100) : 2; return <span key={day.date} title={`${day.date}: ${day.registrations} tài khoản mới`}><i style={{ height: `${height}%` }} />{(index === 0 || (index + 1) % Math.ceil(report.activity.length / 7) === 0) && <small>{day.date.slice(5)}</small>}</span>; })}</div></section>
              <section className="report-chart-card"><div><h3>Phân bố học sinh</h3><small>{numberFormat.format(report.summary.students)} học sinh</small></div><div className="grade-distribution">{[1, 2, 3, 4, 5].map((grade) => { const count = report.grades.find((item) => item.grade === grade)?.students || 0; const max = Math.max(1, ...report.grades.map((item) => item.students)); return <div key={grade}><span>Lớp {grade}</span><i><b style={{ width: `${count ? Math.max(3, count / max * 100) : 0}%` }} /></i><strong>{numberFormat.format(count)}</strong></div>; })}</div></section>
            </div>
            <section className="report-activity-table"><h3>Hoạt động theo ngày</h3><div className="accounts-table-wrap"><table className="accounts-table"><thead><tr><th>Ngày</th><th>Đăng ký</th><th>Bài học</th><th>Câu trả lời</th><th>Đánh giá</th></tr></thead><tbody>{[...report.activity].reverse().slice(0, 10).map((day) => <tr key={day.date}><td>{new Date(`${day.date}T00:00:00`).toLocaleDateString("vi-VN")}</td><td>{numberFormat.format(day.registrations)}</td><td>{numberFormat.format(day.lessons)}</td><td>{numberFormat.format(day.answers)}</td><td>{numberFormat.format(day.assessments)}</td></tr>)}</tbody></table></div></section>
          </> : !reportError && <div className="table-empty">Đang tạo báo cáo…</div>}
        </section>
        <section className="accounts-panel" id="accounts"><div className="accounts-heading"><div><span className="admin-eyebrow">NGƯỜI DÙNG</span><h2>Quản lý tài khoản</h2></div><span className="accounts-count">{usersData ? `${numberFormat.format(usersData.total)} tài khoản` : "Đang tải…"}</span></div>
          <div className="accounts-filters"><input aria-label="Tìm theo tên hoặc email" placeholder="Tìm theo tên hoặc email…" value={search} onChange={(event) => { setSearch(event.target.value); setUsersPage(1); }} /><select aria-label="Lọc theo vai trò" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setUsersPage(1); }}><option value="">Tất cả vai trò</option><option value="Student">Học sinh</option><option value="Parent">Phụ huynh</option><option value="Teacher">Giáo viên</option><option value="Admin">Admin</option></select><select aria-label="Lọc theo trạng thái" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setUsersPage(1); }}><option value="">Mọi trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Đã khóa</option></select></div>
          {usersError && <div className="admin-error" role="alert">{usersError}</div>}
          <div className="accounts-table-wrap"><table className="accounts-table"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Lớp</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead><tbody>
            {usersLoading && <tr><td colSpan="6" className="table-empty">Đang tải danh sách…</td></tr>}
            {!usersLoading && usersData?.users.map((user) => <tr key={user.id}><td><div className="table-user"><span>{user.role === "Admin" ? "🛡️" : user.role === "Parent" ? "👨‍👩‍👧" : "👦"}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td><td><span className={`role-pill ${user.role === "Admin" ? "role-admin" : "role-user"}`}>{user.role === "Admin" ? "Admin" : user.role}</span></td><td>{user.grade ? `Lớp ${user.grade}` : "—"}</td><td><span className={`status-pill ${user.active ? "is-active" : "is-inactive"}`}>{user.active ? "Hoạt động" : "Đã khóa"}</span></td><td>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</td><td><button className={`account-status-button ${user.active ? "is-lock" : "is-unlock"}`} disabled={busyUserId === user.id || (user.id === admin?.id && user.active)} title={user.id === admin?.id ? "Không thể tự khóa tài khoản" : undefined} onClick={() => changeAccountStatus(user)}>{busyUserId === user.id ? "Đang cập nhật…" : user.active ? "Khóa" : "Mở khóa"}</button></td></tr>)}
            {!usersLoading && !usersError && usersData?.users.length === 0 && <tr><td colSpan="6" className="table-empty">Không tìm thấy tài khoản phù hợp.</td></tr>}
          </tbody></table></div>
          {usersData?.totalPages > 1 && <div className="accounts-pagination"><button disabled={usersPage <= 1 || usersLoading} onClick={() => setUsersPage((page) => page - 1)}>← Trang trước</button><span>Trang {usersData.page} / {usersData.totalPages}</span><button disabled={usersPage >= usersData.totalPages || usersLoading} onClick={() => setUsersPage((page) => page + 1)}>Trang sau →</button></div>}
          <p className="admin-security-note"><span>🔒</span> Quyền quản trị được kiểm tra ở máy chủ. Admin không thể tự khóa mình hoặc khóa Admin cuối cùng.</p>
        </section>
      </div>
    </section>
  </main>;
}
