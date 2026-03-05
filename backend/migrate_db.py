#!/usr/bin/env python3
"""
数据库迁移脚本 - 创建Workbench相关表
"""

from database import engine, Base
from models import TodoItem, WorkbenchMistake

def migrate():
    """创建新表"""
    print("开始数据库迁移...")
    print("创建表: todo_items, workbench_mistakes")

    try:
        # 创建新表（如果不存在）
        Base.metadata.create_all(bind=engine, checkfirst=True)
        print("✅ 数据库迁移完成！")
        print("\n新表结构:")
        print("  - todo_items: 工作台任务")
        print("  - workbench_mistakes: 工作台错题备忘录")
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        raise

if __name__ == "__main__":
    migrate()
