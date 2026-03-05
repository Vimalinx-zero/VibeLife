# FlowStudy 安装包使用说明

## 📦 安装包文件

打包后，在 `release/` 目录下会生成以下文件：

```
release/
├── FlowStudy.exe      # Windows 可执行文件
└── FlowStudy         # Linux 可执行文件
```

---

## 🚀 Windows 安装

### 方法 1: 直接运行（推荐）

1. 将 `FlowStudy.exe` 复制到任意目录
2. 双击 `FlowStudy.exe` 运行
3. 浏览器会自动打开 http://localhost:5173

### 方法 2: 使用 start.bat

1. 双击 `start.bat`
2. 服务会自动在后台启动
3. 浏览器自动打开

### 停止服务

- 关闭启动窗口
- 或按 `Ctrl+C`

---

## 🐧 Linux 安装

### 方法 1: 直接运行（推荐）

```bash
# 1. 赋予执行权限
chmod +x FlowStudy

# 2. 运行
./FlowStudy

# 3. 浏览器自动打开 http://localhost:5173
```

### 方法 2: 使用 start.sh

```bash
# 运行启动脚本
./start.sh

# 停止服务：按 Ctrl+C
```

---

## 🌐 访问应用

### 前端
- http://localhost:5173

### 后端 API
- http://localhost:8000
- API 文档：http://localhost:8000/docs

### 默认测试账号

```
用户名: test_user
密码: test123
```

---

## 📊 数据库

首次运行时会自动创建 `flowstudy.db` 数据库文件，并插入种子数据：
- 10 道测试题目
- 8 个测试笔记
- 3 条错题记录
- 5 张测试记忆卡
- 2 个学习会话
- 3 个待办事项

---

## ⚙️ 配置文件

应用会在以下位置创建配置文件：

### Windows
```
C:\Users\%USERNAME%\.flowstudy\.env
```

### Linux
```
~/.flowstudy/.env
```

配置文件包含：
- 后端端口号（默认 8000）
- 前端端口号（默认 5173）
- 数据库路径
- JWT 密钥等

---

## 🐛 故障排查

### 问题 1: 端口被占用

**Windows**:
```powershell
# 查找占用 8000 端口的进程
netstat -ano | findstr :8000
# 杀死进程
taskkill /PID <进程ID> /F
```

**Linux**:
```bash
# 查找占用 8000 端口的进程
lsof -i :8000
# 杀死进程
kill -9 <PID>
```

### 问题 2: 前端页面无法访问

1. 检查防火墙设置
2. 确认后端服务已启动
3. 查看控制台错误信息

### 问题 3: 数据库错误

1. 删除 `flowstudy.db` 重新启动
2. 检查文件权限
3. 确保有足够的磁盘空间

---

## 📝 版本信息

- **版本**: v1.0.0
- **发布日期**: 2026-01-09
- **主要更新**:
  - ✅ 修复所有 P0 安全漏洞
  - ✅ 完成 TypeScript 迁移
  - ✅ 添加分页支持
  - ✅ 性能优化（N+1 查询）

---

## 📖 功能列表

- ✅ 智能刷题系统
- ✅ 笔记管理（Markdown、双向链接）
- ✅ 错题本（熟练度追踪）
- ✅ Anki 记忆卡（SM-2 算法）
- ✅ 学习工作台（番茄钟、待办）
- ✅ 数据导入导出
- ✅ 用户认证（JWT）
- ✅ 知识图谱（开发中）

---

## 🤝 技术支持

如遇到问题，请访问：
- GitHub Issues: https://github.com/vimalinx/flowstudy/issues
- 文档: https://github.com/vimalinx/flowstudy
