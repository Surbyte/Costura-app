const CACHE = 'costura-v2';
const ASSETS = [
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/xport.js',
  'js/db.js',
  'js/router.js',
  'js/pages/home.js',
  'js/pages/clients.js',
  'js/pages/orders.js',
  'js/pages/finance.js',
  'js/pages/inventory.js',
  'js/pages/appointments.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => new Response('Offline', {status: 503})))
  );
});
