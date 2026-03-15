# backend/workbench_routes.py
# 工作台专用 API：任务管理、专注记录、日志与日程

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
import pydantic

from database import get_db
from auth import get_current_user_id  # ✅ 新增：用户认证依赖
import models

router = APIRouter()


def _utcnow_iso() -> str:
    return datetime.utcnow().isoformat()


def _today_iso() -> str:
    return date.today().isoformat()


def _validate_iso_date(value: str, field_name: str) -> str:
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError as exc:
        raise ValueError(f"{field_name} must be in YYYY-MM-DD format") from exc


def _normalize_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    text = value.strip()
    return text or None


def _normalize_tags(values: Optional[List[str]]) -> List[str]:
    if not values:
        return []

    normalized: List[str] = []
    seen = set()
    for value in values:
        if not isinstance(value, str):
            continue
        text = value.strip()
        if not text or text in seen:
            continue
        normalized.append(text)
        seen.add(text)
    return normalized


def _resolve_journal_title(
    title: Optional[str], content: str, entry_date: str
) -> str:
    normalized_title = _normalize_optional_text(title)
    if normalized_title:
        return normalized_title

    for line in content.splitlines():
        snippet = line.strip()
        if snippet:
            return snippet[:48]

    return f"{entry_date} 日志"


def _serialize_journal_entry(entry: models.JournalEntry) -> dict:
    content = entry.content or ""
    preview = content.strip().replace("\n", " ")
    return {
        "id": entry.id,
        "title": entry.title,
        "content": content,
        "entry_date": entry.entry_date,
        "mood": entry.mood,
        "tags": entry.tags or [],
        "preview": preview[:120],
        "created_at": entry.created_at,
        "updated_at": entry.updated_at,
    }


def _serialize_schedule_event(event: models.ScheduleEvent) -> dict:
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "event_date": event.event_date,
        "time": event.time,
        "type": event.type,
        "created_at": event.created_at,
        "updated_at": event.updated_at,
    }

# ========================
# Schemas
# ========================

class TodoItemCreate(pydantic.BaseModel):
    text: str
    priority: int = 0
    subject: str = "general"
    due_date: Optional[str] = None

    @pydantic.field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("Todo text cannot be empty")
        return text

class TodoItemUpdate(pydantic.BaseModel):
    text: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[int] = None
    subject: Optional[str] = None
    due_date: Optional[str] = None

    @pydantic.field_validator("text")
    @classmethod
    def validate_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        text = value.strip()
        if not text:
            raise ValueError("Todo text cannot be empty")
        return text

class FocusSessionCreate(pydantic.BaseModel):
    duration_minutes: int
    mode: str  # 'classic' | 'flow'
    tasks_completed: int = 0


