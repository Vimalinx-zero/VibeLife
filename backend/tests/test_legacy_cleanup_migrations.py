import importlib
import os
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path


TEST_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = TEST_ROOT.parent

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def load_database_module(db_path: Path):
    os.environ["VIBELIFE_DB_PATH"] = str(db_path)

    existing = sys.modules.get("database")
    if existing is not None and hasattr(existing, "engine"):
        existing.engine.dispose()
        return importlib.reload(existing)

    return importlib.import_module("database")


class LegacyCleanupMigrationsTest(unittest.TestCase):
    def create_db(self):
        temp_dir = tempfile.TemporaryDirectory()
        db_path = Path(temp_dir.name) / "legacy-cleanup.db"
        return temp_dir, db_path

    def test_migration_merges_and_drops_study_sessions_even_if_focus_table_exists(self):
        temp_dir, db_path = self.create_db()
        self.addCleanup(temp_dir.cleanup)

        with sqlite3.connect(db_path) as conn:
            conn.execute(
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
            conn.execute(
                """
                CREATE TABLE study_sessions (
                    id VARCHAR PRIMARY KEY,
                    user_id VARCHAR NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    mode VARCHAR NOT NULL,
                    tasks_completed INTEGER DEFAULT 0,
                    created_at VARCHAR
                )
                """
            )
            conn.execute(
                """
                INSERT INTO focus_sessions (
                    id, user_id, duration_minutes, mode, tasks_completed, created_at
                ) VALUES ('focus-1', 'user-1', 25, 'classic', 1, '2026-03-16T10:00:00')
                """
            )
            conn.execute(
                """
                INSERT INTO study_sessions (
                    id, user_id, duration_minutes, mode, tasks_completed, created_at
                ) VALUES ('study-1', 'user-1', 50, 'flow', 2, '2026-03-16T11:00:00')
                """
            )
            conn.commit()

        database = load_database_module(db_path)
        database.run_legacy_cleanup_migrations()

        with sqlite3.connect(db_path) as conn:
            tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            focus_ids = {
                row[0]
                for row in conn.execute("SELECT id FROM focus_sessions ORDER BY id")
            }

        self.assertNotIn("study_sessions", tables)
        self.assertEqual(focus_ids, {"focus-1", "study-1"})

    def test_migration_merges_and_drops_learning_sessions_even_if_activity_table_exists(self):
        temp_dir, db_path = self.create_db()
        self.addCleanup(temp_dir.cleanup)

        with sqlite3.connect(db_path) as conn:
            conn.execute(
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
            conn.execute(
                """
                CREATE TABLE learning_sessions (
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
            conn.execute(
                """
                INSERT INTO activity_checkpoints (
                    id, user_id, type, focus_item_id, start_time, end_time, duration, pomodoro_count, created_at
                ) VALUES (1, 'user-1', 'workbench', 'todo-1', '2026-03-16T09:00:00', '2026-03-16T09:25:00', 1500, 1, '2026-03-16T09:25:00')
                """
            )
            conn.execute(
                """
                INSERT INTO learning_sessions (
                    id, user_id, type, focus_item_id, start_time, end_time, duration, pomodoro_count, created_at
                ) VALUES (2, 'user-1', 'notes', 'note-1', '2026-03-16T10:00:00', '2026-03-16T10:15:00', 900, 0, '2026-03-16T10:15:00')
                """
            )
            conn.commit()

        database = load_database_module(db_path)
        database.run_legacy_cleanup_migrations()

        with sqlite3.connect(db_path) as conn:
            tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            checkpoint_ids = {
                row[0]
                for row in conn.execute("SELECT id FROM activity_checkpoints ORDER BY id")
            }

        self.assertNotIn("learning_sessions", tables)
        self.assertEqual(checkpoint_ids, {1, 2})


if __name__ == "__main__":
    unittest.main()
