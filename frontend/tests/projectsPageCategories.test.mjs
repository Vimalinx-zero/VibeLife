import test from "node:test";
import assert from "node:assert/strict";

import {
  getProjectCategoryOrder,
  normalizeProjectCategory,
} from "../src/pages/projectsPageCategories.ts";

test("normalizeProjectCategory keeps legacy study visible instead of rewriting it", () => {
  assert.equal(normalizeProjectCategory("study"), "study");
});

test("getProjectCategoryOrder keeps known categories first and preserves extras", () => {
  const ordered = getProjectCategoryOrder([
    { category: "growth" },
    { category: "study" },
    { category: "work" },
  ]);

  assert.deepEqual(ordered, ["work", "growth", "study"]);
});
