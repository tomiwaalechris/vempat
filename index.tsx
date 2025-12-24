
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline support (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('Service worker registered.', reg);

      // Try to register a one-off background sync when supported
      if ('sync' in reg) {
        try {
          (reg as any).sync.register('sync-queue').then(() => {
            console.log('Background sync registered: sync-queue');
          }).catch((e: any) => console.warn('Background sync register failed', e));
        } catch (e) {
          // ignore
        }
      }
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

// Periodic sync: attempt to flush local queue every 60s while app is running
import { syncNow } from './src/services/repository';
import { remoteHandler } from './src/sync/remote';

async function tryPeriodicSync() {
  try {
    await syncNow(remoteHandler as any);
  } catch (err) {
    console.warn('Periodic sync failed', err);
  }
}

// Start timer
setInterval(() => {
  if (navigator.onLine) tryPeriodicSync();
}, 60_000);

// Listen for service worker messages to trigger immediate sync
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (evt) => {
    const data = (evt as MessageEvent).data || {};
    if (data && data.type === 'SYNC_QUEUE') {
      if (navigator.onLine) tryPeriodicSync();
    }
  });
}
