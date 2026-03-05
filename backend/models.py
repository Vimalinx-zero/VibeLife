# (注释) backend/models.py
# (注释) 定义 SQL 表结构。包含题库、用户画像、错题本、笔记文件。

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Float,
    DateTime,
    ForeignKey,
    JSON,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from database import Base
import datetime


# --- 0. 用户表 (User) ---
class User(Base):
    """用户表 - 用于用户认证和数据隔离"""

    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)  # u_alex
    username = Column(String, unique=True, index=True, nullable=False)  # 用户名
    email = Column(String, unique=True, index=True, nullable=False)  # 邮箱
    password_hash = Column(String, nullable=False)  # 密码hash（bcrypt）

    # 用户信息
    full_name = Column(String, nullable=True)  # 全名
    avatar_url = Column(String, nullable=True)  # 头像URL

    # 时间戳
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    last_login = Column(String, nullable=True)  # 最后登录时间

    # 账户状态
    is_active = Column(Boolean, default=True)  # 账户是否激活
    is_admin = Column(Boolean, default=False)  # 是否管理员


# --- 1. 题库表 (Questions) ---
class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, index=True)  # q_001
    subject = Column(String, index=True)  # Physics
    type = Column(String)  # single_choice, multiple_choice, fill_blank, proof, essay
    difficulty = Column(Integer)

    # 核心：利用 JSON 字段存储题目内容
    # 题干
    stem = Column(Text)  # 题目描述

    # 选择题选项（仅选择题使用）
    options = Column(
        JSON, nullable=True
    )  # [{key: "A", content: "...", is_correct: true}]

    # 答案（非选择题使用）
    answer = Column(Text, nullable=True)  # 填空题/证明题/问答题的答案

    # 解析
    solution = Column(Text, nullable=True)  # 答案解析

    # 媒体资源
    media = Column(JSON, nullable=True)  # {image_url, audio_url, video_url}

    # 标签系统
    macro_tags = Column(JSON, nullable=True)  # 宏观标签

    # ✨ 新增：关联字段（用于四件套打通）
    related_notes = Column(JSON, default=list)  # 相关笔记 ID 列表

    # ✨ 新增：复合题支持
    steps = Column(JSON, nullable=True)  # 复合题的步骤数组
    is_composite = Column(Boolean, default=False)  # 是否为复合题


# --- 2. 笔记/文件系统表 (FileSystem) ---
class FileItem(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True, index=True)
    type = Column(String)  # folder / file
    name = Column(String)
    parent_id = Column(String, ForeignKey("files.id"), nullable=True)
    content = Column(Text, nullable=True)  # Markdown 内容
    date = Column(String, default=lambda: datetime.date.today().strftime("%Y-%m-%d"))

    # ✅ 安全修复：用户隔离 - 移除硬编码默认值，必须显式提供
    user_id = Column(String, index=True, nullable=False)  # 用户ID（必填）

    # ✨ 新增：标签系统（JSON 数组存储）
    tags = Column(JSON, default=list)  # ["数学", "物理", "重要"]

    # 自关联，用于构建文件夹树
    children = relationship("FileItem", backref="parent", remote_side=[id])


# --- 3. 错题本表 (MistakeBook) ---
class Mistake(Base):
    __tablename__ = "mistakes"

    id = Column(Integer, primary_key=True, index=True)  # 自增 ID
    user_id = Column(String, index=True)  # u_alex
    question_id = Column(String, ForeignKey("questions.id"))

    # 错误快照
    user_answer = Column(String, nullable=True)  # 用户填写的答案

    # 关联笔记 (双向链接)
    linked_note_id = Column(String, ForeignKey("files.id"), nullable=True)

    # 统计数据
    error_count = Column(Integer, default=1)
    mastery = Column(Float, default=0.0)  # 0-100
    last_error_time = Column(String)  # YYYY-MM-DD

    # 历史记录 (JSON): [{answer: 'xxx', is_correct: false}]
    history = Column(JSON, default=list)

    # ✨ 新增：关联字段（用于四件套打通）
    related_cards = Column(JSON, default=list)  # 相关 Anki 卡片 ID 列表
    related_questions = Column(JSON, default=list)  # 相关题目 ID 列表

    # ✨ 新增：复合题支持
    step_answers = Column(JSON, default=list)  # 复合题的小题答题记录
    # 格式：[{"step_index": 0, "is_correct": true, "user_answer": "A", "timestamp": "..."}]

    # 关联查询
    question = relationship("Question")
    linked_note = relationship("FileItem")


