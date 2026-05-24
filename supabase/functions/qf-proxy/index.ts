type CachedToken = {
  value: string;
  expiresAt: number;
};

const tokenCache = new Map<string, CachedToken>();

const QF_ENV = Deno.env.get('QF_ENV') === 'production' ? 'production' : 'prelive';
const QF_CLIENT_ID = Deno.env.get('QF_CLIENT_ID') ?? '';
const QF_CLIENT_SECRET = Deno.env.get('QF_CLIENT_SECRET') ?? '';
const ALLOWED_ORIGIN = Deno.env.get('QF_ALLOWED_ORIGIN') ?? '*';

const AUTH_BASE =
  QF_ENV === 'production'
    ? 'https://oauth2.quran.foundation'
    : 'https://prelive-oauth2.quran.foundation';
const API_BASE =
  QF_ENV === 'production'
    ? 'https://apis.quran.foundation'
    : 'https://apis-prelive.quran.foundation';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-auth-token, x-client-id, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

class QFUpstreamError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function requireConfig(): Response | null {
  if (!QF_CLIENT_ID || !QF_CLIENT_SECRET) {
    return jsonResponse({ error: 'QF_CLIENT_ID and QF_CLIENT_SECRET must be configured on the server.' }, 500);
  }
  return null;
}

function basicAuth(): string {
  return `Basic ${btoa(`${QF_CLIENT_ID}:${QF_CLIENT_SECRET}`)}`;
}

async function tokenRequest(params: URLSearchParams): Promise<Response> {
  const configError = requireConfig();
  if (configError) return configError;

  const upstream = await fetch(`${AUTH_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return jsonResponse({ error: 'Quran Foundation token request failed.' }, upstream.status);
  }

  const data = JSON.parse(text);
  return jsonResponse({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    tokenType: data.token_type,
    scope: data.scope,
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  });
}

async function getClientCredentialsToken(scope: 'content' | 'search'): Promise<string> {
  const cached = tokenCache.get(scope);
  if (cached && Date.now() < cached.expiresAt - 30_000) return cached.value;

  const configError = requireConfig();
  if (configError) throw new Error('QF proxy is not configured.');

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    scope,
  });

  const upstream = await fetch(`${AUTH_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!upstream.ok) throw new QFUpstreamError(`QF ${scope} token failed.`, upstream.status);
  const data = await upstream.json();
  const value = String(data.access_token);
  tokenCache.set(scope, {
    value,
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  });
  return value;
}

function tokenFailureResponse(scope: 'content' | 'search', error: unknown): Response {
  const upstreamStatus = error instanceof QFUpstreamError ? error.status : 500;
  const status = scope === 'search' && upstreamStatus === 400 ? 403 : upstreamStatus;
  return jsonResponse({
    error: `Quran Foundation ${scope} token request failed.`,
    detail: status === 403 ? `The configured Quran Foundation client is missing the required "${scope}" scope.` : undefined,
  }, status);
}

function getRoutePath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const functionIndex = parts.indexOf('qf-proxy');
  const routeParts = functionIndex >= 0 ? parts.slice(functionIndex + 1) : parts;
  return `/${routeParts.join('/')}`;
}

function forwardQuery(from: URL, to: URL): void {
  from.searchParams.forEach((value, key) => {
    to.searchParams.append(key, value);
  });
}

function firstSearchParam(url: URL, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = url.searchParams.get(key);
    if (value) return value;
  }
  return fallback;
}

function isAllowedContentPath(path: string): boolean {
  return [
    /^\/chapters$/,
    /^\/verses\/by_chapter\/\d+$/,
    /^\/verses\/by_key\/\d+:\d+$/,
    /^\/recitations\/\d+\/by_chapter\/\d+$/,
    /^\/tafsirs\/\d+\/by_chapter\/\d+$/,
    /^\/tafsirs\/\d+\/by_ayah\/\d+:\d+$/,
    /^\/search$/,
  ].some(pattern => pattern.test(path));
}

async function proxyContent(reqUrl: URL, routePath: string): Promise<Response> {
  const contentPath = routePath.replace(/^\/content/, '') || '/';
  if (!isAllowedContentPath(contentPath)) {
    return jsonResponse({ error: 'Content endpoint is not allowed by this proxy.' }, 404);
  }

  let token: string;
  try {
    token = await getClientCredentialsToken('content');
  } catch (error) {
    return tokenFailureResponse('content', error);
  }
  const target = new URL(`${API_BASE}/content/api/v4${contentPath}`);
  forwardQuery(reqUrl, target);

  const upstream = await fetch(target.toString(), {
    headers: {
      'x-auth-token': token,
      'x-client-id': QF_CLIENT_ID,
    },
  });

  const text = await upstream.text();
  if (upstream.status === 404 && /^\/verses\/by_key\/\d+:\d+$/.test(contentPath)) {
    const verseKey = contentPath.replace('/verses/by_key/', '');
    return proxyQuranComVerseByKey(reqUrl, verseKey);
  }

  return new Response(text, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

async function proxyQuranComVerseByKey(reqUrl: URL, verseKey: string): Promise<Response> {
  const target = new URL(`https://api.quran.com/api/v4/verses/by_key/${verseKey}`);
  forwardQuery(reqUrl, target);

  const upstream = await fetch(target.toString());
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      'x-qf-proxy-fallback': 'quran.com-content',
    },
  });
}

