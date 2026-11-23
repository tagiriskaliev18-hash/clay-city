// ============================================================
// CLAY CITY v3 — фирменные небоскрёбы Астаны + Abu Dhabi Plaza (382 м).
// Все 11 башен из SIGNATURE + Abu Dhabi Plaza из ZONES.
// Геометрия батчится по материалам для минимального числа draw calls.
// ============================================================
import * as THREE from "three";
import { SIGNATURE, ZONES, PLATFORM_Y } from "./config.js";
import { GB, rect, ngon, ellipse, polyPrism, revolve, tube, merge } from "./geom.js";

const sigById = (id) => SIGNATURE.find((s) => s.id === id);
const zoneById = (id) => ZONES.find((z) => z.id === id);

function addMerged(parent, list, mat, cast = true, receive = true) {
  if (!list.length) return null;
  const m = new THREE.Mesh(merge(list), mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

/** Призма со скошенной крышей (наклон по Z). */
function slopedTower(w, d, h0, h1, yBase = 0) {
  const B = new GB();
  const hx = w / 2, hz = d / 2;
  const A = [-hx, yBase, -hz], Bv = [hx, yBase, -hz], C = [hx, yBase, hz], D = [-hx, yBase, hz];
  const At = [-hx, yBase + h0, -hz], Bt = [hx, yBase + h0, -hz], Ct = [hx, yBase + h1, hz], Dt = [-hx, yBase + h1, hz];
  // 4 стены
  B.quad(Bv, A, At, Bt, [0, 0, -1], [w, 0], [0, 0], [0, h0], [w, h0]);
  B.quad(C, Bv, Bt, Ct, [1, 0, 0], [d, 0], [0, 0], [0, h0], [d, h1]);
  B.quad(D, C, Ct, Dt, [0, 0, 1], [w, 0], [0, 0], [0, h1], [w, h1]);
  B.quad(A, D, Dt, At, [-1, 0, 0], [d, 0], [0, 0], [0, h1], [d, h0]);
  // наклонная крыша
  const dy = h1 - h0, L = Math.hypot(d, dy) || 1;
  B.quad(At, Dt, Ct, Bt, [0, d / L, -dy / L], [0, 0], [0, L], [w, L], [w, 0]);
  return B.build();
}

// ---------- ABU DHABI PLAZA (382 м, кольцо B) ----------
function buildAbuDhabi(parent, M) {
  const z = zoneById("abuDhabi");
  const g = new THREE.Group();
  g.position.set(z.x, PLATFORM_Y[z.plat] || 0, z.z);
  parent.add(g);

  const glass = [], steel = [], brass = [], neon = [];
  // обширный многоуровневый стилобат
  {
    const B = new GB();
    polyPrism(B, rect(124, 118), 0, 18);
    polyPrism(B, rect(108, 102), 18, 28);
    steel.push(B.build());
  }
  // Главная 382-метровая башня (ступенчатые грани + острая скошенная корона)
  glass.push(slopedTower(42, 36, 260, 290, 28));
  glass.push(slopedTower(32, 28, 340, 368, 28).translate(3, 0, -2));
  // 3 сопутствующие высотные башни комплекса (210 м, 165 м, 128 м)
  glass.push(slopedTower(30, 26, 200, 218, 28).translate(-36, 0, -24));
  glass.push(slopedTower(28, 24, 152, 168, 28).translate(36, 0, 26));
  glass.push(slopedTower(26, 24, 118, 130, 28).translate(-32, 0, 32));

  // структурные вертикальные рёбра, техпояса и шпиль-антенна до 382 м
  {
    const BS = new GB(), BB = new GB(), BN = new GB();
    for (const y of [90, 160, 230, 300]) {
      BB.box(0, y, 0, 44, 2.2, 38);
      BN.box(0, y + 1.2, 0, 44.6, 0.5, 38.6);
    }
    // переходной небесный мост к западной башне
    BS.box(-18, 145, -12, 26, 8, 12);
    // корона и шпиль
    BS.box(3, 372, -2, 10, 12, 10);
    BS.box(3, 386, -2, 1.4, 24, 1.4);
    steel.push(BS.build());
    brass.push(BB.build());
    neon.push(BN.build());
  }

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), M.glow(0xff2a1a, 7));
  beacon.position.set(3, 399, -2);
  g.add(beacon);

  addMerged(g, glass, M.glass, true, true);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, brass, M.brass, false, true);
  addMerged(g, neon, M.neon(0x46f2ff, 4.5), false, false);
}

