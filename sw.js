// 離線快取：先抓網路，失敗就用快取
// - App 本身（含所有 js）安裝時就先存好，離線也打得開
// - 票券、回憶的圖片（Supabase 簽名網址）用「不含簽名」的網址存，離線也看得到
// - 地圖圖磚、天氣、匯率等 API 不在這裡快取（資料另外存在 IndexedDB / localStorage）
const CACHE = 'trippals-v16';
const SHELL = [
  './', 'index.html', 'css/style.css', 'icon.svg', 'manifest.webmanifest', 'js/config.js',
  'js/main.js', 'js/ui.js', 'js/store.js', 'js/consts.js', 'js/geo.js', 'js/map.js', 'js/avatar.js', 'js/hair.js', 'js/sdf.js',
  'js/images.js', 'js/itin.js', 'js/money.js', 'js/weather.js', 'js/export.js',
  'js/views/auth.js', 'js/views/avatar-editor.js', 'js/views/companions.js', 'js/views/itinerary.js', 'js/views/map-view.js',
  'js/views/notes.js', 'js/views/places.js', 'js/views/trips.js', 'js/views/plan.js', 'js/views/expenses.js',
  'js/views/bookings.js', 'js/views/memories.js',
];

self.addEventListener('install', e => {
  // 個別存，某個檔案失敗不會讓整個安裝失敗
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Supabase 私人圖片：網址每次簽名都不同，用路徑當快取 key
  if (url.pathname.includes('/storage/v1/object/sign/')) {
    const key = url.origin + url.pathname;
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
        return res;
      }).catch(() => caches.match(key)),
    );
    return;
  }

  const cacheable = url.origin === location.origin || /unpkg\.com|esm\.sh/.test(url.host);
  if (!cacheable) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' })),
  );
});
