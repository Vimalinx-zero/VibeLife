import { memo } from "react";

// --- 图标 ---

interface StatsData {
  duration_minutes?: number;
  questions_completed?: number;
  notes_created?: number;
  mistakes_reviewed?: number;
  anki_reviews?: number;
}

interface StudyStatsProps {
  stats?: StatsData;
}

const Icons = {
  Clock: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" /></svg>,
  CheckCircle: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>,
  BookOpen: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.25 4.533A9.707 9.707 0 006 3.75a9.706 9.706 0 00-6 8.25c0 2.966 1.633 5.68 4.168 7.509.677.488 1.582.26 1.832-.506l.9-2.705a1.125 1.125 0 012.1 0l.9 2.705c.25.766 1.155.994 1.832.506a9.75 9.75 0 004.168-7.509 9.706 9.706 0 00-6-8.25zm-6 1.5c.38.058.756.14 1.125.243v9.73a7.46 7.46 0 01-1.125-.243V6.033zM12.75 16.006V6.033c.369-.103.745-.185 1.125-.243v8.994c-.38.058-.756.14-1.125.243z" /></svg>,
  Brain: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 1.5a.75.75 0 01.75.75V7.5h-1.5V2.25A.75.75 0 0112 1.5zM11.25 7.5v5.69l-1.72-1.72a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l3-3a.75.75 0 10-1.06-1.06l-1.72 1.72V7.5h3.75a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9a3 3 0 013-3h3.75z" /></svg>,
};

/**
 * StudyStats 组件 - 学习统计卡片
 * 显示今日学习数据概览
 */
const StudyStats = memo(({ stats = {} }: StudyStatsProps) => {
  const {
    duration_minutes = 0,
    questions_completed = 0,
    notes_created = 0,
    mistakes_reviewed = 0,
    anki_reviews = 0
  } = stats;

  // 格式化时长
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const statItems = [
    {
      label: "今日学习",
      value: formatDuration(duration_minutes),
      icon: Icons.Clock,
      color: "blue",
      bgColor: "bg-blue-500/20",
      textColor: "text-blue-500"
    },
    {
      label: "完成题目",
      value: questions_completed,
      icon: Icons.CheckCircle,
      color: "green",
      bgColor: "bg-green-500/20",
      textColor: "text-green-500"
    },
    {
      label: "新增笔记",
      value: notes_created,
      icon: Icons.BookOpen,
      color: "yellow",
      bgColor: "bg-yellow-500/20",
      textColor: "text-yellow-500"
    },
    {
      label: "复习错题",
      value: mistakes_reviewed,
      icon: Icons.CheckCircle,
      color: "red",
      bgColor: "bg-red-500/20",
      textColor: "text-red-500"
    },
    {
      label: "记忆卡",
      value: anki_reviews,
      icon: Icons.Brain,
      color: "purple",
      bgColor: "bg-purple-500/20",
      textColor: "text-purple-500"
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="mb-4">
        <h3 className="text-lg font-bold dark:text-white text-gray-900">今日统计</h3>
        <p className="text-xs text-gray-500">学习数据概览</p>
      </div>

      {/* 统计项网格 */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        {statItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className={`
                p-3 rounded-xl border border-white/10 dark:border-white/5
                ${item.bgColor} bg-opacity-10
                hover:scale-105 transition-transform duration-200
                cursor-default
              `}
            >
              <div className={`p-2 rounded-lg ${item.bgColor} w-fit ${item.textColor} mb-2`}>
                <Icon />
              </div>
              <div className={`text-2xl font-bold dark:text-white text-gray-900`}>
                {item.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

StudyStats.displayName = "StudyStats";

export default StudyStats;
