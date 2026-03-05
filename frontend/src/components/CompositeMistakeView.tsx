import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import axios from "axios";
import MultiBlankInput from "./MultiBlankInput";

interface StepFeedback {
  show: boolean;
  isCorrect: boolean;
  correctAnswer: string;
}

interface PracticeAnswers {
  [key: number]: {
    selectedKey: string;
    isCorrect: boolean;
  };
}

interface CompositeMistakeViewProps {
  question: any;
  stepAnswers?: any[];
  mode?: 'review' | 'practice_wrong' | 'practice_all';
  onStepAnswer?: (stepIndex: number, selectedKey: string, isCorrect: boolean) => void;
  onStepComplete?: (answers: PracticeAnswers) => void;
  mistake_id?: string | null;
  userId?: string;
}

const CompositeMistakeView = ({
  question,
  stepAnswers,
  mode = 'review',
  onStepAnswer,
  onStepComplete,
  mistake_id,
  userId = 'u_alex'
}: CompositeMistakeViewProps) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  // 练习模式状态
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<PracticeAnswers>({});
  const [feedback, setFeedback] = useState<StepFeedback | null>(null);

  if (!question || !question.is_composite || !question.steps) {
    return null;
  }

  // 根据模式确定要练习的小题
  const stepsToPractice = useMemo(() => {
    if (mode === 'review') return null;
    if (mode === 'practice_all') return question.steps.map((_, i) => i);
    if (mode === 'practice_wrong') {
      return stepAnswers
        ?.filter(a => !a.is_correct)
        .map(a => a.step_index) || [];
    }
    return [];
  }, [mode, stepAnswers, question.steps]);

  // ==================== 查看模式 ====================
  const toggleStep = (stepIndex) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex);
    } else {
      newExpanded.add(stepIndex);
    }
    setExpandedSteps(newExpanded);
  };

  // 获取每个小题的最近答题记录
  const getStepRecord = (stepIndex) => {
    if (!stepAnswers) return null;
    const records = stepAnswers.filter(a => a.step_index === stepIndex);
    return records.length > 0 ? records[records.length - 1] : null;
  };

  // 获取正确答案
  const getCorrectAnswer = (step) => {
    if (step.interaction_type === 'single_choice' || step.interaction_type === 'multiple_choice') {
      const correctOptions = step.options
        .filter(opt => opt.is_correct)
        .map(opt => opt.key)
        .sort();
      return correctOptions.join(', ');
    } else if (step.interaction_type === 'fill_blank') {
      return step.answer;
    }
    return '';
  };

  // 计算整体统计
  const totalSteps = question.steps.length;
  const correctCount = question.steps.filter((_, idx) => {
    const record = getStepRecord(idx);
    return record && record.is_correct;
  }).length;
  const accuracy = totalSteps > 0 ? ((correctCount / totalSteps) * 100).toFixed(0) : 0;

  // ==================== 练习模式 ====================

  // 处理小题答题
  const handleStepAnswer = async (selectedKey) => {
    try {
      const practiceStepIndex = mode === 'practice_all'
        ? currentStepIndex
        : stepsToPractice[currentStepIndex];

      const response = await axios.post("http://localhost:8000/api/mistakes/review", {
        mistake_id: mistake_id,  // 使用传入的 mistake_id prop
        step_index: practiceStepIndex,
        selected_key: selectedKey
      });

      const isCorrect = response.data.is_correct;

      // 记录答案
      setPracticeAnswers({
        ...practiceAnswers,
        [practiceStepIndex]: { selectedKey, isCorrect }
      });

      setFeedback({
        show: true,
        isCorrect,
        correctAnswer: response.data.correct_answer
      });

      // 通知父组件
      if (onStepAnswer) {
        onStepAnswer(practiceStepIndex, selectedKey, isCorrect);
      }

      // 答对自动下一题
      if (isCorrect) {
        setTimeout(() => {
          if (currentStepIndex < stepsToPractice.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
            setFeedback(null);
          } else {
            // 完成
            if (onStepComplete) {
              onStepComplete(practiceAnswers);
            }
          }
        }, 1500);
      }
    } catch (error) {
      console.error("提交答案失败:", error);
    }
  };

  // 当前要练习的小题
  const currentPracticeStep = stepsToPractice
    ? question.steps[stepsToPractice[currentStepIndex]]
    : null;

  // ==================== 渲染 ====================

  // 查看模式
  if (mode === 'review') {
    return (
      <div className="composite-mistake-view space-y-4">
        {/* 大题题干 */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">
              综合题
            </span>
            <span className="text-gray-600 dark:text-gray-300 text-sm">
              难度 {"⭐".repeat(question.difficulty || 3)}
            </span>
          </div>
          <div className="text-gray-800 dark:text-gray-200">
            <ReactMarkdown>
              {question.stem}
            </ReactMarkdown>
          </div>
          {question.media?.image_url && (
            <img
              src={question.media.image_url}
              alt="题目图片"
              className="mt-4 rounded-lg max-w-md"
            />
          )}
        </div>

        {/* 整体统计 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {correctCount}/{totalSteps}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">正确</div>
              </div>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {accuracy}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">正确率</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              小题总数: {totalSteps}
            </div>
          </div>
        </div>

        {/* 小题列表 */}
        <div className="space-y-3">
          {question.steps.map((step, idx) => {
            const record = getStepRecord(idx);
            const isCorrect = record?.is_correct;
            const isExpanded = expandedSteps.has(idx);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden ${
                  isCorrect === false ? 'border-2 border-red-300 dark:border-red-600' : ''
                }`}
              >
                {/* 小题头部 */}
                <div
                  onClick={() => toggleStep(idx)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isCorrect === false ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCorrect === true
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : isCorrect === false
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {isCorrect === true ? '✓' : isCorrect === false ? '✗' : '?'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-white">
                          小题 {idx + 1}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                          {step.stem.substring(0, 60)}...
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {record && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isCorrect
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}>
                          {isCorrect ? '正确' : '错误'}
                        </span>
                      )}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-gray-400"
                      >
                        ▼
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* 小题详情（展开时显示） */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-200 dark:border-gray-700 p-4"
                  >
                    {/* 小题题干 */}
                    <div className="mb-4">
                      <h4 className="font-bold text-gray-800 dark:text-white mb-2">
                        📍 {step.stem}
                      </h4>
                    </div>

                    {/* 选项 */}
                    {(step.interaction_type === 'single_choice' || step.interaction_type === 'multiple_choice') && (
                      <div className="space-y-2 mb-4">
                        {step.options.map((option) => {
                          const isOptionCorrect = option.is_correct;
                          const isUserAnswer = record?.user_answer?.includes(option.key);

                          return (
                            <div
                              key={option.key}
                              className={`p-3 rounded-lg border-2 ${
                                isOptionCorrect
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                                  : isUserAnswer
                                  ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{option.key}.</span>
                                <div className="flex-1 text-sm">
                                  <ReactMarkdown>
                                    {option.content}
                                  </ReactMarkdown>
                                </div>
                                {isOptionCorrect && (
                                  <span className="text-green-600 dark:text-green-400 text-xs font-bold">
                                    ✓ 正确
                                  </span>
                                )}
                                {isUserAnswer && !isOptionCorrect && (
                                  <span className="text-red-600 dark:text-red-400 text-xs font-bold">
                                    ✗ 你的选择
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 填空题答案 */}
                    {step.interaction_type === 'fill_blank' && (
                      <div className="mb-4 space-y-2">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600/30 rounded-lg">
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            正确答案：
                            <span className="ml-2 font-bold text-blue-600 dark:text-blue-400">
                              {step.answer}
                            </span>
                          </div>
                        </div>
                        {record && (
                          <div className={`p-3 border-2 rounded-lg ${
                            isCorrect
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                              : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                          }`}>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              你的答案：
                              <span className={`ml-2 font-bold ${
                                isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {record.user_answer}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 解析 */}
                    {step.analysis && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-600/30 rounded-lg">
                        <div className="text-sm font-bold text-yellow-800 dark:text-yellow-400 mb-1">
                          💡 解析
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <ReactMarkdown>
                            {step.analysis}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* 答题历史 */}
                    {record && (
                      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        最后练习: {new Date(record.timestamp).toLocaleString('zh-CN')}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // ==================== 练习模式 ====================
  if (!stepsToPractice || stepsToPractice.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>没有需要练习的小题 🎉</p>
      </div>
    );
  }

  const progress = ((currentStepIndex + 1) / stepsToPractice.length) * 100;

  return (
    <div className="composite-practice-mode space-y-6">
      {/* 大题题干 */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-bold">
            练习模式
          </span>
          <span className="text-gray-600 dark:text-gray-300 text-sm">
            难度 {"⭐".repeat(question.difficulty || 3)}
          </span>
        </div>
        <div className="text-gray-800 dark:text-gray-200">
          <ReactMarkdown>
            {question.stem}
          </ReactMarkdown>
        </div>
        {question.media?.image_url && (
          <img
            src={question.media.image_url}
            alt="题目图片"
            className="mt-4 rounded-lg max-w-md"
          />
        )}
      </div>

      {/* 进度指示器 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-700 dark:text-gray-300 font-semibold">
            小题 {currentStepIndex + 1} / {stepsToPractice.length}
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            {progress.toFixed(0)}% 完成
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* 当前小题 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          📍 小题 {currentPracticeStep.step_index + 1}: {currentPracticeStep.stem.substring(0, 50)}...
        </h3>

        {/* 选择题 */}
        {(currentPracticeStep.interaction_type === 'single_choice' || currentPracticeStep.interaction_type === 'multiple_choice') && (
          <div className="space-y-3">
            {currentPracticeStep.options.map((option) => (
              <button
                key={option.key}
                onClick={() => !feedback?.show && handleStepAnswer(option.key)}
                disabled={feedback?.show}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  feedback?.show
                    ? option.is_correct
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                      : 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                }`}
              >
                <span className="font-semibold mr-3">{option.key}.</span>
                <div className="inline">
                  <ReactMarkdown>{option.content}</ReactMarkdown>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 填空题 */}
        {currentPracticeStep.interaction_type === 'fill_blank' && (
          <MultiBlankInput
            key={currentPracticeStep.stem}
            stem={currentPracticeStep.stem}
            correctAnswer={currentPracticeStep.answer}
            onAnswer={(answer) => handleStepAnswer(answer)}
            submittedAnswer={null}
          />
        )}

        {/* 答题反馈 */}
        {feedback?.show && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 p-4 rounded-xl ${
              feedback.isCorrect
                ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">
                {feedback.isCorrect ? '✅' : '❌'}
              </span>
              <span className="font-bold text-gray-800 dark:text-white">
                {feedback.isCorrect ? '正确！' : '错误'}
              </span>
            </div>

            {!feedback.isCorrect && (
              <div className="space-y-2">
                <p className="text-gray-700 dark:text-gray-300">
                  正确答案：<span className="font-bold">{feedback.correctAnswer}</span>
                </p>
                {currentPracticeStep.analysis && (
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <ReactMarkdown>
                        {currentPracticeStep.analysis}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                if (currentStepIndex < stepsToPractice.length - 1) {
                  setCurrentStepIndex(currentStepIndex + 1);
                  setFeedback(null);
                } else {
                  if (onStepComplete) {
                    onStepComplete(practiceAnswers);
                  }
                }
              }}
              className="mt-4 w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-md"
            >
              {currentStepIndex < stepsToPractice.length - 1 ? '继续 →' : '完成练习'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CompositeMistakeView;
