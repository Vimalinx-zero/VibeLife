import datetime
import re
from typing import Optional
from uuid import uuid4

from sqlalchemy.orm import Session

import models


def _generate_item_id(item_type: str) -> str:
    prefix = "folder" if item_type == "folder" else "note"
    return f"{prefix}_{uuid4().hex[:12]}"


def create_file(db: Session, file_data: dict):
    user_id = str(file_data.get("user_id", "")).strip()
    item_type = str(file_data.get("type", "file")).strip() or "file"
    name = str(file_data.get("name", "")).strip()

    if not user_id:
        raise ValueError("user_id is required")
    if item_type not in {"folder", "file"}:
        raise ValueError("type must be folder or file")
    if not name:
        raise ValueError("name is required")

    db_file = models.FileItem(
        id=str(file_data.get("id") or _generate_item_id(item_type)),
        user_id=user_id,
        type=item_type,
        name=name,
        parent_id=file_data.get("parent_id", "root"),
        content=file_data.get("content") or "",
        tags=file_data.get("tags") or [],
        date=file_data.get("date") or datetime.date.today().isoformat(),
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


def get_file_by_id(db: Session, file_id: str, user_id: Optional[str] = None):
    query = db.query(models.FileItem).filter(models.FileItem.id == file_id)
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)
    return query.first()


def update_file(
    db: Session,
    file_id: str,
    *,
    content: Optional[str] = None,
    name: Optional[str] = None,
    parent_id: Optional[str] = None,
    tags: Optional[list] = None,
    user_id: Optional[str] = None,
):
    query = db.query(models.FileItem).filter(models.FileItem.id == file_id)
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)

    item = query.first()
    if not item:
        return None

    if content is not None:
        item.content = content
    if name is not None:
        item.name = name
    if parent_id is not None:
        item.parent_id = parent_id
    if tags is not None:
        item.tags = tags

    db.commit()
    db.refresh(item)
    return item


def delete_file(db: Session, file_id: str, user_id: Optional[str] = None) -> bool:
    query = db.query(models.FileItem).filter(models.FileItem.id == file_id)
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)

    item = query.first()
    if not item:
        return False

    db.delete(item)
    db.commit()
    return True


def auto_generate_tags(
    db: Session,
    file_id: str,
    manual_tags: Optional[list] = None,
) -> list:
    file_item = db.query(models.FileItem).filter(models.FileItem.id == file_id).first()
    if not file_item:
        return manual_tags or []

    tags = set(manual_tags or [])

    if file_item.parent_id and file_item.parent_id != "root":
        parent = (
            db.query(models.FileItem)
            .filter(models.FileItem.id == file_item.parent_id)
            .first()
        )
        if parent:
            folder_clean = re.sub(r"[^\w\s\u4e00-\u9fff]", "", parent.name or "")
            for keyword in folder_clean.split()[:2]:
                if len(keyword) > 1:
                    tags.add(keyword)

    if file_item.content:
        titles = re.findall(r"^#\s+(.+)$", file_item.content, re.MULTILINE)
        for title in titles[:3]:
            title_clean = re.sub(r"[^\w\s\u4e00-\u9fff]", "", title).strip()
            if title_clean:
                tags.add(title_clean[:10])

        keyword_patterns = {
            "计划": r"计划|安排|里程碑|时间表",
            "项目": r"项目|推进|需求|交付",
            "待办": r"待办|todo|任务|执行",
            "笔记": r"笔记|总结|整理|记录",
            "复盘": r"复盘|回顾|反思",
            "重要": r"重要|关键|优先",
        }

        for tag_name, pattern in keyword_patterns.items():
            if re.search(pattern, file_item.content, re.IGNORECASE):
                tags.add(tag_name)

    if not tags:
        tags.add("未分类")

    manual_list = manual_tags or []
    auto_list = [tag for tag in tags if tag not in manual_list]
    return manual_list + sorted(auto_list)


def get_all_tags(db: Session, user_id: Optional[str] = None):
    query = db.query(models.FileItem).filter(models.FileItem.type == "file")
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)

    tag_stats = {}
    for file_item in query.all():
        for tag in file_item.tags or []:
            tag_stats[tag] = tag_stats.get(tag, 0) + 1

    return [
        {"name": name, "count": count}
        for name, count in sorted(tag_stats.items(), key=lambda item: item[1], reverse=True)
    ]


