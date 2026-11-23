// ============================================================
// ASTANA REAL v2 — signature.js
// Знаменитые небоскрёбы Астаны + Abu Dhabi Plaza (320 м)
// + ★★★ ГЛАВНОЕ HERO-ЗДАНИЕ: Штаб-квартира АО «НК «QazaqGaz»
//   (БЦ «Болашак», 18 этажей, 86 м — максимальная детализация!) ★★★
// ============================================================
import * as THREE from "three";
import { SIGNATURE, LANDMARKS } from "./config.js";
import { GB, merge, ellipse, polyPrism, ngon } from "./geom.js";

const sigById = (id) => SIGNATURE.find((s) => s.id === id);
const L = LANDMARKS;

function addMerged(parent, list, mat, cast = true, receive = true) {
  if (!list.length) return null;
  const m = new THREE.Mesh(merge(list), mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

function slopedTower(w, d, h0, h1, yBase = 0) {
  const B = new GB();
  const hx = w / 2, hz = d / 2;
  const A = [-hx, yBase, -hz], Bv = [hx, yBase, -hz], C = [hx, yBase, hz], D = [-hx, yBase, hz];
  const At = [-hx, yBase + h0, -hz], Bt = [hx, yBase + h0, -hz], Ct = [hx, yBase + h1, hz], Dt = [-hx, yBase + h1, hz];
  B.quad(Bv, A, At, Bt, [0, 0, -1], [w, 0], [0, 0], [0, h0], [w, h0]);
  B.quad(C, Bv, Bt, Ct, [1, 0, 0], [d, 0], [0, 0], [0, h0], [d, h1]);
  B.quad(D, C, Ct, Dt, [0, 0, 1], [w, 0], [0, 0], [0, h1], [w, h1]);
  B.quad(A, D, Dt, At, [-1, 0, 0], [d, 0], [0, 0], [0, h1], [d, h0]);
  const dy = h1 - h0, Lv = Math.hypot(d, dy) || 1;
  B.quad(At, Dt, Ct, Bt, [0, d / Lv, -dy / Lv], [0, 0], [0, Lv], [w, Lv], [w, 0]);
  return B.build();
}

// ---------- ABU DHABI PLAZA (320 м — высочайший небоскрёб ЦА) ----------
function buildAbuDhabi(parent, M) {
  const P = L.abuDhabi;
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "sig-abudhabi";
  parent.add(g);

  const glass = [], steel = [], brass = [], neon = [];
  // Многоуровневый стилобат
  {
    const B = new GB();
    B.box(0, 9, 0, 122, 18, 114, 0);
    B.box(0, 22.5, 0, 106, 9, 98, 0);
    steel.push(B.build());
  }
  // 4 ступенчатые стеклянные башни (до 320 м)
  glass.push(slopedTower(42, 36, 245, 275, 27));
  glass.push(slopedTower(30, 26, 302, 320, 27).translate(4, 0, -3));
  glass.push(slopedTower(30, 26, 192, 212, 27).translate(-36, 0, -24));
  glass.push(slopedTower(28, 24, 146, 164, 27).translate(36, 0, 26));
  glass.push(slopedTower(26, 24, 112, 128, 27).translate(-32, 0, 32));

  // Вертикальные структурные рёбра и технические пояса (узнаваемый облик Foster+Partners)
  {
    const BS = new GB(), BB = new GB(), BN = new GB();
    for (let x = -18; x <= 18; x += 6) {
      BS.box(x, 145, 18.4, 0.7, 238, 0.8, 0);
      BS.box(x, 145, -18.4, 0.7, 238, 0.8, 0);
    }
    for (const y of [82, 152, 222, 286]) {
      BB.box(0, y, 0, 43.5, 2.2, 37.5, 0);
      BN.box(0, y + 1.2, 0, 44.2, 0.45, 38.2, 0);
    }
    BS.box(-18, 140, -12, 26, 8, 12, 0);
    BS.box(4, 324, -3, 10, 11, 10, 0);
    BS.box(4, 338, -3, 1.2, 20, 1.2, 0);
    steel.push(BS.build());
    brass.push(BB.build());
    neon.push(BN.build());
  }

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8), M.glow(0xff2a1a, 7));
  beacon.position.set(4, 349, -3);
  g.add(beacon);

  addMerged(g, glass, M.glassBlue, true, true);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, brass, M.brass, false, true);
  addMerged(g, neon, M.neon(0x00f5ff, 4.5), false, false);
}

