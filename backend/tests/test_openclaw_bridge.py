import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


TEST_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = TEST_ROOT.parent

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import openclaw_bridge  # noqa: E402


class OpenClawBridgeTest(unittest.TestCase):
    def setUp(self):
        openclaw_bridge._verified_agents.clear()
        openclaw_bridge._verified_agents.add("main")

    def test_ensure_openclaw_agent_reuses_existing_agent_even_with_warning_prefixed_json(self):
        list_output = (
            'Config warnings:\\n- plugins.entries.skillhub: plugin disabled (not in allowlist) but config is present\n'
            '[\n'
            '  {"id":"vibelife-u_138603f6","workspace":"/tmp/workspace-vibelife"}\n'
            ']'
        )

        def fake_run(command, *, timeout_seconds):
            class Result:
                def __init__(self, returncode, stdout="", stderr=""):
                    self.returncode = returncode
                    self.stdout = stdout
                    self.stderr = stderr

            if command[:3] == ["openclaw", "agents", "list"]:
                return Result(0, stdout=list_output)
            raise AssertionError(f"unexpected command: {command}")

        with patch("openclaw_bridge._run_openclaw_command", side_effect=fake_run):
            openclaw_bridge.ensure_openclaw_agent("vibelife-u_138603f6", timeout_seconds=5)

        self.assertIn("vibelife-u_138603f6", openclaw_bridge._verified_agents)

    def test_ensure_openclaw_agent_treats_already_exists_add_error_as_success(self):
        def fake_run(command, *, timeout_seconds):
            class Result:
                def __init__(self, returncode, stdout="", stderr=""):
                    self.returncode = returncode
                    self.stdout = stdout
                    self.stderr = stderr

            if command[:3] == ["openclaw", "agents", "list"]:
                return Result(0, stdout="[]")
            if command[:4] == ["openclaw", "config", "get", "agents.defaults.model.primary"]:
                return Result(0, stdout='"rightcodes/gpt-5.4"')
            if command[:3] == ["openclaw", "agents", "add"]:
                return Result(
                    1,
                    stderr='Agent "vibelife-u_138603f6" already exists.',
                )
            raise AssertionError(f"unexpected command: {command}")

        with patch("openclaw_bridge._run_openclaw_command", side_effect=fake_run):
            openclaw_bridge.ensure_openclaw_agent("vibelife-u_138603f6", timeout_seconds=5)

        self.assertIn("vibelife-u_138603f6", openclaw_bridge._verified_agents)

    def test_run_openclaw_agent_returns_structured_result_with_raw_payloads(self):
        stdout = '{"content":"已创建待办 todo_123","payloads":[{"tool":"vibelife_todo_create","isError":false,"result":{"id":"todo_123","text":"补测试"}}]}'

        class FakeProcess:
            def __init__(self):
                self.returncode = 0

            def poll(self):
                return 0

            def communicate(self):
                return stdout, ""

        with patch("openclaw_bridge.ensure_openclaw_agent"), patch(
            "openclaw_bridge.subprocess.Popen", return_value=FakeProcess()
        ), patch(
            "openclaw_bridge._read_latest_session_reply", return_value=""
        ):
            result = openclaw_bridge.run_openclaw_agent("test message")

        self.assertIsInstance(result, dict)
        self.assertEqual(result["reply"], "已创建待办 todo_123")
        self.assertEqual(
            result["raw_payloads"],
            [
                {
                    "tool": "vibelife_todo_create",
                    "isError": False,
                    "result": {"id": "todo_123", "text": "补测试"},
                }
            ],
        )
        self.assertEqual(result["parsed"]["content"], "已创建待办 todo_123")

    def test_run_openclaw_agent_preserves_payloads_when_reply_recovered_from_session(self):
        parsed = {
            "payloads": [
                {
                    "tool": "vibelife_project_update",
                    "isError": False,
                    "result": {"id": "project_1", "status": "需关注"},
                }
            ]
        }

        class FakeProcess:
            def __init__(self):
                self.pid = 123
                self.returncode = None

            def poll(self):
                return None

        with patch("openclaw_bridge.ensure_openclaw_agent"), patch(
            "openclaw_bridge.subprocess.Popen", return_value=FakeProcess()
        ), patch(
            "openclaw_bridge.time.monotonic", side_effect=[0, 0, 121]
        ), patch("openclaw_bridge.time.sleep"), patch(
            "openclaw_bridge._read_latest_session_reply",
            side_effect=["", "会话恢复回复"],
        ), patch(
            "openclaw_bridge._terminate_openclaw_process",
            return_value=(json.dumps(parsed, ensure_ascii=False), ""),
        ):
            result = openclaw_bridge.run_openclaw_agent("test message")

        self.assertEqual(result["reply"], "会话恢复回复")
        self.assertEqual(result["raw_payloads"], parsed["payloads"])
        self.assertEqual(result["parsed"], parsed)


if __name__ == "__main__":
    unittest.main()
