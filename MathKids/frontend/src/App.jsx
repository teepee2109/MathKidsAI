import Home from "./pages/Home";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import StudentProfile from "./pages/StudentProfile";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useState } from "react";
import { clearAuthSession, getAuthToken } from "./authStorage";

function AppRoutes() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAuthToken()));

  function handleLogout() {
    clearAuthSession();
    setIsAuthenticated(false);
    navigate("/");
  }

  return <Routes>
    <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Home />} />
    <Route path="/dashboard" element={isAuthenticated ? <StudentDashboard onLogout={handleLogout} /> : <Navigate to="/dang-nhap" replace />} />
    <Route path="/ho-so" element={isAuthenticated ? <StudentProfile /> : <Navigate to="/dang-nhap" replace />} />
    <Route path="/dang-nhap" element={<Auth initialMode="login" onAuthenticated={() => setIsAuthenticated(true)} />} />
    <Route path="/dang-ky" element={<Auth initialMode="register" onAuthenticated={() => setIsAuthenticated(true)} />} />
    <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
  </Routes>;
}

function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}

export default App;
