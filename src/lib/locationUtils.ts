// AI NEWS MAKER — Location Utility Functions
// Handles Location Deduplication, Normalization, and Clean Presentation

export function formatCleanLocationText(rawLocation?: string | null): string {
  if (!rawLocation || typeof rawLocation !== 'string') return '';
  let cleaned = rawLocation
    .replace(/^(स्थान\s*[:\-–—]?|location\s*[:\-–—]?|ताजा\s*समाचार\s*स्थान\s*[:\-–—]?|ताज़ा\s*समाचार\s*स्थान\s*[:\-–—]?)/i, '')
    .replace(/[:\-–—]+$/, '')
    .trim();

  if (!cleaned || cleaned === 'लोकेशन') return 'लोकेशन';

  // Canonicalize standard Hindi states with space
  cleaned = cleaned
    .replace(/मध्यप्रदेश/g, 'मध्य प्रदेश')
    .replace(/उत्तरप्रदेश/g, 'उत्तर प्रदेश')
    .replace(/हिमाचलप्रदेश/g, 'हिमाचल प्रदेश')
    .replace(/आंध्रप्रदेश/g, 'आंध्र प्रदेश');

  // Split by comma, slash, pipe or dash
  const parts = cleaned.split(/[,/|]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return cleaned;

  // Deduplicate case-insensitively / normalized
  const uniqueParts: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const canonicalPart = part
      .replace(/मध्यप्रदेश/g, 'मध्य प्रदेश')
      .replace(/उत्तरप्रदेश/g, 'उत्तर प्रदेश')
      .replace(/हिमाचलप्रदेश/g, 'हिमाचल प्रदेश')
      .replace(/आंध्रप्रदेश/g, 'आंध्र प्रदेश')
      .trim();
    const norm = canonicalPart.toLowerCase().replace(/[\s\-_]/g, '');
    if (!seen.has(norm)) {
      seen.add(norm);
      uniqueParts.push(canonicalPart);
    }
  }

  return uniqueParts.join(', ');
}
