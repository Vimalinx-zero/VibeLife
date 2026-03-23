import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    last_login = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)


class FileItem(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)  # folder | file
    name = Column(String, nullable=False)
    parent_id = Column(String, ForeignKey("files.id"), nullable=True)
    content = Column(Text, nullable=True)
    date = Column(String, default=lambda: datetime.date.today().isoformat())
    user_id = Column(String, index=True, nullable=False)
    tags = Column(JSON, default=list)

    children = relationship("FileItem", backref="parent", remote_side=[id])


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    mode = Column(String, nullable=False)  # classic | flow
    tasks_completed = Column(Integer, default=0)
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


class TodoItem(Base):
    __tablename__ = "todo_items"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    text = Column(String, nullable=False)
    completed = Column(Boolean, default=False)
    priority = Column(Integer, default=0)
    subject = Column(String, default="general")
    source = Column(String, default="manual", nullable=False)
    plan_batch_id = Column(String, nullable=True)
    plan_date = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    completed_at = Column(String, nullable=True)
    due_date = Column(String, nullable=True)
    sort_order = Column(Integer, nullable=True)


class ActivityCheckpoint(Base):
    __tablename__ = "activity_checkpoints"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, index=True, nullable=False)
    type = Column(String, nullable=False)
    focus_item_id = Column(String, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    duration = Column(Integer, default=0)
    pomodoro_count = Column(Integer, default=0)
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, default="work")
    subtitle = Column(String, default="")
    status = Column(String, default="正常推进")
    next_action = Column(String, default="")
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


class ProjectStep(Base):
    __tablename__ = "project_steps"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    owner = Column(String, default="")
    due = Column(String, default="")
    done = Column(Boolean, default=False)


class ProjectResource(Base):
    __tablename__ = "project_resources"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    kind = Column(String, default="文档")
    note = Column(Text, default="")


class ProjectEmail(Base):
    __tablename__ = "project_emails"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=False)
    from_addr = Column(String, default="")
    subject = Column(String, nullable=False)
    summary = Column(Text, default="")
    importance = Column(String, default="中")
    time = Column(String, default="")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    entry_date = Column(String, index=True, nullable=False)
    mood = Column(String, default="")
    tags = Column(JSON, default=list)
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


class ScheduleEvent(Base):
    __tablename__ = "schedule_events"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    event_date = Column(String, index=True, nullable=False)
    time = Column(String, nullable=True)
    type = Column(String, default="task")
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


class QuickNoteCapture(Base):
    __tablename__ = "quick_note_captures"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=True)
    source_type = Column(String, default="url")
    source_uri = Column(Text, default="")
    title = Column(String, default="")
    normalized_markdown = Column(Text, default="")
    summary = Column(Text, default="")
    tags = Column(JSON, default=list)
    capture_metadata = Column("metadata", JSON, default=dict)
    content_kind = Column(String, default="collected")
    category = Column(String, nullable=True)
    source_capture_ids = Column(JSON, default=list)
    source_filter_snapshot = Column(JSON, nullable=True)
    discussion_metadata = Column(JSON, nullable=True)
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


class MusicTrack(Base):
    __tablename__ = "music_tracks"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    artist = Column(String, default="")
    album = Column(String, default="")
    duration_seconds = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    stored_filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    source_kind = Column(String, default="imported")
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


# ============================================================
# 高考学习核心数据模型
# 设计原则：服务真实学习场景，不堆花哨字段
# ============================================================

