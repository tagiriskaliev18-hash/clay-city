// ============================================================
// ASTANA REAL v2 — config.js
// Реальная география Астаны: Левый берег (ось Водно-Зелёного
// бульвара Нуржол), река Есиль, Правый берег.
// Единицы — метры. +Y вверх, +X на восток, +Z на юг, земля y=0.
// ============================================================

// ── мировые габариты ──
export const WORLD = { size: 3600, riverX: 780, riverW: 155, axisZ: 0 };

// ── достопримечательности (реальные XZ координаты, метры; Z=0 — ось Нуржол) ──
export const LANDMARKS = {
  khanShatyr:   { x: -940, z: 0,     r: 112, h: 150 },
  roundSquare:  { x: -560, z: 0,     r: 102 },
  bayterek:     { x:    0, z: 0,     r: 52,  h: 105 },
  ministries:   { x:  310, z: 0,     r: 130 },
  akorda:       { x:  590, z: 0,     r: 92,  h: 80  },
  pyramid:      { x: 1080, z: 0,     r: 68,  h: 77  },
  mosque:       { x: 1130, z: -260,  r: 92,  h: 77  },
  museum:       { x: 1180, z: +240,  r: 112, h: 36  },
  arch:         { x:   90, z: +640,  r: 36,  h: 22  },
  nurAlem:      { x:   90, z: +960,  r: 72,  h: 100 },
  abuDhabi:     { x: -160, z: +250,  r: 78,  h: 320 },
  qazaqGaz:     { x:  235, z: +155,  r: 58,  h: 86  },
};

// ── фирменные башни вдоль бульвара Нуржол ──
export const SIGNATURE = [
  { id: 'emerald1',       x: -360, z: -135, h: 210, w: 42, d: 36, hx: 22, hz: 19, plat: 'core', yaw: 0 },
  { id: 'emerald2',       x: -415, z: -155, h: 156, w: 36, d: 30, hx: 19, hz: 16, plat: 'core', yaw: 0 },
  { id: 'transportTower', x: -345, z: +130, h: 155, w: 34, d: 26, hx: 18, hz: 14, plat: 'core', yaw: 0 },
  { id: 'northernLights1',x: -220, z: -145, h: 180, w: 32, d: 28, hx: 17, hz: 15, plat: 'core', yaw: 0 },
  { id: 'northernLights2',x: -185, z: -145, h: 152, w: 30, d: 26, hx: 16, hz: 14, plat: 'core', yaw: 0 },
  { id: 'northernLights3',x: -150, z: -145, h: 128, w: 28, d: 24, hx: 15, hz: 13, plat: 'core', yaw: 0 },
  { id: 'talan1',         x:  -60, z: +135, h: 145, w: 34, d: 28, hx: 18, hz: 15, plat: 'core', yaw: 0 },
  { id: 'talan2',         x:  -30, z: +135, h: 119, w: 30, d: 26, hx: 16, hz: 14, plat: 'core', yaw: 0 },
  { id: 'kmgGate',        x: -560, z: 0,    h: 165, w: 46, d: 110, hx: 24, hz: 56, plat: 'core', yaw: 0 },
  { id: 'parliament',     x: +470, z: -140, h: 85,  w: 76, d: 96, hx: 38, hz: 48, plat: 'core', yaw: 0 },
  { id: 'senate',         x: +470, z: +140, h: 72,  w: 68, d: 82, hx: 34, hz: 41, plat: 'core', yaw: 0 },
  { id: 'beijingPalace',  x: -250, z: +210, h: 115, w: 44, d: 34, hx: 22, hz: 17, plat: 'core', yaw: 0 },
  { id: 'triumphAstana',  x: -720, z: -320, h: 142, w: 54, d: 42, hx: 27, hz: 21, plat: 'core', yaw: 0 },
  { id: 'circus',         x: -740, z: +340, h: 32,  w: 84, d: 84, hx: 42, hz: 42, plat: 'core', yaw: 0 },
];

