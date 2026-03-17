# OpenClaw Workbench Prepare Design

**Date:** 2026-03-17

## Context

VibeLife 现在已经有了两块相关基础能力。

第一，`/api/ai/coach/today/plan` 和 `vibelife_daily_plan_refresh` 已经能稳定地把今天的 `ai_daily` 待办落到工作台，并且严格保留手动待办和项目待办。

第二，OpenClaw 插件已经暴露了项目、待办、日志、日程、专注记录等一组通用工具，可以直接读写 VibeLife 的数据。

但用户真正想要的不是“再多一个底层工具”，而是一个更高层的动作：当他说“我回来开始干活了”“准备工作台”“安排今天开工”的时候，OpenClaw 应该一次性把工作台准备到可执行状态，而不是自己临时拼接多次工具调用。

## Goal

新增一个稳定的“准备工作台”统一入口，让 OpenClaw 能在一次动作里：

1. 重排今天的 AI 日常待办；
2. 汇总当前最值得推进的项目下一步；
3. 返回一份可直接用于回复用户的结构化结果；
4. 保持写入边界只落在 `ai_daily` 待办上。

## Non-Goals

- 这一轮不自动创建日志。
- 这一轮不自动创建笔记草稿。
- 这一轮不自动创建或修改日程事件。
- 这一轮不自动更新项目的 `nextAction` 或 project steps。
- 这一轮不做新的聊天历史存储。

## User-Approved Scope

这轮只做两件事：

1. 重排今天计划；
2. 汇总项目下一步。

日志草稿、笔记草稿、日程落库都明确留到下一轮。

## Approaches Considered

### Approach A: 继续让 OpenClaw 用现有工具自由编排

让 OpenClaw 继续自己组合：

- `vibelife_daily_plan_refresh`
- `vibelife_project_list`
- 以及未来可能的其他通用工具。

Pros:
- 改动最小；
- 不需要新增后端接口。

Cons:
- 高层语义分散在模型提示里，不稳定；
- 相同意图可能走出不同调用路径；
- 后续前端如果也想复用“准备工作台”，无法共享同一行为。

### Approach B: 在插件里新增宏工具 `vibelife_workbench_prepare`

插件自己串行调用多个现有接口，并把结果拼成一个返回对象。

Pros:
- 后端改动少；
- OpenClaw 使用方便。

Cons:
- 工作台编排逻辑会散落到插件层；
- 前端和其他调用方无法直接复用；
- 后续一旦加入更多写入动作，插件会变成业务层。

### Approach C: 新增后端统一入口 `/api/ai/workbench/prepare`

后端负责调用既有日计划刷新服务并生成项目摘要，插件只做薄封装。

Pros:
- 统一语义稳定；
- 插件和前端都能复用；
- 写入边界和失败语义更容易锁死；
- 为后续扩展日志/笔记草稿保留自然入口。

Cons:
- 需要新增一层后端服务和测试。

## Decision

选择 **Approach C**。

“准备工作台”本质上是一个业务动作，不是模型自由发挥的提示技巧，也不只是插件里的便捷组合。它应该是一个明确的后端能力，由后端控制写入边界和失败语义，再由 OpenClaw 通过专用工具调用。

## Design

### 1. 新增统一接口

新增后端接口：

- `POST /api/ai/workbench/prepare`

请求体：

- `date_key`: 必填，格式 `YYYY-MM-DD`
- `max_items`: 可选，沿用今日计划刷新上限

响应体：

- `success: true`
- `date_key`
- `daily_plan`
- `project_digest`
- `coach_message`
- `provider: "openclaw"`

其中：

- `daily_plan` 直接承载现有今日计划刷新结果；
- `project_digest` 是只读摘要；
- `coach_message` 是面向用户的简短文字总结，可由后端拼接，不依赖模型再次生成。

### 2. 写入边界严格复用现有日计划刷新

“准备工作台”的写操作只允许发生在今日计划刷新这一步。

也就是说：

- 只会写 `source = ai_daily` 的今日待办；
- 只会替换当前用户、当前 `date_key` 下未完成的 `ai_daily`；
- 手动待办不删不改；
- 项目待办不删不改；
- 项目本身不更新；
- 日志/笔记/日程都不写。

后端不要重新实现一套待办刷新规则，而是直接复用现有 `refresh_today_plan(...)` 服务逻辑。

