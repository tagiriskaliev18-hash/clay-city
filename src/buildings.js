// ============================================================
// ASTANA REAL v5 — buildings.js
// Плотная квартальная застройка Левого и Правого берега, Улы Дала и EXPO:
//   - ~950–1,200 детализированных зданий (InstancedMesh + LOD)
//   - Богатая палитра Астаны: травертин, неоклассика, терракота и айвори ЖК,
//     бронзовые/изумрудные/синие витражные башни, коммерческие ряды
//   - Благоустроенные зелёные дворы и плиточные площади (никаких пустырей!)
//   - Наземные витрины ретейла (y=0..4.6 м) с цветными маркизами и вывесками:
//     MAGNUM, SMALL, COFFEE BOOM, АПТЕКА 24, KFC, BAKER STREET, OPTIKA,
//     FLOWERS, БАНК, BARBERSHOP
// ============================================================
import * as THREE from "three";
import { ROADS, intersectsReserved, district } from "./config.js";
import { rng, between, place, merge, GB, rect, polyWalls, polyCap, Archetype } from "./geom.js";

// ---------- Архетипы зданий (нормализованный юнит-бокс: x,z ∈ [-0.5,0.5], y ∈ [0,1]) ----------

function makeGlassTower(M, glassMat, trimMat, name) {
  const mkMain = (detail) => {
    const B = new GB();
    polyWalls(B, rect(1.0, 1.0), 0, 0.16);
    polyWalls(B, rect(0.90, 0.90), 0.16, 0.72);
    polyWalls(B, rect(0.76, 0.76), 0.72, 0.94);
    if (detail > 0) polyWalls(B, rect(0.54, 0.54), 0.94, 1.0);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 1.0), 0.16, true);
    polyCap(B, rect(0.90, 0.90), 0.72, true);
    polyCap(B, rect(0.76, 0.76), 0.94, true);
    polyCap(B, rect(0.54, 0.54), 1.0, true);
    return B.build();
  };
  const mkTrim = (detail) => {
    const B = new GB();
    B.box(0, 0.165, 0, 1.03, 0.016, 1.03);
    B.box(0, 0.725, 0, 0.93, 0.016, 0.93);
    B.box(0, 0.945, 0, 0.79, 0.018, 0.79);
    if (detail === 2) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        B.box(sx * 0.45, 0.45, sz * 0.45, 0.045, 0.56, 0.045);
      }
      B.box(0, 1.025, 0, 0.28, 0.05, 0.28);
      B.box(0, 1.10, 0, 0.022, 0.14, 0.022);
    }
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(0.92, 0.98, 0.92).translate(0, 0.49, 0);
  return new Archetype(name, [
    { lods: [mkMain(2), mkMain(1), mkMain(0)], mat: glassMat },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
    { lods: [mkTrim(2), mkTrim(1), null], mat: trimMat },
  ], { proxyGeo: proxy, colors: true });
}

function makeSandstoneClassic(M) {
  const mkMain = () => {
    const B = new GB();
    polyWalls(B, rect(1.0, 1.0), 0, 0.20);
    polyWalls(B, rect(0.96, 0.94), 0.20, 0.88);
    polyWalls(B, rect(0.84, 0.80), 0.88, 1.0);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 1.0), 0.20, true);
    polyCap(B, rect(0.96, 0.94), 0.88, true);
    polyCap(B, rect(0.84, 0.80), 1.0, true);
    return B.build();
  };
  const mkTrim = (detail) => {
    const B = new GB();
    B.box(0, 0.205, 0, 1.04, 0.024, 1.04);
    B.box(0, 0.888, 0, 1.02, 0.030, 1.00);
    B.box(0, 1.008, 0, 0.88, 0.022, 0.84);
    if (detail === 2) {
      // Вертикальные классические пилястры и крышные тумбы
      for (const px of [-0.42, -0.14, 0.14, 0.42]) {
        B.box(px, 0.54, +0.48, 0.055, 0.68, 0.035);
        B.box(px, 0.54, -0.48, 0.055, 0.68, 0.035);
      }
      B.box(-0.24, 1.03, 0, 0.16, 0.05, 0.24);
      B.box(+0.24, 1.03, 0, 0.16, 0.05, 0.24);
    }
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(0.96, 0.98, 0.94).translate(0, 0.49, 0);
  return new Archetype("sandstoneClassic", [
    { lods: [mkMain(), mkMain(), mkMain()], mat: M.stoneRibbon },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
    { lods: [mkTrim(2), mkTrim(1), null], mat: M.travertine },
  ], { proxyGeo: proxy, colors: true });
}

