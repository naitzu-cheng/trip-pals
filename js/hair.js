// 雕塑感頭髮：一層貼著頭型的「髮殼」，再依髮型剪出瀏海線、髮尾，加上馬尾 / 丸子等組件，表面刻髮絲紋路
// 單位和頭部零件相同（頭半徑約 0.27，頭中心為原點，臉朝 +Z）
import * as THREE from 'three';
import { headSDF, ellipsoid, roundCone, smin, polygonize, buildGeometry } from './sdf.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 瀏海下緣（y 值，隨 x 變化）
const BANG_LINE = {
  full: x => 0.045 + x * x * 0.4,                          // 齊瀏海：平直，兩邊微微往下彎
  wispy: x => 0.055 + x * x * 0.4,                         // 空氣瀏海：同上，但有縫隙
  middle: x => Math.max(0.0, 0.21 - Math.abs(x) * 0.95),   // 中分八字瀏海
  side: x => clamp(0.13 + x * 0.42, 0.03, 0.22),           // 旁分斜瀏海
  none: () => 0.2,                                         // 露額頭
};

// 髮尾高度：依前後位置（z）決定，back = 後腦，front = 臉側
const HEM = {
  short: { back: -0.15, front: -0.01 },
  bob: { back: -0.24, front: -0.22 },
  long: { back: -0.62, front: -0.5 },
  wavy: { back: -0.62, front: -0.5 },
};

const TAILS = {
  ponytail: [[V(0, 0.2, -0.27), V(0, -0.02, -0.41), V(0.01, -0.36, -0.37), 0.085, 0.068, 0.03]],
  lowtail: [[V(0, -0.1, -0.27), V(0.01, -0.22, -0.32), V(0.02, -0.38, -0.29), 0.08, 0.068, 0.014]],
  sidetail: [[V(0.24, 0.12, -0.13), V(0.33, -0.05, -0.15), V(0.34, -0.33, -0.12), 0.085, 0.066, 0.03]],
  pigtails: [-1, 1].map(s => [V(s * 0.21, -0.11, -0.18), V(s * 0.25, -0.2, -0.2), V(s * 0.25, -0.34, -0.17), 0.075, 0.062, 0.012]),
};
// 麻花辮：一串由大到小的球
const BRAIDS = [-1, 1].map(s => Array.from({ length: 5 }, (_, i) => [V(s * (0.24 + i * 0.006), -0.1 - i * 0.068, -0.13 + i * 0.012), 0.058 - i * 0.005]));

// 泡泡捲：在頭的外圍撒一圈大小不一的球（固定亂數，每次都一樣）
const CURLS = (() => {
  const out = [];
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    const d = V(r * Math.cos(th), u, r * Math.sin(th));
    if (d.y < -0.55) continue;
    if (d.z > 0.45 && d.y < 0.42) continue; // 臉露出來
    out.push([V(d.x * 0.31, d.y * 0.29 + 0.03, d.z * 0.3 - 0.01), 0.07 + rnd() * 0.03]);
  }
  return out;
})();

const BUNS = {
  bun: [[V(0, 0.29, -0.12), 0.1]],
  buns: [[V(0.19, 0.24, -0.06), 0.088], [V(-0.19, 0.24, -0.06), 0.088]],
};

// 髮束：繞著頭一圈分成一撮一撮（中間圓鼓、髮束之間凹下去），正前方剛好是一撮
const CLUMPS = 15;
let SWEEP = null; // 由 makeHairSDF 設定目前的瀏海樣式
export function clump(x, y, z) {
  let a = Math.atan2(x, z) + Math.sin(y * 5) * 0.06;
  if (SWEEP && z > 0) {
    const front = clamp(z / 0.15, 0, 1), down = Math.max(0, 0.28 - y);
    if (SWEEP === 'middle') a += Math.sign(x) * down * 2.2 * front;
    if (SWEEP === 'side') a += down * 1.7 * front;
  }
  const fade = clamp((Math.hypot(x, z) - 0.05) / 0.15, 0, 1); // 頭頂髮旋附近漸漸平滑
  const th = (a * CLUMPS) / 2 + 0.35 * Math.sin(a * 3); // 髮束粗細不完全一樣
  const ridge = 1 - Math.exp(-(Math.cos(th) ** 2) * 2.6); // 凹縫是圓滑的，不是尖 V
  return 1 - fade * (1 - ridge);
}
function grooves(x, y, z, depth) {
  return depth * clump(x, y, z);
}

