// 地點搜尋、路線（OSRM）、Google 地圖導航連結
// 搜尋同時查三個免費服務再合併：Nominatim（OSM）、Photon（模糊搜尋）、日本國土地理院（日本地址）
// 也可以直接輸入經緯度，或貼上 Google 地圖網址。

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const lang = 'zh-TW,zh,en';

const toRad = d => (d * Math.PI) / 180;
const km = (a, b) => {
  const s = Math.sin(toRad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(s));
};
const valid = (lat, lng) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// 「35.38, 136.94」或 Google 地圖網址 -> { lat, lng }
export function parseCoords(text) {
  const s = text.trim();
  let m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) ||
    s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
    s.match(/[?&](?:q|query|ll|destination|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i) ||
    s.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,，\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (m && valid(+m[1], +m[2])) return { lat: +m[1], lng: +m[2] };
  return null;
}

// 中文常見寫法 -> 日文寫法（日本地圖資料多半是日文或英文）
const jpVariant = q => q.replace(/(火車站|車站|站)$/, '駅').replace(/機場$/, '空港').replace(/捷運|地鐵/, '');

const cleanQuery = q => q
  .replace(/〒?\s*\d{3}-?\d{4}/g, ' ') // 郵遞區號
  .replace(/^日本(国|國)?\s*/, '')
  .replace(/\s+/g, ' ')
  .trim();

async function nominatim(q, near) {
  const p = new URLSearchParams({ format: 'jsonv2', q, limit: '6', 'accept-language': lang });
  if (near) {
    const d = 0.5;
    p.set('viewbox', [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(','));
  }
  const r = await fetch(`${NOMINATIM}/search?${p}`);
  if (!r.ok) return [];
  return (await r.json()).map(x => ({
    name: x.name || x.display_name.split(',')[0], address: x.display_name, lat: +x.lat, lng: +x.lon,
  }));
}

async function photon(q, near) {
  const p = new URLSearchParams({ q, limit: '6' });
  if (near) { p.set('lat', near.lat); p.set('lon', near.lng); }
  const r = await fetch(`https://photon.komoot.io/api/?${p}`);
  if (!r.ok) return [];
  return (await r.json()).features.map(f => {
    const x = f.properties;
    const addr = [x.name, x.street && `${x.street}${x.housenumber || ''}`, x.locality || x.district, x.city, x.state, x.country]
      .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    return { name: x.name || x.street || x.city, address: addr, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
  });
}

async function gsiJapan(q) {
  const r = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`);
  if (!r.ok) return [];
  return (await r.json()).slice(0, 5).map(f => ({
    name: f.properties.title, address: '日本 ' + f.properties.title + '（地址）',
    lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
  }));
}

export async function searchPlaces(raw, near) {
  const c = parseCoords(raw);
  if (c) return [{ name: `座標 ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`, address: '依經緯度標註', ...c }];
  if (/maps\.app\.goo\.gl|goo\.gl\/maps/.test(raw)) {
    throw new Error('Google 地圖的「分享短網址」無法直接讀取，請在 Google 地圖長按地點，複製上方出現的經緯度貼過來');
  }
  const q = cleanQuery(raw);
  if (!q) return [];
  const alt = jpVariant(q);
  const looksJpAddress = /[都道府県市区町村郡]|丁目|番地?|\d+-\d+/.test(q);
  const safe = p => p.catch(() => []);
  const lists = await Promise.all([
    safe(nominatim(q, near)),
    safe(photon(alt, near)),
    alt !== q ? safe(photon(q, near)) : [],
    looksJpAddress ? safe(gsiJapan(q)) : [],
  ]);
  // 合併、去重（100 公尺內同名視為同一個）
  const out = [];
  for (const r of lists.flat()) {
    if (!r.name || !valid(r.lat, r.lng)) continue;
    if (out.some(o => km(o, r) < 0.1 && (o.name === r.name || km(o, r) < 0.02))) continue;
    out.push(r);
  }
  // 附近（300 公里內）的排前面
  if (near) {
    out.forEach((r, i) => { r._k = (km(near, r) < 300 ? 0 : 1e6) + i; });
    out.sort((a, b) => a._k - b._k);
  }
  return out.slice(0, 10);
}

export async function reverseGeocode(lat, lng) {
  try {
    const p = new URLSearchParams({ format: 'jsonv2', lat, lon: lng, zoom: '18', 'accept-language': lang });
    const r = await fetch(`${NOMINATIM}/reverse?${p}`);
    const x = await r.json();
    return { name: x.name || x.display_name?.split(',')[0] || '標註的地點', address: x.display_name || '' };
  } catch {
    return { name: '標註的地點', address: '' };
  }
}

export const TRAVEL_MODES = [
  ['foot', '🚶 步行'],
  ['bike', '🚲 自行車'],
  ['car', '🚗 開車'],
  ['transit', '🚇 大眾運輸'],
];

export async function route(from, to, mode) {
  const url = `https://routing.openstreetmap.de/routed-${mode}/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('找不到路線');
  const best = data.routes[0];
  return { geometry: best.geometry, distance: best.distance, duration: best.duration };
}

export function googleMapsDirections(from, to, mode) {
  const travelmode = { foot: 'walking', bike: 'bicycling', car: 'driving', transit: 'transit' }[mode] || 'transit';
  const p = new URLSearchParams({ api: '1', destination: `${to.lat},${to.lng}`, travelmode });
  if (from) p.set('origin', `${from.lat},${from.lng}`);
  return `https://www.google.com/maps/dir/?${p}`;
}

export function googleMapsPlace(p) {
  const q = p.lat != null ? `${p.lat},${p.lng}` : p.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export const googleMapsSearch = q => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || '')}`;

export const fmtDist = m => (m >= 1000 ? (m / 1000).toFixed(1) + ' 公里' : Math.round(m) + ' 公尺');
export const fmtDur = s => {
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} 小時 ${m % 60} 分` : `${m} 分鐘`;
};
