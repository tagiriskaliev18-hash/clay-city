// ============================================================
// ASTANA 2077 — постобработка.
// Сцена → HDR(MSAA + depth) → AO по глубине + высотный туман → bloom →
// ACES → кино-грейдинг → [FXAA]. Туман и AO считаются по глубине.
// В киберпанк-режиме: selective bloom (threshold 0.85), хром. аберрация,
// виньетка, мокрый кибер-атмосферный туман.
// ============================================================
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { U } from "./env.js";

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const DEPTH_FNS = `
uniform mat4 uProjInv; uniform mat4 uCamMat; uniform float uNear; uniform float uFar;
vec3 viewPos(vec2 uv, float d) {
  vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return v.xyz / v.w;
}`;

const AO_FS = (SAMPLES) => `
#define SAMPLES ${SAMPLES}
uniform sampler2D tDepth; uniform vec2 uTexel; uniform float uProjScale, uRadiusK, uRMin, uRMax, uMaxPx, uIntensity, uFrame;
varying vec2 vUv;
${DEPTH_FNS}
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)) + uFrame)); }
void main() {
  float d0 = texture2D(tDepth, vUv).r;
  if (d0 >= 0.999999) { gl_FragColor = vec4(1.0); return; }
  vec3 P = viewPos(vUv, d0);
  float dist = max(-P.z, 0.05);
  vec2 ex = vec2(uTexel.x, 0.0), ey = vec2(0.0, uTexel.y);
  float dl = texture2D(tDepth, vUv - ex).r, dr = texture2D(tDepth, vUv + ex).r, dd = texture2D(tDepth, vUv - ey).r, du = texture2D(tDepth, vUv + ey).r;
  vec3 pl = viewPos(vUv - ex, dl), pr = viewPos(vUv + ex, dr), pd = viewPos(vUv - ey, dd), pu = viewPos(vUv + ey, du);
  vec3 dx = abs(pr.z - P.z) < abs(pl.z - P.z) ? pr - P : P - pl;
  vec3 dy = abs(pu.z - P.z) < abs(pd.z - P.z) ? pu - P : P - pd;
  vec3 N = cross(dx, dy);
  N = normalize(N * sign(N.z + 1e-7) + vec3(0.0, 0.0, 1e-7));
  float closeR = mix(0.65, 2.4, smoothstep(1.0, 24.0, dist));
  float farR = clamp(dist * uRadiusK, uRMin, uRMax);
  float radius = mix(closeR, farR, smoothstep(12.0, 60.0, dist));
  float radiusPx = clamp(radius * uProjScale / dist, 3.0, uMaxPx);
  float ang = ign(gl_FragCoord.xy) * 6.2831853;
  float occ = 0.0;
  float wSum = 0.0;
  float bias = mix(0.035, 0.09, smoothstep(2.0, 45.0, dist));
  for (int i = 0; i < SAMPLES; i++) {
    float fi = float(i);
    float a = ang + fi * 2.399963;
    float rr = sqrt((fi + 0.5) / float(SAMPLES));
    vec2 suv = clamp(vUv + vec2(cos(a), sin(a)) * rr * radiusPx * uTexel, vec2(0.001), vec2(0.999));
    float ds = texture2D(tDepth, suv).r;
    if (ds >= 0.999999) { wSum += 1.0; continue; }
    vec3 v = viewPos(suv, ds) - P;
    float vl = length(v);
    float ndv = dot(N, v) / max(vl, 1e-4);
    float falloff = 1.0 - smoothstep(radius * 0.25, radius * 1.15, vl);
    float rangeGate = step(vl, radius * 1.45);
    occ += max(0.0, ndv - bias) * falloff * rangeGate;
    wSum += 1.0;
  }
  float ao = clamp(1.0 - (occ / max(wSum, 1.0)) * (uIntensity * 2.45), 0.0, 1.0);
  float distFade = smoothstep(0.35, 0.85, dist) * (1.0 - smoothstep(210.0, 460.0, dist));
  ao = mix(1.0, ao, distFade);
  gl_FragColor = vec4(pow(ao, 1.35));
}`;

