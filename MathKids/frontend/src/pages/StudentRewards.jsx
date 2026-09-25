import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getAuthToken } from "../authStorage";
import { apiFetch, apiUrl } from "../api";
import "./StudentRewards.css";

export default function StudentRewards() {
  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyCode, setBusyCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRewards = useCallback(async () => {
    try {
      const response = await apiFetch("students/me/rewards", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Không thể tải phần thưởng.");
      setRewards(data);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadRewards(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRewards]);

  async function changeReward(item, action) {
    if (busyCode) return;
    if (action === "purchase" && !window.confirm(`Đổi ${item.name} với ${item.cost} sao?`)) return;
    setBusyCode(item.code);
    setError("");
    setNotice("");
    try {
      const response = await fetch(apiUrl(`students/me/rewards/${encodeURIComponent(item.code)}/${action}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật vật phẩm.");
      setNotice(data.message || "Đã cập nhật phần thưởng.");
      await loadRewards();
    } catch (actionError) {
      setError(actionError.message || "Không thể cập nhật vật phẩm.");
    } finally {
      setBusyCode("");
    }
  }

  const xp = Number(rewards?.totalXp || 0);
  return <main className="student-rewards-page">
    <header className="rewards-header"><BrandLogo to="/dashboard" /><Link to="/dashboard">← Về dashboard</Link></header>
    <div className="rewards-content">
      <section className="rewards-hero">
        <span className="rewards-hero-icon">🎁</span><span className="rewards-kicker">NỖ LỰC ĐƯỢC GHI NHẬN</span>
        <h1>Hành trình phần thưởng</h1>
        <p>Học tập để tích lũy XP, lên cấp và nhận huy hiệu. Dùng sao để đổi vật phẩm trang trí của riêng bạn.</p>
        <div className="reward-wallet"><span>⭐</span><div><small>SỐ SAO CÓ THỂ ĐỔI</small><strong>{loading ? "…" : (rewards?.totalStars ?? 0)}</strong></div><Link to="/dashboard#challenge">Làm thử thách hôm nay →</Link></div>
      </section>

      {error && <div className="rewards-alert" role="alert"><span>{error}</span><button onClick={loadRewards}>Thử lại</button></div>}
      {notice && <div className="rewards-notice" role="status">{notice}</div>}

      <section className="level-panel">
        <div className="level-emblem">⚡</div><div className="level-details"><div className="level-heading"><div><small>TIẾN ĐỘ CỦA BẠN</small><h2>Cấp {rewards?.level || 1}</h2></div><strong>{loading ? "…" : `${xp} XP`}</strong></div><div className="level-track"><span style={{ width: `${rewards?.levelProgress || 0}%` }} /></div><p>{rewards?.levelProgress || 0}/100 XP tới cấp tiếp theo · Bài đánh giá hoàn thành nhận XP theo kết quả.</p></div>
      </section>

      <section className="badge-section"><div className="rewards-section-heading"><div><span className="rewards-kicker">THÀNH TỰU</span><h2>Huy hiệu của bạn</h2></div><span>{rewards?.badges?.filter((badge) => badge.unlocked).length || 0}/{rewards?.badges?.length || 4} đã mở khóa</span></div><div className="badge-grid">{(rewards?.badges || []).map((badge) => <article className={`badge-card ${badge.unlocked ? "is-unlocked" : "is-locked"}`} key={badge.code}><span>{badge.unlocked ? badge.icon : "🔒"}</span><strong>{badge.name}</strong><small>{badge.description}</small><b>{badge.unlocked ? "ĐÃ ĐẠT ĐƯỢC" : `${Math.max(0, badge.threshold - xp)} XP CÒN LẠI`}</b></article>)}</div></section>

      <section className="shop-section"><div className="rewards-section-heading"><div><span className="rewards-kicker">CỬA HÀNG</span><h2>Đổi sao lấy vật phẩm</h2></div><span>Trang bị miễn phí · Đổi một lần</span></div>{loading && !rewards ? <div className="shop-loading">Đang tải cửa hàng…</div> : <div className="reward-shop-grid">{(rewards?.catalog || []).map((item) => <article className={`shop-item ${item.equipped ? "is-equipped" : ""}`} key={item.code}>
        <div className={`shop-preview preview-${item.category} ${item.equipped ? `equipped-${item.code}` : ""}`}><span>{item.icon}</span>{item.equipped && <b>ĐANG DÙNG</b>}</div>
        <div className="shop-item-info"><span className="shop-category">{item.category === "frame" ? "TRANG TRÍ AVATAR" : item.category === "companion" ? "BẠN ĐỒNG HÀNH" : "GIAO DIỆN"}</span><h3>{item.name}</h3><p>{item.description}</p><strong className="shop-price">⭐ {item.cost} sao</strong></div>
        {item.equipped ? <button className="shop-action shop-equipped" disabled>Đang trang bị ✓</button> : item.owned ? <button className="shop-action shop-equip" disabled={Boolean(busyCode)} onClick={() => changeReward(item, "equip")}>{busyCode === item.code ? "Đang trang bị…" : "Trang bị"}</button> : <button className="shop-action shop-buy" disabled={Boolean(busyCode) || (rewards?.totalStars || 0) < item.cost} onClick={() => changeReward(item, "purchase")}>{busyCode === item.code ? "Đang đổi…" : (rewards?.totalStars || 0) < item.cost ? `Cần thêm ${item.cost - (rewards?.totalStars || 0)} sao` : "Đổi vật phẩm"}</button>}
      </article>)}</div>}</section>
      <p className="rewards-footnote">XP và sao chỉ được cấp khi máy chủ xác nhận hoạt động học tập. Đổi sao không làm giảm XP hay cấp độ của bạn.</p>
    </div>
  </main>;
}
