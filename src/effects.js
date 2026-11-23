// ============================================================
// CLAY CITY v3 — постобработка.
// Сцена → HDR(MSAA + depth) → AO по глубине + высотный туман → bloom →
// ACES → кино-грейдинг → [FXAA]. Туман и AO считаются по глубине,
// поэтому не зависят от материалов и работают для всей сцены.
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
  float dist = -P.z;
  vec2 ex = vec2(uTexel.x, 0.0), ey = vec2(0.0, uTexel.y);
  float dl = texture2D(tDepth, vUv - ex).r, dr = texture2D(tDepth, vUv + ex).r, dd = texture2D(tDepth, vUv - ey).r, du = texture2D(tDepth, vUv + ey).r;
  vec3 pl = viewPos(vUv - ex, dl), pr = viewPos(vUv + ex, dr), pd = viewPos(vUv - ey, dd), pu = viewPos(vUv + ey, du);
  vec3 dx = abs(pr.z - P.z) < abs(pl.z - P.z) ? pr - P : P - pl;
  vec3 dy = abs(pu.z - P.z) < abs(pd.z - P.z) ? pu - P : P - pd;
  vec3 N = cross(dx, dy);
  N = normalize(N * sign(N.z + 1e-7) + vec3(0.0, 0.0, 1e-7));
  float radius = clamp(dist * uRadiusK, uRMin, uRMax);
  float radiusPx = min(radius * uProjScale / dist, uMaxPx);
  float ang = ign(gl_FragCoord.xy) * 6.2831853;
  float occ = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    float fi = float(i);
    float a = ang + fi * 2.399963;
    float rr = sqrt((fi + 0.5) / float(SAMPLES));
    vec2 suv = vUv + vec2(cos(a), sin(a)) * rr * radiusPx * uTexel;
    float ds = texture2D(tDepth, suv).r;
    if (ds >= 0.999999) continue;
    vec3 v = viewPos(suv, ds) - P;
    float vl = length(v);
    float ndv = dot(N, v) / max(vl, 1e-5);
    occ += max(0.0, ndv - 0.08) * (1.0 - smoothstep(radius * 0.45, radius, vl));
  }
  float ao = clamp(1.0 - occ * (uIntensity * 2.3 / float(SAMPLES)), 0.0, 1.0);
  ao = mix(1.0, ao, smoothstep(2.0, 14.0, dist) * (1.0 - smoothstep(350.0, 900.0, dist)));   // вдали шум AO не нужен
  gl_FragColor = vec4(pow(ao, 1.3));
}`;

const BLUR_FS = `
uniform sampler2D tAO; uniform sampler2D tDepth; uniform vec2 uDir;
varying vec2 vUv;
void main() {
  float d0 = texture2D(tDepth, vUv).r, a = texture2D(tAO, vUv).r, w = 1.0, thr = 0.12 * (1.0 - d0) + 2e-6;
  float ws[3]; ws[0] = 1.0; ws[1] = 0.62; ws[2] = 0.3;
  for (int i = 1; i <= 3; i++) {
    vec2 o = uDir * float(i);
    float da = texture2D(tDepth, vUv + o).r, db = texture2D(tDepth, vUv - o).r;
    float wa = ws[i - 1] * ws[i - 1] * step(abs(da - d0), thr), wb = ws[i - 1] * ws[i - 1] * step(abs(db - d0), thr);
    a += texture2D(tAO, vUv + o).r * wa + texture2D(tAO, vUv - o).r * wb; w += wa + wb;
  }
  gl_FragColor = vec4(a / w);
}`;

const FOG_FS = `
uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform sampler2D tAO;
uniform float uFogDensity, uFogFalloff, uFogBase, uSunGlow, uAO, uNight, uTime;
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
    // экспоненциальный высотный туман (аналитически вдоль луча)
    float x = (P.y - cameraPosition.y) * uFogFalloff;
    float k = abs(x) > 1e-3 ? (1.0 - exp(-x)) / x : 1.0 - 0.5 * x;
    float F = uFogDensity * exp(-(cameraPosition.y - uFogBase) * uFogFalloff) * k;
    float fog = 1.0 - exp(-F);
    vec3 fc = mix(uFogHorizon, uFogZenith, smoothstep(0.0, 0.55, dir.y));
    float mu = max(dot(dir, uSunDir), 0.0);
    fc += uSunColor * (pow(mu, 5.0) * 0.22 + pow(mu, 40.0) * 0.4 + pow(mu, 700.0) * 1.5) * uSunGlow;
    // свет города в дымке
    float ring = exp(-abs(P.y - uFogBase) / 260.0) * (1.0 - smoothstep(900.0, 3600.0, length(P.xz)));
    fc += vec3(0.34, 0.19, 0.085) * ring * uNight * (0.55 + 0.45 * exp(-dist / 2500.0));
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
      uSunDir: U.uSunDir, uNight: U.uNight, uTime: U.uTime, ...this.fog,
    };
    this.shared = shared;
    this.aoMat = new THREE.ShaderMaterial({
      uniforms: { tDepth: { value: null }, uTexel: { value: new THREE.Vector2(1, 1) }, uProjScale: { value: 400 }, uFrame: { value: 0 },
        uRadiusK: { value: 0.05 }, uRMin: { value: 1.2 }, uRMax: { value: 140 }, uMaxPx: { value: 13 }, uIntensity: { value: 1.15 },
        uProjInv: shared.uProjInv, uNear: shared.uNear, uFar: shared.uFar },
      vertexShader: VS, fragmentShader: AO_FS(tier.aoSamples), depthTest: false, depthWrite: false,
    });
    this.blurMat = new THREE.ShaderMaterial({ uniforms: { tAO: { value: null }, tDepth: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VS, fragmentShader: BLUR_FS, depthTest: false, depthWrite: false });
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
    renderer.setRenderTarget(this.aoRT);            // отвязка MSAA-таргета резолвит глубину
    const cam = readBuffer ? null : null;
    void cam;
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
    tDiffuse: { value: null }, uTime: U.uTime,
    uGrain: { value: 0.03 }, uCA: { value: 0.001 }, uVignette: { value: 0.3 }, uSat: { value: 1 }, uCon: { value: 1.03 },
    uTint: { value: new THREE.Color(0x1b2a52) }, uTintAmt: { value: 0.2 }, uRes: { value: new THREE.Vector2(1920, 1080) },
  },
  vertexShader: VS,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uGrain, uCA, uVignette, uSat, uCon, uTintAmt; uniform vec3 uTint; uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p + 19.19); return fract(p.x * p.y); }
    void main(){
      vec2 d = vUv - 0.5; float r2 = dot(d, d);
      vec2 off = d * uCA * (0.3 + r2 * 4.0);
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col = mix(col, col * (uTint * 1.5 + 0.5), uTintAmt * (1.0 - smoothstep(0.0, 0.4, l)));
      col = clamp((col - 0.5) * uCon + 0.5, 0.0, 1.0);
      col *= 1.0 - smoothstep(0.12, 0.72, r2) * uVignette;
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

  return {
    composer, atmo, bloom, cine,
    setPixelRatio(pr) { composer.setPixelRatio(pr); },
    setSize(w, h) {
      composer.setSize(w, h);
      const pw = w * composer._pixelRatio, ph = h * composer._pixelRatio;
      cine.uniforms.uRes.value.set(pw, ph);
      if (fxaa) fxaa.material.uniforms.resolution.value.set(1 / pw, 1 / ph);
    },
    /** Синхронизировать туман/bloom/грейдинг с пресетом окружения. */
    applyEnv(cur, camera, atmoOn) {
      const f = atmo.fog;
      f.uFogDensity.value = cur.fogD * 3.4e-4;
      f.uFogHorizon.value.copy(cur.fogC); f.uFogZenith.value.copy(cur.fogZ);
      f.uSunColor.value.copy(cur.sunC); f.uSunGlow.value = cur.glow;
      atmo.shared.uProjInv.value.copy(camera.projectionMatrixInverse);
      atmo.aoMat.uniforms.uProjScale.value = atmo.aoRT.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      atmo.aoOn = atmoOn;
      bloom.strength = cur.bloomS; bloom.threshold = cur.bloomT; bloom.radius = cur.bloomR;
      const c = cine.uniforms;
      c.uGrain.value = cur.grain; c.uCA.value = cur.ca; c.uVignette.value = cur.vignette;
      c.uSat.value = cur.sat; c.uCon.value = cur.con; c.uTint.value.copy(cur.tint); c.uTintAmt.value = cur.tintAmt;
    },
  };
}
