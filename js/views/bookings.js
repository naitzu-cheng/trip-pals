// 🎫 票券與訂位：機票、車票、住宿、門票…（同行人共享）
import { useState, useEffect } from 'preact/hooks';
import { html, Sheet, Field, Empty, ImageGrid, ImagePicker, Lightbox, toast, errMsg, fmtDate, confirmBox } from '../ui.js';
import { BOOKING_KINDS, bookingKind } from '../consts.js';
import { googleMapsSearch } from '../geo.js';
import { groupStops, stopLabel } from '../itin.js';

const fmtWhen = s => s ? `${fmtDate(s.slice(0, 10))} ${s.slice(11, 16)}` : '';

export function BookingsView({ app, openId, onOpened }) {
  const { store, trip } = app;
  const [list, setList] = useState(null);
  const [stops, setStops] = useState([]);
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(null);

  useEffect(() => {
    Promise.all([store.list('bookings', { trip_id: trip.id }), store.list('itinerary', { trip_id: trip.id })])
      .then(([b, s]) => { setList(b); setStops(s); }).catch(errMsg);
  }, [trip.id, app.version]);
  useEffect(() => {
    if (openId && list) { const b = list.find(x => x.id === openId); if (b) setView(b); onOpened?.(); }
  }, [openId, list]);

  if (!list) return html`<div class="loading">載入中…</div>`;
  const sorted = [...list].sort((a, b) => (a.start_at || '9999').localeCompare(b.start_at || '9999'));
  const now = new Date().toISOString().slice(0, 16);
  const stopName = id => stops.find(s => s.id === id)?.title;

  const copy = async text => {
    try { await navigator.clipboard.writeText(text); toast('📋 已複製'); } catch { toast(text); }
  };

  return html`
    <div class="page">
      <div class="page-head">
        <h2>🎫 票券與訂位</h2>
        <button class="btn primary sm" onClick=${() => setEdit({})}>＋ 新增</button>
      </div>
      ${store.mode === 'cloud' && html`<div class="hint">👥 票券和訂位會與同行人共享，出發當天大家都找得到</div>`}
      ${!list.length && html`<${Empty} icon="🎫" text="把機票、車票、飯店、門票的訂位代號和 QR code 截圖放在這裡，出發當天不用翻 email。" />`}
      <div class="list">
        ${sorted.map(b => {
          const [, icon, label] = bookingKind(b.kind);
          const past = (b.end_at || b.start_at) && (b.end_at || b.start_at) < now;
          return html`
            <div class=${'card booking' + (past ? ' past' : '')} key=${b.id} onClick=${() => setView(b)}>
              <div class="booking-icon">${icon}</div>
              <div class="grow booking-main">
                <div class="booking-title">${b.title}</div>
                <div class="muted small-text">${label}${b.start_at ? ' · ' + fmtWhen(b.start_at) : ''}${b.end_at ? ' → ' + fmtWhen(b.end_at) : ''}</div>
                ${b.ref_code && html`<div class="ref-code" onClick=${e => { e.stopPropagation(); copy(b.ref_code); }}>🔖 ${b.ref_code} <small>複製</small></div>`}
              </div>
              ${b.images?.length > 0 && html`<span class="badge">📷 ${b.images.length}</span>`}
            </div>`;
        })}
      </div>
      ${view && html`<${BookingDetail} app=${app} b=${view} stopName=${stopName(view.itinerary_id)} copy=${copy}
        onClose=${() => setView(null)} onEdit=${() => { setEdit(view); setView(null); }} />`}
      ${edit && html`<${BookingForm} app=${app} item=${edit} stops=${stops}
        onClose=${() => setEdit(null)} onSaved=${() => { setEdit(null); app.bump(); }} />`}
    </div>`;
}

function BookingDetail({ app, b, stopName, copy, onClose, onEdit }) {
  const [big, setBig] = useState(null);
  const [, icon, label] = bookingKind(b.kind);
  return html`
    <${Sheet} title=${`${icon} ${b.title}`} onClose=${onClose}>
      <div class="form booking-detail">
        <div class="muted">${label}</div>
        ${b.start_at && html`<div>🕒 ${fmtWhen(b.start_at)}${b.end_at ? ` → ${fmtWhen(b.end_at)}` : ''}</div>`}
        ${b.ref_code && html`<button class="ref-code big" onClick=${() => copy(b.ref_code)}>🔖 ${b.ref_code} <small>點一下複製</small></button>`}
        ${b.place && html`<a href=${googleMapsSearch(b.place)} target="_blank" rel="noopener">📍 ${b.place} ↗</a>`}
        ${stopName && html`<div>🗓️ 對應行程：${stopName}</div>`}
        ${b.note && html`<div class="tl-note">${b.note}</div>`}
        <${ImageGrid} store=${app.store} images=${b.images} onOpen=${setBig} />
        <div class="row gap sheet-actions">
          <div class="grow"></div>
          <button class="btn primary" onClick=${onEdit}>編輯</button>
        </div>
      </div>
      <${Lightbox} store=${app.store} refId=${big} onClose=${() => setBig(null)} />
    </${Sheet}>`;
}

