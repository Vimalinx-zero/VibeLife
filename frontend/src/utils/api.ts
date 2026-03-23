import axios from "axios";
import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { resolveApiOrigin } from "./apiOrigin";

/**
 * API 服务层
 * 统一管理所有 API 请求，添加缓存和错误处理
 * ✨ 新增：自动添加 JWT token 到请求头
 */

const getApiOrigin = (): string => {
  return resolveApiOrigin({
    configuredOrigin: window.__VIBELIFE_API_ORIGIN__,
    port: window.location.port,
  });
};

// ✨ 新增：创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  timeout: 10000,
});

const AI_CHAT_TIMEOUT_MS = 180000;
const MUSIC_IMPORT_TIMEOUT_MS = 120000;
const WORKBENCH_PREPARE_TIMEOUT_MS = 180000;

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

export interface MusicLibraryTrackDTO {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  album: string;
  duration_seconds: number | null;
  mime_type: string;
  file_size: number;
  stored_filename: string;
  original_filename: string;
  source_kind: string;
  stream_path: string;
  created_at: string;
  updated_at: string;
}

export const musicLibraryAPI = {
  list: (): Promise<MusicLibraryTrackDTO[]> =>
    apiClient
      .get<{ tracks: MusicLibraryTrackDTO[] }>("/music/library")
      .then((res) => res.data.tracks || []),
  importFiles: (files: File[]): Promise<MusicLibraryTrackDTO[]> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    return apiClient
      .post<{ tracks: MusicLibraryTrackDTO[] }>("/music/import", formData, {
        timeout: MUSIC_IMPORT_TIMEOUT_MS,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => res.data.tracks || []);
  },
};

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

export interface WorkbenchPrepareRequestDTO {
  date_key: string;
  max_items?: number;
}

