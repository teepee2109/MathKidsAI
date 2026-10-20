import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import StudyArt, { ElementaryLessonVisual, MathPicture, StudyIcon } from "../components/StudyArt";
import { getQuestions, submitQuestionAnswer } from "../services/questions";
import { completeLesson, getLearningPath } from "../services/learning";
import LessonGuide from "./LessonGuide";
import "./LearningPath.css";
import "./LearningStudy.css";
import "./LearningObjectiveProgress.css";
import "./LearningTheory.css";

function TheoryDetails({ text }) {
  const source = String(text || "").trim();
  const startsWithBullet = source.startsWith("•");
  const parts = source.split(/\s*•\s*/).filter(Boolean);
  if (!parts.length) return null;
  if (parts.length === 1 && !startsWithBullet) return <p>{parts[0]}</p>;
  const [explanation, ...remaining] = startsWithBullet ? ["", ...parts] : parts;
  const warnings = remaining.filter((point) => /^(Hay nhầm|Hay sai|Lỗi thường gặp|Dễ nhầm|Chú ý):/i.test(point));
  const points = remaining.filter((point) => !warnings.includes(point));
  return <>
    {explanation && <p>{explanation}</p>}
    {points.length > 0 && <ul className="learning-theory-points">{points.map((point, index) => <li key={`${index}-${point}`}>{point}</li>)}</ul>}
    {warnings.length > 0 && <aside className="learning-theory-warning"><strong>⚠️ Lỗi dễ gặp</strong><ul>{warnings.map((point) => <li key={point}>{point.replace(/^(Hay nhầm|Hay sai|Lỗi thường gặp|Dễ nhầm|Chú ý):\s*/i, "")}</li>)}</ul></aside>}
  </>;
}

function WorkedExampleDetails({ text }) {
  const source = String(text || "");
  const markers = [...source.matchAll(/(?:^|\s)(\d+)\)\s*/g)];
  if (!markers.length) return <p>{source}</p>;
  const introduction = source.slice(0, markers[0].index).trim();
  const steps = markers.map((marker, index) => {
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? source.length;
    return source.slice(start, end).trim();
  });
  return <>
    {introduction && <p>{introduction}</p>}
    <ol className="learning-example-steps">{steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol>
  </>;
}

function YoungLearnerTheory({ introduction, keyConcept, topic, title, grade }) {
  const points = String(keyConcept || "").split(/\s*•\s*/).filter(Boolean);
  const mainIdea = points[0] || keyConcept;
  return <>
    <ElementaryLessonVisual topic={topic} title={title} grade={grade} />
    <p className="learning-young-intro">{introduction}</p>
    {mainIdea && <div className="learning-young-rule"><span aria-hidden="true">💡</span><div><strong>Em nhớ nhé</strong><p>{mainIdea}</p></div></div>}
    {points.length > 1 && <div className="learning-young-full-theory"><strong>📘 Mình cùng tìm hiểu kỹ hơn</strong><TheoryDetails text={points.slice(1).join(" • ")} /></div>}
  </>;
}

