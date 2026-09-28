import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCachedUser } from "../authStorage";
import { claimArcadeReward } from "../services/questions";
import "./ArcadeMathGames.css";

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createEquation(grade, usedAnswers) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let left;
    let right;
    let answer;
    let operator = "+";
    if (grade === 1) {
      const subtract = Math.random() < 0.35;
      left = randomInt(2, 19); right = randomInt(1, subtract ? left : 20 - left); operator = subtract ? "−" : "+"; answer = subtract ? left - right : left + right;
    } else if (grade === 2) {
      const kind = randomInt(0, 2);
      if (kind === 0) { left = randomInt(10, 80); right = randomInt(5, 100 - left); answer = left + right; }
      else if (kind === 1) { left = randomInt(20, 99); right = randomInt(5, left); operator = "−"; answer = left - right; }
      else { right = Math.random() < 0.5 ? 2 : 5; left = randomInt(2, 10) * right; operator = Math.random() < 0.5 ? "×" : "÷"; if (operator === "×") { const factor = randomInt(2, 10); left = factor; answer = factor * right; } else answer = left / right; }
    } else if (grade === 3) {
      const divide = Math.random() < 0.35;
      if (divide) { answer = randomInt(2, 10); right = randomInt(2, 10); left = answer * right; operator = "÷"; }
      else { left = randomInt(2, 10); right = randomInt(2, 10); answer = left * right; operator = "×"; }
    } else if (grade === 4) {
      const denominator = [2, 3, 4, 5, 8, 10][randomInt(0, 5)];
      const first = randomInt(1, denominator - 1); const second = randomInt(1, denominator - 1);
      left = `${first}/${denominator}`; right = `${second}/${denominator}`;
      operator = Math.random() < 0.5 ? "+" : "−";
      const numerator = operator === "+" ? first + second : Math.abs(first - second);
      answer = `${numerator}/${denominator}`;
      if (operator === "−" && first < second) [left, right] = [right, left];
    } else {
      const kind = randomInt(0, 4);
      if (kind === 0) { left = randomInt(10, 90) / 10; right = randomInt(1, 90) / 10; answer = Math.round((left + right) * 100) / 100; }
      else if (kind === 1) { left = randomInt(20, 99) / 10; right = randomInt(1, Math.floor(left * 10)) / 10; answer = Math.round((left - right) * 100) / 100; operator = "−"; }
      else if (kind === 2) { left = randomInt(10, 50) / 10; right = randomInt(2, 9); answer = Math.round(left * right * 10) / 10; operator = "×"; }
      else if (kind === 3) { right = randomInt(2, 9); answer = randomInt(10, 90) / 10; left = Math.round(answer * right * 10) / 10; operator = "÷"; }
      else { const percent = [10, 20, 25, 50][randomInt(0, 3)]; right = ""; operator = ""; left = `${percent}% của ${randomInt(2, 10) * 100}`; answer = Number(left.match(/\d+$/)[0]) * percent / 100; }
    }
    if (!usedAnswers.has(String(answer))) return { expression: right === "" ? left : `${left} ${operator} ${right}`, answer };
  }
  return { expression: "8 + 7", answer: 15 };
}

function makeMemoryDeck(grade) {
  const used = new Set();
  return Array.from({ length: 6 }, (_, index) => {
    const pair = createEquation(grade, used);
    used.add(String(pair.answer));
    return [
      { id: `${index}-equation`, pair: index, text: `${pair.expression} = ?`, type: "equation" },
      { id: `${index}-answer`, pair: index, text: String(pair.answer), type: "answer" },
    ];
  }).flat().sort(() => Math.random() - 0.5);
}

function makeGardenRound(grade, index) {
  const operation = grade === 1 ? "+" : grade === 2 ? ["+", "×", "×"][index] : grade === 3 ? "×" : grade === 4 ? "fraction" : "+ thập phân";
  const min = grade === 1 ? 1 : grade === 2 ? 10 : grade === 5 ? 10 : 2;
  const max = grade === 1 ? 10 : grade === 2 ? 50 : grade === 3 ? 10 : grade === 4 ? 8 : 99;
  const denominator = grade === 4 ? [4, 5, 8, 10][randomInt(0, 3)] : 1;
  const first = grade === 5 ? randomInt(min, max) / 10 : grade === 4 ? randomInt(1, denominator - 1) / denominator : grade === 2 && operation === "×" ? randomInt(2, 10) : randomInt(min, max);
  const second = grade === 5 ? randomInt(min, max) / 10 : grade === 4 ? randomInt(1, denominator - 1) / denominator : grade === 2 && operation === "×" ? (index === 1 ? 2 : 5) : randomInt(min, max);
  const precision = grade === 4 ? 1000 : grade === 5 ? 100 : 1;
  const target = operation === "×" ? first * second : Math.round((first + second) * precision) / precision;
  const values = [first, second];
  while (values.length < 8) {
    const value = grade === 5 ? randomInt(min, max) / 10 : grade === 4 ? randomInt(1, denominator - 1) / denominator : randomInt(min, max);
    const makesTarget = operation === "×" ? Math.abs(value * first - target) < 0.001 || Math.abs(value * second - target) < 0.001 : Math.abs(value + first - target) < 0.001 || Math.abs(value + second - target) < 0.001;
    if (!makesTarget) values.push(value);
  }
  const fractionTarget = grade === 4 ? `${Math.round(target * denominator)}/${denominator}` : null;
  return { id: index, operation, denominator, fractionTarget, target, tiles: values.map((value, tileIndex) => ({ id: `${index}-${tileIndex}`, value, display: grade === 4 ? `${Math.round(value * denominator)}/${denominator}` : value })).sort(() => Math.random() - 0.5) };
}

