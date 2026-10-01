/**
 * Twilio Integration Service
 * Manages Twilio SMS, WhatsApp notifications, and OTP verification
 */

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromPhone?: string;
  whatsappFrom?: string;
  isActive: boolean;
}

export const TWILIO_ACCOUNT_SID_DEFAULT = 'ACc5f93634dce84c45a2c23c7063571f13';
export const TWILIO_AUTH_TOKEN_DEFAULT = '34b06e526dbca37904003a7ef6afae73';
export const TWILIO_API_KEY_SID_DEFAULT = 'SK60e777e96b2b42031b71af39f7399b81';
export const TWILIO_API_KEY_SECRET_DEFAULT = 'oSGdy06RjS9RaGuJHIWs9CU0HIcNnquv';

const STORAGE_KEY_TWILIO = 'ai_news_twilio_config_v1';

export function getTwilioConfig(): TwilioConfig {
  if (typeof window === 'undefined') {
    return {
      accountSid: TWILIO_ACCOUNT_SID_DEFAULT,
      authToken: TWILIO_AUTH_TOKEN_DEFAULT,
      isActive: true,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TWILIO);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        accountSid: parsed.accountSid || TWILIO_ACCOUNT_SID_DEFAULT,
        authToken: parsed.authToken || TWILIO_AUTH_TOKEN_DEFAULT,
        fromPhone: parsed.fromPhone || '',
        whatsappFrom: parsed.whatsappFrom || 'whatsapp:+14155238886',
        isActive: parsed.isActive !== false,
      };
    }
  } catch (e) {
    console.warn('Error reading twilio config:', e);
  }
  return {
    accountSid: TWILIO_ACCOUNT_SID_DEFAULT,
    authToken: TWILIO_AUTH_TOKEN_DEFAULT,
    fromPhone: '',
    whatsappFrom: 'whatsapp:+14155238886',
    isActive: true,
  };
}

export function saveTwilioConfig(cfg: Partial<TwilioConfig>): TwilioConfig {
  const current = getTwilioConfig();
  const updated: TwilioConfig = { ...current, ...cfg };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_TWILIO, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ai_news_twilio_config_updated', { detail: updated }));
  }
  return updated;
}

export function getTwilioConfigStatus() {
  const cfg = getTwilioConfig();
  return {
    accountSid: cfg.accountSid,
    authToken: cfg.authToken,
    isConfigured: Boolean(cfg.accountSid && cfg.authToken),
    fromPhone: cfg.fromPhone,
    whatsappFrom: cfg.whatsappFrom,
    isActive: cfg.isActive,
  };
}

export async function sendTwilioSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const cleanTo = to.replace(/[^0-9+]/g, '');
    const res = await fetch('/api/twilio/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: cleanTo, message }),
    });
    const data = await res.json();
    return data;
  } catch (e: any) {
    return { success: false, error: e.message || 'SMS भेजने में विफलता' };
  }
}

export async function sendTwilioWhatsApp(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const cleanTo = to.replace(/[^0-9+]/g, '');
    const res = await fetch('/api/twilio/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: cleanTo, message }),
    });
    const data = await res.json();
    return data;
  } catch (e: any) {
    return { success: false, error: e.message || 'WhatsApp संदेश भेजने में विफलता' };
  }
}

export async function sendTwilioOtp(mobile: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const cleanMobile = mobile.replace(/[^0-9+]/g, '');
    const res = await fetch('/api/twilio/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: cleanMobile }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'OTP प्रेषण में त्रुटि' };
  }
}

export async function verifyTwilioOtp(mobile: string, otp: string): Promise<{ success: boolean; valid?: boolean; message?: string; error?: string }> {
  try {
    const cleanMobile = mobile.replace(/[^0-9+]/g, '');
    const res = await fetch('/api/twilio/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: cleanMobile, otp: otp.trim() }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || 'OTP सत्यापन में त्रुटि' };
  }
}
