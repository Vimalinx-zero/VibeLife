import test from "node:test";
import assert from "node:assert/strict";

import {
  applyWorkbenchTodoPatch,
  completeWorkbenchTodo,
  getWorkbenchTodoPriorityLabel,
  normalizeWorkbenchTodoTextDraft,
  removeWorkbenchTodo,
  reorderWorkbenchTodoList,
  splitWorkbenchProjectTodos,
} from "../src/components/workbenchMyTodoState.ts";

const buildTodo = (overrides = {}) => ({
  id: "todo-1",
  text: "默认任务",
  completed: false,
  priority: 1,
  subject: "general",
  due_date: null,
  created_at: "2026-03-18T09:00:00.000Z",
  completed_at: null,
  sort_order: 1,
  ...overrides,
});

test("splitWorkbenchProjectTodos returns incomplete and completed in approved order", () => {
  const result = splitWorkbenchProjectTodos([
    buildTodo({ id: "todo-c", text: "c", sort_order: 3, created_at: "2026-03-18T09:30:00.000Z" }),
    buildTodo({ id: "todo-a", text: "a", sort_order: 1, created_at: "2026-03-18T09:10:00.000Z" }),
    buildTodo({
      id: "todo-done-old",
      text: "done old",
      completed: true,
      completed_at: "2026-03-18T10:00:00.000Z",
      created_at: "2026-03-18T08:00:00.000Z",
    }),
    buildTodo({
      id: "todo-done-new",
      text: "done new",
      completed: true,
      completed_at: "2026-03-18T11:00:00.000Z",
      created_at: "2026-03-18T08:30:00.000Z",
    }),
    buildTodo({ id: "todo-b", text: "b", sort_order: 2, created_at: "2026-03-18T09:20:00.000Z" }),
  ]);

  assert.deepEqual(result.incomplete.map((todo) => todo.id), ["todo-a", "todo-b", "todo-c"]);
  assert.deepEqual(result.completed.map((todo) => todo.id), ["todo-done-new", "todo-done-old"]);
});

test("getWorkbenchTodoPriorityLabel keeps explicit Chinese priority labels", () => {
  assert.equal(getWorkbenchTodoPriorityLabel(2), "高");
  assert.equal(getWorkbenchTodoPriorityLabel(1), "中");
  assert.equal(getWorkbenchTodoPriorityLabel(0), "低");
});

test("normalizeWorkbenchTodoTextDraft trims text before save", () => {
  const result = normalizeWorkbenchTodoTextDraft("  重写项目任务面板  ");

  assert.deepEqual(result, {
    ok: true,
    text: "重写项目任务面板",
  });
});

test("normalizeWorkbenchTodoTextDraft rejects blank text", () => {
  const result = normalizeWorkbenchTodoTextDraft("   ");

  assert.deepEqual(result, {
    ok: false,
    message: "任务内容不能为空",
  });
});

test("applyWorkbenchTodoPatch updates one todo without mutating others", () => {
  const todos = [
    buildTodo({ id: "todo-a", text: "A" }),
    buildTodo({ id: "todo-b", text: "B", sort_order: 2 }),
  ];

  const result = applyWorkbenchTodoPatch(todos, "todo-b", { text: "B2", due_date: "2026-03-19" });

  assert.equal(result[0].text, "A");
  assert.equal(result[1].text, "B2");
  assert.equal(result[1].due_date, "2026-03-19");
  assert.notEqual(result, todos);
});

test("reorderWorkbenchTodoList moves dragged todo before target and rewrites contiguous sort_order", () => {
  const todos = [
    buildTodo({ id: "todo-a", text: "A", sort_order: 1 }),
    buildTodo({ id: "todo-b", text: "B", sort_order: 2 }),
    buildTodo({ id: "todo-c", text: "C", sort_order: 3 }),
  ];

  const result = reorderWorkbenchTodoList(todos, "todo-c", "todo-a");

  assert.deepEqual(result.map((todo) => todo.id), ["todo-c", "todo-a", "todo-b"]);
  assert.deepEqual(result.map((todo) => todo.sort_order), [1, 2, 3]);
});

test("completeWorkbenchTodo moves one todo into completed and keeps newest-first order", () => {
  const incomplete = [
    buildTodo({ id: "todo-a", text: "A", sort_order: 1 }),
    buildTodo({ id: "todo-b", text: "B", sort_order: 2 }),
  ];
  const completed = [
    buildTodo({
      id: "todo-done",
      text: "done",
      completed: true,
      completed_at: "2026-03-18T10:00:00.000Z",
    }),
  ];

  const result = completeWorkbenchTodo(incomplete, completed, "todo-b", "2026-03-18T11:00:00.000Z");

  assert.deepEqual(result.incomplete.map((todo) => todo.id), ["todo-a"]);
  assert.deepEqual(result.completed.map((todo) => todo.id), ["todo-b", "todo-done"]);
  assert.equal(result.completed[0].completed, true);
});

test("removeWorkbenchTodo removes a todo by id", () => {
  const todos = [
    buildTodo({ id: "todo-a", text: "A" }),
    buildTodo({ id: "todo-b", text: "B", sort_order: 2 }),
  ];

  const result = removeWorkbenchTodo(todos, "todo-a");

  assert.deepEqual(result.map((todo) => todo.id), ["todo-b"]);
});
