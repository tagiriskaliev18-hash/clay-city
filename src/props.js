// ============================================================
// ASTANA 2077 — наземная городская жизнь на плоской земле y = 0:
//   - реалистичный поток автомобилей с фарами и стоп-огнями по
//     прямым проспектам и мостам ROADS (обе стороны, полосы)
//   - низкие архитектурные болларды подсветки у QazaqGaz и Байтерека
// Деревья и высокие уличные фонари строит city.js (без дублирования).
// Всегда видимо в обоих режимах (Реальная Астана и Cyberpunk 2077).
// ============================================================
import * as THREE from "three";
import { ROADS, LANDMARKS } from "./config.js";
import { rng, between, place, merge } from "./geom.js";

/** Силуэт современного городского автомобиля (кузов + кабина + колёсные арки). */
function carBodyGeo() {
  const low = new THREE.BoxGeometry(1.88, 0.64, 4.45).translate(0, 0.52, 0);
  const cab = new THREE.BoxGeometry(1.62, 0.56, 2.15).translate(0, 1.08, -0.18);
  return merge([low, cab]);
}

/** Геометрия архитектурного пешеходного болларда (столбик 1.05 м). */
function bollardPostGeo() {
  const base = new THREE.CylinderGeometry(0.14, 0.17, 0.14, 8).translate(0, 0.07, 0);
  const body = new THREE.CylinderGeometry(0.10, 0.11, 0.78, 8).translate(0, 0.52, 0);
  const cap = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 8).translate(0, 1.04, 0);
  return merge([base, body, cap]);
}

