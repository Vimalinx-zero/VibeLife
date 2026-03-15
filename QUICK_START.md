# VibeLife 快速启动指南

## 启动

### 一键启动

```bash
./start.sh start
```

### 分别启动

```bash
cd backend
python start_server.py
```

```bash
cd frontend
npm run dev
```

默认地址：

- 前端：http://localhost:5173
- 后端：http://localhost:8000
- API 文档：http://localhost:8000/docs

## 常见操作

```bash
./start.sh stop
./start.sh restart
./start.sh status
./start.sh logs backend
./start.sh logs frontend
```

## 数据

- 默认数据库：`backend/vibelife.db`
- 如果仓库里已有历史 SQLite 文件，后端会自动兼容使用
- 也可以通过 `VIBELIFE_DB_PATH` 指定数据库路径

## AI

- 站内 AI 配置入口：设置面板
- OpenClaw 集成入口：`/api/ai/chat`、`/api/ai/quick-qa-stream`
