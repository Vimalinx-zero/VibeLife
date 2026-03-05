# backend/export_routes.py
# 题库导入导出 API

from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Tuple
from datetime import datetime
import json
import io
import zipfile
from database import get_db
import models
from auth import get_current_user_id

router = APIRouter(prefix="/api/data", tags=["data"])


def _extract_questions_payload(payload: Any) -> list[dict]:
    """Normalize question payload from list/object/batch wrapper."""
    if isinstance(payload, list):
        return payload

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid questions payload")

    if isinstance(payload.get("questions"), list):
        return payload["questions"]

    if isinstance(payload.get("question"), dict):
        return [payload["question"]]

    return [payload]


def _normalize_question_record(record: dict) -> dict:
    """Map various question schemas to internal model fields."""
    meta = record.get("meta", {}) if isinstance(record.get("meta"), dict) else {}
    base_info = (
        record.get("base_info", {}) if isinstance(record.get("base_info"), dict) else {}
    )

    question_id = record.get("id") or meta.get("id")
    if not question_id:
        raise ValueError("missing question id")

    raw_options = record.get("options")
    normalized_options = []
    if isinstance(raw_options, list):
        for option in raw_options:
            if not isinstance(option, dict):
                continue
            normalized_options.append(
                {
                    "key": str(option.get("key", "")),
                    "content": option.get("content") or option.get("text", ""),
                    "is_correct": bool(option.get("is_correct", False)),
                }
            )

    raw_media = record.get("media")
    normalized_media = raw_media if isinstance(raw_media, dict) else {}

    return {
        "id": str(question_id),
        "subject": record.get("subject") or base_info.get("subject", ""),
        "type": record.get("type") or base_info.get("type", "single_choice"),
        "difficulty": int(record.get("difficulty") or base_info.get("difficulty") or 3),
        "macro_tags": record.get("macro_tags") or base_info.get("macro_tags") or {},
        "stem": record.get("stem", ""),
        "options": normalized_options,
        "answer": record.get("answer", ""),
        "solution": record.get("solution") or record.get("explanation", ""),
        "media": normalized_media,
    }


def _upsert_questions(
    db: Session, question_records: list[dict]
) -> Tuple[int, list[dict]]:
    """Upsert question records and return (imported_count, errors)."""
    imported_count = 0
    errors: list[dict] = []

    for record in question_records:
        try:
            normalized = _normalize_question_record(record)
            existing = (
                db.query(models.Question)
                .filter(models.Question.id == normalized["id"])
                .first()
            )

            if existing:
                existing.subject = normalized["subject"]
                existing.type = normalized["type"]
                existing.difficulty = normalized["difficulty"]
                existing.macro_tags = normalized["macro_tags"]
                existing.stem = normalized["stem"]
                existing.options = normalized["options"]
                existing.answer = normalized["answer"]
                existing.solution = normalized["solution"]
                existing.media = normalized["media"]
            else:
                db.add(models.Question(**normalized))

            imported_count += 1
        except Exception as e:
            errors.append({"error": str(e), "data": record})

    return imported_count, errors


def _parse_backup_content(content: bytes) -> dict:
    """Parse JSON backup or legacy ZIP backup to unified structure."""
    try:
        decoded = content.decode("utf-8")
        parsed = json.loads(decoded)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    try:
        with zipfile.ZipFile(io.BytesIO(content), "r") as zip_file:
            data: dict[str, Any] = {}

            if "questions.json" in zip_file.namelist():
                data["questions"] = json.loads(zip_file.read("questions.json"))
            if "notes.json" in zip_file.namelist():
                data["notes"] = json.loads(zip_file.read("notes.json"))
            if "mistakes.json" in zip_file.namelist():
                data["mistakes"] = json.loads(zip_file.read("mistakes.json"))
            if "flashcards.json" in zip_file.namelist():
                data["flashcards"] = json.loads(zip_file.read("flashcards.json"))

            return {
                "version": "legacy-zip",
                "export_info": {},
                "data": data,
            }
    except Exception:
        raise HTTPException(
            status_code=400, detail="Backup file must be valid JSON or ZIP"
        )


# ========================
# 导出功能
# ========================


