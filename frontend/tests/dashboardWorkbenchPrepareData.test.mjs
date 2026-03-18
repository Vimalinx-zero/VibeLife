import test from "node:test";
import assert from "node:assert/strict";

import { normalizeWorkbenchPrepareData } from "../src/pages/dashboardWorkbenchPrepareData.ts";

test("normalizeWorkbenchPrepareData keeps daily plan and project digest summary", () => {
  const normalized = normalizeWorkbenchPrepareData({
    success: true,
    date_key: "2026-03-18",
    provider: "openclaw",
    coach_message: "已为今天重排 3 条待办，当前优先推进：Alpha / Beta。",
    daily_plan: {
      plan_batch_id: "plan_123",
      created_count: 3,
      skipped_count: 1,
      deleted_count: 2,
      todos: [{ id: "todo_1", text: "先补接口" }],
    },
    project_digest: {
      count: 2,
      projects: [
        {
          project_id: "project_alpha",
          name: "Alpha",
          status: "需关注",
          next_action: "先补接口",
          pending_steps: [{ id: "step_1", title: "补接口", owner: "AI", due: "03-18" }],
        },
        {
          project_id: "project_beta",
          name: "Beta",
          status: "正常推进",
          next_action: "",
          pending_steps: [],
        },
      ],
    },
  });

  assert.equal(normalized.dateKey, "2026-03-18");
  assert.equal(normalized.provider, "openclaw");
  assert.equal(normalized.coachMessage, "已为今天重排 3 条待办，当前优先推进：Alpha / Beta。");
  assert.equal(normalized.dailyPlan.createdCount, 3);
  assert.equal(normalized.dailyPlan.deletedCount, 2);
  assert.equal(normalized.projectDigest.count, 2);
  assert.equal(normalized.projectDigest.projects[0].name, "Alpha");
  assert.equal(normalized.projectDigest.projects[0].pendingSteps[0].title, "补接口");
});

test("normalizeWorkbenchPrepareData falls back safely for incomplete payloads", () => {
  const normalized = normalizeWorkbenchPrepareData({});

  assert.equal(normalized.dateKey, "");
  assert.equal(normalized.provider, "openclaw");
  assert.equal(normalized.coachMessage, "");
  assert.equal(normalized.dailyPlan.createdCount, 0);
  assert.equal(normalized.projectDigest.count, 0);
  assert.deepEqual(normalized.projectDigest.projects, []);
});