// ── реальные проспекты (прямые линии) ──
export const ROADS = [
  // Ось Нуржол — пешеходный Водно-Зелёный бульвар
  { x0: -940, z0: 0,    x1: 590,  z1: 0,    width: 80, lanes: 0, type: 'boulevard' },
  // Дублёр-юг: ул. Достык
  { x0: -940, z0: +82,  x1: 590,  z1: +82,  width: 24, lanes: 3, type: 'road' },
  // Дублёр-север: ул. Кунаева
  { x0: -940, z0: -82,  x1: 590,  z1: -82,  width: 24, lanes: 3, type: 'road' },
  // пр. Туран
  { x0: -760, z0: -860, x1: -760, z1: +860, width: 30, lanes: 4, type: 'road' },
  // пр. Кабанбай батыра
  { x0: -430, z0: -860, x1: -430, z1: +860, width: 28, lanes: 3, type: 'road' },
  // пр. Мәңгілік Ел (к Триумфальной арке и EXPO Нур Алем)
  { x0: +90,  z0: -860, x1: +90,  z1: +1180, width: 30, lanes: 4, type: 'road' },
  // ул. Сарайшык (выходит на южный мост)
  { x0: -940, z0: +280, x1: 680,  z1: +280, width: 24, lanes: 3, type: 'road' },
  // ул. Сыганак
  { x0: -940, z0: +460, x1: 640,  z1: +460, width: 22, lanes: 2, type: 'road' },
  // Северная набережная/магистраль к мосту Атырау
  { x0: -940, z0: -260, x1: 680,  z1: -260, width: 22, lanes: 2, type: 'road' },
  // Правый берег — продолжение проспектов за мостами
  { x0: 880,  z0: +280, x1: 1480, z1: +280, width: 24, lanes: 2, type: 'road' },
  { x0: 880,  z0: -260, x1: 1480, z1: -260, width: 22, lanes: 2, type: 'road' },
  { x0: 1000, z0: -680, x1: 1000, z1: +680, width: 24, lanes: 2, type: 'road' },
  // 3 реальных моста через реку Есиль
  { x0: 680,  z0: 0,    x1: 880,  z1: 0,    width: 28, lanes: 3, type: 'bridge', style: 'cable' },
  { x0: 680,  z0: -260, x1: 880,  z1: -260, width: 16, lanes: 0, type: 'bridge', style: 'atyrau' },
  { x0: 680,  z0: +280, x1: 880,  z1: +280, width: 24, lanes: 2, type: 'bridge', style: 'arch' },
];

// ── зоны, в которых запрещена генерация зданий ──
export function intersectsReserved(cx, cz, hx, hz) {
  // Река Есиль и обе набережные
  if (cx + hx > WORLD.riverX - WORLD.riverW / 2 - 26 &&
      cx - hx < WORLD.riverX + WORLD.riverW / 2 + 26 &&
      cz + hz > -1150 && cz - hz < 1150) return true;

  // Водно-Зелёный бульвар Нуржол + променады
  if (cx + hx > -980 && cx - hx < 640 && Math.abs(cz) < 56 + hz) return true;

  // Широкий ансамбль Дома Министерств (две изогнутые дуги по обе стороны оси)
  if (cx + hx > 165 && cx - hx < 465 && Math.abs(cz) < 118 + hz) return true;

  // Церемониальный парк между Есилем и Пирамидой (Правый берег)
  if (cx + hx > 880 && cx - hx < 1280 && Math.abs(cz) < 360 + hz) return true;

  // Достопримечательности
  for (const k of Object.keys(LANDMARKS)) {
    const L = LANDMARKS[k];
    const lr = (L.r || 60) + 8;
    if (Math.abs(cx - L.x) < hx + lr && Math.abs(cz - L.z) < hz + lr) return true;
  }

  // Фирменные башни
  for (const s of SIGNATURE) {
    const sw = (s.w || 40) / 2 + 12;
    const sd = (s.d || 40) / 2 + 12;
    if (Math.abs(cx - s.x) < hx + sw && Math.abs(cz - s.z) < hz + sd) return true;
  }
  return false;
}

// ── районы (для генератора зданий) ──
export function district(x, z) {
  const riv = WORLD.riverX;
  if (x > riv + WORLD.riverW / 2) return 'rightBank';
  if (x > -920 && x < 540 && Math.abs(z) < 290) return 'downtown';
  if (x < -100 && x > -980 && Math.abs(z) < 480) return 'business';
  if (z > 420 || z < -320) return 'residential';
  return 'midrise';
}

