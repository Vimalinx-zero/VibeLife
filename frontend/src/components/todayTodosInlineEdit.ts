import type { Todo } from "../utils/workbenchApi";

export interface TodayTodoInlineEditDraft {
  todoId: string;
  text: string;
}

type TodayTodoEditableFields = Pick<Todo, "id" | "text">;

export const createTodayTodoInlineEdit = (
  todo: TodayTodoEditableFields
): TodayTodoInlineEditDraft => ({
  todoId: todo.id,
  text: todo.text,
});

export const clearTodayTodoInlineEdit = (): null => null;

export const normalizeTodayTodoInlineEditDraft = (
  draft: TodayTodoInlineEditDraft
):
  | {
      ok: true;
      text: string;
    }
  | {
      ok: false;
      message: string;
    } => {
  const text = draft.text.trim();
  if (!text) {
    return {
      ok: false,
      message: "任务内容不能为空",
    };
  }

  return {
    ok: true,
    text,
  };
};
