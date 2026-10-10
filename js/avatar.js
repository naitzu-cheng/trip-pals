// Q 版 3D 角色（盲盒玩具風）
// 大圓頭 + 短短的身體，手腳是一節一節的零件（不做關節），整隻手 / 整條腿擺動來走路
// 頭和頭髮用距離場捏出來；臉是用 Canvas 畫出來的貼圖
// 座標：Y 朝上、腳底在 y=0、臉朝 +Z，總高約 1
import * as THREE from 'three';
import { hairGeometry, tieSpots } from './hair.js';
import { headGeometries, maskGeometry } from './sdf.js';

export const DEFAULT_AVATAR = {
  skin: '#ffe3d3',
  hair: '#7a4a35',
  hairStyle: 'bob',
  bangs: 'full',
  eyes: 'bean',
  eyeColor: '#3b2a20',
  brows: 'none',
  nose: 'red',
  mouth: 'smile',
  blush: true,
  top: '#ff9aa2',
  topStyle: 'blouse',
  bottomStyle: 'shorts',
  bottom: '#9fb4ff',
  legwear: 'none',
  legColor: '#ffffff',
  shoeStyle: 'maryjane',
  shoes: '#a0522d',
  hat: 'none',
  hatColor: '#ff8fab',
  ears: 'none',
  tail: 'none',
  glasses: 'none',
  scarf: 'none',
  scarfColor: '#ff6b6b',
  backpack: 'none',
  backpackColor: '#8ce99a',
  camera: false,
};

// 一鍵套用的範本
export const PRESETS = {
  girl: { ...DEFAULT_AVATAR, hairStyle: 'bob', bangs: 'full', hair: '#7a4a35', hat: 'bow', hatColor: '#ff8fab', topStyle: 'dress', top: '#ffb3c1' },
  boy: {
    ...DEFAULT_AVATAR, hairStyle: 'short', bangs: 'side', hair: '#4a3328', eyes: 'bean', brows: 'thick', nose: 'dot', blush: false,
    topStyle: 'hoodie', top: '#74c0fc', bottomStyle: 'pants', bottom: '#495057', shoeStyle: 'sneakers', shoes: '#ffffff', hat: 'none',
  },
  bunny: { ...DEFAULT_AVATAR, hairStyle: 'curly', bangs: 'none', hair: '#c08457', ears: 'bunny', tail: 'bunny', topStyle: 'blouse', top: '#a5b4fc', bottomStyle: 'shorts', bottom: '#9fa8da', shoeStyle: 'boots', shoes: '#a0705a' },
  cat: { ...DEFAULT_AVATAR, hairStyle: 'bob', bangs: 'full', hair: '#e8857a', ears: 'cat', tail: 'cat', topStyle: 'shirt', top: '#ffd8a8', bottomStyle: 'pinafore', bottom: '#63e6be', shoeStyle: 'maryjane', shoes: '#ffd43b' },
};

