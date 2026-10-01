// AI News Maker - Admin RSS & Web Link Source Management
// Flow: ADMIN -> Add Source -> Active -> News Fetch -> Production Database -> Home Feed -> Users

import type { NewsFeedPost } from '../data/newsFeedData';

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
  lastStatus?: string;
  lastError?: string;
}

const STORAGE_KEY_RSS_SOURCES = 'ai_news_admin_rss_sources_v2';
const STORAGE_KEY_LIVE_POSTS = 'ai_news_live_rss_posts_cache_v2';

export const DEFAULT_RSS_SOURCES: AdminRssSource[] = [
  {
    id: 'src_aajtak_rss',
    name: 'आज तक (Aaj Tak Hindi News)',
    url: 'https://www.aajtak.in/rssfeeds/?id=home',
    type: 'rss',
    category: 'देश / राष्ट्रीय',
    isActive: true,
    createdAt: Date.now() - 86400000,
    itemsFetchedCount: 145,
    lastStatus: 'सक्रिय - 145 लाइव समाचार',
  },
  {
    id: 'src_bbchindi_rss',
    name: 'बीबीसी हिंदी (BBC Hindi News)',
    url: 'https://feeds.bbci.co.uk/hindi/rss.xml',
    type: 'rss',
    category: 'अंतरराष्ट्रीय',
    isActive: true,
    createdAt: Date.now() - 43200000,
    itemsFetchedCount: 38,
    lastStatus: 'सक्रिय - 38 लाइव समाचार',
  },
  {
    id: 'src_amarujala_rss',
    name: 'अमर उजाला (Amar Ujala Breaking)',
    url: 'https://www.amarujala.com/rss/breaking-news.xml',
    type: 'rss',
    category: 'ब्रेकिंग न्यूज़',
    isActive: true,
    createdAt: Date.now() - 21600000,
    itemsFetchedCount: 30,
    lastStatus: 'सक्रिय - 30 लाइव समाचार',
  },
  {
    id: 'src_pib_web',
    name: 'PIB राष्ट्रीय डेस्क (PIB National Desk)',
    url: 'https://pib.gov.in/PressReleasePage.aspx',
    type: 'web',
    category: 'देश / राष्ट्रीय',
    isActive: true,
    createdAt: Date.now() - 10000000,
    itemsFetchedCount: 1,
    lastStatus: 'सक्रिय - वेब लिंक कनेक्टेड',
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
  } catch {}
}

export function addAdminRssSource(
  name: string,
  url: string,
  type: 'rss' | 'web',
  category: string
): AdminRssSource {
  const newSource: AdminRssSource = {
    id: `src_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || (type === 'rss' ? 'RSS News Feed' : 'Web Article Link'),
    url: url.trim(),
    type,
    category: category || 'देश / राष्ट्रीय',
    isActive: true,
    createdAt: Date.now(),
    itemsFetchedCount: 0,
    lastStatus: 'नया स्रोत जोड़ा गया - फेच लंबित',
  };
  const list = [newSource, ...getAdminRssSources()];
  saveAdminRssSources(list);
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
  return list;
}

export function updateSourceStatus(
  id: string,
  updates: Partial<AdminRssSource>
): AdminRssSource[] {
  const list = getAdminRssSources().map((s) =>
    s.id === id ? { ...s, ...updates } : s
  );
  saveAdminRssSources(list);
  return list;
}

/**
 * Triggers actual production fetch for an individual RSS feed
 */
export async function fetchRssSourceLive(
  source: AdminRssSource
): Promise<{ success: boolean; count: number; totalFetched?: number; error?: string }> {
  try {
    const res = await fetch('/api/rss/fetch-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: source.url,
        name: source.name,
        category: source.category,
      }),
    });
    const data = await res.json();
    if (data.success) {
      updateSourceStatus(source.id, {
        lastFetchedAt: Date.now(),
        itemsFetchedCount: (source.itemsFetchedCount || 0) + (data.count || 0),
        lastStatus: `सफल - ${data.count} नए समाचार लाइव जोड़े गए (कुल ${data.totalFetched || 0} प्राप्त)`,
        lastError: undefined,
      });
      // Trigger feed refresh across app
      window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated'));
      return { success: true, count: data.count, totalFetched: data.totalFetched };
    } else {
      updateSourceStatus(source.id, {
        lastFetchedAt: Date.now(),
        lastStatus: 'त्रुटि - फेच विफल',
        lastError: data.error || 'अज्ञात त्रुटि',
      });
      return { success: false, count: 0, error: data.error };
    }
  } catch (err: any) {
    const msg = err.message || 'नेटवर्क कनेक्शन विफल';
    updateSourceStatus(source.id, {
      lastFetchedAt: Date.now(),
      lastStatus: 'त्रुटि - फेच विफल',
      lastError: msg,
    });
    return { success: false, count: 0, error: msg };
  }
}

/**
 * Triggers actual production scrape for an individual Web Article link
 */
export async function scrapeWebSourceLive(
  source: AdminRssSource
): Promise<{ success: boolean; post?: NewsFeedPost; error?: string }> {
  try {
    const res = await fetch('/api/web/scrape-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: source.url,
        name: source.name,
        category: source.category,
      }),
    });
    const data = await res.json();
    if (data.success && data.post) {
      updateSourceStatus(source.id, {
        lastFetchedAt: Date.now(),
        itemsFetchedCount: (source.itemsFetchedCount || 0) + 1,
        lastStatus: `सफल - लेख शीर्षक: ${data.post.title.slice(0, 30)}...`,
        lastError: undefined,
      });
      window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated'));
      return { success: true, post: data.post };
    } else {
      updateSourceStatus(source.id, {
        lastFetchedAt: Date.now(),
        lastStatus: 'त्रुटि - वेब स्क्रैप विफल',
        lastError: data.error || 'अज्ञात त्रुटि',
      });
      return { success: false, error: data.error };
    }
  } catch (err: any) {
    const msg = err.message || 'नेटवर्क कनेक्शन विफल';
    updateSourceStatus(source.id, {
      lastFetchedAt: Date.now(),
      lastStatus: 'त्रुटि - वेब स्क्रैप विफल',
      lastError: msg,
    });
    return { success: false, error: msg };
  }
}

/**
 * Synchronizes all configured active production RSS and Web sources in batch
 */
export async function syncAllSourcesLive(
  sources?: AdminRssSource[]
): Promise<{ success: boolean; totalNewItems: number; sourceResults?: any[]; error?: string }> {
  try {
    const activeList = (sources || getAdminRssSources()).filter((s) => s.isActive);
    const res = await fetch('/api/sources/sync-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources: activeList }),
    });
    const data = await res.json();
    if (data.success) {
      window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated'));
      return { success: true, totalNewItems: data.totalNewItems, sourceResults: data.sourceResults };
    } else {
      return { success: false, totalNewItems: 0, error: data.error };
    }
  } catch (err: any) {
    return { success: false, totalNewItems: 0, error: err.message || 'सिंक अनुरोध विफल' };
  }
}

/**
 * Returns any locally cached live RSS posts, or empty array.
 * Absolutely NO mock, sample, or dummy news is returned.
 */
export function getActiveRssNewsPosts(): NewsFeedPost[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIVE_POSTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}
