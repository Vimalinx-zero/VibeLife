import asyncio
import datetime
import json
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import models
from auth import get_current_user_id
from database import get_db
from openclaw_bridge import (
    OpenClawBridgeError,
    build_vibelife_chat_prompt,
    ensure_openclaw_agent,
    run_openclaw_agent,
)


router = APIRouter()

SUPPORTED_PROVIDERS = {
    "local",
    "ollama",
    "openai",
    "deepseek",
    "openclaw",
    "custom",
}

DEFAULT_AI_CONFIG: Dict[str, Any] = {
    "provider": "openclaw",
    "ollama": {"baseURL": "http://localhost:11434", "model": "qwen:7b"},
    "openai": {
        "apiKey": "",
        "baseURL": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
    },
    "deepseek": {
        "apiKey": "",
        "baseURL": "https://api.deepseek.com/v1",
        "model": "deepseek-chat",
    },
    "openclaw": {
        "model": "rightcodes/gpt-5.4",
        "thinking": "low",
        "agent": "vibelife",
    },
    "custom": {"apiKey": "", "baseURL": "", "model": ""},
}

_ai_config: Dict[str, Any] = json.loads(json.dumps(DEFAULT_AI_CONFIG))
_ai_config_path = Path(__file__).resolve().parent / "data" / "ai_config.json"
_ai_config_path.parent.mkdir(parents=True, exist_ok=True)


def _deep_merge_dict(target: Dict[str, Any], source: Dict[str, Any]) -> Dict[str, Any]:
    for key, value in source.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            _deep_merge_dict(target[key], value)
        else:
            target[key] = value
    return target


def _load_ai_config() -> None:
    global _ai_config

    if not _ai_config_path.exists():
        return

    try:
        persisted = json.loads(_ai_config_path.read_text(encoding="utf-8"))
    except Exception:
        return

    if not isinstance(persisted, dict):
        return

    _ai_config = _deep_merge_dict(
        json.loads(json.dumps(DEFAULT_AI_CONFIG)),
        persisted,
    )


