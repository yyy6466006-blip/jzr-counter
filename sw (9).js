const CACHE_NAME = 'jzr-counter-v4';
const ASSETS = [
  './index.html',
  './manifest.json'
];

// 安裝時預先快取
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 啟動時清除舊版快取
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 快取優先 + 背景更新（Stale While Revalidate）
// 有快取 → 立即回傳快取（離線可用），同時背景更新快取
// 無快取 → 去網路取
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(e.request).then(cached => {
        // 背景去網路更新快取（不等待）
        const fetchPromise = fetch(e.request).then(res => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            cache.put(e.request, res.clone());
            // 通知主頁面有新版本
            if (e.request.url.includes('index.html') || e.request.url.endsWith('/')) {
              self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({type: 'SW_UPDATED'}));
              });
            }
          }
          return res;
        }).catch(() => null);

        // 有快取就直接用，背景更新
        if (cached) return cached;
        // 沒快取就等網路
        return fetchPromise || caches.match('./index.html');
      });
    })
  );
});
