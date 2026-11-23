// ============================================================
// CLAY CITY v3 — геометрия: детерминированный RNG, сборщик
// треугольников, призмы/тела вращения/трубки, инстансинг с LOD.
// ============================================================
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Детерминированный random в [0,1): одинаковый город при каждой загрузке. */
export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
export const between = (r, a, b) => a + (b - a) * r();
export const pick = (r, arr) => arr[Math.min(arr.length - 1, (r() * arr.length) | 0)];

const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
/** Матрица: позиция, поворот вокруг Y, масштаб. */
export function place(x, y, z, angle = 0, sx = 1, sy = 1, sz = 1) {
  _q.setFromAxisAngle(UP, angle);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

/** Сборщик indexed-геометрии: позиции, нормали, UV (в метрах). */
export class GB {
  constructor() { this.p = []; this.n = []; this.t = []; this.i = []; this.v = 0; }
  vert(x, y, z, nx, ny, nz, u, v) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.t.push(u, v); return this.v++;
  }
  // quad a-b-c-d против часовой, если смотреть снаружи (нормаль к зрителю)
  quad(a, b, c, d, n, ua, ub, uc, ud) {
    const i0 = this.vert(a[0], a[1], a[2], n[0], n[1], n[2], ua[0], ua[1]);
    const i1 = this.vert(b[0], b[1], b[2], n[0], n[1], n[2], ub[0], ub[1]);
    const i2 = this.vert(c[0], c[1], c[2], n[0], n[1], n[2], uc[0], uc[1]);
    const i3 = this.vert(d[0], d[1], d[2], n[0], n[1], n[2], ud[0], ud[1]);
    this.i.push(i0, i1, i2, i0, i2, i3);
  }
  tri(a, b, c, n, ua, ub, uc) {
    const i0 = this.vert(a[0], a[1], a[2], n[0], n[1], n[2], ua[0], ua[1]);
    const i1 = this.vert(b[0], b[1], b[2], n[0], n[1], n[2], ub[0], ub[1]);
    const i2 = this.vert(c[0], c[1], c[2], n[0], n[1], n[2], uc[0], uc[1]);
    this.i.push(i0, i1, i2);
  }
  /** Бокс с центром (cx,cy,cz), поворот yaw вокруг Y. UV в метрах. */
  box(cx, cy, cz, sx, sy, sz, yaw = 0) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const R = (x, z) => [cx + x * c + z * s, cz - x * s + z * c];
    const hx = sx / 2, hz = sz / 2, y0 = cy - sy / 2, y1 = cy + sy / 2;
    const pts = [R(-hx, -hz), R(hx, -hz), R(hx, hz), R(-hx, hz)];
    polyWalls(this, pts, y0, y1);
    polyCap(this, pts, y1, true);
    polyCap(this, pts, y0, false);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.t, 2));
    g.setIndex(this.v > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere();
    return g;
  }
  get triangles() { return this.i.length / 3; }
}

// ---------- полигоны: [x,z], против часовой в математической ориентации ----------
export function polyArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const [x0, z0] = p[i], [x1, z1] = p[(i + 1) % p.length]; a += x0 * z1 - x1 * z0; }
  return a / 2;
}
export const ensureCCW = (p) => (polyArea(p) < 0 ? p.slice().reverse() : p);
export const rect = (w, d, cx = 0, cz = 0) => [[cx - w / 2, cz - d / 2], [cx + w / 2, cz - d / 2], [cx + w / 2, cz + d / 2], [cx - w / 2, cz + d / 2]];
export function ngon(n, r, rot = 0, cx = 0, cz = 0) {
  const p = [];
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2; p.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return p;
}
export const ellipse = (a, b, n, cx = 0, cz = 0) => ngon(n, 1, 0).map(([x, z]) => [cx + x * a, cz + z * b]);
export function roundRect(w, d, r, seg = 4, cx = 0, cz = 0) {
  const p = [], hx = w / 2 - r, hz = d / 2 - r;
  for (let k = 0; k < 4; k++) {
    const a0 = k * Math.PI / 2;
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * Math.PI / 2;
      p.push([cx + Math.sign(Math.cos(a0 + 0.01)) * hx + Math.cos(a) * r, cz + Math.sign(Math.sin(a0 + 0.01)) * hz + Math.sin(a) * r]);
    }
  }
  return p;
}
export const scalePoly = (pts, sx, sz) => pts.map(([x, z]) => [x * sx, z * sz]);

