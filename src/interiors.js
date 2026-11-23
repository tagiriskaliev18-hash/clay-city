// ============================================================
// ASTANA REAL v5 — interiors.js
// 4 полностью проходных 3D-интерьера с открытыми дверными проёмами,
// полыми коллайдерами стен, отслеживанием этажа/эскалатора и [V]-порталами:
//   1. QazaqGaz HQ Lobby (x: 235, z: 155) — по реальному фото №4!
//   2. MEGA Silk Way 2-Level Galleria (x: -180, z: 940) — 2 этажа + эскалаторы!
//   3. Beijing Palace Soluxe Grand Lobby (x: -240, z: 390)
//   4. Nurzhol Cafe & Market: COFFEE BOOM & MAGNUM EXPRESS (x: -115, z: 62)
// ============================================================
import * as THREE from "three";
import { LANDMARKS } from "./config.js";
import { GB, merge } from "./geom.js";
import { loadModelParts, instantiateModelGroup } from "./models.js";

function addMerged(parent, list, mat, cast = false, receive = true) {
  if (!list.length) return null;
  const m = new THREE.Mesh(merge(list), mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

// ── Текстуры для интерьеров ──

/** Мраморный пол QazaqGaz: глянцевая кремовая плитка с чёрными геометрическими полосами (фото 04). */
function makeQGMarbleFloorTex() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 1024;
  const g = c.getContext("2d");
  g.fillStyle = "#ece6da";
  g.fillRect(0, 0, 1024, 1024);
  // Плитка
  g.strokeStyle = "rgba(130,120,105,0.22)";
  g.lineWidth = 2;
  for (let i = 0; i <= 1024; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(1024, i); g.stroke();
  }
  // Жирные чёрные мраморные геометрические рамки (как на фото 04!)
  g.strokeStyle = "#16181c";
  g.lineWidth = 26;
  g.strokeRect(96, 96, 832, 832);
  g.lineWidth = 18;
  g.strokeRect(256, 256, 512, 512);
  g.fillStyle = "#16181c";
  g.fillRect(496, 96, 32, 832);
  g.fillRect(96, 496, 832, 32);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Текстура фандомата Sparklo & QAZAQGAZ («Таза Қазақстан», фото 04). */
function makeSparkloTex() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 512;
  const g = c.getContext("2d");
  // Верх зелёный, низ бирюзово-синий
  g.fillStyle = "#20a856";
  g.fillRect(0, 0, 256, 224);
  g.fillStyle = "#1482c8";
  g.fillRect(0, 224, 256, 288);

  // Экран с бутылкой слева вверху
  g.fillStyle = "#f2f8ff";
  g.fillRect(20, 44, 108, 128);
  g.fillStyle = "#2268d6";
  g.fillRect(58, 72, 32, 80);
  g.fillRect(66, 58, 16, 16);

  // Круглое светящееся окно приёма бутылок справа вверху
  g.strokeStyle = "#88ffaa";
  g.lineWidth = 14;
  g.beginPath(); g.arc(192, 108, 34, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#0e2218";
  g.beginPath(); g.arc(192, 108, 25, 0, Math.PI * 2); g.fill();

  // Логотипы Sparklo & QAZAQGAZ
  g.fillStyle = "#ffffff";
  g.font = "800 24px 'Segoe UI', Arial, sans-serif";
  g.textAlign = "left";
  g.fillText("Sparklo &", 22, 258);
  g.font = "800 18px 'Segoe UI', Arial, sans-serif";
  g.fillStyle = "#b8f4ff";
  g.fillText("QAZAQGAZ", 140, 256);

  // Плакат Таза Қазақстан
  g.fillStyle = "#e8f8f0";
  g.fillRect(20, 322, 216, 48);
  g.fillStyle = "#105832";
  g.font = "700 15px 'Segoe UI', Arial, sans-serif";
  g.textAlign = "center";
  g.fillText("ҚҰМЫРАЛАР МЕН БӨТЕЛКЕЛЕРДІ", 128, 342);
  g.fillText("ҚАЙТА ӨҢДЕУГЕ ТАПСЫРЫҢЫЗ!", 128, 360);

  g.fillStyle = "#ffd54f";
  g.font = "800 28px 'Segoe UI', Arial, sans-serif";
  g.textAlign = "left";
  g.fillText("Таза", 24, 416);
  g.font = "700 18px 'Segoe UI', Arial, sans-serif";
  g.fillText("Қазақстан", 24, 438);
  g.fillStyle = "#ffffff";
  g.font = "800 22px 'Segoe UI', Arial, sans-serif";
  g.fillText("Sparklo", 24, 482);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Текстура банкомата ForteBank (маджента с бирюзовым узором, фото 04). */
function makeForteAtmTex() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#d41e6b";
  g.fillRect(0, 0, 256, 512);
  // Бирюзовый орнамент Forte
  g.strokeStyle = "#1cb5d8";
  g.lineWidth = 18;
  g.beginPath(); g.arc(96, 360, 44, 0, Math.PI * 1.6); g.stroke();
  g.beginPath(); g.arc(160, 390, 40, Math.PI * 0.4, Math.PI * 2.1); g.stroke();
  // Чёрная консоль экрана сверху
  g.fillStyle = "#14161a";
  g.fillRect(24, 34, 208, 178);
  g.fillStyle = "#3a4c5e";
  g.fillRect(44, 52, 168, 92);
  g.fillStyle = "#32e875";
  g.fillRect(172, 162, 34, 14);
  // Лого ForteBank
  g.fillStyle = "#ffffff";
  g.font = "800 32px 'Segoe UI', Arial, sans-serif";
  g.textAlign = "center";
  g.fillText("ForteBank", 128, 258);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Текстура брендированных вывесок (внутри MEGA, QazaqGaz, Cafe, Market). */
function makeInteriorSignTex(title, { w = 512, h = 128, bg = "#11161f", fg = "#ffffff", accent = "#00f5ff", emblem = false } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = accent;
  g.lineWidth = 4;
  g.strokeRect(4, 4, w - 8, h - 8);
  if (emblem) {
    // Голубое пламя QazaqGaz
    g.fillStyle = "#00b4ff";
    g.beginPath();
    g.moveTo(74, 22);
    g.bezierCurveTo(106, 54, 108, 96, 74, 108);
    g.bezierCurveTo(40, 96, 42, 54, 74, 22);
    g.fill();
    g.fillStyle = "#e8fbff";
    g.beginPath();
    g.moveTo(74, 52);
    g.bezierCurveTo(90, 68, 90, 92, 74, 100);
    g.bezierCurveTo(58, 92, 58, 68, 74, 52);
    g.fill();
  }
  g.fillStyle = fg;
  g.textAlign = emblem ? "left" : "center";
  g.textBaseline = "middle";
  let fs = Math.round(h * 0.48);
  g.font = `800 ${fs}px 'Segoe UI', Arial, sans-serif`;
  while (g.measureText(title).width > w - (emblem ? 160 : 48) && fs > 18) {
    fs -= 4;
    g.font = `800 ${fs}px 'Segoe UI', Arial, sans-serif`;
  }
  g.fillText(title, emblem ? 128 : w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 6;
  return t;
}

/** Текстура потолочной HVAC-решётки и LED-светильника. */
function makeVentTex() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#d8dce0";
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "#8a929a";
  g.lineWidth = 4;
  g.strokeRect(4, 4, 120, 120);
  g.fillStyle = "#525860";
  for (let y = 18; y < 112; y += 10) g.fillRect(16, y, 96, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Текстура полок магазина (Magnum Express). */
function makeShelfGoodsTex() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#e8ecef";
  g.fillRect(0, 0, 256, 256);
  const cols = ["#e53935", "#1e88e5", "#43a047", "#fb8c00", "#fdd835", "#8e24aa", "#00acc1"];
  for (let row = 0; row < 4; row++) {
    const sy = 16 + row * 60;
    g.fillStyle = "#485058";
    g.fillRect(4, sy + 44, 248, 6);
    for (let x = 10; x < 236; x += 22) {
      g.fillStyle = cols[(row * 7 + Math.floor(x / 22)) % cols.length];
      g.fillRect(x, sy + 8 + ((x * 3) % 12), 16, 36 - ((x * 3) % 12));
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Подсвеченная текстура интерьерной витрины бутика (MEGA Silk Way). */
function makeShopDisplayTex(bgHex, accentHex) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 192;
  const g = c.getContext("2d");
  const bg = g.createLinearGradient(0, 0, 0, 192);
  bg.addColorStop(0, "#1c2028");
  bg.addColorStop(0.55, bgHex || "#242934");
  bg.addColorStop(1, "#12151b");
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 192);

  // Тёплые конусы акцентных софитов на задней стене бутика
  for (let x = 56; x <= 456; x += 80) {
    const spot = g.createRadialGradient(x, 22, 4, x, 92, 92);
    spot.addColorStop(0, "rgba(255, 238, 205, 0.48)");
    spot.addColorStop(0.55, "rgba(255, 214, 155, 0.14)");
    spot.addColorStop(1, "rgba(0, 0, 0, 0)");
    g.fillStyle = spot;
    g.fillRect(x - 90, 0, 180, 192);
  }
  // Тёплая горизонтальная полка и подиум
  g.fillStyle = "#2b2f38";
  g.fillRect(0, 154, 512, 38);
  g.fillStyle = accentHex || "#f2c17d";
  g.fillRect(24, 152, 464, 3);
  // Силуэты витринных стеллажей и подиумов с товаром
  for (let i = 0; i < 6; i++) {
    const px = 42 + i * 78;
    g.fillStyle = "rgba(235, 228, 216, 0.22)";
    g.fillRect(px, 44, 48, 96);
    g.fillStyle = "rgba(255, 240, 214, 0.72)";
    g.fillRect(px + 6, 72, 36, 3);
    g.fillRect(px + 6, 108, 36, 3);
    g.fillStyle = "#3a404c";
    g.fillRect(px + 10, 126, 28, 28);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export async function buildInteriors(scene, M, _ctx) {
  const group = new THREE.Group();
  group.name = "walkable-interiors";
  scene.add(group);

  const [
    escalatorModel,
    speedgateModel,
    officerModel,
    plantModel,
    sofaModel,
    armchairModel,
    tableModel,
  ] = await Promise.all([
    loadModelParts("./assets/models/escalator.glb", { groundY: false }),
    loadModelParts("./assets/models/speedgate.glb", { groundY: true }),
    loadModelParts("./assets/models/officer.glb", { groundY: false, scale: 1.20 }),
    loadModelParts("./assets/models/potted_plant_04.glb", { groundY: true }),
    loadModelParts("./assets/models/sofa_03.glb", { groundY: true }),
    loadModelParts("./assets/models/armchair_01.glb", { groundY: true }),
    loadModelParts("./assets/models/coffeetable_01.glb", { groundY: true }),
  ]);
  // В исходном escalator.glb ступени (EscTread) развёрнуты по Z относительно балюстрад — выравниваем по оси подъёма
  for (const part of escalatorModel.parts) {
    if (part.name === "EscTread") {
      part.geometry.rotateY(Math.PI);
      part.geometry.computeBoundingBox();
      part.geometry.computeBoundingSphere();
    }
  }

  const prepInteriorMat = (name, mat) => {
    const m = mat.clone();
    if (name === "EscGlass") {
      m.transparent = true;
      m.opacity = 0.44;
      m.roughness = 0.08;
    } else if (/plant/i.test(name)) {
      m.transparent = false;
      m.alphaTest = 0.25;
      m.side = THREE.DoubleSide;
      m.roughness = Math.max(0.55, m.roughness ?? 0.72);
    }
    M.setup(m);
    return m;
  };

  const trouserGeo = new THREE.CylinderGeometry(0.10, 0.082, 0.64, 10);
  const shoeGeo = new THREE.BoxGeometry(0.14, 0.08, 0.26);
  const trouserMat = M.std({ color: 0x182132, roughness: 0.78, metalness: 0.04 });
  const shoeMat = M.std({ color: 0x111317, roughness: 0.42, metalness: 0.08 });
  const makeOfficer = (x, y, z, yaw = 0) => {
    const root = new THREE.Group();
    const upper = instantiateModelGroup(officerModel, prepInteriorMat);
    root.add(upper);
    for (const sx of [-0.105, 0.105]) {
      const leg = new THREE.Mesh(trouserGeo, trouserMat);
      leg.position.set(sx, 0.38, 0);
      leg.castShadow = true;
      leg.receiveShadow = true;
      root.add(leg);
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(sx, 0.04, 0.04);
      shoe.castShadow = true;
      root.add(shoe);
    }
    root.position.set(x, y, z);
    root.rotation.y = yaw;
    return root;
  };

  const placeModel = (modelData, x, y, z, yaw = 0, scale = 1) => {
    const inst = instantiateModelGroup(modelData, prepInteriorMat);
    inst.position.set(x, y, z);
    inst.rotation.y = yaw;
    if (scale !== 1) inst.scale.setScalar(scale);
    return inst;
  };

  const colliders = [];
  const entrances = [];

  const pushBox = (x, y, z, w, h, d, yaw = 0) => {
    colliders.push({ x, y, z, w, h, d, yaw });
  };

  // Общие материалы интерьеров (реальные PBR-текстуры M.travertine, M.marble, M.walnut)
  const whiteWallMat = M.travertine;
  const beigeMarbleMat = M.marble;
  const darkWoodMat = M.walnut;
  const warmWoodMat = M.walnut;
  const ledCeilMat = M.std({ color: 0xffffff, emissive: new THREE.Color(0xfff4de), emissiveIntensity: 1.45, roughness: 0.18 });
  const ledAccentMat = M.std({ color: 0xffe4b8, emissive: new THREE.Color(0xffc978), emissiveIntensity: 1.25, roughness: 0.2 });
  const ventMat = M.std({ map: makeVentTex(), roughness: 0.4, metalness: 0.5 });

  // ============================================================
  // 1. QAZAQGAZ HQ LOBBY (x: 235, z: 155)
  // ============================================================
  {
    const qx = LANDMARKS.qazaqGaz.x, qz = LANDMARKS.qazaqGaz.z; // 235, 155
    const qg = new THREE.Group();
    qg.position.set(qx, 0, qz);
    qg.name = "interior-qazaqgaz";
    group.add(qg);

    // Пол: глянцевый мрамор с чёрными полосами (y = 0.54)
    const floorTex = makeQGMarbleFloorTex();
    const floorMat = M.phys({
      map: floorTex, roughness: 0.16, metalness: 0.06, clearcoat: 0.75, clearcoatRoughness: 0.12, envMapIntensity: 1.1,
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(40.5, 0.12, 33.5), floorMat);
    floor.position.set(0, 0.50, 0.2);
    floor.receiveShadow = true;
    qg.add(floor);
    const vestFloor = new THREE.Mesh(new THREE.BoxGeometry(17.4, 0.12, 4.6), floorMat);
    vestFloor.position.set(0, 0.50, 19.2);
    vestFloor.receiveShadow = true;
    qg.add(vestFloor);

    // Потолок (y = 4.65) + белые стены внутреннего холла + бежевые мраморные колонны
    const whiteGeos = [], beigeGeos = [], darkWoodGeos = [], warmWoodGeos = [], chromeGeos = [], glassGeos = [], ledGeos = [], ventGeos = [];
    {
      const BW = new GB(), BB = new GB(), BD = new GB(), BWW = new GB(), BC = new GB(), BG = new GB(), BL = new GB(), BV = new GB();

      // Потолок вестибюля
      BW.box(0, 4.68, 0, 40.5, 0.18, 33.5, 0);
      // Внутренние белые стены (задняя перегородка холла с проходом в лифтовый коридор слева!)
      BW.box(-16.5, 2.6, -10.2, 7.0, 4.1, 0.4, 0);
      BW.box(-1.5, 2.6, -10.2, 16.5, 4.1, 0.4, 0);
      BW.box(+16.0, 2.6, -10.2, 8.0, 4.1, 0.4, 0);
      // Глубокий коридор позади двойных дверей (z = -15.5..-10.2)
      BW.box(-11.0, 2.6, -15.2, 14.0, 4.1, 0.4, 0);
      BW.box(0, 4.65, -12.8, 40, 0.18, 5.2, 0);

      // Бежевые мраморные колонны по краям вестибюля (фото 04 слева!)
      for (const [cx, cz] of [[-12.5, 6.0], [+12.5, 6.0], [-10.0, -3.5], [+10.0, -3.5], [-19.2, 6.0], [+19.2, 6.0]]) {
        BB.box(cx, 2.6, cz, 1.35, 4.1, 1.35, 0);
      }

      // ★ Тёмно-коричневые шевронно-резные деревянные двойные двери + хромовые V-ручки (фото 04 слева!) ★
      BD.box(-11.4, 2.3, -10.2, 0.3, 3.6, 0.6, 0); // наличник лев
      BD.box(-8.6, 2.3, -10.2, 0.3, 3.6, 0.6, 0);  // наличник прав
      BD.box(-10.0, 4.0, -10.2, 3.1, 0.3, 0.6, 0); // притолока
      // Приоткрытая левая створка и закрытая правая (с шевронными рейками)
      BD.box(-10.8, 2.25, -9.8, 1.25, 3.3, 0.12, -0.55);
      BD.box(-9.25, 2.25, -10.2, 1.25, 3.3, 0.12, 0);
      // Задняя дверь в глубине коридора
      BD.box(-10.0, 2.25, -14.9, 2.2, 3.3, 0.14, 0);
      // Хромированные V-образные ручки
      BC.box(-10.35, 1.9, -9.45, 0.08, 0.45, 0.08, 0.4);
      BC.box(-9.65, 1.9, -10.05, 0.08, 0.45, 0.08, -0.4);

      // ★ Горизонтальная деревянная реечная акцент-стена справа (фото 04 справа!) ★
      BB.box(+8.5, 2.6, -10.0, 9.2, 4.0, 0.16, 0);
      for (let sy = 1.45; sy <= 3.95; sy += 0.24) {
        BD.box(+8.8, sy, -9.86, 8.4, 0.12, 0.14, 0);
      }

      // ★ Мраморная ресепшен-стойка QazaqGaz + тёплая LED-подсветка цоколя (по центру z = -3.8) ★
      BB.box(-1.5, 1.12, -3.8, 6.8, 1.15, 1.2, 0);
      BD.box(-1.5, 1.72, -3.8, 7.1, 0.10, 1.35, 0);
      BWW.box(-1.5, 1.12, -3.15, 5.2, 0.85, 0.12, 0);
      BL.box(-1.5, 0.62, -3.16, 6.4, 0.06, 0.08, 0);

      // ★ Стеклянные створки турникетов (сами тумбы из speedgate.glb!) ★
      for (let tx = -7.2; tx <= -1.2; tx += 1.5) {
        if (tx < -1.3) BG.box(tx + 0.75, 1.02, -7.2, 1.1, 0.82, 0.04, 0);
      }

      // ★ Лифтовые двери на восточной стене (+X, x = +19.6) ★
      for (const ez of [-4.0, 0, +4.0]) {
        BC.box(19.5, 2.0, ez, 0.15, 2.9, 2.4, 0);
        BD.box(19.38, 3.65, ez, 0.18, 0.35, 1.2, 0);
      }

      // ★ Линейные и точечные LED-светильники + квадратные HVAC-решётки на потолке ★
      for (let lx = -14; lx <= 14; lx += 7) {
        BL.box(lx, 4.58, -1.5, 0.18, 0.06, 16.0, 0);
        for (let lz = -6; lz <= 12; lz += 6) {
          BL.box(lx, 4.58, lz, 0.55, 0.06, 0.55, 0);
          BV.box(lx + 3.0, 4.58, lz + 1.5, 0.85, 0.05, 0.85, 0);
        }
      }

      whiteGeos.push(BW.build());
      beigeGeos.push(BB.build());
      darkWoodGeos.push(BD.build());
      warmWoodGeos.push(BWW.build());
      chromeGeos.push(BC.build());
      glassGeos.push(BG.build());
      ledGeos.push(BL.build());
      ventGeos.push(BV.build());
    }

    // ★ Лаунж-зона из реальных GLB (sofa_03, armchair_01, coffeetable_01, y = 0.56) ★
    qg.add(placeModel(sofaModel, -14.8, 0.56, +7.5, Math.PI / 2));
    qg.add(placeModel(armchairModel, -12.6, 0.56, +10.2, Math.PI));
    qg.add(placeModel(armchairModel, -12.6, 0.56, +4.8, 0));
    qg.add(placeModel(tableModel, -12.6, 0.56, +7.5, Math.PI / 2));

    // Живые декоративные растения в кашпо (potted_plant_04.glb)
    for (const [px, pz] of [[-16.8, -8.5], [+16.8, +14.0], [-6.2, +14.0], [+6.2, +14.0]]) {
      qg.add(placeModel(plantModel, px, 0.56, pz, px * 0.7, 4.8));
    }

    // ★ Сдержанный киоск Sparklo & QAZAQGAZ (корпус из тёмного матового металла) ★
    const sparkMat = M.std({ map: makeSparkloTex(), emissiveMap: makeSparkloTex(), emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.22, roughness: 0.34 });
    const sparkCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.92, 0.64), M.darkMetal);
    sparkCabinet.position.set(+6.4, 1.52, -9.2);
    sparkCabinet.castShadow = true;
    qg.add(sparkCabinet);
    const sparkFront = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.56), sparkMat);
    sparkFront.position.set(+6.4, 1.54, -8.87);
    qg.add(sparkFront);

    // ★ Банкомат ForteBank (корпус из шлифованной стали) ★
    const forteMat = M.std({ map: makeForteAtmTex(), emissiveMap: makeForteAtmTex(), emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.22, roughness: 0.34 });
    const forteCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.72, 0.62), M.steel);
    forteCabinet.position.set(+8.0, 1.42, -9.2);
    forteCabinet.castShadow = true;
    qg.add(forteCabinet);
    const forteFront = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.38), forteMat);
    forteFront.position.set(+8.0, 1.44, -8.88);
    qg.add(forteFront);

    // ★ Подсвеченный настенный логотип QAZAQGAZ за ресепшеном ★
    const qgLogoTex = makeInteriorSignTex("QAZAQGAZ", { w: 512, h: 128, bg: "#0e223d", fg: "#ffffff", accent: "#00c8ff", emblem: true });
    const qgLogoMat = M.std({ map: qgLogoTex, emissiveMap: qgLogoTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.85, roughness: 0.22 });
    const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.2), qgLogoMat);
    logoMesh.position.set(-1.5, 2.95, -9.96);
    qg.add(logoMesh);

    // Реальные speedgate.glb турникеты + дежурный офицер безопасности в полный рост (y = 0.56)
    for (let tx = -7.2; tx <= -1.2; tx += 1.5) {
      const sg = instantiateModelGroup(speedgateModel, prepInteriorMat);
      sg.position.set(tx, 0.56, -7.2);
      qg.add(sg);
    }
    qg.add(makeOfficer(3.4, 0.56, -4.4, 0));

    // Точечные тёплый интерьерный свет + акцентные пулы у ресепшена и диванов
    for (const [lx, ly, lz, inten, dist] of [
      [0, 4.1, 2.0, 18, 36],
      [-1.5, 3.8, -4.5, 12, 18],
      [-12.8, 3.8, 7.5, 10, 16],
    ]) {
      const ql = new THREE.PointLight(0xffedd0, inten, dist, 1.4);
      ql.position.set(lx, ly, lz);
      qg.add(ql);
    }

    addMerged(qg, whiteGeos, whiteWallMat);
    addMerged(qg, beigeGeos, beigeMarbleMat);
    addMerged(qg, darkWoodGeos, darkWoodMat);
    addMerged(qg, warmWoodGeos, warmWoodMat);
    addMerged(qg, chromeGeos, M.chrome);
    addMerged(qg, glassGeos, M.glassClear, false, false);
    addMerged(qg, ledGeos, ledCeilMat, false, false);
    addMerged(qg, ventGeos, ventMat, false, false);

    // ── Коллайдеры QazaqGaz (ПОЛЫЕ стены с открытым проёмом ±2.2 м на юге + верх башни y >= 5.6!) ──
    pushBox(qx - 21.2, 0, qz, 1.8, 10, 35);        // левая стена 1 этажа
    pushBox(qx + 21.2, 0, qz, 1.8, 10, 35);        // правая стена 1 этажа
    pushBox(qx, 0, qz - 16.8, 44, 10, 1.8);        // задняя стена
    // Южная стена с ОТКРЫТЫМ проёмом x = [232.8 .. 237.2] (центр 235 ± 2.2)
    pushBox(qx - 12.1, 0, qz + 17.3, 19.8, 10, 1.6);
    pushBox(qx + 12.1, 0, qz + 17.3, 19.8, 10, 1.6);
    // Стеклянный тамбур-вестибюль с открытым проёмом ±2.2 м
    pushBox(qx - 8.8, 0, qz + 19.4, 0.6, 5.2, 4.4);
    pushBox(qx + 8.8, 0, qz + 19.4, 0.6, 5.2, 4.4);
    pushBox(qx - 5.5, 0, qz + 21.35, 6.6, 5.2, 0.6);
    pushBox(qx + 5.5, 0, qz + 21.35, 6.6, 5.2, 0.6);
    // Верхний объём башни (выше потолка вестибюля, чтобы можно было ходить внутри и не пролетать сквозь этажи)
    pushBox(qx, 5.6, qz, 42.6, 82, 34.4);
    // Внутренние элементы
    pushBox(qx - 1.5, 0.5, qz - 3.8, 7.0, 2.0, 1.4); // ресепшен
    pushBox(qx + 7.2, 0.5, qz - 9.2, 3.2, 2.5, 1.1); // Sparklo + ForteBank
    pushBox(qx - 14.8, 0.5, qz + 7.5, 1.0, 1.2, 2.8); // диван sofa_03.glb

    entrances.push({
      id: "qazaqgaz",
      label: "QazaqGaz HQ Lobby",
      doorwayPos: new THREE.Vector3(qx, 1.8, qz + 21.4),
      insidePos: [qx, 2.29, qz + 15.5],
      insideLook: [qx, 2.29, qz - 4.0],
      outsidePos: [qx, 1.75, qz + 26.5],
      outsideLook: [qx, 4.5, qz + 10.0],
      bounds: { x0: qx - 20, x1: qx + 20, z0: qz - 16, z1: qz + 18, yMax: 5.2 },
    });
  }

  // ============================================================
  // 2. MEGA SILK WAY 2-LEVEL GALLERIA (x: -180, z: +940)
  // 2 этажа, центральный фонтан, эскалаторы на y=+7 м, 14 магазинов, фуд-корт!
  // ============================================================
  const mx = LANDMARKS.megaSilkWay.x, mz = LANDMARKS.megaSilkWay.z; // -180, 940
  {
    const mg = new THREE.Group();
    mg.position.set(mx, 0, mz);
    mg.name = "interior-megasilkway";
    group.add(mg);

    const floor1Geos = [], floor2Geos = [], wallGeos = [], railGlassGeos = [], chromeGeos = [], woodGeos = [], darkGeos = [], waterGeos = [], megaLedGeos = [], megaAwningGeos = [];
    const BF1 = new GB(), BF2 = new GB(), BW = new GB(), BRG = new GB(), BC = new GB(), BWood = new GB(), BD = new GB(), BML = new GB(), BMA = new GB();

    // 1F тераццо-пол (236 × 101 м, y = 0.30)
    BF1.box(0, 0.15, 0, 236, 0.30, 101, 0);

    // 2F галереи-балконы (y = 7.0 м) вокруг центрального атриума (x = -56..+56, z = -17..+17 открытый проём вверх!)
    BF2.box(-87, 6.75, 0, 62, 0.50, 100, 0);  // Западное крыло 2F (x = -118..-56)
    BF2.box(+87, 6.75, 0, 62, 0.50, 100, 0);  // Восточное крыло 2F (x = +56..+118)
    BF2.box(0, 6.75, -33.5, 112, 0.50, 33, 0); // Северная галерея 2F (z = -50..-17)
    BF2.box(0, 6.75, +33.5, 112, 0.50, 33, 0); // Южная галерея 2F (z = +17..+50)

    // Два сдвоенных реальных эскалатора escalator.glb с 1F (y=0.3) на 2F (y=7.0):
    //   Северный (z = -11.2, -8.8): поднимается с x=-34 (1F) на x=-56 (2F запад)
    //   Южный   (z = +8.8, +11.2): поднимается с x=+34 (1F) на x=+56 (2F восток)
    const escScaleZ = 22.0 / 11.42;
    for (const ez of [-11.2, -8.8]) {
      const escN = instantiateModelGroup(escalatorModel, prepInteriorMat);
      escN.position.set(-45, 0.30, ez);
      escN.rotation.y = -Math.PI / 2;
      escN.scale.set(1.18, 1.0, escScaleZ);
      mg.add(escN);
    }
    for (const ez of [8.8, 11.2]) {
      const escS = instantiateModelGroup(escalatorModel, prepInteriorMat);
      escS.position.set(45, 0.30, ez);
      escS.rotation.y = Math.PI / 2;
      escS.scale.set(1.18, 1.0, escScaleZ);
      mg.add(escS);
    }
    mg.add(makeOfficer(104, 0.30, 6.2, Math.PI / 2));

    // Стеклянные ограждения 2-го этажа по периметру атриума (y = 7.0..8.2)
    BRG.box(0, 7.6, -17.0, 112, 1.15, 0.08, 0);
    BRG.box(0, 7.6, +17.0, 112, 1.15, 0.08, 0);
    // Западный и восточный край с проёмами под эскалаторы (ширина 6 м у эскалаторов оставлена открытой!)
    BRG.box(-56.0, 7.6, +4.5, 0.08, 1.15, 25.0, 0);  // запад (z=-8..+17, проём z=-13..-7 открыт)
    BRG.box(-56.0, 7.6, -15.0, 0.08, 1.15, 4.0, 0);
    BRG.box(+56.0, 7.6, -4.5, 0.08, 1.15, 25.0, 0);  // восток (z=-17..+7, проём z=+7..+13 открыт)
    BRG.box(+56.0, 7.6, +15.0, 0.08, 1.15, 4.0, 0);
    BC.box(0, 8.2, -17.0, 112, 0.08, 0.12, 0);
    BC.box(0, 8.2, +17.0, 112, 0.08, 0.12, 0);

    // Центральный фонтан в атриуме (x=0, z=0)
    BW.box(0, 0.65, 0, 15, 0.70, 15, 0);
    waterGeos.push(new THREE.CylinderGeometry(6.4, 6.4, 0.25, 28).translate(0, 0.92, 0));
    BC.box(0, 2.2, 0, 1.2, 2.8, 1.2, 0);

    // Внутренние деревья, деревянные лавочки и урны вдоль променада 1F
    for (const bx of [-88, -62, -24, +24, +62, +88]) {
      for (const sz of [-1, 1]) {
        const zP = sz * 13.5;
        BWood.box(bx, 0.62, zP, 2.8, 0.10, 0.65, 0);
        BD.box(bx - 1.2, 0.48, zP, 0.12, 0.36, 0.60, 0);
        BD.box(bx + 1.2, 0.48, zP, 0.12, 0.36, 0.60, 0);
        BC.box(bx + 2.1, 0.68, zP, 0.42, 0.76, 0.42, 0); // урна
      }
    }
    for (const [tx, tz] of [[-74, -14], [-74, +14], [-14, -14], [-14, +14], [+14, -14], [+14, +14], [+74, -14], [+74, +14]]) {
      BW.box(tx, 0.55, tz, 2.0, 0.50, 2.0, 0);
      mg.add(placeModel(plantModel, tx, 0.80, tz, (tx + tz) * 0.35, 6.2));
    }
    for (const lx of [-76, +76]) {
      mg.add(placeModel(sofaModel, lx - 2.6, 0.30, 0, Math.PI / 2));
      mg.add(placeModel(sofaModel, lx + 2.6, 0.30, 0, -Math.PI / 2));
      mg.add(placeModel(tableModel, lx, 0.30, 0, 0));
      mg.add(placeModel(armchairModel, lx, 0.30, +2.6, Math.PI));
    }

    // 14+ светящихся магазинов на 1-м и 2-м этажах (вдоль Северной и Южной стен)
    const megaShops = [
      "ZARA", "NIKE", "iSPACE APPLE", "SAMSUNG", "ADIDAS", "STARBUCKS", "MARWIN",
      "MANGO", "LC WAIKIKI", "CINEMAX", "QAZAQ REPUBLIC", "SPORTMASTER", "KIMEX", "COFFEE BOOM",
    ];
    const shopCols = ["#151b26", "#111", "#1e2736", "#142850", "#101010", "#006241", "#7b1fa2", "#222", "#004e92", "#8e0e00", "#0d3b66", "#1b4332", "#3a1c71", "#4a2511"];
    for (let i = 0; i < 14; i++) {
      const row = i < 7 ? -1 : 1;
      const colIdx = i % 7;
      const sx = -84 + colIdx * 28;
      // Пропуск у северного открытого входа (row === -1 && colIdx === 3 -> x=0)
      const isNorthEntrance = (row === -1 && colIdx === 3);
      const dispTex = makeShopDisplayTex(shopCols[i], i % 2 === 0 ? "#f2c17d" : "#80d8ff");
      const dispMat = M.std({
        map: dispTex,
        emissiveMap: dispTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.72,
        roughness: 0.35,
      });
      for (const fl of [0, 1]) {
        if (isNorthEntrance && fl === 0) continue;
        const yBase = fl === 0 ? 0.30 : 7.0;
        const zWall = row * 48.0;
        const zFace = row * 41.2;
        const yawFace = row === -1 ? 0 : Math.PI;
        // Перегородки магазина (травертин) + витринное стекло + подсвеченная глубина + маркиза
        BW.box(sx - 13.5, yBase + 2.6, (zWall + zFace) * 0.5, 0.45, 5.2, 13.6, 0);
        BW.box(sx + 13.5, yBase + 2.6, (zWall + zFace) * 0.5, 0.45, 5.2, 13.6, 0);
        BW.box(sx, yBase + 4.4, zFace, 26.8, 1.4, 0.35, 0);
        BRG.box(sx, yBase + 1.85, zFace, 24.8, 3.6, 0.06, 0);
        BMA.box(sx, yBase + 3.45, zFace - row * 0.85, 22.0, 0.16, 1.6, 0);
        BML.box(sx, yBase + 3.35, zFace - row * 0.45, 16.0, 0.06, 0.14, 0);

        const dispMesh = new THREE.Mesh(new THREE.PlaneGeometry(24.6, 3.55), dispMat);
        dispMesh.position.set(sx, yBase + 1.85, zFace + row * 1.15);
        dispMesh.rotation.y = yawFace;
        mg.add(dispMesh);

        // Светящаяся вывеска магазина
        const stTex = makeInteriorSignTex(megaShops[i], {
          w: 512, h: 96, bg: shopCols[i], fg: "#ffffff", accent: fl === 0 ? "#00f5ff" : "#ffb347",
        });
        const stMat = M.std({ map: stTex, emissiveMap: stTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.95, roughness: 0.25 });
        const sm = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 2.4), stMat);
        sm.position.set(sx, yBase + 4.4, zFace - row * 0.22);
        sm.rotation.y = yawFace;
        mg.add(sm);
      }
    }

    // Фуд-корт на 2-м этаже (Западное крыло x = -102..-68, z = -34..+34, y = 7.0)
    for (let fy = -22; fy <= 22; fy += 11) {
      for (let fx = -96; fx <= -72; fx += 12) {
        BWood.box(fx, 7.75, fy, 1.5, 0.08, 1.5, 0);
        BD.box(fx, 7.38, fy, 0.18, 0.72, 0.18, 0);
        BWood.box(fx - 1.1, 7.45, fy, 0.5, 0.08, 0.5, 0);
        BWood.box(fx + 1.1, 7.45, fy, 0.5, 0.08, 0.5, 0);
      }
    }

    // Линейные потолочные светильники 1F (под перекрытием 2F) и 2F + акцентные пулы света
    for (let lx = -84; lx <= 84; lx += 28) {
      BML.box(lx, 6.46, -24, 18.0, 0.06, 0.22, 0);
      BML.box(lx, 6.46, +24, 18.0, 0.06, 0.22, 0);
      BML.box(lx, 15.8, -28, 18.0, 0.08, 0.28, 0);
      BML.box(lx, 15.8, +28, 18.0, 0.08, 0.28, 0);
    }
    for (const [lx, ly, lz, col, inten, dist] of [
      [-65, 15.5, 0, 0xfff5e4, 42, 120],
      [0, 15.5, 0, 0xfff5e4, 48, 125],
      [65, 15.5, 0, 0xfff5e4, 42, 120],
      [-84, 11.8, 0, 0xffdfb0, 26, 65],
    ]) {
      const ml = new THREE.PointLight(col, inten, dist, 1.2);
      ml.position.set(lx, ly, lz);
      mg.add(ml);
    }

    floor1Geos.push(BF1.build());
    floor2Geos.push(BF2.build());
    wallGeos.push(BW.build());
    railGlassGeos.push(BRG.build());
    chromeGeos.push(BC.build());
    woodGeos.push(BWood.build());
    darkGeos.push(BD.build());
    megaLedGeos.push(BML.build());
    megaAwningGeos.push(BMA.build());

    addMerged(mg, floor1Geos, M.graniteLight);
    addMerged(mg, floor2Geos, M.marble);
    addMerged(mg, wallGeos, whiteWallMat);
    addMerged(mg, railGlassGeos, M.glassClear, false, false);
    addMerged(mg, chromeGeos, M.chrome);
    addMerged(mg, woodGeos, warmWoodMat);
    addMerged(mg, darkGeos, M.darkMetal);
    addMerged(mg, waterGeos, M.turquoise, false, false);
    addMerged(mg, megaLedGeos, ledCeilMat, false, false);
    addMerged(mg, megaAwningGeos, M.std({ color: 0x1e2836, roughness: 0.55, metalness: 0.25 }), true, true);

    // ── Коллайдеры MEGA Silk Way (ПОЛЫЕ периметровые стены с открытыми Восточным и Северным входами) ──
    const hw = 120, hd = 52.5;
    pushBox(mx, 0, mz + hd - 0.8, 240, 16.5, 1.8);      // Южная глухая стена
    pushBox(mx - hw + 0.8, 0, mz, 1.8, 16.5, 105);      // Западная глухая стена
    // Северная стена (проём x = mx-7 .. mx+7 открыт!)
    pushBox(mx - 63.5, 0, mz - hd + 0.8, 113, 16.5, 1.8);
    pushBox(mx + 63.5, 0, mz - hd + 0.8, 113, 16.5, 1.8);
    // Восточная стена (проём z = mz-8 .. mz+8 открыт!)
    pushBox(mx + hw - 0.8, 0, mz - 30.25, 1.8, 16.5, 44.5);
    pushBox(mx + hw - 0.8, 0, mz + 30.25, 1.8, 16.5, 44.5);
    // Ограждения балкона 2F (высота y = 7.0 .. 8.35 — с проёмами к эскалаторам!)
    pushBox(mx, 7.0, mz - 17.0, 112, 1.35, 0.5);
    pushBox(mx, 7.0, mz + 17.0, 112, 1.35, 0.5);
    pushBox(mx - 56.0, 7.0, mz + 4.5, 0.5, 1.35, 25.0);
    pushBox(mx - 56.0, 7.0, mz - 15.0, 0.5, 1.35, 4.0);
    pushBox(mx + 56.0, 7.0, mz - 4.5, 0.5, 1.35, 25.0);
    pushBox(mx + 56.0, 7.0, mz + 15.0, 0.5, 1.35, 4.0);
    // Центральный фонтан 1F
    pushBox(mx, 0.3, mz, 15, 2.0, 15);
    // Крыша MEGA (выше уровня 2F + 1.75!)
    pushBox(mx, 16.5, mz, 240, 8.0, 105);

    entrances.push({
      id: "megaSilkWayEast",
      label: "MEGA Silk Way (Восточный вход)",
      doorwayPos: new THREE.Vector3(mx + 120, 1.8, mz),
      insidePos: [mx + 108, 2.05, mz],
      insideLook: [mx, 4.5, mz],
      outsidePos: [mx + 132, 1.75, mz],
      outsideLook: [mx + 80, 6.0, mz],
      bounds: { x0: mx - 119, x1: mx + 119, z0: mz - 51, z1: mz + 51, yMax: 16.0 },
    });
    entrances.push({
      id: "megaSilkWayNorth",
      label: "MEGA Silk Way (Северный вход)",
      doorwayPos: new THREE.Vector3(mx, 1.8, mz - 52.5),
      insidePos: [mx, 2.05, mz - 42],
      insideLook: [mx, 4.0, mz],
      outsidePos: [mx, 1.75, mz - 62],
      outsideLook: [mx, 6.0, mz - 30],
      bounds: { x0: mx - 119, x1: mx + 119, z0: mz - 51, z1: mz + 51, yMax: 16.0 },
    });
  }

  // ============================================================
  // 3. BEIJING PALACE SOLUXE GRAND LOBBY (x: -240, z: +390)
  // Красно-золотые колонны, резной потолок, золотая люстра, бамбук
  // ============================================================
  {
    const bx = -240, bz = 390;
    const bg = new THREE.Group();
    bg.position.set(bx, 0, bz);
    bg.name = "interior-beijing";
    group.add(bg);

    const crimson = [], gold = [], wood = [], marble = [], bLed = [];
    const BC = new GB(), BG = new GB(), BW = new GB(), BM = new GB(), BL = new GB();

    // Мраморный пол холла
    BM.box(0, 0.22, 2.0, 29.0, 0.45, 34.5, 0);
    // Резной деревянный потолок с балками и встроенными downlight-светильниками (y = 6.3)
    BW.box(0, 6.4, 2.0, 29.0, 0.3, 34.5, 0);
    for (let gx = -12; gx <= 12; gx += 4) BW.box(gx, 6.15, 2.0, 0.4, 0.35, 34, 0);
    for (let gz = -12; gz <= 16; gz += 4) BW.box(0, 6.15, gz, 28, 0.35, 0.4, 0);
    for (const lx of [-10, -5, 0, 5, 10]) {
      for (const lz of [-8, 0, 8, 14]) BL.box(lx, 6.22, lz, 0.42, 0.06, 0.42, 0);
    }

    // Красные китайские колонны внутри лобби
    for (const sx of [-1, 1]) {
      for (const cz of [-6, 4, 13]) {
        crimson.push(new THREE.CylinderGeometry(0.48, 0.54, 5.8, 12).translate(sx * 9.0, 3.3, cz));
        gold.push(new THREE.CylinderGeometry(0.68, 0.72, 0.45, 12).translate(sx * 9.0, 0.65, cz));
        gold.push(new THREE.CylinderGeometry(0.68, 0.56, 0.55, 12).translate(sx * 9.0, 6.0, cz));
      }
    }

    // Гигантская золотая люстра-фонарь в центре холла
    gold.push(new THREE.CylinderGeometry(2.6, 2.6, 1.6, 16).translate(0, 5.2, 4.0));
    crimson.push(new THREE.CylinderGeometry(2.3, 2.3, 1.1, 16).translate(0, 5.2, 4.0));
    gold.push(new THREE.CylinderGeometry(1.5, 1.5, 1.2, 16).translate(0, 4.1, 4.0));

    // Мраморная стойка ресепшена Soluxe + тёплая подсветка + лаунж-зона GLB + растения
    BM.box(0, 1.05, -10.5, 9.5, 1.25, 1.4, 0);
    BW.box(0, 1.72, -10.5, 9.8, 0.12, 1.55, 0);
    BL.box(0, 0.52, -9.78, 9.2, 0.06, 0.08, 0);

    bg.add(placeModel(sofaModel, -5.5, 0.45, 6.0, Math.PI / 2));
    bg.add(placeModel(sofaModel, +5.5, 0.45, 6.0, -Math.PI / 2));
    bg.add(placeModel(tableModel, 0, 0.45, 6.0, 0));
    bg.add(placeModel(armchairModel, -2.8, 0.45, 8.8, Math.PI * 0.85));
    bg.add(placeModel(armchairModel, +2.8, 0.45, 8.8, -Math.PI * 0.85));

    for (const [px, pz] of [[-12, -11], [+12, -11], [-12, +16], [+12, +16]]) {
      gold.push(new THREE.CylinderGeometry(0.55, 0.48, 0.42, 16).translate(px, 0.66, pz));
      bg.add(placeModel(plantModel, px, 0.87, pz, px * 0.5, 5.2));
    }

    const soluxeTex = makeInteriorSignTex("BEIJING PALACE · SOLUXE", { w: 512, h: 112, bg: "#700c10", fg: "#ffd870", accent: "#ffb830" });
    const soluxeSign = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 1.6),
      M.std({ map: soluxeTex, emissiveMap: soluxeTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.9 })
    );
    soluxeSign.position.set(0, 3.2, -14.8);
    bg.add(soluxeSign);

    const bLight = new THREE.PointLight(0xffdfb0, 22, 34, 1.3);
    bLight.position.set(0, 5.2, 4.0);
    bg.add(bLight);
    const bDeskLight = new THREE.PointLight(0xffcf88, 12, 18, 1.4);
    bDeskLight.position.set(0, 4.4, -10.0);
    bg.add(bDeskLight);

    bg.add(makeOfficer(5.6, 0.45, -9.8, 0));

    crimson.push(BC.build());
    gold.push(BG.build());
    wood.push(BW.build());
    marble.push(BM.build());
    bLed.push(BL.build());

    addMerged(bg, marble, M.marble);
    addMerged(bg, crimson, M.std({ color: 0x9c1616, roughness: 0.35 }));
    addMerged(bg, gold, M.gold);
    addMerged(bg, wood, darkWoodMat);
    addMerged(bg, bLed, ledAccentMat, false, false);

    // ── Коллайдеры Beijing Palace (открытый южный проём x = bx ± 2.4!) ──
    pushBox(bx - 20.5, 0, bz, 11, 14, 40);
    pushBox(bx + 20.5, 0, bz, 11, 14, 40);
    pushBox(bx, 0, bz - 17.5, 30, 14, 5);
    pushBox(bx - 9.2, 0, bz + 19.6, 13.6, 7.0, 1.4);
    pushBox(bx + 9.2, 0, bz + 19.6, 13.6, 7.0, 1.4);
    pushBox(bx, 0.4, bz - 10.5, 9.6, 2.0, 1.5); // ресепшен
    // Верх башни Beijing Palace (y >= 7.0)
    pushBox(bx, 7.0, bz, 54, 108, 44);

    entrances.push({
      id: "beijingPalace",
      label: "Beijing Palace Soluxe Lobby",
      doorwayPos: new THREE.Vector3(bx, 1.8, bz + 19.6),
      insidePos: [bx, 2.2, bz + 14.5],
      insideLook: [bx, 2.4, bz - 8.0],
      outsidePos: [bx, 1.75, bz + 26.5],
      outsideLook: [bx, 5.0, bz + 10.0],
      bounds: { x0: bx - 14.5, x1: bx + 14.5, z0: bz - 14.5, z1: bz + 19.2, yMax: 6.4 },
    });
  }

  // ============================================================
  // 4. NURZHOL CAFE & MARKET (COFFEE BOOM & MAGNUM EXPRESS, x: -115, z: +62)
  // Открытый северный вход со стороны бульвара Нуржол (z = +56.5)
  // ============================================================
  {
    const cx = LANDMARKS.nurzholCafe.x, cz = LANDMARKS.nurzholCafe.z; // -115, 62
    const cg = new THREE.Group();
    cg.position.set(cx, 0, cz);
    cg.name = "interior-nurzhol-cafe";
    group.add(cg);

    const W = 22, D = 11, H = 4.6;
    const white = [], dark = [], glass = [], wood = [], shelf = [], led = [];
    const BW = new GB(), BD = new GB(), BG = new GB(), BWood = new GB(), BSh = new GB(), BL = new GB();

    // Пол (левая часть дерево COFFEE BOOM, правая плитка MAGNUM) + крыша
    BWood.box(-5.5, 0.14, 0, 11, 0.28, D, 0);
    BW.box(+5.5, 0.14, 0, 11, 0.28, D, 0);
    BD.box(0, H + 0.35, 0, W + 0.8, 0.7, D + 0.8, 0);
    BW.box(0, H - 0.05, 0, W, 0.15, D, 0);

    // Стены: юг, запад, восток + северная витрина (проём x = -2.2 .. +2.2 ОТКРЫТ!)
    BW.box(0, H / 2, +D / 2 - 0.25, W, H, 0.5, 0);
    BW.box(-W / 2 + 0.25, H / 2, 0, 0.5, H, D, 0);
    BW.box(+W / 2 - 0.25, H / 2, 0, 0.5, H, D, 0);
    // Северная рама и витринное стекло по бокам от открытой двери
    BD.box(-6.6, H - 0.45, -D / 2 + 0.2, 8.8, 0.9, 0.45, 0);
    BD.box(+6.6, H - 0.45, -D / 2 + 0.2, 8.8, 0.9, 0.45, 0);
    BD.box(0, H - 0.45, -D / 2 + 0.2, 4.4, 0.9, 0.45, 0);
    BG.box(-6.6, 2.0, -D / 2 + 0.2, 8.4, 3.3, 0.12, 0);
    BG.box(+6.6, 2.0, -D / 2 + 0.2, 8.4, 3.3, 0.12, 0);

    // ── Левая зона: COFFEE BOOM (эспрессо-бар, столики, подвесные светильники) ──
    BWood.box(-6.2, 0.85, +3.6, 7.6, 1.1, 1.0, 0); // барная стойка
    BL.box(-6.2, 0.50, +3.05, 7.2, 0.06, 0.08, 0);
    BL.box(-6.2, 4.42, +3.4, 7.4, 0.06, 0.18, 0);
    BD.box(-7.5, 1.65, +3.6, 1.1, 0.55, 0.65, 0); // кофемашина
    for (const [tx, tz] of [[-8.2, -1.6], [-4.5, -1.6], [-8.2, +1.0], [-4.5, +1.0]]) {
      BWood.box(tx, 1.02, tz, 1.1, 0.06, 1.1, 0);
      BD.box(tx, 0.65, tz, 0.12, 0.72, 0.12, 0);
      BWood.box(tx - 0.75, 0.72, tz, 0.42, 0.06, 0.42, 0);
      BWood.box(tx + 0.75, 0.72, tz, 0.42, 0.06, 0.42, 0);
      BL.box(tx, 3.35, tz, 0.36, 0.24, 0.36, 0);
    }

    // ── Правая зона: MAGNUM EXPRESS (освещённые полки, линейный свет и касса из мрамора) ──
    for (const sx of [+4.4, +7.2, +9.8]) {
      BSh.box(sx, 1.35, +0.8, 0.85, 2.1, 5.2, 0);
      BL.box(sx, 4.42, +0.8, 0.16, 0.06, 5.4, 0);
    }
    const magnumCounter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.9), M.marble);
    magnumCounter.position.set(+2.8, 0.85, -2.5);
    cg.add(magnumCounter);

    // Внешние уличные маркизы (козырьки) над витринами COFFEE BOOM и MAGNUM EXPRESS
    const cbAwning = new THREE.Mesh(
      new THREE.BoxGeometry(8.4, 0.18, 1.9).rotateX(-0.24),
      M.std({ color: 0x6b2d16, roughness: 0.72 })
    );
    cbAwning.position.set(-6.4, 3.35, -D / 2 - 0.85);
    cbAwning.castShadow = true;
    cg.add(cbAwning);
    const mgAwning = new THREE.Mesh(
      new THREE.BoxGeometry(8.4, 0.18, 1.9).rotateX(-0.24),
      M.std({ color: 0x14387d, roughness: 0.72 })
    );
    mgAwning.position.set(+6.4, 3.35, -D / 2 - 0.85);
    mgAwning.castShadow = true;
    cg.add(mgAwning);

    // Вывески снаружи и внутри
    const cbTex = makeInteriorSignTex("COFFEE BOOM", { w: 512, h: 128, bg: "#3a1e0e", fg: "#ffe2b0", accent: "#d48a40" });
    const mgTex = makeInteriorSignTex("MAGNUM EXPRESS", { w: 512, h: 128, bg: "#142668", fg: "#ffffff", accent: "#e82c42" });
    const shelfMat = M.std({ map: makeShelfGoodsTex(), emissiveMap: makeShelfGoodsTex(), emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.25, roughness: 0.5 });

    const cbOut = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.3), M.std({ map: cbTex, emissiveMap: cbTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.9 }));
    cbOut.position.set(-5.8, 4.35, -D / 2 - 0.15);
    cbOut.rotation.y = Math.PI;
    cg.add(cbOut);

    const mgOut = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.3), M.std({ map: mgTex, emissiveMap: mgTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.9 }));
    mgOut.position.set(+5.8, 4.35, -D / 2 - 0.15);
    mgOut.rotation.y = Math.PI;
    cg.add(mgOut);

    for (const [lx, col, inten] of [[-5.5, 0xffd8a4, 14], [+5.5, 0xfff5e4, 14]]) {
      const cLight = new THREE.PointLight(col, inten, 20, 1.4);
      cLight.position.set(lx, 3.9, 0);
      cg.add(cLight);
    }

    white.push(BW.build());
    dark.push(BD.build());
    glass.push(BG.build());
    wood.push(BWood.build());
    shelf.push(BSh.build());
    led.push(BL.build());

    addMerged(cg, white, whiteWallMat);
    addMerged(cg, dark, M.darkMetal);
    addMerged(cg, glass, M.glassClear, false, false);
    addMerged(cg, wood, warmWoodMat);
    addMerged(cg, shelf, shelfMat);
    addMerged(cg, led, ledCeilMat, false, false);

    // ── Коллайдеры Nurzhol Cafe (северный проём x = cx ± 2.2 открыт!) ──
    pushBox(cx, 0, cz + D / 2 - 0.25, W, H, 0.7);
    pushBox(cx - W / 2 + 0.25, 0, cz, 0.7, H, D);
    pushBox(cx + W / 2 - 0.25, 0, cz, 0.7, H, D);
    pushBox(cx - 6.6, 0, cz - D / 2 + 0.2, 8.8, H, 0.6);
    pushBox(cx + 6.6, 0, cz - D / 2 + 0.2, 8.8, H, 0.6);
    pushBox(cx, H, cz, W + 0.8, 1.2, D + 0.8); // крыша
    // Внутренние стойки/полки
    pushBox(cx - 6.2, 0.28, cz + 3.6, 7.6, 1.4, 1.1);
    pushBox(cx + 4.4, 0.28, cz + 0.8, 0.95, 2.2, 5.2);
    pushBox(cx + 7.2, 0.28, cz + 0.8, 0.95, 2.2, 5.2);

    entrances.push({
      id: "nurzholCafe",
      label: "Coffee Boom & Magnum Express",
      doorwayPos: new THREE.Vector3(cx, 1.8, cz - D / 2),
      insidePos: [cx, 2.03, cz - 2.0],
      insideLook: [cx - 4.0, 2.0, cz + 3.0],
      outsidePos: [cx, 1.75, cz - D / 2 - 4.5],
      outsideLook: [cx, 2.5, cz],
      bounds: { x0: cx - 10.8, x1: cx + 10.8, z0: cz - 5.3, z1: cz + 5.3, yMax: 4.5 },
    });
  }

  // ============================================================
  // Вычисление высоты пола (тротуары, ступени QazaqGaz, эскалатор/2F MEGA!)
  // ============================================================
  function floorHeightAt(x, z, curFootY = 0) {
    // 1. QazaqGaz HQ Lobby + 3 ступени
    const qx = LANDMARKS.qazaqGaz.x, qz = LANDMARKS.qazaqGaz.z;
    if (Math.abs(x - qx) < 21 && z > qz - 16 && z < qz + 24.5) {
      if (z <= qz + 21.4) return 0.54;
      const t = Math.max(0, Math.min(1, (qz + 24.0 - z) / 2.6));
      return t * 0.54;
    }

    // 2. MEGA Silk Way (1F y=0.30, эскалаторы 0.30..7.00, 2F галереи y=7.00)
    if (Math.abs(x - mx) < 119 && Math.abs(z - mz) < 51) {
      const lx = x - mx, lz = z - mz;
      // Эскалатор A (северный z = -12.8 .. -7.2, x = -56 .. -34)
      if (lz >= -12.8 && lz <= -7.2 && lx >= -56 && lx <= -34) {
        const t = Math.max(0, Math.min(1, (-34 - lx) / 22));
        return 0.30 + t * 6.70;
      }
      // Эскалатор B (южный z = +7.2 .. +12.8, x = +34 .. +56)
      if (lz >= 7.2 && lz <= 12.8 && lx >= 34 && lx <= 56) {
        const t = Math.max(0, Math.min(1, (lx - 34) / 22));
        return 0.30 + t * 6.70;
      }
      // 2F галереи (если игрок уже поднялся >= 3.6 м и не в центральном атриуме)
      const inAtriumVoid = Math.abs(lx) < 55.5 && Math.abs(lz) < 16.8;
      if (curFootY >= 3.6 && !inAtriumVoid) return 7.0;
      return 0.30;
    }

    // 3. Beijing Palace Lobby
    if (Math.abs(x + 240) < 15 && z > 374 && z < 410) return 0.45;

    // 4. Nurzhol Cafe & Market
    if (Math.abs(x - LANDMARKS.nurzholCafe.x) < 11 && Math.abs(z - LANDMARKS.nurzholCafe.z) < 5.5) return 0.28;

    // 5. Бульвар Нуржол терраса
    if (x > -840 && x < 520 && Math.abs(z) < 37) return 0.32;

    return 0;
  }

  /** Проверка ближайшего входа или текущего помещения для кнопки [V]. */
  function queryPortal(pos) {
    // Сначала проверяем, находится ли камера внутри одного из 4 помещений
    for (const ent of entrances) {
      const b = ent.bounds;
      if (pos.x >= b.x0 && pos.x <= b.x1 && pos.z >= b.z0 && pos.z <= b.z1 && pos.y <= b.yMax) {
        return { inside: true, entrance: ent };
      }
    }
    // Иначе ищем ближайший открытый вход (в радиусе 18 м)
    let best = null, bestD = 18;
    for (const ent of entrances) {
      const d = pos.distanceTo(ent.doorwayPos);
      if (d < bestD) { bestD = d; best = ent; }
    }
    return best ? { inside: false, entrance: best } : null;
  }

  return {
    group,
    colliders,
    entrances,
    floorHeightAt,
    queryPortal,
    update(_dt, _time) {},
  };
}
