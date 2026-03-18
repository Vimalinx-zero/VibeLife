#(注释) backend/database.py
#(注释) 数据库连接配置。默认使用 backend/vibelife.db，若检测到历史数据库则自动兼容。

import os
from pathlib import Path
from collections import defaultdict

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

        if "study_sessions" in tables:
            study_columns = {
                column["name"] for column in inspector.get_columns("study_sessions")
            }
            tasks_completed_expr = "tasks_completed" if "tasks_completed" in study_columns else "0"

            if "focus_sessions" not in tables:
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
                tables.add("focus_sessions")

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
                WHERE id NOT IN (SELECT id FROM focus_sessions)
                """
            )
            conn.exec_driver_sql("DROP TABLE study_sessions")
            tables.discard("study_sessions")

        if "learning_sessions" in tables:
            if "activity_checkpoints" not in tables:
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
                tables.add("activity_checkpoints")

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
                WHERE id NOT IN (SELECT id FROM activity_checkpoints)
                """
            )
            conn.exec_driver_sql("DROP TABLE learning_sessions")
            tables.discard("learning_sessions")

        if "projects" in tables:
            conn.exec_driver_sql(
                "UPDATE projects SET category = 'growth' WHERE lower(category) = 'study'"
            )

        if "todo_items" in tables:
            todo_columns = {
                column["name"] for column in inspector.get_columns("todo_items")
            }
            added_sort_order = False

            if "source" not in todo_columns:
                conn.exec_driver_sql(
                    "ALTER TABLE todo_items ADD COLUMN source VARCHAR NOT NULL DEFAULT 'manual'"
                )
                todo_columns.add("source")
            if "plan_batch_id" not in todo_columns:
                conn.exec_driver_sql(
                    "ALTER TABLE todo_items ADD COLUMN plan_batch_id VARCHAR"
                )
                todo_columns.add("plan_batch_id")
            if "plan_date" not in todo_columns:
                conn.exec_driver_sql(
                    "ALTER TABLE todo_items ADD COLUMN plan_date VARCHAR"
                )
                todo_columns.add("plan_date")
            if "sort_order" not in todo_columns:
                conn.exec_driver_sql(
                    "ALTER TABLE todo_items ADD COLUMN sort_order INTEGER"
                )
                todo_columns.add("sort_order")
                added_sort_order = True

            conn.exec_driver_sql(
                "UPDATE todo_items SET source = 'manual' WHERE source IS NULL OR trim(source) = ''"
            )
            conn.exec_driver_sql(
                "UPDATE todo_items SET plan_batch_id = NULL WHERE trim(COALESCE(plan_batch_id, '')) = ''"
            )
            conn.exec_driver_sql(
                "UPDATE todo_items SET plan_date = NULL WHERE trim(COALESCE(plan_date, '')) = ''"
            )

            todo_rows = conn.exec_driver_sql(
                """
                SELECT id, user_id, completed, priority, due_date, created_at, sort_order
                FROM todo_items
                """
            ).mappings().all()

            incomplete_by_user: dict[str, list[dict]] = defaultdict(list)
            for row in todo_rows:
                if row["completed"]:
                    continue
                incomplete_by_user[row["user_id"]].append(dict(row))

            def _legacy_sort_key(row: dict) -> tuple:
                due_date = (row.get("due_date") or "").strip()
                created_at = (row.get("created_at") or "").strip()
                priority = int(row.get("priority") or 0)
                return (-priority, due_date == "", due_date, created_at, row["id"])

            for user_rows in incomplete_by_user.values():
                existing_orders = [row.get("sort_order") for row in user_rows]
                existing_values = [
                    int(value)
                    for value in existing_orders
                    if isinstance(value, int) and value > 0
                ]
                has_invalid_order = (
                    len(existing_values) != len(user_rows)
                    or len(set(existing_values)) != len(existing_values)
                    or sorted(existing_values) != list(range(1, len(user_rows) + 1))
                )
                if not added_sort_order and not has_invalid_order:
                    continue

                ordered_rows = sorted(user_rows, key=_legacy_sort_key)
                for index, row in enumerate(ordered_rows, start=1):
                    conn.exec_driver_sql(
                        "UPDATE todo_items SET sort_order = :sort_order WHERE id = :todo_id",
                        {"sort_order": index, "todo_id": row["id"]},
                    )

        if "quick_note_captures" in tables:
            capture_columns = {
                column["name"] for column in inspector.get_columns("quick_note_captures")
            }

            if "content_kind" not in capture_columns:
                conn.exec_driver_sql(
                    "ALTER TABLE quick_note_captures ADD COLUMN content_kind VARCHAR NOT NULL DEFAULT 'collected'"
                )
                capture_columns.add("content_kind")
            if "category" not in capture_columns:
                conn.exec_driver_sql(
                    "ALTER TABLE quick_note_captures ADD COLUMN category VARCHAR"
                )
                capture_columns.add("category")
            if "source_capture_ids" not in capture_columns:
                conn.exec_driver_sql(
                    "ALTER TABLE quick_note_captures ADD COLUMN source_capture_ids JSON"
                )
                capture_columns.add("source_capture_ids")
            if "source_filter_snapshot" not in capture_columns:
                conn.exec_driver_sql(
                    "ALTER TABLE quick_note_captures ADD COLUMN source_filter_snapshot JSON"
                )
                capture_columns.add("source_filter_snapshot")
            if "discussion_metadata" not in capture_columns:
                conn.exec_driver_sql(
                    "ALTER TABLE quick_note_captures ADD COLUMN discussion_metadata JSON"
                )
                capture_columns.add("discussion_metadata")

            conn.exec_driver_sql(
                "UPDATE quick_note_captures SET content_kind = 'collected' WHERE content_kind IS NULL OR trim(content_kind) = ''"
            )
            conn.exec_driver_sql(
                "UPDATE quick_note_captures SET category = NULL WHERE trim(COALESCE(category, '')) = ''"
            )
            conn.exec_driver_sql(
                "UPDATE quick_note_captures SET source_capture_ids = '[]' WHERE source_capture_ids IS NULL OR trim(CAST(source_capture_ids AS TEXT)) = ''"
            )
            conn.exec_driver_sql(
                "UPDATE quick_note_captures SET source_filter_snapshot = NULL WHERE trim(COALESCE(CAST(source_filter_snapshot AS TEXT), '')) = ''"
            )
            conn.exec_driver_sql(
                "UPDATE quick_note_captures SET discussion_metadata = NULL WHERE trim(COALESCE(CAST(discussion_metadata AS TEXT), '')) = ''"
            )

# 依赖项：每个请求创建一个独立的 DB 会话
def get_db(): 
    db = SessionLocal() 
    try: 
        yield db 
    finally: 
        db.close()
