# FlowStudy 启动脚本完整指南

## 🚀 快速开始

### 首次运行（自动配置一切）

```bash
cd ~/Programs/flowstudy
./start.sh start
```

脚本会自动完成：
- ✅ 检查 Python 和 Node.js 环境
- ✅ 创建 Python 虚拟环境
- ✅ 安装所有后端依赖
- ✅ 安装所有前端依赖
- ✅ 启动前后端服务

### Windows 用户

双击 `start_wsl.bat` 即可！

---

## 📋 命令说明

### 完整命令列表

| 命令 | 说明 | 示例 |
|------|------|------|
| `start` | 启动所有服务（默认） | `./start.sh start` |
| `stop` | 停止所有服务 | `./start.sh stop` |
| `restart` | 重启所有服务 | `./start.sh restart` |
| `status` | 查看服务状态 | `./start.sh status` |
| `logs` | 查看实时日志 | `./start.sh logs backend` |
| `setup` | 仅设置环境（不启动） | `./start.sh setup` |
| `clean` | 清理所有生成文件 | `./start.sh clean` |
| `help` | 显示帮助信息 | `./start.sh help` |

---

## 🔧 详细功能说明

### 1. start - 启动服务

**功能：**
- 环境检查（Python、Node.js）
- 虚拟环境创建和激活
- 依赖安装（后端、前端）
- 端口检查（8000、5173）
- 服务启动（后台运行）
- 日志记录

**使用场景：**
- 首次启动
- 日常开发启动

**输出示例：**
```
========================================
FlowStudy 开发环境启动
========================================

[INFO] 第 1 步：环境检查
[STEP] 检查 Python 环境...
[SUCCESS] Python 版本: 3.11.5
[SUCCESS] Python 环境检查通过 ✓
[STEP] 检查 Node.js 环境...
[SUCCESS] Node.js 版本: v20.10.0
[SUCCESS] Node.js 环境检查通过 ✓

[INFO] 第 2 步：虚拟环境配置
[STEP] 检查 Python 虚拟环境...
[SUCCESS] 虚拟环境已存在 ✓

[INFO] 第 3 步：依赖安装
[STEP] 检查后端依赖...
[SUCCESS] 后端依赖安装完成 ✓
[STEP] 检查前端依赖...
[SUCCESS] 前端依赖已安装 ✓

[INFO] 第 4 步：端口检查
[SUCCESS] 端口检查通过 ✓

[INFO] 第 5 步：启动服务
[INFO] 启动后端服务 (FastAPI)...
[SUCCESS] 后端服务已启动 (PID: 12345) ✓
[INFO] 启动前端服务 (Vite)...
[SUCCESS] 前端服务已启动 (PID: 12346) ✓

========================================
所有服务启动成功！
========================================

✓ 后端服务运行在: http://localhost:8000
✓ 前端服务运行在: http://localhost:5173
✓ API 文档地址: http://localhost:8000/docs
```

### 2. stop - 停止服务

**功能：**
- 优雅停止后端服务
- 优雅停止前端服务
- 清理 PID 文件
- 强制清理端口占用（备用）

**使用场景：**
- 下班前停止服务
- 修改代码后重启

### 3. status - 查看状态

**功能：**
- 检查后端服务运行状态
- 检查前端服务运行状态
- 显示访问地址

**输出示例：**
```
[INFO] 检查服务状态...
[SUCCESS] 后端服务运行中 (PID: 12345)
[SUCCESS] 前端服务运行中 (PID: 12346)

[SUCCESS] 所有服务运行正常 ✓

🚀 前端地址: http://localhost:5173
🔧 后端地址: http://localhost:8000
📖 API 文档: http://localhost:8000/docs
```

### 4. logs - 查看日志

**功能：**
- 实时查看后端日志
- 实时查看前端日志
- 支持退出（Ctrl+C）

**使用方法：**
```bash
# 查看后端日志
./start.sh logs backend

# 查看前端日志
./start.sh logs frontend
```

### 5. setup - 仅设置环境

**功能：**
- 环境检查
- 创建虚拟环境
- 安装所有依赖
- **不启动服务**

