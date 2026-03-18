import type { Todo } from "../utils/workbenchApi";

export type ProjectPanelMessageRole = "user" | "assistant";
export type ProjectTodoCategory = "成长" | "工作" | "生活" | "娱乐" | "其他";

export type ProjectPanelEffectEntity = "todo" | "project" | "project_step";
export type ProjectPanelEffectAction = "create" | "update" | "delete" | "clear";
export type ProjectPanelRefreshHint = "todo" | "insights";
export type ProjectPanelRunOutcome = "success" | "partial" | "failed";

export interface ProjectPanelEffect {
  entity: ProjectPanelEffectEntity;
  action: ProjectPanelEffectAction;
  count: number;
  ids?: string[];
  summary: string;
}

export interface ProjectPanelRunMeta {
  executedAt: string;
  outcome: ProjectPanelRunOutcome;
}

export interface ProjectPanelRefreshResult {
  target: ProjectPanelRefreshHint;
  success: boolean;
  label: string;
}

export interface ProjectPanelMessage {
  id: string;
  role: ProjectPanelMessageRole;
  content: string;
  timestamp: Date;
  provider?: string;
  effects?: ProjectPanelEffect[];
  refreshHints?: ProjectPanelRefreshHint[];
  runMeta?: ProjectPanelRunMeta;
  refreshResults?: ProjectPanelRefreshResult[];
}

interface StoredProjectPanelMessage {
  id?: string;
  role: ProjectPanelMessageRole;
  content: string;
  timestamp: string;
  provider?: string;
  effects?: ProjectPanelEffect[];
  refreshHints?: ProjectPanelRefreshHint[];
  runMeta?: ProjectPanelRunMeta;
  refreshResults?: ProjectPanelRefreshResult[];
}

export interface ProjectPanelSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ProjectPanelMessage[];
}

interface StoredProjectPanelSession {
  id?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: StoredProjectPanelMessage[];
}

interface StoredProjectPanelState {
  version: number;
  activeSessionId?: string;
  sessions?: StoredProjectPanelSession[];
}

export interface ProjectPanelState {
  activeSessionId: string;
  sessions: ProjectPanelSession[];
}

const PROJECT_PANEL_STORAGE_VERSION = 1;
const MAX_SESSION_MESSAGES = 50;
const MAX_HISTORY_MESSAGES = 10;
const MAX_SESSION_TITLE_LENGTH = 15;
const PROJECT_PANEL_WELCOME = "已进入项目协作模式。你可以让我汇总任务风险、拆今天计划，或者直接替你推进待办。";

export const PROJECT_TODO_CATEGORIES: ProjectTodoCategory[] = ["成长", "工作", "生活", "娱乐", "其他"];

const createProjectPanelId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const createWelcomeMessage = (): ProjectPanelMessage => ({
  id: "project-panel-welcome",
  role: "assistant",
  content: PROJECT_PANEL_WELCOME,
  timestamp: new Date(),
});

const summarizeSessionTitle = (value: string): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "新会话";
  }

  return normalized.length > MAX_SESSION_TITLE_LENGTH
    ? `${normalized.slice(0, MAX_SESSION_TITLE_LENGTH)}...`
    : normalized;
};

const getFallbackSessionTitle = (index: number) => `项目会话 ${String(index).padStart(2, "0")}`;

export const buildProjectPanelSessionTitle = (
  messages: ProjectPanelMessage[],
  fallbackTitle: string
): string => {
  const firstUserMessage = messages.find((message) => message.role === "user" && message.content.trim());
  return firstUserMessage ? summarizeSessionTitle(firstUserMessage.content) : fallbackTitle;
};

export const limitProjectPanelMessages = (
  messages: readonly ProjectPanelMessage[]
): ProjectPanelMessage[] => messages.slice(-MAX_SESSION_MESSAGES);

const parseStoredMessages = (value: unknown): ProjectPanelMessage[] => {
  if (!Array.isArray(value)) {
    return [createWelcomeMessage()];
  }

  const messages = value
    .filter(
      (message): message is StoredProjectPanelMessage =>
        !!message &&
        typeof message === "object" &&
        "role" in message &&
        "content" in message &&
        "timestamp" in message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0 &&
        typeof message.timestamp === "string"
    )
    .map((message) => ({
      id: typeof message.id === "string" && message.id ? message.id : createProjectPanelId("msg"),
      role: message.role,
      content: message.content.trim(),
      timestamp: new Date(message.timestamp),
      provider: typeof message.provider === "string" && message.provider.trim() ? message.provider.trim() : undefined,
      effects: Array.isArray(message.effects) ? message.effects : undefined,
      refreshHints: Array.isArray(message.refreshHints) ? message.refreshHints : undefined,
      runMeta:
        message.runMeta &&
        typeof message.runMeta === "object" &&
        typeof message.runMeta.executedAt === "string" &&
        (message.runMeta.outcome === "success" || message.runMeta.outcome === "partial" || message.runMeta.outcome === "failed")
          ? {
              executedAt: message.runMeta.executedAt,
              outcome: message.runMeta.outcome,
            }
          : undefined,
      refreshResults: Array.isArray(message.refreshResults) ? message.refreshResults : undefined,
    }))
    .filter((message) => !Number.isNaN(message.timestamp.getTime()));

  return messages.length > 0 ? limitProjectPanelMessages(messages) : [createWelcomeMessage()];
};

