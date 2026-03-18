import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient


TEST_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = TEST_ROOT.parent
TEMP_DIR = tempfile.TemporaryDirectory()

os.environ["VIBELIFE_DB_PATH"] = str(Path(TEMP_DIR.name) / "test-vibelife-workbench-prepare.db")

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from ai_coach_service import CoachPlanValidationError  # noqa: E402
from database import SessionLocal  # noqa: E402
from main import app  # noqa: E402
import models  # noqa: E402


class WorkbenchPrepareApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def register_user(self):
        suffix = str(time.time_ns())
        payload = {
            "username": f"prepare-user-{suffix}",
            "email": f"prepare-user-{suffix}@example.com",
            "password": "secret123",
            "full_name": "Prepare User",
        }
        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        return body["user_id"], {"Authorization": f"Bearer {body['access_token']}"}

    def insert_project(
        self,
        *,
        user_id: str,
        project_id: str,
        name: str,
        category: str = "work",
        status: str = "正常推进",
        next_action: str = "",
        updated_at: str = "2026-03-17T09:00:00",
        steps: list[dict] | None = None,
    ):
        with SessionLocal() as db:
            db.add(
                models.Project(
                    id=project_id,
                    user_id=user_id,
                    name=name,
                    category=category,
                    subtitle="",
                    status=status,
                    next_action=next_action,
                    created_at=updated_at,
                    updated_at=updated_at,
                )
            )
            for index, step in enumerate(steps or []):
                db.add(
                    models.ProjectStep(
                        id=step.get("id") or f"{project_id}_step_{index}",
                        user_id=user_id,
                        project_id=project_id,
                        title=step["title"],
                        owner=step.get("owner", ""),
                        due=step.get("due", ""),
                        done=bool(step.get("done", False)),
                    )
                )
            db.commit()

    def insert_manual_todo(self, *, user_id: str, todo_id: str, text_value: str):
        with SessionLocal() as db:
            db.add(
                models.TodoItem(
                    id=todo_id,
                    user_id=user_id,
                    text=text_value,
                    source="manual",
                    priority=0,
                    subject="general",
                )
            )
            db.commit()

    def get_project(self, project_id: str):
        with SessionLocal() as db:
            return (
                db.query(models.Project)
                .filter(models.Project.id == project_id)
                .first()
            )

    def list_todos(self, user_id: str):
        with SessionLocal() as db:
            return (
                db.query(models.TodoItem)
                .filter(models.TodoItem.user_id == user_id)
                .order_by(models.TodoItem.id.asc())
                .all()
            )

    def test_prepare_returns_daily_plan_and_project_digest(self):
        user_id, headers = self.register_user()
        other_user_id, _other_headers = self.register_user()

        self.insert_project(
            user_id=user_id,
            project_id="project_alpha",
            name="Alpha",
            next_action="先补接口测试",
            updated_at="2026-03-17T10:00:00",
            steps=[
                {"id": "step_alpha_1", "title": "补接口测试", "owner": "AI", "due": "03-17", "done": False},
                {"id": "step_alpha_2", "title": "清理日志", "owner": "我", "due": "03-18", "done": True},
            ],
        )
        self.insert_project(
            user_id=user_id,
            project_id="project_beta",
            name="Beta",
            next_action="整理下一步",
            updated_at="2026-03-17T09:00:00",
            steps=[
                {"id": "step_beta_1", "title": "写总结", "owner": "我", "due": "03-17", "done": False},
            ],
        )
        self.insert_project(
            user_id=other_user_id,
            project_id="project_other",
            name="Other",
            next_action="should not leak",
            updated_at="2026-03-17T11:00:00",
            steps=[
                {"id": "step_other_1", "title": "hidden", "owner": "Other", "due": "03-17", "done": False},
            ],
        )

        with patch(
            "ai_workbench_service.refresh_today_plan",
            return_value={
                "success": True,
                "plan_batch_id": "plan_batch_123",
                "created_count": 2,
                "skipped_count": 0,
                "deleted_count": 1,
                "todos": [
                    {"id": "todo_new_1", "text": "plan item 1"},
                    {"id": "todo_new_2", "text": "plan item 2"},
                ],
                "provider": "openclaw",
            },
        ) as refresh_mock:
            response = self.client.post(
                "/api/ai/workbench/prepare",
                headers=headers,
                json={"date_key": "2026-03-17", "max_items": 4},
            )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["date_key"], "2026-03-17")
        self.assertEqual(payload["provider"], "openclaw")
        self.assertEqual(payload["daily_plan"]["plan_batch_id"], "plan_batch_123")
        self.assertEqual(payload["project_digest"]["count"], 2)
        self.assertEqual(
            [project["project_id"] for project in payload["project_digest"]["projects"]],
            ["project_alpha", "project_beta"],
        )
        self.assertEqual(
            payload["project_digest"]["projects"][0]["pending_steps"],
            [
                {
                    "id": "step_alpha_1",
                    "title": "补接口测试",
                    "owner": "AI",
                    "due": "03-17",
                }
            ],
        )
        self.assertIn("Alpha", payload["coach_message"])
        refresh_mock.assert_called_once()

    def test_prepare_requires_date_key(self):
        _user_id, headers = self.register_user()

        response = self.client.post(
            "/api/ai/workbench/prepare",
            headers=headers,
            json={"max_items": 3},
        )

        self.assertEqual(response.status_code, 422, response.text)

    def test_prepare_fails_when_daily_plan_refresh_fails_without_mutating_manual_todos(self):
        user_id, headers = self.register_user()
        self.insert_manual_todo(
            user_id=user_id,
            todo_id="todo_manual_keep",
            text_value="manual keep",
        )

        with patch(
            "ai_workbench_service.refresh_today_plan",
            side_effect=CoachPlanValidationError("daily refresh failed"),
        ):
            response = self.client.post(
                "/api/ai/workbench/prepare",
                headers=headers,
                json={"date_key": "2026-03-17", "max_items": 3},
            )

        self.assertEqual(response.status_code, 422, response.text)
        user_todos = self.list_todos(user_id)
        self.assertEqual([todo.id for todo in user_todos], ["todo_manual_keep"])

    def test_prepare_does_not_modify_project_records(self):
        user_id, headers = self.register_user()
        self.insert_project(
            user_id=user_id,
            project_id="project_keep",
            name="Keep Project",
            next_action="保留原 next action",
            updated_at="2026-03-17T08:00:00",
            steps=[
                {"id": "step_keep_1", "title": "保留 step", "owner": "我", "due": "03-18", "done": False},
            ],
        )

        before = self.get_project("project_keep")
        self.assertIsNotNone(before)

        with patch(
            "ai_workbench_service.refresh_today_plan",
            return_value={
                "success": True,
                "plan_batch_id": "plan_batch_keep",
                "created_count": 1,
                "skipped_count": 0,
                "deleted_count": 0,
                "todos": [{"id": "todo_new_keep", "text": "plan item keep"}],
                "provider": "openclaw",
            },
        ):
            response = self.client.post(
                "/api/ai/workbench/prepare",
                headers=headers,
                json={"date_key": "2026-03-17"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        after = self.get_project("project_keep")
        self.assertIsNotNone(after)
        self.assertEqual(after.next_action, "保留原 next action")
        self.assertEqual(after.updated_at, "2026-03-17T08:00:00")

    def test_prepare_forwards_invoking_openclaw_agent_id_from_header(self):
        _user_id, headers = self.register_user()
        headers = {
            **headers,
            "X-VibeLife-OpenClaw-Agent-Id": "vibelife-u_138603f6",
        }

        with patch(
            "ai_routes.prepare_workbench",
            return_value={
                "success": True,
                "date_key": "2026-03-18",
                "daily_plan": {"success": True, "created_count": 0},
                "project_digest": {"count": 0, "projects": []},
                "coach_message": "",
                "provider": "openclaw",
            },
        ) as prepare_mock:
            response = self.client.post(
                "/api/ai/workbench/prepare",
                headers=headers,
                json={"date_key": "2026-03-18", "max_items": 3},
            )

        self.assertEqual(response.status_code, 200, response.text)
        prepare_mock.assert_called_once()
        self.assertEqual(
            prepare_mock.call_args.kwargs["invoking_openclaw_agent_id"],
            "vibelife-u_138603f6",
        )


if __name__ == "__main__":
    unittest.main()
