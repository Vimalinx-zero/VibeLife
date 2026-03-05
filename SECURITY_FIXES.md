# FlowStudy 安全修复总结

## 修复日期
2026-01-06

## 修复概述

本次修复主要解决了以下安全问题：

1. **JWT 密钥硬编码** - 改为从环境变量读取
2. **CORS 配置过度宽松** - 限制允许的来源域名
3. **用户隔离不完整** - 移除所有硬编码的 user_id，强制使用 JWT 认证
4. **请求体用户伪造** - 移除从请求体中读取 user_id，改从 JWT token 获取

---

## 详细修复列表

### 1. JWT 密钥安全修复

**文件**: `backend/auth.py`

**问题**: JWT 密钥硬编码在代码中

**修复前**:
```python
SECRET_KEY = "your-secret-key-change-in-production"
```

**修复后**:
```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
```

**影响**:
- 如果未设置环境变量，会自动生成随机密钥
- 防止密钥泄露到版本控制系统

---

### 2. CORS 配置安全修复

**文件**: `backend/main.py`

**问题**: CORS 允许所有来源 (`allow_origins=["*"]`)

**修复前**:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**修复后**:
```python
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # 从环境变量读取
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

**影响**:
- 生产环境必须显式指定允许的域名
- 防止 CSRF 攻击
- 限制 HTTP 方法白名单

---

### 3. 数据库模型用户隔离修复

**文件**: `backend/models.py`

**问题**: 多个表的 user_id 字段有硬编码默认值

**修复的表**:
- `FileItem` (line 78)
- `StudySession` (line 135)
- `TodoItem` (line 147)
- `WorkbenchMistake` (line 161)
- `FlashCard` (line 172)
- `CardReview` (line 197)
- `Collection` (line 216)
- `FavoriteQuestion` (line 270)

**修复前**:
```python
user_id = Column(String, index=True, default="default_user")  # ❌ 硬编码
```

**修复后**:
```python
user_id = Column(String, index=True, nullable=False)  # ✅ 必填字段
```

**影响**:
- 强制所有创建记录时必须显式提供 user_id
- 防止数据混乱
- 确保多用户数据隔离

---

### 4. API 路由用户隔离修复

**文件**: `backend/main.py`, `backend/export_routes.py`

**问题**: 多个 API 路由从请求体读取 user_id 或使用默认值

#### 修复的路由列表:

| 路由 | 文件 | 问题 |
|-------|------|------|
| `/api/quiz/recommend` | main.py | 默认参数 `user_id: str = "u_alex"` |
| `/api/quiz/submit` | main.py | 从请求体 `data.user_id` 读取 |
| `/api/favorites/toggle` | main.py | 从请求体 `data.user_id` 读取 |
| `/api/favorites` | main.py | 默认参数 `user_id: str = "u_alex"` |
| `/api/mistakes/review` | main.py | 从请求体 `data.user_id` 读取 |
| `/api/export/mistakes` | export_routes.py | 默认参数 `user_id: str = "u_alex"` |
| `/api/export/notes` | export_routes.py | 默认参数 `user_id: str = "u_alex"` |
| `/api/export/all` | export_routes.py | 默认参数 `user_id: str = "u_alex"` |
| `/api/import/backup` | export_routes.py | 从请求体 `data["user_id"]` 读取 |

**修复方式**:
- 所有路由添加 `current_user_id: str = Depends(get_current_user_id)` 依赖
- 从 JWT token 中提取用户 ID
- 移除所有硬编码的默认值和请求体中的 user_id

**修复示例**:
```python
# 修复前
async def submit_quiz_answer(data: schemas.AnswerSubmit, db: Session = Depends(get_db)):
    # ❌ 从请求体读取，客户端可伪造
    user = db.query(models.UserProfile).filter_by(user_id=data.user_id).first()

# 修复后
async def submit_quiz_answer(
    data: schemas.AnswerSubmit,
    current_user_id: str = Depends(get_current_user_id),  # ✅ 从 JWT 获取
    db: Session = Depends(get_db)
):
    user = db.query(models.UserProfile).filter_by(user_id=current_user_id).first()  # ✅ 使用 JWT ID
```

**schema 修复** (`backend/schemas.py`):
```python
# 移除了 AnswerSubmit 中的 user_id 字段
class AnswerSubmit(BaseModel):
    question_id: str  # ✅ 移除 user_id
    selected_key: str
    duration_ms: int
    is_hesitant: bool = False
    step_index: Optional[int] = None
