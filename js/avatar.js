// Q 版 3D 角色：全部用基本幾何體組成，不需要外部模型檔
// 座標：Y 朝上、腳底在 y=0、臉朝 +Z，總高約 1
import * as THREE from 'three';

export const DEFAULT_AVATAR = {
  skin: '#ffd9b8',
  hair: '#5b3a29',
  hairStyle: 'short',
  bangs: 'full',
  eyes: 'sparkle',
  eyeColor: '#3b2a20',
  brows: 'thin',
  nose: 'none',
  mouth: 'smile',
  blush: true,
  top: '#ff8f8f',
  topStyle: 'tee',
  bottomStyle: 'pants',
  bottom: '#5c7cfa',
  shoeStyle: 'sneakers',
  shoes: '#ffffff',
  hat: 'none',
  hatColor: '#ffd43b',
  ears: 'none',
  glasses: 'none',
  backpack: true,
  backpackColor: '#69db7c',
  camera: false,
};

export const OPTIONS = {
  hairStyle: [['short', '短髮'], ['bob', '鮑伯頭'], ['long', '長髮'], ['ponytail', '馬尾'], ['pigtails', '雙馬尾'],
    ['bun', '丸子頭'], ['curly', '捲髮'], ['spiky', '刺蝟頭'], ['bald', '光頭']],
  bangs: [['full', '齊瀏海'], ['side', '旁分'], ['middle', '中分'], ['wispy', '空氣瀏海'], ['none', '無瀏海']],
  eyes: [['sparkle', '閃亮'], ['round', '圓眼'], ['lashes', '長睫毛'], ['dot', '豆豆眼'], ['happy', '笑眼'],
    ['wink', '眨眼'], ['sleepy', '瞇瞇眼']],
  brows: [['thin', '細眉'], ['thick', '粗眉'], ['worried', '八字眉'], ['none', '無']],
  nose: [['none', '無'], ['dot', '小點'], ['button', '圓鼻'], ['animal', '動物鼻']],
  mouth: [['smile', '微笑'], ['grin', '開口笑'], ['cat', '貓嘴 ω'], ['tongue', '吐舌'], ['o', '驚訝'], ['flat', '平嘴']],
  topStyle: [['tee', 'T 恤'], ['tank', '背心'], ['shirt', '襯衫'], ['hoodie', '帽T'], ['sweater', '毛衣'],
    ['jacket', '外套'], ['dress', '洋裝'], ['yukata', '浴衣']],
  bottomStyle: [['pants', '長褲'], ['shorts', '短褲'], ['skirt', '短裙'], ['longskirt', '長裙']],
  shoeStyle: [['sneakers', '球鞋'], ['boots', '靴子'], ['sandals', '涼鞋']],
  hat: [['none', '無'], ['cap', '棒球帽'], ['beanie', '毛帽'], ['straw', '草帽'], ['beret', '貝雷帽']],
  ears: [['none', '無'], ['cat', '貓耳'], ['bear', '熊耳'], ['bunny', '兔耳'], ['fox', '狐狸耳']],
  glasses: [['none', '無'], ['round', '圓框'], ['sun', '墨鏡']],
};