// ---------- EMERALD TOWERS I & II (изумрудные скошенные башни, 210 / 156 м) ----------
function buildEmerald(parent, M, id) {
  const S = sigById(id);
  if (!S) return;
  const g = new THREE.Group();
  g.position.set(S.x, 0, S.z);
  g.name = `sig-${id}`;
  parent.add(g);

  const glass = [], brass = [], steel = [];
  const h = S.h;
  const tiers = 7, th = h / tiers;
  const rx0 = id === "emerald1" ? 19 : 15, rz0 = id === "emerald1" ? 15 : 12;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const scale = 1 + 0.18 * Math.pow(t, 1.35) - (i === tiers - 1 ? 0.12 : 0);
    const shiftX = t * (id === "emerald1" ? 7.5 : -4.6);
    const pts = ellipse(rx0 * scale, rz0 * scale, 24, shiftX, 0);
    const B = new GB();
    polyPrism(B, pts, i * th, (i + 1) * th);
    glass.push(B.build());

    const BB = new GB();
    polyPrism(BB, ellipse(rx0 * scale + 0.45, rz0 * scale + 0.45, 24, shiftX, 0), (i + 1) * th - 0.75, (i + 1) * th + 0.25);
    brass.push(BB.build());
  }
  steel.push(new THREE.CylinderGeometry(0.16, 0.65, 22, 8).translate(id === "emerald1" ? 6 : -3.5, h + 11, 0));

  addMerged(g, glass, M.glassEmerald, true, true);
  addMerged(g, brass, M.brass, false, true);
  addMerged(g, steel, M.steel, false, true);
}

// ---------- TRANSPORT TOWER «Зажигалка» (155 м) ----------
function buildTransport(parent, M) {
  const S = sigById("transportTower");
  if (!S) return;
  const g = new THREE.Group();
  g.position.set(S.x, 0, S.z);
  g.name = "sig-transport";
  parent.add(g);

  const glass = [], steel = [], neon = [];
  { const B = new GB(); polyPrism(B, ellipse(25, 19, 24), 0, 14); steel.push(B.build()); }
  glass.push(slopedTower(34, 22, 126, 150, 14));
  {
    const B = new GB();
    B.box(0, 154, 4, 24, 9, 8, 0);
    B.box(0, 170, 4, 0.9, 22, 0.9, 0);
    steel.push(B.build());
    const BN = new GB();
    BN.box(0, 132, 0, 34.8, 0.65, 22.8, 0);
    neon.push(BN.build());
  }

  addMerged(g, glass, M.glass, true, true);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, neon, M.neon(0x00f5ff, 4.5), false, false);
}

// ---------- NORTHERN LIGHTS «Северное сияние» (3 волнообразные башни, 180 / 152 / 128 м) ----------
function buildNorthLights(parent, M) {
  const towers = [
    sigById("northernLights1"),
    sigById("northernLights2"),
    sigById("northernLights3"),
  ].filter(Boolean);
  if (!towers.length) return;

  const cx = (towers[0].x + towers[towers.length - 1].x) / 2;
  const cz = towers[0].z;
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  g.name = "sig-northern-lights";
  parent.add(g);

  const glass = [], steel = [], neon = [];
  // Общий центрированный стилобат под всеми 3 башнями
  { const B = new GB(); B.box(0, 6, 0, 108, 12, 44, 0); steel.push(B.build()); }

  for (const t of towers) {
    const ox = t.x - cx;
    const h = t.h;
    const segs = 7, sh = (h - 12) / segs;
    for (let i = 0; i < segs; i++) {
      const wave = Math.sin((i / segs) * Math.PI * 1.6) * 3.6;
      const B = new GB();
      B.box(ox + wave, 12 + i * sh + sh / 2, 0, 23, sh, 22, 0);
      glass.push(B.build());
    }
    const BN = new GB();
    BN.box(ox, h + 0.5, 0, 24, 0.8, 23, 0);
    neon.push(BN.build());
  }
  { const B = new GB(); B.box(-17.5, 42, 0, 14, 5, 11, 0); B.box(17.5, 42, 0, 14, 5, 11, 0); steel.push(B.build()); }

  addMerged(g, glass, M.glassBlue, true, true);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, neon, M.neon(0x46f2ff, 4.2), false, false);
}

