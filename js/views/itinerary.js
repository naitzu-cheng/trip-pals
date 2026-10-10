import { useState, useEffect } from 'preact/hooks';
import { html, Sheet, Field, Empty, toast, errMsg, fmtDate, daysBetween, confirmBox } from '../ui.js';
import { searchPlaces, googleMapsSearch } from '../geo.js';
import { groupStops, stopLabel, saveOrder } from '../itin.js';

export function ItineraryView({ app }) {
  const { store, trip } = app;
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null);
  const [sorting, setSorting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    store.list('itinerary', { trip_id: trip.id }).then(setItems).catch(errMsg);
  }, [trip.id, app.version]);

  if (!items) return html`<div class="loading">載入中…</div>`;
  const days = daysBetween(trip.start_date, trip.end_date);
  const groups = groupStops(items, trip);

  const reorder = async (list, from, to) => {
    if (to < 0 || to >= list.length || busy) return;
    const next = [...list];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setBusy(true);
    try { await saveOrder(store, next); app.bump(); } catch (e) { errMsg(e); }
    setBusy(false);
  };
  const sortByTime = async list => {
    const next = [...list].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    setBusy(true);
    try { await saveOrder(store, next); app.bump(); toast('⏰ 已依時間排序'); } catch (e) { errMsg(e); }
    setBusy(false);
  };

  return html`
    <div class="page">
      <div class="page-head">
        <h2>🗓️ 行程</h2>
        <div class="row gap">
          ${items.length > 1 && html`<button class=${'btn sm ' + (sorting ? 'primary' : 'ghost')} onClick=${() => setSorting(!sorting)}>
            ${sorting ? '✓ 完成' : '↕️ 排序'}</button>`}
          ${!sorting && html`<button class="btn primary sm" onClick=${() => setEdit({ day: days[0] || null })}>＋ 新增</button>`}
        </div>
      </div>
      ${store.mode === 'cloud' && html`<div class="hint">👥 行程會與同行人共享，大家都能一起編輯</div>`}
      ${sorting && html`<div class="hint">用 ▲▼ 調整順序，地圖上的編號會一起更新。要換到別天，點「完成」後點該行程修改日期。</div>`}
      ${!items.length && html`<${Empty} icon="🗓️" text="還沒有行程。可以在這裡新增，或在地圖上搜尋地點後「加入行程」。" />`}
      ${groups.map(g => html`
        <section class="day" key=${g.day || 'none'}>
          <div class="day-head">
            <span class="day-no" style=${{ background: g.color }}>${g.day ? `Day ${g.dayNo ?? '+'}` : '未排日期'}</span>
            <span class="muted">${g.day ? fmtDate(g.day) : ''}</span>
            ${sorting ? g.items.length > 1 && html`<button class="btn ghost sm push" disabled=${busy} onClick=${() => sortByTime(g.items)}>⏰ 依時間</button>`
            : html`<button class="icon-btn push" onClick=${() => setEdit({ day: g.day })}>＋</button>`}
          </div>
          ${!g.items.length && html`<div class="muted pad">（空）</div>`}
          <div class="timeline">
            ${g.items.map((it, i) => html`
              <div class="tl-item" key=${it.id} onClick=${() => !sorting && setEdit(it)}>
                <div class="tl-time">${it.time || ''}</div>
                <div class="tl-dot" style=${{ background: g.color, boxShadow: `0 0 0 2px ${g.color}` }}>
                  ${it.lat != null && html`<span>${stopLabel(g, i)}</span>`}
                </div>
                <div class="tl-body">
                  <div class="tl-title">${it.title}</div>
                  ${it.address && html`<div class="tl-addr">${it.address}</div>`}
                  ${it.note && html`<div class="tl-note">${it.note}</div>`}
                </div>
                ${sorting ? html`
                  <div class="move-btns">
                    <button class="icon-btn" disabled=${busy || i === 0} onClick=${() => reorder(g.items, i, i - 1)}>▲</button>
                    <button class="icon-btn" disabled=${busy || i === g.items.length - 1} onClick=${() => reorder(g.items, i, i + 1)}>▼</button>
                  </div>`
                : it.lat != null && html`<button class="icon-btn" title="在地圖上看"
                    onClick=${e => { e.stopPropagation(); app.showOnMap({ ...it, name: it.title, kind: 'stop' }); }}>🗺️</button>`}
              </div>`)}
          </div>
        </section>`)}
      ${edit && html`<${StopForm} app=${app} item=${edit} days=${days} onClose=${() => setEdit(null)}
        onSaved=${() => { setEdit(null); app.bump(); }} />`}
    </div>`;
}

