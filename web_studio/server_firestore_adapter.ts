/**
 * Server-Side Firestore Integration Module for AI News Maker
 * Project: ai-news-maker-app
 * Database: ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd
 *
 * Implements resilient Dual-Read/Dual-Write adapter architecture:
 * 1. Checks Application Default Credentials (ADC) from environment
 * 2. Attempts Cloud Firestore read/write
 * 3. Safely falls back to local JSON database when permissions are missing
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = null;
try {
  const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  }
} catch {
  // ignore
}

const PROJECT_ID = firebaseConfig?.projectId || 'ai-news-maker-app';
const DATABASE_ID = firebaseConfig?.firestoreDatabaseId || 'ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd';

export async function getMetadataAccessToken(): Promise<string | null> {
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

export async function getRuntimeServiceAccount(): Promise<string> {
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

function toFirestoreField(val: any): any {
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
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreField(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export async function firestoreWriteDoc(collection: string, docId: string, data: Record<string, any>): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const token = await getMetadataAccessToken();
  if (!token) return { success: false, error: 'No access token available' };

  const fields: Record<string, any> = {};
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

export async function firestoreReadDoc(collection: string, docId: string): Promise<{ success: boolean; data?: any; statusCode?: number; error?: string }> {
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
              resolve({ success: true, data: parsed, statusCode: res.statusCode });
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
