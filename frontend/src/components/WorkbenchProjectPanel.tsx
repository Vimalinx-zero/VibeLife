import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  aiAPI,
  projectsAPI,
  type ProjectRecordDTO,
} from "../utils/api";
import {
  deleteTodo,
  getTodos,
  reorderTodos,
  type Todo,
  updateTodo,
} from "../utils/workbenchApi";
import {
  buildProjectPanelHistory,
  buildProjectPanelSessionTitle,
  createDefaultProjectPanelState,
  createProjectPanelSession,
  getProjectPanelHistoryStorageKey,
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
import {
  applyWorkbenchTodoPatch,
  completeWorkbenchTodo,
  getWorkbenchTodoPriorityLabel,
  normalizeWorkbenchTodoTextDraft,
  removeWorkbenchTodo,
  reorderWorkbenchTodoList,
} from "./workbenchMyTodoState";

type ProjectLeftTab = "myTodo" | "subAgents" | "insights" | "status" | "git";
type ProjectPlaceholderTab = "subAgents" | "git";

const createChatId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const TODO_PRIORITY_OPTIONS = [
  { label: "高", value: 2 },
  { label: "中", value: 1 },
  { label: "低", value: 0 },
] as const;

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
  const toast = useToast();
  const [projectLeftTab, setProjectLeftTab] = useState<ProjectLeftTab>("myTodo");
  const [projectPanelState, setProjectPanelState] = useState<ProjectPanelState>(() => createDefaultProjectPanelState());
  const [projectChatInput, setProjectChatInput] = useState("");
  const [typingSessionId, setTypingSessionId] = useState<string | null>(null);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [incompleteTodos, setIncompleteTodos] = useState<Todo[]>([]);
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [todoLoadFailed, setTodoLoadFailed] = useState(false);
  const [todoActionError, setTodoActionError] = useState<string | null>(null);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState("");
  const [ignoreTodoBlurId, setIgnoreTodoBlurId] = useState<string | null>(null);
  const [busyTodoIds, setBusyTodoIds] = useState<string[]>([]);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);
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

  const markTodoBusy = (todoId: string, isBusy: boolean) => {
    setBusyTodoIds((current) => {
      const next = new Set(current);
      if (isBusy) {
        next.add(todoId);
      } else {
        next.delete(todoId);
      }
      return [...next];
    });
  };

  const loadProjectTodos = async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent || !hasLoadedTodosOnce) {
      setLoadingTodos(true);
    }

    try {
      const [nextIncompleteTodos, nextCompletedTodos] = await Promise.all([
        getTodos(false),
        getTodos(true),
      ]);
      setIncompleteTodos(nextIncompleteTodos);
      setCompletedTodos(nextCompletedTodos);
      setTodoLoadFailed(false);
      setTodoActionError(null);
      setHasLoadedTodosOnce(true);
      return {
        incomplete: nextIncompleteTodos,
        completed: nextCompletedTodos,
      };
    } catch (error) {
      console.error("Failed to load project panel todos:", error);
      setTodoLoadFailed(true);
      if (!silent) {
        setIncompleteTodos([]);
        setCompletedTodos([]);
      }
      throw error;
    } finally {
      if (!silent || !hasLoadedTodosOnce) {
        setLoadingTodos(false);
      }
    }
  };

  const startTodoEdit = (todo: Todo) => {
    if (busyTodoIds.includes(todo.id)) {
      return;
    }
    setEditingTodoId(todo.id);
    setEditingTodoText(todo.text);
    setTodoActionError(null);
  };

  const cancelTodoEdit = () => {
    setEditingTodoId(null);
    setEditingTodoText("");
  };

  const saveTodoText = async (todoId: string) => {
    if (ignoreTodoBlurId === todoId) {
      setIgnoreTodoBlurId(null);
      return;
    }

    if (editingTodoId !== todoId) {
      return;
    }

    const normalizedDraft = normalizeWorkbenchTodoTextDraft(editingTodoText);
    if (!normalizedDraft.ok) {
      setTodoActionError(normalizedDraft.message);
      toast.error(normalizedDraft.message);
      return;
    }

    const previousTodos = incompleteTodos;
    setIncompleteTodos((current) => applyWorkbenchTodoPatch(current, todoId, { text: normalizedDraft.text }));
    setTodoActionError(null);
    cancelTodoEdit();
    markTodoBusy(todoId, true);

    try {
      const updatedTodo = await updateTodo(todoId, { text: normalizedDraft.text });
      setIncompleteTodos((current) => applyWorkbenchTodoPatch(current, todoId, { text: updatedTodo.text }));
      dispatchWorkbenchTodosRefresh();
    } catch (error) {
      console.error("Failed to update todo text:", error);
      setIncompleteTodos(previousTodos);
      setEditingTodoId(todoId);
      setEditingTodoText(previousTodos.find((todo) => todo.id === todoId)?.text ?? normalizedDraft.text);
      setTodoActionError("任务文本保存失败");
      toast.error("任务文本保存失败");
    } finally {
      markTodoBusy(todoId, false);
    }
  };

  const changeTodoPriority = async (todoId: string, priority: number) => {
    const previousTodos = incompleteTodos;
    setIncompleteTodos((current) => applyWorkbenchTodoPatch(current, todoId, { priority }));
    setTodoActionError(null);
    markTodoBusy(todoId, true);

    try {
      const updatedTodo = await updateTodo(todoId, { priority });
      setIncompleteTodos((current) =>
        applyWorkbenchTodoPatch(current, todoId, { priority: updatedTodo.priority })
      );
      dispatchWorkbenchTodosRefresh();
    } catch (error) {
      console.error("Failed to update todo priority:", error);
      setIncompleteTodos(previousTodos);
      setTodoActionError("优先级更新失败");
      toast.error("优先级更新失败");
    } finally {
      markTodoBusy(todoId, false);
    }
  };

  const changeTodoDueDate = async (todoId: string, dueDate: string | null) => {
    const previousTodos = incompleteTodos;
    setIncompleteTodos((current) => applyWorkbenchTodoPatch(current, todoId, { due_date: dueDate }));
    setTodoActionError(null);
    markTodoBusy(todoId, true);

    try {
      const updatedTodo = await updateTodo(todoId, { due_date: dueDate });
      setIncompleteTodos((current) =>
        applyWorkbenchTodoPatch(current, todoId, { due_date: updatedTodo.due_date ?? null })
      );
      dispatchWorkbenchTodosRefresh();
    } catch (error) {
      console.error("Failed to update todo due date:", error);
      setIncompleteTodos(previousTodos);
      setTodoActionError("截止日期更新失败");
      toast.error("截止日期更新失败");
    } finally {
      markTodoBusy(todoId, false);
    }
  };

  const completeTodo = async (todoId: string) => {
    const previousIncompleteTodos = incompleteTodos;
    const previousCompletedTodos = completedTodos;
    const optimisticCompletedAt = new Date().toISOString();
    const nextState = completeWorkbenchTodo(
      previousIncompleteTodos,
      previousCompletedTodos,
      todoId,
      optimisticCompletedAt
    );

    setIncompleteTodos(nextState.incomplete);
    setCompletedTodos(nextState.completed);
    setTodoActionError(null);
    if (editingTodoId === todoId) {
      cancelTodoEdit();
    }
    markTodoBusy(todoId, true);

    try {
      const updatedTodo = await updateTodo(todoId, { completed: true });
      setCompletedTodos((current) =>
        current
          .map((todo) => (todo.id === todoId ? { ...todo, ...updatedTodo, completed: true } : todo))
          .sort(
            (left, right) =>
              (right.completed_at ?? "").localeCompare(left.completed_at ?? "") ||
              right.created_at.localeCompare(left.created_at)
          )
      );
      dispatchWorkbenchTodosRefresh();
      toast.success("已完成任务");
    } catch (error) {
      console.error("Failed to complete todo:", error);
      setIncompleteTodos(previousIncompleteTodos);
      setCompletedTodos(previousCompletedTodos);
      setTodoActionError("完成任务失败");
      toast.error("完成任务失败");
    } finally {
      markTodoBusy(todoId, false);
    }
  };

  const removeTodoFromPanel = async (todoId: string, completed: boolean) => {
    const previousIncompleteTodos = incompleteTodos;
    const previousCompletedTodos = completedTodos;
    if (completed) {
      setCompletedTodos((current) => removeWorkbenchTodo(current, todoId));
    } else {
      setIncompleteTodos((current) => removeWorkbenchTodo(current, todoId));
    }
    setTodoActionError(null);
    if (editingTodoId === todoId) {
      cancelTodoEdit();
    }
    markTodoBusy(todoId, true);

    try {
      await deleteTodo(todoId);
      dispatchWorkbenchTodosRefresh();
      toast.info("任务已删除");
    } catch (error) {
      console.error("Failed to delete todo:", error);
      setIncompleteTodos(previousIncompleteTodos);
      setCompletedTodos(previousCompletedTodos);
      setTodoActionError("删除任务失败");
      toast.error("删除任务失败");
    } finally {
      markTodoBusy(todoId, false);
    }
  };

  const handleTodoReorder = async (draggedId: string, targetId: string) => {
    const previousTodos = incompleteTodos;
    const nextTodos = reorderWorkbenchTodoList(previousTodos, draggedId, targetId);
    setIncompleteTodos(nextTodos);
    setTodoActionError(null);
    setDraggedTodoId(null);
    setDragOverTodoId(null);

    try {
      const reorderedTodos = await reorderTodos(nextTodos.map((todo) => todo.id));
      if (reorderedTodos.length > 0) {
        setIncompleteTodos(reorderedTodos);
      }
      dispatchWorkbenchTodosRefresh();
    } catch (error) {
      console.error("Failed to reorder todos:", error);
      setIncompleteTodos(previousTodos);
      setTodoActionError("排序保存失败");
      toast.error("排序保存失败");
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

    const hasTodos = incompleteTodos.length > 0 || completedTodos.length > 0;
    if (!hasTodos) {
      return (
        <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/45 dark:bg-black/20 p-4 text-sm text-gray-500 dark:text-gray-400">
          暂无待办。你可以直接在右边告诉 OpenClaw 让它帮你创建。
        </div>
      );
    }

    const renderTodoRow = (todo: Todo, options?: { completed?: boolean }) => {
      const isCompleted = Boolean(options?.completed);
      const isEditing = editingTodoId === todo.id;
      const isBusy = busyTodoIds.includes(todo.id);
      const isDragTarget = dragOverTodoId === todo.id;

      return (
        <div
          key={todo.id}
          draggable={!isCompleted && !isBusy}
          onDragStart={(event) => {
            if (isCompleted || isBusy) {
              return;
            }
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", todo.id);
            setDraggedTodoId(todo.id);
            setDragOverTodoId(null);
          }}
          onDragEnd={() => {
            setDraggedTodoId(null);
            setDragOverTodoId(null);
          }}
          onDragOver={(event) => {
            if (isCompleted || isBusy || !draggedTodoId || draggedTodoId === todo.id) {
              return;
            }
            event.preventDefault();
            setDragOverTodoId(todo.id);
          }}
          onDrop={(event) => {
            if (isCompleted || !draggedTodoId || draggedTodoId === todo.id) {
              return;
            }
            event.preventDefault();
            void handleTodoReorder(draggedTodoId, todo.id);
          }}
          className={`rounded-xl border px-3 py-3 transition-colors ${
            isDragTarget
              ? "border-indigo-400 bg-indigo-50/80 dark:border-indigo-300/50 dark:bg-indigo-500/10"
              : "border-gray-200/70 dark:border-white/10 bg-white/75 dark:bg-black/25"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`pt-1 text-xs ${isCompleted ? "text-gray-300 dark:text-gray-600" : "text-gray-400 dark:text-gray-500"}`}
              title={isCompleted ? "已完成任务不可拖动" : "拖动排序"}
            >
              {isCompleted ? "•" : "⋮⋮"}
            </div>

            <div className="min-w-0 flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editingTodoText}
                  onChange={(event) => setEditingTodoText(event.target.value)}
                  onBlur={() => {
                    void saveTodoText(todo.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void saveTodoText(todo.id);
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setIgnoreTodoBlurId(todo.id);
                      cancelTodoEdit();
                    }
                  }}
                  autoFocus
                  className="w-full rounded-lg border border-indigo-300/70 dark:border-white/15 bg-white dark:bg-black/30 px-3 py-2 text-sm text-gray-900 outline-none dark:text-gray-100"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!isCompleted) {
                      startTodoEdit(todo);
                    }
                  }}
                  className={`w-full text-left text-sm font-medium ${
                    isCompleted
                      ? "text-gray-500 line-through dark:text-gray-400"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {todo.text}
                </button>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={todo.priority}
                  disabled={isCompleted || isBusy}
                  onChange={(event) => {
                    void changeTodoPriority(todo.id, Number(event.target.value));
                  }}
                  className="rounded-lg border border-gray-200/80 dark:border-white/10 bg-white dark:bg-black/30 px-2 py-1 text-gray-700 outline-none dark:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {TODO_PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <span className="rounded-lg bg-gray-100 px-2 py-1 text-gray-600 dark:bg-white/10 dark:text-gray-300">
                  {getWorkbenchTodoPriorityLabel(todo.priority)}优先
                </span>

                {todo.subject && todo.subject !== "general" ? (
                  <span className="rounded-lg bg-gray-100 px-2 py-1 text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    {todo.subject}
                  </span>
                ) : null}

                <input
                  type="date"
                  value={todo.due_date ?? ""}
                  disabled={isCompleted || isBusy}
                  onChange={(event) => {
                    const nextValue = event.target.value.trim();
                    void changeTodoDueDate(todo.id, nextValue || null);
                  }}
                  className="rounded-lg border border-gray-200/80 dark:border-white/10 bg-white dark:bg-black/30 px-2 py-1 text-gray-700 outline-none dark:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <button
                  type="button"
                  disabled={isCompleted || isBusy || !todo.due_date}
                  onClick={() => {
                    void changeTodoDueDate(todo.id, null);
                  }}
                  className="rounded-lg border border-gray-200/80 dark:border-white/10 px-2 py-1 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:border-white/20 dark:hover:text-gray-100"
                >
                  清空日期
                </button>

                {isCompleted && todo.completed_at ? (
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    完成于 {todo.completed_at.slice(0, 16).replace("T", " ")}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!isCompleted ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    void completeTodo(todo.id);
                  }}
                  className="rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  完成
                </button>
              ) : null}

              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  void removeTodoFromPanel(todo.id, isCompleted);
                }}
                className="rounded-lg border border-rose-200/80 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-300/20 dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-3">
        {todoActionError ? (
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 p-3 text-sm text-rose-700 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-200">
            {todoActionError}
          </div>
        ) : null}

        <div className="rounded-xl border border-gray-200/70 bg-white/55 p-3 dark:border-white/10 dark:bg-black/20">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">未完成任务</div>
              <div className="text-[12px] text-gray-500 dark:text-gray-400">
                点击文本可直接编辑，拖动左侧把手可以排序。
              </div>
            </div>
            <div className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600 dark:bg-white/10 dark:text-gray-300">
              {incompleteTodos.length} 条
            </div>
          </div>

          {incompleteTodos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200/80 px-3 py-6 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
              当前没有未完成任务。你可以直接在右侧让 OpenClaw 帮你创建。
            </div>
          ) : (
            <div className="space-y-2">
              {incompleteTodos.map((todo) => renderTodoRow(todo))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200/70 bg-white/55 p-3 dark:border-white/10 dark:bg-black/20">
          <button
            type="button"
            onClick={() => setIsCompletedExpanded((current) => !current)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">已完成任务</div>
              <div className="text-[12px] text-gray-500 dark:text-gray-400">默认收起，避免打断当前工作。</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600 dark:bg-white/10 dark:text-gray-300">
                {completedTodos.length} 条
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isCompletedExpanded ? "收起" : "展开"}
              </span>
            </div>
          </button>

          {isCompletedExpanded ? (
            completedTodos.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-gray-200/80 px-3 py-5 text-center text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                暂无已完成任务。
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {completedTodos.map((todo) => renderTodoRow(todo, { completed: true }))}
              </div>
            )
          ) : null}
        </div>
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
