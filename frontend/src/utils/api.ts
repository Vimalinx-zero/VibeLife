import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import {
  Question,
  FileItem,
  Mistake,
  FlashCard,
  DashboardStats,
  StudyStats,
  HeatmapData,
  UserProfile
} from "../types";

/**
 * API 服务层
 * 统一管理所有 API 请求，添加缓存和错误处理
 * ✨ 新增：自动添加 JWT token 到请求头
 */

const API_BASE_URL = "http://localhost:8000/api";

// ✨ 新增：创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// ✨ 新增：请求拦截器 - 自动添加 JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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

// 请求缓存存储
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

interface CacheOptions {
  cacheDuration?: number;
}

/**
 * 创建带缓存的 fetch 函数
 */
const createCachedFetch = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> => {
  const cached = cache.get(key);
  const now = Date.now();
  const duration = options.cacheDuration || CACHE_DURATION;

  // 检查缓存是否有效
  if (cached && now - cached.timestamp < duration) {
    console.log(`[Cache Hit] ${key}`);
    return Promise.resolve(cached.data as T);
  }

  console.log(`[Cache Miss] ${key}`);
  return fetcher().then(data => {
    cache.set(key, {
      data,
      timestamp: now
    });
    return data;
  });
};

/**
 * 清除指定缓存
 */
export const clearCache = (key?: string): void => {
  if (key) {
    // 支持通配符
    if (key.includes("*")) {
      const pattern = new RegExp(key.replace("*", ".*"));
      for (const [cacheKey] of cache) {
        if (pattern.test(cacheKey)) {
          cache.delete(cacheKey);
        }
      }
    } else {
      cache.delete(key);
    }
  } else {
    cache.clear();
  }
};

/**
 * Quiz API
 */
export const quizAPI = {
  // 获取推荐题目
  getRecommendation: (userId: string, questionIds: number[] = []): Promise<Question> => {
    return createCachedFetch(
      `quiz_recommend_${userId}`,
      () => apiClient.post<{ question: Question }>(`/quiz/recommend`, {
        user_id: userId,
        answered_ids: questionIds
      }).then(res => res.data.question)
    );
  },

  // 提交答案
  submitAnswer: (
    userId: string,
    questionId: number,
    stepId: number,
    selectedKey: string,
    durationMs: number,
    isHesitant: boolean
  ): Promise<{ correct: boolean; explanation?: string }> => {
    return apiClient.post<{ correct: boolean; explanation?: string }>(`/quiz/answer`, {
      user_id: userId,
      question_id: questionId,
      step_id: stepId,
      selected_key: selectedKey,
      duration_ms: durationMs,
      is_hesitant: isHesitant
    }).then(res => res.data);
  }
};

/**
 * Notes API
 */
export const notesAPI = {
  // 获取笔记视图
  getNoteView: (id: number | null): Promise<{ items: FileItem[]; breadcrumbs: FileItem[] }> => {
    const params = id !== null ? `?id=${id}` : "";
    return createCachedFetch(
      `note_view_${id}`,
      () => apiClient.get<{ items: FileItem[]; breadcrumbs: FileItem[] }>(`/notes/view${params}`).then(res => res.data)
    );
  },

  // 创建笔记/文件夹
  createNote: (
    parentId: number | null,
    name: string,
    type: 'folder' | 'file',
    content?: string
  ): Promise<FileItem> => {
    clearCache("note_view_*"); // 清除相关缓存
    return apiClient.post<{ item: FileItem }>(`/notes/create`, {
      parent_id: parentId,
      name,
      type,
      content: content || ""
    }).then(res => res.data.item);
  },

  // 更新笔记
  updateNote: (id: number, name: string, content: string): Promise<FileItem> => {
    return apiClient.post<{ item: FileItem }>(`/notes/update`, {
      id,
      name,
      content
    }).then(res => res.data.item);
  },

  // 删除笔记
  deleteNote: (id: number): Promise<{ success: boolean }> => {
    clearCache("note_view_*");
    return apiClient.post<{ success: boolean }>(`/notes/delete`, { id }).then(res => res.data);
  }
};

/**
 * Mistakes API
 */
