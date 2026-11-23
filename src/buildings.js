// ============================================================
// ASTANA REAL v2 — buildings.js
// Реалистичная квартальная застройка Левого и Правого берега Астаны:
// ~500–620 качественных ортогональных зданий через InstancedMesh + LOD
// (стеклянные офисные башни, современные ЖК с балконами и стилобатами,
// золотистые бизнес-центры, застройка Правого берега).
// Строго сохраняет дороги, бульвар Нуржол, реку Есиль и все памятники.
// Экспортирует { group, buildings, list, count, archetypes, update }.
// ============================================================
import * as THREE from "three";
import { ROADS, intersectsReserved, district } from "./config.js";
import { rng, between, place, GB, rect, polyWalls, polyCap, Archetype } from "./geom.js";

// ---------- Архетипы зданий (единичный бокс: x,z ∈ [-0.5,0.5], y ∈ [0,1]) ----------

function makeGlassTower(M, glassMat, name) {
  const mkMain = (detail) => {
    const B = new GB();
    polyWalls(B, rect(1.0, 1.0), 0, 0.20);
    polyWalls(B, rect(0.88, 0.88), 0.20, 0.72);
    polyWalls(B, rect(0.72, 0.72), 0.72, 0.94);
    if (detail > 0) polyWalls(B, rect(0.48, 0.48), 0.94, 1.0);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 1.0), 0.20, true);
    polyCap(B, rect(0.88, 0.88), 0.72, true);
    polyCap(B, rect(0.72, 0.72), 0.94, true);
    polyCap(B, rect(0.48, 0.48), 1.0, true);
    return B.build();
  };
  const mkTrim = (detail) => {
    const B = new GB();
    B.box(0, 0.205, 0, 1.03, 0.015, 1.03);
    B.box(0, 0.725, 0, 0.91, 0.015, 0.91);
    B.box(0, 0.945, 0, 0.75, 0.016, 0.75);
    if (detail === 2) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        B.box(sx * 0.45, 0.46, sz * 0.45, 0.05, 0.52, 0.05);
      }
      B.box(0, 1.03, 0, 0.26, 0.06, 0.26);
      B.box(0, 1.11, 0, 0.022, 0.16, 0.022);
    }
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(0.92, 0.98, 0.92).translate(0, 0.49, 0);
  return new Archetype(name, [
    { lods: [mkMain(2), mkMain(1), mkMain(0)], mat: glassMat },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
    { lods: [mkTrim(2), mkTrim(1), null], mat: M.steel },
  ], { proxyGeo: proxy, colors: true });
}

