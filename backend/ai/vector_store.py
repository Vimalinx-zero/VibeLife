# backend/ai/vector_store.py
# 轻量向量存储服务

from typing import List, Dict, Any, Optional
from pathlib import Path
import pickle

class VectorStore:
    """
    向量数据库（简化版，使用本地存储）

    当前仅存储 VibeLife 运行时需要的笔记/采集向量。
    """

    def __init__(self, data_dir: str = "./data/vectors"):
        """
        初始化向量存储

        Args:
            data_dir: 向量数据存储目录
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # 向量索引: {item_type: {item_id: {"vector": [...], "metadata": {...}}}}
        self.indexes = {"notes": {}}

        # 加载已有索引
        self._load_indexes()

    def _load_indexes(self):
        """从磁盘加载索引"""
        for item_type in self.indexes.keys():
            index_file = self.data_dir / f"{item_type}_index.pkl"
            if index_file.exists():
                with open(index_file, 'rb') as f:
                    self.indexes[item_type] = pickle.load(f)

    def _save_indexes(self):
        """保存索引到磁盘"""
        for item_type, index in self.indexes.items():
            index_file = self.data_dir / f"{item_type}_index.pkl"
            with open(index_file, 'wb') as f:
                pickle.dump(index, f)

    def add_item(
        self,
        item_type: str,
        item_id: str,
        vector: List[float],
        metadata: Dict[str, Any]
    ):
        """
        添加项目到向量存储

        Args:
            item_type: 类型（notes）
            item_id: 项目ID
            vector: 向量表示
            metadata: 元数据（标题、内容、标签等）
        """
        if item_type not in self.indexes:
            raise ValueError(f"Unknown item type: {item_type}")

        self.indexes[item_type][item_id] = {
            "vector": vector,
            "metadata": metadata
        }

        # 持久化
        self._save_indexes()

    def search_similar(
        self,
        query_vector: List[float],
        item_type: str,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        相似度搜索

        Args:
            query_vector: 查询向量
            item_type: 搜索类型
            top_k: 返回前K个结果
            filters: 过滤条件（如 {"subject": "physics"}）

        Returns:
            相似项目列表，按相似度降序排列
        """
        if item_type not in self.indexes:
            return []

        results = []

        for item_id, data in self.indexes[item_type].items():
            # 应用过滤器
            if filters:
                match = True
                for key, value in filters.items():
                    if data["metadata"].get(key) != value:
                        match = False
                        break
                if not match:
                    continue

            # 计算余弦相似度
            similarity = self._cosine_similarity(query_vector, data["vector"])

            results.append({
                "id": item_id,
                "similarity": similarity,
                "metadata": data["metadata"]
            })

        # 按相似度降序排序
        results.sort(key=lambda x: x["similarity"], reverse=True)

        return results[:top_k]

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """计算余弦相似度"""
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = sum(a * a for a in vec1) ** 0.5
        norm2 = sum(b * b for b in vec2) ** 0.5

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    def get_item(self, item_type: str, item_id: str) -> Optional[Dict[str, Any]]:
        """获取单个项目"""
        if item_type not in self.indexes:
            return None

        return self.indexes[item_type].get(item_id)

    def delete_item(self, item_type: str, item_id: str):
        """删除项目"""
        if item_type in self.indexes and item_id in self.indexes[item_type]:
            del self.indexes[item_type][item_id]
            self._save_indexes()

    def get_stats(self) -> Dict[str, int]:
        """获取统计信息"""
        return {
            item_type: len(index)
            for item_type, index in self.indexes.items()
        }


# 全局单例
_vector_store_instance = None

def get_vector_store() -> VectorStore:
    """获取向量存储单例"""
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = VectorStore()
    return _vector_store_instance
