// ============================================================
// ASTANA 2077 — main.js
// Сборка сцены, загрузка модулей (incl. interiors, streetlife,
// ledscreens), кибер-переключение [F], пешеходный режим [G],
// вход/выход в интерьеры [V], коллайдеры и цикл рендера.
// ============================================================
import * as THREE from "three";
import { TIERS, detectTier, STATE, ZONES, SIGNATURE, PLATFORMS } from "./config.js";
import { U, createEnv } from "./env.js";
import { setAnisotropy } from "./textures.js";
import { createMaterials, applyNight } from "./materials.js";
import { createEffects } from "./effects.js";
import { createControls, makeCollider, CAM_VIEWS } from "./controls.js";

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
renderer.toneMapping = THREE.AgXToneMapping;
renderer.info.autoReset = false;
renderer.setSize(innerWidth, innerHeight);
const tierName = detectTier(renderer.getContext());
const tier = TIERS[tierName];
STATE.tier = tierName; STATE.tierCfg = tier;
const resMax = Math.max(0.75, Math.min(devicePixelRatio || 1, tier.dpr, Math.sqrt(4.4e6 / (innerWidth * innerHeight))));
renderer.setPixelRatio(resMax);
$("app").appendChild(renderer.domElement);
setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
// near = 0.35 чтобы интерьеры/банкоматы/столы не обрезались вблизи, far = 16000!
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.35, 16000);
camera.rotation.order = "YXZ";
camera.position.set(...CAM_VIEWS.nurzhol.pos);
camera.lookAt(...CAM_VIEWS.nurzhol.tgt);

const env = createEnv(renderer, scene, camera, tier);
const M = createMaterials({ csm: env.csm, S: tier.tex });
const fx = createEffects(renderer, scene, camera, tier);
fx.setPixelRatio(resMax);
fx.setSize(innerWidth, innerHeight);
const ctx = { U, tier, STATE, camera, renderer };

// ============================================================
// Загрузка модулей
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
  ["Платформы, Есиль и улицы", async () => { mods.city = await load("city", "buildCity"); }],
  ["Достопримечательности и MEGA Silk Way", async () => {
    mods.landmarks = await load("landmarks", "buildLandmarks");
    mods.landmarks2 = await load("landmarks2", "buildLandmarks");
  }],
  ["QazaqGaz, Beijing Palace и Highvill", async () => { mods.signature = await load("signature", "buildSignature"); }],
  ["Проходные 3D-интерьеры", async () => { mods.interiors = await load("interiors", "buildInteriors"); }],
  ["Плотная городская застройка", async () => { mods.buildings = await load("buildings", "buildBuildings"); }],
  ["Уличная жизнь и 2400+ деревьев", async () => { mods.streetlife = await load("streetlife", "buildStreetLife", mods.buildings ? mods.buildings.list : []); }],
  ["Киберпанк-слой и вывески", async () => { mods.cyberpunk = await load("cyberpunk", "buildCyberpunk", mods.buildings ? mods.buildings.list : []); }],
  ["Гигантские LED-экраны", async () => { mods.ledscreens = await load("ledscreens", "buildLedScreens"); }],
  ["Транспорт и трафик", async () => { mods.props = await load("props", "buildProps"); }],
  ["Дирижабли и спинеры", async () => { mods.airships = await load("airships", "buildAirships"); }],
  ["Частицы", async () => {
    const cyberVents = mods.cyberpunk && mods.cyberpunk.ventPositions ? mods.cyberpunk.ventPositions : [];
    const cityVents = mods.city && mods.city.vents ? mods.city.vents : [];
    mods.particles = await load("particles", "buildParticles", {
      airships: mods.airships,
      vents: [...cityVents, ...cyberVents],
    });
  }],
];
async function build() {
  for (let i = 0; i < steps.length; i++) {
    const [label, fn] = steps[i];
    $("loadLabel").textContent = label;
    $("loadBar").style.width = `${(i / steps.length) * 92}%`;
    await tick();
    try { await fn(); } catch (e) { console.error(`[astana] module failed: ${label}`, e); }
  }
}

