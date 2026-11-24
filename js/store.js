// 資料層：同一套 API，兩種實作
//   LocalStore  —— IndexedDB（本機模式，不需帳號）
//   CloudStore  —— Supabase（雲端模式，可共享）
//
// API:
//   list(table, match)      -> rows（依 created_at 排序）
//   put(table, row)         -> row（新增或更新，id 由前端產生）
//   remove(table, id)
//   uploadImage(blob, { shared }) -> ref 字串（shared：同旅程成員都看得到）
//   imageUrl(ref)           -> 可顯示的 URL
//   removeImage(ref)

export const TABLES = ['trips', 'itinerary', 'places', 'place_items', 'notes', 'profiles', 'expenses', 'bookings', 'memories'];
// 同旅程成員共享的資料表（雲端用 created_by 記錄是誰建立的）
const SHARED = ['itinerary', 'expenses', 'bookings', 'memories'];

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  }));

const byCreated = (a, b) => String(a.created_at || '').localeCompare(String(b.created_at || ''));

// 刪除時要一併刪掉的子資料（雲端由 FK cascade 處理）
const CASCADE = {
  trips: [['itinerary', 'trip_id'], ['places', 'trip_id'], ['place_items', 'trip_id'], ['notes', 'trip_id'],
    ['expenses', 'trip_id'], ['bookings', 'trip_id'], ['memories', 'trip_id']],
  places: [['place_items', 'place_id']],
};

/* ---------------- 本機 IndexedDB ---------------- */
class LocalStore {
  constructor() {
    this.mode = 'local';
    this.userId = 'local';
    this.urlCache = new Map();
  }
  async init() {
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('trippals', 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const t of TABLES) if (!db.objectStoreNames.contains(t)) db.createObjectStore(t, { keyPath: 'id' });
        if (!db.objectStoreNames.contains('images')) db.createObjectStore('images');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this;
  }
  _tx(store, mode, fn) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, mode);
      const r = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
      tx.onerror = () => reject(tx.error);
    });
  }
  async list(table, match = {}) {
    const all = await this._tx(table, 'readonly', s => s.getAll());
    return all.filter(r => Object.entries(match).every(([k, v]) => r[k] === v)).sort(byCreated);
  }
  async put(table, row) {
    const full = { created_at: new Date().toISOString(), ...row };
    if (!full.id) full.id = uid();
    if ('user_id' in full || table !== 'trips') full.user_id ??= this.userId;
    await this._tx(table, 'readwrite', s => s.put(full));
    return full;
  }
  async remove(table, id) {
    for (const [child, key] of CASCADE[table] || []) {
      for (const r of await this.list(child, { [key]: id })) await this.remove(child, r.id);
    }
    const rows = await this._tx(table, 'readonly', s => s.get(id));
    for (const ref of rows?.images || []) await this.removeImage(ref);
    await this._tx(table, 'readwrite', s => s.delete(id));
  }
  async uploadImage(blob) {
    const ref = 'idb:' + uid();
    await this._tx('images', 'readwrite', s => s.put(blob, ref));
    return ref;
  }
  async imageUrl(ref) {
    if (!ref) return '';
    if (!ref.startsWith('idb:')) return ref;
    if (this.urlCache.has(ref)) return this.urlCache.get(ref);
    const blob = await this._tx('images', 'readonly', s => s.get(ref));
    const url = blob ? URL.createObjectURL(blob) : '';
    this.urlCache.set(ref, url);
    return url;
  }
  async removeImage(ref) {
    if (ref?.startsWith('idb:')) await this._tx('images', 'readwrite', s => s.delete(ref));
  }
}

