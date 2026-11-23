// ============================================================
// CLAY CITY v3 — инфраструктура: платформы-кольца, земля-шейдер
// (дороги с разметкой, площадь, бульвар, набережные, свет фонарей),
// квартальные плиты с тротуарами, мосты, дно платформ, причальные
// мачты, промзона.
// ============================================================
import * as THREE from "three";
import { GB, revolve, tube, merge, place } from "./geom.js";
import { U } from "./env.js";
import { PLATFORMS, ROAD, ZONES } from "./config.js";
import { bandRange, avenues, blockClear, TAU } from "./grid.js";

const CURB = ROAD.curb;

// ---------- земля: общий GLSL ----------
const G_COMMON = `
uniform float uRoads[8]; uniform int uNR;
uniform float uAve[8]; uniform int uNB;
uniform float uRIn, uROut, uPlaza, uBoulevard, uEdgeIn, uEdgeOut, uNight, uSlab, uDebug;
uniform vec4 uErase[12]; uniform int uNE;
varying vec2 vCity; varying vec2 vSlabUv; varying vec4 vBlk; varying float vUpN;
float gRough; vec3 gGlow;
float gHash(vec2 p) { p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }
float gNoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y); }
float gLine(float x, float aa) { return 1.0 - smoothstep(0.12, 0.12 + aa, x); }`;

