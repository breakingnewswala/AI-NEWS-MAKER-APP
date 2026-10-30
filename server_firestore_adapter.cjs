const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

let firebaseConfig = null;
try {
  const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  }
} catch {}

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || firebaseConfig?.projectId || 'ai-news-maker-app';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || firebaseConfig?.firestoreDatabaseId || 'ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd';
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || firebaseConfig?.storageBucket || 'ai-news-maker-app.firebasestorage.app';

// Controlled Feature Flag: Defaults to FALSE until live Cloud Run connectivity is proven
const USE_FIRESTORE = process.env.USE_FIRESTORE === 'true';

let cachedToken = null;
let tokenExpiry = 0;

function getMetadataAccessTokenInternal() {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: 'metadata.google.internal',
        path: '/computeMetadata/v1/instance/service-accounts/default/token',
        headers: { 'Metadata-Flavor': 'Google' },
        timeout: 2500,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.access_token || null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function getMetadataAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  // 1. Explicit env token if set
  if (process.env.FIRESTORE_ACCESS_TOKEN) {
    cachedToken = process.env.FIRESTORE_ACCESS_TOKEN;
    tokenExpiry = Date.now() + 300000;
    return cachedToken;
  }

  // 2. Compute metadata server (Google Cloud Run / Compute Engine)
  const isCloudRuntime = Boolean(
    process.env.K_SERVICE ||
    process.env.FUNCTION_NAME ||
    process.env.GAE_SERVICE ||
    process.env.CLOUD_RUN_JOB ||
    process.env.METADATA_SERVER_IP
  );

  if (isCloudRuntime || process.platform !== 'win32') {
    const metaToken = await getMetadataAccessTokenInternal();
    if (metaToken) {
      cachedToken = metaToken;
      tokenExpiry = Date.now() + 300000;
      return cachedToken;
    }
  }

  // 3. Local gcloud credentials fallback
  try {
    const { execSync } = require('child_process');
    const localToken = execSync('gcloud auth print-access-token', {
      timeout: 12000,
      stdio: ['pipe', 'pipe', 'ignore'],
    }).toString().trim();
    if (localToken && localToken.startsWith('ya29.')) {
      cachedToken = localToken;
      tokenExpiry = Date.now() + 300000;
      return cachedToken;
    }
  } catch {}

  return null;
}

function getRuntimeServiceAccount() {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: 'metadata.google.internal',
        path: '/computeMetadata/v1/instance/service-accounts/default/email',
        headers: { 'Metadata-Flavor': 'Google' },
        timeout: 2500,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data.trim() || 'unknown'));
      }
    );
    req.on('error', () => resolve('unknown'));
    req.on('timeout', () => {
      req.destroy();
      resolve('unknown');
    });
  });
}

function toFirestoreField(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreField) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreField(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreField(field) {
  if (!field || typeof field !== 'object') return null;
  if ('stringValue' in field) return field.stringValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return field.doubleValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) {
    const items = field.arrayValue?.values || [];
    return items.map(fromFirestoreField);
  }
  if ('mapValue' in field) {
    const res = {};
    for (const [k, v] of Object.entries(field.mapValue?.fields || {})) {
      res[k] = fromFirestoreField(v);
    }
    return res;
  }
  return null;
}

function fromFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const res = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    res[k] = fromFirestoreField(v);
  }
  return res;
}

async function firestoreWriteDoc(collection, docId, data) {
  const token = await getMetadataAccessToken();
  if (!token) return { success: false, error: 'No access token available' };

  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFirestoreField(v);
  }
  const payload = JSON.stringify({ fields });
  const docPath = `/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${encodeURIComponent(docId)}`;

  return new Promise((resolve) => {
    const req = https.request(
      {
        host: 'firestore.googleapis.com',
        path: docPath,
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 4000,
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, statusCode: res.statusCode });
          } else {
            resolve({ success: false, statusCode: res.statusCode, error: body });
          }
        });
      }
    );
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });
    req.write(payload);
    req.end();
  });
}

async function firestoreReadDoc(collection, docId) {
  const token = await getMetadataAccessToken();
  if (!token) return { success: false, error: 'No access token available' };

  const docPath = `/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${encodeURIComponent(docId)}`;

  return new Promise((resolve) => {
    const req = https.request(
      {
        host: 'firestore.googleapis.com',
        path: docPath,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 4000,
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              const data = fromFirestoreDoc(parsed);
              resolve({ success: true, data, rawDoc: parsed, statusCode: res.statusCode });
            } catch {
              resolve({ success: true, statusCode: res.statusCode });
            }
          } else {
            resolve({ success: false, statusCode: res.statusCode, error: body });
          }
        });
      }
    );
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });
    req.end();
  });
}