/** Стены полигональной призмы. UV: u — периметр (м), v — высота (м). Возвращает периметр. */
export function polyWalls(B, pts, y0, y1, u0 = 0) {
  const n = pts.length; let s = u0;
  for (let i = 0; i < n; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % n];
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
    if (L < 1e-6) continue;
    const nx = dz / L, nz = -dx / L; // наружная нормаль
    B.quad([x1, y0, z1], [x0, y0, z0], [x0, y1, z0], [x1, y1, z1], [nx, 0, nz], [s + L, y0], [s, y0], [s, y1], [s + L, y1]);
    s += L;
  }
  return s - u0;
}
/** Горизонтальная крышка полигона (нормаль +Y при up=true). */
export function polyCap(B, pts, y, up = true) {
  const v2 = pts.map(([x, z]) => new THREE.Vector2(x, z));
  const faces = THREE.ShapeUtils.triangulateShape(v2, []);
  const n = [0, up ? 1 : -1, 0];
  for (const f of faces) {
    const [a, b, c] = f.map((i) => pts[i]);
    // геометрическая нормаль (B−A)×(C−A) в (x,z): y = −(знак площади); добиваемся нужной
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const flip = ((area < 0 ? 1 : -1) !== (up ? 1 : -1));
    const A = a, Bv = flip ? c : b, C = flip ? b : c;
    B.tri([A[0], y, A[1]], [Bv[0], y, Bv[1]], [C[0], y, C[1]], n, [A[0], A[1]], [Bv[0], Bv[1]], [C[0], C[1]]);
  }
}
/** Призма: стены + крышка (+ дно по запросу). */
export function polyPrism(B, pts, y0, y1, { cap = true, bottom = false, u0 = 0 } = {}) {
  const per = polyWalls(B, pts, y0, y1, u0);
  if (cap) polyCap(B, pts, y1, true);
  if (bottom) polyCap(B, pts, y0, false);
  return per;
}
/** Парапет: кольцевая надстройка поверх крышки. */
export function parapet(B, pts, y, h = 1.0, t = 0.35) {
  const c = polyCentroid(pts);
  const inner = pts.map(([x, z]) => [x - Math.sign(x - c[0]) * t, z - Math.sign(z - c[1]) * t]);
  const pe = polyWalls(B, pts, y, y + h);
  polyWalls(B, inner.slice().reverse(), y, y + h, pe);
  const n = pts.length; let s = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], a2 = inner[i], b2 = inner[(i + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    B.quad([b[0], y + h, b[1]], [a[0], y + h, a[1]], [a2[0], y + h, a2[1]], [b2[0], y + h, b2[1]], [0, 1, 0], [s + L, 0], [s, 0], [s, t], [s + L, t]);
    s += L;
  }
}
export function polyCentroid(pts) {
  let x = 0, z = 0; for (const p of pts) { x += p[0]; z += p[1]; } return [x / pts.length, z / pts.length];
}

// ---------- тела вращения ----------
/**
 * Профиль [[r,y],…] идёт так, чтобы материал был слева по ходу: нормаль (dy, −dr).
 * Для куполов — снизу вверх, для замкнутых сечений платформ — против часовой в (r,y).
 * UV: u = θ·rRef, v — дуга вдоль профиля (метры).
 */