/* ---------------- 雲端 Supabase ---------------- */
class CloudStore {
  constructor(client, user) {
    this.mode = 'cloud';
    this.sb = client;
    this.user = user;
    this.userId = user.id;
    this.urlCache = new Map();
  }
  async init() { return this; }
  _err({ data, error }) {
    if (error && /'position' column|column .*position/i.test(error.message)) {
      throw new Error('資料庫需要更新：請到 Supabase 的 SQL Editor 執行 supabase/migrations/002_itinerary_position.sql');
    }
    if (error && /'transport(_note)?' column|column .*transport/i.test(error.message)) {
      throw new Error('資料庫需要更新：請到 Supabase 的 SQL Editor 執行 supabase/migrations/004_itinerary_transport.sql');
    }
    if (error && /expenses|bookings|memories|'currency' column|'guests' column/i.test(error.message)) {
      throw new Error('資料庫需要更新：請到 Supabase 的 SQL Editor 執行 supabase/migrations/005_trip_tools.sql');
    }
    if (error && isNetErr(error)) throw new Error('目前離線，等有網路再試一次');
    if (error) throw new Error(error.message);
    return data;
  }
  async list(table, match = {}) {
    // 有網路就抓最新的並存一份；沒網路就用上次存的（離線也能看行程、票券、帳）
    const key = `${this.userId}:${table}:${JSON.stringify(match)}`;
    let q = this.sb.from(table).select('*');
    for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
    let res;
    try { res = await q.order('created_at', { ascending: true }); } catch (e) { res = { error: e }; }
    if (res.error && isNetErr(res.error)) {
      const cached = await cacheGet(key);
      if (cached) { setOffline(true); return cached; }
    }
    const rows = this._err(res);
    setOffline(false);
    cacheSet(key, rows);
    return rows;
  }
  async put(table, row) {
    const full = { ...row };
    if (!full.id) full.id = uid();
    if (table === 'trips') full.owner_id ??= this.userId;
    else if (table !== 'profiles' && !SHARED.includes(table)) full.user_id ??= this.userId;
    if (SHARED.includes(table)) full.created_by ??= this.userId;
    // 先 update，沒有才 insert（upsert 會套用 insert 權限，非建立者編輯旅程會被擋）
    if (row.id) {
      const { id, ...patch } = full;
      const upd = this._err(await this.sb.from(table).update(patch).eq('id', id).select());
      if (upd.length) return upd[0];
    }
    const rows = this._err(await this.sb.from(table).insert(full).select());
    return rows[0];
  }
  async remove(table, id) {
    if (['places', 'notes', 'place_items', 'bookings', 'memories'].includes(table)) {
      const { data } = await this.sb.from(table).select('images').eq('id', id).maybeSingle();
      for (const ref of data?.images || []) await this.removeImage(ref);
    }
    this._err(await this.sb.from(table).delete().eq('id', id));
  }
  async uploadImage(blob, { shared = false } = {}) {
    // 路徑含旅程 id：分享給夥伴時，對方只看得到這趟旅程的圖
    // shared（票券、回憶）：放在 trips/<旅程>/ 底下，同旅程成員都看得到
    const path = shared && this.currentTrip ? `trips/${this.currentTrip}/${uid()}.jpg`
      : this.currentTrip ? `${this.userId}/${this.currentTrip}/${uid()}.jpg` : `${this.userId}/${uid()}.jpg`;
    this._err(await this.sb.storage.from('media').upload(path, blob, { contentType: blob.type || 'image/jpeg' }));
    return 'sb:' + path;
  }
  async imageUrl(ref) {
    if (!ref) return '';
    if (!ref.startsWith('sb:')) return ref;
    const hit = this.urlCache.get(ref);
    if (hit && hit.exp > Date.now()) return hit.url;
    let url = '';
    try {
      const { data } = await this.sb.storage.from('media').createSignedUrl(ref.slice(3), 3600);
      url = data?.signedUrl || '';
    } catch { /* 離線 */ }
    // 記住最後一次的網址：離線時 service worker 會用路徑找到快取的圖片
    const memo = 'trippals.img.' + ref;
    if (url) { try { localStorage.setItem(memo, url); } catch { /* 空間滿了 */ } }
    else return localStorage.getItem(memo) || '';
    this.urlCache.set(ref, { url, exp: Date.now() + 3500e3 });
    return url;
  }
  async removeImage(ref) {
    if (ref?.startsWith('sb:')) await this.sb.storage.from('media').remove([ref.slice(3)]);
  }

