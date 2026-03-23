import test from "node:test";
import assert from "node:assert/strict";

import { getNotesWorkspaceVisualProfile } from "../src/pages/notesWorkspaceVisualState.ts";

test("focus-chat profile gives the center stage the widest column", () => {
  const profile = getNotesWorkspaceVisualProfile("focus-chat");

  assert.equal(
    profile.gridClassName,
    "xl:grid-cols-[minmax(340px,24rem)_minmax(0,1.48fr)_minmax(320px,24rem)]"
  );
  assert.equal(profile.centerTone, "hero");
});

test("focus-chat profile keeps side columns quieter than the center stage", () => {
  const profile = getNotesWorkspaceVisualProfile("focus-chat");

  assert.equal(profile.leftTone, "quiet");
  assert.equal(profile.rightTone, "quiet");
  assert.equal(profile.pageAccentLabel, "Conversation First");
});

test("focus-chat profile adds an atmospheric shell with a compact header", () => {
  const profile = getNotesWorkspaceVisualProfile("focus-chat");

  assert.match(profile.pageShellClassName, /radial-gradient\(circle_at_top_left/);
  assert.match(profile.pageShellClassName, /linear-gradient\(180deg,#151c24_0%,#0d131a_58%,#090d12_100%\)/);
  assert.match(profile.headerClassName, /rounded-\[28px\]/);
  assert.match(profile.headerClassName, /backdrop-blur-\[20px\]/);
  assert.match(profile.headerClassName, /border-white\/\[0\.1\]/);
});

test("focus-chat profile keeps note search on the same quiet-dark language", () => {
  const profile = getNotesWorkspaceVisualProfile("focus-chat");

  assert.equal(profile.searchTone, "quiet-dark");
});
