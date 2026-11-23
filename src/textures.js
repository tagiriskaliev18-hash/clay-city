// ============================================================
// CLAY CITY v3 — процедурные PBR-текстуры (canvas), без внешних файлов.
// Семейство = albedo (sRGB) + normal + ORM (R=AO, G=roughness, B=metalness)
// + emissive. Все карты семейства имеют одинаковый repeat.
// ============================================================
import * as THREE from "three";
import { rng } from "./geom.js";

let ANISO = 8;
export function setAnisotropy(v) { ANISO = v; }

const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const orm = (rough, metal) => `rgb(255,${Math.round(rough * 255)},${Math.round(metal * 255)})`;
const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

/** Многослойный рисовальщик. Имена слоёв: a — albedo, o — ORM, h — height, e — emissive. */
class Layers {
  constructor(w, h, names = ["a", "o", "h", "e"]) {
    this.w = w; this.h = h; this.names = names;
    this.c = {}; this.g = {};
    for (const n of names) { this.c[n] = cv(w, h); this.g[n] = this.c[n].getContext("2d", { willReadFrequently: true }); }
  }
  each(cols, fn) { for (const n of this.names) if (cols[n] != null) fn(this.g[n], cols[n], n); }
  fill(cols) { this.each(cols, (g, c) => { g.fillStyle = c; g.fillRect(0, 0, this.w, this.h); }); }
  rect(cols, x, y, w, h) { this.each(cols, (g, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }); }
  /** Вертикальный градиент только на albedo: [top, bottom]. */
  grad(x, y, w, h, top, bottom, name = "a") {
    const g = this.g[name]; const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  line(cols, x0, y0, x1, y1, width) {
    this.each(cols, (g, c) => { g.strokeStyle = c; g.lineWidth = width; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); });
  }
  /** Тайлящийся value-noise: мягкие пятна + мелкое зерно. */
  noise(name, amount, freq = 6, grain = 0.5, seed = 7) {
    const g = this.g[name], w = this.w, h = this.h;
    const img = g.getImageData(0, 0, w, h), d = img.data;
    const r = rng(seed); const grid = new Float32Array(freq * freq);
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
  /** Карта нормалей из слоя высот (OpenGL-конвенция, +Y вверх). */
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

// ---------- Стеклянный витраж (офисные башни): плитка 24 м, 8 этажей × 8 колонн ----------
function glassFamily(S) {
  const L = new Layers(S, S);
  const r = rng(101);
  const F = 8, C = 8, fh = S / F, cw = S / C, m = S / 24; // px на метр
  L.fill({ a: "#222427", o: orm(0.34, 0.82), h: "#8a8a8a", e: "#000" });
  for (let f = 0; f < F; f++) {
    const yTop = S - (f + 1) * fh;
    const floorBias = r() < 0.3 ? 0.62 : 0.1;
    for (let c = 0; c < C; c++) {
      const x0 = c * cw;
      // спандрельная панель между этажами (0.95 м)
      const sp = 12 + r() * 6;
      L.rect({ a: `rgb(${18 + sp},${19 + sp},${22 + sp})`, o: orm(0.4, 0.7), h: "#767676" }, x0 + 4, yTop + 2, cw - 8, 0.95 * m);
      // витражное стекло
      const gy = yTop + 0.95 * m + 3, gh = fh - 0.95 * m - 6;
      const hue = 195 + r() * 25, lit = r() < floorBias;
      const blind = !lit && r() < 0.28;
      L.rect({ a: "#0a0e12", o: orm(0.05 + r() * 0.08, 0.8), h: "#565656", e: "#000" }, x0 + 4, gy, cw - 8, gh);
      L.grad(x0 + 4, gy, cw - 8, gh, hsl(hue, 18, 13 + r() * 5), hsl(hue, 22, 5));
      if (lit) {
        const warm = r() < 0.55, k = 0.55 + r() * 0.45;
        const col = warm ? `rgb(${clamp255(255 * k)},${clamp255(196 * k)},${clamp255(132 * k)})` : `rgb(${clamp255(196 * k)},${clamp255(214 * k)},${clamp255(255 * k)})`;
        L.rect({ e: col }, x0 + 5, gy + 1, cw - 10, gh - 2);
        L.grad(x0 + 5, gy + 1, cw - 10, gh - 2, "rgba(255,255,255,0.22)", "rgba(0,0,0,0.25)"); // потолочный свет
      } else if (blind) {
        L.rect({ a: `rgb(${128 + r() * 40},${126 + r() * 40},${118 + r() * 40})` }, x0 + 5, gy + 1, cw - 10, gh * (0.3 + r() * 0.45));
      }
      // импост (горизонтальная стойка) на середине витража
      L.rect({ a: "#2a2c2f", o: orm(0.34, 0.82), h: "#9a9a9a", e: "#000" }, x0 + 4, gy + gh * 0.5 - 1.5, cw - 8, 3);
    }
  }
  L.noise("a", 0.07, 10, 0.8, 3);
  return { L, tile: 24, normal: 4, srgb: true };
}

// ---------- Камень/бетон с точечными окнами: плитка 24 м, 8 этажей × 4 оси ----------
function stoneFamily(S, { base = [163, 154, 140], winW = 2.3, winH = 1.75, sill = 0.95, ribbon = false } = {}) {
  const L = new Layers(S, S);
  const r = rng(202);
  const F = 8, B = 4, fh = S / F, bw = S / B, m = S / 24;
  L.fill({ a: `rgb(${base.join(",")})`, o: orm(0.8, 0), h: "#909090", e: "#000" });
  // кладка: швы через 0.75 м, вертикальные вразбежку
  for (let y = 0; y < S; y += 0.75 * m) {
    L.rect({ a: "rgba(30,26,22,0.13)", h: "#6e6e6e" }, 0, y, S, 1.2);
    const off = (Math.round(y / (0.75 * m)) % 2) * bw * 0.5;
    for (let x = off; x < S + bw; x += bw) L.rect({ a: "rgba(30,26,22,0.10)", h: "#767676" }, x, y, 1.2, 0.75 * m);
  }
  for (let f = 0; f < F; f++) {
    const yBot = S - f * fh, yWin = yBot - sill * m - winH * m;
    for (let b = 0; b < B; b++) {
      const x0 = b * bw + (bw - winW * m) / 2;
      // потёки под окном
      if (r() < 0.6) L.rect({ a: "rgba(52,46,40,0.10)" }, x0 + r() * winW * m * 0.7, yBot - sill * m, 0.2 * m + r() * 0.3 * m, sill * m * (0.5 + r() * 0.5));
      // рама и стекло
      L.rect({ a: "#26272a", o: orm(0.45, 0.6), h: "#b8b8b8", e: "#000" }, x0 - 4, yWin - 4, winW * m + 8, winH * m + 8);
      L.rect({ a: "#0a0f14", o: orm(0.07, 0.78), h: "#3c3c3c", e: "#000" }, x0, yWin, winW * m, winH * m);
      L.grad(x0, yWin, winW * m, winH * m, "rgba(120,150,175,0.30)", "rgba(0,0,0,0.25)");
      // подоконник
      L.rect({ a: `rgb(${base[0] + 18},${base[1] + 18},${base[2] + 16})`, h: "#d8d8d8" }, x0 - 5, yBot - sill * m, winW * m + 10, 5);
      if (r() < 0.24) {
        const k = 0.5 + r() * 0.5;
        L.rect({ e: `rgb(${clamp255(255 * k)},${clamp255(190 * k)},${clamp255(120 * k)})` }, x0 + 1, yWin + 1, winW * m - 2, winH * m - 2);
      }
      if (ribbon) L.rect({ a: "rgba(255,255,255,0.10)", h: "#a8a8a8" }, b * bw, yWin - 9, bw, 5);
    }
  }
  void r;
  L.noise("a", 0.11, 7, 0.9, 5);
  return { L, tile: 24, normal: 7, srgb: true };
}

// ---------- Сборные панели (советский/2000-е период): плитка 24 м, 8 этажей × 4 модуля ----------
function panelFamily(S) {
  const L = new Layers(S, S);
  const r = rng(303);
  const F = 8, B = 4, fh = S / F, bw = S / B, m = S / 24;
  L.fill({ a: "rgb(205,205,200)", o: orm(0.74, 0), h: "#8c8c8c", e: "#000" });
  // швы панелей по границам модулей
  for (let f = 0; f <= F; f++) L.rect({ a: "rgba(40,40,38,0.28)", h: "#5c5c5c" }, 0, S - f * fh - 1.5, S, 3);
  for (let b = 0; b <= B; b++) L.rect({ a: "rgba(40,40,38,0.24)", h: "#646464" }, b * bw - 1.5, 0, 3, S);
  for (let f = 0; f < F; f++) {
    const yBot = S - f * fh;
    for (let b = 0; b < B; b++) {
      const x0 = b * bw;
      const loggia = r() < 0.3;
      if (loggia) {
        // открытая лоджия: глубокая ниша со светлым ограждением
        L.rect({ a: "#4a4c4e", o: orm(0.8, 0), h: "#3a3a3a", e: "#000" }, x0 + 0.5 * m, yBot - 2.55 * m, 5.0 * m, 2.55 * m);
        L.rect({ a: "rgb(196,196,190)", h: "#9c9c9c" }, x0 + 0.6 * m, yBot - 1.05 * m, 4.8 * m, 1.0 * m);
        L.rect({ a: "rgba(0,0,0,0.18)" }, x0 + 0.6 * m, yBot - 1.05 * m, 4.8 * m, 0.12 * m);
      } else {
        // парное окно с белой рамой
        const ww = 3.0 * m, wh = 1.55 * m, x = x0 + (bw - ww) / 2, y = yBot - 0.95 * m - wh;
        L.rect({ a: "#ececea", o: orm(0.5, 0.05), h: "#b4b4b4", e: "#000" }, x - 4, y - 4, ww + 8, wh + 8);
        L.rect({ a: "#0b1015", o: orm(0.08, 0.75), h: "#444444", e: "#000" }, x, y, ww, wh);
        L.grad(x, y, ww, wh, "rgba(110,140,165,0.28)", "rgba(0,0,0,0.3)");
        L.rect({ a: "#ececea", o: orm(0.5, 0.05), h: "#b4b4b4", e: "#000" }, x + ww / 2 - 3, y, 6, wh);
        if (r() < 0.3) {
          const k = 0.45 + r() * 0.55;
          L.rect({ e: `rgb(${clamp255(255 * k)},${clamp255(186 * k)},${clamp255(112 * k)})` }, x + 2, y + 2, ww - 4, wh - 4);
          L.rect({ e: "#000" }, x + ww / 2 - 3, y, 6, wh);
        }
      }
    }
  }
  L.noise("a", 0.1, 8, 0.7, 9);
  return { L, tile: 24, normal: 6, srgb: true };
}

// ---------- Современное жильё со стеклянными балконами: плитка 24 м, 8 этажей × 6 модулей ----------
function resFamily(S) {
  const L = new Layers(S, S);
  const r = rng(404);
  const F = 8, B = 6, fh = S / F, bw = S / B, m = S / 24;
  L.fill({ a: "rgb(214,208,196)", o: orm(0.72, 0), h: "#949494", e: "#000" });
  for (let f = 0; f <= F; f++) L.rect({ a: "rgba(60,56,50,0.22)", h: "#7a7a7a" }, 0, S - f * fh - 1.5, S, 3);
  for (let f = 0; f < F; f++) {
    const yBot = S - f * fh;
    for (let b = 0; b < B; b++) {
      const x0 = b * bw, bal = r() < 0.5;
      if (bal) {
        // французский балкон во всю высоту
        L.rect({ a: "#071016", o: orm(0.06, 0.8), h: "#505050", e: "#000" }, x0 + 0.3 * m, yBot - 2.65 * m, bw - 0.6 * m, 2.65 * m);
        L.grad(x0 + 0.3 * m, yBot - 2.65 * m, bw - 0.6 * m, 2.65 * m, "rgba(125,165,190,0.30)", "rgba(0,0,0,0.2)");
        L.rect({ a: "#e9e9e6", o: orm(0.45, 0.05), h: "#b0b0b0", e: "#000" }, x0 + 0.3 * m, yBot - 2.65 * m, 5, 2.65 * m);
        L.rect({ a: "#e9e9e6", o: orm(0.45, 0.05), h: "#b0b0b0", e: "#000" }, x0 + bw - 0.3 * m - 5, yBot - 2.65 * m, 5, 2.65 * m);
        L.rect({ a: "#e9e9e6", o: orm(0.45, 0.05), h: "#b0b0b0", e: "#000" }, x0 + 0.3 * m, yBot - 2.65 * m, bw - 0.6 * m, 5);
      } else {
        const ww = 1.7 * m, wh = 1.6 * m, x = x0 + (bw - ww) / 2, y = yBot - 0.9 * m - wh;
        L.rect({ a: "#e9e9e6", o: orm(0.45, 0.05), h: "#a8a8a8", e: "#000" }, x - 4, y - 4, ww + 8, wh + 8);
        L.rect({ a: "#0a1016", o: orm(0.07, 0.78), h: "#464646", e: "#000" }, x, y, ww, wh);
        L.grad(x, y, ww, wh, "rgba(115,150,175,0.3)", "rgba(0,0,0,0.25)");
        L.rect({ a: "#e9e9e6", o: orm(0.45, 0.05), h: "#a8a8a8", e: "#000" }, x + ww / 2 - 3, y, 6, wh);
      }
      if (r() < 0.27) {
        const k = 0.45 + r() * 0.55;
        const ins = bal ? [x0 + 0.3 * m + 5, yBot - 2.65 * m + 5, bw - 0.6 * m - 10, 2.65 * m - 10]
          : [x0 + (bw - 1.7 * m) / 2 + 2, yBot - 0.9 * m - 1.6 * m + 2, 1.7 * m - 4, 1.6 * m - 4];
        L.rect({ e: `rgb(${clamp255(255 * k)},${clamp255(196 * k)},${clamp255(134 * k)})` }, ...ins);
      }
    }
  }
  L.noise("a", 0.08, 9, 0.6, 11);
  return { L, tile: 24, normal: 6, srgb: true };
}

/** Собрать PBR-набор: { map, normalMap, orm, emissiveMap, tile } с общим repeat. */
function pack(fam) {
  const rep = 1 / fam.tile;
  const map = fam.L.texture("a", { srgb: true, repeat: rep });
  const normalMap = fam.L.normalTexture(fam.normal, rep);
  const ormTex = fam.L.texture("o", { repeat: rep });
  const emissiveMap = fam.L.texture("e", { srgb: true, repeat: rep });
  return { map, normalMap, roughnessMap: ormTex, metalnessMap: ormTex, emissiveMap, tile: fam.tile };
}

// ---------- Прочие материалы (плитка tile метров) ----------
function plates(S, { base, rough, metal, seam = 1.5, rivets = true, tile = 6, brush = 0, tarnish = 0, seed = 1, bump = "#808080" }) {
  const L = new Layers(S, S);
  const r = rng(seed);
  const m = S / tile, n = Math.max(1, Math.round(tile / seam)), step = S / n;
  L.fill({ a: base, o: orm(rough, metal), h: bump });
  for (let i = 0; i < n; i++) {
    L.rect({ a: "rgba(0,0,0,0.34)", o: orm(Math.min(1, rough + 0.2), metal * 0.6), h: "#3c3c3c" }, i * step, 0, 2.2, S);
    L.rect({ a: "rgba(0,0,0,0.34)", o: orm(Math.min(1, rough + 0.2), metal * 0.6), h: "#3c3c3c" }, 0, i * step, S, 2.2);
    L.rect({ a: "rgba(255,255,255,0.10)" }, i * step + 2.2, 0, 1.5, S);
    L.rect({ a: "rgba(255,255,255,0.10)" }, 0, i * step + 2.2, S, 1.5);
  }
  // вразбежку вертикальных швов по поясам
  for (let i = 0; i < n; i++) for (let x = (i % 2) * step * 0.5; x < S; x += step) {
    L.rect({ a: "rgba(0,0,0,0.22)", h: "#585858" }, x, i * step, 1.6, step);
  }
  if (rivets) for (let y = step * 0.12; y < S; y += step) for (let x = 9; x < S; x += Math.max(14, step * 0.14)) {
    L.rect({ a: "rgba(0,0,0,0.35)", h: "#c0c0c0" }, x, y, 3, 3);
    L.rect({ a: "rgba(255,235,200,0.28)", h: "#f0f0f0" }, x + 0.5, y - 0.8, 1.6, 1.6);
  }
  if (brush) {
    for (let i = 0; i < S * 5; i++) {
      const y = r() * S, v = (r() - 0.5) * brush;
      L.line({ a: `rgba(${clamp255(128 + v)},${clamp255(128 + v)},${clamp255(128 + v)},0.10)` }, 0, y, S, y + (r() - 0.5) * 3, 1);
    }
  }
  if (tarnish) for (let i = 0; i < S * 0.25; i++) {
    L.rect({ a: `rgba(28,62,48,${0.04 + r() * tarnish})`, o: orm(rough + 0.25, metal * 0.7) }, r() * S, r() * S, 4 + r() * 30, 3 + r() * 16);
  }
  L.noise("a", 0.08, 6, 0.9, seed);
  return L;
}

function roofTex(S, tile = 8) {
  const L = new Layers(S, S);
  const r = rng(77);
  L.fill({ a: "#3a3b3d", o: orm(0.88, 0.02), h: "#808080", e: "#000" });
  for (let i = 0; i < 260; i++) {
    const v = 40 + r() * 46;
    L.rect({ a: `rgba(${v},${v},${v - 2},0.35)` }, r() * S, r() * S, 2 + r() * 26, 2 + r() * 20);
  }
  for (let i = 0; i < 12; i++) L.rect({ a: "rgba(20,20,22,0.22)" }, r() * S, r() * S, S * 0.12, S * 0.12);
  L.noise("a", 0.2, 14, 1, 8);
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(3, rep), tile };
}

function concreteTex(S, { base = "#a8a6a0", tile = 4, rough = 0.8, seed = 5 } = {}) {
  const L = new Layers(S, S);
  const r = rng(seed);
  L.fill({ a: base, o: orm(rough, 0), h: "#808080" });
  for (let i = 0; i < 400; i++) L.rect({ a: `rgba(0,0,0,${0.02 + r() * 0.06})` }, r() * S, r() * S, 2 + r() * 20, 1 + r() * 6);
  const step = S / 2;
  L.rect({ a: "rgba(40,38,34,0.22)", h: "#606060" }, 0, 0, S, 2); L.rect({ a: "rgba(40,38,34,0.22)", h: "#606060" }, 0, 0, 2, S);
  L.rect({ a: "rgba(40,38,34,0.22)", h: "#606060" }, 0, step, S, 2); L.rect({ a: "rgba(40,38,34,0.22)", h: "#606060" }, step, 0, 2, S);
  L.noise("a", 0.14, 6, 1, seed);
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(5, rep), tile };
}

