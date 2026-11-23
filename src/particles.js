// ============================================================
// CLAY CITY v3 — частицы (GPU):
//   1. Угольки и атмосферные искры (закат/ночь)
//   2. Дым из заводских труб промзоны (vents type="smoke")
//   3. Паровые клапаны по кромкам парящих платформ (vents type="steam")
// ============================================================
import * as THREE from "three";
import { rng, between } from "./geom.js";
import { softSprite, puffSprite } from "./textures.js";

export function buildParticles(scene, _M, ctx, { vents = [] } = {}) {
  const group = new THREE.Group();
  group.name = "particles-v3";
  scene.add(group);
  const r = rng(77123);
  const scale = (ctx.tier && ctx.tier.particles) || 1.0;

  // ---------- 1. Атмосферные угольки / огни в воздухе ----------
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
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: ctx.U.uTime,
        uNight: ctx.U.uNight,
        uMap: { value: softSprite(64) },
      },
      vertexShader: `
        attribute vec4 aSeed;
        uniform float uTime;
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
        uniform sampler2D uMap;
        uniform float uNight;
        varying float vAlpha;
        void main() {
          float m = texture2D(uMap, gl_PointCoord).a;
          vec3 col = mix(vec3(1.0, 0.72, 0.42), vec3(0.35, 0.88, 1.0), uNight * 0.45);
          gl_FragColor = vec4(col, m * vAlpha * (0.12 + uNight * 0.42));
        }`,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    group.add(pts);
  }

  // ---------- 2. Пар и дым из труб / клапанов платформ ----------
  if (vents.length) {
    const perVent = Math.max(8, Math.round(18 * scale));
    const total = vents.length * perVent;
    const pos = new Float32Array(total * 3);
    const meta = new Float32Array(total * 4); // phase, speed, size, isSmoke
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
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: ctx.U.uTime,
        uNight: ctx.U.uNight,
        uMap: { value: puffSprite(128, 11) },
      },
      vertexShader: `
        attribute vec4 aMeta;
        uniform float uTime;
        varying float vLife;
        varying float vSmoke;
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
          gl_PointSize = clamp(sz * 340.0 / max(-mv.z, 12.0), 2.0, 140.0);
          vLife = life;
          vSmoke = aMeta.w;
        }`,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uNight;
        varying float vLife;
        varying float vSmoke;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a;
          float env = smoothstep(0.0, 0.16, vLife) * (1.0 - smoothstep(0.45, 1.0, vLife));
          vec3 smokeC = mix(vec3(0.45, 0.44, 0.46), vec3(0.14, 0.16, 0.22), uNight);
          vec3 steamC = mix(vec3(0.86, 0.88, 0.92), vec3(0.32, 0.45, 0.58), uNight);
          vec3 col = mix(steamC, smokeC, vSmoke);
          gl_FragColor = vec4(col, a * env * (vSmoke > 0.5 ? 0.34 : 0.28));
        }`,
    });
    const puffs = new THREE.Points(geo, mat);
    puffs.frustumCulled = false;
    group.add(puffs);
  }

  return { group, update() {} };
}
