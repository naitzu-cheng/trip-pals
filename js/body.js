// 有骨架的 Q 版身體
//   1. 用「距離場」把身體各部位（骨盆、胸、手腳…）平滑地融合在一起，再用 Marching Cubes 轉成一整塊光滑的網格
//   2. 依照每個頂點離哪根骨頭最近，算出蒙皮權重 → 骨頭轉動時皮膚會自然彎曲
//   3. 衣服 = 把身體某個區域往外推一點點的「殼」，共用同一副骨架，所以會跟著走路
// 身體只在第一次使用時計算，之後所有角色共用（換衣服只是換顏色 / 換殼）
import * as THREE from 'three';
import { edgeTable, triTable } from 'three/addons/objects/MarchingCubes.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

/* ---------------- 骨架（靜止姿勢的世界座標，二頭身比例） ---------------- */
// [名稱, 父骨頭, 位置]
const BONES = [
  ['hips', null, V(0, 0.2)],
  ['spine', 'hips', V(0, 0.26)],
  ['chest', 'spine', V(0, 0.32)],
  ['neck', 'chest', V(0, 0.385)],
  ['head', 'neck', V(0, 0.41)],
  ...[1, -1].flatMap(s => {
    const n = s > 0 ? 'L' : 'R';
    return [
      ['upperLeg' + n, 'hips', V(s * 0.046, 0.18)],
      ['lowerLeg' + n, 'upperLeg' + n, V(s * 0.049, 0.098, 0.004)],
      ['foot' + n, 'lowerLeg' + n, V(s * 0.051, 0.034, -0.003)],
      ['upperArm' + n, 'chest', V(s * 0.078, 0.368)],
      ['lowerArm' + n, 'upperArm' + n, V(s * 0.118, 0.3)],
      ['hand' + n, 'lowerArm' + n, V(s * 0.146, 0.245)],
    ];
  }),
];

// 每根骨頭負責的線段（用來算權重）
const SEGMENTS = [
  ['hips', V(0, 0.15), V(0, 0.23)],
  ['spine', V(0, 0.23), V(0, 0.29)],
  ['chest', V(0, 0.29), V(0, 0.37)],
  ['chest', V(-0.055, 0.368), V(0.055, 0.368)],
  ['neck', V(0, 0.37), V(0, 0.44)],
  ...[1, -1].flatMap(s => {
    const n = s > 0 ? 'L' : 'R';
    return [
      ['upperLeg' + n, V(s * 0.046, 0.165), V(s * 0.049, 0.1, 0.004)],
      ['lowerLeg' + n, V(s * 0.049, 0.098, 0.004), V(s * 0.051, 0.038, -0.003)],
      ['foot' + n, V(s * 0.051, 0.03, -0.003), V(s * 0.051, 0.01, 0.055)],
      ['upperArm' + n, V(s * 0.082, 0.365), V(s * 0.118, 0.3)],
      ['lowerArm' + n, V(s * 0.118, 0.3), V(s * 0.146, 0.245)],
      ['hand' + n, V(s * 0.146, 0.245), V(s * 0.162, 0.205)],
    ];
  }),
];
const BONE_INDEX = Object.fromEntries(BONES.map(([n], i) => [n, i]));

