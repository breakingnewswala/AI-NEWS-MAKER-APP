/**
 * AI News Maker - Centralized Authoritative Authentication Service
 * Single authoritative source of truth for Firebase Auth Web SDK lifecycle,
 * token caching, Android WebView bridge session hydration, and request headers.
 */

import { auth } from './firebaseConfig';
import { getApiUrl } from './apiConfig';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// In-memory token cache to eliminate redundant storage lookups & parsing
let cachedToken = '';
let cachedTokenExp = 0;

// Singleton promise for auth readiness to eliminate initialization races
let authReadyPromise: Promise<boolean> | null = null;
let isAuthSettled = false;

// Ongoing ensureAuthToken promise to deduplicate concurrent refresh calls
let ongoingAuthPromise: Promise<string> | null = null;

export function parseJwtPayload(token: string): any | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const trimmed = token.trim();
    const parts = trimmed.split('.');
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
      return JSON.parse(jsonStr);
    }
  } catch {}
  return null;
}

export function isTokenExpired(token: string): boolean {
  if (!token || typeof token !== 'string') return true;
  try {
    const payload = parseJwtPayload(token);
    if (payload) {
      // 60-second safety buffer before expiry to refresh before timeout
      if (payload.exp && (payload.exp * 1000 - 60000) <= Date.now()) {
        return true;
      }
      return false;
    }
  } catch {}
  // Arbitrary non-JWT strings or malformed tokens are treated as invalid/expired
  return true;
}

export function getStoredGoogleIdToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (
      localStorage.getItem('google_id_token') ||
      localStorage.getItem('google_access_token') ||
      sessionStorage.getItem('google_id_token') ||
      ''
    );
  } catch {
    return '';
  }
}

/**
 * Retrieves raw candidate token from storage regardless of expiration.
 * Used for cryptographic token renewal via /api/auth/refresh-session.
 */
export function getStoredRawToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const directCandidates = [
      localStorage.getItem('reporter_auth_token'),
      localStorage.getItem('auth_token'),
      localStorage.getItem('token'),
      sessionStorage.getItem('reporter_auth_token'),
      sessionStorage.getItem('auth_token'),
      sessionStorage.getItem('token'),
    ];
    for (const cand of directCandidates) {
      if (cand && typeof cand === 'string') {
        const trimmed = cand.trim();
        if (trimmed.split('.').length === 3) {
          return trimmed;
        }
      }
    }
    const sessionKeys = ['reporter_auth_session', 'ai_news_user', 'user', 'currentUser'];
    for (const key of sessionKeys) {
      const sessionStr = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (sessionStr) {
        const u = JSON.parse(sessionStr);
        if (u) {
          const t = u.token || u.authToken;
          if (t && typeof t === 'string') {
            const trimmed = t.trim();
            if (trimmed.split('.').length === 3) {
              return trimmed;
            }
          }
        }
      }
    }
  } catch {}
  return '';
}

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';

  // 1. Check in-memory cache first if valid
  if (cachedToken && !isTokenExpired(cachedToken)) {
    return cachedToken;
  }

  try {
    const directCandidates = [
      localStorage.getItem('reporter_auth_token'),
      localStorage.getItem('auth_token'),
      localStorage.getItem('token'),
      sessionStorage.getItem('reporter_auth_token'),
      sessionStorage.getItem('auth_token'),
      sessionStorage.getItem('token'),
    ];
    for (const cand of directCandidates) {
      if (cand && typeof cand === 'string' && !isTokenExpired(cand)) {
        cachedToken = cand.trim();
        return cachedToken;
      }
    }
    const sessionKeys = ['reporter_auth_session', 'ai_news_user', 'user', 'currentUser'];
    for (const key of sessionKeys) {
      const sessionStr = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (sessionStr) {
        const u = JSON.parse(sessionStr);
        if (u) {
          const t = u.token || u.authToken;
          if (t && typeof t === 'string' && !isTokenExpired(t)) {
            cachedToken = t.trim();
            return cachedToken;
          }
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
      cachedToken = clean;
      const payload = parseJwtPayload(clean);
      cachedTokenExp = payload?.exp ? payload.exp * 1000 : 0;

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
      cachedToken = '';
      cachedTokenExp = 0;
      localStorage.removeItem('reporter_auth_token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
    }
  } catch {}
}

export function clearAuthTokens(): void {
  cachedToken = '';
  cachedTokenExp = 0;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('reporter_auth_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    sessionStorage.removeItem('reporter_auth_token');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('token');
    const sessionKeys = ['reporter_auth_session', 'ai_news_user'];
    for (const key of sessionKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            delete parsed.token;
            delete parsed.authToken;
            delete parsed.idToken;
            localStorage.setItem(key, JSON.stringify(parsed));
          }
        }
      } catch {}
    }
  } catch {}
}

/**
 * Initializes and synchronizes with Firebase Auth Web SDK lifecycle
 * and Android WebView Bridge. Returns a singleton promise that callers can await.
 */
