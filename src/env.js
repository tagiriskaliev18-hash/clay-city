// ============================================================
// CLAY CITY v3 — окружение: физическое небо (Preetham) + ночь (луна,
// звёзды, засветка города), два слоя облаков, каскадные тени (CSM),
// IBL из неба (PMREM). Три пресета: day / sunset / night, плавный переход.
// ============================================================
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { CSM } from "three/addons/csm/CSM.js";

// общие юниформы для всех кастомных шейдеров
export const U = {
  uTime: { value: 0 },
  uNight: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },   // направление НА солнце/луну
};

export const PRESETS = {
  day: {
    skyEl: 33, el: 35, az: 214, sunI: 3.1, sunC: "#fff4e2", hemiS: "#cfe0f6", hemiG: "#6e675c", hemiI: 0.5, envI: 0.85,
    turb: 3.4, ray: 1.15, mie: 0.0042, mieG: 0.8, exp: 0.5, night: 0, fogC: "#b8cbdd", fogZ: "#7fa6d2", fogD: 0.85, glow: 0.35,
    cloudLit: "#ffffff", cloudShade: "#9fadc0", cloudA: 0.5, bloomS: 0.14, bloomT: 0.95, bloomR: 0.4,
    sat: 1.0, con: 1.03, tint: "#ffffff", tintAmt: 0, vignette: 0.22, grain: 0.025, ca: 0.0006,
  },
  sunset: {
    skyEl: 4.5, el: 9.5, az: 238, sunI: 3.6, sunC: "#ffae6c", hemiS: "#f1c9a6", hemiG: "#4b3d31", hemiI: 0.5, envI: 0.7,
    turb: 5.2, ray: 2.3, mie: 0.0075, mieG: 0.86, exp: 0.56, night: 0.04, fogC: "#dfb08c", fogZ: "#a9a3c6", fogD: 1.1, glow: 1.0,
    cloudLit: "#ffd3a6", cloudShade: "#8f8090", cloudA: 0.58, bloomS: 0.26, bloomT: 0.85, bloomR: 0.5,
    sat: 1.06, con: 1.05, tint: "#1b2a52", tintAmt: 0.22, vignette: 0.3, grain: 0.035, ca: 0.001,
  },
  night: {
    skyEl: -16, el: 44, az: 150, sunI: 0.09, sunC: "#a2b8ff", hemiS: "#1a2740", hemiG: "#05070b", hemiI: 0.32, envI: 0.28,
    turb: 2, ray: 0.6, mie: 0.002, mieG: 0.8, exp: 0.9, night: 1, fogC: "#0b1420", fogZ: "#04070d", fogD: 0.7, glow: 0,
    cloudLit: "#263044", cloudShade: "#0b101a", cloudA: 0.42, bloomS: 0.36, bloomT: 0.88, bloomR: 0.45,
    sat: 1.1, con: 1.06, tint: "#0a2240", tintAmt: 0.3, vignette: 0.4, grain: 0.05, ca: 0.0014,
  },
};
export const PRESET_ORDER = ["sunset", "night", "day"];
const NUM = ["skyEl", "el", "az", "sunI", "hemiI", "envI", "turb", "ray", "mie", "mieG", "exp", "night", "fogD", "glow", "cloudA", "bloomS", "bloomT", "bloomR", "sat", "con", "tintAmt", "vignette", "grain", "ca"];
const COL = ["sunC", "hemiS", "hemiG", "fogC", "fogZ", "cloudLit", "cloudShade", "tint"];

