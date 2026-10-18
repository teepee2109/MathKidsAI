import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import StudyArt from "../components/StudyArt";
import { getCachedUser } from "../authStorage";
import { claimGameRewards, getQuestionTopics, getQuestions, submitQuestionAnswer } from "../services/questions";
import ArcadeMathGames from "./ArcadeMathGames";
import "./MathGames.css";
import "./MathQuestionBank.css";
import "./MathGamesThemes.css";

const games = [
  { grade: 1, icon: "🍎", title: "Nhặt táo tính nhanh", topic: "Cộng trừ trong phạm vi 20", color: "game-red", description: "Giúp bạn nhỏ nhặt đủ táo bằng những phép cộng và trừ đầu tiên." },
  { grade: 2, icon: "🚂", title: "Chuyến tàu phép tính", topic: "Cộng trừ đến 100 · Bảng nhân cơ bản", color: "game-orange", description: "Giải phép tính để đưa đoàn tàu vượt qua các nhà ga." },
  { grade: 3, icon: "🚀", title: "Phi hành gia nhân chia", topic: "Bảng nhân và phép chia", color: "game-blue", description: "Tính nhanh để đưa phi thuyền khám phá các hành tinh." },
  { grade: 4, icon: "🏰", title: "Giải cứu vương quốc phân số", topic: "Nhân chia · Phân số cùng mẫu", color: "game-purple", description: "Vượt thử thách phép tính và mở cánh cổng lâu đài." },
  { grade: 5, icon: "🧪", title: "Phòng thí nghiệm số thập phân", topic: "Số thập phân · Tỉ số phần trăm", color: "game-green", description: "Pha chế đáp án chính xác với số thập phân và phần trăm." },
];

const gameThemes = {
  space: { icon: "🚀", name: "Vũ trụ", character: "👩‍🚀", title: "Nhiệm vụ chinh phục các vì sao", description: "Tự điều khiển phi thuyền, tính giá trị pin năng lượng theo lớp và gom vừa đủ nhiên liệu qua ba vùng sao.", action: "Bắt đầu nhiệm vụ", fit: "Cộng trừ · Nhân · Phân số · Số thập phân" },
  ocean: { icon: "🌊", name: "Đại dương", character: "🐳", title: "Khám phá đại dương toán học", description: "Lái cá voi, nhẩm giá trị từng viên ngọc để đủ tổng mở rương và né đá biển.", action: "Khám phá đại dương", fit: "Tính nhẩm · Phân số · Số thập phân · Phản xạ" },
  forest: { icon: "🌳", name: "Khu rừng kỳ thú", character: "🐿️", title: "Cuộc phiêu lưu trong khu rừng", description: "Tự tay khám phá khu rừng, xây hình và tìm lối đi qua các chướng ngại vật.", action: "Khám phá khu rừng", fit: "Toán hình · Không gian · Khám phá" },
};

const currentTime = () => Date.now();
const elapsedSeconds = (startedAt) => Math.max(0, Math.floor((currentTime() - startedAt) / 1000));

function GameHeader() {
  return <header className="math-game-header"><BrandLogo to="/dashboard" /><Link to="/dashboard" className="game-back-link">← Về góc học</Link></header>;
}

