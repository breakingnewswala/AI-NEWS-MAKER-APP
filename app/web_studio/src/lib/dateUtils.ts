// Hindi Date and Alphanumeric Graphic File Name Utilities

export const HINDI_MONTHS = [
  'जनवरी',
  'फ़रवरी',
  'मार्च',
  'अप्रैल',
  'मई',
  'जून',
  'जुलाई',
  'अगस्त',
  'सितम्बर',
  'अक्टूबर',
  'नवम्बर',
  'दिसम्बर',
];

export const HINDI_DAYS = [
  'रविवार',
  'सोमवार',
  'मंगलवार',
  'बुधवार',
  'गुरुवार',
  'शुक्रवार',
  'शनिवार',
];

/**
 * Returns date formatted in Hindi exactly as requested:
 * e.g. "5 सितम्बर 2026, शनिवार"
 */
export function getFormattedHindiDate(inputDate?: Date | string | number): string {
  let date: Date;
  if (!inputDate) {
    date = new Date();
  } else if (inputDate instanceof Date) {
    date = inputDate;
  } else {
    date = new Date(inputDate);
    if (isNaN(date.getTime())) {
      date = new Date();
    }
  }

  const day = date.getDate();
  const month = HINDI_MONTHS[date.getMonth()] || '';
  const year = date.getFullYear();
  const dayOfWeek = HINDI_DAYS[date.getDay()] || '';

  return `${day} ${month} ${year}, ${dayOfWeek}`;
}

let fallbackDownloadCounter = 0;

/**
 * Sequential graphic download filename as per MASTER SPECIFICATION:
 * "AI-News-Maker-001.jpg", "AI-News-Maker-002.jpg", etc.
 */
export function generateGraphicDownloadFileName(): string {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('ai_news_maker_dl_counter') : null;
    let current = saved ? parseInt(saved, 10) : 0;
    if (isNaN(current) || current < 0) current = 0;
    current += 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_news_maker_dl_counter', String(current));
    }
    const padded = String(current).padStart(3, '0');
    return `AI-News-Maker-${padded}.jpg`;
  } catch {
    fallbackDownloadCounter += 1;
    const padded = String(fallbackDownloadCounter).padStart(3, '0');
    return `AI-News-Maker-${padded}.jpg`;
  }
}

