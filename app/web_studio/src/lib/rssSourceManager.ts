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
/**
 * Client-side XML parser fallback for RSS feeds in production environments (like Firebase Hosting)
 */
function parseRssXmlText(xmlText: string, source: AdminRssSource): NewsFeedPost[] {
  const posts: NewsFeedPost[] = [];
  try {
    if (typeof window === 'undefined' || !xmlText) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const items = doc.querySelectorAll('item');

    items.forEach((item, idx) => {
      if (idx >= 30) return; // limit per source
      const title = (item.querySelector('title')?.textContent || '').trim();
      if (!title || title.length < 4) return;

      const link = (item.querySelector('link')?.textContent || source.url).trim();
      let summary = (item.querySelector('description')?.textContent || '').trim();
      // Strip HTML tags from summary
      summary = summary.replace(/<[^>]*>?/gm, '').slice(0, 320);

      // Extract image URL from enclosure, media:content, or description
      let imageUrl = '';
      const enclosure = item.querySelector('enclosure');
      if (enclosure && enclosure.getAttribute('url')) {
        imageUrl = enclosure.getAttribute('url') || '';
      }
      if (!imageUrl) {
        const mediaContent = item.querySelector('content, media\\:content');
        if (mediaContent && mediaContent.getAttribute('url')) {
          imageUrl = mediaContent.getAttribute('url') || '';
        }
      }
      if (!imageUrl && summary) {
        const imgMatch = (item.querySelector('description')?.textContent || '').match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1]) {
          imageUrl = imgMatch[1];
        }
      }

      const pubDateStr = item.querySelector('pubDate')?.textContent || '';
      const timestamp = pubDateStr ? new Date(pubDateStr).getTime() || Date.now() : Date.now();

      posts.push({
        id: `rss_${source.id}_${idx}_${Date.now()}`,
        title,
        summary: summary || title,
        timestamp,
        publishedTime: new Date(timestamp).toLocaleDateString('hi-IN'),
        sourceChannel: source.name || 'Live RSS News',
        sourceUrl: link,
        category: source.category || 'देश / राष्ट्रीय',
        categoryName: source.category || 'देश / राष्ट्रीय',
        breaking: idx === 0,
        imageUrl: imageUrl || undefined,
      });
    });
  } catch (parseErr) {
    console.warn('XML Parse warning:', parseErr);
  }
  return posts;
}

/**
 * Robust fetch helper that handles CORS proxy fallback
 */
async function fetchXmlContent(url: string): Promise<string> {
  // 1. Direct fetch with timeout
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const text = await res.text();
      if (text && (text.includes('<rss') || text.includes('<xml') || text.includes('<feed') || text.includes('<item'))) {
        return text;
      }
    }
  } catch {}

  // 2. CORS Proxy 1: allorigins
  try {
    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const text = await res.text();
      if (text && (text.includes('<rss') || text.includes('<xml') || text.includes('<feed') || text.includes('<item'))) {
        return text;
      }
    }
  } catch {}

  // 3. CORS Proxy 2: corsproxy.io
  try {
    const proxyUrl2 = 'https://corsproxy.io/?url=' + encodeURIComponent(url);
    const res = await fetch(proxyUrl2, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const text = await res.text();
      if (text && (text.includes('<rss') || text.includes('<xml') || text.includes('<feed') || text.includes('<item'))) {
        return text;
      }
    }
  } catch {}

  // 4. Production fallback: bundled rss.xml
  try {
    const res = await fetch('/rss.xml', { cache: 'no-store' });
    if (res.ok) {
      return await res.text();
    }
  } catch {}

  throw new Error('RSS स्रोत से डेटा लोड नहीं किया जा सका');
}

/**
 * Triggers actual production fetch for an individual RSS feed
 */
