import { useState, useEffect } from "react";
import { Gitgraph, Orientation } from "@gitgraph/react";
import PomodoroTimer from "../components/PomodoroTimer";
import MusicPlayer from "../components/MusicPlayer";
import TodoList from "../components/TodoList";
import { apiClient } from "../utils/api";
import { useTheme } from "../context/ThemeContext";
import { useMedia } from "../context/MediaContext";
import { useToast } from "../context/ToastContext";
import ContextMenu from "../components/ContextMenu";

// --- Icons ---
const Icons = {
  ArrowLeft: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
  ArrowRight: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>,
  ChevronDown: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0L5.97 10.78a.75.75 0 111.06-1.06L12 14.69l4.97-4.97a.75.75 0 111.06 1.06l-5.5 5.5z" clipRule="evenodd" /></svg>,
};

type ProgressItem = {
  id: string;
  title: string;
  detail: string;
  progress: number;
  status: "done" | "failed" | "untouched" | "in_progress";
  steps: Array<{
    id: string;
    text: string;
    status: "done" | "failed" | "untouched" | "in_progress";
  }>;
};

type ProjectChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type PersonalTodoItem = {
  id: string;
  text: string;
  category: "学习" | "工作" | "生活" | "娱乐" | "其他";
  source: "ai";
  status: "done" | "pending" | "in_progress";
  aiSteps?: Array<{
    id: string;
    text: string;
    status: "done" | "failed" | "untouched" | "in_progress";
  }>;
};

type AgentStatusItem = {
  id: string;
  level: "openclaw" | "sub-agent" | "sub-sub-agent";
  name: string;
  currentTask: string;
  status: "running" | "idle" | "blocked";
  progress: number;
};

type GitGraphNode = {
  id: string;
  hash: string;
  title: string;
  author: string;
  date: string;
  branch: string;
  lane: 'base' | 'main' | 'feature';
  changes: string[];
};

const MOCK_PROGRESS_ITEMS: ProgressItem[] = [
  {
    id: "opc-1",
    title: "OpenClaw Gateway 稳定性跟踪",
    detail: "检查网关健康状态、连接重试策略和错误日志聚合，确保日常代理调用稳定。",
    progress: 68,
    status: "in_progress",
    steps: [
      { id: "s-11", text: "拉取最近 24h 错误日志", status: "done" },
      { id: "s-12", text: "分析超时和重试分布", status: "in_progress" },
      { id: "s-13", text: "输出稳定性结论到日报", status: "failed" },
      { id: "s-14", text: "补充异常场景压测", status: "untouched" },
    ],
  },
  {
    id: "opc-2",
    title: "Agent main 工作流优化",
    detail: "梳理任务拆解模板，减少回复冗余，提升需求转待办的命中率。",
    progress: 42,
    status: "failed",
    steps: [
      { id: "s-21", text: "收集当前提示词样本", status: "done" },
      { id: "s-22", text: "优化任务拆解模板", status: "failed" },
      { id: "s-23", text: "回归测试命中率", status: "untouched" },
    ],
  },
  {
    id: "opc-3",
    title: "FlowStudy × OpenClaw 联动看板",
    detail: "统一查看学习任务与代理项目推进节奏，定义关键里程碑和验收节点。",
    progress: 27,
    status: "untouched",
    steps: [
      { id: "s-31", text: "定义联动看板字段", status: "untouched" },
      { id: "s-32", text: "对齐任务状态映射", status: "untouched" },
      { id: "s-33", text: "确认展示层交互细节", status: "failed" },
    ],
  },
];

const MOCK_PROJECT_CHAT: ProjectChatMessage[] = [
  { id: "m-1", role: "assistant", content: "已进入项目协作模式。你可以让我汇总任务风险或拆解今天计划。" },
  { id: "m-2", role: "user", content: "先帮我看下 gateway 稳定性今天要做什么。" },
  { id: "m-3", role: "assistant", content: "建议先做 3 件事：1) 拉取最近 24h 错误日志；2) 检查重试超时阈值；3) 输出简短结论到项目日报。" },
];

