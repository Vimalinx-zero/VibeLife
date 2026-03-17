import json
import os
import re
import signal
import subprocess
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional


REPO_ROOT = Path(__file__).resolve().parent.parent
OPENCLAW_STATE_ROOT = Path.home() / ".openclaw"
DEFAULT_OPENCLAW_WORKSPACE = str(Path.home() / ".openclaw" / "workspace")
DEFAULT_VIBELIFE_WORKSPACE = str(Path.home() / ".openclaw" / "workspace-vibelife")
DEFAULT_OPENCLAW_MODEL = "rightcodes/gpt-5.4"
_verified_agents = {"main"}
_verified_agents_lock = threading.Lock()


class OpenClawBridgeError(RuntimeError):
    """Raised when an OpenClaw invocation fails."""


def build_vibelife_chat_prompt(
    user_message: str,
    history: Optional[List[Dict[str, Any]]] = None,
    context: Optional[Dict[str, Any]] = None,
    current_user_id: Optional[str] = None,
    *,
    tools_enabled: bool = True,
) -> str:
    guidance_lines = [
        "你是 VibeLife 的 AI 工作台助理。",
        "默认用简体中文回复，直接、简洁、可执行。",
        "不要编造已经读取或修改过的数据。",
        "引用工具返回的 ID、标题、状态时，请保持原样，不要缩写或改写。",
        "如果用户意图不明确，先提出最小必要澄清问题。",
        "如果你完成了动作，要明确说明你做了什么以及结果。",
        "如果你调用工具完成了写入或更新，最终回复里必须给出简短中文总结，并尽量包含对象类型和 ID。",
    ]

    if tools_enabled:
        guidance_lines.append(
            "当用户要求查看或修改 VibeLife 内的待办、笔记、日志、日程、项目数据时，优先调用可用的 VibeLife 工具，而不是口头假设已经完成。"
        )
        guidance_lines.append(
            "当用户要求准备工作台、安排今天开工或表达刚回来开始干活时，优先调用一体化的工作台准备工具，而不是分散调用多个工具。"
        )
    else:
        guidance_lines.append(
            "当前没有可执行工具；如果请求涉及读取或修改 VibeLife 数据，请明确说明当前会话无法直接落库。"
        )

    history_payload = history[-12:] if isinstance(history, list) else []
    context_payload = context if isinstance(context, dict) else {}

    sections = [
        "系统说明:\n" + "\n".join(f"- {line}" for line in guidance_lines),
        f"当前用户ID:\n{current_user_id or 'unknown'}",
        "最近对话历史(JSON):\n"
        + json.dumps(history_payload, ensure_ascii=False, indent=2),
        "当前上下文(JSON):\n"
        + json.dumps(context_payload, ensure_ascii=False, indent=2),
        f"用户当前消息:\n{user_message.strip()}",
    ]
    return "\n\n".join(sections)


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        chunks = []
        for item in value:
            text = _normalize_text(item)
            if text:
                chunks.append(text)
        return "\n".join(chunks).strip()
    if isinstance(value, dict):
        if value.get("type") == "text" and isinstance(value.get("text"), str):
            return value["text"].strip()
        if isinstance(value.get("content"), str):
            return value["content"].strip()
        if isinstance(value.get("text"), str):
            return value["text"].strip()
        if isinstance(value.get("message"), str):
            return value["message"].strip()
    return ""


