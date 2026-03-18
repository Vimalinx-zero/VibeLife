import datetime as dt
import json
import threading
from contextlib import contextmanager
from typing import Any, Dict, Iterable, List, Optional
from uuid import uuid4

from sqlalchemy.orm import Session

import models
import openclaw_bridge


DEFAULT_ESTIMATED_MINUTES = 20
DEFAULT_RECOMMENDED_PLAN_ITEMS = 3
MAX_CONTEXT_TODOS = 12
_refresh_locks_guard = threading.Lock()
_refresh_locks: dict[str, threading.Lock] = {}


class CoachPlanConflictError(RuntimeError):
    """Raised when the same user triggers concurrent plan refreshes."""


class CoachPlanValidationError(ValueError):
    """Raised when coach request or response data is invalid."""


def validate_date_key(value: str) -> str:
    try:
        return dt.date.fromisoformat(str(value).strip()).isoformat()
    except ValueError as exc:
        raise CoachPlanValidationError("date_key must be in YYYY-MM-DD format") from exc


def _day_bounds(date_key: str) -> tuple[str, str]:
    day = dt.date.fromisoformat(date_key)
    start = dt.datetime.combine(day, dt.time.min)
    end = start + dt.timedelta(days=1)
    return start.isoformat(), end.isoformat()


def _recent_7d_bounds(date_key: str) -> tuple[str, str]:
    day = dt.date.fromisoformat(date_key)
    start = dt.datetime.combine(day - dt.timedelta(days=6), dt.time.min)
    end = dt.datetime.combine(day + dt.timedelta(days=1), dt.time.min)
    return start.isoformat(), end.isoformat()


def _coerce_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def normalize_max_items(value: Optional[int]) -> int:
    if value is None:
        return DEFAULT_RECOMMENDED_PLAN_ITEMS
    return max(1, min(_coerce_int(value, DEFAULT_RECOMMENDED_PLAN_ITEMS), 8))


def _parse_json_object(raw_text: str) -> Dict[str, Any]:
    payload = str(raw_text or "").strip()
    if not payload:
        raise CoachPlanValidationError("OpenClaw 未返回内容")

    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        parsed = None

    if parsed is None:
        lines = payload.splitlines()
        for index, line in enumerate(lines):
            candidate = "\n".join(lines[index:]).strip()
            if not candidate.startswith("{"):
                continue
            try:
                parsed = json.loads(candidate)
                break
            except json.JSONDecodeError:
                continue

    if not isinstance(parsed, dict):
        raise CoachPlanValidationError("OpenClaw 返回的今日计划不是合法 JSON 对象")

    return parsed


def _normalize_plan_todos(
    raw_todos: Any,
    *,
    date_key: str,
    max_items: int,
) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    seen_texts: set[str] = set()

    if not isinstance(raw_todos, list):
        return normalized

    for item in raw_todos:
        if not isinstance(item, dict):
            continue

        text_value = str(item.get("text") or item.get("title") or "").strip()
        if not text_value or text_value in seen_texts:
            continue

        seen_texts.add(text_value)
        normalized.append(
            {
                "text": text_value,
                "priority": max(0, min(_coerce_int(item.get("priority"), 0), 3)),
                "subject": str(item.get("subject") or "general").strip() or "general",
                "due_date": str(item.get("due_date") or date_key).strip() or date_key,
            }
        )
        if len(normalized) >= max_items:
            break

    return normalized


def _serialize_plan_todo(todo: models.TodoItem) -> Dict[str, Any]:
    return {
        "id": todo.id,
        "text": todo.text,
        "priority": todo.priority,
        "subject": todo.subject,
        "due_date": todo.due_date,
        "source": todo.source,
        "plan_batch_id": todo.plan_batch_id,
        "plan_date": todo.plan_date,
        "created_at": todo.created_at,
    }


def _todo_to_suggestion(todo: models.TodoItem) -> Dict[str, Any]:
    return {
        "id": todo.id,
        "title": todo.text,
        "reason": "来自今日计划",
        "target": "/workbench",
        "estimated_minutes": DEFAULT_ESTIMATED_MINUTES,
        "subject": todo.subject or "general",
        "todo_text": todo.text,
    }


