import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import "./Landing.css";

const benefits = [
  { icon: "✦", tone: "blue", title: "AI hiểu năng lực của con", text: "Đánh giá trình độ và gợi ý lộ trình học phù hợp với từng học sinh." },
  { icon: "🎮", tone: "green", title: "Học mà như đang chơi", text: "Bài học, trò chơi và thử thách giúp việc luyện Toán trở nên nhẹ nhàng hơn." },
  { icon: "🏆", tone: "yellow", title: "Có động lực mỗi ngày", text: "XP, ngôi sao và phần thưởng tạo cảm giác tiến bộ sau từng hoạt động." },
];

const steps = [
  { number: "01", title: "Đánh giá ban đầu", text: "Xác định mức độ phù hợp trước khi bắt đầu hành trình học." },
  { number: "02", title: "AI tạo lộ trình", text: "Nội dung học được sắp xếp theo năng lực và tiến độ của học sinh." },
  { number: "03", title: "Học • Chơi • Tiến bộ", text: "Hoàn thành bài học, thử thách và theo dõi sự tiến bộ qua từng ngày." },
];

export default function Landing() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <BrandLogo className="landing-brand" to="/" />
        <nav aria-label="Điều hướng landing page">
          <a href="#why">Vì sao MathKids?</a>
          <a href="#how">Cách hoạt động</a>
          <a href="#parents">Phụ huynh</a>
        </nav>
        <div className="landing-nav-actions">
          <Link className="landing-login" to="/dang-nhap">Đăng nhập</Link>
          <Link className="landing-register" to="/dang-ky">Học miễn phí <span>→</span></Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-pill"><span>✦</span> Nền tảng học Toán thông minh cho học sinh tiểu học</div>
          <h1>Mỗi bạn nhỏ đều có một <span>cách học Toán</span> riêng.</h1>
          <p>MathKids kết hợp AI, bài học trực quan và trò chơi để tạo hành trình học phù hợp với năng lực của từng học sinh.</p>
          <div className="landing-hero-actions">
            <Link className="landing-primary" to="/home">Khám phá MathKids <span>→</span></Link>
            <Link className="landing-secondary" to="/dang-nhap"><span className="play-dot">▶</span> Tôi đã có tài khoản</Link>
          </div>
          <div className="landing-proof">
            <span><b>✓</b> Cá nhân hóa bằng AI</span>
            <span><b>✓</b> Lớp 1–5</span>
            <span><b>✓</b> Học theo tiến độ riêng</span>
          </div>
        </div>

        <div className="landing-hero-visual" aria-label="Minh họa bảng học tập MathKids">
          <div className="hero-orbit orbit-one">＋</div>
          <div className="hero-orbit orbit-two">×</div>
          <div className="hero-orbit orbit-three">7</div>
          <div className="learning-window">
            <div className="learning-window-top"><span><i></i><i></i><i></i></span><b>MathKids</b><em>★ 125</em></div>
            <div className="learning-window-body">
              <div className="mini-sidebar"><span className="selected">⌂</span><span>▤</span><span>◆</span><span>♛</span></div>
              <div className="mini-content">
                <small>CHÀO BUỔI SÁNG, MINH!</small>
                <h3>Sẵn sàng học Toán chưa? 👋</h3>
                <div className="lesson-progress"><div><b>Phép cộng trong phạm vi 100</b><span>Tiến độ hôm nay</span></div><strong>75%</strong><i><u></u></i></div>
                <div className="mini-cards"><article><span>🧠</span><b>AI gợi ý</b><small>Bài học tiếp theo</small></article><article><span>🔥</span><b>5 ngày</b><small>Chuỗi học tập</small></article></div>
              </div>
            </div>
          </div>
          <div className="ai-float-card"><span>🤖</span><div><small>AI vừa cập nhật</small><b>Lộ trình phù hợp hơn!</b></div><i>✓</i></div>
          <div className="star-float-card"><span>★</span><div><b>+25 XP</b><small>Hoàn thành bài học</small></div></div>
        </div>
      </section>

      <section className="landing-strip">
        <p>Không chỉ là làm bài tập</p>
        <strong>MathKids biến mỗi buổi học thành một hành trình khám phá.</strong>
      </section>

      <section className="landing-section why-section" id="why">
        <div className="section-heading">
          <span>HỌC ĐÚNG CÁCH, TIẾN BỘ TỰ NHIÊN</span>
          <h2>Toán học dễ tiếp cận hơn khi<br />bài học <em>phù hợp với từng em.</em></h2>
          <p>Thay vì một lộ trình giống nhau cho tất cả, MathKids giúp học sinh luyện tập đúng nội dung mình cần.</p>
        </div>
        <div className="benefit-grid">
          {benefits.map((item) => <article className={`benefit-card ${item.tone}`} key={item.title}><div className="benefit-icon">{item.icon}</div><h3>{item.title}</h3><p>{item.text}</p><span className="benefit-arrow">↗</span></article>)}
        </div>
      </section>

      <section className="landing-section how-section" id="how">
        <div className="how-copy"><span className="section-kicker">BẮT ĐẦU RẤT ĐƠN GIẢN</span><h2>3 bước để xây dựng<br /><em>thói quen học Toán tốt.</em></h2><p>Học sinh không cần tự tìm bài phù hợp. MathKids giúp định hướng từ bước đầu tiên.</p><Link to="/dang-ky">Bắt đầu hành trình <span>→</span></Link></div>
        <div className="step-list">{steps.map((step) => <article key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></article>)}</div>
      </section>

      <section className="landing-section parent-section" id="parents">
        <div className="parent-card">
          <div className="parent-visual"><div className="report-card"><small>TIẾN ĐỘ TUẦN NÀY</small><div className="report-score"><strong>82%</strong><span>↗ 12%</span></div><div className="report-bars"><i style={{height:"42%"}}></i><i style={{height:"58%"}}></i><i style={{height:"48%"}}></i><i style={{height:"76%"}}></i><i style={{height:"90%"}}></i><i style={{height:"72%"}}></i><i style={{height:"84%"}}></i></div><p>Con đang tiến bộ tốt ở <b>Phép cộng</b> 🎉</p></div></div>
          <div className="parent-copy"><span>DÀNH CHO PHỤ HUYNH</span><h2>Biết con đang học gì.<br /><em>Hiểu con cần gì.</em></h2><p>Theo dõi kết quả học tập, điểm mạnh và những nội dung cần cải thiện để đồng hành cùng con đúng lúc.</p><div><span>✓ Báo cáo tiến độ</span><span>✓ Theo dõi kết quả</span><span>✓ Nhận diện điểm cần cải thiện</span></div></div>
        </div>
      </section>

      <section className="landing-final-cta">
        <span className="cta-symbol symbol-one">＋</span><span className="cta-symbol symbol-two">÷</span><span className="cta-symbol symbol-three">★</span>
        <small>SẴN SÀNG BẮT ĐẦU?</small>
        <h2>Cho con một hành trình học Toán<br /><span>vui hơn mỗi ngày.</span></h2>
        <p>Khám phá MathKids hoặc tạo tài khoản để bắt đầu học ngay.</p>
        <div><Link className="landing-primary" to="/dang-ky">Tạo tài khoản miễn phí <span>→</span></Link><Link className="landing-cta-home" to="/home">Xem trang học tập</Link></div>
      </section>

      <footer className="landing-footer"><BrandLogo className="landing-brand" to="/" /><p>Học Toán vui hơn, tiến bộ mỗi ngày.</p><div><Link to="/home">Trang chủ</Link><Link to="/dang-nhap">Đăng nhập</Link><Link to="/dang-ky">Đăng ký</Link></div><small>© 2026 MathKids</small></footer>
    </main>
  );
}
