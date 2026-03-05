import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { apiClient } from "../utils/api"; // ✅ 修复：导入 apiClient 以自动添加 token
import QuizCard from "../components/QuizCard";
import CompositeQuizCard from "../components/CompositeQuizCard"; // ✅ 新增：复合题组件
import QuizSetup from "../components/QuizSetup"; // ✅ 引入设置页面
import AIAssistant from "../components/AIAssistant"; // ✅ 引入 AI 助手
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { QuizQuestion, QuizOption, QuizFeedback } from "../types";

interface QuizSettings {
  subjects: string[];
  questionCount: number;
  difficulty: string;
  questionType: string;
  smartRecommend?: boolean;
}

interface AnswerRecord {
  questionId: string | number;
  answer: any;
  isCorrect: boolean | null;
  duration: number;
}

interface StepAnswers {
  [key: string]: { isCorrect: boolean };
}

// --- 图标库 ---
const Icons = {
  ArrowLeft: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>,
  ArrowRight: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>,
  Spinner: () => <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>,
  Robot: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M16.5 7.5h-9v9h9v-9z" /><path fillRule="evenodd" d="M8.25 2.25A.75.75 0 019 3v1.5h6V3a.75.75 0 011.5 0v1.5h.75c.966 0 1.75.784 1.75 1.75v11.25c0 .966-.784 1.75-1.75 1.75h-13.5c-.966 0-1.75-.784-1.75-1.75V6.25c0-.966.784-1.75 1.75-1.75h.75V3a.75.75 0 01.75-.75zM6 6.25v11.25a.25.25 0 00.25.25h11.5a.25.25 0 00.25-.25V6.25a.25.25 0 00-.25-.25H6.25a.25.25 0 00-.25.25z" clipRule="evenodd" /></svg>,
  Clock: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" /></svg>,
};

