import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { aiAPI, apiClient } from "../utils/api"; // ✅ 修复：导入 apiClient 以自动添加 token
import GlassCard from "../components/GlassCard";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";  // ✅ 导入 AuthContext
import { useToast } from "../context/ToastContext";
import TodayTodos from "../components/TodayTodos";
import { dispatchWorkbenchAiRefresh, WORKBENCH_DATA_REFRESH_EVENT } from "../utils/workbenchTodoEvents";
import {
  normalizeCoachData,
  type CoachData,
} from "./dashboardCoachData";
import {
  normalizeWorkbenchPrepareData,
  type WorkbenchPrepareSummary,
} from "./dashboardWorkbenchPrepareData";

// --- 纯手写 SVG 图标 ---
const Icons = {
  Play: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>,
  Pen: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" /></svg>,
  Bug: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59z" /><path fillRule="evenodd" d="M12 6.75a5.25 5.25 0 015.25 5.25v3a3 3 0 00-3 3v.75h-4.5v-.75a3 3 0 00-3-3v-3A5.25 5.25 0 0112 6.75z" clipRule="evenodd" /></svg>,
  BookOpen: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M11.25 4.533A9.707 9.707 0 006 3.75a9.706 9.706 0 00-6 8.25c0 2.966 1.633 5.68 4.168 7.509.677.488 1.582.26 1.832-.506l.9-2.705a1.125 1.125 0 012.1 0l.9 2.705c.25.766 1.155.994 1.832.506a9.75 9.75 0 004.168-7.509 9.706 9.706 0 00-6-8.25zm-6 1.5c.38.058.756.14 1.125.243v9.73a7.46 7.46 0 01-1.125-.243V6.033zM12.75 16.006V6.033c.369-.103.745-.185 1.125-.243v8.994c-.38.058-.756.14-1.125.243z" /></svg>,
  Brain: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 1.5a.75.75 0 01.75.75V7.5h-1.5V2.25A.75.75 0 0112 1.5zM11.25 7.5v5.69l-1.72-1.72a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l3-3a.75.75 0 10-1.06-1.06l-1.72 1.72V7.5h3.75a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9a3 3 0 013-3h3.75z" /></svg>,
  Clock: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" /></svg>,
  CheckCircle: () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>,
};

interface DashboardStats {
  username: string;
  daily_progress: number;
  notes_count: number;
  project_count: number;
  pending_todos: number;
  today_focus_minutes: number;
}

interface TodayStats {
  focus_minutes: number;
  notes_created: number;
  journal_entries: number;
  completed_todos: number;
}

interface StatItemProps {
  label: string;
  value: number | string;
  icon: React.FC;
  bgColor: string;
  textColor: string;
}

const StatItem = ({ label, value, icon: Icon, bgColor, textColor }: StatItemProps) => (
  <div className={`p-3 rounded-xl border border-white/10 ${bgColor} hover:scale-105 transition-transform duration-200`}>
    <div className={`p-2 rounded-lg ${bgColor} w-fit ${textColor} mb-2`}>
      <Icon />
    </div>
    <div className="text-xl font-bold dark:text-white text-gray-900">{value}</div>
    <div className="text-xs text-gray-500 mt-1">{label}</div>
  </div>
);

