import React from 'react';

/**
 * Lazy import with automatic retry on chunk loading failure.
 * When Vite deploys a new build, obsolete chunks 404 on clients with stale HTML.
 * This wrapper catches 'Failed to fetch dynamically imported module' and reloads the page seamlessly.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  chunkName?: string
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const key = `chunk_refreshed_${chunkName || 'common'}`;
    const hasRefreshed = sessionStorage.getItem(key) === 'true';

    try {
      const component = await factory();
      sessionStorage.removeItem(key);
      return component;
    } catch (err: any) {
      const message = err?.message || '';
      const isChunkFailure =
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Loading chunk') ||
        message.includes('error loading dynamically imported module');

      if (isChunkFailure && !hasRefreshed) {
        sessionStorage.setItem(key, 'true');
        // Clear caches and reload to get new index.html with valid hashes
        try {
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((c) => caches.delete(c)));
          }
        } catch {}
        window.location.reload();
        return new Promise(() => {}); // Suspend forever while page reloads
      }

      throw err;
    }
  });
}
