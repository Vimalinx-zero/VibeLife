# Schedule Sidebar Inline Editing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add direct inline editing to both the schedule-page `当天安排` list and the `今日待办` list so users can click an item and edit it in place.

**Architecture:** Keep the existing schedule page data loading and workbench API clients. Add two small pure helper modules for edit-state/draft shaping so they can be covered with `node:test`, then wire those helpers into `TodayTodos.tsx` and `ScheduleSidebarPanel.tsx` with minimal local UI state.

**Tech Stack:** React 19, TypeScript, Vite, existing workbench API client, node:test, Tailwind CSS

---

## Chunk 1: Todo Inline Editing

### Task 1: Add a tested inline-edit helper for today todos and wire it into `TodayTodos`

**Files:**
- Create: `frontend/src/components/todayTodosInlineEdit.ts`
- Create: `frontend/tests/todayTodosInlineEdit.test.mjs`
- Modify: `frontend/src/components/TodayTodos.tsx`

- [ ] **Step 1: Write the failing test**

Add `frontend/tests/todayTodosInlineEdit.test.mjs` to cover:
- starting edit from a todo captures its id and current text,
- normalizing a save draft trims outer whitespace,
- blank text is rejected,
- cancel returns to the idle state.

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
node --test frontend/tests/todayTodosInlineEdit.test.mjs
```
Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/components/todayTodosInlineEdit.ts` with focused helpers for:
- entering edit mode,
- clearing edit mode,
- validating and normalizing the draft text.

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
node --test frontend/tests/todayTodosInlineEdit.test.mjs
```
Expected: PASS.

- [ ] **Step 5: Wire the helper into `TodayTodos.tsx`**

Update `frontend/src/components/TodayTodos.tsx` so:
- clicking a todo text row enters edit mode,
- edit mode shows input + save/cancel controls,
- `Enter` saves, `Escape` cancels,
- save uses `updateTodo`,
- save success reloads todos and exits edit mode,
- save failure keeps the draft visible.

- [ ] **Step 6: Re-run the focused test and typecheck impact**

Run:
```bash
node --test frontend/tests/todayTodosInlineEdit.test.mjs frontend/tests/todayTodosConfig.test.mjs
cd frontend && npx tsc --noEmit
```
Expected: PASS.

## Chunk 2: Schedule Event Inline Editing

### Task 2: Add a tested inline-edit helper for day events and wire it into `ScheduleSidebarPanel`

**Files:**
- Create: `frontend/src/pages/scheduleEventInlineEdit.ts`
- Create: `frontend/tests/scheduleEventInlineEdit.test.mjs`
- Modify: `frontend/src/pages/ScheduleSidebarPanel.tsx`
- Modify: `frontend/src/pages/SchedulePage.tsx`

- [ ] **Step 1: Write the failing test**

Add `frontend/tests/scheduleEventInlineEdit.test.mjs` to cover:
- starting edit from a schedule event creates the expected draft,
- blank titles are rejected,
- save payload trims title/time/description correctly,
- cancel clears the current editing event.

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
node --test frontend/tests/scheduleEventInlineEdit.test.mjs
```
Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/pages/scheduleEventInlineEdit.ts` with focused helpers for:
- starting edit from an event,
- clearing edit state,
- validating and normalizing a schedule-event update payload.

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
node --test frontend/tests/scheduleEventInlineEdit.test.mjs
```
Expected: PASS.

- [ ] **Step 5: Wire the helper into `ScheduleSidebarPanel.tsx` and `SchedulePage.tsx`**

Update the schedule sidebar so:
- clicking an event card enters edit mode,
- edit mode shows title/time/description/type controls plus save/cancel,
- save calls back into page-level update handling,
- page-level save uses `updateScheduleEvent`,
- save success reloads month events and preserves current date/tab,
- switching date or tab clears editing state.

- [ ] **Step 6: Re-run focused tests and typecheck**

Run:
```bash
node --test frontend/tests/scheduleEventInlineEdit.test.mjs frontend/tests/schedulePageState.test.mjs frontend/tests/schedulePageCalendar.test.mjs
cd frontend && npx tsc --noEmit
```
Expected: PASS.

## Chunk 3: Final Verification

### Task 3: Prove the inline editing works without breaking the schedule page

**Files:**
- Verify: `frontend/src/components/TodayTodos.tsx`
- Verify: `frontend/src/pages/ScheduleSidebarPanel.tsx`
- Verify: `frontend/src/pages/SchedulePage.tsx`

- [ ] **Step 1: Run the production build**

Run:
```bash
cd frontend && npm run build
```
Expected: PASS.

- [ ] **Step 2: Manual acceptance on the running dev server**

Verify on the live `/schedule` page:
- click a todo item and it enters inline edit,
- `Enter` saves todo text,
- `Escape` cancels todo edit,
- click an event card and it enters inline edit,
- saving an event updates the list without resetting the selected date or active tab,
- switching tab/date exits any unsaved edit cleanly,
- existing add/toggle/delete actions still work.

- [ ] **Step 3: Commit the verification-backed slice**

Run:
```bash
git add docs/superpowers/specs/2026-03-18-schedule-sidebar-inline-editing-design.md docs/superpowers/plans/2026-03-18-schedule-sidebar-inline-editing.md frontend/src/components/TodayTodos.tsx frontend/src/components/todayTodosInlineEdit.ts frontend/src/pages/ScheduleSidebarPanel.tsx frontend/src/pages/SchedulePage.tsx frontend/src/pages/scheduleEventInlineEdit.ts frontend/tests/todayTodosInlineEdit.test.mjs frontend/tests/scheduleEventInlineEdit.test.mjs
git commit -m "feat: add inline editing to schedule sidebar"
```
