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

export const DEFAULT_RSS_SOURCES: AdminRssSource[] = [
  {
    id: 'src_aajtak_rss',
    name: 'आज तक (Aaj Tak Hindi News)',
    url: 'https://www.aajtak.in/rssfeeds/?id=home',
    type: 'rss',
    category: 'देश',
    isActive: true,
    createdAt: Date.now() - 86400000,
    itemsFetchedCount: 12,
  },
  {
    id: 'src_bbchindi_rss',
    name: 'बीबीसी हिंदी (BBC Hindi News)',
    url: 'https://feeds.bbci.co.uk/hindi/rss.xml',
    type: 'rss',
    category: 'अंतरराष्ट्रीय',
    isActive: true,
    createdAt: Date.now() - 43200000,
    itemsFetchedCount: 8,
  },
  {
    id: 'src_ndtv_rss',
    name: 'NDTV इंडिया (NDTV India Live)',
    url: 'https://feeds.feedburner.com/ndtvkhabar',
    type: 'rss',
    category: 'राजनीति',
    isActive: true,
    createdAt: Date.now() - 21600000,
    itemsFetchedCount: 10,
  },
  {
    id: 'src_pib_web',
    name: 'प्रेस सूचना ब्यूरो (PIB National Desk)',
    url: 'https://pib.gov.in/PressReleasePage.aspx',
    type: 'web',
    category: 'देश',
    isActive: true,
    createdAt: Date.now() - 10000000,
    itemsFetchedCount: 5,
  },
];

export function getAdminRssSources(): AdminRssSource[] {
  if (typeof window === 'undefined') return DEFAULT_RSS_SOURCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RSS_SOURCES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RSS_SOURCES, JSON.stringify(DEFAULT_RSS_SOURCES));
      return DEFAULT_RSS_SOURCES;
    }
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_RSS_SOURCES;
  } catch {
    return DEFAULT_RSS_SOURCES;
  }
}

export function saveAdminRssSources(sources: AdminRssSource[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RSS_SOURCES, JSON.stringify(sources));
    window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated', { detail: sources }));
    fetch('/api/admin/rss-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources }),
    }).catch(() => {});
  } catch {}
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
  const list = [newSource, ...getAdminRssSources()];
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
  fetch(`/api/admin/delete-rss-source/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
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
  // Web links and internal posts bypass the approval queue
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
    const cached = getActiveRssNewsPosts();
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

export function getActiveRssNewsPosts(): NewsFeedPost[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SYNCED_RSS_POSTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const approvedSet = getApprovedRssIds();
        return parsed.map((p) => {
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
          const allPosts = await postsRes.json();
          if (Array.isArray(allPosts)) {
            const rssAndWebOnly = allPosts.filter(
              (p: any) => p.id && (p.id.startsWith('rss-') || p.id.startsWith('web-'))
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
