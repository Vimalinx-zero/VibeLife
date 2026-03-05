import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import QuizCard from "./QuizCard";
import CompositeMistakeView from "./CompositeMistakeView";
import AIExplanationPanel from "./AIExplanationPanel";
import { useTheme } from "../context/ThemeContext";
import { QuizQuestion } from '../types';
import 'katex/dist/katex.min.css';

// 图标
const Icons = {
  Split: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm10.5 1.5v10.5h4.5a1.5 1.5 0 001.5-1.5V7.5a1.5 1.5 0 00-1.5-1.5h-4.5zm-1.5 0H6a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5h6V7.5z" clipRule="evenodd" /></svg>,
  Bug: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z" /><path fillRule="evenodd" d="M12 6.75a5.25 5.25 0 015.25 5.25v3a3 3 0 00-3 3v.75h-4.5v-.75a3 3 0 00-3-3v-3A5.25 5.25 0 0112 6.75z" clipRule="evenodd" /></svg>,
  Link: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M19.902 4.098a3.75 3.75 0 00-5.304 0l-4.5 4.5a3.75 3.75 0 005.304 5.304l4.5-4.5a3.75 3.75 0 000-5.304zM6.11 11.613a3.75 3.75 0 005.304 0l4.5-4.5A.75.75 0 0014.854 6.05l-4.5 4.5a2.25 2.25 0 01-3.182-3.182l4.5-4.5a.75.75 0 00-1.06-1.061l-4.5 4.5a3.75 3.75 0 000 5.304z" clipRule="evenodd" /><path fillRule="evenodd" d="M4.098 19.902a3.75 3.75 0 005.304 0l4.5-4.5a3.75 3.75 0 00-5.304-5.304l-4.5 4.5a3.75 3.75 0 000 5.304zM13.94 12.387a3.75 3.75 0 00-5.304 0l-4.5 4.5a.75.75 0 001.06 1.061l4.5-4.5a2.25 2.25 0 013.182 3.182l-4.5 4.5a.75.75 0 001.06 1.06l4.5-4.5a3.75 3.75 0 000-5.304z" clipRule="evenodd" /></svg>,
  ExternalLink: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M15.75 2.25H21a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0V4.81L8.03 17.03a.75.75 0 01-1.06-1.06L19.19 3.75h-3.44a.75.75 0 010-1.5zm-10.5 4.5a1.5 1.5 0 00-1.5 1.5v10.5a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5V10.5a.75.75 0 011.5 0v8.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V8.25a3 3 0 013-3h8.25a.75.75 0 010 1.5H5.25z" clipRule="evenodd" /></svg>,
  Eye: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12 3.75s9.189 3.226 10.677 7.697a.75.75 0 010 .506C21.189 16.424 16.972 19.65 12 19.65s-9.189-3.226-10.677-7.697a.75.75 0 010-.506zM12 17.25a5.25 5.25 0 100-10.5 5.25 5.25 0 000 10.5z" clipRule="evenodd" /></svg>,
  Pen: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" /></svg>,
  Save: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M4.5 3a1.5 1.5 0 00-1.5 1.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5V7.121a1.5 1.5 0 00-.44-1.06L17.44 3.44A1.5 1.5 0 0016.38 3H4.5zM15 4.5v4.5a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75V4.5h6zm-9 15v-6.75a.75.75 0 01.75-.75h10.5a.75.75 0 01.75.75v6.75H6z" clipRule="evenodd" /></svg>,
  Lock: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" /></svg>,
  Check: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4-4a.75.75 0 00-.862-1.226z" clipRule="evenodd" /></svg>,
  Sparkles: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5z" clipRule="evenodd" /></svg>
};

