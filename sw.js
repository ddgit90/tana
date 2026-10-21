// オフラインで動かすための仕組み。
// ネットにつながっていれば毎回いちばん新しい版を取りに行き（更新がすぐ反映される）、
// つながらないときだけ保存しておいた版で起動する。
const CACHE = 'kura-v32';
const FILES = ['./', './index.html', './kura.css', './kura.js', './manifest.webmanifest', './icon.png'];

self.addEventListener('install', (e) => {
  // 古いファイルをつかまないよう、ブラウザの一時保存を通さずに取ってくる
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(req, { cache: 'no-cache', signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: true });
      return hit || (req.mode === 'navigate' ? c.match('./index.html') : Response.error());
    }
  })());
});
