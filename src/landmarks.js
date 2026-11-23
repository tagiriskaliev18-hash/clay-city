// ============================================================
// ASTANA REAL v2 — landmarks.js
// Главные символы Астаны:
//   1. Байтерек (105 м, золотой шар D=22 м, белый гиперболоид)
//   2. Хан Шатыр (150 м, наклонный полупрозрачный ETFE-шатёр)
//   3. Дворец Мира и Согласия (Пирамида, 77 м, исправленные нормали + UV!)
//   4. Сфера «Нур Алем» EXPO (D=80 м, diagrid с LED-волной)
// ============================================================
import * as THREE from "three";
import { LANDMARKS } from "./config.js";
import { GB, revolve, tube, bezier, merge } from "./geom.js";

const TAU = Math.PI * 2;
const L = LANDMARKS;

function addMerged(parent, list, mat, cast = true, receive = true) {
  if (!list.length) return null;
  const m = new THREE.Mesh(merge(list), mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

// ---------- 1. БАЙТЕРЕК (105 м) ----------
function buildBayterek(parent, M) {
  const P = L.bayterek;
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "landmark-bayterek";
  parent.add(g);

  const marble = [], granite = [], whiteSteel = [], brass = [], glass = [], glow = [];

  // Монументальный двухуровневый стилобат с парадными лестницами по оси Нуржол
  {
    const B = new GB();
    revolve(B, [[0, 0], [45, 0], [45, 1.4], [39, 1.4], [39, 3.2], [29, 3.2], [29, 5.2], [0, 5.2]], 48, { smooth: false });
    marble.push(B.build());
    // 4 ступенчатых марша (Восток/Запад/Север/Юг)
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const B2 = new GB();
      B2.box(Math.cos(a) * 37, 1.6, Math.sin(a) * 37, 15, 3.2, 16, a);
      granite.push(B2.build());
    }
    brass.push(new THREE.TorusGeometry(41.5, 0.35, 8, 64).rotateX(Math.PI / 2).translate(0, 1.55, 0));
    brass.push(new THREE.TorusGeometry(29.1, 0.30, 8, 56).rotateX(Math.PI / 2).translate(0, 5.28, 0));
  }

  // Панорамная остеклённая шахта лифта в центре ствола
  {
    glass.push(new THREE.CylinderGeometry(3.8, 4.6, 79, 24).translate(0, 44.5, 0));
    for (let y = 16; y <= 76; y += 12) {
      glow.push(new THREE.TorusGeometry(4.35, 0.22, 6, 24).rotateX(Math.PI / 2).translate(0, y, 0));
    }
  }

  // Тонкая ажурная белая сетка-гиперболоид «ствол тополя» — 16 рёбер + корона-ветви
  const N = 16;
  const ribPts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const ca = Math.cos(a), sa = Math.sin(a);
    const pts = bezier(
      [ca * 21.5, 5.0, sa * 21.5],
      [ca * 9.2, 28, sa * 9.2],
      [ca * 6.0, 62, sa * 6.0],
      [ca * 17.8, 92, sa * 17.8],
      20
    );
    ribPts.push(pts);
    whiteSteel.push(tube(pts, 0.48, 6, { taper: (t) => 0.65 - 0.18 * Math.sin(t * Math.PI) }));
    const tip = pts[pts.length - 1];
    const crownPts = bezier(
      [tip.x, tip.y, tip.z],
      [ca * 19.6, 98.5, sa * 19.6],
      [ca * 15.2, 103.8, sa * 15.2],
      [ca * 10.6, 105.6, sa * 10.6],
      8
    );
    whiteSteel.push(tube(crownPts, 0.30, 5));
  }

  // Горизонтальные кольца и ажурные диагональные связи
  for (const idx of [3, 6, 9, 12, 15, 18, 20]) {
    const ring = [];
    for (let i = 0; i <= N; i++) ring.push(ribPts[i % N][idx]);
    whiteSteel.push(tube(ring, 0.26, 5));
  }
  for (let i = 0; i < N; i++) {
    for (const [j0, j1] of [[2, 7], [7, 12], [12, 17], [17, 20]]) {
      whiteSteel.push(tube([ribPts[i][j0], ribPts[(i + 1) % N][j1]], 0.16, 4));
      whiteSteel.push(tube([ribPts[(i + 1) % N][j0], ribPts[i][j1]], 0.16, 4));
    }
  }

  // ЗОЛОТОЙ ШАР БАЙТЕРЕКА (D = 22 м, хамелеон-золото)
  const orb = new THREE.Mesh(new THREE.SphereGeometry(11.2, 44, 32), M.gold);
  orb.position.set(0, 92, 0);
  orb.castShadow = true;
  orb.receiveShadow = true;
  g.add(orb);

  // Меридианы и шпиль
  brass.push(new THREE.TorusGeometry(11.32, 0.20, 6, 48).rotateX(Math.PI / 2).translate(0, 92, 0));
  brass.push(new THREE.TorusGeometry(11.32, 0.16, 6, 48).rotateX(Math.PI / 2).translate(0, 96.5, 0));
  brass.push(new THREE.TorusGeometry(11.32, 0.16, 6, 48).rotateX(Math.PI / 2).translate(0, 87.5, 0));
  brass.push(new THREE.CylinderGeometry(0.10, 0.34, 10, 8).translate(0, 107.8, 0));

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.82, 10, 8), M.glow(0xffd27a, 6));
  beacon.position.set(0, 113.0, 0);
  g.add(beacon);

  addMerged(g, marble, M.marble, true, true);
  addMerged(g, granite, M.graniteLight, true, true);
  addMerged(g, whiteSteel, M.whitePaint, true, true);
  addMerged(g, brass, M.brass, false, true);
  addMerged(g, glass, M.glassBlue, true, true);
  addMerged(g, glow, M.neon(0x00f5ff, 4.2), false, false);

  return { group: g, orb, beacon, pos: new THREE.Vector3(P.x, 92, P.z) };
}

