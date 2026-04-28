/**
 * Thin API client for the Express backend.
 * All methods return parsed JSON.
 */

import type { Square } from './data/mock';

const API = '/api';

async function request<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Squares ──

export async function getSquares(admin = false): Promise<Square[]> {
  const qs = admin ? '?admin=true' : '';
  return request<Square[]>(`${API}/squares${qs}`);
}

export async function createSquare(formData: FormData): Promise<Square> {
  const res = await fetch(`${API}/squares`, {
    method: 'POST',
    body: formData, // multipart — no Content-Type header (browser sets boundary)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateSquare(
  id: string,
  data: Partial<{
    isOpened: boolean;
    openedBy: string;
    description: string;
    secretName: string;
    content: string;
  }>,
): Promise<Square> {
  return request<Square>(`${API}/squares/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSquare(id: string): Promise<void> {
  await request(`${API}/squares/${id}`, { method: 'DELETE' });
}

// ── Users ──

export async function getUsers(): Promise<string[]> {
  return request<string[]>(`${API}/users`);
}

export async function addUser(name: string): Promise<{ name: string }> {
  return request<{ name: string }>(`${API}/users`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function removeUser(name: string): Promise<void> {
  await request(`${API}/users/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

// ── Game ──

export interface GuessResult {
  success: boolean;
  reason?: string;
  square?: Square;
  hint?: {
    level: 'ice' | 'cold' | 'warmer' | 'warm' | 'hot' | 'burning' | 'almost';
    label: string;
    message: string;
  };
}

export async function guess(query: string, playerName: string): Promise<GuessResult> {
  return request<GuessResult>(`${API}/guess`, {
    method: 'POST',
    body: JSON.stringify({ query, playerName }),
  });
}

// ── Admin ──

export async function adminLogin(password: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`${API}/admin/login`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export interface GuessLog {
  id: number;
  playerName: string;
  query: string;
  isMatch: boolean;
  hintLevel?: string;
  hintLabel?: string;
  createdAt: number;
}

export async function resetProgress(): Promise<void> {
  await request(`${API}/admin/reset-progress`, { method: 'POST' });
}

export async function getGuessLogs(
  after = 0,
  wait = false,
  signal?: AbortSignal,
): Promise<GuessLog[]> {
  const params = new URLSearchParams({
    after: String(after),
    wait: String(wait),
  });

  const res = await fetch(`${API}/admin/guess-logs?${params}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  const body = await res.json();
  return body.logs || [];
}
