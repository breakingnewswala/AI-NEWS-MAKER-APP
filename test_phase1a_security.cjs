/**
 * PHASE 1A AUTOMATED VERIFICATION TEST SUITE
 * Tests:
 * 1. Task A - Campaign API Authentication & Authorization
 * 2. Task B - WhatsApp STOP / UNSUBSCRIBE Consent Synchronization
 * 3. Task C - Duplicate WhatsApp Phone Number Ownership Prevention
 */

process.env.NODE_ENV = 'test';
process.env.WHATSAPP_ACCESS_TOKEN = 'test_token_123';

const express = require('express');
const http = require('http');
const {
  registerWhatsAppIntegration,
  normalizeToWaId,
  syncWhatsAppOptOut,
  claimVerifiedPhoneNumber,
  releaseVerifiedPhoneNumber,
} = require('./whatsapp_integration.ts');

// In-Memory Test Database mimicking CentralFirestoreDatabaseService
class MockCentralDb {
  constructor() {
    this.useFirestore = false;
    this.projectId = 'ai-news-maker-app-test';
    this.databaseId = 'test-db';
    this.collections = new Map();
    this.cache = {
      users: new Map(),
    };
  }

  async init() {
    return true;
  }

  _getColl(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name);
  }

  async readDoc(collection, docId) {
    const coll = this._getColl(collection);
    const data = coll.get(docId);
    if (!data) return { success: true, notFound: true, data: null };
    return { success: true, data: { ...data } };
  }

  async writeDoc(collection, docId, data) {
    const coll = this._getColl(collection);
    coll.set(docId, { ...data });
    return { success: true, docId };
  }

  async listDocs(collection, limit = 100) {
    const coll = this._getColl(collection);
    const documents = Array.from(coll.values());
    return { success: true, documents: documents.slice(0, limit) };
  }
}