function YoungLearnerExample({ text }) {
  const source = String(text || "");
  const markers = [...source.matchAll(/(?:^|\s)(\d+)\)\s*/g)];
  if (!markers.length) return <p>{source}</p>;
  const introduction = source.slice(0, markers[0].index).trim();
  const steps = markers.map((marker, index) => {
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? source.length;
    return source.slice(start, end).trim();
  });
  return <>
    {introduction && <p className="learning-young-example-lead">{introduction}</p>}
    <ol className="learning-young-example-steps">{steps.map((step, index) => <li key={`${index}-${step}`}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
  </>;
}

function PercentageModel() {
  return <div className="percentage-model" role="img" aria-label="Bảng 100 ô, trong đó 25 ô được tô màu để minh họa 25 phần trăm">
    <div className="percentage-grid">{Array.from({ length: 100 }, (_, index) => <i className={index < 25 ? "is-filled" : ""} key={index} />)}</div>
    <div className="percentage-model-copy"><strong>Hình dung phần trăm</strong><span>Toàn bộ bảng có 100 ô. 25 ô được tô màu nghĩa là 25 trong 100 phần, tức 25% — cũng bằng 1/4.</span></div>
  </div>;
}

const objectiveProgressLabels = {
  mastered: "Đã vững",
  support_candidate: "Cần luyện thêm",
  developing: "Đang tiến bộ",
  insufficient_evidence: "Cần luyện thêm để đánh giá",
  curriculum_needs_review: "Học liệu đang được rà soát",
  prerequisite_not_mastered: "Cần củng cố phần nền trước",
};

function PersonalizedObjectiveProgress({ lesson, isPremium }) {
  if (!isPremium) return null;
  const coreObjectives = (lesson.learningObjectives || []).filter((objective) => objective.scope === "core");
  if (!coreObjectives.length) return null;

  const masteredCount = coreObjectives.filter((objective) => objective.progress?.isMastered).length;
  const focus = lesson.focusObjective;
  const needsSupport = focus?.status === "support_candidate";
  const reviewPendingCount = coreObjectives.filter((objective) => objective.progress?.curriculumStatus !== "teacher-approved").length;
  const questionCoveragePendingCount = coreObjectives.filter((objective) => objective.progress?.curriculumStatus === "teacher-approved"
    && (objective.progress?.approvedQuestionCount || 0) < 3).length;
  const focusMessage = focus
    ? needsSupport
      ? `Mình cùng ôn lại: ${focus.outcome}`
      : `Em đang tiến bộ ở: ${focus.outcome}`
    : reviewPendingCount
      ? "Gợi ý theo từng mục tiêu đang chờ giáo viên duyệt học liệu. Trước mắt, em vẫn học theo lộ trình của lớp nhé."
      : questionCoveragePendingCount
        ? "Một số mục tiêu cần thêm câu hỏi đã duyệt trước khi hệ thống có thể luyện đúng phần em cần."
        : masteredCount === coreObjectives.length
          ? "Em đã vững các mục tiêu cốt lõi trong bài này."
          : lesson.hasCompleteObjectiveEvidence
            ? "Hệ thống đang điều chỉnh mức luyện theo kết quả của em."
            : "Hãy tiếp tục học và luyện tập; hệ thống cần thêm kết quả trên nhiều câu khác nhau để nhận biết phần em đã vững.";

  return <section className="learning-objective-progress" aria-label="Tiến độ học tập cá nhân hóa">
    <div className="learning-objective-progress-heading">
      <div><small>TIẾN ĐỘ CỦA EM</small><strong>{masteredCount}/{coreObjectives.length} mục tiêu cốt lõi đã vững</strong></div>
      <span aria-hidden="true">🧭</span>
    </div>
    <p className={`learning-objective-focus ${needsSupport ? "needs-support" : ""}`}>{focusMessage}</p>
    <div className="learning-objective-progress-list">
      {coreObjectives.map((objective) => {
        const status = objective.progress?.evidenceStatus || "insufficient_evidence";
        const canShowAccuracy = objective.progress?.canInformAdaptivePath && Number.isFinite(objective.progress.accuracy);
        return <div className="learning-objective-progress-item" key={objective.code}>
          <span>{objective.outcome}</span>
          <small>{canShowAccuracy ? `${objective.progress.accuracy}% · ` : ""}{objectiveProgressLabels[status] || "Đang tích lũy kết quả"}</small>
        </div>;
      })}
    </div>
    <small className="learning-objective-progress-hint">Kết quả dựa trên bài học và phần tự luyện gần đây; trò chơi không làm thay đổi đánh giá này.</small>
  </section>;
}

export default function LearningPath({ onLogout }) {
  const { lessonId } = useParams();
  const [pathData, setPathData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [practice, setPractice] = useState([]);
  const [activePracticeObjective, setActivePracticeObjective] = useState(null);
  const [activePracticeUsesMixedDifficulty, setActivePracticeUsesMixedDifficulty] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [activePracticeDifficulty, setActivePracticeDifficulty] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [theoryRead, setTheoryRead] = useState(false);

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
  const practiceFinished = practice.length > 0 && practiceIndex >= practice.length;
  const practicePassCount = Math.ceil(practice.length * 2 / 3);
  const practicePassed = practiceFinished && correctCount >= practicePassCount;
  const selectedOptionText = currentQuestion?.options?.find((option) => option.key === answerResult?.answer)?.text;
  const correctOptionText = currentQuestion?.options?.find((option) => option.key === answerResult?.correctAnswer)?.text;
  const answerFeedback = answerResult?.feedback && !/\b(undefined|null)\b/i.test(answerResult.feedback)
    ? answerResult.feedback
    : `Em chọn ${answerResult?.answer || "?"}${selectedOptionText ? `: “${selectedOptionText}”` : ""}. Đáp án đúng ${answerResult?.correctAnswer || "?"}${correctOptionText ? `: “${correctOptionText}”` : ""}. Cách giải: ${answerResult?.explanation || "Hãy xem lại lý thuyết và tính lại từng bước."}`;

  useEffect(() => {
    setTheoryRead(false);
    setPractice([]);
    setActivePracticeObjective(null);
    setActivePracticeUsesMixedDifficulty(false);
    setPracticeIndex(0);
    setActivePracticeDifficulty(null);
    setAnswerResult(null);
    setWrongAnswers([]);
    setCorrectCount(0);
    setProgressMessage("");
  }, [lessonId]);

  async function startPractice() {
    if (!lesson || practiceLoading) return;
    setPracticeLoading(true);
    setPracticeError("");
    setPractice([]);
    setActivePracticeObjective(null);
    setActivePracticeUsesMixedDifficulty(false);
    setAnswerResult(null);
    setCorrectCount(0);
    setProgressMessage("");
    try {
      const baseDifficulty = activePracticeDifficulty || lesson.recommendedDifficulty || pathData.recommendedDifficulty || 1;
      const adjustedDifficulty = practiceFinished && pathData.isPremium
        ? correctCount === practice.length
          ? Math.min(3, baseDifficulty + 1)
          : !practicePassed ? Math.max(1, baseDifficulty - 1) : baseDifficulty
        : baseDifficulty;
      setActivePracticeDifficulty(adjustedDifficulty);
      let data;
      let targetedObjective = null;
      let usesMixedDifficulty = false;
      if (pathData.isPremium && lesson.focusObjective?.code) {
        let targeted = await getQuestions({
          grade: pathData.grade,
          topic: lesson.topic.code,
          objectiveCode: lesson.focusObjective.code,
          difficulty: adjustedDifficulty,
          count: 3,
        });
        if (targeted.questions?.length < 3) {
          const acrossDifficulties = await getQuestions({
            grade: pathData.grade,
            topic: lesson.topic.code,
            objectiveCode: lesson.focusObjective.code,
            count: 3,
          });
          if (acrossDifficulties.questions?.length >= 3) {
            targeted = acrossDifficulties;
            usesMixedDifficulty = true;
          }
        }
        if (targeted.questions?.length >= 3) {
          data = targeted;
          targetedObjective = lesson.focusObjective;
        }
      }
      if (!data) data = await getQuestions({ grade: pathData.grade, topic: lesson.topic.code, difficulty: adjustedDifficulty, count: 3 });
      if (data.questions?.length < 3) {
        const mixed = await getQuestions({ grade: pathData.grade, topic: lesson.topic.code, mixedDifficulty: true, count: 3 });
        if (mixed.questions?.length >= 3) {
          data = mixed;
          usesMixedDifficulty = true;
        }
      }
      if ((data.questions?.length || 0) < 3) throw new Error("Chủ đề này chưa có đủ 3 câu luyện tập để hoàn thành bài. Em hãy báo người lớn để bổ sung câu hỏi nhé.");
      setActivePracticeObjective(targetedObjective);
      setActivePracticeUsesMixedDifficulty(usesMixedDifficulty);
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
      if (result.isCorrect) {
        setCorrectCount((value) => value + 1);
      } else {
        const selected = currentQuestion.options?.find((option) => option.key === answer)?.text;
        const correct = currentQuestion.options?.find((option) => option.key === result.correctAnswer)?.text;
        setWrongAnswers((items) => [...items, {
          questionText: currentQuestion.questionText,
          answer,
          selectedOptionText: result.selectedOptionText || selected,
          correctAnswer: result.correctAnswer,
          correctOptionText: result.correctOptionText || correct,
          explanation: result.explanation || "Xem lại ví dụ từng bước ở phía trên, rồi thử làm lại nhé.",
        }]);
      }
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
    if (!lesson || savingProgress || !theoryRead || !practicePassed) return;
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

  return <main className={`learning-page ${lessonId ? "study-reading-mode" : ""}`} data-grade={pathData?.grade || 1}>
    <header className="learning-header"><BrandLogo to="/dashboard" /><nav aria-label="Điều hướng học tập"><Link to="/dashboard"><StudyIcon name="home" />Góc học</Link><Link className="is-active" to="/hoc-tap"><StudyIcon name="book" />Bài học</Link><Link to="/tro-choi"><StudyIcon name="game" />Trò chơi</Link></nav><Link className="learning-account" to="/ho-so"><StudyIcon name="user" />Hồ sơ</Link></header>
    <div className="learning-content">
      <Link className="learning-back" to="/dashboard">← Về góc học</Link>
      {error && <div className="learning-alert" role="alert">{error}<button onClick={loadPath}>Thử lại</button></div>}
      {loading ? <div className="learning-loading" role="status">Đang tải lộ trình học…</div> : pathData && <>
        <section className="learning-path-heading"><div><span className="learning-kicker">{["AI", "Gemini", "ChatGPT"].includes(pathData.generatedBy) ? `LỘ TRÌNH ${pathData.generatedBy === "AI" ? "AI" : pathData.generatedBy.toUpperCase()} ĐỀ XUẤT` : pathData.premiumRequired ? "BÀI HỌC THEO CHƯƠNG TRÌNH" : "LỘ TRÌNH CÁ NHÂN HÓA"} · LỚP {pathData.grade}</span><h1>Học tập theo từng bước</h1><p>Bài học theo chương trình, ưu tiên nội dung trong kết quả đánh giá và phần bạn cần củng cố.</p></div><div className="learning-completion-count"><strong>{pathData.completedCount + (pathData.masteredCount || 0)}</strong><span>/ {pathData.lessons.length} bài hoàn thành hoặc đã vững</span></div></section>
        {pathData.premiumRequired && <section className="learning-premium-note" aria-label="Quyền lợi Premium"><div><span>🔒</span><div><strong>Đây là lộ trình cơ bản theo lớp của gói Free</strong><p>Premium có thể ưu tiên kỹ năng con cần luyện, bỏ qua mục tiêu đã vững và mở bài tập theo mục tiêu ở mức khó hơn.</p></div></div><Link to="/premium">Xem rõ quyền lợi Premium →</Link></section>}
        {pathData.placementAssessmentRequired && <div className="learning-grade-assessment-notice" role="status">Lộ trình lớp {pathData.grade} chưa có kết quả đánh giá phù hợp. <Link to="/danh-gia">Làm đánh giá lớp {pathData.grade} để cập nhật lộ trình →</Link></div>}
        <div className="learning-path-layout">
          <details className="study-lesson-outline" open={!lessonId}>
            <summary>Các bài học của em</summary>
          <section className="learning-path-list" aria-label="Danh sách bài học">
            <div className="learning-recommendation"><span>🧭</span><div><small>BÀI HỌC ĐƯỢC GỢI Ý</small><strong>{pathData.lessons.find((item) => item.lessonId === pathData.recommendedLessonId)?.title || (pathData.masteredCount ? "Em đã vững các nội dung đã kiểm tra" : "Bạn đã hoàn thành lộ trình!")}</strong><p>{pathData.recommendation}</p></div></div>
            {pathData.lessons.map((item, index) => <Link key={item.lessonId} to={item.isLocked ? "/hoc-tap" : `/hoc-tap/${item.lessonId}`} aria-disabled={item.isLocked} onClick={(event) => { if (item.isLocked) event.preventDefault(); }} className={`learning-path-item ${String(item.lessonId) === lessonId ? "is-selected" : ""} ${item.isCompleted ? "is-completed" : ""} ${item.isMastered && !item.isCompleted ? "is-mastered" : ""} ${item.isLocked ? "is-locked" : ""}`}><span className="learning-step-number">{item.isCompleted ? "✓" : item.isMastered ? "⭐" : item.isLocked ? "🔒" : String(index + 1).padStart(2, "0")}</span><span className="learning-step-copy"><small>CHỦ ĐỀ · {item.topic.name.toLocaleUpperCase("vi-VN")}</small><strong>{item.title}</strong><span>{item.isCompleted ? "Đã hoàn thành" : item.isMastered ? "Đã vững theo bài đánh giá · có thể bỏ qua" : item.isLocked ? "Hoàn thành bài phía trước để mở khóa" : item.lessonId === pathData.recommendedLessonId ? pathData.recommendation : typeof item.assessmentAccuracy === "number" ? `${item.skillStatus} · ${item.assessmentSource} ${item.assessmentAccuracy}%` : item.answeredCount > 0 ? `Đã làm ${item.answeredCount} câu · đúng ${item.accuracy}% trong 30 ngày` : "Bài học theo chương trình lớp bạn"}</span></span><span className="learning-step-arrow">{item.isLocked ? "🔒" : "→"}</span></Link>)}
          </section>

          </details>
          <section className="learning-lesson-card">
            {!lesson ? <div className="learning-empty"><StudyArt grade={pathData.grade} /><h2>{lessonId ? "Không tìm thấy bài học" : "Chọn một bài để bắt đầu"}</h2><p>{lessonId ? "Bài học này không thuộc lớp hiện tại hoặc đã được gỡ khỏi lộ trình." : "Cùng khám phá kiến thức, xem ví dụ rồi làm thử nhé."}</p>{lessonId && <Link to="/hoc-tap" className="learning-primary">Quay lại lộ trình</Link>}</div> : lesson.isLocked ? <div className="learning-empty learning-locked-empty"><StudyIcon name="lock" size={48} /><h2>Bài học chưa được mở khóa</h2><p>Em hãy hoàn thành các bài học phía trước theo thứ tự. Khi hoàn thành bài hiện tại, bài tiếp theo sẽ tự động mở.</p><Link to="/hoc-tap" className="learning-primary">Quay lại danh sách bài</Link></div> : <>
              <div className="learning-lesson-top"><span className="learning-lesson-icon"><StudyIcon name="book" /></span><span className="learning-kicker">Bài học · {lesson.topic.name}</span>{lesson.isCompleted && <span className="learning-done-chip">✓ Đã hoàn thành</span>}{lesson.isMastered && !lesson.isCompleted && <span className="learning-mastered-chip">⭐ Đã vững</span>}</div>
              <h2>{lesson.title}</h2>
              {lesson.isMastered && !lesson.isCompleted && <p className="learning-mastered-note" role="note">Kết quả học tập đã cho thấy em đã vững phần này. Bài học vẫn mở để em xem lại nếu muốn, nhưng em có thể bỏ qua và học tiếp phần cần luyện.</p>}
              <PersonalizedObjectiveProgress lesson={lesson} isPremium={pathData.isPremium} />
              <div className="learning-study-steps" aria-label="Các bước học bài"><span className="is-active"><StudyIcon name="book" />1. Cùng khám phá</span><span className={theoryRead ? "is-active" : ""}><StudyIcon name="shapes" />2. Xem ví dụ</span><span className={practice.length > 0 ? "is-active" : ""}><StudyIcon name="flag" />3. Em thử nhé</span></div>
              <article className={`learning-concept ${pathData.grade <= 2 ? "learning-concept-for-early-readers" : ""}`}><small>{pathData.grade <= 2 ? "NHÌN HÌNH, HIỂU NGAY" : "Cùng khám phá"}</small><h3>{pathData.grade <= 2 ? "Mình cùng học nhé!" : "Hiểu bài từng chút một"}</h3>{pathData.grade <= 2 ? <YoungLearnerTheory introduction={lesson.introduction} keyConcept={lesson.keyConcept} topic={lesson.topic.code} title={lesson.title} grade={pathData.grade} /> : <><p className="learning-theory-introduction">{lesson.introduction}</p>{["addition", "subtraction", "multiplication", "division", "fractions", "fraction", "geometry", "measurement", "time"].includes(lesson.topic.code) && <MathPicture topic={lesson.topic.code} grade={pathData.grade} />}<TheoryDetails text={lesson.keyConcept} />{lesson.topic.code === "percentage" && <PercentageModel />}</>}</article>
              <article className={`learning-example ${pathData.grade <= 2 ? "learning-example-for-early-readers" : ""}`}><small>{pathData.grade <= 2 ? "VÍ DỤ BẰNG HÌNH VÀ CÁC BƯỚC NGẮN" : "Xem ví dụ"}</small><h3>Cùng làm từng bước</h3>{pathData.grade <= 2 ? <YoungLearnerExample text={lesson.workedExample} /> : <WorkedExampleDetails text={lesson.workedExample} />}</article>
              <LessonGuide grade={pathData.grade} topic={lesson.topic.code} />
              <section className={`learning-understanding ${pathData.grade <= 2 ? "learning-understanding-for-early-readers" : ""}`}><strong>💡 {pathData.grade <= 2 ? "Học theo cách vui vẻ" : "Cách học hiệu quả"}</strong><ol>{pathData.grade <= 2 ? <><li>Nhìn hình và nói to điều em nhận ra.</li><li>Dùng đồ vật quanh em để thử làm lại.</li></> : <><li>Đọc chậm phần lý thuyết và tìm từ khóa quan trọng.</li><li>Che kết quả trong ví dụ, tự làm lại trên giấy.</li><li>Nói lại quy tắc bằng lời của mình trước khi luyện tập.</li></>}</ol><button className="learning-understood" onClick={() => setTheoryRead(true)}>{theoryRead ? "✓ Em đã hiểu phần bài học" : pathData.grade <= 2 ? "✓ Em đã xem hình và hiểu bài" : "✓ Em đã đọc và hiểu lý thuyết"}</button></section>
              <section className={`learning-practice ${!theoryRead ? "is-locked" : ""}`}><div className="learning-practice-heading"><span><StudyIcon name="flag" /></span><div><strong>Em thử nhé</strong><small>{!theoryRead ? "Cùng học và xem ví dụ ở trên trước nhé" : `3 câu luyện tập lớp ${pathData.grade} · ${activePracticeUsesMixedDifficulty ? "nhiều mức độ" : `mức ${["", "cơ bản", "trung bình", "nâng cao"][activePracticeDifficulty || lesson.recommendedDifficulty || pathData.recommendedDifficulty || 1]}`}`}</small>{activePracticeObjective && <small className="learning-practice-focus">🧭 Luyện theo mục tiêu: {activePracticeObjective.outcome}</small>}</div></div>
                {!theoryRead ? <div className="learning-practice-locked">🔒 Phần luyện tập sẽ mở sau khi em hoàn thành phần học ở trên.</div> : practice.length === 0 ? <button className="learning-primary" onClick={startPractice} disabled={practiceLoading}>{practiceLoading ? "Đang chuẩn bị bài luyện…" : lesson.focusObjective && pathData.isPremium ? "Luyện phần cần củng cố →" : "Bắt đầu tự luyện →"}</button> : practiceIndex >= practice.length ? <>
                  <div className={`learning-practice-finished ${practicePassed ? "is-passed" : "needs-review"}`} role="status">
                    <strong>{practicePassed ? "Tốt lắm, em đã hiểu phần chính!" : "Mình cùng ôn lại một chút nhé!"}</strong>
                    <span>Em làm đúng {correctCount}/{practice.length} câu. {practicePassed ? "Hãy xem lại lời giải những câu sai trước khi hoàn thành bài." : `Cần đúng ít nhất ${practicePassCount}/${practice.length} câu để hoàn thành. Xem lại ví dụ rồi thử bộ câu mới nhé.`}</span>
                    <button className="learning-retry-practice" onClick={startPractice} disabled={practiceLoading}>{practiceLoading ? "Đang chuẩn bị…" : practicePassed && correctCount === practice.length ? "Thử thách hơn với bộ câu mới →" : !practicePassed && pathData.isPremium && activePracticeDifficulty > 1 ? "Thử bộ câu mới ở mức nhẹ hơn →" : "Luyện thêm bộ câu mới →"}</button>
                  </div>
                  {wrongAnswers.length > 0 && <section className="learning-mistake-review" aria-label="Các câu cần ôn lại">
                    <h4>🧩 Cùng xem lại câu mình còn nhầm</h4>
                    {wrongAnswers.map((mistake, index) => <article className="learning-mistake-card" key={`${mistake.questionText}-${index}`}>
                      <strong>{index + 1}. {mistake.questionText}</strong>
                      <span>Em chọn: {mistake.selectedOptionText || mistake.answer} · Đáp án đúng: {mistake.correctOptionText || mistake.correctAnswer}</span>
                      <p><b>Vì sao?</b> {mistake.explanation}</p>
                    </article>)}
                  </section>}
                </> : <>
                  <div className="learning-practice-progress">CÂU {practiceIndex + 1} / {practice.length}</div><p className="learning-practice-question">{currentQuestion.questionText}</p>
                  <div className="learning-practice-options">{currentQuestion.options.map((option) => <button key={option.key} disabled={Boolean(answerResult) || answerSubmitting} className={answerResult ? option.key === answerResult.correctAnswer ? "is-correct" : "is-muted" : ""} onClick={() => answerQuestion(option.key)}><b>{option.key}</b>{option.text}</button>)}</div>
                  {answerSubmitting && <small className="learning-submitting" role="status">Đang kiểm tra đáp án…</small>}
                  {answerResult && <div className={`learning-answer-feedback ${answerResult.isCorrect ? "is-right" : "is-wrong"}`} role="status"><strong>{answerResult.isCorrect ? "Chính xác!" : "Chưa đúng — cùng xem vì sao nhé."}</strong><span>{answerFeedback}</span><button onClick={nextPracticeQuestion}>{practiceIndex + 1 === practice.length ? "Xem kết quả" : "Câu tiếp theo →"}</button></div>}
                </>}
              </section>
              {practiceError && <p className="learning-alert learning-inline-alert" role="alert">{practiceError}</p>}
              {progressMessage && <p className="learning-progress-success" role="status">{progressMessage}</p>}
              <div className="learning-lesson-actions"><Link to="/hoc-tap">← Danh sách bài</Link>{lesson.isMastered && !lesson.isCompleted ? <Link to="/hoc-tap" className="learning-primary learning-skip-mastered">Bỏ qua bài đã vững →</Link> : <div className="learning-complete-action"><button className="learning-primary" onClick={markComplete} disabled={savingProgress || lesson.isCompleted || !theoryRead || !practicePassed}>{savingProgress ? "Đang lưu…" : lesson.isCompleted ? "Đã hoàn thành ✓" : "Đánh dấu đã học xong ✓"}</button>{!lesson.isCompleted && (!theoryRead || !practicePassed) && <small>{!theoryRead ? "Xem lý thuyết và ví dụ trước nhé." : !practiceFinished ? "Hoàn thành phần tự luyện để tiếp tục." : `Cần trả lời đúng ít nhất ${practicePassCount}/${practice.length} câu; em vẫn có thể thử lại.`}</small>}</div>}</div>
            </>}
          </section>
        </div>
      </>}
      <footer className="learning-footer"><Link to="/tro-choi">🎮 Khu trò chơi · Chơi để nhận XP và lên cấp →</Link><span>Học tập và trò chơi là hai hành trình riêng biệt.</span></footer>
    </div>
  </main>;
}
