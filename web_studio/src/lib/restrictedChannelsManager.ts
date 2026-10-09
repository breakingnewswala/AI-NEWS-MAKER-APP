/**
 * Restricted Channels Manager
 * Protects major / official news brands from unauthorized account creation and branding imitation.
 */

export interface RestrictedChannel {
  id: string;
  channelName: string;
  websiteUrl: string;
  username: string;
  logoUrl?: string;
  reason?: string;
  createdAt: number;
}

const STORAGE_KEY_RESTRICTED_CHANNELS = 'ai_news_restricted_channels_v1';

export const DEFAULT_RESTRICTED_CHANNELS: RestrictedChannel[] = [
  {
    id: 'res_aajtak',
    channelName: 'आज तक (Aaj Tak)',
    websiteUrl: 'aajtak.in',
    username: 'aajtak',
    logoUrl: 'https://akm-img-a-in.tosshub.com/aajtak/resource/img/aajtak-logo-156X116.png',
    reason: 'राष्ट्रीय समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित',
    createdAt: 1700000000000,
  },
  {
    id: 'res_abp',
    channelName: 'एबीपी न्यूज़ (ABP News)',
    websiteUrl: 'abplive.com',
    username: 'abpnews',
    logoUrl: 'https://static.abplive.com/frontend/images/ABP_Hindi.svg',
    reason: 'राष्ट्रीय समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित',
    createdAt: 1700000000000,
  },
  {
    id: 'res_ndtv',
    channelName: 'एनडीटीवी इंडिया (NDTV India)',
    websiteUrl: 'ndtv.in',
    username: 'ndtv',
    logoUrl: 'https://drop.ndtv.com/homepage/images/ndtvlogo.svg',
    reason: 'राष्ट्रीय समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित',
    createdAt: 1700000000000,
  },
  {
    id: 'res_zeenews',
    channelName: 'ज़ी न्यूज़ (Zee News)',
    websiteUrl: 'zeenews.india.com',
    username: 'zeenews',
    logoUrl: 'https://english.cdn.zeenews.com/static/apprun/dna/icons/dna-logo.svg',
    reason: 'राष्ट्रीय समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित',
    createdAt: 1700000000000,
  },
  {
    id: 'res_indiatv',
    channelName: 'इंडिया टीवी (India TV)',
    websiteUrl: 'indiatvnews.com',
    username: 'indiatv',
    logoUrl: 'https://resize.indiatvnews.com/en/resize/newbucket/1200_-/2020/03/indiatv-logo-1584955685.jpg',
    reason: 'राष्ट्रीय समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित',
    createdAt: 1700000000000,
  },
  {
    id: 'res_republic',
    channelName: 'रिपब्लिक भारत (Republic Bharat)',
    websiteUrl: 'republicbharat.com',
    username: 'republicbharat',
    logoUrl: 'https://www.republicbharat.com/assets/images/bharat-logo.svg',
    reason: 'राष्ट्रीय समाचार नेटवर्क - अनधिकृत उपयोग प्रतिबंधित',
    createdAt: 1700000000000,
  },
  {
    id: 'res_news18',
    channelName: 'न्यूज़18 इंडिया (News18 India)',
    websiteUrl: 'news18.com',
    username: 'news18',
    logoUrl: 'https://images.news18.com/static_netstorage/images/news18_logo_hindi.svg',
    reason: 'राष्ट्रीय समाचार नेटवर्क - अनधिकृत उपयोग प्रतिबंधित',
    createdAt: 1700000000000,
  },
  {
    id: 'res_bhaskar',
    channelName: 'दैनिक भास्कर (Dainik Bhaskar)',
    websiteUrl: 'dainikbhaskar.com',
    username: 'dainikbhaskar',
    logoUrl: 'https://www.bhaskar.com/assets/images/db-logo-hindi.svg',
    reason: 'राष्ट्रीय समाचार पत्र व मीडिया समूह',
    createdAt: 1700000000000,
  },
  {
    id: 'res_amarujala',
    channelName: 'अमर उजाला (Amar Ujala)',
    websiteUrl: 'amarujala.com',
    username: 'amarujala',
    logoUrl: 'https://www.amarujala.com/assets/images/amarujala.svg',
    reason: 'राष्ट्रीय समाचार पत्र - अनधिकृत उपयोग प्रतिबंधित',
    createdAt: 1700000000000,
  },
  {
    id: 'res_jagran',
    channelName: 'दैनिक जागरण (Dainik Jagran)',
    websiteUrl: 'jagran.com',
    username: 'dainikjagran',
    logoUrl: 'https://www.jagran.com/assets/images/jagran-logo.svg',
    reason: 'राष्ट्रीय समाचार पत्र समूह',
    createdAt: 1700000000000,
  },
  {
    id: 'res_hindustan',
    channelName: 'हिन्दुस्तान (Live Hindustan)',
    websiteUrl: 'livehindustan.com',
    username: 'livehindustan',
    logoUrl: 'https://www.livehindustan.com/static/lh-logo.svg',
    reason: 'राष्ट्रीय समाचार पत्र समूह',
    createdAt: 1700000000000,
  },
  {
    id: 'res_bbc',
    channelName: 'बीबीसी हिंदी (BBC Hindi)',
    websiteUrl: 'bbc.com/hindi',
    username: 'bbchindi',
    logoUrl: 'https://news.files.bbci.co.uk/ws/img/logos/og/hindi.png',
    reason: 'अंतर्राष्ट्रीय समाचार संगठन',
    createdAt: 1700000000000,
  },
];

