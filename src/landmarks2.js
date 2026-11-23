// ============================================================
// CLAY CITY v3 — вторая группа достопримечательностей Астаны:
//   1. Мечеть Хазрет Султан (4 минарета 77 м, главный купол 51 м)
//   2. Акорда (Резиденция Президента, синий купол + золотой шпиль 80 м)
//   3. Парламент (Мажилис и Сенат, золотой/бирюзовый купол 48 м)
//   4. Национальный музей РК (синее стекло и белый мрамор)
//   5. Астанинский цирк («НЛО», D=76 м)
//   6. Триумфальная арка «Мәңгілік Ел» (кольцо C)
// ============================================================
import * as THREE from "three";
import { ZONES, PLATFORM_Y } from "./config.js";
import { yawOut } from "./grid.js";
import { GB, rect, polyPrism, revolve, tube, merge } from "./geom.js";

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

/** Остроконечный восточный купол (revolve-профиль). */
function onionDomeGeo(rad, h, baseY, cx = 0, cz = 0, segs = 24) {
  const B = new GB();
  const prof = [];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const r = rad * Math.cos(t * Math.PI * 0.5) * (1 + 0.08 * Math.sin(t * Math.PI));
    const y = baseY + h * Math.sin(t * Math.PI * 0.5);
    prof.push([Math.max(0, r), y]);
  }
  revolve(B, prof, segs, { smooth: true });
  return B.build().translate(cx, 0, cz);
}

// ---------- 1. МЕЧЕТЬ ХАЗРЕТ СУЛТАН ----------
function buildMosque(parent, M) {
  const z = zoneById("mosque");
  const g = new THREE.Group();
  g.position.set(z.x, PLATFORM_Y[z.plat] || 0, z.z);
  parent.add(g);

  const marble = [], gold = [], glass = [], turq = [];

  // обширный мраморный стилобат + основной объём молитвенного зала
  {
    const B = new GB();
    polyPrism(B, rect(148, 124), 0, 3.5);
    polyPrism(B, rect(108, 92), 3.5, 22);
    // главный входной портал-пештак (выступает на +Z)
    B.box(0, 17, 49, 26, 28, 10);
    // угловые колоннады и аркады
    for (const sx of [-1, 1]) {
      B.box(sx * 58, 10, 0, 8, 14, 90);
    }
    marble.push(B.build());

    // витражные арки портала и окон
    const BG = new GB();
    BG.box(0, 14, 54.3, 14, 20, 0.8);
    for (let x = -40; x <= 40; x += 16) {
      BG.box(x, 13, 46.3, 6, 12, 0.6);
      BG.box(x, 13, -46.3, 6, 12, 0.6);
    }
    glass.push(BG.build());
  }

  // центральный барабан и главный купол (высота ~51 м)
  {
    const B = new GB();
    revolve(B, [[18.5, 22], [18.5, 31], [17.2, 32]], 32, { smooth: false });
    marble.push(B.build());
    marble.push(onionDomeGeo(17.2, 19, 32, 0, 0, 32));
    // золотой шпиль-алем на вершине главного купола
    gold.push(new THREE.CylinderGeometry(0.14, 0.45, 7.5, 8).translate(0, 54.5, 0));
    gold.push(new THREE.TorusGeometry(1.1, 0.2, 6, 16).translate(0, 58.6, 0));
    turq.push(new THREE.TorusGeometry(18.7, 0.55, 6, 36).rotateX(Math.PI / 2).translate(0, 31.2, 0));
  }

  // 8 малых куполов вокруг главного
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8;
    const cx = Math.cos(a) * 32, cz = Math.sin(a) * 26;
    const B = new GB();
    revolve(B, [[6.4, 22], [6.4, 26]], 18, { smooth: false });
    marble.push(B.build().translate(cx, 0, cz));
    marble.push(onionDomeGeo(6.4, 8.5, 26, cx, cz, 18));
    gold.push(new THREE.CylinderGeometry(0.08, 0.2, 3.2, 6).translate(cx, 36, cz));
  }

  // 4 стройных минарета по углам (высота 77 м)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const mx = sx * 54, mz = sz * 46;
      const B = new GB();
      revolve(B, [
        [4.2, 3.5], [4.0, 14], [3.3, 16], [3.1, 40], [4.1, 41.5], [4.1, 43.5], [2.9, 44],
        [2.6, 62], [3.5, 63.5], [3.5, 65], [2.2, 65.5], [1.9, 69],
      ], 16, { smooth: false });
      marble.push(B.build().translate(mx, 0, mz));
      // остроконечный золотой шпиль минарета
      gold.push(new THREE.ConeGeometry(2.1, 11, 14).translate(mx, 74.5, mz));
      turq.push(new THREE.TorusGeometry(3.8, 0.25, 6, 18).rotateX(Math.PI / 2).translate(mx, 42.5, mz));
      turq.push(new THREE.TorusGeometry(3.3, 0.22, 6, 18).rotateX(Math.PI / 2).translate(mx, 64.2, mz));
    }
  }

  addMerged(g, marble, M.marble, true, true);
  addMerged(g, gold, M.gold, false, true);
  addMerged(g, glass, M.glassDark, false, true);
  addMerged(g, turq, M.turquoise, false, true);
  return { group: g };
}