export const OPTIONS = {
  hairStyle: [['bob', '妹妹頭'], ['short', '短髮'], ['messy', '亂翹'], ['spiky', '刺蝟頭'], ['curly', '泡泡捲'], ['braids', '麻花辮'],
    ['ponytail', '高馬尾'], ['lowtail', '低馬尾'], ['sidetail', '側馬尾'], ['pigtails', '低雙馬尾'], ['buns', '雙丸子'], ['bun', '丸子頭'],
    ['long', '長髮'], ['wavy', '大波浪'], ['bald', '光頭']],
  bangs: [['full', '齊瀏海'], ['wispy', '空氣瀏海'], ['middle', '中分八字'], ['side', '旁分斜瀏海'], ['none', '露額頭']],
  eyes: [['bean', '豆豆眼'], ['doll', '娃娃眼'], ['sparkle', '閃亮大眼'], ['round', '圓眼'], ['lashes', '長睫毛'], ['dot', '小點眼'],
    ['happy', '笑眼'], ['wink', '眨眼'], ['sleepy', '瞇瞇眼'], ['sharp', '銳利']],
  brows: [['none', '無'], ['thin', '細眉'], ['thick', '粗眉'], ['worried', '八字眉'], ['angry', '生氣眉']],
  nose: [['red', '紅鼻子'], ['dot', '小點'], ['button', '圓鼻'], ['animal', '動物鼻'], ['none', '無']],
  mouth: [['smile', '微笑'], ['grin', '開口笑'], ['cat', '貓嘴 ω'], ['tongue', '吐舌'], ['pout', '嘟嘴'], ['o', '驚訝'], ['flat', '平嘴']],
  topStyle: [['blouse', '娃娃領寬袖'], ['tee', 'T 恤'], ['shirt', '襯衫'], ['hoodie', '帽T'], ['sweater', '針織毛衣'], ['jacket', '外套'],
    ['tank', '背心'], ['coat', '鋪棉大衣'], ['dress', '洋裝'], ['yukata', '浴衣']],
  bottomStyle: [['shorts', '短褲'], ['pants', '長褲'], ['overalls', '吊帶褲'], ['skirt', '短裙'], ['pinafore', '吊帶裙'], ['longskirt', '長裙'], ['ninja', '燈籠褲']],
  legwear: [['none', '無'], ['socks', '短襪'], ['knee', '及膝襪'], ['tights', '褲襪']],
  shoeStyle: [['maryjane', '娃娃鞋'], ['sneakers', '球鞋'], ['boots', '靴子'], ['furboots', '毛靴'], ['sandals', '涼鞋']],
  hat: [['none', '無'], ['bow', '蝴蝶結'], ['beanie', '毛線帽'], ['cap', '棒球帽'], ['fluffy', '毛毛帽'], ['hood', '動物兜帽'],
    ['straw', '草帽'], ['beret', '貝雷帽']],
  ears: [['none', '無'], ['bunny', '兔耳髮箍'], ['cat', '貓耳髮箍'], ['bear', '熊耳髮箍'], ['fox', '狐狸耳'], ['sheep', '羊角']],
  tail: [['none', '無'], ['cat', '貓尾巴'], ['bunny', '兔尾巴'], ['bear', '熊尾巴'], ['fox', '狐狸尾巴']],
  glasses: [['none', '無'], ['round', '圓框'], ['sun', '墨鏡']],
  scarf: [['none', '無'], ['scarf', '圍巾'], ['mask', '忍者蒙面巾']],
  backpack: [['none', '無'], ['square', '方形背包'], ['bunny', '兔兔背包']],
};

