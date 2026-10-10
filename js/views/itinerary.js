import { useState, useEffect } from 'preact/hooks';
import { html, Sheet, Field, Empty, toast, errMsg, fmtDate, daysBetween, confirmBox } from '../ui.js';
import { searchPlaces, googleMapsPlace } from '../geo.js';

export function ItineraryView({ app }) {
  const { store, trip } = app;
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null);

  useEffect(() => {
    store.list('itinerary', { trip_id: trip.id }).then(setItems).catch(errMsg);
  }, [trip.id, app.version]);

  if (!items) return html`<div class="loading">載入中…</div>`;

  const days = daysBetween(trip.start_date, trip.end_date);
  const extra = [...new Set(items.map(i => i.day).filter(d => d && !days.includes(d)))].sort();
  const groups = [...days, ...extra].map(d => [d, items.filter(i => i.day === d)]);
  const undated = items.filter(i => !i.day);
  if (undated.length || !groups.length) groups.push([null, undated]);
  const sortT = arr => [...arr].sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));

  return html`
    <div class="page">
      <div class="page-head">
        <h2>🗓️ 行程</h2>
        <button class="btn primary sm" onClick=${() => setEdit({ day: days[0] || null })}>＋ 新增</button>
      </div>
      ${store.mode === 'cloud' && html`<div class="hint">👥 行程會與同行人共享，大家都能一起編輯</div>`}
      ${!items.length && html`<${Empty} icon="🗓️" text="還沒有行程。可以在這裡新增，或在地圖上搜尋地點後「加入行程」。" />`}
      ${groups.map(([day, list], di) => html`
        <section class="day" key=${day || 'none'}>
          <div class="day-head">
            <span class="day-no">${day ? `Day ${days.indexOf(day) + 1 || '+'}` : '未排日期'}</span>
            <span class="muted">${day ? fmtDate(day) : ''}</span>
            <button class="icon-btn" onClick=${() => setEdit({ day })}>＋</button>
          </div>
          ${!list.length && html`<div class="muted pad">（空）</div>`}
          <div class="timeline">
            ${sortT(list).map(it => html`
              <div class="tl-item" key=${it.id} onClick=${() => setEdit(it)}>
                <div class="tl-time">${it.time || '—'}</div>
                <div class="tl-dot"></div>
                <div class="tl-body">
                  <div class="tl-title">${it.title}</div>
                  ${it.address && html`<div class="tl-addr">${it.address}</div>`}
                  ${it.note && html`<div class="tl-note">${it.note}</div>`}
                </div>
                ${it.lat != null && html`<a class="icon-btn" href=${googleMapsPlace({ ...it, name: it.title })} target="_blank"
                  rel="noopener" onClick=${e => e.stopPropagation()} title="Google 地圖">🗺️</a>`}
              </div>`)}
          </div>
        </section>`)}
      ${edit && html`<${StopForm} app=${app} item=${edit} days=${days} onClose=${() => setEdit(null)}
        onSaved=${() => { setEdit(null); app.bump(); }} />`}
    </div>`;
}

function StopForm({ app, item, days, onClose, onSaved }) {
  const { store, trip } = app;
  const [f, setF] = useState({ title: '', time: '', note: '', address: '', ...item });
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  const find = async () => {
    if (!q.trim()) return;
    try {
      const near = trip.center;
      setResults(await searchPlaces(q.trim(), near));
    } catch (e) { errMsg(e); }
  };
  const save = async e => {
    e.preventDefault();
    if (!f.title.trim()) return toast('請輸入行程名稱');
    try {
      await store.put('itinerary', { ...f, trip_id: trip.id, day: f.day || null });
      onSaved();
    } catch (err) { errMsg(err); }
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
              <button type="button" class="icon-btn" onClick=${() => setF(x => ({ ...x, lat: null, lng: null, address: '' }))}>✕</button>
            </div>`
          : html`<div class="row gap">
              <input class="input grow" value=${q} placeholder="搜尋地點" onInput=${e => setQ(e.target.value)}
                onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); find(); } }} />
              <button type="button" class="btn ghost" onClick=${find}>搜尋</button>
            </div>`}
          ${results && html`<div class="mini-results">
            ${results.map(r => html`<button type="button" class="result" onClick=${() => {
              setF(x => ({ ...x, lat: r.lat, lng: r.lng, address: r.address, title: x.title || r.name }));
              setResults(null);
            }}><b>${r.name}</b><small>${r.address}</small></button>`)}
            ${!results.length && html`<div class="muted pad">找不到</div>`}
          </div>`}
        </${Field}>
        <${Field} label="備註"><textarea class="input" rows="3" value=${f.note || ''}
          onInput=${e => set('note', e.target.value)}></textarea></${Field}>
        <div class="row gap">
          ${item.id && html`<button type="button" class="btn danger" onClick=${del}>刪除</button>`}
          <div class="grow"></div>
          <button class="btn primary">儲存</button>
        </div>
      </form>
    </${Sheet}>`;
}
