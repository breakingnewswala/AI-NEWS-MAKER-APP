// AI NEWS MAKER — Location Utility Functions
// Handles Location Deduplication, Normalization, and Clean Presentation

export function formatCleanLocationText(rawLocation?: string | null): string {
  if (!rawLocation || typeof rawLocation !== 'string') return '';
  let cleaned = rawLocation
    .replace(/^(स्थान\s*[:\-–—]?|location\s*[:\-–—]?|ताजा\s*समाचार\s*स्थान\s*[:\-–—]?|ताज़ा\s*समाचार\s*स्थान\s*[:\-–—]?)/i, '')
    .replace(/[:\-–—]+$/, '')
    .trim();

  if (!cleaned || cleaned === 'लोकेशन') return 'लोकेशन';

  // Split by comma, slash, pipe or dash
  const parts = cleaned.split(/[,/|]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return cleaned;

  // Deduplicate case-insensitively / normalized
  const uniqueParts: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const norm = part.toLowerCase().replace(/[\s\-_]/g, '');
    if (!seen.has(norm)) {
      seen.add(norm);
      uniqueParts.push(part);
    }
  }

  return uniqueParts.join(', ');
}