export function revolve(B, prof, segs, { smooth = false, theta0 = 0, theta1 = Math.PI * 2, rRef = null, cap = false } = {}) {
  const n = prof.length;
  const segN = [], segLen = [], sAt = [0];
  let s = 0, rMax = 0;
  for (let j = 0; j < n; j++) rMax = Math.max(rMax, prof[j][0]);
  rRef = rRef ?? rMax;
  for (let j = 0; j < n - 1; j++) {
    const dr = prof[j + 1][0] - prof[j][0], dy = prof[j + 1][1] - prof[j][1], L = Math.hypot(dr, dy);
    segLen.push(L);
    if (L > 1e-9) segN.push([dy / L, -dr / L]); else segN.push([0, 0]);
    s += L; sAt.push(s);
  }
  const ptN = [];
  if (smooth) {
    for (let j = 0; j < n; j++) {
      const a = segN[Math.max(0, j - 1)], b = segN[Math.min(n - 2, j)];
      let x = a[0] + b[0], y = a[1] + b[1]; const L = Math.hypot(x, y) || 1;
      ptN.push([x / L, y / L]);
    }
  }
  const cols = segs + 1;
  const emitRow = (j, nn) => {
    const [r, y] = prof[j];
    const base = B.v;
    for (let i = 0; i <= segs; i++) {
      const a = theta0 + (theta1 - theta0) * (i / segs), ca = Math.cos(a), sa = Math.sin(a);
      B.vert(r * ca, y, r * sa, nn[0] * ca, nn[1], nn[0] * sa, a * rRef, sAt[j]);
    }
    return base;
  };
  if (smooth) {
    const bases = [];
    for (let j = 0; j < n; j++) bases.push(emitRow(j, ptN[j]));
    for (let j = 0; j < n - 1; j++) {
      if (segLen[j] < 1e-9) continue;
      for (let i = 0; i < segs; i++) {
        const a = bases[j] + i, b = bases[j + 1] + i, c = b + 1, d = a + 1;
        B.i.push(a, b, c, a, c, d);
      }
    }
  } else {
    for (let j = 0; j < n - 1; j++) {
      if (segLen[j] < 1e-9) continue;
      const r0 = emitRow(j, segN[j]), r1 = emitRow(j + 1, segN[j]);
      for (let i = 0; i < segs; i++) {
        const a = r0 + i, b = r1 + i, c = b + 1, d = a + 1;
        B.i.push(a, b, c, a, c, d);
      }
    }
  }
  if (cap) polyCap(B, ngon(segs, prof[n - 1][0], theta0), prof[n - 1][1], true);
  return rMax;
}

// ---------- кривые и трубки ----------
export function bezier(p0, p1, p2, p3, n = 16) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push(new THREE.Vector3(
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      u * u * u * p0[2] + 3 * u * u * t * p1[2] + 3 * u * t * t * p2[2] + t * t * t * p3[2]));
  }
  return out;
}
/** Трубка вдоль ломаной/кривой, гладкие нормали, замкнутые торцы. */
export function tube(pts, radius, radial = 8, { taper = null } = {}) {
  const B = new GB();
  const n = pts.length, rings = [];
  const T = new THREE.Vector3(), Nv = new THREE.Vector3(), Bv = new THREE.Vector3(), ref = new THREE.Vector3(), tmp = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    T.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    ref.set(Math.abs(T.y) < 0.9 ? 0 : 1, Math.abs(T.y) < 0.9 ? 1 : 0, 0);
    Nv.crossVectors(T, ref).normalize();
    Bv.crossVectors(T, Nv).normalize();
    const r = taper ? taper(i / (n - 1)) : radius;
    const ring = [];
    for (let k = 0; k <= radial; k++) {
      const a = (k / radial) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      tmp.copy(Nv).multiplyScalar(ca).addScaledVector(Bv, sa);
      ring.push(B.vert(p.x + tmp.x * r, p.y + tmp.y * r, p.z + tmp.z * r, tmp.x, tmp.y, tmp.z, (k / radial) * Math.PI * 2 * radius, i * radius));
    }
    rings.push(ring);
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < radial; k++) {
    const a = rings[i][k], b = rings[i + 1][k], c = rings[i + 1][k + 1], d = rings[i][k + 1];
    B.i.push(a, c, b, a, d, c);
  }
  return B.build();
}
export function tubeBetween(a, b, radius, radial = 6) {
  return tube([new THREE.Vector3(...a), new THREE.Vector3(...b)], radius, radial);
}

/** Склеить геометрии с атрибутами position/normal/uv в одну. */
export function merge(list) {
  const src = list.filter(Boolean);
  const parts = src.map((g) => (g.index ? g.toNonIndexed() : g));
  const out = mergeGeometries(parts, false);
  parts.forEach((g, i) => { if (g !== src[i]) g.dispose(); });
  if (!out) throw new Error("merge failed: attributes differ");
  return out;
}

