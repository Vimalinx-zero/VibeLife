import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNotesKnowledgeContext,
  buildNotesPreviewDocument,
} from "../src/pages/notesKnowledgeWorkspaceState.ts";

test("buildNotesKnowledgeContext returns entry mode for a selected file", () => {
  const result = buildNotesKnowledgeContext({
    selectedNode: {
      id: "note-1",
      type: "file",
      name: "化学笔记.md",
      content: "# 化学\n\n原子结构整理",
    },
    visibleItems: [],
  });

  assert.deepEqual(result, {
    mode: "entry",
    selectedEntryId: "note-1",
    selectedEntryIds: ["note-1"],
  });
});

test("buildNotesKnowledgeContext returns selection mode for a folder with child files", () => {
  const result = buildNotesKnowledgeContext({
    selectedNode: {
      id: "folder-1",
      type: "folder",
      name: "生物",
    },
    visibleItems: [
      { id: "note-2", type: "file", name: "细胞.md" },
      { id: "folder-2", type: "folder", name: "资料" },
      { id: "note-3", type: "file", name: "遗传.md" },
    ],
  });

  assert.deepEqual(result, {
    mode: "selection",
    selectedEntryId: null,
    selectedEntryIds: ["note-2", "note-3"],
  });
});

test("buildNotesKnowledgeContext stays empty for a folder without child files", () => {
  const result = buildNotesKnowledgeContext({
    selectedNode: {
      id: "folder-empty",
      type: "folder",
      name: "空文件夹",
    },
    visibleItems: [{ id: "folder-2", type: "folder", name: "子目录" }],
  });

  assert.deepEqual(result, {
    mode: "selection",
    selectedEntryId: null,
    selectedEntryIds: [],
  });
});

test("buildNotesPreviewDocument returns the selected file content as a read-only preview", () => {
  const result = buildNotesPreviewDocument({
    selectedNode: {
      id: "note-1",
      type: "file",
      name: "英语复盘.md",
      content: "# 英语\n\n今天背诵两遍。",
    },
  });

  assert.deepEqual(result, {
    title: "英语复盘.md",
    content: "# 英语\n\n今天背诵两遍。",
    empty: false,
  });
});

test("buildNotesPreviewDocument falls back safely when a file has no content", () => {
  const result = buildNotesPreviewDocument({
    selectedNode: {
      id: "note-blank",
      type: "file",
      name: "空白笔记.md",
      content: "   ",
    },
  });

  assert.deepEqual(result, {
    title: "空白笔记.md",
    content: "",
    empty: true,
  });
});

test("buildNotesPreviewDocument does not treat folders as previewable documents", () => {
  const result = buildNotesPreviewDocument({
    selectedNode: {
      id: "folder-1",
      type: "folder",
      name: "数学",
    },
  });

  assert.deepEqual(result, {
    title: "数学",
    content: "",
    empty: true,
  });
});
