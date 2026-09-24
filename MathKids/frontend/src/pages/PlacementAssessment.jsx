import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuthToken, getCachedUser } from "../authStorage";
import "./PlacementAssessment.css";

const api = `${import.meta.env.VITE_API_URL || "/api"}/students/me`;
const paymentsApi = `${import.meta.env.VITE_API_URL || "/api"}/payments`;
const assessmentContentEnabled = true;

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Không thể kết nối máy chủ.");
  return data;
}

async function paymentRequest(path) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${paymentsApi}${path}`, { cache: "no-store", headers: { Authorization: `Bearer ${getAuthToken()}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Không thể tải trạng thái Premium.");
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
  }
  throw lastError;
}

function AssessmentHeader() {
  return <header className="assessment-header"><Link className="dashboard-brand" to="/dashboard"><span>★</span> Math<span>Kids</span></Link><Link to="/dashboard">← Về dashboard</Link></header>;
}

function AssessmentHistory({ history }) {
  return <section className="assessment-history"><div className="assessment-history-heading"><div><span className="assessment-kicker">LỊCH SỬ HỌC TẬP</span><h2>Lịch sử bài đánh giá</h2></div><span>{history.length} lần hoàn thành</span></div>{history.length ? <div className="assessment-history-list">{history.map((item) => <article key={item.attemptId}><span className="history-icon">🎯</span><div><strong>Đánh giá năng lực lớp {item.grade}</strong><small>{new Date(item.submittedAt).toLocaleDateString("vi-VN")} · {new Date(item.submittedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</small><p>{item.summary}</p></div><b>{item.score}<i>/100</i></b></article>)}</div> : <p className="assessment-history-empty">Bạn chưa hoàn thành bài đánh giá nào.</p>}</section>;
}

function AssessmentResult({ result, onRetake, isPremium }) {
  const navigate = useNavigate();
  const [upgradePrompt, setUpgradePrompt] = useState(false);
  const score = result.overallScore ?? result.score ?? 0;
  const advice = result.advice || {};
  return <section className="assessment-result">
    <div className="assessment-score"><span>🎯</span><small>KẾT QUẢ ĐÁNH GIÁ</small><strong>{score}<i>/100</i></strong><p>{advice.summary || "Kết quả đã sẵn sàng. Hãy tiếp tục luyện tập mỗi ngày nhé!"}</p></div>
    <div className="assessment-skills"><h2>Bản đồ kỹ năng</h2><p>Đây là ảnh chụp hiện tại để chọn bài phù hợp, không phải điểm số cố định.</p>{(result.skillScores || []).map((skill) => <article className="skill-score" key={skill.code}><div><strong>{skill.name}</strong><span>{skill.correct}/{skill.total} câu</span></div><div className="skill-track"><span style={{ width: `${skill.score}%` }} /></div><b>{skill.score}%</b></article>)}</div>
    <div className="assessment-insights"><article><h3>🌟 Điểm mạnh</h3>{advice.strengths?.length ? <ul>{advice.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Con đang xây nền tảng — hãy luyện đều các chủ đề nhé.</p>}</article><article><h3>🧭 Nên luyện thêm</h3>{advice.focus?.length ? <ul>{advice.focus.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Tiếp tục thử thách bản thân với bài vận dụng.</p>}</article></div>
    {isPremium ? <div className="assessment-roadmap"><h2>Lộ trình học cá nhân hóa</h2><p>Lộ trình riêng dựa trên kết quả mới nhất của con.</p>{(advice.roadmap || []).map((item, index) => <article key={`${item.topicCode}-${index}`}><span>NGÀY {item.day || index + 1}</span><div><strong>{item.title}</strong><p>{item.activity}</p></div><Link to="/tro-choi">Luyện tập →</Link></article>)}</div> : <div className="assessment-roadmap assessment-locked"><div className="locked-content"><span className="locked-icon">🔒</span><div><h2>Lộ trình học cá nhân hóa</h2><p>AI đã chuẩn bị lộ trình riêng dựa trên kết quả của con. Nâng cấp Premium để mở khóa từng bước học, bài luyện tập và mục tiêu theo ngày.</p></div></div><button className="unlock-roadmap" onClick={() => setUpgradePrompt(true)}>Mở khóa lộ trình Premium →</button></div>}
    <div className="assessment-result-actions"><Link to="/tro-choi">Chơi trò toán →</Link><button onClick={onRetake}>Đánh giá lại</button></div>
    {upgradePrompt && <div className="upgrade-modal-backdrop" role="presentation" onClick={() => setUpgradePrompt(false)}><section className="upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Đóng" onClick={() => setUpgradePrompt(false)}>×</button><span className="modal-crown">👑</span><h2 id="upgrade-title">Mở khóa hành trình riêng cho con?</h2><p>Lộ trình AI cá nhân hóa giúp con biết hôm nay nên học gì, luyện bao nhiêu và tiến bộ ra sao.</p><div className="modal-actions"><button onClick={() => setUpgradePrompt(false)}>Để sau</button><button className="assessment-primary" onClick={() => navigate("/premium")}>Xem gói Premium →</button></div></section></div>}
  </section>;
}

export default function PlacementAssessment() {
  const [grade, setGrade] = useState(Number(getCachedUser()?.grade) || 1);
  const [attempt, setAttempt] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([request("/dashboard"), request("/assessment/latest"), request("/assessment/history")])
      .then(async ([dashboard, latest, historyData]) => {
        if (!active) return;
        setGrade(Number(dashboard.student.grade) || 1);
        setResult(latest.result);
        setHistory(historyData.history || []);
        const premium = await paymentRequest("/premium/status").catch(() => null);
        if (active) setIsPremium(Boolean(premium?.isPremium ?? getCachedUser()?.isPremium));
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function startAssessment() {
    setBusy(true); setError("");
    try {
      const data = await request("/assessment/start", { method: "POST", body: JSON.stringify({ grade }) });
      setAttempt(data); setAnswers({}); setQuestionIndex(0); setResult(null);
    } catch (startError) { setError(startError.message); }
    finally { setBusy(false); }
  }

  async function submitAssessment() {
    setBusy(true); setError("");
    try {
      const data = await request(`/assessment/${attempt.attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: attempt.questions.map((question) => ({ questionId: question.id, answer: answers[question.id] })) }),
      });
      setResult(data); setAttempt(null);
      setHistory((current) => [{ attemptId: data.attemptId, grade: data.grade, score: data.overallScore, submittedAt: new Date().toISOString(), summary: data.advice?.summary || "Đã hoàn thành bài đánh giá." }, ...current]);
      const premium = await paymentRequest("/premium/status").catch(() => null);
      setIsPremium(Boolean(premium?.isPremium ?? getCachedUser()?.isPremium));
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  }

  const question = attempt?.questions[questionIndex];
  return <main className="assessment-page"><AssessmentHeader /><div className="assessment-content">{assessmentContentEnabled && <>
    {loading ? <div className="assessment-loading">Đang chuẩn bị hồ sơ học tập…</div> : <><AssessmentHistory history={history} />{result && !attempt ? <AssessmentResult result={result} isPremium={isPremium} onRetake={startAssessment} /> : !attempt ? <section className="assessment-intro"><span className="assessment-hero-icon">🧠</span><span className="assessment-kicker">BẮT ĐẦU HÀNH TRÌNH CÁ NHÂN HÓA</span><h1>Khám phá cách con học toán</h1><p>Bài đánh giá ngắn gồm 10 câu, giúp tìm hiểu những phần con đã vững và phần nên luyện thêm. Đây không phải bài thi và không ảnh hưởng điểm ở trường.</p><div className="assessment-facts"><span>📝 10 câu hỏi</span><span>⏱️ Khoảng 5 phút</span><span>💛 Không áp lực</span></div><label className="assessment-grade">Lớp hiện tại<select value={grade} onChange={(event) => setGrade(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((item) => <option key={item} value={item}>Lớp {item}</option>)}</select></label><button className="assessment-primary" disabled={busy} onClick={startAssessment}>{busy ? "Đang chuẩn bị…" : "Bắt đầu đánh giá →"}</button><small className="assessment-privacy">Phân tích dựa trên câu trả lời; không dùng tên hay email để tạo gợi ý.</small></section> : <section className="assessment-question-card"><div className="assessment-step"><span>ĐÁNH GIÁ LỚP {attempt.grade}</span><strong>CÂU {questionIndex + 1} / {attempt.questions.length}</strong></div><div className="assessment-progress"><span style={{ width: `${(questionIndex + 1) * 10}%` }} /></div><span className="assessment-topic">{question.skillName}</span><h1>{question.prompt}</h1><div className="assessment-options">{question.options.map((option, index) => <button key={`${question.id}-${option}`} className={answers[question.id] === option ? "chosen" : ""} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div><div className="assessment-controls"><button disabled={questionIndex === 0 || busy} onClick={() => setQuestionIndex((index) => index - 1)}>← Câu trước</button>{questionIndex < attempt.questions.length - 1 ? <button className="assessment-primary" disabled={answers[question.id] === undefined || busy} onClick={() => setQuestionIndex((index) => index + 1)}>Câu tiếp theo →</button> : <button className="assessment-primary" disabled={Object.keys(answers).length !== attempt.questions.length || busy} onClick={submitAssessment}>{busy ? "Đang phân tích…" : "Nộp bài và xem gợi ý →"}</button>}</div><small className="assessment-answer-count">Đã trả lời {Object.keys(answers).length}/{attempt.questions.length} câu</small></section>}</>}</>}
    {error && <div className="assessment-error" role="alert">{error}</div>}
  </div></main>;
}