/** Золото Байтерека: квадратные плитки 0.6 м, плитка текстуры 4.8 м. */
function goldTiles(S) {
  const L = new Layers(S, S);
  const r = rng(21);
  const n = 8, s = S / n;
  L.fill({ a: "#2a1d08", o: orm(0.5, 0.9), h: "#5a5a5a" });
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = 0.86 + r() * 0.22, warm = r() * 10;
    L.rect({ a: `rgb(${clamp255(236 * k)},${clamp255((188 + warm) * k)},${clamp255((92 + warm * 2) * k)})`, o: orm(0.12 + r() * 0.12, 1), h: "#a8a8a8" }, i * s + 2, j * s + 2, s - 4, s - 4);
    L.grad(i * s + 2, j * s + 2, s - 4, s - 4, "rgba(255,255,255,0.16)", "rgba(80,40,0,0.14)");
  }
  const rep = 1 / 4.8;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(8, rep), tile: 4.8 };
}

/** Пирамида: синее витражное стекло со стальной решёткой, плитка 8 м. Ночью светится изнутри. */
function latticeGlass(S, { tile = 8, cells = 4, line = "#d9dde0", glassA = "#0f2a44", glassB = "#081826", glow = "rgb(38,84,150)" } = {}) {
  const L = new Layers(S, S);
  const r = rng(33);
  const s = S / cells;
  L.fill({ a: glassA, o: orm(0.07, 0.72), h: "#606060", e: glow });
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) L.grad(i * s, j * s, s, s, glassB, glassA);
  void r;
  const w = Math.max(3, S * 0.007);
  for (let i = 0; i <= cells; i++) {
    L.rect({ a: line, o: orm(0.35, 0.6), h: "#d0d0d0", e: "#000" }, i * s - w / 2, 0, w, S);
    L.rect({ a: line, o: orm(0.35, 0.6), h: "#d0d0d0", e: "#000" }, 0, i * s - w / 2, S, w);
  }
  for (let i = -cells; i < cells * 2; i++) { // диагонали
    L.line({ a: line, o: orm(0.35, 0.6), h: "#d0d0d0", e: "#000" }, i * s, 0, i * s + S, S, w * 0.8);
    L.line({ a: line, o: orm(0.35, 0.6), h: "#d0d0d0", e: "#000" }, i * s, 0, i * s - S, S, w * 0.8);
  }
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(6, rep), roughnessMap: L.texture("o", { repeat: rep }), metalnessMap: L.texture("o", { repeat: rep }), emissiveMap: L.texture("e", { srgb: true, repeat: rep }), tile };
}

