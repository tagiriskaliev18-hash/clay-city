// ============================================================
// ASTANA REAL v5 — streetlife.js
// Плотная живая городская среда Астаны (InstancedMesh, высокий FPS):
//   - 2,400+ 3D многочастных деревьев (пирамидальные тополя вдоль
//     проспектов и QazaqGaz, дубы, берёзы, ели) + каменные цветники
//   - 420+ скамеек (лавочки) и 480+ урн (мусорки)
//   - 580+ припаркованных авто (QazaqGaz 14..22, навес, MEGA, дворы)
//   - 32 тёплых стеклянных остановки («тёплые остановки»)
//   - Светофоры и белые зебры на всех крупных перекрёстках
//   - Бульварные киоски, перголы Нуржол, детские площадки Highvill
//   - 240+ анимированных шагающих пешеходов
// ============================================================
import * as THREE from "three";
import { ROADS, LANDMARKS } from "./config.js";
import { rng, between, place, merge } from "./geom.js";
import { loadModelParts } from "./models.js";
import { U } from "./env.js";

function onRoad(x, z, margin = 2.0) {
  for (const rd of ROADS) {
    const dx = rd.x1 - rd.x0, dz = rd.z1 - rd.z0;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 1) continue;
    const t = Math.max(0, Math.min(1, ((x - rd.x0) * dx + (z - rd.z0) * dz) / lenSq));
    const px = rd.x0 + dx * t, pz = rd.z0 + dz * t;
    if (Math.hypot(x - px, z - pz) < rd.width / 2 + margin) return true;
  }
  return false;
}

function insideBuildingOrWater(x, z, buildings = []) {
  // Река Есиль
  if (x > 690 && x < 870 && Math.abs(z) < 1200) return true;
  // Круглая площадь, Байтерек, Акорда, Пирамида, Мечеть, Музей, Нур Алем, Хан Шатыр, MEGA
  if (Math.hypot(x, z) < 38) return true;
  if (Math.hypot(x + 560, z) < 26) return true;
  if (Math.hypot(x + 940, z) < 102) return true;
  if (Math.abs(x - 590) < 62 && Math.abs(z) < 92) return true;
  if (Math.abs(x - 1080) < 52 && Math.abs(z) < 52) return true;
  if (Math.abs(x - 1130) < 82 && Math.abs(z + 260) < 68) return true;
  if (Math.abs(x - 1180) < 58 && Math.abs(z - 240) < 105) return true;
  if (Math.hypot(x - 90, z - 960) < 58) return true;
  // MEGA Silk Way крытое здание (-302..-58, 885..995)
  if (x > -304 && x < -56 && z > 884 && z < 996) return true;
  // Ботанический сад пруд (-298, 645)
  if (Math.hypot((x + 298) / 36, (z - 645) / 28) < 1.05) return true;
  // QazaqGaz HQ + входная площадка + соседи
  if (Math.abs(x - 235) < 25 && z > 135 && z < 198) return true;
  if (Math.abs(x - 162) < 30 && Math.abs(z - 150) < 18) return true;
  if (Math.abs(x - 314) < 36 && Math.abs(z - 152) < 18) return true;
  // Abu Dhabi
  if (Math.abs(x + 160) < 66 && Math.abs(z - 250) < 62) return true;
  // Beijing Palace
  if (Math.abs(x + 240) < 32 && Math.abs(z - 390) < 26) return true;
  // Highvill подиумы
  if (Math.abs(x + 630) < 85 && Math.abs(z - 660) < 73) return true;
  if (Math.abs(x - 1145) < 63 && Math.abs(z + 104) < 45) return true;
  // Здания кварталов
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const hx = (Math.abs(Math.cos(b.yaw)) > 0.5 ? b.w : b.d) * 0.5 + 2.2;
    const hz = (Math.abs(Math.cos(b.yaw)) > 0.5 ? b.d : b.w) * 0.5 + 2.2;
    if (Math.abs(x - b.x) < hx && Math.abs(z - b.z) < hz) return true;
  }
  return false;
}

