// 🔍 掃描票券截圖：讀條碼（登機證、QR code）＋辨識文字（OCR），自動填入票券欄位
// 全部在手機上執行，不需要伺服器或 API key；套件第一次使用時才下載
const TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js';
const TESS_WORKER = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js';
const TESS_CORE = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0';
const ZXING = 'https://esm.sh/@zxing/library@0.23.0';

/* ---------- 讀圖 ---------- */
// 回傳 { text, barcodes: [字串] }；onProgress(0~1, 說明)
export async function scanImage(file, onProgress = () => {}) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    onProgress(0.05, '讀取條碼…');
    const barcodes = await readBarcodes(img).catch(() => []);
    onProgress(0.15, '下載文字辨識（第一次約 5MB）…');
    // 手機截圖字很大，縮小後中文日期（年月日）辨識比較準；不同大小準確度不同，沒讀到日期就換個大小再試一次
    let text = '';
    try {
      text = await readText(img, [560, 800], (p, pass) => onProgress(0.15 + (pass + p) / 2 * 0.85, '辨識文字…'));
    } catch (e) { console.warn(e); }
    return { text, barcodes };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function scaled(img, k) {
  k = Math.min(1, k);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * k));
  c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; // 透明背景補白，避免變成黑底
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

async function readBarcodes(img) {
  const out = new Set();
  // 有內建的 BarcodeDetector（Android Chrome）就先用
  if ('BarcodeDetector' in window) {
    try {
      const det = new window.BarcodeDetector();
      for (const r of await det.detect(img)) if (r.rawValue) out.add(r.rawValue);
    } catch { /* 不支援的格式 */ }
  }
  if (out.size) return [...out];
  // zxing：大圖常常讀不到，依序縮小再試（QR code、登機證 PDF417／Aztec 都支援）
  const Z = await import(ZXING);
  const reader = new Z.MultiFormatReader();
  reader.setHints(new Map([[Z.DecodeHintType.TRY_HARDER, true]]));
  const big = Math.max(img.naturalWidth, img.naturalHeight);
  for (const target of [1000, 700, 450, big]) {
    const c = scaled(img, target / big);
    try {
      const bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(c)));
      out.add(reader.decode(bmp).getText());
      break;
    } catch { /* 這個大小讀不到，換下一個 */ }
  }
  return [...out];
}

async function readText(img, widths, onProgress) {
  const T = await import(TESSERACT);
  const createWorker = T.createWorker || T.default?.createWorker;
  let pass = 0;
  const worker = await createWorker(['chi_tra', 'eng'], 1, {
    workerPath: TESS_WORKER,
    corePath: TESS_CORE,
    logger: m => m.status === 'recognizing text' && onProgress(m.progress, pass),
  });
  try {
    let best = '', bestScore = -1;
    for (const w of widths) {
      const { data } = await worker.recognize(scaled(img, w / img.naturalWidth));
      const r = parseTicketText(data.text || '');
      const score = Object.keys(r).length + (r.start_at ? 3 : 0);
      if (score > bestScore) { best = data.text || ''; bestScore = score; }
      if (r.start_at) break; // 讀到日期就夠了
      pass++;
    }
    return best;
  } finally {
    await worker.terminate();
  }
}

function loadImg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/* ---------- 解析 ---------- */
const pad = n => String(n).padStart(2, '0');
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

// 中文 OCR 常在字和字之間多出空格：「訂 位 代 號」→「訂位代號」
const tidy = t => t.replace(/([　-鿿＀-￯])[ \t]+(?=[　-鿿＀-￯])/g, '$1').replace(/[：]/g, ':');

// 登機證條碼（IATA BCBP，以 M1 開頭）：裡面有訂位代號、起訖機場、航班、日期
export function parseBCBP(s, year = new Date().getFullYear(), near = null) {
  if (!/^M[1-4].{50,}/.test(s)) return null;
  const pnr = s.slice(23, 30).trim();
  const from = s.slice(30, 33), to = s.slice(33, 36);
  const carrier = s.slice(36, 39).trim(), flight = s.slice(39, 44).trim().replace(/^0+/, '');
  const jd = parseInt(s.slice(44, 47), 10);
  let date = null;
  if (jd > 0 && jd <= 366) {
    // 儒略日只有「一年中的第幾天」：有旅程日期就取最接近旅程的那年，否則取今天往前 30 天之後最近的那天
    const cands = [year - 1, year, year + 1].map(y => new Date(Date.UTC(y, 0, jd)));
    const target = near ? Date.parse(near) : null;
    const d = target ? cands.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0]
      : cands.find(x => +x >= Date.now() - 30 * 864e5);
    date = d.toISOString().slice(0, 10);
  }
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return null;
  return { kind: 'flight', ref_code: pnr, title: `${carrier}${flight} ${from}→${to}`, start_at: date ? date + 'T' : '' };
}

