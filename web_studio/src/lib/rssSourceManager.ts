// AI News Maker - Admin RSS & Web Link Source Management
// Flow: ADMIN -> Add Source -> Active -> News Fetch -> Home Feed -> Users

export interface AdminRssSource {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'web';
  category: string;
  isActive: boolean;
  createdAt: number;
  lastFetchedAt?: number;
  itemsFetchedCount?: number;
}

const STORAGE_KEY_RSS_SOURCES = 'ai_news_admin_rss_sources_v1';

export const DEFAULT_RSS_SOURCES: AdminRssSource[] = [];

export const DEFAULT_SOURCE_IDS_TO_PURGE = new Set([
  'src_aajtak_live',
  'src_amarujala_live',
  'src_ndtv_live',
  'src_bbc_live',
  'src_nbt_live',
]);

let memoryRssSources: AdminRssSource[] = [];

export function getAdminRssSources(): AdminRssSource[] {
  let list: AdminRssSource[] = memoryRssSources;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RSS_SOURCES);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // Permanently purge any default RSS links
  const cleaned = list.filter((s) => s && s.url && !DEFAULT_SOURCE_IDS_TO_PURGE.has(s.id));
  memoryRssSources = cleaned;

  if (typeof window !== 'undefined' && cleaned.length !== list.length) {
    try {
      localStorage.setItem(STORAGE_KEY_RSS_SOURCES, JSON.stringify(cleaned));
    } catch {}
  }
  return cleaned;
}

export async function fetchAdminRssSourcesFromBackend(): Promise<AdminRssSource[]> {
  try {
    const res = await fetch('/api/admin/rss-sources');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.sources)) {
        const cleaned = data.sources.filter((s: AdminRssSource) => s && s.url && !DEFAULT_SOURCE_IDS_TO_PURGE.has(s.id));
        memoryRssSources = cleaned;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_RSS_SOURCES, JSON.stringify(cleaned));
          window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated', { detail: cleaned }));
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch RSS sources from backend:', err);
  }
  return getAdminRssSources();
}

export function saveAdminRssSources(sources: AdminRssSource[]) {
  const cleaned = sources.filter((s) => s && s.url && !DEFAULT_SOURCE_IDS_TO_PURGE.has(s.id));
  memoryRssSources = cleaned;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_RSS_SOURCES, JSON.stringify(cleaned));
      window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated', { detail: cleaned }));
    } catch {}
  }

  // Persist permanently to backend database
  fetch('/api/admin/rss-sources', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'admin',
    },
    body: JSON.stringify({ sources: cleaned, userRole: 'admin' }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data && data.success && Array.isArray(data.sources)) {
        memoryRssSources = data.sources;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_RSS_SOURCES, JSON.stringify(data.sources));
        }
      }
    })
    .catch((err) => {
      console.warn('Backend saveAdminRssSources warning:', err);
    });
}

export function addAdminRssSource(
  name: string,
  url: string,
  type: 'rss' | 'web',
  category: string
): AdminRssSource {
  const newSource: AdminRssSource = {
    id: `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || (type === 'rss' ? 'RSS News Feed' : 'Web Article Link'),
    url: url.trim(),
    type,
    category: category || 'देश',
    isActive: true,
    createdAt: Date.now(),
    itemsFetchedCount: 0,
  };
  const list = [newSource, ...getAdminRssSources().filter((s) => s.id !== newSource.id)];
  saveAdminRssSources(list);
  // Trigger background live sync immediately
  syncAllSourcesLive().catch(() => {});
  return newSource;
}

export function toggleAdminRssSource(id: string): AdminRssSource[] {
  const list = getAdminRssSources().map((s) =>
    s.id === id ? { ...s, isActive: !s.isActive } : s
  );
  saveAdminRssSources(list);
  return list;
}

export function deleteAdminRssSource(id: string): AdminRssSource[] {
  const list = getAdminRssSources().filter((s) => s.id !== id);
  saveAdminRssSources(list);
  fetch(`/api/admin/delete-rss-source/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'admin',
    },
    body: JSON.stringify({ userRole: 'admin' }),
  }).catch(() => {});
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
  }
  return list;
}

import type { NewsFeedPost } from '../data/newsFeedData';

const STORAGE_KEY_SYNCED_RSS_POSTS = 'ai_news_synced_rss_posts_v2';
const STORAGE_KEY_APPROVED_RSS_IDS = 'ai_news_approved_rss_post_ids_v1';

export function getApprovedRssIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPROVED_RSS_IDS);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export function isRssPostApproved(post: NewsFeedPost, approvedIds?: Set<string>): boolean {
  if (!post) return false;
  // Non-RSS items (e.g. manual news, web- links) are considered approved
  if (!post.id || !post.id.startsWith('rss-')) return true;
  if (post.status === 'APPROVED') return true;
  const set = approvedIds || getApprovedRssIds();
  return set.has(post.id);
}

