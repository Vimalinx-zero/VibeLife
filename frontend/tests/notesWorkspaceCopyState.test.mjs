import test from "node:test";
import assert from "node:assert/strict";

import {
  getNotesDisplayName,
  getNotesExplorerCopy,
  getNotesPreviewCopy,
  getNotesStudioCopy,
} from "../src/pages/notesWorkspaceCopyState.ts";

test("notes preview copy stays compact and fully localized", () => {
  assert.deepEqual(getNotesPreviewCopy("file", 3), {
    chipLabel: "只读",
    helperText: "当前只在这里预览内容",
  });

  assert.deepEqual(getNotesPreviewCopy("folder", 3), {
    chipLabel: "目录范围",
    helperText: "3 个文件会进入当前对话范围",
  });
});

test("notes explorer copy removes old english labels", () => {
  assert.deepEqual(getNotesExplorerCopy(), {
    createFolderTitle: "新建文件夹",
    createNoteTitle: "新建笔记",
    upLevelLabel: "返回上一级",
    emptyLabel: "这里还没有内容",
    settingsLabel: "设置",
  });
});

test("notes studio copy uses concise section labels", () => {
  assert.deepEqual(getNotesStudioCopy(), {
    generatedLabel: "成果",
    headerCaption: "对话沉淀",
  });
});

test("notes root display name is localized", () => {
  assert.equal(getNotesDisplayName("Library"), "资料库");
  assert.equal(getNotesDisplayName("Project Atlas"), "Project Atlas");
});
