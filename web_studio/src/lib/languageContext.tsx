import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppLanguage = 'hi' | 'en';

const STORAGE_KEY_LANGUAGE = 'app_language';

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  isHindi: boolean;
  t: (key: string, fallback?: string) => string;
}

// Comprehensive dictionary for complete app translation
export const TRANSLATIONS: Record<string, { hi: string; en: string }> = {
  // Navigation Tabs
  nav_home: { hi: 'होम (ताज़ा समाचार)', en: 'Home (Live News)' },
  nav_videos: { hi: 'वीडियो फ़ीड', en: 'Video Feed' },
  nav_studio: { hi: 'ग्राफिक फोटो स्टूडियो', en: 'Graphic Photo Studio' },
  nav_epaper: { hi: 'ई-पेपर अखबार', en: 'E-Paper Newspaper' },
  nav_profile: { hi: 'प्रोफाइल व सेटिंग्स', en: 'Profile & Settings' },

  // Editor Steps
  step_1: { hi: 'फ्रेम्स', en: 'Frames' },
  step_2: { hi: 'AI टूल्स', en: 'AI Tools' },
  step_3: { hi: 'हेडलाइंस', en: 'Headlines' },
  step_4: { hi: 'फोटोज', en: 'Photos' },
  step_5: { hi: 'लोकेशन-डेट-वॉटरमार्क', en: 'Location-Date-Watermark' },
  step_6: { hi: 'हैडर-फुटर', en: 'Header-Footer' },
  step_7: { hi: 'डाउनलोड', en: 'Download' },

  // Common UI Buttons & Labels
  live_preview: { hi: 'लाइव प्रीव्यू', en: 'Live Preview' },
  steps: { hi: 'स्टेप्स', en: 'Steps' },
  step_preview_instruction: { hi: 'प्रीव्यू स्क्रीन पर तुरंत लाइव अपडेट देखें', en: 'See instant live updates on the preview screen' },
  download_hd: { hi: 'HD डाउनलोड', en: 'HD Download' },
  downloading: { hi: 'डाउनलोड हो रहा है...', en: 'Downloading...' },
  reset: { hi: 'रीसेट', en: 'Reset' },
  caption: { hi: 'कैप्शन', en: 'Caption' },
  previous: { hi: 'पिछला', en: 'Previous' },
  next: { hi: 'अगला', en: 'Next' },
  save: { hi: 'सुरक्षित करें', en: 'Save' },
  cancel: { hi: 'रद्द करें', en: 'Cancel' },
  apply: { hi: 'लागू करें', en: 'Apply' },
  delete: { hi: 'हटाएं', en: 'Delete' },
  edit: { hi: 'एडिट करें', en: 'Edit' },
  copy: { hi: 'कॉपी करें', en: 'Copy' },
  copied: { hi: 'कॉपी हो गया!', en: 'Copied!' },
  active: { hi: 'सक्रिय', en: 'Active' },
  inactive: { hi: 'निष्क्रिय', en: 'Inactive' },
  status: { hi: 'स्थिति', en: 'Status' },
  view: { hi: 'देखें', en: 'View' },
  close: { hi: 'बंद करें', en: 'Close' },
  language: { hi: 'भाषा (Language)', en: 'Language' },
  select_language: { hi: 'ऐप की भाषा चुनें', en: 'Select App Language' },
  hindi: { hi: 'हिंदी', en: 'Hindi' },
  english: { hi: 'English', en: 'English' },
  lang_changed_msg: { hi: 'ऐप की भाषा सफलतापूर्वक अपडेट हो गई!', en: 'App language updated successfully!' },

  // Studio Labels
  custom_headline: { hi: 'मुख्य हेडलाइन (Headline)', en: 'Main Headline' },
  headline_font_size: { hi: 'हेडलाइन फॉन्ट साइज़', en: 'Headline Font Size' },
  default_20px: { hi: 'डिफ़ॉल्ट 20px', en: 'Default 20px' },
  headline_font_family: { hi: 'हेडलाइन फॉन्ट स्टाइल', en: 'Headline Font Style' },
  highlight_color: { hi: 'हाईलाइट रंग', en: 'Highlight Color' },
  location_name: { hi: 'स्थान / जिला', en: 'Location / District' },
  reporter_name: { hi: 'संवाददाता / रिपोर्टर का नाम', en: 'Reporter Name' },
  show_date: { hi: 'दिनांक दिखाएं', en: 'Show Date' },
  watermark: { hi: 'वॉटरमार्क', en: 'Watermark' },

  // Plans & Promo Codes
  plans_title: { hi: 'प्लान्स व पैकेज', en: 'Plans & Packages' },
  promo_code: { hi: 'प्रोमो कोड', en: 'Promo Code' },
  redeem_promo: { hi: 'प्रोमो कोड रिडीम करें', en: 'Redeem Promo Code' },
  enter_promo: { hi: 'प्रोमो कोड दर्ज करें', en: 'Enter Promo Code' },
  promo_success: { hi: 'प्रोमो कोड सफलतापूर्वक लागू हुआ!', en: 'Promo code applied successfully!' },
  promo_already_used: { hi: 'यह प्रोमो कोड पहले ही इस्तेमाल हो चुका है।', en: 'This promo code has already been used.' },
  promo_invalid: { hi: 'यह प्रोमो कोड अमान्य है।', en: 'This promo code is invalid.' },

  // Admin Modes
  admin_mode: { hi: 'एडमिन मोड', en: 'Admin Mode' },
  test_mode: { hi: 'टेस्ट मोड', en: 'Test Mode' },
  user_mode: { hi: 'यूज़र मोड', en: 'User Mode' },
  switch_to_admin: { hi: 'एडमिन मोड पर लौटें', en: 'Return to Admin Mode' },
  select_test_plan: { hi: 'टेस्ट हेतु प्लान चुनें', en: 'Select Test Plan' },
};

export function getAppLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'hi';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE);
    if (saved === 'en') return 'en';
  } catch (e) {
    console.warn('Error reading language:', e);
  }
  return 'hi'; // Default 100% Hindi as strictly specified
}

export function setAppLanguage(lang: AppLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_LANGUAGE, lang);
    window.dispatchEvent(new CustomEvent('app_language_changed', { detail: lang }));
  } catch (e) {
    console.warn('Error saving language:', e);
  }
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'hi',
  setLanguage: () => {},
  isHindi: true,
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<AppLanguage>(() => getAppLanguage());

  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e?.detail) {
        setLangState(e.detail);
      } else {
        setLangState(getAppLanguage());
      }
    };
    window.addEventListener('app_language_changed', handleLangChange);
    window.addEventListener('storage', handleLangChange);
    return () => {
      window.removeEventListener('app_language_changed', handleLangChange);
      window.removeEventListener('storage', handleLangChange);
    };
  }, []);

  const handleSetLanguage = (lang: AppLanguage) => {
    setLanguage(lang);
    setLangState(lang);
  };

  const t = (key: string, fallback?: string): string => {
    const entry = TRANSLATIONS[key];
    if (entry) {
      return entry[language] || entry.hi || fallback || key;
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        isHindi: language === 'hi',
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
