#(注释) backend/database.py 
#(注释) 数据库连接配置。使用 SQLite，数据会存在 backend/flowstudy.db 文件中。 

from sqlalchemy import create_engine 
from sqlalchemy.ext.declarative import declarative_base 
from sqlalchemy.orm import sessionmaker 

# SQLite 数据库文件路径 
SQLALCHEMY_DATABASE_URL = "sqlite:///./flowstudy.db" 
# 如果未来要换 PostgreSQL，只需改上面这一行为： 
# SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/dbname" 

# check_same_thread=False 是 SQLite 专用的，允许在多线程中使用连接 
engine = create_engine( 
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} 
) 

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) 

Base = declarative_base() 

# 依赖项：每个请求创建一个独立的 DB 会话 
def get_db(): 
    db = SessionLocal() 
    try: 
        yield db 
    finally: 
        db.close()