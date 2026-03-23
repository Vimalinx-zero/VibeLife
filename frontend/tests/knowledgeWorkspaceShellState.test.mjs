import test from "node:test";
import assert from "node:assert/strict";

import {
  getKnowledgeCenterPanelState,
  getKnowledgeImportPanelMode,
  getKnowledgeImportPanelSummary,
  getKnowledgeStudioSections,
} from "../src/pages/knowledgeWorkspaceShellState.ts";

test("getKnowledgeImportPanelMode returns compact-clean when collapsed with no pending import draft", () => {
  assert.equal(
    getKnowledgeImportPanelMode({
      expanded: false,
      hasPendingTitle: false,
      hasPendingSource: false,
      hasPendingTags: false,
      hasPendingFile: false,
    }),
    "compact-clean"
  );
});

test("getKnowledgeImportPanelMode returns compact-dirty when collapsed with pending import content", () => {
  assert.equal(
    getKnowledgeImportPanelMode({
      expanded: false,
      hasPendingTitle: true,
      hasPendingSource: false,
      hasPendingTags: true,
      hasPendingFile: false,
    }),
    "compact-dirty"
  );
});

test("getKnowledgeImportPanelMode returns expanded when the import panel is open", () => {
  assert.equal(
    getKnowledgeImportPanelMode({
      expanded: true,
      hasPendingTitle: false,
      hasPendingSource: false,
      hasPendingTags: false,
      hasPendingFile: false,
    }),
    "expanded"
  );
});

test("getKnowledgeImportPanelSummary reports how many draft fields are pending while collapsed", () => {
  assert.equal(
    getKnowledgeImportPanelSummary({
      expanded: false,
      hasPendingTitle: true,
      hasPendingSource: true,
      hasPendingTags: false,
      hasPendingFile: false,
    }),
    "已暂存 2 项导入信息"
  );
});

test("getKnowledgeImportPanelSummary returns the clean helper copy when there is no pending draft", () => {
  assert.equal(
    getKnowledgeImportPanelSummary({
      expanded: false,
      hasPendingTitle: false,
      hasPendingSource: false,
      hasPendingTags: false,
      hasPendingFile: false,
    }),
    "支持文本、链接和文件导入"
  );
});

test("getKnowledgeCenterPanelState treats a selected entry as the focused notebook conversation", () => {
  assert.equal(
    getKnowledgeCenterPanelState({
      selectedEntryId: "capture-1",
      messageCount: 0,
    }),
    "focus"
  );
});

test("getKnowledgeCenterPanelState keeps the conversation stage active when chat history already exists", () => {
  assert.equal(
    getKnowledgeCenterPanelState({
      selectedEntryId: null,
      messageCount: 3,
    }),
    "focus"
  );
});

test("getKnowledgeCenterPanelState stays empty only when there is neither a selected source nor chat history", () => {
  assert.equal(
    getKnowledgeCenterPanelState({
      selectedEntryId: null,
      messageCount: 0,
    }),
    "empty"
  );
});

test("getKnowledgeStudioSections shows draft first, then outputs, then citations when all are available", () => {
  assert.deepEqual(
    getKnowledgeStudioSections({
      hasDraft: true,
      generatedCount: 4,
      citationCount: 2,
    }),
    ["draft", "outputs", "citations"]
  );
});

test("getKnowledgeStudioSections hides empty sections and keeps outputs visible as the default studio area", () => {
  assert.deepEqual(
    getKnowledgeStudioSections({
      hasDraft: false,
      generatedCount: 0,
      citationCount: 0,
    }),
    ["outputs"]
  );
});
