# Knowledge Workshop Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/quick-capture` into a standalone Knowledge Workshop with unified collected/generated knowledge browsing, project/category filters, AI discussion, and manual save-back into generated notes.

**Architecture:** Reuse the existing quick-capture ingestion and local vector store as the base knowledge store, but split responsibilities cleanly: keep import/list/search in `quick_capture_routes.py`, add AI discussion and generated-write APIs in a new `knowledge_routes.py`, and break the frontend page into focused knowledge-workshop components around a shared page-state helper so the page remains maintainable.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, Python `unittest`, React 19, TypeScript, node:test, Axios, Vite, existing vector store and AI route patterns

---

## Planned File Map

- `backend/models.py`
  Extend `QuickNoteCapture` with unified knowledge fields: `content_kind`, `category`, `source_capture_ids`, `source_filter_snapshot`, `discussion_metadata`.
- `backend/database.py`
  Add SQLite migration for the new `quick_note_captures` columns and backfill existing rows as `content_kind='collected'`.
- `backend/quick_capture_routes.py`
  Keep ownership of import/list/search; preserve current JSON capture compatibility, add precise metadata fields, extend list/search filters, and optionally add a separate multipart upload path.
- `backend/knowledge_routes.py`
  New route file for `POST /api/knowledge/discuss`, `POST /api/knowledge/generated`, and `POST /api/knowledge/generated/{entry_id}/append`, including generated-entry vector indexing and append re-indexing.
- `backend/main.py`
  Register the new knowledge router.
- `backend/tests/test_knowledge_workshop.py`
  Cover unified list filters, discussion context building, generated-note creation, and append behavior.
- `frontend/src/utils/api.ts`
  Add DTOs and client methods for knowledge list/search/discuss/save/append while keeping existing `NotesPage` quick-capture calls compatible.
- `frontend/src/pages/knowledgeWorkshopState.ts`
  New pure helpers for filters, local discussion history, citations, and save-draft shaping.
- `frontend/tests/knowledgeWorkshopState.test.mjs`
  Cover filter normalization, history trimming, draft shaping, and source tracking.
- `frontend/src/components/knowledge/KnowledgeSidebar.tsx`
  New left rail for `收集内容` / `生成内容` and `项目` / `类别` filters.
- `frontend/src/components/knowledge/KnowledgeBrowser.tsx`
  New center column for import, list, search, and selected-entry detail.
- `frontend/src/components/knowledge/KnowledgeDiscussionPanel.tsx`
  New right rail for AI discussion and manual save actions.
- `frontend/src/pages/QuickCapturePage.tsx`
  Replace the current simple capture UI with the three-column workshop shell.

## Chunk 1: Unified Knowledge Data And Backend Contracts

### Task 1: Extend the quick-capture store into a unified knowledge store

**Files:**
- Modify: `backend/models.py`
- Modify: `backend/database.py`
- Modify: `backend/quick_capture_routes.py`
- Create: `backend/knowledge_routes.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_knowledge_workshop.py`

- [ ] **Step 1: Write the failing backend tests**

Create `backend/tests/test_knowledge_workshop.py` to cover:
- existing captures backfill to `content_kind='collected'`,
- list filtering by `content_kind`, `project_id`, and `category`,
- search results include `content_kind`, `project_id`, `category`, and `tags`,
- generated rows are indexed into the vector store on create and re-indexed on append,
- `POST /api/knowledge/discuss` accepts `mode='entry'` and `mode='selection'`,
- selection context is capped at 8 entries and history at 12 messages,
- `selected_entry_ids` are honored within the capped selection context,
- `POST /api/knowledge/generated` creates `content_kind='generated'` rows with source-tracking fields,
- `POST /api/knowledge/generated/{entry_id}/append` only appends to generated entries and updates metadata correctly,
- search can return generated content after create/append.

- [ ] **Step 2: Run the backend test to verify it fails**

Run:
```bash
cd backend
python -m unittest discover -s tests -p 'test_knowledge_workshop.py'
```
Expected: FAIL because the unified fields and knowledge routes do not exist.