def _extract_assistant_text(payload: Any) -> str:
    if payload is None:
        return ""
    if isinstance(payload, str):
        return payload.strip()
    if isinstance(payload, list):
        chunks = []
        for item in payload:
            text = _extract_assistant_text(item)
            if text:
                chunks.append(text)
        return "\n".join(chunks).strip()
    if not isinstance(payload, dict):
        return ""

    for key in ("result", "output", "data"):
        if key in payload:
            text = _extract_assistant_text(payload.get(key))
            if text:
                return text

    messages = payload.get("messages")
    if isinstance(messages, list):
        for message in reversed(messages):
            if not isinstance(message, dict):
                continue
            if message.get("role") not in {"assistant", "model"}:
                continue
            text = _normalize_text(message.get("content"))
            if text:
                return text

    payloads = payload.get("payloads")
    if isinstance(payloads, list):
        chunks = []
        for item in payloads:
            if not isinstance(item, dict) or item.get("isError"):
                continue
            text = _normalize_text(item.get("text") or item.get("content"))
            if text:
                chunks.append(text)
        if chunks:
            return "".join(chunks).strip()

    for key in ("content", "text", "response", "message"):
        text = _normalize_text(payload.get(key))
        if text:
            return text

    return ""


def _parse_openclaw_output(output: str) -> Any:
    text = output.strip()
    if not text:
        return None

    try:
        return json.loads(text)
    except Exception:
        pass

    lines = text.splitlines()

    for index, line in enumerate(lines):
        stripped = line.lstrip()
        if not stripped:
            continue
        if not (stripped.startswith("{") or stripped.startswith("[")):
            continue
        candidate = "\n".join(lines[index:]).strip()
        try:
            return json.loads(candidate)
        except Exception:
            continue

    for line in reversed(lines):
        candidate = line.strip()
        if not candidate:
            continue
        try:
            return json.loads(candidate)
        except Exception:
            continue

    return None


def _build_openclaw_fallback(parsed: Any) -> str:
    if not isinstance(parsed, dict):
        return ""

    error_text = _normalize_text(
        parsed.get("error")
        or parsed.get("errorMessage")
        or parsed.get("detail")
    )
    if error_text:
        return f"OpenClaw 未返回正常内容：{error_text}"

    meta = parsed.get("meta")
    meta_stop_reason = ""
    if isinstance(meta, dict):
        meta_stop_reason = str(meta.get("stopReason", "")).strip().lower()

    aborted = bool(parsed.get("aborted"))
    stop_reason = str(parsed.get("stopReason", "")).strip().lower() or meta_stop_reason

    if aborted or stop_reason == "error":
        return "OpenClaw 本次执行异常中断，未返回可展示内容。"

    if "payloads" in parsed:
        return (
            "OpenClaw 本次没有返回可展示内容，已忽略底层日志。"
            "如果这次涉及写入，请先刷新页面确认是否已落库，再决定是否重试。"
        )

    return ""


def _clean_assistant_reply(text: str) -> str:
    cleaned = str(text or "").replace("[[reply_to_current]]", "").strip()
    cleaned = re.sub(r"^(?:\[\[)+", "", cleaned).strip()
    return cleaned


def _resolve_openclaw_agent_id(agent: str, current_user_id: Optional[str]) -> str:
    base_agent = str(agent).strip() or "main"
    if base_agent == "main" or not isinstance(current_user_id, str) or not current_user_id.strip():
        return base_agent

    suffix = re.sub(r"[^a-z0-9_-]+", "-", current_user_id.strip().lower()).strip("-")
    if not suffix:
        return base_agent

    return f"{base_agent}-{suffix}"


def _resolve_openclaw_workspace(agent: str) -> str:
    normalized_agent = str(agent).strip()
    if normalized_agent == "vibelife" or normalized_agent.startswith("vibelife-"):
        return DEFAULT_VIBELIFE_WORKSPACE
    return DEFAULT_OPENCLAW_WORKSPACE


def _run_openclaw_command(command: List[str], *, timeout_seconds: int) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            cwd=REPO_ROOT,
            env=os.environ.copy(),
        )
    except FileNotFoundError as exc:
        raise OpenClawBridgeError("未找到 openclaw 命令") from exc
    except subprocess.TimeoutExpired as exc:
        raise OpenClawBridgeError("OpenClaw 调用超时") from exc