// ============================================================
// Кино-маршрут
// ============================================================
function cinematicRoute() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const pos = new THREE.CatmullRomCurve3([
    v(780, 270, 590), v(410, 150, 310), v(155, 76, 265), v(155, 138, 220),
    v(-210, 175, 165), v(-680, 210, 260), v(-1120, 220, 290), v(-960, 240, -280),
    v(-340, 215, -310), v(220, 175, -240), v(640, 150, -210), v(1160, 185, -180),
    v(1220, 210, 240), v(920, 235, 420), v(-180, 140, 1140), v(-650, 145, 830),
  ], true, "centripetal", 0.5);
  const look = new THREE.CatmullRomCurve3([
    v(0, 85, 0), v(590, 42, 0), v(235, 42, 155), v(0, 82, 0),
    v(-160, 160, 250), v(-560, 65, 0), v(-940, 75, 0), v(-560, 75, 0),
    v(0, 85, 0), v(235, 42, 155), v(590, 45, 0), v(1080, 45, 0),
    v(780, 35, 0), v(235, 42, 155), v(-180, 18, 940), v(-630, 35, 660),
  ], true, "centripetal", 0.5);
  return { pos, look };
}

// ============================================================
// Управление, HUD, CYBERPUNK TOGGLE, WALK MODE, [V] PORTAL
// ============================================================
const collider = { fn: null };
const walkBtn = $("walkBtn");
const enterPrompt = $("enterPrompt");
const overlay = $("overlay"), hud = $("hud"), toastEl = $("toast");
const fpsVal = $("fpsVal"), resVal = $("resVal"), speedVal = $("speedVal");
const cyberBtn = $("cyberBtn");

function updateWalkBtn(on) {
  if (!walkBtn) return;
  walkBtn.classList.toggle("active", !!on);
  walkBtn.innerHTML = on ? '<kbd>G</kbd> ПОЛЁТ' : '<kbd>G</kbd> ПЕШКОМ';
}

const controls = createControls(camera, renderer.domElement, {
  collide: (p, v, r) => { if (collider.fn) collider.fn(p, v, r); },
  floorHeightAt: (x, z, footY) => (mods.interiors ? mods.interiors.floorHeightAt(x, z, footY) : 0),
  onWalkChange: updateWalkBtn,
});

const LANDMARK_H = {
  bayterek: 105, akorda: 80, akOrda: 80, ministries: 75,
  parliament: 85, mosque: 77, museum: 36, pyramid: 77,
  circus: 32, khanShatyr: 150, abuDhabi: 320, nurAlem: 100, arch: 22,
  highvillPark: 88, highvillAstana: 82,
};
const SIG_H = {
  emerald1: 210, emerald2: 156, transportTower: 155,
  northernLights1: 180, northernLights2: 152, northernLights3: 128,
  kmgGate: 165, talan1: 145, talan2: 119, triumphAstana: 142,
};
const platformY = Object.fromEntries(PLATFORMS.map((p) => [p.id, p.y]));

let toastTimer = null;
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg; toastEl.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

// ---------- CYBER MODE TOGGLE ----------
let cyberMode = false;
const brandSub = document.querySelector("#brand span");
function setCyber(on, instant = false) {
  cyberMode = !!on;
  env.setCyber(cyberMode, instant ? 0.001 : 0.65);
  if (!instant) fx.flashGlitch();
  if (mods.cyberpunk && mods.cyberpunk.setCyber) mods.cyberpunk.setCyber(cyberMode);
  if (mods.airships && mods.airships.setCyber) mods.airships.setCyber(cyberMode);
  if (mods.ledscreens && mods.ledscreens.setCyber) mods.ledscreens.setCyber(cyberMode);
  if (cyberBtn) {
    if (cyberMode) {
      cyberBtn.classList.add("active");
      cyberBtn.innerHTML = '<kbd>F</kbd> РЕАЛЬНАЯ АСТАНА';
    } else {
      cyberBtn.classList.remove("active");
      cyberBtn.innerHTML = '<kbd>F</kbd> CYBERPUNK 2077';
    }
  }
  if (brandSub) brandSub.textContent = cyberMode ? "2077 · CYBER" : "РЕАЛЬНАЯ";
  document.body.dataset.cyber = cyberMode ? "1" : "0";
  if (!instant) toast(cyberMode ? "ASTANA 2077 · CYBER-STEAMPUNK" : "Реальная Астана · день");
}