export const PALETTE = {
  skin: ['#ffe8d6', '#ffd9b8', '#f1c27d', '#d79f73', '#a0714f', '#6b4630', '#ffffff', '#c7ecc9', '#bde0fe'],
  hair: ['#1f1f1f', '#5b3a29', '#a0522d', '#e8b04a', '#f4e1a1', '#ff8fab', '#9775fa', '#4dabf7', '#ffffff', '#ff6b6b'],
  eyeColor: ['#3b2a20', '#1f1f1f', '#4dabf7', '#40c057', '#9775fa', '#e8590c', '#f06595'],
  top: ['#ff8f8f', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac', '#ffffff', '#343a40', '#ff922b', '#1c3d6e'],
  bottom: ['#5c7cfa', '#343a40', '#868e96', '#e9ecef', '#c9a227', '#2b8a3e', '#c2255c', '#a5d8ff', '#8d6e63'],
  shoes: ['#ffffff', '#343a40', '#ff6b6b', '#ffd43b', '#4dabf7', '#8d6e63'],
  hatColor: ['#ffd43b', '#ff6b6b', '#4dabf7', '#343a40', '#ffffff', '#e8c07d', '#9775fa', '#69db7c'],
  backpackColor: ['#69db7c', '#ff922b', '#4dabf7', '#f783ac', '#343a40', '#ffd43b'],
};

let gradient;
function toonGradient() {
  if (gradient) return gradient;
  const data = new Uint8Array([90, 170, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}
const mat = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...extra });

function mesh(geo, material, [x = 0, y = 0, z = 0] = [], [sx = 1, sy = 1, sz = 1] = [], [rx = 0, ry = 0, rz = 0] = []) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  return m;
}

const sphere = (r, w = 24, h = 16) => new THREE.SphereGeometry(r, w, h);
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 12);
const cyl = (rt, rb, h, seg = 20) => new THREE.CylinderGeometry(rt, rb, h, seg);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const arc = (r, t, a = Math.PI) => new THREE.TorusGeometry(r, t, 6, 16, a);

const SLEEVES = { tee: 'short', tank: 'none', shirt: 'long', hoodie: 'long', sweater: 'long', jacket: 'long', dress: 'short', yukata: 'wide' };

export function buildAvatar(cfg = {}) {
  const c = { ...DEFAULT_AVATAR, ...(cfg || {}) };
  const root = new THREE.Group();
  const body = new THREE.Group(); // 走路時上下彈跳的部分
  root.add(body);

  const skin = mat(c.skin), hair = mat(c.hair), top = mat(c.top), bottom = mat(c.bottom), shoe = mat(c.shoes);
  const dark = mat('#2b2b2b');
  const onePiece = c.topStyle === 'dress' || c.topStyle === 'yukata';

  // 影子
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.003;
  root.add(shadow);

  // 腿（以髖關節為軸心），腿是膚色，褲子另外套上去
  const legs = [-1, 1].map(side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.085, 0.24, 0);
    pivot.add(mesh(capsule(0.05, 0.12), skin, [0, -0.1, 0]));
    if (!onePiece && c.bottomStyle === 'pants') pivot.add(mesh(capsule(0.06, 0.13), bottom, [0, -0.09, 0]));
    if (!onePiece && c.bottomStyle === 'shorts') pivot.add(mesh(cyl(0.064, 0.068, 0.08), bottom, [0, -0.03, 0]));
    addShoe(pivot, c, shoe, skin);
    body.add(pivot);
    return pivot;
  });

  // 下身
  if (c.topStyle === 'dress') {
    body.add(mesh(cyl(0.13, 0.25, 0.3), top, [0, 0.36, 0]));
  } else if (c.topStyle === 'yukata') {
    body.add(mesh(cyl(0.16, 0.2, 0.28), top, [0, 0.16, 0]));
  } else if (c.bottomStyle === 'skirt') {
    body.add(mesh(cyl(0.15, 0.23, 0.13), bottom, [0, 0.245, 0], [1, 1, 0.9]));
  } else if (c.bottomStyle === 'longskirt') {
    body.add(mesh(cyl(0.15, 0.25, 0.26), bottom, [0, 0.185, 0], [1, 1, 0.9]));
  } else {
    body.add(mesh(cyl(0.165, 0.165, 0.07), bottom, [0, 0.27, 0], [1, 1, 0.85]));
    body.add(mesh(sphere(0.165), bottom, [0, 0.255, 0], [1, 0.5, 0.85]));
  }

  // 上身
  if (c.topStyle !== 'dress') {
    body.add(mesh(capsule(0.16, 0.1), top, [0, 0.37, 0], [1, 1, 0.85]));
  }
  addTopDetails(body, c);

  // 手臂（以肩膀為軸心）
  const sleeve = SLEEVES[c.topStyle] || 'short';
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.18, 0.47, 0);
    pivot.rotation.z = side * 0.25;
    pivot.add(mesh(capsule(0.043, 0.1), skin, [0, -0.08, 0]));
    if (sleeve === 'short') pivot.add(mesh(capsule(0.052, 0.035), top, [0, -0.025, 0]));
    if (sleeve === 'long') pivot.add(mesh(capsule(0.05, 0.1), top, [0, -0.075, 0]));
    if (sleeve === 'wide') pivot.add(mesh(box(0.1, 0.17, 0.13), top, [0, -0.085, 0]));
    pivot.add(mesh(sphere(0.052), skin, [0, -0.18, 0]));
    body.add(pivot);
    return pivot;
  });

  // 頭
  const head = new THREE.Group();
  head.position.y = 0.74;
  body.add(head);
  head.add(mesh(sphere(0.27, 32, 24), skin, [0, 0, 0], [1.05, 0.95, 0.95]));

  const eyeGroup = addFace(head, c, skin, hair, dark);
  addHair(head, c, hair);
  addEars(head, c, hair);
  addHat(head, c);
  addGlasses(head, c);
  addAccessories(body, c);

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
    // 眨眼
    const k = t - blinkAt;
    eyeGroup.scale.y = k > 0 && k < 0.14 ? 0.15 : 1;
    if (k > 0.14) blinkAt = t + 2 + Math.random() * 3;
  };
  root.userData.config = c;
  return root;
}

