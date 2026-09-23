import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuthToken, getCachedUser, resolveAvatarUrl, saveCachedUser } from "../authStorage";
import "./StudentProfile.css";
import "./StudentProfileAvatar.css";

const emptyProfile = { name: "", email: "", dateOfBirth: "", grade: "1", avatarUrl: "" };

export default function StudentProfile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pageError, setPageError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/students/me/profile`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Không tải được hồ sơ.");
        setProfile({ ...emptyProfile, ...data.profile, grade: String(data.profile.grade || 1) });
      } catch (error) {
        if (error.name !== "AbortError") setPageError(error.message || "Không thể kết nối tới máy chủ.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProfile();
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
    <header className="profile-header"><Link to="/dashboard" className="dashboard-brand"><span>★</span> Math<span>Kids</span></Link><Link to="/dashboard" className="back-dashboard">← Quay lại dashboard</Link></header>
    <section className="profile-card">
      <div className="profile-heading"><span className="profile-heading-icon">👤</span><div><small>THÔNG TIN TÀI KHOẢN</small><h1>Hồ sơ học sinh</h1><p>Cập nhật thông tin để cá nhân hóa hành trình học tập.</p></div></div>
      {loading ? <div className="profile-loading">Đang tải hồ sơ…</div> : <form className="profile-form" onSubmit={saveProfile}>
        <div className="profile-avatar-row"><div className="profile-avatar-preview">{!avatarFailed && (avatarPreview || profile.avatarUrl) ? <img src={avatarPreview || resolveAvatarUrl(profile.avatarUrl)} alt="Ảnh đại diện xem trước" onError={() => setAvatarFailed(true)} /> : <span className="profile-default-avatar">👦</span>}</div><div className="profile-avatar-control"><strong>Ảnh đại diện</strong><span>PNG, JPG hoặc WEBP · tối đa 5 MB</span><label className="avatar-file-button">{uploadingAvatar ? "Đang tải ảnh…" : "Chọn ảnh từ máy"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} disabled={uploadingAvatar} /></label></div></div>
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
