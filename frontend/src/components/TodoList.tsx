import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useToast } from "../context/ToastContext";
import { playClick } from "../utils/audio";
import ContextMenu from "./ContextMenu";

type WorkbenchTodo = {
  id: number;
  text: string;
  completed: boolean;
  priority: number;
  subject: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};
const LOCAL_TODO_KEY = 'workbench_todos';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
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
  high: { label: '高', value: 'high', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  medium: { label: '中', value: 'medium', color: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  low: { label: '低', value: 'low', color: 'text-green-500 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' }
};

/**
 * TodoList - Microsoft To Do Style (Minimalist & Adaptive)
 * Now with priorities and pomodoro tracking!
 */
const TodoList = ({ onTaskSelect }: TodoListProps) => {
  const toast = useToast();
  const [todos, setTodos] = useState<WorkbenchTodo[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<WorkbenchTodo | null>(null);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>("");
  const todosRef = useRef<WorkbenchTodo[]>([]);

  const persistTodos = useCallback((updater: WorkbenchTodo[] | ((prev: WorkbenchTodo[]) => WorkbenchTodo[])) => {
    setTodos((prev) => {
      const next = typeof updater === 'function'
        ? (updater as (prev: WorkbenchTodo[]) => WorkbenchTodo[])(prev)
        : updater;
      localStorage.setItem(LOCAL_TODO_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const createLocalTodo = useCallback((text: string, priority: number = 1): WorkbenchTodo => {
    const now = new Date().toISOString();
    const id = Date.now() + Math.floor(Math.random() * 1000);
    return {
      id,
      text,
      completed: false,
      priority,
      subject: 'general',
      due_date: null,
      created_at: now,
      updated_at: now,
    };
  }, []);

  // Convert WorkbenchTodo to Todo with priority enum
  const convertPriority = useCallback((priority: number): 'high' | 'medium' | 'low' => {
    if (priority >= 2) return 'high';
    if (priority === 1) return 'medium';
    return 'low';
  }, []);

  const priorityMap = { low: 0, medium: 1, high: 2 };

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_TODO_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as WorkbenchTodo[];
      if (Array.isArray(parsed)) {
        setTodos(parsed);
      }
    } catch (error) {
      console.error('Failed to parse local todos:', error);
    }
  }, []);

  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);

  // Handle global events from WorkbenchPage context menu
  useEffect(() => {
    const handleClearCompleted = async () => {
      const completed = todosRef.current.filter(t => t.completed);
      if (completed.length === 0) {
        toast.info('没有已完成的任务');
        return;
      }

      persistTodos((prev) => prev.filter(t => !t.completed));
      toast.success(`已清除 ${completed.length} 个已完成任务`);
    };

    const handleClearAll = async () => {
      if (todosRef.current.length === 0) {
        toast.info('没有可清除的任务');
        return;
      }
      if (confirm('确定要清空所有任务吗？')) {
        persistTodos([]);
        toast.success('已清空所有任务');
      }
    };

    const handleQuickAdd = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) {
          toast.error('剪贴板为空');
          return;
        }
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) {
          toast.error('剪贴板为空');
          return;
        }

        const createdTasks = lines.map((line) => createLocalTodo(line, 0));
        persistTodos((prev) => [...createdTasks.reverse(), ...prev]);
        toast.success(`已添加 ${createdTasks.length} 个任务`);
      } catch (e) {
        toast.error('无法访问剪贴板');
      }
    };

    const handleClearEvent = (e: CustomEvent<string>) => {
      if (e.detail === 'todo') {
        handleClearAll();
      } else if (e.detail === 'todo-completed') {
        handleClearCompleted();
      }
    };

    const handleQuickAddEvent = () => {
      handleQuickAdd();
    };

    const handleTodosRefresh = () => {
      const saved = localStorage.getItem(LOCAL_TODO_KEY);
      if (!saved) {
        persistTodos([]);
        return;
      }
      try {
        const parsed = JSON.parse(saved) as WorkbenchTodo[];
        if (Array.isArray(parsed)) {
          persistTodos(parsed);
        }
      } catch (error) {
        console.error('Failed to refresh local todos:', error);
      }
    };

    const handleDirectAddTodo = (event: Event) => {
      const customEvent = event as CustomEvent<{ text?: string }>;
      const text = customEvent.detail?.text?.trim();
      if (!text) return;

      const localTodo = createLocalTodo(text, 1);
      persistTodos((prev) => [localTodo, ...prev]);
    };

    window.addEventListener('workbench-clear', handleClearEvent as EventListener);
    window.addEventListener('workbench-quick-add', handleQuickAddEvent as EventListener);
    window.addEventListener('workbench-todos-refresh', handleTodosRefresh as EventListener);
    window.addEventListener('workbench-direct-add-todo', handleDirectAddTodo as EventListener);

    return () => {
      window.removeEventListener('workbench-clear', handleClearEvent as EventListener);
      window.removeEventListener('workbench-quick-add', handleQuickAddEvent as EventListener);
      window.removeEventListener('workbench-todos-refresh', handleTodosRefresh as EventListener);
      window.removeEventListener('workbench-direct-add-todo', handleDirectAddTodo as EventListener);
    };
  }, [toast, persistTodos, createLocalTodo]);

  const addTask = () => {
    if (!inputValue.trim()) return;
    playClick();
    const newTask = createLocalTodo(inputValue.trim(), priorityMap[selectedPriority] || 1);
    persistTodos((prev) => [newTask, ...prev]);
    setInputValue("");
  };

  const toggleTask = (id: number) => {
    playClick();
    persistTodos((prev) => prev.map((todo) =>
      todo.id === id
        ? { ...todo, completed: !todo.completed, updated_at: new Date().toISOString() }
        : todo
    ));
  };

  const deleteTask = (id: number) => {
    persistTodos((prev) => prev.filter((todo) => todo.id !== id));
    toast.info('任务已删除');
  };

  const selectTask = (task: WorkbenchTodo) => {
    if (onTaskSelect) {
      // Convert to Todo format for callback
      const todo: Todo = {
        id: task.id.toString(),
        text: task.text,
        completed: task.completed,
        priority: convertPriority(task.priority),
        created_at: task.created_at
      };
      onTaskSelect(todo);
      toast.info(`已选择任务: ${task.text}`);
    }
  };

  // Context menu handlers
  const closeContextMenu = () => {
    setContextMenu(null);
    setContextMenuTarget(null);
  };

  const handleItemContextMenu = (e: React.MouseEvent, todo: WorkbenchTodo) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
    setContextMenuTarget(todo);
  };

  const handleContextMenuAction = (action: string) => {
    if (!contextMenuTarget) return;

    switch (action) {
      case 'delete':
        deleteTask(contextMenuTarget.id);
        break;
      case 'edit':
        setEditingTask(contextMenuTarget.id);
        setEditText(contextMenuTarget.text);
        break;
      case 'duplicate': {
        const newTask: WorkbenchTodo = {
          ...contextMenuTarget,
          id: Date.now() + Math.floor(Math.random() * 1000),
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        persistTodos(prev => [newTask, ...prev]);
        toast.success('任务已复制');
        break;
      }
      case 'toggleComplete':
        toggleTask(contextMenuTarget.id);
        break;
    }
    closeContextMenu();
  };

  const saveEdit = () => {
    if (!editText.trim()) {
      toast.error('任务内容不能为空');
      return;
    }
    if (!editingTask) return;

    persistTodos((prev) => prev.map((todo) =>
      todo.id === editingTask
        ? { ...todo, text: editText.trim(), updated_at: new Date().toISOString() }
        : todo
    ));
    setEditingTask(null);
    setEditText("");
    toast.success('任务已更新');
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditText("");
  };

  // Sort: Incomplete first, then by priority
  const sortedTodos = useMemo(() => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    return [...todos].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const aPriority = convertPriority(a.priority);
      const bPriority = convertPriority(b.priority);
      return priorityWeight[bPriority] - priorityWeight[aPriority];
    });
  }, [todos, convertPriority]);

  return (
    <div className="flex flex-col h-full">

      {/* Header / Input Area (Adaptive Semi-Transparent) */}
      <div className="mb-4">
        <div className="relative group" onContextMenu={(e) => e.stopPropagation()}>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors">
            <Icons.Plus />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="添加新任务..."
            className="w-full bg-gray-100/50 dark:bg-[#252525]/50 hover:bg-gray-100/80 dark:hover:bg-[#2a2a2a]/80 focus:bg-white dark:focus:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 pl-12 pr-24 py-4 rounded-xl outline-none transition-colors border border-transparent focus:border-indigo-500/30 dark:focus:border-white/10"
          />

          {/* Priority Selector */}
          <select
            value={selectedPriority}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'high' || value === 'medium' || value === 'low') {
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

      {/* List Area */}
       <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
         <div className="space-y-1">
           {sortedTodos.map(todo => {
             const priority = PRIORITIES[convertPriority(todo.priority)] || PRIORITIES.medium;
             const isEditing = editingTask === todo.id;
            return (
              <div
                key={todo.id}
                data-todo-item="true"
                onContextMenu={(e) => handleItemContextMenu(e, todo)}
                className="group flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {/* Checkbox Circle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleTask(todo.id); }}
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                      todo.completed
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : 'border-gray-400 dark:border-gray-500 hover:border-indigo-500 dark:hover:border-indigo-400 bg-transparent'
                  }`}
                >
                  {todo.completed && <Icons.Check />}
                </button>

                {/* Content */}
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2" onContextMenu={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      className="flex-1 text-sm bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white px-2 py-1 rounded outline-none border border-indigo-500/30"
                    />
                    <button onClick={(e) => { e.stopPropagation(); saveEdit(); }} className="text-xs text-green-500 hover:text-green-600 dark:text-green-400 px-1">✓</button>
                    <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                  </div>
                ) : (
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); !todo.completed && selectTask(todo); }}
                  >
                    <span className={`text-sm font-medium block ${
                        todo.completed
                          ? 'text-gray-400 dark:text-gray-500 line-through decoration-gray-400 dark:decoration-gray-600'
                          : 'text-gray-700 dark:text-gray-200'
                    }`}>
                      {todo.text}
                    </span>

                    {/* Priority Badge */}
                    {!todo.completed && (
                      <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded ${priority.bg} ${priority.color}`}>
                        {priority.label}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTask(todo.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-opacity px-2 flex-shrink-0"
                >
                  <Icons.Trash />
                </button>
              </div>
            );
          })}

          {todos.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-600 text-sm mt-10">
              还没有任务，享受美好的一天！
            </div>
          )}
        </div>
      </div>

      {/* Context Menu for individual tasks */}
      <ContextMenu position={contextMenu} onClose={closeContextMenu}>
        <button
          onClick={() => handleContextMenuAction('edit')}
          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
        >
          <Icons.Edit />
          <span>编辑任务</span>
        </button>
        <button
          onClick={() => handleContextMenuAction('duplicate')}
          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
        >
          <Icons.Plus />
          <span>复制任务</span>
        </button>
        <button
          onClick={() => handleContextMenuAction('toggleComplete')}
          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-gray-700 dark:text-gray-300"
        >
          <Icons.Check />
          <span>{contextMenuTarget?.completed ? '标记为未完成' : '标记为已完成'}</span>
        </button>
        <button
          onClick={() => handleContextMenuAction('delete')}
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
