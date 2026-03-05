/**
 * Collection API - 自定义合集后端API调用
 */

const API_BASE = 'http://localhost:8000';

// ========================
// Collection CRUD API
// ========================

export async function getCollections() {
  const response = await fetch(`${API_BASE}/api/anki/collections`);

  if (!response.ok) {
    throw new Error('Failed to fetch collections');
  }

  return response.json();
}

export async function getCollection(collectionId) {
  const response = await fetch(`${API_BASE}/api/anki/collections/${collectionId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch collection');
  }

  return response.json();
}

export async function createCollection(name, description = null, color = 'blue') {
  const response = await fetch(`${API_BASE}/api/anki/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description,
      color
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create collection');
  }

  return response.json();
}

export async function updateCollection(collectionId, updates) {
  const response = await fetch(`${API_BASE}/api/anki/collections/${collectionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update collection');
  }

  return response.json();
}

export async function deleteCollection(collectionId) {
  const response = await fetch(`${API_BASE}/api/anki/collections/${collectionId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Failed to delete collection');
  }

  return response.json();
}

// ========================
// Collection Cards API
// ========================

export async function getCollectionCards(collectionId) {
  const response = await fetch(`${API_BASE}/api/anki/collections/${collectionId}/cards`);

  if (!response.ok) {
    throw new Error('Failed to fetch collection cards');
  }

  return response.json();
}

export async function addCardsToCollection(collectionId, cardIds) {
  const response = await fetch(`${API_BASE}/api/anki/collections/${collectionId}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      card_ids: cardIds
    })
  });

  if (!response.ok) {
    throw new Error('Failed to add cards to collection');
  }

  return response.json();
}

export async function removeCardFromCollection(collectionId, cardId) {
  const response = await fetch(
    `${API_BASE}/api/anki/collections/${collectionId}/cards/${cardId}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error('Failed to remove card from collection');
  }

  return response.json();
}

export async function getOrphanCards() {
  const response = await fetch(`${API_BASE}/api/anki/collections/orphan-cards`);

  if (!response.ok) {
    throw new Error('Failed to fetch orphan cards');
  }

  return response.json();
}

export async function getCollectionsStats() {
  const response = await fetch(`${API_BASE}/api/anki/collections/stats`);

  if (!response.ok) {
    throw new Error('Failed to fetch collections stats');
  }

  return response.json();
}
