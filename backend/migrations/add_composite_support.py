# backend/migrations/add_composite_support.py
# 数据迁移脚本：添加复合题支持

from sqlalchemy import create_engine, Column, JSON, Boolean, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
import sys

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
import models

def upgrade():
    """
    添加复合题支持的字段
    - questions.steps (JSON, nullable)
    - questions.is_composite (Boolean, default False)
    """
    print("🚀 开始数据迁移：添加复合题支持...")

    # 获取数据库引擎
    from database import engine

    # 使用原始 SQL 添加字段（兼容 SQLite 和 PostgreSQL）
    from sqlalchemy import inspect

    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('questions')]

    with engine.connect() as conn:

        if 'steps' not in columns:
            print("  ✓ 添加 steps 字段...")
            conn.execute(text("ALTER TABLE questions ADD COLUMN steps JSON"))
        else:
            print("  - steps 字段已存在，跳过")

        if 'is_composite' not in columns:
            print("  ✓ 添加 is_composite 字段...")
            if engine.dialect.name == 'sqlite':
                conn.execute(text("ALTER TABLE questions ADD COLUMN is_composite BOOLEAN DEFAULT 0"))
            else:
                conn.execute(text("ALTER TABLE questions ADD COLUMN is_composite BOOLEAN DEFAULT FALSE"))
        else:
            print("  - is_composite 字段已存在，跳过")

        conn.commit()

    print("✅ 数据迁移完成！")
    print("\n数据结构变更：")
    print("  • questions.steps: JSON 字段，存储复合题的步骤数组")
    print("  • questions.is_composite: Boolean 字段，标识是否为复合题")


def downgrade():
    """
    回滚：删除复合题支持的字段
    """
    print("⚠️  开始回滚：删除复合题支持字段...")

    from database import engine

    with engine.connect() as conn:
        # 删除字段（注意：这会丢失所有复合题数据！）
        try:
            if engine.dialect.name == 'sqlite':
                # SQLite 不直接支持 DROP COLUMN，需要重建表
                print("  ! SQLite 不支持 DROP COLUMN，请手动重建表")
            else:
                conn.execute(text("ALTER TABLE questions DROP COLUMN steps"))
                print("  ✓ 已删除 steps 字段")
        except Exception as e:
            print(f"  ! 删除 steps 字段失败: {e}")

        try:
            if engine.dialect.name == 'sqlite':
                print("  ! SQLite 不支持 DROP COLUMN，请手动重建表")
            else:
                conn.execute(text("ALTER TABLE questions DROP COLUMN is_composite"))
                print("  ✓ 已删除 is_composite 字段")
        except Exception as e:
            print(f"  ! 删除 is_composite 字段失败: {e}")

        conn.commit()

    print("⚠️  回滚完成！")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='数据迁移脚本：复合题支持')
    parser.add_argument('--downgrade', action='store_true', help='回滚迁移')
    args = parser.parse_args()

    try:
        if args.downgrade:
            downgrade()
        else:
            upgrade()
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
