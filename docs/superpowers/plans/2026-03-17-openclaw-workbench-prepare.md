# OpenClaw Workbench Prepare Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified `workbench prepare` action that refreshes today's AI todos and returns a current project-next-step digest through one OpenClaw-facing endpoint.

**Architecture:** Introduce a small backend service that reuses the existing daily-plan refresh logic, adds a read-only project digest, and exposes both through `POST /api/ai/workbench/prepare`. Keep the OpenClaw plugin thin by adding one dedicated tool that forwards to the backend endpoint without duplicating business logic.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, OpenClaw plugin, node:test, unittest

---

## Chunk 1: Backend Prepare Endpoint and Project Digest

### Task 1: Add failing backend tests for workbench prepare

**Files:**
- Create: `backend/tests/test_ai_workbench_prepare.py`
- Reference: `backend/tests/test_ai_coach_plan.py`
- Reference: `backend/ai_routes.py`

- [ ] Step 1: Create `backend/tests/test_ai_workbench_prepare.py` with failing tests for:
  - successful `POST /api/ai/workbench/prepare` returning `success`, `date_key`, `daily_plan`, `project_digest`, `coach_message`, and `provider`,
  - missing `date_key` returning `422`,
  - daily-plan refresh failure surfacing as a failed prepare response without mutating unrelated todos,
  - project digest including only the current user's projects and pending steps,
  - prepare not modifying project records.
- [ ] Step 2: Run `backend/.venv/bin/python -m unittest backend.tests.test_ai_workbench_prepare`.
  Expected: fail because the endpoint and service do not exist yet.

### Task 2: Implement the backend service and route

**Files:**
- Create: `backend/ai_workbench_service.py`
- Modify: `backend/ai_routes.py`
- Reference: `backend/ai_coach_service.py`
- Reference: `backend/project_routes.py`

- [ ] Step 1: Create `backend/ai_workbench_service.py` with focused helpers for:
  - validating `date_key`,
  - building a read-only sorted `project_digest`,
  - calling `refresh_today_plan(...)`,
  - composing a stable `coach_message`,
  - returning the final response shape.
- [ ] Step 2: Add a request model and `POST /api/ai/workbench/prepare` route in `backend/ai_routes.py`.
- [ ] Step 3: Keep route failure semantics strict:
  - validation errors return `422`,
  - upstream OpenClaw errors return `502`,
  - no partial success payload when either daily plan or project digest fails.
- [ ] Step 4: Re-run `backend/.venv/bin/python -m unittest backend.tests.test_ai_workbench_prepare`.
  Expected: pass.

## Chunk 2: Plugin Tool

### Task 3: Add a dedicated OpenClaw tool for workbench prepare

**Files:**
- Modify: `openclaw-vibelife-plugin/test/tools.test.mjs`
- Modify: `openclaw-vibelife-plugin/index.js`

- [ ] Step 1: Add a failing `node:test` case asserting:
  - `vibelife_workbench_prepare` is registered,
  - it posts to `/api/ai/workbench/prepare`,
  - it forwards `dateKey -> date_key`,
  - it forwards `maxItems -> max_items`.
- [ ] Step 2: Run `node --test openclaw-vibelife-plugin/test/tools.test.mjs`.
  Expected: fail because the tool is missing.
- [ ] Step 3: Register `vibelife_workbench_prepare` in `openclaw-vibelife-plugin/index.js` with the same thin-wrapper pattern as `vibelife_daily_plan_refresh`.
- [ ] Step 4: Re-run `node --test openclaw-vibelife-plugin/test/tools.test.mjs`.
  Expected: pass.

## Chunk 3: Optional Prompt Preference Guard

### Task 4: Add a minimal prompt hint so OpenClaw prefers the unified tool

**Files:**
- Modify: `backend/openclaw_bridge.py`

- [ ] Step 1: Add one minimal guidance line in `build_vibelife_chat_prompt(...)` telling OpenClaw to prefer the unified workbench-prepare tool for “准备工作台 / 安排今天开工 / 回来开始干活” style requests.
- [ ] Step 2: Keep the change minimal; do not hard-code business logic into the prompt.

## Chunk 4: Verification and Commit

### Task 5: Verify the slice and commit

**Files:**
- Verify: `backend/tests/test_ai_workbench_prepare.py`
- Verify: `openclaw-vibelife-plugin/test/tools.test.mjs`

- [ ] Step 1: Run `backend/.venv/bin/python -m unittest backend.tests.test_ai_workbench_prepare`.
  Expected: pass.
- [ ] Step 2: Run `node --test openclaw-vibelife-plugin/test/tools.test.mjs`.
  Expected: pass.
- [ ] Step 3: Run `cd frontend && npx tsc --noEmit`.
  Expected: exit 0.
- [ ] Step 4: Run `cd frontend && npm run build`.
  Expected: exit 0. Existing Vite dependency warnings are acceptable if exit code stays 0.
- [ ] Step 5: Commit the slice.
  Run:
  ```bash
  git add backend/ai_workbench_service.py backend/ai_routes.py backend/openclaw_bridge.py backend/tests/test_ai_workbench_prepare.py openclaw-vibelife-plugin/index.js openclaw-vibelife-plugin/test/tools.test.mjs docs/superpowers/specs/2026-03-17-openclaw-workbench-prepare-design.md docs/superpowers/plans/2026-03-17-openclaw-workbench-prepare.md
  git commit -m "feat: add openclaw workbench prepare"
  ```
