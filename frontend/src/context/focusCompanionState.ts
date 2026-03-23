import type { PomodoroPhase, TimerMode } from "./pomodoroState";

export type FocusCompanionSceneId =
  | "deep-focus"
  | "light-work"
  | "reset-break"
  | "night-wind";

export interface FocusCompanionTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: string;
  cover: string;
  sceneId: FocusCompanionSceneId;
  sourceKind?: "remote" | "imported";
}

export interface FocusCompanionSelection {
  currentTrackId: string;
  activeSceneId: FocusCompanionSceneId;
  lastTrackIdByScene: Partial<Record<FocusCompanionSceneId, string>>;
}

export const FOCUS_COMPANION_TRACKS: FocusCompanionTrack[] = [
  {
    id: "deep-focus-main",
    title: "Helix One",
    artist: "SoundHelix",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: "载入中",
    cover: "01",
    sceneId: "deep-focus",
    sourceKind: "remote",
  },
  {
    id: "deep-focus-grid",
    title: "Helix Two",
    artist: "SoundHelix",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: "载入中",
    cover: "02",
    sceneId: "deep-focus",
    sourceKind: "remote",
  },
  {
    id: "light-work-breeze",
    title: "Helix Three",
    artist: "SoundHelix",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: "载入中",
    cover: "03",
    sceneId: "light-work",
    sourceKind: "remote",
  },
  {
    id: "light-work-drift",
    title: "Helix Four",
    artist: "SoundHelix",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: "载入中",
    cover: "04",
    sceneId: "light-work",
    sourceKind: "remote",
  },
  {
    id: "reset-break-bell",
    title: "Helix Six",
    artist: "SoundHelix",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    duration: "载入中",
    cover: "05",
    sceneId: "reset-break",
    sourceKind: "remote",
  },
  {
    id: "night-wind-close",
    title: "Helix Fourteen",
    artist: "SoundHelix",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    duration: "载入中",
    cover: "06",
    sceneId: "night-wind",
    sourceKind: "remote",
  },
];

export interface ImportedFocusCompanionTrackInput {
  id: string;
  title: string;
  artist?: string | null;
  durationSeconds?: number | null;
  url: string;
}

const IMPORTED_TRACK_SCENE_ORDER: FocusCompanionSceneId[] = [
  "deep-focus",
  "light-work",
  "reset-break",
  "night-wind",
];

export const formatFocusCompanionDuration = (
  durationSeconds?: number | null
): string => {
  if (!Number.isFinite(durationSeconds) || durationSeconds === null || durationSeconds === undefined) {
    return "载入中";
  }

  const safeSeconds = Math.max(0, Math.floor(durationSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const buildImportedFocusCompanionTracks = (
  tracks: readonly ImportedFocusCompanionTrackInput[]
): FocusCompanionTrack[] =>
  tracks.map((track, index) => ({
    id: track.id,
    title: track.title,
    artist: String(track.artist || "").trim() || "本地音乐",
    url: track.url,
    duration: formatFocusCompanionDuration(track.durationSeconds),
    cover: (index + 1).toString().padStart(2, "0"),
    sceneId: IMPORTED_TRACK_SCENE_ORDER[index % IMPORTED_TRACK_SCENE_ORDER.length],
    sourceKind: "imported",
  }));

export const resolveFocusCompanionTracks = (
  importedTracks: readonly ImportedFocusCompanionTrackInput[]
): FocusCompanionTrack[] => {
  if (importedTracks.length === 0) {
    return FOCUS_COMPANION_TRACKS;
  }

  return buildImportedFocusCompanionTracks(importedTracks);
};

export const getFocusCompanionSceneForTimer = (
  timerMode: TimerMode,
  timerPhase: PomodoroPhase
): FocusCompanionSceneId => {
  if (timerPhase === "break") {
    return "reset-break";
  }

  return timerMode === "flow" ? "light-work" : "deep-focus";
};

export const getFocusCompanionTrackById = (
  tracks: readonly FocusCompanionTrack[],
  trackId: string
): FocusCompanionTrack | undefined => tracks.find((track) => track.id === trackId);

const getFirstTrackForScene = (
  tracks: readonly FocusCompanionTrack[],
  sceneId: FocusCompanionSceneId
): FocusCompanionTrack => {
  const match = tracks.find((track) => track.sceneId === sceneId);
  if (match) {
    return match;
  }

  const fallbackTrack = tracks[0];
  if (!fallbackTrack) {
    throw new Error(`No focus companion track found for scene ${sceneId}`);
  }

  return fallbackTrack;
};

export const createInitialFocusCompanionSelection = (
  tracks: readonly FocusCompanionTrack[]
): FocusCompanionSelection => {
  const initialTrack = getFirstTrackForScene(tracks, "deep-focus");
  return {
    currentTrackId: initialTrack.id,
    activeSceneId: initialTrack.sceneId,
    lastTrackIdByScene: {
      [initialTrack.sceneId]: initialTrack.id,
    },
  };
};

export const selectFocusCompanionTrack = (
  selection: FocusCompanionSelection,
  trackId: string,
  tracks: readonly FocusCompanionTrack[]
): FocusCompanionSelection => {
  const track = getFocusCompanionTrackById(tracks, trackId);
  if (!track) {
    return selection;
  }

  return {
    currentTrackId: track.id,
    activeSceneId: track.sceneId,
    lastTrackIdByScene: {
      ...selection.lastTrackIdByScene,
      [track.sceneId]: track.id,
    },
  };
};

export const syncFocusCompanionSelectionWithTimer = (
  selection: FocusCompanionSelection,
  tracks: readonly FocusCompanionTrack[],
  timerState: {
    timerMode: TimerMode;
    timerPhase: PomodoroPhase;
  }
): FocusCompanionSelection => {
  const desiredSceneId = getFocusCompanionSceneForTimer(
    timerState.timerMode,
    timerState.timerPhase
  );
  const currentTrack = getFocusCompanionTrackById(tracks, selection.currentTrackId);

  if (currentTrack?.sceneId === desiredSceneId) {
    return {
      ...selection,
      activeSceneId: desiredSceneId,
      lastTrackIdByScene: {
        ...selection.lastTrackIdByScene,
        [currentTrack.sceneId]: currentTrack.id,
      },
    };
  }

  const rememberedTrackId = selection.lastTrackIdByScene[desiredSceneId];
  const rememberedTrack = rememberedTrackId
    ? getFocusCompanionTrackById(tracks, rememberedTrackId)
    : undefined;
  const nextTrack =
    rememberedTrack?.sceneId === desiredSceneId
      ? rememberedTrack
      : getFirstTrackForScene(tracks, desiredSceneId);

  return {
    currentTrackId: nextTrack.id,
    activeSceneId: desiredSceneId,
    lastTrackIdByScene: {
      ...selection.lastTrackIdByScene,
      [desiredSceneId]: nextTrack.id,
    },
  };
};
