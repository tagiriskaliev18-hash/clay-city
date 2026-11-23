// ============================================================
// CLAY CITY v3 — процедурная застройка кварталов: 8 архитектурных
// архетипов (киберпанк-стекло, стимпанк-ар-деко, министерства,
// бизнес-центры, старый центр, современное жильё, пригород, цеха).
// Каждый архетип: 3 уровня LOD + упрощённый shadow-proxy, InstancedMesh.
// ============================================================
import * as THREE from "three";
import { PLATFORMS, ROAD, district, intersectsReserved } from "./config.js";
import { bandRange, avenues, blockClear, isBoulevard, yawOut, TAU } from "./grid.js";
import { rng, between, place, GB, rect, ngon, polyWalls, polyCap, polyPrism, parapet, revolve, merge, Archetype } from "./geom.js";

const CURB = ROAD.curb;

// Точная копия gHash из шейдера земли city.js, чтобы не ставить дома на парках
function fract(x) { return x - Math.floor(x); }
function gHash(x, y) {
  let px = fract(x * 123.34), py = fract(y * 345.45);
  const d = px * (px + 34.345) + py * (py + 34.345);
  px += d; py += d;
  return fract(px * py);
}
function isParkBlock(i, k) {
  return gHash(i * 1.37 + 0.5, k * 1.37 + 0.5) <= 0.26;
}

// ---------- геометрии архетипов (в единичном боксе: x,z ∈ [-0.5, 0.5], y ∈ [0, 1]) ----------

/** 1. Киберпанк-небоскрёб: ступенчатое стекло, боковые рёбра, техэтаж, корона + шпиль. */
function makeCyberTower(M) {
  const mkMain = (detail) => {
    const B = new GB();
    polyWalls(B, rect(1.0, 1.0), 0, 0.22);
    polyWalls(B, rect(0.88, 0.88), 0.22, 0.70);
    polyWalls(B, rect(0.70, 0.70), 0.70, 0.94);
    if (detail > 0) polyWalls(B, rect(0.46, 0.46), 0.94, 1.0);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 1.0), 0.22, true);
    polyCap(B, rect(0.88, 0.88), 0.70, true);
    polyCap(B, rect(0.70, 0.70), 0.94, true);
    polyCap(B, rect(0.46, 0.46), 1.0, true);
    return B.build();
  };
  const mkTrim = (detail) => {
    const B = new GB();
    // карнизы на уступах
    B.box(0, 0.225, 0, 1.03, 0.014, 1.03);
    B.box(0, 0.705, 0, 0.91, 0.014, 0.91);
    B.box(0, 0.945, 0, 0.73, 0.016, 0.73);
    if (detail === 2) {
      // угловые вертикальные пилоны
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        B.box(sx * 0.45, 0.46, sz * 0.45, 0.055, 0.48, 0.055);
        B.box(sx * 0.36, 0.82, sz * 0.36, 0.045, 0.24, 0.045);
      }
      // рама на крыше и мачта
      B.box(0, 1.035, 0, 0.24, 0.07, 0.24);
      B.box(0, 1.13, 0, 0.025, 0.22, 0.025);
    } else if (detail === 1) {
      B.box(0, 1.08, 0, 0.03, 0.16, 0.03);
    }
    return B.build();
  };
  const mkBrass = () => {
    const B = new GB();
    B.box(0, 0.46, 0, 0.90, 0.012, 0.90);
    B.box(0, 0.82, 0, 0.72, 0.012, 0.72);
    B.box(0, 1.005, 0, 0.49, 0.015, 0.49);
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(0.92, 0.98, 0.92).translate(0, 0.49, 0);
  return new Archetype("cyberTower", [
    { lods: [mkMain(2), mkMain(1), mkMain(0)], mat: M.glass },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
    { lods: [mkTrim(2), mkTrim(1), null], mat: M.darkMetal },
    { lods: [mkBrass(), null, null], mat: M.brass },
  ], { proxyGeo: proxy, colors: true });
}

