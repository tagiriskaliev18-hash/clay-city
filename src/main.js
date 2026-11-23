// ============================================================
// CLAY CITY v3 — «ASTANA RING». Сборка сцены, загрузка, пресеты,
// кино-маршрут, адаптивное качество, цикл рендера.
// ============================================================
import * as THREE from "three";
import { TIERS, detectTier, STATE, ZONES, SIGNATURE, PLATFORMS } from "./config.js";
import { U, createEnv, PRESET_ORDER } from "./env.js";
import { setAnisotropy } from "./textures.js";
import { createMaterials, applyNight } from "./materials.js";
import { createEffects } from "./effects.js";
import { createControls, makeCollider } from "./controls.js";

const P = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 0));

window.__errs = [];
function showErr(msg) {
  const box = $("err");
  if (box) { box.style.display = "flex"; box.textContent = "Ошибка: " + msg; }
}
addEventListener("error", (e) => { window.__errs.push(e.message); showErr(e.message + " @" + e.filename + ":" + e.lineno); });

// ---------- рендерер ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", stencil: false });
} catch (e) { showErr("WebGL недоступен: " + e.message); throw e; }
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.info.autoReset = false;
renderer.setSize(innerWidth, innerHeight);
const tierName = detectTier(renderer.getContext());
const tier = TIERS[tierName];
STATE.tier = tierName; STATE.tierCfg = tier;
// масштаб рендера: не больше ~4.4 Мпикс даже на 4K
const resMax = Math.max(0.75, Math.min(devicePixelRatio || 1, tier.dpr, Math.sqrt(4.4e6 / (innerWidth * innerHeight))));
renderer.setPixelRatio(resMax);
$("app").appendChild(renderer.domElement);
setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 2, 90000);
camera.rotation.order = "YXZ";
camera.position.set(1500, 700, 1500);
camera.lookAt(0, 150, 0);

const env = createEnv(renderer, scene, camera, tier);
const M = createMaterials({ csm: env.csm, S: tier.tex });
const fx = createEffects(renderer, scene, camera, tier);
fx.setPixelRatio(resMax);
fx.setSize(innerWidth, innerHeight);
const ctx = { U, tier, STATE, camera, renderer };

const PRESET_RU = { day: "День", sunset: "Закат", night: "Ночь" };
const startPreset = PRESET_ORDER.includes(P.get("preset")) ? P.get("preset") : "sunset";
if (P.has("preset")) env.set(startPreset, 0.001);

// ============================================================
// Загрузка модулей (каждый может отсутствовать — сцена соберётся без него)
// ============================================================
const mods = {};
const norm = (r) => (r && typeof r.update === "function" ? r : Object.assign({ update() {} }, r || {}));
const modList = [];
const load = async (file, fn, ...args) => {
  const m = await import(`./${file}.js`);
  const r = norm(await m[fn](scene, M, ctx, ...args));
  modList.push(r);
  return r;
};
const steps = [
  ["Платформы и улицы", async () => { mods.city = await load("city", "buildCity"); }],
  ["Достопримечательности", async () => {
    mods.landmarks = await load("landmarks", "buildLandmarks");
    mods.landmarks2 = await load("landmarks2", "buildLandmarks");
  }],
  ["Фирменные башни", async () => { mods.signature = await load("signature", "buildSignature"); }],
  ["Кварталы", async () => { mods.buildings = await load("buildings", "buildBuildings"); }],
  ["Киберпанк-слой", async () => { mods.cyberpunk = await load("cyberpunk", "buildCyberpunk", mods.buildings ? mods.buildings.list : []); }],
  ["Фонари, деревья, автомобили", async () => { mods.props = await load("props", "buildProps"); }],
  ["Флот дирижаблей", async () => { mods.airships = await load("airships", "buildAirships"); }],
  ["Пар и дым", async () => { mods.particles = await load("particles", "buildParticles", { airships: mods.airships, vents: mods.city ? mods.city.vents || [] : [] }); }],
];
async function build() {
  for (let i = 0; i < steps.length; i++) {
    const [label, fn] = steps[i];
    $("loadLabel").textContent = label;
    $("loadBar").style.width = `${(i / steps.length) * 92}%`;
    await tick();
    try { await fn(); } catch (e) { console.error(`[clay] module failed: ${label}`, e); }
  }
}

