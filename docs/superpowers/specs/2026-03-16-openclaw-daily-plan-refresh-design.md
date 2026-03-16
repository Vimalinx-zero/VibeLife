# OpenClaw Daily Plan Refresh Design

**Date:** 2026-03-16

## Context

VibeLife 现在已经具备两块相关能力，但它们还没有收成同一条稳定链路。

第一，OpenClaw 已经能通过 `openclaw-vibelife-plugin` 直接读写 VibeLife 的待办、笔记、项目和工作台统计。第二，首页 `Dashboard` 已经预留了 “AI 教练 / 生成今日计划” 的 UI 和前端数据结构，但后端并没有真正提供 `/api/ai/coach/today` 和 `/api/ai/coach/today/plan`，所以这块仍然是占位态。

用户希望的结果不是“再加一个聊天入口”，而是让 OpenClaw 真正成为 VibeLife 的 AI 后端：无论是在首页点“生成今日计划”，还是在 OpenClaw 里说“安排今天 / 准备工作台”，都应该把同一份今天计划直接落到工作台里，并且不会误删手动待办或项目待办。

## Goal

把“今日计划重排”做成一条统一、可复用、可控的后端能力，让：

1. `Dashboard` 的“生成计划”按钮调用真实后端；
2. OpenClaw 通过一个专用工具触发同一条链路；
3. 每次重排时，只替换上一批未完成的 AI 日常待办；
4. 手动待办和项目待办全部保留；
5. 失败时不破坏现有工作台数据。

## Non-Goals

- 这一轮不让 AI 自动修改笔记、项目、日程。
- 不做“全工作台总管”自动化编排。
- 不改动现有普通单条待办工具的语义。
- 不做新的服务端聊天历史存储。

## User-Approved Behavioral Rules

- “安排今天 / 准备工作台” 的默认行为是 **直接重排**，不是只补充缺项。
- 重排时 **保留项目待办**。
- 重排时 **保留手动创建的普通待办**。
- 只替换 **AI 上一次生成且仍未完成的日常待办**。
- 已完成的 AI 日常待办保留，作为历史记录。

## Approaches Considered

### Approach A: 继续让 OpenClaw 用现有 todo 工具自行删改

让 OpenClaw 继续通过 `vibelife_todo_list / create / update / delete` 自己推理并逐条修改待办。

Pros:
- 改动最小；
- 无需新增统一后端入口。

Cons:
- 无法稳定区分“手动待办”和“上一批 AI 日常待办”；
- 首页按钮和 OpenClaw 会形成两套行为；
- 误删用户数据的风险高。

### Approach B: 新增统一的“今日计划刷新”后端服务

后端提供统一入口，由它负责读取上下文、调用 OpenClaw、校验结果、替换旧 AI 批次并写入新待办。首页按钮和 OpenClaw 工具都走这条链路。

Pros:
- 行为一致；
- 可以精确控制替换范围；
- 最容易保证事务安全和回滚；
- 为后续扩展到笔记/项目联动留出清晰入口。

Cons:
- 需要新增数据标记字段和后端服务层；
- OpenClaw 插件需要新增一个专用工具。

### Approach C: 直接做“AI 工作台总管”

一次性让 AI 重排待办、改项目、写笔记、建日程。

Pros:
- 长期方向完整。

Cons:
- 超出当前切口；
- 风险和验证成本都明显上升；
- 会把旧债清理和新能力实现搅在一起。

## Decision

选择 **Approach B**。

这条路径最符合用户现在的核心诉求：让 OpenClaw 真正能“把工作台准备好”，但范围仍然控制在“重排今天待办”这个可验证、可回滚的单点能力上。

## Design

### 1. Todo 数据增加来源和计划标记

`backend/models.py` 中的 `TodoItem` 增加两个字段：

- `source`: `manual | project | ai_daily`
- `plan_batch_id`: 可空字符串，仅对 `ai_daily` 有值
- `plan_date`: 可空字符串，仅对 `ai_daily` 有值，格式为 `YYYY-MM-DD`

字段语义：

- `manual`: 用户在普通工作台、TodayTodos、快速添加等入口手动创建的待办；
- `project`: 项目面板或项目相关流程产生的待办；
- `ai_daily`: 通过“安排今天 / 准备工作台 / 生成今日计划”创建的日常待办。

批次规则：

