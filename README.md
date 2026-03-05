# FlowStudy

> 智能学习管理平台 - 刷题 · 笔记 · 错题本 · 记忆卡

[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ 项目简介

**FlowStudy** 是一个功能完善的智能学习管理平台，采用前后端分离架构，致力于提供高效的学习体验和知识管理解决方案。

### 核心理念

- **四件套打通** - 题目、笔记、错题、记忆卡智能关联
- **错题驱动** - "错题本就是题库"理念
- **科学复习** - SM-2 间隔重复算法
- **知识生态** - 双向链接、标签系统、全文搜索

---

## 🎯 核心功能

### 1. 智能刷题系统

- **智能推荐算法** - 基于用户画像和错题统计个性化推荐
- **多题型支持** - 单选、多选、填空、证明、问答
- **错题自动入库** - 答错题目自动进入错题本
- **实时反馈** - 即时判分，显示解析
- **题目收藏** - 收藏重点题目

### 2. 笔记管理系统

- **Markdown 编辑器** - 支持 LaTeX 公式、代码高亮
- **双向链接** - 类似 RoamResearch 的 `[[note:id]]` 引用
- **标签系统** - 可视化标签云、智能筛选
- **文件夹管理** - 层级结构、拖拽整理
- **全文搜索** - 实时搜索、关键词高亮、上下文预览
- **图片上传** - 粘贴即上传

### 3. 错题本系统

- **熟练度追踪** - 0-100 分值，动态更新
- **错题历史** - 完整答题历史记录
- **关联笔记** - 手动关联笔记，深度复习
- **知识生态面板** - 查看关联题目、卡片、笔记
- **统计分析** - 多维度数据可视化

### 4. Anki 记忆卡系统

- **SM-2 算法** - 科学的间隔重复算法
- **多种视图** - 全部/待复习/已掌握/无家可归
- **统计图表** - 学习曲线、日历热力图
- **合集管理** - 按主题组织卡片
- **批量复习** - 高效复习模式

### 5. 学习工作台

- **番茄钟计时** - 专注计时、自适应休息
- **任务列表** - 待办事项管理
- **学习统计** - 会话记录、数据追踪
- **错题备忘** - 快速记录错题思路

### 6. AI 智能导入

- **一键导入** - 题目 + 笔记 + 解析 + 记忆卡
- **自动关联** - 智能建立知识关联
- **JSON 格式** - 标准化数据格式
- **批量导入** - 支持大量题目导入

### 7. 数据管理

- **数据导出** - 题库/错题/笔记/完整备份
- **数据导入** - 从备份恢复数据
- **数据统计** - 实时数据统计
- **版本控制** - 数据格式版本管理

### 8. 学习仪表盘

- **学习热力图** - GitHub 风格活动热力图
- **今日统计** - 学习时长、完成题目、笔记数等
- **断点续学** - 智能跳转上次学习位置
- **快捷入口** - 一键访问各功能模块

---

## 🚀 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2.0 | 前端框架 |
| Vite | 7.2.4 | 构建工具 |
| React Router | 7.9.6 | 路由管理 |
| Axios | 1.13.2 | HTTP 客户端 |
| Framer Motion | 12.23.24 | 动画库 |
| Tailwind CSS | 3.4.17 | 样式框架 |
| React Markdown | 10.1.0 | Markdown 渲染 |
| Recharts | 3.6.0 | 数据可视化 |
| React Window | 2.2.3 | 虚拟滚动 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.104+ | Web 框架 |
| Uvicorn | 0.24+ | ASGI 服务器 |
| SQLAlchemy | 2.0+ | ORM |
| Pydantic | 2.0+ | 数据验证 |
| SQLite | 3 | 数据库 |

---

## 📦 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **Python**: >= 3.10
- **操作系统**: Linux / macOS / WSL2

### 一键启动（推荐）

```bash
# 克隆项目
git clone <repository-url>
cd flowstudy

# 赋予启动脚本执行权限
chmod +x start.sh

# 启动服务（自动安装依赖）
./start.sh start
```

启动脚本会自动：
1. 检查环境（Node.js、Python）
2. 创建 Python 虚拟环境
3. 安装前后端依赖
4. 启动后端服务（端口 8000）
5. 启动前端服务（端口 5173）

### 访问地址

- **前端界面**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

### 手动启动

如果需要手动启动：

```bash
# 后端
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py

# 前端（新终端）
cd frontend
npm install
npm run dev
```

### 启动脚本命令

```bash
./start.sh start    # 启动服务
./start.sh stop     # 停止服务
./start.sh restart  # 重启服务
./start.sh status   # 查看状态
./start.sh logs     # 查看日志
./start.sh setup    # 仅设置环境
./start.sh clean    # 清理环境
```

详细说明请查看 [SCRIPT_GUIDE.md](docs/SCRIPT_GUIDE.md)

---

## 📁 项目结构

```
flowstudy/
├── backend/                 # Python FastAPI 后端
│   ├── main.py             # 主入口（875行）
│   ├── models.py           # 数据库模型
│   ├── crud.py             # CRUD 操作
│   ├── algorithm.py        # 智能推荐算法
│   ├── anki_algorithm.py   # SM-2 算法
│   ├── schemas.py          # 数据验证
│   ├── export_routes.py    # 导出导入路由
│   ├── workbench_routes.py # 工作台路由
│   ├── anki_routes.py      # 记忆卡路由
│   └── flowstudy.db        # SQLite 数据库
│
├── frontend/               # React + Vite 前端
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   │   ├── Dashboard.jsx
│   │   │   ├── QuizPage.jsx
│   │   │   ├── NotesPage.jsx
│   │   │   ├── MistakeVaultPage.jsx
│   │   │   ├── AnkiPage.jsx
│   │   │   ├── WorkbenchPage.jsx
│   │   │   ├── AIImportPage.jsx
│   │   │   └── DataManagementPage.jsx
│   │   ├── components/    # 可复用组件
│   │   ├── context/       # React Context
│   │   ├── hooks/         # 自定义 Hooks
│   │   └── utils/         # 工具函数
│   └── package.json
│
├── docs/                  # 项目文档
│   ├── IMPORT_EXPORT_GUIDE.md
│   ├── KNOWLEDGE_INTEGRATION.md
│   ├── AI_IMPORT_SCHEMA.md
│   └── PERFORMANCE_OPTIMIZATION.md
│
├── examples/              # 示例数据
│   └── sample_questions.json
│
├── logs/                  # 运行日志
├── start.sh              # 一键启动脚本
├── QUESTION_SCHEMA.md    # 题目格式规范
└── README.md             # 本文件
```

---

## 🗄️ 数据库设计

### 核心表

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `questions` | 题库 | id, subject, type, stem, options, answer, solution, tags |
| `files` | 笔记文件 | id, type, name, parent_id, content, tags |
| `mistakes` | 错题本 | id, question_id, user_answer, mastery, history, linked_note_id |
| `flashcards` | 记忆卡 | id, front, back, tags, ease_factor, interval, next_review_date |
| `user_profiles` | 用户画像 | user_id, level, tag_weights |
| `study_sessions` | 学习会话 | id, duration, mode, tasks_completed |
| `todo_items` | 待办事项 | id, text, completed, priority, subject |
| `collections` | 合集 | id, name, description |

详细数据库设计请查看 [backend/models.py](backend/models.py)

---

## 🔌 API 文档

### 刷题相关

- `GET /api/quiz/recommend` - 获取推荐题目
- `POST /api/quiz/submit` - 提交答案
- `GET /api/favorites` - 获取收藏列表
- `POST /api/favorites/toggle` - 收藏/取消收藏

### 笔记相关

- `GET /api/notes/view` - 获取笔记详情
- `POST /api/notes/create` - 创建笔记
- `POST /api/notes/save` - 保存笔记
- `GET /api/notes/search` - 全文搜索
- `GET /api/notes/backlinks` - 反向链接
- `POST /api/notes/upload-image` - 上传图片

### 错题本相关

- `GET /api/mistakes` - 获取错题列表
- `POST /api/mistakes/review` - 复习错题
- `POST /api/mistakes/link_note` - 关联笔记
- `GET /api/mistakes/{id}/related` - 关联内容

### 记忆卡相关

- `GET /api/anki/cards` - 获取所有卡片
- `POST /api/anki/cards` - 创建卡片
- `POST /api/anki/review` - 提交复习
- `GET /api/anki/stats` - 统计数据

### 数据管理

- `GET /api/data/export/questions` - 导出题库
- `GET /api/data/export/all` - 导出全部数据
- `POST /api/data/import/questions` - 导入题目
- `GET /api/data/stats` - 数据统计

完整 API 文档访问：http://localhost:8000/docs

---

## 🎨 性能优化

项目进行了多项性能优化，显著提升用户体验：

| 优化项 | 优化前 | 优化后 | 提升 |
|--------|--------|--------|------|
| 首屏加载 | 3s | 1.5s | ⬇️ 50% |
| Bundle 体积 | 800KB | 300KB | ⬇️ 60% |
| 长列表渲染 | 800ms | 50ms | ⬇️ 94% |
| API 重复请求 | 200ms | <10ms | ⬇️ 95% |

**优化技术**：
- 代码分割和懒加载
- React.memo 性能优化
- API 请求缓存（5分钟）
- 虚拟滚动（React Window）
- 骨架屏加载
- Error Boundary 错误边界

详细内容请查看 [docs/PERFORMANCE_OPTIMIZATION.md](docs/PERFORMANCE_OPTIMIZATION.md)

---

## 💡 特色功能

### 1. 四件套打通

题目、笔记、错题、记忆卡之间建立智能关联：

```
AI导入 → 题目库 → 刷题 → 错题本 → 笔记 → 记忆卡 → 复习
  ↑                                              ↓
  └──────── 智能推荐 ← 熟练度更新 ←──────────────┘
```

**实现方式**：
- 题目可关联笔记（AI 自动生成或手动关联）
- 笔记可生成记忆卡（一键创建）
- 错题可关联笔记（手动关联深度复习）
- 错题可推荐生成记忆卡（基于错题内容）

**知识生态面板**：一站式查看所有关联内容

详细说明请查看 [docs/KNOWLEDGE_INTEGRATION.md](docs/KNOWLEDGE_INTEGRATION.md)

### 2. 智能推荐算法

基于用户画像和错题统计的个性化推荐：

**核心参数**：
- **ALPHA = 0.5** - 基础激进系数
- **BETA_NORMAL = 0.6** - 正常掌握衰减
- **BETA_HESITATE = 0.85** - 犹豫衰减
- **MULT_KNOWLEDGE = 1.0** - 知识标签权重
- **MULT_COGNITIVE = 1.5** - 思维错误权重

**评分因素**：
- 标签权重匹配度
- 难度适配性
- 用户能力水平
- 错题熟练度

### 3. SM-2 间隔重复算法

科学记忆算法，优化复习效率：

```python
# 核心公式
new_interval = interval * ease_factor
new_ease_factor = max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
```

**特性**：
- 动态调整复习间隔
- 个性化难度因子
- 追踪重复次数
- 预测复习时间

### 4. 双向链接系统

类似 RoamResearch 的笔记引用：

**语法**：`[[note:note_id]]`

**功能**：
- 正向链接面板（引用的笔记）
- 反向链接面板（被引用的笔记）
- 自动提取链接
- 快速跳转

### 5. 全文搜索

实时、智能、高效：

**特性**：
- 300ms 防抖优化
- 相关性评分算法
- 关键词高亮显示
- 上下文预览
- 快捷键支持（Ctrl+K）

**评分算法**：
```python
score = (
    title_matches * 3 +
    content_matches * 1 +
    tag_matches * 2
) / (doc_length ** 0.5)
```

---

## 📖 使用指南

### 刷题流程

1. 访问"智能刷题"页面
2. 系统根据用户画像推荐题目
3. 答题后即时反馈
4. 错题自动进入错题本
5. 查看解析，理解错题

### 笔记管理

1. 访问"随手笔记"页面
2. 创建新笔记或选择文件夹
3. 使用 Markdown 编辑内容
4. 添加标签，建立双向链接
5. 粘贴图片自动上传

### 错题复习

1. 访问"错题本"页面
2. 查看错题列表（按熟练度排序）
3. 关联笔记深度复习
4. 答题更新熟练度
5. 查看知识生态面板

### 记忆卡复习

1. 访问"记忆卡"页面
2. 查看"待复习"卡片
3. 点击"开始复习"
4. 根据记忆程度评分（1-5分）
5. 算法自动计算下次复习时间

### AI 导入

1. 访问"AI 导入题目"页面
2. 准备 JSON 格式数据
3. 上传文件或粘贴内容
4. 系统自动导入题目+笔记+解析+记忆卡
5. 建立知识关联

详细数据格式请查看 [QUESTION_SCHEMA.md](QUESTION_SCHEMA.md)

### 数据管理

1. 访问"数据管理"页面
2. 选择导出类型（题库/错题/笔记/全部）
3. 点击导出，下载 JSON 文件
4. 导入时选择对应文件
5. 系统自动验证并导入

---

## 🛠️ 开发指南

### 目录规范

```
frontend/src/
├── pages/         # 页面组件（每个路由一个文件）
├── components/    # 可复用组件（按功能分类）
├── context/       # React Context（全局状态）
├── hooks/         # 自定义 Hooks
└── utils/         # 工具函数
```

### 命名规范

- **组件**: PascalCase（如 `NoteEditor.jsx`）
- **文件**: camelCase 或 kebab-case（如 `noteUtils.js`）
- **变量**: camelCase（如 `userName`）
- **常量**: UPPER_CASE（如 `API_BASE_URL`）

### 代码风格

- 使用 ESLint 进行代码检查
- 遵循 Airbnb JavaScript Style Guide
- 组件使用函数式组件 + Hooks
- 优先使用 TypeScript（如需要）

### 提交规范

```bash
# 功能新增
git commit -m "feat: 添加XXX功能"

# 问题修复
git commit -m "fix: 修复XXX问题"

# 性能优化
git commit -m "perf: 优化XXX性能"

# 文档更新
git commit -m "docs: 更新XXX文档"

# 代码重构
git commit -m "refactor: 重构XXX模块"
```

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [QUESTION_SCHEMA.md](QUESTION_SCHEMA.md) | 题目数据格式规范 |
| [docs/SCRIPT_GUIDE.md](docs/SCRIPT_GUIDE.md) | 启动脚本完整指南 |
| [docs/IMPORT_EXPORT_GUIDE.md](docs/IMPORT_EXPORT_GUIDE.md) | 数据导入导出指南 |
| [docs/KNOWLEDGE_INTEGRATION.md](docs/KNOWLEDGE_INTEGRATION.md) | 四件套打通总结 |
| [docs/AI_IMPORT_SCHEMA.md](docs/AI_IMPORT_SCHEMA.md) | AI 导入数据格式 |
| [docs/PERFORMANCE_OPTIMIZATION.md](docs/PERFORMANCE_OPTIMIZATION.md) | 性能优化文档 |

---

## 🐛 故障排查

### 问题：端口被占用

```bash
# 查看占用端口的进程
lsof -i :8000  # 后端
lsof -i :5173  # 前端

# 杀死进程
kill -9 <PID>
```

### 问题：依赖安装失败

```bash
# 清理缓存重新安装
cd frontend
rm -rf node_modules package-lock.json
npm install

cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 问题：数据库错误

```bash
# 删除旧数据库重新初始化
cd backend
rm flowstudy.db
python main.py  # 会自动创建新数据库
```

### 问题：启动脚本无权限

```bash
# 赋予执行权限
chmod +x start.sh
```

更多问题请查看 [docs/SCRIPT_GUIDE.md](docs/SCRIPT_GUIDE.md)

---

## 💡 想法管理

### 已完成 ✅

- [x] 智能刷题系统
- [x] 笔记管理系统
- [x] 错题本系统
- [x] Anki 记忆卡系统
- [x] 学习工作台
- [x] AI 智能导入
- [x] 想法管理系统
- [x] 数据管理
- [x] 性能优化
- [x] 四件套打通
- [x] 想法管理系统

### 计划中 🚧

- [ ] 用户认证系统
- [ ] 多用户支持
- [ ] 移动端适配
- [ ] PWA 支持
- [ ] 笔记模板系统
- [ ] 版本历史
- [ ] 导出 PDF/Word
- [ ] 拍照识题（OCR）
- [ ] AI 智能出题
- [ ] 离线支持
- [ ] 数据云同步

---

## 📋 项目管理

本项目采用专业化的Git管理和开发流程:

### 核心理念

- **想法优先 - 所有想法都记录在 [IDEAS.md](IDEAS.md)
- **RFC驱动** - 重要功能先写RFC讨论([RFC模板](docs/RFC_TEMPLATE.md))
- **小步快跑** - 频繁提交,及时合并
- **文档同步** - 代码和文档一起更新

### 快速开始

```bash
# 1. 记录想法
echo "- [ ] 我的新想法" >> IDEAS.md

# 2. 大功能写RFC
./scripts/rfc.sh my-feature

# 3. 开始开发
./scripts/feature-branch.sh my-feature

# 4. 提交代码
git add .
git commit -m "feat: 添加XXX功能"
git push
```

### 文档导航

| 文档 | 说明 |
|------|------|
| [PROJECT_MANAGEMENT.md](PROJECT_MANAGEMENT.md) | 项目管理总指南 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 贡献指南 |
| [IDEAS.md](IDEAS.md) | 想法清单 |
| [CHANGELOG.md](CHANGELOG.md) | 变更日志 |
| [docs/GIT_WORKFLOW_GUIDE.md](docs/GIT_WORKFLOW_GUIDE.md) | Git工作流完整指南 |
| [docs/RFC_TEMPLATE.md](docs/RFC_TEMPLATE.md) | RFC文档模板 |
| [docs/DIRECTORY_STRUCTURE.md](docs/DIRECTORY_STRUCTURE.md) | 目录结构说明 |

### 开发脚本

```bash
./scripts/feature-branch.sh <name>  # 创建功能分支
./scripts/rfc.sh <name>              # 创建RFC文档
./scripts/changelog.sh               # 生成变更日志
```

### 分支策略

采用 GitHub Flow 简化版:
- `main` - 生产分支
- `feature/*` - 功能开发
- `rfc/*` - RFC讨论
- `bugfix/*` - Bug修复
- `hotfix/*` - 紧急修复

### 提交规范

遵循 Conventional Commits:
- `feat:` - 新功能
- `fix:` - Bug修复
- `docs:` - 文档更新
- `refactor:` - 重构
- `perf:` - 性能优化
- `test:` - 测试
- `chore:` - 构建/工具

示例:
```bash
git commit -m "feat(printer): 添加B5格式PDF生成"
git commit -m "fix(auth): 修复登录时token过期问题"
```

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 贡献流程

1. 查看 [IDEAS.md](IDEAS.md) 寻找灵感或提出新想法
2. 大功能先创建RFC讨论 (使用 `./scripts/rfc.sh`)
3. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
4. 提交更改 (`git commit -m 'feat: 添加某个功能'`)
5. 推送到分支 (`git push origin feature/AmazingFeature`)
6. 开启 Pull Request (使用[PR模板](.github/PULL_REQUEST_TEMPLATE.md))
7. 等待代码审查和合并

### 问题反馈

- 提交 Issue 前请先搜索现有问题
- 使用 [Issue模板](.github/ISSUE_TEMPLATE/) 报告问题或请求功能
- 详细描述问题和复现步骤
- 提供运行环境信息（OS、Node.js 版本等）

详细贡献指南请查看 [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 👨‍💻 作者

- **Chesten** - 项目维护者

---

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/) - 现代化的 Python Web 框架
- [React](https://react.dev/) - 用于构建用户界面的 JavaScript 库
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Framer Motion](https://www.framer.com/motion/) - React 动画库
- [SM-2 Algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2) - 间隔重复算法

---

## 📮 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 [Issue](https://github.com/yourusername/flowstudy/issues)
- 发送邮件至 your.email@example.com

---

<div align="center">

**如果觉得这个项目有帮助，请给一个 ⭐️ Star！**

Made with ❤️ by Chesten

</div>