function makeBalanceTiles(grade, round) {
  if (grade === 4) {
    const denominator = [5, 8, 10][randomInt(0, 2)];
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const a = randomInt(1, denominator - 1); const b = randomInt(1, denominator - 1); const c = randomInt(1, denominator - 1); const d = a + b - c;
      if (d >= 1 && d < denominator && new Set([a, b, c, d]).size === 4) return [a, b, c, d].map((value, index) => ({ id: `${round}-${index}`, value, display: `${value}/${denominator}`, denominator, side: "tray" })).sort(() => Math.random() - 0.5);
    }
  }
  if (grade === 5) {
    const min = 5 + round; const max = 45 + round * 3;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const a = randomInt(min, max); const b = randomInt(min, max); const c = randomInt(min, max); const d = a + b - c;
      if (d >= min && d <= max && new Set([a, b, c, d]).size === 4) return [a, b, c, d].map((value, index) => ({ id: `${round}-${index}`, value, display: (value / 10).toFixed(1), side: "tray" })).sort(() => Math.random() - 0.5);
    }
  }
  const min = grade === 1 ? 2 : grade === 2 ? 5 : grade * 2 + round;
  const max = grade === 1 ? 9 : grade === 2 ? 20 : grade * 5 + round * 3;
  let values;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const a = randomInt(min, max);
    const b = randomInt(min, max);
    const c = randomInt(min, max);
    const d = a + b - c;
    if (d >= min && d <= max && new Set([a, b, c, d]).size === 4) { values = [a, b, c, d]; break; }
  }
  if (!values) values = [3, 5, 4, 4];
  return values.map((value, index) => ({ id: `${round}-${index}`, value, side: "tray" })).sort(() => Math.random() - 0.5);
}

const baseNumberMazes = [
  { target: 23, cells: ["S", 4, 9, "#", "#", 5, 2, "#", 3, 6, 8, "E", "#", "#", 1, "#"] },
  { target: 19, cells: ["S", 2, 7, "#", "#", 3, 4, "#", 5, 8, 6, "E", "#", "#", 1, "#"] },
  { target: 23, cells: ["S", 5, 8, "#", "#", 2, 3, "#", 4, 7, 9, "E", "#", "#", 1, "#"] },
];

function getNumberMazes(grade) {
  const multiplier = [1, 1, 2, 5, 10, 20][grade] || 1;
  return baseNumberMazes.map((maze) => ({ target: maze.target * multiplier, cells: maze.cells.map((cell) => typeof cell === "number" ? cell * multiplier : cell) }));
}

function useArcadeReward(gameCode, complete, units = 3) {
  const [reward, setReward] = useState(null);
  const requested = useRef(false);
  useEffect(() => {
    if (!complete || requested.current) return;
    requested.current = true;
    claimArcadeReward(gameCode, units).then(setReward).catch((error) => setReward({ rewardXp: 0, message: error.message }));
  }, [complete, gameCode, units]);
  return { reward, reset: () => { requested.current = false; setReward(null); } };
}

function makeFormulaPuzzle(grade) {
  const problem = createEquation(grade, new Set());
  const choices = new Set([problem.answer]);
  if (grade === 4) {
    const [numerator, denominator] = String(problem.answer).split("/").map(Number);
    while (choices.size < 4) choices.add(`${Math.max(0, numerator + randomInt(-2, 2))}/${denominator}`);
  } else while (choices.size < 4) choices.add(Math.round(Math.max(0, Number(problem.answer) + randomInt(-12, 12)) * 100) / 100);
  return { problem, choices: [...choices].sort(() => Math.random() - 0.5) };
}
function FormulaGame({ grade }) {
  const [round, setRound] = useState(0);
  const [puzzle, setPuzzle] = useState(() => makeFormulaPuzzle(grade));
  const [message, setMessage] = useState("");
  const complete = round >= 3;
  const { reward, reset } = useArcadeReward("formula", complete);
  const { problem, choices } = puzzle;
  function newFormula() {
    setPuzzle(makeFormulaPuzzle(grade)); setMessage("");
  }
  function choose(value) {
    if (value !== problem.answer) { setMessage("Chưa khớp công thức. Hãy tính lại từng bước rồi thử tiếp!"); return; }
    setMessage("Chính xác! Công thức đã cân bằng ✨");
    window.setTimeout(() => { setRound((current) => current + 1); if (round < 2) newFormula(); }, 550);
  }
  function restart() { reset(); setRound(0); newFormula(); }
  return <section className="arcade-card workshop-card"><GameTitle icon="🧩" label={`XƯỞNG CÔNG THỨC · LỚP ${grade}`} title="Lắp ráp công thức" description="Tính phần còn thiếu để công thức hoạt động chính xác." />
    {complete ? <ArcadeDone icon="🧩" title="Công thức đã hoàn tất!" reward={reward} onRestart={restart} /> : <><div className="workshop-progress">MẢNH GHÉP {round + 1} / 3</div><div className="formula-equation">{problem.expression} = <span>?</span></div><p className="word-hint">Tính phép toán theo kiến thức lớp {grade}, sau đó chọn kết quả để lắp vào ô trống.</p><div className="workshop-choices">{choices.map((value) => <button key={value} onClick={() => choose(value)}>{value}</button>)}</div><p className="workshop-message" role="status">{message}</p></>}
  </section>;
}