export function initAuthReady(): Promise<boolean> {
  if (authReadyPromise) return authReadyPromise;
  if (typeof window === 'undefined') return Promise.resolve(true);

  authReadyPromise = (async () => {
    try {
      // 1. Android WebView Bridge Check
      if ((window as any).AndroidBridge && typeof (window as any).AndroidBridge.getUserSession === 'function') {
        try {
          const nativeSessionStr = (window as any).AndroidBridge.getUserSession();
          if (nativeSessionStr && nativeSessionStr.trim() !== '{}') {
            const nativeSession = JSON.parse(nativeSessionStr);
            if (nativeSession && typeof nativeSession === 'object') {
              const nativeToken = nativeSession.token || nativeSession.authToken;
              if (nativeToken && typeof nativeToken === 'string' && !isTokenExpired(nativeToken)) {
                setAuthToken(nativeToken);
              }
              const currentSaved = localStorage.getItem('reporter_auth_session');
              if (!currentSaved) {
                localStorage.setItem('reporter_auth_session', JSON.stringify(nativeSession));
              }
            }
          }
        } catch (bridgeErr) {
          console.warn('[AUTH-SERVICE] AndroidBridge session hydration notice:', bridgeErr);
        }
      }

      // 2. Synchronize with Firebase Auth authStateReady()
      if (auth && typeof (auth as any).authStateReady === 'function') {
        await Promise.race([
          (auth as any).authStateReady(),
          new Promise((r) => setTimeout(r, 1500)),
        ]).catch((err: any) => {
          console.warn('[AUTH-SERVICE] authStateReady error:', err);
        });
      }

      isAuthSettled = true;
      return true;
    } catch (err) {
      console.warn('[AUTH-SERVICE] initAuthReady error:', err);
      isAuthSettled = true;
      return false;
    }
  })();

  return authReadyPromise;
}

/**
 * Checks whether Firebase authentication lifecycle is ready.
 */
export async function isAuthReady(): Promise<boolean> {
  if (isAuthSettled) return true;
  return initAuthReady();
}

/**
 * Authoritative getValidToken:
 * Retrieves a valid, non-expired Bearer token.
 * 1. Checks memory cache and localStorage.
 * 2. Awaits authStateReady() to avoid premature execution.
 * 3. Retrieves fresh Firebase ID token if available and exchanges with server.
 * 4. Falls back cleanly to firebaseIdToken or existing valid session without dropping credentials.
 */
export async function getValidToken(forceRefresh = false): Promise<string> {
  return ensureAuthToken(forceRefresh);
}

/**
 * Authoritative ensureAuthToken:
 * Guarantees a valid Bearer token for protected API calls.
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
      // Ensure auth initialization has settled first
      await isAuthReady();

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

      // 1. Primary Preference: Firebase Auth Web SDK currentUser
      if (auth && auth.currentUser) {
        try {
          const firebaseIdToken = await auth.currentUser.getIdToken(forceRefresh).catch(() => '');
          if (firebaseIdToken && !isTokenExpired(firebaseIdToken)) {
            // Attempt exchange with server /api/auth/login to obtain durable 14-day session token
            try {
              const exRes = await fetch(getApiUrl('/api/auth/login'), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${firebaseIdToken}`,
                },
                body: JSON.stringify({
                  identifier: email || auth.currentUser.email || undefined,
                  firebaseToken: firebaseIdToken,
                  idToken: firebaseIdToken,
                  profileData: { email: email || auth.currentUser.email, name, username },
                }),
              });

              if (exRes.ok) {
                const exData = await exRes.json();
                if (exData.success && exData.token && !isTokenExpired(exData.token)) {
                  setAuthToken(exData.token);
                  return exData.token;
                }
              }
            } catch (exErr) {
              console.warn('[AUTH-SERVICE] Firebase token exchange notice:', exErr);
            }

            // Fallback: If /api/auth/login exchange is delayed, errors, or fails,
            // DO NOT RETURN EMPTY STRING! Return firebaseIdToken directly as bearer credential!
            return firebaseIdToken;
          }
        } catch (fbErr) {
          console.warn('[AUTH-SERVICE] Firebase client token refresh notice:', fbErr);
        }
      }

      // 2. Secondary Preference: Stored session token (near-expiry or expired check with /api/auth/refresh-session)
      let existingToken = getAuthToken();
      if (!existingToken) {
        existingToken = getStoredRawToken();
      }
      if (existingToken) {
        const payload = parseJwtPayload(existingToken);
        const exp = payload?.exp ? payload.exp * 1000 : 0;
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const isNearExpiry = exp ? (exp - Date.now() < twentyFourHours) : false;
        const isExpired = isTokenExpired(existingToken);

        if (isNearExpiry || isExpired || forceRefresh) {
          try {
            const googleIdTok = getStoredGoogleIdToken();
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
                idToken: googleIdTok || existingToken,
              }),
            });
            if (refRes.ok) {
              const refData = await refRes.json();
              if (refData.success && refData.token && !isTokenExpired(refData.token)) {
                setAuthToken(refData.token);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('ai_news_admin_auth_success', {
                      detail: { token: refData.token, user: refData.user },
                    })
                  );
                }
                return refData.token;
              }
            }
          } catch (refErr) {
            console.warn('[AUTH-SERVICE] refresh-session attempt notice:', refErr);
          }
        }

        if (!isExpired) {
          return existingToken;
        }
      }

      // 3. Fallback: Controlled exchange if valid candidate ID token is stored
      let googleIdToken = getStoredGoogleIdToken();
      if (googleIdToken && isTokenExpired(googleIdToken)) {
        googleIdToken = '';
      }

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
          console.warn('[AUTH-SERVICE] login exchange notice:', exErr);
        }
        return googleIdToken;
      }
    } catch (err) {
      console.warn('[AUTH-SERVICE] ensureAuthToken exchange error:', err);
    } finally {
      ongoingAuthPromise = null;
    }

    const finalToken = getAuthToken();
    return finalToken && !isTokenExpired(finalToken) ? finalToken : '';
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

/**
 * Authoritative Interactive Admin Reauthentication
 * Eliminates the obsolete Admin password login modal.
 * Uses official Firebase Google Sign-In with automatic retry and event propagation.
 */
