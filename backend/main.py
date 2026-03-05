import anki_algorithm
# (注释) backend/main.py
# (注释) 核心入口：集成 SQLite 数据库、算法引擎和所有 API 接口

from fastapi import (
    FastAPI,
    Body,
    HTTPException,
    Depends,
    UploadFile,
    File,
    Response,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import (
    flag_modified,
)  # 用于通知 SQLAlchemy JSON 字段已修改
from typing import List
from pydantic import BaseModel
import datetime
import os
import json

# 引入本地模块
import models, crud, schemas
import algorithm  # 确保导入了 algorithm
from database import SessionLocal, engine, get_db
from algorithm import Recommender, WeightCalculator
from auth import get_current_user_id  # ✅ 新增：用户认证依赖
from export_routes import router as export_router
from workbench_routes import router as workbench_router
from anki_routes import router as anki_router
from cards_routes import router as cards_router
from mistakes_routes import router as mistakes_router
from favorites_routes import router as favorites_router
from collection_routes import router as collection_router
from study_routes import router as study_router  # ✨ 新增：学习记录路由
from ai_import_routes import router as ai_import_router  # ✨ 新增：AI 导入路由
from related_routes import router as related_router  # ✨ 新增：关联查询路由
from image_routes import router as image_router  # ✨ 新增：图片处理路由
from json_import_routes import router as json_import_router  # ✨ 新增：JSON 导入路由
from ai_routes import router as ai_router  # ✨ 新增：AI功能路由
from auth_routes import router as auth_router  # ✨ 新增：认证路由
from git_routes import router as git_router  # ✨ 新增：Git 管理路由
from project_routes import router as project_router
from quick_capture_routes import router as quick_capture_router

# 1. 数据库初始化：创建所有表结构
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
allowed_origins_str = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

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
os.makedirs("uploads/questions", exist_ok=True)
os.makedirs("uploads/enhanced", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 注册导出路由
app.include_router(export_router)
# 注册工作台路由
app.include_router(workbench_router)
# 注册 Anki 路由
app.include_router(anki_router)
# 注册 Cards 兼容路由
app.include_router(cards_router)
# 注册错题路由
app.include_router(mistakes_router)
# 注册收藏路由
app.include_router(favorites_router)
# 注册合集路由
app.include_router(collection_router)
# ✨ 新增：注册学习记录路由
app.include_router(study_router)
# ✨ 新增：注册 AI 导入路由
app.include_router(ai_import_router)
# ✨ 新增：注册关联查询路由
app.include_router(related_router)
# ✨ 新增：注册图片处理路由
app.include_router(image_router)
# ✨ 新增：注册 JSON 导入路由
app.include_router(json_import_router)
# ✨ 新增：注册 AI 功能路由
app.include_router(ai_router)
# ✨ 新增：注册认证路由
app.include_router(auth_router)
# ✨ 新增：注册 Git 管理路由
app.include_router(git_router)
app.include_router(project_router)
app.include_router(quick_capture_router)


# 2. 启动事件：注入 Mock 种子数据 (防止数据库为空)
@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    # crud.init_db(db) # ✅ 暂时禁用：使用新的题型系统，不再灌入旧数据
    db.close()


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
        file_url = f"http://localhost:8000/uploads/images/{unique_filename}"
        return {"url": file_url, "filename": unique_filename}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Upload failed")


# =======================
# 🐞 错题本接口 (Mistakes)
# =======================


@app.get("/api/questions")
async def get_all_questions_api(
    page: int = 1, limit: int = 50, db: Session = Depends(get_db)
):
    """
    获取所有题目列表（用于题库管理）

    返回所有题目，按学科和类型组织

    参数:
    - page: 页码，从1开始
    - limit: 每页数量，默认50
    """
    questions = db.query(models.Question).offset((page - 1) * limit).limit(limit).all()

    # 转换为与错题相同的格式（使用 Mistake 数据结构）
    result = []
    for q in questions:
        # 为每个题目创建一个虚拟的 Mistake 对象
        # 但标记 mastery 为 100 表示"已掌握/非错题"
        result.append(
            {
                "id": q.id,
                "question_id": q.id,
                "subject": q.subject,
                "type": q.type,
                "stem_snapshot": q.stem,
                "wrong_step_index": None,
                "wrong_step_stem": q.stem,
                "user_choice": None,
                "correct_choice": q.answer
                if q.type in ["fill_blank", "proof", "essay"]
                else (
                    next(
                        (o["key"] for o in (q.options or []) if o.get("is_correct")),
                        None,
                    )
                ),
                "options_snapshot": q.options,
                "diagnosis_tags": [],
                "mastery": 100.0,  # 标记为已掌握，区分错题
                "last_error_time": None,
                "linked_note_id": None,
                "history": [],
                "is_all_questions": True,  # 标记这是来自全部题目视图
            }
        )

    return result


@app.put("/api/questions/{question_id}")
async def update_question_api(
    question_id: str, data: dict = Body(...), db: Session = Depends(get_db)
):
    """
    更新题目信息（支持题型转换）

    支持的字段：
    - type: 题型（single_choice, multiple_choice, fill_blank, proof, essay）
    - stem: 题干
    - options: 选项列表（选择题）
    - blanks: 填空列表（填空题）
    - answer: 答案（证明题/问答题）
    - solution: 解析
    - difficulty: 难度
    - subject: 学科
    """
    # ✅ 调试：打印接收到的数据
    print(f"📥 收到更新请求，题目ID: {question_id}")
    print(f"📥 接收的数据: {data}")
    print(f"📥 学科字段: {data.get('subject')}")
    print(f"📥 题型字段: {data.get('type')}")

    # 查找题目
    q = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    print(f"📥 原题目的学科: {q.subject}")
    print(f"📥 原题目的题型: {q.type}")

    # 更新题型
    if "type" in data:
        q.type = data["type"]
        print(f"✅ 更新题型为: {q.type}")

    # 更新题干
    if "stem" in data:
        q.stem = data["stem"]

    # 更新学科和难度
    if "subject" in data:
        q.subject = data["subject"]
        print(f"✅ 更新学科为: {q.subject}")
    if "difficulty" in data:
        q.difficulty = data["difficulty"]

    # 根据题型处理不同的答案格式
    question_type = data.get("type", q.type)

    if question_type in ["single_choice", "multiple_choice"]:
        # 选择题：从 options 中提取正确答案
        if "options" in data:
            q.options = data["options"]
            # 找到正确答案
            correct_options = [opt for opt in data["options"] if opt.get("is_correct")]
            if question_type == "single_choice":
                # 单选题：取第一个正确选项的 key
                q.answer = correct_options[0]["key"] if correct_options else ""
            else:
                # 多选题：拼接所有正确选项的 key
                q.answer = ",".join([opt["key"] for opt in correct_options])

    elif question_type == "fill_blank":
        # 填空题：从 blanks 数组中提取答案
        if "blanks" in data:
            blanks = data["blanks"]
            # 将多个空的答案用逗号连接
            q.answer = ",".join(
                [blank["answer"] for blank in blanks if blank.get("answer")]
            )
        elif "answer" in data:
            # 兼容旧格式（单个答案）
            q.answer = data["answer"]

    else:  # proof 或 essay
        # 证明题/问答题：直接使用 answer 字段
        if "answer" in data:
            q.answer = data["answer"]

    # 更新解析
    if "solution" in data:
        q.solution = data["solution"]

    db.commit()
    db.refresh(q)

    return {
        "success": True,
        "message": "Question updated successfully",
        "question": schemas.QuestionResponse(
            id=q.id,
            subject=q.subject,
            type=q.type,
            difficulty=q.difficulty,
            stem=q.stem,
            options=q.options,
            answer=q.answer,
            solution=q.solution,
            media=q.media,
            macro_tags=q.macro_tags,
        ),
    }


# =======================
# 🧠 智能刷题接口 (Quiz)
# =======================


@app.get("/api/quiz/recommend", response_model=List[schemas.QuestionResponse])
async def get_quiz_recommendation(
    subjects: str = None,  # 逗号分隔的学科列表，如 "physics,math"
    question_count: int = 10,  # 需要返回的题目数量
    difficulty: str = "all",  # 难度筛选: all, easy, medium, hard
    question_type: str = "all",  # 题型筛选: all, single_choice, multiple_choice, fill_blank, etc.
    smart_recommend: bool = True,  # 是否使用智能推荐
    current_user_id: str = Depends(get_current_user_id),  # 从JWT token中获取用户ID
    db: Session = Depends(get_db),
):
    """
    获取推荐题目

    策略：
    1. 优先从错题本中选取未掌握的题目（mastery < 80）
    2. 如果错题不足，自动从题库补充同筛选条件的新题
    3. 按错误次数和熟练度排序

    参数:
    - subjects: 学科筛选（逗号分隔），如 "physics,math"
    - question_count: 需要返回的题目数量（默认10，-1表示返回所有错题）
    - difficulty: 难度筛选（all/easy/medium/hard）
    - question_type: 题型筛选
    - smart_recommend: 是否使用智能推荐算法
    - current_user_id: 从JWT token中获取的用户ID
    """
    from sqlalchemy.orm import joinedload
    import random

    # ========== 1. 从错题本中查询 ==========
    mistake_query = (
        db.query(models.Mistake)
        .options(joinedload(models.Mistake.question))
        .filter(models.Mistake.user_id == current_user_id)
    )

    # 获取所有错题记录
    mistakes_db = mistake_query.all()

    # 提取关联的题目，过滤掉已掌握的题目（mastery >= 80）
    questions_db = []
    mistake_dict = {}
    for m in mistakes_db:
        if m.question and m.mastery < 80:
            questions_db.append(m.question)
            mistake_dict[m.question.id] = m

    # ========== 2. 过滤条件 ==========
    # 学科过滤
    if subjects and subjects != "all":
        subject_list = subjects.split(",")
        questions_db = [q for q in questions_db if q.subject in subject_list]

    # 难度过滤
    if difficulty and difficulty != "all":
        difficulty_map = {"easy": 1, "medium": 2, "hard": 3}
        if difficulty in difficulty_map:
            questions_db = [
                q for q in questions_db if q.difficulty == difficulty_map[difficulty]
            ]

    # 题型过滤
    if question_type and question_type != "all":
        questions_db = [q for q in questions_db if q.type == question_type]

    # ========== 3. 排序（错题优先） ==========
    questions_db.sort(
        key=lambda q: (
            -mistake_dict.get(q.id, models.Mistake()).error_count,  # 错误次数多的优先
            mistake_dict.get(q.id, models.Mistake()).mastery,  # 掌握度低的优先
        )
    )

    # ========== 4. 错题不足时从题库补充 ==========
    if question_count == -1:
        target_count = len(questions_db)
    else:
        target_count = question_count

    if target_count > len(questions_db):
        existing_ids = {q.id for q in questions_db}

        supplement_query = db.query(models.Question)

        if subjects and subjects != "all":
            supplement_query = supplement_query.filter(
                models.Question.subject.in_(subjects.split(","))
            )

        if difficulty and difficulty != "all":
            difficulty_map = {"easy": 1, "medium": 2, "hard": 3}
            if difficulty in difficulty_map:
                supplement_query = supplement_query.filter(
                    models.Question.difficulty == difficulty_map[difficulty]
                )

        if question_type and question_type != "all":
            supplement_query = supplement_query.filter(
                models.Question.type == question_type
            )

        if existing_ids:
            supplement_query = supplement_query.filter(
                ~models.Question.id.in_(list(existing_ids))
            )

        supplements = supplement_query.all()
        if not smart_recommend:
            random.shuffle(supplements)

        needed = max(0, target_count - len(questions_db))
        questions_db.extend(supplements[:needed])

    if question_count != -1:
        questions_db = questions_db[:question_count]

    # ========== 5. 转换为响应格式 ==========
    result = []
    for q in questions_db:
        normalized_options = []
        if isinstance(q.options, list):
            for option in q.options:
                if not isinstance(option, dict):
                    continue
                normalized_options.append(
                    {
                        "key": str(option.get("key", "")),
                        "content": option.get("content") or option.get("text", ""),
                        "is_correct": bool(option.get("is_correct", False)),
                    }
                )

        media_payload = q.media if isinstance(q.media, dict) else {}

        result.append(
            schemas.QuestionResponse(
                id=q.id,
                subject=q.subject,
                type=q.type,
                difficulty=q.difficulty,
                stem=q.stem,
                options=normalized_options or None,
                answer=q.answer,
                solution=q.solution,
                media=media_payload,
                macro_tags=q.macro_tags,
            )
        )

    return result


@app.post("/api/quiz/submit")
async def submit_quiz_answer(
    data: schemas.AnswerSubmit,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    提交答案处理（新题型系统）：
    1. 根据题型判断对错
    2. 实时更新用户权重 (Knowledge Tracing)
    3. 如果做错，自动存入错题本

    支持题型：
    - single_choice: 单选题（检查 options 中的 is_correct）
    - multiple_choice: 多选题（检查所有选中的选项）
    - fill_blank: 填空题（字符串匹配，支持模糊匹配）
    - composite: 复合题（检查 steps 中指定小题的答案）
    - proof: 证明题（需要人工评分，暂时标记为待评分）
    - essay: 问答题（需要人工评分，暂时标记为待评分）
    """
    # 1. 查找题目
    q = db.query(models.Question).filter(models.Question.id == data.question_id).first()
    if not q:
        return {"error": "Question not found"}

    # ✨ 1.5 处理复合题
    if q.is_composite:
        if data.step_index is None:
            return {"error": "Composite question requires step_index"}
        if not q.steps or data.step_index >= len(q.steps):
            return {"error": f"Invalid step_index: {data.step_index}"}

        step = q.steps[data.step_index]
        step_type = step.get("interaction_type", "single_choice")

        # 验证小题答案
        is_correct = False
        correct_answer = None

        if step_type in ["single_choice", "multiple_choice"]:
            step_options = step.get("options", [])
            if step_type == "single_choice":
                correct_option = next(
                    (o for o in step_options if o.get("is_correct")), None
                )
                if correct_option:
                    correct_answer = correct_option["key"]
                    is_correct = data.selected_key == correct_answer
            elif step_type == "multiple_choice":
                selected_keys = (
                    data.selected_key.split(",") if data.selected_key else []
                )
                correct_options = [o for o in step_options if o.get("is_correct")]
                correct_keys = [o["key"] for o in correct_options]
                is_correct = set(selected_keys) == set(correct_keys)
                correct_answer = ",".join(sorted(correct_keys))

        elif step_type == "fill_blank":
            correct_answer = step.get("answer", "")
            user_answer = data.selected_key or ""
            clean_correct = (
                correct_answer.lower()
                .replace(" ", "")
                .replace("，", ",")
                .replace("。", ".")
            )
            clean_user = (
                user_answer.lower()
                .replace(" ", "")
                .replace("，", ",")
                .replace("。", ".")
            )
            is_correct = clean_correct == clean_user

        # ✨ 复合题错题记录（记录所有小题的答题历史）
        mistake = (
            db.query(models.Mistake)
            .filter_by(user_id=current_user_id, question_id=q.id)
            .first()
        )

        if not mistake:
            mistake = models.Mistake(
                user_id=current_user_id,
                question_id=q.id,
                step_answers=[],
                user_answer=data.selected_key,  # 兼容旧字段
                last_error_time=datetime.date.today().strftime("%Y-%m-%d")
                if not is_correct
                else None,
                history=[],
                mastery=100.0,  # ✅ 初始 mastery 应该是 100（完全不会）
            )
            db.add(mistake)

        # 记录当前小题的答题结果
        mistake.step_answers.append(
            {
                "step_index": data.step_index,
                "is_correct": is_correct,
                "user_answer": data.selected_key,
                "timestamp": datetime.datetime.utcnow().isoformat(),
            }
        )

        # 更新熟练度（基于所有小题的正确率）
        if mistake.step_answers:
            correct_count = sum(1 for a in mistake.step_answers if a["is_correct"])
            total_count = len(mistake.step_answers)
            mistake.mastery = (correct_count / total_count) * 100

        db.commit()

        return {
            "status": "success",
            "is_correct": is_correct,
            "correct_answer": correct_answer,
            "question_type": "composite",
            "step_index": data.step_index,
            "is_composite": True,
            "total_steps": len(q.steps),
        }

    # ========== 原有逻辑：单一题目处理 ==========

    # 2. 根据题型判断答案
    is_correct = False
    correct_answer = None

    if q.type in ["single_choice", "multiple_choice"]:
        # 选择题：从 options 中查找正确答案
        if not q.options:
            return {"error": "Question has no options"}

        if q.type == "single_choice":
            # 单选题：查找 is_correct=True 的选项
            correct_option = next((o for o in q.options if o.get("is_correct")), None)
            if correct_option:
                correct_answer = correct_option["key"]
                is_correct = data.selected_key == correct_answer

        elif q.type == "multiple_choice":
            # 多选题：selected_key 是逗号分隔的字符串（如 "A,C"）
            selected_keys = data.selected_key.split(",") if data.selected_key else []
            correct_options = [o for o in q.options if o.get("is_correct")]
            correct_keys = [o["key"] for o in correct_options]

            # 所有的正确答案都被选中，且没有选中错误的选项
            is_correct = set(selected_keys) == set(correct_keys)
            correct_answer = ",".join(sorted(correct_keys))

    elif q.type in ["fill_blank", "proof", "essay"]:
        # 填空题/证明题/问答题：字符串匹配
        correct_answer = q.answer or ""
        user_answer = data.selected_key or ""

        if q.type == "fill_blank":
            # 填空题：去除空格和标点后比较
            clean_correct = (
                correct_answer.lower()
                .replace(" ", "")
                .replace("，", ",")
                .replace("。", ".")
            )
            clean_user = (
                user_answer.lower()
                .replace(" ", "")
                .replace("，", ",")
                .replace("。", ".")
            )
            is_correct = clean_correct == clean_user
        else:
            # 证明题/问答题：暂时标记为待评分（需要人工评分）
            is_correct = None  # None 表示待评分

    # 3. 错题入库逻辑
    if is_correct is False:  # 只有明确错误时才入库
        existing_mistake = (
            db.query(models.Mistake)
            .filter_by(user_id=current_user_id, question_id=q.id)
            .first()
        )

        if existing_mistake:
            # 更新现有错题记录
            existing_mistake.error_count += 1
            existing_mistake.user_answer = data.selected_key
            existing_mistake.last_error_time = datetime.date.today().strftime(
                "%Y-%m-%d"
            )

            # 更新 history JSON
            hist = list(existing_mistake.history) if existing_mistake.history else []
            hist.append(
                {
                    "answer": data.selected_key,
                    "date": datetime.datetime.utcnow().isoformat(),
                }
            )
            existing_mistake.history = hist

            flag_modified(existing_mistake, "history")
        else:
            # 创建新错题记录
            new_mistake = models.Mistake(
                user_id=current_user_id,
                question_id=q.id,
                user_answer=data.selected_key,
                last_error_time=datetime.date.today().strftime("%Y-%m-%d"),
                history=[{"answer": data.selected_key, "is_correct": False}],
                mastery=100.0,  # ✅ 初始 mastery 应该是 100（完全不会）
            )
            db.add(new_mistake)

    # 4. 更新用户权重（简化版，只更新学科权重）
    user = db.query(models.UserProfile).filter_by(user_id=current_user_id).first()
    if user:
        current_weights = dict(user.tag_weights)
        tag = q.subject or "general"
        curr = current_weights.get(tag, 50.0)

        # 做对降低权重，做错增加权重
        new_w = max(0, min(100, curr + (10 if is_correct is False else -5)))
        current_weights[tag] = new_w
        user.tag_weights = current_weights
        flag_modified(user, "tag_weights")

    db.commit()

    return {
        "status": "success",
        "is_correct": is_correct,
        "correct_answer": correct_answer,
        "question_type": q.type,
        "is_composite": False,
    }


# =======================
# �📊 Dashboard 接口
# =======================


@app.get("/api/dashboard")
async def get_dashboard_stats(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """获取首页统计数据（带用户隔离）"""
    # 查询当前用户的错题总数
    mistakes_count = (
        db.query(models.Mistake)
        .filter(models.Mistake.user_id == current_user_id)
        .count()
    )

    # 查询当前用户的笔记总数
    notes_count = (
        db.query(models.FileItem)
        .filter(
            models.FileItem.user_id == current_user_id, models.FileItem.type == "file"
        )
        .count()
    )

    # 计算今日学习进度（基于今日完成的任务数）
    import datetime as dt

    today_start = dt.datetime.utcnow().replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # 今日完成的 todo 数量
    completed_todos = (
        db.query(models.TodoItem)
        .filter(
            models.TodoItem.user_id == current_user_id,
            models.TodoItem.completed == True,
            models.TodoItem.completed_at >= today_start.isoformat(),
        )
        .count()
    )

    # 简单的进度计算：每个完成的 todo = 10 分，上限 100
    daily_progress = min(completed_todos * 10, 100)

    return {
        "username": current_user_id,  # 返回用户ID而不是硬编码的 "Alex"
        "daily_progress": daily_progress,
        "mistakes_count": mistakes_count,
        "notes_count": notes_count,
    }


@app.get("/api/leaderboard")
async def get_leaderboard():
    """排行榜数据 (Mock)"""
    return [
        {"rank": 1, "name": "Sarah", "duration": "4h 20m", "avatar": "Sarah"},
        {"rank": 2, "name": "Mike", "duration": "3h 50m", "avatar": "Mike"},
        {"rank": 3, "name": "Alex", "duration": "2h 10m", "avatar": "Felix"},
    ]


@app.get("/api/dashboard/stats")
async def get_dashboard_study_stats(
    current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """获取今日学习统计数据（带用户隔离）"""
    import datetime as dt

    # 获取今天的开始时间
    today_start = dt.datetime.utcnow().replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # 1. 今日学习时长（从 StudySession 表查询）
    today_sessions = (
        db.query(models.StudySession)
        .filter(
            models.StudySession.user_id == current_user_id,
            models.StudySession.created_at >= today_start.isoformat(),
        )
        .all()
    )
    duration_minutes = sum(s.duration_minutes for s in today_sessions)

    # 2. 今日新增笔记数（从 FileItem 表查询）
    notes_created = (
        db.query(models.FileItem)
        .filter(
            models.FileItem.user_id == current_user_id,
            models.FileItem.type == "file",
            models.FileItem.date >= today_start.strftime("%Y-%m-%d"),
        )
        .count()
    )

    # 3. 今日复习错题数（从 Mistake 表的 last_error_time 字段查询）
    mistakes_reviewed = (
        db.query(models.Mistake)
        .filter(
            models.Mistake.user_id == current_user_id,
            models.Mistake.last_error_time >= today_start.strftime("%Y-%m-%d"),
        )
        .count()
    )

    # 4. 今日记忆卡复习数（从 CardReview 表查询）
    # 注意：需要 join FlashCard 表来过滤 user_id
    anki_reviews = (
        db.query(models.CardReview)
        .join(models.FlashCard, models.CardReview.card_id == models.FlashCard.id)
        .filter(
            models.FlashCard.user_id == current_user_id,
            models.CardReview.review_time >= today_start.isoformat(),
        )
        .count()
    )

    # 5. 今日完成题目数（从错题 history 推断，避免固定为0）
    today_prefix = today_start.strftime("%Y-%m-%d")
    question_attempts = 0
    today_mistakes = (
        db.query(models.Mistake).filter(models.Mistake.user_id == current_user_id).all()
    )
    for mistake in today_mistakes:
        history = mistake.history or []
        for item in history:
            ts = item.get("date")
            if isinstance(ts, str) and ts.startswith(today_prefix):
                question_attempts += 1

    questions_completed = max(question_attempts, mistakes_reviewed)

    return {
        "duration_minutes": duration_minutes,
        "questions_completed": questions_completed,
        "notes_created": notes_created,
        "mistakes_reviewed": mistakes_reviewed,
        "anki_reviews": anki_reviews,
    }


@app.get("/api/dashboard/heatmap")
async def get_dashboard_heatmap(
    days: int = 30,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """获取学习热力图数据（基于番茄钟会话）（带用户隔离）"""
    import datetime as dt

    heatmap = []
    today = dt.date.today()

    for i in range(days):
        date = today - dt.timedelta(days=days - i - 1)

        # 查询当天的所有会话
        sessions = (
            db.query(models.StudySession)
            .filter(
                models.StudySession.user_id == current_user_id,  # ✅ 用户隔离
                models.StudySession.created_at >= date.isoformat(),
                models.StudySession.created_at
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
    """获取断点续学信息（上次学习位置）"""
    last_session = (
        db.query(models.LearningSession)
        .filter(models.LearningSession.user_id == current_user_id)
        .order_by(models.LearningSession.id.desc())
        .first()
    )

    if not last_session:
        return {"last_activity": None}

    return {
        "last_activity": {
            "type": last_session.type or "quiz",
            "id": last_session.focus_item_id,
            "timestamp": (
                last_session.end_time.isoformat()
                if last_session.end_time
                else last_session.created_at
            ),
            "description": "继续上次学习",
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
    """更新学习进度（记录用户最后学习的位置）"""
    now = datetime.datetime.utcnow()
    session = models.LearningSession(
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
# 🃏 智能引用卡片接口 (Smart Links)
# =======================


@app.get("/api/card/preview")
async def get_card_preview(type: str, id: str, db: Session = Depends(get_db)):
    """
    统一预览接口：根据类型 (note/question) 和 ID 返回卡片摘要
    """
    if type == "note":
        # 1. 查找笔记
        note = crud.get_file_by_id(db, id)
        if not note:
            return {
                "found": False,
                "title": "Note Not Found",
                "body": "此笔记可能已被删除",
            }

        # 提取摘要（前100字）
        summary = note.content[:150] + "..." if note.content else "No content..."
        return {
            "found": True,
            "type": "note",
            "id": note.id,
            "title": note.name,
            "body": summary,
            "tags": ["Note", note.type],
        }

    elif type == "question":
        # 2. 查找题目 (这里逻辑稍微复杂，因为ID可能是 gk_ 开头或直接 ID)
        real_id = id.replace("gk_", "")

        # 尝试在题目表中查找
        question = (
            db.query(models.Question).filter(models.Question.id == real_id).first()
        )

        if not question:
            return {
                "found": False,
                "title": "Question Not Found",
                "body": "题目数据丢失",
            }

        # ✅ 使用新数据格式：直接从 stem 字段获取题干
        stem_preview = question.stem or "No stem"

        # 提取标签
        tags = [question.subject]
        # 提取 macro_tags 中的值（新格式在 macro_tags 中）
        if question.macro_tags:
            for k, v in question.macro_tags.items():
                if isinstance(v, list):
                    tags.extend(v)
                else:
                    tags.append(str(v))

        return {
            "found": True,
            "type": "question",
            "id": question.id,
            "title": f"Question {question.id}",  # 题目通常没有标题，用ID代替
            "body": stem_preview,
            "tags": tags[:4],  # 只展示前4个标签
        }

    return {"found": False, "error": "Unknown type"}


# ========================
# AI 功能 API
# ========================

from fastapi.responses import StreamingResponse
import asyncio


@app.post("/api/ai/quick-qa-stream")
async def ai_quick_qa_stream(
    data: dict = Body(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    AI 快速问答（流式响应）

    支持两种模式：
    1. 本地模式：使用规则引擎生成简单回答
    2. API模式：调用配置的AI API（OpenAI/DeepSeek/自定义）

    采用流式响应，逐字返回AI生成的答案
    """

    question = data.get("question", "")
    mode = data.get("mode", "local")  # local | api

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    # 获取用户配置
    ai_config = (
        db.query(models.AIConfig)
        .filter(models.AIConfig.user_id == current_user_id)
        .first()
    )
    if not ai_config:
        # 使用默认配置（本地模式）
        mode = "local"

    if mode == "local":
        # 本地模式：简单规则引擎
        answer = generate_local_answer(question)

        # 模拟流式响应：逐字符返回
        async def generate_stream():
            words = answer.split()
            for i, word in enumerate(words):
                yield word + (" " if i < len(words) - 1 else "")
                await asyncio.sleep(0.02)  # 模拟打字效果

        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache"},
        )
    else:
        # API模式：调用AI服务（暂未实现，返回本地答案）
        provider = ai_config.provider if ai_config else "local"
        if provider == "local":
            answer = generate_local_answer(question)

            async def generate_stream():
                words = answer.split()
                for i, word in enumerate(words):
                    yield word + (" " if i < len(words) - 1 else "")
                    await asyncio.sleep(0.02)

            return StreamingResponse(
                generate_stream(),
                media_type="text/plain",
                headers={"Cache-Control": "no-cache"},
            )
        else:
            # 其他AI提供商：暂返回本地模式提示
            answer = (
                f"[API模式] {provider} 未配置，使用本地模式。\n\n"
                + generate_local_answer(question)
            )

            async def generate_stream():
                words = answer.split()
                for i, word in enumerate(words):
                    yield word + (" " if i < len(words) - 1 else "")
                    await asyncio.sleep(0.02)

            return StreamingResponse(
                generate_stream(),
                media_type="text/plain",
                headers={"Cache-Control": "no-cache"},
            )


@app.post("/api/ai/quick-qa")
async def ai_quick_qa(
    data: dict = Body(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    AI 快速问答（非流式）

    支持两种模式：
    1. 本地模式：使用规则引擎生成简单回答
    2. API模式：调用配置的AI API（OpenAI/DeepSeek/自定义）
    """

    question = data.get("question", "")
    mode = data.get("mode", "local")  # local | api

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    # 获取用户配置
    ai_config = (
        db.query(models.AIConfig)
        .filter(models.AIConfig.user_id == current_user_id)
        .first()
    )
    if not ai_config:
        # 使用默认配置（本地模式）
        mode = "local"

    if mode == "local":
        # 本地模式：简单规则引擎
        answer = generate_local_answer(question)
        return {"answer": answer, "mode": "local", "sources": []}
    else:
        # API模式：调用AI服务
        try:
            provider = ai_config.provider if ai_config else "local"
            if provider == "local":
                answer = generate_local_answer(question)
                return {"answer": answer, "mode": "local", "sources": []}

            # 获取配置
            config = getattr(ai_config, provider, None)
            if not config:
                raise HTTPException(
                    status_code=400, detail=f"Config for {provider} not found"
                )

            # 调用AI API（这里返回模拟响应，实际需要调用真实API）
            answer = await call_ai_api(question, provider, config, db)

            return {
                "answer": answer,
                "mode": "api",
                "provider": provider,
                "sources": [],
            }
        except Exception as e:
            # 降级到本地模式
            answer = generate_local_answer(question)
            return {
                "answer": answer,
                "mode": "local",
                "fallback": True,
                "error": str(e),
            }


@app.post("/api/ai/explain-mistake")
async def ai_explain_mistake(
    data: dict = Body(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """AI错题讲解"""

    mistake_id = data.get("mistake_id")
    if not mistake_id:
        raise HTTPException(status_code=400, detail="mistake_id is required")

    # 获取错题记录
    mistake = (
        db.query(models.Mistake)
        .filter(
            models.Mistake.id == mistake_id, models.Mistake.user_id == current_user_id
        )
        .first()
    )

    if not mistake:
        raise HTTPException(status_code=404, detail="Mistake not found")

    # 获取题目信息
    question = (
        db.query(models.Question)
        .filter(models.Question.id == mistake.question_id)
        .first()
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # 生成讲解
    explanation = generate_mistake_explanation(mistake, question)

    # 分析错误原因
    diagnosis = diagnose_mistake(mistake, question)

    return {
        "explanation": explanation,
        "diagnosis": diagnosis,
        "correct_answer": question.answer,
        "user_answer": mistake.user_answer,
        "mastery": mistake.mastery,
    }


# ========================
# 辅助函数
# ========================


def generate_local_answer(question: str) -> str:
    """本地规则引擎生成回答"""

    question_lower = question.lower()

    # 数学公式识别
    if any(word in question_lower for word in ["牛顿", "力", "f=", "ma", "加速度"]):
        return """根据牛顿第二定律：

**F = ma**

其中：
- F = 合力（单位：牛顿 N）
- m = 质量（单位：千克 kg）
- a = 加速度（单位：米/秒² m/s²）

这个公式表明：物体的加速度与作用力成正比，与质量成反比。

应用场景：
1. 已知力和质量，求加速度：a = F/m
2. 已知质量和加速度，求力：F = ma
3. 已知力和加速度，求质量：m = F/a
"""

    # 计算题
    elif any(c.isdigit() for c in question):
        return """这是一道计算题。建议：

1. **仔细审题**：明确题目要求
2. **列出已知条件**：把题目中给出的数值都列出来
3. **选择公式**：根据题型选择合适的公式
4. **逐步计算**：一步一步计算，不要跳步
5. **检查结果**：验证答案是否合理

需要具体的题目解答吗？请提供完整的题目内容。"""

    # 概念题
    elif any(word in question_lower for word in ["什么是", "定义", "什么", "意思"]):
        return f"""关于"{question}"的问题：

这是一个概念性问题。建议从以下几个方面来理解：

1. **定义**：这个概念的基本定义是什么？
2. **特征**：它有哪些关键特征？
3. **应用**：在实际中如何应用？
4. **例子**：能举出具体的例子吗？

建议查阅教材或课堂笔记，结合例题来加深理解。"""

    # 默认回答
    else:
        return f"""关于"{question}"：

我可以帮你解答这个问题。请提供更多背景信息：

1. 这是哪个学科的问题？（数学/物理/化学等）
2. 题目具体内容是什么？
3. 你遇到了什么困难？

这样我能给你更准确的解答！"""


def generate_mistake_explanation(mistake, question) -> str:
    """生成错题讲解"""

    explanation = f"""【题目解析】
{question.stem or "题目内容"}

【你的答案】
{mistake.user_answer or "未作答"}

【正确答案】
{question.answer or "见解析"}

【解题思路】
"""

    # 根据题型添加不同讲解
    if question.type == "single_choice":
        explanation += """
单选题解题技巧：
1. 仔细审题，明确题目要求
2. 排除明显错误的选项
3. 比较剩余选项，选择最佳答案
4. 注意关键词：如"不正确的是"、"除了"等
"""
    elif question.type == "multiple_choice":
        explanation += """
多选题解题技巧：
1. 多选题通常有两个或以上正确答案
2. 逐个分析每个选项
3. 使用排除法
4. 注意"全选才得分"的规则
"""
    elif question.type == "fill_blank":
        explanation += """
填空题解题技巧：
1. 答案要简洁准确
2. 注意单位和符号
3. 如有多个空格，通常顺序不重要
4. 检查拼写和大小写
"""

    # 添加解析
    if question.explanation:
        explanation += f"\n【详细解析】\n{question.explanation}\n"

    # 添加建议
    explanation += f"""
【复习建议】
当前熟练度：{mistake.mastery:.1f}/100
{"⚠️ 需要加强练习！" if mistake.mastery > 50 else "✅ 掌握得不错！"}

建议：
1. 重做这道题，确保理解
2. 找3-5道类似的题目练习
3. 3天后再次复习
"""

    return explanation


def diagnose_mistake(mistake, question) -> dict:
    """诊断错误原因"""

    diagnosis = {"type": "", "reason": "", "suggestion": ""}

    # 根据答题历史分析
    if not mistake.history or len(mistake.history) == 0:
        diagnosis["type"] = "初次错误"
        diagnosis["reason"] = "第一次做这道题，可能不熟悉知识点"
        diagnosis["suggestion"] = "仔细阅读解析，理解相关概念"

    elif all(not h.get("is_correct", False) for h in mistake.history):
        diagnosis["type"] = "反复错误"
        diagnosis["reason"] = f"已错误{len(mistake.history)}次，需要重点复习"
        diagnosis["suggestion"] = "建议回归教材，从头学习这个知识点"

    elif mistake.history[-1].get("is_correct", False):
        diagnosis["type"] = "已掌握"
        diagnosis["reason"] = "最后一次回答正确"
        diagnosis["suggestion"] = "继续保持，定期复习巩固"

    else:
        diagnosis["type"] = "部分掌握"
        diagnosis["reason"] = "有时对有时错，理解不够深入"
        diagnosis["suggestion"] = "多做练习，加深理解"

    return diagnosis


async def call_ai_api(question: str, provider: str, config: dict, db: Session):
    """调用AI API（示例实现）"""

    # 这里是模拟实现，实际需要根据provider调用不同API
    # OpenAI、DeepSeek等的实现可以在这里添加

    if provider == "openai":
        # 调用OpenAI API
        import openai

        openai.api_key = config.get("apiKey")
        openai.base_url = config.get("baseURL", "https://api.openai.com/v1")

        response = await openai.ChatCompletion.acreate(
            model=config.get("model", "gpt-4o-mini"),
            messages=[
                {
                    "role": "system",
                    "content": "你是一个专业的学习助手，擅长解答学生的学习问题。",
                },
                {"role": "user", "content": question},
            ],
        )

        return response.choices[0].message.content

    elif provider == "deepseek":
        # 调用DeepSeek API（格式类似OpenAI）
        # 这里返回模拟响应
        return f"[DeepSeek API回答]\\n\\n关于 {question} 的问题，这是一道很好的题目。建议..."

    else:
        # 自定义API
        return f"[自定义API]\\n\\n针对问题：{question}"
