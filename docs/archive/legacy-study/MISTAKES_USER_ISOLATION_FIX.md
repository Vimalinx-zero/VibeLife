# 错题本用户隔离修复

## 🐛 问题发现

**用户反馈**："可是在/mistakes错题本界面生物依然有错题啊。"

**矛盾现象**：
- Quiz 界面选择"只刷生物题" → 提示"没有符合条件的错题"
- 用户声称在错题本界面看到有生物错题

---

## 🔍 问题根因分析

### 数据库实际情况

```sql
-- u_alex 的错题分布：
SELECT question_id, subject, mastery FROM mistakes WHERE user_id = 'u_alex';

结果：
q_fill_001        | chemistry    | 45.8%  ❌ 未掌握
q_single_001      | mathematics  | 65.0%  ❌ 未掌握
q_multiple_001    | physics      | 72.5%  ❌ 未掌握

总计：3 道错题（化学、数学、物理）
生物错题：0 道
```

**结论**：u_alex 确实**没有生物错题**。

### 代码层面的问题

#### 错题本接口（修复前）

**文件**: `backend/main.py:333-336`

```python
@app.get("/api/mistakes")
async def get_mistakes_api(db: Session = Depends(get_db)):
    """获取错题列表"""
    return crud.get_mistakes(db)  # ❌ 没有传递 user_id
```

**文件**: `backend/crud.py:169-171`

```python
def get_mistakes(db: Session):
    # 这里需要做一点数据拼装，把 Question 的详细信息拼回去给前端
    mistakes = db.query(models.Mistake).all()  # ❌ 获取所有用户的错题
```

**问题**：
1. ❌ 接口没有 `user_id` 参数
2. ❌ CRUD 函数查询所有用户的数据：`.all()`
3. ❌ 返回了 `default_user` 等其他用户的错题
4. ❌ 导致错题本显示其他用户的生物错题

#### Quiz 接口（修复后）

**文件**: `backend/main.py:483-515`

```python
@app.get("/api/quiz/recommend")
async def get_quiz_recommendation(
    # ...
    user_id: str = "u_alex",  # ✅ 已经修复
    db: Session = Depends(get_db)
):
    mistake_query = db.query(models.Mistake).options(
        joinedload(models.Mistake.question)
    ).filter(models.Mistake.user_id == user_id)  # ✅ 正确过滤
```

**Quiz 接口状态**：✅ 已经正确过滤用户

---

## ✅ 修复方案

### 1. 修改 CRUD 函数

**文件**: `backend/crud.py:169`

**修改前**：
```python
def get_mistakes(db: Session):
    mistakes = db.query(models.Mistake).all()
```

**修改后**：
```python
def get_mistakes(db: Session, user_id: str = "u_alex"):
    mistakes = db.query(models.Mistake).filter(models.Mistake.user_id == user_id).all()
```

### 2. 修改 API 接口

**文件**: `backend/main.py:333-341`

**修改前**：
```python
@app.get("/api/mistakes")
async def get_mistakes_api(db: Session = Depends(get_db)):
    """获取错题列表"""
    return crud.get_mistakes(db)
```

**修改后**：
```python
@app.get("/api/mistakes")
async def get_mistakes_api(user_id: str = "u_alex", db: Session = Depends(get_db)):
    """
    获取错题列表（已拼装好题目快照和诊断信息）

    参数:
    - user_id: 用户ID（默认 "u_alex"）
    """
    return crud.get_mistakes(db, user_id)
```

### 3. 重启后端服务器

```bash
cd /home/chesten/Programs/flowstudy/backend
pkill -f "uvicorn main:app"
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
# PID: 298424
```

---

## 🧪 测试结果

### 测试 1：错题本 API（默认参数）

```bash
curl "http://localhost:8000/api/mistakes"
```

**结果（修复前）**：
```
✅ 返回错题数: 6 道（所有用户的错题）
  - q_auto_001          (geography)      ← default_user 的错题
  - q_bio_2023_jia_19   (biology)        ← default_user 的错题
  - q_fill_001          (chemistry)      ← u_alex 的错题
  - q_single_001        (mathematics)    ← u_alex 的错题
  - q_multiple_001      (physics)        ← u_alex 的错题
  - q_bio_thermo_001    (biology)        ← default_user 的错题
```

**结果（修复后）**：
```
✅ 返回错题数: 3 道（仅 u_alex 的错题）
  - q_single_001        (mathematics)
  - q_multiple_001      (physics)
  - q_fill_001          (chemistry)
```

### 测试 2：Quiz 学科筛选

```bash
curl "http://localhost:8000/api/quiz/recommend?subjects=biology"
```

**结果**：
```
生物题返回: 0 道
```
✅ 正确：u_alex 没有生物错题

```bash
curl "http://localhost:8000/api/quiz/recommend?subjects=chemistry"
```

**结果**：
```
化学题返回: 1 道
  - q_fill_001
```
✅ 正确：返回 u_alex 的化学错题

---

## 📊 修复效果对比

