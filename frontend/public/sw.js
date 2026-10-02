// Service Worker for EL KAROOZ School PWA
//
// There is deliberately no fetch handler here. A cache-first strategy over an
// authenticated app serves one user's rendered pages to the next person on a shared
// device, and a network-first strategy adds latency to every navigation for no offline
// benefit, because the app's content is all live database reads. So this worker does
// one thing -- install the shell and display push notifications -- and leaves the
// network alone.
const CACHE_NAME = 'elkarooz-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  // The small icon rather than /logo.png. The master logo is 264 KB, and a precache is
  // paid on every install on a metered mobile connection; the 512 icon is 83 KB and is
  // the largest asset the install actually needs.
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push Notification Handler
self.addEventListener('push', (event) => {
  // event.data.json() throws on a payload that is not valid JSON, and a push payload
  // is attacker-influenceable in the sense that a malformed one -- or a future server
  // bug -- would otherwise take down the handler and silently drop the notification. A
  // notification is worth showing even with no payload, so this degrades instead of
  // failing.
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = {};
  }

  const options = {
    body: data.body || 'إشعار جديد من مدرسة الكاروز',
    // icon/badge must be square or the platform letterboxes them. /logo.png is
    // 723x1024, which renders as a small image with bars, so use the generated square.
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192-maskable.png',
    dir: 'rtl',
    lang: 'ar',
    // Only same-origin relative paths. An absolute URL from the push payload would let
    // a notification open an arbitrary origin, and a javascript: URL here is a stored
    // XSS against every user who taps the notification.
    data: {
      url: safeNotificationUrl(data.action_url)
    }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'مدرسة الكاروز', options)
  );
});

/**
 * Constrain a notification's target to this origin.
 *
 * Anything that is not a plain relative path -- an absolute URL, a protocol-relative
 * '//evil.test', a 'javascript:' payload, or a value that resolves outside the app --
 * falls back to the root. The notification click handler opens this as a window, so an
 * unchecked value is a direct path to an attacker-controlled page or to script running
 * in our own origin.
 */
function safeNotificationUrl(candidate) {
  if (typeof candidate !== 'string' || candidate === '') return '/';
  // Reject scheme-relative and absolute URLs outright; only in-app paths are allowed.
  if (candidate.startsWith('//') || candidate.includes('://')) return '/';
  if (!candidate.startsWith('/')) return '/';
  // Control characters would allow 'java\0script:' style smuggling through the check.
  if (/[\x00-\x1f\x7f]/.test(candidate)) return '/';
  return candidate;
}

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
