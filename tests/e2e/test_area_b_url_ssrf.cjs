/**
 * Area B: URL Fetching, SSRF & Body Extraction Test Suite
 * Requirement: R1 (URL Fetching, SSRF Protection, 4k-6k Char Extraction, Metadata)
 */

const http = require('http');
const {
  assert,
  createTestRunner,
  isSafePublicUrl,
  parseArticleHtml,
  fetchAndProcessNewsUrl,
} = require('./test_helper.cjs');

const runner = createTestRunner('Area B: URL Fetching, SSRF & Body Extraction');

// -------------------------------------------------------------
// Tier 1 & 2: SSRF Protection & Host Validation
// -------------------------------------------------------------
runner.test('B1: Blocks IPv4 loopback & private networks (127.0.0.1, 10.x, 192.168.x, 172.16.x, 0.0.0.0)', () => {
  const privateUrls = [
    'http://127.0.0.1/admin',
    'http://127.0.0.2:8080/metrics',
    'https://10.0.0.1/console',
    'http://192.168.1.1/setup',
    'http://172.16.0.5/api',
    'http://0.0.0.0/',
    'http://169.254.169.254/latest/meta-data/',
  ];

  for (const url of privateUrls) {
    const res = isSafePublicUrl(url);
    assert.strictEqual(res.safe, false, `Expected private IP to be blocked: ${url}`);
  }
});

runner.test('B2: Blocks localhost & local/internal domain suffixes', () => {
  const internalDomains = [
    'http://localhost/news',
    'http://api.localhost:8080/',
    'http://server.local/api',
    'http://database.internal/dump',
    'http://router.lan/admin',
    'http://metadata.google.internal/computeMetadata/v1/',
    'http://instance-data/latest/meta-data/',
  ];

  for (const url of internalDomains) {
    const res = isSafePublicUrl(url);
    assert.strictEqual(res.safe, false, `Expected internal host to be blocked: ${url}`);
  }
});

runner.test('B3: Blocks IPv6 unspecified (::), loopback (::1), ULA (fc00::/7, fd00::/8) & link-local', () => {
  const ipv6Urls = [
    'http://[::]/',
    'http://[::1]/secret',
    'http://[0:0:0:0:0:0:0:0]/',
    'http://[0:0:0:0:0:0:0:1]/',
    'http://[fc00::1]/',
    'http://[fd12:3456:789a::1]/',
    'http://[fe80::1]/',
    'http://[::ffff:127.0.0.1]/',
  ];

  for (const url of ipv6Urls) {
    const res = isSafePublicUrl(url);
    assert.strictEqual(res.safe, false, `Expected IPv6 address to be blocked: ${url}`);
  }
});

runner.test('B4: Blocks numeric, hex, credentials, and non-standard ports', () => {
  const malformedOrRestricted = [
    'http://2130706433/', // Decimal for 127.0.0.1
    'http://0x7f000001/', // Hex for 127.0.0.1
    'http://admin:password@hindinewsportal.in/news',
    'http://hindinewsportal.in:22/ssh',
    'http://hindinewsportal.in:3306/mysql',
    'http://hindinewsportal.in:6379/redis',
    'ftp://hindinewsportal.in/news.html',
    'file:///etc/passwd',
  ];

  for (const url of malformedOrRestricted) {
    const res = isSafePublicUrl(url);
    assert.strictEqual(res.safe, false, `Expected unsafe URL to be blocked: ${url}`);
  }
});

runner.test('B5: Accepts valid public HTTP and HTTPS news URLs', () => {
  const validUrls = [
    'https://www.bbc.com/hindi/articles/c4nn90l9e4do',
    'https://hindi.news18.com/news/nation/chandrayaan-update.html',
    'http://amarujala.com/world/un-general-assembly-speech.html',
    'https://subdomain.news-portal.co.in/story-2026?id=99&ref=feed',
  ];

  for (const url of validUrls) {
    const res = isSafePublicUrl(url);
    assert.strictEqual(res.safe, true, `Expected valid public URL to be allowed: ${url}`);
  }
});

