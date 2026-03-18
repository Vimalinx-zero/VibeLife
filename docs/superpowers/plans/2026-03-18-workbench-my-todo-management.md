# Workbench MyTodo Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `Workbench > 项目任务 > 我的Todo` into a real management panel with inline edit, priority and due-date controls, complete/delete actions, and persistent drag reordering for incomplete items.

**Architecture:** Keep the existing `WorkbenchProjectPanel` entrypoint and current `/api/workbench/todos` CRUD. Add a small backend ordering layer around `TodoItem.sort_order` plus one reorder endpoint, then isolate the frontend list behavior in a focused helper module so the large panel component only wires state, optimistic updates, and native drag-and-drop UI.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, Python `unittest`, React 19, TypeScript, node:test, Vite, existing workbench API client

---

## Planned File Map

- `backend/models.py`
  Add `sort_order` to `TodoItem`.
- `backend/database.py`
  Add legacy SQLite migration for `todo_items.sort_order`.
- `backend/workbench_routes.py`
  Add runtime incomplete/completed ordering helpers, extend serialization, define clear-date semantics, and add `POST /api/workbench/todos/reorder`.
- `backend/tests/test_workbench_todo_management.py`
  Cover sort migration behavior, creation-at-end, reorder contract, completion timestamps, and delete behavior.
- `frontend/src/utils/workbenchApi.ts`
  Extend `Todo` typing with `sort_order`; add `reorderTodos`.
- `frontend/src/components/workbenchMyTodoState.ts`
  New pure helpers for splitting incomplete/completed items, applying optimistic patches, completed-collapse state, and reordering ids.
- `frontend/tests/workbenchMyTodoState.test.mjs`
  Cover ordering, grouping, optimistic update helpers, and reorder payload generation.
- `frontend/src/components/WorkbenchProjectPanel.tsx`
  Replace the current read-only todo cards with actionable rows, separate incomplete/completed loading, default-collapsed completed section, optimistic inline edits, Chinese priority controls, and native drag-and-drop.

## Chunk 1: Backend Ordering Contract

### Task 1: Add persistent `sort_order` and a reorder API for incomplete todos

**Files:**
- Modify: `backend/models.py`
- Modify: `backend/database.py`
- Modify: `backend/workbench_routes.py`
- Create: `backend/tests/test_workbench_todo_management.py`

- [ ] **Step 1: Write the failing backend tests**

Create `backend/tests/test_workbench_todo_management.py` to cover:
- old rows without `sort_order` are normalized into a stable incomplete order,
- `GET /api/workbench/todos?completed=false` returns incomplete items by `sort_order asc`,
- `GET /api/workbench/todos?completed=true` returns completed items by `completed_at desc`,
- creating a new incomplete todo appends it to the end of the incomplete order,
- `PUT /api/workbench/todos/{id}` validates, persists, and clears `due_date`,
- marking a todo complete sets `completed_at`,
- `POST /api/workbench/todos/reorder` rewrites contiguous `sort_order` values,
- reorder rejects ids that are missing, duplicated, foreign-user, or completed.

- [ ] **Step 2: Run the backend test to verify it fails**

Run:
```bash
cd backend
python -m unittest discover -s tests -p 'test_workbench_todo_management.py'
```
Expected: FAIL because `TodoItem` has no `sort_order` and the reorder endpoint does not exist.

- [ ] **Step 3: Add the model field and SQLite migration**

Update `backend/models.py` to add `sort_order = Column(Integer, nullable=True)`.

Update `backend/database.py` so `run_legacy_cleanup_migrations()` only:
- adds `sort_order` when missing,
- backfills legacy incomplete rows for each user into contiguous `sort_order` values using:
  1. `priority desc`,
  2. `due_date asc` with nulls last,
  3. `created_at asc`.

- [ ] **Step 4: Implement stable todo ordering and reorder validation**

Update `backend/workbench_routes.py` to:
- serialize `sort_order`,
- validate `due_date` through `_validate_iso_date`,
- treat `due_date = null` on update as an explicit clear operation,
- create new incomplete todos at `max(sort_order) + 1`,
- order incomplete queries by `sort_order asc, created_at asc`,
- order completed queries by `completed_at desc, created_at desc`,
- normalize incomplete rows on read if needed,
- add `TodoReorderRequest` with `ordered_ids: List[str]`,
- add `POST /api/workbench/todos/reorder` that only accepts the full current incomplete list for the current user and rewrites `sort_order` contiguously.

- [ ] **Step 5: Re-run the backend test to verify it passes**

Run:
```bash
cd backend
python -m unittest discover -s tests -p 'test_workbench_todo_management.py'
```
Expected: PASS.

- [ ] **Step 6: Commit the backend slice**

## Chunk 2: Frontend Todo Management Surface

### Task 2: Replace the read-only `我的Todo` cards with a fully manageable list

**Files:**
- Modify: `frontend/src/utils/workbenchApi.ts`
- Create: `frontend/src/components/workbenchMyTodoState.ts`
- Create: `frontend/tests/workbenchMyTodoState.test.mjs`
- Modify: `frontend/src/components/WorkbenchProjectPanel.tsx`

- [ ] **Step 1: Write the failing frontend helper tests**

