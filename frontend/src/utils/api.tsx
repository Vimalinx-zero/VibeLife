import axios from "axios";

/**
 * API 服务层
 * 统一管理所有 API 请求，添加缓存和错误处理
 * ✨ 新增：自动添加 JWT token 到请求头
 */

const API_BASE_URL = "http://localhost:8000/api";

// ✨ 新增：创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// ✨ 新增：请求拦截器 - 自动添加 JWT token
apiClient.interceptors.request.use(
  (config) => {
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
  (response) => {
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
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 创建带缓存的 fetch 函数
 */
const createCachedFetch = (key, fetcher, options = {}) => {
  const cached = cache.get(key);
  const now = Date.now();

  // 检查缓存是否有效
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`[Cache Hit] ${key}`);
    return Promise.resolve(cached.data);
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
export const clearCache = (key) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

/**
 * Quiz API
 */
export const quizAPI = {
  // 获取推荐题目
  getRecommendation: async (userId, questionIds = []) => {
    return createCachedFetch(
      `quiz_recommend_${userId}`,
      () => apiClient.post(`/quiz/recommend`, {
        user_id: userId,
        answered_ids: questionIds
      }).then(res => res.data)
    );
  },

  // 提交答案
  submitAnswer: async (userId, questionId, stepId, selectedKey, durationMs, isHesitant) => {
    return apiClient.post(`/quiz/answer`, {
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
  getNoteView: async (id) => {
    return createCachedFetch(
      `note_view_${id}`,
      () => apiClient.get(`/notes/view?id=${id}`).then(res => res.data)
    );
  },

  // 创建笔记/文件夹
  createNote: async (parentId, name, type, content = "") => {
    clearCache("note_view_*"); // 清除相关缓存
    return apiClient.post(`/notes/create`, {
      parent_id: parentId,
      name,
      type,
      content
    }).then(res => res.data);
  },

  // 更新笔记
  updateNote: async (id, name, content) => {
    return apiClient.post(`/notes/update`, {
      id,
      name,
      content
    }).then(res => res.data);
  },

  // 删除笔记
  deleteNote: async (id) => {
    clearCache("note_view_*");
    return apiClient.post(`/notes/delete`, { id }).then(res => res.data);
  }
};

/**
 * Mistakes API
 */
export const mistakesAPI = {
  // 获取错题本
  getMistakes: async (userId, filter = "All") => {
    return createCachedFetch(
      `mistakes_${userId}_${filter}`,
      () => apiClient.get(`/mistakes?user_id=${userId}&filter=${filter}`).then(res => res.data)
    );
  },

  // 重做错题
  retryMistake: async (mistakeId) => {
    return apiClient.post(`/mistakes/retry`, {
      mistake_id: mistakeId
    }).then(res => res.data);
  },

  // 更新熟练度
  updateMastery: async (userId, tagUpdates) => {
    return apiClient.post(`/quiz/update-weights`, {
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
  getCards: async (userId) => {
    return createCachedFetch(
      `anki_cards_${userId}`,
      () => apiClient.get(`/anki/cards?user_id=${userId}`).then(res => res.data)
    );
  },

  // 更新卡片状态
  updateCard: async (cardId, quality) => {
    return apiClient.post(`/anki/update`, {
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
  getStats: async () => {
    return createCachedFetch(
      "data_stats",
      () => apiClient.get(`/data/stats`).then(res => res.data),
      { cacheDuration: 30000 } // 统计数据缓存30秒
    );
  },

  // 导出数据
  exportData: async (type) => {
    return apiClient.get(`/data/export/${type}`, {
      responseType: 'blob'
    }).then(res => res.data);
  },

  // 导入题目
  importQuestions: async (data) => {
    clearCache("data_stats");
    return apiClient.post(`/data/import/questions`, data).then(res => res.data);
  }
};

/**
 * User API
 */
export const userAPI = {
  // 获取用户画像
  getProfile: async (userId) => {
    return createCachedFetch(
      `user_profile_${userId}`,
      () => apiClient.get(`/user/profile?user_id=${userId}`).then(res => res.data)
    );
  }
};

// 默认导出所有 API
export default {
  quiz: quizAPI,
  notes: notesAPI,
  mistakes: mistakesAPI,
  anki: ankiAPI,
  data: dataAPI,
  user: userAPI
};
