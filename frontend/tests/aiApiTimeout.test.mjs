import test from "node:test";
import assert from "node:assert/strict";

import { aiAPI, apiClient } from "../src/utils/api.ts";

test("chatForProjectPanel overrides the default axios timeout for long-running AI calls", async () => {
  const originalPost = apiClient.post;
  let captured = null;

  apiClient.post = async (url, payload, config) => {
    captured = { url, payload, config };
    return {
      data: {
        success: true,
        reply: "已处理",
        provider: "openclaw",
        effects: [],
        refreshHints: [],
        runMeta: {
          executedAt: "2026-03-18T08:00:00.000Z",
          outcome: "success",
        },
      },
    };
  };

  try {
    await aiAPI.chatForProjectPanel({
      message: "帮我准备今天的工作台",
      provider: "openclaw",
      history: [{ role: "user", content: "帮我准备今天的工作台" }],
    });
  } finally {
    apiClient.post = originalPost;
  }

  assert.equal(captured?.url, "/ai/chat");
  assert.equal(captured?.config?.timeout, 180000);
});

test("prepareWorkbench overrides the default axios timeout for long-running planning calls", async () => {
  const originalPost = apiClient.post;
  let captured = null;

  apiClient.post = async (url, payload, config) => {
    captured = { url, payload, config };
    return {
      data: {
        success: true,
        date_key: "2026-03-23",
        daily_plan: {},
        project_digest: {},
        coach_message: "已准备工作台",
        provider: "openclaw",
      },
    };
  };

  try {
    await aiAPI.prepareWorkbench({
      date_key: "2026-03-23",
      max_items: 3,
    });
  } finally {
    apiClient.post = originalPost;
  }

  assert.equal(captured?.url, "/ai/workbench/prepare");
  assert.equal(captured?.config?.timeout, 180000);
});
