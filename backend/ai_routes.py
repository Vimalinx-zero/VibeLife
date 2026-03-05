# backend/ai_routes.py
# AI功能API路由

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from database import get_db
from auth import get_current_user_id
import models
import datetime
import subprocess
import json
from pathlib import Path

# 导入AI服务
from ai.embedding_service import get_embedding_service
from ai.vector_store import get_vector_store
from ai.knowledge_graph import get_knowledge_graph
from ai.explanation_service import get_explanation_service

router = APIRouter()

# ============================
# 🧠 知识图谱 API
# ============================


@router.post("/api/ai/build-graph")
async def build_knowledge_graph(
    rebuild: bool = False,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    构建知识图谱

    Args:
        rebuild: 是否重建（默认增量更新）
    """
    try:
        # 获取所有内容
        questions = db.query(models.Question).all()
        notes = (
            db.query(models.FileItem)
            .filter(
                models.FileItem.user_id == current_user_id,
                models.FileItem.type == "file",
            )
            .all()
        )
        cards = (
            db.query(models.FlashCard)
            .filter(models.FlashCard.user_id == current_user_id)
            .all()
        )

        # 序列化数据
        questions_data = [
            {
                "id": str(q.id),
                "subject": q.subject,
                "type": q.type,
                "difficulty": q.difficulty,
                "content": {"stem": q.stem},  # ✅ 修复：content应该是字典结构
                "macro_tags": q.macro_tags,
            }
            for q in questions
        ]

        notes_data = [
            {
                "id": str(note.id),
                "name": note.name,
                "content": note.content,
                "tags": note.tags,
            }
            for note in notes
        ]

        cards_data = [
            {
                "id": str(card.id),
                "front": card.front,
                "back": card.back,
                "tags": card.tags,
                "deck": card.deck,
            }
            for card in cards
        ]

        # 构建图谱
        kg = get_knowledge_graph()
        kg.build_from_content(questions_data, notes_data, cards_data)

        # 获取统计
        stats = kg.get_stats()

        return {"success": True, "message": "知识图谱构建完成", "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/ai/graph/visualize")
async def visualize_graph(center_id: Optional[str] = None, depth: int = 1):
    """
    获取用于可视化的图谱数据

    Args:
        center_id: 中心节点ID（可选，如果不指定则返回整个图谱）
        depth: 邻域深度
    """
    try:
        kg = get_knowledge_graph()
        data = kg.export_for_visualization(center_node_id=center_id, depth=depth)

        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/ai/graph/neighbors")
async def get_graph_neighbors(node_id: str, depth: int = 1, min_weight: float = 0.5):
    """
    获取节点的邻域

    Args:
        node_id: 节点ID
        depth: 搜索深度（1或2）
        min_weight: 最小边权重
    """
    try:
        kg = get_knowledge_graph()
        neighborhood = kg.query_neighbors(
            node_id=node_id, depth=depth, min_weight=min_weight
        )

        return {"success": True, "data": neighborhood}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/ai/graph/path")
async def find_graph_path(from_id: str, to_id: str, max_hops: int = 3):
    """
    查找两个节点之间的路径

    Args:
        from_id: 起始节点ID
        to_id: 目标节点ID
        max_hops: 最大跳数
    """
    try:
        kg = get_knowledge_graph()
        path = kg.find_path(from_id=from_id, to_id=to_id, max_hops=max_hops)

        return {"success": True, "path": path, "length": len(path) - 1 if path else 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/ai/graph/stats")
async def get_graph_stats():
    """获取图谱统计信息"""
    try:
        kg = get_knowledge_graph()
        stats = kg.get_stats()

        return {"success": True, "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================
# 🎓 AI讲解 API
# ============================


@router.get("/api/ai/explain/mistake/{mistake_id}")
async def explain_mistake(mistake_id: int, db: Session = Depends(get_db)):
    """
    为错题生成AI讲解

    Returns:
        - summary: 错误总结
        - error_analysis: 错误类型和原因
        - knowledge_points: 涉及知识点
        - step_by_step: 逐步讲解
        - tips: 学习建议
        - related_concepts: 相关概念
    """
    try:
        # 获取错题数据
        mistake = (
            db.query(models.Mistake).filter(models.Mistake.id == mistake_id).first()
        )

        if not mistake:
            raise HTTPException(status_code=404, detail="错题不存在")

        # 获取题目数据
        question = (
            db.query(models.Question)
            .filter(models.Question.id == mistake.question_id)
            .first()
        )

        if not question:
            raise HTTPException(status_code=404, detail="题目不存在")

        # 生成讲解
        explainer = get_explanation_service()
        explanation = await explainer.explain_mistake(
            mistake=mistake.__dict__, question=question.__dict__
        )

        return {"success": True, "mistake_id": mistake_id, "explanation": explanation}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/ai/explain/note/{note_id}")
async def explain_note(note_id: str, db: Session = Depends(get_db)):
    """
    为笔记生成AI讲解

    Returns:
        - summary: 笔记总结
        - key_points: 关键要点
        - suggestions: 学习建议
        - quiz_questions: 自测问题
    """
    try:
        # 获取笔记数据
        note = (
            db.query(models.FileItem)
            .filter(
                models.FileItem.id == note_id,
                models.FileItem.type == "file",  # FileItem表中笔记的类型是"file"
            )
            .first()
        )

        if not note:
            raise HTTPException(status_code=404, detail="笔记不存在")

        # 生成讲解
        explainer = get_explanation_service()
        explanation = await explainer.explain_note(note.__dict__)

        return {"success": True, "note_id": note_id, "explanation": explanation}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================
# 🔍 向量搜索 API
# ============================


@router.post("/api/ai/search/similar")
async def search_similar_content(
    item_type: str,
    query: str,
    top_k: int = 5,
    filters: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
):
    """
    基于向量相似度搜索内容

    Args:
        item_type: 搜索类型（questions/notes/cards）
        query: 查询文本
        top_k: 返回结果数量
        filters: 过滤条件（如 {"subject": "physics"}）
    """
    try:
        # 生成查询向量
        embedder = get_embedding_service()
        query_vector = await embedder.embed_text(query)

        # 向量搜索
        vector_store = get_vector_store()
        results = vector_store.search_similar(
            query_vector=query_vector, item_type=item_type, top_k=top_k, filters=filters
        )

        return {"success": True, "query": query, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/ai/embed/batch")
async def embed_content_batch(
    item_type: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    批量生成内容向量并存储

    Args:
        item_type: 内容类型（questions/notes/cards）
    """
    try:
        embedder = get_embedding_service()
        vector_store = get_vector_store()

        count = 0

        if item_type == "questions":
            items = db.query(models.Question).all()
            for item in items:
                # 生成文本内容
                text = item.stem or ""
                vector = await embedder.embed_text(text)

                # 存储向量
                vector_store.add_item(
                    item_type="questions",
                    item_id=str(item.id),
                    vector=vector,
                    metadata={
                        "subject": item.subject,
                        "type": item.type,
                        "difficulty": item.difficulty,
                        "tags": [item.subject],  # 简化
                    },
                )
                count += 1

        elif item_type == "notes":
            items = (
                db.query(models.FileItem)
                .filter(
                    models.FileItem.user_id == current_user_id,
                    models.FileItem.type == "file",
                )
                .all()
            )
            for item in items:
                text = item.content or item.name
                vector = await embedder.embed_text(text)

                vector_store.add_item(
                    item_type="notes",
                    item_id=str(item.id),
                    vector=vector,
                    metadata={"name": item.name, "tags": item.tags or []},
                )
                count += 1

        elif item_type == "cards":
            items = (
                db.query(models.FlashCard)
                .filter(models.FlashCard.user_id == current_user_id)
                .all()
            )
            for item in items:
                text = item.front + " " + item.back
                vector = await embedder.embed_text(text)

                vector_store.add_item(
                    item_type="cards",
                    item_id=str(item.id),
                    vector=vector,
                    metadata={
                        "front": item.front,
                        "tags": item.tags or [],
                        "deck": item.deck,
                    },
                )
                count += 1

        return {"success": True, "message": f"已嵌入 {count} 条内容", "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================
# # 💬 AI对话 API
# ============================


@router.post("/api/ai/chat")
async def chat_with_ai(request: Dict[str, Any]):
    """
    AI对话接口 - 与AI助手进行对话

    Args:
        request: {
            message: 用户消息,
            context: 上下文信息（题目/笔记）,
            history: 对话历史
        }

    Returns:
        - reply: AI回复
    """
    try:
        user_message = request.get("message", "")
        context = request.get("context")
        history = request.get("history", [])

        # 使用规则引擎生成回复
        reply = generate_chat_reply(user_message, context, history)

        return {"success": True, "reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def generate_chat_reply(
    message: str, context: Optional[Dict], history: List[Dict]
) -> str:
    """
    基于规则引擎生成AI回复

    Args:
        message: 用户消息
        context: 上下文信息
        history: 对话历史

    Returns:
        AI回复
    """
    # 简单的关键词匹配回复
    message_lower = message.lower()

    # 问候语
    greetings = ["你好", "hi", "hello", "您好"]
    if any(g in message_lower for g in greetings):
        return "你好！我是你的AI学习助手。我可以帮你解答问题、讲解知识点、提供学习建议。有什么需要帮助的吗？"

    # 询问帮助
    help_keywords = ["帮助", "help", "怎么用", "如何使用"]
    if any(k in message_lower for k in help_keywords):
        return "我可以帮你：\n• 解答学习问题\n• 讲解知识点\n• 分析错题原因\n• 提供学习建议\n• 推荐相关内容\n\n请告诉我你需要什么帮助！"

    # 询问题目
    question_keywords = ["题目", "问题", "怎么做", "如何解答"]
    if any(k in message_lower for k in question_keywords):
        if context and context.get("type") == "question":
            return f"关于这道题目，让我帮你分析一下。\n\n建议的步骤：\n1. 仔细阅读题目\n2. 找出关键信息\n3. 回忆相关知识点\n4. 尝试解答\n\n需要我详细讲解吗？"
        else:
            return "我可以帮你分析题目！请告诉我具体是哪道题，或者把题目内容发给我。"

    # 询问学习方法
    study_keywords = ["学习方法", "怎么学", "如何提高", "提高成绩"]
    if any(k in message_lower for k in study_keywords):
        return "关于学习方法，我建议：\n\n1. **理解基础** - 先掌握基本概念\n2. **刻意练习** - 针对薄弱环节反复练习\n3. **及时复习** - 使用间隔重复法巩固记忆\n4. **总结归纳** - 做笔记和思维导图\n\n需要我详细讲解某个方面吗？"

    # 询问错题
    mistake_keywords = ["错题", "错误", "为什么会错"]
    if any(k in message_lower for k in mistake_keywords):
        return "关于错题，建议：\n\n1. 分析错误原因（概念不清/粗心/方法错误）\n2. 回顾相关知识点\n3. 总结解题方法\n4. 定期复习错题\n\n你可以把具体错题发给我，我帮你分析！"

    # 默认回复
    default_replies = [
        "这是个好问题！让我想想... 你能提供更多上下文信息吗？",
        "我理解你的困惑。能否告诉我更多细节，这样我能更好地帮助你。",
        "这个问题很有意思。我们可以一起探讨，你想从哪个方面开始？",
        "好的，让我来帮你。你能把相关题目或笔记内容分享一下吗？",
    ]

    # 简单的上下文回复
    if context:
        if context.get("type") == "note":
            return f"我看到你在学习《{context.get('name', '某个内容')}》。有什么具体想了解的吗？"
        elif context.get("type") == "question":
            return "关于这道题目，你需要我讲解哪个部分吗？我可以帮你分析解题思路或相关知识点。"

    import random

    return random.choice(default_replies)


# ============================
# 🤖 智能推荐 API（增强版）
# ============================


@router.post("/api/ai/recommend/related")
async def recommend_related_content(
    item_type: str, item_id: str, limit: int = 5, db: Session = Depends(get_db)
):
    """
    基于AI推荐相关内容（结合知识图谱和向量相似度）

    Args:
        item_type: 类型（mistake/note/card/question）
        item_id: 项目ID
        limit: 推荐数量
    """
    try:
        recommendations = {"notes": [], "cards": [], "questions": [], "mistakes": []}

        # 1. 基于知识图谱的路径推荐
        kg = get_knowledge_graph()
        node_id = f"{item_type}_{item_id}"
        neighborhood = kg.query_neighbors(node_id, depth=2, min_weight=0.3)

        # 从邻域中提取相关内容
        for neighbor_id, neighbor_data in neighborhood["nodes"].items():
            if neighbor_id == node_id:
                continue

            n_type, n_id = neighbor_id.split("_", 1)

            if n_type == "note" and len(recommendations["notes"]) < limit:
                recommendations["notes"].append(
                    {
                        "id": n_id,
                        "name": neighbor_data["label"],
                        "reason": "知识图谱关联",
                        "confidence": 0.8,
                    }
                )
            elif n_type == "card" and len(recommendations["cards"]) < limit:
                recommendations["cards"].append(
                    {
                        "id": n_id,
                        "front": neighbor_data["label"],
                        "reason": "知识图谱关联",
                        "confidence": 0.8,
                    }
                )
            elif n_type == "question" and len(recommendations["questions"]) < limit:
                recommendations["questions"].append(
                    {
                        "id": n_id,
                        "stem": neighbor_data["label"],
                        "reason": "知识图谱关联",
                        "confidence": 0.8,
                    }
                )

        # 2. 基于向量相似度的补充推荐（如果图谱推荐不足）
        if len(sum([recommendations[k] for k in recommendations], [])) < limit:
            # 获取查询文本
            if item_type == "note":
                item = (
                    db.query(models.FileItem)
                    .filter(models.FileItem.id == item_id)
                    .first()
                )
                query_text = item.content if item else ""
            elif item_type == "question":
                item = (
                    db.query(models.Question)
                    .filter(models.Question.id == item_id)
                    .first()
                )
                query_text = item.stem if item else ""
            else:
                query_text = ""

            if query_text:
                # 向量搜索
                embedder = get_embedding_service()
                vector_store = get_vector_store()
                query_vector = await embedder.embed_text(query_text)

                # 搜索笔记
                note_results = vector_store.search_similar(
                    query_vector, "notes", top_k=limit
                )
                for result in note_results:
                    if len(recommendations["notes"]) >= limit:
                        break
                    recommendations["notes"].append(
                        {
                            "id": result["id"],
                            "name": result["metadata"]["name"],
                            "reason": "语义相似",
                            "confidence": result["similarity"],
                        }
                    )

        return {"success": True, "recommendations": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================
# ⚙️ AI配置管理 API
# ============================

# 全局AI配置存储
_ai_config = {
    "provider": "ollama",
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
    "openclaw": {"model": "zai/glm-5", "thinking": "low", "agent": "main"},
    "custom": {"apiKey": "", "baseURL": "", "model": ""},
}

_ai_config_path = Path(__file__).resolve().parent / "data" / "ai_config.json"
_ai_config_path.parent.mkdir(parents=True, exist_ok=True)

if _ai_config_path.exists():
    try:
        persisted = json.loads(_ai_config_path.read_text(encoding="utf-8"))
        if isinstance(persisted, dict):
            for key, value in persisted.items():
                if (
                    key in _ai_config
                    and isinstance(_ai_config[key], dict)
                    and isinstance(value, dict)
                ):
                    _ai_config[key].update(value)
                else:
                    _ai_config[key] = value
    except Exception:
        pass


@router.get("/api/ai/config")
async def get_ai_config():
    """获取当前AI配置"""
    return {"success": True, "config": _ai_config}


@router.post("/api/ai/config")
async def update_ai_config(config: Dict[str, Any]):
    """
    更新AI配置

    Args:
        config: AI配置对象
    """
    try:
        global _ai_config

        # 验证配置
        if "provider" not in config:
            raise HTTPException(status_code=400, detail="缺少provider字段")

        provider = config["provider"]
        if provider not in [
            "local",
            "ollama",
            "openai",
            "deepseek",
            "openclaw",
            "custom",
        ]:
            raise HTTPException(status_code=400, detail="无效的provider")

        # 深度合并配置（保留所有字段）
        for key, value in config.items():
            if (
                key in _ai_config
                and isinstance(value, dict)
                and isinstance(_ai_config[key], dict)
            ):
                # 对于字典类型，递归合并
                _ai_config[key].update(value)
            else:
                # 对于其他类型，直接替换
                _ai_config[key] = value

        print(f"[AI Config] 配置已更新: provider={provider}")

        _ai_config_path.write_text(
            json.dumps(_ai_config, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        return {"success": True, "message": "配置已更新"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/ai/test")
async def test_ai_connection(request: Dict[str, Any]):
    """
    测试AI API连接

    Args:
        request: {provider, config}
    """
    try:
        provider = request.get("provider", "local")
        config = request.get("config", {})

        if provider == "local":
            # 本地模式，直接返回成功
            return {"success": True, "message": "本地模式测试成功"}

        if provider == "openclaw":
            model = config.get("model", "").strip()
            if not model:
                raise HTTPException(status_code=400, detail="OpenClaw 模型名称不能为空")
            return {"success": True, "message": "OpenClaw 配置格式验证通过"}

        # 检查API Key
        api_key = config.get("apiKey", "")
        if not api_key:
            raise HTTPException(status_code=400, detail="API Key不能为空")

        # 这里可以添加实际的API测试调用
        # 简化实现：只验证配置格式
        base_url = config.get("baseURL", "")
        model = config.get("model", "")

        if not base_url or not model:
            raise HTTPException(status_code=400, detail="Base URL和模型名称不能为空")

        # TODO: 实际调用API测试
        # 示例：发送一个简单的测试请求
        # import httpx
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(
        #         f"{base_url}/chat/completions",
        #         headers={
        #             "Authorization": f"Bearer {api_key}",
        #             "Content-Type": "application/json"
        #         },
        #         json={
        #             "model": model,
        #             "messages": [{"role": "user", "content": "test"}],
        #             "max_tokens": 10
        #         }
        #     )
        #     if response.status_code != 200:
        #         raise HTTPException(status_code=400, detail="API连接失败")

        return {"success": True, "message": "配置格式验证通过（实际API调用待实现）"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================
# 💬 AI 快捷问答 API（自动保存）
# ============================


@router.post("/api/ai/quick-qa")
async def quick_qa_with_auto_save(
    request: Dict[str, Any], db: Session = Depends(get_db)
):
    """
    AI快捷问答 - 手动选择是否保存

    Args:
        request: {
            question: 用户问题,
            model: AI模型 (ollama/deepseek/local),
            auto_save: 是否自动保存（默认 false）
        }

    Returns:
        - answer: AI 回答
    """
    try:
        question = request.get("question", "")
        model = request.get("model", "ollama")
        if model == "auto":
            model = get_current_ai_config().get("provider", "ollama")
        auto_save = request.get("auto_save", False)

        print(
            f"🔍 Received QA request - question: {question[:30]}, model: {model}, auto_save: {auto_save}"
        )  # 调试日志

        if not question:
            raise HTTPException(status_code=400, detail="问题不能为空")

        # 根据模型选择生成回答
        answer = generate_qa_answer_with_model(question, model)

        return {"success": True, "answer": answer}

    except HTTPException:
        raise
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/ai/quick-qa-stream")
async def quick_qa_stream(question: str, model: str = "deepseek"):
    """
    AI快捷问答 - 流式传输（Server-Sent Events）

    Args:
        question: 用户问题
        model: AI模型 (ollama/deepseek)

    Returns:
        流式文本响应
    """
    from fastapi.responses import StreamingResponse

    if not question:
        raise HTTPException(status_code=400, detail="问题不能为空")

    config = get_current_ai_config()
    if model == "auto":
        model = config.get("provider", "deepseek")

    print(f"[AI QA] 收到流式请求 - 问题: {question[:50]}..., 模型: {model}")

    async def generate():
        """生成流式响应"""
        import httpx
        import json

        config = get_current_ai_config()

        try:
            if model == "ollama":
                print(f"[AI QA] 使用 Ollama 模型")
                ollama_config = config.get("ollama", {})
                base_url = ollama_config.get("baseURL", "http://localhost:11434")
                model_name = ollama_config.get("model", "qwen:7b")

                system_prompt = """你是一个专业友善的学习助手。请简洁准确地回答学生的问题。

【重要】在回答的最后，请判断这个问题是否值得制作成记忆卡片：
- 如果问题涉及重要的知识点、公式、概念，值得复习，请在回答最后添加一行：[值得制卡]
- 如果问题太简单、是临时性问题、或者没有学习价值，请添加：[不值得制卡]

回答要求：
1. 直接回答问题，不需要寒暄
2. 内容要准确、简洁、有条理
3. 如果不确定，直接说不知道
4. 使用中文回答
5. 避免废话和套话
6. 支持使用Markdown格式和LaTeX数学公式"""

                client = httpx.AsyncClient(timeout=120.0)
                try:
                    async with client.stream(
                        "POST",
                        f"{base_url}/api/generate",
                        json={
                            "model": model_name,
                            "prompt": question,
                            "system": system_prompt,
                            "stream": True,
                            "options": {
                                "temperature": 0.7,
                                "top_p": 0.9,
                                "num_predict": 1500,
                            },
                        },
                    ) as response:
                        if response.status_code != 200:
                            error_text = await response.aread()
                            print(
                                f"[AI QA] Ollama API 错误: {response.status_code} - {error_text}"
                            )
                            yield f"❌ Ollama API 错误 ({response.status_code})"
                            return

                        async for line in response.aiter_lines():
                            if line.strip():
                                data = json.loads(line)
                                if "response" in data:
                                    yield data["response"]
                finally:
                    await client.aclose()

            elif model == "deepseek":
                print(f"[AI QA] 使用 DeepSeek 模型")
                deepseek_config = config.get("deepseek", {})
                api_key = deepseek_config.get("apiKey", "")

                if not api_key:
                    print(f"[AI QA] DeepSeek API key 未配置")
                    yield "❌ DeepSeek API key 未配置，请在设置中配置"
                    return

                base_url = deepseek_config.get("baseURL", "https://api.deepseek.com/v1")
                print(f"[AI QA] DeepSeek 请求 URL: {base_url}/chat/completions")

                system_prompt = """你是一个专业友善的学习助手。请简洁准确地回答学生的问题。

【重要】在回答的最后，请判断这个问题是否值得制作成记忆卡片：
- 如果问题涉及重要的知识点、公式、概念，值得复习，请在回答最后添加一行：[值得制卡]
- 如果问题太简单、是临时性问题、或者没有学习价值，请添加：[不值得制卡]

回答要求：
1. 直接回答问题，不需要寒暄
2. 内容要准确、简洁、有条理
3. 使用中文回答
4. 避免废话和套话
5. 支持使用Markdown格式和LaTeX数学公式（用$...$表示行内公式，$$...$$表示行间公式）"""

                client = httpx.AsyncClient(timeout=120.0)
                try:
                    async with client.stream(
                        "POST",
                        f"{base_url}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "deepseek-chat",
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": question},
                            ],
                            "temperature": 0.7,
                            "max_tokens": 2000,
                            "stream": True,
                        },
                    ) as response:
                        if response.status_code != 200:
                            error_text = await response.aread()
                            print(
                                f"[AI QA] DeepSeek API 错误: {response.status_code} - {error_text.decode()}"
                            )
                            yield f"❌ DeepSeek API 错误 ({response.status_code}): {error_text.decode()[:200]}"
                            return

                        async for line in response.aiter_lines():
                            if line.strip().startswith("data: "):
                                data_str = line.strip()[6:]  # 去掉 "data: " 前缀
                                if data_str == "[DONE]":
                                    print(f"[AI QA] DeepSeek 流式响应完成")
                                    break
                                try:
                                    data = json.loads(data_str)
                                    if "choices" in data and len(data["choices"]) > 0:
                                        delta = data["choices"][0].get("delta", {})
                                        content = delta.get("content", "")
                                        if content:
                                            yield content
                                except json.JSONDecodeError as e:
                                    print(f"[AI QA] JSON 解析错误: {e}")
                                    continue
                except Exception as e:
                    print(f"[AI QA] DeepSeek 请求异常: {type(e).__name__}: {e}")
                    import traceback

                    traceback.print_exc()
                    yield f"\n\n❌ DeepSeek 请求失败: {str(e)}"
                finally:
                    await client.aclose()
            elif model == "openclaw":
                openclaw_config = config.get("openclaw", {})
                openclaw_model = openclaw_config.get("model", "zai/glm-5")
                openclaw_thinking = openclaw_config.get("thinking", "low")
                openclaw_agent = openclaw_config.get("agent", "main")

                command = [
                    "openclaw",
                    "agent",
                    "--local",
                    "--json",
                    "--agent",
                    str(openclaw_agent),
                    "--thinking",
                    str(openclaw_thinking),
                    "--message",
                    question,
                ]

                env = None
                if openclaw_model:
                    import os

                    env = os.environ.copy()
                    env["OPENCLAW_MODEL"] = str(openclaw_model)

                process = subprocess.run(
                    command,
                    capture_output=True,
                    text=True,
                    timeout=120,
                    env=env,
                )

                if process.returncode != 0:
                    stderr_text = process.stderr.strip()
                    if stderr_text:
                        yield f"❌ OpenClaw 调用失败: {stderr_text[:500]}"
                    else:
                        yield "❌ OpenClaw 调用失败"
                    return

                output = process.stdout.strip()
                if not output:
                    yield "❌ OpenClaw 未返回内容"
                    return

                try:
                    import json

                    parsed = json.loads(output)
                    result_obj = (
                        parsed.get("result") if isinstance(parsed, dict) else None
                    )
                    content = ""
                    if isinstance(result_obj, dict):
                        content = result_obj.get("text") or ""
                        if not content and isinstance(result_obj.get("messages"), list):
                            for message in result_obj["messages"]:
                                if not isinstance(message, dict):
                                    continue
                                if message.get("role") == "assistant" and message.get(
                                    "content"
                                ):
                                    content = str(message.get("content"))
                                    break

                    if not content and isinstance(parsed, dict):
                        content = (
                            parsed.get("response")
                            or parsed.get("message")
                            or parsed.get("text")
                            or ""
                        )

                    if not content:
                        content = output
                except Exception:
                    content = output

                yield content
            else:
                yield f"❌ 不支持的模型: {model}"

        except Exception as e:
            import traceback

            print(f"[AI QA] 生成失败: {type(e).__name__}: {e}")
            traceback.print_exc()
            yield f"\n\n❌ 错误: {str(e)}"

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


def generate_qa_answer_with_model(question: str, model: str = "ollama") -> str:
    """
    根据选择的模型生成问答回复

    Args:
        question: 用户问题
        model: 模型选择 (ollama/deepseek)

    Returns:
        AI 回答
    """
    import httpx

    config = get_current_ai_config()

    try:
        if model == "ollama":
            ollama_config = config.get("ollama", {})
            base_url = ollama_config.get("baseURL", "http://localhost:11434")
            model_name = ollama_config.get("model", "qwen:7b")

            system_prompt = """你是一个专业友善的学习助手。请简洁准确地回答学生的问题。

回答要求：
1. 直接回答问题，不需要寒暄
2. 内容要准确、简洁、有条理
3. 如果不确定，直接说不知道
4. 使用中文回答
5. 避免废话和套话"""

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{base_url}/api/generate",
                    json={
                        "model": model_name,
                        "prompt": question,
                        "system": system_prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.7,
                            "top_p": 0.9,
                            "num_predict": 1000,
                        },
                    },
                )

                if response.status_code == 200:
                    result = response.json()
                    answer = result.get("response", "").strip()
                    if answer:
                        return answer
                    raise Exception("Ollama 返回为空")
                else:
                    raise Exception(
                        f"Ollama API error: {response.status_code} - {response.text}"
                    )

        elif model == "deepseek":
            # DeepSeek API 调用
            deepseek_config = config.get("deepseek", {})
            api_key = deepseek_config.get("apiKey", "")

            if not api_key:
                raise Exception("DeepSeek API key 未配置，请在设置中配置")

            base_url = deepseek_config.get("baseURL", "https://api.deepseek.com/v1")
            system_prompt = (
                "你是一个专业友善的学习助手。请简洁准确地回答问题，避免废话。"
            )

            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": question},
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1000,
                    },
                )

                if response.status_code == 200:
                    result = response.json()
                    answer = result["choices"][0]["message"]["content"].strip()
                    if answer:
                        return answer
                    raise Exception("DeepSeek 返回为空")
                else:
                    raise Exception(
                        f"DeepSeek API error: {response.status_code} - {response.text}"
                    )

        elif model == "openclaw":
            openclaw_config = config.get("openclaw", {})
            openclaw_model = openclaw_config.get("model", "zai/glm-5")
            openclaw_thinking = openclaw_config.get("thinking", "low")
            openclaw_agent = openclaw_config.get("agent", "main")

            command = [
                "openclaw",
                "agent",
                "--local",
                "--json",
                "--agent",
                str(openclaw_agent),
                "--thinking",
                str(openclaw_thinking),
                "--message",
                question,
            ]

            env = None
            if openclaw_model:
                import os

                env = os.environ.copy()
                env["OPENCLAW_MODEL"] = str(openclaw_model)

            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=120,
                env=env,
            )

            if result.returncode != 0:
                err_text = result.stderr.strip() or "unknown error"
                raise Exception(f"OpenClaw 调用失败: {err_text}")

            output = result.stdout.strip()
            if not output:
                raise Exception("OpenClaw 未返回内容")

            try:
                parsed = json.loads(output)
                result_obj = parsed.get("result") if isinstance(parsed, dict) else None
                answer = ""
                if isinstance(result_obj, dict):
                    answer = result_obj.get("text") or ""
                    if not answer and isinstance(result_obj.get("messages"), list):
                        for message in result_obj["messages"]:
                            if not isinstance(message, dict):
                                continue
                            if message.get("role") == "assistant" and message.get(
                                "content"
                            ):
                                answer = str(message.get("content"))
                                break
                if not answer and isinstance(parsed, dict):
                    answer = (
                        parsed.get("response")
                        or parsed.get("message")
                        or parsed.get("text")
                        or ""
                    )
                if answer:
                    return answer.strip()
            except Exception:
                pass

            return output
        else:
            raise Exception(f"不支持的模型: {model}")

    except Exception as e:
        raise Exception(f"AI 模型调用失败: {str(e)}")


# 辅助函数：获取当前AI配置
def get_current_ai_config() -> Dict[str, Any]:
    """获取当前AI配置"""
    return _ai_config


# ============================
# 💾 单独保存笔记/卡片 API
# ============================


@router.post("/api/ai/save-note")
async def save_qa_as_note(
    request: Dict[str, Any],
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    将问答保存为笔记

    Args:
        request: {
            question: 问题,
            answer: 回答
        }

    Returns:
        - note_id: 笔记 ID
        - note_title: 笔记标题
    """
    try:
        import time

        question = request.get("question", "")
        answer = request.get("answer", "")

        if not question or not answer:
            raise HTTPException(status_code=400, detail="问题和回答不能为空")

        # 确保 "AI 问答" 文件夹存在
        qa_folder = (
            db.query(models.FileItem)
            .filter(
                models.FileItem.user_id == current_user_id,
                models.FileItem.name == "AI 问答",
                models.FileItem.type == "folder",
                models.FileItem.parent_id == "root",
            )
            .first()
        )

        if not qa_folder:
            folder_id = f"folder_{int(time.time() * 1000)}"
            qa_folder = models.FileItem(
                id=folder_id,
                user_id=current_user_id,
                type="folder",
                name="AI 问答",
                parent_id="root",
                tags=["AI", "问答"],
            )
            db.add(qa_folder)
            db.commit()
            db.refresh(qa_folder)
        else:
            folder_id = qa_folder.id

        # 生成笔记标题
        note_title = question[:20] + ("..." if len(question) > 20 else "")

        # 创建笔记
        note_id = f"note_{int(time.time() * 1000)}"
        note_content = f"""# {question}

## AI 回答

{answer}

---

**创建时间**: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**来源**: AI 问答
"""

        new_note = models.FileItem(
            id=note_id,
            user_id=current_user_id,
            type="file",
            name=note_title,
            parent_id=folder_id,
            content=note_content,
            tags=["AI", "问答"],
            date=datetime.date.today().strftime("%Y-%m-%d"),
        )
        db.add(new_note)
        db.commit()

        return {"success": True, "note_id": note_id, "note_title": note_title}

    except HTTPException:
        raise
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/ai/save-card")
async def save_qa_as_card(
    request: Dict[str, Any],
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    将问答保存为记忆卡

    Args:
        request: {
            question: 问题,
            answer: 回答
        }

    Returns:
        - card_id: 卡片 ID
    """
    try:
        import time

        question = request.get("question", "")
        answer = request.get("answer", "")

        if not question or not answer:
            raise HTTPException(status_code=400, detail="问题和回答不能为空")

        # 创建记忆卡
        card_id = f"card_{int(time.time() * 1000)}"

        # 自动添加时间标签
        now = datetime.datetime.utcnow()
        year_month = now.strftime("%Y-%m")
        quarter = f"{now.year}-Q{(now.month - 1) // 3 + 1}"

        tags = ["AI", "问答", year_month, quarter]

        new_card = models.FlashCard(
            id=card_id,
            user_id=current_user_id,
            front=question,
            back=answer,
            tags=tags,
            deck="AI 问答",
            created_at=now.isoformat(),
        )
        db.add(new_card)
        db.commit()

        return {"success": True, "card_id": card_id}

    except HTTPException:
        raise
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
