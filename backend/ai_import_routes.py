# backend/ai_import_routes.py
# AI 智能导入相关的 API 路由

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from database import get_db
import models
import crud
import datetime
import uuid

router = APIRouter()

class AIImportData(BaseModel):
    version: str
    source: str
    data: Dict[str, Any]

def clean_markdown_tables(content: str) -> str:
    """
    清理 Markdown 表格格式

    处理 AI 生成的 JSON 中表格的 || 挨着的问题
    例如：
    | 列1 | 列2 ||| 列3 |  -> | 列1 | 列2 |\n| 列3 |
    """
    import re

    # 匹配表格行中的 |||
    pattern = r'\|\|'

    def replace_table_row(match):
        """替换单个表格行中的 |||"""
        line = match.group(0)
        # 将 ||| 替换为 |\n|（换行+新的表格行开始）
        return line.replace('|||', '|\n|')

    # 只处理在表格行中的 |||（表格行以 | 开头）
    # 使用正则表达式匹配整行，并替换
    lines = content.split('\n')
    cleaned_lines = []

    for line in lines:
        # 如果这一行包含 |||，并且看起来像表格行（包含 |）
        if '|||' in line and '|' in line:
            # 替换 ||| 为 |\n|
            cleaned_lines.extend(line.replace('|||', '|\n|').split('\n'))
        else:
            cleaned_lines.append(line)

    return '\n'.join(cleaned_lines)

def clean_json_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    递归清理 JSON 数据中的 Markdown 内容
    """
    if isinstance(data, dict):
        cleaned = {}
        for key, value in data.items():
            if isinstance(value, str) and '|' in value:
                # 可能包含表格的字符串字段
                cleaned[key] = clean_markdown_tables(value)
            else:
                cleaned[key] = clean_json_data(value)
        return cleaned
    elif isinstance(data, list):
        return [clean_json_data(item) for item in data]
    else:
        return data

def generate_id(prefix: str) -> str:
    """生成唯一 ID"""
    return f"{prefix}_{int(datetime.datetime.now().timestamp() * 1000)}"

@router.post("/api/ai-import")
async def ai_import(data: AIImportData, db: Session = Depends(get_db)):
    """AI 智能导入 - 批量导入错题、笔记、解析和卡片"""
    try:
        print(f"📥 收到 AI 导入请求: {data.source}")
        print(f"📦 数据字段: {list(data.data.keys())}")

        # ✨ 清理 JSON 数据中的表格格式
        cleaned_data = clean_json_data(data.data)
        print(f"🧹 数据清理完成")

        result = {
            "success": True,
            "question": None,
            "note": None,
            "analysis": None,
            "mistake": None,
            "anki_cards": {"count": 0}
        }

        # 1. 导入题目
        question_id = None
        if "question" in cleaned_data:
            print("✅ 开始创建题目...")
            question_data = cleaned_data["question"]
            question_id = question_data.get("id", generate_id("q"))

            # 获取题干（用于显示）
            stem = question_data.get("stem", "题目")[:50] + "..." if len(question_data.get("stem", "")) > 50 else question_data.get("stem", "题目")

            # ✨ 新增：处理 composite 类型（复合题）
            question_type = question_data.get("type", "single_choice")
            is_composite = question_type == "composite"

            if is_composite:
                # 复合题：提取 steps 数组
                steps = question_data.get("steps", [])
                print(f"  📋 复合题，包含 {len(steps)} 个小题")

                # 构建复合题数据
                question = models.Question(
                    id=question_id,
                    subject=question_data.get("subject", "other"),
                    type=question_type,
                    difficulty=question_data.get("difficulty", 3),
                    stem=question_data.get("stem", ""),
                    options=None,  # 复合题不需要题目级选项
                    answer=None,  # 复合题不需要题目级答案
                    solution=None,  # 复合题的解析在各小题中
                    media=question_data.get("media"),
                    macro_tags=question_data.get("macro_tags", {}),
                    related_notes=[],  # 稍后填充
                    steps=steps,  # ✨ 小题数组
                    is_composite=True  # ✨ 标记为复合题
                )
            else:
                # 单一题目：原有逻辑
                question = models.Question(
                    id=question_id,
                    subject=question_data.get("subject", "other"),
                    type=question_type,
                    difficulty=question_data.get("difficulty", 3),
                    stem=question_data.get("stem", ""),
                    options=question_data.get("options"),
                    answer=question_data.get("answer"),
                    solution=question_data.get("solution"),
                    media=question_data.get("media"),
                    macro_tags=question_data.get("macro_tags", {}),
                    related_notes=[],  # 稍后填充
                    steps=[],  # 单题没有 steps
                    is_composite=False  # 标记为非复合题
                )

            db.add(question)
            db.commit()

            print(f"✅ 题目创建成功: {question_id} ({'复合题' if is_composite else '单题'})")
            result["question"] = {"id": question_id, "title": stem}

        # 2. 导入笔记
        note_id = None
        if "note" in cleaned_data:
            print("✅ 开始创建笔记...")
            note_data = cleaned_data["note"]
            note_id = generate_id("note")

            # 查找或创建文件夹
            folder_id = note_data.get("folder_id", "root")
            if folder_id != "root":
                folder = db.query(models.FileItem).filter(models.FileItem.id == folder_id).first()
                if not folder:
                    folder_id = "root"

            # 创建笔记
            note = models.FileItem(
                id=note_id,
                type="file",
                name=note_data.get("title", "AI 生成的笔记"),
                content=note_data.get("content", ""),
                parent_id=folder_id,
                date=datetime.date.today().strftime("%Y-%m-%d"),
                tags=note_data.get("tags", [])
            )
            db.add(note)
            db.commit()

            # ✨ 如果导入了题目，在题目上记录笔记关联
            if "question" in cleaned_data and question_id:
                question = db.query(models.Question).filter(models.Question.id == question_id).first()
                if question:
                    if not question.related_notes:
                        question.related_notes = []
                    if note_id not in question.related_notes:
                        question.related_notes.append(note_id)
                        flag_modified(question, "related_notes")
                        db.commit()

            print(f"✅ 笔记创建成功: {note_id}")
            result["note"] = {"id": note_id, "title": note_data.get("title", "AI 生成的笔记")}

        # 3. 导入错题记录（新增）
        mistake_id = None
        if "question" in cleaned_data and question_id and note_id:
            try:
                print("✅ 开始创建错题记录...")
                # 自动创建错题记录
                question_data = cleaned_data.get("question", {})
                subject = question_data.get("subject", "题目")

                mistake = models.Mistake(
                    user_id="default_user",
                    question_id=question_id,
                    user_answer=None,  # 用户未做题，先记录
                    linked_note_id=note_id,  # ✨ 关联笔记
                    error_count=1,
                    mastery=0.0,
                    last_error_time=datetime.date.today().strftime("%Y-%m-%d"),
                    history=[],
                    related_cards=[],  # 稍后填充卡片ID
                    related_questions=[]  # 可选：相关题目
                )
                db.add(mistake)
                db.commit()
                mistake_id = mistake.id

                print(f"✅ 错题记录创建成功: {mistake_id}")
                result["mistake"] = {
                    "id": mistake_id,
                    "title": f"错题记录 - {subject}"
                }
            except Exception as e:
                # 错题记录创建失败不影响其他内容
                print(f"❌ 错题记录创建失败: {str(e)}")
                import traceback
                traceback.print_exc()

        # 4. 导入解析（作为笔记的一部分）
        if "analysis" in cleaned_data and note_id:
            analysis_data = cleaned_data["analysis"]
            analysis_content = f"""# {analysis_data.get('title', '题目解析')}

