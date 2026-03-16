# Pomodoro Break Chimes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit focus/break timer phases so classic mode can auto-run break countdowns with chimes, and flow mode can auto-start a calculated break countdown that only chimes when the break ends.

**Architecture:** Keep the current timer UI but extract the phase transition rules into testable helpers, extend `FocusSettings` with a configurable classic break duration, update `MediaContext` to manage `focus/break` phases explicitly, and minimally surface the current phase in the timer UI and settings.

**Tech Stack:** React 19, TypeScript, Web Audio API, node:test, existing VibeLife theme/media contexts

---

## Chunk 1: Timer Transition Helpers and Settings Compatibility

### Task 1: Add pure timer-phase helpers with failing tests

**Files:**
- Create: `frontend/src/context/pomodoroState.ts`
- Create: `frontend/tests/pomodoroState.test.mjs`
- Modify: `frontend/src/context/ThemeContext.tsx`

- [ ] Step 1: Create `frontend/tests/pomodoroState.test.mjs` with failing tests for:
  - classic focus completion enters break when `autoBreak` is on,
  - classic focus completion resets to idle focus when `autoBreak` is off,
  - classic break completion returns to idle focus,
  - flow stop derives `breakSeconds = ceil(focusMinutes / 10) * 60`,
  - flow break completion returns to idle focus,
  - legacy `focusSettings` storage without `breakDuration` is backfilled safely.
- [ ] Step 2: Run `node --test frontend/tests/pomodoroState.test.mjs`.
  Expected: fail because helper module and new setting are missing.
- [ ] Step 3: Add `breakDuration` to `FocusSettings` in `frontend/src/context/ThemeContext.tsx` with a safe default of `5`.
- [ ] Step 4: Create `frontend/src/context/pomodoroState.ts` with pure helpers for:
  - normalizing legacy `focusSettings`,
  - computing next state when focus completes,
  - computing flow break seconds,
  - resetting idle state for each mode.
- [ ] Step 5: Re-run `node --test frontend/tests/pomodoroState.test.mjs`.
  Expected: pass.

## Chunk 2: MediaContext State Machine

### Task 2: Rework MediaContext to track focus/break phases and trigger the right chimes

**Files:**
- Modify: `frontend/src/context/MediaContext.tsx`
- Reference: `frontend/src/utils/audio.ts`
- Reference: `frontend/src/context/pomodoroState.ts`

- [ ] Step 1: Add a failing assertion to `frontend/tests/pomodoroState.test.mjs` if any missing transition rule is still only implicit in `MediaContext`.
- [ ] Step 2: Run `node --test frontend/tests/pomodoroState.test.mjs`.
  Expected: fail if helper coverage is incomplete; otherwise use it as the red/green guard before context edits.
- [ ] Step 3: Extend `MediaContextType` and provider state with `timerPhase: 'focus' | 'break'`.
- [ ] Step 4: Update timer ticking logic so:
  - classic focus and classic break both count down,
  - flow focus counts up,
  - flow break counts down.
- [ ] Step 5: Change completion behavior so:
  - classic focus end plays `playChime('complete')`, records the session, and auto-starts break only when `autoBreak` is on,
  - classic break end plays `playChime('break')` and resets to idle focus,
  - flow stop while in focus records the session and immediately starts break without a chime,
  - flow break end plays `playChime('break')` and resets to idle flow.
- [ ] Step 6: Keep stop semantics intuitive:
  - classic stop always resets to idle focus,
  - flow stop during break cancels break and resets,
  - flow stop during focus ends focus and starts break.
- [ ] Step 7: Re-run `node --test frontend/tests/pomodoroState.test.mjs`.
  Expected: pass.

## Chunk 3: Timer UI and Settings Surface

### Task 3: Surface break duration and current phase in the UI

**Files:**
- Modify: `frontend/src/components/PomodoroTimer.tsx`
- Modify: `frontend/src/components/SettingsModal.tsx`
- Modify: `frontend/src/ui/vibelife/components/PomodoroTimerUI.tsx`
- Reference: `frontend/src/context/MediaContext.tsx`

- [ ] Step 1: Update the timer components to read `timerPhase` and show a small current-phase label (`专注中` / `休息中`) without redesigning the layout.
- [ ] Step 2: Ensure break countdowns render as countdowns in both timer UIs, including flow break mode.
- [ ] Step 3: Add a break-duration control to the focus settings panel in `frontend/src/components/SettingsModal.tsx`.
- [ ] Step 4: Keep existing classic duration and auto-break controls working with the new `breakDuration` field.
- [ ] Step 5: Verify that switching timer mode resets the phase to focus and shows the expected initial time.

## Chunk 4: Verification and Commit

### Task 4: Verify the pomodoro slice end to end and commit

**Files:**
- Verify: `frontend/tests/pomodoroState.test.mjs`

- [ ] Step 1: Run `node --test frontend/tests/pomodoroState.test.mjs`.
  Expected: pass.
- [ ] Step 2: Run `cd frontend && npx tsc --noEmit`.
  Expected: exit 0.
- [ ] Step 3: Run `cd frontend && npm run build`.
  Expected: exit 0. Existing Vite warnings are acceptable only if exit code stays 0.
- [ ] Step 4: Commit the slice.
  Run:
  ```bash
  git add frontend/src/context/ThemeContext.tsx frontend/src/context/pomodoroState.ts frontend/tests/pomodoroState.test.mjs frontend/src/context/MediaContext.tsx frontend/src/components/PomodoroTimer.tsx frontend/src/ui/vibelife/components/PomodoroTimerUI.tsx frontend/src/components/SettingsModal.tsx docs/superpowers/specs/2026-03-16-pomodoro-break-chimes-design.md docs/superpowers/plans/2026-03-16-pomodoro-break-chimes.md
  git commit -m "feat: add pomodoro break chimes"
  ```
