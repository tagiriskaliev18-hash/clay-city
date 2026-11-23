// ============================================================
// ASTANA REAL v2 — textures.js
// Процедурные фотореалистичные PBR-текстуры (albedo sRGB, normal,
// ORM [R=AO, G=roughness, B=metalness], emissive) — без внешних файлов.
// ============================================================
import * as THREE from "three";
import { rng } from "./geom.js";

let ANISO = 8;
export function setAnisotropy(v) { ANISO = v; }

const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const orm = (rough, metal) => `rgb(255,${Math.round(rough * 255)},${Math.round(metal * 255)})`;
const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

/** Многослойный рисовальщик. Слои: a — albedo, o — ORM, h — height, e — emissive. */
class Layers {
  constructor(w, h, names = ["a", "o", "h", "e"]) {
    this.w = w; this.h = h; this.names = names;
    this.c = {}; this.g = {};
    for (const n of names) {
      this.c[n] = cv(w, h);
      this.g[n] = this.c[n].getContext("2d", { willReadFrequently: true });
    }
  }
  each(cols, fn) { for (const n of this.names) if (cols[n] != null) fn(this.g[n], cols[n], n); }
  fill(cols) { this.each(cols, (g, c) => { g.fillStyle = c; g.fillRect(0, 0, this.w, this.h); }); }
  rect(cols, x, y, w, h) { this.each(cols, (g, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }); }
  grad(x, y, w, h, top, bottom, name = "a") {
    const g = this.g[name];
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  line(cols, x0, y0, x1, y1, width) {
    this.each(cols, (g, c) => {
      g.strokeStyle = c; g.lineWidth = width;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    });
  }
  noise(name, amount, freq = 6, grain = 0.5, seed = 7) {
    const g = this.g[name], w = this.w, h = this.h;
    const img = g.getImageData(0, 0, w, h), d = img.data;
    const r = rng(seed);
    const grid = new Float32Array(freq * freq);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    const at = (i, j) => grid[((j % freq) + freq) % freq * freq + ((i % freq) + freq) % freq];
    const sm = (t) => t * t * (3 - 2 * t);
    for (let y = 0; y < h; y++) {
      const gy = (y / h) * freq, j0 = Math.floor(gy), fy = sm(gy - j0);
      for (let x = 0; x < w; x++) {
        const gx = (x / w) * freq, i0 = Math.floor(gx), fx = sm(gx - i0);
        const n = (at(i0, j0) * (1 - fx) + at(i0 + 1, j0) * fx) * (1 - fy) + (at(i0, j0 + 1) * (1 - fx) + at(i0 + 1, j0 + 1) * fx) * fy;
        const gr = ((Math.imul(x + 131, 73856093) ^ Math.imul(y + 71, 19349663)) >>> 0) / 4294967295;
        const f = 1 + (n - 0.5) * amount + (gr - 0.5) * amount * grain;
        const k = (y * w + x) * 4;
        d[k] = clamp255(d[k] * f); d[k + 1] = clamp255(d[k + 1] * f); d[k + 2] = clamp255(d[k + 2] * f);
      }
    }
    g.putImageData(img, 0, 0);
  }
  texture(name, { srgb = false, repeat = 1 } = {}) {
    const t = new THREE.CanvasTexture(this.c[name]);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    t.repeat.set(repeat, repeat);
    return t;
  }
  normalTexture(strength = 6, repeat = 1) {
    const w = this.w, h = this.h;
    const src = this.g.h.getImageData(0, 0, w, h).data;
    const out = cv(w, h), g = out.getContext("2d"), img = g.createImageData(w, h), d = img.data;
    const H = (x, y) => src[(((y % h) + h) % h * w + ((x % w) + w) % w) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      let nx = -dx, ny = dy, nz = 1;
      const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
      const k = (y * w + x) * 4;
      d[k] = clamp255((nx * 0.5 + 0.5) * 255); d[k + 1] = clamp255((ny * 0.5 + 0.5) * 255); d[k + 2] = clamp255((nz * 0.5 + 0.5) * 255); d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(out);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO; t.repeat.set(repeat, repeat);
    return t;
  }
}

const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

// ---------- Фотореалистичный архитектурный стеклянный витраж ----------
// Варианты оттенков: neutral (стандарт), blue (QazaqGaz/Abu Dhabi/Northern Lights),
// gold (Talan/Ministries), emerald (Emerald Towers).
function glassFamily(S, {
  hueBase = 204, hueSpan = 16, sat = 28, lightTop = 28, lightBot = 13,
  mullion = "#48505a", spandrel = [34, 42, 52], seed = 101,
} = {}) {
  const L = new Layers(S, S);
  const r = rng(seed);
  const F = 8, C = 8, fh = S / F, cw = S / C, m = S / 24;
  // Алюминиевые переплёты
  L.fill({ a: mullion, o: orm(0.32, 0.78), h: "#b2b2b2", e: "#000" });

  for (let f = 0; f < F; f++) {
    const yTop = S - (f + 1) * fh;
    const floorBias = r() < 0.34 ? 0.64 : 0.14;
    for (let c = 0; c < C; c++) {
      const x0 = c * cw;
      const pad = Math.max(2, S * 0.004);
      // Межэтажный спандрель (0.85 м) — чуть матовее стекла
      const spJ = (r() - 0.5) * 8;
      L.rect(
        {
          a: `rgb(${clamp255(spandrel[0] + spJ)},${clamp255(spandrel[1] + spJ)},${clamp255(spandrel[2] + spJ)})`,
          o: orm(0.24, 0.52),
          h: "#7c7c7c",
          e: "#000",
        },
        x0 + pad, yTop + pad * 0.6, cw - pad * 2, 0.85 * m
      );

      // Основное архитектурное стекло (низкий roughness 0.08..0.14, реалистичный metalness 0.32..0.48)
      const gy = yTop + 0.85 * m + pad, gh = fh - 0.85 * m - pad * 2;
      const hue = hueBase + (r() - 0.5) * hueSpan;
      const lit = r() < floorBias;
      const blind = !lit && r() < 0.32;
      L.rect({ a: "#182838", o: orm(0.08 + r() * 0.06, 0.36 + r() * 0.14), h: "#525252", e: "#000" }, x0 + pad, gy, cw - pad * 2, gh);
      L.grad(x0 + pad, gy, cw - pad * 2, gh, hsl(hue, sat, lightTop + r() * 7), hsl(hue + 4, sat + 6, lightBot + r() * 4));

      // Тонкий силуэт потолка / интерьера за стеклом (глубина днём!)
      L.rect({ a: "rgba(255,255,255,0.08)" }, x0 + pad + 1, gy + 1, cw - pad * 2 - 2, gh * 0.18);
      if (r() < 0.45) {
        L.rect({ a: "rgba(10,16,24,0.22)" }, x0 + pad + 1, gy + gh * 0.65, cw - pad * 2 - 2, gh * 0.34);
      }

      if (lit) {
        // Тёплый офисный свет + часть прохладного делового света + редкий кибер-акцент
        const roll = r();
        const k = 0.58 + r() * 0.42;
        let col;
        if (roll < 0.54) {
          col = `rgb(${clamp255(255 * k)},${clamp255(202 * k)},${clamp255(138 * k)})`;
        } else if (roll < 0.90) {
          col = `rgb(${clamp255(205 * k)},${clamp255(228 * k)},${clamp255(255 * k)})`;
        } else {
          col = `rgb(${clamp255(95 * k)},${clamp255(235 * k)},${clamp255(255 * k)})`;
        }
        L.rect({ e: col }, x0 + pad + 1, gy + 1, cw - pad * 2 - 2, gh - 2);
        // Градиент потолочных ламп внутри комнаты
        L.grad(x0 + pad + 1, gy + 1, cw - pad * 2 - 2, gh - 2, "rgba(255,255,255,0.24)", "rgba(0,0,0,0.32)", "e");
      } else if (blind) {
        const bh = gh * (0.28 + r() * 0.42);
        L.rect({ a: `rgba(${188 + r() * 34},${186 + r() * 32},${178 + r() * 28},0.42)` }, x0 + pad + 1, gy + 1, cw - pad * 2 - 2, bh);
      }

      // Горизонтальный импост + тонкий вертикальный профиль
      L.rect({ a: mullion, o: orm(0.32, 0.78), h: "#9e9e9e", e: "#000" }, x0 + pad, gy + gh * 0.56 - 1, cw - pad * 2, Math.max(2, S * 0.0025));
    }
  }
  L.noise("a", 0.04, 12, 0.6, seed + 3);
  return { L, tile: 24, normal: 4.5, srgb: true };
}

// ---------- Камень/травертин с окнами: плитка 24 м ----------
function stoneFamily(S, { base = [212, 200, 180], winW = 2.3, winH = 1.8, sill = 0.95, ribbon = false } = {}) {
  const L = new Layers(S, S);
  const r = rng(202);
  const F = 8, B = 4, fh = S / F, bw = S / B, m = S / 24;
  L.fill({ a: `rgb(${base.join(",")})`, o: orm(0.76, 0.02), h: "#909090", e: "#000" });
  for (let y = 0; y < S; y += 0.75 * m) {
    L.rect({ a: "rgba(50,42,32,0.12)", h: "#727272" }, 0, y, S, 1.2);
    const off = (Math.round(y / (0.75 * m)) % 2) * bw * 0.5;
    for (let x = off; x < S + bw; x += bw) L.rect({ a: "rgba(50,42,32,0.09)", h: "#787878" }, x, y, 1.2, 0.75 * m);
  }
  for (let f = 0; f < F; f++) {
    const yBot = S - f * fh, yWin = yBot - sill * m - winH * m;
    for (let b = 0; b < B; b++) {
      const x0 = b * bw + (bw - winW * m) / 2;
      // Рама и отражающее стекло
      L.rect({ a: "#32363d", o: orm(0.4, 0.6), h: "#b8b8b8", e: "#000" }, x0 - 4, yWin - 4, winW * m + 8, winH * m + 8);
      L.rect({ a: "#182838", o: orm(0.1, 0.42), h: "#3c3c3c", e: "#000" }, x0, yWin, winW * m, winH * m);
      L.grad(x0, yWin, winW * m, winH * m, "rgba(155,195,225,0.42)", "rgba(14,22,34,0.35)");
      // Подоконник
      L.rect({ a: `rgb(${clamp255(base[0] + 18)},${clamp255(base[1] + 18)},${clamp255(base[2] + 16)})`, h: "#d8d8d8" }, x0 - 5, yBot - sill * m, winW * m + 10, 5);
      if (r() < 0.28) {
        const k = 0.55 + r() * 0.45;
        L.rect({ e: `rgb(${clamp255(255 * k)},${clamp255(198 * k)},${clamp255(126 * k)})` }, x0 + 1, yWin + 1, winW * m - 2, winH * m - 2);
      }
      if (ribbon) L.rect({ a: "rgba(255,244,218,0.16)", h: "#a8a8a8" }, b * bw, yWin - 9, bw, 5);
    }
  }
  L.noise("a", 0.08, 7, 0.7, 5);
  return { L, tile: 24, normal: 6.5, srgb: true };
}

// ---------- Панельные дома (Правый берег): плитка 24 м ----------
function panelFamily(S) {
  const L = new Layers(S, S);
  const r = rng(303);
  const F = 8, B = 4, fh = S / F, bw = S / B, m = S / 24;
  L.fill({ a: "rgb(212,208,200)", o: orm(0.76, 0), h: "#8c8c8c", e: "#000" });
  for (let f = 0; f <= F; f++) L.rect({ a: "rgba(44,42,38,0.24)", h: "#5c5c5c" }, 0, S - f * fh - 1.5, S, 3);
  for (let b = 0; b <= B; b++) L.rect({ a: "rgba(44,42,38,0.20)", h: "#646464" }, b * bw - 1.5, 0, 3, S);
  for (let f = 0; f < F; f++) {
    const yBot = S - f * fh;
    for (let b = 0; b < B; b++) {
      const x0 = b * bw;
      if (r() < 0.3) {
        L.rect({ a: "#525558", o: orm(0.8, 0), h: "#3a3a3a", e: "#000" }, x0 + 0.5 * m, yBot - 2.55 * m, 5.0 * m, 2.55 * m);
        L.rect({ a: "rgb(202,198,190)", h: "#9c9c9c" }, x0 + 0.6 * m, yBot - 1.05 * m, 4.8 * m, 1.0 * m);
      } else {
        const ww = 3.0 * m, wh = 1.55 * m, x = x0 + (bw - ww) / 2, y = yBot - 0.95 * m - wh;
        L.rect({ a: "#f2f2ee", o: orm(0.45, 0.05), h: "#b4b4b4", e: "#000" }, x - 4, y - 4, ww + 8, wh + 8);
        L.rect({ a: "#182634", o: orm(0.1, 0.42), h: "#444444", e: "#000" }, x, y, ww, wh);
        L.grad(x, y, ww, wh, "rgba(145,180,210,0.38)", "rgba(10,18,28,0.35)");
        L.rect({ a: "#f2f2ee", o: orm(0.45, 0.05), h: "#b4b4b4", e: "#000" }, x + ww / 2 - 3, y, 6, wh);
        if (r() < 0.3) {
          const k = 0.5 + r() * 0.5;
          L.rect({ e: `rgb(${clamp255(255 * k)},${clamp255(192 * k)},${clamp255(118 * k)})` }, x + 2, y + 2, ww - 4, wh - 4);
          L.rect({ e: "#000" }, x + ww / 2 - 3, y, 6, wh);
        }
      }
    }
  }
  L.noise("a", 0.08, 8, 0.6, 9);
  return { L, tile: 24, normal: 5.5, srgb: true };
}

// ---------- Современные ЖК Астаны (керамогранит + панорамные лоджии) ----------
function resFamily(S) {
  const L = new Layers(S, S);
  const r = rng(404);
  const F = 8, B = 6, fh = S / F, bw = S / B, m = S / 24;
  L.fill({ a: "rgb(228,220,206)", o: orm(0.68, 0.04), h: "#949494", e: "#000" });
  for (let f = 0; f <= F; f++) L.rect({ a: "rgba(70,64,56,0.20)", h: "#7a7a7a" }, 0, S - f * fh - 1.5, S, 3);
  for (let f = 0; f < F; f++) {
    const yBot = S - f * fh;
    for (let b = 0; b < B; b++) {
      const x0 = b * bw, bal = r() < 0.54;
      if (bal) {
        L.rect({ a: "#162634", o: orm(0.09, 0.44), h: "#505050", e: "#000" }, x0 + 0.3 * m, yBot - 2.65 * m, bw - 0.6 * m, 2.65 * m);
        L.grad(x0 + 0.3 * m, yBot - 2.65 * m, bw - 0.6 * m, 2.65 * m, "rgba(155,195,225,0.42)", "rgba(14,22,34,0.28)");
        L.rect({ a: "#e6e2da", o: orm(0.45, 0.08), h: "#b0b0b0", e: "#000" }, x0 + 0.3 * m, yBot - 2.65 * m, 5, 2.65 * m);
        L.rect({ a: "#e6e2da", o: orm(0.45, 0.08), h: "#b0b0b0", e: "#000" }, x0 + bw - 0.3 * m - 5, yBot - 2.65 * m, 5, 2.65 * m);
        L.rect({ a: "#e6e2da", o: orm(0.45, 0.08), h: "#b0b0b0", e: "#000" }, x0 + 0.3 * m, yBot - 2.65 * m, bw - 0.6 * m, 5);
      } else {
        const ww = 1.8 * m, wh = 1.65 * m, x = x0 + (bw - ww) / 2, y = yBot - 0.9 * m - wh;
        L.rect({ a: "#e6e2da", o: orm(0.45, 0.05), h: "#a8a8a8", e: "#000" }, x - 4, y - 4, ww + 8, wh + 8);
        L.rect({ a: "#162634", o: orm(0.1, 0.42), h: "#464646", e: "#000" }, x, y, ww, wh);
        L.grad(x, y, ww, wh, "rgba(148,188,218,0.40)", "rgba(12,20,30,0.30)");
        L.rect({ a: "#e6e2da", o: orm(0.45, 0.05), h: "#a8a8a8", e: "#000" }, x + ww / 2 - 3, y, 6, wh);
      }
      if (r() < 0.28) {
        const k = 0.5 + r() * 0.5;
        const ins = bal
          ? [x0 + 0.3 * m + 5, yBot - 2.65 * m + 5, bw - 0.6 * m - 10, 2.65 * m - 10]
          : [x0 + (bw - 1.8 * m) / 2 + 2, yBot - 0.9 * m - 1.65 * m + 2, 1.8 * m - 4, 1.65 * m - 4];
        L.rect({ e: `rgb(${clamp255(255 * k)},${clamp255(200 * k)},${clamp255(138 * k)})` }, ...ins);
      }
    }
  }
  L.noise("a", 0.06, 9, 0.5, 11);
  return { L, tile: 24, normal: 5.5, srgb: true };
}

function pack(fam) {
  const rep = 1 / fam.tile;
  const map = fam.L.texture("a", { srgb: true, repeat: rep });
  const normalMap = fam.L.normalTexture(fam.normal, rep);
  const ormTex = fam.L.texture("o", { repeat: rep });
  const emissiveMap = fam.L.texture("e", { srgb: true, repeat: rep });
  return { map, normalMap, roughnessMap: ormTex, metalnessMap: ormTex, emissiveMap, tile: fam.tile };
}

// ---------- Натуральный бежевый казахстанский травертин ----------
function travertineTex(S, tile = 8) {
  const L = new Layers(S, S, ["a", "o", "h"]);
  const r = rng(512);
  L.fill({ a: "#dfd5c3", o: orm(0.68, 0.02), h: "#848484" });
  const rows = 8, cols = 4, rh = S / rows, cw = S / cols;
  for (let j = 0; j < rows; j++) {
    const off = (j % 2) * cw * 0.5;
    for (let i = -1; i <= cols; i++) {
      const shade = (r() - 0.5) * 16;
      const x = i * cw + off, y = j * rh;
      L.rect({ a: `rgb(${clamp255(222 + shade)},${clamp255(212 + shade)},${clamp255(194 + shade)})` }, x + 1.5, y + 1.5, cw - 3, rh - 3);
      // Тонкие горизонтальные поры травертина
      for (let p = 0; p < 8; p++) {
        L.rect({ a: `rgba(110,95,75,${0.06 + r() * 0.08})` }, x + r() * cw * 0.7, y + r() * rh, cw * (0.12 + r() * 0.2), 1.5);
      }
    }
    L.rect({ a: "rgba(80,70,56,0.22)", h: "#5c5c5c" }, 0, j * rh, S, 2);
  }
  L.noise("a", 0.08, 8, 0.7, 513);
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(4.5, rep), roughnessMap: L.texture("o", { repeat: rep }), tile };
}

// ---------- Полированный астанинский гранит (стилобаты, набережные, бульвар) ----------
function graniteTex(S, { base = "#5e5c5a", tile = 6, rough = 0.28, seed = 601 } = {}) {
  const L = new Layers(S, S, ["a", "o", "h"]);
  const r = rng(seed);
  L.fill({ a: base, o: orm(rough, 0.08), h: "#828282" });
  const n = 4, s = S / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const v = (r() - 0.5) * 18;
    L.rect({ a: `rgba(${v > 0 ? 255 : 0},${v > 0 ? 250 : 0},${v > 0 ? 245 : 0},${Math.abs(v) / 220})`, o: orm(rough + (r() - 0.5) * 0.08, 0.08) }, i * s + 2, j * s + 2, s - 4, s - 4);
  }
  for (let i = 0; i < n; i++) {
    L.rect({ a: "rgba(18,18,20,0.34)", o: orm(0.75, 0), h: "#525252" }, i * s, 0, 2, S);
    L.rect({ a: "rgba(18,18,20,0.34)", o: orm(0.75, 0), h: "#525252" }, 0, i * s, S, 2);
  }
  L.noise("a", 0.14, 16, 1.0, seed + 5);
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(4, rep), roughnessMap: L.texture("o", { repeat: rep }), tile };
}

