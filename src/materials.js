// ============================================================
// ASTANA REAL v2 — materials.js
// Фотореалистичные PBR-материалы (реальные текстуры ./assets/pbr/),
// CSM-тени, зеркальное стекло, кластерный оконный шейдер
// небоскрёбов и мокрые лужи на асфальте при uCyber / uNight / uSunset.
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

const texLoader = new THREE.TextureLoader();

function loadPBR(prefix, tile = 4, { normalScale = 1.0 } = {}) {
  const rep = 1 / tile;
  const prep = (url, srgb) => {
    const t = texLoader.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
    t.anisotropy = 8;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  };
  return {
    map: prep(`./assets/pbr/${prefix}_col.jpg`, true),
    normalMap: prep(`./assets/pbr/${prefix}_nor.jpg`, false),
    roughnessMap: prep(`./assets/pbr/${prefix}_rough.jpg`, false),
    normalScale: new THREE.Vector2(normalScale, normalScale),
  };
}

/** Патч фасада: UV в метрах × масштаб инстанса + реалистичный кластерный оконный шейдер. */
function facadePatch(cellW, cellH, tile, isGlass = true) {
  const uvSrc = `
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
    sh.uniforms.uCyber = U.uCyber;
    sh.uniforms.uNight = U.uNight;
    if (sh.vertexShader.includes("#include <uv_vertex>")) {
      sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", uvSrc);
    }
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        varying vec2 vWinMeters;
        varying float vBldSeed;
        varying float vWallMask;`)
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
        #ifdef USE_INSTANCING
          vec3 winOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 winNrm = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
        #else
          vec3 winOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 winNrm = normalize(mat3(modelMatrix) * objectNormal);
        #endif
        vBldSeed = fract(sin(dot(winOrigin.xz, vec2(12.9898, 78.233))) * 43758.5453);
        vWallMask = 1.0 - smoothstep(0.55, 0.85, abs(winNrm.y));
        #ifdef USE_MAP
          vWinMeters = vMapUv * ${tile.toFixed(2)};
        #else
          vWinMeters = vec2(worldPosition.x + worldPosition.z, worldPosition.y);
        #endif`);

    const bayW = isGlass ? 2.1 : 2.6;
    const floorH = 3.4;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform float uCyber;
        uniform float uNight;
        varying vec2 vWinMeters;
        varying float vBldSeed;
        varying float vWallMask;
        float winHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        vec2 mLocal = vec2(fract(vWinMeters.x / ${bayW.toFixed(2)}), fract(vWinMeters.y / ${floorH.toFixed(2)}));
        float mullionX = step(0.08, mLocal.x) * step(mLocal.x, 0.92);
        float spandrelY = step(${isGlass ? "0.24" : "0.32"}, mLocal.y) * step(mLocal.y, ${isGlass ? "0.93" : "0.88"});
        float paneMask = mullionX * spandrelY * vWallMask;
        ${isGlass
          ? "roughnessFactor = mix(0.30, 0.055, paneMask);"
          : "roughnessFactor = mix(roughnessFactor, 0.09, paneMask);"}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        {
          vec2 cell = vec2(floor(vWinMeters.x / ${bayW.toFixed(2)}), floor(vWinMeters.y / ${floorH.toFixed(2)}));
          vec2 loc = vec2(fract(vWinMeters.x / ${bayW.toFixed(2)}), fract(vWinMeters.y / ${floorH.toFixed(2)}));
          float pane = step(0.08, loc.x) * step(loc.x, 0.92) * step(${isGlass ? "0.24" : "0.32"}, loc.y) * step(loc.y, ${isGlass ? "0.93" : "0.88"}) * vWallMask;
          float floorOn = step(0.32, winHash(vec2(cell.y, vBldSeed * 19.3)));
          float suiteId = floor(vWinMeters.x / ${(bayW * 3.0).toFixed(2)});
          float suiteH = winHash(vec2(suiteId + vBldSeed * 13.7, cell.y * 1.41));
          float bayH = winHash(cell + vec2(vBldSeed * 7.1, vBldSeed * 3.9));
          float occ = floorOn * step(0.42, suiteH * 0.65 + bayH * 0.35);
          float blind = step(0.68, winHash(cell * 2.13)) * step(0.64, loc.y);
          float ceilGrad = mix(0.48, 1.12, smoothstep(0.24, 0.92, loc.y)) * (1.0 - blind * 0.72);
          float tempMix = winHash(vec2(suiteId * 1.7 + vBldSeed, cell.y));
          vec3 warmCol = vec3(1.0, 0.74, 0.44);
          vec3 coolCol = vec3(0.80, 0.91, 1.0);
          vec3 winTone = mix(warmCol, coolCol, smoothstep(0.30, 0.78, tempMix));
          float cyberPick = winHash(vec2(cell.y * 3.1 + suiteId, vBldSeed * 29.0));
          vec3 cyberAcc = cyberPick > 0.90 ? vec3(0.05, 0.92, 1.0) : (cyberPick > 0.84 ? vec3(1.0, 0.24, 0.56) : winTone);
          winTone = mix(winTone, cyberAcc, uCyber * 0.65);
          float strength = (0.55 + 0.65 * bayH) * ceilGrad;
          totalEmissiveRadiance = winTone * strength * uNight * (1.35 + uCyber * 0.45) * pane * occ;
        }`);
  };
}

/** Патч мокрого асфальта: днём сухой матовый, при uCyber / uNight / uSunset — зеркальные лужи без серого шума. */
function wetAsphaltPatch() {
  return (sh) => {
    sh.uniforms.uCyber = U.uCyber;
    sh.uniforms.uNight = U.uNight;
    sh.uniforms.uSunset = U.uSunset;
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWetW;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWetW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform float uCyber; uniform float uNight; uniform float uSunset; uniform float uTime; varying vec3 vWetW;
        float wetHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float wetNoise(vec2 p){
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(wetHash(i), wetHash(i + vec2(1.0, 0.0)), f.x),
                     mix(wetHash(i + vec2(0.0, 1.0)), wetHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        float wetPuddle = smoothstep(0.44, 0.68, wetNoise(vWetW.xz * 0.030) * 0.68 + wetNoise(vWetW.xz * 0.088) * 0.32);
        float wetAmt = clamp(uCyber * 0.98 + uNight * 0.32 + uSunset * 0.20, 0.0, 1.0);
        diffuseColor.rgb *= mix(1.0, mix(0.48, 0.18, wetPuddle), wetAmt);`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, mix(0.30, 0.022, wetPuddle), wetAmt);`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        normal = normalize(mix(normal, nonPerturbedNormal, wetPuddle * wetAmt * 0.94));`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        {
          vec3 V = normalize(cameraPosition - vWetW);
          float fresnel = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.5);
          float streak = 0.55 + 0.45 * sin(vWetW.x * 0.24 + vWetW.z * 0.19 + sin(vWetW.z * 0.05) * 3.0);
          float neonBand = wetNoise(vWetW.xz * 0.014 + vec2(0.0, uTime * 0.015));
          vec3 cCyan = vec3(0.0, 0.72, 0.98);
          vec3 cMag  = vec3(0.96, 0.14, 0.56);
          vec3 cWarm = vec3(1.0, 0.64, 0.26);
          vec3 reflGlow = mix(mix(cCyan, cMag, smoothstep(0.35, 0.72, neonBand)), cWarm, 0.35 * (1.0 - uCyber));
          float reflStr = wetPuddle * (0.28 + 0.72 * fresnel) * streak * (uCyber * 0.52 + uNight * 0.14 + uSunset * 0.08);
          totalEmissiveRadiance += reflGlow * reflStr;
        }`);
  };
}

export function createMaterials({ csm, S }) {
  const T = Textures;
  const facadeKeys = {
    glass: [3, 3], glassBlue: [3, 3], glassGold: [3, 3], glassEmerald: [3, 3],
    stone: [6, 3], stoneRibbon: [6, 3], panel: [6, 3], res: [4, 3],
  };

  function setup(m) {
    if (csm) csm.setupMaterial(m);
    m.receiveShadow = true;
    return m;
  }

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
  M.setup = setup;

  // ---------- Архитектурное стекло (MeshPhysicalMaterial: отражает реальный HDRI неба!) ----------
  for (const [name, maker] of Object.entries({
    glass: T.glass, glassBlue: T.glassBlue, glassGold: T.glassGold, glassEmerald: T.glassEmerald,
  })) {
    const t = maker(S);
    const [cw, ch] = facadeKeys[name];
    const m = phys({
      map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, metalnessMap: t.metalnessMap,
      emissiveMap: t.emissiveMap, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0,
      roughness: 0.95, metalness: 0.92,
      clearcoat: 1.0, clearcoatRoughness: 0.05, reflectivity: 1.0,
      envMapIntensity: 1.65,
    }, { patch: facadePatch(cw, ch, t.tile, true), key: `facade-glass-${name}-v2` });
    REG.windows.push({ m, k: 1.65 });
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
      roughness: 1, metalness: 1, envMapIntensity: 1.05,
    }, { patch: facadePatch(cw, ch, t.tile, false), key: `facade-stone-${name}-v2` });
    REG.windows.push({ m, k: 1.75 });
    M[name] = m;
  }

  // ---------- Архитектурные материалы Астаны (реальные PBR-карты из ./assets/pbr/) ----------
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
    M.roof = std({ map: rf.map, normalMap: rf.normalMap, roughness: 0.90, metalness: 0.04, envMapIntensity: 0.50 });

    const c = T.concrete(S, { base: "#bcb8b0", tile: 4, rough: 0.80 });
    M.concrete = std({ map: c.map, normalMap: c.normalMap, roughness: 0.82, metalness: 0.0, envMapIntensity: 0.55 });

    const rockPBR = loadPBR("rock", 6, { normalScale: 1.05 });
    M.rock = std({ ...rockPBR, roughness: 0.94, metalness: 0.02, envMapIntensity: 0.55 });
    M.concreteDark = std({ ...rockPBR, color: 0x9c9890, roughness: 0.88, metalness: 0.02, envMapIntensity: 0.48 });

    // Травертин (Акорда, Дом Министерств, Арка, КМГ, Beijing Palace)
    const travPBR = loadPBR("travertine", 5, { normalScale: 0.9 });
    M.travertine = std({ ...travPBR, roughness: 0.88, metalness: 0.02, envMapIntensity: 0.82 });

    // Полированный чёрный гранит Nero (стилобат QazaqGaz, набережная Есиль, бульвар)
    const neroPBR = loadPBR("nero", 5, { normalScale: 0.85 });
    M.nero = phys({ ...neroPBR, roughness: 0.50, metalness: 0.08, clearcoat: 0.55, clearcoatRoughness: 0.14, envMapIntensity: 1.28 });
    M.granite = std({ ...neroPBR, color: 0xb8b5b2, roughness: 0.62, metalness: 0.07, envMapIntensity: 1.15 });

    // Светлый гранит (бульвар Нуржол, тротуары, MEGA 1F)
    const granPBR = loadPBR("granite", 4.5, { normalScale: 0.85 });
    M.graniteLight = std({ ...granPBR, roughness: 0.72, metalness: 0.04, envMapIntensity: 0.95 });

    // Асфальт с реальными PBR-картами + мокрые зеркальные лужи
    const aspPBR = loadPBR("asphalt", 7, { normalScale: 1.15 });
    M.asphalt = std({
      ...aspPBR,
      roughness: 1.0, metalness: 0.04, envMapIntensity: 1.35,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }, { patch: wetAsphaltPatch(), key: "wet-asphalt-v2" });

    // Брусчатка / городская подложка кварталов
    const paverPBR = loadPBR("paver", 4.5, { normalScale: 0.95 });
    M.paver = std({ ...paverPBR, roughness: 0.92, metalness: 0.02, envMapIntensity: 0.55 });
    M.groundUrban = std({
      ...paverPBR,
      color: 0xbcb8ae, roughness: 0.90, metalness: 0.02, envMapIntensity: 0.45,
      polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
    });

    // Газон
    const gs = T.grass(S);
    M.grass = std({
      map: gs.map, normalMap: gs.normalMap, roughness: 0.94, metalness: 0.0, envMapIntensity: 0.32,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });

    // Мрамор (лобби, стилобаты, Байтерек, MEGA 2F, Beijing Lobby)
    const marblePBR = loadPBR("marble", 4, { normalScale: 0.55 });
    M.marble = phys({
      ...marblePBR,
      roughness: 0.34, metalness: 0.04, clearcoat: 0.72, clearcoatRoughness: 0.10, envMapIntensity: 1.25,
    });

    // Дерево / орех (интерьеры, скамейки, перголы, кафе)
    const walnutPBR = loadPBR("walnut", 3, { normalScale: 0.85 });
    M.walnut = std({ ...walnutPBR, roughness: 0.58, metalness: 0.02, envMapIntensity: 0.90 });
    M.wood = M.walnut;

    // Кора
    const barkPBR = loadPBR("bark", 2, { normalScale: 1.1 });
    M.bark = std({ ...barkPBR, roughness: 0.96, metalness: 0.0, envMapIntensity: 0.35 });

    M.steel = plate(T.steel(S), 6, { envMapIntensity: 1.25 });
    M.brass = plate(T.brass(S), 4.8, { envMapIntensity: 1.45 });
    M.copper = plate(T.copper(S), 4.8, { envMapIntensity: 1.2 });
    M.whitePlate = plate(T.white(S), 6, { envMapIntensity: 0.95 });

    // Золотой шар Байтерека + купола/шпили
    const g = T.gold(S);
    M.gold = phys({
      map: g.map, normalMap: g.normalMap,
      roughness: 0.15, metalness: 0.96, clearcoat: 0.85, clearcoatRoughness: 0.07,
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
  M.turquoise = phys({ color: 0x2095b0, roughness: 0.22, metalness: 0.45, clearcoat: 0.7, envMapIntensity: 1.35 });
  M.blueDome = phys({ color: 0x2b8cd4, roughness: 0.22, metalness: 0.42, clearcoat: 0.8, envMapIntensity: 1.45 });
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