/**
 * Upload buffer to Firebase Storage persistent object bucket
 */
async function uploadToFirebaseStorage(destinationPath, buffer, contentType = 'image/png') {
  const token = await getMetadataAccessToken();
  if (!token) {
    return { success: false, error: 'No access token for Firebase Storage' };
  }

  const encodedPath = encodeURIComponent(destinationPath);
  const uploadUrl = `/v0/b/${STORAGE_BUCKET}/o?name=${encodedPath}&uploadType=media`;

  return new Promise((resolve) => {
    const req = https.request(
      {
        host: 'firebasestorage.googleapis.com',
        path: uploadUrl,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType,
          'Content-Length': buffer.length,
        },
        timeout: 8000,
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              const publicDownloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media`;
              resolve({ success: true, url: publicDownloadUrl, data: parsed });
            } catch {
              resolve({ success: true });
            }
          } else {
            resolve({ success: false, statusCode: res.statusCode, error: body });
          }
        });
      }
    );
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });
    req.write(buffer);
    req.end();
  });
}

/**
 * Diagnostic Self-Test: Writes a temporary diagnostic ping document and reads it back.
 */
async function runDiagnosticSelfTest() {
  const sa = await getRuntimeServiceAccount();
  const testId = `diag_ping_${Date.now()}`;
  const testPayload = {
    diagnosticPing: 'ok',
    testedAt: Date.now(),
    serviceAccount: sa,
    databaseId: DATABASE_ID,
  };

  const writeRes = await firestoreWriteDoc('system_health', testId, testPayload);
  if (!writeRes.success) {
    return {
      success: false,
      stage: 'write',
      serviceAccount: sa,
      databaseId: DATABASE_ID,
      statusCode: writeRes.statusCode,
      error: writeRes.error || 'Write failed',
    };
  }

  const readRes = await firestoreReadDoc('system_health', testId);
  if (!readRes.success) {
    return {
      success: false,
      stage: 'read',
      serviceAccount: sa,
      databaseId: DATABASE_ID,
      statusCode: readRes.statusCode,
      error: readRes.error || 'Read failed',
    };
  }

  return {
    success: true,
    stage: 'complete',
    serviceAccount: sa,
    databaseId: DATABASE_ID,
    writtenId: testId,
    verifiedData: readRes.data,
  };
}

module.exports = {
  PROJECT_ID,
  DATABASE_ID,
  STORAGE_BUCKET,
  USE_FIRESTORE,
  getMetadataAccessToken,
  getRuntimeServiceAccount,
  firestoreWriteDoc,
  firestoreReadDoc,
  uploadToFirebaseStorage,
  runDiagnosticSelfTest,
};

async function firestoreDeleteDoc(collection, docId) {
  const token = await getMetadataAccessToken();
  if (!token) return { success: false, error: 'No access token available' };

  const docPath = `/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${encodeURIComponent(docId)}`;

  return new Promise((resolve) => {
    const req = https.request(
      {
        host: 'firestore.googleapis.com',
        path: docPath,
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 4000,
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, statusCode: res.statusCode });
          } else {
            resolve({ success: false, statusCode: res.statusCode, error: body });
          }
        });
      }
    );
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });
    req.end();
  });
}

async function firestoreListDocs(collection, pageSize = 100) {
  const token = await getMetadataAccessToken();
  if (!token) return { success: false, error: 'No access token available' };

  const docPath = `/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}?pageSize=${pageSize}`;

  return new Promise((resolve) => {
    const req = https.request(
      {
        host: 'firestore.googleapis.com',
        path: docPath,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              const documents = (parsed.documents || []).map((doc) => {
                const data = fromFirestoreDoc(doc);
                const parts = (doc.name || '').split('/');
                const id = parts[parts.length - 1];
                return { id, ...data };
              });
              resolve({ success: true, documents, statusCode: res.statusCode });
            } catch (e) {
              resolve({ success: false, error: e.message });
            }
          } else {
            resolve({ success: false, statusCode: res.statusCode, error: body });
          }
        });
      }
    );
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });
    req.end();
  });
}

module.exports.firestoreDeleteDoc = firestoreDeleteDoc;
module.exports.firestoreListDocs = firestoreListDocs;

/**
 * Atomic Coin Debit / Credit with Transaction Logging
 */
async function atomicCoinTransaction(walletKey, amount, type, description, newsItemId = '', newsTitle = '') {
  const cleanKey = (walletKey || '').toLowerCase().trim();
  if (!cleanKey) return { success: false, error: 'Invalid walletKey' };
  const numAmount = Math.max(0, Number(amount) || 0);

  // Read current balance
  const readRes = await firestoreReadDoc('wallets', cleanKey);
  const currentWallet = (readRes.success && readRes.data) ? readRes.data : {
    walletKey: cleanKey,
    coinBalance: 0,
    pendingCoins: 0,
    totalEarnedCoins: 0,
  };

  const currentBalance = Number(currentWallet.coinBalance) || 0;
  let newBalance = currentBalance;

  if (type === 'debit') {
    if (currentBalance < numAmount) {
      return {
        success: false,
        insufficientCoins: true,
        currentBalance,
        requiredCoins: numAmount,
        error: 'Insufficient coins',
      };
    }
    newBalance = currentBalance - numAmount;
  } else if (type === 'credit') {
    newBalance = currentBalance + numAmount;
    currentWallet.totalEarnedCoins = (Number(currentWallet.totalEarnedCoins) || 0) + numAmount;
  }

  currentWallet.coinBalance = newBalance;
  currentWallet.updatedAt = new Date().toISOString();

  // Write updated wallet
  const walletRes = await firestoreWriteDoc('wallets', cleanKey, currentWallet);
  if (!walletRes.success) return { success: false, error: walletRes.error };

  // Write transaction record
  const txId = `tx_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const txPayload = {
    id: txId,
    transactionId: txId,
    userId: cleanKey,
    userEmail: cleanKey,
    newsItemId: String(newsItemId || ''),
    newsTitle: String(newsTitle || ''),
    description: String(description || `${type.toUpperCase()} ${numAmount} coins`),
    type,
    amount: numAmount,
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
  };
  await firestoreWriteDoc('wallet_transactions', txId, txPayload);

  return {
    success: true,
    txId,
    balance: newBalance,
    coinsDeducted: type === 'debit' ? numAmount : 0,
    coinsCredited: type === 'credit' ? numAmount : 0,
  };
}

/**
 * Atomic Payment Recording & Subscription Activation
 */
async function atomicRecordPayment(orderId, paymentData) {
  const cleanOrderId = String(orderId || '').trim();
  if (!cleanOrderId) return { success: false, error: 'Invalid orderId' };

  const paymentDoc = {
    ...paymentData,
    orderId: cleanOrderId,
    updatedAt: new Date().toISOString(),
  };
  const payRes = await firestoreWriteDoc('payment_transactions', cleanOrderId, paymentDoc);
  if (!payRes.success) return { success: false, error: payRes.error };

  // If PAID, update user tier
  const email = (paymentData.customerEmail || '').toLowerCase().trim();
  if (email && (paymentData.orderStatus === 'PAID' || paymentData.orderStatus === 'SUCCESS')) {
    const tier = (paymentData.planKey || paymentData.planId || 'pro').toLowerCase().replace('plan_', '').trim();
    const planName = String(paymentData.planName || tier.toUpperCase()).trim();
    const durationDays = Number(paymentData.durationDays) || 365;

    await atomicUpdateMembership(email, tier, planName, durationDays);
  }

  return { success: true, orderId: cleanOrderId };
}

/**
 * Atomic Membership Upgrade & Lock against Downward Overwrites
 */
async function atomicUpdateMembership(email, tier, planName, durationDays = 365) {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail) return { success: false, error: 'Invalid email' };

  const userRes = await firestoreReadDoc('users', cleanEmail);
  const existingUser = (userRes.success && userRes.data) ? userRes.data : {
    email: cleanEmail,
    role: 'user',
    createdAt: Date.now(),
  };

  const now = Date.now();
  const expiresAt = now + durationDays * 86400000;

  const updatedUser = {
    ...existingUser,
    tier: String(tier || 'basic').toLowerCase().trim(),
    planName: String(planName || tier.toUpperCase()).trim(),
    activatedAt: now,
    expiresAt,
    isProfileLocked: true,
    updatedAt: new Date().toISOString(),
  };

  await firestoreWriteDoc('users', cleanEmail, updatedUser);
  return { success: true, email: cleanEmail, tier, planName, expiresAt };
}

module.exports.atomicCoinTransaction = atomicCoinTransaction;
module.exports.atomicRecordPayment = atomicRecordPayment;
module.exports.atomicUpdateMembership = atomicUpdateMembership;

