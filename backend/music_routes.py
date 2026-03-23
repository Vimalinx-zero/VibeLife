from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import uuid4
import os

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from auth import decode_access_token, get_current_user_id
from database import get_db
import models

router = APIRouter(prefix="/api/music", tags=["music"])

ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".m4a", ".wav", ".ogg", ".flac"}
ALLOWED_AUDIO_MIME_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/flac",
    "audio/x-flac",
    "audio/ogg",
    "audio/mp4",
    "audio/x-m4a",
}
MAX_AUDIO_FILE_SIZE_BYTES = 50 * 1024 * 1024


def get_music_storage_root() -> Path:
    configured = os.getenv("VIBELIFE_MUSIC_STORAGE_ROOT", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()

    return (Path(__file__).resolve().parent / "uploads" / "music").resolve()


def get_user_music_dir(user_id: str) -> Path:
    return get_music_storage_root() / user_id


def serialize_music_track(track: models.MusicTrack) -> dict:
    return {
        "id": track.id,
        "user_id": track.user_id,
        "title": track.title,
        "artist": track.artist,
        "album": track.album,
        "duration_seconds": track.duration_seconds,
        "mime_type": track.mime_type,
        "file_size": track.file_size,
        "stored_filename": track.stored_filename,
        "original_filename": track.original_filename,
        "source_kind": track.source_kind,
        "stream_path": f"/api/music/files/{track.id}",
        "created_at": track.created_at,
        "updated_at": track.updated_at,
    }


def validate_audio_upload(upload_file: UploadFile) -> tuple[str, str]:
    original_filename = (upload_file.filename or "").strip()
    if not original_filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")

    suffix = Path(original_filename).suffix.lower()
    if suffix not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"不支持的音频格式: {suffix or 'unknown'}")

    content_type = (upload_file.content_type or "").strip().lower()
    if content_type and content_type not in ALLOWED_AUDIO_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"不支持的音频 MIME: {content_type}")

    normalized_mime = content_type or "application/octet-stream"
    return original_filename, normalized_mime


def resolve_music_user_id(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
) -> str:
    if authorization and authorization.startswith("Bearer "):
        bearer_token = authorization.split(" ", 1)[1].strip()
        user_id = decode_access_token(bearer_token)
        if user_id:
            return user_id

    if token:
        user_id = decode_access_token(token)
        if user_id:
            return user_id

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.get("/library")
async def list_music_library(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    tracks = (
        db.query(models.MusicTrack)
        .filter(models.MusicTrack.user_id == current_user_id)
        .order_by(models.MusicTrack.created_at.asc())
        .all()
    )
    return {"tracks": [serialize_music_track(track) for track in tracks]}


@router.post("/import")
async def import_music_files(
    files: list[UploadFile] = File(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if not files:
        raise HTTPException(status_code=400, detail="至少上传一个音频文件")

    user_music_dir = get_user_music_dir(current_user_id)
    user_music_dir.mkdir(parents=True, exist_ok=True)

    created_tracks: list[models.MusicTrack] = []

    for upload_file in files:
        original_filename, mime_type = validate_audio_upload(upload_file)
        title = Path(original_filename).stem.strip() or original_filename
        track_id = f"music_{uuid4().hex}"
        suffix = Path(original_filename).suffix.lower()
        stored_filename = f"{track_id}{suffix}"
        stored_path = user_music_dir / stored_filename

        size_written = 0
        with stored_path.open("wb") as handle:
            while True:
                chunk = await upload_file.read(1024 * 1024)
                if not chunk:
                    break
                size_written += len(chunk)
                if size_written > MAX_AUDIO_FILE_SIZE_BYTES:
                    handle.close()
                    stored_path.unlink(missing_ok=True)
                    raise HTTPException(status_code=400, detail="音频文件过大")
                handle.write(chunk)

        await upload_file.close()

        created_at = datetime.utcnow().isoformat()
        track = models.MusicTrack(
            id=track_id,
            user_id=current_user_id,
            title=title,
            artist="",
            album="",
            duration_seconds=None,
            mime_type=mime_type,
            file_size=size_written,
            stored_filename=stored_filename,
            stored_path=str(stored_path),
            original_filename=original_filename,
            source_kind="imported",
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(track)
        created_tracks.append(track)

    db.commit()
    for track in created_tracks:
        db.refresh(track)

    return {"tracks": [serialize_music_track(track) for track in created_tracks]}


@router.get("/files/{music_id}")
async def stream_music_file(
    music_id: str,
    current_user_id: str = Depends(resolve_music_user_id),
    db: Session = Depends(get_db),
):
    track = (
        db.query(models.MusicTrack)
        .filter(
            models.MusicTrack.id == music_id,
            models.MusicTrack.user_id == current_user_id,
        )
        .first()
    )
    if track is None:
        raise HTTPException(status_code=404, detail="Music track not found")

    file_path = Path(track.stored_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Music file missing on disk")

    return FileResponse(
        file_path,
        media_type=track.mime_type,
        filename=track.original_filename,
    )
