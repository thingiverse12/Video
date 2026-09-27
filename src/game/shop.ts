import * as THREE from 'three';
import { beam, box, cylinder, ellipsoid, mesh, roundedBox, smoothMaterial } from './primitives';
import { mergeStaticMeshes } from './optimize';
import { SHOP } from './types';

function placard(parent: THREE.Object3D, text: string, width: number, height: number, x: number, y: number, z: number, bg = '#f5eed9', color = '#b74436', italic = false) {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = Math.max(80, Math.round(768 * height / width));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${italic ? 'italic ' : ''}bold ${Math.floor(canvas.height * 0.65)}px Arial`;
  ctx.fillText(text, canvas.width / 2, canvas.height * 0.53, canvas.width * 0.91);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map, roughness: 0.78, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.12 });
  const label = mesh(new THREE.PlaneGeometry(width, height), material);
  label.position.set(x, y, z); parent.add(label);
  return label;
}

function meatTray(parent: THREE.Object3D, x: number, y: number, z: number, rotation: number) {
  const tray = new THREE.Group(); tray.position.set(x, y, z); tray.rotation.y = rotation;
  roundedBox(tray, 0.76, 0.082, 0.54, '#efecda', 0, 0, 0, 0.045);
  roundedBox(tray, 0.63, 0.023, 0.42, '#d7d5bf', 0, 0.045, 0, 0.04);
  const food = smoothMaterial('#b65b52', 0.50);
  ellipsoid(tray, food, -0.095, 0.079, 0.006, 0.195, 0.043, 0.152, 12);
  ellipsoid(tray, food, 0.112, 0.079, -0.006, 0.152, 0.045, 0.149, 12);
  roundedBox(tray, 0.23, 0.012, 0.115, '#f4e6cc', 0.18, 0.116, 0.105, 0.009);
  for (let i = 0; i < 5; i++) box(tray, 0.012, 0.004, 0.055, '#887f69', 0.105 + i * 0.018, 0.125, 0.107);
  parent.add(tray);
}

export function createShop() {
  const root = new THREE.Group(); root.name = 'ICA Sörbäcken — fiktiv spelbutik';
  root.position.set(SHOP.center.x, 0, SHOP.center.z);
  const structure = new THREE.Group(); structure.name = 'Butikstak och övre väggar — döljs inomhus';
  const loot = new THREE.Group(); loot.name = 'Köttpaket';
  root.add(structure, loot);
  const red = '#b74639', white = '#e7e5d3', steel = '#858f86';
  const glass = new THREE.MeshStandardMaterial({ color: '#b2cdc4', roughness: 0.18, metalness: 0.14, transparent: true, opacity: 0.42, depthWrite: false });
  box(root, 14.2, 0.14, 10.6, '#c6c8b5', 0, 0.055, 0);
  for (let x = -6.5; x <= 6.5; x += 1) for (let z = -4.5; z <= 4.5; z += 1) {
    box(root, 0.975, 0.022, 0.975, (Math.round(x + z) % 2) ? '#dfddc9' : '#e9e5d4', x, 0.14, z);
  }
  // Real door opening and accessible aisles. Only the roof/upper walls cut away.
  for (const side of [-1, 1]) {
    box(root, 0.20, 0.65, 10.6, '#d8dac6', side * 7, 0.325, 0);
    box(structure, 0.19, 3.55, 10.6, white, side * 7, 2.42, 0);
    for (let z = -5.1; z <= 5.1; z += 0.45) box(structure, 0.028, 3.51, 0.024, '#cbd0bd', side * 7.105, 2.42, z);
    box(root, 5.6, 0.58, 0.22, '#d8dac6', side * 4.22, 0.29, 5.2);
    box(structure, 5.6, 0.10, 0.20, red, side * 4.22, 0.65, 5.2);
    box(structure, 5.35, 2.5, 0.038, glass, side * 4.22, 1.945, 5.23);
    for (const dx of [-2.70, 0, 2.70]) box(structure, 0.075, 2.75, 0.13, '#eae8d7', side * 4.22 + dx, 2.02, 5.24);
    box(structure, 0.12, 3.32, 0.22, red, side * 1.37, 1.65, 5.20);
    box(structure, 0.075, 2.71, 0.035, '#aebfb4', side * 1.47, 1.85, 5.29);
  }
  box(root, 14.2, 0.68, 0.24, '#d8dac6', 0, 0.34, -5.2);
  box(structure, 14.2, 3.55, 0.24, white, 0, 2.42, -5.2);
  box(structure, 14.5, 0.88, 0.27, red, 0, 3.66, 5.22);
  box(structure, 14.5, 0.12, 0.37, '#d5d5c0', 0, 4.15, 5.22);
  placard(structure, 'ICA', 2.4, 0.83, -4.90, 3.69, 5.37, red, '#fff6e5', true);
  placard(structure, 'SÖRBÄCKEN', 6.85, 0.78, 0.47, 3.70, 5.373, red, '#fff6e5');
  placard(structure, 'VÄLKOMMEN IN', 2.40, 0.26, 0, 2.99, 5.26, '#eee6cc', '#5b6d52');
  // Price posters seen from the outside, not real store/theft information.
  placard(structure, 'HEJ GRANNEN!', 1.72, 0.65, -5.26, 1.75, 5.274, '#f4dfa4', '#8c6948');
  placard(structure, 'MIDDAG?', 1.75, 0.68, 4.91, 1.92, 5.274, '#f0dba7', '#a6503c');
  placard(structure, 'ÖPPET  ALLA DAGAR', 2.4, 0.29, 4.77, 1.37, 5.276, '#eee7cc', '#657058');
  // Low corrugated roof, gutters, a skylight and an old ventilation unit.
  box(structure, 14.9, 0.22, 11.5, '#626d61', 0, 4.32, 0);
  for (let x = -7.3; x <= 7.4; x += 0.40) box(structure, 0.027, 0.06, 11.45, '#86907a', x, 4.455, 0);
  for (const side of [-1, 1]) box(structure, 0.08, 0.16, 11.55, '#b2b6a0', side * 7.45, 4.23, 0);
  roundedBox(structure, 2.4, 0.20, 2.25, '#b5c6b8', -2.8, 4.55, -1.1, 0.06);
  box(structure, 0.06, 0.04, 2.20, '#dce2ce', -2.8, 4.667, -1.1);
  roundedBox(structure, 1.30, 0.92, 1.36, '#9daba0', 4.8, 4.88, -3.1, 0.075);
  for (let z = -3.65; z <= -2.5; z += 0.13) box(structure, 1.15, 0.022, 0.044, '#697b73', 4.8, 5.36, z);

  // Meat counter: chilled display with packaged, stylized groceries.
  const mx = SHOP.meat.x - SHOP.center.x, mz = SHOP.meat.z - SHOP.center.z;
  roundedBox(root, 3.7, 1.00, 1.65, '#ebebe0', mx, 0.65, mz, 0.065);
  roundedBox(root, 3.78, 0.11, 1.73, '#a9b7ab', mx, 1.19, mz, 0.04);
  box(root, 3.52, 0.038, 1.46, '#bfd0c3', mx, 1.256, mz);
  for (const side of [-1, 1]) box(root, 0.065, 0.38, 1.69, '#e2e5d4', mx + side * 1.84, 1.30, mz);
  box(root, 3.7, 0.37, 0.035, glass, mx, 1.39, mz + 0.835);
  placard(root, 'KÖTT', 1.95, 0.48, mx, 0.87, mz + 0.835, red, '#fff0d9');
  placard(root, 'TILL KVÄLLSMATEN', 2.22, 0.22, mx, 0.46, mz + 0.837, '#ebebe0', '#6d7a62');
  loot.position.set(mx, 1.29, mz);
  for (let i = 0; i < 3; i++) for (const row of [-1, 1]) meatTray(loot, (i - 1) * 0.95, 0.02, row * 0.33, (i - 1) * 0.07);
  // Wall fridges and tins, with clear, walkable space between the displays.
  for (let i = 0; i < 3; i++) {
    const x = -4.8 + i * 2.25;
    roundedBox(root, 2.05, 2.55, 0.66, '#d0d8c9', x, 1.45, -4.70, 0.035);
    box(root, 1.86, 2.22, 0.045, '#839b91', x, 1.48, -4.345);
    for (let shelf = 0; shelf < 3; shelf++) {
      box(root, 1.86, 0.035, 0.57, '#f3edda', x, 0.57 + shelf * 0.62, -4.41);
      for (let j = 0; j < 5; j++) roundedBox(root, 0.20, 0.35, 0.18, ['#e4dcc4', '#c39461', '#92ad93'][i], x - 0.70 + j * 0.34, 0.76 + shelf * 0.62, -4.24, 0.014);
    }
    placard(root, ['MEJERI', 'FRUKOST', 'LITE AV VARJE'][i], 2.0, 0.34, x, 2.94, -4.30, '#dfe4d1', '#687c5f');
  }
  // A low grocery island towards the back-right; it does not block the front aisle.
  for (const y of [0.28, 0.88, 1.48]) {
    box(root, 2.15, 0.07, 1.05, '#c6bda0', 2.50, y, -1.90);
    for (let i = 0; i < 6; i++) roundedBox(root, 0.22, 0.30, 0.24, ['#af7451', '#d0ac59', '#82926f'][i % 3], 1.67 + i * 0.33, y + 0.19, -1.90, 0.025);
  }
  for (const x of [1.40, 3.60]) box(root, 0.065, 1.65, 1.05, '#a6ad95', x, 0.90, -1.90);
  // Checkout, card terminal, till and a red basket of imaginary candy.
  roundedBox(root, 2.60, 1.05, 1.33, red, 4.65, 0.69, 2.70, 0.045);
  roundedBox(root, 2.75, 0.13, 1.43, '#dedfd0', 4.65, 1.28, 2.70, 0.055);
  roundedBox(root, 1.43, 0.025, 0.99, '#475a50', 4.24, 1.36, 2.70, 0.025);
  roundedBox(root, 0.13, 0.35, 0.15, '#73837a', 5.39, 1.52, 2.60, 0.023);
  roundedBox(root, 0.64, 0.45, 0.13, '#546c63', 5.39, 1.80, 2.64, 0.04).rotation.x = -0.12;
  placard(root, 'HEJ!', 0.48, 0.27, 5.39, 1.82, 2.733, '#b8caaa', '#3d634b');
  roundedBox(root, 0.28, 0.09, 0.42, '#5a6d61', 5.40, 1.385, 3.08, 0.03);
  placard(root, 'KASSA', 1.42, 0.39, 4.65, 0.86, 3.383, red, '#f7e9d0');
  for (const side of [-1, 1]) {
    box(root, 0.20, 0.50, 0.20, '#afb69c', side * 1.58, 0.39, 4.64);
    cylinder(root, 0.047, 0.047, 0.5, '#aebaaa', side * 1.58, 0.86, 4.64, 10);
  }

  // Pavement, parking bays, outdoor produce and abandoned shopping carts.
  box(root, 18.6, 0.10, 3.45, '#c4c5b0', 0, 0.034, 6.84);
  box(root, 23, 0.04, 8.6, '#959d8d', 0, 0.068, 12.6);
  for (let i = -2; i <= 2; i++) box(root, 0.08, 0.013, 5.4, '#dddccb', i * 4.7, 0.097, 12.5);
  for (const x of [-8.4, 8.4]) cylinder(root, 0.11, 0.12, 0.75, red, x, 0.405, 8.30, 10);
  for (const side of [-1, 1]) {
    cylinder(root, 0.075, 0.08, 1.0, '#b84537', side * 2.1, 0.51, 6.17, 12);
    cylinder(root, 0.078, 0.079, 0.12, '#eee2c5', side * 2.1, 0.78, 6.17, 12);
  }
  for (const [x, fruit] of [[-5.9, '#8e9d55'], [-4.4, '#c9984d']] as [number, string][]) {
    roundedBox(root, 1.21, 0.68, 0.98, '#8d7857', x, 0.42, 6.44, 0.03);
    for (let i = 0; i < 12; i++) ellipsoid(root, fruit, x - 0.42 + (i % 4) * 0.29, 0.86, 6.17 + Math.floor(i / 4) * 0.26, 0.126, 0.124, 0.119, 9);
    placard(root, 'NÄRA & GOTT', 1.03, 0.22, x, 0.53, 6.943, '#e1cf9b', '#6c714c');
  }
  for (let i = 0; i < 2; i++) {
    const cart = new THREE.Group(); cart.position.set(5.8 + i * 0.55, 0, 6.74 - i * 0.21);
    const basket = mesh(new THREE.BoxGeometry(0.64, 0.46, 0.92), new THREE.MeshStandardMaterial({ color: '#9baca3', wireframe: true, roughness: 0.4 })); basket.position.y = 0.85; cart.add(basket);
    for (const side of [-1, 1]) {
      beam(cart, new THREE.Vector3(side * 0.28, 0.27, -0.33), new THREE.Vector3(side * 0.32, 1.23, 0.52), 0.023, '#9baca3');
      for (const z of [-0.31, 0.39]) ellipsoid(cart, '#4b5e52', side * 0.28, 0.21, z, 0.055, 0.105, 0.105, 12);
      for (const z of [-0.32, -0.1, 0.12, 0.34]) beam(cart, new THREE.Vector3(side * 0.32, 0.65, z), new THREE.Vector3(side * 0.32, 1.07, z), 0.008, '#c0c7b9');
    }
    beam(cart, new THREE.Vector3(-0.34, 1.23, 0.52), new THREE.Vector3(0.34, 1.23, 0.52), 0.036, red);
    root.add(cart);
  }
  const poster = new THREE.Group(); poster.position.set(-8.2, 0, 7.5); poster.rotation.y = 0.19;
  for (const side of [-1, 1]) box(poster, 0.07, 1.50, 0.07, '#7b7f67', side * 0.43, 0.79, 0);
  box(poster, 0.91, 1.2, 0.075, '#f1e4bc', 0, 0.90, 0);
  placard(poster, 'ICA', 0.73, 0.40, 0, 1.15, 0.041, '#f1e4bc', red, true);
  placard(poster, 'FIKAPAUS?', 0.77, 0.22, 0, 0.75, 0.042, '#f1e4bc', '#67734f'); root.add(poster);
  mergeStaticMeshes(structure);
  mergeStaticMeshes(loot);
  mergeStaticMeshes(root, new Set([structure, loot]));
  return { root, structure, loot };
}