/* ---------------- 距離場 ---------------- */
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function ellipsoid(px, py, pz, cx, cy, cz, rx, ry, rz) {
  const x = (px - cx) / rx, y = (py - cy) / ry, z = (pz - cz) / rz;
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const k1 = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2);
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
// 兩端半徑不同的膠囊（iq 的 round cone）
function roundCone(px, py, pz, a, b, r1, r2) {
  const bax = b.x - a.x, bay = b.y - a.y, baz = b.z - a.z;
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - a.x, pay = py - a.y, paz = pz - a.z;
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

function bodySDF(x, y, z) {
  // 小嬰兒般的身體：圓肚子、短胖腿、短手
  let t = ellipsoid(x, y, z, 0, 0.2, -0.004, 0.084, 0.064, 0.072);
  t = smin(t, ellipsoid(x, y, z, 0, 0.262, 0.01, 0.087, 0.074, 0.078), 0.05);
  t = smin(t, ellipsoid(x, y, z, 0, 0.33, 0, 0.078, 0.058, 0.064), 0.05);
  t = smin(t, roundCone(x, y, z, V(-0.062, 0.366), V(0.062, 0.366), 0.034, 0.034), 0.035);
  t = smin(t, roundCone(x, y, z, V(0, 0.36), V(0, 0.45), 0.03, 0.028), 0.02);
  const s = x >= 0 ? 1 : -1; // 左右對稱：只算靠近的那一側
  let leg = roundCone(x, y, z, V(s * 0.046, 0.18), V(s * 0.049, 0.098, 0.004), 0.045, 0.035);
  leg = smin(leg, roundCone(x, y, z, V(s * 0.049, 0.098, 0.004), V(s * 0.051, 0.034, -0.003), 0.035, 0.027), 0.02);
  leg = smin(leg, ellipsoid(x, y, z, s * 0.051, 0.018, 0.016, 0.03, 0.02, 0.042), 0.018);
  let arm = roundCone(x, y, z, V(s * 0.08, 0.367), V(s * 0.118, 0.3), 0.03, 0.024);
  arm = smin(arm, roundCone(x, y, z, V(s * 0.118, 0.3), V(s * 0.146, 0.245), 0.024, 0.02), 0.012);
  arm = smin(arm, ellipsoid(x, y, z, s * 0.155, 0.225, 0.004, 0.024, 0.028, 0.02), 0.014);
  t = smin(t, leg, 0.03);
  t = smin(t, arm, 0.022);
  return t;
}

// 頭：不是球！頭頂圓、兩頰鼓起、下巴小小的（麻糬臉）。單位沿用頭部零件（舊版球半徑 0.27）
function headSDF(x, y, z) {
  let t = ellipsoid(x, y, z, 0, 0.035, -0.015, 0.285, 0.26, 0.27);
  const s = x >= 0 ? 1 : -1;
  t = smin(t, ellipsoid(x, y, z, s * 0.12, -0.085, 0.065, 0.155, 0.135, 0.16), 0.09);
  t = smin(t, ellipsoid(x, y, z, 0, -0.125, 0.07, 0.15, 0.105, 0.145), 0.08);
  return t;
}

/* ---------------- Marching Cubes ---------------- */
const CORNERS = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

function polygonize(sdf, min, max, cell) {
  const nx = Math.ceil((max.x - min.x) / cell) + 1, ny = Math.ceil((max.y - min.y) / cell) + 1, nz = Math.ceil((max.z - min.z) / cell) + 1;
  const f = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    f[i + nx * (j + ny * k)] = sdf(min.x + i * cell, min.y + j * cell, min.z + k * cell);
  }
  const at = (i, j, k) => f[i + nx * (j + ny * k)];
  const pos = [];
  const vals = new Float32Array(8), ev = new Array(12);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let idx = 0;
    for (let c = 0; c < 8; c++) {
      vals[c] = at(i + CORNERS[c][0], j + CORNERS[c][1], k + CORNERS[c][2]);
      if (vals[c] < 0) idx |= 1 << c;
    }
    const bits = edgeTable[idx];
    if (!bits) continue;
    for (let e = 0; e < 12; e++) {
      if (!(bits & (1 << e))) continue;
      const [a, b] = EDGES[e], va = vals[a], vb = vals[b];
      const t = va / (va - vb);
      ev[e] = [
        min.x + (i + CORNERS[a][0] + (CORNERS[b][0] - CORNERS[a][0]) * t) * cell,
        min.y + (j + CORNERS[a][1] + (CORNERS[b][1] - CORNERS[a][1]) * t) * cell,
        min.z + (k + CORNERS[a][2] + (CORNERS[b][2] - CORNERS[a][2]) * t) * cell,
      ];
    }
    for (let t = idx * 16; triTable[t] !== -1; t += 3) {
      pos.push(...ev[triTable[t]], ...ev[triTable[t + 1]], ...ev[triTable[t + 2]]);
    }
  }
  return pos;
}

