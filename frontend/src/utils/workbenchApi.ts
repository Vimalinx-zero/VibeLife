/**
 * Workbench API - 工作台后端API调用
 *
 * ✨ 修复：使用 apiClient 而不是原生 fetch，确保自动添加 JWT token
 */

import { apiClient } from './api';

// ========================
// Type Definitions
// ========================

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: number;
  subject: string;
  due_date: string | null;
  created_at: string;
  completed_at?: string | null;
  updated_at?: string;
}

export interface StudySession {
  id: number;
  duration_minutes: number;
  mode: string;
  tasks_completed: number;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  entry_date: string;
  mood?: string | null;
  tags: string[];
  preview: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  time?: string | null;
  type: 'meeting' | 'deadline' | 'reminder' | 'task' | string;
  created_at: string;
  updated_at: string;
}

export interface WorkbenchStats {
  total_todos: number;
  completed_todos: number;
  total_sessions: number;
  total_study_minutes: number;
}

type TodoListResponse =
  | Todo[]
  | {
      todos?: Todo[];
      items?: Todo[];
      data?: Todo[];
      results?: Todo[];
    };

const normalizeTodoList = (payload: TodoListResponse): Todo[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const candidates = [payload.todos, payload.items, payload.data, payload.results];
    const matched = candidates.find(Array.isArray);
    if (matched) {
      return matched;
    }
  }

  console.error('Unexpected todo list response:', payload);
  return [];
};

// ========================
// Todo Items API
// ========================

export async function getTodos(completed: boolean | null = null, subject: string | null = null): Promise<Todo[]> {
  const params = new URLSearchParams();

  if (completed !== null) {
    params.append('completed', String(completed));
  }
  if (subject) {
    params.append('subject', subject);
  }

  const response = await apiClient.get<TodoListResponse>(`/workbench/todos?${params.toString()}`);
  return normalizeTodoList(response.data).filter(
    (todo) => typeof todo.text === 'string' && todo.text.trim().length > 0
  );
}

export async function createTodo(
  text: string,
  priority: number = 0,
  subject: string = 'general',
  dueDate: string | null = null
): Promise<Todo> {
  const response = await apiClient.post<Todo>(`/workbench/todos`, {
    text,
    priority,
    subject,
    due_date: dueDate
  });

  return response.data; // 后端返回创建的todo对象
}

export async function updateTodo(todoId: string | number, updates: Partial<Todo>): Promise<Todo> {
  const response = await apiClient.put<Todo>(`/workbench/todos/${todoId}`, updates);
  return response.data; // 后端返回更新后的todo对象
}

export async function deleteTodo(todoId: string | number): Promise<void> {
  await apiClient.delete(`/workbench/todos/${todoId}`);
}

export async function clearCompletedTodos(): Promise<void> {
  await apiClient.delete(`/workbench/todos/completed`);
}

export async function clearAllTodos(): Promise<void> {
  await apiClient.delete(`/workbench/todos/all`);
}

// ========================
// Study Sessions API
// ========================

export async function createStudySession(
  durationMinutes: number,
  mode: string,
  tasksCompleted: number = 0
): Promise<StudySession> {
  const response = await apiClient.post<StudySession>(`/workbench/sessions`, {
    duration_minutes: durationMinutes,
    mode,
    tasks_completed: tasksCompleted
  });

  return response.data; // 后端返回创建的session对象
}

export async function getStudySessions(days: number = 7): Promise<StudySession[]> {
  const response = await apiClient.get<StudySession[]>(`/workbench/sessions?days=${days}`);
  return response.data; // 后端直接返回数组
}

// ========================
// Journal API
// ========================

export async function getJournalEntries(params: {
  entryDate?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number;
} = {}): Promise<JournalEntry[]> {
  const search = new URLSearchParams();

  if (params.entryDate) {
    search.append('entry_date', params.entryDate);
  }
  if (params.dateFrom) {
    search.append('date_from', params.dateFrom);
  }
  if (params.dateTo) {
    search.append('date_to', params.dateTo);
  }
  if (typeof params.limit === 'number') {
    search.append('limit', String(params.limit));
  }

  const query = search.toString();
  const response = await apiClient.get<JournalEntry[]>(
    query ? `/workbench/journal?${query}` : `/workbench/journal`
  );
  return response.data;
}

export async function createJournalEntry(payload: {
  title?: string;
  content: string;
  entry_date?: string | null;
  mood?: string | null;
  tags?: string[];
}): Promise<JournalEntry> {
  const response = await apiClient.post<JournalEntry>(`/workbench/journal`, payload);
  return response.data;
}

export async function updateJournalEntry(
  entryId: string,
  payload: Partial<Pick<JournalEntry, 'title' | 'content' | 'entry_date' | 'mood' | 'tags'>>
): Promise<JournalEntry> {
  const response = await apiClient.put<JournalEntry>(`/workbench/journal/${entryId}`, payload);
  return response.data;
}

// ========================
// Schedule API
// ========================

export async function getScheduleEvents(params: {
  year?: number;
  month?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  type?: string | null;
  limit?: number;
} = {}): Promise<ScheduleEvent[]> {
  const search = new URLSearchParams();

  if (typeof params.year === 'number') {
    search.append('year', String(params.year));
  }
  if (typeof params.month === 'number') {
    search.append('month', String(params.month));
  }
  if (params.dateFrom) {
    search.append('date_from', params.dateFrom);
  }
  if (params.dateTo) {
    search.append('date_to', params.dateTo);
  }
  if (params.type) {
    search.append('type', params.type);
  }
  if (typeof params.limit === 'number') {
    search.append('limit', String(params.limit));
  }

  const query = search.toString();
  const response = await apiClient.get<ScheduleEvent[]>(
    query ? `/workbench/schedule-events?${query}` : `/workbench/schedule-events`
  );
  return response.data;
}

export async function createScheduleEvent(payload: {
  title: string;
  event_date?: string | null;
  description?: string;
  time?: string | null;
  type?: string;
}): Promise<ScheduleEvent> {
  const response = await apiClient.post<ScheduleEvent>(`/workbench/schedule-events`, payload);
  return response.data;
}

export async function updateScheduleEvent(
  eventId: string,
  payload: Partial<Pick<ScheduleEvent, 'title' | 'event_date' | 'description' | 'time' | 'type'>>
): Promise<ScheduleEvent> {
  const response = await apiClient.put<ScheduleEvent>(`/workbench/schedule-events/${eventId}`, payload);
  return response.data;
}

// ========================
// Statistics API
// ========================

export async function getWorkbenchStats(): Promise<WorkbenchStats> {
  const response = await apiClient.get<WorkbenchStats>(`/workbench/stats`);
  return response.data;
}
