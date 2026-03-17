import test from "node:test";
import assert from "node:assert/strict";

import { getTodayTodosVariantConfig } from "../src/components/todayTodosConfig.ts";

test("dashboard variant keeps the existing visible count and copy", () => {
  const config = getTodayTodosVariantConfig("dashboard");

  assert.deepEqual(config, {
    maxVisible: 5,
    inputPlaceholder: "添加新任务...",
    showViewAllLink: true,
  });
});

test("schedule variant returns the schedule-panel visible count and copy", () => {
  const config = getTodayTodosVariantConfig("schedule");

  assert.deepEqual(config, {
    maxVisible: 8,
    inputPlaceholder: "添加今日待办...",
    showViewAllLink: false,
  });
});

test("unknown variant falls back to dashboard-safe defaults", () => {
  const config = getTodayTodosVariantConfig("something-else");

  assert.deepEqual(config, {
    maxVisible: 5,
    inputPlaceholder: "添加新任务...",
    showViewAllLink: true,
  });
});
