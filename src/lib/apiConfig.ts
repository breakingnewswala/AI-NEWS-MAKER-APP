// Helper to resolve API URLs correctly whether running on Web (HTTP/HTTPS) or inside Android WebView (file://)

export const DEFAULT_CLOUD_BASE_URL = 'https://ais-dev-vhpz665wuo3aifiyjrbnrh-101130074623.asia-southeast1.run.app';
export const GOOGLE_OAUTH_CLIENT_ID = '401033199805-hsj85q4q553492ojg0jtke9hvn4jq1je.apps.googleusercontent.com';

export function getCustomCloudUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('CUSTOM_CLOUD_API_URL');
      if (saved && saved.trim().startsWith('http')) {
        return saved.trim().replace(/\/+$/, '');
      }
    } catch {
      // ignore
    }
  }
  return '';
}

export function setCustomCloudUrl(url: string) {
  if (typeof window !== 'undefined') {
    try {
      if (!url || !url.trim()) {
        localStorage.removeItem('CUSTOM_CLOUD_API_URL');
      } else {
        localStorage.setItem('CUSTOM_CLOUD_API_URL', url.trim().replace(/\/+$/, ''));
      }
    } catch {
      // ignore
    }
  }
}

export function isAndroidWebView(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname === 'appassets.androidplatform.net' ||
    window.location.protocol === 'file:'
  );
}

export function isStaticDeploymentHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = (window.location.hostname || '').toLowerCase();
  // Only pure static CDN hosts without fullstack server capability
  return (
    host.endsWith('github.io') ||
    host.endsWith('.surge.sh') ||
    host.endsWith('.gitlab.io') ||
    host.endsWith('.pages.dev')
  );
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. If user configured a custom cloud domain / URL:
    const custom = getCustomCloudUrl();
    if (custom) {
      return custom;
    }

    // 2. Inside Android local asset WebView (file:// or appassets.androidplatform.net)
    if (isAndroidWebView()) {
      return DEFAULT_CLOUD_BASE_URL;
    }

    // 3. If running via HTTP or HTTPS (web browser, Firebase App Hosting, Cloud Run, Preview)
    if (window.location.protocol.startsWith('http') && window.location.hostname !== 'appassets.androidplatform.net') {
      return window.location.origin;
    }

    // 4. Pure static hosting without backend
    if (isStaticDeploymentHost()) {
      return DEFAULT_CLOUD_BASE_URL;
    }
  }
  // Fallback
  return DEFAULT_CLOUD_BASE_URL;
}

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const custom = getCustomCloudUrl();
  if (custom) {
    return `${custom}${cleanEndpoint}`;
  }
  if (isAndroidWebView()) {
    return `${DEFAULT_CLOUD_BASE_URL}${cleanEndpoint}`;
  }
  // On web (HTTP/HTTPS), use same-origin relative path so it seamlessly works on Preview, App Hosting, custom domains
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    if (isStaticDeploymentHost()) {
      return `${DEFAULT_CLOUD_BASE_URL}${cleanEndpoint}`;
    }
    return cleanEndpoint;
  }
  return `${DEFAULT_CLOUD_BASE_URL}${cleanEndpoint}`;
}

export function isTokenExpired(token: string): boolean {
  if (!token || typeof token !== 'string') return true;
  try {
    const trimmed = token.trim();
    const parts = trimmed.split('.');
    // Standard application bearer tokens must be valid 3-part JWTs (Firebase ID Token or HMAC Session Token)
    if (parts.length === 3) {
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padLen = (4 - (base64.length % 4)) % 4;
      base64 = base64.padEnd(base64.length + padLen, '=');
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonStr);
      if (payload.exp && payload.exp * 1000 <= Date.now()) {
        return true;
      }
      return false;
    }
  } catch {}
  // Arbitrary non-JWT strings or malformed tokens are treated as invalid/expired
  return true;
}

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const directCandidates = [
      localStorage.getItem('reporter_auth_token'),
      localStorage.getItem('auth_token'),
      localStorage.getItem('token'),
      localStorage.getItem('firebase_token'),
      sessionStorage.getItem('reporter_auth_token'),
      sessionStorage.getItem('auth_token'),
      sessionStorage.getItem('token'),
    ];
    for (const cand of directCandidates) {
      if (cand && typeof cand === 'string' && !isTokenExpired(cand)) {
        return cand.trim();
      }
    }
    const sessionKeys = ['reporter_auth_session', 'ai_news_user', 'user', 'currentUser'];
    for (const key of sessionKeys) {
      const sessionStr = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (sessionStr) {
        const u = JSON.parse(sessionStr);
        if (u) {
          const t = u.token || u.authToken || u.idToken || u.firebaseToken;
          if (t && typeof t === 'string' && !isTokenExpired(t)) return t.trim();
        }
      }
    }
  } catch {}
  return '';
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (token && typeof token === 'string') {
      const clean = token.trim();
      localStorage.setItem('reporter_auth_token', clean);
      localStorage.setItem('auth_token', clean);
      localStorage.setItem('token', clean);
      try {
        const sessStr = localStorage.getItem('reporter_auth_session');
        if (sessStr) {
          const sess = JSON.parse(sessStr);
          sess.token = clean;
          localStorage.setItem('reporter_auth_session', JSON.stringify(sess));
        }
      } catch {}
    } else {
      localStorage.removeItem('reporter_auth_token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
    }
  } catch {}
}

