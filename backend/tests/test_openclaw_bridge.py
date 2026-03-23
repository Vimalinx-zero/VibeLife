import json
import os
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
        openclaw_bridge._verified_agents.add(openclaw_bridge._verified_agent_key("main"))
        self.cli_prefix_patcher = patch(
            "openclaw_bridge._resolve_openclaw_cli_prefix",
            return_value=["openclaw"],
        )
        self.cli_prefix_patcher.start()
        self.addCleanup(self.cli_prefix_patcher.stop)

    def test_resolve_openclaw_cli_command_prefers_openclaw_binary(self):
        self.cli_prefix_patcher.stop()
        with patch("openclaw_bridge.shutil.which") as which_mock:
            which_mock.side_effect = lambda name: {
                "openclaw": "/usr/local/bin/openclaw",
                "npx": "/usr/bin/npx",
                "bunx": "/usr/bin/bunx",
            }.get(name)

            command = openclaw_bridge._build_openclaw_command("agents", "list", "--json")

        self.assertEqual(command, ["openclaw", "agents", "list", "--json"])

    def test_resolve_openclaw_cli_command_falls_back_to_npx(self):
        self.cli_prefix_patcher.stop()
        with patch("openclaw_bridge.shutil.which") as which_mock:
            which_mock.side_effect = lambda name: {
                "openclaw": None,
                "npx": "/usr/bin/npx",
                "bunx": None,
            }.get(name)

            command = openclaw_bridge._build_openclaw_command("agents", "list", "--json")

        self.assertEqual(command, ["npx", "--yes", "openclaw", "agents", "list", "--json"])

    def test_resolve_openclaw_cli_command_respects_env_override(self):
        self.cli_prefix_patcher.stop()
        with patch.dict(os.environ, {"OPENCLAW_BIN": "npx openclaw"}, clear=False), patch(
            "openclaw_bridge.shutil.which"
        ) as which_mock:
            which_mock.return_value = None

            command = openclaw_bridge._build_openclaw_command("agents", "list", "--json")

        self.assertEqual(command, ["npx", "openclaw", "agents", "list", "--json"])

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

        self.assertIn(
            openclaw_bridge._verified_agent_key("vibelife-u_138603f6"),
            openclaw_bridge._verified_agents,
        )

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

        self.assertIn(
            openclaw_bridge._verified_agent_key("vibelife-u_138603f6"),
            openclaw_bridge._verified_agents,
        )

    def test_ensure_openclaw_agent_updates_existing_agent_model_when_requested_model_differs(self):
        calls = []

        def fake_run(command, *, timeout_seconds):
            calls.append(command)

            class Result:
                def __init__(self, returncode, stdout="", stderr=""):
                    self.returncode = returncode
                    self.stdout = stdout
                    self.stderr = stderr

            if command[:3] == ["openclaw", "agents", "list"]:
                return Result(
                    0,
                    stdout=json.dumps(
                        [
                            {
                                "id": "vibelife-u_138603f6",
                                "workspace": "/tmp/workspace-vibelife",
                                "model": "rightcodes/gpt-5.4",
                            }
                        ]
                    ),
                )
            if command[:3] == ["openclaw", "config", "set"]:
                return Result(0, stdout="ok")
            raise AssertionError(f"unexpected command: {command}")

        with patch("openclaw_bridge._run_openclaw_command", side_effect=fake_run):
            openclaw_bridge.ensure_openclaw_agent(
                "vibelife-u_138603f6",
                model="zai/glm-4.7",
                timeout_seconds=5,
            )

        self.assertEqual(
            calls,
            [
                ["openclaw", "agents", "list", "--json"],
                [
                    "openclaw",
                    "config",
                    "set",
                    "agents.list[0].model",
                    '"zai/glm-4.7"',
                    "--strict-json",
                ],
            ],
        )
        self.assertIn(
            openclaw_bridge._verified_agent_key(
                "vibelife-u_138603f6",
                "zai/glm-4.7",
            ),
            openclaw_bridge._verified_agents,
        )

    def test_run_openclaw_agent_uses_shadow_agent_when_invoked_from_same_agent(self):
        class FakeProcess:
            def __init__(self):
                self.returncode = 0

            def poll(self):
                return 0

            def communicate(self):
                return '{"content":"ok"}', ""

        with patch("openclaw_bridge.ensure_openclaw_agent") as ensure_mock, patch(
            "openclaw_bridge.subprocess.Popen", return_value=FakeProcess()
        ), patch(
            "openclaw_bridge._read_latest_session_reply", return_value=""
        ):
            openclaw_bridge.run_openclaw_agent(
                "test message",
                agent="vibelife",
                current_user_id="u_138603f6",
                invoking_agent_id="vibelife-u_138603f6",
            )

        ensure_mock.assert_called_once_with("vibelife-u_138603f6-planner", model=None)

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