- 同一次“今日计划重排”创建的所有 `ai_daily` 待办共用一个新的 `plan_batch_id`；
- 同一次“今日计划重排”创建的所有 `ai_daily` 待办共用同一个 `plan_date`，默认就是当天；
- 下次重排时，只删除 `completed = false AND source = ai_daily AND plan_date = 今天` 的旧待办；
- `manual` 和 `project` 待办永远不在这条链路里被删除；
- `completed = true` 的旧 `ai_daily` 待办保留。

### 2. 新增独立的今日计划服务层

新增一个独立服务模块，避免把复杂逻辑继续塞进 `backend/ai_routes.py`。

这个服务负责：

1. 收集今日计划所需上下文；
2. 生成给 OpenClaw 的结构化计划 prompt；
3. 调用 OpenClaw；
4. 解析和校验返回的计划结构；
5. 在一个数据库事务里替换旧的未完成 `ai_daily` 待办；
6. 返回给前端和插件统一的结果摘要。

建议拆分为两类职责：

- 读取与整理上下文：
  - 当前未完成 `manual` 待办；
  - 当前未完成 `project` 待办；
  - 今日/最近的项目摘要；
  - 今日专注数据；
  - 今日日志数量；
- 执行重排：
  - 删除“今天”旧未完成 `ai_daily`；
  - 新建新批次 `ai_daily`；
  - 返回 `plan_batch_id`、删除数量、新建条目列表。

### 3. 后端提供真实 coach 接口

保留前端已占位的接口名，真正实现：

- `GET /api/ai/coach/today`
- `POST /api/ai/coach/today/plan`

#### `GET /api/ai/coach/today`

返回可直接喂给 `Dashboard` 的摘要视图，并保留现有前端判断口径：

- `success: true`
- `snapshot`
- `adaptive`
- `suggestions`
- `coach_message`

其中核心字段包括：

- `snapshot`
  - `pending_todos`
  - `today_focus_minutes`
  - `recent_7d_completion_rate`
  - `recent_7d_avg_focus_minutes`
- `adaptive`
  - `level`
  - `label`
  - `focus`
  - `completion_rate`
  - `avg_daily_focus_minutes`
  - `recommended_plan_items`
- `suggestions`
  - 优先返回当前未完成的 `ai_daily` 待办；
  - 如果当前没有 `ai_daily`，返回基于上下文生成的建议摘要；
- `coach_message`

这个接口只读，不产生写入。

`suggestions` 必须继续满足现有前端结构：

- `id`
- `title`
- `reason`
- `target`
- `estimated_minutes`
- `subject`
- `todo_text`

如果当前存在未完成的 `ai_daily` 待办，后端要把它们映射成上述结构：

- `id = todo.id`
- `title = todo.text`
- `reason = "来自今日计划"`
- `target = "/workbench"`
- `estimated_minutes = 20` 作为当前固定默认值
- `subject = todo.subject`
- `todo_text = todo.text`

这样 `Dashboard` 无需先改类型结构，也能直接展示已经落库的今日计划。

#### `POST /api/ai/coach/today/plan`

执行真实重排。请求体可以保持最小，只需要：

- `max_items` 可选

响应必须兼容当前 `Dashboard` 的读取方式，并补足插件可复用字段：

- `success: true`
- `plan_batch_id`
- `created_count`
- `skipped_count`
- `deleted_count`
- `todos`
- `provider: "openclaw"`

其中：

- `created_count` 是本次新建的 `ai_daily` 数量；
- `skipped_count` 在这一轮固定返回 `0`，先用于兼容现有前端；
- `deleted_count` 是本次删除的旧 `ai_daily` 数量。

执行流程：

1. 读取上下文；
2. 调用 OpenClaw 生成结构化今日计划；
3. 校验每条计划项的 `text / priority / subject / due_date`；
4. 开启事务；
5. 删除所有 `completed = false AND source = ai_daily AND plan_date = 今天` 的待办；
6. 生成新的 `plan_batch_id`；
7. 写入新的 `ai_daily` 待办，并统一写入今天的 `plan_date`；
8. 返回：
   - `success`
   - `plan_batch_id`
   - `created_count`
   - `skipped_count`
   - `deleted_count`
   - `todos`
   - `provider: "openclaw"`

### 4. OpenClaw 只通过专用工具触发重排

在 `openclaw-vibelife-plugin/index.js` 新增专用工具，例如：

- `vibelife_daily_plan_refresh`

工具语义：

- 它不直接逐条删除/创建待办；
- 它只调用 `POST /api/ai/coach/today/plan`；
- 可接受 `maxItems`，并映射为后端的 `max_items`；
- 返回后端返回的批次和待办结果。

这样用户在 OpenClaw 中说：

