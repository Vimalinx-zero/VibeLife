#(注释) backend/database.py
#(注释) 数据库连接配置。默认使用 backend/vibelife.db，若检测到历史数据库则自动兼容。

import os
from pathlib import Path

from sqlalchemy import create_engine, inspect
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


def run_legacy_cleanup_migrations() -> None:
    """Rename live legacy tables and normalize retired categories in-place."""
    with engine.begin() as conn:
        inspector = inspect(conn)
        tables = set(inspector.get_table_names())

        if "study_sessions" in tables and "focus_sessions" not in tables:
            study_columns = {
                column["name"] for column in inspector.get_columns("study_sessions")
            }
            tasks_completed_expr = "tasks_completed" if "tasks_completed" in study_columns else "0"

            conn.exec_driver_sql(
                """
                CREATE TABLE focus_sessions (
                    id VARCHAR PRIMARY KEY,
                    user_id VARCHAR NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    mode VARCHAR NOT NULL,
                    tasks_completed INTEGER DEFAULT 0,
                    created_at VARCHAR
                )
                """
            )
            conn.exec_driver_sql(
                f"""
                INSERT INTO focus_sessions (
                    id,
                    user_id,
                    duration_minutes,
                    mode,
                    tasks_completed,
                    created_at
                )
                SELECT
                    id,
                    user_id,
                    duration_minutes,
                    mode,
                    {tasks_completed_expr},
                    created_at
                FROM study_sessions
                """
            )
            conn.exec_driver_sql("DROP TABLE study_sessions")
            tables.discard("study_sessions")
            tables.add("focus_sessions")

        if "learning_sessions" in tables and "activity_checkpoints" not in tables:
            conn.exec_driver_sql(
                """
                CREATE TABLE activity_checkpoints (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id VARCHAR NOT NULL,
                    type VARCHAR NOT NULL,
                    focus_item_id VARCHAR,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME,
                    duration INTEGER DEFAULT 0,
                    pomodoro_count INTEGER DEFAULT 0,
                    created_at VARCHAR
                )
                """
            )
            conn.exec_driver_sql(
                """
                INSERT INTO activity_checkpoints (
                    id,
                    user_id,
                    type,
                    focus_item_id,
                    start_time,
                    end_time,
                    duration,
                    pomodoro_count,
                    created_at
                )
                SELECT
                    id,
                    user_id,
                    type,
                    focus_item_id,
                    start_time,
                    end_time,
                    duration,
                    pomodoro_count,
                    created_at
                FROM learning_sessions
                """
            )
            conn.exec_driver_sql("DROP TABLE learning_sessions")
            tables.discard("learning_sessions")
            tables.add("activity_checkpoints")

        if "projects" in tables:
            conn.exec_driver_sql(
                "UPDATE projects SET category = 'growth' WHERE lower(category) = 'study'"
            )

# 依赖项：每个请求创建一个独立的 DB 会话
def get_db(): 
    db = SessionLocal() 
    try: 
        yield db 
    finally: 
        db.close()