function tailSDF(x, y, z, [a, m, b, r1, r2, r3]) {
  // 兩段圓錐組成彎彎的馬尾
  return smin(roundCone(x, y, z, a, m, r1, r2), roundCone(x, y, z, m, b, r2, r3), 0.03);
}

// 耳朵的位置（要和 avatar.js 一致）：短髮類會在這裡剪出缺口讓耳朵露出來
export const EAR = { x: 0.285, y: -0.07, z: -0.015 };
const EAR_CUT = ['short', 'ponytail', 'lowtail', 'sidetail', 'pigtails', 'buns', 'bun', 'braids', 'messy', 'spiky'];
const SIDE_LOCKS = ['short', 'ponytail', 'lowtail', 'sidetail', 'pigtails', 'buns', 'bun', 'braids'];

export function makeHairSDF(c) {
  SWEEP = c.bangs;
  const style = ['buns', 'bun', 'braids'].includes(c.hairStyle) || TAILS[c.hairStyle] ? 'short' : c.hairStyle;
  const hem = HEM[style] || HEM.short;
  const bang = BANG_LINE[c.bangs] || BANG_LINE.full;
  const hatted = ['fluffy', 'beanie', 'hood', 'cap'].includes(c.hat);
  const T = hatted ? 0.012 : 0.028;
  const tails = (TAILS[c.hairStyle] || []).map(t => {
    if (hatted || c.hat === 'beret' || c.hat === 'straw') {
      if (c.hairStyle === 'ponytail') return [V(0, 0.02, -0.29), V(0, -0.12, -0.38), V(0.01, -0.4, -0.33), 0.08, 0.066, 0.025];
    }
    return t;
  });
  const buns = BUNS[c.hairStyle] || [];
  const long = style === 'long' || style === 'wavy', bob = style === 'bob';

  return (x, y, z) => {
    const dh = headSDF(x, y, z);
    // 1. 髮殼（貼頭型），表面刻紋路
    let hair = dh - T - grooves(x, y, z, 0.011);
    // 2. 鮑伯 / 長髮：外面再包一層垂直落下的頭髮
    if (bob) hair = smin(hair, ellipsoid(x, y, z, 0, -0.03, -0.02, 0.335, 0.31, 0.315) - grooves(x, y, z, 0.012), 0.04);
    if (long) {
      const wave = style === 'wavy' ? Math.sin(y * 28) * 0.018 : 0;
      hair = smin(hair, ellipsoid(x, y, z, 0, -0.16, -0.08, 0.33 + wave, 0.5, 0.27) - grooves(x, y, z, 0.012), 0.05);
    }
    // 3. 剪掉頭的內部
    hair = Math.max(hair, -(dh - 0.003));
    // 4. 髮尾：越往後越長
    const f = clamp((z + 0.2) / 0.4, 0, 1);
    const hemY = hem.back + (hem.front - hem.back) * f;
    hair = Math.max(hair, hemY - y);
    // 5. 臉的開口：正面、瀏海線以下
    const faceW = bob || long ? 0.215 : 0.245;
    const tips = c.bangs === 'none' ? 0 : 0.026 * clump(x, 0.1, 0.27);
    const opening = Math.max(y - (bang(x) - tips), Math.max(0.03 - z, Math.abs(x) - faceW));
    hair = Math.max(hair, -opening);
    // 5b. 耳朵缺口（短髮類）
    if (EAR_CUT.includes(c.hairStyle)) {
      const ex = Math.abs(x) - EAR.x;
      hair = Math.max(hair, -ellipsoid(ex, y, z, 0, EAR.y + 0.005, EAR.z, 0.085, 0.095, 0.075));
    }
    // 5c. 鬢角：耳朵前面垂下一小撮
    if (SIDE_LOCKS.includes(c.hairStyle) && c.hat !== 'hood') {
      const s2 = x >= 0 ? 1 : -1;
      const lock = roundCone(x, y, z, V(s2 * 0.235, 0.04, 0.085), V(s2 * 0.25, -0.13, 0.1), 0.045, 0.02);
      hair = smin(hair, lock - grooves(x, y, z, 0.006), 0.02);
    }
    // 6. 空氣瀏海的縫隙
    if (c.bangs === 'wispy' && z > 0.1) {
      const slit = Math.abs(((x * 11 + 50.25) % 1) - 0.5) / 11 - 0.006;
      hair = Math.max(hair, -Math.max(slit, Math.max(y - 0.16, bang(x) - y)));
    }
    // 7. 中分：頭頂前方的分線
    if (c.bangs === 'middle' && z > 0) hair = Math.max(hair, -Math.max(Math.abs(x) - 0.006, 0.1 - y));
    // 8. 組件：馬尾、丸子
    for (const t of tails) hair = smin(hair, tailSDF(x, y, z, t) - grooves(x - t[1].x, y, z - t[1].z, 0.01), 0.035);
    for (const [p, r] of buns) {
      const dx = x - p.x, dy = y - p.y, dz = z - p.z;
      hair = smin(hair, Math.hypot(dx, dy, dz) - r - 0.006 * Math.cos(Math.atan2(dx, dz) * 9 + dy * 30), 0.03);
    }
    if (c.hairStyle === 'braids') {
      for (const braid of BRAIDS) for (const [p, r] of braid) hair = smin(hair, Math.hypot(x - p.x, y - p.y, z - p.z) - r, 0.012);
    }
    if (c.hairStyle === 'curly' && !hatted) {
      let balls = 1;
      for (const [p, r] of CURLS) {
        const dx = x - p.x, dy = y - p.y, dz = z - p.z;
        if (Math.abs(dx) > r + 0.02 || Math.abs(dy) > r + 0.02 || Math.abs(dz) > r + 0.02) continue;
        balls = smin(balls, Math.sqrt(dx * dx + dy * dy + dz * dz) - r, 0.012);
      }
      hair = smin(Math.max(hair, -opening), Math.max(balls, -(dh - 0.003)), 0.01);
    }
    return hair;
  };
}

