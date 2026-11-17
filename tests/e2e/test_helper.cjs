/**
 * Shared Test Helper for AI News Maker E2E Verification Suite
 */

process.env.NO_SERVER_START = 'true';
process.env.NODE_ENV = 'test';

const http = require('http');
const assert = require('assert');
const serverExports = require('../../server.cjs');

const {
  app,
  identifyInputType,
  isSafePublicUrl,
  parseArticleHtml,
  scrapeNewsFromUrl,
  fetchAndProcessNewsUrl,
  createLocalNewsFallback,
  buildHashtags,
  getUserFirstHashtag,
  formatHeadlineWithKeywords,
  preserveHeadlineStateOnRegeneration,
  countHeadlineVisibleCharacters,
  countHeadlineGraphemes,
  sanitizeFlattery,
  sanitizePressNoteFlattery,
  cleanLocationField,
  cleanCategoryField,
  detectDistrictAndState,
  formatDistrictWithState,
  cleanHeadlineText,
  validateHeadlineOption,
  validateHeadlines5Tier,
  STANDARD_HINDI_CATEGORIES,
  HEADLINE_5_TIER_RANGES,
  HEADLINE_5_TIER_MAX_LIMITS,
  HEADLINE_MAX_CHARACTER_LIMIT,
} = serverExports;

function createTestRunner(suiteName) {
  let passed = 0;
  let failed = 0;
  const tests = [];

  async function test(name, fn) {
    tests.push({ name, fn });
  }

  async function execute() {
    console.log(`\n======================================================`);
    console.log(`🧪 SUITE: ${suiteName}`);
    console.log(`======================================================`);

    const startTime = Date.now();
    for (let i = 0; i < tests.length; i++) {
      const { name, fn } = tests[i];
      try {
        await fn();
        passed++;
        console.log(`  ✅ [PASS] ${i + 1}/${tests.length}: ${name}`);
      } catch (err) {
        failed++;
        console.error(`  ❌ [FAIL] ${i + 1}/${tests.length}: ${name}`);
        console.error(`     Error: ${err.message}`);
        if (err.stack) {
          const stackLine = err.stack.split('\n')[1] || '';
          console.error(`     ${stackLine.trim()}`);
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`------------------------------------------------------`);
    console.log(`📊 ${suiteName} Results: ${passed} Passed, ${failed} Failed (${duration}s)`);
    console.log(`======================================================\n`);

    return { suiteName, passed, failed, total: tests.length, success: failed === 0 };
  }

  return { test, execute };
}

function startTestServer() {
  return new Promise((resolve, reject) => {
    if (!app) {
      return reject(new Error('app is not exported from server.cjs'));
    }
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address.port;
      const baseUrl = `http://127.0.0.1:${port}`;
      resolve({
        server,
        port,
        baseUrl,
        close: () => new Promise((res) => server.close(res)),
      });
    });
    server.on('error', reject);
  });
}

async function postJson(baseUrl, endpoint, data, headers = {}) {
  const url = new URL(endpoint, baseUrl);
  const payload = JSON.stringify(data);
  const authHeaders = {
    'Content-Type': 'application/json',
    'x-user-email': 'breakingnewswala.com@gmail.com',
    'x-user-id': 'usr_master_admin_001',
    'x-admin-key': 'master_admin_verified_key',
    ...headers,
  };

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: authHeaders,
    body: payload,
  });

  let responseBody;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    data: responseBody,
  };
}

module.exports = {
  assert,
  app,
  createTestRunner,
  startTestServer,
  postJson,
  identifyInputType,
  isSafePublicUrl,
  parseArticleHtml,
  scrapeNewsFromUrl,
  fetchAndProcessNewsUrl,
  createLocalNewsFallback,
  buildHashtags,
  getUserFirstHashtag,
  formatHeadlineWithKeywords,
  preserveHeadlineStateOnRegeneration,
  countHeadlineVisibleCharacters,
  countHeadlineGraphemes,
  sanitizeFlattery,
  sanitizePressNoteFlattery,
  cleanLocationField,
  cleanCategoryField,
  detectDistrictAndState,
  formatDistrictWithState,
  cleanHeadlineText,
  validateHeadlineOption,
  validateHeadlines5Tier,
  STANDARD_HINDI_CATEGORIES,
  HEADLINE_5_TIER_RANGES,
  HEADLINE_5_TIER_MAX_LIMITS,
  HEADLINE_MAX_CHARACTER_LIMIT,
};
