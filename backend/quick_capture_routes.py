from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import time
import os
import hashlib
import requests

from database import get_db
from auth import get_current_user_id
from ai.vector_store import get_vector_store
import models

router = APIRouter()


class QuickCaptureRequest(BaseModel):
    source_type: str
    source_uri: str
    project_id: str | None = None
    title: str | None = None


def _to_vector(text: str, size: int = 128) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    raw = list(digest)
    vec = [(raw[i % len(raw)] / 255.0) for i in range(size)]
    return vec


def _guess_tags(text: str) -> list[str]:
    lowered = text.lower()
    tags = []
    if any(token in lowered for token in ["需求", "todo", "next", "步骤", "plan"]):
        tags.append("行动项")
    if any(token in lowered for token in ["deadline", "截止", "due"]):
        tags.append("时限")
    if any(token in lowered for token in ["meeting", "会议", "讨论"]):
        tags.append("会议")
    if any(token in lowered for token in ["api", "代码", "开发", "bug"]):
        tags.append("技术")
    if not tags:
        tags.append("通用")
    return tags[:4]


def _extract_text_from_source(source_type: str, source_uri: str) -> tuple[str, dict]:
    metadata: dict = {"source_type": source_type, "source_uri": source_uri}

    if source_uri.startswith("http://") or source_uri.startswith("https://"):
        try:
            response = requests.get(source_uri, timeout=8)
            response.raise_for_status()
            content = response.text[:5000]
            metadata["http_status"] = response.status_code
            metadata["content_length"] = len(response.text)
            return content, metadata
        except Exception as exc:
            raise HTTPException(
                status_code=400, detail=f"抓取链接失败: {str(exc)}"
            ) from exc

    if not os.path.exists(source_uri):
        raise HTTPException(status_code=400, detail="本地资源路径不存在")

    file_size = os.path.getsize(source_uri)
    metadata["file_size"] = file_size
    metadata["file_name"] = os.path.basename(source_uri)

    if source_type in ["pdf", "doc", "image", "video"]:
        base_name = os.path.basename(source_uri)
        normalized = f"已接收资源 {base_name}，文件大小 {file_size} bytes。"
        return normalized, metadata

    with open(source_uri, "r", encoding="utf-8", errors="ignore") as handle:
        content = handle.read(5000)
    return content, metadata


@router.post("/api/quick-capture")
async def quick_capture(
    payload: QuickCaptureRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    normalized_text, metadata = _extract_text_from_source(
        payload.source_type, payload.source_uri
    )

    summary = normalized_text[:240]
    tags = _guess_tags(normalized_text)
    capture_id = f"capture_{int(time.time() * 1000)}"

    now = datetime.utcnow().isoformat()
    record = models.QuickNoteCapture(
        id=capture_id,
        user_id=current_user_id,
        project_id=payload.project_id,
        source_type=payload.source_type,
        source_uri=payload.source_uri,
        title=(payload.title or metadata.get("file_name") or "快速采集").strip(),
        normalized_markdown=normalized_text,
        summary=summary,
        tags=tags,
        capture_metadata=metadata,
        created_at=now,
        updated_at=now,
    )
    db.add(record)
    db.commit()

    vector_store = get_vector_store()
    vector_store.add_item(
        item_type="notes",
        item_id=capture_id,
        vector=_to_vector(normalized_text),
        metadata={
            "title": record.title,
            "tags": tags,
            "project_id": payload.project_id,
        },
    )

    return {
        "success": True,
        "capture": {
            "id": capture_id,
            "title": record.title,
            "source_type": record.source_type,
            "summary": record.summary,
            "tags": record.tags,
            "project_id": record.project_id,
            "created_at": record.created_at,
        },
    }


@router.get("/api/quick-capture")
async def list_quick_captures(
    project_id: str | None = None,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    query = db.query(models.QuickNoteCapture).filter(
        models.QuickNoteCapture.user_id == current_user_id
    )
    if project_id:
        query = query.filter(models.QuickNoteCapture.project_id == project_id)

    records = query.order_by(models.QuickNoteCapture.created_at.desc()).limit(100).all()
    return {
        "captures": [
            {
                "id": item.id,
                "title": item.title,
                "source_type": item.source_type,
                "source_uri": item.source_uri,
                "summary": item.summary,
                "tags": item.tags,
                "project_id": item.project_id,
                "created_at": item.created_at,
            }
            for item in records
        ]
    }


@router.get("/api/quick-capture/search")
async def search_quick_capture(
    query: str,
    top_k: int = 10,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    vector_store = get_vector_store()
    results = vector_store.search_similar(
        _to_vector(query), item_type="notes", top_k=top_k
    )

    ids = [item["id"] for item in results]
    if not ids:
        return {"results": []}

    rows = (
        db.query(models.QuickNoteCapture)
        .filter(
            models.QuickNoteCapture.user_id == current_user_id,
            models.QuickNoteCapture.id.in_(ids),
        )
        .all()
    )
    row_map = {item.id: item for item in rows}

    return {
        "results": [
            {
                "id": item_id,
                "score": score["similarity"],
                "title": row_map[item_id].title,
                "summary": row_map[item_id].summary,
                "tags": row_map[item_id].tags,
                "source_type": row_map[item_id].source_type,
                "project_id": row_map[item_id].project_id,
            }
            for score in results
            for item_id in [score["id"]]
            if item_id in row_map
        ]
    }
