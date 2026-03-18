# Knowledge Workshop Design

**Date:** 2026-03-18

## Context

[QuickCapturePage.tsx](/home/vimalinx/Projects/VibeLifes/VibeLife/frontend/src/pages/QuickCapturePage.tsx) 目前还是“随手笔记采集”页：左边一个导入表单，右边一个入库列表和向量检索结果。后端 [quick_capture_routes.py](/home/vimalinx/Projects/VibeLifes/VibeLife/backend/quick_capture_routes.py) 已经具备：

- 采集内容入库；
- 简单元数据抽取；
- 向量索引；
- 列表与搜索。

但它还不满足用户真正要的工作流。用户要的是一个独立的“知识工作室”页面：

- 背后是一套统一知识库；
- 页面左侧能切 `收集内容` / `生成内容`；
- 同时支持按 `项目`、`类别` 浏览；
- 导入后能围绕内容和 AI 讨论；
- 讨论结果默认不自动落库，只在用户确认时保存成生成笔记。

用户还明确了边界：

- 这个知识工作室页面与项目页不做联动；
- 第一版导入只做：
  - 纯文本；
  - 网页链接；
  - `PDF / doc / md / txt`；
  - 图片；
- 不做音视频。

## Goal

把 `/quick-capture` 升级成一个真正可用的知识工作室，让用户可以：

1. 把文本 / 链接 / 文档 / 图片导入统一知识库；
2. 用 `收集内容` / `生成内容` 两种视角浏览同一套知识库；
3. 用 `项目`、`类别` 进一步筛选内容；
4. 围绕单条内容或当前筛选结果与 AI 讨论；
5. 手动选择把讨论结果保存为生成笔记或追加到已有生成笔记。

## Non-Goals

- 这一轮不重写 [NotesPage.tsx](/home/vimalinx/Projects/VibeLifes/VibeLife/frontend/src/pages/NotesPage.tsx)。
- 这一轮不做知识工作室与项目页的跳转或数据联动。
- 这一轮不做自动落库。
- 这一轮不做音视频导入。
- 这一轮不做文件夹批量导入。
- 这一轮不做“全量知识图谱 / 自动关系抽取”。

## User-Approved Scope

- 路由仍然是独立页面，不和项目页绑定；
- 背后统一知识库；
- 左侧至少有：
  - `收集内容`
  - `生成内容`
  - `项目`
  - `类别`
- AI 写回采用保守策略：
  - 讨论完成后只给保存动作；
  - 不自动落库。

## Approaches Considered

### Approach A: 直接升级 Quick Capture

保留 `/quick-capture`，直接把它升级成知识工作室。

Pros:

- 最大化复用现有采集、入库、检索链路；
- 改动集中；
- 最符合“独立笔记界面”的要求。

Cons:

- 需要把 `Quick Capture` 语义从“采集页”升级成“知识页”；
- 需要给现有采集模型增加生成内容与讨论保存能力。

### Approach B: 并进 NotesPage

把知识导入、浏览、AI 讨论都塞进 [NotesPage.tsx](/home/vimalinx/Projects/VibeLifes/VibeLife/frontend/src/pages/NotesPage.tsx)。

Pros:

- 理论上入口更统一。

Cons:

- 会把当前 Notes 页现有笔记树、编辑器、标签、拖拽逻辑一起卷进来；
- 范围明显扩大。

### Approach C: 另起新知识库系统

新建页面、新接口、新数据模型，不复用现有 quick-capture。

Pros:

- 边界看起来最干净。

Cons:

- 成本最高；
- 重复造已有能力；
- 不符合当前代码库的渐进式改造方向。

## Decision

选择 **Approach A: 直接升级 Quick Capture**。

这是最稳妥的路径：保留现有采集和搜索基础，把页面升级成用户真正想要的“知识工作室”，同时避免把 [NotesPage.tsx](/home/vimalinx/Projects/VibeLifes/VibeLife/frontend/src/pages/NotesPage.tsx) 一起拖进这轮改造。

## Design

### 1. Page Structure

知识工作室页面固定为三栏：

- 左栏：视图与筛选
- 中栏：统一知识库浏览区
- 右栏：AI 讨论区

#### 1.1 左栏

左栏职责只做“决定看什么”，不负责编辑内容。

固定包含：

- 主视图切换：
  - `收集内容`
  - `生成内容`
- 筛选块：
  - `项目`
  - `类别`

这些都只是同一套知识库的不同视角，不是分库。

#### 1.2 中栏

中栏显示当前视图 + 当前筛选下的内容流。

每条内容卡片至少展示：

- 标题；
- 摘要；
- 来源类型；
- 标签；
- 项目；
- 类别；
- 更新时间。

点中一条后：

- 中栏进入详情态；
- 右栏默认切到围绕这条内容讨论。

#### 1.3 右栏

右栏只负责 AI 讨论与人工沉淀。

