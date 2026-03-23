import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { useToast } from '../context/ToastContext';
import {
  ScheduleEvent,
  createScheduleEvent,
  getScheduleEvents,
  updateScheduleEvent,
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
  ScheduleSidebarTab,
  selectScheduleDate,
  setActiveScheduleSidebarTab,
  toggleManualAddExpanded,
  updateManualAddDraft,
} from './schedulePageState';
import ScheduleSidebarPanel from './ScheduleSidebarPanel';

const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedDate = uiState.selectedDate;
  const activeSidebarTab = uiState.activeSidebarTab;
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
    setUiState((previous) => selectScheduleDate(previous, day));
  }, []);

  const handleDraftChange = useCallback(
    (updates: Partial<ScheduleManualAddDraft>) => {
      setUiState((previous) => updateManualAddDraft(previous, updates));
    },
    []
  );

  const handleSidebarTabChange = useCallback((nextTab: ScheduleSidebarTab) => {
    setUiState((previous) => setActiveScheduleSidebarTab(previous, nextTab));
  }, []);

  const handleToggleManualAdd = useCallback(() => {
    setUiState((previous) => toggleManualAddExpanded(previous));
  }, []);

  const prevMonth = useCallback(() => {
    setCurrentMonth((previousMonth) => {
      if (previousMonth === 0) {
        setCurrentYear((previousYear) => previousYear - 1);
        return 11;
      }

      return previousMonth - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
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

  const handleUpdateEvent = useCallback(
    async (
      eventId: string,
      payload: Partial<
        Pick<ScheduleEvent, 'title' | 'description' | 'time' | 'type'>
      >
    ) => {
      try {
        await updateScheduleEvent(eventId, payload);
        toast.success('日程已更新');
        await loadEvents();
        return true;
      } catch (error) {
        console.error('Failed to update schedule event:', error);
        toast.error('更新日程失败');
        return false;
      }
    },
    [loadEvents, toast]
  );

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
        className="mx-auto h-full max-w-[1800px] overflow-auto p-4 md:p-8 xl:overflow-hidden"
        style={{ paddingTop: '8vh' }}
      >
        <div className="grid grid-cols-1 gap-5 xl:h-full xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,1fr)]">
          <GlassCard
            className="min-h-[640px] overflow-auto p-5 md:p-6 xl:h-full"
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

          <div className="relative min-h-[620px] xl:h-full">
            <GlassCard
              className="min-h-[620px] p-4 md:p-5 xl:h-full xl:overflow-hidden"
              hoverScale={1.007}
              hoverLift={-2}
              hoverShadow="0 10px 22px rgba(0,0,0,0.15)"
            >
              <ScheduleSidebarPanel
                selectedDateLabel={selectedDateLabel}
                activeSidebarTab={activeSidebarTab}
                selectedEvents={selectedEvents}
                hasValidSelectedDate={hasValidSelectedDate}
                isLoading={isLoading}
                isInitialLoading={isInitialLoading}
                isSaving={isSaving}
                manualAddDraft={manualAddDraft}
                isManualAddExpanded={isManualAddExpanded}
                onTabChange={handleSidebarTabChange}
                onToggleManualAdd={handleToggleManualAdd}
                onDraftChange={handleDraftChange}
                onSubmitManualAdd={() => void handleAddProgress()}
                onUpdateEvent={handleUpdateEvent}
              />
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SchedulePage;
