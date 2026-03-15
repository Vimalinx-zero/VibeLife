const DEFAULT_BASE_URL = "http://127.0.0.1:49174";
const DEFAULT_TIMEOUT_MS = 30000;

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
  ];
}

export default function register(api) {
  for (const tool of defineTools(api)) {
    api.registerTool(tool);
  }
}
