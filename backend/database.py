#(注释) backend/database.py
#(注释) 数据库连接配置。默认使用 backend/vibelife.db，若检测到历史数据库则自动兼容。

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "vibelife.db"


def _resolve_db_path() -> Path:
    env_path = os.getenv("VIBELIFE_DB_PATH")
    if env_path:
        return Path(env_path).expanduser().resolve()

    if DEFAULT_DB_PATH.exists():
        return DEFAULT_DB_PATH

    fallback_candidates = sorted(
        path for path in BASE_DIR.glob("*.db") if path.name != DEFAULT_DB_PATH.name
    )
    if not fallback_candidates:
        return DEFAULT_DB_PATH
    if len(fallback_candidates) == 1:
        return fallback_candidates[0]
    return max(fallback_candidates, key=lambda path: path.stat().st_mtime)


DB_PATH = _resolve_db_path()
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"
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
