import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: '你好！我是 Wilson，你的 AI 助手。有什么我可以帮你的吗？',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    // 模拟 AI 响应
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: getAIResponse(userInput),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const getAIResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('你好') || lowerInput.includes('hi') || lowerInput.includes('hello')) {
      return '你好！今天想做什么呢？我可以帮你写笔记、查日程，或者聊聊项目进展。';
    }
    
    if (lowerInput.includes('日程') || lowerInput.includes('计划')) {
      return '你今天有 3 个任务：完成 FlowStudy 的报告、审查代码、部署 VibeLife。要查看详细日程吗？';
    }
    
    if (lowerInput.includes('项目')) {
      return '你现在有 2 个活跃项目：ResoMate（AI 社区平台）和 VibeLife（个人工作台）。需要我详细介绍吗？';
    }
    
    if (lowerInput.includes('笔记')) {
      return '你今天还没有写笔记。要不要记录一下今天的工作？';
    }
    
    if (lowerInput.includes('帮助') || lowerInput.includes('help')) {
      return '我可以帮你：\n1. 管理日程和任务\n2. 写笔记和日志\n3. 查看项目进度\n4. 生成工作报告\n有什么需要的吗？';
    }
    
    return '我明白了。让我想想...如果你需要更详细的帮助，可以告诉我具体想做什么，我会尽力帮你！';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsHovering(false);
  };

  return (
    <>
      {/* 毛玻璃遮罩 */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md transition-opacity duration-300"
          onClick={handleClose}
        />
      )}

      {/* 聊天窗口 */}
      <div 
        className={`
          fixed bottom-0 left-0 right-0 z-50
          transition-all duration-300 ease-out
          ${isOpen ? 'h-screen' : 'h-16'}
        `}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => !isOpen && setIsHovering(false)}
      >
        {/* 未激活状态：输入框 */}
        {!isOpen && (
          <div 
            className={`
              h-full backdrop-blur-md bg-white/80 dark:bg-gray-800/80 
              border-t border-gray-200 dark:border-gray-700
              transition-all duration-300
              ${isHovering ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <div className="h-full flex items-center px-6">
              <input
                onClick={() => setIsOpen(true)}
                placeholder="和 Wilson 聊聊..."
                className="w-full px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 
                         text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                readOnly
              />
            </div>
          </div>
        )}

        {/* 激活状态：全屏聊天窗口 */}
        {isOpen && (
          <div className="h-full flex flex-col bg-transparent">
            {/* 顶部导航栏 */}
            <div className="h-16 backdrop-blur-md bg-white/80 dark:bg-gray-800/80 
                          border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 
                              flex items-center justify-center">
                  <span className="text-white text-xl">🐺</span>
                </div>
                <div>
                  <h3 className="font-semibold dark:text-white text-gray-900">Wilson</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">AI 助手</p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 消息区域（透明背景） */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} 
                            animate-slideUp`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div
                    className={`
                      max-w-[70%] rounded-2xl px-4 py-3 shadow-lg
                      ${message.type === 'user'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                      }
                    `}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start animate-slideUp">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* 底部输入区域 */}
            <div className="h-16 backdrop-blur-md bg-white/80 dark:bg-gray-800/80 
                          border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 px-6">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
                className="flex-1 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 
                         text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="p-2 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>


    </>
  );
};

export default AIChatWidget;
