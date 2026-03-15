import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


TEST_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = TEST_ROOT.parent
TEMP_DIR = tempfile.TemporaryDirectory()

os.environ["VIBELIFE_DB_PATH"] = str(Path(TEMP_DIR.name) / "test-vibelife.db")

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from main import app  # noqa: E402


class ProjectCreateApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def register_user(self):
        suffix = str(time.time_ns())
        payload = {
            "username": f"openclaw-projects-{suffix}",
            "email": f"openclaw-projects-{suffix}@example.com",
            "password": "secret123",
            "full_name": "OpenClaw Projects",
        }
        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_create_project_returns_project_and_persists_to_list(self):
        headers = self.register_user()

        response = self.client.post(
            "/api/projects",
            headers=headers,
            json={
                "name": "Launch OpenClaw channel",
                "category": "work",
                "subtitle": "Wire VibeLife into OpenClaw",
                "status": "正常推进",
                "nextAction": "Finish project create API",
            },
        )

        self.assertEqual(response.status_code, 201, response.text)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["project"]["name"], "Launch OpenClaw channel")
        self.assertEqual(payload["project"]["category"], "work")
        self.assertEqual(
            payload["project"]["subtitle"], "Wire VibeLife into OpenClaw"
        )

        list_response = self.client.get("/api/projects", headers=headers)
        self.assertEqual(list_response.status_code, 200, list_response.text)
        listed_projects = list_response.json()["projects"]

        self.assertEqual(len(listed_projects), 1)
        self.assertEqual(listed_projects[0]["id"], payload["project"]["id"])
        self.assertEqual(listed_projects[0]["name"], "Launch OpenClaw channel")

    def test_create_project_applies_defaults_and_returns_serialized_shape(self):
        headers = self.register_user()

        response = self.client.post(
            "/api/projects",
            headers=headers,
            json={
                "name": "Bare minimum project",
            },
        )

        self.assertEqual(response.status_code, 201, response.text)
        payload = response.json()
        project = payload["project"]

        self.assertEqual(
            set(project.keys()),
            {
                "id",
                "name",
                "category",
                "subtitle",
                "status",
                "nextAction",
                "createdAt",
                "updatedAt",
            },
        )
        self.assertEqual(project["name"], "Bare minimum project")
        self.assertEqual(project["category"], "work")
        self.assertEqual(project["subtitle"], "")
        self.assertEqual(project["status"], "正常推进")
        self.assertEqual(project["nextAction"], "")
        self.assertTrue(project["createdAt"])
        self.assertTrue(project["updatedAt"])

    def test_seeded_projects_use_growth_category_instead_of_study(self):
        headers = self.register_user()

        response = self.client.get("/api/projects", headers=headers)

        self.assertEqual(response.status_code, 200, response.text)
        projects = response.json()["projects"]
        categories = {project["category"] for project in projects}

        self.assertIn("growth", categories)
        self.assertNotIn("study", categories)

    def test_notes_preview_endpoint_returns_note_summary(self):
        headers = self.register_user()

        create_response = self.client.post(
            "/api/notes/create",
            headers=headers,
            json={
                "type": "file",
                "name": "OpenClaw cleanup note",
                "content": "This is a cleanup summary for the VibeLife notes preview endpoint.",
            },
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        note_id = create_response.json()["item"]["id"]

        preview_response = self.client.get(
            f"/api/notes/preview?type=note&id={note_id}",
            headers=headers,
        )

        self.assertEqual(preview_response.status_code, 200, preview_response.text)
        preview = preview_response.json()
        self.assertTrue(preview["found"])
        self.assertEqual(preview["id"], note_id)
        self.assertEqual(preview["title"], "OpenClaw cleanup note")


if __name__ == "__main__":
    unittest.main()
