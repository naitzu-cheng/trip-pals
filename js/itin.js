// 行程排序：行程頁和地圖共用同一套順序與編號
import { daysBetween } from './ui.js';

export const DAY_COLORS = ['#4c6ef5', '#f76707', '#37b24d', '#d6336c', '#7048e8', '#1098ad', '#f59f00', '#495057'];

// 同一天內的順序：position（手動排序）→ 建立時間
export const byPosition = (a, b) =>
  (a.position ?? 1e12) - (b.position ?? 1e12) || String(a.created_at).localeCompare(String(b.created_at));

// 依天分組：[{ day, dayNo, color, items }]，未排日期的放最後
export function groupStops(stops, trip) {
  const days = daysBetween(trip.start_date, trip.end_date);
  const extra = [...new Set(stops.map(s => s.day).filter(d => d && !days.includes(d)))].sort();
  const all = [...days, ...extra];
  const groups = all.map((day, i) => ({
    day,
    dayNo: days.includes(day) ? days.indexOf(day) + 1 : null,
    color: DAY_COLORS[i % DAY_COLORS.length],
    items: stops.filter(s => s.day === day).sort(byPosition),
  }));
  const undated = stops.filter(s => !s.day).sort(byPosition);
  if (undated.length || !groups.length) groups.push({ day: null, dayNo: null, color: '#868e96', items: undated });
  return groups;
}

// 地圖圖釘的標籤：「天-第幾個」，例如 1-2
export function stopLabel(group, i) {
  return group.day ? `${group.dayNo ?? '+'}-${i + 1}` : `${i + 1}`;
}

// 把一天的新順序寫回 position（只更新有變的）
export async function saveOrder(store, items) {
  for (let i = 0; i < items.length; i++) {
    const pos = (i + 1) * 1000;
    if (items[i].position !== pos) await store.put('itinerary', { ...items[i], position: pos });
  }
}
