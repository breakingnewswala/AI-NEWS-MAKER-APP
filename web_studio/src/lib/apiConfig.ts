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

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const direct = localStorage.getItem('reporter_auth_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (direct) return direct.trim();
    const sessionStr = localStorage.getItem('reporter_auth_session') || localStorage.getItem('ai_news_user');
    if (sessionStr) {
      const u = JSON.parse(sessionStr);
      if (u && u.token) return String(u.token).trim();
    }
  } catch {}
  return '';
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem('reporter_auth_token', token.trim());
    } else {
      localStorage.removeItem('reporter_auth_token');
    }
  } catch {}
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function getAdminAuthHeaders(): Record<string, string> {
  return getAuthHeaders();
}

// Enterprise Automatic Token Injection: Attach Authorization header to all internal API requests if authenticated
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : ((input as any)?.url || ''));
    if (urlStr.includes('/api/')) {
      const token = getAuthToken();
      if (token) {
        init = init || {};
        if (init.headers instanceof Headers) {
          if (!init.headers.has('Authorization')) {
            init.headers.set('Authorization', `Bearer ${token}`);
          }
        } else if (Array.isArray(init.headers)) {
          const hasAuth = init.headers.some(([k]) => k.toLowerCase() === 'authorization');
          if (!hasAuth) {
            init.headers.push(['Authorization', `Bearer ${token}`]);
          }
        } else {
          init.headers = {
            ...(init.headers || {}),
            Authorization: (init.headers as any)?.Authorization || `Bearer ${token}`,
          };
        }
      }
    }
    return originalFetch.call(this, input, init);
  };
}
