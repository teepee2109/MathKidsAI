import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getAuthToken, getCachedUser } from "../authStorage";
import { apiFetch } from "../api";
import "./PlacementAssessment.css";
import "./StudentAssessmentRewards.css";

const assessmentContentEnabled = true;
const adviceFallbackMessages = {
  provider_disabled: "Gemini đang được tạm ngưng. Lộ trình hiện dựa trên điểm kỹ năng và quy tắc cá nhân hóa của hệ thống.",
  missing_key: "Backend chưa nạp GEMINI_API_KEY. Thêm key Google AI Studio vào backend/.env rồi khởi động lại backend.",
  invalid_key: "Gemini từ chối API key. Kiểm tra key trong Google AI Studio và cập nhật GEMINI_API_KEY trong backend/.env.",
  access_denied: "Gemini từ chối quyền truy cập. Kiểm tra key và quyền sử dụng Gemini API trong Google AI Studio.",
  quota_exhausted: "Gemini API đã chạm quota hoặc hạn mức của project. Kiểm tra quota/billing trong Google AI Studio hoặc Google Cloud.",
  rate_limited: "Gemini API đang vượt giới hạn tốc độ. Chờ một lúc rồi thử lại.",
  quota_or_rate_limit: "Gemini API báo vượt quota hoặc giới hạn tốc độ (HTTP 429). Kiểm tra mức sử dụng và quota của project.",
  provider_unavailable: "Dịch vụ Gemini tạm thời không khả dụng. Thử đánh giá lại sau.",
  request_rejected: "Gemini từ chối yêu cầu. Kiểm tra GEMINI_MODEL trong backend/.env.",
  timeout: "Gemini không phản hồi trong thời gian cho phép. Kiểm tra mạng backend rồi thử lại.",
  network_error: "Backend không kết nối được tới Gemini API. Kiểm tra mạng/firewall của backend.",
  invalid_response: "Gemini trả về nội dung không hợp lệ cho lộ trình. Kiểm tra log backend rồi thử lại.",
};

