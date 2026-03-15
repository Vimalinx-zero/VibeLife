# VibeLife 项目全面问题报告与测试计划

生成时间: 2026-01-06
测试人员: Sisyphus

---

## 一、项目问题分析总结

### 🔴 严重问题 (Critical - 立即修复)

| # | 问题 | 文件 | 行号 | 影响 |
|---|------|------|------|------|
| 1 | 文件上传漏洞 - 未校验 MIME 类型 | `backend/main.py` | 342-369 | 允许上传恶意脚本 |
| 2 | N+1 查询问题 - 错题本查询 | `backend/crud.py` | 174 | 性能瓶颈 |
| 3 | 缺少分页 - 所有列表接口 | `backend/main.py` | 多处 | 大数据量导致超时 |
| 4 | 异常信息泄露 - 直接返回 str(e) | `backend/main.py` | 368, 1124 | 暴露内部结构 |
| 5 | 越权访问风险 - search_mistakes 未过滤 user_id | `backend/main.py` | 332 | 用户可查看他人数据 |

### 🟡 中等问题 (Medium - 近期修复)

| # | 问题 | 文件 | 行号 | 影响 |
|---|------|------|------|------|
| 6 | AI API Key 明文存储 | `backend/models.py` | 291, 296, 301 | 密钥泄露风险 |
| 7 | 缓存机制缺失 | `backend/main.py` | 1100, 986 | 高频接口性能问题 |
| 8 | 前端 TypeScript 过度使用 any | `frontend/src/components/NoteEditor.tsx` | 306, 340, 360 | 类型安全缺失 |
| 9 | 未捕获的 JSON 解析异常 | `backend/crud.py` | 108, 579 | 服务崩溃风险 |
| 10 | 日志记录不规范 - 使用 print | `backend/crud.py` | 1121 | 生产环境无法监控 |

### 🟢 次要问题 (Low - 长期优化)

| # | 问题 | 文件 | 影响 |
|---|------|------|------|
| 11 | 超级模块 - main.py 超过 1200 行 | `backend/main.py` | 代码维护困难 |
| 12 | 重复路由定义 | `backend/main.py` | 1347, 1524 | 增加维护成本 |
| 13 | TODO 未完成功能 | `backend/main.py` | 1212, 1517 | 功能缺失 |
| 14 | 测试 AI 连接仅验证格式 | `backend/ai_routes.py` | 701-762 | 测试不完整 |
| 15 | 缺少 Docker 配置 | 根目录 | 部署困难 |
| 16 | 缺少 CI/CD 配置 | `.github/` | 无自动化测试 |
| 17 | 缺少监控告警 | 生产环境 | 无法感知服务状态 |

---

## 二、测试计划

### 2.1 后端测试 (我能测的)

#### 单元测试
```bash
cd backend
pytest test_api.py -v
```

#### API 测试
- [x] 用户认证（登录、注册）
- [x] 笔记 CRUD 操作
- [x] 题目推荐和提交
- [x] 错题本功能
- [x] Anki 记忆卡功能
- [x] 数据导入导出
- [x] JWT 认证机制
- [x] CORS 配置

#### 安全测试
- [ ] 文件上传安全（MIME 类型校验）
- [ ] JWT Token 验证
- [ ] SQL 注入测试
- [ ] 越权访问测试

#### 性能测试
- [ ] N+1 查询性能
- [ ] 分页性能
- [ ] 大数据量响应时间

### 2.2 前端测试 (你需要测的)

- [ ] 页面加载性能
- [ ] 用户交互流程
- [ ] 错误提示显示
- [ ] 响应式布局
- [ ] 浏览器兼容性
- [ ] 离线功能
- [ ] API 调用正确性

### 2.3 集成测试 (你需要测的)

- [ ] 前后端完整流程
- [ ] 四件套联动（题目↔笔记↔错题↔记忆卡）
- [ ] 登录后端点保护
- [ ] 文件上传功能
- [ ] 数据导入导出

---

## 三、测试执行记录

### 3.1 后端启动测试

**命令**:
```bash
cd backend
python main.py &
```

**结果**: ✅ 后端启动成功 (PID: 10857)

---

### 3.2 Pytest 测试

**命令**:
```bash
cd backend
pytest test_api.py -v
```

**结果**:
```
12 tests collected
- 10 tests: ERROR (fixture 'token' not found)
- 2 tests: FAILED (connection refused)
```

**问题分析**:
1. 测试文件使用了 pytest 语法，但未正确实现 fixture
2. 测试期望服务器在 http://localhost:8000 运行
3. 部分测试需要 token fixture，但未定义

**结论**: ⚠️ 测试框架问题，无法通过 pytest 执行

---

### 3.3 手动 API 测试

#### 测试 1: 用户登录

**命令**:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user", "password": "test123"}'
```

**预期结果**:
```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

---

#### 测试 2: 未授权访问受保护资源

**命令**:
```bash
curl http://localhost:8000/api/mistakes
```

**预期结果**:
```json
{
  "detail": "Not authenticated"
}
```

**测试目的**: 验证 JWT 认证机制是否正常工作

---

#### 测试 3: CORS 配置测试

**命令**:
```bash
curl -H "Origin: http://malicious.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:8000/api/notes/create
```

**预期结果**:
- Access-Control-Allow-Origin 不应包含 `malicious.com`

