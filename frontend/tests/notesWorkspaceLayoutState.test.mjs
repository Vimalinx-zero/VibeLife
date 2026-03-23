import test from "node:test";
import assert from "node:assert/strict";

import {
  getNotesLeftPaneState,
  getNotesChatChromeState,
  getNotesRightPaneState,
  getNotesWorkspaceGridClassName,
} from "../src/pages/notesWorkspaceLayoutState.ts";

test("notes left pane switches to full preview mode when a file is active", () => {
  assert.deepEqual(
    getNotesLeftPaneState({
      hasActiveFile: true,
    }),
    {
      containerClassName: "flex h-full min-h-0 flex-col",
      mode: "preview",
      previewPanelClassName: "h-full",
      showBackButton: true,
      showExplorer: false,
      showPreview: true,
    }
  );
});

test("notes left pane keeps explorer mode for folders", () => {
  assert.deepEqual(
    getNotesLeftPaneState({
      hasActiveFile: false,
    }),
    {
      containerClassName: "flex h-full min-h-0 flex-col",
      mode: "explorer",
      previewPanelClassName: "",
      showBackButton: false,
      showExplorer: true,
      showPreview: false,
    }
  );
});

test("notes chat chrome removes the old title header and keeps only location meta", () => {
  assert.deepEqual(getNotesChatChromeState(), {
    showTitleHeader: false,
    showLocationMeta: true,
  });
});

test("notes workspace widens the left pane when a file preview is active", () => {
  assert.equal(
    getNotesWorkspaceGridClassName({
      hasActiveFile: true,
      rightPaneCollapsed: false,
    }),
    "xl:grid-cols-[minmax(425px,30rem)_minmax(0,1.36fr)_minmax(320px,24rem)]"
  );
});

test("notes workspace shrinks the right pane into a slim rail when collapsed", () => {
  assert.equal(
    getNotesWorkspaceGridClassName({
      hasActiveFile: false,
      rightPaneCollapsed: true,
    }),
    "xl:grid-cols-[minmax(340px,24rem)_minmax(0,1.58fr)_4.5rem]"
  );
});

test("notes right pane state exposes collapse and reopen modes", () => {
  assert.deepEqual(getNotesRightPaneState({ collapsed: false }), {
    actionLabel: "收起右栏",
    railClassName: "hidden",
    showCollapsedRail: false,
    showPanel: true,
  });

  assert.deepEqual(getNotesRightPaneState({ collapsed: true }), {
    actionLabel: "展开右栏",
    railClassName:
      "flex h-full min-h-0 w-full flex-col items-center justify-start rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(19,24,30,0.84),rgba(12,16,22,0.8))] px-2 py-4 text-slate-200 shadow-[0_28px_72px_rgba(15,23,42,0.24)] backdrop-blur-[22px]",
    showCollapsedRail: true,
    showPanel: false,
  });
});
