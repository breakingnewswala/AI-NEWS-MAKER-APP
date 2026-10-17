/**
 * Safe LocalStorage and Image Compression Utilities
 * Prevents QuotaExceededError crashes during channel logo / profile persistence
 */

export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[safeLocalStorageSet] Quota or storage error on key "${key}":`, err?.message || err);
    
    // Attempt emergency cleanup of temporary / draft storage keys
    try {
      const keysToClear: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('onboarding_draft_') || k.startsWith('draft_') || k.includes('_temp_') || k.startsWith('app_removed_highlight_'))) {
          keysToClear.push(k);
        }
      }
      keysToClear.forEach((k) => localStorage.removeItem(k));
      
      // Retry once after cleanup
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      console.warn(`[safeLocalStorageSet] Secondary save attempt failed for key "${key}". Continuing safely without crash.`);
      return false;
    }
  }
}

export function safeLocalStorageGet(key: string, fallback: string | null = null): string | null {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch {
    return fallback;
  }
}

export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

/**
 * Compresses an image (base64 or dataURL) into a lightweight web-friendly dataURL (<40KB)
 * to prevent browser storage quota overflow.
 */
export async function compressImageBase64(
  dataUrl: string,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.75
): Promise<string> {
  if (!dataUrl || typeof window === 'undefined') return dataUrl;
  // If not a data URI or is a small SVG/PNG, return as is
  if (!dataUrl.startsWith('data:image/') || dataUrl.length < 50000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // If source was png with transparency, preserve png format or fallback to jpeg
        const isPng = dataUrl.includes('image/png');
        const compressed = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}
