# FlowStudy 开发进度存档

**更新时间**: 2025-12-27
**当前分支**: main
**领先远程**: 25 个提交

---

## ✅ 已完成功能 (2025-12-27)

### 📝 笔记系统优化 (高优先级)

#### 1. 标签系统 (commit `cd07121`)
- ✨ TagInput 组件：支持添加/删除标签
- ✨ TagCloud 组件：可视化展示标签，大小反映使用频率
- 🔍 标签筛选：点击标签快速筛选笔记
- 🔌 后端 API：完整的标签 CRUD 操作
- 📊 标签统计：获取所有标签及使用次数

**技术实现**:
- `backend/crud.py`: `get_all_tags()`, `get_files_by_tag()`, `add_tag_to_file()`, `remove_tag_from_file()`
- `backend/main.py`: 4 个标签相关 API 端点
- `frontend/src/components/TagInput.jsx`: 标签输入组件
- `frontend/src/components/TagCloud.jsx`: 标签云组件

#### 2. 双向链接面板 (commit `d81bfed`)
- ✨ BacklinksPanel 组件：显示引用关系
- 🔗 反向链接：显示哪些笔记引用了当前笔记
- 🔗 正向链接：显示当前笔记引用了哪些笔记
- 🎨 红色主题显示反向链接，蓝色主题显示正向链接
- 📂 可折叠设计，支持动画效果
- 🖱️ 点击链接直接跳转到目标笔记

**技术实现**:
- `backend/crud.py`: `get_backlinks()`, `get_all_links_in_note()`
- `backend/main.py`: `/api/notes/backlinks`, `/api/notes/links`
- `frontend/src/components/BacklinksPanel.jsx`: 链接面板组件
- 搜索模式：`[[note:note_id]]`

#### 3. 全文搜索 (commit `d81bfed`)
- ✨ NoteSearch 组件：实时搜索笔记
- ⚡ 300ms 防抖，减少 API 调用
- 🎯 相关性评分算法：
  - 标题精确匹配：+100 分
  - 标题开头匹配：+50 分
  - 标题包含：+20 分
  - 内容出现次数：×5
  - 位置权重：前 100 字 +10，前 500 字 +5
- 🖍️ 关键词高亮显示（黄色背景）
- 📄 上下文预览：提取匹配关键词周围的文本
- ⌨️ 快捷键支持：
  - `Ctrl+K` / `Cmd+K`: 聚焦搜索框
  - `Esc`: 关闭搜索结果

**技术实现**:
- `backend/crud.py`: `search_notes()`, `extract_context()`
- `backend/main.py`: `/api/notes/search`
- `frontend/src/components/NoteSearch.jsx`: 搜索组件
- 搜索范围：标题 + 内容

#### 4. 图片粘贴上传 (commit `d81bfed`)
- ✨ 粘贴图片自动上传到服务器
- 📋 监听文本框的 paste 事件
- 🖼️ 自动检测剪贴板中的图片
- ⬆️ 使用 FormData + fetch API 上传
- 📍 在光标位置插入 Markdown 图片语法
- 🔔 Toast 通知：上传中、成功、失败
- 🏷️ 生成 UUID 文件名，避免冲突

**技术实现**:
- `backend/main.py`:
  - 静态文件服务：`app.mount("/uploads", StaticFiles(directory="uploads"))`
  - 上传接口：`POST /api/notes/upload-image`
- `frontend/src/components/NoteEditor.jsx`: 粘贴事件监听器
- 存储位置：`backend/uploads/images/`

#### 5. 侧边栏布局优化 (commits `9540591`, `c8637d7`)
- 🐛 修复 FileExplorer 占满整个侧边栏的问题
- 📏 FileExplorer 高度限制为 35% 视口高度
- 🔄 侧边栏容器支持滚动
- 📦 三个面板（FileExplorer、BacklinksPanel、TagCloud）完整显示
- ⚙️ 优化间距和内边距

**技术实现**:
- `frontend/src/components/FileExplorer.jsx`:
  - 移除 `h-full`
  - 添加 `max-h-[35vh]`
  - 移除底部 padding
- `frontend/src/pages/NotesPage.jsx`:
  - 侧边栏容器：`h-[calc(100vh-10rem)]` + `overflow-y-auto`
  - 面板包装：添加 `shrink-0` 防止压缩

---

## 🎯 记忆卡系统 (Anki)

### 统计图表可视化 (commits `8ea1761`, `8440390`)
- 📊 学习曲线图：展示复习次数趋势
- 📅 日历热力图：GitHub 风格活动记录
- 🎯 主题色：单色系 Indigo 配色方案
- 📈 7 天、30 天、90 天时间段切换

### 视图和管理 (commits `ca093e9`, `5d4d5ec`)
- 👁️ 视图切换：全部卡片 / 待复习 / 已掌握 / 无家可归
- 🔄 支持复习选中的卡片
- 📦 合集视图管理按钮
- 🔧 修复无家可归卡片 API 404 错误

---

## 🚀 待实现功能

### 中优先级

