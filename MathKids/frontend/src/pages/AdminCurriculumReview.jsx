import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getAuthToken } from "../authStorage";
import "./AdminCurriculumReview.css";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function AdminCurriculumReview({ onLogout }) {
  const [grade, setGrade] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [revision, setRevision] = useState(0);

  const loadReview = useCallback(async (signal) => {
    try {
      const response = await fetch(`${API_URL}/admin/curriculum-review?grade=${grade}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
        signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Không thể tải dữ liệu rà soát.");
      setData(result);
      setError("");
    } catch (loadError) {
      if (loadError.name !== "AbortError") setError(loadError.message || "Không thể kết nối tới máy chủ.");
    }
  }, [grade]);

  useEffect(() => {
    const controller = new AbortController();
    loadReview(controller.signal);
    return () => controller.abort();
  }, [loadReview, revision]);

  async function updateStatus(path, body, key) {
    setBusyKey(key);
    setError("");
    try {
      const response = await fetch(`${API_URL}${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Không thể cập nhật trạng thái duyệt.");
      setRevision((current) => current + 1);
    } catch (updateError) {
      setError(updateError.message || "Không thể kết nối tới máy chủ.");
    } finally {
      setBusyKey("");
    }
  }

  return <main className="curriculum-review-shell">
    <header className="curriculum-review-header"><BrandLogo to="/admin/dashboard" /><div><Link to="/admin/dashboard">← Quản trị</Link><button onClick={onLogout}>Đăng xuất</button></div></header>
    <div className="curriculum-review-content">
      <div className="curriculum-review-title"><div><span>CHẤT LƯỢNG DỮ LIỆU HỌC TẬP</span><h1>Rà soát mục tiêu và câu hỏi</h1><p>Chỉ dữ liệu đã duyệt mới được dùng để xác định mức độ thành thạo và mở qua bài tương ứng.</p></div><label>Lọc theo lớp <select value={grade} onChange={(event) => setGrade(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((item) => <option key={item} value={item}>Lớp {item}</option>)}</select></label></div>
      {data && <section className="curriculum-review-policy"><div><strong>Quy tắc thành thạo</strong><span>{data.policy.minimumAttempts} lượt trả lời · {data.policy.minimumDistinctQuestions} câu khác nhau · đúng từ {data.policy.masteryAccuracy}% · trong {data.policy.evidenceWindowDays} ngày</span></div><div className="curriculum-review-summary"><span>{data.summary.curriculumPending} mục tiêu chờ duyệt</span><span>{data.summary.mappingPending} liên kết chờ duyệt</span><span>{data.summary.mappingApproved} liên kết đã duyệt</span><span>{data.summary.personalizationReady} mục tiêu sẵn sàng cá nhân hóa</span><span>{data.summary.questionCoveragePending} mục tiêu cần thêm câu hỏi</span></div></section>}
      {error && <div className="curriculum-review-error" role="alert">{error}</div>}
      {!data && !error && <p className="curriculum-review-empty">Đang tải nội dung…</p>}
      {data?.objectives.map((objective) => <article className="curriculum-objective-card" key={objective.code}>
        <div className="curriculum-objective-heading"><div><span className="curriculum-objective-code">{objective.code} · {objective.scope === "core" ? "CỐT LÕI" : objective.scope.toUpperCase()}</span><h2>{objective.outcome}</h2><p>Lớp {objective.grade} · {objective.topicTitle}{objective.lesson ? ` · Bài: ${objective.lesson.title}` : " · Chưa gắn bài học"}</p></div><div className="curriculum-objective-statuses" style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}><span className={`curriculum-status ${objective.verificationStatus === "teacher-approved" ? "is-approved" : "is-pending"}`}>{objective.verificationStatus === "teacher-approved" ? "Mục tiêu đã duyệt" : "Chờ duyệt mục tiêu"}</span><span className={`curriculum-status ${objective.personalizationReady ? "is-approved" : "is-pending"}`}>{objective.personalizationReady ? "Sẵn sàng cá nhân hóa" : objective.verificationStatus !== "teacher-approved" ? "Cần duyệt mục tiêu trước" : `Cần duyệt thêm để đủ 3 câu (${objective.approvedMappingCount}/3)`}</span></div></div>
        <div className="curriculum-objective-actions"><span>{objective.questionCount} câu · {objective.approvedMappingCount} liên kết đã duyệt · {objective.pendingMappingCount} chờ duyệt</span><button disabled={busyKey === `objective:${objective.code}`} onClick={() => updateStatus(`/admin/curriculum-review/objectives/${encodeURIComponent(objective.code)}`, { verificationStatus: objective.verificationStatus === "teacher-approved" ? "needs_teacher_review" : "teacher-approved", note: "Rà soát từ trang quản trị MathKids." }, `objective:${objective.code}`)}>{busyKey === `objective:${objective.code}` ? "Đang lưu…" : objective.verificationStatus === "teacher-approved" ? "Gỡ duyệt mục tiêu" : "Duyệt mục tiêu"}</button></div>
        {objective.questions.length ? <div className="curriculum-review-questions"><h3>Câu hỏi và căn cứ đo lường</h3>{objective.questions.map((question) => {
          const mappingKey = `mapping:${question.questionId}:${objective.code}`;
          const isApproved = question.status === "approved";
          return <section className="curriculum-review-question" key={mappingKey}>
            <div className="curriculum-review-question-top"><strong>{question.questionText}</strong><span className={`curriculum-status ${isApproved ? "is-approved" : "is-pending"}`}>{isApproved ? "Đã duyệt liên kết" : "Chờ duyệt liên kết"}</span></div>
            <div className="curriculum-review-options">{question.options.map((option, index) => <span className={String.fromCharCode(65 + index) === question.correctAnswer ? "is-answer" : ""} key={`${index}-${option}`}><b>{String.fromCharCode(65 + index)}.</b> {option}</span>)}</div>
            <p><b>Giải thích:</b> {question.explanation}</p><p><b>Căn cứ gắn mục tiêu:</b> {question.evidenceNote}</p>
            <button disabled={busyKey === mappingKey} onClick={() => updateStatus(`/admin/curriculum-review/mappings/${question.questionId}/${encodeURIComponent(objective.code)}`, { status: isApproved ? "needs-review" : "approved", note: "Rà soát từ trang quản trị MathKids." }, mappingKey)}>{busyKey === mappingKey ? "Đang lưu…" : isApproved ? "Gỡ duyệt liên kết" : "Duyệt liên kết câu hỏi"}</button>
          </section>;
        })}</div> : <p className="curriculum-review-empty">Mục tiêu này chưa có câu hỏi gắn để đo lường.</p>}
      </article>)}
    </div>
  </main>;
}