// ---------- Чистый реалистичный асфальт проспектов Астаны ----------
function asphaltTex(S, tile = 14) {
  const L = new Layers(S, S, ["a", "o", "h"]);
  const r = rng(701);
  L.fill({ a: "#2e3035", o: orm(0.80, 0.03), h: "#808080" });
  // Мелкая минеральная крошка и тонкий износ колеи
  for (let i = 0; i < 650; i++) {
    const v = 30 + r() * 44;
    L.rect({ a: `rgba(${v},${v},${v + 3},0.22)` }, r() * S, r() * S, 2 + r() * 8, 2 + r() * 8);
  }
  L.noise("a", 0.16, 18, 1.0, 702);
  L.noise("o", 0.14, 6, 0.5, 703);
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(3.5, rep), roughnessMap: L.texture("o", { repeat: rep }), tile };
}

// ---------- Натуральный парковый газон ----------
function grassTex(S, tile = 22) {
  const L = new Layers(S, S, ["a", "o", "h"]);
  const r = rng(801);
  L.fill({ a: "#4c6e3b", o: orm(0.92, 0.0), h: "#808080" });
  // Аккуратные парковые полосы стрижки
  for (let i = 0; i < 8; i += 2) {
    L.rect({ a: "rgba(115,155,82,0.12)" }, (i / 8) * S, 0, S / 8, S);
  }
  for (let i = 0; i < 500; i++) {
    const g = 75 + r() * 55;
    L.rect({ a: `rgba(${clamp255(g * 0.68)},${clamp255(g)},${clamp255(g * 0.48)},0.25)` }, r() * S, r() * S, 3 + r() * 14, 3 + r() * 14);
  }
  L.noise("a", 0.16, 12, 0.85, 802);
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(2.5, rep), tile };
}