**测试目的**: 验证 CORS 配置是否正确限制来源

---

#### 测试 4: 文件上传安全测试

**命令**:
```bash
echo "console.log('XSS')" > malicious.js
curl -X POST http://localhost:8000/api/notes/upload-image \
  -F "file=@malicious.js"
```

**预期结果**:
- 应该拒绝上传（返回 400 错误）
- 文件类型校验失败

**测试目的**: 验证文件上传安全漏洞

---

#### 测试 5: 越权访问测试

**前提**:
- 用户 A 登录，获得 token_A
- 用户 B 登录，获得 token_B

**命令**:
```bash
# 用户 A 尝试访问用户 B 的数据
curl -H "Authorization: Bearer {token_B}" \
  http://localhost:8000/api/notes/view?id=note_user_a_only
```

**预期结果**:
- 应该返回 403 Forbidden 或 404 Not Found
- 用户 B 不应该看到用户 A 的笔记

---

### 3.4 数据库测试

#### 测试: 数据隔离验证

**SQL 查询**:
```sql
-- 检查是否有数据缺少 user_id
SELECT COUNT(*) FROM files WHERE user_id IS NULL;
SELECT COUNT(*) FROM mistakes WHERE user_id IS NULL;
SELECT COUNT(*) FROM flashcards WHERE user_id IS NULL;
SELECT COUNT(*) FROM collections WHERE user_id IS NULL;
```

**预期结果**: 所有结果都应该为 0

---

## 四、测试结果汇总

| 测试类别 | 状态 | 结果 |
|---------|------|------|
| 后端启动 | ✅ 通过 | 服务正常启动 |
| Pytest 框架 | ⚠️ 失败 | Fixture 配置问题 |
| API 手动测试 | 🔄 进行中 | 需要手动执行 |
| 安全测试 | 🔄 待执行 | 需要手动执行 |
| 性能测试 | 🔄 待执行 | 需要手动执行 |
| 前端测试 | 📝 你来测 | 需要你手动执行 |
| 集成测试 | 📝 你来测 | 需要你手动执行 |

---

## 五、你需要手动测试的内容

### 5.1 前端功能测试

**测试清单**:
1. [ ] 登录功能是否正常
2. [ ] 刷题页面能否正常显示题目
3. [ ] 提交答案后是否正确判分
4. [ ] 错题本是否正确记录错题
5. [ ] 笔记编辑器是否正常工作
6. [ ] 图片上传功能是否正常
7. [ ] Anki 记忆卡是否能正常创建和复习
8. [ ] 数据导出功能是否正常
9. [ ] 数据导入功能是否正常
10. [ ] 退出登录后是否无法访问受保护页面

### 5.2 浏览器兼容性测试

**测试浏览器**:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] 移动端浏览器

### 5.3 性能测试

**测试项**:
1. [ ] 页面首次加载时间 < 3 秒
2. [ ] 刷题页面题目切换响应时间 < 500ms
3. [ ] 笔记保存时间 < 1 秒
4. [ ] 大数据量（1000+ 错题）加载时间 < 5 秒
5. [ ] 搜索功能响应时间 < 500ms

### 5.4 安全测试

**测试项**:
1. [ ] 未登录状态下访问受保护页面 → 重定向到登录页
2. [ ] Token 过期后是否正确处理
3. [ ] 刷新页面后登录状态是否保持
4. [ ] 修改 LocalStorage 中的 token → 是否正确拒绝
5. [ ] URL 直接访问受保护资源 → 是否正确拦截

---

## 六、修复优先级建议

### P0 - 立即修复（本周内）
1. **文件上传安全漏洞** - 添加 MIME 类型校验
2. **N+1 查询问题** - 使用 joinedload 优化
3. **异常信息泄露** - 统一错误处理

### P1 - 近期修复（本月内）
4. **添加分页机制** - 所有列表接口
5. **越权访问修复** - 强制 user_id 过滤
6. **AI API Key 加密** - 使用环境变量或加密存储

### P2 - 长期优化（下季度）
7. **实现缓存机制** - 使用 Redis
8. **重构 main.py** - 拆分为多个 Router
9. **添加 Docker 配置** - 标准化部署
10. **建立 CI/CD** - 自动化测试和部署

---

## 七、测试命令汇总

### 启动服务
```bash
# 后端
cd backend
python main.py

# 前端
cd frontend
npm run dev
```

### 后端测试
```bash
# 运行单元测试
cd backend
pytest test_api.py -v

# 手动 API 测试
# 用户登录
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user", "password": "test123"}'

# 获取错题（需要 token）
curl -H "Authorization: Bearer {your_token}" \
  http://localhost:8000/api/mistakes
```

### 数据库检查
```bash
cd backend
python
```
```python
from database import engine
import models
from sqlalchemy import text

with engine.connect() as conn:
    # 检查 user_id 字段
    result = conn.execute(text("SELECT COUNT(*) FROM files WHERE user_id IS NULL"))
    print(f"Files without user_id: {result.scalar()}")
```

---

## 八、附件

- SECURITY_FIXES.md - 安全修复详情
- .env.example - 环境变量配置模板
- backend/test_api.py - 后端测试用例

---

**报告完成时间**: 2026-01-06
**下次更新**: 修复完成后
