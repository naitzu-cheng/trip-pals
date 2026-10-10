// 距離場（SDF）工具：用「捏黏土」的方式做出光滑的頭和頭髮，再用 Marching Cubes 轉成網格
import * as THREE from 'three';
import { edgeTable, triTable } from 'three/addons/objects/MarchingCubes.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);


export function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
export function ellipsoid(px, py, pz, cx, cy, cz, rx, ry, rz) {
  const x = (px - cx) / rx, y = (py - cy) / ry, z = (pz - cz) / rz;
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const k1 = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2);
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
// 兩端半徑不同的膠囊（iq 的 round cone）
export function roundCone(px, py, pz, a, b, r1, r2) {
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



/* ---------------- Marching Cubes ---------------- */
const CORNERS = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

export function polygonize(sdf, min, max, cell) {
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
export function buildGeometry(sdf, flat) {
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


// 頭：玩具公仔風的大圓頭，臉正面稍平、下半臉圓潤飽滿。單位：頭半徑約 0.28，臉朝 +Z
export function headSDF(x, y, z) {
  let t = ellipsoid(x, y, z, 0, 0.03, -0.01, 0.29, 0.27, 0.275);
  t = smin(t, ellipsoid(x, y, z, 0, -0.085, 0.035, 0.235, 0.175, 0.22), 0.1);
  return t;
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

// 從正前方往後找，回傳頭表面在 (x, y) 的 z 和法線（用來把眼鏡貼在臉上）
export function faceSurface(x, y) {
  let z = 0.45;
  while (z > 0 && headSDF(x, y, z) > 0) z -= 0.002;
  const e = 0.003;
  const n = new THREE.Vector3(
    headSDF(x + e, y, z) - headSDF(x - e, y, z),
    headSDF(x, y + e, z) - headSDF(x, y - e, z),
    headSDF(x, y, z + e) - headSDF(x, y, z - e)).normalize();
  return { z, n };
}
