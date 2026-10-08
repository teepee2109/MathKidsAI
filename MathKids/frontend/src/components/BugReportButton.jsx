import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "../api";
import "./BugReportButton.css";

const INITIAL_FORM = {
  screen: "",
  priority: "Medium",
  category: "Functional",
  description: "",
  steps: "",
  expected: "",
  actual: "",
  contact: "",
};

function getBrowserInfo() {
  if (typeof navigator === "undefined") return "Unknown";
  return `${navigator.userAgent}`;
}

export default function BugReportButton({ currentUser }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const currentScreen = useMemo(() => {
    const path = location.pathname || "/";

    if (path === "/") {
      return "Landing / Trang chủ";
    }

    const labels = {
      "/dang-nhap": "Đăng nhập",
      "/dang-ky": "Đăng ký",
      "/dashboard": "Student Dashboard",
      "/admin/dashboard": "Admin Dashboard",
      "/parent/dashboard": "Parent Dashboard",
      "/hoc-tap": "Học tập",
      "/tro-choi": "Trò chơi",
      "/danh-gia": "Kiểm tra đầu vào",
      "/danh-gia-tuan": "Kiểm tra tuần",
      "/kiem-tra-thang": "Kiểm tra tháng",
      "/premium": "Premium",
      "/ho-so": "Hồ sơ",
      "/phan-thuong": "Phần thưởng",
      "/lien-he": "Liên hệ",
    };

    const base = labels[path] || path;

    return location.pathname.includes("/")
      ? base
      : path;
  }, [location.pathname]);

  useEffect(() => {
    if (open) {
      setForm((previous) => ({
        ...previous,
        screen: currentScreen,
      }));

      setStatus({
        type: "",
        message: "",
      });
    }
  }, [open, currentScreen]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function closeModal() {
    if (submitting) return;

    setOpen(false);
  }

  async function submitReport(event) {
    event.preventDefault();

    if (!form.description.trim()) {
      setStatus({
        type: "error",
        message: "Vui lòng mô tả lỗi trước khi gửi.",
      });

      return;
    }

    setSubmitting(true);

    setStatus({
      type: "",
      message: "",
    });

    try {
      const response = await apiFetch("/bug-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,

          screen:
            form.screen.trim() || currentScreen,

          url: window.location.href,

          browser: getBrowserInfo(),

          userRole:
            currentUser?.role || "Guest",
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.message ||
          "Không thể gửi bug report."
        );
      }

      setStatus({
        type: "success",
        message:
          "Đã gửi bug report. Cảm ơn bạn đã giúp MathKids tốt hơn!",
      });

      setForm({
        ...INITIAL_FORM,
        screen: currentScreen,
      });

      window.setTimeout(() => {
        setOpen(false);
      }, 1400);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error.message ||
          "Không thể gửi bug report.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="bug-report-trigger"
        onClick={() => setOpen(true)}
        aria-label="Báo lỗi"
      >
        <span aria-hidden="true">
          🐞
        </span>

        <span>
          Báo lỗi
        </span>
      </button>

      {open && (
        <div
          className="bug-report-overlay"
          role="presentation"
          onMouseDown={closeModal}
        >
          <section
            className="bug-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bug-report-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="bug-report-header">
              <div>
                <span className="bug-report-kicker">
                  MATHKIDS FEEDBACK
                </span>

                <h2 id="bug-report-title">
                  🐞 Báo cáo lỗi
                </h2>

                <p>
                  Giúp đội ngũ MathKids biết chính xác
                  điều gì cần sửa.
                </p>
              </div>

              <button
                type="button"
                className="bug-report-close"
                onClick={closeModal}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={submitReport}
              className="bug-report-form"
            >
              <div className="bug-report-grid">

                <label>
                  Màn hình bị lỗi <span>*</span>

                  <input
                    name="screen"
                    value={form.screen}
                    onChange={updateField}
                    placeholder="Ví dụ: Student Dashboard"
                  />
                </label>

                <label>
                  Mức độ ưu tiên <span>*</span>

                  <select
                    name="priority"
                    value={form.priority}
                    onChange={updateField}
                  >
                    <option value="Low">
                      Low — ít ảnh hưởng
                    </option>

                    <option value="Medium">
                      Medium — cần sửa
                    </option>

                    <option value="High">
                      High — ảnh hưởng chức năng
                    </option>

                    <option value="Critical">
                      Critical — không thể sử dụng
                    </option>
                  </select>
                </label>

                <label>
                  Loại lỗi

                  <select
                    name="category"
                    value={form.category}
                    onChange={updateField}
                  >
                    <option>
                      Functional
                    </option>

                    <option>
                      UI / UX
                    </option>

                    <option>
                      Performance
                    </option>

                    <option>
                      Authentication
                    </option>

                    <option>
                      Payment
                    </option>

                    <option>
                      Data
                    </option>

                    <option>
                      Other
                    </option>
                  </select>
                </label>

                <label>
                  Email liên hệ (không bắt buộc)

                  <input
                    name="contact"
                    type="email"
                    value={form.contact}
                    onChange={updateField}
                    placeholder="Nếu cần đội ngũ liên hệ lại"
                  />
                </label>

              </div>

              <label>
                Mô tả lỗi <span>*</span>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  rows="3"
                  placeholder="Điều gì đã xảy ra?"
                />
              </label>

              <div className="bug-report-grid">

                <label>
                  Các bước để tái hiện

                  <textarea
                    name="steps"
                    value={form.steps}
                    onChange={updateField}
                    rows="3"
                    placeholder={
                      "1. Mở...\n2. Nhấn...\n3. Lỗi xuất hiện..."
                    }
                  />
                </label>

                <label>
                  Kết quả mong đợi

                  <textarea
                    name="expected"
                    value={form.expected}
                    onChange={updateField}
                    rows="3"
                    placeholder="Điều gì đáng lẽ phải xảy ra?"
                  />
                </label>

              </div>

              <label>
                Kết quả thực tế

                <textarea
                  name="actual"
                  value={form.actual}
                  onChange={updateField}
                  rows="3"
                  placeholder="Kết quả thực tế hoặc thông báo lỗi."
                />
              </label>

              {status.message && (
                <div
                  className={`bug-report-status ${status.type}`}
                  role="status"
                >
                  {status.message}
                </div>
              )}

              <div className="bug-report-meta">
                <span>
                  Trang: {location.pathname}
                </span>

                <span>
                  Vai trò: {currentUser?.role || "Guest"}
                </span>
              </div>

              <div className="bug-report-actions">

                <button
                  type="button"
                  className="bug-report-secondary"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="bug-report-submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Đang gửi..."
                    : "Gửi bug report →"}
                </button>

              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}