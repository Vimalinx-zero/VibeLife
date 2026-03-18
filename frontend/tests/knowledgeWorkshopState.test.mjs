import test from "node:test";
import assert from "node:assert/strict";

import {
  buildKnowledgeCitationNavigationState,
  buildKnowledgeGeneratedEntryNavigationState,
  buildKnowledgeGeneratedSavePayload,
  collectKnowledgeWorkshopFacetOptions,
  createKnowledgeSelectionPayload,
  getKnowledgeWorkshopListTitle,
  getKnowledgeWorkshopHistoryStorageKey,
  mergeKnowledgeSourceIds,
  normalizeKnowledgeWorkshopFilters,
  parseStoredKnowledgeWorkshopState,
  serializeKnowledgeWorkshopState,
  preserveKnowledgeDiscussionStateOnSaveFailure,
  trimKnowledgeDiscussionHistory,
} from "../src/pages/knowledgeWorkshopState.ts";
import { apiClient, knowledgeWorkshopAPI, quickCaptureAPI } from "../src/utils/api.ts";

const buildMessage = (index) => ({
  role: index % 2 === 0 ? "user" : "assistant",
  content: `message-${index}`,
});

test("normalizeKnowledgeWorkshopFilters trims values and defaults to collected content", () => {
  const result = normalizeKnowledgeWorkshopFilters({
    contentKind: "unexpected",
    projectId: "  project-alpha  ",
    category: "   ",
  });

  assert.deepEqual(result, {
    contentKind: "collected",
    projectId: "project-alpha",
    category: null,
  });
});

test("getKnowledgeWorkshopListTitle maps collected and generated views", () => {
  assert.equal(getKnowledgeWorkshopListTitle("collected"), "收集内容");
  assert.equal(getKnowledgeWorkshopListTitle("generated"), "生成内容");
});

test("trimKnowledgeDiscussionHistory keeps only the newest 12 messages", () => {
  const history = Array.from({ length: 15 }, (_, index) => buildMessage(index + 1));

  const result = trimKnowledgeDiscussionHistory(history);

  assert.equal(result.length, 12);
  assert.deepEqual(
    result.map((message) => message.content),
    [
      "message-4",
      "message-5",
      "message-6",
      "message-7",
      "message-8",
      "message-9",
      "message-10",
      "message-11",
      "message-12",
      "message-13",
      "message-14",
      "message-15",
    ]
  );
});

test("mergeKnowledgeSourceIds removes blanks and duplicates while preserving order", () => {
  const result = mergeKnowledgeSourceIds(
    ["capture-1", "capture-2", "capture-1", "  "],
    ["capture-2", "capture-3", "", "capture-4"]
  );

  assert.deepEqual(result, ["capture-1", "capture-2", "capture-3", "capture-4"]);
});

test("createKnowledgeSelectionPayload includes normalized filters and selected entry ids", () => {
  const result = createKnowledgeSelectionPayload(
    {
      contentKind: "collected",
      projectId: "  project-alpha ",
      category: " research ",
    },
    [" capture-2 ", "capture-2", "", "capture-5"]
  );

  assert.deepEqual(result, {
    content_kind: "collected",
    project_id: "project-alpha",
    category: "research",
    selected_entry_ids: ["capture-2", "capture-5"],
  });
});

test("buildKnowledgeGeneratedSavePayload shapes generated-note payload from the draft and filter context", () => {
  const payload = buildKnowledgeGeneratedSavePayload({
    draft: {
      title: "  结构化总结  ",
      content_markdown: "## 结论",
      tags: ["总结", "研究", "总结", ""],
      project_id: "",
      category: "",
    },
    filters: {
      contentKind: "collected",
      projectId: " project-alpha ",
      category: " research ",
    },
    discussion: {
      mode: "selection",
      selectedEntryIds: ["capture-2", "capture-3", "capture-2"],
      sourceEntryIds: ["capture-1", "capture-2"],
      userPrompt: "帮我整理成结构化笔记",
      assistantReply: "以下是整理后的结构化草稿",
      savedAt: "2026-03-18T12:30:00.000Z",
    },
  });

  assert.deepEqual(payload, {
    title: "结构化总结",
    content_markdown: "## 结论",
    tags: ["总结", "研究"],
    project_id: "project-alpha",
    category: "research",
    source_capture_ids: ["capture-1", "capture-2", "capture-3"],
    source_filter_snapshot: {
      content_kind: "collected",
      project_id: "project-alpha",
      category: "research",
      selected_entry_ids: ["capture-2", "capture-3"],
    },
    discussion_metadata: {
      mode: "selection",
      saved_at: "2026-03-18T12:30:00.000Z",
      user_prompt_excerpt: "帮我整理成结构化笔记",
      assistant_reply_excerpt: "以下是整理后的结构化草稿",
    },
  });
});