  /* ---- 同行人相關（只有雲端有） ---- */
  async members(tripId) {
    const members = this._err(await this.sb.from('trip_members').select('*').eq('trip_id', tripId));
    const ids = members.map(m => m.user_id);
    const profiles = ids.length ? this._err(await this.sb.from('profiles').select('*').in('id', ids)) : [];
    return members.map(m => ({ ...m, profile: profiles.find(p => p.id === m.user_id) }));
  }
  async setSharing(tripId, share) {
    this._err(await this.sb.from('trip_members').update({ share_location: share })
      .eq('trip_id', tripId).eq('user_id', this.userId));
    if (!share) this._err(await this.sb.from('member_locations').delete()
      .eq('trip_id', tripId).eq('user_id', this.userId));
  }
  async pushLocation(tripId, lat, lng, heading) {
    this._err(await this.sb.from('member_locations').upsert({
      trip_id: tripId, user_id: this.userId, lat, lng, heading, updated_at: new Date().toISOString(),
    }));
  }
  async locations(tripId) {
    return this._err(await this.sb.from('member_locations').select('*').eq('trip_id', tripId));
  }
  async joinTrip(code) {
    return this._err(await this.sb.rpc('join_trip', { code: code.trim().toUpperCase() }));
  }
  async leaveTrip(tripId) {
    this._err(await this.sb.from('trip_members').delete().eq('trip_id', tripId).eq('user_id', this.userId));
  }

  /* ---- 用密碼分享自己的地點 / 筆記 ---- */
  _shareErr(r) {
    if (r.error && /function .*(private|set_private|unlock)|private_status|Could not find the function/i.test(r.error.message)) {
      throw new Error('資料庫需要更新：請到 Supabase 的 SQL Editor 執行 supabase/migrations/003_private_share.sql');
    }
    return this._err(r);
  }
  async setPrivatePassword(tripId, pass) {
    this._shareErr(await this.sb.rpc('set_private_password', { t: tripId, pass: pass || null }));
  }
  async unlockPrivate(tripId, ownerId, pass) {
    return this._shareErr(await this.sb.rpc('unlock_private', { t: tripId, owner: ownerId, pass }));
  }
  async privateStatus(tripId) {
    return this._shareErr(await this.sb.rpc('private_status', { t: tripId })) || [];
  }
}

/* ---------------- 離線快取 ---------------- */
const isNetErr = e => /fetch|network|load failed|offline/i.test(e?.message || String(e));

let cacheDb;
function cacheOpen() {
  cacheDb ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('trippals-cache', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return cacheDb;
}
export async function cacheGet(key) {
  try {
    const db = await cacheOpen();
    return await new Promise(res => {
      const r = db.transaction('kv').objectStore('kv').get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(undefined);
    });
  } catch { return undefined; }
}
export async function cacheSet(key, value) {
  try {
    const db = await cacheOpen();
    db.transaction('kv', 'readwrite').objectStore('kv').put(value, key);
  } catch { /* 存不了就算了 */ }
}

// 目前是不是在用離線資料（給畫面上方的提示用）
export let offline = false;
function setOffline(v) {
  if (offline === v) return;
  offline = v;
  dispatchEvent(new CustomEvent('trippals-offline', { detail: v }));
}

/* ---------------- 啟動 ---------------- */
let sbClient = null;

export function cloudConfigured() {
  const c = window.TRIPPALS_CONFIG || {};
  return !!(c.SUPABASE_URL && c.SUPABASE_ANON_KEY);
}

export async function supabase() {
  if (sbClient) return sbClient;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.117.3');
  const c = window.TRIPPALS_CONFIG;
  sbClient = createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, { auth: { persistSession: true } });
  return sbClient;
}

export async function openLocal() {
  return new LocalStore().init();
}

export async function openCloud(user) {
  return new CloudStore(await supabase(), user).init();
}
