import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getQuestions, submitQuestionAnswer } from "../services/questions";
import { completeLesson, getLearningPath } from "../services/learning";
import "./LearningPath.css";

const icons = ["➕", "🔷", "📏", "✖️", "🕒", "🍕", "📐", "🔟", "%"];

export default function LearningPath({ onLogout }) {
  const { lessonId } = useParams();
  const [pathData, setPathData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [practice, setPractice] = useState([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [answerResult, setAnswerResult] = useState(null);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");

  const loadPath = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLearningPath();
      setPathData(data);
    } catch (loadError) {
      if (loadError.status === 401) {
        onLogout();
        return;
      }
      setError(loadError.message || "Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    const timer = window.setTimeout(loadPath, 0);
    return () => window.clearTimeout(timer);
  }, [loadPath]);

  const lesson = useMemo(() => pathData?.lessons?.find((item) => String(item.lessonId) === lessonId), [pathData, lessonId]);
  const currentQuestion = practice[practiceIndex];

  async function startPractice() {
    if (!lesson || practiceLoading) return;
    setPracticeLoading(true);
    setPracticeError("");
    setPractice([]);
    setAnswerResult(null);
    setCorrectCount(0);
    setProgressMessage("");
    try {
      let data = await getQuestions({ grade: pathData.grade, topic: lesson.topic.code, difficulty: lesson.recommendedDifficulty || pathData.recommendedDifficulty || 1, count: 3 });
      if (data.questions?.length < 3) data = await getQuestions({ grade: pathData.grade, topic: lesson.topic.code, count: 3 });
      if (!data.questions?.length) throw new Error("Chủ đề này chưa có câu luyện tập. Bạn vẫn có thể đọc bài và đánh dấu đã học.");
      setPractice(data.questions);
      setPracticeIndex(0);
    } catch (loadError) {
      setPracticeError(loadError.message || "Không thể tải bài luyện tập.");
    } finally {
      setPracticeLoading(false);
    }
  }

  async function answerQuestion(answer) {
    if (!currentQuestion || answerResult || answerSubmitting) return;
    setPracticeError("");
    setAnswerSubmitting(true);
    try {
      const result = await submitQuestionAnswer(currentQuestion.questionId, answer, 0);
      setAnswerResult(result);
      if (result.isCorrect) setCorrectCount((value) => value + 1);
    } catch (submitError) {
      setPracticeError(submitError.message || "Không thể lưu câu trả lời.");
    } finally {
      setAnswerSubmitting(false);
    }
  }

  function nextPracticeQuestion() {
    if (practiceIndex + 1 < practice.length) {
      setPracticeIndex((index) => index + 1);
      setAnswerResult(null);
    } else {
      setPracticeIndex(practice.length);
      setAnswerResult(null);
    }
  }

  async function markComplete() {
    if (!lesson || savingProgress) return;
    setSavingProgress(true);
    setPracticeError("");
    try {
      const result = await completeLesson(lesson.lessonId);
      setProgressMessage(result.message || "Đã lưu tiến độ học.");
      await loadPath();
    } catch (saveError) {
      if (saveError.status === 401) {
        onLogout();
        return;
      }
      setPracticeError(saveError.message || "Không thể lưu tiến độ học.");
    } finally {
      setSavingProgress(false);
    }
  }

  return <main className="learning-page">
    <header className="learning-header"><BrandLogo to="/dashboard" /><nav><Link to="/dashboard">Tổng quan</Link><Link className="is-active" to="/hoc-tap">Học tập</Link><Link to="/tro-choi">🎮 Trò chơi</Link></nav><Link className="learning-account" to="/ho-so">Hồ sơ</Link></header>
    <div className="learning-content">
      <Link className="learning-back" to="/dashboard">← Về dashboard</Link>
      {error && <div className="learning-alert" role="alert">{error}<button onClick={loadPath}>Thử lại</button></div>}
      {loading ? <div className="learning-loading" role="status">Đang tải lộ trình học…</div> : pathData && <>
        <section className="learning-path-heading"><div><span className="learning-kicker">{["AI", "Gemini", "ChatGPT"].includes(pathData.generatedBy) ? `LỘ TRÌNH ${pathData.generatedBy === "AI" ? "AI" : pathData.generatedBy.toUpperCase()} ĐỀ XUẤT` : "LỘ TRÌNH CÁ NHÂN HÓA"} · LỚP {pathData.grade}</span><h1>Học tập theo từng bước</h1><p>Bài học theo chương trình, ưu tiên nội dung trong kết quả đánh giá và phần bạn cần củng cố.</p></div><div className="learning-completion-count"><strong>{pathData.completedCount}</strong><span>/ {pathData.lessons.length} bài hoàn thành</span></div></section>
        <div className="learning-path-layout">
          <section className="learning-path-list" aria-label="Danh sách bài học">
            <div className="learning-recommendation"><span>🧭</span><div><small>BÀI HỌC ĐƯỢC GỢI Ý</small><strong>{pathData.lessons.find((item) => item.lessonId === pathData.recommendedLessonId)?.title || "Bạn đã hoàn thành lộ trình!"}</strong><p>{pathData.recommendation}</p></div></div>
            {pathData.lessons.map((item, index) => <Link key={item.lessonId} to={`/hoc-tap/${item.lessonId}`} className={`learning-path-item ${String(item.lessonId) === lessonId ? "is-selected" : ""} ${item.isCompleted ? "is-completed" : ""}`}><span className="learning-step-number">{item.isCompleted ? "✓" : String(index + 1).padStart(2, "0")}</span><span className="learning-step-copy"><small>CHỦ ĐỀ · {item.topic.name.toLocaleUpperCase("vi-VN")}</small><strong>{item.title}</strong><span>{item.isCompleted ? "Đã hoàn thành" : item.lessonId === pathData.recommendedLessonId ? pathData.recommendation : typeof item.assessmentAccuracy === "number" ? `${item.skillStatus} · ${item.assessmentSource} ${item.assessmentAccuracy}%` : "Bài học theo chương trình lớp bạn"}</span></span><span className="learning-step-arrow">→</span></Link>)}
          </section>

          <section className="learning-lesson-card">
            {!lesson ? <div className="learning-empty"><span>{lessonId ? "🔎" : "📖"}</span><h2>{lessonId ? "Không tìm thấy bài học" : "Chọn một bài để bắt đầu"}</h2><p>{lessonId ? "Bài học này không thuộc lớp hiện tại hoặc đã được gỡ khỏi lộ trình." : "Đọc nội dung, xem ví dụ từng bước rồi luyện vài câu hỏi để củng cố kiến thức."}</p>{lessonId && <Link to="/hoc-tap" className="learning-primary">Quay lại lộ trình</Link>}</div> : <>
              <div className="learning-lesson-top"><span className="learning-lesson-icon">{icons[lesson.sortOrder - 1] || "📘"}</span><span className="learning-kicker">BÀI HỌC · {lesson.topic.name.toLocaleUpperCase("vi-VN")}</span>{lesson.isCompleted && <span className="learning-done-chip">✓ ĐÃ HOÀN THÀNH</span>}</div>
              <h2>{lesson.title}</h2><p className="learning-introduction">{lesson.introduction}</p>
              <article className="learning-concept"><small>Ý CHÍNH CẦN NHỚ</small><p>{lesson.keyConcept}</p></article>
              <article className="learning-example"><small>VÍ DỤ TỪNG BƯỚC</small><p>{lesson.workedExample}</p></article>
              <section className="learning-practice"><div className="learning-practice-heading"><span>✏️</span><div><strong>Luyện tập để ghi nhớ</strong><small>Câu hỏi lớp {pathData.grade} · mức { ["", "cơ bản", "trung bình", "nâng cao"][lesson.recommendedDifficulty || pathData.recommendedDifficulty || 1] }{lesson.assessmentSource ? ` theo ${lesson.assessmentSource.toLowerCase()}` : " phù hợp chương trình"}</small></div></div>
                {practice.length === 0 ? <button className="learning-primary" onClick={startPractice} disabled={practiceLoading}>{practiceLoading ? "Đang tải câu hỏi…" : "Bắt đầu luyện tập →"}</button> : practiceIndex >= practice.length ? <div className="learning-practice-finished" role="status"><strong>Hoàn thành phần luyện tập!</strong><span>Đúng {correctCount}/{practice.length} câu. Hãy cập nhật tiến độ để ghi nhận bài đã học.</span></div> : <>
                  <div className="learning-practice-progress">CÂU {practiceIndex + 1} / {practice.length}</div><p className="learning-practice-question">{currentQuestion.questionText}</p>
                  <div className="learning-practice-options">{currentQuestion.options.map((option) => <button key={option.key} disabled={Boolean(answerResult) || answerSubmitting} className={answerResult ? option.key === answerResult.correctAnswer ? "is-correct" : "is-muted" : ""} onClick={() => answerQuestion(option.key)}><b>{option.key}</b>{option.text}</button>)}</div>
                  {answerSubmitting && <small className="learning-submitting" role="status">Đang kiểm tra đáp án…</small>}
                  {answerResult && <div className={`learning-answer-feedback ${answerResult.isCorrect ? "is-right" : "is-wrong"}`} role="status"><strong>{answerResult.isCorrect ? "Chính xác!" : `Đáp án đúng: ${answerResult.correctAnswer}`}</strong><span>{answerResult.explanation}</span><button onClick={nextPracticeQuestion}>{practiceIndex + 1 === practice.length ? "Xem kết quả" : "Câu tiếp theo →"}</button></div>}
                </>}
              </section>
              {practiceError && <p className="learning-alert learning-inline-alert" role="alert">{practiceError}</p>}
              {progressMessage && <p className="learning-progress-success" role="status">{progressMessage}</p>}
              <div className="learning-lesson-actions"><Link to="/hoc-tap">← Danh sách bài</Link><button className="learning-primary" onClick={markComplete} disabled={savingProgress || lesson.isCompleted}>{savingProgress ? "Đang lưu…" : lesson.isCompleted ? "Đã hoàn thành ✓" : "Đánh dấu đã học xong ✓"}</button></div>
            </>}
          </section>
        </div>
      </>}
      <footer className="learning-footer"><Link to="/tro-choi">🎮 Khu trò chơi · Chơi để nhận XP và lên cấp →</Link><span>Học tập và trò chơi là hai hành trình riêng biệt.</span></footer>
    </div>
  </main>;
}
