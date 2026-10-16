/** Presentation-only illustrations. They never infer or answer an exercise. */
export function StudyIcon({ name = "book", size = 24, ...props }) {
  const paths = {
    book: <><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z" /><path d="M12 6v14M6 9h3m-3 4h3m6-4h3m-3 4h3" /></>,
    home: <><path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7" /></>,
    game: <><path d="M7 7h10c4 0 6 13 3 13-2 0-4-4-5-4H9c-1 0-3 4-5 4-3 0-1-13 3-13Z" /><path d="M6 11v5m-2.5-2.5h5M16 11h.01M19 14h.01" /></>,
    gift: <><path d="M3 9h18v4H3zM5 13v8h14v-8M12 9v12" /><path d="M12 9C3 9 5 1 9 4c2 1 3 5 3 5Zm0 0c9 0 7-8 3-5-2 1-3 5-3 5Z" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01" /></>,
    flag: <><path d="M5 22V3m0 1c5-4 9 4 15 0v11c-6 4-10-4-15 0" /></>,
    leaf: <><path d="M20 3C7 1 1 10 7 17S23 13 20 3ZM4 21 16 9" /></>,
    shapes: <><path d="m6 3 4 7H2Z" /><circle cx="17" cy="7" r="4" /><rect x="4" y="14" width="8" height="8" rx="1" /><path d="m18 13 5 5-5 5-5-5Z" /></>,
    ruler: <><path d="m3 17 14-14 4 4L7 21ZM7 13l2 2m2-6 2 2m2-6 2 2" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 22v-2a8 8 0 0 1 16 0v2" /></>,
  };
  return <svg className="study-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.book}</svg>;
}

function Apple({ x, y, muted = false }) {
  return <g transform={`translate(${x} ${y})`} opacity={muted ? .25 : 1}><path d="M0 4C-23-8-26 10-19 24c7 15 15 11 19 10 5 1 13 5 20-10C27 10 23-8 0 4Z" fill="var(--art-coral)" /><path d="M0 3C-1-8 6-14 14-10 12-3 7 1 0 3Z" fill="var(--art-green)" /><path d="M-14 9q-5 6-1 12" fill="none" stroke="var(--art-paper)" strokeWidth="3" strokeLinecap="round" opacity=".6" /></g>;
}

export function BunnyArt() {
  return <img className="bunny-art" src="/illustrations/bunny-number-garden.png" width="1254" height="1254" alt="Thỏ Nâu cầm bảng số 1 2 3, cùng quả táo và những ngôi sao" decoding="async" />;
}
const gradeTopics = { 1: "addition", 2: "place-value", 3: "multiplication", 4: "fractions", 5: "percentage" };

