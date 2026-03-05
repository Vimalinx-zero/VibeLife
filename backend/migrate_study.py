#!/usr/bin/env python3
"""
迁移脚本：创建学习记录相关的表
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base, SessionLocal
from models_study import StudySession, PomodoroSession

def migrate():
    """创建学习记录表"""
    print("📚 开始迁移学习记录表...")

    # 创建表
    Base.metadata.create_all(bind=engine)

    print("✅ 学习记录表创建成功！")
    print("\n创建的表：")
    print("  - study_sessions (学习会话记录)")
    print("  - pomodoro_sessions (番茄钟记录)")

if __name__ == "__main__":
    migrate()