export function PlaceSearch({ near, onPick, onQuery, fallback = '', placeholder = '搜尋地點、地址，或貼經緯度 / Google 地圖網址' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const find = async () => {
    // 搜尋欄空著 → 直接用行程名稱找
    const text = (q.trim() || fallback.trim());
    if (!text) return toast('輸入要找的地點');
    if (!q.trim()) setQ(text);
    setBusy(true);
    try { setResults(await searchPlaces(text, near)); } catch (e) { errMsg(e); }
    setBusy(false);
  };
  return html`
    <div class="row gap">
      <input class="input grow" value=${q} placeholder=${fallback.trim() ? `按「搜尋」用「${fallback.trim()}」找地點` : placeholder}
        onInput=${e => { setQ(e.target.value); onQuery?.(e.target.value); }}
        enterkeyhint="search" onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); find(); } }} />
      <button type="button" class="btn ghost" disabled=${busy} onClick=${find}>${busy ? '…' : '搜尋'}</button>
    </div>
    ${results && html`<div class="mini-results">
      ${results.map(r => html`<button type="button" class="result" onClick=${() => { onPick(r); setResults(null); setQ(''); }}>
        <b>${r.name}</b><small>${r.address}</small></button>`)}
      <${NoResultTips} q=${q} empty=${!results.length} />
    </div>`}`;
}

export function NoResultTips({ q, empty }) {
  return html`<div class="search-tips">
    ${empty && html`<div><b>找不到「${q}」</b></div>`}
    <div>💡 日本地點用<b>日文或英文</b>比較準（名古屋駅、Nagoya Station）</div>
    <div>💡 也可以貼<b>經緯度</b>（例：35.3884, 136.9392）或 <b>Google 地圖網址</b></div>
    <a href=${googleMapsSearch(q)} target="_blank" rel="noopener">到 Google 地圖找 ↗（長按地點可複製經緯度）</a>
  </div>`;
}

function StopForm({ app, item, days, onClose, onSaved }) {
  const { store, trip } = app;
  const [f, setF] = useState({ title: '', time: '', note: '', address: '', ...item });
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [noAuto, setNoAuto] = useState(false); // 使用者自己把地點清掉了，就不要再自動帶入
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  const save = async e => {
    e.preventDefault();
    if (!f.title.trim()) return toast('請輸入行程名稱');
    const row = { ...f, trip_id: trip.id, day: f.day || null };
    // 新增或換天：排到那天最後面
    if (!item.id || (item.day || null) !== row.day) row.position = Date.now();
    setSaving(true);
    // 還沒選地點：自動用地點欄打的字（或行程名稱）找一個最符合的
    if (row.lat == null && !noAuto) {
      const text = (query.trim() || row.title.trim());
      try {
        const [hit] = await searchPlaces(text, trip.center);
        if (hit) {
          Object.assign(row, { lat: hit.lat, lng: hit.lng, address: hit.address });
          toast(`📍 已自動帶入地點：${hit.name}（不對的話可以再編輯）`, 4000);
        } else {
          toast('找不到這個地點，行程已儲存（可以在地點欄搜尋或貼經緯度）', 4000);
        }
      } catch { /* 搜尋失敗就先存 */ }
    }
    try { await store.put('itinerary', row); onSaved(); } catch (err) { errMsg(err); }
    setSaving(false);
  };
  const del = async () => {
    if (!(await confirmBox('刪除這個行程？'))) return;
    try { await store.remove('itinerary', item.id); onSaved(); } catch (err) { errMsg(err); }
  };

  return html`
    <${Sheet} title=${item.id ? '編輯行程' : '新增行程'} onClose=${onClose}>
      <form class="form" onSubmit=${save}>
        <${Field} label="要做什麼"><input class="input" value=${f.title} placeholder="例：淺草寺參拜"
          onInput=${e => set('title', e.target.value)} /></${Field}>
        <div class="row gap">
          <${Field} label="日期">
            ${days.length ? html`
              <select class="input" value=${f.day || ''} onChange=${e => set('day', e.target.value || null)}>
                <option value="">未排日期</option>
                ${days.map((d, i) => html`<option value=${d}>Day ${i + 1} · ${fmtDate(d)}</option>`)}
              </select>`
            : html`<input class="input" type="date" value=${f.day || ''} onInput=${e => set('day', e.target.value)} />`}
          </${Field}>
          <${Field} label="時間"><input class="input" type="time" value=${f.time || ''}
            onInput=${e => set('time', e.target.value)} /></${Field}>
        </div>
        <${Field} label="地點（選填，會顯示在地圖上）">
          ${f.lat != null ? html`
            <div class="picked">📍 ${f.address || f.title}
              <button type="button" class="icon-btn" onClick=${() => { setNoAuto(true); setF(x => ({ ...x, lat: null, lng: null, address: '' })); }}>✕</button>
            </div>`
          : html`<${PlaceSearch} near=${trip.center} fallback=${f.title} onQuery=${setQuery} onPick=${r =>
              setF(x => ({ ...x, lat: r.lat, lng: r.lng, address: r.address, title: x.title || r.name }))} />`}
        </${Field}>
        <${Field} label="備註"><textarea class="input" rows="3" value=${f.note || ''}
          onInput=${e => set('note', e.target.value)}></textarea></${Field}>
        <div class="row gap sheet-actions">
          ${item.id && html`<button type="button" class="btn danger" onClick=${del}>刪除</button>`}
          <div class="grow"></div>
          <button type="button" class="btn ghost" onClick=${onClose}>取消</button>
          <button class="btn primary" disabled=${saving}>${saving ? '找地點中…' : '儲存'}</button>
        </div>
      </form>
    </${Sheet}>`;
}
