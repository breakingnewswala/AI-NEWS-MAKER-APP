// AI News Maker - User Custom Templates & Layouts Manager
// Available to PRO and VIP DESK / VIP and Admin users

export interface UserCustomTemplate {
  id: string;
  userId?: string;
  name: string;
  baseTemplateId?: string;
  aspectRatio: '4:5' | '1:1' | '9:16' | '16:9';
  headlineMaxLines: number;
  description?: string;
  previewUrl?: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY_USER_TEMPLATES = 'ai_news_user_custom_templates_v1';

export const DEFAULT_USER_TEMPLATES: UserCustomTemplate[] = [
  {
    id: 'tmpl_pro_clean_4_5',
    name: 'प्रो 4:5 फोटो न्यूज़ (क्लीन लेआउट)',
    baseTemplateId: 'graphic_001',
    aspectRatio: '4:5',
    headlineMaxLines: 3,
    description: '4:5 पोर्ट्रेट, टॉप फोटो व 3-लाइन बॉटम हेडलाइन एरिया',
    previewUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&q=80',
    createdAt: 1726000000000,
    updatedAt: 1726000000000,
  },
  {
    id: 'tmpl_vip_breaking_gold',
    name: 'VIP डेस्क गोल्ड ब्रेकिंग टेम्पलेट',
    baseTemplateId: 'graphic_004',
    aspectRatio: '4:5',
    headlineMaxLines: 2,
    description: 'गोल्डन रिबन व VIP डेस्क विशेष ब्रेकिंग फ्रेम',
    previewUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
    createdAt: 1726000001000,
    updatedAt: 1726000001000,
  },
];

export function getUserCustomTemplates(userId?: string): UserCustomTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_USER_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_TEMPLATES);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        if (!userId) return list;
        const cleanId = userId.toLowerCase().trim();
        return list.filter((t) => !t.userId || t.userId.toLowerCase().trim() === cleanId || t.userId === 'general');
      }
    }
  } catch {}
  return DEFAULT_USER_TEMPLATES;
}

export function saveUserCustomTemplate(
  data: Omit<UserCustomTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  userId?: string
): UserCustomTemplate {
  const newTmpl: UserCustomTemplate = {
    id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: userId || 'general',
    name: data.name.trim() || 'कस्टम न्यूज़ टेम्पलेट',
    baseTemplateId: data.baseTemplateId || 'graphic_001',
    aspectRatio: data.aspectRatio || '4:5',
    headlineMaxLines: data.headlineMaxLines || 3,
    description: data.description || 'कस्टम डिज़ाइन टेम्पलेट',
    previewUrl: data.previewUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&q=80',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const current = getUserCustomTemplates();
  const updated = [newTmpl, ...current.filter((t) => t.id !== newTmpl.id)];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_USER_TEMPLATES, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('ai_news_user_templates_updated', { detail: newTmpl }));
    } catch {}
  }
  return newTmpl;
}

export function deleteUserCustomTemplate(id: string): void {
  const current = getUserCustomTemplates();
  const updated = current.filter((t) => t.id !== id);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_USER_TEMPLATES, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('ai_news_user_templates_updated'));
    } catch {}
  }
}
