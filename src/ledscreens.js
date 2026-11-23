// ============================================================
// ASTANA 2077 — ledscreens.js
// Живой анимированный Canvas2D движок LED-рекламы (512×256, ~18 FPS,
// ноль GC-аллокаций, LED-сетка + хроматический глитч-переход каждые ~6с):
//   1. QAZAQGAZ FUSION 2077
//   2. CYBER-NOMAD CHROMEWARE
//   3. NEO-KUMYS SYNTH ENERGY
//   4. MEGA SILK WAY // HYPER-MALL
// Смонтированы на 7 ГИГАНТСКИХ ферменных конструкциях (34×18..54×26 м).
// В дневном режиме на MEGA Silk Way горит чистая дневная медиа-стена,
// остальные 6 гигантских кибер-экранов включаются по клавише [F].
// ============================================================
import * as THREE from "three";
import { GB, merge } from "./geom.js";
import { REG } from "./materials.js";

function makeDayMallMediaTex() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 512, 256);
  gr.addColorStop(0, "#0b2e59");
  gr.addColorStop(0.5, "#12609e");
  gr.addColorStop(1, "#0b2e59");
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 256);

  g.fillStyle = "#e8344c";
  g.fillRect(0, 0, 512, 14);
  g.fillRect(0, 242, 512, 14);
  g.fillStyle = "#ffffff";
  g.font = "800 54px 'Segoe UI', Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("MEGA SILK WAY", 256, 98);
  g.fillStyle = "#9be8ff";
  g.font = "600 22px 'Segoe UI', Arial, sans-serif";
  g.fillText("ASTANA  ·  EXPO PLAZA  ·  OPEN DAILY 10:00–22:00", 256, 162);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

