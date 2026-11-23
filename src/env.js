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
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

// общие юниформы для всех кастомных шейдеров
export const U = {
  uTime:   { value: 0 },
  uNight:  { value: 0 },
  uCyber:  { value: 0 },
  uSunset: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
};

const HDRI_PATHS = {
  day:    "./assets/hdri/kloofendal_48d_partly_cloudy_puresky_1k.hdr",
  sunset: "./assets/hdri/evening_road_01_puresky_1k.hdr",
  cyber:  "./assets/hdri/nightcity_env.hdr",
};

// ---------- ПРЕСЕТЫ ----------
export const PRESETS = {
  day: {
    skyEl: 26, el: 28, az: 214, sunI: 5.2, sunC: "#fff2dc", hemiS: "#8ab8eb", hemiG: "#3d352c", hemiI: 0.24, envI: 0.92,
    turb: 1.7, ray: 1.55, mie: 0.0028, mieG: 0.80, exp: 0.78, night: 0, fogC: "#b8d4ee", fogZ: "#5a92d0", fogD: 0.26, glow: 0.35,
    cloudLit: "#ffffff", cloudShade: "#9ab0ca", cloudA: 0.42, bloomS: 0.14, bloomT: 0.96, bloomR: 0.4,
    sat: 1.07, con: 1.05, tint: "#ffffff", tintAmt: 0, vignette: 0.14, grain: 0.015, ca: 0.0003,
    sunsetMix: 0,
  },
  sunset: {
    skyEl: 4.5, el: 10.5, az: 238, sunI: 4.8, sunC: "#ff9b52", hemiS: "#c89678", hemiG: "#281e1a", hemiI: 0.22, envI: 0.78,
    turb: 4.6, ray: 2.1, mie: 0.0062, mieG: 0.85, exp: 0.76, night: 0.04, fogC: "#d69c78", fogZ: "#7d7ea8", fogD: 0.32, glow: 0.85,
    cloudLit: "#ffc896", cloudShade: "#6f6072", cloudA: 0.50, bloomS: 0.24, bloomT: 0.86, bloomR: 0.48,
    sat: 1.09, con: 1.06, tint: "#1b2a52", tintAmt: 0.18, vignette: 0.24, grain: 0.024, ca: 0.0007,
    sunsetMix: 1,
  },
  night: {
    skyEl: -16, el: 38, az: 150, sunI: 0.42, sunC: "#8cb0ff", hemiS: "#162442", hemiG: "#05070c", hemiI: 0.14, envI: 0.38,
    turb: 2, ray: 0.6, mie: 0.002, mieG: 0.8, exp: 0.98, night: 1, fogC: "#091020", fogZ: "#03060c", fogD: 0.22, glow: 0,
    cloudLit: "#202b44", cloudShade: "#070b14", cloudA: 0.36, bloomS: 0.34, bloomT: 0.88, bloomR: 0.44,
    sat: 1.12, con: 1.08, tint: "#0a2240", tintAmt: 0.22, vignette: 0.32, grain: 0.03, ca: 0.001,
    sunsetMix: 0,
  },
  // CYBERPUNK 2077 — глубокая контрастная неоновая ночь Найт-Сити
  cyber: {
    skyEl: -18, el: 38, az: 150, sunI: 0.32, sunC: "#6f92ff", hemiS: "#0d112a", hemiG: "#03040a", hemiI: 0.12, envI: 0.42,
    turb: 1.5, ray: 0.35, mie: 0.001, mieG: 0.8, exp: 0.90, night: 1, fogC: "#090b18", fogZ: "#020308", fogD: 0.18, glow: 0,
    cloudLit: "#141028", cloudShade: "#04060d", cloudA: 0.24, bloomS: 0.34, bloomT: 0.90, bloomR: 0.44,
    sat: 1.15, con: 1.12, tint: "#080c24", tintAmt: 0.18, vignette: 0.34, grain: 0.028, ca: 0.0010,
    sunsetMix: 0,
  },
};
export const PRESET_ORDER = ["day", "sunset", "night"];
const NUM = ["skyEl", "el", "az", "sunI", "hemiI", "envI", "turb", "ray", "mie", "mieG", "exp", "night", "fogD", "glow", "cloudA", "bloomS", "bloomT", "bloomR", "sat", "con", "tintAmt", "vignette", "grain", "ca", "sunsetMix"];
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

