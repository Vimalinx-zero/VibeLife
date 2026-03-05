"""
JSON 题目批量导入路由
支持从 JSON 文件批量导入题目
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import List, Dict, Any, Optional
import json
import os
from sqlalchemy.orm import Session

from database import get_db
import models
import crud

router = APIRouter()


@router.post("/api/import/questions")
async def import_questions_from_json(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    从 JSON 文件批量导入题目

    JSON 格式参考：
    [
        {
            "question_id": "q_001",
            "subject": "数学",
            "type": "选择题",
            "difficulty": 3,
            "stem": "题目内容",
            "options": ["A", "B", "C", "D"],
            "answer": "A",
            "explanation": "解析",
            "tags": ["函数", "导数"],
            "source": "2024高考",
            "related_questions": ["q_002"]
        }
    ]

    Returns:
        {
            "success": true,
            "imported": 10,
            "skipped": 2,
            "errors": ["错误信息..."]
        }
    """

    # 验证文件类型
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="只支持 JSON 文件")

    try:
        # 读取文件内容
        content = await file.read()
        questions_data = json.loads(content.decode('utf-8'))

        if not isinstance(questions_data, list):
            raise HTTPException(status_code=400, detail="JSON 格式错误：根节点必须是数组")

        # 统计
        imported_count = 0
        skipped_count = 0
        errors = []

        for idx, q_data in enumerate(questions_data):
            try:
                # 验证必填字段
                if not q_data.get('stem'):
                    errors.append(f"第 {idx + 1} 条：缺少题干 (stem)")
                    continue

                # 检查题目是否已存在
                question_id = q_data.get('question_id') or f"imported_{imported_count + 1}_{hash(q_data['stem']) & 0x7fffffff}"

                existing = db.query(models.Question).filter(
                    models.Question.question_id == question_id
                ).first()

                if existing:
                    skipped_count += 1
                    continue

                # 构建题目数据
                question_dict = {
                    "question_id": question_id,
                    "subject": q_data.get("subject", "未分类"),
                    "type": q_data.get("type", "选择题"),
                    "difficulty": q_data.get("difficulty", 3),
                    "stem": q_data["stem"],
                    "options": q_data.get("options", []),
                    "answer": q_data.get("answer", ""),
                    "explanation": q_data.get("explanation", ""),
                    "tags": q_data.get("tags", []),
                    "source": q_data.get("source", ""),
                    "related_questions": q_data.get("related_questions", []),
                    "provenance": {
                        "created_at": q_data.get("created_at"),
                        "source": q_data.get("source", "JSON导入"),
                        "import_version": "1.0"
                    }
                }

                # 插入数据库
                crud.create_question(db, question_dict)
                imported_count += 1

            except Exception as e:
                errors.append(f"第 {idx + 1} 条：{str(e)}")
                continue

        return {
            "success": True,
            "imported": imported_count,
            "skipped": skipped_count,
            "total": len(questions_data),
            "errors": errors
        }

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"JSON 解析失败: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")


@router.post("/api/import/questions/batch")
async def import_questions_batch(
    questions: List[Dict[str, Any]],
    db: Session = Depends(get_db)
):
    """
    批量导入题目（直接传 JSON 数组）

    与上传文件不同，这个接口直接接收 JSON 数据

    Args:
        questions: 题目数组

    Returns:
        导入统计
    """

    if not isinstance(questions, list):
        raise HTTPException(status_code=400, detail="请求体必须是数组")

    imported_count = 0
    skipped_count = 0
    errors = []

    for idx, q_data in enumerate(questions):
        try:
            # 验证必填字段
            if not q_data.get('stem'):
                errors.append(f"第 {idx + 1} 条：缺少题干 (stem)")
                continue

            # 检查题目是否已存在
            question_id = q_data.get('question_id') or f"batch_{imported_count + 1}_{hash(q_data['stem']) & 0x7fffffff}"

            existing = db.query(models.Question).filter(
                models.Question.question_id == question_id
            ).first()

            if existing:
                skipped_count += 1
                continue

            # 构建题目数据
            question_dict = {
                "question_id": question_id,
                "subject": q_data.get("subject", "未分类"),
                "type": q_data.get("type", "选择题"),
                "difficulty": q_data.get("difficulty", 3),
                "stem": q_data["stem"],
                "options": q_data.get("options", []),
                "answer": q_data.get("answer", ""),
                "explanation": q_data.get("explanation", ""),
                "tags": q_data.get("tags", []),
                "source": q_data.get("source", ""),
                "related_questions": q_data.get("related_questions", []),
                "provenance": {
                    "created_at": q_data.get("created_at"),
                    "source": q_data.get("source", "批量导入"),
                    "import_version": "1.0"
                }
            }

            # 插入数据库
            crud.create_question(db, question_dict)
            imported_count += 1

        except Exception as e:
            errors.append(f"第 {idx + 1} 条：{str(e)}")
            continue

    return {
        "success": True,
        "imported": imported_count,
        "skipped": skipped_count,
        "total": len(questions),
        "errors": errors
    }


@router.get("/api/import/template")
async def get_import_template():
    """
    获取 JSON 导入模板示例

    Returns:
        JSON 模板和说明
    """

    template = {
        "description": "FlowStudy 题目 JSON 导入格式",
        "version": "1.0",
        "format": "array",
        "example": [
            {
                "question_id": "q_math_2024_001",
                "subject": "数学",
                "type": "选择题",
                "difficulty": 3,
                "stem": "设函数 f(x) = x³ + ax² + bx + c，且 f'(1) = f'(2) = 0，则下列结论正确的是",
                "options": [
                    "A. f(1) 是极大值",
                    "B. f(2) 是极小值",
                    "C. f(1) < f(2)",
                    "D. f(1) > f(2)"
                ],
                "answer": "D",
                "explanation": "由 f'(x) = 3x² + 2ax + b，f'(1) = f'(2) = 0 得...",
                "tags": ["函数", "导数", "极值"],
                "source": "2024高考",
                "related_questions": ["q_math_2024_002"]
            }
        ],
        "fields": {
            "question_id": "题目唯一标识（可选，不填则自动生成）",
            "subject": "学科（数学、物理、化学、生物等）",
            "type": "题型（选择题、填空题、解答题等）",
            "difficulty": "难度（1-5，1最简单，5最难）",
            "stem": "题干（必填）",
            "options": "选项数组（仅选择题需要）",
            "answer": "答案",
            "explanation": "解析",
            "tags": "标签数组（知识点、能力等）",
            "source": "来源（试卷名、教材等）",
            "related_questions": "相关题目 ID 数组"
        },
        "notes": [
            "question_id 如果不填写，系统会根据题干内容自动生成",
            "已存在的 question_id 会被跳过（不会覆盖）",
            "tags 字段建议包含：学科、题型、知识点",
            "difficulty 范围：1（基础）到 5（极难）"
        ]
    }

    return template
