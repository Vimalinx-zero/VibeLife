import { useEffect, useState } from "react";
import GlassCard from "./GlassCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

// 定义数据类型
interface DailyStatsItem {
  date: string;
  count: number;
}

interface MasteryStatsItem {
  name: string;
  value: number;
  color?: string;
  [key: string]: any; // Index signature for recharts compatibility
}

// API 获取统计数据
const API_BASE = 'http://localhost:8000';

export async function getDailyStats(days = 30): Promise<DailyStatsItem[]> {
  const response = await fetch(`${API_BASE}/api/anki/stats/daily?days=${days}`);
  if (!response.ok) {
    throw new Error('Failed to fetch daily stats');
  }
  return response.json();
}

export async function getMasteryStats(): Promise<MasteryStatsItem[]> {
  const response = await fetch(`${API_BASE}/api/anki/stats/mastery`);
  if (!response.ok) {
    throw new Error('Failed to fetch mastery stats');
  }
  return response.json();
}

function AnkiStatsCharts() {
  const [dailyData, setDailyData] = useState<DailyStatsItem[]>([]);
  const [masteryData, setMasteryData] = useState<MasteryStatsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30); // 默认显示30天

  // Indigo 色系配色（单色系方案）
  const indigoColors = {
    50: '#eef2ff',   // 最浅
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // 主色
    600: '#4f46e5',
    700: '#4338ca',
  };

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [daily, mastery] = await Promise.all([
        getDailyStats(days),
        getMasteryStats()
      ]);

      // 处理日期数据，只保留月-日
      const processedDaily = daily.map(item => ({
        ...item,
        date: item.date.substring(5) // "2025-01-15" -> "01-15"
      }));

      setDailyData(processedDaily);

      // 更新熟练度数据为单色系
      const masteryWithIndigoColors = [
        { ...mastery[0], color: indigoColors[500] }, // 新卡片 - 主色
        { ...mastery[1], color: indigoColors[300] }, // 学习中 - 较浅
        { ...mastery[2], color: indigoColors[600] }, // 熟悉中 - 较深
        { ...mastery[3], color: indigoColors[200] }, // 已掌握 - 最浅
      ];

      setMasteryData(masteryWithIndigoColors);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-600 py-12">
        加载统计数据中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 每日复习量柱状图 */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold dark:text-white text-gray-900 mb-1">
              每日复习量
            </h3>
            <p className="text-sm text-gray-500">
              最近 {days} 天的学习记录
            </p>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30, 60].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-sm rounded-lg transition-all ${
                  days === d
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
              >
                {d}天
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-white/10" />
            <XAxis
              dataKey="date"
              className="text-gray-500 dark:text-gray-400"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis className="text-gray-500 dark:text-gray-400" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: '#1f2937'
              }}
              formatter={(value) => [`${value} 次`, '复习量']}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <Bar
              dataKey="count"
              fill="url(#barGradient)"
              radius={[4, 4, 0, 0]}
            />
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.9} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>

        {/* 统计摘要 */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: indigoColors[500] }}>
              {dailyData.reduce((sum, d) => sum + d.count, 0)}
            </div>
            <div className="text-sm text-gray-500">总复习次数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: indigoColors[600] }}>
              {dailyData.filter(d => d.count > 0).length}
            </div>
            <div className="text-sm text-gray-500">活跃天数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: indigoColors[400] }}>
              {dailyData.length > 0
                ? Math.round(dailyData.reduce((sum, d) => sum + d.count, 0) / dailyData.length)
                : 0}
            </div>
            <div className="text-sm text-gray-500">日均复习</div>
          </div>
        </div>
      </GlassCard>

      {/* 熟练度分布饼图 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="text-xl font-bold dark:text-white text-gray-900 mb-6">
            熟练度分布
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={masteryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={((payload: any) => {
                  if (!payload) return '';
                  const { name, percent } = payload;
                  return `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`;
                }) as any}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {masteryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#1f2937'
                }}
                formatter={(value) => `${value} 张`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* 熟练度详情卡片 */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-bold dark:text-white text-gray-900 mb-6">
            学习进度详情
          </h3>

          <div className="space-y-4">
            {masteryData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {item.name}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold dark:text-white text-gray-900">
                    {item.value}
                  </div>
                  <div className="text-sm text-gray-500">张卡片</div>
                </div>
              </div>
            ))}
          </div>

          {/* 总计 */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300 font-semibold">
                总卡片数
              </span>
              <span className="text-2xl font-bold dark:text-white text-gray-900">
                {masteryData.reduce((sum, item) => sum + item.value, 0)}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default AnkiStatsCharts;
