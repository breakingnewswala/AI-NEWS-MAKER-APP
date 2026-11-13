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
  addedAt?: number;
  addedDateFormatted?: string;
  lastFetchedAt?: number;
  itemsFetchedCount?: number;
}

export function formatHindiDate(timestamp?: number | string | null): string {
  if (!timestamp) return 'पूर्व में जोड़ा गया (Legacy)';
  const date = new Date(typeof timestamp === 'string' ? (isNaN(Number(timestamp)) ? timestamp : Number(timestamp)) : timestamp);
  if (isNaN(date.getTime()) || date.getFullYear() < 2024) return 'पूर्व में जोड़ा गया (Legacy)';
  const monthsHindi = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
  return `${date.getDate()} ${monthsHindi[date.getMonth()]} ${date.getFullYear()}`;
}

const STORAGE_KEY_RSS_SOURCES = 'ai_news_admin_rss_sources_v1';
const STORAGE_KEY_DELETED_SOURCE_IDS = 'ai_news_admin_deleted_rss_source_ids_v1';

export const DEFAULT_RSS_SOURCES: AdminRssSource[] = [];

export function getDeletedSourceIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_SOURCE_IDS);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function addDeletedSourceId(id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const current = getDeletedSourceIds();
    current.add(id);
    localStorage.setItem(STORAGE_KEY_DELETED_SOURCE_IDS, JSON.stringify(Array.from(current)));
  } catch {}
}

let memoryRssSources: AdminRssSource[] = [];

export function getAdminRssSources(): AdminRssSource[] {
  const deletedIds = getDeletedSourceIds();
  let list: AdminRssSource[] = memoryRssSources;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RSS_SOURCES);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // Strictly adhere to No Default RSS Policy: only admin-added feeds exist
  const cleaned = (list || []).filter((s) => {
    if (!s || !s.url || deletedIds.has(s.id)) return false;
    return true;
  });
  memoryRssSources = cleaned;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_RSS_SOURCES, JSON.stringify(cleaned));
    } catch {}
  }
  return cleaned;
}

export async function fetchAdminRssSourcesFromBackend(): Promise<AdminRssSource[]> {
  const deletedIds = getDeletedSourceIds();
  try {
    const token = await ensureAuthToken().catch(() => '');
    const headers: Record<string, string> = { ...getAdminAuthHeaders() };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(getApiUrl('/api/admin/rss-sources'), { headers });
    if (res.ok) {
      const data = await res.json();
      const serverSources = (data && data.success && Array.isArray(data.sources)) ? data.sources : [];

      // Server is the SINGLE AUTHORITATIVE SOURCE OF TRUTH.
      // Do NOT resurrect deleted sources from localStorage back to the server.
      const cleaned = serverSources.filter((s: AdminRssSource) => s && s.url && !deletedIds.has(s.id));

      memoryRssSources = cleaned;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_RSS_SOURCES, JSON.stringify(cleaned));
        window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated', { detail: cleaned }));
      }
      return cleaned;
    }
  } catch (err) {
    console.warn('Failed to fetch RSS sources from backend, preserving local sources:', err);
  }
  return getAdminRssSources();
}

