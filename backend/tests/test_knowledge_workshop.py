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

os.environ["VIBELIFE_DB_PATH"] = str(Path(TEMP_DIR.name) / "test-knowledge-workshop.db")

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import database  # noqa: E402
from ai.vector_store import VectorStore  # noqa: E402
from database import SessionLocal  # noqa: E402
from main import app  # noqa: E402
import models  # noqa: E402


class KnowledgeWorkshopMigrationTest(unittest.TestCase):
    def test_legacy_quick_capture_rows_gain_unified_knowledge_fields(self):
        temp_dir = tempfile.TemporaryDirectory()
        db_path = Path(temp_dir.name) / "legacy-knowledge.db"

        conn = sqlite3.connect(db_path)
        conn.executescript(
            """
            CREATE TABLE quick_note_captures (
                id VARCHAR PRIMARY KEY,
                user_id VARCHAR NOT NULL,
                project_id VARCHAR,
                source_type VARCHAR,
                source_uri TEXT,
                title VARCHAR,
                normalized_markdown TEXT,
                summary TEXT,
                tags JSON,
                metadata JSON,
                created_at VARCHAR,
                updated_at VARCHAR
            );

            INSERT INTO quick_note_captures (
                id, user_id, project_id, source_type, source_uri, title,
                normalized_markdown, summary, tags, metadata, created_at, updated_at
            ) VALUES (
                'capture_legacy',
                'user_1',
                'project_alpha',
                'url',
                'https://example.com',
                '旧采集',
                '旧内容',
                '旧摘要',
                '[]',
                '{}',
                '2026-03-18T08:00:00',
                '2026-03-18T08:00:00'
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
                for row in migrated.exec_driver_sql("PRAGMA table_info(quick_note_captures)")
            }
            row = migrated.execute(
                text(
                    """
                    SELECT content_kind, category, source_capture_ids, source_filter_snapshot, discussion_metadata
                    FROM quick_note_captures
                    WHERE id = 'capture_legacy'
                    """
                )
            ).first()

        self.assertIn("content_kind", columns)
        self.assertIn("category", columns)
        self.assertIn("source_capture_ids", columns)
        self.assertIn("source_filter_snapshot", columns)
        self.assertIn("discussion_metadata", columns)
        self.assertEqual(row[0], "collected")
        self.assertIsNone(row[1])
        self.assertEqual(row[2], "[]")
        self.assertIsNone(row[3])
        self.assertIsNone(row[4])


class KnowledgeWorkshopApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        self.vector_dir = tempfile.TemporaryDirectory()
        self.vector_store = VectorStore(data_dir=str(Path(self.vector_dir.name) / "vectors"))
        self.vector_patches = [
            patch("quick_capture_routes.get_vector_store", return_value=self.vector_store),
            patch("knowledge_routes.get_vector_store", return_value=self.vector_store),
        ]
        for item in self.vector_patches:
            item.start()

    def tearDown(self):
        for item in reversed(self.vector_patches):
            item.stop()
        self.vector_dir.cleanup()

    def register_user(self):
        suffix = str(time.time_ns())
        payload = {
            "username": f"knowledge-{suffix}",
            "email": f"knowledge-{suffix}@example.com",
            "password": "secret123",
            "full_name": "Knowledge User",
        }
        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        return body["user_id"], {"Authorization": f"Bearer {body['access_token']}"}

    def create_capture(
        self,
        headers,
        *,
        source_type: str = "text",
        source_uri: str,
        title: str,
        project_id: str | None = None,
        category: str | None = None,
        tags: list[str] | None = None,
    ):
        response = self.client.post(
            "/api/quick-capture",
            headers=headers,
            json={
                "source_type": source_type,
                "source_uri": source_uri,
                "title": title,
                "project_id": project_id,
                "category": category,
                "tags": tags or [],
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["capture"]

    def test_quick_capture_list_filters_by_content_kind_project_and_category(self):
        _user_id, headers = self.register_user()
        self.create_capture(
            headers,
            source_uri="收集内容 alpha",
            title="收集 A",
            project_id="project_alpha",
            category="research",
            tags=["研究"],
        )
        generated_response = self.client.post(
            "/api/knowledge/generated",
            headers=headers,
            json={
                "title": "生成 B",
                "content_markdown": "# B",
                "tags": ["总结"],
                "project_id": "project_alpha",
                "category": "summary",
                "source_capture_ids": [],
                "source_filter_snapshot": None,
                "discussion_metadata": None,
            },
        )
        self.assertEqual(generated_response.status_code, 200, generated_response.text)

        response = self.client.get(
            "/api/quick-capture",
            headers=headers,
            params={
                "content_kind": "generated",
                "project_id": "project_alpha",
                "category": "summary",
            },
        )

        self.assertEqual(response.status_code, 200, response.text)
        captures = response.json()["captures"]
        self.assertEqual(len(captures), 1)
        self.assertEqual(captures[0]["content_kind"], "generated")
        self.assertEqual(captures[0]["category"], "summary")

    def test_quick_capture_search_returns_unified_metadata_and_generated_entries(self):
        _user_id, headers = self.register_user()
        collected = self.create_capture(
            headers,
            source_uri="结构化知识整理",
            title="收集 A",
            project_id="project_alpha",
            category="research",
            tags=["研究"],
        )
        generated_response = self.client.post(
            "/api/knowledge/generated",
            headers=headers,
            json={
                "title": "生成总结",
                "content_markdown": "# 结构化知识总结",
                "tags": ["总结", "研究"],
                "project_id": "project_alpha",
                "category": "research",
                "source_capture_ids": [collected["id"]],
                "source_filter_snapshot": {
                    "content_kind": "collected",
                    "project_id": "project_alpha",
                    "category": "research",
                    "selected_entry_ids": [collected["id"]],
                },
                "discussion_metadata": None,
            },
        )
        self.assertEqual(generated_response.status_code, 200, generated_response.text)
        generated_id = generated_response.json()["entry"]["id"]

        search_response = self.client.get(
            "/api/quick-capture/search",
            headers=headers,
            params={"query": "结构化知识总结", "content_kind": "generated"},
        )

        self.assertEqual(search_response.status_code, 200, search_response.text)
        results = search_response.json()["results"]
        self.assertTrue(any(item["id"] == generated_id for item in results))
        target = next(item for item in results if item["id"] == generated_id)
        self.assertEqual(target["content_kind"], "generated")
        self.assertEqual(target["category"], "research")

    def test_discuss_entry_mode_returns_reply_citations_and_draft(self):
        user_id, headers = self.register_user()
        capture = self.create_capture(
            headers,
            source_uri="这是单条讨论内容",
            title="单条条目",
            project_id="project_alpha",
            category="research",
            tags=["研究"],
        )
        captured_calls: dict[str, object] = {}

        async def fake_generate(**kwargs):
            captured_calls.update(kwargs)
            return "这是 AI 整理后的单条回复"

        with patch("knowledge_routes._generate_knowledge_reply", side_effect=fake_generate):
            response = self.client.post(
                "/api/knowledge/discuss",
                headers=headers,
                json={
                    "mode": "entry",
                    "message": "请提炼要点",
                    "entry_id": capture["id"],
                    "history": [{"role": "user", "content": "上一轮问题"}],
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["context_mode"], "entry")
        self.assertEqual(payload["reply"], "这是 AI 整理后的单条回复")
        self.assertEqual(payload["citations"][0]["id"], capture["id"])
        self.assertEqual(payload["draft"]["project_id"], "project_alpha")
        self.assertEqual(captured_calls["current_user_id"], user_id)
        self.assertEqual(captured_calls["context"]["entry"]["id"], capture["id"])

    def test_discuss_selection_mode_caps_context_to_eight_entries(self):
        _user_id, headers = self.register_user()
        created_ids = []
        for index in range(10):
            capture = self.create_capture(
                headers,
                source_uri=f"第 {index} 条内容",
                title=f"条目 {index}",
                project_id="project_alpha",
                category="research",
                tags=["研究"],
            )
            created_ids.append(capture["id"])

        captured_calls: dict[str, object] = {}

        async def fake_generate(**kwargs):
            captured_calls.update(kwargs)
            return "这是 AI 整理后的集合回复"

        with patch("knowledge_routes._generate_knowledge_reply", side_effect=fake_generate):
            response = self.client.post(
                "/api/knowledge/discuss",
                headers=headers,
                json={
                    "mode": "selection",
                    "message": "请帮我做集合整理",
                    "history": [{"role": "user", "content": f"历史 {index}"} for index in range(15)],
                    "selection": {
                        "content_kind": "collected",
                        "project_id": "project_alpha",
                        "category": "research",
                        "selected_entry_ids": created_ids,
                    },
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["context_mode"], "selection")
        self.assertEqual(len(payload["citations"]), 8)
        self.assertEqual(len(captured_calls["history"]), 12)
        self.assertEqual(len(captured_calls["context"]["entries"]), 8)

    def test_append_generated_entry_merges_metadata_and_reindexes(self):
        _user_id, headers = self.register_user()
        source_a = self.create_capture(
            headers,
            source_uri="原始来源 A",
            title="来源 A",
            project_id="project_alpha",
            category="research",
            tags=["研究"],
        )
        source_b = self.create_capture(
            headers,
            source_uri="原始来源 B",
            title="来源 B",
            project_id="project_alpha",
            category="research",
            tags=["补充"],
        )

        generated_response = self.client.post(
            "/api/knowledge/generated",
            headers=headers,
            json={
                "title": "生成笔记",
                "content_markdown": "# 结构化草稿",
                "tags": ["总结"],
                "project_id": "project_alpha",
                "category": "research",
                "source_capture_ids": [source_a["id"]],
                "source_filter_snapshot": None,
                "discussion_metadata": {"mode": "entry"},
            },
        )
        self.assertEqual(generated_response.status_code, 200, generated_response.text)
        entry = generated_response.json()["entry"]

        append_response = self.client.post(
            f"/api/knowledge/generated/{entry['id']}/append",
            headers=headers,
            json={
                "content_markdown": "## 新追加段落",
                "tags": ["复盘", "总结"],
                "source_capture_ids": [source_b["id"]],
                "source_filter_snapshot": {"content_kind": "collected"},
                "discussion_metadata": {"mode": "selection"},
            },
        )
        self.assertEqual(append_response.status_code, 200, append_response.text)
        updated = append_response.json()["entry"]
        self.assertIn("## 新追加段落", updated["normalized_markdown"])
        self.assertEqual(updated["source_capture_ids"], [source_a["id"], source_b["id"]])
        self.assertEqual(updated["discussion_metadata"], {"mode": "selection"})

        search_response = self.client.get(
            "/api/quick-capture/search",
            headers=headers,
            params={"query": "新追加段落", "content_kind": "generated"},
        )
        self.assertEqual(search_response.status_code, 200, search_response.text)
        results = search_response.json()["results"]
        self.assertTrue(any(item["id"] == entry["id"] for item in results))


if __name__ == "__main__":
    unittest.main()
