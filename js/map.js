// 3D 地圖：MapLibre（OpenFreeMap 免費圖資 + 3D 建築）＋ Three.js 角色圖層
import * as THREE from 'three';
import { buildAvatar, addLights, disposeTree } from './avatar.js';

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const AVATAR_PX = 70; // 角色在螢幕上大約的高度（像素）

export function distMeters(a, b) {
  const R = 6371e3, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export class TripMap {
  constructor(container, { center = [121.5654, 25.033], zoom = 16, onClick } = {}) {
    this.actors = new Map();
    this.pins = [];
    this.onClick = onClick;
    this.map = new maplibregl.Map({
      container,
      style: STYLE,
      center,
      zoom,
      pitch: 55,
      bearing: -15,
      maxPitch: 70,
      attributionControl: { compact: true },
    });
    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    this.map.on('click', e => this.onClick?.(e.lngLat));
    this.ready = new Promise(res => this.map.on('load', res));
    this.ready.then(() => {
      this.map.addSource('stop-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      this.map.addLayer({
        id: 'stop-lines', type: 'line', source: 'stop-lines',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 3.5, 'line-opacity': 0.8, 'line-dasharray': [1.5, 1.5] },
      });
      this.map.addLayer(this._avatarLayer());
      this.map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      this.map.addLayer({
        id: 'route-casing', type: 'line', source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 9 },
      });
      this.map.addLayer({
        id: 'route-line', type: 'line', source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#4c6ef5', 'line-width': 5, 'line-dasharray': [1, 0.0] },
      });
    });
    this._last = performance.now();
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    for (const id of [...this.actors.keys()]) this.removeActor(id);
    this.map.remove();
  }

  resize() { this.map.resize(); }

  flyTo(lng, lat, zoom) {
    this.map.flyTo({ center: [lng, lat], zoom: zoom ?? Math.max(this.map.getZoom(), 16), speed: 1.4 });
  }

  /* ---------- 角色 ---------- */
  setActor(id, { avatar, label, color = '#4c6ef5', lng, lat }) {
    let a = this.actors.get(id);
    const key = JSON.stringify(avatar || {});
    if (!a) {
      const el = document.createElement('div');
      el.className = 'actor-label';
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -AVATAR_PX - 4] })
        .setLngLat([lng, lat]).addTo(this.map);
      a = { id, pos: { lng, lat }, target: { lng, lat }, heading: 0, walking: false, marker, el };
      this.actors.set(id, a);
    }
    if (a.key !== key) {
      if (a.obj) { this.scene?.remove(a.obj); disposeTree(a.obj); }
      a.obj = buildAvatar(avatar);
      a.obj.rotation.y = a.heading;
      a.key = key;
      this.scene?.add(a.obj);
    }
    a.el.textContent = label || '';
    a.el.style.display = label ? '' : 'none';
    a.el.style.setProperty('--c', color);
    if (lng != null && lat != null) this.moveActor(id, lng, lat);
    return a;
  }

  moveActor(id, lng, lat, { instant = false } = {}) {
    const a = this.actors.get(id);
    if (!a) return;
    a.target = { lng, lat };
    if (instant || distMeters(a.pos, a.target) > 5000) a.pos = { lng, lat };
  }

  actorPos(id) { return this.actors.get(id)?.pos; }

  removeActor(id) {
    const a = this.actors.get(id);
    if (!a) return;
    a.marker.remove();
    if (a.obj) { this.scene?.remove(a.obj); disposeTree(a.obj); }
    this.actors.delete(id);
  }

  /* ---------- 圖釘（地點 / 行程） ---------- */
  setPins(list) {
    this.pins.forEach(p => p.remove());
    this.pins = list.filter(p => p.lat != null && p.lng != null).map(p => {
      const el = document.createElement('button');
      el.className = 'pin ' + (p.className || '');
      el.innerHTML = `<span>${p.emoji || '📍'}</span>`;
      if (p.color) el.style.setProperty('--pc', p.color);
      el.title = p.title || '';
      el.addEventListener('click', ev => { ev.stopPropagation(); p.onClick?.(); });
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(this.map);
    });
  }

  // 每天的行程用虛線依序連起來：lines = [{ color, coords: [[lng, lat], ...] }]
  async setStopLines(lines) {
    await this.ready;
    this.map.getSource('stop-lines').setData({
      type: 'FeatureCollection',
      features: lines.filter(l => l.coords.length > 1).map(l => ({
        type: 'Feature', properties: { color: l.color }, geometry: { type: 'LineString', coordinates: l.coords },
      })),
    });
  }

  fitTo(points) {
    if (!points.length) return false;
    if (points.length === 1) { this.flyTo(points[0].lng, points[0].lat, 16); return true; }
    const b = new maplibregl.LngLatBounds();
    points.forEach(p => b.extend([p.lng, p.lat]));
    this.map.fitBounds(b, { padding: { top: 100, bottom: 120, left: 50, right: 80 }, maxZoom: 16, pitch: 45 });
    return true;
  }

  async setRoute(geometry) {
    await this.ready;
    this.map.getSource('route').setData(geometry
      ? { type: 'Feature', geometry, properties: {} }
      : { type: 'FeatureCollection', features: [] });
    if (geometry) {
      const b = new maplibregl.LngLatBounds();
      geometry.coordinates.forEach(c => b.extend(c));
      this.map.fitBounds(b, { padding: { top: 90, bottom: 220, left: 40, right: 40 }, maxZoom: 17 });
    }
  }

  /* ---------- 動畫 ---------- */
  _loop(now) {
    const dt = Math.min(0.1, (now - this._last) / 1000);
    this._last = now;
    const t = now / 1000;
    for (const a of this.actors.values()) {
      const d = distMeters(a.pos, a.target);
      if (d > 0.3) {
        const speed = Math.max(4, d / 2.5); // m/s：遠一點就走快一點，約 2.5 秒到
        const k = Math.min(1, (speed * dt) / d);
        const dLng = a.target.lng - a.pos.lng, dLat = a.target.lat - a.pos.lat;
        a.pos = { lng: a.pos.lng + dLng * k, lat: a.pos.lat + dLat * k };
        // 東 = +x、南 = +z（Three 座標）
        const want = Math.atan2(dLng * Math.cos((a.pos.lat * Math.PI) / 180), -dLat);
        let diff = want - a.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        a.heading += diff * Math.min(1, dt * 10);
        a.walking = true;
        a.marker.setLngLat([a.pos.lng, a.pos.lat]);
      } else {
        a.walking = false;
      }
      if (a.obj) {
        a.obj.rotation.y = a.heading;
        a.obj.userData.update(t, a.walking);
      }
    }
    if (this.actors.size) this.map.triggerRepaint();
    this._raf = requestAnimationFrame(this._loop);
  }

  _avatarLayer() {
    const self = this;
    return {
      id: 'avatars',
      type: 'custom',
      renderingMode: '3d',
      onAdd(map, gl) {
        self.camera = new THREE.Camera();
        self.scene = new THREE.Scene();
        addLights(self.scene);
        for (const a of self.actors.values()) if (a.obj) self.scene.add(a.obj);
        self.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
        self.renderer.autoClear = false;
      },
      render(gl, matrix) {
        const map = self.map;
        const c = map.getCenter();
        const origin = maplibregl.MercatorCoordinate.fromLngLat([c.lng, c.lat], 0);
        const s = origin.meterInMercatorCoordinateUnits();
        const metersPerPx = (40075016.686 * Math.cos((c.lat * Math.PI) / 180)) / (512 * 2 ** map.getZoom());
        const size = AVATAR_PX * metersPerPx;
        for (const a of self.actors.values()) {
          if (!a.obj) continue;
          const mc = maplibregl.MercatorCoordinate.fromLngLat([a.pos.lng, a.pos.lat], 0);
          a.obj.position.set((mc.x - origin.x) / s, 0, (mc.y - origin.y) / s);
          a.obj.scale.setScalar(size);
        }
        const l = new THREE.Matrix4()
          .makeTranslation(origin.x, origin.y, origin.z)
          .scale(new THREE.Vector3(s, -s, s))
          .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
        self.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(l);
        self.renderer.resetState();
        self.renderer.render(self.scene, self.camera);
      },
    };
  }
}
