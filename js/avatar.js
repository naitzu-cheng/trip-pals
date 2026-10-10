// Q 版 3D 角色（盲盒公仔風）
// 身體用基本幾何體 + 旋轉曲面組成；臉是用 Canvas 畫出來的貼圖（大眼睛、腮紅、嘴巴）
// 座標：Y 朝上、腳底在 y=0、臉朝 +Z，總高約 1
import * as THREE from 'three';
import { hairGeometry, tieSpots } from './hair.js';
import { makeSkeleton, skinned, skinnedLathe, attach, animate, bodyGeometry, shell, headGeometries, maskGeometry } from './body.js';

export const DEFAULT_AVATAR = {
  skin: '#ffe0cc',
  hair: '#6b4433',
  hairStyle: 'bob',
  bangs: 'full',
  eyes: 'doll',
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
  hairStyle: [['bob', '妹妹頭'], ['short', '短髮'], ['ponytail', '高馬尾'], ['lowtail', '低馬尾'], ['sidetail', '側馬尾'],
    ['pigtails', '低雙馬尾'], ['buns', '雙丸子'], ['bun', '丸子頭'], ['long', '長髮'], ['wavy', '大波浪'],
    ['curly', '捲髮'], ['messy', '亂翹'], ['spiky', '刺蝟頭'], ['bald', '光頭']],
  bangs: [['full', '齊瀏海'], ['wispy', '空氣瀏海'], ['middle', '中分八字'], ['side', '旁分斜瀏海'], ['none', '露額頭']],
  eyes: [['doll', '娃娃眼'], ['sparkle', '閃亮大眼'], ['round', '圓眼'], ['lashes', '長睫毛'], ['dot', '豆豆眼'], ['happy', '笑眼'],
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

const SLEEVES = { tee: 'short', tank: 'none', shirt: 'long', hoodie: 'long', sweater: 'long', jacket: 'long', coat: 'long', dress: 'short', yukata: 'long' };
const HEAD_SCALE = 0.65; // 頭部零件以「半徑 0.27 的頭」設計，縮放到三頭身比例（頭約佔身高三分之一）
const HEAD_Y = 0.838;

// 舊版設定相容
export function normalize(cfg) {
  const c = { ...DEFAULT_AVATAR, ...(cfg || {}) };
  if (c.backpack === true) c.backpack = 'square';
  if (c.backpack === false) c.backpack = 'none';
  if (!OPTIONS.hairStyle.some(o => o[0] === c.hairStyle)) c.hairStyle = 'bob';
  if (!OPTIONS.bangs.some(o => o[0] === c.bangs)) c.bangs = 'full';
  return c;
}

/* ---------------- 主程式 ---------------- */
export function buildAvatar(cfg = {}) {
  const c = normalize(cfg);
  const root = new THREE.Group();
  const rig = makeSkeleton();
  root.add(rig.root);
  rig.root.updateMatrixWorld(true);
  rig.skeleton.calculateInverses();

  const skin = skinMat(c.skin);
  const onePiece = c.topStyle === 'dress' || c.topStyle === 'yukata' || c.topStyle === 'coat';
  const add = (geo, mat) => { const m = skinned(geo, mat, rig); root.add(m); return m; };

  // 影子
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), basic(0x000000, { transparent: true, opacity: 0.2, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.003;
  root.add(shadow);

  // 身體（一整塊光滑的皮膚）
  add(bodyGeometry(), skin);

  // 內衣（被衣服蓋住的地方看不到）
  add(shell('brief', 0.0012), fabric('#ffffff'));

  // 襪子 / 褲襪
  if (c.legwear !== 'none') add(shell(c.legwear, 0.0018), fabric(c.legColor));

  // 下身
  const bottom = fabric(c.bottom);
  if (!onePiece) {
    if (c.bottomStyle === 'pants') { add(shell('pants', 0.004), bottom); add(shell('waist', 0.0035), bottom); }
    else if (c.bottomStyle === 'shorts') { add(shell('shorts', 0.004), bottom); add(shell('waist', 0.0035), bottom); }
    else if (c.bottomStyle === 'ninja') {
      add(shell('pants', 0.014), bottom); add(shell('waist', 0.006), bottom);
      for (const s of ['L', 'R']) attach(rig, 'lowerLeg' + s, mesh(cyl(0.026, 0.026, 0.018), fabric(shade(c.bottom, -0.15)), [s === 'L' ? 0.046 : -0.046, 0.06, -0.004]));
    } else if (c.bottomStyle === 'skirt') {
      add(shell('waist', 0.0035), bottom);
      root.add(skinnedLathe([[0.0001, 0.325], [0.115, 0.325], [0.112, 0.34], [0.085, 0.42], [0.064, 0.48], [0.0001, 0.49]], 'hips', bottom, rig));
    } else if (c.bottomStyle === 'longskirt') {
      add(shell('waist', 0.0035), bottom);
      root.add(skinnedLathe([[0.0001, 0.06], [0.135, 0.06], [0.132, 0.08], [0.09, 0.36], [0.064, 0.48], [0.0001, 0.49]], 'hips', bottom, rig));
    }
  }

  // 上衣
  const top = fabric(c.top);
  if (c.topStyle === 'tank') add(shell('torso', 0.0065), top);
  else add(shell('torsoHigh', c.topStyle === 'coat' ? 0.012 : 0.0065), top);
  const sleeve = SLEEVES[c.topStyle];
  if (sleeve === 'short') add(shell('sleeveShort', 0.0065), top);
  if (sleeve === 'long') add(shell('sleeveLong', c.topStyle === 'coat' ? 0.012 : c.topStyle === 'yukata' ? 0.009 : 0.0065), top);
  addTopDetails(root, rig, c);

  // 鞋子
  for (const s of ['L', 'R']) addShoe(rig, s, c);

  // 頭（沿用原本的大頭零件，縮放後掛在頭骨上）
  const head = new THREE.Group();
  head.position.set(0, HEAD_Y, 0);
  head.scale.setScalar(HEAD_SCALE);
  attach(rig, 'head', head);
  head.add(new THREE.Mesh(headGeometries().head, skin));
  for (const side of [-1, 1]) {
    head.add(mesh(sphere(0.062), skin, [side * 0.262, -0.05, -0.03], [0.45, 1, 0.78], [0, side * -0.35, side * -0.12]));
    head.add(mesh(sphere(0.034), skinMat(shade(c.skin, -0.06)), [side * 0.282, -0.048, -0.01], [0.25, 1, 0.7], [0, side * -0.35, side * -0.12]));
  }
  const face = addFace(head, c);
  if (c.nose === 'animal') head.add(mesh(sphere(0.025), vinyl('#3a2a2a', { roughness: 0.25 }), [0, -0.072, 0.248], [1.35, 0.85, 0.7]));
  addHair(head, c);
  addEars(head, c);
  addHat(head, c);
  addGlasses(head, c);
  if (c.scarf === 'mask') {
    const mk = new THREE.Mesh(maskGeometry(), fabric(c.scarfColor));
    mk.material.side = THREE.DoubleSide;
    head.add(mk);
  }
  addAccessories(root, rig, c);

  // 動畫
  let blinkAt = 2;
  const smallSteps = c.topStyle === 'yukata' || (c.bottomStyle === 'longskirt' && !onePiece);
  root.userData.update = (t, walking) => {
    animate(rig, t, walking, { smallSteps });
    const k = t - blinkAt;
    face.blink(k > 0 && k < 0.13);
    if (k > 0.13) blinkAt = t + 2 + Math.random() * 3;
  };
  root.userData.update(0, false);
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
  const m = new THREE.Mesh(headGeometries().face, material);
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
      const x = fx(side * 36), y = fy(-20);
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
    drawEye(g, fx(side * (kind === 'doll' ? 24.5 : 23)), fy(-10), side, kind, c.eyeColor);
  }

  // 眉毛
  if (c.brows !== 'none') {
    g.strokeStyle = shade(c.hair, -0.12);
    g.lineWidth = c.brows === 'thick' ? 15 : 8;
    for (const side of [-1, 1]) {
      const x = fx(side * 23), y = fy(11.5);
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
    g.beginPath(); g.ellipse(fx(0), fy(-16), 6, 4, 0, 0, Math.PI * 2); g.fill();
  } else if (c.nose === 'button') {
    const grd = g.createRadialGradient(fx(0), fy(-16), 0, fx(0), fy(-16), 18);
    grd.addColorStop(0, rgba(shade(c.skin, -0.18), 0.9));
    grd.addColorStop(1, rgba(shade(c.skin, -0.18), 0));
    g.fillStyle = grd;
    g.beginPath(); g.arc(fx(0), fy(-16), 18, 0, Math.PI * 2); g.fill();
  }

  // 嘴巴
  drawMouth(g, fx(0), fy(-26), c.mouth);

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

  if (kind === 'doll') {
    const w = W * 0.95, h = H * 0.92;
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(x, y, w, h, 0, 0, Math.PI * 2); g.fill();
    g.save();
    g.beginPath(); g.ellipse(x, y, w, h, 0, 0, Math.PI * 2); g.clip();
    const iw = w * 0.8, ih = h * 0.86, icy = y + h * 0.1;
    const grd = g.createLinearGradient(0, icy - ih, 0, icy + ih);
    grd.addColorStop(0, shade(color, -0.42));
    grd.addColorStop(0.5, color);
    grd.addColorStop(1, shade(color, 0.3));
    g.fillStyle = grd;
    g.beginPath(); g.ellipse(x, icy, iw, ih, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = rgba(shade(color, -0.6), 0.95);
    g.beginPath(); g.ellipse(x, icy + ih * 0.05, iw * 0.45, ih * 0.5, 0, 0, Math.PI * 2); g.fill();
    const lid = g.createLinearGradient(0, y - h, 0, y - h * 0.1);
    lid.addColorStop(0, 'rgba(30,20,40,0.55)');
    lid.addColorStop(1, 'rgba(30,20,40,0)');
    g.fillStyle = lid;
    g.fillRect(x - w, y - h, w * 2, h);
    g.restore();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(x - side * 2 - w * 0.22, y - h * 0.18, w * 0.2, h * 0.17, -0.3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x + w * 0.28, y + h * 0.4, w * 0.08, 0, Math.PI * 2); g.fill();
    // 粗上眼線，外眼角加粗
    g.strokeStyle = lash;
    g.lineWidth = 17;
    g.beginPath(); g.ellipse(x, y, w + 4, h + 4, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.fillStyle = lash;
    g.beginPath();
    g.moveTo(x + side * (w - 4), y - h * 0.45);
    g.quadraticCurveTo(x + side * (w + 22), y - h * 0.5, x + side * (w + 24), y - h * 0.15);
    g.quadraticCurveTo(x + side * (w + 8), y - h * 0.2, x + side * (w - 2), y - h * 0.05);
    g.fill();
    g.strokeStyle = 'rgba(90,50,60,0.4)';
    g.lineWidth = 4;
    g.beginPath(); g.ellipse(x, y, w * 0.85, h + 3, 0, Math.PI * 0.28, Math.PI * 0.72); g.stroke();
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

/* ---------------- 身體細節（座標都用靜止姿勢的世界座標） ---------------- */
function addShoe(rig, s, c) {
  const x = s === 'L' ? 0.047 : -0.047;
  const shoe = vinyl(c.shoes);
  const g = new THREE.Group();
  if (c.shoeStyle === 'boots' || c.shoeStyle === 'furboots') {
    g.add(mesh(cyl(0.027, 0.026, 0.06), shoe, [x, 0.05, -0.003]));
    g.add(mesh(sphere(0.029), shoe, [x, 0.02, 0.016], [1, 0.75, 1.65]));
    g.add(mesh(sphere(0.03), vinyl(shade(c.shoes, -0.25)), [x, 0.007, 0.016], [1.03, 0.28, 1.68]));
    if (c.shoeStyle === 'furboots') g.add(mesh(fluffy(torus(0.028, 0.012), 0.005, 130), fur('#fffaf0'), [x, 0.08, -0.003], [1, 1, 1], [Math.PI / 2, 0, 0]));
  } else if (c.shoeStyle === 'sandals') {
    g.add(mesh(box(0.05, 0.009, 0.1), shoe, [x, 0.004, 0.016]));
    g.add(mesh(torus(0.025, 0.005, Math.PI), shoe, [x, 0.012, 0.03], [1, 1, 1], [0, Math.PI / 2, 0]));
  } else {
    g.add(mesh(sphere(0.029), shoe, [x, 0.021, 0.016], [1, 0.78, 1.65]));
    g.add(mesh(sphere(0.03), vinyl('#f1f3f5'), [x, 0.008, 0.016], [1.05, 0.3, 1.7]));
  }
  attach(rig, 'foot' + s, g);
}

function addTopDetails(root, rig, c) {
  const s = c.topStyle;
  const top = fabric(c.top), darker = fabric(shade(c.top, -0.1)), lighter = fabric(shade(c.top, 0.22));
  const on = (bone, obj) => attach(rig, bone, obj);
  const fz = y => (y > 0.5 ? 0.055 : 0.053); // 胸前表面大約的 z
  if (s === 'hoodie') {
    on('chest', mesh(torus(0.045, 0.018), top, [0, 0.635, -0.032], [1, 0.75, 1], [-0.3, 0, 0]));
    on('spine', mesh(box(0.07, 0.028, 0.008), darker, [0, 0.47, 0.052]));
    for (const x of [-0.014, 0.014]) on('chest', mesh(cyl(0.0018, 0.0018, 0.04, 6), fabric('#ffffff'), [x, 0.6, 0.056]));
  } else if (s === 'shirt') {
    for (const side of [-1, 1]) on('chest', mesh(box(0.035, 0.01, 0.022), lighter, [side * 0.018, 0.64, 0.035], [1, 1, 1], [0.5, 0, side * -0.5]));
    for (const y of [0.6, 0.57, 0.54]) on('chest', mesh(sphere(0.005, 10, 8), vinyl('#ffffff'), [0, y, fz(y) + 0.004]));
  } else if (s === 'sweater') {
    on('chest', mesh(fluffy(torus(0.032, 0.014), 0.004, 150), fur('#ffffff'), [0, 0.642, 0.003], [1.1, 1, 1], [Math.PI / 2, 0, 0]));
    for (const y of [0.6, 0.565, 0.53]) on('chest', mesh(sphere(0.009, 16, 12), vinyl('#ffffff'), [0, y, fz(y) + 0.004], [1, 1, 0.6]));
  } else if (s === 'jacket') {
    on('chest', mesh(box(0.026, 0.09, 0.005), fabric('#f8f9fa'), [0, 0.57, 0.054]));
    for (const side of [-1, 1]) on('chest', mesh(box(0.014, 0.045, 0.007), darker, [side * 0.022, 0.605, 0.052], [1, 1, 1], [0, 0, side * 0.35]));
  } else if (s === 'coat') {
    root.add(skinnedLathe([[0.0001, 0.25], [0.125, 0.25], [0.123, 0.265], [0.095, 0.38], [0.075, 0.47], [0.0001, 0.48]], 'hips', top, rig));
    on('hips', mesh(fluffy(torus(0.123, 0.015), 0.005, 120), fur('#ffffff'), [0, 0.255, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
    on('chest', mesh(fluffy(torus(0.034, 0.018), 0.005, 130), fur('#ffffff'), [0, 0.64, 0.004], [1.1, 1, 1], [Math.PI / 2, 0, 0]));
    for (const side of [-1, 1]) {
      on('hips', mesh(box(0.038, 0.03, 0.007), darker, [side * 0.052, 0.34, 0.096], [1, 1, 1], [-0.25, side * 0.45, 0]));
      on('lowerArm' + (side > 0 ? 'L' : 'R'), mesh(fluffy(torus(0.022, 0.01), 0.004, 150), fur('#ffffff'),
        [side * 0.185, 0.462, 0], [1, 1, 1], [Math.PI / 2, 0, side * 0.75]));
    }
    for (const y of [0.6, 0.55]) on('chest', mesh(sphere(0.009, 16, 12), vinyl(shade(c.top, -0.25)), [0.013, y, fz(y) + 0.011], [1, 1, 0.6]));
  } else if (s === 'yukata') {
    root.add(skinnedLathe([[0.0001, 0.03], [0.1, 0.03], [0.1, 0.05], [0.085, 0.3], [0.068, 0.47], [0.0001, 0.48]], 'hips', top, rig));
    on('spine', mesh(cyl(0.066, 0.066, 0.04, 32), fabric(c.bottom), [0, 0.475, 0.002], [1, 1, 0.85]));
    for (const side of [-1, 1]) on('chest', mesh(box(0.011, 0.06, 0.005), fabric('#ffffff'), [side * 0.014, 0.6, 0.054], [1, 1, 1], [0, 0, side * 0.5]));
  } else if (s === 'dress') {
    root.add(skinnedLathe([[0.0001, 0.3], [0.13, 0.3], [0.127, 0.32], [0.085, 0.44], [0.064, 0.53], [0.0001, 0.54]], 'hips', top, rig));
    on('chest', mesh(torus(0.03, 0.007), lighter, [0, 0.637, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
  }
}

function addHair(head, c) {
  const s = c.hairStyle;
  const geo = hairGeometry(c);
  if (!geo) return;
  const hair = vinyl(c.hair, { roughness: 0.55 });
  head.add(new THREE.Mesh(geo, hair));
  // 髮圈
  for (const p of tieSpots(c)) head.add(mesh(torus(0.05, 0.016), vinyl(shade(c.hair, -0.3), { roughness: 0.3 }), [p.x, p.y, p.z], [1, 1, 1], [Math.PI / 2 - 0.4, 0, 0]));
  if ((s === 'messy' || s === 'spiky') && c.hat === 'none') {
    const n = s === 'spiky' ? 8 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const len = s === 'spiky' ? 0.17 : 0.12;
      head.add(mesh(teardrop(0.05, len), hair, [Math.cos(a) * 0.17, 0.27, Math.sin(a) * 0.15 - 0.05], [1, 1, 0.8],
        [Math.PI - Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9]));
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

function addHat(parent, c) {
  if (c.hat === 'none') return;
  // 帽子零件是照舊版較矮的頭設計的，整組往上移、放大一點以配合新頭型
  const head = new THREE.Group();
  head.position.y = 0.035;
  head.scale.setScalar(1.05);
  parent.add(head);
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
    g.position.set(side * 0.105, -0.045, 0.262);
    g.rotation.y = side * 0.32;
    g.add(mesh(torus(0.068, 0.009), frame));
    if (c.glasses === 'sun') g.add(mesh(new THREE.CircleGeometry(0.068, 32), basic('#111', { transparent: true, opacity: 0.82 })));
    head.add(g);
  }
  head.add(mesh(box(0.05, 0.012, 0.012), frame, [0, -0.03, 0.272]));
}

function addAccessories(root, rig, c) {
  const on = (bone, obj) => attach(rig, bone, obj);
  if (c.backpack !== 'none') {
    const bp = vinyl(c.backpackColor);
    if (c.backpack === 'bunny') {
      on('chest', mesh(sphere(0.07), bp, [0, 0.53, -0.09], [1, 1.05, 0.62]));
      on('chest', mesh(sphere(0.036), vinyl('#ffffff'), [0, 0.52, -0.13], [1, 1, 0.5]));
      for (const side of [-1, 1]) {
        on('chest', mesh(capsule(0.016, 0.05), bp, [side * 0.03, 0.62, -0.09], [1, 1, 0.6], [0, 0, side * -0.25]));
        on('chest', mesh(sphere(0.005), vinyl('#2b2b2b'), [side * 0.013, 0.53, -0.145]));
      }
    } else {
      on('chest', mesh(box(0.12, 0.12, 0.05), bp, [0, 0.54, -0.08]));
      on('chest', mesh(box(0.09, 0.045, 0.018), vinyl(shade(c.backpackColor, -0.12)), [0, 0.51, -0.112]));
      on('chest', mesh(sphere(0.06, 24, 12), bp, [0, 0.6, -0.08], [1, 0.32, 0.42]));
    }
    for (const side of [-1, 1]) on('chest', mesh(box(0.012, 0.09, 0.005), vinyl(shade(c.backpackColor, -0.2)), [side * 0.034, 0.567, 0.054]));
  }
  if (c.scarf === 'scarf') {
    const sc = fabric(c.scarfColor);
    on('chest', mesh(torus(0.034, 0.017), sc, [0, 0.642, 0.003], [1.1, 1, 1], [Math.PI / 2, 0, 0]));
    on('chest', mesh(box(0.026, 0.07, 0.01), sc, [0.026, 0.6, 0.058], [1, 1, 1], [0.1, 0, 0.12]));
  } else if (c.scarf === 'mask') {
    const sc = fabric(c.scarfColor);
    for (const side of [-1, 1]) on('neck', mesh(box(0.02, 0.09, 0.005), sc, [side * 0.022, 0.71, -0.15], [1, 1, 1], [0.7, 0, side * 0.3]));
  }
  if (c.camera) {
    on('chest', mesh(torus(0.055, 0.0038, Math.PI), vinyl('#343a40'), [0, 0.636, 0.052], [0.72, 1, 1], [0, 0, Math.PI]));
    on('chest', mesh(box(0.05, 0.034, 0.024), vinyl('#495057'), [0, 0.55, 0.066]));
    on('chest', mesh(cyl(0.011, 0.011, 0.016, 16), vinyl('#212529'), [0, 0.55, 0.082], [1, 1, 1], [Math.PI / 2, 0, 0]));
    on('chest', mesh(sphere(0.005, 8, 6), vinyl('#74c0fc', { roughness: 0.1 }), [0, 0.55, 0.09]));
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
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    if (o.material) {
      o.material.map?.dispose();
      o.material.userData?.maps?.forEach(t => t.dispose());
      o.material.dispose?.();
    }
  });
}
