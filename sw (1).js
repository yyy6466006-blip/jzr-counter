const CACHE_VERSION = 'jzr-counter-v3-2026061601';
const ASSETS = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 策略：快取優先，零延遲開啟（離線優先）；同時背景悄悄更新快取供下次使用
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => null);

      if (cached) {
        // 有快取：立即回應快取，背景偷偷更新（不等待，不影響畫面）
        networkFetch;
        return cached;
      }
      // 沒快取（第一次造訪）：等網路回應，沒網路才退回 index.html
      return networkFetch.then(res => res || caches.match('./index.html'));
    })
  );
});
