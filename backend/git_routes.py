from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user_id
import subprocess
from pathlib import Path


router = APIRouter(prefix="/api/git", tags=["git"])

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_PATH = REPO_ROOT / "frontend"


class GitCommitRequest(BaseModel):
    message: str


def run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        err = result.stderr.strip() or result.stdout.strip() or "git command failed"
        raise HTTPException(status_code=500, detail=err)
    return result.stdout


def ensure_git_ready() -> None:
    if not (REPO_ROOT / ".git").exists():
        raise HTTPException(status_code=500, detail="Repository not found")
    if not FRONTEND_PATH.exists():
        raise HTTPException(status_code=500, detail="Frontend directory not found")


@router.get("/status")
async def get_git_status(current_user_id: str = Depends(get_current_user_id)):
    del current_user_id
    ensure_git_ready()

    branch = run_git(["rev-parse", "--abbrev-ref", "HEAD"]).strip()
    porcelain = run_git(["status", "--porcelain", "--", "frontend"])

    files = []
    for line in porcelain.splitlines():
        if not line.strip():
            continue
        status = line[:2].strip()
        path = line[3:].strip()
        files.append({"status": status, "path": path})

    return {
        "branch": branch,
        "has_changes": len(files) > 0,
        "files": files,
    }


@router.get("/diff")
async def get_git_diff(current_user_id: str = Depends(get_current_user_id)):
    del current_user_id
    ensure_git_ready()

    unstaged = run_git(["diff", "--", "frontend"])
    staged = run_git(["diff", "--staged", "--", "frontend"])

    return {
        "unstaged": unstaged,
        "staged": staged,
    }


@router.get("/log")
async def get_git_log(current_user_id: str = Depends(get_current_user_id)):
    del current_user_id
    ensure_git_ready()

    raw = run_git(
        [
            "log",
            "-n",
            "20",
            "--pretty=format:%h%x09%s%x09%an%x09%ad",
            "--date=short",
            "--",
            "frontend",
        ]
    )

    commits = []
    for line in raw.splitlines():
        parts = line.split("\t")
        if len(parts) < 4:
            continue
        commits.append(
            {
                "hash": parts[0],
                "message": parts[1],
                "author": parts[2],
                "date": parts[3],
            }
        )

    return {"commits": commits}


@router.post("/commit")
async def create_git_commit(
    payload: GitCommitRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    del current_user_id
    ensure_git_ready()

    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Commit message is required")

    run_git(["add", "--", "frontend"])

    status_after_add = run_git(["status", "--porcelain", "--", "frontend"]).strip()
    if not status_after_add:
        raise HTTPException(status_code=400, detail="No frontend changes to commit")

    run_git(["commit", "-m", message])
    commit_hash = run_git(["rev-parse", "--short", "HEAD"]).strip()

    return {
        "success": True,
        "commit_hash": commit_hash,
        "message": message,
    }
