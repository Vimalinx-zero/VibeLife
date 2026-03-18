import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEffectSummary,
  buildRefreshResultSummary,
  deriveProjectInsights,
  getLatestAssistantRunState,
} from "../src/pages/workbenchProjectPanelEffectsState.ts";

test("getLatestAssistantRunState ignores old messages without metadata and uses latest assistant run", () => {
  const result = getLatestAssistantRunState([
    {
      id: "m-1",
      role: "assistant",
      content: "旧欢迎词",
      timestamp: new Date("2026-03-18T09:00:00.000Z"),
    },
    {
      id: "m-2",
      role: "user",
      content: "帮我整理项目",
      timestamp: new Date("2026-03-18T09:01:00.000Z"),
    },
    {
      id: "m-3",
      role: "assistant",
      content: "已创建 1 条待办",
      timestamp: new Date("2026-03-18T09:02:00.000Z"),
      effects: [{ entity: "todo", action: "create", count: 1, summary: "创建待办 1 条" }],
      refreshHints: ["todo"],
      refreshResults: [{ target: "todo", success: true, label: "我的Todo" }],
      runMeta: { executedAt: "2026-03-18T09:02:00.000Z", outcome: "success" },
      provider: "openclaw",
    },
  ]);

  assert.equal(result.provider, "openclaw");
  assert.equal(result.outcome, "success");
  assert.equal(result.effectSummary, "创建待办 1 条");
  assert.equal(result.refreshSummary, "我的Todo 已刷新");
});

test("buildEffectSummary joins effect summaries in order", () => {
  const result = buildEffectSummary([
    { entity: "todo", action: "create", count: 2, summary: "创建待办 2 条" },
    { entity: "project", action: "update", count: 1, summary: "更新项目 1 个" },
  ]);

  assert.equal(result, "创建待办 2 条，更新项目 1 个");
});

test("buildRefreshResultSummary reports actual refresh outcomes instead of attempted ones", () => {
  const result = buildRefreshResultSummary([
    { target: "todo", success: true, label: "我的Todo" },
    { target: "insights", success: false, label: "项目洞察" },
  ]);

  assert.equal(result, "我的Todo 已刷新，项目洞察 刷新失败");
});

test("deriveProjectInsights computes counts and sorts top projects by approved priority rules", () => {
  const summary = deriveProjectInsights([
    {
      id: "project-a",
      name: "A",
      category: "work",
      subtitle: "",
      status: "正常推进",
      nextAction: "",
      createdAt: "2026-03-18T08:00:00.000Z",
      updatedAt: "2026-03-18T09:00:00.000Z",
      steps: [
        { id: "a-1", title: "done", owner: "", due: "", done: true },
        { id: "a-2", title: "todo", owner: "", due: "", done: false },
      ],
      resources: [],
      emails: [],
    },
    {
      id: "project-b",
      name: "B",
      category: "work",
      subtitle: "",
      status: "需关注",
      nextAction: "先处理阻塞",
      createdAt: "2026-03-18T07:00:00.000Z",
      updatedAt: "2026-03-18T09:30:00.000Z",
      steps: [
        { id: "b-1", title: "todo", owner: "", due: "", done: false },
        { id: "b-2", title: "todo", owner: "", due: "", done: false },
      ],
      resources: [],
      emails: [],
    },
    {
      id: "project-c",
      name: "C",
      category: "growth",
      subtitle: "",
      status: "有阻塞",
      nextAction: "联系外部同学",
      createdAt: "2026-03-18T06:00:00.000Z",
      updatedAt: "2026-03-18T08:30:00.000Z",
      steps: [{ id: "c-1", title: "todo", owner: "", due: "", done: false }],
      resources: [],
      emails: [],
    },
  ]);

  assert.equal(summary.totalProjects, 3);
  assert.equal(summary.attentionProjects, 2);
  assert.equal(summary.incompleteSteps, 4);
  assert.deepEqual(
    summary.topProjects.map((project) => project.id),
    ["project-c", "project-b", "project-a"]
  );
  assert.equal(summary.topProjects[0].incompleteStepCount, 1);
});

