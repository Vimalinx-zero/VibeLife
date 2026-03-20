#!/usr/bin/env python3
"""
迁移脚本：添加高考学习核心表
运行方式：python migrate_gaokao_models.py
"""

import sys
from pathlib import Path

# 确保能导入本地模块
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import inspect
from database import engine, Base, run_legacy_cleanup_migrations
from models import MistakeItem, WeakPoint, ReviewRecord, VariationQuestion


def migrate():
    """添加高考学习核心表"""
    print("=" * 50)
    print("高考学习数据模型迁移")
    print("=" * 50)

    # 先运行原有的清理迁移
    run_legacy_cleanup_migrations()

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    # 要添加的新表
    new_tables = {
        "mistake_items": MistakeItem,
        "weak_points": WeakPoint,
        "review_records": ReviewRecord,
        "variation_questions": VariationQuestion,
    }

    created = []
    skipped = []

    for table_name, model in new_tables.items():
        if table_name in existing_tables:
            skipped.append(table_name)
            print(f"[跳过] {table_name} 已存在")
        else:
            created.append(table_name)
            print(f"[创建] {table_name}...")

    if created:
        # 只创建不存在的表
        Base.metadata.create_all(bind=engine)
        print(f"\n[完成] 创建了 {len(created)} 个新表: {', '.join(created)}")

    if skipped:
        print(f"[信息] 跳过 {len(skipped)} 个已存在表: {', '.join(skipped)}")

    # 验证表结构
    print("\n" + "=" * 50)
    print("验证表结构")
    print("=" * 50)

    inspector = inspect(engine)
    for table_name in new_tables.keys():
        columns = inspector.get_columns(table_name)
        print(f"\n{table_name}: {len(columns)} 列")
        for col in columns[:5]:  # 只显示前5列
            print(f"  - {col['name']}: {col['type']}")
        if len(columns) > 5:
            print(f"  ... 及其他 {len(columns) - 5} 列")

    print("\n迁移完成！")
    return True


if __name__ == "__main__":
    migrate()
