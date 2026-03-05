# backend/crud_study.py
# 学习记录相关的 CRUD 操作

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import models
import datetime
from typing import List, Optional

def create_learning_session(db: Session, user_id: str, type: str, focus_item_id: str = None):
    """创建学习会话（开始学习）"""
    session = models.LearningSession(
        user_id=user_id,
        type=type,
        focus_item_id=focus_item_id,
        start_time=datetime.datetime.now(),
        end_time=None,
        duration=0,
        pomodoro_count=0
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def end_learning_session(db: Session, session_id: int):
    """结束学习会话"""
    session = db.query(models.LearningSession).filter(models.LearningSession.id == session_id).first()
    if session and not session.end_time:
        end_time = datetime.datetime.now()
        session.end_time = end_time
        session.duration = int((end_time - session.start_time).total_seconds())
        db.commit()
        db.refresh(session)
    return session

def get_learning_sessions(db: Session, user_id: str, limit: int = 100):
    """获取学习会话列表"""
    return db.query(models.LearningSession).filter(
        models.LearningSession.user_id == user_id
    ).order_by(models.LearningSession.start_time.desc()).limit(limit).all()

def get_today_study_time(db: Session, user_id: str) -> dict:
    """获取今日学习时长统计"""
    today = datetime.date.today().strftime("%Y-%m-%d")

    sessions = db.query(models.LearningSession).filter(
        and_(
            models.LearningSession.user_id == user_id,
            func.date(models.LearningSession.start_time) == today
        )
    ).all()

    # 按类型统计
    stats = {
        "total_duration": sum(s.duration for s in sessions),
        "quiz_duration": sum(s.duration for s in sessions if s.type == "quiz"),
        "notes_duration": sum(s.duration for s in sessions if s.type == "notes"),
        "anki_duration": sum(s.duration for s in sessions if s.type == "anki"),
        "workbench_duration": sum(s.duration for s in sessions if s.type == "workbench"),
        "session_count": len(sessions),
        "pomodoro_count": sum(s.pomodoro_count or 0 for s in sessions)
    }

    return stats

def get_weekly_study_time(db: Session, user_id: str) -> List[dict]:
    """获取最近7天的学习时长"""
    result = []
    for i in range(7):
        date = datetime.date.today() - datetime.timedelta(days=6-i)
        date_str = date.strftime("%Y-%m-%d")

        sessions = db.query(models.LearningSession).filter(
            and_(
                models.LearningSession.user_id == user_id,
                func.date(models.LearningSession.start_time) == date_str
            )
        ).all()

        result.append({
            "date": date_str,
            "duration": sum(s.duration for s in sessions),
            "count": len(sessions)
        })

    return result

def create_pomodoro_record(db: Session, user_id: str, focus_duration: int, break_duration: int):
    """创建番茄钟记录"""
    today = datetime.date.today().strftime("%Y-%m-%d")

    # 查找今天是否已有记录
    record = db.query(models.PomodoroRecord).filter(
        and_(
            models.PomodoroRecord.user_id == user_id,
            models.PomodoroRecord.date == today
        )
    ).first()

    if record:
        # 更新现有记录
        record.focus_duration += focus_duration
        record.break_duration += break_duration
        record.session_count += 1
    else:
        # 创建新记录
        record = models.PomodoroRecord(
            user_id=user_id,
            date=today,
            focus_duration=focus_duration,
            break_duration=break_duration,
            session_count=1
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record

def get_pomodoro_stats(db: Session, user_id: str, days: int = 30):
    """获取番茄钟统计"""
    from sqlalchemy import desc

    records = db.query(models.PomodoroRecord).filter(
        models.PomodoroRecord.user_id == user_id
    ).order_by(desc(models.PomodoroRecord.date)).limit(days).all()

    return {
        "total_sessions": sum(r.session_count for r in records),
        "total_focus_time": sum(r.focus_duration for r in records),
        "total_break_time": sum(r.break_duration for r in records),
        "records": [
            {
                "date": r.date,
                "focus_duration": r.focus_duration,
                "break_duration": r.break_duration,
                "session_count": r.session_count
            }
            for r in records
        ]
    }

def update_pomodoro_count(db: Session, learning_session_id: int):
    """更新学习会话的番茄钟数量"""
    session = db.query(models.LearningSession).filter(
        models.LearningSession.id == learning_session_id
    ).first()
    if session:
        session.pomodoro_count = (session.pomodoro_count or 0) + 1
        db.commit()
        db.refresh(session)
    return session