const BLUR_FS = `
uniform sampler2D tAO; uniform sampler2D tDepth; uniform vec2 uDir; uniform mat4 uProjInv;
varying vec2 vUv;
float linearZ(vec2 uv) {
  float d = texture2D(tDepth, uv).r;
  if (d >= 0.999999) return 16000.0;
  vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return max(-v.z / v.w, 0.05);
}
void main() {
  float z0 = linearZ(vUv);
  float a = texture2D(tAO, vUv).r;
  if (z0 > 1200.0) { gl_FragColor = vec4(a); return; }
  float w = 1.0;
  float thr = max(0.22, z0 * 0.032);
  float ws[3]; ws[0] = 0.72; ws[1] = 0.42; ws[2] = 0.20;
  for (int i = 1; i <= 3; i++) {
    vec2 o = uDir * float(i);
    float za = linearZ(vUv + o);
    float zb = linearZ(vUv - o);
    float wa = ws[i - 1] * exp(-abs(za - z0) / thr);
    float wb = ws[i - 1] * exp(-abs(zb - z0) / thr);
    a += texture2D(tAO, vUv + o).r * wa + texture2D(tAO, vUv - o).r * wb;
    w += wa + wb;
  }
  gl_FragColor = vec4(a / w);
}`;

const FOG_FS = `
uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform sampler2D tAO;
uniform float uFogDensity, uFogFalloff, uFogBase, uSunGlow, uAO, uNight, uCyber, uTime;
uniform vec3 uFogHorizon, uFogZenith, uSunColor; uniform vec3 uSunDir;
varying vec2 vUv;
${DEPTH_FNS}
void main() {
  vec4 col = texture2D(tDiffuse, vUv);
  float d = texture2D(tDepth, vUv).r;
  if (d < 0.999999) {
    vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
    vec3 P = (uCamMat * vec4(v.xyz / v.w, 1.0)).xyz;
    vec3 rel = P - cameraPosition;
    float dist = max(length(rel), 1e-4); vec3 dir = rel / dist;
    float ao = texture2D(tAO, vUv).r;
    col.rgb *= mix(1.0, ao, uAO);
    // экспоненциальный высотный туман с чистой ближней и средней зоной
    float x = (P.y - cameraPosition.y) * uFogFalloff;
    float k = abs(x) > 1e-3 ? (1.0 - exp(-x)) / x : 1.0 - 0.5 * x;
    float cyberFogBoost = 1.0 + uCyber * 0.22;
    float nearClear = smoothstep(180.0, 520.0, dist);
    float F = dist * uFogDensity * cyberFogBoost * exp(-max(cameraPosition.y - uFogBase, 0.0) * uFogFalloff) * k;
    float farBlend = smoothstep(2600.0, 4800.0, dist);
    float fog = max(clamp((1.0 - exp(-F)) * nearClear, 0.0, 0.56), farBlend * 0.96);
    vec3 fc = mix(uFogHorizon, uFogZenith, smoothstep(0.0, 0.55, dir.y));
    float mu = max(dot(dir, uSunDir), 0.0);
    fc += uSunColor * (pow(mu, 5.0) * 0.16 + pow(mu, 40.0) * 0.32 + pow(mu, 700.0) * 1.2) * uSunGlow;
    float ring = exp(-abs(P.y - uFogBase) / 220.0) * (1.0 - smoothstep(1200.0, 3800.0, length(P.xz)));
    fc += vec3(0.05, 0.025, 0.012) * ring * uNight * (1.0 - uCyber * 0.65) * (0.5 + 0.5 * exp(-dist / 2400.0));
    vec3 cyberFog = vec3(0.016, 0.008, 0.040) + vec3(0.0, 0.010, 0.018);
    fc += cyberFog * uCyber * ring;
    col.rgb = mix(col.rgb, fc, fog);
  }
  col.rgb = clamp(mix(vec3(0.0), col.rgb, step(vec3(-1.0), col.rgb)), vec3(0.0), vec3(64.0));
  gl_FragColor = col;
}`;

