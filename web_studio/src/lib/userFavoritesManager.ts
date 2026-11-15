// AI NEWS MAKER - User News Favorites Manager
// Client-side manager with backend persistence & local caching

import { getApiUrl } from './apiConfig';

const STORAGE_KEY_PREFIX = 'ai_news_user_favorites_';

export function getFavoritesStorageKey(email?: string): string {
  const clean = (email || '').toLowerCase().trim();
  return clean ? `${STORAGE_KEY_PREFIX}${clean}` : `${STORAGE_KEY_PREFIX}anonymous`;
}

export function getUserFavoritesLocal(email?: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getFavoritesStorageKey(email));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveUserFavoritesLocal(email: string, favorites: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getFavoritesStorageKey(email), JSON.stringify(favorites));
    window.dispatchEvent(new CustomEvent('ai_news_favorites_updated', { detail: { favorites } }));
  } catch {}
}

export async function fetchUserFavorites(email?: string): Promise<string[]> {
  const clean = (email || '').toLowerCase().trim();
  const local = getUserFavoritesLocal(clean);

  if (!clean) return local;

  try {
    const url = `${getApiUrl()}/api/user-favorites?email=${encodeURIComponent(clean)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.favorites)) {
        saveUserFavoritesLocal(clean, data.favorites);
        return data.favorites;
      }
    }
  } catch (err) {
    console.warn('Failed fetching favorites from server:', err);
  }

  return local;
}

export async function toggleUserFavorite(newsId: string, email?: string): Promise<{ isFavorite: boolean; favorites: string[] }> {
  const clean = (email || '').toLowerCase().trim();
  const current = new Set(getUserFavoritesLocal(clean));
  const willBeFavorite = !current.has(newsId);

  if (willBeFavorite) {
    current.add(newsId);
  } else {
    current.delete(newsId);
  }

  const updated = Array.from(current);
  saveUserFavoritesLocal(clean, updated);

  if (clean) {
    try {
      const url = `${getApiUrl()}/api/user-favorites`;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clean,
          newsId,
          action: willBeFavorite ? 'add' : 'remove',
        }),
      }).catch((e) => console.warn('Background favorites sync failed:', e));
    } catch {}
  }

  return { isFavorite: willBeFavorite, favorites: updated };
}
