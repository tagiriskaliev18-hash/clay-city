// ============================================================
// lab.js — лаборатория моделей: открывает выбранные модули сцены по
// отдельности (?mod=city,buildings,landmarks…), с реальным освещением.
// Параметры: cam=x,y,z look=x,y,z fov= preset=day|sunset|night t0=сек
//            mod=a,b,c ground=0|1 groundY= dt=1/30 dpr= tier= ao=0|1
// ============================================================
import * as THREE from "three";
import { TIERS, detectTier, STATE } from "./config.js";
import { U, createEnv } from "./env.js";
import { setAnisotropy } from "./textures.js";
import { createMaterials, applyNight } from "./materials.js";
import { createEffects } from "./effects.js";

const P = new URLSearchParams(location.search);
const num = (k, d) => (P.has(k) ? parseFloat(P.get(k)) : d);
const vec = (k, d) => (P.has(k) ? P.get(k).split(",").map(Number) : d);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", stencil: false });
} catch (e) { document.body.textContent = "WebGL недоступен: " + e.message; throw e; }
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setSize(innerWidth, innerHeight);
const pr = Math.min(devicePixelRatio || 1, num("dpr", 1));
renderer.setPixelRatio(pr);
renderer.info.autoReset = false;
document.getElementById("app").appendChild(renderer.domElement);

const tierName = detectTier(renderer.getContext());
const tier = TIERS[tierName];
STATE.tier = tierName; STATE.tierCfg = tier;
setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(num("fov", 42), innerWidth / innerHeight, 2, 90000);
camera.position.set(...vec("cam", [180, 120, 260]));
camera.lookAt(...vec("look", [0, 50, 0]));

const env = createEnv(renderer, scene, camera, tier);
const M = createMaterials({ csm: env.csm, S: tier.tex });
const fx = createEffects(renderer, scene, camera, tier);
fx.setPixelRatio(pr);
fx.setSize(innerWidth, innerHeight);
if (P.has("preset")) env.set(P.get("preset"), 0.001);

// нейтральная земля-контекст
if (num("ground", 1)) {
  const g = new THREE.Mesh(new THREE.CircleGeometry(num("groundR", 4000), 96), M.std({ color: 0x6f6c66, roughness: 0.9, metalness: 0 }));
  g.rotation.x = -Math.PI / 2; g.position.y = num("groundY", 0); g.receiveShadow = true; scene.add(g);
}

const ctx = { U, tier, STATE, camera, renderer };
const built = {};
const want = (P.get("mod") || "").split(",").filter(Boolean);
async function tryLoad(name, fn) {
  if (!want.includes(name)) return null;
  try {
    const mod = await import(`./${name}.js`);
    const r = await fn(mod);
    built[name] = r;
    console.log(`[lab] ${name}: ok`);
    return r;
  } catch (e) {
    console.error(`[lab] module ${name} FAILED: ${e && e.stack || e}`);
    document.title = "LAB ERROR: " + name;
    return null;
  }
}
const upd = (r) => (r && typeof r.update === "function" ? r : { update() {}, ...r });
const fakeBuildings = () => {
  const out = [];
  for (let i = 0; i < 60; i++) {
    const a = i * 2.399963, r = 40 + Math.sqrt(i) * 48;
    out.push({ x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r, yaw: a, w: 22 + (i % 5) * 6, d: 18 + (i % 3) * 8, h: 40 + (i % 7) * 22, kind: "glass" });
  }
  return out;
};

(async () => {
  await tryLoad("_smoke", (m) => upd(m.buildSmoke(scene, M, ctx)));
  const city = await tryLoad("city", (m) => upd(m.buildCity(scene, M, ctx)));
  await tryLoad("props", (m) => upd(m.buildProps(scene, M, ctx)));
  await tryLoad("landmarks", (m) => upd(m.buildLandmarks(scene, M, ctx)));
  await tryLoad("landmarks2", (m) => upd(m.buildLandmarks(scene, M, ctx)));
  await tryLoad("signature", (m) => upd(m.buildSignature(scene, M, ctx)));
  const buildings = await tryLoad("buildings", (m) => upd(m.buildBuildings(scene, M, ctx)));
  await tryLoad("cyberpunk", (m) => upd(m.buildCyberpunk(scene, M, ctx, buildings ? buildings.list : fakeBuildings())));
  const airships = await tryLoad("airships", (m) => upd(m.buildAirships(scene, M, ctx)));
  await tryLoad("particles", (m) => upd(m.buildParticles(scene, M, ctx, { airships, vents: city ? (city.vents || []) : [] })));
})();

let last = performance.now(), elapsed = num("t0", 0), frames = 0;
const fixed = P.has("dt") ? num("dt", 1 / 30) : 0;
const orbit = num("orbit", 0), look0 = vec("look", [0, 50, 0]);
let follow = P.has("follow") ? vec("follow", [150, 35, 0]) : null;
let lookShip = P.has("lookShip") ? vec("lookShip", [0, 0, 0]) : null;
let shipIdx = num("ship", 0) | 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = fixed || Math.min(0.05, (now - last) / 1000);
  if (!(dt > 0)) dt = 1 / 60;
  last = now;
  elapsed += dt;
  U.uTime.value = elapsed;
  if (orbit) {
    const d = camera.position.distanceTo(new THREE.Vector3(...look0));
    const a = elapsed * orbit + Math.atan2(camera.position.z - look0[2], camera.position.x - look0[0]);
    camera.position.set(look0[0] + Math.cos(a) * d, camera.position.y, look0[2] + Math.sin(a) * d);
    camera.lookAt(...look0);
  }
  applyNight(U.uNight.value, elapsed);
  for (const k of Object.keys(built)) { const r = built[k]; if (r && r.update) r.update(dt, elapsed, camera); }
  // камера-сопровождение: ?follow=dx,dy,dz&ship=N — офсет в локальных осях борта
  if (follow && built.airships && built.airships.ships && built.airships.ships[shipIdx]) {
    const s0 = built.airships.ships[shipIdx];
    camera.position.set(follow[0], follow[1], follow[2]).applyMatrix4(s0.matrix);
    camera.lookAt(s0.pos);
    if (lookShip) camera.lookAt(new THREE.Vector3(lookShip[0], lookShip[1], lookShip[2]).applyMatrix4(s0.matrix));
  }
  env.update(camera, dt);
  fx.applyEnv(env.cur, camera, num("ao", tier.ao ? 1 : 0));
  renderer.info.reset();
  fx.composer.render();
  if (++frames === 3) window.__ready = true;
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); fx.setSize(innerWidth, innerHeight); env.refit();
});

window.__app = {
  scene, camera, renderer, env, M, built, THREE,
  look(px, py, pz, tx, ty, tz) { camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); },
  follow(o) { follow = o; },
  lookShip(o) { lookShip = o; },
  ship(i) { shipIdx = i; },
  setPreset(n) { env.set(n, 0.001); },
  setTime(t) { elapsed = t; },
  stats() {
    const i = renderer.info;
    return { calls: i.render.calls, tris: i.render.triangles, programs: i.programs.length, geometries: i.memory.geometries, textures: i.memory.textures, tier: tierName };
  },
};
requestAnimationFrame(frame);
