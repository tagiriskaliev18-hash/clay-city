// ============================================================
// ASTANA 2077 — controls.js
// Управление: свободный полёт (WASD/QE/Shift, мышь) + режим
// пешеходной прогулки [G] (eyeHeight = floorY + 1.75 м, подъём по
// ступеням и эскалаторам MEGA Silk Way, 7 м/с / Shift 15 м/с),
// столкновения с полыми коллайдерами интерьеров, кино-режим, пресеты.
// ============================================================
import * as THREE from "three";

const _eul = new THREE.Euler(0, 0, 0, "YXZ");
const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _acc = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
const _pos = new THREE.Vector3(), _tgt = new THREE.Vector3(), _dir = new THREE.Vector3();
const _smooth = new THREE.Vector3(0, 0, -1), ZERO = new THREE.Vector3();

// ============================================================
// CAMERA VIEWS — 11 ракурсов Астаны + алиасы
// ============================================================
export const CAM_VIEWS = {
  nurzhol:      { pos: [760, 260, 580],    tgt: [0, 85, 0],       label: "Ось Нуржол" },
  bayterek:     { pos: [145, 138, 225],    tgt: [-35, 78, 25],    label: "Байтерек" },
  akorda:       { pos: [455, 108, 72],     tgt: [795, 32, -15],   label: "Акорда" },
  khanShatyr:   { pos: [-1100, 210, 340],  tgt: [-940, 75, 0],    label: "Хан Шатыр" },
  megaSilkWay:  { pos: [-260, 118, 1140],  tgt: [-175, 22, 940],  label: "MEGA Silk Way" },
  insideMega:   { pos: [-112, 2.05, 940],  tgt: [-200, 5.2, 940], label: "Внутри MEGA", walk: true },
  beijing:      { pos: [-145, 86, 515],    tgt: [-240, 48, 390],  label: "Beijing Palace" },
  highvillPark: { pos: [-785, 115, 825],   tgt: [-600, 34, 660],  label: "Highvill Park" },
  qazaqgaz:     { pos: [168, 56, 258],     tgt: [235, 34, 155],   label: "QazaqGaz" },
  insideQG:     { pos: [235, 2.29, 171],   tgt: [235, 2.29, 152], label: "Внутри QG", walk: true },
  street:       { pos: [-180, 12, 18],     tgt: [120, 14, 0],     label: "Улица" },
  // Совместимость со старыми ссылками
  abuDhabi:     { pos: [-340, 360, 460],   tgt: [-160, 165, 250], label: "Abu Dhabi Plaza" },
  pyramid:      { pos: [1220, 145, -190],  tgt: [1080, 38, 0],    label: "Пирамида и Мечеть" },
};

