import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  aiAPI,
  projectsAPI,
  type ProjectRecordDTO,
} from "../utils/api";
import {
  getTodos,
  type Todo,
} from "../utils/workbenchApi";
import {
  PROJECT_TODO_CATEGORIES,
  buildProjectPanelHistory,
  buildProjectPanelSessionTitle,
  createDefaultProjectPanelState,
  createProjectPanelSession,
  getProjectPanelHistoryStorageKey,
  groupTodosByCategory,
  limitProjectPanelMessages,
  parseStoredProjectPanelState,
  serializeProjectPanelState,
  type ProjectPanelMessage,
  type ProjectPanelRefreshHint,
  type ProjectPanelRefreshResult,
  type ProjectPanelState,
} from "../pages/workbenchProjectPanelState";
import {
  buildEffectSummary,
  buildRefreshResultSummary,
  deriveProjectInsights,
  getLatestAssistantRunState,
} from "../pages/workbenchProjectPanelEffectsState";
import {
  dispatchWorkbenchTodosRefresh,
  WORKBENCH_TODOS_REFRESH_EVENT,
} from "../utils/workbenchTodoEvents";

type ProjectLeftTab = "myTodo" | "subAgents" | "insights" | "status" | "git";
type ProjectPlaceholderTab = "subAgents" | "git";

const createChatId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const formatPriority = (priority: number) => {
  if (priority >= 2) {
    return "高优先级";
  }
  if (priority === 1) {
    return "中优先级";
  }
  return "低优先级";
};

const formatTodoMeta = (todo: Todo) => {
  const parts = [formatPriority(todo.priority)];

  if (todo.subject && todo.subject !== "general") {
    parts.push(todo.subject);
  }

  if (todo.due_date) {
    parts.push(`截止 ${todo.due_date}`);
  }

  return parts.join(" · ");
};

const PLACEHOLDER_COPY: Record<ProjectPlaceholderTab, { title: string; body: string }> = {
  subAgents: {
    title: "子代理任务进程待接入",
    body: "这一栏后续接 OpenClaw 的真实执行链路和子任务进度。本轮继续保留诚实占位。",
  },
  git: {
    title: "Git 面板待接入",
    body: "后续单独接真实 git 状态和提交视图。本轮不展示假的提交图和分支动作。",
  },
};

const getPanelBadgeCopy = (tab: ProjectLeftTab) => {
  if (tab === "myTodo") {
    return "真实 Todo 数据";
  }
  if (tab === "insights") {
    return "项目 API 摘要";
  }
  if (tab === "status") {
    return "当前会话本地状态";
  }
  return "保留诚实占位";
};

