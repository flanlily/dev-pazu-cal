const CACHE_NAME = 'pdc-tool-cache-v2'; // キャッシュ名を変更して更新を促す
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './dungeonData.json',
  './pad_experience_data.json',
  './manifest.json',
  './announcements.json' // 新しいお知らせファイルもキャッシュ対象に
];

// インストール時の処理
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 有効化時の処理（古いキャッシュの削除）
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

// フェッチ時の処理（キャッシュ優先）
self.addEventListener('fetch', event => {
  // お知らせファイルは常にネットワークから取得し、キャッシュを更新する
  if (event.request.url.includes('announcements.json')) {
    event.respondWith(
      fetch(event.request).then(response => {
        // レスポンスをクローンして片方をキャッシュに保存
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // オフラインの場合はキャッシュから返す
        return caches.match(event.request);
      })
    );
    return;
  }
  
  // それ以外のリクエストはキャッシュを優先
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
