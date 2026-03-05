#!/usr/bin/env python
"""创建数据库表"""
from database import engine
from models import Base

print("正在创建数据库表...")
Base.metadata.create_all(bind=engine)
print("✅ 数据库表创建完成")
