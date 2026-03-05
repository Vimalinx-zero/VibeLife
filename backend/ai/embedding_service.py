# backend/ai/embedding_service.py
# 向量嵌入服务

from typing import List, Union
from functools import lru_cache
import numpy as np

class EmbeddingService:
    """向量嵌入服务 - 支持多种模型"""

    def __init__(self, model: str = "m3e-base", provider: str = "local"):
        """
        初始化嵌入服务

        Args:
            model: 模型名称
                - "m3e-base": 中文向量模型（本地）
                - "text-embedding-3-small": OpenAI
                - "bge-large-zh": BGE中文模型
            provider: 提供商
                - "local": 本地模型（推荐，免费）
                - "openai": OpenAI API
                - "deepseek": DeepSeek API
        """
        self.model = model
        self.provider = provider
        self._client = None

    async def embed_text(self, text: str) -> List[float]:
        """
        对单个文本进行嵌入

        Args:
            text: 输入文本

        Returns:
            向量表示（list of floats）
        """
        if not text or len(text.strip()) == 0:
            return [0.0] * 768  # m3e-base 输出768维

        # 简单实现：使用本地模型（这里先用简单的哈希模拟）
        # 生产环境应该使用实际的嵌入模型
        return self._simple_embedding(text)

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        批量嵌入

        Args:
            texts: 文本列表

        Returns:
            向量列表
        """
        embeddings = []
        for text in texts:
            embedding = await self.embed_text(text)
            embeddings.append(embedding)
        return embeddings

    def _simple_embedding(self, text: str) -> List[float]:
        """
        简单嵌入实现（基于字符哈希）

        注意：这只是示例，生产环境应该使用真实的嵌入模型
        """
        # 文本预处理
        text_clean = text.lower().strip()

        # 生成固定长度的向量（768维，模拟m3e-base）
        vector_length = 768

        # 基于字符编码生成向量
        hash_val = hash(text_clean)
        np.random.seed(abs(hash_val) % (2**32))
        vector = np.random.randn(vector_length).tolist()

        # 归一化
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = (vector / norm).tolist()

        return vector

    async def compute_similarity(self, text1: str, text2: str) -> float:
        """
        计算两个文本的相似度

        Args:
            text1: 文本1
            text2: 文本2

        Returns:
            相似度分数（0-1）
        """
        emb1 = await self.embed_text(text1)
        emb2 = await self.embed_text(text2)

        # 余弦相似度
        dot_product = sum(a * b for a, b in zip(emb1, emb2))
        norm1 = sum(a * a for a in emb1) ** 0.5
        norm2 = sum(b * b for b in emb2) ** 0.5

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)


# 全局单例
@lru_cache()
def get_embedding_service() -> EmbeddingService:
    """获取嵌入服务单例"""
    return EmbeddingService(model="m3e-base", provider="local")