export function MathPicture({ grade = 1, topic, className = "", caption = true }) {
  const kind = topic || gradeTopics[grade] || "addition";
  let drawing;
  let label;
  if (["addition", "subtraction"].includes(kind)) {
    const subtract = kind === "subtraction";
    label = subtract ? "5 quả táo, bớt 2 quả, còn 3 quả. Ví dụ: 5 trừ 2 bằng 3." : "3 quả táo cộng 2 quả táo bằng 5 quả táo.";
    drawing = <>{subtract ? <><rect x="15" y="35" width="330" height="120" rx="20" fill="var(--art-soft)" />{[55, 117, 179, 241, 303].map((x, i) => <g key={x}><Apple x={x} y={80} muted={i >= 3} />{i >= 3 && <path d={`m${x - 19} 79 38 37m-38 0 38-37`} stroke="var(--art-brown)" strokeWidth="2" />}</g>)}</> : <><rect x="15" y="35" width="158" height="120" rx="20" fill="var(--art-soft)" /><rect x="207" y="35" width="138" height="120" rx="20" fill="var(--art-soft)" />{[48, 96, 144].map(x => <Apple x={x} y={80} key={x} />)}{[250, 300].map(x => <Apple x={x} y={80} key={x} />)}<text x="190" y="109" textAnchor="middle" className="math-picture-operator">+</text></>}<text x="180" y="204" textAnchor="middle" className="math-picture-equation">{subtract ? "5 − 2 = 3" : "3 + 2 = 5"}</text></>;
  } else if (kind === "place-value") {
    label = "24 gồm 2 chục và 4 đơn vị.";
    drawing = <><text x="113" y="35" textAnchor="middle" className="math-picture-label">Chục</text><text x="255" y="35" textAnchor="middle" className="math-picture-label">Đơn vị</text>{[86, 116].map(x => <g key={x}>{Array.from({ length: 10 }, (_, i) => <rect key={i} x={x} y={52 + i * 10} width="21" height="8" rx="2" fill="var(--art-gold)" />)}</g>)}{[0, 1, 2, 3].map(i => <rect key={i} x={224 + i % 2 * 34} y={76 + Math.floor(i / 2) * 34} width="26" height="26" rx="5" fill="var(--art-green)" />)}<text x="180" y="204" textAnchor="middle" className="math-picture-equation">2 chục + 4 đơn vị = 24</text></>;
  } else if (["multiplication", "division"].includes(kind)) {
    label = "3 nhóm, mỗi nhóm có 2 quả táo. Tổng cộng 6 quả.";
    drawing = <>{[24, 138, 252].map(x => <g key={x}><rect x={x} y="45" width="90" height="112" rx="18" fill="var(--art-soft)" /><Apple x={x + 28} y={80} /><Apple x={x + 65} y={80} /></g>)}<text x="180" y="204" textAnchor="middle" className="math-picture-equation">{kind === "division" ? "6 : 3 = 2" : "2 + 2 + 2 = 6"}</text></>;
  } else if (["fractions", "fraction"].includes(kind)) {
    label = "Một thanh chia thành 4 phần bằng nhau, tô màu 3 phần: ba phần tư.";
    drawing = <><rect x="14" y="55" width="332" height="87" rx="12" fill="var(--art-cream)" />{[0, 1, 2, 3].map(i => <rect key={i} x={24 + i * 80} y="65" width="74" height="67" rx="5" fill={i < 3 ? "var(--art-green)" : "var(--art-paper)"} />)}<text x="180" y="184" textAnchor="middle" className="math-picture-equation">3 trong 4 phần</text><text x="180" y="218" textAnchor="middle" className="math-picture-label">Ba phần tư · 3/4</text></>;
  } else if (kind === "percentage") {
    label = "Bảng 100 ô, có 25 ô tô màu, tương ứng 25 phần trăm.";
    drawing = <><rect x="79" y="7" width="198" height="198" rx="10" fill="var(--art-cream)" />{Array.from({ length: 100 }, (_, i) => <rect key={i} x={89 + i % 10 * 18} y={17 + Math.floor(i / 10) * 18} width="15" height="15" rx="2" fill={i < 25 ? "var(--art-green)" : "var(--art-paper)"} />)}<text x="180" y="230" textAnchor="middle" className="math-picture-equation">25 / 100 = 25%</text></>;
  } else if (["measurement", "time"].includes(kind)) {
    label = "Đồng hồ minh họa 3 giờ và thước chia vạch.";
    drawing = <><circle cx="180" cy="107" r="69" fill="var(--art-paper)" stroke="var(--art-green)" strokeWidth="4" />{Array.from({ length: 12 }, (_, i) => <circle key={i} cx={180 + Math.sin(i * Math.PI / 6) * 56} cy={107 - Math.cos(i * Math.PI / 6) * 56} r="2.5" fill="var(--art-brown)" />)}<path d="M180 56v51h36" stroke="var(--art-green)" strokeWidth="5" fill="none" strokeLinecap="round" /><rect x="44" y="199" width="272" height="25" rx="4" fill="var(--art-gold)" />{Array.from({ length: 17 }, (_, i) => <path key={i} d={`M${52 + i * 16} 199v${i % 2 ? 7 : 13}`} stroke="var(--art-brown)" strokeWidth="1.5" />)}</>;
  } else {
    label = "Các hình học: hình tròn, hình tam giác và hình vuông.";
    drawing = <><circle cx="84" cy="100" r="40" fill="var(--art-gold)" /><path d="m190 53 47 87h-94Z" fill="var(--art-coral)" /><rect x="263" y="63" width="70" height="70" rx="6" fill="var(--art-green)" /><text x="84" y="185" textAnchor="middle" className="math-picture-label">Hình tròn</text><text x="190" y="185" textAnchor="middle" className="math-picture-label">Tam giác</text><text x="298" y="185" textAnchor="middle" className="math-picture-label">Hình vuông</text></>;
  }
  return <figure className={`math-picture ${className}`}><svg viewBox="0 0 360 250" role="img" aria-label={label}>{drawing}</svg>{caption && <figcaption>Ví dụ bằng hình</figcaption>}</figure>;
}

export default function StudyArt({ grade = 1, className = "" }) {
  return <div className={`study-art study-art-grade-${grade} ${className}`}>{grade <= 2 ? <BunnyArt /> : <MathPicture grade={grade} caption={false} />}</div>;
}