function makeBusStopSignTex() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 96;
  const g = c.getContext("2d");
  g.fillStyle = "#102840";
  g.fillRect(0, 0, 512, 96);
  g.fillStyle = "#00b4d8";
  g.fillRect(0, 0, 512, 10);
  g.fillStyle = "#ffffff";
  g.font = "800 38px 'Segoe UI', Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("АВТОБУС  ·  АЯЛДАМА", 256, 54);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function buildStreetLife(scene, M, _ctx, buildings = []) {
  const group = new THREE.Group();
  group.name = "astana-streetlife";
  scene.add(group);
  const r = rng(552077);

  // Параллельная загрузка Draco GLB моделей для деревьев, припаркованных авто и пешеходов
  const [treeModels, carModels, pedModel] = await Promise.all([
    Promise.all([
      loadModelParts("./assets/models/tree_poplar.glb", { groundY: true }),
      loadModelParts("./assets/models/tree_oak.glb", { groundY: true }),
      loadModelParts("./assets/models/tree_birch.glb", { groundY: true }),
      loadModelParts("./assets/models/tree_spruce.glb", { groundY: true }),
    ]),
    Promise.all([
      loadModelParts("./assets/models/car_sedan.glb", { rotateY: Math.PI, groundY: true }),
      loadModelParts("./assets/models/car_suv.glb", { rotateY: Math.PI, groundY: true }),
    ]),
    loadModelParts("./assets/models/pedestrian.glb", { groundY: true }),
  ]);
  const treeModelByKind = {
    poplar: treeModels[0],
    oak:    treeModels[1],
    birch:  treeModels[2],
    pine:   treeModels[3],
  };
  const [sedanModel, suvModel] = carModels;

  // ============================================================
  // 1. 2,400+ МНОГОЧАСТНЫХ 3D ДЕРЕВЬЕВ + КАМЕННЫЕ ЦВЕТНИКИ
  // ============================================================
  const treeBuckets = { poplar: [], oak: [], birch: [], pine: [] };
  const pushTree = (kind, x, z, scale = 1, y = 0, skipCheck = false) => {
    if (!skipCheck && (onRoad(x, z, 1.4) || insideBuildingOrWater(x, z, buildings))) return;
    treeBuckets[kind].push({ x, y, z, yaw: r() * Math.PI * 2, sc: scale, col: r() });
  };

  // 1а. Пирамидальные тополя вдоль QazaqGaz HQ и улиц (как на фото 01/03/05!)
  const qg = LANDMARKS.qazaqGaz;
  for (let x = qg.x - 40; x <= qg.x + 40; x += 11.5) {
    if (Math.abs(x - qg.x) < 16) continue;
    pushTree("poplar", x, qg.z + 44, between(r, 0.9, 1.15), 0, true);
    pushTree("poplar", x, qg.z - 25, between(r, 0.88, 1.12), 0, true);
  }
  for (let z = qg.z - 20; z <= qg.z + 36; z += 11.5) {
    pushTree("poplar", qg.x - 32, z, between(r, 0.9, 1.12), 0, true);
    pushTree("poplar", qg.x + 32, z, between(r, 0.9, 1.12), 0, true);
  }
  // Тополя перед соседними зданиями QazaqGaz
  for (let x = 132; x <= 350; x += 15) {
    if (Math.abs(x - qg.x) < 35) continue;
    pushTree("poplar", x, 198, between(r, 0.88, 1.15), 0, true);
  }

  // 1б. Аллеи вдоль городских проспектов ROADS (дальние вылетные трассы покрыты Зелёным поясом в city.js)
  for (const rd of ROADS) {
    if (rd.type === "bridge" || rd.outer) continue;
    const dx = rd.x1 - rd.x0, dz = rd.z1 - rd.z0;
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const isBlvd = rd.type === "boulevard";
    const step = isBlvd ? 34 : 68;
    const n = Math.floor(len / step);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const bx = rd.x0 + dx * t, bz = rd.z0 + dz * t;
      for (const side of [-1, 1]) {
        const off = isBlvd ? (22 + (i % 2) * 8) : (rd.width / 2 + 4.4);
        const tx = bx + cos * off * side;
        const tz = bz - sin * off * side;
        const kind = isBlvd ? (i % 3 === 0 ? "pine" : "oak") : (i % 4 === 0 ? "birch" : "poplar");
        pushTree(kind, tx, tz, between(r, 0.80, 1.18), isBlvd ? 0.32 : 0);
      }
    }
  }

  // 1в. Ботанический сад
  for (let i = 0; i < 88; i++) {
    const tx = -410 + r() * 222;
    const tz = 550 + r() * 185;
    if (Math.abs(tx + 298) < 5 || Math.abs(tz - 645) < 5) continue;
    const kinds = ["oak", "birch", "pine", "poplar"];
    pushTree(kinds[i % 4], tx, tz, between(r, 0.78, 1.25), 0.02);
  }
  for (let i = 0; i < 14; i++) {
    pushTree(i % 2 === 0 ? "birch" : "oak", -494 + r() * 44, 568 + r() * 165, between(r, 0.8, 1.15), 0.02);
  }

  // 1г. Парки Астаны (Президентский парк, Парк Влюблённых, набережные Есиля, EXPO-парк)
  const parkZones = [
    { x0: 910,  x1: 1320, z0: -380, z1: 380, n: 64 },
    { x0: -1120, x1: -920, z0: -165, z1: 165, n: 32 },
    { x0: 595,  x1: 695,  z0: -720, z1: -140, n: 26 },
    { x0: 595,  x1: 695,  z0: +140, z1: +720, n: 26 },
    { x0: -40,  x1: +250, z0: +820, z1: +1055, n: 24 },
  ];
  for (const pk of parkZones) {
    for (let i = 0; i < pk.n; i++) {
      const tx = between(r, pk.x0, pk.x1);
      const tz = between(r, pk.z0, pk.z1);
      const k = i % 3 === 0 ? "pine" : i % 3 === 1 ? "oak" : "birch";
      pushTree(k, tx, tz, between(r, 0.80, 1.25));
    }
  }

  // 1д. Дворы Highvill Park и Highvill Astana (на кровле стилобата y = 3.8 м)
  for (let i = 0; i < 16; i++) {
    const tx = -630 + between(r, -42, 42);
    const tz = 660 + between(r, -28, 28);
    if (Math.hypot(tx + 630, tz - 660) < 10) continue;
    pushTree(i % 2 === 0 ? "birch" : "pine", tx, tz, between(r, 0.65, 0.92), 3.84, true);
  }
  for (let i = 0; i < 8; i++) {
    const tx = 1145 + between(r, -32, 32);
    const tz = -104 + between(r, -12, 12);
    pushTree(i % 2 === 0 ? "pine" : "oak", tx, tz, between(r, 0.62, 0.88), 3.84, true);
  }

  // 1е. Городские дворы вдоль кварталов
  for (let i = 0; i < 120; i++) {
    const tx = between(r, -1250, 1480);
    const tz = between(r, -900, 1140);
    if (Math.hypot(tx * 0.78, (tz - 120) * 0.88) > 1460) continue;
    const k = i % 3 === 0 ? "poplar" : i % 3 === 1 ? "oak" : "birch";
    pushTree(k, tx, tz, between(r, 0.75, 1.12));
  }

  const treePalettes = {
    poplar: [0xb8de88, 0xc8e698, 0xd6eeaa],
    oak:    [0xaed27e, 0xbddc8c, 0xcae49a],
    birch:  [0xc4e28c, 0xd2ea9c, 0xdef2aa],
    pine:   [0x86ba7c, 0x94c486, 0xa2ce90],
  };
  let totalTrees = 0;
  const foliageMats = [];
  const tmpC = new THREE.Color();
  for (const [kind, list] of Object.entries(treeBuckets)) {
    if (!list.length) continue;
    totalTrees += list.length;
    const model = treeModelByKind[kind];
    const pal = treePalettes[kind];
    for (const part of model.parts) {
      const isFoliage = part.name.toLowerCase().includes("foliage");
      const mat = part.material.clone();
      if (isFoliage) {
        mat.transparent = false;
        mat.alphaTest = 0.22;
        mat.side = THREE.DoubleSide;
        mat.depthWrite = true;
        mat.roughness = 0.78;
        mat.metalness = 0.0;
        mat.envMapIntensity = 1.5;
        if (mat.normalScale) mat.normalScale.set(0.28, 0.28);
        mat.color.setHex(0xffffff);
        mat.emissive = new THREE.Color(0x1b3412);
        mat.emissiveIntensity = 0.42;
        foliageMats.push(mat);
      } else {
        mat.transparent = false;
        mat.roughness = Math.max(mat.roughness ?? 0.9, 0.85);
      }
      M.setup(mat);
      const inst = new THREE.InstancedMesh(part.geometry, mat, list.length);
      list.forEach((t, i) => {
        const sy = t.sc * (0.90 + t.col * 0.24);
        const sxz = t.sc * (0.92 + (1 - t.col) * 0.16);
        inst.setMatrixAt(i, place(t.x, t.y, t.z, t.yaw, sxz, sy, sxz));
        if (isFoliage) inst.setColorAt(i, tmpC.setHex(pal[Math.floor(t.col * pal.length)]));
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.computeBoundingSphere();
      // Крона без само-теней (иначе плоские карточки превращаются в чёрный силуэт!), ствол отбрасывает тень
      inst.castShadow = !isFoliage;
      inst.receiveShadow = !isFoliage;
      inst.frustumCulled = true;
      group.add(inst);
    }
  }

  // Каменные клумбы-цветники (вдоль Нуржол, MEGA Plaza, QazaqGaz, Ботанический сад)
  const planterMats = [], flowerCols = [];
  const flowerPal = [0xe83a68, 0xf2b818, 0x8e3ad8, 0xff5a36, 0xff70a6];
  for (let x = -800; x <= 480; x += 36) {
    if (Math.abs(x) < 62 || Math.abs(x + 560) < 92) continue;
    if (onRoad(x, 0, 2)) continue;
    planterMats.push(place(x, 0.34, -14, 0, 1, 1, 1));
    planterMats.push(place(x, 0.34, +14, 0, 1, 1, 1));
    flowerCols.push(flowerPal[Math.floor(r() * flowerPal.length)], flowerPal[Math.floor(r() * flowerPal.length)]);
  }
  for (const [fx, fz] of [
    [-40, 916], [-40, 964], [-40, 940], [218, 185], [252, 185], [-298, 610], [-298, 680],
  ]) {
    planterMats.push(place(fx, 0.04, fz, 0, 1.3, 1.1, 1.3));
    flowerCols.push(flowerPal[Math.floor(r() * flowerPal.length)]);
  }
  if (planterMats.length) {
    const box = new THREE.InstancedMesh(new THREE.BoxGeometry(2.8, 0.65, 1.4).translate(0, 0.32, 0), M.graniteLight, planterMats.length);
    const flw = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.35, 1.1).translate(0, 0.72, 0), M.std({ color: 0xffffff, roughness: 0.8 }), planterMats.length);
    planterMats.forEach((m, i) => {
      box.setMatrixAt(i, m);
      flw.setMatrixAt(i, m);
      flw.setColorAt(i, tmpC.setHex(flowerCols[i]));
    });
    flw.instanceColor.needsUpdate = true;
    box.frustumCulled = flw.frustumCulled = false;
    group.add(box, flw);
  }

  // ============================================================
  // 2. 420+ СКАМЕЕК (ЛАВОЧКИ) И 480+ УРН (МУСОРКИ)
  // ============================================================
  const benchMats = [];
  const binMats = [];
  const addBenchAndBin = (x, y, z, yaw) => {
    benchMats.push(place(x, y, z, yaw));
    const bx = x + Math.cos(yaw) * 1.65;
    const bz = z - Math.sin(yaw) * 1.65;
    binMats.push(place(bx, y, bz, yaw));
  };

  // Вдоль Нуржол бульвара (обе стороны променада)
  for (let x = -820; x <= 500; x += 16) {
    if (Math.abs(x) < 54 || Math.abs(x + 560) < 88 || onRoad(x, 0, 4)) continue;
    addBenchAndBin(x, 0.34, -11.5, 0);
    addBenchAndBin(x, 0.34, +11.5, Math.PI);
  }
  // Вдоль дорожек Ботанического сада
  for (let x = -395; x <= -200; x += 18) {
    if (Math.abs(x + 298) < 35) continue;
    addBenchAndBin(x, 0.04, 641, 0);
    addBenchAndBin(x, 0.04, 649, Math.PI);
  }
  for (let z = 562; z <= 725; z += 18) {
    if (Math.abs(z - 645) < 30) continue;
    addBenchAndBin(-302, 0.04, z, Math.PI / 2);
    addBenchAndBin(-294, 0.04, z, -Math.PI / 2);
  }
  // Вокруг пруда Ботанического сада
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    addBenchAndBin(-298 + Math.cos(a) * 56, 0.04, 645 + Math.sin(a) * 42, -a + Math.PI / 2);
  }
  // Highvill Park & Highvill Astana дворы
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    addBenchAndBin(-630 + Math.cos(a) * 28, 3.84, 660 + Math.sin(a) * 22, -a + Math.PI / 2);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    addBenchAndBin(1145 + Math.cos(a) * 22, 3.84, -104 + Math.sin(a) * 14, -a + Math.PI / 2);
  }
  // Президентский парк + набережные Есиля + площадь MEGA Silk Way + тротуары проспектов
  for (let z = -700; z <= 700; z += 34) {
    addBenchAndBin(684, 2.2, z, -Math.PI / 2);
    addBenchAndBin(876, 2.2, z, Math.PI / 2);
  }
  for (let x = -900; x <= 520; x += 28) {
    for (const rz of [82, -82, 280, 460, 760]) {
      const ty = rz + (rz >= 0 ? 15.5 : -15.5);
      if (!onRoad(x, ty, 1.5) && !insideBuildingOrWater(x, ty, buildings)) {
        addBenchAndBin(x, 0.14, ty, rz >= 0 ? Math.PI : 0);
      }
    }
  }
  // У входа MEGA Silk Way (восточная площадь) и переходов
  for (let z = 910; z <= 970; z += 12) {
    if (Math.abs(z - 940) < 10) continue;
    addBenchAndBin(-48, 0.18, z, Math.PI / 2);
  }

  if (benchMats.length) {
    const woodPart = merge([
      new THREE.BoxGeometry(2.1, 0.08, 0.56).translate(0, 0.48, 0),
      new THREE.BoxGeometry(2.1, 0.42, 0.07).translate(0, 0.80, -0.24),
    ]);
    const ironPart = merge([
      new THREE.BoxGeometry(0.08, 0.88, 0.60).translate(-0.92, 0.44, 0),
      new THREE.BoxGeometry(0.08, 0.88, 0.60).translate(+0.92, 0.44, 0),
    ]);
    const bm1 = new THREE.InstancedMesh(woodPart, M.wood, benchMats.length);
    const bm2 = new THREE.InstancedMesh(ironPart, M.darkMetal, benchMats.length);
    benchMats.forEach((m, i) => { bm1.setMatrixAt(i, m); bm2.setMatrixAt(i, m); });
    bm1.frustumCulled = bm2.frustumCulled = false;
    group.add(bm1, bm2);
  }
  if (binMats.length) {
    const binBody = new THREE.CylinderGeometry(0.24, 0.21, 0.82, 8).translate(0, 0.41, 0);
    const binCap = new THREE.CylinderGeometry(0.26, 0.26, 0.08, 8).translate(0, 0.84, 0);
    const bi1 = new THREE.InstancedMesh(binBody, M.darkMetal, binMats.length);
    const bi2 = new THREE.InstancedMesh(binCap, M.steel, binMats.length);
    binMats.forEach((m, i) => { bi1.setMatrixAt(i, m); bi2.setMatrixAt(i, m); });
    bi1.frustumCulled = bi2.frustumCulled = false;
    group.add(bi1, bi2);
  }

  // ============================================================
  // 3. 580+ ПРИПАРКОВАННЫХ АВТОМОБИЛЕЙ
  // ============================================================
  const parked = [];
  const pColors = [0xf2f4f7, 0x1d2229, 0xbfc5cd, 0x3b4450, 0x203a5a, 0x8a2828, 0xbdb098, 0x45584a];

  // 3а. Парковка QazaqGaz 14..22 + крытый навес Запада + Восток
  for (let i = 0; i < 9; i++) {
    if (i === 1 || i === 5) continue; // оставляем пару пустых мест, чтобы было видно жёлтые номера!
    const bx = 235 - 20.4 + i * 5.1;
    parked.push({ x: bx, y: 0.04, z: 155 + 35.8, yaw: 0.22, col: pColors[i % pColors.length] });
  }
  for (let bx = 178; bx <= 198; bx += 4.2) {
    parked.push({ x: bx, y: 0.03, z: 169, yaw: 0, col: pColors[Math.floor(r() * pColors.length)] });
  }
  for (let bx = 288; bx <= 336; bx += 5.2) {
    parked.push({ x: bx, y: 0.03, z: 170, yaw: Math.PI, col: pColors[Math.floor(r() * pColors.length)] });
  }

  // 3б. Огромная парковка MEGA Silk Way (-300..-60, z=790..878) — ~220 машин!
  for (const rowZ of [804, 814, 830, 840, 856, 866]) {
    for (let px = -290; px <= -70; px += 5.4) {
      if (Math.abs(px + 180) < 10) continue; // центральный проезд ко входу
      if (r() < 0.18) continue;
      parked.push({ x: px, y: 0.04, z: rowZ, yaw: rowZ % 20 < 10 ? 0 : Math.PI, col: pColors[Math.floor(r() * pColors.length)] });
    }
  }

  // 3в. Круговой подъезд Beijing Palace (-240, 424)
  for (const bx of [-262, -256, -224, -218, -264, -216]) {
    parked.push({ x: bx, y: 0.04, z: 424, yaw: Math.PI / 2, col: 0x181c22 });
  }

  // 3г. Уличные карманы вдоль проспектов и в жилых дворах (~350+ машин)
  for (const rd of ROADS) {
    if (rd.type === "bridge" || rd.type === "boulevard") continue;
    const dx = rd.x1 - rd.x0, dz = rd.z1 - rd.z0;
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    const cos = Math.cos(ang), sin = Math.sin(ang);
    for (let s = 40; s < len - 40; s += 24) {
      if (r() < 0.28) continue;
      const t = s / len;
      const bx = rd.x0 + dx * t, bz = rd.z0 + dz * t;
      for (const side of [-1, 1]) {
        if (r() < 0.45) continue;
        const px = bx + cos * (rd.width / 2 + 1.8) * side;
        const pz = bz - sin * (rd.width / 2 + 1.8) * side;
        if (onRoad(px, pz, 0.2) || insideBuildingOrWater(px, pz, buildings)) continue;
        parked.push({ x: px, y: 0.04, z: pz, yaw: ang + (side > 0 ? 0 : Math.PI), col: pColors[Math.floor(r() * pColors.length)] });
      }
    }
  }
  // Дополнительные парковочные карманы в кварталах
  for (let i = 0; i < 240 && parked.length < 610; i++) {
    const px = between(r, -1100, 1400);
    const pz = between(r, -780, 1040);
    if (onRoad(px, pz, 2.5) || insideBuildingOrWater(px, pz, buildings)) continue;
    parked.push({ x: px, y: 0.02, z: pz, yaw: r() < 0.5 ? 0 : Math.PI / 2, col: pColors[Math.floor(r() * pColors.length)] });
  }

  if (parked.length) {
    const parkedSedans = [], parkedSuvs = [];
    parked.forEach((c, idx) => ((idx % 3 === 0 ? parkedSuvs : parkedSedans).push(c)));
    const spawnParkedBatch = (model, items) => {
      if (!items.length) return;
      for (const part of model.parts) {
        const isPaint = part.name === "CarPaint";
        const mat = part.material.clone();
        if (isPaint) {
          mat.color.setHex(0xffffff);
          mat.metalness = 0.72;
          mat.roughness = 0.22;
        } else if (part.name === "CarGlass") {
          mat.roughness = 0.05;
          mat.metalness = 0.35;
        }
        M.setup(mat);
        const inst = new THREE.InstancedMesh(part.geometry, mat, items.length);
        items.forEach((c, i) => {
          inst.setMatrixAt(i, place(c.x, c.y, c.z, c.yaw));
          if (isPaint) inst.setColorAt(i, tmpC.setHex(c.col));
        });
        inst.instanceMatrix.needsUpdate = true;
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
        inst.computeBoundingSphere();
        inst.castShadow = isPaint;
        inst.receiveShadow = true;
        inst.frustumCulled = true;
        group.add(inst);
      }
    };
    spawnParkedBatch(sedanModel, parkedSedans);
    spawnParkedBatch(suvModel, parkedSuvs);
  }

  // ============================================================
  // 4. ТЁПЛЫЕ СТЕКЛЯННЫЕ ОСТАНОВКИ (32 остановки), СВЕТОФОРЫ И ЗЕБРЫ
  // ============================================================
  const stopMats = [];
  const stopCoords = [
    [-640, 96, 0], [-300, 96, 0], [-140, 96, 0], [180, 96, 0], [410, 96, 0],
    [-640, -96, Math.PI], [-300, -96, Math.PI], [-40, -96, Math.PI], [260, -96, Math.PI],
    [-600, 295, 0], [-280, 295, 0], [220, 295, 0], [520, 295, 0],
    [-580, 474, 0], [-220, 474, 0], [190, 474, 0],
    [-560, 777, 0], [-280, 777, 0], [190, 777, 0],
    [-448, 200, Math.PI / 2], [-448, 560, Math.PI / 2], [-448, 860, Math.PI / 2],
    [108, 220, -Math.PI / 2], [108, 540, -Math.PI / 2], [108, 860, -Math.PI / 2],
    [-778, 160, Math.PI / 2], [-778, 560, Math.PI / 2], [-778, 860, Math.PI / 2],
    [1016, 120, -Math.PI / 2], [1016, -120, -Math.PI / 2], [1160, 295, 0], [1160, -245, Math.PI],
  ];
  for (const [sx, sz, yaw] of stopCoords) {
    stopMats.push(place(sx, 0.14, sz, yaw));
  }
  if (stopMats.length) {
    const frameGeo = merge([
      new THREE.BoxGeometry(6.8, 0.18, 2.4).translate(0, 2.75, 0),
      new THREE.BoxGeometry(0.14, 2.7, 0.14).translate(-3.2, 1.35, -1.05),
      new THREE.BoxGeometry(0.14, 2.7, 0.14).translate(+3.2, 1.35, -1.05),
      new THREE.BoxGeometry(0.14, 2.7, 0.14).translate(-3.2, 1.35, +1.05),
      new THREE.BoxGeometry(0.14, 2.7, 0.14).translate(+3.2, 1.35, +1.05),
      new THREE.BoxGeometry(2.6, 0.10, 0.55).translate(0, 0.52, -0.55), // внутренняя скамья
    ]);
    const glassGeo = merge([
      new THREE.BoxGeometry(6.2, 2.4, 0.06).translate(0, 1.35, -1.05),
      new THREE.BoxGeometry(0.06, 2.4, 1.9).translate(-3.2, 1.35, 0),
      new THREE.BoxGeometry(0.06, 2.4, 1.9).translate(+3.2, 1.35, 0),
    ]);
    const signGeo = new THREE.BoxGeometry(4.4, 0.65, 0.18).translate(0, 3.05, 1.05);
    const stopSignMat = M.std({ map: makeBusStopSignTex(), emissiveMap: makeBusStopSignTex(), emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.72 });

    const sf = new THREE.InstancedMesh(frameGeo, M.darkMetal, stopMats.length);
    const sg = new THREE.InstancedMesh(glassGeo, M.glassClear, stopMats.length);
    const ss = new THREE.InstancedMesh(signGeo, stopSignMat, stopMats.length);
    stopMats.forEach((m, i) => { sf.setMatrixAt(i, m); sg.setMatrixAt(i, m); ss.setMatrixAt(i, m); });
    sf.frustumCulled = sg.frustumCulled = ss.frustumCulled = false;
    group.add(sf, sg, ss);
  }

  // Светофоры и белые пешеходные зебры на пересечениях проспектов
  const xRoads = [-760, -430, +90];
  const zRoads = [-260, -82, +82, +280, +460, +760, +1080];
  const tlMats = [], zebraGeos = [];
  for (const ix of xRoads) {
    for (const iz of zRoads) {
      if (iz > 800 && ix < -800) continue;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          tlMats.push(place(ix + sx * 16.5, 0.14, iz + sz * 15.5, sx > 0 ? -Math.PI / 2 : Math.PI / 2));
        }
      }
      // 4 пешеходных зебры вокруг перекрёстка
      for (let s = -10; s <= 10; s += 2.2) {
        zebraGeos.push(new THREE.BoxGeometry(0.9, 0.02, 4.0).translate(ix + s, 0.135, iz - 16.5));
        zebraGeos.push(new THREE.BoxGeometry(0.9, 0.02, 4.0).translate(ix + s, 0.135, iz + 16.5));
        zebraGeos.push(new THREE.BoxGeometry(4.0, 0.02, 0.9).translate(ix - 17.5, 0.135, iz + s));
        zebraGeos.push(new THREE.BoxGeometry(4.0, 0.02, 0.9).translate(ix + 17.5, 0.135, iz + s));
      }
    }
  }
  if (tlMats.length) {
    const tlPole = merge([
      new THREE.CylinderGeometry(0.10, 0.13, 5.6, 6).translate(0, 2.8, 0),
      new THREE.BoxGeometry(0.12, 0.12, 3.2).translate(0, 5.5, 1.5),
      new THREE.BoxGeometry(0.32, 0.95, 0.30).translate(0, 5.1, 2.9),
    ]);
    const tlp = new THREE.InstancedMesh(tlPole, M.darkMetal, tlMats.length);
    const tlRed = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 5).translate(0, 5.4, 3.06), M.neon(0xff2418, 4.8, 0.8), tlMats.length);
    const tlGrn = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 5).translate(0, 4.8, 3.06), M.neon(0x18ff6a, 4.8, 0.8), tlMats.length);
    tlMats.forEach((m, i) => { tlp.setMatrixAt(i, m); tlRed.setMatrixAt(i, m); tlGrn.setMatrixAt(i, m); });
    tlp.frustumCulled = tlRed.frustumCulled = tlGrn.frustumCulled = false;
    group.add(tlp, tlRed, tlGrn);
  }
  if (zebraGeos.length) {
    const zm = new THREE.Mesh(merge(zebraGeos), M.std({ color: 0xefefef, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2 }));
    zm.receiveShadow = true;
    group.add(zm);
  }

  // ============================================================
  // 5. КИОСКИ, ПЕРГОЛЫ БУЛЬВАРА НУРЖОЛ И ДЕТСКИЕ ПЛОЩАДКИ HIGHVILL
  // ============================================================
  {
    const kioskBase = [], kioskGlass = [], pergolaWood = [], playCol1 = [], playCol2 = [];
    // Киоски и теневые перголы на бульваре Нуржол
    for (const kx of [-690, -370, -250, -160, +165, +360]) {
      kioskBase.push(new THREE.BoxGeometry(5.6, 3.2, 3.4).translate(kx, 1.9, -19));
      kioskGlass.push(new THREE.BoxGeometry(5.7, 2.1, 3.5).translate(kx, 2.0, -19));
    }
    for (const px of [-330, -210, -110, +210, +410]) {
      for (const pz of [-15, +15]) {
        pergolaWood.push(new THREE.BoxGeometry(10, 0.25, 4.2).translate(px, 3.6, pz));
        for (const ox of [-4.5, 0, 4.5]) {
          pergolaWood.push(new THREE.BoxGeometry(0.24, 3.3, 0.24).translate(px + ox, 1.95, pz - 1.8));
          pergolaWood.push(new THREE.BoxGeometry(0.24, 3.3, 0.24).translate(px + ox, 1.95, pz + 1.8));
        }
      }
    }
    // Детские площадки (Highvill Park, Highvill Astana, Ботанический сад, жилые дворы)
    for (const [px, py, pz] of [[-610, 3.84, 650], [-650, 3.84, 672], [1135, 3.84, -95], [-260, 0.04, 695]]) {
      playCol1.push(new THREE.BoxGeometry(8.5, 0.14, 7.5).translate(px, py + 0.07, pz));
      playCol2.push(new THREE.BoxGeometry(2.4, 2.6, 2.4).translate(px - 1.4, py + 1.3, pz));
      playCol2.push(new THREE.ConeGeometry(1.9, 1.4, 4).rotateY(Math.PI / 4).translate(px - 1.4, py + 3.3, pz));
      playCol1.push(new THREE.BoxGeometry(2.8, 0.25, 0.8).rotateZ(-0.55).translate(px + 0.8, py + 1.1, pz));
    }

    if (kioskBase.length) group.add(new THREE.Mesh(merge(kioskBase), M.darkMetal));
    if (kioskGlass.length) group.add(new THREE.Mesh(merge(kioskGlass), M.glassClear));
    if (pergolaWood.length) group.add(new THREE.Mesh(merge(pergolaWood), M.wood));
    if (playCol1.length) group.add(new THREE.Mesh(merge(playCol1), M.std({ color: 0xe6683c, roughness: 0.65 })));
    if (playCol2.length) group.add(new THREE.Mesh(merge(playCol2), M.std({ color: 0x2682d4, roughness: 0.65 })));
  }

  // ============================================================
  // 6. ЖИВЫЕ ПЕШЕХОДЫ (360+), БАШЕННЫЕ КРАНЫ И СТАИ ПТИЦ / ДРОНЫ
  // ============================================================
  const peds = [];
  const pedCols = [0x2c3e50, 0xd84315, 0x1565c0, 0xf5f5f5, 0x2e7d32, 0x6a1b9a, 0xef6c00, 0x37474f];
  // Бульвар Нуржол (140 человек)
  for (let i = 0; i < 140; i++) {
    const x0 = between(r, -820, 500), x1 = x0 + between(r, -90, 90);
    const z = between(r, -12, 12);
    peds.push({ x0, z0: z, x1, z1: z + between(r, -4, 4), y: 0.32, t0: r(), spd: between(r, 1.15, 1.75), col: pedCols[i % pedCols.length] });
  }
  // Площадь Байтерека, Круглая площадь и променад у Дома Министерств / Акорды (80 человек)
  for (let i = 0; i < 28; i++) {
    const ang = r() * Math.PI * 2;
    const rad = between(r, 42, 58);
    const x0 = Math.cos(ang) * rad, z0 = Math.sin(ang) * rad;
    const a2 = ang + between(r, -0.7, 0.7);
    peds.push({ x0, z0, x1: Math.cos(a2) * rad, z1: Math.sin(a2) * rad, y: 0.34, t0: r(), spd: between(r, 1.0, 1.55), col: pedCols[i % pedCols.length] });
  }
  for (let i = 0; i < 28; i++) {
    const ang = r() * Math.PI * 2;
    const rad = between(r, 24, 64);
    const x0 = -560 + Math.cos(ang) * rad, z0 = Math.sin(ang) * rad;
    const a2 = ang + between(r, -0.6, 0.6);
    peds.push({ x0, z0, x1: -560 + Math.cos(a2) * rad, z1: Math.sin(a2) * rad, y: 0.34, t0: r(), spd: between(r, 1.05, 1.6), col: pedCols[i % pedCols.length] });
  }
  for (let i = 0; i < 24; i++) {
    const x0 = between(r, 340, 520), z0 = between(r, -16, 16);
    peds.push({ x0, z0, x1: x0 + between(r, -45, 45), z1: z0 + between(r, -5, 5), y: 0.32, t0: r(), spd: between(r, 1.1, 1.65), col: pedCols[i % pedCols.length] });
  }
  // Ботанический сад, QazaqGaz площадь, MEGA Plaza + Хан Шатыр (140 человек)
  for (let i = 0; i < 50; i++) {
    const x0 = between(r, -395, -210), z0 = between(r, 560, 725);
    peds.push({ x0, z0, x1: x0 + between(r, -40, 40), z1: z0 + between(r, -35, 35), y: 0.04, t0: r(), spd: between(r, 1.0, 1.6), col: pedCols[i % pedCols.length] });
  }
  for (let i = 0; i < 35; i++) {
    const x0 = between(r, -280, -80), z0 = between(r, 928, 952);
    peds.push({ x0, z0, x1: x0 + between(r, -50, 50), z1: z0 + between(r, -8, 8), y: 0.30, t0: r(), spd: between(r, 1.1, 1.6), col: pedCols[i % pedCols.length] });
  }
  for (let i = 0; i < 35; i++) {
    const x0 = between(r, 195, 275), z0 = between(r, 178, 194);
    peds.push({ x0, z0, x1: x0 + between(r, -26, 26), z1: z0 + between(r, -4, 4), y: 0.04, t0: r(), spd: between(r, 1.1, 1.6), col: pedCols[i % pedCols.length] });
  }
  for (let i = 0; i < 20; i++) {
    const x0 = between(r, -860, -810), z0 = between(r, -28, 28);
    peds.push({ x0, z0, x1: x0 + between(r, -25, 25), z1: z0 + between(r, -12, 12), y: 0.32, t0: r(), spd: between(r, 1.05, 1.5), col: pedCols[i % pedCols.length] });
  }

  const pedInsts = pedModel.parts.map((part) => {
    const isCoat = part.name === "UrbCoat";
    const mat = part.material.clone();
    if (isCoat) mat.color.setHex(0xffffff);
    M.setup(mat);
    const inst = new THREE.InstancedMesh(part.geometry, mat, peds.length);
    if (isCoat) {
      peds.forEach((p, i) => inst.setColorAt(i, tmpC.setHex(p.col)));
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }
    inst.castShadow = part.name === "UrbCoat" || part.name === "UrbPants";
    inst.receiveShadow = true;
    inst.frustumCulled = false;
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(inst);
    return inst;
  });

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), UPV = new THREE.Vector3(0, 1, 0);
  function updatePeds(time) {
    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      const dx = p.x1 - p.x0, dz = p.z1 - p.z0;
      const dist = Math.hypot(dx, dz) || 1;
      const cyc = (p.t0 + (time * p.spd) / dist) % 2;
      const ping = cyc <= 1 ? cyc : 2 - cyc;
      const dir = cyc <= 1 ? 1 : -1;
      const x = p.x0 + dx * ping;
      const z = p.z0 + dz * ping;
      const bob = Math.abs(Math.sin(time * p.spd * 4.2 + i)) * 0.035;
      const yaw = Math.atan2(dx * dir, dz * dir);
      _q.setFromAxisAngle(UPV, yaw);
      _m.compose(_p.set(x, p.y + bob, z), _q, _s);
      for (let k = 0; k < pedInsts.length; k++) pedInsts[k].setMatrixAt(i, _m);
    }
    for (let k = 0; k < pedInsts.length; k++) pedInsts[k].instanceMatrix.needsUpdate = true;
  }
  updatePeds(0);

  // ============================================================
  // 7. 3 МЕДЛЕННО ВРАЩАЮЩИХСЯ БАШЕННЫХ КРАНА С АВИАМАЯКАМИ
  // ============================================================
  const craneYellowMat = M.std({ color: 0xe6a618, roughness: 0.45, metalness: 0.35 });
  const craneRedBeaconMat = M.neon(0xff1e14, 7.5, 0.4);
  const craneSpots = [
    { x: -1085, z: +480, h: 118, jib: 46, phase: 0.2 },
    { x: +460,  z: -620, h: 106, jib: 42, phase: 2.1 },
    { x: +1340, z: +460, h: 98,  jib: 40, phase: 4.3 },
  ];
  const cranes = [];
  for (const cs of craneSpots) {
    if (onRoad(cs.x, cs.z, 30) || insideBuildingOrWater(cs.x, cs.z, buildings)) continue;
    const cg = new THREE.Group();
    cg.position.set(cs.x, 0, cs.z);
    // Базовая бетонная плита и мачта крана
    const base = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.2, 7.2), M.concreteDark);
    base.position.y = 1.1;
    const mast = new THREE.Mesh(new THREE.BoxGeometry(2.6, cs.h, 2.6), craneYellowMat);
    mast.position.y = cs.h * 0.5;
    mast.castShadow = true;
    // Подстроящаяся бетонная коробка вокруг крана (эффект живой стройплощадки)
    const siteCore = new THREE.Mesh(new THREE.BoxGeometry(24, 28, 18), M.concrete);
    siteCore.position.set(16, 14, 8);
    siteCore.castShadow = siteCore.receiveShadow = true;

    // Поворотная стрела
    const boom = new THREE.Group();
    boom.position.y = cs.h;
    const jibMesh = new THREE.Mesh(
      merge([
        new THREE.BoxGeometry(cs.jib, 2.2, 1.8).translate(cs.jib * 0.5 - 6, 0, 0),
        new THREE.BoxGeometry(16, 2.0, 2.0).translate(-12, 0, 0),
        new THREE.ConeGeometry(1.8, 10, 4).rotateY(Math.PI / 4).translate(0, 5.0, 0),
        new THREE.BoxGeometry(4.2, 3.0, 3.2).translate(-18, -0.5, 0), // противовес
      ]),
      craneYellowMat
    );
    jibMesh.castShadow = true;
    const counterweight = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 3.4), M.concreteDark);
    counterweight.position.set(-18, -0.6, 0);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 34, 5), M.darkMetal);
    cable.position.set(cs.jib * 0.62, -17, 0);
    const beaconBulb = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6), craneRedBeaconMat);
    beaconBulb.position.set(0, 10.4, 0);
    const tipBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), craneRedBeaconMat);
    tipBeacon.position.set(cs.jib - 6.5, 1.4, 0);
    boom.add(jibMesh, counterweight, cable, beaconBulb, tipBeacon);

    cg.add(base, mast, siteCore, boom);
    group.add(cg);
    cranes.push({ boom, beaconBulb, tipBeacon, phase: cs.phase });
  }

  // ============================================================
  // 8. СТАИ ПТИЦ В НЕБЕ (ДЕНЬ/ЗАКАТ) И ГОРОДСКИЕ ДРОНЫ (CYBER 2077)
  // ============================================================
  const birdCount = 66;
  const birdGeo = merge([
    new THREE.BoxGeometry(1.15, 0.08, 0.34).rotateZ(0.28).translate(0.55, 0.14, 0),
    new THREE.BoxGeometry(1.15, 0.08, 0.34).rotateZ(-0.28).translate(-0.55, 0.14, 0),
    new THREE.BoxGeometry(0.22, 0.22, 0.85),
  ]);
  const birdMat = M.std({ color: 0xf4f4f2, roughness: 0.65, metalness: 0.05 });
  const birdMesh = new THREE.InstancedMesh(birdGeo, birdMat, birdCount);
  birdMesh.frustumCulled = false;
  birdMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(birdMesh);

  const flocks = [
    { cx: 780, cz: -40, rMin: 75, rMax: 170, yBase: 64 },   // над рекой Есиль
    { cx: -680, cz: 30, rMin: 60, rMax: 140, yBase: 86 },   // Парк Влюблённых / Круглая площадь
    { cx: 1080, cz: 40, rMin: 80, rMax: 185, yBase: 76 },   // Президентский парк
  ];
  const birds = [];
  for (let i = 0; i < birdCount; i++) {
    const fl = flocks[i % flocks.length];
    birds.push({
      cx: fl.cx + between(r, -25, 25),
      cz: fl.cz + between(r, -25, 25),
      rad: between(r, fl.rMin, fl.rMax),
      y: fl.yBase + between(r, -16, 26),
      a0: r() * Math.PI * 2,
      spd: between(r, 0.18, 0.34) * (i % 2 === 0 ? 1 : -1),
      ph: r() * Math.PI * 2,
    });
  }

  const droneCount = 34;
  const droneBodyGeo = merge([
    new THREE.CylinderGeometry(0.65, 0.75, 0.35, 8),
    new THREE.BoxGeometry(1.9, 0.08, 0.28),
    new THREE.BoxGeometry(0.28, 0.08, 1.9),
  ]);
  const droneRingGeo = new THREE.TorusGeometry(0.55, 0.08, 6, 12).rotateX(Math.PI / 2).translate(0, -0.18, 0);
  const droneBodyMesh = new THREE.InstancedMesh(droneBodyGeo, M.darkMetal, droneCount);
  const droneGlowMesh = new THREE.InstancedMesh(droneRingGeo, M.neon(0x00f5ff, 6.2, 0.2), droneCount);
  droneBodyMesh.frustumCulled = droneGlowMesh.frustumCulled = false;
  droneBodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  droneGlowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(droneBodyMesh, droneGlowMesh);

  const drones = [];
  for (let i = 0; i < droneCount; i++) {
    drones.push({
      x0: between(r, -780, 560),
      z0: between(r, -220, 260),
      rx: between(r, 45, 160),
      rz: between(r, 20, 85),
      y: between(r, 20, 68),
      spd: between(r, 0.25, 0.55) * (i % 2 === 0 ? 1 : -1),
      ph: r() * Math.PI * 2,
    });
  }

  return {
    group,
    counts: {
      trees: totalTrees,
      benches: benchMats.length,
      bins: binMats.length,
      parkedCars: parked.length,
      busStops: stopMats.length,
      pedestrians: peds.length,
      cranes: cranes.length,
    },
    update(_dt, time, _cam, cyberMix) {
      updatePeds(time);
      const foliageBounce = 0.44 * (1.0 - U.uNight.value * 0.88);
      for (let i = 0; i < foliageMats.length; i++) foliageMats[i].emissiveIntensity = foliageBounce;

      // Медленное вращение башенных кранов + мигание красных авиамаяков
      const beaconPulse = (Math.sin(time * 3.8) > 0.15) ? (4.0 + U.uNight.value * 5.0) : 0.25;
      craneRedBeaconMat.color.setHex(0xff1e14).multiplyScalar(beaconPulse);
      for (let i = 0; i < cranes.length; i++) {
        const cr = cranes[i];
        cr.boom.rotation.y = cr.phase + Math.sin(time * 0.08 + cr.phase) * 0.85;
      }

      // Птицы днём/на закате; городские дроны в режиме Cyberpunk 2077
      const isCyber = (cyberMix || U.uCyber.value) >= 0.45;
      birdMesh.visible = !isCyber;
      droneBodyMesh.visible = droneGlowMesh.visible = isCyber;

      if (!isCyber) {
        for (let i = 0; i < birds.length; i++) {
          const b = birds[i];
          const a = b.a0 + b.spd * time;
          const x = b.cx + Math.cos(a) * b.rad;
          const z = b.cz + Math.sin(a) * b.rad;
          const y = b.y + Math.sin(time * 1.4 + b.ph) * 2.2;
          const dir = Math.sign(b.spd);
          const yaw = Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir);
          const flap = 0.72 + 0.45 * Math.sin(time * 9.5 + b.ph);
          _q.setFromAxisAngle(UPV, yaw);
          _m.compose(_p.set(x, y, z), _q, _s.set(1.0, flap, 1.0));
          birdMesh.setMatrixAt(i, _m);
        }
        birdMesh.instanceMatrix.needsUpdate = true;
      } else {
        _s.set(1, 1, 1);
        for (let i = 0; i < drones.length; i++) {
          const d = drones[i];
          const a = d.ph + d.spd * time;
          const x = d.x0 + Math.cos(a) * d.rx;
          const z = d.z0 + Math.sin(a) * d.rz;
          const y = d.y + Math.sin(time * 2.0 + d.ph) * 1.6;
          const yaw = Math.atan2(-Math.sin(a) * d.rx * d.spd, Math.cos(a) * d.rz * d.spd);
          _q.setFromAxisAngle(UPV, yaw);
          _m.compose(_p.set(x, y, z), _q, _s);
          droneBodyMesh.setMatrixAt(i, _m);
          droneGlowMesh.setMatrixAt(i, _m);
        }
        droneBodyMesh.instanceMatrix.needsUpdate = true;
        droneGlowMesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