/** Сфера «Нур Алем»: диагональная сетка, стеклянные ячейки (маска для LED). */
function diagrid(S, { tile = 10, cells = 5 } = {}) {
  const L = new Layers(S, S);
  const s = S / cells;
  L.fill({ a: "#0c1620", o: orm(0.1, 0.7), h: "#606060", e: "#ffffff" });
  const w = Math.max(4, S * 0.012);
  for (let i = -cells; i < cells * 2; i++) {
    L.line({ a: "#b9c0c6", o: orm(0.4, 0.5), h: "#e0e0e0", e: "#000" }, i * s, 0, i * s + S, S, w);
    L.line({ a: "#b9c0c6", o: orm(0.4, 0.5), h: "#e0e0e0", e: "#000" }, i * s, 0, i * s - S, S, w);
  }
  const rep = 1 / tile;
  return { map: L.texture("a", { srgb: true, repeat: rep }), normalMap: L.normalTexture(7, rep), roughnessMap: L.texture("o", { repeat: rep }), metalnessMap: L.texture("o", { repeat: rep }), emissiveMap: L.texture("e", { repeat: rep }), tile };
}

// ---------- Обшивка дирижабля: 2048×1024. x — вдоль корпуса (нос→корма), y — вокруг (0 верх) ----------
function hullSkin(W = 2048, H = 1024) {
  const L = new Layers(W, H);
  const r = rng(55);
  const m = W / 170; // px на метр вдоль
  L.fill({ a: "#d2ccbb", o: orm(0.46, 0.02), h: "#808080", e: "#000" });
  // продольные швы (24 клина)
  const gore = H / 24;
  for (let k = 0; k < 24; k++) {
    L.rect({ a: "rgba(70,62,50,0.22)", o: orm(0.6, 0.02), h: "#5c5c5c" }, 0, k * gore, W, 2);
    L.rect({ a: "rgba(255,255,255,0.10)" }, 0, k * gore + 2, W, 1.5);
  }
  // поперечные швы по шпангоутам (каждые 7.5 м)
  for (let x = 0; x < W; x += 7.5 * m) {
    L.rect({ a: "rgba(70,62,50,0.16)", o: orm(0.56, 0.02), h: "#646464" }, x, 0, 2, H);
    L.rect({ a: "rgba(255,255,255,0.07)" }, x + 2, 0, 1.5, H);
  }
  // потёртости и вытяжка ткани: длинные слабые полосы вдоль корпуса
  for (let i = 0; i < 520; i++) {
    const y = r() * H, v = r() < 0.5;
    L.rect({ a: v ? `rgba(255,255,250,${0.02 + r() * 0.035})` : `rgba(96,84,66,${0.02 + r() * 0.035})`, o: orm(0.4 + r() * 0.2, 0.02) }, r() * W, y, 30 + r() * 170, 2 + r() * 5);
  }
  for (let i = 0; i < 14; i++) L.rect({ a: `rgba(170,160,140,${0.14 + r() * 0.16})`, o: orm(0.6, 0.02) }, r() * W, r() * H, 14 + r() * 30, 10 + r() * 22);
  // грязь вдоль килевой линии (низ корпуса: y ≈ H/2)
  L.grad(0, H * 0.5 - 90, W, 180, "rgba(60,50,40,0)", "rgba(60,50,40,0.26)");
  L.grad(0, H * 0.5, W, 90, "rgba(60,50,40,0.26)", "rgba(60,50,40,0)");
  L.noise("a", 0.05, 5, 0.9, 13);
  // окна пассажирской палубы: нижние части бортов (правый борт y>H/2, левый y<H/2), нос в x=0
  for (const yc of [H * 0.656, H * 0.689, H * 0.311, H * 0.344]) {
    for (let x = 0.235 * W; x < 0.39 * W; x += 2.4 * m) {
      L.rect({ a: "#101418", h: "#505050", e: `rgb(${200 + r() * 55},${150 + r() * 60},${84 + r() * 60})` }, x, yc, 1.3 * m, 0.8 * m);
    }
  }
  const t = (n, srgb, rep) => { const tx = L.texture(n, { srgb, repeat: 1 }); tx.repeat.set(...rep); return tx; };
  return { map: t("a", true, [1, 1]), normalMap: L.normalTexture(5, 1), roughnessMap: t("o", false, [1, 1]), metalnessMap: t("o", false, [1, 1]), emissiveMap: t("e", true, [1, 1]) };
}

