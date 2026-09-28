import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !Number.isInteger(port) || !user || !pass) {
    const error = new Error("Chưa cấu hình SMTP_HOST, SMTP_PORT, SMTP_USER và SMTP_PASSWORD để gửi email OTP.");
    error.status = 503;
    throw error;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true" || port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

export async function sendRegistrationOtpEmail(email, code) {
  await sendOtpEmail(email, code, "Mã xác minh đăng ký MathKids", "Xác minh email MathKids", "hoàn tất đăng ký");
}

export async function sendPasswordResetOtpEmail(email, code) {
  await sendOtpEmail(email, code, "Mã OTP đổi mật khẩu MathKids", "Đặt lại mật khẩu MathKids", "đổi mật khẩu");
}

async function sendOtpEmail(email, code, subject, heading, purpose) {
  const from = process.env.SMTP_FROM?.trim() || `MathKids <${process.env.SMTP_USER.trim()}>`;
  const info = await getTransporter().sendMail({
    from,
    to: email,
    subject,
    text: `Mã OTP của bạn là ${code}. Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai. Nếu bạn không yêu cầu ${purpose}, hãy bỏ qua email này.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#173c6b"><h2>${heading}</h2><p>Nhập mã bên dưới để ${purpose}:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#347ee1">${code}</p><p>Mã có hiệu lực trong <b>10 phút</b>. Không chia sẻ mã này với bất kỳ ai.</p><p>Nếu bạn không yêu cầu ${purpose}, hãy bỏ qua email này.</p></div>`,
  });
  const wasAccepted = (info.accepted || []).some((recipient) => {
    const acceptedAddress = typeof recipient === "string" ? recipient : recipient?.address;
    return String(acceptedAddress || "").toLowerCase() === email.toLowerCase();
  });
  if (!wasAccepted || (info.rejected || []).length) {
    console.warn(`[email] SMTP did not accept OTP recipient; rejectedCount=${info.rejected?.length || 0}`);
    const error = new Error("Máy chủ email không chấp nhận địa chỉ nhận OTP. Kiểm tra lại email đăng ký.");
    error.status = 502;
    throw error;
  }
  console.info(`[email] SMTP accepted OTP message; messageId=${info.messageId || "unknown"}; response=${info.response || "unavailable"}`);
}
