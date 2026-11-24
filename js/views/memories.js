// 📸 旅行回憶：照片＋一句話，依日期排成時間軸（同行人共享）
import { useState, useEffect } from 'preact/hooks';
import { html, Sheet, Field, Empty, ImageGrid, ImagePicker, Lightbox, toast, errMsg, fmtDate, daysBetween, confirmBox } from '../ui.js';
import { groupStops } from '../itin.js';

export function MemoriesView({ app }) {
  const { store, trip, companions, profile } = app;
  const [list, setList] = useState(null);
  const [stops, setStops] = useState([]);
  const [edit, setEdit] = useState(null);
  const [big, setBig] = useState(null);

  useEffect(() => {
    Promise.all([store.list('memories', { trip_id: trip.id }), store.list('itinerary', { trip_id: trip.id })])
      .then(([m, s]) => { setList(m); setStops(s); }).catch(errMsg);
  }, [trip.id, app.version]);

  if (!list) return html`<div class="loading">載入中…</div>`;
  const days = daysBetween(trip.start_date, trip.end_date);
  const author = id => store.mode !== 'cloud' ? '' : id === store.userId ? profile.display_name
    : companions.find(c => c.user_id === id)?.profile?.display_name || '';
  const stopName = id => stops.find(s => s.id === id)?.title;
  const photos = list.reduce((n, m) => n + (m.images?.length || 0), 0);

  const groups = [];
  for (const m of [...list].sort((a, b) => (a.day || '9999').localeCompare(b.day || '9999') || String(a.created_at).localeCompare(String(b.created_at)))) {
    const g = groups.find(x => x.day === (m.day || null));
    if (g) g.items.push(m); else groups.push({ day: m.day || null, items: [m] });
  }

  return html`
    <div class="page">
      <div class="page-head">
        <h2>📸 回憶</h2>
        <button class="btn primary sm" onClick=${() => setEdit({})}>＋ 新增</button>
      </div>
      ${list.length > 0 && html`<div class="hint">共 ${list.length} 則回憶、${photos} 張照片${store.mode === 'cloud' ? '，同行人都看得到' : ''}</div>`}
      ${!list.length && html`<${Empty} icon="📸" text="旅途中拍的照片和心情記在這裡，旅程結束後就是一本回憶相簿。" />`}
      ${groups.map(g => html`
        <section class="mem-day" key=${g.day || 'none'}>
          <div class="day-head">
            <span class="day-no" style=${{ background: '#f59f00' }}>${g.day ? (days.includes(g.day) ? `Day ${days.indexOf(g.day) + 1}` : fmtDate(g.day)) : '其他'}</span>
            <span class="muted">${g.day && days.includes(g.day) ? fmtDate(g.day) : ''}</span>
          </div>
          ${g.items.map(m => html`
            <div class="card memory" key=${m.id}>
              <${ImageGrid} store=${store} images=${m.images} onOpen=${setBig} />
              ${m.caption && html`<div class="mem-caption">${m.caption}</div>`}
              <div class="row gap muted small-text">
                ${stopName(m.itinerary_id) && html`<span>📍 ${stopName(m.itinerary_id)}</span>`}
                ${author(m.created_by) && html`<span>✍️ ${author(m.created_by)}</span>`}
                <button class="icon-btn push" onClick=${() => setEdit(m)}>✎</button>
              </div>
            </div>`)}
        </section>`)}
      <${Lightbox} store=${store} refId=${big} onClose=${() => setBig(null)} />
      ${edit && html`<${MemoryForm} app=${app} item=${edit} stops=${stops} days=${days}
        onClose=${() => setEdit(null)} onSaved=${() => { setEdit(null); app.bump(); }} />`}
    </div>`;
}

function MemoryForm({ app, item, stops, days, onClose, onSaved }) {
  const { store, trip } = app;
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ caption: '', images: [], day: days.includes(today) ? today : days[0] || today, itinerary_id: null, ...item });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const dayStops = groupStops(stops, trip).find(g => g.day === f.day)?.items || [];

  const save = async e => {
    e.preventDefault();
    if (!f.caption.trim() && !f.images.length) return toast('加一張照片或寫幾個字吧');
    setSaving(true);
    try {
      await store.put('memories', { ...f, trip_id: trip.id, caption: f.caption.trim(), day: f.day || null, itinerary_id: f.itinerary_id || null });
      onSaved();
    } catch (err) { errMsg(err); }
    setSaving(false);
  };
  const del = async () => {
    if (!(await confirmBox('刪除這則回憶和裡面的照片？'))) return;
    try { await store.remove('memories', item.id); onSaved(); } catch (err) { errMsg(err); }
  };

  return html`
    <${Sheet} title=${item.id ? '編輯回憶' : '新增回憶'} onClose=${onClose}>
      <form class="form" onSubmit=${save}>
        <${ImageGrid} store=${store} images=${f.images} onRemove=${ref => { set('images', f.images.filter(x => x !== ref)); store.removeImage(ref); }} />
        <${ImagePicker} store=${store} shared label="📷 加入照片" onAdd=${refs => set('images', [...(f.images || []), ...refs])} />
        <${Field} label="想記下的話"><textarea class="input" rows="3" value=${f.caption} placeholder="例：終於吃到排了一小時的鬆餅！"
          onInput=${e => set('caption', e.target.value)}></textarea></${Field}>
        <div class="row gap wrap">
          <${Field} label="日期">
            ${days.length ? html`<select class="input" value=${f.day || ''} onChange=${e => setF(x => ({ ...x, day: e.target.value || null, itinerary_id: null }))}>
                <option value="">其他</option>
                ${days.map((d, i) => html`<option value=${d}>Day ${i + 1} · ${fmtDate(d)}</option>`)}
              </select>`
            : html`<input class="input" type="date" value=${f.day || ''} onInput=${e => set('day', e.target.value)} />`}
          </${Field}>
          ${dayStops.length > 0 && html`<${Field} label="在哪一站">
            <select class="input" value=${f.itinerary_id || ''} onChange=${e => set('itinerary_id', e.target.value || null)}>
              <option value="">不指定</option>
              ${dayStops.map(s => html`<option value=${s.id}>${s.title}</option>`)}
            </select></${Field}>`}
        </div>
        <div class="row gap sheet-actions">
          ${item.id && html`<button type="button" class="btn danger" onClick=${del}>刪除</button>`}
          <div class="grow"></div>
          <button type="button" class="btn ghost" onClick=${onClose}>取消</button>
          <button class="btn primary" disabled=${saving}>${saving ? '儲存中…' : '儲存'}</button>
        </div>
      </form>
    </${Sheet}>`;
}