export function buildProps(scene, M, _ctx) {
  const group = new THREE.Group();
  group.name = "street-props";
  scene.add(group);
  const r = rng(42077);

  // ---------- 1. НАЗЕМНЫЙ АВТОТРАФИК ПО ПРЯМЫМ ПРОСПЕКТАМ И МОСТАМ ROADS ----------
  const cars = [];
  const carPalette = [
    0xf0f2f5, // pearl white (популярный в Астане)
    0xd4d8de, // silver
    0x1c2128, // obsidian black
    0x3a434f, // graphite
    0x203b5a, // deep navy
    0x882624, // burgundy
    0xc5b89e, // champagne
    0x2a2e34, // dark metallic
  ];

  for (const road of ROADS) {
    if (!road.lanes || road.lanes <= 0) continue;
    const dx = road.x1 - road.x0;
    const dz = road.z1 - road.z0;
    const len = Math.hypot(dx, dz);
    if (len < 60) continue;

    const dirX = dx / len;
    const dirZ = dz / len;
    // Нормаль вправо по ходу от (x0,z0) к (x1,z1)
    const rightX = -dirZ;
    const rightZ = dirX;

    // Высота проезжей части: на мостах совпадает с настилом из city.js
    const deckY = road.type === "bridge"
      ? (road.style === "cable" ? 4.92 : 4.72)
      : 0.04;

    const lanesPerSide = Math.max(1, Math.min(3, Math.floor(road.lanes / 2) || 1));
    const usableHalf = Math.max(3.2, road.width * 0.5 - 2.4);
    const laneSpacing = lanesPerSide > 1 ? (usableHalf * 0.78) / lanesPerSide : 0;

    // Плотность потока: ~1 машина на 75–95 м на каждую сторону
    const countPerSide = Math.max(2, Math.round(len / (road.type === "bridge" ? 55 : 85)));

    for (const dir of [1, -1]) {
      const tx = dirX * dir;
      const tz = dirZ * dir;
      const yaw = Math.atan2(tx, tz);

      for (let i = 0; i < countPerSide; i++) {
        const laneIdx = i % lanesPerSide;
        // Правостороннее движение: смещение вправо от вектора направления движения (tx, tz)
        // Правый вектор для (tx, tz) равен (-tz, tx) = dir * (rightX, rightZ)
        const offsetMag = Math.min(usableHalf - 1.1, 2.2 + laneIdx * Math.max(2.9, laneSpacing));
        const offX = rightX * dir * offsetMag;
        const offZ = rightZ * dir * offsetMag;

        const baseT = (i + 0.15 + r() * 0.7) / countPerSide;
        const speedMps = between(r, 11.5, 19.5) + laneIdx * 2.2; // м/с (42–75 км/ч)
        cars.push({
          x0: road.x0 + offX,
          z0: road.z0 + offZ,
          dx,
          dz,
          len,
          y: deckY,
          dir,
          yaw,
          t0: baseT,
          speedT: speedMps / len,
          color: carPalette[Math.floor(r() * carPalette.length)],
        });
      }
    }
  }

  let carBody = null, carHeads = null, carTails = null;
  if (cars.length > 0) {
    const bodyMat = M.std({ color: 0xffffff, roughness: 0.24, metalness: 0.72, envMapIntensity: 1.25 });
    carBody = new THREE.InstancedMesh(carBodyGeo(), bodyMat, cars.length);
    const headGeo = merge([
      new THREE.BoxGeometry(0.36, 0.20, 0.12).translate(-0.62, 0.56, 2.24),
      new THREE.BoxGeometry(0.36, 0.20, 0.12).translate(0.62, 0.56, 2.24),
    ]);
    const tailGeo = merge([
      new THREE.BoxGeometry(0.42, 0.18, 0.12).translate(-0.62, 0.58, -2.24),
      new THREE.BoxGeometry(0.42, 0.18, 0.12).translate(0.62, 0.58, -2.24),
    ]);
    carHeads = new THREE.InstancedMesh(headGeo, M.neon(0xf4f9ff, 5.2, 0.22), cars.length);
    carTails = new THREE.InstancedMesh(tailGeo, M.neon(0xff2218, 4.8, 0.20), cars.length);

    const tmpCol = new THREE.Color();
    for (let i = 0; i < cars.length; i++) {
      carBody.setColorAt(i, tmpCol.setHex(cars[i].color));
    }
    if (carBody.instanceColor) carBody.instanceColor.needsUpdate = true;

    carBody.castShadow = true;
    carBody.receiveShadow = true;
    carBody.frustumCulled = carHeads.frustumCulled = carTails.frustumCulled = false;
    carBody.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    carHeads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    carTails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(carBody, carHeads, carTails);
  }

  // ---------- 2. ПЕШЕХОДНЫЕ БОЛЛАРДЫ ПОДСВЕТКИ (QazaqGaz HQ и площадь Байтерека) ----------
  const bollardMats = [];
  // Парадная площадь QazaqGaz HQ (x: 235, z: 155) — вдоль южной (+Z) и западной (-X) аллей
  const qg = LANDMARKS.qazaqGaz || { x: 235, z: 155 };
  for (let bx = -24; bx <= 24; bx += 8) {
    if (Math.abs(bx) < 6) continue; // проход на парадную лестницу
    bollardMats.push(place(qg.x + bx, 0.02, qg.z + 44, 0));
    bollardMats.push(place(qg.x + bx, 0.02, qg.z - 42, 0));
  }
  for (let bz = -24; bz <= 28; bz += 10) {
    bollardMats.push(place(qg.x - 36, 0.02, qg.z + bz, 0));
    bollardMats.push(place(qg.x + 36, 0.02, qg.z + bz, 0));
  }
  // Площадь вокруг Байтерека (x: 0, z: 0)
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    const rad = 42;
    bollardMats.push(place(Math.cos(ang) * rad, 0.34, Math.sin(ang) * rad, 0));
  }
  if (bollardMats.length) {
    const posts = new THREE.InstancedMesh(bollardPostGeo(), M.darkMetal, bollardMats.length);
    const bulbs = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.14, 8).translate(0, 0.94, 0),
      M.glow(0xffe0a8, 4.5, 0xd8d0c0),
      bollardMats.length
    );
    bollardMats.forEach((m, i) => { posts.setMatrixAt(i, m); bulbs.setMatrixAt(i, m); });
    posts.frustumCulled = bulbs.frustumCulled = false;
    group.add(posts, bulbs);
  }

  // ---------- АНИМАЦИЯ НАЗЕМНОГО ТРАФИКА ----------
  const _m2 = new THREE.Matrix4();
  const _q2 = new THREE.Quaternion();
  const _p2 = new THREE.Vector3();
  const _s2 = new THREE.Vector3(1, 1, 1);
  const UP = new THREE.Vector3(0, 1, 0);

  function updateCars(time) {
    if (!carBody) return;
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      let t = (c.t0 + c.dir * c.speedT * time) % 1;
      if (t < 0) t += 1;
      const x = c.x0 + c.dx * t;
      const z = c.z0 + c.dz * t;
      _q2.setFromAxisAngle(UP, c.yaw);
      _m2.compose(_p2.set(x, c.y, z), _q2, _s2);
      carBody.setMatrixAt(i, _m2);
      carHeads.setMatrixAt(i, _m2);
      carTails.setMatrixAt(i, _m2);
    }
    carBody.instanceMatrix.needsUpdate = true;
    carHeads.instanceMatrix.needsUpdate = true;
    carTails.instanceMatrix.needsUpdate = true;
  }
  updateCars(0);

  return {
    group,
    carCount: cars.length,
    update(_dt, time) {
      updateCars(time);
    },
  };
}
