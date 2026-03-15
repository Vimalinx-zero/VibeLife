# backend/workbench_routes.py
# 工作台专用 API：任务管理、错题备忘录、学习统计

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import pydantic

from database import get_db
from auth import get_current_user_id  # ✅ 新增：用户认证依赖
import models

router = APIRouter()

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

class WorkbenchMistakeCreate(pydantic.BaseModel):
    content: str  # 格式：P12T3 注释内容
    subject: str
    question_id: Optional[str] = None

class WorkbenchSessionCreate(pydantic.BaseModel):
    duration_minutes: int
    mode: str  # 'classic' | 'flow'
    tasks_completed: int = 0
    mistakes_collected: int = 0

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
# Workbench Mistakes API
# ========================

@router.get("/api/workbench/mistakes")
async def get_workbench_mistakes(
    subject: Optional[str] = None,
    limit: int = 50,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取工作台错题备忘录（带用户隔离）"""
    query = db.query(models.WorkbenchMistake).filter(
        models.WorkbenchMistake.user_id == current_user_id  # ✅ 用户隔离
    )

    if subject:
        query = query.filter(models.WorkbenchMistake.subject == subject)

    mistakes = query.order_by(models.WorkbenchMistake.created_at.desc()).limit(limit).all()

    return [{
        "id": m.id,
        "content": m.content,
        "subject": m.subject,
        "question_id": m.question_id,
        "created_at": m.created_at
    } for m in mistakes]

@router.post("/api/workbench/mistakes")
async def create_workbench_mistake(
    mistake: WorkbenchMistakeCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """创建工作台错题备忘录（带用户隔离）"""
    import time
    mistake_id = f"wb_mistake_{int(time.time() * 1000)}"

    new_mistake = models.WorkbenchMistake(
        id=mistake_id,
        content=mistake.content,
        subject=mistake.subject,
        question_id=mistake.question_id,
        user_id=current_user_id  # ✅ 关联到当前用户
    )

    db.add(new_mistake)
    db.commit()
    db.refresh(new_mistake)

    return {
        "id": new_mistake.id,
        "content": new_mistake.content,
        "subject": new_mistake.subject,
        "question_id": new_mistake.question_id,
        "created_at": new_mistake.created_at
    }

@router.delete("/api/workbench/mistakes/{mistake_id}")
async def delete_workbench_mistake(
    mistake_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """删除工作台错题备忘录（带用户隔离）"""
    mistake = db.query(models.WorkbenchMistake).filter(
        models.WorkbenchMistake.id == mistake_id,
        models.WorkbenchMistake.user_id == current_user_id  # ✅ 用户隔离
    ).first()

    if not mistake:
        raise HTTPException(status_code=404, detail="Mistake not found")

    db.delete(mistake)
    db.commit()

    return {"success": True, "message": "Mistake deleted"}

@router.delete("/api/workbench/mistakes")
async def clear_all_workbench_mistakes(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """清空所有工作台错题备忘录（带用户隔离）"""
    mistakes = db.query(models.WorkbenchMistake).filter(
        models.WorkbenchMistake.user_id == current_user_id  # ✅ 用户隔离
    ).all()

    count = len(mistakes)
    for mistake in mistakes:
        db.delete(mistake)

    db.commit()

    return {"success": True, "deleted_count": count}

# ========================
# Study Session API
# ========================

@router.post("/api/workbench/sessions")
async def create_study_session(
    session: WorkbenchSessionCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """记录学习会话（番茄钟使用）（带用户隔离）"""
    import time
    session_id = f"session_{int(time.time() * 1000)}"

    new_session = models.StudySession(
        id=session_id,
        duration_minutes=session.duration_minutes,
        mode=session.mode,
        tasks_completed=session.tasks_completed,
        mistakes_collected=session.mistakes_collected,
        user_id=current_user_id  # ✅ 关联到当前用户
    )

    db.add(new_session)
    db.commit()

    return {
        "success": True,
        "session_id": session_id
    }

@router.get("/api/workbench/sessions")
async def get_study_sessions(
    days: int = 7,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取最近的学习会话（带用户隔离）"""
    from datetime import timedelta

    start_date = datetime.utcnow() - timedelta(days=days)

    sessions = db.query(models.StudySession).filter(
        models.StudySession.user_id == current_user_id,  # ✅ 用户隔离
        models.StudySession.created_at >= start_date.isoformat()
    ).order_by(models.StudySession.created_at.desc()).all()

    return [{
        "id": s.id,
        "duration_minutes": s.duration_minutes,
        "mode": s.mode,
        "tasks_completed": s.tasks_completed,
        "mistakes_collected": s.mistakes_collected,
        "created_at": s.created_at
    } for s in sessions]

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

    # Workbench mistakes stats
    total_mistakes = db.query(models.WorkbenchMistake).filter(
        models.WorkbenchMistake.user_id == current_user_id
    ).count()
    today_mistakes = db.query(models.WorkbenchMistake).filter(
        models.WorkbenchMistake.user_id == current_user_id,
        models.WorkbenchMistake.created_at >= today_start.isoformat()
    ).count()

    # Study sessions stats
    today_sessions = db.query(models.StudySession).filter(
        models.StudySession.user_id == current_user_id,
        models.StudySession.created_at >= today_start.isoformat()
    ).all()
    today_focus_minutes = sum(s.duration_minutes for s in today_sessions)

    # Get recent mistakes (last 10)
    recent_mistakes = db.query(models.WorkbenchMistake).filter(
        models.WorkbenchMistake.user_id == current_user_id  # ✅ 用户隔离
    ).order_by(
        models.WorkbenchMistake.created_at.desc()
    ).limit(10).all()

    recent_mistakes_data = [{
        "id": m.id,
        "content": m.content,
        "subject": m.subject,
        "question_id": m.question_id,
        "created_at": m.created_at
    } for m in recent_mistakes]

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
        "mistakes": {
            "total": total_mistakes,
            "today": today_mistakes
        },
        "study_time": {
            "today_minutes": today_focus_minutes,
            "today_sessions": len(today_sessions)
        },
        "recent_mistakes": recent_mistakes_data,
        "recent_todos": recent_todos_data
    }