test("buildKnowledgeCitationNavigationState jumps back to the cited entry and clears stale search state", () => {
  const result = buildKnowledgeCitationNavigationState({
    id: " capture-9 ",
    content_kind: "collected",
    project_id: " project-alpha ",
    category: " research ",
  });

  assert.deepEqual(result, {
    filters: {
      contentKind: "collected",
      projectId: "project-alpha",
      category: "research",
    },
    selectedEntryId: "capture-9",
    selectedEntryIds: ["capture-9"],
    discussionMode: "entry",
    searchQuery: "",
  });
});

test("buildKnowledgeGeneratedEntryNavigationState switches to generated content and focuses the saved result", () => {
  const result = buildKnowledgeGeneratedEntryNavigationState({
    id: " generated-4 ",
    project_id: " project-beta ",
    category: " synthesis ",
  });

  assert.deepEqual(result, {
    filters: {
      contentKind: "generated",
      projectId: "project-beta",
      category: "synthesis",
    },
    selectedEntryId: "generated-4",
    selectedEntryIds: ["generated-4"],
    discussionMode: "entry",
    searchQuery: "",
  });
});

test("preserveKnowledgeDiscussionStateOnSaveFailure keeps unsaved messages and draft intact", () => {
  const state = {
    messages: [buildMessage(1), buildMessage(2)],
    citations: [{ id: "capture-1", title: "来源 1" }],
    draft: {
      title: "待保存草稿",
      content_markdown: "# Draft",
      tags: ["总结"],
      project_id: "project-alpha",
      category: "research",
    },
    pendingAction: "create",
    saveError: null,
    isSaving: true,
  };

  const result = preserveKnowledgeDiscussionStateOnSaveFailure(state, "保存失败");

  assert.equal(result.isSaving, false);
  assert.equal(result.saveError, "保存失败");
  assert.deepEqual(result.messages, state.messages);
  assert.deepEqual(result.citations, state.citations);
  assert.deepEqual(result.draft, state.draft);
  assert.equal(result.pendingAction, "create");
});

test("collectKnowledgeWorkshopFacetOptions deduplicates and sorts project ids and categories", () => {
  const result = collectKnowledgeWorkshopFacetOptions([
    { project_id: " project-beta ", category: "写作" },
    { project_id: "project-alpha", category: "研究" },
    { project_id: "project-alpha", category: "写作" },
    { project_id: "", category: "  " },
  ]);

  assert.deepEqual(result, {
    projectIds: ["project-alpha", "project-beta"],
    categories: ["写作", "研究"],
  });
});

test("serializeKnowledgeWorkshopState and parseStoredKnowledgeWorkshopState round-trip normalized workshop history", () => {
  const serialized = serializeKnowledgeWorkshopState({
    filters: {
      contentKind: "generated",
      projectId: " project-alpha ",
      category: " 研究 ",
    },
    selectedEntryId: " generated-2 ",
    selectedEntryIds: ["generated-2", "generated-1", "generated-2", ""],
    discussionMode: "selection",
    searchQuery: " 结构化总结 ",
    messages: Array.from({ length: 14 }, (_, index) => buildMessage(index + 1)),
    citations: [
      { id: "capture-1", title: "来源 1" },
      { id: "capture-2", title: "来源 2" },
    ],
    draft: {
      title: " 总结草稿 ",
      content_markdown: "## Outline",
      tags: ["总结", "研究", "总结"],
      project_id: "",
      category: "",
    },
  });

  const parsed = parseStoredKnowledgeWorkshopState(JSON.stringify(serialized));

  assert.deepEqual(parsed.filters, {
    contentKind: "generated",
    projectId: "project-alpha",
    category: "研究",
  });
  assert.equal(parsed.selectedEntryId, "generated-2");
  assert.deepEqual(parsed.selectedEntryIds, ["generated-2", "generated-1"]);
  assert.equal(parsed.discussionMode, "selection");
  assert.equal(parsed.searchQuery, "结构化总结");
  assert.equal(parsed.messages.length, 12);
  assert.deepEqual(parsed.citations, serialized.citations);
  assert.deepEqual(parsed.draft, {
    title: "总结草稿",
    content_markdown: "## Outline",
    tags: ["总结", "研究"],
    project_id: null,
    category: null,
  });
});

test("getKnowledgeWorkshopHistoryStorageKey scopes history by user id", () => {
  assert.equal(
    getKnowledgeWorkshopHistoryStorageKey("user-42"),
    "vibelife_knowledge_workshop:user-42"
  );
  assert.equal(getKnowledgeWorkshopHistoryStorageKey(undefined), null);
});