function addShoe(pivot, c, shoe, skin) {
  if (c.shoeStyle === 'boots') {
    pivot.add(mesh(cyl(0.066, 0.066, 0.11), shoe, [0, -0.16, 0]));
    pivot.add(mesh(sphere(0.075), shoe, [0, -0.2, 0.025], [1, 0.6, 1.35]));
  } else if (c.shoeStyle === 'sandals') {
    pivot.add(mesh(sphere(0.06), skin, [0, -0.2, 0.025], [1, 0.6, 1.4]));
    pivot.add(mesh(box(0.11, 0.025, 0.17), shoe, [0, -0.235, 0.025]));
    pivot.add(mesh(arc(0.05, 0.01), shoe, [0, -0.215, 0.05], [1, 1, 1], [0, Math.PI / 2, 0]));
  } else {
    pivot.add(mesh(sphere(0.075), shoe, [0, -0.2, 0.025], [1, 0.6, 1.35]));
    pivot.add(mesh(sphere(0.078), mat('#f1f3f5'), [0, -0.218, 0.025], [1.02, 0.25, 1.38]));
  }
}

function addTopDetails(body, c) {
  const s = c.topStyle;
  const darker = mat(shade(c.top, -0.12));
  const lighter = mat(shade(c.top, 0.25));
  if (s === 'hoodie') {
    body.add(mesh(new THREE.TorusGeometry(0.11, 0.045, 8, 20), mat(c.top), [0, 0.5, -0.06], [1, 0.7, 1]));
    body.add(mesh(box(0.16, 0.06, 0.02), darker, [0, 0.33, 0.14]));
  } else if (s === 'shirt') {
    for (const side of [-1, 1]) {
      body.add(mesh(box(0.08, 0.025, 0.05), lighter, [side * 0.045, 0.52, 0.09], [1, 1, 1], [0.4, 0, side * -0.5]));
    }
    for (let i = 0; i < 3; i++) body.add(mesh(sphere(0.011, 8, 6), mat('#ffffff'), [0, 0.46 - i * 0.06, 0.137]));
  } else if (s === 'sweater') {
    body.add(mesh(new THREE.TorusGeometry(0.155, 0.022, 8, 24), darker, [0, 0.27, 0], [1, 0.85, 1], [Math.PI / 2, 0, 0]));
    body.add(mesh(new THREE.TorusGeometry(0.07, 0.022, 8, 20), darker, [0, 0.53, 0.0], [1, 1, 1], [Math.PI / 2, 0, 0]));
  } else if (s === 'jacket') {
    body.add(mesh(box(0.07, 0.26, 0.02), mat('#f8f9fa'), [0, 0.38, 0.132]));
    for (const side of [-1, 1]) {
      body.add(mesh(box(0.035, 0.12, 0.02), darker, [side * 0.05, 0.46, 0.135], [1, 1, 1], [0, 0, side * 0.35]));
      body.add(mesh(box(0.05, 0.04, 0.02), darker, [side * 0.09, 0.32, 0.128]));
    }
  } else if (s === 'yukata') {
    body.add(mesh(cyl(0.168, 0.168, 0.07), mat(c.bottom), [0, 0.32, 0], [1, 1, 0.87]));
    for (const side of [-1, 1]) {
      body.add(mesh(box(0.025, 0.15, 0.015), mat('#ffffff'), [side * 0.035, 0.45, 0.13], [1, 1, 1], [0, 0, side * 0.45]));
    }
  } else if (s === 'tank') {
    for (const side of [-1, 1]) body.add(mesh(box(0.04, 0.05, 0.12), mat(c.top), [side * 0.1, 0.52, 0]));
  }
}