**使用场景：**
- CI/CD 环境
- 仅更新依赖
- 离线安装

### 6. clean - 清理环境

**功能：**
- 停止所有服务
- 删除虚拟环境
- 删除 node_modules
- 删除日志和 PID 文件

**使用场景：**
- 完全重新开始
- 清理磁盘空间
- 依赖冲突时重置

⚠️ **警告：此操作会删除所有生成的文件！**

---

## 📁 目录结构

```
flowstudy/
├── start.sh                    # 主启动脚本
├── start_wsl.bat              # Windows 快捷启动
├── stop_wsl.bat               # Windows 快捷停止
├── backend/
│   ├── venv/                  # Python 虚拟环境（自动创建）
│   ├── requirements.txt       # Python 依赖
│   ├── main.py               # FastAPI 入口
│   └── ...
├── frontend/
│   ├── node_modules/          # Node 依赖（自动安装）
│   ├── package.json          # Node 依赖配置
│   └── ...
├── .pids/                     # 进程 PID 文件（自动创建）
│   ├── backend.pid
│   └── frontend.pid
└── logs/                      # 日志文件（自动创建）
    ├── backend.log
    └── frontend.log
```

---

## 🛠️ 故障排查

### 问题 1：端口已被占用

**错误信息：**
```
[ERROR] 端口 8000 已被占用
[INFO] 占用进程: 12345
```

**解决方案：**
```bash
# 方案 1：使用 stop 命令
./start.sh stop

# 方案 2：手动杀死进程
kill -9 12345

# 方案 3：查找并杀死所有相关进程
lsof -ti:8000 | xargs kill -9
```

### 问题 2：Python 依赖安装失败

**错误信息：**
```
[ERROR] 后端依赖安装失败
```

**解决方案：**
```bash
# 手动进入虚拟环境安装
cd ~/Programs/flowstudy/backend
source venv/bin/activate
pip install -r requirements.txt
```

### 问题 3：Node 依赖安装失败

**错误信息：**
```
[ERROR] 前端依赖安装失败
```

**解决方案：**
```bash
# 手动安装
cd ~/Programs/flowstudy/frontend
npm install

# 如果仍有问题，尝试清除缓存
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### 问题 4：服务启动后立即停止

**检查日志：**
```bash
# 查看后端日志
cat ~/Programs/flowstudy/logs/backend.log

# 查看前端日志
cat ~/Programs/flowstudy/logs/frontend.log

# 实时查看
./start.sh logs backend
```

**常见原因：**
- 端口冲突
- 依赖版本不兼容
- 代码语法错误
- 数据库连接问题

---

## 💡 使用技巧

### 1. 开发时自动重启

修改代码后：
```bash
./start.sh restart
```

### 2. 仅查看环境状态

```bash
./start.sh status
```

### 3. 快速查看日志

```bash
# 后端日志
tail -f ~/Programs/flowstudy/logs/backend.log

# 前端日志
tail -f ~/Programs/flowstudy/logs/frontend.log
```

### 4. 清除所有重新开始

```bash
./start.sh clean
./start.sh start
```

---

## 🔐 环境要求

### Python
- **版本**: 3.8+
- **包管理**: pip3
- **虚拟环境**: venv（内置）

### Node.js
- **版本**: 16+
- **包管理**: npm

### 安装命令（Ubuntu/Debian）

```bash
# Python
sudo apt update
sudo apt install python3 python3-pip python3-venv

# Node.js（使用 nvm 推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
```

---

## 📝 更新日志

### v2.0（当前版本）
- ✨ 添加自动虚拟环境创建
- ✨ 添加自动依赖安装
- ✨ 添加环境检查
- ✨ 添加依赖更新检测
- ✨ 改进错误处理
- ✨ 添加 `setup` 命令
- ✨ 添加 `clean` 命令
- 🎨 改进输出格式和颜色

### v1.0
- 基础启动功能
- 服务管理
- 日志查看

---

## 🆘 获取帮助

```bash
./start.sh help
```

或查看详细文档：
- WSL 启动指南：`WSL_START_GUIDE.md`
- 项目 README：`README.md`
