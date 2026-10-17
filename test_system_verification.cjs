const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_PORT = 5178;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let bodyData = null;
    if (body) {
      bodyData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
    }
    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function runTests() {
  console.log(`Starting background test server on port ${TEST_PORT}...`);
  const serverProcess = spawn('node', ['dev.cjs'], {
    env: { ...process.env, PORT: String(TEST_PORT), NODE_ENV: 'production' },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (data) => {
    // console.log(`[SERVER]: ${data}`);
  });
  serverProcess.stderr.on('data', (data) => {
    // console.error(`[SERVER ERR]: ${data}`);
  });

  // Wait for server to boot
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await request('GET', '/api/categories');
      if (res.status === 200 && res.body && res.body.success) {
        ready = true;
        break;
      }
    } catch {}
  }

  if (!ready) {
    console.error('Failed to connect to test server within 10 seconds.');
    serverProcess.kill();
    process.exit(1);
  }

  console.log('Server is ready. Executing Master Prompt test suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Categories GET & POST
    console.log('--- 1. Testing Categories API & Persistence ---');
    const getCatsRes = await request('GET', '/api/categories');
    assert(getCatsRes.status === 200 && getCatsRes.body.success === true, 'GET /api/categories returns 200 with success: true');
    const categories = getCatsRes.body.categories;
    assert(Array.isArray(categories) && categories.length > 0, `Categories array exists with ${categories.length} categories`);

    // 2. Master Prompt Package Pricing & Limits Verification
    console.log('\n--- 2. Testing Master Prompt Package Pricing & Limits ---');
    const getPlansRes = await request('GET', '/api/plans');
    assert(getPlansRes.status === 200 && getPlansRes.body.success === true, 'GET /api/plans returns 200 with success: true');
    const plans = getPlansRes.body.plans;
    assert(Array.isArray(plans) && plans.length >= 4, `Plans catalog contains ${plans.length} tiers`);

    const basicPlan = plans.find((p) => p.id === 'basic');
    const advancePlan = plans.find((p) => p.id === 'advanced');
    const proPlan = plans.find((p) => p.id === 'professional');
    const vipPlan = plans.find((p) => p.id === 'ultra');

    assert(
      basicPlan && basicPlan.regularPriceNum === 2999 && basicPlan.priceNum === 999 && basicPlan.maxGraphicsPerDay === 10,
      'Basic plan has ₹2,999 regular, ₹999 launching offer, and 10 daily graphics limit'
    );
    assert(
      advancePlan && advancePlan.regularPriceNum === 4999 && advancePlan.priceNum === 2499 && advancePlan.maxGraphicsPerDay === 25,
      'Advance plan has ₹4,999 regular, ₹2,499 launching offer, and 25 daily graphics limit'
    );
    assert(
      proPlan && proPlan.regularPriceNum === 6999 && proPlan.priceNum === 4199 && proPlan.maxGraphicsPerDay === 50,
      'Pro plan has ₹6,999 regular, ₹4,199 launching offer, and 50 daily graphics limit'
    );
    assert(
      vipPlan && vipPlan.regularPriceNum === 9999 && vipPlan.priceNum === 6499 && vipPlan.maxGraphicsPerDay >= 9999,
      'VIP Desk plan has ₹9,999 regular, ₹6,499 launching offer, and unlimited daily graphics limit'
    );

    // 3. Template Manager & 8 Frame Categories Verification
    console.log('\n--- 3. Testing Template Manager & 8 Frame Categories ---');
    const getTemplatesRes = await request('GET', '/api/template-configs');
    assert(getTemplatesRes.status === 200 && getTemplatesRes.body.success === true, 'GET /api/template-configs returns 200 with configs');
    const configs = getTemplatesRes.body.configs;
    assert(configs && typeof configs === 'object', 'Template configs is a valid object dictionary');

    // Verify cascading tier logic and categories
    const updateTemplateRes = await request('POST', '/api/admin/save-template-config', {
      templateId: 'graphic_002',
      selectedTier: 'ADVANCED',
      category: 'Package Frame',
      coinPrice: 15,
      isActive: true,
    });
    assert(
      updateTemplateRes.status === 200 && updateTemplateRes.body.success === true,
      'POST /api/admin/save-template-config persists cascading tier ADVANCED, category, and coin price'
    );
    const updatedCfg = updateTemplateRes.body.config || (updateTemplateRes.body.configs && updateTemplateRes.body.configs['graphic_002']);
    assert(
      updatedCfg.allowedPlans.includes('ADVANCED') &&
        updatedCfg.allowedPlans.includes('PRO') &&
        updatedCfg.allowedPlans.includes('VIP DESK') &&
        !updatedCfg.allowedPlans.includes('BASIC'),
      'Cascading rule verified: ADVANCED tier cascades to ADVANCED, PRO, and VIP DESK'
    );

    // 4. Coin Unlock Frame API
    console.log('\n--- 4. Testing Frame Coin Unlock API & IST Date Expiry ---');
    const testCoinUser = `coin_test_${Date.now()}@example.com`;
    // Credit coins first
    await request('POST', '/api/admin/credit-coins', { email: testCoinUser, coins: 50, reason: 'test credit' });

    const unlockRes = await request('POST', '/api/wallet/unlock-frame', {
      email: testCoinUser,
      frameId: 'graphic_002',
    });
    assert(
      unlockRes.status === 200 && unlockRes.body.success === true,
      'POST /api/wallet/unlock-frame successfully debits coins and unlocks frame'
    );

    const getUnlocksRes = await request('GET', `/api/wallet/frame-unlocks?email=${encodeURIComponent(testCoinUser)}`);
    assert(
      getUnlocksRes.status === 200 &&
        Array.isArray(getUnlocksRes.body.unlockedFrameIds) &&
        getUnlocksRes.body.unlockedFrameIds.includes('graphic_002'),
      'GET /api/wallet/frame-unlocks confirms unlocked frame for user for IST today'
    );

    // 5. User Download Status & Quota Enforcement
    console.log('\n--- 5. Testing User Daily Download Quota & Exhaustion ---');
    const testReporter = `reporter_${Date.now()}@example.com`;
    const statusRes = await request('GET', `/api/user-download-status?email=${encodeURIComponent(testReporter)}`);
    assert(statusRes.status === 200 && statusRes.body.dailyQuota === 10, 'Fresh Basic user starts with 10 daily quota');
    assert(statusRes.body.remainingDownloads === 10, 'Fresh Basic user has 10 remaining downloads today');

    // Check-only mode does not increment count
    const checkOnlyRes = await request('POST', '/api/verify-download-entitlement', {
      email: testReporter,
      checkOnly: true,
    });
    assert(checkOnlyRes.status === 200 && checkOnlyRes.body.allowed === true, 'checkOnly mode validates entitlement');

    const statusAfterCheck = await request('GET', `/api/user-download-status?email=${encodeURIComponent(testReporter)}`);
    assert(statusAfterCheck.body.remainingDownloads === 10, 'checkOnly mode verified: count did NOT increment');

    // Perform downloads up to limit (10 for Basic)
    for (let i = 1; i <= 10; i++) {
      const dl = await request('POST', '/api/verify-download-entitlement', { email: testReporter });
      assert(dl.status === 200 && dl.body.allowed === true, `Basic user download ${i}/10 approved`);
    }

    // 11th download exceeds quota
    const dl11 = await request('POST', '/api/verify-download-entitlement', { email: testReporter });
    assert(dl11.status === 403 && dl11.body.quotaExceeded === true, '11th download rejected with 403 quotaExceeded');

    // 6. Limit Increase Request API
    console.log('\n--- 6. Testing Limit Increase Request API ---');
    const reqLimitRes = await request('POST', '/api/request-limit-increase', {
      email: testReporter,
      requestedLimit: 10,
      reason: 'विशेष कवरेज हेतु अतिरिक्त लिमिट की आवश्यकता है',
    });
    assert(reqLimitRes.status === 200 && reqLimitRes.body.success === true, 'POST /api/request-limit-increase logs request');

    const adminRequestsRes = await request('GET', '/api/admin/limit-increase-requests');
    assert(
      adminRequestsRes.status === 200 &&
        Array.isArray(adminRequestsRes.body.requests) &&
        adminRequestsRes.body.requests.some((r) => r.email === testReporter),
      'GET /api/admin/limit-increase-requests returns logged limit increase request'
    );
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    serverProcess.kill();
    console.log(`\n================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