export function dirFrom(el, az) {
  const e = THREE.MathUtils.degToRad(el), a = THREE.MathUtils.degToRad(az);
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
}

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
        // затенение: сдвиг к солнцу показывает толщину
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
    Object.assign(sh.uniforms, { uNight: U.uNight, uSunDir: U.uSunDir, uTime: U.uTime });
    sh.fragmentShader = sh.fragmentShader
      .replace("void main() {", `
        uniform float uNight; uniform float uTime; uniform vec3 uSunDir;
        float h31(vec3 p){ p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float n3(vec3 p){
          vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
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
          vec3 nightC = mix(vec3(0.010, 0.015, 0.032), vec3(0.0012, 0.002, 0.005), pow(y, 0.45));
          float hor = pow(1.0 - y, 14.0);
          nightC += vec3(0.105, 0.062, 0.030) * hor;                     // натриевый свет города
          nightC += vec3(0.016, 0.04, 0.058) * pow(1.0 - y, 4.5);        // неоновая дымка
          vec3 cell = floor(d * 900.0); vec3 fr = fract(d * 900.0) - 0.5;
          float hs = h31(cell);
          float star = smoothstep(0.34, 0.0, length(fr)) * step(0.9945, hs);
          float tw = 0.6 + 0.4 * sin(uTime * (1.5 + hs * 5.0) + hs * 80.0);
          nightC += mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.7), step(0.9985, hs)) * star * tw * (0.35 + hs * 3.0) * smoothstep(0.0, 0.25, d.y);
          float band = pow(max(0.0, 1.0 - abs(dot(d, normalize(vec3(0.35, 0.25, -0.9)))) * 3.2), 3.0);
          float milky = n3(d * 18.0) * 0.65 + n3(d * 42.0) * 0.35;
          nightC += vec3(0.036, 0.046, 0.072) * band * (0.35 + 0.65 * milky) * smoothstep(0.05, 0.35, y);
          float md = dot(d, uSunDir);
          float moon = smoothstep(0.9999845, 0.9999905, md);
          float mare = 0.55 + 0.45 * n3(d * 320.0 + 3.0);
          nightC += vec3(0.92, 0.94, 1.0) * moon * 1.9 * mare;
          nightC += vec3(0.35, 0.45, 0.7) * pow(max(md, 0.0), 1200.0) * 0.6;
          retColor = mix(retColor * (1.0 - uNight * 0.85), nightC, uNight);
        }
        gl_FragColor = vec4( retColor, 1.0 );`);
  };
  sky.material.customProgramCacheKey = () => "sky-night";
}

const SPLITS = { 4: [0, 55, 260, 1000, 1], 3: [0, 80, 460, 1], 2: [0, 150, 1], 1: [1] };

/**
 * createEnv(renderer, scene, camera, tier) → { U, csm, cur, current, set, next, update }
 * Должен быть создан ДО материалов (csm.setupMaterial).
 */
export function createEnv(renderer, scene, camera, tier) {
  renderer.shadowMap.enabled = tier.cascades > 0;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const far = 90000;
  const sky = new Sky(); sky.scale.setScalar(far); sky.frustumCulled = false; sky.renderOrder = -10; patchSky(sky); scene.add(sky);
  const cloudsHi = cloudLayer({ height: 3400, scale: 1 / 5200, oct: tier.cloudOct, drift: 1.0 }); scene.add(cloudsHi);
  const cloudsLo = cloudLayer({ height: -520, scale: 1 / 3600, oct: Math.max(3, tier.cloudOct - 1), drift: -0.7 }); scene.add(cloudsLo);

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
  const start = PRESETS.sunset;
  for (const k of NUM) cur[k] = start[k];
  for (const k of COL) cur[k] = new THREE.Color(start[k]);
  let from = null, to = null, t0 = 0, dur = 1, envDirty = true, ticks = 0;
  let current = "sunset";

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
    for (const c of [cloudsHi, cloudsLo]) {
      const cu = c.material.uniforms;
      cu.uLit.value.copy(cur.cloudLit); cu.uShade.value.copy(cur.cloudShade); cu.uA.value = cur.cloudA; cu.uSunC.value.copy(cur.sunC);
    }
    envGround.material.color.setRGB(0.26, 0.25, 0.22).lerp(new THREE.Color(0.9, 0.5, 0.22), cur.night * 0.8);
    csm && (csm.lightIntensity = cur.sunI);
  }
  function regenEnv() {
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0, 1, far);
    scene.environment = envRT.texture;
  }
  apply(); regenEnv(); envDirty = false;

  return {
    U, csm, cur, sky, cloudsHi, cloudsLo,
    get current() { return current; },
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
      this.set(PRESET_ORDER[(i + 1) % PRESET_ORDER.length], seconds);
    },
    update(camera, dt) {
      if (to) {
        const k = Math.min((performance.now() / 1000 - t0) / dur, 1), e = k * k * (3 - 2 * k);
        for (const n of NUM) cur[n] = THREE.MathUtils.lerp(from[n], to[n], e);
        for (const c of COL) cur[c].copy(from[c]).lerp(new THREE.Color(to[c]), e);
        apply();
        if (++ticks % 6 === 0 || k >= 1) envDirty = true;
        if (k >= 1) to = null;
      }
      if (envDirty) { regenEnv(); envDirty = false; }
      cloudsHi.position.set(camera.position.x, cloudsHi.position.y, camera.position.z);
      cloudsLo.position.set(camera.position.x, cloudsLo.position.y, camera.position.z);
      if (csm) { camera.updateMatrixWorld(); csm.update(); }
      void dt;
    },
    refit() { if (csm) csm.updateFrustums(); },
  };
}
