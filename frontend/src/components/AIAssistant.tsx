import { useState, useRef, useEffect } from "react";
import axios from "axios";

// 定义消息接口
interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

// 定义 Icon 组件类型
interface IconProps {
  className?: string;
}

// 定义组件 props 类型
interface AIAssistantProps {
  isOpen: boolean;
  context?: any;
}

const Icons: Record<string, React.FC<IconProps>> = {
  Sparkles: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
  Send: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /><path d="M0 0h24v24H0z" fill="none" /></svg>,
  User: ({className}) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>,
};

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, context = null }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: '你好！我是你的 AI 笔记助手。有什么可以帮助你的吗？'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim()
    };

    // 添加用户消息
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // 调用后端API
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:8000/api/ai/chat', {
        message: userMessage.content,
        context: context, // 传递当前笔记上下文
        history: messages.slice(-5).map(m => ({ // 只发送最近5条消息作为上下文
          role: m.role,
          content: m.content
        }))
      }, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });

      // 添加AI回复
      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.reply
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);

      // 添加错误消息
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '抱歉，我遇到了一些问题。请稍后再试。'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className={`
        h-full flex flex-col shrink-0 overflow-hidden
        transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
        ${isOpen ? 'w-80 opacity-100 ml-6 translate-x-0' : 'w-0 opacity-0 ml-0 translate-x-10'}
      `}
    >
      <div className="w-80 h-full flex flex-col
                      bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-2xl
                      border border-white/40 dark:border-white/10
                      rounded-3xl shadow-xl overflow-hidden">

        {/* 头部 */}
        <div className="p-5 border-b dark:border-white/10 border-gray-200/50 flex justify-between items-center bg-white/30 dark:bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                  <Icons.Sparkles className="w-4 h-4" />
              </div>
              <div>
                  <h2 className="font-bold text-base dark:text-white text-gray-900">AI 助教</h2>
                  <p className="text-[10px] text-green-500 flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/> Online
                  </p>
              </div>
          </div>
        </div>

        {/* 聊天内容 */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* 头像 */}
                <div className={`w-6 h-6 rounded-full flex-shrink-0 mt-1 ${
                  message.role === 'assistant'
                    ? 'bg-gradient-to-tr from-purple-500 to-pink-500'
                    : 'bg-blue-500'
                }`}>
                  {message.role === 'assistant'
                    ? <Icons.Sparkles className="w-4 h-4 text-white m-1" />
                    : <Icons.User className="w-4 h-4 text-white m-1" />
                  }
                </div>

                {/* 消息气泡 */}
                <div className={`max-w-[200px] p-3 rounded-2xl text-sm leading-relaxed shadow-sm border ${
                  message.role === 'assistant'
                    ? 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-200 rounded-tl-none border-gray-100 dark:border-white/5'
                    : 'bg-blue-500 text-white rounded-tr-none border-blue-600'
                }`}>
                  {message.content}
                </div>
              </div>
            ))}

            {/* 加载动画 */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex-shrink-0 mt-1">
                  <Icons.Sparkles className="w-4 h-4 text-white m-1" />
                </div>
                <div className="bg-white dark:bg-white/10 p-3 rounded-2xl rounded-tl-none text-sm dark:text-gray-200 text-gray-700 shadow-sm border border-gray-100 dark:border-white/5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 底部输入 */}
        <div className="p-4 bg-white/40 dark:bg-black/20 backdrop-blur-md shrink-0">
            <div className="relative">
                <input
                  type="text"
                  placeholder="Ask anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 dark:text-white text-gray-900 transition shadow-sm text-sm disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="absolute right-2 top-2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition shadow-lg shadow-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Icons.Send className="w-3 h-3" />
                </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              AI回复基于本地规则引擎
            </p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
