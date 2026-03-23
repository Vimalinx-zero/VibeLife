# (注释) backend/main.py
# (注释) 核心入口：集成 SQLite 数据库、算法引擎和所有 API 接口

from fastapi import (
    FastAPI,
    Body,
    HTTPException,
    Depends,
    UploadFile,
    File,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
import datetime
import os
import json

# 引入本地模块
import models, crud
from cors_config import get_allowed_origins
from database import engine, get_db, run_legacy_cleanup_migrations
from auth import get_current_user_id  # ✅ 新增：用户认证依赖
from workbench_routes import router as workbench_router
from image_routes import router as image_router  # ✨ 新增：图片处理路由
from ai_routes import router as ai_router  # ✨ 新增：AI功能路由
from auth_routes import router as auth_router  # ✨ 新增：认证路由
from git_routes import router as git_router  # ✨ 新增：Git 管理路由
from project_routes import router as project_router
from quick_capture_routes import router as quick_capture_router
from knowledge_routes import router as knowledge_router
from music_routes import router as music_router
from gaokao_routes import router as gaokao_router  # 高考学习核心路由

# 1. 数据库初始化：迁移旧表后创建当前表结构
run_legacy_cleanup_migrations()
models.Base.metadata.create_all(bind=engine)

app = FastAPI()


# ✅ 请求日志中间件（保留用于调试）
@app.middleware("http")
async def log_requests(request, call_next):
    import time

    start_time = time.time()

    # 调用下一个中间件/路由处理器
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        return response
    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        import traceback

        traceback.print_exc()
        raise


# ✅ 安全修复：CORS 配置从环境变量读取，限制允许的来源
allowed_origins = get_allowed_origins(os.getenv("ALLOWED_ORIGINS"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # 从环境变量读取，生产环境必须限制
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # 限制允许的 HTTP 方法
    allow_headers=["Authorization", "Content-Type"],  # 限制允许的请求头
    expose_headers=["*"],
)

# ✨ 挂载静态文件服务（用于图片上传）
os.makedirs("uploads/images", exist_ok=True)
os.makedirs("uploads/enhanced", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 注册工作台路由
app.include_router(workbench_router)
# ✨ 新增：注册图片处理路由
app.include_router(image_router)
# ✨ 新增：注册 AI 功能路由
app.include_router(ai_router)
# ✨ 新增：注册认证路由
app.include_router(auth_router)
# ✨ 新增：注册 Git 管理路由
app.include_router(git_router)
app.include_router(project_router)
app.include_router(quick_capture_router)
app.include_router(knowledge_router)
app.include_router(music_router)


# =======================
# 笔记系统接口 (Files)
# =======================


@app.get("/api/notes/view")
async def get_notes_view(
    id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """获取指定文件夹/文件的详情"""
    node = crud.get_file_by_id(db, id, current_user_id)
    if not node:  # 根目录容错
        if id == "root":
            return {
                "info": {"id": "root", "type": "folder", "name": "Library"},
                "items": db.query(models.FileItem)
                .filter(
                    models.FileItem.parent_id == "root",
                    models.FileItem.user_id == current_user_id,  # ✅ 用户隔离
                )
                .all(),
                "breadcrumbs": [],
            }
        raise HTTPException(status_code=404, detail="Node not found")

    items = []
    if node.type == "folder":
        items = (
            db.query(models.FileItem)
            .filter(
                models.FileItem.parent_id == id,
                models.FileItem.user_id == current_user_id,  # ✅ 用户隔离
            )
            .all()
        )

    # ✅ 修复：构建面包屑导航 (手动处理 root 父级)
    breadcrumbs = [{"id": node.id, "name": node.name}]

    current = node
    # 简单的向上查找（只查一级，或者如果父级是 root 直接补全）
    if current.parent_id:
        if current.parent_id == "root":
            # 如果父级是 root，直接插入 Library，不查库
            breadcrumbs.insert(0, {"id": "root", "name": "Library"})
        else:
            # 查库获取父级
            parent = crud.get_file_by_id(db, current.parent_id)
            if parent:
                breadcrumbs.insert(0, {"id": parent.id, "name": parent.name})
                # 如果爷爷是 root，再补一级
                if parent.parent_id == "root":
                    breadcrumbs.insert(0, {"id": "root", "name": "Library"})

    return {"info": node, "items": items, "breadcrumbs": breadcrumbs}


@app.post("/api/notes/create")
async def create_note(
    data: dict = Body(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """创建新文件或文件夹"""
    # ✅ 添加user_id到数据中
    data["user_id"] = current_user_id
    new_file = crud.create_file(db, data)

    # ✅ 将 SQLAlchemy 对象转换为字典
    return {
        "success": True,
        "item": {
            "id": new_file.id,
            "type": new_file.type,
            "name": new_file.name,
            "parent_id": new_file.parent_id,
            "content": new_file.content,
            "tags": new_file.tags or [],
            "date": new_file.date,
            "user_id": new_file.user_id,
        },
    }


@app.post("/api/notes/save")
async def save_note(
    data: dict = Body(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """保存笔记内容"""
    file_id = data["id"]
    manual_tags = data.get("tags")  # 用户手动添加的标签
    auto_tag = data.get("auto_tag", True)  # 默认启用自动标签

    # ✨ 如果启用自动标签，合并手动标签和自动生成的标签
    if auto_tag:
        final_tags = crud.auto_generate_tags(db, file_id, manual_tags)
    else:
        final_tags = manual_tags

    # ✅ 传递 parent_id 参数，支持重命名、移动和保存内容
    # ✨ 新增：支持标签更新（自动生成 + 手动标签）
    crud.update_file(
        db,
        file_id,
        content=data.get("content"),
        name=data.get("name"),
        parent_id=data.get("parent_id"),
        tags=final_tags,
        user_id=current_user_id,
    )

    # 返回更新后的标签列表（让前端知道生成了哪些标签）
    return {"success": True, "tags": final_tags}


@app.post("/api/notes/delete")
async def delete_note(
    data: dict = Body(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """删除文件"""
    return {"success": crud.delete_file(db, data["id"], current_user_id)}


# =======================
# 🏷️ 标签系统接口 (Tags)
# =======================


@app.get("/api/notes/tags")
async def get_all_tags(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """获取所有标签及其使用次数"""
    return crud.get_all_tags(db, current_user_id)


@app.get("/api/notes/by-tag")
async def get_files_by_tag(
    tag: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """根据标签获取所有文件"""
    files = crud.get_files_by_tag(db, tag, current_user_id)
    return {"files": files, "tag": tag, "count": len(files)}


@app.post("/api/notes/tags/add")
async def add_tag_to_file(
    data: dict = Body(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """为文件添加单个标签"""
    result = crud.add_tag_to_file(db, data["file_id"], data["tag"], current_user_id)
    if result:
        return {"success": True, "file": result}
    raise HTTPException(status_code=404, detail="File not found")


@app.post("/api/notes/tags/remove")
async def remove_tag_from_file(
    data: dict = Body(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """从文件移除单个标签"""
    result = crud.remove_tag_from_file(
        db, data["file_id"], data["tag"], current_user_id
    )
    if result:
        return {"success": True, "file": result}
    raise HTTPException(status_code=404, detail="File not found")


# =======================
# 🔗 双向链接接口 (Backlinks)
# =======================


@app.get("/api/notes/backlinks")
async def get_backlinks(
    note_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """获取引用了指定笔记的所有笔记（反向链接）"""
    # ✅ 验证笔记属于当前用户
    note = crud.get_file_by_id(db, note_id, current_user_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    backlinks = crud.get_backlinks(db, note_id, current_user_id)
    # ✅ 修复：将 SQLAlchemy 对象转换为字典
    backlinks_dict = [
        {
            "id": note.id,
            "name": note.name,
            "type": note.type,
            "parent_id": note.parent_id,
            "content": note.content,
            "date": note.date,
            "tags": note.tags or [],
        }
        for note in backlinks
    ]
    return {"backlinks": backlinks_dict, "count": len(backlinks_dict)}


@app.get("/api/notes/links")
async def get_links_in_note(
    note_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """获取笔记中所有链接到的其他笔记（正向链接）"""
    # ✅ 验证笔记属于当前用户
    note = crud.get_file_by_id(db, note_id, current_user_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    links = crud.get_all_links_in_note(db, note_id, current_user_id)
    # ✅ 修复：将 SQLAlchemy 对象转换为字典
    links_dict = [
        {
            "id": note.id,
            "name": note.name,
            "type": note.type,
            "parent_id": note.parent_id,
            "content": note.content,
            "date": note.date,
            "tags": note.tags or [],
        }
        for note in links
    ]
    return {"links": links_dict, "count": len(links_dict)}


# =======================
# 🔍 全文搜索接口 (Search)
# =======================


@app.get("/api/notes/search")
async def search_notes(
    query: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """全文搜索笔记（标题和内容）"""
    results = crud.search_notes(db, query, current_user_id)

    # 格式化结果
    formatted_results = []
    for result in results:
        file = result["file"]
        formatted_results.append(
            {
                "id": file.id,
                "name": file.name,
                "content": file.content,
                "tags": file.tags or [],
                "date": file.date,
                "parent_id": file.parent_id,
                "score": result["score"],
                "context": result["context"],
            }
        )

    return {
        "results": formatted_results,
        "count": len(formatted_results),
        "query": query,
    }


# =======================
# 📷 图片上传接口 (Images)
# =======================


@app.post("/api/notes/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """上传笔记图片"""
    import uuid
    import os
    from pathlib import Path

    # 验证 MIME 类型
    ALLOWED_MIME_TYPES = {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
    }

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}",
        )

    # 创建上传目录
    upload_dir = Path("uploads/images")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # 生成唯一文件名
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = upload_dir / unique_filename

    # 保存文件
    try:
        contents = await file.read()

        # 验证文件大小（限制为 5MB）
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")

        with open(file_path, "wb") as f:
            f.write(contents)

        # 返回访问 URL
        public_api_origin = os.getenv("PUBLIC_API_ORIGIN", "http://localhost:8000").rstrip("/")
        file_url = f"{public_api_origin}/uploads/images/{unique_filename}"
        return {"url": file_url, "filename": unique_filename}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Upload failed")


# =======================
# �📊 Dashboard 接口
# =======================


@app.get("/api/dashboard")
async def get_dashboard_stats(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """获取首页工作台摘要（带用户隔离）"""
    notes_count = (
        db.query(models.FileItem)
        .filter(
            models.FileItem.user_id == current_user_id, models.FileItem.type == "file"
        )
        .count()
    )
    project_count = (
        db.query(models.Project).filter(models.Project.user_id == current_user_id).count()
    )

    import datetime as dt

    today_start = dt.datetime.utcnow().replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    completed_todos = (
        db.query(models.TodoItem)
        .filter(
            models.TodoItem.user_id == current_user_id,
            models.TodoItem.completed == True,
            models.TodoItem.completed_at >= today_start.isoformat(),
        )
        .count()
    )
    pending_todos = (
        db.query(models.TodoItem)
        .filter(
            models.TodoItem.user_id == current_user_id,
            models.TodoItem.completed == False,
        )
        .count()
    )
    today_sessions = (
        db.query(models.FocusSession)
        .filter(
            models.FocusSession.user_id == current_user_id,
            models.FocusSession.created_at >= today_start.isoformat(),
        )
        .all()
    )
    today_focus_minutes = sum(session.duration_minutes for session in today_sessions)

    daily_progress = min(completed_todos * 10, 100)

    return {
        "username": current_user_id,
        "daily_progress": daily_progress,
        "notes_count": notes_count,
        "project_count": project_count,
        "pending_todos": pending_todos,
        "today_focus_minutes": today_focus_minutes,
    }


@app.get("/api/dashboard/stats")
async def get_dashboard_focus_stats(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """获取今日工作摘要数据（带用户隔离）"""
    import datetime as dt

    today_start = dt.datetime.utcnow().replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    today_sessions = (
        db.query(models.FocusSession)
        .filter(
            models.FocusSession.user_id == current_user_id,
            models.FocusSession.created_at >= today_start.isoformat(),
        )
        .all()
    )
    focus_minutes = sum(session.duration_minutes for session in today_sessions)

    notes_created = (
        db.query(models.FileItem)
        .filter(
            models.FileItem.user_id == current_user_id,
            models.FileItem.type == "file",
            models.FileItem.date >= today_start.strftime("%Y-%m-%d"),
        )
        .count()
    )

    journal_entries = (
        db.query(models.JournalEntry)
        .filter(
            models.JournalEntry.user_id == current_user_id,
            models.JournalEntry.entry_date == today_start.date().isoformat(),
        )
        .count()
    )
    completed_todos = (
        db.query(models.TodoItem)
        .filter(
            models.TodoItem.user_id == current_user_id,
            models.TodoItem.completed == True,
            models.TodoItem.completed_at >= today_start.isoformat(),
        )
        .count()
    )

    return {
        "focus_minutes": focus_minutes,
        "notes_created": notes_created,
        "journal_entries": journal_entries,
        "completed_todos": completed_todos,
    }


@app.get("/api/dashboard/heatmap")
async def get_dashboard_heatmap(
    days: int = 30,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """获取专注热力图数据（带用户隔离）"""
    import datetime as dt

    heatmap = []
    today = dt.date.today()

    for i in range(days):
        date = today - dt.timedelta(days=days - i - 1)

        # 查询当天的所有会话
        sessions = (
            db.query(models.FocusSession)
            .filter(
                models.FocusSession.user_id == current_user_id,  # ✅ 用户隔离
                models.FocusSession.created_at >= date.isoformat(),
                models.FocusSession.created_at
                < (date + dt.timedelta(days=1)).isoformat(),
            )
            .all()
        )

        # 计算总时长和强度
        total_duration = sum(s.duration_minutes for s in sessions)
        # 强度：0-3小时映射到 0-1
        intensity = min(total_duration / 180, 1.0) if total_duration > 0 else 0

        heatmap.append(
            {
                "date": date.isoformat(),
                "intensity": intensity,
                "duration": total_duration,
            }
        )

    return {"heatmap": heatmap}


@app.get("/api/dashboard/progress")
async def get_dashboard_progress(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """获取上次活动进度（上次停留位置）"""
    last_session = (
        db.query(models.ActivityCheckpoint)
        .filter(models.ActivityCheckpoint.user_id == current_user_id)
        .order_by(models.ActivityCheckpoint.id.desc())
        .first()
    )

    if not last_session:
        return {"last_activity": None}

    return {
        "last_activity": {
            "type": last_session.type or "workbench",
            "id": last_session.focus_item_id,
            "timestamp": (
                last_session.end_time.isoformat()
                if last_session.end_time
                else last_session.created_at
            ),
            "description": "继续上次进度",
        }
    }


@app.post("/api/dashboard/progress")
async def update_dashboard_progress(
    type: str,
    id: str,
    description: str = "",
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """更新活动进度（记录用户最后停留的位置）"""
    now = datetime.datetime.utcnow()
    session = models.ActivityCheckpoint(
        user_id=current_user_id,
        type=type,
        focus_item_id=id,
        start_time=now,
        end_time=now,
        duration=0,
        pomodoro_count=0,
    )
    db.add(session)
    db.commit()
    return {"success": True, "message": "Progress updated"}


# =======================
# 📝 智能引用预览接口 (Smart Links)
# =======================


@app.get("/api/notes/preview")
async def get_note_preview(
    type: str,
    id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    统一预览接口：根据类型和 ID 返回笔记摘要
    """
    if type != "note":
        return {"found": False, "error": "Unsupported type"}

    note = crud.get_file_by_id(db, id, current_user_id)
    if not note:
        return {
            "found": False,
            "title": "Note Not Found",
            "body": "此笔记可能已被删除",
        }

    summary = note.content[:150] + "..." if note.content else "No content..."
    return {
        "found": True,
        "type": "note",
        "id": note.id,
        "title": note.name,
        "body": summary,
        "tags": ["Note", note.type],
    }

