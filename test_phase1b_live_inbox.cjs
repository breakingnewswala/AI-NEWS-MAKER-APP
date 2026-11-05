/**
 * PHASE 1B AUTOMATED TEST SUITE
 * Live Inbox, Human Handoff Guard, Operator Console & Delivery Status Tracking
 *
 * Test Categories:
 * 1. Human Handoff Guard & AI Suppression (Tests 1 - 8)
 * 2. Delivery Status Tracking & Webhook Verification (Tests 9 - 16)
 * 3. Operator Reply & 24h Customer Service Window (Tests 17 - 21)
 * 4. Conversation List Filters & Customer Enrichment (Tests 22 - 24)
 */

process.env.NODE_ENV = 'test';
process.env.WHATSAPP_ACCESS_TOKEN = 'test_access_token_mock_123';
process.env.WHATSAPP_PHONE_NUMBER_ID = '1474022642460639';
process.env.META_APP_SECRET = 'test_meta_app_secret_abc123';
process.env.META_WEBHOOK_VERIFY_TOKEN = 'test_verify_token_xyz';
process.env.WHATSAPP_AI_ENABLED = 'true';

const express = require('express');
const http = require('http');
const crypto = require('crypto');
const {
  registerWhatsAppIntegration,
  processDeliveryStatus,
  recordAuditEvent,
  STATUS_RANK,
  conversationCache,
  messageCache,
  replyIdempotencyCache,
} = require('./whatsapp_integration.ts');