test("knowledgeWorkshopAPI.listEntries forwards normalized knowledge filters", async () => {
  const originalGet = apiClient.get;
  let captured = null;

  apiClient.get = async (url) => {
    captured = { url };
    return {
      data: {
        captures: [],
      },
    };
  };

  try {
    await knowledgeWorkshopAPI.listEntries({
      contentKind: "generated",
      projectId: "project-alpha",
      category: "research",
    });
  } finally {
    apiClient.get = originalGet;
  }

  assert.equal(
    captured?.url,
    "/quick-capture?content_kind=generated&project_id=project-alpha&category=research"
  );
});

test("knowledgeWorkshopAPI.searchEntries forwards query and filters to the unified search route", async () => {
  const originalGet = apiClient.get;
  let captured = null;

  apiClient.get = async (url) => {
    captured = { url };
    return {
      data: {
        results: [],
      },
    };
  };

  try {
    await knowledgeWorkshopAPI.searchEntries("结构化笔记", {
      contentKind: "collected",
      projectId: "project-alpha",
      category: "research",
    });
  } finally {
    apiClient.get = originalGet;
  }

  assert.equal(
    captured?.url,
    "/quick-capture/search?query=%E7%BB%93%E6%9E%84%E5%8C%96%E7%AC%94%E8%AE%B0&content_kind=collected&project_id=project-alpha&category=research"
  );
});

test("knowledgeWorkshopAPI.discuss posts either entry or selection context", async () => {
  const originalPost = apiClient.post;
  let captured = null;

  apiClient.post = async (url, payload) => {
    captured = { url, payload };
    return {
      data: {
        reply: "已讨论",
        context_mode: "selection",
        citations: [],
        draft: null,
      },
    };
  };

  try {
    await knowledgeWorkshopAPI.discuss({
      mode: "selection",
      message: "帮我整理",
      history: [buildMessage(1)],
      selection: {
        content_kind: "collected",
        project_id: "project-alpha",
        category: "research",
        selected_entry_ids: ["capture-1", "capture-2"],
      },
    });
  } finally {
    apiClient.post = originalPost;
  }

  assert.equal(captured?.url, "/knowledge/discuss");
  assert.deepEqual(captured?.payload.selection.selected_entry_ids, ["capture-1", "capture-2"]);
});

test("knowledgeWorkshopAPI.createGeneratedNote and appendGeneratedNote hit the generated routes", async () => {
  const originalPost = apiClient.post;
  const captured = [];

  apiClient.post = async (url, payload) => {
    captured.push({ url, payload });
    return {
      data: {
        entry: {
          id: "generated-1",
          title: "生成笔记",
          source_type: "generated",
          source_uri: "",
          summary: "摘要",
          tags: ["总结"],
          project_id: "project-alpha",
          created_at: "2026-03-18T12:00:00.000Z",
          updated_at: "2026-03-18T12:30:00.000Z",
          content_kind: "generated",
          category: "research",
          normalized_markdown: "# Draft",
          source_capture_ids: ["capture-1"],
          source_filter_snapshot: null,
          discussion_metadata: null,
        },
      },
    };
  };

  const payload = {
    title: "生成笔记",
    content_markdown: "# Draft",
    tags: ["总结"],
    project_id: "project-alpha",
    category: "research",
    source_capture_ids: ["capture-1"],
    source_filter_snapshot: null,
    discussion_metadata: null,
  };

  try {
    await knowledgeWorkshopAPI.createGeneratedNote(payload);
    await knowledgeWorkshopAPI.appendGeneratedNote("generated-1", {
      content_markdown: "## More",
      tags: ["补充"],
      source_capture_ids: ["capture-2"],
      source_filter_snapshot: null,
      discussion_metadata: null,
    });
  } finally {
    apiClient.post = originalPost;
  }

  assert.deepEqual(
    captured.map((item) => item.url),
    ["/knowledge/generated", "/knowledge/generated/generated-1/append"]
  );
});

test("quickCaptureAPI.capture stays compatible for NotesPage callers", async () => {
  const originalPost = apiClient.post;
  let captured = null;

  apiClient.post = async (url, payload) => {
    captured = { url, payload };
    return {
      data: {
        success: true,
        capture: {
          id: "capture-1",
          title: "导入标题",
          source_type: "url",
          source_uri: "https://example.com",
          summary: "摘要",
          tags: [],
          project_id: null,
          created_at: "2026-03-18T10:00:00.000Z",
        },
      },
    };
  };

  try {
    await quickCaptureAPI.capture({
      source_type: "url",
      source_uri: "https://example.com",
      title: "导入标题",
    });
  } finally {
    apiClient.post = originalPost;
  }

  assert.equal(captured?.url, "/quick-capture");
  assert.deepEqual(captured?.payload, {
    source_type: "url",
    source_uri: "https://example.com",
    title: "导入标题",
  });
});
