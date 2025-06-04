const CACHE_NAME = 'trace-gps-pwa-cache-v2'; // Incrémenter la version si vous changez les fichiers cachés
const urlsToCache = [
    '.', // Alias pour index.html
    'index.html',
    'manifest.json', // Mettre en cache le manifest
    // Icônes (si vous les avez)
    'icon-192x192.png',
    'icon-512x512.png',
    // Ressources externes (Leaflet)
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
];

self.addEventListener('install', event => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('[ServiceWorker] Failed to cache app shell:', error);
            })
    );
});

self.addEventListener('activate', event => {
    console.log('[ServiceWorker] Activate');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('[ServiceWorker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim(); // Permet au SW activé de prendre le contrôle immédiatement
});

self.addEventListener('fetch', event => {
    // console.log('[ServiceWorker] Fetch', event.request.url);
    // Stratégie: Cache d'abord, puis réseau (Cache First)
    // Utile pour les ressources statiques de l'application
    if (urlsToCache.includes(event.request.url) || (event.request.url.startsWith(self.location.origin) && (event.request.url.endsWith('.png') || event.request.url.endsWith('.jpg')))) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request).then(fetchResponse => {
                        // Optionnel: Mettre en cache les nouvelles ressources accédées
                        // if (event.request.method === 'GET') {
                        //     return caches.open(CACHE_NAME).then(cache => {
                        //         cache.put(event.request, fetchResponse.clone());
                        //         return fetchResponse;
                        //     });
                        // }
                        return fetchResponse;
                    });
                })
                .catch(error => {
                    console.error('[ServiceWorker] Error fetching from cache/network:', error);
                    // Fournir une page de fallback si nécessaire
                })
        );
    } else if (event.request.url.startsWith('https://wxs.ign.fr/') || event.request.url.startsWith('https://tile.openstreetmap.org/')) {
        // Stratégie: Réseau d'abord, puis cache (Network First) pour les tuiles de carte
        // Cela garantit des tuiles à jour si connecté, sinon utilise le cache.
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Si la requête réussit, mettre en cache la réponse et la retourner
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME + '-tiles') // Cache séparé pour les tuiles
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                })
                .catch(() => {
                    // Si le réseau échoue, essayer de récupérer depuis le cache
                    return caches.match(event.request);
                })
        );
    } else {
        // Pour les autres requêtes, utiliser la stratégie par défaut du navigateur (réseau uniquement)
        event.respondWith(fetch(event.request));
    }
});