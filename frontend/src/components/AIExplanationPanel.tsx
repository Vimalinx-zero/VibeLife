import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useToast } from "../context/ToastContext";

const Icons = {
  Sparkles: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  Book: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  Lightbulb: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  List: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  ChevronDown: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>,
  Target: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Alert: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
};

/**
 * AI讲解面板组件
 *
 * 用于显示错题和笔记的AI智能讲解
 *
 * @param {string} type - 'mistake' | 'note'
 * @param {string|number} id - 错题ID或笔记ID
 * @param {string} className - 额外的CSS类名
 */
const AIExplanationPanel = ({ type, id, className = "" }) => {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const toast = useToast();

  useEffect(() => {
    if (id && type) {
      fetchExplanation();
    }
  }, [id, type]);

  const fetchExplanation = async () => {
    try {
      setLoading(true);
      const endpoint = type === 'mistake'
        ? `/api/ai/explain/mistake/${id}`
        : `/api/ai/explain/note/${id}`;

      const response = await axios.get(`http://localhost:8000${endpoint}`);

      if (response.data.success) {
        setExplanation(response.data.explanation);
      } else {
        toast.error('❌ 获取讲解失败');
      }
    } catch (error) {
      console.error('Failed to fetch explanation:', error);
      toast.error('❌ 网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-700 ${className}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">AI正在生成讲解...</span>
        </div>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-6 text-center">
          <Icons.Sparkles />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">暂无AI讲解</p>
          <button
            onClick={fetchExplanation}
            className="mt-3 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
          >
            生成AI讲解
          </button>
        </div>
      </div>
    );
  }

  // 错题讲解渲染
  if (type === 'mistake') {
    return <MistakeExplanation explanation={explanation} expanded={expanded} setExpanded={setExpanded} className={className} />;
  }

  // 笔记讲解渲染
  if (type === 'note') {
    return <NoteExplanation explanation={explanation} expanded={expanded} setExpanded={setExpanded} className={className} />;
  }

  return null;
};

// 错题讲解内容
const MistakeExplanation = ({ explanation, expanded, setExpanded, className }) => {
  const [activeSection, setActiveSection] = useState("analysis");

  const tabs = [
    { id: "analysis", label: "错误分析", icon: <Icons.Alert /> },
    { id: "steps", label: "解题步骤", icon: <Icons.List /> },
    { id: "knowledge", label: "知识点", icon: <Icons.Book /> },
    { id: "tips", label: "学习建议", icon: <Icons.Lightbulb /> },
  ];

  return (
    <div className={`bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-700 overflow-hidden ${className}`}>
      {/* 标题栏 */}
      <div className="px-5 py-4 bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 border-b border-red-200 dark:border-red-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-500 rounded-lg">
              <Icons.Sparkles />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                AI智能讲解
                <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-600 dark:text-red-400 rounded-full">
                  错题分析
                </span>
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {explanation.summary}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <Icons.ChevronDown />
            </motion.div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* 标签页导航 */}
            <div className="flex border-b border-red-200 dark:border-red-700/50 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeSection === tab.id
                      ? 'text-red-600 dark:text-red-400 border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 内容区域 */}
            <div className="p-5 max-h-[500px] overflow-y-auto">
              {activeSection === 'analysis' && <ErrorAnalysisSection analysis={explanation.error_analysis} />}
              {activeSection === 'steps' && <StepByStepSection steps={explanation.step_by_step} />}
              {activeSection === 'knowledge' && <KnowledgePointsSection points={explanation.knowledge_points} />}
              {activeSection === 'tips' && <TipsSection tips={explanation.tips} concepts={explanation.related_concepts} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 笔记讲解内容
const NoteExplanation = ({ explanation, expanded, setExpanded, className }) => {
  const [activeSection, setActiveSection] = useState("summary");

  const tabs = [
    { id: "summary", label: "总结", icon: <Icons.Book /> },
    { id: "points", label: "要点", icon: <Icons.List /> },
    { id: "suggestions", label: "建议", icon: <Icons.Lightbulb /> },
    { id: "quiz", label: "自测", icon: <Icons.Target /> },
  ];

  return (
    <div className={`bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl border border-green-200 dark:border-green-700 overflow-hidden ${className}`}>
      {/* 标题栏 */}
      <div className="px-5 py-4 bg-gradient-to-r from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 border-b border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <Icons.Sparkles />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                AI智能讲解
                <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                  笔记助手
                </span>
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                帮助你理解和记忆笔记内容
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <Icons.ChevronDown />
            </motion.div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* 标签页导航 */}
            <div className="flex border-b border-green-200 dark:border-green-700/50 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeSection === tab.id
                      ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/10'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 内容区域 */}
            <div className="p-5 max-h-[500px] overflow-y-auto">
              {activeSection === 'summary' && (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {explanation.summary}
                  </p>
                </div>
              )}
              {activeSection === 'points' && <KeyPointsSection points={explanation.key_points} />}
              {activeSection === 'suggestions' && <SuggestionsSection suggestions={explanation.suggestions} />}
              {activeSection === 'quiz' && <QuizSection questions={explanation.quiz_questions} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 错误分析部分
const ErrorAnalysisSection = ({ analysis }) => (
  <div className="space-y-4">
    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700/50">
      <div className="flex items-center gap-2 mb-2">
        <Icons.Alert />
        <span className="font-semibold text-red-700 dark:text-red-400">错误类型</span>
      </div>
      <p className="text-red-600 dark:text-red-300 text-lg font-medium">{analysis.error_type}</p>
    </div>

    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700/50">
      <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-2">
        <Icons.Lightbulb />
        根本原因
      </h4>
      <ul className="space-y-1">
        {analysis.root_cause.map((cause, idx) => (
          <li key={idx} className="text-orange-600 dark:text-orange-300 text-sm flex items-start gap-2">
            <span className="mt-1">•</span>
            <span>{cause}</span>
          </li>
        ))}
      </ul>
    </div>

    {analysis.misconceptions && analysis.misconceptions.length > 0 && (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700/50">
        <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">🤔 常见误解</h4>
        <div className="flex flex-wrap gap-2">
          {analysis.misconceptions.map((misconception, idx) => (
            <span key={idx} className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm rounded-full">
              {misconception}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
);

// 逐步讲解部分
const StepByStepSection = ({ steps }) => (
  <div className="space-y-3">
    {steps.map((step, idx) => (
      <motion.div
        key={step.step}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.1 }}
        className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
      >
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
          {step.step}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 dark:text-white mb-1">{step.title}</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{step.content}</p>
          {step.highlight && (
            <div className="mt-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded">
              💡 {step.highlight}
            </div>
          )}
        </div>
      </motion.div>
    ))}
  </div>
);

// 知识点部分
const KnowledgePointsSection = ({ points }) => (
  <div className="space-y-3">
    {points.map((point, idx) => (
      <div
        key={idx}
        className={`p-4 rounded-lg border ${
          point.importance === '高'
            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/50'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-800 dark:text-white">{point.name}</span>
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
);

// 学习建议部分
const TipsSection = ({ tips, concepts }) => (
  <div className="space-y-4">
    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/50">
      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
        <Icons.Lightbulb />
        学习建议
      </h4>
      <ul className="space-y-2">
        {tips.map((tip, idx) => (
          <li key={idx} className="text-green-600 dark:text-green-300 text-sm flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>

    {concepts && concepts.length > 0 && (
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
        <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3">📚 相关概念</h4>
        <div className="grid grid-cols-1 gap-2">
          {concepts.map((concept, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
              <span className="text-sm text-gray-700 dark:text-gray-300">{concept.name}</span>
              <span className="text-xs text-blue-500 dark:text-blue-400">{concept.relation}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// 笔记要点部分
const KeyPointsSection = ({ points }) => (
  <div className="space-y-2">
    {points.map((point, idx) => (
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
        className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <p className="text-gray-700 dark:text-gray-300 text-sm">{point}</p>
      </motion.div>
    ))}
  </div>
);

// 建议部分
const SuggestionsSection = ({ suggestions }) => (
  <div className="space-y-2">
    {suggestions.map((suggestion, idx) => (
      <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-xs font-bold">
          {idx + 1}
        </div>
        <p className="text-gray-700 dark:text-gray-300 text-sm flex-1">{suggestion}</p>
      </div>
    ))}
  </div>
);

// 自测问题部分
const QuizSection = ({ questions }) => (
  <div className="space-y-3">
    {questions.map((question, idx) => (
      <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700/50">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center">
            <Icons.Target />
          </div>
          <div className="flex-1">
            <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">
              类型: {question.type === 'recall' ? '回忆' : '应用'}
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium">{question.question}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default AIExplanationPanel;
