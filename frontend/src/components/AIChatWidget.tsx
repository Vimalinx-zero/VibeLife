import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dispatchWorkbenchAiRefresh } from '../utils/workbenchTodoEvents';

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

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

interface StoredChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
}

interface StoredChatState {
  version: 2;
  activeSessionId: string;
  sessions: StoredChatSession[];
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string;
}

const MAX_HISTORY_MESSAGES = 50;
const MAX_SESSION_TITLE_LENGTH = 18;
const MAX_PROMPT_TOOLTIP_LENGTH = 40;

const createWelcomeMessage = (): Message => ({
  id: 'welcome',
  type: 'ai',
  content: '你好！我是你的 AI 助手。有什么我可以帮你的吗？',
  timestamp: new Date(),
});

const getHistoryStorageKey = (userId: string | undefined) =>
  userId ? `vibelife_ai_chat_history:${userId}` : null;

const createChatId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const summarizeText = (value: string, maxLength: number) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '空白问题';
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const formatSessionFallbackTitle = (index: number) => `新会话 ${String(index).padStart(2, '0')}`;

const getPromptMessages = (session: ChatSession) =>
  session.messages.filter((message) => message.type === 'user' && message.content.trim().length > 0);

const formatSessionUpdatedAt = (timestamp: Date) =>
  timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

const parseStoredMessages = (value: unknown): Message[] => {
  if (!Array.isArray(value)) {
    return [createWelcomeMessage()];
  }

  const messages = value
    .filter(
      (message): message is StoredMessage =>
        !!message &&
        typeof message === 'object' &&
        'type' in message &&
        'content' in message &&
        'timestamp' in message &&
        (message.type === 'user' || message.type === 'ai') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0 &&
        typeof message.timestamp === 'string'
    )
    .map((message) => ({
      id: typeof message.id === 'string' && message.id ? message.id : createChatId('msg'),
      type: message.type,
      content: message.content,
      timestamp: new Date(message.timestamp),
    }))
    .filter((message) => !Number.isNaN(message.timestamp.getTime()));

  return messages.length > 0 ? messages.slice(-MAX_HISTORY_MESSAGES) : [createWelcomeMessage()];
};

const buildSessionTitle = (messages: Message[], fallbackTitle: string) => {
  const firstUserMessage = messages.find((message) => message.type === 'user' && message.content.trim().length > 0);
  return firstUserMessage ? summarizeText(firstUserMessage.content, MAX_SESSION_TITLE_LENGTH) : fallbackTitle;
};

const createSession = (
  index: number,
  overrides: Partial<Pick<ChatSession, 'id' | 'title' | 'createdAt' | 'updatedAt' | 'messages'>> = {}
): ChatSession => {
  const createdAt = overrides.createdAt ?? new Date();
  const messages =
    overrides.messages && overrides.messages.length > 0
      ? overrides.messages.slice(-MAX_HISTORY_MESSAGES)
      : [createWelcomeMessage()];
  const updatedAt = overrides.updatedAt ?? messages[messages.length - 1]?.timestamp ?? createdAt;
  const fallbackTitle = overrides.title?.trim() || formatSessionFallbackTitle(index);

  return {
    id: overrides.id ?? createChatId('session'),
    title: buildSessionTitle(messages, fallbackTitle),
    createdAt,
    updatedAt,
    messages,
  };
};

const createDefaultChatState = (): ChatState => {
  const initialSession = createSession(1);
  return {
    sessions: [initialSession],
    activeSessionId: initialSession.id,
  };
};

