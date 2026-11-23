// ============================================================
// ASTANA 2077 — флот жёстких дирижаблей + летающий аэротрафик.
// Дирижабли: настоящие цеппелины (L/D ≈ 6.7), оперение, гондола,
// мотогондолы с винтами, огни, прожекторы, QazaqGaz flagship.
// Аэротрафик: 120+ спинеров в 3 эшелонах с неоновыми фарами.
// ВСЁ скрыто при cyberMode=false!
// ============================================================
import * as THREE from "three";
import { rng, between, GB, revolve, tube, merge } from "./geom.js";
import { U } from "./env.js";
import { REG } from "./materials.js";
import { signTexture } from "./textures.js";

const TAU = Math.PI * 2;
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _h = new THREE.Matrix4(), _rot = new THREE.Matrix4();
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
const _tan = new THREE.Vector3(), _v = new THREE.Vector3();

// ---------- корпус: радиус по длине (t: 0 нос → 1 корма) ----------
function hullR(t) {
  if (t < 0.18) { const u = t / 0.18; return Math.sqrt(1 - (1 - u) * (1 - u)); }
  if (t < 0.62) return 1;
  const u = (t - 0.62) / 0.38; return 1 - Math.pow(u, 1.8);
}
function hullGeo(L, D, stations, radial, scallop = 0, frames = 22) {
  const R = D / 2, B = new GB(), cols = radial + 1, bases = [];
  for (let i = 0; i <= stations; i++) {
    const t = i / stations;
    let r = R * hullR(t);
    if (scallop) r *= 1 - scallop * (0.5 - 0.5 * Math.cos(t * frames * TAU));
    const z = (0.5 - t) * L;
    const dr = R * (hullR(Math.min(1, t + 1e-3)) - hullR(Math.max(0, t - 1e-3))) / 2e-3, dz = -L;
    const nl = Math.hypot(dr, dz) || 1, nr = -dz / nl, nz = dr / nl;
    bases.push(B.v);
    for (let j = 0; j <= radial; j++) {
      const phi = (j / radial) * TAU, sp = Math.sin(phi), cp = Math.cos(phi);
      B.vert(r * sp, r * cp, z, nr * sp, nr * cp, nz, t, phi / TAU);
    }
  }
  for (let i = 0; i < stations; i++) for (let j = 0; j < radial; j++) {
    const a = bases[i] + j, b = a + 1, c = bases[i + 1] + j + 1, d = c - 1;
    B.i.push(a, b, c, a, c, d);
  }
  const g = B.build(); g.computeBoundingSphere(); return g;
}

function bodyProfile(len, rad, rear = 0.2, front = 0.26) {
  const pts = [], N = 24;
  for (let i = 0; i <= N; i++) {
    const u = i / N; let rr;
    if (u < rear) { const w = u / rear; rr = rad * Math.sqrt(Math.max(0, 1 - (1 - w) * (1 - w))); }
    else if (u > 1 - front) { const w = (u - (1 - front)) / front; rr = rad * Math.sqrt(Math.max(0, 1 - w * w)); }
    else rr = rad * (1 - 0.04 * Math.sin((u - rear) / (1 - rear - front) * Math.PI));
    pts.push([Math.max(0, rr), u * len]);
  }
  return pts;
}
function latheZ(prof, segs, sx = 1, sy = 1) {
  const B = new GB(); revolve(B, prof, segs, { smooth: true });
  const g = B.build(); g.rotateX(Math.PI / 2);
  if (sx !== 1 || sy !== 1) g.scale(sx, sy, 1);
  return g;
}

