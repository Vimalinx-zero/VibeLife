from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import time

from database import get_db
from auth import get_current_user_id
import models

router = APIRouter()


def _seed_projects_if_empty(db: Session, user_id: str):
    existing = (
        db.query(models.Project).filter(models.Project.user_id == user_id).count()
    )
    if existing > 0:
        return

    now = datetime.utcnow().isoformat()
    projects = [
        models.Project(
            id="project_work_tracker",
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
            id="project_life_trip",
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
            id="project_study_english",
            user_id=user_id,
            name="英语口语冲刺",
            category="study",
            subtitle="30天口语练习",
            status="正常推进",
            next_action="今日完成20分钟跟读",
            created_at=now,
            updated_at=now,
        ),
    ]

    steps = [
        models.ProjectStep(
            id="ps_1",
            user_id=user_id,
            project_id="project_work_tracker",
            title="整理交互需求",
            owner="Wilson",
            due="03-08",
            done=True,
        ),
        models.ProjectStep(
            id="ps_2",
            user_id=user_id,
            project_id="project_work_tracker",
            title="实现项目三标签",
            owner="Wilson",
            due="03-10",
            done=False,
        ),
        models.ProjectStep(
            id="ps_3",
            user_id=user_id,
            project_id="project_life_trip",
            title="筛选酒店方案",
            owner="我",
            due="03-12",
            done=False,
        ),
        models.ProjectStep(
            id="ps_4",
            user_id=user_id,
            project_id="project_study_english",
            title="每日跟读20分钟",
            owner="我",
            due="每天",
            done=False,
        ),
    ]

    resources = [
        models.ProjectResource(
            id="pr_1",
            user_id=user_id,
            project_id="project_work_tracker",
            name="交互清单",
            kind="文档",
            note="记录页面结构与交互细节",
        ),
        models.ProjectResource(
            id="pr_2",
            user_id=user_id,
            project_id="project_life_trip",
            name="酒店候选表",
            kind="链接",
            note="按预算排序",
        ),
        models.ProjectResource(
            id="pr_3",
            user_id=user_id,
            project_id="project_study_english",
            name="跟读素材",
            kind="文件",
            note="按难度分层",
        ),
    ]

    emails = [
        models.ProjectEmail(
            id="pe_1",
            user_id=user_id,
            project_id="project_work_tracker",
            from_addr="design@team.ai",
            subject="UI反馈：保持简洁结构",
            summary="建议降低视觉干扰，突出项目内容。",
            importance="高",
            time="今天 09:18",
        ),
        models.ProjectEmail(
            id="pe_2",
            user_id=user_id,
            project_id="project_life_trip",
            from_addr="travel@offer.com",
            subject="周末酒店优惠提醒",
            summary="亲子房有折扣，建议尽快确认。",
            importance="中",
            time="昨天 20:11",
        ),
    ]

    db.add_all(projects + steps + resources + emails)
    db.commit()


@router.get("/api/projects")
async def get_projects(
    category: str | None = None,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    _seed_projects_if_empty(db, current_user_id)

    query = db.query(models.Project).filter(models.Project.user_id == current_user_id)
    if category and category != "all":
        query = query.filter(models.Project.category == category)
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
            "category": p.category,
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
