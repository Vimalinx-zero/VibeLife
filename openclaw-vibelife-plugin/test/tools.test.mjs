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