def _persist_ai_config() -> None:
    _ai_config_path.write_text(
        json.dumps(_ai_config, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


_load_ai_config()


def get_current_ai_config() -> Dict[str, Any]:
    return _ai_config


def _resolve_provider_and_model(
    requested: Optional[str],
) -> Tuple[str, Optional[str]]:
    requested_value = str(requested or "").strip().lower()
    configured_provider = str(_ai_config.get("provider", "openclaw")).strip().lower()

    if configured_provider not in SUPPORTED_PROVIDERS:
        configured_provider = "openclaw"

    if not requested_value or requested_value == "auto":
        return configured_provider, None

    if requested_value in SUPPORTED_PROVIDERS:
        return requested_value, None

    return configured_provider, str(requested).strip()


def _build_history_messages(history: Any, user_message: str) -> List[Dict[str, str]]:
    if not isinstance(history, list):
        return []

    messages: List[Dict[str, str]] = []
    for item in history[-12:]:
        if not isinstance(item, dict):
            continue

        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if role not in {"system", "user", "assistant"} or not content:
            continue

        messages.append({"role": role, "content": content})

    if (
        messages
        and messages[-1]["role"] == "user"
        and messages[-1]["content"].strip() == user_message.strip()
    ):
        messages.pop()

    return messages


def _compose_user_message(user_message: str, context: Any = None) -> str:
    payload = str(user_message or "").strip()
    if not payload:
        return payload

    if context is None:
        return payload

    try:
        context_json = json.dumps(context, ensure_ascii=False, indent=2)
    except TypeError:
        context_json = str(context)

    return f"{payload}\n\n当前上下文(JSON):\n{context_json}"


def _build_remote_messages(
    user_message: str,
    history: Any = None,
    context: Any = None,
) -> List[Dict[str, str]]:
    system_message = {
        "role": "system",
        "content": (
            "你是 VibeLife 的 AI 助手。默认使用简体中文回复，直接、简洁、可执行。"
            "不要假装已经读取或修改过系统数据；如果你没有执行过动作，就明确说明。"
        ),
    }
    prompt = _compose_user_message(user_message, context)
    history_messages = _build_history_messages(history, user_message)
    return [system_message, *history_messages, {"role": "user", "content": prompt}]


def _build_quick_qa_messages(question: str) -> List[Dict[str, str]]:
    return [
        {
            "role": "system",
            "content": "你是 VibeLife 的问答助手。用简体中文直接回答，尽量简洁但保留必要结构。",
        },
        {"role": "user", "content": str(question or "").strip()},
    ]


def _generate_local_reply(user_message: str, context: Any = None) -> str:
    message = str(user_message or "").strip()
    if not message:
        return "请先告诉我你希望我处理什么。"

    lowered = message.lower()

    if any(keyword in lowered for keyword in ("待办", "todo", "任务", "安排")):
        return (
            "如果你想让我帮你拆任务，最好直接给我目标、截止时间和限制条件。"
            "我可以按优先级、顺序和可执行动作帮你整理。"
        )

    if any(keyword in lowered for keyword in ("笔记", "note", "总结", "整理")):
        return "可以，把内容贴给我，我可以帮你总结、改写、提纲化，或者整理成笔记结构。"

    if any(keyword in lowered for keyword in ("项目", "project", "推进", "计划")):
        return (
            "项目类问题我建议先明确三个要素：当前阶段、下一步动作、阻塞点。"
            "给我这三项，我可以直接帮你拆成行动清单。"
        )

    if any(keyword in lowered for keyword in ("日程", "schedule", "今天", "安排")):
        return "可以。我能按时间块帮你排今天的安排，尽量保证先做高价值、低阻力的事项。"

    if context:
        return "我看到了你带来的上下文。告诉我你是想总结、改写、拆解，还是继续追问具体细节。"

    return "我可以帮你拆任务、整理笔记、梳理项目、规划今天安排。你直接说要我做什么即可。"


async def _call_ollama(
    config: Dict[str, Any],
    messages: List[Dict[str, str]],
    model_override: Optional[str] = None,
) -> str:
    base_url = str(config.get("baseURL") or "http://localhost:11434").rstrip("/")
    model_name = str(model_override or config.get("model") or "qwen:7b").strip()
    if not model_name:
        raise HTTPException(status_code=400, detail="Ollama 模型名称不能为空")

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{base_url}/api/chat",
            json={
                "model": model_name,
                "messages": messages,
                "stream": False,
            },
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Ollama 调用失败: {response.text[:300]}",
        )

    payload = response.json()
    message = payload.get("message")
    if isinstance(message, dict):
        content = str(message.get("content", "")).strip()
        if content:
            return content

    fallback = str(payload.get("response", "")).strip()
    if fallback:
        return fallback

    raise HTTPException(status_code=502, detail="Ollama 未返回内容")


async def _call_openai_compatible(
    provider: str,
    config: Dict[str, Any],
    messages: List[Dict[str, str]],
    model_override: Optional[str] = None,
) -> str:
    api_key = str(config.get("apiKey") or "").strip()
    base_url = str(config.get("baseURL") or "").rstrip("/")
    model_name = str(model_override or config.get("model") or "").strip()

    if not api_key:
        raise HTTPException(status_code=400, detail=f"{provider} API Key 不能为空")
    if not base_url:
        raise HTTPException(status_code=400, detail=f"{provider} Base URL 不能为空")
    if not model_name:
        raise HTTPException(status_code=400, detail=f"{provider} 模型名称不能为空")

    endpoint = f"{base_url}/chat/completions"

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            endpoint,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model_name,
                "messages": messages,
                "temperature": 0.4,
            },
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"{provider} 调用失败: {response.text[:300]}",
        )

    payload = response.json()
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise HTTPException(status_code=502, detail=f"{provider} 未返回可用结果")

    message = choices[0].get("message", {})
    content = message.get("content")

    if isinstance(content, str) and content.strip():
        return content.strip()

    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                text = str(item.get("text", "")).strip()
                if text:
                    parts.append(text)
        if parts:
            return "\n".join(parts).strip()

    raise HTTPException(status_code=502, detail=f"{provider} 返回内容为空")


async def _generate_provider_reply(
    *,
    provider: str,
    user_message: str,
    history: Any = None,
    context: Any = None,
    model_override: Optional[str] = None,
    raw_request: Optional[Request] = None,
    current_user_id: Optional[str] = None,
) -> str:
    normalized_provider = str(provider or "").strip().lower()

    if normalized_provider == "local":
        return _generate_local_reply(user_message, context)

    if normalized_provider == "openclaw":
        openclaw_config = get_current_ai_config().get("openclaw", {})
        authorization = raw_request.headers.get("authorization", "") if raw_request else ""
        auth_token = (
            authorization.split(" ", 1)[1]
            if authorization.lower().startswith("bearer ")
            else None
        )
        prompt = build_vibelife_chat_prompt(
            user_message,
            _build_history_messages(history, user_message),
            context if isinstance(context, dict) else None,
            current_user_id,
            tools_enabled=True,
        )

        try:
            return await asyncio.to_thread(
                run_openclaw_agent,
                prompt,
                model=model_override or openclaw_config.get("model", "rightcodes/gpt-5.4"),
                thinking=str(openclaw_config.get("thinking", "low")),
                agent=str(openclaw_config.get("agent", "vibelife")),
                base_url=str(raw_request.base_url).rstrip("/") if raw_request else None,
                auth_token=auth_token,
                current_user_id=current_user_id,
            )
        except OpenClawBridgeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    messages = _build_remote_messages(user_message, history, context)
    provider_config = get_current_ai_config().get(normalized_provider, {})

    if normalized_provider == "ollama":
        return await _call_ollama(provider_config, messages, model_override=model_override)

    if normalized_provider in {"openai", "deepseek", "custom"}:
        return await _call_openai_compatible(
            normalized_provider,
            provider_config,
            messages,
            model_override=model_override,
        )

    raise HTTPException(status_code=400, detail=f"不支持的 AI provider: {provider}")


