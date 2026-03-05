# 错题重做复习算法实施方案

## 📋 目录

1. [算法核心思想](#算法核心思想)
2. [标签权重体系](#标签权重体系)
3. [复习优先级算法](#复习优先级算法)
4. [智能推荐系统](#智能推荐系统)
5. [数据库设计](#数据库设计)
6. [后端实现](#后端实现)
7. [前端实现](#前端实现)
8. [测试方案](#测试方案)

---

## 🎯 算法核心思想

### 三维权重模型

```
错题紧急度 = f(遗忘风险, 错因权重, 复习收益)
```

#### 1. **遗忘风险** (Forgetting Risk)
基于 SM-2 算法的间隔重复，结合艾宾浩斯遗忘曲线

#### 2. **错因权重** (Mistake Weight)
根据错题标签计算薄弱知识点权重

#### 3. **复习收益** (Review Benefit)
优先复习"性价比高"的题目（高频考点 × 掌握度低）

---

## 🏷️ 标签权重体系

### 标签分类与权重

```python
# 权重配置（可调整）
TAG_WEIGHTS = {
    # 知识盲区（权重最高）
    "knowledge_gap": {
        "核心概念": 10,           # 例如：牛顿第二定律
        "公式应用": 8,            # 例如：F=ma
        "基础定理": 9,            # 例如：勾股定理
        "推论性质": 7,
        "常识记忆": 5
    },

    # 认知缺陷（中等权重）
    "cognitive_flaw": {
        "概念混淆": 9,            # 最顽固
        "逻辑错误": 8,
        "计算错误": 6,            # 容易纠正
        "审题不清": 7,
        "粗心大意": 4             # 影响最小
    },

    # 题型特征（低权重，用于多样性）
    "question_type": {
        "基础题": 3,
        "综合题": 6,
        "创新题": 7,
        "压轴题": 8
    },

    # 严重程度（影响紧急度）
    "severity": {
        "critical": 10,           # 必须立即复习
        "high": 7,
        "medium": 5,
        "low": 3
    },

    # 考频（影响复习收益）
    "exam_frequency": {
        "必考点": 10,
        "高频": 8,
        "中频": 5,
        "低频": 2
    }
}
```

### 标签聚合权重计算

```python
def calculate_mistake_weight(mistake):
    """
    计算错题的综合权重

    Args:
        mistake: 错题对象，包含标签信息

    Returns:
        float: 权重值 (0-100)
    """
    weight = 0

    # 1. 从错误选项中提取诊断标签
    if mistake.user_answer:
        # 找到用户选的错误选项
        wrong_option = find_wrong_option(mistake.question, mistake.user_answer)

        if wrong_option and wrong_option.get("diagnosis"):
            diagnosis = wrong_option["diagnosis"]

            # 知识盲区权重
            knowledge_gaps = diagnosis.get("knowledge_gap", [])
            for gap in knowledge_gaps:
                weight += TAG_WEIGHTS["knowledge_gap"].get(gap, 5)

            # 认知缺陷权重
            flaws = diagnosis.get("cognitive_flaw", "")
            weight += TAG_WEIGHTS["cognitive_flaw"].get(flaws, 5)

            # 严重程度
            severity = diagnosis.get("severity", "medium")
            weight += TAG_WEIGHTS["severity"].get(severity, 5)

    # 2. 题型权重（避免题目单一）
    question_type = mistake.question.macro_tags.get("competency", "应用")
    weight += TAG_WEIGHTS["question_type"].get(question_type, 5)

    # 3. 考频权重
    frequency = get_exam_frequency(mistake.question)  # 从题库统计
    weight += TAG_WEIGHTS["exam_frequency"].get(frequency, 5)

    # 4. 错误次数加成（错越多，权重越高）
    error_count_bonus = min(mistake.error_count * 2, 10)
    weight += error_count_bonus

    return min(weight, 100)  # 上限 100
```

---

## 📊 复习优先级算法

### 优先级计算公式

```python
def calculate_review_priority(mistake):
    """
    计算错题的复习优先级

    Priority = (遗忘风险 × 0.4) + (错因权重 × 0.4) + (复习收益 × 0.2)

    Returns:
        float: 优先级分数 (0-100)
    """
    # 1. 遗忘风险 (0-100)
    forgetting_risk = calculate_forgetting_risk(mistake)

    # 2. 错因权重 (0-100)
    mistake_weight = calculate_mistake_weight(mistake)

    # 3. 复习收益 (0-100)
    review_benefit = calculate_review_benefit(mistake)

    # 综合优先级
    priority = (
        forgetting_risk * 0.4 +
        mistake_weight * 0.4 +
        review_benefit * 0.2
    )

    return round(priority, 2)


def calculate_forgetting_risk(mistake):
    """
    基于遗忘曲线计算风险

    结合 SM-2 算法和艾宾浩斯曲线
    """
    # 获取当前时间
    now = datetime.now()
    last_review = datetime.fromisoformat(mistake.last_error_time)
    days_since_review = (now - last_review).days

    # 基础遗忘率（艾宾浩斯曲线）
    if days_since_review == 0:
        base_forgetting_rate = 0.1
    elif days_since_review == 1:
        base_forgetting_rate = 0.3
    elif days_since_review == 2:
        base_forgetting_rate = 0.5
    elif days_since_review <= 6:
        base_forgetting_rate = 0.7
    else:
        base_forgetting_rate = 0.8

    # 掌握度调整（掌握度越低，遗忘风险越高）
    mastery_factor = 1 - (mistake.mastery / 100)

    # 间隔调整（SM-2 算法的 interval）
    interval_factor = max(0.1, 1 / (mistake.interval + 1))

    # 综合风险
    risk = base_forgetting_rate * mastery_factor * interval_factor * 100

    return min(risk, 100)


def calculate_review_benefit(mistake):
    """
    计算复习收益（性价比）

    收益 = 考频 × (1 - 掌握度) × 题目难度系数
    """
    # 考频（从题库统计或标签）
    frequency_score = get_exam_frequency_score(mistake.question)

    # 掌握度（越低收益越高）
    mastery_factor = 1 - (mistake.mastery / 100)

    # 难度系数（难题收益高）
    difficulty_factor = mistake.question.difficulty / 5

    benefit = frequency_score * mastery_factor * difficulty_factor * 100

    return min(benefit, 100)
```

---

## 🎯 智能推荐系统

### 推荐策略

```python
class MistakeRecommender:
    """错题推荐引擎"""

    def __init__(self, db_session):
        self.db = db_session

    def recommend_for_review(self, user_id, count=10):
        """
        推荐需要复习的错题

        策略：
        1. 优先推荐高优先级的错题
        2. 保证多样性（不同知识点、题型）
        3. 限制同一知识点的题目数量

        Args:
            user_id: 用户ID
            count: 推荐数量

        Returns:
            List[Dict]: 推荐的错题列表，包含原因
        """
        # 1. 获取所有待复习错题
        mistakes = self.db.query(Mistake).filter(
            Mistake.user_id == user_id
        ).all()

        # 2. 计算优先级
        mistake_scores = []
        for mistake in mistakes:
            priority = calculate_review_priority(mistake)
            mistake_scores.append({
                "mistake": mistake,
                "priority": priority,
                "tags": self._extract_tags(mistake)
            })

        # 3. 排序
        mistake_scores.sort(key=lambda x: x["priority"], reverse=True)

        # 4. 多样性筛选
        selected = self._diversify_selection(mistake_scores, count)

        # 5. 添加推荐理由
        for item in selected:
            item["reason"] = self._generate_reason(item)

        return selected

    def _diversify_selection(self, scored_mistakes, count):
        """
        多样性筛选，避免集中在某一知识点

        策略：
        - 同一知识点最多 2 题
        - 优先选高优先级
        """
        selected = []
        knowledge_point_count = {}  # 记录每个知识点的选题数

        for item in scored_mistakes:
            if len(selected) >= count:
                break

            # 提取主要知识点
            main_tag = item["tags"]["knowledge_gap"][0] if item["tags"]["knowledge_gap"] else "其他"

            # 检查是否超限
            if knowledge_point_count.get(main_tag, 0) >= 2:
                continue

            # 选中
            selected.append(item)
            knowledge_point_count[main_tag] = knowledge_point_count.get(main_tag, 0) + 1

        return selected

    def _extract_tags(self, mistake):
        """提取错题的标签"""
        tags = {
            "knowledge_gap": [],
            "cognitive_flaw": [],
            "severity": "medium"
        }

        if mistake.user_answer:
            wrong_option = find_wrong_option(mistake.question, mistake.user_answer)
            if wrong_option and wrong_option.get("diagnosis"):
                diagnosis = wrong_option["diagnosis"]
                tags["knowledge_gap"] = diagnosis.get("knowledge_gap", [])
                tags["cognitive_flaw"] = diagnosis.get("cognitive_flaw", "")
                tags["severity"] = diagnosis.get("severity", "medium")

        return tags

    def _generate_reason(self, item):
        """生成推荐理由"""
        reasons = []

        # 遗忘风险
        forgetting_risk = calculate_forgetting_risk(item["mistake"])
        if forgetting_risk > 70:
            reasons.append("⚠️ 遗忘风险高")
        elif forgetting_risk > 40:
            reasons.append("⏰ 到了复习时间")

        # 错因权重
        if item["priority"] > 80:
            reasons.append("🔥 高优先级")

        # 知识盲区
        if item["tags"]["knowledge_gap"]:
            reasons.append(f"📚 薄弱点: {', '.join(item['tags']['knowledge_gap'][:2])}")

        # 认知缺陷
        if item["tags"]["cognitive_flaw"]:
            reasons.append(f"🧠 认知问题: {item['tags']['cognitive_flaw']}")

        return " | ".join(reasons) if reasons else "建议复习"

    def recommend_practice_questions(self, mistake, count=5):
        """
        根据错题推荐相似题目进行巩固练习

        策略：
        1. 相同知识点
        2. 相同题型
        3. 难度略高（提升能力）

        Args:
            mistake: 错题对象
            count: 推荐数量

        Returns:
            List[Question]: 推荐的练习题
        """
        # 提取标签
        tags = self._extract_tags(mistake)

        # 查询相似题目（排除错题本身）
        questions = self.db.query(Question).filter(
            Question.id != mistake.question_id,
            Question.subject == mistake.question.subject
        ).all()

        # 计算相似度
        scored_questions = []
        for q in questions:
            similarity = self._calculate_similarity(mistake.question, q, tags)
            scored_questions.append({
                "question": q,
                "similarity": similarity
            })

        # 排序并返回前 N 题
        scored_questions.sort(key=lambda x: x["similarity"], reverse=True)
        return [item["question"] for item in scored_questions[:count]]

    def _calculate_similarity(self, source_question, target_question, tags):
        """
        计算题目相似度

        相似度 = 知识点匹配 × 0.6 + 题型匹配 × 0.3 + 难度匹配 × 0.1
        """
        score = 0

        # 1. 知识点匹配（macro_tags）
        source_tags = source_question.macro_tags or {}
        target_tags = target_question.macro_tags or {}

        # 章节匹配
        if source_tags.get("chapter") == target_tags.get("chapter"):
            score += 60

        # 场景模型匹配
        if source_tags.get("scenario_model") == target_tags.get("scenario_model"):
            score += 20

        # 2. 题型匹配
        if source_question.type == target_question.type:
            score += 30

        # 3. 难度匹配（相近难度）
        difficulty_diff = abs(source_question.difficulty - target_question.difficulty)
        if difficulty_diff <= 1:
            score += 10

        return score
```

---

## 🗄️ 数据库设计

### 新增字段到 Mistake 表

```python
# 在现有 Mistake 表基础上新增
class Mistake(Base):
    # ... 现有字段 ...

    # ✨ 新增：复习算法字段
    last_review_date = Column(String)  # 上次复习日期
    next_review_date = Column(String)  # 下次复习日期
    review_count = Column(Integer, default=0)  # 复习次数
    correct_count = Column(Integer, default=0)  # 复习正确次数

    # SM-2 算法参数（与 FlashCard 一致）
    ease_factor = Column(Float, default=2.5)
    interval = Column(Integer, default=1)  # 复习间隔（天）
    repetitions = Column(Integer, default=0)  # 连续正确次数

    # ✨ 新增：标签分析（冗余存储，加速查询）
    extracted_tags = Column(JSON, default=dict)  # 提取的标签
    # {
    #   "knowledge_gap": ["牛顿第二定律"],
    #   "cognitive_flaw": "计算错误",
    #   "severity": "medium",
    #   "weight": 75  # 权重分数
    # }

    # ✨ 新增：优先级缓存
    priority_score = Column(Float, default=0.0)  # 当前后备级
    priority_updated_at = Column(String)  # 优先级更新时间
```

### 新增复习记录表

```python
class MistakeReviewRecord(Base):
    """错题复习记录表"""
    __tablename__ = "mistake_review_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    mistake_id = Column(Integer, ForeignKey("mistakes.id"))

    # 复习结果
    is_correct = Column(Boolean)  # 是否正确
    time_spent = Column(Integer)  # 用时（秒）
    confidence = Column(Integer)  # 信心程度 (1-5)

    # 算法参数快照
    ease_factor_before = Column(Float)  # 复习前的难度因子
    ease_factor_after = Column(Float)   # 复习后的难度因子
    interval_before = Column(Integer)
    interval_after = Column(Integer)

    # 时间戳
    reviewed_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
```

### 新增薄弱知识点统计表

```python
class WeaknessPoint(Base):
    """薄弱知识点统计表"""
    __tablename__ = "weakness_points"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    subject = Column(String)  # 学科

    # 知识点信息
    knowledge_point = Column(String)  # 例如："牛顿第二定律"
    category = Column(String)  # 分类：knowledge_gap / cognitive_flaw

    # 统计数据
    mistake_count = Column(Integer, default=0)  # 错题数量
    total_weight = Column(Float, default=0.0)  # 累计权重
    avg_priority = Column(Float, default=0.0)  # 平均优先级

    # 复习进度
    review_count = Column(Integer, default=0)  # 复习次数
    correct_count = Column(Integer, default=0)  # 正确次数
    mastery = Column(Float, default=0.0)  # 掌握度 (0-100)

    # 时间戳
    last_mistake_time = Column(String)  # 最近错误时间
    last_review_time = Column(String)  # 最近复习时间
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())

    # 唯一约束
    __table_args__ = (
        UniqueConstraint('user_id', 'subject', 'knowledge_point', name='unique_weakness'),
    )
```

---

## 🔧 后端实现

### API 路由设计

```python
# backend/review_routes.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models

router = APIRouter()

# ==============================
# 📊 错题复习推荐 API
# ==============================

@router.get("/api/review/recommendations")
async def get_review_recommendations(
    user_id: str = "default_user",
    count: int = 10,
    db: Session = Depends(get_db)
):
    """
    获取待复习的错题推荐

    Query Params:
        - count: 推荐数量（默认 10）
        - subject: 学科筛选（可选）

    Returns:
        {
            "recommendations": [
                {
                    "mistake_id": 123,
                    "question": {...},
                    "priority": 85.5,
                    "reason": "⚠️ 遗忘风险高 | 📚 薄弱点: 牛顿第二定律",
                    "tags": {...},
                    "stats": {
                        "error_count": 3,
                        "mastery": 30,
                        "days_since_review": 7
                    }
                },
                ...
            ],
            "summary": {
                "total_mistakes": 50,
                "urgent_count": 10,  # 高优先级
                "weakness_points": [
                    {"point": "牛顿第二定律", "count": 5, "mastery": 25}
                ]
            }
        }
    """
    recommender = MistakeRecommender(db)
    recommendations = recommender.recommend_for_review(user_id, count)

    # 获取薄弱知识点统计
    weakness_stats = db.query(WeaknessPoint).filter(
        WeaknessPoint.user_id == user_id
    ).order_by(WeaknessPoint.mastery.asc()).limit(5).all()

    return {
        "recommendations": recommendations,
        "summary": {
            "total_mistakes": len(recommendations),
            "urgent_count": len([r for r in recommendations if r["priority"] > 70]),
            "weakness_points": [
                {
                    "point": w.knowledge_point,
                    "count": w.mistake_count,
                    "mastery": w.mastery
                }
                for w in weakness_stats
            ]
        }
    }


@router.post("/api/review/{mistake_id}/submit")
async def submit_review_result(
    mistake_id: int,
    result: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    提交错题复习结果

    Body:
        {
            "is_correct": true,
            "time_spent": 120,  # 秒
            "confidence": 4  # 1-5
        }

    Returns:
        - 更新后的错题信息
        - 下一次复习时间
    """
    mistake = db.query(Mistake).filter(Mistake.id == mistake_id).first()

    if not mistake:
        raise HTTPException(status_code=404, detail="错题不存在")

    # 1. 更新 SM-2 算法参数
    is_correct = result["is_correct"]

    # 记录复习前的参数
    ease_factor_before = mistake.ease_factor
    interval_before = mistake.interval

    if is_correct:
        # 回答正确
        mistake.repetitions += 1
        mistake.correct_count += 1

        # SM-2 算法更新
        if mistake.repetitions == 1:
            mistake.interval = 1
        elif mistake.repetitions == 2:
            mistake.interval = 6
        else:
            mistake.interval = round(mistake.interval * mistake.ease_factor)

        # 难度因子调整
        mistake.ease_factor = max(
            1.3,
            mistake.ease_factor + (0.1 - (5 - result.get("confidence", 3)) * (0.08 + (5 - result.get("confidence", 3)) * 0.02))
        )
    else:
        # 回答错误
        mistake.repetitions = 0
        mistake.interval = 1
        mistake.ease_factor = max(1.3, mistake.ease_factor - 0.2)

    # 2. 更新复习统计
    mistake.review_count += 1
    mistake.last_review_date = datetime.now().isoformat()

    # 计算下次复习日期
    next_review = datetime.now() + timedelta(days=mistake.interval)
    mistake.next_review_date = next_review.isoformat()

    # 3. 更新掌握度
    mistake.mastery = min(100, mistake.mastery + (20 if is_correct else -10))

    # 4. 保存复习记录
    record = MistakeReviewRecord(
        user_id=mistake.user_id,
        mistake_id=mistake.id,
        is_correct=is_correct,
        time_spent=result.get("time_spent", 0),
        confidence=result.get("confidence", 3),
        ease_factor_before=ease_factor_before,
        ease_factor_after=mistake.ease_factor,
        interval_before=interval_before,
        interval_after=mistake.interval
    )
    db.add(record)

    # 5. 更新薄弱知识点统计
    if mistake.extracted_tags:
        for gap in mistake.extracted_tags.get("knowledge_gap", []):
            weakness = db.query(WeaknessPoint).filter(
                WeaknessPoint.user_id == mistake.user_id,
                WeaknessPoint.knowledge_point == gap
            ).first()

            if weakness:
                weakness.review_count += 1
                if is_correct:
                    weakness.correct_count += 1
                weakness.mastery = min(100, weakness.mastery + (15 if is_correct else -5))
                weakness.last_review_time = datetime.now().isoformat()

    db.commit()

    return {
        "success": True,
        "next_review_date": mistake.next_review_date,
        "updated_mistake": {
            "id": mistake.id,
            "mastery": mistake.mastery,
            "interval": mistake.interval,
            "ease_factor": mistake.ease_factor
        }
    }


@router.get("/api/review/practice-questions/{mistake_id}")
async def get_practice_questions(
    mistake_id: int,
    count: int = 5,
    db: Session = Depends(get_db)
):
    """
    根据错题推荐巩固练习题

    Returns:
        - 相似题目列表
    """
    mistake = db.query(Mistake).filter(Mistake.id == mistake_id).first()

    if not mistake:
        raise HTTPException(status_code=404, detail="错题不存在")

    recommender = MistakeRecommender(db)
    questions = recommender.recommend_practice_questions(mistake, count)

    return {
        "practice_questions": [q.to_dict() for q in questions]
    }


@router.get("/api/review/weakness-report")
async def get_weakness_report(
    user_id: str = "default_user",
    subject: str = None,
    db: Session = Depends(get_db)
):
    """
    获取薄弱知识点报告

    Returns:
        {
            "weakness_points": [
                {
                    "knowledge_point": "牛顿第二定律",
                    "subject": "物理",
                    "mistake_count": 8,
                    "review_count": 3,
                    "mastery": 25,
                    "trend": "improving"  # improving / stable / declining
                },
                ...
            ],
            "summary": {
                "total_weak_points": 15,
                "critical_count": 3,
                "avg_mastery": 45
            }
        }
    """
    query = db.query(WeaknessPoint).filter(WeaknessPoint.user_id == user_id)

    if subject:
        query = query.filter(WeaknessPoint.subject == subject)

    weaknesses = query.order_by(WeaknessPoint.mastery.asc()).all()

    return {
        "weakness_points": [
            {
                "knowledge_point": w.knowledge_point,
                "subject": w.subject,
                "mistake_count": w.mistake_count,
                "review_count": w.review_count,
                "mastery": w.mastery,
                "trend": calculate_trend(w)  # 需要实现
            }
            for w in weaknesses
        ],
        "summary": {
            "total_weak_points": len(weaknesses),
            "critical_count": len([w for w in weaknesses if w.mastery < 30]),
            "avg_mastery": sum(w.mastery for w in weaknesses) / len(weaknesses) if weaknesses else 0
        }
    }


# ==============================
# 🔄 定时任务：更新优先级
# ==============================

@router.post("/api/review/update-priorities")
async def update_all_priorities(
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """
    批量更新错题优先级（定时任务）

    建议每天凌晨执行一次
    """
    mistakes = db.query(Mistake).filter(Mistake.user_id == user_id).all()

    updated_count = 0
    for mistake in mistakes:
        # 计算新优先级
        new_priority = calculate_review_priority(mistake)

        # 更新数据库
        mistake.priority_score = new_priority
        mistake.priority_updated_at = datetime.now().isoformat()

        updated_count += 1

    db.commit()

    return {
        "success": True,
        "updated_count": updated_count
    }
```

---

## 🎨 前端实现

### 新建复习页面

```jsx
// frontend/src/pages/ReviewPage.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useToast } from "../context/ToastContext";

const ReviewPage = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewMode, setReviewMode] = useState("browse"); // 'browse' | 'review'
  const [startTime, setStartTime] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  // 加载推荐
  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8000/api/review/recommendations?count=20");
      setRecommendations(response.data.recommendations);
      setSummary(response.data.summary);
    } catch (error) {
      toast.error("加载推荐失败");
    } finally {
      setLoading(false);
    }
  };

  const startReview = () => {
    setReviewMode("review");
    setStartTime(Date.now());
  };

  const submitResult = async (isCorrect, confidence) => {
    const current = recommendations[currentIndex];
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    try {
      await axios.post(`http://localhost:8000/api/review/${current.mistake.id}/submit`, {
        is_correct: isCorrect,
        time_spent: timeSpent,
        confidence: confidence
      });

      toast.success(isCorrect ? "✅ 回答正确！" : "❌ 需要加强");

      // 下一题
      if (currentIndex < recommendations.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setStartTime(Date.now());
      } else {
        toast.success("🎉 复习完成！");
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error("提交失败");
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (reviewMode === "review" && recommendations[currentIndex]) {
    const current = recommendations[currentIndex];
    const question = current.question;

    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* 进度条 */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((currentIndex + 1) / recommendations.length) * 100}%` }}
          />
        </div>

        {/* 题目内容 */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
            {/* 推荐理由 */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {current.reason}
              </span>
            </div>

            {/* 题目 */}
            <div className="mb-6">
              <div className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {question.stem}
              </div>

              {question.options && (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <div
                      key={option.key}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {option.key}.
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {option.content}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-600 dark:text-gray-400">
              <div>
                <div className="font-bold">{current.stats.error_count}</div>
                <div>错误次数</div>
              </div>
              <div>
                <div className="font-bold">{current.stats.mastery}%</div>
                <div>掌握度</div>
              </div>
              <div>
                <div className="font-bold">{current.stats.days_since_review}</div>
                <div>未复习天数</div>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <button
                onClick={() => submitResult(false, 2)}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                ❌ 不会 / 错误
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => submitResult(true, 3)}
                  className="px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm"
                >
                  😕 有点不确定
                </button>
                <button
                  onClick={() => submitResult(true, 5)}
                  className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
                >
                  😎 很确定
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 浏览模式
  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* 头部统计 */}
        {summary && (
          <div className="mb-8 grid grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {summary.total_mistakes}
              </div>
              <div className="text-gray-600 dark:text-gray-400">待复习错题</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="text-3xl font-bold text-red-500">
                {summary.urgent_count}
              </div>
              <div className="text-gray-600 dark:text-gray-400">高优先级</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="text-3xl font-bold text-blue-500">
                {summary.weakness_points.length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">薄弱知识点</div>
            </div>
          </div>
        )}

        {/* 开始复习按钮 */}
        {recommendations.length > 0 && (
          <div className="mb-8 flex justify-center">
            <button
              onClick={startReview}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:scale-105 transition-all"
            >
              🚀 开始复习 ({recommendations.length} 题)
            </button>
          </div>
        )}

        {/* 推荐列表 */}
        <div className="space-y-4">
          {recommendations.map((item, index) => (
            <div
              key={item.mistake.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer"
              onClick={() => setCurrentIndex(index)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      #{index + 1}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.priority > 70
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : item.priority > 40
                        ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      优先级: {item.priority}
                    </span>
                  </div>
                  <div className="text-gray-900 dark:text-white font-medium mb-2">
                    {item.question.stem}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    {item.reason}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                  <div>错误次数: {item.stats.error_count}</div>
                  <div>掌握度: {item.stats.mastery}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
```

### 添加路由

```jsx
// frontend/src/App.jsx

// 添加新路由
<Route path="/review" element={<ReviewPage />} />
```

### 导航入口

```jsx
// 在 Dashboard 或导航栏添加入口
<button onClick={() => navigate("/review")}>
  📚 错题复习
</button>
```

---

## 🧪 测试方案

### 1. 单元测试

```python
# tests/test_review_algorithm.py

def test_calculate_mistake_weight():
    """测试权重计算"""
    mistake = create_test_mistake(
        knowledge_gap=["牛顿第二定律"],
        cognitive_flaw="计算错误",
        severity="high"
    )
    weight = calculate_mistake_weight(mistake)
    assert weight > 70

def test_calculate_forgetting_risk():
    """测试遗忘风险"""
    mistake = create_test_mistake(
        days_since_review=7,
        mastery=30
    )
    risk = calculate_forgetting_risk(mistake)
    assert risk > 50

def test_recommendation_diversity():
    """测试推荐多样性"""
    recommendations = recommender.recommend_for_review(user_id, count=10)

    # 检查同一知识点不超过 2 题
    knowledge_points = [r["tags"]["knowledge_gap"][0] for r in recommendations]
    from collections import Counter
    counts = Counter(knowledge_points)
    assert all(count <= 2 for count in counts.values())
```

### 2. 集成测试

```bash
# 测试 API
curl http://localhost:8000/api/review/recommendations

# 测试提交复习结果
curl -X POST http://localhost:8000/api/review/123/submit \
  -H "Content-Type: application/json" \
  -d '{"is_correct": true, "time_spent": 120, "confidence": 4}'
```

### 3. 手动测试清单

- [ ] 创建测试错题数据
- [ ] 查看推荐列表，检查优先级排序
- [ ] 开始复习，提交结果
- [ ] 检查掌握度和下次复习时间是否正确
- [ ] 查看薄弱知识点报告
- [ ] 测试推荐巩固练习题功能
- [ ] 测试多样性（不同知识点）

---

## 📈 优化方向

### 短期优化（1-2周）
1. ✅ 实现基础算法
2. ✅ 添加前端界面
3. ✅ 集成到现有系统
4. ✅ 基础测试

### 中期优化（1个月）
1. 🎯 添加机器学习模型优化权重
2. 🎯 实现自适应难度调整
3. 🎯 添加复习提醒功能
4. 🎯 数据可视化（学习曲线）

### 长期优化（3个月）
1. 🚀 跨知识点关联分析
2. 🚀 个性化学习路径推荐
3. 🚀 与 AI 深度结合（智能讲解）
4. 🚀 多用户数据对比（班级排名）

---

## 📚 参考资料

- [SM-2 Algorithm](https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method)
- [艾宾浩斯遗忘曲线](https://en.wikipedia.org/wiki/Forgetting_curve)
- [Anki 的间隔重复算法](https://docs.ankiweb.net/#/)

---

## ✅ 实施步骤

### Phase 1: 数据库迁移（1天）
```bash
# 创建迁移脚本
alembic revision --autogenerate -m "Add review algorithm fields"
alembic upgrade head
```

### Phase 2: 后端实现（2-3天）
1. 实现 `MistakeRecommender` 类
2. 添加 API 路由
3. 编写单元测试
4. 集成到主应用

### Phase 3: 前端实现（2-3天）
1. 创建 `ReviewPage`
2. 添加导航入口
3. 实现复习流程
4. 添加数据可视化

### Phase 4: 测试与优化（2天）
1. 单元测试
2. 集成测试
3. 用户测试
4. 性能优化

**总计**: 约 8-10 天完成基础功能

---

## 🎉 预期效果

### 学习效率提升
- ⏱️ 减少 50% 的无效复习时间
- 🎯 聚焦薄弱知识点
- 📈 掌握度提升速度加快 30%

### 用户体验改善
- 😊 智能推荐，减少决策负担
- 📊 清晰的进度可视化
- 🏆 成就感（优先级下降）

---

**准备好开始实施了吗？我可以帮你生成任何部分的代码！**
