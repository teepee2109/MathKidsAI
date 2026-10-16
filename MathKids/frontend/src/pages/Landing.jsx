import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import StudyArt, { MathPicture, StudyIcon } from "../components/StudyArt";
import "./Landing.css";

const benefits = [
  { icon: "book", title: "Hiểu bài qua hình ảnh", text: "Những con số trở nên gần gũi qua đồ vật, hình vẽ và ví dụ từng bước." },
  { icon: "game", title: "Luyện Toán thật vui", text: "Khám phá những trò chơi nhỏ và thử sức với điều vừa học." },
  { icon: "leaf", title: "Tiến bộ theo nhịp riêng", text: "Bài học phù hợp với lớp và kết quả học tập của mỗi bạn nhỏ." },
];

export default function Landing() {
  return <main className="landing-page">
    <header className="landing-nav">
      <BrandLogo className="landing-brand" to="/" />
      <nav aria-label="Giới thiệu MathKids"><a href="#why">Góc học nhỏ</a><a href="#how">Cách học</a><a href="#parents">Phụ huynh</a><Link to="/lien-he">Liên hệ</Link></nav>
      <div className="landing-nav-actions"><Link className="landing-login" to="/dang-nhap">Đăng nhập</Link><Link className="landing-register" to="/dang-ky">Bắt đầu học<StudyIcon name="arrow" size={18} /></Link></div>
    </header>
    <section className="landing-hero">
      <div className="landing-hero-copy"><div className="landing-pill"><StudyIcon name="leaf" size={17} />Góc học Toán cho học sinh lớp 1–5</div><h1>Mở trang sách nhỏ.<br /><span>Khám phá điều hay.</span></h1><p>Cùng MathKids học Toán qua hình ảnh, những ví dụ dễ hiểu và trò chơi thú vị. Mỗi ngày một chút, mỗi bài học một niềm vui.</p><div className="landing-hero-actions"><Link className="landing-primary" to="/dang-ky">Cùng bắt đầu<StudyIcon name="arrow" size={20} /></Link><Link className="landing-secondary" to="/home">Xem góc học<StudyIcon name="book" size={20} /></Link></div><div className="landing-proof"><span><StudyIcon name="check" size={16} />Bài học theo lớp</span><span><StudyIcon name="check" size={16} />Học theo nhịp riêng</span></div></div>
      <div className="landing-story-art"><StudyArt grade={1} /><div className="landing-art-note"><StudyIcon name="book" size={20} /><span>Hôm nay, mình học gì nhỉ?</span></div></div>
    </section>
    <section className="landing-strip"><StudyIcon name="leaf" /><strong>Mỗi bạn nhỏ có một nhịp học. Mỗi bước nhỏ đều đáng tự hào.</strong></section>
    <section className="landing-section why-section" id="why"><div className="section-heading"><span>Góc học nhỏ, niềm vui lớn</span><h2>Toán học bắt đầu từ<br /><em>những điều quen thuộc.</em></h2></div><div className="benefit-grid">{benefits.map(item => <article className="benefit-card" key={item.title}><div className="benefit-icon"><StudyIcon name={item.icon} size={28} /></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>
    <section className="landing-section study-grade-section" aria-label="Bài học cho từng lớp"><div className="section-heading"><span>Lớn lên cùng em</span><h2>Mỗi lớp, một điều hay để học.</h2><p>Từ đếm đồ vật đến hình học và phần trăm.</p></div><div className="study-grade-grid">{[{grade:1,title:"Làm quen con số"},{grade:2,title:"Chục và đơn vị"},{grade:3,title:"Nhân và chia"},{grade:4,title:"Khám phá phân số"},{grade:5,title:"Toán trong cuộc sống"}].map(item => <Link key={item.grade} to="/dang-ky" className="study-grade-card"><span>Lớp {item.grade}</span><MathPicture grade={item.grade} caption={false} /><strong>{item.title}</strong><StudyIcon name="arrow" size={18} /></Link>)}</div></section>
    <section className="landing-section how-section" id="how"><div className="how-copy"><span className="section-kicker">Cùng học, từng bước một</span><h2>Nhìn hình. Hiểu bài.<br /><em>Tự mình làm được.</em></h2><p>Mỗi bài học có kiến thức, ví dụ và phần tự luyện để con làm quen rồi tự tin thử sức.</p><Link to="/dang-ky">Mở góc học của con<StudyIcon name="arrow" size={18} /></Link></div><div className="step-list">{[{number:"1",title:"Cùng khám phá",text:"Tìm hiểu kiến thức qua lời giải thích và hình minh họa."},{number:"2",title:"Xem ví dụ",text:"Theo dõi cách giải từng bước để hiểu bài."},{number:"3",title:"Em thử nhé",text:"Làm bài luyện tập và xem lại lời giải."}].map(step => <article key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></article>)}</div></section>
    <section className="landing-section parent-section" id="parents"><div className="parent-card"><div className="study-parent-illustration"><StudyIcon name="book" size={48} /><div className="study-parent-lines"><span>Hôm nay con học được gì?</span><span><StudyIcon name="check" size={18} />Bài học đã hoàn thành</span><span><StudyIcon name="check" size={18} />Những phần cần luyện thêm</span><span><StudyIcon name="check" size={18} />Kết quả và sự tiến bộ</span></div></div><div className="parent-copy"><span>Dành cho phụ huynh</span><h2>Hiểu con học thế nào.<br /><em>Đồng hành đúng lúc.</em></h2><p>Theo dõi bài đã học, kết quả luyện tập và những kiến thức con cần củng cố trong khu vực riêng dành cho phụ huynh.</p><Link className="study-text-link" to="/dang-ky">Cùng con bắt đầu<StudyIcon name="arrow" size={18} /></Link></div></div></section>
    <section className="landing-final-cta"><StudyIcon name="leaf" size={32} /><h2>Một chút Toán.<br /><span>Một niềm vui mỗi ngày.</span></h2><p>Góc học nhỏ của con đang chờ.</p><div><Link className="landing-primary" to="/dang-ky">Tạo tài khoản miễn phí<StudyIcon name="arrow" size={20} /></Link><Link className="landing-cta-home" to="/dang-nhap">Con đã có tài khoản</Link></div></section>
    <footer className="landing-footer"><BrandLogo className="landing-brand" to="/" /><p>Cùng em lớn lên qua từng bài học.</p><div><Link to="/home">Góc học</Link><Link to="/lien-he">Liên hệ & hỗ trợ</Link><Link to="/dang-nhap">Đăng nhập</Link></div><small>© 2026 MathKids</small></footer>
  </main>;
}