// ---------- KMG GATE («Ворота КазМунайГаз» на Круглой площади, арка НАД осью Нуржол!) ----------
function buildKmgGate(parent, M) {
  const S = sigById("kmgGate");
  if (!S) return;
  const g = new THREE.Group();
  g.position.set(S.x, 0, S.z);
  g.name = "sig-kmg-gate";
  parent.add(g);

  const stone = [], glass = [], gold = [];
  {
    const B = new GB();
    // Два массивных крыла-пилона ПО ОБЕ СТОРОНЫ бульвара Нуржол (z = -46 и z = +46),
    // оставляющих широкий проездной проём по оси X!
    B.box(0, 44, -46, 30, 88, 28, 0);
    B.box(0, 44, +46, 30, 88, 28, 0);
    // Монументальный верхний мост-арка над бульваром Нуржол (y = 32..68)
    B.box(0, 52, 0, 28, 30, 116, 0);
    // Центральная ступенчатая надстройка над аркой
    B.box(0, 76, 0, 24, 22, 56, 0);
    // Полукруглые крылья Круглой площади (обрамляют площадь со стороны Запада)
    for (const side of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * 0.95 * side;
        const rx = -24 - Math.sin(Math.abs(a)) * 42;
        const rz = side * (62 + k * 7) * Math.cos(a * 0.4);
        B.box(rx, 15, rz, 18, 30, 16, a * 0.7);
      }
    }
    stone.push(B.build());

    // Панорамные витражи фасадов (смотрят на восток +X к Байтереку и запад -X к Хан Шатыру)
    const BG = new GB();
    BG.box(0, 44, -46, 30.6, 76, 20, 0);
    BG.box(0, 44, +46, 30.6, 76, 20, 0);
    BG.box(0, 52, 0, 28.6, 22, 82, 0);
    glass.push(BG.build());
  }
  // Золотой акцент-корона
  gold.push(new THREE.BoxGeometry(26, 2.0, 58).translate(0, 88, 0));
  gold.push(new THREE.CylinderGeometry(0.22, 0.8, 16, 8).translate(0, 97, 0));

  addMerged(g, stone, M.travertine, true, true);
  addMerged(g, glass, M.glassGold, false, true);
  addMerged(g, gold, M.gold, false, true);
}

// ---------- TALAN TOWERS (золотисто-песчаные башни у Байтерека, 145 / 119 м) ----------
function buildTalan(parent, M) {
  const t1 = sigById("talan1");
  const t2 = sigById("talan2");
  if (!t1) return;
  const g = new THREE.Group();
  g.position.set(t1.x, 0, t1.z);
  g.name = "sig-talan";
  parent.add(g);

  const glass = [], brass = [], stone = [];
  const dx = t2 ? t2.x - t1.x : 30;
  { const B = new GB(); B.box(dx / 2, 7, 0, 74, 14, 42, 0); stone.push(B.build()); }
  glass.push(slopedTower(30, 26, 130, 145, 14));
  if (t2) {
    glass.push(slopedTower(26, 24, 102, 119, 14).translate(dx, 0, 0));
  }
  {
    const B = new GB();
    for (const ox of [0, dx]) {
      for (const sx of [-1, 1]) B.box(ox + sx * 13.5, 68, 0, 1.5, 102, 26.8, 0);
    }
    brass.push(B.build());
  }

  addMerged(g, glass, M.glassGold, true, true);
  addMerged(g, brass, M.brass, false, true);
  addMerged(g, stone, M.travertine, true, true);
}

// ---------- BEIJING PALACE SOLUXE (115 м) ----------
function buildBeijing(parent, M) {
  const S = sigById("beijingPalace");
  if (!S) return;
  const g = new THREE.Group();
  g.position.set(S.x, 0, S.z);
  g.name = "sig-beijing";
  parent.add(g);

  const stone = [], glass = [], gold = [];
  {
    const B = new GB();
    B.box(0, 8, 0, 44, 16, 34, 0);
    B.box(0, 61, 0, 38, 90, 26, 0);
    B.box(0, 108, 0, 43, 4, 31, 0);
    stone.push(B.build());
    const BG = new GB();
    BG.box(0, 61, 0, 38.6, 80, 20, 0);
    glass.push(BG.build());
  }
  gold.push(new THREE.SphereGeometry(11.5, 28, 20).translate(0, 118, 0));
  gold.push(new THREE.TorusGeometry(13.2, 0.6, 8, 36).rotateX(Math.PI / 2).translate(0, 111, 0));

  addMerged(g, stone, M.travertine, true, true);
  addMerged(g, glass, M.glassGold, false, true);
  addMerged(g, gold, M.gold, true, true);
}

