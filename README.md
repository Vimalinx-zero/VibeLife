# VibeLife

> 个人成长与一人公司工作台

[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

## 项目定位

VibeLife 是一套围绕个人执行、项目推进与日常复盘构建的工作台。当前主线能力包括：

- 工作台：今日待办、专注会话、快速规划
- 笔记系统：Markdown、双向链接、标签、全文搜索
- 项目管理：项目、步骤、资源、跟进项
- 日志与日程：日记、事件、节奏管理
- Quick Capture：快速采集外部内容
- AI 工作台：站内 AI 对话与 OpenClaw 接入

## 技术栈

- 前端：React 19 + Vite + TypeScript + Tailwind CSS
- 后端：FastAPI + SQLAlchemy + SQLite
- AI 接入：OpenClaw、本地模型、OpenAI 兼容接口

## 快速启动

### 方式 1：一键启动

```bash
./start.sh start
```

### 方式 2：分别启动

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

## 常用命令

```bash
# 前端
cd frontend
npm run dev
npm run build
npx tsc --noEmit

# 后端
cd backend
python start_server.py

# 一键脚本
./start.sh start
./start.sh stop
./start.sh status
```

## 数据库

- 新默认数据库文件：`backend/vibelife.db`
- 如果仓库里已经存在历史 SQLite 文件，后端会自动兼容并继续使用，避免直接把现有数据切空
- 也可以通过环境变量 `VIBELIFE_DB_PATH` 指定数据库文件

## OpenClaw

当前仓库已接入 VibeLife 专用的 OpenClaw 运行桥接，相关入口主要在：

- `backend/ai_routes.py`
- `backend/openclaw_bridge.py`
- `openclaw-vibelife-plugin/index.js`

如果要把 VibeLife 作为 OpenClaw 的业务工作台使用，优先走这套链路。

## 当前主目录

```text
backend/                  FastAPI 服务与数据模型
frontend/                 React 前端
openclaw-vibelife-plugin/ VibeLife 对应的 OpenClaw 插件
scripts/                  启动、服务安装与辅助脚本
docs/                     项目文档
```

## 说明

- 旧学习域代码已经从主运行链路移除
- 仓库里若仍有历史学习文档或导出物，多为归档参考，不属于当前主产品能力
