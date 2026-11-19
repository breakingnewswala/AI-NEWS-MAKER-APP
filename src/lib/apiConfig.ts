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

// Re-export all auth functions from single authoritative authService
export {
  parseJwtPayload,
  isTokenExpired,
  getStoredGoogleIdToken,
  getStoredRawToken,
  getAuthToken,
  setAuthToken,
  clearAuthTokens,
  isAuthReady,
  initAuthReady,
  getValidToken,
  getAuthHeaders,
  getAdminAuthHeaders,
  getAdminAuthHeadersAsync,
} from './authService';

import {
  parseJwtPayload,
  isTokenExpired,
  getStoredGoogleIdToken,
  getStoredRawToken,
  getAuthToken,
  setAuthToken,
  clearAuthTokens,
  isAuthReady,
  initAuthReady,
  getValidToken,
  ensureAuthToken as authoritativeEnsureAuthToken,
  getAuthHeaders,
  getAdminAuthHeaders,
  getAdminAuthHeadersAsync,
} from './authService';

/**
 * Enterprise Automatic Session Token Assurance (Re-exported from centralized authService):
 * 1. Prefers a valid Firebase ID Token retrieved via official Firebase Auth Web SDK (currentUser.getIdToken()).
 *    setAuthToken(firebaseIdToken) candidate registration fallback
 *    return firebaseIdToken;
 * 2. Attempts controlled refresh via /api/auth/refresh-session if session token is close to expiry:
 *    (isNearExpiry || isExpired || forceRefresh)
 * 3. Never knowingly returns an expired token as a bearer credential (verified via parseJwtPayload).
 * 4. Preserves active reporter/admin session without erasing localStorage on transient network hiccups.
 */
export async function ensureAuthToken(forceRefresh = false): Promise<string> {
  return authoritativeEnsureAuthToken(forceRefresh);
}

export function isProtectedApiUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('/api/admin') ||
    url.includes('/api/dynamic-frames') ||
    url.includes('/api/ai/') ||
    url.includes('/api/user-payments') ||
    url.includes('/api/process-news') ||
    url.includes('/api/generate-video') ||
    url.includes('/api/rss-sync') ||
    url.includes('/api/scheduler/rss-sync') ||
    url.includes('/api/user-profile') ||
    url.includes('/api/convert-web-to-rss')
  );
}

// Throttled auth notification timestamp to prevent concurrent event flooding
let lastAdminAuthEventDispatched = 0;

// Track explicit user interaction to prevent false admin auth modals on initialization/background checks
if (typeof window !== 'undefined') {
  const markUserInteracted = () => {
    (window as any).__ai_news_user_interacted = true;
    try {
      if (document.body) {
        document.body.dataset.userInteracted = 'true';
      }
    } catch {}
  };
  window.addEventListener('click', markUserInteracted, { passive: true, capture: true });
  window.addEventListener('keydown', markUserInteracted, { passive: true, capture: true });
  window.addEventListener('touchstart', markUserInteracted, { passive: true, capture: true });

  // Maintain __AI_NEWS_ACTIVE_TAB tracking to accurately suppress admin auth notifications when not on an admin view
  const syncActiveTab = (tab?: string) => {
    if (tab) {
      (window as any).__AI_NEWS_ACTIVE_TAB = tab;
      (window as any).__ai_news_active_tab = tab;
      return;
    }
    try {
      const saved = localStorage.getItem('last_active_tab');
      if (saved) {
        (window as any).__AI_NEWS_ACTIVE_TAB = saved;
        (window as any).__ai_news_active_tab = saved;
        return;
      }
    } catch {}
    const path = (window.location.pathname || '').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    if (path.includes('admin') || hash.includes('admin')) {
      (window as any).__AI_NEWS_ACTIVE_TAB = 'admin';
    } else if (path.includes('studio') || hash.includes('studio')) {
      (window as any).__AI_NEWS_ACTIVE_TAB = 'studio';
    } else if (path.includes('video') || hash.includes('video')) {
      (window as any).__AI_NEWS_ACTIVE_TAB = 'videos';
    } else if (path.includes('newsroom') || hash.includes('newsroom')) {
      (window as any).__AI_NEWS_ACTIVE_TAB = 'newsroom';
    } else if (path.includes('profile') || hash.includes('profile')) {
      (window as any).__AI_NEWS_ACTIVE_TAB = 'profile';
    } else {
      (window as any).__AI_NEWS_ACTIVE_TAB = 'home';
    }
    (window as any).__ai_news_active_tab = (window as any).__AI_NEWS_ACTIVE_TAB;
  };

  syncActiveTab();
  window.addEventListener('popstate', () => syncActiveTab(), { passive: true });
  window.addEventListener('hashchange', () => syncActiveTab(), { passive: true });
  window.addEventListener('ai_news_tab_changed', ((e: CustomEvent) => {
    if (e.detail?.tab) syncActiveTab(e.detail.tab);
  }) as EventListener, { passive: true });
}

