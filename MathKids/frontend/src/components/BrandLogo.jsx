import { Link } from "react-router-dom";
import "./BrandLogo.css";

export default function BrandLogo({ className = "dashboard-brand", to = "/" }) {
  return <Link className={className} to={to} aria-label="MathKids - về trang chủ">
    <span className="brand-logo-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M24 42V22M10 43h28M24 26C10 28 5 18 8 11c11-1 18 5 16 15Zm0-7C24 6 34 2 41 5c2 11-5 18-17 17" /></svg></span>
    <span className="brand-logo-name">Math<span>Kids</span></span>
  </Link>;
}
