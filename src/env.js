// ============================================================
// ASTANA 2077 — окружение: физическое небо (Preetham) + ночь (луна,
// звёзды, засветка города, Млечный путь), облака, CSM, IBL (PMREM).
// Два режима: РЕАЛЬНАЯ АСТАНА (day) и ASTANA 2077 CYBERPUNK (cyber).
// Общие юниформы: uTime, uNight, uCyber, uSunDir.
// Переключение по клавише F через cyberMode toggle.
// ============================================================
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { CSM } from "three/addons/csm/CSM.js";

// общие юниформы для всех кастомных шейдеров
export const U = {
  uTime:   { value: 0 },
  uNight:  { value: 0 },
  uCyber:  { value: 0 },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
};

// ---------- ПРЕСЕТЫ ----------
export const PRESETS = {
  day: {
    skyEl: 34, el: 36, az: 212, sunI: 4.4, sunC: "#fff6e6", hemiS: "#cbe4ff", hemiG: "#70685c", hemiI: 0.62, envI: 1.05,
    turb: 2.0, ray: 1.75, mie: 0.0038, mieG: 0.82, exp: 0.76, night: 0, fogC: "#c4dcf4", fogZ: "#6ea2dc", fogD: 1.45, glow: 0.42,
    cloudLit: "#ffffff", cloudShade: "#a8bcd4", cloudA: 0.46, bloomS: 0.14, bloomT: 0.96, bloomR: 0.4,
    sat: 1.06, con: 1.04, tint: "#ffffff", tintAmt: 0, vignette: 0.16, grain: 0.018, ca: 0.0004,
  },
  sunset: {
    skyEl: 4.5, el: 9.5, az: 238, sunI: 3.8, sunC: "#ffae6c", hemiS: "#f1c9a6", hemiG: "#4b3d31", hemiI: 0.55, envI: 0.8,
    turb: 5.2, ray: 2.3, mie: 0.0075, mieG: 0.86, exp: 0.68, night: 0.04, fogC: "#dfb08c", fogZ: "#a9a3c6", fogD: 1.25, glow: 1.0,
    cloudLit: "#ffd3a6", cloudShade: "#8f8090", cloudA: 0.58, bloomS: 0.26, bloomT: 0.85, bloomR: 0.5,
    sat: 1.08, con: 1.05, tint: "#1b2a52", tintAmt: 0.22, vignette: 0.28, grain: 0.03, ca: 0.0009,
  },
  night: {
    skyEl: -16, el: 44, az: 150, sunI: 0.09, sunC: "#a2b8ff", hemiS: "#1a2740", hemiG: "#05070b", hemiI: 0.34, envI: 0.30,
    turb: 2, ray: 0.6, mie: 0.002, mieG: 0.8, exp: 0.95, night: 1, fogC: "#091020", fogZ: "#03060c", fogD: 0.85, glow: 0,
    cloudLit: "#222c44", cloudShade: "#080c16", cloudA: 0.40, bloomS: 0.36, bloomT: 0.88, bloomR: 0.45,
    sat: 1.12, con: 1.08, tint: "#0a2240", tintAmt: 0.28, vignette: 0.36, grain: 0.035, ca: 0.0012,
  },
  // CYBERPUNK 2077 — глубокая контрастная неоновая ночь Найт-Сити
  cyber: {
    skyEl: -18, el: 44, az: 150, sunI: 0.07, sunC: "#7a98ff", hemiS: "#121d3a", hemiG: "#04060c", hemiI: 0.30, envI: 0.26,
    turb: 1.5, ray: 0.35, mie: 0.001, mieG: 0.8, exp: 0.96, night: 1, fogC: "#2c1b44", fogZ: "#050714", fogD: 1.25, glow: 0,
    cloudLit: "#1e1638", cloudShade: "#070914", cloudA: 0.34, bloomS: 0.40, bloomT: 0.86, bloomR: 0.48,
    sat: 1.18, con: 1.10, tint: "#0d1238", tintAmt: 0.26, vignette: 0.36, grain: 0.036, ca: 0.0014,
  },
};
export const PRESET_ORDER = ["day", "sunset", "night"];
const NUM = ["skyEl", "el", "az", "sunI", "hemiI", "envI", "turb", "ray", "mie", "mieG", "exp", "night", "fogD", "glow", "cloudA", "bloomS", "bloomT", "bloomR", "sat", "con", "tintAmt", "vignette", "grain", "ca"];
const COL = ["sunC", "hemiS", "hemiG", "fogC", "fogZ", "cloudLit", "cloudShade", "tint"];

