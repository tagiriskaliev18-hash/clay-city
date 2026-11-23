// ============================================================
// ASTANA 2077 — киберпанк-слой:
//   - 8 колоссальных мегабашен (380–620 м) с экзоскелетами, светящимися
//     пилонами, оконными лентами, скайбриджами, турбинами и helipads
//   - пул чётких неоновых вывесок (кириллица + казахский) на мегабашнях и зданиях
//   - гигантские анимированные голограммы (Байтерек, Хан Шатыр, Нур Алем, Нуржол)
//   - ★ QazaqGaz HQ Hero Cyber Treatment: LED-рёбра точно по контуру здания,
//     3D-голограмма QAZAQGAZ + пламя + орбитальные кольца, 2 прожектора вверх
//   - объёмные прожекторы (конусы вверх в небо!), стимпанк-трубы, баки, провода
// ВСЁ скрыто при cyberMode = false, появляется по клавише F.
// ============================================================
import * as THREE from "three";
import { rng, between, place, merge } from "./geom.js";
import { REG } from "./materials.js";
import { U } from "./env.js";
import { LANDMARKS } from "./config.js";

function buildInstanced(parent, geo, mat, matrices, { cast = false, receive = false, name = "" } = {}) {
  if (!matrices.length) return null;
  const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
  for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i]);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = cast; mesh.receiveShadow = receive;
  mesh.frustumCulled = false;
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

// ---------- MEGA-TOWER GEOMETRY (детерминированная + экзоскелет + турбины) ----------
function buildMegaTowerParts(r, w, d, h, sections, ribCount) {
  const hullGeos = [];
  const accentGeos = [];
  let y = 0;
  const weights = [];
  let wSum = 0;
  for (let s = 0; s < sections; s++) {
    const wt = (sections - s * 0.45) * (0.85 + r() * 0.3);
    weights.push(wt);
    wSum += wt;
  }
  for (let s = 0; s < sections; s++) {
    const sH = (weights[s] / wSum) * h;
    const stepback = 1 - s * 0.085;
    const sw = w * stepback, sd = d * stepback;

    // Основной ступенчатый блок
    hullGeos.push(new THREE.BoxGeometry(sw, sH, sd).translate(0, y + sH / 2, 0));

    // Диагональные контрфорсы / экзоскелет на углах
    if (s < sections - 1 && ribCount > 0) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const rib = new THREE.BoxGeometry(3.4, sH * 0.92, 3.4);
          rib.rotateY(Math.PI / 4);
          rib.translate(sx * (sw * 0.5 + 1.1), y + sH * 0.5, sz * (sd * 0.5 + 1.1));
          hullGeos.push(rib);
          // Вертикальная светящаяся неоновая полоса на пилоне
          accentGeos.push(
            new THREE.BoxGeometry(0.9, sH * 0.88, 0.9)
              .translate(sx * (sw * 0.5 + 2.4), y + sH * 0.5, sz * (sd * 0.5 + 2.4))
          );
        }
      }
    }

    // Горизонтальные светящиеся технические ярусы (как в Найт-Сити)
    if (s > 0) {
      accentGeos.push(new THREE.BoxGeometry(sw + 4.5, 1.4, 0.9).translate(0, y + 0.8, sd * 0.5 + 0.5));
      accentGeos.push(new THREE.BoxGeometry(sw + 4.5, 1.4, 0.9).translate(0, y + 0.8, -sd * 0.5 - 0.5));
      accentGeos.push(new THREE.BoxGeometry(0.9, 1.4, sd + 4.5).translate(sw * 0.5 + 0.5, y + 0.8, 0));
      accentGeos.push(new THREE.BoxGeometry(0.9, 1.4, sd + 4.5).translate(-sw * 0.5 - 0.5, y + 0.8, 0));
    }

    // Оконные светящиеся пояса на секции
    const bandCount = Math.max(2, Math.floor(sH / 24));
    for (let b = 1; b <= bandCount; b++) {
      if (r() < 0.35) continue;
      const by = y + (b / (bandCount + 1)) * sH;
      const bw = sw * (0.45 + r() * 0.38);
      const bd = sd * (0.45 + r() * 0.38);
      accentGeos.push(new THREE.BoxGeometry(bw, 1.1, 0.5).translate(0, by, sd * 0.5 + 0.35));
      accentGeos.push(new THREE.BoxGeometry(bw, 1.1, 0.5).translate(0, by, -sd * 0.5 - 0.35));
      accentGeos.push(new THREE.BoxGeometry(0.5, 1.1, bd).translate(sw * 0.5 + 0.35, by, 0));
      accentGeos.push(new THREE.BoxGeometry(0.5, 1.1, bd).translate(-sw * 0.5 - 0.35, by, 0));
    }

    y += sH;
  }

  // Крышная градирня/турбина + helipad
  const topW = w * (1 - (sections - 1) * 0.085);
  hullGeos.push(new THREE.CylinderGeometry(topW * 0.16, topW * 0.21, h * 0.055, 12).translate(-topW * 0.2, y + h * 0.027, 0));
  hullGeos.push(new THREE.CylinderGeometry(topW * 0.24, topW * 0.24, 1.8, 16).translate(topW * 0.16, y + 0.9, 0));
  accentGeos.push(new THREE.TorusGeometry(topW * 0.21, 0.55, 6, 20).rotateX(Math.PI / 2).translate(topW * 0.16, y + 2.0, 0));

  return { hull: merge(hullGeos), accent: merge(accentGeos), topY: y };
}