# --- 4. 用户画像表 (UserProfile) ---
class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(String, primary_key=True)
    level = Column(Integer, default=1)

    # 核心算法权重：{ "牛顿定律": 85.0, "粗心": 90.0 }
    tag_weights = Column(JSON, default=dict)


# --- 5. 学习会话表 (StudySession) ---
class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(String, primary_key=True, index=True)  # session_timestamp
    user_id = Column(String, index=True, nullable=False)  # 用户ID（必填）
    duration_minutes = Column(Integer)  # 专注时长（分钟）
    mode = Column(String)  # 'classic' | 'flow'
    tasks_completed = Column(Integer, default=0)  # 完成的任务数
    mistakes_collected = Column(Integer, default=0)  # 收集的错题数
    created_at = Column(
        String, default=lambda: datetime.datetime.utcnow().isoformat()
    )  # ISO 8601


# --- 6. 工作台任务表 (TodoItem) ---
class TodoItem(Base):
    __tablename__ = "todo_items"

    id = Column(String, primary_key=True, index=True)  # timestamp-based ID
    user_id = Column(String, index=True, nullable=False)  # 用户ID（必填）
    text = Column(String, nullable=False)  # 任务内容
    completed = Column(Boolean, default=False)  # 是否完成
    priority = Column(Integer, default=0)  # 优先级 0-3（低、中、高、紧急）
    subject = Column(String, default="general")  # 学科分类
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    completed_at = Column(String, nullable=True)  # 完成时间
    due_date = Column(String, nullable=True)  # 截止日期


# --- 7. 工作台错题备忘录表 (WorkbenchMistake) ---
class WorkbenchMistake(Base):
    __tablename__ = "workbench_mistakes"

    id = Column(String, primary_key=True, index=True)  # timestamp-based ID
    user_id = Column(String, index=True, nullable=False)  # 用户ID（必填）
    content = Column(String, nullable=False)  # 备忘录内容（格式：P12T3 注释）
    subject = Column(String, nullable=False)  # 学科
    question_id = Column(String, nullable=True)  # 关联的题目ID（如果有）
    created_at = Column(
        String, default=lambda: datetime.datetime.utcnow().isoformat()
    )  # 创建时间


# --- 8. Anki 闪卡表 (FlashCard) ---
class FlashCard(Base):
    __tablename__ = "flashcards"

    id = Column(String, primary_key=True, index=True)  # timestamp-based ID
    user_id = Column(String, index=True, nullable=False)  # 用户ID（必填）
    front = Column(String, nullable=False)  # 卡片正面（问题）
    back = Column(String, nullable=False)  # 卡片背面（答案）
    tags = Column(JSON, default=list)  # 标签数组 ["数学", "微积分"]
    deck = Column(String, default="default")  # 牌组名称

    # SM-2 算法参数
    ease_factor = Column(Float, default=2.5)  # 难度因子（1.3-2.5）
    interval = Column(Integer, default=0)  # 间隔天数
    repetitions = Column(Integer, default=0)  # 成功复习次数
    next_review_date = Column(String, nullable=True)  # 下次复习日期

    # ✨ 新增：来源追踪（用于四件套打通）
    source_note_id = Column(String, nullable=True)  # 来源笔记 ID
    source_mistake_id = Column(Integer, nullable=True)  # 来源错题 ID

    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


# --- 9. Anki 复习记录表 (CardReview) ---
class CardReview(Base):
    __tablename__ = "card_reviews"

    id = Column(String, primary_key=True, index=True)  # timestamp-based ID
    card_id = Column(String, index=True, nullable=False)  # 关联的卡片ID
    user_id = Column(String, index=True, nullable=False)  # 用户ID（必填）

    quality = Column(Integer, nullable=False)  # 评分（0-5）
    # 0: 完全忘记, 1: 不记得, 2: 难, 3: 一般, 4: 容易, 5: 非常容易

    review_time = Column(
        String, default=lambda: datetime.datetime.utcnow().isoformat()
    )  # 复习时间
    time_spent = Column(Integer, default=0)  # 花费时间（秒）

    # 算法快照（记录当时的状态）
    ease_factor = Column(Float)  # 复习时的难度因子
    interval = Column(Integer)  # 复习时的间隔

    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


