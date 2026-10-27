import { getApiUrl } from './apiConfig';

export interface UnifiedNewsItem {
  id: string;
  title: string;
  summary: string;
  fullNews?: string;
  sourceChannel: string;
  sourceUrl?: string;
  category: string;
  categoryName?: string;
  publishedTime?: string;
  timestamp?: number;
  imageUrl?: string;
  breaking?: boolean;
  isExclusive?: boolean;
  location?: string;
  source?: 'rss' | 'manual' | 'cloud' | 'local';
}

const STORAGE_KEY_NEWS_POSTS = 'ai_news_unified_posts_cache_v2';

/**
 * Normalizes and guarantees unique, stable ID for any news post.
 */
export function normalizeNewsItemId(item: Partial<UnifiedNewsItem>): string {
  if (item.id && String(item.id).trim().length > 0) {
    return String(item.id).trim();
  }
  const titlePart = (item.title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]/g, '')
    .slice(0, 24);
  const timePart = item.timestamp ? String(item.timestamp).slice(-6) : '';
  return `news_${titlePart}_${timePart || Date.now()}`;
}

/**
 * Gets cached news posts from localStorage without losing any existing items.
 */
export function getLocalNewsPosts(): UnifiedNewsItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NEWS_POSTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('getLocalNewsPosts parse error:', err);
  }
  return [];
}

/**
 * Saves news posts to localStorage and dispatches change event.
 */
export function saveLocalNewsPosts(items: UnifiedNewsItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_NEWS_POSTS, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('ai_news_posts_cache_updated', { detail: { count: items.length } }));
  } catch (err) {
    console.warn('saveLocalNewsPosts error:', err);
  }
}

/**
 * Merges newly fetched items into existing list without overwriting or deleting existing cards.
 */
export function mergeNewsPosts(existing: UnifiedNewsItem[], incoming: UnifiedNewsItem[]): UnifiedNewsItem[] {
  const map = new Map<string, UnifiedNewsItem>();

  // Insert existing first
  for (const item of existing) {
    if (item && item.title) {
      const id = normalizeNewsItemId(item);
      map.set(id, { ...item, id });
    }
  }

  // Merge incoming, updating metadata while preserving essential existing fields
  for (const item of incoming) {
    if (item && item.title) {
      const id = normalizeNewsItemId(item);
      const prev = map.get(id);
      map.set(id, {
        ...prev,
        ...item,
        id,
        timestamp: item.timestamp || prev?.timestamp || Date.now(),
      });
    }
  }

  // Sort newest first
  return Array.from(map.values()).sort((a, b) => {
    const timeA = Number(a.timestamp) || 0;
    const timeB = Number(b.timestamp) || 0;
    return timeB - timeA;
  });
}

/**
 * Unified data fetcher: fetches cloud news posts, reconciles with local storage, and returns deduplicated list.
 */
export async function fetchUnifiedNewsPosts(options?: {
  channel?: string;
  category?: string;
  limit?: number;
}): Promise<UnifiedNewsItem[]> {
  const localItems = getLocalNewsPosts();

  try {
    let url = getApiUrl('/api/news-posts');
    const params = new URLSearchParams();
    if (options?.channel) params.set('channel', options.channel);
    if (options?.category) params.set('category', options.category);
    if (options?.limit) params.set('limit', String(options.limit));
    const query = params.toString();
    if (query) url += `?${query}`;

    const res = await fetch(url, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      const serverItems: UnifiedNewsItem[] = Array.isArray(data.posts)
        ? data.posts
        : Array.isArray(data)
        ? data
        : [];

      if (serverItems.length > 0) {
        const merged = mergeNewsPosts(localItems, serverItems);
        saveLocalNewsPosts(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('fetchUnifiedNewsPosts network error, falling back to cached items:', err);
  }

  return localItems;
}