function patchSky(sky, hdrUniforms) {
  sky.material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      uNight: U.uNight, uCyber: U.uCyber, uSunset: U.uSunset, uSunDir: U.uSunDir, uTime: U.uTime,
      ...hdrUniforms,
    });
    sh.fragmentShader = sh.fragmentShader
      .replace("void main() {", `
        uniform float uNight; uniform float uCyber; uniform float uSunset; uniform float uTime; uniform vec3 uSunDir;
        uniform sampler2D uHdrDay; uniform sampler2D uHdrSunset; uniform sampler2D uHdrCyber;
        uniform float uHasHdrDay; uniform float uHasHdrSunset; uniform float uHasHdrCyber;
        float h31(vec3 p){ p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        vec2 dirToEquirectUV(vec3 dir){
          float u = atan(dir.z, dir.x) * 0.15915494 + 0.5;
          float v = asin(clamp(dir.y, -1.0, 1.0)) * 0.31830989 + 0.5;
          return vec2(u, v);
        }
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
          vec2 hdrUv = dirToEquirectUV(vec3(d.x, max(d.y, 0.012), d.z));
          float skyMask = smoothstep(-0.02, 0.16, d.y);

          // === реальное HDRI только для дня и заката (отключается в Night/Cyber, чтобы уличные HDRI-лампы не попадали в небо!) ===
          float hdrBlend = 1.0 - clamp(max(uNight, uCyber), 0.0, 1.0);
          vec3 dayHdr = texture2D(uHdrDay, hdrUv).rgb * 0.72;
          vec3 sunHdr = texture2D(uHdrSunset, hdrUv).rgb * 0.85;
          vec3 dayMix = mix(
            mix(retColor, dayHdr, uHasHdrDay * skyMask * 0.78 * hdrBlend),
            mix(retColor, sunHdr, uHasHdrSunset * skyMask * 0.80 * hdrBlend),
            uSunset
          );

          // === чистое звёздное ночное / Cyberpunk 2077 небо (без проекции nightcity_env.hdr на купол) ===
          vec3 nightZenith = mix(vec3(0.0018, 0.0026, 0.0080), vec3(0.0016, 0.0028, 0.0110), uCyber);
          vec3 nightMid = mix(vec3(0.010, 0.014, 0.032), vec3(0.008, 0.015, 0.042), uCyber);
          vec3 nightC = mix(nightMid, nightZenith, pow(y, 0.44));
          float hor = pow(1.0 - y, 16.0);
          nightC += vec3(0.042, 0.026, 0.016) * hor * (1.0 - uCyber * 0.45);
          nightC += vec3(0.010, 0.024, 0.052) * pow(1.0 - y, 5.5);

          // Лёгкие тёмные грозовые облака верхнего яруса на ночном небе
          float storm1 = n3(vec3(d.xz / max(d.y + 0.16, 0.12) * 1.4, uTime * 0.008));
          float storm2 = n3(vec3(d.xz / max(d.y + 0.16, 0.12) * 3.1 + 4.2, uTime * 0.012));
          float stormMask = smoothstep(0.46, 0.78, storm1 * 0.65 + storm2 * 0.35) * smoothstep(0.03, 0.32, y);
          vec3 stormCol = mix(vec3(0.012, 0.018, 0.038), vec3(0.008, 0.024, 0.046), uCyber);
          nightC = mix(nightC, stormCol, stormMask * (0.42 + 0.25 * uCyber));

          // звёзды (приглушаются только за плотными ночными облаками)
          vec3 cell = floor(d * 900.0); vec3 fr = fract(d * 900.0) - 0.5;
          float hs = h31(cell);
          float star = smoothstep(0.34, 0.0, length(fr)) * step(0.9940, hs);
          float tw = 0.6 + 0.4 * sin(uTime * (1.5 + hs * 5.0) + hs * 80.0);
          float starClear = 1.0 - stormMask * 0.72;
          nightC += mix(vec3(0.75, 0.84, 1.0), vec3(1.0, 0.88, 0.72), step(0.9985, hs)) * star * tw * (0.42 + hs * 3.0) * smoothstep(0.02, 0.24, d.y) * starClear;

          // Млечный путь (гладкий, trilinear n3)
          float band = pow(max(0.0, 1.0 - abs(dot(d, normalize(vec3(0.35, 0.25, -0.9)))) * 3.2), 3.0);
          float milky = n3(d * 18.0) * 0.65 + n3(d * 42.0) * 0.35;
          nightC += vec3(0.030, 0.044, 0.080) * band * (0.35 + 0.65 * milky) * smoothstep(0.05, 0.35, y) * starClear;

          // луна
          float md = dot(d, uSunDir);
          float moon = smoothstep(0.9999845, 0.9999905, md);
          float mare = 0.55 + 0.45 * n3(d * 320.0 + 3.0);
          nightC += vec3(0.92, 0.94, 1.0) * moon * 1.9 * mare;
          nightC += vec3(0.35, 0.45, 0.7) * pow(max(md, 0.0), 1200.0) * 0.6;

          // === CYBERPUNK мягкое цианово-янтарное свечение мегаполиса у горизонта ===
          float az = atan(d.z, d.x);
          float azWave = 0.5 + 0.5 * sin(az * 2.0 + 0.6);
          vec3 cyberHorizon = vec3(0.008, 0.085, 0.135) * pow(1.0 - y, 14.0) * (0.55 + 0.45 * azWave);
          cyberHorizon += vec3(0.115, 0.062, 0.014) * pow(1.0 - y, 18.0) * (1.15 - 0.55 * azWave);
          nightC += cyberHorizon * uCyber;

          retColor = mix(dayMix * (1.0 - max(uNight, uCyber) * 0.88), nightC, max(uNight, uCyber));
        }
        gl_FragColor = vec4( retColor, 1.0 );`);
  };
  sky.material.customProgramCacheKey = () => "sky-hdri-night-cyber";
}

