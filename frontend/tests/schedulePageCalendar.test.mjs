import test from "node:test";
import assert from "node:assert/strict";

import {
  buildScheduleMonthSlots,
  createScheduleDateKey,
  getScheduleEventsForDate,
} from "../src/pages/schedulePageCalendar.ts";

test("createScheduleDateKey uses zero-padded month and day", () => {
  assert.equal(createScheduleDateKey(2026, 2, 7), "2026-03-07");
});

test("buildScheduleMonthSlots keeps leading blanks and all month days", () => {
  const slots = buildScheduleMonthSlots(2025, 2);

  assert.equal(slots.length, 37);
  assert.deepEqual(
    slots.slice(0, 6).map((slot) => slot.day),
    [null, null, null, null, null, null]
  );
  assert.equal(slots[6]?.day, 1);
  assert.equal(slots.at(-1)?.day, 31);
});

test("getScheduleEventsForDate returns only events for the selected date", () => {
  const events = [
    { id: "a", title: "晨间规划", event_date: "2026-03-17" },
    { id: "b", title: "晚间复盘", event_date: "2026-03-17" },
    { id: "c", title: "别的日期", event_date: "2026-03-18" },
  ];

  assert.deepEqual(
    getScheduleEventsForDate(events, 2026, 2, 17).map((event) => event.id),
    ["a", "b"]
  );
  assert.deepEqual(getScheduleEventsForDate(events, 2026, 2, null), []);
});
