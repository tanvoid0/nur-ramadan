/**
 * Optional backend API client for syncing user data to MongoDB (or any backend).
 * When VITE_API_URL is set, the app syncs user-specific data to the server; browser cache (IndexedDB) remains the primary read path for fast UX. No secrets (e.g. MongoDB URI) are ever in the frontend — only the public API base URL. Auth is via Google ID token sent in the Authorization header; the backend must validate it.
 */

import type { User, Habit, QuranProgress, Recipe } from '../types';

const API_BASE = import.meta.env.VITE_API_URL as string | undefined;
const TOKEN_KEY = 'nur_id_token';

function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // sessionStorage may be unavailable (private mode, etc.)
  }
}

export function getAuthToken(): string | null {
  return getToken();
}

export function clearAuthToken(): void {
  setAuthToken(null);
}

export function isApiConfigured(): boolean {
  return typeof API_BASE === 'string' && API_BASE.length > 0;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { method?: string } = {}
): Promise<T> {
  const base = API_BASE?.replace(/\/$/, '');
  if (!base) throw new Error('API URL not configured');
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(typeof options.headers === 'object' && !(options.headers instanceof Headers)
      ? (options.headers as Record<string, string>)
      : {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });
  if (res.status === 401) {
    clearAuthToken();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) return res.json() as Promise<T>;
  return undefined as T;
}

export async function apiGetUser(): Promise<User | null> {
  if (!isApiConfigured()) return null;
  try {
    return await apiFetch<User | null>('/api/user');
  } catch {
    return null;
  }
}

export async function apiSaveUser(user: User): Promise<void> {
  if (!isApiConfigured()) return;
  await apiFetch<void>('/api/user', { method: 'PUT', body: JSON.stringify(user) });
}

export async function apiGetHabits(): Promise<Habit[] | null> {
  if (!isApiConfigured()) return null;
  try {
    return await apiFetch<Habit[] | null>('/api/habits');
  } catch {
    return null;
  }
}

export async function apiSaveHabits(habits: Habit[]): Promise<void> {
  if (!isApiConfigured()) return;
  await apiFetch<void>('/api/habits', { method: 'PUT', body: JSON.stringify(habits) });
}

export async function apiGetQuran(): Promise<QuranProgress | null> {
  if (!isApiConfigured()) return null;
  try {
    return await apiFetch<QuranProgress | null>('/api/quran');
  } catch {
    return null;
  }
}

export async function apiSaveQuran(quran: QuranProgress): Promise<void> {
  if (!isApiConfigured()) return;
  await apiFetch<void>('/api/quran', { method: 'PUT', body: JSON.stringify(quran) });
}

export async function apiGetRecipes(): Promise<Recipe[]> {
  if (!isApiConfigured()) return [];
  try {
    return await apiFetch<Recipe[]>('/api/recipes');
  } catch {
    return [];
  }
}

export async function apiSaveRecipe(recipe: Recipe): Promise<void> {
  if (!isApiConfigured()) return;
  await apiFetch<void>('/api/recipes', { method: 'POST', body: JSON.stringify(recipe) });
}

export async function apiDeleteRecipe(id: string): Promise<void> {
  if (!isApiConfigured()) return;
  await apiFetch<void>(`/api/recipes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * Fetch all user data from the server (used after login to hydrate cache). Caller should write results into IndexedDB and update app state.
 */
export async function fetchUserDataFromServer(): Promise<{
  user: User | null;
  habits: Habit[] | null;
  quran: QuranProgress | null;
  recipes: Recipe[];
} | null> {
  if (!isApiConfigured() || !getToken()) return null;
  try {
    const [user, habits, quran, recipes] = await Promise.all([
      apiGetUser(),
      apiGetHabits(),
      apiGetQuran(),
      apiGetRecipes(),
    ]);
    return { user, habits, quran, recipes };
  } catch {
    return null;
  }
}
