# VibeLife 启动脚本指南

## 快速开始

在项目根目录执行：

```bash
./start.sh start
```

脚本会自动完成：

- 检查 Python 与 Node.js 环境
- 创建并使用后端虚拟环境
- 安装前后端依赖
- 检查端口占用
- 启动前后端服务
- 记录日志与 PID

## 命令列表

| 命令 | 说明 |
|------|------|
| `./start.sh start` | 启动所有服务 |
| `./start.sh stop` | 停止所有服务 |
| `./start.sh restart` | 重启所有服务 |
| `./start.sh status` | 查看服务状态 |
| `./start.sh logs backend` | 查看后端日志 |
| `./start.sh logs frontend` | 查看前端日志 |
| `./start.sh setup` | 只初始化环境 |
| `./start.sh clean` | 清理生成文件 |

## 生成文件

- `.pids/`：服务进程 PID
- `logs/backend.log`：后端日志
- `logs/frontend.log`：前端日志

## 访问地址

- 前端：http://localhost:5173
- 后端：http://localhost:8000
- API 文档：http://localhost:8000/docs

## Windows 入口

- `start_wsl.bat`
- `stop_wsl.bat`
- `start_app.bat`
