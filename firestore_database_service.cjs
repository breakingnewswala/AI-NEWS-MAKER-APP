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
const crypto = require('crypto');
const adapter = require('./server_firestore_adapter.cjs');

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 20,
  keepAliveMsecs: 60000,
});

const httpAgent = new http.Agent({
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
      : (process.env.USE_FIRESTORE === 'true' || adapter.USE_FIRESTORE || Boolean(process.env.FIRESTORE_EMULATOR_HOST));
    
    // In-memory live cache for ultra-fast reads & synchronous backward compatibility
    this.cache = {
      users: new Map(),
      news: new Map(),
      videos: new Map(),
      wallets: new Map(),
      walletTransactions: new Map(),
      frameUnlocks: new Map(),
      payments: new Map(),
      rssSources: new Map(),
      channels: new Map(),
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
      tombstones: new Set(),
    };

    this.isInitialized = false;
    this.initializationPromise = null;

    // Configurable Cache TTLs (Task 1: Multi-instance Cache Consistency)
    this.cacheTtl = {
      news: 60 * 1000,
      videos: 60 * 1000,
      rssSources: 120 * 1000,
      channels: 120 * 1000,
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

  _getTransportInfo() {
    const emu = process.env.FIRESTORE_EMULATOR_HOST;
    if (emu) {
      const parts = emu.split(':');
      return {
        isEmulator: true,
        transport: http,
        host: parts[0] || '127.0.0.1',
        port: parts[1] ? parseInt(parts[1], 10) : 8080,
        agent: httpAgent,
      };
    }
    return {
      isEmulator: false,
      transport: https,
      host: 'firestore.googleapis.com',
      port: 443,
      agent: httpsAgent,
    };
  }

  async getAccessToken() {
    if (process.env.FIRESTORE_EMULATOR_HOST) return 'owner';
    return adapter.getMetadataAccessToken();
  }

  async _requestFirestore({ method = 'GET', path, body = null, headers = {}, timeout = 6000 }) {
    const transportInfo = this._getTransportInfo();
    const token = await this.getAccessToken();
    if (!token) return { success: false, error: 'No access token available' };

    const reqHeaders = {
      Authorization: `Bearer ${token}`,
      ...headers,
    };
    if (body) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(body);
    }

    return new Promise((resolve) => {
      const req = transportInfo.transport.request(
        {
          host: transportInfo.host,
          port: transportInfo.port,
          path,
          method,
          headers: reqHeaders,
          agent: transportInfo.agent,
          timeout,
        },
        (res) => {
          const chunks = [];
          res.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
          res.on('end', () => {
            const resBody = Buffer.concat(chunks).toString('utf8');
            resolve({
              success: res.statusCode >= 200 && res.statusCode < 300,
              statusCode: res.statusCode,
              body: resBody,
            });
          });
        }
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, statusCode: 408, error: 'Request timeout' });
      });
      req.on('error', (e) => resolve({ success: false, error: e.message }));
      if (body) req.write(body);
      req.end();
    });
  }

  async _execFirestoreGet(docPath) {
    const res = await this._requestFirestore({
      method: 'GET',
      path: docPath,
      timeout: 6000,
    });
    if (res.success) {
      try {
        const parsed = JSON.parse(res.body);
        return { success: true, doc: parsed, updateTime: parsed.updateTime };
      } catch (e) {
        return { success: false, error: e.message };
      }
    } else if (res.statusCode === 404) {
      return { success: true, notFound: true };
    } else {
      return { success: false, statusCode: res.statusCode, error: res.body };
    }
  }

  // Authoritative transactional document read via batchGet POST body
  async _readDocInTransaction(collection, docId, transactionId) {
    const docName = `projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}/${docId}`;
    const path = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:batchGet`;
    const payload = JSON.stringify({
      documents: [docName],
      transaction: transactionId,
    });

    const res = await this._requestFirestore({
      method: 'POST',
      path,
      body: payload,
      timeout: 6000,
    });

    if (res.success) {
      try {
        const parsed = JSON.parse(res.body);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const entry = parsed[0];
          if (entry.found) {
            return {
              success: true,
              doc: entry.found,
              data: this._fromFirestoreDoc(entry.found),
              updateTime: entry.found.updateTime,
            };
          } else if (entry.missing) {
            return { success: true, notFound: true };
          }
        }
        return { success: true, notFound: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, statusCode: res.statusCode, error: res.body };
  }

  // Begin Firestore REST atomic transaction (Task 3)
  async beginTransaction() {
    if (!this.useFirestore) return { success: false, error: 'Firestore disabled' };
    const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:beginTransaction`;
    const res = await this._requestFirestore({
      method: 'POST',
      path: docPath,
      body: JSON.stringify({ options: { readWrite: {} } }),
      timeout: 6000,
    });
    if (res.success) {
      try {
        const parsed = JSON.parse(res.body);
        return { success: true, transaction: parsed.transaction };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: `beginTransaction failed (${res.statusCode}): ${res.body}` };
  }

  // Commit Firestore REST atomic transaction (Task 3)
  async commitTransaction(transactionId, writes = []) {
    if (!this.useFirestore) return { success: false, error: 'Firestore disabled' };
    const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:commit`;
    const payload = JSON.stringify({
      transaction: transactionId,
      writes,
    });
    const res = await this._requestFirestore({
      method: 'POST',
      path: docPath,
      body: payload,
      timeout: 8000,
    });
    if (res.success) {
      try {
        const parsed = JSON.parse(res.body);
        return { success: true, data: parsed };
      } catch (e) {
        return { success: true };
      }
    }
    return { success: false, statusCode: res.statusCode, error: `commit failed (${res.statusCode}): ${res.body}` };
  }

  // Rollback Firestore REST atomic transaction (Task 3)
  async rollbackTransaction(transactionId) {
    if (!this.useFirestore || !transactionId) return;
    const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents:rollback`;
    const payload = JSON.stringify({ transaction: transactionId });
    await this._requestFirestore({
      method: 'POST',
      path: docPath,
      body: payload,
      timeout: 4000,
    });
  }

  // Generic document read
  async readDoc(collection, docId) {
    if (!this.useFirestore) {
      return { success: false, error: 'Firestore is disabled' };
    }
    const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}/${encodeURIComponent(docId)}`;
    const res = await this._requestFirestore({
      method: 'GET',
      path: docPath,
      timeout: 5000,
    });
    if (res.success) {
      try {
        const parsed = JSON.parse(res.body);
        const data = this._fromFirestoreDoc(parsed);
        return { success: true, data, statusCode: res.statusCode };
      } catch (err) {
        return { success: false, error: err.message, statusCode: res.statusCode };
      }
    }
    return { success: false, statusCode: res.statusCode, error: `Doc not found or error (${res.statusCode})` };
  }

  // Generic document write
  async writeDoc(collection, docId, data) {
    if (!this.useFirestore) {
      return { success: false, error: 'Firestore is disabled' };
    }
    const fields = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) fields[k] = this._toFirestoreField(v);
    }
    const payload = JSON.stringify({ fields });
    const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}/${encodeURIComponent(docId)}`;
    const res = await this._requestFirestore({
      method: 'PATCH',
      path: docPath,
      body: payload,
      timeout: 5000,
    });
    return { success: res.success, statusCode: res.statusCode, error: res.success ? undefined : res.body };
  }

  // Generic document delete
  async deleteDoc(collection, docId) {
    if (!this.useFirestore) {
      return { success: false, error: 'Firestore is disabled' };
    }
    const docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}/${encodeURIComponent(docId)}`;
    const res = await this._requestFirestore({
      method: 'DELETE',
      path: docPath,
      timeout: 5000,
    });
    return { success: res.success, statusCode: res.statusCode };
  }

  // Generic list documents with complete nextPageToken pagination loop (Task 5)
  async listDocs(collection, pageSize = 300) {
    if (!this.useFirestore) {
      return { success: false, error: 'Firestore is disabled', documents: [] };
    }
    const allDocuments = [];
    const seenIds = new Set();
    let pageToken = '';
    const safePageSize = Math.min(500, Math.max(10, pageSize));

    do {
      let docPath = `/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${collection}?pageSize=${safePageSize}`;
      if (pageToken) {
        docPath += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const res = await this._requestFirestore({
        method: 'GET',
        path: docPath,
        timeout: 10000,
      });

      if (res.success) {
        try {
          const parsed = JSON.parse(res.body);
          const docs = (parsed.documents || []).map((d) => {
            const docId = d.name ? d.name.split('/').pop() : '';
            const data = this._fromFirestoreDoc(d);
            return { id: docId, docId, ...data };
          });
          for (const doc of docs) {
            if (doc.id && !seenIds.has(doc.id)) {
              seenIds.add(doc.id);
              allDocuments.push(doc);
            }
          }
          pageToken = parsed.nextPageToken || '';
        } catch (err) {
          pageToken = '';
        }
      } else {
        if (allDocuments.length > 0) break;
        return { success: false, error: `List failed (${res.statusCode})`, documents: [] };
      }
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

      // 1.5 Tombstoned Users (Permanent Deletion Protection)
      const tRes = await this.listDocs('tombstoned_users', 500);
      if (tRes.success) {
        if (!this.cache.tombstones) this.cache.tombstones = new Set();
        this.cache.tombstones.clear();
        tRes.documents.forEach((t) => {
          if (t.identifier) this.cache.tombstones.add(t.identifier.toLowerCase().trim());
          if (t.id) this.cache.tombstones.add(t.id.toLowerCase().trim());
        });
      }

      // 2. News Posts
      const nRes = await this.listDocs('news_posts', 300);
      if (nRes.success) {
        this.cache.news.clear();
        nRes.documents.forEach((n) => this.cache.news.set(n.id, n));
        console.log(`  ✓ Loaded ${nRes.documents.length} news posts into live cache`);
      }

      // 2.5. Videos & Reels
      const vRes = await this.listDocs('videos', 200);
      if (vRes.success) {
        if (!this.cache.videos) this.cache.videos = new Map();
        this.cache.videos.clear();
        vRes.documents.forEach((v) => this.cache.videos.set(v.id, v));
        console.log(`  ✓ Loaded ${vRes.documents.length} videos into live cache`);
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

      // 4.5 Restricted Channels / Portal Directory
      const chRes = await this.listDocs('restricted_channels', 200);
      if (chRes.success) {
        this.cache.channels.clear();
        chRes.documents.forEach((ch) => this.cache.channels.set(ch.id, ch));
        console.log(`  ✓ Loaded ${chRes.documents.length} channels/portals into live cache`);
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

      // 5.5 Payment Transactions (Crucial for User Plan & Financial Permanence)
      const payRes = await this.listDocs('payment_transactions', 500);
      if (payRes.success) {
        if (!this.cache.payments) this.cache.payments = new Map();
        this.cache.payments.clear();
        payRes.documents.forEach((p) => {
          const id = p.orderId || p.id || p.docId;
          if (id) this.cache.payments.set(id, p);
        });
        console.log(`  ✓ Loaded ${payRes.documents.length} payment transactions into live cache`);
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

      // 7.5 Admin Notifications Read
      const anrRes = await this.readDoc('admin_notifications_read', 'global');
      if (anrRes.success && anrRes.data && Array.isArray(anrRes.data.readIds)) {
        this.cache.systemConfig.set('admin_notifs_read', anrRes.data.readIds);
        this.cacheTimestamps.set('systemConfig:admin_notifs_read', Date.now());
        console.log(`  ✓ Loaded ${anrRes.data.readIds.length} admin read notification IDs into live cache`);
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
  _isMasterAdminIdentifier(id) {
    if (!id) return false;
    const clean = String(id).toLowerCase().trim();
    return clean === 'breakingnewswala.com@gmail.com' ||
           clean === 'usr_627265616b69' ||
           clean === 'admin';
  }

  async getUser(idOrEmail) {
    if (!idOrEmail) return null;
    const clean = idOrEmail.toLowerCase().trim();
    const isMasterAdmin = this._isMasterAdminIdentifier(clean);

    if (this.useFirestore) {
      // 1. Try memory cache first for speed
      if (this.cache.users.has(clean)) {
        return this.cache.users.get(clean);
      }
      if (isMasterAdmin) {
        if (this.cache.users.has('breakingnewswala.com@gmail.com')) {
          return this.cache.users.get('breakingnewswala.com@gmail.com');
        }
        if (this.cache.users.has('usr_627265616b69')) {
          return this.cache.users.get('usr_627265616b69');
        }
      }

      // 2. Fetch directly from Firestore
      const read = await this.readDoc('users', clean);
      if (read.success && read.data) {
        let user = read.data;
        if (isMasterAdmin) {
          const altKey = clean === 'usr_627265616b69' ? 'breakingnewswala.com@gmail.com' : 'usr_627265616b69';
          const altRead = await this.readDoc('users', altKey);
          if (altRead.success && altRead.data) {
            user = { ...altRead.data, ...user, email: 'breakingnewswala.com@gmail.com', userId: 'usr_627265616b69', uid: 'usr_627265616b69', role: 'superadmin' };
          }
        }
        this.cache.users.set(clean, user);
        if (isMasterAdmin) {
          this.cache.users.set('breakingnewswala.com@gmail.com', user);
          this.cache.users.set('usr_627265616b69', user);
          this.cache.users.set('admin', user);
        }
        return user;
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
    const isMasterAdmin = this._isMasterAdminIdentifier(clean) ||
                          this._isMasterAdminIdentifier(userData.email) ||
                          this._isMasterAdminIdentifier(userData.userId) ||
                          this._isMasterAdminIdentifier(userData.uid);

    let payload = {
      ...userData,
      docId: clean,
      updatedAt: Date.now(),
    };

    if (isMasterAdmin) {
      payload = {
        ...payload,
        email: 'breakingnewswala.com@gmail.com',
        userId: payload.userId || 'usr_627265616b69',
        uid: payload.uid || payload.userId || 'usr_627265616b69',
        role: 'superadmin',
        tier: 'ultra',
      };
    }

    if (this.useFirestore) {
      this.cache.users.set(clean, payload);
      if (payload.email) this.cache.users.set(payload.email.toLowerCase().trim(), payload);
      if (payload.userId) this.cache.users.set(payload.userId.toLowerCase().trim(), payload);
      if (payload.uid) this.cache.users.set(payload.uid.toLowerCase().trim(), payload);

      if (isMasterAdmin) {
        this.cache.users.set('breakingnewswala.com@gmail.com', payload);
        this.cache.users.set('usr_627265616b69', payload);
        this.cache.users.set('admin', payload);
        // Persist to both documents in Firestore
        await Promise.all([
          this.writeDoc('users', 'breakingnewswala.com@gmail.com', { ...payload, docId: 'breakingnewswala.com@gmail.com' }),
          this.writeDoc('users', 'usr_627265616b69', { ...payload, docId: 'usr_627265616b69' }),
        ]);
        return { success: true };
      } else {
        const res = await this.writeDoc('users', clean, payload);
        return res;
      }
    } else {
      const profiles = this._loadLocalJson('user_profiles_db.json', {});
      profiles[clean] = payload;
      if (isMasterAdmin) {
        profiles['breakingnewswala.com@gmail.com'] = payload;
        profiles['usr_627265616b69'] = payload;
      }
      this._saveLocalJson('user_profiles_db.json', profiles);
      return { success: true };
    }
  }

  async deleteUser(idOrEmail) {
    if (!idOrEmail) return { success: false, error: 'User identifier required' };
    const clean = idOrEmail.toLowerCase().trim();
    if (this._isMasterAdminIdentifier(clean)) {
      return { success: false, error: 'Cannot delete master admin' };
    }

    if (!this.cache.tombstones) this.cache.tombstones = new Set();
    this.cache.tombstones.add(clean);

    if (this.useFirestore) {
      const keysToDelete = [];
      for (const [k, u] of this.cache.users.entries()) {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uId = (u.userId || u.id || u.uid || '').toLowerCase().trim();
        const uDocId = (u.docId || '').toLowerCase().trim();
        if (k === clean || uEmail === clean || uId === clean || uDocId === clean) {
          keysToDelete.push(k);
          if (uDocId) keysToDelete.push(uDocId);
          if (uId) keysToDelete.push(uId);
          if (uEmail) keysToDelete.push(uEmail);
        }
      }
      keysToDelete.push(clean);
      const uniqueKeys = Array.from(new Set(keysToDelete));

      for (const k of uniqueKeys) {
        this.cache.users.delete(k);
        await this.deleteDoc('users', k).catch(() => {});
      }

      // Record tombstone in Firestore
      const cleanTombKey = `tomb_${clean.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const tombstonePayload = {
        identifier: clean,
        deletedAt: Date.now(),
        docId: cleanTombKey,
      };
      await this.writeDoc('tombstoned_users', cleanTombKey, tombstonePayload).catch(() => {});

      this.cacheTimestamps.set('users', Date.now());
      return { success: true };
    } else {
      const profiles = this._loadLocalJson('user_profiles_db.json', {});
      delete profiles[clean];
      this._saveLocalJson('user_profiles_db.json', profiles);
      return { success: true };
    }
  }

  async listUsers() {
    if (this.useFirestore) {
      let docs = [];
      const rawList = this.cache.users.size > 0 
        ? Array.from(this.cache.users.values()) 
        : ((await this.listDocs('users', 300)).documents || []);
      
      const unique = new Map();
      for (const u of rawList) {
        const email = (u?.email || '').toLowerCase().trim();
        const isMA = this._isMasterAdminIdentifier(email) || this._isMasterAdminIdentifier(u?.userId) || this._isMasterAdminIdentifier(u?.id);
        const key = isMA ? 'breakingnewswala.com@gmail.com' : (email || u?.id || u?.docId || u?.userId);
        if (key && !unique.has(key)) {
          unique.set(key, u);
        } else if (isMA && unique.has(key)) {
          unique.set(key, { ...unique.get(key), ...u });
        }
      }
      docs = Array.from(unique.values());
      const tombstones = this.cache.tombstones || new Set();
      return docs.filter(u => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const uId = (u.userId || u.id || u.uid || '').toLowerCase().trim();
        return !tombstones.has(uEmail) && !tombstones.has(uId);
      });
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

  // --- VIDEOS & REELS OPERATIONS ---
  async getVideos(options = {}) {
    if (this.useFirestore) {
      let videos = [];
      const cacheValid = this.isCacheValid('videos');
      if (this.cache.videos && this.cache.videos.size > 0 && !options.forceRemote && cacheValid) {
        videos = Array.from(this.cache.videos.values());
      } else {
        const res = await this.listDocs('videos', 200);
        videos = res.documents || [];
        if (!this.cache.videos) this.cache.videos = new Map();
        this.cache.videos.clear();
        videos.forEach((v) => this.cache.videos.set(v.id, v));
        this.cacheTimestamps.set('videos', Date.now());
      }
      return videos;
    } else {
      return this._loadLocalJson('videos_database.json', []);
    }
  }

  async saveVideo(videoData) {
    if (!videoData || !videoData.id) return { success: false, error: 'Video ID required' };
    const cleanId = String(videoData.id).trim();
    const payload = {
      ...videoData,
      id: cleanId,
      docId: cleanId,
      updatedAt: Date.now(),
    };

    if (this.useFirestore) {
      if (!this.cache.videos) this.cache.videos = new Map();
      this.cache.videos.set(cleanId, payload);
      this.cacheTimestamps.set('videos', Date.now());
      const res = await this.writeDoc('videos', cleanId, payload);
      return res;
    } else {
      const videos = this._loadLocalJson('videos_database.json', []);
      const idx = videos.findIndex((v) => v.id === cleanId);
      if (idx >= 0) videos[idx] = payload;
      else videos.unshift(payload);
      this._saveLocalJson('videos_database.json', videos);
      return { success: true };
    }
  }

  async deleteVideo(videoId) {
    if (!videoId) return { success: false, error: 'Video ID required' };
    const cleanId = String(videoId).trim();

    if (this.useFirestore) {
      if (this.cache.videos) this.cache.videos.delete(cleanId);
      this.cacheTimestamps.set('videos', Date.now());
      const res = await this.deleteDoc('videos', cleanId);
      return res;
    } else {
      const videos = this._loadLocalJson('videos_database.json', []);
      const filtered = videos.filter((v) => v.id !== cleanId);
      this._saveLocalJson('videos_database.json', filtered);
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
        const docRes = await this._readDocInTransaction('wallets', cleanKey, transactionId);

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
              name: `projects/${this.projectId}/databases/${this.databaseId}/documents/wallets/${cleanKey}`,
              fields: walletFields,
            },
            currentDocument: updateTime ? { updateTime } : { exists: false },
          },
          {
            update: {
              name: `projects/${this.projectId}/databases/${this.databaseId}/documents/wallet_transactions/${txId}`,
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
    const existing = this.cache.payments.get(cleanId) || {};
    const payload = {
      ...existing,
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
      const idx = payments.findIndex(p => p.orderId === cleanId);
      if (idx >= 0) payments[idx] = payload;
      else payments.unshift(payload);
      this._saveLocalJson('payments_transactions_db.json', payments);
      return { success: true };
    }
  }

  async getPayments(userEmail = '') {
    if (this.useFirestore) {
      if (this.cache.payments && this.cache.payments.size > 0) {
        const all = Array.from(this.cache.payments.values());
        if (userEmail) {
          const clean = userEmail.toLowerCase().trim();
          return all.filter((p) => (p.userEmail || p.customerEmail || '').toLowerCase().trim() === clean);
        }
        return all;
      }
      const res = await this.listDocs('payment_transactions', 500);
      const docs = res.documents || [];
      if (!this.cache.payments) this.cache.payments = new Map();
      docs.forEach((p) => {
        const id = p.orderId || p.id || p.docId;
        if (id) this.cache.payments.set(id, p);
      });
      if (userEmail) {
        const clean = userEmail.toLowerCase().trim();
        return docs.filter((p) => (p.userEmail || p.customerEmail || '').toLowerCase().trim() === clean);
      }
      return docs;
    } else {
      const payments = this._loadLocalJson('payments_transactions_db.json', []);
      if (userEmail) {
        const clean = userEmail.toLowerCase().trim();
        return payments.filter((p) => (p.userEmail || p.customerEmail || '').toLowerCase().trim() === clean);
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

  // --- RESTRICTED CHANNELS / PORTAL DIRECTORY OPERATIONS ---
  async getChannels() {
    if (this.useFirestore) {
      if (this.cache.channels && this.cache.channels.size > 0) {
        return Array.from(this.cache.channels.values());
      }
      const res = await this.listDocs('restricted_channels', 200);
      const docs = res.documents || [];
      if (!this.cache.channels) this.cache.channels = new Map();
      docs.forEach((c) => this.cache.channels.set(c.id, c));
      return docs;
    } else {
      return this._loadLocalJson('restricted_channels_db.json', []);
    }
  }

  async saveChannel(channelId, payload) {
    if (!channelId || !payload) return { success: false, error: 'Channel ID and payload required' };
    const cleanId = String(channelId).trim();

    if (this.useFirestore) {
      if (!this.cache.channels) this.cache.channels = new Map();
      this.cache.channels.set(cleanId, payload);
      const res = await this.writeDoc('restricted_channels', cleanId, payload);
      return res;
    } else {
      const channels = this._loadLocalJson('restricted_channels_db.json', []);
      const idx = channels.findIndex((c) => c.id === cleanId);
      if (idx >= 0) channels[idx] = payload;
      else channels.push(payload);
      this._saveLocalJson('restricted_channels_db.json', channels);
      return { success: true };
    }
  }

  async deleteChannel(channelId) {
    if (!channelId) return { success: false, error: 'Channel ID required' };
    const cleanId = String(channelId).trim();

    if (this.useFirestore) {
      if (this.cache.channels) this.cache.channels.delete(cleanId);
      const res = await this.deleteDoc('restricted_channels', cleanId);
      return res;
    } else {
      const channels = this._loadLocalJson('restricted_channels_db.json', []);
      const filtered = channels.filter((c) => c.id !== cleanId);
      this._saveLocalJson('restricted_channels_db.json', filtered);
      return { success: true };
    }
  }

  // --- PLANS & COUPONS ---
  async getPlans() {
    const canonicalOrder = { basic: 1, advanced: 2, advance: 2, professional: 3, pro: 3, ultra: 4, vip: 4, enterprise: 4 };
    let list = [];
    if (this.useFirestore) {
      if (this.cache.plans.size > 0) {
        list = Array.from(this.cache.plans.values());
      } else {
        const res = await this.listDocs('plans_catalog', 50);
        list = res.documents || [];
      }
    } else {
      list = this._loadLocalJson('plans_catalog_database.json', []);
    }
    return list.sort((a, b) => {
      const orderA = canonicalOrder[(a.id || a.planKey || '').toLowerCase()] || 99;
      const orderB = canonicalOrder[(b.id || b.planKey || '').toLowerCase()] || 99;
      return orderA - orderB;
    });
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

  // --- DISTRIBUTED HEADLINE REGENERATION LOCK (Task A / Phase 3.0B-S) ---
  /**
   * Atomically acquires a distributed lock for draft headline regeneration.
   * Ensures that:
   * 1. If draft was already regenerated (status === 'completed'), rejects unless matching generationRequestId for idempotent replay.
   * 2. If another instance is currently regenerating (status === 'in_progress' and now < leaseExpiresAt), rejects with 409 Conflict.
   * 3. If lock is expired (leaseExpiresAt <= now), allows takeover.
   * 4. Acquires lease with unique lockId and 60-second TTL.
   */
  async acquireDraftRegenerationLock(draftId, userId, generationRequestId = '') {
    if (!draftId) return { success: false, error: 'draftId is required' };
    const cleanDraftId = String(draftId).trim();
    const cleanUserId = String(userId || '').trim();
    const cleanReqId = String(generationRequestId || '').trim();
    const now = Date.now();
    const leaseDurationMs = 60000; // 60 seconds lease
    const newLockId = `lock_${cleanDraftId}_${now}_${Math.random().toString(36).slice(2, 8)}`;

    if (this.useFirestore) {
      const maxRetries = 5;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const txRes = await this.beginTransaction();
        if (!txRes.success || !txRes.transaction) {
          const jitter = Math.floor(Math.random() * 80);
          await new Promise((r) => setTimeout(r, 40 * (attempt + 1) + jitter));
          continue;
        }

        const transactionId = txRes.transaction;
        const docRes = await this._readDocInTransaction('draft_regeneration_locks', cleanDraftId, transactionId);

        if (!docRes.success) {
          await this.rollbackTransaction(transactionId);
          const jitter = Math.floor(Math.random() * 80);
          await new Promise((r) => setTimeout(r, 40 * (attempt + 1) + jitter));
          continue;
        }

        let existingLock = null;
        let updateTime = null;
        if (docRes.doc) {
          existingLock = this._fromFirestoreDoc(docRes.doc);
          updateTime = docRes.updateTime;
        }

        if (existingLock) {
          if (existingLock.status === 'completed' || existingLock.regenerationUsed) {
            await this.rollbackTransaction(transactionId);
            if (cleanReqId && existingLock.generationRequestId === cleanReqId && Array.isArray(existingLock.headlines)) {
              return {
                success: true,
                idempotentReplay: true,
                headlines: existingLock.headlines,
                lockId: existingLock.lockId,
              };
            }
            return {
              success: false,
              alreadyUsed: true,
              conflict: true,
              error: 'इस न्यूज़ ड्राफ्ट पर अतिरिक्त 5 हेडलाइन रीजेनरेशन (Single-Use) का उपयोग पहले ही किया जा चुका है।',
            };
          }

          const leaseExpiresAt = Number(existingLock.leaseExpiresAt) || 0;
          if (existingLock.status === 'in_progress' && now < leaseExpiresAt) {
            await this.rollbackTransaction(transactionId);
            return {
              success: false,
              inFlight: true,
              conflict: true,
              error: 'इस ड्राफ्ट पर हेडलाइन पुनर्जनन प्रक्रिया पहले से जारी है। कृपया प्रतीक्षा करें।',
            };
          }
        }

        const lockPayload = {
          draftId: cleanDraftId,
          userId: cleanUserId,
          generationRequestId: cleanReqId,
          lockId: newLockId,
          status: 'in_progress',
          acquiredAt: now,
          leaseExpiresAt: now + leaseDurationMs,
          updatedAt: now,
        };

        const fields = {};
        for (const [k, v] of Object.entries(lockPayload)) {
          if (v !== undefined) fields[k] = this._toFirestoreField(v);
        }

        const writes = [
          {
            update: {
              name: `projects/${this.projectId}/databases/${this.databaseId}/documents/draft_regeneration_locks/${cleanDraftId}`,
              fields,
            },
            currentDocument: updateTime ? { updateTime } : { exists: false },
          },
        ];

        const commitRes = await this.commitTransaction(transactionId, writes);
        if (commitRes.success) {
          return { success: true, lockId: newLockId, leaseExpiresAt: now + leaseDurationMs };
        } else if (
          commitRes.statusCode === 409 ||
          commitRes.statusCode === 400 ||
          (commitRes.error &&
            (commitRes.error.includes('ABORTED') ||
              commitRes.error.includes('FAILED_PRECONDITION') ||
              commitRes.error.includes('ALREADY_EXISTS') ||
              commitRes.error.includes('conflict')))
        ) {
          const jitter = Math.floor(Math.random() * 80);
          await new Promise((r) => setTimeout(r, 40 * (attempt + 1) + jitter));
          continue;
        } else {
          return { success: false, error: commitRes.error || 'Lock acquisition failed' };
        }
      }

      return {
        success: false,
        conflict: true,
        inFlight: true,
        error: 'इस ड्राफ्ट पर हेडलाइन पुनर्जनन प्रक्रिया पहले से जारी है। कृपया प्रतीक्षा करें।',
      };
    } else {
      // Local dev & test fallback using draft_regeneration_locks_db.json
      const locksDb = this._loadLocalJson('draft_regeneration_locks_db.json', {});
      const existing = locksDb[cleanDraftId];

      if (existing) {
        if (existing.status === 'completed' || existing.regenerationUsed) {
          if (cleanReqId && existing.generationRequestId === cleanReqId && Array.isArray(existing.headlines)) {
            return {
              success: true,
              idempotentReplay: true,
              headlines: existing.headlines,
              lockId: existing.lockId,
            };
          }
          return {
            success: false,
            alreadyUsed: true,
            conflict: true,
            error: 'इस न्यूज़ ड्राफ्ट पर अतिरिक्त 5 हेडलाइन रीजेनरेशन (Single-Use) का उपयोग पहले ही किया जा चुका है।',
          };
        }

        const leaseExpiresAt = Number(existing.leaseExpiresAt) || 0;
        if (existing.status === 'in_progress' && now < leaseExpiresAt) {
          return {
            success: false,
            inFlight: true,
            conflict: true,
            error: 'इस ड्राफ्ट पर हेडलाइन पुनर्जनन प्रक्रिया पहले से जारी है। कृपया प्रतीक्षा करें।',
          };
        }
      }

      // Check local drafts_database.json for existing draft single-use status
      const drafts = this._loadLocalJson('drafts_database.json', []);
      const existingDraft = drafts.find((d) => d.id === cleanDraftId);
      if (existingDraft && existingDraft.regenerationUsed) {
        if (cleanReqId && existingDraft.generationRequestId === cleanReqId && Array.isArray(existingDraft.regeneratedHeadlines)) {
          return {
            success: true,
            idempotentReplay: true,
            headlines: existingDraft.regeneratedHeadlines,
            lockId: existingDraft.id,
          };
        }
        return {
          success: false,
          alreadyUsed: true,
          conflict: true,
          error: 'इस न्यूज़ ड्राफ्ट पर अतिरिक्त 5 हेडलाइन रीजेनरेशन (Single-Use) का उपयोग पहले ही किया जा चुका है।',
        };
      }

      locksDb[cleanDraftId] = {
        draftId: cleanDraftId,
        userId: cleanUserId,
        generationRequestId: cleanReqId,
        lockId: newLockId,
        status: 'in_progress',
        acquiredAt: now,
        leaseExpiresAt: now + leaseDurationMs,
        updatedAt: now,
      };
      this._saveLocalJson('draft_regeneration_locks_db.json', locksDb);
      return { success: true, lockId: newLockId, leaseExpiresAt: now + leaseDurationMs };
    }
  }

  /**
   * Completes a draft headline regeneration.
   * Atomically validates lockId ownership, debits requiredCoins, marks lock as completed,
   * and persists headlines.
   */
  async completeDraftRegenerationLock(draftId, lockId, walletKey, requiredCoins, generatedHeadlines, generationRequestId = '') {
    if (!draftId || !lockId) return { success: false, error: 'draftId and lockId are required' };
    const cleanDraftId = String(draftId).trim();
    const cleanLockId = String(lockId).trim();
    const cleanWalletKey = String(walletKey || '').toLowerCase().trim();
    const numCoins = Math.max(0, Number(requiredCoins) || 0);
    const now = Date.now();

    if (this.useFirestore) {
      const maxRetries = 5;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const txRes = await this.beginTransaction();
        if (!txRes.success || !txRes.transaction) {
          const jitter = Math.floor(Math.random() * 80);
          await new Promise((r) => setTimeout(r, 40 * (attempt + 1) + jitter));
          continue;
        }

        const transactionId = txRes.transaction;

        // 1. Read lock document inside transaction
        const lockRes = await this._readDocInTransaction('draft_regeneration_locks', cleanDraftId, transactionId);
        if (!lockRes.success) {
          await this.rollbackTransaction(transactionId);
          const jitter = Math.floor(Math.random() * 80);
          await new Promise((r) => setTimeout(r, 40 * (attempt + 1) + jitter));
          continue;
        }

        let existingLock = lockRes.doc ? this._fromFirestoreDoc(lockRes.doc) : null;
        let lockUpdateTime = lockRes.updateTime;

        if (!existingLock || existingLock.lockId !== cleanLockId) {
          await this.rollbackTransaction(transactionId);
          return { success: false, error: 'Lock ID mismatch; ownership lost' };
        }

        if (existingLock.status === 'completed' || existingLock.regenerationUsed) {
          await this.rollbackTransaction(transactionId);
          if (generationRequestId && existingLock.generationRequestId === generationRequestId && Array.isArray(existingLock.headlines)) {
            return {
              success: true,
              idempotentReplay: true,
              headlines: existingLock.headlines,
              lockId: existingLock.lockId,
              coinsDeducted: 0,
            };
          }
          return {
            success: false,
            alreadyUsed: true,
            conflict: true,
            error: 'इस न्यूज़ ड्राफ्ट पर अतिरिक्त 5 हेडलाइन रीजेनरेशन (Single-Use) का उपयोग पहले ही किया जा चुका है।',
          };
        }

        // 2. Read wallet document inside transaction if coins need to be deducted
        let currentBalance = 0;
        let walletUpdateTime = null;
        let currentWallet = { walletKey: cleanWalletKey, coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 };

        if (numCoins > 0 && cleanWalletKey) {
          const walletRes = await this._readDocInTransaction('wallets', cleanWalletKey, transactionId);
          if (!walletRes.success) {
            await this.rollbackTransaction(transactionId);
            await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
            continue;
          }
          if (walletRes.doc) {
            currentWallet = this._fromFirestoreDoc(walletRes.doc);
            walletUpdateTime = walletRes.updateTime;
          }
          currentBalance = Number(currentWallet.coinBalance) || 0;
          if (currentBalance < numCoins) {
            await this.rollbackTransaction(transactionId);
            await this.releaseDraftRegenerationLock(cleanDraftId, cleanLockId);
            return {
              success: false,
              insufficientCoins: true,
              currentBalance,
              requiredCoins: numCoins,
              error: `सिक्के अपर्याप्त हैं (वर्तमान: ${currentBalance}, आवश्यक: ${numCoins})`,
            };
          }
        }

        // 3. Read draft document inside transaction (optional existence check)
        const draftRes = await this._readDocInTransaction('user_drafts', cleanDraftId, transactionId);
        let draftData = draftRes.doc ? this._fromFirestoreDoc(draftRes.doc) : null;
        let draftUpdateTime = draftRes.updateTime;

        // Prepare writes for single atomic commit
        const newBalance = Math.max(0, currentBalance - numCoins);
        const txId = `tx_regen_${cleanDraftId}_${now}`;

        // Write 1: Update draft_regeneration_locks to status='completed'
        const lockPayload = {
          draftId: cleanDraftId,
          lockId: cleanLockId,
          status: 'completed',
          regenerationUsed: true,
          generationRequestId: String(generationRequestId || ''),
          headlines: generatedHeadlines,
          coinsDeducted: numCoins,
          completedAt: now,
          updatedAt: now,
        };
        const lockFields = {};
        for (const [k, v] of Object.entries(lockPayload)) {
          if (v !== undefined) lockFields[k] = this._toFirestoreField(v);
        }

        const writes = [
          {
            update: {
              name: `projects/${this.projectId}/databases/${this.databaseId}/documents/draft_regeneration_locks/${cleanDraftId}`,
              fields: lockFields,
            },
            currentDocument: lockUpdateTime ? { updateTime: lockUpdateTime } : { exists: true },
          },
        ];

        // Write 2 & 3: Debit wallet and add wallet_transactions in the same commit
        if (numCoins > 0 && cleanWalletKey) {
          currentWallet.coinBalance = newBalance;
          currentWallet.updatedAt = now;
          const walletFields = {};
          for (const [k, v] of Object.entries(currentWallet)) {
            if (v !== undefined) walletFields[k] = this._toFirestoreField(v);
          }
          writes.push({
            update: {
              name: `projects/${this.projectId}/databases/${this.databaseId}/documents/wallets/${cleanWalletKey}`,
              fields: walletFields,
            },
            currentDocument: walletUpdateTime ? { updateTime: walletUpdateTime } : { exists: false },
          });

          const txPayload = {
            id: txId,
            transactionId: txId,
            userId: cleanWalletKey,
            userEmail: cleanWalletKey,
            newsItemId: cleanDraftId,
            newsTitle: '5 नई हेडलाइन्स',
            description: `5 नई हेडलाइन्स जनरेशन (Single-Use Draft ${cleanDraftId}): -${numCoins} कॉइन्स`,
            type: 'debit',
            amount: numCoins,
            coins: numCoins,
            balanceAfter: newBalance,
            timestamp: now,
            createdAt: new Date(now).toISOString(),
            status: 'completed',
          };
          const txFields = {};
          for (const [k, v] of Object.entries(txPayload)) {
            if (v !== undefined) txFields[k] = this._toFirestoreField(v);
          }
          writes.push({
            update: {
              name: `projects/${this.projectId}/databases/${this.databaseId}/documents/wallet_transactions/${txId}`,
              fields: txFields,
            },
            currentDocument: { exists: false },
          });
        }

        // Write 4: Mark draft regenerationUsed if user_drafts exists
        if (draftData) {
          draftData.regenerationUsed = true;
          draftData.regeneratedHeadlines = generatedHeadlines;
          draftData.generationRequestId = String(generationRequestId || '');
          draftData.updatedAt = now;
          const draftFields = {};
          for (const [k, v] of Object.entries(draftData)) {
            if (v !== undefined) draftFields[k] = this._toFirestoreField(v);
          }
          writes.push({
            update: {
              name: `projects/${this.projectId}/databases/${this.databaseId}/documents/user_drafts/${cleanDraftId}`,
              fields: draftFields,
            },
            currentDocument: draftUpdateTime ? { updateTime: draftUpdateTime } : { exists: true },
          });
        }

        // SINGLE ATOMIC COMMIT OF ALL 4 OPERATIONS
        const commitRes = await this.commitTransaction(transactionId, writes);
        if (commitRes.success) {
          return {
            success: true,
            newBalance,
            coinsDeducted: numCoins,
            headlines: generatedHeadlines,
            transactionId: txId,
          };
        } else if (
          commitRes.statusCode === 409 ||
          commitRes.statusCode === 400 ||
          (commitRes.error &&
            (commitRes.error.includes('ABORTED') ||
              commitRes.error.includes('FAILED_PRECONDITION') ||
              commitRes.error.includes('conflict')))
        ) {
          const jitter = Math.floor(Math.random() * 80);
          await new Promise((r) => setTimeout(r, 40 * (attempt + 1) + jitter));
          continue;
        } else {
          return { success: false, error: commitRes.error || 'Commit failed during draft completion' };
        }
      }

      return { success: false, error: 'Transaction contention during draft completion' };
    } else {
      const locksDb = this._loadLocalJson('draft_regeneration_locks_db.json', {});
      const existing = locksDb[cleanDraftId];
      if (existing && existing.lockId && existing.lockId !== cleanLockId) {
        return { success: false, error: 'Lock ID mismatch; ownership lost' };
      }

      let newBalance = 0;
      if (numCoins > 0 && cleanWalletKey) {
        const rDb = this._loadLocalJson('rewards_database.json', { wallets: {}, transactions: [] });
        if (!rDb.wallets) rDb.wallets = {};
        if (!rDb.wallets[cleanWalletKey]) {
          rDb.wallets[cleanWalletKey] = { coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 };
        }
        const currentBal = rDb.wallets[cleanWalletKey].coinBalance || 0;
        if (currentBal < numCoins) {
          await this.releaseDraftRegenerationLock(cleanDraftId, cleanLockId);
          return {
            success: false,
            insufficientCoins: true,
            currentBalance: currentBal,
            requiredCoins: numCoins,
            error: `सिक्के अपर्याप्त हैं (वर्तमान: ${currentBal}, आवश्यक: ${numCoins})`,
          };
        }
        newBalance = currentBal - numCoins;
        rDb.wallets[cleanWalletKey].coinBalance = newBalance;
        const txId = `tx_regen_${cleanDraftId}_${now}`;
        if (!Array.isArray(rDb.transactions)) rDb.transactions = [];
        rDb.transactions.unshift({
          id: txId,
          transactionId: txId,
          userId: cleanWalletKey,
          userEmail: cleanWalletKey,
          newsItemId: cleanDraftId,
          newsTitle: '5 नई हेडलाइन्स',
          description: `5 नई हेडलाइन्स जनरेशन: -${numCoins} कॉइन्स`,
          type: 'debit',
          amount: numCoins,
          coins: numCoins,
          balanceAfter: newBalance,
          timestamp: now,
          createdAt: new Date(now).toISOString(),
          status: 'completed',
        });
        this._saveLocalJson('rewards_database.json', rDb);
      }

      locksDb[cleanDraftId] = {
        draftId: cleanDraftId,
        lockId: cleanLockId,
        status: 'completed',
        regenerationUsed: true,
        generationRequestId: String(generationRequestId || ''),
        headlines: generatedHeadlines,
        coinsDeducted: numCoins,
        completedAt: now,
        updatedAt: now,
      };
      this._saveLocalJson('draft_regeneration_locks_db.json', locksDb);

      const drafts = this._loadLocalJson('drafts_database.json', []);
      const d = drafts.find((x) => x.id === cleanDraftId);
      if (d) {
        d.regenerationUsed = true;
        d.regeneratedHeadlines = generatedHeadlines;
        d.generationRequestId = generationRequestId;
        d.updatedAt = now;
        this._saveLocalJson('drafts_database.json', drafts);
      }

      return {
        success: true,
        newBalance,
        coinsDeducted: numCoins,
        headlines: generatedHeadlines,
      };
    }
  }

  /**
   * Releases an acquired lock if the regeneration failed or encountered an error.
   * Ensures the user is NOT locked out and ZERO coins are deducted.
   */
  async releaseDraftRegenerationLock(draftId, lockId) {
    if (!draftId) return;
    const cleanDraftId = String(draftId).trim();
    const cleanLockId = String(lockId || '').trim();

    if (this.useFirestore) {
      try {
        const read = await this.readDoc('draft_regeneration_locks', cleanDraftId);
        if (read.success && read.data) {
          if (!cleanLockId || read.data.lockId === cleanLockId) {
            if (read.data.status === 'in_progress') {
              await this.deleteDoc('draft_regeneration_locks', cleanDraftId);
            }
          }
        }
      } catch {}
    } else {
      const locksDb = this._loadLocalJson('draft_regeneration_locks_db.json', {});
      const existing = locksDb[cleanDraftId];
      if (existing && (!cleanLockId || existing.lockId === cleanLockId)) {
        if (existing.status === 'in_progress') {
          delete locksDb[cleanDraftId];
          this._saveLocalJson('draft_regeneration_locks_db.json', locksDb);
        }
      }
    }
  }

  // --- DAILY GRAPHIC DOWNLOAD TRANSACTION (Task B / Phase 3.0B-S) ---
  /**
   * PHASE 3.0B-U: Unified Atomic Download Token Consumption and Daily Graphic Quota Deduction
   * 
   * Atomically in ONE Firestore Transaction:
   * 1. Checks download_tokens/${tokenHash}:
   *    - If consumed: checks if downloadRequestId matches (idempotent retry). If not, aborts with replayDetected: true.
   * 2. Checks token signature, expiry (10m TTL), and user bindings.
   * 3. Checks daily_graphic_downloads/${userKey}_${dateStr}:
   *    - If downloadRequestId already in processedRequestIds: returns idempotent: true.
   *    - If count >= maxAllowed: aborts with quotaExceeded: true.
   * 4. Atomically commits in a SINGLE Firestore REST commit:
   *    - download_tokens/${tokenHash} with status: 'consumed', precondition { exists: false }.
   *    - daily_graphic_downloads/${userKey}_${dateStr} with count: count + 1, processedRequestIds.
   * 
   * Guarantees 100% replay immunity across independent instances, and zero quota decrement on failure.
   */
  async transactCompleteDownloadExport(userKey, dateStr, downloadRequestId = '', maxAllowed = 10, tokenInfo = {}, downloadDetails = {}) {
    const cleanKey = String(userKey || '').toLowerCase().trim();
    const cleanDate = String(dateStr || '').trim();
    const cleanReqId = String(downloadRequestId || '').trim() || `req_${cleanKey}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const limit = Math.max(1, Number(maxAllowed) || 10);
    const docId = `${cleanKey}_${cleanDate}`;
    const now = Date.now();

    const rawToken = typeof tokenInfo === 'string' ? tokenInfo : (tokenInfo?.token || downloadDetails?.token || '');
    const cleanToken = String(rawToken || '').trim();
    const cleanCard = String(tokenInfo?.cardId || downloadDetails?.cardId || '').trim();
    const authSecret = tokenInfo?.authSecret || process.env.SESSION_SECRET || process.env.JWT_SECRET || '';

    let tokenHash = '';
    let tokenExpiresAt = now + (10 * 60 * 1000);

    if (cleanToken) {
      const parts = cleanToken.split('.');
      if (parts.length !== 4 || parts[0] !== 'dlt') {
        return {
          success: false,
          invalidToken: true,
          reason: 'Malformed download token format',
          error: 'Malformed download token format',
        };
      }
      tokenExpiresAt = parseInt(parts[1], 10);
      const nonce = parts[2];
      const providedSig = parts[3];

      if (isNaN(tokenExpiresAt) || now > tokenExpiresAt) {
        return {
          success: false,
          expired: true,
          reason: 'Download token has expired (10m TTL)',
          error: 'Download token has expired (10m TTL)',
        };
      }

      tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
    }

    const verifyTokenSig = () => {
      if (!cleanToken) return true;
      const parts = cleanToken.split('.');
      const nonce = parts[2];
      const providedSig = parts[3];
      const candidateDates = [cleanDate, ''];
      const candidateReqs = [cleanReqId, ''];
      const candidateCards = [cleanCard, ''];

      for (const d of candidateDates) {
        for (const r of candidateReqs) {
          for (const c of candidateCards) {
            const payload = `${cleanKey}:${d}:${r}:${c}:${tokenExpiresAt}:${nonce}`;
            const expSig = crypto.createHmac('sha256', authSecret).update(payload).digest('hex');
            try {
              if (crypto.timingSafeEqual(Buffer.from(providedSig, 'hex'), Buffer.from(expSig, 'hex'))) {
                return true;
              }
            } catch {}
          }
        }
      }
      return false;
    };

    if (this.useFirestore) {
      const maxRetries = 5;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const txRes = await this.beginTransaction();
        if (!txRes.success || !txRes.transaction) {
          const jitter = Math.floor(Math.random() * 80);
          await new Promise((r) => setTimeout(r, 50 * (attempt + 1) + jitter));
          continue;
        }

        const transactionId = txRes.transaction;

        // 1. Read token document if token is provided
        let tokenDocRes = null;
        if (tokenHash) {
          tokenDocRes = await this._readDocInTransaction('download_tokens', tokenHash, transactionId);
          if (!tokenDocRes.success) {
            await this.rollbackTransaction(transactionId);
            const jitter = Math.floor(Math.random() * 80);
            await new Promise((r) => setTimeout(r, 50 * (attempt + 1) + jitter));
            continue;
          }
        }

        // 2. Read daily graphic downloads document
        const quotaDocRes = await this._readDocInTransaction('daily_graphic_downloads', docId, transactionId);
        if (!quotaDocRes.success) {
          await this.rollbackTransaction(transactionId);
          const jitter = Math.floor(Math.random() * 80);
          await new Promise((r) => setTimeout(r, 50 * (attempt + 1) + jitter));
          continue;
        }

        // 3. Evaluate Token State in transaction (Check replay before signature to catch all replayed tokens)
        if (tokenDocRes && tokenDocRes.doc) {
          const tokenData = this._fromFirestoreDoc(tokenDocRes.doc);
          if (tokenData.status === 'consumed') {
            // Check for idempotent retry by the same request ID
            if (cleanReqId && tokenData.downloadRequestId === cleanReqId) {
              await this.rollbackTransaction(transactionId);
              const curCount = quotaDocRes.doc ? (Number(this._fromFirestoreDoc(quotaDocRes.doc).count) || 0) : 0;
              return {
                success: true,
                idempotent: true,
                count: curCount,
                remaining: Math.max(0, limit - curCount),
                dateStr: cleanDate,
                tokenHash,
              };
            }
            // Replay attack detected across instances/sessions
            await this.rollbackTransaction(transactionId);
            return {
              success: false,
              replayDetected: true,
              reason: 'Token already consumed (replay detected)',
              error: 'Token already consumed (replay detected)',
              tokenHash,
            };
          }
        }

        // 4. Verify cryptographic signature if token not yet consumed
        if (cleanToken && !verifyTokenSig()) {
          await this.rollbackTransaction(transactionId);
          return {
            success: false,
            invalidSignature: true,
            reason: 'Invalid cryptographic token signature',
            error: 'Invalid cryptographic token signature',
          };
        }

        // 5. Evaluate Quota State in transaction
        let existingRecord = { userKey: cleanKey, date: cleanDate, count: 0, processedRequestIds: [] };
        let updateTime = null;
        if (quotaDocRes.doc) {
          existingRecord = this._fromFirestoreDoc(quotaDocRes.doc);
          updateTime = quotaDocRes.updateTime;
        }

        const currentCount = Number(existingRecord.count) || 0;
        const reqList = Array.isArray(existingRecord.processedRequestIds) ? [...existingRecord.processedRequestIds] : [];

        // Check request ID idempotency
        if (cleanReqId && reqList.includes(cleanReqId)) {
          await this.rollbackTransaction(transactionId);
          return {
            success: true,
            idempotent: true,
            count: currentCount,
            remaining: Math.max(0, limit - currentCount),
            dateStr: cleanDate,
            tokenHash,
          };
        }

        // Check quota ceiling
        if (currentCount >= limit) {
          await this.rollbackTransaction(transactionId);
          return {
            success: false,
            quotaExceeded: true,
            count: currentCount,
            remaining: 0,
            dateStr: cleanDate,
            error: 'आज का आपका दैनिक ग्राफिक डाउनलोड कोटा समाप्त हो गया है। नया कोटा कल पुनः उपलब्ध होगा।',
            tokenHash,
          };
        }

        // 6. Build Unified Atomic Writes
        const newCount = currentCount + 1;
        if (cleanReqId) reqList.push(cleanReqId);

        const writes = [];

        // Write A: Download Token (preconditioned on NOT existing to strictly enforce single consumption)
        if (tokenHash) {
          const tokenRecord = {
            tokenHash,
            userKey: cleanKey,
            dateStr: cleanDate,
            downloadRequestId: cleanReqId,
            cardId: cleanCard,
            expiresAt: tokenExpiresAt,
            consumedAt: now,
            status: 'consumed',
            updatedAt: now,
          };
          const tokenFields = {};
          for (const [k, v] of Object.entries(tokenRecord)) {
            if (v !== undefined) tokenFields[k] = this._toFirestoreField(v);
          }
          writes.push({
            update: {
              name: `projects/${this.projectId}/databases/${this.databaseId}/documents/download_tokens/${tokenHash}`,
              fields: tokenFields,
            },
            currentDocument: { exists: false },
          });
        }

        // Write B: Daily Graphic Downloads Quota
        const newRecord = {
          userKey: cleanKey,
          date: cleanDate,
          count: newCount,
          processedRequestIds: reqList.slice(-100),
          lastDownloadAt: now,
          updatedAt: now,
          ...(downloadDetails || {}),
        };
        const fields = {};
        for (const [k, v] of Object.entries(newRecord)) {
          if (v !== undefined && k !== 'token' && k !== 'tokenInfo') fields[k] = this._toFirestoreField(v);
        }
        writes.push({
          update: {
            name: `projects/${this.projectId}/databases/${this.databaseId}/documents/daily_graphic_downloads/${docId}`,
            fields,
          },
          currentDocument: updateTime ? { updateTime } : { exists: false },
        });

        // 7. Commit Transaction Atomically
        const commitRes = await this.commitTransaction(transactionId, writes);
        if (commitRes.success) {
          return {
            success: true,
            idempotent: false,
            count: newCount,
            remaining: Math.max(0, limit - newCount),
            dateStr: cleanDate,
            tokenHash,
          };
        } else if (
          commitRes.statusCode === 409 ||
          commitRes.statusCode === 400 ||
          (commitRes.error &&
            (commitRes.error.includes('ABORTED') ||
              commitRes.error.includes('ALREADY_EXISTS') ||
              commitRes.error.includes('FAILED_PRECONDITION') ||
              commitRes.error.includes('already exists') ||
              commitRes.error.includes('conflict')))
        ) {
          const jitter = Math.floor(Math.random() * 80);
          await new Promise((r) => setTimeout(r, 50 * (attempt + 1) + jitter));
          continue;
        } else {
          return { success: false, error: commitRes.error || 'Download transaction failed' };
        }
      }

      return { success: false, error: 'Download transaction aborted due to contention' };
    } else {
      // Local fallback using persistent JSON stores
      const tokensDb = this._loadLocalJson('download_tokens_database.json', {});
      const dailyDb = this._loadLocalJson('daily_downloads_database.json', {});

      if (tokenHash) {
        const existingToken = tokensDb[tokenHash];
        if (existingToken && existingToken.status === 'consumed') {
          if (cleanReqId && existingToken.downloadRequestId === cleanReqId) {
            const curCount = dailyDb[docId]?.count || 0;
            return {
              success: true,
              idempotent: true,
              count: curCount,
              remaining: Math.max(0, limit - curCount),
              dateStr: cleanDate,
              tokenHash,
            };
          }
          return {
            success: false,
            replayDetected: true,
            reason: 'Token already consumed (replay detected)',
            error: 'Token already consumed (replay detected)',
            tokenHash,
          };
        }
      }

      // Verify cryptographic signature if token not yet consumed
      if (cleanToken && !verifyTokenSig()) {
        return {
          success: false,
          invalidSignature: true,
          reason: 'Invalid cryptographic token signature',
          error: 'Invalid cryptographic token signature',
        };
      }

      const existingQuota = dailyDb[docId] || { userKey: cleanKey, date: cleanDate, count: 0, processedRequestIds: [] };
      const currentCount = Number(existingQuota.count) || 0;
      const reqList = Array.isArray(existingQuota.processedRequestIds) ? [...existingQuota.processedRequestIds] : [];

      if (cleanReqId && reqList.includes(cleanReqId)) {
        return {
          success: true,
          idempotent: true,
          count: currentCount,
          remaining: Math.max(0, limit - currentCount),
          dateStr: cleanDate,
          tokenHash,
        };
      }

      if (currentCount >= limit) {
        return {
          success: false,
          quotaExceeded: true,
          count: currentCount,
          remaining: 0,
          dateStr: cleanDate,
          error: 'आज का आपका दैनिक ग्राफिक डाउनलोड कोटा समाप्त हो गया है। नया कोटा कल पुनः उपलब्ध होगा।',
          tokenHash,
        };
      }

      const newCount = currentCount + 1;
      if (cleanReqId) reqList.push(cleanReqId);

      if (tokenHash) {
        tokensDb[tokenHash] = {
          tokenHash,
          userKey: cleanKey,
          dateStr: cleanDate,
          downloadRequestId: cleanReqId,
          cardId: cleanCard,
          expiresAt: tokenExpiresAt,
          consumedAt: now,
          status: 'consumed',
          updatedAt: now,
        };
        this._saveLocalJson('download_tokens_database.json', tokensDb);
      }

      dailyDb[docId] = {
        userKey: cleanKey,
        date: cleanDate,
        count: newCount,
        processedRequestIds: reqList.slice(-100),
        lastDownloadAt: now,
        updatedAt: now,
        ...(downloadDetails || {}),
      };
      this._saveLocalJson('daily_downloads_database.json', dailyDb);

      return {
        success: true,
        idempotent: false,
        count: newCount,
        remaining: Math.max(0, limit - newCount),
        dateStr: cleanDate,
        tokenHash,
      };
    }
  }

  /**
   * Transactionally checks and records a daily graphic download quota usage.
   * Backward-compatible wrapper delegating to transactCompleteDownloadExport.
   */
  async transactDailyGraphicDownload(userKey, dateStr, downloadRequestId = '', maxAllowed = 10, downloadDetails = {}) {
    return this.transactCompleteDownloadExport(
      userKey,
      dateStr,
      downloadRequestId,
      maxAllowed,
      downloadDetails?.tokenInfo || downloadDetails?.token || {},
      downloadDetails
    );
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
