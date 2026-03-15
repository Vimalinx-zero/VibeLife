import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { useToast } from '../context/ToastContext';
import {
  ScheduleEvent,
  createScheduleEvent,
  getScheduleEvents,
} from '../utils/workbenchApi';

const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const formatDateKey = (year: number, monthIndex: number, day: number): string => {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const SchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<number | null>(today.getDate());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventType, setNewEventType] = useState<ScheduleEvent['type']>('task');
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const days: Array<{ slotKey: string; day: number | null }> = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push({ slotKey: `empty-${currentYear}-${currentMonth}-${i}`, day: null });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ slotKey: `day-${currentYear}-${currentMonth}-${i}`, day: i });
  }

  const loadEvents = async () => {
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
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentYear, currentMonth]);

  const getEventsForDate = (day: number | null) => {
    if (day === null) return [];
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    return events.filter((event) => event.event_date === dateKey);
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const prevMonth = () => {
    setShowDetailPopup(false);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    setShowDetailPopup(false);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getTypeColor = (type: ScheduleEvent['type']) => {
    switch (type) {
      case 'meeting': return 'bg-blue-500';
      case 'deadline': return 'bg-red-500';
      case 'reminder': return 'bg-yellow-500';
      case 'task': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleAddProgress = async () => {
    const trimmedTitle = newEventTitle.trim();
    if (!selectedDate || !trimmedTitle) {
      return;
    }

    try {
      setIsSaving(true);
      await createScheduleEvent({
        title: trimmedTitle,
        event_date: formatDateKey(currentYear, currentMonth, selectedDate),
        description: newEventDescription.trim() || undefined,
        time: newEventTime.trim() || undefined,
        type: newEventType,
      });

      await loadEvents();
      setNewEventTitle('');
      setNewEventDescription('');
      setNewEventTime('');
      setNewEventType('task');
      setShowDetailPopup(true);
      toast.success('日程已添加');
    } catch (error) {
      console.error('Failed to create schedule event:', error);
      toast.error('添加日程失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen font-sans relative overflow-hidden">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-sm font-bold text-sm hover:scale-105 transition-transform text-slate-600 dark:text-slate-300"
      >
        <span>←</span>
        <span>返回</span>
      </button>

      <main className="max-w-[1800px] h-full mx-auto p-4 md:p-8 overflow-hidden" style={{ paddingTop: '8vh' }}>
        <div className="h-full grid grid-cols-1 xl:grid-cols-4 gap-6">
          <GlassCard className="xl:col-span-3 p-6 h-full overflow-auto" hoverScale={1.007} hoverLift={-2} hoverShadow="0 10px 22px rgba(0,0,0,0.15)">
            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>上个月</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-2xl font-bold dark:text-white text-gray-900">
                {monthNames[currentMonth]} {currentYear}
              </h2>

              <button
                type="button"
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>下个月</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((slot) => {
                const { day, slotKey } = slot;
                const isToday = day === today.getDate() &&
                  currentMonth === today.getMonth() &&
                  currentYear === today.getFullYear();
                const dayEvents = getEventsForDate(day);
                const isSelected = day === selectedDate;

                if (day === null) {
                  return <div key={slotKey} className="invisible aspect-square rounded-lg" />;
                }

                return (
                  <button
                    type="button"
                    key={slotKey}
                    onClick={() => {
                      setSelectedDate(day);
                      setShowDetailPopup(true);
                    }}
                    className={`
                      relative aspect-square flex flex-col items-start justify-start rounded-lg cursor-pointer p-1.5
                      transition-all duration-200
                      ${isSelected
                        ? 'bg-indigo-500 text-white shadow-md scale-[1.01]'
                        : isToday
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 text-gray-700'
                      }
                    `}
                  >
                    <span className="text-[11px] font-semibold leading-none">{day}</span>
                    <div className="mt-1.5 w-full space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div key={event.id} className={`w-full text-[10px] leading-tight px-1.5 py-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'}`}>
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getTypeColor(event.type)}`} />
                            <span className="truncate">{event.time ? `${event.time} ${event.title}` : event.title}</span>
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
            <GlassCard className="p-6 h-full overflow-auto" hoverScale={1.007} hoverLift={-2} hoverShadow="0 10px 22px rgba(0,0,0,0.15)">
              <h3 className="text-lg font-bold mb-4 dark:text-white text-gray-900">
                {selectedDate ? `${currentMonth + 1}月${selectedDate}日` : '选择日期'}
              </h3>

              <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-black/20">
                <h4 className="text-sm font-semibold mb-3 dark:text-white text-gray-900">手动添加进程</h4>
                <div className="space-y-2">
                  <input
                    value={newEventTitle}
                    onChange={(event) => setNewEventTitle(event.target.value)}
                    placeholder={selectedDate ? '进程标题（必填）' : '请先在日历里选中日期'}
                    disabled={!selectedDate || isSaving}
                    className="w-full rounded-lg px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm focus:outline-none"
                  />
                  <input
                    value={newEventTime}
                    onChange={(event) => setNewEventTime(event.target.value)}
                    placeholder="时间（可选，如 15:00）"
                    disabled={!selectedDate || isSaving}
                    className="w-full rounded-lg px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm focus:outline-none"
                  />
                  <textarea
                    value={newEventDescription}
                    onChange={(event) => setNewEventDescription(event.target.value)}
                    placeholder="进程说明（可选）"
                    disabled={!selectedDate || isSaving}
                    rows={3}
                    className="w-full rounded-lg px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm focus:outline-none resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={newEventType}
                      onChange={(event) => setNewEventType(event.target.value as ScheduleEvent['type'])}
                      disabled={!selectedDate || isSaving}
                      className="flex-1 rounded-lg px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm"
                    >
                      <option value="task">任务</option>
                      <option value="meeting">会议</option>
                      <option value="deadline">截止日期</option>
                      <option value="reminder">提醒</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddProgress}
                      disabled={!selectedDate || !newEventTitle.trim() || isSaving}
                      className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? '添加中...' : '添加'}
                    </button>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  正在加载日程...
                </div>
              ) : selectedEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${getTypeColor(event.type)}`}></div>
                        <span className="font-semibold dark:text-white text-gray-900">{event.title}</span>
                        {event.time && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">{event.time}</span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <title>空日程</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>暂无日程安排</p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold mb-3 dark:text-white text-gray-900">事件类型</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">会议</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">截止日期</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">提醒</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">任务</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {showDetailPopup && selectedDate && (
              <div className="absolute top-4 -left-2 z-30 w-[300px] rounded-2xl border border-white/40 dark:border-white/15 bg-white/92 dark:bg-black/80 backdrop-blur-md shadow-2xl p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-sm font-bold dark:text-white text-gray-900">{currentMonth + 1}月{selectedDate}日详情</p>
                  <button
                    type="button"
                    onClick={() => setShowDetailPopup(false)}
                    className="text-xs px-2 py-1 rounded-md bg-black/5 dark:bg-white/10"
                  >
                    关闭
                  </button>
                </div>

                {selectedEvents.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {selectedEvents.map((event) => (
                      <div key={event.id} className="rounded-lg border border-white/30 dark:border-white/10 p-2.5 bg-black/5 dark:bg-white/5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${getTypeColor(event.type)}`} />
                          <span className="text-xs font-semibold dark:text-white text-gray-900">{event.title}</span>
                        </div>
                        {event.time && <p className="text-[11px] text-gray-500 mt-1">{event.time}</p>}
                        {event.description && <p className="text-[11px] text-gray-500 mt-1">{event.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">当天暂无进程，右侧可直接添加。</p>
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
