# Workbench Project AI Panel Design

**Date:** 2026-03-16

## Context

`frontend/src/pages/WorkbenchPage.tsx` currently renders the project-side panel with hard-coded mock chat messages, mock AI todos, mock agent status, and a fake Git graph. The chat input does not call the real `/api/ai/chat` OpenClaw flow. Instead, it sends a prompt to `/api/ai/quick-qa-stream`, parses the free-form answer into todo strings, and then mutates local mock state.

The backend already has the real OpenClaw path in `backend/ai_routes.py`, and the OpenClaw plugin already exposes real VibeLife tools for todos, projects, project steps, quick capture, and conversation history. The missing piece is the frontend wiring for the Workbench project panel.

## Goal

Turn the Workbench project-side panel into a real OpenClaw-backed surface that can:

1. send project chat messages to `/api/ai/chat` with `provider: openclaw`,
2. keep an independent session history for this panel,
3. show real VibeLife todos in the left `我的Todo` tab,
4. stop presenting remaining mock-only tabs as if they were live.

## Non-Goals

- No new backend data model for project chat threads in this slice.
- No real Git graph integration in this slice.
- No real sub-agent runtime telemetry in this slice.
- No automatic project selection or project-specific backend context yet.

## Approaches Considered

### Approach A: Chat only

Replace the right-side chat input with real `/api/ai/chat`, but leave the left tabs untouched.

Pros:
- fastest ship time,
- smallest diff.

Cons:
- leaves `我的Todo` as fake data,
- the overall project panel still feels untrustworthy.

### Approach B: Real chat + real todo + local panel sessions

Use the real OpenClaw chat endpoint for the right panel, load real todos for the `我的Todo` tab, and persist panel-specific chat sessions in local storage keyed by user id. Keep unsupported tabs visible but explicitly marked as placeholders.

Pros:
- delivers a real end-to-end workflow now,
- does not need backend schema changes,
- matches existing patterns already used in `AIChatWidget`.

Cons:
- project chat history is still frontend-persisted instead of server-side.

### Approach C: Full panel de-mock

Replace chat, todo, status, sub-agent progress, Git, and insights with all-real data in one pass.

Pros:
- no placeholders left in the panel.

Cons:
- large scope jump,
- blocked by missing backend APIs for several tabs,
- high chance of shipping another half-real implementation.

## Decision

Choose **Approach B**.

This is the smallest slice that makes the panel genuinely useful. It converts the user-facing action path to real OpenClaw and real VibeLife data without inventing new backend storage or pretending unsupported tabs are live.

## Design

### 1. Project chat becomes a dedicated OpenClaw client

The right-side `项目 AI 助手` panel will stop using `/api/ai/quick-qa-stream`. It will call `/api/ai/chat` with `provider: openclaw`, passing the recent message history in the same shape already used by `AIChatWidget`.

The chat surface keeps only the panel-local responsibilities:

- append the user's message immediately,
- show a pending assistant bubble while waiting,
- append the assistant reply or error bubble,
- refresh dependent UI after a successful reply.

### 2. Workbench project panel gets its own session storage

The project-side panel will store sessions in local storage under a dedicated key per user, separate from `AIChatWidget`. This prevents cross-contamination between the floating AI assistant and the Workbench project panel.

Each session stores:

- `id`,
- `title`,
- `updatedAt`,
- `messages`.

The title will be derived from the first user message. The panel only needs simple multi-session behavior in this slice: create session, switch session, and continue in the active session.

### 3. `我的Todo` switches to real VibeLife todos

The `我的Todo` tab will load from `frontend/src/utils/workbenchApi.ts#getTodos`. Todos will be grouped using the existing `inferTodoCategory` helper, which is already aligned with the current Chinese category labels.

This tab is read-only in this slice except for refresh via the existing todo refresh event. The purpose here is trustworthiness: when OpenClaw creates or updates todos, the panel reflects the real backend state.

### 4. Remaining tabs become explicit placeholders

`子代理任务进程` / `项目洞察` / `代理状态总览` / `Git 面板` remain unsupported in this slice. Their mock datasets and fake runtime chrome will be removed or visually downgraded into explicit placeholder cards.

The rule is simple: no fake operational data should remain labeled like live system state.

## Data Flow

1. User enters a message in the project AI panel.
2. Frontend posts to `/api/ai/chat` with `provider: openclaw` and recent message history.
3. OpenClaw runs against the real VibeLife tool surface.
4. Frontend appends the reply to the active project-panel session.
5. Frontend dispatches `workbench-todos-refresh` and reloads the project-panel todo list.

## Error Handling

- `401`: reuse current auth flow and log the user out through `useAuth`.
- request failure or invalid payload: append a clear assistant error message in the current session.
- todo reload failure: show empty-state copy for that tab and log the error, but do not destroy chat state.

## Testing

### Frontend regression coverage

Add focused tests for:

- project-panel session storage parsing and normalization,
- todo grouping logic for real todos,
- message history payload shaping for `/api/ai/chat`.

### Verification

- `node --test` for the new targeted test file(s),
- `cd frontend && npx tsc --noEmit`,
- `cd frontend && npm run build`.

## Success Criteria

- Sending a message from the Workbench project AI panel triggers the real `/api/ai/chat` OpenClaw path.
- The panel keeps an independent conversation history from the floating AI assistant.
- The `我的Todo` tab shows real VibeLife todos instead of hard-coded mock items.
- No remaining tab presents mock operational data as if it were live.