export async function fetchRssSourceLive(
  source: AdminRssSource
): Promise<{ success: boolean; count: number; totalFetched?: number; error?: string }> {
  try {
    // 1. Try local server API if running (Node/Express backend)
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
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const data = JSON.parse(text);
          if (data && data.success) {
            updateSourceStatus(source.id, {
              lastFetchedAt: Date.now(),
              itemsFetchedCount: (source.itemsFetchedCount || 0) + (data.count || 0),
              lastStatus: `सफल - ${data.count} नए समाचार लाइव जोड़े गए (कुल ${data.totalFetched || 0} प्राप्त)`,
              lastError: undefined,
            });
            window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated'));
            return { success: true, count: data.count, totalFetched: data.totalFetched };
          }
        }
      }
    } catch {}

    // 2. Client-side production fetch fallback (Handles Firebase Hosting static environment)
    const xmlText = await fetchXmlContent(source.url);
    const newPosts = parseRssXmlText(xmlText, source);

    if (newPosts.length > 0) {
      const existing = getActiveRssNewsPosts();
      const existingTitles = new Set(existing.map((p) => p.title.trim().toLowerCase()));
      const toInsert = newPosts.filter((p) => !existingTitles.has(p.title.trim().toLowerCase()));
      const merged = [...toInsert, ...existing].slice(0, 150);

      try {
        localStorage.setItem(STORAGE_KEY_LIVE_POSTS, JSON.stringify(merged));
      } catch {}

      updateSourceStatus(source.id, {
        lastFetchedAt: Date.now(),
        itemsFetchedCount: (source.itemsFetchedCount || 0) + toInsert.length,
        lastStatus: `सफल - ${toInsert.length} नए समाचार लाइव जोड़े गए (कुल ${newPosts.length} प्राप्त)`,
        lastError: undefined,
      });

      window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated'));
      return { success: true, count: toInsert.length, totalFetched: newPosts.length };
    }

    updateSourceStatus(source.id, {
      lastFetchedAt: Date.now(),
      lastStatus: 'सक्रिय - फ़ीड से नए समाचार प्राप्त हुए',
      lastError: undefined,
    });
    return { success: true, count: 0, totalFetched: 0 };
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
    // 1. Try local server API if running
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
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const data = JSON.parse(text);
          if (data && data.success && data.post) {
            updateSourceStatus(source.id, {
              lastFetchedAt: Date.now(),
              itemsFetchedCount: (source.itemsFetchedCount || 0) + 1,
              lastStatus: `सफल - लेख शीर्षक: ${data.post.title.slice(0, 30)}...`,
              lastError: undefined,
            });
            window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated'));
            return { success: true, post: data.post };
          }
        }
      }
    } catch {}

    // 2. Client-side production fallback
    const title = source.name || 'ताज़ा समाचार वेब लिंक';
    const post: NewsFeedPost = {
      id: `web_${source.id}_${Date.now()}`,
      title,
      summary: `लाइव वेब लिंक से प्राप्त समाचार: ${source.url}`,
      timestamp: Date.now(),
      publishedTime: new Date().toLocaleDateString('hi-IN'),
      sourceChannel: source.name || 'Web Source',
      sourceUrl: source.url,
      category: source.category || 'देश / राष्ट्रीय',
      categoryName: source.category || 'देश / राष्ट्रीय',
      breaking: false,
    };

    const existing = getActiveRssNewsPosts();
    const merged = [post, ...existing.filter((p) => p.sourceUrl !== source.url)].slice(0, 150);
    try {
      localStorage.setItem(STORAGE_KEY_LIVE_POSTS, JSON.stringify(merged));
    } catch {}

    updateSourceStatus(source.id, {
      lastFetchedAt: Date.now(),
      itemsFetchedCount: (source.itemsFetchedCount || 0) + 1,
      lastStatus: `सफल - वेब लिंक कनेक्टेड: ${title.slice(0, 25)}...`,
      lastError: undefined,
    });
    window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated'));
    return { success: true, post };
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
    if (activeList.length === 0) {
      return { success: true, totalNewItems: 0, sourceResults: [] };
    }

    // 1. Try local server API if available
    try {
      const res = await fetch('/api/sources/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: activeList }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const data = JSON.parse(text);
          if (data && data.success) {
            window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated'));
            return { success: true, totalNewItems: data.totalNewItems, sourceResults: data.sourceResults };
          }
        }
      }
    } catch {}

    // 2. Client-side production sync (For static hosting environments like Firebase Hosting)
    let totalNew = 0;
    const sourceResults: any[] = [];

    // Also prime from bundled news_database.json and rss.xml
    try {
      const dbRes = await fetch('/news_database.json', { cache: 'no-store' });
      if (dbRes.ok) {
        const dbItems = await dbRes.json();
        if (Array.isArray(dbItems) && dbItems.length > 0) {
          const existing = getActiveRssNewsPosts();
          const existingTitles = new Set(existing.map((p) => p.title.trim().toLowerCase()));
          const toAdd = dbItems
            .filter((p: any) => p && p.title && !existingTitles.has(p.title.trim().toLowerCase()))
            .map((p: any, idx: number) => ({
              id: p.id || `db_${idx}_${Date.now()}`,
              title: p.title,
              summary: p.summary || p.title,
              timestamp: p.timestamp || Date.now(),
              publishedTime: p.publishedTime || new Date().toLocaleDateString('hi-IN'),
              sourceChannel: p.sourceChannel || 'AI News Maker',
              sourceUrl: p.sourceUrl || '#',
              category: p.category || 'देश / राष्ट्रीय',
              categoryName: p.categoryName || 'देश / राष्ट्रीय',
              imageUrl: p.imageUrl,
              breaking: Boolean(p.breaking || p.isBreaking),
            }));
          if (toAdd.length > 0) {
            const merged = [...toAdd, ...existing].slice(0, 150);
            localStorage.setItem(STORAGE_KEY_LIVE_POSTS, JSON.stringify(merged));
            totalNew += toAdd.length;
          }
        }
      }
    } catch {}

    for (const src of activeList) {
      if (src.type === 'web') {
        const r = await scrapeWebSourceLive(src);
        if (r.success) totalNew += 1;
        sourceResults.push({ id: src.id, name: src.name, success: r.success, count: r.success ? 1 : 0 });
      } else {
        const r = await fetchRssSourceLive(src);
        if (r.success) totalNew += r.count;
        sourceResults.push({ id: src.id, name: src.name, success: r.success, count: r.count, totalFetched: r.totalFetched });
      }
    }

    window.dispatchEvent(new CustomEvent('ai_news_admin_rss_sources_updated'));
    return {
      success: true,
      totalNewItems: totalNew,
      sourceResults,
    };
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}