function makeWordProblem(grade, round = 0) {
  if (grade === 1) {
    const a = randomInt(4, 12); const b = randomInt(2, 20 - a);
    return round % 2 === 0
      ? { text: `Có ${a} quyển sách. Cô giáo tặng thêm ${b} quyển. Bây giờ có tất cả bao nhiêu quyển?`, operation: "+", answer: a + b, hint: "Từ 'tặng thêm' nghĩa là số lượng tăng. Dùng phép cộng trong phạm vi 20." }
      : { text: `Có ${a + b} quyển sách, các bạn mượn ${b} quyển. Còn lại bao nhiêu quyển?`, operation: "−", answer: a, hint: "Số sách giảm đi vì đã cho mượn. Dùng phép trừ trong phạm vi 20." };
  }
  if (grade === 2) {
    const a = randomInt(20, 80); const b = randomInt(5, 100 - a);
    if (round === 0) return { text: `Thư viện có ${a} quyển truyện và nhận thêm ${b} quyển. Thư viện có tất cả bao nhiêu quyển?`, operation: "+", answer: a + b, hint: "Gộp hai nhóm đồ vật, dùng phép cộng trong phạm vi 100." };
    if (round === 1) { const groups = randomInt(2, 10); return { text: `Có ${groups} túi kẹo, mỗi túi có 2 viên. Có tất cả bao nhiêu viên?`, operation: "×", answer: groups * 2, hint: "Cộng lặp lại 2 nhiều lần tương ứng với số túi; có thể dùng bảng nhân 2." }; }
    const groups = randomInt(2, 10);
    return { text: `Có ${groups * 5} bông hoa, chia đều vào 5 lọ. Mỗi lọ có mấy bông?`, operation: "÷", answer: groups, hint: "Chia đều thành 5 phần bằng nhau, dùng phép chia cho 5." };
  }
  if (grade === 3) {
    const groups = randomInt(3, grade === 3 ? 9 : 12); const each = randomInt(2, grade === 3 ? 9 : 12);
    return round % 2 === 0
      ? { text: `Có ${groups} hộp bút, mỗi hộp có ${each} chiếc. Hỏi có tất cả bao nhiêu chiếc bút?`, operation: "×", answer: groups * each, hint: "Các nhóm có số lượng bằng nhau. Nhân số nhóm với số đồ vật trong mỗi nhóm." }
      : { text: `Có ${groups * each} chiếc bút, chia đều vào ${groups} hộp. Mỗi hộp có bao nhiêu chiếc?`, operation: "÷", answer: each, hint: "Chia tổng số đồ vật thành các nhóm bằng nhau." };
  }
  if (grade === 4) {
    if (round % 2 === 0) {
      const denominator = [2, 3, 4, 5, 8, 10][randomInt(0, 5)]; const a = randomInt(1, denominator - 1); const b = randomInt(1, denominator - 1);
      return { text: `Lan ăn ${a}/${denominator} chiếc bánh, rồi em ăn thêm ${b}/${denominator} chiếc bánh. Hỏi hai bạn đã ăn bao nhiêu chiếc bánh?`, operation: "+", answer: (a + b) / denominator, hint: "Hai phân số có cùng mẫu số: cộng các tử số và giữ nguyên mẫu số." };
    }
    const length = randomInt(3, 12); const width = randomInt(2, 9);
    return { text: `Một mảnh vườn hình chữ nhật dài ${length} m, rộng ${width} m. Diện tích mảnh vườn là bao nhiêu mét vuông?`, operation: "×", answer: length * width, hint: "Diện tích hình chữ nhật bằng chiều dài nhân chiều rộng." };
  }
  if (round === 1) {
    const percent = [10, 20, 25, 50][randomInt(0, 3)]; const total = randomInt(2, 10) * 100;
    return { text: `Một chiếc cặp giá ${total} nghìn đồng, cửa hàng giảm giá ${percent}%. Số tiền được giảm là bao nhiêu?`, operation: "%", answer: total * percent / 100, hint: `Tính ${percent}% của ${total}: đổi phần trăm thành phân số hoặc số thập phân rồi nhân với ${total}.` };
  }
  const price = randomInt(12, 45) / 10; const count = randomInt(2, 8);
  return { text: `Mỗi quyển vở giá ${price.toFixed(1)} nghìn đồng. Mua ${count} quyển hết bao nhiêu nghìn đồng?`, operation: "×", answer: Math.round(price * count * 10) / 10, hint: `Giá mỗi quyển được lặp lại ${count} lần. Lấy giá một quyển nhân số quyển.` };
}

