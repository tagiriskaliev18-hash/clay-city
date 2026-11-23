// ============================================================
// ASTANA REAL v5 — signature.js
// Знаменитые небоскрёбы Астаны + Abu Dhabi Plaza (320 м)
// + ★★★ QazaqGaz HQ (точное воссоздание по 5 фото: трапециевидная
//   18-этажная башня с шевронными балконами, стеклянной пирамидой,
//   перголой-козырьком, ОТКРЫТЫМ входом, парковкой 14..22 и точными
//   соседями Запад/Восток!) ★★★
// + Beijing Palace Soluxe (3-ярусная бирюзовая пагода + открытый вход)
// + Highvill Park (6 башен) и Highvill Astana (4 башни)
// ============================================================
import * as THREE from "three";
import { SIGNATURE, LANDMARKS } from "./config.js";
import { GB, merge, ellipse, polyPrism, ngon, tube } from "./geom.js";

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

/** Трапециевидный сужающийся объём: [w0,d0] на y0 → [w1,d1] на y1. */
function taperedBox(w0, d0, w1, d1, y0, y1) {
  const B = new GB();
  const hx0 = w0 / 2, hz0 = d0 / 2, hx1 = w1 / 2, hz1 = d1 / 2;
  const A0 = [-hx0, y0, -hz0], B0 = [hx0, y0, -hz0], C0 = [hx0, y0, hz0], D0 = [-hx0, y0, hz0];
  const A1 = [-hx1, y1, -hz1], B1 = [hx1, y1, -hz1], C1 = [hx1, y1, hz1], D1 = [-hx1, y1, hz1];
  const norm = (p0, p1, p2) => {
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
  };
  const h = y1 - y0;
  B.quad(B0, A0, A1, B1, norm(B0, A0, A1), [w0, 0], [0, 0], [(w0 - w1) / 2, h], [(w0 + w1) / 2, h]);
  B.quad(C0, B0, B1, C1, norm(C0, B0, B1), [d0, 0], [0, 0], [(d0 - d1) / 2, h], [(d0 + d1) / 2, h]);
  B.quad(D0, C0, C1, D1, norm(D0, C0, C1), [w0, 0], [0, 0], [(w0 - w1) / 2, h], [(w0 + w1) / 2, h]);
  B.quad(A0, D0, D1, A1, norm(A0, D0, D1), [d0, 0], [0, 0], [(d0 - d1) / 2, h], [(d0 + d1) / 2, h]);
  B.quad(A1, D1, C1, B1, [0, 1, 0], [0, 0], [0, d1], [w1, d1], [w1, 0]);
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
  {
    const B = new GB();
    B.box(0, 9, 0, 122, 18, 114, 0);
    B.box(0, 22.5, 0, 106, 9, 98, 0);
    steel.push(B.build());
  }
  glass.push(slopedTower(42, 36, 245, 275, 27));
  glass.push(slopedTower(30, 26, 302, 320, 27).translate(4, 0, -3));
  glass.push(slopedTower(30, 26, 192, 212, 27).translate(-36, 0, -24));
  glass.push(slopedTower(28, 24, 146, 164, 27).translate(36, 0, 26));
  glass.push(slopedTower(26, 24, 112, 128, 27).translate(-32, 0, 32));

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

// ---------- EMERALD TOWERS I & II (210 / 156 м) ----------
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
  {
    const B = new GB();
    polyPrism(B, ellipse(23.5, 17.5, 24), 0, 14);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      B.box(Math.cos(a) * 24.4, 7, Math.sin(a) * 18.4, 1.3, 14, 1.3, -a);
    }
    B.box(0, 14.4, 0, 48, 1.0, 36, 0);
    steel.push(B.build());
  }
  glass.push(slopedTower(34, 22, 126, 150, 14));
  {
    const B = new GB();
    for (let x = -14; x <= 14; x += 4.6) {
      B.box(x, 76, 11.3, 0.45, 124, 0.55, 0);
      B.box(x, 76, -11.3, 0.45, 124, 0.55, 0);
    }
    B.box(0, 154, 4, 24, 9, 8, 0);
    B.box(0, 160, -2, 14, 5, 8, 0);
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

// ---------- NORTHERN LIGHTS «Северное сияние» (180 / 152 / 128 м) ----------
function buildNorthLights(parent, M) {
  const towers = [sigById("northernLights1"), sigById("northernLights2"), sigById("northernLights3")].filter(Boolean);
  if (!towers.length) return;

  const cx = (towers[0].x + towers[towers.length - 1].x) / 2;
  const cz = towers[0].z;
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  g.name = "sig-northern-lights";
  parent.add(g);

  const glass = [], steel = [], neon = [];
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

// ---------- KMG GATE («Ворота КазМунайГаз») ----------
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
    B.box(0, 44, -46, 30, 88, 28, 0);
    B.box(0, 44, +46, 30, 88, 28, 0);
    B.box(0, 52, 0, 28, 30, 116, 0);
    B.box(0, 76, 0, 24, 22, 56, 0);
    // Пиллярные колоннады подиума и вертикальные травертиновые контрфорсы
    for (const sz of [-46, 46]) {
      for (const px of [-15.4, 15.4]) {
        for (const oz of [-11, 0, 11]) {
          B.box(px, 44, sz + oz, 1.4, 86, 1.6, 0);
        }
      }
      B.box(0, 88.6, sz, 31.8, 1.4, 29.8, 0);
    }
    for (const y of [16, 38, 67]) {
      B.box(0, y, 0, 29.8, 1.2, 118, 0);
    }
    // Крышный технический пентхаус
    B.box(0, 90, 0, 18, 6, 36, 0);
    for (const side of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * 0.95 * side;
        const rx = -24 - Math.sin(Math.abs(a)) * 42;
        const rz = side * (62 + k * 7) * Math.cos(a * 0.4);
        B.box(rx, 15, rz, 18, 30, 16, a * 0.7);
        B.box(rx, 30.6, rz, 19.2, 1.2, 17.2, a * 0.7);
      }
    }
    stone.push(B.build());

    const BG = new GB();
    BG.box(0, 44, -46, 30.6, 76, 20, 0);
    BG.box(0, 44, +46, 30.6, 76, 20, 0);
    BG.box(0, 52, 0, 28.6, 22, 82, 0);
    glass.push(BG.build());
  }
  gold.push(new THREE.BoxGeometry(26, 2.0, 58).translate(0, 88, 0));
  gold.push(new THREE.CylinderGeometry(0.22, 0.8, 16, 8).translate(0, 97, 0));

  addMerged(g, stone, M.travertine, true, true);
  addMerged(g, glass, M.glassGold, false, true);
  addMerged(g, gold, M.gold, false, true);
}

// ---------- TALAN TOWERS ----------
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
  {
    const B = new GB();
    B.box(dx / 2, 7, 0, 72, 14, 40, 0);
    B.box(dx / 2, 14.5, 0, 76, 1.2, 44, 0);
    for (let px = -34; px <= 64; px += 14) {
      B.box(px, 7, +20.8, 1.4, 14, 1.4, 0);
      B.box(px, 7, -20.8, 1.4, 14, 1.4, 0);
    }
    stone.push(B.build());
  }
  glass.push(slopedTower(30, 26, 130, 145, 14));
  if (t2) glass.push(slopedTower(26, 24, 102, 119, 14).translate(dx, 0, 0));
  {
    const B = new GB();
    for (const ox of [0, dx]) {
      for (const sx of [-1, 1]) B.box(ox + sx * 13.5, 68, 0, 1.5, 102, 26.8, 0);
      for (const mx of [-9, -3, 3, 9]) {
        B.box(ox + mx, 74, 13.4, 0.48, 112, 0.65, 0);
        B.box(ox + mx, 74, -13.4, 0.48, 112, 0.65, 0);
      }
      for (const my of [44, 78, 112]) {
        B.box(ox, my, 0, 29.8, 0.9, 26.6, 0);
      }
    }
    brass.push(B.build());
  }

  addMerged(g, glass, M.glassGold, true, true);
  addMerged(g, brass, M.brass, false, true);
  addMerged(g, stone, M.travertine, true, true);
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