# --- 10. Anki 合集表 (Collection) ---
class Collection(Base):
    __tablename__ = "collections"

    id = Column(String, primary_key=True, index=True)  # timestamp-based ID
    user_id = Column(String, index=True, nullable=False)  # 用户ID（必填）
    name = Column(String, nullable=False)  # 合集名称
    description = Column(String, nullable=True)  # 描述
    color = Column(
        String, default="blue"
    )  # 显示颜色 (blue, green, red, yellow, purple)

    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


# --- 11. 合集-卡片关联表 (CollectionCard) ---
class CollectionCard(Base):
    __tablename__ = "collection_cards"

    id = Column(String, primary_key=True, index=True)  # timestamp-based ID
    collection_id = Column(String, index=True, nullable=False)  # 所属合集ID
    card_id = Column(String, index=True, nullable=False)  # 卡片ID
    order = Column(Integer, default=0)  # 排序位置

    added_at = Column(
        String, default=lambda: datetime.datetime.utcnow().isoformat()
    )  # 添加时间


# --- 12. 学习会话记录表 (LearningSession) ---
class LearningSession(Base):
    """学习会话记录（用于统计学习时长）"""

    __tablename__ = "learning_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, index=True)  # 用户ID
    type = Column(String)  # 学习类型: quiz, notes, anki, workbench
    focus_item_id = Column(String)  # 当前学习的内容ID（笔记ID/记忆卡ID/题目ID）
    start_time = Column(DateTime)  # 开始时间
    end_time = Column(DateTime, nullable=True)  # 结束时间
    duration = Column(Integer, default=0)  # 时长（秒）
    pomodoro_count = Column(Integer, default=0)  # 完成的番茄钟数量
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


# --- 13. 番茄钟记录表 (PomodoroRecord) ---
class PomodoroRecord(Base):
    """番茄钟记录"""

    __tablename__ = "pomodoro_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, index=True)
    date = Column(String)  # 日期 (YYYY-MM-DD)
    focus_duration = Column(Integer, default=0)  # 专注时长（秒）
    break_duration = Column(Integer, default=0)  # 休息时长（秒）
    session_count = Column(Integer, default=0)  # 完成的番茄钟次数
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


# --- 14. 收藏题目表 (FavoriteQuestion) ---
class FavoriteQuestion(Base):
    """收藏的题目（特殊收藏夹）"""

    __tablename__ = "favorite_questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, index=True, nullable=False)  # 用户ID（必填）
    question_id = Column(String, index=True, nullable=False)  # 题目ID
    subject = Column(String)  # 学科（用于筛选）
    added_at = Column(
        String, default=lambda: datetime.datetime.utcnow().isoformat()
    )  # 收藏时间
    notes = Column(Text, nullable=True)  # 收藏笔记

    # 唯一约束：每个用户对同一题只能收藏一次
    __table_args__ = (
        UniqueConstraint("user_id", "question_id", name="unique_user_question"),
    )


# --- 15. AI配置表 (AIConfig) ---
class AIConfig(Base):
    """AI服务配置"""

    __tablename__ = "ai_configs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, index=True, unique=True, nullable=False)  # 用户ID（唯一）
    provider = Column(String, default="local")  # local | openai | deepseek | custom

    # OpenAI配置
    openai_api_key = Column(String, nullable=True)
    openai_base_url = Column(String, default="https://api.openai.com/v1")
    openai_model = Column(String, default="gpt-4o-mini")

    # DeepSeek配置
    deepseek_api_key = Column(String, nullable=True)
    deepseek_base_url = Column(String, default="https://api.deepseek.com/v1")
    deepseek_model = Column(String, default="deepseek-chat")

    # 自定义API配置
    custom_api_key = Column(String, nullable=True)
    custom_base_url = Column(String, nullable=True)
    custom_model = Column(String, nullable=True)

    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


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
    metadata = Column(JSON, default=dict)
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