function plate(poly, thRoot, thTip, sMin, sMax) {
  const B = new GB(), v2 = poly.map(([z, s]) => new THREE.Vector2(z, s));
  const faces = THREE.ShapeUtils.triangulateShape(v2, []);
  const th = (s) => (thRoot + (thTip - thRoot) * THREE.MathUtils.clamp((s - sMin) / (sMax - sMin || 1), 0, 1)) / 2;
  const n = poly.length, P = (i, side) => [side * th(poly[i][1]), poly[i][1], poly[i][0]];
  for (const side of [-1, 1]) {
    for (const f of faces) {
      const [a, b, c] = f;
      const area = (poly[b][0] - poly[a][0]) * (poly[c][1] - poly[a][1]) - (poly[b][1] - poly[a][1]) * (poly[c][0] - poly[a][0]);
      const flip = ((area > 0 ? -1 : 1) !== side);
      const A = P(a, side), Bv = P(flip ? c : b, side), C = P(flip ? b : c, side);
      B.tri(A, Bv, C, [side, 0, 0], [A[2], A[1]], [Bv[2], Bv[1]], [C[2], C[1]]);
    }
  }
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], dz = b[0] - a[0], ds = b[1] - a[1], l = Math.hypot(dz, ds) || 1;
    const nn = [0, -dz / l, ds / l];
    B.quad(P(i, -1), P((i + 1) % n, -1), P((i + 1) % n, 1), P(i, 1), nn, [0, 0], [l, 0], [l, 0.3], [0, 0.3]);
  }
  return B.build();
}
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function classGeos(L, D, hi) {
  const R = D / 2, k = L / 200, zOf = (t) => (0.5 - t) * L, rAt = (t) => R * hullR(t);
  const out = {};
  out.hull = hi ? hullGeo(L, D, 150, 48, 0.009, 22) : null;
  const tLE0 = 0.70, tLE1 = 0.885, tTE0 = 0.955, tTE1 = 0.988, sTip = 1.30 * R;
  const rootLE = [zOf(tLE0), rAt(tLE0) - 0.4], tipLE = [zOf(tLE1), sTip], tipTE = [zOf(tTE1), sTip * 0.97], rootTE = [zOf(tTE0), rAt(tTE0) - 0.4];
  const tHR = tLE0 + (tTE0 - tLE0) * 0.7;
  const hRoot = [zOf(tHR), rAt(tHR) - 0.4], hTip = lerp2(tipLE, tipTE, 0.7);
  const arc = [];
  for (let i = 1; i < 5; i++) { const t = tHR - (tHR - tLE0) * (i / 5); arc.push([zOf(t), rAt(t) - 0.4]); }
  const finPoly = [rootLE, tipLE, hTip, hRoot, ...arc];
  const rudPoly = [hRoot, hTip, tipTE, rootTE];
  const finG = hi ? plate(finPoly, 2.6 * k, 0.5 * k, 0, sTip) : plate([rootLE, tipLE, [zOf(tTE1), sTip * 0.97], [zOf(0.95), rAt(0.95)]], 2.2 * k, 0.5 * k, 0, sTip);
  const rudG = plate(rudPoly, 0.7 * k, 0.4 * k, 0, sTip);
  const finParts = [];
  for (let f = 0; f < 4; f++) finParts.push(finG.clone().rotateZ(f * Math.PI / 2));
  if (hi) {
    for (const [p0, p1] of [[64, 84], [276, 296]]) {
      const B = new GB(), N = 40;
      for (let i = 0; i < N; i++) {
        const ta = 0.07 + (0.90 - 0.07) * (i / N), tb = 0.07 + (0.90 - 0.07) * ((i + 1) / N);
        const pt = (t, ph) => { const r = rAt(t) + 0.06; return [r * Math.sin(ph / 180 * Math.PI), r * Math.cos(ph / 180 * Math.PI), zOf(t)]; };
        const a = pt(ta, p0), b = pt(ta, p1), c = pt(tb, p1), d = pt(tb, p0);
        const nx = Math.sin((p0 + p1) / 360 * Math.PI), ny = Math.cos((p0 + p1) / 360 * Math.PI);
        B.quad(a, b, c, d, [nx, ny, 0], [0, 0], [1, 0], [1, 1], [0, 1]);
      }
      finParts.push(B.build());
    }
  }
  out.livery = merge(finParts);
  out.rudder = rudG;
  out.hinge = { pivot: new THREE.Vector3(0, hRoot[1], hRoot[0]), axis: new THREE.Vector3(0, hTip[1] - hRoot[1], hTip[0] - hRoot[0]).normalize() };
  const gl = 0.13 * L, gw = 0.026 * L, gh = 0.0165 * L, gz = 0.23 * L, gy = -R - gh / 2 + 0.5 * k;
  const gond = latheZ(bodyProfile(gl, gh / 2), hi ? 28 : 12, gw / gh, 1);
  gond.translate(0, gy, gz - gl / 2);
  const keel = new THREE.BoxGeometry(0.05 * L * 0.25, 0.5 * k, gl * 0.8).translate(0, gy - gh / 2 - 0.25 * k, gz);
  const wheels = [];
  for (const dz of [-gl * 0.36, gl * 0.38]) { const w = new THREE.CylinderGeometry(0.75 * k, 0.75 * k, 0.45 * k, 12).rotateZ(Math.PI / 2); w.translate(0, gy - gh / 2 - 0.6 * k, gz + dz); wheels.push(w); }
  const cl = 0.046 * L, cr = 0.0125 * L, gap = 0.17 * D;
  const cars = [], struts = [], hubs = [], pipes = [];
  out.propLocal = []; out.emitLocal = [];
  for (const t of [0.30, 0.62]) for (const phi of [128, 232]) {
    const a = phi / 180 * Math.PI, dir = new THREE.Vector3(Math.sin(a), Math.cos(a), 0);
    const hp = new THREE.Vector3(dir.x * rAt(t), dir.y * rAt(t), zOf(t));
    const cc = hp.clone().addScaledVector(dir, gap);
    const car = latheZ(bodyProfile(cl, cr, 0.28, 0.34), hi ? 16 : 8);
    car.translate(cc.x, cc.y, cc.z - cl / 2);
    cars.push(car);
    const to = (dt2, dphi) => { const b = (phi + dphi) / 180 * Math.PI, tt = t + dt2; return new THREE.Vector3(Math.sin(b) * rAt(tt) * 0.995, Math.cos(b) * rAt(tt) * 0.995, zOf(tt)); };
    const top = cc.clone().addScaledVector(dir, -cr * 0.5);
    for (const [dz, dt2, dphi] of [[cl * 0.36, -0.016, -7], [cl * 0.36, -0.016, 7], [-cl * 0.4, 0.02, 0]]) {
      const s0 = top.clone(); s0.z += dz;
      struts.push(tube([s0, to(dt2, dphi)], 0.11 * Math.max(k, 0.6), 5));
    }
    const hub = new THREE.CylinderGeometry(0.58 * k, 0.1 * k, 1.3 * k, 10).rotateX(Math.PI / 2);
    hub.translate(cc.x, cc.y, cc.z - cl / 2 - 0.9 * k);
    hubs.push(hub);
    for (const off of [-0.5, 0.5]) {
      const base = cc.clone().addScaledVector(dir, -cr * 0.75); base.x += off * cr * 0.6 * dir.y; base.y -= off * cr * 0.6 * dir.x;
      const e2 = base.clone().addScaledVector(dir, -1.6 * k); e2.z -= 2.6 * k;
      pipes.push(tube([base, e2], 0.17 * k, 6));
    }
    out.propLocal.push(new THREE.Matrix4().makeTranslation(cc.x, cc.y, cc.z - cl / 2 - 1.6 * k));
    out.emitLocal.push(new THREE.Vector3(cc.x, cc.y, cc.z - cl / 2 - 2.8 * k));
  }
  out.cars = merge([...cars, ...struts, ...pipes]);
  const blade = new THREE.BoxGeometry(0.3 * k, 1.05 * k, 0.07 * k).translate(0, 1.3 * k, 0).rotateY(0.42);
  const blades = [];
  for (let b = 0; b < 4; b++) blades.push(blade.clone().rotateZ((b / 4) * TAU));
  out.prop = merge(blades);
  out.disc = new THREE.CircleGeometry(1.9 * k, 20);
  const nose = new THREE.CylinderGeometry(0.18 * k, 1.05 * k, 3.4 * k, 14).rotateX(Math.PI / 2).translate(0, 0, L / 2 + 1.2 * k);
  const ridge = new THREE.BoxGeometry(0.8 * k, 0.32 * k, 0.44 * L).translate(0, R + 0.08, -0.05 * L);
  out.brass = hi ? merge([nose, ...hubs]) : nose;
  out.metal = hi ? merge([gond, keel, ...wheels, ridge, out.cars]) : merge([gond, ridge, out.cars]);
  const shield = new THREE.BoxGeometry(gw * 0.72, 0.85 * k, 0.12 * k).translate(0, gy + gh * 0.2, gz + gl / 2 - 0.5 * k);
  out.dark = hi ? merge([shield]) : null;
  const strip = new THREE.BoxGeometry(gw + 0.08 * k, 0.95 * k, gl * 0.66).translate(0, gy + gh * 0.17, gz - gl * 0.02);
  out.windows = strip;
  out.navRed = new THREE.SphereGeometry(0.5 * k, 8, 6).translate(R + 0.5 * k, 0, zOf(0.34));
  out.navGreen = new THREE.SphereGeometry(0.5 * k, 8, 6).translate(-R - 0.5 * k, 0, zOf(0.34));
  out.navWhite = merge([
    new THREE.SphereGeometry(0.45 * k, 8, 6).translate(0, 0, -L / 2 - 0.4 * k),
    new THREE.SphereGeometry(0.45 * k, 8, 6).translate(0, -R - 0.6 * k, zOf(0.52)),
  ]);
  return out;
}

