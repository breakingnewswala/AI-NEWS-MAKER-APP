import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBo9dbqeg-nmr5MTqqA068e7Xa-755HSO8',
  authDomain: 'ai-news-maker-app.firebaseapp.com',
  projectId: 'ai-news-maker-app',
  storageBucket: 'ai-news-maker-app.firebasestorage.app',
  messagingSenderId: '401033199805',
  appId: '1:401033199805:web:053a5160cac80c4bf5b7d4',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export async function loginWithFirebaseGoogle(): Promise<{ email: string; name?: string; photoUrl?: string }> {
  try {
    const result = await signInWithPopup(firebaseAuth, googleAuthProvider);
    const user = result.user;
    if (!user || !user.email) {
      throw new Error('Google से ईमेल प्राप्त नहीं हो सका।');
    }
    return {
      email: user.email,
      name: user.displayName || undefined,
      photoUrl: user.photoURL || undefined,
    };
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked') {
      console.info('Popup blocked by browser, falling back to signInWithRedirect...');
      await signInWithRedirect(firebaseAuth, googleAuthProvider);
      return new Promise(() => {}); // Wait for redirect navigation
    }
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      throw new Error('Google साइन-इन रद्द कर दिया गया।');
    }
    throw error;
  }
}

export async function checkFirebaseRedirectResult(): Promise<{ email: string; name?: string; photoUrl?: string } | null> {
  try {
    const result = await getRedirectResult(firebaseAuth);
    if (result && result.user && result.user.email) {
      return {
        email: result.user.email,
        name: result.user.displayName || undefined,
        photoUrl: result.user.photoURL || undefined,
      };
    }
  } catch (err) {
    console.warn('Firebase redirect result err:', err);
  }
  return null;
}
