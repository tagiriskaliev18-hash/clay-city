// ============================================================
// CLAY CITY v3 — материалы. Все освещаемые материалы проходят через std():
// там подключаются каскадные тени (CSM) и патчи шейдера.
// ============================================================
import * as THREE from "three";
import { Textures } from "./textures.js";
import { U } from "./env.js";

// реестры для анимации «день/ночь»
export const REG = {
  windows: [],   // { m, k } — эмиссия окон (ночью)
  glow: [],      // { m, k } — эмиссивные лампы/огни (ночью)
  basic: [],     // { m, rgb, k, day } — unlit-неон: цвет = day + night·k
};

/** Патч фасада: UV в метрах × масштаб инстанса + целочисленный сдвиг по окнам. */
function facadePatch(cellW, cellH, tile) {
  const src = `
#include <uv_vertex>
#ifdef USE_INSTANCING
  vec2 sI = vec2(0.5 * (length(instanceMatrix[0].xyz) + length(instanceMatrix[2].xyz)), length(instanceMatrix[1].xyz));
  vec3 itI = instanceMatrix[3].xyz;
  vec2 jI = vec2(floor(mod(abs(itI.x) * 7.31 + abs(itI.z) * 3.17, 8.0)), floor(mod(abs(itI.z) * 5.13 + abs(itI.x) * 1.71, 8.0)))
          * vec2(${(cellW / tile).toFixed(5)}, ${(cellH / tile).toFixed(5)});
  #ifdef USE_MAP
    vMapUv = vMapUv * sI + jI;
  #endif
  #ifdef USE_NORMALMAP
    vNormalMapUv = vNormalMapUv * sI + jI;
  #endif
  #ifdef USE_EMISSIVEMAP
    vEmissiveMapUv = vEmissiveMapUv * sI + jI;
  #endif
  #ifdef USE_METALNESSMAP
    vMetalnessMapUv = vMetalnessMapUv * sI + jI;
  #endif
  #ifdef USE_ROUGHNESSMAP
    vRoughnessMapUv = vRoughnessMapUv * sI + jI;
  #endif
#endif`;
  return (sh) => {
    if (!sh.vertexShader.includes("#include <uv_vertex>")) throw new Error("uv_vertex chunk missing");
    sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", src);
  };
}

