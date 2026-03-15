#!/usr/bin/env python3
"""
数据库迁移：为 FileItem 表添加 tags 字段
Run: python backend/migrate_add_tags.py
"""

import sqlite3
import os

from database import DB_PATH

def migrate():
    db_path = str(DB_PATH)

    print(f"📂 数据库路径: {db_path}")

    if not os.path.exists(db_path):
        print("❌ 数据库文件不存在，无需迁移")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 检查 tags 字段是否已存在
        cursor.execute("PRAGMA table_info(files)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'tags' in columns:
            print("✅ tags 字段已存在，无需迁移")
        else:
            # 添加 tags 字段（JSON 类型在 SQLite 中存储为 TEXT）
            print("📝 正在添加 tags 字段...")
            cursor.execute("ALTER TABLE files ADD COLUMN tags TEXT DEFAULT '[]'")
            print("✅ tags 字段添加成功")

        # 提交更改
        conn.commit()
        print("🎉 迁移完成！")

    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
