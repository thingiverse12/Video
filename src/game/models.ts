import * as THREE from 'three';
import { beam, box, cylinder, material, mesh, sign, roundedBox, smoothMaterial } from './primitives';
import { contactShadow, texturedMaterial } from './look';

export * from './primitives';
export { createCharacter, animateCharacter, createShoppingBag } from './characters';
export type { CharacterModel, CharacterKind } from './characters';
export { createCar } from './vehicles';
export type { CarModel } from './vehicles';

export function createHouse(color = '#a74c3b', scale = 1, name = 'HEM LJUVA HEM') {
  const root = new THREE.Group();
  root.add(contactShadow(14.1, 11.5, .26));
  const trim = '#e7e0c6';
  box(root, 11.4, 0.47, 8.4, '#7c8170', 0, 0.235, 0);
  box(root, 11, 4.55, 8, color, 0, 2.61, 0);
  const shadowRed = new THREE.Color(color).multiplyScalar(0.81);
  for (let x = -5.3; x <= 5.4; x += 0.37) {
    box(root, 0.046, 4.48, 0.085, shadowRed, x, 2.59, 4.04);
    box(root, 0.046, 4.48, 0.085, shadowRed, x, 2.59, -4.04);
  }
  for (let z = -3.8; z <= 3.9; z += 0.37) {
    box(root, 0.085, 4.48, 0.047, shadowRed, 5.53, 2.59, z);
    box(root, 0.085, 4.48, 0.047, shadowRed, -5.53, 2.59, z);
  }
  for (const x of [-5.5, 5.5]) for (const z of [-4.01, 4.01]) box(root, 0.24, 4.65, 0.23, trim, x, 2.64, z);

  const gableShape = new THREE.Shape();
  gableShape.moveTo(-4, 4.87); gableShape.lineTo(4, 4.87); gableShape.lineTo(0, 7.47); gableShape.closePath();
  const gableGeom = new THREE.ExtrudeGeometry(gableShape, { depth: 11, bevelEnabled: false });
  const gable = mesh(gableGeom, color);
  gable.rotation.y = Math.PI / 2;
  gable.position.x = -5.5;
  root.add(gable);
  const roofColor = '#535a50';
  const angle = Math.atan2(2.7, 4.6);
  for (const s of [-1, 1]) {
    const roof = box(root, 12.25, 0.18, 5.46, roofColor, 0, 6.10, s * 2.29);
    roof.rotation.x = s * angle;
    for (let x = -6; x <= 6; x += 0.52) {
      const seam = box(root, 0.035, 0.055, 5.44, '#677064', x, 6.21, s * 2.29);
      seam.rotation.x = s * angle;
    }
    const edge = box(root, 12.5, 0.22, 0.18, trim, 0, 4.66, s * 4.61);
    for (const x of [-6.18, 6.18]) {
      const fascia = box(root, 0.18, 0.21, 5.63, trim, x, 6.12, s * 2.3);
      fascia.rotation.x = s * angle;
    }
  }
  box(root, 12.5, 0.18, 0.18, '#71786a', 0, 7.55, 0);
  box(root, 1.00, 1.77, 1.10, '#785d4b', -2.6, 7.71, -0.8);
  box(root, 1.20, 0.17, 1.27, '#59594c', -2.6, 8.6, -0.8);
  for (let y = 7.0; y < 8.5; y += 0.26) box(root, 1.01, 0.035, 1.12, '#9a8870', -2.6, y, -0.8);

  function windowAt(x: number, z: number, side = false, small = false) {
    const group = new THREE.Group();
    const w = small ? 1.17 : 1.62;
    const h = small ? 1.22 : 1.87;
    box(group, w + 0.20, h + 0.22, 0.12, '#6f4b34', 0, 0, 0.02);
    box(group, w, h, 0.13, smoothMaterial('#759ba5', .25, .22), 0, 0, 0.09);
    box(group, w - 0.15, h * 0.45, 0.01, '#c6c9a7', 0, -h * 0.21, 0.16);
    for (const s of [-1, 1]) {
      box(group, 0.14, h + 0.27, 0.16, trim, s * (w / 2 + 0.05), 0, 0.13);
      box(group, w + 0.27, 0.14, 0.18, trim, 0, s * (h / 2 + 0.05), 0.13);
      box(group, 0.18, h - 0.06, 0.019, '#dcd4ad', s * (w / 2 - 0.13), 0, 0.172);
    }
    box(group, 0.065, h, 0.14, trim, 0, 0, 0.18);
    box(group, w, 0.065, 0.15, trim, 0, 0, 0.18);
    box(group, w + 0.4, 0.1, 0.32, trim, 0, -h / 2 - 0.1, 0.21);
    group.position.set(x, 2.77, z);
    if (side) group.rotation.y = Math.PI / 2;
    root.add(group);
  }
  windowAt(-3.4, 4.11);
  windowAt(-0.6, 4.11);
  windowAt(5.57, -1.85, true);
  windowAt(5.57, 1.60, true);
  windowAt(-5.57, 0, true, true);
  box(root, 1.39, 2.72, 0.18, trim, 3.15, 1.84, 4.12);
  box(root, 1.12, 2.47, 0.22, '#5b6655', 3.15, 1.8, 4.16);
  box(root, 0.65, 0.63, 0.05, '#b0b59a', 3.15, 2.38, 4.29);
  box(root, 0.05, 0.64, 0.06, trim, 3.15, 2.38, 4.34);
  box(root, 0.19, 0.055, 0.08, '#b7ac7e', 3.50, 1.52, 4.34);
  box(root, 3.74, 0.35, 2.48, '#9d8a68', 3.04, 0.5, 5.21);
  for (let x = 1.25; x <= 4.9; x += 0.25) box(root, 0.03, 0.018, 2.38, '#766850', x, 0.69, 5.21);
  for (const x of [1.22, 4.87]) {
    box(root, 0.17, 3.25, 0.18, trim, x, 2.28, 6.22);
    box(root, 0.12, 0.14, 2.02, trim, x, 1.48, 5.15);
    for (let z = 4.6; z <= 6.2; z += 0.34) box(root, 0.075, 0.80, 0.074, trim, x, 1.08, z);
  }
  const porchRoof = box(root, 4.24, 0.15, 2.81, roofColor, 3.05, 3.94, 5.3);
  porchRoof.rotation.x = 0.1;
  box(root, 4.26, 0.2, 0.17, trim, 3.05, 3.80, 6.73);
  for (let i = 0; i < 3; i++) box(root, 1.7, 0.18, 0.52, '#aba083', 3.05, 0.12 + i * 0.16, 7.50 - i * 0.47);
  sign(root, name, 3.14, 3.42, 4.32, 2.19, 0.34, '#e3d7ad');
  // A porch lamp and a Swedish pennant.
  box(root, 0.21, 0.38, 0.24, '#303d35', 4.37, 2.99, 4.27);
  box(root, 0.13, 0.22, 0.25, '#efd69d', 4.37, 2.99, 4.31);
  const pole = beam(root, new THREE.Vector3(-4.5, 3.6, 4.3), new THREE.Vector3(-4.5, 5.8, 6.0), 0.03, '#c6c3a7');
  const flag = new THREE.Group();
  flag.position.set(-4.48, 5.5, 5.82);
  box(flag, 0.017, 0.79, 1.28, '#417e9a', 0, -0.35, 0.51);
  box(flag, 0.019, 0.14, 1.29, '#e2ba54', 0, -0.30, 0.51);
  box(flag, 0.022, 0.79, 0.16, '#e2ba54', 0, -0.35, 0.20);
  root.add(flag);
  root.scale.setScalar(scale);
  return root;
}