export function createControls(camera, dom, { collide = null, floorHeightAt = null, onWalkChange = null } = {}) {
  const keys = Object.create(null);
  let yaw = 0, pitch = 0, roll = 0;
  let locked = false, dragging = false, enabled = false;
  let walkMode = false;
  const vel = new THREE.Vector3();
  let speedUI = 0, fovBase = 52;
  const cine = {
    on: false, pos: null, look: null, t: 0, duration: 110,
    blend: 1, fromPos: new THREE.Vector3(), fromQuat: new THREE.Quaternion(), lastYaw: 0, bank: 0,
  };

  let flyTo = null;

  addEventListener("keydown", (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    if (cine.on && ["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "Space", "ShiftLeft", "ShiftRight"].includes(e.code)) exitCinematic();
    if (flyTo && ["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE"].includes(e.code)) flyTo = null;
  });
  addEventListener("keyup", (e) => { keys[e.code] = false; });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
  dom.addEventListener("mousedown", () => { if (!locked) dragging = true; });
  addEventListener("mouseup", () => { dragging = false; });
  document.addEventListener("pointerlockchange", () => { locked = document.pointerLockElement === dom; });
  addEventListener("mousemove", (e) => {
    if (!enabled || cine.on) return;
    if (!locked && !dragging) return;
    yaw -= e.movementX * 0.0022;
    pitch -= e.movementY * 0.0022;
    pitch = Math.max(-1.48, Math.min(1.48, pitch));
  });

  function setWalkMode(on) {
    const next = !!on;
    if (walkMode === next) return;
    walkMode = next;
    roll = 0;
    vel.set(0, 0, 0);
    if (walkMode) {
      exitCinematic();
      const fy = floorHeightAt ? floorHeightAt(camera.position.x, camera.position.z, camera.position.y - 1.75) : 0;
      camera.position.y = fy + 1.75;
    }
    if (onWalkChange) onWalkChange(walkMode);
  }

  function enterCinematic() {
    if (cine.on || !cine.pos) return;
    if (walkMode) setWalkMode(false);
    cine.on = true; cine.blend = 0;
    cine.fromPos.copy(camera.position); cine.fromQuat.copy(camera.quaternion);
    _eul.setFromQuaternion(camera.quaternion, "YXZ"); cine.lastYaw = _eul.y; cine.bank = 0;
    _smooth.set(0, 0, -1).applyQuaternion(camera.quaternion);
    vel.set(0, 0, 0);
    document.body.classList.add("cine");
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function exitCinematic() {
    if (!cine.on) return;
    cine.on = false;
    document.body.classList.remove("cine");
    _eul.setFromQuaternion(camera.quaternion, "YXZ");
    yaw = _eul.y; pitch = _eul.x; roll = 0;
    vel.set(0, 0, 0);
  }

  function teleport(posArr, lookArr, enableWalk = true) {
    exitCinematic();
    flyTo = null;
    vel.set(0, 0, 0);
    camera.position.set(posArr[0], posArr[1], posArr[2]);
    camera.lookAt(lookArr[0], lookArr[1], lookArr[2]);
    syncFromCamera();
    walkMode = !!enableWalk;
    roll = 0;
    if (onWalkChange) onWalkChange(walkMode);
  }

  function goToView(viewName, instant = false) {
    const view = CAM_VIEWS[viewName];
    if (!view) return;
    exitCinematic();
    vel.set(0, 0, 0);
    const wantWalk = !!view.walk;
    if (instant || wantWalk) {
      teleport(view.pos, view.tgt, wantWalk);
      if (camera.fov !== fovBase) { camera.fov = fovBase; camera.updateProjectionMatrix(); }
      return;
    }
    if (walkMode) setWalkMode(false);
    flyTo = {
      fromPos: camera.position.clone(),
      fromQuat: camera.quaternion.clone(),
      toPos: new THREE.Vector3(...view.pos),
      toTgt: new THREE.Vector3(...view.tgt),
      t: 0, dur: 1.5,
    };
  }

  function updateFlyTo(dt) {
    if (!flyTo) return false;
    flyTo.t += dt / flyTo.dur;
    if (flyTo.t >= 1) {
      camera.position.copy(flyTo.toPos);
      camera.lookAt(flyTo.toTgt);
      syncFromCamera();
      flyTo = null;
      return true;
    }
    const e = flyTo.t * flyTo.t * (3 - 2 * flyTo.t);
    camera.position.lerpVectors(flyTo.fromPos, flyTo.toPos, e);
    const lerpedTgt = new THREE.Vector3().lerpVectors(
      flyTo.fromPos.clone().add(new THREE.Vector3(0, 0, -100).applyQuaternion(flyTo.fromQuat)),
      flyTo.toTgt, e
    );
    camera.lookAt(lerpedTgt);
    return true;
  }

  function updateCinematic(dt, time) {
    cine.blend = Math.min(1, cine.blend + dt / 2.6);
    cine.t = (cine.t + dt / cine.duration) % 1;
    cine.pos.getPointAt(cine.t, _pos);
    cine.look.getPointAt(cine.t, _tgt);
    _dir.subVectors(_tgt, _pos).normalize();
    _smooth.lerp(_dir, 1 - Math.exp(-dt * 2.2)).normalize();
    const breathe = Math.sin(time * 0.7) * 0.0022 + Math.sin(time * 1.9 + 1.3) * 0.0011;
    _m.lookAt(ZERO, _dir.copy(_smooth).applyAxisAngle(UP, breathe), UP);
    _q.setFromRotationMatrix(_m);
    const k = cine.blend * cine.blend * (3 - 2 * cine.blend);
    camera.position.lerpVectors(cine.fromPos, _pos, k);
    camera.quaternion.slerpQuaternions(cine.fromQuat, _q, k);
    _eul.setFromQuaternion(camera.quaternion, "YXZ");
    let dy = _eul.y - cine.lastYaw;
    if (dy > Math.PI) dy -= Math.PI * 2; else if (dy < -Math.PI) dy += Math.PI * 2;
    cine.lastYaw = _eul.y;
    cine.bank += (THREE.MathUtils.clamp(-dy / Math.max(dt, 1e-3) * 1.6, -0.16, 0.16) - cine.bank) * Math.min(1, dt * 1.5);
    _eul.z = cine.bank; camera.quaternion.setFromEuler(_eul);
    if (collide) collide(camera.position, null, 1.5);
    camera.fov += (44 - camera.fov) * Math.min(1, dt * 1.5);
    camera.updateProjectionMatrix();
    speedUI = cine.pos.getLength() / cine.duration;
  }

  function syncFromCamera() {
    _eul.setFromQuaternion(camera.quaternion, "YXZ"); yaw = _eul.y; pitch = _eul.x; roll = 0;
  }

  function update(dt, time = 0) {
    if (cine.on) { updateCinematic(dt, time); return; }
    if (updateFlyTo(dt)) return;
    if (!enabled) return;

    const boost = keys["ShiftLeft"] || keys["ShiftRight"];

    if (walkMode) {
      roll = 0;
      _eul.set(pitch, yaw, 0, "YXZ");
      camera.quaternion.setFromEuler(_eul);
      _fwd.set(0, 0, -1).applyAxisAngle(UP, yaw);
      _right.set(1, 0, 0).applyAxisAngle(UP, yaw);

      const walkSpd = boost ? 15 : 7;
      _acc.set(0, 0, 0);
      if (keys["KeyW"]) _acc.add(_fwd);
      if (keys["KeyS"]) _acc.addScaledVector(_fwd, -1);
      if (keys["KeyD"]) _acc.add(_right);
      if (keys["KeyA"]) _acc.addScaledVector(_right, -1);

      if (_acc.lengthSq() > 0) _acc.normalize().multiplyScalar(walkSpd);
      vel.x += (_acc.x - vel.x) * Math.min(1, dt * 14);
      vel.z += (_acc.z - vel.z) * Math.min(1, dt * 14);
      vel.y = 0;
      camera.position.x += vel.x * dt;
      camera.position.z += vel.z * dt;

      const curFootY = camera.position.y - 1.75;
      const targetFloor = floorHeightAt ? floorHeightAt(camera.position.x, camera.position.z, curFootY) : 0;
      const targetEyeY = targetFloor + 1.75;
      camera.position.y += (targetEyeY - camera.position.y) * Math.min(1, dt * 12);

      if (collide) collide(camera.position, vel, 0.55);
      speedUI = Math.hypot(vel.x, vel.z);
      if (Math.abs(camera.fov - fovBase) > 0.1) {
        camera.fov += (fovBase - camera.fov) * Math.min(1, dt * 6);
        camera.updateProjectionMatrix();
      }
      return;
    }

    // Режим свободного полёта
    _eul.set(pitch, yaw, roll, "YXZ");
    camera.quaternion.setFromEuler(_eul);
    _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    const base = boost ? 640 : 150;
    _acc.set(0, 0, 0);
    if (keys["KeyW"]) _acc.add(_fwd);
    if (keys["KeyS"]) _acc.addScaledVector(_fwd, -1);
    if (keys["KeyD"]) _acc.add(_right);
    if (keys["KeyA"]) _acc.addScaledVector(_right, -1);
    if (keys["KeyE"] || keys["Space"]) _acc.add(UP);
    if (keys["KeyQ"] || keys["ControlLeft"]) _acc.addScaledVector(UP, -1);
    const strafe = (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0);
    roll += (strafe * -0.07 - roll) * Math.min(1, dt * 3.2);
    _eul.set(pitch, yaw, roll, "YXZ");
    camera.quaternion.setFromEuler(_eul);
    if (_acc.lengthSq() > 0) _acc.normalize().multiplyScalar(base);
    vel.addScaledVector(_acc, dt);
    vel.multiplyScalar(Math.pow(0.1, dt));
    camera.position.addScaledVector(vel, dt);
    if (camera.position.y < 1.2) camera.position.y = 1.2;
    const r = Math.hypot(camera.position.x, camera.position.z);
    if (r > 12000) camera.position.multiplyScalar(12000 / r);
    if (collide) collide(camera.position, vel, 1.5);
    speedUI = vel.length();
    camera.fov += (fovBase + (boost ? 9 : 0) - camera.fov) * Math.min(1, dt * 3.5);
    camera.updateProjectionMatrix();
  }

  return {
    update,
    enterCinematic,
    exitCinematic,
    goToView,
    teleport,
    setWalkMode,
    get walkMode() { return walkMode; },
    get cinematic() { return cine.on; },
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; },
    get speed() { return Math.round(speedUI); },
    syncFromCamera,
    setRoute(posCurve, lookCurve, duration = 110) { cine.pos = posCurve; cine.look = lookCurve; cine.duration = duration; },
    get cineT() { return cine.t; },
    set cineT(v) { cine.t = v; },
  };
}

// Коллайдер: ориентированные боксы зданий и полых стен интерьеров в хеш-сетке
export function makeCollider(list, extra = []) {
  const CELL = 64, grid = new Map();
  const push = (b) => {
    const rad = Math.hypot(b.w, b.d) / 2 + 2;
    const x0 = Math.floor((b.x - rad) / CELL), x1 = Math.floor((b.x + rad) / CELL);
    const z0 = Math.floor((b.z - rad) / CELL), z1 = Math.floor((b.z + rad) / CELL);
    for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
      const k = gx + "," + gz; let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(b);
    }
  };
  for (const b of list) push(b);
  for (const e of extra) push(e);
  return function collide(p, vel, R = 1.5) {
    const gx = Math.floor(p.x / CELL), gz = Math.floor(p.z / CELL);
    for (let ix = gx - 1; ix <= gx + 1; ix++) for (let iz = gz - 1; iz <= gz + 1; iz++) {
      const a = grid.get(ix + "," + iz); if (!a) continue;
      for (let i = 0; i < a.length; i++) {
        const b = a[i];
        if (p.y > b.y + b.h + R || p.y < b.y - R) continue;
        const dx = p.x - b.x, dz = p.z - b.z, c = Math.cos(b.yaw), s = Math.sin(b.yaw);
        const lx = dx * c - dz * s, lz = dx * s + dz * c;
        const hx = b.w / 2 + R, hz = b.d / 2 + R;
        if (Math.abs(lx) >= hx || Math.abs(lz) >= hz) continue;
        const px = hx - Math.abs(lx), pz = hz - Math.abs(lz), py = b.y + b.h + R - p.y;
        if (py < px && py < pz) { p.y = b.y + b.h + R; if (vel) vel.y = Math.max(0, vel.y); continue; }
        let nlx = lx, nlz = lz;
        if (px < pz) nlx = Math.sign(lx || 1) * hx; else nlz = Math.sign(lz || 1) * hz;
        p.x = b.x + nlx * c + nlz * s;
        p.z = b.z - nlx * s + nlz * c;
        if (vel) vel.multiplyScalar(0.2);
      }
    }
  };
}
