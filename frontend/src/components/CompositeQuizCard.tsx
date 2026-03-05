import { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import axios from "axios";

// 定义选项接口
interface Option {
  key: string;
  content: string;
  is_correct: boolean;
}

// 定义步骤接口
interface Step {
  stem: string;
  interaction_type: 'single_choice' | 'multiple_choice' | 'fill_blank';
  options?: Option[];
  analysis?: string;
}

// 定义问题数据接口
interface QuestionData {
  id: string;
  stem: string;
  difficulty: number;
  steps: Step[];
  media?: {
    image_url?: string;
  };
}

// 定义组件 props
interface CompositeQuizCardProps {
  questionData: QuestionData;
  onAnswer?: () => void;
  onStepComplete?: (answers: any) => void;
}

// 定义答案记录
interface AnswersRecord {
  [key: number]: {
    selectedKey: string;
    isCorrect: boolean;
  };
}

// 定义反馈状态
interface FeedbackState {
  show: boolean;
  isCorrect: boolean;
  correctAnswer: string;
}

const CompositeQuizCard: React.FC<CompositeQuizCardProps> = ({ questionData, onAnswer, onStepComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswersRecord>({}); // 记录每小题答案
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [multipleSelections, setMultipleSelections] = useState<Set<string>>(new Set());

  const currentStep = questionData.steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / questionData.steps.length) * 100;

  const handleStepAnswer = async (selectedKey) => {
    try {
      // 提交当前小题答案
      const response = await axios.post("http://localhost:8000/api/quiz/submit", {
        user_id: "u_alex",
        question_id: questionData.id,
        step_index: currentStepIndex,
        selected_key: selectedKey,
        duration_ms: 5000,
        is_hesitant: false
      });

      const isCorrect = response.data.is_correct;

      // 记录答案
      setAnswers({
        ...answers,
        [currentStepIndex]: { selectedKey, isCorrect }
      });

      setFeedback({
        show: true,
        isCorrect,
        correctAnswer: response.data.correct_answer
      });

      if (isCorrect) {
        // 答对，自动下一题
        if (currentStepIndex < questionData.steps.length - 1) {
          setTimeout(() => {
            setCurrentStepIndex(currentStepIndex + 1);
            setFeedback(null);
            setSelectedOption(null);
            setMultipleSelections(new Set());
          }, 1500);
        } else {
          // 完成
          onStepComplete && onStepComplete(answers);
        }
      }
    } catch (error) {
      console.error("提交答案失败:", error);
    }
  };

  const handleOptionClick = (optKey) => {
    const stepType = currentStep.interaction_type;

    if (stepType === 'single_choice') {
      setSelectedOption(optKey);
      handleStepAnswer(optKey);
    } else if (stepType === 'multiple_choice') {
      const newSelections = new Set(multipleSelections);
      if (newSelections.has(optKey)) {
        newSelections.delete(optKey);
      } else {
        newSelections.add(optKey);
      }
      setMultipleSelections(newSelections);
    }
  };

  const handleSubmitMultiple = () => {
    if (multipleSelections.size > 0) {
      const selectedKeys = Array.from(multipleSelections).sort().join(',');
      handleStepAnswer(selectedKeys);
    }
  };

  const handleContinue = () => {
    if (currentStepIndex < questionData.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setFeedback(null);
      setSelectedOption(null);
      setMultipleSelections(new Set());
    } else {
      onStepComplete && onStepComplete(answers);
    }
  };

  const getOptionStyle = (option, isMultiple) => {
    const isSelected = isMultiple
      ? multipleSelections.has(option.key)
      : selectedOption === option.key;

    const showFeedback = feedback?.show;
    const isCorrect = option.is_correct;

    let baseStyle = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ";

    if (showFeedback) {
      if (isCorrect) {
        baseStyle += "bg-green-50 dark:bg-green-900/20 border-green-500";
      } else if (isSelected && !isCorrect) {
        baseStyle += "bg-red-50 dark:bg-red-900/20 border-red-500";
      } else {
        baseStyle += "border-gray-200 dark:border-gray-700";
      }
    } else {
      if (isSelected) {
        baseStyle += "bg-blue-50 dark:bg-blue-900/20 border-blue-500";
      } else {
        baseStyle += "border-gray-200 dark:border-gray-700 hover:border-blue-400";
      }
    }

    return baseStyle;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="composite-quiz-card space-y-6"
    >
      {/* 大题题干 */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">
            综合题
          </span>
          <span className="text-gray-600 dark:text-gray-300 text-sm">
            难度 {"⭐".repeat(questionData.difficulty)}
          </span>
        </div>
        <div className="text-gray-800 dark:text-gray-200">
          <ReactMarkdown>
            {questionData.stem}
          </ReactMarkdown>
        </div>
        {questionData.media?.image_url && (
          <img
            src={questionData.media.image_url}
            alt="题目图片"
            className="mt-4 rounded-lg max-w-md"
          />
        )}
      </div>

      {/* 进度指示器 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-700 dark:text-gray-300 font-semibold">
            小题 {currentStepIndex + 1} / {questionData.steps.length}
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
          📍 {currentStep.stem}
        </h3>

        {currentStep.interaction_type === 'single_choice' && currentStep.options && (
          <div className="space-y-3">
            {currentStep.options.map((option) => (
              <button
                key={option.key}
                onClick={() => !feedback?.show && handleOptionClick(option.key)}
                disabled={feedback?.show}
                className={getOptionStyle(option, false)}
              >
                <span className="font-semibold mr-3">{option.key}.</span>
                <span className="inline">
                  <ReactMarkdown>{option.content}</ReactMarkdown>
                </span>
              </button>
            ))}
          </div>
        )}

        {currentStep.interaction_type === 'multiple_choice' && currentStep.options && (
          <div className="space-y-3">
            {currentStep.options.map((option) => (
              <button
                key={option.key}
                onClick={() => !feedback?.show && handleOptionClick(option.key)}
                disabled={feedback?.show}
                className={getOptionStyle(option, true)}
              >
                <span className="font-semibold mr-3">{option.key}.</span>
                <span className="inline">
                  <ReactMarkdown>{option.content}</ReactMarkdown>
                </span>
              </button>
            ))}
            {multipleSelections.size > 0 && !feedback?.show && (
              <button
                onClick={handleSubmitMultiple}
                className="mt-4 w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
              >
                提交答案
              </button>
            )}
          </div>
        )}

        {currentStep.interaction_type === 'fill_blank' && (
          <div className="space-y-4">
            <textarea
              className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
              rows={3}
              placeholder="请输入你的答案..."
              disabled={feedback?.show}
              onChange={(e) => setSelectedOption(e.target.value)}
            />
            {!feedback?.show && selectedOption && (
              <button
                onClick={() => handleStepAnswer(selectedOption)}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
              >
                提交答案
              </button>
            )}
          </div>
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
                <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <ReactMarkdown>
                      {currentStep.analysis}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleContinue}
              className="mt-4 w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-md"
            >
              {currentStepIndex < questionData.steps.length - 1 ? '继续 →' : '查看总结'}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default CompositeQuizCard;
