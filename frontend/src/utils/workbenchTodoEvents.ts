export const WORKBENCH_TODOS_REFRESH_EVENT = "workbench-todos-refresh";
export const WORKBENCH_DATA_REFRESH_EVENT = "workbench-data-refresh";

const resolveWorkbenchEventTarget = (
  target?: Pick<EventTarget, "dispatchEvent">
) => {
  return target ?? globalThis.window;
};

export const dispatchWorkbenchTodosRefresh = (
  target?: Pick<EventTarget, "dispatchEvent">
) => {
  resolveWorkbenchEventTarget(target).dispatchEvent(
    new Event(WORKBENCH_TODOS_REFRESH_EVENT)
  );
};

export const dispatchWorkbenchDataRefresh = (
  target?: Pick<EventTarget, "dispatchEvent">
) => {
  resolveWorkbenchEventTarget(target).dispatchEvent(
    new Event(WORKBENCH_DATA_REFRESH_EVENT)
  );
};

export const dispatchWorkbenchAiRefresh = (
  target?: Pick<EventTarget, "dispatchEvent">
) => {
  dispatchWorkbenchTodosRefresh(target);
  dispatchWorkbenchDataRefresh(target);
};
