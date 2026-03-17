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
