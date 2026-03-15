# VibeLife 质量检测流程

## 检测流程概述

本文档定义了 VibeLife 项目的完整质量检测流程，包括：
- 自动化检测命令
- 检测项清单
- 问题记录和追踪机制
- 检测报告格式

---

## 检测命令集

### 前端检测

```bash
cd frontend

# 1. TypeScript 类型检查
npx tsc --noEmit

# 2. ESLint 检查
npm run lint

# 3. 构建检查
npm run build

# 4. 快速类型检查（仅错误数量）
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0"
```

### 后端检测

```bash
cd backend

# 1. 类型检查（如果使用 mypy）
mypy main.py

# 2. Lint 检查（如果使用 pylint/pylint）
pylint main.py

# 3. API 测试
python test_api.py

# 4. 单个测试运行
python -c "from test_api import test_auth_login; test_auth_login()"
```

---

## 检测清单

### 快速检测（日常开发）

每次提交代码前执行：

- [ ] TypeScript 类型检查通过（0 个错误）
- [ ] ESLint 检查通过（0 个错误）
- [ ] 前端构建成功
- [ ] 相关后端测试通过

### 完整检测（版本发布）

在发布新版本前执行：

- [ ] 前端所有检测项通过
- [ ] 后端所有测试通过（test_api.py）
- [ ] 手动测试核心功能
  - [ ] 登录/注册
  - [ ] 刷题功能
  - [ ] 笔记创建/编辑
  - [ ] 错题本功能
  - [ ] Anki 复习
- [ ] 浏览器控制台无错误
- [ ] 无控制台警告（ jsx 属性等）

---

## 问题记录

### 问题记录格式

每个问题按以下格式记录：

```markdown
#### [问题ID] - 问题标题

**发现时间**: YYYY-MM-DD
**影响模块**: 前端/后端，具体文件
**严重程度**: 🔴 高 | 🟡 中 | 🟢 低
**问题描述**: 详细描述问题现象
**根本原因**: 分析问题的根本原因
**解决方案**: 描述修复方法
**修复时间**: YYYY-MM-DD
**相关文件**: 列出受影响的文件
**检测命令**: 导致发现问题的命令
```

---

## 已记录问题

### [BUG-001] - Anki 页面 decks.map is not a function

**发现时间**: 2026-01-07
**影响模块**: 前端，AnkiPage.tsx, ankiApi.ts
**严重程度**: 🔴 高
**问题描述**:
- 进入 Anki 界面时报错：`TypeError: decks.map is not a function`
- 错误位置：`AnkiPage.tsx:90:20`

**根本原因**:
- 前端调用 API 后，没有访问 axios 响应对象的 `.data` 属性
- 导致 `decks` 被赋值为 axios 响应对象，而不是实际的牌组数组

**解决方案**:
```typescript
// ❌ 修复前
setDecks(decksData);

// ✅ 修复后
setDecks(decksResponse.data);
```

**修复时间**: 2026-01-07
**相关文件**:
- `frontend/src/pages/AnkiPage.tsx`
- `frontend/src/utils/ankiApi.ts`

**检测命令**:
```bash
npx tsc --noEmit
```

---

### [BUG-002] - Anki 页面 404 错误

**发现时间**: 2026-01-07
**影响模块**: 前端，ankiApi.ts, AnkiReviewPage.tsx
**严重程度**: 🔴 高
**问题描述**:
- Anki 页面加载时报 404 错误
- 错误路径：`/api/anki/view/due`

**根本原因**:
- 前端 `ankiApi.ts` 中 `getDueCards` 函数使用了错误的 API 路径
- 后端定义的路径是 `/anki/review/due`，不是 `/anki/view/due`

**解决方案**:
```typescript
// ❌ 错误路径
return apiClient.get('/anki/view/due', { params });

// ✅ 正确路径
return apiClient.get('/anki/review/due', { params });
```

**修复时间**: 2026-01-07
**相关文件**:
- `frontend/src/utils/ankiApi.ts`
- `frontend/src/pages/AnkiReviewPage.tsx`

**检测命令**:
```bash
npm run build
```

---

### [BUG-003] - MarkdownCard jsx 属性警告

**发现时间**: 2026-01-07
**影响模块**: 前端，MarkdownCard.tsx
**严重程度**: 🟡 中
**问题描述**:
- React 开发警告：`Received true for a non-boolean attribute jsx`
- 警告来源：MarkdownCard 组件的 `<style jsx>` 标签

