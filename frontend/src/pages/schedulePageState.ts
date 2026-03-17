export const DEFAULT_SCHEDULE_EVENT_TYPE = "task";

export interface ScheduleManualAddDraft {
  title: string;
  description: string;
  time: string;
  type: string;
}

export interface SchedulePageUiState {
  selectedDate: number | null;
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
  isManualAddExpanded: false,
  manualAddDraft: createEmptyManualAddDraft(),
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