{analysis_data.get('content', '')}

---
*由 AI Agent 自动生成*
"""

            # 更新笔记内容，追加解析
            note = db.query(models.FileItem).filter(models.FileItem.id == note_id).first()
            if note:
                note.content = note.content + "\n\n" + analysis_content
                db.commit()

                result["analysis"] = {"id": note_id, "title": analysis_data.get("title", "题目解析")}

        # 5. 导入 Anki 卡片（增强关联）
        imported_card_ids = []
        if "anki_cards" in cleaned_data:
            print("✅ 开始创建记忆卡...")
            cards_data = cleaned_data["anki_cards"]
            imported_count = 0

            for card_data in cards_data:
                card_id = generate_id("card")

                # 解析 deck 名称（使用完整的 deck 名称作为合集名称）
                deck_name = card_data.get("deck", "默认")

                # 查找或创建合集（Collection 模型不支持层级结构，使用完整的 deck 名称）
                collection = db.query(models.Collection).filter(
                    models.Collection.name == deck_name,
                    models.Collection.user_id == "default_user"
                ).first()

                if not collection:
                    # 创建新合集（使用完整的 deck 名称）
                    collection = models.Collection(
                        id=generate_id("collection"),
                        name=deck_name,
                        user_id="default_user",
                        description=f"从 AI 导入创建的合集: {deck_name}",
                        color="blue"
                    )
                    db.add(collection)
                    db.commit()
                    db.flush()  # 确保 collection.id 可用

                # 创建卡片（✨ 完整关联）
                card = models.FlashCard(
                    id=card_id,
                    front=card_data.get("front", ""),
                    back=card_data.get("back", ""),
                    tags=card_data.get("tags", []),
                    deck=deck_name,
                    source_note_id=note_id,  # ✨ 来源笔记
                    source_mistake_id=mistake_id,  # ✨ 来源错题（间接关联到题目）
                    created_at=datetime.datetime.utcnow().isoformat()
                )
                db.add(card)
                db.commit()  # 提交以确保 card 对象有 ID

                # 添加到合集
                collection_card = models.CollectionCard(
                    id=generate_id("cc"),
                    collection_id=collection.id,
                    card_id=card_id
                )
                db.add(collection_card)

                imported_card_ids.append(card_id)
                imported_count += 1

            db.commit()

            # ✨ 在错题记录中关联卡片
            if mistake_id and imported_card_ids:
                mistake = db.query(models.Mistake).filter(models.Mistake.id == mistake_id).first()
                if mistake:
                    mistake.related_cards = imported_card_ids
                    flag_modified(mistake, "related_cards")
                    db.commit()

            print(f"✅ 记忆卡创建成功: {imported_count} 张")
            result["anki_cards"] = {"count": imported_count}

        print(f"🎉 AI 导入完成: 题目={question_id}, 笔记={note_id}, 错题={mistake_id}, 卡片={result['anki_cards']['count']}张")
        return result

    except Exception as e:
        db.rollback()
        import traceback
        error_detail = f"导入失败: {str(e)}\n\n堆栈跟踪:\n{traceback.format_exc()}"
        print(f"❌ {error_detail}")
        raise HTTPException(status_code=500, detail=error_detail)
