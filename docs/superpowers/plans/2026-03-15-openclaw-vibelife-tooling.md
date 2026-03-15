# OpenClaw VibeLife Tooling Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining OpenClaw-to-VibeLife project-management gap and remove plugin tools that point at non-existent endpoints.

**Architecture:** Keep the change narrow. Extend the existing authenticated FastAPI project router with a single project-create endpoint, then update the OpenClaw plugin registry to expose only live VibeLife capabilities. Verify with one backend integration test, one plugin registry/handler test, and a live authenticated smoke pass.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, Node.js ESM, OpenClaw plugin tool registry

---

## Chunk 1: Tests First

### Task 1: Backend project creation test

**Files:**
- Modify or create: `backend/tests/test_project_create.py`
- Modify: none

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the test and confirm `POST /api/projects` is missing or fails**
- [ ] **Step 3: Implement the minimal backend route**
- [ ] **Step 4: Re-run the test until it passes**

### Task 2: Plugin registry/handler test

**Files:**
- Modify or create: `openclaw-vibelife-plugin/test/tools.test.mjs`
- Modify: none

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run `node --test` and confirm the new tool is absent / dead tools are still present**
- [ ] **Step 3: Implement the minimal plugin changes**
- [ ] **Step 4: Re-run `node --test` until it passes**

## Chunk 2: Implementation

### Task 3: Backend route

**Files:**
- Modify: `backend/project_routes.py`

- [ ] Add `ProjectCreate`
- [ ] Add `POST /api/projects`
- [ ] Preserve user isolation and existing response conventions

### Task 4: Plugin cleanup

**Files:**
- Modify: `openclaw-vibelife-plugin/index.js`

- [ ] Add `vibelife_project_create`
- [ ] Remove dead `study` / `pomodoro` tool registrations
- [ ] Keep existing tool naming and request helper patterns

## Chunk 3: Verification

### Task 5: Automated verification

**Files:**
- Modify: none

- [ ] Run `python -m unittest backend.tests.test_project_create`
- [ ] Run `node --test openclaw-vibelife-plugin/test/tools.test.mjs`
- [ ] Run `python -m py_compile backend/project_routes.py`
- [ ] Run `node --check openclaw-vibelife-plugin/index.js`

### Task 6: Live smoke validation

**Files:**
- Modify: none

- [ ] Obtain an auth token from the running backend
- [ ] Exercise `POST /api/projects` and `GET /api/projects` with that token
- [ ] Confirm the live response shape matches the serialized project contract

### Task 7: Commit

**Files:**
- Modify: git metadata only

- [ ] Stage only files from this change set
- [ ] Commit with a focused message for the OpenClaw/VibeLife backend integration update