// ---------- Городская подложка кварталов (тротуарная плитка + гранит + степной тон) ----------
function urbanGroundTex(S, tile = 48) {
  const L = new Layers(S, S, ["a", "o", "h"]);
  const r = rng(901);
  L.fill({ a: "#8b8880", o: orm(0.86, 0.02), h: "#808080" });
  const n = 8, s = S / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const shade = (r() - 0.5) * 18;
    L.rect({ a: `rgb(${clamp255(138 + shade)},${clamp255(135 + shade)},${clamp255(126 + shade)})` }, i * s + 1, j * s + 1, s - 2, s - 2);
  }
  for (let i = 0; i < n; i++) {
    L.rect({ a: "rgba(55,54,50,0.18)", h: "#646464" }, i * s, 0, 1.5, S);
    L.rect({ a: "rgba(55,54,50,0.18)", h: "#646464" }, 0, i * s, S, 1.5);
  }
  L.noise("a", 0.12, 10, 0.8, 902);
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(2.5, rep), tile };
}

// ---------- Металлические панели ----------
function plates(S, { base, rough, metal, seam = 1.5, rivets = true, tile = 6, brush = 0, tarnish = 0, seed = 1, bump = "#808080" }) {
  const L = new Layers(S, S);
  const r = rng(seed);
  const n = Math.max(1, Math.round(tile / seam)), step = S / n;
  L.fill({ a: base, o: orm(rough, metal), h: bump });
  for (let i = 0; i < n; i++) {
    L.rect({ a: "rgba(0,0,0,0.28)", o: orm(Math.min(1, rough + 0.18), metal * 0.6), h: "#444444" }, i * step, 0, 2, S);
    L.rect({ a: "rgba(0,0,0,0.28)", o: orm(Math.min(1, rough + 0.18), metal * 0.6), h: "#444444" }, 0, i * step, S, 2);
    L.rect({ a: "rgba(255,255,255,0.10)" }, i * step + 2, 0, 1.2, S);
    L.rect({ a: "rgba(255,255,255,0.10)" }, 0, i * step + 2, S, 1.2);
  }
  if (rivets) for (let y = step * 0.12; y < S; y += step) for (let x = 9; x < S; x += Math.max(14, step * 0.14)) {
    L.rect({ a: "rgba(0,0,0,0.28)", h: "#bcbcbc" }, x, y, 2.5, 2.5);
  }
  if (brush) {
    for (let i = 0; i < S * 4; i++) {
      const y = r() * S, v = (r() - 0.5) * brush;
      L.line({ a: `rgba(${clamp255(128 + v)},${clamp255(128 + v)},${clamp255(128 + v)},0.09)` }, 0, y, S, y + (r() - 0.5) * 2, 1);
    }
  }
  if (tarnish) for (let i = 0; i < S * 0.2; i++) {
    L.rect({ a: `rgba(28,62,48,${0.03 + r() * tarnish})`, o: orm(rough + 0.2, metal * 0.7) }, r() * S, r() * S, 4 + r() * 24, 3 + r() * 14);
  }
  L.noise("a", 0.06, 6, 0.7, seed);
  return L;
}

