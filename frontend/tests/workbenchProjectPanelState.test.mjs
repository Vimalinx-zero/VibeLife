import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProjectPanelHistory,
  getProjectPanelHistoryStorageKey,
  groupTodosByCategory,
  parseStoredProjectPanelState,
} from "../src/pages/workbenchProjectPanelState.ts";

test("getProjectPanelHistoryStorageKey scopes history by user id", () => {
  assert.equal(getProjectPanelHistoryStorageKey("user_123"), "vibelife_workbench_project_panel:user_123");
  assert.equal(getProjectPanelHistoryStorageKey(undefined), null);
});

test("parseStoredProjectPanelState falls back safely and derives title from first user message", () => {
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const fallback = parseStoredProjectPanelState("{bad json");
    assert.equal(fallback.sessions.length, 1);
    assert.equal(fallback.activeSessionId, fallback.sessions[0].id);
    assert.equal(fallback.sessions[0].messages.length, 1);

    const parsed = parseStoredProjectPanelState(
      JSON.stringify({
        version: 1,
        activeSessionId: "session-1",
        sessions: [
          {
            id: "session-1",
            title: "",
            createdAt: "2026-03-16T10:00:00.000Z",
            updatedAt: "2026-03-16T10:05:00.000Z",
            messages: [
              {
                id: "m-1",
                role: "assistant",
                content: "已进入项目协作模式。",
                timestamp: "2026-03-16T10:00:00.000Z",
              },
              {
                id: "m-2",
                role: "user",
                content: "帮我整理今天要推进的 OpenClaw 接线工作",
                timestamp: "2026-03-16T10:01:00.000Z",
              },
            ],
          },
        ],
      })
    );

    assert.equal(parsed.activeSessionId, "session-1");
    assert.equal(parsed.sessions[0].title, "帮我整理今天要推进的 Open...");
  } finally {
    console.error = originalConsoleError;
  }
});

test("buildProjectPanelHistory keeps only the latest 10 non-empty messages", () => {
  const history = buildProjectPanelHistory(
    Array.from({ length: 12 }, (_, index) => ({
      id: `m-${index}`,
      role: index % 2 === 0 ? "assistant" : "user",
      content: index === 3 ? "   " : `message-${index}`,
      timestamp: new Date(`2026-03-16T10:${String(index).padStart(2, "0")}:00.000Z`),
    }))
  );

  assert.equal(history.length, 10);
  assert.deepEqual(history[0], { role: "user", content: "message-1" });
  assert.deepEqual(history.at(-1), { role: "user", content: "message-11" });
});

test("groupTodosByCategory filters blank todos and groups live items", () => {
  const grouped = groupTodosByCategory([
    {
      id: "todo-1",
      text: "整理 OpenClaw 项目接线",
      completed: false,
      priority: 1,
      subject: "general",
      due_date: null,
      created_at: "2026-03-16T10:00:00.000Z",
    },
    {
      id: "todo-2",
      text: "晚间复盘表达训练",
      completed: false,
      priority: 1,
      subject: "general",
      due_date: null,
      created_at: "2026-03-16T10:05:00.000Z",
    },
    {
      id: "todo-3",
      text: "   ",
      completed: false,
      priority: 1,
      subject: "general",
      due_date: null,
      created_at: "2026-03-16T10:06:00.000Z",
    },
  ]);

  assert.equal(grouped.工作.length, 1);
  assert.equal(grouped.成长.length, 1);
  assert.equal(grouped.其他.length, 0);
});
