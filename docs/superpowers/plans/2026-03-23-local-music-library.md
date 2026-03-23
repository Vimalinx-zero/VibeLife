# Local Music Library Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-scoped local music library with file/folder import, backend persistence, and Workbench playback integration.

**Architecture:** Introduce a new backend `MusicTrack` model plus music import/list/stream routes. Imported files are copied into a VibeLife-owned per-user directory. Frontend loads the user library into `MediaContext`, prefers it over the fallback remote catalog, and exposes file/folder import from the existing music player.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, React, TypeScript, HTMLAudioElement, Axios

---

## Chunk 1: Backend Music Library

### Task 1: Add the music model and route tests

**Files:**
- Create: `backend/tests/test_music_library.py`
- Modify: `backend/models.py`
- Modify: `backend/main.py`
- Create: `backend/music_routes.py`

- [ ] **Step 1: Write a failing backend API test for import + list + user isolation**
- [ ] **Step 2: Run `python -m unittest backend.tests.test_music_library` and confirm it fails**
- [ ] **Step 3: Add `MusicTrack` model and minimal music routes**
- [ ] **Step 4: Re-run `python -m unittest backend.tests.test_music_library` and make it pass**

### Task 2: Add secure stream support for audio playback

**Files:**
- Modify: `backend/music_routes.py`
- Test: `backend/tests/test_music_library.py`

- [ ] **Step 1: Extend the failing test to cover stream access and cross-user denial**
- [ ] **Step 2: Add `/api/music/files/{music_id}` with authenticated access**
- [ ] **Step 3: Allow bearer auth and query-token auth for audio element playback**
- [ ] **Step 4: Re-run `python -m unittest backend.tests.test_music_library`**

## Chunk 2: Frontend API and Media Context

### Task 3: Add frontend music library API client

**Files:**
- Modify: `frontend/src/utils/api.ts`

- [ ] **Step 1: Add music list/import types and API helpers**
- [ ] **Step 2: Keep request auth behavior consistent with existing axios setup**

### Task 4: Load user music into MediaContext

**Files:**
- Modify: `frontend/src/context/focusCompanionState.ts`
- Modify: `frontend/src/context/MediaContext.tsx`
- Test: `frontend/tests/focusCompanionState.test.mjs`

- [ ] **Step 1: Write or extend a failing frontend state test that fallback tracks remain available**
- [ ] **Step 2: Load the user library on startup and prefer it when non-empty**
- [ ] **Step 3: Build tokenized stream URLs for local playback**
- [ ] **Step 4: Re-run `node --test frontend/tests/focusCompanionState.test.mjs`**

## Chunk 3: Import UI

### Task 5: Add file and folder import to the player

**Files:**
- Modify: `frontend/src/components/MusicPlayer.tsx`

- [ ] **Step 1: Add `导入音乐` UI plus `选择文件夹` and `选择文件` actions**
- [ ] **Step 2: Wire hidden file inputs for multi-file and folder import**
- [ ] **Step 3: Refresh the in-memory library after successful import**
- [ ] **Step 4: Keep the existing visual style and playlist behavior intact**

## Chunk 4: Verification

### Task 6: Verify end to end

**Files:**
- Modify as needed: current branch changes only

- [ ] **Step 1: Run `python -m unittest backend.tests.test_music_library`**
- [ ] **Step 2: Run `node --test frontend/tests/focusCompanionState.test.mjs frontend/tests/pomodoroState.test.mjs`**
- [ ] **Step 3: Run `cd frontend && npx tsc --noEmit`**
- [ ] **Step 4: Run `cd frontend && npm run build`**
- [ ] **Step 5: Open Workbench and manually verify import and playback**
