import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWorkbenchAiSuccessToast,
  getWorkbenchAiRefreshTargets,
  shouldOpenProjectsPanel,
} from "../src/pages/workbenchAiCommandState.ts";

test("buildWorkbenchAiSuccessToast prefers structured effect summary when present", () => {
  const message = buildWorkbenchAiSuccessToast({
    reply: "我已经帮你创建好了。",
    effects: [
      { entity: "todo", action: "create", count: 2, summary: "创建待办 2 条" },
      { entity: "project", action: "update", count: 1, summary: "更新项目 1 个" },
    ],
    refreshHints: ["todo", "insights"],
    runMeta: { executedAt: "2026-03-18T12:00:00.000Z", outcome: "success" },
    provider: "openclaw",
    success: true,
  });

  assert.equal(message, "AI 已处理：创建待办 2 条，更新项目 1 个");
});

test("buildWorkbenchAiSuccessToast falls back safely when no structured effect exists", () => {
  const message = buildWorkbenchAiSuccessToast({
    reply: "我已经准备好工作台了。",
    effects: [],
    refreshHints: [],
    runMeta: { executedAt: "2026-03-18T12:00:00.000Z", outcome: "success" },
    provider: "openclaw",
    success: true,
  });

  assert.equal(message, "AI 已回复");
});

test("getWorkbenchAiRefreshTargets dedupes and preserves supported refresh targets", () => {
  assert.deepEqual(
    getWorkbenchAiRefreshTargets(["todo", "insights", "todo"]),
    ["todo", "insights"]
  );
});

test("shouldOpenProjectsPanel only opens project panel for project-related refreshes", () => {
  assert.equal(shouldOpenProjectsPanel(["todo"]), false);
  assert.equal(shouldOpenProjectsPanel(["insights"]), true);
  assert.equal(shouldOpenProjectsPanel(["todo", "insights"]), true);
});