const G_COLOR = `
{
  vec2 p = vCity;
  float r = length(p);
  float ang = r > 1e-4 ? atan(p.y, p.x) : 0.0;
  float aa = fwidth(r) + 1e-4;
  float fine = clamp(0.10 / aa, 0.0, 1.0);
  float n1 = gNoise(p * 0.07), n2 = gNoise(p * 4.0), n3 = gNoise(p * 0.05);
  float n2f = mix(1.0, n2, fine);
  vec3 grass = vec3(0.055, 0.095, 0.035) * (0.82 + 0.36 * mix(1.0, gNoise(p * 0.35), fine)) * (0.85 + 0.3 * n3);
  vec3 gA = vec3(0.40, 0.385, 0.355), gB = vec3(0.29, 0.275, 0.25);
  vec2 gj = abs(fract(p / 1.2) - 0.5);
  vec3 foreC = mix(gA, gB * 0.72, step(0.455, max(gj.x, gj.y)) * fine) * (0.9 + 0.2 * n2f);
  float blvd = uBoulevard > 0.0 ? (1.0 - smoothstep(uBoulevard - aa, uBoulevard + aa, abs(p.y))) * step(uRIn > 1.0 ? 0.0 : -260.0, p.x) : 0.0;
  float path = max(1.0 - smoothstep(2.0, 2.0 + aa, abs(abs(p.y) - 14.0)), 1.0 - smoothstep(2.0, 2.0 + aa, abs(abs(p.y) - 36.0)));
  float crossP = 1.0 - smoothstep(1.6, 1.6 + aa, abs(fract(p.x / 60.0 + 0.5) - 0.5) * 60.0);
  vec3 blvdC = mix(grass, vec3(0.42, 0.39, 0.34), clamp(path + crossP, 0.0, 1.0));
  float erase = 0.0;
  for (int i = 0; i < 12; i++) { if (i >= uNE) break; vec4 e = uErase[i];
    erase = max(erase, step(e.x, p.x) * step(p.x, e.z) * step(e.y, p.y) * step(p.y, e.w)); }
  float plaza = uPlaza > 1.0 ? 1.0 - smoothstep(uPlaza - aa, uPlaza + aa, r) : 0.0;
  float ringTone = step(0.5, fract(r / 12.0));
  float sector = step(0.5, fract(ang / 6.2831853 * 16.0 + 0.5));
  vec3 plazaC = mix(mix(gA, gB, ringTone), mix(gB, gA, ringTone), sector) * (0.9 + 0.2 * n2f);
  // --- дорожная сеть ---
  float dRing = 1e5, rNear = 0.0, bandF = 0.0;
  for (int i = 0; i < 8; i++) { if (i >= uNR) break; float d = abs(r - uRoads[i]);
    if (d < dRing) { dRing = d; rNear = uRoads[i]; } bandF += step(uRoads[i], r); }
  int bi = int(bandF); if (bi >= uNB) bi = uNB - 1;
  float n = uAve[bi];
  float cell = 6.2831853 / n;
  float k = floor((ang + 3.14159265) / cell + 0.5);
  float aA = -3.14159265 + k * cell;
  vec2 dir = vec2(cos(aA), sin(aA));
  float along = abs(dot(p, dir));
  float dAve = abs(p.x * dir.y - p.y * dir.x);
  float rStart = max(uPlaza, uRIn + 14.0);
  float ringRoad = 1.0 - smoothstep(8.4 - aa, 9.0 + aa, dRing);
  float aveRoad = (1.0 - smoothstep(7.4 - aa, 8.0 + aa, dAve)) * step(rStart, r) * (1.0 - step(uROut - uEdgeOut + 2.0, r));
  float road = max(ringRoad, aveRoad) * (1.0 - erase);
  gGlow = vec3(0.0);
  if (uSlab > 0.5) {
    float dE = min(min(vSlabUv.x, vBlk.z - vSlabUv.x), min(vSlabUv.y, vBlk.w - vSlabUv.y));
    if (vUpN < 0.5) { diffuseColor.rgb = vec3(0.085, 0.085, 0.085); gRough = 0.8; }
    else {
      float aaS = fwidth(dE) + 1e-4;
      float walk = 1.0 - smoothstep(4.6 - aaS, 5.0 + aaS, dE);
      vec2 tj = abs(fract(vSlabUv / 0.6) - 0.5);
      vec3 walkC = mix(vec3(0.33, 0.325, 0.31), vec3(0.19, 0.185, 0.18), step(0.44, max(tj.x, tj.y)) * fine) * (0.9 + 0.2 * n2f);
      float isPark = step(gHash(floor(vBlk.xy + 0.5) * 1.37 + 0.5), 0.26);
      vec3 yard = mix(vec3(0.20, 0.195, 0.185), grass * 1.15, isPark) * (0.9 + 0.2 * n2f);
      vec3 c = mix(yard, walkC, walk);
      if (uDebug > 0.5) c = vec3(isPark, walk, dE * 0.05);
      if (uDebug > 1.5) c = vec3(vBlk.xy * 0.1, fract(vBlk.w * 0.1));
      if (uDebug > 2.5) c = vec3(fract(vSlabUv * 0.1), 0.5);
      c = mix(c, foreC, erase);
      c = mix(c, blvdC, blvd);
      diffuseColor.rgb = c;
      gRough = mix(0.92, 0.74, walk);
    }
  } else {
    float o1 = r - rNear;
    float aaR = fwidth(o1) + 1e-4, aaA = fwidth(dAve) + 1e-4;
    float fineR = clamp(0.05 / aaR, 0.0, 1.0), fineA = clamp(0.05 / aaA, 0.0, 1.0), fineD = clamp(0.10 / aa, 0.0, 1.0);
    float laneR = gLine(abs(abs(o1) - 3.6), aaR) * step(fract(abs(ang) * r / 9.0), 0.333) * fineD;
    float edgeR = gLine(abs(abs(o1) - 7.4), aaR);
    float ctrR = gLine(abs(abs(o1) - 0.22), aaR);
    float laneA = gLine(abs(dAve - 3.6), aaA) * step(fract(along / 9.0), 0.333) * fineD;
    float edgeA = gLine(abs(dAve - 7.4), aaA);
    float ctrA = gLine(abs(dAve - 0.22), aaA);
    float mark = clamp((laneR * 0.75 + edgeR + ctrR) * ringRoad + (laneA * 0.75 + edgeA + ctrA) * aveRoad, 0.0, 1.0) * (1.0 - erase) * mix(fineA, fineR, ringRoad);
    float wet = step(0.72, n1);
    vec3 asphalt = vec3(0.040, 0.041, 0.044) * (0.82 + 0.36 * n2f) * (0.9 + 0.2 * n3);
    asphalt = mix(asphalt, vec3(0.62, 0.62, 0.58), mark);
    vec3 lot = vec3(0.11, 0.105, 0.10) * (0.8 + 0.4 * n2f);
    float edge = max(step(r, uRIn + uEdgeIn), step(uROut - uEdgeOut, r));
    vec3 promC = mix(vec3(0.30, 0.29, 0.27), vec3(0.17, 0.115, 0.07), max(step(uROut - 6.0, r), step(r, uRIn + 6.0))) * (0.9 + 0.2 * n2f);
    vec3 c = mix(lot, asphalt, road);
    c = mix(c, promC, edge * (1.0 - road) * (1.0 - erase));
    c = mix(c, blvdC, blvd * (1.0 - road));
    c = mix(c, foreC, erase * (1.0 - road) * (1.0 - blvd));
    c = mix(c, plazaC, plaza);
    diffuseColor.rgb = c;
    gRough = mix(0.92, mix(0.58, 0.30, wet), road);
  }
  // ночью: пятна света фонарей вдоль улиц
  float sN = abs(fract(abs(ang) * r / 38.0 + 0.5) - 0.5) * 38.0;
  float sP = abs(fract(along / 38.0 + 0.5) - 0.5) * 38.0;
  float pool = exp(-pow(sN / 10.0, 2.0) - pow(dRing / 9.0, 2.0)) * ringRoad
             + exp(-pow(sP / 10.0, 2.0) - pow(dAve / 8.5, 2.0)) * aveRoad;
  gGlow = vec3(1.0, 0.72, 0.42) * pool * uNight * 0.30 * (1.0 - erase);
}`;