function roofTex(S, tile = 8) {
  const L = new Layers(S, S);
  const r = rng(77);
  L.fill({ a: "#46484d", o: orm(0.86, 0.04), h: "#808080", e: "#000" });
  for (let i = 0; i < 220; i++) {
    const v = 50 + r() * 44;
    L.rect({ a: `rgba(${v},${v},${v + 2},0.32)` }, r() * S, r() * S, 2 + r() * 24, 2 + r() * 18);
  }
  L.noise("a", 0.16, 14, 0.9, 8);
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(3, rep), tile };
}

function concreteTex(S, { base = "#b8b4ac", tile = 4, rough = 0.8, seed = 5 } = {}) {
  const L = new Layers(S, S);
  const r = rng(seed);
  L.fill({ a: base, o: orm(rough, 0), h: "#808080" });
  for (let i = 0; i < 350; i++) L.rect({ a: `rgba(0,0,0,${0.02 + r() * 0.05})` }, r() * S, r() * S, 2 + r() * 18, 1 + r() * 5);
  const step = S / 2;
  L.rect({ a: "rgba(40,38,34,0.20)", h: "#606060" }, 0, 0, S, 2); L.rect({ a: "rgba(40,38,34,0.20)", h: "#606060" }, 0, 0, 2, S);
  L.rect({ a: "rgba(40,38,34,0.20)", h: "#606060" }, 0, step, S, 2); L.rect({ a: "rgba(40,38,34,0.20)", h: "#606060" }, step, 0, 2, S);
  L.noise("a", 0.12, 6, 0.9, seed);
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(4.5, rep), tile };
}

