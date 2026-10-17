// Utility to retrieve profile-configured Header/Footer settings from Android Bridge or Local Storage

export interface ProfileHeaderFooterConfig {
  templateId: string;
  brandName?: string;
  brandTagline?: string;
  logoUrl?: string;
  customLogoUrl?: string;
  headerPngUrl?: string;
  customHeaderPng?: string;
  footerPngUrl?: string;
  customFooterPng?: string;
  socialHandle?: string;
  whatsappNumber?: string;
  newsUpdateBadge?: string;
  isConfigured?: boolean;
}

export function getProfileHeaderFooter(templateId: string): ProfileHeaderFooterConfig | null {
  try {
    let jsonStr: string | null = null;
    if (typeof window !== 'undefined' && (window as any).AndroidBridge?.getProfileHeaderFooterJson) {
      jsonStr = (window as any).AndroidBridge.getProfileHeaderFooterJson();
    }
    if (!jsonStr && typeof localStorage !== 'undefined') {
      jsonStr = localStorage.getItem('profile_header_footer_json') || localStorage.getItem('news_template_configs');
    }
    if (!jsonStr) return null;

    const data: any = JSON.parse(jsonStr);
    const templates = data.templates || data.configs || data;
    if (!templates) return null;

    // Normalizing templateId (e.g. jacket-original, preset-1)
    const candidates = [
      templateId,
      templateId.replace('preset-', 'jacket-'),
      templateId.replace('jacket-', 'preset-'),
    ];

    for (const key of candidates) {
      const match = templates[key];
      if (match && (match.isConfigured || match.brandName || match.customHeaderPng || match.customLogoUrl)) {
        return {
          templateId: key,
          brandName: match.brandName || '',
          brandTagline: match.brandTagline || '',
          logoUrl: match.customLogoUrl || match.logoUrl || '',
          customLogoUrl: match.customLogoUrl || match.logoUrl || '',
          headerPngUrl: match.customHeaderPng || match.headerPngUrl || '',
          customHeaderPng: match.customHeaderPng || match.headerPngUrl || '',
          footerPngUrl: match.customFooterPng || match.footerPngUrl || '',
          customFooterPng: match.customFooterPng || match.footerPngUrl || '',
          socialHandle: match.socialHandle || '',
          whatsappNumber: match.whatsappNumber || '',
          newsUpdateBadge: match.newsUpdateBadge || '',
          isConfigured: true,
        };
      }
    }

    // If applyToAll is on, find any configured template
    if (data.applyToAll) {
      const firstConfigured = Object.values(templates).find(
        (c: any) => c && (c.isConfigured || c.brandName || c.customHeaderPng || c.customLogoUrl)
      ) as any;
      if (firstConfigured) {
        return {
          templateId,
          brandName: firstConfigured.brandName || '',
          brandTagline: firstConfigured.brandTagline || '',
          logoUrl: firstConfigured.customLogoUrl || firstConfigured.logoUrl || '',
          customLogoUrl: firstConfigured.customLogoUrl || firstConfigured.logoUrl || '',
          headerPngUrl: firstConfigured.customHeaderPng || firstConfigured.headerPngUrl || '',
          customHeaderPng: firstConfigured.customHeaderPng || firstConfigured.headerPngUrl || '',
          footerPngUrl: firstConfigured.customFooterPng || firstConfigured.footerPngUrl || '',
          customFooterPng: firstConfigured.customFooterPng || firstConfigured.footerPngUrl || '',
          socialHandle: firstConfigured.socialHandle || '',
          whatsappNumber: firstConfigured.whatsappNumber || '',
          newsUpdateBadge: firstConfigured.newsUpdateBadge || '',
          isConfigured: true,
        };
      }
    }

    return null;
  } catch (e) {
    console.warn('Error fetching profile header/footer:', e);
    return null;
  }
}

export function getPermanentUserLogo(): string {
  if (typeof window === 'undefined') return '';
  try {
    // 1. Android Bridge
    if ((window as any).AndroidBridge?.getChannelProfile) {
      const nativeJson = (window as any).AndroidBridge.getChannelProfile();
      if (nativeJson && nativeJson !== '{}') {
        const parsed = JSON.parse(nativeJson);
        if (parsed?.channelLogoUrl) return parsed.channelLogoUrl;
      }
    }
    // 2. user_channel_profile
    const userChan = localStorage.getItem('user_channel_profile');
    if (userChan) {
      const p = JSON.parse(userChan);
      if (p?.channelLogoUrl) return p.channelLogoUrl;
      if (p?.channelLogoPngUrl) return p.channelLogoPngUrl;
      if (p?.channelLogoGifUrl) return p.channelLogoGifUrl;
    }
    // 3. user_profile_data
    const userProf = localStorage.getItem('user_profile_data');
    if (userProf) {
      const p = JSON.parse(userProf);
      if (p?.channelLogoUrl) return p.channelLogoUrl;
      if (p?.logoUrl) return p.logoUrl;
    }
    // 4. profile_header_footer_json
    const hf = localStorage.getItem('profile_header_footer_json');
    if (hf) {
      const p = JSON.parse(hf);
      if (p?.templates?.graphic_001?.customLogoUrl) return p.templates.graphic_001.customLogoUrl;
    }
    // 5. reporter_auth_session
    const authSess = localStorage.getItem('reporter_auth_session');
    if (authSess) {
      const u = JSON.parse(authSess);
      if (u?.channelLogoUrl) return u.channelLogoUrl;
      if (u?.email) {
        const uEmailProf = localStorage.getItem(`user_profile_${u.email.toLowerCase().trim()}`);
        if (uEmailProf) {
          const ep = JSON.parse(uEmailProf);
          if (ep?.channelLogoUrl) return ep.channelLogoUrl;
        }
      }
    }
    // 6. reporter_current_user
    const repCurr = localStorage.getItem('reporter_current_user');
    if (repCurr) {
      const u = JSON.parse(repCurr);
      if (u?.channelLogoUrl) return u.channelLogoUrl;
    }
  } catch {}
  return '';
}
