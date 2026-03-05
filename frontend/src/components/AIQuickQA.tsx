import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useToast } from "../context/ToastContext";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

// 定义 QAItem 接口
interface QAItem {
  id: number;
  question: string;
  answer: string;
  loading?: boolean;
  error?: boolean;
  worthCard?: boolean;
  showSaveButtons?: boolean;
  noteId?: string;
  cardId?: string;
  timestamp: string;
}

// 定义 Icon 组件类型
interface IconProps {
  className?: string;
}

const Icons: Record<string, React.FC<IconProps>> = {
  Sparkles: ({ className }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5z" clipRule="evenodd" /></svg>,
  Send: ({ className }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>,
  Check: ({ className }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>,
  FileText: ({ className }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" /><path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375h1.875a5.23 5.23 0 013.434 1.279c.676-1.516 1.091-3.26 1.091-5.25 0-4.462-3.243-8.161-7.5-8.876V1.5c0 .621-.504 1.125-1.125 1.125h-.979z" /></svg>,
  Stop: ({ className }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" /></svg>,
  Trash: ({ className }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M16.5 4.478v.223a3.75 3.75 0 01-3.75 3.75h-1.5a3.75 3.75 0 01-3.75-3.75V4.478c-.926.05-1.845.175-2.71.437-1.24.376-2.236 1.253-2.791 2.426A9.868 9.868 0 003 10.5c0 4.427 2.693 8.195 6.593 9.785a10.078 10.078 0 004.814 0c3.9-1.59 6.593-5.358 6.593-9.785 0-1.285-.273-2.506-.757-3.604-.556-1.173-1.552-2.05-2.791-2.426a14.373 14.373 0 00-2.71-.437zM9 6a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 019 6zm4.5 0a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0113.5 6z" clipRule="evenodd" /></svg>,
};

const AIQuickQA = () => {
  const [questions, setQuestions] = useState<QAItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('deepseek');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // 历史记录最大数量
  const MAX_HISTORY = 50;

  // 从 localStorage 加载历史记录
  useEffect(() => {
    const savedHistory = localStorage.getItem('ai_qa_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory) as QAItem[];
        // 只加载最近 MAX_HISTORY 条
        const limited = parsed.slice(-MAX_HISTORY);
        setQuestions(limited);
        console.log('[AI QA] 已加载历史记录:', limited.length, '条');
      } catch (e) {
        console.error('[AI QA] 加载历史记录失败:', e);
      }
    }
  }, []);

  // 保存历史记录到 localStorage
  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem('ai_qa_history', JSON.stringify(questions));
    }
  }, [questions]);

  // 添加新问答时限制历史记录数量
  const addQuestion = (newQuestion: QAItem) => {
    setQuestions(prev => {
      const updated = [...prev, newQuestion];
      // 超过限制时，删除最旧的记录
      if (updated.length > MAX_HISTORY) {
        const trimmed = updated.slice(-MAX_HISTORY);
        console.log('[AI QA] 历史记录超限，删除最旧的', updated.length - MAX_HISTORY, '条');
        return trimmed;
      }
      return updated;
    });
  };

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [questions]);

  // 流式问答
  const askQuestion = async () => {
    if (!currentQuestion.trim() || loading) return;

    const questionText = currentQuestion.trim();
    setCurrentQuestion('');
    setLoading(true);

    // 创建临时问答项
    const tempId = Date.now();
    const tempQaItem: QAItem = {
      id: tempId,
      question: questionText,
      answer: '',
      loading: true,
      timestamp: new Date().toISOString()
    };

    addQuestion(tempQaItem);

    try {
      console.log('[AI QA] 发送请求:', { question: questionText, model: selectedModel });

      // 使用 fetch API 获取流式响应
      const response = await fetch(
        `http://localhost:8000/api/ai/quick-qa-stream?question=${encodeURIComponent(questionText)}&model=${selectedModel}`
      );

      console.log('[AI QA] 响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI QA] API错误响应:', errorText);
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let fullAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullAnswer += chunk;

        // 更新回答内容
        setQuestions(prev => prev.map(qa => {
          if (qa.id === tempId) {
            return { ...qa, answer: fullAnswer };
          }
          return qa;
        }));
      }

      console.log('[AI QA] 完整回答:', fullAnswer.substring(0, 100) + '...');

      // 完成后检查是否值得制卡
      const worthCard = fullAnswer.includes('[值得制卡]') && !fullAnswer.includes('[不值得制卡]');
      const cleanAnswer = fullAnswer
        .replace(/\[值得制卡\]/g, '')
        .replace(/\[不值得制卡\]/g, '')
        .trim();

      setQuestions(prev => prev.map(qa => {
        if (qa.id === tempId) {
          return {
            ...qa,
            answer: cleanAnswer,
            loading: false,
            worthCard, // AI判断是否值得制卡
            showSaveButtons: true
          };
        }
        return qa;
      }));

    } catch (error) {
      console.error('[AI QA] 请求失败:', error);

      const errorMessage = error instanceof Error ? error.message : '未知错误';

      setQuestions(prev => prev.map(qa => {
        if (qa.id === tempId) {
          return {
            ...qa,
            answer: `❌ 请求失败\n\n错误信息: ${errorMessage}\n\n请检查：\n1. 后端服务是否运行\n2. AI API配置是否正确\n3. 网络连接是否正常`,
            loading: false,
            error: true
          };
        }
        return qa;
      }));

      toast.error(`问答失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  // 清空历史记录
  const clearHistory = () => {
    if (questions.length === 0) {
      toast.info('历史记录为空');
      return;
    }
    if (confirm(`确定要清空 ${questions.length} 条历史记录吗？`)) {
      setQuestions([]);
      localStorage.removeItem('ai_qa_history');
      toast.success('✅ 历史记录已清空');
    }
  };

  // 保存为笔记
  const saveAsNote = async (qaItem: QAItem) => {
    try {
      const response = await axios.post('http://localhost:8000/api/ai/save-note', {
        question: qaItem.question,
        answer: qaItem.answer
      });

      setQuestions(prev => prev.map(qa => {
        if (qa.id === qaItem.id) {
          return {
            ...qa,
            noteId: response.data.note_id,
            showSaveButtons: false
          };
        }
        return qa;
      }));

      toast.success('✅ 已保存到笔记');
    } catch (error) {
      toast.error('❌ 保存失败');
    }
  };

  // 保存为记忆卡
  const saveAsCard = async (qaItem: QAItem) => {
    try {
      const response = await axios.post('http://localhost:8000/api/ai/save-card', {
        question: qaItem.question,
        answer: qaItem.answer
      });

      setQuestions(prev => prev.map(qa => {
        if (qa.id === qaItem.id) {
          return {
            ...qa,
            cardId: response.data.card_id,
            showSaveButtons: false
          };
        }
        return qa;
      }));

      toast.success('✅ 已生成记忆卡');
    } catch (error) {
      toast.error('❌ 生成失败');
    }
  };

  const viewNote = (noteId?: string) => {
    if (noteId) {
      window.open(`/notes?open=${noteId}`, '_blank');
    } else {
      toast.info('未保存到笔记');
    }
  };

  const viewCard = (cardId?: string) => {
    if (cardId) {
      window.open(`/anki?review=${cardId}`, '_blank');
    } else {
      toast.info('未生成记忆卡');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
            <Icons.Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wider">
              AI 问答
            </span>
            {questions.length > 0 && (
              <span className="text-[9px] text-gray-400 dark:text-gray-500">
                {questions.length} 条记录
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 清空按钮 */}
          {questions.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
              title="清空历史记录"
            >
              <Icons.Trash className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 模型选择器 */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="text-[10px] bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500/50 dark:text-white text-gray-900"
          >
            <option value="ollama">Ollama</option>
            <option value="deepseek">DeepSeek</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar mb-3 min-h-0">
        {questions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            <div className="text-center">
              <Icons.Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">向 AI 提问</p>
              <p className="text-[10px] mt-1 opacity-70">支持 Markdown 和 LaTeX</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((qa) => (
              <div
                key={qa.id}
                className={`bg-white/60 dark:bg-white/5 backdrop-blur-sm border rounded-lg p-3 transition-all ${
                  qa.error ? 'border-red-200/50 dark:border-red-500/20' : 'border-gray-200/50 dark:border-white/10'
                }`}
              >
                {/* Question */}
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-200 mb-2">
                  {qa.question}
                </div>

                {/* Answer - Markdown渲染 */}
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2 prose prose-sm dark:prose-invert max-w-none">
                  {qa.loading ? (
                    <span className="opacity-50">思考中...</span>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeKatex, rehypeRaw]}
                    >
                      {qa.answer}
                    </ReactMarkdown>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-400">
                    {new Date(qa.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>

                  <div className="flex items-center gap-1">
                    {/* AI建议制卡提示 */}
                    {qa.worthCard && !qa.showSaveButtons && !qa.noteId && !qa.cardId && (
                      <span className="text-[9px] text-green-600 dark:text-green-400 mr-2">
                        💡 AI建议制卡
                      </span>
                    )}

                    {/* 保存按钮 */}
                    {qa.showSaveButtons && !qa.loading && !qa.error && (
                      <>
                        <button
                          onClick={() => saveAsNote(qa)}
                          className="text-[9px] px-2 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                        >
                          <Icons.FileText className="w-3 h-3" />
                          笔记
                        </button>
                        <button
                          onClick={() => saveAsCard(qa)}
                          className={`text-[9px] px-2 py-0.5 rounded hover:bg-opacity-80 transition-colors flex items-center gap-1 ${
                            qa.worthCard
                              ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30'
                              : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30'
                          }`}
                        >
                          <Icons.Check className="w-3 h-3" />
                          {qa.worthCard ? '推荐制卡' : '制卡'}
                        </button>
                      </>
                    )}

                    {/* 已保存的快捷链接 */}
                    {qa.noteId && !qa.showSaveButtons && (
                      <button
                        onClick={() => viewNote(qa.noteId)}
                        className="text-[9px] text-green-600 dark:text-green-400 hover:text-green-700 transition-colors flex items-center gap-1"
                      >
                        ✓ 已保存
                      </button>
                    )}
                    {qa.cardId && !qa.showSaveButtons && (
                      <button
                        onClick={() => viewCard(qa.cardId)}
                        className="text-[9px] text-green-600 dark:text-green-400 hover:text-green-700 transition-colors flex items-center gap-1"
                      >
                        ✓ 已制卡
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="relative">
        <textarea
          placeholder="向 AI 提问... 支持 Markdown 和 LaTeX (Enter 发送)"
          value={currentQuestion}
          onChange={(e) => setCurrentQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          rows={2}
          className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 dark:text-white text-gray-900 transition shadow-sm text-sm disabled:opacity-50 resize-none"
        />
        <button
          onClick={askQuestion}
          disabled={loading || !currentQuestion.trim()}
          className="absolute right-2 bottom-2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition shadow-lg shadow-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Icons.Stop className="w-3 h-3" />
          ) : (
            <Icons.Send className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  );
};

export default AIQuickQA;
