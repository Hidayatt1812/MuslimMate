// Quran Foundation OAuth 2.0 + User API.
// The mobile app uses Quran.com hosted login, then sends token exchange,
// refresh, and User API calls through the MuslimMate backend proxy.

import AsyncStorage from '@react-native-async-storage/async-storage';

const QF_OAUTH_BASE =
  process.env.EXPO_PUBLIC_QF_OAUTH_BASE ?? 'https://prelive-oauth2.quran.foundation';
const QF_PROXY_BASE_URL = (process.env.EXPO_PUBLIC_QF_PROXY_BASE_URL ?? '').replace(/\/+$/, '');

export const QF_CLIENT_ID = process.env.EXPO_PUBLIC_QF_CLIENT_ID ?? '';

export const QF_DISCOVERY = {
  authorizationEndpoint: `${QF_OAUTH_BASE}/oauth2/auth`,
  tokenEndpoint: `${QF_OAUTH_BASE}/oauth2/token`,
};

export const QF_SCOPES = ['openid', 'offline_access', 'user', 'bookmark', 'reading_session'];

const TOKENS_KEY = '@qf_auth_tokens';
const USER_KEY = '@qf_user_info';

export interface QFTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt: number;
}

export interface QFUser {
  sub: string;
  email?: string;
  name?: string;
}

export interface QFBookmark {
  id: number;
  verse_key: string;
  surah_id: number;
  verse_number: number;
  mushaf_id: number;
  created_at: string;
}

export function isQFProxyConfigured(): boolean {
  return Boolean(QF_CLIENT_ID && QF_PROXY_BASE_URL);
}

function assertQFProxyConfigured(): void {
  if (!QF_CLIENT_ID) throw new Error('EXPO_PUBLIC_QF_CLIENT_ID belum dikonfigurasi.');
  if (!QF_PROXY_BASE_URL) throw new Error('EXPO_PUBLIC_QF_PROXY_BASE_URL belum dikonfigurasi.');
}

async function proxyPost<T>(
  path: string,
  body: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  assertQFProxyConfigured();
  const res = await fetch(`${QF_PROXY_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? `QF proxy ${res.status}: ${path}`);
  }
  return res.json();
}

export async function saveQFTokens(tokens: QFTokens): Promise<void> {
  await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export async function loadQFTokens(): Promise<QFTokens | null> {
  const raw = await AsyncStorage.getItem(TOKENS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearQFSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKENS_KEY, USER_KEY]);
}

export async function isQFLoggedIn(): Promise<boolean> {
  if (!isQFProxyConfigured()) return false;
  const tokens = await loadQFTokens();
  if (!tokens) return false;
  if (Date.now() < tokens.expiresAt - 60_000) return true;
  if (tokens.refreshToken) {
    try {
      const refreshed = await refreshQFToken(tokens.refreshToken);
      await saveQFTokens(refreshed);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function getQFSessionStatus(): Promise<{
  configured: boolean;
  loggedIn: boolean;
  expiresAt?: number;
  scope?: string;
}> {
  const configured = isQFProxyConfigured();
  if (!configured) return { configured, loggedIn: false };
  const tokens = await loadQFTokens();
  const loggedIn = await isQFLoggedIn();
  const refreshed = await loadQFTokens();
  return {
    configured,
    loggedIn,
    expiresAt: refreshed?.expiresAt ?? tokens?.expiresAt,
    scope: refreshed?.scope ?? tokens?.scope,
  };
}

export async function exchangeQFCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<QFTokens> {
  return proxyPost<QFTokens>('/oauth/exchange', {
    code,
    codeVerifier,
    redirectUri,
  });
}

export async function refreshQFToken(refreshToken: string): Promise<QFTokens> {
  return proxyPost<QFTokens>('/oauth/refresh', { refreshToken });
}

async function getValidToken(): Promise<string> {
  let tokens = await loadQFTokens();
  if (!tokens) throw new Error('Not authenticated');
  if (Date.now() < tokens.expiresAt - 60_000) return tokens.accessToken;
  if (tokens.refreshToken) {
    tokens = await refreshQFToken(tokens.refreshToken);
    await saveQFTokens(tokens);
    return tokens.accessToken;
  }
  throw new Error('Session expired. Please log in again.');
}

async function userFetch(path: string, options?: RequestInit) {
  assertQFProxyConfigured();
  const token = await getValidToken();
  const res = await fetch(`${QF_PROXY_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error(`QF User API ${res.status}: ${path}`);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function fetchQFBookmarks(): Promise<QFBookmark[]> {
  const data = await userFetch('/user/bookmarks');
  return data?.bookmarks ?? data?.data ?? data ?? [];
}

export async function addQFBookmark(
  verseKey: string,
  surahId: number,
  verseNumber: number
): Promise<void> {
  await userFetch('/user/bookmarks', {
    method: 'POST',
    body: JSON.stringify({ verse_key: verseKey, mushaf_id: 1, surah_id: surahId, verse_number: verseNumber }),
  });
}

export async function deleteQFBookmark(bookmarkId: number): Promise<void> {
  await userFetch(`/user/bookmarks/${bookmarkId}`, { method: 'DELETE' });
}

export async function logQFReadingSession(verseKey: string, durationSeconds: number): Promise<void> {
  await userFetch('/user/reading-sessions', {
    method: 'POST',
    body: JSON.stringify({ verse_key: verseKey, duration: durationSeconds }),
  });
}