def _active_batch_id(db: Session, current_user_id: str, date_key: str) -> Optional[str]:
    latest_todo = (
        db.query(models.TodoItem)
        .filter(
            models.TodoItem.user_id == current_user_id,
            models.TodoItem.source == "ai_daily",
            models.TodoItem.plan_date == date_key,
            models.TodoItem.plan_batch_id.isnot(None),
        )
        .order_by(models.TodoItem.created_at.desc(), models.TodoItem.id.desc())
        .first()
    )
    if latest_todo is None:
        return None
    return latest_todo.plan_batch_id


def _load_active_batch_todos(
    db: Session,
    current_user_id: str,
    date_key: str,
) -> List[models.TodoItem]:
    batch_id = _active_batch_id(db, current_user_id, date_key)
    if not batch_id:
        return []

    return (
        db.query(models.TodoItem)
        .filter(
            models.TodoItem.user_id == current_user_id,
            models.TodoItem.source == "ai_daily",
            models.TodoItem.plan_date == date_key,
            models.TodoItem.plan_batch_id == batch_id,
            models.TodoItem.completed == False,
        )
        .order_by(models.TodoItem.created_at.asc(), models.TodoItem.id.asc())
        .all()
    )


def _load_context_todos(
    db: Session,
    current_user_id: str,
    *,
    source: str,
) -> List[models.TodoItem]:
    return (
        db.query(models.TodoItem)
        .filter(
            models.TodoItem.user_id == current_user_id,
            models.TodoItem.source == source,
            models.TodoItem.completed == False,
        )
        .order_by(models.TodoItem.priority.desc(), models.TodoItem.created_at.asc())
        .limit(MAX_CONTEXT_TODOS)
        .all()
    )


def _context_summary(todos: Iterable[models.TodoItem]) -> List[Dict[str, Any]]:
    return [
        {
            "id": todo.id,
            "text": todo.text,
            "priority": todo.priority,
            "subject": todo.subject,
            "due_date": todo.due_date,
        }
        for todo in todos
        if isinstance(todo.text, str) and todo.text.strip()
    ]


def _build_snapshot(db: Session, current_user_id: str, date_key: str) -> Dict[str, Any]:
    today_start, today_end = _day_bounds(date_key)
    recent_start, recent_end = _recent_7d_bounds(date_key)

    pending_todos = (
        db.query(models.TodoItem)
        .filter(
            models.TodoItem.user_id == current_user_id,
            models.TodoItem.completed == False,
        )
        .count()
    )
    today_focus_sessions = (
        db.query(models.FocusSession)
        .filter(
            models.FocusSession.user_id == current_user_id,
            models.FocusSession.created_at >= today_start,
            models.FocusSession.created_at < today_end,
        )
        .all()
    )
    today_focus_minutes = sum(session.duration_minutes for session in today_focus_sessions)

    recent_todos = (
        db.query(models.TodoItem)
        .filter(
            models.TodoItem.user_id == current_user_id,
            models.TodoItem.created_at >= recent_start,
            models.TodoItem.created_at < recent_end,
        )
        .all()
    )
    recent_completed = sum(1 for todo in recent_todos if todo.completed)
    recent_completion_rate = (
        recent_completed / len(recent_todos) if recent_todos else 0
    )

    recent_focus_sessions = (
        db.query(models.FocusSession)
        .filter(
            models.FocusSession.user_id == current_user_id,
            models.FocusSession.created_at >= recent_start,
            models.FocusSession.created_at < recent_end,
        )
        .all()
    )
    recent_focus_minutes = sum(session.duration_minutes for session in recent_focus_sessions)
    recent_avg_focus_minutes = round(recent_focus_minutes / 7) if recent_focus_sessions else 0

    return {
        "pending_todos": pending_todos,
        "today_focus_minutes": today_focus_minutes,
        "recent_7d_completion_rate": recent_completion_rate,
        "recent_7d_avg_focus_minutes": recent_avg_focus_minutes,
    }


