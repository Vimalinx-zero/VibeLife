import test from "node:test";
import assert from "node:assert/strict";

import {
  getCompactNoteTags,
  getNextNotesUtilityPanel,
  shouldCollapseNoteHeader,
} from "../src/pages/noteDensityState.ts";

test("getCompactNoteTags keeps only the leading visible tags and counts the overflow", () => {
  const result = getCompactNoteTags(
    [" 生物 ", "", "复习", "重要", "公式", "复习"],
    2
  );

  assert.deepEqual(result, {
    visibleTags: ["生物", "复习"],
    overflowCount: 2,
  });
});

test("shouldCollapseNoteHeader collapses only after the scroll threshold", () => {
  assert.equal(shouldCollapseNoteHeader(0), false);
  assert.equal(shouldCollapseNoteHeader(31, 32), false);
  assert.equal(shouldCollapseNoteHeader(32, 32), true);
  assert.equal(shouldCollapseNoteHeader(64, 32), true);
});

test("getNextNotesUtilityPanel toggles the requested utility panel", () => {
  assert.equal(getNextNotesUtilityPanel(null, "links"), "links");
  assert.equal(getNextNotesUtilityPanel("links", "links"), null);
  assert.equal(getNextNotesUtilityPanel("links", "tags"), "tags");
});