- [ ] **Step 3: Add the unified knowledge columns and migration**

Update `backend/models.py` so `QuickNoteCapture` gains:
- `content_kind` with default `"collected"`,
- `category`,
- `source_capture_ids`,
- `source_filter_snapshot`,
- `discussion_metadata`.

Update `backend/database.py` so legacy rows are backfilled safely:
- `content_kind='collected'`,
- `category=NULL`,
- `source_capture_ids=[]`,
- `source_filter_snapshot=NULL`,
- `discussion_metadata=NULL`.

- [ ] **Step 4: Make the import contract explicit and backward-compatible**

Update `backend/quick_capture_routes.py` so it:
- keeps the current JSON text/url import path working for existing callers including `NotesPage`,
- accepts metadata fields needed by the workshop import surface: `title`, `project_id`, `category`, `tags`,
- if multipart upload is added, does so on a separate compatible path or request shape that does not break the existing JSON client,
- preserves honest extraction fallback for files that cannot be parsed,
- distinguishes link fetch failure, missing local path, unsupported file type, extraction failure with degradable fallback, and final save failure,
- supports list filters for `content_kind`, `project_id`, and `category`,
- returns the extra unified fields in both list and search responses,
- keeps list ordering at `updated_at desc` then `created_at desc`.

- [ ] **Step 5: Implement AI discussion context resolution**

Create `backend/knowledge_routes.py` with:
- `POST /api/knowledge/discuss`
  - validates `mode`,
  - resolves `entry` or `selection` context,
  - trims history to the newest 12 messages,
  - caps selection context to 8 entries,
  - enforces a total context-size hard cap,
  - returns `reply`, `context_mode`, `citations`, and `draft`,
- does not mutate the knowledge base on discussion failure.

- [ ] **Step 6: Implement generated-save and append routes**

Create the write side in `backend/knowledge_routes.py`:
- `POST /api/knowledge/generated`
  - creates a new `generated` knowledge row,
  - stores source-tracking metadata,
  - indexes the generated content into the vector store,
- `POST /api/knowledge/generated/{entry_id}/append`
  - appends markdown to an existing generated row,
  - merges tags/source ids conservatively,
  - re-indexes the generated content,
  - rejects non-generated targets,
  - preserves retryability on failure.

Register the router in `backend/main.py`.

- [ ] **Step 7: Re-run the backend test to verify it passes**

Run:
```bash
cd backend
python -m unittest discover -s tests -p 'test_knowledge_workshop.py'
```
Expected: PASS.

## Chunk 2: Frontend Knowledge Workshop State And API Client

### Task 2: Create stable frontend state helpers and client contracts for the workshop

**Files:**
- Modify: `frontend/src/utils/api.ts`
- Create: `frontend/src/pages/knowledgeWorkshopState.ts`
- Create: `frontend/tests/knowledgeWorkshopState.test.mjs`

- [ ] **Step 1: Write the failing frontend helper tests**

Create `frontend/tests/knowledgeWorkshopState.test.mjs` to cover:
- normalizing the left-rail filter state,
- trimming local discussion history to the newest 12 messages,
- shaping a save payload from assistant draft + current filter context,
- merging source ids without duplicates,
- deriving the right list title for `收集内容` vs `生成内容`,
- preserving unsaved discussion state when save fails,
- shaping selection payloads that include `selected_entry_ids`.

- [ ] **Step 2: Run the helper test to verify it fails**

Run:
```bash
node --test frontend/tests/knowledgeWorkshopState.test.mjs
```
Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Implement the helper module and API clients**

Create `frontend/src/pages/knowledgeWorkshopState.ts` with pure helpers for:
- filter state,
- selected entry state,
- local discussion history trimming,
- assistant draft shaping,
- append/save payload generation.

Update `frontend/src/utils/api.ts` to add typed client methods for:
- listing knowledge entries with filters,
- searching the unified knowledge store,
- discussing a single entry or filtered selection,
- creating generated notes,
- appending to generated notes,
- uploading supported files for import if a separate upload path is added,
- preserving existing quick-capture client behavior used by `NotesPage`.

