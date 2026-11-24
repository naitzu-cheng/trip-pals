// 每日天氣：Open-Meteo（免費、不需要 key），只能查今天起 16 天內
const WMO = [
  [[0], '☀️', '晴'], [[1], '🌤️', '晴時多雲'], [[2], '⛅', '多雲'], [[3], '☁️', '陰'],
  [[45, 48], '🌫️', '霧'], [[51, 53, 55, 56, 57], '🌦️', '毛毛雨'], [[61, 63, 80, 81], '🌧️', '雨'],
  [[65, 82], '⛈️', '大雨'], [[66, 67], '🌧️', '凍雨'], [[71, 73, 75, 77, 85, 86], '❄️', '雪'], [[95, 96, 99], '⛈️', '雷雨'],
];
export function weatherIcon(code) {
  const w = WMO.find(([codes]) => codes.includes(code));
  return w ? { icon: w[1], label: w[2] } : { icon: '🌡️', label: '' };
}

const iso = d => d.toISOString().slice(0, 10);
const TTL = 3 * 3600e3;

// points: [{ day, lat, lng }] → { 'yyyy-mm-dd': { code, max, min, rain } }
export async function dailyWeather(points) {
  const today = new Date();
  const first = iso(today), last = iso(new Date(today.getTime() + 15 * 864e5));
  const wanted = points.filter(p => p.lat != null && p.day >= first && p.day <= last);
  // 同一個地區（約 10 公里）的天數合併成一次查詢
  const byLoc = new Map();
  for (const p of wanted) {
    const k = `${p.lat.toFixed(1)},${p.lng.toFixed(1)}`;
    if (!byLoc.has(k)) byLoc.set(k, []);
    byLoc.get(k).push(p.day);
  }
  const out = {};
  await Promise.all([...byLoc].map(async ([loc, days]) => {
    const data = await fetchLoc(loc, days.reduce((a, b) => a < b ? a : b), days.reduce((a, b) => a > b ? a : b));
    if (!data?.daily) return;
    const d = data.daily;
    d.time.forEach((day, i) => {
      if (days.includes(day)) {
        out[day] = { code: d.weather_code[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i], rain: d.precipitation_probability_max?.[i] };
      }
    });
  }));
  return out;
}

async function fetchLoc(loc, start, end) {
  const key = `trippals.wx.${loc}.${start}.${end}`;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(key) || 'null'); } catch { /* 壞掉就重抓 */ }
  if (cached && Date.now() - cached.t < TTL) return cached.data;
  const [lat, lng] = loc.split(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${start}&end_date=${end}`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (!data.daily) throw new Error('no data');
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), data }));
    return data;
  } catch {
    return cached?.data || null; // 離線就用舊的
  }
}
