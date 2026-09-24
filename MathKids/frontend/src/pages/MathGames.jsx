import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./MathGames.css";

const games = [
  { grade: 1, icon: "🍎", title: "Nhặt táo tính nhanh", topic: "Cộng trừ trong phạm vi 20", color: "game-red", description: "Giúp bạn nhỏ nhặt đủ táo bằng những phép cộng và trừ đầu tiên." },
  { grade: 2, icon: "🚂", title: "Chuyến tàu phép tính", topic: "Cộng trừ đến 100 · Bảng nhân cơ bản", color: "game-orange", description: "Giải phép tính để đưa đoàn tàu vượt qua các nhà ga." },
  { grade: 3, icon: "🚀", title: "Phi hành gia nhân chia", topic: "Bảng nhân và phép chia", color: "game-blue", description: "Tính nhanh để đưa phi thuyền khám phá các hành tinh." },
  { grade: 4, icon: "🏰", title: "Giải cứu vương quốc phân số", topic: "Nhân chia · Phân số cùng mẫu", color: "game-purple", description: "Vượt thử thách phép tính và mở cánh cổng lâu đài." },
  { grade: 5, icon: "🧪", title: "Phòng thí nghiệm số thập phân", topic: "Số thập phân · Tỉ số phần trăm", color: "game-green", description: "Pha chế đáp án chính xác với số thập phân và phần trăm." },
];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const formatNumber = (number) => Number(number.toFixed(2)).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

function numericQuestion(prompt, answer, difficulty) {
  const step = difficulty === 5 ? 0.1 : difficulty === 4 ? 2 : 1;
  const clean = (value) => Number(Math.max(0, value).toFixed(2));
  const distractors = new Set();
  let offset = 1;
  while (distractors.size < 3) {
    const sign = offset % 2 === 0 ? -1 : 1;
    const value = clean(answer + sign * Math.ceil(offset / 2) * step * randomInt(1, 2));
    if (value !== answer) distractors.add(value);
    offset += 1;
  }
  return finalizeQuestion(prompt, [answer, ...distractors].map(formatNumber), formatNumber(answer), `${prompt} ${formatNumber(answer)}.`);
}

function finalizeQuestion(prompt, choices, answer, explanation) {
  const options = [...choices].sort(() => Math.random() - 0.5);
  return { prompt, options, correctIndex: options.indexOf(answer), explanation };
}

function fractionQuestion() {
  const denominator = [2, 3, 4, 5, 8][randomInt(0, 4)];
  const numeratorA = randomInt(1, denominator - 1);
  const numeratorB = randomInt(1, denominator - numeratorA);
  const sum = numeratorA + numeratorB;
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const divisor = gcd(sum, denominator);
  const answer = `${sum / divisor}/${denominator / divisor}`;
  const distractors = new Set();
  while (distractors.size < 3) {
    const wrongDenominator = randomInt(2, 12);
    const wrongNumerator = randomInt(1, wrongDenominator);
    const wrongDivisor = gcd(wrongNumerator, wrongDenominator);
    const option = `${wrongNumerator / wrongDivisor}/${wrongDenominator / wrongDivisor}`;
    if (option !== answer) distractors.add(option);
  }
  const prompt = `${numeratorA}/${denominator} + ${numeratorB}/${denominator} = ?`;
  return finalizeQuestion(prompt, [answer, ...distractors], answer, `Cộng tử số, giữ nguyên mẫu số: ${sum}/${denominator} = ${answer}.`);
}

function createQuestion(grade) {
  if (grade === 1) {
    const a = randomInt(1, 10);
    const b = randomInt(0, 10);
    return Math.random() < 0.5 || b > a ? numericQuestion(`${a} + ${b} = ?`, a + b, grade) : numericQuestion(`${a} − ${b} = ?`, a - b, grade);
  }
  if (grade === 2) {
    const kind = randomInt(0, 2);
    if (kind === 0) { const a = randomInt(15, 79); const b = randomInt(10, 99 - a); return numericQuestion(`${a} + ${b} = ?`, a + b, grade); }
    if (kind === 1) { const a = randomInt(30, 99); const b = randomInt(10, a); return numericQuestion(`${a} − ${b} = ?`, a - b, grade); }
    const a = randomInt(2, 5); const b = randomInt(2, 10); return numericQuestion(`${a} × ${b} = ?`, a * b, grade);
  }
  if (grade === 3) {
    if (Math.random() < 0.5) { const a = randomInt(2, 9); const b = randomInt(2, 10); return numericQuestion(`${a} × ${b} = ?`, a * b, grade); }
    const divisor = randomInt(2, 9); const quotient = randomInt(2, 10); return numericQuestion(`${divisor * quotient} ÷ ${divisor} = ?`, quotient, grade);
  }
  if (grade === 4) {
    const kind = randomInt(0, 2);
    if (kind === 0) return fractionQuestion();
    if (kind === 1) { const a = randomInt(12, 89); const b = randomInt(2, 9); return numericQuestion(`${a} × ${b} = ?`, a * b, grade); }
    const divisor = randomInt(2, 9); const quotient = randomInt(12, 89); return numericQuestion(`${divisor * quotient} ÷ ${divisor} = ?`, quotient, grade);
  }
  if (Math.random() < 0.5) {
    const a = randomInt(12, 98) / 10;
    const b = randomInt(2, 9);
    return numericQuestion(`${formatNumber(a)} × ${b} = ?`, a * b, grade);
  }
  const percent = [10, 20, 25, 50][randomInt(0, 3)];
  const amount = randomInt(2, 20) * 10;
  return numericQuestion(`${percent}% của ${amount} là bao nhiêu?`, amount * percent / 100, grade);
}

