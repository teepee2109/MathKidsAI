import Home from "./pages/Home";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import StudentProfile from "./pages/StudentProfile";
import AdminDashboard from "./pages/AdminDashboard";
import MathGames from "./pages/MathGames";
import PlacementAssessment from "./pages/PlacementAssessment";
import PremiumUpgrade from "./pages/PremiumUpgrade";
import PaymentResult from "./pages/PaymentResult";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useState } from "react";
import { clearAuthSession, getAuthToken, getCachedUser } from "./authStorage";

function AppRoutes() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAuthToken()));
  const [currentUser, setCurrentUser] = useState(getCachedUser);

  function handleAuthenticated(user) {
    setCurrentUser(user);
    setIsAuthenticated(true);
  }

  function handleLogout() {
    clearAuthSession();
    setCurrentUser(null);
    setIsAuthenticated(false);
    navigate("/");
  }

  const dashboardPath = currentUser?.role === "Admin" ? "/admin/dashboard" : "/dashboard";

  return <Routes>
    <Route path="/" element={isAuthenticated ? <Navigate to={dashboardPath} replace /> : <Home />} />
    <Route path="/dashboard" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <StudentDashboard onLogout={handleLogout} />} />
    <Route path="/admin/dashboard" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to="/dashboard" replace />} />
    <Route path="/ho-so" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <StudentProfile />} />
    <Route path="/tro-choi" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <MathGames />} />
    <Route path="/tro-choi/:grade" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <MathGames />} />
    <Route path="/danh-gia" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <PlacementAssessment />} />
    <Route path="/premium" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <PremiumUpgrade />} />
    <Route path="/thanh-toan/:status" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <PaymentResult />} />
    <Route path="/dang-nhap" element={<Auth initialMode="login" onAuthenticated={handleAuthenticated} />} />
    <Route path="/dang-ky" element={<Auth initialMode="register" onAuthenticated={handleAuthenticated} />} />
    <Route path="*" element={<Navigate to={isAuthenticated ? dashboardPath : "/"} replace />} />
  </Routes>;
}

function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}

export default App;
