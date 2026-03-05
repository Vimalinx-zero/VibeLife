// API 响应类型定义

// ========== 认证相关 ==========
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  username?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  bio?: string;
  preferences?: {
    theme?: 'light' | 'dark';
    language?: string;
  };
}

// ========== Dashboard 相关 ==========
export interface DashboardStats {
  username: string;
  daily_progress: number;
  mistakes_count: number;
  notes_count: number;
}

export interface StudyStats {
  duration_minutes: number;
  questions_completed: number;
  notes_created: number;
  mistakes_reviewed: number;
  anki_reviews: number;
}

export interface HeatmapData {
  date: string;  // YYYY-MM-DD
  intensity: number;  // 0-4
  duration: number;  // minutes
}

export interface LastActivity {
  type: 'quiz' | 'note' | 'mistake' | 'anki';
  description: string;
  timestamp?: string;
}

// ========== 题目相关 ==========
export interface Question {
  id?: number;
  content: string;
  options?: string[];
  correct_answer?: string;
  explanation?: string;
  subject?: string;
  difficulty?: number;
  tags?: string[];
  user_id?: string;
  created_at?: string;
}

export interface QuizSession {
  id?: number;
  question_count: number;
  correct_count: number;
  duration_seconds: number;
  user_id?: string;
  created_at?: string;
}

