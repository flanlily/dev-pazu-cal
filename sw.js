self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open('app-cache').then(function(cache) {
      return cache.addAll([
        './',
        './index.html',
        './style.css',
        './dungeonData.json',
        './pad_experience_data.json'
      ]);
    })
  );
});
self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(response) {
      return response || fetch(e.request);
    })
  );
});