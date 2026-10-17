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

  console.log('Server is ready. Executing test suite...\n');

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
    // 1. Categories GET
    console.log('--- 1. Testing Categories API & Persistence ---');
    const getCatsRes = await request('GET', '/api/categories');
    assert(getCatsRes.status === 200 && getCatsRes.body.success === true, 'GET /api/categories returns 200 with success: true');
    const categories = getCatsRes.body.categories;
    assert(Array.isArray(categories) && categories.length > 0, `Categories array exists with ${categories.length} categories`);

    // 2. Categories POST & Sync
    const testCat = { id: 'test_cat_' + Date.now(), name: 'टेस्ट विशेष श्रेणी', isActive: true };
    const updatedCats = [...categories, testCat];
    const postCatsRes = await request('POST', '/api/categories', { categories: updatedCats });
    assert(postCatsRes.status === 200 && postCatsRes.body.success === true, 'POST /api/categories saves new category to database');

    const verifyCatsRes = await request('GET', '/api/categories');
    assert(verifyCatsRes.body.categories.some((c) => c.id === testCat.id), 'Verified new category persisted across requests');

    // Clean up test category
    await request('POST', '/api/categories', {
      categories: verifyCatsRes.body.categories.filter((c) => c.id !== testCat.id),
    });
    console.log(' Cleaned up test category cleanly.');

    // 3. Plans GET & Pricing
    console.log('\n--- 2. Testing Plans & Pricing Catalog API ---');
    const getPlansRes = await request('GET', '/api/plans');
    assert(getPlansRes.status === 200 && getPlansRes.body.success === true, 'GET /api/plans returns 200 with success: true');
    const plans = getPlansRes.body.plans;
    assert(Array.isArray(plans) && plans.length >= 4, `Plans catalog contains ${plans.length} tiers`);

    const basicPlan = plans.find((p) => p.id === 'basic');
    const advancePlan = plans.find((p) => p.id === 'advanced');
    const proPlan = plans.find((p) => p.id === 'professional');
    const vipPlan = plans.find((p) => p.id === 'ultra');

    assert(basicPlan && basicPlan.priceNum === 0 && basicPlan.maxGraphicsPerDay === 5, 'Basic plan is ₹0 with 5 daily downloads');
    assert(advancePlan && advancePlan.priceNum === 499 && advancePlan.maxGraphicsPerDay === 25, 'Advance plan is ₹499 with 25 daily downloads');
    assert(proPlan && proPlan.priceNum === 999 && proPlan.maxGraphicsPerDay === 100, 'Pro plan is ₹999 with 100 daily downloads');
    assert(vipPlan && vipPlan.priceNum === 1999 && vipPlan.maxGraphicsPerDay === 9999, 'VIP Desk plan is ₹1,999 with unlimited (9999) daily downloads');

    const savePlansRes = await request('POST', '/api/admin/plans', { plans });
    assert(savePlansRes.status === 200 && savePlansRes.body.success === true, 'POST /api/admin/plans successfully persists catalog updates');

    // 4. Template Configs GET & POST
    console.log('\n--- 3. Testing Template Manager Tier Access ---');
    const getTemplatesRes = await request('GET', '/api/template-configs');
    assert(getTemplatesRes.status === 200 && getTemplatesRes.body.success === true, 'GET /api/template-configs returns 200 with configs');
    const configs = getTemplatesRes.body.configs;
    assert(configs && typeof configs === 'object', 'Template configs is a valid object dictionary');

    const t001 = configs['graphic_001'];
    assert(
      t001 && t001.allowedPlans && t001.allowedPlans.includes('BASIC'),
      'Template graphic_001 allows BASIC tier access'
    );

    // Test template config modification
    const updateTemplateRes = await request('POST', '/api/admin/save-template-config', {
      templateId: 'graphic_001',
      allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
      isActive: true,
    });
    assert(
      updateTemplateRes.status === 200 && updateTemplateRes.body.success === true,
      'POST /api/admin/save-template-config successfully updates template tier access'
    );

    // 5. Entitlement & Access Control Verification
    console.log('\n--- 4. Testing Download Entitlements & Access Control ---');

    // 5a. Admin bypass check
    const adminCheck = await request('POST', '/api/verify-download-entitlement', {
      email: 'admin.ainewsmaker@gmail.com',
    });
    assert(
      adminCheck.status === 200 && adminCheck.body.allowed === true && adminCheck.body.unlimited === true,
      'Super Admin account receives unlimited VIP download bypass'
    );

    // 5b. Fresh unregistered/basic user within daily quota (5 max)
    const testUserEmail = `test_reporter_${Date.now()}@example.com`;
    const download1 = await request('POST', '/api/verify-download-entitlement', { email: testUserEmail });
    assert(download1.status === 200 && download1.body.allowed === true && download1.body.remainingToday === 4, 'Basic user 1st download approved (4 remaining)');

    const download2 = await request('POST', '/api/verify-download-entitlement', { email: testUserEmail });
    assert(download2.status === 200 && download2.body.allowed === true && download2.body.remainingToday === 3, 'Basic user 2nd download approved (3 remaining)');

    const download3 = await request('POST', '/api/verify-download-entitlement', { email: testUserEmail });
    assert(download3.status === 200 && download3.body.allowed === true && download3.body.remainingToday === 2, 'Basic user 3rd download approved (2 remaining)');

    const download4 = await request('POST', '/api/verify-download-entitlement', { email: testUserEmail });
    assert(download4.status === 200 && download4.body.allowed === true && download4.body.remainingToday === 1, 'Basic user 4th download approved (1 remaining)');

    const download5 = await request('POST', '/api/verify-download-entitlement', { email: testUserEmail });
    assert(download5.status === 200 && download5.body.allowed === true && download5.body.remainingToday === 0, 'Basic user 5th download approved (0 remaining)');

    // 5c. 6th download exceeds daily limit for Basic tier
    const download6 = await request('POST', '/api/verify-download-entitlement', { email: testUserEmail });
    assert(
      download6.status === 403 && download6.body.quotaExceeded === true,
      '6th download correctly rejected with 403 and quotaExceeded flag'
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
