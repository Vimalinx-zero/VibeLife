import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import TopBar from "./components/TopBar";
import SettingsModal from "./components/SettingsModal";
import GlobalShortcuts from "./components/GlobalShortcuts";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { MediaProvider } from "./context/MediaContext";
import { AuthProvider } from "./context/AuthContext";
import LoadingScreen from "./components/LoadingScreen";
import AIChatWidget from "./components/AIChatWidget";

// ✅ 懒加载页面组件 - 显著减少首屏加载时间
const Dashboard = lazy(() => import("./pages/Dashboard"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const NotesPage = lazy(() => import("./pages/NotesPage"));
const MistakeVaultPage = lazy(() => import("./pages/MistakeVaultPage"));
const AnkiPage = lazy(() => import("./pages/AnkiPage"));
const AnkiReviewPage = lazy(() => import("./pages/AnkiReviewPage"));
const WorkbenchPage = lazy(() => import("./pages/WorkbenchPage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("./pages/CollectionDetailPage"));
const AIImportPage = lazy(() => import("./pages/AIImportPage"));
const DataManagementPage = lazy(() => import("./pages/DataManagementPage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const QuickCapturePage = lazy(() => import("./pages/QuickCapturePage"));


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

      {/* ✅ 新增：在这里挂载 SettingsModal，它会悬浮在所有内容之上 */}
      <SettingsModal />

      {/* 内容层 */}
      <div className="relative z-10">
        <BrowserRouter>
            <GlobalShortcuts />
            <TopBar />
            <Suspense fallback={<LoadingScreen />}>
                <Routes>
                    {/* 主页 */}
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/quiz" element={<QuizPage />} />
                    <Route path="/mistakes" element={<MistakeVaultPage />} />
                    <Route path="/notes" element={<NotesPage />} />
                    <Route path="/anki" element={<AnkiPage />} />
                    <Route path="/anki/review" element={<AnkiReviewPage />} />
                    <Route path="/anki/collections" element={<CollectionsPage />} />
                    <Route path="/anki/collections/:collectionId" element={<CollectionDetailPage />} />
                    <Route path="/workbench" element={<WorkbenchPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/quick-capture" element={<QuickCapturePage />} />
                    <Route path="/schedule" element={<SchedulePage />} />
                    <Route path="/ai-import" element={<AIImportPage />} />
                    <Route path="/data-management" element={<DataManagementPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>

        {/* 全局 AI 对话组件 */}
        <AIChatWidget />
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