```

---

### 5. 环境变量配置文件

**新建文件**: `.env.example`

**内容**:
```bash
# JWT 密钥配置
# 生成密钥: python -c "import secrets; print(secrets.token_urlsafe(32))"
JWT_SECRET_KEY=your-secret-key-change-in-production

# JWT Token 过期时间（分钟）
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS 配置
# 生产环境请设置为实际的前端域名，多个域名用逗号分隔
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# 后端服务器配置
HOST=0.0.0.0
PORT=8000

# 开发环境标识
ENVIRONMENT=development
```

---

## 安全改进总结

### 修复前
- ❌ JWT 密钥硬编码在代码中
- ❌ CORS 允许所有来源
- ❌ 多个数据表有硬编码的默认 user_id
- ❌ API 路由信任客户端传递的 user_id
- ❌ 缺少环境变量配置示例

### 修复后
- ✅ JWT 密钥从环境变量读取，未设置时自动生成随机密钥
- ✅ CORS 从环境变量读取，限制允许的域名和 HTTP 方法
- ✅ 所有数据表强制要求 user_id 为必填字段
- ✅ 所有 API 路由强制从 JWT token 提取 user_id
- ✅ 创建 .env.example 文件提供配置模板

---

## 后续建议

### 短期（必需）
1. **配置生产环境环境变量**
   ```bash
   # 在生产服务器上设置环境变量
   export JWT_SECRET_KEY="$(openssl rand -hex 32)"
   export ALLOWED_ORIGINS="https://yourdomain.com"
   ```

2. **重启后端服务**
   ```bash
   ./start.sh restart
   ```

### 中期（建议）
1. **添加速率限制** - 防止暴力破解和 API 滥用
2. **添加 CSRF Token** - 对于非 GET 请求添加额外的保护
3. **实现 API 日志审计** - 记录所有敏感操作
4. **添加请求签名验证** - 对关键 API 操作进行签名验证

### 长期（可选）
1. **迁移到 PostgreSQL** - SQLite 并发写入支持有限
2. **实现数据加密** - 对敏感数据字段进行加密存储
3. **添加 2FA 支持** - 为用户提供双因素认证
4. **实现 RBAC** - 基于角色的访问控制

---

## 测试验证

### 测试步骤
1. 未登录访问 API - 应返回 401 错误
2. 登录后使用伪造的 user_id 请求 - 应被忽略，使用 token 中的用户 ID
3. 跨域请求 - 应被 CORS 拦截
4. 环境变量未设置 - 应自动生成随机密钥

### 验证命令
```bash
# 1. 验证所有修改
git diff HEAD --name="Security Fixes"

# 2. 启动后端
cd backend
python main.py

# 3. 测试 API（使用 curl 或前端）
curl http://localhost:8000/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"username": "test_user", "password": "test123"}'
```

---

## 影响评估

### 安全评分

| 安全项目 | 修复前 | 修复后 |
|---------|---------|---------|
| JWT 密钥管理 | 🔴 高风险 | 🟢 安全 |
| CORS 配置 | 🔴 高风险 | 🟢 安全 |
| 用户数据隔离 | 🔴 高风险 | 🟢 安全 |
| 用户认证隔离 | 🔴 高风险 | 🟢 安全 |
| 环境变量管理 | 🔴 高风险 | 🟢 安全 |

### 兼容性影响
- ⚠️ 需要配置环境变量（已提供 .env.example）
- ⚠️ 前端需要更新 API 调用（移除请求体中的 user_id）
- ✅ 向后兼容（保留其他参数不变）

---

## 文件变更列表

- `backend/auth.py` - JWT 密钥从环境变量读取
- `backend/main.py` - CORS 配置从环境变量读取
- `backend/main.py` - 多个路由添加 JWT 认证依赖
- `backend/schemas.py` - 移除 AnswerSubmit 中的 user_id 字段
- `backend/models.py` - 所有表的 user_id 字段改为 nullable=False
- `backend/crud.py` - init_db 和 get_mistakes 移除硬编码
- `backend/export_routes.py` - 导入导出路由添加 JWT 认证依赖
- `.env.example` - 新建环境变量配置文件
- `SECURITY_FIXES.md` - 本文档

---

**修复完成时间**: 2026-01-06
**修复人员**: Sisyphus
**审核状态**: ✅ 已完成
