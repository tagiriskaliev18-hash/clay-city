// ============================================================
// ASTANA REAL v5 — props.js
// Наземный движущийся трафик (420+ авто на проспектах и мостах):
//   - Легковые авто и кроссоверы с фарами и стоп-огнями
//   - Белые городские автобусы Астаны с бирюзовой полосой
//   - Жёлтые городские такси с плафоном
//   - Архитектурные пешеходные болларды у QazaqGaz и Байтерека
// ============================================================
import * as THREE from "three";
import { ROADS, LANDMARKS } from "./config.js";
import { rng, between, place, merge } from "./geom.js";

function carBodyGeo() {
  const low = new THREE.BoxGeometry(1.88, 0.64, 4.45).translate(0, 0.52, 0);
  const cab = new THREE.BoxGeometry(1.62, 0.56, 2.15).translate(0, 1.08, -0.18);
  return merge([low, cab]);
}

function busBodyGeo() {
  return new THREE.BoxGeometry(2.55, 2.55, 11.2).translate(0, 1.55, 0);
}

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

  const sedans = [], buses = [], taxis = [];
  const carPalette = [0xf0f2f5, 0xd4d8de, 0x1c2128, 0x3a434f, 0x203b5a, 0x882624, 0xc5b89e, 0x2a2e34];

  for (const road of ROADS) {
    if (!road.lanes || road.lanes <= 0) continue;
    const dx = road.x1 - road.x0, dz = road.z1 - road.z0;
    const len = Math.hypot(dx, dz);
    if (len < 60) continue;

    const dirX = dx / len, dirZ = dz / len;
    const rightX = -dirZ, rightZ = dirX;
    const deckY = road.type === "bridge" ? (road.style === "cable" ? 4.92 : 4.72) : 0.04;
    const lanesPerSide = Math.max(1, Math.min(4, road.lanes));
    const usableHalf = Math.max(3.2, road.width * 0.5 - 2.2);
    const laneSpacing = lanesPerSide > 1 ? (usableHalf * 0.80) / lanesPerSide : 0;

    // Плотный городской поток: 1 машина каждые ~68–80 м (итого 430+ машин!)
    const countPerSide = Math.max(3, Math.round(len / (road.type === "bridge" ? 42 : 76)));

    for (const dir of [1, -1]) {
      const tx = dirX * dir, tz = dirZ * dir;
      const yaw = Math.atan2(tx, tz);

      for (let i = 0; i < countPerSide; i++) {
        const laneIdx = i % lanesPerSide;
        const offsetMag = Math.min(usableHalf - 1.1, 2.0 + laneIdx * Math.max(2.7, laneSpacing));
        const offX = rightX * dir * offsetMag;
        const offZ = rightZ * dir * offsetMag;

        const baseT = (i + 0.12 + r() * 0.72) / countPerSide;
        const roll = r();
        const isBus = road.type !== "bridge" && laneIdx === lanesPerSide - 1 && roll < 0.16;
        const isTaxi = !isBus && roll < 0.24;
        const speedMps = isBus ? between(r, 9.5, 13.0) : between(r, 12.0, 20.5) + laneIdx * 1.8;

        const item = {
          x0: road.x0 + offX,
          z0: road.z0 + offZ,
          dx, dz, len, y: deckY, dir, yaw,
          t0: baseT,
          speedT: speedMps / len,
          color: carPalette[Math.floor(r() * carPalette.length)],
          suv: !isBus && !isTaxi && r() < 0.35,
        };
        if (isBus) buses.push(item);
        else if (isTaxi) taxis.push(item);
        else sedans.push(item);
      }
    }
  }

  // Фары и стоп-огни (общие геометрии)
  const headGeo = merge([
    new THREE.BoxGeometry(0.36, 0.20, 0.12).translate(-0.62, 0.56, 2.24),
    new THREE.BoxGeometry(0.36, 0.20, 0.12).translate(0.62, 0.56, 2.24),
  ]);
  const tailGeo = merge([
    new THREE.BoxGeometry(0.42, 0.18, 0.12).translate(-0.62, 0.58, -2.24),
    new THREE.BoxGeometry(0.42, 0.18, 0.12).translate(0.62, 0.58, -2.24),
  ]);
  const headMat = M.neon(0xf4f9ff, 5.2, 0.25);
  const tailMat = M.neon(0xff2218, 4.8, 0.22);
  const tmpCol = new THREE.Color();

  // 1. Седаны и кроссоверы
  let carBody = null, carHeads = null, carTails = null;
  if (sedans.length) {
    carBody = new THREE.InstancedMesh(carBodyGeo(), M.std({ color: 0xffffff, roughness: 0.24, metalness: 0.72, envMapIntensity: 1.25 }), sedans.length);
    carHeads = new THREE.InstancedMesh(headGeo, headMat, sedans.length);
    carTails = new THREE.InstancedMesh(tailGeo, tailMat, sedans.length);
    sedans.forEach((c, i) => carBody.setColorAt(i, tmpCol.setHex(c.color)));
    if (carBody.instanceColor) carBody.instanceColor.needsUpdate = true;
    carBody.castShadow = true; carBody.receiveShadow = true;
    carBody.frustumCulled = carHeads.frustumCulled = carTails.frustumCulled = false;
    carBody.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    carHeads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    carTails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(carBody, carHeads, carTails);
  }

  // 2. Жёлтые такси
  let taxiBody = null, taxiHeads = null, taxiTails = null;
  if (taxis.length) {
    const tGeo = merge([carBodyGeo(), new THREE.BoxGeometry(0.55, 0.18, 0.28).translate(0, 1.44, -0.1)]);
    taxiBody = new THREE.InstancedMesh(tGeo, M.std({ color: 0xf4bc1c, roughness: 0.26, metalness: 0.55 }), taxis.length);
    taxiHeads = new THREE.InstancedMesh(headGeo, headMat, taxis.length);
    taxiTails = new THREE.InstancedMesh(tailGeo, tailMat, taxis.length);
    taxiBody.castShadow = true;
    taxiBody.frustumCulled = taxiHeads.frustumCulled = taxiTails.frustumCulled = false;
    taxiBody.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    taxiHeads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    taxiTails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(taxiBody, taxiHeads, taxiTails);
  }

  // 3. Белые городские автобусы Астаны с бирюзовой полосой
  let busBody = null, busStripe = null, busGlass = null;
  if (buses.length) {
    busBody = new THREE.InstancedMesh(busBodyGeo(), M.whitePaint, buses.length);
    busStripe = new THREE.InstancedMesh(new THREE.BoxGeometry(2.60, 0.55, 11.24).translate(0, 0.85, 0), M.turquoise, buses.length);
    busGlass = new THREE.InstancedMesh(new THREE.BoxGeometry(2.60, 1.05, 10.6).translate(0, 2.05, 0.2), M.glassDark, buses.length);
    busBody.castShadow = true;
    busBody.frustumCulled = busStripe.frustumCulled = busGlass.frustumCulled = false;
    busBody.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    busStripe.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    busGlass.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(busBody, busStripe, busGlass);
  }

  // ---------- ПЕШЕХОДНЫЕ БОЛЛАРДЫ ПОДСВЕТКИ ----------
  const bollardMats = [];
  const qg = LANDMARKS.qazaqGaz || { x: 235, z: 155 };
  for (let bx = -24; bx <= 24; bx += 8) {
    if (Math.abs(bx) < 6) continue;
    bollardMats.push(place(qg.x + bx, 0.02, qg.z - 25, 0));
  }
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    bollardMats.push(place(Math.cos(ang) * 42, 0.34, Math.sin(ang) * 42, 0));
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
  const _sSuv = new THREE.Vector3(1.06, 1.22, 1.08);
  const UP = new THREE.Vector3(0, 1, 0);

  function updateGroup(arr, time, meshA, meshB, meshC, allowSuv = false) {
    if (!meshA) return;
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      let t = (c.t0 + c.dir * c.speedT * time) % 1;
      if (t < 0) t += 1;
      const x = c.x0 + c.dx * t;
      const z = c.z0 + c.dz * t;
      _q2.setFromAxisAngle(UP, c.yaw);
      _m2.compose(_p2.set(x, c.y, z), _q2, allowSuv && c.suv ? _sSuv : _s2);
      meshA.setMatrixAt(i, _m2);
      if (meshB) meshB.setMatrixAt(i, _m2);
      if (meshC) meshC.setMatrixAt(i, _m2);
    }
    meshA.instanceMatrix.needsUpdate = true;
    if (meshB) meshB.instanceMatrix.needsUpdate = true;
    if (meshC) meshC.instanceMatrix.needsUpdate = true;
  }

  function updateCars(time) {
    updateGroup(sedans, time, carBody, carHeads, carTails, true);
    updateGroup(taxis, time, taxiBody, taxiHeads, taxiTails, false);
    updateGroup(buses, time, busBody, busStripe, busGlass, false);
  }
  updateCars(0);

  return {
    group,
    carCount: sedans.length + taxis.length + buses.length,
    update(_dt, time) {
      updateCars(time);
    },
  };
}