class MistakeItem(Base):
    """错题主库 - 高考学习的核心资产"""
    __tablename__ = "mistake_items"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)

    # 题目内容
    question_text = Column(Text, nullable=False)  # 题目内容（可从 ArtIFlow 同步）
    question_image = Column(Text, nullable=True)  # 题目图片 URL（拍照场景）
    answer_text = Column(Text, nullable=True)     # 标准答案
    answer_image = Column(Text, nullable=True)    # 答案图片 URL

    # 学科分类
    subject = Column(String, default="综合")       # 数学/语文/英语/物理/化学/生物/历史/地理/政治
    chapter = Column(String, nullable=True)       # 章节/知识点
    difficulty = Column(Integer, default=3)       # 1-5 难度

    # 错误分析
    my_answer = Column(Text, nullable=True)       # 我的答案
    error_type = Column(String, nullable=True)    # 错误类型：计算错误/概念模糊/审题不清/方法不对
    error_analysis = Column(Text, nullable=True)  # 错因分析（AI 生成或手写）
    key_insight = Column(Text, nullable=True)     # 关键领悟（一句话）

    # 来源追踪
    source_type = Column(String, default="manual")  # manual/artiflow/photo/import
    source_exam = Column(String, nullable=True)     # 来源试卷/练习册名称
    source_date = Column(String, nullable=True)     # 做题日期

    # 复习状态
    mastery_level = Column(Integer, default=1)    # 1-5 掌握程度
    review_count = Column(Integer, default=0)     # 复习次数
    last_review_at = Column(String, nullable=True)
    next_review_at = Column(String, nullable=True)  # 下次复习日期（间隔重复算法）
    is_mastered = Column(Boolean, default=False)    # 是否已掌握

    # 变式题关联
    variation_ids = Column(JSON, default=list)    # 关联变式题 ID 列表

    # 元数据
    tags = Column(JSON, default=list)
    notes = Column(Text, nullable=True)           # 补充笔记
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


class WeakPoint(Base):
    """薄弱点观察引擎 - 知识点级聚合"""
    __tablename__ = "weak_points"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)

    # 知识点标识
    subject = Column(String, nullable=False)
    chapter = Column(String, nullable=True)
    knowledge_point = Column(String, nullable=False)  # 具体知识点名称

    # 薄弱程度
    weakness_score = Column(Integer, default=50)    # 0-100，越高越薄弱
    mistake_count = Column(Integer, default=0)      # 关联错题数
    mastery_trend = Column(String, default="stable")  # improving/stable/declining

    # 关联数据
    mistake_ids = Column(JSON, default=list)        # 关联的错题 ID
    variation_ids = Column(JSON, default=list)      # 关联的变式题 ID

    # 改进计划
    target_mastery = Column(Integer, default=80)    # 目标掌握度
    suggested_actions = Column(JSON, default=list)  # AI 建议行动
    priority = Column(Integer, default=3)           # 1-5 优先级

    # 时间戳
    first_detected_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    last_updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


class ReviewRecord(Base):
    """复习记录 - 跟踪每次复习效果"""
    __tablename__ = "review_records"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    mistake_id = Column(String, index=True, nullable=False)

    # 复习结果
    result = Column(String, nullable=False)         # correct/partial/wrong
    time_spent_seconds = Column(Integer, nullable=True)
    self_rating = Column(Integer, nullable=True)    # 1-5 自评

    # 复习内容
    reviewed_content = Column(Text, nullable=True)  # 复习了什么
    notes = Column(Text, nullable=True)             # 本次复习笔记

    # 效果追踪
    before_mastery = Column(Integer, nullable=True)
    after_mastery = Column(Integer, nullable=True)

    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


class VariationQuestion(Base):
    """变式题库 - 巩固练习"""
    __tablename__ = "variation_questions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    source_mistake_id = Column(String, index=True, nullable=False)

    # 变式题内容
    question_text = Column(Text, nullable=False)
    question_image = Column(Text, nullable=True)
    answer_text = Column(Text, nullable=True)
    answer_image = Column(Text, nullable=True)

    # 变式说明
    variation_type = Column(String, nullable=True)   # 同类型/逆向思维/综合应用
    variation_note = Column(Text, nullable=True)     # 变式点说明

    # 练习状态
    is_practiced = Column(Boolean, default=False)
    practice_result = Column(String, nullable=True)  # correct/wrong
    practiced_at = Column(String, nullable=True)

    # 来源
    source = Column(String, default="ai_generated")  # ai_generated/manual/import

    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