// 合併重複頂點 → 有索引的網格，法線用距離場的梯度（很平滑）
function buildGeometry(sdf, flat) {
  const map = new Map(), P = [], index = [];
  for (let i = 0; i < flat.length; i += 3) {
    const key = `${Math.round(flat[i] * 1e5)},${Math.round(flat[i + 1] * 1e5)},${Math.round(flat[i + 2] * 1e5)}`;
    let v = map.get(key);
    if (v === undefined) { v = P.length / 3; map.set(key, v); P.push(flat[i], flat[i + 1], flat[i + 2]); }
    index.push(v);
  }
  const N = new Float32Array(P.length), e = 0.002;
  for (let i = 0; i < P.length; i += 3) {
    const [x, y, z] = [P[i], P[i + 1], P[i + 2]];
    const g = V(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)).normalize();
    N[i] = g.x; N[i + 1] = g.y; N[i + 2] = g.z;
  }
  // 三角形方向要和法線一致（外面朝外）
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t], index[t + 1], index[t + 2]];
    const A = V(P[a * 3], P[a * 3 + 1], P[a * 3 + 2]), B = V(P[b * 3], P[b * 3 + 1], P[b * 3 + 2]), C = V(P[c * 3], P[c * 3 + 1], P[c * 3 + 2]);
    const fn = B.clone().sub(A).cross(C.clone().sub(A));
    if (fn.dot(V(N[a * 3], N[a * 3 + 1], N[a * 3 + 2])) < 0) { index[t + 1] = c; index[t + 2] = b; }
  }
  return { P: new Float32Array(P), N, index };
}

/* ---------------- 蒙皮權重 ---------------- */
function segDist(p, a, b) {
  const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  return { d: p.distanceTo(a.clone().addScaledVector(ab, t)), t };
}

function computeWeights(P) {
  const n = P.length / 3;
  const skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4);
  const dom = new Array(n), along = new Float32Array(n);
  const p = V(0, 0);
  for (let i = 0; i < n; i++) {
    p.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    const side = p.x > 0.025 ? 'L' : p.x < -0.025 ? 'R' : '';
    const best = new Map();
    for (const [bone, a, b] of SEGMENTS) {
      const last = bone[bone.length - 1];
      if ((last === 'L' || last === 'R') && side && last !== side) continue;
      const { d, t } = segDist(p, a, b);
      const w = 1 / Math.pow(d + 0.003, 6);
      const prev = best.get(bone);
      if (!prev || prev.w < w) best.set(bone, { w, t });
    }
    const top = [...best.entries()].sort((x, y) => y[1].w - x[1].w).slice(0, 4);
    const sum = top.reduce((s, [, v]) => s + v.w, 0);
    top.forEach(([bone, v], k) => { skinIndex[i * 4 + k] = BONE_INDEX[bone]; skinWeight[i * 4 + k] = v.w / sum; });
    dom[i] = top[0][0];
    along[i] = top[0][1].t;
  }
  return { skinIndex, skinWeight, dom, along };
}

/* ---------------- 共用的身體資料（只算一次） ---------------- */
let BASE = null;
export function bodyBase() {
  if (BASE) return BASE;
  const flat = polygonize(bodySDF, V(-0.2, -0.005, -0.095), V(0.2, 0.46, 0.11), 0.0055);
  const { P, N, index } = buildGeometry(bodySDF, flat);
  const W = computeWeights(P);
  BASE = { P, N, index, ...W, cache: new Map() };
  return BASE;
}

// 依區域取出身體的一部分、沿法線往外推 thickness → 衣服的殼
function shellGeometry(key, test, thickness) {
  const B = bodyBase();
  const ck = key + ':' + thickness;
  if (B.cache.has(ck)) return B.cache.get(ck);
  const n = B.P.length / 3, keep = new Uint8Array(n);
  const p = V(0, 0);
  for (let i = 0; i < n; i++) {
    p.set(B.P[i * 3], B.P[i * 3 + 1], B.P[i * 3 + 2]);
    keep[i] = test(B.dom[i], B.along[i], p) ? 1 : 0;
  }
  const index = [];
  for (let t = 0; t < B.index.length; t += 3) {
    const a = B.index[t], b = B.index[t + 1], c = B.index[t + 2];
    if (keep[a] + keep[b] + keep[c] >= 2) index.push(a, b, c);
  }
  const P = new Float32Array(B.P.length);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] = B.P[i * 3 + k] + B.N[i * 3 + k] * thickness;
  const g = makeSkinnedGeometry(P, B.N, index, B.skinIndex, B.skinWeight);
  B.cache.set(ck, g);
  return g;
}

function makeSkinnedGeometry(P, N, index, si, sw) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(index);
  g.userData.shared = true; // 多個角色共用，不要被 dispose
  return g;
}

/* ---------------- 衣服區域 ---------------- */
const isLeg = d => d.startsWith('upperLeg') || d.startsWith('lowerLeg') || d.startsWith('foot');
const isArm = d => d.startsWith('upperArm') || d.startsWith('lowerArm') || d.startsWith('hand');

