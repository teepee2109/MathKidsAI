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

const elementaryVisuals = {
  addition: { title: "Gộp lại", equation: "3 + 2 = 5", groups: [{ label: "Có 3 quả", icons: ["🍎", "🍎", "🍎"] }, { label: "Thêm 2 quả", operator: "+", icons: ["🍎", "🍎"] }, { label: "Tất cả 5 quả", icons: ["🍎", "🍎", "🍎", "🍎", "🍎"] }] },
  subtraction: { title: "Lấy bớt", equation: "5 − 2 = 3", groups: [{ label: "Có 5 quả", icons: ["🍐", "🍐", "🍐", "🍐", "🍐"], crossed: 2 }, { label: "Còn lại", icons: ["🍐", "🍐", "🍐"] }] },
  multiplication: { title: "Các nhóm bằng nhau", equation: "3 nhóm × 2 quả = 6", groups: [{ label: "Nhóm 1", icons: ["🍊", "🍊"], boxed: true }, { label: "Nhóm 2", icons: ["🍊", "🍊"], boxed: true }, { label: "Nhóm 3", icons: ["🍊", "🍊"], boxed: true }] },
  division: { title: "Chia đều", equation: "6 quả chia 3 bạn = mỗi bạn 2 quả", groups: [{ label: "Bạn 1", icons: ["🍓", "🍓"], boxed: true }, { label: "Bạn 2", icons: ["🍓", "🍓"], boxed: true }, { label: "Bạn 3", icons: ["🍓", "🍓"], boxed: true }] },
  "place-value": { title: "Tách số thành các hàng", type: "place-value" },
  geometry: { title: "Nhận biết hình", type: "shapes" },
  measurement: { title: "Đo độ dài", type: "ruler" },
  time: { title: "Xem giờ trên đồng hồ", type: "clock" },
  "word-problems": { title: "Đọc chuyện bằng hình", equation: "3 túi, mỗi túi 2 quả → 6 quả", groups: [{ label: "Túi 1", icons: ["🍬", "🍬"], boxed: true }, { label: "Túi 2", icons: ["🍬", "🍬"], boxed: true }, { label: "Túi 3", icons: ["🍬", "🍬"], boxed: true }] },
  statistics: { title: "So sánh số lượng", type: "chart" },
};

function PlaceValuePicture({ grade }) {
  const isGradeTwo = Number(grade) === 2;
  const columns = isGradeTwo
    ? [{ name: "Trăm", count: 3, type: "hundred" }, { name: "Chục", count: 2, type: "ten" }, { name: "Đơn vị", count: 6, type: "unit" }]
    : [{ name: "Chục", count: 2, type: "ten" }, { name: "Đơn vị", count: 4, type: "unit" }];
  return <div className="elementary-place-value" aria-label={isGradeTwo ? "326 gồm 3 trăm, 2 chục và 6 đơn vị" : "24 gồm 2 chục và 4 đơn vị"}>
    {columns.map((column) => <div className="elementary-place-column" key={column.name}><strong>{column.name}</strong><div className="elementary-place-pieces">{Array.from({ length: column.count }, (_, index) => <span className={`is-${column.type}`} key={index}>{column.type === "unit" ? "●" : column.type === "hundred" ? "▦" : "▥"}</span>)}</div><small>{column.count} {column.name.toLocaleLowerCase("vi-VN")}</small></div>)}
    <b className="elementary-place-total">= {isGradeTwo ? "326" : "24"}</b>
  </div>;
}