class JournalEntryCreate(pydantic.BaseModel):
    title: Optional[str] = None
    content: str
    entry_date: Optional[str] = None
    mood: Optional[str] = None
    tags: List[str] = pydantic.Field(default_factory=list)

    @pydantic.field_validator("title")
    @classmethod
    def validate_title(cls, value: Optional[str]) -> Optional[str]:
        normalized = _normalize_optional_text(value)
        if value is not None and normalized is None:
            raise ValueError("Journal title cannot be empty")
        return normalized

    @pydantic.field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        content = value.strip()
        if not content:
            raise ValueError("Journal content cannot be empty")
        return content

    @pydantic.field_validator("entry_date")
    @classmethod
    def validate_entry_date(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return _validate_iso_date(value, "entry_date")

    @pydantic.field_validator("mood")
    @classmethod
    def validate_mood(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_optional_text(value)

    @pydantic.field_validator("tags")
    @classmethod
    def validate_tags(cls, value: List[str]) -> List[str]:
        return _normalize_tags(value)


class JournalEntryUpdate(pydantic.BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    entry_date: Optional[str] = None
    mood: Optional[str] = None
    tags: Optional[List[str]] = None

    @pydantic.field_validator("title")
    @classmethod
    def validate_title(cls, value: Optional[str]) -> Optional[str]:
        normalized = _normalize_optional_text(value)
        if value is not None and normalized is None:
            raise ValueError("Journal title cannot be empty")
        return normalized

    @pydantic.field_validator("content")
    @classmethod
    def validate_content(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        content = value.strip()
        if not content:
            raise ValueError("Journal content cannot be empty")
        return content

    @pydantic.field_validator("entry_date")
    @classmethod
    def validate_entry_date(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return _validate_iso_date(value, "entry_date")

    @pydantic.field_validator("mood")
    @classmethod
    def validate_mood(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_optional_text(value)

    @pydantic.field_validator("tags")
    @classmethod
    def validate_tags(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return value
        return _normalize_tags(value)


class ScheduleEventCreate(pydantic.BaseModel):
    title: str
    event_date: Optional[str] = None
    description: Optional[str] = None
    time: Optional[str] = None
    type: str = "task"

    @pydantic.field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        title = value.strip()
        if not title:
            raise ValueError("Schedule title cannot be empty")
        return title

    @pydantic.field_validator("event_date")
    @classmethod
    def validate_event_date(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return _validate_iso_date(value, "event_date")

    @pydantic.field_validator("description", "time", "type")
    @classmethod
    def validate_optional_fields(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_optional_text(value)


class ScheduleEventUpdate(pydantic.BaseModel):
    title: Optional[str] = None
    event_date: Optional[str] = None
    description: Optional[str] = None
    time: Optional[str] = None
    type: Optional[str] = None

    @pydantic.field_validator("title")
    @classmethod
    def validate_title(cls, value: Optional[str]) -> Optional[str]:
        normalized = _normalize_optional_text(value)
        if value is not None and normalized is None:
            raise ValueError("Schedule title cannot be empty")
        return normalized

    @pydantic.field_validator("event_date")
    @classmethod
    def validate_event_date(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return _validate_iso_date(value, "event_date")

    @pydantic.field_validator("description", "time", "type")
    @classmethod
    def validate_optional_fields(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_optional_text(value)

# ========================
# Todo Items API
# ========================

@router.get("/api/workbench/todos")
async def get_todos(
    completed: Optional[bool] = None,
    subject: Optional[str] = None,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取所有任务（带用户隔离）"""
    query = db.query(models.TodoItem).filter(models.TodoItem.user_id == current_user_id)  # ✅ 用户隔离

    if completed is not None:
        query = query.filter(models.TodoItem.completed == completed)

    if subject:
        query = query.filter(models.TodoItem.subject == subject)

    todos = query.order_by(models.TodoItem.created_at.desc()).all()

    return [{
        "id": t.id,
        "text": t.text,
        "completed": t.completed,
        "priority": t.priority,
        "subject": t.subject,
        "created_at": t.created_at,
        "completed_at": t.completed_at,
        "due_date": t.due_date
    } for t in todos if isinstance(t.text, str) and t.text.strip()]

@router.post("/api/workbench/todos")
async def create_todo(
    todo: TodoItemCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """创建新任务（带用户隔离）"""
    import time
    todo_id = f"todo_{int(time.time() * 1000)}"

    new_todo = models.TodoItem(
        id=todo_id,
        text=todo.text,
        priority=todo.priority,
        subject=todo.subject,
        due_date=todo.due_date,
        user_id=current_user_id  # ✅ 关联到当前用户
    )

    db.add(new_todo)
    db.commit()
    db.refresh(new_todo)

    return {
        "id": new_todo.id,
        "text": new_todo.text,
        "completed": new_todo.completed,
        "priority": new_todo.priority,
        "subject": new_todo.subject,
        "created_at": new_todo.created_at,
        "completed_at": new_todo.completed_at,
        "due_date": new_todo.due_date
    }

@router.put("/api/workbench/todos/{todo_id}")
async def update_todo(
    todo_id: str,
    todo_update: TodoItemUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """更新任务（带用户隔离）"""
    todo = db.query(models.TodoItem).filter(
        models.TodoItem.id == todo_id,
        models.TodoItem.user_id == current_user_id  # ✅ 用户隔离
    ).first()

    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    # Update fields
    if todo_update.text is not None:
        todo.text = todo_update.text
    if todo_update.completed is not None:
        todo.completed = todo_update.completed
        if todo_update.completed and not todo.completed_at:
            todo.completed_at = datetime.utcnow().isoformat()
        elif not todo_update.completed:
            todo.completed_at = None
    if todo_update.priority is not None:
        todo.priority = todo_update.priority
    if todo_update.subject is not None:
        todo.subject = todo_update.subject
    if todo_update.due_date is not None:
        todo.due_date = todo_update.due_date

    db.commit()
    db.refresh(todo)

    return {
        "id": todo.id,
        "text": todo.text,
        "completed": todo.completed,
        "priority": todo.priority,
        "subject": todo.subject,
        "created_at": todo.created_at,
        "completed_at": todo.completed_at,
        "due_date": todo.due_date
    }

@router.delete("/api/workbench/todos/{todo_id}")
async def delete_todo(
    todo_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """删除任务（带用户隔离）"""
    todo = db.query(models.TodoItem).filter(
        models.TodoItem.id == todo_id,
        models.TodoItem.user_id == current_user_id  # ✅ 用户隔离
    ).first()

    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db.delete(todo)
    db.commit()

    return {"success": True, "message": "Todo deleted"}

@router.delete("/api/workbench/todos")
@router.delete("/api/workbench/todos/completed")
async def clear_completed_todos(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """清空已完成的任务（带用户隔离）"""
    completed_todos = db.query(models.TodoItem).filter(
        models.TodoItem.completed == True,
        models.TodoItem.user_id == current_user_id  # ✅ 用户隔离
    ).all()

    count = len(completed_todos)
    for todo in completed_todos:
        db.delete(todo)

    db.commit()

    return {"success": True, "deleted_count": count}

@router.delete("/api/workbench/todos/all")
async def clear_all_todos(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """清空所有任务（带用户隔离）"""
    todos = db.query(models.TodoItem).filter(
        models.TodoItem.user_id == current_user_id  # ✅ 用户隔离
    ).all()

    count = len(todos)
    for todo in todos:
        db.delete(todo)

    db.commit()

    return {"success": True, "deleted_count": count}

# ========================
# Focus Session API
# ========================

@router.post("/api/workbench/sessions")
async def create_focus_session(
    session: FocusSessionCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """记录专注会话（带用户隔离）"""
    import time
    session_id = f"session_{int(time.time() * 1000)}"

    new_session = models.FocusSession(
        id=session_id,
        duration_minutes=session.duration_minutes,
        mode=session.mode,
        tasks_completed=session.tasks_completed,
        user_id=current_user_id  # ✅ 关联到当前用户
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return {
        "id": new_session.id,
        "duration_minutes": new_session.duration_minutes,
        "mode": new_session.mode,
        "tasks_completed": new_session.tasks_completed,
        "created_at": new_session.created_at,
    }

@router.get("/api/workbench/sessions")
async def get_focus_sessions(
    days: int = 7,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取最近的专注会话（带用户隔离）"""
    from datetime import timedelta

    start_date = datetime.utcnow() - timedelta(days=days)

    sessions = db.query(models.FocusSession).filter(
        models.FocusSession.user_id == current_user_id,  # ✅ 用户隔离
        models.FocusSession.created_at >= start_date.isoformat()
    ).order_by(models.FocusSession.created_at.desc()).all()

    return [{
        "id": s.id,
        "duration_minutes": s.duration_minutes,
        "mode": s.mode,
        "tasks_completed": s.tasks_completed,
        "created_at": s.created_at
    } for s in sessions]


# ========================
# Journal API
# ========================


@router.get("/api/workbench/journal")
async def get_journal_entries(
    entry_date: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """获取日志条目（带用户隔离）"""
    try:
        if entry_date:
            entry_date = _validate_iso_date(entry_date, "entry_date")
        if date_from:
            date_from = _validate_iso_date(date_from, "date_from")
        if date_to:
            date_to = _validate_iso_date(date_to, "date_to")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    query = db.query(models.JournalEntry).filter(
        models.JournalEntry.user_id == current_user_id
    )

    if entry_date:
        query = query.filter(models.JournalEntry.entry_date == entry_date)
    if date_from:
        query = query.filter(models.JournalEntry.entry_date >= date_from)
    if date_to:
        query = query.filter(models.JournalEntry.entry_date <= date_to)

    entries = (
        query.order_by(
            models.JournalEntry.entry_date.desc(),
            models.JournalEntry.updated_at.desc(),
        )
        .limit(max(1, min(limit, 200)))
        .all()
    )

    return [_serialize_journal_entry(entry) for entry in entries]


@router.post("/api/workbench/journal")
async def create_journal_entry(
    journal: JournalEntryCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """创建日志条目（带用户隔离）"""
    import time

    entry_id = f"journal_{int(time.time() * 1000)}"
    resolved_entry_date = journal.entry_date or _today_iso()
    now = _utcnow_iso()

    new_entry = models.JournalEntry(
        id=entry_id,
        user_id=current_user_id,
        title=_resolve_journal_title(journal.title, journal.content, resolved_entry_date),
        content=journal.content,
        entry_date=resolved_entry_date,
        mood=journal.mood or "",
        tags=journal.tags,
        created_at=now,
        updated_at=now,
    )

    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    return _serialize_journal_entry(new_entry)


@router.put("/api/workbench/journal/{entry_id}")
async def update_journal_entry(
    entry_id: str,
    journal_update: JournalEntryUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """更新日志条目（带用户隔离）"""
    entry = (
        db.query(models.JournalEntry)
        .filter(
            models.JournalEntry.id == entry_id,
            models.JournalEntry.user_id == current_user_id,
        )
        .first()
    )

    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    if journal_update.title is not None:
        entry.title = journal_update.title
    if journal_update.content is not None:
        entry.content = journal_update.content
    if journal_update.entry_date is not None:
        entry.entry_date = journal_update.entry_date
    if journal_update.mood is not None:
        entry.mood = journal_update.mood
    if journal_update.tags is not None:
        entry.tags = journal_update.tags

    entry.updated_at = _utcnow_iso()

    db.commit()
    db.refresh(entry)

    return _serialize_journal_entry(entry)


# ========================
# Schedule API
# ========================


@router.get("/api/workbench/schedule-events")
async def get_schedule_events(
    year: Optional[int] = None,
    month: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    type: Optional[str] = None,
    limit: int = 200,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """获取日程事件（带用户隔离）"""
    try:
        if year is not None or month is not None:
            if year is None or month is None:
                raise HTTPException(status_code=400, detail="year and month must be provided together")
            if month < 1 or month > 12:
                raise HTTPException(status_code=400, detail="month must be between 1 and 12")

            month_start = date(year, month, 1)
            next_month = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
            date_from = month_start.isoformat()
            date_to = (next_month - timedelta(days=1)).isoformat()

        if date_from:
            date_from = _validate_iso_date(date_from, "date_from")
        if date_to:
            date_to = _validate_iso_date(date_to, "date_to")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    query = db.query(models.ScheduleEvent).filter(
        models.ScheduleEvent.user_id == current_user_id
    )

    if date_from:
        query = query.filter(models.ScheduleEvent.event_date >= date_from)
    if date_to:
        query = query.filter(models.ScheduleEvent.event_date <= date_to)
    if type:
        query = query.filter(models.ScheduleEvent.type == type)

    events = (
        query.order_by(
            models.ScheduleEvent.event_date.asc(),
            models.ScheduleEvent.time.asc(),
            models.ScheduleEvent.created_at.asc(),
        )
        .limit(max(1, min(limit, 500)))
        .all()
    )

    return [_serialize_schedule_event(event) for event in events]


@router.post("/api/workbench/schedule-events")
async def create_schedule_event(
    schedule_event: ScheduleEventCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """创建日程事件（带用户隔离）"""
    import time as time_module

    event_id = f"schedule_{int(time_module.time() * 1000)}"
    resolved_event_date = schedule_event.event_date or _today_iso()
    now = _utcnow_iso()

    new_event = models.ScheduleEvent(
        id=event_id,
        user_id=current_user_id,
        title=schedule_event.title,
        description=schedule_event.description or "",
        event_date=resolved_event_date,
        time=schedule_event.time,
        type=schedule_event.type or "task",
        created_at=now,
        updated_at=now,
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return _serialize_schedule_event(new_event)


@router.put("/api/workbench/schedule-events/{event_id}")
async def update_schedule_event(
    event_id: str,
    event_update: ScheduleEventUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """更新日程事件（带用户隔离）"""
    event = (
        db.query(models.ScheduleEvent)
        .filter(
            models.ScheduleEvent.id == event_id,
            models.ScheduleEvent.user_id == current_user_id,
        )
        .first()
    )

    if not event:
        raise HTTPException(status_code=404, detail="Schedule event not found")

    if event_update.title is not None:
        event.title = event_update.title
    if event_update.description is not None:
        event.description = event_update.description
    if event_update.event_date is not None:
        event.event_date = event_update.event_date
    if event_update.time is not None:
        event.time = event_update.time
    if event_update.type is not None:
        event.type = event_update.type

    event.updated_at = _utcnow_iso()

    db.commit()
    db.refresh(event)

    return _serialize_schedule_event(event)

# ========================
# Statistics API
# ========================

@router.get("/api/workbench/stats")
async def get_workbench_stats(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取工作台统计数据（带用户隔离）"""
    from datetime import timedelta

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Todo stats
    total_todos = db.query(models.TodoItem).filter(
        models.TodoItem.user_id == current_user_id
    ).count()
    completed_todos = db.query(models.TodoItem).filter(
        models.TodoItem.user_id == current_user_id,
        models.TodoItem.completed == True
    ).count()

    # Focus sessions stats
    today_sessions = db.query(models.FocusSession).filter(
        models.FocusSession.user_id == current_user_id,
        models.FocusSession.created_at >= today_start.isoformat()
    ).all()
    today_focus_minutes = sum(s.duration_minutes for s in today_sessions)

    # Get recent todos (last 10)
    recent_todos = db.query(models.TodoItem).filter(
        models.TodoItem.user_id == current_user_id  # ✅ 用户隔离
    ).order_by(
        models.TodoItem.created_at.desc()
    ).limit(10).all()

    recent_todos_data = [{
        "id": t.id,
        "text": t.text,
        "completed": t.completed,
        "subject": t.subject,
        "created_at": t.created_at
    } for t in recent_todos]

    return {
        "todos": {
            "total": total_todos,
            "completed": completed_todos,
            "pending": total_todos - completed_todos
        },
        "focus_time": {
            "today_minutes": today_focus_minutes,
            "today_sessions": len(today_sessions)
        },
        "recent_todos": recent_todos_data
    }