支持两种讨论上下文：

- `entry`：围绕当前选中单条内容；
- `selection`：围绕当前筛选结果集合。

讨论结束后只提供三个动作：

- `保存为生成笔记`
- `追加到现有生成笔记`
- `仅保留对话`

### 2. Unified Knowledge Model

当前 quick-capture 保存的是采集记录，这一轮要把它升级成统一知识条目，但仍然使用同一张表 / 同一套存储。

需要补清的语义字段：

- `content_kind`
  - `collected`
  - `generated`
- `category`
  - 用户自定义分类；
- `source_capture_ids`
  - `string[]`；
  - 单条来源时为单元素数组；
  - 集合来源时为来源条目 id 列表；
- `source_filter_snapshot`
  - JSON；
  - 保存当次集合讨论时的筛选条件；
- `discussion_metadata`
  - JSON；
  - 记录讨论模式、保存时间、摘要级上下文。

明确不使用单一 `origin_capture_id` 来同时表达“单条来源”和“集合来源”，因为它无法承载集合讨论的来源追踪。

#### 2.1 单条来源保存

当生成内容来自单条收集内容时：

- `source_capture_ids = [selected_entry_id]`
- `source_filter_snapshot = null`

#### 2.2 集合来源保存

当生成内容来自当前筛选结果集合时：

- `source_capture_ids = 当前被纳入上下文的条目 id 列表`
- `source_filter_snapshot = { content_kind, project_id, category, selected_entry_ids? }`

这样单条与集合两种情况都能被稳定追踪。

### 3. Import Flow

#### 3.1 Supported Inputs

第一版支持：

- 纯文本；
- 网页链接；
- `PDF / doc / md / txt`；
- 图片。

第一版不支持：

- 音视频；
- 文件夹批量导入。

#### 3.2 UI Shape

知识工作室里只保留一个统一导入区，包含两层：

- `快速导入`
  - 大输入框：贴文本或链接
  - 拖拽区：拖文件或图片
- `整理导入`
  - 标题
  - 项目
  - 类别
  - 标签

导入成功后统一进入 `收集内容`。

#### 3.3 Extraction Rules

后端内容抽取必须诚实降级，不允许伪造正文：

- 纯文本：直接入库；
- 链接：抓取正文文本前几千字符；
- 文本文档：读取可读文本；
- PDF / doc：优先提取可读文本，失败则退化成资源摘要；
- 图片：第一版允许只保留资源元数据 + 用户补充说明，不承诺高质量识别。

如果无法抽出正文，但用户仍要保留该资源，系统可以入库为资源型 `collected` 条目；摘要必须明确说明这是资源元数据而不是正文。

### 4. Browse And Filter Semantics

过滤规则是叠加的：

1. 先确定 `content_kind`
2. 再按 `project_id`
3. 再按 `category`

默认排序：

- `updated_at desc`
- 若无 `updated_at`，退回 `created_at desc`

搜索结果仍基于统一知识库，只是在返回结果中附带：

- `content_kind`
- `project_id`
- `category`
- `tags`

前端据此保持同一套浏览与筛选体验。

### 5. AI Discussion Contract

这一部分必须给 planning 可执行的精确边界。

#### 5.1 Session Model

第一版采用：

- 前端多轮对话；
- 会话历史只保存在前端本地（例如 user-scoped localStorage）；
- 后端无持久化 chat session；
- 每次请求由前端把必要历史显式提交给后端。

这样能支持多轮讨论，但不引入新的服务器会话状态。

#### 5.2 Request Contract

新增接口：

- `POST /api/knowledge/discuss`

请求体：

```json
{
  "mode": "entry",
  "message": "请帮我提炼要点",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "entry_id": "capture_123"
}
```

或：

```json
{
  "mode": "selection",
  "message": "帮我整理成一篇结构化笔记",
  "history": [],
  "selection": {
    "content_kind": "collected",
    "project_id": "project_alpha",
    "category": "research",
    "selected_entry_ids": ["capture_1", "capture_2", "capture_3"]
  }
}
```

约束：

- `mode=entry` 时必须提供 `entry_id`
- `mode=selection` 时必须提供 `selection`
- `history` 只接受最近 12 条消息

#### 5.3 Context Resolution Rules

`mode=entry`：

- 使用该条目正文 / 正文摘要；
- 正文最长截断到固定字符数；
- 附带标题、标签、项目、类别。

`mode=selection`：

- 服务器按当前筛选条件解析上下文；
- 最多纳入 8 条知识条目；
- 如果前端带了 `selected_entry_ids`，则在筛选条件基础上以这些 id 为上限；
- 每条内容只带：
  - `id`
  - `title`
  - `summary`
  - `tags`
  - `project_id`
  - `category`
- 总上下文长度设置硬上限，超过则截断。

这保证集合讨论是“围绕结果集”，但不会把整个知识库塞进模型。