// ---------- NEON SIGN CANVAS ----------
const CYBER_BRANDS = [
  "АСТАНА 2077", "QAZAQ·CORP", "НУРЖОЛ", "БАЙТЕРЕК·НЕТ",
  "НЕОН·БАЗАР", "КИБЕР·ГАЗ", "STEPPE·TECH", "МЕГА·СЕКТОР 01",
  "СТЕПЬ·БАНК", "КИБЕР·БАЗАР", "НУРЖОЛ·SYS", "QAZAQ·NET",
  "БАЙТ·КОРП", "АСТАНА·LINK", "СТЕПЬ·CORP", "НЕЙРО·СИТИ",
];

function neonSignTexture(text, { w = 512, h = 160, color = "#00F5FF", vertical = false, bg = "rgba(6,8,14,0.92)", emblem = false } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);

  // Внешняя и внутренняя неоновая рамка
  g.strokeStyle = color; g.lineWidth = 4;
  g.shadowColor = color; g.shadowBlur = 14;
  g.strokeRect(6, 6, w - 12, h - 12);
  g.shadowBlur = 0;

  // Угловые акценты
  g.fillStyle = color;
  g.fillRect(6, 6, 22, 6); g.fillRect(w - 28, 6, 22, 6);
  g.fillRect(6, h - 12, 22, 6); g.fillRect(w - 28, h - 12, 22, 6);

  // Векторный знак газового пламени для QAZAQGAZ голограммы
  let textOffsetX = 0;
  if (emblem && !vertical) {
    const cx = 64, cy = h / 2, rad = h * 0.30;
    g.save();
    g.shadowColor = "#00F5FF"; g.shadowBlur = 16;
    g.beginPath();
    g.moveTo(cx, cy - rad);
    g.bezierCurveTo(cx + rad * 0.85, cy - rad * 0.2, cx + rad * 0.72, cy + rad * 0.85, cx, cy + rad);
    g.bezierCurveTo(cx - rad * 0.72, cy + rad * 0.85, cx - rad * 0.85, cy - rad * 0.2, cx, cy - rad);
    g.fillStyle = "#00F5FF";
    g.fill();
    g.beginPath();
    g.moveTo(cx, cy - rad * 0.35);
    g.bezierCurveTo(cx + rad * 0.36, cy + rad * 0.05, cx + rad * 0.28, cy + rad * 0.65, cx, cy + rad * 0.76);
    g.bezierCurveTo(cx - rad * 0.28, cy + rad * 0.65, cx - rad * 0.36, cy + rad * 0.05, cx, cy - rad * 0.35);
    g.fillStyle = "#ffffff";
    g.fill();
    g.restore();
    textOffsetX = 36;
  }

  g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = color; g.shadowBlur = 12;
  if (vertical) {
    const chars = text.replace(/·/g, "").split("");
    const fs = Math.min(Math.floor(w * 0.56), Math.floor((h - 36) / Math.max(1, chars.length)));
    g.font = `800 ${fs}px "Segoe UI", Arial, sans-serif`;
    const lineH = (h - 24) / chars.length;
    chars.forEach((ch, i) => g.fillText(ch, w / 2, 12 + lineH * (i + 0.5)));
  } else {
    let fs = Math.floor(h * 0.50);
    g.font = `800 ${fs}px "Segoe UI", Arial, sans-serif`;
    const maxW = w - 44 - textOffsetX * 2;
    while (g.measureText(text).width > maxW && fs > 18) {
      fs -= 4;
      g.font = `800 ${fs}px "Segoe UI", Arial, sans-serif`;
    }
    g.fillText(text, w / 2 + textOffsetX, h / 2 + 2);
  }
  g.shadowBlur = 0;

  // Тонкие scanlines
  g.fillStyle = "rgba(0,0,0,0.16)";
  for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// ---------- HOLOGRAM SHADER MATERIAL ----------