export function createMaterials({ csm, S }) {
  const T = Textures;
  const facadeKeys = { glass: [3, 3], stone: [6, 3], stoneRibbon: [6, 3], panel: [6, 3], res: [4, 3] };

  function finish(m, { patch = null, key = null } = {}) {
    if (csm) {
      csm.setupMaterial(m);
      const base = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => { base(sh, r); if (patch) patch(sh); };
    } else if (patch) m.onBeforeCompile = patch;
    if (key) m.customProgramCacheKey = () => key;
    m.receiveShadow = true;
    return m;
  }
  const std = (params, o) => finish(new THREE.MeshStandardMaterial(params), o);

  // ---------- фасады ----------
  const M = {};
  for (const [name, maker] of Object.entries({ glass: T.glass, stone: T.stone, stoneRibbon: T.stoneRibbon, panel: T.panel, res: T.res })) {
    const t = maker(S);
    const [cw, ch] = facadeKeys[name];
    const m = std({
      map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, metalnessMap: t.metalnessMap,
      emissiveMap: t.emissiveMap, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0,
      roughness: 1, metalness: 1, envMapIntensity: 1.0,
    }, { patch: facadePatch(cw, ch, t.tile), key: "facade" });
    REG.windows.push({ m, k: name === "glass" ? 1.5 : 1.9 });
    M[name] = m;
  }

  // ---------- крыши, бетон, металлы ----------
  const plate = (L, tile, extra = {}) => {
    const rep = 1 / tile;
    return std({
      map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(5, rep),
      roughnessMap: L.texture("o", { repeat: rep }), metalnessMap: L.texture("o", { repeat: rep }),
      roughness: 1, metalness: 1, ...extra,
    });
  };
  {
    const t = T.roof(S), rep = 1 / t.tile;
    M.roof = std({ map: t.map, normalMap: t.normalMap, roughness: 0.92, metalness: 0.02, envMapIntensity: 0.5 });
    const c = T.concrete(S, { base: "#b4b0a8", tile: 4, rough: 0.82 }), rc = 1 / c.tile;
    M.concrete = std({ map: c.map, normalMap: c.normalMap, roughness: 0.82, metalness: 0, envMapIntensity: 0.6 });
    const c2 = T.concrete(S, { base: "#8f8c86", tile: 3, rough: 0.86, seed: 6 }), rc2 = 1 / c2.tile;
    M.concreteDark = std({ map: c2.map, normalMap: c2.normalMap, roughness: 0.86, metalness: 0, envMapIntensity: 0.5 });
    M.steel = plate(T.steel(S), 6);
    M.brass = plate(T.brass(S), 4.8, { envMapIntensity: 1.2 });
    M.copper = plate(T.copper(S), 4.8, { envMapIntensity: 1.1 });
    M.whitePlate = plate(T.white(S), 6);
    void rc; void rc2;
    const g = T.gold(S), rg = 1 / g.tile;
    M.gold = std({ map: g.map, normalMap: g.normalMap, roughness: 0.2, metalness: 1.0, envMapIntensity: 1.5, emissive: new THREE.Color(0xffb347), emissiveIntensity: 0 });
    REG.glow.push({ m: M.gold, k: 0.55 });
    const lz = T.lattice(S), rl = 1 / lz.tile;
    M.lattice = std({ map: lz.map, normalMap: lz.normalMap, roughnessMap: lz.roughnessMap, metalnessMap: lz.metalnessMap, roughness: 1, metalness: 1, emissiveMap: lz.emissiveMap, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0, envMapIntensity: 1.2 });
    REG.glow.push({ m: M.lattice, k: 1.1 });
    const dg = T.diagrid(S), rd = 1 / dg.tile;
    M.diagrid = std({ map: dg.map, normalMap: dg.normalMap, roughnessMap: dg.roughnessMap, metalnessMap: dg.metalnessMap, roughness: 1, metalness: 1, emissiveMap: dg.emissiveMap, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0, envMapIntensity: 1.2 }, {
      key: "diagrid",
      patch: (sh) => {
        sh.uniforms.uTime = U.uTime; sh.uniforms.uNight = U.uNight;
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vH;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vH = worldPosition.y;");
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", `#include <common>
            uniform float uTime; uniform float uNight; varying float vH;
            vec3 led(float y, float t) {
              vec3 a = vec3(0.05, 0.55, 1.0), b = vec3(1.0, 0.12, 0.62), c = vec3(0.1, 0.95, 0.8);
              float w = 0.5 + 0.5 * sin(y * 0.085 + t * 0.9), w2 = 0.5 + 0.5 * sin(y * 0.05 - t * 0.6 + 2.0);
              return mix(mix(a, b, w), c, w2 * 0.55) * (0.55 + 0.45 * sin(y * 0.4 + t * 3.0));
            }`)
          .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
            totalEmissiveRadiance *= mix(vec3(0.02, 0.03, 0.05), led(vH, uTime) * 2.4, uNight);`);
      },
    });
  }

  // ---------- простые ----------
  M.whitePaint = std({ color: 0xf1efe8, roughness: 0.42, metalness: 0.12, envMapIntensity: 0.9 });
  M.offPaint = std({ color: 0xd9d5cb, roughness: 0.5, metalness: 0.08 });
  M.darkMetal = std({ color: 0x2b2e31, roughness: 0.48, metalness: 0.85, envMapIntensity: 1.0 });
  M.midMetal = std({ color: 0x55595e, roughness: 0.5, metalness: 0.8 });
  M.glassDark = std({ color: 0x0c1318, roughness: 0.08, metalness: 0.8, envMapIntensity: 1.6 });
  M.glassClear = std({ color: 0x1a2a33, roughness: 0.06, metalness: 0.85, envMapIntensity: 1.5, transparent: true, opacity: 0.55 });
  M.marble = std({ color: 0xe9e4da, roughness: 0.3, metalness: 0.02, envMapIntensity: 0.9 });
  M.turquoise = std({ color: 0x2f8fa3, roughness: 0.28, metalness: 0.55, envMapIntensity: 1.1 });
  M.blueDome = std({ color: 0x5aa7d8, roughness: 0.3, metalness: 0.5, envMapIntensity: 1.1 });
  M.wood = std({ color: 0x6b4a2e, roughness: 0.7, metalness: 0 });
  M.fabricShade = std({ color: 0x2a2622, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  M.blackRubber = std({ color: 0x141414, roughness: 0.85, metalness: 0 });

  // обшивка дирижабля: UV (u — вдоль корпуса, v — вокруг), окна пассажирской палубы светятся ночью
  {
    const h = T.hull();
    M.hull = std({ map: h.map, normalMap: h.normalMap, roughnessMap: h.roughnessMap, metalnessMap: h.metalnessMap, emissiveMap: h.emissiveMap, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0, roughness: 1, metalness: 1, envMapIntensity: 0.9 });
    REG.windows.push({ m: M.hull, k: 2.0 });
    M.hullMap = h.map;
  }

  /** Эмиссивный «ламповый» материал: днём тёмный, ночью горит. */
  M.glow = (hex, k = 3, base = 0x111214) => {
    const m = std({ color: base, emissive: new THREE.Color(hex), emissiveIntensity: 0, roughness: 0.45, metalness: 0.1 });
    REG.glow.push({ m, k });
    return m;
  };
  /** Unlit-неон (HDR-цвет, не зависит от света): виден только ночью. */
  M.neon = (hex, k = 5, day = 0.0) => {
    const m = new THREE.MeshBasicMaterial({ color: 0x000000 });
    REG.basic.push({ m, rgb: new THREE.Color(hex), k, day });
    return m;
  };
  /** Фабрика освещаемого материала с каскадными тенями и опциональным патчем шейдера. */
  M.std = std;
  M.glowColor = { windowWarm: 0xffc890, windowCool: 0xbcd4ff, lamp: 0xffd9a0, red: 0xff2a1a, green: 0x2bff7d, white: 0xf2f8ff, cyan: 0x46f2ff, magenta: 0xff3dd8, amber: 0xffb347 };
  return M;
}

/** Применить состояние ночи ко всем реестрам. */
export function applyNight(night, time) {
  for (const w of REG.windows) w.m.emissiveIntensity = night * w.k;
  for (const g of REG.glow) g.m.emissiveIntensity = night * g.k;
  const flick = 0.92 + 0.08 * Math.sin(time * 31.0) * Math.sin(time * 17.3);
  for (const b of REG.basic) b.m.color.copy(b.rgb).multiplyScalar(b.day + night * b.k * flick);
}
