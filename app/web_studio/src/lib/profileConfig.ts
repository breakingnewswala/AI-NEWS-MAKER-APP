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