// ============================================================
// Кино-маршрут: облёт достопримечательностей Астаны
// ============================================================
function cinematicRoute() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const pos = new THREE.CatmullRomCurve3([
    v(2150, 840, 1900), v(1500, 540, 1230), v(1180, 340, 560), v(900, 240, 240), v(600, 170, 60),
    v(190, 128, 160), v(-120, 122, 200), v(-210, 96, 230), v(-430, 210, -110), v(-160, 280, -590),
    v(330, 210, -250), v(700, 300, -640), v(1150, 260, -640), v(1800, 640, -1250),
  ], true, "centripetal", 0.5);
  const look = new THREE.CatmullRomCurve3([
    v(0, 150, 0), v(500, 120, 200), v(776, 110, 0), v(776, 100, 0), v(0, 70, 0),
    v(0, 92, 0), v(0, 92, 0), v(-286, 40, 0), v(-222, 35, -262), v(250, 150, -260),
    v(480, 60, -214), v(416, 120, -124), v(1000, 135, -400), v(0, 150, 0),
  ], true, "centripetal", 0.5);
  return { pos, look };
}

// ============================================================
// Управление, HUD
// ============================================================
// коллайдер подключается после построения города (список зданий нужен раньше)
const collider = { fn: null };
const controls = createControls(camera, renderer.domElement, {
  collide: (p, v) => { if (collider.fn) collider.fn(p, v); },
});
const LANDMARK_H = { bayterek: 105, akOrda: 80, parliament: 48, mosque: 63, museum: 40, pyramid: 76, circus: 40, khanShatyr: 150, abuDhabi: 382, nurAlem: 100, arch: 58 };
const SIG_H = { emerald1: 210, emerald2: 152, transport: 168, northLights: 120, kmgas: 165, beijing: 126, talan: 160, triumph: 142, moscow: 102, armada: 110, arman: 118 };
const platformY = Object.fromEntries(PLATFORMS.map((p) => [p.id, p.y]));
const extraBoxes = [
  ...ZONES.map((z) => ({ x: z.x, z: z.z, y: platformY[z.plat] || 0, yaw: 0, w: z.hx * 2, d: z.hz * 2, h: LANDMARK_H[z.id] || 40 })),
  ...SIGNATURE.map((s) => ({ x: s.x, z: s.z, y: platformY[s.plat] || 0, yaw: s.yaw, w: s.hx * 2, d: s.hz * 2, h: SIG_H[s.id] || 120 })),
];

const overlay = $("overlay"), hud = $("hud"), toastEl = $("toast");
const fpsVal = $("fpsVal"), resVal = $("resVal"), speedVal = $("speedVal"), presetEl = $("presetName");
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg; toastEl.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}
function setPreset(name, seconds = 3.4) {
  env.set(name, seconds);
  presetEl.textContent = PRESET_RU[name] || name;
  document.body.dataset.preset = name;
  toast(`Освещение: ${PRESET_RU[name] || name}`);
}
addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.code === "KeyF") setPreset(env.next());
  if (e.code === "Digit1") setPreset("sunset");
  if (e.code === "Digit2") setPreset("night");
  if (e.code === "Digit3") setPreset("day");
  if (e.code === "KeyC") {
    if (controls.cinematic) { controls.exitCinematic(); toast("Свободный полёт"); }
    else { controls.enterCinematic(); toast("Кино-режим · любая клавиша движения — выход"); }
  }
  if (e.code === "KeyH") hud.classList.toggle("off");
});
env.next = ((orig) => function (s) { const next = PRESET_ORDER[(PRESET_ORDER.indexOf(env.current) + 1) % PRESET_ORDER.length]; this.set(next, s); return next; })(env.next);

overlay.addEventListener("click", () => {
  overlay.classList.add("hidden");
  hud.classList.add("on");
  controls.enabled = true;
  controls.syncFromCamera();
  renderer.domElement.requestPointerLock?.();
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  fx.setSize(innerWidth, innerHeight);
  env.refit();
});

// ============================================================
// Цикл
// ============================================================
let last = performance.now(), elapsed = 0, frames = 0;
{ const m = P.get("t0"); if (m) elapsed = parseFloat(m) || 0; }
let resScale = resMax, aoOn = !!tier.ao;
let emaMs = 16, adaptT = 0, hudT = 0, lodT = 0;
const ATTRACT_R = 2150;

function applyRes() {
  renderer.setPixelRatio(resScale);
  fx.setPixelRatio(resScale);
  fx.setSize(innerWidth, innerHeight);
  if (resVal) resVal.textContent = Math.round(resScale * 100) + "%";
}

