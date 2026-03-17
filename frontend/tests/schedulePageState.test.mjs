import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SCHEDULE_EVENT_TYPE,
  createInitialSchedulePageUiState,
  preserveScheduleUiStateOnRefresh,
  preserveScheduleUiStateOnSubmitFailure,
  resetScheduleUiStateAfterSubmitSuccess,
  setActiveScheduleSidebarTab,
  toggleManualAddExpanded,
  updateManualAddDraft,
} from "../src/pages/schedulePageState.ts";

test("createInitialSchedulePageUiState starts with collapsed manual-add panel", () => {
  const state = createInitialSchedulePageUiState(17);

  assert.equal(state.selectedDate, 17);
  assert.equal(state.activeSidebarTab, "schedule");
  assert.equal(state.isManualAddExpanded, false);
  assert.deepEqual(state.manualAddDraft, {
    title: "",
    description: "",
    time: "",
    type: DEFAULT_SCHEDULE_EVENT_TYPE,
  });
});

test("toggleManualAddExpanded preserves draft input", () => {
  const baseState = updateManualAddDraft(
    createInitialSchedulePageUiState(12),
    {
      title: "补日历侧栏",
      description: "保留草稿",
      time: "15:30",
    }
  );

  const openedState = toggleManualAddExpanded(baseState);
  const collapsedState = toggleManualAddExpanded(openedState);

  assert.equal(openedState.isManualAddExpanded, true);
  assert.equal(collapsedState.isManualAddExpanded, false);
  assert.equal(collapsedState.manualAddDraft.title, "补日历侧栏");
  assert.equal(collapsedState.manualAddDraft.description, "保留草稿");
  assert.equal(collapsedState.manualAddDraft.time, "15:30");
});

test("setActiveScheduleSidebarTab switches tabs without dropping draft or date", () => {
  const baseState = toggleManualAddExpanded(
    updateManualAddDraft(createInitialSchedulePageUiState(14), {
      title: "切到今日待办也别丢",
      time: "14:00",
    })
  );

  const switchedState = setActiveScheduleSidebarTab(baseState, "todos");

  assert.equal(switchedState.activeSidebarTab, "todos");
  assert.equal(switchedState.selectedDate, 14);
  assert.equal(switchedState.isManualAddExpanded, true);
  assert.equal(switchedState.manualAddDraft.title, "切到今日待办也别丢");
  assert.equal(switchedState.manualAddDraft.time, "14:00");
});

test("preserveScheduleUiStateOnRefresh keeps selected date and composer state", () => {
  const draftState = setActiveScheduleSidebarTab(
    toggleManualAddExpanded(
      updateManualAddDraft(createInitialSchedulePageUiState(28), {
        title: "月底检查",
        description: "不要丢",
      })
    ),
    "todos"
  );

  const refreshedState = preserveScheduleUiStateOnRefresh(draftState);

  assert.equal(refreshedState.selectedDate, 28);
  assert.equal(refreshedState.activeSidebarTab, "todos");
  assert.equal(refreshedState.isManualAddExpanded, true);
  assert.deepEqual(refreshedState.manualAddDraft, draftState.manualAddDraft);
});

test("preserveScheduleUiStateOnSubmitFailure keeps draft input untouched", () => {
  const draftState = setActiveScheduleSidebarTab(
    updateManualAddDraft(createInitialSchedulePageUiState(9), {
      title: "失败后保留",
      description: "仍然在",
      time: "09:00",
    }),
    "todos"
  );

  const failedState = preserveScheduleUiStateOnSubmitFailure(draftState);

  assert.equal(failedState.selectedDate, 9);
  assert.equal(failedState.activeSidebarTab, "todos");
  assert.deepEqual(failedState.manualAddDraft, draftState.manualAddDraft);
});

test("resetScheduleUiStateAfterSubmitSuccess clears draft but keeps date and expansion state", () => {
  const draftState = setActiveScheduleSidebarTab(
    toggleManualAddExpanded(
      updateManualAddDraft(createInitialSchedulePageUiState(30), {
        title: "提交成功后清空",
        description: "清空草稿",
        time: "20:00",
        type: "meeting",
      })
    ),
    "todos"
  );

  const successState = resetScheduleUiStateAfterSubmitSuccess(draftState);

  assert.equal(successState.selectedDate, 30);
  assert.equal(successState.activeSidebarTab, "todos");
  assert.equal(successState.isManualAddExpanded, true);
  assert.deepEqual(successState.manualAddDraft, {
    title: "",
    description: "",
    time: "",
    type: DEFAULT_SCHEDULE_EVENT_TYPE,
  });
});
