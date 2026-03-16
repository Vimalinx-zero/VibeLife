import os
import sqlite3
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text


TEST_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = TEST_ROOT.parent
TEMP_DIR = tempfile.TemporaryDirectory()

os.environ["VIBELIFE_DB_PATH"] = str(Path(TEMP_DIR.name) / "test-vibelife.db")

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import database  # noqa: E402
from database import SessionLocal  # noqa: E402
from main import app  # noqa: E402
import models  # noqa: E402


class CoachPlanMigrationTest(unittest.TestCase):
    def test_legacy_todos_backfill_to_manual_source(self):
        temp_dir = tempfile.TemporaryDirectory()
        db_path = Path(temp_dir.name) / "legacy-todos.db"

        conn = sqlite3.connect(db_path)
        conn.executescript(
            """
            CREATE TABLE todo_items (
                id VARCHAR PRIMARY KEY,
                user_id VARCHAR NOT NULL,
                text VARCHAR NOT NULL,
                completed BOOLEAN DEFAULT 0,
                priority INTEGER DEFAULT 0,
                subject VARCHAR DEFAULT 'general',
                created_at VARCHAR,
                completed_at VARCHAR,
                due_date VARCHAR
            );

            INSERT INTO todo_items (
                id, user_id, text, completed, priority, subject, created_at
            ) VALUES (
                'todo_legacy_1', 'user_1', 'legacy todo', 0, 0, 'general', '2026-03-16T09:00:00'
            );
            """
        )
        conn.commit()
        conn.close()

        test_engine = create_engine(
            f"sqlite:///{db_path.as_posix()}",
            connect_args={"check_same_thread": False},
        )

        with patch.object(database, "engine", test_engine):
            database.run_legacy_cleanup_migrations()

        with test_engine.connect() as migrated:
            columns = {
                row[1]
                for row in migrated.exec_driver_sql("PRAGMA table_info(todo_items)")
            }
            row = migrated.execute(
                text(
                    "SELECT source, plan_batch_id, plan_date FROM todo_items WHERE id = 'todo_legacy_1'"
                )
            ).first()

        self.assertIn("source", columns)
        self.assertIn("plan_batch_id", columns)
        self.assertIn("plan_date", columns)
        self.assertEqual(row[0], "manual")
        self.assertIsNone(row[1])
        self.assertIsNone(row[2])


class CoachPlanApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def register_user(self):
        suffix = str(time.time_ns())
        payload = {
            "username": f"coach-plan-{suffix}",
            "email": f"coach-plan-{suffix}@example.com",
            "password": "secret123",
            "full_name": "Coach Plan User",
        }
        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        return body["user_id"], {"Authorization": f"Bearer {body['access_token']}"}

    def insert_todo(
        self,
        *,
        user_id: str,
        todo_id: str,
        text_value: str,
        completed: bool = False,
        priority: int = 0,
        subject: str = "general",
        source: str = "manual",
        plan_batch_id: str | None = None,
        plan_date: str | None = None,
        created_at: str = "2026-03-16T09:00:00",
        completed_at: str | None = None,
    ):
        with SessionLocal() as db:
            db.add(
                models.TodoItem(
                    id=todo_id,
                    user_id=user_id,
                    text=text_value,
                    completed=completed,
                    priority=priority,
                    subject=subject,
                    created_at=created_at,
                    completed_at=completed_at,
                    due_date=plan_date,
                    source=source,
                    plan_batch_id=plan_batch_id,
                    plan_date=plan_date,
                )
            )
            db.commit()

    def list_todos(self, user_id: str):
        with SessionLocal() as db:
            return (
                db.query(models.TodoItem)
                .filter(models.TodoItem.user_id == user_id)
                .order_by(models.TodoItem.id.asc())
                .all()
            )

    def test_workbench_todo_creation_returns_manual_source_by_default(self):
        _user_id, headers = self.register_user()

        response = self.client.post(
            "/api/workbench/todos",
            headers=headers,
            json={"text": "manual workbench todo"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["source"], "manual")
        self.assertIsNone(payload["plan_batch_id"])
        self.assertIsNone(payload["plan_date"])

    def test_get_today_returns_latest_ai_daily_batch_only(self):
        user_id, headers = self.register_user()
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_ai_old_done",
            text_value="old done",
            completed=True,
            completed_at="2026-03-16T08:00:00",
            source="ai_daily",
            plan_batch_id="batch_old",
            plan_date="2026-03-16",
            created_at="2026-03-16T08:00:00",
        )
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_ai_new_1",
            text_value="latest batch one",
            source="ai_daily",
            plan_batch_id="batch_new",
            plan_date="2026-03-16",
            created_at="2026-03-16T10:00:00",
        )
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_ai_new_2",
            text_value="latest batch two",
            source="ai_daily",
            plan_batch_id="batch_new",
            plan_date="2026-03-16",
            created_at="2026-03-16T10:01:00",
        )

        response = self.client.get(
            "/api/ai/coach/today",
            headers=headers,
            params={"date_key": "2026-03-16"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertTrue(payload["success"])
        titles = [item["title"] for item in payload["suggestions"]]
        self.assertEqual(titles, ["latest batch one", "latest batch two"])

    def test_refresh_replaces_only_current_users_ai_daily_for_date_key(self):
        user_id, headers = self.register_user()
        other_user_id, _other_headers = self.register_user()

        self.insert_todo(
            user_id=user_id,
            todo_id="todo_manual_keep",
            text_value="manual keep",
            source="manual",
        )
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_project_keep",
            text_value="project keep",
            source="project",
        )
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_ai_keep_done",
            text_value="done ai keep",
            completed=True,
            completed_at="2026-03-16T07:30:00",
            source="ai_daily",
            plan_batch_id="batch_old",
            plan_date="2026-03-16",
        )
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_ai_delete",
            text_value="delete me",
            source="ai_daily",
            plan_batch_id="batch_old",
            plan_date="2026-03-16",
        )
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_ai_other_day",
            text_value="other day keep",
            source="ai_daily",
            plan_batch_id="batch_prev",
            plan_date="2026-03-15",
        )
        self.insert_todo(
            user_id=other_user_id,
            todo_id="todo_ai_other_user",
            text_value="other user keep",
            source="ai_daily",
            plan_batch_id="batch_other",
            plan_date="2026-03-16",
        )

        with patch(
            "openclaw_bridge.run_openclaw_agent",
            return_value=(
                '{"coach_message":"今天先把关键项做掉","adaptive":{"level":"balanced","label":"稳步推进","focus":"先做关键项"},'
                '"todos":[{"text":"plan item 1","priority":2,"subject":"general","due_date":"2026-03-16"},'
                '{"text":"plan item 2","priority":1,"subject":"general","due_date":"2026-03-16"}]}'
            ),
        ):
            response = self.client.post(
                "/api/ai/coach/today/plan",
                headers=headers,
                json={"date_key": "2026-03-16", "max_items": 3},
            )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["created_count"], 2)
        self.assertEqual(payload["deleted_count"], 1)
        self.assertEqual(payload["skipped_count"], 0)

        user_todos = self.list_todos(user_id)
        remaining_ids = {todo.id for todo in user_todos}

        self.assertIn("todo_manual_keep", remaining_ids)
        self.assertIn("todo_project_keep", remaining_ids)
        self.assertIn("todo_ai_keep_done", remaining_ids)
        self.assertIn("todo_ai_other_day", remaining_ids)
        self.assertNotIn("todo_ai_delete", remaining_ids)

        new_ai_todos = [
            todo
            for todo in user_todos
            if todo.source == "ai_daily" and todo.plan_date == "2026-03-16" and not todo.completed
        ]
        self.assertEqual(len(new_ai_todos), 2)
        self.assertEqual({todo.text for todo in new_ai_todos}, {"plan item 1", "plan item 2"})
        self.assertEqual(len({todo.plan_batch_id for todo in new_ai_todos}), 1)

        other_user_todos = self.list_todos(other_user_id)
        self.assertEqual({todo.id for todo in other_user_todos}, {"todo_ai_other_user"})

    def test_empty_plan_does_not_delete_existing_ai_daily(self):
        user_id, headers = self.register_user()
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_ai_keep",
            text_value="keep old ai",
            source="ai_daily",
            plan_batch_id="batch_old",
            plan_date="2026-03-16",
        )

        with patch(
            "openclaw_bridge.run_openclaw_agent",
            return_value='{"coach_message":"暂无建议","adaptive":{"level":"balanced","label":"稳步推进","focus":"先维持节奏"},"todos":[]}',
        ):
            response = self.client.post(
                "/api/ai/coach/today/plan",
                headers=headers,
                json={"date_key": "2026-03-16", "max_items": 3},
            )

        self.assertEqual(response.status_code, 422, response.text)
        remaining_ids = {todo.id for todo in self.list_todos(user_id)}
        self.assertIn("todo_ai_keep", remaining_ids)

    def test_refresh_requires_date_key(self):
        _user_id, headers = self.register_user()

        response = self.client.post(
            "/api/ai/coach/today/plan",
            headers=headers,
            json={"max_items": 3},
        )

        self.assertEqual(response.status_code, 422, response.text)

    def test_concurrent_refresh_returns_conflict(self):
        user_id, headers = self.register_user()
        entered = threading.Event()
        release = threading.Event()
        errors: list[Exception] = []
        first_response = {}

        def slow_openclaw(*_args, **_kwargs):
            entered.set()
            release.wait(timeout=5)
            return (
                '{"coach_message":"今天先做一件事","adaptive":{"level":"balanced","label":"稳步推进","focus":"先做关键项"},'
                '"todos":[{"text":"slow item","priority":1,"subject":"general","due_date":"2026-03-16"}]}'
            )

        def run_first_request():
            try:
                first_response["value"] = self.client.post(
                    "/api/ai/coach/today/plan",
                    headers=headers,
                    json={"date_key": "2026-03-16", "max_items": 1},
                )
            except Exception as exc:  # pragma: no cover - test safety guard
                errors.append(exc)

        with patch("openclaw_bridge.run_openclaw_agent", side_effect=slow_openclaw):
            worker = threading.Thread(target=run_first_request)
            worker.start()
            self.assertTrue(entered.wait(timeout=5), "first refresh never entered openclaw")

            conflict_response = self.client.post(
                "/api/ai/coach/today/plan",
                headers=headers,
                json={"date_key": "2026-03-16", "max_items": 1},
            )

            release.set()
            worker.join(timeout=5)

        if errors:
            raise errors[0]

        self.assertEqual(conflict_response.status_code, 409, conflict_response.text)
        self.assertEqual(first_response["value"].status_code, 200, first_response["value"].text)
        user_todos = self.list_todos(user_id)
        self.assertEqual(
            [todo.text for todo in user_todos if todo.source == "ai_daily" and not todo.completed],
            ["slow item"],
        )


if __name__ == "__main__":
    unittest.main()