export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('reporter_auth_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
  } catch {}
}

let ongoingAuthPromise: Promise<string> | null = null;

/**
 * Enterprise Automatic Session Token Assurance:
 * 1. Prefers a valid Firebase ID Token retrieved via official Firebase Auth Web SDK (currentUser.getIdToken()).
 * 2. Attempts controlled refresh via /api/auth/refresh-session if session token is close to expiry.
 * 3. Never knowingly returns an expired token as a bearer credential.
 * 4. Preserves active reporter/admin session without erasing localStorage on transient network hiccups.
 */
export async function ensureAuthToken(forceRefresh = false): Promise<string> {
  if (typeof window === 'undefined') return '';

  const existing = getAuthToken();
  if (existing && !forceRefresh && !isTokenExpired(existing)) {
    return existing;
  }

  if (ongoingAuthPromise) {
    return ongoingAuthPromise;
  }

  ongoingAuthPromise = (async () => {
    try {
      let email = '';
      let name = '';
      let username = '';

      try {
        const sessStr = localStorage.getItem('reporter_auth_session') || localStorage.getItem('ai_news_user');
        if (sessStr) {
          const sess = JSON.parse(sessStr);
          email = (sess?.email || '').toLowerCase().trim();
          name = sess?.name || sess?.fullName || '';
          username = sess?.username || '';
        }
      } catch {}

      // 1. Primary Preference: Firebase Auth Web SDK supported token retrieval & refresh
      try {
        const { auth } = await import('./firebaseConfig');
        if (auth) {
          if (typeof (auth as any).authStateReady === 'function') {
            await (auth as any).authStateReady().catch(() => {});
          }
          if (auth.currentUser) {
            const firebaseIdToken = await auth.currentUser.getIdToken(forceRefresh);
            if (firebaseIdToken && !isTokenExpired(firebaseIdToken)) {
              setAuthToken(firebaseIdToken);
              return firebaseIdToken;
            }
          }
        }
      } catch (fbErr) {
        console.warn('[AUTH] Firebase client token refresh notice:', fbErr);
      }

      // 2. Secondary Preference: Backend /api/auth/refresh-session if unexpired session token exists
      const existingToken = getAuthToken();
      if (existingToken && !isTokenExpired(existingToken)) {
        try {
          const refRes = await fetch(getApiUrl('/api/auth/refresh-session'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${existingToken}`,
            },
            body: JSON.stringify({
              email,
              token: existingToken,
              authToken: existingToken,
            }),
          });
          if (refRes.ok) {
            const refData = await refRes.json();
            if (refData.success && refData.token && !isTokenExpired(refData.token)) {
              setAuthToken(refData.token);
              return refData.token;
            }
          }
        } catch (refErr) {
          console.warn('[AUTH] refresh-session attempt notice:', refErr);
        }
      }

      // 3. Fallback: Controlled exchange if valid candidate ID token is stored
      let googleIdToken = '';
      try {
        const storedGId = localStorage.getItem('google_id_token') || '';
        if (storedGId && !isTokenExpired(storedGId)) {
          googleIdToken = storedGId;
        }
      } catch {}

      if (googleIdToken && (email || (typeof window !== 'undefined' && localStorage.getItem('reporter_auth_session')))) {
        try {
          const res = await fetch(getApiUrl('/api/auth/login'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${googleIdToken}`,
            },
            body: JSON.stringify({
              identifier: email || undefined,
              idToken: googleIdToken,
              firebaseToken: googleIdToken,
              profileData: { email, name, username },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.token && !isTokenExpired(data.token)) {
              setAuthToken(data.token);
              return data.token;
            }
          }
        } catch (exErr) {
          console.warn('[AUTH] login exchange notice:', exErr);
        }
      }
    } catch (err) {
      console.warn('[AUTH] ensureAuthToken exchange error:', err);
    } finally {
      ongoingAuthPromise = null;
    }
    // Never knowingly return an expired token; return empty string if no valid token could be acquired
    return getAuthToken();
  })();

  return ongoingAuthPromise;
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token && !isTokenExpired(token)) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function getAdminAuthHeaders(): Record<string, string> {
  const headers = getAuthHeaders();
  let adminEmail = '';
  try {
    const sessStr = localStorage.getItem('reporter_auth_session') || localStorage.getItem('ai_news_user');
    if (sessStr) {
      const sess = JSON.parse(sessStr);
      adminEmail = (sess?.email || '').toLowerCase().trim();
    }
  } catch {}
  if (!adminEmail) adminEmail = 'breakingnewswala.com@gmail.com';
  headers['x-admin-email'] = adminEmail;
  return headers;
}

export async function getAdminAuthHeadersAsync(): Promise<Record<string, string>> {
  let token = await ensureAuthToken().catch(() => '');
  if (!token || isTokenExpired(token)) {
    token = await ensureAuthToken(true).catch(() => '');
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  let adminEmail = '';
  try {
    const sessStr = localStorage.getItem('reporter_auth_session') || localStorage.getItem('ai_news_user');
    if (sessStr) {
      const sess = JSON.parse(sessStr);
      adminEmail = (sess?.email || '').toLowerCase().trim();
    }
  } catch {}
  if (!adminEmail) adminEmail = 'breakingnewswala.com@gmail.com';
  headers['x-admin-email'] = adminEmail;
  return headers;
}

// Enterprise Automatic Token Injection: Attach Authorization header to all internal API requests if authenticated
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  try {
    const originalFetch = window.fetch.bind(window);
    const customFetch = async function (this: any, input: RequestInfo | URL, init?: RequestInit) {
      const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : ((input as any)?.url || ''));
      if (urlStr.includes('/api/')) {
        let token = getAuthToken();
        const isProtectedApi =
          urlStr.includes('/api/admin') ||
          urlStr.includes('/api/dynamic-frames') ||
          urlStr.includes('/api/process-news') ||
          urlStr.includes('/api/generate-video') ||
          urlStr.includes('/api/rss-sync') ||
          urlStr.includes('/api/scheduler/rss-sync') ||
          urlStr.includes('/api/user-profile');

        // Check and sanitize caller-supplied Authorization header
        let existingAuth = '';
        if (init?.headers) {
          if (init.headers instanceof Headers) {
            existingAuth = init.headers.get('Authorization') || '';
          } else if (Array.isArray(init.headers)) {
            const found = init.headers.find(([k]) => k.toLowerCase() === 'authorization');
            if (found) existingAuth = found[1];
          } else {
            existingAuth = (init.headers as any)?.Authorization || (init.headers as any)?.authorization || '';
          }
        }
        if (existingAuth && existingAuth.startsWith('Bearer ')) {
          const cand = existingAuth.slice(7).trim();
          if (isTokenExpired(cand)) {
            if (init!.headers instanceof Headers) {
              init!.headers.delete('Authorization');
            } else if (Array.isArray(init!.headers)) {
              init!.headers = init!.headers.filter(([k]) => k.toLowerCase() !== 'authorization');
            } else {
              delete (init!.headers as any).Authorization;
              delete (init!.headers as any).authorization;
            }
          }
        }

        if ((!token || isTokenExpired(token)) && isProtectedApi) {
          try {
            token = await ensureAuthToken();
          } catch {}
        }
        if (token && !isTokenExpired(token)) {
          init = init || {};
          if (init.headers instanceof Headers) {
            init.headers.set('Authorization', `Bearer ${token}`);
          } else if (Array.isArray(init.headers)) {
            init.headers = init.headers.filter(([k]) => k.toLowerCase() !== 'authorization');
            init.headers.push(['Authorization', `Bearer ${token}`]);
          } else {
            const h = { ...(init.headers || {}) } as any;
            h.Authorization = `Bearer ${token}`;
            init.headers = h;
          }
        }
      }
      let response = await originalFetch(input, init);
      // Controlled 401 Recovery: Refresh once and retry the original request exactly once
      const isAlreadyRetried = Boolean((init as any)?._is401Retry);
      if (response.status === 401 && !isAlreadyRetried && isProtectedApi) {
        try {
          const fresh = await ensureAuthToken(true);
          if (fresh && !isTokenExpired(fresh)) {
            const retryInit = { ...(init || {}), _is401Retry: true };
            if (retryInit.headers instanceof Headers) {
              retryInit.headers.set('Authorization', `Bearer ${fresh}`);
            } else if (Array.isArray(retryInit.headers)) {
              retryInit.headers = retryInit.headers.filter(([k]) => k.toLowerCase() !== 'authorization');
              retryInit.headers.push(['Authorization', `Bearer ${fresh}`]);
            } else {
              retryInit.headers = {
                ...(retryInit.headers || {}),
                Authorization: `Bearer ${fresh}`,
              };
            }
            response = await originalFetch(input, retryInit);
          }
        } catch {}
      }
      // Auto-capture and persist refreshed token from server header
      try {
        const refreshed = response?.headers?.get?.('x-refreshed-token');
        if (refreshed) {
          setAuthToken(refreshed);
        }
      } catch {}
      return response;
    };

    const desc = Object.getOwnPropertyDescriptor(window, 'fetch') || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');
    const canDefine = !desc || desc.configurable || desc.writable || Boolean(desc.set);
    if (canDefine) {
      try {
        Object.defineProperty(window, 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true,
        });
      } catch {
        // Window.fetch in this context cannot be redefined (e.g. strict sandboxed iframe). Skip silently.
      }
    }
  } catch {
    // Fail silently in environments where window.fetch is protected
  }
}