function makeMidOffice(M) {
  const mkGlass = () => {
    const B = new GB();
    polyWalls(B, rect(1.0, 0.94), 0, 0.24);
    polyWalls(B, rect(0.92, 0.86), 0.24, 0.96);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 0.94), 0.24, true);
    polyCap(B, rect(0.92, 0.86), 0.96, true);
    return B.build();
  };
  const mkFrame = (detail) => {
    const B = new GB();
    B.box(0, 0.975, 0, 0.96, 0.03, 0.90);
    if (detail === 2) {
      B.box(0, 0.245, 0, 1.03, 0.02, 0.97);
      B.box(-0.20, 1.025, -0.08, 0.34, 0.08, 0.36);
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

function makeModernRes(M) {
  const mkMain = () => {
    const B = new GB();
    polyWalls(B, rect(1.0, 1.0), 0, 0.16);
    polyWalls(B, rect(0.86, 0.88), 0.16, 0.94);
    return B.build();
  };
  const mkRoof = () => {
    const B = new GB();
    polyCap(B, rect(1.0, 1.0), 0.16, true);
    polyCap(B, rect(0.86, 0.88), 0.94, true);
    return B.build();
  };
  const mkCrown = (detail) => {
    const B = new GB();
    B.box(0, 0.168, 0, 1.03, 0.022, 1.03);
    B.box(0, 0.96, 0, 0.90, 0.04, 0.92);
    if (detail === 2) {
      B.box(-0.39, 0.55, 0, 0.045, 0.78, 0.92);
      B.box(+0.39, 0.55, 0, 0.045, 0.78, 0.92);
    }
    return B.build();
  };
  const proxy = new THREE.BoxGeometry(0.92, 0.98, 0.94).translate(0, 0.49, 0);
  return new Archetype("modernRes", [
    { lods: [mkMain(), mkMain(), mkMain()], mat: M.res },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
    { lods: [mkCrown(2), mkCrown(1), null], mat: M.travertine },
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
    B.box(0, 0.975, 0, 1.02, 0.03, 1.02);
    if (detail === 2) {
      B.box(-0.28, 1.02, 0, 0.16, 0.08, 0.28);
      B.box(+0.28, 1.02, 0, 0.16, 0.08, 0.28);
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
  const proxy = new THREE.BoxGeometry(1.0, 1.0, 1.0).translate(0, 0.5, 0);
  return new Archetype("govBlock", [
    { lods: [mkMain(), mkMain(), mkMain()], mat: M.stone },
    { lods: [mkRoof(), mkRoof(), mkRoof()], mat: M.roof },
  ], { proxyGeo: proxy, colors: true });
}

// ---------- Спецификации кварталов реальной Астаны ----------

function pickSpec(dist, r) {
  let kind, hMin, hMax, tint;
  if (dist === "downtown") {
    const u = r();
    kind = u < 0.42 ? "blueTower" : u < 0.68 ? "goldTower" : u < 0.86 ? "midOffice" : "modernRes";
    hMin = 52; hMax = 132;
    tint = [0.90 + r() * 0.12, 0.93 + r() * 0.10, 0.96 + r() * 0.08];
  } else if (dist === "business") {
    const u = r();
    kind = u < 0.35 ? "blueTower" : u < 0.65 ? "midOffice" : "modernRes";
    hMin = 38; hMax = 96;
    tint = [0.91 + r() * 0.12, 0.91 + r() * 0.10, 0.92 + r() * 0.10];
  } else if (dist === "midrise") {
    const u = r();
    kind = u < 0.62 ? "modernRes" : u < 0.86 ? "midOffice" : "govBlock";
    hMin = 26; hMax = 64;
    tint = [0.93 + r() * 0.10, 0.91 + r() * 0.10, 0.87 + r() * 0.10];
  } else if (dist === "residential") {
    kind = r() < 0.74 ? "modernRes" : "sovietPanel";
    hMin = 24; hMax = 58;
    tint = [0.93 + r() * 0.10, 0.91 + r() * 0.10, 0.88 + r() * 0.10];
  } else {
    // Правый берег (историческая и современная мало/среднеэтажная застройка)
    const u = r();
    kind = u < 0.44 ? "modernRes" : u < 0.78 ? "sovietPanel" : "govBlock";
    hMin = 18; hMax = 44;
    tint = [0.91 + r() * 0.12, 0.89 + r() * 0.10, 0.85 + r() * 0.10];
  }
  const w = between(r, 22, 40);
  const d = between(r, 18, 34);
  const h = between(r, hMin, hMax);
  return { kind, w, d, h, tint };
}

function hitsRoad(x, z, rad) {
  for (const rd of ROADS) {
    const dx = rd.x1 - rd.x0, dz = rd.z1 - rd.z0;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 1) continue;
    const t = Math.max(0, Math.min(1, ((x - rd.x0) * dx + (z - rd.z0) * dz) / lenSq));
    const px = rd.x0 + dx * t, pz = rd.z0 + dz * t;
    if (Math.hypot(x - px, z - pz) < rd.width / 2 + rad + 6) return true;
  }
  return false;
}

export function buildBuildings(scene, M, ctx) {
  const group = new THREE.Group();
  group.name = "astana-buildings";
  scene.add(group);

  const r = rng(202607);
  const archMap = {
    blueTower: makeGlassTower(M, M.glassBlue, "blueTower"),
    goldTower: makeGlassTower(M, M.glassGold, "goldTower"),
    midOffice: makeMidOffice(M),
    modernRes: makeModernRes(M),
    sovietPanel: makeSovietPanel(M),
    govBlock: makeGovBlock(M),
  };
  const buckets = Object.fromEntries(Object.keys(archMap).map((k) => [k, []]));
  const buildings = [];

  // Квартальная сетка реальной Астаны (~580–640 зданий, равномерно по Левому и Правому берегам)
  const step = 62;

  for (let gx = -1260; gx <= 1560; gx += step) {
    for (let gz = -960; gz <= 1080; gz += step) {
      const distCenter = Math.hypot(gx * 0.80, gz);
      if (distCenter > 1360) continue;
      // Высокая плотность вдоль Левого берега, умеренная на окраинах
      const keepProb = distCenter < 680 ? 0.94 : distCenter < 1050 ? 0.70 : 0.42;
      if (r() > keepProb) continue;

      const x = gx + (r() - 0.5) * 14;
      const z = gz + (r() - 0.5) * 14;

      const dist = district(x, z);
      const spec = pickSpec(dist, r);
      // Ортогональная квартальная ориентация (0 или 90°, как в реальной застройке Астаны!)
      const yaw = r() < 0.5 ? 0 : Math.PI / 2;
      const effHx = (yaw === 0 ? spec.w : spec.d) / 2;
      const effHz = (yaw === 0 ? spec.d : spec.w) / 2;

      if (intersectsReserved(x, z, effHx + 6, effHz + 6)) continue;
      if (hitsRoad(x, z, Math.max(effHx, effHz))) continue;

      const item = { x, y: 0, z, yaw, w: spec.w, d: spec.d, h: spec.h, kind: spec.kind, tint: spec.tint };
      buckets[spec.kind].push(item);
      buildings.push({ x, y: 0, z, yaw, w: spec.w, d: spec.d, h: spec.h, kind: spec.kind });
    }
  }

  // Построение инстансированных мешей внутри group
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
      cols[idx * 3] = b.tint[0];
      cols[idx * 3 + 1] = b.tint[1];
      cols[idx * 3 + 2] = b.tint[2];
    });
    arch.setInstances(mats, cols);
    archetypes.push(arch);
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
