# Workbench Project Panel AI Effects Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the workbench project panel so OpenClaw chat returns structured AI receipts, the right-side chat shows what changed, and the left-side real panels refresh precisely for todos and project insights.

**Architecture:** Keep the existing `/api/ai/chat` entrypoint and `WorkbenchProjectPanel` layout. Add a backend normalization layer that preserves OpenClaw structured payloads and converts them into a stable frontend contract: `reply`, top-level `provider`, `effects`, `refreshHints`, and `runMeta`. On the frontend, extend persisted assistant messages with optional receipt metadata, refresh only the real panels that were actually affected, and derive the local-only `代理状态总览` from the active session’s latest assistant run.

**Tech Stack:** FastAPI, Python `unittest`, React 19, TypeScript, node:test, Vite, existing OpenClaw bridge and VibeLife todo/project APIs

---

## Planned File Map

- `backend/openclaw_bridge.py`
  Preserve structured OpenClaw payloads alongside the existing text reply path.
- `backend/ai_routes.py`
  Normalize approved VibeLife write-tool payloads into the stable `/api/ai/chat` response contract.
- `backend/tests/test_openclaw_bridge.py`
  Cover bridge-level payload preservation.
- `backend/tests/test_ai_chat_effects.py`
  Cover `/api/ai/chat` success, partial, empty-effects, and 502 fallback semantics.
- `backend/project_routes.py`
  Add `createdAt` and `updatedAt` to `/api/projects` list responses.
- `backend/tests/test_project_create.py`
  Extend list-response assertions so the new project insight sort inputs are guaranteed by the API contract.
- `frontend/src/pages/workbenchProjectPanelEffectsState.ts`
  New pure helpers for effect summaries, refresh result labels, active-session run status, and project insight derivation.
- `frontend/tests/workbenchProjectPanelEffectsState.test.mjs`
  Cover backward compatibility, receipt formatting, refresh result wording, and insight ordering/counts.
- `frontend/src/pages/workbenchProjectPanelState.ts`
  Extend persisted assistant message metadata while keeping old localStorage payloads readable.
- `frontend/tests/workbenchProjectPanelState.test.mjs`
  Cover persistence migration and latest-run lookup in the active session.
- `frontend/src/utils/api.ts`
  Type the richer `/api/ai/chat` response.
- `frontend/src/components/WorkbenchProjectPanel.tsx`
  Integrate structured receipts, precise refreshes, real project insights, and local run status UI.

## Chunk 1: Backend Chat Effect Contract

### Task 1: Preserve OpenClaw payloads and normalize `/api/ai/chat`

**Files:**
- Modify: `backend/openclaw_bridge.py`
- Modify: `backend/ai_routes.py`
- Modify: `backend/tests/test_openclaw_bridge.py`
- Create: `backend/tests/test_ai_chat_effects.py`

- [ ] **Step 1: Write the failing bridge tests**

Extend `backend/tests/test_openclaw_bridge.py` with fixtures that simulate OpenClaw responses containing successful VibeLife tool payloads and assert the bridge keeps structured payload data instead of collapsing everything to plain text.

- [ ] **Step 2: Run the bridge test to verify it fails**

Run:
```bash
cd backend
python -m unittest discover -s tests -p 'test_openclaw_bridge.py'
```
Expected: FAIL because the bridge does not yet expose the structured payload collection needed downstream.

- [ ] **Step 3: Implement minimal bridge structure**

Update `backend/openclaw_bridge.py` so the chat execution path returns a structured object that includes at minimum:
- `reply`
- `raw_payloads`
- `parsed`

Keep the existing plain-text extraction behavior intact for callers that still only need text.

- [ ] **Step 4: Write the failing route tests**

Create `backend/tests/test_ai_chat_effects.py` to cover these exact route semantics:
- recognized VibeLife write payloads produce `reply`, top-level `provider`, `effects`, `refreshHints`, and `runMeta`
- `effects` rows always use `{ entity, action, count, ids?, summary }`
- first-pass `entity` values are only `todo`, `project`, `project_step`
- first-pass `action` values are only `create`, `update`, `delete`, `clear`
- `refreshHints` are deduped and fixed-order: `todo`, then `insights`
- any `todo/*` effect yields `todo`
- any `project/*` or `project_step/*` effect yields `insights`
- plain chat replies with no recognized write action return HTTP `200` with empty `effects` and empty `refreshHints`
- usable `reply` plus failed or partial extraction returns HTTP `200` with `runMeta.outcome = "partial"`
- no usable `reply` and no fallback reply returns HTTP `502`
- successful `/api/ai/chat` responses never emit `runMeta.outcome = "failed"`

- [ ] **Step 5: Run the route tests to verify they fail**

Run:
```bash
cd backend
python -m unittest discover -s tests -p 'test_ai_chat_effects.py'
```
Expected: FAIL because `/api/ai/chat` does not yet expose the normalized effect contract.

