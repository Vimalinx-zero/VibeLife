# backend/ai/__init__.py
# AI模块初始化

from .embedding_service import get_embedding_service
from .vector_store import get_vector_store
from .knowledge_graph import get_knowledge_graph
from .explanation_service import get_explanation_service

__all__ = [
    "get_embedding_service",
    "get_vector_store",
    "get_knowledge_graph",
    "get_explanation_service"
]
