import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
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
  type ProjectPanelState,
} from "../pages/workbenchProjectPanelState";
import {
  dispatchWorkbenchTodosRefresh,
  WORKBENCH_TODOS_REFRESH_EVENT,
} from "../utils/workbenchTodoEvents";

type ProjectLeftTab = "myTodo" | "subAgents" | "insights" | "status" | "git";

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

const PLACEHOLDER_COPY: Record<Exclude<ProjectLeftTab, "myTodo">, { title: string; body: string }> = {
  subAgents: {
    title: "子代理任务进程待接入",
    body: "这一栏后续接 OpenClaw 的真实执行链路和子任务进度。本轮先不再展示任何假运行态。",
  },
  insights: {
    title: "项目洞察待接入",
    body: "后续这里会汇总真实项目洞察、风险和下一步建议。本轮先保留明确占位，不再混入 mock 结论。",
  },
  status: {
    title: "代理状态总览待接入",
    body: "后续会接真实 OpenClaw / 子代理状态。当前这块没有稳定数据源，所以先不伪装成实时监控面板。",
  },
  git: {
    title: "Git 面板待接入",
    body: "后续单独接真实 git 状态和提交视图。本轮不再展示假的提交图和分支动作。",
  },
};

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

  const updateSessionMessages = (sessionId: string, nextMessages: ProjectPanelMessage[], updatedAt: Date) => {
    const cappedMessages = limitProjectPanelMessages(nextMessages);

    setProjectPanelState((previousState) => ({
      ...previousState,
      sessions: previousState.sessions.map((session, index) =>
        session.id === sessionId
          ? {
              ...session,
              title: buildProjectPanelSessionTitle(cappedMessages, session.title || `项目会话 ${String(index + 1).padStart(2, "0")}`),
              updatedAt,
              messages: cappedMessages,
            }
          : session
      ),
    }));
  };

  const loadProjectTodos = async () => {
    setLoadingTodos(true);
    setTodoLoadFailed(false);

    try {
      const todos = await getTodos(false);
      setTodoGroups(groupTodosByCategory(todos));
    } catch (error) {
      console.error("Failed to load project panel todos:", error);
      setTodoGroups(groupTodosByCategory([]));
      setTodoLoadFailed(true);
    } finally {
      setLoadingTodos(false);
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
    void loadProjectTodos();

    const handleTodosRefresh = () => {
      void loadProjectTodos();
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
      const response = await fetch(`${window.__VIBELIFE_API_ORIGIN__}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          provider: "openclaw",
          history: buildProjectPanelHistory(nextMessages),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          return;
        }
        throw new Error(payload?.detail || "项目 AI 请求失败");
      }

      const assistantMessage: ProjectPanelMessage = {
        id: createChatId("project_panel_ai"),
        role: "assistant",
        content:
          typeof payload?.reply === "string" && payload.reply.trim()
            ? payload.reply.trim()
            : "我这次没有拿到可用回复。",
        timestamp: new Date(),
      };

      updateSessionMessages(sessionId, [...nextMessages, assistantMessage], assistantMessage.timestamp);
      dispatchWorkbenchTodosRefresh();
    } catch (error) {
      const failureMessage: ProjectPanelMessage = {
        id: createChatId("project_panel_ai"),
        role: "assistant",
        content: `抱歉，这次没有连上 OpenClaw：${error instanceof Error ? error.message : "未知错误"}`,
        timestamp: new Date(),
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
            <div key={category} className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/45 dark:bg-black/20 backdrop-blur-sm p-3">
              <div className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">{category}</div>
              <div className="space-y-2">
                {items.map((todo) => (
                  <div key={todo.id} className="rounded-lg border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-black/25 p-3">
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

  const renderPlaceholder = (tab: Exclude<ProjectLeftTab, "myTodo">) => (
    <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/55 dark:bg-black/20 p-4">
      <div className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">{PLACEHOLDER_COPY[tab].title}</div>
      <div className="text-sm leading-6 text-gray-600 dark:text-gray-300">{PLACEHOLDER_COPY[tab].body}</div>
    </div>
  );

  return (
    <div className="w-screen h-full bg-transparent border-l border-gray-200/40 dark:border-white/10 flex">
      <div className="w-8 shrink-0" />

      <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 px-5 py-5">
        <div className="col-span-7 min-w-0 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-transparent overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between">
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">项目任务</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-300">真实 Todo 数据</div>
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
            {projectLeftTab === "insights" && renderPlaceholder("insights")}
            {projectLeftTab === "status" && renderPlaceholder("status")}
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
                <div
                  className={`max-w-[86%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-100"
                  }`}
                >
                  {message.content}
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
