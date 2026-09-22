import { useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const navItems = [["⌂", "Trang chủ", "#top"], ["▣", "Học tập", "#features"], ["⌁", "Trò chơi", "#games"], ["♜", "Thử thách", "#challenge"], ["▣", "Phần thưởng", "#rewards"]];
const featureCards = [
  { number: "1", icon: "🤖", title: "Học tập\ncá nhân hóa", text: "AI sẽ phân tích khả năng của con và tạo lộ trình học phù hợp nhất.", tone: "blue" },
  { number: "2", icon: "🎮", title: "Trò chơi toán học", text: "Học toán qua các trò chơi vui nhộn, hấp dẫn và đầy thử thách.", tone: "green" },
  { number: "3", icon: "📅", title: "Thử thách hàng ngày", text: "Hoàn thành thử thách mỗi ngày để rèn luyện kỹ năng và nhận phần thưởng.", tone: "yellow" },
  { number: "4", icon: "🪙", title: "Phần thưởng", text: "Tích lũy điểm thưởng, mở khóa huy hiệu và nhận quà hấp dẫn.", tone: "purple" },
  { number: "5", icon: "📊", title: "Báo cáo tiến độ\ncho phụ huynh", text: "Theo dõi kết quả học tập, biết được điểm mạnh và cần cải thiện của con.", tone: "teal" },
];

function HeroArt() {
  return <div className="hero-art" aria-label="Hai bạn nhỏ đang học toán">
    <span className="math-float plus one">＋</span><span className="math-float plus two">＋</span><span className="math-float times">×</span><span className="math-float equal">＝</span>
    <div className="kid kid-boy"><div className="hair">◜◝</div><div className="face">◕‿◕</div><div className="shirt">◡</div></div>
    <div className="kid kid-girl"><div className="hair">◜◝</div><div className="face">◕‿◕</div><div className="shirt">◡</div></div>
    <div className="book"><span>1</span><span>2</span><span>3</span><b>＋ −</b></div><div className="star-mascot">★<small>⌒</small></div>
  </div>;
}

function Home({ isAuthenticated = false, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <main className="home" id="top">
    <header className="navbar">
      <a className="brand" href="#top"><span className="brand-star">★</span><span>Math<span>Kids</span></span></a>
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Mở menu">☰</button>
      <nav className={menuOpen ? "nav-links open" : "nav-links"}>{navItems.map(([icon, label, href], index) => <a className={index === 0 ? "active" : ""} href={href} key={label}><i>{icon}</i>{label}</a>)}</nav>
      {isAuthenticated ? <div className="profile"><span className="avatar">👦</span><span>Học sinh</span><b>⌄</b><button onClick={onLogout}>⇥ &nbsp;Đăng xuất</button></div> : <div className="auth-actions"><Link className="login-link" to="/dang-nhap">Đăng nhập</Link><Link className="register-link" to="/dang-ky">Đăng ký</Link></div>}
    </header>
    <section className="hero">
      <div className="hero-copy"><div className="hero-kicker">✦ Ứng dụng học toán dành cho trẻ em</div><h1>Toán học thật vui!</h1><h2><span>Học</span> – <em>Chơi</em> – <strong>Phát triển!</strong></h2><p>Cùng MathKids khám phá thế giới toán học<br className="desktop" /> qua những trò chơi thú vị, được cá nhân hóa<br className="desktop" /> phù hợp với khả năng của con!</p><a href="#features" className="start-btn"><span>▶</span> Bắt đầu học</a></div>
      <HeroArt /><span className="cloud cloud-left">☁</span><span className="cloud cloud-right">☁</span>
    </section>
    <section className="features" id="features"><div className="feature-grid">{featureCards.map(card => <article className={`feature-card ${card.tone}`} key={card.number}><span className="card-number">{card.number}</span><div className="feature-icon">{card.icon}</div><h3>{card.title.split("\n").map((t, i) => <span key={t}>{i > 0 && <br />}{t}</span>)}</h3><p>{card.text}</p><a href="#top" aria-label={card.title}>→</a></article>)}</div></section>
    <section className="progress-message" id="games"><div className="sprout">✦</div><h2>Mỗi ngày một chút tiến bộ!</h2><p>MathKids – Đồng hành cùng con trên hành trình chinh phục toán học!</p><div className="stacked-books">▰<br />▰<br />▰</div></section>
    <section className="hidden-anchor" id="challenge" /><section className="hidden-anchor" id="rewards" />
  </main>;
}

export default Home;
