export type TimerMode = 'classic' | 'flow';
export type TimerStatus = 'idle' | 'running' | 'paused';
export type PomodoroPhase = 'focus' | 'break';
export type PomodoroChime = 'complete' | 'break';

export interface PomodoroState {
  timerMode: TimerMode;
  timerStatus: TimerStatus;
  phase: PomodoroPhase;
  timerSeconds: number;
  phaseTotalSeconds: number;
  flowDuration: number;
  focusMinutes: number;
  breakMinutes: number;
  autoBreak: boolean;
  chimes: PomodoroChime[];
}

interface CreatePomodoroStateOptions {
  timerMode: TimerMode;
  focusMinutes: number;
  breakMinutes: number;
  autoBreak: boolean;
}

const clampMinutes = (minutes: number) => Math.max(1, Math.floor(minutes));

const getFlowBreakMinutes = (flowDurationSeconds: number) => {
  const focusMinutes = Math.max(1, Math.ceil(Math.max(0, flowDurationSeconds) / 60));
  return Math.ceil(focusMinutes / 10);
};

export const createInitialPomodoroState = (options: CreatePomodoroStateOptions): PomodoroState => {
  const focusMinutes = clampMinutes(options.focusMinutes);
  const breakMinutes = clampMinutes(options.breakMinutes);

  return {
    timerMode: options.timerMode,
    timerStatus: 'idle',
    phase: 'focus',
    timerSeconds: options.timerMode === 'classic' ? focusMinutes * 60 : 0,
    phaseTotalSeconds: options.timerMode === 'classic' ? focusMinutes * 60 : 0,
    flowDuration: 0,
    focusMinutes,
    breakMinutes,
    autoBreak: options.autoBreak,
    chimes: [],
  };
};

export const completePomodoroFocus = (state: PomodoroState): PomodoroState => {
  if (state.phase !== 'focus') {
    return { ...state, chimes: [] };
  }

  if (state.timerMode === 'classic') {
    const breakSeconds = clampMinutes(state.breakMinutes) * 60;
    return {
      ...state,
      phase: 'break',
      timerStatus: state.autoBreak ? 'running' : 'idle',
      timerSeconds: breakSeconds,
      phaseTotalSeconds: breakSeconds,
      chimes: ['complete'],
    };
  }

  const breakSeconds = getFlowBreakMinutes(state.flowDuration) * 60;
  return {
    ...state,
    phase: 'break',
    timerStatus: state.autoBreak ? 'running' : 'idle',
    timerSeconds: breakSeconds,
    phaseTotalSeconds: breakSeconds,
    chimes: [],
  };
};

export const advancePomodoroState = (state: PomodoroState): PomodoroState => {
  if (state.timerStatus !== 'running') {
    return { ...state, chimes: [] };
  }

  if (state.timerMode === 'flow' && state.phase === 'focus') {
    return {
      ...state,
      timerSeconds: state.timerSeconds + 1,
      flowDuration: state.flowDuration + 1,
      chimes: [],
    };
  }

  if (state.timerSeconds > 1) {
    return {
      ...state,
      timerSeconds: state.timerSeconds - 1,
      chimes: [],
    };
  }

  if (state.phase === 'focus') {
    return completePomodoroFocus(state);
  }

  if (state.timerMode === 'classic') {
    return {
      ...state,
      phase: 'focus',
      timerStatus: 'idle',
      timerSeconds: clampMinutes(state.focusMinutes) * 60,
      phaseTotalSeconds: clampMinutes(state.focusMinutes) * 60,
      chimes: ['break'],
    };
  }

  return {
    ...state,
    phase: 'focus',
    timerStatus: 'idle',
    timerSeconds: 0,
    phaseTotalSeconds: 0,
    flowDuration: 0,
    chimes: ['break'],
  };
};
