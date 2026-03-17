import test from "node:test";
import assert from "node:assert/strict";

import * as workbenchTodoEvents from "../src/utils/workbenchTodoEvents.ts";

const withMockWindow = async (callback) => {
  const previousWindow = globalThis.window;
  const target = new EventTarget();
  globalThis.window = target;

  try {
    await callback(target);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
};

test("dispatchWorkbenchTodosRefresh emits the shared refresh event", () => {
  const target = new EventTarget();
  let seen = false;

  target.addEventListener(workbenchTodoEvents.WORKBENCH_TODOS_REFRESH_EVENT, () => {
    seen = true;
  });

  workbenchTodoEvents.dispatchWorkbenchTodosRefresh(target);

  assert.equal(seen, true);
});

test("dispatchWorkbenchTodosRefresh falls back to window when no target is provided", async () => {
  await withMockWindow(async (target) => {
    let seen = false;

    target.addEventListener(workbenchTodoEvents.WORKBENCH_TODOS_REFRESH_EVENT, () => {
      seen = true;
    });

    workbenchTodoEvents.dispatchWorkbenchTodosRefresh();

    assert.equal(seen, true);
  });
});

test("dispatchWorkbenchDataRefresh emits the shared data refresh event", () => {
  assert.equal(
    typeof workbenchTodoEvents.WORKBENCH_DATA_REFRESH_EVENT,
    "string"
  );
  assert.equal(
    typeof workbenchTodoEvents.dispatchWorkbenchDataRefresh,
    "function"
  );

  const target = new EventTarget();
  let seen = false;

  target.addEventListener(workbenchTodoEvents.WORKBENCH_DATA_REFRESH_EVENT, () => {
    seen = true;
  });

  workbenchTodoEvents.dispatchWorkbenchDataRefresh(target);

  assert.equal(seen, true);
});

test("dispatchWorkbenchDataRefresh falls back to window when no target is provided", async () => {
  await withMockWindow(async (target) => {
    let seen = false;

    target.addEventListener(workbenchTodoEvents.WORKBENCH_DATA_REFRESH_EVENT, () => {
      seen = true;
    });

    workbenchTodoEvents.dispatchWorkbenchDataRefresh();

    assert.equal(seen, true);
  });
});

test("dispatchWorkbenchAiRefresh emits both shared refresh events", () => {
  assert.equal(typeof workbenchTodoEvents.dispatchWorkbenchAiRefresh, "function");

  const target = new EventTarget();
  const seen = [];

  target.addEventListener(workbenchTodoEvents.WORKBENCH_TODOS_REFRESH_EVENT, () => {
    seen.push(workbenchTodoEvents.WORKBENCH_TODOS_REFRESH_EVENT);
  });
  target.addEventListener(workbenchTodoEvents.WORKBENCH_DATA_REFRESH_EVENT, () => {
    seen.push(workbenchTodoEvents.WORKBENCH_DATA_REFRESH_EVENT);
  });

  workbenchTodoEvents.dispatchWorkbenchAiRefresh(target);

  assert.deepEqual(seen, [
    workbenchTodoEvents.WORKBENCH_TODOS_REFRESH_EVENT,
    workbenchTodoEvents.WORKBENCH_DATA_REFRESH_EVENT,
  ]);
});

test("dispatchWorkbenchAiRefresh falls back to window when no target is provided", async () => {
  await withMockWindow(async (target) => {
    const seen = [];

    target.addEventListener(workbenchTodoEvents.WORKBENCH_TODOS_REFRESH_EVENT, () => {
      seen.push(workbenchTodoEvents.WORKBENCH_TODOS_REFRESH_EVENT);
    });
    target.addEventListener(workbenchTodoEvents.WORKBENCH_DATA_REFRESH_EVENT, () => {
      seen.push(workbenchTodoEvents.WORKBENCH_DATA_REFRESH_EVENT);
    });

    workbenchTodoEvents.dispatchWorkbenchAiRefresh();

    assert.deepEqual(seen, [
      workbenchTodoEvents.WORKBENCH_TODOS_REFRESH_EVENT,
      workbenchTodoEvents.WORKBENCH_DATA_REFRESH_EVENT,
    ]);
  });
});