const MistakeWorkstation = ({
  mistake,
  linkedNote,
  noteContent,
  setNoteContent,
  onSave,
  onGoToNote,
  aiOpen,
  onRetry, // ✅ 接收重试回调
  feedback, // ✅ 新增：接收上层传来的反馈状态
  saveFeedback, // ✅ 新增：接收笔记保存反馈
  onRefresh // ✅ 新增：接收刷新回调
}) => {
  const { editorSettings } = useTheme();
  const [viewMode, setViewMode] = useState("split");

  // ✅ 新增：控制是否显示答案和笔记
  const [isRevealed, setIsRevealed] = useState(false);

   // ✅ 新增：控制AI讲解面板显示
   const [showAIExplanation, setShowAIExplanation] = useState(false);

   // ✅ 新增：复合题练习模式管理
   const [compositeMode, setCompositeMode] = useState<'review' | 'practice_wrong' | 'practice_all'>('review');

  // 切换题目时重置遮罩和模式
  useEffect(() => {
      setIsRevealed(false);
      setCompositeMode('review'); // 重置为查看模式
  }, [mistake]);

  const handleInteract = (key) => {
      // 用户做了题，或者点击了 Peek，解锁内容
      setIsRevealed(true);
  };

  // ✅ 新增：复合题小题答题回调
  const handleCompositeStepAnswer = async (stepIndex, selectedKey) => {
      // 这个回调会被 CompositeMistakeView 调用
      // 实际的 API 调用和反馈处理在 CompositeMistakeView 内部完成
      console.log(`Step ${stepIndex} answered with: ${selectedKey}`);
      setIsRevealed(true); // 练习模式下自动解锁
  };

  // ✅ 新增：复合题练习完成回调
  const handleCompositeComplete = () => {
      console.log('Composite practice completed');
      // 练习完成后自动切换回查看模式
      setCompositeMode('review');
      // ✅ 触发重新加载错题数据
      if (onRefresh) {
          onRefresh();
      }
  };

   // 构造 QuizCard 数据（新题型系统）
   const mistakeQuestionData = mistake && mistake.question ? {
       id: mistake.question.id,
       type: mistake.question.type,
       stem: mistake.question.stem,
       options: mistake.question.options,
       answer: mistake.question.answer,
       solution: mistake.question.solution,
       difficulty: mistake.question.difficulty,
       subject: mistake.question.subject,
       media: mistake.question.media,
       is_composite: mistake.question.is_composite,
       steps: mistake.question.steps
   } : null as QuizQuestion | null;

   // ✅ 使用 useMemo 优化 renderers
   const renderers = useMemo(() => ({
       p: ({children}: any) => <p className="mb-3 leading-relaxed">{children}</p>,
       h1: ({children}: any) => <h1 className="text-xl font-bold mb-4 border-b border-gray-200 dark:border-white/10 pb-2">{children}</h1>,
       h2: ({children}: any) => <h2 className="text-lg font-bold mb-3 mt-6">{children}</h2>,
       h3: ({children}: any) => <h3 className="text-base font-bold mb-2 mt-4">{children}</h3>,
      // ✨ 美化表格渲染（紧凑版）
      table: ({children}) => (
        <div className="my-4 overflow-x-auto rounded-lg shadow">
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
      th: ({children}) => (
        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
          {children}
        </th>
      ),
      td: ({children}) => (
        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">
          {children}
        </td>
      ),
   }), []) as any;

  return (
    <motion.div 
        initial={false} 
        animate={{ width: viewMode === 'split' ? '100%' : (aiOpen ? '95%' : '70%') }} 
        transition={{ type: "spring", stiffness: 120, damping: 20 }} 
        className="h-full flex flex-col overflow-hidden relative 
                   bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-2xl 
                   border border-white/40 dark:border-white/10 
                   rounded-3xl shadow-xl transition-colors duration-300"
    >
      
      {/* 1. 顶部工具栏 */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200/50 dark:border-white/10 bg-white/30 dark:bg-white/5 shrink-0 z-20">
        <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-lg gap-1">
            <button onClick={() => setViewMode('problem')} className={`p-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'problem' ? 'bg-white dark:bg-slate-600 shadow text-red-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Problem Only"><Icons.Bug className="w-4 h-4"/> <span>Problem</span></button>
            <button onClick={() => setViewMode('split')} className={`p-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'split' ? 'bg-white dark:bg-slate-600 shadow text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Split View"><Icons.Split className="w-4 h-4"/> <span>Split</span></button>
            <button onClick={() => setViewMode('note')} className={`p-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'note' ? 'bg-white dark:bg-slate-600 shadow text-yellow-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Note Only"><Icons.Pen className="w-4 h-4"/> <span>Note</span></button>
            {/* AI讲解按钮 */}
            {mistake && (
              <button
                onClick={() => setShowAIExplanation(!showAIExplanation)}
                className={`p-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-bold ml-2 ${
                  showAIExplanation
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-purple-500 dark:hover:text-purple-400'
                }`}
                title="AI Explanation"
              >
                <Icons.Sparkles className="w-4 h-4" />
                <span>AI</span>
              </button>
            )}
        </div>

        <div className="flex-1 text-center opacity-50 font-mono text-xs font-bold truncate px-4">
            {isRevealed ? (linkedNote ? `Linked: ${linkedNote.name}` : "Review Mode") : "🔒 Locked: Attempt to reveal"}
        </div>

        {/* Peek 按钮：如果在 Split 模式且未解锁，显示查看按钮 */}
        {!isRevealed && viewMode !== 'note' && (
            <button onClick={() => setIsRevealed(true)} className="px-3 py-1 bg-gray-200 dark:bg-white/10 hover:bg-blue-500 hover:text-white text-gray-500 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors mr-2">
                <Icons.Eye className="w-3 h-3 inline mr-1" /> Peek
            </button>
        )}

        <button onClick={onSave} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2">
            <Icons.Save className="w-3 h-3" /> Save Note
        </button>
      </div>

      {/* 2. 双栏内容区 */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* --- 左侧：题目 --- */}
        <motion.div 
            initial={false} 
            animate={{ width: viewMode === 'problem' ? '100%' : (viewMode === 'split' ? '50%' : '0%'), opacity: viewMode === 'note' ? 0 : 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }} 
            className="h-full flex flex-col border-r border-gray-200/50 dark:border-white/5 bg-red-50/30 dark:bg-red-900/10 overflow-hidden relative"
        >
            {mistake ? (
                <div className="w-full h-full overflow-y-auto custom-scrollbar">
                    
                    {/* ✅ 新增：顶部浮动提示条 (替代 alert) */}
                    <AnimatePresence>
                        {feedback && (
                            <motion.div 
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -50, opacity: 0 }}
                                className={`absolute top-4 left-0 right-0 mx-auto w-[90%] z-30 p-3 rounded-xl shadow-lg backdrop-blur-md border flex items-center justify-center gap-2 text-sm font-bold 
                                    ${feedback.correct 
                                        ? 'bg-green-500/90 text-white border-green-400' 
                                        : 'bg-red-500/90 text-white border-red-400' 
                                    }`}
                            >
                                <span>{feedback.message}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <div className="flex flex-col items-center min-h-full px-6 py-8">
                        <div className="w-full max-w-3xl min-w-[300px] flex-1 pt-10"> {/* pt-10 留出空间给提示条 */}

                            {/* 交互卡片 */}
                            {mistakeQuestionData?.is_composite ? (
                                <>
                                    {/* ✅ 复合题练习模式选择器 */}
                                    <div className="mb-4 p-3 bg-white/50 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/10">
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
                                            练习模式
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCompositeMode('review')}
                                                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                                                    compositeMode === 'review'
                                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                        : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                                }`}
                                            >
                                                <Icons.Eye className="w-4 h-4 inline mr-1" />
                                                查看模式
                                            </button>
                                            <button
                                                onClick={() => setCompositeMode('practice_wrong')}
                                                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                                                    compositeMode === 'practice_wrong'
                                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                                        : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                                }`}
                                                disabled={!mistake.step_answers || mistake.step_answers.length === 0}
                                                title={!mistake.step_answers || mistake.step_answers.length === 0 ? '暂无答题记录' : '重练做错的题目'}
                                            >
                                                <Icons.Bug className="w-4 h-4 inline mr-1" />
                                                重练错题
                                            </button>
                                            <button
                                                onClick={() => setCompositeMode('practice_all')}
                                                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                                                    compositeMode === 'practice_all'
                                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                        : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                                }`}
                                            >
                                                <Icons.Sparkles className="w-4 h-4 inline mr-1" />
                                                重练全部
                                            </button>
                                        </div>
                                    </div>

                                    {/* ✨ 复合题：根据模式显示不同视图 */}
                                    <CompositeMistakeView
                                        question={mistakeQuestionData}
                                        stepAnswers={mistake.step_answers}
                                        mode={compositeMode}
                                        onStepAnswer={handleCompositeStepAnswer}
                                        onStepComplete={handleCompositeComplete}
                                        mistake_id={mistake.id} // ✅ 传递错题 ID 用于 API 调用
                                        userId="u_alex" // ✅ 传递用户 ID（后续可以从 context 获取）
                                    />
                                </>
                             ) : (
                                 // 单题：使用原来的 QuizCard
                                 <QuizCard
                                     questionData={mistakeQuestionData as any}
                                     onSelect={onRetry || handleInteract} // ✅ 这里把重试函数传进去
                                     isSubmitting={false}
                                     // ✅ 核心修改：将 feedback 传入，让 QuizCard 自动变色 (红/绿)
                                     feedback={feedback}
                                     allowRetry={false} // 错题重做模式下，做完一次就锁定，不让反复点
                                 />
                             )}

                            {/* ✅ 历史错选记录 (History Stats) */}
                            <div className="mt-8 p-4 rounded-xl border border-dashed border-gray-300 dark:border-white/10 opacity-70 hover:opacity-100 transition-opacity">
                                <div className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2">
                                    <Icons.Bug className="w-3 h-3" /> Error History
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {/* 新数据格式：history = [{answer: 'xxx', is_correct: false}] */}
                                    {(mistake.history || []).map((h, i) => (
                                        <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm ${
                                            h.is_correct
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30'
                                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'
                                        }`}>
                                            <span className={`font-mono font-bold ${
                                                h.is_correct ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                            }`}>{h.answer}</span>
                                            {!h.is_correct && <span className="text-xs text-red-500 font-bold">✗</span>}
                                        </div>
                                    ))}
                                    {(!mistake.history || mistake.history.length === 0) && (
                                        <span className="text-xs text-gray-400 italic">No history yet</span>
                                    )}
                                </div>
                            </div>

                            {/* ✅ AI智能讲解面板 */}
                            <AnimatePresence>
                              {showAIExplanation && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="mt-6"
                                >
                                  <AIExplanationPanel
                                    type="mistake"
                                    id={mistake.id}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="h-10"></div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-400 font-bold">Select a mistake</div>
            )}
        </motion.div> 

        {/* --- 右侧：笔记 --- */}
        <motion.div 
            initial={false} 
            animate={{ width: viewMode === 'note' ? '100%' : (viewMode === 'split' ? '50%' : '0%'), opacity: viewMode === 'problem' ? 0 : 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="h-full flex flex-col bg-white/40 dark:bg-[#0c0c0c]/20 overflow-hidden relative"
        >
            {/* ✅ 新增：笔记保存成功 Toast (绿色呼吸边框) */}
            <AnimatePresence>
                {saveFeedback && (
                    <motion.div 
                        initial={{ y: -50, opacity: 0 }} 
                        animate={{ 
                            y: 0, 
                            opacity: 1, 
                            // ✅ 呼吸效果：通过 boxShadow 实现绿色光晕脉冲 
                            boxShadow: [ 
                                "0 0 0 0px rgba(74, 222, 128, 0)", 
                                "0 0 0 4px rgba(74, 222, 128, 0.3)", 
                                "0 0 0 0px rgba(74, 222, 128, 0)" 
                            ] 
                        }} 
                        exit={{ y: -50, opacity: 0 }} 
                        transition={{ 
                            y: { type: "spring", stiffness: 100 }, 
                            opacity: { duration: 0.2 }, 
                            boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } // 循环呼吸 
                        }} 
                        className="absolute top-4 left-0 right-0 mx-auto w-[90%] z-40 p-3 rounded-xl backdrop-blur-md flex items-center justify-center gap-2 text-sm font-bold 
                                   bg-green-500/10 border border-green-500 text-green-600 dark:text-green-400" 
                    >
                        <Icons.Check className="w-4 h-4" />
                        <span>{saveFeedback}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* ✅ 遮罩层：如果未解锁且不是纯笔记模式，显示模糊遮罩 */}
            <AnimatePresence>
                {!isRevealed && viewMode !== 'note' && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 backdrop-blur-md bg-white/30 dark:bg-black/30 flex flex-col items-center justify-center text-center p-8"
                    >
                        <div className="w-16 h-16 bg-gray-200/50 dark:bg-white/10 rounded-full flex items-center justify-center mb-4 text-gray-500 dark:text-gray-300">
                            <Icons.Lock className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-lg dark:text-white text-gray-800">Note Locked</h3>
                        <p className="text-sm text-gray-500 max-w-xs mt-2">
                            Attempt the question or click "Peek" to unlock your reflection notes.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {linkedNote ? (
                viewMode === 'note' ? (
                    // A. 编辑模式
                    <div className="w-full h-full p-8">
                        <textarea 
                            value={noteContent} 
                            onChange={(e) => setNoteContent(e.target.value)} 
                            className="w-full h-full bg-transparent outline-none resize-none font-mono text-sm leading-loose placeholder-gray-400/50 text-gray-800 dark:text-gray-200 border-none focus:ring-0 p-0" 
                            style={{ fontSize: `${editorSettings.fontSize}px`, lineHeight: '1.6' }}
                        />
                    </div>
                ) : (
                    // B. 阅览模式
                    <>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            <div className="max-w-none text-gray-800 dark:text-gray-200">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath, remarkGfm]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={renderers as any}
                                >
                                    {noteContent || "*Empty note...*"}
                                </ReactMarkdown>
                            </div>
                            <div className="h-20"></div>
                        </div>
                        <div className="absolute bottom-8 right-8">
                            <button 
                                onClick={() => onGoToNote(linkedNote.id)}
                                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-full font-bold shadow-lg backdrop-blur-md transition-all active:scale-95"
                            >
                                <Icons.Pen className="w-4 h-4" />
                                <span>Edit in Notebook</span>
                                <Icons.ExternalLink className="w-4 h-4 opacity-70" />
                            </button>
                        </div>
                    </>
                )
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-white/10 rounded-full flex items-center justify-center mb-4 text-gray-400">
                        <Icons.Link className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-lg dark:text-white text-gray-800">No Linked Note</h3>
                    <button
                        onClick={onSave}
                        className="mt-6 px-5 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-white/20 font-bold text-sm hover:border-blue-500 hover:text-blue-500 transition-colors"
                    >
                        + Create & Link Note
                    </button>
                    <p className="mt-3 text-xs text-gray-400 max-w-xs">
                        点击后将自动创建笔记并插入错题引用链接
                    </p>
                </div>
            )}
        </motion.div> 

      </div>
    </motion.div>
  );
};

export default MistakeWorkstation;