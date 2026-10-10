// Q 版 3D 角色：全部用基本幾何體組成，不需要外部模型檔
// 座標：Y 朝上、腳底在 y=0、臉朝 +Z，總高約 1
import * as THREE from 'three';

export const DEFAULT_AVATAR = {
  skin: '#ffd9b8',
  hair: '#5b3a29',
  hairStyle: 'short',
  eyes: 'sparkle',
  blush: true,
  top: '#ff8f8f',
  topStyle: 'tee',
  bottom: '#5c7cfa',
  shoes: '#ffffff',
  hat: 'none',
  hatColor: '#ffd43b',
  ears: 'none',
  glasses: 'none',
  backpack: true,
  backpackColor: '#69db7c',
};

export const OPTIONS = {
  hairStyle: [['short', '短髮'], ['long', '長髮'], ['bun', '丸子頭'], ['pigtails', '雙馬尾'], ['spiky', '刺蝟頭'], ['bald', '光頭']],
  eyes: [['sparkle', '閃亮'], ['dot', '豆豆眼'], ['happy', '笑眼'], ['sleepy', '瞇瞇眼']],
  topStyle: [['tee', 'T 恤'], ['hoodie', '帽T'], ['dress', '洋裝']],
  hat: [['none', '無'], ['cap', '棒球帽'], ['beanie', '毛帽'], ['straw', '草帽'], ['beret', '貝雷帽']],
  ears: [['none', '無'], ['cat', '貓耳'], ['bear', '熊耳'], ['bunny', '兔耳'], ['fox', '狐狸耳']],
  glasses: [['none', '無'], ['round', '圓框'], ['sun', '墨鏡']],
};

export const PALETTE = {
  skin: ['#ffe8d6', '#ffd9b8', '#f1c27d', '#d79f73', '#a0714f', '#6b4630', '#ffffff', '#c7ecc9', '#bde0fe'],
  hair: ['#1f1f1f', '#5b3a29', '#a0522d', '#e8b04a', '#f4e1a1', '#ff8fab', '#9775fa', '#4dabf7', '#ffffff', '#ff6b6b'],
  top: ['#ff8f8f', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac', '#ffffff', '#343a40', '#ff922b'],
  bottom: ['#5c7cfa', '#343a40', '#868e96', '#e9ecef', '#c9a227', '#2b8a3e', '#c2255c', '#a5d8ff'],
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

function mesh(geo, material, [x = 0, y = 0, z = 0] = [], [sx = 1, sy = 1, sz = 1] = []) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

const sphere = (r, w = 24, h = 16) => new THREE.SphereGeometry(r, w, h);
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 12);

export function buildAvatar(cfg = {}) {
  const c = { ...DEFAULT_AVATAR, ...cfg };
  const root = new THREE.Group();
  const body = new THREE.Group(); // 走路時上下彈跳的部分
  root.add(body);

  const skin = mat(c.skin), hair = mat(c.hair), top = mat(c.top), bottom = mat(c.bottom), shoe = mat(c.shoes);
  const dark = mat('#2b2b2b');

  // 影子
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.003;
  root.add(shadow);

  // 腿（以髖關節為軸心）
  const legs = [-1, 1].map(side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.085, 0.24, 0);
    pivot.add(mesh(capsule(0.06, 0.12), bottom, [0, -0.1, 0]));
    pivot.add(mesh(sphere(0.075), shoe, [0, -0.2, 0.025], [1, 0.6, 1.35]));
    body.add(pivot);
    return pivot;
  });

  // 身體
  if (c.topStyle === 'dress') {
    body.add(mesh(new THREE.CylinderGeometry(0.13, 0.25, 0.3, 20), top, [0, 0.36, 0]));
  } else {
    body.add(mesh(capsule(0.16, 0.1), top, [0, 0.37, 0], [1, 1, 0.85]));
    body.add(mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.07, 20), bottom, [0, 0.27, 0], [1, 1, 0.85]));
    if (c.topStyle === 'hoodie') {
      body.add(mesh(new THREE.TorusGeometry(0.11, 0.045, 8, 20), top, [0, 0.5, -0.06], [1, 0.7, 1]));
      body.add(mesh(new THREE.BoxGeometry(0.16, 0.06, 0.02), mat(shade(c.top, -0.12)), [0, 0.33, 0.14]));
    }
  }

  // 手臂（以肩膀為軸心）
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.18, 0.47, 0);
    pivot.rotation.z = side * 0.25;
    pivot.add(mesh(capsule(0.048, 0.1), top, [0, -0.08, 0]));
    pivot.add(mesh(sphere(0.055), skin, [0, -0.18, 0]));
    body.add(pivot);
    return pivot;
  });

  // 頭
  const head = new THREE.Group();
  head.position.y = 0.74;
  body.add(head);
  head.add(mesh(sphere(0.27, 32, 24), skin, [0, 0, 0], [1.05, 0.95, 0.95]));

  // 眼睛
  const eyeGroup = new THREE.Group();
  head.add(eyeGroup);
  const eyes = [-1, 1].map(side => {
    const g = new THREE.Group();
    g.position.set(side * 0.095, -0.01, 0.235);
    g.rotation.y = side * 0.3;
    if (c.eyes === 'happy') {
      g.add(mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 16, Math.PI), dark));
    } else if (c.eyes === 'sleepy') {
      g.add(mesh(new THREE.BoxGeometry(0.07, 0.014, 0.01), dark));
    } else if (c.eyes === 'dot') {
      g.add(mesh(sphere(0.028), dark, [0, 0, 0], [1, 1.2, 0.5]));
    } else {
      g.add(mesh(sphere(0.045), dark, [0, 0, 0], [0.85, 1.15, 0.45]));
      g.add(mesh(sphere(0.015), mat('#ffffff'), [0.013, 0.02, 0.018]));
    }
    eyeGroup.add(g);
    return g;
  });

  // 嘴巴 + 腮紅
  const mouth = mesh(new THREE.TorusGeometry(0.03, 0.009, 6, 16, Math.PI), mat('#a33b3b'), [0, -0.085, 0.245]);
  mouth.rotation.z = Math.PI;
  head.add(mouth);
  if (c.blush) {
    const pink = new THREE.MeshBasicMaterial({ color: '#ff8fa3', transparent: true, opacity: 0.55 });
    for (const side of [-1, 1]) {
      const b = mesh(sphere(0.04), pink, [side * 0.16, -0.065, 0.2], [1.2, 0.6, 0.4]);
      b.rotation.y = side * 0.6;
      head.add(b);
    }
  }

  // 頭髮
  addHair(head, c, hair);

  // 動物耳朵
  addEars(head, c, hair, skin);

  // 帽子
  addHat(head, c);

  // 眼鏡
  if (c.glasses !== 'none') {
    const frame = mat(c.glasses === 'sun' ? '#1a1a1a' : '#6b4a2b');
    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(side * 0.095, -0.01, 0.255);
      g.rotation.y = side * 0.3;
      g.add(mesh(new THREE.TorusGeometry(0.055, 0.009, 6, 24), frame));
      if (c.glasses === 'sun') {
        g.add(mesh(new THREE.CircleGeometry(0.055, 24), new THREE.MeshBasicMaterial({ color: '#111', transparent: true, opacity: 0.85 })));
      }
      head.add(g);
    }
    head.add(mesh(new THREE.BoxGeometry(0.06, 0.012, 0.012), frame, [0, 0, 0.27]));
  }

  // 背包
  if (c.backpack) {
    const bp = mat(c.backpackColor);
    body.add(mesh(new THREE.BoxGeometry(0.26, 0.26, 0.12), bp, [0, 0.4, -0.18]));
    body.add(mesh(new THREE.BoxGeometry(0.2, 0.1, 0.04), mat(shade(c.backpackColor, -0.15)), [0, 0.34, -0.25]));
    body.add(mesh(sphere(0.13, 16, 8), bp, [0, 0.53, -0.18], [1, 0.35, 0.46]));
    for (const side of [-1, 1]) {
      body.add(mesh(new THREE.BoxGeometry(0.03, 0.24, 0.02), mat(shade(c.backpackColor, -0.2)), [side * 0.08, 0.41, 0.135]));
    }
  }

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

