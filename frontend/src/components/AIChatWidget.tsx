import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
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

const buildMarkdownComponents = (isUser: boolean): Components => {
  const heading = isUser ? 'text-white' : 'text-gray-900 dark:text-white';
  const body = isUser ? 'text-white/95' : 'text-gray-800 dark:text-gray-100';
  const muted = isUser ? 'text-white/80' : 'text-gray-600 dark:text-gray-300';
  const border = isUser ? 'border-white/15' : 'border-gray-200/80 dark:border-white/10';
  const inlineCode = isUser
    ? 'bg-black/20 text-white'
    : 'bg-gray-100 dark:bg-white/10 text-indigo-700 dark:text-indigo-200';
  const blockCode = isUser
    ? 'bg-black/25 text-white'
    : 'bg-[#111827] text-gray-100 dark:bg-black/40 dark:text-gray-100';
  const link = isUser ? 'text-white underline decoration-white/40' : 'text-indigo-600 dark:text-indigo-300 underline';

  return {
    h1: ({ node, ...props }) => <h1 className={`mb-3 text-xl font-semibold ${heading}`} {...props} />,
    h2: ({ node, ...props }) => <h2 className={`mb-3 text-lg font-semibold ${heading}`} {...props} />,
    h3: ({ node, ...props }) => <h3 className={`mb-2 text-base font-semibold ${heading}`} {...props} />,
    p: ({ node, ...props }) => <p className={`mb-3 last:mb-0 leading-7 ${body}`} {...props} />,
    ul: ({ node, ...props }) => <ul className={`mb-3 list-disc space-y-1 pl-5 ${body}`} {...props} />,
    ol: ({ node, ...props }) => <ol className={`mb-3 list-decimal space-y-1 pl-5 ${body}`} {...props} />,
    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
    strong: ({ node, ...props }) => <strong className={`font-semibold ${heading}`} {...props} />,
    em: ({ node, ...props }) => <em className={`italic ${muted}`} {...props} />,
    a: ({ node, ...props }) => <a className={link} target="_blank" rel="noreferrer" {...props} />,
    blockquote: ({ node, ...props }) => (
      <blockquote className={`mb-3 border-l-2 ${border} pl-4 italic ${muted}`} {...props} />
    ),
    hr: ({ node, ...props }) => <hr className={`my-4 ${border}`} {...props} />,
    img: ({ node, ...props }) => (
      <img className={`my-3 max-h-72 rounded-2xl border ${border} object-contain`} {...props} />
    ),
    pre: ({ node, ...props }) => <pre className="mb-3 overflow-x-auto" {...props} />,
    code: ({ node, className, children, ...props }) => {
      const isBlock = typeof className === 'string' && className.length > 0;
      return isBlock ? (
        <code className={`block overflow-x-auto rounded-2xl px-4 py-3 text-sm leading-6 ${blockCode}`} {...props}>
          {children}
        </code>
      ) : (
        <code className={`rounded px-1.5 py-0.5 text-[0.92em] ${inlineCode}`} {...props}>
          {children}
        </code>
      );
    },
    table: ({ node, ...props }) => (
      <div className={`mb-3 overflow-x-auto rounded-2xl border ${border}`}>
        <table className="min-w-full text-sm" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => <thead className={isUser ? 'bg-black/10' : 'bg-black/5 dark:bg-white/5'} {...props} />,
    th: ({ node, ...props }) => <th className={`px-3 py-2 text-left font-semibold ${heading}`} {...props} />,
    td: ({ node, ...props }) => <td className={`px-3 py-2 align-top ${body}`} {...props} />,
  };
};

const MarkdownBubble = ({ content, isUser }: { content: string; isUser: boolean }) => (
  <div className="text-sm">
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={buildMarkdownComponents(isUser)}
    >
      {content}
    </ReactMarkdown>
  </div>
);

const PagingIcons = {
  Up: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Down: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
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
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const chatCanvasRef = useRef<HTMLDivElement>(null);
  const loadedHistoryKeyRef = useRef<string | null>(null);
  const [canPageUp, setCanPageUp] = useState(false);
  const [canPageDown, setCanPageDown] = useState(false);
  const shouldShowDock = isDockHovered || isOpen;
  const historyStorageKey = getHistoryStorageKey(user?.id);

  const syncPagerState = () => {
    const viewport = messagesViewportRef.current;
    if (!viewport) {
      setCanPageUp(false);
      setCanPageDown(false);
      return;
    }

    setCanPageUp(viewport.scrollTop > 8);
    setCanPageDown(viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 8);
  };

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
    requestAnimationFrame(syncPagerState);
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const viewport = messagesViewportRef.current;
    if (!viewport) {
      return;
    }

    const handleScroll = () => {
      syncPagerState();
    };

    syncPagerState();
    viewport.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      viewport.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, messages.length]);

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

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    if (target.closest('[data-chat-item="true"]') || target.closest('[data-chat-action="true"]')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    handleClose();
  };

  const scrollMessagesPage = (direction: 'up' | 'down') => {
    const viewport = messagesViewportRef.current;
    if (!viewport) {
      return;
    }

    const delta = viewport.clientHeight * 0.82;
    viewport.scrollBy({
      top: direction === 'up' ? -delta : delta,
      behavior: 'smooth',
    });
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
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleClose();
            }}
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
            className="fixed inset-x-0 top-3 bottom-28 z-[93] flex justify-center px-3 md:top-4 md:bottom-32 md:px-6"
          >
            <div
              ref={chatCanvasRef}
              data-chat-control="true"
              className="relative h-full w-full max-w-5xl"
              onPointerDownCapture={handleCanvasPointerDown}
            >
              <div
                data-chat-action="true"
                className="absolute right-0 top-4 z-10 flex pointer-events-auto flex-col gap-2 pr-1 md:right-2"
              >
                <button
                  type="button"
                  onClick={() => scrollMessagesPage('up')}
                  disabled={!canPageUp}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <PagingIcons.Up />
                </button>
                <button
                  type="button"
                  onClick={() => scrollMessagesPage('down')}
                  disabled={!canPageDown}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <PagingIcons.Down />
                </button>
              </div>

              <div
                ref={messagesViewportRef}
                data-chat-control="true"
                className="h-full overflow-y-auto overscroll-contain px-1 pb-5 pr-14 pt-2 md:px-3 md:pb-6 md:pr-16 md:pt-3"
              >
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
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
                          className={`max-w-[min(84vw,760px)] rounded-[28px] px-4 py-3 shadow-2xl md:px-5 md:py-4 ${
                            message.type === 'user'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                          }`}
                        >
                          <MarkdownBubble content={message.content} isUser={message.type === 'user'} />
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
                        <div data-chat-item="true" className="rounded-[28px] bg-white px-4 py-3 shadow-2xl dark:bg-gray-800">
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
