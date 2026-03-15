import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../utils/api"; // ✅ 修复：导入 apiClient 以自动添加 token
import GlassCard from "../components/GlassCard";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";  // ✅ 导入 AuthContext
import { useToast } from "../context/ToastContext";
import TodayTodos from "../components/TodayTodos";

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

interface StudyStats {
  duration_minutes: number;
  questions_completed: number;
  notes_created: number;
  mistakes_reviewed: number;
  anki_reviews: number;
}

interface LastActivity {
  type: 'quiz' | 'note' | 'mistake' | 'anki' | 'workbench';
  description?: string;
}

interface CoachSuggestion {
  id: string;
  title: string;
  reason: string;
  target: string;
  estimated_minutes: number;
  subject: string;
  todo_text: string;
}

interface CoachSnapshot {
  weak_mistakes_count: number;
  due_cards_count: number;
  pending_todos: number;
  today_study_minutes: number;
  recent_7d_completion_rate: number;
  recent_7d_avg_study_minutes: number;
}

interface CoachAdaptive {
  level: 'build' | 'balanced' | 'challenge';
  label: string;
  focus: string;
  completion_rate: number;
  avg_daily_study_minutes: number;
  recommended_plan_items: number;
}

interface CoachData {
  snapshot: CoachSnapshot;
  adaptive: CoachAdaptive;
  suggestions: CoachSuggestion[];
  coach_message: string;
}

