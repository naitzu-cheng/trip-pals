// 地點搜尋（Nominatim / OpenStreetMap）、路線（OSRM）、Google 地圖導航連結
// 這些都是免費公開服務，不需要 API key。

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const lang = 'zh-TW,zh,en';

export async function searchPlaces(q, near) {
  const p = new URLSearchParams({ format: 'jsonv2', q, limit: '8', 'accept-language': lang, addressdetails: '0' });
  if (near) {
    const d = 0.5; // 優先搜尋附近（約 50 公里），但不限制
    p.set('viewbox', [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(','));
  }
  const r = await fetch(`${NOMINATIM}/search?${p}`);
  if (!r.ok) throw new Error('搜尋失敗');
  const data = await r.json();
  return data.map(x => ({
    name: x.name || x.display_name.split(',')[0],
    address: x.display_name,
    lat: +x.lat,
    lng: +x.lon,
    type: x.type,
  }));
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

export const fmtDist = m => (m >= 1000 ? (m / 1000).toFixed(1) + ' 公里' : Math.round(m) + ' 公尺');
export const fmtDur = s => {
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} 小時 ${m % 60} 分` : `${m} 分鐘`;
};