function addFace(head, c, skin, hair, dark) {
  const eyeGroup = new THREE.Group();
  head.add(eyeGroup);
  const iris = mat(c.eyeColor);
  const white = mat('#ffffff');
  const kindFor = side => (c.eyes === 'wink' ? (side < 0 ? 'sparkle' : 'happy') : c.eyes);
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(side * 0.095, -0.01, 0.235);
    g.rotation.y = side * 0.3;
    const k = kindFor(side);
    if (k === 'happy') {
      g.add(mesh(arc(0.035, 0.012), dark));
    } else if (k === 'sleepy') {
      g.add(mesh(box(0.07, 0.016, 0.012), dark, [0, 0, 0.012]));
    } else if (k === 'dot') {
      g.add(mesh(sphere(0.028), dark, [0, 0, 0], [1, 1.2, 0.5]));
    } else if (k === 'round') {
      g.add(mesh(sphere(0.05), white, [0, 0, -0.004], [1, 1.08, 0.4]));
      g.add(mesh(sphere(0.036), iris, [0, -0.004, 0.008], [1, 1.1, 0.4]));
      g.add(mesh(sphere(0.018), dark, [0, -0.004, 0.017], [1, 1.1, 0.4]));
      g.add(mesh(sphere(0.011), white, [0.012, 0.016, 0.022]));
    } else {
      g.add(mesh(sphere(0.045), iris, [0, 0, 0], [0.85, 1.15, 0.45]));
      g.add(mesh(sphere(0.015), white, [0.013, 0.02, 0.018]));
      g.add(mesh(sphere(0.008), white, [-0.012, -0.018, 0.018]));
      if (k === 'lashes') {
        for (let i = 0; i < 3; i++) {
          g.add(mesh(box(0.008, 0.026, 0.006), dark, [side * (0.024 + i * 0.01), 0.05 - i * 0.008, 0.012], [1, 1, 1], [0, 0, side * (-0.5 - i * 0.35)]));
        }
      }
    }
    eyeGroup.add(g);

    // 眉毛
    if (c.brows !== 'none') {
      const w = c.brows === 'thick' ? 0.075 : 0.06, h = c.brows === 'thick' ? 0.024 : 0.012;
      const tilt = c.brows === 'worried' ? side * 0.35 : side * -0.08;
      head.add(mesh(box(w, h, 0.012), hair, [side * 0.1, 0.062, 0.236], [1, 1, 1], [0, side * 0.3, tilt]));
    }
  }

  // 鼻子
  if (c.nose === 'dot') head.add(mesh(sphere(0.011, 8, 6), mat(shade(c.skin, -0.25)), [0, -0.045, 0.252]));
  if (c.nose === 'button') head.add(mesh(sphere(0.026), mat(shade(c.skin, -0.06)), [0, -0.042, 0.248], [1.15, 0.9, 0.8]));
  if (c.nose === 'animal') head.add(mesh(sphere(0.026), mat('#3a2a2a'), [0, -0.04, 0.252], [1.35, 0.85, 0.7]));

  // 嘴巴（稍微往下傾，貼著臉）
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.09, 0.242);
  mouth.rotation.x = 0.36;
  head.add(mouth);
  const red = mat('#a33b3b');
  const pink = mat('#ff8fa3');
  if (c.mouth === 'grin') {
    mouth.add(mesh(new THREE.CircleGeometry(0.038, 20, Math.PI, Math.PI), mat('#7a2630'), [0, 0.012, 0.002]));
    mouth.add(mesh(new THREE.CircleGeometry(0.02, 16, 0, Math.PI), pink, [0, -0.018, 0.003]));
  } else if (c.mouth === 'cat') {
    for (const side of [-1, 1]) mouth.add(mesh(arc(0.016, 0.007), red, [side * 0.016, 0, 0], [1, 1, 1], [0, 0, Math.PI]));
  } else if (c.mouth === 'o') {
    mouth.add(mesh(new THREE.TorusGeometry(0.016, 0.007, 6, 16), red));
  } else if (c.mouth === 'flat') {
    mouth.add(mesh(box(0.05, 0.01, 0.01), red));
  } else {
    mouth.add(mesh(arc(0.03, 0.009), red, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI]));
    if (c.mouth === 'tongue') mouth.add(mesh(sphere(0.016), pink, [0.008, -0.03, -0.002], [1, 1.1, 0.5]));
  }

  // 腮紅
  if (c.blush) {
    const blush = new THREE.MeshBasicMaterial({ color: '#ff8fa3', transparent: true, opacity: 0.55 });
    for (const side of [-1, 1]) {
      head.add(mesh(sphere(0.04), blush, [side * 0.16, -0.065, 0.2], [1.2, 0.6, 0.4], [0, side * 0.6, 0]));
    }
  }
  return eyeGroup;
}

