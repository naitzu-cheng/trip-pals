import { useState, useEffect, useRef } from 'preact/hooks';
import { html, Segmented, toast, errMsg } from '../ui.js';
import { TripMap, distMeters } from '../map.js';
import { searchPlaces, reverseGeocode, route, googleMapsDirections, googleMapsPlace, TRAVEL_MODES, fmtDist, fmtDur } from '../geo.js';
import { catEmoji, MEMBER_COLORS } from '../consts.js';

export function MapView({ app, visible }) {
  const { store, trip, profile, pos, companions } = app;
  const host = useRef();
  const mapRef = useRef();
  const [places, setPlaces] = useState([]);
  const [stops, setStops] = useState([]);
  const [card, setCard] = useState(null); // { name, address, lat, lng, kind, ref }
  const [mode, setMode] = useState('browse'); // browse | mark
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [travel, setTravel] = useState('foot');
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const appRef = useRef(app);
  appRef.current = app;

  // 建立地圖（只做一次）
  useEffect(() => {
    const c = trip.center || (pos ? { lng: pos.lng, lat: pos.lat } : null);
    const m = new TripMap(host.current, {
      center: c ? [c.lng, c.lat] : [121.5654, 25.033],
      zoom: c ? 16 : 13,
      onClick: async ll => {
        const a = appRef.current;
        if (modeRef.current === 'mark') {
          setMode('browse');
          setCard({ name: '查詢地點中…', lat: ll.lat, lng: ll.lng, kind: 'new' });
          const info = await reverseGeocode(ll.lat, ll.lng);
          setCard({ ...info, lat: ll.lat, lng: ll.lng, kind: 'new' });
        } else if (a.simulate) {
          a.setSimPos({ lat: ll.lat, lng: ll.lng });
        } else {
          setCard(null);
        }
      },
    });
    mapRef.current = m;
    return () => m.destroy();
  }, []);

  useEffect(() => { if (visible) setTimeout(() => mapRef.current?.resize(), 30); }, [visible]);

  // 從其他頁面按「地圖」跳過來
  useEffect(() => {
    const f = app.focus;
    if (!f || f.lat == null) return;
    setTimeout(() => mapRef.current?.flyTo(f.lng, f.lat, 17), 80);
    if (f.name) setCard({ ...f, kind: f.trip_id ? 'place' : 'new', ref: f });
  }, [app.focus]);

  // 讀取地點和行程
  useEffect(() => {
    Promise.all([store.list('places', { trip_id: trip.id }), store.list('itinerary', { trip_id: trip.id })])
      .then(([p, s]) => { setPlaces(p); setStops(s); })
      .catch(errMsg);
  }, [trip.id, app.version]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const sortedStops = [...stops].sort((a, b) => `${a.day}${a.time}`.localeCompare(`${b.day}${b.time}`));
    m.setPins([
      ...places.map(p => ({
        ...p, emoji: catEmoji(p.category), title: p.name, className: 'mine',
        onClick: () => setCard({ ...p, kind: 'place', ref: p }),
      })),
      ...sortedStops.map((s, i) => ({
        ...s, emoji: String(i + 1), title: s.title, className: 'stop',
        onClick: () => setCard({ name: s.title, address: s.address, lat: s.lat, lng: s.lng, kind: 'stop', ref: s }),
      })),
    ]);
  }, [places, stops]);

  // 我的角色
  const firstFix = useRef(true);
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !pos) return;
    m.setActor('me', { avatar: profile.avatar, label: profile.display_name, lng: pos.lng, lat: pos.lat, color: '#e8590c' });
    if (firstFix.current) {
      firstFix.current = false;
      m.moveActor('me', pos.lng, pos.lat, { instant: true });
      if (!trip.center || distMeters(pos, trip.center) < 30000) m.flyTo(pos.lng, pos.lat, 17);
    }
  }, [pos?.lat, pos?.lng, JSON.stringify(profile.avatar), profile.display_name]);

  // 同行人的角色
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const seen = new Set(['me']);
    companions.forEach((c, i) => {
      if (c.user_id === store.userId || !c.loc) return;
      const id = 'u:' + c.user_id;
      seen.add(id);
      const mins = Math.round((Date.now() - new Date(c.loc.updated_at)) / 60000);
      m.setActor(id, {
        avatar: c.profile?.avatar, color: MEMBER_COLORS[(i + 1) % MEMBER_COLORS.length],
        label: `${c.profile?.display_name || '夥伴'}${mins >= 2 ? ` · ${mins} 分前` : ''}`,
        lng: c.loc.lng, lat: c.loc.lat,
      });
    });
    for (const id of [...m.actors.keys()]) if (!seen.has(id)) m.removeActor(id);
  }, [companions]);

  const doSearch = async e => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    try {
      const c = mapRef.current.map.getCenter();
      setResults(await searchPlaces(q.trim(), { lat: c.lat, lng: c.lng }));
    } catch (err) { errMsg(err); }
    setSearching(false);
  };

  const pickResult = r => {
    setResults(null);
    setCard({ ...r, kind: 'new' });
    mapRef.current.flyTo(r.lng, r.lat, 17);
  };

  const addPlace = async () => {
    try {
      const p = await store.put('places', { trip_id: trip.id, name: card.name, address: card.address, lat: card.lat, lng: card.lng, category: 'sight', images: [] });
      app.bump();
      toast('⭐ 已加入我的地點');
      setCard({ ...p, kind: 'place', ref: p });
    } catch (err) { errMsg(err); }
  };

  const addStop = async () => {
    try {
      await store.put('itinerary', { trip_id: trip.id, title: card.name, address: card.address, lat: card.lat, lng: card.lng, day: trip.start_date || null, time: '' });
      app.bump();
      toast('🗓️ 已加入行程（可到「行程」調整日期時間）');
    } catch (err) { errMsg(err); }
  };

  const showRoute = async (mode = travel) => {
    if (!pos) return toast('還沒取得你的位置，請先按 📍 定位，或開啟模擬模式點地圖');
    setTravel(mode);
    if (mode === 'transit') {
      setRouteInfo({ transit: true });
      return mapRef.current.setRoute(null);
    }
    try {
      setRouteInfo({ loading: true });
      const r = await route(pos, card, mode);
      setRouteInfo(r);
      mapRef.current.setRoute(r.geometry);
    } catch (err) { setRouteInfo(null); errMsg(err); }
  };

  const closeCard = () => { setCard(null); setRouteInfo(null); mapRef.current?.setRoute(null); };

  const locate = () => {
    if (pos) mapRef.current.flyTo(pos.lng, pos.lat, 17);
    else app.startGps(true);
  };

  return html`
    <div class="map-view">
      <div class="map-host" ref=${host}></div>

      <form class="map-search" onSubmit=${doSearch}>
        <input class="input" placeholder="🔍 搜尋地點、店名、車站…" value=${q} onInput=${e => setQ(e.target.value)} />
        ${searching && html`<span class="spin">⏳</span>`}
      </form>
      ${results && html`
        <div class="search-results">
          ${!results.length && html`<div class="muted pad">找不到結果，換個關鍵字試試</div>`}
          ${results.map(r => html`<button class="result" onClick=${() => pickResult(r)}>
            <b>${r.name}</b><small>${r.address}</small></button>`)}
          <button class="result close" onClick=${() => setResults(null)}>關閉</button>
        </div>`}

      <div class="map-fabs">
        <button class=${'fab' + (mode === 'mark' ? ' on' : '')} title="標註地點"
          onClick=${() => { setMode(mode === 'mark' ? 'browse' : 'mark'); if (mode !== 'mark') toast('點地圖上任一處來標註'); }}>📌</button>
        <button class=${'fab' + (app.simulate ? ' on' : '')} title="模擬走路"
          onClick=${() => app.setSimulate(!app.simulate)}>🎮</button>
        <button class="fab" title="回到我的位置" onClick=${locate}>📍</button>
      </div>
      ${app.simulate && html`<div class="sim-banner">🎮 模擬模式：點地圖，角色就會走過去</div>`}
      ${mode === 'mark' && html`<div class="sim-banner mark">📌 點地圖上的位置來標註</div>`}

      ${card && html`
        <div class="place-card">
          <button class="icon-btn card-close" onClick=${closeCard}>✕</button>
          <div class="pc-title">${card.kind === 'place' ? catEmoji(card.category) + ' ' : card.kind === 'stop' ? '🗓️ ' : ''}${card.name}</div>
          ${card.address && html`<div class="pc-addr">${card.address}</div>`}
          ${pos && html`<div class="pc-dist">距離你約 ${fmtDist(distMeters(pos, card))}</div>`}
          <div class="row gap wrap">
            ${card.kind === 'new' && html`
              <button class="btn primary sm" onClick=${addPlace}>⭐ 加入我的地點</button>
              <button class="btn ghost sm" onClick=${addStop}>🗓️ 加入行程</button>`}
            ${card.kind === 'place' && html`
              <button class="btn primary sm" onClick=${() => app.openPlace(card.ref.id)}>📝 想逛 / 想買清單</button>
              <button class="btn ghost sm" onClick=${addStop}>🗓️ 加入行程</button>`}
            ${card.kind === 'stop' && html`<button class="btn ghost sm" onClick=${() => app.go('itinerary')}>查看行程</button>`}
            <button class="btn ghost sm" onClick=${() => showRoute()}>🧭 路線</button>
            <a class="btn ghost sm" href=${googleMapsPlace(card)} target="_blank" rel="noopener">G 地圖</a>
          </div>
          ${routeInfo && html`
            <div class="route-box">
              <${Segmented} value=${travel} options=${TRAVEL_MODES} onChange=${showRoute} />
              ${routeInfo.loading ? html`<div class="muted">規劃路線中…</div>`
              : routeInfo.transit ? html`<div class="muted">大眾運輸路線請用 Google 地圖查看即時班次</div>`
              : html`<div class="route-sum">${fmtDist(routeInfo.distance)} · 約 ${fmtDur(routeInfo.duration)}</div>`}
              <a class="btn primary sm block" target="_blank" rel="noopener" href=${googleMapsDirections(pos, card, travel)}>
                用 Google 地圖導航 ↗</a>
            </div>`}
        </div>`}
    </div>`;
}
