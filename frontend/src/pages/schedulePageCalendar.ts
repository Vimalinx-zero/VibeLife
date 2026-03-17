import type { ScheduleEvent } from "../utils/workbenchApi";

export interface ScheduleCalendarSlot {
  slotKey: string;
  day: number | null;
}

export const formatScheduleDateKey = (
  year: number,
  monthIndex: number,
  day: number
): string => {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const createScheduleDateKey = formatScheduleDateKey;

export const buildScheduleCalendarSlots = (
  year: number,
  monthIndex: number
): ScheduleCalendarSlot[] => {
  const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const slots: ScheduleCalendarSlot[] = [];

  for (let index = 0; index < firstDayOfMonth; index += 1) {
    slots.push({
      slotKey: `empty-${year}-${monthIndex}-${index}`,
      day: null,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    slots.push({
      slotKey: `day-${year}-${monthIndex}-${day}`,
      day,
    });
  }

  return slots;
};

export const buildScheduleMonthSlots = buildScheduleCalendarSlots;

export const getScheduleEventsForDay = (
  events: ScheduleEvent[],
  year: number,
  monthIndex: number,
  day: number | null
): ScheduleEvent[] => {
  if (day === null) {
    return [];
  }

  const selectedDateKey = formatScheduleDateKey(year, monthIndex, day);
  return events.filter((event) => event.event_date === selectedDateKey);
};

export const getScheduleEventsForDate = getScheduleEventsForDay;

export const formatScheduleSelectedDateLabel = (
  monthIndex: number,
  selectedDate: number | null
): string => {
  if (selectedDate === null) {
    return "选择日期";
  }

  return `${monthIndex + 1}月${selectedDate}日`;
};