function addHair(head, c, hair) {
  const s = c.hairStyle;
  if (s === 'bald') return;
  // 頭頂 + 後腦
  const cap = mesh(new THREE.SphereGeometry(0.29, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, [0, 0.02, -0.01], [1.06, 1, 1]);
  cap.rotation.x = -0.25;
  head.add(cap);
  head.add(mesh(sphere(0.285, 32, 16), hair, [0, 0.0, -0.06], [1.04, 0.95, 0.92]));
  // 瀏海
  for (let i = -2; i <= 2; i++) {
    const b = mesh(sphere(0.075, 12, 8), hair, [i * 0.085, 0.13 - Math.abs(i) * 0.02, 0.2 - Math.abs(i) * 0.03], [1.1, 0.75, 0.7]);
    head.add(b);
  }
  if (s === 'long') {
    head.add(mesh(capsule(0.2, 0.22), hair, [0, -0.25, -0.11], [1.25, 1, 0.6]));
  } else if (s === 'bun') {
    head.add(mesh(sphere(0.11), hair, [0, 0.31, -0.06]));
  } else if (s === 'pigtails') {
    for (const side of [-1, 1]) {
      const p = mesh(capsule(0.07, 0.14), hair, [side * 0.3, -0.08, -0.05]);
      p.rotation.z = side * 0.35;
      head.add(p);
    }
  } else if (s === 'spiky') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const sp = mesh(new THREE.ConeGeometry(0.06, 0.16, 8), hair, [Math.cos(a) * 0.14, 0.27, Math.sin(a) * 0.14 - 0.03]);
      sp.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      head.add(sp);
    }
  }
}

function addEars(head, c, hair, skin) {
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
    const rim = mesh(new THREE.TorusGeometry(0.29, 0.035, 8, 32), mat(shade(c.hatColor, -0.12)), [0, 0.02, 0], [1.05, 1, 1]);
    rim.rotation.x = Math.PI / 2;
    head.add(rim);
    head.add(mesh(sphere(0.07), mat('#ffffff'), [0, 0.34, 0]));
  } else if (c.hat === 'straw') {
    head.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 32), m, [0, 0.16, 0]));
    head.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.17, 24), m, [0, 0.24, 0]));
    head.add(mesh(new THREE.CylinderGeometry(0.262, 0.262, 0.04, 24), mat('#e03131'), [0, 0.18, 0]));
  } else if (c.hat === 'beret') {
    const b = mesh(sphere(0.29), m, [0.04, 0.2, -0.02], [1.1, 0.35, 1.1]);
    b.rotation.z = -0.25;
    head.add(b);
    head.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), m, [0.02, 0.32, -0.02]));
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
