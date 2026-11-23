// ============================================================
// ASTANA REAL v2 — landmarks2.js
// Вторая группа достопримечательностей Астаны:
//   1. Акорда (Резиденция Президента: 2-ярусный портик с колоннами,
//      бирюзово-синий купол и золотой шпиль, фасад на запад к Байтереку)
//   2. Дом Министерств (две полноценные 3D-дуги по обе стороны Нуржола
//      + две знаменитые золотые конусные башни-ворота!)
//   3. Мечеть Хазрет Султан (белый мрамор, 4 минарета, 9 куполов)
//   4. Парламент Мажилис и 5. Сенат (ансамбль площади у Акорды)
//   6. Национальный музей РК (белый мрамор + синие стеклянные крылья)
//   7. Триумфальная арка «Мәңгілік Ел» (травертин, вдоль пр. Мәңгілік Ел)
//   8. Астанинский цирк «НЛО»
// ============================================================
import * as THREE from "three";
import { LANDMARKS, SIGNATURE } from "./config.js";
import { GB, revolve, tube, merge, polyPrism, ellipse } from "./geom.js";

const TAU = Math.PI * 2;
const L = LANDMARKS;
const sigById = (id) => SIGNATURE.find((s) => s.id === id);

function addMerged(parent, list, mat, cast = true, receive = true) {
  if (!list.length) return null;
  const m = new THREE.Mesh(merge(list), mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

function onionDomeGeo(rad, h, baseY, cx = 0, cz = 0, segs = 28) {
  const B = new GB();
  const prof = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const r = rad * Math.cos(t * Math.PI * 0.5) * (1 + 0.08 * Math.sin(t * Math.PI));
    const y = baseY + h * Math.sin(t * Math.PI * 0.5);
    prof.push([Math.max(0, r), y]);
  }
  revolve(B, prof, segs, { smooth: true });
  return B.build().translate(cx, 0, cz);
}

// ---------- 1. АКОРДА (80 м, фасад на -X к Байтереку, тыл к реке Есиль) ----------
function buildAkOrda(parent, M) {
  const P = L.akorda;
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "landmark-akorda";
  parent.add(g);

  const marble = [], granite = [], blue = [], gold = [], glass = [];

  // Ступенчатый гранитно-мраморный стилобат + парадная лестница на -X
  {
    const BG = new GB();
    BG.box(0, 1.4, 0, 114, 2.8, 176, 0);
    for (let s = 0; s < 5; s++) {
      BG.box(-57 - s * 2.2, 2.6 - s * 0.52, 0, 2.2, 0.55, 58, 0);
    }
    granite.push(BG.build());

    const B = new GB();
    // 1-й и 2-й классические ярусы центрального корпуса
    B.box(0, 12.5, 0, 50, 20, 68, 0);
    B.box(0, 30.5, 0, 46, 16, 62, 0);
    // Симметричные северное и южное крылья
    B.box(2, 16.5, -58, 38, 28, 50, 0);
    B.box(2, 16.5, +58, 38, 28, 50, 0);
    // Выразительные классические карнизы и антаблемент
    B.box(0, 23.0, 0, 53, 1.8, 71, 0);
    B.box(0, 39.2, 0, 51, 2.4, 67, 0);
    B.box(2, 31.2, -58, 41, 2.0, 54, 0);
    B.box(2, 31.2, +58, 41, 2.0, 54, 0);
    // Портик верхнего и нижнего ярусов на запад (-X)
    B.box(-27.5, 22.8, 0, 7.5, 2.4, 54, 0);
    B.box(-27.0, 38.6, 0, 7.5, 3.0, 50, 0);
    marble.push(B.build());

    // Стройные круглые классические колонны 2-ярусного западного портика и крыльев
    for (let cz = -22; cz <= 22; cz += 5.5) {
      marble.push(new THREE.CylinderGeometry(0.75, 0.92, 19.5, 12).translate(-28.5, 12.6, cz));
      marble.push(new THREE.CylinderGeometry(0.68, 0.80, 14.5, 12).translate(-28.0, 30.8, cz));
    }
    // Колонны на крыльях (выходящие на запад)
    for (const side of [-1, 1]) {
      for (let k = -18; k <= 18; k += 6) {
        marble.push(new THREE.CylinderGeometry(0.65, 0.78, 26.5, 10).translate(-18.2, 16.5, side * 58 + k));
      }
    }

    // Панорамные сине-зеркальные витражи между колоннами (запад + восток к реке Есиль)
    const BGl = new GB();
    BGl.box(-24.8, 20.5, 0, 0.8, 31, 46, 0);
    BGl.box(+24.8, 20.5, 0, 0.8, 31, 46, 0);
    BGl.box(-16.8, 16.5, -58, 0.8, 22, 38, 0);
    BGl.box(-16.8, 16.5, +58, 0.8, 22, 38, 0);
    BGl.box(+21.2, 16.5, -58, 0.8, 22, 38, 0);
    BGl.box(+21.2, 16.5, +58, 0.8, 22, 38, 0);
    glass.push(BGl.build());
  }

  // Барабан с колоннадой, бирюзово-синий купол и высокий золотой шпиль (до 80 м)
  {
    const B = new GB();
    revolve(B, [[16.2, 40.0], [16.2, 47.0], [15.2, 48.0]], 36, { smooth: false });
    marble.push(B.build());
    // Кольцо малых колонн на барабане
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      marble.push(new THREE.CylinderGeometry(0.42, 0.48, 6.8, 8).translate(Math.cos(a) * 16.4, 43.5, Math.sin(a) * 16.4));
    }
    blue.push(onionDomeGeo(15.2, 16.5, 47.6, 0, 0, 36));
    // Золотые меридиональные рёбра и венец купола
    gold.push(new THREE.TorusGeometry(15.6, 0.48, 8, 40).rotateX(Math.PI / 2).translate(0, 47.9, 0));
    gold.push(new THREE.TorusGeometry(16.4, 0.32, 6, 40).rotateX(Math.PI / 2).translate(0, 40.4, 0));
    gold.push(new THREE.CylinderGeometry(0.16, 0.85, 19.5, 12).translate(0, 72.5, 0));
    gold.push(new THREE.SphereGeometry(1.6, 14, 10).translate(0, 64.2, 0));
    // Золотой венец с солнцем на вершине шпиля
    gold.push(new THREE.TorusGeometry(1.7, 0.24, 8, 18).translate(0, 82.0, 0));
  }

  addMerged(g, marble, M.marble, true, true);
  addMerged(g, granite, M.graniteLight, true, true);
  addMerged(g, blue, M.blueDome, true, true);
  addMerged(g, gold, M.gold, false, true);
  addMerged(g, glass, M.glassBlue, false, true);
  return { group: g };
}

