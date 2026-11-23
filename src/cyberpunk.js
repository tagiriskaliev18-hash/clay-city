// ============================================================
// CLAY CITY v3 — киберпанк-стимпанк слой: неоновые контуры башен,
// вывески на русском/казахском, голограммы с развёрткой, стимпанк-баки,
// кондиционеры, антенны с маячками и воздушные кабели между зданиями.
// Всё собрано через InstancedMesh и merged-геометрию.
// ============================================================
import * as THREE from "three";
import { rng, between, pick, place, tube, merge } from "./geom.js";
import { signTexture, SIGN_WORDS } from "./textures.js";
import { REG } from "./materials.js";

const _m = new THREE.Matrix4();

function buildInstanced(scene, geo, mat, matrices, { cast = false, receive = false, name = "" } = {}) {
  if (!matrices.length) return null;
  const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
  for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i]);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.frustumCulled = false;
  if (name) mesh.name = name;
  scene.add(mesh);
  return mesh;
}

export function buildCyberpunk(scene, M, ctx, buildings = []) {
  const group = new THREE.Group();
  group.name = "cyberpunk-layer";
  scene.add(group);
  const r = rng(90210);

  if (!buildings || !buildings.length) return { group, update() {} };

  // ---------- 1. Неоновые полосы (карнизы и вертикальные линии на небоскрёбах) ----------
  const neonColors = [0x46f2ff, 0xff3dd8, 0xffb347];
  const neonMats = neonColors.map((c) => M.neon(c, 4.6, 0.04));
  const neonBuckets = [[], [], []];

  // ---------- 2. Стимпанк-крыши: баки, кондиционеры, антенны + маячки ----------
  const acMats = [], tankMats = [], antMats = [], beaconMats = [], pipeMats = [];

  // ---------- 3. Вывески (8 вариантов горизонтальных + 6 вертикальных) ----------
  const hPalette = ["#5cf0ff", "#ff5ee0", "#ffbe55", "#5dffb0", "#76b8ff", "#ff6b6b", "#5cf0ff", "#ffbe55"];
  const vPalette = ["#5cf0ff", "#ff5ee0", "#ffbe55", "#5dffb0", "#ff6b6b", "#76b8ff"];
  const hSignMats = hPalette.map((col, i) => {
    const tex = signTexture(SIGN_WORDS[i % SIGN_WORDS.length], { w: 512, h: 160, color: col, vertical: false });
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff, side: THREE.DoubleSide });
    REG.basic.push({ m: mat, rgb: new THREE.Color(0xffffff), k: 1.85, day: 0.35 });
    return mat;
  });
  const vSignMats = vPalette.map((col, i) => {
    const tex = signTexture(SIGN_WORDS[(i + 8) % SIGN_WORDS.length], { w: 160, h: 512, color: col, vertical: true });
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff, side: THREE.DoubleSide });
    REG.basic.push({ m: mat, rgb: new THREE.Color(0xffffff), k: 1.85, day: 0.35 });
    return mat;
  });
  const hSignBuckets = hSignMats.map(() => []);
  const vSignBuckets = vSignMats.map(() => []);

  // ---------- 4. Голограммы над ключевыми башнями ----------
  const holoSpots = [];

  // ---------- обход зданий ----------
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
    const localToWorld = (lx, ly, lz) => [b.x + lx * c + lz * s, b.y + ly, b.z - lx * s + lz * c];

    // неоновые контуры на высотных башнях и бизнес-центрах
    if (b.h > 42 && (b.kind === "cyberTower" || b.kind === "decoSpire" || b.kind === "midOffice") && r() < 0.72) {
      const ci = Math.floor(r() * 3);
      const topY = b.y + b.h * 0.945;
      const rw = b.w * 0.72, rd = b.d * 0.72;
      // 4 полосы по периметру уступа
      const pF = localToWorld(0, topY - b.y, rd * 0.52);
      const pB = localToWorld(0, topY - b.y, -rd * 0.52);
      neonBuckets[ci].push(place(pF[0], pF[1], pF[2], b.yaw, rw, 0.55, 0.45));
      neonBuckets[ci].push(place(pB[0], pB[1], pB[2], b.yaw, rw, 0.55, 0.45));
      if (b.h > 75 && r() < 0.65) {
        // вертикальный неоновый акцент по ребру
        const pV = localToWorld(b.w * 0.46, b.h * 0.52, b.d * 0.46);
        neonBuckets[ci].push(place(pV[0], pV[1], pV[2], b.yaw, 0.45, b.h * 0.52, 0.45));
      }
    }

    // вертикальные и крышные неоновые вывески
    if (b.h > 22 && b.kind !== "suburbVilla" && b.kind !== "govBlock") {
      if (r() < 0.24) {
        const si = Math.floor(r() * hSignMats.length);
        const sw = Math.min(b.w * 0.72, 16), sh = sw * 0.32;
        const p = localToWorld(0, b.h * 0.96 + sh * 0.55, b.d * 0.36);
        hSignBuckets[si].push(place(p[0], p[1], p[2], b.yaw, sw, sh, 1));
      }
      if (b.h > 36 && r() < 0.22) {
        const si = Math.floor(r() * vSignMats.length);
        const side = r() < 0.5 ? 1 : -1;
        const vh = Math.min(b.h * 0.34, 18), vw = vh * 0.32;
        const p = localToWorld(side * (b.w * 0.52 + 0.6), b.h * 0.44, 0);
        vSignBuckets[si].push(place(p[0], p[1], p[2], b.yaw + Math.PI / 2, vw, vh, 1));
      }
    }

    // крышное оборудование: кондиционеры, медные баки-ресиверы, антенны и маячки
    if (b.kind !== "suburbVilla") {
      const roofY = b.kind === "factoryHall" ? b.h * 0.72 : b.h * 0.96;
      if (r() < 0.65) {
        const p = localToWorld(between(r, -b.w * 0.24, b.w * 0.24), roofY + 1.1, between(r, -b.d * 0.24, b.d * 0.24));
        acMats.push(place(p[0], p[1], p[2], b.yaw, between(r, 2.2, 4.0), between(r, 1.4, 2.4), between(r, 1.8, 3.2)));
      }
      if (r() < 0.35) {
        // стимпанк-резервуар на крыше
        const p = localToWorld(between(r, -b.w * 0.22, b.w * 0.22), roofY + 2.2, between(r, -b.d * 0.22, b.d * 0.22));
        tankMats.push(place(p[0], p[1], p[2], b.yaw, between(r, 1.4, 2.4), between(r, 2.6, 4.4), between(r, 1.4, 2.4)));
      }
      if (b.h > 50 && r() < 0.48) {
        const ah = between(r, 10, 22);
        const p = localToWorld(0, b.h + ah * 0.5, 0);
        antMats.push(place(p[0], p[1], p[2], 0, 1, ah, 1));
        beaconMats.push(place(p[0], b.h + ah + 0.5, p[2], 0, 1, 1, 1));
      }
      if ((b.kind === "factoryHall" || b.kind === "sovietPanel" || b.kind === "decoSpire") && r() < 0.35) {
        const p = localToWorld(b.w * 0.49, b.h * 0.45, 0);
        pipeMats.push(place(p[0], p[1], p[2], b.yaw, 0.55, b.h * 0.85, 0.55));
      }
    }

    // голограммы-кольца над самыми высокими башнями даунтауна
    if (b.h > 105 && b.kind === "cyberTower" && holoSpots.length < 14 && r() < 0.45) {
      holoSpots.push({ x: b.x, y: b.y + b.h + 18, z: b.z, rad: between(r, 10, 16), col: pick(r, [0x46f2ff, 0xff3dd8, 0x55ffd8]), phase: r() * 6.28 });
    }
  }

  // ---------- 5. Создание InstancedMesh ----------
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  neonBuckets.forEach((arr, i) => buildInstanced(group, unitBox, neonMats[i], arr, { name: `neon-${i}` }));

  const planeGeo = new THREE.PlaneGeometry(1, 1);
  hSignBuckets.forEach((arr, i) => buildInstanced(group, planeGeo, hSignMats[i], arr, { name: `hsign-${i}` }));
  vSignBuckets.forEach((arr, i) => buildInstanced(group, planeGeo, vSignMats[i], arr, { name: `vsign-${i}` }));

  buildInstanced(group, new THREE.BoxGeometry(1, 1, 1), M.steel, acMats, { receive: true, name: "rooftop-ac" });
  buildInstanced(group, new THREE.CylinderGeometry(1, 1, 1, 10), M.copper, tankMats, { receive: true, name: "steampunk-tanks" });
  buildInstanced(group, new THREE.CylinderGeometry(0.08, 0.28, 1, 6), M.darkMetal, antMats, { name: "antennas" });
  buildInstanced(group, new THREE.SphereGeometry(0.65, 6, 5), M.glow(0xff2a1a, 6), beaconMats, { name: "beacons" });
  buildInstanced(group, new THREE.CylinderGeometry(0.5, 0.5, 1, 6), M.copper, pipeMats, { name: "facade-pipes" });

  // ---------- 6. Воздушные кабели между соседними зданиями ----------
  const wireGeos = [];
  const wireLimit = 85;
  for (let i = 0; i < buildings.length && wireGeos.length < wireLimit; i += 3) {
    const a = buildings[i];
    if (a.h < 22 || a.kind === "suburbVilla") continue;
    let best = null, bestD = 72 * 72;
    for (let j = i + 1; j < Math.min(buildings.length, i + 24); j++) {
      const b = buildings[j];
      if (Math.abs(a.y - b.y) > 1) continue;
      const dx = a.x - b.x, dz = a.z - b.z, d2 = dx * dx + dz * dz;
      if (d2 > 22 * 22 && d2 < bestD) { bestD = d2; best = b; }
    }
    if (!best) continue;
    const hWire = Math.min(a.h, best.h) * 0.72;
    const y0 = a.y + hWire, y1 = best.y + hWire;
    const pts = [];
    const sag = Math.sqrt(bestD) * 0.08;
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      pts.push(new THREE.Vector3(
        a.x + (best.x - a.x) * t,
        y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * sag,
        a.z + (best.z - a.z) * t
      ));
    }
    wireGeos.push(tube(pts, 0.14, 4));
  }
  if (wireGeos.length) {
    const wires = new THREE.Mesh(merge(wireGeos), M.darkMetal);
    wires.name = "overhead-wires";
    group.add(wires);
  }

  // ---------- 7. Голографические цилиндры с scanline-шейдером ----------
  const holoMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: ctx.U.uTime,
      uNight: ctx.U.uNight,
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uNight;
      varying vec2 vUv;
      void main() {
        float scan = 0.55 + 0.45 * sin(vUv.y * 90.0 - uTime * 5.0);
        float band = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
        float grid = step(0.92, fract(vUv.x * 16.0)) * 0.4;
        vec3 col = mix(vec3(0.18, 0.92, 1.0), vec3(1.0, 0.24, 0.84), 0.5 + 0.5 * sin(vUv.x * 6.283 + uTime * 0.7));
        float alpha = (0.14 + uNight * 0.42) * band * (scan * 0.75 + grid);
        gl_FragColor = vec4(col * (1.2 + uNight * 1.4), alpha);
      }`,
  });

  const holoMeshes = [];
  for (const h of holoSpots) {
    const geo = new THREE.CylinderGeometry(h.rad, h.rad, h.rad * 1.1, 24, 1, true);
    const mesh = new THREE.Mesh(geo, holoMat);
    mesh.position.set(h.x, h.y, h.z);
    mesh.userData.phase = h.phase;
    group.add(mesh);
    holoMeshes.push(mesh);
  }

  return {
    group,
    update(dt, time) {
      for (const m of holoMeshes) {
        m.rotation.y = time * 0.35 + m.userData.phase;
      }
      void dt;
    },
  };
}
