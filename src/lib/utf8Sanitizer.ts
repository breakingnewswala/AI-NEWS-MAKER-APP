/**
 * UTF-8 and Devanagari Hindi Sanitizer
 * Automatically detects and restores CP1252 / Windows-1252 / Latin-1 mangled bytes
 * into clean, genuine Devanagari Unicode characters without repeated workarounds.
 */

const CP1252_REVERSE: Record<number, number> = {
  0x20AC: 0x80, // €
  0x201A: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201E: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02C6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8A, // Š
  0x2039: 0x8B, // ‹
  0x0152: 0x8C, // Œ
  0x017D: 0x8E, // Ž
  0x2018: 0x91, // ‘
  0x2019: 0x92, // ’
  0x201C: 0x93, // “
  0x201D: 0x94, // ”
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02DC: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9A, // š
  0x203A: 0x9B, // ›
  0x0153: 0x9C, // œ
  0x017E: 0x9E, // ž
  0x0178: 0x9F, // Ÿ
};

export function sanitizeUtf8Hindi(input: any): any {
  if (typeof input !== 'string') return input;
  if (!input || (!input.includes('à¤') && !input.includes('à¥') && !input.includes('ðŸ'))) {
    return input;
  }

  try {
    const bytes: number[] = [];
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      if (CP1252_REVERSE[code] !== undefined) {
        bytes.push(CP1252_REVERSE[code]);
      } else if (code < 256) {
        bytes.push(code);
      } else {
        // UTF-8 encode higher codepoint
        const str = input[i];
        if (typeof Buffer !== 'undefined') {
          const buf = Buffer.from(str, 'utf8');
          for (let b = 0; b < buf.length; b++) bytes.push(buf[b]);
        } else if (typeof TextEncoder !== 'undefined') {
          const encoded = new TextEncoder().encode(str);
          for (let b = 0; b < encoded.length; b++) bytes.push(encoded[b]);
        }
      }
    }

    let decoded = '';
    if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(bytes).toString('utf8');
    } else if (typeof TextDecoder !== 'undefined') {
      decoded = new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    }

    if (decoded && !decoded.includes('\uFFFD') && !decoded.includes('à¤') && !decoded.includes('à¥')) {
      return decoded;
    }
    return input;
  } catch {
    return input;
  }
}

export function sanitizeObjectStrings<T = any>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return typeof obj === 'string' ? (sanitizeUtf8Hindi(obj) as any) : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectStrings) as any;
  }
  const result: any = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = sanitizeObjectStrings(v);
  }
  return result;
}
