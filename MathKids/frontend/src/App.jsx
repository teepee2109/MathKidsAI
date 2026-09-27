import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import StudentProfile from "./pages/StudentProfile";
import StudentRewards from "./pages/StudentRewards";
import AdminDashboard from "./pages/AdminDashboard";
import MathGames from "./pages/MathGames";
import PlacementAssessment from "./pages/PlacementAssessment";
import PremiumUpgrade from "./pages/PremiumUpgrade";
import PaymentResult from "./pages/PaymentResult";
import LearningPath from "./pages/LearningPath";
import MonthlyAssessment from "./pages/MonthlyAssessment";
import WeeklyAssessment from "./pages/WeeklyAssessment";
import ParentDashboard from "./pages/ParentDashboard";
import ParentLinkChild from "./pages/ParentLinkChild";
import ParentChildReport from "./pages/ParentChildReport";
import ParentAlerts from "./pages/ParentAlerts";
import ParentRecommendations from "./pages/ParentRecommendations";
import Contact from "./pages/Contact";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
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

  const dashboardPath = currentUser?.role === "Admin"
    ? "/admin/dashboard"
    : currentUser?.role === "Parent"
    ? "/parent/dashboard"
    : "/dashboard";

  return <Routes>
    <Route path="/" element={isAuthenticated ? <Navigate to={dashboardPath} replace /> : <Landing />} />
    <Route path="/home" element={<Home isAuthenticated={isAuthenticated} onLogout={handleLogout} />} />
    <Route path="/dashboard" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : currentUser?.role === "Parent" ? <Navigate to="/parent/dashboard" replace /> : <StudentDashboard onLogout={handleLogout} />} />
    <Route path="/admin/dashboard" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to={dashboardPath} replace />} />
    <Route path="/ho-so" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <StudentProfile />} />
    <Route path="/phan-thuong" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <StudentRewards />} />
    <Route path="/hoc-tap" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <LearningPathRoute onLogout={handleLogout} />} />
    <Route path="/hoc-tap/:lessonId" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <LearningPathRoute onLogout={handleLogout} />} />
    <Route path="/tro-choi" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <MathGames />} />
    <Route path="/tro-choi/:grade" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <MathGames />} />
    <Route path="/danh-gia" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <PlacementAssessment />} />
    <Route path="/danh-gia-tuan" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <WeeklyAssessment onLogout={handleLogout} />} />
    <Route path="/kiem-tra-thang" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <MonthlyAssessment onLogout={handleLogout} />} />
    <Route path="/premium" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <PremiumUpgrade />} />
    <Route path="/thanh-toan/:status" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role === "Admin" ? <Navigate to="/admin/dashboard" replace /> : <PaymentResult />} />
    {/* Parent routes */}
    <Route path="/parent/dashboard" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role !== "Parent" ? <Navigate to={dashboardPath} replace /> : <ParentDashboard onLogout={handleLogout} />} />
    <Route path="/parent/link-child" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role !== "Parent" ? <Navigate to={dashboardPath} replace /> : <ParentLinkChild onLogout={handleLogout} />} />
    <Route path="/parent/children/:studentId/report" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role !== "Parent" ? <Navigate to={dashboardPath} replace /> : <ParentChildReport onLogout={handleLogout} />} />
    <Route path="/parent/children/:studentId/alerts" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role !== "Parent" ? <Navigate to={dashboardPath} replace /> : <ParentAlerts onLogout={handleLogout} />} />
    <Route path="/parent/children/:studentId/recommendations" element={!isAuthenticated ? <Navigate to="/dang-nhap" replace /> : currentUser?.role !== "Parent" ? <Navigate to={dashboardPath} replace /> : <ParentRecommendations onLogout={handleLogout} />} />
    <Route path="/dang-nhap" element={<Auth initialMode="login" onAuthenticated={handleAuthenticated} />} />
    <Route path="/dang-ky" element={<Auth initialMode="register" onAuthenticated={handleAuthenticated} />} />
    <Route path="/lien-he" element={<Contact />} />
    <Route path="/contact" element={<Navigate to="/lien-he" replace />} />
    <Route path="*" element={<Navigate to={isAuthenticated ? dashboardPath : "/"} replace />} />
  </Routes>;
}

function LearningPathRoute({ onLogout }) {
  const { lessonId } = useParams();
  return <LearningPath key={lessonId || "path"} onLogout={onLogout} />;
}

function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}

export default App;