function makeModernRes(M, bodyMat, accentMat, name) {
  const mkMain = () => {
    const B = new GB();
    polyWalls(B, rect(1.0, 1.0), 0, 0.15);
    polyWalls(B, rect(0.90, 0.90), 0.15, 0.95);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 1.0), 0.15, true);
    polyCap(B, rect(0.90, 0.90), 0.95, true);
    return B.build();
  };
  const mkCrown = (detail) => {
    const B = new GB();
    B.box(0, 0.155, 0, 1.03, 0.022, 1.03);
    B.box(0, 0.962, 0, 0.94, 0.036, 0.94);
    if (detail === 2) {
      // Утопленные балконные секции / вертикальные простенки + пентхаус + HVAC
      for (const sx of [-0.40, +0.40]) B.box(sx, 0.55, 0, 0.06, 0.80, 0.94);
      for (const bx of [-0.18, +0.18]) {
        B.box(bx, 0.55, +0.46, 0.14, 0.78, 0.04);
        B.box(bx, 0.55, -0.46, 0.14, 0.78, 0.04);
      }
      B.box(0, 1.01, 0, 0.34, 0.07, 0.36);
      B.box(+0.26, 0.995, -0.18, 0.12, 0.04, 0.16);
    }
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(0.92, 0.98, 0.92).translate(0, 0.49, 0);
  return new Archetype(name, [
    { lods: [mkMain(), mkMain(), mkMain()], mat: bodyMat },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
    { lods: [mkCrown(2), mkCrown(1), null], mat: accentMat },
  ], { proxyGeo: proxy, colors: true });
}

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
    B.box(0, 0.975, 0, 1.03, 0.03, 1.03);
    if (detail === 2) {
      B.box(-0.26, 1.015, 0, 0.16, 0.07, 0.28);
      B.box(+0.26, 1.015, 0, 0.16, 0.07, 0.28);
      B.box(0, 1.07, 0, 0.015, 0.11, 0.015);
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

function makeCommercialRow(M) {
  const mkMain = () => {
    const B = new GB();
    polyWalls(B, rect(1.0, 1.0), 0, 0.94);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 1.0), 0.94, true);
    return B.build();
  };
  const mkCrown = (detail) => {
    const B = new GB();
    B.box(0, 0.965, 0, 1.04, 0.05, 1.04);
    if (detail === 2) {
      B.box(-0.25, 1.01, 0, 0.14, 0.05, 0.22);
      B.box(+0.22, 1.01, -0.1, 0.16, 0.05, 0.18);
    }
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(1.0, 0.98, 1.0).translate(0, 0.49, 0);
  return new Archetype("commercialRow", [
    { lods: [mkMain(), mkMain(), mkMain()], mat: M.stone },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
    { lods: [mkCrown(2), mkCrown(1), null], mat: M.darkMetal },
  ], { proxyGeo: proxy, colors: true });
}

// ---------- Вывески и витрины уличного ретейла (y = 0..4.6 м) ----------
const SHOP_BRANDS = [
  { name: "MAGNUM",       bg: "#12266a", fg: "#ffffff", accent: "#e82c42" },
  { name: "SMALL",        bg: "#0b5e36", fg: "#ffffff", accent: "#ffd230" },
  { name: "COFFEE BOOM",  bg: "#3b2010", fg: "#ffe2b0", accent: "#d48a40" },
  { name: "АПТЕКА 24",    bg: "#0c6e38", fg: "#ffffff", accent: "#4eff9e" },
  { name: "KFC",          bg: "#9c1018", fg: "#ffffff", accent: "#ffffff" },
  { name: "BAKER STREET", bg: "#2e221b", fg: "#f5dcb0", accent: "#c9964c" },
  { name: "OPTIKA",       bg: "#163858", fg: "#ffffff", accent: "#4ee2ff" },
  { name: "FLOWERS",      bg: "#5c1842", fg: "#ffe0f2", accent: "#ff72b6" },
  { name: "БАНК",         bg: "#1c2838", fg: "#ffd460", accent: "#3fa4ff" },
  { name: "BARBERSHOP",   bg: "#141418", fg: "#ffffff", accent: "#e84444" },
];

