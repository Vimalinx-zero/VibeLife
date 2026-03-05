import { memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";
import { useMedia } from "../context/MediaContext";

// --- Icons ---
const Icons = {
  Play: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>,
  Pause: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>,
  Stop: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" /></svg>,
  Clock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
};

/**
 * PomodoroTimer - 使用全局 MediaContext
 */
interface PomodoroTimerProps {
  onComplete?: () => void;
}

const PomodoroTimer = memo(({ onComplete }: PomodoroTimerProps) => {
  const toast = useToast();

  // ✅ 使用全局状态
  const {
    timerMode,
    timerStatus,
    timerSeconds,
    flowDuration,
    customMinutes,
    isMusicPlaying,
    audioData,
    toggleTimer,
    stopTimer,
    switchTimerMode,
    adjustTimerTime,
    formatTime
  } = useMedia();

  // Handle global events from WorkbenchPage context menu
  useEffect(() => {
    const setTimerPreset = (minutes) => {
      switchTimerMode('classic');
      adjustTimerTime(minutes - customMinutes);
      toast.success(`计时器设置为 ${minutes} 分钟`);
    };

    const handlePreset25 = () => setTimerPreset(25);
    const handlePreset30 = () => setTimerPreset(30);
    const handlePreset45 = () => setTimerPreset(45);
    const handlePreset60 = () => setTimerPreset(60);

    window.addEventListener('timer-preset-25', handlePreset25);
    window.addEventListener('timer-preset-30', handlePreset30);
    window.addEventListener('timer-preset-45', handlePreset45);
    window.addEventListener('timer-preset-60', handlePreset60);

    return () => {
      window.removeEventListener('timer-preset-25', handlePreset25);
      window.removeEventListener('timer-preset-30', handlePreset30);
      window.removeEventListener('timer-preset-45', handlePreset45);
      window.removeEventListener('timer-preset-60', handlePreset60);
    };
  }, [customMinutes, switchTimerMode, adjustTimerTime, toast]);

  return (
    <div className="flex flex-col items-center justify-center relative z-10">

      {/* Mode Switcher - Minimalist Pills (Adaptive) */}
      <div className="flex gap-4 mb-16 relative z-20">
        <button
          onClick={() => switchTimerMode('classic')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
            timerMode === 'classic'
              ? 'bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white'
              : 'text-gray-400 dark:text-white/30 hover:text-gray-900 dark:hover:text-white/60'
          }`}
        >
          <Icons.Clock /> Classic
        </button>
        <button
          onClick={() => switchTimerMode('flow')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
            timerMode === 'flow'
              ? 'bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white'
              : 'text-gray-400 dark:text-white/30 hover:text-gray-900 dark:hover:text-white/60'
          }`}
        >
           Flow
        </button>
      </div>

      {/* Main Display */}
      <div className="relative mb-16 group flex items-center justify-center">

         {/* Ring for Classic Mode */}
         {timerMode === 'classic' && (
           <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] -rotate-90 pointer-events-none transition-all duration-75 overflow-visible">

             {/* Base Circle (Adaptive Color) */}
             <circle cx="250" cy="250" r="220" stroke="currentColor" strokeWidth="1" fill="none" className="text-gray-200 dark:text-white/10" />

             {/* Progress Circle (Adaptive Color) */}
             <circle
               cx="250" cy="250" r="220"
               stroke="currentColor"
               strokeWidth={isMusicPlaying ? 2 + (audioData?.amplitude || 0) * 8 : 2}
               fill="none"
               strokeDasharray={2 * Math.PI * 220}
               strokeDashoffset={2 * Math.PI * 220 * (1 - timerSeconds / (customMinutes * 60))}
               className="text-gray-900 dark:text-white transition-all duration-100 ease-linear"
               style={{
                  filter: isMusicPlaying ? `drop-shadow(0 0 ${8 + (audioData?.amplitude || 0) * 15}px rgba(255,255,255,0.6))` : 'none'
               }}
             />

             {/* Music Ripples (Adaptive) */}
             {isMusicPlaying && (
                <>
                  <circle
                     cx="250" cy="250"
                     r={220 + (audioData?.amplitude || 0) * 25}
                     stroke="currentColor" strokeWidth="1" fill="none"
                     className="text-gray-400/50 dark:text-white/30 transition-all duration-75 ease-out"
                  />
                  <circle
                     cx="250" cy="250"
                     r={220 + (audioData?.amplitude || 0) * 50}
                     stroke="currentColor" strokeWidth="0.5" fill="none"
                     className="text-gray-300/30 dark:text-white/10 transition-all duration-100 ease-out"
                  />
                </>
             )}
           </svg>
         )}

         {/* Ring for Flow Mode */}
         {timerMode === 'flow' && (
           <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] -rotate-90 pointer-events-none transition-all duration-75 overflow-visible">

             {/* Base Circle (Adaptive Color) */}
             <circle cx="250" cy="250" r="220" stroke="currentColor" strokeWidth="1" fill="none" className="text-gray-200 dark:text-white/10" />

             {/* Progress Circle - Fills up as time passes (max 60 min) */}
             <circle
               cx="250" cy="250" r="220"
               stroke="currentColor"
               strokeWidth={isMusicPlaying ? 2 + (audioData?.amplitude || 0) * 8 : 2}
               fill="none"
               strokeDasharray={2 * Math.PI * 220}
               strokeDashoffset={2 * Math.PI * 220 * (1 - Math.min(flowDuration / 3600, 1))}
               className="text-gray-900 dark:text-white transition-all duration-100 ease-linear"
               style={{
                  filter: isMusicPlaying ? `drop-shadow(0 0 ${8 + (audioData?.amplitude || 0) * 15}px rgba(255,255,255,0.6))` : 'none'
               }}
             />

             {/* Music Ripples (Adaptive) */}
             {isMusicPlaying && (
                <>
                  <circle
                     cx="250" cy="250"
                     r={220 + (audioData?.amplitude || 0) * 25}
                     stroke="currentColor" strokeWidth="1" fill="none"
                     className="text-gray-400/50 dark:text-white/30 transition-all duration-75 ease-out"
                  />
                  <circle
                     cx="250" cy="250"
                     r={220 + (audioData?.amplitude || 0) * 50}
                     stroke="currentColor" strokeWidth="0.5" fill="none"
                     className="text-gray-300/30 dark:text-white/10 transition-all duration-100 ease-out"
                  />
                </>
             )}
           </svg>
         )}

         {/* Digital Time - Smaller Font Size (Adaptive) */}
         <div className={`text-[6rem] font-light tracking-tighter tabular-nums leading-none select-none transition-all duration-500 z-10 ${
             timerStatus === 'running'
               ? 'text-gray-900 dark:text-white'
               : 'text-gray-400 dark:text-white/50'
         }`}>
           {formatTime(timerSeconds)}
         </div>

         {/* Time Adjuster - Only for classic mode when idle */}
         {timerMode === 'classic' && timerStatus === 'idle' && (
           <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
             <motion.button
               whileHover={{ scale: 1.1 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => adjustTimerTime(-5)}
               className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-white/20 transition-all text-lg font-bold"
             >
               −
             </motion.button>
             <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[80px] text-center">
               {customMinutes} 分钟
             </span>
             <motion.button
               whileHover={{ scale: 1.1 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => adjustTimerTime(5)}
               className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-white/20 transition-all text-lg font-bold"
             >
               +
             </motion.button>
           </div>
        )}
      </div>

      {/* Controls - Minimalist Icons (Adaptive) */}
      <div className="flex items-center gap-8 relative z-20">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTimer}
          className="w-16 h-16 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xl hover:shadow-2xl dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
        >
          {timerStatus === 'running' ? <Icons.Pause /> : <Icons.Play />}
        </motion.button>

        <AnimatePresence>
          {(timerStatus === 'running' || timerStatus === 'paused') && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: -20 }}
              onClick={stopTimer}
              className="w-12 h-12 rounded-full border border-gray-300 dark:border-white/20 text-gray-500 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:border-gray-900 dark:hover:border-white flex items-center justify-center transition-colors"
            >
              <Icons.Stop />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
});

export default PomodoroTimer;