// ---------- 2. ДОМ МИНИСТЕРСТВ (две 3D золотые изогнутые дуги + башни-ворота) ----------
function buildMinistries(parent, M) {
  const P = L.ministries;
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "landmark-ministries";
  parent.add(g);

  const stone = [], glassGold = [], gold = [], roof = [];

  // Две длинные зеркально изогнутые дуги вдоль оси Нуржол (север -Z и юг +Z)
  // Идут от x = -115 до x = +145 (в локальных координатах центра P.x=310 → мир 195..455)
  for (const side of [-1, 1]) {
    const segs = 16;
    const xStart = -105, xEnd = 140;
    const thickness = 18;
    const h = 34;

    for (let i = 0; i < segs; i++) {
      const t = (i + 0.5) / segs;
      const t0 = i / segs, t1 = (i + 1) / segs;
      const x0 = xStart + (xEnd - xStart) * t0;
      const x1 = xStart + (xEnd - xStart) * t1;
      // Плавный изгиб (обнимает парадную площадь перед Акордой)
      const zCurve = (u) => side * (46 + 44 * Math.pow(Math.sin(u * Math.PI * 0.85), 1.4));
      const z0 = zCurve(t0), z1 = zCurve(t1);
      const xm = (x0 + x1) / 2, zm = (z0 + z1) / 2;
      const segLen = Math.hypot(x1 - x0, z1 - z0) + 1.2;
      const yaw = -Math.atan2(z1 - z0, x1 - x0);

      // Полноценный объёмный 3D блок секции (никаких бумажных односторонних стен!)
      const B = new GB();
      B.box(xm, h / 2, zm, segLen, h, thickness, yaw);
      stone.push(B.build());

      // Золотистая фасадная лента-остекление
      const BG = new GB();
      BG.box(xm, h * 0.54, zm, segLen - 0.6, h * 0.68, thickness + 0.5, yaw);
      glassGold.push(BG.build());

      // Кровельный парапет + золотой карниз
      const BR = new GB();
      BR.box(xm, h + 0.6, zm, segLen + 0.4, 1.2, thickness + 1.2, yaw);
      gold.push(BR.build());
      void t;
    }

    // Две знаменитые высокие золотые конусные БАШНИ-ВОРОТА на западном входе (у Байтерека, x = -115)
    const tx = -112, tz = side * 50;
    const gateH = 92;
    {
      // Травертиновый стилобат башни
      const BS = new GB();
      BS.box(tx, 7, tz, 34, 14, 30, 0);
      stone.push(BS.build());

      // Сужающаяся золотая остеклённая коническая башня-ворота (знаковый силуэт Астаны!)
      const tiers = 5, th = (gateH - 14) / tiers;
      for (let k = 0; k < tiers; k++) {
        const sc = 1.0 - k * 0.10;
        const BG = new GB();
        polyPrism(BG, ellipse(14.5 * sc, 12.5 * sc, 24, tx, tz), 14 + k * th, 14 + (k + 1) * th);
        glassGold.push(BG.build());
        // Золотое кольцо между ярусами
        gold.push(new THREE.TorusGeometry(13.8 * sc, 0.42, 6, 32).rotateX(Math.PI / 2).translate(tx, 14 + (k + 1) * th, tz));
      }
      // Золотой конический купол-шпиль башни-ворот
      gold.push(new THREE.ConeGeometry(8.2, 16, 20).translate(tx, gateH + 8, tz));
      gold.push(new THREE.CylinderGeometry(0.12, 0.45, 10, 8).translate(tx, gateH + 20, tz));
    }

    // Восточная угловая башня-завершение у Акорды
    {
      const ex = 142, ez = side * 74;
      const BE = new GB();
      BE.box(ex, 26, ez, 24, 52, 24, 0);
      stone.push(BE.build());
      const BGe = new GB();
      BGe.box(ex, 27, ez, 24.6, 38, 18, 0);
      glassGold.push(BGe.build());
      roof.push(new THREE.BoxGeometry(26, 2.2, 26).translate(ex, 53, ez));
    }
  }

  addMerged(g, stone, M.travertine, true, true);
  addMerged(g, glassGold, M.glassGold, true, true);
  addMerged(g, gold, M.brass, false, true);
  addMerged(g, roof, M.roof, false, true);
  return { group: g };
}