const MOCK_PERSONAL_TODOS: PersonalTodoItem[] = [
  { id: "pt-1", text: "复盘今日任务推进", category: "工作", source: "ai", status: "in_progress" },
  { id: "pt-2", text: "整理 OpenClaw 需求清单", category: "工作", source: "ai", status: "pending" },
  { id: "pt-3", text: "晚间 45 分钟高数复习", category: "学习", source: "ai", status: "done" },
  {
    id: "pt-4",
    text: "汇总 gateway 健康状态",
    category: "工作",
    source: "ai",
    status: "in_progress",
    aiSteps: [
      { id: "pt4-s1", text: "拉取最近 24h 错误日志", status: "done" },
      { id: "pt4-s2", text: "按模块聚类异常来源", status: "in_progress" },
      { id: "pt4-s3", text: "输出初版汇总结论", status: "untouched" },
    ],
  },
  {
    id: "pt-5",
    text: "输出稳定性结论",
    category: "工作",
    source: "ai",
    status: "pending",
    aiSteps: [
      { id: "pt5-s1", text: "整合重试策略评估结果", status: "done" },
      { id: "pt5-s2", text: "生成日报摘要", status: "failed" },
      { id: "pt5-s3", text: "重试并回填日报", status: "untouched" },
    ],
  },
];

const MOCK_AGENT_STATUS_BOARD: AgentStatusItem[] = [
  {
    id: "sb-1",
    level: "openclaw",
    name: "OpenClaw Core Agent",
    currentTask: "汇总 gateway 健康状态与今日风险项",
    status: "running",
    progress: 61,
  },
  {
    id: "sb-2",
    level: "sub-agent",
    name: "research-agent",
    currentTask: "抓取最近 24h 错误日志并按模块聚类",
    status: "running",
    progress: 72,
  },
  {
    id: "sb-3",
    level: "sub-agent",
    name: "planner-agent",
    currentTask: "重排本周优先级任务清单",
    status: "idle",
    progress: 15,
  },
  {
    id: "sb-4",
    level: "sub-sub-agent",
    name: "retry-analyzer",
    currentTask: "分析重试策略失败样本",
    status: "blocked",
    progress: 33,
  },
];

const TODO_CATEGORIES: Array<"学习" | "工作" | "生活" | "娱乐" | "其他"> = ["学习", "工作", "生活", "娱乐", "其他"];

const inferTodoCategory = (text: string): "学习" | "工作" | "生活" | "娱乐" | "其他" => {
  if (/(学习|复习|题|背|课程|笔记|英语|数学|阅读)/.test(text)) return "学习";
  if (/(工作|项目|代理|openclaw|网关|日报|任务|计划|开会|交付)/i.test(text)) return "工作";
  if (/(生活|买|运动|健身|睡|吃|家务|散步|收拾)/.test(text)) return "生活";
  if (/(玩|休息|电影|游戏|音乐|放松)/.test(text)) return "娱乐";
  return "其他";
};