export function createElk() {
  const root = new THREE.Group();
  const brown = texturedMaterial('fur', '#80694e');
  const dark = '#514b39';
  const torso = mesh(new THREE.SphereGeometry(1, 18, 12), brown);
  torso.scale.set(0.76, 0.95, 1.37);
  torso.position.y = 1.82;
  root.add(torso, contactShadow(2.9, 4.4, .29));
  const neck = roundedBox(root, 0.60, 1.05, 0.66, brown, 0, 2.42, 0.90, .16);
  neck.rotation.x = -0.25;
  const head = roundedBox(root, 0.59, 0.69, 1.00, brown, 0, 2.97, 1.28, .14);
  head.rotation.x = 0.16;
  roundedBox(root, 0.62, 0.43, 0.37, dark, 0, 2.76, 1.75, .12);
  box(root, 0.20, 0.43, 0.20, '#4a4435', 0, 2.40, 1.35);
  const legs: THREE.Group[] = [];
  for (const x of [-0.44, 0.44]) for (const z of [-0.84, 0.78]) {
    const leg = new THREE.Group();
    leg.position.set(x, 1.50, z);
    box(leg, 0.18, 1.48, 0.22, dark, 0, -0.65, 0);
    box(leg, 0.23, 0.2, 0.31, '#393c30', 0, -1.40, 0.04);
    root.add(leg); legs.push(leg);
  }
  for (const s of [-1, 1]) {
    const ear = box(root, 0.49, 0.17, 0.28, dark, s * 0.49, 3.2, 1.05);
    ear.rotation.z = s * 0.35;
    box(root, 0.033, 0.07, 0.08, '#181f1b', s * 0.303, 3.05, 1.52);
    beam(root, new THREE.Vector3(s * 0.22, 3.26, 1.08), new THREE.Vector3(s * 0.82, 3.93, 0.93), 0.065, '#b2a57d');
    beam(root, new THREE.Vector3(s * 0.64, 3.73, 0.97), new THREE.Vector3(s * 1.25, 3.93, 0.87), 0.065, '#b2a57d');
    for (let j = 0; j < 3; j++) beam(root, new THREE.Vector3(s * (0.70 + j * 0.20), 3.79 + j * 0.04, 0.9), new THREE.Vector3(s * (0.75 + j * 0.23), 4.20 + j * 0.025, 0.97), 0.042, '#c0b18b');
  }
  return { root, legs };
}

