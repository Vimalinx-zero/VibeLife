import { memo } from "react";

/**
 * StudyHeatmap 组件 - 学习热力图
 * GitHub 风格的学习活动热力图
 */

interface DayData {
  date: string;
  intensity: number;
  duration: number;
}

interface HeatmapData {
  date: string;
  intensity: number;
  duration: number;
}

interface StudyHeatmapProps {
  data?: HeatmapData[];
  days?: number;
}

const StudyHeatmap = memo(({ data = [], days = 30 }: StudyHeatmapProps) => {
  // 生成最近N天的日期数据
  const generateDates = (): DayData[] => {
    const dates: DayData[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // 从数据中查找该日期的强度，默认为0
      const dayData = data.find(d => d.date === dateStr);
      dates.push({
        date: dateStr,
        intensity: dayData?.intensity || 0,
        duration: dayData?.duration || 0
      });
    }
    return dates;
  };

  const dates = generateDates();

  // 获取颜色等级（0-4）
  const getColorLevel = (intensity: number): number => {
    if (intensity === 0) return 0;
    if (intensity < 0.25) return 1;
    if (intensity < 0.5) return 2;
    if (intensity < 0.75) return 3;
    return 4;
  };

  // 格式化日期显示
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 格式化时长
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // 按周分组
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];
  dates.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === dates.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // 计算总学习时长
  const totalMinutes = dates.reduce((sum, day) => sum + (day.duration || 0), 0);
  const activeDays = dates.filter(day => day.intensity > 0).length;

  return (
    <div className="h-full flex flex-col">
      {/* 标题和统计 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold dark:text-white text-gray-900">学习热力图</h3>
          <p className="text-xs text-gray-500">最近 {days} 天</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold dark:text-white text-gray-900">
            {formatDuration(totalMinutes)}
          </div>
          <div className="text-xs text-gray-500">总时长 · {activeDays} 天活跃</div>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-1 mb-3 text-xs text-gray-500">
        <span>少</span>
        {[0, 1, 2, 3, 4].map(level => (
          <div
            key={level}
            className={`
              w-3 h-3 rounded-sm
              ${level === 0 ? 'bg-gray-100 dark:bg-white/10' :
                level === 1 ? 'bg-green-200 dark:bg-green-900/30' :
                level === 2 ? 'bg-green-400 dark:bg-green-700/50' :
                level === 3 ? 'bg-green-600 dark:bg-green-500/70' :
                'bg-green-800 dark:bg-green-400'}
            `}
          />
        ))}
        <span>多</span>
      </div>

      {/* 热力图网格 */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-0.5 min-w-max">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5">
              {week.map((day, dayIndex) => {
                const level = getColorLevel(day.intensity);
                return (
                  <div
                    key={`${day.date}-${dayIndex}`}
                    className={`
                      w-4 h-4 rounded-sm cursor-pointer
                      transition-all duration-200
                      hover:scale-125 hover:ring-2 hover:ring-blue-500
                      ${level === 0 ? 'bg-gray-100 dark:bg-white/10' :
                        level === 1 ? 'bg-green-200 dark:bg-green-900/30' :
                        level === 2 ? 'bg-green-400 dark:bg-green-700/50' :
                        level === 3 ? 'bg-green-600 dark:bg-green-500/70' :
                        'bg-green-800 dark:bg-green-400'}
                    `}
                    title={`${formatDate(day.date)}: ${day.duration > 0 ? formatDuration(day.duration) : '未学习'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 说明文字 */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        颜色越深表示学习时间越长
      </div>
    </div>
  );
});

StudyHeatmap.displayName = "StudyHeatmap";

export default StudyHeatmap;