function WorkbenchPage() {
  const { isDark, toggleDarkMode } = useTheme();
  const toast = useToast();

  // ✅ 使用全局媒体状态
  const { isMusicPlaying, audioData } = useMedia();

  const [currentTask, setCurrentTask] = useState<any>(null);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [panelView, setPanelView] = useState<'workbench' | 'projects'>('workbench');
  const [isPanelAnimating, setIsPanelAnimating] = useState(false);
  const [expandedProgressIds, setExpandedProgressIds] = useState<string[]>([]);
  const [expandedPersonalAiIds, setExpandedPersonalAiIds] = useState<string[]>([]);
  const [projectLeftTab, setProjectLeftTab] = useState<'subAgents' | 'myTodo' | 'insights' | 'status' | 'git'>('myTodo');
  const [myTodoItems, setMyTodoItems] = useState<PersonalTodoItem[]>(MOCK_PERSONAL_TODOS);
  const [projectChatInput, setProjectChatInput] = useState('');
  const [projectChatMessages, setProjectChatMessages] = useState<ProjectChatMessage[]>(MOCK_PROJECT_CHAT);
  const [isProjectChatThinking, setIsProjectChatThinking] = useState(false);
  const [selectedGitNodeId, setSelectedGitNodeId] = useState('n4');

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

  const toggleProgressItem = (id: string) => {
    setExpandedProgressIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const togglePersonalAiItem = (id: string) => {
    setExpandedPersonalAiIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleProjectChatSend = () => {
    const text = projectChatInput.trim();
    if (!text || isProjectChatThinking) return;

    const userMessage: ProjectChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };

    setProjectChatMessages((prev) => [...prev, userMessage]);
    setProjectChatInput('');
    setIsProjectChatThinking(true);

    const doneMatch = text.match(/完成\s*[:：]?\s*(.+)$/);
    if (doneMatch?.[1]) {
      const target = doneMatch[1].trim();
      setMyTodoItems((prev) => prev.map((item) =>
        item.text.includes(target) ? { ...item, status: 'done' } : item
      ));
      const assistantMessage: ProjectChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: `已执行：把“${target}”标记为完成。`,
      };
      setProjectChatMessages((prev) => [...prev, assistantMessage]);
      setIsProjectChatThinking(false);
      return;
    }

    const pendingMatch = text.match(/未完成\s*[:：]?\s*(.+)$/);
    if (pendingMatch?.[1]) {
      const target = pendingMatch[1].trim();
      setMyTodoItems((prev) => prev.map((item) =>
        item.text.includes(target) ? { ...item, status: 'pending' } : item
      ));
      const assistantMessage: ProjectChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: `已执行：把“${target}”标记为未完成。`,
      };
      setProjectChatMessages((prev) => [...prev, assistantMessage]);
      setIsProjectChatThinking(false);
      return;
    }

    const aiPrompt = `你是任务拆解助手。请把用户需求拆分成可执行待办，仅返回 JSON 数组字符串，不要输出任何解释文字。例如：["任务1","任务2"]。\n用户需求：${text}`;
    const streamUrl = apiClient.getUri({
      url: "/ai/quick-qa-stream",
      params: {
        question: aiPrompt,
        model: "auto",
      },
    });

    const token = localStorage.getItem("token");
    fetch(streamUrl, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`AI 请求失败: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法读取 AI 响应流');
        }

        const decoder = new TextDecoder();
        let fullAnswer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullAnswer += decoder.decode(value, { stream: true });
        }

        const todoItems = extractTodoItems(fullAnswer);
        if (todoItems.length > 0) {
          const generatedTodos: PersonalTodoItem[] = todoItems.map((todoText, idx) => ({
            id: `pt-${Date.now()}-${idx}`,
            text: todoText,
            category: inferTodoCategory(todoText),
            source: 'ai',
            status: 'pending',
            aiSteps: [
              { id: `s-${Date.now()}-${idx}-1`, text: 'AI 解析需求意图', status: 'done' },
              { id: `s-${Date.now()}-${idx}-2`, text: '自动归类到对应象限', status: 'in_progress' },
              { id: `s-${Date.now()}-${idx}-3`, text: '生成执行建议并跟踪', status: 'untouched' },
            ],
          }));
          setMyTodoItems((prev) => [...generatedTodos, ...prev]);
        }

        const assistantMessage: ProjectChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: fullAnswer || "已完成分析，但未识别到可执行任务。",
        };
        setProjectChatMessages((prev) => [...prev, assistantMessage]);
      })
      .catch((error) => {
        console.error('项目 AI 助手失败:', error);
        setProjectChatMessages((prev) => [...prev, {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "OpenClaw 处理失败，请稍后重试。",
        }]);
      })
      .finally(() => {
        setIsProjectChatThinking(false);
      });
  };

  const MOCK_GIT_GRAPH: GitGraphNode[] = [
    {
      id: 'n1',
      hash: 'c1a0d9e',
      title: '初始化 Workbench 项目页结构',
      author: 'AI Assistant',
      date: '2026-03-05',
      branch: 'main',
      lane: 'main',
      changes: ['frontend/src/pages/WorkbenchPage.tsx'],
    },
    {
      id: 'n2',
      hash: '6f2be11',
      title: '新增我的Todo与子代理标签',
      author: 'AI Assistant',
      date: '2026-03-05',
      branch: 'feature/todo-flow',
      lane: 'main',
      changes: ['frontend/src/pages/WorkbenchPage.tsx'],
    },
    {
      id: 'n3',
      hash: '9ab441c',
      title: 'feature: 右侧项目AI助手接 OpenClaw 入口',
      author: 'AI Assistant',
      date: '2026-03-05',
      branch: 'feature/todo-flow',
      lane: 'feature',
      changes: ['frontend/src/pages/WorkbenchPage.tsx', 'backend/git_routes.py'],
    },
    {
      id: 'n5',
      hash: 'ac12f77',
      title: 'feature: 调整 AI 任务回写与分类',
      author: 'AI Assistant',
      date: '2026-03-05',
      branch: 'feature/todo-flow',
      lane: 'feature',
      changes: ['frontend/src/pages/WorkbenchPage.tsx'],
    },
    {
      id: 'n4',
      hash: 'd4ce820',
      title: 'main: 合并 feature 并完善 Git 图视图',
      author: 'AI Assistant',
      date: '2026-03-05',
      branch: 'main',
      lane: 'main',
      changes: ['frontend/src/pages/WorkbenchPage.tsx', 'backend/main.py'],
    },
  ];

  const selectedGitNode = MOCK_GIT_GRAPH.find((n) => n.id === selectedGitNodeId) || MOCK_GIT_GRAPH[MOCK_GIT_GRAPH.length - 1];

  const extractTodoItems = (rawText: string): string[] => {
    const cleaned = rawText
      .replace(/\[值得制卡\]|\[不值得制卡\]/g, '')
      .trim();

    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => String(item).trim())
            .filter(Boolean);
        }
      } catch {
      }
    }

    return cleaned
      .split('\n')
      .map((line) => line.replace(/^[-*\d.\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 8);
  };

  const handleAiInputSubmit = async () => {
    const userInput = aiInput.trim();
    if (!userInput || isAiLoading) return;

    setIsAiLoading(true);

    window.dispatchEvent(
      new CustomEvent<{ text: string }>('workbench-direct-add-todo', {
        detail: { text: userInput },
      })
    );

    setAiInput('');
    toast.success('已添加到待办');
    setIsAiLoading(false);
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
      // Check if right-clicking on todo item or mistake item
      const isTodoItem = e.target.closest('[data-todo-item]');
      const isMistakeItem = e.target.closest('[data-mistake-item]');
      const isInput = e.target.closest('input, textarea, [contenteditable]');
      const isButton = e.target.closest('button');

      // Don't interfere with todo/mistake items, inputs, or buttons
      if (isTodoItem || isMistakeItem || isInput || isButton) {
        return;
      }

      // For other areas, prevent default and show global menu
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

            <div className="pt-3">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAiInputSubmit();
                  }
                }}
                placeholder={isAiLoading ? '正在添加待办...' : '输入需求，按 Enter 直接添加到待办'}
                className="w-full bg-gray-100/50 dark:bg-[#252525]/50 hover:bg-gray-100/80 dark:hover:bg-[#2a2a2a]/80 focus:bg-white dark:focus:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2.5 rounded-lg outline-none transition-colors border border-transparent focus:border-indigo-500/30 dark:focus:border-white/10 text-sm"
                disabled={isAiLoading}
              />
            </div>
          </div>
        </div>

        </div>

        <div className={`w-screen h-full bg-transparent border-l border-gray-200/40 dark:border-white/10 flex ${panelView === 'projects' ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <div className="w-8 shrink-0" />

          <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 px-5 py-5">
            <div className="col-span-7 min-w-0 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-transparent overflow-hidden flex flex-col">
              <div className="px-5 py-3 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between">
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">项目任务</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Mock 数据</div>
              </div>

              <div className="px-3 pt-3 pb-2 border-b border-gray-200/40 dark:border-white/10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProjectLeftTab('myTodo')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${projectLeftTab === 'myTodo' ? 'bg-indigo-500 text-white' : 'bg-gray-100/70 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}
                >
                  我的Todo
                </button>
                <button
                  type="button"
                  onClick={() => setProjectLeftTab('subAgents')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${projectLeftTab === 'subAgents' ? 'bg-indigo-500 text-white' : 'bg-gray-100/70 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}
                >
                  子代理任务进程
                </button>
                <button
                  type="button"
                  onClick={() => setProjectLeftTab('insights')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${projectLeftTab === 'insights' ? 'bg-indigo-500 text-white' : 'bg-gray-100/70 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}
                >
                  项目洞察
                </button>
                <button
                  type="button"
                  onClick={() => setProjectLeftTab('status')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${projectLeftTab === 'status' ? 'bg-indigo-500 text-white' : 'bg-gray-100/70 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}
                >
                  代理状态总览
                </button>
                <button
                  type="button"
                  onClick={() => setProjectLeftTab('git')}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${projectLeftTab === 'git' ? 'bg-indigo-500 text-white' : 'bg-gray-100/70 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}
                >
                  Git 面板
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {projectLeftTab === 'status' && (
                  <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-black/25 backdrop-blur-sm p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">代理状态总览</div>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">OpenClaw / 子代理 / 子子代理</span>
                    </div>

                    <div className="space-y-2.5">
                      {MOCK_AGENT_STATUS_BOARD.map((item) => {
                        const levelLabel = item.level === 'openclaw'
                          ? 'OpenClaw'
                          : item.level === 'sub-agent'
                            ? '子代理'
                            : '子子代理';
                        const statusText = item.status === 'running' ? '执行中' : item.status === 'idle' ? '空闲' : '阻塞';
                        const statusColor = item.status === 'running' ? 'bg-indigo-500' : item.status === 'idle' ? 'bg-gray-500' : 'bg-amber-500';

                        return (
                          <div key={item.id} className="rounded-lg border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-black/20 px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="min-w-0">
                                <div className="text-[11px] text-gray-500 dark:text-gray-400">{levelLabel}</div>
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.name}</div>
                              </div>
                              <span className={`text-[11px] text-white px-2 py-0.5 rounded-full ${statusColor}`}>{statusText}</span>
                            </div>
                            <div className="text-[13px] text-gray-700 dark:text-gray-300 mb-2">{item.currentTask}</div>
                            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                              <div className={`h-full rounded-full ${statusColor}`} style={{ width: `${item.progress}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {projectLeftTab === 'subAgents' && MOCK_PROGRESS_ITEMS.map((item) => {
                  const expanded = expandedProgressIds.includes(item.id);
                  const statusDot = item.status === 'done'
                    ? 'bg-emerald-500'
                    : item.status === 'failed'
                      ? 'bg-amber-500'
                      : item.status === 'untouched'
                        ? 'bg-transparent border border-gray-900 dark:border-gray-100'
                        : 'bg-indigo-500';

                  return (
                    <div key={item.id} className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-black/25 backdrop-blur-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleProgressItem(item.id)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/10 dark:hover:bg-black/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot}`} />
                          {item.status === 'in_progress' && (
                            <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin flex-shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{item.title}</span>
                        </div>
                        <div className={`text-gray-500 dark:text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                          <Icons.ChevronDown />
                        </div>
                      </button>

                      <div className={`grid transition-all duration-300 ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                          <div className="px-4 pb-4 pt-1 text-sm text-gray-700 dark:text-gray-300 space-y-3 border-t border-gray-200/50 dark:border-white/10">
                            <p className="leading-relaxed">{item.detail}</p>
                            <div className="space-y-2.5">
                              {item.steps.map((step) => {
                                const stepDot = step.status === 'done'
                                  ? 'bg-emerald-500'
                                  : step.status === 'failed'
                                    ? 'bg-amber-500'
                                    : step.status === 'untouched'
                                      ? 'bg-transparent border border-gray-900 dark:border-gray-100'
                                      : 'bg-indigo-500';

                                return (
                                  <div key={step.id} className="flex items-center gap-2.5">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stepDot}`} />
                                    {step.status === 'in_progress' && (
                                      <span className="w-2 h-2 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin flex-shrink-0" />
                                    )}
                                    <span className="text-[13px] text-gray-700 dark:text-gray-300">{step.text}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">进度</span>
                                <span className="text-xs font-semibold">{item.progress}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${item.progress}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {projectLeftTab === 'myTodo' && (
                  <div className="space-y-2.5">
                    {TODO_CATEGORIES.map((category) => {
                      const items = myTodoItems.filter((todo) => todo.category === category);
                      if (items.length === 0) return null;

                      return (
                        <div key={category} className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/45 dark:bg-black/20 backdrop-blur-sm p-3">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">{category}</div>
                          <div className="space-y-2">
                            {items.map((todo) => {
                              const isAiTask = todo.source === 'ai';
                              const expanded = isAiTask && expandedPersonalAiIds.includes(todo.id);
                              const statusDot = todo.status === 'done' ? 'bg-emerald-500' : todo.status === 'pending' ? 'bg-amber-500' : 'bg-indigo-500';

                              return (
                                <div key={todo.id} className="rounded-lg border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-black/25 backdrop-blur-sm p-3">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot}`} />
                                    {todo.status === 'in_progress' && (
                                      <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin flex-shrink-0" />
                                    )}
                                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{todo.text}</div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${todo.source === 'ai' ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'}`}>
                                      {todo.source === 'ai' ? 'AI任务' : '我的任务'}
                                    </span>
                                    {isAiTask && (
                                      <button
                                        type="button"
                                        onClick={() => togglePersonalAiItem(todo.id)}
                                        className={`ml-auto text-gray-500 dark:text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                                      >
                                        <Icons.ChevronDown />
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-[13px] text-gray-700 dark:text-gray-300">{todo.source === 'ai' ? 'AI 生成并跟踪的任务项' : '个人任务项'}</div>

                                  {isAiTask && (
                                    <div className={`grid transition-all duration-300 ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                      <div className="overflow-hidden">
                                        <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-white/10 space-y-2">
                                          {todo.aiSteps?.map((step) => {
                                            const stepDot = step.status === 'done'
                                              ? 'bg-emerald-500'
                                              : step.status === 'failed'
                                                ? 'bg-amber-500'
                                                : step.status === 'untouched'
                                                  ? 'bg-transparent border border-gray-900 dark:border-gray-100'
                                                  : 'bg-indigo-500';

                                            return (
                                              <div key={step.id} className="flex items-center gap-2.5">
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stepDot}`} />
                                                {step.status === 'in_progress' && (
                                                  <span className="w-2 h-2 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin flex-shrink-0" />
                                                )}
                                                <span className="text-[13px] text-gray-700 dark:text-gray-300">{step.text}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {projectLeftTab === 'insights' && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/55 dark:bg-black/20 p-4">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">本周风险提示（Mock）</div>
                      <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <li>Gateway 错误峰值出现在晚高峰，建议补充限流策略。</li>
                        <li>子代理任务校验覆盖率偏低，建议补一轮验收清单。</li>
                      </ul>
                    </div>
                    <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/55 dark:bg-black/20 p-4">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">下一步建议（Mock）</div>
                      <ol className="list-decimal pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <li>先处理高风险任务，再推进长线优化。</li>
                        <li>每日同步子代理执行状态到项目日报。</li>
                      </ol>
                    </div>
                  </div>
                )}

                {projectLeftTab === 'git' && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-black/25 backdrop-blur-sm p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Frontend Git 提交图（Mock）</div>
                        <button
                          type="button"
                          onClick={() => toast.info('Mock 模式：节点图已是演示数据')}
                          className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50"
                        >
                          Mock
                        </button>
                      </div>

                      <div className="rounded-lg border border-gray-200/60 dark:border-white/10 bg-white/40 dark:bg-black/20 p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">gitgraph/react 渲染（Mock 数据）</div>
                        <div className="h-72 w-full overflow-hidden rounded-md bg-white/50 dark:bg-black/25 border border-gray-200/50 dark:border-white/10 p-2">
                          <Gitgraph options={{
                            orientation: Orientation.Horizontal,
                            author: '',
                          }}>
                            {(gitgraph) => {
                              const main = gitgraph.branch('main');
                              main.commit({
                                subject: '初始化 Workbench 项目页结构',
                                hash: 'c1a0d9e',
                                onClick: () => setSelectedGitNodeId('n1'),
                              });
                              const c2 = main.commit({
                                subject: '新增我的Todo与子代理标签',
                                hash: '6f2be11',
                                onClick: () => setSelectedGitNodeId('n2'),
                              });

                              const feature = main.branch('feature/todo-flow');
                              feature.checkout();
                              feature.commit({
                                subject: '右侧项目AI助手接 OpenClaw 入口',
                                hash: '9ab441c',
                                onClick: () => setSelectedGitNodeId('n3'),
                              });
                              feature.commit({
                                subject: '调整 AI 任务回写与分类',
                                hash: 'ac12f77',
                                onClick: () => setSelectedGitNodeId('n5'),
                              });

                              main.checkout();
                              main.merge({
                                branch: feature,
                                commitOptions: {
                                  subject: 'main: 合并 feature 并完善 Git 图视图',
                                  hash: 'd4ce820',
                                  onClick: () => setSelectedGitNodeId('n4'),
                                },
                              });

                              return null;
                            }}
                          </Gitgraph>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200/60 dark:border-white/10 bg-white/40 dark:bg-black/20 p-3 space-y-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">当前节点</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedGitNode.title}</div>
                        <div className="text-xs font-mono text-indigo-600 dark:text-indigo-300">{selectedGitNode.hash} · {selectedGitNode.branch} · {selectedGitNode.lane}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">{selectedGitNode.author} · {selectedGitNode.date}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">改动文件：</div>
                        <ul className="list-disc pl-4 text-xs text-gray-700 dark:text-gray-300 space-y-1">
                          {selectedGitNode.changes.map((file) => (
                            <li key={file}>{file}</li>
                          ))}
                        </ul>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => toast.success(`Mock：已回到节点 ${selectedGitNode.hash}`)}
                            className="px-2.5 py-1.5 text-xs rounded bg-indigo-500 text-white hover:bg-indigo-600"
                          >
                            回到这个节点
                          </button>
                          <button
                            type="button"
                            onClick={() => toast.success(`Mock：已从 ${selectedGitNode.hash} 创建分支`)}
                            className="px-2.5 py-1.5 text-xs rounded bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20"
                          >
                            从此节点开分支
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-5 min-w-0 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-black/25 backdrop-blur-sm overflow-hidden flex flex-col">
              <div className="px-5 py-3 border-b border-gray-200/50 dark:border-white/10">
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">项目 AI 助手</div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {projectChatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[86%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-100'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {isProjectChatThinking && (
                  <div className="flex justify-start">
                    <div className="max-w-[86%] px-3 py-2 rounded-xl text-sm bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                      AI 正在整理回复...
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-200/50 dark:border-white/10 flex items-center gap-2">
                <input
                  type="text"
                  value={projectChatInput}
                  onChange={(e) => setProjectChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleProjectChatSend();
                    }
                  }}
                  placeholder="输入项目问题，按 Enter 发送（Mock）"
                  className="flex-1 min-w-0 bg-gray-100/70 dark:bg-white/10 px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-indigo-500/30 dark:focus:border-white/20"
                />
                <button
                  type="button"
                  onClick={handleProjectChatSend}
                  disabled={isProjectChatThinking || !projectChatInput.trim()}
                  className="px-3 py-2 rounded-lg text-sm bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  发送
                </button>
              </div>

            </div>
          </div>
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