async function request(path, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await apiFetch(`students/me${path}`, {
        ...options,
        cache: "no-store",
        headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json", ...options.headers },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error([data.message, data.detail].filter(Boolean).join(" — ") || "Không thể kết nối máy chủ.");
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
  }
  throw lastError;
}

function AssessmentHeader() {
  return <header className="assessment-header"><BrandLogo to="/dashboard" /><Link to="/dashboard">← Về dashboard</Link></header>;
}

function AssessmentHistory({ history }) {
  return <section className="assessment-history"><div className="assessment-history-heading"><div><span className="assessment-kicker">LỊCH SỬ HỌC TẬP</span><h2>Lịch sử bài đánh giá</h2></div><span>{history.length} lần hoàn thành</span></div>{history.length ? <div className="assessment-history-list">{history.map((item) => <article key={item.attemptId}><span className="history-icon">🎯</span><div><strong>Đánh giá năng lực lớp {item.grade}</strong><small>{new Date(item.submittedAt).toLocaleDateString("vi-VN")} · {new Date(item.submittedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</small><p>{item.summary}</p></div><b>{item.score}<i>/100</i></b></article>)}</div> : <p className="assessment-history-empty">Bạn chưa hoàn thành bài đánh giá nào.</p>}</section>;
}

function AssessmentResult({ result, onRetake }) {
  const score = result.overallScore ?? result.score ?? 0;
  const advice = result.advice || {};
  return <section className="assessment-result">
    <div className="assessment-score"><span>🎯</span><small>KẾT QUẢ ĐÁNH GIÁ</small><strong>{score}<i>/100</i></strong><p>{advice.summary || "Kết quả đã sẵn sàng. Hãy tiếp tục luyện tập mỗi ngày nhé!"}</p>{result.rewards && <div className="assessment-reward-earned">{result.rewards.alreadyClaimedToday ? "🎯 Hôm nay bạn đã nhận phần thưởng đánh giá. Bài này vẫn giúp bạn luyện tập!" : `🎉 Nhận +${result.rewards.xp} XP${result.rewards.stars > 0 ? ` và +${result.rewards.stars} ⭐` : " · Đạt 70 điểm để nhận sao nhé!"}`}<Link to="/phan-thuong">Xem cấp độ & đổi sao →</Link></div>}</div>
    <div className="assessment-skills"><h2>Bản đồ kỹ năng</h2><p>Đây là ảnh chụp hiện tại để chọn bài phù hợp, không phải điểm số cố định.</p>{(result.skillScores || []).map((skill) => <article className="skill-score" key={skill.code}><div><strong>{skill.name}</strong><span>{skill.correct}/{skill.total} câu</span></div><div className="skill-track"><span style={{ width: `${skill.score}%` }} /></div><b>{skill.score}%</b></article>)}</div>
    <div className="assessment-insights"><article><h3>🌟 Điểm mạnh</h3>{advice.strengths?.length ? <ul>{advice.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Con đang xây nền tảng — hãy luyện đều các chủ đề nhé.</p>}</article><article><h3>🧭 Nên luyện thêm</h3>{advice.focus?.length ? <ul>{advice.focus.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Tiếp tục thử thách bản thân với bài vận dụng.</p>}</article></div>
    <div className="assessment-roadmap"><h2>Lộ trình học cá nhân hóa</h2><p>Dựa trên kết quả đánh giá, hệ thống ưu tiên bài học và bài luyện tập phù hợp trong mục Học tập.</p>{advice.fallbackReason !== "provider_disabled" && <div role="status" style={{ padding: "11px 13px", borderRadius: 11, fontSize: 11, fontWeight: 800, lineHeight: 1.5, border: `1px solid ${["Gemini", "ChatGPT", "AI"].includes(advice.generatedBy) ? "#ccebdc" : "#f2e3b9"}`, background: ["Gemini", "ChatGPT", "AI"].includes(advice.generatedBy) ? "#f0fbf5" : "#fffaf0", color: ["Gemini", "ChatGPT", "AI"].includes(advice.generatedBy) ? "#28734e" : "#896721" }}>{["Gemini", "ChatGPT", "AI"].includes(advice.generatedBy) ? `✨ ${advice.generatedBy === "ChatGPT" ? "ChatGPT" : advice.generatedBy} đã phân tích kết quả và đề xuất lộ trình học.` : `ℹ️ Đang hiển thị lộ trình dự phòng. ${adviceFallbackMessages[advice.fallbackReason] || "Đây là kết quả cũ chưa lưu mã chẩn đoán. Hãy khởi động lại backend và nộp lại bài đánh giá để xem nguyên nhân."}`}</div>}{(advice.roadmap || []).map((item, index) => <article key={`${item.topicCode}-${index}`}><span>CHẶNG {item.day || index + 1}</span><div><strong>{item.title}</strong><p>{item.activity}</p></div><Link to="/hoc-tap">Mở bài học →</Link></article>)}<Link className="assessment-primary assessment-learning-link" to="/hoc-tap">Mở lộ trình và các bài học →</Link></div>
    <div className="assessment-result-actions"><Link to="/tro-choi">Chơi trò toán →</Link><button onClick={onRetake}>Đánh giá lại</button></div>
  </section>;
}

export default function PlacementAssessment() {
  const [grade, setGrade] = useState(Number(getCachedUser()?.grade) || 1);
  const [attempt, setAttempt] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([request("/dashboard"), request("/assessment/latest"), request("/assessment/history")])
      .then(async ([dashboardResult, latestResult, historyResult]) => {
        if (!active) return;
        if (dashboardResult.status === "fulfilled") setGrade(Number(dashboardResult.value.student.grade) || 1);
        else setError(dashboardResult.reason?.message || "Không tải được hồ sơ học sinh.");
        if (latestResult.status === "fulfilled") setResult(latestResult.value.result);
        if (historyResult.status === "fulfilled") setHistory(historyResult.value.history || []);
        const assessmentErrors = [latestResult, historyResult]
          .filter((item) => item.status === "rejected")
          .map((item) => item.reason?.message)
          .filter(Boolean);
        if (assessmentErrors.length) setError((current) => [current, ...assessmentErrors].filter(Boolean).join(" "));
      })
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
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  }

  const question = attempt?.questions[questionIndex];
  return <main className="assessment-page"><AssessmentHeader /><div className="assessment-content">{assessmentContentEnabled && <>
    {loading ? <div className="assessment-loading">Đang chuẩn bị hồ sơ học tập…</div> : <><AssessmentHistory history={history} />{result && !attempt ? <AssessmentResult result={result} onRetake={startAssessment} /> : !attempt ? <section className="assessment-intro"><span className="assessment-hero-icon">🧠</span><span className="assessment-kicker">BẮT ĐẦU HÀNH TRÌNH CÁ NHÂN HÓA</span><h1>Khám phá cách con học toán</h1><p>Bài đánh giá ngắn gồm 10 câu, giúp tìm hiểu những phần con đã vững và phần nên luyện thêm. Đây không phải bài thi và không ảnh hưởng điểm ở trường.</p><div className="assessment-facts"><span>📝 10 câu hỏi</span><span>⏱️ Khoảng 5 phút</span><span>💛 Không áp lực</span></div><label className="assessment-grade">Lớp hiện tại<select value={grade} onChange={(event) => setGrade(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((item) => <option key={item} value={item}>Lớp {item}</option>)}</select></label><button className="assessment-primary" disabled={busy} onClick={startAssessment}>{busy ? "Đang chuẩn bị…" : "Bắt đầu đánh giá →"}</button><small className="assessment-privacy">Phân tích dựa trên câu trả lời; không dùng tên hay email để tạo gợi ý.</small></section> : <section className="assessment-question-card"><div className="assessment-step"><span>ĐÁNH GIÁ LỚP {attempt.grade}</span><strong>CÂU {questionIndex + 1} / {attempt.questions.length}</strong></div><div className="assessment-progress"><span style={{ width: `${(questionIndex + 1) * 10}%` }} /></div><span className="assessment-topic">{question.skillName}</span><h1>{question.prompt}</h1><div className="assessment-options">{question.options.map((option, index) => <button key={`${question.id}-${option}`} className={answers[question.id] === option ? "chosen" : ""} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div><div className="assessment-controls"><button disabled={questionIndex === 0 || busy} onClick={() => setQuestionIndex((index) => index - 1)}>← Câu trước</button>{questionIndex < attempt.questions.length - 1 ? <button className="assessment-primary" disabled={answers[question.id] === undefined || busy} onClick={() => setQuestionIndex((index) => index + 1)}>Câu tiếp theo →</button> : <button className="assessment-primary" disabled={Object.keys(answers).length !== attempt.questions.length || busy} onClick={submitAssessment}>{busy ? "Đang phân tích…" : "Nộp bài và xem gợi ý →"}</button>}</div><small className="assessment-answer-count">Đã trả lời {Object.keys(answers).length}/{attempt.questions.length} câu</small></section>}</>}</>}
    {error && <div className="assessment-error" role="alert">{error}</div>}
  </div></main>;
}
