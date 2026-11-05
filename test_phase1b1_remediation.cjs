/**
 * PHASE 1B.1 CRITICAL PRODUCTION READINESS REMEDIATION TEST SUITE
 *
 * Covers:
 * Issue 1: Human Takeover vs AI Dispatch Race Condition
 *   - Takeover before Gemini generation
 *   - Takeover during Gemini generation
 *   - Takeover immediately before AI dispatch
 *   - Takeover while dispatch reservation is active
 * Issue 2: Failed Delivery Status Regression & Explicit State Machine Transitions
 *   - 1. Sent -> Delivered
 *   - 2. Delivered -> Read
 *   - 3. Read -> delayed Sent
 *   - 4. Read -> delayed Delivered
 *   - 5. Delivered -> delayed Failed (Preserves Delivered!)
 *   - 6. Read -> delayed Failed (Preserves Read!)
 *   - 7. Genuine Failed callback (Sent -> Failed with failure details)
 *   - 8. Duplicate Failed callback (Idempotent)
 * Issue 3: Raw Request Body HMAC SHA-256 Verification & Webhook Deduplication
 *   - Raw byte-stream signature verification
 *   - Tampered payload rejection
 *   - Duplicate callback deduplication
 */

process.env.NODE_ENV = 'test';
process.env.WHATSAPP_ACCESS_TOKEN = 'test_access_token_mock_123';
process.env.WHATSAPP_PHONE_NUMBER_ID = '1474022642460639';
process.env.META_APP_SECRET = 'test_meta_app_secret_production_ready_999';
process.env.META_WEBHOOK_VERIFY_TOKEN = 'test_verify_token_xyz';
process.env.WHATSAPP_AI_ENABLED = 'true';
process.env.GOOGLE_CLOUD_PROJECT = 'ai-news-maker-app';
process.env.WHATSAPP_TASK_QUEUE_LOCATION = 'asia-east1';
process.env.WHATSAPP_TASK_QUEUE = 'whatsapp-inbound-queue';
process.env.WHATSAPP_TASK_SERVICE_ACCOUNT = 'tasks@ai-news-maker-app.iam.gserviceaccount.com';
process.env.WHATSAPP_TASK_BASE_URL = 'http://localhost';
process.env.WHATSAPP_TASK_AUDIENCE = 'http://localhost/api/whatsapp/tasks/process';

const express = require('express');
const http = require('http');
const crypto = require('crypto');
const {
  registerWhatsAppIntegration,
  processDeliveryStatus,
  recordAuditEvent,
  acquireAiDispatchReservation,
  releaseAiDispatchReservation,
  VALID_STATUS_TRANSITIONS,
  isValidStatusTransition,
  conversationCache,
  messageCache,
  replyIdempotencyCache,
} = require('./whatsapp_integration.ts');

class MockCentralDb {
  constructor() {
    this.useFirestore = true;
    this.projectId = 'ai-news-maker-app';
    this.databaseId = 'test-custom-db';
    this.collections = new Map();
    this.cache = { users: new Map() };
  }

  _getColl(name) {
    if (!this.collections.has(name)) this.collections.set(name, new Map());
    return this.collections.get(name);
  }

  async readDoc(collection, docId) {
    const coll = this._getColl(collection);
    const data = coll.get(docId);
    if (!data) return { success: false, notFound: true, data: null };
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  }

  async writeDoc(collection, docId, data) {
    const coll = this._getColl(collection);
    const stored = JSON.parse(JSON.stringify(data));
    coll.set(docId, stored);
    return { success: true, docId, data: stored };
  }

  async listDocs(collection, pageSize = 300) {
    const coll = this._getColl(collection);
    const documents = Array.from(coll.entries()).map(([id, data]) => ({
      id,
      docId: id,
      ...JSON.parse(JSON.stringify(data)),
    }));
    return { success: true, documents, totalCount: documents.length };
  }
}

