export type TodayTodosVariant = "dashboard" | "schedule";

interface TodayTodosVariantConfig {
  maxVisible: number;
  inputPlaceholder: string;
  showViewAllLink: boolean;
}

const DASHBOARD_CONFIG: TodayTodosVariantConfig = {
  maxVisible: 5,
  inputPlaceholder: "添加新任务...",
  showViewAllLink: true,
};

const SCHEDULE_CONFIG: TodayTodosVariantConfig = {
  maxVisible: 8,
  inputPlaceholder: "添加今日待办...",
  showViewAllLink: false,
};

export const getTodayTodosVariantConfig = (
  variant: string | undefined
): TodayTodosVariantConfig => {
  if (variant === "schedule") {
    return SCHEDULE_CONFIG;
  }

  return DASHBOARD_CONFIG;
};