export const PALETTE = {
  skin: ['#fff0e6', '#ffe0cc', '#f8cfae', '#e8b48a', '#c98d62', '#8d5b3e', '#ffffff', '#d3f9d8', '#d0ebff'],
  hair: ['#2b2b2b', '#6b4433', '#a0522d', '#e8b04a', '#f6e7b4', '#ffc2d1', '#b197fc', '#a5d8ff', '#f8f9fa', '#ff8787'],
  eyeColor: ['#5b7fd6', '#3b2a20', '#2b2b2b', '#3bc9db', '#51cf66', '#9775fa', '#f76707', '#f06595', '#adb5bd'],
  top: ['#ff9aa2', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc', '#fcc2d7', '#ffffff', '#495057', '#ffa94d', '#1c3d6e', '#a5d8ff', '#b2f2bb'],
  bottom: ['#9fb4ff', '#63e6be', '#6c8cff', '#343a40', '#868e96', '#f1f3f5', '#c9a227', '#2b8a3e', '#c2255c', '#a5d8ff', '#8d6e63', '#212529'],
  legColor: ['#ffffff', '#212529', '#ffc9c9', '#a5d8ff', '#e9ecef', '#d0bfff'],
  shoes: ['#a0522d', '#ffffff', '#343a40', '#ff8787', '#ffe066', '#74c0fc', '#8d6e63', '#96f2d7'],
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

const sphere = (r, w = 24, h = 16) => new THREE.SphereGeometry(r, w, h);
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

const SLEEVES = { tee: 'short', tank: 'none', shirt: 'long', blouse: 'wide', hoodie: 'long', sweater: 'long', jacket: 'long', coat: 'puffy', dress: 'puff', yukata: 'wide' };
const HEAD_SCALE = 0.85; // 頭部零件以「半徑約 0.28 的頭」設計
// 身體比例：零件照「髖部在 0.235」設計，再整體壓矮（腿 × LEG_K、軀幹 × TRUNK_K）
const HIP = 0.235, LEG_K = 0.66, TRUNK_K = 0.76;
const NEW_HIP = HIP * LEG_K;
const mapY = y => (y >= HIP ? NEW_HIP + (y - HIP) * TRUNK_K : y * LEG_K);
const HEAD_Y = 0.72 - (0.5 - mapY(0.5));

// 把身體上的零件「烘」進新比例（直接改頂點，不會讓擺動的手腳變形）
function bakeShorter(m) {
  m.updateMatrix();
  const g = m.geometry;
  g.applyMatrix4(m.matrix);
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), k = y >= HIP ? TRUNK_K : LEG_K;
    p.setY(i, mapY(y));
    if (n) {
      const nx = n.getX(i), ny = n.getY(i) / k, nz = n.getZ(i), l = Math.hypot(nx, ny, nz) || 1;
      n.setXYZ(i, nx / l, ny / l, nz / l);
    }
  }
  p.needsUpdate = true;
  g.computeBoundingSphere();
  m.position.set(0, 0, 0);
  m.rotation.set(0, 0, 0);
  m.scale.set(1, 1, 1);
}

// 舊版設定相容
export function normalize(cfg) {
  const c = { ...DEFAULT_AVATAR, ...(cfg || {}) };
  if (c.backpack === true) c.backpack = 'square';
  if (c.backpack === false) c.backpack = 'none';
  for (const k of Object.keys(OPTIONS)) {
    if (!OPTIONS[k].some(o => o[0] === c[k])) c[k] = DEFAULT_AVATAR[k];
  }
  return c;
}

