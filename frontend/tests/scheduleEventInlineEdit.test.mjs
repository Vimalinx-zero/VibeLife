import test from "node:test";
import assert from "node:assert/strict";

import {
  clearScheduleEventInlineEdit,
  createScheduleEventInlineEdit,
  normalizeScheduleEventInlineEditDraft,
} from "../src/pages/scheduleEventInlineEdit.ts";

const event = {
  id: "evt-1",
  title: "  晚上复盘  ",
  description: "  整理今天完成的事  ",
  event_date: "2026-03-18",
  time: " 21:30 ",
  type: "task",
  created_at: "2026-03-18T10:00:00Z",
  updated_at: "2026-03-18T10:00:00Z",
};

test("createScheduleEventInlineEdit captures the selected event into a draft", () => {
  const draft = createScheduleEventInlineEdit(event);

  assert.deepEqual(draft, {
    eventId: "evt-1",
    title: "  晚上复盘  ",
    description: "  整理今天完成的事  ",
    time: " 21:30 ",
    type: "task",
  });
});

test("normalizeScheduleEventInlineEditDraft trims text fields for update payload", () => {
  const result = normalizeScheduleEventInlineEditDraft({
    eventId: "evt-1",
    title: "  晚上复盘  ",
    description: "  整理今天完成的事  ",
    time: " 21:30 ",
    type: "task",
  });

  assert.deepEqual(result, {
    ok: true,
    payload: {
      title: "晚上复盘",
      description: "整理今天完成的事",
      time: "21:30",
      type: "task",
    },
  });
});

test("normalizeScheduleEventInlineEditDraft rejects blank titles", () => {
  const result = normalizeScheduleEventInlineEditDraft({
    eventId: "evt-1",
    title: "   ",
    description: "",
    time: "",
    type: "task",
  });

  assert.deepEqual(result, {
    ok: false,
    message: "日程标题不能为空",
  });
});

test("clearScheduleEventInlineEdit exits editing state", () => {
  assert.equal(clearScheduleEventInlineEdit(), null);
});
