// ============================================================
// ASTANA 2077 — models.js
// Общий загрузчик Draco GLB моделей с кэшированием, выравниванием
// по земле через Box3 (min.y === 0) и объединением мешей по материалу
// для быстрого InstancedMesh-рендеринга.
// ============================================================
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("./vendor/draco/");
dracoLoader.preload();

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const cache = new Map();

function normalizeGeometry(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    const count = g.attributes.position.count;
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  // Keep uniform attributes across merged parts so mergeGeometries never fails on extra channels
  for (const attr of Object.keys(g.attributes)) {
    if (attr !== "position" && attr !== "normal" && attr !== "uv") {
      g.deleteAttribute(attr);
    }
  }
  return g;
}

/**
 * Загружает Draco GLB модель, опционально поворачивает/масштабирует,
 * центрирует XZ (по запросу) и ставит строго на пол Y = 0 по Box3.
 * Возвращает { parts: [{ name, geometry, material }], size, box }.
 */
export function loadModelParts(url, { rotateY = 0, scale = 1, groundY = true, centerXZ = false } = {}) {
  const key = `${url}|${rotateY.toFixed(4)}|${scale.toFixed(4)}|${groundY}|${centerXZ}`;
  if (cache.has(key)) return cache.get(key);

  const promise = gltfLoader.loadAsync(url).then((gltf) => {
    const root = gltf.scene;
    if (rotateY) root.rotation.y = rotateY;
    if (scale !== 1) root.scale.setScalar(scale);
    root.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(root);
    const offsetX = centerXZ ? -(box.min.x + box.max.x) * 0.5 : 0;
    const offsetY = groundY ? -box.min.y : 0;
    const offsetZ = centerXZ ? -(box.min.z + box.max.z) * 0.5 : 0;
    const offsetMat = new THREE.Matrix4().makeTranslation(offsetX, offsetY, offsetZ);

    const groups = new Map();
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry) return;
      const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      const matName = mat?.name || mat?.uuid || "default";
      const baked = normalizeGeometry(obj.geometry);
      baked.applyMatrix4(obj.matrixWorld);
      baked.applyMatrix4(offsetMat);
      let entry = groups.get(matName);
      if (!entry) {
        entry = { name: matName, material: mat ? mat.clone() : new THREE.MeshStandardMaterial(), geos: [] };
        groups.set(matName, entry);
      }
      entry.geos.push(baked);
    });

    const parts = [];
    for (const entry of groups.values()) {
      const geometry = entry.geos.length === 1 ? entry.geos[0] : mergeGeometries(entry.geos, false);
      if (entry.geos.length > 1) entry.geos.forEach((g) => g.dispose());
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();
      parts.push({ name: entry.name, geometry, material: entry.material });
    }

    const size = box.getSize(new THREE.Vector3());
    const groundedBox = box.clone().translate(new THREE.Vector3(offsetX, offsetY, offsetZ));
    return { parts, size, box: groundedBox };
  });

  cache.set(key, promise);
  return promise;
}

/**
 * Создаёт клонированную Group-сборку из подготовленных parts для одиночных объектов (интерьеры).
 */
export function instantiateModelGroup(modelData, prepareMat) {
  const group = new THREE.Group();
  for (const part of modelData.parts) {
    const mat = prepareMat ? prepareMat(part.name, part.material) : part.material;
    const mesh = new THREE.Mesh(part.geometry, mat);
    mesh.name = part.name;
    mesh.castShadow = !mat.transparent;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