function GamePicker() {
  const grade = Number(getCachedUser()?.grade) || 1;
  const [theme, setTheme] = useState(() => localStorage.getItem("mathkids-game-theme") || "space");
  const activeTheme = gameThemes[theme];
  function chooseTheme(nextTheme) {
    setTheme(nextTheme);
    localStorage.setItem("mathkids-game-theme", nextTheme);
  }
  const arcadeGames = [
    { mode: "balance", icon: "⚖️", color: "game-orange", tag: "TƯƠNG TÁC", title: "Tháp cân bằng", type: "Kéo thả · Cân bằng", description: "Tự tay chuyển các khối số sang hai bên để chiếc cân thăng bằng." },
    { mode: "maze", icon: "🤖", color: "game-blue", tag: "ĐIỀU KHIỂN", title: "Mê cung tổng số", type: "Di chuyển · Tìm đường", description: "Dùng phím hoặc nút điều khiển để lái robot qua mê cung và gom số." },
    { mode: "geometry", icon: "📐", color: "game-blue", tag: "TẠO HÌNH", title: "Xây hình đúng yêu cầu", type: "Điều chỉnh · Khám phá hình", description: "Tự thay đổi chiều dài và chiều cao để xây hình theo ý mình." },
    { mode: "crossmath", icon: "🔢", color: "game-orange", tag: "Ô CHỮ TOÁN HỌC", title: "Ô chữ tổng hàng – cột", type: "Kéo thả · Ghép giao điểm", description: "Sắp xếp các ô số sao cho mọi tổng theo hàng và cột cùng chính xác." },
    { mode: "rectangles", icon: "🧱", color: "game-green", tag: "VẼ VÀ TÍNH", title: "Vẽ hình đúng diện tích", type: "Tạo hình · Đếm ô vuông", description: "Tự vẽ hình chữ nhật trên lưới để tạo diện tích yêu cầu theo lớp." },
    { mode: "drag-race", icon: "🏎️", color: "game-purple", tag: "ĐUA XE TOÁN HỌC", title: "Đua xe thần tốc", type: "Tính nhẩm · Tăng tốc", description: "Giải phép tính theo lớp để tăng tốc, vượt bạn thỏ và chinh phục ba chặng đua." },
    { mode: "rocket", icon: "🚀", color: "game-purple", tag: "TOÁN + ĐIỀU KHIỂN 2D", title: "Phi thuyền nạp nhiên liệu", type: "Lái tàu · Tính tổng vừa đủ", description: "Mỗi viên pin hiện một số hoặc phép tính theo lớp. Nhẩm tổng nhiên liệu trước khi lái tàu tới nhặt." },
    { mode: "ocean", icon: "🐳", color: "game-blue", tag: "TOÁN + ĐIỀU KHIỂN 2D", title: "Cá voi hứng ngọc toán học", type: "Bơi tránh đá · Cộng giá trị ngọc", description: "Ngọc mang số hoặc phép tính theo lớp. Điều khiển cá voi, tính tổng để mở rương mà không vượt mức." },
    { mode: "memory", icon: "🃏", color: "game-orange", tag: "LẬT THẺ · GHÉP CẶP", title: "Thám tử lật thẻ toán", type: "Ghi nhớ · Ghép phép tính với kết quả", description: "Lật từng thẻ, ghi nhớ vị trí và ghép phép tính với đáp án đúng theo kiến thức lớp em." },
  ];
  return <main className={`math-games-page game-theme-${theme}`} data-grade={grade}><GameHeader /><section className="games-content"><div className="games-intro"><span>🎮 KHU VUI HỌC TOÁN</span><h1>Chọn trò chơi để bắt đầu!</h1><p>Lái nhân vật, khám phá thế giới và chơi toán bằng chính đôi tay của em.</p></div><div className="game-theme-picker" aria-label="Chọn chủ đề giao diện">{Object.entries(gameThemes).map(([key, item]) => <button key={key} className={theme === key ? "is-active" : ""} onClick={() => chooseTheme(key)}>{item.icon} {item.name}</button>)}</div><section className="game-theme-hero"><div className="game-theme-hero-copy"><span className="game-theme-kicker">{activeTheme.icon} CHỦ ĐỀ ĐANG CHỌN · LỚP {grade}</span><h2>{activeTheme.title}</h2><p>{activeTheme.description}</p><span className="game-theme-fit">Phù hợp: {activeTheme.fit}</span><a href="#interactive-games" className="game-theme-action">{activeTheme.action} <span>→</span></a></div><div className="game-theme-character"><StudyArt grade={grade} /></div><div className="game-theme-decoration" aria-hidden="true">{theme === "space" ? "✦  ·  🪐  ·  ✧" : theme === "ocean" ? "🫧  🐠  🫧" : "🍃  🌼  🍃"}</div></section><h2 className="game-section-title" id="interactive-games">🕹️ Chơi và điều khiển</h2><div className="grade-game-grid arcade-picker-grid">{arcadeGames.map((game) => <Link key={game.mode} to={`/tro-choi?mini=${game.mode}&grade=${grade}`} className={`grade-game-card ${game.color}`}><span className="grade-game-icon">{game.icon}</span><span className="grade-chip">{game.tag}</span><h2>{game.title}</h2><strong>{game.type}</strong><p>{game.description}</p><span className="play-game">Chơi ngay <i>→</i></span></Link>)}</div></section></main>;
}

