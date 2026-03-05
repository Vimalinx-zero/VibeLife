#!/usr/bin/env python3
"""
迁移脚本：创建学习记录相关的表
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base

def migrate():
    """创建学习记录表"""
    print("📚 开始迁移学习记录表...")

    # 创建所有新表
    Base.metadata.create_all(bind=engine)

    print("✅ 学习记录表创建成功！")
    print("\n创建的表：")
    print("  - learning_sessions (学习会话记录)")
    print("  - pomodoro_records (番茄钟记录)")

if __name__ == "__main__":
    migrate()