export function saveAdminRssSources(sources: AdminRssSource[]) {
  const deletedIds = getDeletedSourceIds();
  const cleaned = sources.filter((s) => s && s.url && !deletedIds.has(s.id));
  memoryRssSources = cleaned;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_RSS_SOURCES, JSON.stringify(cleaned));
      window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated', { detail: cleaned }));
    } catch {}
  }

  // Persist permanently to backend database with auto-retry
  fetch(getApiUrl('/api/admin/rss-sources?replace=true'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'admin',
      ...getAdminAuthHeaders(),
    },
    body: JSON.stringify({ sources: cleaned, replace: true, userRole: 'admin' }),
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

export async function addAdminRssSourceAsync(
  name: string,
  url: string,
  type: 'rss' | 'web',
  category: string
): Promise<AdminRssSource> {
  const newSource: AdminRssSource = {
    id: `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || (type === 'rss' ? 'RSS News Feed' : 'Web Article Link'),
    url: url.trim(),
    type,
    category: category || 'देश',
    isActive: true,
    createdAt: Date.now(),
    addedAt: Date.now(),
    addedDateFormatted: formatHindiDate(Date.now()),
    itemsFetchedCount: 0,
  };
  const list = [newSource, ...getAdminRssSources().filter((s) => s.id !== newSource.id && s.url !== newSource.url)];
  memoryRssSources = list;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_RSS_SOURCES, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated', { detail: list }));
    } catch {}
  }
  try {
    await fetch(getApiUrl('/api/admin/rss-sources?replace=true'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'admin',
        ...getAdminAuthHeaders(),
      },
      body: JSON.stringify({ sources: list, replace: true, userRole: 'admin' }),
    });
  } catch (err) {
    console.warn('Failed to persist new RSS source to server:', err);
  }
  // Trigger background live sync after persisting
  syncAllSourcesLive().catch(() => {});
  return newSource;
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
    addedAt: Date.now(),
    addedDateFormatted: formatHindiDate(Date.now()),
    itemsFetchedCount: 0,
  };
  const list = [newSource, ...getAdminRssSources().filter((s) => s.id !== newSource.id && s.url !== newSource.url)];
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
  addDeletedSourceId(id);
  const list = getAdminRssSources().filter((s) => s.id !== id);
  saveAdminRssSources(list);
  fetch(getApiUrl(`/api/admin/delete-rss-source/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'admin',
      ...getAdminAuthHeaders(),
    },
    body: JSON.stringify({ userRole: 'admin' }),
  }).catch(() => {});
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
  }
  return list;
}

import { getApiUrl, getAuthHeaders, ensureAuthToken } from './apiConfig';
import type { NewsFeedPost } from '../data/newsFeedData';

const STORAGE_KEY_SYNCED_RSS_POSTS = 'ai_news_synced_rss_posts_v2';
const STORAGE_KEY_APPROVED_RSS_IDS = 'ai_news_approved_rss_post_ids_v1';

export function getAdminAuthHeaders(): Record<string, string> {
  return getAuthHeaders();
}

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
  if (post.status === 'REJECTED' || (post as any).status === 'rejected') return false;
  if (post.status === 'APPROVED' || (post as any).status === 'approved' || (post as any).status === 'published' || (post as any).isApproved === true || (post as any).isPrePublished === true) return true;
  if (approvedIds && post.id && approvedIds.has(post.id)) return true;
  if (post.status === 'PENDING_APPROVAL' || (post as any).status === 'pending') {
    if (approvedIds && post.id && approvedIds.has(post.id)) return true;
    return false;
  }
  const isFeedSource = Boolean(post.id && (post.id.startsWith('rss-') || post.id.startsWith('web-')));
  if (isFeedSource) {
    // Authorized feed source items default to visible in Home Feed unless explicitly rejected
    return true;
  }
  return true;
}

export async function approveRssPost(postId: string, postData?: any): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const approved = getApprovedRssIds();
    approved.add(postId);
    localStorage.setItem(STORAGE_KEY_APPROVED_RSS_IDS, JSON.stringify(Array.from(approved)));

    // Update locally cached synced RSS posts
    const cached = getActiveRssNewsPosts();
    const target = postData || cached.find((p) => p.id === postId);
    const updated = cached.map((p) => (p.id === postId ? { ...p, status: 'APPROVED' as const } : p));
    localStorage.setItem(STORAGE_KEY_SYNCED_RSS_POSTS, JSON.stringify(updated));

    // Call server with verified API URL, Admin headers and full post data
    const url = getApiUrl(`/api/admin/approve-news/${encodeURIComponent(postId)}`);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(),
    };
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(target || {}),
    });

    window.dispatchEvent(new CustomEvent('ai_news_approved_rss_updated', { detail: postId }));
    window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
    return res.ok;
  } catch (e) {
    console.error('Error approving RSS post:', e);
    return false;
  }
}

