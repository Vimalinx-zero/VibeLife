# Workbench Project Panel AI Effects Design

**Date:** 2026-03-18

## Context

当前工作台项目页的核心组件是 [WorkbenchProjectPanel.tsx](/home/vimalinx/Projects/VibeLifes/VibeLife/frontend/src/components/WorkbenchProjectPanel.tsx)。

现状分成两半：

- 左侧 `我的Todo` 已接真实数据；
- 左侧 `子代理任务进程 / 项目洞察 / 代理状态总览 / Git 面板` 仍以占位文案为主；
- 右侧 `项目 AI 助手` 已能用 OpenClaw 对话，并持久化多会话；
- 但右侧目前只消费 `/api/ai/chat` 的纯文本 `reply`，无法稳定知道“这次到底改了哪些真实数据”。

同时，OpenClaw 在底层实际上已经可能返回结构化 `payloads`，只是当前在 [openclaw_bridge.py](/home/vimalinx/Projects/VibeLifes/VibeLife/backend/openclaw_bridge.py) 中被压平成了纯文本结果，导致前端失去了可追踪的动作信息。

用户这次的目标不是“项目页更好看”，而是让右侧 AI 助手真正驱动左侧工作区内容，并且做到两点同时成立：

1. AI 完成动作后，左侧对应面板自动刷新；
2. 聊天区要明确展示“这次改了什么”。

## Goal

给工作台项目页补一层“结构化 AI 回执 + 精准刷新”能力：

1. OpenClaw 的结构化动作结果不再丢失；
2. `/api/ai/chat` 返回自然语言回复的同时，也返回结构化 `effects` 和 `refreshHints`；
3. 右侧聊天气泡下展示“本次变更 / 已刷新区块”；
4. 左侧只刷新真实可用的数据区块，而不是一律全刷；
5. `项目洞察` 和 `代理状态总览` 从占位面板升级为真实数据摘要面板。

## Non-Goals

- 这一轮不把工作台项目页彻底改写成新的全代理操作台。
- 这一轮不接真实的 `子代理任务进程` 面板。
- 这一轮不接真实的 `Git 面板`。
- 这一轮不要求 OpenClaw 输出复杂 DSL；只消费已有结构化运行结果并做最小标准化。
- 这一轮不重做整个项目页的布局风格。

## User-Approved Scope

用户已确认采用中间方案：

- 右侧 AI 助手不仅要自动刷新左侧，还要显示结构化回执；
- 左侧重点先接：
  - `我的Todo`
  - `项目洞察`
  - `代理状态总览`
- `子代理任务进程` 和 `Git 面板` 继续诚实占位。

## Approaches Considered

### Approach A: 最小前端刷新版

保留当前 `/api/ai/chat` 纯文本返回，前端在任何成功回复后直接全量刷新左侧。

Pros:
- 改动最小；
- 可以很快让页面“看起来会动”。

Cons:
- 无法知道 AI 具体改了什么；
- 全量刷新粗糙，容易让普通聊天也引发无意义刷新；
- 没有用户可见的操作回执。

### Approach B: 结构化回执版

保留聊天回复，同时让后端额外返回结构化 `effects` / `refreshHints` / `runMeta`，前端按提示精准刷新，并在消息下显示回执。

Pros:
- 满足“自动刷新 + 显示改动”两个目标；
- 精准刷新，不靠猜测；
- 在现有项目页结构上即可落地。

Cons:
- 需要补一层协议标准化；
- 前后端都要做小幅改造。

### Approach C: 全量专用项目代理版

将右侧 AI 助手改成专用项目代理接口，左侧所有 tab 全由该代理统一驱动。

Pros:
- 最完整，未来扩展空间大；
- 可以继续长成真正的 AI 工作台。

Cons:
- 范围过大；
- 容易把这一轮做散，拖慢交付；
- 会引入更多未验证的状态边界。

## Decision

选择 **Approach B: 结构化回执版**。

这是当前仓库最稳妥的演进路径：不推翻现有项目页，也不装作已经有完整代理控制台，而是把 OpenClaw 已有的结构化结果重新接回前后端链路，让项目页第一次具备“可追踪的 AI 执行动作”。

## Design

### 1. `/api/ai/chat` 从纯文本回复升级为“回复 + 回执”

当前 [backend/ai_routes.py](/home/vimalinx/Projects/VibeLifes/VibeLife/backend/ai_routes.py) 的 `/api/ai/chat` 仅返回：

- `reply`
- `provider`

这一轮升级为：

- `reply`
- `provider`
- `effects`
- `refreshHints`
- `runMeta`

推荐语义：

- `effects`: `[{ entity, action, count, ids, summary }]`
- `refreshHints`: `["todo", "insights", "status"]`
- `runMeta`: `{ provider, executedAt, success }`

第一轮支持的 `entity/action` 组合只覆盖当前已知的 VibeLife 工具域：

- `todo/create`
- `todo/update`
- `project/create`
- `project/update`
- `project_step/create`
- `project_step/update`
- `note/create`
- `note/update`

如果本次 OpenClaw 没有产出结构化动作，则：

- `reply` 仍然正常返回；
- `effects` 返回空数组；
- `refreshHints` 返回空数组；
- 前端不做额外刷新。

### 2. OpenClaw 结构化结果不再被压扁