export const createProjectPanelSession = (
  index: number,
  overrides: Partial<Pick<ProjectPanelSession, "id" | "title" | "createdAt" | "updatedAt" | "messages">> = {}
): ProjectPanelSession => {
  const createdAt = overrides.createdAt ?? new Date();
  const messages =
    overrides.messages && overrides.messages.length > 0
      ? limitProjectPanelMessages(overrides.messages)
      : [createWelcomeMessage()];
  const updatedAt = overrides.updatedAt ?? messages[messages.length - 1]?.timestamp ?? createdAt;
  const fallbackTitle = overrides.title?.trim() || getFallbackSessionTitle(index);

  return {
    id: overrides.id ?? createProjectPanelId("project_panel_session"),
    title: buildProjectPanelSessionTitle(messages, fallbackTitle),
    createdAt,
    updatedAt,
    messages,
  };
};

export const createDefaultProjectPanelState = (): ProjectPanelState => {
  const initialSession = createProjectPanelSession(1);
  return {
    activeSessionId: initialSession.id,
    sessions: [initialSession],
  };
};

export const getProjectPanelHistoryStorageKey = (userId: string | undefined): string | null =>
  userId ? `vibelife_workbench_project_panel:${userId}` : null;

export const parseStoredProjectPanelState = (raw: string | null): ProjectPanelState => {
  if (!raw) {
    return createDefaultProjectPanelState();
  }

  try {
    const parsed = JSON.parse(raw) as StoredProjectPanelState;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.sessions)) {
      return createDefaultProjectPanelState();
    }

    const sessions = parsed.sessions
      .map((session, index) => {
        if (!session || typeof session !== "object") {
          return null;
        }

        const messages = parseStoredMessages(session.messages);
        const createdAt = new Date(session.createdAt ?? "");
        const updatedAt = new Date(session.updatedAt ?? "");

        return createProjectPanelSession(index + 1, {
          id: typeof session.id === "string" && session.id ? session.id : createProjectPanelId("project_panel_session"),
          title: typeof session.title === "string" ? session.title : "",
          createdAt: Number.isNaN(createdAt.getTime()) ? messages[0]?.timestamp ?? new Date() : createdAt,
          updatedAt: Number.isNaN(updatedAt.getTime()) ? messages[messages.length - 1]?.timestamp ?? new Date() : updatedAt,
          messages,
        });
      })
      .filter((session): session is ProjectPanelSession => session !== null);

    if (sessions.length === 0) {
      return createDefaultProjectPanelState();
    }

    const activeSessionId =
      typeof parsed.activeSessionId === "string" && sessions.some((session) => session.id === parsed.activeSessionId)
        ? parsed.activeSessionId
        : sessions[0].id;

    return {
      activeSessionId,
      sessions,
    };
  } catch (error) {
    console.error("Failed to parse workbench project panel state:", error);
    return createDefaultProjectPanelState();
  }
};

export const serializeProjectPanelState = (state: ProjectPanelState): StoredProjectPanelState => ({
  version: PROJECT_PANEL_STORAGE_VERSION,
  activeSessionId: state.activeSessionId,
  sessions: state.sessions.map((session) => ({
    id: session.id,
    title: session.title,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    messages: limitProjectPanelMessages(session.messages).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      provider: message.provider,
      effects: message.effects,
      refreshHints: message.refreshHints,
      runMeta: message.runMeta,
      refreshResults: message.refreshResults,
    })),
  })),
});


export const getLatestProjectPanelRunMessage = (
  state: ProjectPanelState
): ProjectPanelMessage | null => {
  const activeSession = state.sessions.find((session) => session.id === state.activeSessionId);
  if (!activeSession) {
    return null;
  }

  for (let index = activeSession.messages.length - 1; index >= 0; index -= 1) {
    const message = activeSession.messages[index];
    if (message.role === "assistant" && message.runMeta) {
      return message;
    }
  }

  return null;
};

export const buildProjectPanelHistory = (
  messages: readonly ProjectPanelMessage[]
): Array<{ role: ProjectPanelMessageRole; content: string }> =>
  messages
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));

export const inferProjectTodoCategory = (text: string): ProjectTodoCategory => {
  if (/(学习|复习|训练|复盘|课程|笔记|英语|数学|阅读|成长)/.test(text)) {
    return "成长";
  }
  if (/(工作|项目|代理|openclaw|网关|日报|任务|计划|开会|交付)/i.test(text)) {
    return "工作";
  }
  if (/(生活|买|运动|健身|睡|吃|家务|散步|收拾)/.test(text)) {
    return "生活";
  }
  if (/(玩|休息|电影|游戏|音乐|放松)/.test(text)) {
    return "娱乐";
  }
  return "其他";
};

export const groupTodosByCategory = (
  todos: readonly Todo[]
): Record<ProjectTodoCategory, Todo[]> => {
  const grouped = PROJECT_TODO_CATEGORIES.reduce<Record<ProjectTodoCategory, Todo[]>>(
    (accumulator, category) => {
      accumulator[category] = [];
      return accumulator;
    },
    {
      成长: [],
      工作: [],
      生活: [],
      娱乐: [],
      其他: [],
    }
  );

  todos.forEach((todo) => {
    if (typeof todo.text !== "string" || todo.text.trim().length === 0) {
      return;
    }

    grouped[inferProjectTodoCategory(todo.text)].push(todo);
  });

  return grouped;
};
