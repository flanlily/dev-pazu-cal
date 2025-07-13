// service-worker.js (sw.js)

// ===== 1. キャッシュ設定 =====
const CACHE_NAME = 'pdc-tool-cache-v1';
// キャッシュするファイルのリスト
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './dungeonData.json',
  './pad_experience_data.json',
  './manifest.json'
  // アイコンのパスも追加するとより安定します
  // '.1752417950426.png' 
];


// ===== 2. インストール時の処理 (キャッシング) =====
self.addEventListener('install', event => {
  console.log('Service Worker: インストールされました');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
  );
  // 新しいサービスワーカーをすぐに有効化する
  self.skipWaiting();
});


// ===== 3. 有効化時の処理 (古いキャッシュの削除) =====
self.addEventListener('activate', event => {
    console.log('Service Worker: アクティブになりました');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    // このプロジェクトのキャッシュ以外は削除
                    return cacheName.startsWith('pdc-tool-cache-') && cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});


// ===== 4. フェッチ時の処理 (キャッシュ優先) =====
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュがあればそれを返す
        if (response) {
          return response;
        }
        // キャッシュがなければネットワークから取得する
        return fetch(event.request);
      })
  );
});


// ===== 5. プッシュ通知受信時の処理 =====
self.addEventListener('push', event => {
    console.log('Service Worker: プッシュ通知を受信しました');

    // 通知で表示するデータを取得（なければデフォルト値）
    const data = event.data ? event.data.json() : {
        title: 'PDC非対応計算ツール',
        body: '新しいお知らせがあります！',
        icon: './icon-0710.png' // PWAのアイコンパス
    };

    // 通知オプション
    const options = {
        body: data.body,
        icon: data.icon,
        badge: './icon-0710.png' // Androidで表示される小さなバッジアイコン
    };

    // 通知を表示する
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 通知がクリックされたときの処理
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: 通知がクリックされました');
    event.notification.close(); // 通知を閉じる
    
    // アプリのウィンドウを開く、または既存のウィンドウにフォーカスする
    event.waitUntil(
        clients.openWindow('/') // クリック時に開くURL
    );
});