async function proxyQuranComSearch(reqUrl: URL, reason: string): Promise<Response> {
  const query = firstSearchParam(reqUrl, ['query', 'q']);
  if (!query.trim()) return jsonResponse({ result: { navigation: [], verses: [] } });

  const target = new URL('https://api.quran.com/api/v4/search');
  target.searchParams.set('q', query.slice(0, 250));
  target.searchParams.set('size', firstSearchParam(reqUrl, ['versesResultsNumber', 'size'], '12'));
  target.searchParams.set('page', '0');
  target.searchParams.set('language', firstSearchParam(reqUrl, ['language'], 'en'));

  const upstream = await fetch(target.toString());
  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  }

  const data = await upstream.json();
  const rows = Array.isArray(data?.search?.results) ? data.search.results : [];
  return jsonResponse({
    result: {
      navigation: [],
      verses: rows.map((row: Record<string, unknown>) => ({
        result_type: 'verse',
        key: row.verse_key,
        name: Array.isArray(row.translations)
          ? String((row.translations[0] as Record<string, unknown> | undefined)?.text ?? '')
          : '',
        arabic: row.text,
      })),
    },
    meta: {
      fallback: 'quran.com-search',
      reason,
    },
  });
}

async function proxySearch(reqUrl: URL): Promise<Response> {
  let token: string;
  try {
    token = await getClientCredentialsToken('search');
  } catch (error) {
    const upstreamStatus = error instanceof QFUpstreamError ? error.status : 500;
    if (upstreamStatus === 400 || upstreamStatus === 403) {
      return proxyQuranComSearch(reqUrl, 'qf-search-scope-unavailable');
    }
    return tokenFailureResponse('search', error);
  }
  const target = new URL(`${API_BASE}/api/v1/search`);
  forwardQuery(reqUrl, target);

  const upstream = await fetch(target.toString(), {
    headers: {
      'x-auth-token': token,
      'x-client-id': QF_CLIENT_ID,
    },
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return proxyQuranComSearch(reqUrl, `qf-search-${upstream.status}`);
  }

  return new Response(text, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

function userApiPath(routePath: string): string | null {
  if (routePath === '/user/bookmarks') return '/auth/v1/bookmarks';
  if (/^\/user\/bookmarks\/[^/]+$/.test(routePath)) {
    return routePath.replace(/^\/user/, '/auth/v1');
  }
  if (routePath === '/user/reading-sessions') return '/auth/v1/reading_sessions';
  if (routePath === '/user/reading_sessions') return '/auth/v1/reading_sessions';
  if (routePath === '/user/notes') return '/auth/v1/notes';
  if (routePath === '/user/notes/by-verse') return '/auth/v1/notes/by-verse';
  if (/^\/user\/notes\/[^/]+$/.test(routePath)) {
    return routePath.replace(/^\/user/, '/auth/v1');
  }
  return null;
}

async function proxyUser(req: Request, reqUrl: URL, routePath: string): Promise<Response> {
  const targetPath = userApiPath(routePath);
  if (!targetPath) return jsonResponse({ error: 'User endpoint is not allowed by this proxy.' }, 404);

  const authorization = req.headers.get('Authorization') ?? '';
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return jsonResponse({ error: 'Missing user access token.' }, 401);

  const target = new URL(`${API_BASE}${targetPath}`);
  forwardQuery(reqUrl, target);

  const upstream = await fetch(target.toString(), {
    method: req.method,
    headers: {
      'Content-Type': req.headers.get('Content-Type') ?? 'application/json',
      'x-auth-token': accessToken,
      'x-client-id': QF_CLIENT_ID,
    },
    body: req.method === 'GET' ? undefined : await req.text(),
  });

  const text = await upstream.text();
  return new Response(text || null, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

async function handleOAuth(req: Request, routePath: string): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const body = await req.json().catch(() => ({}));
  if (routePath === '/oauth/exchange') {
    const { code, codeVerifier, redirectUri } = body;
    if (!code || !codeVerifier || !redirectUri) {
      return jsonResponse({ error: 'code, codeVerifier, and redirectUri are required.' }, 400);
    }
    return tokenRequest(new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }));
  }

  if (routePath === '/oauth/refresh') {
    const { refreshToken } = body;
    if (!refreshToken) return jsonResponse({ error: 'refreshToken is required.' }, 400);
    return tokenRequest(new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }));
  }

  return jsonResponse({ error: 'OAuth endpoint not found.' }, 404);
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const reqUrl = new URL(req.url);
    const routePath = getRoutePath(reqUrl);

    if (routePath === '/health') {
      return jsonResponse({
        ok: true,
        env: QF_ENV,
        configured: Boolean(QF_CLIENT_ID && QF_CLIENT_SECRET),
      });
    }

    if (routePath.startsWith('/oauth/')) return handleOAuth(req, routePath);
    if (routePath.startsWith('/content/')) return proxyContent(reqUrl, routePath);
    if (routePath.startsWith('/search')) return proxySearch(reqUrl);
    if (routePath.startsWith('/user/')) return proxyUser(req, reqUrl, routePath);

    return jsonResponse({ error: 'Route not found.' }, 404);
  } catch {
    return jsonResponse({ error: 'Quran Foundation proxy request failed.' }, 500);
  }
});
