import { useState, useEffect, memo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMedia } from "../context/MediaContext";

const Icons = {
  Play: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>,
  Pause: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>,
  SkipNext: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M5.25 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653zm12.496 11.894V8.056l5.497 3.745-5.497 3.745z" /></svg>,
  SkipPrev: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.75 5.653c0-1.426-1.529-2.33-2.779-1.643L4.431 10.358c-1.295.712-1.295 2.573 0 3.285L15.97 19.991c1.25.687 2.779-.217 2.779-1.643V5.653zM6.254 17.547V8.056l.712.436-5.497 3.745 5.497 3.745-.712.564z" /></svg>,
  Volume: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" /></svg>,
  VolumeX: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 10-1.06-1.06l-1.72 1.72-1.72-1.72z" /></svg>,
  List: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2.625 6.75a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875 0A.75.75 0 018.25 6h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75zM2.625 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zM7.5 12a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12A.75.75 0 017.5 12zm-4.875 5.25a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875 0a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>,
};

const MusicPlayer = memo(() => {
  const [volume, setVolume] = useState<number>(0.5);
  const [progress, setProgress] = useState<number>(0);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // ✅ 使用全局音乐状态
  const { isMusicPlaying, toggleMusic, isMusicMuted, toggleMusicMute, setMusicVolume, setMusicSource } = useMedia();

  // ✅ 无版权音乐列表（使用稳定的免费音频源）
  const tracks: Array<{
    id: number;
    title: string;
    artist: string;
    url: string;
    duration: string;
  }> = [
    {
      id: 1,
      title: "Deep Focus",
      artist: "FASSounds",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "3:19"
    },
    // Temporarily using one working track - others will be replaced later
    {
      id: 2,
      title: "Chill Lofi",
      artist: "FASSounds",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "2:54"
    },
    {
      id: 3,
      title: "Lofi Chill",
      artist: "FASSounds",
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      duration: "3:06"
    },
  ];

  const currentTrack = tracks[currentTrackIndex];

  // Initialize volume on mount
  useEffect(() => {
    setMusicVolume(volume);
  }, []);

  // Update audio source when track changes
  useEffect(() => {
    setMusicSource(currentTrack.url);
    setProgress(0);
  }, [currentTrackIndex, currentTrack.url, setMusicSource]);

  // Simulate progress
  useEffect(() => {
    let interval;
    if (isMusicPlaying) {
      interval = setInterval(() => {
        setProgress(p => (p >= 100 ? 0 : p + 0.3));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isMusicPlaying]);

  // Handlers
  const handlePrevious = () => {
    const newIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackIndex(newIndex);
    setProgress(0);
  };

  const handleNext = () => {
    const newIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(newIndex);
    setProgress(0);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setMusicVolume(newVolume); // Sync with MediaContext
  };

  // Progress bar drag handlers
  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateProgressFromEvent(e);
  };

  const handleProgressMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateProgressFromEvent(e);
    }
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  const updateProgressFromEvent = (e: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setProgress(percentage);
  };

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleProgressMouseMove);
      window.addEventListener('mouseup', handleProgressMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleProgressMouseMove);
        window.removeEventListener('mouseup', handleProgressMouseUp);
      };
    }
    return undefined;
  }, [isDragging]);

  // Format progress
  const formatProgress = (val: number): string => {
    const totalSeconds = 180; // Approximate 3 minutes
    const currentSeconds = (val / 100) * totalSeconds;
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = Math.floor(currentSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full">
      {/* Music Player Bar */}
      <div className="flex items-center gap-6 px-6 py-4 bg-white/60 dark:bg-black/60 backdrop-blur-2xl border border-gray-300/50 dark:border-white/10 shadow-2xl rounded-2xl relative overflow-hidden">

        {/* Audio Visualization - Bottom overlay */}
        {isMusicPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-2 flex items-end justify-center gap-1 px-6 opacity-30 z-0">
            {[...Array(40)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-gray-900 dark:bg-white rounded-t"
                animate={{
                  height: [4, 16, 8, 20, 12, 6, 18, 10],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.05,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        )}

        {/* Album Art / Track Number */}
        <div className="relative group z-10">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-200 dark:to-gray-300 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white dark:text-gray-900">
              {(currentTrackIndex + 1).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Track Info */}
        <div className="min-w-0 flex-1 z-10">
          <div className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {currentTrack.title}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {currentTrack.artist}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 z-10">
          <button
            onClick={handlePrevious}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:scale-110 active:scale-95"
          >
            <Icons.SkipPrev />
          </button>

          <button
            onClick={toggleMusic}
            className="w-14 h-14 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all hover:shadow-xl dark:hover:shadow-white/20"
          >
            {isMusicPlaying ? <Icons.Pause /> : <Icons.Play />}
          </button>

          <button
            onClick={handleNext}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:scale-110 active:scale-95"
          >
            <Icons.SkipNext />
          </button>
        </div>

        {/* Time Display */}
        <div className="text-sm text-gray-600 dark:text-gray-400 font-mono tabular-nums min-w-[100px] text-center z-10">
          {formatProgress(progress)} / {currentTrack.duration}
        </div>

        {/* Progress Bar */}
        <div className="flex-1 max-w-[300px] flex items-center gap-3 z-10">
          {/* Progress track */}
          <div
            ref={progressBarRef}
            className="flex-1 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full overflow-hidden cursor-pointer group relative"
            onMouseDown={handleProgressMouseDown}
          >
            <div
              className="h-full bg-gray-900 dark:bg-white transition-all duration-200 relative"
              style={{ width: `${progress}%` }}
            >
              {/* Progress knob glow effect */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-900 dark:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"></div>
            </div>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2 z-10">
          <button
            onClick={toggleMusicMute}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:scale-110 active:scale-95"
          >
            {isMusicMuted || volume === 0 ? <Icons.VolumeX /> : <Icons.Volume />}
          </button>

          <div className="w-24 relative group">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMusicMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1.5 bg-gray-300 dark:bg-white/20 rounded-full appearance-none cursor-pointer accent-gray-900 dark:accent-white"
            />
            {/* Volume fill effect */}
            <div
              className="absolute top-1/2 left-0 h-1.5 bg-gray-600 dark:bg-gray-400 rounded-full pointer-events-none transition-all"
              style={{ width: `${(isMusicMuted ? 0 : volume) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Playlist Toggle */}
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className={`p-3 rounded-xl transition-all z-10 ${
            showPlaylist
              ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
          }`}
        >
          <Icons.List />
        </button>
      </div>

      {/* Playlist Dropdown */}
      <AnimatePresence>
        {showPlaylist && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 right-0 mb-4 max-h-[400px] overflow-y-auto bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl rounded-t-lg border border-gray-300 dark:border-white/10 shadow-2xl z-50 custom-scrollbar"
          >
            <div className="p-2">
              <div className="space-y-0">
                {tracks.map((track, index) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      setCurrentTrackIndex(index);
                      setProgress(0);
                      if (index !== currentTrackIndex && isMusicPlaying) {
                        // Track change logic here
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 transition-colors border-b border-gray-200 dark:border-white/5 last:border-0 ${
                      index === currentTrackIndex
                        ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white'
                        : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-l-full rounded-r bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-bold flex-shrink-0 flex items-center justify-center">
                      {(index + 1).toString().padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium truncate">{track.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{track.artist}</div>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
                      {track.duration}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default MusicPlayer;