function addHair(head, c, hair) {
  const s = c.hairStyle;
  if (s === 'bald') return;
  if (s === 'curly') {
    // 一顆顆小捲
    for (let ti = 0; ti < 5; ti++) {
      const theta = 0.12 * Math.PI + ti * 0.12 * Math.PI;
      const n = Math.round(4 + Math.sin(theta) * 9);
      for (let pi = 0; pi < n; pi++) {
        const phi = (pi / n) * Math.PI * 2 + ti * 0.4;
        const x = Math.sin(theta) * Math.cos(phi), y = Math.cos(theta), z = Math.sin(theta) * Math.sin(phi);
        if (z > 0.35 && y < 0.55) continue; // 不要蓋到臉
        head.add(mesh(sphere(0.085, 12, 8), hair, [x * 0.285, y * 0.27 + 0.02, z * 0.27 - 0.02]));
      }
    }
    head.add(mesh(sphere(0.27, 24, 16), hair, [0, -0.02, -0.07], [1.08, 0.95, 0.9]));
  } else {
    head.add(mesh(new THREE.SphereGeometry(0.29, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, [0, 0.02, -0.01], [1.06, 1, 1], [-0.25, 0, 0]));
    head.add(mesh(sphere(0.285, 32, 16), hair, [0, 0.0, -0.06], [1.04, 0.95, 0.92]));
  }
  addBangs(head, c, hair);

  if (s === 'long') {
    head.add(mesh(capsule(0.2, 0.22), hair, [0, -0.25, -0.11], [1.25, 1, 0.6]));
    for (const side of [-1, 1]) head.add(mesh(capsule(0.06, 0.2), hair, [side * 0.24, -0.16, -0.01]));
  } else if (s === 'bob') {
    head.add(mesh(sphere(0.29, 32, 16), hair, [0, -0.06, -0.04], [1.12, 0.72, 0.85]));
  } else if (s === 'ponytail') {
    head.add(mesh(sphere(0.05), mat(shade(c.hair, 0.2)), [0, 0.13, -0.27]));
    head.add(mesh(capsule(0.065, 0.2), hair, [0, -0.04, -0.31], [1, 1, 0.85], [0.25, 0, 0]));
  } else if (s === 'bun') {
    head.add(mesh(sphere(0.11), hair, [0, 0.31, -0.06]));
  } else if (s === 'pigtails') {
    for (const side of [-1, 1]) head.add(mesh(capsule(0.07, 0.14), hair, [side * 0.3, -0.08, -0.05], [1, 1, 1], [0, 0, side * 0.35]));
  } else if (s === 'spiky') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      head.add(mesh(new THREE.ConeGeometry(0.06, 0.16, 8), hair, [Math.cos(a) * 0.14, 0.27, Math.sin(a) * 0.14 - 0.03], [1, 1, 1],
        [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]));
    }
  }
}