function WordProblemGame({ grade }) {
  const [round, setRound] = useState(0); const [problem, setProblem] = useState(() => makeWordProblem(grade));
  const [operation, setOperation] = useState(""); const [answer, setAnswer] = useState(""); const [message, setMessage] = useState(""); const [showHint, setShowHint] = useState(false);
  const complete = round >= 3; const { reward, reset } = useArcadeReward("word", complete);
  function submit() {
    const parsedAnswer = answer.includes("/") ? answer.split("/").map(Number).reduce((numerator, denominator) => numerator / denominator) : Number(answer);
    if (operation !== problem.operation || Math.abs(parsedAnswer - problem.answer) > 0.001) { setMessage("Chưa đúng. Đọc lại dữ kiện và xác định phép tính phù hợp nhé."); setShowHint(true); return; }
    setMessage("Em đã giải đúng bài toán! 🎉");
    window.setTimeout(() => { const next = round + 1; setRound(next); if (next < 3) setProblem(makeWordProblem(grade, next)); setOperation(""); setAnswer(""); setShowHint(false); setMessage(""); }, 650);
  }
  function restart() { reset(); setRound(0); setProblem(makeWordProblem(grade, 0)); setOperation(""); setAnswer(""); setMessage(""); setShowHint(false); }
  return <section className="arcade-card workshop-card"><GameTitle icon="🔎" label={`THÁM TỬ TOÁN ĐỐ · LỚP ${grade}`} title="Giải mã bài toán" description="Đọc tình huống, chọn phép tính rồi nhập kết quả để mở khóa." />
    {complete ? <ArcadeDone icon="🏆" title="Vụ án đã được phá giải!" reward={reward} onRestart={restart} /> : <><div className="workshop-progress">VỤ VIỆC {round + 1} / 3</div><div className="word-story">{problem.text}</div><div className="operation-picker" aria-label="Chọn phép tính">{["+", "−", "×", "÷", "%"].map((symbol) => <button key={symbol} className={operation === symbol ? "operation-active" : ""} onClick={() => setOperation(symbol)}>{symbol}</button>)}</div><label className="word-answer">Kết quả của em<input type="text" inputMode="decimal" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Nhập đáp án (phân số có thể ghi 3/4)" /></label><button className="arcade-primary" disabled={!operation || answer === ""} onClick={submit}>Kiểm tra lời giải 🔐</button><p className="workshop-message" role="status">{message}</p>{showHint && <div className="word-explanation"><b>Gợi ý cách làm:</b> {problem.hint}</div>}</>}
  </section>;
}

function makeGeometryTasks(grade) {
  if (grade === 1) return [
    { kind: "identify", answer: "triangle", prompt: "Tìm hình tam giác", label: "Nhận biết hình", unit: "" },
    { kind: "identify", answer: "square", prompt: "Tìm hình vuông", label: "Nhận biết hình", unit: "" },
    { kind: "identify", answer: "rectangle", prompt: "Tìm hình chữ nhật", label: "Nhận biết hình", unit: "" },
  ];
  if (grade === 2) return [
    { kind: "sides", sides: 3, prompt: "Chọn hình có 3 cạnh", label: "Đếm cạnh", unit: "cạnh" },
    { kind: "sides", sides: 4, prompt: "Chọn hình có 4 cạnh", label: "Đếm cạnh", unit: "cạnh" },
    { kind: "sides", sides: 5, prompt: "Chọn hình có 5 cạnh", label: "Đếm cạnh", unit: "cạnh" },
  ];
  const specs = grade === 3 ? [[4, 3, "perimeter"], [4, 4, "area"], [5, 2, "perimeter"]]
    : grade === 4 ? [[4, 3, "area"], [5, 3, "perimeter"], [5, 4, "area"]]
      : [[4, 3, "triangleArea"], [6, 4, "triangleArea"], [5, 4, "triangleArea"]];
  return specs.map(([width, height, kind]) => ({ width, height, kind, label: kind === "perimeter" ? "Chu vi" : kind === "triangleArea" ? "Diện tích tam giác" : "Diện tích", unit: kind === "perimeter" ? "đơn vị" : "ô vuông" }));
}
function GeometryGame({ grade }) {
  const [round, setRound] = useState(0); const [width, setWidth] = useState(2); const [height, setHeight] = useState(2); const [shapeChoice, setShapeChoice] = useState(""); const [message, setMessage] = useState("");
  const geometryTasks = useMemo(() => makeGeometryTasks(grade), [grade]);
  const complete = round >= geometryTasks.length; const { reward, reset } = useArcadeReward("geometry", complete);
  const task = geometryTasks[Math.min(round, geometryTasks.length - 1)];
  const target = task.kind === "area" ? task.width * task.height : task.kind === "triangleArea" ? task.width * task.height / 2 : task.kind === "perimeter" ? 2 * (task.width + task.height) : 0;
  const made = task.kind === "area" ? width * height : task.kind === "triangleArea" ? width * height / 2 : task.kind === "perimeter" ? 2 * (width + height) : 0;
  function check() {
    const shapeCorrect = task.kind === "identify" ? shapeChoice === task.answer : task.kind === "sides" ? shapeOptions.find((shape) => shape.id === shapeChoice)?.sides === task.sides : made === target;
    if (!shapeCorrect) { setMessage(task.kind === "identify" || task.kind === "sides" ? "Chưa đúng hình rồi. Quan sát tên hình và số cạnh nhé." : `Chưa đúng. Hãy dùng công thức phù hợp để đạt ${target} ${task.unit}.`); return; }
    setMessage("Hình đã đúng kích thước! 🌟");
    window.setTimeout(() => { setRound((current) => current + 1); setWidth(2); setHeight(2); setShapeChoice(""); setMessage(""); }, 600);
  }
  function restart() { reset(); setRound(0); setWidth(2); setHeight(2); setShapeChoice(""); setMessage(""); }
  const shapeOptions = [{ id: "triangle", name: "Tam giác", sides: 3, icon: "🔺" }, { id: "square", name: "Hình vuông", sides: 4, icon: "🟦" }, { id: "rectangle", name: "Hình chữ nhật", sides: 4, icon: "▰" }, { id: "pentagon", name: "Ngũ giác", sides: 5, icon: "⬟" }];
  const gradeDescription = grade === 1 ? "Nhận biết hình cơ bản." : grade === 2 ? "Quan sát và đếm số cạnh." : grade === 3 ? "Tính chu vi và đếm diện tích bằng ô vuông." : grade === 4 ? "Tính diện tích, chu vi hình chữ nhật." : "Khám phá công thức diện tích tam giác.";
  return <section className="arcade-card workshop-card"><GameTitle icon="📐" label={`KIẾN TRÚC SƯ HÌNH HỌC · LỚP ${grade}`} title="Xây hình đúng yêu cầu" description={gradeDescription} />
    {complete ? <ArcadeDone icon="🏠" title="Ba công trình hoàn thành!" reward={reward} onRestart={restart} /> : <><div className="workshop-progress">CÔNG TRÌNH {round + 1} / 3 · {task.prompt || `${task.label.toUpperCase()} CẦN ĐẠT: ${target} ${task.unit}`}</div>{task.kind === "identify" || task.kind === "sides" ? <div className="shape-picker">{shapeOptions.map((shape) => <button key={shape.id} className={shapeChoice === shape.id ? "operation-active" : ""} onClick={() => setShapeChoice(shape.id)}><span>{shape.icon}</span>{shape.name}{task.kind === "sides" && <small>{shape.sides} cạnh</small>}</button>)}</div> : <><div className="geometry-controls"><label>Chiều dài <button onClick={() => setWidth((value) => Math.max(1, value - 1))}>−</button><b>{width}</b><button onClick={() => setWidth((value) => Math.min(6, value + 1))}>+</button></label><label>Chiều cao <button onClick={() => setHeight((value) => Math.max(1, value - 1))}>−</button><b>{height}</b><button onClick={() => setHeight((value) => Math.min(6, value + 1))}>+</button></label></div><div className="geometry-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)" }} aria-label={`Hình ${width} nhân ${height}`}>{Array.from({ length: 36 }, (_, index) => { const row = Math.floor(index / 6); const column = index % 6; const filled = task.kind === "triangleArea" ? row < height && column < Math.ceil((row + 1) * width / height) : row < height && column < width; return <span key={index} className={filled ? "geometry-square filled-square" : "geometry-square"} />; })}</div><p className="geometry-current">{task.kind === "area" ? `Diện tích: ${width} × ${height} = ${made} ô vuông` : task.kind === "triangleArea" ? `Diện tích tam giác: đáy × chiều cao ÷ 2 = ${width} × ${height} ÷ 2 = ${made} ô vuông` : `Chu vi hình chữ nhật: 2 × (${width} + ${height}) = ${made} đơn vị`}</p></>}<button className="arcade-primary" disabled={(task.kind === "identify" || task.kind === "sides") && !shapeChoice} onClick={check}>Kiểm tra công trình 🏗️</button><p className="workshop-message" role="status">{message}</p></>}
  </section>;
}

