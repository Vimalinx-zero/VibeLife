import test from "node:test";
import assert from "node:assert/strict";

import * as workbenchTodoEvents from "../src/utils/workbenchTodoEvents.ts";

test("dispatchWorkbenchTodosRefresh emits the shared refresh event", () => {
  const target = new EventTarget();
  let seen = false;

  target.addEventListener(workbenchTodoEvents.WORKBENCH_TODOS_REFRESH_EVENT, () => {
    seen = true;
  });

  workbenchTodoEvents.dispatchWorkbenchTodosRefresh(target);

  assert.equal(seen, true);
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