// ---------- 3. МЕЧЕТЬ ХАЗРЕТ СУЛТАН (белый мрамор, 4 минарета, 77 м) ----------
function buildMosque(parent, M) {
  const P = L.mosque;
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "landmark-mosque";
  parent.add(g);

  const marble = [], gold = [], glass = [], turq = [];

  {
    const B = new GB();
    B.box(0, 1.75, 0, 148, 3.5, 124, 0);
    B.box(0, 13.5, 0, 108, 22, 92, 0);
    // Главный арочный портал (айван)
    B.box(0, 17.5, 49, 28, 29, 10, 0);
    for (const sx of [-1, 1]) B.box(sx * 58, 10, 0, 8, 14, 90, 0);
    marble.push(B.build());

    const BG = new GB();
    BG.box(0, 14, 54.4, 14, 21, 0.8, 0);
    for (let x = -40; x <= 40; x += 16) {
      BG.box(x, 13, 46.4, 6, 13, 0.6, 0);
      BG.box(x, 13, -46.4, 6, 13, 0.6, 0);
    }
    glass.push(BG.build());
  }

  // Главный ребристый купол (51 м) + шпиль с полумесяцем
  {
    const B = new GB();
    revolve(B, [[18.5, 22], [18.5, 31], [17.2, 32]], 32, { smooth: false });
    marble.push(B.build());
    marble.push(onionDomeGeo(17.2, 19.5, 32, 0, 0, 32));
    gold.push(new THREE.CylinderGeometry(0.14, 0.45, 7.5, 8).translate(0, 55, 0));
    gold.push(new THREE.TorusGeometry(1.15, 0.22, 6, 16).translate(0, 59.2, 0));
    turq.push(new THREE.TorusGeometry(18.7, 0.55, 6, 36).rotateX(Math.PI / 2).translate(0, 31.2, 0));
  }

  // 8 малых куполов
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8;
    const cx = Math.cos(a) * 32, cz = Math.sin(a) * 26;
    const B = new GB();
    revolve(B, [[6.4, 22], [6.4, 26]], 18, { smooth: false });
    marble.push(B.build().translate(cx, 0, cz));
    marble.push(onionDomeGeo(6.4, 8.5, 26, cx, cz, 18));
    gold.push(new THREE.CylinderGeometry(0.08, 0.2, 3.2, 6).translate(cx, 36, cz));
  }

  // 4 стройных минарета высотой 77 м
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const mx = sx * 54, mz = sz * 46;
      const B = new GB();
      revolve(B, [
        [4.2, 3.5], [4.0, 14], [3.3, 16], [3.1, 40], [4.1, 41.5], [4.1, 43.5], [2.9, 44],
        [2.6, 62], [3.5, 63.5], [3.5, 65], [2.2, 65.5], [1.9, 69],
      ], 16, { smooth: false });
      marble.push(B.build().translate(mx, 0, mz));
      gold.push(new THREE.ConeGeometry(2.1, 11, 14).translate(mx, 74.5, mz));
      turq.push(new THREE.TorusGeometry(3.8, 0.25, 6, 18).rotateX(Math.PI / 2).translate(mx, 42.5, mz));
      turq.push(new THREE.TorusGeometry(3.3, 0.22, 6, 18).rotateX(Math.PI / 2).translate(mx, 64.2, mz));
    }
  }

  addMerged(g, marble, M.marble, true, true);
  addMerged(g, gold, M.gold, false, true);
  addMerged(g, glass, M.glassBlue, false, true);
  addMerged(g, turq, M.turquoise, false, true);
  return { group: g };
}