/** 2. Стимпанк Ар-Деко башня: уступы, восьмигранная корона, латунные пояса и шпиль. */
function makeDecoSpire(M) {
  const mkMain = (detail) => {
    const B = new GB();
    polyWalls(B, rect(1.0, 1.0), 0, 0.32);
    polyWalls(B, rect(0.84, 0.84), 0.32, 0.68);
    polyWalls(B, detail > 0 ? ngon(8, 0.42, Math.PI / 8) : rect(0.66, 0.66), 0.68, 0.90);
    if (detail > 0) polyWalls(B, ngon(8, 0.28, Math.PI / 8), 0.90, 1.0);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 1.0), 0.32, true);
    polyCap(B, rect(0.84, 0.84), 0.68, true);
    polyCap(B, ngon(8, 0.42, Math.PI / 8), 0.90, true);
    polyCap(B, ngon(8, 0.28, Math.PI / 8), 1.0, true);
    return B.build();
  };
  const mkBrass = (detail) => {
    const B = new GB();
    B.box(0, 0.325, 0, 1.04, 0.018, 1.04);
    B.box(0, 0.685, 0, 0.88, 0.018, 0.88);
    if (detail === 2) {
      // ступенчатый шпиль с шаром
      revolve(B, [[0.24, 1.0], [0.16, 1.05], [0.07, 1.07], [0.02, 1.24], [0, 1.26]], 10, { smooth: false });
      for (const s of [-0.36, 0.36]) {
        B.box(s, 0.50, 0.43, 0.04, 0.36, 0.03);
        B.box(s, 0.50, -0.43, 0.04, 0.36, 0.03);
      }
    } else if (detail === 1) {
      revolve(B, [[0.22, 1.0], [0.02, 1.22], [0, 1.24]], 6, { smooth: false });
    }
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(0.88, 1.0, 0.88).translate(0, 0.5, 0);
  return new Archetype("decoSpire", [
    { lods: [mkMain(2), mkMain(1), mkMain(0)], mat: M.stoneRibbon },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
    { lods: [mkBrass(2), mkBrass(1), null], mat: M.brass },
  ], { proxyGeo: proxy, colors: true });
}

/** 3. Министерский / правительственный корпус: каменный ордер, колоннада, карниз, пологий купол. */
function makeGovBlock(M) {
  const mkMain = () => {
    const B = new GB();
    polyWalls(B, rect(1.0, 1.0), 0, 0.86);
    polyWalls(B, rect(0.82, 0.78), 0.86, 1.0);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 1.0), 0.86, true);
    polyCap(B, rect(0.82, 0.78), 1.0, true);
    return B.build();
  };
  const mkStone = (detail) => {
    const B = new GB();
    // цоколь и массивный карниз
    B.box(0, 0.06, 0, 1.04, 0.12, 1.04);
    B.box(0, 0.87, 0, 1.06, 0.035, 1.06);
    if (detail === 2) {
      // портик-колоннада по переднему и заднему фасаду
      for (const sz of [-0.52, 0.52]) {
        for (let i = -2; i <= 2; i++) B.box(i * 0.16, 0.44, sz, 0.045, 0.76, 0.05);
      }
    }
    return B.build();
  };
  const mkDome = () => {
    const B = new GB();
    revolve(B, [[0.26, 1.0], [0.25, 1.05], [0.21, 1.11], [0.13, 1.16], [0.03, 1.19], [0, 1.24]], 14, { smooth: true });
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(1.0, 1.0, 1.0).translate(0, 0.5, 0);
  return new Archetype("govBlock", [
    { lods: [mkMain(), mkMain(), mkMain()], mat: M.stone },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
    { lods: [mkStone(2), mkStone(1), null], mat: M.marble },
    { lods: [mkDome(), mkDome(), null], mat: M.turquoise },
  ], { proxyGeo: proxy, colors: true });
}

/** 4. Современный бизнес-центр: подиум + консольный стеклянный блок + металлическая рама. */
function makeMidOffice(M) {
  const mkGlass = () => {
    const B = new GB();
    polyWalls(B, rect(1.0, 0.94), 0, 0.26);
    polyWalls(B, rect(0.92, 0.86), 0.26, 0.96);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 0.94), 0.26, true);
    polyCap(B, rect(0.92, 0.86), 0.96, true);
    return B.build();
  };
  const mkFrame = (detail) => {
    const B = new GB();
    B.box(0, 0.975, 0, 0.96, 0.03, 0.90);
    if (detail === 2) {
      B.box(0, 0.27, 0, 1.02, 0.02, 0.96);
      B.box(-0.22, 1.03, -0.1, 0.34, 0.09, 0.36); // техблок вентиляции
      B.box(0.24, 1.02, 0.14, 0.22, 0.06, 0.24);
    }
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(0.96, 0.98, 0.90).translate(0, 0.49, 0);
  return new Archetype("midOffice", [
    { lods: [mkGlass(), mkGlass(), mkGlass()], mat: M.glass },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
    { lods: [mkFrame(2), mkFrame(1), null], mat: M.steel },
  ], { proxyGeo: proxy, colors: true });
}