const parseStoredChatState = (raw: string | null): ChatState => {
  if (!raw) {
    return createDefaultChatState();
  }

  try {
    const parsed = JSON.parse(raw) as StoredChatState | StoredMessage[];

    if (Array.isArray(parsed)) {
      const messages = parseStoredMessages(parsed);
      const migratedSession = createSession(1, {
        messages,
        createdAt: messages[0]?.timestamp ?? new Date(),
        updatedAt: messages[messages.length - 1]?.timestamp ?? new Date(),
      });

      return {
        sessions: [migratedSession],
        activeSessionId: migratedSession.id,
      };
    }

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sessions)) {
      return createDefaultChatState();
    }

    const sessions = parsed.sessions
      .map((session, index) => {
        if (!session || typeof session !== 'object') {
          return null;
        }

        const messages = parseStoredMessages(session.messages);
        const createdAt = new Date(session.createdAt);
        const updatedAt = new Date(session.updatedAt);

        return createSession(index + 1, {
          id: typeof session.id === 'string' && session.id ? session.id : createChatId('session'),
          title: typeof session.title === 'string' ? session.title : '',
          createdAt: Number.isNaN(createdAt.getTime()) ? messages[0]?.timestamp ?? new Date() : createdAt,
          updatedAt: Number.isNaN(updatedAt.getTime()) ? messages[messages.length - 1]?.timestamp ?? new Date() : updatedAt,
          messages,
        });
      })
      .filter((session): session is ChatSession => session !== null);

    if (sessions.length === 0) {
      return createDefaultChatState();
    }

    const activeSessionId =
      typeof parsed.activeSessionId === 'string' && sessions.some((session) => session.id === parsed.activeSessionId)
        ? parsed.activeSessionId
        : sessions[0].id;

    return {
      sessions,
      activeSessionId,
    };
  } catch (error) {
    console.error('Failed to parse AI chat history:', error);
    return createDefaultChatState();
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
  const toast = useToast();
  const [chatState, setChatState] = useState<ChatState>(() => createDefaultChatState());
  const [isOpen, setIsOpen] = useState(false);
  const [isDockHovered, setIsDockHovered] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [typingSessionId, setTypingSessionId] = useState<string | null>(null);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [isSessionRailVisible, setIsSessionRailVisible] = useState(false);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isOpenRef = useRef(isOpen);
  const dockRef = useRef<HTMLDivElement>(null);
  const chatCanvasRef = useRef<HTMLDivElement>(null);
  const promptMessageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const loadedHistoryKeyRef = useRef<string | null>(null);
  const hideSessionRailTimeoutRef = useRef<number | null>(null);
  const [canPageUp, setCanPageUp] = useState(false);
  const [canPageDown, setCanPageDown] = useState(false);
  const shouldShowDock = isDockHovered || isOpen;
  const historyStorageKey = getHistoryStorageKey(user?.id);
  const activeSession = chatState.sessions.find((session) => session.id === chatState.activeSessionId) ?? chatState.sessions[0];
  const activeSessionId = activeSession?.id ?? chatState.activeSessionId;
  const messages = activeSession?.messages ?? [createWelcomeMessage()];
  const activePromptMessages = activeSession ? getPromptMessages(activeSession) : [];
  const isTypingCurrentSession = typingSessionId === activeSessionId;
  const orderedSessions = [...chatState.sessions].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

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

  const clearSessionRailHideTimeout = () => {
    if (hideSessionRailTimeoutRef.current !== null) {
      window.clearTimeout(hideSessionRailTimeoutRef.current);
      hideSessionRailTimeoutRef.current = null;
    }
  };

  const showSessionRail = () => {
    clearSessionRailHideTimeout();
    setIsSessionRailVisible(true);
  };

  const scheduleSessionRailHide = () => {
    clearSessionRailHideTimeout();
    hideSessionRailTimeoutRef.current = window.setTimeout(() => {
      setIsSessionRailVisible(false);
      hideSessionRailTimeoutRef.current = null;
    }, 70);
  };

  const updateSessionMessages = (sessionId: string, nextMessages: Message[], updatedAt: Date) => {
    setChatState((previousState) => ({
      ...previousState,
      sessions: previousState.sessions.map((session, index) =>
        session.id === sessionId
          ? {
              ...session,
              title: buildSessionTitle(nextMessages, formatSessionFallbackTitle(index + 1)),
              updatedAt,
              messages: nextMessages,
            }
          : session
      ),
    }));
  };

  const setPromptMessageRef = (messageId: string, element: HTMLDivElement | null) => {
    if (element) {
      promptMessageRefs.current[messageId] = element;
      return;
    }

    delete promptMessageRefs.current[messageId];
  };

  const syncActivePromptFromViewport = () => {
    const viewport = messagesViewportRef.current;
    if (!viewport || activePromptMessages.length === 0) {
      setActivePromptId(null);
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenter = viewportRect.top + viewportRect.height / 2;
    let nextActivePromptId = activePromptMessages[activePromptMessages.length - 1]?.id ?? null;
    let bestDistance = Number.POSITIVE_INFINITY;

    activePromptMessages.forEach((prompt) => {
      const element = promptMessageRefs.current[prompt.id];
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const messageCenter = rect.top + rect.height / 2;
      const distance = Math.abs(messageCenter - viewportCenter);

      if (distance < bestDistance) {
        bestDistance = distance;
        nextActivePromptId = prompt.id;
      }
    });

    setActivePromptId((currentPromptId) => (currentPromptId === nextActivePromptId ? currentPromptId : nextActivePromptId));
  };

  const scrollToPrompt = (promptId: string) => {
    const element = promptMessageRefs.current[promptId];
    if (!element) {
      return;
    }

    setActivePromptId(promptId);
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  useEffect(() => {
    return () => {
      clearSessionRailHideTimeout();
    };
  }, []);

  useEffect(() => {
    if (!historyStorageKey) {
      setChatState(createDefaultChatState());
      setHasLoadedHistory(false);
      setTypingSessionId(null);
      setIsSessionRailVisible(false);
      loadedHistoryKeyRef.current = null;
      return;
    }

    setChatState(parseStoredChatState(localStorage.getItem(historyStorageKey)));
    loadedHistoryKeyRef.current = historyStorageKey;
    setTypingSessionId(null);
    setIsSessionRailVisible(false);
    setHasLoadedHistory(true);
  }, [historyStorageKey]);

  useEffect(() => {
    if (!historyStorageKey || !hasLoadedHistory || loadedHistoryKeyRef.current !== historyStorageKey) {
      return;
    }

    const serialized: StoredChatState = {
      version: 2,
      activeSessionId,
      sessions: chatState.sessions.map((session) => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        messages: session.messages.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
          ...message,
          timestamp: message.timestamp.toISOString(),
        })),
      })),
    };

    localStorage.setItem(historyStorageKey, JSON.stringify(serialized));
  }, [activeSessionId, chatState.sessions, hasLoadedHistory, historyStorageKey]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    requestAnimationFrame(() => {
      syncPagerState();
      syncActivePromptFromViewport();
    });
  }, [messages]);

  useEffect(() => {
    const validPromptIds = new Set(activePromptMessages.map((message) => message.id));

    Object.keys(promptMessageRefs.current).forEach((messageId) => {
      if (!validPromptIds.has(messageId)) {
        delete promptMessageRefs.current[messageId];
      }
    });

    if (validPromptIds.size === 0) {
      setActivePromptId(null);
      return;
    }

    requestAnimationFrame(syncActivePromptFromViewport);
  }, [activeSessionId, isOpen, messages.length]);

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
      syncActivePromptFromViewport();
    };

    syncPagerState();
    syncActivePromptFromViewport();
    viewport.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      viewport.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, activeSessionId, messages.length]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeSessionId, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      clearSessionRailHideTimeout();
      setIsSessionRailVisible(false);
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
    if (!inputValue.trim() || typingSessionId || loading || !activeSession) return;

    if (!token) {
      logout();
      return;
    }

    const sessionId = activeSession.id;
    const userInput = inputValue.trim();
    const promptSummary = summarizeText(userInput, 20);
    const userMessage: Message = {
      id: createChatId('msg'),
      type: 'user',
      content: userInput,
      timestamp: new Date(),
    };
    const nextMessages = [...messages, userMessage].slice(-MAX_HISTORY_MESSAGES);

    updateSessionMessages(sessionId, nextMessages, userMessage.timestamp);
    setInputValue('');
    setTypingSessionId(sessionId);

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
          history: nextMessages.slice(-10).map((message) => ({
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
        id: createChatId('msg'),
        type: 'ai',
        content:
          typeof payload?.reply === 'string' && payload.reply.trim()
            ? payload.reply
            : '我这次没有拿到可用回复。',
        timestamp: new Date(),
      };
      updateSessionMessages(sessionId, [...nextMessages, aiMessage].slice(-MAX_HISTORY_MESSAGES), aiMessage.timestamp);
      dispatchWorkbenchAiRefresh();

      if (!isOpenRef.current) {
        toast.info(`AI 已在后台回复：${promptSummary}`, 4200);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const failureMessage: Message = {
        id: createChatId('msg'),
        type: 'ai',
        content: `抱歉，这次没有连上 AI：${errorMessage}`,
        timestamp: new Date(),
      };
      updateSessionMessages(sessionId, [...nextMessages, failureMessage].slice(-MAX_HISTORY_MESSAGES), failureMessage.timestamp);

      if (!isOpenRef.current) {
        toast.error(`后台回复失败：${promptSummary}`, 4500);
      }
    } finally {
      setTypingSessionId((currentSessionId) => (currentSessionId === sessionId ? null : currentSessionId));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    clearSessionRailHideTimeout();
    setIsOpen(false);
    setIsDockHovered(false);
    setIsSessionRailVisible(false);
  };

  const openChat = () => {
    setIsOpen(true);
    setIsDockHovered(true);
  };

  const handleCreateSession = () => {
    clearSessionRailHideTimeout();
    setChatState((previousState) => {
      const newSession = createSession(previousState.sessions.length + 1);
      return {
        sessions: [newSession, ...previousState.sessions],
        activeSessionId: newSession.id,
      };
    });
    setInputValue('');
    setIsSessionRailVisible(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleSelectSession = (sessionId: string) => {
    clearSessionRailHideTimeout();
    setChatState((previousState) =>
      previousState.activeSessionId === sessionId
        ? previousState
        : {
            ...previousState,
            activeSessionId: sessionId,
          }
    );
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

      {isOpen && (
        <div
          className="fixed inset-y-0 left-0 z-[94] w-16 md:w-24 pointer-events-auto"
          onMouseEnter={showSessionRail}
          onMouseLeave={scheduleSessionRailHide}
        />
      )}

      <AnimatePresence>
        {isOpen && isSessionRailVisible && (
          <motion.aside
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed left-0 top-14 bottom-32 z-[94] w-[min(32rem,42vw)] max-w-sm px-4 pointer-events-auto md:top-16"
            onMouseEnter={showSessionRail}
            onMouseLeave={scheduleSessionRailHide}
          >
            <div data-chat-action="true" className="flex h-full flex-col text-white">
              <div className="flex flex-col items-start gap-1.5 pb-4">
                <div className="text-[11px] uppercase tracking-[0.32em] text-white/55">会话</div>
                <button
                  type="button"
                  onClick={handleCreateSession}
                  className="-ml-1 text-xs font-medium text-white/72 transition hover:text-white"
                >
                  + 新会话
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                {orderedSessions.map((session) => {
                  const promptMessages = getPromptMessages(session);
                  const isActiveSession = session.id === activeSessionId;

                  return (
                    <div key={session.id} className="flex items-start">
                      <button
                        type="button"
                        onClick={() => handleSelectSession(session.id)}
                        className={`min-w-0 flex-1 border-l pl-3 pr-2 text-left transition ${
                          isActiveSession
                            ? 'border-white/70 text-white'
                            : 'border-white/10 text-white/58 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        <div className="truncate text-sm font-medium">{session.title}</div>
                        <div className="mt-1 text-[11px] text-white/32">
                          {promptMessages.length === 0 ? '空会话' : `${promptMessages.length} 次提问`} · {formatSessionUpdatedAt(session.updatedAt)}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.aside>
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

              {activePromptMessages.length > 0 && (
                <div
                  data-chat-action="true"
                  className="absolute -right-8 top-1/2 z-10 flex max-h-[calc(100%-4rem)] w-8 -translate-y-1/2 pointer-events-auto flex-col items-center gap-4 overflow-y-auto py-3 md:-right-10"
                >
                  {activePromptMessages.map((prompt) => {
                    const promptSummary = summarizeText(prompt.content, MAX_PROMPT_TOOLTIP_LENGTH);
                    const isActivePrompt = prompt.id === activePromptId;

                    return (
                      <div
                        key={prompt.id}
                        className={`group relative flex items-center justify-center ${isActivePrompt ? 'my-1.5' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => scrollToPrompt(prompt.id)}
                          aria-label={promptSummary}
                          title={promptSummary}
                          className={`rounded-full transition group-hover:scale-125 group-hover:bg-white ${
                            isActivePrompt
                              ? 'h-4 w-4 bg-white shadow-[0_0_16px_rgba(255,255,255,0.48)]'
                              : 'h-2.5 w-2.5 bg-white/55'
                          }`}
                        />
                        <div className="pointer-events-none absolute right-full top-1/2 hidden -translate-y-1/2 pr-3 group-hover:block">
                          <div className="w-44 rounded-2xl border border-white/10 bg-black/72 px-3 py-2 text-[11px] leading-4 text-white shadow-2xl backdrop-blur-md">
                            {promptSummary}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

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
                        ref={(element) => {
                          if (message.type === 'user') {
                            setPromptMessageRef(message.id, element);
                          }
                        }}
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

                    {isTypingCurrentSession && (
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
                  placeholder={isOpen ? '输入消息，回车发送...' : '和 AI 聊聊...'}
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
                      disabled={!inputValue.trim() || !!typingSessionId || loading}
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
