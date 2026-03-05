# FlowStudy 项目系统提示

你正在协助开发 **FlowStudy** - 一个智能学习管理系统。

## 🎯 项目概览

**技术栈**:
- 后端: Python FastAPI + SQLite
- 前端: React 19 + Vite + Tailwind CSS
- AI: 集成AI讲解、知识图谱、智能推荐

**项目结构**:
```
flowstudy/
├── backend/           # FastAPI后端
│   ├── ai_routes.py          # AI功能API
│   ├── related_routes.py     # 关联推荐API
│   └── knowledge_graph.py    # 知识图谱构建
├── frontend/          # React前端
│   └── src/
│       ├── components/       # React组件
│       ├── pages/           # 页面组件
│       └── context/         # React Context
├── docs/              # 项目文档
└── .claude/           # Claude配置
```

---

## 📚 必读文档

### 1. Git工作流指南

**每次Git操作前，请参考**: `docs/AI_GIT_PROMPTS.md`

**核心原则**:
- ✅ 用户用自然语言描述需求
- ✅ AI自动选择合适的Git命令
- ✅ 提供清晰的步骤说明
- ✅ 危险操作要求确认

**常用场景**:
- 开始新功能: "从main创建feature/xxx分支"
- 提交代码: "帮我提交修改，写规范的commit message"
- 解决冲突: "帮我解决合并冲突"
- 查看状态: "检查Git状态，用中文告诉我当前情况"

### 2. 其他重要文档

- `README.md` - 项目说明
- `docs/GIT_WORKFLOW_GUIDE.md` - 完整Git工作流
- `docs/PERFORMANCE_OPTIMIZATION.md` - 性能优化指南
- `QUESTION_SCHEMA.md` - 题目数据格式规范

---

## 🎨 代码规范

### Commit Message规范

```bash
格式: <type>(<scope>): <subject>

类型:
- feat: 新功能
- fix: 修复bug
- perf: 性能优化
- refactor: 重构
- docs: 文档更新
- chore: 构建/工具变更

示例:
feat(auth): 添加JWT用户登录功能
fix(api): 修复知识图谱构建崩溃
perf: 实现虚拟滚动优化长列表性能
```

### React组件规范

- 使用函数组件 + Hooks
- 组件文件名用PascalCase (如 `KnowledgePanel.jsx`)
- 使用 `.jsx` 扩展名
- 导出组件时添加displayName (如果使用memo)

### Python代码规范

- 使用类型注解
- API路由使用清晰的路由前缀
- 错误处理要完整

---

## 🚀 开发流程

### 开发新功能
1. 从main创建feature分支
2. 开发并测试
3. 提交代码（规范commit message）
4. 推送到远程
5. 创建Pull Request

### 修复Bug
1. 从main创建hotfix/bugfix分支
2. 修复并测试
3. 提交并推送
4. 合并到main

### 紧急修复
1. 使用git stash保存当前工作
2. 创建hotfix分支
3. 修复并合并
4. 恢复之前的工作

---

## ⚠️ 重要注意事项

### Git操作
- **不要**在main分支直接开发
- **必须**先创建分支再开发
- **不要**使用 `git push -f` 除非明确告知风险
- **必须**写清晰的commit message

### 代码质量
- 提交前确保代码可以运行
- 不要提交node_modules、venv等
- 测试核心功能后再提交

### 文件操作
- 使用专用工具（Read/Edit/Write）而非Bash
- 编辑文件前必须先Read
- 避免重复创建已存在的文件

---

## 🎯 当前项目状态

### 已完成功能
- ✅ 用户数据隔离
- ✅ 复合题练习模式
- ✅ 知识面板（SmartKnowledgePanel）
- ✅ AI讲解功能
- ✅ 错题本系统
- ✅ 记忆卡系统
- ✅ 学习统计和热力图
- ✅ 自适应番茄钟
- ✅ 音乐播放器

### 当前分支
- main: 主分支（稳定版本）
- feature/*: 功能分支
- feature/knowledge-graph: 知识图谱可视化（已暂停）

### 待开发功能
- [ ] OCR拍照识题
- [ ] AI智能推荐学习路径
- [ ] 协作学习功能

---

## 💡 与用户交互的最佳实践

1. **理解意图优先** - 用户说"帮我提交代码"时，先查看改动再提交
2. **主动解释** - 执行操作前说明会做什么、有什么影响
3. **使用TodoWrite** - 复杂任务使用TodoWrite跟踪进度
4. **分步确认** - 危险操作（rebase、reset、force push）先列出计划确认
5. **提供选择** - 遇到多种方案时，用AskUserQuestion让用户选择

---

**最后更新**: 2026-01-05
**维护者**: Chesten
