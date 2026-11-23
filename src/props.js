// ============================================================
// ASTANA REAL v5 — props.js
// Наземный движущийся трафик (420+ авто на проспектах и мостах):
//   - Реальные Draco GLB модели (car_sedan.glb, car_suv.glb, bus_astana.glb)
//     с фарами и стоп-огнями, выровненные по полосам и земле (Box3)
//   - Жёлтые городские такси с плафоном
//   - Архитектурные пешеходные болларды у QazaqGaz и Байтерека
// ============================================================
import * as THREE from "three";
import { ROADS, LANDMARKS } from "./config.js";
import { rng, between, place, merge } from "./geom.js";
import { loadModelParts } from "./models.js";

function bollardPostGeo() {
  const base = new THREE.CylinderGeometry(0.14, 0.17, 0.14, 8).translate(0, 0.07, 0);
  const body = new THREE.CylinderGeometry(0.10, 0.11, 0.78, 8).translate(0, 0.52, 0);
  const cap = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 8).translate(0, 1.04, 0);
  return merge([base, body, cap]);
}

export async function buildProps(scene, M, _ctx) {
  const group = new THREE.Group();
  group.name = "street-props";
  scene.add(group);
  const r = rng(42077);

  const [sedanModel, suvModel, busModel] = await Promise.all([
    loadModelParts("./assets/models/car_sedan.glb", { rotateY: Math.PI, groundY: true }),
    loadModelParts("./assets/models/car_suv.glb", { rotateY: Math.PI, groundY: true }),
    loadModelParts("./assets/models/bus_astana.glb", { rotateY: Math.PI, groundY: true }),
  ]);

  const sedans = [], suvs = [], buses = [], taxis = [];
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

    // Плотный живой городской поток + равномерное движение по КАД и вылетным трассам
    const stepM = road.outer ? 135 : (road.type === "bridge" ? 36 : 54);
    const countPerSide = Math.max(3, Math.round(len / stepM));

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
        const isSuv = !isBus && !isTaxi && r() < 0.35;
        const speedMps = isBus ? between(r, 9.5, 13.0) : between(r, 12.0, 20.5) + laneIdx * 1.8;

        const item = {
          x0: road.x0 + offX,
          z0: road.z0 + offZ,
          dx, dz, len, y: deckY, dir, yaw,
          t0: baseT,
          speedT: speedMps / len,
          color: carPalette[Math.floor(r() * carPalette.length)],
        };
        if (isBus) buses.push(item);
        else if (isTaxi) taxis.push(item);
        else if (isSuv) suvs.push(item);
        else sedans.push(item);
      }
    }
  }

  const headMat = M.neon(0xf4f9ff, 5.2, 0.25);
  const tailMat = M.neon(0xff2218, 4.8, 0.22);
  const taxiCapMat = M.neon(0xffd24c, 3.6, 0.45);
  const tmpCol = new THREE.Color();

  function buildVehicleBatch(model, items, { paintColors = null, fixedPaint = null, addTaxiCap = false } = {}) {
    if (!items.length) return [];
    const meshes = [];
    for (const part of model.parts) {
      let mat;
      if (part.name === "Headlight") {
        mat = headMat;
      } else if (part.name === "Taillight") {
        mat = tailMat;
      } else {
        mat = part.material.clone();
        if (part.name === "CarPaint") {
          if (fixedPaint != null) mat.color.setHex(fixedPaint);
          else if (paintColors) mat.color.setHex(0xffffff);
          mat.metalness = fixedPaint === 0xf2f6fa ? 0.45 : 0.72;
          mat.roughness = 0.20;
        } else if (part.name === "CarGlass") {
          mat.roughness = 0.05;
          mat.metalness = 0.35;
        }
        M.setup(mat);
      }
      const inst = new THREE.InstancedMesh(part.geometry, mat, items.length);
      if (part.name === "CarPaint" && paintColors) {
        items.forEach((c, i) => inst.setColorAt(i, tmpCol.setHex(c.color)));
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      }
      inst.castShadow = part.name === "CarPaint";
      inst.receiveShadow = true;
      inst.frustumCulled = false;
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(inst);
      meshes.push(inst);
    }
    if (addTaxiCap) {
      const capY = model.size.y + 0.06;
      const capGeo = new THREE.BoxGeometry(0.50, 0.16, 0.26).translate(0, capY, 0.05);
      const capInst = new THREE.InstancedMesh(capGeo, taxiCapMat, items.length);
      capInst.frustumCulled = false;
      capInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(capInst);
      meshes.push(capInst);
    }
    return meshes;
  }

  const sedanMeshes = buildVehicleBatch(sedanModel, sedans, { paintColors: true });
  const suvMeshes   = buildVehicleBatch(suvModel, suvs, { paintColors: true });
  const taxiMeshes  = buildVehicleBatch(sedanModel, taxis, { fixedPaint: 0xf4bc1c, addTaxiCap: true });
  const busMeshes   = buildVehicleBatch(busModel, buses, { fixedPaint: 0xf2f6fa });

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
  const UP = new THREE.Vector3(0, 1, 0);

  function updateGroup(arr, time, meshes) {
    if (!meshes.length) return;
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      let t = (c.t0 + c.dir * c.speedT * time) % 1;
      if (t < 0) t += 1;
      const x = c.x0 + c.dx * t;
      const z = c.z0 + c.dz * t;
      _q2.setFromAxisAngle(UP, c.yaw);
      _m2.compose(_p2.set(x, c.y, z), _q2, _s2);
      for (let k = 0; k < meshes.length; k++) meshes[k].setMatrixAt(i, _m2);
    }
    for (let k = 0; k < meshes.length; k++) meshes[k].instanceMatrix.needsUpdate = true;
  }

  function updateCars(time) {
    updateGroup(sedans, time, sedanMeshes);
    updateGroup(suvs, time, suvMeshes);
    updateGroup(taxis, time, taxiMeshes);
    updateGroup(buses, time, busMeshes);
  }
  updateCars(0);

  return {
    group,
    carCount: sedans.length + suvs.length + taxis.length + buses.length,
    update(_dt, time) {
      updateCars(time);
    },
  };
}