// ---------- 2. АКОРДА (РЕЗИДЕНЦИЯ ПРЕЗИДЕНТА, 80 м) ----------
function buildAkOrda(parent, M) {
  const z = zoneById("akOrda");
  const g = new THREE.Group();
  g.position.set(z.x, PLATFORM_Y[z.plat] || 0, z.z);
  parent.add(g);

  const marble = [], blue = [], gold = [], glass = [];

  // парадный стилобат и главный корпус (вытянут вдоль Z, смотрит на +X к Байтереку)
  {
    const B = new GB();
    polyPrism(B, rect(76, 162), 0, 3.5);
    // центральный блок и боковые крылья
    B.box(0, 21, 0, 48, 35, 64);
    B.box(-4, 17, -56, 38, 27, 50);
    B.box(-4, 17, 56, 38, 27, 50);
    // карнизы
    B.box(0, 39.2, 0, 52, 2.2, 68);
    B.box(-4, 31.2, -56, 41, 1.8, 54);
    B.box(-4, 31.2, 56, 41, 1.8, 54);
    // парадная колоннада на восточном фасаде (+X)
    for (let cz = -24; cz <= 24; cz += 6) {
      B.box(26.5, 20.5, cz, 1.6, 34, 1.6);
    }
    // портик-козырёк над колоннадой
    B.box(26.5, 38, 0, 6, 3.2, 54);
    marble.push(B.build());

    // окна фасада
    const BG = new GB();
    BG.box(24.3, 20, 0, 0.8, 26, 48);
    BG.box(15.3, 17, -56, 0.8, 19, 38);
    BG.box(15.3, 17, 56, 0.8, 19, 38);
    glass.push(BG.build());
  }

  // знаменитый голубой купол + высокий золотой шпиль (до 80 м)
  {
    const B = new GB();
    revolve(B, [[15, 40], [15, 46], [14.2, 47]], 32, { smooth: false });
    marble.push(B.build());
    blue.push(onionDomeGeo(14.5, 16, 46.5, 0, 0, 32));
    // золотые декоративные рёбра-пояса и шпиль
    gold.push(new THREE.TorusGeometry(14.8, 0.45, 6, 36).rotateX(Math.PI / 2).translate(0, 46.8, 0));
    gold.push(new THREE.CylinderGeometry(0.18, 0.9, 19, 10).translate(0, 71.5, 0));
    gold.push(new THREE.SphereGeometry(1.5, 12, 8).translate(0, 62.5, 0));
    gold.push(new THREE.TorusGeometry(1.6, 0.25, 6, 16).translate(0, 81.2, 0));
  }

  addMerged(g, marble, M.marble, true, true);
  addMerged(g, blue, M.blueDome, true, true);
  addMerged(g, gold, M.gold, false, true);
  addMerged(g, glass, M.glassDark, false, true);
  return { group: g };
}