// Simple HTTP request helper
function request(port, method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (dataStr) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(dataStr);
    }
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, body: json || raw });
        });
      }
    );
    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Phase 1A Automated Verification Suite...');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${detail}`);
      failed++;
    }
  }

  const mockDb = new MockCentralDb();

  // Setup Express App
  const app = express();
  app.use(express.json());

  // Mock requireAdminMiddleware checking req.headers.authorization
  const mockRequireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'प्रमाणीकरण आवश्यक है (401 Unauthorized): टोकन उपलब्ध नहीं है।',
      });
    }
    const token = authHeader.slice(7).trim();
    if (token === 'invalid_token' || token === 'expired_token') {
      return res.status(401).json({
        success: false,
        error: 'अमान्य अथवा समाप्त हो चुका टोकन (401 Unauthorized)।',
      });
    }
    if (token === 'user_token') {
      req.user = { email: 'reporter@ainewsmaker.online', role: 'reporter' };
      return res.status(403).json({
        success: false,
        error: 'अनधिकृत (403 Forbidden): केवल व्यवस्थापक ही यह कार्य कर सकते हैं।',
      });
    }
    if (token === 'admin_token') {
      req.user = { email: 'admin.ainewsmaker@gmail.com', role: 'admin' };
      return next();
    }
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  };

  registerWhatsAppIntegration(app, mockDb, {
    requireAdminMiddleware: mockRequireAdmin,
  });

  const server = await new Promise((res) => {
    const s = app.listen(0, '127.0.0.1', () => res(s));
  });
  const port = server.address().port;

  try {
    // -------------------------------------------------------------
    // TEST GROUP 1: Task A — Campaign API Authentication & Authorization
    // -------------------------------------------------------------
    console.log('--- Test Group 1: Task A Campaign API Security ---');

    // 1.1 Unauthenticated Request -> 401
    const resNoToken = await request(port, 'POST', '/api/admin/whatsapp/campaign', {}, {
      headline: 'Breaking News',
    });
    assert(resNoToken.status === 401, 'Request without Authorization header returns HTTP 401');

    // 1.2 Invalid Token -> 401
    const resInvalid = await request(
      port,
      'POST',
      '/api/admin/whatsapp/campaign',
      { Authorization: 'Bearer invalid_token' },
      { headline: 'Breaking News' }
    );
    assert(resInvalid.status === 401, 'Invalid Bearer token returns HTTP 401');

    // 1.3 Spoofed Headers WITHOUT valid token -> 401
    const resSpoofed = await request(
      port,
      'POST',
      '/api/admin/whatsapp/campaign',
      {
        'x-admin-email': 'admin.ainewsmaker@gmail.com',
        'x-user-role': 'superadmin',
      },
      { headline: 'Test' }
    );
    assert(resSpoofed.status === 401, 'Spoofed x-admin-email / x-user-role headers are rejected with 401');

    // 1.4 Authenticated Regular User (Non-Admin) -> 403
    const resNonAdmin = await request(
      port,
      'POST',
      '/api/admin/whatsapp/campaign',
      { Authorization: 'Bearer user_token' },
      { headline: 'Test' }
    );
    assert(resNonAdmin.status === 403, 'Authenticated non-admin user returns HTTP 403');

    // 1.5 Valid Admin Token -> Authorized (200 in test mode)
    const resAdmin = await request(
      port,
      'POST',
      '/api/admin/whatsapp/campaign',
      { Authorization: 'Bearer admin_token' },
      { testPhone: '9876543210', headline: 'Authorized Admin Broadcast' }
    );
    assert(
      resAdmin.status === 200 && resAdmin.body.testMode === true,
      'Valid Admin token allows authorized campaign operation'
    );

    // -------------------------------------------------------------
    // TEST GROUP 2: Task B — Phone Normalization & Consent Synchronization
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: Task B Consent Synchronization ---');

    // 2.1 Normalization Tests
    assert(normalizeToWaId('9876543210') === '919876543210', 'Normalizes 10-digit Indian phone to 919876543210');
    assert(normalizeToWaId('+91 98765 43210') === '919876543210', 'Normalizes formatted +91 number');
    assert(normalizeToWaId('09876543210') === '919876543210', 'Normalizes leading 0 Indian number');
    assert(normalizeToWaId('+1 555-706-1955', '+1') === '15557061955', 'Normalizes US international number');
    assert(normalizeToWaId('447911123456', '+44') === '447911123456', 'Normalizes UK international number');

    // 2.2 Seed user in mock database
    const testUser = {
      email: 'subscriber@ainewsmaker.online',
      fullName: 'Rituraj Subscriber',
      whatsappNumber: '9876543210',
      countryCode: '+91',
      whatsappVerified: true,
      whatsappBreakingNewsConsent: true,
      newsAlertsConsent: true,
    };
    await mockDb.writeDoc('users', testUser.email, testUser);
    mockDb.cache.users.set(testUser.email, testUser);

    // 2.3 Execute syncWhatsAppOptOut
    const optOutResult = await syncWhatsAppOptOut('919876543210', 'user_inbound_stop', mockDb);
    assert(optOutResult.success === true, 'syncWhatsAppOptOut executes successfully');
    assert(optOutResult.updatedUserEmails.includes(testUser.email), 'syncWhatsAppOptOut matched and updated the user account');

    // 2.4 Verify subscriber doc
    const subDoc = await mockDb.readDoc('whatsapp_subscribers', optOutResult.conversationId);
    assert(
      subDoc.data.newsAlertsConsent === false && subDoc.data.whatsappBreakingNewsConsent === false,
      'whatsapp_subscribers record has newsAlertsConsent: false and breakingNewsConsent: false'
    );

    // 2.5 Verify user doc
    const updatedUserDoc = await mockDb.readDoc('users', testUser.email);
    assert(
      updatedUserDoc.data.whatsappBreakingNewsConsent === false && updatedUserDoc.data.newsAlertsConsent === false,
      'users collection doc has consent revoked'
    );

    // 2.6 Idempotency test (calling STOP again)
    const secondOptOut = await syncWhatsAppOptOut('919876543210', 'user_inbound_stop_repeat', mockDb);
    assert(secondOptOut.success === true, 'Repeated STOP is idempotent');

    // 2.7 Campaign recipient exclusion test
    const resCampExclusion = await request(
      port,
      'POST',
      '/api/admin/whatsapp/campaign',
      { Authorization: 'Bearer admin_token' },
      { targetAudience: 'all', headline: 'Should Skip Opted Out' }
    );
    assert(
      resCampExclusion.status === 200 && resCampExclusion.body.totalRecipients === 0,
      'Campaign engine strictly skips opted-out user from recipients list'
    );

    // -------------------------------------------------------------
    // TEST GROUP 3: Task C — Duplicate Phone Number Prevention
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Task C Duplicate Phone Prevention ---');

    // 3.1 First user verifies phone
    const userAEmail = 'user.a@ainewsmaker.online';
    const claimA = await claimVerifiedPhoneNumber('9479362117', '+91', userAEmail, mockDb);
    assert(claimA.success === true && !claimA.conflict, 'First user successfully claims phone number');

    // Seed User A as verified in cache & users
    const userADoc = {
      email: userAEmail,
      primaryNumber: '9479362117',
      whatsappNumber: '9479362117',
      whatsappVerified: true,
      countryCode: '+91',
    };
    await mockDb.writeDoc('users', userAEmail, userADoc);
    mockDb.cache.users.set(userAEmail, userADoc);

    // 3.2 Second user attempts to claim the SAME phone -> Conflict
    const userBEmail = 'user.b@ainewsmaker.online';
    const claimB = await claimVerifiedPhoneNumber('9479362117', '+91', userBEmail, mockDb);
    assert(
      claimB.conflict === true && claimB.errorCode === 'PHONE_ALREADY_LINKED',
      'Second user claiming same phone is rejected with conflict PHONE_ALREADY_LINKED'
    );

    // 3.3 Same user A re-verifying own number -> Allowed (no conflict)
    const claimAReverify = await claimVerifiedPhoneNumber('9479362117', '+91', userAEmail, mockDb);
    assert(
      claimAReverify.success === true && !claimAReverify.conflict,
      'Same user re-verifying own phone is allowed'
    );

    // 3.4 Phone formatting collision (+91 94793 62117 vs 9479362117) -> Detected as duplicate
    const claimBFormatted = await claimVerifiedPhoneNumber('+91 94793-62117', '+91', userBEmail, mockDb);
    assert(
      claimBFormatted.conflict === true,
      'Formatted number (+91 94793-62117) detected as duplicate of 9479362117'
    );

    // 3.5 User A unlinks number
    const releaseRes = await releaseVerifiedPhoneNumber('9479362117', '+91', userAEmail, mockDb);
    assert(releaseRes.success === true, 'User A successfully releases/unlinks phone');
    mockDb.cache.users.delete(userAEmail); // simulate unlinked in cache

    // 3.6 User B now attempts to claim the unlinked number -> Allowed
    const claimBAfterUnlink = await claimVerifiedPhoneNumber('9479362117', '+91', userBEmail, mockDb);
    assert(
      claimBAfterUnlink.success === true && !claimBAfterUnlink.conflict,
      'User B can claim the phone after authorized unlink by previous owner'
    );

    // 3.7 Verify Endpoint Integration: /api/auth/verify-whatsapp-otp with duplicate phone
    // Set up a mock OTP verification in cache
    const testVerificationId = 'test-verif-uuid-123';
    const salt = '1234567890abcdef';
    const crypto = require('crypto');
    const otp = '654321';
    const phone = '9123456789';
    const codeHash = crypto.createHash('sha256').update(otp + salt + phone).digest('hex');

    // Claim phone for an existing owner first
    await claimVerifiedPhoneNumber(phone, '+91', 'existing.owner@gmail.com', mockDb);
    mockDb.cache.users.set('existing.owner@gmail.com', {
      email: 'existing.owner@gmail.com',
      whatsappNumber: phone,
      whatsappVerified: true,
      countryCode: '+91',
    });

    // In-memory OTP doc
    await mockDb.writeDoc('whatsapp_otp_verifications', testVerificationId, {
      verificationId: testVerificationId,
      phone,
      countryCode: '+91',
      codeHash,
      salt,
      expiresAt: Date.now() + 300000,
      attempts: 0,
      maxAttempts: 3,
      status: 'pending',
    });

    // New user attempts to verify with this already-linked phone
    const resOtpVerifyConflict = await request(port, 'POST', '/api/auth/verify-whatsapp-otp', {}, {
      verificationId: testVerificationId,
      phone,
      otp,
      email: 'new.intruder@gmail.com',
    });

    console.log('Test 3.7 Output:', resOtpVerifyConflict.status, JSON.stringify(resOtpVerifyConflict.body));

    assert(
      resOtpVerifyConflict.status === 409 &&
      resOtpVerifyConflict.body.errorCode === 'PHONE_ALREADY_LINKED' &&
      resOtpVerifyConflict.body.error.includes('पहले से किसी अन्य अकाउंट से जुड़ा हुआ है'),
      'verify-whatsapp-otp endpoint returns HTTP 409 with Hindi message on duplicate phone'
    );

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`📊 Phase 1A Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
