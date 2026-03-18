from __future__ import annotations

import datetime
import time
from typing import Any, Dict, List, Optional

import pydantic
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

import models
from ai.vector_store import get_vector_store
from ai_routes import _generate_provider_reply, _resolve_provider_and_model
from auth import get_current_user_id
from database import get_db
from quick_capture_routes import build_capture_vector, serialize_quick_capture


router = APIRouter()

MAX_DISCUSSION_HISTORY = 12
MAX_SELECTION_ENTRIES = 8
MAX_ENTRY_CONTEXT_CHARS = 4000
MAX_SELECTION_CONTEXT_CHARS = 6000


class KnowledgeHistoryItem(pydantic.BaseModel):
    role: str
    content: str

    @pydantic.field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in {"user", "assistant"}:
            raise ValueError("history role must be user or assistant")
        return normalized

    @pydantic.field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        normalized = str(value or "").strip()
        if not normalized:
            raise ValueError("history content cannot be empty")
        return normalized


class KnowledgeSelectionRequest(pydantic.BaseModel):
    content_kind: str = "collected"
    project_id: Optional[str] = None
    category: Optional[str] = None
    selected_entry_ids: List[str] = pydantic.Field(default_factory=list)

    @pydantic.field_validator("content_kind")
    @classmethod
    def validate_content_kind(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in {"collected", "generated"}:
            return "collected"
        return normalized

    @pydantic.field_validator("project_id", "category")
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @pydantic.field_validator("selected_entry_ids")
    @classmethod
    def normalize_selected_ids(cls, value: List[str]) -> List[str]:
        normalized: List[str] = []
        seen = set()
        for item in value:
            text = str(item or "").strip()
            if not text or text in seen:
                continue
            seen.add(text)
            normalized.append(text)
        return normalized


class KnowledgeDiscussRequest(pydantic.BaseModel):
    mode: str
    message: str
    history: List[KnowledgeHistoryItem] = pydantic.Field(default_factory=list)
    entry_id: Optional[str] = None
    selection: Optional[KnowledgeSelectionRequest] = None
    provider: Optional[str] = None

    @pydantic.field_validator("mode")
    @classmethod
    def validate_mode(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if normalized not in {"entry", "selection"}:
            raise ValueError("mode must be entry or selection")
        return normalized

    @pydantic.field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        normalized = str(value or "").strip()
        if not normalized:
            raise ValueError("message cannot be empty")
        return normalized

    @pydantic.model_validator(mode="after")
    def validate_context(self) -> "KnowledgeDiscussRequest":
        if self.mode == "entry" and not self.entry_id:
            raise ValueError("entry_id is required when mode is entry")
        if self.mode == "selection" and self.selection is None:
            raise ValueError("selection is required when mode is selection")
        return self


class KnowledgeGeneratedCreateRequest(pydantic.BaseModel):
    title: str
    content_markdown: str
    tags: List[str] = pydantic.Field(default_factory=list)
    project_id: Optional[str] = None
    category: Optional[str] = None
    source_capture_ids: List[str] = pydantic.Field(default_factory=list)
    source_filter_snapshot: Optional[Dict[str, Any]] = None
    discussion_metadata: Optional[Dict[str, Any]] = None

    @pydantic.field_validator("title", "content_markdown")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        normalized = str(value or "").strip()
        if not normalized:
            raise ValueError("title and content_markdown cannot be empty")
        return normalized

    @pydantic.field_validator("project_id", "category")
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @pydantic.field_validator("tags", "source_capture_ids")
    @classmethod
    def normalize_list(cls, value: List[str]) -> List[str]:
        normalized: List[str] = []
        seen = set()
        for item in value:
            text = str(item or "").strip()
            if not text or text in seen:
                continue
            seen.add(text)
            normalized.append(text)
        return normalized


class KnowledgeGeneratedAppendRequest(pydantic.BaseModel):
    content_markdown: str
    tags: List[str] = pydantic.Field(default_factory=list)
    source_capture_ids: List[str] = pydantic.Field(default_factory=list)
    source_filter_snapshot: Optional[Dict[str, Any]] = None
    discussion_metadata: Optional[Dict[str, Any]] = None

    @pydantic.field_validator("content_markdown")
    @classmethod
    def validate_content_markdown(cls, value: str) -> str:
        normalized = str(value or "").strip()
        if not normalized:
            raise ValueError("content_markdown cannot be empty")
        return normalized

    @pydantic.field_validator("tags", "source_capture_ids")
    @classmethod
    def normalize_list(cls, value: List[str]) -> List[str]:
        normalized: List[str] = []
        seen = set()
        for item in value:
            text = str(item or "").strip()
            if not text or text in seen:
                continue
            seen.add(text)
            normalized.append(text)
        return normalized


def _utcnow_iso() -> str:
    return datetime.datetime.utcnow().isoformat()


def _clip_text(value: str, limit: int) -> str:
    text = str(value or "").strip()
    if len(text) <= limit:
        return text
    return text[:limit]


def _normalize_summary(markdown: str) -> str:
    text = " ".join(str(markdown or "").split())
    return text[:240]


def _normalize_excerpt(value: str, limit: int = 160) -> str:
    return _clip_text(" ".join(str(value or "").split()), limit)


def _merge_unique_strings(*groups: List[str]) -> List[str]:
    merged: List[str] = []
    seen = set()
    for group in groups:
        for item in group:
            text = str(item or "").strip()
            if not text or text in seen:
                continue
            seen.add(text)
            merged.append(text)
    return merged


def _build_capture_context(entry: models.QuickNoteCapture) -> Dict[str, Any]:
    return {
        "id": entry.id,
        "title": entry.title,
        "content_kind": entry.content_kind or "collected",
        "project_id": entry.project_id,
        "category": entry.category,
        "tags": entry.tags or [],
        "summary": entry.summary,
        "content": _clip_text(entry.normalized_markdown or entry.summary or "", MAX_ENTRY_CONTEXT_CHARS),
    }


def _build_selection_context(entries: List[models.QuickNoteCapture]) -> List[Dict[str, Any]]:
    remaining = MAX_SELECTION_CONTEXT_CHARS
    context_entries: List[Dict[str, Any]] = []
    for entry in entries[:MAX_SELECTION_ENTRIES]:
        summary = _clip_text(entry.summary or entry.normalized_markdown or "", min(remaining, 500))
        if not summary:
            continue
        remaining -= len(summary)
        context_entries.append(
            {
                "id": entry.id,
                "title": entry.title,
                "content_kind": entry.content_kind or "collected",
                "project_id": entry.project_id,
                "category": entry.category,
                "tags": entry.tags or [],
                "summary": summary,
            }
        )
        if remaining <= 0:
            break
    return context_entries


async def _generate_knowledge_reply(
    *,
    raw_request: Request,
    current_user_id: str,
    provider: Optional[str],
    message: str,
    history: List[Dict[str, str]],
    context: Dict[str, Any],
) -> str:
    provider_name, model_override = _resolve_provider_and_model(provider)
    result = await _generate_provider_reply(
        provider=provider_name,
        user_message=message,
        history=history,
        context=context,
        model_override=model_override,
        raw_request=raw_request,
        current_user_id=current_user_id,
    )
    if isinstance(result, dict):
        return str(result.get("reply") or result.get("content") or "").strip()
    return str(result or "").strip()


def _index_knowledge_entry(entry: models.QuickNoteCapture) -> None:
    vector_store = get_vector_store()
    vector_store.add_item(
        item_type="notes",
        item_id=entry.id,
        vector=build_capture_vector(entry.normalized_markdown or entry.summary or entry.title),
        metadata={
            "title": entry.title,
            "tags": entry.tags or [],
            "project_id": entry.project_id,
            "content_kind": entry.content_kind or "collected",
            "category": entry.category,
        },
    )


def _build_draft(
    *,
    message: str,
    reply: str,
    citations: List[Dict[str, Any]],
    mode: str,
    entry: Optional[models.QuickNoteCapture] = None,
    selection: Optional[KnowledgeSelectionRequest] = None,
) -> Dict[str, Any]:
    merged_tags: List[str] = []
    seen = set()
    for citation in citations:
        for tag in citation.get("tags", []):
            text = str(tag or "").strip()
            if not text or text in seen:
                continue
            seen.add(text)
            merged_tags.append(text)
    if not merged_tags:
        merged_tags = ["总结"]

    project_id = entry.project_id if entry else selection.project_id if selection else None
    category = entry.category if entry else selection.category if selection else None
    title_base = entry.title if entry else _normalize_excerpt(message, 24) or "知识讨论"
    if mode == "selection":
        title_base = f"{title_base} - 汇总"

    return {
        "title": title_base,
        "content_markdown": reply,
        "tags": merged_tags[:6],
        "project_id": project_id,
        "category": category,
    }


@router.post("/api/knowledge/discuss")
async def discuss_knowledge(
    payload: KnowledgeDiscussRequest,
    raw_request: Request,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    history = [item.model_dump() for item in payload.history][-MAX_DISCUSSION_HISTORY:]

    if payload.mode == "entry":
        entry = (
            db.query(models.QuickNoteCapture)
            .filter(
                models.QuickNoteCapture.user_id == current_user_id,
                models.QuickNoteCapture.id == payload.entry_id,
            )
            .first()
        )
        if entry is None:
            raise HTTPException(status_code=404, detail="Knowledge entry not found")

        context = {
            "mode": "entry",
            "entry": _build_capture_context(entry),
        }
        reply = await _generate_knowledge_reply(
            raw_request=raw_request,
            current_user_id=current_user_id,
            provider=payload.provider,
            message=payload.message,
            history=history,
            context=context,
        )
        if not reply:
            raise HTTPException(status_code=502, detail="AI 未返回可展示内容")

        citation = {
            "id": entry.id,
            "title": entry.title,
            "content_kind": entry.content_kind or "collected",
            "project_id": entry.project_id,
            "category": entry.category,
            "tags": entry.tags or [],
        }
        return {
            "reply": reply,
            "context_mode": "entry",
            "citations": [citation],
            "draft": _build_draft(
                message=payload.message,
                reply=reply,
                citations=[citation],
                mode="entry",
                entry=entry,
            ),
        }

    selection = payload.selection
    query = db.query(models.QuickNoteCapture).filter(
        models.QuickNoteCapture.user_id == current_user_id
    )
    query = query.filter(models.QuickNoteCapture.content_kind == selection.content_kind)
    if selection.project_id:
        query = query.filter(models.QuickNoteCapture.project_id == selection.project_id)
    if selection.category:
        query = query.filter(models.QuickNoteCapture.category == selection.category)

    entries = query.order_by(
        models.QuickNoteCapture.updated_at.desc(),
        models.QuickNoteCapture.created_at.desc(),
    ).all()
    if selection.selected_entry_ids:
        selected_set = set(selection.selected_entry_ids)
        entries = [entry for entry in entries if entry.id in selected_set]
    entries = entries[:MAX_SELECTION_ENTRIES]

    context_entries = _build_selection_context(entries)
    reply = await _generate_knowledge_reply(
        raw_request=raw_request,
        current_user_id=current_user_id,
        provider=payload.provider,
        message=payload.message,
        history=history,
        context={
            "mode": "selection",
            "selection": {
                "content_kind": selection.content_kind,
                "project_id": selection.project_id,
                "category": selection.category,
                "selected_entry_ids": selection.selected_entry_ids,
            },
            "entries": context_entries,
        },
    )
    if not reply:
        raise HTTPException(status_code=502, detail="AI 未返回可展示内容")

    citations = [
        {
            "id": entry.id,
            "title": entry.title,
            "content_kind": entry.content_kind or "collected",
            "project_id": entry.project_id,
            "category": entry.category,
            "tags": entry.tags or [],
        }
        for entry in entries[: len(context_entries)]
    ]

    return {
        "reply": reply,
        "context_mode": "selection",
        "citations": citations,
        "draft": _build_draft(
            message=payload.message,
            reply=reply,
            citations=citations,
            mode="selection",
            selection=selection,
        ),
    }


@router.post("/api/knowledge/generated")
async def create_generated_knowledge(
    payload: KnowledgeGeneratedCreateRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    now = _utcnow_iso()
    entry = models.QuickNoteCapture(
        id=f"capture_{int(time.time() * 1000)}",
        user_id=current_user_id,
        project_id=payload.project_id,
        source_type="generated",
        source_uri="",
        title=payload.title,
        normalized_markdown=payload.content_markdown,
        summary=_normalize_summary(payload.content_markdown),
        tags=payload.tags,
        capture_metadata={"generated": True},
        content_kind="generated",
        category=payload.category,
        source_capture_ids=payload.source_capture_ids,
        source_filter_snapshot=payload.source_filter_snapshot,
        discussion_metadata=payload.discussion_metadata,
        created_at=now,
        updated_at=now,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    _index_knowledge_entry(entry)

    return {"entry": serialize_quick_capture(entry, include_detail=True)}


@router.post("/api/knowledge/generated/{entry_id}/append")
async def append_generated_knowledge(
    entry_id: str,
    payload: KnowledgeGeneratedAppendRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    entry = (
        db.query(models.QuickNoteCapture)
        .filter(
            models.QuickNoteCapture.user_id == current_user_id,
            models.QuickNoteCapture.id == entry_id,
        )
        .first()
    )
    if entry is None:
        raise HTTPException(status_code=404, detail="Knowledge entry not found")
    if (entry.content_kind or "collected") != "generated":
        raise HTTPException(status_code=400, detail="Only generated entries can be appended")

    entry.normalized_markdown = (
        f"{entry.normalized_markdown.rstrip()}\n\n{payload.content_markdown.strip()}"
        if entry.normalized_markdown.strip()
        else payload.content_markdown.strip()
    )
    entry.summary = _normalize_summary(entry.normalized_markdown)
    entry.tags = _merge_unique_strings(entry.tags or [], payload.tags)
    entry.source_capture_ids = _merge_unique_strings(
        entry.source_capture_ids or [],
        payload.source_capture_ids,
    )
    if payload.source_filter_snapshot is not None:
        entry.source_filter_snapshot = payload.source_filter_snapshot
    if payload.discussion_metadata is not None:
        entry.discussion_metadata = payload.discussion_metadata
    entry.updated_at = _utcnow_iso()

    db.commit()
    db.refresh(entry)
    _index_knowledge_entry(entry)

    return {"entry": serialize_quick_capture(entry, include_detail=True)}
