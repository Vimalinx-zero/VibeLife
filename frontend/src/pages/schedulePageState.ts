export const DEFAULT_SCHEDULE_EVENT_TYPE = "task";
export type ScheduleSidebarTab = "schedule" | "todos";
export const DEFAULT_SCHEDULE_SIDEBAR_TAB: ScheduleSidebarTab = "schedule";

export interface ScheduleManualAddDraft {
  title: string;
  description: string;
  time: string;
  type: string;
}

export interface SchedulePageUiState {
  selectedDate: number | null;
  activeSidebarTab: ScheduleSidebarTab;
  isManualAddExpanded: boolean;
  manualAddDraft: ScheduleManualAddDraft;
}

const createEmptyManualAddDraft = (): ScheduleManualAddDraft => ({
  title: "",
  description: "",
  time: "",
  type: DEFAULT_SCHEDULE_EVENT_TYPE,
});

export const createInitialSchedulePageUiState = (
  selectedDate: number | null
): SchedulePageUiState => ({
  selectedDate,
  activeSidebarTab: DEFAULT_SCHEDULE_SIDEBAR_TAB,
  isManualAddExpanded: false,
  manualAddDraft: createEmptyManualAddDraft(),
});

export const setActiveScheduleSidebarTab = (
  state: SchedulePageUiState,
  nextTab: ScheduleSidebarTab
): SchedulePageUiState => ({
  ...state,
  activeSidebarTab: nextTab,
});

export const selectScheduleDate = (
  state: SchedulePageUiState,
  selectedDate: number
): SchedulePageUiState => ({
  ...state,
  selectedDate,
  activeSidebarTab: DEFAULT_SCHEDULE_SIDEBAR_TAB,
});

export const toggleManualAddExpanded = (
  state: SchedulePageUiState
): SchedulePageUiState => ({
  ...state,
  isManualAddExpanded: !state.isManualAddExpanded,
});

export const updateManualAddDraft = (
  state: SchedulePageUiState,
  updates: Partial<ScheduleManualAddDraft>
): SchedulePageUiState => ({
  ...state,
  manualAddDraft: {
    ...state.manualAddDraft,
    ...updates,
  },
});

export const preserveScheduleUiStateOnRefresh = (
  state: SchedulePageUiState
): SchedulePageUiState => ({
  ...state,
  manualAddDraft: {
    ...state.manualAddDraft,
  },
});

export const preserveScheduleUiStateOnSubmitFailure = (
  state: SchedulePageUiState
): SchedulePageUiState => ({
  ...state,
  manualAddDraft: {
    ...state.manualAddDraft,
  },
});

export const resetScheduleUiStateAfterSubmitSuccess = (
  state: SchedulePageUiState
): SchedulePageUiState => ({
  ...state,
  manualAddDraft: createEmptyManualAddDraft(),
});
