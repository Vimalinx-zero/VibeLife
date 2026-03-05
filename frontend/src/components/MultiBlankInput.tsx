import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { parseMultiBlankStem, validateMultiBlankAnswer } from "../utils/blankParser";

const MultiBlankInput = ({ stem, correctAnswer, onAnswer, submittedAnswer }) => {
  const { parsedStem, blankCount } = parseMultiBlankStem(stem);
  const [answers, setAnswers] = useState(new Array(blankCount).fill(''));

  const handleInputChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    // 将答案数组组合成逗号分隔的字符串
    const combinedAnswer = answers.join(',');
    const validation = validateMultiBlankAnswer(answers, correctAnswer);
    onAnswer(combinedAnswer, validation);
  };

  // 渲染带输入框的题干
  const renderStemWithInputs = () => {
    const parts = parsedStem.split(/{{BLANK_(\d+)}}/);

    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        // 这是一个空格占位符
        const blankIndex = parseInt(part);
        const feedback = submittedAnswer?.results?.[blankIndex];

        return (
          <input
            key={blankIndex}
            type="text"
            value={answers[blankIndex]}
            onChange={(e) => handleInputChange(blankIndex, e.target.value)}
            disabled={!!submittedAnswer}
            className={`blank-input px-3 py-2 border-2 rounded-lg outline-none transition-all ${
              feedback?.isCorrect
                ? 'bg-green-50 border-green-500 text-green-700'
                : feedback?.isCorrect === false
                ? 'bg-red-50 border-red-500 text-red-700'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:border-blue-500'
            }`}
            placeholder={`空 ${blankIndex + 1}`}
          />
        );
      }
      // 普通文本部分
      return <span key={`text-${idx}`}>{part}</span>;
    });
  };

  return (
    <div className="multi-blank-input space-y-4">
      {/* 题干和输入框 */}
      <div className="stem-with-inputs text-lg leading-relaxed">
        {renderStemWithInputs()}
      </div>

      {/* 提交按钮 */}
      {!submittedAnswer && answers.some(a => a.trim()) && (
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
        >
          提交答案
        </button>
      )}

      {/* 答题反馈 */}
      {submittedAnswer && (
        <div className="feedback space-y-2">
          {submittedAnswer.results.map((r, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border-2 ${
                r.isCorrect
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  {r.isCorrect ? '✅' : '❌'} 空{i + 1}
                </span>
                {!r.isCorrect && (
                  <span className="text-sm">
                    正确答案：<span className="font-mono font-bold">{r.correctAnswer}</span>
                  </span>
                )}
              </div>
              {r.isCorrect && r.userAnswer && (
                <div className="text-sm mt-1">
                  你的答案：<span className="font-mono">{r.userAnswer}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiBlankInput;