def _get_openclaw_config_value(path: str, *, fallback: str, timeout_seconds: int) -> str:
    result = _run_openclaw_command(
        ["openclaw", "config", "get", path, "--json"],
        timeout_seconds=timeout_seconds,
    )
    if result.returncode != 0:
        return fallback

    parsed = _parse_openclaw_output(result.stdout or result.stderr)
    if isinstance(parsed, str) and parsed.strip():
        return parsed.strip()
    return fallback


def ensure_openclaw_agent(
    agent: str,
    *,
    model: Optional[str] = None,
    timeout_seconds: int = 30,
) -> None:
    normalized_agent = str(agent).strip() or "main"
    if normalized_agent in _verified_agents:
        return

    with _verified_agents_lock:
        if normalized_agent in _verified_agents:
            return

        list_result = _run_openclaw_command(
            ["openclaw", "agents", "list", "--json"],
            timeout_seconds=timeout_seconds,
        )
        if list_result.returncode != 0:
            error_text = list_result.stderr.strip() or list_result.stdout.strip() or "unknown error"
            raise OpenClawBridgeError(f"OpenClaw 智能体列表读取失败: {error_text}")

        parsed_agents = _parse_openclaw_output(list_result.stdout)
        if isinstance(parsed_agents, list):
            for item in parsed_agents:
                if isinstance(item, dict) and str(item.get("id", "")).strip() == normalized_agent:
                    _verified_agents.add(normalized_agent)
                    return

        workspace = _resolve_openclaw_workspace(normalized_agent)
        if workspace == DEFAULT_OPENCLAW_WORKSPACE:
            workspace = _get_openclaw_config_value(
                "agents.defaults.workspace",
                fallback=DEFAULT_OPENCLAW_WORKSPACE,
                timeout_seconds=timeout_seconds,
            )
        target_model = (
            str(model).strip()
            if isinstance(model, str) and model.strip()
            else _get_openclaw_config_value(
                "agents.defaults.model.primary",
                fallback=DEFAULT_OPENCLAW_MODEL,
                timeout_seconds=timeout_seconds,
            )
        )

        add_command = [
            "openclaw",
            "agents",
            "add",
            normalized_agent,
            "--workspace",
            workspace,
            "--non-interactive",
            "--json",
        ]
        if target_model:
            add_command.extend(["--model", target_model])

        add_result = _run_openclaw_command(add_command, timeout_seconds=timeout_seconds)
        if add_result.returncode != 0:
            error_text = add_result.stderr.strip() or add_result.stdout.strip() or "unknown error"
            if "already exists" in error_text.lower():
                _verified_agents.add(normalized_agent)
                return
            raise OpenClawBridgeError(f"OpenClaw 智能体创建失败: {error_text}")

        _verified_agents.add(normalized_agent)


def _read_latest_session_reply(agent: str, user_message: str) -> str:
    session_store_path = OPENCLAW_STATE_ROOT / "agents" / agent / "sessions" / "sessions.json"
    if not session_store_path.exists():
        return ""

    try:
        session_store = json.loads(session_store_path.read_text(encoding="utf-8"))
    except Exception:
        return ""

    session_key = f"agent:{agent}:main"
    entry = session_store.get(session_key)
    if not isinstance(entry, dict):
        return ""

    session_file = entry.get("sessionFile")
    if not isinstance(session_file, str) or not session_file.strip():
        session_id = entry.get("sessionId")
        if not isinstance(session_id, str) or not session_id.strip():
            return ""
        session_file = str(session_store_path.parent / f"{session_id}.jsonl")

    transcript_path = Path(session_file)
    if not transcript_path.exists():
        return ""

    try:
        records = []
        for line in transcript_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                records.append(json.loads(line))
            except Exception:
                continue
    except Exception:
        return ""

    normalized_user_message = str(user_message).strip()
    if not normalized_user_message:
        return ""

    last_user_index = -1
    for index, record in enumerate(records):
        if record.get("type") != "message":
            continue
        message_payload = record.get("message")
        if not isinstance(message_payload, dict):
            continue
        if message_payload.get("role") != "user":
            continue
        transcript_user_text = _normalize_text(message_payload.get("content"))
        if (
            transcript_user_text == normalized_user_message
            or transcript_user_text.endswith(normalized_user_message)
        ):
            last_user_index = index

    if last_user_index < 0:
        return ""

    for record in reversed(records[last_user_index + 1 :]):
        if record.get("type") != "message":
            continue
        message_payload = record.get("message")
        if not isinstance(message_payload, dict):
            continue
        if message_payload.get("role") != "assistant":
            continue
        if str(message_payload.get("stopReason", "")).strip().lower() != "stop":
            continue
        text = _normalize_text(message_payload.get("content"))
        if text:
            return _clean_assistant_reply(text)

    return ""


