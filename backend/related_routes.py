# backend/related_routes.py
# 四件套关联查询 API

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from database import get_db
import models
import crud
from collections import Counter
import re

router = APIRouter()


# ============================
# 🤖 智能推荐 API
# ============================

@router.get("/api/recommend/tags")
async def recommend_tags(content: str, limit: int = 5, db: Session = Depends(get_db)):
    """
    基于内容智能推荐标签
    1. 从现有笔记、错题、卡片中提取高频标签
    2. 匹配内容中的关键词
    """
    if not content or len(content) < 10:
        return {"tags": []}

    all_tags = []

    # 1. 从笔记中提取标签
    notes = db.query(models.FileItem).filter(models.FileItem.type == "note").all()
    for note in notes:
        if note.tags:
            all_tags.extend(note.tags)

    # 2. 从题目中提取 subject 和 macro_tags
    questions = db.query(models.Question).limit(100).all()
    for q in questions:
        all_tags.append(q.subject)
        if q.macro_tags:
            for key, value in q.macro_tags.items():
                if isinstance(value, list):
                    all_tags.extend(value)
                elif value:
                    all_tags.append(str(value))

    # 3. 从卡片中提取标签
    cards = db.query(models.FlashCard).filter(
        models.FlashCard.user_id == "default_user"
    ).all()
    for card in cards:
        if card.tags:
            all_tags.extend(card.tags)

    # 4. 统计标签频率
    tag_counts = Counter(all_tags)

    # 5. 简单的关键词匹配
    content_lower = content.lower()
    recommended = []

    for tag, count in tag_counts.most_common(50):
        if len(recommended) >= limit:
            break
        tag_lower = str(tag).lower()
        # 如果标签出现在内容中
        if tag_lower in content_lower or content_lower in tag_lower:
            recommended.append({
                "tag": tag,
                "confidence": min(count / 10, 1.0)  # 归一化置信度
            })

    return {"tags": recommended}


@router.post("/api/recommend/auto-link")
async def recommend_auto_link(data: Dict[str, Any], db: Session = Depends(get_db)):
    """
    自动推荐关联内容
    基于：
    1. 标签相似度
    2. 内容关键词匹配
    3. 历史关联模式
    """
    content_type = data.get("type")  # "mistake", "note", "card"
    content_id = data.get("id")
    tags = data.get("tags", [])
    content = data.get("content", "")

    if not content_type or not content_id:
        raise HTTPException(status_code=400, detail="缺少必要参数")

    recommendations = {
        "notes": [],
        "cards": [],
        "mistakes": [],
        "questions": []
    }

    # 1. 基于标签推荐
    if tags:
        from sqlalchemy import or_

        # 推荐笔记
        note_query = db.query(models.FileItem).filter(
            models.FileItem.type == "note"
        )
        tag_conditions = [
            models.FileItem.tags.contains(tag) for tag in tags[:3]
        ]
        notes = note_query.filter(or_(*tag_conditions)).limit(3).all()
        for note in notes:
            if str(note.id) != str(content_id):
                # 计算相似度
                common_tags = set(tags) & set(note.tags or [])
                recommendations["notes"].append({
                    "id": note.id,
                    "name": note.name,
                    "similarity": len(common_tags) / max(len(set(tags)), 1),
                    "reason": f"共同标签: {', '.join(common_tags)}"
                })

        # 推荐卡片
        card_query = db.query(models.FlashCard).filter(
            models.FlashCard.user_id == "default_user"
        )
        tag_conditions = [
            models.FlashCard.tags.contains(tag) for tag in tags[:3]
        ]
        cards = card_query.filter(or_(*tag_conditions)).limit(3).all()
        for card in cards:
            if str(card.id) != str(content_id):
                common_tags = set(tags) & set(card.tags or [])
                recommendations["cards"].append({
                    "id": card.id,
                    "front": card.front[:50] + "...",
                    "similarity": len(common_tags) / max(len(set(tags)), 1),
                    "reason": f"共同标签: {', '.join(common_tags)}"
                })

    # 2. 基于内容推荐（简单关键词匹配）
    if content and len(content) > 20:
        content_words = set(re.findall(r'[\u4e00-\u9fa5]+', content.lower()))

        # 推荐相关题目
        all_questions = db.query(models.Question).limit(50).all()
        for q in all_questions:
            stem = q.stem
            stem_words = set(re.findall(r'[\u4e00-\u9fa5]+', stem.lower()))
            overlap = content_words & stem_words
            if len(overlap) >= 2:  # 至少2个共同词
                recommendations["questions"].append({
                    "id": q.id,
                    "stem": stem[:80] + "...",
                    "reason": f"关键词匹配: {', '.join(list(overlap)[:3])}"
                })
                if len(recommendations["questions"]) >= 3:
                    break

    return recommendations


