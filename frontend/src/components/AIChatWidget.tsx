import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface StoredMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
}

const MAX_HISTORY_MESSAGES = 50;

const createWelcomeMessage = (): Message => ({
  id: 'welcome',
  type: 'ai',
  content: '你好！我是 Wilson，你的 AI 助手。有什么我可以帮你的吗？',
  timestamp: new Date(),
});

const getHistoryStorageKey = (userId: string | undefined) =>
  userId ? `vibelife_ai_chat_history:${userId}` : null;

const parseStoredMessages = (raw: string | null): Message[] => {
  if (!raw) {
    return [createWelcomeMessage()];
  }

  try {
    const parsed = JSON.parse(raw) as StoredMessage[];
    const messages = parsed
      .filter(
        (message) =>
          message &&
          (message.type === 'user' || message.type === 'ai') &&
          typeof message.content === 'string' &&
          message.content.trim().length > 0 &&
          typeof message.timestamp === 'string'
      )
      .map((message) => ({
        ...message,
        timestamp: new Date(message.timestamp),
      }))
      .filter((message) => !Number.isNaN(message.timestamp.getTime()));

    return messages.length > 0 ? messages.slice(-MAX_HISTORY_MESSAGES) : [createWelcomeMessage()];
  } catch (error) {
    console.error('Failed to parse AI chat history:', error);
    return [createWelcomeMessage()];
  }
};

const AIChatWidget: React.FC = () => {
  const { token, user, loading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isDockHovered, setIsDockHovered] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [createWelcomeMessage()]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const chatCanvasRef = useRef<HTMLDivElement>(null);
  const loadedHistoryKeyRef = useRef<string | null>(null);
  const shouldShowDock = isDockHovered || isOpen;
  const historyStorageKey = getHistoryStorageKey(user?.id);

  useEffect(() => {
    if (!historyStorageKey) {
      setMessages([createWelcomeMessage()]);
      setHasLoadedHistory(false);
      loadedHistoryKeyRef.current = null;
      return;
    }

    setMessages(parseStoredMessages(localStorage.getItem(historyStorageKey)));
    loadedHistoryKeyRef.current = historyStorageKey;
    setHasLoadedHistory(true);
  }, [historyStorageKey]);

  useEffect(() => {
    if (!historyStorageKey || !hasLoadedHistory || loadedHistoryKeyRef.current !== historyStorageKey) {
      return;
    }

    const serialized: StoredMessage[] = messages.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    }));
    localStorage.setItem(historyStorageKey, JSON.stringify(serialized));
  }, [hasLoadedHistory, historyStorageKey, messages]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!shouldShowDock || isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (dockRef.current && target && !dockRef.current.contains(target)) {
        setIsDockHovered(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [shouldShowDock, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || !chatCanvasRef.current || !chatCanvasRef.current.contains(target)) {
        return;
      }

      const elementTarget = target instanceof Element ? target : null;
      if (elementTarget?.closest('[data-chat-item="true"]')) {
        return;
      }

      setIsOpen(false);
      setIsDockHovered(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping || loading) return;

    if (!token) {
      logout();
      return;
    }

    const userInput = inputValue.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage].slice(-MAX_HISTORY_MESSAGES));
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch(`${window.__VIBELIFE_API_ORIGIN__}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userInput,
          provider: 'openclaw',
          history: [...messages, userMessage].slice(-10).map((message) => ({
            role: message.type === 'ai' ? 'assistant' : 'user',
            content: message.content,
          })),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          return;
        }
        throw new Error(payload?.detail || 'AI 请求失败');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content:
          typeof payload?.reply === 'string' && payload.reply.trim()
            ? payload.reply
            : '我这次没有拿到可用回复。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage].slice(-MAX_HISTORY_MESSAGES));
      window.dispatchEvent(new Event('workbench-todos-refresh'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const failureMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `抱歉，这次没有连上 AI：${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [
        ...prev,
        failureMessage,
      ].slice(-MAX_HISTORY_MESSAGES));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsDockHovered(false);
  };

  const openChat = () => {
    setIsOpen(true);
    setIsDockHovered(true);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[92] bg-black/15 backdrop-blur-[2px]"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-36 z-[93] w-[min(92vw,840px)] h-[min(58vh,620px)] pointer-events-none"
            style={{ left: 'calc((100vw - min(92vw, 840px)) / 2 - 8px)' }}
          >
            <div ref={chatCanvasRef} className="h-full flex flex-col pointer-events-auto">
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col justify-end">
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        layout
                        initial={{ opacity: 0, y: 26, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          data-chat-item="true"
                          className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg ${
                            message.type === 'user'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.type === 'user' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    ))}

                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-start"
                      >
                        <div data-chat-item="true" className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-lg">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 w-full h-40 z-[95] flex justify-center pointer-events-none">
        <button
          type="button"
          aria-label="展开 AI 输入栏"
          className="absolute inset-x-0 bottom-0 h-10 pointer-events-auto"
          onMouseEnter={() => setIsDockHovered(true)}
          onMouseLeave={() => {
            if (!isOpen) {
              setIsDockHovered(false);
            }
          }}
        />

        <AnimatePresence>
          {shouldShowDock && (
            <motion.div
              ref={dockRef}
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 25 }}
              className="absolute bottom-5 w-[min(92vw,840px)] h-20 dark:bg-black/80 bg-white/90 backdrop-blur-2xl border dark:border-white/10 border-white/40 dark:text-white text-gray-800 rounded-full shadow-2xl pointer-events-auto"
              style={{ left: 'calc((100vw - min(92vw, 840px)) / 2)' }}
              onClick={() => {
                if (!isOpen) {
                  openChat();
                }
              }}
              onMouseEnter={() => setIsDockHovered(true)}
              onMouseLeave={() => {
                if (!isOpen) {
                  setIsDockHovered(false);
                }
              }}
            >
              <div className="h-full px-7 md:px-10 flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onClick={openChat}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isOpen ? '输入消息，回车发送...' : '和 Wilson 聊聊...'}
                  className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />

                {isOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 rounded-full dark:bg-white/10 bg-black/5 hover:dark:bg-white/20 hover:bg-black/10 dark:text-white text-gray-700 transition-colors text-sm"
                    >
                      收起
                    </button>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isTyping || loading}
                      className="px-5 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      发送
                    </button>
                  </>
                ) : (
                  <div className="text-xs font-semibold uppercase tracking-widest opacity-45">AI</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default AIChatWidget;
