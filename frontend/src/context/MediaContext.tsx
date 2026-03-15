import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { playChime, playClick } from "../utils/audio";
import * as workbenchApi from "../utils/workbenchApi";

type TimerMode = 'classic' | 'flow';
type TimerStatus = 'idle' | 'running' | 'paused';

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
  // Music
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
  // Timer
  timerMode: TimerMode;
  timerStatus: TimerStatus;
  timerSeconds: number;
  flowDuration: number;
  customMinutes: number;
  toggleTimer: () => void;
  stopTimer: () => void;
  switchTimerMode: (mode: TimerMode) => void;
  adjustTimerTime: (delta: number) => void;
  formatTime: (totalSeconds: number) => string;
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
  // ✅ 音乐曲目列表（使用稳定的免费音频源）
  const tracks: Track[] = [
    {
      id: 1,
      title: "Deep Focus",
      artist: "FASSounds",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "3:19",
      cover: "🎵"
    },
    {
      id: 2,
      title: "Chill Lofi",
      artist: "FASSounds",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "2:54",
      cover: "🎶"
    },
    {
      id: 3,
      title: "Lofi Chill",
      artist: "FASSounds",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "3:06",
      cover: "🎼"
    },
    {
      id: 4,
      title: "Focus Flow",
      artist: "RelaxingBeats",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "4:15",
      cover: "🎹"
    },
    {
      id: 5,
      title: "Long Session",
      artist: "AmbientMusic",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "3:45",
      cover: "🎸"
    }
  ];

  // Music State
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [isMusicMuted, setIsMusicMuted] = useState<boolean>(false);
  const [audioData, setAudioData] = useState<AudioData>({ frequency: 0, amplitude: 0 });
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Initialize audio element on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }
  }, []);

  // Timer State
  const [timerMode, setTimerMode] = useState<TimerMode>('classic');
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const [timerSeconds, setTimerSeconds] = useState<number>(25 * 60);
  const [flowDuration, setFlowDuration] = useState<number>(0);
  const [customMinutes, setCustomMinutes] = useState<number>(25);

  // Audio visualization update function
  const updateAudioData = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
    setAudioData({
      frequency: average,
      amplitude: average / 255
    });

    if (isMusicPlaying) {
      requestAnimationFrame(updateAudioData);
    }
  }, [isMusicPlaying]);

  // Initialize audio context for visualization
  // Disabled due to CORS restrictions on external audio files
  // Audio will play normally, but visualization won't work
  useEffect(() => {
    // Skip audio context initialization to avoid CORS errors
    return;
  }, []);

  // Update audio visualization when playing
  useEffect(() => {
    if (isMusicPlaying && analyserRef.current) {
      updateAudioData();
    }
  }, [isMusicPlaying, updateAudioData]);

  // Timer completion handler
  const handleTimerComplete = useCallback(async () => {
    setTimerStatus('idle');

    // ✅ 确保 AudioContext 已初始化（用户已交互）
    try {
      // 初始化 AudioContext（用户已经点击了开始按钮）
      const { initAudioContext } = await import('../utils/audio');
      initAudioContext();
      // 播放完成铃声
      playChime('complete');
    } catch (error) {
      console.error('Failed to play completion chime:', error);
    }

    // Calculate focus duration
    let durationMinutes = 0;
    if (timerMode === 'classic') {
      durationMinutes = Math.round((customMinutes * 60 - timerSeconds) / 60);
      if (durationMinutes < 1) durationMinutes = customMinutes; // At least 1 minute
      setTimerSeconds(customMinutes * 60);
    } else {
      durationMinutes = Math.round(flowDuration / 60);
      if (durationMinutes < 1) durationMinutes = 1;
      setFlowDuration(0);
      setTimerSeconds(0);
    }

    // Record focus session to database
    try {
      await workbenchApi.createFocusSession(
        durationMinutes,
        timerMode,
        0
      );
      console.log(`Focus session recorded: ${durationMinutes} minutes in ${timerMode} mode`);
    } catch (error) {
      console.error('Failed to record focus session:', error);
    }
  }, [timerMode, customMinutes, timerSeconds, flowDuration]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerStatus === 'running') {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (timerMode === 'classic') {
            if (prev <= 1) {
              handleTimerComplete();
              return 0;
            }
            return prev - 1;
          } else {
            return prev + 1;
          }
        });

        if (timerMode === 'flow') {
          setFlowDuration(prev => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerStatus, timerMode, handleTimerComplete]);

  // Music controls
  const toggleMusic = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      }
      setIsMusicPlaying(!isMusicPlaying);
    } catch (e) {
      console.error("Failed to toggle music:", e);
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

    // Pause current audio before loading new source
    audioRef.current.pause();

    // Update source and load
    audioRef.current.src = url;
    audioRef.current.load();

    // Resume if it was playing
    if (wasPlaying) {
      audioRef.current.play().catch(e => console.error("Failed to play:", e));
    }
  }, []);

  // ✅ 新增：获取当前曲目
  const getCurrentTrack = useCallback((): Track => {
    return tracks[currentTrackIndex];
  }, [currentTrackIndex, tracks]);

  // ✅ 新增：播放指定曲目
  const playTrack = useCallback((index: number) => {
    if (index < 0 || index >= tracks.length) return;
    const wasPlaying = isMusicPlaying;
    setCurrentTrackIndex(index);
    setMusicSource(tracks[index].url);
    // 如果正在播放，切换后继续播放
    if (wasPlaying) {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.error("Failed to play:", e));
        }
      }, 100);
    }
  }, [isMusicPlaying, tracks, setMusicSource]);

  // ✅ 新增：下一首
  const playNext = useCallback(() => {
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    playTrack(nextIndex);
  }, [currentTrackIndex, tracks.length, playTrack]);

  // ✅ 新增：上一首
  const playPrevious = useCallback(() => {
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack(prevIndex);
  }, [currentTrackIndex, tracks.length, playTrack]);

  // Timer controls
  const toggleTimer = useCallback(() => {
    playClick();
    if (timerStatus === 'idle' || timerStatus === 'paused') {
      setTimerStatus('running');
    } else {
      setTimerStatus('paused');
    }
  }, [timerStatus]);

  const stopTimer = useCallback(() => {
    setTimerStatus('idle');
    if (timerMode === 'classic') {
      setTimerSeconds(customMinutes * 60);
    } else {
      setTimerSeconds(0);
      setFlowDuration(0);
    }
  }, [timerMode, customMinutes]);

  const switchTimerMode = useCallback((mode: TimerMode) => {
    setTimerMode(mode);
    setTimerStatus('idle');
    setFlowDuration(0);
    if (mode === 'classic') {
      setTimerSeconds(customMinutes * 60);
    } else {
      setTimerSeconds(0);
    }
  }, [customMinutes]);

  const adjustTimerTime = useCallback((delta: number) => {
    if (timerStatus !== 'idle' || timerMode !== 'classic') return;
    const newMinutes = Math.max(1, Math.min(120, customMinutes + delta));
    setCustomMinutes(newMinutes);
    setTimerSeconds(newMinutes * 60);
  }, [timerStatus, timerMode, customMinutes]);

  const formatTime = useCallback((totalSeconds: number): string => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const value: MediaContextType = {
    // Music
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
    // Timer
    timerMode,
    timerStatus,
    timerSeconds,
    flowDuration,
    customMinutes,
    toggleTimer,
    stopTimer,
    switchTimerMode,
    adjustTimerTime,
    formatTime
  };

  return (
    <MediaContext.Provider value={value}>
      {children}
    </MediaContext.Provider>
  );
};