/** Золотое хамелеон-стекло шара Байтерека */
function goldTiles(S) {
  const L = new Layers(S, S);
  const r = rng(21);
  const n = 8, s = S / n;
  L.fill({ a: "#3a280a", o: orm(0.42, 0.9), h: "#5a5a5a" });
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = 0.88 + r() * 0.18, warm = r() * 10;
    L.rect({
      a: `rgb(${clamp255(242 * k)},${clamp255((196 + warm) * k)},${clamp255((88 + warm * 2) * k)})`,
      o: orm(0.10 + r() * 0.10, 0.95),
      h: "#b0b0b0",
    }, i * s + 2, j * s + 2, s - 4, s - 4);
    L.grad(i * s + 2, j * s + 2, s - 4, s - 4, "rgba(255,255,255,0.18)", "rgba(90,48,0,0.14)");
  }
  const rep = 1 / 4.8;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(7, rep), tile: 4.8 };
}

/** Пирамида: сине-серебристое витражное стекло с треугольной решёткой (Фостер) */
function latticeGlass(S, { tile = 8, cells = 4, line = "#e2e6ea", glassA = "#1f4e78", glassB = "#102c48", glow = "rgb(56,120,210)" } = {}) {
  const L = new Layers(S, S);
  const s = S / cells;
  L.fill({ a: glassA, o: orm(0.08, 0.46), h: "#606060", e: glow });
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) L.grad(i * s, j * s, s, s, glassB, glassA);
  const w = Math.max(3, S * 0.007);
  for (let i = 0; i <= cells; i++) {
    L.rect({ a: line, o: orm(0.32, 0.65), h: "#d8d8d8", e: "#000" }, i * s - w / 2, 0, w, S);
    L.rect({ a: line, o: orm(0.32, 0.65), h: "#d8d8d8", e: "#000" }, 0, i * s - w / 2, S, w);
  }
  for (let i = -cells; i < cells * 2; i++) {
    L.line({ a: line, o: orm(0.32, 0.65), h: "#d8d8d8", e: "#000" }, i * s, 0, i * s + S, S, w * 0.8);
    L.line({ a: line, o: orm(0.32, 0.65), h: "#d8d8d8", e: "#000" }, i * s, 0, i * s - S, S, w * 0.8);
  }
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(6, rep), roughnessMap: L.texture("o", { repeat: rep }), metalnessMap: L.texture("o", { repeat: rep }), emissiveMap: L.texture("e", { srgb: true, repeat: rep }), tile };
}