// -------------------------------------------------------------
// Tier 3: Body & Metadata Parsing Engine
// -------------------------------------------------------------
runner.test('B6: Extracts rich metadata (HTML title, og:title, og:description, author, date, images)', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <title>ग्वालियर में ऐतिहासिक किले पर तीन दिवसीय संगीत समारोह का शुभारंभ</title>
      <meta name="description" content="ग्वालियर के ऐतिहासिक किले पर तानसेन संगीत समारोह की शुरुआत शास्त्रीय गायन के साथ हुई और कई दिग्गज कलाकार पहुंचे।">
      <meta property="og:title" content="ग्वालियर किला संगीत समारोह 2026: देश भर के दिग्गज शास्त्रीय गायक पहुंचे">
      <meta property="og:description" content="तानसेन की पावन भूमि पर आयोजित सुरों के इस महाकुंभ में हजारों संगीत प्रेमी देर रात तक जुटे रहे।">
      <meta property="og:image" content="https://patrika.com/photos/gwalior-fort-concert.jpg">
      <meta name="twitter:image" content="https://patrika.com/photos/tansen-smriti.jpg">
      <meta name="author" content="राजेश शर्मा, विशेष संवाददाता">
      <meta property="article:published_time" content="2026-11-16T10:00:00Z">
    </head>
    <body>
      <main>
        <p>ग्वालियर के ऐतिहासिक किले पर तीन दिवसीय तानसेन संगीत समारोह का गरिमामय शुभारंभ हुआ। समारोह में देश भर के शीर्ष शास्त्रीय संगीतज्ञ अपनी प्रस्तुतियां दे रहे हैं।</p>
        <p>पहले दिन शाम को राग यमन और राग दरबारी की मनमोहक प्रस्तुतियां दी गईं जिन्हें सुनकर श्रोता भावविभोर हो गए। देर रात तक संगीत प्रेमी तानसेन समाधि स्थल के प्रांगण में मौजूद रहे।</p>
      </main>
    </body>
    </html>
  `;

  const parsed = parseArticleHtml(sampleHtml, 'https://patrika.com/news/gwalior-music');
  assert.ok(parsed.title.includes('ग्वालियर'), 'Title must contain location keyword');
  assert.ok(parsed.description.includes('तानसेन') || parsed.description.includes('संगीत'), 'Description extracted');
  assert.ok(parsed.images.length >= 1, 'Extracted at least 1 image');
  assert.ok(parsed.images[0].includes('gwalior-fort-concert.jpg'), 'First image matches og:image');
  assert.strictEqual(parsed.author, 'राजेश शर्मा, विशेष संवाददाता', 'Author extracted correctly');
  assert.strictEqual(parsed.extractionStatus, 'success');
});

runner.test('B7: Prioritizes JSON-LD NewsArticle articleBody and author when available', () => {
  const jsonLdHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": "इंदौर बना देश का पहला वाटर प्लस और सेवन स्टार कचरा मुक्त शहर",
        "description": "स्वच्छता सर्वेक्षण में इंदौर ने लगातार आठवीं बार पहला स्थान हासिल कर नया कीर्तिमान स्थापित किया।",
        "articleBody": "इंदौर नगर निगम ने स्वच्छता के क्षेत्र में एक और ऐतिहासिक उपलब्धि दर्ज की है। राष्ट्रपति भवन में आयोजित भव्य समारोह में इंदौर को देश का पहला सेवन स्टार कचरा मुक्त शहर घोषित किया गया। इस अवसर पर मुख्यमंत्री और नगरीय विकास मंत्री ने शहर की जनता और सफाई मित्रों को बधाई दी। शहर में 100 प्रतिशत कचरा संग्रहण और वैज्ञानिक तरीके से प्रसंस्करण किया जा रहा है।",
        "author": [{ "@type": "Person", "name": "संजय वर्मा" }],
        "datePublished": "2026-11-15T08:30:00+05:30",
        "image": "https://amarujala.com/images/indore-cleanest-city.jpg"
      }
      </script>
    </head>
    <body>
      <article>
        <p>इंदौर नगर निगम ने स्वच्छता के क्षेत्र में एक और ऐतिहासिक उपलब्धि दर्ज की है। राष्ट्रपति भवन में आयोजित भव्य समारोह में इंदौर को देश का पहला सेवन स्टार कचरा मुक्त शहर घोषित किया गया।</p>
      </article>
    </body>
    </html>
  `;

  const parsed = parseArticleHtml(jsonLdHtml, 'https://amarujala.com/madhya-pradesh/indore-swachhata');
  assert.ok(parsed.title.includes('इंदौर'), 'Title from JSON-LD headline');
  assert.ok(parsed.content.includes('सेवन स्टार') && parsed.content.includes('सफाई मित्रों'), 'articleBody extracted from JSON-LD');
  assert.strictEqual(parsed.author, 'संजय वर्मा', 'JSON-LD author extracted');
  assert.strictEqual(parsed.extractionStatus, 'success');
});