async function runRemediationTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 1B.1 PRODUCTION READINESS REMEDIATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  };

  const centralDb = new MockCentralDb();
  const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

  const app = express();
  app.use(express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf ? buf.toString('utf8') : '';
    }
  }));

  const requireAdminMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer admin_token_valid')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    req.user = {
      userId: 'admin_1',
      email: 'breakingnewswala.com@gmail.com',
      role: 'admin',
      name: 'Master Admin',
    };
    next();
  };

  registerWhatsAppIntegration(app, centralDb, { requireAdminMiddleware });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const apiCall = async (method, path, body = null, headers = {}) => {
    const fetch = (await import('node-fetch')).default || global.fetch;
    const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } };
    if (body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    const res = await fetch(`${baseUrl}${path}`, opts);
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    return { status: res.status, data };
  };

  // =========================================================================
  // ISSUE 1: HUMAN TAKEOVER vs AI DISPATCH RACE CONDITION TESTS
  // =========================================================================
  console.log('--- ISSUE 1: HUMAN TAKEOVER vs AI DISPATCH RACE CONDITION ---');

  const convId = sha256('919876540001');

  // Test 1.1: Takeover before Gemini generation starts
  await centralDb.writeDoc('whatsapp_conversations', convId, {
    conversationId: convId,
    waId: '919876540001',
    handlingMode: 'human', // Already taken over by operator
    updatedAt: Date.now(),
  });
  conversationCache.set(convId, {
    conversationId: convId,
    waId: '919876540001',
    handlingMode: 'human',
  });

  const resBeforeGen = await acquireAiDispatchReservation(convId, centralDb);
  assert(
    resBeforeGen.acquired === false && resBeforeGen.reason === 'conversation_in_human_mode',
    'Issue 1 - Test 1: Takeover before Gemini blocks reservation acquisition (acquired: false)'
  );

  // Test 1.2: Takeover during Gemini generation
  // 1. Conversation starts in 'ai' mode
  await centralDb.writeDoc('whatsapp_conversations', convId, {
    conversationId: convId,
    waId: '919876540001',
    handlingMode: 'ai',
    updatedAt: Date.now(),
  });
  conversationCache.set(convId, {
    conversationId: convId,
    waId: '919876540001',
    handlingMode: 'ai',
  });

  // 2. Simulated Gemini call begins... While it runs, operator takes over via API
  const takeoverRes = await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${convId}/mode`,
    { mode: 'human' },
    { Authorization: 'Bearer admin_token_valid' }
  );
  assert(
    takeoverRes.status === 200 && takeoverRes.data?.newMode === 'human',
    'Issue 1 - Test 2a: Operator takeover via API transitions mode to "human"'
  );

  // 3. Simulated Gemini finishes. AI worker attempts to acquire reservation
  const resAfterGen = await acquireAiDispatchReservation(convId, centralDb);
  assert(
    resAfterGen.acquired === false && resAfterGen.reason === 'conversation_in_human_mode',
    'Issue 1 - Test 2b: Takeover during Gemini aborts post-generation dispatch reservation'
  );

  // Test 1.3: Takeover immediately before AI dispatch
  // Reset to 'ai' mode
  await centralDb.writeDoc('whatsapp_conversations', convId, {
    conversationId: convId,
    waId: '919876540001',
    handlingMode: 'ai',
    updatedAt: Date.now(),
  });
  conversationCache.set(convId, {
    conversationId: convId,
    waId: '919876540001',
    handlingMode: 'ai',
  });

  // Operator assigns conversation right as AI is about to send
  const assignTakeover = await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${convId}/assign`,
    { operatorId: 'op_1', operatorName: 'Support Agent' },
    { Authorization: 'Bearer admin_token_valid' }
  );
  const convAfterAssign = await centralDb.readDoc('whatsapp_conversations', convId);
  const resPreDispatch = await acquireAiDispatchReservation(convId, centralDb);
  assert(
    convAfterAssign.data?.handlingMode === 'human' && resPreDispatch.acquired === false,
    'Issue 1 - Test 3: Takeover immediately before dispatch blocks reservation and send'
  );

  // Test 1.4: Takeover while dispatch reservation is active
  // Reset to 'ai' mode and acquire reservation
  await centralDb.writeDoc('whatsapp_conversations', convId, {
    conversationId: convId,
    waId: '919876540001',
    handlingMode: 'ai',
    updatedAt: Date.now(),
  });
  conversationCache.set(convId, {
    conversationId: convId,
    waId: '919876540001',
    handlingMode: 'ai',
  });

  const activeRes = await acquireAiDispatchReservation(convId, centralDb);
  assert(
    activeRes.acquired === true && Boolean(activeRes.reservationId),
    'Issue 1 - Test 4a: AI worker successfully acquires active reservation'
  );

  // Now operator takes over before HTTP socket write completes
  await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${convId}/mode`,
    { mode: 'human' },
    { Authorization: 'Bearer admin_token_valid' }
  );

  // Verify that operator takeover revoked the active reservation
  const convAfterRevocation = conversationCache.get(convId);
  const isRevoked =
    convAfterRevocation.handlingMode === 'human' &&
    convAfterRevocation.aiDispatchReservation === null;
  assert(
    isRevoked,
    'Issue 1 - Test 4b: Operator takeover forcibly revokes active AI dispatch reservation'
  );

  // Release cleanup test
  await releaseAiDispatchReservation(convId, activeRes.reservationId, centralDb);
  assert(
    true,
    'Issue 1 - Test 4c: Reservation release executes cleanly without throwing'
  );

  // =========================================================================
  // ISSUE 2: FAILED DELIVERY STATUS REGRESSION & STATE MACHINE TESTS
  // =========================================================================
  console.log('\n--- ISSUE 2: FAILED DELIVERY STATUS REGRESSION & STATE MACHINE ---');

  // Test 2.1: State Machine Transition Table validation
  assert(
    isValidStatusTransition('pending', 'sent') &&
      isValidStatusTransition('sent', 'delivered') &&
      isValidStatusTransition('delivered', 'read') &&
      !isValidStatusTransition('delivered', 'failed') &&
      !isValidStatusTransition('read', 'failed') &&
      !isValidStatusTransition('read', 'delivered') &&
      !isValidStatusTransition('read', 'sent') &&
      !isValidStatusTransition('failed', 'read'),
    'Issue 2 - State Machine: Explicit transition rules correctly validate allowed and forbidden paths'
  );

  const msgId1 = 'wamid.HBgLTEST_STATEMACHINE_001';
  const msgDocId1 = sha256(msgId1);

  // Seed pending message
  await centralDb.writeDoc('whatsapp_messages', msgDocId1, {
    messageId: msgId1,
    metaMessageId: msgId1,
    conversationId: convId,
    direction: 'outbound',
    status: 'pending',
    timestamp: Date.now() - 5000,
  });
  messageCache.set(msgDocId1, {
    messageId: msgId1,
    metaMessageId: msgId1,
    conversationId: convId,
    status: 'pending',
  });

  // 1. Sent -> Delivered
  await processDeliveryStatus({ id: msgId1, status: 'sent', timestamp: Math.floor(Date.now() / 1000) }, centralDb);
  const tr1 = await processDeliveryStatus({ id: msgId1, status: 'delivered', timestamp: Math.floor(Date.now() / 1000) }, centralDb);
  const docAfterDelivered = await centralDb.readDoc('whatsapp_messages', msgDocId1);
  assert(
    tr1.success && docAfterDelivered.data?.status === 'delivered',
    'Issue 2 - Test 1: Sent -> Delivered transitions successfully to "delivered"'
  );

  // 2. Delivered -> Read
  const tr2 = await processDeliveryStatus({ id: msgId1, status: 'read', timestamp: Math.floor(Date.now() / 1000) }, centralDb);
  const docAfterRead = await centralDb.readDoc('whatsapp_messages', msgDocId1);
  assert(
    tr2.success && docAfterRead.data?.status === 'read',
    'Issue 2 - Test 2: Delivered -> Read transitions successfully to "read"'
  );

  // 3. Read -> delayed Sent (Must be ignored via state machine transition check)
  const msgIdFreshRead = 'wamid.HBgLTEST_READ_FRESH_004';
  const msgDocIdFreshRead = sha256(msgIdFreshRead);
  await centralDb.writeDoc('whatsapp_messages', msgDocIdFreshRead, {
    messageId: msgIdFreshRead,
    metaMessageId: msgIdFreshRead,
    conversationId: convId,
    status: 'read',
    timestamp: Date.now() - 5000,
  });
  messageCache.set(msgDocIdFreshRead, {
    messageId: msgIdFreshRead,
    metaMessageId: msgIdFreshRead,
    conversationId: convId,
    status: 'read',
  });

  const tr3 = await processDeliveryStatus({ id: msgIdFreshRead, status: 'sent', timestamp: Math.floor(Date.now() / 1000) - 20 }, centralDb);
  const docAfterDelayedSent = await centralDb.readDoc('whatsapp_messages', msgDocIdFreshRead);
  assert(
    tr3.ignored === true && docAfterDelayedSent.data?.status === 'read',
    'Issue 2 - Test 3: Read -> delayed Sent is rejected; status remains "read"'
  );

  // 4. Read -> delayed Delivered (Must be ignored via state machine transition check)
  const tr4 = await processDeliveryStatus({ id: msgIdFreshRead, status: 'delivered', timestamp: Math.floor(Date.now() / 1000) - 10 }, centralDb);
  const docAfterDelayedDelivered = await centralDb.readDoc('whatsapp_messages', msgDocIdFreshRead);
  assert(
    tr4.ignored === true && docAfterDelayedDelivered.data?.status === 'read',
    'Issue 2 - Test 4: Read -> delayed Delivered is rejected; status remains "read"'
  );

  // 5. Delivered -> delayed Failed (CRITICAL: Must preserve Delivered!)
  const msgId2 = 'wamid.HBgLTEST_DELIVERED_PRESERVE_002';
  const msgDocId2 = sha256(msgId2);
  await centralDb.writeDoc('whatsapp_messages', msgDocId2, {
    messageId: msgId2,
    metaMessageId: msgId2,
    conversationId: convId,
    status: 'delivered', // Already successfully delivered to device!
    timestamp: Date.now() - 3000,
  });
  messageCache.set(msgDocId2, {
    messageId: msgId2,
    metaMessageId: msgId2,
    conversationId: convId,
    status: 'delivered',
  });

  const tr5 = await processDeliveryStatus({
    id: msgId2,
    status: 'failed',
    timestamp: Math.floor(Date.now() / 1000),
    errors: [{ code: 131026, message: 'Late failure callback' }]
  }, centralDb);
  const docAfterLateFailOnDelivered = await centralDb.readDoc('whatsapp_messages', msgDocId2);
  assert(
    tr5.ignored === true && docAfterLateFailOnDelivered.data?.status === 'delivered',
    'Issue 2 - Test 5: Delivered -> delayed Failed is REJECTED; status remains "delivered" (Preserves Delivery!)'
  );

  // 6. Read -> delayed Failed (CRITICAL: Must preserve Read!)
  const tr6 = await processDeliveryStatus({
    id: msgId1, // msgId1 is currently in 'read' status
    status: 'failed',
    timestamp: Math.floor(Date.now() / 1000),
    errors: [{ code: 131026, message: 'Stale error callback' }]
  }, centralDb);
  const docAfterLateFailOnRead = await centralDb.readDoc('whatsapp_messages', msgDocId1);
  assert(
    tr6.ignored === true && docAfterLateFailOnRead.data?.status === 'read',
    'Issue 2 - Test 6: Read -> delayed Failed is REJECTED; status remains "read" (Preserves Read!)'
  );

  // 7. Genuine Failed callback (Sent -> Failed)
  const msgId3 = 'wamid.HBgLTEST_GENUINE_FAIL_003';
  const msgDocId3 = sha256(msgId3);
  await centralDb.writeDoc('whatsapp_messages', msgDocId3, {
    messageId: msgId3,
    metaMessageId: msgId3,
    conversationId: convId,
    status: 'sent',
    timestamp: Date.now() - 4000,
  });
  messageCache.set(msgDocId3, {
    messageId: msgId3,
    metaMessageId: msgId3,
    conversationId: convId,
    status: 'sent',
  });

  const tr7 = await processDeliveryStatus({
    id: msgId3,
    status: 'failed',
    timestamp: Math.floor(Date.now() / 1000),
    errors: [{ code: 131026, title: 'Message undeliverable', message: 'User offline' }]
  }, centralDb);
  const docAfterGenuineFail = await centralDb.readDoc('whatsapp_messages', msgDocId3);
  assert(
    tr7.success &&
      docAfterGenuineFail.data?.status === 'failed' &&
      Array.isArray(docAfterGenuineFail.data?.failureDetails) &&
      docAfterGenuineFail.data.failureDetails[0]?.code === 131026,
    'Issue 2 - Test 7: Genuine Sent -> Failed transitions to "failed" and captures failureDetails'
  );

  // 8. Duplicate Failed callback (Idempotent)
  const tr8 = await processDeliveryStatus({
    id: msgId3,
    status: 'failed',
    timestamp: Math.floor(Date.now() / 1000),
  }, centralDb);
  const docAfterDupFail = await centralDb.readDoc('whatsapp_messages', msgDocId3);
  assert(
    tr8.duplicate === true && docAfterDupFail.data?.status === 'failed',
    'Issue 2 - Test 8: Duplicate Failed callback is recognized as duplicate and handled idempotently'
  );

  // =========================================================================
  // ISSUE 3: RAW REQUEST BODY HMAC SHA-256 & WEBHOOK DEDUPLICATION TESTS
  // =========================================================================
  console.log('\n--- ISSUE 3: RAW REQUEST BODY HMAC VERIFICATION & DEDUPLICATION ---');

  const appSecret = process.env.META_APP_SECRET;

  // Raw payload string with non-standard whitespace and indentation
  const rawPayloadString = '{\n  "object": "whatsapp_business_account",\n  "entry": [\n    {\n      "id": "1136242015583003",\n      "changes": []\n    }\n  ]\n}';

  const validHmacHex = crypto.createHmac('sha256', appSecret).update(rawPayloadString, 'utf8').digest('hex');
  const validHeader = `sha256=${validHmacHex}`;

  // Test 3.1: Valid signature computed against raw payload string succeeds
  const rawSigRes = await apiCall('POST', '/api/whatsapp/webhook', rawPayloadString, {
    'x-hub-signature-256': validHeader,
  });
  assert(
    rawSigRes.status === 200,
    'Issue 3 - Test 1: Webhook HMAC SHA-256 computed on raw body string is accepted (200 OK)'
  );

  // Test 3.2: Tampered payload with even 1 byte difference is rejected (401)
  const tamperedPayload = rawPayloadString.replace('1136242015583003', '1136242015583004');
  const tamperedRes = await apiCall('POST', '/api/whatsapp/webhook', tamperedPayload, {
    'x-hub-signature-256': validHeader, // Signature of original, not tampered!
  });
  assert(
    tamperedRes.status === 401,
    'Issue 3 - Test 2: Tampered payload with 1 byte difference rejected with 401'
  );

  // Test 3.3: Missing signature header is rejected with 401
  const missingSigRes = await apiCall('POST', '/api/whatsapp/webhook', rawPayloadString);
  assert(
    missingSigRes.status === 401,
    'Issue 3 - Test 3: Missing signature header rejected with 401'
  );

  // Test 3.4: Duplicate webhook delivery for identical status update is deduped
  const testDedupeMsgId = 'wamid.HBgLTEST_DEDUPE_CALLBACK_999';
  const testDedupeDocId = sha256(testDedupeMsgId);
  await centralDb.writeDoc('whatsapp_messages', testDedupeDocId, {
    messageId: testDedupeMsgId,
    metaMessageId: testDedupeMsgId,
    conversationId: convId,
    status: 'pending',
  });

  const firstCall = await processDeliveryStatus({ id: testDedupeMsgId, status: 'sent', timestamp: 1730000000 }, centralDb);
  const secondCall = await processDeliveryStatus({ id: testDedupeMsgId, status: 'sent', timestamp: 1730000000 }, centralDb);
  assert(
    firstCall.success && firstCall.newStatus === 'sent' && secondCall.duplicate === true,
    'Issue 3 - Test 4: Duplicate webhook callback is deduped via whatsapp_webhook_events'
  );

  // Close server
  await new Promise((resolve) => server.close(resolve));

  console.log('\n================================================================');
  console.log(`📊 PHASE 1B.1 REMEDIATION TEST RESULTS: ${passed} PASSED / ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRemediationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