- [ ] **Step 6: Implement exact effect normalization**

Update `backend/ai_routes.py` so `/api/ai/chat`:
- keeps top-level `provider` as the only provider field
- emits `runMeta = { executedAt, outcome }`
- uses `runMeta.outcome = "success"` when reply generation succeeds and effects are either extracted or explicitly empty
- uses `runMeta.outcome = "partial"` when a usable reply exists but effect extraction is incomplete
- never includes `status` in `refreshHints`
- does not normalize note-related or other non-visible domains in this first pass

- [ ] **Step 7: Run focused backend tests to verify they pass**

Run:
```bash
cd backend
python -m unittest discover -s tests -p 'test_openclaw_bridge.py'
python -m unittest discover -s tests -p 'test_ai_chat_effects.py'
```
Expected: PASS.

- [ ] **Step 8: Commit the backend contract slice**

Run:
```bash
git add backend/openclaw_bridge.py backend/ai_routes.py backend/tests/test_openclaw_bridge.py backend/tests/test_ai_chat_effects.py
git commit -m "feat: normalize ai chat effects"
```

## Chunk 2: Project Insight Data Contract

### Task 2: Guarantee the data needed for real `项目洞察`

**Files:**
- Modify: `backend/project_routes.py`
- Modify: `backend/tests/test_project_create.py`
- Create: `frontend/src/pages/workbenchProjectPanelEffectsState.ts`
- Create: `frontend/tests/workbenchProjectPanelEffectsState.test.mjs`

- [ ] **Step 1: Write the failing backend list-response test**

Extend `backend/tests/test_project_create.py` so `/api/projects` list items are required to include:
- `createdAt`
- `updatedAt`

Use the existing list-response test rather than creating a separate redundant backend suite.

- [ ] **Step 2: Run the backend project test to verify it fails**

Run:
```bash
cd backend
python -m unittest discover -s tests -p 'test_project_create.py'
```
Expected: FAIL because the list response currently omits `createdAt` and `updatedAt`.

- [ ] **Step 3: Add the missing project list fields**

Update `backend/project_routes.py` so `/api/projects` list items include `createdAt` and `updatedAt` without changing unrelated payload semantics.

- [ ] **Step 4: Write the failing frontend helper tests**

Create `frontend/tests/workbenchProjectPanelEffectsState.test.mjs` to cover:
- old stored assistant messages without receipt metadata stay backward-compatible
- latest active-session run status is derived from the newest assistant message with `runMeta`
- effect summary text is deterministic
- refresh result labels report actual results, not attempted refreshes
- project insight counts use the approved rules:
  - active projects = total `/api/projects` items
  - attention count = status exactly `需关注` or `有阻塞`
  - incomplete step count = steps where `done !== true`
- top 5 project ordering uses:
  1. has `nextAction`
  2. status weight (`有阻塞` = 2, `需关注` = 1, `正常推进` = 0, unknown = 0)
  3. incomplete step count descending
  4. `updatedAt`

- [ ] **Step 5: Run the helper tests to verify they fail**

Run:
```bash
node --test frontend/tests/workbenchProjectPanelEffectsState.test.mjs
```
Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 6: Implement the pure insight/effect helpers**

Create `frontend/src/pages/workbenchProjectPanelEffectsState.ts` with pure functions for:
- parsing optional assistant receipt metadata
- deriving the latest active-session run status
- formatting `本次变更`
- formatting `刷新结果`
- deriving insight counts and prioritized project rows

- [ ] **Step 7: Run the backend and helper tests to verify they pass**

Run:
```bash
cd backend
python -m unittest discover -s tests -p 'test_project_create.py'
```

Run:
```bash
node --test frontend/tests/workbenchProjectPanelEffectsState.test.mjs
```
Expected: PASS.

- [ ] **Step 8: Commit the insight-state slice**

Run:
```bash
git add backend/project_routes.py backend/tests/test_project_create.py frontend/src/pages/workbenchProjectPanelEffectsState.ts frontend/tests/workbenchProjectPanelEffectsState.test.mjs
git commit -m "feat: add project panel effect helpers"
```

## Chunk 3: Frontend Session Metadata And Panel Integration

### Task 3: Persist receipts and wire the real project page behavior

**Files:**
- Modify: `frontend/src/pages/workbenchProjectPanelState.ts`
- Modify: `frontend/tests/workbenchProjectPanelState.test.mjs`
- Modify: `frontend/src/utils/api.ts`
- Modify: `frontend/src/components/WorkbenchProjectPanel.tsx`
- Reference: `frontend/src/pages/workbenchProjectPanelEffectsState.ts`

- [ ] **Step 1: Write the failing persistence test**

Extend `frontend/tests/workbenchProjectPanelState.test.mjs` so it verifies:
- assistant messages may optionally include `effects`, `refreshHints`, `runMeta`, and `refreshResults`
- older stored sessions without those fields still parse cleanly
- the latest assistant message with `runMeta` can be found in the active session

