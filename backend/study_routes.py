# backend/study_routes.py
# 学习记录相关的 API 路由

from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from database import get_db
import crud_study
import datetime

router = APIRouter()

@router.post("/api/study/start")
async def start_study(
    user_id: str = Body(..., embed=True),
    type: str = Body(..., embed=True),
    focus_item_id: str = Body(None, embed=True),
    db: Session = Depends(get_db)
):
    """开始学习会话"""
    session = crud_study.create_learning_session(db, user_id, type, focus_item_id)
    return {"success": True, "session_id": session.id, "start_time": session.start_time}

@router.post("/api/study/end")
async def end_study(
    session_id: int = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """结束学习会话"""
    session = crud_study.end_learning_session(db, session_id)
    return {
        "success": True,
        "duration": session.duration,
        "start_time": session.start_time,
        "end_time": session.end_time
    }

@router.get("/api/study/sessions/{user_id}")
async def get_study_sessions(user_id: str, limit: int = 100, db: Session = Depends(get_db)):
    """获取学习会话列表"""
    sessions = crud_study.get_learning_sessions(db, user_id, limit)
    return {
        "sessions": [
            {
                "id": s.id,
                "type": s.type,
                "focus_item_id": s.focus_item_id,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "duration": s.duration,
                "pomodoro_count": s.pomodoro_count
            }
            for s in sessions
        ]
    }

@router.get("/api/study/today/{user_id}")
async def get_today_stats(user_id: str, db: Session = Depends(get_db)):
    """获取今日学习统计"""
    stats = crud_study.get_today_study_time(db, user_id)
    return stats

@router.get("/api/study/weekly/{user_id}")
async def get_weekly_stats(user_id: str, db: Session = Depends(get_db)):
    """获取周学习统计"""
    stats = crud_study.get_weekly_study_time(db, user_id)
    return {"stats": stats}

@router.post("/api/pomodoro/complete")
async def complete_pomodoro(
    user_id: str = Body(..., embed=True),
    learning_session_id: int = Body(None, embed=True),
    focus_duration: int = Body(1500, embed=True),
    break_duration: int = Body(300, embed=True),
    db: Session = Depends(get_db)
):
    """完成番茄钟"""
    # 创建番茄钟记录
    record = crud_study.create_pomodoro_record(db, user_id, focus_duration, break_duration)

    # 如果有关联的学习会话，更新番茄钟数量
    if learning_session_id:
        crud_study.update_pomodoro_count(db, learning_session_id)

    return {
        "success": True,
        "session_count": record.session_count,
        "total_focus_time": record.focus_duration
    }

@router.get("/api/pomodoro/stats/{user_id}")
async def get_pomodoro_stats(user_id: str, days: int = 30, db: Session = Depends(get_db)):
    """获取番茄钟统计"""
    stats = crud_study.get_pomodoro_stats(db, user_id, days)
    return stats

@router.get("/api/study/report/{user_id}")
async def get_study_report(user_id: str, db: Session = Depends(get_db)):
    """获取学习报告（周/月统计）"""
    weekly = crud_study.get_weekly_study_time(db, user_id)
    today = crud_study.get_today_study_time(db, user_id)
    pomodoro = crud_study.get_pomodoro_stats(db, user_id, days=7)

    return {
        "today": today,
        "weekly": weekly,
        "pomodoro": pomodoro
    }
