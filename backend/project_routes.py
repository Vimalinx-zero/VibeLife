from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import time
import pydantic

from database import get_db
from auth import get_current_user_id
import models

router = APIRouter()


def _normalize_project_category(value: str | None) -> str:
    text = (value or "work").strip().lower() or "work"
    if text == "study":
        return "growth"
    return text


class ProjectCreate(pydantic.BaseModel):
    name: str
    category: str = "work"
    subtitle: str = ""
    status: str = "正常推进"
    nextAction: str = ""


class ProjectUpdate(pydantic.BaseModel):
    name: str | None = None
    category: str | None = None
    subtitle: str | None = None
    status: str | None = None
    nextAction: str | None = None


class ProjectStepCreate(pydantic.BaseModel):
    title: str
    owner: str = ""
    due: str = ""
    done: bool = False


class ProjectStepUpdate(pydantic.BaseModel):
    title: str | None = None
    owner: str | None = None
    due: str | None = None
    done: bool | None = None


def _seed_id(user_id: str, suffix: str) -> str:
    return f"{user_id}_{suffix}"


def _serialize_project(project: models.Project) -> dict:
    return {
        "id": project.id,
        "name": project.name,
        "category": _normalize_project_category(project.category),
        "subtitle": project.subtitle,
        "status": project.status,
        "nextAction": project.next_action,
        "createdAt": project.created_at,
        "updatedAt": project.updated_at,
    }


def _serialize_step(step: models.ProjectStep) -> dict:
    return {
        "id": step.id,
        "projectId": step.project_id,
        "title": step.title,
        "owner": step.owner,
        "due": step.due,
        "done": step.done,
    }


