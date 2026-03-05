/**
 * Anki API - 记忆卡后端API调用
 */

import { apiClient } from './api';

// ========================
// Type Definitions
// ========================

export interface Card {
  id: string;
  front: string;
  back: string;
  tags: string[];
  deck: string;
  repetitions: number;
  interval: number;
  ease_factor: number;
  due_date?: string;
}

export interface AnkiStats {
  total_cards: number;
  due_cards: number;
  reviews_today: number;
  average_retention: number;
}

export interface Deck {
  name: string;
  total_cards: number;
  due_cards: number;
}

export interface TagNode {
  name: string;
  count: number;
  children?: TagNode[];
}

// ========================
// Flash Cards API
// ========================

export async function getCards(deck: string | null = null, tags: string | null = null, tagsMode = 'or', masteryLevel: string | null = null, limit: number = 100) {
  const params: any = {};
  if (deck) params.deck = deck;
  if (tags) { params.tags = tags; params.tags_mode = tagsMode; }
  if (masteryLevel) params.mastery_level = masteryLevel;
  params.limit = limit;
  return apiClient.get('/anki/cards', { params });
}

export async function getCard(cardId: string) {
  return apiClient.get(`/anki/cards/${cardId}`);
}

export async function createCard(front: string, back: string, tags: string[] = [], deck: string = 'default') {
  return apiClient.post('/anki/cards', {
    front,
    back,
    tags,
    deck
  });
}

export async function updateCard(cardId: string, updates: Partial<Pick<Card, 'front' | 'back' | 'tags' | 'deck'>>) {
  return apiClient.put(`/anki/cards/${cardId}`, updates);
}

export async function deleteCard(cardId: string) {
  return apiClient.delete(`/anki/cards/${cardId}`);
}

// ========================
// Review System API
// ========================

export async function getDueCards(deck: string | null = null, tags: string | null = null, mode: 'due' | 'all' = 'due', limit: number = 20, tagsMode: 'or' | 'and' = 'or') {
  const params: any = {};
  if (deck) params.deck = deck;
  if (tags) { params.tags = tags; params.tags_mode = tagsMode; }
  params.mode = mode;
  params.limit = limit;
  return apiClient.get('/anki/review/due', { params });
}

export async function submitReview(cardId: string, quality: number, timeSpent: number = 0) {
  return apiClient.post(`/anki/review/${cardId}`, {
    quality,
    time_spent: timeSpent
  });
}

export async function getCardHistory(cardId: string, limit: number = 10) {
  return apiClient.get(`/anki/view/history/${cardId}`, { params: { limit } });
}

// ========================
// Statistics API
// ========================

export async function getAnkiStats() {
  return apiClient.get('/anki/stats');
}

export async function getDecks() {
  return apiClient.get('/anki/decks');
}

export async function getTagsTree() {
  return apiClient.get('/anki/tags');
}
// Force refresh
// Force refresh AnkiApi