// ---------- Спрайты и вывески ----------
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
/** Крона дерева для crossed-billboard: RGBA. */
export function leafSprite(size = 256, seed = 9) {
  const c = cv(size, size), g = c.getContext("2d");
  const r = rng(seed);
  for (let i = 0; i < 420; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * size * 0.4;
    const x = size / 2 + Math.cos(a) * d, y = size * 0.44 + Math.sin(a) * d * 0.86, rad = size * (0.03 + r() * 0.05);
    const sh = r();
    g.fillStyle = `rgb(${clamp255(58 + sh * 50)},${clamp255(92 + sh * 58)},${clamp255(34 + sh * 30)})`;
    g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  g.fillStyle = "rgb(52,40,30)"; g.fillRect(size / 2 - 4, size * 0.5, 8, size * 0.5);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t;
}

const SIGN_WORDS = ["АСТАНА", "НҰРЖОЛ", "ТАКСИ", "АПТЕКА", "ОТЕЛЬ", "БАНК", "КАФЕ", "ШЫМКЕНТ", "АЛМАТЫ", "ҚАЗАҚСТАН", "РЕСТОРАН", "СУШИ", "ПИВНОЙ", "DINARA", "ORBITA", "NEON", "ZHEMBEK", "AK ORDA", "SAMGAU", "TULPAR", "BAR", "24/7", "КИНО", "БАЗАР", "АЯЗ"];
/** Неоновая вывеска с настоящими словами (canvas-текст). */
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
  glass: (S) => pack(glassFamily(S)),
  stone: (S) => pack(stoneFamily(S)),
  stoneRibbon: (S) => pack(stoneFamily(S, { base: [176, 170, 160], winW: 5.2, winH: 1.5, sill: 1.0, ribbon: true })),
  panel: (S) => pack(panelFamily(S)),
  res: (S) => pack(resFamily(S)),
  roof: (S) => roofTex(S),
  concrete: (S, o) => concreteTex(S, o),
  gold: (S) => goldTiles(S),
  lattice: (S) => latticeGlass(S),
  diagrid: (S) => diagrid(S),
  steel: (S) => plates(S, { base: "#737a81", rough: 0.42, metal: 0.92, seed: 31, brush: 30 }),
  brass: (S) => plates(S, { base: "#b08a4e", rough: 0.34, metal: 1, seam: 1.2, seed: 32, brush: 46, tarnish: 0.1, tile: 4.8 }),
  copper: (S) => plates(S, { base: "#8a5a3c", rough: 0.42, metal: 1, seam: 1.2, seed: 33, brush: 30, tarnish: 0.16, tile: 4.8 }),
  white: (S) => plates(S, { base: "#e6e4dc", rough: 0.5, metal: 0.15, seam: 3, rivets: true, seed: 34, tile: 6 }),
  hull: () => hullSkin(),
};
