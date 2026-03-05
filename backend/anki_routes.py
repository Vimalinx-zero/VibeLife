# backend/anki_routes.py
# Anki 记忆卡 API：卡片管理、复习队列、SM-2 算法集成

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import pydantic

from database import get_db
from auth import get_current_user_id  # ✅ 新增：用户认证依赖
import models
import anki_algorithm

router = APIRouter()

# ========================
# Schemas
# ========================

class FlashCardCreate(pydantic.BaseModel):
    front: str
    back: str
    tags: List[str] = []
    deck: str = "default"

class FlashCardUpdate(pydantic.BaseModel):
    front: Optional[str] = None
    back: Optional[str] = None
    tags: Optional[List[str]] = None
    deck: Optional[str] = None

class CardReviewCreate(pydantic.BaseModel):
    quality: int  # 0-5
    time_spent: int = 0  # 秒

# ========================
# FlashCard CRUD API
# ========================

@router.get("/api/anki/cards")
async def get_cards(
    deck: Optional[str] = None,
    tags: Optional[str] = None,
    tags_mode: str = "or",  # "or" 或 "and"
    mastery_level: Optional[str] = None,  # "new", "learning", "familiar", "mastered", "difficult"
    limit: int = 100,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    获取所有卡片（支持按牌组、标签、熟练度筛选）（带用户隔离）

    tags_mode:
    - "or": 包含任意一个标签即可（OR 逻辑，适合多分类复习）
    - "and": 同时包含所有标签（AND 逻辑，适合精确筛选）

    mastery_level:
    - "new": 新卡片 (repetitions = 0)
    - "learning": 学习中 (0 < repetitions < 3)
    - "familiar": 熟悉中 (3 <= repetitions < 5)
    - "mastered": 已掌握 (repetitions >= 5)
    - "difficult": 困难卡片 (ease_factor < 2.0)
    """
    query = db.query(models.FlashCard).filter(
        models.FlashCard.user_id == current_user_id  # ✅ 用户隔离
    )

    if deck:
        query = query.filter(models.FlashCard.deck == deck)

    if tags:
        # JSON 字段查询（SQLite）
        tag_list = tags.split(',')

        if tags_mode == "and":
            # AND 逻辑：必须包含所有标签
            for tag in tag_list:
                query = query.filter(models.FlashCard.tags.contains(tag))
        else:
            # OR 逻辑：包含任意一个标签即可
            # 使用 or_ 连接多个查询条件
            from sqlalchemy import or_
            conditions = [models.FlashCard.tags.contains(tag) for tag in tag_list]
            query = query.filter(or_(*conditions))

    # 熟练度筛选
    if mastery_level:
        if mastery_level == "new":
            query = query.filter(models.FlashCard.repetitions == 0)
        elif mastery_level == "learning":
            query = query.filter(models.FlashCard.repetitions > 0, models.FlashCard.repetitions < 3)
        elif mastery_level == "familiar":
            query = query.filter(models.FlashCard.repetitions >= 3, models.FlashCard.repetitions < 5)
        elif mastery_level == "mastered":
            query = query.filter(models.FlashCard.repetitions >= 5)
        elif mastery_level == "difficult":
            query = query.filter(models.FlashCard.ease_factor < 2.0)

    cards = query.order_by(models.FlashCard.created_at.desc()).limit(limit).all()

    return [{
        "id": c.id,
        "front": c.front,
        "back": c.back,
        "tags": c.tags,
        "deck": c.deck,
        "ease_factor": c.ease_factor,
        "interval": c.interval,
        "repetitions": c.repetitions,
        "next_review_date": c.next_review_date,
        "created_at": c.created_at,
        "updated_at": c.updated_at
    } for c in cards]

@router.get("/api/anki/cards/{card_id}")
async def get_card(
    card_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取单个卡片详情（带用户隔离）"""
    card = db.query(models.FlashCard).filter(
        models.FlashCard.id == card_id,
        models.FlashCard.user_id == current_user_id  # ✅ 用户隔离
    ).first()

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    return {
        "id": card.id,
        "front": card.front,
        "back": card.back,
        "tags": card.tags,
        "deck": card.deck,
        "ease_factor": card.ease_factor,
        "interval": card.interval,
        "repetitions": card.repetitions,
        "next_review_date": card.next_review_date,
        "created_at": card.created_at,
        "updated_at": card.updated_at
    }

@router.post("/api/anki/cards")
async def create_card(
    card: FlashCardCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """创建新卡片（自动添加时间标签）（带用户隔离）"""
    import time
    card_id = f"card_{int(time.time() * 1000)}"

    # 自动添加时间标签
    now = datetime.utcnow()
    year_month = now.strftime("%Y-%m")  # 2024-12
    quarter = f"{now.year}-Q{(now.month - 1) // 3 + 1}"  # 2024-Q4

    # 合并用户标签和系统标签
    auto_tags = [f"system:time:{year_month}", f"system:time:{quarter}"]
    all_tags = list(set(card.tags + auto_tags))  # 去重

    new_card = models.FlashCard(
        id=card_id,
        front=card.front,
        back=card.back,
        tags=all_tags,
        deck=card.deck,
        user_id=current_user_id,  # ✅ 关联到当前用户
        # 新卡片的第一次复习时间设置为立即
        next_review_date=datetime.utcnow().isoformat()
    )

    db.add(new_card)
    db.commit()
    db.refresh(new_card)

    return {
        "id": new_card.id,
        "front": new_card.front,
        "back": new_card.back,
        "tags": new_card.tags,
        "deck": new_card.deck,
        "ease_factor": new_card.ease_factor,
        "interval": new_card.interval,
        "repetitions": new_card.repetitions,
        "next_review_date": new_card.next_review_date,
        "created_at": new_card.created_at,
        "updated_at": new_card.updated_at
    }

@router.put("/api/anki/cards/{card_id}")
async def update_card(
    card_id: str,
    card_update: FlashCardUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """更新卡片内容（不影响复习进度）（带用户隔离）"""
    card = db.query(models.FlashCard).filter(
        models.FlashCard.id == card_id,
        models.FlashCard.user_id == current_user_id  # ✅ 用户隔离
    ).first()

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Update fields
    if card_update.front is not None:
        card.front = card_update.front
    if card_update.back is not None:
        card.back = card_update.back
    if card_update.tags is not None:
        card.tags = card_update.tags
    if card_update.deck is not None:
        card.deck = card_update.deck

    card.updated_at = datetime.utcnow().isoformat()

    db.commit()
    db.refresh(card)

    return {
        "id": card.id,
        "front": card.front,
        "back": card.back,
        "tags": card.tags,
        "deck": card.deck,
        "ease_factor": card.ease_factor,
        "interval": card.interval,
        "repetitions": card.repetitions,
        "next_review_date": card.next_review_date,
        "created_at": card.created_at,
        "updated_at": card.updated_at
    }

@router.delete("/api/anki/cards/{card_id}")
async def delete_card(
    card_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """删除卡片（带用户隔离）"""
    card = db.query(models.FlashCard).filter(
        models.FlashCard.id == card_id,
        models.FlashCard.user_id == current_user_id  # ✅ 用户隔离
    ).first()

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    db.delete(card)
    db.commit()

    return {"success": True, "message": "Card deleted"}

# ========================
# Review System API
# ========================

@router.get("/api/anki/review/due")
async def get_due_cards(
    deck: Optional[str] = None,
    tags: Optional[str] = None,
    mode: str = "due",  # "due" = 只复习到期卡片, "all" = 复习所有卡片
    limit: int = 20,
    tags_mode: str = "or",  # "or" 或 "and"
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取待复习的卡片（支持到期模式和全部模式）（带用户隔离）"""
    query = db.query(models.FlashCard).filter(
        models.FlashCard.user_id == current_user_id  # ✅ 用户隔离
    )

    # 筛选条件
    if deck:
        query = query.filter(models.FlashCard.deck == deck)

    if tags:
        # JSON 字段查询（SQLite）
        tag_list = tags.split(',')

        if tags_mode == "and":
            # AND 逻辑：必须包含所有标签
            for tag in tag_list:
                query = query.filter(models.FlashCard.tags.contains(tag))
        else:
            # OR 逻辑：包含任意一个标签即可
            from sqlalchemy import or_
            conditions = [models.FlashCard.tags.contains(tag) for tag in tag_list]
            query = query.filter(or_(*conditions))

    # 模式选择
    if mode == "due":
        # 到期模式：只显示到期的卡片
        now = datetime.utcnow().isoformat()
        cards = query.filter(
            models.FlashCard.next_review_date <= now
        ).order_by(
            models.FlashCard.next_review_date.asc()
        ).limit(limit).all()
    else:
        # 全部模式：显示所有卡片（按下次复习时间排序）
        cards = query.order_by(
            models.FlashCard.next_review_date.asc()
        ).limit(limit).all()

    return [{
        "id": c.id,
        "front": c.front,
        "back": c.back,  # 前端需要先隐藏答案
        "tags": c.tags,
        "deck": c.deck,
        "ease_factor": c.ease_factor,
        "interval": c.interval,
        "repetitions": c.repetitions
    } for c in cards]

@router.post("/api/anki/review/{card_id}")
async def submit_review(
    card_id: str,
    review: CardReviewCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """提交复习结果并更新卡片（带每日熟练度上限）（带用户隔离）"""
    card = db.query(models.FlashCard).filter(
        models.FlashCard.id == card_id,
        models.FlashCard.user_id == current_user_id  # ✅ 用户隔离
    ).first()

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # 验证评分范围
    if review.quality < 0 or review.quality > 5:
        raise HTTPException(status_code=400, detail="Quality must be between 0 and 5")

    # 使用 SM-2 算法计算新的复习参数
    calculated_ease_factor, new_interval, new_repetitions, next_review_date = \
        anki_algorithm.calculate_next_review(
            review.quality,
            card.ease_factor,
            card.interval,
            card.repetitions
        )

    # 每日熟练度上限机制
    DAILY_EASE_INCREASE_CAP = 0.5  # 每日最多增加 0.5 的难度因子
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    # 查询今天已获得的熟练度增加
    today_reviews = db.query(models.CardReview).filter(
        models.CardReview.created_at >= today_start
    ).all()

    # 计算今天已经增加的总熟练度
    # （简化计算：假设每次复习的 ease_factor 增加就是新值减去旧值的平均值）
    total_ease_increase_today = sum([
        max(0, r.ease_factor - 2.5) for r in today_reviews
    ])

    # 计算本次增加的熟练度
    current_ease_increase = max(0, calculated_ease_factor - card.ease_factor)

    # 应用上限
    if total_ease_increase_today + current_ease_increase > DAILY_EASE_INCREASE_CAP:
        # 缩放本次增加，使其不超过剩余配额
        remaining_quota = DAILY_EASE_INCREASE_CAP - total_ease_increase_today
        if remaining_quota > 0:
            # 按比例缩放
            new_ease_factor = card.ease_factor + min(current_ease_increase, remaining_quota)
        else:
            # 已达上限，不增加熟练度（但仍记录复习）
            new_ease_factor = card.ease_factor
    else:
        new_ease_factor = calculated_ease_factor

    # 更新卡片
    card.ease_factor = new_ease_factor
    card.interval = new_interval
    card.repetitions = new_repetitions
    card.next_review_date = next_review_date
    card.updated_at = datetime.utcnow().isoformat()

    # 自动添加"最近错题"标签（评分 <= 2 时）
    if review.quality <= 2:
        recent_mistake_tag = "system:recent-mistake"
        if recent_mistake_tag not in card.tags:
            card.tags = card.tags + [recent_mistake_tag]
            # 标记 JSON 字段已修改
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(card, "tags")

    # 创建复习记录
    import time
    review_id = f"review_{int(time.time() * 1000)}"

    review_record = models.CardReview(
        id=review_id,
        card_id=card_id,
        quality=review.quality,
        time_spent=review.time_spent,
        ease_factor=new_ease_factor,  # 记录更新后的值（已应用上限）
        interval=new_interval
    )

    db.add(review_record)
    db.commit()

    # 返回统计信息
    stats = anki_algorithm.get_review_statistics(review.quality)

    return {
        "success": True,
        "card_id": card_id,
        "review_id": review_id,
        "new_ease_factor": new_ease_factor,
        "new_interval": new_interval,
        "new_repetitions": new_repetitions,
        "next_review_date": next_review_date,
        "stats": stats,
        "daily_cap_applied": new_ease_factor < calculated_ease_factor  # 是否触达上限
    }

@router.get("/api/anki/review/history/{card_id}")
async def get_card_history(
    card_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """获取卡片的复习历史"""
    reviews = db.query(models.CardReview).filter(
        models.CardReview.card_id == card_id
    ).order_by(
        models.CardReview.created_at.desc()
    ).limit(limit).all()

    return [{
        "id": r.id,
        "quality": r.quality,
        "review_time": r.review_time,
        "time_spent": r.time_spent,
        "ease_factor": r.ease_factor,
        "interval": r.interval,
        "created_at": r.created_at
    } for r in reviews]

# ========================
# Statistics API
# ========================

@router.get("/api/anki/stats")
async def get_anki_stats(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取 Anki 统计数据（带用户隔离）"""
    # 总卡片数
    total_cards = db.query(models.FlashCard).filter(
        models.FlashCard.user_id == current_user_id
    ).count()

    # 今日待复习数
    today_start = anki_algorithm.get_due_cards_query()
    due_cards = db.query(models.FlashCard).filter(
        models.FlashCard.user_id == current_user_id,  # ✅ 用户隔离
        models.FlashCard.next_review_date <= today_start
    ).count()

    # 今日已复习数
    reviews_today = db.query(models.CardReview).join(
        models.FlashCard, models.CardReview.card_id == models.FlashCard.id
    ).filter(
        models.FlashCard.user_id == current_user_id,  # ✅ 用户隔离
        models.CardReview.created_at >= today_start
    ).count()

    # 总复习次数
    total_reviews = db.query(models.CardReview).join(
        models.FlashCard, models.CardReview.card_id == models.FlashCard.id
    ).filter(
        models.FlashCard.user_id == current_user_id  # ✅ 用户隔离
    ).count()

    # 按牌组统计
    cards_by_deck = db.query(
        models.FlashCard.deck,
        func.count(models.FlashCard.id)
    ).filter(
        models.FlashCard.user_id == current_user_id  # ✅ 用户隔离
    ).group_by(
        models.FlashCard.deck
    ).all()

    deck_stats = {deck: count for deck, count in cards_by_deck}

    return {
        "total_cards": total_cards,
        "due_cards": due_cards,
        "reviews_today": reviews_today,
        "total_reviews": total_reviews,
        "deck_stats": deck_stats
    }

@router.get("/api/anki/stats/daily")
async def get_daily_review_stats(days: int = 30, db: Session = Depends(get_db)):
    """获取每日复习统计数据（用于图表）"""
    from datetime import datetime, timedelta

    # 计算开始日期
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days-1)

    # 生成日期列表
    date_list = []
    current_date = start_date
    while current_date <= end_date:
        date_list.append(current_date.strftime('%Y-%m-%d'))
        current_date += timedelta(days=1)

    # 查询每日复习记录
    reviews = db.query(
        func.date(models.CardReview.created_at).label('date'),
        func.count(models.CardReview.id).label('count')
    ).filter(
        func.date(models.CardReview.created_at) >= start_date.date()
    ).group_by(
        func.date(models.CardReview.created_at)
    ).all()

    # 构建统计数据
    review_stats = {str(date): count for date, count in reviews}

    # 填充所有日期（没有复习的日期补0）
    daily_data = []
    for date_str in date_list:
        daily_data.append({
            'date': date_str,
            'count': review_stats.get(date_str, 0)
        })

    return daily_data

@router.get("/api/anki/stats/mastery")
async def get_mastery_stats(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取熟练度分布统计（带用户隔离）"""
    # 新卡片（从未复习）
    new_cards = db.query(models.FlashCard).filter(
        models.FlashCard.user_id == current_user_id,  # ✅ 用户隔离
        models.FlashCard.repetitions == 0
    ).count()

    # 学习中（复习1-2次）
    learning = db.query(models.FlashCard).filter(
        models.FlashCard.user_id == current_user_id,  # ✅ 用户隔离
        models.FlashCard.repetitions > 0,
        models.FlashCard.repetitions < 3
    ).count()

    # 熟悉中（复习3-4次）
    familiar = db.query(models.FlashCard).filter(
        models.FlashCard.user_id == current_user_id,  # ✅ 用户隔离
        models.FlashCard.repetitions >= 3,
        models.FlashCard.repetitions < 5
    ).count()

    # 已掌握（复习5次以上）
    mastered = db.query(models.FlashCard).filter(
        models.FlashCard.user_id == current_user_id,  # ✅ 用户隔离
        models.FlashCard.repetitions >= 5
    ).count()

    return [
        { 'name': '新卡片', 'value': new_cards, 'color': '#3b82f6' },
        { 'name': '学习中', 'value': learning, 'color': '#eab308' },
        { 'name': '熟悉中', 'value': familiar, 'color': '#a855f7' },
        { 'name': '已掌握', 'value': mastered, 'color': '#22c55e' }
    ]

@router.get("/api/anki/decks")
async def get_decks(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取所有牌组（带用户隔离）"""
    cards = db.query(models.FlashCard.deck).filter(
        models.FlashCard.user_id == current_user_id  # ✅ 用户隔离
    ).distinct().all()

    decks = []
    for (deck_name,) in cards:
        # 统计每个牌组的信息
        total = db.query(models.FlashCard).filter(
            models.FlashCard.user_id == current_user_id,  # ✅ 用户隔离
            models.FlashCard.deck == deck_name
        ).count()

        today_start = anki_algorithm.get_due_cards_query()
        due = db.query(models.FlashCard).filter(
            models.FlashCard.user_id == current_user_id,  # ✅ 用户隔离
            models.FlashCard.deck == deck_name,
            models.FlashCard.next_review_date <= today_start
        ).count()

        decks.append({
            "name": deck_name,
            "total_cards": total,
            "due_cards": due
        })

    return decks

# ========================
# Tags API
# ========================

@router.get("/api/anki/tags")
async def get_tags_tree(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    获取标签树形结构（带用户隔离）
    标签格式：
    - 用户标签：用 > 分隔层级，如 "数学>微积分>导数"
    - 系统标签：system:time:2024-12（时间）、system:recent-mistake（错题）

    返回格式：[{"name": "数学", "count": 10, "children": [...]}]
    """
    # 获取所有卡片
    cards = db.query(models.FlashCard).filter(
        models.FlashCard.user_id == current_user_id  # ✅ 用户隔离
    ).all()

    # 构建标签树
    user_tag_tree = {}  # 用户标签树
    system_tags = {
        "system:time:": {"name": "时间标签", "count": 0, "children": {}},
        "system:recent-mistake": {"name": "最近错题", "count": 0, "is_leaf": True}
    }

    for card in cards:
        # 处理每个标签
        for tag in card.tags:
            if tag.startswith("system:"):
                # 系统标签
                if tag.startswith("system:time:"):
                    # 时间标签：system:time:2024-12
                    time_value = tag.replace("system:time:", "")
                    if time_value not in system_tags["system:time:"]["children"]:
                        system_tags["system:time:"]["children"][time_value] = {
                            "name": time_value,
                            "count": 0,
                            "is_leaf": True
                        }
                    system_tags["system:time:"]["children"][time_value]["count"] += 1
                    system_tags["system:time:"]["count"] += 1
                elif tag == "system:recent-mistake":
                    # 最近错题标签
                    system_tags["system:recent-mistake"]["count"] += 1
            else:
                # 用户标签：按层级分割
                parts = tag.split('>')
                current_level = user_tag_tree

                # 遍历层级，构建树
                for i, part in enumerate(parts):
                    if part not in current_level:
                        current_level[part] = {
                            "name": part,
                            "count": 0,
                            "children": {}
                        }

                    # 如果是最后一层，增加计数
                    if i == len(parts) - 1:
                        current_level[part]["count"] += 1

                    # 进入下一层
                    current_level = current_level[part]["children"]

    # 转换为列表格式
    def tree_to_list(tree_dict):
        result = []
        for name, node in tree_dict.items():
            result.append({
                "name": name,
                "count": node["count"],
                "children": tree_to_list(node["children"])
            })
        # 按名称排序
        result.sort(key=lambda x: x["name"])
        return result

    # 构建最终结果
    result = []

    # 添加用户标签
    if user_tag_tree:
        result.append({
            "name": "用户标签",
            "count": sum(node["count"] for node in user_tag_tree.values()),
            "children": tree_to_list(user_tag_tree)
        })

    # 添加系统标签
    system_result = []

    # 时间标签
    if system_tags["system:time:"]["count"] > 0:
        time_children = []
        for name, node in system_tags["system:time:"]["children"].items():
            time_children.append({
                "name": node["name"],
                "count": node["count"],
                "children": []
            })
        time_children.sort(key=lambda x: x["name"], reverse=True)  # 最新的在前

        system_result.append({
            "name": "时间标签",
            "count": system_tags["system:time:"]["count"],
            "children": time_children
        })

    # 最近错题
    if system_tags["system:recent-mistake"]["count"] > 0:
        system_result.append({
            "name": "最近错题",
            "count": system_tags["system:recent-mistake"]["count"],
            "children": []
        })

    if system_result:
        result.append({
            "name": "系统标签",
            "count": sum(node["count"] for node in system_result),
            "children": system_result
        })

    return result
