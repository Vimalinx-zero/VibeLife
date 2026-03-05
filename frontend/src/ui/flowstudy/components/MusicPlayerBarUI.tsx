import type { ReactNode } from "react";
import { motion } from "framer-motion";

const Icons = {
  Play: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true" focusable="false">
      <title>Play</title>
      <path
        fillRule="evenodd"
        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Pause: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true" focusable="false">
      <title>Pause</title>
      <path
        fillRule="evenodd"
        d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Prev: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true" focusable="false">
      <title>Previous</title>
      <path d="M18.75 5.653c0-1.426-1.529-2.33-2.779-1.643L4.431 10.358c-1.295.712-1.295 2.573 0 3.285L15.97 19.991c1.25.687 2.779-.217 2.779-1.643V5.653zM6.254 17.547V8.056l.712.436-5.497 3.745 5.497 3.745-.712.564z" />
    </svg>
  ),
  Next: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true" focusable="false">
      <title>Next</title>
      <path d="M5.25 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653zm12.496 11.894V8.056l5.497 3.745-5.497 3.745z" />
    </svg>
  ),
};

export interface MusicPlayerBarUIProps {
  trackTitle: string;
  trackArtist?: string;
  trackBadge?: ReactNode;
  isPlaying: boolean;
  onTogglePlay?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function MusicPlayerBarUI({
  trackTitle,
  trackArtist,
  trackBadge,
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
}: MusicPlayerBarUIProps) {
  return (
    <div className="relative w-full">
      <div className="flex items-center gap-6 px-6 py-4 bg-white/60 dark:bg-black/60 backdrop-blur-2xl border border-gray-300/50 dark:border-white/10 shadow-2xl rounded-2xl relative overflow-hidden">
        <div className="relative group z-10">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-200 dark:to-gray-300 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white dark:text-gray-900">{trackBadge ?? "♪"}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 z-10">
          <div className="text-base font-semibold text-gray-900 dark:text-white truncate">{trackTitle}</div>
          {trackArtist ? <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{trackArtist}</div> : null}
        </div>

        <div className="flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={onPrev}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:scale-110 active:scale-95"
            aria-label="Previous"
          >
            <Icons.Prev />
          </button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onTogglePlay}
            className="w-14 h-14 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg transition-all hover:shadow-xl dark:hover:shadow-white/20"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Icons.Pause /> : <Icons.Play />}
          </motion.button>

          <button
            type="button"
            onClick={onNext}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:scale-110 active:scale-95"
            aria-label="Next"
          >
            <Icons.Next />
          </button>
        </div>
      </div>
    </div>
  );
}
