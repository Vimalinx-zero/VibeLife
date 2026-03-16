import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useToast } from "../context/ToastContext";
import { playClick } from "../utils/audio";
import ContextMenu from "./ContextMenu";
import * as workbenchApi from "../utils/workbenchApi";
import {
  dispatchWorkbenchTodosRefresh,
  WORKBENCH_TODOS_REFRESH_EVENT,
} from "../utils/workbenchTodoEvents";

type WorkbenchTodo = workbenchApi.Todo;

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  created_at: string;
}

interface TodoListProps {
  onTaskSelect?: (task: Todo) => void;
}

interface ContextMenuPosition {
  x: number;
  y: number;
}

const Icons = {
  Plus: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75V3a.75.75 0 01-.75-.75zM7.5 12.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v-6.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 11-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 00-1.498-.058l-.347 9a.75.75 0 101.5.058l.345-9z" clipRule="evenodd" /></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.5 2.25a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5V3a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>,
};

const PRIORITIES = {
  high: { label: "高", value: "high", color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
  medium: { label: "中", value: "medium", color: "text-yellow-500 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
  low: { label: "低", value: "low", color: "text-green-500 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" }
};

const priorityMap = { low: 0, medium: 1, high: 2 };

const convertPriority = (priority: number): "high" | "medium" | "low" => {
  if (priority >= 2) return "high";
  if (priority === 1) return "medium";
  return "low";
};

const sanitizeTodos = (items: WorkbenchTodo[]): WorkbenchTodo[] =>
  items.filter((item) => typeof item.text === "string" && item.text.trim().length > 0);

/**
 * TodoList - Microsoft To Do Style (Minimalist & Adaptive)
 * Uses the authenticated backend API as the single source of truth.
 */
const TodoList = ({ onTaskSelect }: TodoListProps) => {
  const toast = useToast();
  const [todos, setTodos] = useState<WorkbenchTodo[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<"high" | "medium" | "low">("medium");
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<WorkbenchTodo | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const todosRef = useRef<WorkbenchTodo[]>([]);

  const loadTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await workbenchApi.getTodos();
      setTodos(sanitizeTodos(data));
    } catch (error) {
      console.error("Failed to load todos:", error);
      setTodos([]);
      toast.error("加载任务失败");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);

  useEffect(() => {
    const handleClearCompleted = async () => {
      const completed = todosRef.current.filter((t) => t.completed);
      if (completed.length === 0) {
        toast.info("没有已完成的任务");
        return;
      }

      try {
        await workbenchApi.clearCompletedTodos();
        dispatchWorkbenchTodosRefresh();
        toast.success(`已清除 ${completed.length} 个已完成任务`);
      } catch (error) {
        console.error("Failed to clear completed todos:", error);
        toast.error("清除已完成任务失败");
      }
    };

    const handleClearAll = async () => {
      if (todosRef.current.length === 0) {
        toast.info("没有可清除的任务");
        return;
      }
      if (!confirm("确定要清空所有任务吗？")) {
        return;
      }

      try {
        await workbenchApi.clearAllTodos();
        dispatchWorkbenchTodosRefresh();
        toast.success("已清空所有任务");
      } catch (error) {
        console.error("Failed to clear all todos:", error);
        toast.error("清空任务失败");
      }
    };

    const handleQuickAdd = async () => {
      try {
        const text = await navigator.clipboard.readText();
        const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
        if (lines.length === 0) {
          toast.error("剪贴板为空");
          return;
        }

        await Promise.all(lines.map((line) => workbenchApi.createTodo(line, 0, "general")));
        dispatchWorkbenchTodosRefresh();
        toast.success(`已添加 ${lines.length} 个任务`);
      } catch (error) {
        console.error("Failed to quick add todos:", error);
        toast.error("无法访问剪贴板或创建任务失败");
      }
    };

    const handleClearEvent = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail === "todo") {
        handleClearAll();
      } else if (customEvent.detail === "todo-completed") {
        handleClearCompleted();
      }
    };

    const handleQuickAddEvent = () => {
      handleQuickAdd();
    };

    const handleTodosRefresh = () => {
      loadTodos();
    };

    const handleDirectAddTodo = async (event: Event) => {
      const customEvent = event as CustomEvent<{ text?: string }>;
      const text = customEvent.detail?.text?.trim();
      if (!text) {
        return;
      }

      try {
        await workbenchApi.createTodo(text, 1, "general");
        dispatchWorkbenchTodosRefresh();
      } catch (error) {
        console.error("Failed to add direct todo:", error);
        toast.error("添加任务失败");
      }
    };

    window.addEventListener("workbench-clear", handleClearEvent as EventListener);
    window.addEventListener("workbench-quick-add", handleQuickAddEvent as EventListener);
    window.addEventListener(WORKBENCH_TODOS_REFRESH_EVENT, handleTodosRefresh as EventListener);
    window.addEventListener("workbench-direct-add-todo", handleDirectAddTodo as EventListener);

    return () => {
      window.removeEventListener("workbench-clear", handleClearEvent as EventListener);
      window.removeEventListener("workbench-quick-add", handleQuickAddEvent as EventListener);
      window.removeEventListener(WORKBENCH_TODOS_REFRESH_EVENT, handleTodosRefresh as EventListener);
      window.removeEventListener("workbench-direct-add-todo", handleDirectAddTodo as EventListener);
    };
  }, [loadTodos, toast]);

  const addTask = async () => {
    const text = inputValue.trim();
    if (!text) {
      return;
    }

    playClick();
    try {
      await workbenchApi.createTodo(text, priorityMap[selectedPriority] || 1, "general");
      dispatchWorkbenchTodosRefresh();
      setInputValue("");
    } catch (error) {
      console.error("Failed to create todo:", error);
      toast.error("创建任务失败");
    }
  };

  const toggleTask = async (id: string) => {
    playClick();
    const todo = todosRef.current.find((item) => item.id === id);
    if (!todo) {
      return;
    }

    try {
      await workbenchApi.updateTodo(id, { completed: !todo.completed });
      dispatchWorkbenchTodosRefresh();
    } catch (error) {
      console.error("Failed to update todo:", error);
      toast.error("更新任务失败");
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await workbenchApi.deleteTodo(id);
      dispatchWorkbenchTodosRefresh();
      toast.info("任务已删除");
    } catch (error) {
      console.error("Failed to delete todo:", error);
      toast.error("删除任务失败");
    }
  };

  const selectTask = (task: WorkbenchTodo) => {
    if (!onTaskSelect) {
      return;
    }

    onTaskSelect({
      id: task.id,
      text: task.text,
      completed: task.completed,
      priority: convertPriority(task.priority),
      created_at: task.created_at,
    });
    toast.info(`已选择任务: ${task.text}`);
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setContextMenuTarget(null);
  };

  const handleItemContextMenu = (event: React.MouseEvent, todo: WorkbenchTodo) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY });
    setContextMenuTarget(todo);
  };

  const handleContextMenuAction = async (action: string) => {
    if (!contextMenuTarget) {
      return;
    }

    try {
      switch (action) {
        case "delete":
          await deleteTask(contextMenuTarget.id);
          break;
        case "edit":
          setEditingTask(contextMenuTarget.id);
          setEditText(contextMenuTarget.text);
          break;
        case "duplicate":
          await workbenchApi.createTodo(
            contextMenuTarget.text,
            contextMenuTarget.priority,
            contextMenuTarget.subject,
            contextMenuTarget.due_date ?? null
          );
          dispatchWorkbenchTodosRefresh();
          toast.success("任务已复制");
          break;
        case "toggleComplete":
          await toggleTask(contextMenuTarget.id);
          break;
      }
    } finally {
      closeContextMenu();
    }
  };

  const saveEdit = async () => {
    const text = editText.trim();
    if (!text) {
      toast.error("任务内容不能为空");
      return;
    }
    if (!editingTask) {
      return;
    }

    try {
      await workbenchApi.updateTodo(editingTask, { text });
      dispatchWorkbenchTodosRefresh();
      setEditingTask(null);
      setEditText("");
      toast.success("任务已更新");
    } catch (error) {
      console.error("Failed to save todo edit:", error);
      toast.error("更新任务失败");
    }
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditText("");
  };

  const sortedTodos = useMemo(() => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    return [...todos].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return priorityWeight[convertPriority(b.priority)] - priorityWeight[convertPriority(a.priority)];
    });
  }, [todos]);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <div className="relative group" onContextMenu={(event) => event.stopPropagation()}>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors">
            <Icons.Plus />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addTask()}
            placeholder="添加新任务..."
            className="w-full bg-gray-100/50 dark:bg-[#252525]/50 hover:bg-gray-100/80 dark:hover:bg-[#2a2a2a]/80 focus:bg-white dark:focus:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 pl-12 pr-24 py-4 rounded-xl outline-none transition-colors border border-transparent focus:border-indigo-500/30 dark:focus:border-white/10"
          />

          <select
            value={selectedPriority}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "high" || value === "medium" || value === "low") {
                setSelectedPriority(value);
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded-lg bg-white/50 dark:bg-[#252525]/50 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 outline-none cursor-pointer hover:bg-white dark:hover:bg-[#2a2a2a] transition-colors"
          >
            <option value="high">高优先级</option>
            <option value="medium">中优先级</option>
            <option value="low">低优先级</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
        <div className="space-y-1">
          {isLoading ? (
            <div className="text-center text-gray-400 dark:text-gray-600 text-sm mt-10">
              加载中...
            </div>
          ) : (
            sortedTodos.map((todo) => {
              const priority = PRIORITIES[convertPriority(todo.priority)] || PRIORITIES.medium;
              const isEditing = editingTask === todo.id;
              return (
                <div
                  key={todo.id}
                  data-todo-item="true"
                  onContextMenu={(event) => handleItemContextMenu(event, todo)}
                  className="group flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleTask(todo.id);
                    }}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                      todo.completed
                        ? "bg-indigo-500 border-indigo-500 text-white"
                        : "border-gray-400 dark:border-gray-500 hover:border-indigo-500 dark:hover:border-indigo-400 bg-transparent"
                    }`}
                  >
                    {todo.completed && <Icons.Check />}
                  </button>

                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2" onContextMenu={(event) => event.stopPropagation()}>
                      <input
                        type="text"
                        value={editText}
                        onChange={(event) => setEditText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void saveEdit();
                          if (event.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        className="flex-1 text-sm bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white px-2 py-1 rounded outline-none border border-indigo-500/30"
                      />
                      <button onClick={(event) => { event.stopPropagation(); void saveEdit(); }} className="text-xs text-green-500 hover:text-green-600 dark:text-green-400 px-1">✓</button>
                      <button onClick={(event) => { event.stopPropagation(); cancelEdit(); }} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                    </div>
                  ) : (
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!todo.completed) {
                          selectTask(todo);
                        }
                      }}
                    >
                      <span className={`text-sm font-medium block ${
                        todo.completed
                          ? "text-gray-400 dark:text-gray-500 line-through decoration-gray-400 dark:decoration-gray-600"
                          : "text-gray-700 dark:text-gray-200"
                      }`}>
                        {todo.text}
                      </span>

                      {!todo.completed && (
                        <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded ${priority.bg} ${priority.color}`}>
                          {priority.label}
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteTask(todo.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-opacity px-2 flex-shrink-0"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              );
            })
          )}

          {!isLoading && todos.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-600 text-sm mt-10">
              还没有任务，享受美好的一天！
            </div>
          )}
        </div>
      </div>

      <ContextMenu position={contextMenu} onClose={closeContextMenu}>
        <button
          onClick={() => void handleContextMenuAction("edit")}
          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
        >
          <Icons.Edit />
          <span>编辑任务</span>
        </button>
        <button
          onClick={() => void handleContextMenuAction("duplicate")}
          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
        >
          <Icons.Plus />
          <span>复制任务</span>
        </button>
        <button
          onClick={() => void handleContextMenuAction("toggleComplete")}
          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
        >
          <Icons.Check />
          <span>{contextMenuTarget?.completed ? "标记为未完成" : "标记为已完成"}</span>
        </button>
        <button
          onClick={() => void handleContextMenuAction("delete")}
          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-red-600 dark:text-red-400"
        >
          <Icons.Trash />
          <span>删除任务</span>
        </button>
      </ContextMenu>
    </div>
  );
};

export default TodoList;
