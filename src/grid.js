// ============================================================
// grid.js — полярная сетка улиц: единый источник правды для города,
// зданий, фонарей и трафика. Кольцевые улицы + радиальные проспекты.
// ============================================================
import { PLATFORMS, ROAD, BOULEVARD, intersectsReserved } from "./config.js";

export const TAU = Math.PI * 2;
export const platById = (id) => PLATFORMS.find((p) => p.id === id);

/** Полоса i — между кольцевыми улицами: [r0, r1]. Полос на одну больше, чем кольцевых. */
export function bandRange(plat, i) {
  const rr = plat.ringRoads;
  return [i === 0 ? plat.rIn : rr[i - 1], i >= rr.length ? plat.rOut : rr[i]];
}
export const bandCount = (plat) => plat.ringRoads.length + 1;
export const avenues = (plat, i) => plat.ave[Math.min(Math.max(i, 0), plat.ave.length - 1)];
/** Угол центра avenue-проспекта k полосы i (линии проходят через центр города). */
export function avenueAngle(plat, i, k) {
  return -Math.PI + k * (TAU / avenues(plat, i));
}
export const avenueCell = (plat, i) => TAU / avenues(plat, i);

/** Зона застройки полосы (радиусы) без дорог, тротуаров и набережных. null — строить нельзя. */
export function blockClear(plat, i) {
  if (plat.id === "core" && i === 0) return null;               // площадь Байтерека
  const [r0, r1] = bandRange(plat, i);
  const last = i >= plat.ringRoads.length;
  const a = r0 + (i === 0 ? plat.edgeIn : ROAD.ringHalf) + ROAD.walk;
  const b = last ? r1 - plat.edgeOut : r1 - ROAD.ringHalf - ROAD.walk;
  if (b - a < 22) return null;
  return { rIn: a, rOut: b, first: i === 0, last };
}
export const isEdge = (plat, r) => r > plat.rOut - plat.edgeOut || r < plat.rIn + plat.edgeIn;
/** Бульвар Нуржол (зелёная ось восток–запад без застройки). */
export function isBoulevard(plat, x, z) {
  if (plat.id === "core") return Math.abs(z) < BOULEVARD.half && x > BOULEVARD.x0 && x < BOULEVARD.x1;
  if (plat.id === "ringB") return Math.abs(z) < BOULEVARD.half;
  return false;
}
/** Поворот вокруг Y, при котором локальная +Z смотрит от центра города наружу. */
export const yawOut = (x, z) => Math.atan2(x, z);
export function platformAt(x, z) {
  const r = Math.hypot(x, z);
  return PLATFORMS.find((p) => r >= p.rIn && r <= p.rOut) || null;
}
export { intersectsReserved, ROAD };
