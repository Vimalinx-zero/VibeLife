import test from "node:test";
import assert from "node:assert/strict";

import {
  advancePomodoroState,
  completePomodoroFocus,
  createInitialPomodoroState,
} from "../src/context/pomodoroState.ts";

test("classic focus completion plays complete and auto-starts configurable break", () => {
  const state = createInitialPomodoroState({
    timerMode: "classic",
    focusMinutes: 25,
    breakMinutes: 7,
    autoBreak: true,
  });

  const next = advancePomodoroState({
    ...state,
    phase: "focus",
    timerStatus: "running",
    timerSeconds: 1,
  });

  assert.equal(next.phase, "break");
  assert.equal(next.timerStatus, "running");
  assert.equal(next.timerSeconds, 7 * 60);
  assert.equal(next.phaseTotalSeconds, 7 * 60);
  assert.deepEqual(next.chimes, ["complete"]);
});

test("classic focus completion without auto-break idles on configured break duration", () => {
  const state = createInitialPomodoroState({
    timerMode: "classic",
    focusMinutes: 30,
    breakMinutes: 10,
    autoBreak: false,
  });

  const next = advancePomodoroState({
    ...state,
    phase: "focus",
    timerStatus: "running",
    timerSeconds: 1,
  });

  assert.equal(next.phase, "break");
  assert.equal(next.timerStatus, "idle");
  assert.equal(next.timerSeconds, 10 * 60);
  assert.equal(next.phaseTotalSeconds, 10 * 60);
  assert.deepEqual(next.chimes, ["complete"]);
});

test("classic break completion plays break and returns to focus idle", () => {
  const state = createInitialPomodoroState({
    timerMode: "classic",
    focusMinutes: 25,
    breakMinutes: 5,
    autoBreak: true,
  });

  const next = advancePomodoroState({
    ...state,
    phase: "break",
    timerStatus: "running",
    timerSeconds: 1,
  });

  assert.equal(next.phase, "focus");
  assert.equal(next.timerStatus, "idle");
  assert.equal(next.timerSeconds, 25 * 60);
  assert.equal(next.phaseTotalSeconds, 25 * 60);
  assert.deepEqual(next.chimes, ["break"]);
});

test("flow focus completion enters derived break without complete chime and auto-starts break", () => {
  const state = createInitialPomodoroState({
    timerMode: "flow",
    focusMinutes: 25,
    breakMinutes: 5,
    autoBreak: true,
  });

  const next = completePomodoroFocus({
    ...state,
    phase: "focus",
    timerStatus: "running",
    timerSeconds: 23 * 60,
    flowDuration: 23 * 60,
  });

  assert.equal(next.phase, "break");
  assert.equal(next.timerStatus, "running");
  assert.equal(next.timerSeconds, 3 * 60);
  assert.equal(next.phaseTotalSeconds, 3 * 60);
  assert.deepEqual(next.chimes, []);
});

test("flow break completion plays break and resets to zeroed focus idle", () => {
  const state = createInitialPomodoroState({
    timerMode: "flow",
    focusMinutes: 25,
    breakMinutes: 5,
    autoBreak: false,
  });

  const next = advancePomodoroState({
    ...state,
    phase: "break",
    timerStatus: "running",
    timerSeconds: 1,
    flowDuration: 44 * 60,
  });

  assert.equal(next.phase, "focus");
  assert.equal(next.timerStatus, "idle");
  assert.equal(next.timerSeconds, 0);
  assert.equal(next.flowDuration, 0);
  assert.equal(next.phaseTotalSeconds, 0);
  assert.deepEqual(next.chimes, ["break"]);
});
