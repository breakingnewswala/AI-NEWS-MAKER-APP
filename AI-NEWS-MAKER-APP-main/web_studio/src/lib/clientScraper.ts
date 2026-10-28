// Client-side resilient news scraper for URL/Link processing in AI News Tools
// Works seamlessly in static deployments (GitHub Pages, Firebase Hosting, Vercel)
// and handles news sites via multi-tier edge reader and CORS proxy fallbacks.

export interface ScrapedNewsArticle {
  title: string;
  description: string;
  content: string;
  images: string[];
  sourceUrl: string;
  location?: string;
  category?: string;
}

function cleanExtractedTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\s*[|\-–—:]\s*(Dainik Bhaskar|दैनिक भास्कर|Amar Ujala|अमर उजाला|NDTV Khabar|NDTV India|NDTV|Aaj Tak|आज तक|News18|Patrika|पत्रिका|Navbharat Times|नवभारत टाइम्स|Hindustan|Live Hindustan|BBC News हिंदी|BBC Hindi|ABP News|Zee News|Jagran|दैनिक जागरण|Firstpost|The Hindu|Indian Express).*$/iu, '')
    .replace(/^(न्यूज बनाओ|हेडलाइन बनाओ|खबर बनाओ|ब्रेकिंग न्यूज|headline:|news:)\s*[:\-\s]*/i, '')
    .replace(/^ताज़ा समाचार\s*[:\-\s]*/i, '')
    .trim();
}

/**
 * Scrapes news content from a URL directly from the client/browser using multi-tier edge reader proxies.
 * Solves CORS blocking and Cloudflare bot protection on live deployed websites.
 */
export async function scrapeNewsUrlClient(rawUrl: string, timeoutMs: number = 16000): Promise<ScrapedNewsArticle | null> {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return null;

  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  // 1. Primary: Try Jina Reader edge proxy (CORS-friendly, extracts clean markdown and metadata)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const readerUrl = `https://r.jina.ai/${normalized}`;

    const res = await fetch(readerUrl, {
      headers: {
        Accept: 'text/plain, text/markdown, */*',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 60) {
        // Extract Title
        const tMatch = text.match(/^Title:\s*(.+)$/m);
        let title = tMatch ? cleanExtractedTitle(tMatch[1].trim()) : '';
        if (!title) {
          const h1Match = text.match(/^#\s+([^\n\r]+)/m);
          if (h1Match) title = cleanExtractedTitle(h1Match[1].trim());
        }

        // Extract URL source
        const uMatch = text.match(/^URL Source:\s*(.+)$/m);
        const sourceUrl = uMatch ? uMatch[1].trim() : normalized;

        // Extract Markdown Content
        let rawContent = '';
        const cMatch = text.match(/Markdown Content:\s*([\s\S]+)$/i);
        if (cMatch) {
          rawContent = cMatch[1].trim();
        } else {
          rawContent = text
            .replace(/^Title:.*$/m, '')
            .replace(/^URL Source:.*$/m, '')
            .replace(/^Published Time:.*$/m, '')
            .trim();
        }

        // Extract Images from markdown ![]()
        const images: string[] = [];
        const imgRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g;
        let match: RegExpExecArray | null;
        while ((match = imgRegex.exec(rawContent)) !== null) {
          const imgUrl = match[1];
          if (
            imgUrl &&
            !images.includes(imgUrl) &&
            !imgUrl.includes('.svg') &&
            !imgUrl.includes('logo') &&
            !imgUrl.includes('icon') &&
            !imgUrl.includes('avatar') &&
            !imgUrl.includes('badge') &&
            !imgUrl.includes('advertisement') &&
            !imgUrl.includes('button')
          ) {
            images.push(imgUrl);
          }
        }

        // Clean markdown symbols to yield pure journalistic content
        const cleanedBody = rawContent
          .replace(/!\[.*?\]\(.*?\)/g, ' ')
          .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
          .replace(/[*#_`>~]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const description = cleanedBody.slice(0, 320);

        // Accept if title contains Hindi or body contains substantive Hindi content
        const hasHindiInTitle = title && /[\u0900-\u097F]/.test(title);
        const hasHindiInBody = cleanedBody.length >= 60 && /[\u0900-\u097F]/.test(cleanedBody);

        if (hasHindiInTitle || hasHindiInBody) {
          return {
            title: title || 'ताज़ा समाचार घटनाक्रम',
            description,
            content: cleanedBody.slice(0, 3500),
            images: images.slice(0, 6),
            sourceUrl,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn('[clientScraper] Jina Reader fetch failed or timed out:', err?.message || err);
  }

  // 2. Secondary fallback: Fetch HTML via AllOrigins CORS proxy and parse with DOMParser
  try {
    const corsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(normalized)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(corsUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const html = await res.text();
      if (html && html.length > 200 && typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const metaTitle =
          doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
          doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
          doc.querySelector('title')?.textContent ||
          doc.querySelector('h1')?.textContent ||
          '';
        const title = cleanExtractedTitle(metaTitle);

        const metaDesc =
          doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
          doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
          doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
          '';

        const images: string[] = [];
        const ogImage =
          doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
          doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
        if (ogImage && /^https?:\/\//i.test(ogImage)) {
          images.push(ogImage);
        }
        doc.querySelectorAll('article img, .story-details img, .article-body img, main img, img').forEach((el) => {
          const src = el.getAttribute('src') || el.getAttribute('data-src');
          if (src && /^https?:\/\//i.test(src) && !images.includes(src)) {
            const lower = src.toLowerCase();
            if (
              !lower.includes('logo') &&
              !lower.includes('icon') &&
              !lower.includes('.svg') &&
              !lower.includes('badge') &&
              !lower.includes('avatar')
            ) {
              images.push(src);
            }
          }
        });

        const pList: string[] = [];
        doc.querySelectorAll('article p, .story-details p, .article-body p, main p, p').forEach((p) => {
          const text = (p.textContent || '').trim();
          if (
            text.length > 25 &&
            /[\u0900-\u097F]/.test(text) &&
            !text.includes('कॉपी लिंक') &&
            !text.includes('डाउनलोड करें') &&
            !text.includes('शेयर करें')
          ) {
            pList.push(text);
          }
        });

        const content = pList.join('\n\n').slice(0, 3500);
        const description = metaDesc.trim() || pList[0] || '';

        const hasHindiInTitle = title && /[\u0900-\u097F]/.test(title);
        const hasHindiInBody = content.length >= 60 && /[\u0900-\u097F]/.test(content);

        if (hasHindiInTitle || hasHindiInBody) {
          return {
            title: title || 'ताज़ा समाचार',
            description: description.slice(0, 320),
            content: content || description,
            images: images.slice(0, 6),
            sourceUrl: normalized,
          };
        }
      }
    }
  } catch (corsErr: any) {
    console.warn('[clientScraper] CORS proxy fallback failed:', corsErr?.message || corsErr);
  }

  // 3. DO NOT return fake boilerplate sentences like "वेबसाइट लिंक से प्राप्त मुख्य समाचार विषय"
  // If no authentic Hindi content was retrieved, return null so caller can prompt user or use existing data cleanly.
  return null;
}