### 数据一致性

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| **错题本显示** | 6 道（含其他用户） | 3 道（仅自己） |
| **生物错题** | 显示 2 道（别人的） | 显示 0 道（正确） |
| **Quiz 筛选生物** | 0 道 | 0 道 ✅ 一致 |
| **Quiz 筛选化学** | 1 道 | 1 道 ✅ 一致 |

### 用户体验

**修复前**：
```
错题本界面：看到生物、地理等别人的错题  ❌ 混乱
Quiz 界面：选择生物题 → 提示没有题  ❌ 矛盾
用户困惑：为什么错题本有题，Quiz 说没有？  ❌ 不一致
```

**修复后**：
```
错题本界面：只显示自己的 3 道错题  ✅ 清晰
Quiz 界面：选择生物题 → 提示没有题  ✅ 正确
用户理解：确实没有生物错题  ✅ 一致
```

---

## 🔧 技术细节

### 为什么之前没有发现？

1. **数据库混淆**：
   - `default_user` 有生物、地理错题（测试数据）
   - `u_alex` 只有化学、数学、物理错题
   - 接口返回所有用户数据，混淆在一起

2. **Quiz 接口已修复**：
   - 之前修复了 `/api/quiz/recommend` 的用户隔离
   - 但忘记了修复 `/api/mistakes` 接口
   - 导致两个接口行为不一致

3. **前端未传递 user_id**：
   ```javascript
   // frontend/src/pages/MistakeVaultPage.jsx:98
   const res = await axios.get("http://localhost:8000/api/mistakes");
   // ❌ 没有传递 user_id 参数
   ```

### 防御性编程建议

#### 1. 后端接口设计原则

**✅ 推荐做法**：
```python
# 始终要求 user_id 参数，使用默认值
@app.get("/api/mistakes")
async def get_mistakes_api(
    user_id: str = "u_alex",  # 默认值防止旧客户端出错
    db: Session = Depends(get_db)
):
    return crud.get_mistakes(db, user_id)
```

**❌ 不推荐做法**：
```python
# 假设只有一个用户，查询所有数据
@app.get("/api/mistakes")
async def get_mistakes_api(db: Session = Depends(get_db)):
    return crud.get_mistakes(db)  # 危险！
```

#### 2. 前端显式传递 user_id（可选优化）

虽然后端默认值已经正确，但前端显式传递更清晰：

```javascript
// frontend/src/pages/MistakeVaultPage.jsx:98
const res = await axios.get("http://localhost:8000/api/mistakes", {
  params: {
    user_id: "u_alex"  // ✅ 显式传递
  }
});
```

#### 3. 数据库索引优化

建议添加索引以提升查询性能：

```sql
CREATE INDEX IF NOT EXISTS idx_mistakes_user_id
ON mistakes(user_id);
```

---

## 📝 相关修复记录

本次修复与以下之前的修复相关：

1. **USER_ID_FIX.md** - Quiz 接口添加 user_id 参数
2. **QUIZ_EMPTY_RESULT_FIX.md** - Quiz 空结果提示修复

**三个修复的关系**：
```
USER_ID_FIX (Quiz 用户ID)
    ↓
修复了 Quiz 推荐接口使用正确的用户ID
    ↓
用户发现：Quiz 说没有生物题，但错题本显示有
    ↓
MISTAKES_USER_ISOLATION_FIX (错题本用户隔离) ← 本次修复
    ↓
发现错题本返回所有用户的数据
    ↓
修复后：错题本也只显示 u_alex 的数据
    ↓
QUIZ_EMPTY_RESULT_FIX (空结果提示)
    ↓
现在选择生物题时会友好提示"没有符合条件的错题"
```

---

## ✅ 验收标准

- [x] `/api/mistakes` 接口支持 `user_id` 参数
- [x] 默认参数值为 `"u_alex"`
- [x] 错题本只显示当前用户的错题（3 道）
- [x] 错题本不再显示其他用户的错题
- [x] Quiz 和错题本数据一致
- [x] 后端服务正常启动（PID: 298424）
- [x] API 测试通过

---

## 🎯 总结

### 问题本质

**数据泄露**：错题本接口返回了所有用户的数据，导致：
1. 用户看到其他用户的错题
2. Quiz 和错题本数据不一致
3. 用户困惑和误解

### 修复核心

**用户隔离**：确保每个用户只能看到自己的数据
1. ✅ 后端接口添加 `user_id` 参数
2. ✅ CRUD 函数过滤 `user_id`
3. ✅ 与 Quiz 接口保持一致

### 数据现状

**u_alex 的错题本**（修复后正确显示）：
- 化学题：1 道
- 数学题：1 道
- 物理题：1 道
- 生物题：0 道 ✅

**Quiz 筛选结果**（与错题本一致）：
- 只刷化学题：1 道 ✅
- 只刷数学题：1 道 ✅
- 只刷物理题：1 道 ✅
- 只刷生物题：0 道 ✅（提示"没有符合条件的错题"）

---

**修复时间**: 2026-01-05 15:00
**状态**: ✅ 已完成
**影响文件**: `backend/main.py`, `backend/crud.py`
**测试**: ✅ 通过
**相关**: USER_ID_FIX.md, QUIZ_EMPTY_RESULT_FIX.md