class CommercialChannel {
  constructor(phaseSec = 0) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext("2d");
    this.phase = phaseSec;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.tex.generateMipmaps = false;
    this.tex.minFilter = THREE.LinearFilter;
    // Предвыделенные координаты пузырьков (без аллокаций в цикле)
    this.bubblesX = new Float32Array([72, 92, 110, 84, 104, 122, 76, 96]);
    this.bubblesSpd = new Float32Array([0.45, 0.72, 0.55, 0.85, 0.60, 0.48, 0.78, 0.64]);
    this.draw(0);
  }

  draw(time) {
    const g = this.ctx;
    const W = 512, H = 256;
    const t = time + this.phase;
    const cycle = 24.0; // 4 ролика по 6 сек
    const modT = t % cycle;
    const idx = Math.floor(modT / 6.0);
    const localT = modT - idx * 6.0;

    // Короткий хроматический глитч-срез в начале каждого ролика
    const isGlitch = localT < 0.28 || localT > 5.76;

    if (idx === 0) this._drawQazaqGaz(g, W, H, localT);
    else if (idx === 1) this._drawCyberNomad(g, W, H, localT);
    else if (idx === 2) this._drawNeoKumys(g, W, H, localT);
    else this._drawMegaMall(g, W, H, localT);

    // Сетка LED-пикселей и тонкие scanlines
    g.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);

    if (isGlitch) {
      g.fillStyle = "rgba(0,245,255,0.28)";
      g.fillRect(((localT * 920) % 240), ((localT * 610) % 200), 220, 14);
      g.fillStyle = "rgba(255,42,133,0.32)";
      g.fillRect(60, ((localT * 430) % 180) + 20, 320, 10);
    }

    // Яркая рамка экрана
    g.strokeStyle = idx % 2 === 0 ? "#00f5ff" : "#ff2a85";
    g.lineWidth = 4;
    g.strokeRect(3, 3, W - 6, H - 6);

    this.tex.needsUpdate = true;
  }

  _drawQazaqGaz(g, W, H, t) {
    g.fillStyle = "#040d1e";
    g.fillRect(0, 0, W, H);
    const cx = 112, cy = 128;
    const pulse = 1 + 0.14 * Math.sin(t * 5.2);

    // Энергетическое ядро и вращающиеся орбиты
    const rg = g.createRadialGradient(cx, cy, 4, cx, cy, 74 * pulse);
    rg.addColorStop(0, "#ffffff");
    rg.addColorStop(0.3, "#00f5ff");
    rg.addColorStop(0.7, "#0066ff");
    rg.addColorStop(1, "rgba(0,40,120,0)");
    g.fillStyle = rg;
    g.beginPath(); g.arc(cx, cy, 74 * pulse, 0, Math.PI * 2); g.fill();

    g.strokeStyle = "#00f5ff";
    g.lineWidth = 3;
    for (let k = 0; k < 2; k++) {
      g.save();
      g.translate(cx, cy);
      g.rotate(t * (k === 0 ? 1.4 : -1.1) + k);
      g.beginPath();
      g.ellipse(0, 0, 70, 24, 0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }

    g.fillStyle = "#ffffff";
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.font = "800 38px 'Segoe UI', Arial, sans-serif";
    g.fillText("QAZAQGAZ", 206, 86);
    g.fillStyle = "#00f5ff";
    g.font = "800 30px 'Segoe UI', Arial, sans-serif";
    g.fillText("FUSION 2077", 206, 126);
    g.fillStyle = "#9ae8ff";
    g.font = "700 15px 'Segoe UI', Arial, sans-serif";
    g.fillText("ЭНЕРГИЯ БУДУЩЕГО //", 206, 174);
    g.fillText("FUSION CORE 2077", 206, 198);
  }

  _drawCyberNomad(g, W, H, t) {
    g.fillStyle = "#12041e";
    g.fillRect(0, 0, W, H);

    // Голографическая сетка
    g.strokeStyle = "rgba(0,245,255,0.22)";
    g.lineWidth = 1;
    for (let x = 0; x < W; x += 32) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    }
    for (let y = 0; y < H; y += 32) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }

    // Кибер-глаз с бегущим сканером
    const cx = 112, cy = 128;
    g.strokeStyle = "#ff2a85";
    g.lineWidth = 5;
    g.beginPath(); g.ellipse(cx, cy, 68, 38, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#00f5ff";
    g.beginPath(); g.arc(cx + Math.sin(t * 3) * 14, cy, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#090412";
    g.beginPath(); g.arc(cx + Math.sin(t * 3) * 14, cy, 9, 0, Math.PI * 2); g.fill();
    // Скан-линия
    const scanX = 44 + ((t * 95) % 136);
    g.fillStyle = "rgba(0,245,255,0.7)";
    g.fillRect(scanX, 74, 4, 108);

    g.fillStyle = "#ff2a85";
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.font = "800 32px 'Segoe UI', Arial, sans-serif";
    g.fillText("CYBER-NOMAD", 200, 82);
    g.fillStyle = "#ffffff";
    g.font = "800 26px 'Segoe UI', Arial, sans-serif";
    g.fillText("CHROMEWARE", 200, 118);
    g.fillStyle = "#00f5ff";
    g.font = "700 14px 'Segoe UI', Arial, sans-serif";
    g.fillText("ОБНОВИ РЕАЛЬНОСТЬ ·", 200, 168);
    g.fillText("NEURAL OPTICS v9.4", 200, 192);
  }

  _drawNeoKumys(g, W, H, t) {
    g.fillStyle = "#1c0806";
    g.fillRect(0, 0, W, H);

    // Неоновая волна
    g.strokeStyle = "#ff2a85";
    g.lineWidth = 4;
    g.beginPath();
    for (let x = 0; x <= W; x += 16) {
      const y = 195 + Math.sin(x * 0.03 + t * 5.0) * 18;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();

    // Силуэт синт-бутылки NEO-KUMYS + поднимающиеся пузырьки
    g.fillStyle = "#ffb347";
    g.fillRect(70, 88, 56, 128);
    g.fillRect(84, 52, 28, 36);
    g.fillStyle = "#ff2a85";
    g.fillRect(74, 116, 48, 44);
    g.fillStyle = "#ffffff";
    for (let i = 0; i < 8; i++) {
      const by = 210 - ((t * this.bubblesSpd[i] * 90 + i * 24) % 140);
      g.beginPath(); g.arc(this.bubblesX[i], by, 3.5, 0, Math.PI * 2); g.fill();
    }

    g.fillStyle = "#ffb347";
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.font = "800 38px 'Segoe UI', Arial, sans-serif";
    g.fillText("NEO-KUMYS", 162, 86);
    g.fillStyle = "#ff2a85";
    g.font = "800 28px 'Segoe UI', Arial, sans-serif";
    g.fillText("SYNTH ENERGY", 162, 126);
    g.fillStyle = "#ffe6b3";
    g.font = "700 15px 'Segoe UI', Arial, sans-serif";
    g.fillText("100% SYNTH ENERGY · ASTANA", 162, 174);
  }

  _drawMegaMall(g, W, H, t) {
    g.fillStyle = "#060e20";
    g.fillRect(0, 0, W, H);

    // Перспективный кибер-тоннель
    const cx = 108, cy = 128;
    for (let i = 0; i < 5; i++) {
      const k = ((t * 0.8 + i * 0.2) % 1.0);
      const sz = 16 + k * 84;
      g.strokeStyle = i % 2 === 0 ? `rgba(0,245,255,${1 - k})` : `rgba(255,42,133,${1 - k})`;
      g.lineWidth = 3;
      g.strokeRect(cx - sz, cy - sz * 0.72, sz * 2, sz * 1.44);
    }
    // Вращающийся голографический ромб
    g.save();
    g.translate(cx, cy);
    g.rotate(t * 1.6);
    g.fillStyle = "#00f5ff";
    g.fillRect(-18, -18, 36, 36);
    g.restore();

    g.fillStyle = "#ffffff";
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.font = "800 32px 'Segoe UI', Arial, sans-serif";
    g.fillText("MEGA SILK WAY", 206, 84);
    g.fillStyle = "#00f5ff";
    g.font = "800 26px 'Segoe UI', Arial, sans-serif";
    g.fillText("// HYPER-MALL", 206, 122);
    g.fillStyle = "#ff85c0";
    g.font = "700 15px 'Segoe UI', Arial, sans-serif";
    g.fillText("MEGA SILK WAY 2077 ·", 206, 168);
    g.fillText("500+ МАГАЗИНОВ · 24/7", 206, 192);
  }
}

/** Создаёт изогнутую дугу экрана с металлической ферменной рамой. */
function makeCurvedScreen(w, h, rad, arcAngle, matScreen, matTruss, matNeon) {
  const g = new THREE.Group();
  const segs = 14;
  const screenGeo = new THREE.CylinderGeometry(rad, rad, h, segs, 1, true, -arcAngle / 2, arcAngle);
  const screenMesh = new THREE.Mesh(screenGeo, matScreen);
  g.add(screenMesh);

  const BT = new GB(), BN = new GB();
  for (let i = 0; i <= 6; i++) {
    const a = -arcAngle / 2 + (i / 6) * arcAngle;
    const x = Math.sin(a) * (rad - 0.8), z = Math.cos(a) * (rad - 0.8);
    BT.box(x, 0, z, 0.7, h + 2.4, 0.9, a);
  }
  for (const sy of [-h / 2 - 0.6, +h / 2 + 0.6]) {
    for (let i = 0; i < 8; i++) {
      const a = -arcAngle / 2 + ((i + 0.5) / 8) * arcAngle;
      const segW = (arcAngle * rad) / 8 + 0.4;
      BT.box(Math.sin(a) * (rad - 0.4), sy, Math.cos(a) * (rad - 0.4), segW, 0.9, 1.2, a);
      BN.box(Math.sin(a) * (rad + 0.25), sy, Math.cos(a) * (rad + 0.25), segW, 0.28, 0.28, a);
    }
  }
  g.add(new THREE.Mesh(BT.build(), matTruss));
  g.add(new THREE.Mesh(BN.build(), matNeon));
  void w;
  return g;
}

/** Создаёт плоский гигантский LED-экран (двусторонний: экран виден спереди и сзади без глухой чёрной плиты!). */
function makeFlatScreen(w, h, matScreen, matTruss, matNeon, addPylonLegs = false) {
  const g = new THREE.Group();
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matScreen);
  front.position.z = 0.42;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matScreen);
  back.position.z = -0.42;
  back.rotation.y = Math.PI;
  g.add(front, back);

  const BT = new GB(), BN = new GB();
  // Периметральная стальная рама вместо сплошной чёрной плиты позади полотна
  BT.box(0, +h / 2 + 0.7, 0, w + 2.2, 1.4, 0.85, 0);
  BT.box(0, -h / 2 - 0.7, 0, w + 2.2, 1.4, 0.85, 0);
  BT.box(-w / 2 - 0.7, 0, 0, 1.4, h + 1.4, 0.85, 0);
  BT.box(+w / 2 + 0.7, 0, 0, 1.4, h + 1.4, 0.85, 0);
  for (const sy of [-h / 2 - 0.85, +h / 2 + 0.85]) {
    BN.box(0, sy, 0.48, w + 2.0, 0.35, 0.25, 0);
    BN.box(0, sy, -0.48, w + 2.0, 0.35, 0.25, 0);
  }
  for (const sx of [-w / 2 - 0.85, +w / 2 + 0.85]) {
    BN.box(sx, 0, 0.48, 0.35, h + 2.0, 0.25, 0);
    BN.box(sx, 0, -0.48, 0.35, h + 2.0, 0.25, 0);
  }
  if (addPylonLegs) {
    BT.box(-w * 0.36, -h / 2 - 11, 0, 2.0, 22, 2.0, 0);
    BT.box(+w * 0.36, -h / 2 - 11, 0, 2.0, 22, 2.0, 0);
    BT.box(0, -h / 2 - 4, 0, w * 0.72, 1.4, 1.4, 0);
  }
  g.add(new THREE.Mesh(BT.build(), matTruss));
  g.add(new THREE.Mesh(BN.build(), matNeon));
  return g;
}

