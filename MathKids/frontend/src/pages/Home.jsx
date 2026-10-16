import { useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import StudyArt, { StudyIcon } from "../components/StudyArt";
import "./Home.css";

const navItems = [["⌂", "Trang chủ", "#top"], ["▣", "Học tập", "#features"], ["⌁", "Trò chơi", "#games"], ["♜", "Thử thách", "#challenge"], ["▣", "Phần thưởng", "#rewards"]];
const featureCards = [
  { number: "1", icon: "book", title: "Bài học của em", text: "Xem hình, hiểu bài và cùng làm thử.", tone: "blue", href: "/hoc-tap" },
  { number: "2", icon: "game", title: "Trò chơi Toán", text: "Vui cùng những con số và hình học.", tone: "green", href: "/tro-choi" },
  { number: "3", icon: "flag", title: "Thử thách nhỏ", text: "Mỗi ngày thử sức với một câu hỏi mới.", tone: "yellow", href: "/dashboard#challenge" },
  { number: "4", icon: "gift", title: "Quà của em", text: "Ghi lại nỗ lực qua những ngôi sao và huy hiệu.", tone: "purple", href: "/phan-thuong" },
  { number: "5", icon: "leaf", title: "Cùng con học tập", text: "Góc riêng để phụ huynh theo dõi tiến bộ của con.", tone: "teal", href: "/parent/dashboard" },
];

function HeroArt() {
  return <div className="home-story-art"><StudyArt grade={1} /></div>;
}

function NotificationBell({ isAuthenticated }) {
  const [open, setOpen] = useState(false);
  return <div className="notification-wrap">
    <button className="notification-button" aria-label="Mở thông báo" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span>🔔</span><b>1</b></button>
    {open && <div className="notification-panel"><div className="notification-heading"><strong>Thông báo</strong><small>1 mới</small></div><div className="notification-item"><span>🎉</span><div><strong>Chào mừng đến MathKids!</strong><p>{isAuthenticated ? "Hãy tiếp tục hành trình học toán của bạn." : "Đăng nhập để nhận gợi ý học tập riêng cho bạn."}</p></div></div>{!isAuthenticated && <Link to="/dang-nhap" className="notification-action">Đăng nhập để xem thêm →</Link>}</div>}
  </div>;
}

function Home({ isAuthenticated = false, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <main className="home" id="top">
    <header className="navbar">
      <BrandLogo className="brand" to="/" />
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Mở menu">☰</button>
      <nav className={menuOpen ? "nav-links open" : "nav-links"}>{navItems.map(([icon, label, href], index) => <a className={index === 0 ? "active" : ""} href={href} key={label}><i>{icon}</i>{label}</a>)}</nav>
      <NotificationBell isAuthenticated={isAuthenticated} />
      {isAuthenticated ? <div className="profile"><span className="avatar">👦</span><span>Học sinh</span><b>⌄</b><button onClick={onLogout}>⇥ &nbsp;Đăng xuất</button></div> : <div className="auth-actions"><Link className="login-link" to="/dang-nhap">Đăng nhập</Link><Link className="register-link" to="/dang-ky">Đăng ký</Link></div>}
    </header>
    <section className="hero">
      <div className="hero-copy"><div className="hero-kicker">✦ Ứng dụng học toán dành cho trẻ em</div><h1>Toán học thật vui!</h1><h2><span>Học</span> – <em>Chơi</em> – <strong>Phát triển!</strong></h2><p>Cùng MathKids khám phá thế giới toán học<br className="desktop" /> qua những trò chơi thú vị, được cá nhân hóa<br className="desktop" /> phù hợp với khả năng của con!</p><a href="#features" className="start-btn"><span>▶</span> Bắt đầu học</a></div>
      <HeroArt /><span className="cloud cloud-left">☁</span><span className="cloud cloud-right">☁</span>
    </section>
    <section className="features" id="features"><div className="feature-grid">{featureCards.map(card => <article className={`feature-card ${card.tone}`} key={card.number}><div className="feature-icon"><StudyIcon name={card.icon} size={34} /></div><h3>{card.title}</h3><p>{card.text}</p><Link to={card.href} aria-label={`Mở ${card.title}`}><StudyIcon name="arrow" /></Link></article>)}</div></section>
    <section className="progress-message" id="games"><div className="sprout">✦</div><h2>Mỗi ngày một chút tiến bộ!</h2><p>MathKids – Đồng hành cùng con trên hành trình chinh phục toán học!</p><div className="stacked-books">▰<br />▰<br />▰</div></section>
    <section className="hidden-anchor" id="challenge" /><section className="hidden-anchor" id="rewards" />
  </main>;
}

export default Home;