export function dirFrom(el, az) {
  const e = THREE.MathUtils.degToRad(el), a = THREE.MathUtils.degToRad(az);
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
}

// ---------- Cloud layer GLSL ----------
const CLOUD_GLSL = `
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < OCT; i++){ s += a * n(p); p = p * 2.07 + 13.1; a *= 0.5; } return s; }`;

function cloudLayer({ height, scale, oct = 5, drift = 1 }) {
  const g = new THREE.PlaneGeometry(120000, 120000);
  g.rotateX(Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: {
      uTime: U.uTime, uLit: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uA: { value: 0.5 },
      uScale: { value: scale }, uSunDir: U.uSunDir, uSunC: { value: new THREE.Color(1, 1, 1) }, uDrift: { value: drift },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `#define OCT ${oct}
      uniform float uTime, uA, uScale, uDrift; uniform vec3 uLit, uShade, uSunDir, uSunC; varying vec3 vW;
      ${CLOUD_GLSL}
      void main(){
        vec2 p = vW.xz * uScale + vec2(uTime * 0.004 * uDrift, uTime * 0.0016 * uDrift);
        vec2 q = vec2(fbm(p), fbm(p + 5.2));
        float d = fbm(p + q * 1.4);
        float c = smoothstep(1.0 - uA * 0.9 - 0.18, 1.0 - uA * 0.9 + 0.2, d);
        float edge = smoothstep(0.42, 0.56, d) - smoothstep(0.58, 0.9, d);
        vec2 so = normalize(uSunDir.xz + vec2(1e-4)) * 0.05;
        float thick = clamp(d - fbm(p + so) + 0.5, 0.0, 1.0);
        float lit = clamp(0.25 + edge * 1.1 + (1.0 - thick) * 0.7, 0.0, 1.0);
        float dist = length(vW.xz - cameraPosition.xz) * uScale;
        float fade = 1.0 - smoothstep(0.42, 0.95, dist);
        vec3 col = mix(uShade, uLit, lit);
        gl_FragColor = vec4(col, c * fade);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.y = height; mesh.frustumCulled = false; mesh.renderOrder = 5;
  return mesh;
}

function patchSky(sky) {
  sky.material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uNight: U.uNight, uCyber: U.uCyber, uSunDir: U.uSunDir, uTime: U.uTime });
    sh.fragmentShader = sh.fragmentShader
      .replace("void main() {", `
        uniform float uNight; uniform float uCyber; uniform float uTime; uniform vec3 uSunDir;
        float h31(vec3 p){ p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        // trilinear n3 — гладкий Млечный путь, БЕЗ квадратиков
        float n3(vec3 p){
          vec3 i = floor(p), f = fract(p); f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
          return mix(
            mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y),
            f.z
          );
        }
        void main() {`)
      .replace("gl_FragColor = vec4( retColor, 1.0 );", `
        {
          vec3 d = normalize(vWorldPosition - cameraPosition);
          float y = max(d.y, 0.0);

          // === ночное небо ===
          vec3 nightC = mix(vec3(0.012, 0.015, 0.036), vec3(0.0018, 0.0025, 0.007), pow(y, 0.42));
          float hor = pow(1.0 - y, 16.0);
          nightC += vec3(0.045, 0.028, 0.018) * hor * (1.0 - uCyber * 0.65);
          nightC += vec3(0.012, 0.026, 0.048) * pow(1.0 - y, 5.0);

          // звёзды
          vec3 cell = floor(d * 900.0); vec3 fr = fract(d * 900.0) - 0.5;
          float hs = h31(cell);
          float star = smoothstep(0.34, 0.0, length(fr)) * step(0.9945, hs);
          float tw = 0.6 + 0.4 * sin(uTime * (1.5 + hs * 5.0) + hs * 80.0);
          nightC += mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.7), step(0.9985, hs)) * star * tw * (0.35 + hs * 3.0) * smoothstep(0.0, 0.25, d.y);

          // Млечный путь (гладкий, trilinear n3)
          float band = pow(max(0.0, 1.0 - abs(dot(d, normalize(vec3(0.35, 0.25, -0.9)))) * 3.2), 3.0);
          float milky = n3(d * 18.0) * 0.65 + n3(d * 42.0) * 0.35;
          nightC += vec3(0.032, 0.042, 0.072) * band * (0.35 + 0.65 * milky) * smoothstep(0.05, 0.35, y);

          // луна
          float md = dot(d, uSunDir);
          float moon = smoothstep(0.9999845, 0.9999905, md);
          float mare = 0.55 + 0.45 * n3(d * 320.0 + 3.0);
          nightC += vec3(0.92, 0.94, 1.0) * moon * 1.9 * mare;
          nightC += vec3(0.35, 0.45, 0.7) * pow(max(md, 0.0), 1200.0) * 0.6;

          // === CYBERPUNK глубокий насыщенный неоновый горизонт (без белой засветки!) ===
          vec3 cyberHorizon = vec3(0.0);
          float cyH = pow(1.0 - y, 10.0);
          float azWave = 0.5 + 0.5 * sin(atan(d.z, d.x) * 2.0 + 0.6);
          cyberHorizon += vec3(0.22, 0.05, 0.48) * cyH * 0.62;                           // глубокий #7B2FF7 purple
          cyberHorizon += vec3(0.00, 0.26, 0.38) * cyH * (0.28 + 0.24 * azWave);         // насыщенный cyan
          cyberHorizon += vec3(0.42, 0.04, 0.22) * pow(1.0 - y, 18.0) * (1.0 - azWave);  // глубокий #FF2A85 magenta
          cyberHorizon += vec3(0.24, 0.11, 0.03) * pow(1.0 - y, 26.0) * 0.45;            // тонкая полоса тёплого города
          nightC += cyberHorizon * uCyber;

          retColor = mix(retColor * (1.0 - uNight * 0.85), nightC, uNight);
        }
        gl_FragColor = vec4( retColor, 1.0 );`);
  };
  sky.material.customProgramCacheKey = () => "sky-night-cyber";
}

const SPLITS = { 4: [0, 55, 260, 1000, 1], 3: [0, 80, 460, 1], 2: [0, 150, 1], 1: [1] };

/**
 * createEnv(renderer, scene, camera, tier) → { U, csm, cur, current, set, next, update, setCyber }
 * Должен быть создан ДО материалов (csm.setupMaterial).
 */
export function createEnv(renderer, scene, camera, tier) {
  renderer.shadowMap.enabled = tier.cascades > 0;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const far = 12000;
  const sky = new Sky(); sky.scale.setScalar(far); sky.frustumCulled = false; sky.renderOrder = -10; patchSky(sky); scene.add(sky);
  const cloudsHi = cloudLayer({ height: 2800, scale: 1 / 5200, oct: tier.cloudOct || 4, drift: 1.0 }); scene.add(cloudsHi);
  const cloudsLo = null;

  let csm = null;
  if (tier.cascades > 0) {
    const sp = SPLITS[tier.cascades] || SPLITS[3];
    csm = new CSM({
      camera, parent: scene, cascades: tier.cascades, maxFar: tier.shadowFar, shadowMapSize: tier.shadow, mode: "custom",
      customSplitsCallback: (n, near, f, target) => { for (let i = 1; i <= n; i++) target.push(sp[i] === 1 ? 1 : sp[i] / f); },
      lightDirection: new THREE.Vector3(0.3, -1, 0.2).normalize(), lightIntensity: 3, lightMargin: 400, lightNear: 1, lightFar: tier.shadowFar + 2500,
    });
    csm.fade = true;
    const nb = { 4: [0.05, 0.22, 0.8, 2.4], 3: [0.08, 0.4, 1.6], 2: [0.15, 1.0], 1: [0.5] }[tier.cascades];
    csm.lights.forEach((l, i) => { l.shadow.normalBias = nb[i]; l.shadow.bias = -0.00004; });
  }
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5); scene.add(hemi);

  // IBL из приватной копии неба + «подстилающая» поверхность
  const envScene = new THREE.Scene();
  const envSky = new Sky(); envSky.scale.setScalar(far * 0.5); envScene.add(envSky);
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(far * 0.4, 48), new THREE.MeshBasicMaterial({ color: 0x4a4a46 }));
  envGround.rotation.x = -Math.PI / 2; envGround.position.y = -4; envScene.add(envGround);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;

  const cur = {};
  const start = PRESETS.day;
  for (const k of NUM) cur[k] = start[k];
  for (const k of COL) cur[k] = new THREE.Color(start[k]);
  let from = null, to = null, t0 = 0, dur = 1, envDirty = true, ticks = 0;
  let current = "day";

  const sunDir = U.uSunDir.value;
  function apply() {
    const sd = dirFrom(cur.skyEl, cur.az);
    for (const s of [sky, envSky]) {
      const u = s.material.uniforms;
      u.turbidity.value = cur.turb; u.rayleigh.value = cur.ray; u.mieCoefficient.value = cur.mie; u.mieDirectionalG.value = cur.mieG;
      u.sunPosition.value.copy(sd);
    }
    sunDir.copy(dirFrom(cur.el, cur.az));
    if (csm) {
      csm.lightDirection.copy(sunDir).negate();
      for (const l of csm.lights) { l.intensity = cur.sunI; l.color.copy(cur.sunC); }
    }
    hemi.color.copy(cur.hemiS); hemi.groundColor.copy(cur.hemiG); hemi.intensity = cur.hemiI;
    renderer.toneMappingExposure = cur.exp;
    U.uNight.value = cur.night;
    scene.environmentIntensity = cur.envI;
    for (const c of [cloudsHi]) {
      const cu = c.material.uniforms;
      cu.uLit.value.copy(cur.cloudLit); cu.uShade.value.copy(cur.cloudShade); cu.uA.value = cur.cloudA; cu.uSunC.value.copy(cur.sunC);
    }
    envGround.material.color.setRGB(0.28, 0.28, 0.25)
      .lerp(new THREE.Color(0.22, 0.16, 0.36), cur.night * 0.85);
    csm && (csm.lightIntensity = cur.sunI);
  }
  function regenEnv() {
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0, 1, far);
    scene.environment = envRT.texture;
  }
  apply(); regenEnv(); envDirty = false;

  // ---------- CYBER TRANSITION ----------
  let cyberMode = false;
  let cyberTween = null; // { startVal, endVal, t0, dur }

  function setCyber(on, seconds = 0.65) {
    cyberMode = on;
    const target = on ? "cyber" : "day";
    current = target;
    if (seconds <= 0.01) {
      const dst = PRESETS[target];
      for (const k of NUM) cur[k] = dst[k];
      for (const k of COL) cur[k].set(dst[k]);
      to = null;
      cyberTween = null;
      U.uCyber.value = on ? 1 : 0;
      apply();
      regenEnv();
      envDirty = false;
      return;
    }
    from = {}; for (const k of NUM) from[k] = cur[k]; for (const k of COL) from[k] = cur[k].clone();
    to = PRESETS[target];
    if (Math.abs(to.az - from.az) > 180) from.az += to.az > from.az ? 360 : -360;
    t0 = performance.now() / 1000; dur = Math.max(seconds, 0.001);
    cyberTween = { startVal: U.uCyber.value, endVal: on ? 1 : 0, t0: performance.now() / 1000, dur };
  }

  return {
    U, csm, cur, sky, cloudsHi, cloudsLo,
    get current() { return current; },
    get cyberMode() { return cyberMode; },
    setCyber,
    set(name, seconds = 3) {
      if (!PRESETS[name]) return;
      current = name;
      from = {}; for (const k of NUM) from[k] = cur[k]; for (const k of COL) from[k] = cur[k].clone();
      to = PRESETS[name];
      if (Math.abs(to.az - from.az) > 180) from.az += to.az > from.az ? 360 : -360;
      t0 = performance.now() / 1000; dur = Math.max(seconds, 0.001);
    },
    next(seconds = 3) {
      const i = PRESET_ORDER.indexOf(current);
      const nextName = PRESET_ORDER[(i + 1) % PRESET_ORDER.length];
      this.set(nextName, seconds);
      return nextName;
    },
    update(camera, dt) {
      if (to) {
        const rawK = Math.min((performance.now() / 1000 - t0) / dur, 1);
        // power4 ease для ударного перехода
        const e = cyberMode !== null ? 1 - Math.pow(1 - rawK, 4) : rawK * rawK * (3 - 2 * rawK);
        for (const n of NUM) cur[n] = THREE.MathUtils.lerp(from[n], to[n], e);
        for (const c of COL) cur[c].copy(from[c]).lerp(new THREE.Color(to[c]), e);
        apply();
        if (++ticks % 6 === 0 || rawK >= 1) envDirty = true;
        if (rawK >= 1) to = null;
      }
      // uCyber tween
      if (cyberTween) {
        const rawK = Math.min((performance.now() / 1000 - cyberTween.t0) / cyberTween.dur, 1);
        const e = 1 - Math.pow(1 - rawK, 4); // power4.out
        U.uCyber.value = THREE.MathUtils.lerp(cyberTween.startVal, cyberTween.endVal, e);
        if (rawK >= 1) cyberTween = null;
      }
      if (envDirty) { regenEnv(); envDirty = false; }
      sky.position.copy(camera.position);
      cloudsHi.position.set(camera.position.x, cloudsHi.position.y, camera.position.z);
      if (csm) { camera.updateMatrixWorld(); csm.update(); }
      void dt;
    },
    refit() { if (csm) csm.updateFrustums(); },
  };
}
