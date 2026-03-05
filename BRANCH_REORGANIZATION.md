# 分支重组计划

## 📊 当前分支分析

**当前分支**: `feature/ai-question-enhancement`
**提交数**: 15 个
**问题**: 分支名称和内容不匹配，功能混杂

### 📦 功能分类

#### 1. AI 功能增强（5 个提交）
```
9ff5abb feat(ai): 实现AI讲解面板和自定义API配置
ac58e3b feat(settings): 集成AI配置到设置模态框
c419e42 feat(ai): 实现AI智能讲解功能并集成到错题和笔记页面
398ad91 feat(ai): 实现AI对话和快捷问答功能，并新增统一知识面板
5e480a2 feat(ai): 实现AI知识图谱和讲解功能后端
2ee7eb3 fix(ai): 修复模板字面量中的反引号语法错误
6bf2cca feat(ai): 增强AI拍题prompt并优化标签系统
```

#### 2. 复合题练习模式（1 个提交）
```
46b6858 feat(mistakes): 实现复合题练习模式和多空填空支持
```

#### 3. 用户数据隔离和 Quiz 改进（1 个提交）
```
847e24d fix: 修复用户数据隔离问题和Quiz空结果处理
```

#### 4. 文档更新（3 个提交）
```
13cb9ad docs: 更新README添加项目管理指南和Claude Code Skills说明
bb2157f docs: 添加AI驱动的Git使用指南
4f129df docs: 添加Git工作流完整指南
```

#### 5. 其他功能（2 个提交）
```
db53997 feat(knowledge): 重新设计知识生态面板并增强音乐控制
0602684 fix(edit): 修复编辑器数据加载问题
```

---

## 🎯 推荐的分支策略

### 方案 A: 按功能拆分（推荐）

创建 4 个清晰的功能分支：

#### 1. `feature/ai-assistant`（AI 助手）
**包含**: 所有 AI 相关功能
**基础分支**: `main`
**提交**: 9ff5abb, ac58e3b, c419e42, 398ad91, 5e480a2, 2ee7eb3, 6bf2cca

#### 2. `feature/composite-quiz-practice`（复合题练习）
**包含**: 复合题练习模式和多空填空
**基础分支**: `main`
**提交**: 46b6858

#### 3. `feature/user-data-isolation`（用户数据隔离）
**包含**: 用户ID修复、Quiz改进
**基础分支**: `main`
**提交**: 847e24d

#### 4. `feature/knowledge-panel`（知识面板）
**包含**: 知识面板和音乐控制
**基础分支**: `main`
**提交**: db53997, 0602684

**优点**:
- ✅ 每个分支职责单一，易于理解
- ✅ 可以独立测试和合并
- ✅ 符合 Git Flow 最佳实践

**缺点**:
- ❌ 需要手动 cherry-pick 提交
- ❌ 耗时较长

---

### 方案 B: 按模块拆分

创建 3 个模块分支：

#### 1. `feature/ai-suite`（AI 套件）
**包含**: AI 功能 + 文档
**提交**: 所有 AI 相关 + 文档更新

#### 2. `feature/quiz-improvements`（Quiz 改进）
**包含**: 复合题练习 + 用户数据隔离
**提交**: 46b6858, 847e24d

#### 3. `feature/ui-enhancements`（UI 增强）
**包含**: 知识面板 + 编辑器修复
**提交**: db53997, 0602684

**优点**:
- ✅ 模块化清晰
- ✅ 减少分支数量

**缺点**:
- ❌ 分支仍然较大

---

### 方案 C: 主题分支（推荐给快速发布）

创建 2 个主题分支：

#### 1. `feature/ai-integration`（AI 集成）
**包含**: 所有 AI 功能和文档
**提交**: AI 相关的所有提交

#### 2. `feature/quiz-and-fixes`（Quiz 和修复）
**包含**: Quiz 相关的所有改进和修复
**提交**: 复合题 + 用户隔离 + 编辑器修复 + 知识面板

**优点**:
- ✅ 分支少，易管理
- ✅ 可以快速合并

**缺点**:
- ❌ 第2个分支功能仍然混杂

---

## 🚀 实施步骤（方案 A）

### 步骤 1: 从 main 创建新分支
```bash
git checkout main
git pull origin main
git checkout -b feature/ai-assistant
```

### 步骤 2: Cherry-pick AI 相关提交
```bash
git cherry-pick 5e480a2 9ff5abb ac58e3b c419e42 398ad91 2ee7eb3 6bf2cca
```

### 步骤 3: 创建复合题分支
```bash
git checkout main
git checkout -b feature/composite-quiz-practice
git cherry-pick 46b6858
```

### 步骤 4: 创建用户数据隔离分支
```bash
git checkout main
git checkout -b feature/user-data-isolation
git cherry-pick 847e24d
```

### 步骤 5: 推送所有分支
```bash
git push -u origin feature/ai-assistant
git push -u origin feature/composite-quiz-practice
git push -u origin feature/user-data-isolation
```

### 步骤 6: 删除旧分支
```bash
git branch -D feature/ai-question-enhancement
```

---

## 💡 我的推荐

**推荐方案 A**（按功能拆分），理由：
1. ✅ 清晰的职责划分
2. ✅ 易于代码审查
3. ✅ 可以独立测试
4. ✅ 符合单一职责原则
5. ✅ 未来易于维护

**合并顺序建议**：
1. `feature/user-data-isolation` - 基础修复，优先级最高
2. `feature/composite-quiz-practice` - 核心功能
3. `feature/ai-assistant` - 增强功能
4. 文档更新可以合并到 main

---

## 📝 执行确认

请确认你想要：
1. **方案 A** - 按功能拆分（4个分支）✅ 推荐
2. **方案 B** - 按模块拆分（3个分支）
3. **方案 C** - 主题分支（2个分支）
4. **自定义** - 你有自己的想法

确认后我会立即执行。