// ---------- 4. ПАРЛАМЕНТ (Мажилис, x=+470, z=-140) ----------
function buildParliament(parent, M) {
  const S = sigById("parliament");
  if (!S) return { group: new THREE.Group() };
  const g = new THREE.Group();
  g.position.set(S.x, 0, S.z);
  g.name = "landmark-parliament";
  parent.add(g);

  const stone = [], gold = [], glass = [];
  {
    const B = new GB();
    B.box(0, 1.8, 0, 74, 3.6, 94, 0);
    // Высотная башня Мажилиса + зал заседаний
    B.box(-10, 42, 0, 32, 78, 36, 0);
    B.box(16, 17, 0, 34, 28, 72, 0);
    B.box(-10, 82, 0, 35, 2.6, 39, 0);
    stone.push(B.build());

    const BG = new GB();
    BG.box(-10, 42, 0, 32.6, 68, 28, 0);
    BG.box(16, 17, 0, 34.6, 20, 62, 0);
    glass.push(BG.build());
  }
  gold.push(onionDomeGeo(11.5, 9.5, 31.2, 16, 0, 24));
  gold.push(new THREE.CylinderGeometry(0.14, 0.4, 8, 8).translate(-10, 87, 0));

  addMerged(g, stone, M.travertine, true, true);
  addMerged(g, gold, M.gold, true, true);
  addMerged(g, glass, M.glassBlue, false, true);
  return { group: g };
}

