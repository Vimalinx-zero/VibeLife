# backend/collection_routes.py
# 自定义合集 API：手动组织卡片集合

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
import pydantic
import time

from database import get_db
import models

router = APIRouter()

# ========================
# Schemas
# ========================

class CollectionCreate(pydantic.BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "blue"  # blue, green, red, yellow, purple

class CollectionUpdate(pydantic.BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class AddCardsRequest(pydantic.BaseModel):
    card_ids: List[str]

# ========================
# Collection CRUD API
# ========================

@router.get("/api/anki/collections")
async def get_collections(db: Session = Depends(get_db)):
    """获取所有合集"""
    collections = db.query(models.Collection).order_by(
        models.Collection.created_at.desc()
    ).all()

    # 为每个合集统计卡片数量
    result = []
    for collection in collections:
        card_count = db.query(models.CollectionCard).filter(
            models.CollectionCard.collection_id == collection.id
        ).count()

        result.append({
            "id": collection.id,
            "name": collection.name,
            "description": collection.description,
            "color": collection.color,
            "card_count": card_count,
            "created_at": collection.created_at,
            "updated_at": collection.updated_at
        })

    return result

# 注意：更具体的路由必须在通用路由之前
@router.get("/api/anki/collections/orphan-cards")
async def get_orphan_cards(db: Session = Depends(get_db)):
    """获取未归类卡片（不属于任何合集的卡片）"""
    # 获取所有在合集中的卡片ID
    cards_in_collections = db.query(models.CollectionCard.card_id).distinct().all()
    cards_in_collections_ids = {cc.card_id for cc in cards_in_collections}

    # 获取所有卡片
    all_cards = db.query(models.FlashCard).order_by(
        models.FlashCard.created_at.desc()
    ).all()

    # 过滤出未归类的卡片
    orphan_cards = [
        {
            "id": card.id,
            "front": card.front,
            "back": card.back,
            "tags": card.tags,
            "deck": card.deck,
            "ease_factor": card.ease_factor,
            "interval": card.interval,
            "repetitions": card.repetitions,
            "next_review_date": card.next_review_date,
            "created_at": card.created_at
        }
        for card in all_cards
        if card.id not in cards_in_collections_ids
    ]

    return {
        "orphan_cards": orphan_cards,
        "total": len(orphan_cards)
    }

@router.get("/api/anki/collections/{collection_id}")
async def get_collection(collection_id: str, db: Session = Depends(get_db)):
    """获取单个合集详情"""
    collection = db.query(models.Collection).filter(
        models.Collection.id == collection_id
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    card_count = db.query(models.CollectionCard).filter(
        models.CollectionCard.collection_id == collection_id
    ).count()

    return {
        "id": collection.id,
        "name": collection.name,
        "description": collection.description,
        "color": collection.color,
        "card_count": card_count,
        "created_at": collection.created_at,
        "updated_at": collection.updated_at
    }

@router.post("/api/anki/collections")
async def create_collection(collection: CollectionCreate, db: Session = Depends(get_db)):
    """创建新合集"""
    import time
    collection_id = f"collection_{int(time.time() * 1000)}"

    # 检查名称是否重复
    existing = db.query(models.Collection).filter(
        models.Collection.name == collection.name,
        models.Collection.user_id == "default_user"
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Collection name already exists")

    new_collection = models.Collection(
        id=collection_id,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        user_id="default_user"
    )

    db.add(new_collection)
    db.commit()
    db.refresh(new_collection)

    return {
        "id": new_collection.id,
        "name": new_collection.name,
        "description": new_collection.description,
        "color": new_collection.color,
        "card_count": 0,
        "created_at": new_collection.created_at,
        "updated_at": new_collection.updated_at
    }

@router.put("/api/anki/collections/{collection_id}")
async def update_collection(
    collection_id: str,
    collection_update: CollectionUpdate,
    db: Session = Depends(get_db)
):
    """更新合集信息"""
    collection = db.query(models.Collection).filter(
        models.Collection.id == collection_id
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # 如果修改名称，检查是否重复
    if collection_update.name and collection_update.name != collection.name:
        existing = db.query(models.Collection).filter(
            models.Collection.name == collection_update.name,
            models.Collection.user_id == "default_user",
            models.Collection.id != collection_id
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail="Collection name already exists")

    # Update fields
    if collection_update.name is not None:
        collection.name = collection_update.name
    if collection_update.description is not None:
        collection.description = collection_update.description
    if collection_update.color is not None:
        collection.color = collection_update.color

    collection.updated_at = time.strftime('%Y-%m-%dT%H:%M:%S.%f')

    db.commit()
    db.refresh(collection)

    card_count = db.query(models.CollectionCard).filter(
        models.CollectionCard.collection_id == collection_id
    ).count()

    return {
        "id": collection.id,
        "name": collection.name,
        "description": collection.description,
        "color": collection.color,
        "card_count": card_count,
        "created_at": collection.created_at,
        "updated_at": collection.updated_at
    }

@router.delete("/api/anki/collections/{collection_id}")
async def delete_collection(collection_id: str, db: Session = Depends(get_db)):
    """删除合集及其所有关联"""
    collection = db.query(models.Collection).filter(
        models.Collection.id == collection_id
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # 删除合集下的所有卡片关联
    db.query(models.CollectionCard).filter(
        models.CollectionCard.collection_id == collection_id
    ).delete()

    # 删除合集
    db.delete(collection)
    db.commit()

    return {"success": True, "message": "Collection deleted"}

# ========================
# Collection Cards API
# ========================

@router.get("/api/anki/collections/{collection_id}/cards")
async def get_collection_cards(
    collection_id: str,
    db: Session = Depends(get_db)
):
    """获取合集中的所有卡片"""
    # 检查合集是否存在
    collection = db.query(models.Collection).filter(
        models.Collection.id == collection_id
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # 获取合集中的卡片关联（按 order 排序）
    collection_cards = db.query(models.CollectionCard).filter(
        models.CollectionCard.collection_id == collection_id
    ).order_by(models.CollectionCard.order).all()

    # 获取卡片详情
    card_ids = [cc.card_id for cc in collection_cards]
    cards = db.query(models.FlashCard).filter(
        models.FlashCard.id.in_(card_ids)
    ).all()

    # 创建 id 到 card 的映射
    card_map = {card.id: card for card in cards}

    # 按原始顺序返回
    result = []
    for cc in collection_cards:
        card = card_map.get(cc.card_id)
        if card:
            result.append({
                "id": card.id,
                "front": card.front,
                "back": card.back,
                "tags": card.tags,
                "deck": card.deck,
                "ease_factor": card.ease_factor,
                "interval": card.interval,
                "repetitions": card.repetitions,
                "next_review_date": card.next_review_date,
                "order": cc.order,
                "added_at": cc.added_at
            })

    return result

@router.post("/api/anki/collections/{collection_id}/cards")
async def add_cards_to_collection(
    collection_id: str,
    request: AddCardsRequest,
    db: Session = Depends(get_db)
):
    """批量添加卡片到合集"""
    # 检查合集是否存在
    collection = db.query(models.Collection).filter(
        models.Collection.id == collection_id
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # 获取当前最大 order
    max_order = db.query(func.max(models.CollectionCard.order)).filter(
        models.CollectionCard.collection_id == collection_id
    ).scalar() or 0

    # 检查哪些卡片已经存在
    existing_cards = db.query(models.CollectionCard).filter(
        models.CollectionCard.collection_id == collection_id,
        models.CollectionCard.card_id.in_(request.card_ids)
    ).all()

    existing_card_ids = {cc.card_id for cc in existing_cards}
    new_card_ids = [cid for cid in request.card_ids if cid not in existing_card_ids]

    # 批量添加新卡片
    added_count = 0
    for card_id in new_card_ids:
        max_order += 1
        import time
        cc = models.CollectionCard(
            id=f"cc_{int(time.time() * 1000)}_{added_count}",
            collection_id=collection_id,
            card_id=card_id,
            order=max_order
        )
        db.add(cc)
        added_count += 1

    db.commit()

    return {
        "success": True,
        "added_count": added_count,
        "skipped_count": len(existing_card_ids),
        "message": f"Added {added_count} cards to collection"
    }

@router.delete("/api/anki/collections/{collection_id}/cards/{card_id}")
async def remove_card_from_collection(
    collection_id: str,
    card_id: str,
    db: Session = Depends(get_db)
):
    """从合集中移除卡片"""
    # 检查关联是否存在
    collection_card = db.query(models.CollectionCard).filter(
        models.CollectionCard.collection_id == collection_id,
        models.CollectionCard.card_id == card_id
    ).first()

    if not collection_card:
        raise HTTPException(status_code=404, detail="Card not in collection")

    db.delete(collection_card)
    db.commit()

    return {"success": True, "message": "Card removed from collection"}

@router.get("/api/anki/collections/stats")
async def get_collections_stats(db: Session = Depends(get_db)):
    """获取合集统计信息"""
    # 总合集数
    total_collections = db.query(models.Collection).count()

    # 总卡片关联数
    total_cards = db.query(models.CollectionCard).count()

    # 每个合集的卡片数
    collection_stats = db.query(
        models.CollectionCard.collection_id,
        func.count(models.CollectionCard.card_id).label('card_count')
    ).group_by(models.CollectionCard.collection_id).all()

    stats = {
        "total_collections": total_collections,
        "total_cards": total_cards,
        "collections": []
    }

    for collection_id, card_count in collection_stats:
        collection = db.query(models.Collection).filter(
            models.Collection.id == collection_id
        ).first()

        if collection:
            stats["collections"].append({
                "id": collection.id,
                "name": collection.name,
                "color": collection.color,
                "card_count": card_count
            })

    return stats
