import { memo, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type TimerMode = "classic" | "flow";
export type TimerStatus = "idle" | "running" | "paused";
export type TimerPhase = "focus" | "break";

const Icons = {
  Play: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8" aria-hidden="true" focusable="false">
      <title>Play</title>
      <path
        fillRule="evenodd"
        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Pause: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8" aria-hidden="true" focusable="false">
      <title>Pause</title>
      <path
        fillRule="evenodd"
        d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Stop: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true" focusable="false">
      <title>Stop</title>
      <path
        fillRule="evenodd"
        d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Clock: () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-5 h-5"
      aria-hidden="true"
      focusable="false"
    >
      <title>Clock</title>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

export interface PomodoroTimerUIProps {
  timerMode: TimerMode;
  timerPhase: TimerPhase;
  timerStatus: TimerStatus;
  timerSeconds: number;
  phaseTotalSeconds?: number;
  customMinutes: number;
  flowDuration?: number;
  isMusicPlaying?: boolean;
  audioAmplitude?: number;
  stopLabel?: string;
  onToggleTimer?: () => void;
  onStopTimer?: () => void;
  onSwitchMode?: (mode: TimerMode) => void;
  onAdjustTime?: (deltaMinutes: number) => void;
  footer?: ReactNode;
}

const formatTime = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const PomodoroTimerUI = memo((props: PomodoroTimerUIProps) => {
  const {
    timerMode,
    timerPhase,
    timerStatus,
    timerSeconds,
    phaseTotalSeconds = 0,
    customMinutes,
    flowDuration = 0,
    isMusicPlaying = false,
    audioAmplitude = 0,
    stopLabel,
    onToggleTimer,
    onStopTimer,
    onSwitchMode,
    onAdjustTime,
    footer,
  } = props;

  const safeAmplitude = Number.isFinite(audioAmplitude) ? Math.max(0, Math.min(1, audioAmplitude)) : 0;
  const countdownTotal = Math.max(1, phaseTotalSeconds || Math.max(1, customMinutes) * 60);
  const countdownProgress = 1 - timerSeconds / countdownTotal;
  const flowFocusProgress = Math.min(Math.max(flowDuration, 0) / 3600, 1);
  const ringProgress =
    timerMode === "flow" && timerPhase === "focus" ? flowFocusProgress : Math.max(0, Math.min(1, countdownProgress));
  const ringStrokeWidth = isMusicPlaying ? 2 + safeAmplitude * 8 : 2;
  const ringGlow = isMusicPlaying ? `drop-shadow(0 0 ${8 + safeAmplitude * 15}px rgba(255,255,255,0.6))` : "none";
  const phaseLabel = timerPhase === "break" ? "Break" : timerMode === "flow" ? "Flow Focus" : "Focus";
  const stopAriaLabel = stopLabel || "Stop";

  return (
    <div className="flex flex-col items-center justify-center relative z-10">
      <div className="flex gap-4 mb-8 relative z-20">
        <button
          type="button"
          onClick={() => onSwitchMode?.("classic")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
            timerMode === "classic"
              ? "bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-white/30 hover:text-gray-900 dark:hover:text-white/60"
          }`}
        >
          <Icons.Clock /> Classic
        </button>

        <button
          type="button"
          onClick={() => onSwitchMode?.("flow")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
            timerMode === "flow"
              ? "bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-white/30 hover:text-gray-900 dark:hover:text-white/60"
          }`}
        >
          Flow
        </button>
      </div>

      <div className="mb-8 rounded-full border border-gray-300/70 bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-gray-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white/70">
        {phaseLabel}
      </div>

      <div className="relative mb-16 group flex items-center justify-center">
        <svg
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] -rotate-90 pointer-events-none transition-all duration-75 overflow-visible"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="250" cy="250" r="220" stroke="currentColor" strokeWidth="1" fill="none" className="text-gray-200 dark:text-white/10" />
          <circle
            cx="250"
            cy="250"
            r="220"
            stroke="currentColor"
            strokeWidth={ringStrokeWidth}
            fill="none"
            strokeDasharray={2 * Math.PI * 220}
            strokeDashoffset={2 * Math.PI * 220 * (1 - ringProgress)}
            className="text-gray-900 dark:text-white transition-all duration-100 ease-linear"
            style={{ filter: ringGlow }}
          />
        </svg>

        <div
          className={`text-[6rem] font-light tracking-tighter tabular-nums leading-none select-none transition-all duration-500 z-10 ${
            timerStatus === "running" ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-white/50"
          }`}
        >
          {formatTime(timerSeconds)}
        </div>

        {timerMode === "classic" && timerPhase === "focus" && timerStatus === "idle" && onAdjustTime && (
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAdjustTime(-5)}
              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-white/20 transition-all text-lg font-bold"
              aria-label="Decrease"
            >
              −
            </motion.button>
            <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[80px] text-center">{customMinutes} 分钟</span>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAdjustTime(5)}
              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-white/20 transition-all text-lg font-bold"
              aria-label="Increase"
            >
              +
            </motion.button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-8 relative z-20">
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleTimer}
          className="w-16 h-16 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xl hover:shadow-2xl dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
          aria-label={timerStatus === "running" ? "Pause" : "Play"}
        >
          {timerStatus === "running" ? <Icons.Pause /> : <Icons.Play />}
        </motion.button>

        <AnimatePresence>
          {(timerStatus === "running" || timerStatus === "paused") && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.5, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: -20 }}
              onClick={onStopTimer}
              className="w-12 h-12 rounded-full border border-gray-300 dark:border-white/20 text-gray-500 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:border-gray-900 dark:hover:border-white flex items-center justify-center transition-colors"
              aria-label={stopAriaLabel}
              title={stopAriaLabel}
            >
              <Icons.Stop />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {footer ? <div className="mt-10">{footer}</div> : null}
    </div>
  );
});

PomodoroTimerUI.displayName = "PomodoroTimerUI";
