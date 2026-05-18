// Quran Foundation OAuth 2.0 + User API
// Docs: https://api-docs.quran.foundation/docs/tutorials/oidc/user-apis-quickstart/

import AsyncStorage from '@react-native-async-storage/async-storage';

const QF_OAUTH_BASE = 'https://prelive-oauth2.quran.foundation';
const QF_API_BASE = 'https://apis-prelive.quran.foundation';

export const QF_CLIENT_ID = process.env.EXPO_PUBLIC_QF_CLIENT_ID ?? '';
const QF_CLIENT_SECRET = process.env.EXPO_PUBLIC_QF_CLIENT_SECRET ?? '';

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

// ── Token Storage ──────────────────────────────────────────────────

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

// ── OAuth Token Exchange ───────────────────────────────────────────

export async function exchangeQFCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<QFTokens> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: QF_CLIENT_ID,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (QF_CLIENT_SECRET) {
    headers['Authorization'] = `Basic ${btoa(`${QF_CLIENT_ID}:${QF_CLIENT_SECRET}`)}`;
  }

  const res = await fetch(QF_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers,
    body: params.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshQFToken(refreshToken: string): Promise<QFTokens> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: QF_CLIENT_ID,
    ...(QF_CLIENT_SECRET ? { client_secret: QF_CLIENT_SECRET } : {}),
  });
  const res = await fetch(QF_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

// ── User API ───────────────────────────────────────────────────────

async function getValidToken(): Promise<string> {
  let tokens = await loadQFTokens();
  if (!tokens) throw new Error('Not authenticated');
  if (Date.now() < tokens.expiresAt - 60_000) return tokens.accessToken;
  if (tokens.refreshToken) {
    tokens = await refreshQFToken(tokens.refreshToken);
    await saveQFTokens(tokens);
    return tokens.accessToken;
  }
  throw new Error('Session expired — please log in again');
}

async function userFetch(path: string, options?: RequestInit) {
  const token = await getValidToken();
  const res = await fetch(`${QF_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
      'x-auth-token': token,
      'x-client-id': QF_CLIENT_ID,
    },
  });
  if (!res.ok) throw new Error(`User API ${res.status}: ${path}`);
  if (res.status === 204) return null;
  return res.json();
}

export async function fetchQFBookmarks(): Promise<QFBookmark[]> {
  const data = await userFetch('/auth/v1/bookmarks');
  return data?.bookmarks ?? data ?? [];
}

export async function addQFBookmark(
  verseKey: string,
  surahId: number,
  verseNumber: number
): Promise<void> {
  await userFetch('/auth/v1/bookmarks', {
    method: 'POST',
    body: JSON.stringify({ verse_key: verseKey, mushaf_id: 1, surah_id: surahId, verse_number: verseNumber }),
  });
}

export async function deleteQFBookmark(bookmarkId: number): Promise<void> {
  await userFetch(`/auth/v1/bookmarks/${bookmarkId}`, { method: 'DELETE' });
}

export async function logQFReadingSession(verseKey: string, durationSeconds: number): Promise<void> {
  await userFetch('/auth/v1/reading_sessions', {
    method: 'POST',
    body: JSON.stringify({ verse_key: verseKey, duration: durationSeconds }),
  });
}
