// 記帳：匯率、每個人的收支、誰該給誰多少
import { uid } from './store.js';

/* ---------- 匯率（open.er-api.com，免費、不需要 key） ---------- */
// 回傳 1 單位 from = 多少 to；查不到回傳 null（讓使用者自己填）
export async function fetchRate(from, to) {
  if (from === to) return 1;
  const key = `trippals.rate.${from}.${to}`;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const hit = JSON.parse(localStorage.getItem(key) || 'null');
    if (hit?.day === today) return hit.rate;
  } catch { /* 忽略壞掉的快取 */ }
  try {
    const r = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    const data = await r.json();
    const rate = data?.rates?.[to];
    if (!rate) throw new Error('no rate');
    localStorage.setItem(key, JSON.stringify({ day: today, rate }));
    return rate;
  } catch {
    // 離線：用上次查到的（就算不是今天的）
    try { return JSON.parse(localStorage.getItem(key) || 'null')?.rate ?? null; } catch { return null; }
  }
}

/* ---------- 參與分帳的人 ---------- */
// 雲端：旅程成員 + 沒用 App 的同行人；本機：自己 + 同行人
export function participants(app) {
  const { store, trip, companions, profile } = app;
  const people = store.mode === 'cloud'
    ? companions.map(c => ({ id: c.user_id, name: c.profile?.display_name || '夥伴', member: true }))
    : [{ id: store.userId, name: profile?.display_name || '我', member: true }];
  if (!people.some(p => p.id === store.userId)) people.unshift({ id: store.userId, name: profile?.display_name || '我', member: true });
  for (const g of trip.guests || []) people.push({ id: g.id, name: g.name, member: false });
  return people;
}
export const newGuestId = () => 'g_' + uid().slice(0, 8);

/* ---------- 每筆帳：每個人要分攤多少（旅程幣別） ---------- */
export function owedBy(e) {
  const rate = Number(e.rate) || 1;
  const out = {};
  if (e.shares && Object.keys(e.shares).length) {
    for (const [p, v] of Object.entries(e.shares)) out[p] = (Number(v) || 0) * rate;
  } else {
    const list = e.split_among?.length ? e.split_among : [e.paid_by];
    const each = (Number(e.amount) || 0) * rate / list.length;
    for (const p of list) out[p] = each;
  }
  return out;
}
export const baseAmount = e => (Number(e.amount) || 0) * (Number(e.rate) || 1);

// 每個人的淨額：正數＝別人欠他，負數＝他欠別人
export function balances(expenses) {
  const bal = {};
  for (const e of expenses) {
    bal[e.paid_by] = (bal[e.paid_by] || 0) + baseAmount(e);
    for (const [p, v] of Object.entries(owedBy(e))) bal[p] = (bal[p] || 0) - v;
  }
  return bal;
}

// 用最少的轉帳次數結清：[{ from, to, amount }]
export function settleUp(bal, eps = 0.5) {
  const debt = Object.entries(bal).filter(([, v]) => v < -eps).map(([p, v]) => [p, -v]).sort((a, b) => b[1] - a[1]);
  const cred = Object.entries(bal).filter(([, v]) => v > eps).map(([p, v]) => [p, v]).sort((a, b) => b[1] - a[1]);
  const out = [];
  let i = 0, j = 0;
  while (i < debt.length && j < cred.length) {
    const x = Math.min(debt[i][1], cred[j][1]);
    if (x > eps) out.push({ from: debt[i][0], to: cred[j][0], amount: x });
    debt[i][1] -= x;
    cred[j][1] -= x;
    if (debt[i][1] <= eps) i++;
    if (cred[j][1] <= eps) j++;
  }
  return out;
}
