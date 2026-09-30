import * as THREE from 'three';
import { box, cylinder, ellipsoid, mesh, roundedBox, sign } from './primitives';
import { createHuntingRifle } from './equipment';
import { mergeStaticMeshes } from './optimize';
import { HOME } from './types';
import { createUpstairs, createWoodenStaircase } from './upstairs';
import { createLoft } from './loft';
import { logWall, plankWall } from './timber';
import { createOldFridge, createOldSink, createOldTelevision, createWornSofa, oldRug } from './furniture';

/** An accessible cutaway room inside the existing red house. The outside keeps
 * its original silhouette; this room is shown only while a playable character is inside. */
export function createHomeInterior() {
  const interior = new THREE.Group();
  interior.name = 'Vännernas stuga — spelbar interiör';
  interior.position.set(HOME.center.x, 0, HOME.center.z);
  const colliders: { type: 'box'; x: number; z: number; w: number; d: number }[] = [];
  const blockFurniture = (x: number, z: number, w: number, d: number) => colliders.push({ type: 'box', x: HOME.center.x + x, z: HOME.center.z + z, w, d });
  box(interior, 11.0, 0.18, 8.0, '#837354', 0, 0.445, 0);
  for (let x = -5.33; x < 5.4; x += 0.38) {
    box(interior, 0.36, 0.025, 7.91, ['#a88d61', '#b19a73', '#99815b'][Math.round((x + 5.33) / 0.38) % 3], x, 0.547, 0);
    for (const z of [-1.45, 1.38]) box(interior, 0.35, 0.007, 0.017, '#99845f', x, 0.563, z + (Math.round(x * 10) % 3) * 0.23);
  }
  // Stugan är timrad: liggande furustockar med knutar i hörnen. Långsidorna ligger
  // ett halvt varv förskjutna så att knutarna griper i varandra som i en riktig timring.
  for (const x of [-5.43, 5.43]) logWall(interior, [x, -3.92], [x, 3.93], HOME.groundY - 0.03, 4, { stagger: true, tone: x < 0 ? 0 : 2 });
  logWall(interior, [-5.43, -3.92], [5.43, -3.92], HOME.groundY - 0.03, 5, { tone: 1 });
  // Den låga framväggen är delad kring ytterdörren, precis som utsidan; dörrposterna är grövre virke.
  logWall(interior, [-5.43, 3.93], [2.33, 3.93], HOME.groundY - 0.03, 2, { tone: 3, endOverhang: 0 });
  logWall(interior, [4.04, 3.93], [5.43, 3.93], HOME.groundY - 0.03, 2, { tone: 2, startOverhang: 0 });
  for (const x of [2.40, 3.97]) roundedBox(interior, 0.14, 0.86, 0.24, '#8d6b45', x, HOME.groundY + 0.40, 3.93, 0.02);
  box(interior, 1.53, 0.025, 1.08, '#64765b', 3.05, 0.574, 2.91);
  for (let x = 2.40; x < 3.8; x += 0.19) box(interior, 0.045, 0.008, 0.97, '#9da585', x, 0.595, 2.91);

  // Old patterned wallpaper, scratched floorboards and a threadbare rug.
  for (const x of [-5.30, 5.30]) box(interior, 0.085, 0.10, 7.85, '#94815d', x, 0.62, 0);
  box(interior, 10.65, 0.10, 0.07, '#94815d', 0, 0.62, -3.81);
  for (let i = 0; i < 38; i++) {
    const scratch = box(interior, 0.014, 0.003, 0.05 + (i % 5) * 0.055, i % 3 ? '#c3aa7e' : '#85714e', -4.8 + (i * 1.63) % 9.5, 0.569, -3.5 + (i * 1.71) % 7.0);
    scratch.rotation.y = (i % 4) * 0.15;
  }
  const rug = mesh(new THREE.PlaneGeometry(3.10, 4.13), oldRug(), false);
  rug.rotation.x = -Math.PI / 2; rug.position.set(3.53, 0.580, -0.87); interior.add(rug);
  for (let i = 0; i < 35; i++) for (const z of [-2.98, 1.25]) {
    box(interior, 0.015, 0.008, 0.08 + (i % 3) * 0.014, '#b29a6c', 2.05 + i * 0.087, 0.583, z);
  }

  // The TV really faces the main sofa. Its screen is also visible in the cutaway.
  const sofa = createWornSofa(); sofa.position.set(3.65, 0.565, 0.30); sofa.rotation.y = Math.PI; interior.add(sofa);
  blockFurniture(3.65, 0.30, 2.91, 1.38);
  const tv = createOldTelevision(); tv.position.set(3.65, 0.565, -2.70); interior.add(tv);
  blockFurniture(3.65, -2.67, 1.75, 1.10);
  const coffeeTable = new THREE.Group();
  box(coffeeTable, 1.22, 0.09, 0.72, '#9d794f', 0, 0.63, 0);
  for (const x of [-0.47, 0.47]) for (const z of [-0.24, 0.24]) box(coffeeTable, 0.085, 0.64, 0.085, '#6e5339', x, 0.32, z);
  coffeeTable.position.set(3.55, 0.565, -1.08); interior.add(coffeeTable);
  blockFurniture(3.55, -1.08, 1.22, 0.72);
  cylinder(coffeeTable, 0.085, 0.065, 0.16, '#bfae83', -0.30, 0.75, 0.13, 16);
  cylinder(coffeeTable, 0.071, 0.071, 0.004, '#67543a', -0.30, 0.832, 0.13, 16);
  const ring = mesh(new THREE.TorusGeometry(0.095, 0.009, 6, 20), '#7d6341'); ring.rotation.x = Math.PI / 2; ring.position.set(-0.29, 0.679, -0.13); coffeeTable.add(ring);
  roundedBox(coffeeTable, 0.12, 0.035, 0.34, '#3f4436', 0.34, 0.696, 0.02, 0.011).rotation.y = -0.14;
  for (let i = 0; i < 6; i++) box(coffeeTable, 0.042, 0.008, 0.028, i ? '#939783' : '#a16a45', 0.33, 0.721, -0.10 + i * 0.041);
  box(coffeeTable, 0.33, 0.015, 0.41, '#cabe95', 0.02, 0.686, -0.04).rotation.y = 0.10;
  for (let i = 0; i < 6; i++) box(coffeeTable, 0.22, 0.004, 0.006, '#989575', 0.02, 0.699, -0.18 + i * 0.048);

  // A recessed sink piled with dishes, and a small yellowed fridge beside it.
  const sink = createOldSink(); sink.position.set(-1.08, 0.565, -3.38); interior.add(sink);
  blockFurniture(-1.08, -3.38, 2.48, 0.97);
  const fridge = createOldFridge();
  fridge.root.position.set(HOME.fridge.x - HOME.center.x, 0.565, HOME.fridge.z - HOME.center.z); interior.add(fridge.root);
  blockFurniture(fridge.root.position.x, fridge.root.position.z + 0.08, 1.44, 1.25);

  // Low cutaway partition walls make distinct TV and dining rooms. The gaps
  // are real, collidable doorways, wide enough for a playable character on keyboard/touch.
  // Innerväggarna är av stående pärlspont, som i timrade stugor.
  const partition = (x: number, z: number, w: number, d: number) => {
    if (w > d) plankWall(interior, [x - w / 2, z], [x + w / 2, z], HOME.groundY, 1.40, d);
    else plankWall(interior, [x, z - d / 2], [x, z + d / 2], HOME.groundY, 1.40, w);
    blockFurniture(x, z, w, d);
  };
  partition(1.83, -3.325, 0.15, 1.15);
  partition(1.83, 0.13, 0.15, 1.30);
  for (const z of [-2.74, -0.53]) box(interior, 0.17, 2.83, 0.10, '#a58a5e', 1.83, HOME.groundY + 1.415, z);
  box(interior, 0.17, 0.10, 2.34, '#a58a5e', 1.83, HOME.groundY + 2.87, -1.635);
  const tvRoomSign = sign(interior, 'TV-RUM', 1.83, HOME.groundY + 2.63, -1.635, 1.18, 0.28, '#dfd0a5'); tvRoomSign.rotation.y = -Math.PI / 2;
  partition(-1.885, 0.52, 3.07, 0.15);
  partition(-0.35, 1.46, 0.15, 1.88);
  for (const z of [2.43, 3.82]) box(interior, 0.17, 2.83, 0.10, '#a58a5e', -0.35, HOME.groundY + 1.415, z);
  box(interior, 0.17, 0.10, 1.52, '#a58a5e', -0.35, HOME.groundY + 2.87, 3.125);
  const diningSign = sign(interior, 'MATPLATS', -0.35, HOME.groundY + 2.63, 3.125, 1.25, 0.28, '#dfd0a5'); diningSign.rotation.y = Math.PI / 2;

  const kitchenTable = new THREE.Group();
  box(kitchenTable, 1.96, 0.13, 1.07, '#bca174', 0, 0.99, 0);
  for (const x of [-0.78, 0.78]) for (const z of [-0.34, 0.34]) box(kitchenTable, 0.12, 1, 0.12, '#88724d', x, 0.50, z);
  for (const x of [-0.50, 0.50]) cylinder(kitchenTable, 0.11, 0.09, 0.20, '#ddd5b5', x, 1.155, 0.1, 12);
  box(kitchenTable, 0.34, 0.03, 0.51, '#e3dbb6', 0, 1.084, -0.08);
  kitchenTable.position.set(-1.95, HOME.groundY, 1.86); interior.add(kitchenTable);
  blockFurniture(-1.95, 1.86, 2.0, 1.10);
  for (const x of [-2.63, -1.27]) {
    box(interior, 0.63, 0.09, 0.60, '#9c845c', x, 1.03, 0.98);
    box(interior, 0.63, 0.74, 0.075, '#a8936b', x, 1.39, 0.69);
    for (const dx of [-0.23, 0.23]) for (const z of [0.77, 1.19]) box(interior, 0.075, 0.50, 0.075, '#857452', x + dx, 0.795, z);
  }
  const staircase = createWoodenStaircase();
  const upstairs = createUpstairs();
  const loft = createLoft();
  // The first low treads can be approached from the dining room; E handles the
  // full climb, so no one can walk into the void or get trapped in the railings.
  blockFurniture(HOME.stairsBase.x - HOME.center.x, 0.81, 1.50, 3.18);

  // The rifle is a separate, removable world item, not a painted-on decoration.
  const rx = HOME.rifle.x - HOME.center.x, rz = HOME.rifle.z - HOME.center.z;
  roundedBox(interior, 1.18, 1.73, 0.15, '#806548', rx, 1.46, rz - 0.12, 0.025);
  for (const x of [rx - 0.50, rx + 0.50]) roundedBox(interior, 0.09, 1.83, 0.26, '#b89b66', x, 1.48, rz - 0.09, 0.02);
  roundedBox(interior, 1.20, 0.105, 0.52, '#a89060', rx, 0.62, rz + 0.08, 0.025);
  for (const y of [1.08, 1.88]) roundedBox(interior, 0.49, 0.07, 0.23, '#bcac7f', rx, y, rz + 0.08, 0.02);
  sign(interior, 'JAKTGEVÄR', rx, 2.54, rz, 1.60, 0.28, '#dfd2a9');
  const rifle = createHuntingRifle();
  rifle.position.set(rx, 0.75, rz + 0.21); rifle.rotation.z = -0.08;
  interior.add(rifle);
  blockFurniture(rx, rz - 0.12, 1.2, 0.40);
  // Boots, a hat hook and a little bit of everyday clutter.
  for (const x of [3.98, 4.35]) roundedBox(interior, 0.23, 0.30, 0.42, '#55533c', x, 0.72, 2.87, 0.07);
  cylinder(interior, 0.30, 0.23, 0.42, '#b58259', -4.78, 0.77, -2.05, 10);
  for (let j = 0; j < 5; j++) ellipsoid(interior, '#7c925c', -4.78 + Math.cos(j * 2.4) * 0.20, 1.24 + (j % 2) * 0.17, -2.05 + Math.sin(j * 2.4) * 0.15, 0.19, 0.31, 0.14, 12);
  mergeStaticMeshes(interior, new Set([rifle, fridge.root]));
  interior.visible = false;
  return { interior, rifle, fridge, colliders, staircase, upstairs, loft };
}