// ---------- Утилита текстовых вывесок ----------
function makeBannerTex(text, { w = 512, h = 128, bg = "#0b1a2e", fg = "#ffffff", accent = "#00f5ff", sub = "" } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = accent;
  g.lineWidth = 4;
  g.strokeRect(4, 4, w - 8, h - 8);
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `800 ${sub ? Math.round(h * 0.42) : Math.round(h * 0.52)}px 'Segoe UI', Arial, sans-serif`;
  g.fillText(text, w / 2, sub ? h * 0.40 : h * 0.52);
  if (sub) {
    g.fillStyle = accent;
    g.font = `600 ${Math.round(h * 0.22)}px 'Segoe UI', Arial, sans-serif`;
    g.fillText(sub, w / 2, h * 0.78);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ============================================================
// BEIJING PALACE SOLUXE HOTEL (x: -240, z: +390)
// 3-ярусная традиционная китайская бирюзовая пагода с изогнутыми карнизами,
// золотой шпиль, красно-золотая входная колоннада с ОТКРЫТЫМ проходом!
// ============================================================
function buildPagodaTier(roofGeos, trimGeos, yBase, w, d, h) {
  const B = new GB();
  const BT = new GB();
  const hw = w / 2, hd = d / 2;
  const rw = hw * 0.62, rd = hd * 0.62;
  const eave = Math.min(w, d) * 0.12;
  const lift = h * 0.22;

  // Изогнутые скаты пагоды (верхний и нижний излом ската + загнутые вверх углы!)
  const midY = yBase + h * 0.42;
  const topY = yBase + h;
  const midW = (hw + rw) * 0.52, midD = (hd + rd) * 0.52;

  const cornersOut = [[-hw, yBase + lift, -hd], [hw, yBase + lift, -hd], [hw, yBase + lift, hd], [-hw, yBase + lift, hd]];
  const cornersMid = [[-midW, midY, -midD], [midW, midY, -midD], [midW, midY, midD], [-midW, midY, midD]];
  const cornersTop = [[-rw, topY, -rd], [rw, topY, -rd], [rw, topY, rd], [-rw, topY, rd]];

  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const A0 = cornersOut[i], A1 = cornersOut[j];
    const M0 = cornersMid[i], M1 = cornersMid[j];
    const T0 = cornersTop[i], T1 = cornersTop[j];
    // Опущенный центр кромки карниза для настоящего прогиба китайской крыши
    const sag = [(A0[0] + A1[0]) * 0.5, yBase, (A0[2] + A1[2]) * 0.5];
    const sagM = [(M0[0] + M1[0]) * 0.5, midY - lift * 0.35, (M0[2] + M1[2]) * 0.5];

    const calcN = (p0, p1, p2) => {
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
      const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      return [nx / l, ny / l, nz / l];
    };

    const nL1 = calcN(A1, sag, sagM);
    B.quad(A1, sag, sagM, M1, nL1, [1, 0], [0.5, 0], [0.5, 1], [1, 1]);
    const nL2 = calcN(sag, A0, M0);
    B.quad(sag, A0, M0, sagM, nL2, [0.5, 0], [0, 0], [0, 1], [0.5, 1]);

    const nU1 = calcN(M1, sagM, T0);
    B.quad(M1, sagM, T0, T1, nU1, [1, 0], [0.5, 0], [0, 1], [1, 1]);
    B.tri(sagM, M0, T0, nU1, [0.5, 0], [0, 0], [0, 1]);

    // Подшив карниза снизу (чтобы не было дыр при взгляде вверх)
    B.quad(sag, A1, M1, sagM, [0, -1, 0], [0, 0], [1, 0], [1, 1], [0, 1]);
    B.quad(A0, sag, sagM, M0, [0, -1, 0], [0, 0], [1, 0], [1, 1], [0, 1]);

    // Угловое ребро-конёк с загнутым кончиком
    roofGeos.push(tube([
      new THREE.Vector3(...T0),
      new THREE.Vector3(...M0),
      new THREE.Vector3(A0[0] * 1.03, A0[1] + eave * 0.25, A0[2] * 1.03),
    ], 0.34, 6));
  }
  B.quad(cornersTop[0], cornersTop[3], cornersTop[2], cornersTop[1], [0, 1, 0], [0, 0], [0, rd * 2], [rw * 2, rd * 2], [rw * 2, 0]);
  roofGeos.push(B.build());

  // Золотой/красный фриз под карнизом
  BT.box(0, yBase - 0.5, 0, w * 0.72, 1.3, d * 0.72, 0);
  trimGeos.push(BT.build());
}

function buildBeijing(parent, M) {
  const S = sigById("beijingPalace");
  if (!S) return;
  const g = new THREE.Group();
  g.position.set(S.x, 0, S.z);
  g.name = "sig-beijing";
  parent.add(g);

  const stone = [], glass = [], glassClear = [], turq = [], crimson = [], gold = [], asphalt = [], water = [];

  // 1. Круговой подъездной путь + фонтан перед входом (+Z)
  {
    const BA = new GB();
    BA.box(0, 0.04, 34, 66, 0.08, 30, 0);
    asphalt.push(BA.build());

    const BF = new GB();
    BF.box(0, 0.35, 34, 18, 0.7, 14, 0);
    stone.push(BF.build());
    water.push(new THREE.CylinderGeometry(6.2, 6.2, 0.2, 24).translate(0, 0.75, 34));
    gold.push(new THREE.CylinderGeometry(0.45, 0.9, 3.2, 10).translate(0, 2.2, 34));
    gold.push(new THREE.SphereGeometry(0.85, 10, 8).translate(0, 3.9, 34));
  }

  // 2. Подиум с ОТКРЫТЫМ вестибюлем (пол x=-26..+26, z=-20..+20; южная стена z=+20 с проёмом ±2.4м!)
  {
    const BS = new GB();
    // Подиум по бокам и сзади (оставляем полое лобби y=0..6.5 для interiors.js)
    BS.box(-20.5, 5.5, 0, 11, 11, 40, 0);
    BS.box(+20.5, 5.5, 0, 11, 11, 40, 0);
    BS.box(0, 5.5, -17.5, 30, 11, 5, 0);
    // Верхняя полка подиума НАД вестибюлем (y = 6.8 .. 12.5)
    BS.box(0, 9.6, 0, 54, 5.6, 42, 0);
    // Передняя стена 1 этажа по краям от открытого проёма (x = ±2.4 .. ±15)
    BS.box(-9.2, 3.4, 19.6, 13.6, 6.8, 1.0, 0);
    BS.box(+9.2, 3.4, 19.6, 13.6, 6.8, 1.0, 0);
    BS.box(0, 5.5, 19.6, 5.2, 2.6, 1.0, 0);
    stone.push(BS.build());

    // Прозрачное остекление фасада вестибюля по бокам от входа
    const BGc = new GB();
    BGc.box(-9.2, 3.2, 20.15, 10.2, 4.8, 0.15, 0);
    BGc.box(+9.2, 3.2, 20.15, 10.2, 4.8, 0.15, 0);
    glassClear.push(BGc.build());
  }

  // 3. Красно-золотая входная китайская колоннада (+Z, z=+20..+25.5, открытый проход в центре!)
  {
    const BC = new GB(), BG = new GB();
    for (const sx of [-1, 1]) {
      for (const cx of [3.2, 8.2, 13.2]) {
        crimson.push(new THREE.CylinderGeometry(0.45, 0.52, 6.2, 12).translate(sx * cx, 3.1, 24.4));
        gold.push(new THREE.CylinderGeometry(0.62, 0.72, 0.45, 12).translate(sx * cx, 0.22, 24.4));
        gold.push(new THREE.CylinderGeometry(0.65, 0.55, 0.55, 12).translate(sx * cx, 5.9, 24.4));
      }
    }
    // Перекрытие портика + крыша входного портика пагоды
    BC.box(0, 6.6, 22.6, 30, 1.2, 5.6, 0);
    BG.box(0, 7.3, 22.6, 30.6, 0.4, 6.0, 0);
    crimson.push(BC.build());
    gold.push(BG.build());
    buildPagodaTier(turq, gold, 7.6, 33, 8.6, 4.0);
  }

  // 4. Ступенчатая каменная и стеклянная башня с пилястрами и утопленным витражом (y = 12.4 .. 88 м)
  {
    const BS = new GB(), BGl = new GB(), BGd = new GB();
    // Основной ступенчатый корпус с утопленными нишами окон
    BS.box(0, 40, 0, 44, 56, 29.2, 0);
    BS.box(0, 77, 0, 36, 18, 23.2, 0);
    // Боковые вертикальные каменные пилоны и аркада подиума ±X
    for (const sx of [-1, 1]) {
      BS.box(sx * 20.5, 40, 0, 4.8, 58, 31.6, 0);
      BS.box(sx * 16.5, 77, 0, 3.8, 18, 25.4, 0);
      for (const pz of [-15, -5, 5, 15]) {
        BS.box(sx * 26.8, 6.2, pz, 1.3, 12.4, 1.3, 0);
      }
    }
    // Вертикальные травертиновые пилястры между витражными пролётами (глубокий 3D рельеф!)
    for (const px of [-13.5, -4.5, 4.5, 13.5]) {
      BS.box(px, 41, 0, 1.4, 53, 31.6, 0);
    }
    for (const px of [-10.5, 0, 10.5]) {
      BS.box(px, 77, 0, 1.2, 16, 25.4, 0);
    }
    // Крышный технический пентхаус под нижней пагодой
    BS.box(0, 87.2, 0, 26, 3.2, 18, 0);
    stone.push(BS.build());

    // Утопленное золотисто-бронзовое фасадное остекление + золотые импосты
    BGl.box(0, 41, 0, 36, 52, 30.2, 0);
    BGl.box(0, 77, 0, 29, 16, 24.2, 0);
    glass.push(BGl.build());

    // Горизонтальные китайские золотые пояса-карнизы и вертикальные бронзовые рёбра
    for (const y of [13, 26, 40, 54, 68, 86]) {
      BGd.box(0, y, 0, y > 68 ? 38.5 : 46.8, y === 13 || y === 68 || y === 86 ? 1.5 : 0.7, y > 68 ? 26.8 : 32.8, 0);
    }
    for (const px of [-9, 0, 9]) {
      BGd.box(px, 41, 0, 0.45, 52, 30.8, 0);
    }
    gold.push(BGd.build());
  }

  // 5. Трёхъярусная бирюзовая крыша китайской пагоды + золотой шпиль (y = 88 .. 120 м)
  buildPagodaTier(turq, crimson, 88, 46, 34, 7.5);
  buildPagodaTier(turq, crimson, 96, 34, 25, 6.5);
  buildPagodaTier(turq, gold, 103, 22, 16, 6.2);
  // Золотой конёк и шпиль
  gold.push(new THREE.BoxGeometry(10.5, 1.4, 1.2).translate(0, 109.6, 0));
  gold.push(new THREE.CylinderGeometry(0.18, 0.72, 9.5, 10).translate(0, 114.5, 0));
  gold.push(new THREE.SphereGeometry(0.95, 10, 8).translate(0, 114.0, 0));

  // 6. Светящиеся вывески BEIJING PALACE (над входом и на вершине башни!)
  const signTex = makeBannerTex("BEIJING PALACE", {
    w: 512, h: 128, bg: "#6b0c12", fg: "#ffd97d", accent: "#ffb830", sub: "SOLUXE HOTEL · ASTANA",
  });
  const signMat = M.std({
    map: signTex, emissiveMap: signTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.92,
    roughness: 0.28, metalness: 0.25,
  });
  const entSign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.2), signMat);
  entSign.position.set(0, 6.8, 25.6);
  g.add(entSign);

  const topSignS = new THREE.Mesh(new THREE.PlaneGeometry(24, 5.2), signMat);
  topSignS.position.set(0, 83.5, 13.4);
  g.add(topSignS);
  const topSignN = new THREE.Mesh(new THREE.PlaneGeometry(24, 5.2), signMat);
  topSignN.position.set(0, 83.5, -13.4);
  topSignN.rotation.y = Math.PI;
  g.add(topSignN);

  const crimsonMat = M.std({ color: 0x9c1616, roughness: 0.36, metalness: 0.14 });
  addMerged(g, stone, M.travertine, true, true);
  addMerged(g, glass, M.glassGold, false, true);
  addMerged(g, glassClear, M.glassClear, false, false);
  addMerged(g, turq, M.turquoise, true, true);
  addMerged(g, crimson, crimsonMat, true, true);
  addMerged(g, gold, M.gold, false, true);
  addMerged(g, asphalt, M.asphalt, false, true);
  addMerged(g, water, M.turquoise, false, false);
}