function groundMaterial(M, plat, isSlab) {
  const roads = new Array(8).fill(0), ave = new Array(8).fill(1);
  plat.ringRoads.forEach((v, i) => { roads[i] = v; });
  plat.ave.forEach((v, i) => { ave[i] = v; });
  const erase = new Float32Array(48);
  let ne = 0;
  for (const z of ZONES) {
    if (z.plat !== plat.id || ne >= 12) continue;
    erase.set([z.x - z.hx - 4, z.z - z.hz - 4, z.x + z.hx + 4, z.z + z.hz + 4], ne * 4); ne++;
  }
  const uni = {
    uRoads: { value: roads }, uNR: { value: plat.ringRoads.length },
    uAve: { value: ave }, uNB: { value: plat.ave.length },
    uRIn: { value: plat.rIn }, uROut: { value: plat.rOut }, uPlaza: { value: plat.plaza || 0 },
    uBoulevard: { value: plat.id === "core" || plat.id === "ringB" ? 46 : 0 },
    uEdgeIn: { value: plat.edgeIn }, uEdgeOut: { value: plat.edgeOut },
    uNight: U.uNight, uSlab: { value: isSlab ? 1 : 0 }, uDebug: { value: 0 },
    uErase: { value: erase }, uNE: { value: ne },
  };
  const mat = M.std({
    color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.6,
    polygonOffset: isSlab, polygonOffsetFactor: isSlab ? -1 : 0, polygonOffsetUnits: isSlab ? -2 : 0,
  }, {
    key: "ground",
    patch: (sh) => {
      Object.assign(sh.uniforms, uni);
      mat.userData.shader = sh;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", `#include <common>
          attribute vec4 aBlock;
          varying vec2 vCity; varying vec2 vSlabUv; varying vec4 vBlk; varying float vUpN;`)
        .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
          vCity = worldPosition.xz; vSlabUv = uv; vBlk = aBlock; vUpN = normal.y;`);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>\n${G_COMMON}`)
        .replace("#include <map_fragment>", G_COLOR)
        .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n roughnessFactor = gRough;`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n totalEmissiveRadiance += gGlow;`);
    },
  });
  mat.userData.uni = uni;
  return mat;
}

// ---------- квартальные плиты: сектора между дорогами, uv = (вдоль дуги, по радиусу) ----------
function slabGeometry(plat) {
  const pos = [], nor = [], uvs = [], blk = [], idx = [];
  let v = 0;
  const vert = (x, y, z, nx, ny, nz, u, w, i, k, W, D) => { pos.push(x, y, z); nor.push(nx, ny, nz); uvs.push(u, w); blk.push(i, k, W, D); return v++; };
  const wall = (P, Q, nx, nz) => {  // бордюр от P к Q (на земле) высотой CURB; нормаль (nx,nz) наружу
    let p0 = P, p1 = Q;
    if ((p1[2] - p0[2]) * nx - (p1[0] - p0[0]) * nz < 0) { p0 = Q; p1 = P; }
    const i0 = vert(p1[0], 0, p1[2], nx, 0, nz, 0, 0, 0, 0, 0, 0), i1 = vert(p0[0], 0, p0[2], nx, 0, nz, 0, 0, 0, 0, 0, 0);
    const i2 = vert(p0[0], CURB, p0[2], nx, 0, nz, 0, 0, 0, 0, 0, 0), i3 = vert(p1[0], CURB, p1[2], nx, 0, nz, 0, 0, 0, 0, 0, 0);
    idx.push(i0, i1, i2, i0, i2, i3);
  };
  for (let i = 0; i < plat.ringRoads.length; i++) {
    if (!blockClear(plat, i)) continue;
    const [r0, r1] = bandRange(plat, i);
    const rIn = r0 + (i === 0 ? plat.edgeIn : ROAD.ringHalf), rOut = r1 - ROAD.ringHalf;
    const n = avenues(plat, i), cell = TAU / n;
    for (let k = 0; k < n; k++) {
      const a0 = -Math.PI + k * cell, a1 = a0 + cell;
      const aIn = (rr) => a0 + Math.asin(ROAD.aveHalf / rr), aOut = (rr) => a1 - Math.asin(ROAD.aveHalf / rr);
      const rMid = (rIn + rOut) / 2, W = (aOut(rMid) - aIn(rMid)) * rMid, D = rOut - rIn;
      if (W < 14) continue;
      const nr = Math.max(1, Math.ceil(D / 9)), na = Math.max(2, Math.ceil(W / 9));
      const rows = [];
      for (let ir = 0; ir <= nr; ir++) {
        const rr = rIn + (D * ir) / nr, b = aIn(rr), e = aOut(rr), rowI = [];
        for (let ia = 0; ia <= na; ia++) {
          const a = b + ((e - b) * ia) / na;
          rowI.push(vert(Math.cos(a) * rr, CURB, Math.sin(a) * rr, 0, 1, 0, (a - b) * rr, rr - rIn, i, k, W, D));
        }
        rows.push(rowI);
      }
      for (let ir = 0; ir < nr; ir++) for (let ia = 0; ia < na; ia++) {
        const a = rows[ir][ia], b = rows[ir + 1][ia], c = rows[ir + 1][ia + 1], d = rows[ir][ia + 1];
        idx.push(a, d, c, a, c, b);
      }
      const NA = Math.max(2, Math.ceil(W / 9));
      for (let s = 0; s < NA; s++) {  // дуговые стенки
        for (const [rr, sg] of [[rIn, -1], [rOut, 1]]) {
          const b = aIn(rr), e = aOut(rr), aa0 = b + ((e - b) * s) / NA, aa1 = b + ((e - b) * (s + 1)) / NA, am = (aa0 + aa1) / 2;
          wall([Math.cos(aa0) * rr, 0, Math.sin(aa0) * rr], [Math.cos(aa1) * rr, 0, Math.sin(aa1) * rr], sg * Math.cos(am), sg * Math.sin(am));
        }
      }
      wall([Math.cos(aIn(rIn)) * rIn, 0, Math.sin(aIn(rIn)) * rIn], [Math.cos(aIn(rOut)) * rOut, 0, Math.sin(aIn(rOut)) * rOut], Math.sin(a0), -Math.cos(a0));
      wall([Math.cos(aOut(rIn)) * rIn, 0, Math.sin(aOut(rIn)) * rIn], [Math.cos(aOut(rOut)) * rOut, 0, Math.sin(aOut(rOut)) * rOut], -Math.sin(a1), Math.cos(a1));
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("aBlock", new THREE.Float32BufferAttribute(blk, 4));
  g.setIndex(new THREE.Uint32BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

// ---------- мост между платформами (локально: +Z наружу, y от земли внутренней платформы) ----------
function bridgeGeos(A, B, wide = 22, major = false) {
  const z0 = A.rOut - 10, z1 = B.rIn + 10, len = z1 - z0, dy = B.y - A.y, N = 16, hw = wide / 2;
  const deck = new GB(), conc = new GB(), brass = new GB(), white = new GB();
  const yAt = (t) => dy * t + 3.2 * Math.sin(Math.PI * t);
  const P = (x, t, dy2 = 0) => [x, yAt(t) + dy2, z0 + len * t];
  for (let s = 0; s < N; s++) {
    const t0 = s / N, t1 = (s + 1) / N;
    deck.quad(P(-hw, t0), P(-hw, t1), P(hw, t1), P(hw, t0), [0, 1, 0.06], [0, t0 * len], [0, t1 * len], [wide, t1 * len], [wide, t0 * len]);
    for (const sx of [-1, 1]) {
      const x = sx * hw;
      // фасадная балка
      const fa = [x, yAt(t1), z0 + len * t1], fb = [x, yAt(t0), z0 + len * t0], fc = [x, yAt(t0) - 2.6, z0 + len * t0], fd = [x, yAt(t1) - 2.6, z0 + len * t1];
      if (sx < 0) conc.quad(fa, fb, fc, fd, [sx, 0, 0], [t1 * len, 0], [t0 * len, 0], [t0 * len, 2.6], [t1 * len, 2.6]);
      else conc.quad(fd, fc, fb, fa, [sx, 0, 0], [t1 * len, 2.6], [t0 * len, 2.6], [t0 * len, 0], [t1 * len, 0]);
    }
    for (const x of [-0.25, 0.25]) white.quad(P(x - 0.07, t0, 0.02), P(x - 0.07, t1, 0.02), P(x + 0.07, t1, 0.02), P(x + 0.07, t0, 0.02), [0, 1, 0], [0, 0], [0, 1], [1, 1], [1, 0]);
  }
  // стойки и поручни
  const np = Math.floor(len / 3.2);
  const railL = [], railR = [];
  for (let i = 0; i <= np; i++) {
    const t = i / np;
    for (const sx of [-1, 1]) brass.box(sx * (hw - 0.5), yAt(t) + 0.55, z0 + len * t, 0.12, 1.1, 0.12);
    railL.push(new THREE.Vector3(-(hw - 0.5), yAt(t) + 1.12, z0 + len * t));
    railR.push(new THREE.Vector3(hw - 0.5, yAt(t) + 1.12, z0 + len * t));
  }
  // опоры
  for (const t of [0.3, 0.7]) conc.box(0, yAt(t) - 2.6 - 80, z0 + len * t, wide - 4, 160, 5);
  const brassG = merge([brass.build(), tube(railL, 0.07, 5), tube(railR, 0.07, 5)]);
  const out = { deck: deck.build(), conc: conc.build(), brass: brassG, white: white.build() };
  if (major) {
    const st = new GB();
    const zp = z0 + len * 0.5, top = 96;
    for (const sx of [-1, 1]) st.box(sx * (hw + 2.2), top / 2 - 20, zp, 3.2, top + 40, 4.5);
    st.box(0, top - 4, zp, wide + 7.6, 3.2, 4.5);
    const cables = [];
    for (let i = 1; i <= 13; i++) {
      const t = 0.5 + i * 0.034;
      if (t > 0.97) break;
      for (const sx of [-1, 1]) {
        cables.push(tube([new THREE.Vector3(sx * (hw + 2.2), top - 6, zp), new THREE.Vector3(sx * (hw - 0.5), yAt(t) + 1.2, z0 + len * t)], 0.13, 4));
        cables.push(tube([new THREE.Vector3(sx * (hw + 2.2), top - 6, zp), new THREE.Vector3(sx * (hw - 0.5), yAt(1 - t) + 1.2, z0 + len * (1 - t))], 0.13, 4));
      }
    }
    out.steel = merge([st.build(), ...cables]);
  }
  return out;
}

// ---------- причальная мачта: решётчатая ферма ----------
function mastGeometry(h = 110) {
  const legs = [], rings = [];
  const s0 = 22, s1 = 5, N = 7;
  const corner = (i) => [[1, 1], [-1, 1], [-1, -1], [1, -1]][i];
  for (let i = 0; i < 4; i++) {
    const [cx, cz] = corner(i);
    legs.push(tube([new THREE.Vector3(cx * s0 / 2, 0, cz * s0 / 2), new THREE.Vector3(cx * s1 / 2, h, cz * s1 / 2)], 0.8, 6));
  }
  for (let k = 1; k <= N; k++) {
    const y = (h * k) / N, s = s0 + (s1 - s0) * (k / N);
    const pts = [];
    for (let i = 0; i <= 4; i++) { const [cx, cz] = corner(i % 4); pts.push(new THREE.Vector3(cx * s / 2, y, cz * s / 2)); }
    rings.push(tube(pts, 0.28, 5));
    if (k < N) {
      const y2 = (h * (k + 1)) / N, s2 = s0 + (s1 - s0) * ((k + 1) / N);
      for (let i = 0; i < 4; i++) { const [ax, az] = corner(i), [bx, bz] = corner((i + 1) % 4);
        rings.push(tube([new THREE.Vector3(ax * s / 2, y, az * s / 2), new THREE.Vector3(bx * s2 / 2, y2, bz * s2 / 2)], 0.16, 4)); }
    }
  }
  const top = new GB();
  revolve(top, [[0, h], [7, h], [7, h + 1.2], [2.2, h + 1.2], [0.5, h + 14], [0, h + 15.5]], 20, { smooth: false });
  return { lattice: merge([...legs, ...rings]), top: top.build() };
}

export function buildCity(scene, M, ctx) {
  const group = new THREE.Group();
  scene.add(group);
  const vents = [], masts = [];
  const deckMat = M.std({ color: 0x1b1c1e, roughness: 0.45, metalness: 0.1 });
  const glowRing = M.glow(0xff8a3d, 2.6);
  const neonEdge = M.neon(0x46f2ff, 3.2);
  const turbineRings = [];

  // ---------- платформы ----------
  for (const plat of PLATFORMS) {
    const g = new THREE.Group();
    g.position.y = plat.y;
    group.add(g);
    const T = plat.thick, rIn = plat.rIn, rOut = plat.rOut;
    // тело
    const body = new GB();
    const prof = rIn > 0
      ? [[rIn, -T], [rOut, -T], [rOut, -3], [rOut - 3, -0.5], [rIn + 3, -0.5], [rIn, -3], [rIn, -T]]
      : [[0, -T], [rOut, -T], [rOut, -3], [rOut - 3, -0.5], [0, -0.5]];
    revolve(body, prof, 220, { smooth: false });
    const bodyMesh = new THREE.Mesh(body.build(), M.steel);
    bodyMesh.receiveShadow = true; bodyMesh.castShadow = true; g.add(bodyMesh);
    // земля (основание)
    const gb = new GB();
    revolve(gb, [[rOut - 2.8, 0.0], [rIn, 0.0]], 220, { smooth: false });
    const ground = new THREE.Mesh(gb.build(), groundMaterial(M, plat, false));
    ground.receiveShadow = true; ground.name = `ground-${plat.id}`; g.add(ground);
    // квартальные плиты
    const sg = slabGeometry(plat);
    if (sg) { const slabs = new THREE.Mesh(sg, groundMaterial(M, plat, true)); slabs.name = `slabs-${plat.id}`; slabs.receiveShadow = true; g.add(slabs); }
    // латунные пояса и ночная кромка
    for (const [y, rad, tubeR, mat] of [[-0.9, rOut + 0.15, 0.38, M.brass], [-T + 1.4, rOut + 0.15, 0.3, M.brass], [-0.25, rOut - 1.4, 0.11, neonEdge]]) {
      if (rad <= 0) continue;
      const t = new THREE.Mesh(new THREE.TorusGeometry(rad, tubeR, 8, 220), mat);
      t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t);
    }
    if (rIn > 0) {
      const t2 = new THREE.Mesh(new THREE.TorusGeometry(rIn + 0.1, 0.34, 8, 200), M.brass);
      t2.rotation.x = Math.PI / 2; t2.position.y = -0.9; g.add(t2);
      const pipe = new THREE.Mesh(new THREE.TorusGeometry(rOut - 16, 0.9, 8, 160), M.copper);
      pipe.rotation.x = Math.PI / 2; pipe.position.y = -T - 2.2; g.add(pipe);
    }
    // дно: радиальные фермы и «левитаторы»
    const span = rOut - rIn - 20;
    const girder = new THREE.BoxGeometry(2.2, 3.6, span).translate(0, -T - 1.8, rIn + 10 + span / 2);
    const ng = Math.round(TAU * rMid(plat) / 46);
    const girders = new THREE.InstancedMesh(girder, M.darkMetal, ng);
    for (let i = 0; i < ng; i++) girders.setMatrixAt(i, place(0, 0, 0, (i / ng) * TAU));
    girders.frustumCulled = false; g.add(girders);
    const nac = new THREE.CylinderGeometry(7, 5.5, 15, 14).translate(0, -T - 9, rOut - 11);
    const nn = Math.round(TAU * rOut / 150);
    const nacs = new THREE.InstancedMesh(nac, M.darkMetal, nn);
    const ringG = new THREE.TorusGeometry(5.2, 0.5, 6, 20).rotateX(Math.PI / 2).translate(0, -T - 16.6, rOut - 11);
    const rings = new THREE.InstancedMesh(ringG, glowRing, nn);
    for (let i = 0; i < nn; i++) { const a = (i / nn) * TAU + 0.1; nacs.setMatrixAt(i, place(0, 0, 0, a)); rings.setMatrixAt(i, place(0, 0, 0, a)); }
    nacs.frustumCulled = rings.frustumCulled = false; g.add(nacs, rings);
    turbineRings.push(rings);
  }

  // ---------- мосты ----------
  const byId = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));
  const BR = [["core", "ringB", 45, 0], ["ringB", "ringC", 22.5, 1], ["ringC", "ringD", 15, 1]];
  const buckets = { deck: [], conc: [], brass: [], white: [], steel: [] };
  for (const [a, b, step] of BR) {
    for (let deg = 0; deg < 360; deg += step) {
      const rad = THREE.MathUtils.degToRad(deg);
      const major = a === "core" && deg === 0;
      const gs = bridgeGeos(byId[a], byId[b], major ? 32 : 22, major);
      const m = new THREE.Matrix4().makeRotationY(Math.atan2(Math.cos(rad), Math.sin(rad))).setPosition(0, byId[a].y, 0);
      for (const k of Object.keys(gs)) { gs[k].applyMatrix4(m); buckets[k].push(gs[k]); }
    }
  }
  const mk = (list, mat, cast = true) => { if (!list.length) return; const mesh = new THREE.Mesh(merge(list), mat); mesh.castShadow = cast; mesh.receiveShadow = true; group.add(mesh); };
  mk(buckets.deck, deckMat, false); mk(buckets.conc, M.concrete); mk(buckets.brass, M.brass, false); mk(buckets.white, M.whitePaint, false); mk(buckets.steel, M.brass);

  // ---------- причальные мачты ----------
  {
    const spots = [["ringB", 60], ["ringB", 180], ["ringB", 300], ["ringD", 90], ["ringD", 270], ["ringC", 0]];
    const mg = mastGeometry(110);
    const lat = new THREE.InstancedMesh(mg.lattice, M.steel, spots.length);
    const top = new THREE.InstancedMesh(mg.top, M.brass, spots.length);
    const beaconGeo = new THREE.SphereGeometry(1.1, 8, 6).translate(0, 126.5, 0);
    const beacon = new THREE.InstancedMesh(beaconGeo, M.glow(0xff2a1a, 5), spots.length);
    spots.forEach(([pid, deg], i) => {
      const p = byId[pid], a = THREE.MathUtils.degToRad(deg), rr = p.rOut - 24;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = p.y;
      const m = place(x, y, z, 0);
      lat.setMatrixAt(i, m); top.setMatrixAt(i, m); beacon.setMatrixAt(i, m);
      masts.push({ x, y, z, top: new THREE.Vector3(x, y + 126, z) });
    });
    lat.castShadow = true; lat.frustumCulled = top.frustumCulled = beacon.frustumCulled = false;
    group.add(lat, top, beacon);
  }

  // ---------- промзона (ringD, южная половина) ----------
  {
    const p = byId.ringD, g = new THREE.Group(); g.position.y = p.y; group.add(g);
    const at = (deg, rr) => { const a = THREE.MathUtils.degToRad(deg); return [Math.cos(a) * rr, Math.sin(a) * rr]; };
    const steel = [], dark = [], brass = [], copper = [];
    for (const [deg, rr, h, rad] of [[60, 1335, 160, 4.2], [76, 1388, 118, 3.4], [101, 1312, 142, 3.8], [126, 1362, 96, 3.0]]) {
      const [x, z] = at(deg, rr);
      const B = new GB();
      revolve(B, [[rad * 1.9, 0], [rad * 1.9, 8], [rad * 1.25, 30], [rad, h - 6], [rad * 1.3, h], [rad * 1.3, h + 2.5], [rad * 0.85, h + 2.5], [rad * 0.85, h - 10]], 20, { smooth: false });
      const geo = B.build().translate(x, 0, z); steel.push(geo);
      for (const yy of [h * 0.35, h * 0.68]) brass.push(new THREE.TorusGeometry(rad * (1.45 - yy / h * 0.42), 0.35, 6, 24).rotateX(Math.PI / 2).translate(x, yy, z));
      vents.push({ pos: new THREE.Vector3(x, p.y + h + 2, z), type: "smoke" });
    }
    for (const [deg, rr, rad, h] of [[34, 1330, 40, 34], [151, 1352, 35, 30], [143, 1298, 30, 26]]) {
      const [x, z] = at(deg, rr);
      const B = new GB();
      revolve(B, [[0, 0], [rad, 0], [rad, h], [rad + 0.6, h + 1.5], [rad * 0.8, h + 5], [0, h + 6]], 36, { smooth: false });
      steel.push(B.build().translate(x, 0, z));
      dark.push(new THREE.TorusGeometry(rad + 0.9, 0.4, 6, 36).rotateX(Math.PI / 2).translate(x, h * 0.5, z));
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; dark.push(new THREE.BoxGeometry(0.7, h + 8, 0.7).translate(x + Math.cos(a) * (rad + 1.2), (h + 8) / 2, z + Math.sin(a) * (rad + 1.2))); }
    }
    for (const [deg, rr, w, d, h, yaw] of [[48, 1300, 70, 44, 18, 0.3], [88, 1345, 90, 40, 20, 1.2], [112, 1385, 60, 36, 16, 0.9], [138, 1325, 80, 40, 18, 1.9], [165, 1375, 70, 36, 16, 2.6], [22, 1385, 60, 34, 15, 0.6], [72, 1398, 56, 30, 14, 1.5]]) {
      const [x, z] = at(deg, rr);
      const B = new GB();
      B.box(x, h / 2, z, w, h, d, yaw);
      for (let k = 0; k < 6; k++) {  // пилообразные фонари
        const t = (k + 0.5) / 6, c = Math.cos(yaw), s = Math.sin(yaw);
        const lx = -w / 2 + w * t, ox = x + lx * c + 0 * s, oz = z - lx * s;
        B.box(ox, h + 2.6, oz, w / 7, 5.2, d * 0.96, yaw);
      }
      dark.push(B.build());
    }
    // эстакада труб
    for (let i = 0; i < 30; i++) {
      const a0 = THREE.MathUtils.degToRad(52 + i * 2.6), a1 = THREE.MathUtils.degToRad(52 + (i + 1) * 2.6);
      const A = new THREE.Vector3(Math.cos(a0) * 1272, 7, Math.sin(a0) * 1272), Bv = new THREE.Vector3(Math.cos(a1) * 1272, 7, Math.sin(a1) * 1272);
      copper.push(tube([A, Bv], 1.25, 8));
      if (i % 3 === 0) dark.push(new THREE.BoxGeometry(0.8, 7, 0.8).translate(A.x, 3.5, A.z));
    }
    // водонапорная башня и кран
    const [wx, wz] = at(94, 1402);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.78; dark.push(new THREE.CylinderGeometry(0.45, 0.6, 36, 6).translate(wx + Math.cos(a) * 5, 18, wz + Math.sin(a) * 5)); }
    { const B = new GB(); revolve(B, [[0, 36], [8, 36], [8, 48], [7, 52], [0, 55]], 20, { smooth: false }); steel.push(B.build().translate(wx, 0, wz)); }
    { const [kx, kz] = at(58, 1396); const B = new GB(); B.box(kx, 22, kz, 2.2, 44, 2.2, 0.4); B.box(kx, 44, kz, 46, 2.4, 2.4, 0.4); dark.push(B.build()); }
    const add = (list, mat, cast) => { if (list.length) { const m = new THREE.Mesh(merge(list), mat); m.castShadow = cast; m.receiveShadow = true; g.add(m); } };
    add(steel, M.steel, true); add(dark, M.concreteDark, true); add(brass, M.brass, false); add(copper, M.copper, false);
  }

  // паровые клапаны по кромкам платформ
  for (const [pid, degs] of [["core", [30, 120, 210, 300]], ["ringB", [15, 105, 195, 285]], ["ringC", [40, 160, 250, 340]], ["ringD", [70, 200]]]) {
    const p = byId[pid];
    for (const deg of degs) { const a = THREE.MathUtils.degToRad(deg); vents.push({ pos: new THREE.Vector3(Math.cos(a) * (p.rOut - 8), p.y + 1.2, Math.sin(a) * (p.rOut - 8)), type: "steam" }); }
  }
  void turbineRings;

  return { group, vents, masts, update() {} };
}
function rMid(plat) { return (plat.rIn + plat.rOut) / 2; }
