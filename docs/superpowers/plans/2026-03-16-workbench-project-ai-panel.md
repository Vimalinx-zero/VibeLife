# Workbench Project AI Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Workbench project-side mock AI flow with a real OpenClaw-backed chat panel, real VibeLife todo data, and separate panel-local chat sessions.

**Architecture:** Keep the backend unchanged for this slice and rewire the frontend to use the existing `/api/ai/chat` OpenClaw path. Extract project-panel session/todo helpers out of `WorkbenchPage.tsx`, use local storage keyed by user id for panel-local sessions, and remove fake operational mock data from unsupported tabs.

**Tech Stack:** React 19, TypeScript, Vite, node:test, existing VibeLife frontend APIs

---

## Chunk 1: Project Panel State and Tests

### Task 1: Extract project-panel chat and todo helpers

**Files:**
- Create: `frontend/src/pages/workbenchProjectPanelState.ts`
- Test: `frontend/tests/workbenchProjectPanelState.test.mjs`

- [ ] Step 1: Create `frontend/src/pages/workbenchProjectPanelState.ts` with focused helpers for:
  - `ProjectPanelMessage`
  - `ProjectPanelSession`
  - `getProjectPanelHistoryStorageKey(userId)`
  - `parseStoredProjectPanelState(raw)`
  - `serializeProjectPanelState(state)`
  - `buildProjectPanelHistory(messages)`
  - `groupTodosByCategory(todos)`
- [ ] Step 2: Write a failing `node:test` file at `frontend/tests/workbenchProjectPanelState.test.mjs` covering:
  - custom storage parsing falls back safely,
  - session titles come from first user message,
  - history payload maps `user/assistant` correctly,
  - todo grouping preserves only non-empty real todos.
- [ ] Step 3: Run `node --test frontend/tests/workbenchProjectPanelState.test.mjs`.
  Expected: fail first because the helper module or behavior is incomplete.
- [ ] Step 4: Implement the minimal helper logic in `frontend/src/pages/workbenchProjectPanelState.ts`.
- [ ] Step 5: Re-run `node --test frontend/tests/workbenchProjectPanelState.test.mjs`.
  Expected: all tests pass.
- [ ] Step 6: Commit this chunk.
  Run:
  ```bash
  git add frontend/src/pages/workbenchProjectPanelState.ts frontend/tests/workbenchProjectPanelState.test.mjs
  git commit -m "feat: add workbench project panel state helpers"
  ```

## Chunk 2: Real OpenClaw Chat and Real Todo Data

### Task 2: Rewire Workbench project panel to real chat and local sessions

**Files:**
- Modify: `frontend/src/pages/WorkbenchPage.tsx`
- Reference: `frontend/src/components/AIChatWidget.tsx`
- Reference: `frontend/src/context/AuthContext.tsx`
- Reference: `frontend/src/utils/api.ts`
- Reference: `frontend/src/utils/workbenchApi.ts`

- [ ] Step 1: Confirm the helper test file explicitly covers the `/api/ai/chat` request history shape and add a failing expectation if anything is missing.
- [ ] Step 2: Run `node --test frontend/tests/workbenchProjectPanelState.test.mjs` and verify the failure is about the missing request-shaping behavior.
- [ ] Step 3: In `frontend/src/pages/WorkbenchPage.tsx`, remove `MOCK_PROJECT_CHAT` and the ad-hoc quick-qa todo parsing flow from `handleProjectChatSend`.
- [ ] Step 4: Add project-panel local state that:
  - loads from `getProjectPanelHistoryStorageKey(user?.id)`,
  - keeps an active session,
  - creates a new session on demand,
  - supports switching active session from the panel header,
  - persists updates back to local storage.
- [ ] Step 5: Replace the chat send flow so it:
  - uses `useAuth` / `logout` for auth state,
  - requires auth token,
  - POSTs to `${window.__VIBELIFE_API_ORIGIN__}/api/ai/chat`,
  - sends `provider: "openclaw"`,
  - sends the top-level `message` field plus recent `history`,
  - sends recent history via `buildProjectPanelHistory`,
  - logs out on `401`,
  - appends success and failure assistant messages to the active session.
- [ ] Step 6: Replace the current `我的Todo` mock render path so it renders real pending todos only, using backend fields (`text`, `priority`, `subject`, `due_date`) and no mock-only `source` / `status` / `aiSteps`.
- [ ] Step 7: Add panel-local todo loading state with distinct UI for:
  - loading,
  - empty (`暂无待办`),
  - failure (`待办加载失败`).
- [ ] Step 8: Listen for `workbench-todos-refresh` in the project panel and reload the panel-local todo list so changes from chat replies or other surfaces stay in sync.
- [ ] Step 9: After successful chat replies, dispatch `workbench-todos-refresh`.
- [ ] Step 10: Re-run `node --test frontend/tests/workbenchProjectPanelState.test.mjs`.
  Expected: pass.
- [ ] Step 11: Commit this chunk.
  Run:
  ```bash
  git add frontend/src/pages/WorkbenchPage.tsx frontend/src/pages/workbenchProjectPanelState.ts frontend/tests/workbenchProjectPanelState.test.mjs
  git commit -m "feat: connect workbench project ai panel"
  ```

## Chunk 3: Placeholder Cleanup and Verification

### Task 3: Remove deceptive mock runtime presentation and verify the slice

**Files:**
- Modify: `frontend/src/pages/WorkbenchPage.tsx`
- Verify: `frontend/tests/workbenchProjectPanelState.test.mjs`

- [ ] Step 1: Remove the `Mock 数据` label in places that are now real.
- [ ] Step 2: Replace unsupported `子代理任务进程` / `项目洞察` / `代理状态总览` / `Git 面板` mock renderings with explicit placeholder cards that say these tabs are not yet connected to live data.
- [ ] Step 3: If `frontend/src/pages/WorkbenchPage.tsx` grows materially during the chat/todo rewiring, extract the new project-panel-specific rendering into a focused helper component instead of pushing more stateful JSX into the page file.
- [ ] Step 4: Re-read the spec at `docs/superpowers/specs/2026-03-16-workbench-project-ai-panel-design.md` and verify the implementation still matches the chosen scope.
- [ ] Step 5: Run `node --test frontend/tests/workbenchProjectPanelState.test.mjs`.
  Expected: 0 failures.
- [ ] Step 6: Run `cd frontend && npx tsc --noEmit`.
  Expected: exit 0.
- [ ] Step 7: Run `cd frontend && npm run build`.
  Expected: exit 0. Existing non-blocking Vite warnings are acceptable if the exit code stays 0.
- [ ] Step 8: Commit the cleanup/verification chunk.
  Run:
  ```bash
  git add frontend/src/pages/WorkbenchPage.tsx
  git commit -m "refactor: remove fake workbench project runtime tabs"
  ```