// ---------- 2. ХАН ШАТЫР (150 м, Норман Фостер) ----------
function buildKhanShatyr(parent, M) {
  const P = L.khanShatyr;
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "landmark-khanshatyr";
  parent.add(g);

  const stone = [], glass = [], steel = [], brass = [];
  const Rx = 94, Rz = 80, baseH = 16, apexH = 150, tiltX = -18;

  // Эллиптический стилобат + внутренняя палуба (чтобы сквозь шатёр не просвечивала пустая трава!)
  {
    const segs = 56;
    const pts = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * TAU;
      pts.push([Math.cos(a) * Rx, Math.sin(a) * Rz]);
    }
    const B = new GB();
    for (let j = 0; j < segs; j++) {
      const [x0, z0] = pts[j], [x1, z1] = pts[(j + 1) % segs];
      const dx = x1 - x0, dz = z1 - z0, L2 = Math.hypot(dx, dz) || 1;
      const nx = dz / L2, nz = -dx / L2;
      B.quad([x1, 0, z1], [x0, 0, z0], [x0, baseH, z0], [x1, baseH, z1], [nx, 0, nz], [0, 0], [L2, 0], [L2, baseH], [0, baseH]);
    }
    stone.push(B.build());

    // Верхняя крышка-атриум стилобата
    const deck = new THREE.CylinderGeometry(1, 1, 1.2, 48).scale(Rx * 0.96, 1, Rz * 0.96).translate(0, baseH - 0.6, 0);
    stone.push(deck);

    // Остеклённый пояс в основании стилобата
    const belt = new THREE.CylinderGeometry(1, 1, 7.5, 48, 1, true).scale(Rx * 1.005, 1, Rz * 1.005).translate(0, 6.2, 0);
    glass.push(belt);

    // Главный восточный входной портал (обращён на +X к бульвару Нуржол!)
    const BP = new GB();
    BP.box(Rx + 3, baseH * 0.48, 0, 14, baseH * 0.92, 38, 0);
    stone.push(BP.build());
    const BG = new GB();
    BG.box(Rx + 10.2, baseH * 0.45, 0, 0.8, baseH * 0.72, 30, 0);
    glass.push(BG.build());
  }

  // Наклонный полупрозрачный ETFE-шатёр (MeshPhysicalMaterial)
  const tentMat = M.phys({
    color: 0xe6edf4,
    roughness: 0.22,
    metalness: 0.08,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16,
    transparent: true,
    opacity: 0.80,
    envMapIntensity: 1.45,
    emissive: new THREE.Color(0x66b8ff),
    emissiveIntensity: 0,
    side: THREE.DoubleSide,
  });

  {
    const B = new GB();
    const rings = 24, segs = 56;
    const rows = [];
    const ringPt = (t, a) => {
      const radScale = Math.pow(1 - t, 1.38) * 0.96 + (1 - t) * 0.04;
      const y = baseH + t * (apexH - baseH);
      const cx = tiltX * Math.pow(t, 1.25);
      return [cx + Math.cos(a) * Rx * 0.93 * radScale, y, Math.sin(a) * Rz * 0.93 * radScale];
    };
    for (let j = 0; j <= rings; j++) {
      const t = j / rings;
      const row = [];
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * TAU;
        const p = ringPt(t, a);
        const ca = Math.cos(a), sa = Math.sin(a);
        row.push(B.vert(p[0], p[1], p[2], ca * 0.85, 0.52, sa * 0.85, (i / segs) * 24, t * 18));
      }
      rows.push(row);
    }
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < segs; i++) {
        const a = rows[j][i], b = rows[j + 1][i], c = rows[j + 1][i + 1], d = rows[j][i + 1];
        B.i.push(a, c, b, a, d, c);
      }
    }
    const tentMesh = new THREE.Mesh(B.build(), tentMat);
    tentMesh.castShadow = true;
    tentMesh.receiveShadow = true;
    g.add(tentMesh);

    // Тросовая сетка (меридианы + кольца + внутренний трипод-мачта)
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      const pts = [];
      for (let j = 0; j <= 14; j++) pts.push(new THREE.Vector3(...ringPt(j / 14, a)));
      steel.push(tube(pts, 0.34, 5));
    }
    for (const t of [0.12, 0.25, 0.40, 0.55, 0.70, 0.85, 0.96]) {
      const pts = [];
      for (let i = 0; i <= 44; i++) pts.push(new THREE.Vector3(...ringPt(t, (i / 44) * TAU)));
      steel.push(tube(pts, 0.30, 5));
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.4;
      steel.push(tube([
        new THREE.Vector3(Math.cos(a) * 26, baseH, Math.sin(a) * 22),
        new THREE.Vector3(tiltX, apexH - 4, 0),
      ], 1.15, 6));
    }
    brass.push(new THREE.CylinderGeometry(0.18, 0.68, 16, 10).translate(tiltX, apexH + 6, 0));
  }

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6), M.glow(0xff2a1a, 6));
  beacon.position.set(tiltX, apexH + 14.5, 0);
  g.add(beacon);

  addMerged(g, stone, M.travertine, true, true);
  addMerged(g, glass, M.glassBlue, false, true);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, brass, M.brass, false, true);

  return { group: g, tentMat };
}

