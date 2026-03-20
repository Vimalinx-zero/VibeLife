"""
高考学习核心 API 路由
错题管理、薄弱点分析、复习调度
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import datetime
import uuid

from database import get_db
from models import MistakeItem, WeakPoint, ReviewRecord, VariationQuestion

router = APIRouter(prefix="/api/gaokao", tags=["gaokao"])


# ==================== Pydantic Schemas ====================

class MistakeCreate(BaseModel):
    question_text: str
    question_image: Optional[str] = None
    answer_text: Optional[str] = None
    answer_image: Optional[str] = None
    subject: str = "综合"
    chapter: Optional[str] = None
    difficulty: int = 3
    my_answer: Optional[str] = None
    error_type: Optional[str] = None
    error_analysis: Optional[str] = None
    key_insight: Optional[str] = None
    source_type: str = "manual"
    source_exam: Optional[str] = None
    tags: List[str] = []


class MistakeUpdate(BaseModel):
    question_text: Optional[str] = None
    answer_text: Optional[str] = None
    error_analysis: Optional[str] = None
    key_insight: Optional[str] = None
    mastery_level: Optional[int] = None
    is_mastered: Optional[bool] = None
    tags: Optional[List[str]] = None


class ReviewCreate(BaseModel):
    mistake_id: str
    result: str  # correct/partial/wrong
    time_spent_seconds: Optional[int] = None
    self_rating: Optional[int] = None
    notes: Optional[str] = None


class VariationCreate(BaseModel):
    source_mistake_id: str
    question_text: str
    question_image: Optional[str] = None
    answer_text: Optional[str] = None
    variation_type: Optional[str] = None
    variation_note: Optional[str] = None


# ==================== 错题 API ====================

@router.post("/mistakes")
def create_mistake(mistake: MistakeCreate, user_id: str, db: Session = Depends(get_db)):
    """创建错题"""
    db_mistake = MistakeItem(
        id=str(uuid.uuid4()),
        user_id=user_id,
        **mistake.dict()
    )
    db.add(db_mistake)
    db.commit()
    db.refresh(db_mistake)

    # 同步更新薄弱点
    _update_weak_point(db, user_id, mistake.subject, mistake.chapter, db_mistake.id)

    return {"id": db_mistake.id, "message": "错题创建成功"}


@router.get("/mistakes")
def list_mistakes(
    user_id: str,
    subject: Optional[str] = None,
    is_mastered: Optional[bool] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """获取错题列表"""
    query = db.query(MistakeItem).filter(MistakeItem.user_id == user_id)

    if subject:
        query = query.filter(MistakeItem.subject == subject)
    if is_mastered is not None:
        query = query.filter(MistakeItem.is_mastered == is_mastered)

    mistakes = query.order_by(MistakeItem.created_at.desc()).limit(limit).all()

    return {
        "total": len(mistakes),
        "items": [
            {
                "id": m.id,
                "subject": m.subject,
                "chapter": m.chapter,
                "question_text": m.question_text[:100] + "..." if len(m.question_text) > 100 else m.question_text,
                "difficulty": m.difficulty,
                "mastery_level": m.mastery_level,
                "review_count": m.review_count,
                "is_mastered": m.is_mastered,
                "created_at": m.created_at
            }
            for m in mistakes
        ]
    }


@router.get("/mistakes/{mistake_id}")
def get_mistake(mistake_id: str, user_id: str, db: Session = Depends(get_db)):
    """获取单个错题详情"""
    mistake = db.query(MistakeItem).filter(
        MistakeItem.id == mistake_id,
        MistakeItem.user_id == user_id
    ).first()

    if not mistake:
        raise HTTPException(status_code=404, detail="错题不存在")

    return {
        "id": mistake.id,
        "question_text": mistake.question_text,
        "question_image": mistake.question_image,
        "answer_text": mistake.answer_text,
        "subject": mistake.subject,
        "chapter": mistake.chapter,
        "difficulty": mistake.difficulty,
        "my_answer": mistake.my_answer,
        "error_type": mistake.error_type,
        "error_analysis": mistake.error_analysis,
        "key_insight": mistake.key_insight,
        "mastery_level": mistake.mastery_level,
        "review_count": mistake.review_count,
        "is_mastered": mistake.is_mastered,
        "tags": mistake.tags,
        "created_at": mistake.created_at,
        "updated_at": mistake.updated_at
    }


@router.patch("/mistakes/{mistake_id}")
def update_mistake(
    mistake_id: str,
    user_id: str,
    update: MistakeUpdate,
    db: Session = Depends(get_db)
):
    """更新错题"""
    mistake = db.query(MistakeItem).filter(
        MistakeItem.id == mistake_id,
        MistakeItem.user_id == user_id
    ).first()

    if not mistake:
        raise HTTPException(status_code=404, detail="错题不存在")

    update_data = update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(mistake, key, value)

    mistake.updated_at = datetime.datetime.utcnow().isoformat()
    db.commit()

    return {"message": "更新成功", "id": mistake_id}


@router.delete("/mistakes/{mistake_id}")
def delete_mistake(mistake_id: str, user_id: str, db: Session = Depends(get_db)):
    """删除错题"""
    mistake = db.query(MistakeItem).filter(
        MistakeItem.id == mistake_id,
        MistakeItem.user_id == user_id
    ).first()

    if not mistake:
        raise HTTPException(status_code=404, detail="错题不存在")

    db.delete(mistake)
    db.commit()

    return {"message": "删除成功"}


# ==================== 复习 API ====================

@router.post("/reviews")
def create_review(review: ReviewCreate, user_id: str, db: Session = Depends(get_db)):
    """记录复习"""
    # 验证错题存在
    mistake = db.query(MistakeItem).filter(
        MistakeItem.id == review.mistake_id,
        MistakeItem.user_id == user_id
    ).first()

    if not mistake:
        raise HTTPException(status_code=404, detail="错题不存在")

    # 创建复习记录
    before_mastery = mistake.mastery_level
    after_mastery = before_mastery

    # 根据复习结果调整掌握度
    if review.result == "correct":
        after_mastery = min(5, before_mastery + 1)
        if after_mastery >= 4:
            mistake.is_mastered = True
    elif review.result == "wrong":
        after_mastery = max(1, before_mastery - 1)
        mistake.is_mastered = False

    db_review = ReviewRecord(
        id=str(uuid.uuid4()),
        user_id=user_id,
        mistake_id=review.mistake_id,
        result=review.result,
        time_spent_seconds=review.time_spent_seconds,
        self_rating=review.self_rating,
        notes=review.notes,
        before_mastery=before_mastery,
        after_mastery=after_mastery
    )
    db.add(db_review)

    # 更新错题状态
    mistake.review_count += 1
    mistake.mastery_level = after_mastery
    mistake.last_review_at = datetime.datetime.utcnow().isoformat()

    # 简单的间隔重复算法
    if after_mastery >= 4:
        # 掌握度高，延长复习间隔
        days_until_next = 7 * (after_mastery - 2)
    else:
        # 掌握度低，短期内复习
        days_until_next = max(1, 3 - after_mastery)

    from datetime import timedelta
    mistake.next_review_at = (datetime.datetime.utcnow() + timedelta(days=days_until_next)).isoformat()

    db.commit()

    return {
        "id": db_review.id,
        "message": "复习记录成功",
        "mastery_change": f"{before_mastery} -> {after_mastery}",
        "next_review": mistake.next_review_at
    }


@router.get("/reviews/today")
def get_today_reviews(user_id: str, db: Session = Depends(get_db)):
    """获取今日待复习错题"""
    today = datetime.datetime.utcnow().isoformat()

    due_mistakes = db.query(MistakeItem).filter(
        MistakeItem.user_id == user_id,
        MistakeItem.is_mastered == False,
        MistakeItem.next_review_at <= today
    ).order_by(MistakeItem.next_review_at).all()

    return {
        "total": len(due_mistakes),
        "items": [
            {
                "id": m.id,
                "subject": m.subject,
                "question_preview": m.question_text[:50] + "..." if len(m.question_text) > 50 else m.question_text,
                "mastery_level": m.mastery_level,
                "review_count": m.review_count,
                "next_review_at": m.next_review_at
            }
            for m in due_mistakes
        ]
    }


# ==================== 薄弱点 API ====================

@router.get("/weakpoints")
def list_weakpoints(user_id: str, db: Session = Depends(get_db)):
    """获取薄弱点列表"""
    weakpoints = db.query(WeakPoint).filter(
        WeakPoint.user_id == user_id
    ).order_by(WeakPoint.weakness_score.desc()).all()

    return {
        "total": len(weakpoints),
        "items": [
            {
                "id": w.id,
                "subject": w.subject,
                "chapter": w.chapter,
                "knowledge_point": w.knowledge_point,
                "weakness_score": w.weakness_score,
                "mistake_count": w.mistake_count,
                "mastery_trend": w.mastery_trend,
                "priority": w.priority
            }
            for w in weakpoints
        ]
    }


# ==================== 变式题 API ====================

@router.post("/variations")
def create_variation(variation: VariationCreate, user_id: str, db: Session = Depends(get_db)):
    """创建变式题"""
    # 验证源错题存在
    mistake = db.query(MistakeItem).filter(
        MistakeItem.id == variation.source_mistake_id,
        MistakeItem.user_id == user_id
    ).first()

    if not mistake:
        raise HTTPException(status_code=404, detail="源错题不存在")

    db_variation = VariationQuestion(
        id=str(uuid.uuid4()),
        user_id=user_id,
        **variation.dict()
    )
    db.add(db_variation)

    # 关联到错题
    if mistake.variation_ids is None:
        mistake.variation_ids = []
    mistake.variation_ids = mistake.variation_ids + [db_variation.id]

    db.commit()

    return {"id": db_variation.id, "message": "变式题创建成功"}


@router.get("/variations/mistake/{mistake_id}")
def get_variations_for_mistake(mistake_id: str, user_id: str, db: Session = Depends(get_db)):
    """获取某错题的变式题"""
    variations = db.query(VariationQuestion).filter(
        VariationQuestion.source_mistake_id == mistake_id,
        VariationQuestion.user_id == user_id
    ).all()

    return {
        "total": len(variations),
        "items": [
            {
                "id": v.id,
                "question_text": v.question_text[:100] + "..." if len(v.question_text) > 100 else v.question_text,
                "variation_type": v.variation_type,
                "is_practiced": v.is_practiced,
                "practice_result": v.practice_result
            }
            for v in variations
        ]
    }


# ==================== 辅助函数 ====================

def _update_weak_point(db: Session, user_id: str, subject: str, chapter: Optional[str], mistake_id: str):
    """更新薄弱点（内部函数）"""
    if not chapter:
        return

    # 查找或创建薄弱点
    weakpoint = db.query(WeakPoint).filter(
        WeakPoint.user_id == user_id,
        WeakPoint.subject == subject,
        WeakPoint.chapter == chapter
    ).first()

    if not weakpoint:
        weakpoint = WeakPoint(
            id=str(uuid.uuid4()),
            user_id=user_id,
            subject=subject,
            chapter=chapter,
            knowledge_point=chapter,  # 简化处理
            mistake_ids=[mistake_id],
            mistake_count=1,
            weakness_score=50
        )
        db.add(weakpoint)
    else:
        if weakpoint.mistake_ids is None:
            weakpoint.mistake_ids = []
        if mistake_id not in weakpoint.mistake_ids:
            weakpoint.mistake_ids = weakpoint.mistake_ids + [mistake_id]
            weakpoint.mistake_count = len(weakpoint.mistake_ids)
            # 简单算法：错题越多，薄弱程度越高
            weakpoint.weakness_score = min(100, 40 + weakpoint.mistake_count * 10)

        weakpoint.last_updated_at = datetime.datetime.utcnow().isoformat()

    db.commit()