async def _generate_quick_qa_reply(
    *,
    provider: str,
    question: str,
    model_override: Optional[str] = None,
    raw_request: Optional[Request] = None,
    current_user_id: Optional[str] = None,
) -> str:
    normalized_provider = str(provider or "").strip().lower()
    if normalized_provider == "local":
        return _generate_local_reply(question)

    if normalized_provider == "openclaw":
        openclaw_config = get_current_ai_config().get("openclaw", {})
        authorization = raw_request.headers.get("authorization", "") if raw_request else ""
        auth_token = (
            authorization.split(" ", 1)[1]
            if authorization.lower().startswith("bearer ")
            else None
        )

        try:
            return await asyncio.to_thread(
                run_openclaw_agent,
                str(question or "").strip(),
                model=model_override or openclaw_config.get("model", "rightcodes/gpt-5.4"),
                thinking=str(openclaw_config.get("thinking", "low")),
                agent=str(openclaw_config.get("agent", "vibelife")),
                base_url=str(raw_request.base_url).rstrip("/") if raw_request else None,
                auth_token=auth_token,
                current_user_id=current_user_id,
            )
        except OpenClawBridgeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    messages = _build_quick_qa_messages(question)
    provider_config = get_current_ai_config().get(normalized_provider, {})

    if normalized_provider == "ollama":
        return await _call_ollama(provider_config, messages, model_override=model_override)

    if normalized_provider in {"openai", "deepseek", "custom"}:
        return await _call_openai_compatible(
            normalized_provider,
            provider_config,
            messages,
            model_override=model_override,
        )

    raise HTTPException(status_code=400, detail=f"不支持的 AI provider: {provider}")


async def _stream_text_chunks(text: str, chunk_size: int = 18) -> AsyncIterator[str]:
    payload = str(text or "")
    if not payload:
        return

    for index in range(0, len(payload), chunk_size):
        yield payload[index : index + chunk_size]
        await asyncio.sleep(0.01)


def _normalize_provider_config(provider: str, config: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(config)

    if provider == "openclaw":
        normalized["thinking"] = str(normalized.get("thinking", "low")).strip() or "low"
        normalized["agent"] = str(normalized.get("agent", "vibelife")).strip() or "vibelife"
        normalized["model"] = str(normalized.get("model", "")).strip()
        return normalized

    if provider == "ollama":
        normalized["baseURL"] = str(
            normalized.get("baseURL", "http://localhost:11434")
        ).strip() or "http://localhost:11434"
        normalized["model"] = str(normalized.get("model", "")).strip()
        return normalized

    if provider in {"openai", "deepseek", "custom"}:
        normalized["apiKey"] = str(normalized.get("apiKey", "")).strip()
        normalized["baseURL"] = str(normalized.get("baseURL", "")).strip()
        normalized["model"] = str(normalized.get("model", "")).strip()
        return normalized

    return normalized


def _validate_provider_name(provider: str) -> str:
    normalized = str(provider or "").strip().lower()
    if normalized not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=400, detail="无效的 provider")
    return normalized


@router.post("/api/ai/chat")
async def chat_with_ai(
    request: Dict[str, Any],
    raw_request: Request,
    current_user_id: str = Depends(get_current_user_id),
):
    user_message = str(request.get("message", "")).strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="消息不能为空")

    provider, model_override = _resolve_provider_and_model(request.get("provider"))
    reply = await _generate_provider_reply(
        provider=provider,
        user_message=user_message,
        history=request.get("history", []),
        context=request.get("context"),
        model_override=model_override,
        raw_request=raw_request,
        current_user_id=current_user_id,
    )

    return {"success": True, "reply": reply, "provider": provider}


@router.get("/api/ai/config")
async def get_ai_config():
    return {"success": True, "config": get_current_ai_config()}


@router.post("/api/ai/config")
async def update_ai_config(config: Dict[str, Any]):
    global _ai_config

    provider = _validate_provider_name(config.get("provider", ""))
    next_config = json.loads(json.dumps(get_current_ai_config()))

    for key, value in config.items():
        if key in SUPPORTED_PROVIDERS and isinstance(value, dict):
            next_config[key] = _normalize_provider_config(key, value)
        else:
            next_config[key] = value

    next_config["provider"] = provider
    _ai_config = _deep_merge_dict(json.loads(json.dumps(DEFAULT_AI_CONFIG)), next_config)
    _persist_ai_config()

    return {"success": True, "message": "配置已更新"}


