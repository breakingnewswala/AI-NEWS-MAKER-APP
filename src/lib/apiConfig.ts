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
  return (
    host.endsWith('github.io') ||
    host.endsWith('.surge.sh') ||
    host.endsWith('.gitlab.io') ||
    host.endsWith('.web.app') ||
    host.endsWith('.firebaseapp.com') ||
    host.endsWith('.pages.dev') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.vercel.app')
  );
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. If user configured a custom cloud domain / URL:
    const custom = getCustomCloudUrl();
    if (custom) {
      return custom;
    }

    // 2. If running on known pure static host without backend
    if (isStaticDeploymentHost()) {
      return DEFAULT_CLOUD_BASE_URL;
    }

    // 3. If running via HTTP or HTTPS (web browser or WebView navigating web URL), use current origin
    if (window.location.protocol.startsWith('http') && window.location.hostname !== 'appassets.androidplatform.net') {
      return window.location.origin;
    }

    // 4. Inside Android local asset WebView (file:// or appassets.androidplatform.net)
    if (isAndroidWebView()) {
      return DEFAULT_CLOUD_BASE_URL;
    }
  }
  // Fallback
  return DEFAULT_CLOUD_BASE_URL;
}

export function getApiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const custom = getCustomCloudUrl();
  if (custom) {
    return `${custom}${cleanEndpoint}`;
  }
  // If running on a static host or inside Android WebView without custom cloud, use base
  if (isStaticDeploymentHost() || isAndroidWebView()) {
    return `${base}${cleanEndpoint}`;
  }
  // If running in browser with same origin and backend available
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    return cleanEndpoint;
  }
  return `${base}${cleanEndpoint}`;
}

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const direct = localStorage.getItem('reporter_auth_token');
    if (direct) return direct.trim();
    const session = localStorage.getItem('reporter_auth_session');
    if (session) {
      const u = JSON.parse(session);
      if (u.token) return u.token.trim();
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