/** 5. Советская панелька (5–9 этажей): строгий блок, парапет, лифтовые шахты. */
function makeSovietPanel(M) {
  const mkMain = () => {
    const B = new GB();
    polyWalls(B, rect(1.0, 1.0), 0, 0.96);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 1.0), 0.96, true);
    return B.build();
  };
  const mkDetail = (detail) => {
    const B = new GB();
    B.box(0, 0.975, 0, 1.02, 0.03, 1.02);
    if (detail === 2) {
      B.box(-0.28, 1.02, 0, 0.16, 0.08, 0.28);
      B.box(0.28, 1.02, 0, 0.16, 0.08, 0.28);
      B.box(0, 0.04, 0, 1.02, 0.08, 1.02);
    }
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(1.0, 0.98, 1.0).translate(0, 0.49, 0);
  return new Archetype("sovietPanel", [
    { lods: [mkMain(), mkMain(), mkMain()], mat: M.panel },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
    { lods: [mkDetail(2), mkDetail(1), null], mat: M.concreteDark },
  ], { proxyGeo: proxy, colors: true });
}

/** 6. Современный ЖК Астаны: стилобат + жилая башня со ступенчатой короной и светлой рамой. */
function makeModernRes(M) {
  const mkMain = () => {
    const B = new GB();
    polyWalls(B, rect(1.0, 1.0), 0, 0.18);
    polyWalls(B, rect(0.84, 0.88), 0.18, 0.94);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 1.0), 0.18, true);
    polyCap(B, rect(0.84, 0.88), 0.94, true);
    return B.build();
  };
  const mkCrown = (detail) => {
    const B = new GB();
    B.box(0, 0.19, 0, 1.03, 0.02, 1.03);
    B.box(0, 0.96, 0, 0.88, 0.04, 0.92);
    if (detail === 2) {
      B.box(0, 1.01, -0.36, 0.86, 0.06, 0.08);
      B.box(0, 1.01, 0.36, 0.86, 0.06, 0.08);
      B.box(-0.38, 0.56, 0, 0.05, 0.76, 0.92);
      B.box(0.38, 0.56, 0, 0.05, 0.76, 0.92);
    }
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(0.92, 0.98, 0.94).translate(0, 0.49, 0);
  return new Archetype("modernRes", [
    { lods: [mkMain(), mkMain(), mkMain()], mat: M.res },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
    { lods: [mkCrown(2), mkCrown(1), null], mat: M.whitePlate },
  ], { proxyGeo: proxy, colors: true });
}

