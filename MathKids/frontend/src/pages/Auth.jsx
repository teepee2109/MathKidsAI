import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveAuthSession } from "../authStorage";
import { trackEvent } from "../analytics";
import {
    getFirebaseAuthErrorMessage,
    getVerifiedFirebaseIdToken,
    isFirebaseAuthConfigured,
    registerWithFirebaseEmail,
    resendFirebaseVerificationEmail,
    sendFirebasePasswordReset,
    signInWithFirebaseEmail,
    signOutFirebase
} from "../firebaseAuth";
import BrandLogo from "../components/BrandLogo";
import StudyArt from "../components/StudyArt";
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
    const [registerRole, setRegisterRole] = useState("Student");
    const [registerGrade, setRegisterGrade] = useState("");
    const [values, setValues] = useState(initialValues);
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [forgotPassword, setForgotPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otpMessage, setOtpMessage] = useState("");
    const [otpCooldownSeconds, setOtpCooldownSeconds] = useState(0);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [googleReady, setGoogleReady] = useState(false);
    const googleButtonRef = useRef(null);
    // Prefer Firebase email/password when configured; retain the legacy OTP flow as an explicit fallback.
    const [firebaseEmail, setFirebaseEmail] = useState(initialMode === "register" || isFirebaseAuthConfigured);
    const [firebaseVerificationPending, setFirebaseVerificationPending] = useState(false);

    useEffect(() => {
        if (otpCooldownSeconds <= 0) return undefined;
        const timer = window.setTimeout(() => setOtpCooldownSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
        return () => window.clearTimeout(timer);
    }, [otpCooldownSeconds]);

    const isRegister = mode === "register";

    async function exchangeFirebaseToken(idToken, method, persist) {
        const response = await fetch(`${apiBase}/auth/firebase`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                idToken,
                ...(isRegister ? { role: registerRole } : {}),
                ...(isRegister && registerRole === "Student" ? { grade: Number(registerGrade) } : {}),
            }),
        });
        const data = await response.json().catch(() => ({}));
        signOutFirebase().catch(() => {});
        if (!response.ok) throw new Error(data.message || "Đăng nhập Firebase thất bại.");
        saveAuthSession(data, persist);
        trackEvent(isRegister ? "sign_up" : "login", { method, user_role: data.user.role });
        onAuthenticated?.(data.user);
        navigate(data.user.role === "Admin" ? "/admin/dashboard" : data.user.role === "Parent" ? "/parent/dashboard" : "/dashboard");
    }

    async function handleFirebaseEmailSubmit() {
        if (!isFirebaseAuthConfigured) {
            throw new Error("Firebase Authentication chưa được cấu hình cho website này. Hãy thêm cấu hình Firebase hoặc chọn phương thức email OTP thay thế.");
        }
        const email = values.email.trim();
        if (forgotPassword) {
            await sendFirebasePasswordReset(email);
            setForgotPassword(false);
            setSuccessMessage("Nếu email đã có tài khoản Firebase, liên kết đặt lại mật khẩu đã được gửi. Hãy kiểm tra hộp thư (cả thư mục spam).");
            return;
        }
        if (isRegister && firebaseVerificationPending) {
            const idToken = await getVerifiedFirebaseIdToken();
            if (!idToken) throw new Error("Email chưa được xác minh. Hãy mở liên kết trong email rồi bấm lại nút này.");
            await exchangeFirebaseToken(idToken, "firebase_email", true);
            return;
        }
        if (isRegister) {
            await registerWithFirebaseEmail(values.name.trim(), email, values.password);
            setFirebaseVerificationPending(true);
            setSuccessMessage(`Đã gửi email xác minh tới ${email}. Mở liên kết trong email rồi bấm "Tôi đã xác minh email".`);
            return;
        }
        const idToken = await signInWithFirebaseEmail(email, values.password);
        if (!idToken) throw new Error("Email chưa được xác minh. Chúng tôi vừa gửi lại liên kết xác minh, hãy mở email rồi đăng nhập lại.");
        await exchangeFirebaseToken(idToken, "firebase_email", remember);
    }

    async function handleResendFirebaseVerification() {
        setIsSubmitting(true);
        setError("");
        try {
            await resendFirebaseVerificationEmail();
            setSuccessMessage("Đã gửi lại email xác minh. Nếu chưa thấy, hãy kiểm tra thư mục spam.");
        } catch (firebaseError) {
            setError(getFirebaseAuthErrorMessage(firebaseError, "Không thể gửi lại email xác minh."));
        } finally {
            setIsSubmitting(false);
        }
    }

    function toggleFirebaseEmail() {
        setFirebaseEmail((current) => !current);
        setFirebaseVerificationPending(false);
        signOutFirebase().catch(() => {});
        setForgotPassword(false);
        setError("");
        setSuccessMessage("");
        setErrors({});
        setOtp("");
        setOtpSent(false);
        setOtpMessage("");
    }

    const handleGoogleCredential = useCallback(async (credential) => {
        if (mode === "register" && registerRole === "Student" && !/^[1-5]$/.test(registerGrade)) {
            setError("Vui lòng chọn lớp hiện tại của học sinh trước khi đăng ký.");
            return;
        }
        setIsSubmitting(true);
        setError("");
        try {
            const response = await fetch(`${apiBase}/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    credential,
                    ...(mode === "register" ? { role: registerRole } : {}),
                    ...(mode === "register" && registerRole === "Student" ? { grade: Number(registerGrade) } : {}),
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "Đăng nhập Google thất bại.");
            saveAuthSession(data, true);
            trackEvent(mode === "register" ? "sign_up" : "login", { method: "google", user_role: data.user.role });
            onAuthenticated?.(data.user);
            navigate(data.user.role === "Admin" ? "/admin/dashboard" : data.user.role === "Parent" ? "/parent/dashboard" : "/dashboard");
        } catch (googleError) {
            setError(googleError.message || "Đăng nhập Google thất bại.");
        } finally {
            setIsSubmitting(false);
        }
    }, [mode, navigate, onAuthenticated, registerGrade, registerRole]);

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
        setFirebaseEmail(nextMode === "register" || isFirebaseAuthConfigured);
        setFirebaseVerificationPending(false);
        signOutFirebase().catch(() => {});

        navigate(
            nextMode === "register"
                ? "/dang-ky"
                : "/dang-nhap"
        );

        setValues(initialValues);
        setError("");
        setSuccessMessage("");
        setForgotPassword(false);
        setErrors({});
        setOtp("");
        setOtpSent(false);
        setOtpMessage("");
        setFirebaseVerificationPending(false);
        setOtpCooldownSeconds(0);

    }

    function handleChange(event) {
        const { name, value } = event.target;

        setValues((current) => ({
            ...current,
            [name]: value
        }));

        setError("");
        setSuccessMessage("");
        setOtp("");
        setOtpSent(false);
        setOtpMessage("");
        setFirebaseVerificationPending(false);

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
        } else if (isRegister && !/@gmail\.com$/i.test(email)) {
            nextErrors.email = "Email đăng ký bắt buộc phải kết thúc bằng @gmail.com.";
        }

        // Validate password
        if (!forgotPassword && !values.password) {
            nextErrors.password =
                "Vui lòng nhập mật khẩu.";
        } else if (!forgotPassword && values.password.length < 6) {
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

        if (isRegister && registerRole === "Student" && !/^[1-5]$/.test(registerGrade)) {
            nextErrors.grade = "Vui lòng chọn lớp hiện tại của học sinh.";
        }

        if (isRegister && otpSent && !/^\d{6}$/.test(otp)) nextErrors.otp = "Mã OTP phải gồm 6 chữ số.";
        if (forgotPassword && otpSent) {
            if (!/^\d{6}$/.test(otp)) nextErrors.otp = "Mã OTP phải gồm 6 chữ số.";
            if (newPassword.length < 6) nextErrors.newPassword = "Mật khẩu mới cần có ít nhất 6 ký tự.";
            if (!confirmNewPassword) nextErrors.confirmNewPassword = "Vui lòng xác nhận mật khẩu mới.";
            else if (newPassword !== confirmNewPassword) nextErrors.confirmNewPassword = "Xác nhận mật khẩu mới chưa khớp.";
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
            if (firebaseEmail) {
                await handleFirebaseEmailSubmit();
                return;
            }

            if (forgotPassword) {
                const isConfirmingReset = otpSent;
                const response = await fetch(`${apiBase}/auth/password-reset/${isConfirmingReset ? "confirm" : "request-otp"}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(isConfirmingReset
                        ? { email: values.email.trim(), otp, newPassword, confirmPassword: confirmNewPassword }
                        : { email: values.email.trim() }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error([data.message, data.detail].filter(Boolean).join(" — ") || "Không thể xử lý yêu cầu đặt lại mật khẩu.");
                if (!isConfirmingReset) {
                    setOtpSent(true);
                    setOtpMessage(data.message || "Nếu email thuộc tài khoản đang hoạt động, OTP sẽ được gửi nếu yêu cầu chưa chạm giới hạn. Nếu vừa yêu cầu mã, hãy chờ 60 giây rồi thử lại.");
                    setOtpCooldownSeconds(60);
                } else {
                    setForgotPassword(false);
                    setOtpSent(false);
                    setOtp("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                    setValues((current) => ({ ...current, password: "", confirmPassword: "" }));
                    setSuccessMessage(data.message || "Đổi mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.");
                }
                return;
            }

            const registrationBody = {
                name: values.name.trim(),
                email: values.email.trim(),
                password: values.password,
                confirmPassword: values.confirmPassword,
                role: registerRole,
                ...(registerRole === "Student" ? { grade: Number(registerGrade) } : {}),
            };
            if (isRegister && !otpSent) {
                const response = await fetch(`${apiBase}/auth/register/request-otp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(registrationBody),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error([data.message, data.detail].filter(Boolean).join(" — ") || "Không thể gửi mã OTP.");
                setOtpSent(true);
                setOtpMessage(data.message || "Mã xác minh đã được gửi đến email của bạn.");
                setOtpCooldownSeconds(60);
                return;
            }

            // Xác định API
            const url = `${apiBase}/auth/${isRegister ? "register" : "login"}`;

            // Dữ liệu gửi lên Backend
            const body =
                isRegister
                    ? { ...registrationBody, otp }
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

            // Đọc response an toàn
            const data = await response.json().catch(() => ({}));

            // Nếu Backend trả lỗi hoặc không kết nối được
            if (!response.ok) {
                if (response.status === 502 || response.status === 504 || response.status === 503) {
                    throw new Error("Không thể kết nối đến máy chủ Backend (Port 4000). Vui lòng kiểm tra xem Backend đã được khởi động chưa.");
                }
                throw new Error(
                    data.message || "Có lỗi xảy ra khi kết nối tới máy chủ."
                );
            }

            // Persist login only when the user selected "remember me".
            saveAuthSession(data, isRegister || remember);
            trackEvent(isRegister ? "sign_up" : "login", { method: "email", user_role: data.user.role });

            // Đăng nhập / đăng ký thành công
            onAuthenticated?.(data.user);
            navigate(data.user.role === "Admin" ? "/admin/dashboard" : data.user.role === "Parent" ? "/parent/dashboard" : "/dashboard");

        } catch (error) {
            console.error("Auth error:", error);

            setError(
                error instanceof TypeError && !firebaseEmail && (forgotPassword || (isRegister && !otpSent))
                    ? "Kết nối với backend bị ngắt. Yêu cầu OTP có thể đã được xử lý; hãy kiểm tra email và Spam trước, rồi chờ 60 giây trước khi gửi lại."
                    : getFirebaseAuthErrorMessage(error, "Không thể kết nối tới máy chủ.")
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    async function resendOtp() {
        if (forgotPassword) {
            const emailIsValid = emailPattern.test(values.email.trim());
            setErrors(emailIsValid ? {} : { email: "Email không đúng định dạng." });
            if (!emailIsValid) return;
        } else if (!validate()) return;
        setIsSubmitting(true);
        setError("");
        try {
            const response = await fetch(`${apiBase}/auth/${forgotPassword ? "password-reset/request-otp" : "register/request-otp"}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(forgotPassword ? { email: values.email.trim() } : {
                    name: values.name.trim(),
                    email: values.email.trim(),
                    password: values.password,
                    confirmPassword: values.confirmPassword,
                    role: registerRole,
                    ...(registerRole === "Student" ? { grade: Number(registerGrade) } : {}),
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error([data.message, data.detail].filter(Boolean).join(" — ") || "Không thể gửi lại mã OTP.");
            setOtpMessage(data.message || "Mã xác minh mới đã được gửi.");
            setOtp("");
            setOtpCooldownSeconds(60);
        } catch (requestError) {
            setError(requestError instanceof TypeError
                ? "Kết nối với backend bị ngắt. Hãy kiểm tra email và Spam; nếu cần gửi lại, chờ 60 giây rồi thử tiếp."
                : requestError.message || "Không thể gửi lại mã OTP.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const otpCooldownLabel = `${String(Math.floor(otpCooldownSeconds / 60)).padStart(2, "0")}:${String(otpCooldownSeconds % 60).padStart(2, "0")}`;
    const otpRequestBlocked = !firebaseEmail && otpCooldownSeconds > 0 && (forgotPassword || isRegister) && !otpSent;

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

                    <BrandLogo className="brand auth-story-brand" to="/" />

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
                    <StudyArt grade={1} />
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
                            {forgotPassword ? "Bảo mật tài khoản" : isRegister
                                ? "Bắt đầu hành trình"
                                : "Chào mừng trở lại"}
                        </p>

                        <h2>
                            {forgotPassword ? "Đặt lại mật khẩu" : isRegister
                                ? "Tạo tài khoản mới"
                                : "Đăng nhập tài khoản"}
                        </h2>

                        <p>
                            {forgotPassword
                                ? firebaseEmail ? "Nhận liên kết qua email để tạo mật khẩu Firebase mới." : "Nhận mã OTP qua email để tạo mật khẩu mới."
                                : firebaseEmail
                                ? isRegister ? "Tạo tài khoản bằng Firebase và xác minh qua liên kết email — không cần OTP MathKids." : "Đăng nhập bằng email & mật khẩu Firebase."
                                : isRegister
                                ? "Tạo tài khoản để bắt đầu học Toán thật vui."
                                : "Tiếp tục hành trình chinh phục Toán học của bạn."}
                        </p>

                    </div>

                    {/* LOGIN / REGISTER */}
                    {!forgotPassword && <div
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
                    </div>}

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

                        {/* ROLE SELECTOR — chỉ hiện khi đăng ký */}
                        {isRegister && (
                            <div className="role-selector">
                                <span>Bạn đăng ký với tư cách:</span>
                                <div className="role-options">
                                    <button
                                        type="button"
                                        className={`role-option ${registerRole === "Student" ? "active" : ""}`}
                                        onClick={() => { setRegisterRole("Student"); setOtpSent(false); setOtp(""); setOtpMessage(""); setErrors((current) => ({ ...current, grade: "" })); setError(""); }}
                                    >
                                        🎒 Học sinh
                                    </button>
                                    <button
                                        type="button"
                                        className={`role-option ${registerRole === "Parent" ? "active" : ""}`}
                                        onClick={() => { setRegisterRole("Parent"); setOtpSent(false); setOtp(""); setOtpMessage(""); setErrors((current) => ({ ...current, grade: "" })); setError(""); }}
                                    >
                                        👨‍👩‍👧 Phụ huynh
                                    </button>
                                </div>
                            </div>
                        )}

                        {isRegister && registerRole === "Student" && (
                            <label className="field grade-field">
                                <span>Lớp hiện tại của học sinh</span>
                                <select
                                    className="grade-select"
                                    name="grade"
                                    value={registerGrade}
                                    onChange={(event) => {
                                        setRegisterGrade(event.target.value);
                                        setErrors((current) => ({ ...current, grade: "" }));
                                        setError("");
                                    }}
                                    required
                                    aria-invalid={Boolean(errors.grade)}
                                >
                                    <option value="">Chọn lớp</option>
                                    {[1, 2, 3, 4, 5].map((grade) => (
                                        <option value={grade} key={grade}>Lớp {grade}</option>
                                    ))}
                                </select>
                                {errors.grade && <small className="field-error">{errors.grade}</small>}
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
                                    placeholder={isRegister ? "tenban@gmail.com" : "you@example.com"}
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
                        {!forgotPassword && <label className="field">

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

                        </label>}

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

                        {(isRegister || forgotPassword) && otpSent && (
                            <label className="field">
                                <span>{forgotPassword ? "Mã OTP đặt lại mật khẩu" : "Mã OTP trong email"}</span>
                                <span className="input-wrap">
                                    <span className="input-icon">#</span>
                                    <input
                                        type="text"
                                        name="otp"
                                        value={otp}
                                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                        placeholder="Nhập mã 6 chữ số"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        required
                                    />
                                </span>
                                {errors.otp && <small className="field-error">{errors.otp}</small>}
                                <small>{otpMessage} Nếu chưa thấy email, hãy kiểm tra thư mục spam.</small>
                                <button type="button" className="link-button" onClick={resendOtp} disabled={isSubmitting || otpCooldownSeconds > 0}>
                                    {otpCooldownSeconds > 0 ? `Gửi lại mã sau ${otpCooldownLabel}` : "Gửi lại mã OTP"}
                                </button>
                            </label>
                        )}

                        {forgotPassword && otpSent && <>
                            <label className="field">
                                <span>Mật khẩu mới</span>
                                <span className="input-wrap"><span className="input-icon">▣</span><input type="password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setError(""); }} placeholder="Ít nhất 6 ký tự" autoComplete="new-password" required /></span>
                                {errors.newPassword && <small className="field-error">{errors.newPassword}</small>}
                            </label>
                            <label className="field">
                                <span>Nhập lại mật khẩu mới</span>
                                <span className="input-wrap"><span className="input-icon">▣</span><input type="password" value={confirmNewPassword} onChange={(event) => { setConfirmNewPassword(event.target.value); setError(""); }} placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" required /></span>
                                {errors.confirmNewPassword && <small className="field-error">{errors.confirmNewPassword}</small>}
                            </label>
                        </>}

                        {/* LOGIN OPTIONS */}
                        {!isRegister && !forgotPassword && (
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
                                    onClick={() => { setForgotPassword(true); setOtpSent(false); setOtp(""); setError(""); setSuccessMessage(""); }}
                                >
                                    Quên mật khẩu?
                                </button>

                            </div>
                        )}

                        {forgotPassword && <button type="button" className="link-button" onClick={() => { setForgotPassword(false); setOtpSent(false); setOtp(""); setError(""); setErrors({}); }}>
                            ← Quay lại đăng nhập
                        </button>}

                        {/* ERROR */}
                        {error && (
                            <p
                                className="form-error"
                                role="alert"
                            >
                                {error}
                            </p>
                        )}
                        {successMessage && <p className="form-success" role="status">{successMessage}</p>}

                        {firebaseEmail && isRegister && firebaseVerificationPending && (
                            <button type="button" className="link-button firebase-resend" onClick={handleResendFirebaseVerification} disabled={isSubmitting}>
                                Gửi lại email xác minh
                            </button>
                        )}

                        {/* SUBMIT */}
                        <button
                            className="submit-button"
                            type="submit"
                            disabled={isSubmitting || otpRequestBlocked}
                        >
                            {isSubmitting
                                ? "Đang xử lý..."
                                : firebaseEmail
                                    ? forgotPassword ? "Gửi liên kết đặt lại" : isRegister ? firebaseVerificationPending ? "Tôi đã xác minh email" : "Tạo tài khoản Firebase" : "Đăng nhập Firebase"
                                : forgotPassword
                                    ? otpSent ? "Đổi mật khẩu" : otpCooldownSeconds > 0 ? `Gửi lại sau ${otpCooldownLabel}` : "Gửi mã OTP"
                                    : isRegister
                                        ? otpSent ? "Xác minh & tạo tài khoản" : otpCooldownSeconds > 0 ? `Gửi lại sau ${otpCooldownLabel}` : "Gửi mã OTP"
                                        : "Đăng nhập"}

                            <span>→</span>
                        </button>

                    </form>

                    {/* GOOGLE */}
                    {!forgotPassword && <div className="divider">
                        <span>
                            hoặc tiếp tục với
                        </span>
                    </div>}

                    {!forgotPassword && (googleClientId && googleReady ? <div className="google-button google-button-host" ref={googleButtonRef} aria-label="Đăng nhập bằng Google" /> : <button className="google-button" type="button" onClick={handleGoogleLogin} disabled={isSubmitting}><span className="google-icon">G</span>{googleClientId ? "Google" : "Google (chưa cấu hình)"}</button>)}

                    {!forgotPassword && <div className="firebase-auth-options">
                        <button type="button" className="link-button" onClick={toggleFirebaseEmail} disabled={isSubmitting}>
                            {firebaseEmail ? (isRegister ? "← Dùng đăng ký email bằng OTP" : "← Dùng đăng nhập tài khoản MathKids cũ") : isFirebaseAuthConfigured ? "Dùng email & mật khẩu Firebase" : "Chuyển về Firebase (cần cấu hình)"}
                        </button>
                        {firebaseEmail && !isFirebaseAuthConfigured && <small className="firebase-config-note" role="note">Firebase chưa được cấu hình trong môi trường này. Hãy thêm cấu hình Firebase Web ở frontend và FIREBASE_PROJECT_ID ở backend, hoặc chủ động chọn đăng ký email OTP.</small>}
                    </div>}

                    {/* TERMS */}
                    {!forgotPassword && <p className="terms">
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
                    </p>}

                </div>

            </section>

        </main>
    );
}