// ---------- EMERALD TOWERS I (210 м) & II (152 м) ----------
function buildEmerald(parent, M, id, h) {
  const s = sigById(id);
  const g = new THREE.Group();
  g.position.set(s.x, PLATFORM_Y[s.plat] || 0, s.z);
  g.rotation.y = s.yaw;
  parent.add(g);

  const glass = [], brass = [], steel = [];
  const tiers = 7, th = h / tiers;
  const rx0 = id === "emerald1" ? 19 : 15, rz0 = id === "emerald1" ? 15 : 12;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const scale = 1 + 0.16 * Math.pow(t, 1.4) - (i === tiers - 1 ? 0.12 : 0);
    const shiftX = t * (id === "emerald1" ? 6.5 : -4.2);
    const pts = ellipse(rx0 * scale, rz0 * scale, 22, shiftX, 0);
    const B = new GB();
    polyPrism(B, pts, i * th, (i + 1) * th);
    glass.push(B.build());

    // горизонтальный пояс жёсткости
    const BB = new GB();
    polyPrism(BB, ellipse(rx0 * scale + 0.5, rz0 * scale + 0.5, 22, shiftX, 0), (i + 1) * th - 0.8, (i + 1) * th + 0.3);
    brass.push(BB.build());
  }
  // шпиль и корона
  steel.push(new THREE.CylinderGeometry(0.18, 0.7, 22, 8).translate(id === "emerald1" ? 5 : -3, h + 11, 0));

  addMerged(g, glass, M.glass, true, true);
  addMerged(g, brass, M.brass, false, true);
  addMerged(g, steel, M.steel, false, true);
}

// ---------- TRANSPORT TOWER («Зажигалка», 168 м) ----------
function buildTransport(parent, M) {
  const s = sigById("transport");
  const g = new THREE.Group();
  g.position.set(s.x, PLATFORM_Y[s.plat] || 0, s.z);
  g.rotation.y = s.yaw;
  parent.add(g);

  const glass = [], steel = [], neon = [];
  // стилобат
  { const B = new GB(); polyPrism(B, ellipse(25, 19, 24), 0, 14); steel.push(B.build()); }
  // корпус с постепенным сужением и скошенным верхом
  glass.push(slopedTower(34, 22, 138, 162, 14));
  // характерная вершина-«плавник» и антенна
  {
    const B = new GB();
    B.box(0, 164, 4, 24, 10, 8);
    B.box(0, 180, 4, 1.0, 26, 1.0);
    steel.push(B.build());
    const BN = new GB();
    BN.box(0, 140, 0, 34.8, 0.7, 22.8);
    neon.push(BN.build());
  }

  addMerged(g, glass, M.glass, true, true);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, neon, M.neon(0x46f2ff, 4.5), false, false);
}

// ---------- NORTHERN LIGHTS («Северное сияние», 3 волнистые башни) ----------
function buildNorthLights(parent, M) {
  const s = sigById("northLights");
  const g = new THREE.Group();
  g.position.set(s.x, PLATFORM_Y[s.plat] || 0, s.z);
  g.rotation.y = s.yaw;
  parent.add(g);

  const glass = [], steel = [], neon = [];
  { const B = new GB(); polyPrism(B, rect(114, 46), 0, 12); steel.push(B.build()); }

  for (const [ox, h] of [[-38, 108], [0, 148], [38, 124]]) {
    const segs = 6, sh = (h - 12) / segs;
    for (let i = 0; i < segs; i++) {
      const wave = Math.sin((i / segs) * Math.PI * 1.4) * 3.8;
      const B = new GB();
      polyPrism(B, rect(24, 22, ox + wave, 0), 12 + i * sh, 12 + (i + 1) * sh);
      glass.push(B.build());
    }
    const BN = new GB();
    BN.box(ox, h + 0.6, 0, 25, 0.9, 23);
    neon.push(BN.build());
  }
  // связующие мосты на уровне 42 м
  { const B = new GB(); B.box(-19, 44, 0, 16, 6, 12); B.box(19, 44, 0, 16, 6, 12); steel.push(B.build()); }

  addMerged(g, glass, M.glass, true, true);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, neon, M.neon(0x55ffd8, 4.2), false, false);
}