export function createLogPile() {
  const root = new THREE.Group();
  for (let layer = 0; layer < 3; layer++) {
    for (let j = 0; j < 5 - layer; j++) {
      const x = (j - (4 - layer) / 2) * 0.45;
      const log = cylinder(root, 0.23, 0.24, 2, '#67543a', x, 0.25 + layer * 0.4, 0);
      log.rotation.x = Math.PI / 2;
      const end = cylinder(root, 0.195, 0.195, 0.012, '#c1a372', x, 0.25 + layer * 0.4, 1.008);
      end.rotation.x = Math.PI / 2;
      const heart = cylinder(root, 0.061, 0.061, 0.014, '#957543', x, 0.25 + layer * 0.4, 1.017);
      heart.rotation.x = Math.PI / 2;
    }
  }
  return root;
}

export function createToolbox() {
  const root = new THREE.Group();
  box(root, 1.0, 0.49, 0.49, '#bd653c', 0, 0.25, 0);
  box(root, 1.06, 0.11, 0.53, '#d9854c', 0, 0.53, 0);
  for (const s of [-1, 1]) {
    box(root, 0.055, 0.23, 0.07, '#4c5042', s * 0.22, 0.68, 0);
    box(root, 0.08, 0.20, 0.035, '#ccb58a', s * 0.30, 0.40, 0.27);
  }
  box(root, 0.49, 0.07, 0.08, '#494e40', 0, 0.79, 0);
  return root;
}
