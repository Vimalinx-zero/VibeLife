import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const DEFAULT_BASE_URL = "http://127.0.0.1:49174";
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_OPENCLAW_AGENT = "vibelife"
const OPENCLAW_STATE_ROOT = path.join(os.homedir(), ".openclaw")

function normalizeBaseUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_BASE_URL;
  }
  return value.trim().replace(/\/+$/, "");
}

function resolveClientConfig(api) {
  const pluginConfig = api?.pluginConfig ?? {};
  const timeoutValue =
    process.env.VIBELIFE_API_TIMEOUT_MS ??
    pluginConfig.timeoutMs ??
    DEFAULT_TIMEOUT_MS;
  const timeoutMs = Number(timeoutValue);

  return {
    baseUrl: normalizeBaseUrl(
      process.env.VIBELIFE_API_BASE_URL ?? pluginConfig.baseUrl ?? DEFAULT_BASE_URL
    ),
    authToken:
      process.env.VIBELIFE_API_TOKEN ??
      process.env.VIBELIFE_API_AUTH_TOKEN ??
      pluginConfig.authToken ??
      "",
    timeoutMs:
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : DEFAULT_TIMEOUT_MS,
  };
}

function buildUrl(baseUrl, path, query) {
  const url = new URL(path, `${baseUrl}/`);
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function summarizeErrorPayload(payload, fallbackText) {
  if (!payload || typeof payload !== "object") {
    return fallbackText;
  }
  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail.trim();
  }
  if (Array.isArray(payload.detail)) {
    return payload.detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object" && typeof item.msg === "string") {
          return item.msg;
        }
        return "";
      })
      .filter(Boolean)
      .join("; ");
  }
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }
  return fallbackText;
}

