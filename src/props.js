// ============================================================
// CLAY CITY v3 — уличная жизнь и детализация:
//   - уличные фонари вдоль всех кольцевых дорог и проспектов
//   - деревья (crossed-billboard) на бульваре Нуржол и в парках
//   - анимированный трафик автомобилей с фарами и стоп-огнями
//   - набережные перила по кромкам парящих платформ
// Всё на InstancedMesh, минимум draw calls.
// ============================================================
import * as THREE from "three";
import { PLATFORMS, ROAD, BOULEVARD, intersectsReserved } from "./config.js";
import { bandRange, avenues, blockClear, isBoulevard, TAU } from "./grid.js";
import { rng, between, place, merge } from "./geom.js";
import { leafSprite } from "./textures.js";

const CURB = ROAD.curb;

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

/** Геометрия уличного фонаря (столб + изогнутый кронштейн). */
function lampPoleGeo() {
  const stem = new THREE.CylinderGeometry(0.11, 0.18, 7.6, 6).translate(0, 3.8, 0);
  const arm = new THREE.BoxGeometry(0.14, 0.14, 2.2).translate(0, 7.55, 1.0);
  const base = new THREE.CylinderGeometry(0.32, 0.42, 0.7, 6).translate(0, 0.35, 0);
  return merge([stem, arm, base]);
}

/** Скрещённые плоскости для дерева (crossed-billboard). */
function treeGeo() {
  const p1 = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const p2 = new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2).translate(0, 0.5, 0);
  return merge([p1, p2]);
}

/** Силуэт автомобиля (кузов + кабина). */
function carBodyGeo() {
  const low = new THREE.BoxGeometry(1.9, 0.72, 4.4).translate(0, 0.56, 0);
  const cab = new THREE.BoxGeometry(1.65, 0.62, 2.1).translate(0, 1.18, -0.2);
  return merge([low, cab]);
}