/** Сфера «Нур Алем»: геодезический diagrid */
function diagrid(S, { tile = 10, cells = 5 } = {}) {
  const L = new Layers(S, S);
  const s = S / cells;
  L.fill({ a: "#183048", o: orm(0.09, 0.48), h: "#606060", e: "#ffffff" });
  const w = Math.max(4, S * 0.012);
  for (let i = -cells; i < cells * 2; i++) {
    L.line({ a: "#cfd6dc", o: orm(0.35, 0.62), h: "#e4e4e4", e: "#000" }, i * s, 0, i * s + S, S, w);
    L.line({ a: "#cfd6dc", o: orm(0.35, 0.62), h: "#e4e4e4", e: "#000" }, i * s, 0, i * s - S, S, w);
  }
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(7, rep), roughnessMap: L.texture("o", { repeat: rep }), metalnessMap: L.texture("o", { repeat: rep }), emissiveMap: L.texture("e", { repeat: rep }), tile };
}

/** Обшивка дирижабля (для airships.js) */
function hullSkin(W = 2048, H = 1024) {
  const L = new Layers(W, H);
  const r = rng(55);
  const m = W / 170;
  L.fill({ a: "#d2ccbb", o: orm(0.46, 0.02), h: "#808080", e: "#000" });
  const gore = H / 24;
  for (let k = 0; k < 24; k++) {
    L.rect({ a: "rgba(70,62,50,0.22)", o: orm(0.6, 0.02), h: "#5c5c5c" }, 0, k * gore, W, 2);
    L.rect({ a: "rgba(255,255,255,0.10)" }, 0, k * gore + 2, W, 1.5);
  }
  for (let x = 0; x < W; x += 7.5 * m) {
    L.rect({ a: "rgba(70,62,50,0.16)", o: orm(0.56, 0.02), h: "#646464" }, x, 0, 2, H);
    L.rect({ a: "rgba(255,255,255,0.07)" }, x + 2, 0, 1.5, H);
  }
  for (let i = 0; i < 520; i++) {
    const y = r() * H, v = r() < 0.5;
    L.rect({ a: v ? `rgba(255,255,250,${0.02 + r() * 0.035})` : `rgba(96,84,66,${0.02 + r() * 0.035})`, o: orm(0.4 + r() * 0.2, 0.02) }, r() * W, y, 30 + r() * 170, 2 + r() * 5);
  }
  L.grad(0, H * 0.5 - 90, W, 180, "rgba(60,50,40,0)", "rgba(60,50,40,0.26)");
  L.grad(0, H * 0.5, W, 90, "rgba(60,50,40,0.26)", "rgba(60,50,40,0)");
  L.noise("a", 0.05, 5, 0.9, 13);
  for (const yc of [H * 0.656, H * 0.689, H * 0.311, H * 0.344]) {
    for (let x = 0.235 * W; x < 0.39 * W; x += 2.4 * m) {
      L.rect({ a: "#101418", h: "#505050", e: `rgb(${200 + r() * 55},${150 + r() * 60},${84 + r() * 60})` }, x, yc, 1.3 * m, 0.8 * m);
    }
  }
  const t = (n, srgb, rep) => { const tx = L.texture(n, { srgb, repeat: 1 }); tx.repeat.set(...rep); return tx; };
  return { map: t("a", true, [1, 1]), normalMap: L.normalTexture(5, 1), roughnessMap: t("o", false, [1, 1]), metalnessMap: t("o", false, [1, 1]), emissiveMap: t("e", true, [1, 1]) };
}

