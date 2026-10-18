import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../services/notifications";
import "./NotificationBell.css";

const POLL_INTERVAL_MS = 60000;
const typeIcons = { System: "📣", Achievement: "🏅", LearningAlert: "⚠️", Recommendation: "💡" };

function timeAgo(value) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Vừa xong";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
  return new Date(value).toLocaleDateString("vi-VN");
}

function GuestPanel() {
  return <>
    <div className="notification-heading"><strong>Thông báo</strong></div>
    <div className="notification-item"><span>🎉</span><div><strong>Chào mừng đến MathKids!</strong><p>Đăng nhập để nhận gợi ý học tập riêng cho bạn.</p></div></div>
    <Link to="/dang-nhap" className="notification-action">Đăng nhập để xem thêm →</Link>
  </>;
}

export default function NotificationBell({ isAuthenticated = true }) {
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await getNotifications();
      setItems(data.items || []);
      setUnreadCount(data.unreadCount || 0);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    load();
    const timer = window.setInterval(() => { if (!document.hidden) load(); }, POLL_INTERVAL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => { if (!wrapRef.current?.contains(event.target)) setOpen(false); };
    const onKeyDown = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  function toggle() {
    setOpen((value) => !value);
    if (!open) load();
  }

  async function openItem(item) {
    if (!item.isRead) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
      setUnreadCount((count) => Math.max(0, count - 1));
      markNotificationRead(item.id).catch(() => load());
    }
    if (item.linkUrl) {
      setOpen(false);
      navigate(item.linkUrl);
    }
  }

  async function readAll() {
    setItems((current) => current.map((entry) => ({ ...entry, isRead: true })));
    setUnreadCount(0);
    markAllNotificationsRead().catch(() => load());
  }

  const badge = isAuthenticated ? unreadCount : 1;

  return <div className="notification-wrap" ref={wrapRef}>
    <button type="button" className="notification-button" aria-label={badge ? `Mở thông báo, ${badge} chưa đọc` : "Mở thông báo"} aria-expanded={open} onClick={toggle}>
      <span>🔔</span>{badge > 0 && <b>{badge > 9 ? "9+" : badge}</b>}
    </button>
    {open && <div className="notification-panel" role="dialog" aria-label="Thông báo">
      {!isAuthenticated ? <GuestPanel /> : <>
        <div className="notification-heading">
          <strong>Thông báo</strong>
          {unreadCount > 0 ? <button type="button" className="notification-read-all" onClick={readAll}>Đánh dấu đã đọc ({unreadCount})</button> : <small className="notification-muted">Đã đọc hết</small>}
        </div>
        <div className="notification-list">
          {loading && !items.length && <p className="notification-empty">Đang tải…</p>}
          {error && !items.length && <p className="notification-empty">{error}</p>}
          {!loading && !error && !items.length && <p className="notification-empty">Chưa có thông báo nào.</p>}
          {items.map((item) => <button type="button" key={item.id} className={`notification-item notification-${item.type}${item.isRead ? "" : " unread"}`} onClick={() => openItem(item)}>
            <span>{typeIcons[item.type] || "🔔"}</span>
            <div><strong>{item.title}</strong><p>{item.message}</p><time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time></div>
          </button>)}
        </div>
      </>}
    </div>}
  </div>;
}