- “安排今天”
- “准备工作台”
- “把我今天该做的事情排一下”

智能体可以直接调这个工具，行为与首页按钮完全一致。

原来的 `vibelife_todo_create / update / delete` 保持不变，继续服务普通单条操作。

### 5. Dashboard 放开真实能力并刷新工作台

`frontend/src/pages/Dashboard.tsx` 不再硬编码 `coachFeatureEnabled = false`。

变更后的行为：

- 页面加载时，真实请求 `GET /ai/coach/today`；
- 点击“生成计划”时，真实调用 `POST /ai/coach/today/plan`；
- 成功后：
  - 刷新 coach 数据；
  - 触发待办刷新事件；
  - TodayTodos 立即显示新结果；
- 失败时：
  - 不清空现有待办；
  - 仅给出错误 toast。

### 6. Prompt 与返回结构必须收紧

为了避免 OpenClaw 继续输出自由文本后让后端硬猜，今日计划服务需要给 OpenClaw 一个专用 prompt，要求只返回结构化 JSON。

目标结构可控制在最小集合：

```json
{
  "coach_message": "今天的整体建议",
  "adaptive": {
    "level": "balanced",
    "label": "稳步推进",
    "focus": "先做关键项"
  },
  "todos": [
    {
      "text": "先完成 X",
      "priority": 2,
      "subject": "general",
      "due_date": "2026-03-16"
    }
  ]
}
```

后端约束：

- 不接受空文本；
- `max_items` 之外的条目要裁剪；
- `priority` 非法时回退到安全默认值；
- `subject` 在这一轮保持 `general`，避免误碰项目分类；
- JSON 不合法则整次失败，不落库。
- 后端把返回的 todo 写入数据库时，会额外补上 `source = ai_daily`、`plan_batch_id`、`plan_date = 今天`。

## Data Flow

### Dashboard 按钮

1. 用户点击“生成计划”；
2. 前端调用 `POST /api/ai/coach/today/plan`；
3. 后端读取上下文并调用 OpenClaw；
4. OpenClaw 返回结构化今日计划；
5. 后端事务性替换旧未完成 `ai_daily` 待办；
6. 前端刷新 TodayTodos 与 coach 摘要。

### OpenClaw 对话

1. 用户在 OpenClaw 中说“准备工作台”；
2. OpenClaw 调用 `vibelife_daily_plan_refresh`；
3. 插件调用 `POST /api/ai/coach/today/plan`；
4. 后端执行同一套重排逻辑；
5. OpenClaw 回复用户“已重排今天计划，并写入 N 条待办”。

## Error Handling

- OpenClaw 调用失败：直接返回错误，不删除任何旧待办。
- OpenClaw 返回非 JSON 或 JSON 非法：直接失败，不落库。
- 数据库事务失败：整笔回滚，不出现删一半、写一半。
- 前端请求失败：保留当前页面已有状态，只显示错误提示。
- 插件调用失败：把错误原样传回 OpenClaw，便于用户重试。

## Testing

### Backend

新增针对今日计划服务的测试，至少覆盖：

- 首次生成时，会创建一批 `ai_daily` 待办；
- 再次生成时，只删除旧的未完成 `ai_daily`；
- `manual` 待办保留；
- `project` 待办保留；
- 已完成 `ai_daily` 待办保留；
- OpenClaw 返回非法结构时，不发生写入；
- 重排结果接口返回统一字段。

### OpenClaw Plugin

新增工具注册与调用测试，至少覆盖：

- `vibelife_daily_plan_refresh` 出现在工具列表里；
- 工具正确请求 `/api/ai/coach/today/plan`；
- 参数映射正确。

### Frontend

新增或更新测试，至少覆盖：

- `Dashboard` 不再停留在硬编码 fallback；
- 点击“生成计划”后会调用真实接口；
- 成功后刷新 coach 数据和今日待办；
- 失败时显示错误但不清空界面。

### Verification

- `backend/.venv/bin/python -m unittest ...` 跑新增后端测试；
- `node --test` 跑新增插件/前端轻量测试；
- `cd frontend && npx tsc --noEmit`；
- `cd frontend && npm run build`。

## Success Criteria

- 首页“生成计划”按钮真正调用后端并写入今日待办；
- OpenClaw 通过专用工具触发同一条重排链路；
- 重排只替换未完成的 `ai_daily`，不会误删手动待办和项目待办；
- 失败不会破坏现有工作台数据；
- `Dashboard` 的 AI 教练区域不再是占位态。