def _build_adaptive(snapshot: Dict[str, Any], suggestion_count: int) -> Dict[str, Any]:
    completion_rate = float(snapshot["recent_7d_completion_rate"])
    avg_daily_focus_minutes = int(snapshot["recent_7d_avg_focus_minutes"])
    pending_todos = int(snapshot["pending_todos"])

    if completion_rate >= 0.7 and avg_daily_focus_minutes >= 90:
        level = "challenge"
        label = "乘势推进"
        focus = "先啃高价值难项，再收尾杂项"
    elif completion_rate <= 0.35 and pending_todos >= 5:
        level = "build"
        label = "轻量起步"
        focus = "先做最小闭环，避免堆积"
    else:
        level = "balanced"
        label = "稳步推进"
        focus = "先完成关键任务，再推进项目"

    return {
        "level": level,
        "label": label,
        "focus": focus,
        "completion_rate": completion_rate,
        "avg_daily_focus_minutes": avg_daily_focus_minutes,
        "recommended_plan_items": max(
            DEFAULT_RECOMMENDED_PLAN_ITEMS,
            min(suggestion_count or DEFAULT_RECOMMENDED_PLAN_ITEMS, 5),
        ),
    }


def _fallback_suggestions(
    manual_todos: List[models.TodoItem],
    project_todos: List[models.TodoItem],
) -> List[Dict[str, Any]]:
    suggestions: List[Dict[str, Any]] = []

    for todo in [*manual_todos[:2], *project_todos[:1]]:
        suggestions.append(
            {
                "id": todo.id,
                "title": todo.text,
                "reason": "来自当前待办",
                "target": "/workbench",
                "estimated_minutes": DEFAULT_ESTIMATED_MINUTES,
                "subject": todo.subject or "general",
                "todo_text": todo.text,
            }
        )

    if suggestions:
        return suggestions

    return [
        {
            "id": "coach-default",
            "title": "整理今日待办",
            "reason": "先收拢今天最重要的事情",
            "target": "/workbench",
            "estimated_minutes": DEFAULT_ESTIMATED_MINUTES,
            "subject": "general",
            "todo_text": "整理今日待办",
        }
    ]


def build_today_payload(db: Session, current_user_id: str, date_key: str) -> Dict[str, Any]:
    normalized_date_key = validate_date_key(date_key)
    active_todos = _load_active_batch_todos(db, current_user_id, normalized_date_key)
    manual_todos = _load_context_todos(db, current_user_id, source="manual")
    project_todos = _load_context_todos(db, current_user_id, source="project")
    suggestions = (
        [_todo_to_suggestion(todo) for todo in active_todos]
        if active_todos
        else _fallback_suggestions(manual_todos, project_todos)
    )
    snapshot = _build_snapshot(db, current_user_id, normalized_date_key)
    adaptive = _build_adaptive(snapshot, len(suggestions))
    coach_message = (
        f"今天先处理 {suggestions[0]['title']}，再继续推进其他事项。"
        if suggestions
        else "先完成高优先级任务，再做项目推进。"
    )

    return {
        "success": True,
        "snapshot": snapshot,
        "adaptive": adaptive,
        "suggestions": suggestions,
        "coach_message": coach_message,
    }


def _build_plan_prompt(
    *,
    current_user_id: str,
    date_key: str,
    max_items: int,
    snapshot: Dict[str, Any],
    manual_todos: List[models.TodoItem],
    project_todos: List[models.TodoItem],
) -> str:
    context_payload = {
        "user_id": current_user_id,
        "date_key": date_key,
        "max_items": max_items,
        "snapshot": snapshot,
        "manual_todos": _context_summary(manual_todos),
        "project_todos": _context_summary(project_todos),
    }
    return (
        "你是 VibeLife 的今日计划编排器。"
        "请基于上下文给出今天要落到工作台的待办，只返回 JSON，不要加 Markdown。"
        "返回格式必须是对象，包含 coach_message、adaptive、todos 三个字段。"
        "adaptive 需要至少包含 level、label、focus。"
        "todos 必须是数组，每项包含 text、priority、subject、due_date。"
        f"计划必须严格控制在 {max_items} 条以内，date_key 必须使用 {date_key}。"
        "如果上下文不足，也要返回非空的最小可执行计划。"
        "\n\n上下文(JSON):\n"
        + json.dumps(context_payload, ensure_ascii=False, indent=2)
    )