function GameTitle({ icon, label, title, description }) { return <div className="arcade-game-heading"><span className="arcade-emoji">{icon}</span><div><small>{label}</small><h1>{title}</h1><p>{description}</p></div></div>; }
function ArcadeDone({ icon, title, reward, onRestart }) { return <div className="arcade-finish"><span>{icon}</span><h2>{title}</h2><p className="arcade-xp">{reward ? reward.message : "Đang ghi nhận XP…"}</p><button onClick={onRestart}>Chơi lại</button></div>; }

function ArcadeHeader() {
  return <header className="arcade-header"><Link to="/tro-choi">← Các trò chơi</Link><Link to="/dashboard">Về dashboard</Link></header>;
}

function MemoryGame({ grade }) {
  const [deck, setDeck] = useState(() => makeMemoryDeck(grade));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [reward, setReward] = useState(null);
  const rewardRequested = useRef(false);
  const [best, setBest] = useState(() => Number(localStorage.getItem(`mathkids-memory-best-${grade}`)) || 0);
  const complete = matched.length === 6;

  useEffect(() => {
    if (!complete || rewardRequested.current) return;
    rewardRequested.current = true;
    const score = Math.max(10, 100 - moves * 4);
    setBest((previous) => {
      const nextBest = Math.max(previous, score);
      localStorage.setItem(`mathkids-memory-best-${grade}`, String(nextBest));
      return nextBest;
    });
    claimArcadeReward("memory", 6).then(setReward).catch((error) => setReward({ rewardXp: 0, message: error.message }));
  }, [complete, moves, grade]);

  useEffect(() => {
    if (flipped.length !== 2) return undefined;
    const [first, second] = flipped.map((id) => deck.find((card) => card.id === id));
    if (first?.pair === second?.pair && first?.type !== second?.type) {
      const timer = window.setTimeout(() => {
        setMatched((current) => [...current, first.pair]);
        setFlipped([]);
      }, 500);
      return () => window.clearTimeout(timer);
    }
    setLocked(true);
    const timer = window.setTimeout(() => { setFlipped([]); setLocked(false); }, 900);
    return () => window.clearTimeout(timer);
  }, [flipped, deck, moves, grade]);

  function flip(card) {
    if (locked || flipped.length === 2 || matched.includes(card.pair) || flipped.includes(card.id)) return;
    const next = [...flipped, card.id];
    setFlipped(next);
    if (next.length === 2) setMoves((current) => current + 1);
  }

  function restart() {
    rewardRequested.current = false;
    setReward(null); setDeck(makeMemoryDeck(grade)); setFlipped([]); setMatched([]); setMoves(0); setLocked(false);
  }

  return <section className="arcade-card memory-card">
    <div className="arcade-game-heading"><span className="arcade-emoji">🃏</span><div><small>TRÒ CHƠI TRÍ NHỚ · LỚP {grade}</small><h1>Lật thẻ tìm cặp</h1><p>Ghi nhớ phép tính và tìm thẻ kết quả tương ứng.</p></div></div>
    <div className="arcade-stats"><span>Đã ghép <b>{matched.length}/6</b></span><span>Lượt lật <b>{moves}</b></span><span>Kỷ lục <b>{best}</b></span></div>
    {complete ? <div className="arcade-finish"><span>🎉</span><h2>Ghép đủ các cặp!</h2><p>Bạn hoàn thành trong {moves} lượt lật.</p><p className="arcade-xp">{reward ? reward.message : "Đang ghi nhận XP…"}</p><button onClick={restart}>Chơi lại</button></div> : <div className="memory-grid">{deck.map((card) => {
      const visible = flipped.includes(card.id) || matched.includes(card.pair);
      return <button key={card.id} className={`memory-tile ${visible ? "is-open" : ""} ${matched.includes(card.pair) ? "is-matched" : ""}`} onClick={() => flip(card)} aria-label={visible ? card.text : "Lật thẻ"}>{visible ? card.text : "✦"}</button>;
    })}</div>}
    {!complete && <button className="arcade-secondary" onClick={restart}>Trộn và chơi lại ↻</button>}
  </section>;
}

