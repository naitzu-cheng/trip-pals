// Q 版 3D 角色（盲盒公仔風）
// 身體用基本幾何體 + 旋轉曲面組成；臉是用 Canvas 畫出來的貼圖（大眼睛、腮紅、嘴巴）
// 座標：Y 朝上、腳底在 y=0、臉朝 +Z，總高約 1
import * as THREE from 'three';

export const DEFAULT_AVATAR = {
  skin: '#ffe0cc',
  hair: '#6b4433',
  hairStyle: 'short',
  bangs: 'full',
  eyes: 'sparkle',
  eyeColor: '#5b7fd6',
  brows: 'thin',
  nose: 'dot',
  mouth: 'smile',
  blush: true,
  top: '#ff9aa2',
  topStyle: 'tee',
  bottomStyle: 'pants',
  bottom: '#6c8cff',
  legwear: 'none',
  legColor: '#ffffff',
  shoeStyle: 'sneakers',
  shoes: '#ffffff',
  hat: 'none',
  hatColor: '#ffffff',
  ears: 'none',
  glasses: 'none',
  scarf: 'none',
  scarfColor: '#ff6b6b',
  backpack: 'square',
  backpackColor: '#8ce99a',
  camera: false,
};

export const OPTIONS = {
  hairStyle: [['short', '短髮'], ['bob', '鮑伯頭'], ['long', '長髮'], ['wavy', '大波浪'], ['ponytail', '馬尾'],
    ['pigtails', '雙馬尾'], ['bun', '丸子頭'], ['curly', '捲髮'], ['messy', '亂翹'], ['spiky', '刺蝟頭'], ['bald', '光頭']],
  bangs: [['full', '齊瀏海'], ['side', '旁分'], ['middle', '中分'], ['wispy', '空氣瀏海'], ['none', '無瀏海']],
  eyes: [['sparkle', '閃亮大眼'], ['round', '圓眼'], ['lashes', '長睫毛'], ['dot', '豆豆眼'], ['happy', '笑眼'],
    ['wink', '眨眼'], ['sleepy', '瞇瞇眼'], ['sharp', '銳利']],
  brows: [['thin', '細眉'], ['thick', '粗眉'], ['worried', '八字眉'], ['angry', '生氣眉'], ['none', '無']],
  nose: [['none', '無'], ['dot', '小點'], ['button', '圓鼻'], ['animal', '動物鼻']],
  mouth: [['smile', '微笑'], ['grin', '開口笑'], ['cat', '貓嘴 ω'], ['tongue', '吐舌'], ['pout', '嘟嘴'], ['o', '驚訝'], ['flat', '平嘴']],
  topStyle: [['tee', 'T 恤'], ['tank', '背心'], ['shirt', '襯衫'], ['hoodie', '帽T'], ['sweater', '針織毛衣'],
    ['jacket', '外套'], ['coat', '鋪棉大衣'], ['dress', '洋裝'], ['yukata', '浴衣']],
  bottomStyle: [['pants', '長褲'], ['shorts', '短褲'], ['skirt', '短裙'], ['longskirt', '長裙'], ['ninja', '燈籠褲']],
  legwear: [['none', '無'], ['socks', '短襪'], ['knee', '及膝襪'], ['tights', '褲襪']],
  shoeStyle: [['sneakers', '球鞋'], ['boots', '靴子'], ['furboots', '毛靴'], ['sandals', '涼鞋']],
  hat: [['none', '無'], ['fluffy', '毛毛帽'], ['hood', '動物兜帽'], ['beanie', '毛線帽'], ['cap', '棒球帽'],
    ['straw', '草帽'], ['beret', '貝雷帽']],
  ears: [['none', '無'], ['cat', '貓耳'], ['bear', '熊耳'], ['bunny', '兔耳'], ['fox', '狐狸耳'], ['sheep', '羊角']],
  glasses: [['none', '無'], ['round', '圓框'], ['sun', '墨鏡']],
  scarf: [['none', '無'], ['scarf', '圍巾'], ['mask', '忍者蒙面巾']],
  backpack: [['none', '無'], ['square', '方形背包'], ['bunny', '兔兔背包']],
};

export const PALETTE = {
  skin: ['#fff0e6', '#ffe0cc', '#f8cfae', '#e8b48a', '#c98d62', '#8d5b3e', '#ffffff', '#d3f9d8', '#d0ebff'],
  hair: ['#2b2b2b', '#6b4433', '#a0522d', '#e8b04a', '#f6e7b4', '#ffc2d1', '#b197fc', '#a5d8ff', '#f8f9fa', '#ff8787'],
  eyeColor: ['#5b7fd6', '#3b2a20', '#2b2b2b', '#3bc9db', '#51cf66', '#9775fa', '#f76707', '#f06595', '#adb5bd'],
  top: ['#ff9aa2', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc', '#fcc2d7', '#ffffff', '#495057', '#ffa94d', '#1c3d6e', '#a5d8ff', '#b2f2bb'],
  bottom: ['#6c8cff', '#343a40', '#868e96', '#f1f3f5', '#c9a227', '#2b8a3e', '#c2255c', '#a5d8ff', '#8d6e63', '#212529'],
  legColor: ['#ffffff', '#212529', '#ffc9c9', '#a5d8ff', '#e9ecef', '#d0bfff'],
  shoes: ['#ffffff', '#343a40', '#ff8787', '#ffe066', '#74c0fc', '#8d6e63', '#96f2d7'],
  hatColor: ['#ffffff', '#ffe066', '#ff8787', '#74c0fc', '#343a40', '#e8c07d', '#b197fc', '#96f2d7', '#fcc2d7'],
  scarfColor: ['#ff6b6b', '#4dabf7', '#ffffff', '#343a40', '#ffd43b', '#69db7c'],
  backpackColor: ['#8ce99a', '#ffa94d', '#74c0fc', '#f783ac', '#343a40', '#ffe066', '#ffffff'],
};

/* ---------------- 材質 ---------------- */
const vinyl = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0, ...o });
const skinMat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.55, emissive: color, emissiveIntensity: 0.12 });
const fabric = color => new THREE.MeshStandardMaterial({ color, roughness: 0.9, emissive: color, emissiveIntensity: 0.05 });
const fur = color => new THREE.MeshStandardMaterial({ color, roughness: 1, emissive: color, emissiveIntensity: 0.12 });
const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });

