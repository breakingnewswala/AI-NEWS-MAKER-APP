/**
 * projectHistoryManager.ts
 *
 * Local Device Database for AI News Maker Project History.
 * Features:
 * - 100% device-local storage (IndexedDB with partitioned localStorage fallback)
 * - Strict partition by authenticated user UID (prevents multi-account leakage on shared device)
 * - Configurable expiration: 24 Hours or 48 Hours (Default: 48 Hours)
 * - Expiration calculated strictly from immutable creation time (createdAt)
 * - Automatic cleanup on app launch, visibility/resume, and before listing
 * - Manual single delete & Clear All History with confirmation
 * - Safe legacy history migration
 * - Never touches user files outside the private history cache
 */

export interface ProjectHistoryItem {
  id: string;
  userId: string;
  title: string;
  type: 'graphic' | 'video';
  category?: string;
  thumbnailUrl?: string;
  createdAt: number; // Immutable creation timestamp
  timestamp?: number; // Alias for createdAt for legacy component compatibility
  retentionHours: 24 | 48;
  expiresAt: number; // createdAt + (retentionHours * 3600 * 1000)
  status: 'exported' | 'generated' | 'draft';
  data?: any;
}

const DB_NAME = 'ai_news_maker_local_history_db';
const STORE_NAME = 'projects_history';
const DB_VERSION = 1;

function getSafeUserId(userId?: string | null): string {
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return 'anonymous_user';
  }
  return userId.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
}

// -------------------------------------------------------------
// RETENTION CONFIGURATION (24h or 48h, Default 48h)
// -------------------------------------------------------------
export function getHistoryRetentionHours(userId?: string | null): 24 | 48 {
  if (typeof window === 'undefined') return 48;
  try {
    const uid = getSafeUserId(userId);
    const saved = localStorage.getItem(`ai_news_maker_retention_hours_${uid}`);
    if (saved === '24') return 24;
    return 48;
  } catch {
    return 48;
  }
}

export function setHistoryRetentionHours(hours: 24 | 48, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const uid = getSafeUserId(userId);
    localStorage.setItem(`ai_news_maker_retention_hours_${uid}`, String(hours));
    window.dispatchEvent(new CustomEvent('ai_news_project_history_retention_changed', { detail: { hours } }));
  } catch (err) {
    console.warn('Failed to save history retention hours:', err);
  }
}

// -------------------------------------------------------------
// INDEXEDDB HELPERS
// -------------------------------------------------------------
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in this environment'));
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
        store.createIndex('user_created', ['userId', 'createdAt'], { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open history IndexedDB'));
  });
}

// -------------------------------------------------------------
// LOCALSTORAGE PARTITIONED FALLBACK (Used if IndexedDB fails)
// -------------------------------------------------------------
function getLsPartitionKey(userId?: string | null): string {
  const uid = getSafeUserId(userId);
  return `ai_news_maker_projects_history_v2_${uid}`;
}

function loadHistoryFromLocalStorage(userId?: string | null): ProjectHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getLsPartitionKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const list: ProjectHistoryItem[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveHistoryToLocalStorage(userId: string | null | undefined, items: ProjectHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getLsPartitionKey(userId);
    localStorage.setItem(key, JSON.stringify(items.slice(0, 100)));
  } catch (err) {
    console.warn('Failed to save history to localStorage partition:', err);
  }
}

// -------------------------------------------------------------
// AUTOMATIC CLEANUP (Removes records older than retention window)
// -------------------------------------------------------------
export async function cleanupExpiredHistory(userId?: string | null): Promise<number> {
  const uid = userId ? getSafeUserId(userId) : null;
  const now = Date.now();
  let deletedCount = 0;

  // 1. IndexedDB cleanup (all users if unauthenticated/app lifecycle, or specific user)
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = uid
        ? store.index('userId').openCursor(IDBKeyRange.only(uid))
        : store.openCursor();

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const item: ProjectHistoryItem = cursor.value;
          const expiresAt = item.expiresAt || (item.createdAt + (item.retentionHours || 48) * 3600 * 1000);
          if (now >= expiresAt) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      req.onerror = () => reject(req.error);
    });
  } catch (idbErr) {
    // Continue to fallback
  }

  // 2. LocalStorage partition cleanup
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (uid) {
        const lsItems = loadHistoryFromLocalStorage(uid);
        const activeItems = lsItems.filter((item) => {
          const expiresAt = item.expiresAt || (item.createdAt + (item.retentionHours || 48) * 3600 * 1000);
          const isExpired = now >= expiresAt;
          if (isExpired) deletedCount++;
          return !isExpired;
        });
        if (activeItems.length !== lsItems.length) {
          saveHistoryToLocalStorage(uid, activeItems);
        }
      } else {
        // App launch / lifecycle: clean all partition keys in localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('ai_news_maker_projects_history_v2_')) {
            try {
              const raw = localStorage.getItem(key);
              if (raw) {
                const list: ProjectHistoryItem[] = JSON.parse(raw);
                if (Array.isArray(list)) {
                  const active = list.filter((item) => {
                    const exp = item.expiresAt || (item.createdAt + (item.retentionHours || 48) * 3600 * 1000);
                    return now < exp;
                  });
                  if (active.length !== list.length) {
                    deletedCount += (list.length - active.length);
                    localStorage.setItem(key, JSON.stringify(active));
                  }
                }
              }
            } catch {}
          }
        }
      }
    }
  } catch {}

  if (deletedCount > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai_news_project_history_updated'));
  }

  return deletedCount;
}