function ElementaryVisualScene({ visual, grade }) {
  if (visual.type === "place-value") return <PlaceValuePicture grade={grade} />;
  if (visual.type === "shapes") return <div className="elementary-shape-row" aria-label="Hình tròn, hình tam giác, hình vuông và hình chữ nhật">{[["circle", "Hình tròn", "⚽"], ["triangle", "Tam giác", "🍕"], ["square", "Hình vuông", "🪟"], ["rectangle", "Chữ nhật", "📖"]].map(([shape, label, icon]) => <div className="elementary-shape-card" key={shape}><span className={`elementary-shape elementary-shape-${shape}`} aria-hidden="true">{icon}</span><small>{label}</small></div>)}</div>;
  if (visual.type === "ruler") return <div className="elementary-ruler-scene" aria-label="Thước có vạch số từ 0 đến 5 xăng-ti-mét"><span className="elementary-ruler-object">✏️</span><div className="elementary-ruler">{Array.from({ length: 6 }, (_, index) => <span key={index}><i />{index}</span>)}</div><strong>Đặt đầu bút ở số 0, rồi đọc số ở đầu kia.</strong></div>;
  if (visual.type === "clock") return <div className="elementary-clock-scene"><div className="elementary-clock" role="img" aria-label="Đồng hồ chỉ 4 giờ đúng">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--clock-index": index }} />)}<span className="elementary-clock-hour" /><span className="elementary-clock-minute" /></div><div><strong>4 giờ đúng</strong><small>Kim dài ở số 12 · kim ngắn ở số 4</small></div></div>;
  if (visual.type === "chart") return <div className="elementary-chart-scene" aria-label="Biểu đồ tranh so sánh số lượng táo và chuối"><div><span>🍎</span><b>{"🍎🍎🍎🍎"}</b><small>4 quả táo</small></div><div><span>🍌</span><b>{"🍌🍌"}</b><small>2 quả chuối</small></div><strong>Táo nhiều hơn!</strong></div>;
  return <div className={`elementary-object-groups ${visual.groups.length > 2 ? "has-many-groups" : ""}`}>
    {visual.groups.map((group, index) => <div className="elementary-object-group" key={`${group.label}-${index}`}>
      {group.operator && <b className="elementary-object-operator">{group.operator}</b>}
      <div className={`elementary-object-basket ${group.boxed ? "is-boxed" : ""}`}>
        <div className="elementary-object-icons">{group.icons.map((icon, itemIndex) => <span className={group.crossed > itemIndex ? "is-crossed" : ""} key={`${icon}-${itemIndex}`} aria-hidden="true">{icon}</span>)}</div>
        <small>{group.label}</small>
      </div>
      {index < visual.groups.length - 1 && !visual.groups[index + 1].operator && visual.groups.length <= 2 && <b className="elementary-object-operator">→</b>}
    </div>)}
    {visual.equation && <strong className="elementary-visual-equation">{visual.equation}</strong>}
  </div>;
}

/** Picture-first lesson support designed for early readers in grades 1–2. */
export function ElementaryLessonVisual({ topic, title = "", grade = 1 }) {
  const normalizedTopic = String(topic || "").toLocaleLowerCase("vi-VN");
  const normalizedTitle = String(title).toLocaleLowerCase("vi-VN");
  const knownTopic = Object.keys(elementaryVisuals).find((code) => normalizedTopic === code || normalizedTopic.includes(code));
  const inferredTopic = knownTopic || (normalizedTitle.includes("trừ") ? "subtraction"
    : normalizedTitle.includes("cộng") ? "addition"
      : normalizedTitle.includes("nhân") ? "multiplication"
        : normalizedTitle.includes("chia") ? "division"
          : normalizedTitle.includes("giá trị hàng") || normalizedTitle.includes("chục") || normalizedTitle.includes("đơn vị") ? "place-value"
            : normalizedTitle.includes("hình") ? "geometry"
              : normalizedTitle.includes("đo") ? "measurement"
                : normalizedTitle.includes("giờ") || normalizedTitle.includes("thời gian") ? "time"
                  : normalizedTitle.includes("lời văn") ? "word-problems"
                    : normalizedTitle.includes("thống kê") ? "statistics" : "addition");
  const visual = elementaryVisuals[inferredTopic] || elementaryVisuals.addition;
  return <figure className={`elementary-lesson-visual is-${inferredTopic}`} aria-label={`${visual.title}${visual.equation ? `: ${visual.equation}` : ""}`}>
    <figcaption><span aria-hidden="true">🖍️</span> {visual.title}</figcaption>
    <ElementaryVisualScene visual={visual} grade={grade} />
  </figure>;
}

const storyObjects = [
  { words: ["táo", "cam"], icon: "🍎", name: "quả" },
  { words: ["bánh", "bữa"], icon: "🧁", name: "chiếc bánh" },
  { words: ["kẹo", "túi"], icon: "🍬", name: "viên kẹo" },
  { words: ["hoa", "bông"], icon: "🌼", name: "bông hoa" },
  { words: ["bút", "nhãn vở"], icon: "✏️", name: "chiếc bút" },
  { words: ["sách", "quyển"], icon: "📚", name: "quyển sách" },
  { words: ["vỏ sò"], icon: "🐚", name: "vỏ sò" },
  { words: ["lá"], icon: "🍃", name: "chiếc lá" },
  { words: ["ghế"], icon: "🪑", name: "chiếc ghế" },
  { words: ["đĩa"], icon: "🍽️", name: "chiếc đĩa" },
  { words: ["bi"], icon: "🔵", name: "viên bi" },
  { words: ["bóng"], icon: "⚽", name: "quả bóng" },
  { words: ["chim"], icon: "🐦", name: "con chim" },
  { words: ["cá"], icon: "🐟", name: "con cá" },
  { words: ["khối", "que tính"], icon: "🧱", name: "khối" },
];

