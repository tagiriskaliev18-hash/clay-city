// ============================================================
// ASTANA 2077 — частицы (GPU):
//   РЕАЛЬНЫЙ РЕЖИМ: лёгкие брызги фонтанов на бульваре Нуржол
//   CYBERPUNK РЕЖИМ: атмосферный неоновый дождь, искры, пар из
//   стимпанк-градирен мегабашен, дым и светящиеся угольки
// ============================================================
import * as THREE from "three";
import { rng, between } from "./geom.js";
import { softSprite, puffSprite } from "./textures.js";
import { U } from "./env.js";

export function buildParticles(scene, _M, ctx, { airships = null, vents = [] } = {}) {
  const group = new THREE.Group();
  group.name = "particles-v3";
  scene.add(group);
  const r = rng(77123);
  const scale = (ctx.tier && ctx.tier.particles) || 1.0;

  // ---------- 1. ФОНТАНЫ БУЛЬВАРА НУРЖОЛ (точные координаты чаш из city.js) ----------
  const fountainGroup = new THREE.Group();
  fountainGroup.name = "fountain-particles";
  group.add(fountainGroup);
  {
    const N = Math.round(420 * scale);
    const fountainPositions = [
      { x: -679, z: 0, r: 4.0 },
      { x: -560, z: 0, r: 9.5 }, // Круглая площадь — большой центральный фонтан
      { x: -366, z: 0, r: 4.5 }, { x: -277, z: 0, r: 4.5 },
      { x: -189, z: 0, r: 4.5 }, { x: -100, z: 0, r: 4.5 },
      { x: 160, z: 0, r: 4.5 },  { x: 260, z: 0, r: 4.5 },
      { x: 360, z: 0, r: 4.5 },  { x: 460, z: 0, r: 4.5 },
    ];
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N * 4);
    const perFountain = Math.floor(N / fountainPositions.length);
    for (let fi = 0; fi < fountainPositions.length; fi++) {
      const fp = fountainPositions[fi];
      for (let i = 0; i < perFountain; i++) {
        const idx = fi * perFountain + i;
        if (idx >= N) break;
        const a = r() * Math.PI * 2;
        const rad = Math.sqrt(r()) * fp.r;
        pos[idx * 3] = fp.x + Math.cos(a) * rad;
        pos[idx * 3 + 1] = 1.05;
        pos[idx * 3 + 2] = fp.z + Math.sin(a) * rad;
        seed[idx * 4] = r() * 10;
        seed[idx * 4 + 1] = 0.8 + r() * 0.6;
        seed[idx * 4 + 2] = r() * 6.28;
        seed[idx * 4 + 3] = 1.2 + r() * 1.6;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: U.uTime, uCyber: U.uCyber, uMap: { value: softSprite(64) } },
      vertexShader: `
        attribute vec4 aSeed; uniform float uTime;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          float t = mod(uTime * aSeed.y + aSeed.x, 4.0);
          float life = t / 4.0;
          p.y += life * 12.0 - life * life * 8.0; // параболическая траектория
          p.x += sin(aSeed.z + t * 2.0) * 2.5 * life;
          p.z += cos(aSeed.z + t * 1.5) * 2.5 * life;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(aSeed.w * 180.0 / max(-mv.z, 10.0), 1.0, 10.0);
          vAlpha = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.6, 1.0, life));
        }`,
      fragmentShader: `
        uniform sampler2D uMap; uniform float uCyber;
        varying float vAlpha;
        void main() {
          float m = texture2D(uMap, gl_PointCoord).a;
          vec3 col = mix(vec3(0.7, 0.85, 1.0), vec3(0.5, 0.9, 1.0), 0.5);
          gl_FragColor = vec4(col, m * vAlpha * (1.0 - uCyber) * 0.4);
        }`,
    });
    fountainGroup.add(new THREE.Points(geo, mat));
  }

  // ---------- 2. НЕОНОВЫЙ ДОЖДЬ И ИСКРЫ (только кибер-режим) ----------
  const cyberGroup = new THREE.Group();
  cyberGroup.name = "cyber-particles";
  group.add(cyberGroup);
  {
    const N = Math.round(1200 * scale);
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      const a = r() * Math.PI * 2;
      const rr = 50 + r() * 1500;
      pos[i * 3] = Math.cos(a) * rr;
      pos[i * 3 + 1] = 50 + r() * 400;
      pos[i * 3 + 2] = Math.sin(a) * rr;
      seed[i * 4] = r() * 10;
      seed[i * 4 + 1] = 0.5 + r() * 1.1;
      seed[i * 4 + 2] = r() * 6.28;
      seed[i * 4 + 3] = 1.5 + r() * 3.0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: U.uTime, uCyber: U.uCyber, uMap: { value: softSprite(64) } },
      vertexShader: `
        attribute vec4 aSeed; uniform float uTime, uCyber;
        varying float vAlpha; varying float vType;
        void main() {
          vec3 p = position;
          float t = uTime * aSeed.y + aSeed.x;
          // Дождь: падение вниз
          p.y -= mod(t * 35.0, 350.0);
          p.x += sin(t * 0.3 + aSeed.z) * 5.0;
          p.z += cos(t * 0.25 + aSeed.z) * 5.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          // искры крупнее, дождь тоньше
          vType = step(0.85, aSeed.y);
          gl_PointSize = clamp((vType > 0.5 ? aSeed.w * 1.5 : aSeed.w * 0.6) * 200.0 / max(-mv.z, 10.0), 1.0, 12.0);
          vAlpha = (0.3 + 0.7 * sin(t * 2.0 + aSeed.z)) * uCyber;
        }`,
      fragmentShader: `
        uniform sampler2D uMap; varying float vAlpha; varying float vType;
        void main() {
          float m = texture2D(uMap, gl_PointCoord).a;
          // циановые искры и розовый дождь
          vec3 col = mix(vec3(0.0, 0.96, 1.0), vec3(1.0, 0.16, 0.52), vType);
          gl_FragColor = vec4(col, m * vAlpha * 0.35);
        }`,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    cyberGroup.add(pts);
  }

  // ---------- 3. ПАР И ДЫМ ИЗ ГРАДИРЕН МЕГАБАШЕН ----------
  if (vents.length) {
    const perVent = Math.max(8, Math.round(18 * scale));
    const total = vents.length * perVent;
    const pos = new Float32Array(total * 3);
    const meta = new Float32Array(total * 4);
    let idx = 0;
    for (const v of vents) {
      const isSmoke = v.type === "smoke" ? 1 : 0;
      for (let k = 0; k < perVent; k++) {
        pos[idx * 3] = v.pos.x;
        pos[idx * 3 + 1] = v.pos.y;
        pos[idx * 3 + 2] = v.pos.z;
        meta[idx * 4] = k / perVent + r() * 0.08;
        meta[idx * 4 + 1] = isSmoke ? between(r, 0.06, 0.10) : between(r, 0.14, 0.22);
        meta[idx * 4 + 2] = isSmoke ? between(r, 26, 46) : between(r, 12, 22);
        meta[idx * 4 + 3] = isSmoke;
        idx++;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aMeta", new THREE.BufferAttribute(meta, 4));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: U.uTime, uNight: U.uNight, uCyber: U.uCyber, uMap: { value: puffSprite(128, 11) } },
      vertexShader: `
        attribute vec4 aMeta; uniform float uTime, uCyber;
        varying float vLife; varying float vSmoke;
        void main() {
          float life = fract(aMeta.x + uTime * aMeta.y);
          vec3 p = position;
          float h = aMeta.w > 0.5 ? 115.0 : 38.0;
          p.y += life * h;
          p.x += life * (aMeta.w > 0.5 ? 48.0 : 12.0) + sin(life * 5.0 + aMeta.x * 12.0) * 5.0;
          p.z += life * (aMeta.w > 0.5 ? 24.0 : 8.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float sz = aMeta.z * (0.4 + life * 1.45);
          gl_PointSize = clamp(sz * 340.0 / max(-mv.z, 12.0), 2.0, 140.0) * uCyber;
          vLife = life; vSmoke = aMeta.w;
        }`,
      fragmentShader: `
        uniform sampler2D uMap; uniform float uNight, uCyber;
        varying float vLife; varying float vSmoke;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a;
          float env = smoothstep(0.0, 0.16, vLife) * (1.0 - smoothstep(0.45, 1.0, vLife));
          vec3 smokeC = mix(vec3(0.45, 0.44, 0.46), vec3(0.14, 0.16, 0.22), uNight);
          vec3 steamC = mix(vec3(0.86, 0.88, 0.92), vec3(0.32, 0.45, 0.58), uNight);
          vec3 col = mix(steamC, smokeC, vSmoke);
          gl_FragColor = vec4(col, a * env * uCyber * (vSmoke > 0.5 ? 0.34 : 0.28));
        }`,
    });
    const puffs = new THREE.Points(geo, mat);
    puffs.frustumCulled = false;
    cyberGroup.add(puffs);
  }

  // ---------- 4. АТМОСФЕРНЫЕ УГОЛЬКИ / ОГНИ В ВОЗДУХЕ (ночь/кибер) ----------
  {
    const N = Math.round(700 * scale);
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      const a = r() * Math.PI * 2;
      const rr = 120 + r() * 1300;
      pos[i * 3] = Math.cos(a) * rr;
      pos[i * 3 + 1] = 18 + r() * 340;
      pos[i * 3 + 2] = Math.sin(a) * rr;
      seed[i * 4] = r() * 10;
      seed[i * 4 + 1] = 0.5 + r() * 1.1;
      seed[i * 4 + 2] = r() * 6.28;
      seed[i * 4 + 3] = 2.0 + r() * 3.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: U.uTime, uNight: U.uNight, uCyber: U.uCyber, uMap: { value: softSprite(64) } },
      vertexShader: `
        attribute vec4 aSeed; uniform float uTime;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          float t = uTime * aSeed.y + aSeed.x;
          p.y += mod(t * 6.0, 140.0) - 70.0;
          p.x += sin(t * 0.7 + aSeed.z) * 14.0;
          p.z += cos(t * 0.6 + aSeed.z) * 14.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(aSeed.w * 260.0 / max(-mv.z, 10.0), 1.5, 16.0);
          vAlpha = 0.35 + 0.65 * sin(t * 1.8 + aSeed.z);
        }`,
      fragmentShader: `
        uniform sampler2D uMap; uniform float uNight, uCyber;
        varying float vAlpha;
        void main() {
          float m = texture2D(uMap, gl_PointCoord).a;
          vec3 col = mix(vec3(1.0, 0.72, 0.42), vec3(0.0, 0.96, 1.0), uCyber * 0.72);
          // Днём (uNight=0, uCyber=0) полностью скрыты — чистая солнечная Астана!
          float vis = uNight * 0.36 + uCyber * 0.38;
          if (vis < 0.01) discard;
          gl_FragColor = vec4(col, m * vAlpha * vis);
        }`,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    group.add(pts);
  }

  return { group, update() {} };
}
