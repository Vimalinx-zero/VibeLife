#(注释) backend/algorithm.py
#(注释) 核心算法引擎：负责权重更新计算和推荐排序

import math
import random
from typing import Dict, List
from schemas import QuestionResponse

class WeightCalculator:
    # --- Magic Numbers (黄金参数矩阵) ---
    ALPHA = 0.5          # 基础激进系数 (错题增长快)
    BETA_NORMAL = 0.6    # 正常掌握衰减 (对题下降快)
    BETA_HESITATE = 0.85 # 犹豫衰减 (对题下降慢)

    MULT_KNOWLEDGE = 1.0
    MULT_COGNITIVE = 1.5 # 思维错误惩罚更重

    MAX_SCORE = 100.0
    MIN_SCORE = 0.0

    @staticmethod
    def update_weight(current_weight: float, is_correct: bool | None, tag_type: str = 'knowledge', is_hesitant: bool = False) -> float:
        """根据做题结果计算新的 Tag 权重 (Sigmoid Growth / Exp Decay)

        Args:
            current_weight: 当前权重
            is_correct: 对错状态 (True=对, False=错, None=待评分不更新)
            tag_type: 标签类型 ('knowledge' 或 'cognitive')
            is_hesitant: 是否犹豫
        """
        # ✅ 待评分情况：不更新权重，直接返回当前值
        if is_correct is None:
            return current_weight

        # 1. 惩罚模式 (Penalty Phase)
        if not is_correct:
            multiplier = WeightCalculator.MULT_COGNITIVE if tag_type == 'cognitive' else WeightCalculator.MULT_KNOWLEDGE
            # 剩余空间百分比增长：分越高涨得越慢，防止溢出
            remaining_space = WeightCalculator.MAX_SCORE - current_weight
            delta = WeightCalculator.ALPHA * remaining_space * multiplier
            new_weight = current_weight + delta

        # 2. 奖励模式 (Reward Phase)
        else:
            decay = WeightCalculator.BETA_HESITATE if is_hesitant else WeightCalculator.BETA_NORMAL
            new_weight = current_weight * decay
            # 截断：小于5分视为完全掌握
            if new_weight < 5.0:
                new_weight = 0.0

        return min(max(new_weight, WeightCalculator.MIN_SCORE), WeightCalculator.MAX_SCORE)

class Recommender:
    def __init__(self, user_profile: Dict, question_db: List[QuestionResponse]):
        self.user_profile = user_profile # { "tag_weights": { "牛顿": 80, ... } }
        self.question_db = question_db

    def calculate_relevance(self, question: QuestionResponse) -> float:
        """计算一道题对当前用户的推荐分 (Relevance Score)"""
        score = 0.0
        user_weights = self.user_profile.get("tag_weights", {})

        # 1. 提取题目涉及的所有 Tag (包括宏观和微观)
        q_tags = set()
        # 宏观 Tag
        for cat, tags in question.base_info.macro_tags.items():
            if isinstance(tags, list): q_tags.update(tags)
            else: q_tags.add(tags)
        # 微观 Tag (遍历所有步骤的正确选项获益Tag)
        for step in question.steps:
            for opt in step.options:
                if opt.is_correct:
                    q_tags.update(opt.gain_micro_tags)

        # 2. 匹配用户画像 (User Profile Matching)
        hit_count = 0
        for tag in q_tags:
            if tag in user_weights:
                # 累加权重：用户越痛的点，分数加得越多
                score += user_weights[tag]
                hit_count += 1

        # 3. 难度惩罚 (Zone of Proximal Development)
        # 假设用户能力 user_level=3, 题目 difficulty=5 -> 太难了扣分
        user_level = self.user_profile.get("level", 3)
        diff_gap = question.base_info.difficulty - user_level
        if diff_gap > 1:
            score -= 20.0 * diff_gap # 太难扣分
        elif diff_gap < -1:
            score -= 10.0 * abs(diff_gap) # 太简单也扣分

        # 4. 随机扰动 (防止死板)
        score += random.uniform(0, 5)

        return score

    def get_recommendations(self, limit=3) -> List[QuestionResponse]:
        # 简单实现：遍历打分 + 排序 (生产环境应使用倒排索引 + 堆)
        scored_questions = []
        for q in self.question_db:
            score = self.calculate_relevance(q)
            scored_questions.append((score, q))

        # 按分数降序排列
        scored_questions.sort(key=lambda x: x[0], reverse=True)

        # 返回 Top K
        return [item[1] for item in scored_questions[:limit]]