// ---------- 3. ДВОРЕЦ МИРА И СОГЛАСИЯ (ПИРАМИДА, 77 м) ----------
function buildPyramid(parent, M) {
  const P = L.pyramid;
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "landmark-pyramid";
  parent.add(g);

  const stone = [], glass = [], steel = [], brass = [];
  const plinthH = 12, half = 31, pyrH = 62, split = 0.64;

  // Ступенчатый гранитный подиум-холм (как в Президентском парке)
  {
    const B = new GB();
    B.box(0, 2.5, 0, 96, 5, 96, 0);
    B.box(0, 8.5, 0, 74, 7, 74, 0);
    stone.push(B.build());
  }

  const y0 = plinthH, yMid = plinthH + pyrH * split, yTop = plinthH + pyrH;
  const hMid = half * (1 - split);
  const corners = (hs) => [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]];
  const c0 = corners(half), cM = corners(hMid);

  {
    const BS = new GB();
    const BG = new GB();
    const apex = [0, yTop, 0];
    const baseEdgeLen = half * 2;
    const midEdgeLen = hMid * 2;
    const lowerSlope = Math.hypot(half - hMid, yMid - y0);
    const upperSlope = Math.hypot(hMid, yTop - yMid);

    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const A0 = [c0[i][0], y0, c0[i][1]], A1 = [c0[j][0], y0, c0[j][1]];
      const M0 = [cM[i][0], yMid, cM[i][1]], M1 = [cM[j][0], yMid, cM[j][1]];

      // Наружная нормаль грани через (A0 - A1) × (M1 - A1) (CCW снаружи!)
      const ex = A0[0] - A1[0], ey = 0, ez = A0[2] - A1[2];
      const fx = M1[0] - A1[0], fy = M1[1] - A1[1], fz = M1[2] - A1[2];
      let nx = ey * fz - ez * fy;
      let ny = ez * fx - ex * fz;
      let nz = ex * fy - ey * fx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;

      // Нижняя каменная грань (CCW: A1 → A0 → M0 → M1, UV в метрах!)
      BS.quad(
        A1, A0, M0, M1,
        [nx, ny, nz],
        [baseEdgeLen, 0], [0, 0],
        [(baseEdgeLen - midEdgeLen) / 2, lowerSlope],
        [(baseEdgeLen + midEdgeLen) / 2, lowerSlope]
      );

      // Верхняя стеклянная витражная вершина (CCW: M1 → M0 → apex, UV в метрах для M.lattice!)
      BG.tri(
        M1, M0, apex,
        [nx, ny, nz],
        [midEdgeLen, 0], [0, 0], [midEdgeLen / 2, upperSlope]
      );

      // 4 угловых ребра пирамиды + тонкие треугольные рёбра-диагонали
      steel.push(tube([new THREE.Vector3(...A0), new THREE.Vector3(...apex)], 0.50, 6));
      for (const frac of [0.22, 0.44, 0.64]) {
        const lx0 = A0[0] * (1 - frac), lz0 = A0[2] * (1 - frac);
        const lx1 = A1[0] * (1 - frac), lz1 = A1[2] * (1 - frac);
        const ly = y0 + pyrH * frac;
        steel.push(tube([new THREE.Vector3(lx0, ly, lz0), new THREE.Vector3(lx1, ly, lz1)], 0.30, 5));
      }
    }
    stone.push(BS.build());
    glass.push(BG.build());

    const pts = cM.map(([x, z2]) => new THREE.Vector3(x, yMid, z2));
    pts.push(pts[0].clone());
    brass.push(tube(pts, 0.46, 6));
  }

  addMerged(g, stone, M.graniteLight, true, true);
  addMerged(g, glass, M.lattice, true, true);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, brass, M.brass, false, true);

  return { group: g };
}