function BookingForm({ app, item, stops, onClose, onSaved }) {
  const { store, trip } = app;
  const [f, setF] = useState({ kind: 'flight', title: '', ref_code: '', start_at: '', end_at: '', place: '', note: '', images: [], itinerary_id: null, ...item });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const groups = groupStops(stops, trip);

  const save = async e => {
    e.preventDefault();
    if (!f.title.trim()) return toast('請輸入名稱，例如：長榮 BR198');
    setSaving(true);
    try {
      await store.put('bookings', {
        ...f, trip_id: trip.id, title: f.title.trim(), start_at: f.start_at || null, end_at: f.end_at || null,
        itinerary_id: f.itinerary_id || null,
      });
      onSaved();
    } catch (err) { errMsg(err); }
    setSaving(false);
  };
  const del = async () => {
    if (!(await confirmBox('刪除這張票券／訂位？'))) return;
    try { await store.remove('bookings', item.id); onSaved(); } catch (err) { errMsg(err); }
  };

  return html`
    <${Sheet} title=${item.id ? '編輯票券' : '新增票券／訂位'} onClose=${onClose}>
      <form class="form" onSubmit=${save}>
        <div class="chips wrap tight">
          ${BOOKING_KINDS.map(([k, icon, label]) => html`<button type="button" class=${'chip' + (f.kind === k ? ' on' : '')}
            onClick=${() => set('kind', k)}>${icon} ${label}</button>`)}
        </div>
        <${Field} label="名稱"><input class="input" value=${f.title} placeholder="例：長榮 BR198 台北→成田、新宿王子飯店"
          onInput=${e => set('title', e.target.value)} /></${Field}>
        <${Field} label="訂位代號／確認碼"><input class="input" value=${f.ref_code || ''} placeholder="例：6XK2QP"
          onInput=${e => set('ref_code', e.target.value)} /></${Field}>
        <div class="row gap wrap">
          <${Field} label=${f.kind === 'hotel' ? '入住' : '出發／開始'}><input class="input" type="datetime-local" value=${f.start_at || ''}
            onInput=${e => set('start_at', e.target.value)} /></${Field}>
          <${Field} label=${f.kind === 'hotel' ? '退房' : '抵達／結束'}><input class="input" type="datetime-local" value=${f.end_at || ''}
            onInput=${e => set('end_at', e.target.value)} /></${Field}>
        </div>
        <${Field} label="地點／地址（選填）"><input class="input" value=${f.place || ''} placeholder="例：成田機場第 2 航廈"
          onInput=${e => set('place', e.target.value)} /></${Field}>
        ${stops.length > 0 && html`<${Field} label="對應的行程（選填，行程上會顯示 🎫）">
          <select class="input" value=${f.itinerary_id || ''} onChange=${e => set('itinerary_id', e.target.value || null)}>
            <option value="">不指定</option>
            ${groups.map(g => g.items.map((s, i) => html`<option value=${s.id}>${stopLabel(g, i)} ${s.title}</option>`))}
          </select></${Field}>`}
        <${Field} label="備註"><textarea class="input" rows="2" value=${f.note || ''} placeholder="例：14:00 後可入住、行李限重 23kg"
          onInput=${e => set('note', e.target.value)}></textarea></${Field}>
        <${Field} label="QR code／電子票截圖">
          <${ImageGrid} store=${store} images=${f.images} onRemove=${ref => { set('images', f.images.filter(x => x !== ref)); store.removeImage(ref); }} />
          <${ImagePicker} store=${store} shared label="📷 加入截圖" onAdd=${refs => set('images', [...(f.images || []), ...refs])} />
        </${Field}>
        <div class="row gap sheet-actions">
          ${item.id && html`<button type="button" class="btn danger" onClick=${del}>刪除</button>`}
          <div class="grow"></div>
          <button type="button" class="btn ghost" onClick=${onClose}>取消</button>
          <button class="btn primary" disabled=${saving}>${saving ? '儲存中…' : '儲存'}</button>
        </div>
      </form>
    </${Sheet}>`;
}