@router.get("/export/questions")
async def export_questions(
    format: str = "json", subject: str | None = None, db: Session = Depends(get_db)
):
    """
    导出题库
    参数:
    - format: 导出格式 (json/csv)
    - subject: 过滤学科 (可选)
    """
    try:
        # 查询题目
        query = db.query(models.Question)
        if subject:
            query = query.filter(models.Question.subject == subject)
        questions = query.all()

        # 转换为标准格式
        formatted_questions = []
        for q in questions:
            formatted_q = {
                "meta": {
                    "id": q.id,
                    "source": "database",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "verified": True,
                },
                "base_info": {
                    "subject": q.subject,
                    "type": q.type,
                    "difficulty": q.difficulty,
                    "macro_tags": q.macro_tags if q.macro_tags else {},
                },
                # ✅ 使用新数据格式
                "stem": q.stem or "",
                "options": q.options or [],
                "answer": q.answer or "",
                "solution": q.solution or "",
                "media": q.media or [],
            }
            formatted_questions.append(formatted_q)

        # 生成导出数据
        export_data = {
            "version": "1.0.0",
            "batch": True,
            "metadata": {
                "total": len(formatted_questions),
                "exported_at": datetime.now().isoformat(),
                "filter": {"subject": subject} if subject else "all",
            },
            "questions": formatted_questions,
        }

        # 保存到临时文件
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"questions_export_{timestamp}.json"
        filepath = f"/tmp/{filename}"

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        return FileResponse(filepath, filename=filename, media_type="application/json")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.get("/export/mistakes")
async def export_mistakes(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """导出错题本"""
    try:
        mistakes = (
            db.query(models.Mistake)
            .filter(models.Mistake.user_id == current_user_id)
            .all()
        )

        formatted_mistakes = []
        for m in mistakes:
            # 获取题目信息
            question = (
                db.query(models.Question)
                .filter(models.Question.id == m.question_id)
                .first()
            )

            formatted_m = {
                "meta": {
                    "id": f"mistake_{m.id}",
                    "created_at": m.last_error_time,
                    "error_count": m.error_count,
                    "mastery": m.mastery,
                },
                "question": {
                    "id": m.question_id,
                    "subject": question.subject if question else "unknown",
                    "type": question.type if question else "unknown",
                    "stem": question.stem if question else "",
                    "options": question.options if question else [],
                    "answer": question.answer if question else "",
                    "solution": question.solution if question else "",
                }
                if question
                else None,
                "user_data": {
                    "user_answer": m.user_answer,
                    "history": m.history if m.history else [],
                },
                "linked_note_id": m.linked_note_id,
            }
            formatted_mistakes.append(formatted_m)

        export_data = {
            "version": "1.0.0",
            "user_id": current_user_id,
            "total": len(formatted_mistakes),
            "exported_at": datetime.now().isoformat(),
            "mistakes": formatted_mistakes,
        }

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"mistakes_{current_user_id}_{timestamp}.json"
        filepath = f"/tmp/{filename}"

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        return FileResponse(filepath, filename=filename, media_type="application/json")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出错题失败: {str(e)}")


@router.get("/export/notes")
async def export_notes(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """导出笔记"""
    try:
        notes = (
            db.query(models.FileItem)
            .filter(
                models.FileItem.user_id == current_user_id,
                models.FileItem.type == "file",
            )
            .all()
        )

        formatted_notes = []
        for note in notes:
            formatted_note = {
                "meta": {
                    "id": note.id,
                    "name": note.name,
                    "created_at": note.date,
                    "parent_id": note.parent_id,
                },
                "content": note.content,
            }
            formatted_notes.append(formatted_note)

        export_data = {
            "version": "1.0.0",
            "total": len(formatted_notes),
            "exported_at": datetime.now().isoformat(),
            "notes": formatted_notes,
        }

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"notes_{timestamp}.json"
        filepath = f"/tmp/{filename}"

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        return FileResponse(filepath, filename=filename, media_type="application/json")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出笔记失败: {str(e)}")


@router.get("/export/all")
async def export_all_data(
    format: str = "json",
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """导出所有数据（完整备份）"""
    try:
        if format != "json":
            raise HTTPException(status_code=400, detail="Only json format is supported")

        # 导出题库
        questions = db.query(models.Question).all()
        formatted_questions = []
        for q in questions:
            formatted_q = {
                "meta": {
                    "id": q.id,
                    "subject": q.subject,
                    "type": q.type,
                    "difficulty": q.difficulty,
                },
                "base_info": {
                    "subject": q.subject,
                    "type": q.type,
                    "difficulty": q.difficulty,
                    "macro_tags": q.macro_tags if q.macro_tags else {},
                },
                # ✅ 使用新数据格式
                "stem": q.stem or "",
                "options": q.options or [],
                "answer": q.answer or "",
                "solution": q.solution or "",
                "media": q.media or [],
            }
            formatted_questions.append(formatted_q)

        # 导出错题
        mistakes = (
            db.query(models.Mistake)
            .filter(models.Mistake.user_id == current_user_id)
            .all()
        )
        formatted_mistakes = []
        for m in mistakes:
            formatted_m = {
                "question_id": m.question_id,
                "user_answer": m.user_answer,
                "error_count": m.error_count,
                "mastery": m.mastery,
                "last_error_time": m.last_error_time,
                "history": m.history if m.history else [],
                "linked_note_id": m.linked_note_id,
            }
            formatted_mistakes.append(formatted_m)

        # 导出笔记
        notes = (
            db.query(models.FileItem)
            .filter(models.FileItem.user_id == current_user_id)
            .all()
        )
        formatted_notes = []
        for note in notes:
            formatted_note = {
                "id": note.id,
                "type": note.type,
                "name": note.name,
                "parent_id": note.parent_id,
                "content": note.content,
                "tags": note.tags or [],
                "date": note.date,
            }
            formatted_notes.append(formatted_note)

        # 导出记忆卡
        flashcards = (
            db.query(models.FlashCard)
            .filter(models.FlashCard.user_id == current_user_id)
            .all()
        )
        formatted_flashcards = []
        for card in flashcards:
            formatted_flashcards.append(
                {
                    "id": card.id,
                    "front": card.front,
                    "back": card.back,
                    "tags": card.tags or [],
                    "deck": card.deck,
                    "ease_factor": card.ease_factor,
                    "interval": card.interval,
                    "repetitions": card.repetitions,
                    "next_review_date": card.next_review_date,
                }
            )

        # 导出用户画像
        user_profile = (
            db.query(models.UserProfile)
            .filter(models.UserProfile.user_id == current_user_id)
            .first()
        )

        export_data = {
            "version": "1.0.0",
            "export_info": {
                "user_id": current_user_id,
                "exported_at": datetime.now().isoformat(),
                "total_questions": len(formatted_questions),
                "total_mistakes": len(formatted_mistakes),
                "total_notes": len(formatted_notes),
                "total_flashcards": len(formatted_flashcards),
            },
            "data": {
                "questions": formatted_questions,
                "mistakes": formatted_mistakes,
                "notes": formatted_notes,
                "flashcards": formatted_flashcards,
                "user_profile": {
                    "user_id": user_profile.user_id
                    if user_profile
                    else current_user_id,
                    "level": user_profile.level if user_profile else 1,
                    "tag_weights": user_profile.tag_weights if user_profile else {},
                }
                if user_profile
                else None,
            },
        }

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"flowstudy_backup_{timestamp}.json"
        filepath = f"/tmp/{filename}"

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        return FileResponse(filepath, filename=filename, media_type="application/json")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


# ========================
# 导入功能
# ========================


def _import_backup_data(
    db: Session, current_user_id: str, payload: dict
) -> Tuple[dict, list]:
    """Import backup payload into current user's data space."""
    backup_data = (
        payload.get("data") if isinstance(payload.get("data"), dict) else payload
    )
    if not isinstance(backup_data, dict):
        raise HTTPException(status_code=400, detail="Invalid backup payload")

    imported = {
        "questions": 0,
        "mistakes": 0,
        "notes": 0,
        "flashcards": 0,
        "user_profile": 0,
    }
    errors: list[dict] = []

    question_records = backup_data.get("questions") or []
    if isinstance(question_records, list):
        imported["questions"], question_errors = _upsert_questions(db, question_records)
        errors.extend(question_errors)

    note_records = backup_data.get("notes") or []
    if isinstance(note_records, list):
        for note_data in note_records:
            if not isinstance(note_data, dict):
                errors.append({"error": "invalid note record", "data": note_data})
                continue

            note_id = note_data.get("id")
            if not note_id:
                errors.append({"error": "missing note id", "data": note_data})
                continue

            existing = (
                db.query(models.FileItem)
                .filter(
                    models.FileItem.id == note_id,
                    models.FileItem.user_id == current_user_id,
                )
                .first()
            )

            if existing:
                existing.type = note_data.get("type", existing.type)
                existing.name = note_data.get("name", existing.name)
                existing.parent_id = note_data.get("parent_id", existing.parent_id)
                existing.content = note_data.get("content", existing.content)
                existing.tags = note_data.get("tags", existing.tags or [])
                existing.date = note_data.get("date", existing.date)
            else:
                conflicting_id = (
                    db.query(models.FileItem)
                    .filter(models.FileItem.id == note_id)
                    .first()
                )
                if conflicting_id:
                    note_id = f"{note_id}_{int(datetime.now().timestamp())}"

                db.add(
                    models.FileItem(
                        id=note_id,
                        user_id=current_user_id,
                        type=note_data.get("type", "file"),
                        name=note_data.get("name", "未命名"),
                        parent_id=note_data.get("parent_id", "root"),
                        content=note_data.get("content", ""),
                        tags=note_data.get("tags", []),
                        date=note_data.get("date"),
                    )
                )

            imported["notes"] += 1

    mistake_records = backup_data.get("mistakes") or []
    if isinstance(mistake_records, list):
        for mistake_data in mistake_records:
            if not isinstance(mistake_data, dict):
                errors.append({"error": "invalid mistake record", "data": mistake_data})
                continue

            question_id = mistake_data.get("question_id")
            if not question_id:
                errors.append(
                    {"error": "missing mistake question_id", "data": mistake_data}
                )
                continue

            existing = (
                db.query(models.Mistake)
                .filter(
                    models.Mistake.user_id == current_user_id,
                    models.Mistake.question_id == question_id,
                )
                .first()
            )

            if existing:
                existing.user_answer = mistake_data.get(
                    "user_answer", existing.user_answer
                )
                existing.error_count = int(
                    mistake_data.get("error_count", existing.error_count or 1)
                )
                existing.mastery = float(
                    mistake_data.get("mastery", existing.mastery or 0)
                )
                existing.last_error_time = mistake_data.get(
                    "last_error_time", existing.last_error_time
                )
                existing.history = mistake_data.get("history", existing.history or [])
                existing.linked_note_id = mistake_data.get(
                    "linked_note_id", existing.linked_note_id
                )
            else:
                db.add(
                    models.Mistake(
                        user_id=current_user_id,
                        question_id=question_id,
                        user_answer=mistake_data.get("user_answer", ""),
                        error_count=int(mistake_data.get("error_count", 1)),
                        mastery=float(mistake_data.get("mastery", 0.0)),
                        last_error_time=mistake_data.get("last_error_time"),
                        history=mistake_data.get("history", []),
                        linked_note_id=mistake_data.get("linked_note_id"),
                    )
                )

            imported["mistakes"] += 1

    flashcard_records = backup_data.get("flashcards") or []
    if isinstance(flashcard_records, list):
        for card_data in flashcard_records:
            if not isinstance(card_data, dict):
                errors.append({"error": "invalid flashcard record", "data": card_data})
                continue

            card_id = card_data.get("id")
            if not card_id:
                errors.append({"error": "missing flashcard id", "data": card_data})
                continue

            existing = (
                db.query(models.FlashCard)
                .filter(
                    models.FlashCard.id == card_id,
                    models.FlashCard.user_id == current_user_id,
                )
                .first()
            )

            if existing:
                existing.front = card_data.get("front", existing.front)
                existing.back = card_data.get("back", existing.back)
                existing.tags = card_data.get("tags", existing.tags or [])
                existing.deck = card_data.get("deck", existing.deck)
                existing.ease_factor = float(
                    card_data.get("ease_factor", existing.ease_factor or 2.5)
                )
                existing.interval = int(
                    card_data.get("interval", existing.interval or 0)
                )
                existing.repetitions = int(
                    card_data.get("repetitions", existing.repetitions or 0)
                )
                existing.next_review_date = card_data.get(
                    "next_review_date", existing.next_review_date
                )
            else:
                conflicting_id = (
                    db.query(models.FlashCard)
                    .filter(models.FlashCard.id == card_id)
                    .first()
                )
                if conflicting_id:
                    card_id = f"{card_id}_{int(datetime.now().timestamp())}"

                db.add(
                    models.FlashCard(
                        id=card_id,
                        user_id=current_user_id,
                        front=card_data.get("front", ""),
                        back=card_data.get("back", ""),
                        tags=card_data.get("tags", []),
                        deck=card_data.get("deck", "default"),
                        ease_factor=float(card_data.get("ease_factor", 2.5)),
                        interval=int(card_data.get("interval", 0)),
                        repetitions=int(card_data.get("repetitions", 0)),
                        next_review_date=card_data.get("next_review_date"),
                    )
                )

            imported["flashcards"] += 1

    profile_data = backup_data.get("user_profile")
    if isinstance(profile_data, dict):
        existing_profile = (
            db.query(models.UserProfile)
            .filter(models.UserProfile.user_id == current_user_id)
            .first()
        )

        if existing_profile:
            existing_profile.level = profile_data.get("level", existing_profile.level)
            existing_profile.tag_weights = profile_data.get(
                "tag_weights", existing_profile.tag_weights or {}
            )
        else:
            db.add(
                models.UserProfile(
                    user_id=current_user_id,
                    level=profile_data.get("level", 1),
                    tag_weights=profile_data.get("tag_weights", {}),
                )
            )

        imported["user_profile"] += 1

    return imported, errors


@router.post("/import/questions")
async def import_questions(
    request: Request,
    file: UploadFile = File(None),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """导入题目（支持 multipart 文件上传或 application/json body）"""
    try:
        if file is not None:
            content = await file.read()
            payload = json.loads(content.decode("utf-8"))
        else:
            payload = await request.json()

        question_records = _extract_questions_payload(payload)
        imported_count, errors = _upsert_questions(db, question_records)
        db.commit()

        return {
            "success": True,
            "imported": imported_count,
            "total": len(question_records),
            "errors": errors,
            "user_id": current_user_id,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"导入失败: {str(e)}")


@router.post("/import/questions/json")
async def import_questions_json(
    data: Dict[str, Any],
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """兼容旧路径：JSON 题目导入"""
    try:
        question_records = _extract_questions_payload(data)
        imported_count, errors = _upsert_questions(db, question_records)
        db.commit()

        return {
            "success": True,
            "imported": imported_count,
            "total": len(question_records),
            "errors": errors,
            "user_id": current_user_id,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"导入失败: {str(e)}")


@router.post("/import/backup")
async def import_backup(
    request: Request,
    file: UploadFile = File(None),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """导入完整备份（支持 JSON 文件、ZIP 文件或 JSON body）"""
    try:
        if file is not None:
            content = await file.read()
            payload = _parse_backup_content(content)
        else:
            payload = await request.json()

        imported, errors = _import_backup_data(db, current_user_id, payload)
        db.commit()

        return {
            "success": True,
            "imported": imported,
            "errors": errors,
            "message": "数据导入成功",
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"导入失败: {str(e)}")


@router.post("/import/backup/json")
async def import_backup_json(
    data: Dict[str, Any],
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """兼容旧路径：JSON 备份导入"""
    try:
        imported, errors = _import_backup_data(db, current_user_id, data)
        db.commit()

        return {
            "success": True,
            "imported": imported,
            "errors": errors,
            "message": "数据导入成功",
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"导入失败: {str(e)}")


@router.get("/stats")
async def get_data_stats(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """获取数据统计信息"""
    try:
        questions_count = db.query(models.Question).count()
        mistakes_count = (
            db.query(models.Mistake)
            .filter(models.Mistake.user_id == current_user_id)
            .count()
        )
        notes_count = (
            db.query(models.FileItem)
            .filter(
                models.FileItem.user_id == current_user_id,
                models.FileItem.type == "file",
            )
            .count()
        )
        folders_count = (
            db.query(models.FileItem)
            .filter(
                models.FileItem.user_id == current_user_id,
                models.FileItem.type == "folder",
            )
            .count()
        )

        # 按学科统计
        subjects = {}
        questions = db.query(models.Question).all()
        for q in questions:
            subject = q.subject
            if subject not in subjects:
                subjects[subject] = 0
            subjects[subject] += 1

        return {
            "questions": questions_count,
            "mistakes": mistakes_count,
            "notes": notes_count,
            "folders": folders_count,
            "subjects": subjects,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"统计失败: {str(e)}")