function holoMaterial(colA = [0.05, 0.92, 1.0], colB = [1.0, 0.16, 0.72]) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: {
      uTime: U.uTime, uNight: U.uNight, uCyber: U.uCyber,
      uColA: { value: new THREE.Color(colA[0], colA[1], colA[2]) },
      uColB: { value: new THREE.Color(colB[0], colB[1], colB[2]) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime, uNight, uCyber;
      uniform vec3 uColA, uColB;
      varying vec2 vUv;
      void main() {
        float scan = 0.45 + 0.55 * sin(vUv.y * 110.0 - uTime * 5.0);
        float band = smoothstep(0.0, 0.16, vUv.y) * (1.0 - smoothstep(0.84, 1.0, vUv.y));
        float grid = step(0.93, fract(vUv.x * 18.0)) * 0.55;
        vec3 col = mix(uColA, uColB, 0.5 + 0.5 * sin(vUv.x * 6.283 + uTime * 0.7));
        float alpha = uCyber * (0.08 + uNight * 0.24) * band * (scan * 0.65 + grid);
        gl_FragColor = vec4(col * (0.95 + uNight * 0.65), alpha);
      }`,
  });
}

// ---------- VOLUMETRIC SPOTLIGHT (конус ВВЕРХ от крыши y=0 → y=beamH!) ----------
function volumetricBeamMat(beamH = 600, rgb = [0.55, 0.88, 1.0]) {
  return new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      uNight: U.uNight, uCyber: U.uCyber,
      uBeamH: { value: beamH },
      uRgb: { value: new THREE.Color(rgb[0], rgb[1], rgb[2]) },
    },
    vertexShader: `
      uniform float uBeamH;
      varying float vY; varying vec3 vN; varying vec3 vW;
      void main() {
        vY = clamp(position.y / uBeamH, 0.0, 1.0);
        vN = normalize(normalMatrix * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uNight, uCyber; uniform vec3 uRgb;
      varying float vY; varying vec3 vN; varying vec3 vW;
      void main() {
        vec3 V = normalize(cameraPosition - vW);
        float edge = pow(abs(dot(V, normalize(vN))), 1.4);
        float fade = smoothstep(0.0, 0.04, vY) * pow(1.0 - vY, 1.75);
        float a = edge * fade * 0.24 * uNight * uCyber;
        gl_FragColor = vec4(uRgb * a * 2.4, a);
      }`,
  });
}

export function buildCyberpunk(scene, M, _ctx, buildings = []) {
  const group = new THREE.Group();
  group.name = "cyberpunk-layer";
  group.visible = false; // скрыт при старте (чистая реальная Астана!)
  scene.add(group);
  const r = rng(90210);

  // ========== 1. КОЛОССАЛЬНЫЕ МЕГАБАШНИ (8 штук по периметру Астаны, 380–620 м) ==========
  // Расположены так, чтобы формировать грандиозный кибер-каньон, НЕ перекрывая Байтерек, Акорду, QazaqGaz
  const megaTowers = [
    { x: -1200, z: -420, w: 86, d: 76, h: 520, sections: 6, ribs: 4, col: 0x00F5FF },
    { x: -1120, z: +480, w: 72, d: 66, h: 460, sections: 5, ribs: 3, col: 0xFF2A85 },
    { x: +1340, z: -380, w: 92, d: 80, h: 600, sections: 7, ribs: 4, col: 0x00F5FF },
    { x: +1280, z: +420, w: 76, d: 70, h: 490, sections: 5, ribs: 3, col: 0x7B2FF7 },
    { x: -620,  z: -780, w: 68, d: 62, h: 430, sections: 5, ribs: 3, col: 0xFFB347 },
    { x: +580,  z: -740, w: 82, d: 74, h: 550, sections: 6, ribs: 4, col: 0x00F5FF },
    { x: -520,  z: +880, w: 72, d: 66, h: 410, sections: 4, ribs: 3, col: 0xFF2A85 },
    { x: +920,  z: +790, w: 86, d: 80, h: 620, sections: 7, ribs: 4, col: 0x7B2FF7 },
  ];

  const megaMat = M.std({ color: 0x161a24, roughness: 0.44, metalness: 0.78, envMapIntensity: 1.1 });
  const megaAccentMats = new Map();
  const getAccentMat = (hex) => {
    if (!megaAccentMats.has(hex)) megaAccentMats.set(hex, M.neon(hex, 4.4, 0.0));
    return megaAccentMats.get(hex);
  };

  for (const mt of megaTowers) {
    const parts = buildMegaTowerParts(r, mt.w, mt.d, mt.h, mt.sections, mt.ribs);
    mt.topY = parts.topY;

    const mesh = new THREE.Mesh(parts.hull, megaMat);
    mesh.position.set(mt.x, 0, mt.z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.name = `mega-tower-${mt.x}`;
    group.add(mesh);

    const acc = new THREE.Mesh(parts.accent, getAccentMat(mt.col));
    acc.position.set(mt.x, 0, mt.z);
    group.add(acc);
  }

  // Скайбриджи между соседними мегабашнями
  const bridgeMat = M.std({ color: 0x242834, roughness: 0.48, metalness: 0.75 });
  const bridgePairs = [[0, 4], [2, 5], [3, 7], [1, 6]];
  for (const [i, j] of bridgePairs) {
    const a = megaTowers[i], b = megaTowers[j];
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const bridgeH = Math.min(a.h, b.h) * 0.62;
    const angle = Math.atan2(b.z - a.z, b.x - a.x);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(dist, 6.5, 11), bridgeMat);
    bridge.position.set((a.x + b.x) / 2, bridgeH, (a.z + b.z) / 2);
    bridge.rotation.y = -angle;
    group.add(bridge);
    // Неоновая полоса вдоль скайбриджа
    const rail = new THREE.Mesh(new THREE.BoxGeometry(dist, 1.1, 11.8), getAccentMat(a.col));
    rail.position.set((a.x + b.x) / 2, bridgeH - 2.6, (a.z + b.z) / 2);
    rail.rotation.y = -angle;
    group.add(rail);
  }

  // ========== 2. ПУЛ НЕОНОВЫХ ВЫВЕСОК И БИЛЛБОРДОВ (общие материалы — высокий FPS!) ==========
  const signColors = ["#00F5FF", "#FF2A85", "#FFB347", "#9E62FF", "#4DFF99", "#FF6B6B", "#62B8FF", "#FF5EE0"];
  const hSignPool = [];
  const vSignPool = [];
  for (let i = 0; i < 12; i++) {
    const text = CYBER_BRANDS[i % CYBER_BRANDS.length];
    const color = signColors[i % signColors.length];
    const hTex = neonSignTexture(text, { w: 512, h: 160, color });
    const hMat = new THREE.MeshBasicMaterial({ map: hTex, side: THREE.DoubleSide, transparent: true });
    REG.basic.push({ m: hMat, rgb: new THREE.Color(0xffffff), k: 1.9, day: 0.0 });
    hSignPool.push(hMat);

    const vText = CYBER_BRANDS[(i + 5) % CYBER_BRANDS.length];
    const vCol = signColors[(i + 3) % signColors.length];
    const vTex = neonSignTexture(vText, { w: 160, h: 512, color: vCol, vertical: true });
    const vMat = new THREE.MeshBasicMaterial({ map: vTex, side: THREE.DoubleSide, transparent: true });
    REG.basic.push({ m: vMat, rgb: new THREE.Color(0xffffff), k: 1.9, day: 0.0 });
    vSignPool.push(vMat);
  }
  const sharedPlane = new THREE.PlaneGeometry(1, 1);

  // Крупные вывески на мегабашнях (со всех сторон, смотрят в центр города)
  for (const mt of megaTowers) {
    const toCenterYaw = Math.atan2(-mt.x, -mt.z);
    for (let s = 0; s < 3; s++) {
      const mat = hSignPool[Math.floor(r() * hSignPool.length)];
      const signW = between(r, 42, 68), signH = signW * 0.31;
      const signY = mt.h * (0.28 + s * 0.24);
      const offset = Math.max(mt.w, mt.d) * 0.56;
      const signMesh = new THREE.Mesh(sharedPlane, mat);
      signMesh.scale.set(signW, signH, 1);
      signMesh.position.set(
        mt.x + Math.sin(toCenterYaw) * offset,
        signY,
        mt.z + Math.cos(toCenterYaw) * offset
      );
      signMesh.rotation.y = toCenterYaw;
      group.add(signMesh);
    }
    // Вертикальные японско-киберпанковые плашки сбоку мегабашен
    for (const side of [-1, 1]) {
      const mat = vSignPool[Math.floor(r() * vSignPool.length)];
      const signH = between(r, 75, 130), signW = signH * 0.26;
      const sideYaw = toCenterYaw + side * (Math.PI / 2);
      const offset = Math.max(mt.w, mt.d) * 0.54;
      const signMesh = new THREE.Mesh(sharedPlane, mat);
      signMesh.scale.set(signW, signH, 1);
      signMesh.position.set(
        mt.x + Math.sin(sideYaw) * offset,
        mt.h * 0.48,
        mt.z + Math.cos(sideYaw) * offset
      );
      signMesh.rotation.y = sideYaw;
      group.add(signMesh);
    }
  }

  // Неоновые контуры и вывески на зданиях кварталов Астаны
  if (buildings && buildings.length) {
    const neonMats = [0x00f5ff, 0xff2a85, 0xffb347].map((c) => M.neon(c, 4.6, 0.0));
    const neonBuckets = [[], [], []];
    const hSignMats = Array.from({ length: hSignPool.length }, () => []);
    const vSignMats = Array.from({ length: vSignPool.length }, () => []);

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (b.h < 22 || b.kind === "suburbVilla") continue;
      const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
      const localToWorld = (lx, ly, lz) => [b.x + lx * c + lz * s, b.y + ly, b.z - lx * s + lz * c];

      // Неоновые контуры на крышах высоток
      if (b.h > 36 && r() < 0.72) {
        const ci = Math.floor(r() * 3);
        const topY = b.h * 0.96;
        const pF = localToWorld(0, topY, b.d * 0.52);
        const pB = localToWorld(0, topY, -b.d * 0.52);
        neonBuckets[ci].push(place(pF[0], pF[1], pF[2], b.yaw, b.w * 0.78, 0.55, 0.45));
        neonBuckets[ci].push(place(pB[0], pB[1], pB[2], b.yaw, b.w * 0.78, 0.55, 0.45));
      }

      // Горизонтальные вывески на крышах и фасадах
      if (b.h > 24 && r() < 0.36) {
        const pi = Math.floor(r() * hSignPool.length);
        const sw = Math.min(b.w * 0.78, 18), sh = sw * 0.31;
        const p = localToWorld(0, b.h * 0.98 + sh * 0.55, b.d * 0.42);
        hSignMats[pi].push(place(p[0], p[1], p[2], b.yaw, sw, sh, 1));
      }

      // Вертикальные вывески на башнях
      if (b.h > 48 && r() < 0.30) {
        const pi = Math.floor(r() * vSignPool.length);
        const sh = Math.min(b.h * 0.46, 26), sw = sh * 0.28;
        const side = r() < 0.5 ? 1 : -1;
        const p = localToWorld(side * (b.w * 0.53 + 0.5), b.h * 0.62, 0);
        vSignMats[pi].push(place(p[0], p[1], p[2], b.yaw + side * Math.PI / 2, sw, sh, 1));
      }
    }

    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    neonBuckets.forEach((arr, i) => { if (arr.length) buildInstanced(group, unitBox, neonMats[i], arr, { name: `neon-${i}` }); });
    hSignMats.forEach((arr, i) => { if (arr.length) buildInstanced(group, sharedPlane, hSignPool[i], arr, { name: `hsign-${i}` }); });
    vSignMats.forEach((arr, i) => { if (arr.length) buildInstanced(group, sharedPlane, vSignPool[i], arr, { name: `vsign-${i}` }); });
  }

  // ========== 3. ГИГАНТСКИЕ ГОЛОГРАММЫ (scanline GLSL) ==========
  const holoMat = holoMaterial([0.10, 0.95, 1.0], [1.0, 0.22, 0.80]);
  const goldHoloMat = holoMaterial([1.0, 0.78, 0.25], [0.0, 0.96, 1.0]);
  const holoMeshes = [];

  // Голографические орбитальные кольца вокруг золотого шара Байтерека (реальный центр y = 92!)
  // Шар остаётся открытым и золотым внутри — орбитальные кольца мягко обрамляют его снаружи!
  const baytOrbY = 92;
  for (let i = 0; i < 3; i++) {
    const radius = 16.5 + i * 6.5;
    const geo = new THREE.TorusGeometry(radius, 0.55, 10, 56);
    const mesh = new THREE.Mesh(geo, i === 0 ? goldHoloMat : holoMat);
    mesh.position.set(0, baytOrbY + (i - 1) * 3.5, 0);
    mesh.rotation.x = Math.PI / 2 + (i - 1) * 0.28;
    mesh.userData.phase = i * 2.09;
    mesh.userData.tiltZ = (i - 1) * 0.20;
    mesh.userData.orbitRing = true;
    holoMeshes.push(mesh);
    group.add(mesh);
  }

  // Голограмма над Хан Шатыром (-940, 0)
  {
    const geo = new THREE.CylinderGeometry(52, 52, 68, 28, 1, true);
    const mesh = new THREE.Mesh(geo, holoMat);
    mesh.position.set(-940, 195, 0);
    mesh.userData.phase = 1.5;
    holoMeshes.push(mesh);
    group.add(mesh);
  }

  // Голограмма над Нур Алем (90, 100, 960)
  {
    const geo = new THREE.CylinderGeometry(44, 44, 56, 28, 1, true);
    const mesh = new THREE.Mesh(geo, holoMat);
    mesh.position.set(90, 158, 960);
    mesh.userData.phase = 3.1;
    holoMeshes.push(mesh);
    group.add(mesh);
  }

  // Вертикальные голо-колонны вдоль бульвара Нуржол (вне пути Байтерека и Дома Министерств)
  const holoColCoords = [
    [-440, 44], [-290, -44], [-145, 44], [140, -44], [475, 44],
  ];
  holoColCoords.forEach(([hx, hz], i) => {
    const geo = new THREE.CylinderGeometry(6.5, 6.5, 165, 18, 1, true);
    const mesh = new THREE.Mesh(geo, holoMat);
    mesh.position.set(hx, 88, hz);
    mesh.userData.phase = i * 1.26;
    holoMeshes.push(mesh);
    group.add(mesh);
  });

  // ========== 4. ★ QAZAQGAZ HERO CYBER TREATMENT (ПРИОРИТЕТ #1!) ★ ==========
  // Точные координаты и габариты из signature.js:
  // Центр (235, 155), центральный корпус ±15.8 × ±25.4 до y=86, боковые крылья ±26 × ±21.9 до y=72.6
  const QG = LANDMARKS.qazaqGaz || { x: 235, z: 155, h: 86 };

  // 4а. Прецизионная LED-подсветка по рёбрам и уступам здания QazaqGaz (без сплошных плит и перекрытия вывесок!)
  const qLedCyan = M.neon(0x00F5FF, 7.2, 0.0);
  const qLedBlue = M.neon(0x1E90FF, 6.5, 0.0);
  const qCyanMats = [];
  const qBlueMats = [];

  // 4 вертикальных ребра центральной башни (до y = 86.2)
  for (const [dx, dz] of [[16.4, 25.6], [-16.4, 25.6], [16.4, -25.6], [-16.4, -25.6]]) {
    qCyanMats.push(place(QG.x + dx, 50.0, QG.z + dz, 0, 0.48, 72.5, 0.48));
  }
  // 4 вертикальных ребра боковых крыльев (до y = 72.8)
  for (const [dx, dz] of [[26.3, 22.0], [-26.3, 22.0], [26.3, -22.0], [-26.3, -22.0]]) {
    qBlueMats.push(place(QG.x + dx, 43.2, QG.z + dz, 0, 0.44, 59.2, 0.44));
  }
  // Тонкий световой периметр верхней короны (y = 86.3, НЕ закрывает вывески на y = 83.2!)
  qCyanMats.push(place(QG.x, 86.3, QG.z + 25.7, 0, 33.4, 0.55, 0.55));
  qCyanMats.push(place(QG.x, 86.3, QG.z - 25.7, 0, 33.4, 0.55, 0.55));
  qCyanMats.push(place(QG.x + 16.5, 86.3, QG.z, 0, 0.55, 0.55, 51.8));
  qCyanMats.push(place(QG.x - 16.5, 86.3, QG.z, 0, 0.55, 0.55, 51.8));
  // Тонкий периметр крыльев (y = 72.8)
  qBlueMats.push(place(QG.x, 72.8, QG.z + 22.1, 0, 53.0, 0.46, 0.46));
  qBlueMats.push(place(QG.x, 72.8, QG.z - 22.1, 0, 53.0, 0.46, 0.46));
  qBlueMats.push(place(QG.x + 26.3, 72.8, QG.z, 0, 0.46, 0.46, 44.6));
  qBlueMats.push(place(QG.x - 26.3, 72.8, QG.z, 0, 0.46, 0.46, 44.6));
  // Световая окантовка козырька стилобата (y = 14.5)
  qCyanMats.push(place(QG.x, 14.5, QG.z + 32.8, 0, 26.0, 0.35, 0.35));
  qCyanMats.push(place(QG.x, 14.5, QG.z - 32.8, 0, 26.0, 0.35, 0.35));

  const unitBox2 = new THREE.BoxGeometry(1, 1, 1);
  buildInstanced(group, unitBox2, qLedCyan, qCyanMats, { name: "qazaqgaz-led-cyan" });
  buildInstanced(group, unitBox2, qLedBlue, qBlueMats, { name: "qazaqgaz-led-blue" });

  // 4б. Гигантская 3D-голограмма «QAZAQGAZ» с вращающимся газовым пламенем над крышей!
  {
    const qHoloMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uTime: U.uTime, uCyber: U.uCyber },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime, uCyber; varying vec2 vUv;
        void main() {
          float scan = 0.62 + 0.38 * sin(vUv.y * 64.0 - uTime * 4.5);
          float band = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
          float flame = 0.5 + 0.5 * sin(vUv.x * 12.566 + uTime * 2.4 + vUv.y * 6.0);
          float tip = 1.0 - smoothstep(0.25, 0.95, vUv.y);
          vec3 col = mix(vec3(0.06, 0.52, 1.0), vec3(0.0, 0.96, 1.0), flame * 0.7 + tip * 0.3);
          float alpha = uCyber * 0.62 * band * scan;
          gl_FragColor = vec4(col * 2.2, alpha);
        }`,
    });

    // Две вращающиеся голографические орбиты над крышей (компактные, целиком в кадре!)
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(16 + i * 6.5, 0.62, 10, 48), qHoloMat);
      ring.position.set(QG.x, QG.h + 14 + i * 11, QG.z);
      ring.rotation.x = Math.PI / 2 + (i === 0 ? 0.22 : -0.24);
      ring.userData.phase = i * 3.14;
      ring.userData.orbitRing = true;
      ring.userData.tiltZ = i === 0 ? 0.14 : -0.16;
      holoMeshes.push(ring);
      group.add(ring);
    }

    // Коническое голографическое «газовое пламя» (сужается вверх как настоящее пламя!)
    const flameGeo = new THREE.CylinderGeometry(2.0, 11.5, 32, 24, 1, true);
    const flameMesh = new THREE.Mesh(flameGeo, qHoloMat);
    flameMesh.position.set(QG.x, QG.h + 23, QG.z);
    flameMesh.userData.phase = 0;
    holoMeshes.push(flameMesh);
    group.add(flameMesh);

    // 4 ЧЁТКИЕ неоновые голографические вывески «QAZAQGAZ» по периметру (без Z-fighting!)
    const qTex = neonSignTexture("QAZAQGAZ", {
      w: 768, h: 160, color: "#00F5FF", bg: "rgba(4,16,32,0.82)", emblem: true,
    });
    const qSignMat = new THREE.MeshBasicMaterial({
      map: qTex, side: THREE.FrontSide, transparent: true, opacity: 0.96,
      depthWrite: false,
    });
    REG.basic.push({ m: qSignMat, rgb: new THREE.Color(0xffffff), k: 1.95, day: 0.0 });

    const holoBannerGroup = new THREE.Group();
    holoBannerGroup.position.set(QG.x, QG.h + 28, QG.z);
    const bannerR = 18.5;
    const bannerSides = [
      { x: 0, z: +bannerR, rotY: 0 },
      { x: 0, z: -bannerR, rotY: Math.PI },
      { x: -bannerR, z: 0, rotY: -Math.PI / 2 },
      { x: +bannerR, z: 0, rotY: Math.PI / 2 },
    ];
    for (const bs of bannerSides) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(32, 6.8), qSignMat);
      m.position.set(bs.x, 0, bs.z);
      m.rotation.y = bs.rotY;
      holoBannerGroup.add(m);
    }
    holoBannerGroup.userData.phase = 0;
    holoBannerGroup.userData.slowSpin = true;
    holoMeshes.push(holoBannerGroup);
    group.add(holoBannerGroup);
  }

  // ========== 5. VOLUMETRIC ПРОЖЕКТОРЫ С КРЫШ (ЛУЧ ВВЕРХ В НОЧНОЕ НЕБО!) ==========
  // Узкий конец (r = 1.8) внизу на крыше y = 0, широкий (r = 42) наверху в небе y = 600!
  const megaBeamGeo = new THREE.CylinderGeometry(42, 1.8, 600, 18, 1, true).translate(0, 300, 0);
  const megaBeamMat = volumetricBeamMat(600, [0.58, 0.84, 1.0]);
  const qgBeamGeo = new THREE.CylinderGeometry(28, 1.2, 460, 16, 1, true).translate(0, 230, 0);
  const qgBeamMat = volumetricBeamMat(460, [0.05, 0.94, 1.0]);
  const beams = [];

  // Прожекторы с мегабашен
  for (const mt of megaTowers.slice(0, 5)) {
    const beam = new THREE.Mesh(megaBeamGeo, megaBeamMat);
    beam.position.set(mt.x, mt.topY || mt.h, mt.z);
    beam.userData.phase = r() * 6.28;
    beam.userData.sweepSpeed = 0.14 + r() * 0.14;
    beam.renderOrder = 6;
    beams.push(beam);
    group.add(beam);
  }

  // 2 фирменных бирюзово-циановых прожектора с крыши QazaqGaz HQ!
  for (let i = 0; i < 2; i++) {
    const beam = new THREE.Mesh(qgBeamGeo, qgBeamMat);
    beam.position.set(QG.x + (i === 0 ? -13.5 : 13.5), QG.h + 0.5, QG.z + (i === 0 ? -18 : 18));
    beam.userData.phase = i * 3.14 + 0.4;
    beam.userData.sweepSpeed = 0.22;
    beam.userData.baseTiltX = i === 0 ? -0.14 : 0.14;
    beam.renderOrder = 6;
    beams.push(beam);
    group.add(beam);
  }

  // ========== 6. СТИМПАНК-ДЕТАЛИ НА МЕГАБАШНЯХ ==========
  const pipeMats = [], tankMats2 = [];
  for (const mt of megaTowers) {
    for (let p = 0; p < 4; p++) {
      pipeMats.push(place(
        mt.x + between(r, -mt.w * 0.42, mt.w * 0.42),
        mt.h * (0.24 + p * 0.18),
        mt.z + mt.d * 0.51,
        0, 0.85, mt.h * 0.18, 0.85
      ));
    }
    tankMats2.push(place(mt.x - mt.w * 0.18, (mt.topY || mt.h) + 6, mt.z + mt.d * 0.12, 0, between(r, 4, 7), between(r, 6, 11), between(r, 4, 7)));
  }
  if (pipeMats.length) buildInstanced(group, new THREE.CylinderGeometry(0.5, 0.5, 1, 8), M.copper, pipeMats, { name: "mega-pipes" });
  if (tankMats2.length) buildInstanced(group, new THREE.CylinderGeometry(1, 1, 1, 10), M.brass, tankMats2, { name: "mega-tanks" });

  // Антенные шпили с красными авиационными маячками
  const antMats = [], beaconMats = [];
  for (const mt of megaTowers) {
    const ty = mt.topY || mt.h;
    const ah = between(r, 28, 52);
    antMats.push(place(mt.x, ty + ah / 2, mt.z, 0, 1.8, ah, 1.8));
    beaconMats.push(place(mt.x, ty + ah + 1.2, mt.z, 0, 1.8, 1.8, 1.8));
  }
  if (antMats.length) buildInstanced(group, new THREE.CylinderGeometry(0.12, 0.35, 1, 6), M.darkMetal, antMats, { name: "mega-antennas" });
  if (beaconMats.length) buildInstanced(group, new THREE.SphereGeometry(0.75, 8, 6), M.glow(0xff2a1a, 7), beaconMats, { name: "mega-beacons" });

  // Провисающие силовые провода между парами мегабашен
  const wireGeos = [];
  for (const [i, j] of bridgePairs) {
    const a = megaTowers[i], b = megaTowers[j];
    const dist = Math.hypot(a.x - b.x, a.z - b.z);
    for (const level of [0.46, 0.74]) {
      const wireH = Math.min(a.h, b.h) * level;
      const pts = [];
      const sag = dist * 0.055;
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        pts.push(new THREE.Vector3(
          a.x + (b.x - a.x) * t,
          wireH - Math.sin(t * Math.PI) * sag,
          a.z + (b.z - a.z) * t
        ));
      }
      wireGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.35, 5, false));
    }
  }
  if (wireGeos.length) {
    const wires = new THREE.Mesh(merge(wireGeos), M.darkMetal);
    wires.name = "mega-wires";
    group.add(wires);
  }

  // ========== 7. ВЕНТИЛЯЦИОННЫЕ РЕШЁТКИ НА МЕГАБАШНЯХ (для пара и дыма) ==========
  const ventPositions = [];
  for (const mt of megaTowers) {
    ventPositions.push({ pos: new THREE.Vector3(mt.x, mt.topY || mt.h, mt.z), type: "steam" });
    ventPositions.push({ pos: new THREE.Vector3(mt.x + mt.w * 0.3, mt.h * 0.72, mt.z), type: "smoke" });
  }

  return {
    group,
    megaTowers,
    ventPositions,
    setCyber(on) {
      group.visible = on;
    },
    update(_dt, time) {
      if (!group.visible) return;
      for (const m of holoMeshes) {
        if (m.userData.orbitRing) {
          m.rotation.z = (m.userData.tiltZ || 0) + Math.sin(time * 0.4 + (m.userData.phase || 0)) * 0.14;
          m.rotation.y = time * 0.45 + (m.userData.phase || 0);
        } else if (m.userData.slowSpin) {
          m.rotation.y = time * 0.18;
        } else {
          m.rotation.y = time * 0.32 + (m.userData.phase || 0);
        }
      }
      for (const b of beams) {
        const sweep = Math.sin(time * (b.userData.sweepSpeed || 0.2) + (b.userData.phase || 0));
        b.rotation.x = (b.userData.baseTiltX || 0) + sweep * 0.18;
        b.rotation.z = Math.cos(time * 0.17 + (b.userData.phase || 0)) * 0.16;
      }
    },
  };
}
