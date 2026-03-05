# backend/migrations/add_step_answers.py
# 数据迁移脚本：添加复合题小题答题记录支持

from sqlalchemy import create_engine, Column, JSON, text
from sqlalchemy import inspect
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine

def upgrade():
    """添加 step_answers 字段到 mistakes 表"""
    print("🚀 开始数据迁移：添加复合题小题答题记录支持...")

    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('mistakes')]

    with engine.connect() as conn:
        if 'step_answers' not in columns:
            print("  ✓ 添加 step_answers 字段...")
            conn.execute(text("ALTER TABLE mistakes ADD COLUMN step_answers JSON DEFAULT '[]'"))
        else:
            print("  - step_answers 字段已存在，跳过")

        conn.commit()

    print("✅ 数据迁移完成！")
    print("\n数据结构变更：")
    print("  • mistakes.step_answers: JSON 字段，存储复合题的小题答题记录")


def downgrade():
    """回滚：删除 step_answers 字段"""
    print("⚠️  开始回滚：删除 step_answers 字段...")

    with engine.connect() as conn:
        try:
            if engine.dialect.name == 'sqlite':
                print("  ! SQLite 不支持 DROP COLUMN，请手动重建表")
            else:
                conn.execute(text("ALTER TABLE mistakes DROP COLUMN step_answers"))
                print("  ✓ 已删除 step_answers 字段")
        except Exception as e:
            print(f"  ! 删除 step_answers 字段失败: {e}")

        conn.commit()

    print("⚠️  回滚完成！")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='数据迁移脚本：复合题小题答题记录')
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
