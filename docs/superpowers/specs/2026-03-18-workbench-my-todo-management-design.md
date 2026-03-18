# Workbench MyTodo Management Design

**Date:** 2026-03-18

## Context

[WorkbenchProjectPanel.tsx](/home/vimalinx/Projects/VibeLifes/VibeLife/frontend/src/components/WorkbenchProjectPanel.tsx) 左侧有 `项目任务 > 我的Todo`，但当前交互仍偏展示。用户要求这一块在 Workbench 内直接可管，而不是跳去其他页面。

现有 Todo 链路已经有基础 CRUD：

- 前端 [workbenchApi.ts](/home/vimalinx/Projects/VibeLifes/VibeLife/frontend/src/utils/workbenchApi.ts)
- 后端 [workbench_routes.py](/home/vimalinx/Projects/VibeLifes/VibeLife/backend/workbench_routes.py)
- 数据模型 [models.py](/home/vimalinx/Projects/VibeLifes/VibeLife/backend/models.py) 里的 `TodoItem`

但当前仍缺：

- 行内编辑；
- 优先级快速切换；
- 截止时间修改；
- 拖拽排序；
- 明确的“未完成 / 已完成”展示层次。

用户明确要求：

- 只改 Workbench 里的 `我的Todo`；
- 这一轮做完整版；
- 不改单独的 `Projects` 页面。

## Goal

让 `Workbench > 项目任务 > 我的Todo` 成为一个真正可操作的任务面板，支持：

1. 行内改文本；
2. 改优先级；
3. 改截止时间；
4. 完成；
5. 删除；
6. 拖拽排序。

用户不需要离开 Workbench，就能直接完成当日项目任务管理。

## Non-Goals

- 这一轮不重做整个 Workbench 布局。
- 这一轮不改单独的 `Projects` 页面。
- 这一轮不把 Todo 面板和知识工作室做联动。
- 这一轮不在该面板里接入复杂批量操作。
- 这一轮不做已完成任务的拖拽排序。
- 这一轮不在该面板里提供“恢复已完成”动作。

## User-Approved Scope

- 改动位置仅限 `Workbench > 项目任务 > 我的Todo`
- 要做完整版交互：
  - 完成
  - 删除
  - 行内改文本
  - 改优先级
  - 改截止时间
  - 拖拽排序

## Approaches Considered

### Approach A: 在现有面板上做完整可操作升级

保留当前 [WorkbenchProjectPanel.tsx](/home/vimalinx/Projects/VibeLifes/VibeLife/frontend/src/components/WorkbenchProjectPanel.tsx) 布局，只把 `我的Todo` 区块做成可操作列表。

Pros:

- 改动边界最清楚；
- 与用户指定位置完全一致；
- 不影响其他 tab。

Cons:

- 需要在现有 Todo API 上补排序和字段编辑语义。

### Approach B: 跳转到专门的任务页

在 Workbench 面板里只显示摘要，点进去进入专门 Todo 管理页。

Pros:

- 任务管理空间更大。

Cons:

- 与用户要求相反；
- 会打断 Workbench 使用流。

### Approach C: 保持只读 + 弹窗编辑

列表只读，点某项弹窗编辑完整信息。

Pros:

- 开发表面上简单。

Cons:

- 操作路径更重；
- 不符合“方便点击、顺手管理”的目标。

## Decision

选择 **Approach A: 在现有面板上做完整可操作升级**。

这一轮只把 `我的Todo` 这一个局部做好，最符合用户要求，也最利于后续增量扩展。

## Design

### 1. Panel Structure

`我的Todo` 面板固定分成两层：

- 上方：未完成任务
- 下方：已完成任务（折叠区）

默认体验：

- 主要注意力给未完成任务；
- 已完成任务默认折叠，不干扰当前工作。

### 2. Per-Item Interactions

每条未完成任务提供以下交互：

- 左侧拖拽把手；
- 中间任务文本，点击进入行内编辑；
- 优先级控件；
- 截止时间控件；
- 完成按钮；
- 删除按钮。

#### 2.1 Text Editing

- 点击文本进入输入态；
- `Enter` 提交；
- `Escape` 取消；
- 失焦时提交；
- 空文本不允许提交。

#### 2.2 Priority Editing

优先级使用轻量下拉，不弹额外模态。

允许值：

- `高`
- `中`
- `低`

前后端仍然可以内部映射到整数，但前端交互必须使用明确中文层级。

#### 2.3 Due Date Editing

- 使用原生日期输入；
- 允许清空截止时间；
- 修改后立即保存。

#### 2.4 Complete

- 点“完成”后，该条目从未完成区移除；
- 自动进入已完成折叠区；
- 记录 `completed_at`。

V1 不在这个面板中提供“恢复未完成”动作。这样排序语义更清楚，不引入额外状态分支。

#### 2.5 Delete

- 直接删除；
- 不做回收站；
- 删除前可做轻量确认，但不弹重模态。