// ---------- 5. СЕНАТ (x=+470, z=+140, симметрично Парламенту у Акорды) ----------
function buildSenate(parent, M) {
  const S = sigById("senate");
  if (!S) return { group: new THREE.Group() };
  const g = new THREE.Group();
  g.position.set(S.x, 0, S.z);
  g.name = "landmark-senate";
  parent.add(g);

  const stone = [], gold = [], glass = [], blue = [];
  {
    const B = new GB();
    B.box(0, 1.8, 0, 66, 3.6, 80, 0);
    B.box(0, 26, 0, 44, 46, 56, 0);
    B.box(0, 50, 0, 48, 2.4, 60, 0);
    revolve(B, [[13, 50], [13, 56], [12, 57]], 24, { smooth: false });
    stone.push(B.build());

    const BG = new GB();
    BG.box(0, 26, 0, 44.6, 36, 46, 0);
    glass.push(BG.build());
  }
  blue.push(onionDomeGeo(12.2, 10.5, 56.8, 0, 0, 24));
  gold.push(new THREE.CylinderGeometry(0.12, 0.36, 7.5, 8).translate(0, 70.5, 0));

  addMerged(g, stone, M.travertine, true, true);
  addMerged(g, blue, M.blueDome, true, true);
  addMerged(g, gold, M.gold, false, true);
  addMerged(g, glass, M.glassBlue, false, true);
  return { group: g };
}

// ---------- 6. НАЦИОНАЛЬНЫЙ МУЗЕЙ РК (синее стекло и белый мрамор) ----------
function buildMuseum(parent, M) {
  const P = L.museum;
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "landmark-museum";
  parent.add(g);

  const white = [], blueGlass = [], gold = [];
  {
    const B = new GB();
    B.box(0, 1.6, 0, 90, 3.2, 202, 0);
    B.box(-8, 16, 0, 48, 26, 174, 0);
    B.box(10, 20, -48, 36, 34, 52, 0);
    B.box(10, 20, +48, 36, 34, 52, 0);
    // Консольная белая парящая кровля
    B.box(4, 36.5, 0, 68, 3.2, 186, 0);
    white.push(B.build());

    // Фирменные синие стеклянные атриумные объёмы (смотрят на запад -X к Есилю и восток)
    const BG = new GB();
    BG.box(18, 18, 0, 24, 28, 72, 0);
    BG.box(-33, 18, 0, 12, 26, 142, 0);
    BG.box(28.5, 19, -48, 1.4, 26, 42, 0);
    BG.box(28.5, 19, +48, 1.4, 26, 42, 0);
    blueGlass.push(BG.build());

    // Золотой монумент перед музеем
    gold.push(new THREE.CylinderGeometry(0.9, 1.6, 16, 12).translate(-46, 10, 0));
    gold.push(new THREE.SphereGeometry(2.3, 12, 10).translate(-46, 19.5, 0));
  }

  addMerged(g, white, M.marble, true, true);
  addMerged(g, blueGlass, M.glassBlue, true, true);
  addMerged(g, gold, M.gold, false, true);
  return { group: g };
}

