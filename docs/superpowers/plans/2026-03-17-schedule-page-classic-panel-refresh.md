# Schedule Page Classic Panel Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the schedule page into a tighter left calendar plus a classic right-side panel with selected-day schedule and interactive today-todo list, while making OpenClaw updates refresh schedule-page data in place without a full page reload.

**Architecture:** Keep the existing schedule route and data APIs, but tighten the page layout and move the right-hand information hierarchy to “selected day -> today todos -> collapsed manual add”. Add one small shared `workbench-data-refresh` event so `AIChatWidget` can notify schedule-page listeners to reload only current-month schedule data, while todos continue using the existing todo refresh event.

**Tech Stack:** React 19, TypeScript, Vite, existing workbench API client, node:test, existing frontend build/typecheck

---

## Chunk 1: Shared Refresh Event Contract

### Task 1: Extend the shared refresh-event utility

**Files:**
- Modify: `frontend/src/utils/workbenchTodoEvents.ts`
- Modify: `frontend/tests/workbenchTodoEvents.test.mjs`

- [ ] **Step 1: Write the failing test**

Add a failing `node:test` case in `frontend/tests/workbenchTodoEvents.test.mjs` that verifies:
- a new `WORKBENCH_DATA_REFRESH_EVENT` constant exists,
- `dispatchWorkbenchDataRefresh(target)` emits that event on any `EventTarget`,
- the existing todo refresh behavior still works.

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
node --test frontend/tests/workbenchTodoEvents.test.mjs
```
Expected: FAIL because the new event constant and dispatcher do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Update `frontend/src/utils/workbenchTodoEvents.ts` to export:
- `WORKBENCH_TODOS_REFRESH_EVENT` unchanged,
- new `WORKBENCH_DATA_REFRESH_EVENT`,
- `dispatchWorkbenchTodosRefresh(...)` unchanged,
- new `dispatchWorkbenchDataRefresh(...)`.

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
node --test frontend/tests/workbenchTodoEvents.test.mjs
```
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
```bash
git add frontend/src/utils/workbenchTodoEvents.ts frontend/tests/workbenchTodoEvents.test.mjs
git commit -m "feat: add shared workbench data refresh event"
```

### Task 2: Emit both refresh events after successful OpenClaw chat

**Files:**
- Modify: `frontend/src/components/AIChatWidget.tsx`
- Reference: `frontend/src/utils/workbenchTodoEvents.ts`

- [ ] **Step 1: Add the new refresh import**

Import `dispatchWorkbenchDataRefresh` beside the existing todo refresh dispatcher.

- [ ] **Step 2: Update the OpenClaw success path**

In the successful chat response branch of `handleSend`, dispatch:
- `dispatchWorkbenchTodosRefresh()`
- `dispatchWorkbenchDataRefresh()`

Keep all existing toast behavior, session updates, and failure handling unchanged.

- [ ] **Step 3: Run targeted verification**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

Run:
```bash
git add frontend/src/components/AIChatWidget.tsx
git commit -m "feat: emit schedule data refresh after ai chat"
```

## Chunk 2: Schedule Page Layout and In-Place Refresh

### Task 3: Make TodayTodos reusable for the schedule-side panel

**Files:**
- Modify: `frontend/src/components/TodayTodos.tsx`
- Reference: `frontend/src/utils/workbenchApi.ts`

- [ ] **Step 1: Write the failing test target**

Before editing, define the prop surface and expected behavior:
- configurable visible item count,
- optional class hooks or variant to fit the schedule-side panel,
- preserve existing interactions (add, toggle, delete),
- default behavior remains unchanged for dashboard usage.

Use a red-green change on TypeScript/build verification rather than adding a new UI test harness.

- [ ] **Step 2: Implement minimal parameterization**

Update `frontend/src/components/TodayTodos.tsx` to support schedule-page reuse with minimal new props, for example:
- `maxVisible?: number`
- `title?: string`
- `description?: string`
- `variant?: "dashboard" | "schedule"`

Keep dashboard defaults identical to current behavior.

- [ ] **Step 3: Re-run frontend verification**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4: Commit**

Run:
```bash
git add frontend/src/components/TodayTodos.tsx
git commit -m "feat: parameterize today todos for schedule panel"
```

