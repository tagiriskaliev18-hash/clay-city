// ============================================================
// CLAY CITY v3 — главные символы Астаны:
//   1. Байтерек (105 м, золотой шар, решётчатый ствол)
//   2. Хан Шатыр (150 м, наклонный шатёр-тент на стилобате)
//   3. Дворец Мира и Согласия (Пирамида, 76 м, стеклянная вершина)
//   4. Сфера «Нур Алем» (D=80 м, медиафасад diagrid с LED-волной)
// ============================================================
import * as THREE from "three";
import { ZONES, PLATFORM_Y } from "./config.js";
import { GB, rect, ngon, polyPrism, revolve, tube, bezier, merge } from "./geom.js";

const TAU = Math.PI * 2;
const zoneById = (id) => ZONES.find((z) => z.id === id);

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
  const z = zoneById("bayterek");
  const g = new THREE.Group();
  g.position.set(z.x, PLATFORM_Y[z.plat] || 0, z.z);
  parent.add(g);

  const marble = [], steel = [], brass = [], glass = [], glow = [];

  // двухуровневый стилобат с круглой чашей и ступенями
  {
    const B = new GB();
    revolve(B, [[0, 0], [44, 0], [44, 1.4], [38, 1.4], [38, 3.2], [28, 3.2], [28, 5.2], [0, 5.2]], 48, { smooth: false });
    marble.push(B.build());
    // декоративные пандусы по 4 сторонам
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const B2 = new GB();
      B2.box(Math.cos(a) * 35, 1.8, Math.sin(a) * 35, 14, 3.6, 14, a);
      marble.push(B2.build());
    }
    // латунное кольцо фонтана
    brass.push(new THREE.TorusGeometry(40.5, 0.45, 8, 64).rotateX(Math.PI / 2).translate(0, 1.6, 0));
    brass.push(new THREE.TorusGeometry(28.2, 0.35, 8, 56).rotateX(Math.PI / 2).translate(0, 5.3, 0));
  }

  // центральная остеклённая шахта лифта
  {
    const cyl = new THREE.CylinderGeometry(3.8, 4.6, 78, 20).translate(0, 44, 0);
    glass.push(cyl);
    // светящиеся технологические кольца вдоль шахты
    for (let y = 16; y <= 76; y += 12) {
      glow.push(new THREE.TorusGeometry(4.3, 0.22, 6, 24).rotateX(Math.PI / 2).translate(0, y, 0));
    }
  }

  // белый решётчатый «ствол тополя» — 16 мощных изогнутых рёбер + перекрёстные диагонали
  const N = 16;
  const ribPts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const ca = Math.cos(a), sa = Math.sin(a);
    const pts = bezier(
      [ca * 21, 5.0, sa * 21],
      [ca * 9.5, 28, sa * 9.5],
      [ca * 6.2, 62, sa * 6.2],
      [ca * 17.5, 92, sa * 17.5],
      20
    );
    ribPts.push(pts);
    steel.push(tube(pts, 0.52, 6, { taper: (t) => 0.62 - 0.16 * Math.sin(t * Math.PI) }));
    // верхние «ветви» короны, охватывающие золотой шар
    const tip = pts[pts.length - 1];
    const crownPts = bezier(
      [tip.x, tip.y, tip.z],
      [ca * 19.5, 98, sa * 19.5],
      [ca * 15.5, 103.5, sa * 15.5],
      [ca * 10.5, 105.5, sa * 10.5],
      8
    );
    steel.push(tube(crownPts, 0.34, 5));
  }

  // горизонтальные кольца жёсткости и спиральные диагонали
  for (const idx of [3, 6, 9, 12, 15, 18, 20]) {
    const ring = [];
    for (let i = 0; i <= N; i++) ring.push(ribPts[i % N][idx]);
    steel.push(tube(ring, 0.28, 5));
  }
  for (let i = 0; i < N; i++) {
    for (const [j0, j1] of [[2, 7], [7, 12], [12, 17], [17, 20]]) {
      const a0 = ribPts[i][j0], b0 = ribPts[(i + 1) % N][j1];
      const a1 = ribPts[(i + 1) % N][j0], b1 = ribPts[i][j1];
      steel.push(tube([a0, b0], 0.18, 4));
      steel.push(tube([a1, b1], 0.18, 4));
    }
  }

  // ЗОЛОТОЙ ШАР (D = 22 м, центр на y = 92 м)
  const orb = new THREE.Mesh(new THREE.SphereGeometry(11.2, 40, 28), M.gold);
  orb.position.set(0, 92, 0);
  orb.castShadow = true;
  orb.receiveShadow = true;
  g.add(orb);

  // латунные меридианы-пояса на шаре и шпиль-антенна
  brass.push(new THREE.TorusGeometry(11.35, 0.22, 6, 48).rotateX(Math.PI / 2).translate(0, 92, 0));
  brass.push(new THREE.TorusGeometry(11.35, 0.18, 6, 48).rotateX(Math.PI / 2).translate(0, 96.5, 0));
  brass.push(new THREE.TorusGeometry(11.35, 0.18, 6, 48).rotateX(Math.PI / 2).translate(0, 87.5, 0));
  brass.push(new THREE.CylinderGeometry(0.12, 0.35, 10, 8).translate(0, 107.5, 0));

  // маячок на макушке
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), M.glow(0xffd27a, 6));
  beacon.position.set(0, 112.8, 0);
  g.add(beacon);

  addMerged(g, marble, M.marble, true, true);
  addMerged(g, steel, M.whitePlate, true, true);
  addMerged(g, brass, M.brass, false, true);
  addMerged(g, glass, M.glassDark, true, true);
  addMerged(g, glow, M.neon(0x46f2ff, 4.2), false, false);

  return { group: g, orb, beacon };
}

