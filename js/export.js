// 行程匯出：文字（貼到 LINE）或圖片（在手機上畫出來，不需要其他服務）
import { fmtDate } from './ui.js';
import { transportOf, bookingKind } from './consts.js';

const range = trip => trip.start_date ? `${fmtDate(trip.start_date)} – ${fmtDate(trip.end_date || trip.start_date)}` : '';
const legText = it => {
  const t = transportOf(it.transport);
  return [t && `${t[1]} ${t[2]}`, it.transport_note].filter(Boolean).join(' · ');
};

export function itineraryText(trip, groups, bookings = []) {
  const lines = [`${trip.emoji || '🧳'} ${trip.name}`];
  if (trip.destination || trip.start_date) lines.push([trip.destination, range(trip)].filter(Boolean).join('｜'));
  for (const g of groups) {
    if (!g.items.length) continue;
    lines.push('', g.day ? `【Day ${g.dayNo ?? '+'} ${fmtDate(g.day)}】` : '【未排日期】');
    for (const it of g.items) {
      const leg = legText(it);
      if (leg) lines.push(`　↓ ${leg}`);
      lines.push(`${it.time ? it.time + ' ' : '・'}${it.title}${it.address ? `（${it.address}）` : ''}`);
      if (it.note) lines.push(`　📝 ${it.note}`);
    }
  }
  if (bookings.length) {
    lines.push('', '【票券與訂位】');
    for (const b of bookings) {
      lines.push(`${bookingKind(b.kind)[1]} ${b.title}${b.start_at ? ' ' + b.start_at.replace('T', ' ') : ''}${b.ref_code ? `（訂位代號 ${b.ref_code}）` : ''}`);
    }
  }
  lines.push('', '— 用「旅伴 TripPals」規劃');
  return lines.join('\n');
}

// 畫成一張長圖，回傳 PNG Blob
export async function itineraryImage(trip, groups) {
  const W = 1080, PAD = 64, LINE = 46;
  const font = (size, weight = 400) => `${weight} ${size}px -apple-system, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');

  // 先排版算高度，再畫
  const wrap = (text, size, weight, maxW) => {
    ctx.font = font(size, weight);
    const out = [];
    let line = '';
    for (const ch of String(text)) {
      if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch;
    }
    if (line) out.push(line);
    return out;
  };
  const ops = [];
  let y = PAD;
  const add = (kind, data, h) => { ops.push({ kind, y, ...data }); y += h; };

  const titleLines = wrap(`${trip.emoji || '🧳'} ${trip.name}`, 60, 800, W - PAD * 2);
  add('title', { lines: titleLines }, titleLines.length * 76);
  const sub = [trip.destination, range(trip)].filter(Boolean).join('｜');
  if (sub) add('sub', { text: sub }, 60);
  y += 20;
  for (const g of groups) {
    if (!g.items.length) continue;
    add('day', { text: g.day ? `Day ${g.dayNo ?? '+'}　${fmtDate(g.day)}` : '未排日期', color: g.color }, 80);
    for (const it of g.items) {
      const leg = legText(it);
      if (leg) add('leg', { text: '↓ ' + leg }, LINE);
      const titleLines = wrap(it.title, 38, 700, W - PAD * 2 - 170);
      add('stop', { time: it.time || '', lines: titleLines, color: g.color }, titleLines.length * 50 + 6);
      for (const l of [it.address, it.note].filter(Boolean)) {
        const ls = wrap(l, 28, 400, W - PAD * 2 - 170);
        add('small', { lines: ls }, ls.length * 38);
      }
      y += 18;
    }
    y += 20;
  }
  add('foot', { text: '旅伴 TripPals' }, 60);
  const H = y + PAD;

  const scale = Math.min(1, 16000 / H); // 太長的話縮小，避免超過 canvas 上限
  c.width = W * scale;
  c.height = H * scale;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = trip.color || '#a5d8ff';
  ctx.fillRect(0, 0, W, 16);
  ctx.textBaseline = 'top';
  for (const o of ops) {
    if (o.kind === 'title') {
      ctx.font = font(60, 800); ctx.fillStyle = '#212529';
      o.lines.forEach((l, i) => ctx.fillText(l, PAD, o.y + i * 76));
    } else if (o.kind === 'sub') {
      ctx.font = font(32); ctx.fillStyle = '#868e96'; ctx.fillText(o.text, PAD, o.y);
    } else if (o.kind === 'day') {
      ctx.font = font(36, 800);
      const w = ctx.measureText(o.text).width + 48;
      ctx.fillStyle = o.color;
      roundRect(ctx, PAD, o.y + 10, w, 56, 28); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(o.text, PAD + 24, o.y + 20);
    } else if (o.kind === 'leg') {
      ctx.font = font(28); ctx.fillStyle = '#4263eb'; ctx.fillText(o.text, PAD + 170, o.y + 4);
    } else if (o.kind === 'stop') {
      ctx.font = font(34, 800); ctx.fillStyle = '#2b8a3e'; ctx.fillText(o.time, PAD, o.y + 4);
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(PAD + 135, o.y + 24, 12, 0, Math.PI * 2); ctx.fill();
      ctx.font = font(38, 700); ctx.fillStyle = '#212529';
      o.lines.forEach((l, i) => ctx.fillText(l, PAD + 170, o.y + i * 50));
    } else if (o.kind === 'small') {
      ctx.font = font(28); ctx.fillStyle = '#868e96';
      o.lines.forEach((l, i) => ctx.fillText(l, PAD + 170, o.y + i * 38));
    } else if (o.kind === 'foot') {
      ctx.font = font(26); ctx.fillStyle = '#adb5bd'; ctx.fillText(o.text, PAD, o.y + 20);
    }
  }
  return new Promise(res => c.toBlob(res, 'image/png'));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 分享（手機）或下載（電腦）
export async function shareOrDownload(blob, filename, title) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'downloaded';
}
