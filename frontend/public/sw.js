// Service Worker for EL KAROOZ School PWA
//
// PRECISION REQUIRED: this worker has exactly two jobs.
//
// 1. The encyclopedia dataset under /storage/bible-dataset/ is immutable,
//    versioned, public data served as static .gz. It is served cache-first and
//    served to the Cache Storage API. That is what keeps 173 MB of Bible
//    content off Vercel's bandwidth: after the first visit a reader fetches
//    nothing from the CDN at all, and the whole encyclopedia works offline.
//
// 2. Everything else in the app is a live authenticated database read. It
//    deliberately has NO fetch handler. A cache-first strategy there would
//    serve one user's rendered pages to the next person on a shared device,
//    and network-first would add latency for no offline benefit. So the
//    authenticated surface is left alone -- this worker never intercepts it.
//
// The scoping is enforced by an explicit path prefix test, not by a broad
// matcher, so a new authenticated route cannot accidentally fall into the
// dataset cache.
const CACHE_NAME = 'elkarooz-shell-v2';
const DATASET_CACHE = 'elkarooz-bible-v1';
const DATASET_PREFIX = '/storage/bible-dataset/';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  // The small icon rather than /logo.png. The master logo is 264 KB, and a precache is
  // paid on every install on a metered mobile connection; the 512 icon is 83 KB and is
  // the largest asset the install actually needs.
  '/icons/icon-512x512.png'
];

function isDatasetRequest(url) {
  return url.origin === self.location.origin && url.pathname.startsWith(DATASET_PREFIX);
}

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
          // Keep the dataset cache across versions -- it is versioned by path,
          // so an old one is never stale. Everything else is rebuilt.
          if (key !== CACHE_NAME && key !== DATASET_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/**
 * Encyclopedia dataset: cache-first, then fill the cache in the background.
 *
 * Cache-first is safe here because these files never change under a given path
 * (the dataset version is part of the path). It is what makes repeat browsing
 * free of Vercel bandwidth charges.
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (err) {
    return;
  }
  if (!isDatasetRequest(url)) return; // everything else: untouched

  event.respondWith(
    caches.open(DATASET_CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;

      const res = await fetch(req);
      // Opaque/error responses must not be written to the cache, or a failed
      // request would be pinned as a permanent miss forever.
      if (res && res.status === 200 && res.type !== 'opaque') {
        cache.put(req, res.clone());
      }
      return res;
    })
  );
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
