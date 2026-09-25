import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getAuthToken, getCachedUser, resolveAvatarUrl, saveCachedUser } from "../authStorage";
import "./StudentProfile.css";
import "./StudentProfileAvatar.css";
import "./StudentProfilePremium.css";

const emptyProfile = { name: "", email: "", dateOfBirth: "", grade: "1", avatarUrl: "" };

export default function StudentProfile() {
  const cachedUser = getCachedUser();
  const [profile, setProfile] = useState(() => {
    const cached = getCachedUser();
    return cached ? { ...emptyProfile, ...cached, grade: String(cached.grade || 1) } : emptyProfile;
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [pageError, setPageError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState({ loading: true, isPremium: Boolean(cachedUser?.isPremium), subscription: cachedUser?.premiumExpiresAt ? { expiresAt: cachedUser.premiumExpiresAt } : null, error: "", hasCachedStatus: typeof cachedUser?.isPremium === "boolean" });

  useEffect(() => {
    const controller = new AbortController();
    const hasCachedProfile = Boolean(getCachedUser()?.name || getCachedUser()?.email);
    async function loadProfile() {
      let lastError;
      for (let attempt = 0; attempt < 3 && !controller.signal.aborted; attempt += 1) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/students/me/profile`, {
            cache: "no-store",
            headers: { Authorization: `Bearer ${getAuthToken()}` },
            signal: controller.signal,
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.message || "Không tải được hồ sơ.");
          const nextProfile = { ...emptyProfile, ...data.profile, grade: String(data.profile.grade || 1) };
          setProfile(nextProfile);
          saveCachedUser({ ...(getCachedUser() || {}), ...data.profile });
          setPageError("");
          if (!controller.signal.aborted) setLoading(false);
          return;
        } catch (error) {
          if (error.name === "AbortError") return;
          lastError = error;
          if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 350));
        }
      }
      if (!controller.signal.aborted) {
        if (!hasCachedProfile) setPageError(lastError?.message || "Không thể kết nối tới máy chủ.");
        setLoading(false);
      }
    }
    loadProfile();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadPremiumStatus() {
      let lastError;
      for (let attempt = 0; attempt < 3 && !controller.signal.aborted; attempt += 1) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/payments/premium/status`, {
            cache: "no-store",
            headers: { Authorization: `Bearer ${getAuthToken()}` },
            signal: controller.signal,
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.message || "Không tải được trạng thái Premium.");
          const isPremium = Boolean(data.isPremium);
          const expiresAt = data.subscription?.expiresAt || "";
          setPremiumStatus({ loading: false, isPremium, subscription: data.subscription || null, error: "", hasCachedStatus: true });
          saveCachedUser({ ...(getCachedUser() || {}), isPremium, premiumExpiresAt: expiresAt });
          return;
        } catch (error) {
          if (error.name === "AbortError") return;
          lastError = error;
          if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 350));
        }
      }
      if (!controller.signal.aborted) setPremiumStatus((current) => ({ ...current, loading: false, error: lastError?.message || "Không thể kiểm tra trạng thái." }));
    }
    loadPremiumStatus();
    return () => controller.abort();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setSaved(false);
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const acceptedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!acceptedTypes.includes(file.type)) {
      setPageError("Chọn ảnh PNG, JPG hoặc WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPageError("Ảnh không được lớn hơn 5 MB.");
      return;
    }

    setPageError("");
    setSaved(false);
    setAvatarFailed(false);
    setUploadingAvatar(true);
    try {
      const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh."));
        reader.readAsDataURL(file);
      });
      setAvatarPreview(imageData);
      const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/students/me/avatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ imageData }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Không thể tải ảnh lên.");
      setProfile((current) => ({ ...current, avatarUrl: data.avatarUrl }));
    } catch (error) {
      setAvatarPreview("");
      setPageError(error.message || "Không thể tải ảnh lên.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    if (!profile.avatarUrl || uploadingAvatar || removingAvatar) return;
    setRemovingAvatar(true);
    setPageError("");
    setSaved(false);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/students/me/avatar`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Không thể xóa ảnh đại diện.");
      setProfile((current) => ({ ...current, avatarUrl: "" }));
      setAvatarPreview("");
      setAvatarFailed(false);
      saveCachedUser({ ...(getCachedUser() || {}), avatarUrl: "" });
      setSaved(true);
    } catch (error) {
      setPageError(error.message || "Không thể xóa ảnh đại diện.");
    } finally {
      setRemovingAvatar(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setPageError("");
    setFieldErrors({});
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/students/me/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ ...profile, grade: Number(profile.grade) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFieldErrors(data.errors || {});
        throw new Error(data.message || "Không thể lưu hồ sơ.");
      }
      setProfile({ ...emptyProfile, ...data.profile, grade: String(data.profile.grade) });
      setAvatarPreview("");
      const cached = getCachedUser() || {};
      saveCachedUser({ ...cached, ...data.profile });
      setSaved(true);
    } catch (error) {
      setPageError(error.message || "Không thể kết nối tới máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="profile-page">
    <header className="profile-header"><BrandLogo to="/dashboard" /><Link to="/dashboard" className="back-dashboard">← Quay lại dashboard</Link></header>
    <section className="profile-card">
      <div className="profile-heading"><span className="profile-heading-icon">👤</span><div><small>THÔNG TIN TÀI KHOẢN</small><h1>Hồ sơ học sinh</h1><p>Cập nhật thông tin để cá nhân hóa hành trình học tập.</p></div></div>
      <section className={`profile-premium-status ${premiumStatus.isPremium ? "is-active" : "is-free"}`} aria-label="Trạng thái tài khoản">
        <div className="profile-premium-icon">{premiumStatus.error ? "⚠️" : premiumStatus.isPremium ? "👑" : "🌱"}</div>
        <div className="profile-premium-copy">
          <small>GÓI TÀI KHOẢN</small>
          {premiumStatus.loading ? <strong>Đang kiểm tra trạng thái…</strong> : premiumStatus.error && !premiumStatus.hasCachedStatus ? <><strong>Chưa xác định trạng thái</strong><span>Không thể kết nối để kiểm tra gói tài khoản.</span></> : premiumStatus.isPremium ? <><strong>Premium đang hoạt động</strong><span>Hiệu lực đến {premiumStatus.subscription?.expiresAt ? new Date(premiumStatus.subscription.expiresAt).toLocaleDateString("vi-VN") : "không giới hạn"}</span></> : <><strong>Gói Free</strong><span>Mở khóa lộ trình AI và toàn bộ đặc quyền học tập.</span></>}
        </div>
        {!premiumStatus.loading && !(premiumStatus.error && !premiumStatus.hasCachedStatus) && (premiumStatus.isPremium ? <Link to="/danh-gia" className="profile-premium-action">Xem lộ trình →</Link> : <Link to="/premium" className="profile-premium-action">Nâng cấp Premium →</Link>)}
      </section>
      {loading && !profile.name && !profile.email ? <div className="profile-loading">Đang tải hồ sơ…</div> : <form className="profile-form" onSubmit={saveProfile}>
        <div className="profile-avatar-row"><div className="profile-avatar-preview">{!avatarFailed && (avatarPreview || profile.avatarUrl) ? <img src={avatarPreview || resolveAvatarUrl(profile.avatarUrl)} alt="Ảnh đại diện xem trước" onError={() => setAvatarFailed(true)} /> : <span className="profile-default-avatar">👦</span>}</div><div className="profile-avatar-control"><strong>Ảnh đại diện</strong><span>PNG, JPG hoặc WEBP · tối đa 5 MB</span><div className="profile-avatar-actions"><label className="avatar-file-button">{uploadingAvatar ? "Đang tải ảnh…" : "Chọn ảnh từ máy"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} disabled={uploadingAvatar || removingAvatar} /></label>{profile.avatarUrl && <button type="button" className="avatar-remove-button" onClick={removeAvatar} disabled={uploadingAvatar || removingAvatar}>{removingAvatar ? "Đang xóa…" : "Xóa ảnh"}</button>}</div></div></div>
        <label className="profile-field"><span>Họ và tên</span><input name="name" value={profile.name} onChange={updateField} maxLength={120} required />{fieldErrors.name && <small>{fieldErrors.name}</small>}</label>
        <label className="profile-field"><span>Email đăng nhập</span><input type="email" name="email" value={profile.email} onChange={updateField} maxLength={255} required />{fieldErrors.email && <small>{fieldErrors.email}</small>}</label>
        <div className="profile-row">
          <label className="profile-field"><span>Ngày sinh</span><input type="date" name="dateOfBirth" value={profile.dateOfBirth || ""} onChange={updateField} max={new Date().toISOString().slice(0, 10)} />{fieldErrors.dateOfBirth && <small>{fieldErrors.dateOfBirth}</small>}</label>
          <label className="profile-field"><span>Lớp</span><select name="grade" value={profile.grade} onChange={updateField}>{[1, 2, 3, 4, 5].map((grade) => <option value={grade} key={grade}>Lớp {grade}</option>)}</select>{fieldErrors.grade && <small>{fieldErrors.grade}</small>}</label>
        </div>
        {pageError && <div className="profile-message error" role="alert">{pageError}</div>}
        {saved && <div className="profile-message success" role="status">Đã lưu hồ sơ thành công. Dashboard đã được cập nhật.</div>}
        <div className="profile-actions"><Link to="/dashboard">Hủy</Link><button type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu thay đổi"}</button></div>
      </form>}
    </section>
  </main>;
}
