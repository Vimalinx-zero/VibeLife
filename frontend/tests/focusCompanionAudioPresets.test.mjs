import test from "node:test";
import assert from "node:assert/strict";

import {
  FOCUS_COMPANION_AUDIO_PRESETS,
  getFocusCompanionAudioPreset,
} from "../src/context/focusCompanionAudioPresets.ts";

test("every focus companion scene exposes an audible preset", () => {
  assert.deepEqual(
    Object.keys(FOCUS_COMPANION_AUDIO_PRESETS).sort(),
    ["deep-focus", "light-work", "night-wind", "reset-break"]
  );

  for (const preset of Object.values(FOCUS_COMPANION_AUDIO_PRESETS)) {
    assert.ok(preset.masterGain > 0, `expected ${preset.sceneId} to have positive gain`);
    assert.ok(preset.voices.length >= 2, `expected ${preset.sceneId} to have layered voices`);
    assert.ok(
      Math.max(...preset.voices.map((voice) => voice.frequency)) >= 329.63,
      `expected ${preset.sceneId} to include a clearly audible upper voice`
    );
  }
});

test("reset-break uses a brighter pad than deep-focus", () => {
  const focus = getFocusCompanionAudioPreset("deep-focus");
  const reset = getFocusCompanionAudioPreset("reset-break");

  const focusHighest = Math.max(...focus.voices.map((voice) => voice.frequency));
  const resetHighest = Math.max(...reset.voices.map((voice) => voice.frequency));

  assert.ok(resetHighest > focusHighest);
  assert.ok(reset.masterGain >= focus.masterGain);
});

test("night-wind stays softer than light-work", () => {
  const night = getFocusCompanionAudioPreset("night-wind");
  const light = getFocusCompanionAudioPreset("light-work");

  assert.ok(night.masterGain < light.masterGain);
});
