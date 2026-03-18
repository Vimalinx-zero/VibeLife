import type { Todo } from "../utils/workbenchApi";

export const getWorkbenchTodoPriorityLabel = (priority: number): "高" | "中" | "低" => {
  if (priority >= 2) {
    return "高";
  }
  if (priority === 1) {
    return "中";
  }
  return "低";
};

const toSortableCreatedAt = (value: string | undefined) => value ?? "";
const toSortableCompletedAt = (value: string | null | undefined) => value ?? "";

export const splitWorkbenchProjectTodos = (
  todos: readonly Todo[]
): {
  incomplete: Todo[];
  completed: Todo[];
} => {
  const incomplete = todos
    .filter((todo) => !todo.completed)
    .sort(
      (left, right) =>
        Number(left.sort_order ?? Number.MAX_SAFE_INTEGER) - Number(right.sort_order ?? Number.MAX_SAFE_INTEGER) ||
        toSortableCreatedAt(left.created_at).localeCompare(toSortableCreatedAt(right.created_at)) ||
        left.id.localeCompare(right.id)
    );

  const completed = todos
    .filter((todo) => todo.completed)
    .sort(
      (left, right) =>
        toSortableCompletedAt(right.completed_at).localeCompare(toSortableCompletedAt(left.completed_at)) ||
        toSortableCreatedAt(right.created_at).localeCompare(toSortableCreatedAt(left.created_at)) ||
        left.id.localeCompare(right.id)
    );

  return { incomplete, completed };
};

export const normalizeWorkbenchTodoTextDraft = (
  text: string
):
  | { ok: true; text: string }
  | { ok: false; message: string } => {
  const normalized = text.trim();
  if (!normalized) {
    return {
      ok: false,
      message: "任务内容不能为空",
    };
  }
  return {
    ok: true,
    text: normalized,
  };
};

export const applyWorkbenchTodoPatch = (
  todos: readonly Todo[],
  todoId: string,
  patch: Partial<Todo>
): Todo[] =>
  todos.map((todo) => (todo.id === todoId ? { ...todo, ...patch } : todo));

export const removeWorkbenchTodo = (todos: readonly Todo[], todoId: string): Todo[] =>
  todos.filter((todo) => todo.id !== todoId);

export const reorderWorkbenchTodoList = (
  todos: readonly Todo[],
  draggedId: string,
  targetId: string
): Todo[] => {
  if (draggedId === targetId) {
    return todos.map((todo, index) => ({ ...todo, sort_order: index + 1 }));
  }

  const nextTodos = [...todos];
  const draggedIndex = nextTodos.findIndex((todo) => todo.id === draggedId);
  const targetIndex = nextTodos.findIndex((todo) => todo.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1) {
    return todos.map((todo, index) => ({ ...todo, sort_order: index + 1 }));
  }

  const [draggedTodo] = nextTodos.splice(draggedIndex, 1);
  nextTodos.splice(targetIndex, 0, draggedTodo);

  return nextTodos.map((todo, index) => ({
    ...todo,
    sort_order: index + 1,
  }));
};

export const completeWorkbenchTodo = (
  incomplete: readonly Todo[],
  completed: readonly Todo[],
  todoId: string,
  completedAt: string
): {
  incomplete: Todo[];
  completed: Todo[];
} => {
  const target = incomplete.find((todo) => todo.id === todoId);
  if (!target) {
    return {
      incomplete: [...incomplete],
      completed: [...completed],
    };
  }

  const nextIncomplete = removeWorkbenchTodo(incomplete, todoId).map((todo, index) => ({
    ...todo,
    sort_order: index + 1,
  }));
  const nextCompleted = splitWorkbenchProjectTodos([
    { ...target, completed: true, completed_at: completedAt },
    ...completed,
  ]).completed;

  return {
    incomplete: nextIncomplete,
    completed: nextCompleted,
  };
};
