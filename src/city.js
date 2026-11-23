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
import { leafSprite } from "./textures.js";

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

  const S = WORLD.size;
  const RX = WORLD.riverX;   // 780
  const RW = WORLD.riverW;   // 155
  const RL = 2400;           // протяжённость реки по Z

  // ── 1. ГОРОДСКАЯ ПОДЛОЖКА (без z-fighting, UV в метрах) ──
  {
    const groundGeo = meterPlane(S * 2.4, S * 2.4, 1, 1);
    const ground = new THREE.Mesh(groundGeo, M.groundUrban);
    ground.position.y = -0.06;
    ground.receiveShadow = true;
    ground.name = "ground-urban";
    group.add(ground);

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
      // Сквер у QazaqGaz (ухоженный газон вокруг стилобата)
      { x: 235, z: 155,   w: 118, d: 112 },
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

  // ── 2. РЕКА ЕСИЛЬ (анимированный водный шейдер + кибер-отражения + гранитные набережные) ──
  const waterGeo = meterPlane(RW, RL, 48, 96);
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

  // Тёмное русло реки под водой
  const riverBed = new THREE.Mesh(
    new THREE.BoxGeometry(RW + 12, 2.0, RL),
    M.std({ color: 0x0b1c2a, roughness: 0.98, metalness: 0 })
  );
  riverBed.position.set(RX, -1.65, 0);
  group.add(riverBed);

  // Двухъярусные гранитные набережные Есиля с променадом и парапетами
  {
    const granGeos = [], lightGeos = [];
    for (const side of [-1, 1]) {
      const edgeX = RX + side * (RW / 2);
      const B = new GB();
      // Нижняя прогулочная полка у воды
      B.box(edgeX + side * 3.5, 0.4, 0, 7, 2.2, RL, 0);
      // Основная набережная стена
      B.box(edgeX + side * 11.5, 1.5, 0, 9, 3.2, RL, 0);
      granGeos.push(B.build());

      // Светлый гранитный парапет + тумбы каждые 28 м
      const BP = new GB();
      BP.box(edgeX + side * 7.4, 3.55, 0, 0.75, 0.95, RL, 0);
      for (let z = -RL / 2 + 20; z < RL / 2 - 20; z += 28) {
        BP.box(edgeX + side * 7.4, 3.85, z, 1.35, 1.45, 1.35, 0);
      }
      lightGeos.push(BP.build());
    }
    const q1 = new THREE.Mesh(merge(granGeos), M.granite);
    q1.castShadow = true; q1.receiveShadow = true;
    const q2 = new THREE.Mesh(merge(lightGeos), M.graniteLight);
    q2.castShadow = true; q2.receiveShadow = true;
    group.add(q1, q2);
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

  // ── 4б. РЕАЛЬНЫЕ УЛИЧНЫЕ ФОНАРИ И АЛЛЕЙНЫЕ ДЕРЕВЬЯ ВДОЛЬ ПРОСПЕКТОВ ──
  {
    const lampMatrices = [];
    const treeMatrices = [];
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
        const off = rd.type === "boulevard" ? 18 : rd.width / 2 + 2.2;
        for (const side of [-1, 1]) {
          const lx = bx + cos * off * side;
          const lz = bz - sin * off * side;
          lampMatrices.push(place(lx, 0.2, lz, ang - side * (Math.PI / 2)));
        }
        if (rd.type === "boulevard") {
          for (const side of [-1, 1]) {
            const tx = bx + cos * 24 * side;
            const tz = bz - sin * 24 * side;
            const sc = 8.5 + ((i * 37) % 10) * 0.35;
            treeMatrices.push(place(tx, 0.32, tz, (i * 1.7) % 6.28, sc, sc * 1.08, sc));
          }
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
    if (treeMatrices.length) {
      const p1 = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
      const p2 = new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2).translate(0, 0.5, 0);
      const treeMat = M.std({ map: leafSprite(256, 23), alphaTest: 0.42, roughness: 0.88, metalness: 0, side: THREE.DoubleSide });
      const trees = new THREE.InstancedMesh(merge([p1, p2]), treeMat, treeMatrices.length);
      treeMatrices.forEach((m, i) => trees.setMatrixAt(i, m));
      trees.frustumCulled = false; trees.receiveShadow = true;
      group.add(trees);
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

  return {
    group,
    waterMat,
    roadData,
    vents: [],
    update(dt, time, _cam, cyberMix) {
      void dt; void time; void _cam; void cyberMix;
    },
  };
}