// ============================================================
// ★★★ QAZAQGAZ HQ (x: 235, z: 155) + ТОЧНЫЕ СОСЕДИ (Запад/Восток) ★★★
// ============================================================

function drawQazaqGazEmblem(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  const flameGrad = ctx.createLinearGradient(0, r * 0.72, 0, -r * 0.85);
  flameGrad.addColorStop(0, "#0058C4");
  flameGrad.addColorStop(0.5, "#00A8FF");
  flameGrad.addColorStop(1, "#00F5FF");
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.84);
  ctx.bezierCurveTo(r * 0.56, -r * 0.25, r * 0.62, r * 0.48, 0, r * 0.74);
  ctx.bezierCurveTo(-r * 0.62, r * 0.48, -r * 0.56, -r * 0.25, 0, -r * 0.84);
  ctx.closePath();
  ctx.fill();

  const innerGrad = ctx.createLinearGradient(0, r * 0.60, 0, -r * 0.32);
  innerGrad.addColorStop(0, "#70F8FF");
  innerGrad.addColorStop(1, "#FFFFFF");
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.30);
  ctx.bezierCurveTo(r * 0.28, r * 0.04, r * 0.30, r * 0.45, 0, r * 0.60);
  ctx.bezierCurveTo(-r * 0.30, r * 0.45, -r * 0.28, r * 0.04, 0, -r * 0.30);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function createQazaqGazSignTexture(lightBg = false) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = lightBg ? "rgba(232,235,238,0.96)" : "#0b1e38";
  g.fillRect(0, 0, 1024, 256);

  drawQazaqGazEmblem(g, 130, 128, 86);

  g.fillStyle = lightBg ? "#192638" : "#ffffff";
  g.font = "800 124px 'Segoe UI', Arial, sans-serif";
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.fillText("QAZAQGAZ", 232, 132);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createDiamondForecourtTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#8a827a";
  g.fillRect(0, 0, 512, 512);
  const step = 64;
  g.strokeStyle = "#484440";
  g.lineWidth = 4;
  for (let i = -512; i <= 1024; i += step) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 512, 512); g.stroke();
    g.beginPath(); g.moveTo(i, 512); g.lineTo(i + 512, 0); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createNumberedParkingTexture() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#32353a";
  g.fillRect(0, 0, 1024, 256);
  const bays = 9; // 14..22
  const bw = 1024 / bays;
  g.strokeStyle = "#f2c12e";
  g.lineWidth = 7;
  for (let i = 0; i <= bays; i++) {
    const x = i * bw;
    g.beginPath();
    g.moveTo(x + 28, 10);
    g.lineTo(x - 18, 246);
    g.stroke();
  }
  g.fillStyle = "#f2c12e";
  g.font = "800 54px 'Segoe UI', Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let i = 0; i < bays; i++) {
    g.fillText(String(14 + i), (i + 0.45) * bw, 198);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createFlagTexture(kind) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 160;
  const g = c.getContext("2d");
  if (kind === "rk") {
    g.fillStyle = "#00AFCA"; g.fillRect(0, 0, 256, 160);
    g.fillStyle = "#FEC50C"; g.fillRect(14, 10, 12, 140);
    g.beginPath(); g.arc(138, 76, 24, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#FEC50C"; g.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath();
      g.moveTo(138 + Math.cos(a) * 27, 76 + Math.sin(a) * 27);
      g.lineTo(138 + Math.cos(a) * 38, 76 + Math.sin(a) * 38);
      g.stroke();
    }
  } else if (kind === "qg") {
    g.fillStyle = "#0A2A5E"; g.fillRect(0, 0, 256, 160);
    g.fillStyle = "#00C8FF"; g.fillRect(0, 142, 256, 18);
    drawQazaqGazEmblem(g, 74, 74, 38);
    g.fillStyle = "#FFFFFF"; g.font = "bold 28px 'Segoe UI', Arial, sans-serif";
    g.textAlign = "left"; g.textBaseline = "middle";
    g.fillText("QAZAQ", 122, 62);
    g.fillStyle = "#00E8FF"; g.fillText("GAZ", 122, 92);
  } else {
    g.fillStyle = "#0055A5"; g.fillRect(0, 0, 256, 160);
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 128, 256, 8);
    g.fillStyle = "#00D4FF"; g.fillRect(0, 136, 256, 24);
    g.fillStyle = "#FFFFFF"; g.font = "bold 46px 'Segoe UI', Arial, sans-serif";
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
  if (!P) return;
  const g = new THREE.Group();
  g.position.set(P.x, 0, P.z);
  g.name = "qazaqgaz-hero";
  parent.add(g);

  const espresso = [], glassTeal = [], glassClear = [];
  const steel = [], white = [], darkMetal = [], chrome = [], wood = [], terracotta = [], purple = [], glowWarm = [], neonBlue = [];

  // ── 1. 2-ЭТАЖНОЕ ТЁМНО-ШОКОЛАДНОЕ ГРАНИТНОЕ ОСНОВАНИЕ (y = 0..9.6 м) С ПОЛЫМ ЛОББИ ──
  // Внешние габариты основания: 44 × 35 м (x: ±22, z: ±17.5).
  // На Юге (+Z, z=+17.5) — ОТКРЫТЫЙ 4.4 м проём (x = -2.2 .. +2.2) прямо в лобби!
  {
    const BE = new GB();
    // Задняя (-Z) и боковые (±X) грани 2-этажного подиума + пол второго перекрытия над лобби
    BE.box(0, 4.8, -16.8, 44, 9.6, 1.4, 0);
    BE.box(-21.2, 4.8, 0, 1.6, 9.6, 35, 0);
    BE.box(+21.2, 4.8, 0, 1.6, 9.6, 35, 0);
    // Плита перекрытия над 1-м этажом вестибюля (y = 5.4..9.6 м на передней половине)
    BE.box(0, 7.6, 0, 42, 4.0, 34, 0);
    // 4 тёмно-коричневые гранитные колонны-пилоны вдоль южного стеклянного фасада (фото 02/03/05)
    for (const cx of [-20.0, -10.8, +10.8, +20.0]) {
      BE.box(cx, 4.8, 17.3, 2.5, 9.6, 1.4, 0);
    }
    // Плита площадки тамбура (y = 0..0.54) + 3 тёмные гранитные ступени на южном крыльце (+Z)
    BE.box(0, 0.27, 19.5, 22.5, 0.54, 4.6, 0);
    for (let s = 0; s < 3; s++) {
      BE.box(1.5, 0.09 + s * 0.18, 23.6 - s * 0.72, 24, 0.18, 0.92, 0);
    }
    BE.box(-10.5, 0.27, 22.8, 4.0, 0.54, 4.2, 0);
    espresso.push(BE.build());

    // Прозрачное остекление 2-го яруса базы (y = 5.0..9.4) и боковых окон 1-го этажа
    const BGl = new GB();
    BGl.box(-15.4, 2.7, 17.2, 7.0, 4.4, 0.2, 0);
    BGl.box(+15.4, 2.7, 17.2, 7.0, 4.4, 0.2, 0);
    BGl.box(0, 7.2, 17.2, 39.0, 4.0, 0.2, 0);
    glassClear.push(BGl.build());
  }

  // ── 2. ВЫСТУПАЮЩИЙ СТЕКЛЯННЫЙ ТАМБУР-ВЕСТИБЮЛЬ И ОТКРЫТЫЕ ДВЕРИ (x: ±8.8, z: +17.3..+21.4) ──
  {
    const BW = new GB(), BS = new GB(), BG = new GB();
    // Белый верхний фриз тамбура (y = 3.95..4.75)
    BW.box(0, 4.35, 19.4, 17.8, 0.80, 4.4, 0);
    // Стеклянные панели тамбура слева и справа от ЦЕНТРАЛЬНОГО ОТКРЫТОГО ПРОЁМА (x = -2.2..+2.2!)
    BG.box(-5.5, 2.25, 21.35, 6.2, 3.4, 0.14, 0);
    BG.box(+5.5, 2.25, 21.35, 6.2, 3.4, 0.14, 0);
    BG.box(-8.8, 2.25, 19.4, 0.14, 3.4, 4.0, 0);
    BG.box(+8.8, 2.25, 19.4, 0.14, 3.4, 4.0, 0);
    // Открытые наружу/внутрь стеклянные створки центральных двойных дверей
    for (const sx of [-1, 1]) {
      BS.box(sx * 2.25, 2.25, 21.35, 0.12, 3.45, 0.18, 0);
      BG.box(sx * 2.45, 2.25, 20.5, 0.08, 3.2, 1.5, sx * 0.25);
    }
    // Серебристые рамы тамбура
    for (const mx of [-8.8, -6.6, -4.4, -2.2, 2.2, 4.4, 6.6, 8.8]) {
      BS.box(mx, 2.25, 21.38, 0.10, 3.45, 0.12, 0);
    }
    // Ребристый матово-стеклянный козырёк над тамбуром (фото 02/03/05)
    for (let bx = -6.6; bx <= 6.6; bx += 2.2) {
      BS.box(bx, 4.92, 22.8, 0.14, 0.22, 3.6, 0);
    }
    BW.box(0, 4.95, 24.5, 14.0, 0.16, 0.18, 0);
    BG.box(0, 5.05, 22.8, 13.8, 0.08, 3.4, 0);

    white.push(BW.build());
    steel.push(BS.build());
    glassClear.push(BG.build());
  }

  // ── 3. ИЗОГНУТАЯ БЕЛАЯ ПЕРФОРИРОВАННАЯ ПЕРГОЛА-КОЗЫРЁК (y = 9.8 м, фото 03 & 05) ──
  {
    const BW = new GB();
    const nSeg = 14;
    const xSpan = 17.5;
    for (let i = 0; i < nSeg; i++) {
      const t0 = i / nSeg, t1 = (i + 1) / nSeg;
      const x0 = -xSpan + t0 * xSpan * 2, x1 = -xSpan + t1 * xSpan * 2;
      const zOut0 = 20.5 + 4.4 * Math.sin(t0 * Math.PI);
      const zOut1 = 20.5 + 4.4 * Math.sin(t1 * Math.PI);
      const xm = (x0 + x1) * 0.5, zm = (zOut0 + zOut1) * 0.5;
      const segL = Math.hypot(x1 - x0, zOut1 - zOut0) + 0.12;
      const ang = -Math.atan2(zOut1 - zOut0, x1 - x0);
      // Наружная дугообразная балка с белым фризом
      BW.box(xm, 9.95, zm, segL, 1.35, 0.85, ang);
      // Внутренняя продольная перемычка
      const zIn0 = 17.8 + 2.4 * Math.sin(t0 * Math.PI);
      const zIn1 = 17.8 + 2.4 * Math.sin(t1 * Math.PI);
      BW.box((x0 + x1) * 0.5, 9.75, (zIn0 + zIn1) * 0.5, segL, 0.45, 0.55, ang);
    }
    // Поперечные рёбра перголы (открытые квадратные ячейки!)
    for (let i = 0; i <= nSeg; i++) {
      const t = i / nSeg;
      const rx = -xSpan + t * xSpan * 2;
      const zOut = 20.5 + 4.4 * Math.sin(t * Math.PI);
      const len = zOut - 17.2;
      BW.box(rx, 9.75, 17.2 + len * 0.5, 0.42, 0.48, len, 0);
    }
    white.push(BW.build());
  }

  // ── 4. ТРАПЕЦИЕВИДНАЯ 18-ЭТАЖНАЯ БАШНЯ (y = 9.6..72.5 м) + БИРЮЗОВЫЙ ВИТРАЖ + КОРИЧНЕВЫЕ ПИЛЯСТРЫ ──
  // Сужается с 42.4×34 м у основания до 36.2×29.4 м наверху (фото 01!)
  {
    glassTeal.push(taperedBox(42.4, 34.0, 36.2, 29.4, 9.6, 65.5));
    // Верхний светлый двухсветный этаж + серебристый карниз (y = 65.5..73.2 м)
    glassTeal.push(taperedBox(36.2, 29.4, 35.2, 28.8, 65.5, 71.2));
    const BW = new GB();
    BW.box(0, 72.3, 0, 36.4, 2.2, 30.0, 0);
    BW.box(0, 65.4, 0, 36.8, 0.7, 30.2, 0);
    white.push(BW.build());

    // Сужающиеся тёмно-коричневые гранитные угловые пилоны + серебристая кайма (фото 01/03)
    const BE = new GB(), BS = new GB();
    const lerp = (a, b, t) => a + (b - a) * t;
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const y = lerp(9.6, 65.5, t);
      const sh = (65.5 - 9.6) / steps + 0.12;
      const halfW = lerp(21.2, 18.1, t);
      const halfD = lerp(17.0, 14.7, t);
      const pilW = lerp(4.8, 1.9, t);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          BE.box(sx * (halfW - pilW * 0.45), y, sz * (halfD + 0.15), pilW, sh, 0.9, 0);
          // Серебристо-серая металлическая кайма вокруг коричневого пилона
          BS.box(sx * (halfW - pilW - 0.35), y, sz * (halfD + 0.25), 0.75, sh, 1.0, 0);
          BS.box(sx * (halfW + 0.25), y, sz * (halfD - 0.1), 0.65, sh, 1.1, 0);
        }
        // Боковые (±X) гранитные простенки на углах
        BE.box(sx * (halfW + 0.15), y, -halfD + 2.0, 0.9, sh, 3.8, 0);
        BE.box(sx * (halfW + 0.15), y, +halfD - 2.0, 0.9, sh, 3.8, 0);
      }
    }
    // Горизонтальные межэтажные пояса и вертикальные импосты витража
    for (let fl = 0; fl < 15; fl++) {
      const t = fl / 15;
      const y = 10.2 + fl * 3.68;
      const hw = lerp(21.2, 18.1, t) * 2;
      const hd = lerp(17.0, 14.7, t) * 2;
      BS.box(0, y, hd * 0.5 + 0.1, hw - 4, 0.28, 0.28, 0);
      BS.box(0, y, -hd * 0.5 - 0.1, hw - 4, 0.28, 0.28, 0);
      BS.box(hw * 0.5 + 0.1, y, 0, 0.28, 0.28, hd - 4, 0);
      BS.box(-hw * 0.5 - 0.1, y, 0, 0.28, 0.28, hd - 4, 0);
    }
    for (let lx = -12; lx <= 12; lx += 3.0) {
      BS.box(lx, 38, +16.0, 0.22, 56, 0.3, 0);
      BS.box(lx, 38, -16.0, 0.22, 56, 0.3, 0);
    }
    espresso.push(BE.build());
    steel.push(BS.build());

    // ── 5. 15 ВЫСТУПАЮЩИХ ШЕВРОННЫХ (V-ОБРАЗНЫХ) БАЛКОНОВ ПО ЦЕНТРУ +Z И -Z (фото 01/02/03) ──
    const BBal = new GB(), BRail = new GB();
    for (let fl = 0; fl < 15; fl++) {
      const t = fl / 15;
      const y = 10.6 + fl * 3.68;
      const faceZ = lerp(17.0, 14.7, t);
      for (const sz of [1, -1]) {
        const zBase = sz * faceZ;
        const tipZ = zBase + sz * 2.15;
        const wingZ = zBase + sz * 0.55;
        // Левое и правое крыло V-образного шевронного балкона
        const aL = sz * 0.29, aR = -sz * 0.29;
        BBal.box(-2.6, y, (tipZ + wingZ) * 0.5, 5.4, 0.58, 1.35, aL);
        BBal.box(+2.6, y, (tipZ + wingZ) * 0.5, 5.4, 0.58, 1.35, aR);
        // Металлические поручни (2 горизонтальные рейки + стойки)
        for (const ry of [0.58, 1.02]) {
          BRail.box(-2.6, y + ry, (tipZ + wingZ) * 0.5 + sz * 0.45, 5.3, 0.08, 0.08, aL);
          BRail.box(+2.6, y + ry, (tipZ + wingZ) * 0.5 + sz * 0.45, 5.3, 0.08, 0.08, aR);
        }
        for (const px of [-4.8, -2.4, 0, 2.4, 4.8]) {
          const pz = tipZ - Math.abs(px) * 0.29 * sz + sz * 0.45;
          BRail.box(px, y + 0.56, pz, 0.08, 0.92, 0.08, 0);
        }
      }
    }
    white.push(BBal.build());
    chrome.push(BRail.build());
  }

  // ── 6. 4-СКАТНАЯ СТЕКЛЯННАЯ ПИРАМИДА НА КРЫШЕ + ШПИЛЬ (фото 01) ──
  {
    const BP = new GB();
    const y0 = 73.4, yApex = 84.8, hw = 16.4, hd = 13.4;
    const apex = [0, yApex, 0];
    const c = [[-hw, y0, -hd], [hw, y0, -hd], [hw, y0, hd], [-hw, y0, hd]];
    const mulList = [];
    for (let i = 0; i < 4; i++) {
      const p0 = c[i], p1 = c[(i + 1) % 4];
      const ux = p1[0] - p0[0], uy = 0, uz = p1[2] - p0[2];
      const vx = apex[0] - p0[0], vy = apex[1] - p0[1], vz = apex[2] - p0[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      BP.tri(p1, p0, apex, [nx / len, ny / len, nz / len], [1, 0], [0, 0], [0.5, 1]);
      mulList.push(tube([new THREE.Vector3(...p0), new THREE.Vector3(...apex)], 0.26, 6));
      for (const frac of [0.25, 0.5, 0.75]) {
        const xm = p0[0] + (p1[0] - p0[0]) * frac;
        const zm = p0[2] + (p1[2] - p0[2]) * frac;
        mulList.push(tube([new THREE.Vector3(xm, y0, zm), new THREE.Vector3(...apex)], 0.14, 4));
      }
    }
    darkMetal.push(...mulList);
    const pyrMat = M.phys({
      color: 0x3b6384, roughness: 0.10, metalness: 0.45, clearcoat: 1.0,
      reflectivity: 1.0, envMapIntensity: 1.75,
    });
    const pyrMesh = new THREE.Mesh(BP.build(), pyrMat);
    pyrMesh.castShadow = true; pyrMesh.receiveShadow = true;
    g.add(pyrMesh);

    // Тонкий центральный шпиль
    chrome.push(new THREE.CylinderGeometry(0.06, 0.22, 13.5, 8).translate(0, yApex + 6.75, 0));
  }

  // ── 7. ВЫВЕСКИ QAZAQGAZ + 3D СИНЕЕ ПЛАМЯ (под пирамидой и на перголе) ──
  {
    const topSignTex = createQazaqGazSignTexture(true);
    const topSignMat = M.std({
      map: topSignTex, emissiveMap: topSignTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.45,
      roughness: 0.25, metalness: 0.2,
    });
    const portSignTex = createQazaqGazSignTexture(true);
    const portSignMat = M.std({
      map: portSignTex, emissiveMap: portSignTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.55,
      roughness: 0.25, metalness: 0.2,
    });

    // На верхнем белом карнизе под пирамидой (Юг +Z и Север -Z)
    const cS = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.2), topSignMat);
    cS.position.set(0, 72.4, 15.15);
    g.add(cS);
    const cN = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.2), topSignMat);
    cN.position.set(0, 72.4, -15.15);
    cN.rotation.y = Math.PI;
    g.add(cN);

    // На белой перголе-козырьке над южным входом (+Z)
    const pS = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 1.9), portSignMat);
    pS.position.set(0, 10.0, 25.35);
    g.add(pS);

    // Объёмные сине-циановые элементы пламени на перголе и карнизе
    const BN = new GB();
    BN.box(-4.9, 10.0, 25.4, 0.55, 1.4, 0.22, 0.35);
    BN.box(-9.4, 72.4, 15.25, 1.1, 2.8, 0.35, 0.35);
    neonBlue.push(BN.build());
  }

  // ── 8. ПАНДУС СЛЕВА, РОМБОВИДНАЯ ПЛОЩАДКА, ФОНАРИ, ЛАВОЧКА, ГОРШОК, ПАРКОВКА 14..22 ──
  {
    // Нержавеющий пандус слева (x = -17.5 .. -10.5)
    const BC = new GB();
    for (const rz of [21.0, 23.8]) {
      BC.box(-14.0, 0.85, rz, 7.2, 0.08, 0.08, -0.075);
      for (let px = -17.2; px <= -10.8; px += 1.6) {
        BC.box(px, 0.45, rz, 0.07, 0.9, 0.07, 0);
      }
    }
    chrome.push(BC.build());

    // Ромбовидный гранитный подиум-площадка (фото 03/05)
    const fTex = createDiamondForecourtTexture();
    const fMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(54, 14.5).rotateX(-Math.PI / 2),
      M.std({ map: fTex, roughness: 0.42, metalness: 0.06 })
    );
    fMesh.position.set(0, 0.03, 25.2);
    fMesh.receiveShadow = true;
    g.add(fMesh);

    // 2 серебристых цилиндрических фонаря с коническими колпаками (фото 02!)
    for (const lx of [-10.2, 10.2]) {
      steel.push(new THREE.CylinderGeometry(0.16, 0.20, 3.0, 12).translate(lx, 1.5, 29.8));
      glowWarm.push(new THREE.CylinderGeometry(0.19, 0.19, 0.65, 12).translate(lx, 3.1, 29.8));
      steel.push(new THREE.ConeGeometry(0.62, 0.45, 14).translate(lx, 3.6, 29.8));
    }

    // Классическая кованая скамейка + терракотовый горшок с фиолетовыми цветами (фото 02!)
    const BW = new GB(), BD = new GB();
    BW.box(-1.5, 0.48, 29.8, 2.2, 0.08, 0.56, 0);
    BW.box(-1.5, 0.82, 30.05, 2.2, 0.45, 0.07, 0);
    BD.box(-2.45, 0.45, 29.8, 0.10, 0.9, 0.62, 0);
    BD.box(-0.55, 0.45, 29.8, 0.10, 0.9, 0.62, 0);
    wood.push(BW.build());
    darkMetal.push(BD.build());

    terracotta.push(new THREE.CylinderGeometry(0.45, 0.34, 0.62, 12).translate(-3.4, 0.31, 29.8));
    purple.push(new THREE.DodecahedronGeometry(0.48, 1).translate(-3.4, 0.72, 29.8));

    // Жёлтая размеченная парковка с номерами 14..22 (z = 32.5 .. 39.5)
    const pTex = createNumberedParkingTexture();
    const pMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 7.6).rotateX(-Math.PI / 2),
      M.std({ map: pTex, roughness: 0.78, metalness: 0.02, polygonOffset: true, polygonOffsetFactor: -1 })
    );
    pMesh.position.set(0, 0.04, 36.4);
    pMesh.receiveShadow = true;
    g.add(pMesh);

    // 3 флагштока (РК, QazaqGaz, ICA) справа на площади
    const flagKinds = ["rk", "qg", "ica"];
    for (let i = 0; i < 3; i++) {
      const fx = 21.5 + i * 3.8, fz = 29.5;
      chrome.push(new THREE.CylinderGeometry(0.09, 0.14, 13.5, 8).translate(fx, 6.75, fz));
      const fTex = createFlagTexture(flagKinds[i]);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 2.0),
        M.std({ map: fTex, roughness: 0.55, side: THREE.DoubleSide })
      );
      flag.position.set(fx + 1.65, 12.1, fz);
      g.add(flag);
    }
  }

  const espressoMat = M.phys({ color: 0x2d201a, roughness: 0.22, metalness: 0.10, clearcoat: 0.65, envMapIntensity: 1.35 });
  const terracottaMat = M.std({ color: 0xb65d38, roughness: 0.75 });
  const purpleMat = M.std({ color: 0x6b289e, roughness: 0.82 });

  addMerged(g, espresso, espressoMat, true, true);
  addMerged(g, glassTeal, M.glassEmerald, true, true);
  addMerged(g, glassClear, M.glassClear, false, false);
  addMerged(g, steel, M.steel, true, true);
  addMerged(g, white, M.whitePaint, true, true);
  addMerged(g, darkMetal, M.darkMetal, true, true);
  addMerged(g, chrome, M.chrome, false, true);
  addMerged(g, wood, M.wood, true, true);
  addMerged(g, terracotta, terracottaMat, true, true);
  addMerged(g, purple, purpleMat, false, true);
  addMerged(g, glowWarm, M.glow(0xffe0a8, 4.0, 0xf2ece0), false, false);
  addMerged(g, neonBlue, M.neon(0x00a8ff, 4.5, 0.65), false, false);
}