export function getRestrictedChannels(): RestrictedChannel[] {
  if (typeof window === 'undefined') return DEFAULT_RESTRICTED_CHANNELS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESTRICTED_CHANNELS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading restricted channels:', e);
  }
  return DEFAULT_RESTRICTED_CHANNELS;
}

export async function fetchRemoteRestrictedChannels(): Promise<RestrictedChannel[]> {
  try {
    const res = await fetch('/api/channels');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.channels) && data.channels.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_RESTRICTED_CHANNELS, JSON.stringify(data.channels));
          window.dispatchEvent(new CustomEvent('ai_news_restricted_channels_updated', { detail: data.channels }));
        }
        return data.channels;
      }
    }
  } catch (e) {
    console.warn('Could not fetch remote channels:', e);
  }
  return getRestrictedChannels();
}

export function saveRestrictedChannels(list: RestrictedChannel[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RESTRICTED_CHANNELS, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('ai_news_restricted_channels_updated', { detail: list }));
  } catch (e) {
    console.warn('Error saving restricted channels:', e);
  }
}

export function addRestrictedChannel(data: {
  channelName: string;
  websiteUrl: string;
  username: string;
  logoUrl?: string;
  reason?: string;
}): RestrictedChannel {
  const current = getRestrictedChannels();
  const cleanUser = cleanUsername(data.username);
  const newChannel: RestrictedChannel = {
    id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    channelName: data.channelName.trim(),
    websiteUrl: cleanDomain(data.websiteUrl),
    username: cleanUser,
    logoUrl: data.logoUrl || '',
    reason: data.reason || 'प्रतिबंधित आधिकारिक चैनल',
    createdAt: Date.now(),
  };

  const updated = [newChannel, ...current];
  saveRestrictedChannels(updated);

  // Sync with Backend
  fetch('/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newChannel),
  }).catch((err) => console.warn('Remote add channel failed:', err));

  return newChannel;
}

export function editRestrictedChannel(id: string, updates: Partial<RestrictedChannel>): boolean {
  const current = getRestrictedChannels();
  const idx = current.findIndex((c) => c.id === id);
  if (idx >= 0) {
    const updated = [...current];
    updated[idx] = { ...updated[idx], ...updates };
    saveRestrictedChannels(updated);

    // Sync with Backend
    fetch(`/api/channels/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch((err) => console.warn('Remote edit channel failed:', err));

    return true;
  }
  return false;
}

export function deleteRestrictedChannel(id: string): boolean {
  const current = getRestrictedChannels();
  const updated = current.filter((c) => c.id !== id);
  if (updated.length !== current.length) {
    saveRestrictedChannels(updated);

    // Sync with Backend
    fetch(`/api/channels/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch((err) => console.warn('Remote delete channel failed:', err));

    return true;
  }
  return false;
}

// Helpers for clean comparison
export function cleanDomain(url: string = ''): string {
  return url
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, ''); // strip path
}

export function cleanUsername(username: string = ''): string {
  return username
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '');
}

export function cleanChannelName(name: string = ''): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // remove parenthetical (Aaj Tak)
    .replace(/[^a-z0-9\u0900-\u097F]/gi, '')
    .trim();
}

/**
 * Checks if a given Channel Name, Website, or Username conflicts with Restricted Channels list.
 */
export function isChannelRestricted(
  channelName?: string,
  websiteUrl?: string,
  username?: string
): { isBlocked: boolean; matchedName?: string; reason?: string } {
  const list = getRestrictedChannels();

  const cDomain = cleanDomain(websiteUrl || '');
  const cUser = cleanUsername(username || '');
  const cName = cleanChannelName(channelName || '');

  for (const item of list) {
    // 1. Check Website URL
    if (cDomain && item.websiteUrl) {
      const itemDomain = cleanDomain(item.websiteUrl);
      if (cDomain === itemDomain || cDomain.endsWith(`.${itemDomain}`) || itemDomain.endsWith(`.${cDomain}`)) {
        return {
          isBlocked: true,
          matchedName: item.channelName,
          reason: `⛔ वेबसाइट '${cDomain}' राष्ट्रीय/आधिकारिक समाचार चैनल '${item.channelName}' की प्रतिबंधित सूची में दर्ज है। आप इस वेबसाइट से अकाउंट नहीं बना सकते।`,
        };
      }
    }

    // 2. Check Username
    if (cUser && item.username) {
      const itemUser = cleanUsername(item.username);
      if (cUser === itemUser) {
        return {
          isBlocked: true,
          matchedName: item.channelName,
          reason: `⛔ यूज़रनेम '${cUser}' आधिकारिक चैनल '${item.channelName}' के लिए सुरक्षित व प्रतिबंधित है।`,
        };
      }
    }

    // 3. Check Channel Name
    if (cName && item.channelName) {
      const itemName = cleanChannelName(item.channelName);
      if (
        (cName.length >= 3 && itemName.includes(cName)) ||
        (itemName.length >= 3 && cName.includes(itemName))
      ) {
        return {
          isBlocked: true,
          matchedName: item.channelName,
          reason: `⛔ चैनल नाम '${channelName}' राष्ट्रीय/प्रतिबंधित चैनल '${item.channelName}' से मेल खाता है। कृपया अपने स्वयं के अधिकृत चैनल का नाम उपयोग करें।`,
        };
      }
    }
  }

  return { isBlocked: false };
}
