import { useState, useEffect } from 'preact/hooks';
import { html, Sheet, Field, Empty, toast, errMsg, fmtDate, confirmBox } from '../ui.js';
import { searchPlaces } from '../geo.js';
import { AvatarPreview } from './avatar-editor.js';

const EMOJIS = ['🧳', '🗼', '🏯', '🏝️', '🏔️', '🍜', '🎡', '🌸', '🍁', '❄️', '🏖️', '🚄'];
const COLORS = ['#ffa8a8', '#ffd8a8', '#ffec99', '#b2f2bb', '#a5d8ff', '#d0bfff', '#fcc2d7', '#99e9f2'];

export function TripList({ app, onOpen }) {
  const { store, profile } = app;
  const [trips, setTrips] = useState(null);
  const [editing, setEditing] = useState(null);
  const [joining, setJoining] = useState(false);

  const load = () => store.list('trips').then(t => setTrips(t.reverse())).catch(errMsg);
  useEffect(() => { load(); }, [store]);

  const today = new Date().toISOString().slice(0, 10);
  const status = t => !t.start_date ? '' : t.end_date && t.end_date < today ? 'past'
    : t.start_date <= today ? 'now' : 'soon';

  return html`
    <div class="page trips-page">
      <header class="hero">
        <div class="hero-avatar" onClick=${() => app.go('profile')}>
          <${AvatarPreview} config=${profile.avatar} height=${150} />
        </div>
        <div class="hero-text">
          <div class="hero-hi">嗨，${profile.display_name}！</div>
          <div class="hero-sub">下一趟要去哪裡呢？</div>
          <div class="row gap wrap">
            <button class="btn primary" onClick=${() => setEditing({})}>＋ 新旅程</button>
            ${store.mode === 'cloud' && html`<button class="btn ghost" onClick=${() => setJoining(true)}>🔑 用邀請碼加入</button>`}
          </div>
        </div>
      </header>

      ${trips === null ? html`<div class="loading">載入中…</div>`
      : !trips.length ? html`<${Empty} icon="🗺️" text="還沒有旅程，建立第一趟吧！" />`
      : html`<div class="trip-grid">
          ${trips.map(t => html`
            <div class="trip-card" key=${t.id} style=${{ '--c': t.color || '#a5d8ff' }} onClick=${() => onOpen(t)}>
              <div class="trip-emoji">${t.emoji || '🧳'}</div>
              <div class="trip-info">
                <div class="trip-name">${t.name}</div>
                <div class="trip-meta">${t.destination || ''}</div>
                <div class="trip-meta">${t.start_date ? `${fmtDate(t.start_date)} – ${fmtDate(t.end_date || t.start_date)}` : '未定日期'}</div>
              </div>
              ${status(t) === 'now' && html`<span class="badge now">旅行中</span>`}
              ${status(t) === 'past' && html`<span class="badge past">回憶</span>`}
              <button class="icon-btn card-edit" onClick=${e => { e.stopPropagation(); setEditing(t); }}>✎</button>
            </div>`)}
        </div>`}

      ${editing && html`<${TripForm} app=${app} trip=${editing} onClose=${() => setEditing(null)}
        onSaved=${() => { setEditing(null); load(); }} />`}
      ${joining && html`<${JoinForm} app=${app} onClose=${() => setJoining(false)}
        onJoined=${() => { setJoining(false); load(); }} />`}
    </div>`;
}

export function TripForm({ app, trip, onClose, onSaved }) {
  const { store } = app;
  const [f, setF] = useState({
    name: '', destination: '', start_date: '', end_date: '',
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    ...trip,
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const isOwner = !trip.id || store.mode === 'local' || trip.owner_id === store.userId;

  const save = async e => {
    e.preventDefault();
    if (!f.name.trim()) return toast('請輸入旅程名稱');
    setBusy(true);
    try {
      const row = { ...f };
      if (row.end_date && row.start_date && row.end_date < row.start_date) row.end_date = row.start_date;
      for (const k of ['start_date', 'end_date']) if (!row[k]) row[k] = null;
      // 用目的地決定地圖的起始位置
      if (row.destination && (row.destination !== trip.destination || !row.center)) {
        try {
          const [hit] = await searchPlaces(row.destination);
          if (hit) row.center = { lat: hit.lat, lng: hit.lng };
        } catch { /* 找不到就算了 */ }
      }
      await store.put('trips', row);
      onSaved();
    } catch (err) { errMsg(err); }
    setBusy(false);
  };

  const del = async () => {
    if (!(await confirmBox(`確定刪除「${trip.name}」？裡面的行程、地點、筆記都會一起刪除。`))) return;
    try { await store.remove('trips', trip.id); onSaved(); } catch (err) { errMsg(err); }
  };

  return html`
    <${Sheet} title=${trip.id ? '編輯旅程' : '新旅程'} onClose=${onClose}>
      <form onSubmit=${save} class="form">
        <${Field} label="旅程名稱"><input class="input" value=${f.name} placeholder="例：東京賞櫻五日遊"
          onInput=${e => set('name', e.target.value)} /></${Field}>
        <${Field} label="目的地（用來定位地圖）"><input class="input" value=${f.destination || ''} placeholder="例：東京"
          onInput=${e => set('destination', e.target.value)} /></${Field}>
        <div class="row gap">
          <${Field} label="出發"><input class="input" type="date" value=${f.start_date || ''}
            onInput=${e => set('start_date', e.target.value)} /></${Field}>
          <${Field} label="回程"><input class="input" type="date" value=${f.end_date || ''}
            onInput=${e => set('end_date', e.target.value)} /></${Field}>
        </div>
        <${Field} label="圖示">
          <div class="emoji-row">${EMOJIS.map(em => html`
            <button type="button" class=${'emoji-btn' + (f.emoji === em ? ' on' : '')} onClick=${() => set('emoji', em)}>${em}</button>`)}
          </div>
        </${Field}>
        <${Field} label="顏色">
          <div class="swatches">${COLORS.map(c => html`
            <button type="button" class=${'swatch' + (f.color === c ? ' on' : '')} style=${{ background: c }} onClick=${() => set('color', c)}></button>`)}
          </div>
        </${Field}>
        <div class="row gap end">
          ${trip.id && isOwner && html`<button type="button" class="btn danger" onClick=${del}>刪除</button>`}
          <div class="grow"></div>
          <button class="btn primary" disabled=${busy}>${busy ? '儲存中…' : '儲存'}</button>
        </div>
      </form>
    </${Sheet}>`;
}

function JoinForm({ app, onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const join = async e => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      await app.store.joinTrip(code);
      toast('🎉 加入成功！');
      onJoined();
    } catch (err) { errMsg(err); }
    setBusy(false);
  };
  return html`
    <${Sheet} title="加入朋友的旅程" onClose=${onClose}>
      <form class="form" onSubmit=${join}>
        <p class="muted">請朋友在旅程的「同行」頁面把 6 碼邀請碼給你。</p>
        <input class="input code-input" value=${code} maxlength="6" placeholder="ABC123"
          onInput=${e => setCode(e.target.value.toUpperCase())} />
        <button class="btn primary block" disabled=${busy}>${busy ? '加入中…' : '加入'}</button>
      </form>
    </${Sheet}>`;
}
