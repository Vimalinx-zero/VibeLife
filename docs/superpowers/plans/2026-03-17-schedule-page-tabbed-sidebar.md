# Schedule Page Tabbed Sidebar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the schedule page right sidebar into a tabbed main content area so the page stays within viewport height while preserving schedule, todo, and manual-add behaviors.

**Architecture:** Keep the existing `SchedulePage` route, month-event loading, and `TodayTodos` reuse. Add one small local sidebar-tab state extension in `schedulePageState.ts`, then refit the right sidebar layout so the tab content owns the scroll area and the manual-add + legend sit in a smaller auxiliary footer block.

**Tech Stack:** React 19, TypeScript, Vite, existing workbench API client, node:test, Tailwind CSS

---

## Chunk 1: Sidebar Tab State Contract

### Task 1: Extend schedule-page state helpers for sidebar tabs

**Files:**
- Modify: `frontend/src/pages/schedulePageState.ts`
- Modify: `frontend/tests/schedulePageState.test.mjs`

- [ ] **Step 1: Reuse and extend the existing tab-state tests**

The sidebar tab contract already exists locally. Extend `frontend/tests/schedulePageState.test.mjs` only where coverage is still missing so it verifies:
- the initial sidebar tab defaults to `"schedule"`,
- switching tabs updates only the active tab and preserves selected date/draft state,
- `preserveScheduleUiStateOnRefresh(...)` keeps the active tab unchanged,
- `preserveScheduleUiStateOnSubmitFailure(...)` keeps the active tab unchanged,
- `resetScheduleUiStateAfterSubmitSuccess(...)` keeps the active tab unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
node --test frontend/tests/schedulePageState.test.mjs
```
Expected: FAIL because the helper state does not include an active tab yet.
Expected: FAIL because the extended coverage references tab-preservation behavior that is not yet fully implemented in the local state helpers.

- [ ] **Step 3: Write minimal implementation**

Update `frontend/src/pages/schedulePageState.ts` only as needed to:
- add an `activeSidebarTab` field,
- define a literal union for the tab ids,
- default the initial state to `"schedule"`,
- export a small helper such as `setActiveSidebarTab(...)`,
- keep refresh/failure/success helpers preserving the chosen tab.

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
node --test frontend/tests/schedulePageState.test.mjs
```
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
```bash
git add frontend/src/pages/schedulePageState.ts frontend/tests/schedulePageState.test.mjs
git commit -m "test: cover schedule sidebar tab state"
```

## Chunk 2: Tabbed Sidebar Layout

### Task 2: Refactor SchedulePage right sidebar into tabs with an internal scroll region

**Files:**
- Modify: `frontend/src/pages/SchedulePage.tsx`
- Create: `frontend/src/pages/ScheduleSidebarPanel.tsx`
- Reference: `frontend/src/components/TodayTodos.tsx`
- Reference: `frontend/src/pages/schedulePageState.ts`

- [ ] **Step 1: Re-read the approved spec and current page structure**

Confirm the target from:
- `docs/superpowers/specs/2026-03-17-schedule-page-tabbed-sidebar-design.md`
- `frontend/src/pages/SchedulePage.tsx`

Focus only on:
- right sidebar height behavior,
- tab state wiring,
- smaller legend and auxiliary footer layout.

- [ ] **Step 2: Record the manual red checkpoint before refactor**

Start the dev server if it is not already running:
```bash
cd frontend && npm run dev
```

Use the actual local URL printed by Vite, then open `/schedule` on that URL and verify the current failing behavior:
- there is no `当天安排 / 今日待办` tab row yet,
- the right sidebar content visually pushes too far downward on a laptop-height viewport,
- the legend is larger than desired.

This is the explicit pre-change failure boundary for the UI refactor.

- [ ] **Step 3: Add sidebar tab state wiring**

