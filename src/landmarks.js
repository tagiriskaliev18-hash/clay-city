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

// ---------- 5. MEGA SILK WAY (x: -180, z: +940, западнее Нур Алем) ----------
function makeMallSignTexture(title, sub = "SHOPPING & ENTERTAINMENT") {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 192;
  const g = c.getContext("2d");
  g.fillStyle = "#101a2a";
  g.fillRect(0, 0, 1024, 192);
  g.fillStyle = "#e8344c";
  g.fillRect(0, 0, 1024, 12);
  g.fillRect(0, 180, 1024, 12);
  g.fillStyle = "#ffffff";
  g.font = "800 96px 'Segoe UI', Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(title, 512, 86);
  g.fillStyle = "#62e2ff";
  g.font = "600 26px 'Segoe UI', Arial, sans-serif";
  g.fillText(sub, 512, 148);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function makeMegaParkingTexture() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#2b2e34";
  g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "#e2e6ea";
  g.lineWidth = 3;
  // Парковочные ряды и разметка проездов
  for (const rowY of [88, 224, 360]) {
    g.beginPath(); g.moveTo(28, rowY); g.lineTo(996, rowY); g.stroke();
    g.beginPath(); g.moveTo(28, rowY + 72); g.lineTo(996, rowY + 72); g.stroke();
    for (let x = 40; x <= 984; x += 26) {
      g.beginPath(); g.moveTo(x, rowY); g.lineTo(x, rowY + 72); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function buildMegaSilkWay(parent, M) {
  const P = L.megaSilkWay;
  if (!P) return { group: new THREE.Group() };
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "landmark-megasilkway";
  parent.add(g);

  const white = [], dark = [], glassBlue = [], glassSkylight = [], plaza = [], water = [];
  const W = 240, D = 105, H = 16.5;
  const hx = W / 2, hz = D / 2;

  // 1. Внешние стены по периметру с ПОЛНОСТЬЮ ОТКРЫТЫМИ арками-входами:
  //    Восточный (+X, к площади EXPO, проём z = -7..+7, y = 0..8.5)
  //    Северный (-Z, к парковке, проём x = -7..+7, y = 0..8.5)
  {
    const BW = new GB(), BD = new GB(), BG = new GB();

    // Южная сплошная стена (-Z нет, +Z юг)
    BW.box(0, H / 2, +hz - 0.8, W, H, 1.6, 0);
    BG.box(0, H * 0.55, +hz + 0.1, W - 24, 9.0, 0.2, 0);

    // Западная стена (-X)
    BW.box(-hx + 0.8, H / 2, 0, 1.6, H, D, 0);
    BG.box(-hx - 0.1, H * 0.55, 0, 0.2, 9.0, D - 22, 0);

    // Северная стена (-Z) с ОТКРЫТЫМ проёмом в центре (x = -7..+7, y = 0..8.5)
    BW.box(-63.5, H / 2, -hz + 0.8, 113, H, 1.6, 0);
    BW.box(+63.5, H / 2, -hz + 0.8, 113, H, 1.6, 0);
    BW.box(0, 12.6, -hz + 0.8, 14.4, 7.8, 1.6, 0);
    // Северная арочная входная рама и козырёк
    BD.box(-7.5, 4.5, -hz - 2.2, 1.2, 9.0, 5.2, 0);
    BD.box(+7.5, 4.5, -hz - 2.2, 1.2, 9.0, 5.2, 0);
    BW.box(0, 9.4, -hz - 3.2, 22, 1.4, 7.2, 0);
    BG.box(-64, H * 0.58, -hz - 0.1, 96, 8.2, 0.2, 0);
    BG.box(+64, H * 0.58, -hz - 0.1, 96, 8.2, 0.2, 0);

    // Восточная стена (+X, к Нур Алем) с ОТКРЫТЫМ главным арочным входом (z = -8..+8, y = 0..9.2)
    BW.box(+hx - 0.8, H / 2, -30.25, 1.6, H, 44.5, 0);
    BW.box(+hx - 0.8, H / 2, +30.25, 1.6, H, 44.5, 0);
    BW.box(+hx - 0.8, 13.0, 0, 1.6, 7.2, 16.4, 0);
    // Главный арочный портал на площади EXPO
    BD.box(+hx + 2.8, 4.8, -8.6, 6.2, 9.6, 1.3, 0);
    BD.box(+hx + 2.8, 4.8, +8.6, 6.2, 9.6, 1.3, 0);
    BW.box(+hx + 3.5, 10.4, 0, 8.2, 2.2, 24, 0);
    BG.box(+hx + 0.1, H * 0.58, -30.5, 0.2, 8.4, 34, 0);
    BG.box(+hx + 0.1, H * 0.58, +30.5, 0.2, 8.4, 34, 0);

    // Изогнутая белая алюминиевая волнообразная кровля (с центральными световыми фонарями!)
    const segX = 24;
    for (let i = 0; i < segX; i++) {
      const t0 = i / segX, t1 = (i + 1) / segX;
      const x0 = -hx + t0 * W, x1 = -hx + t1 * W;
      const xm = (x0 + x1) * 0.5;
      const dx = x1 - x0 + 0.35;
      const wave = Math.sin(t0 * Math.PI * 3.0) * 3.2 + Math.sin(t0 * Math.PI) * 3.8;
      const yRoof = H + 1.2 + wave;
      // Северная и южная дуговые крылья крыши (оставляем полосу центрального зенитного фонаря z=-11..+11)
      BW.box(xm, yRoof, -33, dx, 1.6, 44, 0);
      BW.box(xm, yRoof, +33, dx, 1.6, 44, 0);
      // Поперечные арочные фермы над стеклянным зенитным атриумом
      BW.box(xm, yRoof + 1.6, 0, 1.1, 1.2, 23, 0);
    }
    white.push(BW.build());
    dark.push(BD.build());
    glassBlue.push(BG.build());

    // Длинный арочный стеклянный световой фонарь по центральной оси кровли
    const BSk = new GB();
    BSk.box(0, H + 4.4, 0, W - 12, 1.6, 22, 0);
    glassSkylight.push(BSk.build());
  }

  // 2. Площадь перед восточным входом (к EXPO Нур Алем) + уличные фонтаны
  {
    const BP = new GB();
    BP.box(hx + 28, 0.10, 0, 56, 0.20, 118, 0);
    for (const fz of [-26, +26]) {
      BP.box(hx + 24, 0.42, fz, 15, 0.65, 15, 0);
      water.push(new THREE.CylinderGeometry(6.2, 6.2, 0.22, 24).translate(hx + 24, 0.80, fz));
    }
    plaza.push(BP.build());
  }

  // 3. Большая северная открытая парковка с разметкой (между Улы Дала z=760 и MEGA z=887.5)
  {
    const pTex = makeMegaParkingTexture();
    const pLot = new THREE.Mesh(
      new THREE.PlaneGeometry(236, 98).rotateX(-Math.PI / 2),
      M.std({ map: pTex, roughness: 0.82, polygonOffset: true, polygonOffsetFactor: -1 })
    );
    pLot.position.set(0, 0.04, -hz - 54);
    pLot.receiveShadow = true;
    g.add(pLot);
  }

  // 4. Светящиеся фасадные вывески MEGA SILK WAY (Север, Восток, Запад)
  {
    const mTex = makeMallSignTexture("MEGA SILK WAY");
    const mMat = M.std({
      map: mTex, emissiveMap: mTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.88,
      roughness: 0.25, metalness: 0.2,
    });
    const sNorth = new THREE.Mesh(new THREE.PlaneGeometry(21, 3.6), mMat);
    sNorth.position.set(0, 10.6, -hz - 6.9);
    sNorth.rotation.y = Math.PI;
    g.add(sNorth);

    const sEast = new THREE.Mesh(new THREE.PlaneGeometry(38, 7.2), mMat);
    sEast.position.set(hx + 7.8, 13.5, 0);
    sEast.rotation.y = Math.PI / 2;
    g.add(sEast);

    const sWest = new THREE.Mesh(new THREE.PlaneGeometry(38, 7.2), mMat);
    sWest.position.set(-hx - 0.6, 13.8, 0);
    sWest.rotation.y = -Math.PI / 2;
    g.add(sWest);
  }

  addMerged(g, white, M.whitePaint, true, true);
  addMerged(g, dark, M.darkMetal, true, true);
  addMerged(g, glassBlue, M.glassBlue, false, true);
  addMerged(g, glassSkylight, M.glassClear, false, false);
  addMerged(g, plaza, M.graniteLight, false, true);
  addMerged(g, water, M.turquoise, false, false);

  return { group: g };
}

export function buildLandmarks(scene, M, ctx) {
  const group = new THREE.Group();
  group.name = "landmarks-main";
  scene.add(group);

  const bayterek = buildBayterek(group, M);
  const khan = buildKhanShatyr(group, M);
  const pyramid = buildPyramid(group, M);
  const nurAlem = buildNurAlem(group, M);
  const megaSilkWay = buildMegaSilkWay(group, M);

  void pyramid; void nurAlem; void megaSilkWay;

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
