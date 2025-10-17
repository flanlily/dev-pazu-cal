const CACHE_NAME = 'pazu-cal-cache-v1';
// キャッシュするファイルのリスト
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js', // script.jsに変更
  '/style.css',
  '/manifest.json',
  '/dungeonData.json',
  '/pad_experience_data.json',
  '/announcements.json',
  '/media-list.json',
  // 注意: media_*.png ファイルは動的に増えるため、ここではキャッシュしない
];

// インストール処理
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// stale-while-revalidate 戦略
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // キャッシュがあればそれを返し、裏側でネットワークから新しいのを取得
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // リクエストが成功した場合のみキャッシュを更新
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
        // キャッシュがあればそれを返し、なければフェッチの結果を待つ
        return response || fetchPromise;
      });
    })
  );
});

// 古いキャッシュの削除
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
