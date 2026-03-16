# OpenClaw Daily Plan Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real `/api/ai/coach/today` + `/api/ai/coach/today/plan` flow that lets Dashboard and OpenClaw refresh the current user's daily AI todos without touching manual or project todos.

**Architecture:** Extend the todo model with explicit source/batch/date markers, add a focused backend daily-plan service that serializes refreshes per user and writes `ai_daily` batches transactionally, expose the service through real coach routes, wire a dedicated OpenClaw plugin tool to the new backend endpoint, and update Dashboard to use the real coach endpoints with a caller-supplied `date_key`.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, React 19, TypeScript, node:test, unittest

---

## Chunk 1: Todo Model and Backend Test Harness

### Task 1: Add todo source metadata and red tests for safe refresh boundaries

**Files:**
- Modify: `backend/models.py`
- Modify: `backend/database.py`
- Create: `backend/tests/test_ai_coach_plan.py`
- Reference: `backend/workbench_routes.py`

- [ ] Step 1: Create `backend/tests/test_ai_coach_plan.py` with failing tests for:
  - history todos backfill to `manual`,
  - non-coach todo creation defaults to `manual`,
  - refresh only deletes current-user incomplete `ai_daily` for one `date_key`,
  - completed `ai_daily`, `manual`, and `project` todos survive refresh,
  - empty validated plan does not delete old todos,
  - concurrent refresh returns `409`.
- [ ] Step 2: Run `backend/.venv/bin/python -m unittest backend.tests.test_ai_coach_plan`.
  Expected: fail because todo metadata / coach service do not exist yet.
- [ ] Step 3: Add `source`, `plan_batch_id`, and `plan_date` to `backend/models.py` with DB-safe defaults (`source="manual"`).
- [ ] Step 4: Extend `run_legacy_cleanup_migrations()` in `backend/database.py` so existing `todo_items` tables gain missing columns and existing rows are backfilled to `source='manual'`, `plan_batch_id=NULL`, `plan_date=NULL`.
- [ ] Step 5: Update non-coach creation paths in `backend/workbench_routes.py` so created todos explicitly serialize `source`, `plan_batch_id`, and `plan_date` and default to manual-safe values.
- [ ] Step 6: Re-run `backend/.venv/bin/python -m unittest backend.tests.test_ai_coach_plan`.
  Expected: still fail, now because coach routes/service are missing.

## Chunk 2: Backend Daily-Plan Service and Coach Routes

### Task 2: Implement daily-plan refresh service behind real coach endpoints

**Files:**
- Create: `backend/ai_coach_service.py`
- Modify: `backend/ai_routes.py`
- Modify: `backend/tests/test_ai_coach_plan.py`
- Reference: `backend/openclaw_bridge.py`
- Reference: `backend/main.py`

- [ ] Step 1: In `backend/tests/test_ai_coach_plan.py`, add or refine failing tests for:
  - `GET /api/ai/coach/today?date_key=...` returns `success: true` and Dashboard-shaped `suggestions`,
  - `POST /api/ai/coach/today/plan` requires `date_key`,
  - legal-but-empty plans fail without deleting old `ai_daily`,
  - latest batch selection drives `GET /today` suggestions.
- [ ] Step 2: Run `backend/.venv/bin/python -m unittest backend.tests.test_ai_coach_plan`.
  Expected: fail on missing route/service behavior.
- [ ] Step 3: Create `backend/ai_coach_service.py` with focused helpers for:
  - per-user refresh locking,
  - context collection,
  - OpenClaw prompt creation,
  - validated JSON parsing,
  - active batch lookup,
  - transactional refresh write path.
- [ ] Step 4: Keep all coach queries and deletes explicitly filtered by `current_user_id`.
- [ ] Step 5: Reuse `run_openclaw_agent` from `backend/openclaw_bridge.py` to request structured JSON and reject invalid or empty plans before any delete.
- [ ] Step 6: Wire `GET /api/ai/coach/today` and `POST /api/ai/coach/today/plan` in `backend/ai_routes.py`, keeping the existing `success` wrapper and `created_count` / `skipped_count` response fields expected by Dashboard.
- [ ] Step 7: Re-run `backend/.venv/bin/python -m unittest backend.tests.test_ai_coach_plan`.
  Expected: pass.