# ============================
# 🔗 错题关联查询
# ============================

@router.delete("/api/mistakes/{mistake_id}")
async def delete_mistake(mistake_id: int, db: Session = Depends(get_db)):
    """删除错题记录"""
    mistake = db.query(models.Mistake).filter(models.Mistake.id == mistake_id).first()

    if not mistake:
        raise HTTPException(status_code=404, detail="错题不存在")

    db.delete(mistake)
    db.commit()

    return {"success": True, "message": "错题已删除"}

@router.get("/api/mistakes/{mistake_id}/related")
async def get_mistake_related(mistake_id: int, db: Session = Depends(get_db)):
    """
    获取错题的所有关联内容：
    - 关联的笔记
    - 相关的 Anki 卡片（基于标签）
    - 相关的题目（基于标签）
    """
    mistake = db.query(models.Mistake).filter(models.Mistake.id == mistake_id).first()
    if not mistake:
        raise HTTPException(status_code=404, detail="错题不存在")

    result = {
        "mistake_id": mistake_id,
        "note": None,
        "cards": [],
        "questions": [],
        "tags": []
    }

    # 1. 关联的笔记
    if mistake.linked_note_id:
        note = db.query(models.FileItem).filter(models.FileItem.id == mistake.linked_note_id).first()
        if note:
            result["note"] = {
                "id": note.id,
                "name": note.name,
                "content_preview": note.content[:200] + "..." if note.content and len(note.content) > 200 else note.content,
                "tags": note.tags or []
            }

    # 2. 获取题目信息，提取标签
    question = db.query(models.Question).filter(models.Question.id == mistake.question_id).first()
    if question:
        # 从 macro_tags 中提取所有标签
        all_tags = [question.subject]
        if question.macro_tags:
            for key, value in question.macro_tags.items():
                if isinstance(value, list):
                    all_tags.extend(value)
                elif value:
                    all_tags.append(str(value))

        result["tags"] = list(set(all_tags))

        # 3. 基于 tags 查找相关的 Anki 卡片
        if all_tags:
            # 查找包含任一标签的卡片
            cards_query = db.query(models.FlashCard).filter(
                models.FlashCard.user_id == "default_user"
            )

            # 使用 OR 条件匹配任一标签
            from sqlalchemy import or_
            tag_conditions = [
                models.FlashCard.tags.contains(tag) for tag in all_tags[:3]  # 只取前3个标签避免过多查询
            ]
            cards = cards_query.filter(or_(*tag_conditions)).limit(5).all()

            for card in cards:
                result["cards"].append({
                    "id": card.id,
                    "front": card.front[:100] + "..." if len(card.front) > 100 else card.front,
                    "back": card.back[:100] + "..." if len(card.back) > 100 else card.back,
                    "tags": card.tags or [],
                    "deck": card.deck,
                    "source_note_id": card.source_note_id
                })

        # 4. 基于 subject 和 tags 查找相关题目（排除当前题目）
        related_questions = db.query(models.Question).filter(
            models.Question.subject == question.subject,
            models.Question.id != mistake.question_id
        ).limit(5).all()

        for q in related_questions:
            result["questions"].append({
                "id": q.id,
                "stem": q.stem[:100] + "...",
                "difficulty": q.difficulty,
                "type": q.type
            })

    return result