/** 7. Пригородный коттедж / таунхаус: каменные стены + медная вальмовая крыша. */
function makeSuburbVilla(M) {
  const mkWall = () => {
    const B = new GB();
    polyWalls(B, rect(1.0, 1.0), 0, 0.68);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    const y0 = 0.68, y1 = 1.0;
    const base = rect(1.08, 1.08), ridge = [[-0.25, 0], [0.25, 0]];
    // 4 ската вальмовой крыши
    const A = [base[0][0], y0, base[0][1]], Bv = [base[1][0], y0, base[1][1]];
    const C = [base[2][0], y0, base[2][1]], D = [base[3][0], y0, base[3][1]];
    const R0 = [ridge[0][0], y1, ridge[0][1]], R1 = [ridge[1][0], y1, ridge[1][1]];
    const addQuad = (p0, p1, p2, p3) => {
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
      const vx = p3[0] - p0[0], vy = p3[1] - p0[1], vz = p3[2] - p0[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      B.quad(p0, p1, p2, p3, [nx, ny, nz], [0, 0], [1, 0], [1, 1], [0, 1]);
    };
    const addTri = (p0, p1, p2) => {
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
      const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      B.tri(p0, p1, p2, [nx, ny, nz], [0, 0], [1, 0], [0.5, 1]);
    };
    addQuad(Bv, A, R0, R1);
    addQuad(D, C, R1, R0);
    addTri(A, D, R0);
    addTri(C, Bv, R1);
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(1.0, 0.9, 1.0).translate(0, 0.45, 0);
  return new Archetype("suburbVilla", [
    { lods: [mkWall(), mkWall(), mkWall()], mat: M.stone },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.copper },
  ], { proxyGeo: proxy, colors: true });
}

/** 8. Промышленный цех / стимпанк-ангар: тёмный бетон + пилообразная стальная кровля + трубы. */
function makeFactoryHall(M) {
  const mkWall = () => {
    const B = new GB();
    polyPrism(B, rect(1.0, 1.0), 0, 0.72);
    return B.build();
  };
  const mkTop = (detail) => {
    const B = new GB();
    for (let i = 0; i < 3; i++) B.box(-0.30 + i * 0.30, 0.80, 0, 0.22, 0.16, 0.92);
    if (detail === 2) {
      B.box(-0.35, 1.04, -0.35, 0.08, 0.48, 0.08);
      B.box(-0.18, 0.98, -0.35, 0.07, 0.36, 0.07);
    }
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(1.0, 0.85, 1.0).translate(0, 0.425, 0);
  return new Archetype("factoryHall", [
    { lods: [mkWall(), mkWall(), mkWall()], mat: M.concreteDark },
    { lods: [mkTop(2), mkTop(1), null], mat: M.steel },
  ], { proxyGeo: proxy, colors: true });
}

// ---------- выбор архетипа и габаритов по району ----------
function pickSpec(dist, r, maxW, maxD) {
  let kind, hMin, hMax, tint;
  if (dist === "downtown") {
    kind = r() < 0.62 ? "cyberTower" : "decoSpire";
    hMin = 72; hMax = 165;
    tint = kind === "cyberTower" ? [0.85 + r() * 0.2, 0.92 + r() * 0.15, 0.98 + r() * 0.12] : [0.92 + r() * 0.14, 0.88 + r() * 0.14, 0.82 + r() * 0.14];
  } else if (dist === "business") {
    const u = r();
    kind = u < 0.38 ? "cyberTower" : u < 0.68 ? "midOffice" : "decoSpire";
    hMin = 48; hMax = 122;
    tint = [0.88 + r() * 0.18, 0.90 + r() * 0.16, 0.92 + r() * 0.16];
  } else if (dist === "government") {
    kind = r() < 0.72 ? "govBlock" : "midOffice";
    hMin = 24; hMax = 44;
    tint = [0.96 + r() * 0.08, 0.94 + r() * 0.08, 0.88 + r() * 0.08];
  } else if (dist === "midrise") {
    kind = r() < 0.55 ? "modernRes" : "midOffice";
    hMin = 30; hMax = 64;
    tint = [0.92 + r() * 0.14, 0.90 + r() * 0.14, 0.86 + r() * 0.14];
  } else if (dist === "oldcenter") {
    kind = r() < 0.78 ? "sovietPanel" : "modernRes";
    hMin = 18; hMax = 34;
    tint = [0.88 + r() * 0.18, 0.86 + r() * 0.16, 0.82 + r() * 0.16];
  } else if (dist === "residential") {
    kind = r() < 0.72 ? "modernRes" : "sovietPanel";
    hMin = 28; hMax = 68;
    tint = [0.92 + r() * 0.14, 0.90 + r() * 0.14, 0.88 + r() * 0.14];
  } else if (dist === "industry") {
    kind = r() < 0.75 ? "factoryHall" : "sovietPanel";
    hMin = 14; hMax = 28;
    tint = [0.80 + r() * 0.2, 0.78 + r() * 0.2, 0.76 + r() * 0.2];
  } else {
    kind = "suburbVilla";
    hMin = 9; hMax = 16;
    tint = [0.94 + r() * 0.12, 0.90 + r() * 0.12, 0.82 + r() * 0.12];
  }
  const w = Math.max(10, Math.min(maxW, between(r, maxW * 0.62, maxW * 0.92)));
  const d = Math.max(10, Math.min(maxD, between(r, maxD * 0.62, maxD * 0.92)));
  const h = between(r, hMin, hMax);
  return { kind, w, d, h, tint };
}

export function buildBuildings(scene, M, ctx) {
  const r = rng(202607);
  const archMap = {
    cyberTower: makeCyberTower(M),
    decoSpire: makeDecoSpire(M),
    govBlock: makeGovBlock(M),
    midOffice: makeMidOffice(M),
    sovietPanel: makeSovietPanel(M),
    modernRes: makeModernRes(M),
    suburbVilla: makeSuburbVilla(M),
    factoryHall: makeFactoryHall(M),
  };
  const buckets = Object.fromEntries(Object.keys(archMap).map((k) => [k, []]));
  const list = [];

  for (const plat of PLATFORMS) {
    for (let i = 0; i < plat.ringRoads.length; i++) {
      const clr = blockClear(plat, i);
      if (!clr) continue;
      const [r0, r1] = bandRange(plat, i);
      const n = avenues(plat, i), cell = TAU / n;
      const rIn = clr.rIn + 2.5, rOut = clr.rOut - 2.5;
      const radSpan = rOut - rIn;
      if (radSpan < 14) continue;

      for (let k = 0; k < n; k++) {
        if (isParkBlock(i, k)) continue;
        const a0 = -Math.PI + k * cell, a1 = a0 + cell;
        const rMid = (rIn + rOut) / 2;
        const padA = Math.asin(Math.min(0.45, (ROAD.aveHalf + ROAD.walk + 2.5) / rMid));
        const bA = a0 + padA, eA = a1 - padA;
        if (eA <= bA) continue;
        const arcW = (eA - bA) * rMid;
        if (arcW < 14) continue;

        // разбиваем широкие кварталы на 1–3 участка по дуге и 1–2 по радиусу
        const nArc = Math.max(1, Math.min(3, Math.floor(arcW / 28)));
        const nRad = radSpan > 46 ? 2 : 1;
        const stepA = (eA - bA) / nArc;
        const stepR = radSpan / nRad;

        for (let ir = 0; ir < nRad; ir++) {
          const rr = rIn + (ir + 0.5) * stepR;
          for (let ia = 0; ia < nArc; ia++) {
            const aa = bA + (ia + 0.5) * stepA;
            const x = Math.cos(aa) * rr, z = Math.sin(aa) * rr;
            if (isBoulevard(plat, x, z)) continue;

            const dist = district(plat.id, x, z);
            // промзона на юге ringD уже застроена крупными резервуарами и трубами в city.js
            if (plat.id === "ringD" && dist === "industry" && r() < 0.45) continue;

            const slotW = Math.min(36, stepA * rr - 5.5);
            const slotD = Math.min(32, stepR - 5.5);
            if (slotW < 10 || slotD < 10) continue;

            const spec = pickSpec(dist, r, slotW, slotD);
            const hx = Math.max(spec.w, spec.d) * 0.58 + 3;
            if (intersectsReserved(x, z, hx, hx)) continue;
            // не залезаем на бульвар и причальные мачты у кромки
            if (isBoulevard(plat, x, z + hx) || isBoulevard(plat, x, z - hx)) continue;

            const yaw = yawOut(x, z);
            const y = plat.y + CURB;
            buckets[spec.kind].push({ x, y, z, yaw, w: spec.w, h: spec.h, d: spec.d, tint: spec.tint });
            list.push({ x, y, z, yaw, w: spec.w, d: spec.d, h: spec.h, kind: spec.kind, district: dist });
          }
        }
      }
    }
  }

  // собираем инстансы по архетипам
  const archetypes = [];
  for (const [key, items] of Object.entries(buckets)) {
    if (!items.length) continue;
    const arch = archMap[key];
    arch.build(scene, items.length);
    const mats = new Float32Array(items.length * 16);
    const cols = new Float32Array(items.length * 3);
    items.forEach((b, idx) => {
      const m = place(b.x, b.y, b.z, b.yaw, b.w, b.h, b.d);
      mats.set(m.elements, idx * 16);
      cols[idx * 3] = b.tint[0];
      cols[idx * 3 + 1] = b.tint[1];
      cols[idx * 3 + 2] = b.tint[2];
    });
    arch.setInstances(mats, cols);
    archetypes.push(arch);
  }

  // первичный расчёт LOD
  const lodDist = ctx.tier && ctx.tier.lod ? ctx.tier.lod : [800, 2200];
  const lastCam = new THREE.Vector3(1e9, 1e9, 1e9);
  function refreshLOD(camPos) {
    for (const a of archetypes) a.updateLOD(camPos, lodDist[0], lodDist[1]);
    lastCam.copy(camPos);
  }
  refreshLOD(ctx.camera.position);

  let timer = 0;
  return {
    list,
    archetypes,
    update(dt, _time, camera) {
      timer += dt;
      if (timer < 0.25 && lastCam.distanceToSquared(camera.position) < 400) return;
      timer = 0;
      refreshLOD(camera.position);
    },
  };
}