def _terminate_openclaw_process(process: subprocess.Popen[str]) -> tuple[str, str]:
    if process.poll() is None:
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            stdout, stderr = process.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            stdout, stderr = process.communicate()
    else:
        stdout, stderr = process.communicate()

    return stdout or "", stderr or ""


def run_openclaw_agent(
    message: str,
    *,
    model: Optional[str] = None,
    thinking: str = "low",
    agent: str = "main",
    base_url: Optional[str] = None,
    auth_token: Optional[str] = None,
    current_user_id: Optional[str] = None,
    timeout_seconds: int = 120,
) -> str:
    target_agent = _resolve_openclaw_agent_id(agent, current_user_id)
    ensure_openclaw_agent(target_agent, model=model)

    command = [
        "openclaw",
        "agent",
        "--local",
        "--json",
        "--verbose",
        "off",
        "--agent",
        target_agent,
        "--thinking",
        str(thinking),
        "--timeout",
        str(timeout_seconds),
        "--message",
        message,
    ]

    env = os.environ.copy()
    if model:
        env["OPENCLAW_MODEL"] = str(model)
    if base_url:
        env["VIBELIFE_API_BASE_URL"] = base_url.rstrip("/")
    if auth_token:
        env["VIBELIFE_API_TOKEN"] = auth_token
        env["VIBELIFE_API_AUTH_TOKEN"] = auth_token
    if current_user_id:
        env["VIBELIFE_CURRENT_USER_ID"] = current_user_id
    env["VIBELIFE_OPENCLAW_AGENT_ID"] = target_agent

    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=REPO_ROOT,
            env=env,
            start_new_session=True,
        )
    except FileNotFoundError as exc:
        raise OpenClawBridgeError("未找到 openclaw 命令") from exc

    deadline = time.monotonic() + timeout_seconds
    stdout = ""
    stderr = ""

    while time.monotonic() < deadline:
        recovered_text = _read_latest_session_reply(target_agent, message)
        if recovered_text:
            _terminate_openclaw_process(process)
            return recovered_text

        if process.poll() is not None:
            stdout, stderr = process.communicate()
            break

        time.sleep(1)
    else:
        recovered_text = _read_latest_session_reply(target_agent, message)
        stdout, stderr = _terminate_openclaw_process(process)
        if recovered_text:
            return recovered_text

        parsed = _parse_openclaw_output(stdout)
        text = _clean_assistant_reply(_extract_assistant_text(parsed))
        if text:
            return text

        raise OpenClawBridgeError("OpenClaw 调用超时")

    stdout = (stdout or "").strip()
    stderr = (stderr or "").strip()
    recovered_text = _read_latest_session_reply(target_agent, message)

    if process.returncode != 0:
        if recovered_text:
            return recovered_text
        error_text = stderr or stdout or "unknown error"
        raise OpenClawBridgeError(f"OpenClaw 调用失败: {error_text}")

    if not stdout:
        if recovered_text:
            return recovered_text
        raise OpenClawBridgeError("OpenClaw 未返回内容")

    if recovered_text:
        return recovered_text

    parsed = _parse_openclaw_output(stdout)
    text = _clean_assistant_reply(_extract_assistant_text(parsed))
    if text:
        return text

    fallback = _build_openclaw_fallback(parsed)
    if fallback:
        return fallback

    return stdout