# ============================
# 🔗 笔记关联查询
# ============================

@router.get("/api/notes/{note_id}/related")
async def get_note_related(note_id: str, db: Session = Depends(get_db)):
    """
    获取笔记的所有关联内容：
    - 引用此笔记的错题
    - 相关的 Anki 卡片
    - 相关的题目
    - 双向链接的其他笔记
    """
    note = db.query(models.FileItem).filter(models.FileItem.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")

    result = {
        "note_id": note_id,
        "mistakes": [],
        "cards": [],
        "questions": [],
        "linked_notes": [],
        "tags": note.tags or []
    }

    tags = note.tags or []

    # 1. 查找引用此笔记的错题
    mistakes = db.query(models.Mistake).filter(
        models.Mistake.linked_note_id == note_id
    ).all()

    for mistake in mistakes:
        question = db.query(models.Question).filter(models.Question.id == mistake.question_id).first()
        result["mistakes"].append({
            "id": mistake.id,
            "question_id": mistake.question_id,  # ✅ 新增：添加 question_id 字段用于跳转
            "question_stem": question.stem[:100] if question else "未知题目",
            "error_count": mistake.error_count,
            "mastery": mistake.mastery,
            "last_error_time": mistake.last_error_time
        })

    # 2. 基于 tags 查找相关的 Anki 卡片
    if tags:
        from sqlalchemy import or_
        cards_query = db.query(models.FlashCard).filter(
            models.FlashCard.user_id == "default_user"
        )

        tag_conditions = [
            models.FlashCard.tags.contains(tag) for tag in tags[:3]
        ]
        cards = cards_query.filter(or_(*tag_conditions)).limit(5).all()

        for card in cards:
            result["cards"].append({
                "id": card.id,
                "front": card.front[:100] + "..." if len(card.front) > 100 else card.front,
                "tags": card.tags or [],
                "deck": card.deck
            })

    # 3. 基于 tags 查找相关题目
    if tags:
        from sqlalchemy import or_
        questions_query = db.query(models.Question)

        # 匹配 subject 或 macro_tags
        tag_conditions = [
            models.Question.subject == tag for tag in tags if tag in ["物理", "数学", "化学", "生物", "英语"]
        ]

        if tag_conditions:
            questions = questions_query.filter(or_(*tag_conditions)).limit(5).all()

            for q in questions:
                result["questions"].append({
                    "id": q.id,
                    "stem": q.stem[:100] + "...",
                    "difficulty": q.difficulty,
                    "type": q.type
                })

    # 4. 双向链接的笔记
    linked_notes = crud.get_backlinks(db, note_id) if 'crud' in globals() else []
    for linked_note in linked_notes:
        result["linked_notes"].append({
            "id": linked_note.id,
            "name": linked_note.name,
            "content_preview": linked_note.content[:100] + "..." if linked_note.content and len(linked_note.content) > 100 else linked_note.content
        })

    return result


# ============================
# 🔗 Anki 卡片关联查询
# ============================

@router.get("/api/cards/{card_id}/related")
async def get_card_related(card_id: str, db: Session = Depends(get_db)):
    """
    获取 Anki 卡片的所有关联内容：
    - 来源笔记
    - 来源错题
    - 相关的题目
    - 相关的其他卡片
    """
    card = db.query(models.FlashCard).filter(models.FlashCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="卡片不存在")

    result = {
        "card_id": card_id,
        "source_note": None,
        "source_mistake": None,
        "questions": [],
        "related_cards": [],
        "tags": card.tags or []
    }

    tags = card.tags or []

    # 1. 来源笔记
    if card.source_note_id:
        note = db.query(models.FileItem).filter(models.FileItem.id == card.source_note_id).first()
        if note:
            result["source_note"] = {
                "id": note.id,
                "name": note.name,
                "content_preview": note.content[:200] + "..." if note.content and len(note.content) > 200 else note.content,
                "tags": note.tags or []
            }

    # 2. 来源错题
    if card.source_mistake_id:
        mistake = db.query(models.Mistake).filter(models.Mistake.id == card.source_mistake_id).first()
        if mistake:
            question = db.query(models.Question).filter(models.Question.id == mistake.question_id).first()
            result["source_mistake"] = {
                "id": mistake.id,
                "question_id": mistake.question_id,  # ✅ 新增：添加 question_id 字段用于跳转
                "question_stem": question.stem[:100] if question else "未知题目",
                "error_count": mistake.error_count
            }

    # 3. 基于 tags 查找相关题目
    if tags:
        from sqlalchemy import or_
        questions_query = db.query(models.Question)

        tag_conditions = [
            models.Question.subject == tag for tag in tags if tag in ["物理", "数学", "化学", "生物", "英语"]
        ]

        if tag_conditions:
            questions = questions_query.filter(or_(*tag_conditions)).limit(5).all()

            for q in questions:
                result["questions"].append({
                    "id": q.id,
                    "stem": q.stem[:100] + "...",
                    "difficulty": q.difficulty,
                    "type": q.type
                })

    # 4. 查找相关的其他卡片（相同标签）
    if tags:
        from sqlalchemy import or_
        cards_query = db.query(models.FlashCard).filter(
            models.FlashCard.user_id == "default_user",
            models.FlashCard.id != card_id
        )

        tag_conditions = [
            models.FlashCard.tags.contains(tag) for tag in tags[:2]
        ]
        related_cards = cards_query.filter(or_(*tag_conditions)).limit(3).all()

        for rc in related_cards:
            result["related_cards"].append({
                "id": rc.id,
                "front": rc.front[:80] + "..." if len(rc.front) > 80 else rc.front,
                "tags": rc.tags or [],
                "deck": rc.deck
            })

    return result


# ============================
# 🔗 题目关联查询
# ============================

@router.get("/api/questions/{question_id}/related")
async def get_question_related(question_id: str, db: Session = Depends(get_db)):
    """
    获取题目的所有关联内容：
    - 相关笔记
    - 相关错题
    - 相关题目
    """
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    result = {
        "question_id": question_id,
        "notes": [],
        "mistakes": [],
        "related_questions": [],
        "tags": [question.subject]
    }

    # 提取标签
    if question.macro_tags:
        for key, value in question.macro_tags.items():
            if isinstance(value, list):
                result["tags"].extend(value)
            elif value:
                result["tags"].append(str(value))

    result["tags"] = list(set(result["tags"]))

    # 1. 相关笔记（从 related_notes 字段）
    if question.related_notes:
        for note_id in question.related_notes:
            note = db.query(models.FileItem).filter(models.FileItem.id == note_id).first()
            if note:
                result["notes"].append({
                    "id": note.id,
                    "name": note.name,
                    "content_preview": note.content[:150] + "..." if note.content and len(note.content) > 150 else note.content,
                    "tags": note.tags or []
                })

    # 2. 相关错题
    mistakes = db.query(models.Mistake).filter(
        models.Mistake.question_id == question_id
    ).all()

    for mistake in mistakes:
        result["mistakes"].append({
            "id": mistake.id,
            "error_count": mistake.error_count,
            "mastery": mistake.mastery,
            "linked_note_id": mistake.linked_note_id
        })

    # 3. 基于标签查找相关题目
    from sqlalchemy import or_
    related_questions = db.query(models.Question).filter(
        models.Question.subject == question.subject,
        models.Question.id != question_id
    ).limit(5).all()

    for q in related_questions:
        result["related_questions"].append({
            "id": q.id,
            "stem": q.stem[:100] + "...",
            "difficulty": q.difficulty
        })

    return result