**根本原因**:
- `jsx` 是 styled-jsx 库的语法，但项目中没有配置这个库
- `jsx` 不是标准 HTML 属性，React 发出警告

**解决方案**:
```typescript
// ❌ 修复前
<style jsx>{`...`}</style>

// ✅ 修复后
<style>{`...`}</style>
```

**修复时间**: 2026-01-07
**相关文件**:
- `frontend/src/components/MarkdownCard.tsx`

**检测命令**:
```bash
npm run dev
# 查看浏览器控制台
```

---

### [CONFIG-001] - tsconfig.json 配置问题

**发现时间**: 2026-01-07
**影响模块**: 前端，tsconfig.json
**严重程度**: 🔴 高
**问题描述**:
- TypeScript 编译器无法正常工作，显示帮助信息
- JSON 格式问题：包含注释
- 引用不存在的 tsconfig.node.json

**根本原因**:
- tsconfig.json 中包含注释（JSON 不支持）
- references 字段引用了不存在的文件

**解决方案**:
1. 移除所有注释
2. 移除 references 字段
3. 确保严格的 JSON 格式

**修复时间**: 2026-01-07
**相关文件**:
- `frontend/tsconfig.json`

**检测命令**:
```bash
npx tsc --noEmit
```

---

### [TYPE-001] - NotesPage.tsx 类型错误（29 个错误）

**发现时间**: 2026-01-07
**影响模块**: 前端，NotesPage.tsx
**严重程度**: 🔴 高
**问题描述**:
- NoteItem 接口缺少 tags 和 date 属性
- ViewData.info 类型定义不完整
- useState 类型定义不明确
- 缺少类型注解和 null 检查

**根本原因**:
- 接口定义不完整，缺少常用属性
- TypeScript 配置允许隐式 any
- 函数缺少类型注解

**解决方案**:
```typescript
// 1. 补充接口定义
interface NoteItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  parent_id?: string;
  created_at?: string;
  updated_at?: string;
  children?: NoteItem[];
  tags?: string[];      // ✅ 新增
  date?: string;         // ✅ 新增
}

// 2. 创建 NoteInfo 接口
interface NoteInfo {
  id: string;
  type: string;
  name: string;
  content?: string;
  parent_id?: string;
  tags?: string[];
  date?: string;
}

// 3. 明确类型定义
const [viewMode, setViewMode] = useState<"split" | "edit" | "read">("read");
const [newItemType, setNewItemType] = useState<"file" | "folder">("file");

// 4. 添加类型断言
const textarea = document.getElementById("note-textarea") as HTMLTextAreaElement;

// 5. 添加函数类型注解
const loadAllTags = async (): Promise<void> => {
  // ...
};

const saveNote = async (
  newTitle?: string,
  newContent?: string,
  newTags?: string[]
): Promise<void> => {
  // ...
};

// 6. 添加可选链和空值检查
item.tags && selectedTags.some(tag => item.tags!.includes(tag))
item.date || 0
```

**修复时间**: 2026-01-07
**相关文件**:
- `frontend/src/pages/NotesPage.tsx`

**检测命令**:
```bash
npx tsc --noEmit 2>&1 | grep "NotesPage.tsx" | wc -l
```

**修复结果**: 29 个错误 → 0 个错误

---

## 检测报告模板

### 日常检测报告

```
=== VibeLife 日常检测报告 ===

检测时间: YYYY-MM-DD HH:MM:SS
检测人: [姓名/Agent]
检测分支: [branch]

=== 前端检测 ===

TypeScript 类型检查: ✅ 通过 / ❌ 失败 (X 个错误)
ESLint 检查: ✅ 通过 / ❌ 失败 (X 个错误)
构建检查: ✅ 通过 / ❌ 失败

=== 后端检测 ===

类型检查: ✅ 通过 / ❌ 失败 (X 个错误)
Lint 检查: ✅ 通过 / ❌ 失败 (X 个错误)
API 测试: ✅ 通过 (12/12) / ❌ 失败 (X/12)

=== 总结 ===

✅ 通过项目: X
❌ 失败项目: X
🟡 警告项目: X

总体状态: ✅ 检测通过 / ❌ 需要修复

详细问题: [链接到问题记录]
```

---

## 自动化检测脚本

### 检测脚本模板

创建 `scripts/quality-check.sh`:

```bash
#!/bin/bash

# VibeLife 质量检测脚本

set -e

echo "=== VibeLife 质量检测 ==="
echo ""

# 前端检测
cd frontend

echo "1. TypeScript 类型检查..."
TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0")
if [ "$TS_ERRORS" -eq 0 ]; then
  echo "   ✅ 通过 (0 个错误)"
else
  echo "   ❌ 失败 ($TS_ERRORS 个错误)"
fi

echo ""
echo "2. ESLint 检查..."
if npm run lint > /tmp/eslint.log 2>&1; then
  echo "   ✅ 通过"
else
  ERRORS=$(grep -c "error" /tmp/eslint.log || echo "0")
  echo "   ❌ 失败 ($ERRORS 个错误)"
fi

echo ""
echo "3. 构建检查..."
if npm run build > /tmp/build.log 2>&1; then
  echo "   ✅ 通过"
else
  echo "   ❌ 失败"
  tail -20 /tmp/build.log
fi

cd ..

# 后端检测
cd backend

echo ""
echo "4. API 测试..."
if python test_api.py > /tmp/test.log 2>&1; then
  echo "   ✅ 通过"
else
  echo "   ❌ 失败"
  cat /tmp/test.log
fi

cd ..

echo ""
echo "=== 检测完成 ==="
```

使用方法：
```bash
chmod +x scripts/quality-check.sh
./scripts/quality-check.sh
```

---

## 检测频率建议

### 日常检测（每次提交）
- 快速类型检查
- ESLint 检查
- 相关功能测试

### 周检测（每周一次）
- 完整类型检查
- 完整 ESLint 检查
- 后端 API 测试
- 手动功能测试

### 发布检测（每次发布）
- 所有检测项
- 完整功能测试
- 性能测试
- 安全扫描

---

## 问题追踪原则

### 问题优先级定义

- 🔴 **高优先级**: 影响核心功能，阻止正常使用
  - 示例：崩溃、数据丢失、无法登录
  - 处理时间：24 小时内

- 🟡 **中优先级**: 影响次要功能，但有变通方法
  - 示例：UI 错误、警告信息、小功能异常
  - 处理时间：3 天内

- 🟢 **低优先级**: 不影响使用，仅代码质量问题
  - 示例：代码风格、重复代码、性能优化
  - 处理时间：1 周内

### 问题状态流转

```
发现问题 → 记录到本文档 → 修复 → 验证 → 关闭
```

### 问题记录更新流程

1. **发现问题**：在检测或使用中发现问题
2. **记录问题**：按格式添加到"已记录问题"章节
3. **分析问题**：分析根本原因
4. **修复问题**：实施解决方案
5. **验证修复**：运行检测验证问题已解决
6. **更新记录**：添加"修复时间"和"修复结果"

---

## 检测工具配置

### TypeScript 配置

- **严格模式**: 启用（但允许隐式 any 以渐进迁移）
- **空值检查**: 启用
- **未使用检查**: 暂时关闭（渐进迁移）

### ESLint 配置

- **规则集**: Airbnb JavaScript Style Guide
- **React 规则**: eslint-plugin-react-hooks
- **自动修复**: 支持

---

## 优化建议

### 1. 自动化检测流程

**当前状态**: 手动执行多个命令
**优化方向**:
- 创建统一的检测脚本
- 集成到 CI/CD 流程
- GitHub Actions 自动运行

**实现方案**:
```yaml
# .github/workflows/quality-check.yml
name: Quality Check
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm install
      - name: TypeScript Check
        run: |
          cd frontend
          npx tsc --noEmit
      - name: ESLint Check
        run: |
          cd frontend
          npm run lint
      - name: Build Check
        run: |
          cd frontend
          npm run build
```

### 2. 增量检测

**当前状态**: 全量检测，耗时较长
**优化方向**:
- 只检测修改的文件
- 使用缓存机制
- 并行运行检测

**实现方案**:
```bash
# 检测最近修改的文件
git diff --name-only HEAD~1 | grep "\.tsx\?$" | xargs npx tsc --noEmit
```

### 3. 实时检测

**当前状态**: 手动触发检测
**优化方向**:
- 使用 watch 模式实时检测
- IDE 集成
- 保存时自动检测

**实现方案**:
```json
// package.json
{
  "scripts": {
    "dev:watch": "concurrently \"npm run dev\" \"npx tsc --noEmit --watch\""
  }
}
```

### 4. 分级检测

**当前状态**: 全量检测，无优先级
**优化方向**:
- 快速检测：仅类型检查
- 完整检测：类型 + Lint + 构建 + 测试
- 根据触发场景选择检测级别