async function requestJson(api, path, options = {}) {
  const { method = "GET", body, query, requireAuth = true } = options;
  const config = resolveClientConfig(api);

  if (requireAuth && !config.authToken) {
    throw new Error(
      "VibeLife auth token missing. Set VIBELIFE_API_TOKEN or plugins.entries.vibelife.config.authToken."
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (config.authToken) {
    headers.Authorization = `Bearer ${config.authToken}`;
  }

  try {
    const response = await fetch(buildUrl(config.baseUrl, path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let payload;
    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch {
      payload = rawText;
    }

    if (!response.ok) {
      const errorText = summarizeErrorPayload(
        payload,
        typeof payload === "string" ? payload : rawText
      );
      throw new Error(`VibeLife API ${response.status}: ${errorText}`);
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("VibeLife API request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function formatToolResult(result) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
    details: { json: result },
  };
}

function createTool(definition, api) {
  return {
    name: definition.name,
    label: definition.label,
    description: definition.description,
    parameters: definition.parameters,
    async execute(_id, params) {
      const result = await definition.handler(params ?? {}, api);
      return formatToolResult(result);
    },
  };
}

function cleanObject(entries) {
  const output = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }
  return output;
}

function truncateText(value, maxChars = 12000) {
  if (typeof value !== "string") {
    return value
  }
  if (value.length <= maxChars) {
    return value
  }
  return `${value.slice(0, maxChars)}\n... [truncated ${value.length - maxChars} chars]`
}

function resolveCurrentUserId(api) {
  const pluginConfig = api?.pluginConfig ?? {}
  const userId = process.env.VIBELIFE_CURRENT_USER_ID ?? pluginConfig.currentUserId ?? ""
  return typeof userId === "string" ? userId.trim() : ""
}

function requireCurrentUserId(api) {
  const userId = resolveCurrentUserId(api)
  if (!userId) {
    throw new Error(
      "VibeLife current user id missing. Set VIBELIFE_CURRENT_USER_ID before using user-scoped study tools."
    )
  }
  return userId
}

function resolveOpenClawAgentId(api) {
  const pluginConfig = api?.pluginConfig ?? {}
  const explicitAgentId =
    process.env.VIBELIFE_OPENCLAW_AGENT_ID ?? pluginConfig.openclawAgentId ?? ""
  if (typeof explicitAgentId === "string" && explicitAgentId.trim()) {
    return explicitAgentId.trim()
  }

  const userId = resolveCurrentUserId(api)
  if (!userId) {
    return DEFAULT_OPENCLAW_AGENT
  }

  const suffix = userId
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return suffix ? `${DEFAULT_OPENCLAW_AGENT}-${suffix}` : DEFAULT_OPENCLAW_AGENT
}

function normalizeMessageText(content) {
  if (typeof content === "string") {
    return content.trim()
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => normalizeMessageText(item))
      .filter(Boolean)
      .join("\n")
      .trim()
  }
  if (!content || typeof content !== "object") {
    return ""
  }
  if (content.type === "text" && typeof content.text === "string") {
    return content.text.trim()
  }
  if (typeof content.text === "string") {
    return content.text.trim()
  }
  if (typeof content.content === "string") {
    return content.content.trim()
  }
  if (typeof content.message === "string") {
    return content.message.trim()
  }
  return ""
}

function getConversationSessionFiles(api) {
  const agentId = resolveOpenClawAgentId(api)
  const sessionsDir = path.join(OPENCLAW_STATE_ROOT, "agents", agentId, "sessions")

  if (!fs.existsSync(sessionsDir)) {
    return { agentId, sessionsDir, files: [] }
  }

  const files = fs
    .readdirSync(sessionsDir)
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => {
      const filePath = path.join(sessionsDir, name)
      const stat = fs.statSync(filePath)
      return {
        sessionId: name.replace(/\.jsonl$/i, ""),
        filePath,
        updatedAt: stat.mtime.toISOString(),
        mtimeMs: stat.mtimeMs,
      }
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs)

  return { agentId, sessionsDir, files }
}

function readConversationMessages(sessionFile) {
  const lines = fs.readFileSync(sessionFile, "utf8").split(/\r?\n/)
  const messages = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    let record
    try {
      record = JSON.parse(trimmed)
    } catch {
      continue
    }

    if (record?.type !== "message" || !record.message || typeof record.message !== "object") {
      continue
    }

    const role = typeof record.message.role === "string" ? record.message.role : ""
    if (!role) {
      continue
    }

    const text = normalizeMessageText(record.message.content)
    messages.push({
      role,
      text,
      stopReason:
        typeof record.message.stopReason === "string" ? record.message.stopReason : "",
      timestamp:
        typeof record.timestamp === "number" ? new Date(record.timestamp).toISOString() : null,
    })
  }

  return messages
}

function summarizeConversationSession(sessionFile) {
  const messages = readConversationMessages(sessionFile.filePath)
  const userMessages = messages.filter((message) => message.role === "user")
  const assistantMessages = messages.filter((message) => message.role === "assistant")

  return {
    sessionId: sessionFile.sessionId,
    updatedAt: sessionFile.updatedAt,
    messageCount: messages.length,
    userMessageCount: userMessages.length,
    lastUserMessage: userMessages.at(-1)?.text ?? "",
    lastAssistantMessage: assistantMessages.at(-1)?.text ?? "",
  }
}

function captureTmuxPane(target, lines = 160) {
  const normalizedLines =
    Number.isInteger(lines) && lines > 0 ? Math.min(lines, 2000) : 160

  try {
    return execFileSync(
      "tmux",
      ["capture-pane", "-pt", target, "-S", `-${normalizedLines}`],
      { encoding: "utf8" }
    )
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "failed to capture tmux pane"
    throw new Error(`Failed to read tmux pane ${target}: ${message}`)
  }
}

function defineTools(api) {
  return [
    createTool(
      {
        name: "vibelife_todo_list",
        label: "VibeLife Todo List",
        description: "List the current user's VibeLife todos.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            completed: { type: "boolean" },
            subject: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/workbench/todos", {
            query: cleanObject({
              completed:
                typeof params.completed === "boolean"
                  ? params.completed
                  : undefined,
              subject:
                typeof params.subject === "string" ? params.subject.trim() : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_todo_create",
        label: "VibeLife Todo Create",
        description: "Create a VibeLife todo.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["text"],
          properties: {
            text: { type: "string" },
            priority: { type: "integer" },
            subject: { type: "string" },
            dueDate: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/workbench/todos", {
            method: "POST",
            body: cleanObject({
              text: params.text,
              priority:
                Number.isInteger(params.priority) ? params.priority : undefined,
              subject:
                typeof params.subject === "string" ? params.subject.trim() : undefined,
              due_date:
                typeof params.dueDate === "string" ? params.dueDate.trim() : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_todo_update",
        label: "VibeLife Todo Update",
        description: "Update a VibeLife todo by id.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: {
            id: { type: "string" },
            text: { type: "string" },
            completed: { type: "boolean" },
            priority: { type: "integer" },
            subject: { type: "string" },
            dueDate: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, `/api/workbench/todos/${encodeURIComponent(params.id)}`, {
            method: "PUT",
            body: cleanObject({
              text: typeof params.text === "string" ? params.text : undefined,
              completed:
                typeof params.completed === "boolean"
                  ? params.completed
                  : undefined,
              priority:
                Number.isInteger(params.priority) ? params.priority : undefined,
              subject:
                typeof params.subject === "string" ? params.subject.trim() : undefined,
              due_date:
                typeof params.dueDate === "string" ? params.dueDate.trim() : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_todo_delete",
        label: "VibeLife Todo Delete",
        description: "Delete a VibeLife todo by id.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, `/api/workbench/todos/${encodeURIComponent(params.id)}`, {
            method: "DELETE",
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_todo_clear_completed",
        label: "VibeLife Todo Clear Completed",
        description: "Delete all completed VibeLife todos for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        handler: () =>
          requestJson(api, "/api/workbench/todos/completed", {
            method: "DELETE",
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_todo_clear_all",
        label: "VibeLife Todo Clear All",
        description: "Delete all VibeLife todos for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        handler: () =>
          requestJson(api, "/api/workbench/todos/all", {
            method: "DELETE",
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_workbench_stats",
        label: "VibeLife Workbench Stats",
        description: "Read current VibeLife dashboard stats, including todos, mistakes, and focus time.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        handler: () => requestJson(api, "/api/workbench/stats"),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_workbench_mistake_list",
        label: "VibeLife Workbench Mistake List",
        description: "List workbench mistakes for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            subject: { type: "string" },
            limit: { type: "integer" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/workbench/mistakes", {
            query: cleanObject({
              subject:
                typeof params.subject === "string" ? params.subject.trim() : undefined,
              limit: Number.isInteger(params.limit) ? params.limit : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_workbench_mistake_create",
        label: "VibeLife Workbench Mistake Create",
        description: "Create a workbench mistake memo.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["content", "subject"],
          properties: {
            content: { type: "string" },
            subject: { type: "string" },
            questionId: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/workbench/mistakes", {
            method: "POST",
            body: cleanObject({
              content: params.content,
              subject: params.subject,
              question_id:
                typeof params.questionId === "string" ? params.questionId.trim() : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_workbench_mistake_delete",
        label: "VibeLife Workbench Mistake Delete",
        description: "Delete a workbench mistake memo by id.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(
            api,
            `/api/workbench/mistakes/${encodeURIComponent(params.id)}`,
            {
              method: "DELETE",
            }
          ),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_workbench_mistake_clear_all",
        label: "VibeLife Workbench Mistake Clear All",
        description: "Delete all workbench mistake memos for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        handler: () =>
          requestJson(api, "/api/workbench/mistakes", {
            method: "DELETE",
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_workbench_session_create",
        label: "VibeLife Workbench Session Create",
        description: "Record a focus session in the VibeLife workbench.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["durationMinutes", "mode"],
          properties: {
            durationMinutes: { type: "integer" },
            mode: { type: "string" },
            tasksCompleted: { type: "integer" },
            mistakesCollected: { type: "integer" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/workbench/sessions", {
            method: "POST",
            body: cleanObject({
              duration_minutes: params.durationMinutes,
              mode: params.mode,
              tasks_completed:
                Number.isInteger(params.tasksCompleted)
                  ? params.tasksCompleted
                  : undefined,
              mistakes_collected:
                Number.isInteger(params.mistakesCollected)
                  ? params.mistakesCollected
                  : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_workbench_session_list",
        label: "VibeLife Workbench Session List",
        description: "List recent focus sessions from the VibeLife workbench.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            days: { type: "integer" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/workbench/sessions", {
            query: cleanObject({
              days: Number.isInteger(params.days) ? params.days : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_note_search",
        label: "VibeLife Note Search",
        description: "Search VibeLife notes and return matching content.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["query"],
          properties: {
            query: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/notes/search", {
            query: { query: params.query },
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_note_create",
        label: "VibeLife Note Create",
        description: "Create a new top-level VibeLife note.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: {
            name: { type: "string" },
            content: { type: "string" },
            parentId: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/notes/create", {
            method: "POST",
            body: {
              parent_id:
                typeof params.parentId === "string" && params.parentId.trim()
                  ? params.parentId.trim()
                  : "root",
              name: params.name,
              type: "file",
              content: typeof params.content === "string" ? params.content : "",
            },
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_note_update",
        label: "VibeLife Note Update",
        description: "Update an existing VibeLife note by id.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            content: { type: "string" },
            parentId: { type: "string" },
            autoTag: { type: "boolean" },
            tags: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/notes/save", {
            method: "POST",
            body: cleanObject({
              id: params.id,
              name: typeof params.name === "string" ? params.name : undefined,
              content:
                typeof params.content === "string" ? params.content : undefined,
              parent_id:
                typeof params.parentId === "string" ? params.parentId : undefined,
              auto_tag:
                typeof params.autoTag === "boolean" ? params.autoTag : true,
              tags: Array.isArray(params.tags) ? params.tags : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_note_view",
        label: "VibeLife Note View",
        description: "Read a VibeLife note or folder by id, including children and breadcrumbs.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/notes/view", {
            query: { id: params.id },
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_note_delete",
        label: "VibeLife Note Delete",
        description: "Delete a VibeLife note or folder by id.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/notes/delete", {
            method: "POST",
            body: {
              id: params.id,
            },
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_note_tags_list",
        label: "VibeLife Note Tags List",
        description: "List all note tags and usage counts for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        handler: () => requestJson(api, "/api/notes/tags"),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_note_by_tag",
        label: "VibeLife Note By Tag",
        description: "List notes matching a specific tag.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["tag"],
          properties: {
            tag: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/notes/by-tag", {
            query: { tag: params.tag },
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_note_tag_add",
        label: "VibeLife Note Tag Add",
        description: "Add a single tag to a note.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["fileId", "tag"],
          properties: {
            fileId: { type: "string" },
            tag: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/notes/tags/add", {
            method: "POST",
            body: {
              file_id: params.fileId,
              tag: params.tag,
            },
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_note_tag_remove",
        label: "VibeLife Note Tag Remove",
        description: "Remove a single tag from a note.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["fileId", "tag"],
          properties: {
            fileId: { type: "string" },
            tag: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/notes/tags/remove", {
            method: "POST",
            body: {
              file_id: params.fileId,
              tag: params.tag,
            },
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_note_backlinks",
        label: "VibeLife Note Backlinks",
        description: "List notes that reference the specified note.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["noteId"],
          properties: {
            noteId: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/notes/backlinks", {
            query: { note_id: params.noteId },
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_note_links",
        label: "VibeLife Note Links",
        description: "List notes linked from the specified note.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["noteId"],
          properties: {
            noteId: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/notes/links", {
            query: { note_id: params.noteId },
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_journal_list",
        label: "VibeLife Journal List",
        description: "List the current user's VibeLife journal entries.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            entryDate: { type: "string" },
            dateFrom: { type: "string" },
            dateTo: { type: "string" },
            limit: { type: "integer" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/workbench/journal", {
            query: cleanObject({
              entry_date:
                typeof params.entryDate === "string"
                  ? params.entryDate.trim()
                  : undefined,
              date_from:
                typeof params.dateFrom === "string"
                  ? params.dateFrom.trim()
                  : undefined,
              date_to:
                typeof params.dateTo === "string" ? params.dateTo.trim() : undefined,
              limit: Number.isInteger(params.limit) ? params.limit : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_journal_create",
        label: "VibeLife Journal Create",
        description: "Create a VibeLife journal entry.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["content"],
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            entryDate: { type: "string" },
            mood: { type: "string" },
            tags: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/workbench/journal", {
            method: "POST",
            body: cleanObject({
              title: typeof params.title === "string" ? params.title : undefined,
              content: params.content,
              entry_date:
                typeof params.entryDate === "string"
                  ? params.entryDate.trim()
                  : undefined,
              mood: typeof params.mood === "string" ? params.mood.trim() : undefined,
              tags: Array.isArray(params.tags) ? params.tags : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_journal_update",
        label: "VibeLife Journal Update",
        description: "Update an existing VibeLife journal entry by id.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            content: { type: "string" },
            entryDate: { type: "string" },
            mood: { type: "string" },
            tags: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        handler: (params) =>
          requestJson(
            api,
            `/api/workbench/journal/${encodeURIComponent(params.id)}`,
            {
              method: "PUT",
              body: cleanObject({
                title: typeof params.title === "string" ? params.title : undefined,
                content:
                  typeof params.content === "string" ? params.content : undefined,
                entry_date:
                  typeof params.entryDate === "string"
                    ? params.entryDate.trim()
                    : undefined,
                mood:
                  typeof params.mood === "string" ? params.mood.trim() : undefined,
                tags: Array.isArray(params.tags) ? params.tags : undefined,
              }),
            }
          ),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_schedule_list",
        label: "VibeLife Schedule List",
        description: "List VibeLife schedule events for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            year: { type: "integer" },
            month: { type: "integer" },
            dateFrom: { type: "string" },
            dateTo: { type: "string" },
            type: { type: "string" },
            limit: { type: "integer" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/workbench/schedule-events", {
            query: cleanObject({
              year: Number.isInteger(params.year) ? params.year : undefined,
              month: Number.isInteger(params.month) ? params.month : undefined,
              date_from:
                typeof params.dateFrom === "string"
                  ? params.dateFrom.trim()
                  : undefined,
              date_to:
                typeof params.dateTo === "string" ? params.dateTo.trim() : undefined,
              type: typeof params.type === "string" ? params.type.trim() : undefined,
              limit: Number.isInteger(params.limit) ? params.limit : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_schedule_create",
        label: "VibeLife Schedule Create",
        description: "Create a VibeLife schedule event.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["title"],
          properties: {
            title: { type: "string" },
            eventDate: { type: "string" },
            description: { type: "string" },
            time: { type: "string" },
            type: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/workbench/schedule-events", {
            method: "POST",
            body: cleanObject({
              title: params.title,
              event_date:
                typeof params.eventDate === "string"
                  ? params.eventDate.trim()
                  : undefined,
              description:
                typeof params.description === "string"
                  ? params.description
                  : undefined,
              time: typeof params.time === "string" ? params.time.trim() : undefined,
              type: typeof params.type === "string" ? params.type.trim() : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_schedule_update",
        label: "VibeLife Schedule Update",
        description: "Update an existing VibeLife schedule event by id.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            eventDate: { type: "string" },
            description: { type: "string" },
            time: { type: "string" },
            type: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(
            api,
            `/api/workbench/schedule-events/${encodeURIComponent(params.id)}`,
            {
              method: "PUT",
              body: cleanObject({
                title: typeof params.title === "string" ? params.title : undefined,
                event_date:
                  typeof params.eventDate === "string"
                    ? params.eventDate.trim()
                    : undefined,
                description:
                  typeof params.description === "string"
                    ? params.description
                    : undefined,
                time: typeof params.time === "string" ? params.time.trim() : undefined,
                type: typeof params.type === "string" ? params.type.trim() : undefined,
              }),
            }
          ),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_project_list",
        label: "VibeLife Project List",
        description: "List VibeLife projects with steps and resources.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            category: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/projects", {
            query: cleanObject({
              category:
                typeof params.category === "string" ? params.category.trim() : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_project_email_create",
        label: "VibeLife Project Email Create",
        description: "Attach an email summary to a VibeLife project.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["projectId", "subject"],
          properties: {
            projectId: { type: "string" },
            from: { type: "string" },
            subject: { type: "string" },
            summary: { type: "string" },
            importance: { type: "string" },
            time: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(
            api,
            `/api/projects/${encodeURIComponent(params.projectId)}/emails`,
            {
              method: "POST",
              body: cleanObject({
                from: typeof params.from === "string" ? params.from : undefined,
                subject: params.subject,
                summary:
                  typeof params.summary === "string" ? params.summary : undefined,
                importance:
                  typeof params.importance === "string"
                    ? params.importance
                    : undefined,
                time: typeof params.time === "string" ? params.time : undefined,
              }),
            }
          ),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_project_update",
        label: "VibeLife Project Update",
        description: "Update a VibeLife project by id.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            category: { type: "string" },
            subtitle: { type: "string" },
            status: { type: "string" },
            nextAction: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, `/api/projects/${encodeURIComponent(params.id)}`, {
            method: "PUT",
            body: cleanObject({
              name: typeof params.name === "string" ? params.name : undefined,
              category:
                typeof params.category === "string" ? params.category : undefined,
              subtitle:
                typeof params.subtitle === "string" ? params.subtitle : undefined,
              status: typeof params.status === "string" ? params.status : undefined,
              nextAction:
                typeof params.nextAction === "string"
                  ? params.nextAction
                  : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_project_step_create",
        label: "VibeLife Project Step Create",
        description: "Create a project step inside a VibeLife project.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["projectId", "title"],
          properties: {
            projectId: { type: "string" },
            title: { type: "string" },
            owner: { type: "string" },
            due: { type: "string" },
            done: { type: "boolean" },
          },
        },
        handler: (params) =>
          requestJson(
            api,
            `/api/projects/${encodeURIComponent(params.projectId)}/steps`,
            {
              method: "POST",
              body: cleanObject({
                title: params.title,
                owner: typeof params.owner === "string" ? params.owner : undefined,
                due: typeof params.due === "string" ? params.due : undefined,
                done: typeof params.done === "boolean" ? params.done : undefined,
              }),
            }
          ),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_project_step_update",
        label: "VibeLife Project Step Update",
        description: "Update a VibeLife project step.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["projectId", "stepId"],
          properties: {
            projectId: { type: "string" },
            stepId: { type: "string" },
            title: { type: "string" },
            owner: { type: "string" },
            due: { type: "string" },
            done: { type: "boolean" },
          },
        },
        handler: (params) =>
          requestJson(
            api,
            `/api/projects/${encodeURIComponent(
              params.projectId
            )}/steps/${encodeURIComponent(params.stepId)}`,
            {
              method: "PUT",
              body: cleanObject({
                title: typeof params.title === "string" ? params.title : undefined,
                owner: typeof params.owner === "string" ? params.owner : undefined,
                due: typeof params.due === "string" ? params.due : undefined,
                done: typeof params.done === "boolean" ? params.done : undefined,
              }),
            }
          ),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_quick_capture_create",
        label: "VibeLife Quick Capture Create",
        description: "Capture a local file path or URL into VibeLife quick capture.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["sourceType", "sourceUri"],
          properties: {
            sourceType: { type: "string" },
            sourceUri: { type: "string" },
            projectId: { type: "string" },
            title: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/quick-capture", {
            method: "POST",
            body: cleanObject({
              source_type: params.sourceType,
              source_uri: params.sourceUri,
              project_id:
                typeof params.projectId === "string" ? params.projectId : undefined,
              title: typeof params.title === "string" ? params.title : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_quick_capture_list",
        label: "VibeLife Quick Capture List",
        description: "List recent quick capture records.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            projectId: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/quick-capture", {
            query: cleanObject({
              project_id:
                typeof params.projectId === "string" ? params.projectId.trim() : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_quick_capture_search",
        label: "VibeLife Quick Capture Search",
        description: "Search quick capture records by semantic similarity.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["query"],
          properties: {
            query: { type: "string" },
            topK: { type: "integer" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/quick-capture/search", {
            query: cleanObject({
              query: params.query,
              top_k: Number.isInteger(params.topK) ? params.topK : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_study_start",
        label: "VibeLife Study Start",
        description: "Start a study session for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["type"],
          properties: {
            type: { type: "string" },
            focusItemId: { type: "string" },
          },
        },
        handler: (params) => {
          const userId = requireCurrentUserId(api)
          return requestJson(api, "/api/study/start", {
            method: "POST",
            body: cleanObject({
              user_id: userId,
              type: params.type,
              focus_item_id:
                typeof params.focusItemId === "string"
                  ? params.focusItemId
                  : undefined,
            }),
          })
        },
      },
      api
    ),
    createTool(
      {
        name: "vibelife_study_end",
        label: "VibeLife Study End",
        description: "End a study session by session id.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["sessionId"],
          properties: {
            sessionId: { type: "integer" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/study/end", {
            method: "POST",
            body: {
              session_id: params.sessionId,
            },
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_study_sessions",
        label: "VibeLife Study Sessions",
        description: "List study sessions for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            limit: { type: "integer" },
          },
        },
        handler: (params) => {
          const userId = requireCurrentUserId(api)
          return requestJson(
            api,
            `/api/study/sessions/${encodeURIComponent(userId)}`,
            {
              query: cleanObject({
                limit: Number.isInteger(params.limit) ? params.limit : undefined,
              }),
            }
          )
        },
      },
      api
    ),
    createTool(
      {
        name: "vibelife_study_today",
        label: "VibeLife Study Today",
        description: "Read today's study stats for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        handler: () => {
          const userId = requireCurrentUserId(api)
          return requestJson(api, `/api/study/today/${encodeURIComponent(userId)}`)
        },
      },
      api
    ),
    createTool(
      {
        name: "vibelife_study_weekly",
        label: "VibeLife Study Weekly",
        description: "Read weekly study stats for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        handler: () => {
          const userId = requireCurrentUserId(api)
          return requestJson(api, `/api/study/weekly/${encodeURIComponent(userId)}`)
        },
      },
      api
    ),
    createTool(
      {
        name: "vibelife_study_report",
        label: "VibeLife Study Report",
        description: "Read the combined study report for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        handler: () => {
          const userId = requireCurrentUserId(api)
          return requestJson(api, `/api/study/report/${encodeURIComponent(userId)}`)
        },
      },
      api
    ),
    createTool(
      {
        name: "vibelife_pomodoro_complete",
        label: "VibeLife Pomodoro Complete",
        description: "Record a completed pomodoro for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            learningSessionId: { type: "integer" },
            focusDuration: { type: "integer" },
            breakDuration: { type: "integer" },
          },
        },
        handler: (params) => {
          const userId = requireCurrentUserId(api)
          return requestJson(api, "/api/pomodoro/complete", {
            method: "POST",
            body: cleanObject({
              user_id: userId,
              learning_session_id:
                Number.isInteger(params.learningSessionId)
                  ? params.learningSessionId
                  : undefined,
              focus_duration:
                Number.isInteger(params.focusDuration)
                  ? params.focusDuration
                  : undefined,
              break_duration:
                Number.isInteger(params.breakDuration)
                  ? params.breakDuration
                  : undefined,
            }),
          })
        },
      },
      api
    ),
    createTool(
      {
        name: "vibelife_pomodoro_stats",
        label: "VibeLife Pomodoro Stats",
        description: "Read pomodoro stats for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            days: { type: "integer" },
          },
        },
        handler: (params) => {
          const userId = requireCurrentUserId(api)
          return requestJson(
            api,
            `/api/pomodoro/stats/${encodeURIComponent(userId)}`,
            {
              query: cleanObject({
                days: Number.isInteger(params.days) ? params.days : undefined,
              }),
            }
          )
        },
      },
      api
    ),
    createTool(
      {
        name: "vibelife_dashboard_summary",
        label: "VibeLife Dashboard Summary",
        description: "Read the main VibeLife dashboard summary for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        handler: () => requestJson(api, "/api/dashboard"),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_dashboard_heatmap",
        label: "VibeLife Dashboard Heatmap",
        description: "Read recent study heatmap data from the dashboard.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            days: { type: "integer" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/dashboard/heatmap", {
            query: cleanObject({
              days: Number.isInteger(params.days) ? params.days : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_dashboard_progress_get",
        label: "VibeLife Dashboard Progress Get",
        description: "Read the saved resume point for the current user.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        handler: () => requestJson(api, "/api/dashboard/progress"),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_dashboard_progress_update",
        label: "VibeLife Dashboard Progress Update",
        description: "Update the saved resume point on the VibeLife dashboard.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["type", "id"],
          properties: {
            type: { type: "string" },
            id: { type: "string" },
            description: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/dashboard/progress", {
            method: "POST",
            query: cleanObject({
              type: params.type,
              id: params.id,
              description:
                typeof params.description === "string" ? params.description : undefined,
            }),
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_git_status",
        label: "VibeLife Git Status",
        description: "Read frontend git status for this repository.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        handler: () => requestJson(api, "/api/git/status"),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_git_diff",
        label: "VibeLife Git Diff",
        description: "Read frontend git diff for this repository.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            maxChars: { type: "integer" },
          },
        },
        handler: async (params) => {
          const result = await requestJson(api, "/api/git/diff")
          const maxChars =
            Number.isInteger(params.maxChars) && params.maxChars > 0
              ? params.maxChars
              : 12000
          return {
            ...result,
            unstaged: truncateText(result?.unstaged ?? "", maxChars),
            staged: truncateText(result?.staged ?? "", maxChars),
          }
        },
      },
      api
    ),
    createTool(
      {
        name: "vibelife_git_log",
        label: "VibeLife Git Log",
        description: "Read recent frontend git commits for this repository.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
        handler: () => requestJson(api, "/api/git/log"),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_git_commit",
        label: "VibeLife Git Commit",
        description: "Create a git commit for frontend changes only. Use only when the user explicitly asks to commit.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["message"],
          properties: {
            message: { type: "string" },
          },
        },
        handler: (params) =>
          requestJson(api, "/api/git/commit", {
            method: "POST",
            body: {
              message: params.message,
            },
          }),
      },
      api
    ),
    createTool(
      {
        name: "vibelife_chat_history_list",
        label: "VibeLife Chat History List",
        description: "List recent OpenClaw conversation transcripts for the current VibeLife agent.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            limit: { type: "integer" },
          },
        },
        handler: (params) => {
          const { agentId, sessionsDir, files } = getConversationSessionFiles(api)
          const limit =
            Number.isInteger(params.limit) && params.limit > 0
              ? Math.min(params.limit, 50)
              : 10

          return {
            agentId,
            sessionsDir,
            sessions: files.slice(0, limit).map((file) => summarizeConversationSession(file)),
          }
        },
      },
      api
    ),
    createTool(
      {
        name: "vibelife_chat_history_get",
        label: "VibeLife Chat History Get",
        description: "Read a specific OpenClaw conversation transcript by session id.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["sessionId"],
          properties: {
            sessionId: { type: "string" },
            limitMessages: { type: "integer" },
          },
        },
        handler: (params) => {
          const { agentId, sessionsDir, files } = getConversationSessionFiles(api)
          const session = files.find((file) => file.sessionId === params.sessionId)

          if (!session) {
            throw new Error(
              `Conversation session not found for agent ${agentId}: ${params.sessionId}`
            )
          }

          const messages = readConversationMessages(session.filePath)
          const limitMessages =
            Number.isInteger(params.limitMessages) && params.limitMessages > 0
              ? Math.min(params.limitMessages, 200)
              : 60

          return {
            agentId,
            sessionsDir,
            sessionId: session.sessionId,
            updatedAt: session.updatedAt,
            totalMessages: messages.length,
            messages: messages.slice(-limitMessages),
          }
        },
      },
      api
    ),
    createTool(
      {
        name: "vibelife_backend_log_tail",
        label: "VibeLife Backend Log Tail",
        description: "Read recent lines from a tmux pane such as the VibeLife backend server.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            tmuxTarget: { type: "string" },
            lines: { type: "integer" },
            maxChars: { type: "integer" },
          },
        },
        handler: (params) => {
          const tmuxTarget =
            typeof params.tmuxTarget === "string" && params.tmuxTarget.trim()
              ? params.tmuxTarget.trim()
              : "vibelife-backend"
          const lines = Number.isInteger(params.lines) ? params.lines : 160
          const maxChars =
            Number.isInteger(params.maxChars) && params.maxChars > 0
              ? params.maxChars
              : 12000

          return {
            tmuxTarget,
            output: truncateText(captureTmuxPane(tmuxTarget, lines), maxChars),
          }
        },
      },
      api
    ),
  ];
}

export default function register(api) {
  for (const tool of defineTools(api)) {
    api.registerTool(tool);
  }
}
