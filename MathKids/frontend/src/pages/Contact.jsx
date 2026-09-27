import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import "./Contact.css";

const contactChannels = [
  {
    id: "phone",
    cardClass: "card-phone",
    icon: "📞",
    label: "Hotline hỗ trợ",
    value: "0919 619 863",
    note: "Thứ Hai – Thứ Bảy\n8:00 – 21:00 (giờ Việt Nam)",
    btnText: "Gọi ngay",
    btnIcon: "📱",
    href: "tel:+84919619863",
  },
  {
    id: "email",
    cardClass: "card-email",
    icon: "✉️",
    label: "Email hỗ trợ",
    value: "hieudang21082004\n@gmail.com",
    note: "Gửi câu hỏi bất kỳ lúc nào.\nChúng tôi phản hồi trong vòng 24 giờ.",
    btnText: "Gửi email",
    btnIcon: "📧",
    href: "mailto:hieudang21082004@gmail.com",
  },
  {
    id: "fanpage",
    cardClass: "card-fanpage",
    icon: "👥",
    label: "Fanpage Facebook",
    value: "MathKids Vietnam",
    note: "Theo dõi tin tức, cập nhật tính năng\nvà nhắn tin trực tiếp cho chúng tôi.",
    btnText: "Nhắn tin trên Facebook",
    btnIcon: "💬",
    href: "https://www.facebook.com/profile.php?id=61594403957867",
  },
];

export default function Contact() {
  return (
    <main className="contact-page">
      {/* ── Navbar ─────────────────────────────────────── */}
      <header className="contact-nav">
        <BrandLogo className="landing-brand" to="/" />
        <Link className="contact-nav-back" to="/">
          ← Về trang chủ
        </Link>
      </header>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="contact-hero">
        <div className="contact-hero-pill">
          <span>🎧</span> Chăm sóc khách hàng
        </div>
        <h1>
          Chúng tôi luôn{" "}
          <span>sẵn sàng hỗ trợ</span> bạn
        </h1>
        <p>
          MathKids hỗ trợ phụ huynh và học sinh mọi thắc mắc về tài khoản,
          lộ trình học và thanh toán. Hãy liên hệ theo kênh phù hợp nhất với bạn.
        </p>
      </section>

      {/* ── Contact cards ──────────────────────────────── */}
      <section className="contact-cards-section" aria-label="Kênh liên hệ">
        <h2>
          Chọn kênh <span>liên hệ</span> phù hợp
        </h2>
        <div className="contact-cards-grid">
          {contactChannels.map((channel) => (
            <article
              className={`contact-card ${channel.cardClass}`}
              key={channel.id}
              id={`contact-${channel.id}`}
            >
              <div className="contact-card-icon">{channel.icon}</div>
              <div className="contact-card-label">{channel.label}</div>
              <div className="contact-card-value">
                {channel.value.split("\n").map((line, i) => (
                  <span key={i} style={{ display: "block" }}>{line}</span>
                ))}
              </div>
              <p className="contact-card-note">
                {channel.note.split("\n").map((line, i) => (
                  <span key={i} style={{ display: "block" }}>{line}</span>
                ))}
              </p>
              <a
                className="contact-card-btn"
                href={channel.href}
                target={channel.id === "fanpage" ? "_blank" : undefined}
                rel={channel.id === "fanpage" ? "noopener noreferrer" : undefined}
                id={`contact-btn-${channel.id}`}
                aria-label={channel.btnText}
              >
                <span>{channel.btnIcon}</span>
                {channel.btnText}
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* ── Info strip ─────────────────────────────────── */}
      <div className="contact-info-strip">
        <div className="contact-info-inner">
          <span>🕐</span>
          <div>
            <strong>Giờ hỗ trợ: Thứ Hai – Thứ Bảy, 8:00 – 21:00</strong>
            <p>
              Ngoài giờ hỗ trợ, bạn có thể gửi email hoặc nhắn tin trên
              Facebook — chúng tôi sẽ phản hồi vào sáng hôm sau.
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="contact-footer">
        <BrandLogo className="landing-brand" to="/" />
        <p>Học Toán vui hơn, tiến bộ mỗi ngày.</p>
        <div>
          <Link to="/">Trang chủ</Link>
          <Link to="/dang-nhap">Đăng nhập</Link>
          <Link to="/dang-ky">Đăng ký</Link>
        </div>
        <small>© 2026 MathKids</small>
      </footer>
    </main>
  );
}
