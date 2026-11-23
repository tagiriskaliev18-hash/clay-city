// ============================================================
// CLAY CITY v3 — «ASTANA RING». Генплан, размеры, тиры качества.
// Единицы — метры. +Y вверх, центр города в (0,0,0), север = −Z, восток = +X.
// ============================================================

// Платформы города. ringRoads — радиусы кольцевых улиц (м), ave[i] — число радиальных
// проспектов в полосе i (полоса 0 — от rIn до ringRoads[0]). edgeIn/edgeOut — набережные
// без застройки у внутреннего и внешнего края.
export const PLATFORMS = [
  { id: "core",  rIn: 0,    rOut: 560,  y: 0,   thick: 46, ringRoads: [150, 240, 330, 420, 505], ave: [8, 16, 16, 32], edgeIn: 0,  edgeOut: 56, plaza: 150 },
  { id: "ringB", rIn: 620,  rOut: 920,  y: 40,  thick: 38, ringRoads: [700, 780, 860],          ave: [32, 32, 32, 32], edgeIn: 24, edgeOut: 56, plaza: 0 },
  { id: "ringC", rIn: 960,  rOut: 1200, y: 85,  thick: 38, ringRoads: [1040, 1120],             ave: [48, 48, 48],     edgeIn: 24, edgeOut: 56, plaza: 0 },
  { id: "ringD", rIn: 1250, rOut: 1430, y: 120, thick: 32, ringRoads: [1330, 1390],             ave: [48, 48, 48],     edgeIn: 18, edgeOut: 40, plaza: 0 },
];

export const ROAD = { ringHalf: 9, aveHalf: 8, walk: 5, curb: 0.16, lampStep: 38 };
export const FACADE_TILE = 24;   // метров на плитку фасадной текстуры

// Главные оси и зоны (центральный диск)
export const BOULEVARD = { x0: -150, x1: 560, half: 46 };          // Нуржол: от Акорды к мосту
export const BOULEVARD_B = { x0: 620, x1: 700, half: 46 };         // продолжение на кольце B

// ---------- Зоны достопримечательностей (прямоугольники в осях X/Z, метры) ----------
// y = высота платформы. Шейдер земли убирает дороги внутри зоны (площадь перед зданием),
// генератор зданий не ставит постройки в этих зонах.
export const PLATFORM_Y = { core: 0, ringB: 40, ringC: 85, ringD: 120 };
export const ZONES = [
  { id: "bayterek",   x: 0,    z: 0,    hx: 70,  hz: 70,  plat: "core"  },   // Байтерек, 105 м
  { id: "akOrda",     x: -286, z: 0,    hx: 46,  hz: 92,  plat: "core"  },   // Резиденция Президента
  { id: "parliament", x: -300, z: -172, hx: 52,  hz: 64,  plat: "core"  },   // Парламент, золотой купол
  { id: "mosque",     x: -222, z: -262, hx: 86,  hz: 74,  plat: "core"  },   // Хазрет Султан
  { id: "museum",     x: -262, z: 236,  hx: 54,  hz: 116, plat: "core"  },   // Национальный музей
  { id: "pyramid",    x: 214,  z: -286, hx: 42,  hz: 42,  plat: "core"  },   // Дворец мира и согласия
  { id: "circus",     x: 436,  z: -214, hx: 48,  hz: 48,  plat: "core"  },   // Цирк («НЛО»)
  { id: "khanShatyr", x: 776,  z: 0,    hx: 110, hz: 98,  plat: "ringB" },   // Хан Шатыр, шатёр 150 м
  { id: "abuDhabi",   x: 790,  z: 258,  hx: 76,  hz: 76,  plat: "ringB" },   // Abu Dhabi Plaza, 382 м
  { id: "nurAlem",    x: 1000, z: -400, hx: 56,  hz: 56,  plat: "ringC" },   // Сфера «Нур Алем», D=80 м
  { id: "arch",       x: -700, z: 712,  hx: 46,  hz: 22,  plat: "ringC" },   // Арка «Мәңгілік Ел»
];

