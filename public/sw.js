/*
 * Service worker: lets the app open offline and install as a standalone app.
 *
 * Strategy
 * - Pages (navigations): network first, falling back to the cached app shell when offline.
 * - Same-origin files: stale-while-revalidate (serve the cached copy, refresh it in the background).
 * - Everything else (other origins, non-GET, extensions): left to the browser.
 *
 * Robustness / pitfalls guarded against
 * - Only successful (200) basic/CORS responses are cached, so an error page is never served as the app.
 * - Cache writes are wrapped in try/catch: a full disk or private mode must never break loading.
 * - Old cache versions are deleted on activate, and within one version the cache keeps at most MAX_ENTRIES files
 *   (the longest unused go first). Every release has new hashed file names, so without a limit the files of old
 *   releases would pile up in the same cache.
 * - Only same-origin responses are cached, never those of other origins.
 * - The user's tasks live in localStorage and are never touched here.
 */
// v2: the app no longer uses web fonts. Bumping the name makes `activate` delete the v1 cache,
// including the Google Fonts files it kept.
const CACHE = 'done-shell-v2';

self.addEventListener('install', (event) => {
  // Pre-cache the shell so a first offline start works; failures here must not block installation.
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(['./', 'manifest.webmanifest', 'icon.svg', 'icon-192.png']))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// More than one release's worth of files, so a tab still open on the previous release can find its own chunks
const MAX_ENTRIES = 120;

async function putInCache(request, response) {
  try {
    const cache = await caches.open(CACHE);
    await cache.put(request, response); // a refreshed file moves to the end of the list
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map((key) => cache.delete(key)));
  } catch {
    // Quota exceeded or storage unavailable: serving still works, just without caching
  }
}

/*
 * A click on a reminder notification: bring the app to the front and tell it which task to open. If the app is not
 * open, open it with the task in the address (?task=...), which the app reads on start and removes again.
 *
 * Robustness / pitfalls guarded against:
 * - The notification is always closed first, so a click can't leave it stuck on screen if anything below fails.
 * - A window that can't be focused or a message that can't be sent falls back to opening a new window.
 * - A notification without a task (the "N reminders" summary) just brings the app forward.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  const taskId = data && typeof data.taskId === 'string' ? data.taskId : null;

  event.waitUntil((async () => {
    try {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const target = windows.find((client) => 'focus' in client);
      if (target) {
        await target.focus();
        if (taskId) target.postMessage({ type: 'open-task', taskId });
        return;
      }
    } catch {
      // fall through and open a new window
    }
    await self.clients.openWindow(taskId ? './?task=' + encodeURIComponent(taskId) : './');
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) putInCache('./', response.clone());
          return response;
        })
        .catch(() => caches.match('./').then((cached) => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const refresh = fetch(request)
        .then((response) => {
          if (response.ok) putInCache(request, response.clone());
          return response;
        })
        .catch(() => cached || Response.error());
      return cached || refresh;
    })
  );
});