const normalizeCoachData = (raw: any): CoachData => {
  const adaptiveLevelRaw = raw?.adaptive?.level;
  const adaptiveLevel: CoachAdaptive['level'] =
    adaptiveLevelRaw === 'build' || adaptiveLevelRaw === 'balanced' || adaptiveLevelRaw === 'challenge'
      ? adaptiveLevelRaw
      : 'balanced';

  return ({
  snapshot: {
    weak_mistakes_count: raw?.snapshot?.weak_mistakes_count || 0,
    due_cards_count: raw?.snapshot?.due_cards_count || 0,
    pending_todos: raw?.snapshot?.pending_todos || 0,
    today_study_minutes: raw?.snapshot?.today_study_minutes || 0,
    recent_7d_completion_rate: raw?.snapshot?.recent_7d_completion_rate || 0,
    recent_7d_avg_study_minutes: raw?.snapshot?.recent_7d_avg_study_minutes || 0,
  },
  adaptive: {
    level: adaptiveLevel,
    label: raw?.adaptive?.label || '稳步推进',
    focus: raw?.adaptive?.focus || '按优先级完成关键任务',
    completion_rate: raw?.adaptive?.completion_rate || 0,
    avg_daily_study_minutes: raw?.adaptive?.avg_daily_study_minutes || 0,
    recommended_plan_items: raw?.adaptive?.recommended_plan_items || 3,
  },
  suggestions: raw?.suggestions || [],
  coach_message: raw?.coach_message || '',
  });
};

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
  const [stats, setStats] = useState({
    username: "Alex",
    daily_progress: 0,
    mistakes_count: 0,
    notes_count: 0
  });
  const [studyStats, setStudyStats] = useState<StudyStats>({
    duration_minutes: 0,
    questions_completed: 0,
    notes_created: 0,
    mistakes_reviewed: 0,
    anki_reviews: 0
  });
  const [lastActivity, setLastActivity] = useState<LastActivity | null>(null);
  const [coachData, setCoachData] = useState<CoachData | null>(null);
  const [coachLoading, setCoachLoading] = useState<boolean>(true);
  const [coachGenerating, setCoachGenerating] = useState<boolean>(false);
  const [todoWidgetKey, setTodoWidgetKey] = useState<number>(0);
  const [todayJournalCount, setTodayJournalCount] = useState<number>(0);
  const coachFeatureEnabled = false;

  const fallbackCoachData = useCallback((): CoachData => ({
    snapshot: {
      weak_mistakes_count: 0,
      due_cards_count: 0,
      pending_todos: 0,
      today_study_minutes: 0,
      recent_7d_completion_rate: 0,
      recent_7d_avg_study_minutes: 0,
    },
    adaptive: {
      level: 'balanced',
      label: '稳步推进',
      focus: '先完成关键任务，再做补充练习',
      completion_rate: 0,
      avg_daily_study_minutes: 0,
      recommended_plan_items: 3,
    },
    suggestions: [
      {
        id: 'steady-workbench',
        title: '整理今日待办',
        reason: '先收拢今天最重要的事情',
        target: '/workbench',
        estimated_minutes: 20,
        subject: 'general',
        todo_text: '整理今日待办'
      }
    ],
    coach_message: '先完成高优先级事项，再推进项目和笔记。'
  }), []);

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

  // 获取数据
  useEffect(() => {
    if (!token) {
      return;
    }

    const loadCoach = async () => {
      if (!coachFeatureEnabled) {
        setCoachData(fallbackCoachData());
        setCoachLoading(false);
        return;
      }
      try {
        setCoachLoading(true);
        const response = await apiClient.get('/ai/coach/today');
        if (response.data?.success) {
          setCoachData(normalizeCoachData(response.data));
        }
      } catch (error) {
        setCoachData(fallbackCoachData());
      } finally {
        setCoachLoading(false);
      }
    };

    const fetchData = async () => {
      try {
        // 获取基础统计
        const statsRes = await apiClient.get("/dashboard");
        if(statsRes.data) setStats(statsRes.data);

        // 获取学习统计
        const studyStatsRes = await apiClient.get("/dashboard/stats");
        if(studyStatsRes.data) setStudyStats(studyStatsRes.data);

        // 获取断点续学信息
        const progressRes = await apiClient.get("/dashboard/progress");
        if(progressRes.data) setLastActivity(progressRes.data.last_activity);

        const journalRes = await apiClient.get("/workbench/journal", {
          params: {
            entry_date: getTodayDateKey(),
            limit: 200,
          }
        });
        setTodayJournalCount(Array.isArray(journalRes.data) ? journalRes.data.length : 0);

      } catch (error) {
        console.log("后端未连接或未认证，使用模拟数据");

        // 模拟数据
        setStudyStats({
          duration_minutes: 0,
          questions_completed: 0,
          notes_created: 0,
          mistakes_reviewed: 0,
          anki_reviews: 0
        });
        setTodayJournalCount(0);

      }
    };

    fetchData();
    loadCoach();
  }, [token, fallbackCoachData]);  // ✅ 依赖 token

  const handleGenerateTodayPlan = async () => {
    if (!coachFeatureEnabled) {
      toast.info('当前为本地模式，已使用默认学习建议');
      setCoachData(fallbackCoachData());
      return;
    }
    try {
      setCoachGenerating(true);
      const response = await apiClient.post('/ai/coach/today/plan', {
        max_items: coachData?.adaptive?.recommended_plan_items || 3
      });
      const createdCount = response.data?.created_count || 0;
      const skippedCount = response.data?.skipped_count || 0;

      if (createdCount > 0) {
        toast.success(`✅ 已生成 ${createdCount} 条今日任务`);
      } else {
        toast.info('ℹ️ 今日任务已存在，无需重复生成');
      }

      if (skippedCount > 0) {
        console.log(`Skipped ${skippedCount} duplicated tasks`);
      }

      const coachResponse = await apiClient.get('/ai/coach/today');
      if (coachResponse.data?.success) {
        setCoachData(normalizeCoachData(coachResponse.data));
      }

      setTodoWidgetKey(prev => prev + 1);
    } catch (error: any) {
      toast.error(`❌ 生成计划失败: ${error?.response?.data?.detail || error?.message || '未知错误'}`);
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

  // 格式化时长
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
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

  // 断点续学处理
  const handleResumeLearning = () => {
    if (lastActivity) {
      switch(lastActivity.type) {
        case 'note':
          navigate('/notes');
          break;
        case 'workbench':
          navigate('/workbench');
          break;
        default:
          navigate('/workbench');
      }
    } else {
      navigate('/workbench');
    }
  };

  return (
    <div className="h-screen font-sans relative overflow-hidden">
      <main
        className="max-w-7xl h-full mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-4 grid-rows-auto gap-5 overflow-hidden"
        style={{ paddingTop: '8vh' }}
      >

        {/* ========== 第一行：欢迎卡片 + 刷题四件套 ========== */}

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
                value={studyStats.notes_created || 0}
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
                label="完成项目"
                value={stats.notes_count || 0}
                icon={Icons.CheckCircle}
                bgColor="bg-green-500/20"
                textColor="text-green-500"
              />
              <StatItem
                label="待办"
                value={coachData?.snapshot.pending_todos || 0}
                icon={Icons.Clock}
                bgColor="bg-red-500/20"
                textColor="text-red-500"
              />
              <StatItem
                label="工作时间"
                value={coachData?.snapshot.today_study_minutes || 0}
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
                4
              </span>
              <span className="text-xs text-gray-500">本月</span>
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
                {stats.mistakes_count || 0}
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
          <TodayTodos key={todoWidgetKey} />
        </GlassCard>

        <GlassCard className="col-span-1 md:col-span-2 md:row-span-2 p-5 h-[300px] md:h-[320px] overflow-hidden" delay={0.58}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold dark:text-white text-gray-900">一键生成今日计划</h3>
              <p className="text-xs text-gray-500 mt-1">基于项目进度和待办自动生成行动建议</p>
            </div>
            <button
              type="button"
              onClick={handleGenerateTodayPlan}
              disabled={coachGenerating || coachLoading}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-60"
            >
              {coachGenerating ? '生成中...' : '生成计划'}
            </button>
          </div>

          <div className="h-[calc(100%-64px)] overflow-y-auto pr-1">
            {coachLoading ? (
              <div className="text-sm text-gray-500">AI 分析中...</div>
            ) : (
              <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="text-xs rounded-lg px-3 py-2 bg-green-500/10 text-green-600 dark:text-green-300">
                  活跃项目 {stats.notes_count || 0}
                </div>
                <div className="text-xs rounded-lg px-3 py-2 bg-purple-500/10 text-purple-600 dark:text-purple-300">
                  今日日志 {todayJournalCount}
                </div>
                <div className="text-xs rounded-lg px-3 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  待办 {coachData?.snapshot.pending_todos || 0}
                </div>
                <div className="text-xs rounded-lg px-3 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-300">
                  工作时间 {coachData?.snapshot.today_study_minutes || 0} min
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">
                {coachData?.coach_message || '先完成高优先级任务，再做项目推进。'}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs rounded-full px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                  节奏：{coachData?.adaptive?.label || '稳步推进'}
                </span>
                <span className="text-xs rounded-full px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  7天完成率 {Math.round((coachData?.adaptive?.completion_rate || 0) * 100)}%
                </span>
                <span className="text-xs rounded-full px-3 py-1 bg-sky-500/10 text-sky-600 dark:text-sky-300">
                  日均工作 {coachData?.adaptive?.avg_daily_study_minutes || 0} min
                </span>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                策略重点：{coachData?.adaptive?.focus || '按优先级完成关键任务'}
              </p>

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
              </>
            )}
          </div>
        </GlassCard>

      </main>
    </div>
  );
}

export default Dashboard;
