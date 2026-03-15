# Quiz 用户ID匹配修复

## 🐛 问题描述

**现象**：Quiz 界面显示的题目数量与用户错题本不一致

**用户反馈**：
- Quiz 界面只显示 2 道题
- 但用户的错题本（`u_alex`）有 3 道未掌握的错题
- 出现了一些用户错题本里没有的题目

**根本原因**：后端 Quiz 推荐接口硬编码使用 `default_user`，而前端使用 `u_alex`

---

## 🔍 问题诊断

### 数据库现状

#### default_user 的错题
```sql
SELECT question_id, mastery FROM mistakes WHERE user_id = 'default_user';

q_auto_001          (geography)     - mastery: 0.0%
q_bio_2023_jia_19   (biology)       - mastery: 50.0%
q_bio_thermo_001    (biology)       - mastery: 87.5% (已掌握)
```
- **未掌握错题**: 2 道（q_auto_001, q_bio_2023_jia_19）

#### u_alex 的错题
```sql
SELECT question_id, mastery FROM mistakes WHERE user_id = 'u_alex';

q_fill_001        (chemistry)      - mastery: 45.75%
q_single_001      (mathematics)    - mastery: 65.0%
q_multiple_001    (physics)        - mastery: 72.5%
```
- **未掌握错题**: 3 道（全部 < 80%）

### 代码分析

#### 后端接口（修改前）
```python
# backend/main.py:513
mistake_query = db.query(models.Mistake).options(
    joinedload(models.Mistake.question)
).filter(models.Mistake.user_id == "default_user")  # ❌ 硬编码
```

#### 前端调用
```javascript
// frontend/src/pages/QuizPage.jsx:202
const res = await axios.get("http://localhost:8000/api/quiz/recommend", { params });
// params 中没有 user_id

// 但提交答案时使用：
user_id: "u_alex"  // ✅ 前端使用 u_alex
```

**问题**：后端查询 `default_user` 的错题（2道），而前端实际使用 `u_alex` 的身份

---

## ✅ 修复方案

### 1. 后端接口添加 user_id 参数

**文件**: `backend/main.py:483-515`

#### 修改前
```python
@app.get("/api/quiz/recommend", response_model=List[schemas.QuestionResponse])
async def get_quiz_recommendation(
    subjects: str = None,
    question_count: int = 10,
    difficulty: str = "all",
    question_type: str = "all",
    smart_recommend: bool = True,
    db: Session = Depends(get_db)
):
    # ...
    mistake_query = db.query(models.Mistake).options(
        joinedload(models.Mistake.question)
    ).filter(models.Mistake.user_id == "default_user")  # ❌ 硬编码
```

#### 修改后
```python
@app.get("/api/quiz/recommend", response_model=List[schemas.QuestionResponse])
async def get_quiz_recommendation(
    subjects: str = None,
    question_count: int = 10,
    difficulty: str = "all",
    question_type: str = "all",
    smart_recommend: bool = True,
    user_id: str = "u_alex",  # ✅ 新增参数，默认值 u_alex
    db: Session = Depends(get_db)
):
    """
    获取推荐题目（只推荐错题，不补充新题）

    参数:
    - user_id: 用户ID（默认 "u_alex"）
    """
    # ...
    mistake_query = db.query(models.Mistake).options(
        joinedload(models.Mistake.question)
    ).filter(models.Mistake.user_id == user_id)  # ✅ 使用参数
```

### 2. 重启后端服务器

```bash
cd /home/chesten/Programs/flowstudy/backend
pkill -f "uvicorn main:app"
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
# PID: 202921
```

---

## 🧪 测试结果

### 测试 1：显式传递 user_id
```bash
curl "http://localhost:8000/api/quiz/recommend?user_id=u_alex"
```

**结果**：
```
✅ 返回题目数: 3
  - q_fill_001 (chemistry)
  - q_multiple_001 (physics)
  - q_single_001 (mathematics)
```

### 测试 2：使用默认参数
```bash
curl "http://localhost:8000/api/quiz/recommend"
```

**结果**：
```
✅ 默认参数返回题目数: 3
  - q_fill_001 (chemistry)
  - q_multiple_001 (physics)
  - q_single_001 (mathematics)
```

### 测试 3：查询 default_user
```bash
curl "http://localhost:8000/api/quiz/recommend?user_id=default_user"
```

**结果**：
```
✅ 返回题目数: 2
  - q_auto_001 (geography)
  - q_bio_2023_jia_19 (biology)
```

---

## 📊 修复效果对比

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| **后端查询用户** | `default_user` (硬编码) | `u_alex` (默认参数) |
| **Quiz 返回题目** | 2 道（default_user 的错题） | 3 道（u_alex 的错题） |
| **与错题本一致性** | ❌ 不一致 | ✅ 一致 |
| **前端提交用户** | `u_alex` | `u_alex` (不变) |
| **用户体验** | ❌ 看到别人的错题 | ✅ 只看自己的错题 |

---

## 🔧 技术细节

### 参数默认值选择

**为什么默认值设为 `"u_alex"` 而不是 `"default_user"`？**

1. **前端一致性**：前端所有 API 调用都使用 `u_alex`
   ```javascript
   // 收藏功能
   user_id: "u_alex"

   // 提交答案
   user_id: "u_alex"
   ```

2. **实际用户数据**：`u_alex` 有真实的错题记录，`default_user` 只是测试数据

3. **向后兼容**：默认参数确保不传 `user_id` 时仍能正常工作

### API 兼容性

- ✅ **旧客户端**（不传 user_id）：自动使用 `u_alex`
- ✅ **新客户端**（显式传递 user_id）：使用指定用户
- ✅ **多用户支持**：可通过参数切换不同用户

---

## 🎯 用户体验改进

### 修复前
```
Quiz 界面: 显示 2 道题（地理、生物）
错题本:   有 3 道未掌握错题（化学、数学、物理）

用户困惑: "为什么 Quiz 显示的题我错题本里没有？"
```

### 修复后
```
Quiz 界面: 显示 3 道题（化学、数学、物理）
错题本:   有 3 道未掌握错题（化学、数学、物理）

用户确认: "✅ Quiz 就是用来练习我的错题的"
```

---

## 📝 后续优化建议

### 1. 前端显式传递 user_id（可选）

虽然后端默认值已经正确，但为了代码清晰，可以在前端显式传递：

```javascript
// frontend/src/pages/QuizPage.jsx:202
const res = await axios.get("http://localhost:8000/api/quiz/recommend", {
  params: {
    ...params,
    user_id: "u_alex"  // ✅ 显式传递
  }
});
```

### 2. 全局用户管理（长期方案）

当前用户 ID 硬编码在前端多处，建议：
- 创建全局配置文件 `src/config/user.js`
- 或实现真正的用户认证系统

```javascript
// src/config/user.js
export const CURRENT_USER = {
  id: "u_alex",
  name: "Alex",
  // ...
};
```

### 3. 数据库清理

考虑是否保留 `default_user` 数据：
- 如果是测试数据，可以删除
- 如果需要保留，确保不会混淆

---

## ✅ 验收标准

- [x] Quiz 接口支持 `user_id` 参数
- [x] 默认参数值为 `"u_alex"`
- [x] Quiz 界面显示 3 道题（与错题本一致）
- [x] 不会再显示错题本里没有的题目
- [x] 后端服务正常启动（PID: 202921）
- [x] API 测试通过

---

**修复时间**: 2026-01-05 14:30
**状态**: ✅ 已完成
**影响文件**: `backend/main.py`
**测试**: ✅ 通过
