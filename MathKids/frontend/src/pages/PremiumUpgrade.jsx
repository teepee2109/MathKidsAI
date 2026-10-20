import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { apiFetch } from "../api";
import { getAuthToken } from "../authStorage";
import "./PremiumUpgrade.css";

const features = [
  { label: "Bài học theo chương trình lớp", detail: "Lý thuyết, ví dụ và bài luyện tập cơ bản.", free: true },
  { label: "Đánh giá đầu vào và bản đồ kỹ năng", detail: "Xem kết quả tổng quan để biết con đang ở đâu.", free: true },
  { label: "Trò chơi, thử thách ngày và phần thưởng", detail: "Chơi, tích lũy XP và đổi sao.", free: true },
  { label: "Lộ trình thích ứng theo kết quả của con", detail: "Ưu tiên chủ đề con còn yếu dựa trên đánh giá và kết quả luyện tập.", free: false },
  { label: "Nhận diện nội dung con đã vững", detail: "Bỏ qua mục tiêu đã thành thạo để dành thời gian cho phần cần học.", free: false },
  { label: "Luyện theo mục tiêu và độ khó cao hơn", detail: "Chọn bài tập đúng kỹ năng cần củng cố, mở mức trung bình và nâng cao.", free: false },
  { label: "Đánh giá năng lực hằng tuần", detail: "Kết quả tuần giúp điều chỉnh mức độ bài luyện tiếp theo.", free: false },
  { label: "Báo cáo chi tiết cho phụ huynh", detail: "Xem tiến bộ và gợi ý hỗ trợ khi phụ huynh liên kết với tài khoản học sinh Premium.", free: false },
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
      setNotice(premiumStatus.isPremium ? "Tài khoản Premium vẫn bao gồm toàn bộ quyền lợi của gói Free." : "Bạn đang sử dụng gói Free. Nâng cấp để mở lộ trình thích ứng và các công cụ Premium.");
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

  const featureList = (isPremiumPlan) => features.map((feature) => {
    const included = isPremiumPlan || feature.free;
    return <li className={included ? "plan-feature" : "plan-feature not-included"} key={feature.label}>
      <span aria-hidden="true">{included ? "✓" : "🔒"}</span>
      <div><strong>{feature.label}</strong><small>{feature.detail}</small></div>
    </li>;
  });

  return <main className="premium-page">
    <header className="premium-header"><BrandLogo to="/dashboard" /><Link to="/danh-gia">← Quay lại kết quả</Link></header>
    <section className="premium-hero"><span className="premium-sparkle">✦</span><span className="premium-kicker">MATHKIDS PREMIUM</span><h1>Học đúng điều con cần,<br /><em>tiến bộ mỗi ngày</em></h1><p>Free giúp con học kiến thức theo lớp. Premium dùng kết quả đánh giá và luyện tập để chọn phần cần củng cố, điều chỉnh độ khó và giúp con không phải học lại nội dung đã vững.</p></section>
    <section className="premium-how" aria-label="Cách cá nhân hóa hoạt động">
      <h2>Premium cá nhân hóa việc học như thế nào?</h2>
      <div className="premium-how-steps"><article><span>1</span><div><strong>Ghi nhận kết quả</strong><small>Kết quả đánh giá và bài luyện theo từng chủ đề.</small></div></article><b aria-hidden="true">→</b><article><span>2</span><div><strong>Tìm phần cần học</strong><small>Phân biệt nội dung đã vững với kỹ năng còn cần luyện.</small></div></article><b aria-hidden="true">→</b><article><span>3</span><div><strong>Điều chỉnh bài tiếp theo</strong><small>Gợi ý mục tiêu và mức luyện phù hợp hơn.</small></div></article></div>
    </section>
    <section className="premium-plans">
      <article className="plan-card free-plan"><div className="plan-heading"><span className="plan-icon">🌱</span><div><h2>Free</h2><p>Đủ để bắt đầu học mỗi ngày</p></div></div><div className="plan-price"><strong>0đ</strong><span>/ mãi mãi</span></div><button onClick={() => choosePlan("free")} className="plan-button free-button">{premiumStatus.isPremium ? "Bao gồm trong Premium" : "Gói hiện tại"}</button><ul>{featureList(false)}</ul></article>
      <article className="plan-card premium-plan"><span className="popular-badge">{premiumStatus.isPremium ? "GÓI HIỆN TẠI" : "MỞ RỘNG HỌC TẬP"}</span><div className="plan-heading"><span className="plan-icon">👑</span><div><h2>Premium</h2><p>Thêm hỗ trợ sát với nhu cầu của con</p></div></div><div className="plan-price"><strong>99.000đ</strong><span>/ 30 ngày</span></div>{premiumStatus.loading ? <button className="plan-button premium-button" disabled>Đang kiểm tra gói…</button> : premiumStatus.isPremium ? <><div className="premium-current-status">Premium đang hoạt động{premiumStatus.subscription?.expiresAt && <span>Hiệu lực đến {new Date(premiumStatus.subscription.expiresAt).toLocaleDateString("vi-VN")}</span>}</div><Link to="/hoc-tap" className="plan-button premium-button premium-plan-link">Dùng lộ trình cá nhân hóa →</Link></> : <button onClick={() => choosePlan("premium")} className="plan-button premium-button" disabled={busy}>{busy ? "Đang tạo đơn…" : "Mở khóa Premium →"}</button>}<ul>{featureList(true)}</ul></article>
    </section>
    <p className="premium-note">Bài học theo chương trình, trò chơi và thử thách ngày vẫn có ở Free. Để mở báo cáo phụ huynh, tài khoản học sinh được liên kết cần có Premium.</p>
    {notice && <div className="premium-notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
  </main>;
}
