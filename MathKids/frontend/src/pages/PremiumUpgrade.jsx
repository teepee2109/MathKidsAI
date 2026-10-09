import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { apiFetch } from "../api";
import { getAuthToken } from "../authStorage";
import "./PremiumUpgrade.css";

const features = [
  { label: "Làm bài kiểm tra trình độ", free: true, premium: true },
  { label: "Xem điểm tổng & bản đồ kỹ năng", free: true, premium: true },
  { label: "Lộ trình học cá nhân hóa bởi AI", free: false, premium: true },
  { label: "Gợi ý bài học theo từng ngày", free: false, premium: true },
  { label: "Theo dõi tiến bộ theo tuần", free: false, premium: true },
  { label: "Bài luyện tập nâng cao theo điểm yếu", free: false, premium: true },
  { label: "Báo cáo học tập & gợi ý hỗ trợ cho phụ huynh", free: false, premium: true },
];

export default function PremiumUpgrade() {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState({ loading: true, isPremium: false, subscription: null });

  useEffect(() => {
    const controller = new AbortController();
    apiFetch("payments/premium/status", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${getAuthToken()}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Không thể kiểm tra gói Premium.");
        setPremiumStatus({ loading: false, isPremium: Boolean(data.isPremium), subscription: data.subscription || null });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setPremiumStatus((current) => ({ ...current, loading: false }));
      });
    return () => controller.abort();
  }, []);

  async function choosePlan(plan) {
    if (plan === "free") {
      setNotice("Bạn đang sử dụng gói Free. Có thể nâng cấp Premium bất cứ lúc nào để mở khóa lộ trình.");
      return;
    }
    if (premiumStatus.isPremium) {
      setNotice("Tài khoản của bạn đã có Premium đang hoạt động.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const response = await apiFetch("payments/premium/create", {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Không thể tạo đơn thanh toán.");
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.action;
      form.style.display = "none";
      Object.entries(data.fields || {}).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      setNotice(error.message || "Không thể tạo đơn thanh toán.");
      setBusy(false);
    }
  }

  return <main className="premium-page">
    <header className="premium-header"><BrandLogo to="/dashboard" /><Link to="/danh-gia">← Quay lại kết quả</Link></header>
    <section className="premium-hero"><span className="premium-sparkle">✦</span><span className="premium-kicker">MATHKIDS PREMIUM</span><h1>Học đúng điều con cần,<br /><em>tiến bộ mỗi ngày</em></h1><p>AI đồng hành cùng con bằng một lộ trình vừa sức, vui vẻ và được cập nhật theo từng bước tiến bộ.</p></section>
    <section className="premium-plans">
      <article className="plan-card free-plan"><div className="plan-heading"><span className="plan-icon">🌱</span><div><h2>Free</h2><p>Khởi đầu vui học mỗi ngày</p></div></div><div className="plan-price"><strong>0đ</strong><span>/ mãi mãi</span></div><button onClick={() => choosePlan("free")} className="plan-button free-button">Gói hiện tại</button><ul>{features.filter((feature) => feature.free).map((feature) => <li key={feature.label}><span>✓</span>{feature.label}</li>)}{features.filter((feature) => !feature.free).slice(0, 2).map((feature) => <li className="not-included" key={feature.label}><span>—</span>{feature.label}</li>)}</ul></article>
      <article className="plan-card premium-plan"><span className="popular-badge">{premiumStatus.isPremium ? "GÓI HIỆN TẠI" : "ĐƯỢC ĐỀ XUẤT"}</span><div className="plan-heading"><span className="plan-icon">👑</span><div><h2>Premium</h2><p>Mở khóa hành trình riêng cho con</p></div></div><div className="plan-price"><strong>99.000đ</strong><span>/ 30 ngày</span></div>{premiumStatus.loading ? <button className="plan-button premium-button" disabled>Đang kiểm tra gói…</button> : premiumStatus.isPremium ? <><div style={{ display: "flex", flexDirection: "column", gap: 3, margin: "13px 0 9px", padding: "11px 12px", border: "1px solid #c8ecd9", borderRadius: 10, background: "#effbf4", color: "#278357", fontSize: 12, fontWeight: 900 }}>Premium đang hoạt động{premiumStatus.subscription?.expiresAt && <span style={{ color: "#6f9a84", fontSize: 10, fontWeight: 700 }}>Hiệu lực đến {new Date(premiumStatus.subscription.expiresAt).toLocaleDateString("vi-VN")}</span>}</div><Link to="/hoc-tap" className="plan-button premium-button" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>Xem lộ trình học →</Link></> : <button onClick={() => choosePlan("premium")} className="plan-button premium-button" disabled={busy}>{busy ? "Đang tạo đơn…" : "Nâng cấp Premium →"}</button>}<ul>{features.map((feature) => <li key={feature.label}><span>✓</span>{feature.label}</li>)}</ul></article>
    </section>
    <p className="premium-note">Có thể hủy bất cứ lúc nào · Thanh toán an toàn · Không ảnh hưởng kết quả học ở trường</p>
    {notice && <div className="premium-notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
  </main>;
}
