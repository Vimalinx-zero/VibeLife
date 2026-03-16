export interface CoachSuggestion {
  id: string;
  title: string;
  reason: string;
  target: string;
  estimated_minutes: number;
  subject: string;
  todo_text: string;
}

export interface CoachSnapshot {
  pending_todos: number;
  today_focus_minutes: number;
  recent_7d_completion_rate: number;
  recent_7d_avg_focus_minutes: number;
}

export interface CoachAdaptive {
  level: "build" | "balanced" | "challenge";
  label: string;
  focus: string;
  completion_rate: number;
  avg_daily_focus_minutes: number;
  recommended_plan_items: number;
}

export interface CoachData {
  snapshot: CoachSnapshot;
  adaptive: CoachAdaptive;
  suggestions: CoachSuggestion[];
  coach_message: string;
}

export const normalizeCoachData = (raw: any): CoachData => {
  const adaptiveLevelRaw = raw?.adaptive?.level;
  const adaptiveLevel: CoachAdaptive["level"] =
    adaptiveLevelRaw === "build" || adaptiveLevelRaw === "balanced" || adaptiveLevelRaw === "challenge"
      ? adaptiveLevelRaw
      : "balanced";

  return {
    snapshot: {
      pending_todos: raw?.snapshot?.pending_todos || 0,
      today_focus_minutes: raw?.snapshot?.today_focus_minutes ?? 0,
      recent_7d_completion_rate: raw?.snapshot?.recent_7d_completion_rate || 0,
      recent_7d_avg_focus_minutes: raw?.snapshot?.recent_7d_avg_focus_minutes ?? 0,
    },
    adaptive: {
      level: adaptiveLevel,
      label: raw?.adaptive?.label || "稳步推进",
      focus: raw?.adaptive?.focus || "按优先级完成关键任务",
      completion_rate: raw?.adaptive?.completion_rate || 0,
      avg_daily_focus_minutes: raw?.adaptive?.avg_daily_focus_minutes ?? 0,
      recommended_plan_items: raw?.adaptive?.recommended_plan_items || 3,
    },
    suggestions: raw?.suggestions || [],
    coach_message: raw?.coach_message || "",
  };
};
