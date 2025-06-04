self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('gps-tracker-v1').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/icon.png',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});