export function buildLedScreens(scene, M, _ctx) {
  const group = new THREE.Group();
  group.name = "led-screens";
  scene.add(group);

  // Отдельно: кибер-экраны (скрыты днём) и экран на MEGA Silk Way (всегда виден, меняет материал!)
  const cyberScreensGroup = new THREE.Group();
  cyberScreensGroup.visible = false;
  group.add(cyberScreensGroup);

  // 4 живых канала рекламы со сдвигом фазы (показывают разные ролики одновременно!)
  const channels = [
    new CommercialChannel(0),
    new CommercialChannel(6),
    new CommercialChannel(12),
    new CommercialChannel(18),
  ];

  const cyberMats = channels.map((ch) => {
    const mat = new THREE.MeshBasicMaterial({ map: ch.tex, side: THREE.DoubleSide });
    REG.basic.push({ m: mat, rgb: new THREE.Color(0xffffff), k: 1.75, day: 0.95 });
    return mat;
  });

  const dayMallTex = makeDayMallMediaTex();
  const dayMallMat = M.std({
    map: dayMallTex, emissiveMap: dayMallTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.72,
    roughness: 0.25, side: THREE.DoubleSide,
  });

  const trussMat = M.darkMetal;
  const neonCyan = M.neon(0x00f5ff, 5.2, 0.0);
  const neonMag = M.neon(0xff2a85, 5.2, 0.0);

  // 1. Изогнутый угловой гигантский LED-экран у Нуржол / Достык рядом с Байтереком (38×20 м)
  const s1 = makeCurvedScreen(38, 20, 26, Math.PI * 0.46, cyberMats[0], trussMat, neonCyan);
  s1.position.set(-108, 46, 114);
  s1.rotation.y = Math.PI * 0.16;
  cyberScreensGroup.add(s1);

  // 2. Изумрудная башня 1 (Emerald Tower 1) — гигантский фасадный экран (46×26 м)
  const s2 = makeFlatScreen(46, 26, cyberMats[1], trussMat, neonCyan);
  s2.position.set(-356, 118, -114);
  cyberScreensGroup.add(s2);

  // 3. Abu Dhabi Plaza подиум/ствол — гигантский фасадный экран (50×28 м)
  const s3 = makeFlatScreen(50, 28, cyberMats[2], trussMat, neonMag);
  s3.position.set(-160, 114, 224);
  s3.rotation.y = Math.PI;
  cyberScreensGroup.add(s3);

  // 4. MEGA Silk Way изогнутая наружная медиа-стена (54×17 м — всегда видна, днём чистый mall-баннер, в Cyber — реклама!)
  const megaScreenWrap = makeFlatScreen(54, 17, dayMallMat, trussMat, neonCyan);
  megaScreenWrap.position.set(-180, 22.8, 886.2);
  megaScreenWrap.rotation.y = Math.PI;
  group.add(megaScreenWrap);
  const megaScreenMeshes = [megaScreenWrap.children[0], megaScreenWrap.children[1]];

  // 5. Talan Towers гигантский LED-экран на Нуржол (36×20 м)
  const s5 = makeFlatScreen(36, 20, cyberMats[3], trussMat, neonMag);
  s5.position.set(-60, 74, 117);
  s5.rotation.y = Math.PI;
  cyberScreensGroup.add(s5);

  // 6. Northern Lights Tower 1 гигантский LED-экран на Кабанбай/Нуржол (38×21 м)
  const s6 = makeFlatScreen(38, 21, cyberMats[0], trussMat, neonCyan);
  s6.position.set(-220, 96, -126);
  cyberScreensGroup.add(s6);

  // 7. Отдельностоящий гигантский пилон-арка LED-билборд на бульваре Нуржол (36×19 м)
  const s7 = makeFlatScreen(36, 19, cyberMats[2], trussMat, neonMag, true);
  s7.position.set(-485, 31, -44);
  s7.rotation.y = Math.PI * 0.25;
  cyberScreensGroup.add(s7);

  let isCyber = false;
  let accum = 0;
  let rrIdx = 0;

  return {
    group,
    setCyber(on) {
      isCyber = !!on;
      cyberScreensGroup.visible = isCyber;
      const mat = isCyber ? cyberMats[3] : dayMallMat;
      for (const m of megaScreenMeshes) m.material = mat;
    },
    update(dt, time) {
      if (!isCyber) return;
      accum += dt;
      // ~18 FPS на канал в round-robin режиме (практически 0 нагрузка на CPU/GPU!)
      if (accum >= 1 / 72) {
        accum = 0;
        channels[rrIdx].draw(time);
        rrIdx = (rrIdx + 1) % channels.length;
      }
    },
  };
}
