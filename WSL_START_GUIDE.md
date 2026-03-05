# FlowStudy WSL2 启动指南

## 🚀 快速启动

### 方法 1：Windows 批处理（推荐）

**启动服务：**
双击 `start_wsl.bat` 文件

**停止服务：**
双击 `stop_wsl.bat` 文件

**查看状态：**
在 WSL 终端运行：
```bash
cd ~/Programs/flowstudy
./start.sh status
```

### 方法 2：WSL 终端

**启动服务：**
```bash
cd ~/Programs/flowstudy
./start.sh start
```

**停止服务：**
```bash
cd ~/Programs/flowstudy
./start.sh stop
```

**重启服务：**
```bash
cd ~/Programs/flowstudy
./start.sh restart
```

**查看状态：**
```bash
cd ~/Programs/flowstudy
./start.sh status
```

**查看日志：**
```bash
# 后端日志
./start.sh logs backend

# 前端日志
./start.sh logs frontend
```

## 📁 项目结构

```
flowstudy/
├── start.sh           # Linux/WSL 启动脚本
├── start_wsl.bat      # Windows 快捷启动
├── stop_wsl.bat       # Windows 快捷停止
├── backend/
│   ├── main.py        # FastAPI 后端
│   └── ...
├── frontend/
│   └── ...
├── .pids/             # 进程 PID 文件（自动生成）
└── logs/              # 日志文件（自动生成）
    ├── backend.log
    └── frontend.log
```

## 🔗 访问地址

启动成功后，可通过以下地址访问：

- **前端界面**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs
- **数据库**: SQLite (backend/flowstudy.db)

## 🛠️ 脚本功能

### start.sh 命令

| 命令 | 说明 |
|------|------|
| `start` | 启动所有服务（默认） |
| `stop` | 停止所有服务 |
| `restart` | 重启所有服务 |
| `status` | 查看服务运行状态 |
| `logs [backend\|frontend]` | 实时查看日志 |
| `help` | 显示帮助信息 |

### 特性

✅ 自动端口检查（防止冲突）
✅ 后台运行（无阻塞）
✅ 日志记录（便于调试）
✅ 进程管理（优雅停止）
✅ 彩色输出（易于阅读）
✅ 错误处理（启动失败提示）

## 🔧 故障排查

### 端口被占用

如果提示端口被占用：

```bash
# 查看占用端口的进程
lsof -i :8000  # 后端
lsof -i :5173  # 前端

# 强制停止
./start.sh stop
```

### 服务启动失败

查看日志文件：

```bash
# 后端日志
tail -f ~/Programs/flowstudy/logs/backend.log

# 前端日志
tail -f ~/Programs/flowstudy/logs/frontend.log
```

### 依赖问题

前端依赖缺失：

```bash
cd ~/Programs/flowstudy/frontend
npm install
```

后端依赖缺失：

```bash
cd ~/Programs/flowstudy/backend
pip install -r requirements.txt
```

## 📝 开发建议

1. **首次启动**: 建议先手动运行一次，确保所有依赖已安装
2. **查看日志**: 开发时可以使用 `logs` 命令实时查看日志
3. **停止服务**: 修改代码后记得重启服务（`restart` 命令）
4. **端口配置**: 如需修改端口，请编辑 `backend/main.py` 和 `frontend/vite.config.js`

## 🎯 快捷键提示

启动成功后，在应用中可使用以下快捷键：

- `Ctrl + S` - 保存笔记
- `Ctrl + B` - 粗体文本
- `Ctrl + I` - 斜体文本
- `Alt + 1~5` - 快速切换页面
- `Shift + ?` - 查看快捷键帮助

## 💡 提示

- 脚本会自动创建必要的目录（.pids, logs）
- 服务在后台运行，关闭终端不会停止服务
- 使用 `stop` 命令可以优雅地停止所有服务
- Windows 批处理文件需要 WSL2 已正确安装和配置
