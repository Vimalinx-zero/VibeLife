import os
import sqlite3
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text


TEST_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = TEST_ROOT.parent
TEMP_DIR = tempfile.TemporaryDirectory()

os.environ["VIBELIFE_DB_PATH"] = str(Path(TEMP_DIR.name) / "test-workbench-todos.db")

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import database  # noqa: E402
from database import SessionLocal  # noqa: E402
from main import app  # noqa: E402
import models  # noqa: E402


class WorkbenchTodoMigrationTest(unittest.TestCase):
    def test_legacy_incomplete_todos_gain_contiguous_sort_order(self):
        temp_dir = tempfile.TemporaryDirectory()
        db_path = Path(temp_dir.name) / "legacy-workbench-todos.db"

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
                source VARCHAR DEFAULT 'manual',
                plan_batch_id VARCHAR,
                plan_date VARCHAR,
                created_at VARCHAR,
                completed_at VARCHAR,
                due_date VARCHAR
            );

            INSERT INTO todo_items (
                id, user_id, text, completed, priority, subject, source, created_at, due_date
            ) VALUES
                ('todo_due_soon', 'user_1', 'due soon', 0, 2, 'general', 'manual', '2026-03-17T09:30:00', '2026-03-18'),
                ('todo_due_later', 'user_1', 'due later', 0, 2, 'general', 'manual', '2026-03-17T09:00:00', '2026-03-20'),
                ('todo_no_due', 'user_1', 'no due', 0, 1, 'general', 'manual', '2026-03-17T08:00:00', NULL),
                ('todo_done', 'user_1', 'done', 1, 2, 'general', 'manual', '2026-03-17T07:00:00', '2026-03-17');
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
            rows = migrated.execute(
                text(
                    """
                    SELECT id, completed, sort_order
                    FROM todo_items
                    WHERE user_id = 'user_1'
                    ORDER BY id ASC
                    """
                )
            ).all()

        self.assertIn("sort_order", columns)
        sort_order_by_id = {row[0]: row[2] for row in rows if row[1] == 0}
        self.assertEqual(sort_order_by_id["todo_due_soon"], 1)
        self.assertEqual(sort_order_by_id["todo_due_later"], 2)
        self.assertEqual(sort_order_by_id["todo_no_due"], 3)


class WorkbenchTodoApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def register_user(self):
        suffix = str(time.time_ns())
        payload = {
            "username": f"workbench-todo-{suffix}",
            "email": f"workbench-todo-{suffix}@example.com",
            "password": "secret123",
            "full_name": "Workbench Todo User",
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
        created_at: str = "2026-03-17T09:00:00",
        completed_at: str | None = None,
        due_date: str | None = None,
        sort_order: int | None = None,
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
                    source="manual",
                    plan_batch_id=None,
                    plan_date=None,
                    created_at=created_at,
                    completed_at=completed_at,
                    due_date=due_date,
                    sort_order=sort_order,
                )
            )
            db.commit()

    def list_db_todos(self, user_id: str):
        with SessionLocal() as db:
            return (
                db.query(models.TodoItem)
                .filter(models.TodoItem.user_id == user_id)
                .order_by(models.TodoItem.sort_order.asc(), models.TodoItem.created_at.asc())
                .all()
            )

    def test_get_incomplete_todos_uses_sort_order(self):
        user_id, headers = self.register_user()
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_third",
            text_value="third",
            created_at="2026-03-17T12:00:00",
            sort_order=3,
        )
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_first",
            text_value="first",
            created_at="2026-03-17T12:30:00",
            sort_order=1,
        )
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_second",
            text_value="second",
            created_at="2026-03-17T11:30:00",
            sort_order=2,
        )

        response = self.client.get("/api/workbench/todos", headers=headers, params={"completed": "false"})

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual([item["id"] for item in payload], ["todo_first", "todo_second", "todo_third"])
        self.assertEqual([item["sort_order"] for item in payload], [1, 2, 3])

    def test_get_completed_todos_uses_completed_at_desc(self):
        user_id, headers = self.register_user()
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_done_old",
            text_value="done old",
            completed=True,
            created_at="2026-03-17T08:00:00",
            completed_at="2026-03-17T09:00:00",
        )
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_done_new",
            text_value="done new",
            completed=True,
            created_at="2026-03-17T07:00:00",
            completed_at="2026-03-17T10:00:00",
        )

        response = self.client.get("/api/workbench/todos", headers=headers, params={"completed": "true"})

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual([item["id"] for item in payload], ["todo_done_new", "todo_done_old"])

    def test_create_todo_appends_to_end_of_incomplete_order(self):
        user_id, headers = self.register_user()
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_existing_1",
            text_value="existing one",
            sort_order=1,
        )
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_existing_2",
            text_value="existing two",
            sort_order=2,
        )

        response = self.client.post(
            "/api/workbench/todos",
            headers=headers,
            json={"text": "new task", "priority": 1, "subject": "general"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["sort_order"], 3)

        ordered = self.client.get("/api/workbench/todos", headers=headers, params={"completed": "false"})
        self.assertEqual(ordered.status_code, 200, ordered.text)
        self.assertEqual([item["text"] for item in ordered.json()], ["existing one", "existing two", "new task"])

    def test_create_todo_keeps_remaining_incomplete_order_contiguous_after_completion_gap(self):
        user_id, headers = self.register_user()
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_existing_gap",
            text_value="existing gap",
            sort_order=3,
        )
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_done_gap",
            text_value="done gap",
            completed=True,
            completed_at="2026-03-17T10:00:00",
            sort_order=1,
        )

        response = self.client.post(
            "/api/workbench/todos",
            headers=headers,
            json={"text": "new task after gap", "priority": 1, "subject": "general"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["sort_order"], 2)

        ordered = self.client.get("/api/workbench/todos", headers=headers, params={"completed": "false"})
        self.assertEqual(ordered.status_code, 200, ordered.text)
        self.assertEqual([item["id"] for item in ordered.json()], ["todo_existing_gap", payload["id"]])
        self.assertEqual([item["sort_order"] for item in ordered.json()], [1, 2])

    def test_update_todo_validates_due_date_and_sets_completed_at(self):
        user_id, headers = self.register_user()
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_update",
            text_value="update me",
            sort_order=1,
        )

        invalid_response = self.client.put(
            "/api/workbench/todos/todo_update",
            headers=headers,
            json={"due_date": "03-18-2026"},
        )
        self.assertEqual(invalid_response.status_code, 422, invalid_response.text)

        valid_response = self.client.put(
            "/api/workbench/todos/todo_update",
            headers=headers,
            json={"due_date": "2026-03-18", "completed": True},
        )
        self.assertEqual(valid_response.status_code, 200, valid_response.text)
        payload = valid_response.json()
        self.assertEqual(payload["due_date"], "2026-03-18")
        self.assertTrue(payload["completed"])
        self.assertIsNotNone(payload["completed_at"])

    def test_reorder_endpoint_rewrites_contiguous_sort_order(self):
        user_id, headers = self.register_user()
        self.insert_todo(user_id=user_id, todo_id="todo_a", text_value="A", sort_order=1)
        self.insert_todo(user_id=user_id, todo_id="todo_b", text_value="B", sort_order=2)
        self.insert_todo(user_id=user_id, todo_id="todo_c", text_value="C", sort_order=3)

        response = self.client.post(
            "/api/workbench/todos/reorder",
            headers=headers,
            json={"ordered_ids": ["todo_c", "todo_a", "todo_b"]},
        )

        self.assertEqual(response.status_code, 200, response.text)
        ordered = self.list_db_todos(user_id)
        self.assertEqual([item.id for item in ordered if not item.completed], ["todo_c", "todo_a", "todo_b"])
        self.assertEqual([item.sort_order for item in ordered if not item.completed], [1, 2, 3])

    def test_reorder_rejects_completed_or_missing_ids(self):
        user_id, headers = self.register_user()
        self.insert_todo(user_id=user_id, todo_id="todo_live_1", text_value="live 1", sort_order=1)
        self.insert_todo(user_id=user_id, todo_id="todo_live_2", text_value="live 2", sort_order=2)
        self.insert_todo(
            user_id=user_id,
            todo_id="todo_done",
            text_value="done",
            completed=True,
            completed_at="2026-03-17T12:00:00",
        )

        response = self.client.post(
            "/api/workbench/todos/reorder",
            headers=headers,
            json={"ordered_ids": ["todo_live_2", "todo_done"]},
        )

        self.assertEqual(response.status_code, 400, response.text)

    def test_reorder_rejects_duplicate_and_foreign_ids(self):
        user_id, headers = self.register_user()
        other_user_id, _other_headers = self.register_user()
        self.insert_todo(user_id=user_id, todo_id="todo_dupe_live_1", text_value="live 1", sort_order=1)
        self.insert_todo(user_id=user_id, todo_id="todo_dupe_live_2", text_value="live 2", sort_order=2)
        self.insert_todo(user_id=other_user_id, todo_id="todo_other_user", text_value="other user", sort_order=1)

        duplicate_response = self.client.post(
            "/api/workbench/todos/reorder",
            headers=headers,
            json={"ordered_ids": ["todo_dupe_live_1", "todo_dupe_live_1"]},
        )
        self.assertEqual(duplicate_response.status_code, 422, duplicate_response.text)

        foreign_response = self.client.post(
            "/api/workbench/todos/reorder",
            headers=headers,
            json={"ordered_ids": ["todo_dupe_live_1", "todo_other_user"]},
        )
        self.assertEqual(foreign_response.status_code, 400, foreign_response.text)


if __name__ == "__main__":
    unittest.main()
