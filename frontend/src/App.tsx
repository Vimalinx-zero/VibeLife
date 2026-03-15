import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import TopBar from "./components/TopBar";
import SettingsModal from "./components/SettingsModal";
import GlobalShortcuts from "./components/GlobalShortcuts";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { MediaProvider } from "./context/MediaContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoadingScreen from "./components/LoadingScreen";
import AIChatWidget from "./components/AIChatWidget";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotesPage = lazy(() => import("./pages/NotesPage"));
const WorkbenchPage = lazy(() => import("./pages/WorkbenchPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const QuickCapturePage = lazy(() => import("./pages/QuickCapturePage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));

const RequireAuth = () => {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

const RequireGuest = () => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const AuthenticatedLayout = () => (
  <>
    <GlobalShortcuts />
    <SettingsModal />
    <TopBar />
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
    <AIChatWidget />
  </>
);

const AppContent = () => {
  const { background, isDark } = useTheme();

  return (
    <div
        className="min-h-screen transition-all duration-700 ease-in-out relative bg-cover bg-center bg-fixed"
        style={{ backgroundImage: background }}
    >
      {/* ✅ 全局蒙版层 (关键修改)
        - isDark 为 true: 覆盖 bg-black/40 (黑色半透明)，让背景图变暗，适合深色卡片。
        - isDark 为 false: 覆盖 bg-white/20 (白色半透明)，让背景图变柔和，适合浅色卡片。
      */}
      <div className={`absolute inset-0 transition-colors duration-700 pointer-events-none
          ${isDark ? 'bg-black/50' : 'bg-white/30 mix-blend-overlay'}`}
      />

      {/* 内容层 */}
      <div className="relative z-10">
        <BrowserRouter>
          <Routes>
            <Route element={<RequireGuest />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            <Route element={<RequireAuth />}>
              <Route element={<AuthenticatedLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/workbench" element={<WorkbenchPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/quick-capture" element={<QuickCapturePage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/quiz" element={<Navigate to="/" replace />} />
                <Route path="/mistakes" element={<Navigate to="/" replace />} />
                <Route path="/anki" element={<Navigate to="/" replace />} />
                <Route path="/anki/*" element={<Navigate to="/" replace />} />
                <Route path="/ai-import" element={<Navigate to="/" replace />} />
                <Route path="/data-management" element={<Navigate to="/" replace />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <MediaProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </MediaProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
