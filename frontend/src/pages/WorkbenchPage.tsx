import { useState, useEffect } from "react";
import PomodoroTimer from "../components/PomodoroTimer";
import MusicPlayer from "../components/MusicPlayer";
import TodoList from "../components/TodoList";
import WorkbenchProjectPanel from "../components/WorkbenchProjectPanel";
import { useTheme } from "../context/ThemeContext";
import { useMedia } from "../context/MediaContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import ContextMenu from "../components/ContextMenu";
import { aiAPI } from "../utils/api";
import { dispatchWorkbenchAiRefresh } from "../utils/workbenchTodoEvents";
import {
  buildWorkbenchAiSuccessToast,
  getWorkbenchAiRefreshTargets,
  shouldOpenProjectsPanel,
} from "./workbenchAiCommandState";

// --- Icons ---
const Icons = {
  ArrowLeft: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
  ArrowRight: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>,
};

interface WorkbenchAiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const createWorkbenchAiMessageId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function WorkbenchPage() {
  const { isDark, toggleDarkMode } = useTheme();
  const toast = useToast();
  const { logout } = useAuth();

  // ✅ 使用全局媒体状态
  const { isMusicPlaying, audioData } = useMedia();

  const [currentTask, setCurrentTask] = useState<any>(null);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<WorkbenchAiMessage[]>([
    {
      id: "workbench-ai-welcome",
      role: "assistant",
      content: "告诉我你现在要准备什么、更新什么，或者直接让我整理工作台。",
    },
  ]);
  const [panelView, setPanelView] = useState<'workbench' | 'projects'>('workbench');
  const [isPanelAnimating, setIsPanelAnimating] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuType, setContextMenuType] = useState<string>('');

  const handleTaskSelect = (task: any) => {
    setCurrentTask(task);
  };

  const handleOpenProjectsPage = () => {
    if (isPanelAnimating || panelView === 'projects') return;
    closeContextMenu();
    setIsPanelAnimating(true);
    setPanelView('projects');
    window.setTimeout(() => setIsPanelAnimating(false), 520);
  };

  const handleBackToWorkbenchPanel = () => {
    if (isPanelAnimating || panelView === 'workbench') return;
    setIsPanelAnimating(true);
    setPanelView('workbench');
    window.setTimeout(() => setIsPanelAnimating(false), 520);
  };

  const handleAiInputSubmit = async () => {
    const userInput = aiInput.trim();
    if (!userInput || isAiLoading) return;

    const nextUserMessage: WorkbenchAiMessage = {
      id: createWorkbenchAiMessageId("workbench_ai_user"),
      role: "user",
      content: userInput,
    };
    const nextHistory = [...aiMessages, nextUserMessage].slice(-6);

    setAiMessages(nextHistory);
    setIsAiLoading(true);
    setAiInput('');

    try {
      const response = await aiAPI.chatForProjectPanel({
        message: userInput,
        provider: "openclaw",
        history: nextHistory
          .filter((message) => message.content.trim().length > 0)
          .map((message) => ({
            role: message.role,
            content: message.content.trim(),
          })),
        context: {
          surface: "workbench",
          panelView,
          currentTask: currentTask
            ? {
                id: currentTask.id ?? null,
                title: currentTask.text ?? currentTask.title ?? "",
              }
            : null,
        },
      });

      const refreshTargets = getWorkbenchAiRefreshTargets(response.refreshHints || []);
      if (refreshTargets.length > 0) {
        dispatchWorkbenchAiRefresh();
      }

      if (shouldOpenProjectsPanel(refreshTargets) && panelView !== "projects" && !isPanelAnimating) {
        setIsPanelAnimating(true);
        setPanelView("projects");
        window.setTimeout(() => setIsPanelAnimating(false), 520);
      }

      setAiMessages((previousMessages) =>
        [...previousMessages, {
          id: createWorkbenchAiMessageId("workbench_ai_assistant"),
          role: "assistant" as const,
          content: response.reply?.trim() || "我这次没有拿到可用回复。",
        } satisfies WorkbenchAiMessage].slice(-6)
      );

      toast.success(buildWorkbenchAiSuccessToast(response));
    } catch (error: any) {
      if (error?.response?.status === 401) {
        logout();
        return;
      }

      const message = `抱歉，这次没有连上 OpenClaw：${error?.response?.data?.detail || error?.message || '未知错误'}`;
      setAiMessages((previousMessages) =>
        [...previousMessages, {
          id: createWorkbenchAiMessageId("workbench_ai_assistant"),
          role: "assistant" as const,
          content: message,
        } satisfies WorkbenchAiMessage].slice(-6)
      );
      toast.error(message);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Force navigation
  const handleBack = () => {
    window.location.href = '/';
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
    setContextMenuType('');
  };

  // Handle global context menu
  const handleGlobalContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
    setContextMenuType('global');
  };

  // Handle pomodoro context menu
  const handlePomodoroContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
    setContextMenuType('pomodoro');
  };

  // Handle todo list context menu
  const handleTodoContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
    setContextMenuType('todo');
  };

  // Handle music player context menu
  const handleMusicContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
    setContextMenuType('music');
  };

  // Context menu actions
  const handleThemeToggle = () => {
    toggleDarkMode();
    toast.success(isDark ? '已切换到亮色模式' : '已切换到暗色模式');
    closeContextMenu();
  };

  const handleLockWorkbench = () => {
    toast.info('工作台已锁定（功能开发中）');
    closeContextMenu();
  };

  const handleShowShortcuts = () => {
    toast.info('快捷键：Space 暂停/播放 | Ctrl+N 新建任务', 5000);
    closeContextMenu();
  };

  const handleShowStats = () => {
    toast.info('今日统计：专注时长 XX 分钟 | 完成任务 X 个', 5000);
    closeContextMenu();
  };

  const handleRefreshPage = () => {
    window.location.reload();
  };

  const handleSetTimer = (minutes) => {
    const event = new CustomEvent(`timer-preset-${minutes}`);
    window.dispatchEvent(event);
    closeContextMenu();
  };

  const handleClearCompleted = () => {
    const event = new CustomEvent('workbench-clear', { detail: 'todo-completed' });
    window.dispatchEvent(event);
    closeContextMenu();
  };

  const handleClearAllTodos = () => {
    const event = new CustomEvent('workbench-clear', { detail: 'todo' });
    window.dispatchEvent(event);
    closeContextMenu();
  };

  const handleQuickAddTodos = () => {
    const event = new CustomEvent('workbench-quick-add');
    window.dispatchEvent(event);
    closeContextMenu();
  };

  const handleSetVolume = (vol) => {
    const event = new CustomEvent(vol === 1 ? 'music-volume-up' : 'music-volume-down');
    window.dispatchEvent(event);
    closeContextMenu();
  };

  const handleToggleMute = () => {
    const event = new CustomEvent('music-mute');
    window.dispatchEvent(event);
    closeContextMenu();
  };

  const handleRandomPlay = () => {
    const event = new CustomEvent('music-random');
    window.dispatchEvent(event);
    closeContextMenu();
  };

  const handleTogglePlay = () => {
    const event = new CustomEvent('music-play-pause');
    window.dispatchEvent(event);
    closeContextMenu();
  };

  useEffect(() => {
    // Prevent default context menu on the whole page
    const handleContextMenu = (e) => {
      const isTodoItem = e.target.closest('[data-todo-item]');
      const isInput = e.target.closest('input, textarea, [contenteditable]');
      const isButton = e.target.closest('button');

      if (isTodoItem || isInput || isButton) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY });
      setContextMenuType('global');
    };

    // Use capture phase to intercept before React handlers
    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, []);

  return (
    <div className="h-screen font-sans text-gray-900 dark:text-gray-200 selection:bg-indigo-500/30 overflow-hidden relative transition-colors duration-500">

      {/* Background Overlay - Adaptive (更高的透明度) */}
      <div className="absolute inset-0 bg-white/15 dark:bg-black/15 pointer-events-none z-0 transition-colors duration-500" />

      {/* --- Header (No blur) --- */}
      <header className={`absolute top-0 left-0 w-full z-[70] h-16 px-6 items-center justify-between transition-colors duration-500 pointer-events-none ${panelView === 'projects' ? 'hidden' : 'flex'}`}>
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-3 text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors group relative z-[80] pointer-events-auto"
        >
          <div className="p-2 rounded-full bg-black/5 dark:bg-white/5 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
            <Icons.ArrowLeft />
          </div>
          <span className="font-medium text-sm tracking-wide">Dashboard</span>
        </button>
      </header>

      {/* --- Main Content (Split Layout) --- */}
      <div className="absolute inset-0 z-10 overflow-hidden">
        <button
          type="button"
          aria-label="打开项目页"
          onClick={handleOpenProjectsPage}
          className={`absolute top-0 right-0 h-full w-8 z-[120] transition-opacity ${panelView === 'workbench' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} bg-gradient-to-l from-indigo-400/20 to-transparent hover:from-indigo-400/35`}
        />
        <button
          type="button"
          aria-label="返回工作台"
          onClick={handleBackToWorkbenchPanel}
          className={`absolute top-0 left-0 h-full w-8 z-[120] transition-opacity ${panelView === 'projects' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} bg-gradient-to-r from-indigo-400/20 to-transparent hover:from-indigo-400/35`}
        />

        <div
          className="w-[200vw] h-full flex transition-transform duration-[520ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]"
          style={{ transform: panelView === 'workbench' ? 'translateX(0)' : 'translateX(-100vw)' }}
        >
        <div className={`w-screen h-full flex ${panelView === 'workbench' ? 'pointer-events-auto' : 'pointer-events-none'}`}>

        {/* Left Side: Focus Zone (Timer + Visualizer + Music) */}
        <div
          className="flex-[7] relative flex flex-col border-r border-gray-200/50 dark:border-white/5 bg-transparent transition-colors duration-500"
          onContextMenu={handleGlobalContextMenu}
        >

            {/* Visualizer Background */}
            <div className="absolute inset-0 overflow-hidden flex items-center justify-center opacity-30 pointer-events-none">
                <MusicVisualizer isPlaying={isMusicPlaying} audioData={audioData} isDark={isDark} />
            </div>

            {/* Timer Area (Centered, slightly higher) */}
            <div
              className="flex-1 flex items-center justify-center relative pb-24"
              onContextMenu={handlePomodoroContextMenu}
            >
                <PomodoroTimer />
            </div>

            {/* Music Player Bar (Bottom) - with glass frame, aligned with timer */}
            <div className="absolute bottom-8 left-8 right-8 flex justify-center" onContextMenu={handleMusicContextMenu}>
                <MusicPlayer />
            </div>
        </div>

        {/* Right Side: Workbench Tools */}
        <div className="flex-[3] max-w-[420px] bg-white/15 dark:bg-black/10 backdrop-blur-sm border-l border-gray-200/30 dark:border-white/5 flex flex-col transition-colors duration-500 relative z-[80] overflow-hidden">
          <div className="h-full min-h-0 flex flex-col px-6 py-4">
            <div className="pb-2 flex items-center justify-between">
              <div className="text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-widest">待办</div>
              <button
                type="button"
                onClick={handleOpenProjectsPage}
                className="px-2.5 py-1 text-[11px] rounded-md bg-gray-100/80 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-white/20 transition-colors flex items-center gap-1.5"
              >
                <span>进入项目页</span>
                <Icons.ArrowRight />
              </button>
            </div>
            <div className="flex-1 min-h-0 py-2" onContextMenu={handleTodoContextMenu}>
              <TodoList onTaskSelect={handleTaskSelect} />
            </div>

            <div className="pt-3 border-t border-gray-200/40 dark:border-white/10">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold tracking-wide text-gray-700 dark:text-gray-200 uppercase">
                    AI 工作台入口
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    直接告诉我你要准备什么、更新什么，或者让我整理工作台。
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                  OpenClaw
                </div>
              </div>

              <div className="mb-3 max-h-28 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                {aiMessages.slice(-3).map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-xl px-3 py-2 text-[12px] leading-5 ${
                      message.role === "assistant"
                        ? "bg-white/60 dark:bg-white/10 text-gray-700 dark:text-gray-200"
                        : "bg-indigo-500 text-white"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleAiInputSubmit();
                    }
                  }}
                  placeholder={isAiLoading ? 'OpenClaw 正在处理...' : '例如：帮我准备工作台，先把今天最该做的排好'}
                  className="flex-1 min-w-0 bg-gray-100/50 dark:bg-[#252525]/50 hover:bg-gray-100/80 dark:hover:bg-[#2a2a2a]/80 focus:bg-white dark:focus:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2.5 rounded-lg outline-none transition-colors border border-transparent focus:border-indigo-500/30 dark:focus:border-white/10 text-sm"
                  disabled={isAiLoading}
                />
                <button
                  type="button"
                  onClick={() => void handleAiInputSubmit()}
                  disabled={isAiLoading || !aiInput.trim()}
                  className="shrink-0 rounded-lg bg-indigo-500 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAiLoading ? '处理中' : '交给 AI'}
                </button>
              </div>
            </div>
          </div>
        </div>

        </div>

        <div className={`w-screen h-full ${panelView === 'projects' ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <WorkbenchProjectPanel />
        </div>
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu position={contextMenu} onClose={closeContextMenu}>
        {contextMenuType === 'global' && (
          <>
            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200/50 dark:border-white/5">
              主题设置
            </div>
            <button onClick={handleThemeToggle} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">🌞</span>
              <span className="text-gray-700 dark:text-gray-300">切换亮/暗模式</span>
            </button>

            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-t border-gray-200/50 dark:border-white/5 mt-1">
              选项
            </div>
            <button onClick={handleLockWorkbench} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">🔒</span>
              <span className="text-gray-700 dark:text-gray-300">锁定工作台</span>
            </button>
            <button onClick={handleShowShortcuts} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">⌨️</span>
              <span className="text-gray-700 dark:text-gray-300">查看快捷键</span>
            </button>
            <button onClick={handleShowStats} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">📊</span>
              <span className="text-gray-700 dark:text-gray-300">今日统计</span>
            </button>
            <button onClick={handleRefreshPage} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">🔄</span>
              <span className="text-gray-700 dark:text-gray-300">刷新页面</span>
            </button>
          </>
        )}

        {contextMenuType === 'pomodoro' && (
          <>
            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200/50 dark:border-white/5">
              快速设置时间
            </div>
            <button onClick={() => handleSetTimer(25)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <span className="text-gray-700 dark:text-gray-300">25 分钟（经典）</span>
            </button>
            <button onClick={() => handleSetTimer(30)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <span className="text-gray-700 dark:text-gray-300">30 分钟</span>
            </button>
            <button onClick={() => handleSetTimer(45)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <span className="text-gray-700 dark:text-gray-300">45 分钟</span>
            </button>
            <button onClick={() => handleSetTimer(60)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <span className="text-gray-700 dark:text-gray-300">60 分钟</span>
            </button>

            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-t border-gray-200/50 dark:border-white/5 mt-1">
              会话操作
            </div>
            <button onClick={handleShowStats} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">📊</span>
              <span className="text-gray-700 dark:text-gray-300">今日专注统计</span>
            </button>
          </>
        )}

        {contextMenuType === 'todo' && (
          <>
            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200/50 dark:border-white/5">
              任务操作
            </div>
            <button onClick={handleQuickAddTodos} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">➕</span>
              <span className="text-gray-700 dark:text-gray-300">快速添加任务</span>
            </button>
            <button onClick={handleQuickAddTodos} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">📋</span>
              <span className="text-gray-700 dark:text-gray-300">从剪贴板粘贴</span>
            </button>

            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-t border-gray-200/50 dark:border-white/5 mt-1">
              筛选与排序
            </div>
            <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-gray-300">
              按优先级排序
            </button>
            <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-gray-300">
              仅未完成
            </button>
            <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-gray-300">
              仅已完成
            </button>

            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-t border-gray-200/50 dark:border-white/5 mt-1">
              批量操作
            </div>
            <button onClick={handleClearCompleted} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">✅</span>
              <span className="text-gray-700 dark:text-gray-300">清空已完成</span>
            </button>
            <button onClick={handleClearAllTodos} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-red-600 dark:text-red-400">
              <span>🗑️</span>
              <span>清空所有任务</span>
            </button>
          </>
        )}

        {contextMenuType === 'music' && (
          <>
            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200/50 dark:border-white/5">
              播放控制
            </div>
            <button onClick={handleTogglePlay} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-gray-300">
              ⏯️ 播放/暂停
            </button>
            <button onClick={handleRandomPlay} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">🔀</span>
              <span className="text-gray-700 dark:text-gray-300">随机播放</span>
            </button>

            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-t border-gray-200/50 dark:border-white/5 mt-1">
              音量控制
            </div>
            <button onClick={handleToggleMute} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              🔇 静音
            </button>
            <button onClick={() => handleSetVolume(0)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              🔉 音量 -
            </button>
            <button onClick={() => handleSetVolume(1)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              🔊 音量 +
            </button>
          </>
        )}
      </ContextMenu>

    </div>
  );
}

// --- Minimalist Sound Wave Visualizer ---
interface MusicVisualizerProps {
  isPlaying: boolean;
  audioData: { amplitude: number } | null;
  isDark: boolean;
}

const MusicVisualizer = ({ isPlaying, audioData, isDark }: MusicVisualizerProps) => {
  const rings = 3; 
  const baseColor = isDark ? 'rgba(99, 102, 241,' : 'rgba(79, 70, 229,'; // Indigo 500/600 based
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
  
  return (
    <div className="relative w-full h-full flex items-center justify-center">
       {/* Rotating & Pulsing Rings - Minimalist Line Art */}
       {Array.from({ length: rings }).map((_, i) => (
         <div
            key={i}
            className={`absolute rounded-full border transition-all duration-75 ease-out ${isPlaying ? 'animate-[spin_40s_linear_infinite]' : ''}`}
            style={{
                width: `${400 + i * 200}px`,
                height: `${400 + i * 200}px`,
                opacity: isPlaying ? 0.3 - i * 0.05 : 0.05,
                transform: isPlaying && audioData ? `scale(${1 + audioData.amplitude * 0.15 * (3-i)}) rotate(${i * 45}deg)` : 'scale(1)',
                borderWidth: '1px',
                borderColor: isPlaying ? `${baseColor} ${0.4 - i * 0.1})` : borderColor,
                borderStyle: i === 1 ? 'dashed' : 'solid'
            }}
         />
       ))}
       
       {/* Center Ambient Glow */}
       <div 
         className={`absolute w-[500px] h-[500px] rounded-full transition-all duration-1000 ${isPlaying ? 'opacity-100 scale-110' : 'opacity-10 scale-90'}`} 
         style={{
             backgroundColor: isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(79, 70, 229, 0.05)',
             filter: 'blur(120px)'
         }}
       />
    </div>
  );
};

export default WorkbenchPage;
