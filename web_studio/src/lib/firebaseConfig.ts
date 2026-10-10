/**
 * Firebase Configuration & Cloud Sync for AI News Maker
 * Project: ai-news-maker-app
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

export const FIREBASE_CONFIG = firebaseConfig;

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore with custom database ID from config
export const db = getFirestore(
  app,
  (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd'
);
export const auth = getAuth(app);

// Direct HTTP Endpoints for Firebase Storage Database
export const FIREBASE_STORAGE_NEWS_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_CONFIG.storageBucket}/o/news_database.json?alt=media`;
export const FIREBASE_STORAGE_UPLOAD_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_CONFIG.storageBucket}/o?name=news_database.json`;

// Realtime Database Endpoint for direct backup / sync
export const FIREBASE_RTDB_NEWS_URL = `https://ai-news-maker-app-default-rtdb.firebaseio.com/news_database.json`;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore offline mode active.");
    }
  }
}

// Automatically test connection upon module load
testConnection();

/**
 * Fetch latest news posts from Firebase Storage
 */
export async function fetchNewsFromFirebase(): Promise<any[] | null> {
  try {
    const res = await fetch(`${FIREBASE_STORAGE_NEWS_URL}&_t=${Date.now()}`, {
      cache: 'no-cache',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('Firebase Storage fetch news error:', err);
  }

  // Fallback to Firebase Realtime Database
  try {
    const rtdbRes = await fetch(`${FIREBASE_RTDB_NEWS_URL}?_t=${Date.now()}`);
    if (rtdbRes.ok) {
      const rtdbData = await rtdbRes.json();
      if (Array.isArray(rtdbData)) return rtdbData;
    }
  } catch (err) {
    console.warn('Firebase RTDB fetch news error:', err);
  }

  return null;
}

/**
 * Upload latest news database to Firebase Storage
 */
export async function uploadNewsToFirebase(newsPosts: any[]): Promise<boolean> {
  let success = false;
  try {
    const res = await fetch(FIREBASE_STORAGE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newsPosts, null, 2),
    });
    success = res.ok;
  } catch (err) {
    console.warn('Firebase Storage upload news error:', err);
  }

  // Also sync to Realtime Database if accessible
  try {
    await fetch(FIREBASE_RTDB_NEWS_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newsPosts),
    });
  } catch {
    // optional RTDB sync
  }

  return success;
}
