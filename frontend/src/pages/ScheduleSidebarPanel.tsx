import TodayTodos from "../components/TodayTodos";
import type { ScheduleEvent } from "../utils/workbenchApi";
import type {
  ScheduleManualAddDraft,
  ScheduleSidebarTab,
} from "./schedulePageState";

const EVENT_LEGEND_ITEMS: Array<{ label: string; color: string }> = [
  { label: "会议", color: "bg-blue-500" },
  { label: "截止", color: "bg-red-500" },
  { label: "提醒", color: "bg-yellow-500" },
  { label: "任务", color: "bg-green-500" },
];

const SIDEBAR_TABS: Array<{ id: ScheduleSidebarTab; label: string }> = [
  { id: "schedule", label: "当天安排" },
  { id: "todos", label: "今日待办" },
];

const getTypeColor = (type: ScheduleEvent["type"]) => {
  switch (type) {
    case "meeting":
      return "bg-blue-500";
    case "deadline":
      return "bg-red-500";
    case "reminder":
      return "bg-yellow-500";
    case "task":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

interface ScheduleSidebarPanelProps {
  selectedDateLabel: string;
  activeSidebarTab: ScheduleSidebarTab;
  selectedEvents: ScheduleEvent[];
  hasValidSelectedDate: boolean;
  isLoading: boolean;
  isInitialLoading: boolean;
  isSaving: boolean;
  manualAddDraft: ScheduleManualAddDraft;
  isManualAddExpanded: boolean;
  onTabChange: (tab: ScheduleSidebarTab) => void;
  onToggleManualAdd: () => void;
  onDraftChange: (updates: Partial<ScheduleManualAddDraft>) => void;
  onSubmitManualAdd: () => void;
}

const ScheduleSidebarPanel = ({
  selectedDateLabel,
  activeSidebarTab,
  selectedEvents,
  hasValidSelectedDate,
  isLoading,
  isInitialLoading,
  isSaving,
  manualAddDraft,
  isManualAddExpanded,
  onTabChange,
  onToggleManualAdd,
  onDraftChange,
  onSubmitManualAdd,
}: ScheduleSidebarPanelProps) => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <section className="shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {selectedDateLabel}
          </h3>
          {isLoading && (
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-white/10 dark:text-gray-300">
              刷新中
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          右侧主区改成标签页，避免内容继续把页面往下顶。
        </p>
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white/70 p-3 dark:border-white/10 dark:bg-black/20">
        <div className="mb-3 flex shrink-0 gap-2">
          {SIDEBAR_TABS.map((tab) => {
            const isActive = tab.id === activeSidebarTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={[
                  "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900"
                    : "bg-black/5 text-gray-600 hover:bg-black/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5">
          {activeSidebarTab === "schedule" ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-200/80 px-4 py-3 dark:border-white/10">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  当天安排
                </h4>
                {hasValidSelectedDate && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedEvents.length} 条
                  </span>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {isInitialLoading ? (
                  <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    正在加载日程...
                  </div>
                ) : selectedEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${getTypeColor(event.type)}`}
                          />
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {event.title}
                          </span>
                          {event.time && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {event.time}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {event.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {hasValidSelectedDate
                      ? "当天还没有安排"
                      : "当前月份里先选一个日期"}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full px-4 py-3">
              <TodayTodos
                variant="schedule"
                maxVisible={8}
                description="把今天要推进的事收在这里，直接勾掉。"
              />
            </div>
          )}
        </div>
      </section>

      <section className="shrink-0 space-y-2">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/70 dark:border-white/10 dark:bg-black/20">
          <button
            type="button"
            onClick={onToggleManualAdd}
            className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
          >
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                手动添加进程
              </h4>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                默认收起，草稿会保留。
              </p>
            </div>
            <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {isManualAddExpanded ? "收起" : "展开"}
            </span>
          </button>

          {isManualAddExpanded && (
            <div className="space-y-2 border-t border-gray-200 px-3 py-3 dark:border-white/10">
              <input
                value={manualAddDraft.title}
                onChange={(event) => onDraftChange({ title: event.target.value })}
                placeholder={hasValidSelectedDate ? "进程标题（必填）" : "请先在左侧选中日期"}
                disabled={!hasValidSelectedDate || isSaving}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-400 dark:border-white/10 dark:bg-black/20 dark:text-white"
              />
              <input
                value={manualAddDraft.time}
                onChange={(event) => onDraftChange({ time: event.target.value })}
                placeholder="时间（可选，如 15:00）"
                disabled={!hasValidSelectedDate || isSaving}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-400 dark:border-white/10 dark:bg-black/20 dark:text-white"
              />
              <textarea
                value={manualAddDraft.description}
                onChange={(event) =>
                  onDraftChange({ description: event.target.value })
                }
                placeholder="进程说明（可选）"
                disabled={!hasValidSelectedDate || isSaving}
                rows={2}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-400 dark:border-white/10 dark:bg-black/20 dark:text-white"
              />
              <div className="flex items-center gap-2">
                <select
                  value={manualAddDraft.type}
                  onChange={(event) => onDraftChange({ type: event.target.value })}
                  disabled={!hasValidSelectedDate || isSaving}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-400 dark:border-white/10 dark:bg-black/20 dark:text-white"
                >
                  <option value="task">任务</option>
                  <option value="meeting">会议</option>
                  <option value="deadline">截止日期</option>
                  <option value="reminder">提醒</option>
                </select>
                <button
                  type="button"
                  onClick={onSubmitManualAdd}
                  disabled={!hasValidSelectedDate || !manualAddDraft.title.trim() || isSaving}
                  className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "添加中..." : "添加"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-black/20">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {EVENT_LEGEND_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                <span className="text-[11px] text-gray-600 dark:text-gray-400">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ScheduleSidebarPanel;