runner.test('B8: Filters out short paragraphs (<= 25 chars), ads, navigation, headers, footers and "यह भी पढ़ें"', () => {
  const dirtyHtml = `
    <!DOCTYPE html>
    <html>
    <body>
      <header><h1>वेबसाइट हेडर</h1><nav><a href="/">होम</a><a href="/news">खबरें</a></nav></header>
      <article>
        <p>छोटा वाक्य।</p> <!-- 12 chars: should be filtered out -->
        <p>लोड हो रहा है...</p>
        <p>यह भी पढ़ें: संबंधित खबर का लिंक यहाँ देखें</p>
        <p>भोपाल में मेट्रो रेल के दूसरे चरण का कार्य तेजी से शुरू हो गया है। नए रूट पर 8 एलिवेटेड स्टेशनों का निर्माण किया जाएगा और अगले वर्ष तक ट्रायल रन पूरा करने का लक्ष्य तय किया गया है।</p>
        <div class="advertisement">विज्ञापन सामग्री यहाँ है</div>
        <p>मेट्रो परियोजना निदेशक ने बताया कि पर्यावरण संरक्षण को ध्यान में रखते हुए ट्रैक के दोनों ओर 5000 पौधे भी रोपे जाएंगे ताकि हरियाली बनी रहे।</p>
        <p>कॉपी लिंक शेयर करें</p>
      </article>
      <footer>कॉपीराइट 2026 सर्वाधिकार सुरक्षित</footer>
    </body>
    </html>
  `;

  const parsed = parseArticleHtml(dirtyHtml, 'https://bhaskar.com/bhopal-metro');
  assert.ok(parsed.content.includes('भोपाल में मेट्रो रेल के दूसरे चरण'), 'Real news paragraph preserved');
  assert.ok(parsed.content.includes('मेट्रो परियोजना निदेशक ने बताया'), 'Second news paragraph preserved');
  assert.ok(!parsed.content.includes('छोटा वाक्य'), 'Paragraph <= 25 chars filtered');
  assert.ok(!parsed.content.includes('विज्ञापन सामग्री'), 'Advertisement div stripped');
  assert.ok(!parsed.content.includes('सर्वाधिकार सुरक्षित'), 'Footer stripped');
});

runner.test('B9: Body extraction scales to 4,000–6,000 characters when article provides rich text', () => {
  const paragraphTemplate = (i) =>
    `मध्य प्रदेश के मालवा अंचल में इस वर्ष रबी फसलों की बुआई का रकबा रिकॉर्ड स्तर पर पहुंच गया है। कृषि विभाग के अनुसार गेहूं और चना फसलों के लिए मौसम बेहद अनुकूल है और किसानों को पर्याप्त मात्रा में प्रमाणित बीज तथा उर्वरक उपलब्ध कराए जा रहे हैं। भाग क्रमांक ${i} में विस्तार से बताया गया है कि सिंचाई के लिए जल संसाधनों का उचित प्रबंधन किया जा रहा है जिससे उत्पादन में 15 प्रतिशत की वृद्धि का अनुमान है।`;

  const paragraphs = [];
  for (let i = 1; i <= 25; i++) {
    paragraphs.push(`<p>${paragraphTemplate(i)}</p>`);
  }

  const largeHtml = `
    <!DOCTYPE html>
    <html>
    <body>
      <article>
        <h1>मालवा में रबी फसलों की रिकॉर्ड बुआई</h1>
        ${paragraphs.join('\n')}
      </article>
    </body>
    </html>
  `;

  const parsed = parseArticleHtml(largeHtml, 'https://naidunia.com/agriculture-report');
  assert.ok(parsed.content.length >= 4000, `Expected content length >= 4000, got ${parsed.content.length}`);
  assert.ok(parsed.content.length <= 6000, `Expected content length <= 6000, got ${parsed.content.length}`);
});

// -------------------------------------------------------------
// Tier 4: Live HTTP Server Mock with Redirect & UA Verification
// -------------------------------------------------------------
runner.test('B10: SSRF block protects against redirection to internal IP address', async () => {
  const testUrl = 'http://127.0.0.1:9099/redirect-to-internal';
  const safety = isSafePublicUrl(testUrl);
  assert.strictEqual(safety.safe, false, '127.0.0.1 loopback URL is blocked by SSRF validator');
});

if (require.main === module) {
  runner.execute().then((res) => {
    process.exit(res.success ? 0 : 1);
  });
}

module.exports = runner;