function setActiveViewBtn(name) {
  document.querySelectorAll("[data-cam]").forEach((b) => {
    b.classList.toggle("active", b.dataset.cam === name);
  });
}

function enterOrExitNearest() {
  if (!mods.interiors) return false;
  const portal = mods.interiors.queryPortal(camera.position);
  if (!portal) return false;
  if (portal.inside) {
    controls.teleport(portal.entrance.outsidePos, portal.entrance.outsideLook, true);
    toast("Вышли наружу · " + portal.entrance.label);
  } else {
    controls.teleport(portal.entrance.insidePos, portal.entrance.insideLook, true);
    toast("Внутри: " + portal.entrance.label);
  }
  return true;
}

// Глобальные хуки для автотестов
window.__setCyber = (bool, instant = false) => setCyber(!!bool, instant);
window.__setCam = (name, instant = false) => {
  controls.goToView(name, instant);
  setActiveViewBtn(name);
};
window.__setWalk = (bool) => controls.setWalkMode(!!bool);
window.__enterExit = () => enterOrExitNearest();

// Keyboard handlers
addEventListener("keydown", (e) => {
  if (e.repeat || e.target.closest("input, textarea")) return;
  if (e.code === "KeyF") setCyber(!cyberMode);
  if (e.code === "KeyG") {
    controls.setWalkMode(!controls.walkMode);
    toast(controls.walkMode ? "Режим: Пешком (WASD + Shift)" : "Режим: Свободный полёт");
  }
  if (e.code === "KeyV") enterOrExitNearest();
  if (e.code === "KeyC") {
    if (controls.cinematic) { controls.exitCinematic(); toast("Свободный полёт"); }
    else { controls.enterCinematic(); toast("Кино-режим · любая клавиша движения — выход"); }
  }
  if (e.code === "KeyH") hud.classList.toggle("off");
});

if (cyberBtn) cyberBtn.addEventListener("click", () => setCyber(!cyberMode));
if (walkBtn) walkBtn.addEventListener("click", () => {
  controls.setWalkMode(!controls.walkMode);
  toast(controls.walkMode ? "Режим: Пешком" : "Режим: Свободный полёт");
});
if (enterPrompt) enterPrompt.addEventListener("click", () => enterOrExitNearest());

document.querySelectorAll("[data-cam]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.dataset.cam;
    controls.goToView(name, false);
    setActiveViewBtn(name);
    toast(CAM_VIEWS[name] ? CAM_VIEWS[name].label : name);
  });
});

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
let emaMs = 16, adaptT = 0, hudT = 0, lastPromptText = "";
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
  const cyberMix = U.uCyber.value;
  for (const m of modList) m.update(dt, time, camera, cyberMix);
  env.update(camera, dt);
  fx.applyEnv(env.cur, camera, aoOn, dt);
  renderer.info.reset();
  fx.composer.render();
  frames++;

  if (enterPrompt && mods.interiors && frames % 6 === 0) {
    const portal = controls.enabled ? mods.interiors.queryPortal(camera.position) : null;
    if (portal) {
      const txt = portal.inside ? `[V] Выйти наружу (${portal.entrance.label})` : `[V] Войти внутрь (${portal.entrance.label})`;
      if (txt !== lastPromptText) { enterPrompt.textContent = txt; lastPromptText = txt; }
      enterPrompt.classList.add("show");
    } else if (lastPromptText !== "") {
      enterPrompt.classList.remove("show");
      lastPromptText = "";
    }
  }

  if (speedVal && frames % 6 === 0) speedVal.textContent = controls.speed;
  hudT += raw;
  if (hudT > 0.5) {
    hudT = 0;
    if (fpsVal) fpsVal.textContent = Math.round(1000 / emaMs);
  }
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
  return {
    calls: i.render.calls, tris: i.render.triangles, programs: i.programs.length,
    geometries: i.memory.geometries, textures: i.memory.textures,
    tier: tierName, res: +resScale.toFixed(2), ms: +emaMs.toFixed(1),
    buildings: mods.buildings ? mods.buildings.list.length : 0,
    cyber: cyberMode, walk: controls.walkMode,
    streetlife: mods.streetlife ? mods.streetlife.counts : null,
  };
}
window.__app = {
  THREE, scene, camera, renderer, env, M, mods, controls, stats,
  look(px, py, pz, tx, ty, tz) { camera.position.set(px, py, pz); camera.lookAt(tx, ty, tz); controls.syncFromCamera(); },
  setPreset(n, s = 0.001) { env.set(n, s); },
  setTime(t) { elapsed = t; },
  setCine(t) { controls.cineT = t; },
  setCyber,
};