### Task 4: Rebuild SchedulePage into the approved classic panel layout

**Files:**
- Modify: `frontend/src/pages/SchedulePage.tsx`
- Modify: `frontend/src/components/TodayTodos.tsx` (only if needed from Task 3)
- Reference: `frontend/src/utils/workbenchTodoEvents.ts`

- [ ] **Step 1: Tighten the calendar grid**

Update the left calendar area in `frontend/src/pages/SchedulePage.tsx` to:
- reduce day-cell padding and spacing,
- slightly reduce date/event text sizes,
- keep up to two short event summaries visible,
- preserve current month navigation, selected date behavior, and detail popup behavior.

- [ ] **Step 2: Restructure the right panel**

Reorder the right panel to:
1. selected date heading,
2. selected-day schedule list,
3. interactive `TodayTodos` schedule variant,
4. collapsible “手动添加进程” section (collapsed by default),
5. event type legend.

Keep the panel as a single scrollable column.

- [ ] **Step 3: Make manual-add state collapsible and durable**

Add local UI state in `frontend/src/pages/SchedulePage.tsx` so:
- the manual-add panel is collapsed by default,
- toggle open/close does not clear draft title/time/description/type,
- successful add still resets fields and refreshes current-month events.

- [ ] **Step 4: Add in-place schedule refresh listener**

In `frontend/src/pages/SchedulePage.tsx`, listen for `WORKBENCH_DATA_REFRESH_EVENT` and on receipt:
- reload current-month events only,
- derive the right-side selected-day schedule from refreshed month data,
- preserve selected date,
- preserve scroll position and collapse state by not remounting the page shell.

Do not trigger a full page reload and do not add polling.

- [ ] **Step 5: Run frontend verification**

Run:
```bash
cd frontend && npx tsc --noEmit
cd frontend && npm run build
```
Expected: both PASS.

- [ ] **Step 6: Run manual acceptance check on the dev server**

Use the running app at `http://127.0.0.1:49173/schedule` and verify:
- month cells are visibly tighter and late-month dates are readable,
- right panel shows selected-day schedule first,
- today todo list is interactive in the right panel,
- manual add is collapsed on first load,
- expanding/collapsing the form does not wipe draft text,
- a successful AI reply updates schedule-page content in place without a browser refresh.

- [ ] **Step 7: Commit**

Run:
```bash
git add frontend/src/pages/SchedulePage.tsx frontend/src/components/TodayTodos.tsx
git commit -m "feat: refresh schedule page classic panel layout"
```

## Chunk 3: Final Verification

### Task 5: Verify the complete slice and leave the branch clean

**Files:**
- Verify: `frontend/src/utils/workbenchTodoEvents.ts`
- Verify: `frontend/src/components/AIChatWidget.tsx`
- Verify: `frontend/src/components/TodayTodos.tsx`
- Verify: `frontend/src/pages/SchedulePage.tsx`
- Verify: `frontend/tests/workbenchTodoEvents.test.mjs`

- [ ] **Step 1: Run shared event test**

Run:
```bash
node --test frontend/tests/workbenchTodoEvents.test.mjs
```
Expected: PASS.

- [ ] **Step 2: Run frontend typecheck**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 3: Run frontend production build**

Run:
```bash
cd frontend && npm run build
```
Expected: PASS. Existing Vite chunk-size warnings are acceptable if exit code is 0.

- [ ] **Step 4: Summarize manual acceptance findings**

Record whether:
- selected date stayed stable after refresh,
- collapsed state stayed stable after refresh,
- AI-triggered in-place refresh changed data without a full page reload.

- [ ] **Step 5: Commit final integration if additional unstaged changes remain**

Run:
```bash
git status --short
git add frontend/src/utils/workbenchTodoEvents.ts frontend/tests/workbenchTodoEvents.test.mjs frontend/src/components/AIChatWidget.tsx frontend/src/components/TodayTodos.tsx frontend/src/pages/SchedulePage.tsx docs/superpowers/specs/2026-03-17-schedule-page-classic-panel-refresh-design.md docs/superpowers/plans/2026-03-17-schedule-page-classic-panel-refresh.md
git commit -m "feat: modernize schedule page refresh workflow"
```