export interface WorkbenchPrepareResponseDTO {
  success: boolean;
  date_key: string;
  daily_plan: unknown;
  project_digest: unknown;
  coach_message: string;
  provider: string;
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
  prepareWorkbench: (
    payload: WorkbenchPrepareRequestDTO
  ): Promise<WorkbenchPrepareResponseDTO> => {
    return apiClient
      .post<WorkbenchPrepareResponseDTO>("/ai/workbench/prepare", payload, {
        timeout: WORKBENCH_PREPARE_TIMEOUT_MS,
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
  updated_at?: string;
  content_kind?: "collected" | "generated";
  category?: string | null;
  normalized_markdown?: string;
  source_capture_ids?: string[];
  source_filter_snapshot?: {
    content_kind?: "collected" | "generated";
    project_id?: string | null;
    category?: string | null;
    selected_entry_ids?: string[];
  } | null;
  discussion_metadata?: {
    mode?: "entry" | "selection";
    saved_at?: string;
    user_prompt_excerpt?: string;
    assistant_reply_excerpt?: string;
  } | null;
}

export interface KnowledgeWorkshopFilters {
  contentKind?: "collected" | "generated";
  projectId?: string | null;
  category?: string | null;
}

export interface KnowledgeCitationDTO {
  id: string;
  title: string;
  content_kind: "collected" | "generated";
  project_id: string | null;
  category: string | null;
}

export interface KnowledgeDraftDTO {
  title: string;
  content_markdown: string;
  tags: string[];
  project_id: string | null;
  category: string | null;
}

export interface KnowledgeDiscussionMessageDTO {
  role: "user" | "assistant";
  content: string;
}

export interface KnowledgeSelectionDTO {
  content_kind: "collected" | "generated";
  project_id?: string | null;
  category?: string | null;
  selected_entry_ids?: string[];
}

export interface KnowledgeDiscussRequestDTO {
  mode: "entry" | "selection";
  message: string;
  history: KnowledgeDiscussionMessageDTO[];
  entry_id?: string;
  selection?: KnowledgeSelectionDTO;
}

export interface KnowledgeDiscussResponseDTO {
  reply: string;
  context_mode: "entry" | "selection";
  citations: KnowledgeCitationDTO[];
  draft: KnowledgeDraftDTO | null;
}

export interface KnowledgeGeneratedPayloadDTO {
  title: string;
  content_markdown: string;
  tags: string[];
  project_id: string | null;
  category: string | null;
  source_capture_ids: string[];
  source_filter_snapshot: KnowledgeSelectionDTO | null;
  discussion_metadata: {
    mode: "entry" | "selection";
    saved_at: string;
    user_prompt_excerpt: string;
    assistant_reply_excerpt: string;
  } | null;
}

export interface KnowledgeAppendPayloadDTO {
  content_markdown: string;
  tags: string[];
  source_capture_ids: string[];
  source_filter_snapshot: KnowledgeSelectionDTO | null;
  discussion_metadata: KnowledgeGeneratedPayloadDTO["discussion_metadata"];
}

export const quickCaptureAPI = {
  capture: (payload: {
    source_type: string;
    source_uri: string;
    project_id?: string;
    title?: string;
    category?: string;
    tags?: string[];
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

const buildKnowledgeFilterQuery = (filters: KnowledgeWorkshopFilters = {}): string => {
  const search = new URLSearchParams();
  if (filters.contentKind) {
    search.append("content_kind", filters.contentKind);
  }
  if (filters.projectId) {
    search.append("project_id", filters.projectId);
  }
  if (filters.category) {
    search.append("category", filters.category);
  }
  return search.toString();
};

export const knowledgeWorkshopAPI = {
  listEntries: (filters: KnowledgeWorkshopFilters = {}): Promise<QuickCaptureRecordDTO[]> => {
    const query = buildKnowledgeFilterQuery(filters);
    const url = query ? `/quick-capture?${query}` : "/quick-capture";
    return apiClient
      .get<{ captures: QuickCaptureRecordDTO[] }>(url)
      .then((res) => res.data.captures || []);
  },
  searchEntries: (
    query: string,
    filters: KnowledgeWorkshopFilters = {}
  ): Promise<
    Array<{
      id: string;
      score: number;
      title: string;
      summary: string;
      tags: string[];
      source_type: string;
      project_id: string | null;
      content_kind?: "collected" | "generated";
      category?: string | null;
    }>
  > => {
    const search = new URLSearchParams();
    search.append("query", query);
    const filterQuery = buildKnowledgeFilterQuery(filters);
    if (filterQuery) {
      for (const [key, value] of new URLSearchParams(filterQuery).entries()) {
        search.append(key, value);
      }
    }
    return apiClient
      .get<{
        results: Array<{
          id: string;
          score: number;
          title: string;
          summary: string;
          tags: string[];
          source_type: string;
          project_id: string | null;
          content_kind?: "collected" | "generated";
          category?: string | null;
        }>;
      }>(`/quick-capture/search?${search.toString()}`)
      .then((res) => res.data.results || []);
  },
  discuss: (payload: KnowledgeDiscussRequestDTO): Promise<KnowledgeDiscussResponseDTO> =>
    apiClient
      .post<KnowledgeDiscussResponseDTO>("/knowledge/discuss", payload)
      .then((res) => res.data),
  createGeneratedNote: (payload: KnowledgeGeneratedPayloadDTO): Promise<{ entry: QuickCaptureRecordDTO }> =>
    apiClient
      .post<{ entry: QuickCaptureRecordDTO }>("/knowledge/generated", payload)
      .then((res) => res.data),
  appendGeneratedNote: (
    entryId: string,
    payload: KnowledgeAppendPayloadDTO
  ): Promise<{ entry: QuickCaptureRecordDTO }> =>
    apiClient
      .post<{ entry: QuickCaptureRecordDTO }>(`/knowledge/generated/${entryId}/append`, payload)
      .then((res) => res.data),
  uploadEntry: (payload: {
    file: File;
    sourceType: string;
    title?: string;
    projectId?: string | null;
    category?: string | null;
    tags?: string[];
  }): Promise<QuickCaptureRecordDTO> => {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("source_type", payload.sourceType);
    if (payload.title?.trim()) {
      formData.append("title", payload.title.trim());
    }
    if (payload.projectId?.trim()) {
      formData.append("project_id", payload.projectId.trim());
    }
    if (payload.category?.trim()) {
      formData.append("category", payload.category.trim());
    }
    if (payload.tags?.length) {
      formData.append("tags", payload.tags.join(","));
    }

    return apiClient
      .post<{ success: boolean; capture: QuickCaptureRecordDTO }>("/quick-capture/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res) => res.data.capture);
  },
};

export { apiClient };