function GameHeader() {
  return <header className="math-game-header"><Link className="dashboard-brand" to="/dashboard"><span>★</span> Math<span>Kids</span></Link><Link to="/dashboard" className="game-back-link">← Về dashboard</Link></header>;
}

function GamePicker() {
  return <main className="math-games-page"><GameHeader /><section className="games-content"><div className="games-intro"><span>🎲 KHU VUI HỌC TOÁN</span><h1>Chọn trò chơi của bạn!</h1><p>Mỗi lớp có một thử thách riêng, vừa sức và thật vui.</p></div><div className="grade-game-grid">{games.map((game) => <Link key={game.grade} to={`/tro-choi/${game.grade}`} className={`grade-game-card ${game.color}`}><span className="grade-game-icon">{game.icon}</span><span className="grade-chip">LỚP {game.grade}</span><h2>{game.title}</h2><strong>{game.topic}</strong><p>{game.description}</p><span className="play-game">Chơi ngay <i>→</i></span></Link>)}</div></section></main>;
}

function PlayGame({ game }) {
  const [round, setRound] = useState(1);
  const [question, setQuestion] = useState(() => createQuestion(game.grade));
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  function chooseAnswer(index) {
    if (selected !== null) return;
    setSelected(index);
    if (index === question.correctIndex) setCorrectCount((count) => count + 1);
  }

  function nextQuestion() {
    if (round === 10) { setFinished(true); return; }
    setRound((current) => current + 1);
    setQuestion(createQuestion(game.grade));
    setSelected(null);
  }

  function restart() {
    setRound(1);
    setQuestion(createQuestion(game.grade));
    setSelected(null);
    setCorrectCount(0);
    setFinished(false);
  }

  return <main className="math-games-page"><GameHeader /><section className="play-area">
    <Link className="play-back" to="/tro-choi">← Chọn trò chơi khác</Link>
    <div className={`play-card ${game.color}`}>
      <div className="play-card-top"><span className="grade-chip">LỚP {game.grade}</span><span className="question-count">{finished ? "HOÀN THÀNH" : `CÂU ${round} / 10`}</span></div>
      {!finished ? <><div className="play-progress"><span style={{ width: `${round * 10}%` }} /></div><div className="play-game-title"><span>{game.icon}</span><div><small>{game.topic}</small><h1>{game.title}</h1></div></div><div className="math-question">{question.prompt}</div><div className="answer-options">{question.options.map((option, index) => <button key={`${round}-${option}`} className={selected === null ? "" : index === question.correctIndex ? "answer-correct" : index === selected ? "answer-wrong" : "answer-muted"} onClick={() => chooseAnswer(index)} disabled={selected !== null}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>{selected !== null && <div className={`answer-feedback ${selected === question.correctIndex ? "feedback-good" : "feedback-try"}`}><span>{selected === question.correctIndex ? "🎉 Chính xác!" : "💡 Chưa đúng rồi!"}</span><small>{question.explanation}</small></div>}{selected !== null && <button className="next-question" onClick={nextQuestion}>{round === 10 ? "Xem kết quả" : "Câu tiếp theo"} →</button>}</> : <div className="game-result"><span>{correctCount >= 8 ? "🏆" : correctCount >= 5 ? "🌟" : "💪"}</span><h1>{correctCount >= 8 ? "Xuất sắc lắm!" : correctCount >= 5 ? "Làm tốt lắm!" : "Cố gắng thêm nhé!"}</h1><p>Bạn trả lời đúng <strong>{correctCount}/10</strong> câu trong trò chơi lớp {game.grade}.</p><div className="result-actions"><button onClick={restart}>Chơi lại ↻</button><Link to="/tro-choi">Chọn trò khác →</Link></div></div>}
    </div>
  </section></main>;
}

export default function MathGames() {
  const { grade: rawGrade } = useParams();
  if (!rawGrade) return <GamePicker />;
  const grade = Number(rawGrade);
  const game = games.find((item) => item.grade === grade);
  if (!game) return <GamePicker />;
  return <PlayGame key={grade} game={game} />;
}
