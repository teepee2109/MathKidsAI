import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getMonthlyAssessment, startMonthlyAssessment, submitMonthlyAssessment } from "../services/monthlyAssessment";
import "./MonthlyAssessment.css";

function monthLabel(month) {
  if (!/^\d{4}-\d{2}$/.test(month || "")) return month || "Tháng này";
  const [year, number] = month.split("-");
  return `Tháng ${Number(number)}/${year}`;
}

function attemptKey(attemptId) {
  return `mathkids-monthly-assessment-${attemptId}`;
}

export default function MonthlyAssessment({ onLogout }) {
  const [data, setData] = useState(null);
  const [current, setCurrent] = useState(null);
  const [answers, setAnswers] = useState({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const result = await getMonthlyAssessment();
      setData(result);
      setCurrent(result.current);
      if (result.current?.status === "InProgress") {
        try { setAnswers(JSON.parse(sessionStorage.getItem(attemptKey(result.current.attemptId)) || "{}")); }
        catch { setAnswers({}); }
      } else {
        setAnswers({});
      }
      setQuestionIndex(0);
      setError("");
    } catch (loadError) {
      if (loadError.status === 401) onLogout();
      setError(loadError.message || "Không thể tải bài kiểm tra tháng.");
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (current?.status !== "InProgress") return;
    sessionStorage.setItem(attemptKey(current.attemptId), JSON.stringify(answers));
  }, [answers, current]);

  const questions = current?.questions || [];
  const question = questions[questionIndex];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const result = current?.result;

  async function beginTest() {
    setBusy(true);
    setError("");
    try {
      const attempt = await startMonthlyAssessment();
      setCurrent(attempt);
      setAnswers({});
      setQuestionIndex(0);
      setData((existing) => existing ? { ...existing, current: attempt } : existing);
    } catch (startError) {
      if (startError.status === 401) onLogout();
      if (startError.status === 409) await load(false);
      setError(startError.message || "Không thể bắt đầu bài kiểm tra tháng.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTest() {
    if (!current || answeredCount !== questions.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const submitted = await submitMonthlyAssessment(current.attemptId,
        questions.map((item) => ({ questionId: item.questionId, answer: answers[item.questionId] })));
      sessionStorage.removeItem(attemptKey(current.attemptId));
      const completed = { ...current, ...submitted, status: "Completed", result: submitted };
      setCurrent(completed);
      setData((existing) => ({
        ...existing,
        current: completed,
        history: [
          { ...submitted, month: submitted.month || current.month, grade: current.grade },
          ...(existing?.history || []).filter((item) => item.attemptId !== current.attemptId),
        ].slice(0, 12),
      }));
    } catch (submitError) {
      if (submitError.status === 401) onLogout();
      setError(submitError.message || "Không thể nộp bài kiểm tra tháng.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="monthly-page">
    <header className="monthly-header"><BrandLogo to="/dashboard" /><Link to="/dashboard">← Về dashboard</Link></header>
    <div className="monthly-content">
      <section className="monthly-heading-card">
        <div><span className="monthly-kicker">KIỂM TRA ĐỊNH KỲ · LỚP {current?.grade || data?.grade || "—"}</span>
          <h1>Bài kiểm tra tháng</h1>
          <p>Ôn tập kiến thức đã học, xem kết quả từng câu và ghi nhận tiến bộ.</p></div>
        <span className="monthly-calendar" aria-hidden="true">🗓️</span>
        <strong className="monthly-month-pill">{monthLabel(data?.month || current?.month)}</strong>
      </section>

      {error && <div className="monthly-error" role="alert"><span>{error}</span><button onClick={() => load()}>Tải lại</button></div>}

      {loading ? <section className="monthly-panel monthly-loading" role="status">Đang tải bài kiểm tra tháng…</section> : current?.status === "InProgress" && question ? <section className="monthly-panel monthly-question-panel">
        <div className="monthly-test-meta"><span>{monthLabel(current.month)} · Lớp {current.grade}</span><strong>Câu {questionIndex + 1}/{questions.length}</strong></div>
        <div className="monthly-progress"><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
        <span className="monthly-topic">{question.topic}</span>
        <h2>{question.text}</h2>
        <div className="monthly-options">{question.options.map((option) => <button type="button" key={option.key}
          className={answers[question.questionId] === option.key ? "is-selected" : ""}
          onClick={() => setAnswers((existing) => ({ ...existing, [question.questionId]: option.key }))}>
          <span>{option.key}</span>{option.text}
        </button>)}</div>
        <div className="monthly-question-nav" aria-label="Chọn câu hỏi">{questions.map((item, index) => <button key={item.questionId}
          type="button" className={`${index === questionIndex ? "is-current" : ""} ${answers[item.questionId] ? "is-answered" : ""}`}
          onClick={() => setQuestionIndex(index)} aria-label={`Câu ${index + 1}`}>{index + 1}</button>)}</div>
        <div className="monthly-controls">
          <button type="button" disabled={questionIndex === 0 || busy} onClick={() => setQuestionIndex((index) => index - 1)}>← Câu trước</button>
          {questionIndex < questions.length - 1
            ? <button className="monthly-primary" type="button" disabled={!answers[question.questionId] || busy} onClick={() => setQuestionIndex((index) => index + 1)}>Câu tiếp theo →</button>
            : <button className="monthly-primary" type="button" disabled={answeredCount !== questions.length || busy} onClick={submitTest}>{busy ? "Đang chấm bài…" : "Nộp bài kiểm tra →"}</button>}
        </div>
        <small className="monthly-answer-count">Đã trả lời {answeredCount}/{questions.length} câu · Bài làm được giữ lại trên thiết bị này.</small>
      </section> : current?.status === "Completed" && result ? <section className="monthly-panel monthly-result-panel">
        <span className="monthly-result-icon">{result.score >= 70 ? "🎉" : "💪"}</span>
        <span className="monthly-kicker">ĐÃ HOÀN THÀNH · {monthLabel(current.month)}</span>
        <h2>Kết quả của bạn</h2>
        <div className="monthly-score"><strong>{result.score ?? current.score}</strong><span>/100</span></div>
        <p className="monthly-result-summary">Con trả lời đúng <strong>{result.correctCount ?? current.correctCount}/{result.totalCount ?? current.totalCount}</strong> câu. Cứ luyện tập đều đặn để tiến bộ hơn nhé!</p>
        <div className="monthly-earned">⚡ +{result.rewardXp ?? current.rewardXp} XP{(result.rewardStars ?? current.rewardStars) > 0 ? ` · ⭐ +${result.rewardStars ?? current.rewardStars}` : ""}</div>
        <div className="monthly-review"><h3>Xem lại từng câu</h3>{(result.review || []).map((item, index) => <article className={item.isCorrect ? "review-correct" : "review-wrong"} key={item.questionId}>
          <div className="review-heading"><strong>Câu {index + 1} · {item.topic}</strong><span>{item.isCorrect ? "✓ Chính xác" : "✕ Chưa đúng"}</span></div>
          <p>{item.text}</p><small>Con chọn: {item.answer} · Đáp án: {item.correctAnswer}</small>
          {item.explanation && <p className="review-explanation">{item.explanation}</p>}
        </article>)}</div>
      </section> : <section className="monthly-panel monthly-start-panel">
        <span className="monthly-start-icon">📝</span><span className="monthly-kicker">MỤC TIÊU THÁNG NÀY</span>
        <h2>Sẵn sàng thử sức?</h2>
        <p>Bài kiểm tra gồm 10 câu theo nội dung lớp {data?.grade || 1}. Con có thể quay lại tiếp tục nếu cần; mỗi tháng chỉ tính một lần nộp để theo dõi tiến bộ.</p>
        <div className="monthly-facts"><span>🧮 10 câu hỏi</span><span>⏱️ Không giới hạn giờ</span><span>🎁 Nhận XP và sao</span></div>
        <button className="monthly-primary" type="button" disabled={busy || Boolean(current?.status === "Completed")} onClick={beginTest}>
          {busy ? "Đang chuẩn bị…" : current?.status === "Completed" ? "Đã hoàn thành tháng này" : current?.status === "InProgress" ? "Tiếp tục bài kiểm tra →" : "Bắt đầu kiểm tra →"}
        </button>
      </section>}

      <section className="monthly-history"><div className="monthly-history-heading"><div><span className="monthly-kicker">THEO DÕI TIẾN BỘ</span><h2>Lịch sử kiểm tra</h2></div><span>{data?.history?.length || 0} bài đã nộp</span></div>
        {data?.history?.length ? <div className="monthly-history-list">{data.history.map((item) => <article key={item.attemptId}>
          <span className="history-month-icon">📅</span><div><strong>{monthLabel(item.month)} · Lớp {item.grade}</strong><small>Đúng {item.correctCount}/{item.totalCount} câu</small></div>
          <b>{item.score}<i>/100</i></b>
        </article>)}</div> : <p className="monthly-history-empty">Bài đã nộp sẽ xuất hiện tại đây sau khi hoàn thành.</p>}
      </section>
    </div>
  </main>;
}