function addBangs(head, c, hair) {
  const b = c.bangs;
  const z = x => 0.205 - Math.abs(x) * 0.18;
  if (b === 'full') {
    for (let i = -2; i <= 2; i++) {
      const x = i * 0.085;
      head.add(mesh(sphere(0.075, 12, 8), hair, [x, 0.13 - Math.abs(i) * 0.02, 0.2 - Math.abs(i) * 0.03], [1.1, 0.75, 0.7]));
    }
  } else if (b === 'wispy') {
    for (let i = -3; i <= 3; i++) {
      const x = i * 0.058;
      head.add(mesh(sphere(0.042, 10, 8), hair, [x, 0.115 - Math.abs(i) * 0.008 + (i % 2) * 0.01, z(x) + 0.01], [1, 1.5, 0.5]));
    }
  } else if (b === 'side') {
    for (let i = 0; i < 5; i++) {
      const x = -0.17 + i * 0.085;
      head.add(mesh(sphere(0.08, 12, 8), hair, [x, 0.17 - i * 0.022, z(x)], [1.3, 0.7, 0.7], [0, 0, -0.35]));
    }
  } else if (b === 'middle') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const x = side * (0.07 + i * 0.09);
        head.add(mesh(sphere(0.08, 12, 8), hair, [x, 0.15 - i * 0.03, z(x)], [1.25, 0.7, 0.7], [0, 0, side * 0.45]));
      }
    }
  }
}

function addEars(head, c, hair) {
  if (c.ears === 'none') return;
  const color = c.ears === 'fox' ? mat('#ff922b') : hair;
  const inner = mat('#ffc9d6');
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(side * 0.17, 0.22, -0.02);
    g.rotation.z = -side * 0.35;
    if (c.ears === 'bear') {
      g.add(mesh(sphere(0.075), color, [0, 0, 0], [1, 1, 0.6]));
      g.add(mesh(sphere(0.045), inner, [0, 0, 0.03], [1, 1, 0.4]));
    } else if (c.ears === 'bunny') {
      g.add(mesh(capsule(0.05, 0.2), color, [0, 0.13, 0], [1, 1, 0.5]));
      g.add(mesh(capsule(0.028, 0.16), inner, [0, 0.13, 0.022], [1, 1, 0.3]));
    } else {
      const big = c.ears === 'fox' ? 1.25 : 1;
      g.add(mesh(new THREE.ConeGeometry(0.07 * big, 0.14 * big, 4), color, [0, 0.05, 0], [1, 1, 0.5]));
      g.add(mesh(new THREE.ConeGeometry(0.04 * big, 0.09 * big, 4), inner, [0, 0.04, 0.02], [1, 1, 0.3]));
    }
    head.add(g);
  }
}