// ---------- TRIUMPH OF ASTANA (142 м) ----------
function buildTriumph(parent, M) {
  const S = sigById("triumphAstana");
  if (!S) return;
  const g = new THREE.Group();
  g.position.set(S.x, 0, S.z);
  g.name = "sig-triumph";
  parent.add(g);

  const stone = [], gold = [];
  {
    const B = new GB();
    B.box(0, 19, 0, 54, 38, 42, 0);
    B.box(0, 61, 0, 40, 46, 32, 0);
    B.box(0, 98, 0, 26, 28, 22, 0);
    polyPrism(B, ngon(8, 10, Math.PI / 8), 112, 126);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(sx * 22, 46, sz * 17, 7, 18, 7, 0);
    stone.push(B.build());
  }
  gold.push(new THREE.ConeGeometry(7.2, 24, 8).translate(0, 138, 0));
  gold.push(new THREE.CylinderGeometry(0.15, 0.5, 16, 8).translate(0, 156, 0));

  addMerged(g, stone, M.stone, true, true);
  addMerged(g, gold, M.gold, false, true);
}

// ============================================================
// ★★★ QAZAQGAZ — ГЛАВНОЕ HERO-ЗДАНИЕ АСТАНЫ (ПРИОРИТЕТ #1!) ★★★
// Штаб-квартира АО «НК «QazaqGaz» (БЦ «Болашак», 18 этажей, 86 м)
// Координаты: x: 235, z: 155. Камера `qazaqgaz` смотрит с Юго-Запада (+Z / -X).
// ============================================================

