import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import {LanguageProvider} from './lib/languageContext.tsx';
import {FolderClockIcon} from './icons/FolderClockIcon.tsx';
import './index.css';

// Absolute safeguard against runtime ReferenceError: FolderClock is not defined
try {
  (globalThis as any).FolderClock = FolderClockIcon;
  (globalThis as any).FolderClockIcon = FolderClockIcon;
  if (typeof window !== 'undefined') {
    (window as any).FolderClock = FolderClockIcon;
    (window as any).FolderClockIcon = FolderClockIcon;
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="एप्लिकेशन लोड करने में त्रुटि">
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Global fetch interceptor to append user identifier headers & handle blocked / trial-expired responses
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  try {
    const originalFetch = window.fetch.bind(window);
    const customFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const headers = new Headers(init?.headers);
      try {
        const savedAuth = localStorage.getItem('reporter_auth_session');
        if (savedAuth) {
          const parsed = JSON.parse(savedAuth);
          if (parsed?.email) headers.set('x-user-email', parsed.email);
          if (parsed?.userId || parsed?.uid) headers.set('x-user-id', parsed.userId || parsed.uid);
        }
      } catch {}

      const res = await originalFetch(input, { ...init, headers });
      if (res.status === 403) {
        try {
          const clone = res.clone();
          const data = await clone.json();
          if (data?.blocked || data?.isBlocked) {
            window.dispatchEvent(new CustomEvent('user_account_blocked', { detail: data }));
          } else if (data?.trialExpired) {
            window.dispatchEvent(new CustomEvent('user_trial_expired', { detail: data }));
          }
        } catch {}
      }
      return res;
    };

    const desc = Object.getOwnPropertyDescriptor(window, 'fetch') || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');
    const canDefine = !desc || desc.configurable || desc.writable || Boolean(desc.set);
    if (canDefine) {
      try {
        Object.defineProperty(window, 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true,
        });
      } catch {
        // Sandboxed window.fetch cannot be redefined. Skip silently.
      }
    }
  } catch (err) {
    console.warn('Global fetch interceptor skipped:', err);
  }
}

// Register PWA service worker for mobile installability and icon display
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration note:', err);
    });
  });
}

// Global PWA install prompt handler
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    (window as any).deferredPwaPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa_install_prompt_ready'));
  });
}