// ---------- 2. ХАН ШАТЫР (150 м, наклонный шатёр на кольце B) ----------
function buildKhanShatyr(parent, M) {
  const z = zoneById("khanShatyr");
  const g = new THREE.Group();
  g.position.set(z.x, PLATFORM_Y[z.plat] || 0, z.z);
  parent.add(g);

  const stone = [], steel = [], brass = [], glass = [];
  const Rx = 92, Rz = 78, baseH = 15, apexH = 148, tiltX = -18;

  // массивный эллиптический стилобат-основание
  {
    const segs = 56;
    const pts = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * TAU;
      pts.push([Math.cos(a) * Rx, Math.sin(a) * Rz]);
    }
    const B = new GB();
    polyPrism(B, pts, 0, baseH);
    stone.push(B.build());

    // панорамный остеклённый фасад нижнего пояса
    const ptsG = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * TAU;
      ptsG.push([Math.cos(a) * (Rx + 0.6), Math.sin(a) * (Rz + 0.6)]);
    }
    const BG = new GB();
    polyPrism(BG, ptsG, 2.5, baseH - 2.2, { cap: false });
    glass.push(BG.build());

    // парадный входной портал со стороны моста (-X)
    const B2 = new GB();
    B2.box(-Rx - 4, baseH * 0.45, 0, 14, baseH * 0.9, 34);
    brass.push(B2.build());
  }

  // наклонный полупрозрачный шатёр (ETFE-мембрана с плавным вогнутым профилем)
  const tentMat = M.std({
    color: 0xdce6ee,
    roughness: 0.24,
    metalness: 0.15,
    transparent: true,
    opacity: 0.82,
    envMapIntensity: 1.25,
    emissive: new THREE.Color(0x55a8ff),
    emissiveIntensity: 0,
    side: THREE.DoubleSide,
  });

  {
    const B = new GB();
    const rings = 24, segs = 56;
    const rows = [];
    const ringPt = (t, a) => {
      // вогнутый шатровый профиль
      const radScale = Math.pow(1 - t, 1.38) * 0.96 + (1 - t) * 0.04;
      const y = baseH + t * (apexH - baseH);
      const cx = tiltX * Math.pow(t, 1.25);
      return [cx + Math.cos(a) * Rx * 0.92 * radScale, y, Math.sin(a) * Rz * 0.92 * radScale];
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

    // 28 стальных вантовых меридианов + 8 горизонтальных натяжных колец
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      const pts = [];
      for (let j = 0; j <= 14; j++) pts.push(new THREE.Vector3(...ringPt(j / 14, a)));
      steel.push(tube(pts, 0.36, 5));
    }
    for (const t of [0.12, 0.25, 0.40, 0.55, 0.70, 0.85, 0.96]) {
      const pts = [];
      for (let i = 0; i <= 40; i++) pts.push(new THREE.Vector3(...ringPt(t, (i / 40) * TAU)));
      steel.push(tube(pts, 0.32, 5));
    }
    // внутренний треножник-мачта и верхний шпиль
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.4;
      steel.push(tube([
        new THREE.Vector3(Math.cos(a) * 26, baseH, Math.sin(a) * 22),
        new THREE.Vector3(tiltX, apexH - 4, 0),
      ], 1.1, 6));
    }
    brass.push(new THREE.CylinderGeometry(0.18, 0.7, 16, 10).translate(tiltX, apexH + 6, 0));
  }

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6), M.glow(0xff2a1a, 6));
  beacon.position.set(tiltX, apexH + 14.5, 0);
  g.add(beacon);

  addMerged(g, stone, M.concrete, true, true);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, brass, M.brass, false, true);
  addMerged(g, glass, M.glassDark, false, true);

  return { group: g, tentMat };
}