export function buildProps(scene, M, _ctx) {
  const group = new THREE.Group();
  group.name = "street-props";
  scene.add(group);
  const r = rng(42077);

  // ---------- 1. УЛИЧНЫЕ ФОНАРИ ----------
  const lampMats = [];
  for (const plat of PLATFORMS) {
    for (const rr of plat.ringRoads) {
      const count = Math.max(12, Math.round((TAU * rr) / ROAD.lampStep));
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU;
        for (const side of [-1, 1]) {
          const rad = rr + side * (ROAD.ringHalf + 1.2);
          const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
          if (intersectsReserved(x, z, 2, 2)) continue;
          if (isBoulevard(plat, x, z)) continue;
          // кронштейн смотрит на проезжую часть
          const yaw = Math.atan2(-side * Math.cos(a), -side * Math.sin(a));
          lampMats.push(place(x, plat.y + CURB, z, yaw));
        }
      }
    }
  }
  if (lampMats.length) {
    const poles = new THREE.InstancedMesh(lampPoleGeo(), M.darkMetal, lampMats.length);
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.2, 0.95).translate(0, 7.42, 2.0), M.glow(0xffd9a0, 5.5), lampMats.length);
    lampMats.forEach((m, i) => { poles.setMatrixAt(i, m); heads.setMatrixAt(i, m); });
    poles.frustumCulled = heads.frustumCulled = false;
    group.add(poles, heads);
  }

  // ---------- 2. ДЕРЕВЬЯ (бульвар Нуржол + парковые кварталы) ----------
  const treeMats = [];
  // аллеи вдоль бульвара Нуржол (core + ringB)
  for (let x = -220; x <= 530; x += 18) {
    if (Math.abs(x) < 76) continue; // площадь Байтерека
    for (const z of [-24, -8, 8, 24]) {
      const jx = x + between(r, -2.5, 2.5), jz = z + between(r, -2.0, 2.0);
      if (intersectsReserved(jx, jz, 3, 3)) continue;
      const sc = between(r, 7.5, 12.5);
      treeMats.push(place(jx, CURB, jz, r() * TAU, sc, sc * between(r, 0.9, 1.25), sc));
    }
  }
  for (let x = 635; x <= 685; x += 16) {
    for (const z of [-24, -10, 10, 24]) {
      const sc = between(r, 7.5, 11.5);
      treeMats.push(place(x, 40 + CURB, z, r() * TAU, sc, sc, sc));
    }
  }
  // парковые кварталы по всем платформам
  for (const plat of PLATFORMS) {
    for (let i = 0; i < plat.ringRoads.length; i++) {
      const clr = blockClear(plat, i);
      if (!clr) continue;
      const n = avenues(plat, i), cell = TAU / n;
      const rMid = (clr.rIn + clr.rOut) / 2;
      for (let k = 0; k < n; k++) {
        if (!isParkBlock(i, k)) continue;
        const a0 = -Math.PI + k * cell, a1 = a0 + cell;
        const padA = Math.asin(Math.min(0.45, (ROAD.aveHalf + ROAD.walk + 4) / rMid));
        if (a1 - padA <= a0 + padA) continue;
        const treesInPark = plat.id === "core" ? 7 : 6;
        for (let t = 0; t < treesInPark; t++) {
          const aa = between(r, a0 + padA, a1 - padA);
          const rr = between(r, clr.rIn + 4, clr.rOut - 4);
          const x = Math.cos(aa) * rr, z = Math.sin(aa) * rr;
          if (intersectsReserved(x, z, 4, 4) || isBoulevard(plat, x, z)) continue;
          const sc = between(r, 8, 14);
          treeMats.push(place(x, plat.y + CURB, z, r() * TAU, sc, sc * between(r, 0.85, 1.25), sc));
        }
      }
    }
  }
  if (treeMats.length) {
    const leafTex = leafSprite(256, 17);
    const treeMat = M.std({
      map: leafTex,
      alphaTest: 0.42,
      roughness: 0.88,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const trees = new THREE.InstancedMesh(treeGeo(), treeMat, treeMats.length);
    treeMats.forEach((m, i) => trees.setMatrixAt(i, m));
    trees.frustumCulled = false;
    trees.castShadow = false;
    trees.receiveShadow = true;
    group.add(trees);
  }

  // ---------- 3. ПЕРИЛА НАБЕРЕЖНЫХ ПО КРОМКАМ ПЛАТФОРМ ----------
  const railMats = [];
  for (const plat of PLATFORMS) {
    const rads = plat.rIn > 0 ? [plat.rOut - 3.6, plat.rIn + 3.6] : [plat.rOut - 3.6];
    for (const rr of rads) {
      const n = Math.round((TAU * rr) / 14);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        railMats.push(place(x, plat.y + 0.55, z, Math.atan2(x, z)));
      }
    }
  }
  if (railMats.length) {
    const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), M.brass, railMats.length);
    railMats.forEach((m, i) => post.setMatrixAt(i, m));
    post.frustumCulled = false;
    group.add(post);
  }

  // ---------- 4. АНИМИРОВАННЫЙ ТРАФИК (АВТОМОБИЛИ С ФАРАМИ И СТОП-ОГНЯМИ) ----------
  const cars = [];
  const carPalette = [0x1c222a, 0xd8dce0, 0x3b4856, 0x8a2824, 0x264866, 0xc2a878, 0x15181c];
  for (const plat of PLATFORMS) {
    for (const rr of plat.ringRoads) {
      const count = Math.max(8, Math.round(rr / 42));
      for (let i = 0; i < count; i++) {
        const dir = i % 2 === 0 ? 1 : -1;
        const laneR = rr + dir * 3.6;
        const speed = between(r, 14, 26) / laneR; // угловая скорость рад/с
        cars.push({
          y: plat.y + 0.04,
          r: laneR,
          a: r() * TAU,
          w: dir * speed,
          dir,
          color: carPalette[Math.floor(r() * carPalette.length)],
        });
      }
    }
  }

  const carBody = new THREE.InstancedMesh(carBodyGeo(), M.std({ color: 0xffffff, roughness: 0.25, metalness: 0.72, envMapIntensity: 1.2 }), cars.length);
  const headGeo = merge([
    new THREE.BoxGeometry(0.36, 0.22, 0.12).translate(-0.62, 0.62, 2.22),
    new THREE.BoxGeometry(0.36, 0.22, 0.12).translate(0.62, 0.62, 2.22),
  ]);
  const tailGeo = merge([
    new THREE.BoxGeometry(0.42, 0.20, 0.12).translate(-0.62, 0.64, -2.22),
    new THREE.BoxGeometry(0.42, 0.20, 0.12).translate(0.62, 0.64, -2.22),
  ]);
  const carHeads = new THREE.InstancedMesh(headGeo, M.neon(0xf2f8ff, 5.5, 0.15), cars.length);
  const carTails = new THREE.InstancedMesh(tailGeo, M.neon(0xff2a1a, 5.0, 0.15), cars.length);
  const tmpCol = new THREE.Color();
  cars.forEach((c, i) => { carBody.setColorAt(i, tmpCol.setHex(c.color)); });
  if (carBody.instanceColor) carBody.instanceColor.needsUpdate = true;
  carBody.frustumCulled = carHeads.frustumCulled = carTails.frustumCulled = false;
  group.add(carBody, carHeads, carTails);

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0);
  function updateCars(time) {
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      const a = c.a + c.w * time;
      const x = Math.cos(a) * c.r, z = Math.sin(a) * c.r;
      // касательный вектор движения: (-sin(a)*dir, cos(a)*dir)
      const tx = -Math.sin(a) * c.dir, tz = Math.cos(a) * c.dir;
      const yaw = Math.atan2(tx, tz);
      _q.setFromAxisAngle(UP, yaw);
      _m.compose(_p.set(x, c.y, z), _q, _s);
      carBody.setMatrixAt(i, _m);
      carHeads.setMatrixAt(i, _m);
      carTails.setMatrixAt(i, _m);
    }
    carBody.instanceMatrix.needsUpdate = true;
    carHeads.instanceMatrix.needsUpdate = true;
    carTails.instanceMatrix.needsUpdate = true;
  }
  updateCars(0);

  return {
    group,
    update(_dt, time) {
      updateCars(time);
    },
  };
}