// ---------- 4. СФЕРА «НУР АЛЕМ» EXPO (D=80 м) ----------
function buildNurAlem(parent, M) {
  const P = L.nurAlem;
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "landmark-nuralem";
  parent.add(g);

  const white = [], steel = [], brass = [], glass = [];
  const R = 40, cy = 48;

  // Круговой подиум + парные белые EXPO-павильоны
  {
    const B = new GB();
    revolve(B, [[0, 0], [52, 0], [52, 4], [47, 8], [32, 10], [0, 10]], 48, { smooth: false });
    white.push(B.build());
    for (const s of [-1, 1]) {
      white.push(new THREE.BoxGeometry(26, 15, 56).translate(s * 36, 11.5, 0));
      glass.push(new THREE.BoxGeometry(22, 11, 56.6).translate(s * 36, 11.5, 0));
    }
  }

  // Идеальная стеклянная сфера D=80 м (diagrid с LED-волной ночью)
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), M.diagrid);
  sphere.position.set(0, cy, 0);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  g.add(sphere);

  brass.push(new THREE.TorusGeometry(R + 0.35, 0.42, 8, 64).rotateX(Math.PI / 2).translate(0, cy, 0));
  steel.push(new THREE.TorusGeometry(R * 0.72, 0.52, 8, 48).rotateX(Math.PI / 2).translate(0, cy + R * 0.70, 0));
  steel.push(new THREE.TorusGeometry(R * 0.72, 0.52, 8, 48).rotateX(Math.PI / 2).translate(0, cy - R * 0.70, 0));
  {
    const B = new GB();
    B.box(0, cy + R + 1.2, 0, 26, 2.4, 6, 0);
    steel.push(B.build());
  }

  const ringNeon = new THREE.Mesh(new THREE.TorusGeometry(48.0, 0.32, 6, 64).rotateX(Math.PI / 2), M.neon(0x00f5ff, 4.5));
  ringNeon.position.y = 7.8;
  g.add(ringNeon);

  addMerged(g, white, M.whitePaint, true, true);
  addMerged(g, glass, M.glassBlue, false, true);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, brass, M.brass, false, true);

  return { group: g, sphere };
}

export function buildLandmarks(scene, M, ctx) {
  const group = new THREE.Group();
  group.name = "landmarks-main";
  scene.add(group);

  const bayterek = buildBayterek(group, M);
  const khan = buildKhanShatyr(group, M);
  const pyramid = buildPyramid(group, M);
  const nurAlem = buildNurAlem(group, M);

  void pyramid; void nurAlem;

  const anchors = {
    bayterek: bayterek.pos,
  };

  return {
    group,
    anchors,
    update(dt, time, _cam, cyberMix) {
      void dt; void cyberMix;
      const night = ctx.U.uNight.value;
      if (khan.tentMat) {
        khan.tentMat.emissiveIntensity = night * (0.55 + 0.14 * Math.sin(time * 0.8));
      }
    },
  };
}