// ---------- ТОЧНЫЕ СОСЕДИ QAZAQGAZ (Запад & Восток, фото 01 & 03) ----------
function buildQazaqGazNeighbors(parent, M) {
  const g = new THREE.Group();
  g.name = "qazaqgaz-neighbors";
  parent.add(g);

  // 1. ЗАПАДНЫЙ СОСЕД (x: 162, z: 150) — 7-этажная тёплая кремовая неоклассика + рельефные пилястры и карнизы
  {
    const wg = new THREE.Group();
    wg.position.set(162, 0, 150);
    g.add(wg);

    const cream = [], brown = [], glass = [], white = [], steel = [], asphalt = [];
    const B = new GB(), BB = new GB(), BG = new GB();
    // Тёмно-коричневый 2-этажный подиум с аркадой (y = 0..7.4)
    BB.box(0, 3.7, 0, 50.6, 7.4, 24.6, 0);
    for (let px = -24; px <= 24; px += 8) {
      BB.box(px, 3.7, +13.0, 1.4, 7.4, 1.4, 0);
      BB.box(px, 3.7, -13.0, 1.4, 7.4, 1.4, 0);
    }
    BG.box(0, 3.6, 0, 51.4, 5.2, 25.4, 0);
    // 5 кремово-бежевых этажей с утопленными оконными проёмами (y = 7.4..25.5)
    B.box(0, 16.4, 0, 50.4, 18.0, 24.4, 0);
    // Вертикальные пилястры на ВСЕХ 4 фасадах + межэтажные пояски + карниз + парапет + техэтаж
    for (let px = -24; px <= 24; px += 6) {
      B.box(px, 16.4, +13.1, 1.4, 18.2, 1.2, 0);
      B.box(px, 16.4, -13.1, 1.4, 18.2, 1.2, 0);
    }
    for (let pz = -12; pz <= 12; pz += 6) {
      B.box(+25.8, 16.4, pz, 1.2, 18.2, 1.4, 0);
      B.box(-25.8, 16.4, pz, 1.2, 18.2, 1.4, 0);
    }
    for (const sy of [7.6, 14.6, 20.4]) {
      B.box(0, sy, 0, 53.0, 0.55, 27.0, 0);
    }
    B.box(0, 25.9, 0, 54.8, 1.5, 28.8, 0);
    B.box(0, 27.3, 0, 52.6, 1.4, 26.6, 0);
    B.box(-14, 28.8, 0, 11, 2.8, 11, 0);
    B.box(+14, 28.8, 0, 11, 2.8, 11, 0);
    BG.box(0, 16.5, 0, 51.2, 14.5, 25.2, 0);

    // Белый арочный крытый парковочный навес перед зданием (x=+34, z=+18 → мир ~196, 168)
    const BW = new GB(), BS = new GB(), BA = new GB();
    BA.box(24, 0.03, 22, 30, 0.06, 18, 0);
    const nArc = 8;
    for (let i = 0; i < nArc; i++) {
      const a = -0.5 + (i + 0.5) / nArc;
      BW.box(26, 3.8 - Math.abs(a) * 0.7, 19 + a * 6.5, 24, 0.18, 1.0, 0);
    }
    for (let px = 15; px <= 37; px += 5.5) {
      BS.box(px, 1.8, 15.8, 0.16, 3.6, 0.16, 0);
      BS.box(px, 1.8, 22.2, 0.16, 3.6, 0.16, 0);
    }

    cream.push(B.build());
    brown.push(BB.build());
    glass.push(BG.build());
    white.push(BW.build());
    steel.push(BS.build());
    asphalt.push(BA.build());

    addMerged(wg, cream, M.travertine, true, true);
    addMerged(wg, brown, M.std({ color: 0x3a2a22, roughness: 0.35 }), true, true);
    addMerged(wg, glass, M.glass, false, true);
    addMerged(wg, white, M.whitePaint, true, true);
    addMerged(wg, steel, M.steel, true, true);
    addMerged(wg, asphalt, M.asphalt, false, true);
  }

  // 2. ВОСТОЧНЫЙ СОСЕД (x: 314, z: 152) — 9-этажный светло-бежевый дом + выступающие балконы + аркада + синекупольные башни
  {
    const eg = new THREE.Group();
    eg.position.set(314, 0, 152);
    g.add(eg);

    const facade = [], glass = [], stone = [], metal = [], domes = [], gold = [];
    const BF = new GB(), BG = new GB(), BS = new GB(), BM = new GB();
    // Основной 9-этажный жилой корпус (62×20×30 м)
    BF.box(0, 15, 0, 62, 30, 19.6, 0);
    // Первый этаж коммерция с колоннами аркады и козырьком
    BS.box(0, 2.2, 0, 62.6, 4.4, 20.6, 0);
    BS.box(0, 4.6, 0, 63.4, 0.55, 21.8, 0);
    for (let cx = -28; cx <= 28; cx += 7) {
      BS.box(cx, 2.2, +10.8, 0.85, 4.4, 0.85, 0);
      BS.box(cx, 2.2, -10.8, 0.85, 4.4, 0.85, 0);
    }
    BG.box(0, 2.2, 10.4, 58, 3.2, 0.2, 0);
    // Выступающий вертикальный остеклённый эркер лестничной клетки справа (фото 01!)
    BF.box(23, 15, 11.5, 8.5, 30, 4.5, 0);
    BG.box(23, 16, 13.8, 6.2, 26, 0.3, 0);
    for (const mx of [21.0, 23.0, 25.0]) {
      BM.box(mx, 16, 14.0, 0.24, 26, 0.3, 0);
    }
    // Выступающие горизонтальные балконные плиты, простенки и металлические ограждения
    for (let bx = -24; bx <= 14; bx += 9.5) {
      BS.box(bx, 17, 10.0, 5.4, 23, 0.5, 0);
      for (let by = 7.4; by <= 27.4; by += 3.3) {
        BS.box(bx, by, +10.7, 5.8, 0.28, 1.35, 0);
        BM.box(bx, by + 0.55, +11.3, 5.6, 0.72, 0.08, 0);
      }
    }
    // Карниз крыши + технические надстройки + задний блок с синекупольными угловыми башенками
    BS.box(0, 30.4, 0, 63.6, 0.9, 21.2, 0);
    BS.box(-10, 31.8, 0, 12, 2.4, 8, 0);
    BF.box(22, 16, -24, 34, 32, 18, 0);
    for (const sx of [10, 34]) {
      BS.box(sx, 33, -24, 6.5, 4, 6.5, 0);
      domes.push(new THREE.SphereGeometry(3.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62).translate(sx, 35, -24));
      gold.push(new THREE.CylinderGeometry(0.08, 0.22, 3.2, 6).translate(sx, 39.2, -24));
    }

    facade.push(BF.build());
    glass.push(BG.build());
    stone.push(BS.build());
    metal.push(BM.build());

    addMerged(eg, facade, M.res, true, true);
    addMerged(eg, stone, M.travertine, true, true);
    addMerged(eg, glass, M.glass, false, true);
    addMerged(eg, metal, M.darkMetal, true, true);
    addMerged(eg, domes, M.blueDome, true, true);
    addMerged(eg, gold, M.gold, false, true);
  }
}

