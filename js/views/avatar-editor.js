import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useState, useEffect, useRef } from 'preact/hooks';
import { html, Segmented, toast, errMsg } from '../ui.js';
import { buildAvatar, addLights, disposeTree, normalize, OPTIONS, PALETTE, PRESETS } from '../avatar.js';

export function AvatarPreview({ config, height = 260, spin = true, walking = false }) {
  const host = useRef();
  const st = useRef({});
  useEffect(() => {
    const s = st.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.current.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    addLights(scene);
    // 柔和的室內環境光，讓塑膠 / 公仔質感出來
    try {
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.traverse(o => { if (o.isLight) o.intensity *= 0.55; });
    } catch { /* 舊裝置不支援就算了 */ }
    const ground = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48), new THREE.MeshBasicMaterial({ color: '#e7f5ff', transparent: true, opacity: 0.9 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0.85, 2.6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.enablePan = false;
    controls.minDistance = 1.4;
    controls.maxDistance = 4;
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.autoRotate = spin;
    controls.autoRotateSpeed = 2;
    controls.update();
    Object.assign(s, { renderer, scene, camera, controls });
    const resize = () => {
      const w = host.current.clientWidth;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host.current);
    let raf;
    const loop = now => {
      s.avatar?.userData.update(now / 1000, s.walking);
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (s.avatar) disposeTree(s.avatar);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  useEffect(() => {
    const s = st.current;
    if (s.avatar) { s.scene.remove(s.avatar); disposeTree(s.avatar); }
    s.avatar = buildAvatar(config);
    s.scene.add(s.avatar);
  }, [JSON.stringify(config)]);
  useEffect(() => { st.current.walking = walking; }, [walking]);
  return html`<div class="avatar-preview" ref=${host} style=${{ height }}></div>`;
}

const SECTIONS = [
  ['臉', [['skin', '膚色', 'color'], ['eyes', '眼睛'], ['eyeColor', '眼睛顏色', 'color'], ['brows', '眉毛'],
    ['nose', '鼻子'], ['mouth', '嘴巴'], ['blush', '腮紅', 'bool']]],
  ['頭髮', [['hairStyle', '髮型'], ['bangs', '瀏海'], ['hair', '髮色', 'color']]],
  ['衣服', [['topStyle', '上衣'], ['top', '上衣顏色', 'color'], ['bottomStyle', '下身'], ['bottom', '下身顏色（浴衣＝腰帶顏色）', 'color'],
    ['legwear', '襪子 / 褲襪'], ['legColor', '襪子顏色', 'color']]],
  ['鞋子', [['shoeStyle', '款式'], ['shoes', '鞋子顏色', 'color']]],
  ['配件', [['hat', '帽子'], ['hatColor', '帽子顏色', 'color'], ['ears', '動物耳朵（兜帽也會用這個）'], ['tail', '尾巴'], ['glasses', '眼鏡'],
    ['scarf', '圍巾'], ['scarfColor', '圍巾顏色', 'color'], ['backpack', '背包'], ['backpackColor', '背包顏色', 'color'],
    ['camera', '相機', 'bool']]],
];

export function AvatarEditor({ initial, name: initialName, onSave, onCancel }) {
  const [cfg, setCfg] = useState(normalize(initial));
  const [name, setName] = useState(initialName || '');
  const [tab, setTab] = useState('臉');
  const [walk, setWalk] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  const random = () => {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const next = {};
    for (const [k, opts] of Object.entries(OPTIONS)) next[k] = pick(opts)[0];
    for (const [k, cols] of Object.entries(PALETTE)) next[k] = pick(cols);
    next.blush = Math.random() > 0.3;
    next.camera = Math.random() > 0.7;
    setCfg(next);
  };

  const save = async () => {
    if (!name.trim()) return toast('幫你的角色取個名字吧！');
    setSaving(true);
    try { await onSave(cfg, name.trim()); } catch (e) { errMsg(e); }
    setSaving(false);
  };

  const items = SECTIONS.find(s => s[0] === tab)[1];
  return html`
    <div class="avatar-editor">
      <div class="avatar-stage">
        <${AvatarPreview} config=${cfg} height=${280} walking=${walk} />
        <div class="preset-btns">
          <button class="chip" onClick=${() => setCfg(normalize(PRESETS.girl))}>👧 女生</button>
          <button class="chip" onClick=${() => setCfg(normalize(PRESETS.boy))}>👦 男生</button>
          <button class="chip" onClick=${() => setCfg(normalize(PRESETS.bunny))}>🐰 兔兔</button>
          <button class="chip" onClick=${() => setCfg(normalize(PRESETS.cat))}>🐱 貓貓</button>
        </div>
        <div class="stage-btns">
          <button class="chip" onClick=${random}>🎲 隨機</button>
          <button class=${'chip' + (walk ? ' on' : '')} onClick=${() => setWalk(w => !w)}>🚶 走路</button>
        </div>
      </div>
      <input class="input name-input" placeholder="角色名字" value=${name} maxlength="16"
        onInput=${e => setName(e.target.value)} />
      <div class="tabs-mini">
        ${SECTIONS.map(([t]) => html`<button class=${t === tab ? 'on' : ''} onClick=${() => setTab(t)}>${t}</button>`)}
      </div>
      <div class="editor-items">
        ${items.map(([key, label, kind]) => html`
          <div class="editor-row" key=${key}>
            <div class="editor-label">${label}</div>
            ${kind === 'color' ? html`
              <div class="swatches">
                ${PALETTE[key].map(col => html`
                  <button class=${'swatch' + (cfg[key] === col ? ' on' : '')} style=${{ background: col }}
                    onClick=${() => set(key, col)} aria-label=${col}></button>`)}
                <label class="swatch custom" title="自訂顏色">
                  <input type="color" value=${cfg[key]} onInput=${e => set(key, e.target.value)} />🎨
                </label>
              </div>`
            : kind === 'bool' ? html`
              <${Segmented} value=${cfg[key]} options=${[[true, '有'], [false, '無']]} onChange=${v => set(key, v)} />`
            : html`<div class="chips wrap tight">${OPTIONS[key].map(([v, l]) => html`
                <button class=${'chip' + (cfg[key] === v ? ' on' : '')} onClick=${() => set(key, v)}>${l}</button>`)}</div>
              ${key === 'bottomStyle' && (cfg.topStyle === 'dress' || cfg.topStyle === 'yukata') &&
                html`<div class="muted small">（洋裝、浴衣是連身款，不會顯示下身）</div>`}`}
          </div>`)}
      </div>
      <div class="row gap end sticky-actions">
        ${onCancel && html`<button class="btn ghost" onClick=${onCancel}>取消</button>`}
        <button class="btn primary" disabled=${saving} onClick=${save}>${saving ? '儲存中…' : '✨ 就決定是你了'}</button>
      </div>
    </div>`;
}
