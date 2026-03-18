import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProjectPanelHistory,
  getProjectPanelHistoryStorageKey,
  getLatestProjectPanelRunMessage,
  groupTodosByCategory,
  limitProjectPanelMessages,
  parseStoredProjectPanelState,
  serializeProjectPanelState,
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

test("limitProjectPanelMessages keeps only the latest 50 live messages", () => {
  const limited = limitProjectPanelMessages(
    Array.from({ length: 55 }, (_, index) => ({
      id: `m-${index}`,
      role: index % 2 === 0 ? "assistant" : "user",
      content: `message-${index}`,
      timestamp: new Date(`2026-03-16T10:${String(index % 60).padStart(2, "0")}:00.000Z`),
    }))
  );

  assert.equal(limited.length, 50);
  assert.equal(limited[0].id, "m-5");
  assert.equal(limited.at(-1).id, "m-54");
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

test("parseStoredProjectPanelState keeps optional assistant receipt metadata and remains backward-compatible", () => {
  const parsed = parseStoredProjectPanelState(
    JSON.stringify({
      version: 1,
      activeSessionId: "session-2",
      sessions: [
        {
          id: "session-1",
          messages: [
            {
              id: "legacy-1",
              role: "assistant",
              content: "旧消息",
              timestamp: "2026-03-18T08:00:00.000Z",
            },
          ],
        },
        {
          id: "session-2",
          title: "项目回执",
          createdAt: "2026-03-18T09:00:00.000Z",
          updatedAt: "2026-03-18T09:05:00.000Z",
          messages: [
            {
              id: "m-1",
              role: "assistant",
              content: "已更新项目",
              timestamp: "2026-03-18T09:05:00.000Z",
              provider: "openclaw",
              effects: [{ entity: "project", action: "update", count: 1, summary: "更新项目 1 个" }],
              refreshHints: ["insights"],
              refreshResults: [{ target: "insights", success: true, label: "项目洞察" }],
              runMeta: { executedAt: "2026-03-18T09:05:00.000Z", outcome: "success" },
            },
          ],
        },
      ],
    })
  );

  assert.equal(parsed.activeSessionId, "session-2");
  assert.equal(parsed.sessions[0].messages[0].content, "旧消息");
  assert.deepEqual(parsed.sessions[1].messages[0].effects, [
    { entity: "project", action: "update", count: 1, summary: "更新项目 1 个" },
  ]);
  assert.deepEqual(parsed.sessions[1].messages[0].refreshHints, ["insights"]);
  assert.deepEqual(parsed.sessions[1].messages[0].refreshResults, [
    { target: "insights", success: true, label: "项目洞察" },
  ]);
  assert.deepEqual(parsed.sessions[1].messages[0].runMeta, {
    executedAt: "2026-03-18T09:05:00.000Z",
    outcome: "success",
  });
});

test("serializeProjectPanelState only writes optional assistant metadata when present", () => {
  const serialized = serializeProjectPanelState({
    activeSessionId: "session-1",
    sessions: [
      {
        id: "session-1",
        title: "项目回执",
        createdAt: new Date("2026-03-18T09:00:00.000Z"),
        updatedAt: new Date("2026-03-18T09:05:00.000Z"),
        messages: [
          {
            id: "m-1",
            role: "assistant",
            content: "普通回复",
            timestamp: new Date("2026-03-18T09:01:00.000Z"),
          },
          {
            id: "m-2",
            role: "assistant",
            content: "已创建待办",
            timestamp: new Date("2026-03-18T09:05:00.000Z"),
            provider: "openclaw",
            effects: [{ entity: "todo", action: "create", count: 1, summary: "创建待办 1 条" }],
            refreshHints: ["todo"],
            refreshResults: [{ target: "todo", success: true, label: "我的Todo" }],
            runMeta: { executedAt: "2026-03-18T09:05:00.000Z", outcome: "success" },
          },
        ],
      },
    ],
  });

  assert.equal(serialized.sessions[0].messages[0].effects, undefined);
  assert.equal(serialized.sessions[0].messages[0].runMeta, undefined);
  assert.deepEqual(serialized.sessions[0].messages[1].effects, [
    { entity: "todo", action: "create", count: 1, summary: "创建待办 1 条" },
  ]);
  assert.deepEqual(serialized.sessions[0].messages[1].refreshHints, ["todo"]);
  assert.deepEqual(serialized.sessions[0].messages[1].runMeta, {
    executedAt: "2026-03-18T09:05:00.000Z",
    outcome: "success",
  });
});

test("getLatestProjectPanelRunMessage reads the latest assistant run from the active session only", () => {
  const state = parseStoredProjectPanelState(
    JSON.stringify({
      version: 1,
      activeSessionId: "session-2",
      sessions: [
        {
          id: "session-1",
          messages: [
            {
              id: "m-1",
              role: "assistant",
              content: "旧会话最近一次成功",
              timestamp: "2026-03-18T08:00:00.000Z",
              runMeta: { executedAt: "2026-03-18T08:00:00.000Z", outcome: "success" },
            },
          ],
        },
        {
          id: "session-2",
          messages: [
            {
              id: "m-2",
              role: "assistant",
              content: "当前会话最近一次部分成功",
              timestamp: "2026-03-18T09:00:00.000Z",
              runMeta: { executedAt: "2026-03-18T09:00:00.000Z", outcome: "partial" },
            },
          ],
        },
      ],
    })
  );

  const latest = getLatestProjectPanelRunMessage(state);
  assert.equal(latest?.content, "当前会话最近一次部分成功");
  assert.equal(latest?.runMeta?.outcome, "partial");
});
