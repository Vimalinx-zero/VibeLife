import { memo, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import { useMedia } from "../context/MediaContext";
import { PomodoroTimerUI } from "../ui/vibelife/components/PomodoroTimerUI";

interface PomodoroTimerProps {
  onComplete?: () => void;
}

const PomodoroTimer = memo(({ onComplete }: PomodoroTimerProps) => {
  const toast = useToast();
  const {
    timerMode,
    timerPhase,
    timerStatus,
    timerSeconds,
    phaseTotalSeconds,
    flowDuration,
    customMinutes,
    breakMinutes,
    autoBreak,
    isMusicPlaying,
    audioData,
    toggleTimer,
    stopTimer,
    switchTimerMode,
    adjustTimerTime,
    setTimerDuration,
  } = useMedia();

  useEffect(() => {
    const setTimerPreset = (minutes: number) => {
      switchTimerMode("classic");
      setTimerDuration(minutes);
      toast.success(`计时器设置为 ${minutes} 分钟`);
    };

    const handlePreset25 = () => setTimerPreset(25);
    const handlePreset30 = () => setTimerPreset(30);
    const handlePreset45 = () => setTimerPreset(45);
    const handlePreset60 = () => setTimerPreset(60);

    window.addEventListener("timer-preset-25", handlePreset25);
    window.addEventListener("timer-preset-30", handlePreset30);
    window.addEventListener("timer-preset-45", handlePreset45);
    window.addEventListener("timer-preset-60", handlePreset60);

    return () => {
      window.removeEventListener("timer-preset-25", handlePreset25);
      window.removeEventListener("timer-preset-30", handlePreset30);
      window.removeEventListener("timer-preset-45", handlePreset45);
      window.removeEventListener("timer-preset-60", handlePreset60);
    };
  }, [setTimerDuration, switchTimerMode, toast]);

  useEffect(() => {
    if (timerPhase === "break") {
      onComplete?.();
    }
  }, [onComplete, timerPhase]);

  const stopLabel =
    timerMode === "flow" && timerPhase === "focus" && flowDuration > 0
      ? "结束专注"
      : timerPhase === "break"
        ? "结束休息"
        : "重置";

  const flowBreakMinutes = Math.ceil(Math.max(1, Math.ceil(Math.max(flowDuration, 0) / 60)) / 10);
  const footerText =
    timerPhase === "break"
      ? timerMode === "classic"
        ? `Classic 休息中 · ${breakMinutes} 分钟`
        : `Flow 休息中 · ${Math.max(1, Math.ceil(phaseTotalSeconds / 60))} 分钟`
      : timerMode === "classic"
        ? `Classic 专注 ${customMinutes} 分钟，休息 ${breakMinutes} 分钟 · ${autoBreak ? "自动开始休息" : "手动开始休息"}`
        : `Flow 结束后休息 = ceil(专注分钟 / 10) · 当前将休息 ${flowBreakMinutes} 分钟 · ${autoBreak ? "自动开始休息" : "等待手动开始"}`;

  return (
    <PomodoroTimerUI
      timerMode={timerMode}
      timerPhase={timerPhase}
      timerStatus={timerStatus}
      timerSeconds={timerSeconds}
      phaseTotalSeconds={phaseTotalSeconds}
      customMinutes={customMinutes}
      flowDuration={flowDuration}
      isMusicPlaying={isMusicPlaying}
      audioAmplitude={audioData?.amplitude || 0}
      stopLabel={stopLabel}
      onToggleTimer={toggleTimer}
      onStopTimer={stopTimer}
      onSwitchMode={switchTimerMode}
      onAdjustTime={adjustTimerTime}
      footer={
        <div className="rounded-full border border-gray-300/70 bg-white/70 px-4 py-2 text-sm text-gray-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white/70">
          {footerText}
        </div>
      }
    />
  );
});

PomodoroTimer.displayName = "PomodoroTimer";

export default PomodoroTimer;
