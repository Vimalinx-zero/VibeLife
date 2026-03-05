import { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";

const Icons = {
  Clock: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" /></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>,
  Bug: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59z" /><path fillRule="evenodd" d="M12 6.75a5.25 5.25 0 015.25 5.25v3a3 3 0 00-3 3v.75h-4.5v-.75a3 3 0 00-3-3v-3A5.25 5.25 0 0112 6.75z" clipRule="evenodd" /></svg>,
  Target: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 6a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 010-1.5h3.75V6.75A.75.75 0 0112 6z" /></svg>,
};

/**
 * WorkbenchStats - 今日统计面板
 * 显示工作台的今日数据
 */
const WorkbenchStats = () => {
  const { isDark } = useTheme();
  const [stats, setStats] = useState({
    today_focus_minutes: 0,
    today_sessions: 0,
    today_mistakes: 0,
    total_mistakes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/workbench/stats");
        if (response.data) {
          setStats(response.data);
        }
      } catch (e) {
        console.warn('Failed to fetch stats:', e);
        // Use localStorage fallback
        const sessions = JSON.parse(localStorage.getItem('workbench_sessions') || '[]');
        const today = new Date().toDateString();
        const todaySessions = sessions.filter(s => new Date(s.created_at).toDateString() === today);
        const todayFocusMinutes = todaySessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

        setStats({
          today_focus_minutes: todayFocusMinutes,
          today_sessions: todaySessions.length,
          today_mistakes: 0,
          total_mistakes: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatMinutes = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (loading) {
    return (
      <div className="px-8 py-6 border-b border-gray-200/50 dark:border-white/5">
        <div className="animate-pulse flex gap-4">
          <div className="flex-1 h-12 bg-gray-200 dark:bg-white/5 rounded-lg"></div>
          <div className="flex-1 h-12 bg-gray-200 dark:bg-white/5 rounded-lg"></div>
          <div className="flex-1 h-12 bg-gray-200 dark:bg-white/5 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const statItems = [
    {
      label: "专注时长",
      value: formatMinutes(stats.today_focus_minutes),
      icon: Icons.Clock,
      color: "text-blue-500 dark:text-blue-400",
      bgColor: "bg-blue-50/80 dark:bg-blue-900/20"
    },
    {
      label: "番茄钟",
      value: stats.today_sessions,
      icon: Icons.Target,
      color: "text-indigo-500 dark:text-indigo-400",
      bgColor: "bg-indigo-50/80 dark:bg-indigo-900/20"
    },
    {
      label: "收集错题",
      value: stats.today_mistakes,
      icon: Icons.Bug,
      color: "text-red-500 dark:text-red-400",
      bgColor: "bg-red-50/80 dark:bg-red-900/20"
    }
  ];

  return (
    <div className="px-8 py-4 border-b border-gray-200/50 dark:border-white/5 bg-white/20 dark:bg-black/10">
      <div className="flex gap-4">
        {statItems.map((item, index) => (
          <div
            key={index}
            className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg ${item.bgColor} border border-white/10 transition-all duration-300 hover:scale-105`}
          >
            <span className={item.color}>
              <item.icon />
            </span>
            <div className="flex-1">
              <div className="text-lg font-bold dark:text-white text-gray-900">
                {item.value}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkbenchStats;