export const mistakesAPI = {
  // 获取错题本
  getMistakes: (userId: string, filter: string = "All"): Promise<Mistake[]> => {
    return createCachedFetch(
      `mistakes_${userId}_${filter}`,
      () => apiClient.get<{ mistakes: Mistake[] }>(`/mistakes?user_id=${userId}&filter=${filter}`).then(res => res.data.mistakes)
    );
  },

  // 重做错题
  retryMistake: (mistakeId: number): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(`/mistakes/retry`, {
      mistake_id: mistakeId
    }).then(res => res.data);
  },

  // 更新熟练度
  updateMastery: (userId: string, tagUpdates: Record<string, number>): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(`/quiz/update-weights`, {
      user_id: userId,
      tag_updates: tagUpdates
    }).then(res => res.data);
  }
};

/**
 * ANKI API
 */
export const ankiAPI = {
  // 获取记忆卡
  getCards: (userId: string): Promise<FlashCard[]> => {
    return createCachedFetch(
      `anki_cards_${userId}`,
      () => apiClient.get<{ cards: FlashCard[] }>(`/anki/cards?user_id=${userId}`).then(res => res.data.cards)
    );
  },

  // 更新卡片状态
  updateCard: (cardId: number, quality: number): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(`/anki/update`, {
      card_id: cardId,
      quality
    }).then(res => res.data);
  }
};

/**
 * Data API
 */
export const dataAPI = {
  // 获取统计
  getStats: (): Promise<{
    total_questions: number;
    total_mistakes: number;
    total_notes: number;
    total_cards: number;
  }> => {
    return createCachedFetch(
      "data_stats",
      () => apiClient.get<{
        total_questions: number;
        total_mistakes: number;
        total_notes: number;
        total_cards: number;
      }>(`/data/stats`).then(res => res.data),
      { cacheDuration: 30000 } // 统计数据缓存30秒
    );
  },

  // 导出数据
  exportData: (type: 'questions' | 'mistakes' | 'notes' | 'all'): Promise<Blob> => {
    return apiClient.get(`/data/export/${type}`, {
      responseType: 'blob'
    }).then(res => res.data);
  },

  // 导入题目
  importQuestions: (data: { questions: Question[] }): Promise<{ success: boolean; imported: number }> => {
    clearCache("data_stats");
    return apiClient.post<{ success: boolean; imported: number }>(`/data/import/questions`, data).then(res => res.data);
  }
};

/**
 * Dashboard API
 */
export const dashboardAPI = {
  // 获取基础统计
  getStats: (): Promise<DashboardStats> => {
    return createCachedFetch(
      "dashboard_stats",
      () => apiClient.get<DashboardStats>(`/dashboard`).then(res => res.data)
    );
  },

  // 获取学习统计
  getStudyStats: (): Promise<StudyStats> => {
    return createCachedFetch(
      "dashboard_study_stats",
      () => apiClient.get<StudyStats>(`/dashboard/stats`).then(res => res.data)
    );
  },

  // 获取热力图数据
  getHeatmap: (days: number = 30): Promise<HeatmapData[]> => {
    return createCachedFetch(
      `dashboard_heatmap_${days}`,
      () => apiClient.get<{ heatmap: HeatmapData[] }>(`/dashboard/heatmap?days=${days}`).then(res => res.data.heatmap)
    );
  }
};

/**
 * User API
 */
export const userAPI = {
  // 获取用户画像
  getProfile: (userId: string): Promise<UserProfile> => {
    return createCachedFetch(
      `user_profile_${userId}`,
      () => apiClient.get<{ profile: UserProfile }>(`/user/profile?user_id=${userId}`).then(res => res.data.profile)
    );
  }
};

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
  category: 'life' | 'work' | 'study' | string;
  subtitle: string;
  status: '正常推进' | '需关注' | '有阻塞' | string;
  nextAction: string;
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

// ✅ 新增：导出 apiClient 供其他模块使用
export { apiClient };

// 默认导出所有 API
export default {
  quiz: quizAPI,
  notes: notesAPI,
  mistakes: mistakesAPI,
  anki: ankiAPI,
  data: dataAPI,
  dashboard: dashboardAPI,
  user: userAPI,
  projects: projectsAPI,
  quickCapture: quickCaptureAPI
};
// Force Vite reload