function makeShopSignTex(brand) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 112;
  const g = c.getContext("2d");
  g.fillStyle = brand.bg;
  g.fillRect(0, 0, 512, 112);
  g.fillStyle = brand.accent;
  g.fillRect(0, 0, 512, 8);
  g.fillRect(0, 104, 512, 8);
  g.fillStyle = brand.fg;
  g.font = "800 50px 'Segoe UI', Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(brand.name, 256, 58);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function makeDisplayWindowTex() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#1c3248");
  gr.addColorStop(0.4, "#2d4c68");
  gr.addColorStop(1, "#121a24");
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 128);
  // Тёплый интерьер магазина внутри витрин
  for (let x = 16; x < 240; x += 64) {
    g.fillStyle = "rgba(255, 224, 170, 0.35)";
    g.fillRect(x, 28, 44, 86);
    g.fillStyle = "rgba(255, 245, 220, 0.55)";
    g.fillRect(x + 8, 32, 28, 12);
  }
  g.strokeStyle = "#22262c";
  g.lineWidth = 6;
  for (let x = 0; x <= 256; x += 64) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Спецификации районов Астаны ----------
function pickSpec(dist, r, isRoadside = false) {
  let kind, hMin, hMax, tint;
  if (isRoadside && r() < 0.24) {
    kind = "commercialRow";
    hMin = 12; hMax = 24;
    tint = [0.95, 0.90, 0.84];
  } else if (dist === "downtown") {
    const u = r();
    kind = u < 0.32 ? "blueTower" : u < 0.54 ? "goldTower" : u < 0.70 ? "emeraldTower" : u < 0.86 ? "sandstoneClassic" : "creamRes";
    hMin = 48; hMax = 128;
    tint = kind === "sandstoneClassic"
      ? [0.98, 0.92, 0.82]
      : [0.90 + r() * 0.12, 0.93 + r() * 0.10, 0.95 + r() * 0.08];
  } else if (dist === "business") {
    const u = r();
    kind = u < 0.30 ? "blueTower" : u < 0.52 ? "emeraldTower" : u < 0.76 ? "sandstoneClassic" : "terracottaRes";
    hMin = 36; hMax = 94;
    tint = [0.93 + r() * 0.10, 0.91 + r() * 0.10, 0.90 + r() * 0.10];
  } else if (dist === "expo") {
    const u = r();
    kind = u < 0.45 ? "terracottaRes" : u < 0.78 ? "creamRes" : u < 0.92 ? "sandstoneClassic" : "blueTower";
    hMin = 28; hMax = 68;
    tint = kind === "terracottaRes"
      ? [1.02, 0.84, 0.76]
      : [0.96, 0.94, 0.89];
  } else if (dist === "residential") {
    const u = r();
    kind = u < 0.44 ? "terracottaRes" : u < 0.82 ? "creamRes" : "sovietPanel";
    hMin = 26; hMax = 60;
    tint = kind === "terracottaRes"
      ? [1.0, 0.86, 0.78]
      : [0.95, 0.92, 0.88];
  } else {
    // Правый берег + среднеэтажные кварталы
    const u = r();
    kind = u < 0.34 ? "creamRes" : u < 0.62 ? "sovietPanel" : u < 0.84 ? "sandstoneClassic" : "terracottaRes";
    hMin = 20; hMax = 48;
    tint = [0.94, 0.90, 0.84];
  }
  const w = kind === "commercialRow" ? between(r, 26, 38) : between(r, 22, 36);
  const d = kind === "commercialRow" ? between(r, 16, 24) : between(r, 18, 32);
  const h = between(r, hMin, hMax);
  return { kind, w, d, h, tint };
}

function nearestRoadDist(x, z) {
  let minD = 1e9, nearAng = 0;
  for (const rd of ROADS) {
    const dx = rd.x1 - rd.x0, dz = rd.z1 - rd.z0;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 1) continue;
    const t = Math.max(0, Math.min(1, ((x - rd.x0) * dx + (z - rd.z0) * dz) / lenSq));
    const px = rd.x0 + dx * t, pz = rd.z0 + dz * t;
    const dist = Math.hypot(x - px, z - pz) - rd.width / 2;
    if (dist < minD) {
      minD = dist;
      nearAng = Math.atan2(x - px, z - pz);
    }
  }
  return { dist: minD, nearAng };
}

