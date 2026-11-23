// ============================================================
// ASTANA REAL v2 — materials.js
// Фотореалистичные PBR-материалы с поддержкой CSM-теней,
// зеркального архитектурного стекла (MeshPhysicalMaterial),
// травертина/гранита/мрамора и мокрого асфальта при uCyber > 0.
// ============================================================
import * as THREE from "three";
import { Textures } from "./textures.js";
import { U } from "./env.js";

// Реестры для анимации «день/ночь/киберпанк»
export const REG = {
  windows: [],   // { m, k } — эмиссия окон (ночью / в кибер-режиме)
  glow: [],      // { m, k } — эмиссивные лампы/огни
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
    if (!sh.vertexShader.includes("#include <uv_vertex>")) return;
    sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", src);
  };
}

/** Патч мокрого асфальта: днём сухой матовый, при uCyber > 0 появляются влажные зеркальные лужи. */
function wetAsphaltPatch() {
  return (sh) => {
    sh.uniforms.uCyber = U.uCyber;
    sh.uniforms.uNight = U.uNight;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWetW;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWetW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform float uCyber; uniform float uNight; varying vec3 vWetW;
        float wetHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float wetNoise(vec2 p){
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(wetHash(i), wetHash(i + vec2(1.0, 0.0)), f.x),
                     mix(wetHash(i + vec2(0.0, 1.0)), wetHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        float puddle = smoothstep(0.32, 0.72, wetNoise(vWetW.xz * 0.035) * 0.65 + wetNoise(vWetW.xz * 0.11) * 0.35);
        float wetAmt = clamp(uCyber * 0.95 + uNight * 0.15, 0.0, 1.0);
        roughnessFactor = mix(roughnessFactor, mix(0.28, 0.06, puddle), wetAmt);`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        diffuseColor.rgb *= mix(1.0, 0.48, uCyber);`);
  };
}

export function createMaterials({ csm, S }) {
  const T = Textures;
  const facadeKeys = {
    glass: [3, 3], glassBlue: [3, 3], glassGold: [3, 3], glassEmerald: [3, 3],
    stone: [6, 3], stoneRibbon: [6, 3], panel: [6, 3], res: [4, 3],
  };

  function finish(m, { patch = null, key = null } = {}) {
    if (csm) {
      csm.setupMaterial(m);
      const base = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => { base(sh, r); if (patch) patch(sh); };
    } else if (patch) {
      m.onBeforeCompile = patch;
    }
    if (key) m.customProgramCacheKey = () => key;
    m.receiveShadow = true;
    return m;
  }
  const std = (params, o) => finish(new THREE.MeshStandardMaterial(params), o);
  const phys = (params, o) => finish(new THREE.MeshPhysicalMaterial(params), o);

  const M = {};

  // ---------- Архитектурное стекло (MeshPhysicalMaterial: отражает реальное небо днём!) ----------
  for (const [name, maker] of Object.entries({
    glass: T.glass, glassBlue: T.glassBlue, glassGold: T.glassGold, glassEmerald: T.glassEmerald,
  })) {
    const t = maker(S);
    const [cw, ch] = facadeKeys[name];
    const m = phys({
      map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, metalnessMap: t.metalnessMap,
      emissiveMap: t.emissiveMap, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0,
      roughness: 0.95, metalness: 0.95,
      clearcoat: 1.0, clearcoatRoughness: 0.06, reflectivity: 1.0,
      envMapIntensity: 1.75,
    }, { patch: facadePatch(cw, ch, t.tile), key: `facade-glass-${name}` });
    REG.windows.push({ m, k: 1.75 });
    M[name] = m;
  }

  // ---------- Каменные и жилые фасады ----------
  for (const [name, maker] of Object.entries({
    stone: T.stone, stoneRibbon: T.stoneRibbon, panel: T.panel, res: T.res,
  })) {
    const t = maker(S);
    const [cw, ch] = facadeKeys[name];
    const m = std({
      map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, metalnessMap: t.metalnessMap,
      emissiveMap: t.emissiveMap, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0,
      roughness: 1, metalness: 1, envMapIntensity: 1.15,
    }, { patch: facadePatch(cw, ch, t.tile), key: "facade-stone" });
    REG.windows.push({ m, k: 1.9 });
    M[name] = m;
  }

  // ---------- Архитектурные материалы Астаны ----------
  const plate = (L, tile, extra = {}) => {
    const rep = 1 / tile;
    return std({
      map: L.texture("a", { srgb: true, repeat: rep }),
      normalMap: L.normalTexture(4.5, rep),
      roughnessMap: L.texture("o", { repeat: rep }),
      metalnessMap: L.texture("o", { repeat: rep }),
      roughness: 1, metalness: 1, ...extra,
    });
  };
  {
    const rf = T.roof(S);
    M.roof = std({ map: rf.map, normalMap: rf.normalMap, roughness: 0.90, metalness: 0.04, envMapIntensity: 0.55 });

    const c = T.concrete(S, { base: "#bcb8b0", tile: 4, rough: 0.80 });
    M.concrete = std({ map: c.map, normalMap: c.normalMap, roughness: 0.80, metalness: 0.0, envMapIntensity: 0.6 });

    const c2 = T.concrete(S, { base: "#8e8b85", tile: 3, rough: 0.84, seed: 6 });
    M.concreteDark = std({ map: c2.map, normalMap: c2.normalMap, roughness: 0.84, metalness: 0.0, envMapIntensity: 0.5 });

    // Травертин (Акорда, Дом Министерств, Арка, КМГ)
    const tr = T.travertine(S);
    M.travertine = std({ map: tr.map, normalMap: tr.normalMap, roughnessMap: tr.roughnessMap, roughness: 0.92, metalness: 0.02, envMapIntensity: 0.75 });

    // Полированный гранит (стилобат QazaqGaz, бульвар Нуржол, набережная Есиль)
    const gr = T.granite(S, { base: "#5e5c5a", tile: 6, rough: 0.28, seed: 601 });
    M.granite = std({ map: gr.map, normalMap: gr.normalMap, roughnessMap: gr.roughnessMap, roughness: 0.85, metalness: 0.08, envMapIntensity: 1.15 });

    const grLight = T.granite(S, { base: "#c8c2b8", tile: 6, rough: 0.36, seed: 607 });
    M.graniteLight = std({ map: grLight.map, normalMap: grLight.normalMap, roughnessMap: grLight.roughnessMap, roughness: 0.88, metalness: 0.05, envMapIntensity: 0.95 });

    // Асфальт с мокрыми лужами в Cyberpunk-режиме!
    const as = T.asphalt(S);
    M.asphalt = std({
      map: as.map, normalMap: as.normalMap, roughnessMap: as.roughnessMap,
      roughness: 0.95, metalness: 0.04, envMapIntensity: 1.4,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }, { patch: wetAsphaltPatch(), key: "wet-asphalt" });

    // Газон и городская земля
    const gs = T.grass(S);
    M.grass = std({
      map: gs.map, normalMap: gs.normalMap, roughness: 0.94, metalness: 0.0, envMapIntensity: 0.35,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });

    const ug = T.urbanGround(S);
    M.groundUrban = std({
      map: ug.map, normalMap: ug.normalMap, roughness: 0.88, metalness: 0.02, envMapIntensity: 0.45,
      polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
    });

    M.steel = plate(T.steel(S), 6, { envMapIntensity: 1.25 });
    M.brass = plate(T.brass(S), 4.8, { envMapIntensity: 1.45 });
    M.copper = plate(T.copper(S), 4.8, { envMapIntensity: 1.2 });
    M.whitePlate = plate(T.white(S), 6, { envMapIntensity: 0.95 });

    // Золотой шар Байтерека + купола/шпили
    const g = T.gold(S);
    M.gold = phys({
      map: g.map, normalMap: g.normalMap,
      roughness: 0.16, metalness: 0.96, clearcoat: 0.8, clearcoatRoughness: 0.08,
      envMapIntensity: 1.85,
      emissive: new THREE.Color(0xffb84d), emissiveIntensity: 0,
    });
    REG.glow.push({ m: M.gold, k: 0.45 });

    // Витраж Пирамиды (Фостер)
    const lz = T.lattice(S);
    M.lattice = phys({
      map: lz.map, normalMap: lz.normalMap, roughnessMap: lz.roughnessMap, metalnessMap: lz.metalnessMap,
      roughness: 0.95, metalness: 0.9, clearcoat: 1.0, clearcoatRoughness: 0.08,
      emissiveMap: lz.emissiveMap, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0,
      envMapIntensity: 1.65,
    });
    REG.glow.push({ m: M.lattice, k: 1.25 });

    // Сфера «Нур Алем» (геодезический медиафасад)
    const dg = T.diagrid(S);
    M.diagrid = phys({
      map: dg.map, normalMap: dg.normalMap, roughnessMap: dg.roughnessMap, metalnessMap: dg.metalnessMap,
      roughness: 0.95, metalness: 0.9, clearcoat: 1.0, clearcoatRoughness: 0.06,
      emissiveMap: dg.emissiveMap, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0,
      envMapIntensity: 1.75,
    }, {
      key: "diagrid",
      patch: (sh) => {
        sh.uniforms.uTime = U.uTime; sh.uniforms.uNight = U.uNight;
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nvarying float vH;")
          .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvH = (modelMatrix * vec4(transformed, 1.0)).y;");
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", `#include <common>
            uniform float uTime; uniform float uNight; varying float vH;
            vec3 led(float y, float t) {
              vec3 a = vec3(0.05, 0.58, 1.0), b = vec3(1.0, 0.14, 0.62), c = vec3(0.05, 0.96, 0.92);
              float w = 0.5 + 0.5 * sin(y * 0.085 + t * 0.9), w2 = 0.5 + 0.5 * sin(y * 0.05 - t * 0.6 + 2.0);
              return mix(mix(a, b, w), c, w2 * 0.55) * (0.55 + 0.45 * sin(y * 0.4 + t * 3.0));
            }`)
          .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
            totalEmissiveRadiance *= mix(vec3(0.0), led(vH, uTime) * 2.5, uNight);`);
      },
    });
    REG.glow.push({ m: M.diagrid, k: 1.0 });
  }

  // ---------- Простые фотореалистичные материалы ----------
  M.whitePaint = std({ color: 0xf4f2ec, roughness: 0.36, metalness: 0.08, envMapIntensity: 0.95 });
  M.offPaint = std({ color: 0xddd8cc, roughness: 0.48, metalness: 0.06, envMapIntensity: 0.8 });
  M.darkMetal = std({ color: 0x262a30, roughness: 0.38, metalness: 0.85, envMapIntensity: 1.15 });
  M.midMetal = std({ color: 0x626a74, roughness: 0.36, metalness: 0.82, envMapIntensity: 1.15 });
  M.chrome = phys({ color: 0xe6ecf2, roughness: 0.12, metalness: 0.96, clearcoat: 0.6, envMapIntensity: 1.8 });
  M.glassDark = phys({ color: 0x162838, roughness: 0.08, metalness: 0.38, clearcoat: 1.0, clearcoatRoughness: 0.05, reflectivity: 1.0, envMapIntensity: 1.85 });
  M.glassClear = phys({ color: 0x5aa4c8, roughness: 0.06, metalness: 0.22, clearcoat: 1.0, transparent: true, opacity: 0.46, envMapIntensity: 1.75 });
  M.marble = std({ color: 0xf2eee6, roughness: 0.24, metalness: 0.02, envMapIntensity: 1.05 });
  M.turquoise = phys({ color: 0x2095b0, roughness: 0.22, metalness: 0.45, clearcoat: 0.7, envMapIntensity: 1.35 });
  M.blueDome = phys({ color: 0x2b8cd4, roughness: 0.22, metalness: 0.42, clearcoat: 0.8, envMapIntensity: 1.45 });
  M.wood = std({ color: 0x7a5434, roughness: 0.68, metalness: 0.02 });
  M.fabricShade = std({ color: 0x2a2622, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  M.blackRubber = std({ color: 0x141414, roughness: 0.85, metalness: 0 });

  // Обшивка дирижабля (для airships.js)
  {
    const h = T.hull();
    M.hull = std({
      map: h.map, normalMap: h.normalMap, roughnessMap: h.roughnessMap, metalnessMap: h.metalnessMap,
      emissiveMap: h.emissiveMap, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0,
      roughness: 1, metalness: 1, envMapIntensity: 0.95,
    });
    REG.windows.push({ m: M.hull, k: 2.0 });
    M.hullMap = h.map;
  }

  /** Эмиссивный ламповый материал: днём выключен, ночью/в кибер-режиме горит. */
  M.glow = (hex, k = 3, base = 0x181c22) => {
    const m = std({ color: base, emissive: new THREE.Color(hex), emissiveIntensity: 0, roughness: 0.4, metalness: 0.15 });
    REG.glow.push({ m, k });
    return m;
  };
  /** Unlit-неон: днём почти невидим (day), ночью/в кибер-режиме яркий HDR. */
  M.neon = (hex, k = 5, day = 0.0) => {
    const m = new THREE.MeshBasicMaterial({ color: 0x000000 });
    REG.basic.push({ m, rgb: new THREE.Color(hex), k, day });
    return m;
  };

  M.std = std;
  M.phys = phys;
  M.glowColor = {
    windowWarm: 0xffc890, windowCool: 0xbcd4ff, lamp: 0xffd9a0,
    red: 0xff2a1a, green: 0x2bff7d, white: 0xf2f8ff,
    cyan: 0x00f5ff, magenta: 0xff2a85, amber: 0xffb347,
  };
  return M;
}

/** Применить состояние ночи / Cyberpunk 2077 ко всем реестрам. */
export function applyNight(night, time) {
  const cyber = U.uCyber ? U.uCyber.value : 0;
  const winBoost = 1.0 + cyber * 0.35;
  for (const w of REG.windows) w.m.emissiveIntensity = night * w.k * winBoost;
  for (const g of REG.glow) g.m.emissiveIntensity = night * g.k * (1.0 + cyber * 0.25);
  const flick = 0.94 + 0.06 * Math.sin(time * 29.0) * Math.sin(time * 17.3);
  for (const b of REG.basic) b.m.color.copy(b.rgb).multiplyScalar(b.day + night * b.k * (1.0 + cyber * 0.3) * flick);
}