// ---------- 3. ПАРЛАМЕНТ (48 м) ----------
function buildParliament(parent, M) {
  const z = zoneById("parliament");
  const g = new THREE.Group();
  g.position.set(z.x, PLATFORM_Y[z.plat] || 0, z.z);
  parent.add(g);

  const stone = [], gold = [], glass = [];
  {
    const B = new GB();
    polyPrism(B, rect(86, 108), 0, 3);
    B.box(0, 16, 0, 56, 26, 76);
    B.box(0, 29.8, 0, 60, 2.0, 80);
    // боковые ризалиты
    B.box(0, 14, -44, 68, 22, 18);
    B.box(0, 14, 44, 68, 22, 18);
    // центральная ротонда
    revolve(B, [[15, 29], [15, 36], [14, 37]], 28, { smooth: false });
    stone.push(B.build());

    const BG = new GB();
    BG.box(28.3, 16, 0, 0.8, 18, 60);
    BG.box(-28.3, 16, 0, 0.8, 18, 60);
    glass.push(BG.build());
  }
  gold.push(onionDomeGeo(14.2, 11.5, 36.8, 0, 0, 28));
  gold.push(new THREE.CylinderGeometry(0.15, 0.45, 7, 8).translate(0, 51, 0));

  addMerged(g, stone, M.stone, true, true);
  addMerged(g, gold, M.gold, true, true);
  addMerged(g, glass, M.glassDark, false, true);
  return { group: g };
}

// ---------- 4. НАЦИОНАЛЬНЫЙ МУЗЕЙ РК ----------
function buildMuseum(parent, M) {
  const z = zoneById("museum");
  const g = new THREE.Group();
  g.position.set(z.x, PLATFORM_Y[z.plat] || 0, z.z);
  parent.add(g);

  const white = [], blue = [], gold = [];
  {
    const B = new GB();
    polyPrism(B, rect(88, 200), 0, 3.2);
    // скульптурный вытянутый корпус со ступенчатыми павильонами
    B.box(-8, 16, 0, 48, 26, 172);
    B.box(10, 20, -48, 36, 34, 52);
    B.box(10, 20, 48, 36, 34, 52);
    // парящий консольный козырёк кровли
    B.box(4, 36.5, 0, 66, 3.2, 184);
    white.push(B.build());

    // гранёный синий витражный фасад
    const BG = new GB();
    BG.box(18, 18, 0, 22, 28, 72);
    BG.box(28.5, 19, -48, 1.2, 26, 42);
    BG.box(28.5, 19, 48, 1.2, 26, 42);
    blue.push(BG.build());

    // золотая стела «Золотой человек» перед входом
    gold.push(new THREE.CylinderGeometry(0.9, 1.6, 16, 12).translate(36, 11, 0));
    gold.push(new THREE.SphereGeometry(2.2, 12, 10).translate(36, 20, 0));
  }

  addMerged(g, white, M.whitePlate, true, true);
  addMerged(g, blue, M.blueDome, true, true);
  addMerged(g, gold, M.gold, false, true);
  return { group: g };
}

