export const WORKBENCH_TODOS_REFRESH_EVENT = "workbench-todos-refresh";

export const dispatchWorkbenchTodosRefresh = (
  target: Pick<EventTarget, "dispatchEvent"> = window
) => {
  target.dispatchEvent(new Event(WORKBENCH_TODOS_REFRESH_EVENT));
};