/* ---------------- 主程式 ---------------- */
export function buildAvatar(cfg = {}) {
  const c = normalize(cfg);
  const root = new THREE.Group();
  const body = new THREE.Group(); // 走路時上下彈跳
  root.add(body);
  const skin = skinMat(c.skin), top = fabric(c.top), bottom = fabric(c.bottom);
  const onePiece = ['dress', 'yukata', 'coat'].includes(c.topStyle);

  // 影子
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), basic(0x000000, { transparent: true, opacity: 0.2, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.003;
  root.add(shadow);

  // 腿：短短的柱子，從髖部整條擺動
  const legs = [1, -1].map(s => {
    const p = new THREE.Group();
    p.position.set(s * 0.047, NEW_HIP, 0);
    const legGroup = new THREE.Group();
    legGroup.scale.y = LEG_K;
    const shoeGroup = new THREE.Group();
    shoeGroup.position.y = HIP - NEW_HIP;
    const pivot = p;
    {
    const p = legGroup;
    p.add(mesh(capsule(0.038, 0.15), c.legwear === 'tights' ? fabric(c.legColor) : skin, [0, -0.105, 0]));
    if (c.legwear === 'socks') p.add(mesh(cyl(0.04, 0.04, 0.045), fabric(c.legColor), [0, -0.18, 0]));
    if (c.legwear === 'knee') p.add(mesh(cyl(0.041, 0.04, 0.11), fabric(c.legColor), [0, -0.15, 0]));
    if (!onePiece) {
      if (c.bottomStyle === 'pants') p.add(mesh(cyl(0.046, 0.047, 0.2), bottom, [0, -0.09, 0]));
      else if (c.bottomStyle === 'shorts' || c.bottomStyle === 'overalls') p.add(mesh(cyl(0.05, 0.053, 0.085), bottom, [0, -0.03, 0]));
      else if (c.bottomStyle === 'ninja') {
        p.add(mesh(sphere(0.058), bottom, [0, -0.085, 0], [1, 1.55, 1]));
        p.add(mesh(cyl(0.041, 0.041, 0.022), fabric(shade(c.bottom, -0.15)), [0, -0.172, 0]));
      }
    }
    }
    pivot.add(legGroup, shoeGroup);
    addShoe(shoeGroup, c);
    body.add(pivot);
    return pivot;
  });

  // 下身
  if (!onePiece) {
    if (['pants', 'shorts', 'overalls', 'ninja'].includes(c.bottomStyle)) {
      body.add(mesh(smoothLathe([[0.0001, 0.165], [0.088, 0.165], [0.097, 0.2], [0.1, 0.25], [0.0001, 0.26]]), bottom));
    } else if (c.bottomStyle === 'skirt' || c.bottomStyle === 'pinafore') {
      body.add(mesh(smoothLathe([[0.0001, 0.13], [0.142, 0.13], [0.139, 0.15], [0.108, 0.24], [0.1, 0.28], [0.0001, 0.29]]), bottom));
    } else if (c.bottomStyle === 'longskirt') {
      body.add(mesh(smoothLathe([[0.0001, 0.035], [0.152, 0.035], [0.149, 0.055], [0.112, 0.2], [0.1, 0.28], [0.0001, 0.29]]), bottom));
    }
  }

  // 上身
  if (c.topStyle === 'dress') {
    body.add(mesh(smoothLathe([[0.0001, 0.1], [0.168, 0.1], [0.163, 0.12], [0.11, 0.3], [0.096, 0.4], [0.086, 0.44], [0.058, 0.49], [0.0001, 0.5]]), top, [0, 0, 0], [1, 1, 0.9]));
  } else {
    body.add(mesh(smoothLathe([[0.0001, 0.2], [0.093, 0.2], [0.101, 0.24], [0.103, 0.3], [0.097, 0.38], [0.086, 0.44], [0.058, 0.49], [0.0001, 0.5]]), top, [0, 0, 0], [1, 1, 0.88]));
  }
  body.add(mesh(cyl(0.036, 0.04, 0.05), skin, [0, 0.5, 0]));
  addTopDetails(body, c);
  addBottomDetails(body, c);

  // 手：短短的一節，從肩膀整隻擺動
  const sleeve = SLEEVES[c.topStyle];
  const arms = [1, -1].map(s => {
    const p = new THREE.Group();
    p.position.set(s * 0.088, mapY(0.448), 0);
    p.rotation.z = s * 0.72;
    p.scale.setScalar(0.88);
    p.add(mesh(sphere(0.037), sleeve === 'none' ? skin : top, [0, 0, 0]));
    p.add(mesh(capsule(0.03, 0.08), skin, [0, -0.06, 0]));
    p.add(mesh(sphere(0.036), skin, [0, -0.118, 0]));
    if (sleeve === 'short') p.add(mesh(cyl(0.04, 0.045, 0.06), top, [0, -0.025, 0]));
    if (sleeve === 'puff') p.add(mesh(sphere(0.05), top, [0, -0.02, 0], [1, 0.95, 1]));
    if (sleeve === 'long') p.add(mesh(cyl(0.038, 0.042, 0.105), top, [0, -0.052, 0]));
    if (sleeve === 'wide') p.add(mesh(cyl(0.04, 0.07, 0.1), top, [0, -0.05, 0]));
    if (sleeve === 'puffy') {
      p.add(mesh(capsule(0.048, 0.06), top, [0, -0.045, 0]));
      p.add(mesh(fluffy(torus(0.04, 0.015), 0.005, 130), fur('#ffffff'), [0, -0.095, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
    }
    body.add(p);
    return p;
  });

  // 軀幹、下身、配件壓成新比例（手腳的 Group 不動）
  for (const ch of [...body.children]) if (ch.isMesh) bakeShorter(ch);

  // 頭
  const head = new THREE.Group();
  head.position.set(0, HEAD_Y, 0);
  head.scale.setScalar(HEAD_SCALE);
  body.add(head);
  head.add(new THREE.Mesh(headGeometries().head, skin));
  for (const side of [-1, 1]) {
    head.add(mesh(sphere(0.055), skin, [side * 0.282, -0.05, -0.02], [0.45, 1, 0.78], [0, side * -0.35, side * -0.12]));
    head.add(mesh(sphere(0.03), skinMat(shade(c.skin, -0.06)), [side * 0.3, -0.048, 0.0], [0.25, 1, 0.7], [0, side * -0.35, side * -0.12]));
  }
  const face = addFace(head, c);
  if (c.nose === 'animal') head.add(mesh(sphere(0.025), vinyl('#3a2a2a', { roughness: 0.25 }), [0, -0.075, 0.262], [1.35, 0.85, 0.7]));
  if (c.nose === 'red') head.add(mesh(sphere(0.024), vinyl('#ff6b6b', { roughness: 0.3 }), [0, -0.07, 0.262], [1.15, 1, 0.75]));
  addHair(head, c);
  addEars(head, c);
  addHat(head, c);
  addGlasses(head, c);
  if (c.scarf === 'mask') {
    const mk = new THREE.Mesh(maskGeometry(), fabric(c.scarfColor));
    mk.material.side = THREE.DoubleSide;
    head.add(mk);
  }
  const before = new Set(body.children);
  addAccessories(body, c);
  for (const ch of body.children) if (!before.has(ch) && ch.isMesh) bakeShorter(ch);

  // 動畫：整隻手腳擺動
  let blinkAt = 2;
  const step = c.topStyle === 'yukata' || (c.bottomStyle === 'longskirt' && !onePiece) ? 0.5 : 1;
  root.userData.update = (t, walking) => {
    if (walking) {
      const s = Math.sin(t * 10);
      legs[0].rotation.x = s * 0.5 * step;
      legs[1].rotation.x = -s * 0.5 * step;
      arms[0].rotation.x = -s * 0.6;
      arms[1].rotation.x = s * 0.6;
      body.position.y = Math.abs(Math.cos(t * 10)) * 0.025;
      body.rotation.z = s * 0.025;
      head.rotation.z = s * 0.03;
    } else {
      legs.forEach(l => (l.rotation.x *= 0.8));
      arms.forEach((p, i) => (p.rotation.x = Math.sin(t * 1.6 + i) * 0.06));
      body.position.y = 0;
      body.rotation.z = 0;
      head.rotation.z = Math.sin(t * 1.2) * 0.04;
      body.scale.y = 1 + Math.sin(t * 2.2) * 0.006;
    }
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
    drawEye(g, fx(side * (kind === 'doll' ? 24.5 : kind === 'bean' ? 21 : 23)), fy(-10), side, kind, c.eyeColor);
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
  if (kind === 'bean') {
    g.fillStyle = lash;
    g.beginPath(); g.ellipse(x, y, 30, 40, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(x - 9, y - 14, 9, 11, -0.3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x + 9, y + 15, 4.5, 0, Math.PI * 2); g.fill();
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
function addShoe(p, c) {
  const shoe = vinyl(c.shoes);
  if (c.shoeStyle === 'boots' || c.shoeStyle === 'furboots') {
    p.add(mesh(cyl(0.046, 0.045, 0.1), shoe, [0, -0.165, 0]));
    p.add(mesh(sphere(0.047), shoe, [0, -0.2, 0.012], [1, 0.72, 1.3]));
    p.add(mesh(sphere(0.049), vinyl(shade(c.shoes, -0.25)), [0, -0.217, 0.012], [1.02, 0.25, 1.33]));
    if (c.shoeStyle === 'furboots') p.add(mesh(fluffy(torus(0.047, 0.016), 0.005, 130), fur('#fffaf0'), [0, -0.112, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
  } else if (c.shoeStyle === 'sandals') {
    p.add(mesh(box(0.075, 0.012, 0.12), shoe, [0, -0.223, 0.012]));
    p.add(mesh(torus(0.04, 0.007, Math.PI), shoe, [0, -0.212, 0.03], [1, 1, 1], [0, Math.PI / 2, 0]));
  } else if (c.shoeStyle === 'maryjane') {
    p.add(mesh(sphere(0.045), shoe, [0, -0.2, 0.012], [1, 0.68, 1.32]));
    p.add(mesh(torus(0.041, 0.006, Math.PI), shoe, [0, -0.2, 0.0], [1, 1, 1], [0, Math.PI / 2, 0]));
    p.add(mesh(sphere(0.047), vinyl(shade(c.shoes, -0.2)), [0, -0.216, 0.012], [1.02, 0.25, 1.34]));
  } else {
    p.add(mesh(sphere(0.046), shoe, [0, -0.2, 0.012], [1, 0.72, 1.35]));
    p.add(mesh(sphere(0.048), vinyl('#f1f3f5'), [0, -0.216, 0.012], [1.03, 0.26, 1.38]));
  }
}

// 胸前表面大約的 z
const frontZ = y => (y > 0.44 ? 0.076 - (y - 0.44) * 0.5 : y > 0.38 ? 0.083 : 0.09);

function peterPan(body, color) {
  for (const s of [-1, 1]) body.add(mesh(sphere(0.052), fabric(color), [s * 0.036, 0.478, 0.045], [1, 0.24, 0.8], [0.3, 0, s * 0.2]));
}

function addTopDetails(body, c) {
  const s = c.topStyle;
  const top = fabric(c.top), darker = fabric(shade(c.top, -0.1)), lighter = fabric(shade(c.top, 0.22));
  if (s === 'blouse') {
    peterPan(body, '#ffffff');
  } else if (s === 'hoodie') {
    body.add(mesh(torus(0.06, 0.024), top, [0, 0.49, -0.045], [1, 0.72, 1], [-0.3, 0, 0]));
    body.add(mesh(box(0.095, 0.036, 0.01), darker, [0, 0.27, 0.093]));
    for (const x of [-0.017, 0.017]) body.add(mesh(cyl(0.0025, 0.0025, 0.055, 6), fabric('#ffffff'), [x, 0.445, frontZ(0.445) + 0.006]));
  } else if (s === 'shirt') {
    for (const side of [-1, 1]) body.add(mesh(box(0.05, 0.012, 0.03), lighter, [side * 0.026, 0.49, 0.05], [1, 1, 1], [0.5, 0, side * -0.5]));
    for (const y of [0.43, 0.38, 0.33, 0.28]) body.add(mesh(sphere(0.007, 10, 8), vinyl('#ffffff'), [0, y, frontZ(y) + 0.003]));
  } else if (s === 'sweater') {
    body.add(mesh(torus(0.1, 0.013), darker, [0, 0.207, 0], [1, 0.88, 1], [Math.PI / 2, 0, 0]));
    body.add(mesh(fluffy(torus(0.05, 0.02), 0.005, 130), fur('#ffffff'), [0, 0.493, 0.003], [1.1, 1, 1], [Math.PI / 2, 0, 0]));
    for (const y of [0.42, 0.36, 0.3]) body.add(mesh(sphere(0.013, 16, 12), vinyl('#ffffff'), [0, y, frontZ(y) + 0.003], [1, 1, 0.6]));
  } else if (s === 'jacket') {
    body.add(mesh(box(0.035, 0.22, 0.006), fabric('#f8f9fa'), [0, 0.35, 0.087]));
    for (const side of [-1, 1]) body.add(mesh(box(0.02, 0.07, 0.008), darker, [side * 0.03, 0.44, frontZ(0.44)], [1, 1, 1], [0, 0, side * 0.35]));
  } else if (s === 'coat') {
    body.add(mesh(smoothLathe([[0.0001, 0.12], [0.142, 0.12], [0.139, 0.14], [0.11, 0.28], [0.102, 0.36], [0.0001, 0.37]]), top));
    body.add(mesh(fluffy(torus(0.14, 0.017), 0.006, 110), fur('#ffffff'), [0, 0.126, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
    body.add(mesh(fluffy(torus(0.055, 0.025), 0.006, 120), fur('#ffffff'), [0, 0.49, 0.004], [1.1, 1, 1], [Math.PI / 2, 0, 0]));
    for (const side of [-1, 1]) body.add(mesh(box(0.05, 0.04, 0.008), darker, [side * 0.062, 0.21, 0.122], [1, 1, 1], [-0.2, side * 0.45, 0]));
    for (const y of [0.42, 0.35]) body.add(mesh(sphere(0.012, 16, 12), vinyl(shade(c.top, -0.25)), [0.02, y, frontZ(y) + 0.008], [1, 1, 0.6]));
  } else if (s === 'yukata') {
    body.add(mesh(smoothLathe([[0.0001, 0.03], [0.118, 0.03], [0.118, 0.05], [0.106, 0.25], [0.102, 0.3], [0.0001, 0.31]]), top));
    body.add(mesh(cyl(0.106, 0.106, 0.05, 32), fabric(c.bottom), [0, 0.29, 0], [1, 1, 0.9]));
    for (const side of [-1, 1]) body.add(mesh(box(0.014, 0.09, 0.006), fabric('#ffffff'), [side * 0.02, 0.45, frontZ(0.45) + 0.002], [1, 1, 1], [0, 0, side * 0.5]));
  } else if (s === 'dress') {
    peterPan(body, '#ffffff');
  }
}

function addBottomDetails(body, c) {
  if (['dress', 'yukata', 'coat'].includes(c.topStyle)) return;
  if (c.bottomStyle === 'overalls' || c.bottomStyle === 'pinafore') {
    const m = fabric(c.bottom);
    body.add(mesh(box(0.115, 0.1, 0.014), m, [0, 0.31, 0.093]));
    body.add(mesh(box(0.045, 0.03, 0.006), fabric('#ffffff'), [0, 0.32, 0.101]));
    for (const s of [-1, 1]) {
      body.add(mesh(box(0.02, 0.14, 0.008), m, [s * 0.042, 0.41, 0.083], [1, 1, 1], [-0.22, 0, 0]));
      body.add(mesh(box(0.02, 0.2, 0.008), m, [s * 0.042, 0.38, -0.086], [1, 1, 1], [0.12, 0, 0]));
      body.add(mesh(sphere(0.009, 12, 8), vinyl('#ffe066'), [s * 0.042, 0.355, 0.1]));
    }
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
  if (['bunny', 'cat', 'bear'].includes(c.ears)) {
    head.add(mesh(torus(0.315, 0.013, Math.PI), vinyl(shade(c.hatColor, -0.1)), [0, 0.01, 0.02], [1, 1.04, 1]));
  }
  addAnimalEars(head, c.ears, c.ears === 'fox' ? vinyl('#ff922b') : c.ears === 'bunny' ? vinyl('#ffffff') : vinyl(c.hair, { roughness: 0.38 }), 1);
}

function addAnimalEars(head, kind, color, scale, onHood = false) {
  const inner = vinyl('#ffc9d6');
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(side * (onHood ? 0.2 : 0.16), onHood ? 0.31 : 0.3, onHood ? -0.07 : 0.01);
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
  head.position.y = 0.02;
  head.scale.setScalar(1.04);
  parent.add(head);
  const m = fabric(c.hatColor);
  if (c.hat === 'bow') {
    const bow = vinyl(c.hatColor, { roughness: 0.5 });
    const g = new THREE.Group();
    g.position.set(0, 0.3, 0.06);
    g.rotation.x = -0.35;
    for (const s of [-1, 1]) g.add(mesh(sphere(0.075), bow, [s * 0.075, 0.01, 0], [1.25, 0.8, 0.45], [0, 0, s * -0.35]));
    g.add(mesh(sphere(0.035), bow, [0, 0.005, 0.01], [1, 0.95, 0.75]));
    head.add(g);
    parent.add(head);
    return;
  }
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

function addAccessories(body, c) {
  if (c.backpack !== 'none') {
    const bp = vinyl(c.backpackColor);
    if (c.backpack === 'bunny') {
      body.add(mesh(sphere(0.085), bp, [0, 0.33, -0.125], [1, 1.05, 0.62]));
      body.add(mesh(sphere(0.042), vinyl('#ffffff'), [0, 0.32, -0.172], [1, 1, 0.5]));
      for (const side of [-1, 1]) {
        body.add(mesh(capsule(0.02, 0.06), bp, [side * 0.036, 0.43, -0.125], [1, 1, 0.6], [0, 0, side * -0.25]));
        body.add(mesh(sphere(0.006), vinyl('#2b2b2b'), [side * 0.016, 0.335, -0.18]));
      }
    } else {
      body.add(mesh(box(0.15, 0.15, 0.065), bp, [0, 0.34, -0.12]));
      body.add(mesh(box(0.11, 0.055, 0.02), vinyl(shade(c.backpackColor, -0.12)), [0, 0.305, -0.157]));
      body.add(mesh(sphere(0.075, 24, 12), bp, [0, 0.415, -0.12], [1, 0.32, 0.45]));
    }
    for (const side of [-1, 1]) body.add(mesh(box(0.015, 0.13, 0.006), vinyl(shade(c.backpackColor, -0.2)), [side * 0.05, 0.37, 0.088]));
  }
  if (c.scarf === 'scarf') {
    const sc = fabric(c.scarfColor);
    body.add(mesh(torus(0.056, 0.024), sc, [0, 0.493, 0.003], [1.1, 1, 1], [Math.PI / 2, 0, 0]));
    body.add(mesh(box(0.035, 0.09, 0.012), sc, [0.035, 0.43, 0.088], [1, 1, 1], [0.1, 0, 0.12]));
  } else if (c.scarf === 'mask') {
    const sc = fabric(c.scarfColor);
    for (const side of [-1, 1]) body.add(mesh(box(0.025, 0.11, 0.006), sc, [side * 0.03, 0.6, -0.245], [1, 1, 1], [0.7, 0, side * 0.3]));
  }
  if (c.camera) {
    body.add(mesh(torus(0.075, 0.004, Math.PI), vinyl('#343a40'), [0, 0.49, 0.07], [0.8, 1, 1], [0, 0, Math.PI]));
    body.add(mesh(box(0.065, 0.045, 0.03), vinyl('#495057'), [0, 0.39, 0.1]));
    body.add(mesh(cyl(0.014, 0.014, 0.02, 16), vinyl('#212529'), [0, 0.39, 0.12], [1, 1, 1], [Math.PI / 2, 0, 0]));
    body.add(mesh(sphere(0.006, 8, 6), vinyl('#74c0fc', { roughness: 0.1 }), [0, 0.39, 0.13]));
  }
  addTail(body, c);
}

function addTail(body, c) {
  if (c.tail === 'none') return;
  const color = c.tail === 'fox' ? vinyl('#ff922b') : c.tail === 'bunny' ? fur('#ffffff') : vinyl(c.hair, { roughness: 0.5 });
  if (c.tail === 'bunny') {
    body.add(mesh(fluffy(new THREE.IcosahedronGeometry(0.04, 4), 0.006, 110), color, [0, 0.21, -0.1]));
  } else if (c.tail === 'bear') {
    body.add(mesh(sphere(0.03), color, [0, 0.21, -0.098]));
  } else {
    // 彎彎的尾巴
    const pts = c.tail === 'cat'
      ? [[0, 0.21, -0.09], [0.02, 0.2, -0.16], [0.06, 0.24, -0.21], [0.08, 0.32, -0.2], [0.06, 0.37, -0.17]]
      : [[0, 0.21, -0.09], [0.02, 0.2, -0.17], [0.05, 0.25, -0.24]];
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    const r = c.tail === 'cat' ? 0.013 : 0.035;
    body.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 12, false), color));
    const end = pts[pts.length - 1];
    body.add(mesh(sphere(c.tail === 'fox' ? 0.04 : r), c.tail === 'fox' ? fur('#ffffff') : color, end));
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
