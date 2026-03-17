import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import * as workbenchApi from "../utils/workbenchApi";
import { Todo } from "../utils/workbenchApi";
import {
  getTodayTodosVariantConfig,
  type TodayTodosVariant,
} from "./todayTodosConfig";
import {
  createTodayTodoInlineEdit,
  clearTodayTodoInlineEdit,
  normalizeTodayTodoInlineEditDraft,
  type TodayTodoInlineEditDraft,
} from "./todayTodosInlineEdit";

const Icons = {
  Plus: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 11-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 00-1.498-.058l-.347 9a.75.75 0 101.5.058l.345-9z" clipRule="evenodd" /></svg>,
};

const PRIORITIES = {
  high: { label: '高', value: 'high', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  medium: { label: '中', value: 'medium', color: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  low: { label: '低', value: 'low', color: 'text-green-500 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' }
};

const convertPriority = (priority: number): keyof typeof PRIORITIES => {
  if (priority >= 2) return 'high';
  if (priority === 1) return 'medium';
  return 'low';
};

/**
 * TodayTodos - 今日待办（精简版，用于Dashboard）
 */
interface TodayTodosProps {
  title?: string;
  description?: string;
  inputPlaceholder?: string;
  maxVisible?: number;
  variant?: TodayTodosVariant;
}

const TodayTodos = ({
  title = "今日待办",
  description,
  inputPlaceholder,
  maxVisible,
  variant = "dashboard",
}: TodayTodosProps) => {
  const toast = useToast();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<keyof typeof PRIORITIES>('medium');
  const [isLoading, setIsLoading] = useState(true);
  const [editingTodo, setEditingTodo] = useState<TodayTodoInlineEditDraft | null>(null);
  const [isUpdatingTodo, setIsUpdatingTodo] = useState(false);
  const variantConfig = getTodayTodosVariantConfig(variant);
  const visibleLimit = maxVisible ?? variantConfig.maxVisible;
  const resolvedInputPlaceholder = inputPlaceholder ?? variantConfig.inputPlaceholder;
  const resolvedDescription = description ?? `完成 ${completedCount} / ${todos.length + completedCount} 个任务`;

  const loadTodos = async () => {
    try {
      setIsLoading(true);
      const data = await workbenchApi.getTodos(false);
      setTodos(data.slice(0, visibleLimit));

      const completed = await workbenchApi.getTodos(true);
      setCompletedCount(completed.length);
    } catch (error) {
      console.error('Failed to load todos:', error);
      toast.error('加载今日待办失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();

    const handleRefresh = () => {
      loadTodos();
    };

    window.addEventListener('workbench-todos-refresh', handleRefresh);
    return () => {
      window.removeEventListener('workbench-todos-refresh', handleRefresh);
    };
  }, [visibleLimit]);

  const addTask = async () => {
    if (!inputValue.trim()) return;

    try {
      const priorityMap = { low: 0, medium: 1, high: 2 };
      await workbenchApi.createTodo(
        inputValue.trim(),
        priorityMap[selectedPriority] || 1,
        'today'
      );

      // Reload todos from server
      await loadTodos();
      setInputValue("");
      toast.success('已添加任务');
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('创建任务失败');
    }
  };

  const toggleTask = async (id: string) => {
    try {
      const todo = todos.find(t => t.id === id);
      if (!todo) return;

      await workbenchApi.updateTodo(id, { completed: !todo.completed });
      await loadTodos();
      if (editingTodo?.todoId === id) {
        setEditingTodo(clearTodayTodoInlineEdit());
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
      toast.error('更新任务失败');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await workbenchApi.deleteTodo(id);
      await loadTodos();
      if (editingTodo?.todoId === id) {
        setEditingTodo(clearTodayTodoInlineEdit());
      }
      toast.info('任务已删除');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('删除任务失败');
    }
  };

  const startInlineEdit = (todo: Todo) => {
    setEditingTodo(createTodayTodoInlineEdit(todo));
  };

  const cancelInlineEdit = () => {
    if (isUpdatingTodo) {
      return;
    }

    setEditingTodo(clearTodayTodoInlineEdit());
  };

  const saveInlineEdit = async () => {
    if (!editingTodo || isUpdatingTodo) {
      return;
    }

    const normalizedDraft = normalizeTodayTodoInlineEditDraft(editingTodo);
    if (!normalizedDraft.ok) {
      toast.error(normalizedDraft.message);
      return;
    }

    try {
      setIsUpdatingTodo(true);
      await workbenchApi.updateTodo(editingTodo.todoId, { text: normalizedDraft.text });
      setEditingTodo(clearTodayTodoInlineEdit());
      await loadTodos();
      toast.success('任务已更新');
    } catch (error) {
      console.error('Failed to save task edit:', error);
      toast.error('更新任务失败');
    } finally {
      setIsUpdatingTodo(false);
    }
  };

  // Sort: By priority first, then by time
  const sortedTodos = [...todos].sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    return priorityWeight[convertPriority(b.priority)] - priorityWeight[convertPriority(a.priority)];
  });

  return (
    <div className={variant === "schedule" ? "flex h-full min-h-0 flex-col" : "flex flex-col h-full"}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold dark:text-white text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-500">{resolvedDescription}</p>
      </div>

      {/* Input Area */}
      <div className="mb-4">
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors">
            <Icons.Plus />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder={resolvedInputPlaceholder}
            className="w-full bg-gray-100/50 dark:bg-[#252525]/50 hover:bg-gray-100/80 dark:hover:bg-[#2a2a2a]/80 focus:bg-white dark:focus:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 pl-10 pr-20 py-2.5 rounded-lg outline-none transition-colors border border-transparent focus:border-indigo-500/30 dark:focus:border-white/10 text-sm"
            disabled={isLoading}
          />

          {/* Priority Selector */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as keyof typeof PRIORITIES)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded-lg bg-white/50 dark:bg-[#252525]/50 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 outline-none cursor-pointer hover:bg-white dark:hover:bg-[#2a2a2a] transition-colors"
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-1">
        {isLoading ? (
          <div className="text-center text-gray-400 dark:text-gray-600 text-sm py-8">
            加载中...
          </div>
        ) : sortedTodos.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-600 text-sm py-8">
            今天还没有任务，添加一个吧！
          </div>
        ) : (
          sortedTodos.map(todo => {
            const priority = PRIORITIES[convertPriority(todo.priority)] || PRIORITIES.medium;
            const isEditing = editingTodo?.todoId === todo.id;
            return (
              <div
                key={todo.id}
                className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {/* Checkbox Circle */}
                <button
                  onClick={() => toggleTask(todo.id)}
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                    todo.completed
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'border-gray-400 dark:border-gray-500 hover:border-indigo-500 dark:hover:border-indigo-400 bg-transparent'
                  }`}
                >
                  {todo.completed && <Icons.Check />}
                </button>

                {/* Content */}
                {isEditing ? (
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingTodo.text}
                      onChange={(event) =>
                        setEditingTodo((currentState) =>
                          currentState
                            ? {
                                ...currentState,
                                text: event.target.value,
                              }
                            : currentState
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void saveInlineEdit();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelInlineEdit();
                        }
                      }}
                      autoFocus
                      disabled={isUpdatingTodo}
                      className="flex-1 min-w-0 text-sm bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white px-2.5 py-1.5 rounded-lg outline-none border border-indigo-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => void saveInlineEdit()}
                      disabled={isUpdatingTodo}
                      className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors flex-shrink-0"
                    >
                      {isUpdatingTodo ? '保存中' : '保存'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelInlineEdit}
                      disabled={isUpdatingTodo}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex-shrink-0"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startInlineEdit(todo)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <span className={`text-sm block ${
                      todo.completed
                        ? 'text-gray-400 dark:text-gray-500 line-through decoration-gray-400 dark:decoration-gray-600'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}>
                      {todo.text}
                    </span>

                    {/* Priority Badge */}
                    {!todo.completed && (
                      <span className={`inline-block mt-0.5 text-[9px] px-1.5 py-0.5 rounded ${priority.bg} ${priority.color}`}>
                        {priority.label}
                      </span>
                    )}
                  </button>
                )}

                {/* Delete Button */}
                <button
                  onClick={() => deleteTask(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-opacity px-1 flex-shrink-0"
                >
                  <Icons.Trash />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer - View All */}
      {variantConfig.showViewAllLink && todos.length >= visibleLimit && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 text-center">
          <button
            onClick={() => window.location.href = '/workbench'}
            className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
          >
            查看全部任务 →
          </button>
        </div>
      )}
    </div>
  );
};

export default TodayTodos;