// ---------- Фирменные башни даунтауна (строит signature.js) ----------
export const SIGNATURE = [
  { id: "emerald1",    x: 150,  z: -190, yaw: 0.3,  hx: 26, hz: 26, plat: "core" },  // Emeral Tower I: круглая, изумрудное стекло, 210 м
  { id: "emerald2",    x: 232,  z: -168, yaw: 0.3,  hx: 20, hz: 20, plat: "core" },  // Emeral Tower II: 152 м
  { id: "transport",   x: -48,  z: -318, yaw: 0.0,  hx: 26, hz: 26, plat: "core" },  // Transport Tower: синее стекло, 168 м
  { id: "northLights", x: 318,  z: -356, yaw: -0.6, hx: 60, hz: 30, plat: "core" },  // Northern Lights: 3 башни + мост
  { id: "kmgas",       x: 416,  z: -124, yaw: 0.5,  hx: 48, hz: 24, plat: "core" },  // «Ворота»: 2 башни, мост, золотой диск
  { id: "beijing",     x: 480,  z: -34,  yaw: 0.2,  hx: 24, hz: 22, plat: "core" },  // плита + золотая сфера на крыше
  { id: "talan",       x: -360, z: -300, yaw: 0.9,  hx: 58, hz: 26, plat: "core" },  // Talan Towers: бронзовое стекло, скошенные крыши
  { id: "triumph",     x: 72,   z: -436, yaw: 0.1,  hx: 30, hz: 24, plat: "core" },  // Triumph: синий клин 142 м
  { id: "moscow",      x: -440, z: -150, yaw: 0.0,  hx: 30, hz: 30, plat: "core" },  // «Москва»: треугольная башня
  { id: "armada",      x: 196,  z: 150,  yaw: 1.3,  hx: 48, hz: 22, plat: "core" },  // две плиты + верхний мост
  { id: "arman",       x: 250,  z: 230,  yaw: 1.3,  hx: 44, hz: 22, plat: "core" },  // близнецы с острыми коронами
];

/** Попадает ли прямоугольник (центр, полуразмеры) в зарезервированную зону. */
export function intersectsReserved(cx, cz, hx, hz) {
  for (const z of ZONES) if (Math.abs(cx - z.x) < hx + z.hx && Math.abs(cz - z.z) < hz + z.hz) return true;
  for (const s of SIGNATURE) if (Math.abs(cx - s.x) < hx + s.hx && Math.abs(cz - s.z) < hz + s.hz) return true;
  return false;
}

// ---------- Районы (для генератора зданий) ----------
// 'downtown' — стеклянные башни; 'government' — каменный низкий центр; 'business' — смешанный;
// 'oldcenter' — советские 5–9 этажей; 'residential' — современное жильё; 'suburb' — частные дома.
export function district(plat, x, z) {
  if (plat === "core") {
    if (x > -130 && z < -70) return "downtown";
    if (x < -130 && z > 70) return "midrise";
    if (x < -130) return "government";
    return "business";
  }
  if (plat === "ringB") return x > -40 ? "business" : "oldcenter";
  if (plat === "ringC") return z < 0 ? "residential" : "residential";
  if (plat === "ringD") return z < 0 ? "suburb" : "industry";
  return "residential";
}

// Тиры качества: выбирается по GPU (можно задать ?tier=…).
export const TIERS = {
  ultra:  { tex: 1024, msaa: 4, cascades: 4, shadow: 4096, shadowFar: 5200, ao: true, aoSamples: 20, cloudOct: 6, dpr: 2.0,  lod: [1000, 2600], particles: 1.0 },
  high:   { tex: 1024, msaa: 4, cascades: 4, shadow: 2048, shadowFar: 4200, ao: true, aoSamples: 10, cloudOct: 5, dpr: 1.5,  lod: [800, 2200],  particles: 0.8 },
  medium: { tex: 512,  msaa: 4, cascades: 3, shadow: 2048, shadowFar: 3000, ao: true, aoSamples: 8,  cloudOct: 4, dpr: 1.0,  lod: [600, 1700],  particles: 0.5 },
  low:    { tex: 512,  msaa: 0, cascades: 2, shadow: 1024, shadowFar: 1600, ao: false, aoSamples: 6, cloudOct: 3, dpr: 0.75, lod: [400, 1200],  particles: 0.25 },
};

export function detectTier(gl) {
  const q = new URLSearchParams(location.search).get("tier");
  if (q && TIERS[q]) return q;
  try {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    if (/RTX|Radeon RX 6|Radeon RX 7|Radeon Pro W6|Radeon Pro W7|Apple M[1-4]|Arc A[5-7]/i.test(r)) return /RTX 30[6-9]|RTX 40|RX 7[8-9]|Apple M[2-4]/.test(r) ? "ultra" : "high";
    if (/SwiftShader|llvmpipe|Mali|Adreno|Apple GPU|Intel/i.test(r)) return /Mali|Adreno|SwiftShader|llvmpipe/.test(r) ? "low" : "medium";
  } catch (e) { /* не критично */ }
  return "high";
}

// Глобальное состояние освещения (0 = день … 1 = ночь), читается модулями сцены
export const STATE = { night: 0, time: 0, tier: "high", tierCfg: TIERS.high };