// ---------- KAZMUNAYGAS («Ворота», 165 м + золотая арка) ----------
function buildKmgas(parent, M) {
  const s = sigById("kmgas");
  const g = new THREE.Group();
  g.position.set(s.x, PLATFORM_Y[s.plat] || 0, s.z);
  g.rotation.y = s.yaw;
  parent.add(g);

  const stone = [], glass = [], gold = [];
  {
    const B = new GB();
    B.box(-26, 76, 0, 26, 152, 24);
    B.box(26, 76, 0, 26, 152, 24);
    // верхняя перемычка «ворот»
    B.box(0, 142, 0, 82, 24, 24);
    B.box(0, 158, 0, 56, 10, 20);
    stone.push(B.build());

    const BG = new GB();
    BG.box(-26, 76, 12.2, 18, 136, 0.8);
    BG.box(26, 76, 12.2, 18, 136, 0.8);
    glass.push(BG.build());
  }
  // культовый золотой диск/кольцо в проёме арки
  gold.push(new THREE.TorusGeometry(18, 2.2, 10, 40).translate(0, 106, 0));
  gold.push(new THREE.CylinderGeometry(0.25, 0.9, 18, 8).translate(0, 171, 0));

  addMerged(g, stone, M.stoneRibbon, true, true);
  addMerged(g, glass, M.glassDark, false, true);
  addMerged(g, gold, M.gold, false, true);
}

// ---------- BEIJING PALACE (126 м + золотая сфера на крыше) ----------
function buildBeijing(parent, M) {
  const s = sigById("beijing");
  const g = new THREE.Group();
  g.position.set(s.x, PLATFORM_Y[s.plat] || 0, s.z);
  g.rotation.y = s.yaw;
  parent.add(g);

  const stone = [], gold = [];
  {
    const B = new GB();
    polyPrism(B, rect(44, 34), 0, 16);
    polyPrism(B, rect(38, 26), 16, 106);
    B.box(0, 108, 0, 42, 4, 30);
    stone.push(B.build());
  }
  gold.push(new THREE.SphereGeometry(11.5, 28, 20).translate(0, 118, 0));
  gold.push(new THREE.TorusGeometry(13.2, 0.6, 8, 36).rotateX(Math.PI / 2).translate(0, 111, 0));

  addMerged(g, stone, M.stoneRibbon, true, true);
  addMerged(g, gold, M.gold, true, true);
}

// ---------- TALAN TOWERS (бронзовое стекло, скошенные крыши) ----------
function buildTalan(parent, M) {
  const s = sigById("talan");
  const g = new THREE.Group();
  g.position.set(s.x, PLATFORM_Y[s.plat] || 0, s.z);
  g.rotation.y = s.yaw;
  parent.add(g);

  const glass = [], brass = [], stone = [];
  { const B = new GB(); polyPrism(B, rect(108, 42), 0, 14); stone.push(B.build()); }
  glass.push(slopedTower(34, 28, 138, 158, 14).translate(-26, 0, 0));
  glass.push(slopedTower(30, 26, 118, 102, 14).translate(28, 0, 0));
  // бронзовые фасадные рёбра
  {
    const B = new GB();
    for (const ox of [-26, 28]) {
      for (const sx of [-1, 1]) B.box(ox + sx * 15, 68, 0, 1.6, 108, 29);
    }
    brass.push(B.build());
  }

  addMerged(g, glass, M.glass, true, true);
  addMerged(g, brass, M.brass, false, true);
  addMerged(g, stone, M.marble, true, true);
}