#### 5.4 Response Contract

响应体：

```json
{
  "reply": "这是讨论结果",
  "context_mode": "selection",
  "citations": [
    {
      "id": "capture_1",
      "title": "文章标题",
      "content_kind": "collected",
      "project_id": "project_alpha",
      "category": "research"
    }
  ],
  "draft": {
    "title": "建议标题",
    "content_markdown": "# 建议草稿",
    "tags": ["总结", "研究"],
    "project_id": "project_alpha",
    "category": "research"
  }
}
```

说明：

- `reply`：当前轮自然语言回复；
- `citations`：本轮实际引用到的知识条目；
- `draft`：供“保存为生成笔记”直接使用的建议草稿；
- `draft` 不代表已经落库。

### 6. Save Generated Content Contract

#### 6.1 Create Generated Entry

新增接口：

- `POST /api/knowledge/generated`

请求体：

```json
{
  "title": "生成笔记标题",
  "content_markdown": "# 生成内容",
  "tags": ["总结"],
  "project_id": "project_alpha",
  "category": "research",
  "source_capture_ids": ["capture_1", "capture_2"],
  "source_filter_snapshot": {
    "content_kind": "collected",
    "project_id": "project_alpha",
    "category": "research",
    "selected_entry_ids": ["capture_1", "capture_2"]
  },
  "discussion_metadata": {
    "mode": "selection",
    "saved_at": "2026-03-18T19:00:00",
    "user_prompt_excerpt": "帮我整理成结构化笔记",
    "assistant_reply_excerpt": "以下是整理后的结构..."
  }
}
```

保存后：

- 创建一条 `content_kind=generated` 知识条目；
- 在 `生成内容` 视图中可见。

#### 6.2 Append To Existing Generated Entry

新增接口：

- `POST /api/knowledge/generated/{entry_id}/append`

请求体：

```json
{
  "content_markdown": "## 新追加段落",
  "tags": ["总结", "复盘"],
  "source_capture_ids": ["capture_5"],
  "source_filter_snapshot": null,
  "discussion_metadata": {
    "mode": "entry",
    "saved_at": "2026-03-18T19:05:00",
    "user_prompt_excerpt": "把这条内容补充进原笔记",
    "assistant_reply_excerpt": "可追加如下段落..."
  }
}
```

规则：

- 追加操作只允许写入 `generated` 条目；
- 追加后更新 `updated_at`；
- 不改原有 `content_kind`。

### 7. API Boundaries

建议保持后端边界清楚：

- [quick_capture_routes.py](/home/vimalinx/Projects/VibeLifes/VibeLife/backend/quick_capture_routes.py)
  - 负责导入、列表、搜索
- `knowledge_routes.py`
  - 负责 AI 讨论、生成保存、生成追加

这样“知识导入”和“知识讨论”不会混在一个路由文件里失控。

### 8. Error Handling

#### 8.1 Import Errors

必须明确区分：

- 链接抓取失败；
- 文件路径不存在；
- 文件类型不支持；
- 文本抽取失败但允许降级入库；
- 最终入库失败。

#### 8.2 Discussion Errors

讨论失败时：

- 不改知识库；
- 保留当前筛选与选中内容；
- 保留已生成但未保存的对话历史；
- 不自动触发保存。

#### 8.3 Save Errors

保存生成内容失败时：

- 右栏对话内容仍保留；
- 用户可以再次保存；
- 不允许前端假装保存成功。

### 9. Testing Strategy

#### 9.1 Backend

至少覆盖：

- `content_kind` 筛选；
- `project_id + category` 联合筛选；
- `entry` 模式讨论上下文；
- `selection` 模式讨论上下文；
- 8 条上下文上限；
- 创建生成内容；
- 追加到已有生成内容；
- 来源追踪字段保存正确。

#### 9.2 Frontend

至少覆盖：

- 左栏 `收集内容 / 生成内容` 切换；
- 项目 / 类别筛选；
- 导入区文本、链接、拖文件交互；
- 中栏从列表切到详情；
- 右栏讨论三种动作：
  - 保存为生成笔记；
  - 追加到现有生成笔记；
  - 仅保留对话。

#### 9.3 End-To-End

贯通用例：

1. 导入一条内容；
2. 在 `收集内容` 中看到它；
3. 发起单条讨论；
4. 保存为生成笔记；
5. 切到 `生成内容`，看到保存结果；
6. 再发起一次讨论并追加到该生成笔记。

## Architecture Boundaries

- `Knowledge Workshop Page`
  - 导入、浏览、讨论、保存入口
- `Quick Capture / Knowledge Listing API`
  - 统一知识条目的 CRUD 子集与搜索
- `Knowledge Discussion API`
  - 只负责上下文组装与讨论结果
- `Generated Save API`
  - 只负责显式写入 `generated` 条目

每个单元都应能独立理解、独立测试。
