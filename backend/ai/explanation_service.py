# backend/ai/explanation_service.py
# AI讲解服务 - 为错题、笔记生成讲解内容

from typing import Dict, Any, Optional, List
import json

class ExplanationService:
    """
    AI讲解服务

    功能：
    - 为错题生成详细讲解
    - 为笔记生成总结和扩展
    - 回答关于内容的提问
    """

    def __init__(self):
        """初始化讲解服务"""
        # 这里可以集成LLM API（OpenAI、DeepSeek等）
        # 暂时使用规则引擎生成讲解
        pass

    async def explain_mistake(
        self,
        mistake: Dict[str, Any],
        question: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        为错题生成讲解

        Args:
            mistake: 错题数据
            question: 题目数据

        Returns:
            讲解内容（包含错误分析、知识点讲解、建议）
        """
        question_content = question.get("content", {})
        stem = question_content.get("stem", "")
        options = question_content.get("options", {})
        correct_answer = question_content.get("answer", "")
        analysis = question_content.get("analysis", "")

        user_answer = mistake.get("user_answer", "")
        error_count = mistake.get("error_count", 1)

        # 生成讲解结构
        explanation = {
            "summary": "",  # 一句话总结
            "error_analysis": {  # 错误分析
                "error_type": "",  # 错误类型
                "root_cause": [],  # 根本原因
                "misconceptions": []  # 误解点
            },
            "knowledge_points": [],  # 涉及知识点
            "step_by_step": [],  # 逐步讲解
            "tips": [],  # 学习建议
            "related_concepts": []  # 相关概念
        }

        # 1. 生成总结
        explanation["summary"] = self._generate_summary(
            stem, correct_answer, user_answer
        )

        # 2. 分析错误类型
        explanation["error_analysis"] = self._analyze_error_type(
            mistake, question
        )

        # 3. 提取知识点
        explanation["knowledge_points"] = self._extract_knowledge_points(
            question
        )

        # 4. 逐步讲解
        explanation["step_by_step"] = self._generate_step_by_step(
            stem, options, correct_answer, analysis
        )

        # 5. 学习建议
        explanation["tips"] = self._generate_tips(
            mistake, question
        )

        # 6. 相关概念
        explanation["related_concepts"] = self._find_related_concepts(
            question
        )

        return explanation

    def _generate_summary(
        self,
        stem: str,
        correct_answer: str,
        user_answer: str
    ) -> str:
        """生成一句话总结"""
        if not correct_answer:
            return "这道题目考查了基础概念的理解。"

        return (
            f"这道题的正确答案是 {correct_answer}。"
            f"你需要掌握相关的知识点，避免概念混淆。"
        )

    def _analyze_error_type(
        self,
        mistake: Dict[str, Any],
        question: Dict[str, Any]
    ) -> Dict[str, Any]:
        """分析错误类型"""
        error_count = mistake.get("error_count", 1)
        mastery = mistake.get("mastery", 0)

        # 基于熟练度判断错误类型
        if mastery < 0.3:
            error_type = "概念不清晰"
            root_cause = [
                "对基础概念理解不足",
                "需要重新学习相关知识点"
            ]
            misconceptions = ["概念混淆", "记忆错误"]
        elif mastery < 0.7:
            error_type = "应用不熟练"
            root_cause = [
                "理解概念但不会应用",
                "缺乏练习"
            ]
            misconceptions = ["方法不当", "步骤遗漏"]
        else:
            error_type = "粗心大意"
            root_cause = [
                "审题不仔细",
                "计算失误"
            ]
            misconceptions = ["注意力不集中"]

        return {
            "error_type": error_type,
            "root_cause": root_cause,
            "misconceptions": misconceptions
        }

    def _extract_knowledge_points(
        self,
        question: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """提取知识点"""
        knowledge_points = []

        # 从 macro_tags 提取
        macro_tags = question.get("macro_tags", {})
        if isinstance(macro_tags, dict):
            for key, value in macro_tags.items():
                if isinstance(value, list):
                    for item in value:
                        knowledge_points.append({
                            "name": item,
                            "category": key,
                            "importance": "高" if key in ["模块", "题型"] else "中"
                        })

        # 添加学科
        subject = question.get("subject")
        if subject:
            knowledge_points.insert(0, {
                "name": subject,
                "category": "学科",
                "importance": "高"
            })

        return knowledge_points[:5]  # 最多返回5个

    def _generate_step_by_step(
        self,
        stem: str,
        options: Dict,
        correct_answer: str,
        analysis: str
    ) -> List[Dict[str, str]]:
        """生成逐步讲解"""
        steps = []

        # 步骤1：审题
        steps.append({
            "step": 1,
            "title": "审题",
            "content": "首先理解题目在问什么，明确已知条件和求解目标。",
            "highlight": "注意关键词"
        })

        # 步骤2：知识点
        steps.append({
            "step": 2,
            "title": "识别知识点",
            "content": "确定题目考查的知识点，回忆相关概念、公式、定理。",
            "highlight": "定位考点"
        })

        # 步骤3：解题思路
        if analysis:
            steps.append({
                "step": 3,
                "title": "解题思路",
                "content": analysis[:200] + "..." if len(analysis) > 200 else analysis,
                "highlight": "逻辑推理"
            })
        else:
            steps.append({
                "step": 3,
                "title": "解题思路",
                "content": "根据知识点，选择合适的解题方法。",
                "highlight": "方法选择"
            })

        # 步骤4：验证答案
        if correct_answer:
            steps.append({
                "step": 4,
                "title": "验证答案",
                "content": f"正确答案是 {correct_answer}。检查你的答案是否正确。",
                "highlight": f"答案: {correct_answer}"
            })

        return steps

    def _generate_tips(
        self,
        mistake: Dict[str, Any],
        question: Dict[str, Any]
    ) -> List[str]:
        """生成学习建议"""
        tips = []

        mastery = mistake.get("mastery", 0)
        error_count = mistake.get("error_count", 1)

        if mastery < 0.3:
            tips = [
                "📖 建议重新学习相关基础概念",
                "📝 整理知识点笔记，加深理解",
                "🎯 先做简单题，建立信心"
            ]
        elif mastery < 0.7:
            tips = [
                "💪 加强练习，巩固知识点",
                "🔍 总结解题方法和技巧",
                "📊 分析错题模式，找出薄弱环节"
            ]
        else:
            tips = [
                "⚠️ 注意审题，避免粗心错误",
                "✅ 养成验算的好习惯",
                "🎯 挑战更有难度的题目"
            ]

        # 添加通用建议
        tips.extend([
            "🔄 定期复习，避免遗忘",
            "🤝 与同学讨论，加深理解"
        ])

        return tips[:6]

    def _find_related_concepts(
        self,
        question: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """查找相关概念"""
        concepts = []

        # 基于学科推荐
        subject = question.get("subject")
        if subject == "physics":
            concepts = [
                {"name": "受力分析", "relation": "前置知识"},
                {"name": "牛顿运动定律", "relation": "核心概念"},
                {"name": "能量守恒", "relation": "相关概念"}
            ]
        elif subject == "mathematics":
            concepts = [
                {"name": "函数基础", "relation": "前置知识"},
                {"name": "导数应用", "relation": "核心概念"},
                {"name": "不等式", "relation": "相关概念"}
            ]
        elif subject == "english":
            concepts = [
                {"name": "词汇量", "relation": "基础能力"},
                {"name": "语法知识", "relation": "核心概念"},
                {"name": "阅读技巧", "relation": "相关技能"}
            ]
        else:
            concepts = [
                {"name": "基础概念", "relation": "前置知识"},
                {"name": "核心知识", "relation": "核心概念"}
            ]

        return concepts

    async def explain_note(
        self,
        note: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        为笔记生成讲解

        Args:
            note: 笔记数据

        Returns:
            讲解内容（总结、关键词、扩展建议）
        """
        content = note.get("content", "")
        tags = note.get("tags", [])
        name = note.get("name", "")

        return {
            "summary": self._summarize_note(content),
            "key_points": self._extract_key_points(content, tags),
            "suggestions": self._generate_note_suggestions(tags),
            "quiz_questions": self._generate_quiz_from_note(note)
        }

    def _summarize_note(self, content: str) -> str:
        """总结笔记"""
        if not content:
            return "这是你的学习笔记。"

        # 取前100字作为摘要
        return content[:100] + "..." if len(content) > 100 else content

    def _extract_key_points(
        self,
        content: str,
        tags: List[str]
    ) -> List[str]:
        """提取笔记要点"""
        key_points = []

        # 从标签提取
        key_points.extend([f"📌 {tag}" for tag in tags[:3]])

        # 基于内容简单提取（实际应该用AI）
        if content:
            lines = content.split('\n')
            for line in lines:
                line = line.strip()
                if line and len(line) < 50 and any(marker in line for marker in ['1.', '2.', '•', '-', '★']):
                    key_points.append(f"💡 {line}")
                    if len(key_points) >= 5:
                        break

        return key_points[:5]

    def _generate_note_suggestions(
        self,
        tags: List[str]
    ) -> List[str]:
        """生成笔记学习建议"""
        suggestions = [
            "🔄 定期复习笔记内容",
            "📝 尝试用自己的话复述",
            "🎯 将知识点与题目结合"
        ]

        if tags:
            suggestions.append(f"🔗 探索与 '{tags[0]}' 相关的其他内容")

        return suggestions

    def _generate_quiz_from_note(
        self,
        note: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """从笔记生成测试题"""
        # 简化实现：返回通用问题
        return [
            {
                "type": "recall",
                "question": "你能复述这个知识点的核心内容吗？"
            },
            {
                "type": "application",
                "question": "这个知识点的典型应用场景是什么？"
            }
        ]


# 全局单例
_explanation_service_instance = None

def get_explanation_service() -> ExplanationService:
    """获取讲解服务单例"""
    global _explanation_service_instance
    if _explanation_service_instance is None:
        _explanation_service_instance = ExplanationService()
    return _explanation_service_instance