def _get_project_or_404(
    db: Session, project_id: str, current_user_id: str
) -> models.Project:
    project = (
        db.query(models.Project)
        .filter(
            models.Project.id == project_id,
            models.Project.user_id == current_user_id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_project_step_or_404(
    db: Session, project_id: str, step_id: str, current_user_id: str
) -> models.ProjectStep:
    step = (
        db.query(models.ProjectStep)
        .filter(
            models.ProjectStep.id == step_id,
            models.ProjectStep.project_id == project_id,
            models.ProjectStep.user_id == current_user_id,
        )
        .first()
    )
    if not step:
        raise HTTPException(status_code=404, detail="Project step not found")
    return step


def _seed_projects_if_empty(db: Session, user_id: str):
    existing = (
        db.query(models.Project).filter(models.Project.user_id == user_id).count()
    )
    if existing > 0:
        return

    now = datetime.utcnow().isoformat()
    work_project_id = _seed_id(user_id, "project_work_tracker")
    life_project_id = _seed_id(user_id, "project_life_trip")
    growth_project_id = _seed_id(user_id, "project_growth_expression")
    projects = [
        models.Project(
            id=work_project_id,
            user_id=user_id,
            name="项目跟踪界面改版",
            category="work",
            subtitle="首页入口与项目页联动",
            status="正常推进",
            next_action="完成思维导图与邮件面板联动",
            created_at=now,
            updated_at=now,
        ),
        models.Project(
            id=life_project_id,
            user_id=user_id,
            name="家庭春游计划",
            category="life",
            subtitle="4月行程与预算安排",
            status="需关注",
            next_action="本周内确认酒店与预算",
            created_at=now,
            updated_at=now,
        ),
        models.Project(
            id=growth_project_id,
            user_id=user_id,
            name="表达力训练计划",
            category="growth",
            subtitle="30天输出与复盘",
            status="正常推进",
            next_action="今日输出一段 5 分钟复盘",
            created_at=now,
            updated_at=now,
        ),
    ]

    steps = [
        models.ProjectStep(
            id=_seed_id(user_id, "ps_1"),
            user_id=user_id,
            project_id=work_project_id,
            title="整理交互需求",
            owner="AI",
            due="03-08",
            done=True,
        ),
        models.ProjectStep(
            id=_seed_id(user_id, "ps_2"),
            user_id=user_id,
            project_id=work_project_id,
            title="实现项目三标签",
            owner="AI",
            due="03-10",
            done=False,
        ),
        models.ProjectStep(
            id=_seed_id(user_id, "ps_3"),
            user_id=user_id,
            project_id=life_project_id,
            title="筛选酒店方案",
            owner="我",
            due="03-12",
            done=False,
        ),
        models.ProjectStep(
            id=_seed_id(user_id, "ps_4"),
            user_id=user_id,
            project_id=growth_project_id,
            title="每天做一次公开表达复盘",
            owner="我",
            due="每天",
            done=False,
        ),
    ]

    resources = [
        models.ProjectResource(
            id=_seed_id(user_id, "pr_1"),
            user_id=user_id,
            project_id=work_project_id,
            name="交互清单",
            kind="文档",
            note="记录页面结构与交互细节",
        ),
        models.ProjectResource(
            id=_seed_id(user_id, "pr_2"),
            user_id=user_id,
            project_id=life_project_id,
            name="酒店候选表",
            kind="链接",
            note="按预算排序",
        ),
        models.ProjectResource(
            id=_seed_id(user_id, "pr_3"),
            user_id=user_id,
            project_id=growth_project_id,
            name="表达练习清单",
            kind="文件",
            note="记录输出主题与复盘反馈",
        ),
    ]

    emails = [
        models.ProjectEmail(
            id=_seed_id(user_id, "pe_1"),
            user_id=user_id,
            project_id=work_project_id,
            from_addr="design@team.ai",
            subject="UI反馈：保持简洁结构",
            summary="建议降低视觉干扰，突出项目内容。",
            importance="高",
            time="今天 09:18",
        ),
        models.ProjectEmail(
            id=_seed_id(user_id, "pe_2"),
            user_id=user_id,
            project_id=life_project_id,
            from_addr="travel@offer.com",
            subject="周末酒店优惠提醒",
            summary="亲子房有折扣，建议尽快确认。",
            importance="中",
            time="昨天 20:11",
        ),
    ]

    db.add_all(projects + steps + resources + emails)
    db.commit()


@router.post("/api/projects", status_code=201)
async def create_project(
    payload: ProjectCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow().isoformat()
    project = models.Project(
        id=f"project_{int(time.time() * 1000)}",
        user_id=current_user_id,
        name=payload.name,
        category=_normalize_project_category(payload.category),
        subtitle=payload.subtitle,
        status=payload.status,
        next_action=payload.nextAction,
        created_at=now,
        updated_at=now,
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return {"success": True, "project": _serialize_project(project)}


@router.get("/api/projects")
async def get_projects(
    category: str | None = None,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    _seed_projects_if_empty(db, current_user_id)

    query = db.query(models.Project).filter(models.Project.user_id == current_user_id)
    if category and category != "all":
        query = query.filter(
            models.Project.category == _normalize_project_category(category)
        )
    projects = query.order_by(models.Project.updated_at.desc()).all()

    project_ids = [p.id for p in projects]
    steps = (
        db.query(models.ProjectStep)
        .filter(
            models.ProjectStep.user_id == current_user_id,
            models.ProjectStep.project_id.in_(project_ids),
        )
        .all()
        if project_ids
        else []
    )
    resources = (
        db.query(models.ProjectResource)
        .filter(
            models.ProjectResource.user_id == current_user_id,
            models.ProjectResource.project_id.in_(project_ids),
        )
        .all()
        if project_ids
        else []
    )
    emails = (
        db.query(models.ProjectEmail)
        .filter(
            models.ProjectEmail.user_id == current_user_id,
            models.ProjectEmail.project_id.in_(project_ids),
        )
        .all()
        if project_ids
        else []
    )

    step_map: dict[str, list] = {}
    for item in steps:
        step_map.setdefault(item.project_id, []).append(
            {
                "id": item.id,
                "title": item.title,
                "owner": item.owner,
                "due": item.due,
                "done": item.done,
            }
        )

    resource_map: dict[str, list] = {}
    for item in resources:
        resource_map.setdefault(item.project_id, []).append(
            {
                "id": item.id,
                "name": item.name,
                "kind": item.kind,
                "note": item.note,
            }
        )

    email_map: dict[str, list] = {}
    for item in emails:
        email_map.setdefault(item.project_id, []).append(
            {
                "id": item.id,
                "from": item.from_addr,
                "subject": item.subject,
                "summary": item.summary,
                "importance": item.importance,
                "time": item.time,
            }
        )

    result = [
        {
            "id": p.id,
            "name": p.name,
            "category": _normalize_project_category(p.category),
            "subtitle": p.subtitle,
            "status": p.status,
            "nextAction": p.next_action,
            "steps": step_map.get(p.id, []),
            "resources": resource_map.get(p.id, []),
            "emails": email_map.get(p.id, []),
        }
        for p in projects
    ]

    return {"projects": result}


@router.post("/api/projects/{project_id}/emails")
async def add_project_email(
    project_id: str,
    payload: dict,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    _get_project_or_404(db, project_id, current_user_id)
    email_id = f"pe_{int(time.time() * 1000)}"
    record = models.ProjectEmail(
        id=email_id,
        user_id=current_user_id,
        project_id=project_id,
        from_addr=payload.get("from", ""),
        subject=payload.get("subject", ""),
        summary=payload.get("summary", ""),
        importance=payload.get("importance", "中"),
        time=payload.get("time", datetime.utcnow().strftime("%Y-%m-%d %H:%M")),
    )
    db.add(record)
    db.commit()
    return {"success": True, "id": email_id}


@router.put("/api/projects/{project_id}")
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    project = _get_project_or_404(db, project_id, current_user_id)

    if payload.name is not None:
        project.name = payload.name
    if payload.category is not None:
        project.category = _normalize_project_category(payload.category)
    if payload.subtitle is not None:
        project.subtitle = payload.subtitle
    if payload.status is not None:
        project.status = payload.status
    if payload.nextAction is not None:
        project.next_action = payload.nextAction

    project.updated_at = datetime.utcnow().isoformat()
    db.commit()
    db.refresh(project)

    return {"success": True, "project": _serialize_project(project)}


@router.post("/api/projects/{project_id}/steps")
async def create_project_step(
    project_id: str,
    payload: ProjectStepCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    project = _get_project_or_404(db, project_id, current_user_id)
    step_id = f"ps_{int(time.time() * 1000)}"

    step = models.ProjectStep(
        id=step_id,
        user_id=current_user_id,
        project_id=project_id,
        title=payload.title,
        owner=payload.owner,
        due=payload.due,
        done=payload.done,
    )

    db.add(step)
    project.updated_at = datetime.utcnow().isoformat()
    db.commit()
    db.refresh(project)
    db.refresh(step)

    return {
        "success": True,
        "project": _serialize_project(project),
        "step": _serialize_step(step),
    }


@router.put("/api/projects/{project_id}/steps/{step_id}")
async def update_project_step(
    project_id: str,
    step_id: str,
    payload: ProjectStepUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    project = _get_project_or_404(db, project_id, current_user_id)
    step = _get_project_step_or_404(db, project_id, step_id, current_user_id)

    if payload.title is not None:
        step.title = payload.title
    if payload.owner is not None:
        step.owner = payload.owner
    if payload.due is not None:
        step.due = payload.due
    if payload.done is not None:
        step.done = payload.done

    project.updated_at = datetime.utcnow().isoformat()
    db.commit()
    db.refresh(project)
    db.refresh(step)

    return {
        "success": True,
        "project": _serialize_project(project),
        "step": _serialize_step(step),
    }
