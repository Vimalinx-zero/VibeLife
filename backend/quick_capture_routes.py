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


def _summarize_text(value: str, limit: int = 240) -> str:
    return " ".join(str(value or "").split())[:limit]


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


def serialize_file_capture(
    item: models.FileItem,
    *,
    include_detail: bool = False,
) -> dict:
    normalized_markdown = str(item.content or "").strip()
    payload = {
        "id": item.id,
        "title": item.name,
        "source_type": "note",
        "source_uri": item.id,
        "summary": _summarize_text(normalized_markdown or item.name),
        "tags": item.tags or [],
        "project_id": None,
        "created_at": item.date or "",
        "updated_at": item.date or "",
        "content_kind": "collected",
        "category": None,
        "source_capture_ids": [],
        "source_filter_snapshot": None,
        "discussion_metadata": None,
    }
    if include_detail:
        payload["normalized_markdown"] = normalized_markdown
    return payload


def get_serialized_knowledge_entry(
    db: Session,
    *,
    current_user_id: str,
    entry_id: str,
    include_detail: bool = False,
) -> dict | None:
    capture = (
        db.query(models.QuickNoteCapture)
        .filter(
            models.QuickNoteCapture.user_id == current_user_id,
            models.QuickNoteCapture.id == entry_id,
        )
        .first()
    )
    if capture is not None:
        return serialize_quick_capture(capture, include_detail=include_detail)

    file_item = (
        db.query(models.FileItem)
        .filter(
            models.FileItem.user_id == current_user_id,
            models.FileItem.type == "file",
            models.FileItem.id == entry_id,
        )
        .first()
    )
    if file_item is not None:
        return serialize_file_capture(file_item, include_detail=include_detail)

    return None


def list_serialized_collected_entries(
    db: Session,
    *,
    current_user_id: str,
    project_id: str | None = None,
    category: str | None = None,
    include_detail: bool = False,
    limit: int = 100,
) -> list[dict]:
    capture_records = (
        db.query(models.QuickNoteCapture)
        .filter(
            models.QuickNoteCapture.user_id == current_user_id,
            models.QuickNoteCapture.content_kind == "collected",
        )
    )
    if project_id:
        capture_records = capture_records.filter(models.QuickNoteCapture.project_id == project_id)
    if category:
        capture_records = capture_records.filter(models.QuickNoteCapture.category == category)

    entries = [
        serialize_quick_capture(item, include_detail=include_detail)
        for item in capture_records.order_by(
            models.QuickNoteCapture.updated_at.desc(),
            models.QuickNoteCapture.created_at.desc(),
        )
        .limit(limit)
        .all()
    ]

    if not project_id and not category:
        file_records = (
            db.query(models.FileItem)
            .filter(
                models.FileItem.user_id == current_user_id,
                models.FileItem.type == "file",
            )
            .order_by(models.FileItem.date.desc(), models.FileItem.name.asc())
            .limit(limit)
            .all()
        )
        entries.extend(
            serialize_file_capture(item, include_detail=include_detail)
            for item in file_records
        )

    entries.sort(
        key=lambda item: item.get("updated_at") or item.get("created_at") or "",
        reverse=True,
    )
    return entries[:limit]


def search_serialized_file_entries(
    db: Session,
    *,
    current_user_id: str,
    query: str,
    top_k: int = 10,
    project_id: str | None = None,
    category: str | None = None,
) -> list[dict]:
    if project_id or category:
        return []

    normalized_query = str(query or "").strip().lower()
    if not normalized_query:
        return []

    results: list[dict] = []
    file_records = (
        db.query(models.FileItem)
        .filter(
            models.FileItem.user_id == current_user_id,
            models.FileItem.type == "file",
        )
        .all()
    )

    for item in file_records:
        title = str(item.name or "").lower()
        content = str(item.content or "").lower()
        tags_text = " ".join(str(tag or "").lower() for tag in (item.tags or []))

        score = 0.0
        if normalized_query in title:
            score = max(score, 0.98)
        if normalized_query in content:
            score = max(score, 0.94)
        if normalized_query in tags_text:
            score = max(score, 0.88)
        if score == 0.0:
            tokens = [token for token in normalized_query.split() if token]
            if tokens:
                matches = sum(
                    1
                    for token in tokens
                    if token in title or token in content or token in tags_text
                )
                if matches:
                    score = 0.6 * (matches / len(tokens))

        if score == 0.0:
            continue

        payload = serialize_file_capture(item, include_detail=False)
        results.append(
            {
                "id": payload["id"],
                "score": score,
                "title": payload["title"],
                "summary": payload["summary"],
                "tags": payload["tags"],
                "source_type": payload["source_type"],
                "project_id": payload["project_id"],
                "content_kind": payload["content_kind"],
                "category": payload["category"],
            }
        )

    results.sort(key=lambda item: item["score"], reverse=True)
    return results[:top_k]


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
    if content_kind == "collected":
        captures = list_serialized_collected_entries(
            db,
            current_user_id=current_user_id,
            project_id=project_id,
            category=category,
            include_detail=True,
        )
    else:
        capture_query = db.query(models.QuickNoteCapture).filter(
            models.QuickNoteCapture.user_id == current_user_id
        )
        if project_id:
            capture_query = capture_query.filter(models.QuickNoteCapture.project_id == project_id)
        if content_kind:
            capture_query = capture_query.filter(models.QuickNoteCapture.content_kind == content_kind)
        if category:
            capture_query = capture_query.filter(models.QuickNoteCapture.category == category)

        capture_records = capture_query.order_by(
            models.QuickNoteCapture.updated_at.desc(),
            models.QuickNoteCapture.created_at.desc(),
        ).limit(100).all()
        captures = [serialize_quick_capture(item, include_detail=True) for item in capture_records]

        if content_kind in {None, ""} and not project_id and not category:
            captures.extend(
                list_serialized_collected_entries(
                    db,
                    current_user_id=current_user_id,
                    include_detail=True,
                )
            )

        deduped: list[dict] = []
        seen_ids: set[str] = set()
        for item in captures:
            if item["id"] in seen_ids:
                continue
            seen_ids.add(item["id"])
            deduped.append(item)
        deduped.sort(
            key=lambda item: item.get("updated_at") or item.get("created_at") or "",
            reverse=True,
        )
        captures = deduped[:100]
    return {
        "captures": captures[:100]
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
    vector_results = vector_store.search_similar(
        build_capture_vector(query), item_type="notes", top_k=top_k
    )

    ids = [item["id"] for item in vector_results]
    rows = []
    if ids:
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

    merged_results = [
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
        for score in vector_results
        for item_id in [score["id"]]
        if item_id in row_map
    ]

    if content_kind in {None, "", "collected"}:
        merged_results.extend(
            search_serialized_file_entries(
                db,
                current_user_id=current_user_id,
                query=query,
                top_k=top_k,
                project_id=project_id,
                category=category,
            )
        )

    deduped_results: list[dict] = []
    seen_ids: set[str] = set()
    for item in sorted(merged_results, key=lambda result: result["score"], reverse=True):
        if item["id"] in seen_ids:
            continue
        seen_ids.add(item["id"])
        deduped_results.append(item)

    return {"results": deduped_results[:top_k]}
