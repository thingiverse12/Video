import { groundHeight, LAKE, lakeRadius, ROAD_POINTS } from './terrain';
import * as THREE from 'three';
import { mergeStaticMeshes } from './optimize';
import { firCanopy, meadowGrass, summerFlowers, surfaceTexture, texturedMaterial, groundDecal } from './look';
import { createShop } from './shop';
import { SHOP, HOME } from './types';
import { createHomeInterior } from './home';
import { beam, box, createElk, createHouse, createLogPile, createToolbox, cylinder, material, mesh, sign } from './models';

import type { Collider } from './colliders';
export type { Collider };
export interface ElkEntity { model: ReturnType<typeof createElk>; origin: THREE.Vector3; alive: boolean; respawnAt: number; phase: number; }
export interface World {
  root: THREE.Group;
  colliders: Collider[];
  elk: ElkEntity[];
  toolbox: THREE.Group;
  smoke: THREE.Mesh[];
  clouds: THREE.Group[];
  water: THREE.Mesh;
  birds: THREE.Group[];
  updateAimingFoliage: (camera: THREE.Vector3, focus: THREE.Vector3, aim: THREE.Vector3 | null) => void;
  shop: ReturnType<typeof createShop>;
  home: ReturnType<typeof createHomeInterior> & { shell: THREE.Group };
}

