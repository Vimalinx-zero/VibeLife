# VibeLife WSL2 启动指南

## Windows 直接启动

- 启动：双击 `start_wsl.bat`
- 停止：双击 `stop_wsl.bat`

这两个脚本现在会基于当前仓库所在路径启动，不再依赖固定的旧目录。

## WSL 终端启动

在项目根目录执行：

```bash
./start.sh start
```

其他常用命令：

```bash
./start.sh stop
./start.sh restart
./start.sh status
./start.sh logs backend
./start.sh logs frontend
```

## 访问地址

- 前端：http://localhost:5173
- 后端：http://localhost:8000
- API 文档：http://localhost:8000/docs

## 目录说明

```text
.
├── start.sh
├── start_wsl.bat
├── stop_wsl.bat
├── backend/
├── frontend/
├── .pids/
└── logs/
```

## 数据库

- 默认使用 `backend/vibelife.db`
- 若检测到历史数据库文件，系统会自动兼容