**实现方案**:
```bash
# 快速检测（开发中）
npm run check:quick

# 完整检测（提交前）
npm run check:full

# 发布检测（发布前）
npm run check:release
```

### 5. 检测报告可视化

**当前状态**: 文本报告
**优化方向**:
- HTML 报告
- 图表展示
- 历史趋势

**实现方案**:
- 使用 Allure 生成测试报告
- 使用 TypeScript ESLint 生成格式化报告
- 创建 Dashboard 展示检测历史

### 6. 问题自动追踪

**当前状态**: 手动记录到 Markdown
**优化方向**:
- 集成 Issue Tracker
- 自动创建 GitHub Issue
- 自动关闭已解决问题

**实现方案**:
- 检测脚本自动提交 Issue
- PR 合并时自动关闭相关 Issue
- 使用标签管理问题状态

---

## 检测执行流程

### 触发检测的时机

1. **提交代码前**：快速检测
2. **创建 PR 时**：完整检测
3. **合并到 main 时**：完整检测 + 发布检测
4. **定期（每周）**：完整检测 + 手动测试

### 检测流程图

```
开始
  ↓
选择检测级别（快速/完整/发布）
  ↓
执行前端检测
  ├─ TypeScript 检查
  ├─ ESLint 检查
  └─ 构建检查
  ↓
执行后端检测
  ├─ 类型检查
  ├─ Lint 检查
  └─ API 测试
  ↓
生成检测报告
  ↓
发现问题？
  ├─ 是 → 记录问题 → 修复 → 重新检测
  └─ 否 → 检测通过
  ↓
结束
```

---

## 附录

### A. 检测命令参考

| 命令 | 说明 | 预期结果 |
|------|------|----------|
| `npx tsc --noEmit` | TypeScript 类型检查 | 0 个错误 |
| `npm run lint` | ESLint 代码检查 | 0 个错误 |
| `npm run build` | 前端构建检查 | 构建成功 |
| `python test_api.py` | 后端 API 测试 | 全部通过 |
| `python -c "from test_api import test_xxx; test_xxx()"` | 单个测试 | 测试通过 |

### B. 常见问题速查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| tsc 显示帮助信息 | tsconfig.json 格式错误 | 移除注释，确保 JSON 格式正确 |
| 构建失败但 tsc 通过 | Vite 配置问题 | 检查 vite.config.js |
| ESLint 报错但代码能运行 | 代码风格问题 | 运行 `npm run lint --fix` |
| 测试失败 | 后端逻辑错误 | 查看日志，修复代码 |

### C. 相关文档

- [AGENTS.md](AGENTS.md) - AI 编码助手指南
- [README.md](README.md) - 项目说明
- [TEST_REPORT.md](TEST_REPORT.md) - 测试报告
- [QUICK_START.md](QUICK_START.md) - 快速启动指南

---

## 更新日志

### 2026-01-07

- ✅ 创建本文档
- ✅ 记录 BUG-001: Anki 页面 decks.map 错误
- ✅ 记录 BUG-002: Anki 页面 404 错误
- ✅ 记录 BUG-003: MarkdownCard jsx 警告
- ✅ 记录 CONFIG-001: tsconfig.json 配置问题
- ✅ 记录 TYPE-001: NotesPage.tsx 类型错误
- ✅ 补充检测命令集
- ✅ 补充检测清单
- ✅ 补充优化建议
- ✅ 补充自动化脚本模板

---

## 使用说明

### 如何使用本文档

1. **发现问题时**：
   - 在"已记录问题"章节添加新记录
   - 按照格式填写所有字段
   - 描述问题时尽可能详细

2. **执行检测时**：
   - 按照"检测命令集"执行命令
   - 对照"检测清单"逐项检查
   - 记录检测结果到报告

3. **修复问题时**：
   - 参考问题描述和解决方案
   - 验证修复效果
   - 更新问题记录（修复时间、修复结果）

4. **优化流程时**：
   - 参考"优化建议"章节
   - 选择适合的优化方向
   - 逐步实施自动化

### 维护原则

1. **及时更新**：每次发现问题后立即记录
2. **完整记录**：尽可能详细，方便后续参考
3. **定期回顾**：每月回顾问题记录，优化流程
4. **持续改进**：根据实际情况调整检测流程

---

## 联系与反馈

如有问题或建议，请：
- 更新本文档
- 提交 Issue
- 联系项目维护者
