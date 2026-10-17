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

/**
 * Secure 6-digit random numeric ID generator for collision-resistant filenames:
 * e.g. 583104, 920731, 417286
 */
export function generateNumericId(digits: number = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  const num = Math.floor(min + Math.random() * (max - min + 1));
  return String(num);
}

/**
 * Graphic download filename as per MASTER SPECIFICATION:
 * "AI-Graphic-<random-numeric-id>.jpg" (e.g. AI-Graphic-583104.jpg)
 */
export function generateGraphicDownloadFileName(customExt: string = 'jpg'): string {
  const ext = (customExt || 'jpg').replace(/^\./, '').toLowerCase();
  const numericId = generateNumericId(6);
  return `AI-Graphic-${numericId}.${ext}`;
}

/**
 * Video download filename as per MASTER SPECIFICATION:
 * "AI-Video-<random-numeric-id>.mp4" (e.g. AI-Video-738194.mp4)
 */
export function generateVideoDownloadFileName(customExt: string = 'mp4'): string {
  const ext = (customExt || 'mp4').replace(/^\./, '').toLowerCase();
  const numericId = generateNumericId(6);
  return `AI-Video-${numericId}.${ext}`;
}

/**
 * Formats date cleanly for filenames without forbidden characters:
 * e.g. "2026-10-16_01-24-33"
 */
export function formatFileNameDate(inputDate?: Date | string | number): string {
  const d = inputDate ? new Date(inputDate) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

