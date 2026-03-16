import test from "node:test";
import assert from "node:assert/strict";

import {
  dispatchWorkbenchTodosRefresh,
  WORKBENCH_TODOS_REFRESH_EVENT,
} from "../src/utils/workbenchTodoEvents.ts";

test("dispatchWorkbenchTodosRefresh emits the shared refresh event", () => {
  const target = new EventTarget();
  let seen = false;

  target.addEventListener(WORKBENCH_TODOS_REFRESH_EVENT, () => {
    seen = true;
  });

  dispatchWorkbenchTodosRefresh(target);

  assert.equal(seen, true);
});