class AtmospherePass extends Pass {
  constructor(camera, tier) {
    super();
    this.needsSwap = true;
    this.aoOn = !!tier.ao;
    const rtOpt = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false };
    this.aoRT = new THREE.WebGLRenderTarget(1, 1, rtOpt);
    this.blurRT = new THREE.WebGLRenderTarget(1, 1, rtOpt);
    this.fog = {
      uFogDensity: { value: 3.4e-4 }, uFogFalloff: { value: 1 / 620 }, uFogBase: { value: 0 }, uSunGlow: { value: 1 }, uAO: { value: 1 },
      uFogHorizon: { value: new THREE.Color() }, uFogZenith: { value: new THREE.Color() }, uSunColor: { value: new THREE.Color() },
    };
    const shared = {
      uProjInv: { value: new THREE.Matrix4() }, uCamMat: { value: camera.matrixWorld },
      uNear: { value: camera.near }, uFar: { value: camera.far },
      uSunDir: U.uSunDir, uNight: U.uNight, uCyber: U.uCyber, uTime: U.uTime, ...this.fog,
    };
    this.shared = shared;
    this.aoMat = new THREE.ShaderMaterial({
      uniforms: { tDepth: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) }, uProjScale: { value: 400 }, uFrame: { value: 0 },
        uRadiusK: { value: 0.045 }, uRMin: { value: 0.5 }, uRMax: { value: 28 }, uMaxPx: { value: 22 }, uIntensity: { value: 1.25 },
        uProjInv: shared.uProjInv, uNear: shared.uNear, uFar: shared.uFar },
      vertexShader: VS, fragmentShader: AO_FS(tier.aoSamples), depthTest: false, depthWrite: false,
    });
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: { tAO: { value: null }, tDepth: { value: null }, uDir: { value: new THREE.Vector2() }, uProjInv: shared.uProjInv },
      vertexShader: VS, fragmentShader: BLUR_FS, depthTest: false, depthWrite: false,
    });
    this.fogMat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, tAO: { value: null }, ...shared }, vertexShader: VS, fragmentShader: FOG_FS, depthTest: false, depthWrite: false });
    this.white = new THREE.MeshBasicMaterial();
    this.quad = new FullScreenQuad(this.aoMat);
  }
  setSize(w, h) {
    this.w = Math.max(1, w); this.h = Math.max(1, h);
    const aw = Math.max(1, w >> 1), ah = Math.max(1, h >> 1);
    this.aoRT.setSize(aw, ah); this.blurRT.setSize(aw, ah);
    this.aoMat.uniforms.uTexel.value.set(1 / aw, 1 / ah);
    this.fogMat.uniforms.tAO.value = this.aoRT.texture;
  }
  render(renderer, writeBuffer, readBuffer) {
    const q = this.quad;
    renderer.setRenderTarget(this.aoRT);
    const depth = readBuffer.depthTexture;
    if (this.aoOn && depth) {
      this.aoMat.uniforms.tDepth.value = depth;
      this.aoMat.uniforms.uFrame.value = Math.random();
      q.material = this.aoMat; q.render(renderer);
      this.blurMat.uniforms.tDepth.value = depth;
      this.blurMat.uniforms.tAO.value = this.aoRT.texture; this.blurMat.uniforms.uDir.value.set(1.3 / this.aoRT.width, 0);
      renderer.setRenderTarget(this.blurRT); q.material = this.blurMat; q.render(renderer);
      this.blurMat.uniforms.tAO.value = this.blurRT.texture; this.blurMat.uniforms.uDir.value.set(0, 1.3 / this.aoRT.height);
      renderer.setRenderTarget(this.aoRT); q.render(renderer);
    } else {
      q.material = this.white; q.render(renderer);
    }
    this.fogMat.uniforms.tDiffuse.value = readBuffer.texture;
    this.fogMat.uniforms.tDepth.value = depth;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    q.material = this.fogMat; q.render(renderer);
  }
}

const CineShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: U.uTime, uCyber: U.uCyber,
    uGrain: { value: 0.03 }, uCA: { value: 0.001 }, uVignette: { value: 0.3 }, uSat: { value: 1 }, uCon: { value: 1.03 },
    uTint: { value: new THREE.Color(0x1b2a52) }, uTintAmt: { value: 0.2 }, uRes: { value: new THREE.Vector2(1920, 1080) },
    uGlitch: { value: 0 },
  },
  vertexShader: VS,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uGrain, uCA, uVignette, uSat, uCon, uTintAmt, uCyber, uGlitch;
    uniform vec3 uTint; uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
    void main(){
      vec2 d = vUv - 0.5; float r2 = dot(d, d);
      // усиленная хроматическая аберрация в кибер-режиме
      float caBoost = uCA * (1.0 + uCyber * 1.5);
      vec2 off = d * caBoost * (0.3 + r2 * 4.0);
      // глитч-сдвиг при переходе
      float glitchOff = uGlitch * (hash(vec2(floor(vUv.y * 40.0), uTime)) - 0.5) * 0.03;
      vec2 guv = vUv + vec2(glitchOff, 0.0);
      vec3 col = vec3(texture2D(tDiffuse, guv + off).r, texture2D(tDiffuse, guv).g, texture2D(tDiffuse, guv - off).b);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col = mix(col, col * (uTint * 1.5 + 0.5), uTintAmt * (1.0 - smoothstep(0.0, 0.4, l)));
      col = clamp((col - 0.5) * uCon + 0.5, 0.0, 1.0);
      // усиленная виньетка в кибер-режиме
      float vigBoost = uVignette * (1.0 + uCyber * 0.3);
      col *= 1.0 - smoothstep(0.12, 0.72, r2) * vigBoost;
      col += (hash(vUv * uRes + fract(uTime * 0.137) * 913.0) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createEffects(renderer, scene, camera, tier) {
  const composer = new EffectComposer(renderer);
  composer.renderTarget1.dispose(); composer.renderTarget2.dispose();
  const mk = () => {
    const depth = new THREE.DepthTexture(1, 1); depth.type = THREE.UnsignedIntType;
    return new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: tier.msaa, depthTexture: depth, stencilBuffer: false });
  };
  composer.renderTarget1 = mk(); composer.renderTarget2 = mk();
  composer.writeBuffer = composer.renderTarget1; composer.readBuffer = composer.renderTarget2;

  composer.addPass(new RenderPass(scene, camera));
  const atmo = new AtmospherePass(camera, tier);
  composer.addPass(atmo);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.5, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const cine = new ShaderPass(CineShader);
  composer.addPass(cine);
  const fxaa = tier.msaa ? null : new ShaderPass(FXAAShader);
  if (fxaa) composer.addPass(fxaa);

  // Glitch flash для перехода
  let glitchT = 0;

  return {
    composer, atmo, bloom, cine,
    setPixelRatio(pr) { composer.setPixelRatio(pr); },
    setSize(w, h) {
      composer.setSize(w, h);
      const pw = w * composer._pixelRatio, ph = h * composer._pixelRatio;
      cine.uniforms.uRes.value.set(pw, ph);
      if (fxaa) fxaa.material.uniforms.resolution.value.set(1 / pw, 1 / ph);
    },
    /** Запустить короткую неоновую вспышку / глитч при переходе */
    flashGlitch() {
      glitchT = 0.35; // секунды
    },
    /** Синхронизировать туман/bloom/грейдинг с пресетом окружения. */
    applyEnv(cur, camera, atmoOn, dt) {
      const f = atmo.fog;
      f.uFogDensity.value = cur.fogD * 2.5e-4;
      f.uFogHorizon.value.copy(cur.fogC); f.uFogZenith.value.copy(cur.fogZ);
      f.uSunColor.value.copy(cur.sunC); f.uSunGlow.value = cur.glow;
      atmo.shared.uProjInv.value.copy(camera.projectionMatrixInverse);
      atmo.aoMat.uniforms.uProjScale.value = atmo.aoRT.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      atmo.aoOn = atmoOn;
      bloom.strength = cur.bloomS; bloom.threshold = cur.bloomT; bloom.radius = cur.bloomR;
      const c = cine.uniforms;
      c.uGrain.value = cur.grain; c.uCA.value = cur.ca; c.uVignette.value = cur.vignette;
      c.uSat.value = cur.sat; c.uCon.value = cur.con; c.uTint.value.copy(cur.tint); c.uTintAmt.value = cur.tintAmt;
      // glitch decay
      if (glitchT > 0) {
        glitchT = Math.max(0, glitchT - (dt || 0.016));
        c.uGlitch.value = glitchT / 0.35;
      } else {
        c.uGlitch.value = 0;
      }
    },
  };
}