// ========== 笔记相关 ==========
export interface FileItem {
  id: number;
  type: 'folder' | 'file';
  title: string;
  content?: string;
  date: string;
  parent_id?: number | null;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

// ========== 错题本相关 ==========
export interface Mistake {
  id?: number;
  question: string;
  wrong_answer: string;
  correct_answer: string;
  explanation?: string;
  subject?: string;
  tags?: string[];
  review_count?: number;
  mastery_level?: number;
  user_id?: string;
  created_at?: string;
}

// ========== Flashcard 相关 ==========
export interface FlashCard {
  id?: number;
  front: string;
  back: string;
  deck?: string;
  tags?: string[];
  user_id?: string;
  created_at?: string;
  // Anki 相关字段
  ease_factor?: number;
  interval?: number;
  repetitions?: number;
  next_review_date?: string;
}

export interface CardReview {
  id?: number;
  card_id: number;
  quality: number;  // 0-5
  ease_factor?: number;
  interval?: number;
  repetitions?: number;
  created_at?: string;
}

// ========== 待办事项相关 ==========
export interface Todo {
  id?: number;
  title: string;
  text?: string;  // 别名，某些 API 使用 text 字段
  description?: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  user_id?: string;
  created_at?: string;
  subject?: string;  // 工作台待办事项可能有学科分类
}

// ========== 通用 API 响应 ==========
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// ========== 分页响应 ==========
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ========== 主题相关 ==========
export interface ThemeProfile {
  name: string;
  avatar: string;
  email: string;
  theme: 'light' | 'dark' | 'system';
}

// ========== 工作台相关 ==========
export interface StudySession {
  id?: number;
  duration_minutes: number;
  mode: 'focus' | 'break' | 'study';
  tasks_completed: number;
  mistakes_collected: number;
  user_id?: string;
  created_at?: string;
}

export interface WorkbenchStats {
  total_todos: number;
  completed_todos: number;
  total_mistakes: number;
  total_sessions: number;
  total_study_minutes: number;
}

// ========== 工作台错题相关 ==========
export interface WorkbenchMistake {
  id?: number;
  summary: string;
  type: 'quick' | 'detailed';
  content?: string;
  content_preview?: string;
  tags?: string[];
  subject?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

// ========== 搜索结果相关 ==========
export interface SearchResult {
  id: number | string;
  type: 'question' | 'note' | 'mistake' | 'flashcard';
  title: string;
  content?: string;
  excerpt?: string;
  tags?: string[];
  subject?: string;
  // 错题搜索特有字段
  wrong_count?: number;
  mastery?: number;
  // 笔记搜索特有字段
  parent_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

// ========== 用户信息相关（补充）==========
export interface UserInfo {
  id: string;
  username: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  theme?: 'light' | 'dark' | 'system';
  preferences?: {
    theme?: 'light' | 'dark';
    language?: string;
  };
}

// ========== QuizCard 相关类型 ==========
export interface QuizQuestion {
  id: number | string;
  type: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'proof' | 'essay';
  stem: string;
  options?: QuizOption[]; // 选项数组
  answer?: string | string[];
  solution?: string;
  subject?: string;
  tags?: string[];
  difficulty?: number;
  blanks?: number; // 填空题的空格数量
  // 复合题相关字段
  is_composite?: boolean;
  steps?: {
    stem: string;
    interaction_type: 'single_choice' | 'multiple_choice' | 'fill_blank';
    options?: QuizOption[];
    analysis?: string;
  }[];
  media?: string;
  // 允许更宽松的类型，以支持 CompositeQuizCard 的 any 类型
  [key: string]: any;
}

export interface QuizOption {
  key: string; // 'A', 'B', 'C', etc.
  content: string; // 选项内容（支持 Markdown）
  is_correct?: boolean; // 是否正确答案
}

export interface QuizFeedback {
  correct: boolean;
  selectedKey?: string;
  selectedKeys?: string[];
  explanation?: string;
}

export interface QuizCardProps {
  questionData: QuizQuestion;
  onSelect: (answer: string | string[]) => Promise<void>;
  isSubmitting: boolean;
  feedback: QuizFeedback | null;
  allowRetry?: boolean;
}

// ========== 笔记相关类型（补充）==========
export interface NoteInfo {
  id: string;
  name: string;
  type: 'folder' | 'file';
  content?: string;
  parent_id?: string | null;
  tags?: string[] | TagItem[];
  created_at?: string;
  updated_at?: string;
  date?: string;
  children?: NoteItem[];
}

export interface TagItem {
  id: string;
  name: string;
  count?: number;
  parent_id?: string | null;
}

export interface NoteItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  content?: string;
  parent_id?: string | null;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  date?: string;
  children?: NoteItem[];
}

// ========== Anki 相关类型（补充）==========
export interface FlashCardForm {
  front: string;
  back: string;
  tags: string[];
  deck?: string;
}

export interface Collection {
  id: number;
  name: string;
  description?: string;
  color: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  card_count?: number; // 合集卡片数量
}

// ========== 数据统计相关 ==========
export interface DataExportStats {
  questions: number;
  mistakes: number;
  notes: number;
  folders: number;
}

// ========== 设置相关响应 ==========
export interface SettingsResponse {
  success: boolean;
  message: string;
}

// ========== AI 解释相关 ==========
export interface AIExplanationData {
  summary?: string;
  key_points?: string[];
  suggestions?: string[];
  practice_questions?: Array<{
    question: string;
    options: string[];
    answer: number;
  }>;
  error_analysis?: {
    error_type?: string;
    root_cause?: string[];
    misconceptions?: string[];
  };
  step_by_step?: Array<{
    step: number;
    title: string;
    content: string;
    highlight?: string;
  }>;
  knowledge_points?: Array<{
    name: string;
    category: string;
    importance: '高' | '中' | '低';
  }>;
  tips?: string[];
  related_concepts?: Array<{
    name: string;
    relation: string;
  }>;
  source_note?: string;
  linked_notes?: number[];
  questions?: Array<{
    question: string;
    options: string[];
    answer: number;
  }>;
  related_cards?: number[];
}

// ========== Section 组件相关 ==========
export interface SectionProps {
  title?: string;
  icon?: React.ReactNode;
  count?: number;  // 可选
  children?: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  explanation?: AIExplanationData;
}

// ========== AI 导入 API 相关 ==========
export interface AIImportResponse {
  question?: {
    type?: string;
    stem?: string;
    options?: any[];
    answer?: any;
    solution?: string;
    steps?: Array<{
      stem?: string;
      interaction_type?: string;
      options?: any[];
      answer?: any;
      analysis?: string;
      step_index?: number;
      step_id?: string;
    }>;
    is_correct?: boolean;
  };
  note?: {
    title?: string;
    content?: string;
    tags?: string[];
  };
  mistake?: {
    title?: string;
    content?: string;
    type?: string;
  };
  analysis?: {
    title?: string;
    content?: string;
  };
  anki_cards?: Array<{
    front?: string;
    back?: string;
    tags?: string[];
  }>;
  questions?: Array<{
    question?: string;
    options?: any[];
    answer?: number;
  }>;
  tips?: string[];
  related_concepts?: Array<{
    name?: string;
    relation?: string;
  }>;
}

export interface AIImportSuccess {
  question?: {
    type: string;
    stem: string;
    options: any[];
    answer: any;
    solution: string;
    steps: any[];
    is_correct: boolean;
  };
  note?: {
    title: string;
    content: string;
    tags: string[];
  };
  mistake?: {
    title: string;
    content: string;
    type: string;
  };
  analysis?: {
    title: string;
    content: string;
  };
  anki_cards?: {
    front: string;
    back: string;
    tags: string[];
  }[];
  questions?: {
    question: string;
    options: any[];
    answer: number;
  }[];
  tips?: string[];
  related_concepts?: {
    name: string;
    relation: string;
  }[];
}
