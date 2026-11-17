/**
 * Area C: Scraping Failure & Non-hallucination Test Suite
 * Requirement: R1 (Scraping Failures: 403, 404, bot block, timeout, empty body return clear errors without hallucination)
 */

const {
  assert,
  createTestRunner,
  parseArticleHtml,
  startTestServer,
  postJson,
} = require('./test_helper.cjs');

const runner = createTestRunner('Area C: Scraping Failure & Non-hallucination');

// -------------------------------------------------------------
// Tier 1 & 2: Error and Paywall / Anti-Bot Detection
// -------------------------------------------------------------
runner.test('C1: Detects Cloudflare challenge page and flags as blocked', () => {
  const cfChallengeHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>Just a moment...</title></head>
    <body>
      <div id="cf-challenge-running">Please wait while your request is being verified...</div>
      <p>Cloudflare Ray ID: 890123456789abcd • Verify you are human to continue.</p>
    </body>
    </html>
  `;

  const parsed = parseArticleHtml(cfChallengeHtml, 'https://hindinews.in/exclusive-story');
  assert.strictEqual(parsed.extractionStatus, 'failed');
  assert.ok(parsed.inaccessibleReason && parsed.inaccessibleReason.includes('anti-bot'), 'Inaccessible reason flags bot block');
});

runner.test('C2: Detects HTTP 403 Forbidden / Access Denied error page', () => {
  const forbiddenHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>403 Forbidden</title></head>
    <body>
      <h1>Access Denied</h1>
      <p>You do not have permission to view this directory or page on this server.</p>
    </body>
    </html>
  `;

  const parsed = parseArticleHtml(forbiddenHtml, 'https://hindinews.in/restricted-article');
  assert.strictEqual(parsed.extractionStatus, 'failed');
  assert.ok(parsed.inaccessibleReason);
});

runner.test('C3: Rejects 404 Not Found / "पेज नहीं मिला" placeholder pages', () => {
  const notFoundHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>404 Page Not Found</title></head>
    <body>
      <h1>404 Not Found: यह पेज उपलब्ध नहीं है</h1>
      <p>माफ़ कीजिए, यह पेज उपलब्ध नहीं है। Page Not Found 404.</p>
    </body>
    </html>
  `;

  const parsed = parseArticleHtml(notFoundHtml, 'https://dainiksamachar.in/deleted-story-1029');
  assert.strictEqual(parsed.extractionStatus, 'failed');
  assert.strictEqual(parsed.content, '', 'Body content must be empty for 404 placeholder page');
});

runner.test('C4: Detects empty article body and fails extraction without hallucinating facts', () => {
  const emptyArticleHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>सामान्य सूचना</title></head>
    <body>
      <p>कुछ नहीं</p>
    </body>
    </html>
  `;

  const parsed = parseArticleHtml(emptyArticleHtml, 'https://patrika.com/empty-notice');
  assert.strictEqual(parsed.extractionStatus, 'failed');
  assert.ok(parsed.content.length < 50, 'Content must not have fabricated facts');
});

runner.test('C5: Paywalled article with login form returns failed extraction', () => {
  const paywallHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>प्रीमियम समाचार पढ़ें</title></head>
    <body>
      <h2>सब्सक्राइब करें</h2>
      <form action="/login" method="post">
        <label>Login:</label><input type="text" name="login">
        <label>Password:</label><input type="password" name="password">
        <button type="submit">Sign In</button>
      </form>
    </body>
    </html>
  `;

  const parsed = parseArticleHtml(paywallHtml, 'https://premiumnews.in/subscriber-only');
  assert.strictEqual(parsed.extractionStatus, 'failed');
});

// -------------------------------------------------------------
// Tier 4: Real HTTP Endpoint Integration Test
// -------------------------------------------------------------
runner.test('C6: Endpoint /api/process-news-command returns HTTP 504/422 on scraping failure without hallucinating', async () => {
  const serverInstance = await startTestServer();
  try {
    const res = await postJson(serverInstance.baseUrl, '/api/process-news-command', {
      linkUrl: 'https://hindinewsportal-nonexistent-domain-404.in/breaking-story-xyz',
      requestedAiProvider: 'gemini',
    });

    assert.ok(
      res.status === 422 || res.status === 504 || res.status === 400,
      `Expected HTTP 422, 504 or 400 for unreachable URL, got status ${res.status}`
    );
    assert.strictEqual(res.data.success, false);
    assert.ok(
      res.data.error.includes('समाचार') || res.data.error.includes('पुनः प्रयास') || res.data.error.includes('URL'),
      `Expected error asking for accessible URL or text, got: ${res.data.error}`
    );
    assert.strictEqual(res.data.extraction_status, 'failed');
  } finally {
    await serverInstance.close();
  }
});

if (require.main === module) {
  runner.execute().then((res) => {
    process.exit(res.success ? 0 : 1);
  });
}

module.exports = runner;