[openclaw_bridge.py](/home/vimalinx/Projects/VibeLifes/VibeLife/backend/openclaw_bridge.py) 当前已经能看到 `payloads`，但最后只返回清洗后的文本。

这一轮不去“从自然语言里反推动作”，而是直接保留底层结构化信息：

- Bridge 层新增一个更高层的返回结构，至少包含：
  - `reply`
  - `rawPayloads`
  - `parsed`
- `ai_routes.py` 基于这些结构化结果提炼出统一的 `effects` 和 `refreshHints`；
- 前端永远只消费统一后的协议，不直接理解 OpenClaw 原始 payload 细节。

这能把 OpenClaw 的不稳定性隔离在后端，避免前端和底层协议耦合。

### 3. 左侧面板只接三块真实内容

#### `我的Todo`

继续沿用现有待办分组逻辑，不重做主结构。

新增行为只有：

- 当 assistant 消息带有 `todo` 相关 `refreshHints` 时，自动重新拉取待办；
- 如果本次只是普通聊天，则不刷新。

#### `项目洞察`

从占位文案升级为真实项目摘要面板，数据源来自 `/api/projects`。

内容固定为：

- 顶部 3 个小统计：
  - 活跃项目数
  - `需关注/有阻塞` 项目数
  - 未完成步骤数
- 下方 `重点项目列表`：
  - 项目名
  - 状态
  - `nextAction`
  - 未完成步骤数

重点项目的排序按“更值得优先看”而不是按创建顺序：

1. 有 `nextAction`
2. 状态非“正常推进”
3. 未完成步骤更多
4. 更新时间更新

#### `代理状态总览`

这一轮不做假装能监控所有 OpenClaw 子代理，而是做成本页真实 AI 活动摘要。

内容固定为：

- 当前 provider
- 当前会话标题
- 当前运行态：空闲 / 处理中 / 上次成功 / 上次失败
- 上次动作时间
- 上次变更摘要
- 上次刷新结果

数据完全来自本页本地状态，不新增后端接口。

### 4. 右侧聊天气泡增加“操作回执区”

assistant 消息保持两层：

1. 主体气泡文本：自然语言回复；
2. 气泡下方回执区：当且仅当存在结构化 `effects` 或 `refreshHints` 时显示。

回执区格式：

- 第一行：`本次变更`
- 内容：例如 `创建待办 2 条，更新项目 1 个`
- 第二行：`已刷新`
- 内容：例如 `我的Todo、项目洞察、代理状态总览`

如果这次没有结构化动作，则不显示回执区，避免普通聊天界面噪声过多。

### 5. 刷新策略是“按 hint 精准刷新”，不是整页全刷

前端收到 assistant 回包后，按 `refreshHints` 执行：

- `todo` -> reload todo groups
- `insights` -> reload project summary
- `status` -> 更新本页 AI 活动状态

刷新原则：

- 不因为普通聊天而刷新；
- 不一次性刷新所有 tab；
- 不靠解析中文自然语言决定刷新；
- 即使刷新失败，也不吞掉聊天回复本身。

### 6. 仍然保持诚实占位的区块

`子代理任务进程` 和 `Git 面板` 继续使用清晰占位文案。

原因很明确：

- 当前没有稳定、可信的数据源；
- 如果这轮强接，只会再次退化成“假的实时面板”；
- 这会破坏整页可信度。

## Data Flow

### AI 成功执行并产生动作

1. 用户在右侧发送消息；
2. 前端请求 `/api/ai/chat`；
3. 后端调用 OpenClaw；
4. Bridge 保留文本 + 结构化 payload；
5. `ai_routes.py` 归一化为 `reply + effects + refreshHints + runMeta`；
6. 前端把 assistant 消息写入当前会话；
7. 前端根据 `refreshHints` 精准刷新左侧真实区块；
8. 右侧消息下显示本次回执。

### AI 只是普通聊天，没有动作

1. assistant 消息正常落库到本地会话；
2. `effects` 为空；
3. `refreshHints` 为空；
4. 左侧不刷新；
5. 回执区不显示。

### AI 调用失败

1. 右侧继续显示失败消息；
2. `代理状态总览` 记录为上次失败；
3. 左侧真实数据区块不做刷新；
4. 不伪造任何 effect。

## Error Handling

- OpenClaw 返回异常但已有文本时，仍返回文本，同时 `effects` 为空。
- OpenClaw 返回文本为空但有 payloads 时，允许后端生成保底提示文本，但仍保留结构化动作。
- 如果结构化 payload 无法识别，则只返回 `reply`，不生成伪造 effect。
- 左侧某个区块刷新失败时，不影响聊天主回复；只在 `代理状态总览` 中记录刷新结果失败。

## Testing Strategy

### Backend

- 为 Bridge 层补测试，验证带 `payloads` 的 OpenClaw 输出会保留结构化结果；
- 为 `ai_routes.py` 补测试，验证 `/api/ai/chat` 能返回：
  - 纯文本场景
  - 带 `effects` 场景
  - 带 `refreshHints` 场景

### Frontend

- 为项目页本地状态补纯函数测试：
  - 解析回执
  - 汇总回执文案
  - `status` 状态更新
- 为组件交互做类型检查与构建验证；
- 手工验收：
  - AI 新建待办后，左侧 `我的Todo` 自动刷新；
  - AI 更新项目后，`项目洞察` 自动刷新；
  - 聊天气泡下能看到本次变更与刷新结果；
  - 普通聊天时不乱刷新。
