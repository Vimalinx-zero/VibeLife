#!/usr/bin/env python
"""创建数据库表"""
from database import engine, run_legacy_cleanup_migrations
from models import Base

print("正在创建数据库表...")
run_legacy_cleanup_migrations()
Base.metadata.create_all(bind=engine)
print("✅ 数据库表创建完成")