const CACHE = new Map();
export function hairGeometry(c) {
  if (c.hairStyle === 'bald') return null;
  const hatted = ['fluffy', 'beanie', 'hood', 'cap'].includes(c.hat);
  const key = [c.hairStyle, c.bangs, hatted].join('|');
  if (CACHE.has(key)) return CACHE.get(key);
  const sdf = makeHairSDF(c);
  const low = TAILS[c.hairStyle] || ['long', 'wavy', 'braids'].includes(c.hairStyle) ? -0.66 : -0.3;
  const flat = polygonize(sdf, V(-0.48, low, -0.56), V(0.48, 0.44, 0.38), 0.0125);
  const { P, N, index } = buildGeometry(sdf, flat);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  const col = new Float32Array(P.length);
  for (let i = 0; i < P.length; i += 3) {
    let k = 0.66 + 0.34 * clump(P[i], P[i + 1], P[i + 2]);
    if (N[i + 1] < -0.4) k *= 0.82; // 髮尾內側、下巴下方較暗
    col[i] = col[i + 1] = col[i + 2] = k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(Array.from(index));
  g.userData.shared = true;
  CACHE.set(key, g);
  return g;
}

// 髮圈 / 髮飾的位置（給 avatar.js 加小裝飾用）
export function tieSpots(c) {
  if (c.hairStyle === 'braids') return BRAIDS.map(b => ({ p: b[b.length - 1][0].clone().add(V(0, -0.03, 0)), dir: V(0, 1, 0), r: 0.03 }));
  const hatted = ['fluffy', 'beanie', 'hood', 'cap', 'beret', 'straw'].includes(c.hat);
  return (TAILS[c.hairStyle] || []).map(t => {
    if (hatted && c.hairStyle === 'ponytail') t = [V(0, 0.02, -0.29), V(0, -0.12, -0.38)];
    const dir = t[1].clone().sub(t[0]).normalize();
    // 髮圈綁在離頭皮一點點的地方
    return { p: t[0].clone().addScaledVector(dir, 0.06), dir, r: 0.058 };
  });
}