function mesh(geo, material, [x = 0, y = 0, z = 0] = [], [sx = 1, sy = 1, sz = 1] = [], [rx = 0, ry = 0, rz = 0] = []) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  return m;
}

const sphere = (r, w = 32, h = 20) => new THREE.SphereGeometry(r, w, h);
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 16);
const cyl = (rt, rb, h, seg = 28) => new THREE.CylinderGeometry(rt, rb, h, seg);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, arc = Math.PI * 2, seg = 32) => new THREE.TorusGeometry(r, t, 16, Math.max(seg, 48), arc);
const lathe = (pts, seg = 36) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

// 平滑旋轉曲面（給身體、裙子用）：輸入少數控制點，自動內插成圓滑曲線
function smoothLathe(pts, seg = 36) {
  const curve = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.LatheGeometry(curve.getPoints(24), seg);
}

// 水滴形（一撮頭髮）：尖端朝 -Y
function teardrop(r, len, seg = 16) {
  const pts = [[0.0001, -len]];
  for (let i = 0; i <= 10; i++) {
    const a = -0.65 + (i / 10) * (Math.PI / 2 + 0.65);
    pts.push([Math.max(0.0001, r * Math.cos(a)), r * Math.sin(a)]);
  }
  return lathe(pts, seg);
}