export async function rejectRssPost(postId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const approved = getApprovedRssIds();
    approved.delete(postId);
    localStorage.setItem(STORAGE_KEY_APPROVED_RSS_IDS, JSON.stringify(Array.from(approved)));

    const cached = getActiveRssNewsPosts();
    const updated = cached.map((p) => (p.id === postId ? { ...p, status: 'REJECTED' as const } : p));
    localStorage.setItem(STORAGE_KEY_SYNCED_RSS_POSTS, JSON.stringify(updated));

    const url = getApiUrl(`/api/admin/reject-news/${encodeURIComponent(postId)}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: getAdminAuthHeaders(),
    });

    window.dispatchEvent(new CustomEvent('ai_news_approved_rss_updated', { detail: postId }));
    window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
    return res.ok;
  } catch (e) {
    console.error('Error rejecting RSS post:', e);
    return false;
  }
}

export async function syncAndMigrateLocalApprovals(): Promise<Set<string>> {
  if (typeof window === 'undefined') return new Set();
  const localApproved = getApprovedRssIds();
  const adminHeaders = getAdminAuthHeaders();

  // If client has local approved IDs and admin Bearer token, migrate them safely to server
  if (localApproved.size > 0 && adminHeaders['Authorization']) {
    try {
      const url = getApiUrl('/api/admin/migrate-approvals');
      const res = await fetch(url, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ approvedIds: Array.from(localApproved) }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.approvedIds)) {
          const authoritative = new Set<string>(data.approvedIds);
          localStorage.setItem(STORAGE_KEY_APPROVED_RSS_IDS, JSON.stringify(Array.from(authoritative)));
          return authoritative;
        }
      }
    } catch {}
  }

  // Fetch authoritative approved IDs from server
  try {
    const url = getApiUrl('/api/admin/approved-news-ids');
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.approvedIds)) {
        const authoritative = new Set<string>(data.approvedIds);
        localApproved.forEach((id) => authoritative.add(id));
        localStorage.setItem(STORAGE_KEY_APPROVED_RSS_IDS, JSON.stringify(Array.from(authoritative)));
        return authoritative;
      }
    }
  } catch {}

  return localApproved;
}

export function getActiveRssNewsPosts(): NewsFeedPost[] {
  if (typeof window === 'undefined') return [];
  const activeSources = getAdminRssSources().filter((s) => s.isActive);
  if (activeSources.length === 0) {
    try {
      localStorage.removeItem(STORAGE_KEY_SYNCED_RSS_POSTS);
    } catch {}
    return [];
  }
  const activeIds = new Set(activeSources.map((s) => s.id));
  const activeUrls = new Set(activeSources.map((s) => s.url.trim().toLowerCase()));
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SYNCED_RSS_POSTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((p: any) => {
          if (!p || !p.id) return false;
          if (p.sourceId && activeIds.has(p.sourceId)) return true;
          if (p.sourceFeedUrl && activeUrls.has(p.sourceFeedUrl.trim().toLowerCase())) return true;
          const parts = String(p.id).split('-');
          const srcId = parts.length >= 3 ? parts.slice(1, -1).join('-') : parts[1] || '';
          if (srcId && (activeIds.has(srcId) || activeIds.has(`src_${srcId}`))) return true;
          if (p.sourceUrl && activeUrls.has(p.sourceUrl.trim().toLowerCase())) return true;
          return false;
        });
      }
    }
  } catch {}
  return [];
}

export function setSyncedRssNewsPosts(posts: NewsFeedPost[]) {
  if (typeof window === 'undefined') return;
  try {
    const approvedSet = getApprovedRssIds();
    const normalized = posts.map((p) => {
      const isFeed = Boolean(p.id && (p.id.startsWith('rss-') || p.id.startsWith('web-')));
      if (isFeed) {
        const isRejected = p.status === 'REJECTED' || (p as any).status === 'rejected';
        const isApproved = !isRejected && (p.status === 'APPROVED' || p.status === 'published' || p.isApproved || approvedSet.has(p.id) || p.status !== 'PENDING_APPROVAL');
        return {
          ...p,
          status: isApproved ? ('APPROVED' as const) : isRejected ? ('REJECTED' as const) : ('PENDING_APPROVAL' as const),
          isApproved,
          isPrePublished: isApproved,
        };
      }
      return {
        ...p,
        status: (p.status || 'APPROVED') as any,
      };
    });
    localStorage.setItem(STORAGE_KEY_SYNCED_RSS_POSTS, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated', { detail: getAdminRssSources() }));
    window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
  } catch {}
}

export interface RssSyncResult {
  success: boolean;
  totalNewItems?: number;
  totalSourcesSynced?: number;
  newArticlesCount?: number;
  updatedArticlesCount?: number;
  skippedDuplicatesCount?: number;
  failedSourcesCount?: number;
  durationMs?: number;
  error?: string;
}

export async function syncAllSourcesLive(): Promise<RssSyncResult> {
  try {
    let token = await ensureAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const syncUrl = getApiUrl('/api/admin/rss-sync');
    let res = await fetch(syncUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    if (res.status === 401) {
      token = await ensureAuthToken(true);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      res = await fetch(syncUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
    }

    if (res.ok) {
      const data = await res.json();
      // Fetch latest production posts from /api/news-posts to update active synced feed
      try {
        const postsUrl = getApiUrl('/api/news-posts?includePending=true');
        const postsRes = await fetch(postsUrl);
        if (postsRes.ok) {
          const rawPosts = await postsRes.json();
          const postsList = Array.isArray(rawPosts) ? rawPosts : (rawPosts?.posts || []);
          if (Array.isArray(postsList)) {
            const rssAndWebOnly = postsList.filter(
              (p: any) => p && p.id && (String(p.id).startsWith('rss-') || String(p.id).startsWith('web-'))
            );
            // Authoritative server status (default to APPROVED if active and not REJECTED)
            const syncedWithStatus = rssAndWebOnly.map((p: any) => ({
              ...p,
              status: p.status === 'REJECTED' ? 'REJECTED' : 'APPROVED',
              isApproved: p.status !== 'REJECTED',
              isPrePublished: p.status !== 'REJECTED',
            }));
            setSyncedRssNewsPosts(syncedWithStatus);

            // Re-activate newly synced items by removing them from app_deleted_news_ids_v1
            try {
              const rawDel = localStorage.getItem('app_deleted_news_ids_v1');
              if (rawDel) {
                const delSet = new Set<string>(JSON.parse(rawDel));
                syncedWithStatus.forEach((p: any) => delSet.delete(p.id));
                localStorage.setItem('app_deleted_news_ids_v1', JSON.stringify(Array.from(delSet)));
              }
            } catch {}
          }
        }
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated', { detail: getAdminRssSources() }));
        window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
      }
      return {
        success: true,
        totalNewItems: data.newArticlesCount ?? data.count ?? data.totalNewItems ?? 0,
        totalSourcesSynced: data.totalSourcesSynced,
        newArticlesCount: data.newArticlesCount,
        updatedArticlesCount: data.updatedArticlesCount,
        skippedDuplicatesCount: data.skippedDuplicatesCount,
        failedSourcesCount: data.failedSourcesCount,
        durationMs: data.durationMs,
      };
    } else {
      let errText = 'सिंक विफल रहा';
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) errText = errJson.error;
      } catch {}
      return { success: false, error: errText };
    }
  } catch (err: any) {
    console.warn('Live RSS sync error:', err);
    return { success: false, error: err?.message || 'सिंक त्रुटि' };
  }
}



export async function scrapeAllWebSourcesLive(): Promise<RssSyncResult> {
  try {
    let token = await ensureAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const scrapeUrl = getApiUrl('/api/admin/web-scrape');
    let res = await fetch(scrapeUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    if (res.status === 401) {
      token = await ensureAuthToken(true);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      res = await fetch(scrapeUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
    }

    if (res.ok) {
      const data = await res.json();
      try {
        const postsUrl = getApiUrl('/api/news-posts?includePending=true');
        const postsRes = await fetch(postsUrl);
        if (postsRes.ok) {
          const rawPosts = await postsRes.json();
          const postsList = Array.isArray(rawPosts) ? rawPosts : (rawPosts?.posts || []);
          if (Array.isArray(postsList)) {
            const rssAndWebOnly = postsList.filter(
              (p: any) => p && p.id && (String(p.id).startsWith('rss-') || String(p.id).startsWith('web-'))
            );
            const syncedWithStatus = rssAndWebOnly.map((p: any) => ({
              ...p,
              status: p.status || 'PENDING_APPROVAL',
            }));
            setSyncedRssNewsPosts(syncedWithStatus);
          }
        }
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated', { detail: getAdminRssSources() }));
        window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
      }
      return {
        success: true,
        totalNewItems: data.newArticlesCount ?? data.count ?? data.totalNewItems ?? 0,
        totalSourcesSynced: data.totalSourcesSynced,
        newArticlesCount: data.newArticlesCount,
        updatedArticlesCount: data.updatedArticlesCount,
        skippedDuplicatesCount: data.skippedDuplicatesCount,
        failedSourcesCount: data.failedSourcesCount,
        durationMs: data.durationMs,
      };
    } else {
      let errText = 'वेब स्क्रैप विफल रहा';
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) errText = errJson.error;
      } catch {}
      return { success: false, error: errText };
    }
  } catch (err: any) {
    console.warn('Live Web Scrape error:', err);
    return { success: false, error: err?.message || 'वेब स्क्रैप त्रुटि' };
  }
}

// =========================================================================
// SHARED NEWS CHANNELS DIRECTORY (Single Source of Truth)
// =========================================================================

const STORAGE_KEY_SAVED_CHANNELS = 'ai_news_admin_channels_list_v1';

export interface CanonicalChannelItem {
  id: string;
  name: string;
  channelName?: string;
  nameHindi?: string;
  nameEnglish?: string;
  url?: string;
  websiteUrl?: string;
  category?: string;
}

export const DEFAULT_PRESET_CHANNELS: string[] = [
  'आज तक',
  'एबीपी न्यूज़',
  'एनडीटीवी इंडिया',
  'ज़ी न्यूज़',
  'दैनिक भास्कर',
  'नवभारत टाइम्स',
  'प्रेस सूचना ब्यूरो',
  'न्यूज़18 इंडिया',
  'जनसत्ता',
  'लाइव हिंदुस्तान',
  'इंडिया टीवी',
  'रिपब्लिक भारत',
];

export async function fetchAdminChannelsFromBackend(): Promise<CanonicalChannelItem[]> {
  try {
    const token = await ensureAuthToken().catch(() => '');
    const headers: Record<string, string> = { ...getAdminAuthHeaders() };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(getApiUrl('/api/admin/channels'), { headers });
    if (res.ok) {
      const data = await res.json();
      const serverChannels = (data && data.success && Array.isArray(data.channels)) ? data.channels : [];
      if (serverChannels.length > 0) {
        const normalized: CanonicalChannelItem[] = serverChannels.map((c: any) => ({
          id: c.id,
          name: (c.channelName || c.name || '').trim(),
          channelName: (c.channelName || c.name || '').trim(),
          url: c.websiteUrl || c.url || '',
          category: c.category || 'breaking',
          nameHindi: c.nameHindi,
          nameEnglish: c.nameEnglish,
        }));
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_news_portals_list', JSON.stringify(normalized));
          localStorage.setItem(STORAGE_KEY_SAVED_CHANNELS, JSON.stringify(normalized.map((n) => n.name)));
          window.dispatchEvent(new CustomEvent('ai_news_channels_updated', { detail: normalized }));
          window.dispatchEvent(new CustomEvent('ai_news_saved_channels_updated', { detail: normalized.map((n) => n.name) }));
        }
        return normalized;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch channels from backend:', err);
  }
  return [];
}

export function getSavedNewsChannels(): string[] {
  if (typeof window === 'undefined') return DEFAULT_PRESET_CHANNELS;
  try {
    const rawPortals = localStorage.getItem('admin_news_portals_list');
    if (rawPortals) {
      const parsed = JSON.parse(rawPortals);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const names = parsed.map((p: any) => p.name || p.channelName).filter(Boolean);
        if (names.length > 0) return names;
      }
    }
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
