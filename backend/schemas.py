# backend/schemas.py
# 定义数据模型（新题型系统）

from pydantic import BaseModel
from typing import List, Dict, Optional, Any

# --- 1. 题目数据结构 ---

class Option(BaseModel):
    """选择题选项"""
    key: str  # A, B, C, D
    content: str
    is_correct: bool

class QuestionResponse(BaseModel):
    """题目响应格式（简化版）"""
    id: str
    subject: str
    type: str  # single_choice, multiple_choice, fill_blank, proof, essay
    difficulty: int
    stem: str  # 题干
    options: Optional[List[Option]] = None  # 选择题选项
    answer: Optional[str] = None  # 非选择题答案
    solution: Optional[str] = None  # 解析
    media: Optional[Dict[str, Optional[str]]] = None
    macro_tags: Optional[Dict[str, Any]] = None

# --- 2. 交互数据结构 ---

class AnswerSubmit(BaseModel):
    """答案提交（简化版）"""
    question_id: str
    selected_key: str  # 用户选择的答案（选择题是选项key，其他题型是文本）
    duration_ms: int
    is_hesitant: bool = False
    step_index: Optional[int] = None  # ✨ 复合题的小题索引（单题时为 None）

class MasteryUpdate(BaseModel):
    """熟练度更新"""
    user_id: str
    tag_updates: Dict[str, float]  # { "牛顿定律": 85.5 }