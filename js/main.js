import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { html, render, toast, errMsg } from './ui.js';
import { openLocal, openCloud, cloudConfigured, supabase } from './store.js';
import { DEFAULT_AVATAR } from './avatar.js';
import { distMeters } from './map.js';
import { AvatarEditor, AvatarPreview } from './views/avatar-editor.js';
import { TripList } from './views/trips.js';
import { MapView } from './views/map-view.js';
import { ItineraryView } from './views/itinerary.js';
import { PlacesView } from './views/places.js';
import { NotesView } from './views/notes.js';
import { CompanionsView } from './views/companions.js';
import { AuthView } from './views/auth.js';

const TABS = [
  ['map', '🗺️', '地圖'],
  ['itinerary', '🗓️', '行程'],
  ['places', '⭐', '地點'],
  ['notes', '📒', '筆記'],
  ['companions', '👥', '同行'],
];

function App() {
  const [store, setStore] = useState(null);
  const [needAuth, setNeedAuth] = useState(false);
  const [profile, setProfile] = useState(undefined);
  const [screen, setScreen] = useState('trips'); // trips | trip | profile
  const [trip, setTrip] = useState(null);
  const [tab, setTab] = useState('map');
  const [version, setVersion] = useState(0);
  const [pos, setPos] = useState(null);
  const [simulate, setSimulateState] = useState(false);
  const [companions, setCompanions] = useState([]);
  const [openPlaceId, setOpenPlaceId] = useState(null);
  const [focus, setFocus] = useState(null);
  const watchId = useRef(null);
  const simRef = useRef(false);

  /* ---------- 啟動：決定本機 / 雲端 ---------- */
  const boot = useCallback(async (forceLocal = false) => {
    try {
      if (cloudConfigured() && !forceLocal && localStorage.getItem('trippals.mode') !== 'local') {
        const sb = await supabase();
        const { data } = await sb.auth.getSession();
        if (!data.session) { setNeedAuth(true); return; }
        setNeedAuth(false);
        const s = await openCloud(data.session.user);
        const { data: p } = await sb.from('profiles').select('*').eq('id', s.userId).maybeSingle();
        setStore(s);
        setProfile(p?.avatar ? p : null);
      } else {
        const s = await openLocal();
        const [p] = await s.list('profiles');
        setStore(s);
        setProfile(p || null);
      }
    } catch (e) { errMsg(e); }
  }, []);
  useEffect(() => { boot(); }, []);

  // 自動打開上次的旅程
  useEffect(() => {
    if (!store || !profile) return;
    const last = localStorage.getItem('trippals.lastTrip');
    if (last) store.list('trips', { id: last }).then(([t]) => t && openTrip(t)).catch(() => {});
  }, [store, !!profile]);

  /* ---------- 定位 ---------- */
  const startGps = useCallback(fly => {
    if (!navigator.geolocation) return toast('這個瀏覽器不支援定位');
    if (watchId.current != null) return;
    watchId.current = navigator.geolocation.watchPosition(
      p => { if (!simRef.current) setPos({ lat: p.coords.latitude, lng: p.coords.longitude, heading: p.coords.heading }); },
      err => {
        watchId.current != null && navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        if (fly) toast(err.code === 1 ? '定位權限被拒絕，可改用 🎮 模擬模式' : '無法取得位置：' + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, []);
  const setSimulate = on => {
    simRef.current = on;
    setSimulateState(on);
    if (on) toast('點地圖任一處，角色就會走過去');
  };

  /* ---------- 同行人（雲端） ---------- */
  const refreshCompanions = useCallback(async () => {
    if (!store || store.mode !== 'cloud' || !trip) return setCompanions([]);
    try {
      const [members, locs] = await Promise.all([store.members(trip.id), store.locations(trip.id)]);
      setCompanions(members.map(m => ({ ...m, loc: locs.find(l => l.user_id === m.user_id) })));
    } catch (e) { console.warn(e); }
  }, [store, trip?.id]);

  useEffect(() => {
    refreshCompanions();
    if (store?.mode !== 'cloud' || !trip) return;
    const t = setInterval(refreshCompanions, 8000);
    return () => clearInterval(t);
  }, [refreshCompanions]);

  // 有開分享時上傳自己的位置（每 10 秒或移動超過 15 公尺）
  const lastPush = useRef({ t: 0, p: null });
  const sharing = companions.find(c => c.user_id === store?.userId)?.share_location;
  useEffect(() => {
    if (!sharing || !pos || !trip) return;
    const lp = lastPush.current;
    const now = Date.now();
    if (lp.p && now - lp.t < 10000 && distMeters(lp.p, pos) < 15) return;
    lastPush.current = { t: now, p: pos };
    store.pushLocation(trip.id, pos.lat, pos.lng, pos.heading ?? null).catch(e => console.warn(e));
  }, [pos, sharing, trip?.id]);

  /* ---------- 導覽 ---------- */
  const openTrip = t => {
    if (store) store.currentTrip = t.id;
    setTrip(t);
    setTab('map');
    setScreen('trip');
    setFocus(null);
    setOpenPlaceId(null);
    localStorage.setItem('trippals.lastTrip', t.id);
    startGps(false);
  };
  const closeTrip = () => {
    setTrip(null);
    setScreen('trips');
    localStorage.removeItem('trippals.lastTrip');
  };

  const saveProfile = async (avatar, display_name) => {
    const row = await store.put('profiles', { id: store.mode === 'cloud' ? store.userId : 'me', display_name, avatar });
    setProfile(row);
    setScreen(trip ? 'trip' : 'trips');
    toast('✨ 角色已更新');
  };

  const signOut = async () => {
    if (store.mode === 'cloud') await (await supabase()).auth.signOut();
    localStorage.removeItem('trippals.lastTrip');
    location.reload();
  };

  /* ---------- 畫面 ---------- */
  if (needAuth) {
    return html`<${AuthView} onDone=${() => boot()} onLocal=${() => { localStorage.setItem('trippals.mode', 'local'); boot(true); }} />`;
  }
  if (!store || profile === undefined) return html`<div class="boot">🧳 載入中…</div>`;

  if (!profile) {
    return html`
      <div class="page onboarding">
        <h1>歡迎來到 旅伴 🧳</h1>
        <p class="muted">先打造你的旅行角色吧！它會陪你在地圖上一起走。</p>
        <${AvatarEditor} initial=${DEFAULT_AVATAR} onSave=${saveProfile} />
      </div>`;
  }

  const app = {
    store, profile, trip, pos, companions, version, simulate, openPlaceId, focus,
    bump: () => setVersion(v => v + 1),
    go: t => { if (t === 'profile') setScreen('profile'); else { setScreen('trip'); setTab(t); } },
    openPlace: id => { setOpenPlaceId(id); if (id) { setScreen('trip'); setTab('places'); } },
    showOnMap: p => { setFocus({ ...p, _t: Date.now() }); setOpenPlaceId(null); setTab('map'); setScreen('trip'); },
    setSimulate, setSimPos: p => setPos(p), startGps, refreshCompanions, closeTrip,
  };

  if (screen === 'profile') {
    return html`
      <div class="page profile-page">
        <div class="topbar">
          <button class="icon-btn" onClick=${() => setScreen(trip ? 'trip' : 'trips')}>←</button>
          <div class="topbar-title">我的角色</div>
        </div>
        <${AvatarEditor} initial=${profile.avatar} name=${profile.display_name} onSave=${saveProfile}
          onCancel=${() => setScreen(trip ? 'trip' : 'trips')} />
        <div class="card account">
          <div>${store.mode === 'cloud' ? `☁️ 雲端模式 · ${store.user.email}` : '📱 本機模式（資料只存在這個瀏覽器）'}</div>
          <div class="row gap wrap">
            ${store.mode === 'cloud' && html`<button class="btn ghost sm" onClick=${signOut}>登出</button>`}
            ${store.mode === 'local' && cloudConfigured() && html`
              <button class="btn ghost sm" onClick=${() => { localStorage.removeItem('trippals.mode'); location.reload(); }}>切換到雲端模式</button>`}
          </div>
        </div>
      </div>`;
  }

  if (screen === 'trips' || !trip) {
    return html`<${TripList} app=${app} onOpen=${openTrip} />`;
  }

  return html`
    <div class="trip-shell">
      <div class="topbar">
        <button class="icon-btn" onClick=${closeTrip} aria-label="回旅程列表">←</button>
        <div class="topbar-title">${trip.emoji} ${trip.name}</div>
        <button class="me-btn" onClick=${() => setScreen('profile')} aria-label="我的角色">
          <${AvatarPreview} config=${profile.avatar} height=${40} spin=${false} />
        </button>
      </div>
      <main class="trip-main">
        <div class="tab-pane" style=${{ display: tab === 'map' ? '' : 'none' }}>
          <${MapView} app=${app} visible=${tab === 'map'} key=${trip.id} />
        </div>
        ${tab === 'itinerary' && html`<div class="tab-pane scroll"><${ItineraryView} app=${app} /></div>`}
        ${tab === 'places' && html`<div class="tab-pane scroll"><${PlacesView} app=${app} /></div>`}
        ${tab === 'notes' && html`<div class="tab-pane scroll"><${NotesView} app=${app} /></div>`}
        ${tab === 'companions' && html`<div class="tab-pane scroll"><${CompanionsView} app=${app} /></div>`}
      </main>
      <nav class="tabbar">
        ${TABS.map(([k, e, l]) => html`
          <button class=${tab === k ? 'on' : ''} onClick=${() => { setTab(k); if (k !== 'places') setOpenPlaceId(null); }}>
            <span class="tab-e">${e}</span><span>${l}</span>
          </button>`)}
      </nav>
    </div>`;
}

render(html`<${App} />`, document.getElementById('app'));

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
