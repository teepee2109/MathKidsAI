import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getWeeklyAssessment, startWeeklyAssessment, submitWeeklyAssessment } from "../services/weeklyAssessment";
import "./WeeklyAssessment.css";

const levelNames = { 1: "Cơ bản", 2: "Trung bình", 3: "Nâng cao" };

function formatWeek(value) {
  if (!value) return "Tuần này";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return `Tuần từ ${date.toLocaleDateString("vi-VN")}`;
}

export default function WeeklyAssessment({ onLogout }) {
  const [data, setData] = useState(null);
  const [current, setCurrent] = useState(null);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getWeeklyAssessment();
      setData(result);
      setCurrent(result.current);
      if (result.current?.status === "InProgress") {
        try { setAnswers(JSON.parse(sessionStorage.getItem(`mathkids-weekly-${result.current.attemptId}`) || "{}")); }
        catch { setAnswers({}); }
      } else setAnswers({});
      setIndex(0);
      setError("");
    } catch (loadError) {
      if (loadError.status === 401) onLogout();
      setError(loadError.message || "Không thể tải đánh giá tuần.");
    } finally { setLoading(false); }
  }, [onLogout]);

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (current?.status === "InProgress") sessionStorage.setItem(`mathkids-weekly-${current.attemptId}`, JSON.stringify(answers));
  }, [current, answers]);

  const questions = current?.questions || [];
  const question = questions[index];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const result = current?.result;

  async function start() {
    setBusy(true); setError("");
    try {
      const attempt = await startWeeklyAssessment();
      setCurrent(attempt); setAnswers({}); setIndex(0);
      setData((existing) => ({ ...existing, current: attempt }));
    } catch (startError) {
      if (startError.status === 401) onLogout();
      if (startError.status === 409) await load();
      setError(startError.message || "Không thể bắt đầu đánh giá tuần.");
    } finally { setBusy(false); }
  }

  async function submit() {
    if (!current || answeredCount !== questions.length || busy) return;
    setBusy(true); setError("");
    try {
      const submitted = await submitWeeklyAssessment(current.attemptId,
        questions.map((item) => ({ questionId: item.questionId, answer: answers[item.questionId] })));
      sessionStorage.removeItem(`mathkids-weekly-${current.attemptId}`);
      const completed = { ...current, ...submitted, status: "Completed", result: submitted };
      setCurrent(completed);
      setData((existing) => ({ ...existing, current: completed,
        history: [{ ...submitted }, ...(existing?.history || []).filter((item) => item.weekStart !== submitted.weekStart)].slice(0, 8),
        recommendedDifficulty: submitted.score >= 80 ? Math.min(3, submitted.difficulty + 1)
          : submitted.score < 50 ? Math.max(1, submitted.difficulty - 1) : submitted.difficulty,
      }));
    } catch (submitError) {
      if (submitError.status === 401) onLogout();
      setError(submitError.message || "Không thể nộp bài đánh giá tuần.");
    } finally { setBusy(false); }
  }

  return <main className="weekly-page">
    <header className="weekly-header"><BrandLogo to="/dashboard" /><Link to="/dashboard">← Về dashboard</Link></header>
    <div className="weekly-content">
      <section className="weekly-heading"><span className="weekly-kicker">ĐÁNH GIÁ NĂNG LỰC · LỚP {data?.grade || "—"}</span><h1>Thử thách kiến thức tuần</h1><p>Kết quả giúp điều chỉnh độ khó bài luyện tập tuần sau cho phù hợp với con.</p>
        {data && <div className="weekly-level-chip">Độ khó hiện tại: <strong>{levelNames[data.recommendedDifficulty]}</strong></div>}
      </section>
      {error && <div className="weekly-error" role="alert">{error}<button onClick={load}>Thử lại</button></div>}
      {loading ? <section className="weekly-panel">Đang tải đánh giá tuần…</section> : current?.status === "InProgress" && question ? <section className="weekly-panel weekly-quiz">
        <div className="weekly-quiz-meta"><span>{formatWeek(current.weekStart)} · Mức {levelNames[current.difficulty]}</span><strong>Câu {index + 1}/{questions.length}</strong></div>
        <div className="weekly-progress"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
        <small className="weekly-topic">{question.topic}</small><h2>{question.text}</h2>
        <div className="weekly-options">{question.options.map((option) => <button key={option.key} className={answers[question.questionId] === option.key ? "is-selected" : ""} onClick={() => setAnswers((existing) => ({ ...existing, [question.questionId]: option.key }))}><b>{option.key}</b>{option.text}</button>)}</div>
        <div className="weekly-controls"><button disabled={index === 0 || busy} onClick={() => setIndex((value) => value - 1)}>← Câu trước</button>
          {index < questions.length - 1 ? <button className="weekly-primary" disabled={!answers[question.questionId] || busy} onClick={() => setIndex((value) => value + 1)}>Câu tiếp theo →</button>
            : <button className="weekly-primary" disabled={answeredCount !== questions.length || busy} onClick={submit}>{busy ? "Đang chấm…" : "Nộp bài →"}</button>}</div>
        <small className="weekly-note">Đã trả lời {answeredCount}/{questions.length} câu · Có thể tiếp tục bài đang làm.</small>
      </section> : current?.status === "Completed" && result ? <section className="weekly-panel weekly-result">
        <span className="weekly-kicker">{formatWeek(current.weekStart)} · ĐÃ HOÀN THÀNH</span><h2>Kết quả đánh giá</h2><div className="weekly-score">{result.score ?? current.score}<small>/100</small></div>
        <p>Đúng {result.correctCount ?? current.correctCount}/10 câu ở mức {levelNames[current.difficulty]}.</p>
        <div className="weekly-next-level">Độ khó bài luyện tập tiếp theo: <strong>{levelNames[data.recommendedDifficulty]}</strong></div>
        <p className="weekly-adaptation">{current.score >= 80 ? "Làm tốt lắm! Tuần tới bài luyện sẽ tăng độ khó." : current.score < 50 ? "Tuần tới bài luyện sẽ nhẹ hơn để con củng cố nền tảng." : "Tuần tới tiếp tục luyện ở mức phù hợp này."}</p>
        <div className="weekly-review"><h3>Xem lại câu trả lời</h3>{(result.review || []).map((item, i) => <article key={item.questionId}><strong>Câu {i + 1} · {item.topic} · {item.isCorrect ? "✓ Đúng" : "✕ Chưa đúng"}</strong><p>{item.text}</p><small>Con chọn {item.answer} · Đáp án {item.correctAnswer}</small>{item.explanation && <p>{item.explanation}</p>}</article>)}</div>
      </section> : <section className="weekly-panel weekly-start"><span className="weekly-kicker">MỖI TUẦN MỘT LẦN</span><h2>Sẵn sàng kiểm tra kiến thức?</h2>
        <p>10 câu hỏi theo chương trình lớp {data?.grade}. Đây là bài đánh giá học tập, không phải trò chơi; kết quả giúp điều chỉnh độ khó luyện tập tuần tới.</p>
        {data?.previous && <div className="weekly-previous">Tuần trước: <strong>{data.previous.score}/100</strong> · độ khó {levelNames[data.previous.difficulty]}</div>}
        <button className="weekly-primary" disabled={busy} onClick={start}>{busy ? "Đang chuẩn bị…" : "Bắt đầu đánh giá →"}</button>
      </section>}
      <section className="weekly-history"><h2>Lịch sử đánh giá tuần</h2>{data?.history?.length ? data.history.map((item) => <article key={item.weekStart}><span>{formatWeek(item.weekStart)}</span><b>{item.score}/100</b><small>{levelNames[item.difficulty]}</small></article>) : <p>Kết quả các tuần đã hoàn thành sẽ hiển thị tại đây.</p>}</section>
    </div>
  </main>;
}
