import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveAuthSession } from "../authStorage";
import BrandLogo from "../components/BrandLogo";
import "./Auth.css";

const initialValues = {
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const configuredGoogleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
const googleClientId = /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(configuredGoogleClientId)
    ? configuredGoogleClientId
    : "";
const configuredApiBase = String(import.meta.env.VITE_API_URL || "/api").trim().replace(/\/+$/, "");
const apiBase = configuredApiBase.endsWith("/api") ? configuredApiBase : `${configuredApiBase}/api`;

export default function Auth({ initialMode = "login", onAuthenticated }) {
    const navigate = useNavigate();

    const [mode, setMode] = useState(initialMode);
    const [values, setValues] = useState(initialValues);
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [googleReady, setGoogleReady] = useState(false);
    const googleButtonRef = useRef(null);

    const isRegister = mode === "register";

    const handleGoogleCredential = useCallback(async (credential) => {
        setIsSubmitting(true);
        setError("");
        try {
            const response = await fetch(`${apiBase}/auth/google`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential }) });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "Đăng nhập Google thất bại.");
            saveAuthSession(data, true);
            onAuthenticated?.(data.user);
            navigate(data.user.role === "Admin" ? "/admin/dashboard" : "/dashboard");
        } catch (googleError) {
            setError(googleError.message || "Đăng nhập Google thất bại.");
        } finally {
            setIsSubmitting(false);
        }
    }, [navigate, onAuthenticated]);

    useEffect(() => {
        if (!googleClientId) return undefined;
        const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        const script = existingScript || document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        const onReady = () => setGoogleReady(Boolean(window.google?.accounts?.id));
        script.addEventListener("load", onReady);
        if (window.google?.accounts?.id) onReady();
        if (!existingScript) document.head.appendChild(script);
        return () => script.removeEventListener("load", onReady);
    }, []);

    useEffect(() => {
        if (!googleReady || !googleButtonRef.current) return undefined;
        const buttonElement = googleButtonRef.current;
        buttonElement.innerHTML = "";
        window.google.accounts.id.initialize({ client_id: googleClientId, callback: (response) => handleGoogleCredential(response.credential) });
        window.google.accounts.id.renderButton(buttonElement, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width: buttonElement.clientWidth || 420, logo_alignment: "left" });
        return () => { buttonElement.innerHTML = ""; };
    }, [googleReady, handleGoogleCredential]);

    function handleGoogleLogin() {
        if (!googleClientId) {
            setError("Google chưa được cấu hình đúng. Hãy dùng Client ID kết thúc bằng .apps.googleusercontent.com, không dùng Client Secret bắt đầu bằng GOCSPX-.");
            return;
        }
        if (!googleReady) {
            setError("Google đang tải, vui lòng thử lại sau giây lát.");
            return;
        }
        window.google.accounts.id.prompt();
    }

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
            const url = `${apiBase}/auth/${mode === "register" ? "register" : "login"}`;

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

            // Persist login only when the user selected "remember me".
            saveAuthSession(data, isRegister || remember);

            // Đăng nhập / đăng ký thành công
            onAuthenticated?.(data.user);
            navigate(data.user.role === "Admin" ? "/admin/dashboard" : "/dashboard");

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
                        <span className="brand-logo-icon"><img src="/mathkids-logo.png" alt="" /></span>
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

                    <Link className="auth-home-link" to="/">
                        ← Về trang chủ
                    </Link>

                    <BrandLogo className="mobile-brand" to="/" />

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

                    {googleClientId && googleReady ? <div className="google-button google-button-host" ref={googleButtonRef} aria-label="Đăng nhập bằng Google" /> : <button className="google-button" type="button" onClick={handleGoogleLogin} disabled={isSubmitting}><span className="google-icon">G</span>{googleClientId ? "Google" : "Google (chưa cấu hình)"}</button>}

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