export const REGIONS = {
  torso: (d, t, p) => (d === 'chest' || d === 'spine' || (d === 'hips' && p.y > 0.235)) && p.y < 0.39,
  torsoHigh: (d, t, p) => (d === 'chest' || d === 'spine' || (d === 'hips' && p.y > 0.235)) && p.y < 0.405,
  tube: (d, t, p) => (d === 'chest' || d === 'spine') && p.y > 0.29 && p.y < 0.35,
  sleeveShort: (d, t) => d.startsWith('upperArm') && t < 0.6,
  sleeveLong: (d, t) => d.startsWith('upperArm') || (d.startsWith('lowerArm') && t < 0.9),
  waist: (d, t, p) => (d === 'hips' || (d === 'spine' && p.y < 0.27)) && p.y < 0.27,
  brief: (d, t, p) => (d === 'hips' && p.y < 0.235) || (d.startsWith('upperLeg') && t < 0.15),
  shorts: (d, t) => d.startsWith('upperLeg') && t < 0.55,
  pants: (d, t) => d.startsWith('upperLeg') || (d.startsWith('lowerLeg') && t < 0.9),
  socks: (d, t) => (d.startsWith('lowerLeg') && t > 0.72) || d.startsWith('foot'),
  knee: (d, t) => (d.startsWith('lowerLeg') && t > 0.12) || d.startsWith('foot'),
  tights: (d, t, p) => isLeg(d) || (d === 'hips' && p.y < 0.235),
};

export function shell(region, thickness) {
  return shellGeometry(region, REGIONS[region], thickness);
}

export function bodyGeometry() {
  const B = bodyBase();
  if (!B.body) B.body = makeSkinnedGeometry(B.P, B.N, Array.from(B.index), B.skinIndex, B.skinWeight);
  return B.body;
}

/* ---------------- 頭（麻糬臉） ---------------- */
// 臉部貼圖的範圍（和 avatar.js 的貼圖畫法一致）：水平 140°、垂直 70°
const FACE_PHI = (140 * Math.PI) / 180, FACE_THETA = (70 * Math.PI) / 180;
let HEAD = null;
export function headGeometries() {
  if (HEAD) return HEAD;
  const flat = polygonize(headSDF, V(-0.33, -0.28, -0.32), V(0.33, 0.33, 0.33), 0.0115);
  const { P, N, index } = buildGeometry(headSDF, flat);
  const head = new THREE.BufferGeometry();
  head.setAttribute('position', new THREE.BufferAttribute(P, 3));
  head.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  head.setIndex(Array.from(index));
  head.userData.shared = true;

  // 臉：同一個頭型稍微往外推一點，依「從頭中心看出去的角度」算 UV，只保留正面
  const n = P.length / 3, uv = new Float32Array(n * 2), ok = new Uint8Array(n), FP = new Float32Array(P.length);
  const d = V(0, 0);
  for (let i = 0; i < n; i++) {
    d.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).normalize();
    const theta = Math.acos(Math.max(-1, Math.min(1, d.y))), phi = Math.atan2(d.z, -d.x);
    const u = (phi - (Math.PI / 2 - FACE_PHI / 2)) / FACE_PHI, v = 1 - (theta - (Math.PI / 2 - FACE_THETA / 2)) / FACE_THETA;
    uv[i * 2] = u; uv[i * 2 + 1] = v;
    ok[i] = u > -0.02 && u < 1.02 && v > -0.02 && v < 1.02 && d.z > 0 ? 1 : 0;
    for (let k = 0; k < 3; k++) FP[i * 3 + k] = P[i * 3 + k] + N[i * 3 + k] * 0.0015;
  }
  const fi = [];
  for (let t = 0; t < index.length; t += 3) if (ok[index[t]] && ok[index[t + 1]] && ok[index[t + 2]]) fi.push(index[t], index[t + 1], index[t + 2]);
  const face = new THREE.BufferGeometry();
  face.setAttribute('position', new THREE.BufferAttribute(FP, 3));
  face.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  face.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  face.setIndex(fi);
  face.userData.shared = true;
  HEAD = { head, face };
  return HEAD;
}

