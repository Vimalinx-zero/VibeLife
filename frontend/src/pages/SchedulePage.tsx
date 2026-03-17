import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import TodayTodos from '../components/TodayTodos';
import { useToast } from '../context/ToastContext';
import {
  ScheduleEvent,
  createScheduleEvent,
  getScheduleEvents,
} from '../utils/workbenchApi';
import { WORKBENCH_DATA_REFRESH_EVENT } from '../utils/workbenchTodoEvents';
import {
  buildScheduleCalendarSlots,
  formatScheduleDateKey,
  formatScheduleSelectedDateLabel,
  getScheduleEventsForDay,
} from './schedulePageCalendar';
import {
  createInitialSchedulePageUiState,
  preserveScheduleUiStateOnRefresh,
  preserveScheduleUiStateOnSubmitFailure,
  resetScheduleUiStateAfterSubmitSuccess,
  ScheduleManualAddDraft,
  toggleManualAddExpanded,
  updateManualAddDraft,
} from './schedulePageState';

const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const EVENT_LEGEND_ITEMS: Array<{ label: string; color: string }> = [
  { label: '会议', color: 'bg-blue-500' },
  { label: '截止日期', color: 'bg-red-500' },
  { label: '提醒', color: 'bg-yellow-500' },
  { label: '任务', color: 'bg-green-500' },
];

