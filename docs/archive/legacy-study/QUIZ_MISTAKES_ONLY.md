# Quiz 推荐策略修改 - 只推荐错题

## 🎯 修改说明

将 Quiz 界面的推荐策略从**"错题 + 新题混合"**改为**"只推荐错题"**

---

## 📝 修改内容

### 修改前：混合模式
```
错题本（5道）+ 新题补充（5道）= 10道题
```

**逻辑**：
1. 从错题本筛选未掌握的题目（mastery < 80）
2. 如果错题不够 10 道，从题库补充新题
3. 返回混合题目

### 修改后：只推荐错题
```
错题本（5道）= 5道题
```

**逻辑**：
1. 从错题本筛选未掌握的题目（mastery < 80）
2. 如果错题不足 10 道，也只返回实际有的错题
3. **不补充新题**

---

## 📊 效果对比

### 场景 1：错题本有 5 道未掌握的错题

| 模式 | 请求数量 | 实际返回 | 来源 |
|------|---------|---------|------|
| **修改前** | 10道 | 10道 | 5道错题 + 5道新题 |
| **修改后** | 10道 | 5道 | 5道错题 |

### 场景 2：错题本有 15 道未掌握的错题

| 模式 | 请求数量 | 实际返回 | 来源 |
|------|---------|---------|------|
| **修改前** | 10道 | 10道 | 10道错题 |
| **修改后** | 10道 | 10道 | 10道错题 |

---

## 🔧 代码修改

### 文件：`backend/main.py`

#### 1. 更新文档字符串（第 492-505 行）
```python
"""
获取推荐题目（只推荐错题，不补充新题）

策略：
1. 只从错题本中选取未掌握的题目（mastery < 80）
2. 如果错题不足请求数量，也只返回实际有的错题
3. 按错误次数和熟练度排序
"""
```

#### 2. 删除"补充新题"逻辑（第 547-577 行）
**删除前**：
```python
# ========== 4. 如果错题不够，补充新题 ==========
needed = question_count if question_count != -1 else 10
if len(questions_db) < needed:
    # ... 补充新题的代码 ...
    questions_db.extend(new_questions[:needed - len(questions_db)])

# ========== 5. 限制数量 ==========
if question_count != -1:
    actual_count = min(question_count, len(questions_db))
    questions_db = questions_db[:actual_count]
```

**删除后**：
```python
# ========== 4. 限制数量（只返回错题，不补充新题）==========
if question_count != -1:
    actual_count = min(question_count, len(questions_db))
    questions_db = questions_db[:actual_count]
```

**删除的代码**：
- 从所有题目中查询
- 应用过滤条件
- 排除已选题目
- 随机打乱新题顺序
- 补充新题到结果列表

---

## ✅ 保留的功能

以下功能完全保留，不受影响：

### 1. 筛选功能 ✅
- 学科筛选（subjects）
- 难度筛选（difficulty）
- 题型筛选（question_type）

### 2. 排序逻辑 ✅
```python
questions_db.sort(key=lambda q: (
    -mistake_dict.get(q.id).error_count,  # 错误次数多的优先
    mistake_dict.get(q.id).mastery         # 掌握度低的优先
))
```

### 3. 数量限制 ✅
- 如果设置 10 道，实际有 15 道错题，只返回前 10 道
- 如果设置 10 道，实际只有 5 道错题，只返回这 5 道

---

## 🎯 用户体验改进

### 优点
1. ✅ **专注错题** - Quiz 界面就是专门用来练习错题的
2. ✅ **避免干扰** - 不会被新题分散注意力
3. ✅ **目标明确** - 所有题目都是需要重点掌握的

### 注意事项
- ⚠️ 如果错题本为空，Quiz 界面也会返回空列表
- ⚠️ 如果错题很少（如 1-2 道），Quiz 练习会很快结束
- 💡 建议：通过做题不断积累错题，保持错题本的活跃度

---

## 🚀 测试步骤

### 1. 重启后端服务器
```bash
cd /home/chesten/Programs/flowstudy/backend
# 停止旧进程
pkill -f "uvicorn main:app"
# 启动新进程
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
```

### 2. 测试 Quiz 界面
1. 访问: http://localhost:5173/quiz
2. 设置题目数量为 10 道
3. 点击"开始刷题"
4. **验证**: 只显示错题本中的题目
5. **验证**: 如果错题只有 5 道，Quiz 也只显示 5 道（不会补充新题）

### 3. 验证数据统计
```bash
cd /home/chesten/Programs/flowstudy/backend
python3 << 'EOF'
from sqlalchemy import create_engine, text
engine = create_engine("sqlite:///flowstudy.db")
with engine.connect() as conn:
    unmastered = conn.execute(text(
        "SELECT COUNT(*) FROM mistakes WHERE mastery < 80"
    )).scalar()
    print(f"未掌握错题: {unmastered} 道")
    print(f"Quiz 会返回: {min(10, unmastered)} 道")
EOF
```

---

## 📊 当前数据状态

根据数据库统计：
- 📚 题库总数: 10 道
- ❌ 错题总数: 6 道
- ⚠️ 未掌握错题: 5 道
- ✅ 已掌握错题: 1 道（mastery ≥ 80）

**预期行为**：
- Quiz 界面最多返回 5 道题
- 即使设置"返回 10 道"，也只返回 5 道
- 不会从题库补充那 4 道新题

---

## 🔄 如何恢复"混合模式"？

如果将来想恢复补充新题的功能，可以：
1. 查看之前的 git commit
2. 或手动添加回"补充新题"的代码段

**但根据用户需求，当前模式就是最终版本** ✅

---

**修改时间**: 2026-01-05 13:00
**状态**: ✅ 已完成
**建议**: 重启后端服务器后测试