function addHat(head, c) {
  if (c.hat === 'none') return;
  const m = mat(c.hatColor);
  if (c.hat === 'cap') {
    head.add(mesh(new THREE.SphereGeometry(0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), m, [0, 0.06, 0], [1.05, 0.85, 1.02]));
    head.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.018, 24, 1, false, -Math.PI / 2, Math.PI), m, [0, 0.07, 0.2], [1, 1, 1.1]));
  } else if (c.hat === 'beanie') {
    head.add(mesh(new THREE.SphereGeometry(0.305, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), m, [0, 0.04, 0], [1.05, 1, 1]));
    head.add(mesh(new THREE.TorusGeometry(0.29, 0.035, 8, 32), mat(shade(c.hatColor, -0.12)), [0, 0.02, 0], [1.05, 1, 1], [Math.PI / 2, 0, 0]));
    head.add(mesh(sphere(0.07), mat('#ffffff'), [0, 0.34, 0]));
  } else if (c.hat === 'straw') {
    head.add(mesh(cyl(0.5, 0.5, 0.02, 32), m, [0, 0.16, 0]));
    head.add(mesh(cyl(0.22, 0.26, 0.17, 24), m, [0, 0.24, 0]));
    head.add(mesh(cyl(0.262, 0.262, 0.04, 24), mat('#e03131'), [0, 0.18, 0]));
  } else if (c.hat === 'beret') {
    head.add(mesh(sphere(0.29), m, [0.04, 0.2, -0.02], [1.1, 0.35, 1.1], [0, 0, -0.25]));
    head.add(mesh(cyl(0.012, 0.012, 0.05, 6), m, [0.02, 0.32, -0.02]));
  }
}

function addGlasses(head, c) {
  if (c.glasses === 'none') return;
  const frame = mat(c.glasses === 'sun' ? '#1a1a1a' : '#6b4a2b');
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(side * 0.095, -0.01, 0.258);
    g.rotation.y = side * 0.3;
    g.add(mesh(new THREE.TorusGeometry(0.055, 0.009, 6, 24), frame));
    if (c.glasses === 'sun') {
      g.add(mesh(new THREE.CircleGeometry(0.055, 24), new THREE.MeshBasicMaterial({ color: '#111', transparent: true, opacity: 0.85 })));
    }
    head.add(g);
  }
  head.add(mesh(box(0.06, 0.012, 0.012), frame, [0, 0, 0.272]));
}

function addAccessories(body, c) {
  if (c.backpack) {
    const bp = mat(c.backpackColor);
    body.add(mesh(box(0.26, 0.26, 0.12), bp, [0, 0.4, -0.18]));
    body.add(mesh(box(0.2, 0.1, 0.04), mat(shade(c.backpackColor, -0.15)), [0, 0.34, -0.25]));
    body.add(mesh(sphere(0.13, 16, 8), bp, [0, 0.53, -0.18], [1, 0.35, 0.46]));
    for (const side of [-1, 1]) {
      body.add(mesh(box(0.03, 0.24, 0.02), mat(shade(c.backpackColor, -0.2)), [side * 0.08, 0.41, 0.135]));
    }
  }
  if (c.camera) {
    const strap = mat('#343a40');
    body.add(mesh(new THREE.TorusGeometry(0.12, 0.009, 6, 24, Math.PI), strap, [0, 0.5, 0.135], [0.85, 1, 1], [0, 0, Math.PI]));
    body.add(mesh(box(0.11, 0.075, 0.05), mat('#495057'), [0, 0.38, 0.16]));
    body.add(mesh(cyl(0.025, 0.025, 0.03, 16), mat('#212529'), [0, 0.38, 0.195], [1, 1, 1], [Math.PI / 2, 0, 0]));
    body.add(mesh(sphere(0.012, 8, 6), mat('#74c0fc'), [0, 0.38, 0.21]));
  }
}

function shade(hex, amt) {
  const col = new THREE.Color(hex);
  const hsl = {};
  col.getHSL(hsl);
  col.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return '#' + col.getHexString();
}

export function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb0c4de, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(1.5, 3, 2);
  scene.add(sun);
}

export function disposeTree(obj) {
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose?.();
  });
}