export function buildBuildings(scene, M, ctx) {
  const group = new THREE.Group();
  group.name = "astana-buildings";
  scene.add(group);

  const r = rng(202608);
  const terracottaTrimMat = M.std({ color: 0xb86d52, roughness: 0.62, metalness: 0.04 });

  const archMap = {
    blueTower:        makeGlassTower(M, M.glassBlue, M.steel, "blueTower"),
    goldTower:        makeGlassTower(M, M.glassGold, M.brass, "goldTower"),
    emeraldTower:     makeGlassTower(M, M.glassEmerald, M.steel, "emeraldTower"),
    sandstoneClassic: makeSandstoneClassic(M),
    terracottaRes:    makeModernRes(M, M.res, terracottaTrimMat, "terracottaRes"),
    creamRes:         makeModernRes(M, M.res, M.travertine, "creamRes"),
    sovietPanel:      makeSovietPanel(M),
    commercialRow:    makeCommercialRow(M),
  };
  const buckets = Object.fromEntries(Object.keys(archMap).map((k) => [k, []]));
  const buildings = [];
  const lawnGeos = [];
  const plazaGeos = [];

  // Данные для уличных витрин, маркиз и вывесок ретейла (y = 0..4.6 м)
  const storefrontMats = [];
  const awningMats = [];
  const awningCols = [];
  const signBuckets = Array.from({ length: SHOP_BRANDS.length }, () => []);
  const awningPalette = [0x9c1e28, 0x164270, 0x165e3a, 0xb86b1c, 0x262a34, 0x0e6e78];

  // Плотная квартальная сетка (step = 46 м, охват Левого/Правого берега, Улы Дала и EXPO)
  const step = 46;
  for (let gx = -1320; gx <= 1600; gx += step) {
    for (let gz = -980; gz <= 1220; gz += step) {
      const distCenter = Math.hypot(gx * 0.78, (gz - 120) * 0.88);
      if (distCenter > 1520) continue;

      // Высокая плотность в центре, вдоль Улы Дала/EXPO и на Правом берегу
      const keepProb = distCenter < 850 ? 0.95 : distCenter < 1220 ? 0.84 : 0.58;
      if (r() > keepProb) continue;

      const x = gx + (r() - 0.5) * 9;
      const z = gz + (r() - 0.5) * 9;
      const dist = district(x, z);
      const nr = nearestRoadDist(x, z);
      const isRoadside = nr.dist < 26;
      const spec = pickSpec(dist, r, isRoadside);

      const yaw = r() < 0.5 ? 0 : Math.PI / 2;
      const effHx = (yaw === 0 ? spec.w : spec.d) / 2;
      const effHz = (yaw === 0 ? spec.d : spec.w) / 2;

      if (intersectsReserved(x, z, effHx + 3, effHz + 3)) continue;
      if (nr.dist < Math.max(effHx, effHz) + 4.5) continue;

      const item = { x, y: 0, z, yaw, w: spec.w, d: spec.d, h: spec.h, kind: spec.kind, tint: spec.tint };
      buckets[spec.kind].push(item);
      buildings.push({ x, y: 0, z, yaw, w: spec.w, d: spec.d, h: spec.h, kind: spec.kind });

      // Зелёный дворовый газон или гранитная площадка под кварталом (убираем серые пустоши!)
      if (dist === "residential" || dist === "expo" || dist === "rightBank" || r() < 0.55) {
        const pg = new THREE.PlaneGeometry(44, 44).rotateX(-Math.PI / 2);
        const uv = pg.attributes.uv;
        for (let u = 0; u < uv.count; u++) uv.setXY(u, uv.getX(u) * 44, uv.getY(u) * 44);
        pg.translate(gx, 0.012, gz);
        if (dist === "downtown" && r() < 0.5) plazaGeos.push(pg);
        else lawnGeos.push(pg);
      }

      // Наземный ретейл (y = 0..4.6 м): витрины, маркизы и вывески
      if (spec.kind === "commercialRow" || spec.kind === "sandstoneClassic" || spec.kind === "creamRes" || spec.kind === "terracottaRes" || (isRoadside && r() < 0.7)) {
        const faceYaw = isRoadside ? (Math.round(nr.nearAng / (Math.PI / 2)) * (Math.PI / 2)) : yaw;
        const fw = (Math.abs(Math.cos(faceYaw)) > 0.5 ? (yaw === 0 ? spec.w : spec.d) : (yaw === 0 ? spec.d : spec.w)) * 0.84;
        const fd = (Math.abs(Math.cos(faceYaw)) > 0.5 ? (yaw === 0 ? spec.d : spec.w) : (yaw === 0 ? spec.w : spec.d)) * 0.5 + 0.16;
        const fx = x + Math.sin(faceYaw) * fd;
        const fz = z + Math.cos(faceYaw) * fd;

        storefrontMats.push(place(fx, 2.2, fz, faceYaw, Math.min(fw, 26), 3.8, 0.35));
        awningMats.push(place(fx + Math.sin(faceYaw) * 0.85, 3.35, fz + Math.cos(faceYaw) * 0.85, faceYaw, Math.min(fw * 0.92, 22), 0.32, 1.8));
        awningCols.push(awningPalette[Math.floor(r() * awningPalette.length)]);

        const bIdx = Math.floor(r() * SHOP_BRANDS.length);
        signBuckets[bIdx].push(place(fx + Math.sin(faceYaw) * 0.35, 4.15, fz + Math.cos(faceYaw) * 0.35, faceYaw, Math.min(fw * 0.52, 9.5), 1.55, 1));
      }
    }
  }

  // Объединяем зелёные дворы и плиточные площадки (всего 2 draw call!)
  if (lawnGeos.length) {
    const lawns = new THREE.Mesh(merge(lawnGeos), M.grass);
    lawns.receiveShadow = true;
    lawns.name = "courtyard-lawns";
    group.add(lawns);
  }
  if (plazaGeos.length) {
    const plazas = new THREE.Mesh(merge(plazaGeos), M.graniteLight);
    plazas.receiveShadow = true;
    plazas.name = "courtyard-plazas";
    group.add(plazas);
  }

  // Инстансированные здания
  const archetypes = [];
  for (const [key, items] of Object.entries(buckets)) {
    if (!items.length) continue;
    const arch = archMap[key];
    arch.build(group, items.length);
    const mats = new Float32Array(items.length * 16);
    const cols = new Float32Array(items.length * 3);
    items.forEach((b, idx) => {
      const m = place(b.x, b.y, b.z, b.yaw, b.w, b.h, b.d);
      mats.set(m.elements, idx * 16);
      cols[idx * 3]     = b.tint[0];
      cols[idx * 3 + 1] = b.tint[1];
      cols[idx * 3 + 2] = b.tint[2];
    });
    arch.setInstances(mats, cols);
    archetypes.push(arch);
  }

  // Инстансированные витрины 1-х этажей + цветные маркизы + брендовые вывески
  if (storefrontMats.length) {
    const winTex = makeDisplayWindowTex();
    const winMat = M.std({
      map: winTex, emissiveMap: winTex, emissive: new THREE.Color(0xffe0b0), emissiveIntensity: 0.35,
      roughness: 0.18, metalness: 0.45,
    });
    const winInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), winMat, storefrontMats.length);
    storefrontMats.forEach((m, i) => winInst.setMatrixAt(i, m));
    winInst.instanceMatrix.needsUpdate = true;
    winInst.frustumCulled = false;
    group.add(winInst);

    const awMat = M.std({ color: 0xffffff, roughness: 0.72, metalness: 0.05 });
    const awInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), awMat, awningMats.length);
    const tmpC = new THREE.Color();
    awningMats.forEach((m, i) => {
      awInst.setMatrixAt(i, m);
      awInst.setColorAt(i, tmpC.setHex(awningCols[i]));
    });
    awInst.instanceMatrix.needsUpdate = true;
    if (awInst.instanceColor) awInst.instanceColor.needsUpdate = true;
    awInst.frustumCulled = false;
    group.add(awInst);

    const signPlane = new THREE.PlaneGeometry(1, 1);
    SHOP_BRANDS.forEach((brand, bIdx) => {
      const arr = signBuckets[bIdx];
      if (!arr.length) return;
      const stTex = makeShopSignTex(brand);
      const stMat = M.std({
        map: stTex, emissiveMap: stTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.52,
        roughness: 0.3,
      });
      const sm = new THREE.InstancedMesh(signPlane, stMat, arr.length);
      arr.forEach((m, i) => sm.setMatrixAt(i, m));
      sm.instanceMatrix.needsUpdate = true;
      sm.frustumCulled = false;
      group.add(sm);
    });
  }

  // LOD-обновление
  const lodDist = ctx.tier && ctx.tier.lod ? ctx.tier.lod : [800, 2200];
  const lastCam = new THREE.Vector3(1e9, 1e9, 1e9);
  function refreshLOD(camPos) {
    for (const a of archetypes) a.updateLOD(camPos, lodDist[0], lodDist[1]);
    lastCam.copy(camPos);
  }
  refreshLOD(ctx.camera.position);

  let timer = 0;
  const count = buildings.length;

  return {
    group,
    buildings,
    list: buildings,
    count,
    archetypes,
    update(dt, _time, camera, cyberMix) {
      void cyberMix;
      timer += dt;
      if (timer < 0.25 && lastCam.distanceToSquared(camera.position) < 400) return;
      timer = 0;
      refreshLOD(camera.position);
    },
  };
}
