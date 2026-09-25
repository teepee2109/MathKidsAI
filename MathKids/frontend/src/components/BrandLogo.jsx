import { Link } from "react-router-dom";
import "./BrandLogo.css";

export default function BrandLogo({ className = "dashboard-brand", to = "/" }) {
  return <Link className={className} to={to} aria-label="MathKids - về trang chủ">
    <span className="brand-logo-icon" aria-hidden="true"><img src="/mathkids-logo.png" alt="" /></span>
    <span className="brand-logo-name">Math<span>Kids</span></span>
  </Link>;
}
