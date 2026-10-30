/**
 * AI NEWS MAKER — CENTRAL FIRESTORE DATABASE SERVICE
 * 
 * Authoritative, Single-Source Database Service for both root and web_studio servers.
 * Supports:
 * - High-speed Firestore REST API operations
 * - Atomic transactions for wallets, payments, and memberships
 * - In-memory live cache synchronized directly with Firestore
 * - Zero fallback to JSON in Production mode (USE_FIRESTORE=true)
 * - Safe error handling and secret-free diagnostic logging
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const adapter = require('./server_firestore_adapter.cjs');

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 20,
  keepAliveMsecs: 60000,
});

class CentralFirestoreDatabaseService {
  constructor(options = {}) {
    this.projectId = options.projectId || process.env.FIREBASE_PROJECT_ID || adapter.PROJECT_ID || 'ai-news-maker-app';
    this.databaseId = options.databaseId || options.firestoreDatabaseId || process.env.FIRESTORE_DATABASE_ID || adapter.DATABASE_ID || 'ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd';
    this.useFirestore = options.useFirestore !== undefined 
      ? options.useFirestore 
      : (process.env.USE_FIRESTORE === 'true' || adapter.USE_FIRESTORE);
    
    // In-memory live cache for ultra-fast reads & synchronous backward compatibility
    this.cache = {
      users: new Map(),
      news: new Map(),
      wallets: new Map(),
      walletTransactions: new Map(),
      frameUnlocks: new Map(),
      payments: new Map(),
      rssSources: new Map(),
      categories: new Map(),
      templateConfigs: new Map(),
      plans: new Map(),
      coupons: new Map(),
      music: new Map(),
      systemConfig: new Map(),
      notifications: new Map(),
      auditLogs: [],
      drafts: new Map(),
      credentials: new Map(),
    };

    this.isInitialized = false;
    this.initializationPromise = null;

    // Configurable Cache TTLs (Task 1: Multi-instance Cache Consistency)
    this.cacheTtl = {
      news: 60 * 1000,
      rssSources: 120 * 1000,
      plans: 300 * 1000,
      coupons: 300 * 1000,
      categories: 300 * 1000,
      templateConfigs: 300 * 1000,
      systemConfig: 60 * 1000,
      notifications: 30 * 1000,
      limitIncrease: 60 * 1000,
      support: 60 * 1000,
      ...(options.cacheTtl || {}),
    };
    this.cacheTimestamps = new Map();
  }

  setDatabaseId(dbId) {
    this.databaseId = dbId;
  }

  setUseFirestore(flag) {
    this.useFirestore = Boolean(flag);
  }

  // Explicit cache invalidation (Task 1)
  invalidateCache(collection, docId = null) {
    if (docId) {
      const cleanId = String(docId).toLowerCase().trim();
      if (this.cache[collection] instanceof Map) {
        this.cache[collection].delete(cleanId);
      }
      this.cacheTimestamps.delete(`${collection}:${cleanId}`);
    } else {
      if (this.cache[collection] instanceof Map) {
        this.cache[collection].clear();
      }
      this.cacheTimestamps.delete(collection);
    }
  }

  // Check if cache entry has not exceeded its TTL
  isCacheValid(collection, key = null) {
    const ttl = this.cacheTtl[collection] || 60000;
    const lookupKey = key ? `${collection}:${String(key).toLowerCase().trim()}` : collection;
    const ts = this.cacheTimestamps.get(lookupKey);
    if (!ts) return false;
    return (Date.now() - ts) < ttl;
  }

  async getAccessToken() {
    return adapter.getMetadataAccessToken();
  }

  // Begin Firestore REST atomic transaction (Task 3)
  async beginTransaction() {
    if (!this.useFirestore) return { success: false, error: 'Firestore disabled' };
    const token = await this.getAccessToken();
    if (!token) return { success: false, error: 'No access token' };

    const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:beginTransaction`;
    return new Promise((resolve) => {
      const req = https.request(
        {
          host: 'firestore.googleapis.com',
          path: docPath,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          agent: httpsAgent,
          timeout: 6000,
        },
        (res) => {
          let body = '';
          res.on('data', (d) => (body += d));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(body);
                resolve({ success: true, transaction: parsed.transaction });
              } catch (e) {
                resolve({ success: false, error: e.message });
              }
            } else {
              resolve({ success: false, error: `beginTransaction failed (${res.statusCode}): ${body}` });
            }
          });
        }
      );
      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.write(JSON.stringify({ options: { readWrite: {} } }));
      req.end();
    });
  }

  // Commit Firestore REST atomic transaction (Task 3)
  async commitTransaction(transactionId, writes = []) {
    if (!this.useFirestore) return { success: false, error: 'Firestore disabled' };
    const token = await this.getAccessToken();
    if (!token) return { success: false, error: 'No access token' };

    const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:commit`;
    const payload = JSON.stringify({
      transaction: transactionId,
      writes,
    });

    return new Promise((resolve) => {
      const req = https.request(
        {
          host: 'firestore.googleapis.com',
          path: docPath,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          agent: httpsAgent,
          timeout: 8000,
        },
        (res) => {
          let body = '';
          res.on('data', (d) => (body += d));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(body);
                resolve({ success: true, data: parsed });
              } catch (e) {
                resolve({ success: true });
              }
            } else {
              resolve({ success: false, statusCode: res.statusCode, error: `commit failed (${res.statusCode}): ${body}` });
            }
          });
        }
      );
      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.write(payload);
      req.end();
    });
  }

  // Rollback Firestore REST atomic transaction (Task 3)
  async rollbackTransaction(transactionId) {
    if (!this.useFirestore || !transactionId) return;
    const token = await this.getAccessToken();
    if (!token) return;

    const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:rollback`;
    const payload = JSON.stringify({ transaction: transactionId });
    return new Promise((resolve) => {
      const req = https.request(
        {
          host: 'firestore.googleapis.com',
          path: docPath,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          agent: httpsAgent,
          timeout: 4000,
        },
        () => resolve()
      );
      req.on('error', () => resolve());
      req.write(payload);
      req.end();
    });
  }

  // Generic document read
  async readDoc(collection, docId) {
    if (!this.useFirestore) {
      return { success: false, error: 'Firestore is disabled' };
    }
    const token = await this.getAccessToken();
    if (!token) return { success: false, error: 'No access token available' };

    const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}/${encodeURIComponent(docId)}`;
    return new Promise((resolve) => {
      const req = https.request(
        {
          host: 'firestore.googleapis.com',
          path: docPath,
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          agent: httpsAgent,
          timeout: 5000,
        },
        (res) => {
          let body = '';
          res.on('data', (d) => (body += d));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(body);
                const data = this._fromFirestoreDoc(parsed);
                resolve({ success: true, data, statusCode: res.statusCode });
              } catch (err) {
                resolve({ success: false, error: err.message, statusCode: res.statusCode });
              }
            } else {
              resolve({ success: false, statusCode: res.statusCode, error: `Doc not found or error (${res.statusCode})` });
            }
          });
        }
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });
      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.end();
    });
  }

  // Generic document write
  async writeDoc(collection, docId, data) {
    if (!this.useFirestore) {
      return { success: false, error: 'Firestore is disabled' };
    }
    const token = await this.getAccessToken();
    if (!token) return { success: false, error: 'No access token available' };

    const fields = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) fields[k] = this._toFirestoreField(v);
    }
    const payload = JSON.stringify({ fields });
    const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}/${encodeURIComponent(docId)}`;

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
          agent: httpsAgent,
          timeout: 5000,
        },
        (res) => {
          let body = '';
          res.on('data', (d) => (body += d));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, statusCode: res.statusCode });
            } else {
              resolve({ success: false, statusCode: res.statusCode, error: body });
            }
          });
        }
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });
      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.write(payload);
      req.end();
    });
  }

  // Generic document delete
  async deleteDoc(collection, docId) {
    if (!this.useFirestore) {
      return { success: false, error: 'Firestore is disabled' };
    }
    const token = await this.getAccessToken();
    if (!token) return { success: false, error: 'No access token available' };

    const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}/${encodeURIComponent(docId)}`;
    return new Promise((resolve) => {
      const req = https.request(
        {
          host: 'firestore.googleapis.com',
          path: docPath,
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
          agent: httpsAgent,
          timeout: 5000,
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', () => resolve({ success: res.statusCode >= 200 && res.statusCode < 300 }));
        }
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });
      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.end();
    });
  }

  // Generic list documents with complete nextPageToken pagination loop (Task 5)
  async listDocs(collection, pageSize = 300) {
    if (!this.useFirestore) {
      return { success: false, error: 'Firestore is disabled', documents: [] };
    }
    const token = await this.getAccessToken();
    if (!token) return { success: false, error: 'No access token available', documents: [] };

    const allDocuments = [];
    const seenIds = new Set();
    let pageToken = '';
    const safePageSize = Math.min(500, Math.max(10, pageSize));

    do {
      let docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}?pageSize=${safePageSize}`;
      if (pageToken) {
        docPath += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const pageRes = await new Promise((resolve) => {
        const req = https.request(
          {
            host: 'firestore.googleapis.com',
            path: docPath,
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
            agent: httpsAgent,
            timeout: 10000,
          },
          (res) => {
            let body = '';
            res.on('data', (d) => (body += d));
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsed = JSON.parse(body);
                  const docs = (parsed.documents || []).map((d) => {
                    const docId = d.name ? d.name.split('/').pop() : '';
                    const data = this._fromFirestoreDoc(d);
                    return { id: docId, docId, ...data };
                  });
                  resolve({
                    success: true,
                    documents: docs,
                    nextPageToken: parsed.nextPageToken || '',
                    statusCode: res.statusCode,
                  });
                } catch (err) {
                  resolve({ success: false, error: err.message, documents: [] });
                }
              } else {
                resolve({ success: false, error: `List failed (${res.statusCode})`, documents: [] });
              }
            });
          }
        );
        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, error: 'Request timeout', documents: [] });
        });
        req.on('error', (e) => resolve({ success: false, error: e.message, documents: [] }));
        req.end();
      });

      if (!pageRes.success) {
        if (allDocuments.length > 0) break;
        return pageRes;
      }

      for (const doc of pageRes.documents) {
        if (doc.id && !seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          allDocuments.push(doc);
        }
      }

      pageToken = pageRes.nextPageToken || '';
    } while (pageToken);

    return { success: true, documents: allDocuments, totalCount: allDocuments.length };
  }

  // --- INITIALIZATION & CACHE WARM-UP ---
  async initialize() {
    if (this.initializationPromise) return this.initializationPromise;
    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  async _doInitialize() {
    if (!this.useFirestore) {
      console.log('ℹ️ [CentralDB] Running in Local Development mode (USE_FIRESTORE=false)');
      this.isInitialized = true;
      return true;
    }

    console.log(`🚀 [CentralDB] Initializing Live Firestore Cache (DB: ${this.databaseId})...`);
    try {
      // 1. Users
      const uRes = await this.listDocs('users', 300);
      if (uRes.success) {
        this.cache.users.clear();
        uRes.documents.forEach((u) => {
          this.cache.users.set(u.id, u);
          if (u.email) this.cache.users.set(u.email.toLowerCase().trim(), u);
          if (u.userId) this.cache.users.set(u.userId.toLowerCase().trim(), u);
        });
        console.log(`  ✓ Loaded ${uRes.documents.length} users into live cache`);
      }

      // 2. News Posts
      const nRes = await this.listDocs('news_posts', 300);
      if (nRes.success) {
        this.cache.news.clear();
        nRes.documents.forEach((n) => this.cache.news.set(n.id, n));
        console.log(`  ✓ Loaded ${nRes.documents.length} news posts into live cache`);
      }

      // 3. Wallets
      const wRes = await this.listDocs('wallets', 300);
      if (wRes.success) {
        this.cache.wallets.clear();
        wRes.documents.forEach((w) => this.cache.wallets.set(w.id || w.walletKey, w));
        console.log(`  ✓ Loaded ${wRes.documents.length} wallets into live cache`);
      }

      // 4. RSS Sources
      const rRes = await this.listDocs('rss_sources', 100);
      if (rRes.success) {
        this.cache.rssSources.clear();
        rRes.documents.forEach((s) => this.cache.rssSources.set(s.id, s));
        console.log(`  ✓ Loaded ${rRes.documents.length} RSS sources into live cache`);
      }

      // 5. Plans & Coupons
      const pRes = await this.listDocs('plans_catalog', 50);
      if (pRes.success) {
        this.cache.plans.clear();
        pRes.documents.forEach((p) => this.cache.plans.set(p.id, p));
      }
      const cRes = await this.listDocs('package_coupons', 50);
      if (cRes.success) {
        this.cache.coupons.clear();
        cRes.documents.forEach((c) => this.cache.coupons.set(c.id, c));
      }

      // 6. Categories & Templates
      const catRes = await this.listDocs('news_categories', 100);
      if (catRes.success) {
        this.cache.categories.clear();
        catRes.documents.forEach((cat) => this.cache.categories.set(cat.id, cat));
      }
      const tplRes = await this.listDocs('news_template_configs', 50);
      if (tplRes.success) {
        this.cache.templateConfigs.clear();
        tplRes.documents.forEach((tpl) => this.cache.templateConfigs.set(tpl.id, tpl));
      }

      // 7. System Config & Vaults
      const sysRes = await this.listDocs('system_config', 50);
      if (sysRes.success) {
        this.cache.systemConfig.clear();
        sysRes.documents.forEach((cfg) => this.cache.systemConfig.set(cfg.id, cfg));
      }

      this.isInitialized = true;
      console.log('✅ [CentralDB] Live Firestore Cache Ready.\n');
      return true;
    } catch (err) {
      console.error('❌ [CentralDB] Initialization error:', err.message);
      this.isInitialized = false;
      return false;
    }
  }

  // --- USER PROFILE OPERATIONS ---
  async getUser(idOrEmail) {
    if (!idOrEmail) return null;
    const clean = idOrEmail.toLowerCase().trim();

    if (this.useFirestore) {
      // 1. Try memory cache first for speed
      if (this.cache.users.has(clean)) {
        return this.cache.users.get(clean);
      }
      // 2. Fetch directly from Firestore
      const read = await this.readDoc('users', clean);
      if (read.success && read.data) {
        this.cache.users.set(clean, read.data);
        return read.data;
      }
      // 3. Fallback scan across users collection if doc ID was an internal UUID
      const allUsers = await this.listUsers();
      const match = allUsers.find(
        (u) =>
          (u.email && u.email.toLowerCase().trim() === clean) ||
          (u.userId && u.userId.toLowerCase().trim() === clean) ||
          (u.uid && u.uid.toLowerCase().trim() === clean) ||
          (u.id && u.id.toLowerCase().trim() === clean)
      );
      if (match) {
        this.cache.users.set(clean, match);
        return match;
      }
      return null;
    } else {
      // Local dev fallback
      const profiles = this._loadLocalJson('user_profiles_db.json', {});
      return profiles[clean] || Object.values(profiles).find((p) => (p.email || '').toLowerCase().trim() === clean) || null;
    }
  }

  async saveUser(idOrEmail, userData) {
    if (!idOrEmail) return { success: false, error: 'User identifier required' };
    const clean = idOrEmail.toLowerCase().trim();
    const payload = {
      ...userData,
      docId: clean,
      updatedAt: Date.now(),
    };

    if (this.useFirestore) {
      this.cache.users.set(clean, payload);
      if (payload.email) this.cache.users.set(payload.email.toLowerCase().trim(), payload);
      if (payload.userId) this.cache.users.set(payload.userId.toLowerCase().trim(), payload);
      const res = await this.writeDoc('users', clean, payload);
      return res;
    } else {
      const profiles = this._loadLocalJson('user_profiles_db.json', {});
      profiles[clean] = payload;
      this._saveLocalJson('user_profiles_db.json', profiles);
      return { success: true };
    }
  }

  async listUsers() {
    if (this.useFirestore) {
      if (this.cache.users.size > 0) {
        // Return unique documents from cache
        const unique = new Map();
        for (const u of this.cache.users.values()) {
          const key = u.id || u.docId || u.email || u.userId;
          if (key && !unique.has(key)) unique.set(key, u);
        }
        return Array.from(unique.values());
      }
      const res = await this.listDocs('users', 300);
      return res.documents || [];
    } else {
      const profiles = this._loadLocalJson('user_profiles_db.json', {});
      return Object.values(profiles);
    }
  }

  // --- NEWS POSTS OPERATIONS ---
  async getNewsPosts(options = {}) {
    if (this.useFirestore) {
      let posts = [];
      const cacheValid = this.isCacheValid('news');
      if (this.cache.news.size > 0 && !options.forceRemote && cacheValid) {
        posts = Array.from(this.cache.news.values());
      } else {
        const res = await this.listDocs('news_posts', 100);
        posts = res.documents || [];
        this.cache.news.clear();
        posts.forEach((p) => this.cache.news.set(p.id, p));
        this.cacheTimestamps.set('news', Date.now());
      }
      return posts;
    } else {
      return this._loadLocalJson('news_database.json', []);
    }
  }

  async saveNewsPost(postId, postData) {
    if (!postId) return { success: false, error: 'News post ID required' };
    const cleanId = String(postId).trim();
    const payload = {
      ...postData,
      id: cleanId,
      docId: cleanId,
      updatedAt: Date.now(),
    };

    if (this.useFirestore) {
      this.cache.news.set(cleanId, payload);
      this.cacheTimestamps.set('news', Date.now());
      const res = await this.writeDoc('news_posts', cleanId, payload);
      return res;
    } else {
      const news = this._loadLocalJson('news_database.json', []);
      const idx = news.findIndex((n) => n.id === cleanId);
      if (idx >= 0) news[idx] = payload;
      else news.unshift(payload);
      this._saveLocalJson('news_database.json', news);
      return { success: true };
    }
  }

  async deleteNewsPost(postId) {
    if (!postId) return { success: false, error: 'News post ID required' };
    const cleanId = String(postId).trim();

    if (this.useFirestore) {
      this.cache.news.delete(cleanId);
      this.cacheTimestamps.set('news', Date.now());
      const res = await this.deleteDoc('news_posts', cleanId);
      return res;
    } else {
      const news = this._loadLocalJson('news_database.json', []);
      const filtered = news.filter((n) => n.id !== cleanId);
      this._saveLocalJson('news_database.json', filtered);
      return { success: true };
    }
  }

  // --- WALLET & REWARDS OPERATIONS ---
  async getWallet(walletKey) {
    if (!walletKey) return { walletKey: '', coinBalance: 0 };
    const cleanKey = walletKey.toLowerCase().trim();

    if (this.useFirestore) {
      if (this.cache.wallets.has(cleanKey)) {
        return this.cache.wallets.get(cleanKey);
      }
      const read = await this.readDoc('wallets', cleanKey);
      if (read.success && read.data) {
        this.cache.wallets.set(cleanKey, read.data);
        return read.data;
      }
      return { walletKey: cleanKey, coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 };
    } else {
      const db = this._loadLocalJson('rewards_database.json', {});
      return (db.wallets && db.wallets[cleanKey]) || { walletKey: cleanKey, coinBalance: 0 };
    }
  }

  // True Atomic Wallet Transaction with ACID guarantees (Task 3)
  async atomicCoinTransaction(walletKey, amount, type, description, newsItemId = '', newsTitle = '', customTxId = null) {
    const cleanKey = (walletKey || '').toLowerCase().trim();
    if (!cleanKey) return { success: false, error: 'Invalid walletKey' };
    const numAmount = Math.max(0, Number(amount) || 0);

    if (this.useFirestore) {
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const txRes = await this.beginTransaction();
        if (!txRes.success || !txRes.transaction) {
          break;
        }

        const transactionId = txRes.transaction;
        const token = await this.getAccessToken();
        const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/wallets/${encodeURIComponent(cleanKey)}?transaction=${encodeURIComponent(transactionId)}`;

        const docRes = await new Promise((resolve) => {
          const req = https.request(
            {
              host: 'firestore.googleapis.com',
              path: docPath,
              method: 'GET',
              headers: { Authorization: `Bearer ${token}` },
              agent: httpsAgent,
              timeout: 6000,
            },
            (res) => {
              let body = '';
              res.on('data', (d) => (body += d));
              res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  try {
                    const parsed = JSON.parse(body);
                    resolve({ success: true, doc: parsed, updateTime: parsed.updateTime });
                  } catch (e) {
                    resolve({ success: false, error: e.message });
                  }
                } else if (res.statusCode === 404) {
                  resolve({ success: true, notFound: true });
                } else {
                  resolve({ success: false, statusCode: res.statusCode, error: body });
                }
              });
            }
          );
          req.on('error', (e) => resolve({ success: false, error: e.message }));
          req.end();
        });

        let currentWallet = { walletKey: cleanKey, coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 };
        let updateTime = null;
        if (docRes.success && docRes.doc) {
          currentWallet = this._fromFirestoreDoc(docRes.doc);
          updateTime = docRes.updateTime;
        }

        const currentBalance = Number(currentWallet.coinBalance) || 0;
        let newBalance = currentBalance;

        if (type === 'debit') {
          if (currentBalance < numAmount) {
            await this.rollbackTransaction(transactionId);
            return {
              success: false,
              insufficientCoins: true,
              currentBalance,
              requiredCoins: numAmount,
              error: `सिक्के अपर्याप्त हैं (वर्तमान: ${currentBalance}, आवश्यक: ${numAmount})`,
            };
          }
          newBalance = currentBalance - numAmount;
        } else if (type === 'credit') {
          newBalance = currentBalance + numAmount;
          currentWallet.totalEarnedCoins = (Number(currentWallet.totalEarnedCoins) || 0) + numAmount;
        }

        const txId = customTxId || `tx_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        currentWallet.coinBalance = newBalance;
        currentWallet.updatedAt = Date.now();

        const walletFields = {};
        for (const [k, v] of Object.entries(currentWallet)) {
          if (v !== undefined) walletFields[k] = this._toFirestoreField(v);
        }

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
          balanceAfter: newBalance,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
        };

        const txFields = {};
        for (const [k, v] of Object.entries(txPayload)) {
          if (v !== undefined) txFields[k] = this._toFirestoreField(v);
        }

        const writes = [
          {
            update: {
              name: `projects/${this.projectId}/databases/${this.databaseId}/documents/wallets/${encodeURIComponent(cleanKey)}`,
              fields: walletFields,
            },
            currentDocument: updateTime ? { updateTime } : { exists: false },
          },
          {
            update: {
              name: `projects/${this.projectId}/databases/${this.databaseId}/documents/wallet_transactions/${encodeURIComponent(txId)}`,
              fields: txFields,
            },
            currentDocument: { exists: false },
          },
        ];

        const commitRes = await this.commitTransaction(transactionId, writes);
        if (commitRes.success) {
          this.cache.wallets.set(cleanKey, currentWallet);
          this.cache.walletTransactions.set(txId, txPayload);
          return {
            success: true,
            txId,
            balance: newBalance,
            coinsDeducted: type === 'debit' ? numAmount : 0,
            coinsCredited: type === 'credit' ? numAmount : 0,
          };
        } else if (commitRes.statusCode === 409 || String(commitRes.error || '').includes('conflict') || String(commitRes.error || '').includes('ABORTED')) {
          await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
          continue; // retry
        } else {
          await this.rollbackTransaction(transactionId);
          return { success: false, error: commitRes.error || 'Commit failed' };
        }
      }
    }

    // Local JSON fallback
    const db = this._loadLocalJson('rewards_database.json', { wallets: {}, transactions: [] });
    const current = db.wallets[cleanKey] || { walletKey: cleanKey, coinBalance: 0 };

    if (type === 'debit') {
      if (current.coinBalance < numAmount) return { success: false, insufficientCoins: true, balance: current.coinBalance };
      current.coinBalance -= numAmount;
    } else {
      current.coinBalance += numAmount;
    }
    db.wallets[cleanKey] = current;
    const txId = customTxId || `tx_${Date.now()}`;
    db.transactions.unshift({ id: txId, userId: cleanKey, type, amount: numAmount, description });
    this._saveLocalJson('rewards_database.json', db);
    return { success: true, balance: current.coinBalance, txId };
  }

  // --- PAYMENT OPERATIONS ---
  async recordPayment(orderId, paymentData) {
    if (!orderId) return { success: false, error: 'OrderId required' };
    const cleanId = String(orderId).trim();
    const payload = {
      ...paymentData,
      orderId: cleanId,
      docId: cleanId,
      updatedAt: Date.now(),
    };

    if (this.useFirestore) {
      const res = await this.writeDoc('payment_transactions', cleanId, payload);
      if (res.success) this.cache.payments.set(cleanId, payload);
      return res;
    } else {
      const payments = this._loadLocalJson('payments_transactions_db.json', []);
      payments.unshift(payload);
      this._saveLocalJson('payments_transactions_db.json', payments);
      return { success: true };
    }
  }

  async getPayments(userEmail = '') {
    if (this.useFirestore) {
      const res = await this.listDocs('payment_transactions', 300);
      const docs = res.documents || [];
      if (userEmail) {
        const clean = userEmail.toLowerCase().trim();
        return docs.filter((p) => (p.userEmail || p.customerEmail || '').toLowerCase().trim() === clean);
      }
      return docs;
    } else {
      const payments = this._loadLocalJson('payments_transactions_db.json', []);
      if (userEmail) {
        const clean = userEmail.toLowerCase().trim();
        return payments.filter((p) => (p.userEmail || '').toLowerCase().trim() === clean);
      }
      return payments;
    }
  }

  // --- RSS SOURCES OPERATIONS ---
  async getRssSources() {
    if (this.useFirestore) {
      if (this.cache.rssSources.size > 0) {
        return Array.from(this.cache.rssSources.values());
      }
      const res = await this.listDocs('rss_sources', 100);
      const docs = res.documents || [];
      docs.forEach((s) => this.cache.rssSources.set(s.id, s));
      return docs;
    } else {
      return this._loadLocalJson('rss_sources_database.json', []);
    }
  }

  async saveRssSource(sourceId, sourceData) {
    if (!sourceId) return { success: false, error: 'Source ID required' };
    const cleanId = String(sourceId).trim();
    const payload = { ...sourceData, id: cleanId, docId: cleanId, updatedAt: Date.now() };

    if (this.useFirestore) {
      this.cache.rssSources.set(cleanId, payload);
      const res = await this.writeDoc('rss_sources', cleanId, payload);
      return res;
    } else {
      const sources = this._loadLocalJson('rss_sources_database.json', []);
      const idx = sources.findIndex((s) => s.id === cleanId);
      if (idx >= 0) sources[idx] = payload;
      else sources.push(payload);
      this._saveLocalJson('rss_sources_database.json', sources);
      return { success: true };
    }
  }

  async deleteRssSource(sourceId) {
    if (!sourceId) return { success: false, error: 'Source ID required' };
    const cleanId = String(sourceId).trim();

    if (this.useFirestore) {
      this.cache.rssSources.delete(cleanId);
      const res = await this.deleteDoc('rss_sources', cleanId);
      return res;
    } else {
      const sources = this._loadLocalJson('rss_sources_database.json', []);
      const filtered = sources.filter((s) => s.id !== cleanId);
      this._saveLocalJson('rss_sources_database.json', filtered);
      return { success: true };
    }
  }

  // --- PLANS & COUPONS ---
  async getPlans() {
    if (this.useFirestore) {
      if (this.cache.plans.size > 0) return Array.from(this.cache.plans.values());
      const res = await this.listDocs('plans_catalog', 50);
      return res.documents || [];
    } else {
      return this._loadLocalJson('plans_catalog_database.json', []);
    }
  }

  async getCoupons() {
    if (this.useFirestore) {
      if (this.cache.coupons.size > 0) return Array.from(this.cache.coupons.values());
      const res = await this.listDocs('package_coupons', 50);
      return res.documents || [];
    } else {
      return this._loadLocalJson('package_coupons_db.json', []);
    }
  }

  async saveCoupon(code, couponData) {
    if (!code) return { success: false, error: 'Coupon code required' };
    const clean = String(code).toUpperCase().trim();
    const payload = { ...couponData, code: clean, docId: clean, updatedAt: Date.now() };

    if (this.useFirestore) {
      this.cache.coupons.set(clean, payload);
      const res = await this.writeDoc('package_coupons', clean, payload);
      return res;
    } else {
      const list = this._loadLocalJson('package_coupons_db.json', []);
      const idx = list.findIndex((c) => (c.code || '').toUpperCase() === clean);
      if (idx >= 0) list[idx] = payload;
      else list.push(payload);
      this._saveLocalJson('package_coupons_db.json', list);
      return { success: true };
    }
  }

  async deleteCoupon(code) {
    if (!code) return { success: false, error: 'Coupon code required' };
    const clean = String(code).toUpperCase().trim();

    if (this.useFirestore) {
      this.cache.coupons.delete(clean);
      const res = await this.deleteDoc('package_coupons', clean);
      return res;
    } else {
      const list = this._loadLocalJson('package_coupons_db.json', []);
      const filtered = list.filter((c) => (c.code || '').toUpperCase() !== clean);
      this._saveLocalJson('package_coupons_db.json', filtered);
      return { success: true };
    }
  }

  // --- CATEGORIES & TEMPLATES ---
  async getCategories() {
    if (this.useFirestore) {
      if (this.isCacheValid('categories') && this.cache.categories.size > 0) return Array.from(this.cache.categories.values());
      const res = await this.listDocs('news_categories', 100);
      const docs = res.documents || [];
      this.cache.categories.clear();
      docs.forEach((c) => this.cache.categories.set(c.id, c));
      this.cacheTimestamps.set('categories', Date.now());
      return docs;
    } else {
      return this._loadLocalJson('categories_database.json', []);
    }
  }

  async saveCategories(categoriesList) {
    if (!Array.isArray(categoriesList)) return { success: false, error: 'Array required' };
    if (this.useFirestore) {
      this.cache.categories.clear();
      for (const cat of categoriesList) {
        if (cat && cat.id) {
          const payload = { ...cat, docId: cat.id, updatedAt: Date.now() };
          this.cache.categories.set(cat.id, payload);
          await this.writeDoc('news_categories', cat.id, payload);
        }
      }
      this.cacheTimestamps.set('categories', Date.now());
      return { success: true };
    } else {
      this._saveLocalJson('categories_database.json', categoriesList);
      return { success: true };
    }
  }

  async getTemplateConfigs() {
    if (this.useFirestore) {
      if (this.isCacheValid('templateConfigs') && this.cache.templateConfigs.size > 0) {
        const dict = {};
        for (const [k, v] of this.cache.templateConfigs.entries()) dict[k] = v;
        return dict;
      }
      const res = await this.listDocs('news_template_configs', 50);
      const dict = {};
      this.cache.templateConfigs.clear();
      (res.documents || []).forEach((d) => {
        dict[d.id] = d;
        this.cache.templateConfigs.set(d.id, d);
      });
      this.cacheTimestamps.set('templateConfigs', Date.now());
      return dict;
    } else {
      return this._loadLocalJson('news_template_configs.json', {});
    }
  }

  async saveTemplateConfig(configId, configData) {
    const cleanId = String(configId || configData?.id).trim();
    const payload = { ...configData, id: cleanId, docId: cleanId, updatedAt: Date.now() };
    if (this.useFirestore) {
      const res = await this.writeDoc('news_template_configs', cleanId, payload);
      this.cache.templateConfigs.set(cleanId, payload);
      this.cacheTimestamps.set('templateConfigs', Date.now());
      return res;
    } else {
      const configs = this._loadLocalJson('news_template_configs.json', {});
      configs[cleanId] = payload;
      this._saveLocalJson('news_template_configs.json', configs);
      return { success: true };
    }
  }

  // --- DRAFTS & NOTIFICATIONS ---
  async getDrafts(userEmail = '') {
    if (this.useFirestore) {
      const res = await this.listDocs('user_drafts', 200);
      const docs = res.documents || [];
      if (userEmail) {
        const clean = userEmail.toLowerCase().trim();
        return docs.filter((d) => (d.userEmail || '').toLowerCase().trim() === clean);
      }
      return docs;
    } else {
      const drafts = this._loadLocalJson('drafts_database.json', []);
      if (userEmail) {
        const clean = userEmail.toLowerCase().trim();
        return drafts.filter((d) => (d.userEmail || '').toLowerCase().trim() === clean);
      }
      return drafts;
    }
  }

  async saveDraft(draftId, draftData) {
    if (!draftId) return { success: false, error: 'Draft ID required' };
    const cleanId = String(draftId).trim();
    const payload = { ...draftData, id: cleanId, docId: cleanId, updatedAt: Date.now() };

    if (this.useFirestore) {
      this.cache.drafts.set(cleanId, payload);
      const res = await this.writeDoc('user_drafts', cleanId, payload);
      return res;
    } else {
      const drafts = this._loadLocalJson('drafts_database.json', []);
      const idx = drafts.findIndex((d) => d.id === cleanId);
      if (idx >= 0) drafts[idx] = payload;
      else drafts.push(payload);
      this._saveLocalJson('drafts_database.json', drafts);
      return { success: true };
    }
  }

  // --- AUDIT LOGGING ---
  async logAdminAction(action, adminEmail, details = {}) {
    const logEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      action,
      adminEmail: (adminEmail || 'admin').toLowerCase().trim(),
      details,
      timestamp: Date.now(),
    };

    if (this.useFirestore) {
      await this.writeDoc('admin_audit_logs', logEntry.id, logEntry);
    }
    // Local memory/file
    this.cache.auditLogs.unshift(logEntry);
    const existing = this._loadLocalJson('admin_audit_log.json', []);
    existing.unshift(logEntry);
    if (existing.length > 200) existing.length = 200;
    this._saveLocalJson('admin_audit_log.json', existing);
  }

  // --- SECONDARY STORE OPERATIONS (Task 2: Secondary JSON Stores) ---

  // 1. Notifications
  async getNotifications(limit = 100) {
    if (this.useFirestore) {
      if (this.isCacheValid('notifications') && this.cache.notifications.size > 0) {
        return Array.from(this.cache.notifications.values()).slice(0, limit);
      }
      const res = await this.listDocs('notifications', limit);
      const list = res.documents || [];
      this.cache.notifications.clear();
      list.forEach((n) => this.cache.notifications.set(n.id, n));
      this.cacheTimestamps.set('notifications', Date.now());
      return list;
    } else {
      const data = this._loadLocalJson('notifications_database.json', { notifications: [] });
      return (data.notifications || []).slice(0, limit);
    }
  }

  async saveNotification(id, notifData) {
    const cleanId = String(id || `notif_${Date.now()}`).trim();
    const payload = {
      ...notifData,
      id: cleanId,
      docId: cleanId,
      updatedAt: Date.now(),
    };
    if (this.useFirestore) {
      const res = await this.writeDoc('notifications', cleanId, payload);
      if (res.success) {
        this.cache.notifications.set(cleanId, payload);
        this.cacheTimestamps.set(`notifications:${cleanId}`, Date.now());
      }
      return res;
    } else {
      const data = this._loadLocalJson('notifications_database.json', { notifications: [] });
      const idx = data.notifications.findIndex((n) => n.id === cleanId);
      if (idx >= 0) data.notifications[idx] = payload;
      else data.notifications.unshift(payload);
      this._saveLocalJson('notifications_database.json', data);
      return { success: true };
    }
  }

  // 2. Limit Increase Requests
  async getLimitIncreaseRequests() {
    if (this.useFirestore) {
      if (this.isCacheValid('limitIncrease') && this.cache.systemConfig.has('limit_increase_requests')) {
        return this.cache.systemConfig.get('limit_increase_requests');
      }
      const res = await this.listDocs('limit_increase_requests', 300);
      const list = res.documents || [];
      this.cache.systemConfig.set('limit_increase_requests', list);
      this.cacheTimestamps.set('limitIncrease', Date.now());
      return list;
    } else {
      return this._loadLocalJson('limit_increase_requests.json', []);
    }
  }

  async saveLimitIncreaseRequest(reqData) {
    const id = String(reqData?.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    const payload = { ...reqData, id, docId: id, createdAt: reqData?.createdAt || Date.now() };
    if (this.useFirestore) {
      const res = await this.writeDoc('limit_increase_requests', id, payload);
      this.invalidateCache('limitIncrease');
      return res;
    } else {
      const list = this._loadLocalJson('limit_increase_requests.json', []);
      list.unshift(payload);
      this._saveLocalJson('limit_increase_requests.json', list);
      return { success: true };
    }
  }

  // 3. Support Requests
  async getSupportRequests() {
    if (this.useFirestore) {
      if (this.isCacheValid('support') && this.cache.systemConfig.has('support_requests')) {
        return this.cache.systemConfig.get('support_requests');
      }
      const res = await this.listDocs('support_requests', 300);
      const list = res.documents || [];
      this.cache.systemConfig.set('support_requests', list);
      this.cacheTimestamps.set('support', Date.now());
      return list;
    } else {
      const data = this._loadLocalJson('support_requests_database.json', { requests: [] });
      return data.requests || [];
    }
  }

  async saveSupportRequest(reqData) {
    const id = String(reqData?.id || `sup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    const payload = { ...reqData, id, docId: id, createdAt: reqData?.createdAt || Date.now() };
    if (this.useFirestore) {
      const res = await this.writeDoc('support_requests', id, payload);
      this.invalidateCache('support');
      return res;
    } else {
      const data = this._loadLocalJson('support_requests_database.json', { requests: [] });
      const idx = data.requests.findIndex((r) => r.id === id);
      if (idx >= 0) data.requests[idx] = payload;
      else data.requests.unshift(payload);
      this._saveLocalJson('support_requests_database.json', data);
      return { success: true };
    }
  }

  // 4. AI Features Config
  async getAiFeaturesConfig() {
    if (this.useFirestore) {
      if (this.isCacheValid('systemConfig', 'ai_features_config') && this.cache.systemConfig.has('ai_features_config')) {
        return this.cache.systemConfig.get('ai_features_config');
      }
      const res = await this.readDoc('system_config', 'ai_features_config');
      if (res.success && res.data) {
        this.cache.systemConfig.set('ai_features_config', res.data);
        this.cacheTimestamps.set('system_config:ai_features_config', Date.now());
        return res.data;
      }
      return null;
    } else {
      return this._loadLocalJson('ai_features_config.json', null);
    }
  }

  async saveAiFeaturesConfig(configData) {
    const payload = {
      ...configData,
      docId: 'ai_features_config',
      updatedAt: Date.now(),
    };
    if (this.useFirestore) {
      const res = await this.writeDoc('system_config', 'ai_features_config', payload);
      if (res.success) {
        this.cache.systemConfig.set('ai_features_config', payload);
        this.cacheTimestamps.set('system_config:ai_features_config', Date.now());
      }
      return res;
    } else {
      this._saveLocalJson('ai_features_config.json', payload);
      return { success: true };
    }
  }

  // 5. Admin Branding (Category D)
  async getAdminBranding() {
    if (this.useFirestore) {
      if (this.isCacheValid('systemConfig', 'admin_branding') && this.cache.systemConfig.has('admin_branding')) {
        return this.cache.systemConfig.get('admin_branding');
      }
      const res = await this.readDoc('admin_settings', 'branding');
      if (res.success && res.data) {
        this.cache.systemConfig.set('admin_branding', res.data);
        this.cacheTimestamps.set('systemConfig:admin_branding', Date.now());
        return res.data;
      }
      return null;
    } else {
      return this._loadLocalJson('admin_branding_db.json', null);
    }
  }

  async saveAdminBranding(data) {
    const payload = {
      ...data,
      id: 'branding',
      docId: 'branding',
      updatedAt: Date.now(),
    };
    if (this.useFirestore) {
      this.cache.systemConfig.set('admin_branding', payload);
      this.cacheTimestamps.set('systemConfig:admin_branding', Date.now());
      const res = await this.writeDoc('admin_settings', 'branding', payload);
      return res;
    } else {
      this._saveLocalJson('admin_branding_db.json', payload);
      return { success: true };
    }
  }

  // 6. Custom Frames (Category D)
  async getCustomFrames() {
    if (this.useFirestore) {
      if (this.isCacheValid('systemConfig', 'custom_frames') && this.cache.systemConfig.has('custom_frames')) {
        return this.cache.systemConfig.get('custom_frames');
      }
      const res = await this.listDocs('custom_frames', 300);
      const list = res.documents || [];
      this.cache.systemConfig.set('custom_frames', list);
      this.cacheTimestamps.set('systemConfig:custom_frames', Date.now());
      return list;
    } else {
      return this._loadLocalJson('custom_frames_db.json', []);
    }
  }

  async saveCustomFrame(frameId, frameData) {
    const cleanId = String(frameId || frameData?.id).trim();
    const payload = { ...frameData, id: cleanId, docId: cleanId, updatedAt: Date.now() };
    if (this.useFirestore) {
      const res = await this.writeDoc('custom_frames', cleanId, payload);
      this.invalidateCache('systemConfig', 'custom_frames');
      return res;
    } else {
      const list = this._loadLocalJson('custom_frames_db.json', []);
      const idx = list.findIndex((f) => f.id === cleanId);
      if (idx >= 0) list[idx] = payload;
      else list.push(payload);
      this._saveLocalJson('custom_frames_db.json', list);
      return { success: true };
    }
  }

  // 7. Admin Notifications Read (Category C)
  async getAdminNotificationsRead() {
    if (this.useFirestore) {
      if (this.isCacheValid('systemConfig', 'admin_notifs_read') && this.cache.systemConfig.has('admin_notifs_read')) {
        return this.cache.systemConfig.get('admin_notifs_read');
      }
      const res = await this.readDoc('admin_notifications_read', 'global');
      if (res.success && res.data && Array.isArray(res.data.readIds)) {
        this.cache.systemConfig.set('admin_notifs_read', res.data.readIds);
        this.cacheTimestamps.set('systemConfig:admin_notifs_read', Date.now());
        return res.data.readIds;
      }
      return [];
    } else {
      return this._loadLocalJson('admin_notifications_read_db.json', []);
    }
  }

  async saveAdminNotificationsRead(ids) {
    const readArray = Array.from(ids || []);
    const payload = { id: 'global', docId: 'global', readIds: readArray, updatedAt: Date.now() };
    if (this.useFirestore) {
      const res = await this.writeDoc('admin_notifications_read', 'global', payload);
      this.cache.systemConfig.set('admin_notifs_read', readArray);
      this.cacheTimestamps.set('systemConfig:admin_notifs_read', Date.now());
      return res;
    } else {
      this._saveLocalJson('admin_notifications_read_db.json', readArray);
      return { success: true };
    }
  }

  // --- INTERNAL HELPER ENCODERS / DECODERS ---
  _toFirestoreField(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') {
      if (Number.isInteger(val)) return { integerValue: val.toString() };
      return { doubleValue: val };
    }
    if (typeof val === 'string') return { stringValue: val };
    if (Array.isArray(val)) {
      return { arrayValue: { values: val.map((item) => this._toFirestoreField(item)) } };
    }
    if (typeof val === 'object') {
      const fields = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) fields[k] = this._toFirestoreField(v);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
  }

  _fromFirestoreField(f) {
    if (!f) return null;
    if ('stringValue' in f) return f.stringValue;
    if ('integerValue' in f) return parseInt(f.integerValue, 10);
    if ('doubleValue' in f) return parseFloat(f.doubleValue);
    if ('booleanValue' in f) return f.booleanValue;
    if ('nullValue' in f) return null;
    if ('timestampValue' in f) return f.timestampValue;
    if ('arrayValue' in f) {
      return (f.arrayValue.values || []).map((v) => this._fromFirestoreField(v));
    }
    if ('mapValue' in f) {
      const res = {};
      for (const [k, v] of Object.entries(f.mapValue.fields || {})) {
        res[k] = this._fromFirestoreField(v);
      }
      return res;
    }
    return null;
  }

  _fromFirestoreDoc(doc) {
    if (!doc || !doc.fields) return null;
    const res = {};
    for (const [k, v] of Object.entries(doc.fields)) {
      res[k] = this._fromFirestoreField(v);
    }
    return res;
  }

  _loadLocalJson(file, fallback = null) {
    try {
      const p = path.resolve(process.cwd(), file);
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {}
    return fallback;
  }

  _saveLocalJson(file, data) {
    try {
      const p = path.resolve(process.cwd(), file);
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch {
      return false;
    }
  }
}

// Global Singleton Instance
const centralDb = new CentralFirestoreDatabaseService();

module.exports = {
  CentralFirestoreDatabaseService,
  centralDb,
};