function GardenGame({ grade }) {
  const rounds = useMemo(() => Array.from({ length: 3 }, (_, index) => makeGardenRound(grade, index)), [grade]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState([]);
  const [harvested, setHarvested] = useState(0);
  const [message, setMessage] = useState("");
  const [planting, setPlanting] = useState(false);
  const [reward, setReward] = useState(null);
  const rewardRequested = useRef(false);
  const round = rounds[roundIndex];
  const chosenValues = round ? round.tiles.filter((tile) => selected.includes(tile.id)).map((tile) => tile.value) : [];
  const sumPrecision = grade === 4 ? 1000 : grade === 5 ? 100 : 1;
  const sum = chosenValues.length === 2 ? (round.operation === "×" ? chosenValues[0] * chosenValues[1] : Math.round((chosenValues[0] + chosenValues[1]) * sumPrecision) / sumPrecision) : chosenValues.reduce((total, value) => total + value, 0);
  const complete = harvested === rounds.length;

  useEffect(() => {
    if (!complete || rewardRequested.current) return;
    rewardRequested.current = true;
    claimArcadeReward("garden", 3).then(setReward).catch((error) => setReward({ rewardXp: 0, message: error.message }));
  }, [complete]);

  function toggleTile(tile) {
    if (planting) return;
    if (selected.includes(tile.id)) setSelected((current) => current.filter((id) => id !== tile.id));
    else if (selected.length < 2) setSelected((current) => [...current, tile.id]);
    setMessage("");
  }

  function harvest() {
    if (planting) return;
    if (sum !== round.target) {
      setMessage(sum > round.target ? "Hai quả này cho kết quả lớn hơn mục tiêu — hãy chọn lại." : "Chưa đúng. Hãy chọn hai quả để phép tính bằng mục tiêu.");
      return;
    }
    setHarvested((current) => current + 1);
    setSelected([]);
    setPlanting(true);
    setMessage("🌱 Chính xác! Cây trong vườn đã lớn thêm.");
    window.setTimeout(() => { setRoundIndex((current) => Math.min(current + 1, rounds.length - 1)); setMessage(""); setPlanting(false); }, 650);
  }

  function restart() { rewardRequested.current = false; setReward(null); setRoundIndex(0); setSelected([]); setHarvested(0); setMessage(""); setPlanting(false); }

  return <section className="arcade-card garden-card">
    <div className="arcade-game-heading"><span className="arcade-emoji">🌻</span><div><small>THỬ THÁCH TOÁN · LỚP {grade}</small><h1>Khu vườn phép tính</h1><p>{grade === 1 ? "Cộng trong phạm vi 20." : grade === 2 ? "Ôn cộng đến 100 và bảng nhân 2, 5." : grade === 3 ? "Luyện bảng nhân và phép chia." : grade === 4 ? "Cộng phân số cùng mẫu số." : "Cộng số thập phân."}</p></div></div>
    <div className="garden-progress">{rounds.map((item, index) => <span key={item.id} className={index < harvested ? "grown" : ""}>{index < harvested ? "🌼" : "🌱"}</span>)}</div>
    {complete ? <div className="arcade-finish"><span>🌻</span><h2>Khu vườn nở rộ!</h2><p>Bạn đã thu hoạch chính xác cả 3 luống.</p><p className="arcade-xp">{reward ? reward.message : "Đang ghi nhận XP…"}</p><button onClick={restart}>Chơi lại</button></div> : <>
      <div className="garden-target"><small>LUỐNG {roundIndex + 1} · {round.operation === "×" ? "TÍCH" : round.operation === "fraction" ? "TỔNG PHÂN SỐ" : "TỔNG"} MỤC TIÊU</small><strong>{round.fractionTarget || round.target}</strong><span>{round.operation === "×" ? "Chọn hai thừa số" : round.operation === "fraction" ? "Cộng hai phân số cùng mẫu" : "Chọn hai số có tổng"} · Kết quả: {selected.length === 2 ? sum : "—"}</span></div>
      <div className="fruit-grid">{round.tiles.map((tile) => <button key={tile.id} className={`fruit-tile ${selected.includes(tile.id) ? "fruit-selected" : ""}`} onClick={() => toggleTile(tile)} disabled={planting} aria-pressed={selected.includes(tile.id)}><span>{selected.includes(tile.id) ? "🍎" : "🍏"}</span><b>{tile.display}</b></button>)}</div>
      {message && <p className={`garden-message ${sum === round.target ? "is-good" : ""}`} role="status">{message}</p>}
      <div className="garden-actions"><button className="arcade-secondary" disabled={planting} onClick={() => { setSelected([]); setMessage(""); }}>Bỏ chọn</button><button className="arcade-primary" disabled={selected.length !== 2 || planting} onClick={harvest}>{planting ? "Đang nảy mầm…" : "Thu hoạch 🌱"}</button></div>
    </>}
  </section>;
}

function BalanceGame({ grade }) {
  const [round, setRound] = useState(0);
  const [tiles, setTiles] = useState(() => makeBalanceTiles(grade, 0));
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [reward, setReward] = useState(null);
  const rewardRequested = useRef(false);
  const complete = round >= 3;
  const leftTotal = tiles.filter((tile) => tile.side === "left").reduce((total, tile) => total + tile.value, 0);
  const rightTotal = tiles.filter((tile) => tile.side === "right").reduce((total, tile) => total + tile.value, 0);
  const balanceDenominator = tiles[0]?.denominator || 1;
  const showTotal = (value) => grade === 4 ? `${value}/${balanceDenominator}` : grade === 5 ? (value / 10).toFixed(1) : value;
  const placedCount = tiles.filter((tile) => tile.side !== "tray").length;

  useEffect(() => {
    if (!complete || rewardRequested.current) return;
    rewardRequested.current = true;
    claimArcadeReward("balance", 3).then(setReward).catch((error) => setReward({ rewardXp: 0, message: error.message }));
  }, [complete]);

  function placeOn(side) {
    if (selected === null) return;
    setTiles((current) => current.map((tile) => tile.id === selected ? { ...tile, side } : tile));
    setSelected(null);
    setMessage("");
  }

  function balance() {
    if (placedCount !== 4 || leftTotal !== rightTotal) {
      setMessage(placedCount < 4 ? "Hãy đặt đủ các khối lên hai bệ trước nhé." : "Hai bệ chưa cân bằng — thử đổi vị trí các khối.");
      return;
    }
    setMessage("⚖️ Cân bằng hoàn hảo!");
    window.setTimeout(() => {
      const nextRound = round + 1;
      setRound(nextRound);
      setTiles(nextRound < 3 ? makeBalanceTiles(grade, nextRound) : []);
      setSelected(null);
      setMessage("");
    }, 600);
  }

  function restart() {
    rewardRequested.current = false; setReward(null); setRound(0); setTiles(makeBalanceTiles(grade, 0)); setSelected(null); setMessage("");
  }

  return <section className="arcade-card balance-card">
    <div className="arcade-game-heading"><span className="arcade-emoji">⚖️</span><div><small>TRÒ CHƠI CHIẾN LƯỢC · LỚP {grade}</small><h1>Tháp cân bằng</h1><p>{grade === 4 ? "Cân bằng các phân số cùng mẫu số." : grade === 5 ? "Cân bằng các số thập phân đến hàng phần mười." : "Chia các số thành hai nhóm có tổng bằng nhau."}</p></div></div>
    {complete ? <div className="arcade-finish"><span>🏗️</span><h2>Cả ba tháp đã vững!</h2><p>Bạn đã tìm được cách chia cân bằng.</p><p className="arcade-xp">{reward ? reward.message : "Đang ghi nhận XP…"}</p><button onClick={restart}>Xây lại</button></div> : <>
      <div className="balance-round-label">VÒNG {round + 1} / 3 · ĐÃ ĐẶT {placedCount}/4 KHỐI</div>
      <div className="balance-scales"><div className="balance-pan"><strong>BỆ TRÁI</strong><span>{showTotal(leftTotal)}</span>{tiles.filter((tile) => tile.side === "left").map((tile) => <button key={tile.id} className="placed-number-block" onClick={() => setTiles((current) => current.map((item) => item.id === tile.id ? { ...item, side: "tray" } : item))}>{tile.display || tile.value} ×</button>)}</div><div className="balance-beam">⚖️</div><div className="balance-pan"><strong>BỆ PHẢI</strong><span>{showTotal(rightTotal)}</span>{tiles.filter((tile) => tile.side === "right").map((tile) => <button key={tile.id} className="placed-number-block" onClick={() => setTiles((current) => current.map((item) => item.id === tile.id ? { ...item, side: "tray" } : item))}>{tile.display || tile.value} ×</button>)}</div></div>
      <p className="balance-instruction">Chọn khối rồi đặt lên bệ. Chạm khối trên bệ để đưa về khay.</p>
      <div className="balance-tray">{tiles.filter((tile) => tile.side === "tray").map((tile) => <button key={tile.id} className={selected === tile.id ? "number-block selected-block" : "number-block"} onClick={() => setSelected(tile.id)}>{tile.display || tile.value}</button>)}</div>
      <div className="balance-actions"><button className="arcade-secondary" disabled={selected === null} onClick={() => placeOn("left")}>Đặt bên trái</button><button className="arcade-secondary" disabled={selected === null} onClick={() => placeOn("right")}>Đặt bên phải</button><button className="arcade-primary" disabled={placedCount !== 4 || leftTotal !== rightTotal} onClick={balance}>Cân bằng →</button></div>
      {message && <p className={`garden-message ${leftTotal === rightTotal && placedCount === 4 ? "is-good" : ""}`} role="status">{message}</p>}
      <button className="arcade-text-button" onClick={() => setTiles((current) => current.map((tile) => ({ ...tile, side: "tray" })))}>Làm lại vòng này</button>
    </>}
  </section>;
}

function MazeGame({ grade }) {
  const [level, setLevel] = useState(0);
  const [position, setPosition] = useState(0);
  const [sum, setSum] = useState(0);
  const [visited, setVisited] = useState(() => new Set([0]));
  const [message, setMessage] = useState("Dùng phím mũi tên hoặc các nút để di chuyển.");
  const [complete, setComplete] = useState(false);
  const [reward, setReward] = useState(null);
  const rewardRequested = useRef(false);
  const transitionTimer = useRef(null);
  const numberMazes = useMemo(() => getNumberMazes(grade), [grade]);
  const maze = numberMazes[level];

  useEffect(() => () => window.clearTimeout(transitionTimer.current), []);
  useEffect(() => {
    if (!complete || rewardRequested.current) return;
    rewardRequested.current = true;
    claimArcadeReward("maze", 3).then(setReward).catch((error) => setReward({ rewardXp: 0, message: error.message }));
  }, [complete]);

  function resetLevel() {
    setPosition(0); setSum(0); setVisited(new Set([0])); setMessage("Dùng phím mũi tên hoặc các nút để di chuyển.");
  }

  function move(direction) {
    if (complete) return;
    const row = Math.floor(position / 4);
    const column = position % 4;
    const nextRow = row + (direction === "up" ? -1 : direction === "down" ? 1 : 0);
    const nextColumn = column + (direction === "left" ? -1 : direction === "right" ? 1 : 0);
    if (nextRow < 0 || nextRow > 3 || nextColumn < 0 || nextColumn > 3) return;
    const nextPosition = nextRow * 4 + nextColumn;
    const cell = maze.cells[nextPosition];
    if (cell === "#") { setMessage("Bức tường chắn đường rồi! Hãy thử hướng khác."); return; }
    let nextSum = sum;
    if (typeof cell === "number" && !visited.has(nextPosition)) {
      nextSum += cell;
      setSum(nextSum);
      setVisited((current) => new Set([...current, nextPosition]));
    }
    setPosition(nextPosition);
    if (cell === "E") {
      if (nextSum === maze.target) {
        if (level === numberMazes.length - 1) {
          setComplete(true); setMessage("🚀 Tìm đúng đường và đến đích!");
        } else {
          setMessage("✨ Đúng tổng! Đang mở mê cung tiếp theo…");
          transitionTimer.current = window.setTimeout(() => {
            const nextLevel = level + 1;
            setLevel(nextLevel); setPosition(0); setSum(0); setVisited(new Set([0])); setMessage("Dùng phím mũi tên hoặc các nút để di chuyển.");
          }, 750);
        }
      } else setMessage(nextSum > maze.target ? "Tổng đã vượt mục tiêu — thử lại mê cung nhé." : "Đã tới cửa ra! Em cần tìm đủ tổng mục tiêu trước khi thoát.");
    } else if (nextSum > maze.target) setMessage("Tổng đang lớn hơn mục tiêu. Hãy thử lại đường đi khác.");
    else setMessage(`Đã gom ${nextSum}. Còn thiếu ${maze.target - nextSum} để mở cổng.`);
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      const directions = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      if (directions[event.key]) { event.preventDefault(); move(directions[event.key]); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function restart() {
    window.clearTimeout(transitionTimer.current); rewardRequested.current = false; setReward(null); setComplete(false); setLevel(0); setPosition(0); setSum(0); setVisited(new Set([0])); setMessage("Dùng phím mũi tên hoặc các nút để di chuyển.");
  }

  return <section className="arcade-card maze-card">
    <div className="arcade-game-heading"><span className="arcade-emoji">🤖</span><div><small>ĐIỀU KHIỂN ROBOT · LỚP {grade}</small><h1>Mê cung tổng số</h1><p>Gom các số theo mức của lớp {grade}, đạt tổng mục tiêu rồi tìm cửa ra.</p></div></div>
    {complete ? <div className="arcade-finish"><span>🏁</span><h2>Robot đã về đích!</h2><p>Em đã vượt qua cả 3 mê cung.</p><p className="arcade-xp">{reward ? reward.message : "Đang ghi nhận XP…"}</p><button onClick={restart}>Chơi lại</button></div> : <>
      <div className="maze-status"><span>MÊ CUNG {level + 1} / 3</span><b>Tổng {sum} / {maze.target}</b></div>
      <div className="number-maze" role="grid" aria-label={`Mê cung ${level + 1}`}>
        {maze.cells.map((cell, index) => <div key={`${level}-${index}`} role="gridcell" className={`maze-cell ${cell === "#" ? "maze-wall" : ""} ${position === index ? "robot-cell" : ""} ${visited.has(index) && typeof cell === "number" ? "maze-collected" : ""}`}>
          {position === index ? "🤖" : cell === "#" ? "" : cell === "S" ? "🚩" : cell === "E" ? "🚪" : visited.has(index) ? "✨" : cell}
        </div>)}
      </div>
      <p className="maze-message" role="status">{message}</p>
      <div className="maze-controls"><button onClick={() => move("up")} aria-label="Đi lên">↑</button><div><button onClick={() => move("left")} aria-label="Đi trái">←</button><button onClick={() => move("down")} aria-label="Đi xuống">↓</button><button onClick={() => move("right")} aria-label="Đi phải">→</button></div></div>
      <button className="arcade-text-button" onClick={resetLevel}>Bắt đầu lại mê cung này ↻</button>
    </>}
  </section>;
}

export default function ArcadeMathGames({ mode: initialMode, grade: initialGrade }) {
  const [, setSearchParams] = useSearchParams();
  const [grade, setGrade] = useState(Number(initialGrade) || Number(getCachedUser()?.grade) || 1);
  const modes = ["garden", "memory", "balance", "maze", "formula", "word", "geometry"];
  const mode = modes.includes(initialMode) ? initialMode : "memory";
  function changeGrade(value) {
    setGrade(value);
    setSearchParams({ mini: mode, grade: String(value) });
  }
  return <main className="math-games-page"><ArcadeHeader /><div className="arcade-page">
    <div className="arcade-toolbar"><label>Lớp của em<select value={grade} onChange={(event) => changeGrade(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((item) => <option key={item} value={item}>Lớp {item}</option>)}</select></label><Link to="/tro-choi">← Chọn trò khác</Link></div>
    {mode === "garden" ? <GardenGame key={`garden-${grade}`} grade={grade} /> : mode === "balance" ? <BalanceGame key={`balance-${grade}`} grade={grade} /> : mode === "maze" ? <MazeGame key={`maze-${grade}`} grade={grade} /> : mode === "formula" ? <FormulaGame key={`formula-${grade}`} grade={grade} /> : mode === "word" ? <WordProblemGame key={`word-${grade}`} grade={grade} /> : mode === "geometry" ? <GeometryGame key={`geometry-${grade}`} grade={grade} /> : <MemoryGame key={`memory-${grade}`} grade={grade} />}
  </div></main>;
}
