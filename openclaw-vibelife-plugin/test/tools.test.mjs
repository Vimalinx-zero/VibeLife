import test from "node:test"
import assert from "node:assert/strict"

import register from "../index.js"

function collectTools(pluginConfig = {}) {
  const tools = []
  register({
    pluginConfig,
    registerTool(tool) {
      tools.push(tool)
    },
  })
  return tools
}

test("registers project creation and removes dead study tools", () => {
  const tools = collectTools()
  const toolNames = new Set(tools.map((tool) => tool.name))
  const heatmapTool = tools.find((tool) => tool.name === "vibelife_dashboard_heatmap")

  assert.ok(toolNames.has("vibelife_project_create"))
  assert.ok(!toolNames.has("vibelife_study_start"))
  assert.ok(!toolNames.has("vibelife_study_end"))
  assert.ok(!toolNames.has("vibelife_study_sessions"))
  assert.ok(!toolNames.has("vibelife_study_today"))
  assert.ok(!toolNames.has("vibelife_study_weekly"))
  assert.ok(!toolNames.has("vibelife_study_report"))
  assert.ok(!toolNames.has("vibelife_pomodoro_complete"))
  assert.ok(!toolNames.has("vibelife_pomodoro_stats"))
  assert.ok(heatmapTool)
  assert.equal(heatmapTool.description, "Read recent focus heatmap data from the dashboard.")
})

test("project creation tool posts to the project create endpoint", async () => {
  const calls = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    return {
      ok: true,
      status: 201,
      async text() {
        return JSON.stringify({
          success: true,
          project: {
            id: "project_123",
            name: "Launch OpenClaw channel",
          },
        })
      },
    }
  }

  try {
    const tools = collectTools({
      authToken: "test-token",
      baseUrl: "http://127.0.0.1:49174",
    })
    const tool = tools.find((entry) => entry.name === "vibelife_project_create")

    assert.ok(tool, "expected vibelife_project_create to be registered")

    const response = await tool.execute("tool_1", {
      name: "Launch OpenClaw channel",
      category: "work",
      subtitle: "Wire VibeLife into OpenClaw",
      status: "正常推进",
      nextAction: "Finish project create API",
    })

    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, "http://127.0.0.1:49174/api/projects")
    assert.equal(calls[0].options.method, "POST")
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      name: "Launch OpenClaw channel",
      category: "work",
      subtitle: "Wire VibeLife into OpenClaw",
      status: "正常推进",
      nextAction: "Finish project create API",
    })
    assert.equal(
      calls[0].options.headers.Authorization,
      "Bearer test-token"
    )
    assert.equal(response.details.json.project.id, "project_123")
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("project creation tool only sends provided fields and preserves server defaults", async () => {
  const calls = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    return {
      ok: true,
      status: 201,
      async text() {
        return JSON.stringify({
          success: true,
          project: {
            id: "project_defaults",
            name: "Bare minimum project",
            category: "work",
            subtitle: "",
            status: "正常推进",
            nextAction: "",
            createdAt: "2026-03-15T00:00:00",
            updatedAt: "2026-03-15T00:00:00",
          },
        })
      },
    }
  }

  try {
    const tools = collectTools({
      authToken: "test-token",
      baseUrl: "http://127.0.0.1:49174",
    })
    const tool = tools.find((entry) => entry.name === "vibelife_project_create")

    assert.ok(tool, "expected vibelife_project_create to be registered")

    const response = await tool.execute("tool_2", {
      name: "Bare minimum project",
    })

    assert.equal(calls.length, 1)
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      name: "Bare minimum project",
    })
    assert.deepEqual(response.details.json.project, {
      id: "project_defaults",
      name: "Bare minimum project",
      category: "work",
      subtitle: "",
      status: "正常推进",
      nextAction: "",
      createdAt: "2026-03-15T00:00:00",
      updatedAt: "2026-03-15T00:00:00",
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("daily plan refresh tool posts to coach refresh endpoint", async () => {
  const calls = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          success: true,
          provider: "openclaw",
          plan_batch_id: "plan_123",
          created_count: 2,
          skipped_count: 0,
          deleted_count: 1,
          todos: [
            { id: "todo_1", text: "plan item 1" },
            { id: "todo_2", text: "plan item 2" },
          ],
        })
      },
    }
  }

  try {
    const tools = collectTools({
      authToken: "test-token",
      baseUrl: "http://127.0.0.1:49174",
    })
    const tool = tools.find((entry) => entry.name === "vibelife_daily_plan_refresh")

    assert.ok(tool, "expected vibelife_daily_plan_refresh to be registered")

    const response = await tool.execute("tool_daily_refresh", {
      dateKey: "2026-03-17",
      maxItems: 4,
    })

    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, "http://127.0.0.1:49174/api/ai/coach/today/plan")
    assert.equal(calls[0].options.method, "POST")
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      date_key: "2026-03-17",
      max_items: 4,
    })
    assert.equal(
      calls[0].options.headers.Authorization,
      "Bearer test-token"
    )
    assert.equal(response.details.json.plan_batch_id, "plan_123")
    assert.equal(response.details.json.created_count, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("workbench prepare tool posts to unified prepare endpoint", async () => {
  const calls = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          success: true,
          date_key: "2026-03-17",
          provider: "openclaw",
          daily_plan: {
            success: true,
            plan_batch_id: "plan_prepare_123",
            created_count: 2,
          },
          project_digest: {
            count: 1,
            projects: [
              {
                project_id: "project_alpha",
                name: "Alpha",
                next_action: "先补接口测试",
                pending_steps: [],
              },
            ],
          },
          coach_message: "已为今天重排 2 条待办，当前优先推进：Alpha。",
        })
      },
    }
  }

  try {
    const tools = collectTools({
      authToken: "test-token",
      baseUrl: "http://127.0.0.1:49174",
    })
    const tool = tools.find((entry) => entry.name === "vibelife_workbench_prepare")

    assert.ok(tool, "expected vibelife_workbench_prepare to be registered")

    const response = await tool.execute("tool_workbench_prepare", {
      dateKey: "2026-03-17",
      maxItems: 5,
    })

    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, "http://127.0.0.1:49174/api/ai/workbench/prepare")
    assert.equal(calls[0].options.method, "POST")
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      date_key: "2026-03-17",
      max_items: 5,
    })
    assert.equal(
      calls[0].options.headers.Authorization,
      "Bearer test-token"
    )
    assert.equal(response.details.json.daily_plan.plan_batch_id, "plan_prepare_123")
    assert.equal(response.details.json.project_digest.projects[0].project_id, "project_alpha")
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("workbench prepare tool defaults dateKey to the local date", async () => {
  const calls = []
  const now = new Date()
  const expectedDateKey = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 10)
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          success: true,
          date_key: "2026-03-17",
        })
      },
    }
  }

  try {
    const tools = collectTools({
      authToken: "test-token",
      baseUrl: "http://127.0.0.1:49174",
    })
    const tool = tools.find((entry) => entry.name === "vibelife_workbench_prepare")

    assert.ok(tool, "expected vibelife_workbench_prepare to be registered")

    const response = await tool.execute("tool_workbench_prepare_default_date", {
      maxItems: 3,
    })

    assert.equal(calls.length, 1)
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      date_key: expectedDateKey,
      max_items: 3,
    })
    assert.equal(response.details.json.date_key, "2026-03-17")
  } finally {
    globalThis.fetch = originalFetch
  }
})