@contextmanager
def acquire_refresh_lock(current_user_id: str):
    with _refresh_locks_guard:
        lock = _refresh_locks.setdefault(current_user_id, threading.Lock())

    if not lock.acquire(blocking=False):
        raise CoachPlanConflictError("当前用户已有今日计划刷新正在执行")

    try:
        yield
    finally:
        lock.release()


def refresh_today_plan(
    db: Session,
    *,
    current_user_id: str,
    date_key: str,
    max_items: Optional[int],
    model: str,
    thinking: str,
    agent: str,
    base_url: Optional[str],
    auth_token: Optional[str],
    invoking_openclaw_agent_id: Optional[str] = None,
) -> Dict[str, Any]:
    normalized_date_key = validate_date_key(date_key)
    normalized_max_items = normalize_max_items(max_items)
    snapshot = _build_snapshot(db, current_user_id, normalized_date_key)
    manual_todos = _load_context_todos(db, current_user_id, source="manual")
    project_todos = _load_context_todos(db, current_user_id, source="project")
    prompt = _build_plan_prompt(
        current_user_id=current_user_id,
        date_key=normalized_date_key,
        max_items=normalized_max_items,
        snapshot=snapshot,
        manual_todos=manual_todos,
        project_todos=project_todos,
    )

    with acquire_refresh_lock(current_user_id):
        raw_response = openclaw_bridge.run_openclaw_agent(
            prompt,
            model=model,
            thinking=thinking,
            agent=agent,
            base_url=base_url,
            auth_token=auth_token,
            current_user_id=current_user_id,
            invoking_agent_id=invoking_openclaw_agent_id,
        )
        parsed = _parse_json_object(raw_response)
        todos = _normalize_plan_todos(
            parsed.get("todos"),
            date_key=normalized_date_key,
            max_items=normalized_max_items,
        )
        if not todos:
            raise CoachPlanValidationError("OpenClaw 返回了空的今日计划，未覆盖原计划")

        plan_batch_id = f"plan_{uuid4().hex[:12]}"
        deleted_count = (
            db.query(models.TodoItem)
            .filter(
                models.TodoItem.user_id == current_user_id,
                models.TodoItem.source == "ai_daily",
                models.TodoItem.plan_date == normalized_date_key,
                models.TodoItem.completed == False,
            )
            .delete(synchronize_session=False)
        )

        created_todos: List[models.TodoItem] = []
        created_at_base = dt.datetime.utcnow()
        for index, todo in enumerate(todos):
            created_todo = models.TodoItem(
                id=f"todo_{uuid4().hex[:12]}",
                user_id=current_user_id,
                text=todo["text"],
                completed=False,
                priority=todo["priority"],
                subject=todo["subject"],
                due_date=todo["due_date"],
                source="ai_daily",
                plan_batch_id=plan_batch_id,
                plan_date=normalized_date_key,
                created_at=(created_at_base + dt.timedelta(milliseconds=index)).isoformat(),
            )
            db.add(created_todo)
            created_todos.append(created_todo)

        try:
            db.commit()
        except Exception:
            db.rollback()
            raise

        for todo in created_todos:
            db.refresh(todo)

    adaptive_payload = parsed.get("adaptive")
    adaptive = adaptive_payload if isinstance(adaptive_payload, dict) else {}
    normalized_response = {
        "success": True,
        "plan_batch_id": plan_batch_id,
        "created_count": len(created_todos),
        "skipped_count": 0,
        "deleted_count": deleted_count,
        "todos": [_serialize_plan_todo(todo) for todo in created_todos],
        "provider": "openclaw",
        "adaptive": {
            "level": str(adaptive.get("level") or "balanced"),
            "label": str(adaptive.get("label") or "稳步推进"),
            "focus": str(adaptive.get("focus") or "先完成关键任务"),
        },
        "coach_message": str(parsed.get("coach_message") or "").strip(),
    }
    return normalized_response
