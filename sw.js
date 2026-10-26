/**
 * विकीलिंक सहायक (WikiLink Assistant) — Offline-First Service Worker
 * Supports both root (/) and GitHub Pages subpath (/wikilink-tool/) deployments.
 */

const SHELL_CACHE_NAME = 'wikilink-shell-v6';
const WIKI_API_CACHE_NAME = 'wikilink-wiki-api-v6';
const STATIC_ASSET_CACHE_NAME = 'wikilink-static-v6';

const RELATIVE_WORKBENCH_ASSETS = [
  './',
  './index.html',
  './logs.html',
  './about.html',
  './login.html',
  './style.css',
  './words_blacklist.js',
  './app.js',
  './firebase-client.js',
  './firebase-applet-config.json',
  './manifest.json',
  './icon.svg',
  './apple-touch-icon.png',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png'
];

// 1. Install Event: Precache all core workbench files relative to Service Worker scope
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        RELATIVE_WORKBENCH_ASSETS.map(async (relPath) => {
          try {
            const fullUrl = new URL(relPath, self.registration.scope).href;
            const response = await fetch(fullUrl, { cache: 'default' });
            if (response && response.ok) {
              await cache.put(fullUrl, response.clone());
            }
          } catch (err) {
            // Ignore individual asset failure during install so SW still activates
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([
    SHELL_CACHE_NAME,
    WIKI_API_CACHE_NAME,
    STATIC_ASSET_CACHE_NAME
  ]);

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!allowedCaches.has(key)) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Helper: Build offline MediaWiki JSON fallback for batch title verification
function createOfflineMediaWikiFallback(requestUrl) {
  const parsed = new URL(requestUrl);
  const titlesParam = parsed.searchParams.get('titles') || '';
  const propParam = parsed.searchParams.get('prop') || '';

  // Batch candidate verification (prop=pageprops) -> mark candidates as locally valid offline
  if (propParam.includes('pageprops') && titlesParam) {
    const rawTitles = titlesParam
      .split('|')
      .map((t) => {
        try {
          return decodeURIComponent(t);
        } catch (e) {
          return t;
        }
      })
      .filter(Boolean);

    const pages = {};
    rawTitles.forEach((title, idx) => {
      const isDisambig =
        title.includes('(बहुविकल्पी)') || title.toLowerCase().includes('(disambiguation)');
      pages[String(idx + 1000)] = {
        pageid: idx + 1000,
        ns: 0,
        title,
        offlineVerified: true,
        ...(isDisambig ? { pageprops: { disambiguation: '' } } : {})
      };
    });

    return new Response(
      JSON.stringify({
        batchcomplete: '',
        offlineMode: true,
        query: {
          pages
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-WikiLink-Offline': 'true'
        }
      }
    );
  }

  // Summary REST endpoint fallback
  if (parsed.pathname.includes('/api/rest_v1/page/summary/')) {
    const titlePart = decodeURIComponent(parsed.pathname.split('/page/summary/')[1] || 'लेख');
    return new Response(
      JSON.stringify({
        title: titlePart.replace(/_/g, ' '),
        extract:
          'ऑफ़लाइन मोड सक्रिय है: इस कड़ी का लाइव विकिपीडिया सारांश इंटरनेट कनेक्शन पुनः जुड़ने पर स्वतः उपलब्ध होगा। कार्यपटल में स्थानीय कड़ीकरण व डिफ़ पूर्णतः सक्रिय हैं।',
        offlineMode: true
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-WikiLink-Offline': 'true'
        }
      }
    );
  }

  // Generic offline JSON response for other Wikipedia API calls
  return new Response(
    JSON.stringify({
      offlineMode: true,
      error: {
        code: 'offline',
        info: 'ऑफ़लाइन मोड: यह लेख कैश में उपलब्ध नहीं है। कृपया कच्चा विकिटेक्स्ट, नमूना लेख, या पूर्व-सहेजे गए लॉग्स का उपयोग करें।'
      }
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-WikiLink-Offline': 'true'
      }
    }
  );
}

// 3. Fetch Event: Offline-first workbench support
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip Firebase Firestore / Auth live RPC streams so Firebase SDK handles its own state
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('apis.google.com')
  ) {
    return;
  }

  // A. Wikipedia API & Proxy Requests -> Network-First + Cache + Offline Heuristic Fallback
  if (
    url.hostname.endsWith('wikipedia.org') ||
    url.pathname.includes('/api/wiki-proxy')
  ) {
    event.respondWith(
      caches.open(WIKI_API_CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return createOfflineMediaWikiFallback(request.url);
        }
      })
    );
    return;
  }

  // B. Google Fonts & External Firebase JS SDK Modules -> Cache-First with Network Fallback
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('www.gstatic.com')
  ) {
    event.respondWith(
      caches.open(STATIC_ASSET_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return new Response('', { status: 200 });
        }
      })
    );
    return;
  }

  // C. Same-Origin App Shell (HTML pages, app.js, words_blacklist.js, style.css, icons, manifest)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(SHELL_CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          const exactMatch = await cache.match(request, { ignoreSearch: true });
          if (exactMatch) return exactMatch;

          // Match by filename at end of path for subpath deployments (e.g. /wikilink-tool/login.html)
          const fileName = url.pathname.split('/').pop() || 'index.html';
          const scopedCandidateUrl = new URL(`./${fileName}`, self.registration.scope).href;
          const scopedMatch = await cache.match(scopedCandidateUrl, { ignoreSearch: true });
          if (scopedMatch) return scopedMatch;

          if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
            const indexUrl = new URL('./index.html', self.registration.scope).href;
            const indexFallback =
              (await cache.match(indexUrl, { ignoreSearch: true })) ||
              (await cache.match(self.registration.scope, { ignoreSearch: true }));
            if (indexFallback) return indexFallback;
          }

          return new Response('Offline — Resource not cached', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
      })
    );
  }
});

// 4. Message Channel for manual skipWaiting & offline cache status checks
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'GET_SW_STATUS' && event.ports && event.ports[0]) {
    caches.open(SHELL_CACHE_NAME).then(async (cache) => {
      const keys = await cache.keys();
      event.ports[0].postMessage({
        active: true,
        cacheName: SHELL_CACHE_NAME,
        cachedCount: keys.length
      });
    });
  }
});
