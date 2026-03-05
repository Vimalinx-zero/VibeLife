# Git 开发工作流完整指南

**更新时间**: 2025-01-03
**适用场景**: 个人开发 & 团队协作

---

## 📚 目录

- [基础概念](#基础概念)
- [标准开发流程](#标准开发流程)
- [常用命令速查](#常用命令速查)
- [分支管理策略](#分支管理策略)
- [团队协作流程](#团队协作流程)
- [最佳实践](#最佳实践)
- [问题排查](#问题排查)
- [高级技巧](#高级技巧)

---

## 🎯 基础概念

### Git 的三个区域

```
┌─────────────────────────────────────────────────┐
│  工作区 (Working Directory)                     │
│  你实际编辑文件的地方                             │
└────────────┬────────────────────────────────────┘
             │ git add
             ↓
┌─────────────────────────────────────────────────┐
│  暂存区 (Staging Area)                          │
│  准备提交的文件集合                               │
└────────────┬────────────────────────────────────┘
             │ git commit
             ↓
┌─────────────────────────────────────────────────┐
│  本地仓库 (Local Repository)                    │
│  本地的提交历史                                   │
└────────────┬────────────────────────────────────┘
             │ git push
             ↓
┌─────────────────────────────────────────────────┐
│  远程仓库 (Remote Repository)                   │
│  GitHub/GitLab 等托管平台                        │
└─────────────────────────────────────────────────┘
```

### 核心概念

| 概念 | 说明 | 例子 |
|------|------|------|
| **Commit** | 一次提交，保存文件快照 | `d51dd3a` |
| **Branch** | 分支，独立的开发线 | `main`, `feature/b5-print` |
| **HEAD** | 指向当前分支的指针 | `HEAD -> main` |
| **Merge** | 合并分支 | `git merge feature` |
| **Rebase** | 变基，重写提交历史 | `git rebase main` |
| **Tag** | 标签，标记重要版本 | `v1.0.0` |

---

## 🔄 标准开发流程

### 1️⃣ 个人开发流程（最常用）

```
┌─────────────────────────────────────────────┐
│  1. 开始新功能                                │
└────────────┬────────────────────────────────┘
             │ git checkout -b feature/xxx
             ↓
┌─────────────────────────────────────────────┐
│  2. 编写代码 + 提交                           │
│     (循环: edit → add → commit)              │
└────────────┬────────────────────────────────┘
             │ git commit -m "feat: xxx"
             ↓
┌─────────────────────────────────────────────┐
│  3. 推送到远程                                │
└────────────┬────────────────────────────────┘
             │ git push origin feature/xxx
             ↓
┌─────────────────────────────────────────────┐
│  4. 合并到主分支                              │
└────────────┬────────────────────────────────┘
             │ git checkout main && git merge
             ↓
┌─────────────────────────────────────────────┐
│  5. 删除功能分支（可选）                      │
└─────────────────────────────────────────────┘
             │ git branch -d feature/xxx
```

**实际操作示例**：

```bash
# 1. 切换到主分支，拉取最新代码
git checkout main
git pull origin main

# 2. 创建功能分支
git checkout -b feature/user-auth

# 3. 开发过程中多次提交
git add src/components/Login.jsx
git commit -m "feat: 添加登录组件"

git add src/api/auth.js
git commit -m "feat: 实现登录API"

# 4. 推送到远程
git push -u origin feature/user-auth

# 5. 测试通过后，合并到主分支
git checkout main
git merge feature/user-auth

# 6. 推送主分支
git push origin main

# 7. 删除已合并的功能分支
git branch -d feature/user-auth
git push origin --delete feature/user-auth
```

---

### 2️⃣ 团队协作流程（Pull Request）

```
开发者A                          开发者B                    主分支
  │                               │                         │
  ├─ checkout -b feature-A       │                         │
  ├─ (开发 + commit)              │                         │
  ├─ push origin feature-A       │                         │
  ├─ create PR ──────────────→  │                         │
  │                              ├─ review PR              │
  │                              ├─ request changes        │
  │                              │                         │
  ├─ fix changes ─────────────→  │                         │
  ├─ push ──────────────────→   ├─ approve PR             │
  │                              ├─ merge PR ───────────→  │
  │                              │                         │
  └─ delete branch               └─ delete branch          │
```

**GitHub PR 流程**：

```bash
# 开发者A：创建功能分支
git checkout -b feature/payment-gateway
# ... 开发 ...
git push -u origin feature/payment-gateway

# GitHub网页上创建 Pull Request
# 开发者B进行code review

# 如果需要修改
git checkout feature/payment-gateway
# ... 修改 ...
git add .
git commit -m "fix: 修复review意见"
git push

# 审核通过后，在GitHub上合并PR
# 合并后删除分支
git checkout main
git pull origin main
git branch -d feature/payment-gateway
```

---

### 3️⃣ Git Flow 流程（大型项目）

```
                    main (生产环境)
                      │
                      │  merge
                      ↓
                  release/x.x.x
                   /      \
                  /        \
                 /          ↓
develop ←───────┘       staging
 │
 │─ feature/* (功能分支)
 │─ bugfix/* (修复分支)
 │─ hotfix/* (紧急修复)
```

**分支说明**：

| 分支类型 | 命名规则 | 生命周期 | 说明 |
|---------|---------|---------|------|
| **main** | `main` | 永久 | 生产环境代码 |
| **develop** | `develop` | 永久 | 开发主分支 |
| **feature** | `feature/功能名` | 临时 | 开发新功能 |
| **release** | `release/版本号` | 临时 | 发布准备 |
| **hotfix** | `hotfix/问题名` | 临时 | 紧急修复 |
| **bugfix** | `bugfix/问题名` | 临时 | 普通bug修复 |

**Git Flow 示例**：

```bash
# 1. 从develop创建功能分支
git checkout develop
git checkout -b feature/user-dashboard

# 2. 开发完成后合并回develop
git checkout develop
git merge feature/user-dashboard

# 3. 准备发布时，创建release分支
git checkout -b release/1.2.0

# 4. release测试通过后，合并到main和develop
git checkout main
git merge release/1.2.0
git tag -a v1.2.0 -m "Release version 1.2.0"

git checkout develop
git merge release/1.2.0

# 5. 紧急修复（从main直接创建hotfix）
git checkout main
git checkout -b hotfix/critical-bug
# ... 修复 ...
git checkout main
git merge hotfix/critical-bug
git checkout develop
git merge hotfix/critical-bug
```

---

## 📋 常用命令速查

### 日常开发（Top 10）

```bash
# 1. 查看状态（最常用）
git status

# 2. 添加文件到暂存区
git add .                    # 添加所有更改
git add file.js             # 添加单个文件
git add *.jsx               # 添加所有jsx文件

# 3. 提交
git commit -m "feat: 添加登录功能"
git commit -am "fix: 修复bug"  # add + commit 一起

# 4. 查看历史
git log                      # 详细历史
git log --oneline           # 简洁历史（推荐）
git log --graph             # 图形化历史

# 5. 拉取和推送
git pull                     # 拉取并合并
git push                     # 推送
git push -u origin new-branch  # 推送并设置上游

# 6. 切换分支
git checkout main
git checkout -b new-feature  # 创建并切换

# 7. 查看差异
git diff                     # 工作区 vs 暂存区
git diff --staged           # 暂存区 vs 仓库
git diff main               # 当前分支 vs main

# 8. 撤销更改
git checkout -- file.js     # 撤销工作区修改
git reset HEAD file.js      # 取消暂存
git reset --soft HEAD~1     # 撤销最后一次提交（保留更改）
git reset --hard HEAD~1     # 撤销最后一次提交（丢弃更改）

# 9. 分支管理
git branch                   # 列出分支
git branch -d feature-xxx   # 删除本地分支
git push origin --delete feature-xxx  # 删除远程分支

# 10. 暂存工作（临时切换任务）
git stash                    # 暂存当前工作
git stash pop               # 恢复暂存的工作
git stash list              # 查看暂存列表
```

### 提交规范（Conventional Commits）

```bash
# 格式：<type>(<scope>): <subject>

# 类型
feat:     新功能
fix:      修复bug
docs:     文档更新
style:    代码格式（不影响功能）
refactor: 重构
perf:     性能优化
test:     测试
chore:    构建/工具配置

# 示例
git commit -m "feat(auth): 添加JWT登录功能"
git commit -m "fix(api): 修复用户注册时参数错误"
git commit -m "docs: 更新README安装说明"
git commit -m "perf: 优化首页加载速度"
```

### 查看命令

```bash
# 查看文件修改内容
git diff
git diff file.js

# 查看提交历史
git log
git log --oneline --graph --all  # 图形化（推荐）
git log -p               # 显示每次提交的修改
git log --author="Chesten"  # 查看某人的提交

# 查看某次提交
git show <commit-hash>
git show HEAD             # 查看最新提交

# 查看分支
git branch -v             # 显示分支和最新提交
git branch -a             # 显示所有分支（包括远程）
git branch --merged       # 已合并的分支
git branch --no-merged    # 未合并的分支
```

### 撤销操作（危险操作，谨慎使用）

```bash
# 撤销工作区修改
git checkout -- file.js
git restore file.js       # Git 2.23+ 新命令

# 撤销暂存
git reset HEAD file.js
git restore --staged file.js

# 撤销提交
git reset --soft HEAD~1   # 撤销提交，保留修改在暂存区
git reset --mixed HEAD~1  # 撤销提交，保留修改在工作区（默认）
git reset --hard HEAD~1   # 撤销提交，丢弃所有修改 ⚠️

# 撤销已推送的提交（慎用！）
git revert <commit-hash>  # 创建新提交来撤销（推荐）
git push -f origin main   # 强制推送 ⚠️⚠️⚠️

# 恢复删除的文件
git checkout HEAD~1 -- file.js
git restore --source=HEAD~1 file.js

# 找回丢失的提交
git reflog                # 查看所有操作记录
git reset --hard <commit-hash>
```

---

## 🌿 分支管理策略

### 策略1：GitHub Flow（简单，推荐小团队）

```
main (永远是可部署状态)
  │
  ├─ feature分支
  │   ├─ Pull Request
  │   ├─ Code Review
  │   └─ Merge
  │
  └─ 直接部署main分支
```

**特点**：
- ✅ 简单易用
- ✅ 适合持续部署
- ✅ 主分支永远稳定

**适用场景**：
- 小型团队
- 频繁发布
- SaaS产品

---

### 策略2：Git Flow（严谨，适合大项目）

```
main (生产)
  │
  ├─ develop (开发)
  │   │
  │   ├─ feature/* (功能)
  │   ├─ release/* (发布)
  │   └─ bugfix/* (修复)
  │
  └─ hotfix/* (紧急修复)
```

**特点**：
- ✅ 结构清晰
- ✅ 适合版本发布
- ❌ 稍显复杂

**适用场景**：
- 中大型团队
- 有明确版本号
- 需要发布周期

---

### 策略3：Trunk-Based Development（激进，适合大厂）

```
trunk (主分支)
  │
  ├─ 每天多次合并到trunk
  ├─ 功能开关控制新功能
  └─ 持续集成/部署
```

**特点**：
- ✅ 避免长期分支
- ✅ 强制持续集成
- ❌ 需要完善的CI/CD

**适用场景**：
- 大型团队（Google、Facebook）
- 完善的CI/CD
- 功能开关系统

---

### 分支命名规范

```bash
# 功能开发
feature/user-auth
feature/payment-gateway
feature/b5-print-export

# Bug修复
bugfix/login-crash
bugfix/memory-leak

# 紧急修复
hotfix/security-patch
hotfix/downgrade-api

# 发布版本
release/v1.2.0
release/2025.01

# 实验
experiment/new-ui
experiment/ai-integration

# RFC/设计
rfc/b5-print-design
draft/mobile-app

# 个人分支（方便识别）
chesten/feature-xxx
alice/bugfix-yyy
```

---

## 👥 团队协作流程

### 场景1：多人同时开发不同功能

```bash
# 开发者A
git checkout -b feature/payment
# ... 开发支付功能 ...
git push origin feature/payment

# 开发者B
git checkout -b feature/shipping
# ... 开发物流功能 ...
git push origin feature/shipping

# 两人都完成后，分别创建PR合并到main
# 互不干扰
```

---

### 场景2：代码审查（Code Review）

```bash
# 1. 开发者创建功能分支
git checkout -b feature/user-profile
# ... 开发 ...
git push origin feature/user-profile

# 2. 在GitHub/GitLab创建Pull Request

# 3. 审查者（Reviewer）操作：
#    - 查看代码变更
#    - 添加评论（line comments）
#    - Request Changes（需要修改）
#    - Approve（批准）

# 4. 开发者根据反馈修改
git checkout feature/user-profile
# ... 修改 ...
git add .
git commit -m "address review comments"
git push

# 5. 审查通过后，合并PR
#    - 使用Merge（保留完整历史）
#    - 或Squash and Merge（合并为一个提交）
#    - 或Rebase and Merge（线性历史）
```

---

### 场景3：解决冲突

```bash
# 情况：两个分支修改了同一处代码

# 1. 拉取最新代码时发现冲突
git pull origin main
# Auto-merge failed; fix conflicts and then commit the result.

# 2. 查看冲突文件
git status
# both modified: src/utils/auth.js

# 3. 手动解决冲突
# 编辑文件，查找冲突标记：
# <<<<<<< HEAD
# 你的代码
# =======
# 别人的代码
# >>>>>>> origin/main

# 4. 保留需要的代码，删除标记

# 5. 标记为已解决
git add src/utils/auth.js

# 6. 提交
git commit -m "merge: 解决冲突"

# 7. 推送
git push origin feature/xxx
```

**冲突解决工具**：
```bash
# 使用VSCode解决（推荐）
code src/utils/auth.js  # VSCode内置冲突解决工具

# 或使用merge工具
git mergetool
```

---

### 场景4：远程分支更新（Rebase）

```bash
# 你的功能分支落后于main

# 方法1：Merge（保留历史）
git checkout feature/xxx
git fetch origin
git merge origin/main
# 会产生一个merge commit

# 方法2：Rebase（线性历史，推荐）
git checkout feature/xxx
git fetch origin
git rebase origin/main
# 将你的提交"挪"到最新main之上

# 如果有冲突
# 解决冲突后
git add .
git rebase --continue

# 放弃rebase
git rebase --abort

# 强制推送（因为rebase改写了历史）
git push -f origin feature/xxx  ⚠️
```

**Merge vs Rebase**：

| 方式 | 优点 | 缺点 | 推荐场景 |
|------|------|------|---------|
| **Merge** | 保留完整历史 | 历史非线性，有分叉 | 公共分支、团队协作 |
| **Rebase** | 线性历史，清晰 | 改写历史，有风险 | 个人功能分支 |

---

## ✅ 最佳实践

### 1. 提交规范

```bash
# ✅ 好的提交
git commit -m "feat(auth): 添加JWT登录功能"
git commit -m "fix: 修复用户注册时密码加密错误"
git commit -m "docs: 更新API文档"

# ❌ 不好的提交
git commit -m "update"
git commit -m "fix bug"
git commit -m "今天的工作"
```

**为什么重要**：
- 便于理解历史
- 便于生成日志
- 便于自动化工具（如版本号生成）

---

### 2. 分支策略

```bash
# ✅ 好的分支命名
feature/user-auth
bugfix/login-crash
hotfix/security-patch-2025-01-03
release/v2.0.0

# ❌ 不好的分支命名
xxx
test
temp
fix
```

---

### 3. 频繁提交，小步快跑

```bash
# ✅ 好的做法：小步提交
git commit -m "feat: 添加用户模型"
git commit -m "feat: 添加数据库迁移"
git commit -m "feat: 实现注册API"
git commit -m "test: 添加注册测试"

# ❌ 不好的做法：大而全的提交
git commit -m "实现用户系统（包含模型、API、前端、测试...）"
```

---

### 4. .gitignore 必不可少

```bash
# .gitignore 示例

# 依赖
node_modules/
__pycache__/
venv/

# 构建产物
dist/
build/
*.pyc

# 环境变量
.env
.env.local

# IDE
.vscode/
.idea/
*.swp

# 日志
*.log
logs/

# 操作系统
.DS_Store
Thumbs.db

# 临时文件
*.tmp
*.bak
```

```bash
# 常用.gitignore模板
git ignore node_modules      # GitHub上的gist
git ignore python            # gitignore.io
```

---

### 5. 提交前检查

```bash
# 1. 查看修改了什么
git status

# 2. 查看具体改了什么
git diff

# 3. 添加到暂存区
git add .

# 4. 再次确认
git diff --staged

# 5. 提交
git commit -m "feat: xxx"

# 6. 推送前先拉取
git pull --rebase origin main
git push
```

---

### 6. 不要提交的内容

```bash
# ❌ 不要提交
- 敏感信息（密码、密钥、token）
- node_modules/, venv/, __pycache__/
- 构建产物（dist/, build/）
- 个人配置文件（.env.local）
- 大文件（>100MB，用Git LFS）
- 临时文件（*.log, *.tmp）

# ✅ 应该提交
- 源代码
- 配置文件（.env.example, config.example）
- 文档（README.md, docs/）
- 测试代码
- 构建脚本（package.json, requirements.txt）
```

---

## 🔧 问题排查

### 1. 查看状态

```bash
# 第一步：看看发生了什么
git status

# 输出解释：
# On branch main            # 当前在main分支
# Your branch is up to date with 'origin/main'.  # 和远程同步
# Changes not staged for commit:  # 有修改但未暂存
#   modified:   file.js    # 修改了file.js
# Untracked files:         # 有未跟踪的文件
#   new-file.js
```

---

### 2. 找回丢失的提交

```bash
# 场景：不小心 git reset --hard 丢失了提交

# 1. 查看操作记录
git reflog

# 输出：
# d51dd3a HEAD@{0}: reset: moving to d51dd3a
# a1b2c3d HEAD@{1}: commit: feat: 添加登录功能
# e4f5g6h HEAD@{2}: commit: fix: 修复bug

# 2. 找到丢失的commit hash（a1b2c3d）

# 3. 恢复
git reset --hard a1b2c3d

# 或者创建新分支指向它
git branch lost-commit a1b2c3d
```

---

### 3. 撤销错误的提交

```bash
# 场景：提交了不该提交的文件（如node_modules）

# 方法1：撤销最后一次提交（保留修改）
git reset --soft HEAD~1
# 然后修改.gitignore
git add .
git commit -m "feat: xxx"

# 方法2：撤销最后一次提交（丢弃修改）
git reset --hard HEAD~1

# 方法3：只移除某个文件
git reset HEAD node_modules/package.json
git restore --staged package.json
```

---

### 4. 推送被拒绝

```bash
# 场景：远程和本地不一致
git push origin main
# ! [rejected] main -> main (fetch first)

# 解决方法1：先拉取再推送
git pull origin main
# 解决冲突
git push origin main

# 解决方法2：变基（如果你确定你的更新是最新的）
git pull --rebase origin main
git push origin main

# 解决方法3：强制推送（慎用！可能丢失他人代码）
git push -f origin main  ⚠️⚠️⚠️
```

---

### 5. 查看文件历史

```bash
# 查看文件的修改历史
git log --follow file.js

# 查看某行是谁写的
git blame file.js

# 查看某个文件在某次提交时的内容
git show <commit-hash>:file.js

# 恢复文件到某个版本
git checkout <commit-hash> -- file.js
```

---

## 🚀 高级技巧

### 1. Git Hooks（自动化）

```bash
# 位置：.git/hooks/

# 常用hooks
pre-commit     # 提交前（代码检查、格式化）
commit-msg     # 提交信息检查
pre-push       # 推送前（运行测试）
post-merge     # 合并后（安装依赖）

# 示例：提交前运行eslint
#!/bin/bash
# .git/hooks/pre-commit
npm run lint
if [ $? -ne 0 ]; then
  echo "代码检查未通过，请修复后再提交"
  exit 1
fi
```

**使用Husky（推荐）**：

```bash
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "npm run lint"
```

---

### 2. Git Alias（快捷命令）

```bash
# 创建别名
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.lg "log --graph --oneline --all"

# 使用
git st          # = git status
git co main     # = git checkout main
git br          # = git branch
git ci -m "xxx" # = git commit -m "xxx"
git unstage file.js  # = git reset HEAD -- file.js
git lg          # = git log --graph --oneline --all
```

---

### 3. Git Cherry-pick（挑拣提交）

```bash
# 场景：想要某个分支上的特定提交，但不要整个分支

# 1. 找到想要的commit hash
git log feature/xxx

# 2. 挑拣提交到当前分支
git cherry-pick <commit-hash>

# 3. 挑拣多个提交
git cherry-pick <hash1> <hash2> <hash3>

# 4. 挑拣范围（不包括起始commit）
git cherry-pick <hash1>..<hash2>

# 5. 只挑拣不自动提交
git cherry-pick -n <commit-hash>
```

---

### 4. Git Stash（暂存工作）

```bash
# 场景：正在开发功能A，突然需要修复bugB

# 1. 暂存当前工作
git stash push -m "开发到一半的功能A"

# 2. 切换分支修复bug
git checkout main
git checkout -b hotfix/bug-b
# ... 修复 ...
git commit -m "fix: 修复bugB"

# 3. 回到功能A分支
git checkout feature/feature-a

# 4. 恢复暂存的工作
git stash pop

# 其他stash命令
git stash list              # 查看暂存列表
git stash apply             # 应用但不删除stash
git stash drop stash@{0}    # 删除stash
git stash clear             # 清空所有stash
git stash show              # 查看stash的内容
```

---

### 5. Git Bisect（二分查找bug）

```bash
# 场景：代码中有个bug，但不知道是哪个提交引入的

# 1. 开始二分查找
git bisect start

# 2. 标记当前版本有bug
git bisect bad

# 3. 标记某个已知好的版本
git bisect good v1.0.0

# 4. Git会自动切换到中间版本
#    测试是否有bug
git bisect bad  # 或 git bisect good

# 5. 重复测试，直到找到引入bug的提交
git bisect reset  # 结束二分查找
```

---

### 6. 子模块和子树

```bash
# 场景：项目中需要引入其他Git仓库

# 方法1：Submodule（推荐）
git submodule add https://github.com/user/repo.git lib/repo
git submodule update --init --recursive

# 方法2：Subtree
git subtree add --prefix=lib/repo https://github.com/user/repo.git main
```

---

### 7. Git Worktree（多分支并行工作）

```bash
# 场景：同时在两个分支上工作，不需要频繁切换

# 1. 创建worktree
git worktree add ../project-hotfix hotfix/urgent-bug

# 2. 现在有两个目录
# ./project-main     (main分支)
# ../project-hotfix  (hotfix/urgent-bug分支)

# 3. 在hotfix分支工作
cd ../project-hotfix
# ... 修复bug ...
git commit -m "fix: xxx"

# 4. 完成后删除worktree
git worktree remove ../project-hotfix

# 查看所有worktree
git worktree list
```

---

## 📊 Git 工作流对比

| 工作流 | 复杂度 | 适用团队 | 优点 | 缺点 |
|--------|--------|---------|------|------|
| **Centralized** | ⭐ | 个人、小团队 | 简单 | 容易冲突 |
| **Feature Branch** | ⭐⭐ | 小团队 | 清晰 | 需要手动合并 |
| **GitHub Flow** | ⭐⭐ | 小中型 | PR审查 | 无develop分支 |
| **Git Flow** | ⭐⭐⭐ | 中大型 | 结构严谨 | 复杂，发布频繁时麻烦 |
| **Trunk-Based** | ⭐⭐⭐⭐ | 大型（Google） | 持续集成 | 需要完善的CI/CD |
| **Fork & PR** | ⭐⭐ | 开源项目 | 贡献者独立 | 合并麻烦 |

**推荐**：
- 个人项目：Centralized
- 小团队（2-5人）：GitHub Flow
- 中团队（5-20人）：Git Flow
- 大团队（20+人）：Trunk-Based

---

## 🎓 学习资源

### 官方文档
- [Git 官方文档](https://git-scm.com/doc)
- [GitHub Git Guide](https://guides.github.com/introduction/git-handbook/)
- [Atlassian Git Tutorial](https://www.atlassian.com/git/tutorials)

### 可视化学习
- [Learn Git Branching](https://learngitbranching.js.org/) ⭐⭐⭐⭐⭐ 强烈推荐
- [Git Visualizer](https://git-school.github.io/visualizing-git-commands/)

### 书籍
- 《Pro Git》（免费在线）
- 《Git权威指南》

### 工具
- **GUI客户端**：
  - SourceTree（免费）
  - GitKraken（免费）
  - Tower（付费）
  - GitHub Desktop（免费）

- **在线学习**：
  - learngitbranching.js.org（互动教程）

---

## 💡 总结

### Git核心思想

1. **分支即便宜** - 多用分支，不要害怕
2. **频繁提交** - 小步快跑，方便回滚
3. **写好commit message** - 清晰明了，方便追溯
4. **推送前拉取** - 避免冲突
5. **善用.gitignore** - 不提交垃圾文件

### 日常流程（最简版）

```bash
git pull                    # 1. 拉取最新
git checkout -b feature/xxx  # 2. 创建分支
# ... 开发 ...
git add .                   # 3. 添加修改
git commit -m "feat: xxx"   # 4. 提交
git push -u origin feature/xxx  # 5. 推送
# ... PR、审查、合并 ...
git checkout main           # 6. 切回主分支
git pull                    # 7. 拉取最新
git branch -d feature/xxx   # 8. 删除分支
```

### 遇到问题记住

```bash
git status    # 看状态
git log       # 看历史
git reflog    # 找回丢失的东西
git help      # 查看帮助
```

---

**最后建议**：
- 不要害怕Git，多练习
- 小项目随便试验，大项目谨慎操作
- 遇到问题先查看 `git status`
- 重要操作前先备份或打tag

Happy Coding! 🚀
