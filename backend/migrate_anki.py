#!/usr/bin/env python3
"""
Anki 数据库迁移脚本
创建 flashcards 和 card_reviews 表
"""

from database import engine, Base
from models import FlashCard, CardReview

def migrate():
    print("开始 Anki 数据库迁移...")
    print("创建表: flashcards, card_reviews")

    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
        print("✅ Anki 数据库迁移完成！")

        # 验证表是否创建成功
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if 'flashcards' in tables:
            print("✅ flashcards 表已创建")
        else:
            print("❌ flashcards 表创建失败")

        if 'card_reviews' in tables:
            print("✅ card_reviews 表已创建")
        else:
            print("❌ card_reviews 表创建失败")

    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        raise

if __name__ == "__main__":
    migrate()
