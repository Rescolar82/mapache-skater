self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open('raccoon-v1').then(c=>c.addAll([
      './','index.html',
      'assets/background.png','assets/raccoon.png','assets/cat.png','assets/nes.png',
      'manifest.webmanifest'
    ]))
  );
});
self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
