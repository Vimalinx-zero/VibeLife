import test from "node:test";
import assert from "node:assert/strict";

import {
  FOCUS_COMPANION_TRACKS,
  buildImportedFocusCompanionTracks,
  createInitialFocusCompanionSelection,
  getFocusCompanionSceneForTimer,
  getFocusCompanionTrackById,
  resolveFocusCompanionTracks,
  selectFocusCompanionTrack,
  syncFocusCompanionSelectionWithTimer,
} from "../src/context/focusCompanionState.ts";

test("focus companion maps timer state to the right scene", () => {
  assert.equal(getFocusCompanionSceneForTimer("classic", "focus"), "deep-focus");
  assert.equal(getFocusCompanionSceneForTimer("flow", "focus"), "light-work");
  assert.equal(getFocusCompanionSceneForTimer("classic", "break"), "reset-break");
  assert.equal(getFocusCompanionSceneForTimer("flow", "break"), "reset-break");
});

test("manual track selection remembers the preferred track for that scene", () => {
  const initial = createInitialFocusCompanionSelection(FOCUS_COMPANION_TRACKS);
  const nightWindTrack = FOCUS_COMPANION_TRACKS.find((track) => track.sceneId === "night-wind");
  assert.ok(nightWindTrack, "expected a night wind track in the curated list");

  const next = selectFocusCompanionTrack(initial, nightWindTrack.id, FOCUS_COMPANION_TRACKS);

  assert.equal(next.currentTrackId, nightWindTrack.id);
  assert.equal(next.lastTrackIdByScene["night-wind"], nightWindTrack.id);
});

test("timer sync switches to break and then restores the preferred focus companion", () => {
  const lightWorkTrack = FOCUS_COMPANION_TRACKS.find((track) => track.sceneId === "light-work");
  assert.ok(lightWorkTrack, "expected a light work track in the curated list");

  const withManualFocus = selectFocusCompanionTrack(
    createInitialFocusCompanionSelection(FOCUS_COMPANION_TRACKS),
    lightWorkTrack.id,
    FOCUS_COMPANION_TRACKS
  );

  const onBreak = syncFocusCompanionSelectionWithTimer(withManualFocus, FOCUS_COMPANION_TRACKS, {
    timerMode: "flow",
    timerPhase: "break",
  });
  const breakTrack = getFocusCompanionTrackById(FOCUS_COMPANION_TRACKS, onBreak.currentTrackId);
  assert.equal(breakTrack?.sceneId, "reset-break");

  const backToFlowFocus = syncFocusCompanionSelectionWithTimer(onBreak, FOCUS_COMPANION_TRACKS, {
    timerMode: "flow",
    timerPhase: "focus",
  });

  assert.equal(backToFlowFocus.currentTrackId, lightWorkTrack.id);
  assert.equal(backToFlowFocus.activeSceneId, "light-work");
});

test("focus companion uses multiple real remote songs instead of one shared placeholder loop", () => {
  const remoteUrls = FOCUS_COMPANION_TRACKS.map((track) => track.url);
  const uniqueUrls = new Set(remoteUrls);

  assert.ok(
    uniqueUrls.size >= 4,
    `expected at least 4 distinct remote songs, got ${uniqueUrls.size}`
  );

  for (const track of FOCUS_COMPANION_TRACKS) {
    assert.match(track.url, /^https:\/\/www\.soundhelix\.com\/examples\/mp3\/SoundHelix-Song-\d+\.mp3$/);
  }
});

test("focus companion prefers imported library tracks when available", () => {
  const importedTracks = resolveFocusCompanionTracks([
    {
      id: "music_1",
      title: "Morning Rain",
      artist: "Local Library",
      durationSeconds: 185,
      url: "http://127.0.0.1:43800/api/music/files/music_1?token=test-token",
    },
    {
      id: "music_2",
      title: "Night Steps",
      artist: "",
      durationSeconds: null,
      url: "http://127.0.0.1:43800/api/music/files/music_2?token=test-token",
    },
  ]);

  assert.equal(importedTracks.length, 2);
  assert.equal(importedTracks[0].id, "music_1");
  assert.equal(importedTracks[0].sourceKind, "imported");
  assert.equal(importedTracks[0].sceneId, "deep-focus");
  assert.equal(importedTracks[0].duration, "3:05");
  assert.equal(importedTracks[1].sceneId, "light-work");
  assert.equal(importedTracks[1].duration, "载入中");
});

test("focus companion falls back to the curated remote catalog when the library is empty", () => {
  const tracks = resolveFocusCompanionTracks([]);
  assert.equal(tracks, FOCUS_COMPANION_TRACKS);
});

test("focus companion keeps working when imported tracks do not cover every timer scene", () => {
  const importedTracks = buildImportedFocusCompanionTracks([
    {
      id: "music_only",
      title: "One Song Loop",
      artist: "Local Library",
      durationSeconds: 91,
      url: "http://127.0.0.1:43800/api/music/files/music_only?token=test-token",
    },
  ]);

  const initial = createInitialFocusCompanionSelection(importedTracks);
  const onBreak = syncFocusCompanionSelectionWithTimer(initial, importedTracks, {
    timerMode: "classic",
    timerPhase: "break",
  });

  assert.equal(onBreak.currentTrackId, "music_only");
  assert.equal(onBreak.activeSceneId, "reset-break");
});