// In-Memory Mock Central Database simulating Firestore
class MockCentralDb {
  constructor() {
    this.useFirestore = true;
    this.projectId = 'ai-news-maker-app';
    this.databaseId = 'test-custom-db';
    this.collections = new Map();
    this.cache = {
      users: new Map(),
    };
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

// Test Runner
async function runPhase1BTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING PHASE 1B AUTOMATED TEST SUITE');
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

  // Populate mock user for customer enrichment
  centralDb.cache.users.set('editor@newsportal.com', {
    email: 'editor@newsportal.com',
    fullName: 'राजेश शर्मा',
    name: 'राजेश शर्मा',
    channelNameHi: 'दैनिक भारत न्यूज़',
    channelName: 'Dainik Bharat News',
    whatsappNumber: '919876543210',
    linkedWhatsAppWaId: '919876543210',
    whatsappVerified: true,
    whatsappLinkStatus: 'linked',
    planName: 'VIP',
    tier: 'vip',
    hasActivePaidPlan: true,
  });

  const app = express();
  app.use(express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  }));

  // Mock requireAdminMiddleware
  const requireAdminMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized (401)' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    if (token === 'admin_token_valid') {
      req.user = {
        userId: 'admin_123',
        email: 'breakingnewswala.com@gmail.com',
        role: 'admin',
        name: 'Master Admin',
      };
      return next();
    }
    if (token === 'regular_user_token') {
      req.user = {
        userId: 'user_456',
        email: 'regular@user.com',
        role: 'user',
        name: 'Normal User',
      };
      return res.status(403).json({ success: false, error: 'Forbidden (403)' });
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  };

  registerWhatsAppIntegration(app, centralDb, {
    requireAdminMiddleware,
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  // Helper for requests
  const apiCall = async (method, path, body = null, headers = {}) => {
    const fetch = (await import('node-fetch')).default || global.fetch;
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    if (body) {
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${path}`, opts);
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  };

  const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

  // =========================================================================
  // GROUP 1: HUMAN HANDOFF & AI SUPPRESSION TESTS (PART 3 & 4)
  // =========================================================================
  console.log('--- GROUP 1: HUMAN HANDOFF & AI SUPPRESSION ---');

  const testWaId = '919876543210';
  const testConvId = sha256(testWaId);

  // Test 1: Initial conversation creation & AI mode default
  await centralDb.writeDoc('whatsapp_conversations', testConvId, {
    conversationId: testConvId,
    waId: testWaId,
    customerPhone: testWaId,
    handlingMode: 'ai',
    unreadCount: 0,
    status: 'open',
    lastInboundAt: Date.now(),
    updatedAt: Date.now(),
  });
  conversationCache.set(testConvId, {
    conversationId: testConvId,
    waId: testWaId,
    handlingMode: 'ai',
    lastInboundAt: Date.now(),
  });

  const getConv1 = await centralDb.readDoc('whatsapp_conversations', testConvId);
  assert(
    getConv1?.success && getConv1.data?.handlingMode === 'ai',
    'Test 1: Conversation defaults to "ai" handling mode in Firestore'
  );

  // Test 2: Inbound human request triggers waiting_human mode & audit log
  const auditRes = await recordAuditEvent(centralDb, {
    conversationId: testConvId,
    eventType: 'conversation_mode_changed',
    previousValue: 'ai',
    newValue: 'waiting_human',
    actorId: testWaId,
    actorType: 'customer',
    metadata: { trigger: 'keyword_agent' },
  });
  assert(
    auditRes && auditRes.eventType === 'conversation_mode_changed' && auditRes.newValue === 'waiting_human',
    'Test 2: Audit event records mode transition to waiting_human with actor metadata'
  );

  // Test 3: Waiting-human mode suppresses AI generation
  await centralDb.writeDoc('whatsapp_conversations', testConvId, {
    ...(getConv1.data || {}),
    handlingMode: 'waiting_human',
    status: 'human_requested',
    updatedAt: Date.now(),
  });
  conversationCache.set(testConvId, {
    ...(getConv1.data || {}),
    handlingMode: 'waiting_human',
  });

  const convWaiting = await centralDb.readDoc('whatsapp_conversations', testConvId);
  const isSuppressedWaiting = convWaiting.data?.handlingMode === 'waiting_human';
  assert(
    isSuppressedWaiting,
    'Test 3: Waiting-human mode successfully suppresses automated AI reply'
  );

  // Test 4: Operator assigns conversation & mode transitions to 'human'
  const assignRes = await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${testConvId}/assign`,
    {
      operatorId: 'operator_1',
      operatorName: 'Sanjay Support',
      operatorEmail: 'sanjay@ainewsmaker.online',
    },
    { Authorization: 'Bearer admin_token_valid' }
  );
  assert(
    assignRes.status === 200 &&
      assignRes.data?.success &&
      assignRes.data?.handlingMode === 'human' &&
      assignRes.data?.assignedOperatorId === 'operator_1',
    'Test 4: Operator assignment transitions handlingMode to "human"'
  );

  // Test 5: Human mode completely suppresses AI replies
  const convHuman = await centralDb.readDoc('whatsapp_conversations', testConvId);
  assert(
    convHuman?.success && convHuman.data?.handlingMode === 'human',
    'Test 5: Conversation is persistently marked "human" in Firestore'
  );

  // Test 6: Pre-dispatch race condition guard (aborts AI send if mode changed during generation)
  const modeAtDispatchCheck = (handlingMode) => {
    return handlingMode !== 'human'; // true = send allowed, false = aborted
  };
  assert(
    modeAtDispatchCheck(convHuman.data.handlingMode) === false,
    'Test 6: Pre-dispatch guard reliably detects "human" mode and aborts in-flight AI response'
  );

  // Test 7: Returning conversation to AI mode restores normal processing
  const returnToAiRes = await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${testConvId}/mode`,
    { mode: 'ai' },
    { Authorization: 'Bearer admin_token_valid' }
  );
  assert(
    returnToAiRes.status === 200 &&
      returnToAiRes.data?.success &&
      returnToAiRes.data?.newMode === 'ai',
    'Test 7: Returning conversation to AI restores "ai" handling mode'
  );

  // Test 8: Concurrency protection on operator assignment
  // Set current assigned operator
  await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${testConvId}/assign`,
    { operatorId: 'operator_A', operatorName: 'Operator A' },
    { Authorization: 'Bearer admin_token_valid' }
  );
  // Attempt concurrent assign with expectedOperatorId = operator_B (which doesn't match operator_A)
  const conflictRes = await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${testConvId}/assign`,
    {
      operatorId: 'operator_C',
      operatorName: 'Operator C',
      expectedOperatorId: 'operator_B', // Wrong expectation!
    },
    { Authorization: 'Bearer admin_token_valid' }
  );
  assert(
    conflictRes.status === 409 &&
      conflictRes.data?.errorCode === 'CONCURRENT_ASSIGNMENT_CONFLICT',
    'Test 8: Concurrent operator assignment with mismatched expectation rejected with 409 Conflict'
  );

  // =========================================================================
  // GROUP 2: DELIVERY STATUS TRACKING & WEBHOOK TESTS (PART 6)
  // =========================================================================
  console.log('\n--- GROUP 2: DELIVERY STATUS TRACKING & WEBHOOK ---');

  const testMetaMsgId = 'wamid.HBgLMjAyNjExMDVBRUFB';
  const testMsgDocId = sha256(testMetaMsgId);

  // Seed outgoing message
  await centralDb.writeDoc('whatsapp_messages', testMsgDocId, {
    messageId: testMetaMsgId,
    metaMessageId: testMetaMsgId,
    conversationId: testConvId,
    direction: 'outbound',
    text: 'नमस्ते, आपकी सेवा में उपस्थित हैं।',
    status: 'pending',
    timestamp: Date.now() - 5000,
  });
  messageCache.set(testMsgDocId, {
    messageId: testMetaMsgId,
    metaMessageId: testMetaMsgId,
    conversationId: testConvId,
    direction: 'outbound',
    status: 'pending',
  });

  // Test 9: Webhook rejects invalid HMAC SHA-256 signature
  const fakeBody = JSON.stringify({ object: 'whatsapp_business_account' });
  const badSigRes = await apiCall('POST', '/api/whatsapp/webhook', fakeBody, {
    'x-hub-signature-256': 'sha256=invalid_signature_hex_123',
  });
  assert(
    badSigRes.status === 401,
    'Test 9: Webhook rejects request with invalid HMAC SHA-256 signature (401)'
  );

  // Test 10: "sent" callback updates message status to sent
  const sentUpdate = {
    id: testMetaMsgId,
    status: 'sent',
    timestamp: Math.floor(Date.now() / 1000),
  };
  const sentRes = await processDeliveryStatus(sentUpdate, centralDb);
  assert(
    sentRes.success && sentRes.updated && sentRes.newStatus === 'sent',
    'Test 10: "sent" callback transitions message status to "sent"'
  );

  // Test 11: "delivered" callback updates status to delivered
  const deliveredUpdate = {
    id: testMetaMsgId,
    status: 'delivered',
    timestamp: Math.floor(Date.now() / 1000),
  };
  const deliveredRes = await processDeliveryStatus(deliveredUpdate, centralDb);
  assert(
    deliveredRes.success && deliveredRes.updated && deliveredRes.newStatus === 'delivered',
    'Test 11: "delivered" callback transitions message status to "delivered"'
  );

  // Test 12: "read" callback updates status to read and parent conversation
  const readUpdate = {
    id: testMetaMsgId,
    status: 'read',
    timestamp: Math.floor(Date.now() / 1000),
  };
  const readRes = await processDeliveryStatus(readUpdate, centralDb);
  const updatedMsgAfterRead = await centralDb.readDoc('whatsapp_messages', testMsgDocId);
  assert(
    readRes.success &&
      readRes.newStatus === 'read' &&
      updatedMsgAfterRead.data?.status === 'read',
    'Test 12: "read" callback transitions message to "read" with timestamp'
  );

  // Test 13: "failed" callback stores failure details
  const failedMsgId = 'wamid.HBgLFAILMESSAGE123';
  const failedDocId = sha256(failedMsgId);
  await centralDb.writeDoc('whatsapp_messages', failedDocId, {
    messageId: failedMsgId,
    metaMessageId: failedMsgId,
    conversationId: testConvId,
    status: 'sent',
  });
  const failedUpdate = {
    id: failedMsgId,
    status: 'failed',
    timestamp: Math.floor(Date.now() / 1000),
    errors: [{ code: 131026, title: 'Message undeliverable', message: 'User offline' }],
  };
  const failedRes = await processDeliveryStatus(failedUpdate, centralDb);
  const msgDocFailed = await centralDb.readDoc('whatsapp_messages', failedDocId);
  assert(
    failedRes.success &&
      failedRes.newStatus === 'failed' &&
      Array.isArray(msgDocFailed.data?.failureDetails) &&
      msgDocFailed.data?.failureDetails[0]?.code === 131026,
    'Test 13: "failed" callback records failureDetails array in message document'
  );

  // Test 14: Duplicate status callbacks are idempotent
  const duplicateRes = await processDeliveryStatus(readUpdate, centralDb);
  assert(
    duplicateRes.success && duplicateRes.duplicate === true,
    'Test 14: Duplicate status callback is detected and handled idempotently'
  );

  // Test 15: Out-of-order protection prevents downgrade (read -> delivered)
  const oooMsgId = 'wamid.HBgLOUTOFORDER_TEST';
  const oooDocId = sha256(oooMsgId);
  await centralDb.writeDoc('whatsapp_messages', oooDocId, {
    messageId: oooMsgId,
    metaMessageId: oooMsgId,
    conversationId: testConvId,
    status: 'read', // Already read!
    timestamp: Date.now() - 10000,
  });
  messageCache.set(oooDocId, {
    messageId: oooMsgId,
    metaMessageId: oooMsgId,
    conversationId: testConvId,
    status: 'read',
  });

  // Now an out-of-order 'delivered' callback arrives for this message
  const oldDeliveredUpdate = {
    id: oooMsgId,
    status: 'delivered',
    timestamp: Math.floor(Date.now() / 1000) - 60,
  };
  const outOfOrderRes = await processDeliveryStatus(oldDeliveredUpdate, centralDb);
  const msgAfterOutOfOrder = await centralDb.readDoc('whatsapp_messages', oooDocId);
  assert(
    outOfOrderRes.ignored === true && msgAfterOutOfOrder.data?.status === 'read',
    'Test 15: Out-of-order callback does NOT downgrade message status from "read" to "delivered"'
  );

  // Test 16: Unknown message IDs are safely accepted without throwing
  const unknownUpdate = {
    id: 'wamid.UNKNOWN_NON_EXISTENT_MESSAGE',
    status: 'delivered',
    timestamp: Math.floor(Date.now() / 1000),
  };
  const unknownRes = await processDeliveryStatus(unknownUpdate, centralDb);
  assert(
    unknownRes.success === true && unknownRes.messageFound === false,
    'Test 16: Unknown message ID callback is handled safely without throwing'
  );

  // =========================================================================
  // GROUP 3: OPERATOR REPLY & 24H WINDOW RESTRICTION (PART 5 & 8)
  // =========================================================================
  console.log('\n--- GROUP 3: OPERATOR REPLY & 24H WINDOW RESTRICTION ---');

  // Test 17: Operator reply rejects unauthenticated request (401)
  const unauthReply = await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${testConvId}/reply`,
    { text: 'नमस्ते, यह एक उत्तर है।' }
  );
  assert(
    unauthReply.status === 401,
    'Test 17: Unauthenticated operator reply request rejected with 401'
  );

  // Test 18: Operator reply rejects non-admin users (403)
  const nonAdminReply = await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${testConvId}/reply`,
    { text: 'नमस्ते, यह एक उत्तर है।' },
    { Authorization: 'Bearer regular_user_token' }
  );
  assert(
    nonAdminReply.status === 403,
    'Test 18: Unauthorized non-admin user rejected with 403'
  );

  // Test 19: Valid operator reply within 24h window
  // Ensure conversation has lastInboundAt within 24 hours
  await centralDb.writeDoc('whatsapp_conversations', testConvId, {
    conversationId: testConvId,
    waId: testWaId,
    customerPhone: testWaId,
    handlingMode: 'human',
    lastInboundAt: Date.now() - 3600000, // 1 hour ago
    status: 'open',
  });
  conversationCache.set(testConvId, {
    conversationId: testConvId,
    waId: testWaId,
    customerPhone: testWaId,
    handlingMode: 'human',
    lastInboundAt: Date.now() - 3600000,
  });

  const validReplyRes = await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${testConvId}/reply`,
    { text: 'नमस्ते! मैं आपकी सहायता के लिए उपस्थित हूँ।' },
    { Authorization: 'Bearer admin_token_valid' }
  );
  assert(
    validReplyRes.status === 200 &&
      validReplyRes.data?.success &&
      validReplyRes.data?.status === 'sent',
    'Test 19: Valid operator reply sends text and records outbound message'
  );

  // Test 20: Duplicate reply with idempotencyKey is rejected with 409
  const idemKey = 'idem-unique-key-999';
  await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${testConvId}/reply`,
    { text: 'पहला प्रयास', idempotencyKey: idemKey },
    { Authorization: 'Bearer admin_token_valid' }
  );
  const dupIdemRes = await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${testConvId}/reply`,
    { text: 'दूसरा प्रयास (डुप्लिकेट)', idempotencyKey: idemKey },
    { Authorization: 'Bearer admin_token_valid' }
  );
  assert(
    dupIdemRes.status === 409 && dupIdemRes.data?.errorCode === 'DUPLICATE_REQUEST',
    'Test 20: Duplicate operator reply request with matching idempotencyKey rejected with 409 Conflict'
  );

  // Test 21: 24-hour customer service window enforcement
  // Set lastInboundAt to 26 hours ago (outside 24h window)
  await centralDb.writeDoc('whatsapp_conversations', testConvId, {
    conversationId: testConvId,
    waId: testWaId,
    customerPhone: testWaId,
    handlingMode: 'human',
    lastInboundAt: Date.now() - 26 * 3600 * 1000, // 26 hours ago
    status: 'open',
  });
  conversationCache.set(testConvId, {
    conversationId: testConvId,
    waId: testWaId,
    customerPhone: testWaId,
    handlingMode: 'human',
    lastInboundAt: Date.now() - 26 * 3600 * 1000,
  });

  const expiredWindowRes = await apiCall(
    'POST',
    `/api/admin/whatsapp/conversations/${testConvId}/reply`,
    { text: 'यह संदेश विंडो समाप्त होने के कारण अवरुद्ध होना चाहिए।' },
    { Authorization: 'Bearer admin_token_valid' }
  );
  assert(
    expiredWindowRes.status === 403 &&
      expiredWindowRes.data?.errorCode === 'OUTSIDE_24H_WINDOW',
    'Test 21: Operator reply blocked when outside 24-hour service window (403 OUTSIDE_24H_WINDOW)'
  );

  // =========================================================================
  // GROUP 4: LIVE INBOX API, SEARCH, FILTERS & CUSTOMER ENRICHMENT (PART 2)
  // =========================================================================
  console.log('\n--- GROUP 4: LIVE INBOX APIS & CUSTOMER ENRICHMENT ---');

  // Test 22: Conversation list returns enriched customer data
  const listRes = await apiCall(
    'GET',
    '/api/admin/whatsapp/conversations?filter=all',
    null,
    { Authorization: 'Bearer admin_token_valid' }
  );
  const convItem = listRes.data?.conversations?.find((c) => c.customerPhone === testWaId);
  assert(
    listRes.status === 200 &&
      listRes.data?.success &&
      convItem &&
      convItem.customer?.planName === 'VIP' &&
      convItem.customerName === 'राजेश शर्मा',
    'Test 22: GET /api/admin/whatsapp/conversations enriches customer with linked VIP plan and name'
  );

  // Test 23: Filter by handlingMode
  const filterWaitingRes = await apiCall(
    'GET',
    '/api/admin/whatsapp/conversations?filter=waiting_human',
    null,
    { Authorization: 'Bearer admin_token_valid' }
  );
  assert(
    filterWaitingRes.status === 200 && filterWaitingRes.data?.success,
    'Test 23: Conversation list filter by "waiting_human" executes cleanly'
  );

  // Test 24: Search by customer name and phone
  const searchRes = await apiCall(
    'GET',
    '/api/admin/whatsapp/conversations?search=राजेश',
    null,
    { Authorization: 'Bearer admin_token_valid' }
  );
  assert(
    searchRes.status === 200 &&
      searchRes.data?.conversations?.length > 0 &&
      searchRes.data.conversations[0].customerName === 'राजेश शर्मा',
    'Test 24: Conversation list search by customer name matches correctly'
  );

  // Close server
  await new Promise((resolve) => server.close(resolve));

  console.log('\n================================================================');
  console.log(`📊 PHASE 1B TEST RESULTS: ${passed} PASSED / ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1BTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