// ---------- Спрайты и вывески (для particles.js, props.js, airships.js, cyberpunk.js) ----------
export function softSprite(size = 128, stops = [[0, 1], [0.35, 0.55], [1, 0]]) {
  const c = cv(size, size), g = c.getContext("2d");
  const gr = g.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function puffSprite(size = 128, seed = 3) {
  const c = cv(size, size), g = c.getContext("2d");
  const r = rng(seed);
  for (let i = 0; i < 34; i++) {
    const x = size / 2 + (r() - 0.5) * size * 0.46, y = size / 2 + (r() - 0.5) * size * 0.46, rad = size * (0.1 + r() * 0.2);
    const gr = g.createRadialGradient(x, y, 1, x, y, rad);
    gr.addColorStop(0, "rgba(255,255,255,0.16)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(c);
}

export function leafSprite(size = 256, seed = 9) {
  const c = cv(size, size), g = c.getContext("2d");
  const r = rng(seed);
  for (let i = 0; i < 420; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * size * 0.4;
    const x = size / 2 + Math.cos(a) * d, y = size * 0.44 + Math.sin(a) * d * 0.86, rad = size * (0.03 + r() * 0.05);
    const sh = r();
    g.fillStyle = `rgb(${clamp255(54 + sh * 48)},${clamp255(94 + sh * 56)},${clamp255(36 + sh * 28)})`;
    g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  g.fillStyle = "rgb(56,42,30)"; g.fillRect(size / 2 - 4, size * 0.5, 8, size * 0.5);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t;
}

const SIGN_WORDS = ["АСТАНА", "НҰРЖОЛ", "QAZAQGAZ", "АКОРДА", "БАЙТЕРЕК", "БАНК", "ОТЕЛЬ", "ҚАЗАҚСТАН", "РЕСТОРАН", "SAMGAU", "TULPAR", "ASTANA HUB", "24/7", "КИНО", "БАЗАР"];

export function signTexture(word, { w = 512, h = 192, color = "#5cf0ff", vertical = false, bg = "rgba(6,9,12,0.92)", font = "700" } = {}) {
  const c = cv(w, h), g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = color; g.lineWidth = 5; g.shadowColor = color; g.shadowBlur = 22;
  g.strokeRect(12, 12, w - 24, h - 24);
  g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "middle";
  if (vertical) {
    const fs = Math.min((h - 60) / word.length, w * 0.62);
    g.font = `${font} ${fs}px "Arial", "Segoe UI", sans-serif`;
    for (let i = 0; i < word.length; i++) g.fillText(word[i], w / 2, 30 + fs * (i + 0.5));
  } else {
    let fs = h * 0.5;
    g.font = `${font} ${fs}px "Arial", "Segoe UI", sans-serif`;
    while (g.measureText(word).width > w - 90 && fs > 14) { fs -= 4; g.font = `${font} ${fs}px "Arial", "Segoe UI", sans-serif`; }
    g.fillText(word, w / 2, h / 2 + 2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t;
}
export { SIGN_WORDS };

export const Textures = {
  glass: (S) => pack(glassFamily(S, { hueBase: 204, sat: 26, lightTop: 30, lightBot: 14, mullion: "#4e5660", spandrel: [36, 44, 54], seed: 101 })),
  glassBlue: (S) => pack(glassFamily(S, { hueBase: 208, sat: 46, lightTop: 36, lightBot: 16, mullion: "#7b8896", spandrel: [26, 52, 78], seed: 109 })),
  glassGold: (S) => pack(glassFamily(S, { hueBase: 40, sat: 44, lightTop: 42, lightBot: 18, mullion: "#9a8252", spandrel: [78, 64, 40], seed: 117 })),
  glassEmerald: (S) => pack(glassFamily(S, { hueBase: 176, sat: 44, lightTop: 34, lightBot: 15, mullion: "#506466", spandrel: [22, 56, 58], seed: 125 })),
  stone: (S) => pack(stoneFamily(S)),
  stoneRibbon: (S) => pack(stoneFamily(S, { base: [218, 206, 184], winW: 5.2, winH: 1.5, sill: 1.0, ribbon: true })),
  panel: (S) => pack(panelFamily(S)),
  res: (S) => pack(resFamily(S)),
  roof: (S) => roofTex(S),
  concrete: (S, o) => concreteTex(S, o),
  travertine: (S) => travertineTex(S),
  granite: (S, o) => graniteTex(S, o),
  asphalt: (S) => asphaltTex(S),
  grass: (S) => grassTex(S),
  urbanGround: (S) => urbanGroundTex(S),
  gold: (S) => goldTiles(S),
  lattice: (S) => latticeGlass(S),
  diagrid: (S) => diagrid(S),
  steel: (S) => plates(S, { base: "#8b939b", rough: 0.34, metal: 0.88, seed: 31, brush: 28, rivets: false }),
  brass: (S) => plates(S, { base: "#c8a25a", rough: 0.28, metal: 0.96, seam: 1.4, seed: 32, brush: 38, tarnish: 0.04, tile: 4.8, rivets: false }),
  copper: (S) => plates(S, { base: "#986442", rough: 0.38, metal: 0.94, seam: 1.2, seed: 33, brush: 30, tarnish: 0.14, tile: 4.8 }),
  white: (S) => plates(S, { base: "#f0eee8", rough: 0.42, metal: 0.10, seam: 3, rivets: false, seed: 34, tile: 6 }),
  hull: () => hullSkin(),
};
