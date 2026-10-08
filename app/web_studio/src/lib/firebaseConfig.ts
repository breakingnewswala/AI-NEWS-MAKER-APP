/**
 * Firebase Configuration & Cloud Sync for AI News Maker
 * Project: ai-news-maker-app
 */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBo9dbqeg-nmr5MTqqA068e7Xa-755HSO8",
  authDomain: "ai-news-maker-app.firebaseapp.com",
  databaseURL: "https://ai-news-maker-app-default-rtdb.firebaseio.com",
  projectId: "ai-news-maker-app",
  storageBucket: "ai-news-maker-app.firebasestorage.app",
  messagingSenderId: "401033199805",
  appId: "1:401033199805:web:f3a541f1dc51a2e1f5b7d4",
  measurementId: "G-J8JHSZMWWH"
};

// Direct HTTP Endpoints for Firebase Storage Database
export const FIREBASE_STORAGE_NEWS_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_CONFIG.storageBucket}/o/news_database.json?alt=media`;
export const FIREBASE_STORAGE_UPLOAD_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_CONFIG.storageBucket}/o?name=news_database.json`;

// Realtime Database Endpoint for direct backup / sync
export const FIREBASE_RTDB_NEWS_URL = `${FIREBASE_CONFIG.databaseURL}/news_database.json`;

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
