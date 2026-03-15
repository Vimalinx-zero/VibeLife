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


class StudySession(Base):
    __tablename__ = "study_sessions"

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
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    completed_at = Column(String, nullable=True)
    due_date = Column(String, nullable=True)


class LearningSession(Base):
    __tablename__ = "learning_sessions"

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
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