### 3. Ordering Semantics

这是这份 spec 最需要锁死的部分。

#### 3.1 Which Items Are Draggable

- 只有未完成任务可拖拽；
- 已完成任务不可拖拽；
- 已完成区按完成时间排序，不参与手动排序。

#### 3.2 Data Model

`TodoItem` 新增字段：

- `sort_order: Integer | null`

现有字段继续使用：

- `completed`
- `completed_at`
- `priority`
- `due_date`

#### 3.3 Incomplete Ordering

未完成任务列表的最终排序规则：

1. 若有 `sort_order`，按 `sort_order asc`
2. 对于没有 `sort_order` 的旧数据，先按 legacy 规则计算临时顺序：
   - `priority desc`
   - `due_date asc`
   - `created_at asc`
3. 读取时或首次重排前，对未完成列表做一次顺序归一化，补齐连续 `sort_order`

这保证老数据升级后也能稳定进入手动排序体系。

#### 3.4 Completed Ordering

已完成任务列表固定按：

- `completed_at desc`
- 若缺失 `completed_at`，退回 `created_at desc`

已完成任务不再保留可见的拖拽顺序。

### 4. API Contract

#### 4.1 Existing CRUD

继续沿用：

- `GET /api/workbench/todos`
- `POST /api/workbench/todos`
- `PUT /api/workbench/todos/{todo_id}`
- `DELETE /api/workbench/todos/{todo_id}`

`PUT /api/workbench/todos/{todo_id}` 需要明确支持更新：

- `text`
- `priority`
- `due_date`
- `completed`

#### 4.2 Reorder API

新增一个明确的批量重排接口：

- `POST /api/workbench/todos/reorder`

请求体：

```json
{
  "ordered_ids": ["todo_1", "todo_2", "todo_3"]
}
```

约束：

- 只接受当前用户的未完成任务 id；
- `ordered_ids` 必须覆盖当前未完成列表中的全部可排序项；
- 服务端将它们重写成连续 `sort_order`。

不采用“单条 move before/after”接口，避免前后端都要处理更多插入位置边界。

#### 4.3 Create Semantics

新建未完成任务时：

- 自动分配到未完成列表尾部；
- `sort_order = 当前未完成列表最大值 + 1`

这样创建与拖拽顺序不会互相打架。

### 5. Frontend State Behavior

前端 [workbenchApi.ts](/home/vimalinx/Projects/VibeLifes/VibeLife/frontend/src/utils/workbenchApi.ts) 需要补：

- `reorderTodos(orderedIds: string[])`

前端列表交互建议：

- 行内编辑、优先级、日期修改采用“局部 optimistic + 失败回滚”；
- 拖拽排序在释放时提交批量重排请求；
- 单项失败只回滚该项，不刷新整个面板。

### 6. Error Handling

#### 6.1 Text Update Failure

- 恢复旧文本；
- 给轻量错误提示；
- 不影响其他条目。

#### 6.2 Priority / Due Date Failure

- 恢复旧值；
- 不全量刷新整个列表。

#### 6.3 Complete Failure

- 条目留在未完成区；
- 不误移到已完成区。

#### 6.4 Reorder Failure

- 还原拖拽前顺序；
- 提示排序保存失败。

### 7. Testing Strategy

#### 7.1 Backend

至少覆盖：

- 旧数据补齐 `sort_order`；
- 创建任务时自动放到末尾；
- 批量重排写入正确 `sort_order`；
- 只允许重排未完成任务；
- 标记完成后写 `completed_at`；
- 删除任务。

#### 7.2 Frontend

至少覆盖：

- 行内文本编辑；
- 优先级切换；
- 截止时间修改；
- 完成按钮；
- 删除按钮；
- 拖拽排序；
- 已完成折叠区显示。

#### 7.3 End-To-End

贯通用例：

1. 打开 `我的Todo`
2. 修改一条文本
3. 修改优先级
4. 修改截止时间
5. 拖拽调整顺序
6. 标记其中一条完成
7. 删除另一条任务
8. 刷新页面后顺序和状态仍正确

## Architecture Boundaries

- [WorkbenchProjectPanel.tsx](/home/vimalinx/Projects/VibeLifes/VibeLife/frontend/src/components/WorkbenchProjectPanel.tsx)
  - 只负责 Workbench 面板内的交互展示
- [workbenchApi.ts](/home/vimalinx/Projects/VibeLifes/VibeLife/frontend/src/utils/workbenchApi.ts)
  - 只负责 Todo API 调用
- [workbench_routes.py](/home/vimalinx/Projects/VibeLifes/VibeLife/backend/workbench_routes.py)
  - 只负责 Todo 数据读写与排序接口
- [models.py](/home/vimalinx/Projects/VibeLifes/VibeLife/backend/models.py)
  - 只负责新增 `sort_order` 等持久化字段

这能保证 UI、API、数据模型各自边界清楚，后续实现计划也能分步落下。
