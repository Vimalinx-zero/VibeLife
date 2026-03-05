# FlowStudy UI Extract (UI-only)

This folder extracts FlowStudy's UI look & feel (glassmorphism, typography, layout, motion) into reusable, content-agnostic components.

Goal: you can build a new tool system on top of this UI without copying business logic.

## What is included

- Presentational components only (no API calls, no app-specific context)
- Tailwind-first styling (dark mode via `class`)
- Uses `framer-motion` where the original UI relied on it

## Tailwind / global CSS assumptions

FlowStudy uses:

- `darkMode: 'class'`
- Inter font
- Some global utilities in `src/index.css` (e.g. `.glass-panel`)

## Components

- `GlassCard`
- `PanelTabs`
- `FocusWorkbenchLayout`
- `PomodoroTimerUI`
- `MusicPlayerBarUI`
- `ContextMenuUI`
- `HoverTopTray`
- `LoadingScreenUI`
- `MusicVisualizerRings`
- `ModalShell`
- `Skeletons` (Card/Text/Pulse)

## Optional CSS helpers

`custom-scrollbar` is used across the app. If you want to reuse it outside FlowStudy, see:

- `frontend/src/ui/flowstudy/flowstudy-ui.css`