// ============================================================
// HIGHVILL PARK (x: -630, z: +660, 6 башен) & HIGHVILL ASTANA (x: +1140, z: -90, 4 башни)
// Ступенчатая корейско-современная архитектура, «двор без машин», ретейл
// ============================================================
function buildHighvillComplex(parent, M, { cx, cz, podiumW, podiumD, towers, signTitle, name }) {
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  g.name = name;
  parent.add(g);

  const podiumH = 3.8;
  const terra = [], beige = [], silver = [], glass = [], railGlass = [], dark = [], lawn = [], walk = [], wood = [];

  // Стилобат «двор без машин» + аркада и коммерция 1 этажа
  {
    const BD = new GB(), BL = new GB(), BW = new GB(), BS = new GB();
    BD.box(0, podiumH / 2, 0, podiumW - 2.4, podiumH, podiumD - 2.4, 0);
    BS.box(0, podiumH - 0.15, 0, podiumW + 0.8, 0.45, podiumD + 0.8, 0);
    for (let px = -podiumW * 0.46; px <= podiumW * 0.46; px += 14) {
      BS.box(px, podiumH * 0.5, +podiumD * 0.5, 0.85, podiumH, 0.85, 0);
      BS.box(px, podiumH * 0.5, -podiumD * 0.5, 0.85, podiumH, 0.85, 0);
    }
    for (let pz = -podiumD * 0.42; pz <= podiumD * 0.42; pz += 14) {
      BS.box(+podiumW * 0.5, podiumH * 0.5, pz, 0.85, podiumH, 0.85, 0);
      BS.box(-podiumW * 0.5, podiumH * 0.5, pz, 0.85, podiumH, 0.85, 0);
    }
    dark.push(BD.build());
    silver.push(BS.build());
    glass.push(new THREE.BoxGeometry(podiumW - 1.2, 2.8, podiumD - 16).translate(0, 1.8, 0));
    glass.push(new THREE.BoxGeometry(podiumW - 16, 2.8, podiumD - 1.2).translate(0, 1.8, 0));

    BL.box(0, podiumH + 0.04, 0, podiumW - 22, 0.08, podiumD - 22, 0);
    lawn.push(BL.build());
    BW.box(0, podiumH + 0.09, 0, podiumW - 14, 0.08, 6.5, 0);
    BW.box(0, podiumH + 0.09, 0, 6.5, 0.08, podiumD - 14, 0);
    walk.push(BW.build());

    const BP = new GB();
    BP.box(0, podiumH + 2.8, 0, 14, 0.3, 6, 0);
    for (const px of [-6, 0, 6]) for (const pz of [-2.4, 2.4]) {
      BP.box(px, podiumH + 1.4, pz, 0.35, 2.8, 0.35, 0);
    }
    wood.push(BP.build());
  }

  // Ступенчатые жилые башни с PBR-кликкером/травертином, витражным стеклом, стеклянными балконами и жалюзийной короной
  for (const t of towers) {
    const BT = new GB(), BB = new GB(), BS = new GB(), BG = new GB(), BRG = new GB(), BDk = new GB();
    const h1 = t.h * 0.56, h2 = t.h * 0.30, h3 = t.h * 0.14;
    // Нижний терракотово-песчаниковый корпус с каменной фактурой
    BT.box(t.x, podiumH + h1 * 0.5, t.z, t.w, h1, t.d * 0.94, 0);
    // Средний травертиновый объём
    BB.box(t.x + t.sx * 2.5, podiumH + h1 + h2 * 0.5, t.z, t.w * 0.84, h2, t.d * 0.84, 0);
    // Верхняя каменная-металлическая корона + парапетная рама + жалюзийный пентхаус (не серый глухой куб!)
    BB.box(t.x + t.sx * 4.5, podiumH + h1 + h2 + h3 * 0.5, t.z, t.w * 0.66, h3, t.d * 0.72, 0);
    BS.box(t.x + t.sx * 4.5, podiumH + t.h + 0.8, t.z, t.w * 0.72, 1.1, t.d * 0.78, 0);
    BDk.box(t.x + t.sx * 4.5, podiumH + t.h + 2.4, t.z, t.w * 0.34, 2.2, t.d * 0.36, 0);
    for (const lx of [-0.14, 0, 0.14]) {
      BS.box(t.x + t.sx * 4.5 + t.w * lx, podiumH + t.h + 2.5, t.z, 0.45, 2.4, t.d * 0.38, 0);
    }

    // Вертикальные каменные и тёмно-бронзовые разделительные пилоны + выступающие балконные плиты + стеклянные ограждения
    for (const ox of [-0.36, -0.12, 0.12, 0.36]) {
      BT.box(t.x + t.w * ox, podiumH + h1 * 0.5, t.z, 1.15, h1, t.d + 0.8, 0);
    }
    for (let y = podiumH + 3.6; y < podiumH + h1 - 1.5; y += 3.6) {
      BB.box(t.x, y, t.z, t.w * 0.68, 0.32, t.d + 1.25, 0);
      BRG.box(t.x, y + 0.58, t.z + t.d * 0.5 + 0.55, t.w * 0.66, 0.88, 0.08, 0);
      BRG.box(t.x, y + 0.58, t.z - t.d * 0.5 - 0.55, t.w * 0.66, 0.88, 0.08, 0);
    }
    for (let y = podiumH + h1 + 3.6; y < podiumH + h1 + h2 - 1.2; y += 3.6) {
      BS.box(t.x + t.sx * 2.5, y, t.z, t.w * 0.58, 0.28, t.d * 0.88 + 1.0, 0);
      BRG.box(t.x + t.sx * 2.5, y + 0.54, t.z + t.d * 0.44 + 0.44, t.w * 0.56, 0.82, 0.08, 0);
      BRG.box(t.x + t.sx * 2.5, y + 0.54, t.z - t.d * 0.44 - 0.44, t.w * 0.56, 0.82, 0.08, 0);
    }

    // Отражающее витражное стекло с реальным оконным шейдером (M.glassDark / M.glassBlue)
    BG.box(t.x, podiumH + h1 * 0.5, t.z, t.w * 0.64, h1 * 0.94, t.d + 0.2, 0);
    BG.box(t.x + t.sx * 2.5, podiumH + h1 + h2 * 0.5, t.z, t.w * 0.56, h2 * 0.94, t.d * 0.86 + 0.2, 0);
    BG.box(t.x + t.sx * 4.5, podiumH + h1 + h2 + h3 * 0.5, t.z, t.w * 0.46, h3 * 0.88, t.d * 0.74 + 0.2, 0);

    terra.push(BT.build());
    beige.push(BB.build());
    silver.push(BS.build());
    dark.push(BDk.build());
    glass.push(BG.build());
    railGlass.push(BRG.build());
  }

  // Вывеска комплекса
  const sTex = makeBannerTex(signTitle, {
    w: 512, h: 112, bg: "#1c222d", fg: "#ffffff", accent: "#e8a858", sub: "RESIDENTIAL COMPLEX",
  });
  const sMat = M.std({ map: sTex, emissiveMap: sTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.72 });
  const signS = new THREE.Mesh(new THREE.PlaneGeometry(18, 3.8), sMat);
  signS.position.set(0, podiumH + 1.6, podiumD / 2 + 0.5);
  g.add(signS);
  const signN = new THREE.Mesh(new THREE.PlaneGeometry(18, 3.8), sMat);
  signN.position.set(0, podiumH + 1.6, -podiumD / 2 - 0.5);
  signN.rotation.y = Math.PI;
  g.add(signN);

  const terraMat = M.std({
    map: M.travertine.map, normalMap: M.travertine.normalMap, roughnessMap: M.travertine.roughnessMap,
    color: 0xc8947c, roughness: 0.82, metalness: 0.04, envMapIntensity: 0.85,
  });
  addMerged(g, terra, terraMat, true, true);
  addMerged(g, beige, M.travertine, true, true);
  addMerged(g, silver, M.steel, true, true);
  addMerged(g, glass, M.glassBlue, false, true);
  addMerged(g, railGlass, M.glassClear, false, false);
  addMerged(g, dark, M.nero || M.darkMetal, true, true);
  addMerged(g, lawn, M.grass, false, true);
  addMerged(g, walk, M.graniteLight, false, true);
  addMerged(g, wood, M.wood, true, true);
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

  // ★★★ HERO — Штаб-квартира QazaqGaz + точные соседи ★★★
  buildQazaqGaz(group, M);
  buildQazaqGazNeighbors(group, M);

  // ★★★ Highvill Park (6 башен) & Highvill Astana (4 башни) ★★★
  buildHighvillComplex(group, M, {
    cx: L.highvillPark.x, cz: L.highvillPark.z,
    podiumW: 162, podiumD: 138,
    signTitle: "HIGHVILL PARK",
    name: "sig-highvill-park",
    towers: [
      { x: -58, z: -48, w: 30, d: 22, h: 78, sx: 1 },
      { x:   0, z: -50, w: 32, d: 22, h: 86, sx: 0 },
      { x: +58, z: -48, w: 30, d: 22, h: 74, sx: -1 },
      { x: -60, z: +46, w: 28, d: 22, h: 64, sx: 1 },
      { x:   0, z: +48, w: 32, d: 22, h: 72, sx: 0 },
      { x: +58, z: +46, w: 28, d: 22, h: 60, sx: -1 },
    ],
  });

  buildHighvillComplex(group, M, {
    cx: 1145, cz: -104,
    podiumW: 118, podiumD: 82,
    signTitle: "HIGHVILL ASTANA",
    name: "sig-highvill-astana",
    towers: [
      { x: -40, z: -26, w: 26, d: 20, h: 68, sx: 1 },
      { x: +40, z: -26, w: 26, d: 20, h: 76, sx: -1 },
      { x: -40, z: +26, w: 26, d: 20, h: 58, sx: 1 },
      { x: +40, z: +26, w: 26, d: 20, h: 64, sx: -1 },
    ],
  });

  for (const s of SIGNATURE) {
    towers.push({ x: s.x, y: 0, z: s.z, yaw: s.yaw || 0, w: s.w || 40, d: s.d || 40, h: s.h, walkable: !!s.walkable });
  }
  if (L.qazaqGaz) {
    towers.push({ x: L.qazaqGaz.x, y: 0, z: L.qazaqGaz.z, yaw: 0, w: 46, d: 38, h: L.qazaqGaz.h, isQazaqGaz: true, walkable: true });
  }

  return {
    group,
    towers,
    update(dt, time, _cam, cyberMix) {
      void dt; void time; void cyberMix;
    },
  };
}
