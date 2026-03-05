# backend/ai/knowledge_graph.py
# 知识图谱自动构建服务

from typing import List, Dict, Any, Optional, Set, Tuple
from collections import defaultdict, Counter
import json
from pathlib import Path

class KnowledgeGraph:
    """
    知识图谱 - 自动构建和查询

    基于现有内容（题目、笔记、卡片）自动发现知识关联
    """

    def __init__(self, data_dir: str = "./data/knowledge_graph"):
        """
        初始化知识图谱

        Args:
            data_dir: 图谱数据存储目录
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # 图结构
        self.nodes = {}      # {node_id: {type, label, metadata}}
        self.edges = []      # [{from, to, weight, type, label}]

        # 加载已有图谱
        self._load_graph()

    def _load_graph(self):
        """从磁盘加载图谱"""
        graph_file = self.data_dir / "graph.json"
        if graph_file.exists():
            with open(graph_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.nodes = data.get("nodes", {})
                self.edges = data.get("edges", [])

    def _save_graph(self):
        """保存图谱到磁盘"""
        graph_file = self.data_dir / "graph.json"
        with open(graph_file, 'w', encoding='utf-8') as f:
            json.dump({
                "nodes": self.nodes,
                "edges": self.edges
            }, f, ensure_ascii=False, indent=2)

    def build_from_content(
        self,
        questions: List[Dict],
        notes: List[Dict],
        cards: List[Dict]
    ):
        """
        从内容构建知识图谱

        Args:
            questions: 题目列表
            notes: 笔记列表
            cards: 卡片列表
        """
        # 1. 添加节点
        self._add_nodes_from_questions(questions)
        self._add_nodes_from_notes(notes)
        self._add_nodes_from_cards(cards)

        # 2. 基于标签构建边
        self._build_edges_from_tags()

        # 3. 基于内容相似度构建边
        self._build_edges_from_similarity()

        # 4. 基于已有连接构建边
        self._build_edges_from_links()

        # 保存
        self._save_graph()

    def _add_nodes_from_questions(self, questions: List[Dict]):
        """从题目添加节点"""
        for q in questions:
            node_id = f"question_{q['id']}"
            self.nodes[node_id] = {
                "type": "question",
                "label": q.get("content", {}).get("stem", "")[:50] + "...",
                "metadata": {
                    "id": q["id"],
                    "subject": q.get("subject"),
                    "difficulty": q.get("difficulty"),
                    "type": q.get("type"),
                    "tags": self._extract_tags(q)
                },
                "size": 3
            }

    def _add_nodes_from_notes(self, notes: List[Dict]):
        """从笔记添加节点"""
        for note in notes:
            node_id = f"note_{note['id']}"
            self.nodes[node_id] = {
                "type": "note",
                "label": note.get("name", "未命名笔记"),
                "metadata": {
                    "id": note["id"],
                    "tags": note.get("tags", []),
                    "created_at": str(note.get("created_at", ""))
                },
                "size": 4
            }

    def _add_nodes_from_cards(self, cards: List[Dict]):
        """从卡片添加节点"""
        for card in cards:
            node_id = f"card_{card['id']}"
            self.nodes[node_id] = {
                "type": "card",
                "label": card.get("front", "")[:50] + "...",
                "metadata": {
                    "id": card["id"],
                    "tags": card.get("tags", []),
                    "deck": card.get("deck")
                },
                "size": 2
            }

    def _build_edges_from_tags(self):
        """基于标签构建边"""
        # 按标签分组节点
        tag_groups = defaultdict(list)
        for node_id, node in self.nodes.items():
            for tag in node["metadata"].get("tags", []):
                tag_groups[tag].append(node_id)

        # 为每个标签组创建边（全连接）
        for tag, node_ids in tag_groups.items():
            if len(node_ids) > 1:
                for i in range(len(node_ids)):
                    for j in range(i + 1, len(node_ids)):
                        self._add_edge_if_not_exists(
                            from_node=node_ids[i],
                            to_node=node_ids[j],
                            weight=0.8,
                            edge_type="same_tag",
                            label=f"共同标签: {tag}"
                        )

    def _build_edges_from_similarity(self, threshold: float = 0.7):
        """基于内容相似度构建边（使用向量相似度）"""
        # 这里简化实现：基于标签重叠度
        # 实际应该使用向量相似度

        node_ids = list(self.nodes.keys())
        for i in range(len(node_ids)):
            for j in range(i + 1, len(node_ids)):
                node1 = self.nodes[node_ids[i]]
                node2 = self.nodes[node_ids[j]]

                # 计算标签重叠度
                tags1 = set(node1["metadata"].get("tags", []))
                tags2 = set(node2["metadata"].get("tags", []))

                if len(tags1) == 0 or len(tags2) == 0:
                    continue

                overlap = len(tags1 & tags2)
                union = len(tags1 | tags2)
                similarity = overlap / union if union > 0 else 0

                if similarity >= threshold:
                    self._add_edge_if_not_exists(
                        from_node=node_ids[i],
                        to_node=node_ids[j],
                        weight=similarity,
                        edge_type="similar",
                        label=f"相似度: {similarity:.2f}"
                    )

    def _build_edges_from_links(self):
        """基于已有连接构建边"""
        # 从笔记的错题关联
        # 从卡片的来源笔记
        # 从卡片的来源错题
        # 这些数据应该从数据库中读取
        pass

    def _add_edge_if_not_exists(
        self,
        from_node: str,
        to_node: str,
        weight: float,
        edge_type: str,
        label: str
    ):
        """添加边（如果不存在）"""
        # 检查是否已存在
        for edge in self.edges:
            if edge["from"] == from_node and edge["to"] == to_node:
                return  # 已存在
            if edge["from"] == to_node and edge["to"] == from_node:
                return  # 反向边已存在（无向图）

        self.edges.append({
            "from": from_node,
            "to": to_node,
            "weight": weight,
            "type": edge_type,
            "label": label
        })

    def _extract_tags(self, question: Dict) -> List[str]:
        """从题目提取标签"""
        tags = [question.get("subject", "")]

        macro_tags = question.get("macro_tags", {})
        if isinstance(macro_tags, dict):
            for key, value in macro_tags.items():
                if isinstance(value, list):
                    tags.extend(value)
                elif value:
                    tags.append(str(value))

        return [t for t in tags if t]

    def query_neighbors(
        self,
        node_id: str,
        depth: int = 1,
        min_weight: float = 0.5
    ) -> Dict[str, Any]:
        """
        查询节点的邻域

        Args:
            node_id: 节点ID
            depth: 搜索深度（1或2）
            min_weight: 最小边权重阈值

        Returns:
            邻域数据（节点和边）
        """
        result = {
            "center": node_id,
            "nodes": {},
            "edges": []
        }

        # 添加中心节点
        if node_id not in self.nodes:
            return result

        result["nodes"][node_id] = self.nodes[node_id]

        # 查找直接邻居
        visited = {node_id}
        current_level = {node_id}

        for d in range(depth):
            next_level = set()

            for curr_id in current_level:
                # 查找所有相连的边
                for edge in self.edges:
                    if edge["from"] == curr_id and edge["to"] not in visited:
                        if edge["weight"] >= min_weight:
                            next_level.add(edge["to"])
                            result["nodes"][edge["to"]] = self.nodes.get(edge["to"])
                            result["edges"].append(edge)
                            visited.add(edge["to"])

                    elif edge["to"] == curr_id and edge["from"] not in visited:
                        if edge["weight"] >= min_weight:
                            next_level.add(edge["from"])
                            result["nodes"][edge["from"]] = self.nodes.get(edge["from"])
                            result["edges"].append(edge)
                            visited.add(edge["from"])

            current_level = next_level

        return result

    def find_path(
        self,
        from_id: str,
        to_id: str,
        max_hops: int = 3
    ) -> Optional[List[str]]:
        """
        查找两个节点之间的最短路径

        Args:
            from_id: 起始节点ID
            to_id: 目标节点ID
            max_hops: 最大跳数

        Returns:
            节点ID列表（路径），如果不存在则返回None
        """
        if from_id not in self.nodes or to_id not in self.nodes:
            return None

        # BFS搜索
        from collections import deque

        queue = deque([(from_id, [from_id])])
        visited = {from_id}

        while queue:
            curr_id, path = queue.popleft()

            if curr_id == to_id:
                return path

            if len(path) > max_hops:
                continue

            # 查找邻居
            for edge in self.edges:
                next_id = None
                if edge["from"] == curr_id:
                    next_id = edge["to"]
                elif edge["to"] == curr_id:
                    next_id = edge["from"]

                if next_id and next_id not in visited:
                    visited.add(next_id)
                    queue.append((next_id, path + [next_id]))

        return None

    def get_stats(self) -> Dict[str, Any]:
        """获取图谱统计"""
        node_types = Counter(node["type"] for node in self.nodes.values())
        edge_types = Counter(edge["type"] for edge in self.edges)

        return {
            "total_nodes": len(self.nodes),
            "total_edges": len(self.edges),
            "node_types": dict(node_types),
            "edge_types": dict(edge_types)
        }

    def export_for_visualization(
        self,
        center_node_id: Optional[str] = None,
        depth: int = 1
    ) -> Dict[str, Any]:
        """
        导出用于前端可视化的图谱数据

        Args:
            center_node_id: 中心节点ID（如果指定，只返回邻域）
            depth: 邻域深度

        Returns:
            D3.js/Cytoscape.js 格式的图谱数据
        """
        if center_node_id:
            # 返回邻域
            neighborhood = self.query_neighbors(center_node_id, depth=depth)
            nodes = [
                {
                    "id": node_id,
                    **node_data,
                    "x": 0,  # 前端布局算法会计算
                    "y": 0
                }
                for node_id, node_data in neighborhood["nodes"].items()
            ]
            edges = neighborhood["edges"]
        else:
            # 返回整个图谱
            nodes = [
                {
                    "id": node_id,
                    **node_data,
                    "x": 0,
                    "y": 0
                }
                for node_id, node_data in self.nodes.items()
            ]
            edges = self.edges

        return {
            "nodes": nodes,
            "edges": edges
        }


# 全局单例
_knowledge_graph_instance = None

def get_knowledge_graph() -> KnowledgeGraph:
    """获取知识图谱单例"""
    global _knowledge_graph_instance
    if _knowledge_graph_instance is None:
        _knowledge_graph_instance = KnowledgeGraph()
    return _knowledge_graph_instance