const formatExecutedAt = (value: string | undefined) => {
  if (!value) {
    return "暂无";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "暂无";
  }

  return parsed.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRunStatus = (
  isProcessing: boolean,
  outcome: "success" | "partial" | "failed" | undefined
) => {
  if (isProcessing) {
    return "处理中";
  }
  if (outcome === "failed") {
    return "上次失败";
  }
  if (outcome === "partial") {
    return "上次成功（部分）";
  }
  if (outcome === "success") {
    return "上次成功";
  }
  return "空闲";
};

const getRefreshLabel = (target: ProjectPanelRefreshHint) =>
  target === "todo" ? "我的Todo" : "项目洞察";

const WorkbenchProjectPanel = () => {
  const { token, user, logout } = useAuth();
  const [projectLeftTab, setProjectLeftTab] = useState<ProjectLeftTab>("myTodo");
  const [projectPanelState, setProjectPanelState] = useState<ProjectPanelState>(() => createDefaultProjectPanelState());
  const [projectChatInput, setProjectChatInput] = useState("");
  const [typingSessionId, setTypingSessionId] = useState<string | null>(null);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [todoGroups, setTodoGroups] = useState(() => groupTodosByCategory([]));
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [todoLoadFailed, setTodoLoadFailed] = useState(false);
  const [projects, setProjects] = useState<ProjectRecordDTO[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectLoadFailed, setProjectLoadFailed] = useState(false);
  const [hasLoadedTodosOnce, setHasLoadedTodosOnce] = useState(false);
  const [hasLoadedProjectsOnce, setHasLoadedProjectsOnce] = useState(false);

  const historyStorageKey = getProjectPanelHistoryStorageKey(user?.id);
  const activeSession =
    projectPanelState.sessions.find((session) => session.id === projectPanelState.activeSessionId) ??
    projectPanelState.sessions[0];
  const orderedSessions = useMemo(
    () => [...projectPanelState.sessions].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()),
    [projectPanelState.sessions]
  );
  const activeMessages = activeSession?.messages ?? [];
  const isProjectChatThinking = typingSessionId === activeSession?.id;
  const latestRunState = useMemo(() => getLatestAssistantRunState(activeMessages), [activeMessages]);
  const projectInsights = useMemo(() => deriveProjectInsights(projects), [projects]);

  const updateSessionMessages = (sessionId: string, nextMessages: ProjectPanelMessage[], updatedAt: Date) => {
    const cappedMessages = limitProjectPanelMessages(nextMessages);

    setProjectPanelState((previousState) => ({
      ...previousState,
      sessions: previousState.sessions.map((session, index) =>
        session.id === sessionId
          ? {
              ...session,
              title: buildProjectPanelSessionTitle(
                cappedMessages,
                session.title || `项目会话 ${String(index + 1).padStart(2, "0")}`
              ),
              updatedAt,
              messages: cappedMessages,
            }
          : session
      ),
    }));
  };

  const loadProjectTodos = async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent || !hasLoadedTodosOnce) {
      setLoadingTodos(true);
    }

    try {
      const todos = await getTodos(false);
      setTodoGroups(groupTodosByCategory(todos));
      setTodoLoadFailed(false);
      setHasLoadedTodosOnce(true);
      return todos;
    } catch (error) {
      console.error("Failed to load project panel todos:", error);
      setTodoLoadFailed(true);
      if (!silent) {
        setTodoGroups(groupTodosByCategory([]));
      }
      throw error;
    } finally {
      if (!silent || !hasLoadedTodosOnce) {
        setLoadingTodos(false);
      }
    }
  };

  const loadProjectInsights = async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent || !hasLoadedProjectsOnce) {
      setLoadingProjects(true);
    }

    try {
      const nextProjects = await projectsAPI.getProjects();
      setProjects(nextProjects);
      setProjectLoadFailed(false);
      setHasLoadedProjectsOnce(true);
      return nextProjects;
    } catch (error) {
      console.error("Failed to load project insights:", error);
      setProjectLoadFailed(true);
      if (!silent) {
        setProjects([]);
      }
      throw error;
    } finally {
      if (!silent || !hasLoadedProjectsOnce) {
        setLoadingProjects(false);
      }
    }
  };

  useEffect(() => {
    if (!historyStorageKey) {
      setProjectPanelState(createDefaultProjectPanelState());
      setHasLoadedHistory(false);
      setTypingSessionId(null);
      return;
    }

    setProjectPanelState(parseStoredProjectPanelState(localStorage.getItem(historyStorageKey)));
    setTypingSessionId(null);
    setHasLoadedHistory(true);
  }, [historyStorageKey]);

  useEffect(() => {
    if (!historyStorageKey || !hasLoadedHistory) {
      return;
    }

    localStorage.setItem(historyStorageKey, JSON.stringify(serializeProjectPanelState(projectPanelState)));
  }, [hasLoadedHistory, historyStorageKey, projectPanelState]);

  useEffect(() => {
    void loadProjectTodos().catch(() => null);
    void loadProjectInsights().catch(() => null);

    const handleTodosRefresh = () => {
      void loadProjectTodos({ silent: true }).catch(() => null);
    };

    window.addEventListener(WORKBENCH_TODOS_REFRESH_EVENT, handleTodosRefresh);
    return () => {
      window.removeEventListener(WORKBENCH_TODOS_REFRESH_EVENT, handleTodosRefresh);
    };
  }, []);

  const handleCreateSession = () => {
    setProjectPanelState((previousState) => {
      const newSession = createProjectPanelSession(previousState.sessions.length + 1);
      return {
        activeSessionId: newSession.id,
        sessions: [newSession, ...previousState.sessions],
      };
    });
    setProjectChatInput("");
  };

  const handleSelectSession = (sessionId: string) => {
    setProjectPanelState((previousState) =>
      previousState.activeSessionId === sessionId
        ? previousState
        : {
            ...previousState,
            activeSessionId: sessionId,
          }
    );
  };

  const refreshPanelsFromHints = async (
    refreshHints: readonly ProjectPanelRefreshHint[]
  ): Promise<ProjectPanelRefreshResult[]> => {
    const results: ProjectPanelRefreshResult[] = [];

    for (const hint of refreshHints) {
      try {
        if (hint === "todo") {
          await loadProjectTodos({ silent: true });
          dispatchWorkbenchTodosRefresh();
        }

        if (hint === "insights") {
          await loadProjectInsights({ silent: true });
        }

        results.push({
          target: hint,
          success: true,
          label: getRefreshLabel(hint),
        });
      } catch {
        results.push({
          target: hint,
          success: false,
          label: getRefreshLabel(hint),
        });
      }
    }

    return results;
  };

  const handleProjectChatSend = async () => {
    const text = projectChatInput.trim();
    const sessionId = activeSession?.id;
    if (!text || !sessionId || typingSessionId) {
      return;
    }

    if (!token) {
      logout();
      return;
    }

    const userMessage: ProjectPanelMessage = {
      id: createChatId("project_panel_user"),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    const nextMessages = limitProjectPanelMessages([...activeMessages, userMessage]);

    updateSessionMessages(sessionId, nextMessages, userMessage.timestamp);
    setProjectChatInput("");
    setTypingSessionId(sessionId);

    try {
      const payload = await aiAPI.chatForProjectPanel({
        message: text,
        provider: "openclaw",
        history: buildProjectPanelHistory(nextMessages),
      });

      const refreshResults = await refreshPanelsFromHints(payload.refreshHints ?? []);
      const assistantMessage: ProjectPanelMessage = {
        id: createChatId("project_panel_ai"),
        role: "assistant",
        content:
          typeof payload.reply === "string" && payload.reply.trim()
            ? payload.reply.trim()
            : "我这次没有拿到可用回复。",
        timestamp: new Date(),
        provider: payload.provider,
        effects: payload.effects,
        refreshHints: payload.refreshHints,
        refreshResults,
        runMeta: payload.runMeta,
      };

      updateSessionMessages(sessionId, [...nextMessages, assistantMessage], assistantMessage.timestamp);
    } catch (error) {
      if ((error as { response?: { status?: number } })?.response?.status === 401) {
        logout();
        return;
      }

      const failureMessage: ProjectPanelMessage = {
        id: createChatId("project_panel_ai"),
        role: "assistant",
        content: `抱歉，这次没有连上 OpenClaw：${error instanceof Error ? error.message : "未知错误"}`,
        timestamp: new Date(),
        provider: "openclaw",
        runMeta: {
          executedAt: new Date().toISOString(),
          outcome: "failed",
        },
      };
      updateSessionMessages(sessionId, [...nextMessages, failureMessage], failureMessage.timestamp);
    } finally {
      setTypingSessionId((currentSessionId) => (currentSessionId === sessionId ? null : currentSessionId));
    }
  };

  const renderTodoPanel = () => {
    if (loadingTodos) {
      return (
        <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/45 dark:bg-black/20 p-4 text-sm text-gray-500 dark:text-gray-400">
          正在加载真实待办...
        </div>
      );
    }

    if (todoLoadFailed) {
      return (
        <div className="rounded-xl border border-amber-300/60 dark:border-amber-400/20 bg-amber-50/70 dark:bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
          待办加载失败。项目 AI 聊天仍可继续，等会儿再刷新一次就行。
        </div>
      );
    }

    const hasTodos = PROJECT_TODO_CATEGORIES.some((category) => todoGroups[category].length > 0);
    if (!hasTodos) {
      return (
        <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/45 dark:bg-black/20 p-4 text-sm text-gray-500 dark:text-gray-400">
          暂无待办。你可以直接在右边告诉 OpenClaw 让它帮你创建。
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        {PROJECT_TODO_CATEGORIES.map((category) => {
          const items = todoGroups[category];
          if (items.length === 0) {
            return null;
          }

          return (
            <div
              key={category}
              className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/45 dark:bg-black/20 backdrop-blur-sm p-3"
            >
              <div className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">{category}</div>
              <div className="space-y-2">
                {items.map((todo) => (
                  <div
                    key={todo.id}
                    className="rounded-lg border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-black/25 p-3"
                  >
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{todo.text}</div>
                    <div className="mt-1 text-[13px] text-gray-600 dark:text-gray-300">{formatTodoMeta(todo)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderInsightsPanel = () => {
    if (loadingProjects) {
      return (
        <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/45 dark:bg-black/20 p-4 text-sm text-gray-500 dark:text-gray-400">
          正在加载项目洞察...
        </div>
      );
    }

    if (projectLoadFailed) {
      return (
        <div className="rounded-xl border border-amber-300/60 dark:border-amber-400/20 bg-amber-50/70 dark:bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
          项目洞察刷新失败。右侧 AI 仍然可以继续执行，稍后再拉一次就行。
        </div>
      );
    }

    if (projectInsights.totalProjects === 0) {
      return (
        <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/45 dark:bg-black/20 p-4 text-sm text-gray-500 dark:text-gray-400">
          暂无项目数据。你可以直接在右边告诉 OpenClaw 创建或更新项目。
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/55 dark:bg-black/20 p-3">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">活跃项目</div>
            <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{projectInsights.totalProjects}</div>
          </div>
          <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/55 dark:bg-black/20 p-3">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">需关注 / 有阻塞</div>
            <div className="mt-1 text-xl font-semibold text-amber-600 dark:text-amber-300">{projectInsights.attentionProjects}</div>
          </div>
          <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/55 dark:bg-black/20 p-3">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">未完成步骤</div>
            <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{projectInsights.incompleteSteps}</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/55 dark:bg-black/20 p-3">
          <div className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">重点项目</div>
          <div className="space-y-2">
            {projectInsights.topProjects.map((project) => (
              <div
                key={project.id}
                className="rounded-lg border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-black/20 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{project.name}</div>
                    {project.subtitle ? (
                      <div className="mt-0.5 truncate text-[12px] text-gray-500 dark:text-gray-400">{project.subtitle}</div>
                    ) : null}
                  </div>
                  <div className="shrink-0 rounded-full bg-gray-100 dark:bg-white/10 px-2 py-1 text-[11px] text-gray-600 dark:text-gray-300">
                    {project.status || "未标注"}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 text-[12px] text-gray-600 dark:text-gray-300">
                  <div className="truncate">
                    下一步：{project.nextAction?.trim() ? project.nextAction : "暂未填写"}
                  </div>
                  <div className="shrink-0">未完成 {project.incompleteStepCount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderStatusPanel = () => {
    const statusLabel = formatRunStatus(isProjectChatThinking, latestRunState?.outcome);

    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/55 dark:bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">当前会话状态</div>
            <div className="rounded-full bg-gray-100 dark:bg-white/10 px-2.5 py-1 text-[11px] text-gray-600 dark:text-gray-300">
              {statusLabel}
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-gray-500 dark:text-gray-400">Provider</div>
              <div className="text-right text-gray-900 dark:text-gray-100">{latestRunState?.provider || "openclaw"}</div>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="text-gray-500 dark:text-gray-400">当前会话</div>
              <div className="text-right text-gray-900 dark:text-gray-100">{activeSession?.title || "未命名会话"}</div>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="text-gray-500 dark:text-gray-400">上次动作时间</div>
              <div className="text-right text-gray-900 dark:text-gray-100">{formatExecutedAt(latestRunState?.executedAt)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/55 dark:bg-black/20 p-4">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">上次变更摘要</div>
          <div className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {latestRunState?.effectSummary || "本次无结构化变更。"}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/55 dark:bg-black/20 p-4">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">上次刷新结果</div>
          <div className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {latestRunState?.refreshSummary || "本次未触发真实面板刷新。"}
          </div>
        </div>
      </div>
    );
  };

  const renderPlaceholder = (tab: ProjectPlaceholderTab) => (
    <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/55 dark:bg-black/20 p-4">
      <div className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">{PLACEHOLDER_COPY[tab].title}</div>
      <div className="text-sm leading-6 text-gray-600 dark:text-gray-300">{PLACEHOLDER_COPY[tab].body}</div>
    </div>
  );

  const renderAssistantReceipt = (message: ProjectPanelMessage) => {
    const effectSummary = buildEffectSummary(message.effects);
    const refreshSummary = buildRefreshResultSummary(message.refreshResults);

    if (!effectSummary && !refreshSummary) {
      return null;
    }

    return (
      <div className="mt-2 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-black/20 px-3 py-2 text-[12px] leading-5 text-gray-600 dark:text-gray-300">
        {effectSummary ? (
          <div>
            <span className="font-semibold text-gray-800 dark:text-gray-100">本次变更：</span>
            {effectSummary}
          </div>
        ) : null}
        {refreshSummary ? (
          <div>
            <span className="font-semibold text-gray-800 dark:text-gray-100">刷新结果：</span>
            {refreshSummary}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="w-screen h-full bg-transparent border-l border-gray-200/40 dark:border-white/10 flex">
      <div className="w-8 shrink-0" />

      <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 px-5 py-5">
        <div className="col-span-7 min-w-0 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-transparent overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between">
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">项目任务</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-300">{getPanelBadgeCopy(projectLeftTab)}</div>
          </div>

          <div className="px-3 pt-3 pb-2 border-b border-gray-200/40 dark:border-white/10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProjectLeftTab("myTodo")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${projectLeftTab === "myTodo" ? "bg-indigo-500 text-white" : "bg-gray-100/70 dark:bg-white/10 text-gray-700 dark:text-gray-300"}`}
            >
              我的Todo
            </button>
            <button
              type="button"
              onClick={() => setProjectLeftTab("subAgents")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${projectLeftTab === "subAgents" ? "bg-indigo-500 text-white" : "bg-gray-100/70 dark:bg-white/10 text-gray-700 dark:text-gray-300"}`}
            >
              子代理任务进程
            </button>
            <button
              type="button"
              onClick={() => setProjectLeftTab("insights")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${projectLeftTab === "insights" ? "bg-indigo-500 text-white" : "bg-gray-100/70 dark:bg-white/10 text-gray-700 dark:text-gray-300"}`}
            >
              项目洞察
            </button>
            <button
              type="button"
              onClick={() => setProjectLeftTab("status")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${projectLeftTab === "status" ? "bg-indigo-500 text-white" : "bg-gray-100/70 dark:bg-white/10 text-gray-700 dark:text-gray-300"}`}
            >
              代理状态总览
            </button>
            <button
              type="button"
              onClick={() => setProjectLeftTab("git")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${projectLeftTab === "git" ? "bg-indigo-500 text-white" : "bg-gray-100/70 dark:bg-white/10 text-gray-700 dark:text-gray-300"}`}
            >
              Git 面板
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {projectLeftTab === "myTodo" && renderTodoPanel()}
            {projectLeftTab === "subAgents" && renderPlaceholder("subAgents")}
            {projectLeftTab === "insights" && renderInsightsPanel()}
            {projectLeftTab === "status" && renderStatusPanel()}
            {projectLeftTab === "git" && renderPlaceholder("git")}
          </div>
        </div>

        <div className="col-span-5 min-w-0 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-black/25 backdrop-blur-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-gray-200/50 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">项目 AI 助手</div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-300">OpenClaw 实时对话</div>
              </div>
              <button
                type="button"
                onClick={handleCreateSession}
                className="px-2.5 py-1 text-[11px] rounded-md bg-gray-100/80 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-white/20 transition-colors"
              >
                新会话
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {orderedSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => handleSelectSession(session.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-left transition-colors ${
                    projectPanelState.activeSessionId === session.id
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-100/70 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="text-xs font-semibold">{session.title}</div>
                  <div className={`text-[10px] ${projectPanelState.activeSessionId === session.id ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
                    {session.updatedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {activeMessages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[86%]">
                  <div
                    className={`px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                      message.role === "user"
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-100"
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.role === "assistant" ? renderAssistantReceipt(message) : null}
                </div>
              </div>
            ))}

            {isProjectChatThinking && (
              <div className="flex justify-start">
                <div className="max-w-[86%] px-3 py-2 rounded-xl text-sm bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                  OpenClaw 正在处理...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-200/50 dark:border-white/10 flex items-center gap-2">
            <input
              type="text"
              value={projectChatInput}
              onChange={(event) => setProjectChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleProjectChatSend();
                }
              }}
              placeholder="输入项目问题，按 Enter 发送"
              className="flex-1 min-w-0 bg-gray-100/70 dark:bg-white/10 px-3 py-2 rounded-lg text-sm outline-none border border-transparent focus:border-indigo-500/30 dark:focus:border-white/20"
            />
            <button
              type="button"
              onClick={() => void handleProjectChatSend()}
              disabled={isProjectChatThinking || !projectChatInput.trim()}
              className="px-3 py-2 rounded-lg text-sm bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkbenchProjectPanel;
