import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

const initialValues = {
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Auth({ initialMode = "login", onAuthenticated }) {
    const navigate = useNavigate();

    const [mode, setMode] = useState(initialMode);
    const [values, setValues] = useState(initialValues);
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isRegister = mode === "register";

    function switchMode(nextMode) {
        setMode(nextMode);

        navigate(
            nextMode === "register"
                ? "/dang-ky"
                : "/dang-nhap"
        );

        setValues(initialValues);
        setError("");
        setErrors({});
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setValues((current) => ({
            ...current,
            [name]: value
        }));

        setError("");

        setErrors((current) => ({
            ...current,
            [name]: ""
        }));
    }

    function validate() {
        const nextErrors = {};

        const name = values.name.trim();
        const email = values.email.trim();

        // Validate name
        if (isRegister && !name) {
            nextErrors.name = "Vui lòng nhập họ và tên.";
        } else if (isRegister && name.length < 2) {
            nextErrors.name =
                "Họ và tên phải có ít nhất 2 ký tự.";
        } else if (
            isRegister &&
            !/^[\p{L}\s'.-]+$/u.test(name)
        ) {
            nextErrors.name =
                "Họ và tên không được chứa ký tự đặc biệt.";
        }

        // Validate email
        if (!email) {
            nextErrors.email = "Vui lòng nhập email.";
        } else if (!emailPattern.test(email)) {
            nextErrors.email =
                "Email không đúng định dạng.";
        }

        // Validate password
        if (!values.password) {
            nextErrors.password =
                "Vui lòng nhập mật khẩu.";
        } else if (values.password.length < 6) {
            nextErrors.password =
                "Mật khẩu cần có ít nhất 6 ký tự.";
        }

        // Validate confirm password
        if (isRegister && !values.confirmPassword) {
            nextErrors.confirmPassword =
                "Vui lòng xác nhận mật khẩu.";
        } else if (
            isRegister &&
            values.password !== values.confirmPassword
        ) {
            nextErrors.confirmPassword =
                "Mật khẩu xác nhận chưa khớp.";
        }

        setErrors(nextErrors);

        return Object.keys(nextErrors).length === 0;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!validate()) {
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            // Xác định API
            const url = `${import.meta.env.VITE_API_URL || "/api"}/auth/${mode === "register" ? "register" : "login"}`;

            // Dữ liệu gửi lên Backend
            const body =
                mode === "register"
                    ? {
                        name: values.name.trim(),
                        email: values.email.trim(),
                        password: values.password,
                        confirmPassword:
                            values.confirmPassword
                    }
                    : {
                        email: values.email.trim(),
                        password: values.password
                    };

            // Gọi API Backend
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            // Đọc response
            const data = await response.json();

            // Nếu Backend trả lỗi
            if (!response.ok) {
                throw new Error(
                    data.message || "Có lỗi xảy ra."
                );
            }

            // Lưu JWT token
            localStorage.setItem("token", data.token);

            // Lưu thông tin user
            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            // Đăng nhập / đăng ký thành công
            onAuthenticated?.();
            navigate("/dashboard");

        } catch (error) {
            console.error("Auth error:", error);

            setError(
                error.message ||
                "Không thể kết nối tới máy chủ."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="auth-shell">

            {/* LEFT SIDE */}
            <section
                className="auth-visual"
                aria-label="MathKids"
            >
                <div className="cloud cloud-one" />
                <div className="cloud cloud-two" />

                <div className="spark spark-one">
                    ✦
                </div>

                <div className="spark spark-two">
                    ✦
                </div>

                <div className="visual-content">

                    <div
                        className="brand-mark"
                        aria-hidden="true"
                    >
                        ＋
                    </div>

                    <p className="eyebrow">
                        MathKids
                    </p>

                    <h1>
                        Học Toán vui hơn,
                        <br />
                        <span>
                            tiến bộ mỗi ngày!
                        </span>
                    </h1>

                    <p className="visual-copy">
                        Cùng khám phá thế giới con số
                        qua những bài học và trò chơi
                        thú vị.
                    </p>

                    <div
                        className="math-card"
                        aria-hidden="true"
                    >
                        <span className="math-card-icon">
                            ∑
                        </span>

                        <span>
                            <strong>
                                +25 XP
                            </strong>

                            <small>
                                Hoàn thành bài học
                            </small>
                        </span>

                        <span className="check">
                            ✓
                        </span>
                    </div>
                </div>

                <div
                    className="visual-character"
                    aria-hidden="true"
                >
                    🦊
                </div>
            </section>

            {/* RIGHT SIDE */}
            <section className="auth-panel">

                <div className="auth-form-wrap">

                    <Link
                        className="mobile-brand"
                        to="/"
                    >
                        <span>＋</span>
                        {" "}MathKids
                    </Link>

                    <div className="auth-heading">

                        <p className="form-kicker">
                            {isRegister
                                ? "Bắt đầu hành trình"
                                : "Chào mừng trở lại"}
                        </p>

                        <h2>
                            {isRegister
                                ? "Tạo tài khoản mới"
                                : "Đăng nhập tài khoản"}
                        </h2>

                        <p>
                            {isRegister
                                ? "Tạo tài khoản để bắt đầu học Toán thật vui."
                                : "Tiếp tục hành trình chinh phục Toán học của bạn."}
                        </p>

                    </div>

                    {/* LOGIN / REGISTER */}
                    <div
                        className="mode-switch"
                        role="tablist"
                        aria-label="Loại biểu mẫu"
                    >
                        <button
                            className={
                                mode === "login"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                switchMode("login")
                            }
                            type="button"
                        >
                            Đăng nhập
                        </button>

                        <button
                            className={
                                mode === "register"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                switchMode("register")
                            }
                            type="button"
                        >
                            Đăng ký
                        </button>
                    </div>

                    {/* FORM */}
                    <form
                        onSubmit={handleSubmit}
                        noValidate
                    >

                        {/* NAME */}
                        {isRegister && (
                            <label className="field">

                                <span>
                                    Họ và tên
                                </span>

                                <span className="input-wrap">

                                    <span className="input-icon">
                                        ☺
                                    </span>

                                    <input
                                        name="name"
                                        value={values.name}
                                        onChange={handleChange}
                                        placeholder="Nhập họ và tên"
                                        required
                                        aria-invalid={
                                            Boolean(
                                                errors.name
                                            )
                                        }
                                    />

                                </span>

                                {errors.name && (
                                    <small className="field-error">
                                        {errors.name}
                                    </small>
                                )}

                            </label>
                        )}

                        {/* EMAIL */}
                        <label className="field">

                            <span>
                                Email
                            </span>

                            <span className="input-wrap">

                                <span className="input-icon">
                                    ✉
                                </span>

                                <input
                                    type="email"
                                    name="email"
                                    value={values.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    required
                                    aria-invalid={
                                        Boolean(
                                            errors.email
                                        )
                                    }
                                />

                            </span>

                            {errors.email && (
                                <small className="field-error">
                                    {errors.email}
                                </small>
                            )}

                        </label>

                        {/* PASSWORD */}
                        <label className="field">

                            <span>
                                Mật khẩu
                            </span>

                            <span className="input-wrap">

                                <span className="input-icon">
                                    ▣
                                </span>

                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    name="password"
                                    value={values.password}
                                    onChange={handleChange}
                                    placeholder="Ít nhất 6 ký tự"
                                    required
                                    aria-invalid={
                                        Boolean(
                                            errors.password
                                        )
                                    }
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            (show) =>
                                                !show
                                        )
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Ẩn mật khẩu"
                                            : "Hiện mật khẩu"
                                    }
                                >
                                    {showPassword
                                        ? "Ẩn"
                                        : "Hiện"}
                                </button>

                            </span>

                            {errors.password && (
                                <small className="field-error">
                                    {errors.password}
                                </small>
                            )}

                        </label>

                        {/* CONFIRM PASSWORD */}
                        {isRegister && (
                            <label className="field">

                                <span>
                                    Nhập lại mật khẩu
                                </span>

                                <span className="input-wrap">

                                    <span className="input-icon">
                                        ▣
                                    </span>

                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={
                                            values.confirmPassword
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Nhập lại mật khẩu"
                                        required
                                        aria-invalid={
                                            Boolean(
                                                errors.confirmPassword
                                            )
                                        }
                                    />

                                </span>

                                {errors.confirmPassword && (
                                    <small className="field-error">
                                        {
                                            errors.confirmPassword
                                        }
                                    </small>
                                )}

                            </label>
                        )}

                        {/* LOGIN OPTIONS */}
                        {!isRegister && (
                            <div className="form-options">

                                <label className="remember">

                                    <input
                                        type="checkbox"
                                        checked={remember}
                                        onChange={(event) =>
                                            setRemember(
                                                event.target
                                                    .checked
                                            )
                                        }
                                    />

                                    <span>
                                        Ghi nhớ đăng nhập
                                    </span>

                                </label>

                                <button
                                    type="button"
                                    className="link-button"
                                >
                                    Quên mật khẩu?
                                </button>

                            </div>
                        )}

                        {/* ERROR */}
                        {error && (
                            <p
                                className="form-error"
                                role="alert"
                            >
                                {error}
                            </p>
                        )}

                        {/* SUBMIT */}
                        <button
                            className="submit-button"
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? "Đang xử lý..."
                                : isRegister
                                    ? "Tạo tài khoản"
                                    : "Đăng nhập"}

                            <span>→</span>
                        </button>

                    </form>

                    {/* GOOGLE */}
                    <div className="divider">
                        <span>
                            hoặc tiếp tục với
                        </span>
                    </div>

                    <button
                        className="google-button"
                        type="button"
                    >
                        <span className="google-icon">
                            G
                        </span>

                        Google
                    </button>

                    {/* TERMS */}
                    <p className="terms">
                        Bằng việc tiếp tục, bạn đồng ý với{" "}
                        <button
                            type="button"
                            className="link-button"
                        >
                            Điều khoản sử dụng
                        </button>{" "}
                        và{" "}
                        <button
                            type="button"
                            className="link-button"
                        >
                            Chính sách bảo mật
                        </button>
                        .
                    </p>

                </div>

            </section>

        </main>
    );
}