// ── тиры качества (включая cloudOct для env.js!) ──
export const TIERS = {
  ultra:  { tex: 1024, msaa: 4, cascades: 4, shadow: 4096, shadowFar: 5200, ao: true,  aoSamples: 20, dpr: 2.0,  lod: [1000, 2600], particles: 1.0,  cloudOct: 5 },
  high:   { tex: 1024, msaa: 4, cascades: 4, shadow: 2048, shadowFar: 4200, ao: true,  aoSamples: 10, dpr: 1.5,  lod: [800, 2200],  particles: 0.8,  cloudOct: 4 },
  medium: { tex: 512,  msaa: 4, cascades: 3, shadow: 2048, shadowFar: 3000, ao: true,  aoSamples: 8,  dpr: 1.0,  lod: [600, 1700],  particles: 0.5,  cloudOct: 4 },
  low:    { tex: 512,  msaa: 0, cascades: 2, shadow: 1024, shadowFar: 1600, ao: false, aoSamples: 6,  dpr: 0.75, lod: [400, 1200],  particles: 0.25, cloudOct: 3 },
};

export function detectTier(gl) {
  const q = new URLSearchParams(location.search).get('tier');
  if (q && TIERS[q]) return q;
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    if (/RTX|Radeon RX 6|Radeon RX 7|Apple M[1-4]|Arc A[5-7]/i.test(r))
      return /RTX 30[6-9]|RTX 40|RX 7[8-9]|Apple M[2-4]/.test(r) ? 'ultra' : 'high';
    if (/SwiftShader|llvmpipe|Mali|Adreno|Apple GPU|Intel/i.test(r))
      return /Mali|Adreno|SwiftShader|llvmpipe/.test(r) ? 'low' : 'medium';
  } catch (_e) { /* не критично */ }
  return 'high';
}

// ── начальные ракурсы камеры ──
export const CAM_VIEWS = {
  nurzhol:    { pos: [760, 260, 580],    tgt: [0, 85, 0],       desc: 'Панорама оси Нуржол' },
  default:    { pos: [760, 260, 580],    tgt: [0, 85, 0],       desc: 'Панорама оси Нуржол' },
  bayterek:   { pos: [120, 155, 220],    tgt: [0, 65, 0],       desc: 'Байтерек' },
  akorda:     { pos: [740, 115, 190],    tgt: [590, 42, 0],     desc: 'Акорда и Есиль' },
  khanShatyr: { pos: [-1100, 210, 340],  tgt: [-940, 75, 0],    desc: 'Хан Шатыр' },
  abuDhabi:   { pos: [-340, 360, 460],   tgt: [-160, 165, 250], desc: 'Abu Dhabi Plaza' },
  pyramid:    { pos: [1220, 145, -190],  tgt: [1080, 38, 0],    desc: 'Пирамида и Мечеть' },
  qazaqgaz:   { pos: [120, 115, 305],    tgt: [235, 48, 155],   desc: 'QazaqGaz' },
  street:     { pos: [-180, 12, 18],     tgt: [120, 14, 0],     desc: 'Бульвар Нуржол' },
};

// Глобальное состояние
export const STATE = { night: 0, time: 0, tier: 'high', tierCfg: TIERS.high };

// ============================================================
// BACKWARD-COMPAT для main.js, grid.js, props.js
// ============================================================
export const ROAD = { ringHalf: 10, aveHalf: 8, walk: 4, curb: 0.18, lampStep: 42 };
export const BOULEVARD = { half: 42, x0: -940, x1: 590 };

// Плоская земля y=0 (ringRoads: [] предотвращает генерацию старых круговых колец сквозь здания и реку)
export const PLATFORMS = [
  { id: 'core', y: 0, rIn: 0, rOut: 1850, ringRoads: [], ave: [12], edgeIn: 20, edgeOut: 20 },
];

// Коллайдер-боксы достопримечательностей для main.js
export const ZONES = Object.entries(LANDMARKS).map(([id, L]) => ({
  id,
  x: L.x,
  z: L.z,
  plat: 'core',
  hx: L.r || 50,
  hz: L.r || 50,
}));