function frame(now) {
  requestAnimationFrame(frame);
  let raw = (now - last) / 1000;
  if (!(raw > 0)) raw = 1 / 60;
  last = now;
  const dt = Math.min(0.05, raw);
  if (frames > 2) emaMs = emaMs * 0.94 + Math.min(raw * 1000, 200) * 0.06;
  elapsed += dt;
  const time = elapsed;
  U.uTime.value = time;
  window.__frame = (window.__frame || 0) + 1;

  if (!overlay.classList.contains("hidden") && !controls.cinematic) {
    const a = time * 0.021 + 0.78;
    camera.position.set(Math.cos(a) * ATTRACT_R, 730 + Math.sin(time * 0.05) * 50, Math.sin(a) * ATTRACT_R);
    camera.lookAt(0, 150, 0);
    if (camera.fov !== 46) { camera.fov = 46; camera.updateProjectionMatrix(); }
  } else {
    controls.update(dt, time);
  }

  applyNight(U.uNight.value, time);
  for (const m of modList) m.update(dt, time, camera);
  env.update(camera, dt);
  fx.applyEnv(env.cur, camera, aoOn);
  renderer.info.reset();
  fx.composer.render();
  frames++;

  if (speedVal && frames % 6 === 0) speedVal.textContent = controls.speed;
  hudT += raw;
  if (hudT > 0.5) {
    hudT = 0;
    if (fpsVal) fpsVal.textContent = Math.round(1000 / emaMs);
  }
  // адаптивное качество: сначала выключаем AO, затем понижаем разрешение
  adaptT += raw;
  if (adaptT > 3 && frames > 90) {
    adaptT = 0;
    if (emaMs > 26 && !controls.cinematic) {
      if (aoOn) { aoOn = false; fx.atmo.aoOn = false; }
      else if (resScale > 0.52) { resScale = Math.max(0.5, resScale - 0.15); applyRes(); }
    }
  }
}

// ---------- API для отладки/скриншотов ----------
function stats() {
  const i = renderer.info;
  return { calls: i.render.calls, tris: i.render.triangles, programs: i.programs.length, geometries: i.memory.geometries, textures: i.memory.textures,
    tier: tierName, res: +resScale.toFixed(2), ms: +emaMs.toFixed(1), buildings: mods.buildings ? mods.buildings.list.length : 0 };
}
window.__app = {
  THREE, scene, camera, renderer, env, M, mods, controls, stats,
  look(px, py, pz, tx, ty, tz) { camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); controls.syncFromCamera(); },
  setPreset(n, s = 0.001) { env.set(n, s); presetEl.textContent = PRESET_RU[n] || n; document.body.dataset.preset = n; },
  setTime(t) { elapsed = t; },
  setCine(t) { controls.cineT = t; },
};

(async () => {
  $("loadLabel").textContent = "Инициализация";
  await build();
  controls.setRoute(cinematicRoute().pos, cinematicRoute().look, 115);
  const list = mods.buildings ? mods.buildings.list : [];
  collider.fn = makeCollider(list, extraBoxes);
  $("loadLabel").textContent = "Компиляция шейдеров";
  $("loadBar").style.width = "96%";
  await tick();
  try { await renderer.compileAsync(scene, camera); } catch (e) { console.warn("compileAsync", e); }
  $("loadBar").style.width = "100%";
  await tick();
  $("loadWrap").classList.add("done");
  setTimeout(() => $("loadWrap").remove(), 900);
  window.__ready = true;

  // параметры URL: камера, кино, автостарт
  { const mc = P.get("cam"), ml = P.get("look");
    if (mc) { const p = mc.split(",").map(Number); camera.position.set(p[0], p[1], p[2]);
      const q = ml ? ml.split(",").map(Number) : [0, 150, 0]; camera.lookAt(q[0], q[1], q[2]); controls.syncFromCamera(); } }
  if (P.has("autostart")) {
    overlay.classList.add("hidden"); hud.classList.add("on"); controls.enabled = true; controls.syncFromCamera();
    if (P.has("cam")) controls.enabled = P.has("free");
  }
  if (P.has("cine")) setTimeout(() => { if (P.has("cineT")) controls.cineT = parseFloat(P.get("cineT")) || 0; controls.enterCinematic(); }, 200);
})();
requestAnimationFrame(frame);
