import axios from "axios";
import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

/**
 * API 服务层
 * 统一管理所有 API 请求，添加缓存和错误处理
 * ✨ 新增：自动添加 JWT token 到请求头
 */

const getApiOrigin = (): string => {
  const configuredOrigin = window.__VIBELIFE_API_ORIGIN__;
  if (configuredOrigin && configuredOrigin.trim()) {
    return configuredOrigin.replace(/\/+$/, "");
  }

  return window.location.port === "49173"
    ? "http://127.0.0.1:49174"
    : "http://localhost:8000";
};

// ✨ 新增：创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  timeout: 10000,
});

const AI_CHAT_TIMEOUT_MS = 180000;

// ✨ 新增：请求拦截器 - 自动添加 JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = `${getApiOrigin()}/api`;
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✨ 新增：响应拦截器 - 处理 401 错误
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token 无效或过期，清除本地存储并跳转到登录页
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export interface ProjectStepDTO {
  id: string;
  title: string;
  owner: string;
  due: string;
  done: boolean;
}

export interface ProjectResourceDTO {
  id: string;
  name: string;
  kind: '文档' | '链接' | '文件' | string;
  note: string;
}

export interface ProjectEmailDTO {
  id: string;
  from: string;
  subject: string;
  summary: string;
  importance: '高' | '中' | '低' | string;
  time: string;
}

export interface ProjectRecordDTO {
  id: string;
  name: string;
  category: 'life' | 'work' | 'growth' | string;
  subtitle: string;
  status: '正常推进' | '需关注' | '有阻塞' | string;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
  steps: ProjectStepDTO[];
  resources: ProjectResourceDTO[];
  emails: ProjectEmailDTO[];
}

export const projectsAPI = {
  getProjects: (category?: string): Promise<ProjectRecordDTO[]> => {
    const suffix = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiClient.get<{ projects: ProjectRecordDTO[] }>(`/projects${suffix}`).then((res) => res.data.projects || []);
  }
};

export interface ProjectPanelChatEffectDTO {
  entity: "todo" | "project" | "project_step";
  action: "create" | "update" | "delete" | "clear";
  count: number;
  ids?: string[];
  summary: string;
}

export interface ProjectPanelChatRunMetaDTO {
  executedAt: string;
  outcome: "success" | "partial";
}

export interface ProjectPanelChatResponseDTO {
  success: true;
  reply: string;
  provider: string;
  effects: ProjectPanelChatEffectDTO[];
  refreshHints: Array<"todo" | "insights">;
  runMeta: ProjectPanelChatRunMetaDTO;
}

export const aiAPI = {
  chatForProjectPanel: (payload: {
    message: string;
    provider: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    context?: unknown;
  }): Promise<ProjectPanelChatResponseDTO> => {
    return apiClient
      .post<ProjectPanelChatResponseDTO>("/ai/chat", payload, {
        timeout: AI_CHAT_TIMEOUT_MS,
      })
      .then((res) => res.data);
  },
};

export interface QuickCaptureRecordDTO {
  id: string;
  title: string;
  source_type: string;
  source_uri: string;
  summary: string;
  tags: string[];
  project_id: string | null;
  created_at: string;
}

export const quickCaptureAPI = {
  capture: (payload: {
    source_type: string;
    source_uri: string;
    project_id?: string;
    title?: string;
  }): Promise<QuickCaptureRecordDTO> => {
    return apiClient
      .post<{ success: boolean; capture: QuickCaptureRecordDTO }>("/quick-capture", payload)
      .then((res) => res.data.capture);
  },
  list: (projectId?: string): Promise<QuickCaptureRecordDTO[]> => {
    const suffix = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
    return apiClient
      .get<{ captures: QuickCaptureRecordDTO[] }>(`/quick-capture${suffix}`)
      .then((res) => res.data.captures || []);
  },
  search: (query: string): Promise<
    Array<{
      id: string;
      score: number;
      title: string;
      summary: string;
      tags: string[];
      source_type: string;
      project_id: string | null;
    }>
  > => {
    const suffix = `?query=${encodeURIComponent(query)}`;
    return apiClient
      .get<{ results: Array<{ id: string; score: number; title: string; summary: string; tags: string[]; source_type: string; project_id: string | null }> }>(`/quick-capture/search${suffix}`)
      .then((res) => res.data.results || []);
  }
};

export { apiClient };
