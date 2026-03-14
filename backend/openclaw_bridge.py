import json
import os
import subprocess
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional


REPO_ROOT = Path(__file__).resolve().parent.parent


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
        "你是 Wilson，VibeLife 的 AI 工作台助理。",
        "默认用简体中文回复，直接、简洁、可执行。",
        "不要编造已经读取或修改过的数据。",
        "引用工具返回的 ID、标题、状态时，请保持原样，不要缩写或改写。",
        "如果用户意图不明确，先提出最小必要澄清问题。",
        "如果你完成了动作，要明确说明你做了什么以及结果。",
    ]

    if tools_enabled:
        guidance_lines.append(
            "当用户要求查看或修改 VibeLife 内的待办、笔记、项目数据时，优先调用可用的 VibeLife 工具，而不是口头假设已经完成。"
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
            return "\n".join(chunks).strip()

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
        if not stripped or stripped.startswith("["):
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
    command = [
        "openclaw",
        "agent",
        "--local",
        "--json",
        "--verbose",
        "off",
        "--agent",
        str(agent),
        "--session-id",
        f"vibelife-{uuid.uuid4()}",
        "--thinking",
        str(thinking),
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

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            cwd=REPO_ROOT,
            env=env,
        )
    except FileNotFoundError as exc:
        raise OpenClawBridgeError("未找到 openclaw 命令") from exc
    except subprocess.TimeoutExpired as exc:
        raise OpenClawBridgeError("OpenClaw 调用超时") from exc

    stdout = result.stdout.strip()
    stderr = result.stderr.strip()

    if result.returncode != 0:
        error_text = stderr or stdout or "unknown error"
        raise OpenClawBridgeError(f"OpenClaw 调用失败: {error_text}")

    if not stdout:
        raise OpenClawBridgeError("OpenClaw 未返回内容")

    parsed = _parse_openclaw_output(stdout)
    text = _extract_assistant_text(parsed)
    return text or stdout
