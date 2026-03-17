from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

import models
from ai_coach_service import refresh_today_plan, validate_date_key


MAX_DIGEST_PROJECTS = 5
MAX_PENDING_STEPS = 3
def build_project_digest(db: Session, current_user_id: str) -> Dict[str, Any]:
    projects = (
        db.query(models.Project)
        .filter(models.Project.user_id == current_user_id)
        .all()
    )

    if not projects:
        return {"projects": [], "count": 0}

    project_ids = [project.id for project in projects]
    steps = (
        db.query(models.ProjectStep)
        .filter(
            models.ProjectStep.user_id == current_user_id,
            models.ProjectStep.project_id.in_(project_ids),
            models.ProjectStep.done == False,
        )
        .all()
    )

    step_map: dict[str, List[dict]] = {}
    for step in steps:
        step_map.setdefault(step.project_id, []).append(
            {
                "id": step.id,
                "title": step.title,
                "owner": step.owner,
                "due": step.due,
            }
        )

    digest_rows = []
    for project in projects:
        pending_steps = step_map.get(project.id, [])[:MAX_PENDING_STEPS]
        digest_rows.append(
            {
                "project_id": project.id,
                "name": project.name,
                "category": project.category,
                "status": project.status,
                "next_action": project.next_action or "",
                "pending_steps": pending_steps,
                "updated_at": project.updated_at or "",
                "created_at": project.created_at or "",
            }
        )

    digest_rows.sort(
        key=lambda item: str(item["updated_at"] or item["created_at"] or ""),
        reverse=True,
    )
    digest_rows.sort(key=lambda item: len(item["pending_steps"]), reverse=True)
    digest_rows.sort(key=lambda item: 0 if item["next_action"] else 1)
    top_projects = digest_rows[:MAX_DIGEST_PROJECTS]

    return {
        "projects": [
            {
                "project_id": project["project_id"],
                "name": project["name"],
                "category": project["category"],
                "status": project["status"],
                "next_action": project["next_action"],
                "pending_steps": project["pending_steps"],
            }
            for project in top_projects
        ],
        "count": len(top_projects),
    }


def _build_coach_message(daily_plan: Dict[str, Any], project_digest: Dict[str, Any]) -> str:
    created_count = int(daily_plan.get("created_count") or 0)
    project_names = [
        str(project.get("name") or "").strip()
        for project in project_digest.get("projects", [])
        if isinstance(project, dict)
    ]
    project_names = [name for name in project_names if name]

    if project_names:
        highlighted = " / ".join(project_names[:3])
        return f"已为今天重排 {created_count} 条待办，当前优先推进：{highlighted}。"

    return f"已为今天重排 {created_count} 条待办，当前没有可汇总的项目下一步。"


def prepare_workbench(
    db: Session,
    *,
    current_user_id: str,
    date_key: str,
    max_items: Optional[int],
    model: str,
    thinking: str,
    agent: str,
    base_url: Optional[str],
    auth_token: Optional[str],
) -> Dict[str, Any]:
    normalized_date_key = validate_date_key(date_key)
    daily_plan = refresh_today_plan(
        db,
        current_user_id=current_user_id,
        date_key=normalized_date_key,
        max_items=max_items,
        model=model,
        thinking=thinking,
        agent=agent,
        base_url=base_url,
        auth_token=auth_token,
    )
    project_digest = build_project_digest(db, current_user_id)

    return {
        "success": True,
        "date_key": normalized_date_key,
        "daily_plan": daily_plan,
        "project_digest": project_digest,
        "coach_message": _build_coach_message(daily_plan, project_digest),
        "provider": "openclaw",
    }
