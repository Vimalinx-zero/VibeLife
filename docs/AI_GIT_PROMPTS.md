# AI驱动的Git使用指南

**核心理念**: 你不需要记命令，只需要告诉AI你想做什么

**使用方法**: 复制对应的Prompt给AI（ChatGPT/Claude/豆包等）

---

## 📚 目录

- [日常开发场景](#日常开发场景)
- [分支管理场景](#分支管理场景)
- [团队协作场景](#团队协作场景)
- [紧急修复场景](#紧急修复场景)
- [代码审查场景](#代码审查场景)
- [高级操作场景](#高级操作场景)
- [通用提问模板](#通用提问模板)

---

## 🎯 日常开发场景

### 场景1：开始新功能开发

**你说**：
```
我想开始开发一个新功能"用户登录"，请帮我：
1. 从主分支创建一个新分支 feature/user-login
2. 切换到这个分支
3. 告诉我下一步该做什么
```

**AI会做**：
```bash
git checkout main
git pull origin main
git checkout -b feature/user-login

# AI会回复：
✅ 已创建并切换到 feature/user-login 分支
📝 下一步：
   1. 开始编写代码
   2. 完成后运行：git add . && git commit -m "feat: 添加登录功能"
   3. 推送：git push -u origin feature/user-login
```

---

### 场景2：完成功能并提交

**你说**：
```
我完成了用户登录功能，请帮我：
1. 查看我修改了哪些文件
2. 提交这些修改，写一个规范的commit message
3. 推送到远程分支
4. 告诉我如何合并到主分支
```

**AI会做**：
```bash
git status
git diff

# AI会生成规范的commit：
git add src/components/Login.jsx src/api/auth.js
git commit -m "feat(auth): 实现JWT用户登录功能

- 添加登录组件（Login.jsx）
- 实现登录API（auth.js）
- 集成JWT token管理
- 添加登录状态验证"

git push -u origin feature/user-login

# 然后告诉你：
# 合并步骤：
# 1. 在GitHub创建Pull Request
# 2. 等待code review
# 3. 审核通过后合并
```

---

### 场景3：工作中突然需要修复紧急bug

**你说**：
```
我现在正在开发 feature/user-login，但突然需要修复一个紧急bug，请帮我：
1. 保存当前的工作进度
2. 切换到主分支
3. 创建一个修复分支 hotfix/critical-bug
```

**AI会做**：
```bash
git stash push -m "开发到一半的登录功能"
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# AI会说明：
✅ 你的工作已保存，可以安心修复bug
# 修复完成后：
# git stash pop  # 恢复之前的工作
```

---

### 场景4：修复完成后恢复之前的工作

**你说**：
```
bug修复完成了，已经合并到主分支。现在请帮我：
1. 删除hotfix分支
2. 回到 feature/user-login 分支
3. 恢复之前保存的工作
```

**AI会做**：
```bash
git checkout main
git branch -d hotfix/critical-bug
git checkout feature/user-login
git stash pop

# AI会检查是否有冲突并提示
```

---

### 场景5：查看项目历史

**你说**：
```
请帮我查看：
1. 最近10次提交记录
2. 谁在什么时候修改了 src/utils/api.js 这个文件
3. 这个文件最近的改动内容是什么
```

**AI会做**：
```bash
git log --oneline -10
git log --follow -- src/utils/api.js
git log -p --follow -- src/utils/api.js | head -50

# AI会用中文总结：
# 最近10次提交：
# - d51dd3a (2小时前) docs: 添加B5打印导出RFC
# - 6975d4e (3小时前) docs: 添加Git工作流指南
# ...

# src/utils/api.js 修改历史：
# - Chesten 在3天前添加了缓存功能
# - Alice 在5天前修复了API错误
# ...
```

---

## 🌿 分支管理场景

### 场景6：查看所有分支

**你说**：
```
请告诉我：
1. 本地有哪些分支
2. 远程有哪些分支
3. 哪些分支已经合并，可以删除
4. 用表格形式展示，包括：分支名、最新提交时间、状态
```

**AI会执行**：
```bash
git branch -v
git branch -r
git branch --merged

# 然后整理成表格：
┌─────────────────────┬──────────────┬──────────┐
│ 分支名              │ 最新提交     │ 状态     │
├─────────────────────┼──────────────┼──────────┤
│ main                │ 2小时前      │ ✅最新   │
│ feature/user-login  │ 1天前        │ 🔄开发中 │
│ feature/old-feature │ 2周前        │ ⚠️可删除│
└─────────────────────┴──────────────┴──────────┘
```

---

### 场景7：清理旧分支

**你说**：
```
请帮我：
1. 找出所有已合并到主分支的分支
2. 删除这些分支（本地和远程）
3. 但保留 main 和 develop 分支
4. 列出你要删除的分支，让我确认后再执行
```

**AI会先列出计划**：
```bash
# 计划删除以下分支：
# 本地：
# - feature/old-auth
# - feature/test-payment
# - bugfix/login-fix
#
# 远程：
# - origin/feature/old-auth
# - origin/feature/test-payment
#
# 确认删除吗？(y/n)

# 你确认后执行：
git branch -d feature/old-auth
git push origin --delete feature/old-auth
```

---

### 场景8：重命名分支

**你说**：
```
我把分支名写错了，写成了 feature/usre-login（少了a），请帮我：
1. 重命名当前分支为 feature/user-login
2. 同步到远程
3. 删除远程的错误分支
```

**AI会执行**：
```bash
git branch -m feature/user-login
git push origin -u feature/user-login
git push origin --delete feature/usre-login

# ✅ 分支已重命名并同步
```

---

## 👥 团队协作场景

### 场景9：拉取同事的代码测试

**你说**：
```
同事Alice开发了一个新分支 feature/shopping-cart，我想拉下来测试，请帮我：
1. 拉取这个远程分支到本地
2. 切换到这个分支
3. 告诉我如何运行和测试
```

**AI会执行**：
```bash
git fetch origin
git checkout feature/shopping-cart

# 如果本地不存在，AI会：
git checkout -b feature/shopping-cart origin/feature/shopping-cart

# AI会根据项目说明：
# 💡 测试步骤：
# 1. npm install
# 2. npm run dev
# 3. 访问 http://localhost:3000
# 4. 测试购物车功能
```

---

### 场景10：合并冲突了怎么办

**你说**：
```
我在合并 feature/user-login 到 main 时遇到冲突了，请帮我：
1. 查看哪些文件有冲突
2. 用VSCode打开冲突文件
3. 告诉我如何解决冲突
4. 解决后完成合并
```

**AI会引导你**：
```bash
git status
# 显示：both modified: src/utils/auth.js

# AI会说：
# 📝 冲突文件：src/utils/auth.js
#
# 在文件中你会看到：
# <<<<<<< HEAD
# 你的代码
# =======
# 别人的代码
# >>>>>>> origin/main
#
# 解决步骤：
# 1. 用VSCode打开：code src/utils/auth.js
# 2. 选择保留哪个版本（或合并两者）
# 3. 删除 <<<<<<< ======= >>>>>>> 标记
# 4. 保存文件
#
# 解决后运行：
git add src/utils/auth.js
git commit -m "merge: 解决冲突"
```

---

### 场景11：代码审查前准备

**你说**：
```
我的功能开发完了，准备提交Pull Request，请帮我：
1. 检查我的commit message是否规范
2. 把多个小的commit合并成一个（如果有必要）
3. 生成一个清晰的PR描述
4. 告诉我PR应该发给谁审查
```

**AI会检查并优化**：
```bash
git log origin/main..HEAD

# AI会分析：
# ⚠️ 你的commit历史：
# - abc123 fix: 修复typo
# - def456 fix: 修复样式
# - ghi789 feat: 添加登录
#
# 💡 建议合并成1-2个有意义的commit

# 如果需要合并，AI会：
git rebase -i HEAD~3

# 然后生成PR描述：
---
## 📝 Pull Request: 用户登录功能

### 变更内容
- ✅ 实现JWT登录
- ✅ 添加登录表单验证
- ✅ 集成token管理

### 测试
- [x] 单元测试通过
- [x] 手动测试通过

### 截图
[登录页面截图]

### 相关Issue
Closes #123

---
```

---

## 🚨 紧急修复场景

### 场景12：发布后发现严重bug

**你说**：
```
生产环境的v1.2.0版本发现严重bug，需要紧急修复，请帮我：
1. 从v1.2.0标签创建hotfix分支
2. 告诉我修复流程
3. 修复后如何发布新版本
```

**AI会指导**：
```bash
git checkout main
git checkout -b hotfix/critical-bug v1.2.0

# 📋 hotfix流程：
# 1. 在hotfix分支修复bug
# 2. 测试
# 3. 提交：git commit -m "hotfix: 修复严重bug"
# 4. 合并回main：
#    git checkout main
#    git merge hotfix/critical-bug
# 5. 打新标签：git tag -a v1.2.1 -m "Hotfix: 修复严重bug"
# 6. 推送：git push origin main --tags
# 7. 同时合并回develop（如果有）
```

---

### 场景13：撤销错误的发布

**你说**：
```
刚刚推送的代码有严重问题，需要立即回滚到上一个版本，请帮我：
1. 查看最近3次提交
2. 回滚到上上个版本（丢弃最近一次提交）
3. 强制推送到远程
4. 告诉我风险和注意事项
```

**AI会警告并操作**：
```bash
git log --oneline -3

# AI会警告：
# ⚠️⚠️⚠️ 警告：强制推送会覆盖远程历史！
#
# 最近3次提交：
# - abc123 (10分钟前) feat: 添加支付功能 ← 要回滚的
# - def456 (1小时前)   fix: 修复登录bug
# - ghi789 (2小时前)   feat: 添加用户管理
#
# 回滚到 def456

# 确认后执行：
git reset --hard def456
git push -f origin main

# ⚠️ 如果其他人已经拉取了abc123，需要：
# 1. 通知所有开发者
# 2. 他们需要执行：git fetch origin && git reset --hard origin/main
```

---

## 🔍 代码审查场景

### 场景14：审查同事的PR

**你说**：
```
请帮我审查 feature/shopping-cart 这个PR：
1. 查看改动了哪些文件
2. 查看具体的代码变更
3. 检查有没有安全问题
4. 检查commit message是否规范
5. 给我一个总结和建议
```

**AI会分析**：
```bash
git fetch origin
git checkout main
git diff main...feature/shopping-cart

# AI会给出审查报告：
---
## 🔍 代码审查报告

### 📊 变更概览
- 修改文件：5个
- 新增代码：+320行
- 删除代码：-45行
- 主要变更：购物车功能

### ✅ 做得好的地方
1. 代码结构清晰
2. 有适当的错误处理
3. Commit message规范

### ⚠️ 需要注意的问题
1. **安全**：cart.js:15 - 用户输入未验证，存在XSS风险
2. **性能**：频繁调用API，建议添加节流
3. **测试**：缺少单元测试

### 💡 建议
- [ ] 修复XSS漏洞
- [ ] 添加API调用节流
- [ ] 补充单元测试

### 总体评价：🟡 需要修改后合并
---
```

---

### 场景15：查看某行代码是谁写的

**你说**：
```
src/api/auth.js 第45行有个bug，请帮我：
1. 查看这行代码是谁写的
2. 查看为什么这样写（当时的commit）
3. 查看那次的完整改动
```

**AI会追溯**：
```bash
git blame src/api/auth.js -L 45,45

# AI会分析：
# 📝 src/api/auth.js:45
#
# 作者：Alice (alice@example.com)
# 时间：2024-12-15 14:30
# Commit：a1b2c3d
# Message：feat: 添加JWT验证
#
# 查看完整改动：
git show a1b2c3d

# AI会解释当时的设计意图：
# 💡 这行代码是为了验证token过期时间
# 问题：使用了硬编码的过期时间（24小时）
# 建议：改为配置文件读取
```

---

## 🚀 高级操作场景

### 场景16：挑选某个功能合并

**你说**：
```
feature/payment 分支有3个新功能，但我只需要其中"支付宝支付"这一个功能，不要其他的，请帮我：
1. 找到"支付宝支付"相关的commit
2. 把它单独合并到当前分支
3. 不要其他的功能
```

**AI会使用cherry-pick**：
```bash
# AI先查找相关commit：
git log feature/payment --oneline --grep="支付宝"

# 找到：xyz789 feat: 添加支付宝支付

# 然后挑选这个commit：
git cherry-pick xyz789

# 如果有冲突，AI会帮你解决
# 完成后：
✅ 已将"支付宝支付"功能合并到当前分支
# 其他功能（微信支付、银联支付）未被合并
```

---

### 场景17：找到引入bug的提交

**你说**：
```
我的代码有个bug，但不知道是哪次提交引入的。我知道：
- 当前版本（HEAD）有bug
- v1.0.0版本是正常的
请帮我找出是哪次提交引入的bug
```

**AI会用二分查找**：
```bash
git bisect start
git bisect bad
git bisect good v1.0.0

# Git会自动切换到中间版本
# AI会问你：
# 💡 测试当前版本是否有bug (y/n)

# 根据你的回答，AI继续二分
# 最终找到：
# 🔍 引入bug的提交：abc123
# 提交信息：fix: 优化登录逻辑
# 时间：2天前
#
# 查看具体改动：
git show abc123
```

---

### 场景18：临时保存多个工作

**你说**：
```
我同时在开发3个功能，都没完成，现在需要紧急修复bug，请帮我：
1. 分别保存这3个工作
2. 每个工作要有清晰的说明
3. 修复完成后告诉我如何恢复
```

**AI会使用多个stash**：
```bash
git stash push -m "feature-1: 用户认证（完成80%）"
git stash push -m "feature-2: 支付接口（完成50%）"
git stash push -m "feature-3: 数据导出（完成30%）"

# AI会列出：
# 📦 已保存的工作：
# stash@{0}: On feature-1: 用户认证（完成80%）
# stash@{1}: On feature-2: 支付接口（完成50%）
# stash@{2}: On feature-3: 数据导出（完成30%）
#
# 现在可以修复bug了...

# 修复完成后，AI告诉你如何恢复：
# 恢复工作：
# git stash pop stash@{2}  # 恢复feature-3
# git stash pop stash@{1}  # 恢复feature-2
# git stash pop stash@{0}  # 恢复feature-1
```

---

### 场景19：清理混乱的提交历史

**你说**：
```
我的提交历史很乱，有很多"fix typo"、"update"这样的小commit，请帮我：
1. 查看最近10次提交
2. 把相关的commit合并成几个有意义的
3. 保持commit message规范
4. 让历史更清晰
```

**AI会使用rebase整理**：
```bash
git log --oneline -10

# AI会分析并建议：
# 📋 当前提交：
# - abc123 fix typo
# - def456 update style
# - ghi789 add login
# - jkl012 fix typo
# - mno345 add button
#
# 💡 建议合并为：
# 1. "feat(auth): 添加登录功能和样式" (合并abc, def, ghi)
# 2. "feat(ui): 添加按钮组件" (mno)
# 3. "chore: 修复拼写错误" (jkl)
#
# 开始rebase：
git rebase -i HEAD~5

# AI会打开编辑器，已经设置好squash标记
# 你只需要保存即可
```

---

### 场景20：同步fork的上游仓库

**你说**：
```
我fork了一个开源项目，现在上游有更新了，请帮我：
1. 添加上游仓库
2. 拉取上游的最新代码
3. 合并到我的分支
4. 如果有冲突帮我解决
```

**AI会设置upstream**：
```bash
# 添加上游仓库
git remote add upstream https://github.com/original/project.git
git fetch upstream

# 查看差异
git log main..upstream/main

# 合并上游更新
git checkout main
git merge upstream/main

# 如果有冲突：
# AI会逐个文件帮你解决
# 完成后：
git push origin main

# ✅ 你的fork已同步到最新版本
```

---

## 🤖 通用提问模板

### 模板1：检查状态

**你可以说**：
```
请检查我的Git状态，告诉我：
1. 当前在哪个分支
2. 有哪些修改
3. 有哪些未跟踪的文件
4. 是否有未推送的提交
5. 用中文总结，简洁明了
```

---

### 模板2：开始新任务

**你可以说**：
```
我要开始【任务描述】，请帮我：
1. 从【分支名】创建新分支 feature/xxx
2. 切换到新分支
3. 告诉我应该从哪里开始
4. 如果有相关的代码或文档，提示我
```

---

### 模板3：完成任务

**你可以说**：
```
我完成了【功能描述】，请帮我：
1. 查看我的修改
2. 检查有没有不该提交的文件
3. 写一个规范的commit message
4. 推送到远程
5. 告诉我下一步（如何合并、PR等）
```

---

### 模板4：遇到问题

**你可以说**：
```
我遇到了【问题描述】，错误信息是：【复制错误信息】
请帮我：
1. 分析问题原因
2. 提供解决方案
3. 告诉我如何避免以后再出现
4. 如果需要执行命令，解释每一步的作用
```

---

### 模板5：代码审查

**你可以说**：
```
请帮我审查【分支名/PR链接】的代码：
1. 检查代码质量
2. 检查安全问题
3. 检查性能问题
4. 检查是否符合团队规范
5. 给出改进建议
6. 总体评价（优秀/良好/需要修改/不合格）
```

---

### 模板6：学习某项操作

**你可以说**：
```
我想了解【Git操作/概念】，请：
1. 用通俗的语言解释
2. 给出实际使用场景
3. 提供命令示例
4. 告诉我注意事项和风险
5. 如果有替代方案，对比说明
```

---

### 模板7：批量操作

**你可以说**：
```
请帮我批量处理：
1. 【操作1】
2. 【操作2】
3. 【操作3】

在执行前：
- 列出计划
- 告诉我风险
- 让我确认

执行时：
- 显示进度
- 解释每一步
- 遇到问题暂停

执行后：
- 总结结果
- 告诉我下一步
```

---

## 💡 高效使用AI的技巧

### 技巧1：提供上下文

**❌ 不好的问法**：
```
帮我合并分支
```

**✅ 好的问法**：
```
我完成了用户登录功能的开发，在feature/user-login分支上，
现在想合并到main分支。请帮我：
1. 先检查feature分支是否完整
2. 合并到main
3. 如果有冲突帮我解决
4. 合并后删除feature分支
```

---

### 技巧2：指定输出格式

**❌ 不好的问法**：
```
查看提交历史
```

**✅ 好的问法**：
```
请查看最近10次提交，用表格形式展示：
- 提交hash（前7位）
- 提交信息
- 作者
- 时间
- 按时间倒序排列
```

---

### 技巧3：要求解释

**❌ 不好的问法**：
```
git rebase HEAD~3
```

**✅ 好的问法**：
```
请执行 git rebase HEAD~3，并告诉我：
1. 这个命令会做什么
2. 对我的代码有什么影响
3. 有什么风险
4. 执行后需要做什么
5. 如何撤销（如果出错了）
```

---

### 技巧4：分步执行

**❌ 不好的问法**：
```
帮我把所有功能合并到main，推送到远程，删除所有feature分支
```

**✅ 好的问法**：
```
请分步执行以下操作，每步执行前告诉我你要做什么：
1. 检查有哪些feature分支
2. 逐个合并到main
3. 每次合并后确认
4. 最后推送并删除分支
```

---

### 技巧5：要求确认

**❌ 不好的问法**：
```
删除所有旧分支
```

**✅ 好的问法**：
```
请找出所有已合并的分支，列出来让我确认，
然后问我是否真的要删除，得到确认后再执行
```

---

## 🎯 不同场景的Prompt速查表

| 场景 | 直接说给AI |
|------|-----------|
| **开始新功能** | "从main创建feature/xxx分支并切换" |
| **提交代码** | "帮我提交修改，写规范的commit message" |
| **推送代码** | "推送到远程并设置上游分支" |
| **更新代码** | "拉取最新代码并合并到当前分支" |
| **查看状态** | "检查Git状态，用中文告诉我当前情况" |
| **查看历史** | "查看最近10次提交，表格形式" |
| **创建分支** | "创建分支feature/xxx基于main" |
| **切换分支** | "切换到feature/xxx分支" |
| **合并分支** | "把feature/xxx合并到当前分支" |
| **删除分支** | "删除已合并的feature分支（本地+远程）" |
| **解决冲突** | "帮我解决合并冲突，用VSCode打开" |
| **撤销修改** | "撤销工作区的所有修改" |
| **撤销提交** | "撤销最后一次提交但保留修改" |
| **查看差异** | "查看当前分支和main的差异" |
| **暂存工作** | "保存当前工作，清晰的描述" |
| **恢复工作** | "恢复最近保存的工作" |
| **回滚版本** | "回滚到上一个版本，告诉我风险" |
| **挑选提交** | "把feature分支的某个commit合并过来" |
| **整理历史** | "把最近5个小commit合并成1个" |

---

## ⚠️ 重要提醒

### 危险操作必须说清楚

当你让AI执行这些操作时，**一定要说清楚**：

```
✅ "我想回滚，因为【原因】，我已经备份了重要数据，请执行回滚"

❌ "回滚到上一版本"  # AI不知道原因，可能误操作
```

---

### 永远要求AI解释

对于复杂操作，要求AI：

```
✅ "执行这个命令，并解释每一步"

✅ "在执行前告诉我：会做什么、有什么风险、如何撤销"

✅ "列出命令，让我确认后再执行"
```

---

### 分步骤执行

对于复杂任务：

```
✅ "分3步执行，每步执行前告诉我计划，得到确认再继续"

✅ "先告诉我你会做什么，等我回复'确认'再执行"
```

---

## 📞 什么时候需要AI帮助

### ✅ 适合AI处理的场景

- **日常操作**：提交、推送、分支管理
- **复杂操作**：rebase、cherry-pick、bisect
- **解决问题**：冲突、错误、回滚
- **代码审查**：查看变更、检查质量
- **学习新知识**：理解概念、最佳实践

### ❌ 不适合AI（需要人工判断）

- 是否删除代码（需要理解业务逻辑）
- Commit message的准确性（需要理解改动原因）
- 合并策略的选择（需要了解团队规范）
- 发布决策（需要考虑用户影响）

---

## 🚀 实战示例

### 完整的一天工作流

**早上到公司**：
```
我来了，帮我：
1. 切换到main分支
2. 拉取最新代码
3. 创建今日任务分支 feature/daily-task-2025-01-03
```

**开发中**：
```
完成了一个功能，帮我提交：
功能描述：【具体描述】
涉及文件：【自己列举或让AI查找】
```

**中午被紧急问题打断**：
```
需要紧急修复bug，帮我：
1. 保存当前工作
2. 切到main
3. 创建hotfix分支
```

**下午继续工作**：
```
bug修完了，帮我：
1. 合并hotfix到main
2. 切回feature分支
3. 恢复之前的工作
```

**下班前**：
```
今天工作完成了，帮我：
1. 检查修改
2. 提交代码
3. 推送到远程
4. 告诉我是否需要创建PR
```

---

## 💡 最后的建议

### 记住3个万能句式

1. **"帮我做【操作】，并解释每一步"**
2. **"我想【目的】，应该怎么做"**
3. **"遇到了【问题】，请帮我分析和解决"**

### 养成好习惯

- ✅ 操作前说清楚目的
- ✅ 要求AI解释风险
- ✅ 复杂操作分步执行
- ✅ 危险操作要求确认
- ✅ 保存AI的回复作为学习资料

---

**核心思想**：你是**指挥官**，AI是**执行者** + **顾问**，你不需要记命令，只需要清楚表达你的意图。

Happy Coding with AI! 🚀
