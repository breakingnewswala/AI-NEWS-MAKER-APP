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
    const parts = token.trim().split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
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
  return false;
}

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const direct =
      localStorage.getItem('reporter_auth_token') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('google_id_token') ||
      sessionStorage.getItem('reporter_auth_token') ||
      sessionStorage.getItem('auth_token') ||
      sessionStorage.getItem('token');
    if (direct && !isTokenExpired(direct)) return direct.trim();
    const sessionKeys = ['reporter_auth_session', 'ai_news_user', 'user', 'currentUser'];
    for (const key of sessionKeys) {
      const sessionStr = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (sessionStr) {
        const u = JSON.parse(sessionStr);
        if (u) {
          const t = u.token || u.authToken || u.idToken || u.googleIdToken || u.firebaseToken;
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
    if (token) {
      localStorage.setItem('reporter_auth_token', token.trim());
      localStorage.setItem('auth_token', token.trim());
      localStorage.setItem('token', token.trim());
      try {
        const sessStr = localStorage.getItem('reporter_auth_session');
        if (sessStr) {
          const sess = JSON.parse(sessStr);
          sess.token = token.trim();
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
 * Guarantees a cryptographically verified JWT / HMAC session token is active in localStorage.
 * Automatically exchanges active reporter/admin session with /api/auth/refresh-session or /api/auth/login if token is missing or expired.
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

      const existingToken = getAuthToken();
      let googleAccessToken = '';
      try {
        googleAccessToken = localStorage.getItem('google_access_token') || '';
      } catch {}

      // 1. Primary Seamless Recovery: Call session refresh endpoint if active (unexpired) token exists
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
              accessToken: googleAccessToken || undefined,
            }),
          });
          if (refRes.ok) {
            const refData = await refRes.json();
            if (refData.success && refData.token) {
              setAuthToken(refData.token);
              return refData.token;
            }
          }
        } catch (refErr) {
          console.warn('[AUTH] refresh-session attempt notice:', refErr);
        }
      }

      // 2. Firebase Client Auth Recovery: Await authStateReady and retrieve fresh ID Token from Firebase Web SDK
      let firebaseIdToken = '';
      try {
        const { auth } = await import('./firebaseConfig');
        if (auth) {
          if (typeof (auth as any).authStateReady === 'function') {
            await (auth as any).authStateReady().catch(() => {});
          }
          if (auth.currentUser) {
            firebaseIdToken = (await auth.currentUser.getIdToken(forceRefresh)) || '';
            if (firebaseIdToken && !email && auth.currentUser.email) {
              email = auth.currentUser.email.toLowerCase().trim();
            }
          }
        }
      } catch (fbErr) {
        console.warn('[AUTH] Firebase client token check notice:', fbErr);
      }

      // 3. Google OAuth / GIS Credential Recovery: Check stored google_id_token
      let googleIdToken = '';
      try {
        googleIdToken = localStorage.getItem('google_id_token') || '';
      } catch {}

      const candidateIdToken = firebaseIdToken || googleIdToken || googleAccessToken;
      if (candidateIdToken && (email || (typeof window !== 'undefined' && localStorage.getItem('reporter_auth_session')))) {
        const loginPayload: any = {
          identifier: email || undefined,
          firebaseToken: candidateIdToken,
          idToken: googleIdToken || firebaseIdToken || undefined,
          accessToken: googleAccessToken || undefined,
          profileData: { email, name, username },
        };
        const res = await fetch(getApiUrl('/api/auth/login'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${candidateIdToken}`,
          },
          body: JSON.stringify(loginPayload),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.token) {
            setAuthToken(data.token);
            return data.token;
          }
        }
      }

      // If token is genuinely expired and cannot be refreshed, clear tokens and dispatch expired event
      const currentRaw = (() => {
        try {
          return localStorage.getItem('reporter_auth_token') || '';
        } catch { return ''; }
      })();
      if (currentRaw && isTokenExpired(currentRaw)) {
        clearAuthTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ai_news_session_expired'));
        }
      }
    } catch (err) {
      console.warn('[AUTH] ensureAuthToken exchange notice:', err);
    } finally {
      ongoingAuthPromise = null;
    }
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

        if ((!token || isTokenExpired(token)) && isProtectedApi) {
          try {
            token = await ensureAuthToken();
          } catch {}
        }
        if (token) {
          init = init || {};
          if (init.headers instanceof Headers) {
            init.headers.set('Authorization', `Bearer ${token}`);
          } else if (Array.isArray(init.headers)) {
            init.headers = init.headers.filter(([k]) => k.toLowerCase() !== 'authorization');
            init.headers.push(['Authorization', `Bearer ${token}`]);
          } else {
            init.headers = {
              ...(init.headers || {}),
              Authorization: (init.headers as any)?.Authorization || `Bearer ${token}`,
            };
          }
        }
      }
      let response = await originalFetch(input, init);
      // Auto-retry once on 401 for protected endpoints by acquiring fresh token
      if (response.status === 401 && (urlStr.includes('/api/admin') || urlStr.includes('/api/dynamic-frames') || urlStr.includes('/api/scheduler/rss-sync'))) {
        try {
          const fresh = await ensureAuthToken(true);
          if (fresh) {
            const retryInit = { ...(init || {}) };
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
