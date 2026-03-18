from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from datetime import datetime
import time
import os
import hashlib
import requests
from typing import Any, Optional

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
    category: str | None = None
    tags: list[str] = Field(default_factory=list)

    @field_validator("source_type")
    @classmethod
    def validate_source_type(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if not normalized:
            raise ValueError("source_type 不能为空")
        return normalized

    @field_validator("source_uri")
    @classmethod
    def validate_source_uri(cls, value: str) -> str:
        normalized = str(value or "").strip()
        if not normalized:
            raise ValueError("source_uri 不能为空")
        return normalized

    @field_validator("project_id", "title", "category")
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        seen = set()
        for item in value:
            text = str(item or "").strip()
            if not text or text in seen:
                continue
            seen.add(text)
            normalized.append(text)
        return normalized


def build_capture_vector(text: str, size: int = 128) -> list[float]:
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


def _normalize_tags(tags: list[str] | None) -> list[str]:
    normalized: list[str] = []
    seen = set()
    for item in tags or []:
        text = str(item or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        normalized.append(text)
    return normalized


def _extract_text_from_source(source_type: str, source_uri: str) -> tuple[str, dict]:
    metadata: dict = {"source_type": source_type, "source_uri": source_uri}

    if source_type == "text":
        return source_uri, metadata

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


def _extract_text_from_upload(source_type: str, upload_file: UploadFile) -> tuple[str, dict]:
    content = upload_file.file.read()
    metadata: dict[str, Any] = {
        "source_type": source_type,
        "file_name": upload_file.filename or "",
        "content_type": upload_file.content_type or "",
        "file_size": len(content),
    }

    if source_type in {"txt", "md", "text"}:
        return content.decode("utf-8", errors="ignore")[:5000], metadata

    base_name = upload_file.filename or "uploaded-file"
    return f"已接收资源 {base_name}，文件大小 {len(content)} bytes。", metadata


def serialize_quick_capture(
    item: models.QuickNoteCapture,
    *,
    include_detail: bool = False,
) -> dict:
    payload = {
        "id": item.id,
        "title": item.title,
        "source_type": item.source_type,
        "source_uri": item.source_uri,
        "summary": item.summary,
        "tags": item.tags or [],
        "project_id": item.project_id,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "content_kind": item.content_kind or "collected",
        "category": item.category,
        "source_capture_ids": item.source_capture_ids or [],
        "source_filter_snapshot": item.source_filter_snapshot,
        "discussion_metadata": item.discussion_metadata,
    }
    if include_detail:
        payload["normalized_markdown"] = item.normalized_markdown
    return payload


def _index_quick_capture(record: models.QuickNoteCapture) -> None:
    vector_store = get_vector_store()
    vector_store.add_item(
        item_type="notes",
        item_id=record.id,
        vector=build_capture_vector(record.normalized_markdown or record.summary or record.title),
        metadata={
            "title": record.title,
            "tags": record.tags or [],
            "project_id": record.project_id,
            "content_kind": record.content_kind or "collected",
            "category": record.category,
        },
    )


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
    tags = _normalize_tags(payload.tags) or _guess_tags(normalized_text)
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
        content_kind="collected",
        category=payload.category,
        source_capture_ids=[],
        source_filter_snapshot=None,
        discussion_metadata=None,
        created_at=now,
        updated_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    _index_quick_capture(record)

    return {
        "success": True,
        "capture": serialize_quick_capture(record, include_detail=True),
    }


@router.post("/api/quick-capture/upload")
async def quick_capture_upload(
    file: UploadFile = File(...),
    source_type: str = Form("txt"),
    title: str | None = Form(None),
    project_id: str | None = Form(None),
    category: str | None = Form(None),
    tags: str | None = Form(None),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    normalized_text, metadata = _extract_text_from_upload(source_type, file)
    normalized_tags = _normalize_tags((tags or "").split(","))
    capture_id = f"capture_{int(time.time() * 1000)}"
    now = datetime.utcnow().isoformat()
    record = models.QuickNoteCapture(
        id=capture_id,
        user_id=current_user_id,
        project_id=(project_id or "").strip() or None,
        source_type=source_type,
        source_uri=metadata.get("file_name", ""),
        title=(title or metadata.get("file_name") or "快速采集").strip(),
        normalized_markdown=normalized_text,
        summary=normalized_text[:240],
        tags=normalized_tags or _guess_tags(normalized_text),
        capture_metadata=metadata,
        content_kind="collected",
        category=(category or "").strip() or None,
        source_capture_ids=[],
        source_filter_snapshot=None,
        discussion_metadata=None,
        created_at=now,
        updated_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    _index_quick_capture(record)
    return {"success": True, "capture": serialize_quick_capture(record, include_detail=True)}


@router.get("/api/quick-capture")
async def list_quick_captures(
    project_id: str | None = None,
    content_kind: str | None = None,
    category: str | None = None,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    query = db.query(models.QuickNoteCapture).filter(
        models.QuickNoteCapture.user_id == current_user_id
    )
    if project_id:
        query = query.filter(models.QuickNoteCapture.project_id == project_id)
    if content_kind:
        query = query.filter(models.QuickNoteCapture.content_kind == content_kind)
    if category:
        query = query.filter(models.QuickNoteCapture.category == category)

    records = query.order_by(
        models.QuickNoteCapture.updated_at.desc(),
        models.QuickNoteCapture.created_at.desc(),
    ).limit(100).all()
    return {
        "captures": [serialize_quick_capture(item, include_detail=True) for item in records]
    }


@router.get("/api/quick-capture/search")
async def search_quick_capture(
    query: str,
    top_k: int = 10,
    content_kind: str | None = None,
    project_id: str | None = None,
    category: str | None = None,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    vector_store = get_vector_store()
    results = vector_store.search_similar(
        build_capture_vector(query), item_type="notes", top_k=top_k
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
    if content_kind:
        rows = [item for item in rows if (item.content_kind or "collected") == content_kind]
    if project_id:
        rows = [item for item in rows if item.project_id == project_id]
    if category:
        rows = [item for item in rows if item.category == category]
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
                "content_kind": row_map[item_id].content_kind or "collected",
                "category": row_map[item_id].category,
            }
            for score in results
            for item_id in [score["id"]]
            if item_id in row_map
        ]
    }