#### 笔记系统
- [ ] 笔记模板系统（每日笔记、会议记录等）
- [ ] 版本历史（查看笔记修改记录）
- [ ] 导出为 PDF/Word
- [ ] 笔记协作和分享
- [ ] 笔记加密（私密笔记）

#### 记忆卡系统
- [ ] 批量导入记忆卡
- [ ] 记忆卡模板
- [ ] 间隔重复算法优化（SM-2）
- [ ] 多媒体卡片支持（音频、视频）

#### 工作台系统
- [ ] 时间块管理
- [ ] 任务优先级排序
- [ ] 番茄钟数据持久化
- [ ] 学习时长统计

### 低优先级

#### 刷题系统
- [ ] 题目收藏夹
- [ ] 错题本导出
- [ ] 学习路径推荐
- [ ] AI 智能出题

---

## 📁 项目结构

```
flowstudy/
├── backend/
│   ├── main.py                 # FastAPI 主入口
│   ├── crud.py                 # 数据库操作
│   ├── models.py               # SQLAlchemy 模型
│   ├── schemas.py              # Pydantic 模型
│   ├── algorithm.py            # 推荐算法
│   ├── export_routes.py        # 导出功能路由
│   ├── workbench_routes.py     # 工作台路由
│   ├── anki_routes.py          # 记忆卡路由
│   ├── collection_routes.py    # 合集路由
│   ├── uploads/                # 上传文件存储
│   │   └── images/             # 笔记图片
│   └── flowstudy.db            # SQLite 数据库
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── NoteEditor.jsx      # 笔记编辑器
│       │   ├── FileExplorer.jsx    # 文件浏览器
│       │   ├── TagInput.jsx        # 标签输入
│       │   ├── TagCloud.jsx        # 标签云
│       │   ├── BacklinksPanel.jsx  # 双向链接面板
│       │   ├── NoteSearch.jsx      # 搜索组件
│       │   ├── AIAssistant.jsx     # AI 助手
│       │   └── ...
│       ├── pages/
│       │   ├── NotesPage.jsx       # 笔记页
│       │   ├── QuizPage.jsx        # 刷题页
│       │   ├── MistakesPage.jsx    # 错题本
│       │   ├── AnkiPage.jsx        # 记忆卡
│       │   ├── WorkbenchPage.jsx   # 工作台
│       │   └── Dashboard.jsx       # 首页
│       └── ...
│
├── docs/
│   ├── QUESTION_SCHEMA.md      # 题目数据格式规范
│   └── PERFORMANCE_OPTIMIZATION.md
│
├── PROGRESS.md                 # 本文档
└── .gitignore                  # Git 忽略规则
```

---

## 🔧 开发环境

### 启动服务
```bash
./start.sh          # 启动所有服务
./start.sh stop     # 停止服务
./start.sh restart  # 重启服务
./start.sh status   # 查看状态
```

### 服务地址
- 后端 API: http://localhost:8000
- 前端界面: http://localhost:5173
- API 文档: http://localhost:8000/docs

### 日志文件
- 后端日志: `logs/backend.log`
- 前端日志: `logs/frontend.log`

---

## 📊 数据统计

### 当前数据量（估算）
- 笔记数量：持续增长中
- 记忆卡：数百张
- 错题记录：数十条
- 标签：数十个

### Git 提交历史
- 总提交数：26+ (领先远程)
- 最近活跃：2025-12-27
- 主要贡献者：AI + Human 协作

---

## 🎨 设计规范

### 配色方案
- **Anki 统计**: Indigo 单色系
- **笔记链接**: 蓝色 (`text-blue-500`)
- **反向链接**: 红色 (`text-red-500`)
- **搜索高亮**: 黄色 (`bg-yellow-200`)

### 动画效果
- **Framer Motion**: Spring 过渡，stiffness=120, damping=20
- **悬停动画**: 0.2s easeOut
- **加载动画**: Pulse 骨架屏

---

## 🚀 下一步计划

### 短期目标（1-2 周）
1. **笔记模板系统**: 实现每日笔记、会议记录等预设模板
2. **记忆卡批量导入**: 从 CSV/Excel 批量导入记忆卡
3. **工作台时间块**: 完善时间管理和任务系统

### 中期目标（1 个月）
1. **版本历史**: 笔记修改记录和回滚
2. **学习路径**: 基于知识图谱的智能推荐
3. **协作功能**: 笔记分享和多人编辑

### 长期目标（3 个月）
1. **移动端适配**: 响应式设计优化
2. **离线支持**: PWA + Service Worker
3. **AI 集成**: GPT-4 API 智能问答

---

## 📝 注意事项

### Git 使用
- ✅ 已忽略运行时文件（.pids/, *.db）
- ✅ 提交前检查：不要包含数据库和进程文件
- ⚠️ 推送前确认：`git push origin main`

### 数据备份
- 定期备份 `backend/flowstudy.db`
- 使用导出功能备份笔记和记忆卡
- `GET /api/data/export/all` 导出所有数据

### 性能优化
- 已实现代码分割和懒加载
- 已实现 API 请求缓存（5 分钟）
- 已实现虚拟滚动优化长列表
- 预览区使用 React.memo 防抖渲染

---

**祝明天开发愉快！🎉**

*最后更新: 2025-12-27 晚上*
