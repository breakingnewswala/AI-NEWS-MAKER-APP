/**
 * Firebase Configuration & Cloud Sync for AI News Maker
 * Project: ai-news-maker-app
 */

export const FIREBASE_CONFIG = {
  projectId: "ai-news-maker-app",
  appId: "1:401033199805:android:cd2e59b0be2ae43bf5b7d4",
  apiKey: "AIzaSyDs4k9_UXdPIN2KPP83XfQwwotl934fvec",
  authDomain: "ai-news-maker-app.firebaseapp.com",
  storageBucket: "ai-news-maker-app.firebasestorage.app",
  messagingSenderId: "401033199805",
};

// Direct HTTP Endpoints for Firebase Storage Database
export const FIREBASE_STORAGE_NEWS_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_CONFIG.storageBucket}/o/news_database.json?alt=media`;
export const FIREBASE_STORAGE_UPLOAD_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_CONFIG.storageBucket}/o?name=news_database.json`;

/**
 * Fetch latest news posts from Firebase Storage
 */
export async function fetchNewsFromFirebase(): Promise<any[] | null> {
  try {
    const res = await fetch(`${FIREBASE_STORAGE_NEWS_URL}&_t=${Date.now()}`, {
      cache: 'no-cache',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch (err) {
    console.warn('Firebase fetch news error:', err);
    return null;
  }
}

/**
 * Upload latest news database to Firebase Storage
 */
export async function uploadNewsToFirebase(newsPosts: any[]): Promise<boolean> {
  try {
    const res = await fetch(FIREBASE_STORAGE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newsPosts, null, 2),
    });
    return res.ok;
  } catch (err) {
    console.warn('Firebase upload news error:', err);
    return false;
  }
}
