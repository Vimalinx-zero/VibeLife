import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


TEST_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = TEST_ROOT.parent

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

if "bcrypt" not in sys.modules:
    bcrypt_stub = types.ModuleType("bcrypt")
    bcrypt_stub.gensalt = lambda: b"salt"
    bcrypt_stub.hashpw = lambda password, salt: b"hashed:" + password
    bcrypt_stub.checkpw = lambda password, hashed: hashed == b"hashed:" + password
    sys.modules["bcrypt"] = bcrypt_stub

if "jose" not in sys.modules:
    jose_stub = types.ModuleType("jose")

    class JWTError(Exception):
        pass

    class JwtStub:
        @staticmethod
        def encode(data, key, algorithm=None):
            return str(data.get("sub") or "token")

        @staticmethod
        def decode(token, key, algorithms=None):
            return {"sub": token}

    jose_stub.JWTError = JWTError
    jose_stub.jwt = JwtStub
    sys.modules["jose"] = jose_stub

import ai_routes  # noqa: E402


class AiChatEffectsApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app = FastAPI()
        app.include_router(ai_routes.router)
        app.dependency_overrides[ai_routes.get_current_user_id] = lambda: "u_test"
        cls.client = TestClient(app)

    def test_chat_returns_effect_contract_for_recognized_vibelife_payloads(self):
        openclaw_result = {
            "reply": "已处理工作台更新。",
            "raw_payloads": [
                {
                    "tool": "vibelife_project_update",
                    "isError": False,
                    "result": {"id": "project_1", "status": "需关注"},
                },
                {
                    "tool": "vibelife_todo_create",
                    "isError": False,
                    "result": {"id": "todo_1", "text": "补测试"},
                },
                {
                    "tool": "vibelife_project_step_update",
                    "isError": False,
                    "result": {"id": "step_1", "title": "完善接口"},
                },
            ],
            "parsed": {"payloads": []},
        }

        with patch("ai_routes.run_openclaw_agent", return_value=openclaw_result):
            response = self.client.post(
                "/api/ai/chat",
                json={"message": "帮我更新项目和待办"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["provider"], "openclaw")
        self.assertEqual(body["reply"], "已处理工作台更新。")
        self.assertNotIn("provider", body["runMeta"])
        self.assertEqual(body["refreshHints"], ["todo", "insights"])
        self.assertEqual(body["runMeta"]["outcome"], "success")
        self.assertTrue(body["runMeta"]["executedAt"])
        self.assertEqual(
            body["effects"],
            [
                {
                    "entity": "project",
                    "action": "update",
                    "count": 1,
                    "ids": ["project_1"],
                    "summary": "更新了 1 个项目",
                },
                {
                    "entity": "todo",
                    "action": "create",
                    "count": 1,
                    "ids": ["todo_1"],
                    "summary": "创建了 1 个待办",
                },
                {
                    "entity": "project_step",
                    "action": "update",
                    "count": 1,
                    "ids": ["step_1"],
                    "summary": "更新了 1 个项目步骤",
                },
            ],
        )

    def test_chat_returns_empty_effects_and_refresh_hints_for_plain_reply(self):
        openclaw_result = {
            "reply": "这是普通聊天回复。",
            "raw_payloads": [],
            "parsed": {"content": "这是普通聊天回复。"},
        }

        with patch("ai_routes.run_openclaw_agent", return_value=openclaw_result):
            response = self.client.post(
                "/api/ai/chat",
                json={"message": "只是聊聊"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["effects"], [])
        self.assertEqual(body["refreshHints"], [])
        self.assertEqual(body["runMeta"]["outcome"], "success")

    def test_chat_returns_partial_when_reply_exists_but_effect_extraction_is_incomplete(self):
        openclaw_result = {
            "reply": "我已经处理了一部分。",
            "raw_payloads": [
                {
                    "tool": "vibelife_todo_create",
                    "isError": False,
                    "result": ["unexpected-shape"],
                },
                {
                    "tool": "vibelife_note_update",
                    "isError": False,
                    "result": {"id": "note_1"},
                },
            ],
            "parsed": {"payloads": []},
        }

        with patch("ai_routes.run_openclaw_agent", return_value=openclaw_result):
            response = self.client.post(
                "/api/ai/chat",
                json={"message": "处理一下"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["effects"], [])
        self.assertEqual(body["refreshHints"], [])
        self.assertEqual(body["runMeta"]["outcome"], "partial")
        self.assertNotEqual(body["runMeta"]["outcome"], "failed")

    def test_chat_returns_502_when_no_usable_reply_or_fallback_exists(self):
        openclaw_result = {
            "reply": "",
            "raw_payloads": [],
            "parsed": {"payloads": []},
        }

        with patch("ai_routes.run_openclaw_agent", return_value=openclaw_result):
            response = self.client.post(
                "/api/ai/chat",
                json={"message": "处理一下"},
            )

        self.assertEqual(response.status_code, 502, response.text)


if __name__ == "__main__":
    unittest.main()