// ---------- TRIUMPH OF ASTANA (142 м, высотка со шпилем) ----------
function buildTriumph(parent, M) {
  const s = sigById("triumph");
  const g = new THREE.Group();
  g.position.set(s.x, PLATFORM_Y[s.plat] || 0, s.z);
  g.rotation.y = s.yaw;
  parent.add(g);

  const stone = [], gold = [];
  {
    const B = new GB();
    polyPrism(B, rect(54, 42), 0, 38);
    polyPrism(B, rect(40, 32), 38, 84);
    polyPrism(B, rect(26, 22), 84, 112);
    polyPrism(B, ngon(8, 10, Math.PI / 8), 112, 126);
    // 4 угловые башенки
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(sx * 22, 46, sz * 17, 7, 18, 7);
    stone.push(B.build());
  }
  gold.push(new THREE.ConeGeometry(7.2, 24, 8).translate(0, 138, 0));
  gold.push(new THREE.CylinderGeometry(0.15, 0.5, 16, 8).translate(0, 156, 0));

  addMerged(g, stone, M.stone, true, true);
  addMerged(g, gold, M.gold, false, true);
}

// ---------- МОСКВА (треугольная башня 102 м) ----------
function buildMoscow(parent, M) {
  const s = sigById("moscow");
  const g = new THREE.Group();
  g.position.set(s.x, PLATFORM_Y[s.plat] || 0, s.z);
  g.rotation.y = s.yaw;
  parent.add(g);

  const glass = [], steel = [];
  {
    const B = new GB();
    polyPrism(B, ngon(3, 28, Math.PI / 6), 0, 16);
    polyPrism(B, ngon(3, 22, Math.PI / 6), 16, 102);
    glass.push(B.build());
    const BS = new GB();
    polyPrism(BS, ngon(3, 23.2, Math.PI / 6), 101, 104);
    steel.push(BS.build());
  }
  addMerged(g, glass, M.glass, true, true);
  addMerged(g, steel, M.steel, false, true);
}

// ---------- ARMADA (две плиты + верхний мост, 110 м) ----------
function buildArmada(parent, M) {
  const s = sigById("armada");
  const g = new THREE.Group();
  g.position.set(s.x, PLATFORM_Y[s.plat] || 0, s.z);
  g.rotation.y = s.yaw;
  parent.add(g);

  const glass = [], steel = [], neon = [];
  {
    const B = new GB();
    B.box(-26, 55, 0, 22, 110, 26);
    B.box(26, 55, 0, 22, 110, 26);
    glass.push(B.build());
    const BS = new GB();
    BS.box(0, 96, 0, 74, 12, 22);
    steel.push(BS.build());
    const BN = new GB();
    BN.box(0, 102.5, 11.4, 74, 0.7, 0.6);
    BN.box(0, 102.5, -11.4, 74, 0.7, 0.6);
    neon.push(BN.build());
  }
  addMerged(g, glass, M.glass, true, true);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, neon, M.neon(0xff3dd8, 4.2), false, false);
}

// ---------- ARMAN (близнецы с острыми коронами, 118 м) ----------
function buildArman(parent, M) {
  const s = sigById("arman");
  const g = new THREE.Group();
  g.position.set(s.x, PLATFORM_Y[s.plat] || 0, s.z);
  g.rotation.y = s.yaw;
  parent.add(g);

  const glass = [], brass = [];
  glass.push(slopedTower(24, 24, 96, 118, 0).translate(-22, 0, 0));
  glass.push(slopedTower(24, 24, 118, 96, 0).translate(22, 0, 0));
  {
    const B = new GB();
    B.box(0, 12, 0, 76, 24, 30);
    B.box(-22, 122, 8, 0.7, 16, 0.7);
    B.box(22, 122, -8, 0.7, 16, 0.7);
    brass.push(B.build());
  }
  addMerged(g, glass, M.stoneRibbon, true, true);
  addMerged(g, brass, M.brass, false, true);
}

export function buildSignature(scene, M, _ctx) {
  const group = new THREE.Group();
  group.name = "signature-towers";
  scene.add(group);

  buildAbuDhabi(group, M);
  buildEmerald(group, M, "emerald1", 210);
  buildEmerald(group, M, "emerald2", 152);
  buildTransport(group, M);
  buildNorthLights(group, M);
  buildKmgas(group, M);
  buildBeijing(group, M);
  buildTalan(group, M);
  buildTriumph(group, M);
  buildMoscow(group, M);
  buildArmada(group, M);
  buildArman(group, M);

  return { group, update() {} };
}