const getTodayDateKey = (): string => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useTheme();
  const { token } = useAuth();  // ✅ 获取认证 token
  const toast = useToast();

  // 状态管理
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats>({
    username: "Alex",
    daily_progress: 0,
    notes_count: 0,
    project_count: 0,
    pending_todos: 0,
    today_focus_minutes: 0
  });
  const [todayStats, setTodayStats] = useState<TodayStats>({
    focus_minutes: 0,
    notes_created: 0,
    journal_entries: 0,
    completed_todos: 0
  });
  const [coachData, setCoachData] = useState<CoachData | null>(null);
  const [coachLoading, setCoachLoading] = useState<boolean>(true);
  const [coachGenerating, setCoachGenerating] = useState<boolean>(false);
  const [todayJournalCount, setTodayJournalCount] = useState<number>(0);
  const [lastPreparedWorkbench, setLastPreparedWorkbench] = useState<WorkbenchPrepareSummary | null>(null);

  // 更新时钟
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const loadCoach = async () => {
    const dateKey = getTodayDateKey();

    try {
      setCoachLoading(true);
      const response = await apiClient.get('/ai/coach/today', {
        params: { date_key: dateKey },
      });
      if (response.data?.success) {
        setCoachData(normalizeCoachData(response.data));
      }
    } catch (error) {
      console.error('Failed to load coach data:', error);
    } finally {
      setCoachLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const statsRes = await apiClient.get("/dashboard");
      if(statsRes.data) setStats(statsRes.data);

      const todayStatsRes = await apiClient.get("/dashboard/stats");
      if(todayStatsRes.data) setTodayStats(todayStatsRes.data);

      const journalRes = await apiClient.get("/workbench/journal", {
        params: {
          entry_date: getTodayDateKey(),
          limit: 200,
        }
      });
      setTodayJournalCount(Array.isArray(journalRes.data) ? journalRes.data.length : 0);

    } catch (error) {
      console.log("后端未连接或未认证，使用模拟数据");
      setTodayStats({
        focus_minutes: 0,
        notes_created: 0,
        journal_entries: 0,
        completed_todos: 0
      });
      setTodayJournalCount(0);
    }
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    void fetchDashboardData();
    void loadCoach();

    const handleRefresh = () => {
      void fetchDashboardData();
      void loadCoach();
    };

    window.addEventListener(WORKBENCH_DATA_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(WORKBENCH_DATA_REFRESH_EVENT, handleRefresh);
    };
  }, [token]);

  const handlePrepareWorkbench = async () => {
    const dateKey = getTodayDateKey();

    try {
      setCoachGenerating(true);
      const response = await aiAPI.prepareWorkbench({
        date_key: dateKey,
        max_items: coachData?.adaptive?.recommended_plan_items || 3
      });

      const prepared = normalizeWorkbenchPrepareData(response);
      setLastPreparedWorkbench(prepared);
      dispatchWorkbenchAiRefresh();
      await Promise.all([fetchDashboardData(), loadCoach()]);

      if (prepared.dailyPlan.createdCount > 0) {
        toast.success(`✅ 已准备工作台，生成 ${prepared.dailyPlan.createdCount} 条今日任务`);
      } else {
        toast.success(`✅ 已准备工作台${prepared.projectDigest.count > 0 ? `，聚焦 ${prepared.projectDigest.count} 个项目` : ''}`);
      }

      navigate('/workbench');
    } catch (error: any) {
      toast.error(`❌ 准备工作台失败: ${error?.response?.data?.detail || error?.message || '未知错误'}`);
    } finally {
      setCoachGenerating(false);
    }
  };

  // 格式化时间
  const formatTime = (date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // 格式化日期
  const formatDate = (date) => {
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // 生成问候语
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 6) return "夜深了";
    if (hour < 9) return "早安";
    if (hour < 12) return "上午好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    if (hour < 22) return "晚上好";
    return "夜深了";
  };

  return (
    <div className="h-screen font-sans relative overflow-hidden">
      <main
        className="max-w-7xl h-full mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-4 grid-rows-auto gap-5 overflow-hidden"
        style={{ paddingTop: '8vh' }}
      >

        {/* ========== 第一行：欢迎卡片 + 工作入口 ========== */}

        {/* 欢迎卡片 (2x2) - 包含统计 */}
        <GlassCard className="col-span-1 md:col-span-2 md:row-span-2 p-8 flex flex-col justify-between min-h-[400px]" onClick={() => navigate('/workbench')}>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 dark:text-white text-gray-900">
              {getGreeting()}, {profile.name}.
            </h1>
            <p className="text-sm text-gray-500 mb-6">{formatDate(currentTime)}</p>

            {/* 今日统计 - 5 个维度 */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              <StatItem
                label="笔记"
                value={todayStats.notes_created || 0}
                icon={Icons.BookOpen}
                bgColor="bg-yellow-500/20"
                textColor="text-yellow-500"
              />
              <StatItem
                label="今日日志"
                value={todayJournalCount}
                icon={Icons.Clock}
                bgColor="bg-blue-500/20"
                textColor="text-blue-500"
              />
              <StatItem
                label="项目"
                value={stats.project_count || 0}
                icon={Icons.CheckCircle}
                bgColor="bg-green-500/20"
                textColor="text-green-500"
              />
              <StatItem
                label="待办"
                value={stats.pending_todos || 0}
                icon={Icons.Clock}
                bgColor="bg-red-500/20"
                textColor="text-red-500"
              />
              <StatItem
                label="工作时间"
                value={stats.today_focus_minutes || 0}
                icon={Icons.Clock}
                bgColor="bg-purple-500/20"
                textColor="text-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <div className="text-7xl font-thin font-mono dark:text-white text-gray-900">
                {formatTime(currentTime)}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                点击卡片进入工作台
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/workbench')}
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-indigo-500/30 hover:scale-105"
              >
                进入工作台
              </button>
            </div>
          </div>
        </GlassCard>

        {/* 工作四件套 (2x2) */}
        {/* 日程规划 */}
        <GlassCard className="p-6 relative group overflow-hidden" delay={0.1} onClick={() => navigate('/schedule')}>
          <div className="flex justify-between items-start relative z-10">
            <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-500">
              <Icons.Clock />
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold block dark:text-white text-gray-900">
                {stats.daily_progress || 0}%
              </span>
              <span className="text-xs text-gray-500">今日推进</span>
            </div>
          </div>
          <div className="mt-6 relative z-10">
            <h3 className="font-semibold text-lg dark:text-white text-gray-900">日程规划</h3>
            <p className="text-xs text-gray-500 mt-1">查看完整日历</p>
          </div>
        </GlassCard>

        {/* 项目跟踪 */}
        <GlassCard className="p-6 relative group overflow-hidden" delay={0.2} onClick={() => navigate('/projects')}>
          <div className="flex justify-between items-start relative z-10">
            <div className="p-3 bg-green-500/20 rounded-2xl text-green-500">
              <Icons.CheckCircle />
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold block dark:text-white text-gray-900">
                {stats.project_count || 0}
              </span>
            </div>
          </div>
          <div className="mt-6 relative z-10">
            <h3 className="font-semibold text-lg dark:text-white text-gray-900">项目跟踪</h3>
            <p className="text-xs text-gray-500 mt-1">活跃项目状态</p>
          </div>
        </GlassCard>

        {/* 随手笔记 */}
        <GlassCard className="p-6 relative group overflow-hidden" delay={0.3} onClick={() => navigate('/notes')}>
          <div className="flex justify-between items-start relative z-10">
            <div className="p-3 bg-yellow-500/20 rounded-2xl text-yellow-500">
              <Icons.BookOpen />
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold block dark:text-white text-gray-900">
                {stats.notes_count || 0}
              </span>
            </div>
          </div>
          <div className="mt-6 relative z-10">
            <h3 className="font-semibold text-lg dark:text-white text-gray-900">随手笔记</h3>
            <p className="text-xs text-gray-500 mt-1">记录想法</p>
          </div>
        </GlassCard>

        {/* 日志 */}
        <GlassCard className="p-6 relative group overflow-hidden" delay={0.35} onClick={() => navigate('/journal')}>
          <div className="flex justify-between items-start relative z-10">
            <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-500">
              <Icons.Clock />
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold block dark:text-white text-gray-900">
                {todayJournalCount}
              </span>
              <span className="text-xs text-gray-500">今日</span>
            </div>
          </div>
          <div className="mt-6 relative z-10">
            <h3 className="font-semibold text-lg dark:text-white text-gray-900">日志</h3>
            <p className="text-xs text-gray-500 mt-1">工作记录</p>
          </div>
        </GlassCard>

        {/* 今日待办 (2x2) */}
        <GlassCard className="col-span-1 md:col-span-2 md:row-span-2 p-5 h-[300px] md:h-[320px] overflow-hidden" delay={0.4}>
          <TodayTodos />
        </GlassCard>

        <GlassCard className="col-span-1 md:col-span-2 md:row-span-2 p-5 h-[300px] md:h-[320px] overflow-hidden" delay={0.58}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold dark:text-white text-gray-900">一键准备工作台</h3>
              <p className="text-xs text-gray-500 mt-1">自动重排今日待办并汇总当前项目焦点，准备后直接进入工作台</p>
            </div>
            <button
              type="button"
              onClick={handlePrepareWorkbench}
              disabled={coachGenerating || coachLoading}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-60"
            >
              {coachGenerating ? '准备中...' : '准备后进入'}
            </button>
          </div>

          <div className="h-[calc(100%-64px)] overflow-y-auto pr-1">
            {coachLoading ? (
              <div className="text-sm text-gray-500">AI 分析中...</div>
            ) : (
              <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="text-xs rounded-lg px-3 py-2 bg-green-500/10 text-green-600 dark:text-green-300">
                  活跃项目 {stats.project_count || 0}
                </div>
                <div className="text-xs rounded-lg px-3 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-300">
                  今日日志 {todayJournalCount}
                </div>
                <div className="text-xs rounded-lg px-3 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  待办 {coachData?.snapshot.pending_todos || 0}
                </div>
                <div className="text-xs rounded-lg px-3 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-300">
                  工作时间 {coachData?.snapshot.today_focus_minutes || 0} min
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">
                {lastPreparedWorkbench?.coachMessage || coachData?.coach_message || '先完成高优先级任务，再做项目推进。'}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs rounded-full px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                  节奏：{coachData?.adaptive?.label || '稳步推进'}
                </span>
                <span className="text-xs rounded-full px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  7天完成率 {Math.round((coachData?.adaptive?.completion_rate || 0) * 100)}%
                </span>
                <span className="text-xs rounded-full px-3 py-1 bg-sky-500/10 text-sky-600 dark:text-sky-300">
                  日均工作 {coachData?.adaptive?.avg_daily_focus_minutes || 0} min
                </span>
                {lastPreparedWorkbench ? (
                  <span className="text-xs rounded-full px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-300">
                    本次生成 {lastPreparedWorkbench.dailyPlan.createdCount}
                  </span>
                ) : null}
              </div>

              <p className="text-xs text-gray-500 mb-4">
                策略重点：{coachData?.adaptive?.focus || '按优先级完成关键任务'}
              </p>

              {lastPreparedWorkbench?.projectDigest.projects.length ? (
                <div className="space-y-2">
                  {lastPreparedWorkbench.projectDigest.projects.slice(0, 3).map((project, index) => (
                    <div key={project.projectId || `${project.name}-${index}`} className="rounded-lg border border-white/10 bg-black/5 dark:bg-white/5 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold dark:text-white text-gray-900 truncate">
                            {index + 1}. {project.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            状态 {project.status || '未标注'} · 下一步 {project.nextAction || '待补充'}
                          </div>
                        </div>
                        <div className="shrink-0 text-[11px] rounded-full px-2.5 py-1 bg-white/60 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                          未完成 {project.pendingSteps.length}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(coachData?.suggestions || []).slice(0, 3).map((suggestion, index) => (
                    <div key={suggestion.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/5 dark:bg-white/5 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold dark:text-white text-gray-900 truncate">
                          {index + 1}. {suggestion.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {suggestion.reason} · 约 {suggestion.estimated_minutes} 分钟
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(suggestion.target)}
                        className="text-xs px-2.5 py-1.5 rounded-md bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 transition-colors"
                      >
                        去执行
                      </button>
                    </div>
                  ))}
                </div>
              )}
              </>
            )}
          </div>
        </GlassCard>

      </main>
    </div>
  );
}

export default Dashboard;