export async function reauthenticateAdmin(onSuccess?: () => void): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    await isAuthReady();

    // 1. If Firebase currentUser already exists, try silent token refresh first
    if (auth && auth.currentUser) {
      try {
        const freshIdTok = await auth.currentUser.getIdToken(true);
        if (freshIdTok && !isTokenExpired(freshIdTok)) {
          setAuthToken(freshIdTok);
          let durableToken = freshIdTok;
          try {
            const exRes = await fetch(getApiUrl('/api/auth/login'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${freshIdTok}`,
              },
              body: JSON.stringify({
                identifier: auth.currentUser.email || undefined,
                firebaseToken: freshIdTok,
                idToken: freshIdTok,
                profileData: {
                  email: auth.currentUser.email,
                  name: auth.currentUser.displayName || 'मास्टर एडमिन',
                },
              }),
            });
            if (exRes.ok) {
              const exData = await exRes.json();
              if (exData.success && exData.token) {
                durableToken = exData.token;
                setAuthToken(durableToken);
                localStorage.setItem('reporter_auth_token', durableToken);
                localStorage.setItem('auth_token', durableToken);
                if (exData.user) {
                  localStorage.setItem('reporter_auth_session', JSON.stringify(exData.user));
                }
              }
            }
          } catch {}

          window.dispatchEvent(
            new CustomEvent('ai_news_admin_auth_success', {
              detail: { token: durableToken, user: auth.currentUser },
            })
          );
          if (onSuccess) onSuccess();
          return true;
        }
      } catch (tokErr) {
        console.warn('[REAUTH] currentUser getIdToken error, falling back to Google popup:', tokErr);
      }
    }

    // 2. Trigger primary approved Google Sign-In popup
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);

      if (userCredential?.user) {
        const user = userCredential.user;
        const email = (user.email || '').toLowerCase().trim();
        const idToken = await user.getIdToken();

        let durableToken = idToken;
        setAuthToken(idToken);
        if (idToken) {
          localStorage.setItem('google_id_token', idToken);
          localStorage.setItem('firebase_id_token', idToken);
        }

        try {
          const exRes = await fetch(getApiUrl('/api/auth/login'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              identifier: email,
              firebaseToken: idToken,
              idToken: idToken,
              profileData: {
                email,
                name: user.displayName || 'मास्टर एडमिन',
              },
            }),
          });
          if (exRes.ok) {
            const exData = await exRes.json();
            if (exData.success && exData.token) {
              durableToken = exData.token;
              setAuthToken(durableToken);
              localStorage.setItem('reporter_auth_token', durableToken);
              localStorage.setItem('auth_token', durableToken);
              if (exData.user) {
                localStorage.setItem('reporter_auth_session', JSON.stringify(exData.user));
              }
            }
          }
        } catch {}

        window.dispatchEvent(
          new CustomEvent('ai_news_admin_auth_success', {
            detail: { token: durableToken, user },
          })
        );
        if (onSuccess) onSuccess();
        return true;
      }
    } catch (popupErr: any) {
      console.warn('[REAUTH] Google popup notice:', popupErr);
      if (typeof window !== 'undefined') {
        if (onSuccess) {
          window.addEventListener(
            'ai_news_admin_auth_success',
            () => {
              try {
                onSuccess();
              } catch {}
            },
            { once: true }
          );
        }
        window.dispatchEvent(new CustomEvent('open_admin_login'));
      }
      return false;
    }
  } catch (err) {
    console.error('[REAUTH] Failed to reauthenticate admin:', err);
  }
  return false;
}

// Auto-initialize auth readiness in browser environment
if (typeof window !== 'undefined') {
  initAuthReady().catch(() => {});
}
