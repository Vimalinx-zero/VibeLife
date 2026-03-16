import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCoachData } from "../src/pages/dashboardCoachData.ts";

test("normalizeCoachData reads current focus metrics", () => {
  const normalized = normalizeCoachData({
    snapshot: {
      pending_todos: 4,
      today_focus_minutes: 52,
      recent_7d_completion_rate: 71,
      recent_7d_avg_focus_minutes: 38,
    },
    adaptive: {
      level: "challenge",
      label: "拉高强度",
      focus: "先攻克难点",
      completion_rate: 66,
      avg_daily_focus_minutes: 41,
      recommended_plan_items: 2,
    },
    suggestions: [{ id: "s-1", title: "清空高优先级", reason: "", target: "/workbench", estimated_minutes: 20, subject: "general", todo_text: "清空高优先级" }],
    coach_message: "先做难的。",
  });

  assert.equal(normalized.snapshot.today_focus_minutes, 52);
  assert.equal(normalized.snapshot.recent_7d_avg_focus_minutes, 38);
  assert.equal(normalized.adaptive.avg_daily_focus_minutes, 41);
  assert.equal(normalized.adaptive.level, "challenge");
});

test("normalizeCoachData ignores retired study aliases", () => {
  const normalized = normalizeCoachData({
    snapshot: {
      pending_todos: 1,
      today_study_minutes: 90,
      recent_7d_completion_rate: 40,
      recent_7d_avg_study_minutes: 25,
    },
    adaptive: {
      level: "balanced",
      label: "稳步推进",
      focus: "先做关键项",
      completion_rate: 40,
      avg_daily_study_minutes: 19,
      recommended_plan_items: 3,
    },
  });

  assert.equal(normalized.snapshot.today_focus_minutes, 0);
  assert.equal(normalized.snapshot.recent_7d_avg_focus_minutes, 0);
  assert.equal(normalized.adaptive.avg_daily_focus_minutes, 0);
});