const getTypeColor = (type: ScheduleEvent['type']) => {
  switch (type) {
    case 'meeting':
      return 'bg-blue-500';
    case 'deadline':
      return 'bg-red-500';
    case 'reminder':
      return 'bg-yellow-500';
    case 'task':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

const SchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [uiState, setUiState] = useState(() =>
    createInitialSchedulePageUiState(today.getDate())
  );
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedDate = uiState.selectedDate;
  const manualAddDraft = uiState.manualAddDraft;
  const isManualAddExpanded = uiState.isManualAddExpanded;

  const daysInMonth = useMemo(
    () => new Date(currentYear, currentMonth + 1, 0).getDate(),
    [currentYear, currentMonth]
  );
  const hasValidSelectedDate = selectedDate !== null && selectedDate <= daysInMonth;

  const calendarSlots = useMemo(
    () => buildScheduleCalendarSlots(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, ScheduleEvent[]>();

    events.forEach((event) => {
      const bucket = grouped.get(event.event_date);
      if (bucket) {
        bucket.push(event);
        return;
      }

      grouped.set(event.event_date, [event]);
    });

    return grouped;
  }, [events]);

  const selectedEvents = useMemo(
    () => getScheduleEventsForDay(events, currentYear, currentMonth, selectedDate),
    [events, currentYear, currentMonth, selectedDate]
  );

  const selectedDateLabel = useMemo(
    () => (hasValidSelectedDate && selectedDate !== null
      ? formatScheduleSelectedDateLabel(currentMonth, selectedDate)
      : '选择日期'),
    [currentMonth, hasValidSelectedDate, selectedDate]
  );

  const getEventsForDate = useCallback(
    (day: number | null) => {
      if (day === null) {
        return [];
      }

      return (
        eventsByDate.get(formatScheduleDateKey(currentYear, currentMonth, day)) ?? []
      );
    },
    [currentYear, currentMonth, eventsByDate]
  );

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getScheduleEvents({
        year: currentYear,
        month: currentMonth + 1,
        limit: 500,
      });
      setEvents(data);
    } catch (error) {
      console.error('Failed to load schedule events:', error);
      toast.error('加载日程失败');
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth, toast]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const handleRefresh = () => {
      setUiState((previous) => preserveScheduleUiStateOnRefresh(previous));
      void loadEvents();
    };

    window.addEventListener(WORKBENCH_DATA_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(WORKBENCH_DATA_REFRESH_EVENT, handleRefresh);
    };
  }, [loadEvents]);

  const handleSelectDate = useCallback((day: number) => {
    setUiState((previous) => ({
      ...previous,
      selectedDate: day,
    }));
    setShowDetailPopup(true);
  }, []);

  const handleDraftChange = useCallback(
    (updates: Partial<ScheduleManualAddDraft>) => {
      setUiState((previous) => updateManualAddDraft(previous, updates));
    },
    []
  );

  const prevMonth = useCallback(() => {
    setShowDetailPopup(false);
    setCurrentMonth((previousMonth) => {
      if (previousMonth === 0) {
        setCurrentYear((previousYear) => previousYear - 1);
        return 11;
      }

      return previousMonth - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setShowDetailPopup(false);
    setCurrentMonth((previousMonth) => {
      if (previousMonth === 11) {
        setCurrentYear((previousYear) => previousYear + 1);
        return 0;
      }

      return previousMonth + 1;
    });
  }, []);

  const handleAddProgress = useCallback(async () => {
    const trimmedTitle = manualAddDraft.title.trim();
    if (!hasValidSelectedDate || !selectedDate || !trimmedTitle) {
      return;
    }

    try {
      setIsSaving(true);
      await createScheduleEvent({
        title: trimmedTitle,
        event_date: formatScheduleDateKey(currentYear, currentMonth, selectedDate),
        description: manualAddDraft.description.trim() || undefined,
        time: manualAddDraft.time.trim() || undefined,
        type: manualAddDraft.type,
      });

      setUiState((previous) => resetScheduleUiStateAfterSubmitSuccess(previous));
      setShowDetailPopup(true);
      toast.success('日程已添加');
      await loadEvents();
    } catch (error) {
      console.error('Failed to create schedule event:', error);
      setUiState((previous) =>
        preserveScheduleUiStateOnSubmitFailure(previous)
      );
      toast.error('添加日程失败');
    } finally {
      setIsSaving(false);
    }
  }, [
    currentMonth,
    currentYear,
    loadEvents,
    manualAddDraft.description,
    manualAddDraft.time,
    manualAddDraft.title,
    manualAddDraft.type,
    selectedDate,
    hasValidSelectedDate,
    toast,
  ]);

  const isInitialLoading = isLoading && events.length === 0;

  return (
    <div className="relative h-screen overflow-hidden font-sans">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 rounded-full border border-white/20 bg-white/80 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm backdrop-blur-md transition-transform hover:scale-105 dark:bg-slate-800/80 dark:text-slate-300"
      >
        <span>←</span>
        <span>返回</span>
      </button>

      <main
        className="mx-auto h-full max-w-[1800px] overflow-hidden p-4 md:p-8"
        style={{ paddingTop: '8vh' }}
      >
        <div className="grid h-full grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,1fr)]">
          <GlassCard
            className="h-full overflow-auto p-5 md:p-6"
            hoverScale={1.007}
            hoverLift={-2}
            hoverShadow="0 10px 22px rgba(0,0,0,0.15)"
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="h-6 w-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>上个月</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {monthNames[currentMonth]} {currentYear}
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  月历压紧显示，月底日期和摘要会更完整
                </p>
              </div>

              <button
                type="button"
                onClick={nextMonth}
                className="rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="h-6 w-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>下个月</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="mb-3 grid grid-cols-7 gap-1.5">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 md:gap-2">
              {calendarSlots.map((slot) => {
                const { day, slotKey } = slot;
                const isToday = day === today.getDate()
                  && currentMonth === today.getMonth()
                  && currentYear === today.getFullYear();
                const dayEvents = getEventsForDate(day);
                const isSelected = day === selectedDate;

                if (day === null) {
                  return (
                    <div
                      key={slotKey}
                      className="min-h-[108px] rounded-2xl opacity-0 md:min-h-[118px]"
                    />
                  );
                }

                return (
                  <button
                    type="button"
                    key={slotKey}
                    onClick={() => handleSelectDate(day)}
                    className={[
                      'flex min-h-[108px] flex-col items-start rounded-2xl border p-2 text-left transition-all duration-200 md:min-h-[118px]',
                      isSelected
                        ? 'border-indigo-400/80 bg-indigo-500 text-white shadow-[0_14px_28px_rgba(79,70,229,0.28)]'
                        : isToday
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/50 dark:bg-indigo-950/40 dark:text-indigo-200'
                          : 'border-gray-200 bg-white/70 text-gray-700 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10',
                    ].join(' ')}
                  >
                    <div className="mb-1 flex w-full items-start justify-between gap-2">
                      <span className="text-xs font-semibold leading-none">{day}</span>
                      {dayEvents.length > 0 && (
                        <span
                          className={[
                            'rounded-full px-1.5 py-0.5 text-[10px] leading-none',
                            isSelected
                              ? 'bg-white/15 text-white'
                              : 'bg-black/5 text-gray-500 dark:bg-white/10 dark:text-gray-300',
                          ].join(' ')}
                        >
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="w-full space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={[
                            'rounded-xl px-1.5 py-1 text-[10px] leading-tight',
                            isSelected
                              ? 'bg-white/15 text-white'
                              : 'bg-black/5 text-gray-700 dark:bg-white/10 dark:text-gray-200',
                          ].join(' ')}
                        >
                          <div className="flex items-start gap-1.5">
                            <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${getTypeColor(event.type)}`} />
                            <span className="max-h-8 overflow-hidden break-words">
                              {event.time ? `${event.time} ${event.title}` : event.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          <div className="relative h-full">
            <GlassCard
              className="h-full overflow-auto p-5 md:p-6"
              hoverScale={1.007}
              hoverLift={-2}
              hoverShadow="0 10px 22px rgba(0,0,0,0.15)"
            >
              <div className="space-y-5">
                <section>
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
                    先看当天安排，再把今天推进中的事直接勾掉。
                  </p>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      当天安排
                    </h4>
                    {hasValidSelectedDate && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedEvents.length} 条
                      </span>
                    )}
                  </div>

                  {isInitialLoading ? (
                    <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      正在加载日程...
                    </div>
                  ) : selectedEvents.length > 0 ? (
                    <div className="space-y-3">
                      {selectedEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${getTypeColor(event.type)}`} />
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
                        ? '当天还没有安排'
                        : '当前月份里先选一个日期'}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20">
                  <TodayTodos
                    variant="schedule"
                    maxVisible={8}
                    description="把今天要推进的事收在这里，直接勾掉。"
                  />
                </section>

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white/70 dark:border-white/10 dark:bg-black/20">
                  <button
                    type="button"
                    onClick={() =>
                      setUiState((previous) => toggleManualAddExpanded(previous))
                    }
                    className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        手动添加进程
                      </h4>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        默认收起，需要时再补录，不会清空你已经写好的草稿。
                      </p>
                    </div>
                    <span className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {isManualAddExpanded ? '收起' : '展开'}
                    </span>
                  </button>

                  {isManualAddExpanded && (
                    <div className="space-y-3 border-t border-gray-200 px-4 py-4 dark:border-white/10">
                      <input
                        value={manualAddDraft.title}
                        onChange={(event) =>
                          handleDraftChange({ title: event.target.value })
                        }
                        placeholder={hasValidSelectedDate ? '进程标题（必填）' : '请先在左侧选中日期'}
                        disabled={!hasValidSelectedDate || isSaving}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-400 dark:border-white/10 dark:bg-black/20 dark:text-white"
                      />
                      <input
                        value={manualAddDraft.time}
                        onChange={(event) =>
                          handleDraftChange({ time: event.target.value })
                        }
                        placeholder="时间（可选，如 15:00）"
                        disabled={!hasValidSelectedDate || isSaving}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-400 dark:border-white/10 dark:bg-black/20 dark:text-white"
                      />
                      <textarea
                        value={manualAddDraft.description}
                        onChange={(event) =>
                          handleDraftChange({ description: event.target.value })
                        }
                        placeholder="进程说明（可选）"
                        disabled={!hasValidSelectedDate || isSaving}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-400 dark:border-white/10 dark:bg-black/20 dark:text-white"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={manualAddDraft.type}
                          onChange={(event) =>
                            handleDraftChange({ type: event.target.value })
                          }
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
                          onClick={() => void handleAddProgress()}
                          disabled={!hasValidSelectedDate || !manualAddDraft.title.trim() || isSaving}
                          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSaving ? '添加中...' : '添加'}
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20">
                  <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                    事件类型
                  </h4>
                  <div className="space-y-2">
                    {EVENT_LEGEND_ITEMS.map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${item.color}`} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </GlassCard>

            {showDetailPopup && hasValidSelectedDate && selectedDate && (
              <div className="absolute top-4 -left-3 z-30 w-[300px] rounded-2xl border border-white/40 bg-white/92 p-4 shadow-2xl backdrop-blur-md dark:border-white/15 dark:bg-black/80">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {currentMonth + 1}月{selectedDate}日详情
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDetailPopup(false)}
                    className="rounded-md bg-black/5 px-2 py-1 text-xs dark:bg-white/10"
                  >
                    关闭
                  </button>
                </div>

                {selectedEvents.length > 0 ? (
                  <div className="max-h-64 space-y-2 overflow-auto">
                    {selectedEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-white/30 bg-black/5 p-2.5 dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${getTypeColor(event.type)}`} />
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">
                            {event.title}
                          </span>
                        </div>
                        {event.time && (
                          <p className="mt-1 text-[11px] text-gray-500">
                            {event.time}
                          </p>
                        )}
                        {event.description && (
                          <p className="mt-1 text-[11px] text-gray-500">
                            {event.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    当天暂无进程，右侧可直接添加。
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SchedulePage;
