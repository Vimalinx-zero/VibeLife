import type { ScheduleEvent } from "../utils/workbenchApi";

export interface ScheduleEventInlineEditDraft {
  eventId: string;
  title: string;
  description: string;
  time: string;
  type: string;
}

type ScheduleEventEditableFields = Pick<
  ScheduleEvent,
  "id" | "title" | "description" | "time" | "type"
>;

export const createScheduleEventInlineEdit = (
  event: ScheduleEventEditableFields
): ScheduleEventInlineEditDraft => ({
  eventId: event.id,
  title: event.title,
  description: event.description ?? "",
  time: event.time ?? "",
  type: event.type ?? "task",
});

export const clearScheduleEventInlineEdit = (): null => null;

export const normalizeScheduleEventInlineEditDraft = (
  draft: ScheduleEventInlineEditDraft
):
  | {
      ok: true;
      payload: {
        title: string;
        description?: string;
        time?: string;
        type: string;
      };
    }
  | {
      ok: false;
      message: string;
    } => {
  const title = draft.title.trim();
  if (!title) {
    return {
      ok: false,
      message: "日程标题不能为空",
    };
  }

  const description = draft.description.trim();
  const time = draft.time.trim();

  return {
    ok: true,
    payload: {
      title,
      description: description || undefined,
      time: time || undefined,
      type: draft.type.trim() || "task",
    },
  };
};