### 3. 项目摘要是只读聚合

新增一个只读项目摘要步骤，从当前用户项目中挑出 3 到 5 个最值得推进的项目。

每条摘要至少返回：

- `project_id`
- `name`
- `category`
- `status`
- `next_action`
- `pending_steps`

筛选和排序规则保持简单、可解释：

1. 优先保留有 `next_action` 的项目；
2. 再优先未完成 steps 数量大于 0 的项目；
3. 最后按 `updated_at` / `created_at` 的新近程度排序。

`pending_steps` 只需要返回最多前 3 条未完成 step 的简要信息：

- `id`
- `title`
- `owner`
- `due`

这一轮不做 AI 二次推理，不让模型自己总结项目内容。项目摘要由后端按现有字段直接整理，确保稳定和可测试。

### 4. 失败语义明确

“准备工作台”不是一个可部分成功、可部分失败还继续往下走的动作。

规则固定为：

- 如果今日计划刷新失败，整个 prepare 失败；
- 失败时不要返回伪造的 `project_digest + success=true`；
- 如果项目摘要读取失败，也视为整个 prepare 失败；
- 成功响应必须同时包含 `daily_plan` 和 `project_digest`。

这是为了保持这个动作的语义简单清晰：
“准备工作台成功” 就意味着今天计划已经落库，且项目摘要也已准备好。

### 5. OpenClaw 插件只做薄封装

插件新增专用工具：

- `vibelife_workbench_prepare`

参数最小化：

- `dateKey`
- `maxItems`

它只负责：

1. 计算默认本地日期；
2. 转发到 `/api/ai/workbench/prepare`；
3. 返回结构化 JSON 给 OpenClaw。

它不直接调用：

- `vibelife_todo_create`
- `vibelife_todo_delete`
- `vibelife_project_update`

也不在插件层自己拼接工作台逻辑。

### 6. OpenClaw 提示层行为

当用户意图接近以下表达时：

- “准备工作台”
- “安排今天开工”
- “我回来开始干活了”
- “把今天要做的准备好”

应该优先引导 OpenClaw 使用 `vibelife_workbench_prepare`，而不是自行逐条列 todo 或自由调用一串通用工具。

这一轮只要求工具和返回结构到位，不强制改写整个系统提示词。必要时只补最小提示，让已有 OpenClaw agent 知道优先用该工具。

## Response Shape

建议 `project_digest` 结构如下：

```json
{
  "projects": [
    {
      "project_id": "project_123",
      "name": "项目名称",
      "category": "work",
      "status": "正常推进",
      "next_action": "今天先完成接口联调",
      "pending_steps": [
        {
          "id": "step_1",
          "title": "补后端测试",
          "owner": "AI",
          "due": "03-17"
        }
      ]
    }
  ],
  "count": 1
}
```

`coach_message` 可以由后端按固定模板拼接，例如：

- 已为今天重排 `N` 条待办；
- 当前优先推进 `X / Y / Z` 三个项目；
- 每个项目附一个最直接的下一步。

这样即使 OpenClaw 只是把结构化结果直接转述，用户也能得到可执行反馈。

## Testing

### Backend

新增后端测试覆盖：

- `POST /api/ai/workbench/prepare` 成功返回 `daily_plan + project_digest`
- 缺少 `date_key` 返回 `422`
- 今日计划刷新失败时整个 prepare 失败
- 项目摘要只读取当前用户数据
- prepare 不直接改写项目或手动待办

### Plugin

新增插件测试覆盖：

- `vibelife_workbench_prepare` 被注册
- 它请求 `/api/ai/workbench/prepare`
- 转发 `dateKey -> date_key`
- 转发 `maxItems -> max_items`

### Verification

- `backend/.venv/bin/python -m unittest ...`
- `node --test openclaw-vibelife-plugin/test/tools.test.mjs`
- `cd frontend && npx tsc --noEmit` 只作为回归检查

## Success Criteria

- OpenClaw 可以通过单一工具完成“准备工作台”动作。
- 这个动作会真实重排今日 `ai_daily` 待办。
- 返回结果中包含当前最值得推进的项目下一步。
- 手动待办、项目待办、项目字段都不会被这个动作误改。
- 失败时不会留下“半成功”的模糊状态。
