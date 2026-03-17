import test from "node:test";
import assert from "node:assert/strict";

import {
  clearTodayTodoInlineEdit,
  createTodayTodoInlineEdit,
  normalizeTodayTodoInlineEditDraft,
} from "../src/components/todayTodosInlineEdit.ts";

const todo = {
  id: "todo-1",
  text: "  写完今日总结  ",
  completed: false,
  priority: 1,
  subject: "today",
  due_date: null,
  created_at: "2026-03-18T10:00:00Z",
};

test("createTodayTodoInlineEdit captures the todo id and current text", () => {
  const draft = createTodayTodoInlineEdit(todo);

  assert.deepEqual(draft, {
    todoId: "todo-1",
    text: "  写完今日总结  ",
  });
});

test("normalizeTodayTodoInlineEditDraft trims outer whitespace before save", () => {
  const result = normalizeTodayTodoInlineEditDraft({
    todoId: "todo-1",
    text: "  写完今日总结  ",
  });

  assert.deepEqual(result, {
    ok: true,
    text: "写完今日总结",
  });
});

test("normalizeTodayTodoInlineEditDraft rejects blank todo text", () => {
  const result = normalizeTodayTodoInlineEditDraft({
    todoId: "todo-1",
    text: "   ",
  });

  assert.deepEqual(result, {
    ok: false,
    message: "任务内容不能为空",
  });
});

test("clearTodayTodoInlineEdit exits editing state", () => {
  assert.equal(clearTodayTodoInlineEdit(), null);
});