Update `frontend/src/pages/SchedulePage.tsx` to:
- read `activeSidebarTab` from page UI state,
- switch tabs through the new helper,
- keep tab state stable across local refresh and submit flows,
- keep the active tab unchanged when the user selects a different calendar date,
- ensure the top date header still updates immediately on date change.

- [ ] **Step 4: Extract a focused sidebar unit**

Create `frontend/src/pages/ScheduleSidebarPanel.tsx` to own:
- the header summary,
- the tab row,
- the single scroll-owning content shell,
- the auxiliary footer with manual-add + legend.

Keep `SchedulePage.tsx` responsible for month navigation, selected-date derivation, data loading, and wiring callbacks into the sidebar component.

- [ ] **Step 5: Rebuild the right sidebar layout**

Refactor the extracted sidebar component into:
1. a fixed top summary block,
2. a tab button row,
3. one `min-h-0 flex-1 overflow-hidden` content shell,
4. a tab content panel with internal `overflow-y-auto`,
5. a smaller bottom auxiliary block for manual-add + legend.

Keep the left calendar untouched except for any small height-alignment classes needed to make the sidebar behave correctly.
The tab content shell must be the single owner of vertical overflow for the right sidebar.

- [ ] **Step 6: Implement the `当天安排` tab content**

Ensure the schedule tab:
- shows the current selected-day schedule list,
- keeps the existing loading/empty states,
- scrolls internally when long,
- does not push the footer auxiliary block off-screen.

- [ ] **Step 7: Implement the `今日待办` tab content**

Render `TodayTodos` inside the tab content shell so it:
- remains interactive,
- uses the schedule variant,
- inherits the tab panel scroll behavior without double-growing the sidebar,
- does not become a second outer height owner that can re-stretch the sidebar.

- [ ] **Step 8: Shrink the auxiliary footer**

Compress:
- the manual-add collapsed block spacing,
- the expanded form spacing,
- the legend into a smaller lightweight row/block.

Keep the manual-add draft persistence and submit behavior unchanged.

- [ ] **Step 9: Run targeted verification**

Run:
```bash
node --test frontend/tests/schedulePageState.test.mjs frontend/tests/schedulePageCalendar.test.mjs frontend/tests/todayTodosConfig.test.mjs frontend/tests/workbenchTodoEvents.test.mjs
cd frontend && npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 10: Commit**

Run:
```bash
git add frontend/src/pages/SchedulePage.tsx frontend/src/pages/ScheduleSidebarPanel.tsx frontend/src/pages/schedulePageState.ts frontend/tests/schedulePageState.test.mjs
git commit -m "feat: tab schedule sidebar content"
```

## Chunk 3: Final Verification

### Task 3: Prove the tabbed sidebar stays within the page shell

**Files:**
- Verify: `frontend/src/pages/SchedulePage.tsx`
- Verify: `frontend/src/pages/ScheduleSidebarPanel.tsx`

- [ ] **Step 1: Run the production build**

Run:
```bash
cd frontend && npm run build
```
Expected: PASS.

- [ ] **Step 2: Manual acceptance on the running dev server**

Start the app if needed:
```bash
cd frontend && npm run dev
```

Verify on the actual local Vite URL shown in stdout, with `/schedule` appended:
- the right sidebar no longer visually pushes core content below the viewport,
- `当天安排` is the default active tab,
- switching to `今日待办` works immediately,
- the visible tab content scrolls internally when long,
- manual-add remains collapsed by default,
- expanded manual-add still preserves draft input,
- legend is visibly smaller and less dominant than before.

- [ ] **Step 3: Commit the verification-backed slice**

Run:
```bash
git add docs/superpowers/specs/2026-03-17-schedule-page-tabbed-sidebar-design.md docs/superpowers/plans/2026-03-17-schedule-page-tabbed-sidebar.md frontend/src/pages/SchedulePage.tsx frontend/src/pages/ScheduleSidebarPanel.tsx frontend/src/pages/schedulePageState.ts frontend/tests/schedulePageState.test.mjs
git commit -m "feat: compact schedule sidebar with tabs"
```