- [ ] **Step 2: Run the state test to verify it fails**

Run:
```bash
node --test frontend/tests/workbenchProjectPanelState.test.mjs
```
Expected: FAIL because the current message shape does not support receipt metadata.

- [ ] **Step 3: Extend persisted session state**

Update `frontend/src/pages/workbenchProjectPanelState.ts` so:
- assistant receipt metadata is optional
- serialization writes metadata only when present
- parsing remains backward-compatible with old localStorage data

- [ ] **Step 4: Type the richer AI response**

Update `frontend/src/utils/api.ts` so the workbench project panel can consume:
- `reply`
- `provider`
- `effects`
- `refreshHints`
- `runMeta`

Mirror the exact backend contract and keep unrelated API helpers untouched.

- [ ] **Step 5: Wire structured assistant messages into the component**

Update `frontend/src/components/WorkbenchProjectPanel.tsx` so assistant responses:
- store the structured metadata on the assistant message
- update the local-only `代理状态总览` from the active session’s latest assistant run
- refresh `我的Todo` only when `refreshHints` includes `todo`
- refresh `项目洞察` only when `refreshHints` includes `insights`
- record per-panel refresh success or failure as `refreshResults`
- keep the main reply visible even if a panel refresh fails

- [ ] **Step 6: Replace the approved placeholders with real content**

In `frontend/src/components/WorkbenchProjectPanel.tsx`:
- keep `我的Todo` grouping UI, only add precise refresh behavior
- replace `项目洞察` placeholder with the real summary panel from `/api/projects`
- replace `代理状态总览` placeholder with the active-session run summary
- leave `子代理任务进程` and `Git 面板` as explicit placeholders

- [ ] **Step 7: Add the assistant receipt block**

Render a receipt block under assistant bubbles only when metadata exists:
- `本次变更`
- `刷新结果`

The `刷新结果` line must describe actual outcomes, for example:
- `我的Todo 已刷新`
- `项目洞察 刷新失败`

Do not show a receipt block for plain chat replies with no structured action metadata.

- [ ] **Step 8: Run focused frontend verification**

Run:
```bash
node --test frontend/tests/workbenchProjectPanelState.test.mjs frontend/tests/workbenchProjectPanelEffectsState.test.mjs
```

Run:
```bash
cd frontend
npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 9: Commit the frontend integration slice**

Run:
```bash
git add frontend/src/pages/workbenchProjectPanelState.ts frontend/tests/workbenchProjectPanelState.test.mjs frontend/src/utils/api.ts frontend/src/components/WorkbenchProjectPanel.tsx frontend/src/pages/workbenchProjectPanelEffectsState.ts frontend/tests/workbenchProjectPanelEffectsState.test.mjs
git commit -m "feat: add project panel ai receipts"
```

## Chunk 4: Verification And Handoff

### Task 4: Prove the page behaves correctly end to end

**Files:**
- Verify: `backend/openclaw_bridge.py`
- Verify: `backend/ai_routes.py`
- Verify: `backend/project_routes.py`
- Verify: `frontend/src/components/WorkbenchProjectPanel.tsx`

- [ ] **Step 1: Run automated verification**

Run:
```bash
cd backend
python -m unittest discover -s tests -p 'test_*.py'
```

Run:
```bash
node --test frontend/tests/workbenchProjectPanelState.test.mjs frontend/tests/workbenchProjectPanelEffectsState.test.mjs
```

Run:
```bash
cd frontend
npx tsc --noEmit
npm run build
```
Expected: PASS.

- [ ] **Step 2: Manual browser acceptance on the running app**

Verify:
- normal chat with no write action does not refresh `我的Todo` or `项目洞察`
- todo writes refresh `我的Todo` and show a receipt
- project or step writes refresh `项目洞察` and show a receipt
- `代理状态总览` follows the active session, not the global last run
- `刷新结果` reflects success or failure per panel
- `子代理任务进程` and `Git 面板` remain honest placeholders

- [ ] **Step 3: Commit the fully verified slice**

Run:
```bash
git add backend/openclaw_bridge.py backend/ai_routes.py backend/project_routes.py backend/tests/test_openclaw_bridge.py backend/tests/test_ai_chat_effects.py backend/tests/test_project_create.py frontend/src/pages/workbenchProjectPanelState.ts frontend/tests/workbenchProjectPanelState.test.mjs frontend/src/pages/workbenchProjectPanelEffectsState.ts frontend/tests/workbenchProjectPanelEffectsState.test.mjs frontend/src/utils/api.ts frontend/src/components/WorkbenchProjectPanel.tsx docs/superpowers/plans/2026-03-18-workbench-project-panel-ai-effects.md
git commit -m "feat: refresh project panel from ai effects"
```