// 忍者蒙面巾：沿著頭型往外推、只留下鼻子以下的部分
let MASK = null;
export function maskGeometry() {
  if (MASK) return MASK;
  const { head } = headGeometries();
  const P = head.attributes.position.array, N = head.attributes.normal.array, index = head.index.array;
  const n = P.length / 3, ok = new Uint8Array(n), MP = new Float32Array(P.length);
  for (let i = 0; i < n; i++) {
    const len = Math.hypot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    ok[i] = P[i * 3 + 1] / len < -0.36 && P[i * 3 + 1] / len > -0.97 ? 1 : 0; // 仰角約 -21° 以下
    for (let k = 0; k < 3; k++) MP[i * 3 + k] = P[i * 3 + k] + N[i * 3 + k] * 0.012;
  }
  const mi = [];
  for (let t = 0; t < index.length; t += 3) if (ok[index[t]] + ok[index[t + 1]] + ok[index[t + 2]] >= 2) mi.push(index[t], index[t + 1], index[t + 2]);
  MASK = new THREE.BufferGeometry();
  MASK.setAttribute('position', new THREE.BufferAttribute(MP, 3));
  MASK.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N), 3));
  MASK.setIndex(mi);
  MASK.userData.shared = true;
  return MASK;
}

/* ---------------- 建立骨架 ---------------- */
export function makeSkeleton() {
  const bones = {}, list = [];
  for (const [name, parent, pos] of BONES) {
    const b = new THREE.Bone();
    b.name = name;
    const pp = parent ? BONES[BONE_INDEX[parent]][2] : V(0, 0);
    b.position.copy(pos).sub(pp);
    if (parent) bones[parent].add(b);
    bones[name] = b;
    list.push(b);
  }
  return { bones, list, root: bones.hips, skeleton: new THREE.Skeleton(list) };
}

export function skinned(geometry, material, rig) {
  const m = new THREE.SkinnedMesh(geometry, material);
  m.frustumCulled = false;
  m.bind(rig.skeleton, new THREE.Matrix4());
  return m;
}

// 只綁在某根骨頭上的旋轉曲面（裙子、大衣下擺）
export function skinnedLathe(points, bone, material, rig) {
  const curve = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.LatheGeometry(curve.getPoints(24), 40);
  const n = g.attributes.position.count;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { si[i * 4] = BONE_INDEX[bone]; sw[i * 4] = 1; }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  return skinned(g, material, rig);
}

// 把物件掛在骨頭上：obj 的座標用「世界座標（靜止姿勢）」來寫比較直覺
export function attach(rig, boneName, obj) {
  const p = BONES[BONE_INDEX[boneName]][2];
  obj.position.sub(p);
  rig.bones[boneName].add(obj);
  return obj;
}
export const bonePos = name => BONES[BONE_INDEX[name]][2].clone();

/* ---------------- 動作 ---------------- */
export function animate(rig, t, walking, opts = {}) {
  const b = rig.bones, step = opts.smallSteps ? 0.55 : 1;
  const s = Math.sin(t * 9), c = Math.cos(t * 9);
  if (walking) {
    b.upperLegL.rotation.x = -s * 0.6 * step;
    b.upperLegR.rotation.x = s * 0.6 * step;
    b.lowerLegL.rotation.x = Math.max(0, -c) * 0.9 * step;
    b.lowerLegR.rotation.x = Math.max(0, c) * 0.9 * step;
    b.footL.rotation.x = -Math.max(0, -c) * 0.3 * step;
    b.footR.rotation.x = -Math.max(0, c) * 0.3 * step;
    b.upperArmL.rotation.set(s * 0.7, 0, -0.2);
    b.upperArmR.rotation.set(-s * 0.7, 0, 0.2);
    b.lowerArmL.rotation.x = -0.3 - Math.max(0, s) * 0.3;
    b.lowerArmR.rotation.x = -0.3 - Math.max(0, -s) * 0.3;
    b.hips.position.y = 0.2 + Math.abs(c) * 0.012;
    b.hips.rotation.y = s * 0.08;
    b.chest.rotation.y = -s * 0.1;
    b.head.rotation.z = s * 0.03;
  } else {
    for (const n of ['upperLegL', 'upperLegR', 'lowerLegL', 'lowerLegR', 'footL', 'footR']) b[n].rotation.x *= 0.8;
    const sway = Math.sin(t * 1.6);
    b.upperArmL.rotation.set(sway * 0.05, 0, -0.18);
    b.upperArmR.rotation.set(-sway * 0.05, 0, 0.18);
    b.lowerArmL.rotation.x = -0.15;
    b.lowerArmR.rotation.x = -0.15;
    b.hips.position.y = 0.2;
    b.hips.rotation.y = 0;
    b.chest.rotation.y = 0;
    b.chest.scale.setScalar(1 + Math.sin(t * 2.2) * 0.008);
    b.head.rotation.z = Math.sin(t * 1.2) * 0.04;
  }
}