// ---------- 3. ДВОРЕЦ МИРА И СОГЛАСИЯ (ПИРАМИДА, 76 м) ----------
function buildPyramid(parent, M) {
  const z = zoneById("pyramid");
  const g = new THREE.Group();
  g.position.set(z.x, PLATFORM_Y[z.plat] || 0, z.z);
  parent.add(g);

  const stone = [], glass = [], brass = [];
  const plinthH = 10, half = 31, pyrH = 62, split = 0.66; // нижние 66% — камень, верхние 34% — светящийся витраж

  // ступенчатый стилобат
  {
    const B = new GB();
    polyPrism(B, rect(76, 76), 0, 4);
    polyPrism(B, rect(68, 68), 4, plinthH);
    stone.push(B.build());
  }

  // нижняя усечённая пирамида (каменные панели)
  const y0 = plinthH, yMid = plinthH + pyrH * split, yTop = plinthH + pyrH;
  const hMid = half * (1 - split);
  const corners = (hs) => [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]];
  const c0 = corners(half), cM = corners(hMid);

  const addSideQuad = (B, a0, a1, b1, b0) => {
    const ux = a1[0] - a0[0], uy = a1[1] - a0[1], uz = a1[2] - a0[2];
    const vx = b0[0] - a0[0], vy = b0[1] - a0[1], vz = b0[2] - a0[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz) || 1;
    nx /= L; ny /= L; nz /= L;
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const w0 = Math.hypot(ux, uz), w1 = Math.hypot(b1[0] - b0[0], b1[2] - b0[2]), sh = Math.hypot(vx, vy, vz);
    B.quad(a1, a0, b0, b1, [nx, ny, nz], [w0, 0], [0, 0], [(w0 - w1) / 2, sh], [(w0 + w1) / 2, sh]);
  };

  {
    const BS = new GB();
    const BG = new GB();
    const apex = [0, yTop, 0];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const A0 = [c0[i][0], y0, c0[i][1]], A1 = [c0[j][0], y0, c0[j][1]];
      const M0 = [cM[i][0], yMid, cM[i][1]], M1 = [cM[j][0], yMid, cM[j][1]];
      addSideQuad(BS, A0, A1, M1, M0);

      // стеклянная вершина
      const ux = M1[0] - M0[0], uy = M1[1] - M0[1], uz = M1[2] - M0[2];
      const vx = apex[0] - M0[0], vy = apex[1] - M0[1], vz = apex[2] - M0[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const L = Math.hypot(nx, ny, nz) || 1;
      nx /= L; ny /= L; nz /= L;
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const wm = Math.hypot(ux, uz), sh = Math.hypot(vx, vy, vz);
      BG.tri(M1, M0, apex, [nx, ny, nz], [wm, 0], [0, 0], [wm / 2, sh]);

      // рёбра пирамиды из латуни
      brass.push(tube([new THREE.Vector3(...A0), new THREE.Vector3(...apex)], 0.45, 6));
    }
    stone.push(BS.build());
    glass.push(BG.build());
    // пояс-карниз между каменной и стеклянной частью
    const pts = cM.map(([x, z2]) => new THREE.Vector3(x, yMid, z2));
    pts.push(pts[0].clone());
    brass.push(tube(pts, 0.42, 6));
  }

  addMerged(g, stone, M.whitePlate, true, true);
  addMerged(g, glass, M.lattice, true, true);
  addMerged(g, brass, M.brass, false, true);

  return { group: g };
}