function getSmallPromptNumbers(text) {
  const matches = String(text || "").match(/\d+(?:[ .]\d{3})*(?:,\d+)?/g) || [];
  const numbers = matches.map((value) => Number(value.replace(/[ .]/g, "").replace(",", ".")));
  return numbers.length === 2 && numbers.every((value) => Number.isInteger(value) && value > 0 && value <= 100)
    ? numbers : null;
}

/** A picture cue for early readers; it shows quantities from the story, never the answer. */
export function EarlyPracticeIllustration({ topic, questionText }) {
  const supportedTopics = ["addition", "subtraction", "multiplication", "division", "word-problems", "geometry", "measurement", "time"];
  if (!supportedTopics.includes(topic)) return null;

  const prompt = String(questionText || "");
  const lowerPrompt = prompt.toLocaleLowerCase("vi-VN");
  if (topic === "geometry") {
    const spatialScene = lowerPrompt.includes("ngồi giữa")
      ? <div className="early-practice-position"><span>👧 Bình</span><b>↔</b><strong>🧒 An</strong><b>↔</b><span>👦 Chi</span></div>
      : lowerPrompt.includes("dưới bàn")
        ? <div className="early-practice-position is-vertical"><span>🪑 Mặt bàn</span><b>⬇</b><strong>⚽ Quả bóng</strong></div>
        : lowerPrompt.includes("tay trái")
          ? <div className="early-practice-position"><b>⬅ Tay trái</b><strong>🧍 Em</strong><span>Phía trước 👀</span></div>
          : null;
    const solids = /khối|lon nước|hộp quà/.test(lowerPrompt);
    const cards = solids ? [["⚽", "Khối cầu"], ["🥫", "Khối trụ"], ["🎁", "Khối hộp"]]
      : [["⚽", "Hình tròn"], ["🔺", "Tam giác"], ["🟩", "Hình vuông"], ["📖", "Chữ nhật"]];
    return <figure className="early-practice-illustration is-geometry">
      <figcaption><span aria-hidden="true">🔷</span> {spatialScene ? "Hình dung vị trí" : "Nhìn đặc điểm của hình"}</figcaption>
      {spatialScene || <div className="early-practice-shapes" aria-label={solids ? "Khối cầu, khối trụ, khối hộp" : "Hình tròn, tam giác, hình vuông và hình chữ nhật"}>
        {cards.map(([icon, label]) => <span key={label}><b aria-hidden="true">{icon}</b><small>{label}</small></span>)}
      </div>}
      <small className="early-practice-hint">{spatialScene ? "Quan sát vị trí của từng vật trước khi chọn." : "Đếm cạnh, góc hoặc quan sát đường cong để chọn hình phù hợp."}</small>
    </figure>;
  }
  if (topic === "time") {
    if (!/kim giờ|kim phút/.test(lowerPrompt)) return null;
    const hour = Number(lowerPrompt.match(/kim giờ(?: vừa qua)?(?: chỉ)?(?: số)?\s*(\d{1,2})/)?.[1] || 4) % 12;
    const minuteMark = Number(lowerPrompt.match(/kim phút(?: chỉ)?(?: số)?\s*(\d{1,2})/)?.[1] || 12) % 12;
    const minutes = minuteMark * 5;
    return <figure className="early-practice-illustration is-time">
      <figcaption><span aria-hidden="true">🕒</span> Quan sát hai kim đồng hồ</figcaption>
      <div className="early-practice-clock-face" role="img" aria-label={`Mặt đồng hồ minh họa, kim giờ gần số ${hour || 12} và kim phút ở vạch ${minutes} phút`}>
        {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--clock-index": index }} />)}
        <span className="elementary-clock-hour" style={{ transform: `rotate(${hour * 30 + minutes * 0.5}deg)` }} />
        <span className="elementary-clock-minute" style={{ transform: `rotate(${minutes * 6}deg)` }} />
      </div>
      <small className="early-practice-hint">Kim ngắn chỉ giờ · kim dài chỉ phút.</small>
    </figure>;
  }
  const numbers = getSmallPromptNumbers(prompt);
  if (!numbers) return null;
  if (topic === "measurement") {
    if (!/dài hơn|ngắn hơn|vật nào dài|so sánh độ dài/.test(lowerPrompt)) return null;
    const [first, second] = numbers;
    return <figure className="early-practice-illustration is-measurement">
      <figcaption><span aria-hidden="true">📏</span> So sánh độ dài bằng hình</figcaption>
      <div className="early-practice-measure-bars">{[first, second].map((length, index) => <div key={`${length}-${index}`}><small>{index === 0 ? "Vật thứ nhất" : "Vật thứ hai"} · {length}</small><span style={{ "--measure-width": `${Math.max(24, Math.min(260, length * 5))}px` }} /><i>{Array.from({ length: Math.min(length, 12) + 1 }, (_, tick) => <b key={tick}>{tick === 0 || tick === Math.min(length, 12) ? tick : ""}</b>)}</i></div>)}</div>
      <small className="early-practice-hint">Đặt hai đầu cùng vạch 0 rồi so sánh vạch cuối.</small>
    </figure>;
  }
  let operation = topic;
  if (topic === "word-problems") {
    if (/chia đều|chia mỗi|xếp.*mỗi|chia thành/.test(lowerPrompt)) operation = "division";
    else if (/mỗi nhóm|mỗi bạn|mỗi bàn|mỗi đĩa|mỗi hàng/.test(lowerPrompt)) operation = "multiplication";
    else if (/còn lại|bay đi|cho bạn|bớt|nhiều hơn|ít hơn/.test(lowerPrompt)) operation = "subtraction";
    else if (/thêm|tất cả|cả hai|gộp/.test(lowerPrompt)) operation = "addition";
    else return null;
  }
  if (operation === "multiplication" && !/mỗi|nhóm|hàng|đĩa|túi|bàn/.test(lowerPrompt)) return null;

  const object = storyObjects.find((candidate) => candidate.words.some((word) => lowerPrompt.includes(word))) || { icon: "⭐", name: "ngôi sao" };
  const [first, second] = numbers;
  const renderObjects = (count, crossed = 0) => {
    if (count > 12) {
      const tens = Math.floor(count / 10);
      const ones = count % 10;
      return <><span className="early-practice-bundle" aria-hidden="true">🧺 × {tens} bó 10</span>{Array.from({ length: ones }, (_, index) => <span key={index} className="is-loose" aria-hidden="true">{object.icon}</span>)}{crossed > 0 && <small className="early-practice-cross-note">Lấy đi {crossed}</small>}</>;
    }
    return Array.from({ length: count }, (_, index) =>
      <span key={index} className={index < crossed ? "is-crossed" : ""} aria-hidden="true">{object.icon}</span>);
  };

  let scene;
  if (operation === "multiplication" && first <= 6 && second <= 6) {
    scene = <div className="early-practice-array" aria-label={`${first} nhóm, mỗi nhóm ${second} ${object.name}`}>
      {Array.from({ length: first }, (_, groupIndex) => <div className="early-practice-basket" key={groupIndex}>
        {renderObjects(second)}<small>Nhóm {groupIndex + 1}</small>
      </div>)}
    </div>;
  } else if (operation === "division") {
    scene = <div className="early-practice-sharing" aria-label={`${first} ${object.name} cần chia cho ${second} bạn hoặc nhóm`}>
      <div className="early-practice-pile">{renderObjects(first)}<small>{first} {object.name}</small></div>
      <b aria-hidden="true">→</b>
      <div className="early-practice-recipients">{Array.from({ length: second }, (_, index) => <span key={index} aria-hidden="true">🧺</span>)}<small>Chia đều</small></div>
    </div>;
  } else if (operation === "subtraction") {
    scene = <div className="early-practice-pile is-subtraction">{renderObjects(first, Math.min(second, first))}<small>Có {first} {object.name}; lấy đi {second}</small></div>;
  } else {
    scene = <div className="early-practice-sets">
      {[first, second].map((count, index) => <div className="early-practice-pile" key={`${count}-${index}`}>
        {renderObjects(count)}<small>{index === 0 ? "Nhóm thứ nhất" : "Nhóm thứ hai"} · {count}</small>
      </div>)}
      <b aria-hidden="true">{operation === "addition" ? "+" : "↔"}</b>
    </div>;
  }

  return <figure className={`early-practice-illustration is-${operation}`}>
    <figcaption><span aria-hidden="true">🎨</span> Cùng hình dung câu chuyện</figcaption>
    {scene}
    <small className="early-practice-hint">Hình giúp em tưởng tượng số lượng — em hãy tự chọn cách tính nhé.</small>
  </figure>;
}

export default function StudyArt({ grade = 1, className = "" }) {
  return <div className={`study-art study-art-grade-${grade} ${className}`}>{grade <= 2 ? <BunnyArt /> : <MathPicture grade={grade} caption={false} />}</div>;
}