def get_files_by_tag(db: Session, tag: str, user_id: Optional[str] = None):
    query = db.query(models.FileItem).filter(models.FileItem.type == "file")
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)

    return [
        file_item
        for file_item in query.all()
        if file_item.tags and tag in file_item.tags
    ]


def add_tag_to_file(
    db: Session,
    file_id: str,
    tag: str,
    user_id: Optional[str] = None,
):
    query = db.query(models.FileItem).filter(models.FileItem.id == file_id)
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)

    item = query.first()
    if not item:
        return None

    normalized_tag = str(tag or "").strip()
    if not normalized_tag:
        return item

    current_tags = list(item.tags or [])
    if normalized_tag not in current_tags:
        current_tags.append(normalized_tag)
        item.tags = current_tags
        db.commit()
        db.refresh(item)

    return item


def remove_tag_from_file(
    db: Session,
    file_id: str,
    tag: str,
    user_id: Optional[str] = None,
):
    query = db.query(models.FileItem).filter(models.FileItem.id == file_id)
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)

    item = query.first()
    if not item:
        return None

    current_tags = [value for value in (item.tags or []) if value != tag]
    if current_tags != list(item.tags or []):
        item.tags = current_tags
        db.commit()
        db.refresh(item)

    return item


def get_backlinks(db: Session, note_id: str, user_id: Optional[str] = None):
    query = db.query(models.FileItem).filter(models.FileItem.type == "file")
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)

    pattern = re.compile(rf"\[\[note:{re.escape(note_id)}\]\]\]?")
    backlinks = []

    for file_item in query.all():
        if file_item.id == note_id:
            continue
        if file_item.content and pattern.search(file_item.content):
            backlinks.append(file_item)

    return backlinks


def get_all_links_in_note(db: Session, note_id: str, user_id: Optional[str] = None):
    query = db.query(models.FileItem).filter(models.FileItem.id == note_id)
    if user_id:
        query = query.filter(models.FileItem.user_id == user_id)

    note = query.first()
    if not note or not note.content:
        return []

    links = re.findall(r"\[\[note:(\w+)\]\]\s?", note.content)
    seen = set()
    result = []

    for linked_id in links:
        if linked_id in seen:
            continue

        linked_query = db.query(models.FileItem).filter(
            models.FileItem.id == linked_id,
            models.FileItem.type == "file",
        )
        if user_id:
            linked_query = linked_query.filter(models.FileItem.user_id == user_id)

        linked_note = linked_query.first()
        if linked_note:
            result.append(linked_note)
            seen.add(linked_id)

    return result


def extract_context(content: str, query: str, max_length: int = 150) -> str:
    query_lower = query.lower()
    content_lower = content.lower()
    index = content_lower.find(query_lower)

    if index == -1:
        return content[:max_length] + "..." if len(content) > max_length else content

    start = max(0, index - max_length // 2)
    end = min(len(content), index + len(query) + max_length // 2)
    context = content[start:end]

    if start > 0:
        context = "..." + context
    if end < len(content):
        context = context + "..."

    return context


def search_notes(db: Session, query: str, user_id: Optional[str] = None):
    normalized_query = str(query or "").strip().lower()
    if len(normalized_query) < 2:
        return []

    db_query = db.query(models.FileItem).filter(models.FileItem.type == "file")
    if user_id:
        db_query = db_query.filter(models.FileItem.user_id == user_id)

    results = []
    for file_item in db_query.all():
        score = 0

        if file_item.name and normalized_query in file_item.name.lower():
            if normalized_query == file_item.name.lower():
                score += 100
            elif file_item.name.lower().startswith(normalized_query):
                score += 50
            else:
                score += 20

        if file_item.content and normalized_query in file_item.content.lower():
            content_lower = file_item.content.lower()
            score += content_lower.count(normalized_query) * 5
            first_index = content_lower.find(normalized_query)
            if first_index < 100:
                score += 10
            elif first_index < 500:
                score += 5

        if score <= 0:
            continue

        results.append(
            {
                "file": file_item,
                "score": score,
                "context": (
                    extract_context(file_item.content, normalized_query)
                    if file_item.content
                    else None
                ),
            }
        )

    results.sort(key=lambda item: item["score"], reverse=True)
    return results