// ---------- 4. СФЕРА «НУР АЛЕМ» (D = 80 м, кольцо C) ----------
function buildNurAlem(parent, M) {
  const z = zoneById("nurAlem");
  const g = new THREE.Group();
  g.position.set(z.x, PLATFORM_Y[z.plat] || 0, z.z);
  parent.add(g);

  const white = [], steel = [], brass = [];
  const R = 40, cy = 48;

  // стилобат и два изогнутых павильона-крыла у основания
  {
    const B = new GB();
    revolve(B, [[0, 0], [50, 0], [50, 4], [46, 8], [32, 10], [0, 10]], 48, { smooth: false });
    white.push(B.build());
    // два симметричных «объятия» вокруг нижней полусферы
    for (const s of [-1, 1]) {
      const wing = new THREE.BoxGeometry(24, 14, 52).translate(s * 34, 11, 0);
      white.push(wing);
    }
  }

  // главная 80-метровая сфера с медиафасадом diagrid (анимируется в materials.js по uTime/uNight)
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), M.diagrid);
  sphere.position.set(0, cy, 0);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  g.add(sphere);

  // конструктивные стальные меридианы, экваториальный пояс и верхняя ветротурбинная выемка
  brass.push(new THREE.TorusGeometry(R + 0.35, 0.45, 8, 64).rotateX(Math.PI / 2).translate(0, cy, 0));
  steel.push(new THREE.TorusGeometry(R * 0.72, 0.55, 8, 48).rotateX(Math.PI / 2).translate(0, cy + R * 0.70, 0));
  steel.push(new THREE.TorusGeometry(R * 0.72, 0.55, 8, 48).rotateX(Math.PI / 2).translate(0, cy - R * 0.70, 0));
  // корона-мост над верхней чашей
  {
    const B = new GB();
    B.box(0, cy + R + 1.2, 0, 26, 2.4, 6);
    steel.push(B.build());
  }

  // неоновое кольцо у основания
  const ringNeon = new THREE.Mesh(new THREE.TorusGeometry(47.2, 0.3, 6, 64).rotateX(Math.PI / 2), M.neon(0x46f2ff, 4.5));
  ringNeon.position.y = 7.6;
  g.add(ringNeon);

  addMerged(g, white, M.whitePlate, true, true);
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

  void bayterek; void pyramid; void nurAlem;

  return {
    group,
    update(_dt, time) {
      const night = ctx.U.uNight.value;
      // Хан Шатыр ночью мягко светится тёпло-голубым внутренним светом
      if (khan.tentMat) {
        khan.tentMat.emissiveIntensity = night * (0.55 + 0.12 * Math.sin(time * 0.8));
      }
    },
  };
}