function randomGenerator(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Markhöjd och vägar ligger i terrain.ts (ren modul utan THREE) och
// återexporteras här för äldre importvägar.
export { groundHeight, ROAD_POINTS };

export function createWorld(): World {
  const rand = randomGenerator(43181);
  const root = new THREE.Group();
  const colliders: Collider[] = [];
  const terrainGeo = new THREE.PlaneGeometry(230, 230, 92, 92);
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  const sand = new THREE.Color('#bcb58b');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, groundHeight(x, z));
    col.set('#779664');
    const light = 0.97 + rand() * 0.055 + Math.sin(x * 0.063 + Math.sin(z * .045)) * 0.05 + Math.cos(z * .071) * .035;
    col.multiplyScalar(light);
    // Sandig strand och sjöbotten kring Myrsjön, i stället för en platt dekal som hamnade ovanpå vattnet.
    const shore = lakeRadius(x, z);
    if (shore < 1.3) col.lerp(sand, 1 - THREE.MathUtils.smoothstep(shore, 0.98, 1.3));
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  const terrain = mesh(terrainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, map: surfaceTexture('grass'), bumpMap: surfaceTexture('grass'), bumpScale: .022, roughness: 1 }), false);
  root.add(terrain);

  function patch(x: number, z: number, rx: number, rz: number, color: string, opacity = 1) {
    const geo = new THREE.PlaneGeometry(2, 2);
    geo.rotateX(-Math.PI / 2);
    const obj = mesh(geo, new THREE.MeshStandardMaterial({ color, map: groundDecal('clearing'), roughness: 1, transparent: true, opacity, depthWrite: false }), false);
    obj.position.set(x, 0.019, z); obj.scale.set(rx, 1, rz); obj.renderOrder = -2; root.add(obj);
    return obj;
  }
  patch(-6, 4, 17.5, 13, '#919472', 0.24);
  patch(2, 8, 9.5, 8, '#b2a282', 0.46);
  patch(-7, 7, 10, 5.5, '#aaa77a', 0.55);
  patch(37, -19, 12, 9, '#b5a77a', 0.68);
  patch(-27, -44, 12, 10, '#8da374', 0.28);
  patch(40, 21, 19, 19, '#acaf8e', 0.54);

  const roads: THREE.CatmullRomCurve3[] = [];
  for (let r = 0; r < ROAD_POINTS.length; r++) {
    const road = new THREE.CatmullRomCurve3(ROAD_POINTS[r].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    roads.push(road);
    const verts: number[] = [], indices: number[] = [], roadColors: number[] = [], roadUVs: number[] = [];
    const roadLength = road.getLength();
    const width = r === 0 ? 5.7 : r === 1 ? 4.5 : 2.1;
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const p = road.getPoint(t), tangent = road.getTangent(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const rough = 0.96 + rand() * 0.08;
      for (const s of [-1, 1]) {
        const v = p.clone().addScaledVector(normal, s * width * 0.5 * rough);
        verts.push(v.x, groundHeight(v.x, v.z) + 0.032, v.z);
        roadUVs.push(s < 0 ? 0 : 1, t * roadLength / 4);
        col.set(r === 2 ? '#bbaa85' : '#c1b394').multiplyScalar(0.94 + rand() * 0.12);
        roadColors.push(col.r, col.g, col.b);
      }
      if (i < 120) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(roadColors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUVs, 2));
    geo.setIndex(indices); geo.computeVertexNormals();
    const roadMesh = mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: surfaceTexture('gravel'), bumpMap: surfaceTexture('gravel'), bumpScale: .03, roughness: 1, side: THREE.DoubleSide }), false);
    root.add(roadMesh);
    // Broad, feathered wheel marks lie flat on the dirt, never tube-like rails.
    const trackMaterial = new THREE.MeshBasicMaterial({ color: '#7f7458', map: groundDecal('track'), transparent: true, opacity: .14, depthWrite: false });
    for (const side of [-1, 1]) {
      const positions: number[] = [], uv: number[] = [], index: number[] = [];
      const halfWidth = r === 2 ? .13 : .29;
      for (let i = 0; i <= 160; i++) {
        const p = road.getPoint(i / 160), tangent = road.getTangent(i / 160);
        const nx = -tangent.z, nz = tangent.x;
        for (const edge of [-1, 1]) {
          const offset = side * width * .20 + edge * halfWidth;
          const x = p.x + nx * offset, z = p.z + nz * offset;
          positions.push(x, groundHeight(x, z) + .044, z); uv.push((edge + 1) / 2, i / 160 * roadLength / 4);
        }
        if (i < 160) { const n = i * 2; index.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.setIndex(index); geometry.computeVertexNormals();
      const track = new THREE.Mesh(geometry, trackMaterial); track.renderOrder = -2; root.add(track);
    }
  }

  function nearRoad(x: number, z: number, clearance: number) {
    for (const road of roads) {
      for (let t = 0; t <= 1; t += 0.02) {
        const p = road.getPoint(t);
        if ((p.x - x) ** 2 + (p.z - z) ** 2 < clearance * clearance) return true;
      }
    }
    return false;
  }
  function clearing(x: number, z: number) {
    return (x > -27 && x < 16 && z > -21 && z < 23)
      || (Math.hypot(x - 36, z + 23) < 15)
      || (Math.hypot(x - SHOP.center.x, (z - 21) * 0.95) < 20)
      || (Math.hypot(x + 27, z + 45) < 13)
      || (Math.hypot((x - 55) / 1.3, z + 51) < 21)
      || nearRoad(x, z, 4.5);
  }

  // Scandinavian spruce forest: four instanced meshes for hundreds of trees.
  const treeData: { x: number; z: number; base: number; scale: number; rot: number; hue: number }[] = [];
  for (let i = 0; i < 920; i++) {
    const x = (rand() - 0.5) * 198, z = (rand() - 0.5) * 198;
    if (clearing(x, z)) continue;
    const size = 0.65 + rand() * 1.0;
    treeData.push({ x, z, base: groundHeight(x, z), scale: size, rot: rand() * Math.PI * 2, hue: rand() });
    if (Math.abs(x) < 85 && Math.abs(z) < 85) colliders.push({ type: 'circle', x, z, radius: 0.35 * size });
  }
  // Deliberate silhouettes frame the yard without obscuring the playable centre.
  for (const [x, z, s] of [[-27, -8, 1.65], [-29, 9, 1.4], [18, -18, 1.45], [-21, -25, 1.7], [25, 16, 1.2], [-34, 20, 1.3]]) {
    if (Math.hypot(x - SHOP.center.x, z - 21) < 20) continue;
    treeData.push({ x, z, base: groundHeight(x, z), scale: s, rot: rand() * 6, hue: rand() });
    colliders.push({ type: 'circle', x, z, radius: 0.4 * s });
  }
  const dummy = new THREE.Object3D();
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.26, 6.2, 8), texturedMaterial('bark', '#846953'), treeData.length);
  trunk.castShadow = true; trunk.receiveShadow = true;
  root.add(trunk);
  const layers = [
    { y: 4.2, r: 2.2, h: 4.5, color: '#285a43' },
    { y: 6.4, r: 1.82, h: 4.2, color: '#356b4b' },
    { y: 8.3, r: 1.23, h: 3.5, color: '#4d8055' },
  ].map(l => {
    const obj = new THREE.InstancedMesh(firCanopy(l.r, l.h), new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .95 }), treeData.length);
    obj.castShadow = true; obj.receiveShadow = true; root.add(obj);
    // reach: kronans radie kring sin mittpunkt, räknad en gång i stället för per bildruta.
    return { ...l, obj, reach: Math.hypot(l.r, l.h / 2) };
  });
  const maxReach = Math.max(...layers.map(l => l.reach)) * 1.75 + .45;
  treeData.forEach((t, i) => {
    dummy.position.set(t.x, t.base + 3.1 * t.scale, t.z);
    dummy.rotation.set(0, t.rot, 0); dummy.scale.setScalar(t.scale); dummy.updateMatrix();
    trunk.setMatrixAt(i, dummy.matrix);
    for (const layer of layers) {
      dummy.position.y = t.base + layer.y * t.scale;
      dummy.updateMatrix(); layer.obj.setMatrixAt(i, dummy.matrix);
      col.set(layer.color).multiplyScalar(0.85 + t.hue * 0.30);
      layer.obj.setColorAt(i, col);
    }
  });

  // Silver birches use one instanced crown mesh, so nearby leaves can be
  // cut away without hiding a whole colour batch or adding dozens of draw calls.
  const birchPositions = [[-20, 9, 1.0], [-23, 15, 1.1], [-20, -15, 1.15], [14, -14, 1.1], [21, 7, 1.18], [38, -37, 0.95], [33, -42, 1.12], [-18, 19, 0.85], [-4, -20, 1.05], [48, -33, 1.15]];
  const birchLeaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95, flatShading: true }), birchPositions.length * 5);
  birchLeaves.name = 'Björkkronor'; birchLeaves.castShadow = true; birchLeaves.receiveShadow = true;
  const birchMatrices: THREE.Matrix4[] = [];
  birchPositions.forEach(([x, z, scale], treeIndex) => {
    const tree = new THREE.Group();
    cylinder(tree, 0.12, 0.24, 6.1, '#d9d6b6', 0, 3.05, 0, 7);
    for (let y = .8; y < 5.5; y += .64) box(tree, .29, .065, .22, '#77755b', .01, y, .02);
    for (let j = 0; j < 5; j++) {
      const angle = j * 2.4, y = 5.2 + j * .39;
      const dx = Math.sin(angle) * 1.2, dz = Math.cos(angle) * 1.1;
      beam(tree, new THREE.Vector3(0, 3.9, 0), new THREE.Vector3(dx, y, dz), .06, '#bab998');
      dummy.position.set(x + dx * scale, (y + .9) * scale, z + dz * scale);
      dummy.rotation.set(0, 0, 0); dummy.scale.set(1.64 * scale, 1.968 * scale, 1.558 * scale); dummy.updateMatrix();
      const index = treeIndex * 5 + j;
      birchMatrices[index] = dummy.matrix.clone(); birchLeaves.setMatrixAt(index, dummy.matrix);
      col.set(['#96ab63', '#b1b96d', '#8fa263'][j % 3]); birchLeaves.setColorAt(index, col);
    }
    tree.scale.setScalar(scale); tree.position.set(x, 0, z); root.add(tree);
    colliders.push({ type: 'circle', x, z, radius: .35 });
  });
  birchLeaves.computeBoundingSphere(); root.add(birchLeaves);
  for (const layer of layers) layer.obj.computeBoundingSphere();

  // Cut away crowns that obscure the camera-to-player/sight lines.
  // Trunks and physical bullet blockers remain intact. Restore the exact original
  // instance matrices when the rifle is lowered; never move the camera to a target.
  const hiddenCrowns = new Set<number>(), hiddenBirches = new Set<number>();
  const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  const sightLine = new THREE.Line3(), playerLine = new THREE.Line3();
  const crownCentre = new THREE.Vector3(), nearestCrown = new THREE.Vector3();
  /** Sant om en krona med mittpunkt crownCentre och radie radius skär kamera–spelare- eller siktlinjen. */
  const crownBlocks = (radius: number) =>
    crownCentre.distanceToSquared(playerLine.closestPointToPoint(crownCentre, true, nearestCrown)) < radius * radius
    || crownCentre.distanceToSquared(sightLine.closestPointToPoint(crownCentre, true, nearestCrown)) < radius * radius;
  // Körs varje bildruta: indexerade loopar utan closures eller nya vektorer, och
  // träd långt från linjerna avfärdas med en billig rutkontroll innan linjematten.
  const updateAimingFoliage = (camera: THREE.Vector3, focus: THREE.Vector3, aim: THREE.Vector3 | null) => {
    if (!aim && !hiddenCrowns.size && !hiddenBirches.size) return;
    playerLine.set(camera, focus);
    sightLine.set(camera, aim ?? focus);
    const far = aim ?? focus;
    const minX = Math.min(camera.x, focus.x, far.x) - maxReach, maxX = Math.max(camera.x, focus.x, far.x) + maxReach;
    const minZ = Math.min(camera.z, focus.z, far.z) - maxReach, maxZ = Math.max(camera.z, focus.z, far.z) + maxReach;
    let changed = false;
    for (let index = 0; index < treeData.length; index++) {
      const tree = treeData[index];
      let hidden = false;
      if (aim && tree.x > minX && tree.x < maxX && tree.z > minZ && tree.z < maxZ) {
        for (let l = 0; l < layers.length && !hidden; l++) {
          const layer = layers[l];
          crownCentre.set(tree.x, tree.base + layer.y * tree.scale, tree.z);
          hidden = crownBlocks(layer.reach * tree.scale + .45);
        }
      }
      if (hidden === hiddenCrowns.has(index)) continue;
      if (hidden) hiddenCrowns.add(index); else hiddenCrowns.delete(index);
      dummy.rotation.set(0, tree.rot, 0);
      dummy.scale.setScalar(hidden ? 0 : tree.scale);
      for (let l = 0; l < layers.length; l++) {
        dummy.position.set(tree.x, tree.base + layers[l].y * tree.scale, tree.z);
        dummy.updateMatrix(); layers[l].obj.setMatrixAt(index, dummy.matrix);
      }
      changed = true;
    }
    if (changed) for (let l = 0; l < layers.length; l++) layers[l].obj.instanceMatrix.needsUpdate = true;
    let birchChanged = false;
    for (let index = 0; index < birchPositions.length; index++) {
      const birch = birchPositions[index];
      const x = birch[0], z = birch[1], scale = birch[2];
      crownCentre.set(x, 6.9 * scale, z);
      const radius = 3.35 * scale;
      const hidden = !!aim && x > minX && x < maxX && z > minZ && z < maxZ && crownBlocks(radius);
      if (hidden === hiddenBirches.has(index)) continue;
      if (hidden) hiddenBirches.add(index); else hiddenBirches.delete(index);
      for (let j = 0; j < 5; j++) birchLeaves.setMatrixAt(index * 5 + j, hidden ? hiddenMatrix : birchMatrices[index * 5 + j]);
      birchChanged = true;
    }
    if (birchChanged) birchLeaves.instanceMatrix.needsUpdate = true;
  };

  // Low, faceted ridgelines hold the horizon behind the tree line.
  for (let j = 0; j < 15; j++) {
    const mountain = mesh(new THREE.IcosahedronGeometry(1, 1), ['#6f9092', '#8da7a4', '#a5b9ae'][j % 3], false);
    mountain.position.set((j - 7) * 22, 0, -119 - rand() * 17);
    mountain.scale.set(30 + rand() * 22, 17 + rand() * 16, 24);
    root.add(mountain);
  }

  const shop = createShop();
  root.add(shop.root);
  const sx = SHOP.center.x, sz = SHOP.center.z;
  colliders.push(
    { type: 'box', x: sx - 7, z: sz, w: 0.25, d: 10.6 },
    { type: 'box', x: sx + 7, z: sz, w: 0.25, d: 10.6 },
    { type: 'box', x: sx, z: sz - 5.2, w: 14.2, d: 0.25 },
    { type: 'box', x: sx - 4.22, z: sz + 5.2, w: 5.6, d: 0.25 },
    { type: 'box', x: sx + 4.22, z: sz + 5.2, w: 5.6, d: 0.25 },
    { type: 'box', x: SHOP.meat.x, z: SHOP.meat.z, w: 3.7, d: 1.65 },
    { type: 'box', x: sx + 4.65, z: sz + 2.7, w: 2.6, d: 1.33 },
    { type: 'box', x: sx + 2.5, z: sz - 1.9, w: 2.25, d: 1.08 },
    { type: 'box', x: sx - 2.55, z: sz - 4.70, w: 6.65, d: 0.66 },
  );
  cylinder(root, 0.095, 0.11, 2.8, '#8b7d60', 23, 1.4, 25);
  const shopSign = sign(root, 'MYRBODEN →', 23, 2.37, 25, 4.0, 0.72, '#f0dfbf');
  shopSign.rotation.y = -0.25;

  const home = createHouse();
  home.position.set(HOME.center.x, 0, HOME.center.z);
  root.add(home);
  mergeStaticMeshes(home);
  const homeRoom = createHomeInterior();
  root.add(homeRoom.interior, homeRoom.staircase, homeRoom.upstairs.root);
  colliders.push(
    { type: 'box', x: -15.5, z: -6, w: 0.24, d: 8.25 },
    { type: 'box', x: -4.5, z: -6, w: 0.24, d: 8.25 },
    { type: 'box', x: -10, z: -10, w: 11.25, d: 0.24 },
    { type: 'box', x: -11.6, z: -2, w: 7.75, d: 0.24 },
    { type: 'box', x: -5.23, z: -2, w: 1.45, d: 0.24 },
    ...homeRoom.colliders,
  );
  // The porch is accessible at the sides, the steps lead into the front garden.
  const rurikHome = createHouse('#c39a52', 0.79, 'VERKSTAD');
  rurikHome.position.set(38, 0, -26);
  root.add(rurikHome);
  colliders.push({ type: 'box', x: 38, z: -26, w: 9.0, d: 6.8 });

  // Timber outbuilding and a lean-to, with the familiar Falu-red walls.
  const shed = new THREE.Group();
  box(shed, 5.9, 3.2, 4.6, '#864838', 0, 1.7, 0);
  box(shed, 6.5, 0.19, 5.3, '#606253', 0, 3.4, 0).rotation.x = -0.07;
  for (let x = -2.8; x < 3; x += 0.37) box(shed, 0.04, 3.1, 0.04, '#693f30', x, 1.7, 2.32);
  box(shed, 2.5, 2.6, 0.12, '#5f5140', 0, 1.45, 2.36);
  const brace = box(shed, 0.12, 3.1, 0.06, '#9e8860', 0, 1.45, 2.44); brace.rotation.z = 0.73;
  box(shed, 2.65, 0.14, 0.14, '#c8bd93', 0, 2.80, 2.42);
  shed.position.set(-22, 0, -14); root.add(shed);
  colliders.push({ type: 'box', x: -22, z: -14, w: 6.1, d: 4.9 });

  const logs = createLogPile(); logs.position.set(-15.5, 0, -0.7); logs.rotation.y = 0.1; root.add(logs);
  const logs2 = createLogPile(); logs2.position.set(-24, 0, -10.3); root.add(logs2);
  cylinder(root, 0.59, 0.72, 0.75, '#746341', -15.7, 0.375, 3, 8);
  cylinder(root, 0.57, 0.57, 0.024, '#b69a68', -15.7, 0.766, 3, 8);
  const axe = new THREE.Group();
  box(axe, 0.09, 1.24, 0.09, '#ae8960', 0, 0.54, 0);
  box(axe, 0.37, 0.29, 0.085, '#626e65', 0.10, 1.1, 0);
  axe.rotation.z = -0.37; axe.position.set(-15.7, 0.76, 3); root.add(axe);
  for (let j = 0; j < 13; j++) {
    const log = cylinder(root, 0.06 + rand() * 0.06, 0.08, 0.25 + rand() * 0.5, '#c3a376', -15.7 + (rand() - 0.5) * 3, 0.08, 3 + (rand() - 0.5) * 3, 5);
    log.rotation.z = Math.PI / 2; log.rotation.y = rand() * 4;
  }

  // Rustic fences, deliberately open at the driveway.
  function fence(x1: number, z1: number, x2: number, z2: number) {
    const length = Math.hypot(x2 - x1, z2 - z1), count = Math.ceil(length / 2.8);
    for (let i = 0; i <= count; i++) {
      const x = THREE.MathUtils.lerp(x1, x2, i / count), z = THREE.MathUtils.lerp(z1, z2, i / count);
      box(root, 0.17, 1.4, 0.17, '#b1a178', x, 0.70, z);
      const cap = mesh(new THREE.ConeGeometry(0.14, 0.19, 4), '#c2b18b'); cap.rotation.y = Math.PI / 4; cap.position.set(x, 1.48, z); root.add(cap);
      if (i < count) {
        const xx = THREE.MathUtils.lerp(x1, x2, (i + 1) / count), zz = THREE.MathUtils.lerp(z1, z2, (i + 1) / count);
        for (const y of [0.48, 1.04]) {
          const plank = box(root, length / count + 0.1, 0.13, 0.09, '#b6a57e', (x + xx) / 2, y, (z + zz) / 2);
          plank.rotation.y = -Math.atan2(zz - z, xx - x);
        }
      }
    }
  }
  fence(-22, 17, -3, 17); fence(16, 15, 24, 7); fence(-25, -3, -25, 12);
  fence(28, -20, 28, -30); fence(45, -19, 49, -27);

  // Stepping stones and a battered garden bench.
  for (let j = 0; j < 6; j++) {
    const stone = mesh(new THREE.CylinderGeometry(0.48 + rand() * 0.15, 0.53, 0.09, 6), '#b3af91', false);
    stone.scale.z = 0.73; stone.position.set(-6.95 + (rand() - 0.5) * 0.22, 0.055, 2 + j * 1.12); stone.rotation.y = rand() * 5; root.add(stone);
  }
  function bench(x: number, z: number, rotation: number) {
    const b = new THREE.Group();
    for (const s of [-1, 1]) { box(b, 0.18, 0.78, 0.75, '#5d614a', s * 0.99, 0.4, 0); box(b, 0.13, 1.5, 0.12, '#5d614a', s * 0.99, 0.79, -0.39); }
    for (let i = 0; i < 3; i++) box(b, 2.6, 0.11, 0.22, '#9c8056', 0, 0.83, (i - 1) * 0.25);
    for (let i = 0; i < 2; i++) box(b, 2.5, 0.23, 0.09, '#9c8056', 0, 1.19 + i * 0.28, -0.4);
    b.position.set(x, 0, z); b.rotation.y = rotation; root.add(b);
  }
  bench(-2.2, -0.4, -0.10);
  const table = new THREE.Group();
  box(table, 1.31, 0.11, 1.1, '#9b855a', 0, 0.90, 0);
  for (const x of [-0.45, 0.45]) for (const z of [-0.36, 0.36]) box(table, 0.12, 0.9, 0.12, '#75694c', x, 0.44, z);
  cylinder(table, 0.085, 0.082, 0.42, '#b25b39', -0.27, 1.14, 0, 10);
  cylinder(table, 0.09, 0.09, 0.06, '#4f5846', -0.27, 1.38, 0, 10);
  cylinder(table, 0.085, 0.07, 0.16, '#ddd4b4', 0.23, 1.045, 0.11, 10);
  table.position.set(-2.0, 0, 1.6); root.add(table);

  // Laundry in the warm late-summer air.
  for (const x of [-21, -15]) cylinder(root, 0.06, 0.065, 2.9, '#807256', x, 1.45, 6);
  beam(root, new THREE.Vector3(-21, 2.75, 6), new THREE.Vector3(-15, 2.75, 6), 0.015, '#b8b699');
  for (let j = 0; j < 4; j++) {
    const shirt = box(root, j === 1 ? 0.75 : 0.65, j === 1 ? 1.25 : 0.98, 0.018, ['#e5dfbd', '#9fae9a', '#c7aa7e', '#c3c4ad'][j], -20.3 + j * 1.35, j === 1 ? 2.09 : 2.23, 6);
    shirt.rotation.y = (rand() - 0.5) * 0.18;
  }

  // Hand-painted signs, mailboxes, flower pots and scraps of everyday life.
  for (const [x, z, text, rot] of [[11, 15, 'GRÅMYREN', -0.13], [11, -9, 'VERKSTAD →', 0.2], [-7, -23, 'JAKTMARK →', 0.7]] as [number, number, string, number][]) {
    cylinder(root, 0.11, 0.11, 2.8, '#7e7050', x, 1.4, z);
    const s = sign(root, text, x, 2.45, z + 0.02, 2.8, 0.64); s.rotation.y = rot;
  }
  cylinder(root, 0.09, 0.09, 1.35, '#a19776', -1, 0.675, 16.3);
  box(root, 0.59, 0.52, 0.45, '#50695b', -1, 1.53, 16.3);
  box(root, 0.63, 0.07, 0.50, '#344e41', -1, 1.81, 16.3);
  box(root, 0.37, 0.028, 0.02, '#24392e', -1, 1.65, 16.54);
  for (const x of [-8.9, -4.3]) {
    cylinder(root, 0.36, 0.25, 0.45, '#b7734c', x, 0.24, -1.45, 9);
    const bush = mesh(new THREE.IcosahedronGeometry(0.45, 0), '#6e8550'); bush.position.set(x, 0.70, -1.45); root.add(bush);
    for (let j = 0; j < 5; j++) {
      const bloom = mesh(new THREE.IcosahedronGeometry(0.10, 0), '#e7c184', false); bloom.position.set(x + (rand() - 0.5) * 0.55, 0.9 + rand() * 0.22, -1.45 + (rand() - 0.5) * 0.5); root.add(bloom);
    }
  }
  const barrel = cylinder(root, 0.47, 0.47, 1.05, '#797d65', -17, 0.54, -7, 12);
  for (const y of [0.19, 0.85]) cylinder(root, 0.488, 0.488, 0.06, '#545c4b', -17, y, -7, 12);
  for (let i = 0; i < 3; i++) {
    const tire = mesh(new THREE.TorusGeometry(0.46, 0.18, 5, 12), '#384333'); tire.rotation.x = Math.PI / 2; tire.position.set(-19.6, 0.20 + i * 0.32, -9); root.add(tire);
  }

  const toolbox = createToolbox();
  toolbox.position.set(32.3, 1.1, -19.6); root.add(toolbox);
  box(root, 2.10, 0.14, 1.08, '#9b865d', 32.3, 1.05, -19.6);
  for (const x of [31.45, 33.15]) for (const z of [-19.95, -19.25]) box(root, 0.13, 1.03, 0.13, '#7e7453', x, 0.50, z);
  bench(42, -20.7, 0.25);
  // Rurik's suspiciously well-kept vegetables.
  box(root, 4.2, 0.12, 3.9, '#71684b', 47, 0.08, -20);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const cabbage = mesh(new THREE.IcosahedronGeometry(0.30, 0), '#778753'); cabbage.position.set(45.5 + i * 0.96, 0.29, -21.4 + j * 0.88); root.add(cabbage);
  }

  // A simple hunting platform, and two entirely fictional low-poly moose.
  const tower = new THREE.Group();
  for (const x of [-1.1, 1.1]) for (const z of [-1.0, 1.0]) box(tower, 0.23, 4.7, 0.23, '#8c7f59', x, 2.35, z);
  box(tower, 2.75, 0.2, 2.6, '#968760', 0, 3.3, 0);
  for (const x of [-1.1, 1.1]) box(tower, 0.13, 0.94, 2.25, '#aa9770', x, 3.84, 0);
  box(tower, 2.4, 0.94, 0.13, '#aa9770', 0, 3.84, -1.1);
  const roof = box(tower, 3.1, 0.16, 3.0, '#647056', 0, 4.85, 0); roof.rotation.x = -0.13;
  for (let i = 0; i < 8; i++) box(tower, 0.70, 0.09, 0.14, '#b4a075', 0, 0.3 + i * 0.42, 1.4);
  tower.position.set(-36, 0, -40); root.add(tower);
  const elk: ElkEntity[] = [];
  for (const [x, z, phase] of [[-28, -48, 0.2], [-19, -43, 2.5], [-34, -53, 4.5]]) {
    const model = createElk(); model.root.position.set(x, 0, z); model.root.rotation.y = phase; root.add(model.root);
    elk.push({ model, origin: new THREE.Vector3(x, 0, z), alive: true, respawnAt: 0, phase });
  }

  // Myrsjön: en blank sjö i en sänka (se groundHeight), vassruggar och en timmerbrygga.
  // Vattenytan ligger strax under den platta marknivån; marken sluttar ner genom ytan så att
  // strandlinjen blir mjuk i stället för en kant där vattnet svävar ovanpå gräset.
  const water = mesh(new THREE.CircleGeometry(1, 50), new THREE.MeshStandardMaterial({ color: '#447f88', bumpMap: surfaceTexture('water'), bumpScale: .16, roughness: .25, metalness: .34, transparent: true, opacity: .94 }), false);
  water.rotation.x = -Math.PI / 2; water.scale.set(LAKE.rx, LAKE.rz, 1); water.position.set(LAKE.x, LAKE.surfaceY, LAKE.z); root.add(water);
  // Water is not walkable; the western bank and jetty remain accessible.
  colliders.push({ type: 'circle', x: 57, z: -53, radius: 13.3 });
  for (let j = 0; j < 8; j++) box(root, 3.3, 0.17, 0.69, '#a79977', 40.2 + j * 0.58, 0.41, -44).rotation.y = Math.PI / 2;
  for (const x of [40, 44]) for (const z of [-45.4, -42.6]) cylinder(root, 0.10, 0.12, 1.6, '#796f50', x, 0.07, z, 6);
  for (let j = 0; j < 90; j++) {
    const a = rand() * Math.PI * 2, r = 0.96 + rand() * 0.10, height = 0.7 + rand() * 0.7;
    const x = LAKE.x + Math.cos(a) * LAKE.rx * r, z = LAKE.z + Math.sin(a) * LAKE.rz * r;
    cylinder(root, 0.012, 0.026, height, '#77814c', x, groundHeight(x, z) + height / 2 - 0.05, z, 4);
  }

  // Instanced meadow tufts and pale granite: density without thousands of draw calls.
  const grassShape = meadowGrass();
  const grass = new THREE.InstancedMesh(grassShape, new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, side: THREE.DoubleSide, roughness: 1 }), 2600);
  let n = 0;
  for (let i = 0; i < 5000 && n < 2600; i++) {
    const x = (rand() - 0.5) * 145, z = (rand() - 0.5) * 145;
    if ((Math.abs(x - SHOP.center.x) < 13 && z > SHOP.center.z - 7 && z < SHOP.center.z + 18) || nearRoad(x, z, 3.0) || (x > -16 && x < -4 && z > -11 && z < -1) || Math.hypot((x - 55) / 1.3, z + 52) < 16) continue;
    dummy.position.set(x, groundHeight(x, z), z); dummy.rotation.set(0, rand() * 6.28, 0); dummy.scale.setScalar(0.65 + rand() * 1.2); dummy.updateMatrix();
    grass.setMatrixAt(n, dummy.matrix);
    col.set(['#759750', '#9bad63', '#4f7544', '#b4b57c'][i % 4]); grass.setColorAt(n, col); n++;
  }
  grass.count = n; root.add(grass);
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', map: surfaceTexture('gravel'), roughness: 1, flatShading: true }), 160);
  let rockCount = 0;
  for (let i = 0; i < 230 && rockCount < 160; i++) {
    const x = (rand() - 0.5) * 167, z = (rand() - 0.5) * 167;
    if (clearing(x, z)) continue;
    const s = 0.28 + rand() * 1.15;
    dummy.position.set(x, groundHeight(x, z) + s * 0.30, z); dummy.rotation.set(rand() * 0.3, rand() * 6.28, 0); dummy.scale.set(s * 1.3, s * 0.68, s); dummy.updateMatrix();
    rocks.setMatrixAt(rockCount, dummy.matrix); col.set('#aaa99b').multiplyScalar(0.82 + rand() * 0.3); rocks.setColorAt(rockCount, col); rockCount++;
  }
  rocks.count = rockCount; rocks.castShadow = true; rocks.receiveShadow = true; root.add(rocks);
  root.add(summerFlowers());

  const smoke: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const puff = mesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshStandardMaterial({ color: '#e3e3c9', transparent: true, opacity: 0.17, depthWrite: false }), false);
    puff.position.set(-12.6 + i * 0.22, 8.7 + i * 0.76, -6.8); puff.scale.setScalar(0.6 + i * 0.12); root.add(puff); smoke.push(puff);
  }
  const clouds: THREE.Group[] = [];
  for (let i = 0; i < 12; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 5; j++) {
      const p = mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#eeeee0', transparent: true, opacity: 0.55, depthWrite: false }), false);
      p.position.set(j * 3.1, Math.sin(j * 1.7) * 0.9, rand() * 2); p.scale.set(5, 1.5 + rand(), 2.6); cloud.add(p);
    }
    cloud.position.set((rand() - 0.5) * 220, 31 + rand() * 16, -60 - rand() * 110); root.add(cloud); clouds.push(cloud);
  }
  const birds: THREE.Group[] = [];
  for (let i = 0; i < 6; i++) {
    const bird = new THREE.Group();
    for (const s of [-1, 1]) {
      const wing = box(bird, 0.46, 0.035, 0.13, '#536853', s * 0.20, 0, 0); wing.rotation.z = s * 0.24;
    }
    bird.position.set(3 + i * 2, 19 + i * 0.3, -30 + i); root.add(bird); birds.push(bird);
  }
  mergeStaticMeshes(root, new Set<THREE.Object3D>([...elk.map(e => e.model.root), toolbox, home, homeRoom.interior, homeRoom.staircase, homeRoom.upstairs.root, shop.structure, shop.loot, ...smoke, ...clouds, water, ...birds]));
  return { root, colliders, elk, toolbox, smoke, clouds, water, birds, shop, updateAimingFoliage, home: { shell: home, ...homeRoom } };
}