/** Рисует векторный фирменный знак QazaqGaz (стилизованное сине-голубое газовое пламя) без эмодзи! */
function drawQazaqGazEmblem(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  // Внешнее кольцо-орбита
  const ringGrad = ctx.createLinearGradient(-r, -r, r, r);
  ringGrad.addColorStop(0, "#00F5FF");
  ringGrad.addColorStop(0.55, "#1E90FF");
  ringGrad.addColorStop(1, "#0056B3");
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
  ctx.stroke();

  // Внешний лепесток пламени (сине-циановый)
  const flameGrad = ctx.createLinearGradient(0, r * 0.72, 0, -r * 0.82);
  flameGrad.addColorStop(0, "#0058C4");
  flameGrad.addColorStop(0.5, "#00A8FF");
  flameGrad.addColorStop(1, "#00F5FF");
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.76);
  ctx.bezierCurveTo(r * 0.52, -r * 0.25, r * 0.58, r * 0.45, 0, r * 0.68);
  ctx.bezierCurveTo(-r * 0.58, r * 0.45, -r * 0.52, -r * 0.25, 0, -r * 0.76);
  ctx.closePath();
  ctx.fill();

  // Внутренний светлый язычок пламени (чистый бирюзово-белый)
  const innerGrad = ctx.createLinearGradient(0, r * 0.55, 0, -r * 0.35);
  innerGrad.addColorStop(0, "#70F8FF");
  innerGrad.addColorStop(1, "#FFFFFF");
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.28);
  ctx.bezierCurveTo(r * 0.26, r * 0.04, r * 0.28, r * 0.42, 0, r * 0.56);
  ctx.bezierCurveTo(-r * 0.28, r * 0.42, -r * 0.26, r * 0.04, 0, -r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Создаёт кристально читаемую корпоративную вывеску QAZAQGAZ (CanvasTexture 1024×256). */
function createQazaqGazSignTexture(compact = false) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const g = c.getContext("2d");

  // Глубокий архитектурный тёмно-синий фасадный бэкплейт
  const bg = g.createLinearGradient(0, 0, 1024, 256);
  bg.addColorStop(0, "#071426");
  bg.addColorStop(0.5, "#0b1e38");
  bg.addColorStop(1, "#071426");
  g.fillStyle = bg;
  g.fillRect(0, 0, 1024, 256);

  // Тонкая фирменная верхняя и нижняя линии-акценты
  const bar = g.createLinearGradient(0, 0, 1024, 0);
  bar.addColorStop(0, "#0a4fb8");
  bar.addColorStop(0.35, "#1E90FF");
  bar.addColorStop(0.5, "#00F5FF");
  bar.addColorStop(0.65, "#1E90FF");
  bar.addColorStop(1, "#0a4fb8");
  g.fillStyle = bar;
  g.fillRect(0, 0, 1024, 10);
  g.fillRect(0, 246, 1024, 10);

  // Векторная эмблема слева
  drawQazaqGazEmblem(g, 146, 128, 76);

  // Чёткая архитектурная типографика QAZAQGAZ
  g.save();
  g.fillStyle = "#FFFFFF";
  g.shadowColor = "rgba(0, 210, 255, 0.55)";
  g.shadowBlur = 16;
  g.font = "800 112px 'Segoe UI', 'Arial', sans-serif";
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.fillText("QAZAQGAZ", 252, compact ? 132 : 114);
  g.restore();

  if (!compact) {
    g.fillStyle = "#7AD8FF";
    g.font = "600 30px 'Segoe UI', 'Arial', sans-serif";
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText("NATIONAL COMPANY  ·  ҰЛТТЫҚ КОМПАНИЯСЫ", 258, 192);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Создаёт процедурные флаги РК, QazaqGaz и ICA для 3 флагштоков. */
function createFlagTexture(kind) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 160;
  const g = c.getContext("2d");
  if (kind === "rk") {
    g.fillStyle = "#00AFCA";
    g.fillRect(0, 0, 256, 160);
    // Золотой орнамент слева
    g.fillStyle = "#FEC50C";
    g.fillRect(14, 10, 12, 140);
    // Золотое солнце с лучами
    g.beginPath(); g.arc(138, 76, 24, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#FEC50C"; g.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath();
      g.moveTo(138 + Math.cos(a) * 27, 76 + Math.sin(a) * 27);
      g.lineTo(138 + Math.cos(a) * 38, 76 + Math.sin(a) * 38);
      g.stroke();
    }
    // Парящий беркут под солнцем
    g.beginPath();
    g.moveTo(96, 110); g.quadraticCurveTo(138, 126, 180, 110);
    g.quadraticCurveTo(138, 116, 96, 110); g.fill();
  } else if (kind === "qg") {
    g.fillStyle = "#0A2A5E";
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = "#00C8FF";
    g.fillRect(0, 142, 256, 18);
    drawQazaqGazEmblem(g, 74, 74, 38);
    g.fillStyle = "#FFFFFF";
    g.font = "bold 28px 'Segoe UI', Arial, sans-serif";
    g.textAlign = "left"; g.textBaseline = "middle";
    g.fillText("QAZAQ", 122, 62);
    g.fillStyle = "#00E8FF";
    g.fillText("GAZ", 122, 92);
  } else {
    g.fillStyle = "#0055A5";
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 128, 256, 8);
    g.fillStyle = "#00D4FF";
    g.fillRect(0, 136, 256, 24);
    g.fillStyle = "#FFFFFF";
    g.font = "bold 46px 'Segoe UI', Arial, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("ICA", 128, 68);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildQazaqGaz(parent, M) {
  const P = L.qazaqGaz;
  if (!P) return { group: new THREE.Group() };
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "qazaqgaz-hero";
  parent.add(g);

  const granite = [], granLight = [], glassBlue = [], glassLobby = [], steel = [], chrome = [], darkMetal = [], warmGlow = [], neon = [];

  // ── 1. 3-ЭТАЖНЫЙ ГРАНИТНО-СТЕКЛЯННЫЙ СТИЛОБАТ (h = 13.5 м) ──
  // Парадный фасад ориентирован на Юг (+Z, прямо к ракурсу камеры qazaqgaz!),
  // и второй презентабельный фасад — на Север (-Z, к бульвару Нуржол и Дому Министерств).
  {
    const BG = new GB();
    // Гранитный подиум-плаза (68 × 58 м) + 3-этажное тело стилобата
    BG.box(0, 0.9, 0, 74, 1.8, 64, 0);
    BG.box(0, 7.6, 0, 62, 11.8, 46, 0);
    // Угловые массивные гранитные пилоны стилобата
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        BG.box(sx * 31.2, 7.6, sz * 23.2, 4.2, 12.2, 4.2, 0);
      }
    }
    granite.push(BG.build());

    // Светлый гранитный парадный марш-лестница (на +Z к площади и камере, + второй на -Z)
    const BL = new GB();
    for (let step = 0; step < 6; step++) {
      const sy = 0.25 + step * 0.28;
      const szOut = 32 + (5 - step) * 1.15;
      BL.box(0, sy / 2, szOut, 30, sy, 1.25, 0);
      BL.box(0, sy / 2, -szOut, 24, sy, 1.25, 0);
    }
    // Декоративные гранитные цветочницы-тумбы по бокам лестницы
    for (const sx of [-1, 1]) {
      BL.box(sx * 20, 1.1, 35, 8.5, 2.2, 6.5, 0);
      BL.box(sx * 20, 1.1, -35, 8.5, 2.2, 6.5, 0);
    }
    granLight.push(BL.build());

    // Двухсветный прозрачный остеклённый вестибюль + тёплый подсвеченный интерьерный холл
    const BLob = new GB();
    BLob.box(0, 7.2, 23.2, 46, 10.6, 0.8, 0);
    BLob.box(0, 7.2, -23.2, 46, 10.6, 0.8, 0);
    BLob.box(-31.2, 7.2, 0, 0.8, 10.6, 36, 0);
    BLob.box(+31.2, 7.2, 0, 0.8, 10.6, 36, 0);
    glassLobby.push(BLob.build());

    // Тёплое световое панно потолка вестибюля (эффект живого интерьера за стеклом)
    const BW = new GB();
    BW.box(0, 11.4, 22.0, 42, 0.4, 2.2, 0);
    BW.box(0, 11.4, -22.0, 42, 0.4, 2.2, 0);
    warmGlow.push(BW.build());

    // 8 монументальных стройных колонн входного портала (+Z главный вход, и 6 на -Z)
    for (let i = 0; i < 8; i++) {
      const cx = -17.5 + i * 5.0;
      granLight.push(new THREE.CylinderGeometry(0.55, 0.65, 11.6, 14).translate(cx, 7.6, 26.8));
      chrome.push(new THREE.CylinderGeometry(0.72, 0.72, 0.45, 14).translate(cx, 2.0, 26.8));
      chrome.push(new THREE.CylinderGeometry(0.70, 0.70, 0.45, 14).translate(cx, 13.2, 26.8));
    }
    for (let i = 0; i < 6; i++) {
      const cx = -12.5 + i * 5.0;
      granLight.push(new THREE.CylinderGeometry(0.50, 0.60, 11.4, 12).translate(cx, 7.5, -26.2));
    }

    // Широкий консольный стеклянный козырёк со стальными тягами и хромированной рамой (+Z и -Z)
    for (const sz of [1, -1]) {
      const BS = new GB();
      BS.box(0, 13.8, sz * 27.6, 40, 0.55, 9.6, 0);
      // Поручни парадной лестницы
      for (const rx of [-14.6, 0, 14.6]) {
        BS.box(rx, 2.1, sz * 35, 0.12, 0.95, 7.2, 0);
      }
      steel.push(BS.build());
      const BKg = new GB();
      BKg.box(0, 14.18, sz * 27.6, 38.6, 0.16, 8.6, 0);
      glassLobby.push(BKg.build());
      // Стальные ванты-подвесы козырька
      for (const tx of [-15, -5, 5, 15]) {
        chrome.push(new THREE.CylinderGeometry(0.08, 0.08, 7.5, 6)
          .rotateX(sz * 0.72)
          .translate(tx, 16.4, sz * 28.8));
      }
    }

    // 3 высоких хромированных флагштока на южной площади перед главным входом (РК, QazaqGaz, ICA)
    const flagKinds = ["rk", "qg", "ica"];
    for (let i = 0; i < 3; i++) {
      const fx = -7.5 + i * 7.5;
      const fz = 42.5;
      chrome.push(new THREE.CylinderGeometry(0.11, 0.18, 16.5, 8).translate(fx, 8.25, fz));
      chrome.push(new THREE.SphereGeometry(0.28, 8, 6).translate(fx, 16.7, fz));
      granLight.push(new THREE.CylinderGeometry(0.75, 0.95, 0.9, 12).translate(fx, 0.45, fz));

      const fTex = createFlagTexture(flagKinds[i]);
      const fMat = M.std({ map: fTex, roughness: 0.52, metalness: 0.05, side: THREE.DoubleSide });
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6, 6, 1), fMat);
      // Лёгкая естественная волна полотнища
      const pos = flag.geometry.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const px = pos.getX(v);
        pos.setZ(v, Math.sin((px + 2.1) * 1.4 + i) * 0.22);
      }
      flag.geometry.computeVertexNormals();
      flag.position.set(fx + 2.2, 14.6, fz);
      flag.castShadow = true;
      g.add(flag);
    }
  }

  // ── 2. 18-ЭТАЖНЫЙ НЕОМОДЕРНИСТСКИЙ ОСНОВНОЙ ОБЪЁМ (y = 13.5..86 м) ──
  // Габариты 50 × 50 м идеально стыкуются с LED-рёбрами (±25, ±25, h=86) из cyberpunk.js!
  {
    const BMain = new GB();
    // Центральный высокий стеклянный атриум-корпус (до 82 м)
    BMain.box(0, 47.8, 0, 28, 68.6, 48.6, 0);
    // Боковые ступенчатые крылья (уступы 72 м и 64 м)
    BMain.box(-19, 43.0, 0, 12.2, 59.0, 42.0, 0);
    BMain.box(+19, 43.0, 0, 12.2, 59.0, 42.0, 0);
    // Выразительные боковые эркеры-акценты
    BMain.box(-23.5, 38.5, 0, 3.6, 50.0, 32.0, 0);
    BMain.box(+23.5, 38.5, 0, 3.6, 50.0, 32.0, 0);
    // Верхний фасадный аттик-корона (y = 82..86 м)
    BMain.box(0, 84.0, 0, 30, 4.0, 49.0, 0);
    glassBlue.push(BMain.build());

    // Плотные вертикальные алюминиевые фасадные ламели и горизонтальные межэтажные пояса (18 этажей!)
    const BS = new GB();
    const BD = new GB();

    // Центральный блок: частые вертикальные рёбра на Южном (+Z) и Северном (-Z) фасадах
    for (let lx = -13.5; lx <= 13.5; lx += 2.7) {
      BS.box(lx, 48.0, +24.55, 0.42, 69.0, 0.65, 0);
      BS.box(lx, 48.0, -24.55, 0.42, 69.0, 0.65, 0);
    }
    // Вертикальные рёбра на боковых крыльях (Юг/Север + Запад/Восток)
    for (const sx of [-1, 1]) {
      for (let lx = 15.0; lx <= 24.0; lx += 3.0) {
        BS.box(sx * lx, 43.0, +21.25, 0.42, 59.0, 0.55, 0);
        BS.box(sx * lx, 43.0, -21.25, 0.42, 59.0, 0.55, 0);
      }
      for (let lz = -18.0; lz <= 18.0; lz += 3.6) {
        BS.box(sx * 25.4, 38.5, lz, 0.55, 50.0, 0.42, 0);
        BS.box(sx * 25.1, 43.0, lz, 0.45, 59.0, 0.36, 0);
      }
    }

    // 18 чётких горизонтальных межэтажных переплётов (шаг 4.0 м)
    for (let fl = 0; fl < 18; fl++) {
      const y = 14.0 + fl * 4.0;
      const isTech = (fl === 8 || fl === 16);
      const target = isTech ? BD : BS;
      const th = isTech ? 1.15 : 0.34;
      target.box(0, y, +24.6, 28.8, th, 0.6, 0);
      target.box(0, y, -24.6, 28.8, th, 0.6, 0);
      if (y <= 72.5) {
        target.box(0, y, +21.3, 50.6, th, 0.5, 0);
        target.box(0, y, -21.3, 50.6, th, 0.5, 0);
        target.box(-25.35, y, 0, 0.55, th, 42.6, 0);
        target.box(+25.35, y, 0, 0.55, th, 42.6, 0);
      }
    }

    // Архитектурная корона крыши (выносная рама, техэтаж с жалюзи, карнизы крыльев)
    BS.box(0, 86.2, 0, 33.0, 1.4, 51.6, 0);
    BS.box(0, 72.6, 0, 52.0, 1.2, 43.6, 0);
    BS.box(0, 63.6, 0, 53.0, 1.0, 33.6, 0);
    // Технический уровень-пентхаус на крыше
    BD.box(0, 88.2, 0, 22, 3.2, 32, 0);
    BS.box(-10, 89.2, 0, 3, 2.2, 26, 0);
    BS.box(+10, 89.2, 0, 3, 2.2, 26, 0);

    steel.push(BS.build());
    darkMetal.push(BD.build());

    // Фирменная архитектурная сине-циановая LED-окантовка короны и вертикальных рёбер (ночью / в F!)
    const BN = new GB();
    BN.box(0, 85.9, +25.9, 33.4, 0.38, 0.38, 0);
    BN.box(0, 85.9, -25.9, 33.4, 0.38, 0.38, 0);
    BN.box(-16.6, 85.9, 0, 0.38, 0.38, 52.0, 0);
    BN.box(+16.6, 85.9, 0, 0.38, 0.38, 52.0, 0);
    // Окантовка крыльев
    BN.box(0, 72.6, +21.9, 52.4, 0.32, 0.32, 0);
    BN.box(0, 72.6, -21.9, 52.4, 0.32, 0.32, 0);
    // 4 акцентных вертикальных ребра центрального атриума
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      BN.box(sx * 14.3, 49.5, sz * 24.75, 0.36, 72.0, 0.36, 0);
    }
    neon.push(BN.build());
  }

  // ── 3. КРИСТАЛЬНО ЧИТАЕМЫЕ ВЫВЕСКИ «QAZAQGAZ» (СНАРУЖИ НА ВСЕХ КЛЮЧЕВЫХ ФАСАДАХ!) ──
  {
    const crownTex = createQazaqGazSignTexture(false);
    const portalTex = createQazaqGazSignTexture(true);

    const signMat = M.std({
      map: crownTex,
      emissiveMap: crownTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.95,
      roughness: 0.22,
      metalness: 0.25,
    });
    const portalMat = M.std({
      map: portalTex,
      emissiveMap: portalTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.95,
      roughness: 0.22,
      metalness: 0.25,
    });

    // Корпус вывесок на короне (y = 83.2 м) — ВЫДВИНУТЫ наружу, правильные нормали!
    const signW = 26, signH = 6.5;
    // Южный фасад (+Z, прямо на камеру qazaqgaz!) — rotation.y = 0 смотрит в +Z!
    const sSouth = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), signMat);
    sSouth.position.set(0, 83.2, +25.4);
    g.add(sSouth);

    // Северный фасад (-Z, виден с бульвара Нуржол!) — rotation.y = Math.PI смотрит в -Z!
    const sNorth = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), signMat);
    sNorth.position.set(0, 83.2, -25.4);
    sNorth.rotation.y = Math.PI;
    g.add(sNorth);

    // Западный боковой фасад (-X, отлично читается с ракурса qazaqgaz под 45°!) — rotation.y = -Math.PI/2 смотрит в -X!
    const sWest = new THREE.Mesh(new THREE.PlaneGeometry(24, 6.0), signMat);
    sWest.position.set(-15.6, 83.2, 0);
    sWest.rotation.y = -Math.PI / 2;
    g.add(sWest);

    // Восточный фасад (+X) — rotation.y = +Math.PI/2 смотрит в +X!
    const sEast = new THREE.Mesh(new THREE.PlaneGeometry(24, 6.0), signMat);
    sEast.position.set(+15.6, 83.2, 0);
    sEast.rotation.y = Math.PI / 2;
    g.add(sEast);

    // Входные вывески на козырьке главного (+Z) и северного (-Z) порталов
    const entSouth = new THREE.Mesh(new THREE.PlaneGeometry(15, 3.6), portalMat);
    entSouth.position.set(0, 15.8, +32.5);
    g.add(entSouth);

    const entNorth = new THREE.Mesh(new THREE.PlaneGeometry(15, 3.6), portalMat);
    entNorth.position.set(0, 15.8, -32.5);
    entNorth.rotation.y = Math.PI;
    g.add(entNorth);

    // Корпоративный гранит-тотем QAZAQGAZ на входной площади (+Z)
    const BSt = new GB();
    BSt.box(-20, 3.2, 41, 6.8, 6.4, 1.4, 0);
    darkMetal.push(BSt.build());
    const steleFace = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.8), portalMat);
    steleFace.position.set(-20, 4.6, 41.8);
    g.add(steleFace);
  }

  // Авиационные огни на короне крыши
  for (const [bx, bz] of [[-15.5, -24.5], [15.5, -24.5], [-15.5, 24.5], [15.5, 24.5]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), M.glow(0xff2a1a, 6));
    b.position.set(bx, 87.4, bz);
    g.add(b);
  }

  addMerged(g, granite, M.granite, true, true);
  addMerged(g, granLight, M.graniteLight, true, true);
  addMerged(g, glassBlue, M.glassBlue, true, true);
  addMerged(g, glassLobby, M.glassClear, false, true);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, chrome, M.chrome, false, true);
  addMerged(g, darkMetal, M.darkMetal, true, true);
  addMerged(g, warmGlow, M.glow(0xffe2b0, 3.2, 0xd8c8a8), false, false);
  addMerged(g, neon, M.neon(0x00d8ff, 5.8, 0.08), false, false);

  return { group: g };
}

// ============================================================
// ЭКСПОРТ
// ============================================================
export function buildSignature(scene, M, _ctx) {
  const group = new THREE.Group();
  group.name = "signature-towers";
  scene.add(group);

  const towers = [];

  buildAbuDhabi(group, M);
  buildEmerald(group, M, "emerald1");
  buildEmerald(group, M, "emerald2");
  buildTransport(group, M);
  buildNorthLights(group, M);
  buildKmgGate(group, M);
  buildTalan(group, M);
  buildBeijing(group, M);
  buildTriumph(group, M);

  // ★★★ HERO — Штаб-квартира QazaqGaz ★★★
  buildQazaqGaz(group, M);

  for (const s of SIGNATURE) {
    towers.push({ x: s.x, y: 0, z: s.z, yaw: s.yaw || 0, w: s.w || 40, d: s.d || 40, h: s.h });
  }
  if (L.qazaqGaz) {
    towers.push({ x: L.qazaqGaz.x, y: 0, z: L.qazaqGaz.z, yaw: 0, w: 62, d: 54, h: L.qazaqGaz.h, isQazaqGaz: true });
  }

  return {
    group,
    towers,
    update(dt, time, _cam, cyberMix) {
      void dt; void time; void cyberMix;
    },
  };
}