function windowStripTexture() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#0c1013"; g.fillRect(0, 0, 512, 64);
  for (let x = 8; x < 500; x += 32) { g.fillStyle = "#ffd7a0"; g.fillRect(x, 19, 20, 26); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

class Part {
  constructor(scene, geos, mat, per, cap, cast = true, recv = true) {
    this.per = per; this.cap = cap;
    this.meshes = geos.map((g) => {
      if (!g) return null;
      const m = new THREE.InstancedMesh(g, mat, Math.max(1, cap * per));
      m.count = 0; m.frustumCulled = false; m.castShadow = cast; m.receiveShadow = recv;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(m);
      return m;
    });
  }
}

export function buildAirships(scene, M, ctx) {
  const r = rng(1888);
  const tier = ctx.tier;

  // Всё в группе, скрывается при cyberMode=false
  const airGroup = new THREE.Group();
  airGroup.name = "airships-layer";
  airGroup.visible = false; // скрыт при старте!
  scene.add(airGroup);

  const CLASSES = [
    { L: 200, D: 30, n: 1, speed: 14, hero: true },
    { L: 130, D: 22, n: 1, speed: 16, hero: false },
    { L: 80,  D: 14, n: 1, speed: 20, hero: false },
  ];
  const LIVERIES = [0x7a1f1f, 0x1d3a6b, 0x1f5a3c, 0x1b1b1e, 0xe9e2d0, 0x8a4a1e, 0x3a2a5e, 0x0f3d4a, 0x5c1f33, 0x2a3b2e, 0x6b5a2a, 0x20242a]
    .map((h) => new THREE.Color(h));
  const liveryMat = M.std({ color: 0xffffff, roughness: 0.5, metalness: 0.08, envMapIntensity: 0.8 });
  const metalMat = M.std({ color: 0xb9b6ab, roughness: 0.4, metalness: 0.6 });
  const stripTex = windowStripTexture(); stripTex.repeat.set(1, 1);
  const winMat = M.std({ map: stripTex, emissiveMap: stripTex, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.3, metalness: 0.4 });
  REG.windows.push({ m: winMat, k: 2.6 });
  const red = M.glow(0xff1f10, 6), green = M.glow(0x1fff66, 6), white = M.glow(0xffffff, 6);
  const discMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });

  // QazaqGaz flagship ad (увеличенный, высококонтрастный)
  const adTex = signTexture("QAZAQGAZ", { w: 768, h: 224, color: "#00F5FF", bg: "rgba(4,12,24,0.96)" });
  const adMat = M.std({ map: adTex, emissiveMap: adTex, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.4, metalness: 0.15, side: THREE.FrontSide });
  REG.windows.push({ m: adMat, k: 2.6 });

  const groups = CLASSES.map((c) => {
    const hi = classGeos(c.L, c.D, true), lo = classGeos(c.L, c.D, false);
    const cap = c.n, P2 = (geos, mat, per = 1, cast = true, recv = true) => new Part(airGroup, geos, mat, per, cap, cast, recv);
    return {
      cfg: c, hinge: hi.hinge, propLocal: hi.propLocal, emitLocal: hi.emitLocal,
      parts: [
        P2([hi.hull, lo.hull || hullGeo(c.L, c.D, 44, 26), hullGeo(c.L, c.D, 16, 10)], M.hull),
        P2([hi.livery, lo.livery, lo.livery], liveryMat, 1, true, false),
        P2([hi.rudder, hi.rudder, null], liveryMat, 4, true, false),
        P2([hi.metal, lo.metal, lo.metal], metalMat),
        P2([hi.brass, lo.brass, null], M.brass),
        P2([hi.prop, hi.prop, null], M.wood, 4),
        P2([hi.disc, null, null], discMat, 4, false, false),
        P2([hi.windows, hi.windows, null], winMat, 1, false, false),
        P2([hi.dark, hi.dark, null], M.darkMetal),
        P2([hi.navRed, hi.navRed, hi.navRed], red, 1, false),
        P2([hi.navGreen, hi.navGreen, hi.navGreen], green, 1, false),
        P2([hi.navWhite, hi.navWhite, hi.navWhite], white, 1, false),
      ],
    };
  });

  groups.forEach((g) => {
    for (const part of g.parts) {
      if (!part.meshes[0] || part.meshes[0].material !== liveryMat) continue;
      for (const m of part.meshes) {
        if (!m) continue;
        m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, g.cfg.n * part.per) * 3), 3);
        m.instanceColor.setUsage(THREE.DynamicDrawUsage);
      }
    }
  });

  // ---------- маршруты и борта (вдоль оси Нуржол и над QazaqGaz HQ!) ----------
  const ships = [];
  const d01 = tier.lod[0] * 0.9, d12 = tier.lod[1];
  CLASSES.forEach((c, ci) => {
    for (let i = 0; i < c.n; i++) {
      let pts = [];
      let startT = r();
      let spd = c.speed * (0.85 + r() * 0.3) * (r() < 0.5 ? 1 : -1);

      if (ci === 0 && i === 0) {
        // ★ ФЛАГМАН QAZAQGAZ — спокойно патрулирует на высоте y = 290 м ★
        pts = [
          new THREE.Vector3(520, 290, 40),
          new THREE.Vector3(380, 292, -160),
          new THREE.Vector3(40,  294, -260),
          new THREE.Vector3(-380, 290, -140),
          new THREE.Vector3(-420, 288, 180),
          new THREE.Vector3(-60, 290, 320),
          new THREE.Vector3(340, 292, 260),
          new THREE.Vector3(530, 290, 160),
        ];
        startT = 0.04;
        spd = 14;
      } else if (ci === 1) {
        // Дальний дирижабль #2 — на высоте y = 350 м
        const n = 8, baseR = 960;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TAU;
          pts.push(new THREE.Vector3(Math.cos(a) * baseR, 350 + Math.sin(k) * 8, Math.sin(a) * baseR * 0.8));
        }
        startT = 0.35;
        spd = 16;
      } else {
        // Дальний малый дирижабль #3 — на высоте y = 250 м
        const n = 8, baseR = 900;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TAU;
          pts.push(new THREE.Vector3(Math.cos(a) * baseR, 250 + Math.cos(k) * 8, Math.sin(a) * baseR * 0.85));
        }
        startT = 0.72;
        spd = -20;
      }
      const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal", 0.5);
      const liv = (ci === 0 && i === 0) ? new THREE.Color(0x0c345c) : LIVERIES[(r() * LIVERIES.length) | 0];
      ships.push({
        cls: ci, curve, len: curve.getLength(), t: startT, speed: spd,
        bank: 0, prevYaw: null, rudder: 0, elev: 0, propSpin: r() * TAU, level: 1,
        ph: [r() * TAU, r() * TAU, r() * TAU, r() * TAU], heaveA: 2.0 + r() * 2.0,
        pos: new THREE.Vector3(), quat: new THREE.Quaternion(), matrix: new THREE.Matrix4(), liv,
        emitters: [0, 1, 2, 3].map(() => new THREE.Vector3()), speedNow: 0,
      });
    }
  });

  // ---------- прожекторы лайнеров ----------
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uNight: U.uNight, uCyber: U.uCyber },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vW;
      void main(){ vY = clamp(position.z / 520.0, 0.0, 1.0); vN = normalize(normalMatrix * normal);
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uNight, uCyber; varying float vY; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 V = normalize(cameraPosition - vW); float edge = abs(dot(V, normalize(vN)));
        float a = (0.11 - 0.09 * edge) * pow(1.0 - vY, 1.9) * uNight * uCyber;
        gl_FragColor = vec4(vec3(1.0, 0.92, 0.78) * a * 2.0, a); }`,
  });
  const beamGeo = new THREE.CylinderGeometry(1.0, 40, 520, 20, 1, true).translate(0, -260, 0).rotateX(-Math.PI / 2);
  const heroes = [];
  ships.filter((s) => s.cls === 0).forEach((s) => {
    const spot = new THREE.SpotLight(0xa8e8ff, 0, 1600, 0.22, 0.85, 1.85);
    const target = new THREE.Object3D();
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.frustumCulled = false; beam.renderOrder = 6;
    airGroup.add(spot, target, beam);
    spot.target = target;
    s.ad = new THREE.Mesh(new THREE.PlaneGeometry(36, 11.2), adMat);
    s.adBack = s.ad.clone();
    airGroup.add(s.ad, s.adBack);
    heroes.push({ s, spot, target, beam, ph: r() * TAU });
  });

  // ========== ЛЕТАЮЩИЙ АЭРОТРАФИК (72 спинера в воздушных коридорах + орбитах) ==========
  const spinnerCount = Math.round(72 * ((tier.particles) || 1));
  const spinnerGeo = merge([
    new THREE.BoxGeometry(1.9, 0.65, 3.8), // корпус
    new THREE.BoxGeometry(3.2, 0.16, 0.9).translate(0, 0.1, -0.4), // крылья
  ]);
  const spinnerMat = M.std({ color: 0x161922, roughness: 0.32, metalness: 0.78, envMapIntensity: 0.9 });
  const headlightMat = M.neon(0x00F5FF, 6.8, 0.0); // циановые фары + лучи
  const taillightMat = M.neon(0xFF2A85, 6.2, 0.0); // маджента световые шлейфы
  const headGeo = merge([
    new THREE.BoxGeometry(0.32, 0.22, 1.8).translate(-0.58, 0, 2.5),
    new THREE.BoxGeometry(0.32, 0.22, 1.8).translate(0.58, 0, 2.5),
  ]);
  const tailGeo = merge([
    new THREE.BoxGeometry(0.22, 0.16, 13.5).translate(-0.62, 0.05, -8.5),
    new THREE.BoxGeometry(0.22, 0.16, 13.5).translate(0.62, 0.05, -8.5),
  ]);
  const spinnerBody = new THREE.InstancedMesh(spinnerGeo, spinnerMat, spinnerCount);
  const spinnerHeads = new THREE.InstancedMesh(headGeo, headlightMat, spinnerCount);
  const spinnerTails = new THREE.InstancedMesh(tailGeo, taillightMat, spinnerCount);
  spinnerBody.frustumCulled = spinnerHeads.frustumCulled = spinnerTails.frustumCulled = false;
  spinnerBody.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  spinnerHeads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  spinnerTails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  airGroup.add(spinnerBody, spinnerHeads, spinnerTails);

  const spinners = [];
  const ECHELONS = [95, 148, 215]; // 3 воздушных эшелона над бульваром и башнями
  // Воздушные магистрали вдоль Нуржола (X) и проспекта Мәңгілік Ел (Z)
  const LANES = [
    { axis: "x", fixed: +62,  dir: +1, min: -1150, max: 1150 },
    { axis: "x", fixed: -62,  dir: -1, min: -1150, max: 1150 },
    { axis: "x", fixed: +165, dir: +1, min: -1050, max: 1150 },
    { axis: "x", fixed: -165, dir: -1, min: -1050, max: 1150 },
    { axis: "z", fixed: +90,  dir: +1, min: -750,  max: 950  },
    { axis: "z", fixed: +125, dir: -1, min: -750,  max: 950  },
  ];
  for (let i = 0; i < spinnerCount; i++) {
    const echelon = ECHELONS[i % 3];
    if (i < Math.floor(spinnerCount * 0.72)) {
      const lane = LANES[i % LANES.length];
      spinners.push({
        mode: "lane",
        axis: lane.axis,
        fixed: lane.fixed + between(r, -16, 16),
        dir: lane.dir,
        min: lane.min,
        max: lane.max,
        t0: r(),
        speed: between(r, 42, 78),
        alt: echelon + between(r, -16, 16),
        phase: r() * TAU,
      });
    } else {
      const baseR = 95 + r() * 480;
      const a0 = r() * TAU;
      const speed = between(r, 0.12, 0.28) * (r() < 0.5 ? 1 : -1);
      const alt = echelon + between(r, -20, 20);
      spinners.push({ mode: "orbit", r: baseR, a: a0, speed, alt, phase: r() * TAU });
    }
  }

  const finRot = [0, 1, 2, 3].map((k) => new THREE.Matrix4().makeRotationZ((k * Math.PI) / 2));
  const _tr = new THREE.Matrix4();
  const UPV = new THREE.Vector3(0, 1, 0), ZERO = new THREE.Vector3();
  const _dir = new THREE.Vector3(), _pv = new THREE.Vector3();

  function update(dt, time, camera) {
    if (!airGroup.visible) return;
    const cam = camera.position;
    const night = U.uNight.value;
    const counts = [0, 0, 0].map(() => [0, 0, 0]);
    for (let si = 0; si < ships.length; si++) {
      const s = ships[si], g = groups[s.cls], dir = Math.sign(s.speed);
      s.t = (s.t + (Math.abs(s.speed) * dt) / s.len * dir + 1) % 1;
      s.curve.getPointAt(s.t, s.pos);
      s.curve.getTangentAt(s.t, _tan);
      s.pos.y += Math.sin(time * 0.21 + s.ph[0]) * s.heaveA;
      const yaw = Math.atan2(_tan.x * dir, _tan.z * dir);
      const pitch = -Math.asin(THREE.MathUtils.clamp(_tan.y * dir, -1, 1));
      if (s.prevYaw === null) s.prevYaw = yaw;
      let dy = yaw - s.prevYaw;
      if (dy > Math.PI) dy -= TAU; else if (dy < -Math.PI) dy += TAU;
      s.prevYaw = yaw;
      const yawRate = dy / Math.max(dt, 1e-4);
      const target = THREE.MathUtils.clamp(-Math.atan(yawRate * Math.abs(s.speed) / 9.81), -0.44, 0.44);
      s.bank += (target - s.bank) * Math.min(1, dt * 0.9);
      const roll = s.bank + Math.sin(time * 0.33 + s.ph[1]) * 0.026 + Math.sin(time * 21 + s.ph[2]) * 0.0022;
      const pit = pitch + Math.sin(time * 0.27 + s.ph[2]) * 0.014 + Math.sin(time * 19 + s.ph[3]) * 0.0018;
      s.rudder += (THREE.MathUtils.clamp(-yawRate * 2.4, -0.42, 0.42) - s.rudder) * Math.min(1, dt * 2);
      s.elev += (THREE.MathUtils.clamp(yawRate * 3.0, -0.3, 0.3) - s.elev) * Math.min(1, dt * 2);
      s.propSpin += dt * 34 * Math.abs(s.speed) / 30;
      _e.set(pit, yaw, roll, "YXZ");
      s.quat.setFromEuler(_e);
      s.matrix.compose(s.pos, s.quat, _s);
      s.speedNow = Math.abs(s.speed);
      const dx = s.pos.x - cam.x, dy2 = s.pos.y - cam.y, dz = s.pos.z - cam.z, d2 = dx * dx + dy2 * dy2 + dz * dz;
      s.level = d2 < d01 * d01 ? 0 : d2 < d12 * d12 ? 1 : 2;
      counts[s.cls][s.level]++;
      for (let i = 0; i < 4; i++) s.emitters[i].copy(g.emitLocal[i]).applyMatrix4(s.matrix);
    }
    const idx = counts.map(() => [0, 0, 0]);
    for (let si = 0; si < ships.length; si++) {
      const s = ships[si], g = groups[s.cls], lv = s.level;
      // FIX: у каждого LOD-уровня свой InstancedMesh, индексация с 0!
      const i0 = idx[s.cls][lv];
      const ru = [s.rudder, -s.elev, -s.rudder, s.elev];
      for (let pi = 0; pi < g.parts.length; pi++) {
        const part = g.parts[pi], mesh = part.meshes[lv];
        if (!mesh) continue;
        const o = i0 * part.per;
        if (pi === 2) {
          const ax = g.hinge.axis, pv = g.hinge.pivot;
          for (let k = 0; k < 4; k++) {
            _rot.makeRotationAxis(ax, ru[k]);
            _h.makeTranslation(-pv.x, -pv.y, -pv.z).premultiply(_rot).premultiply(_tr.makeTranslation(pv.x, pv.y, pv.z));
            _m.multiplyMatrices(s.matrix, finRot[k]).multiply(_h);
            mesh.setMatrixAt(o + k, _m);
          }
        } else if (pi === 5 || pi === 6) {
          for (let k = 0; k < 4; k++) {
            _m.multiplyMatrices(s.matrix, g.propLocal[k]);
            if (pi === 5) { _rot.makeRotationZ(s.propSpin); _m.multiply(_rot); }
            mesh.setMatrixAt(o + k, _m);
          }
        } else {
          mesh.setMatrixAt(o, s.matrix);
        }
        if (mesh.instanceColor) for (let k = 0; k < part.per; k++) mesh.setColorAt(o + k, s.liv);
      }
      idx[s.cls][lv]++;
    }
    for (let ci = 0; ci < groups.length; ci++) for (const part of groups[ci].parts) for (let lv = 0; lv < 3; lv++) {
      const m = part.meshes[lv]; if (!m) continue;
      m.count = counts[ci][lv] * part.per;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      if (part.meshes[lv].material === red || part.meshes[lv].material === green || part.meshes[lv].material === white) m.visible = night > 0.03;
    }
    for (const h of heroes) {
      const s = h.s;
      _pv.set(0, -18.6, 52).applyMatrix4(s.matrix);
      h.spot.position.copy(_pv);
      const sweep = Math.sin(time * 0.23 + h.ph) * 0.8;
      _v.set(Math.sin(sweep) * 300, -520, 120 + Math.cos(sweep) * 160).applyMatrix4(s.matrix);
      h.target.position.copy(_v);
      h.spot.intensity = night * 14000;
      h.beam.position.copy(_pv);
      h.beam.lookAt(_v);
      h.beam.visible = night > 0.03;
    }
    for (const s of ships) {
      if (!s.ad) continue;
      const R = CLASSES[s.cls].D / 2;
      for (let j = 0; j < 2; j++) {
        const side = j === 0 ? 1 : -1, m = j === 0 ? s.ad : s.adBack;
        _pv.set(side * (R + 1.8), 1.5, 4).applyMatrix4(s.matrix);
        m.position.copy(_pv);
        m.quaternion.copy(s.quat).multiply(_q.setFromAxisAngle(_dir.set(0, 1, 0), side * Math.PI / 2));
      }
    }

    // --- АЭРОТРАФИК (спинеры в коридорах + орбитальные) ---
    for (let i = 0; i < spinners.length; i++) {
      const sp = spinners[i];
      let x, z, yaw;
      const y = sp.alt + Math.sin(time * 0.55 + sp.phase) * 2.5;
      if (sp.mode === "lane") {
        const span = sp.max - sp.min;
        let u = (sp.t0 + (sp.dir * sp.speed * time) / span) % 1;
        if (u < 0) u += 1;
        const along = sp.min + u * span;
        if (sp.axis === "x") {
          x = along; z = sp.fixed;
          yaw = sp.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          x = sp.fixed; z = along;
          yaw = sp.dir > 0 ? 0 : Math.PI;
        }
      } else {
        sp.a += sp.speed * dt;
        x = Math.cos(sp.a) * sp.r;
        z = Math.sin(sp.a) * sp.r;
        yaw = Math.atan2(-Math.sin(sp.a) * Math.sign(sp.speed), Math.cos(sp.a) * Math.sign(sp.speed));
      }
      _q.setFromAxisAngle(UPV, yaw);
      _m.compose(_p.set(x, y, z), _q, _s);
      spinnerBody.setMatrixAt(i, _m);
      spinnerHeads.setMatrixAt(i, _m);
      spinnerTails.setMatrixAt(i, _m);
    }
    spinnerBody.instanceMatrix.needsUpdate = true;
    spinnerHeads.instanceMatrix.needsUpdate = true;
    spinnerTails.instanceMatrix.needsUpdate = true;
    spinnerBody.count = spinnerHeads.count = spinnerTails.count = spinners.length;
  }

  return {
    group: airGroup, ships, spinners,
    setCyber(on) { airGroup.visible = on; },
    update,
  };
}