// -------------------------------------------------------------
// LEGACY MIGRATION
// -------------------------------------------------------------
let hasMigratedLegacy = false;
export async function migrateLegacyHistory(userId?: string | null): Promise<void> {
  if (typeof window === 'undefined' || hasMigratedLegacy) return;
  hasMigratedLegacy = true;

  try {
    const legacyRaw = localStorage.getItem('ai_news_maker_projects_history_v1');
    if (!legacyRaw) return;

    const legacyList = JSON.parse(legacyRaw);
    if (!Array.isArray(legacyList) || legacyList.length === 0) return;

    const uid = getSafeUserId(userId);
    const retentionHours = getHistoryRetentionHours(uid);
    const now = Date.now();

    for (const old of legacyList) {
      const createdAt = typeof old.timestamp === 'number' ? old.timestamp : now;
      const expiresAt = createdAt + retentionHours * 3600 * 1000;
      if (now < expiresAt) {
        const migrated: ProjectHistoryItem = {
          id: old.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: uid,
          title: old.title || old.headline || old.category || 'समाचार प्रोजेक्ट',
          type: old.type === 'video' ? 'video' : 'graphic',
          category: old.category || 'ताज़ा खबर',
          thumbnailUrl: old.thumbnail || old.thumbnailUrl || '',
          createdAt,
          timestamp: createdAt,
          retentionHours,
          expiresAt,
          status: old.status || 'exported',
          data: old.data || old,
        };
        await saveProjectHistoryRecord(migrated);
      }
    }

    // After successful import into local partition, clean legacy unpartitioned key
    localStorage.removeItem('ai_news_maker_projects_history_v1');
  } catch (err) {
    console.warn('Legacy history migration warning:', err);
  }
}

// -------------------------------------------------------------
// CORE PERSISTENCE API
// -------------------------------------------------------------
export async function saveProjectHistoryRecord(item: ProjectHistoryItem): Promise<void> {
  // Always update localStorage partition first as sync backup
  const lsItems = loadHistoryFromLocalStorage(item.userId);
  const existingIdx = lsItems.findIndex((x) => x.id === item.id);
  if (existingIdx >= 0) {
    lsItems[existingIdx] = item;
  } else {
    lsItems.unshift(item);
  }
  saveHistoryToLocalStorage(item.userId, lsItems);

  // Then save to IndexedDB
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (idbErr) {
    // LocalStorage fallback already holds the data
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai_news_project_history_updated'));
  }
}

export async function addProjectToHistory(
  userId: string | null | undefined,
  entry: {
    id?: string;
    title: string;
    type: 'graphic' | 'video';
    category?: string;
    thumbnailUrl?: string;
    createdAt?: number;
    status?: 'exported' | 'generated' | 'draft';
    data?: any;
  }
): Promise<ProjectHistoryItem> {
  const uid = getSafeUserId(userId);
  const retentionHours = getHistoryRetentionHours(uid);
  const now = Date.now();
  const createdAt = entry.createdAt || now;
  const expiresAt = createdAt + retentionHours * 3600 * 1000;

  const item: ProjectHistoryItem = {
    id: entry.id || `proj_${now}_${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    title: entry.title || (entry.type === 'video' ? 'वीडियो प्रोजेक्ट' : 'ग्राफिक प्रोजेक्ट'),
    type: entry.type,
    category: entry.category,
    thumbnailUrl: entry.thumbnailUrl,
    createdAt,
    timestamp: createdAt,
    retentionHours,
    expiresAt,
    status: entry.status || 'exported',
    data: entry.data,
  };

  await saveProjectHistoryRecord(item);
  return item;
}

export async function getUserProjectHistory(userId?: string | null): Promise<ProjectHistoryItem[]> {
  const uid = getSafeUserId(userId);

  // 1. Run automatic cleanup before listing
  await cleanupExpiredHistory(uid).catch(() => 0);

  // 2. Migrate legacy history if not yet done
  await migrateLegacyHistory(uid).catch(() => {});

  // 3. Query from IndexedDB
  try {
    const db = await openDatabase();
    const items = await new Promise<ProjectHistoryItem[]>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const userIndex = store.index('userId');
      const req = userIndex.getAll(IDBKeyRange.only(uid));

      req.onsuccess = () => {
        const result: ProjectHistoryItem[] = req.result || [];
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });

    if (items.length > 0) {
      return items.sort((a, b) => b.createdAt - a.createdAt);
    }
  } catch (idbErr) {
    // Fall back to localStorage partition
  }

  const lsItems = loadHistoryFromLocalStorage(uid);
  return lsItems.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteProjectHistoryItem(userId: string | null | undefined, itemId: string): Promise<void> {
  const uid = getSafeUserId(userId);

  // 1. LocalStorage partition delete
  const lsItems = loadHistoryFromLocalStorage(uid);
  const filtered = lsItems.filter((i) => i.id !== itemId);
  saveHistoryToLocalStorage(uid, filtered);

  // 2. IndexedDB delete
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(itemId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai_news_project_history_updated'));
  }
}

export async function clearAllProjectHistory(userId?: string | null): Promise<void> {
  const uid = getSafeUserId(userId);

  // 1. LocalStorage partition clear
  saveHistoryToLocalStorage(uid, []);

  // 2. IndexedDB clear items for this user
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const userIndex = store.index('userId');
      const req = userIndex.openCursor(IDBKeyRange.only(uid));

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai_news_project_history_updated'));
  }
}

// -------------------------------------------------------------
// APP LIFECYCLE EVENT LISTENERS (Auto-cleanup on launch & resume)
// -------------------------------------------------------------
if (typeof window !== 'undefined') {
  // On visibilitychange (resumed/foregrounded)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      cleanupExpiredHistory().catch(() => 0);
    }
  });

  // On page focus
  window.addEventListener('focus', () => {
    cleanupExpiredHistory().catch(() => 0);
  });
}
