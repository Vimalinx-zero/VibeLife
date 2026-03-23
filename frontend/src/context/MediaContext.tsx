import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initAudioContext, playChime, playClick } from "../utils/audio";
import { type MusicLibraryTrackDTO, musicLibraryAPI } from "../utils/api";
import { buildAuthenticatedApiUrl } from "../utils/apiOrigin";
import * as workbenchApi from "../utils/workbenchApi";
import { useTheme } from "./ThemeContext";
import {
  FOCUS_COMPANION_TRACKS,
  resolveFocusCompanionTracks,
  type FocusCompanionSceneId,
  type FocusCompanionSelection,
  type FocusCompanionTrack,
  createInitialFocusCompanionSelection,
  getFocusCompanionTrackById,
  selectFocusCompanionTrack,
  syncFocusCompanionSelectionWithTimer,
} from "./focusCompanionState";
import {
  advancePomodoroState,
  completePomodoroFocus,
  createInitialPomodoroState,
  type PomodoroPhase,
  type PomodoroState,
  type TimerMode,
  type TimerStatus,
} from "./pomodoroState";

interface AudioData {
  frequency: number;
  amplitude: number;
}

interface MediaContextType {
  isMusicPlaying: boolean;
  isMusicMuted: boolean;
  musicVolume: number;
  audioData: AudioData;
  activeSceneId: FocusCompanionSceneId;
  tracks: FocusCompanionTrack[];
  hasImportedTracks: boolean;
  isMusicLibraryLoading: boolean;
  currentTrackIndex: number;
  musicCurrentTime: number;
  musicDuration: number;
  toggleMusic: () => Promise<void>;
  toggleMusicMute: () => void;
  setMusicVolume: (volume: number) => void;
  setMusicSource: (url: string) => void;
  seekMusic: (nextTimeSeconds: number) => void;
  getCurrentTrack: () => FocusCompanionTrack;
  playTrack: (index: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  importMusicFiles: (files: File[]) => Promise<number>;
  timerMode: TimerMode;
  timerPhase: PomodoroPhase;
  timerStatus: TimerStatus;
  timerSeconds: number;
  phaseTotalSeconds: number;
  flowDuration: number;
  customMinutes: number;
  breakMinutes: number;
  autoBreak: boolean;
  toggleTimer: () => void;
  stopTimer: () => void;
  switchTimerMode: (mode: TimerMode) => void;
  adjustTimerTime: (delta: number) => void;
  setTimerDuration: (minutes: number) => void;
  formatTime: (totalSeconds: number) => string;
}

const clampMinutes = (minutes: number) => Math.max(1, Math.min(120, Math.floor(minutes)));

interface MediaDebugApi {
  snapshot: () => {
    activeSceneId: FocusCompanionSceneId;
    analyserAmplitude: number;
    analyserFrequency: number;
    audioContextState: AudioContextState | "missing";
    currentTrackId: string;
    isMusicMuted: boolean;
    isMusicPlaying: boolean;
    lastError: string | null;
    musicCurrentTime: number;
    musicDuration: number;
    musicVolume: number;
    paused: boolean;
  };
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export const useMedia = () => {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error("useMedia must be used within MediaProvider");
  }
  return context;
};

export const MediaProvider = ({ children }: { children: ReactNode }) => {
  const { focusSettings, setFocusSettings } = useTheme();

  const buildInitialPomodoroState = useCallback(
    (mode: TimerMode) =>
      createInitialPomodoroState({
        timerMode: mode,
        focusMinutes: focusSettings.duration,
        breakMinutes: focusSettings.breakDuration,
        autoBreak: focusSettings.autoBreak,
      }),
    [focusSettings.autoBreak, focusSettings.breakDuration, focusSettings.duration]
  );

  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [isMusicMuted, setIsMusicMuted] = useState<boolean>(false);
  const [musicVolume, setMusicVolumeState] = useState<number>(0.5);
  const [audioData, setAudioData] = useState<AudioData>({ frequency: 0, amplitude: 0 });
  const [tracks, setTracks] = useState<FocusCompanionTrack[]>(FOCUS_COMPANION_TRACKS);
  const [hasImportedTracks, setHasImportedTracks] = useState<boolean>(false);
  const [isMusicLibraryLoading, setIsMusicLibraryLoading] = useState<boolean>(false);
  const [musicCurrentTime, setMusicCurrentTime] = useState<number>(0);
  const [musicDuration, setMusicDuration] = useState<number>(0);
  const [companionSelection, setCompanionSelection] = useState<FocusCompanionSelection>(() =>
    createInitialFocusCompanionSelection(FOCUS_COMPANION_TRACKS)
  );
  const [pomodoro, setPomodoro] = useState<PomodoroState>(() => buildInitialPomodoroState("classic"));
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const musicFrameRef = useRef<number | null>(null);
  const isMusicPlayingRef = useRef<boolean>(false);
  const shouldAutoplayAfterTrackChangeRef = useRef<boolean>(false);
  const musicErrorRef = useRef<string | null>(null);
  const previousPomodoroRef = useRef<PomodoroState | null>(null);

  const currentTrackIndex = Math.max(
    0,
    tracks.findIndex((track) => track.id === companionSelection.currentTrackId)
  );

  const currentTrack =
    getFocusCompanionTrackById(tracks, companionSelection.currentTrackId) ?? tracks[0];

  const mapLibraryTracksToCompanionTracks = useCallback(
    (libraryTracks: MusicLibraryTrackDTO[]): FocusCompanionTrack[] => {
      if (typeof window === "undefined") {
        return FOCUS_COMPANION_TRACKS;
      }

      const token = localStorage.getItem("token");
      return resolveFocusCompanionTracks(
        libraryTracks.map((track) => ({
          id: track.id,
          title: String(track.title || "").trim() || track.original_filename,
          artist: track.artist,
          durationSeconds: track.duration_seconds,
          url: buildAuthenticatedApiUrl({
            path: track.stream_path,
            token,
            configuredOrigin: window.__VIBELIFE_API_ORIGIN__,
            port: window.location.port,
          }),
        }))
      );
    },
    []
  );

  const refreshMusicLibrary = useCallback(async (): Promise<void> => {
    if (typeof window === "undefined") {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setTracks(FOCUS_COMPANION_TRACKS);
      setHasImportedTracks(false);
      return;
    }

    setIsMusicLibraryLoading(true);
    try {
      const libraryTracks = await musicLibraryAPI.list();
      setTracks(mapLibraryTracksToCompanionTracks(libraryTracks));
      setHasImportedTracks(libraryTracks.length > 0);
    } catch (error) {
      console.error("Failed to load music library, falling back to remote catalog:", error);
      setTracks(FOCUS_COMPANION_TRACKS);
      setHasImportedTracks(false);
    } finally {
      setIsMusicLibraryLoading(false);
    }
  }, [mapLibraryTracksToCompanionTracks]);

  const importMusicFiles = useCallback(
    async (files: File[]): Promise<number> => {
      const uniqueFiles = files.filter((file, index) => files.findIndex((candidate) => {
        return (
          candidate.name === file.name &&
          candidate.size === file.size &&
          candidate.lastModified === file.lastModified
        );
      }) === index);

      if (uniqueFiles.length === 0) {
        return 0;
      }

      setIsMusicLibraryLoading(true);
      try {
        const importedTracks = await musicLibraryAPI.importFiles(uniqueFiles);
        const libraryTracks = await musicLibraryAPI.list();
        setTracks(mapLibraryTracksToCompanionTracks(libraryTracks));
        setHasImportedTracks(libraryTracks.length > 0);
        return importedTracks.length;
      } finally {
        setIsMusicLibraryLoading(false);
      }
    },
    [mapLibraryTracksToCompanionTracks]
  );

  const stopMusicFrame = useCallback(() => {
    if (musicFrameRef.current !== null) {
      window.cancelAnimationFrame(musicFrameRef.current);
      musicFrameRef.current = null;
    }
  }, []);

  const sampleAudioElement = useCallback(() => {
    const audio = audioElementRef.current;
    if (!audio) {
      return;
    }

    const nextCurrentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const pulse = audio.paused ? 0 : 0.12 + Math.abs(Math.sin(nextCurrentTime * 1.9)) * 0.22;

    setMusicCurrentTime(nextCurrentTime);
    setMusicDuration(nextDuration);
    setAudioData({
      frequency: pulse * 255,
      amplitude: pulse,
    });

    if (!audio.paused) {
      musicFrameRef.current = window.requestAnimationFrame(sampleAudioElement);
    }
  }, []);

  const startMusicFrame = useCallback(() => {
    stopMusicFrame();
    sampleAudioElement();
  }, [sampleAudioElement, stopMusicFrame]);

  useEffect(() => {
    isMusicPlayingRef.current = isMusicPlaying;
  }, [isMusicPlaying]);

  useEffect(() => {
    void refreshMusicLibrary();
  }, [refreshMusicLibrary]);

  useEffect(() => {
    const isLocalRuntime =
      window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";

    if (!import.meta.env.DEV && !isLocalRuntime) {
      return;
    }

    const globalWindow = window as typeof window & {
      __VIBELIFE_MEDIA_DEBUG__?: MediaDebugApi;
    };

    globalWindow.__VIBELIFE_MEDIA_DEBUG__ = {
      snapshot: () => ({
        activeSceneId: companionSelection.activeSceneId,
        analyserAmplitude: audioData.amplitude,
        analyserFrequency: audioData.frequency,
        audioContextState: audioContextRef.current?.state ?? "missing",
        currentTrackId: companionSelection.currentTrackId,
        isMusicMuted,
        isMusicPlaying,
        lastError: musicErrorRef.current,
        musicCurrentTime,
        musicDuration,
        musicVolume,
        paused: audioElementRef.current?.paused ?? true,
      }),
    };

    return () => {
      if (globalWindow.__VIBELIFE_MEDIA_DEBUG__) {
        delete globalWindow.__VIBELIFE_MEDIA_DEBUG__;
      }
    };
  }, [
    companionSelection.activeSceneId,
    companionSelection.currentTrackId,
    isMusicMuted,
    isMusicPlaying,
    musicCurrentTime,
    musicDuration,
    musicVolume,
    audioData.amplitude,
    audioData.frequency,
  ]);

  useEffect(() => {
    const nextFocusMinutes = clampMinutes(focusSettings.duration);
    const nextBreakMinutes = clampMinutes(focusSettings.breakDuration);
    const nextAutoBreak = focusSettings.autoBreak;

    setPomodoro((current) => {
      const nextState: PomodoroState = {
        ...current,
        focusMinutes: nextFocusMinutes,
        breakMinutes: nextBreakMinutes,
        autoBreak: nextAutoBreak,
      };

      if (current.timerStatus === "idle") {
        if (current.timerMode === "classic" && current.phase === "focus") {
          nextState.timerSeconds = nextFocusMinutes * 60;
          nextState.phaseTotalSeconds = nextFocusMinutes * 60;
        } else if (current.timerMode === "classic" && current.phase === "break") {
          nextState.timerSeconds = nextBreakMinutes * 60;
          nextState.phaseTotalSeconds = nextBreakMinutes * 60;
        } else if (current.timerMode === "flow" && current.phase === "focus") {
          nextState.timerSeconds = 0;
          nextState.phaseTotalSeconds = 0;
        }
      }

      const isUnchanged =
        current.focusMinutes === nextState.focusMinutes &&
        current.breakMinutes === nextState.breakMinutes &&
        current.autoBreak === nextState.autoBreak &&
        current.timerSeconds === nextState.timerSeconds &&
        current.phaseTotalSeconds === nextState.phaseTotalSeconds;

      return isUnchanged ? current : nextState;
    });
  }, [focusSettings.autoBreak, focusSettings.breakDuration, focusSettings.duration]);

  useEffect(() => {
    if (pomodoro.timerStatus !== "running") {
      return;
    }

    const interval = setInterval(() => {
      setPomodoro((current) => advancePomodoroState(current));
    }, 1000);

    return () => clearInterval(interval);
  }, [pomodoro.timerStatus]);

  useEffect(() => {
    if (pomodoro.chimes.length === 0) {
      return;
    }

    try {
      audioContextRef.current = initAudioContext();
      pomodoro.chimes.forEach((chime) => playChime(chime));
    } catch (error) {
      console.error("Failed to play pomodoro chime:", error);
    } finally {
      setPomodoro((current) => (current.chimes.length === 0 ? current : { ...current, chimes: [] }));
    }
  }, [pomodoro.chimes]);

  useEffect(() => {
    const previous = previousPomodoroRef.current;

    if (previous && previous.phase === "focus" && pomodoro.phase === "break") {
      const durationMinutes =
        previous.timerMode === "classic"
          ? Math.max(1, previous.focusMinutes)
          : Math.max(1, Math.ceil(previous.flowDuration / 60));

      void workbenchApi
        .createFocusSession(durationMinutes, previous.timerMode, 0)
        .then(() => {
          console.log(`Focus session recorded: ${durationMinutes} minutes in ${previous.timerMode} mode`);
        })
        .catch((error) => {
          console.error("Failed to record focus session:", error);
        });
    }

    previousPomodoroRef.current = pomodoro;
  }, [pomodoro]);

  useEffect(() => {
    setCompanionSelection((current) =>
      syncFocusCompanionSelectionWithTimer(current, tracks, {
        timerMode: pomodoro.timerMode,
        timerPhase: pomodoro.phase,
      })
    );
  }, [pomodoro.phase, pomodoro.timerMode, tracks]);

  useEffect(() => {
    if (tracks.length === 0) {
      return;
    }

    setCompanionSelection((current) => {
      const currentTrackInLibrary = getFocusCompanionTrackById(tracks, current.currentTrackId);
      if (currentTrackInLibrary) {
        return current;
      }
      return createInitialFocusCompanionSelection(tracks);
    });
  }, [tracks]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const audio = new Audio();
    audio.preload = "metadata";
    audioElementRef.current = audio;

    return () => {
      stopMusicFrame();
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioElementRef.current = null;
    };
  }, [stopMusicFrame]);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) {
      return;
    }

    const handlePlay = () => {
      musicErrorRef.current = null;
      setIsMusicPlaying(true);
      startMusicFrame();
    };

    const handlePause = () => {
      stopMusicFrame();
      setIsMusicPlaying(false);
      setAudioData({ frequency: 0, amplitude: 0 });
    };

    const handleLoadedMetadata = () => {
      setMusicDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const handleTimeUpdate = () => {
      sampleAudioElement();
    };

    const handleEnded = () => {
      stopMusicFrame();
      setMusicCurrentTime(0);
      setAudioData({ frequency: 0, amplitude: 0 });
      shouldAutoplayAfterTrackChangeRef.current = true;
      const nextIndex = (currentTrackIndex + 1) % tracks.length;
      setCompanionSelection((current) =>
        selectFocusCompanionTrack(current, tracks[nextIndex].id, tracks)
      );
    };

    const handleError = () => {
      stopMusicFrame();
      setIsMusicPlaying(false);
      setAudioData({ frequency: 0, amplitude: 0 });
      musicErrorRef.current = audio.error
        ? `HTMLMediaError ${audio.error.code}`
        : "Failed to load remote audio";
      console.error("Failed to load remote music source:", musicErrorRef.current, currentTrack.url);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [currentTrack.url, currentTrackIndex, sampleAudioElement, startMusicFrame, stopMusicFrame, tracks]);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) {
      return;
    }

    const shouldResume =
      shouldAutoplayAfterTrackChangeRef.current || isMusicPlayingRef.current;
    shouldAutoplayAfterTrackChangeRef.current = false;

    stopMusicFrame();
    setMusicCurrentTime(0);
    setMusicDuration(0);
    setAudioData({ frequency: 0, amplitude: 0 });
    musicErrorRef.current = null;

    audio.pause();
    audio.src = currentTrack.url;
    audio.load();

    if (shouldResume) {
      void audio.play().catch((error) => {
        musicErrorRef.current = error instanceof Error ? error.message : String(error);
        console.error("Failed to autoplay selected track:", error);
        setIsMusicPlaying(false);
      });
    }
  }, [currentTrack.id, currentTrack.url, stopMusicFrame]);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) {
      return;
    }

    audio.muted = isMusicMuted;
    audio.volume = isMusicMuted ? 0 : musicVolume;
  }, [isMusicMuted, musicVolume]);

  const toggleMusic = useCallback(async () => {
    const audio = audioElementRef.current;
    if (!audio) {
      return;
    }

    try {
      musicErrorRef.current = null;
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      musicErrorRef.current = error instanceof Error ? error.message : String(error);
      console.error("Failed to toggle music:", error);
    }
  }, []);

  const toggleMusicMute = useCallback(() => {
    setIsMusicMuted((current) => !current);
  }, []);

  const setMusicVolume = useCallback((volume: number) => {
    const nextVolume = Math.max(0, Math.min(1, volume));
    setMusicVolumeState(nextVolume);
  }, []);

  const setMusicSource = useCallback((url: string) => {
    const nextTrackIndex = tracks.findIndex((track) => track.url === url);
    if (nextTrackIndex >= 0) {
      setCompanionSelection((current) =>
        selectFocusCompanionTrack(current, tracks[nextTrackIndex].id, tracks)
      );
      return;
    }

    console.info("Ignoring unknown music source:", url);
  }, [tracks]);

  const seekMusic = useCallback((nextTimeSeconds: number) => {
    const audio = audioElementRef.current;
    if (!audio) {
      return;
    }

    const safeDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (safeDuration <= 0) {
      return;
    }

    audio.currentTime = Math.max(0, Math.min(safeDuration, nextTimeSeconds));
    sampleAudioElement();
  }, [sampleAudioElement]);

  const getCurrentTrack = useCallback((): FocusCompanionTrack => currentTrack, [currentTrack]);

  const playTrack = useCallback(
    (index: number) => {
      if (index < 0 || index >= tracks.length) return;

      shouldAutoplayAfterTrackChangeRef.current =
        !(audioElementRef.current?.paused ?? true) || isMusicPlayingRef.current;
      setCompanionSelection((current) =>
        selectFocusCompanionTrack(current, tracks[index].id, tracks)
      );
    },
    [tracks]
  );

  const playNext = useCallback(() => {
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    playTrack(nextIndex);
  }, [currentTrackIndex, playTrack, tracks.length]);

  const playPrevious = useCallback(() => {
    const previousIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack(previousIndex);
  }, [currentTrackIndex, playTrack, tracks.length]);

  useEffect(() => {
    const handleTogglePlay = () => {
      void toggleMusic();
    };
    const handleToggleMute = () => {
      toggleMusicMute();
    };
    const handleVolumeUp = () => {
      setMusicVolume(musicVolume + 0.1);
    };
    const handleVolumeDown = () => {
      setMusicVolume(musicVolume - 0.1);
    };
    const handleRandomTrack = () => {
      const sceneTracks = tracks.filter((track) => track.sceneId === companionSelection.activeSceneId);
      const pool = sceneTracks.length > 0 ? sceneTracks : tracks;
      const currentIndexInPool = Math.max(
        0,
        pool.findIndex((track) => track.id === companionSelection.currentTrackId)
      );
      const nextTrack = pool[(currentIndexInPool + 1) % pool.length];
      setCompanionSelection((current) =>
        selectFocusCompanionTrack(current, nextTrack.id, tracks)
      );
    };

    window.addEventListener("music-play-pause", handleTogglePlay);
    window.addEventListener("music-mute", handleToggleMute);
    window.addEventListener("music-volume-up", handleVolumeUp);
    window.addEventListener("music-volume-down", handleVolumeDown);
    window.addEventListener("music-random", handleRandomTrack);

    return () => {
      window.removeEventListener("music-play-pause", handleTogglePlay);
      window.removeEventListener("music-mute", handleToggleMute);
      window.removeEventListener("music-volume-up", handleVolumeUp);
      window.removeEventListener("music-volume-down", handleVolumeDown);
      window.removeEventListener("music-random", handleRandomTrack);
    };
  }, [
    companionSelection.activeSceneId,
    companionSelection.currentTrackId,
    musicVolume,
    setMusicVolume,
    toggleMusic,
    toggleMusicMute,
    tracks,
  ]);

  const toggleTimer = useCallback(() => {
    playClick();
    setPomodoro((current) => ({
      ...current,
      timerStatus: current.timerStatus === "running" ? "paused" : "running",
    }));
  }, []);

  const stopTimer = useCallback(() => {
    setPomodoro((current) => {
      if (current.timerMode === "flow" && current.phase === "focus" && current.flowDuration > 0) {
        return completePomodoroFocus(current);
      }
      return buildInitialPomodoroState(current.timerMode);
    });
  }, [buildInitialPomodoroState]);

  const switchTimerMode = useCallback(
    (mode: TimerMode) => {
      setPomodoro(buildInitialPomodoroState(mode));
    },
    [buildInitialPomodoroState]
  );

  const setTimerDuration = useCallback(
    (minutes: number) => {
      const nextMinutes = clampMinutes(minutes);
      setFocusSettings((current) => ({ ...current, duration: nextMinutes }));

      setPomodoro((current) => {
        if (current.timerMode !== "classic" || current.phase !== "focus" || current.timerStatus !== "idle") {
          return current.focusMinutes === nextMinutes ? current : { ...current, focusMinutes: nextMinutes };
        }

        return {
          ...current,
          focusMinutes: nextMinutes,
          timerSeconds: nextMinutes * 60,
          phaseTotalSeconds: nextMinutes * 60,
        };
      });
    },
    [setFocusSettings]
  );

  const adjustTimerTime = useCallback(
    (delta: number) => {
      if (pomodoro.timerStatus !== "idle" || pomodoro.timerMode !== "classic" || pomodoro.phase !== "focus") {
        return;
      }
      setTimerDuration(pomodoro.focusMinutes + delta);
    },
    [pomodoro.focusMinutes, pomodoro.phase, pomodoro.timerMode, pomodoro.timerStatus, setTimerDuration]
  );

  const formatTime = useCallback((totalSeconds: number): string => {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const value: MediaContextType = {
    isMusicPlaying,
    isMusicMuted,
    musicVolume,
    audioData,
    activeSceneId: companionSelection.activeSceneId,
    tracks,
    hasImportedTracks,
    isMusicLibraryLoading,
    currentTrackIndex,
    musicCurrentTime,
    musicDuration,
    toggleMusic,
    toggleMusicMute,
    setMusicVolume,
    setMusicSource,
    seekMusic,
    getCurrentTrack,
    playTrack,
    playNext,
    playPrevious,
    importMusicFiles,
    timerMode: pomodoro.timerMode,
    timerPhase: pomodoro.phase,
    timerStatus: pomodoro.timerStatus,
    timerSeconds: pomodoro.timerSeconds,
    phaseTotalSeconds: pomodoro.phaseTotalSeconds,
    flowDuration: pomodoro.flowDuration,
    customMinutes: pomodoro.focusMinutes,
    breakMinutes: pomodoro.breakMinutes,
    autoBreak: pomodoro.autoBreak,
    toggleTimer,
    stopTimer,
    switchTimerMode,
    adjustTimerTime,
    setTimerDuration,
    formatTime,
  };

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
};
