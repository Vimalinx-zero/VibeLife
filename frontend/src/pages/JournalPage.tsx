import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import { useToast } from '../context/ToastContext';
import {
  JournalEntry,
  createJournalEntry,
  getJournalEntries,
} from '../utils/workbenchApi';

const getTodayDateKey = (): string => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const JournalPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(getTodayDateKey());
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const data = await getJournalEntries({
        entryDate: selectedDate,
        limit: 100,
      });
      setEntries(data);
    } catch (error) {
      console.error('Failed to load journal entries:', error);
      toast.error('加载日志失败');
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [selectedDate]);

  const handleCreateEntry = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    try {
      setIsSaving(true);
      const tags = tagInput
        .split(/[，,]/)
        .map((item) => item.trim())
        .filter(Boolean);

      await createJournalEntry({
        title: title.trim() || undefined,
        content: trimmedContent,
        entry_date: selectedDate,
        mood: mood.trim() || undefined,
        tags,
      });

      setTitle('');
      setMood('');
      setContent('');
      setTagInput('');
      await loadEntries();
      toast.success('日志已保存');
    } catch (error) {
      console.error('Failed to create journal entry:', error);
      toast.error('保存日志失败');
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

      <main className="max-w-7xl h-full mx-auto p-4 md:p-8 overflow-hidden" style={{ paddingTop: '8vh' }}>
        <div className="grid h-full grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6">
          <GlassCard className="p-6 h-full overflow-auto" hoverScale={1.007} hoverLift={-2} hoverShadow="0 10px 22px rgba(0,0,0,0.15)">
            <div className="mb-6">
              <h1 className="text-2xl font-bold dark:text-white text-gray-900">日志</h1>
              <p className="text-sm text-gray-500 mt-1">记录当天进展、想法和复盘。</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium dark:text-white text-gray-900">日期</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="mt-1 w-full rounded-lg px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white text-gray-900">标题</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="可选，不填会自动取正文前一句"
                  className="mt-1 w-full rounded-lg px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium dark:text-white text-gray-900">心情</label>
                  <input
                    value={mood}
                    onChange={(event) => setMood(event.target.value)}
                    placeholder="可选"
                    className="mt-1 w-full rounded-lg px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium dark:text-white text-gray-900">标签</label>
                  <input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    placeholder="用逗号分隔"
                    className="mt-1 w-full rounded-lg px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-white text-gray-900">正文</label>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={12}
                  placeholder="写下今天完成了什么、卡在哪里、下一步做什么。"
                  className="mt-1 w-full rounded-lg px-3 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm focus:outline-none resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateEntry}
                disabled={!content.trim() || isSaving}
                className="w-full px-4 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? '保存中...' : '保存日志'}
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-6 h-full overflow-auto" hoverScale={1.007} hoverLift={-2} hoverShadow="0 10px 22px rgba(0,0,0,0.15)">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold dark:text-white text-gray-900">{selectedDate} 的日志</h2>
                <p className="text-sm text-gray-500 mt-1">共 {entries.length} 条</p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">正在加载日志...</div>
            ) : entries.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                <p>这一天还没有日志。</p>
                <p className="text-xs mt-2">左侧写一条，或让 OpenClaw 直接帮你记。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold dark:text-white text-gray-900 break-words">
                          {entry.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                          <span>{entry.entry_date}</span>
                          {entry.mood && <span>心情: {entry.mood}</span>}
                          <span>ID: {entry.id}</span>
                        </div>
                      </div>
                    </div>

                    {entry.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-2.5 py-1 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-200">
                      {entry.content}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </main>
    </div>
  );
};

export default JournalPage;
