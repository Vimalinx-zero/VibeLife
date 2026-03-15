import test from "node:test";
import assert from "node:assert/strict";

import {
  getProjectCategoryOrder,
  normalizeProjectCategory,
} from "../src/pages/projectsPageCategories.ts";

test("normalizeProjectCategory keeps custom categories and maps study to growth", () => {
  assert.equal(normalizeProjectCategory("study"), "growth");
  assert.equal(normalizeProjectCategory(" research "), "research");
  assert.equal(normalizeProjectCategory(""), "work");
});

test("getProjectCategoryOrder keeps priority categories first and preserves custom ones", () => {
  const order = getProjectCategoryOrder([
    { category: "research" },
    { category: "work" },
    { category: "personal" },
    { category: "study" },
    { category: "work" },
  ]);

  assert.deepEqual(order, ["work", "growth", "research", "personal"]);
});