## Chunk 3: OpenClaw Plugin Tooling

### Task 3: Add a dedicated daily-plan refresh tool

**Files:**
- Modify: `openclaw-vibelife-plugin/index.js`
- Modify: `openclaw-vibelife-plugin/test/tools.test.mjs`

- [ ] Step 1: Add a failing `node:test` case in `openclaw-vibelife-plugin/test/tools.test.mjs` asserting:
  - `vibelife_daily_plan_refresh` is registered,
  - it posts to `/api/ai/coach/today/plan`,
  - it forwards `maxItems` as `max_items`,
  - it forwards a caller-local `date_key`.
- [ ] Step 2: Run `node --test openclaw-vibelife-plugin/test/tools.test.mjs`.
  Expected: fail because the tool is missing.
- [ ] Step 3: Register `vibelife_daily_plan_refresh` in `openclaw-vibelife-plugin/index.js` with a minimal parameter surface and no direct todo delete/create logic.
- [ ] Step 4: Re-run `node --test openclaw-vibelife-plugin/test/tools.test.mjs`.
  Expected: pass.

## Chunk 4: Dashboard Wiring

### Task 4: Replace Dashboard fallback coach behavior with real coach endpoints

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/pages/dashboardCoachData.ts`
- Test: `frontend/tests/dashboardCoachData.test.mjs`
- Reference: `frontend/src/utils/workbenchTodoEvents.ts`

- [ ] Step 1: Add or refine a failing `node:test` case in `frontend/tests/dashboardCoachData.test.mjs` for current-batch suggestion normalization if needed.
- [ ] Step 2: Run `node --test frontend/tests/dashboardCoachData.test.mjs`.
  Expected: fail if normalization needs new defaults, or stay green if no helper change is required.
- [ ] Step 3: Remove the hardcoded `coachFeatureEnabled = false` behavior from `frontend/src/pages/Dashboard.tsx`.
- [ ] Step 4: Make Dashboard request `GET /ai/coach/today?date_key=${getTodayDateKey()}` and `POST /ai/coach/today/plan` with `date_key`.
- [ ] Step 5: After successful plan generation, refresh coach data and dispatch the workbench todo refresh event so TodayTodos reloads immediately.
- [ ] Step 6: Keep failure behavior non-destructive: toast only, no local mock overwrite.
- [ ] Step 7: Re-run `node --test frontend/tests/dashboardCoachData.test.mjs`.
  Expected: pass.

## Chunk 5: Cross-Slice Verification

### Task 5: Verify the whole daily-plan refresh slice and commit

**Files:**
- Verify: `backend/tests/test_ai_coach_plan.py`
- Verify: `openclaw-vibelife-plugin/test/tools.test.mjs`
- Verify: `frontend/tests/dashboardCoachData.test.mjs`

- [ ] Step 1: Run `backend/.venv/bin/python -m unittest backend.tests.test_ai_coach_plan`.
  Expected: pass.
- [ ] Step 2: Run `node --test openclaw-vibelife-plugin/test/tools.test.mjs frontend/tests/dashboardCoachData.test.mjs`.
  Expected: pass.
- [ ] Step 3: Run `cd frontend && npx tsc --noEmit`.
  Expected: exit 0.
- [ ] Step 4: Run `cd frontend && npm run build`.
  Expected: exit 0. Existing Vite warnings are acceptable only if exit code stays 0.
- [ ] Step 5: Commit the slice.
  Run:
  ```bash
  git add backend/models.py backend/database.py backend/ai_coach_service.py backend/ai_routes.py backend/workbench_routes.py backend/tests/test_ai_coach_plan.py openclaw-vibelife-plugin/index.js openclaw-vibelife-plugin/test/tools.test.mjs frontend/src/pages/Dashboard.tsx frontend/src/pages/dashboardCoachData.ts frontend/tests/dashboardCoachData.test.mjs docs/superpowers/specs/2026-03-16-openclaw-daily-plan-refresh-design.md docs/superpowers/plans/2026-03-16-openclaw-daily-plan-refresh.md
  git commit -m "feat: add openclaw daily plan refresh"
  ```