// Enterprise Automatic Token Injection: Attach Authorization header to all internal API requests if authenticated
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  try {
    const originalFetch = window.fetch.bind(window);
    const customFetch = async function (this: any, input: RequestInfo | URL, init?: RequestInit) {
      const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : ((input as any)?.url || ''));
      const isProtectedApi = isProtectedApiUrl(urlStr);
      const isAuthRoute = urlStr.includes('/api/auth/login') || urlStr.includes('/api/auth/refresh-session');
      const isPasswordLogin = isAuthRoute && typeof init?.body === 'string' && init.body.includes('"password"');

      // Multipart Upload Protection: Never force application/json on FormData bodies so browser sets multipart boundary
      if (init?.body instanceof FormData && init.headers) {
        if (init.headers instanceof Headers) {
          init.headers.delete('Content-Type');
          init.headers.delete('content-type');
        } else if (Array.isArray(init.headers)) {
          init.headers = init.headers.filter(([k]) => k.toLowerCase() !== 'content-type');
        } else {
          delete (init.headers as any)['Content-Type'];
          delete (init.headers as any)['content-type'];
        }
      }

      if (urlStr.includes('/api/')) {
        let token = getAuthToken();

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

        // If explicit credentials/password login, never send Authorization header
        if (isPasswordLogin) {
          if (init?.headers instanceof Headers) {
            init.headers.delete('Authorization');
          } else if (Array.isArray(init?.headers)) {
            init.headers = init.headers.filter(([k]) => k.toLowerCase() !== 'authorization');
          } else if (init?.headers) {
            delete (init.headers as any).Authorization;
            delete (init.headers as any).authorization;
          }
        } else {
          // If caller provided an expired bearer token, remove it
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
          if (token && !isTokenExpired(token) && !isAuthRoute) {
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
      }

      // Re-verify multipart FormData headers before dispatching fetch
      if (init?.body instanceof FormData && init.headers) {
        if (init.headers instanceof Headers) {
          init.headers.delete('Content-Type');
          init.headers.delete('content-type');
        } else if (Array.isArray(init.headers)) {
          init.headers = init.headers.filter(([k]) => k.toLowerCase() !== 'content-type');
        } else {
          delete (init.headers as any)['Content-Type'];
          delete (init.headers as any)['content-type'];
        }
      }

      let response = await originalFetch(input, init);
      // Controlled 401 Recovery: Refresh once and retry the original request exactly once
      // NEVER retry on 403 Forbidden responses (authorization failures should not enter refresh loops)
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
            if (retryInit.body instanceof FormData && retryInit.headers) {
              if (retryInit.headers instanceof Headers) {
                retryInit.headers.delete('Content-Type');
                retryInit.headers.delete('content-type');
              } else if (Array.isArray(retryInit.headers)) {
                retryInit.headers = retryInit.headers.filter(([k]) => k.toLowerCase() !== 'content-type');
              } else {
                delete (retryInit.headers as any)['Content-Type'];
                delete (retryInit.headers as any)['content-type'];
              }
            }
            response = await originalFetch(input, retryInit);
          }
        } catch {}
        if (response.status === 401) {
          const isAdminEndpoint = urlStr.includes('/api/admin') || urlStr.includes('/api/master-admin');
          if (isAdminEndpoint) {
            // Check if active session user actually has admin privileges
            let isUserAnAdmin = false;
            try {
              const raw = localStorage.getItem('reporter_auth_session') || localStorage.getItem('ai_news_user');
              if (raw) {
                const u = JSON.parse(raw);
                isUserAnAdmin = Boolean(
                  u.role === 'admin' ||
                  u.role === 'superadmin' ||
                  u.email === 'breakingnewswala.com@gmail.com' ||
                  u.isAdmin
                );
              }
            } catch {}

            // NEVER call clearAuthTokens() on 401! Clearing tokens wipes localStorage on transient 401s.
            // Check if active tab is specifically an Admin dashboard and user has performed an explicit interaction
            const activeTab = (typeof window !== 'undefined' && ((window as any).__AI_NEWS_ACTIVE_TAB || (window as any).__ai_news_active_tab || localStorage.getItem('last_active_tab'))) || '';
            const isTabAdmin = activeTab === 'admin' || (typeof window !== 'undefined' && (window.location.hash === '#admin' || window.location.pathname.startsWith('/admin')));
            const isExplicitUserAction = typeof window !== 'undefined' && Boolean((window as any).__ai_news_user_interacted || document.body?.dataset?.userInteracted);
            const isPublicOrInit = !isTabAdmin || !isExplicitUserAction || urlStr.includes('/api/home-feed-retention') || urlStr.includes('/api/admin/home-feed-retention');

            if (isUserAnAdmin && isTabAdmin && isExplicitUserAction && !isPublicOrInit) {
              try {
                const now = Date.now();
                if (now - lastAdminAuthEventDispatched > 8000) {
                  lastAdminAuthEventDispatched = now;
                  window.dispatchEvent(new CustomEvent('ai_news_admin_auth_required', { detail: { url: urlStr } }));
                }
              } catch {}
            } else {
              // Non-admin or background check or not on admin tab: NEVER clear tokens and NEVER toast admin auth
              console.warn('[AUTH] Admin endpoint 401 ignored for regular user (or inactive admin tab / background check):', urlStr);
            }
          } else {
            // For normal reporter/user endpoints: NEVER call clearAuthTokens() on transient 401
            try {
              window.dispatchEvent(new CustomEvent('ai_news_session_expired', { detail: { url: urlStr } }));
            } catch {}
          }
        }
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