export function approveRssPost(postId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const approved = getApprovedRssIds();
    approved.add(postId);
    localStorage.setItem(STORAGE_KEY_APPROVED_RSS_IDS, JSON.stringify(Array.from(approved)));

    // Update locally cached synced RSS posts
    const cached = getSyncedRssNewsPostsRaw();
    const updated = cached.map((p) => (p.id === postId ? { ...p, status: 'APPROVED' as const } : p));
    localStorage.setItem(STORAGE_KEY_SYNCED_RSS_POSTS, JSON.stringify(updated));

    // Call server to persist approval in news database
    fetch(`/api/admin/approve-news/${encodeURIComponent(postId)}`, { method: 'POST' }).catch(() => {
      fetch(`/api/news-posts/${encodeURIComponent(postId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      }).catch(() => {});
    });

    window.dispatchEvent(new CustomEvent('ai_news_approved_rss_updated', { detail: postId }));
    window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
  } catch (e) {
    console.error('Error approving RSS post:', e);
  }
}

export function getSyncedRssNewsPostsRaw(): NewsFeedPost[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SYNCED_RSS_POSTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function getActiveRssNewsPosts(): NewsFeedPost[] {
  return getSyncedRssNewsPostsRaw();
}

export function setSyncedRssNewsPosts(posts: NewsFeedPost[]) {
  if (typeof window === 'undefined') return;
  try {
    const approvedSet = getApprovedRssIds();
    const normalized = posts.map((p) => {
      if (p.id && p.id.startsWith('rss-')) {
        const isApproved = p.status === 'APPROVED' || approvedSet.has(p.id);
        return {
          ...p,
          status: isApproved ? ('APPROVED' as const) : ('PENDING_APPROVAL' as const),
        };
      }
      return {
        ...p,
        status: 'APPROVED' as const,
      };
    });
    localStorage.setItem(STORAGE_KEY_SYNCED_RSS_POSTS, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated', { detail: getAdminRssSources() }));
    window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
  } catch {}
}

export async function syncAllSourcesLive(): Promise<{ success: boolean; totalNewItems?: number; error?: string }> {
  try {
    const res = await fetch('/api/admin/rss-sync', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      // Fetch latest production posts from /api/news-posts to update active synced feed
      try {
        const postsRes = await fetch('/api/news-posts');
        if (postsRes.ok) {
          const rawPosts = await postsRes.json();
          const postsList = Array.isArray(rawPosts) ? rawPosts : (rawPosts?.posts || []);
          if (Array.isArray(postsList)) {
            const rssAndWebOnly = postsList.filter(
              (p: any) => p && p.id && (String(p.id).startsWith('rss-') || String(p.id).startsWith('web-'))
            );
            setSyncedRssNewsPosts(rssAndWebOnly);
          }
        }
      } catch {}


      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated', { detail: getAdminRssSources() }));
        window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
      }
      return { success: true, totalNewItems: data.count || data.totalNewItems || 0 };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'सिंक त्रुटि' };
  }

  return { success: true, totalNewItems: 0 };
}



// =========================================================================
// SHARED NEWS CHANNELS DIRECTORY (RSS & Web Links Sync)
// =========================================================================

const STORAGE_KEY_SAVED_CHANNELS = 'ai_news_admin_channels_list_v1';

export const DEFAULT_PRESET_CHANNELS: string[] = [
  'आज तक (Aaj Tak)',
  'एबीपी न्यूज़ (ABP News)',
  'NDTV इंडिया (NDTV India)',
  'बीबीसी हिंदी (BBC Hindi)',
  'ज़ी न्यूज़ (Zee News)',
  'दैनिक भास्कर (Dainik Bhaskar)',
  'अमर उजाला (Amar Ujala)',
  'नवभारत टाइम्स (NBT)',
  'प्रेस सूचना ब्यूरो (PIB)',
  'न्यूज़18 इंडिया (News18)',
  'जनसत्ता (Jansatta)',
  'लाइव हिंदुस्तान (Live Hindustan)',
  'इंडिया टीवी (India TV)',
  'रिपब्लिक भारत (Republic Bharat)',
];

export function getSavedNewsChannels(): string[] {
  if (typeof window === 'undefined') return DEFAULT_PRESET_CHANNELS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_CHANNELS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_PRESET_CHANNELS;
}

export function saveNewsChannel(channelName: string): string[] {
  const trimmed = channelName.trim();
  if (!trimmed) return getSavedNewsChannels();
  const current = getSavedNewsChannels();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_CHANNELS, JSON.stringify(updated));
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ai_news_saved_channels_updated', { detail: updated }));
    }
    return updated;
  }
  return current;
}

export function deleteSavedNewsChannel(channelName: string): string[] {
  const current = getSavedNewsChannels();
  const updated = current.filter((c) => c !== channelName);
  try {
    localStorage.setItem(STORAGE_KEY_SAVED_CHANNELS, JSON.stringify(updated));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai_news_saved_channels_updated', { detail: updated }));
  }
  return updated;
}

export async function syncAndMigrateLocalApprovals(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const approvedIds = Array.from(getApprovedRssIds());
    if (approvedIds.length === 0) return;
    await fetch('/api/admin/bulk-approve-news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: approvedIds }),
    }).catch(() => {});
  } catch {}
}
