/**
 * AI NEWS MAKER — UNIFIED ANALYTICS & GTM DATALAYER MANAGER
 * Supports Google Tag Manager (GTM-NZ9PBDQK) and Google Analytics 4 (G-L3HVGF1YEJ)
 * Strictly zero PII (no phone, email, password, OTP, tokens, or financial secrets).
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

// Sanitizes any payload to strictly prevent PII leaks
function sanitizePayload(data?: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object') return {};
  const clean: Record<string, any> = {};
  const forbiddenKeys = new Set([
    'password',
    'otp',
    'token',
    'authtoken',
    'accesstoken',
    'secret',
    'email',
    'phone',
    'phonenumber',
    'mobile',
    'cardnumber',
    'cvv',
    'pin',
  ]);

  for (const [k, v] of Object.entries(data)) {
    const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (forbiddenKeys.has(lowerKey)) continue;
    if (typeof v === 'string') {
      // Prevent emails or phone numbers embedded inside strings
      if (v.includes('@') && v.includes('.')) continue;
      if (/^\+?[0-9]{10,14}$/.test(v.trim())) continue;
    }
    clean[k] = v;
  }
  return clean;
}

/**
 * Pushes an event to GTM dataLayer and fires gtag if available
 */
export function trackEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];

  const safeParams = sanitizePayload(params);
  const payload = {
    event: eventName,
    ...safeParams,
    timestamp: Date.now(),
  };

  // Push to Google Tag Manager dataLayer
  window.dataLayer.push(payload);

  // Direct gtag event call (guarded to avoid duplicate page_views)
  if (typeof window.gtag === 'function' && eventName !== 'page_view') {
    try {
      window.gtag('event', eventName, safeParams);
    } catch {}
  }
}

/**
 * Tracks virtual SPA page views across React route changes without duplicates
 */
export function trackSpaPageView(pageTitle: string, pagePath: string): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];

  const currentUrl = window.location.href;

  // 1. Push virtualPageview to Google Tag Manager dataLayer
  window.dataLayer.push({
    event: 'virtualPageview',
    page_title: pageTitle,
    page_path: pagePath,
    page_location: currentUrl,
  });

  // 2. Direct GA4 gtag page_view event
  if (typeof window.gtag === 'function') {
    try {
      window.gtag('event', 'page_view', {
        page_title: pageTitle,
        page_location: currentUrl,
        page_path: pagePath,
        send_to: 'G-L3HVGF1YEJ',
      });
    } catch {}
  }
}