function PlayGame({ game }) {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questions, setQuestions] = useState([]);
  const [round, setRound] = useState(1);
  const [selected, setSelected] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [gameResultIds, setGameResultIds] = useState([]);
  const [rewardResult, setRewardResult] = useState(null);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const questionStartedAt = useRef(0);
  const submittingRef = useRef(false);

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    setError("");
    try {
      const data = await getQuestionTopics(game.grade);
      setTopics(data.topics || []);
    } catch (loadError) {
      setError(loadError.message || "Không thể tải chủ đề.");
    } finally {
      setTopicsLoading(false);
    }
  }, [game.grade]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadTopics(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTopics]);

  async function startGame() {
    setLoading(true);
    setError("");
    setFinished(false);
    setQuestions([]);
    setCorrectCount(0);
    setGameResultIds([]);
    setRewardResult(null);
    setSelected(null);
    setAnswerResult(null);
    try {
      const data = await getQuestions({
        grade: game.grade,
        topic: selectedTopic || undefined,
        difficulty: difficulty || undefined,
        count: 10,
        activity: "game",
      });
      if (!data.questions?.length) throw new Error("Chưa có câu hỏi phù hợp bộ lọc này. Hãy chọn lại chủ đề hoặc độ khó.");
      setQuestions(data.questions);
      setRound(1);
      questionStartedAt.current = currentTime();
    } catch (loadError) {
      setError(loadError.message || "Không thể bắt đầu bài luyện tập.");
    } finally {
      setLoading(false);
    }
  }

  async function chooseAnswer(optionKey) {
    if (selected !== null || submittingRef.current) return;
    submittingRef.current = true;
    setSelected(optionKey);
    setSubmitting(true);
    setError("");
    try {
      const current = questions[round - 1];
      const result = await submitQuestionAnswer(current.questionId, optionKey, elapsedSeconds(questionStartedAt.current), "Game");
      setAnswerResult(result);
      if (result.resultId) setGameResultIds((ids) => [...ids, result.resultId]);
      if (result.isCorrect) setCorrectCount((count) => count + 1);
    } catch (submitError) {
      setSelected(null);
      setError(submitError.message || "Không thể lưu câu trả lời. Hãy thử lại.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function nextQuestion() {
    if (round >= questions.length) {
      setRewardLoading(true);
      setError("");
      try {
        const reward = await claimGameRewards(gameResultIds);
        setRewardResult(reward);
        setFinished(true);
      } catch (rewardError) {
        setError(rewardError.message || "Không thể nhận XP cho lượt chơi.");
      } finally {
        setRewardLoading(false);
      }
      return;
    }
    setRound((current) => current + 1);
    setSelected(null);
    setAnswerResult(null);
    questionStartedAt.current = currentTime();
  }

  const question = questions[round - 1];
  return <main className="math-games-page" data-grade={game.grade}><GameHeader /><section className="play-area">
    <Link className="play-back" to="/tro-choi">← Chọn trò chơi khác</Link>
    <div className={`play-card ${game.color}`}>
      <div className="play-card-top"><span className="grade-chip">LỚP {game.grade}</span><span className="question-count">{finished ? "HOÀN THÀNH" : questions.length ? `CÂU ${round} / ${questions.length}` : "QUESTION BANK"}</span></div>
      {error && <div className="question-bank-error" role="alert">{error}{topics.length === 0 && !topicsLoading && <button onClick={loadTopics}>Tải lại chủ đề</button>}</div>}
      {finished ? <div className="game-result"><span>{correctCount >= 8 ? "🏆" : correctCount >= 5 ? "🌟" : "💪"}</span><h1>{correctCount >= 8 ? "Xuất sắc lắm!" : correctCount >= 5 ? "Làm tốt lắm!" : "Cố gắng thêm nhé!"}</h1><p>Bạn trả lời đúng <strong>{correctCount}/{questions.length}</strong> câu từ Question Bank lớp {game.grade}.</p><p className="game-xp-reward">⚡ +{rewardResult?.rewardXp || 0} XP · Cấp {rewardResult?.level || "—"}</p><div className="result-actions"><button onClick={startGame}>Làm bài khác ↻</button><Link to="/phan-thuong">Xem XP & sao →</Link></div></div> : questions.length === 0 ? <>
        <div className="play-game-title"><span>{game.icon}</span><div><small>{game.topic}</small><h1>{game.title}</h1></div></div>
        <p className="question-bank-intro">Câu hỏi được lấy từ ngân hàng theo chương trình của lớp {game.grade}.</p>
        <div className="question-bank-filters">
          <label>Chủ đề<select value={selectedTopic} onChange={(event) => setSelectedTopic(event.target.value)} disabled={topicsLoading}><option value="">Tất cả chủ đề</option>{topics.map((topic) => <option key={topic.code} value={topic.code}>{topic.name}</option>)}</select></label>
          <label>Độ khó<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="">Mọi mức độ</option><option value="1">Dễ</option><option value="2">Trung bình</option><option value="3">Khó</option></select></label>
        </div>
        <button className="next-question" disabled={loading || topicsLoading} onClick={startGame}>{loading ? "Đang tải câu hỏi…" : "Bắt đầu bài luyện →"}</button>
      </> : <>
        <div className="play-progress"><span style={{ width: `${round / questions.length * 100}%` }} /></div>
        <div className="play-game-title"><span>{game.icon}</span><div><small>{question.topic.name} · {question.difficulty === 1 ? "Dễ" : question.difficulty === 2 ? "Trung bình" : "Khó"}</small><h1>{game.title}</h1></div></div>
        <div className="math-question">{question.questionText}</div>
        <div className="answer-options">{question.options.map((option) => <button key={option.key} className={selected === null ? "" : option.key === answerResult?.correctAnswer ? "answer-correct" : option.key === selected ? "answer-wrong" : "answer-muted"} onClick={() => chooseAnswer(option.key)} disabled={selected !== null || submitting}><span>{option.key}</span>{option.text}</button>)}</div>
        {answerResult && <div className={`answer-feedback ${answerResult.isCorrect ? "feedback-good" : "feedback-try"}`} role="status"><span>{answerResult.isCorrect ? "🎉 Chính xác!" : `💡 Đáp án đúng: ${answerResult.correctAnswer}`}</span><small>{answerResult.explanation}</small></div>}
        {answerResult && <button className="next-question" onClick={nextQuestion} disabled={rewardLoading}>{rewardLoading ? "Đang cộng XP…" : round === questions.length ? "Xem kết quả & nhận XP" : "Câu tiếp theo"} →</button>}
      </>}
    </div>
  </section></main>;
}

export default function MathGames() {
  const { grade: rawGrade } = useParams();
  const [searchParams] = useSearchParams();
  const miniGame = searchParams.get("mini");
  if (!rawGrade && ["balance", "maze", "geometry", "crossmath", "rectangles", "drag-race", "rocket", "ocean", "memory"].includes(miniGame)) {
    return <ArcadeMathGames mode={miniGame} grade={searchParams.get("grade")} />;
  }
  return <GamePicker />;
}
