import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getAuthToken } from "../authStorage";
import "./PaymentResult.css";

export default function PaymentResult() {
  const { status } = useParams();
  const [searchParams] = useSearchParams();
  const invoice = searchParams.get("invoice");
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(Boolean(invoice));

  useEffect(() => {
    if (!invoice) return undefined;
    let active = true;
    let attempts = 0;
    let timer;
    const load = async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/payments/${encodeURIComponent(invoice)}/status`, { cache: "no-store", headers: { Authorization: `Bearer ${getAuthToken()}` } });
      const data = await response.json().catch(() => ({}));
      if (!active) return;
      setPayment(data.payment || null);
      setLoading(false);
      if (status === "success" && data.payment?.status === "Pending" && attempts < 15) {
        attempts += 1;
        timer = window.setTimeout(() => load().catch(() => {}), 2000);
      }
    };
    load().catch(() => { if (active) setLoading(false); });
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [invoice, status]);

  const paid = status === "success" && payment?.status === "Paid";
  const cancelled = status === "cancel";
  return <main className="payment-result-page"><section className={`payment-result-card ${paid ? "payment-good" : cancelled ? "payment-cancelled" : ""}`}><span className="payment-result-icon">{paid ? "🎉" : cancelled ? "↩️" : status === "error" ? "💛" : "⏳"}</span><h1>{paid ? "Nâng cấp thành công!" : cancelled ? "Bạn đã hủy thanh toán" : status === "error" ? "Thanh toán chưa hoàn tất" : loading ? "Đang xác nhận thanh toán…" : "Đang chờ SePay xác nhận"}</h1><p>{paid ? `Tài khoản Premium đã được mở trong 30 ngày. Bạn có thể quay lại xem lộ trình học cá nhân hóa.` : cancelled ? "Bạn có thể quay lại trang Premium để thử lại bất cứ lúc nào." : status === "error" ? "Giao dịch chưa được ghi nhận. Vui lòng kiểm tra lại hoặc thử lại." : "SePay đang gửi kết quả về MathKids. Nếu bạn vừa thanh toán, hãy đợi vài giây rồi tải lại trang."}</p>{payment?.expiresAt && <small>Hiệu lực đến: {new Date(payment.expiresAt).toLocaleDateString("vi-VN")}</small>}<div className="payment-result-actions"><Link to="/dashboard">Về dashboard</Link><Link to="/premium">Xem gói Premium</Link></div></section></main>;
}
