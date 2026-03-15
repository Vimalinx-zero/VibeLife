# OpenClaw VibeLife Tooling Design

**Date:** 2026-03-15

## Goal

Make VibeLife usable as a practical OpenClaw backend for daily work by closing the remaining project-management gap and removing plugin tools that target endpoints the backend does not serve.

## Current State

- The backend already exposes authenticated CRUD-style routes for todos, notes, journal, schedule, projects, quick capture, dashboard, and workbench sessions.
- The OpenClaw plugin already maps most of those capabilities into tools.
- Two mismatches remain on the critical path:
  - projects can be listed and updated, but cannot be created through the API or plugin
  - the plugin still advertises `study` and `pomodoro` tools that call `/api/study/*` and `/api/pomodoro/*`, which are not active backend endpoints

## Design

### Backend

- Add a dedicated `ProjectCreate` request model in [`backend/project_routes.py`](/home/vimalinx/Projects/VibeLifes/VibeLife/backend/project_routes.py).
- Add `POST /api/projects` to create a user-scoped project with sane defaults for category, subtitle, status, and next action.
- Return the serialized project in the same shape already used by project update flows.

### OpenClaw plugin

- Add a new `vibelife_project_create` tool in [`openclaw-vibelife-plugin/index.js`](/home/vimalinx/Projects/VibeLifes/VibeLife/openclaw-vibelife-plugin/index.js).
- Map the tool to `POST /api/projects`.
- Remove plugin tools that target dead `study` / `pomodoro` endpoints so OpenClaw no longer sees capabilities that cannot succeed.

### Verification

- Add a backend integration test for authenticated project creation.
- Add a plugin test that verifies:
  - `vibelife_project_create` is registered
  - dead `study` / `pomodoro` tools are not registered
  - the project-create tool calls the correct backend path and payload
- Run an authenticated smoke flow against the live backend for representative VibeLife domains.

## Non-Goals

- Reintroducing the old study/pomodoro API surface
- Broad refactors of legacy models that are not required for OpenClaw interoperability
- New frontend UI work