(async () => {
  $("loadLabel").textContent = "Инициализация";
  await build();
  controls.setRoute(cinematicRoute().pos, cinematicRoute().look, 115);

  const list = mods.buildings ? mods.buildings.list : [];
  // Исключаем walkable-здания и парки из сплошных внешних боксов — их полые стены задаёт interiors.js!
  const solidZones = ZONES
    .filter((z) => !z.walkable && !z.isPark)
    .map((z) => ({ x: z.x, z: z.z, y: platformY[z.plat] || 0, yaw: 0, w: z.hx * 2, d: z.hz * 2, h: LANDMARK_H[z.id] || 40 }));
  const solidSig = SIGNATURE
    .filter((s) => !s.walkable)
    .map((s) => ({ x: s.x, z: s.z, y: platformY[s.plat] || 0, yaw: s.yaw || 0, w: s.w || s.hx * 2, d: s.d || s.hz * 2, h: s.h || SIG_H[s.id] || 120 }));
  const interiorColliders = mods.interiors ? mods.interiors.colliders : [];
  // Коллайдеры соседей QazaqGaz
  const neighborBoxes = [
    { x: 162, y: 0, z: 150, w: 52, d: 26, h: 29, yaw: 0 },
    { x: 314, y: 0, z: 152, w: 62, d: 20, h: 32, yaw: 0 },
  ];
  collider.fn = makeCollider(list, [...solidZones, ...solidSig, ...interiorColliders, ...neighborBoxes]);

  $("loadLabel").textContent = "Компиляция шейдеров";
  $("loadBar").style.width = "96%";
  await tick();
  try { await renderer.compileAsync(scene, camera); } catch (e) { console.warn("compileAsync", e); }
  $("loadBar").style.width = "100%";
  await tick();
  const loadWrap = $("loadWrap");
  if (loadWrap) {
    loadWrap.classList.add("done");
    setTimeout(() => loadWrap.remove(), 900);
  }

  const cyberParam = P.get("cyber");
  if (cyberParam === "1" || cyberParam === "true") setCyber(true, true);
  {
    const mc = P.get("cam"), ml = P.get("tgt");
    if (mc) {
      const p = mc.split(",").map(Number); camera.position.set(p[0], p[1], p[2]);
      const q = ml ? ml.split(",").map(Number) : [0, 85, 0]; camera.lookAt(q[0], q[1], q[2]); controls.syncFromCamera();
    }
  }
  if (P.has("autostart")) {
    overlay.style.display = "none";
    overlay.classList.add("hidden");
    const lw = $("loadWrap");
    if (lw) lw.remove();
    hud.classList.add("on");
    controls.enabled = true;
    controls.syncFromCamera();
    if (P.has("cam")) controls.enabled = P.has("free");
  }
  if (P.has("cine")) setTimeout(() => { if (P.has("cineT")) controls.cineT = parseFloat(P.get("cineT")) || 0; controls.enterCinematic(); }, 200);
  const viewParam = P.get("view");
  if (viewParam && CAM_VIEWS[viewParam]) {
    controls.goToView(viewParam, true);
    setActiveViewBtn(viewParam);
  }
  window.__ready = true;
})();
requestAnimationFrame(frame);