// ---------- инстансинг с LOD ----------
const PROXY_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

/**
 * Архетип: набор частей { lods:[geo0,geo1,geo2], mat, cast } + один список инстансов.
 * Все части и все LOD делят три «ведра» матриц (ближнее/среднее/дальнее).
 * proxyGeo — упрощённая форма только для теней (сама не рисуется).
 */
export class Archetype {
  constructor(name, parts, { proxyGeo = null, colors = false, cast = false } = {}) {
    this.name = name; this.parts = parts; this.proxyGeo = proxyGeo;
    this.usesColor = colors; this.cast = cast;
    this.count = 0; this.lodCounts = [-1, -1, -1]; this.meshes = [];
  }
  build(scene, count) {
    this.count = count;
    const cap = Math.max(1, count);
    this.allMat = new THREE.InstancedBufferAttribute(new Float32Array(cap * 16), 16);
    if (this.usesColor) this.allCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.buckets = [0, 1, 2].map(() => ({
      mat: new THREE.InstancedBufferAttribute(new Float32Array(cap * 16), 16),
      col: this.usesColor ? new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3) : null,
    }));
    for (const b of this.buckets) { b.mat.setUsage(THREE.DynamicDrawUsage); if (b.col) b.col.setUsage(THREE.DynamicDrawUsage); }
    for (const part of this.parts) {
      const lods = Array.isArray(part.lods) ? part.lods : [part.lods];
      lods.forEach((geo, k) => {
        if (!geo) return;
        const m = new THREE.InstancedMesh(geo, part.mat, cap);
        m.instanceMatrix = this.buckets[k].mat;
        if (this.usesColor) m.instanceColor = this.buckets[k].col;
        m.count = 0; m.frustumCulled = false;
        m.castShadow = this.cast && !this.proxyGeo;
        m.receiveShadow = true;
        m.name = `${this.name}#${k}`;
        scene.add(m); this.meshes.push(m);
      });
    }
    if (this.proxyGeo) {
      const p = new THREE.InstancedMesh(this.proxyGeo, PROXY_MAT, cap);
      p.instanceMatrix = this.allMat;
      p.castShadow = true; p.name = `${this.name}#proxy`;
      scene.add(p); this.proxy = p;
    }
    return this;
  }
  /** matrices: Float32Array(n*16) в порядке столбцов Matrix4; colors: Float32Array(n*3)|null */
  setInstances(matrices, colors = null) {
    const n = matrices.length / 16;
    this.count = n;
    this.allMat.array.set(matrices.subarray(0, n * 16));
    this.allMat.needsUpdate = true;
    if (this.allCol) { this.allCol.array.set(colors ? colors.subarray(0, n * 3) : new Float32Array(n * 3).fill(1)); this.allCol.needsUpdate = true; }
    if (this.proxy) { this.proxy.count = n; this.proxy.computeBoundingSphere(); }
    this.lodCounts = [-1, -1, -1];
  }
  updateLOD(cam, d01, d12) {
    if (!this.count) return;
    const src = this.allMat.array, srcC = this.allCol ? this.allCol.array : null;
    const cx = cam.x, cy = cam.y, cz = cam.z, d1 = d01 * d01, d2 = d12 * d12, cnt = [0, 0, 0];
    for (let i = 0; i < this.count; i++) {
      const o = i * 16;
      const dx = src[o + 12] - cx, dy = src[o + 13] - cy, dz = src[o + 14] - cz;
      const dd = dx * dx + dy * dy + dz * dz;
      const k = dd < d1 ? 0 : dd < d2 ? 1 : 2;
      const b = this.buckets[k], j = cnt[k]++;
      b.mat.array.set(src.subarray(o, o + 16), j * 16);
      if (srcC) b.col.array.set(srcC.subarray(i * 3, i * 3 + 3), j * 3);
    }
    for (let k = 0; k < 3; k++) {
      const b = this.buckets[k];
      b.mat.needsUpdate = true; if (b.col) b.col.needsUpdate = true;
      if (cnt[k] !== this.lodCounts[k]) { this.lodCounts[k] = cnt[k]; for (const m of this.meshes) if (m.name.endsWith("#" + k)) m.count = cnt[k]; }
    }
  }
}