@router.post("/api/ai/test")
async def test_ai_connection(request: Dict[str, Any]):
    provider = _validate_provider_name(request.get("provider", "local"))
    provider_config = request.get("config", {})
    if not isinstance(provider_config, dict):
        provider_config = {}

    provider_config = _normalize_provider_config(provider, provider_config)

    if provider == "local":
        return {"success": True, "message": "本地模式可用"}

    if provider == "openclaw":
        model = str(provider_config.get("model", "")).strip()
        if not model:
            raise HTTPException(status_code=400, detail="OpenClaw 模型名称不能为空")

        try:
            ensure_openclaw_agent(
                str(provider_config.get("agent", "vibelife")),
                model=model,
            )
        except OpenClawBridgeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        return {"success": True, "message": "OpenClaw 配置验证通过"}

    if provider == "ollama":
        base_url = str(provider_config.get("baseURL", "")).rstrip("/")
        model = str(provider_config.get("model", "")).strip()
        if not base_url or not model:
            raise HTTPException(status_code=400, detail="Ollama Base URL 和模型名称不能为空")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{base_url}/api/tags")
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"Ollama 连接失败: {exc}") from exc

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Ollama 响应异常: {response.text[:200]}")

        return {"success": True, "message": "Ollama 连接成功"}

    if not provider_config.get("apiKey"):
        raise HTTPException(status_code=400, detail="API Key 不能为空")
    if not provider_config.get("baseURL"):
        raise HTTPException(status_code=400, detail="Base URL 不能为空")
    if not provider_config.get("model"):
        raise HTTPException(status_code=400, detail="模型名称不能为空")

    return {"success": True, "message": "配置格式验证通过"}


@router.post("/api/ai/quick-qa")
async def quick_qa(
    request: Dict[str, Any],
    raw_request: Request,
    current_user_id: str = Depends(get_current_user_id),
):
    question = str(request.get("question", "")).strip()
    if not question:
        raise HTTPException(status_code=400, detail="问题不能为空")

    provider, model_override = _resolve_provider_and_model(
        request.get("provider") or request.get("model")
    )
    answer = await _generate_quick_qa_reply(
        provider=provider,
        question=question,
        model_override=model_override,
        raw_request=raw_request,
        current_user_id=current_user_id,
    )

    return {"success": True, "answer": answer, "provider": provider}


@router.get("/api/ai/quick-qa-stream")
async def quick_qa_stream(
    question: str,
    model: str = "auto",
    raw_request: Request = None,
    current_user_id: str = Depends(get_current_user_id),
):
    prompt = str(question or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="问题不能为空")

    provider, model_override = _resolve_provider_and_model(model)
    answer = await _generate_quick_qa_reply(
        provider=provider,
        question=prompt,
        model_override=model_override,
        raw_request=raw_request,
        current_user_id=current_user_id,
    )

    return StreamingResponse(
        _stream_text_chunks(answer),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/api/ai/save-note")
async def save_qa_as_note(
    request: Dict[str, Any],
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    question = str(request.get("question", "")).strip()
    answer = str(request.get("answer", "")).strip()
    if not question or not answer:
        raise HTTPException(status_code=400, detail="问题和回答不能为空")

    qa_folder = (
        db.query(models.FileItem)
        .filter(
            models.FileItem.user_id == current_user_id,
            models.FileItem.parent_id == "root",
            models.FileItem.type == "folder",
            models.FileItem.name == "AI 问答",
        )
        .first()
    )

    if not qa_folder:
        qa_folder = models.FileItem(
            id=f"folder_{uuid4().hex[:12]}",
            user_id=current_user_id,
            type="folder",
            name="AI 问答",
            parent_id="root",
            content="",
            tags=["AI", "问答"],
            date=datetime.date.today().isoformat(),
        )
        db.add(qa_folder)
        db.commit()
        db.refresh(qa_folder)

    note_title = question[:24] + ("..." if len(question) > 24 else "")
    note = models.FileItem(
        id=f"note_{uuid4().hex[:12]}",
        user_id=current_user_id,
        type="file",
        name=note_title,
        parent_id=qa_folder.id,
        content=(
            f"# {question}\n\n"
            "## AI 回答\n\n"
            f"{answer}\n\n"
            "---\n\n"
            f"创建时间：{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            "来源：AI 问答\n"
        ),
        tags=["AI", "问答"],
        date=datetime.date.today().isoformat(),
    )
    db.add(note)
    db.commit()

    return {"success": True, "note_id": note.id, "note_title": note_title}