// ---------- 5. АСТАНИНСКИЙ ЦИРК («НЛО») ----------
function buildCircus(parent, M) {
  const z = zoneById("circus");
  const g = new THREE.Group();
  g.position.set(z.x, PLATFORM_Y[z.plat] || 0, z.z);
  parent.add(g);

  const white = [], glass = [], steel = [];
  {
    // ступенчатый круглый подиум
    const B = new GB();
    revolve(B, [[0, 0], [42, 0], [42, 2.5], [34, 2.5], [34, 5], [0, 5]], 40, { smooth: false });
    // корпус-тарелка «НЛО»
    revolve(B, [
      [22, 5], [38, 14], [40, 17], [38, 20], [28, 28], [14, 35], [4, 38], [0, 39],
    ], 48, { smooth: true });
    white.push(B.build());

    // панорамный остеклённый пояс под «тарелкой»
    const BG = new GB();
    revolve(BG, [[23, 5], [30, 10.5], [29, 11.2], [22, 5.5]], 40, { smooth: false });
    glass.push(BG.build());

    // стальные радиальные рёбра купола
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      steel.push(tube([
        new THREE.Vector3(ca * 39.5, 17.5, sa * 39.5),
        new THREE.Vector3(ca * 27.5, 28.4, sa * 27.5),
        new THREE.Vector3(ca * 6, 38.2, sa * 6),
      ], 0.35, 5));
    }
  }

  // ночная неоновая окантовка «летающей тарелки»
  const ufoGlow = new THREE.Mesh(new THREE.TorusGeometry(40.2, 0.36, 8, 64).rotateX(Math.PI / 2), M.neon(0x46f2ff, 4.8));
  ufoGlow.position.y = 17.0;
  g.add(ufoGlow);

  addMerged(g, white, M.whitePlate, true, true);
  addMerged(g, glass, M.glassDark, false, true);
  addMerged(g, steel, M.steel, true, true);
  return { group: g };
}

// ---------- 6. ТРИУМФАЛЬНАЯ АРКА «МӘҢГІЛІК ЕЛ» (кольцо C) ----------
function buildArch(parent, M) {
  const z = zoneById("arch");
  const g = new THREE.Group();
  g.position.set(z.x, PLATFORM_Y[z.plat] || 0, z.z);
  g.rotation.y = yawOut(z.x, z.z) + Math.PI / 2;
  parent.add(g);

  const marble = [], gold = [];
  {
    const B = new GB();
    // два мощных пилона
    B.box(-18, 22, 0, 16, 44, 18);
    B.box(18, 22, 0, 16, 44, 18);
    // базы и капители пилонов
    B.box(-18, 2.5, 0, 19, 5, 21);
    B.box(18, 2.5, 0, 19, 5, 21);
    // верхний антаблемент и аттик (до 58 м)
    B.box(0, 44, 0, 56, 8, 20);
    B.box(0, 52, 0, 50, 9, 17);
    B.box(0, 57.2, 0, 54, 1.8, 19);
    // свод арки (набор сегментов-клиньев)
    const segs = 12, R = 10, cy = 28;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI, a1 = ((i + 1) / segs) * Math.PI;
      const am = (a0 + a1) / 2;
      const x = Math.cos(am) * (R + 2.5), y = cy + Math.sin(am) * (R + 2.5);
      B.box(x, y, 0, 5.2, 5.2, 18, 0);
    }
    marble.push(B.build());

    // золотой фриз и декоративные ниши
    const BG = new GB();
    BG.box(0, 48.2, 9.6, 46, 1.2, 0.8);
    BG.box(0, 48.2, -9.6, 46, 1.2, 0.8);
    BG.box(-18, 16, 9.5, 4, 8, 0.8);
    BG.box(18, 16, 9.5, 4, 8, 0.8);
    gold.push(BG.build());
  }

  addMerged(g, marble, M.marble, true, true);
  addMerged(g, gold, M.gold, false, true);
  return { group: g };
}

export function buildLandmarks(scene, M, _ctx) {
  const group = new THREE.Group();
  group.name = "landmarks-secondary";
  scene.add(group);

  buildMosque(group, M);
  buildAkOrda(group, M);
  buildParliament(group, M);
  buildMuseum(group, M);
  buildCircus(group, M);
  buildArch(group, M);

  return { group, update() {} };
}