const QuizPage = () => {
  const navigate = useNavigate();

  // --- 状态管理 ---
  const [showSetup, setShowSetup] = useState<boolean>(true); // ✅ 新增：控制是否显示设置页面
  const [quizSettings, setQuizSettings] = useState<QuizSettings | null>(null); // ✅ 新增：保存设置参数
  const [queue, setQueue] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [qIndex, setQIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; selectedKey: string } | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // ✅ 新增：AI 侧边栏状态
  const [aiOpen, setAiOpen] = useState(false);
  const [showContinue, setShowContinue] = useState(false); // ✅ 新增：控制继续按钮

  // ✅ 新增：完成界面状态
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionStats, setCompletionStats] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    totalTime: 0,
    accuracy: 0
  });

  // ✅ 新增：追踪答题结果
  const sessionStartTimeRef = useRef(Date.now());
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [questionsAnswered, setQuestionsAnswered] = useState(0); // ✅ 新增：追踪已完成的题目数
  const completingRef = useRef(false); // ✅ 新增：防止重复触发completion

  // ✅ 新增：收藏功能
  const [favoritedQuestions, setFavoritedQuestions] = useState<Set<string | number>>(new Set()); // 存储已收藏题目的ID

  // 切换收藏状态
  const handleToggleFavorite = async () => {
    const currentQ = queue[qIndex];
    if (!currentQ) return;

    const questionId = currentQ.id;

    try {
      const res = await apiClient.post("/favorites/toggle", {
        user_id: "u_alex",
        question_id: questionId
      });

      const newFavorited = new Set(favoritedQuestions);

      if (res.data.favorited) {
        newFavorited.add(questionId);
        console.log('❤️ 已收藏题目:', questionId);
      } else {
        newFavorited.delete(questionId);
        console.log('💔 取消收藏:', questionId);
      }

      setFavoritedQuestions(newFavorited);
    } catch (e) {
      console.error('❌ 收藏操作失败:', e);
    }
  };

  // ✅ 移除自动加载，改为在点击"开始刷题"后手动调用
  // useEffect(() => {
  //   fetchRecommendations();
  // }, []);

  // ✅ 新增：处理从设置页面开始刷题
  const handleStartQuiz = (settings: QuizSettings) => {
    setQuizSettings(settings);
    setShowSetup(false);
    setQuestionsAnswered(0); // ✅ 重置已完成题目数
    setAnswers([]); // ✅ 重置答案记录
    completingRef.current = false; // ✅ 重置完成标志
    fetchRecommendations(settings);
  };

  // ✅ 调试：追踪状态变化
  useEffect(() => {
    console.log('🔄 状态更新', {
      showSetup,
      qIndex,
      queueLength: queue.length,
      showCompletion,
      currentQ: queue[qIndex]
    });
  }, [showSetup, qIndex, queue, showCompletion]);

  // ✅ 快捷键支持
  useKeyboardShortcuts({
    // Space - 下一题/继续
    ' ': () => {
      if (showSetup || showCompletion) return;

      if (feedback && !showContinue) {
        // 有反馈且没有继续按钮时，自动下一题
        nextQuestion();
      } else if (showContinue) {
        // 有继续按钮时，触发继续
        nextQuestion();
      }
    },

    // 1/2/3/4 - 选择选项 A/B/C/D
    '1': () => {
      if (showSetup || showCompletion || feedback || isSubmitting) return;
      handleOptionSelect('A');
    },
    '2': () => {
      if (showSetup || showCompletion || feedback || isSubmitting) return;
      handleOptionSelect('B');
    },
    '3': () => {
      if (showSetup || showCompletion || feedback || isSubmitting) return;
      handleOptionSelect('C');
    },
    '4': () => {
      if (showSetup || showCompletion || feedback || isSubmitting) return;
      handleOptionSelect('D');
    },

    // Enter - 提交/继续
    'enter': () => {
      if (showSetup || showCompletion) return;

      if (showContinue) {
        // 有继续按钮时，触发继续
        nextQuestion();
      } else if (feedback && !showContinue) {
        // 有反馈但无继续按钮（做对了），下一题
        nextQuestion();
      }
    },

    // Ctrl+F - 收藏/取消收藏
    'ctrl+f': () => {
      if (showSetup || showCompletion || !queue[qIndex]) return;
      handleToggleFavorite();
    },

    // Ctrl+R - 刷新题目（跳过当前题）
    'ctrl+r': () => {
      if (showSetup || showCompletion || !queue[qIndex]) return;
      nextQuestion();
    },
  });


  const fetchRecommendations = async (settings: QuizSettings | null = null) => {
    try {
      setLoading(true);
      console.log('🔄 开始获取题目...', settings);

      // ✅ 构建查询参数
      const params: any = {};
      if (settings) {
        // 学科参数：转换为逗号分隔字符串
        if (settings.subjects && settings.subjects.length > 0) {
          if (settings.subjects.includes('all')) {
            // all 表示不筛选
            params.subjects = 'all';
          } else {
            params.subjects = settings.subjects.join(',');
          }
        }

        // 题目数量
        params.question_count = settings.questionCount || 10;

        // 难度
        params.difficulty = settings.difficulty || 'all';

        // 题型
        params.question_type = settings.questionType || 'all';

        // 智能推荐开关
        params.smart_recommend = settings.smartRecommend !== false; // 默认true
      }

      console.log('📡 发送请求参数:', params);
      const res = await apiClient.get("/quiz/recommend", { params });
      console.log('✅ 获取到题目:', res.data.length, '道');

      // 检查是否有符合条件的题目
      if (res.data.length === 0) {
        setLoading(false);
        // 显示提示：没有符合条件的错题
        alert(`没有符合条件的错题\n\n当前筛选条件下，错题本中没有未掌握的题目。\n\n建议：\n- 尝试选择其他学科\n- 或降低难度筛选`);
        // 返回设置界面
        setShowSetup(true);
        return;
      }

      // 直接使用新数据结构，不再需要处理steps
      setQueue(res.data);
      setLoading(false);
      setStartTime(Date.now());
      sessionStartTimeRef.current = Date.now();
      console.log('✅ Queue 状态已更新');
    } catch (e) {
      console.error('❌ 获取题目失败:', e);
      setLoading(false);
    }
  };

  // ✅ 新增：处理复合题完成
  const handleCompositeStepComplete = (stepAnswers: StepAnswers) => {
    const currentQ = queue[qIndex];
    const totalSteps = currentQ.steps?.length || 0;

    // 计算正确率
    const correctCount = Object.values(stepAnswers).filter((a: any) => a.isCorrect).length;
    const accuracy = (correctCount / totalSteps) * 100;

    // 记录答案
    setAnswers(prev => [...prev, {
      questionId: currentQ.id,
      answer: stepAnswers,
      isCorrect: accuracy > 50, // 正确率超过50%算合格
      duration: Date.now() - startTime
    }]);

    setQuestionsAnswered(prev => prev + 1);

    // 显示完成界面或继续下一题
    if (qIndex < queue.length - 1) {
      setTimeout(() => {
        nextQuestion();
      }, 2000);
    } else {
      showCompletionScreen();
    }
  };

  const handleOptionSelect = async (key: string | string[]) => {
    if (isSubmitting || feedback) return;
    setIsSubmitting(true);

    const currentQ = queue[qIndex];
    if (!currentQ) return;

    const duration = Date.now() - startTime;

    // 根据题型判断答案
    let isCorrect = false;
    const keyStr = typeof key === 'string' ? key : key.join(',');

    if (currentQ.type === 'single_choice') {
        // 单选题
        const correctOption = currentQ.options?.find(o => o.is_correct);
        isCorrect = correctOption !== undefined && keyStr === correctOption.key;
    } else if (currentQ.type === 'multiple_choice') {
        // 多选题
        const selectedKeys = keyStr.split(',');
        const correctOptions = currentQ.options?.filter(o => o.is_correct) || [];
        const correctKeys = correctOptions.map(o => o.key);
        isCorrect = new Set(selectedKeys).size === new Set(correctKeys).size &&
                     selectedKeys.every(k => correctKeys.includes(k));
    } else {
        // 填空题/证明题/问答题：后端判断
        isCorrect = null as any; // 待评分
    }

    // 记录答案（先记录，后续更新）
    setAnswers(prev => [...prev, {
      questionId: currentQ.id,
      answer: keyStr,
      isCorrect,
      duration
    }]);

    // 选择题：立即显示反馈
    // 填空题等：等待后端返回后再显示
    if (isCorrect !== null) {
      setFeedback({ correct: isCorrect, selectedKey: keyStr });
    }

    try {
        const response = await apiClient.post("/quiz/submit", {
            user_id: "u_alex",
            question_id: currentQ.id,
            selected_key: key,
            duration_ms: duration,
            is_hesitant: duration > 5000
        });

        // 🔍 调试：打印后端响应
        console.log('📡 后端响应:', response.data);
        console.log('📡 is_correct 值:', response.data.is_correct, '类型:', typeof response.data.is_correct);

        // ✅ 修复：使用后端返回的判断结果
        const backendResult = response.data.is_correct;

        // 更新答案记录中的 isCorrect
        setAnswers(prev => prev.map((a, i) =>
          i === prev.length - 1 ? { ...a, isCorrect: backendResult } : a
        ));

        // 设置 feedback（填空题等在这里才真正设置）
        setFeedback({ correct: backendResult, selectedKey: keyStr });

        // 核心逻辑分支（使用后端结果）
        if (backendResult === true) {
            // A. 做对了：1秒后自动下一题
            setTimeout(() => {
                nextQuestion();
            }, 1000);
        } else if (backendResult === false) {
            // B. 做错了：显示继续按钮
            setIsSubmitting(false);
            setShowContinue(true);
        } else {
            // C. 待评分（证明题/问答题）：显示继续按钮
            setIsSubmitting(false);
            setShowContinue(true);
        }
    } catch (e) {
        console.error(e);
        // 如果后端失败，使用前端判断
        if (isCorrect !== null) {
            setFeedback({ correct: isCorrect, selectedKey: keyStr });

            if (isCorrect === true) {
                setTimeout(() => {
                    nextQuestion();
                }, 1000);
            } else {
                setIsSubmitting(false);
                setShowContinue(true);
            }
        } else {
            // 后端失败且前端无法判断，显示继续按钮
            setIsSubmitting(false);
            setShowContinue(true);
        }
    }
  };

  // 切换到下一题
  const nextQuestion = () => {
      console.log('➡️ nextQuestion 被调用', { qIndex, queueLength: queue.length, showCompletion });

      if (showCompletion || completingRef.current) {
          console.log('⚠️ 已经在完成界面或正在完成，忽略 nextQuestion 调用');
          return;
      }

      setIsSubmitting(false);
      setFeedback(null);
      setShowContinue(false);
      setStartTime(Date.now());

      if (!queue || queue.length === 0) {
          console.error('❌ queue 不存在', { queue });
          return;
      }

      // 判断是否继续下一题
      const newQuestionsAnswered = questionsAnswered + 1;
      const targetCount = quizSettings?.questionCount || 10;
      const shouldContinue = targetCount === -1 || newQuestionsAnswered < targetCount;
      const hasNextQuestion = qIndex + 1 < queue.length;

      console.log('📊 题目完成统计:', {
        questionsAnswered,
        newQuestionsAnswered,
        targetCount,
        shouldContinue,
        hasNextQuestion,
        queueLength: queue.length
      });

      if (shouldContinue && hasNextQuestion) {
        console.log('→ 继续下一题');
        setQuestionsAnswered(newQuestionsAnswered);
        setQIndex(prev => prev + 1);
      } else {
            // ✅ 所有题目完成，显示完成界面
            console.log('→ 显示完成界面');
            completingRef.current = true; // ✅ 设置完成标志，防止重复触发

            const totalTime = Date.now() - sessionStartTimeRef.current;
            const correctAnswers = answers.filter(a => a.isCorrect).length;
            const totalQuestions = newQuestionsAnswered;
            const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

            console.log('📊 最终统计数据:', { totalTime, correctAnswers, totalQuestions, accuracy });

            setCompletionStats({
              totalQuestions,
              correctAnswers,
              totalTime,
              accuracy
            });

                  setShowCompletion(true);
          }
  };

  const showCompletionScreen = () => {
    setShowCompletion(true);
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-transparent backdrop-blur-sm">
        <div className="bg-white/10 dark:bg-black/40 p-8 rounded-3xl backdrop-blur-xl border border-white/20 flex flex-col items-center shadow-2xl">
            <Icons.Spinner />
            <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300 animate-pulse">AI Generating...</p>
        </div>
    </div>
  );

  // ✅ 修复：将 queue.length 检查移到 showSetup 检查之后
  // 只有当不在设置页面时，才检查 queue 是否为空
  // if (queue.length === 0) return <div className="p-20 text-center font-bold text-xl text-gray-500">No questions available.</div>;

  // ✅ 新增：显示完成界面（放在 currentQ 计算之前）
  if (showCompletion) {
    console.log('🎯 显示完成界面', { showCompletion, completionStats, qIndex, queueLength: queue.length });
    const formatTime = (ms) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return minutes > 0 ? `${minutes}分${remainingSeconds}秒` : `${remainingSeconds}秒`;
    };

    const getAccuracyColor = (accuracy) => {
      if (accuracy >= 80) return 'text-green-500';
      if (accuracy >= 60) return 'text-yellow-500';
      return 'text-red-500';
    };

    const getAccuracyMessage = (accuracy) => {
      if (accuracy >= 90) return '太棒了！表现完美！🎉';
      if (accuracy >= 80) return '很优秀！继续保持！💪';
      if (accuracy >= 70) return '做得不错，继续加油！👍';
      if (accuracy >= 60) return '还需努力，你可以做得更好！📚';
      return '别灰心，多练习就能进步！💡';
    };

    return (
      <div className="fixed inset-0 bg-transparent text-slate-800 dark:text-slate-100 font-sans overflow-hidden flex flex-col">
        {/* 顶部工具栏 */}
        <div className="h-20 absolute top-0 left-0 w-full flex items-center justify-between px-8 z-50 pointer-events-none pt-4">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-lg hover:scale-105 transition-all group">
              <Icons.ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
              <span className="font-bold text-sm text-slate-600 dark:text-slate-300">Exit</span>
            </button>
          </div>
        </div>

        {/* 主体内容区 */}
        <div className="flex-1 flex pt-24 pb-8 px-4 md:px-8 overflow-hidden items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="w-full max-w-3xl"
          >
            {/* 完成卡片 */}
            <div className="w-full h-full bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative p-8 md:p-12">
              {/* 标题 */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <span className="text-4xl">🎯</span>
                </motion.div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  练习完成！
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {getAccuracyMessage(completionStats.accuracy)}
                </p>
              </div>

              {/* 统计数据 */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {completionStats.totalQuestions}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    完成题目
                  </div>
                </div>

                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {completionStats.correctAnswers}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    答对题数
                  </div>
                </div>

                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
                  <div className={`text-3xl font-bold ${getAccuracyColor(completionStats.accuracy)}`}>
                    {completionStats.accuracy}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    正确率
                  </div>
                </div>
              </div>

              {/* 详细统计 */}
              <div className="space-y-3 mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">总用时</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatTime(completionStats.totalTime)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">平均每题</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {completionStats.totalQuestions > 0
                      ? formatTime(completionStats.totalTime / completionStats.totalQuestions)
                      : '0秒'}
                  </span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 mt-auto">
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  返回主页
                </button>
                <button
                  onClick={() => {
                    // ✅ 返回设置页面而不是直接重新开始
                    setShowSetup(true);
                    setShowCompletion(false);
                    setAnswers([]);
                    setQuestionsAnswered(0); // ✅ 重置已完成题目数
                    completingRef.current = false; // ✅ 重置完成标志
                    setQIndex(0);
                    setCompletionStats({
                      totalQuestions: 0,
                      correctAnswers: 0,
                      totalTime: 0,
                      accuracy: 0
                    });
                    setQueue([]); // 清空题目队列
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/30 hover:scale-105"
                >
                  再刷一组
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentQ = queue[qIndex];

  // ✅ 计算当前题目是否已收藏
  const isFavorited = currentQ && favoritedQuestions.has(currentQ.id);

  // ✅ 额外检查：如果当前题目不存在（例如正在加载新题目），显示加载界面
  if (!showCompletion && !showSetup && !completingRef.current && !currentQ) {
    console.log('⚠️ currentQ 不存在，显示加载界面', {
      qIndex,
      queueLength: queue.length,
      currentQ,
      completingRef: completingRef.current
    });

    // ✅ 如果索引越界，重置到第一题
    if (qIndex >= queue.length && queue.length > 0) {
      console.log('🔧 索引越界，重置到第一题');
      setQIndex(0);
    }

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-transparent backdrop-blur-sm">
        <div className="bg-white/10 dark:bg-black/40 p-8 rounded-3xl backdrop-blur-xl border border-white/20 flex flex-col items-center shadow-2xl">
          <Icons.Spinner />
          <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300 animate-pulse">Loading next question...</p>
        </div>
      </div>
    );
  }

  // 计算进度（基于题目数量，不再基于步骤）
  const progress = queue.length > 0 ? (qIndex / queue.length) * 100 : 0;

  return (
    // ✅ 核心修复 1: bg-transparent 让全局壁纸透出来
    <div className="fixed inset-0 bg-transparent text-slate-800 dark:text-slate-100 font-sans overflow-hidden flex flex-col">
      {/* ✅ 新增：设置页面 */}
      {showSetup && (
        <QuizSetup onStart={handleStartQuiz} />
      )}

      {/* ✅ 原有的刷题界面（只有当 showSetup=false 时才显示） */}
      {!showSetup && (
        <>
        {/* ✅ 检查队列是否为空 */}
        {queue.length === 0 ? (
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-500 mb-4">No questions available.</p>
              <button
                onClick={() => setShowSetup(true)}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
              >
                返回设置
              </button>
            </div>
          </div>
        ) : (
          <>
      {/* 顶部工具栏 (悬浮) */}
      <div className="h-20 absolute top-0 left-0 w-full flex items-center justify-between px-8 z-50 pointer-events-none pt-4">
        {/* 左侧：返回主页 & 进度 & 收藏 */}
        <div className="flex items-center gap-4 pointer-events-auto">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-lg hover:scale-105 transition-all group">
                <Icons.ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
                <span className="font-bold text-sm text-slate-600 dark:text-slate-300">返回主页</span>
            </button>

            {/* 真实进度条 */}
            <div className="hidden md:flex items-center gap-3 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-500 uppercase tracking-wider">
                    <Icons.Clock className="w-4 h-4" />
                    {/* ✅ 显示真实进度：当前题/总题数 */}
                    <span>{qIndex + 1}</span>
                    <span className="text-gray-400">/</span>
                    <span>{queue.length}</span>
                    <span className="text-gray-400 ml-1">题</span>
                </div>
                <div className="w-px h-4 bg-gray-300 dark:bg-white/10"></div>
                <div className="w-32 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* ✅ 收藏按钮 */}
            <button
                onClick={handleToggleFavorite}
                className={`flex items-center gap-2 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/20 shadow-lg hover:scale-105 transition-all group
                    ${isFavorited ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-500/20' : ''}`}
            >
                <span className={`${isFavorited ? 'text-pink-500' : 'text-slate-400 dark:text-slate-500 group-hover:text-pink-500'} transition-colors text-lg`}>
                    {isFavorited ? '❤️' : '🤍'}
                </span>
                <span className={`font-bold text-sm ${isFavorited ? 'text-pink-600 dark:text-pink-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {isFavorited ? '已收藏' : '收藏'}
                </span>
            </button>
        </div>

        {/* 右侧：AI 开关 */}
        <button
            onClick={() => setAiOpen(!aiOpen)}
            className={`pointer-events-auto px-5 py-2.5 rounded-full border border-white/20 transition-all duration-300 backdrop-blur-md shadow-lg flex items-center gap-2 font-bold group
            ${aiOpen ? 'bg-blue-500 text-white border-blue-500 ring-4 ring-blue-500/20' : 'bg-white/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'}`}
        >
            <Icons.Robot className={`w-5 h-5 transition-transform ${aiOpen ? 'rotate-12' : ''}`} />
            <span>AI Coach</span>
        </button>
      </div>

      {/* --- 主体内容区 (Flex 布局) --- */}
      {/* ✅ 修改 1：移除了 gap-6 (由 AI 组件的 ml-6 控制)，确保关闭时严丝合缝 */}
      <div className="flex-1 flex pt-24 pb-8 px-4 md:px-8 overflow-hidden items-start justify-center">
        
        {/* 做题卡片容器 */}
        {/* ✅ 修改 2：改回普通 div (移除 motion.div) */}
        {/* ✅ 修改 3：使用 flex-1 min-w-0 让它被动响应 AI 栏的挤压 */}
        {/* ✅ 修改 4：添加与 AI 栏完全一致的 transition，确保挤压过程同步丝滑 */}
        <div 
            className={`
                h-full flex flex-col items-center justify-center relative 
                flex-1 min-w-0 
                transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] 
            `}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQ.id}
                    initial={{ y: 100, opacity: 1, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -50, opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                    className="w-full h-full max-w-4xl"
                    style={{ willChange: "transform" }}
                >
                    {/* --- 玻璃卡片本体 --- */}
                    <div className="w-full h-full bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative">

                        {/* 装饰光效 */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-2 bg-blue-500/30 blur-xl rounded-full pointer-events-none"></div>

                        {/* 卡片内容 */}
                        {currentQ.is_composite ? (
                          <CompositeQuizCard
                            questionData={{
                              id: String(currentQ.id),
                              stem: currentQ.stem,
                              difficulty: currentQ.difficulty ?? 1,
                              steps: currentQ.steps?.map(step => ({
                                stem: step.stem,
                                interaction_type: step.interaction_type,
                                options: step.options?.map(opt => ({
                                  key: opt.key,
                                  content: opt.content,
                                  is_correct: opt.is_correct ?? false
                                })) ?? [],
                                analysis: step.analysis ?? ''
                              })) ?? []
                            } as any}
                            onStepComplete={handleCompositeStepComplete}
                          />
                        ) : (
                          <QuizCard
                            questionData={currentQ}
                            onSelect={handleOptionSelect}
                            isSubmitting={isSubmitting}
                            feedback={feedback}
                          />
                        )}

                        {/* Continue 按钮 (右下角) */}
                        <AnimatePresence>
                            {showContinue && (
                                <motion.div
                                    initial={{ x: 50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 50, opacity: 0 }}
                                    className="absolute bottom-8 right-8 z-[100]"
                                >
                                    <button
                                        onClick={nextQuestion}
                                        className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-blue-600 text-slate-900 dark:text-white rounded-2xl font-bold text-base shadow-2xl hover:scale-105 active:scale-95 transition-transform border border-gray-200 dark:border-blue-500"
                                    >
                                        <span>Continue</span>
                                        <Icons.ArrowRight className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>

        {/* --- AI 侧边栏 (直接放在 Flex 容器里，靠自身的 margin 撑开间距) --- */}
        <AIAssistant isOpen={aiOpen} />

      </div>
          </>
        )}
      </>
    )}
    </div>
  );
};

export default QuizPage;