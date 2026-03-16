import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initAudioContext, playChime, playClick } from "../utils/audio";
import * as workbenchApi from "../utils/workbenchApi";
import { useTheme } from "./ThemeContext";
import {
  advancePomodoroState,
  completePomodoroFocus,
  createInitialPomodoroState,
  type PomodoroPhase,
  type PomodoroState,
  type TimerMode,
  type TimerStatus,
} from "./pomodoroState";

interface Track {
  id: number;
  title: string;
  artist: string;
  url: string;
  duration: string;
  cover: string;
}

interface AudioData {
  frequency: number;
  amplitude: number;
}

interface MediaContextType {
  isMusicPlaying: boolean;
  isMusicMuted: boolean;
  audioData: AudioData;
  tracks: Track[];
  currentTrackIndex: number;
  toggleMusic: () => Promise<void>;
  toggleMusicMute: () => void;
  setMusicVolume: (volume: number) => void;
  setMusicSource: (url: string) => void;
  getCurrentTrack: () => Track;
  playTrack: (index: number) => void;
  playNext: () => void;
  playPrevious: () => void;
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

  const tracks: Track[] = [
    {
      id: 1,
      title: "Deep Focus",
      artist: "FASSounds",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "3:19",
      cover: "🎵",
    },
    {
      id: 2,
      title: "Chill Lofi",
      artist: "FASSounds",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "2:54",
      cover: "🎶",
    },
    {
      id: 3,
      title: "Lofi Chill",
      artist: "FASSounds",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "3:06",
      cover: "🎼",
    },
    {
      id: 4,
      title: "Focus Flow",
      artist: "RelaxingBeats",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "4:15",
      cover: "🎹",
    },
    {
      id: 5,
      title: "Long Session",
      artist: "AmbientMusic",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "3:45",
      cover: "🎸",
    },
  ];

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
  const [audioData, setAudioData] = useState<AudioData>({ frequency: 0, amplitude: 0 });
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [pomodoro, setPomodoro] = useState<PomodoroState>(() => buildInitialPomodoroState("classic"));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const previousPomodoroRef = useRef<PomodoroState | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }
  }, []);

  const updateAudioData = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
    setAudioData({
      frequency: average,
      amplitude: average / 255,
    });

    if (isMusicPlaying) {
      requestAnimationFrame(updateAudioData);
    }
  }, [isMusicPlaying]);

  useEffect(() => {
    return;
  }, []);

  useEffect(() => {
    if (isMusicPlaying && analyserRef.current) {
      updateAudioData();
    }
  }, [isMusicPlaying, updateAudioData]);

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
      initAudioContext();
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

  const toggleMusic = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
      }
      setIsMusicPlaying(!isMusicPlaying);
    } catch (error) {
      console.error("Failed to toggle music:", error);
    }
  }, [isMusicPlaying]);

  const toggleMusicMute = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMusicMuted;
    setIsMusicMuted(!isMusicMuted);
  }, [isMusicMuted]);

  const setMusicVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, []);

  const setMusicSource = useCallback((url: string) => {
    if (!audioRef.current) return;

    const wasPlaying = !audioRef.current.paused;
    audioRef.current.pause();
    audioRef.current.src = url;
    audioRef.current.load();

    if (wasPlaying) {
      audioRef.current.play().catch((error) => console.error("Failed to play:", error));
    }
  }, []);

  const getCurrentTrack = useCallback((): Track => tracks[currentTrackIndex], [currentTrackIndex, tracks]);

  const playTrack = useCallback(
    (index: number) => {
      if (index < 0 || index >= tracks.length) return;

      const wasPlaying = isMusicPlaying;
      setCurrentTrackIndex(index);
      setMusicSource(tracks[index].url);

      if (wasPlaying) {
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch((error) => console.error("Failed to play:", error));
          }
        }, 100);
      }
    },
    [isMusicPlaying, setMusicSource, tracks]
  );

  const playNext = useCallback(() => {
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    playTrack(nextIndex);
  }, [currentTrackIndex, playTrack, tracks.length]);

  const playPrevious = useCallback(() => {
    const previousIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack(previousIndex);
  }, [currentTrackIndex, playTrack, tracks.length]);

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
    audioData,
    tracks,
    currentTrackIndex,
    toggleMusic,
    toggleMusicMute,
    setMusicVolume,
    setMusicSource,
    getCurrentTrack,
    playTrack,
    playNext,
    playPrevious,
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