// ---------- 7. ТРИУМФАЛЬНАЯ АРКА «МӘҢГІЛІК ЕЛ» (x=+90, z=+640, пр. Мәңгілік Ел) ----------
function buildArch(parent, M) {
  const P = L.arch;
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "landmark-arch";
  parent.add(g);

  const trav = [], gold = [], granite = [];
  {
    // Пролёт по оси Z (пр. Мәңгілік Ел идёт по X=90 вдоль Z — пилоны слева и справа по X!)
    const B = new GB();
    B.box(-19, 11, 0, 10, 22, 12, 0);
    B.box(+19, 11, 0, 10, 22, 12, 0);
    // Верхний антаблемент и аттик над проспектом (общая высота ~24 м)
    B.box(0, 19.5, 0, 50, 5.2, 13, 0);
    B.box(0, 23.2, 0, 44, 3.0, 11, 0);
    B.box(0, 25.0, 0, 48, 1.0, 12.5, 0);
    // Арочный свод над дорогой
    const segs = 12, R = 13.5, cy = 10;
    for (let i = 0; i < segs; i++) {
      const am = ((i + 0.5) / segs) * Math.PI;
      B.box(Math.cos(am) * (R + 1.5), cy + Math.sin(am) * (R * 0.52), 0, 3.8, 3.4, 12, 0);
    }
    trav.push(B.build());

    // Гранитные базы пилонов
    const BG = new GB();
    BG.box(-19, 1.5, 0, 12, 3.0, 14, 0);
    BG.box(+19, 1.5, 0, 12, 3.0, 14, 0);
    granite.push(BG.build());

    // Бронзовые орнаментальные пояса и щиты «Мәңгілік Ел»
    const BGo = new GB();
    BGo.box(0, 21.8, +6.8, 36, 0.9, 0.5, 0);
    BGo.box(0, 21.8, -6.8, 36, 0.9, 0.5, 0);
    BGo.box(-19, 9.0, +6.3, 3.2, 5.5, 0.6, 0);
    BGo.box(+19, 9.0, +6.3, 3.2, 5.5, 0.6, 0);
    BGo.box(-19, 9.0, -6.3, 3.2, 5.5, 0.6, 0);
    BGo.box(+19, 9.0, -6.3, 3.2, 5.5, 0.6, 0);
    gold.push(BGo.build());
  }

  addMerged(g, trav, M.travertine, true, true);
  addMerged(g, granite, M.granite, true, true);
  addMerged(g, gold, M.brass, false, true);
  return { group: g };
}

// ---------- 8. АСТАНИНСКИЙ ЦИРК «НЛО» (x=-740, z=+340) ----------
function buildCircus(parent, M) {
  const S = sigById("circus");
  if (!S) return { group: new THREE.Group() };
  const g = new THREE.Group();
  g.position.set(S.x, 0, S.z);
  g.name = "landmark-circus";
  parent.add(g);

  const white = [], glass = [], steel = [];
  {
    const B = new GB();
    revolve(B, [[0, 0], [42, 0], [42, 2.5], [34, 2.5], [34, 5], [0, 5]], 40, { smooth: false });
    revolve(B, [
      [22, 5], [38, 13.5], [40, 16.5], [38, 19.5], [28, 26.5], [14, 31.5], [4, 33.5], [0, 34.5],
    ], 48, { smooth: true });
    white.push(B.build());

    const BG = new GB();
    revolve(BG, [[23, 5], [30, 10.2], [29, 10.9], [22, 5.5]], 40, { smooth: false });
    glass.push(BG.build());

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      steel.push(tube([
        new THREE.Vector3(ca * 39.5, 16.8, sa * 39.5),
        new THREE.Vector3(ca * 27.5, 26.8, sa * 27.5),
        new THREE.Vector3(ca * 6, 33.8, sa * 6),
      ], 0.35, 5));
    }
  }

  const ufoGlow = new THREE.Mesh(new THREE.TorusGeometry(40.2, 0.35, 8, 64).rotateX(Math.PI / 2), M.neon(0x00f5ff, 4.8));
  ufoGlow.position.y = 16.5;
  g.add(ufoGlow);

  addMerged(g, white, M.whitePaint, true, true);
  addMerged(g, glass, M.glassBlue, false, true);
  addMerged(g, steel, M.steel, true, true);
  return { group: g };
}

export function buildLandmarks(scene, M, _ctx) {
  const group = new THREE.Group();
  group.name = "landmarks-secondary";
  scene.add(group);

  buildAkOrda(group, M);
  buildMinistries(group, M);
  buildMosque(group, M);
  buildParliament(group, M);
  buildSenate(group, M);
  buildMuseum(group, M);
  buildArch(group, M);
  buildCircus(group, M);

  return {
    group,
    update(dt, time, _cam, cyberMix) {
      void dt; void time; void cyberMix;
    },
  };
}