Create `frontend/tests/workbenchMyTodoState.test.mjs` to cover:
- splitting a flat todo array into `incomplete` and `completed`,
- completed ordering by newest `completed_at`,
- deriving the next drag order after moving one id before another,
- optimistic text / priority / due-date / completion / delete patches,
- rejecting blank inline text saves before the API call.

- [ ] **Step 2: Run the helper test to verify it fails**

Run:
```bash
node --test frontend/tests/workbenchMyTodoState.test.mjs
```
Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Implement the helper module and API client changes**

Create `frontend/src/components/workbenchMyTodoState.ts` with focused pure helpers for:
- grouping todos into `incomplete` and `completed`,
- applying optimistic field patches,
- removing a todo locally,
- computing reordered id arrays for drag-and-drop payloads.

Update `frontend/src/utils/workbenchApi.ts` to:
- include `sort_order?: number | null` on `Todo`,
- add `reorderTodos(orderedIds: string[]): Promise<Todo[]>` using `POST /workbench/todos/reorder`,
- preserve `updateTodo(todoId, { due_date: null })` so due dates can be cleared.

- [ ] **Step 4: Re-run the helper test to verify it passes**

Run:
```bash
node --test frontend/tests/workbenchMyTodoState.test.mjs
```
Expected: PASS.

- [ ] **Step 5: Wire the manageable UI into `WorkbenchProjectPanel.tsx`**

Update `frontend/src/components/WorkbenchProjectPanel.tsx` so the `我的Todo` tab:
- loads and stores incomplete and completed todos separately,
- keeps completed items default-collapsed,
- stops using the old category-grouping presentation for this tab only,
- leaves `groupTodosByCategory` and existing project-panel chat/session helpers untouched unless another tab still needs them,
- uses explicit Chinese priority labels `高 / 中 / 低`,
- supports due-date clearing,
- supports lightweight optimistic rollback on failed save/reorder,
- preserves the current tab/session/chat behavior,
- supports click-to-edit text with `Enter` submit, `Escape` cancel, and blur submit,
- supports inline priority select and native date input with optimistic updates + rollback on failure,
- supports complete and delete buttons per row,
- uses native HTML drag-and-drop for incomplete items only,
- posts the full reordered id list on drop,
- highlights drag target and keeps scroll/other tabs unchanged,
- shows lightweight local failure copy when an optimistic save or reorder fails.

- [ ] **Step 6: Split the UI wiring into smaller verifiable passes**

Implement in this order:
- data loading + completed-collapse state,
- inline text editing,
- priority and due-date controls,
- complete/delete actions,
- drag-and-drop reorder,
- rollback/failure copy.

- [ ] **Step 7: Re-run focused frontend verification**

Run:
```bash
node --test frontend/tests/workbenchMyTodoState.test.mjs frontend/tests/workbenchProjectPanelState.test.mjs frontend/tests/workbenchProjectPanelEffectsState.test.mjs
cd frontend && npx tsc --noEmit
```
Expected: PASS.

## Chunk 3: UI Acceptance Coverage

### Task 3: Verify the full MyTodo interaction contract

**Files:**
- Verify: `frontend/src/components/WorkbenchProjectPanel.tsx`
- Verify: `frontend/src/components/workbenchMyTodoState.ts`

- [ ] **Step 1: Manual acceptance on the running dev server**

Verify on the live Workbench page:
- incomplete items load in saved order,
- completed items are hidden in a default-collapsed section,
- expanding the completed section shows newest completed first,
- clicking text enters edit mode,
- `Enter` saves text,
- `Escape` cancels text edit,
- blur saves text,
- priority select shows `高 / 中 / 低`,
- due date can be set and cleared,
- failed optimistic updates roll back locally,
- completing an item moves it out of incomplete into completed,
- deleting an item removes it immediately,
- dragging incomplete rows changes order and the order survives refresh.

- [ ] **Step 2: Run build verification**

Run:
```bash
cd frontend && npm run build
```
Expected: PASS.

## Chunk 4: Final Verification

### Task 4: Prove the Workbench todo panel works end-to-end

**Files:**
- Verify: `frontend/src/components/WorkbenchProjectPanel.tsx`
- Verify: `frontend/src/utils/workbenchApi.ts`
- Verify: `backend/workbench_routes.py`

- [ ] **Step 1: Run backend and frontend regression checks**
- renders incomplete items first and completed items in a collapsed section below,
- supports click-to-edit text with `Enter` submit, `Escape` cancel, and blur submit,
- supports inline priority select and native date input with optimistic updates + rollback on failure,
- supports complete and delete buttons per row,
- uses native HTML drag-and-drop for incomplete items only,
- posts the full reordered id list on drop,
- highlights drag target and keeps scroll/other tabs unchanged,
- shows lightweight local failure copy when an optimistic save or reorder fails.

- [ ] **Step 6: Re-run focused frontend verification**

Run:
```bash
node --test frontend/tests/workbenchMyTodoState.test.mjs frontend/tests/workbenchProjectPanelState.test.mjs frontend/tests/workbenchProjectPanelEffectsState.test.mjs
cd frontend && npx tsc --noEmit
```
Expected: PASS.

Run:
```bash
cd backend
python -m unittest discover -s tests -p 'test_workbench_todo_management.py'
cd ../frontend
npx tsc --noEmit
npm run build
```
Expected: PASS.
