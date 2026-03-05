import { useState, useMemo, memo, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { Components } from 'react-markdown';
import MultiBlankInput from "./MultiBlankInput";
import { QuizCardProps, QuizOption } from "../types";

const INDEX_TO_KEY = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/**
 * QuizCard 组件 - 支持多种题型
 * - single_choice: 单选题
 * - multiple_choice: 多选题
 * - fill_blank: 填空题
 * - proof: 证明题
 * - essay: 问答题
 */
const QuizCard: React.FC<QuizCardProps> = memo(({
    questionData,
    onSelect,
    isSubmitting,
    feedback,
    allowRetry = false
}) => {
    const [userAnswer, setUserAnswer] = useState("");
    const [multipleSelections, setMultipleSelections] = useState(new Set());

    // 题目类型判断
    const questionType = questionData?.type || 'single_choice';
    const isMultiple = questionType === 'multiple_choice';
    const hasOptions = questionType === 'single_choice' || questionType === 'multiple_choice';
    const isTextInput = questionType === 'fill_blank' || questionType === 'proof' || questionType === 'essay';

    // 题目切换时重置状态
    useEffect(() => {
        setUserAnswer("");
        setMultipleSelections(new Set());
    }, [questionData?.id]);

    // 处理选项点击（单选/多选）
    const handleOptionClick = (optKey: string) => {
        if (feedback && !allowRetry) return;
        if (isSubmitting) return;

        if (isMultiple) {
            const newSelections = new Set(multipleSelections);
            if (newSelections.has(optKey)) {
                newSelections.delete(optKey);
            } else {
                newSelections.add(optKey);
            }
            setMultipleSelections(newSelections);
        } else {
            onSelect(optKey);
        }
    };

    // 处理多选题提交
    const handleSubmitMultiple = () => {
        if (multipleSelections.size > 0) {
            const selectedKeys = Array.from(multipleSelections).sort().join(',');
            onSelect(selectedKeys);
        }
    };

    // 处理文本输入提交
    const handleSubmitText = () => {
        console.log('🔍 handleSubmitText 被调用', {
            userAnswer,
            userAnswerTrimmed: userAnswer.trim(),
            questionType,
            isSubmitting,
            feedback
        });
        if (userAnswer.trim()) {
            onSelect(userAnswer.trim());
        }
    };

    // 获取选项状态（用于单选/多选）
    const getOptionStyle = (option: QuizOption, index: number): string => {
        const isSelected = isMultiple
            ? multipleSelections.has(option.key)
            : feedback?.selectedKey === option.key;

        const isCorrect = option.is_correct;
        const showFeedback = feedback !== null;

        let baseStyle = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ";

        if (!showFeedback) {
            // 未提交状态
            baseStyle += isSelected
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 shadow-md"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md hover:bg-blue-50/50 dark:hover:bg-blue-900/10";
        } else {
            // 已提交状态
            if (isCorrect) {
                baseStyle += "bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-400 shadow-md";
            } else if (isSelected) {
                baseStyle += "bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-400 shadow-md";
            } else {
                baseStyle += "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60";
            }
        }

        return baseStyle;
    };

    // Markdown 渲染器
    const renderers: Components = useMemo(() => ({
        p: ({children}) => <p className="mb-3 last:mb-0 leading-relaxed text-gray-700 dark:text-gray-300">{children}</p>,
        img: ({src, alt}) => <img src={src} alt={alt} className="rounded-xl my-4 max-h-64 object-contain mx-auto shadow-md border border-gray-200 dark:border-white/10" />,
        table: ({children}) => (
            <div className="my-3 overflow-x-auto rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden rounded-lg">
                    {children}
                </table>
            </div>
        ),
        thead: ({children}) => (
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                {children}
            </thead>
        ),
        tbody: ({children}) => <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>,
        tr: ({children}) => (
            <tr className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors duration-150">
                {children}
            </tr>
        ),
        th: ({children}) => <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{children}</th>,
        td: ({children}) => <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{children}</td>,
        code: ({children, className}) => {
            const isInline = !className;
            return isInline ? (
                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-blue-600 dark:text-blue-400">
                    {children}
                </code>
            ) : (
                <code className={`block p-4 my-3 bg-gray-900 dark:bg-gray-950 rounded-lg overflow-x-auto text-sm font-mono text-gray-100 ${className}`}>
                    {children}
                </code>
            );
        },
    }), []);

    return (
        <div className="flex flex-col h-full">
            {/* 题干 */}
            <div className="px-8 pt-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                        components={renderers}
                    >
                        {questionData?.stem || "题目加载中..."}
                    </ReactMarkdown>
                </div>

                {/* 题型标签 */}
                <div className="mt-4 flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        questionType === 'single_choice' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        questionType === 'multiple_choice' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                        questionType === 'fill_blank' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        questionType === 'proof' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                        'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                    }`}>
                        {questionType === 'single_choice' ? '单选题' :
                         questionType === 'multiple_choice' ? '多选题' :
                         questionType === 'fill_blank' ? '填空题' :
                         questionType === 'proof' ? '证明题' : '问答题'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        难度: {'⭐'.repeat(questionData?.difficulty || 1)}
                    </span>
                </div>
            </div>

            {/* 答题区域 */}
            <div className="flex-1 px-8 py-6 overflow-y-auto">
                {hasOptions ? (
                    // 选择题：渲染选项
                    <div className="space-y-3 max-w-3xl mx-auto">
                        {questionData?.options?.map((option: QuizOption, index: number) => (
                            <motion.button
                                key={option.key}
                                onClick={() => handleOptionClick(option.key)}
                                disabled={isSubmitting || (feedback !== null && !allowRetry) || false}
                                whileHover={{ scale: feedback ? 1 : 1.01 }}
                                whileTap={{ scale: feedback ? 1 : 0.99 }}
                                className={getOptionStyle(option, index)}
                            >
                                <div className="flex items-center gap-5">
                                    {/* 选项字母 */}
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl border-2 ${
                                        feedback && option.is_correct
                                            ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-400 dark:text-green-400'
                                            : feedback && feedback.selectedKey === option.key && !option.is_correct
                                                ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:border-red-400 dark:text-red-400'
                                                : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
                                    }`}>
                                        {option.key}
                                    </div>

                                    {/* 选项内容 */}
                                    <div className="flex-1 text-left py-3 prose prose-slate dark:prose-invert max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath, remarkGfm]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={renderers}
                                        >
                                            {option.content}
                                        </ReactMarkdown>
                                    </div>

                                    {/* 反馈图标 */}
                                    {feedback && option.is_correct && (
                                        <span className="flex-shrink-0 text-3xl">✅</span>
                                    )}
                                    {feedback && feedback.selectedKey === option.key && !option.is_correct && (
                                        <span className="flex-shrink-0 text-3xl">❌</span>
                                    )}
                                </div>
                            </motion.button>
                        ))}

                        {/* 多选题提交按钮 */}
                        {isMultiple && multipleSelections.size > 0 && !feedback && (
                            <motion.button
                                onClick={handleSubmitMultiple}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                            >
                                提交答案 ({multipleSelections.size}项已选)
                            </motion.button>
                        )}
                    </div>
                ) : (
                    // 填空题/证明题/问答题：简答输入（只填关键答案）
                    <div className="space-y-6">
                        {/* ✨ 检测是否有多个空格 */}
                        {(() => {
                            const blankCount = (questionData.stem?.match(/_{3,}|\[blank\]|\[\s*\]/gi) || []).length;
                            const isMultiBlank = blankCount > 1;

                            return (
                                <>
                                    {/* 多空填空：使用 MultiBlankInput 组件 */}
                                    {isMultiBlank ? (
                                        <MultiBlankInput
                                            stem={questionData.stem}
                                            correctAnswer={questionData.answer}
                                            onAnswer={(answer, validation) => {
                                                setUserAnswer(answer);
                                                // 自动提交答案
                                                handleSubmitText();
                                            }}
                                            submittedAnswer={feedback ? { results: [{ isCorrect: feedback.correct }] } : null}
                                        />
                                    ) : (
                                        <>
                                            {/* 单空填空/证明题/问答题：保持原有逻辑 */}
                                            {/* 答题提示 */}
                                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-500/30">
                                                <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold mb-2">
                                                    {questionType === 'fill_blank' ? '📝 填空题' :
                                                     questionType === 'proof' ? '📐 证明题' : '✍️ 问答题'}
                                                </p>
                                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                                    💡 只需填写关键公式或步骤，不用写完整过程
                                                </p>
                                            </div>

                                            {/* 输入框 */}
                                            <div className="relative">
                            <input
                                type="text"
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                onKeyDown={(e) => {
                                    // ✅ 阻止所有按键冒泡到全局快捷键监听器
                                    // 防止在填空题输入时触发选择题的数字快捷键
                                    e.stopPropagation();
                                }}
                                onKeyPress={(e) => {
                                    // ✅ 同时也阻止 onKeyPress 事件（兼容性）
                                    e.stopPropagation();
                                }}
                                onKeyUp={(e) => {
                                    // ✅ 阻止 keyUp 事件冒泡
                                    e.stopPropagation();
                                }}
                                disabled={isSubmitting || (feedback !== null && !allowRetry) || false}
                                placeholder={
                                    questionType === 'fill_blank' ? '填写答案（公式/数字/文字）' :
                                    questionType === 'proof' ? '填写关键公式或定理名称' :
                                    '填写关键词或简短答案'
                                }
                                className="w-full px-6 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-all text-gray-900 dark:text-gray-100 text-lg font-mono"
                                autoFocus
                            />
                        </div>

                        {/* 提交按钮 */}
                        {!feedback && (
                            <motion.button
                                onClick={handleSubmitText}
                                disabled={!userAnswer.trim() || isSubmitting}
                                whileHover={{ scale: userAnswer.trim() ? 1.02 : 1 }}
                                whileTap={{ scale: userAnswer.trim() ? 0.98 : 1 }}
                                className={`w-full px-8 py-4 rounded-xl font-bold shadow-lg transition-all ${
                                    userAnswer.trim()
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-xl'
                                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                提交答案
                            </motion.button>
                        )}

                        {/* 反馈显示 */}
                        {feedback && (
                            <div className={`p-6 rounded-xl border-2 ${
                                feedback.correct
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-400'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-400'
                            }`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-3xl">{feedback.correct ? '✅' : '❌'}</span>
                                    <div>
                                        <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                                            {feedback.correct ? '回答正确！' : '回答错误'}
                                        </span>
                                        {!feedback.correct && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        你的答案：{userAnswer}
                                        </p>
                                        )}
                                    </div>
                                </div>

                                {/* 错误时显示正确答案和解析 */}
                                {!feedback.correct && (
                                    <div className="mt-4 space-y-4">
                                        {questionData?.answer && (
                                            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">✅ 参考答案：</p>
                                                <p className="text-base text-gray-900 dark:text-gray-100 font-mono">{questionData.answer}</p>
                                            </div>
                                        )}

                                        {questionData?.solution && (
                                            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">💡 解析：</p>
                                                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkMath, remarkGfm]}
                                                        rehypePlugins={[rehypeKatex]}
                                                        components={renderers}
                                                    >
                                                        {questionData.solution}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                                        </>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
});

QuizCard.displayName = 'QuizCard';

export default QuizCard;
