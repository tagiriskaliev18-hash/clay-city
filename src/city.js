// ============================================================
// ASTANA REAL v2 — city.js
// Реальная Астана: городская подложка + парковые зоны,
// река Есиль (волновой шейдер + отражение неба/кибер-неона) с
// гранитными набережными, проспекты с мокрым асфальтом и разметкой,
// Водно-Зелёный бульвар Нуржол (террасы, фонтаны, галереи, аллеи),
// 3 реальных моста через Есиль (вкл. бионический мост «Атырау»!).
// ============================================================
import * as THREE from "three";
import { WORLD, ROADS } from "./config.js";
import { U } from "./env.js";
import { GB, revolve, tube, merge, place } from "./geom.js";

/** Масштабирует UV плоскости в метры, чтобы PBR-текстуры тайлились в реальном масштабе. */
function meterPlane(w, d, segW = 1, segD = 1) {
  const g = new THREE.PlaneGeometry(w, d, segW, segD);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
  }
  uv.needsUpdate = true;
  return g;
}

export function buildCity(scene, M, _ctx) {
  const group = new THREE.Group();
  group.name = "city";
  scene.add(group);

  const RX = WORLD.riverX;   // 780
  const RW = WORLD.riverW;   // 155
  const RL = 8800;           // река Есиль протянута до ±4400 м к горизонту

  /** Плавный изгиб русла Есиля за пределами КАД (|z| <= 1650 прямо для всех мостов). */
  const riverCenterX = (z) => {
    const az = Math.abs(z);
    if (az <= 1650) return RX;
    const t = Math.min(1, (az - 1650) / 2750);
    return RX + Math.sin(t * Math.PI * 1.15) * 340 * Math.sign(z);
  };

  /** Проверка близости к вылетным и объездным трассам (для выравнивания рельефа и посадок). */
  const onOuterRoadCorridor = (x, z, pad = 34) => {
    if (Math.abs(z + 1240) < pad && x > -1420 && x < 1760) return true;
    if (Math.abs(z - 1460) < pad && x > -1420 && x < 1760) return true;
    if (Math.abs(x + 1380) < pad && z > -1280 && z < 1500) return true;
    if (Math.abs(x - 1720) < pad && z > -1280 && z < 1500) return true;
    if (Math.abs(x - 90) < pad && z > 1060) return true;
    if (Math.abs(x + 760) < pad && z < -840) return true;
    if (Math.abs(z) < pad && x < -920) return true;
    if (Math.abs(z - 280) < pad && x > 1460) return true;
    return false;
  };

  /** Рельеф Казахской степи вокруг города (под руслом Есиля всегда -1.55 м, пологие холмы 4..56 м к горизонту). */
  const steppeHeightAt = (x, z) => {
    const rcx = riverCenterX(z);
    const rDist = Math.abs(x - rcx);
    if (rDist < 84) return -1.55;
    const bankSlope = THREE.MathUtils.smoothstep(rDist, 84, 130);

    const ux = Math.max(0, Math.abs(x - 170) - 1560);
    const uz = Math.max(0, Math.abs(z - 110) - 1400);
    const cityDist = Math.hypot(ux, uz);
    const hillMask = THREE.MathUtils.smoothstep(cityDist, 40, 520);
    if (hillMask <= 0.001) return THREE.MathUtils.lerp(-1.55, -0.08, bankSlope);

    const riverMask = THREE.MathUtils.smoothstep(rDist, 88, 280);
    let h = (
      Math.sin(x * 0.00145 + z * 0.0009) * 14.0 +
      Math.cos(x * 0.0023 - z * 0.0019) * 9.5 +
      Math.sin(x * 0.00072 - z * 0.0011) * 18.5 +
      20.0
    );
    h = Math.max(1.2, h) * hillMask * riverMask;
    if (onOuterRoadCorridor(x, z, 42)) {
      const roadFlat = onOuterRoadCorridor(x, z, 22) ? 0.0 : 0.35;
      h *= roadFlat;
    }
    return THREE.MathUtils.lerp(-1.55, h - 0.14, bankSlope);
  };

  // ── 1. ГОРОДСКАЯ ПОДЛОЖКА (Левый и Правый берег раздельно от русла Есиля!) + КАЗАХСКАЯ СТЕПЬ ──
  {
    const westGround = meterPlane(2143, 2920, 1, 1);
    westGround.translate(-369, -0.05, 110);
    const eastGround = meterPlane(923, 2920, 1, 1);
    eastGround.translate(1319, -0.05, 110);
    const ground = new THREE.Mesh(merge([westGround, eastGround]), M.groundUrban);
    ground.receiveShadow = true;
    ground.name = "ground-urban";
    group.add(ground);

    // Холмистая степь вокруг всей столицы до радиуса ~5800 м (никакой серой пустоты!)
    const stSize = 11600;
    const stGeo = new THREE.PlaneGeometry(stSize, stSize, 136, 136);
    stGeo.rotateX(-Math.PI / 2);
    const posAttr = stGeo.attributes.position;
    const colArr = new Float32Array(posAttr.count * 3);
    const cDry = new THREE.Color(0x6d7649);
    const cLush = new THREE.Color(0x52653b);
    const cCrest = new THREE.Color(0x868a59);
    const cBank = new THREE.Color(0x565441);
    const tmpC = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = steppeHeightAt(vx, vz);
      posAttr.setY(i, vy);

      const n = 0.5 + 0.5 * Math.sin(vx * 0.0038 + Math.cos(vz * 0.0031) * 2.2);
      const rDist = Math.abs(vx - riverCenterX(vz));
      tmpC.copy(cDry).lerp(cLush, n * 0.72);
      if (vy > 18) tmpC.lerp(cCrest, Math.min(0.65, (vy - 18) / 36));
      if (rDist < 190) tmpC.lerp(cBank, 1.0 - rDist / 190);
      colArr[i * 3] = tmpC.r;
      colArr[i * 3 + 1] = tmpC.g;
      colArr[i * 3 + 2] = tmpC.b;
    }
    stGeo.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
    stGeo.computeVertexNormals();
    const steppeMat = M.std({ vertexColors: true, roughness: 0.95, metalness: 0.0, envMapIntensity: 0.34 });
    const steppeMesh = new THREE.Mesh(stGeo, steppeMat);
    steppeMesh.receiveShadow = true;
    steppeMesh.name = "steppe-horizon";
    group.add(steppeMesh);

    // «Зелёный пояс Астаны» — 2,600 батченных деревьев лесополос вокруг города (1250..3600 м)
    const beltConifer = [];
    const beltBirch = [];
    const rngBelt = (() => {
      let s = 918273;
      return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    })();
    for (let i = 0; i < 4200 && beltConifer.length + beltBirch.length < 2600; i++) {
      const ang = rngBelt() * Math.PI * 2;
      const rad = 1320 + rngBelt() * 2350;
      const tx = 160 + Math.cos(ang) * rad * 1.12;
      const tz = 110 + Math.sin(ang) * rad * 0.96;
      if (Math.abs(tx - 170) < 1500 && Math.abs(tz - 110) < 1340) continue;
      if (Math.abs(tx - riverCenterX(tz)) < 135) continue;
      if (onOuterRoadCorridor(tx, tz, 36)) continue;
      // Кластеризация лесополос (реалистичные массивы зелёного пояса вместо шума)
      const groveNoise = Math.sin(tx * 0.0028) * Math.cos(tz * 0.0026) + 0.45 * Math.sin((tx + tz) * 0.005);
      if (groveNoise < -0.15) continue;
      const ty = steppeHeightAt(tx, tz);
      if (ty < -0.5) continue;
      const sc = 0.85 + rngBelt() * 0.75;
      const mat4 = place(tx, ty - 0.15, tz, rngBelt() * Math.PI * 2, sc);
      if (rngBelt() < 0.62) beltConifer.push(mat4);
      else beltBirch.push(mat4);
    }
    if (beltConifer.length) {
      const conGeo = merge([
        new THREE.ConeGeometry(3.4, 11.5, 6).translate(0, 7.6, 0),
        new THREE.ConeGeometry(2.4, 7.5, 6).translate(0, 12.2, 0),
        new THREE.CylinderGeometry(0.45, 0.65, 2.4, 5).translate(0, 1.2, 0),
      ]);
      const conMesh = new THREE.InstancedMesh(conGeo, M.std({ color: 0x3b5d34, roughness: 0.90, metalness: 0.0 }), beltConifer.length);
      beltConifer.forEach((m, i) => conMesh.setMatrixAt(i, m));
      conMesh.receiveShadow = true;
      conMesh.name = "green-belt-conifers";
      group.add(conMesh);
    }
    if (beltBirch.length) {
      const birGeo = merge([
        new THREE.IcosahedronGeometry(3.4, 1).scale(1.0, 1.18, 1.0).translate(0, 7.2, 0),
        new THREE.CylinderGeometry(0.35, 0.55, 3.6, 5).translate(0, 1.8, 0),
      ]);
      const birMesh = new THREE.InstancedMesh(birGeo, M.std({ color: 0x5c7c3e, roughness: 0.88, metalness: 0.0 }), beltBirch.length);
      beltBirch.forEach((m, i) => birMesh.setMatrixAt(i, m));
      birMesh.receiveShadow = true;
      birMesh.name = "green-belt-birches";
      group.add(birMesh);
    }

    // Пригородные кварталы, малоэтажные посёлки и дальние силуэты башен за КАД (1420..3350 м)
    const subMats = [];
    const subCols = [];
    const subColPalette = [0xd8d0c4, 0xc9b49c, 0xa8b4c0, 0xc29e88, 0xe0dcd2, 0x8d99a6, 0x7a8592];
    for (let i = 0; i < 1100 && subMats.length < 440; i++) {
      const ang = rngBelt() * Math.PI * 2;
      const rad = 1480 + rngBelt() * 1950;
      const bx = 160 + Math.cos(ang) * rad * 1.10;
      const bz = 110 + Math.sin(ang) * rad * 0.98;
      if (Math.abs(bx - 170) < 1520 && Math.abs(bz - 110) < 1360) continue;
      if (Math.abs(bx - riverCenterX(bz)) < 155) continue;
      if (onOuterRoadCorridor(bx, bz, 48)) continue;
      const nearHwy = onOuterRoadCorridor(bx, bz, 260);
      if (!nearHwy && rngBelt() < 0.45) continue;
      const isClusterHigh = nearHwy && rad < 2500 && rngBelt() < 0.24;
      const w = isClusterHigh ? 22 + rngBelt() * 20 : 14 + rngBelt() * 18;
      const d = isClusterHigh ? 20 + rngBelt() * 18 : 12 + rngBelt() * 16;
      const h = isClusterHigh ? 38 + rngBelt() * 72 : 9 + rngBelt() * 20;
      const by = steppeHeightAt(bx, bz);
      if (by < -0.5) continue;
      const m4 = new THREE.Matrix4().compose(
        new THREE.Vector3(bx, by - 0.6, bz),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.floor(rngBelt() * 4) * (Math.PI / 2)),
        new THREE.Vector3(w, h, d)
      );
      subMats.push(m4);
      subCols.push(subColPalette[i % subColPalette.length]);
    }
    if (subMats.length) {
      const bodyGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
      const roofGeo = new THREE.BoxGeometry(1.02, 0.04, 1.02).translate(0, 1.0, 0);
      const subBody = new THREE.InstancedMesh(bodyGeo, M.stoneRibbon, subMats.length);
      const subRoof = new THREE.InstancedMesh(roofGeo, M.roof, subMats.length);
      const cc = new THREE.Color();
      subMats.forEach((m, i) => {
        subBody.setMatrixAt(i, m);
        subRoof.setMatrixAt(i, m);
        subBody.setColorAt(i, cc.setHex(subCols[i]));
      });
      if (subBody.instanceColor) subBody.instanceColor.needsUpdate = true;
      subBody.castShadow = subBody.receiveShadow = true;
      subBody.name = "suburban-horizon-buildings";
      group.add(subBody, subRoof);
    }

    // Парковые зелёные зоны реальной Астаны (y = 0.01, polygonOffset)
    const parkSpecs = [
      // Президентский парк (Правый берег: вокруг Пирамиды, Мечети, Музея)
      { x: 1120, z: 0,    w: 440, d: 780 },
      // Парк Влюблённых (у Хан Шатыра, западный конец оси)
      { x: -1020, z: 0,   w: 220, d: 340 },
      // Набережные парки вдоль левого берега Есиля
      { x: 645, z: -460,  w: 110, d: 520 },
      { x: 645, z: +460,  w: 110, d: 520 },
      // Линейный парк южнее Акорды и парка EXPO
      { x: 90,  z: 960,   w: 360, d: 280 },
      // Сквер у Триумфальной арки
      { x: 90,  z: 640,   w: 160, d: 120 },
      // Зелёный бульвар вокруг Ботанического сада и Highvill Park
      { x: -420, z: 650,  w: 380, d: 200 },
      // Сквер у QazaqGaz (ухоженный газон по бокам, не перекрывая парковку!)
      { x: 235, z: 125,   w: 128, d: 52 },
    ];
    const parkGeos = [];
    for (const pk of parkSpecs) {
      const g = meterPlane(pk.w, pk.d, 1, 1);
      g.translate(pk.x, 0.01, pk.z);
      parkGeos.push(g);
    }
    const parks = new THREE.Mesh(merge(parkGeos), M.grass);
    parks.receiveShadow = true;
    parks.name = "astana-parks";
    group.add(parks);
  }

  // ── 2. РЕКА ЕСИЛЬ (до ±4400 м, плавный изгиб к горизонту + водный шейдер + набережные) ──
  const waterGeo = meterPlane(RW, RL, 24, 180);
  {
    const wp = waterGeo.attributes.position;
    for (let i = 0; i < wp.count; i++) {
      const z = wp.getZ(i);
      wp.setX(i, wp.getX(i) + riverCenterX(z) - RX);
    }
    waterGeo.computeVertexNormals();
  }
  const waterMat = M.phys({
    color: 0x16425b,
    roughness: 0.09,
    metalness: 0.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    reflectivity: 1.0,
    envMapIntensity: 1.85,
    transparent: true,
    opacity: 0.90,
  }, {
    key: "river-esil-water",
    patch: (sh) => {
      sh.uniforms.uTime = U.uTime;
      sh.uniforms.uNight = U.uNight;
      sh.uniforms.uCyber = U.uCyber;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", `#include <common>
          uniform float uTime;
          varying vec3 vWaterW;`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          float w1 = sin(position.x * 0.055 + uTime * 0.95) * 0.22;
          float w2 = sin(position.z * 0.040 + uTime * 0.72) * 0.18;
          float w3 = sin((position.x * 0.09 - position.z * 0.07) + uTime * 1.45) * 0.09;
          transformed.y += w1 + w2 + w3;`)
        .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
          vWaterW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>
          uniform float uTime; uniform float uNight; uniform float uCyber;
          varying vec3 vWaterW;`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          float rip = 0.5 + 0.5 * sin(vWaterW.z * 0.18 + uTime * 2.2 + sin(vWaterW.x * 0.12) * 2.0);
          float band = smoothstep(0.55, 0.96, rip);
          vec3 nightSheen = vec3(0.05, 0.12, 0.22) * uNight * (0.4 + 0.6 * rip);
          vec3 cyberGlow = mix(vec3(0.0, 0.75, 0.95), vec3(0.85, 0.16, 0.65), 0.5 + 0.5 * sin(vWaterW.z * 0.015 + uTime * 0.4));
          totalEmissiveRadiance += nightSheen + cyberGlow * band * uCyber * 0.42;`);
    },
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(RX, -0.35, 0);
  water.receiveShadow = true;
  water.name = "river-esil";
  group.add(water);

  // Тёмное русло реки под водой вдоль всего изгиба
  const bedGeo = meterPlane(RW + 24, RL, 4, 180);
  {
    const bp = bedGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      bp.setX(i, bp.getX(i) + riverCenterX(bp.getZ(i)));
    }
    bedGeo.computeVertexNormals();
  }
  const riverBed = new THREE.Mesh(bedGeo, M.std({ color: 0x0b1c2a, roughness: 0.98, metalness: 0 }));
  riverBed.position.y = -1.65;
  group.add(riverBed);

  // Двухъярусные гранитные набережные Есиля (в черте города) + дальние огни береговой линии
  const cityRiverLen = 2460;
  {
    const granGeos = [], lightGeos = [];
    for (const side of [-1, 1]) {
      const edgeX = RX + side * (RW / 2);
      const B = new GB();
      B.box(edgeX + side * 3.5, 0.4, 0, 7, 2.2, cityRiverLen, 0);
      B.box(edgeX + side * 11.5, 1.5, 0, 9, 3.2, cityRiverLen, 0);
      granGeos.push(B.build());

      const BP = new GB();
      BP.box(edgeX + side * 7.4, 3.55, 0, 0.75, 0.95, cityRiverLen, 0);
      for (let z = -cityRiverLen / 2 + 20; z < cityRiverLen / 2 - 20; z += 28) {
        BP.box(edgeX + side * 7.4, 3.85, z, 1.35, 1.45, 1.35, 0);
      }
      lightGeos.push(BP.build());
    }
    const q1 = new THREE.Mesh(merge(granGeos), M.granite);
    q1.castShadow = true; q1.receiveShadow = true;
    const q2 = new THREE.Mesh(merge(lightGeos), M.graniteLight);
    q2.castShadow = true; q2.receiveShadow = true;
    group.add(q1, q2);

    // Огни береговой линии далеко за городом (от ±1260 до ±3800 м)
    const bankLampMats = [];
    for (let z = 1280; z <= 3800; z += 95) {
      for (const sgn of [-1, 1]) {
        const rz = sgn * z;
        const rcx = riverCenterX(rz);
        for (const side of [-1, 1]) {
          const lx = rcx + side * (RW * 0.5 + 10);
          bankLampMats.push(place(lx, Math.max(0.2, steppeHeightAt(lx, rz)), rz, 0));
        }
      }
    }
    if (bankLampMats.length) {
      const bPoles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.20, 6.8, 5).translate(0, 3.4, 0), M.darkMetal, bankLampMats.length);
      const bHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 6, 5).translate(0, 7.0, 0), M.glow(0xffd28a, 5.2), bankLampMats.length);
      bankLampMats.forEach((m, i) => { bPoles.setMatrixAt(i, m); bHeads.setMatrixAt(i, m); });
      bPoles.frustumCulled = bHeads.frustumCulled = false;
      group.add(bPoles, bHeads);
    }
  }

  // ── 3. ПРОСПЕКТЫ (мокрый асфальт + разметка + гранитные тротуары) ──
  const roadGeos = [];
  const curbGeos = [];
  const markGeos = [];
  const markMat = M.std({ color: 0xeaece8, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const roadData = [];

  for (const rd of ROADS) {
    if (rd.type === "boulevard" || rd.type === "bridge") continue;
    const dx = rd.x1 - rd.x0, dz = rd.z1 - rd.z0;
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    const cx = (rd.x0 + rd.x1) / 2, cz = (rd.z0 + rd.z1) / 2;

    // Асфальтовое полотно
    const B = new GB();
    B.box(cx, 0.06, cz, rd.width, 0.12, len, ang);
    roadGeos.push(B.build());

    // Гранитные тротуары и бордюры по краям
    const cos = Math.cos(ang), sin = Math.sin(ang);
    for (const side of [-1, 1]) {
      const sw = 3.2;
      const offset = (rd.width / 2 + sw / 2) * side;
      const tx = cx + cos * offset;
      const tz = cz - sin * offset;
      const BT = new GB();
      BT.box(tx, 0.14, tz, sw, 0.24, len, ang);
      curbGeos.push(BT.build());
    }

    // Двойная сплошная + пунктирная разметка полос
    if (rd.lanes > 0) {
      const BC = new GB();
      // Центральная двойная сплошная
      for (const s of [-0.22, 0.22]) {
        BC.box(cx + cos * s, 0.135, cz - sin * s, 0.14, 0.02, len, ang);
      }
      // Краевые сплошные
      for (const side of [-1, 1]) {
        const off = (rd.width / 2 - 0.65) * side;
        BC.box(cx + cos * off, 0.135, cz - sin * off, 0.14, 0.02, len, ang);
      }
      markGeos.push(BC.build());

      // Пунктир между полосами
      if (rd.lanes >= 2) {
        const laneW = (rd.width - 2) / (rd.lanes * 2);
        const nMarks = Math.floor(len / 14);
        const BD = new GB();
        for (let lane = 1; lane < rd.lanes; lane++) {
          for (const side of [-1, 1]) {
            const off = side * lane * laneW;
            for (let i = 0; i < nMarks; i++) {
              const t = (i + 0.5) / nMarks;
              const mx = rd.x0 + dx * t + cos * off;
              const mz = rd.z0 + dz * t - sin * off;
              BD.box(mx, 0.135, mz, 0.13, 0.02, 5.2, ang);
            }
          }
        }
        markGeos.push(BD.build());
      }
    }

    roadData.push({ cx, cz, width: rd.width, len, ang, type: rd.type, lanes: rd.lanes });
  }

  if (roadGeos.length) {
    const roads = new THREE.Mesh(merge(roadGeos), M.asphalt);
    roads.receiveShadow = true;
    roads.name = "roads";
    group.add(roads);
  }
  if (curbGeos.length) {
    const curbs = new THREE.Mesh(merge(curbGeos), M.graniteLight);
    curbs.receiveShadow = true;
    curbs.name = "sidewalks";
    group.add(curbs);
  }
  if (markGeos.length) {
    const marks = new THREE.Mesh(merge(markGeos), markMat);
    marks.name = "road-markings";
    group.add(marks);
  }

  // ── 4. ВОДНО-ЗЕЛЁНЫЙ БУЛЬВАР НУРЖОЛ (террасы, фонтаны, крытые галереи, аллеи) ──
  const fountainCenters = [];
  {
    const granGeos = [], lightGeos = [], lawnGeos = [], fWaterGeos = [], steelGeos = [], glassGeos = [];
    // Сегменты бульвара (чисто разведены вокруг проспектов -760, -430, +90 и площадей)
    const segments = [
      { x0: -835, x1: -780 }, // Хан Шатыр → Туран
      { x0: -740, x1: -618 }, // Туран → Круглая площадь
      { x0: -502, x1: -450 }, // КМГ → Кабанбай
      { x0: -410, x1: -56  }, // Кабанбай → Байтерек (главная прогулочная зона!)
      { x0: +56,  x1: +70  }, // Байтерек → Мәңгілік Ел
      { x0: +110, x1: +510 }, // Мәңгілік Ел → Дом Министерств → Акорда
    ];

    for (const seg of segments) {
      const len = seg.x1 - seg.x0;
      const cx = (seg.x0 + seg.x1) / 2;

      // Нижняя гранитная терраса + центральный променад
      const BG = new GB();
      BG.box(cx, 0.16, 0, len, 0.32, 74, 0);
      granGeos.push(BG.build());

      const BL = new GB();
      BL.box(cx, 0.34, 0, len, 0.08, 26, 0);
      lightGeos.push(BL.build());

      // Газоны и цветники по обе стороны променада
      if (len > 28) {
        for (const lz of [-24, 24]) {
          const g = meterPlane(len - 6, 14, 1, 1);
          g.translate(cx, 0.36, lz);
          lawnGeos.push(g);
        }
      }

      // Поющие фонтаны с бирюзовой водой на длинных участках
      if (len >= 90) {
        const count = Math.floor(len / 85);
        for (let i = 0; i < count; i++) {
          const fx = seg.x0 + ((i + 0.5) / count) * len;
          const FB = new GB();
          revolve(FB, [[0, 0.34], [8.5, 0.34], [9.2, 0.95], [8.4, 0.95], [8.0, 0.52], [0, 0.52]], 20, { smooth: false });
          lightGeos.push(FB.build().translate(fx, 0, 0));
          // Водное зеркало бассейна фонтана
          const fw = new THREE.CylinderGeometry(7.9, 7.9, 0.08, 20).translate(fx, 0.82, 0);
          fWaterGeos.push(fw);
          fountainCenters.push({ x: fx, y: 0.84, z: 0, r: 6.2, h: 7.2 });
        }
      }

      // Знаменитые крытые стеклянные галереи Водно-Зелёного бульвара (на центральном отрезке)
      if (seg.x0 === -410 || seg.x0 === 110) {
        const gLen = Math.min(len - 40, 260);
        for (const gz of [-34, 34]) {
          const BS = new GB();
          BS.box(cx, 5.2, gz, gLen, 0.45, 7.5, 0);
          for (let px = cx - gLen / 2 + 8; px <= cx + gLen / 2 - 8; px += 18) {
            BS.box(px, 2.6, gz - 3.2, 0.45, 5.0, 0.45, 0);
            BS.box(px, 2.6, gz + 3.2, 0.45, 5.0, 0.45, 0);
          }
          steelGeos.push(BS.build());
          const BGl = new GB();
          BGl.box(cx, 5.55, gz, gLen - 2, 0.18, 7.8, 0);
          glassGeos.push(BGl.build());
        }
      }
    }

    // Круглая площадь (Round Square, x=-560, z=0) — гранитный мощёный круг с фонтаном
    {
      const BR = new GB();
      revolve(BR, [[0, 0], [82, 0], [82, 0.32], [0, 0.32]], 48, { smooth: false });
      lightGeos.push(BR.build().translate(-560, 0, 0));
      const BF = new GB();
      revolve(BF, [[0, 0.32], [18, 0.32], [19, 1.1], [17.5, 1.1], [17, 0.55], [0, 0.55]], 32, { smooth: false });
      granGeos.push(BF.build().translate(-560, 0, 0));
      fWaterGeos.push(new THREE.CylinderGeometry(16.8, 16.8, 0.1, 32).translate(-560, 0.92, 0));
      fountainCenters.push({ x: -560, y: 0.96, z: 0, r: 12.0, h: 11.5 });
    }
    // Два парадных фонтана площади Акорды
    for (const fz of [-44, 44]) {
      const BAF = new GB();
      revolve(BAF, [[0, 0.02], [8.8, 0.02], [9.4, 0.72], [8.6, 0.72], [8.2, 0.30], [0, 0.30]], 20, { smooth: false });
      granGeos.push(BAF.build().translate(518, 0, fz));
      fWaterGeos.push(new THREE.CylinderGeometry(8.0, 8.0, 0.08, 20).translate(518, 0.62, fz));
      fountainCenters.push({ x: 518, y: 0.66, z: fz, r: 5.8, h: 8.2 });
    }

    const addM = (list, mat, cast = false) => {
      if (!list.length) return;
      const m = new THREE.Mesh(merge(list), mat);
      m.castShadow = cast; m.receiveShadow = true;
      group.add(m);
    };
    addM(granGeos, M.granite, false);
    addM(lightGeos, M.graniteLight, true);
    addM(lawnGeos, M.grass, false);
    addM(fWaterGeos, M.turquoise, false);
    addM(steelGeos, M.whitePaint, true);
    addM(glassGeos, M.glassClear, false);
  }

  // ── 4б. РЕАЛЬНЫЕ УЛИЧНЫЕ ФОНАРИ ВДОЛЬ ПРОСПЕКТОВ (3D-деревья строит streetlife.js) ──
  {
    const lampMatrices = [];
    for (const rd of ROADS) {
      if (rd.type === "bridge") continue;
      const dx = rd.x1 - rd.x0, dz = rd.z1 - rd.z0;
      const len = Math.hypot(dx, dz);
      const ang = Math.atan2(dx, dz);
      const cos = Math.cos(ang), sin = Math.sin(ang);
      const step = rd.type === "boulevard" ? 42 : 52;
      const count = Math.floor(len / step);
      for (let i = 1; i < count; i++) {
        const t = i / count;
        const bx = rd.x0 + dx * t, bz = rd.z0 + dz * t;
        // Пропуск у центральных перекрёстков и площадей
        if (Math.abs(bx) < 58 && Math.abs(bz) < 58) continue;
        if (Math.abs(bx + 560) < 92 && Math.abs(bz) < 92) continue;
        if (Math.abs(bx - 590) < 95 && Math.abs(bz) < 95) continue;
        if (Math.abs(bx - RX) < RW / 2 + 24) continue;
        // Пропуск у пересечений крупных проспектов
        if (rd.type !== "boulevard") {
          const isHoriz = Math.abs(dx) > Math.abs(dz);
          if (isHoriz && (Math.abs(bx + 760) < 20 || Math.abs(bx + 430) < 20 || Math.abs(bx - 90) < 20)) continue;
          if (!isHoriz && (Math.abs(bz - 82) < 18 || Math.abs(bz + 82) < 18 || Math.abs(bz - 280) < 18 || Math.abs(bz - 460) < 18 || Math.abs(bz - 760) < 18 || Math.abs(bz - 1080) < 18 || Math.abs(bz + 260) < 18)) continue;
        }
        const off = rd.type === "boulevard" ? 18 : rd.width / 2 + 2.2;
        for (const side of [-1, 1]) {
          const lx = bx + cos * off * side;
          const lz = bz - sin * off * side;
          lampMatrices.push(place(lx, 0.2, lz, ang - side * (Math.PI / 2)));
        }
      }
    }
    if (lampMatrices.length) {
      const stem = new THREE.CylinderGeometry(0.11, 0.17, 8.2, 6).translate(0, 4.1, 0);
      const arm = new THREE.BoxGeometry(0.14, 0.14, 2.0).translate(0, 8.1, 0.9);
      const base = new THREE.CylinderGeometry(0.32, 0.42, 0.7, 6).translate(0, 0.35, 0);
      const poles = new THREE.InstancedMesh(merge([stem, arm, base]), M.darkMetal, lampMatrices.length);
      const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.18, 0.88).translate(0, 7.98, 1.85), M.glow(0xffe0ad, 5.2), lampMatrices.length);
      lampMatrices.forEach((m, i) => { poles.setMatrixAt(i, m); heads.setMatrixAt(i, m); });
      poles.frustumCulled = heads.frustumCulled = false;
      group.add(poles, heads);
    }
  }

  // ── 5. ТРИ РЕАЛЬНЫХ МОСТА ЧЕРЕЗ РЕКУ ЕСИЛЬ ──
  const bridgeData = ROADS.filter((r) => r.type === "bridge");
  const bridgeGeos = { deck: [], road: [], white: [], steel: [], wood: [], neon: [] };

  for (const br of bridgeData) {
    const len = Math.abs(br.x1 - br.x0);
    const cx = (br.x0 + br.x1) / 2;
    const cz = br.z0;
    const w = br.width;

    if (br.style === "atyrau") {
      // ★ БИОНИЧЕСКИЙ ПЕШЕХОДНЫЙ МОСТ «АТЫРАУ» (знаменитый «рыбный» параметрический мост!) ★
      const deckY = 4.6;
      const BD = new GB();
      BD.box(cx, deckY - 0.65, cz, len, 1.3, w * 0.72, 0);
      bridgeGeos.white.push(BD.build());
      // Деревянный настил пешеходного моста
      const BW = new GB();
      BW.box(cx, deckY + 0.08, cz, len - 2, 0.16, w * 0.62, 0);
      bridgeGeos.wood.push(BW.build());
      // Береговые опоры
      for (const px of [0.16, 0.84]) {
        const BP = new GB();
        BP.box(br.x0 + len * px, 1.2, cz, 4.5, 7.5, w * 0.5, 0);
        bridgeGeos.deck.push(BP.build());
      }
      // 26 волнообразных параметрических белых рёбер-лепестков (силуэт осетра!)
      const nRibs = 26;
      const spineTop = [], spineL = [], spineR = [];
      for (let i = 0; i <= nRibs; i++) {
        const t = i / nRibs;
        const rx = br.x0 + len * t;
        // Волнообразная высота и ширина оболочки (максимум в центре, сужение к берегам)
        const env = Math.sin(t * Math.PI);
        const wave = 1.0 + 0.24 * Math.sin(t * Math.PI * 3.0);
        const archH = 5.0 + env * 13.5 * wave;
        const halfW = w * 0.36 + env * 4.2 * (1 + 0.2 * Math.cos(t * Math.PI * 2.0));
        const tilt = Math.sin(t * Math.PI * 2.0) * 2.2;
        const pts = [];
        for (let k = 0; k <= 12; k++) {
          const a = (k / 12) * Math.PI;
          const pz = cz - Math.cos(a) * halfW + tilt * Math.sin(a);
          const py = deckY + Math.sin(a) * archH;
          pts.push(new THREE.Vector3(rx, py, pz));
        }
        bridgeGeos.white.push(tube(pts, 0.28 + env * 0.18, 6));
        spineTop.push(pts[6]);
        spineL.push(pts[3]);
        spineR.push(pts[9]);
      }
      // Продольные стрингера бионической оболочки + ночная циановая подсветка
      bridgeGeos.white.push(tube(spineTop, 0.32, 6));
      bridgeGeos.white.push(tube(spineL, 0.22, 5));
      bridgeGeos.white.push(tube(spineR, 0.22, 5));
      bridgeGeos.neon.push(tube(spineTop.map((p) => new THREE.Vector3(p.x, p.y - 0.35, p.z)), 0.14, 4));
    } else if (br.style === "cable") {
      // ★ ГЛАВНЫЙ ЦЕРЕМОНИАЛЬНЫЙ ВАНТОВЫЙ МОСТ (ось Акорда — Пирамида, z=0) ★
      const deckY = 4.8;
      const BD = new GB();
      BD.box(cx, deckY - 1.0, cz, len, 2.0, w, 0);
      // Опоры в реке
      for (const px of [0.22, 0.5, 0.78]) {
        BD.box(br.x0 + len * px, 0.5, cz, 4.5, 9.5, w * 0.42, 0);
      }
      bridgeGeos.deck.push(BD.build());

      // Асфальтовое покрытие моста
      const BR = new GB();
      BR.box(cx, deckY + 0.06, cz, len, 0.12, w - 3.6, 0);
      bridgeGeos.road.push(BR.build());

      // Два стройных белых А-образных пилона высотой 56 м
      for (const sx of [-1, 1]) {
        const pylonX = cx + sx * 36;
        const pylonH = 56;
        for (const sz of [-1, 1]) {
          bridgeGeos.white.push(tube([
            new THREE.Vector3(pylonX, deckY - 1, cz + sz * (w * 0.52)),
            new THREE.Vector3(pylonX, pylonH, cz + sz * 1.4),
          ], 1.35, 8));
        }
        // Перемычки А-пилона
        const BC = new GB();
        BC.box(pylonX, pylonH - 2, cz, 2.8, 3.2, 5.5, 0);
        BC.box(pylonX, 28, cz, 2.0, 2.2, w * 0.62, 0);
        bridgeGeos.white.push(BC.build());

        // Двухсторонний веер вант
        for (let i = 1; i <= 8; i++) {
          const t = i / 9;
          for (const dir of [-1, 1]) {
            const cableX = pylonX + dir * t * 56;
            if (cableX < br.x0 + 4 || cableX > br.x1 - 4) continue;
            for (const sz of [-1, 1]) {
              bridgeGeos.steel.push(tube([
                new THREE.Vector3(pylonX, pylonH - 3 - i * 2.1, cz + sz * 1.6),
                new THREE.Vector3(cableX, deckY + 0.4, cz + sz * (w * 0.48)),
              ], 0.09, 4));
            }
          }
        }
        bridgeGeos.neon.push(new THREE.BoxGeometry(0.6, pylonH - 8, 0.6).translate(pylonX, pylonH / 2 + 4, cz));
      }
      // Перила главного моста
      for (const side of [-1, 1]) {
        const rz = cz + side * (w / 2 - 0.35);
        bridgeGeos.steel.push(new THREE.BoxGeometry(len, 0.16, 0.16).translate(cx, deckY + 1.15, rz));
        bridgeGeos.neon.push(new THREE.BoxGeometry(len, 0.12, 0.12).translate(cx, deckY - 0.25, rz));
      }
    } else {
      // ★ АРОЧНЫЙ МОСТ САРАЙШЫК (z = +280) ★
      const deckY = 4.6;
      const BD = new GB();
      BD.box(cx, deckY - 0.9, cz, len, 1.8, w, 0);
      for (const px of [0.22, 0.78]) {
        BD.box(br.x0 + len * px, 0.5, cz, 4.5, 9.0, w * 0.42, 0);
      }
      bridgeGeos.deck.push(BD.build());
      const BR = new GB();
      BR.box(cx, deckY + 0.06, cz, len, 0.12, w - 3.2, 0);
      bridgeGeos.road.push(BR.build());

      // Две параболические стальные арки + вертикальные подвесы
      for (const side of [-1, 1]) {
        const az = cz + side * (w * 0.48);
        const archPts = [];
        for (let i = 0; i <= 24; i++) {
          const t = i / 24;
          const ax = br.x0 + 18 + (len - 36) * t;
          const ay = deckY + Math.sin(t * Math.PI) * 24;
          archPts.push(new THREE.Vector3(ax, ay, az));
        }
        bridgeGeos.white.push(tube(archPts, 0.85, 8));
        for (let i = 2; i < 22; i += 2) {
          const p = archPts[i];
          bridgeGeos.steel.push(tube([p, new THREE.Vector3(p.x, deckY, az)], 0.11, 4));
        }
      }
    }
  }

  const addBatch = (list, mat, cast = true) => {
    if (!list.length) return;
    const m = new THREE.Mesh(merge(list), mat);
    m.castShadow = cast;
    m.receiveShadow = true;
    group.add(m);
  };
  addBatch(bridgeGeos.deck, M.granite, true);
  addBatch(bridgeGeos.road, M.asphalt, false);
  addBatch(bridgeGeos.white, M.whitePaint, true);
  addBatch(bridgeGeos.steel, M.steel, true);
  addBatch(bridgeGeos.wood, M.wood, false);
  addBatch(bridgeGeos.neon, M.neon(0x00f5ff, 4.2, 0.0), false);

  // ── 6. АНИМИРОВАННЫЕ СТРУИ ФОНТАНОВ НУРЖОЛА И ПЛОЩАДИ АКОРДЫ ──
  const jets = [];
  for (const fc of fountainCenters) {
    jets.push({ x: fc.x, y: fc.y, z: fc.z, baseH: fc.h, r: 0.42, tiltX: 0, tiltZ: 0, ph: fc.x * 0.07 });
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      const rad = fc.r * 0.55;
      jets.push({
        x: fc.x + Math.cos(ang) * rad,
        y: fc.y,
        z: fc.z + Math.sin(ang) * rad,
        baseH: fc.h * 0.58,
        r: 0.28,
        tiltX: -Math.sin(ang) * 0.22,
        tiltZ: Math.cos(ang) * 0.22,
        ph: ang + fc.x * 0.05,
      });
    }
  }
  const sprayMat = M.std({
    color: 0xe6f9ff,
    emissive: new THREE.Color(0x6ad8ff),
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });
  const jetMesh = jets.length
    ? new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 1.0, 1.0, 8, 1, true).translate(0, 0.5, 0), sprayMat, jets.length)
    : null;
  const rippleMesh = fountainCenters.length
    ? new THREE.InstancedMesh(new THREE.RingGeometry(0.4, 1.0, 20).rotateX(-Math.PI / 2), sprayMat, fountainCenters.length)
    : null;
  if (jetMesh) {
    jetMesh.frustumCulled = false;
    jetMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(jetMesh);
  }
  if (rippleMesh) {
    rippleMesh.frustumCulled = false;
    rippleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(rippleMesh);
  }
  const _fm = new THREE.Matrix4(), _fq = new THREE.Quaternion(), _fe = new THREE.Euler(), _fp = new THREE.Vector3(), _fs = new THREE.Vector3();

  return {
    group,
    waterMat,
    roadData,
    vents: [],
    update(_dt, time, _cam, cyberMix) {
      if (jetMesh) {
        for (let i = 0; i < jets.length; i++) {
          const j = jets[i];
          const pulse = 0.72 + 0.28 * Math.sin(time * 2.4 + j.ph) + 0.10 * Math.cos(time * 5.3 + j.ph * 2.0);
          const w = j.r * (0.85 + 0.22 * pulse);
          _fe.set(j.tiltX, 0, j.tiltZ);
          _fq.setFromEuler(_fe);
          _fm.compose(_fp.set(j.x, j.y, j.z), _fq, _fs.set(w, j.baseH * pulse, w));
          jetMesh.setMatrixAt(i, _fm);
        }
        jetMesh.instanceMatrix.needsUpdate = true;
      }
      if (rippleMesh) {
        _fq.identity();
        for (let i = 0; i < fountainCenters.length; i++) {
          const fc = fountainCenters[i];
          const rp = 1.0 + 0.85 * ((time * 0.65 + i * 0.27) % 1);
          const sc = fc.r * 0.52 * rp;
          _fm.compose(_fp.set(fc.x, fc.y + 0.03, fc.z), _fq, _fs.set(sc, 1, sc));
          rippleMesh.setMatrixAt(i, _fm);
        }
        rippleMesh.instanceMatrix.needsUpdate = true;
      }
      sprayMat.emissiveIntensity = 0.25 + U.uNight.value * 0.55 + (cyberMix || 0) * 0.75;
    },
  };
}
