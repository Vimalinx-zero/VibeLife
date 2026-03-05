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
// ✨ 新增：认证页面
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));


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
                    {/* ✨ 新增：认证路由（无需保护） */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* 受保护的路由 */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/quiz" element={
                        <ProtectedRoute>
                            <QuizPage />
                        </ProtectedRoute>
                    } />

                    {/* ✅ 修改：/mistakes 直接指向重型错题本 */}
                    <Route path="/mistakes" element={
                        <ProtectedRoute>
                            <MistakeVaultPage />
                        </ProtectedRoute>
                    } />

                    {/* 删除旧的 MistakeVaultPage 路由，或者保留重定向 */}
                    {/* <Route path="/mistakes/vault" element={<MistakeVaultPage />} /> */}

                    {/* 笔记入口 */}
                    <Route path="/notes" element={
                        <ProtectedRoute>
                            <NotesPage />
                        </ProtectedRoute>
                    } />

                    {/* ✅ 新增：ANKI 记忆卡入口 */}
                    <Route path="/anki" element={
                        <ProtectedRoute>
                            <AnkiPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/anki/review" element={
                        <ProtectedRoute>
                            <AnkiReviewPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/anki/collections" element={
                        <ProtectedRoute>
                            <CollectionsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/anki/collections/:collectionId" element={
                        <ProtectedRoute>
                            <CollectionDetailPage />
                        </ProtectedRoute>
                    } />

                    {/* ✅ 新增：学习工作台入口 */}
                    <Route path="/workbench" element={
                        <ProtectedRoute>
                            <WorkbenchPage />
                        </ProtectedRoute>
                    } />

                    {/* ✅ 新增：AI 智能导入入口 */}
                    <Route path="/ai-import" element={
                        <ProtectedRoute>
                            <AIImportPage />
                        </ProtectedRoute>
                    } />

                    {/* ✅ 新增：数据管理入口 */}
                    <Route path="/data-management" element={
                        <ProtectedRoute>
                            <DataManagementPage />
                        </ProtectedRoute>
                    } />
                </Routes>
            </Suspense>
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