const SPLITS = { 4: [0, 38, 180, 750, 1], 3: [0, 60, 340, 1], 2: [0, 130, 1], 1: [1] };

/**
 * createEnv(renderer, scene, camera, tier) → { U, csm, cur, current, set, next, update, setCyber, readyPromise }
 * Должен быть создан ДО материалов (csm.setupMaterial).
 */
export function createEnv(renderer, scene, camera, tier) {
  renderer.shadowMap.enabled = tier.cascades > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const hdrUniforms = {
    uHdrDay: { value: null }, uHdrSunset: { value: null }, uHdrCyber: { value: null },
    uHasHdrDay: { value: 0 }, uHasHdrSunset: { value: 0 }, uHasHdrCyber: { value: 0 },
  };

  const far = 12000;
  const sky = new Sky(); sky.scale.setScalar(far); sky.frustumCulled = false; sky.renderOrder = -10; patchSky(sky, hdrUniforms); scene.add(sky);
  const cloudsHi = cloudLayer({ height: 2800, scale: 1 / 5200, oct: tier.cloudOct || 4, drift: 1.0 }); scene.add(cloudsHi);
  const cloudsLo = null;

  let csm = null;
  if (tier.cascades > 0) {
    const sp = SPLITS[tier.cascades] || SPLITS[3];
    csm = new CSM({
      camera, parent: scene, cascades: tier.cascades, maxFar: tier.shadowFar, shadowMapSize: tier.shadow, mode: "custom",
      customSplitsCallback: (n, near, f, target) => { for (let i = 1; i <= n; i++) target.push(sp[i] === 1 ? 1 : sp[i] / f); },
      lightDirection: new THREE.Vector3(0.3, -1, 0.2).normalize(), lightIntensity: 3, lightMargin: 240, lightNear: 1, lightFar: tier.shadowFar + 2200,
    });
    csm.fade = true;
    const nb = { 4: [0.035, 0.16, 0.65, 2.0], 3: [0.06, 0.35, 1.4], 2: [0.12, 0.85], 1: [0.45] }[tier.cascades];
    csm.lights.forEach((l, i) => { l.shadow.normalBias = nb[i]; l.shadow.bias = -0.00003; });
  }
  const hemi = new THREE.HemisphereLight(0xffffff, 0x33302b, 0.24); scene.add(hemi);

  // Реальные HDRI IBL + fallback процедурного неба до завершения загрузки
  const envScene = new THREE.Scene();
  const envSky = new Sky(); envSky.scale.setScalar(far * 0.5); envScene.add(envSky);
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(far * 0.4, 48), new THREE.MeshBasicMaterial({ color: 0x3e3b36 }));
  envGround.rotation.x = -Math.PI / 2; envGround.position.y = -4; envScene.add(envGround);
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  let envRT = null;

  const hdrEnvs = { day: null, sunset: null, cyber: null };
  const rgbeLoader = new RGBELoader();

  const cur = {};
  const start = PRESETS.day;
  for (const k of NUM) cur[k] = start[k];
  for (const k of COL) cur[k] = new THREE.Color(start[k]);
  let from = null, to = null, t0 = 0, dur = 1, envDirty = true, ticks = 0;
  let current = "day";

  const sunDir = U.uSunDir.value;
  function activeHdrKey() {
    if (cur.night > 0.45 || U.uCyber.value > 0.45) return "cyber";
    if (cur.sunsetMix > 0.45) return "sunset";
    return "day";
  }

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
    U.uSunset.value = cur.sunsetMix;
    scene.environmentIntensity = cur.envI;
    for (const c of [cloudsHi]) {
      const cu = c.material.uniforms;
      cu.uLit.value.copy(cur.cloudLit); cu.uShade.value.copy(cur.cloudShade); cu.uA.value = cur.cloudA; cu.uSunC.value.copy(cur.sunC);
    }
    envGround.material.color.setRGB(0.24, 0.24, 0.21)
      .lerp(new THREE.Color(0.20, 0.14, 0.34), cur.night * 0.85);
    csm && (csm.lightIntensity = cur.sunI);
  }
  function regenEnv() {
    const key = activeHdrKey();
    const hdr = hdrEnvs[key];
    if (hdr && hdr.pmremRT) {
      scene.environment = hdr.pmremRT.texture;
      return;
    }
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0, 1, far);
    scene.environment = envRT.texture;
  }
  apply(); regenEnv(); envDirty = false;

  const readyPromise = Promise.all(
    Object.entries(HDRI_PATHS).map(([key, url]) =>
      rgbeLoader.loadAsync(url).then((tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        const pmremRT = pmrem.fromEquirectangular(tex);
        hdrEnvs[key] = { tex, pmremRT };
        if (key === "day") { hdrUniforms.uHdrDay.value = tex; hdrUniforms.uHasHdrDay.value = 1; }
        else if (key === "sunset") { hdrUniforms.uHdrSunset.value = tex; hdrUniforms.uHasHdrSunset.value = 1; }
        else if (key === "cyber") { hdrUniforms.uHdrCyber.value = tex; hdrUniforms.uHasHdrCyber.value = 1; }
        if (activeHdrKey() === key) regenEnv();
      }).catch((err) => {
        console.warn(`[astana] HDRI load failed (${key}):`, err);
      })
    )
  );

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
    U, csm, cur, sky, cloudsHi, cloudsLo, readyPromise,
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