function findDates(t) {
  const out = [];
  const add = (i, y, m, d) => { if (m >= 1 && m <= 12 && d >= 1 && d <= 31) out.push({ i, date: `${y}-${pad(m)}-${pad(d)}` }); };
  const yr = y => (y < 100 ? 2000 + y : y);
  let m;
  const r1 = /(20\d{2})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/g; // 2026-03-21、2026年3月21日
  while ((m = r1.exec(t))) add(m.index, +m[1], +m[2], +m[3]);
  const r2 = /\b(\d{1,2})\s*([A-Za-z]{3,4})[a-z]*\.?\s*,?\s*(\d{2,4})\b/g; // 21 MAR 2026、21Mar26
  while ((m = r2.exec(t))) if (MONTHS[m[2].toLowerCase()]) add(m.index, yr(+m[3]), MONTHS[m[2].toLowerCase()], +m[1]);
  const r3 = /\b([A-Za-z]{3,4})[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/g; // Mar 21, 2026
  while ((m = r3.exec(t))) if (MONTHS[m[1].toLowerCase()]) add(m.index, +m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  return out.sort((a, b) => a.i - b.i);
}
function findTimes(t) {
  const out = [];
  const r = /(?<![\d:])([01]?\d|2[0-3])\s*[:：]\s*([0-5]\d)(?![\d:])/g;
  let m;
  while ((m = r.exec(t))) out.push({ i: m.index, time: `${pad(+m[1])}:${m[2]}` });
  return out;
}
// 日期配上它後面最近的時間（同一段文字內）
function dateTimes(t) {
  const dates = findDates(t), times = findTimes(t);
  return dates.map((d, k) => {
    const next = dates[k + 1]?.i ?? Infinity;
    const tm = times.find(x => x.i > d.i && x.i < Math.min(next, d.i + 80)) || times.find(x => x.i < d.i && d.i - x.i < 25);
    const v = new String(d.date + 'T' + (tm ? tm.time : ''));
    // 這個日期所在那一行是不是「抵達」
    const line = t.slice(t.lastIndexOf('\n', d.i) + 1).split('\n')[0];
    v.arrive = /抵達|到達|抵达|到着|arriv|退房|check-?\s*out/i.test(line);
    return v;
  });
}

const REF_WORDS = '訂位代號|訂位代碼|訂位編號|訂單編號|預訂編號|預約編號|預訂號碼|確認碼|確認編號|確認號碼|電子票號|取票號碼|' +
  '予約番号|確認番号|予約記録番号|booking\\s*(?:reference|ref\\.?|code|number|no\\.?|id)|confirmation\\s*(?:number|code|no\\.?|#)|' +
  'reservation\\s*(?:number|code|no\\.?)|record\\s*locator|pnr|order\\s*(?:number|no\\.?|id)';

export function parseTicketText(raw) {
  const t = tidy(raw || '');
  const r = {};

  // 種類
  if (/boarding|flight|航班|登機|搭乘|機票|airline|airways|gate|登機門|terminal|航廈|便名/i.test(t)) r.kind = 'flight';
  else if (/check-?\s*in|check-?\s*out|入住|退房|hotel|飯店|酒店|旅館|民宿|ホテル|旅館|booking\.com|agoda|airbnb/i.test(t)) r.kind = 'hotel';
  else if (/新幹線|列車|車次|車廂|月台|高鐵|台鐵|train|jr\b|shinkansen|railway|seat\s*\d|号車/i.test(t)) r.kind = 'train';
  else if (/rental|租車|レンタカー|pick-?\s*up|還車/i.test(t)) r.kind = 'car';
  else if (/門票|入場|ticket|admission|entry|入園|チケット|klook|kkday/i.test(t)) r.kind = 'ticket';

  // 訂位代號：關鍵字後面的英數字
  const refRe = new RegExp(`(?:${REF_WORDS})\\s*[:#.\\-]?\\s*\\n?\\s*([A-Z0-9][A-Z0-9.\\-]{3,24})`, 'i');
  const ref = t.match(refRe);
  if (ref && /\d|[A-Z]{5,}/.test(ref[1])) r.ref_code = ref[1].replace(/[.\-]+$/, '').toUpperCase();

  // 航班號碼與機場
  if (r.kind === 'flight') {
    const fl = t.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b/);
    // 機場代碼：先找有箭頭的；OCR 常把箭頭讀成怪符號，所以航班那一行放寬
    const flLine = fl ? t.slice(t.lastIndexOf('\n', fl.index) + 1).split('\n')[0] : '';
    const ap = t.match(/\b([A-Z]{3})\s*(?:→|->|—|–|-|to|✈)\s*([A-Z]{3})\b/) || flLine.match(/\b([A-Z]{3})\s*[^\w\n]{1,3}\s*([A-Z]{3})\b/);
    const parts = [fl && fl[1] + fl[2], ap && `${ap[1]}→${ap[2]}`].filter(Boolean);
    if (parts.length) r.title = parts.join(' ');
  }
  // 住宿名稱：含 Hotel / 飯店 的那一行
  if (r.kind === 'hotel') {
    const line = t.split('\n').map(s => s.trim()).find(s => s.length <= 40 && /hotel|inn|resort|hostel|飯店|酒店|旅館|民宿|ホテル/i.test(s) && !/check|入住|退房|booking\.com/i.test(s));
    if (line) r.title = line;
  }

  // 車票、門票：找車次或票名那一行
  if (!r.title && (r.kind === 'train' || r.kind === 'ticket')) {
    const re = r.kind === 'train' ? /新幹線|特急|快車|自強|號|号|express|limited/i : /門票|入場券|票券|一日|pass|ticket|tour|樂園|乐园|museum|美術館|博物館/i;
    const line = t.split('\n').map(s => s.trim())
      .find(s => s.length >= 2 && s.length <= 40 && re.test(s) && !new RegExp(REF_WORDS, 'i').test(s) && !/\d{1,2}:\d{2}|車廂|号車|座位/.test(s));
    if (line) r.title = line;
  }

  // 地址（住宿、門票、租車）：有「都、市、區、町、路、號」又有數字的那一行
  if (r.kind && r.kind !== 'flight' && r.kind !== 'train') {
    const addr = t.split('\n').map(s => s.trim()).find(s => s.length >= 6 && s.length <= 60 && /\d/.test(s) &&
      /[都道府縣县市區区町村]|丁目|番地|[路街]|\b(street|st\.|road|rd\.|avenue|ave)\b/i.test(s) &&
      !/[:：]|入住|退房|check|訂單|編號|日期|\d{1,2}:\d{2}|20\d{2}/i.test(s));
    if (addr) r.place = addr;
  }

  // 日期時間：住宿找入住／退房；其他取前兩個
  const dts = dateTimes(t);
  if (r.kind === 'hotel') {
    const after = re => { const m = re.exec(t); const d = m && dateTimes(t.slice(m.index))[0]; return d ? String(d) : null; };
    r.start_at = after(/check-?\s*in|入住/i) || (dts[0] && String(dts[0]));
    r.end_at = after(/check-?\s*out|退房/i) || (dts[1] && String(dts[1]));
  } else {
    const dep = dts.filter(d => !d.arrive), arr = dts.filter(d => d.arrive);
    r.start_at = dep[0] && String(dep[0]);
    if (arr[0]) r.end_at = String(arr[0]);
    else if (dep[1] && String(dep[1]) !== String(dep[0])) r.end_at = String(dep[1]);
    // 只有一個日期、但同一行有兩個時間（例：08:20 東京 → 10:45 仙台）
    else if (r.start_at && !r.start_at.endsWith('T')) {
      const times = findTimes(t).map(x => x.time);
      const k = times.indexOf(r.start_at.slice(11));
      if (k >= 0 && times[k + 1] && times[k + 1] > times[k]) r.end_at = r.start_at.slice(0, 11) + times[k + 1];
    }
  }
  for (const k of ['start_at', 'end_at']) {
    if (!r[k]) delete r[k];
    else if (r[k].endsWith('T')) r[k] += r.kind === 'hotel' ? (k === 'start_at' ? '15:00' : '11:00') : '00:00';
  }
  return r;
}

// 條碼＋文字 → 要填入的欄位
// near：旅程開始日（yyyy-mm-dd），用來猜登機證條碼的年份
export function parseScan({ text, barcodes }, near = null) {
  let r = parseTicketText(text);
  const notes = [];
  for (const code of barcodes) {
    const b = parseBCBP(code, undefined, near);
    if (b) {
      // 條碼比較準，蓋過文字辨識的結果；但條碼沒有年份和時間，文字裡有同一天的出發時間就用文字的
      const dep = tidy(text || '').match(/(?:出發|出发|起飛|起飞|出発|depart\w*)[^\n]*?(?<![\d:])([01]?\d|2[0-3])\s*:\s*([0-5]\d)/i);
      const time = r.start_at && r.start_at.slice(5, 10) === b.start_at.slice(5, 10) ? r.start_at
        : b.start_at + (dep ? `${pad(+dep[1])}:${dep[2]}` : '00:00');
      r = { ...r, ...b, start_at: time };
      if (r.end_at && r.end_at < r.start_at) delete r.end_at;
    } else if (/^https?:\/\//i.test(code)) notes.push(code);
  }
  if (notes.length) r.note = notes.join('\n');
  return r;
}

export const FIELD_NAMES = { kind: '種類', title: '名稱', ref_code: '訂位代號', start_at: '時間', end_at: '結束時間', place: '地址', note: '連結' };