- [ ] **Step 4: Re-run the helper test to verify it passes**

Run:
```bash
node --test frontend/tests/knowledgeWorkshopState.test.mjs
```
Expected: PASS.

## Chunk 3: Three-Column Workshop UI

### Task 3: Replace the current `/quick-capture` page with the Knowledge Workshop shell

**Files:**
- Create: `frontend/src/components/knowledge/KnowledgeSidebar.tsx`
- Create: `frontend/src/components/knowledge/KnowledgeBrowser.tsx`
- Create: `frontend/src/components/knowledge/KnowledgeDiscussionPanel.tsx`
- Modify: `frontend/src/pages/QuickCapturePage.tsx`
- Reference: `frontend/src/pages/knowledgeWorkshopState.ts`
- Reference: `frontend/src/utils/api.ts`

- [ ] **Step 1: Wire the workshop shell**

Update `frontend/src/pages/QuickCapturePage.tsx` so it loads the unified knowledge data and renders:
- left column: view switch + project/category filters,
- center column: import surface, search, knowledge list, selected-entry detail,
- right column: AI discussion panel with manual save actions.

- [ ] **Step 2: Build the left rail and list/detail browser**

Create:
- `KnowledgeSidebar.tsx` for the left rail,
- `KnowledgeBrowser.tsx` for import, search, list, and entry detail.

The UI must preserve the approved behavior:
- collected/generated are views over one store, not separate systems,
- project/category are just filters,
- import captures `title` / `project` / `category` / `tags`,
- import supports text, links, files, and images,
- no project-page coupling.

- [ ] **Step 3: Build the discussion panel and manual write-back actions**

Create `KnowledgeDiscussionPanel.tsx` for:
- local chat history,
- citations,
- draft preview,
- `保存为生成笔记`,
- `追加到现有生成笔记`,
- `仅保留对话`,
- visible failure/retry state without clearing local discussion.

- [ ] **Step 4: Add lazy reload behavior after successful writes**

Ensure the page refreshes its unified knowledge list lazily after:
- successful import,
- successful generated-note create,
- successful generated-note append.

Keep current filters, selection, and unsaved local chat history intact when only the data list needs refreshing.

- [ ] **Step 5: Run focused frontend verification**

Run:
```bash
node --test frontend/tests/knowledgeWorkshopState.test.mjs frontend/tests/projectsPageCategories.test.mjs
cd frontend && npx tsc --noEmit
```
Expected: PASS.

## Chunk 4: Final Verification

### Task 4: Prove the Knowledge Workshop works end-to-end

**Files:**
- Verify: `frontend/src/pages/QuickCapturePage.tsx`
- Verify: `frontend/src/components/knowledge/KnowledgeSidebar.tsx`
- Verify: `frontend/src/components/knowledge/KnowledgeBrowser.tsx`
- Verify: `frontend/src/components/knowledge/KnowledgeDiscussionPanel.tsx`
- Verify: `backend/quick_capture_routes.py`
- Verify: `backend/knowledge_routes.py`

- [ ] **Step 1: Run regression and build checks**

Run:
```bash
cd backend
python -m unittest discover -s tests -p 'test_knowledge_workshop.py'
cd ../frontend
npx tsc --noEmit
npm run build
```
Expected: PASS.

- [ ] **Step 2: Manual acceptance on the running dev server**

Verify on the live `/quick-capture` page:
- text/link/file/image import works,
- import metadata (`title` / `project` / `category` / `tags`) is saved,
- left rail switches between `收集内容` and `生成内容`,
- project/category filters narrow the same knowledge store,
- selecting a list row opens its detail view without losing current filters,
- selecting an entry lets the user discuss that entry,
- discussing the current selection uses multiple entries without overloading the context,
- `保存为生成笔记` creates a generated entry,
- `追加到现有生成笔记` updates an existing generated entry,
- `仅保留对话` leaves the database unchanged,
- save/append failures keep the chat history and draft visible,
- generated content appears in unified search after create/append,
- existing `NotesPage` quick-capture entry path still works unchanged.
