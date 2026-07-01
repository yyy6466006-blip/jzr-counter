const CACHE_NAME = 'jzr-counter-v2';
const ASSETS = [
  './index.html',
  './manifest.json'
];

// 安裝時預先快取所有資源
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

// fetch 策略：快取優先（Cache First）
// 有快取 → 直接回傳快取，不發網路請求（完全離線可用）
// 無快取 → 嘗試網路，成功後存入快取
// 網路失敗 → fallback 到 index.html
self.addEventListener('fetch', e => {
  // 只處理 GET 請求
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // 有快取就直接用，不去網路（離線優先）
        return cached;
      }
      // 沒快取才去網路
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
