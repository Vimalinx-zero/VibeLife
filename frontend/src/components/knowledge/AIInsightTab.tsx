import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import Section from "./Section";
import { AIExplanationData as AIExplanation } from "../../types";

interface AIInsightTabProps {
  type: 'note' | 'card' | 'mistake';
  id: string;
}

const Icons = {
  Book: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  List: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  Lightbulb: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  Target: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Alert: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Sparkles: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
};

/**
 * AI洞察标签页
 * 显示AI生成的总结、要点、建议、自测
 */
const AIInsightTab = ({ type, id }: AIInsightTabProps) => {
    const [explanation, setExplanation] = useState<AIExplanation | null>(null);
   const [loading, setLoading] = useState<boolean>(false);

  const fetchExplanation = async () => {
    try {
      setLoading(true);
      const endpoint = type === 'mistake'
        ? `/api/ai/explain/mistake/${id}`
        : `/api/ai/explain/note/${id}`;

      const response = await axios.get(`http://localhost:8000${endpoint}`);
      setExplanation(response.data.explanation);
    } catch (error) {
      console.error('Failed to fetch explanation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplanation();
  }, [type, id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
          <Icons.Sparkles />
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">AI正在分析...</span>
        </div>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="p-6 text-center">
        <Icons.Sparkles />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">暂无AI洞察</p>
        <button
          onClick={fetchExplanation}
          className="mt-3 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
        >
          生成AI分析
        </button>
      </div>
    );
  }

  // 笔记模式
  if (type === 'note') {
    return (
      <div className="p-4 space-y-3">
        {/* AI总结 */}
        <Section title="AI总结" icon={<Icons.Book />} color="green" count={0}>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {explanation.summary}
          </p>
        </Section>

        {/* 关键要点 */}
        {explanation.key_points && explanation.key_points.length > 0 && (
          <Section title="关键要点" icon={<Icons.List />} color="blue" count={explanation.key_points.length}>
            <div className="space-y-2">
              {explanation.key_points.map((point, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">{point}</p>
                </motion.div>
              ))}
            </div>
          </Section>
        )}

        {/* 学习建议 */}
        {explanation.suggestions && explanation.suggestions.length > 0 && (
          <Section title="学习建议" icon={<Icons.Lightbulb />} color="orange" count={explanation.suggestions.length}>
            <div className="space-y-2">
              {explanation.suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{suggestion}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 自测题目 */}
        {explanation.questions && explanation.questions.length > 0 && (
          <Section title="自测题目" icon={<Icons.Target />} color="purple" count={explanation.questions.length}>
            <div className="space-y-3">
              {explanation.questions.map((question: any, idx) => (
                <div key={idx} className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                        类型: {question.type === 'recall' ? '回忆' : '应用'}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{question.question}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  }

  // 错题模式
  if (type === 'mistake') {
    return (
      <div className="p-4 space-y-3">
        {/* 错误分析 */}
        {explanation.error_analysis && (
          <Section title="错误分析" icon={<Icons.Alert />} color="red" count={0}>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Icons.Alert />
                  <span className="font-semibold text-red-700 dark:text-red-400 text-sm">错误类型</span>
                </div>
                <p className="text-red-600 dark:text-red-300 text-sm font-medium">{explanation.error_analysis.error_type}</p>
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700/50">
                <h4 className="font-semibold text-orange-700 dark:text-orange-400 text-sm mb-2 flex items-center gap-2">
                  <Icons.Lightbulb />
                  根本原因
                </h4>
                 <ul className="space-y-1">
                   {explanation.error_analysis.root_cause?.map((cause, idx) => (
                     <li key={idx} className="text-orange-600 dark:text-orange-300 text-sm flex items-start gap-2">
                       <span className="mt-1">•</span>
                       <span>{cause}</span>
                     </li>
                   ))}
                </ul>
              </div>

              {explanation.error_analysis.misconceptions && explanation.error_analysis.misconceptions.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700/50">
                  <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 text-sm mb-2">🤔 常见误解</h4>
                  <div className="flex flex-wrap gap-2">
                    {explanation.error_analysis.misconceptions.map((misconception, idx) => (
                      <span key={idx} className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm rounded-full">
                        {misconception}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* 解题步骤 */}
        {explanation.step_by_step && explanation.step_by_step.length > 0 && (
          <Section title="解题步骤" icon={<Icons.List />} color="blue" count={explanation.step_by_step.length}>
            <div className="space-y-3">
              {explanation.step_by_step.map((step, idx) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex-shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-1">{step.title}</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">{step.content}</p>
                    {step.highlight && (
                      <div className="mt-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded">
                        💡 {step.highlight}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>
        )}

        {/* 知识点 */}
        {explanation.knowledge_points && explanation.knowledge_points.length > 0 && (
          <Section title="知识点" icon={<Icons.Book />} color="purple" count={explanation.knowledge_points.length}>
            <div className="space-y-2">
              {explanation.knowledge_points.map((point, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    point.importance === '高'
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/50'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-800 dark:text-white text-sm">{point.name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      point.importance === '高'
                        ? 'bg-purple-200 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {point.importance}重要性
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    分类: {point.category}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 学习建议 */}
        {explanation.tips && explanation.tips.length > 0 && (
          <Section title="学习建议" icon={<Icons.Lightbulb />} color="green" count={explanation.tips.length}>
            <div className="space-y-2">
              {explanation.tips.map((tip, idx) => (
                <li key={idx} className="text-green-600 dark:text-green-300 text-sm flex items-start gap-2">
                  <span className="mt-0.5">✓</span>
                  <span>{tip}</span>
                </li>
              ))}
            </div>
          </Section>
        )}

        {/* 相关概念 */}
        {explanation.related_concepts && explanation.related_concepts.length > 0 && (
          <Section title="相关概念" icon={<Icons.Target />} color="blue" count={explanation.related_concepts.length}>
            <div className="grid grid-cols-1 gap-2">
              {explanation.related_concepts.map((concept, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{concept.name}</span>
                  <span className="text-xs text-blue-500 dark:text-blue-400">{concept.relation}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  }

  return null;
};

export default AIInsightTab;
