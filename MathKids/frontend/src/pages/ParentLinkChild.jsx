import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getCachedUser } from "../authStorage";
import { linkChild, createChildAccount } from "../services/parentService";
import "./ParentDashboard.css";
import "./ParentLinkChild.css";

export default function ParentLinkChild({ onLogout }) {
  const parent = getCachedUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState("create"); // "create" | "invite"
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Tab Tạo tài khoản
  const [form, setForm] = useState({ name: "", email: "", password: "", grade: "1" });

  // Tab Nhập mã invite
  const [inviteCode, setInviteCode] = useState("");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Vui lòng điền đầy đủ thông tin."); return;
    }
    if (form.password.length < 6) { setError("Mật khẩu phải có ít nhất 6 ký tự."); return; }
    setLoading(true); setError("");
    try {
      const data = await createChildAccount(form);
      setSuccess({ ...data.child, createdNew: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLink(e) {
    e.preventDefault();
    if (!inviteCode.trim()) { setError("Vui lòng nhập mã liên kết."); return; }
    setLoading(true); setError("");
    try {
      const data = await linkChild(inviteCode.trim());
      setSuccess({ ...data.child, createdNew: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="parent-shell">
      <aside className="parent-sidebar">
        <BrandLogo className="parent-brand" to="/parent/dashboard" />
        <div className="parent-nav-label">PHỤ HUYNH</div>
        <Link className="parent-nav-item" to="/parent/dashboard"><span>🏠</span> Tổng quan</Link>
        <Link className="parent-nav-item active" to="/parent/link-child"><span>🔗</span> Thêm học sinh</Link>
        <Link className="parent-nav-item" to="/lien-he"><span>🎧</span> Hỗ trợ & Liên hệ</Link>
        <div className="parent-sidebar-bottom">
          <span>👨‍👩‍👧</span>
          <div><strong>Khu vực phụ huynh</strong><small>Theo dõi việc học của con</small></div>
        </div>
      </aside>

      <section className="parent-main">
        <header className="parent-topbar">
          <div><span className="parent-breadcrumb">MathKids / Phụ huynh /</span> Thêm học sinh</div>
          <div className="parent-user">
            <span>👤</span>
            <span>{parent?.name}<small>Parent</small></span>
            <button onClick={onLogout}>Đăng xuất</button>
          </div>
        </header>

        <div className="parent-content">
          <Link to="/parent/dashboard" className="back-link">← Quay lại</Link>
          <h1 className="link-title">👨‍👩‍👧 Thêm học sinh</h1>

          {success ? (
            <div className="link-card">
              <div className="link-success">
                <span>✅</span>
                <h3>{success.createdNew ? "Tạo tài khoản thành công!" : "Liên kết thành công!"}</h3>
                <p>
                  {success.createdNew
                    ? <>Đã tạo tài khoản và liên kết với <strong>{success.name}</strong> (Lớp {success.grade}).<br/><small>Email đăng nhập: {success.email}</small></>
                    : <>Đã liên kết với <strong>{success.name}</strong> (Lớp {success.grade}).</>}
                </p>
                <div className="success-actions">
                  <button onClick={() => { setSuccess(null); setForm({ name: "", email: "", password: "", grade: "1" }); setInviteCode(""); }} className="btn-add-more">+ Thêm học sinh khác</button>
                  <button onClick={() => navigate("/parent/dashboard")} className="btn-go-dashboard">Xem Dashboard →</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="link-card">
              {/* Tabs */}
              <div className="link-tabs">
                <button className={`link-tab ${tab === "create" ? "active" : ""}`} onClick={() => { setTab("create"); setError(""); }}>
                  ✏️ Tạo tài khoản mới cho con
                </button>
                <button className={`link-tab ${tab === "invite" ? "active" : ""}`} onClick={() => { setTab("invite"); setError(""); }}>
                  🔗 Con đã có tài khoản (dùng mã)
                </button>
              </div>

              {/* Tab: Tạo tài khoản mới */}
              {tab === "create" && (
                <form onSubmit={handleCreate} className="link-form">
                  <p className="tab-desc">Nhập thông tin để tạo tài khoản học sinh. Con có thể dùng email & mật khẩu này để đăng nhập.</p>
                  <div className="form-row">
                    <label className="link-field">
                      <span>Họ và tên con <span className="req">*</span></span>
                      <input name="name" value={form.name} onChange={handleChange} placeholder="Ví dụ: Nguyễn Văn An" autoFocus />
                    </label>
                    <label className="link-field">
                      <span>Lớp <span className="req">*</span></span>
                      <select name="grade" value={form.grade} onChange={handleChange}>
                        {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>Lớp {g}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="link-field">
                    <span>Email đăng nhập cho con <span className="req">*</span></span>
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" />
                  </label>
                  <label className="link-field">
                    <span>Mật khẩu <span className="req">*</span></span>
                    <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Ít nhất 6 ký tự" />
                  </label>
                  {error && <p className="link-error" role="alert">{error}</p>}
                  <button type="submit" disabled={loading} className="link-submit">
                    {loading ? "Đang tạo tài khoản..." : "✏️ Tạo tài khoản cho con →"}
                  </button>
                </form>
              )}

              {/* Tab: Mã invite */}
              {tab === "invite" && (
                <>
                  <div className="link-steps">
                    <div className="link-step"><span className="step-num">1</span><div><strong>Con đăng nhập MathKids</strong><p>Vào trang <b>Hồ sơ</b> → bấm <b>"Tạo mã liên kết phụ huynh"</b>.</p></div></div>
                    <div className="link-step"><span className="step-num">2</span><div><strong>Con chia sẻ mã cho bạn</strong><p>Mã có dạng <code>MK-XXXXX</code>, hiệu lực <b>24 giờ</b>.</p></div></div>
                    <div className="link-step"><span className="step-num">3</span><div><strong>Nhập mã bên dưới</strong><p>Sau khi liên kết bạn xem được báo cáo của con.</p></div></div>
                  </div>
                  <form onSubmit={handleLink} className="link-form">
                    <label className="link-field">
                      <span>Mã liên kết của con</span>
                      <input value={inviteCode} onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setError(""); }} placeholder="VD: MK-A1B2C" maxLength={10} autoFocus />
                    </label>
                    {error && <p className="link-error" role="alert">{error}</p>}
                    <button type="submit" disabled={loading} className="link-submit">
                      {loading ? "Đang kiểm tra..." : "🔗 Liên kết ngay →"}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