// 毛茸茸：沿法線推出平滑的小凸起（像棉花、毛球）
function fluffy(geo, amp = 0.014, freq = 55) {
  geo = mergeVerts(geo.index ? geo.toNonIndexed() : geo);
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = Math.sin(x * freq + 1.3) * Math.sin(y * freq * 1.13 + 2.1) * Math.sin(z * freq * 0.91 + 0.7) +
      0.5 * Math.sin((x + y) * freq * 2.1) * Math.sin((y - z) * freq * 1.7);
    const d = amp * (0.55 + 0.45 * k);
    p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
  }
  geo.computeVertexNormals();
  return geo;
}
function mergeVerts(geo) {
  // 簡易合併重複頂點，讓推出去時表面不會裂開
  const p = geo.attributes.position, map = new Map(), pos = [], idx = [];
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    let j = map.get(key);
    if (j === undefined) { j = pos.length / 3; map.set(key, j); pos.push(p.getX(i), p.getY(i), p.getZ(i)); }
    idx.push(j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function shade(hex, amt) {
  const col = new THREE.Color(hex);
  const hsl = {};
  col.getHSL(hsl);
  col.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return '#' + col.getHexString();
}
const rgba = (hex, a) => {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
};

const SLEEVES = { tee: 'short', tank: 'none', shirt: 'long', hoodie: 'long', sweater: 'long', jacket: 'long', coat: 'puffy', dress: 'short', yukata: 'wide' };

// 舊版設定相容
export function normalize(cfg) {
  const c = { ...DEFAULT_AVATAR, ...(cfg || {}) };
  if (c.backpack === true) c.backpack = 'square';
  if (c.backpack === false) c.backpack = 'none';
  return c;
}

/* ---------------- 主程式 ---------------- */
export function buildAvatar(cfg = {}) {
  const c = normalize(cfg);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skin = skinMat(c.skin), top = fabric(c.top), bottom = fabric(c.bottom);
  const onePiece = c.topStyle === 'dress' || c.topStyle === 'yukata';

  // 影子
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.27, 32),
    basic(0x000000, { transparent: true, opacity: 0.2, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.003;
  root.add(shadow);

  // 腿：短短胖胖
  const legMat = c.legwear === 'tights' ? fabric(c.legColor) : skin;
  const legs = [-1, 1].map(side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.08, 0.235, 0);
    pivot.add(mesh(smoothLathe([[0.0001, -0.2], [0.05, -0.19], [0.056, -0.1], [0.062, -0.02], [0.0001, 0.02]], 20), legMat));
    if (c.legwear === 'socks') pivot.add(mesh(cyl(0.054, 0.052, 0.04), fabric(c.legColor), [0, -0.165, 0]));
    if (c.legwear === 'knee') pivot.add(mesh(cyl(0.06, 0.053, 0.12), fabric(c.legColor), [0, -0.13, 0]));
    if (!onePiece && c.bottomStyle === 'pants') pivot.add(mesh(smoothLathe([[0.0001, -0.19], [0.062, -0.185], [0.066, -0.1], [0.07, 0], [0.0001, 0.04]], 20), bottom));
    if (!onePiece && c.bottomStyle === 'shorts') pivot.add(mesh(cyl(0.067, 0.072, 0.08), bottom, [0, -0.03, 0]));
    if (!onePiece && c.bottomStyle === 'ninja') {
      pivot.add(mesh(sphere(0.08), bottom, [0, -0.09, 0], [1, 1.3, 1]));
      pivot.add(mesh(cyl(0.05, 0.052, 0.035), fabric(shade(c.bottom, -0.15)), [0, -0.175, 0]));
    }
    addShoe(pivot, c);
    body.add(pivot);
    return pivot;
  });

  // 下身
  if (c.topStyle === 'dress') {
    body.add(mesh(smoothLathe([[0.0001, 0.17], [0.25, 0.17], [0.24, 0.21], [0.17, 0.34], [0.13, 0.48], [0.0001, 0.5]]), top));
  } else if (c.topStyle === 'yukata') {
    body.add(mesh(smoothLathe([[0.0001, 0.05], [0.19, 0.05], [0.19, 0.12], [0.17, 0.3], [0.0001, 0.33]]), top));
  } else if (c.topStyle === 'coat') {
    // 大衣蓋住下身
  } else if (c.bottomStyle === 'skirt') {
    body.add(mesh(smoothLathe([[0.0001, 0.19], [0.23, 0.19], [0.22, 0.22], [0.16, 0.31], [0.0001, 0.32]]), bottom));
  } else if (c.bottomStyle === 'longskirt') {
    body.add(mesh(smoothLathe([[0.0001, 0.07], [0.25, 0.07], [0.24, 0.11], [0.16, 0.31], [0.0001, 0.32]]), bottom));
  } else {
    body.add(mesh(sphere(0.165), bottom, [0, 0.265, 0], [1, 0.55, 0.88]));
  }

  // 上身：圓滾滾的身體
  if (c.topStyle !== 'dress') {
    body.add(mesh(smoothLathe([[0.0001, 0.215], [0.15, 0.225], [0.168, 0.29], [0.162, 0.38], [0.13, 0.46], [0.07, 0.52], [0.0001, 0.53]]), top, [0, 0, 0], [1, 1, 0.88]));
  }
  addTopDetails(body, c);

  // 手臂
  const sleeve = SLEEVES[c.topStyle] || 'short';
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.17, 0.46, 0);
    pivot.rotation.z = side * 0.32;
    pivot.add(mesh(capsule(0.042, 0.1), skin, [0, -0.08, 0]));
    if (sleeve === 'short') pivot.add(mesh(capsule(0.052, 0.035), top, [0, -0.025, 0]));
    if (sleeve === 'long') pivot.add(mesh(capsule(0.05, 0.1), top, [0, -0.075, 0]));
    if (sleeve === 'wide') pivot.add(mesh(box(0.1, 0.17, 0.13), top, [0, -0.085, 0]));
    if (sleeve === 'puffy') {
      pivot.add(mesh(capsule(0.068, 0.09), top, [0, -0.07, 0]));
      pivot.add(mesh(fluffy(torus(0.05, 0.022, Math.PI * 2, 24)), fur('#ffffff'), [0, -0.145, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
    }
    pivot.add(mesh(sphere(0.05), skin, [0, -0.175, 0], [1, 0.95, 0.9]));
    body.add(pivot);
    return pivot;
  });

  // 頭
  const head = new THREE.Group();
  head.position.y = 0.74;
  body.add(head);
  head.add(mesh(sphere(0.27, 48, 32), skin, [0, 0, 0], [1.07, 0.96, 0.97]));
  for (const side of [-1, 1]) head.add(mesh(sphere(0.045), skin, [side * 0.285, -0.02, -0.01], [0.5, 1, 0.8]));

  const face = addFace(head, c);
  if (c.nose === 'animal') head.add(mesh(sphere(0.025), vinyl('#3a2a2a', { roughness: 0.25 }), [0, -0.045, 0.255], [1.35, 0.85, 0.7]));
  addHair(head, c);
  addEars(head, c);
  addHat(head, c);
  addGlasses(head, c);
  addAccessories(body, head, c);

  // 動畫
  let blinkAt = 2;
  root.userData.update = (t, walking) => {
    if (walking) {
      const s = Math.sin(t * 11);
      legs[0].rotation.x = s * 0.7;
      legs[1].rotation.x = -s * 0.7;
      arms[0].rotation.x = -s * 0.8;
      arms[1].rotation.x = s * 0.8;
      body.position.y = Math.abs(Math.cos(t * 11)) * 0.04;
      head.rotation.z = s * 0.04;
    } else {
      legs.forEach(l => (l.rotation.x *= 0.8));
      arms.forEach((a, i) => (a.rotation.x = Math.sin(t * 1.6 + i) * 0.06));
      body.position.y = 0;
      head.rotation.z = Math.sin(t * 1.2) * 0.03;
      body.scale.y = 1 + Math.sin(t * 2.2) * 0.008;
    }
    const k = t - blinkAt;
    face.blink(k > 0 && k < 0.13);
    if (k > 0.13) blinkAt = t + 2 + Math.random() * 3;
  };
  root.userData.config = c;
  return root;
}

/* ---------------- 臉（Canvas 貼圖） ---------------- */
// 貼圖蓋在頭的正面：水平 140°、垂直 70°，1 度 ≈ 7.3 像素
const FW = 1024, FH = 512, PHI = (140 * Math.PI) / 180, THETA = (70 * Math.PI) / 180;
const PX = FW / 140;
const fx = deg => FW / 2 + deg * PX;
const fy = deg => FH / 2 - deg * PX;

function addFace(head, c) {
  const open = faceTexture(c, false);
  const shut = faceTexture(c, true);
  const material = new THREE.MeshStandardMaterial({
    map: open, transparent: true, depthWrite: false, roughness: 0.35,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  material.userData.maps = [open, shut];
  const geo = new THREE.SphereGeometry(0.2715, 64, 32, Math.PI / 2 - PHI / 2, PHI, Math.PI / 2 - THETA / 2, THETA);
  const m = mesh(geo, material, [0, 0, 0], [1.07, 0.96, 0.97]);
  m.renderOrder = 2;
  head.add(m);
  let state = false;
  return {
    blink(on) {
      if (on === state) return;
      state = on;
      material.map = on ? shut : open;
      material.needsUpdate = true;
    },
  };
}

function canvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
}

function faceTexture(c, blink) {
  const cv = canvas(FW, FH);
  const g = cv.getContext('2d');
  g.lineCap = 'round';
  g.lineJoin = 'round';

  // 腮紅
  if (c.blush) {
    for (const side of [-1, 1]) {
      const x = fx(side * 35), y = fy(-14);
      const grd = g.createRadialGradient(x, y, 0, x, y, 70);
      grd.addColorStop(0, 'rgba(255,120,140,0.55)');
      grd.addColorStop(1, 'rgba(255,120,140,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(x, y, 80, 50, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  // 眼睛
  for (const side of [-1, 1]) {
    let kind = c.eyes;
    if (kind === 'wink') kind = side > 0 ? 'happy' : 'sparkle';
    if (blink && !['happy', 'sleepy'].includes(kind)) kind = 'closed';
    drawEye(g, fx(side * 22.5), fy(-5), side, kind, c.eyeColor);
  }

  // 眉毛
  if (c.brows !== 'none') {
    g.strokeStyle = shade(c.hair, -0.12);
    g.lineWidth = c.brows === 'thick' ? 15 : 8;
    for (const side of [-1, 1]) {
      const x = fx(side * 22.5), y = fy(16.5);
      const tilt = c.brows === 'worried' ? -14 : c.brows === 'angry' ? 14 : 0;
      g.beginPath();
      g.moveTo(x - side * 34, y + tilt * side * side);
      g.quadraticCurveTo(x, y - 10, x + side * 34, y - tilt + 4);
      g.stroke();
    }
  }

  // 鼻子
  if (c.nose === 'dot') {
    g.fillStyle = rgba(shade(c.skin, -0.3), 0.7);
    g.beginPath(); g.ellipse(fx(0), fy(-10), 6, 4, 0, 0, Math.PI * 2); g.fill();
  } else if (c.nose === 'button') {
    const grd = g.createRadialGradient(fx(0), fy(-10), 0, fx(0), fy(-10), 18);
    grd.addColorStop(0, rgba(shade(c.skin, -0.18), 0.9));
    grd.addColorStop(1, rgba(shade(c.skin, -0.18), 0));
    g.fillStyle = grd;
    g.beginPath(); g.arc(fx(0), fy(-10), 18, 0, Math.PI * 2); g.fill();
  }

  // 嘴巴
  drawMouth(g, fx(0), fy(-21), c.mouth);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawEye(g, x, y, side, kind, color) {
  const W = 74, H = 88; // 半寬、半高
  const lash = '#2a1f1d';
  g.strokeStyle = lash;
  if (kind === 'happy' || kind === 'closed') {
    g.lineWidth = 11;
    g.beginPath();
    if (kind === 'happy') g.arc(x, y + 22, 40, Math.PI * 1.12, Math.PI * 1.88);
    else g.arc(x, y - 18, 44, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
    if (kind === 'closed') { // 閉眼的睫毛
      g.lineWidth = 6;
      g.beginPath(); g.moveTo(x + side * 40, y + 6); g.lineTo(x + side * 54, y - 2); g.stroke();
    }
    return;
  }
  if (kind === 'sleepy') {
    g.fillStyle = color;
    g.beginPath(); g.ellipse(x, y + 18, W * 0.75, H * 0.32, 0, 0, Math.PI); g.fill();
    g.lineWidth = 11;
    g.beginPath(); g.moveTo(x - W * 0.85, y + 14); g.quadraticCurveTo(x, y + 4, x + W * 0.85, y + 14); g.stroke();
    return;
  }
  if (kind === 'dot') {
    g.fillStyle = lash;
    g.beginPath(); g.ellipse(x, y, 20, 26, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(x - 6, y - 9, 7, 0, Math.PI * 2); g.fill();
    return;
  }

  const sharp = kind === 'sharp';
  const w = sharp ? W * 1.05 : W, h = sharp ? H * 0.72 : H;
  const cy = sharp ? y + 8 : y;

  // 眼白（圓眼才明顯）
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(x, cy, w, h, 0, 0, Math.PI * 2); g.fill();

  // 虹膜：上深下淺的漸層
  const ir = kind === 'round' ? 0.68 : 0.9;
  const iw = w * ir, ih = h * (kind === 'round' ? 0.72 : 0.94);
  const icy = cy + h * 0.04;
  g.save();
  g.beginPath(); g.ellipse(x, cy, w, h, 0, 0, Math.PI * 2); g.clip();
  const grd = g.createLinearGradient(0, icy - ih, 0, icy + ih);
  grd.addColorStop(0, shade(color, -0.32));
  grd.addColorStop(0.45, color);
  grd.addColorStop(1, shade(color, 0.28));
  g.fillStyle = grd;
  g.beginPath(); g.ellipse(x, icy, iw, ih, 0, 0, Math.PI * 2); g.fill();
  // 虹膜外圈
  g.strokeStyle = rgba(shade(color, -0.4), 0.8);
  g.lineWidth = 5;
  g.stroke();
  // 瞳孔
  g.fillStyle = rgba(shade(color, -0.55), 0.95);
  g.beginPath(); g.ellipse(x, icy + ih * 0.08, iw * 0.42, ih * 0.48, 0, 0, Math.PI * 2); g.fill();
  // 下方的光暈
  const glow = g.createRadialGradient(x, icy + ih * 0.6, 0, x, icy + ih * 0.6, iw * 0.9);
  glow.addColorStop(0, rgba(shade(color, 0.45), 0.85));
  glow.addColorStop(1, rgba(shade(color, 0.45), 0));
  g.fillStyle = glow;
  g.beginPath(); g.ellipse(x, icy + ih * 0.55, iw * 0.8, ih * 0.4, 0, 0, Math.PI * 2); g.fill();
  // 上眼瞼陰影
  const lid = g.createLinearGradient(0, cy - h, 0, cy - h * 0.2);
  lid.addColorStop(0, 'rgba(40,20,30,0.45)');
  lid.addColorStop(1, 'rgba(40,20,30,0)');
  g.fillStyle = lid;
  g.fillRect(x - w, cy - h, w * 2, h);
  g.restore();

  // 反光
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(x - side * 4 - w * 0.25, cy - h * 0.32, w * 0.24, h * 0.2, -0.4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(x + w * 0.3, cy + h * 0.32, w * 0.1, 0, Math.PI * 2); g.fill();
  if (kind !== 'round') {
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (const [dx, dy, r] of [[0.32, -0.42, 0.06], [-0.35, 0.3, 0.05], [0.05, 0.55, 0.04]]) {
      g.beginPath(); g.arc(x + w * dx, cy + h * dy, w * r, 0, Math.PI * 2); g.fill();
    }
  }

  // 上睫毛線（外眼角往上翹）
  g.strokeStyle = lash;
  g.lineWidth = sharp ? 13 : 11;
  g.beginPath();
  g.ellipse(x, cy, w + 3, h + 3, 0, Math.PI * 1.08, Math.PI * 1.92);
  g.stroke();
  g.lineWidth = 9;
  g.beginPath();
  const ox = x + side * (w + 2), oy = cy - h * 0.35;
  g.moveTo(ox - side * 8, oy - 4);
  g.quadraticCurveTo(ox + side * 10, oy - 10, ox + side * 20, oy - 22);
  g.stroke();
  if (kind === 'lashes') {
    g.lineWidth = 6;
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * (1.62 + i * 0.1) ;
      const ax = x + Math.cos(a) * (w + 2) * side, ay = cy + Math.sin(a) * (h + 2);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + side * (10 + i * 4), ay - 16 + i * 4); g.stroke();
    }
  }
  // 下睫毛（淡）
  g.strokeStyle = 'rgba(80,50,50,0.35)';
  g.lineWidth = 4;
  g.beginPath(); g.ellipse(x, cy, w * 0.8, h + 2, 0, Math.PI * 0.3, Math.PI * 0.7); g.stroke();
}

function drawMouth(g, x, y, kind) {
  const red = '#b04a5a';
  g.strokeStyle = red;
  g.lineWidth = 7;
  if (kind === 'grin') {
    g.fillStyle = '#8a2c3c';
    g.beginPath(); g.moveTo(x - 30, y - 8); g.quadraticCurveTo(x, y - 2, x + 30, y - 8); g.quadraticCurveTo(x + 22, y + 34, x, y + 34);
    g.quadraticCurveTo(x - 22, y + 34, x - 30, y - 8); g.fill();
    g.fillStyle = '#ff8fa3';
    g.beginPath(); g.ellipse(x, y + 24, 16, 9, 0, 0, Math.PI * 2); g.fill();
  } else if (kind === 'cat') {
    g.beginPath(); g.arc(x - 13, y, 13, 0, Math.PI); g.stroke();
    g.beginPath(); g.arc(x + 13, y, 13, 0, Math.PI); g.stroke();
  } else if (kind === 'o') {
    g.fillStyle = '#8a2c3c';
    g.beginPath(); g.ellipse(x, y + 6, 11, 14, 0, 0, Math.PI * 2); g.fill();
  } else if (kind === 'flat') {
    g.beginPath(); g.moveTo(x - 18, y + 4); g.lineTo(x + 18, y + 4); g.stroke();
  } else if (kind === 'pout') {
    g.fillStyle = '#e8798a';
    g.beginPath(); g.ellipse(x, y + 4, 10, 7, 0, 0, Math.PI * 2); g.fill();
  } else {
    g.beginPath(); g.arc(x, y - 12, 22, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
    if (kind === 'tongue') {
      g.fillStyle = '#ff8fa3';
      g.beginPath(); g.ellipse(x + 6, y + 12, 10, 12, 0, 0, Math.PI * 2); g.fill();
    }
  }
}

/* ---------------- 身體細節 ---------------- */
function addShoe(pivot, c) {
  const shoe = vinyl(c.shoes);
  if (c.shoeStyle === 'boots' || c.shoeStyle === 'furboots') {
    pivot.add(mesh(cyl(0.066, 0.064, 0.1), shoe, [0, -0.165, 0]));
    pivot.add(mesh(sphere(0.076), shoe, [0, -0.2, 0.025], [1, 0.62, 1.35]));
    pivot.add(mesh(sphere(0.079), vinyl(shade(c.shoes, -0.25)), [0, -0.222, 0.025], [1.02, 0.22, 1.38]));
    if (c.shoeStyle === 'furboots') {
      pivot.add(mesh(fluffy(torus(0.068, 0.03, Math.PI * 2, 28)), fur('#fffaf0'), [0, -0.115, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
    }
  } else if (c.shoeStyle === 'sandals') {
    pivot.add(mesh(sphere(0.058), skinMat(c.skin), [0, -0.205, 0.025], [1, 0.6, 1.4]));
    pivot.add(mesh(box(0.11, 0.025, 0.17), shoe, [0, -0.235, 0.025]));
    pivot.add(mesh(torus(0.05, 0.01, Math.PI), shoe, [0, -0.215, 0.05], [1, 1, 1], [0, Math.PI / 2, 0]));
  } else {
    pivot.add(mesh(sphere(0.074), shoe, [0, -0.2, 0.025], [1, 0.6, 1.35]));
    pivot.add(mesh(sphere(0.077), vinyl('#f1f3f5'), [0, -0.218, 0.025], [1.02, 0.25, 1.38]));
  }
}

function addTopDetails(body, c) {
  const s = c.topStyle;
  const darker = fabric(shade(c.top, -0.1));
  const lighter = fabric(shade(c.top, 0.22));
  if (s === 'hoodie') {
    body.add(mesh(torus(0.11, 0.045), fabric(c.top), [0, 0.5, -0.06], [1, 0.7, 1]));
    body.add(mesh(box(0.16, 0.06, 0.02), darker, [0, 0.33, 0.14]));
  } else if (s === 'shirt') {
    for (const side of [-1, 1]) body.add(mesh(box(0.08, 0.025, 0.05), lighter, [side * 0.045, 0.51, 0.09], [1, 1, 1], [0.4, 0, side * -0.5]));
    for (let i = 0; i < 3; i++) body.add(mesh(sphere(0.011, 10, 8), vinyl('#ffffff'), [0, 0.45 - i * 0.06, 0.14]));
  } else if (s === 'sweater') {
    body.add(mesh(torus(0.155, 0.022), darker, [0, 0.27, 0], [1, 0.88, 1], [Math.PI / 2, 0, 0]));
    body.add(mesh(fluffy(torus(0.075, 0.035, Math.PI * 2, 28)), fur('#ffffff'), [0, 0.515, 0.0], [1, 1, 1], [Math.PI / 2, 0, 0]));
    for (let i = 0; i < 3; i++) body.add(mesh(sphere(0.022, 16, 12), vinyl('#ffffff'), [0, 0.44 - i * 0.065, 0.142], [1, 1, 0.6]));
  } else if (s === 'jacket') {
    body.add(mesh(box(0.07, 0.25, 0.02), fabric('#f8f9fa'), [0, 0.38, 0.135]));
    for (const side of [-1, 1]) {
      body.add(mesh(box(0.035, 0.12, 0.02), darker, [side * 0.05, 0.46, 0.138], [1, 1, 1], [0, 0, side * 0.35]));
      body.add(mesh(box(0.05, 0.04, 0.02), darker, [side * 0.09, 0.31, 0.13]));
    }
  } else if (s === 'coat') {
    // 鋪棉大衣：下擺外擴、毛毛領、大口袋
    body.add(mesh(smoothLathe([[0.0001, 0.12], [0.22, 0.12], [0.235, 0.15], [0.2, 0.26], [0.17, 0.36], [0.0001, 0.37]]), fabric(c.top)));
    body.add(mesh(fluffy(torus(0.21, 0.03, Math.PI * 2, 40)), fur('#ffffff'), [0, 0.135, 0], [1.05, 1, 1], [Math.PI / 2, 0, 0]));
    body.add(mesh(fluffy(torus(0.085, 0.045, Math.PI * 2, 30)), fur('#ffffff'), [0, 0.51, 0.01], [1.1, 1, 1], [Math.PI / 2, 0, 0]));
    for (const side of [-1, 1]) body.add(mesh(box(0.08, 0.06, 0.02), darker, [side * 0.09, 0.25, 0.17], [1, 1, 1], [-0.25, side * 0.3, 0]));
    for (let i = 0; i < 2; i++) body.add(mesh(sphere(0.02, 16, 12), vinyl(shade(c.top, -0.25)), [0.03, 0.42 - i * 0.08, 0.145], [1, 1, 0.6]));
  } else if (s === 'yukata') {
    body.add(mesh(cyl(0.176, 0.176, 0.075), fabric(c.bottom), [0, 0.32, 0], [1, 1, 0.9]));
    for (const side of [-1, 1]) body.add(mesh(box(0.025, 0.15, 0.015), fabric('#ffffff'), [side * 0.035, 0.45, 0.13], [1, 1, 1], [0, 0, side * 0.45]));
  } else if (s === 'tank') {
    for (const side of [-1, 1]) body.add(mesh(box(0.04, 0.05, 0.12), fabric(c.top), [side * 0.1, 0.51, 0]));
  } else if (s === 'dress') {
    body.add(mesh(torus(0.07, 0.02), lighter, [0, 0.5, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
  }
}

function addHair(head, c) {
  const s = c.hairStyle;
  if (s === 'bald') return;
  const hair = vinyl(c.hair, { roughness: 0.38 });
  if (s === 'curly' && c.hat !== 'hood') {
    for (let ti = 0; ti < 5; ti++) {
      const theta = 0.12 * Math.PI + ti * 0.12 * Math.PI;
      const n = Math.round(4 + Math.sin(theta) * 9);
      for (let pi = 0; pi < n; pi++) {
        const phi = (pi / n) * Math.PI * 2 + ti * 0.4;
        const x = Math.sin(theta) * Math.cos(phi), y = Math.cos(theta), z = Math.sin(theta) * Math.sin(phi);
        if (z > 0.35 && y < 0.55) continue;
        head.add(mesh(sphere(0.088, 16, 12), hair, [x * 0.295, y * 0.28 + 0.02, z * 0.28 - 0.02]));
      }
    }
    head.add(mesh(sphere(0.28), hair, [0, -0.02, -0.07], [1.1, 0.95, 0.92]));
  } else if (c.hat !== 'hood') {
    // 戴帽子時省略頭頂那層，避免從帽子穿出來
    if (!['fluffy', 'beanie'].includes(c.hat)) {
      head.add(mesh(new THREE.SphereGeometry(0.297, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, [0, 0.025, -0.01], [1.08, 1.02, 1.02], [-0.28, 0, 0]));
    }
    head.add(mesh(sphere(0.293, 48, 28), hair, [0, 0.0, -0.065], [1.06, 0.97, 0.94]));
  }
  if ((s === 'messy' || s === 'spiky') && c.hat === 'none') {
    const n = s === 'spiky' ? 8 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const len = s === 'spiky' ? 0.17 : 0.12;
      head.add(mesh(teardrop(0.05, len), hair, [Math.cos(a) * 0.17, 0.25, Math.sin(a) * 0.15 - 0.05], [1, 1, 0.8],
        [Math.PI - Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9]));
    }
  }
  addBangs(head, c, hair);

  if (s === 'long' || s === 'wavy') {
    head.add(mesh(capsule(0.21, 0.22), hair, [0, -0.25, -0.12], [1.28, 1, 0.6]));
    for (const side of [-1, 1]) {
      if (s === 'wavy') {
        // 波浪側髮：一串交錯的水滴，尾端捲起
        for (let i = 0; i < 4; i++) {
          head.add(mesh(sphere(0.062 - i * 0.004, 20, 14), hair, [side * (0.25 + (i % 2) * 0.03), -0.08 - i * 0.075, 0.0 - i * 0.012]));
        }
        head.add(mesh(torus(0.03, 0.016, Math.PI * 1.5), hair, [side * 0.27, -0.39, -0.02], [1, 1, 1], [0, Math.PI / 2, side * 1.2]));
      } else {
        head.add(mesh(capsule(0.06, 0.2), hair, [side * 0.245, -0.16, -0.01]));
      }
    }
  } else if (s === 'bob') {
    head.add(mesh(sphere(0.295), hair, [0, -0.06, -0.04], [1.14, 0.74, 0.86]));
  } else if (s === 'ponytail') {
    head.add(mesh(sphere(0.045), vinyl(shade(c.hair, 0.2)), [0, 0.14, -0.28]));
    head.add(mesh(teardrop(0.075, 0.3), hair, [0, 0.08, -0.33], [1, 1, 0.85], [0.35, 0, 0]));
  } else if (s === 'bun') {
    head.add(mesh(sphere(0.11), hair, [0, 0.32, -0.06]));
  } else if (s === 'pigtails') {
    for (const side of [-1, 1]) {
      head.add(mesh(sphere(0.035), vinyl('#ff8fab'), [side * 0.27, 0.06, -0.07]));
      head.add(mesh(teardrop(0.075, 0.24), hair, [side * 0.31, 0.02, -0.08], [1, 1, 0.9], [0, 0, side * 0.35]));
    }
  }
}

function addBangs(head, c, hair) {
  const b = c.bangs;
  const dy = ['hood', 'fluffy', 'beanie'].includes(c.hat) ? -0.055 : 0; // 戴帽子時瀏海露在帽緣下
  // 瀏海：一撮一撮尖尖的水滴，沿著額頭排列
  const strand = (angleDeg, y, len, r, tiltZ = 0, tiltX = -0.25) => {
    const a = (angleDeg * Math.PI) / 180;
    const x = Math.sin(a) * 0.29 * 1.07, z = Math.cos(a) * 0.26 + 0.005;
    head.add(mesh(teardrop(r, len), hair, [x, y + dy, z + (dy ? 0.012 : 0)], [1, 1, 0.42], [tiltX, a * 0.9, tiltZ]));
  };
  if (b === 'full') {
    [-54, -40, -27, -14, -1, 12, 25, 38, 51].forEach((a, i) => strand(a, 0.19 - Math.abs(a) * 0.0006, 0.095 + (i % 2) * 0.03, 0.066, -a * 0.005));
  } else if (b === 'wispy') {
    [-44, -30, -14, 0, 14, 30, 44].forEach((a, i) => strand(a, 0.185, 0.085 + (i % 3) * 0.025, 0.036, -a * 0.006));
  } else if (b === 'side') {
    [-54, -40, -26, -12, 2, 16].forEach((a, i) => strand(a, 0.215 - i * 0.004, 0.1 + i * 0.012, 0.062, 0.6));
    strand(36, 0.17, 0.14, 0.055, -0.1);
    strand(50, 0.15, 0.15, 0.05, -0.15);
  } else if (b === 'middle') {
    for (const side of [-1, 1]) {
      [8, 22, 36, 50].forEach((a, i) => strand(side * a, 0.215 - i * 0.012, 0.1 + i * 0.025, 0.06, side * (0.7 - i * 0.15)));
    }
  }
}

function addEars(head, c) {
  if (c.ears === 'none' || c.hat === 'hood') return;
  addAnimalEars(head, c.ears, c.ears === 'fox' ? vinyl('#ff922b') : vinyl(c.hair, { roughness: 0.38 }), 1);
}

function addAnimalEars(head, kind, color, scale, onHood = false) {
  const inner = vinyl('#ffc9d6');
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(side * (onHood ? 0.2 : 0.17), onHood ? 0.31 : 0.23, onHood ? -0.07 : -0.02);
    g.rotation.z = -side * 0.35;
    g.scale.setScalar(scale);
    if (kind === 'bear') {
      g.add(mesh(sphere(0.078), color, [0, 0, 0], [1, 1, 0.6]));
      g.add(mesh(sphere(0.046), inner, [0, 0, 0.03], [1, 1, 0.4]));
    } else if (kind === 'bunny') {
      g.add(mesh(capsule(0.052, 0.2), color, [0, 0.13, 0], [1, 1, 0.5]));
      g.add(mesh(capsule(0.028, 0.16), inner, [0, 0.13, 0.024], [1, 1, 0.3]));
    } else if (kind === 'sheep') {
      g.position.set(side * (onHood ? 0.31 : 0.24), onHood ? 0.13 : 0.1, onHood ? -0.02 : 0);
      g.add(mesh(torus(0.05, 0.026, Math.PI * 1.6), vinyl('#f1e3c8'), [0, 0, 0], [1, 1, 1], [0, Math.PI / 2, side * 0.6]));
    } else {
      const big = kind === 'fox' ? 1.25 : 1;
      g.add(mesh(new THREE.ConeGeometry(0.07 * big, 0.14 * big, 12), color, [0, 0.05, 0], [1, 1, 0.5]));
      g.add(mesh(new THREE.ConeGeometry(0.04 * big, 0.09 * big, 12), inner, [0, 0.04, 0.02], [1, 1, 0.3]));
    }
    head.add(g);
  }
}

function addHat(head, c) {
  if (c.hat === 'none') return;
  const m = fabric(c.hatColor);
  if (c.hat === 'fluffy') {
    // 毛毛帽：大大的毛帽 + 兩側毛球
    const furry = fur(c.hatColor);
    head.add(mesh(fluffy(new THREE.SphereGeometry(0.33, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.55)), furry, [0, 0.03, -0.01], [1.07, 1.05, 1.02], [-0.22, 0, 0]));
    head.add(mesh(fluffy(torus(0.3, 0.05, Math.PI * 2, 48)), furry, [0, 0.04, 0.02], [1.08, 1, 1], [Math.PI / 2 - 0.22, 0, 0]));
    for (const side of [-1, 1]) {
      head.add(mesh(cyl(0.008, 0.008, 0.14, 6), fabric(shade(c.hatColor, -0.2)), [side * 0.31, -0.08, 0.02]));
      head.add(mesh(fluffy(new THREE.IcosahedronGeometry(0.075, 5)), furry, [side * 0.32, -0.18, 0.03]));
    }
    head.add(mesh(fluffy(new THREE.IcosahedronGeometry(0.06, 5)), furry, [0, 0.36, -0.08]));
  } else if (c.hat === 'hood') {
    // 動物兜帽：包住頭、帽緣毛邊，耳朵用「動物耳朵」的選擇（沒選就用兔耳）
    head.add(mesh(new THREE.SphereGeometry(0.34, 48, 28, 0, Math.PI * 2, 0, Math.PI * 0.62), m, [0, 0.02, -0.04], [1.08, 1.04, 1.04], [-0.42, 0, 0]));
    head.add(mesh(fluffy(torus(0.27, 0.04, Math.PI * 2, 48)), fur(shade(c.hatColor, 0.08)), [0, 0.02, 0.1], [1.12, 1.08, 1], [-0.42 + Math.PI * 0.12, 0, 0]));
    addAnimalEars(head, c.ears === 'none' ? 'bunny' : c.ears, fabric(c.hatColor), 1.2, true);
  } else if (c.hat === 'cap') {
    head.add(mesh(new THREE.SphereGeometry(0.305, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), m, [0, 0.06, 0], [1.07, 0.86, 1.03]));
    head.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.018, 24, 1, false, -Math.PI / 2, Math.PI), m, [0, 0.07, 0.2], [1, 1, 1.1]));
  } else if (c.hat === 'beanie') {
    head.add(mesh(new THREE.SphereGeometry(0.315, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.55), m, [0, 0.04, -0.01], [1.08, 1.02, 1.04], [-0.2, 0, 0]));
    head.add(mesh(torus(0.3, 0.04), fabric(shade(c.hatColor, -0.1)), [0, 0.03, 0.0], [1.08, 1.04, 1], [Math.PI / 2 - 0.2, 0, 0]));
    head.add(mesh(fluffy(new THREE.IcosahedronGeometry(0.07, 5)), fur('#ffffff'), [0, 0.345, 0]));
  } else if (c.hat === 'straw') {
    const straw = fabric(c.hatColor === '#ffffff' ? '#e8c07d' : c.hatColor);
    head.add(mesh(cyl(0.5, 0.5, 0.02, 40), straw, [0, 0.16, 0]));
    head.add(mesh(cyl(0.22, 0.26, 0.17, 32), straw, [0, 0.24, 0]));
    head.add(mesh(cyl(0.262, 0.262, 0.04, 32), fabric('#e03131'), [0, 0.18, 0]));
  } else if (c.hat === 'beret') {
    head.add(mesh(sphere(0.3), m, [0.04, 0.2, -0.02], [1.1, 0.35, 1.1], [0, 0, -0.25]));
    head.add(mesh(cyl(0.012, 0.012, 0.05, 6), m, [0.02, 0.32, -0.02]));
  }
}

function addGlasses(head, c) {
  if (c.glasses === 'none') return;
  const frame = vinyl(c.glasses === 'sun' ? '#1a1a1a' : '#6b4a2b', { roughness: 0.3 });
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(side * 0.1, -0.015, 0.262);
    g.rotation.y = side * 0.32;
    g.add(mesh(torus(0.068, 0.009), frame));
    if (c.glasses === 'sun') g.add(mesh(new THREE.CircleGeometry(0.068, 32), basic('#111', { transparent: true, opacity: 0.82 })));
    head.add(g);
  }
  head.add(mesh(box(0.05, 0.012, 0.012), frame, [0, 0, 0.276]));
}

function addAccessories(body, head, c) {
  if (c.backpack !== 'none') {
    const bp = vinyl(c.backpackColor);
    if (c.backpack === 'bunny') {
      body.add(mesh(sphere(0.15), bp, [0, 0.39, -0.2], [1, 1.05, 0.62]));
      body.add(mesh(sphere(0.08), vinyl('#ffffff'), [0, 0.37, -0.29], [1, 1, 0.5]));
      for (const side of [-1, 1]) {
        body.add(mesh(capsule(0.035, 0.11), bp, [side * 0.06, 0.58, -0.2], [1, 1, 0.6], [0, 0, side * -0.25]));
        body.add(mesh(sphere(0.012), vinyl('#2b2b2b'), [side * 0.03, 0.4, -0.33]));
      }
    } else {
      body.add(mesh(box(0.26, 0.26, 0.12), bp, [0, 0.4, -0.19]));
      body.add(mesh(box(0.2, 0.1, 0.04), vinyl(shade(c.backpackColor, -0.12)), [0, 0.34, -0.26]));
      body.add(mesh(sphere(0.13, 24, 12), bp, [0, 0.53, -0.19], [1, 0.35, 0.46]));
    }
    for (const side of [-1, 1]) body.add(mesh(box(0.03, 0.24, 0.02), vinyl(shade(c.backpackColor, -0.2)), [side * 0.08, 0.41, 0.14]));
  }
  if (c.scarf === 'scarf') {
    const sc = fabric(c.scarfColor);
    body.add(mesh(torus(0.11, 0.045, Math.PI * 2, 32), sc, [0, 0.52, 0], [1.05, 1, 1], [Math.PI / 2, 0, 0]));
    body.add(mesh(box(0.06, 0.16, 0.03), sc, [0.07, 0.42, 0.14], [1, 1, 1], [0.1, 0, 0.12]));
  } else if (c.scarf === 'mask') {
    // 忍者蒙面巾：遮住鼻子以下，後面有飄帶
    const sc = fabric(c.scarfColor);
    head.add(mesh(new THREE.SphereGeometry(0.283, 48, 16, 0, Math.PI * 2, Math.PI * 0.53, Math.PI * 0.3), sc, [0, 0, 0], [1.08, 0.97, 0.98]));
    body.add(mesh(torus(0.1, 0.05), sc, [0, 0.53, 0], [1.05, 1, 1], [Math.PI / 2, 0, 0]));
    for (const side of [-1, 1]) body.add(mesh(box(0.05, 0.2, 0.015), sc, [side * 0.05, 0.55, -0.26], [1, 1, 1], [0.6, 0, side * 0.3]));
  }
  if (c.camera) {
    body.add(mesh(torus(0.12, 0.009, Math.PI), vinyl('#343a40'), [0, 0.5, 0.135], [0.85, 1, 1], [0, 0, Math.PI]));
    body.add(mesh(box(0.11, 0.075, 0.05), vinyl('#495057'), [0, 0.38, 0.165]));
    body.add(mesh(cyl(0.025, 0.025, 0.03, 16), vinyl('#212529'), [0, 0.38, 0.2], [1, 1, 1], [Math.PI / 2, 0, 0]));
    body.add(mesh(sphere(0.012, 8, 6), vinyl('#74c0fc', { roughness: 0.1 }), [0, 0.38, 0.215]));
  }
}

/* ---------------- 燈光 ---------------- */
export function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc8d6e5, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(1.2, 2.5, 2.2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xcfe3ff, 1.4);
  rim.position.set(-2, 1.5, -2);
  scene.add(rim);
}

export function disposeTree(obj) {
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      o.material.map?.dispose();
      o.material.userData?.maps?.forEach(t => t.dispose());
      o.material.dispose?.();
    }
  });
}
