import * as THREE from 'three';
import { beam, box, cylinder, ellipsoid, mesh, roundedBox, smoothMaterial } from './primitives';
import { mergeStaticMeshes } from './optimize';

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Faded seventies upholstery, with a second, mismatched fabric for the throw. */
function oldFabric(plaid = false, green = false) {
  const texture = canvasTexture(256, 256, ctx => {
    ctx.fillStyle = plaid ? '#9b8060' : green ? '#687052' : '#92794d'; ctx.fillRect(0, 0, 256, 256);
    if (plaid) {
      for (let i = 0; i < 256; i += 40) {
        ctx.fillStyle = '#765044aa'; ctx.fillRect(i, 0, 15, 256); ctx.fillRect(0, i, 256, 15);
        ctx.fillStyle = '#d2b98777'; ctx.fillRect(i + 23, 0, 3, 256); ctx.fillRect(0, i + 23, 256, 3);
      }
    } else {
      for (let y = 12; y < 280; y += 52) for (let x = (y % 104 ? 8 : 34); x < 280; x += 52) {
        ctx.strokeStyle = green ? '#a9a37d55' : '#c4a36b88'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.quadraticCurveTo(x + 23, y, x, y + 20); ctx.quadraticCurveTo(x - 23, y, x, y - 20); ctx.stroke();
        ctx.fillStyle = green ? '#515c4566' : '#6d573b66';
        for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(j * Math.PI / 2) * 6, y + Math.sin(j * Math.PI / 2) * 6, 3, 6, j * Math.PI / 2, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    for (let i = 0; i < 256; i += 3) {
      ctx.fillStyle = '#e2c99a15'; ctx.fillRect(i, 0, 1, 256);
      ctx.fillStyle = '#352d2511'; ctx.fillRect(0, i, 256, 1);
    }
    // Deterministic abrasion, rather than new random textures on every visit.
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = i % 3 ? '#ddc49923' : '#42362525';
      ctx.fillRect((i * 73) % 256, (i * 47) % 256, 3 + i % 9, 1 + i % 3);
    }
  });
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
}

export function createWornSofa(green = false) {
  const root = new THREE.Group(); root.name = green ? 'Gammal grön soffa' : 'Nedsutten sjuttiotalssoffa';
  const cloth = oldFabric(false, green), throwCloth = oldFabric(true);
  for (const x of [-1.12, 1.12]) for (const z of [-0.42, 0.43]) {
    cylinder(root, 0.075, 0.055, 0.25, '#60472f', x, 0.13, z, 8);
  }
  roundedBox(root, 2.78, 0.32, 1.22, '#685236', 0, 0.34, 0, 0.07);
  roundedBox(root, 2.75, 0.23, 1.19, cloth, 0, 0.49, 0.01, 0.085);
  roundedBox(root, 2.75, 0.81, 0.29, cloth, 0, 0.94, -0.53, 0.10).rotation.x = -0.07;
  for (const side of [-1, 1]) {
    roundedBox(root, 0.26, 0.70, 1.27, cloth, side * 1.29, 0.64, 0.01, 0.12);
    roundedBox(root, 0.30, 0.12, 1.03, green ? '#566046' : '#a08856', side * 1.30, 0.984, 0.025, 0.05);
    box(root, 0.12, 0.025, 0.27, '#baa477', side * 1.30, 1.045, 0.25);
  }
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.78;
    const cushion = roundedBox(root, 0.75, 0.20, 0.95, cloth, x, 0.65 - (i === 1 ? 0.036 : 0), 0.13, 0.075);
    cushion.rotation.z = [0.015, -0.027, 0.022][i];
    roundedBox(root, 0.74, 0.57, 0.13, cloth, x, 1.01, -0.32, 0.065).rotation.x = -0.12;
    for (const dx of [-0.33, 0.33]) box(root, 0.013, 0.016, 0.78, green ? '#8d9273' : '#b09a6c', x + dx, 0.740 - (i === 1 ? 0.036 : 0), 0.12);
    ellipsoid(root, green ? '#4e5c43' : '#6d573d', x, 1.005, -0.231, 0.032, 0.030, 0.017, 10);
  }
  // Repaired cushion, exposed stuffing and a blanket that spills over the seat.
  const patch = roundedBox(root, 0.26, 0.009, 0.24, green ? '#858466' : '#b29465', 0.68, 0.759, 0.24, 0.004); patch.rotation.y = 0.16;
  for (let i = 0; i < 5; i++) {
    box(root, 0.015, 0.010, 0.041, '#d0bc88', 0.575 + i * 0.051, 0.766, 0.34);
    box(root, 0.015, 0.010, 0.041, '#d0bc88', 0.575 + i * 0.051, 0.766, 0.14);
  }
  ellipsoid(root, '#443b2b', 1.31, 1.05, -0.10, 0.077, 0.008, 0.12, 12);
  ellipsoid(root, '#c2b08b', 1.31, 1.056, -0.11, 0.050, 0.016, 0.08, 12);
  roundedBox(root, 0.48, 0.06, 0.96, throwCloth, -0.85, 0.779, 0.08, 0.014);
  roundedBox(root, 0.48, 0.40, 0.04, throwCloth, -0.85, 0.58, 0.57, 0.009);
  roundedBox(root, 0.48, 0.58, 0.04, throwCloth, -0.85, 1.04, -0.216, 0.012).rotation.x = -0.12;
  for (let i = 0; i < 10; i++) box(root, 0.013, 0.065 + (i % 3) * 0.011, 0.012, '#c2aa7d', -1.06 + i * 0.046, 0.35, 0.582);
  return root;
}

export function createOldTelevision() {
  const root = new THREE.Group(); root.name = 'Gammal tjock-tv på teakbänk';
  // A low teak cabinet, magazines and a slightly crooked front.
  for (const x of [-0.64, 0.64]) for (const z of [-0.25, 0.25]) cylinder(root, 0.055, 0.035, 0.28, '#765237', x, 0.14, z, 8);
  box(root, 1.60, 0.08, 0.83, '#896441', 0, 0.30, 0);
  box(root, 1.70, 0.09, 0.88, '#9d754e', 0, 0.69, 0);
  for (const x of [-0.76, 0.76]) box(root, 0.085, 0.40, 0.80, '#85603e', x, 0.49, 0);
  box(root, 1.5, 0.31, 0.06, '#634b33', 0, 0.49, -0.38);
  for (let i = 0; i < 5; i++) {
    const paper = box(root, 0.63 - i * 0.027, 0.03, 0.41, ['#bfb48e', '#7d896d', '#c1a36e'][i % 3], -0.36, 0.365 + i * 0.033, 0.13);
    paper.rotation.y = i * 0.11;
  }
  for (let i = 0; i < 3; i++) roundedBox(root, 0.12, 0.23, 0.28, '#44483c', 0.30 + i * 0.13, 0.459, 0.14, 0.012);
  roundedBox(root, 1.45, 1.02, 0.86, '#745135', 0, 1.265, -0.025, 0.10);
  roundedBox(root, 1.37, 0.94, 0.09, '#302e24', 0, 1.27, 0.432, 0.075);
  roundedBox(root, 1.12, 0.81, 0.09, '#514c3a', -0.09, 1.28, 0.481, 0.095);
  const screen = canvasTexture(384, 288, ctx => {
    ctx.fillStyle = '#a3b2a0'; ctx.fillRect(0, 0, 384, 288);
    ctx.fillStyle = '#748878'; ctx.beginPath(); ctx.moveTo(0, 147); ctx.lineTo(70, 95); ctx.lineTo(162, 144); ctx.lineTo(238, 77); ctx.lineTo(384, 151); ctx.lineTo(384, 288); ctx.lineTo(0, 288); ctx.fill();
    ctx.fillStyle = '#c0cbb3'; ctx.fillRect(0, 206, 384, 82);
    for (let i = 0; i < 10; i++) {
      const x = (i * 67 + 17) % 384, y = 95 + (i * 13) % 75;
      ctx.fillStyle = i % 2 ? '#405f52' : '#567160';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 32, y + 92); ctx.lineTo(x + 32, y + 92); ctx.closePath(); ctx.fill();
      ctx.fillRect(x - 4, y + 65, 8, 48);
    }
    ctx.fillStyle = '#d0d8bf'; ctx.font = 'bold 19px monospace'; ctx.fillText('KANAL 1', 17, 28);
    ctx.fillStyle = '#273e33aa'; ctx.fillRect(0, 248, 384, 40);
    ctx.fillStyle = '#d4dbbc'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center'; ctx.fillText('EN STUND I SKOGEN', 192, 274);
    for (let i = 0; i < 288; i += 3) { ctx.fillStyle = '#20372d35'; ctx.fillRect(0, i, 384, 1); }
    for (let i = 0; i < 2400; i++) { ctx.fillStyle = i % 2 ? '#ffffff12' : '#00000015'; ctx.fillRect((i * 73) % 384, (i * 47) % 288, 2, 1); }
    const shade = ctx.createRadialGradient(192, 144, 70, 192, 144, 235); shade.addColorStop(0, '#00000000'); shade.addColorStop(1, '#15261c99'); ctx.fillStyle = shade; ctx.fillRect(0, 0, 384, 288);
  });
  roundedBox(root, 0.96, 0.67, 0.055, new THREE.MeshStandardMaterial({ map: screen, emissiveMap: screen, emissive: '#a3b396', emissiveIntensity: 0.35, roughness: 0.30 }), -0.095, 1.287, 0.544, 0.11);
  for (const y of [1.43, 1.16]) {
    const knob = cylinder(root, 0.071, 0.071, 0.048, '#999982', 0.56, y, 0.509, 16); knob.rotation.x = Math.PI / 2;
    box(root, 0.017, 0.07, 0.006, '#494b3c', 0.56, y, 0.536).rotation.z = 0.31;
  }
  for (let y = 0.88; y < 1.06; y += 0.04) box(root, 0.17, 0.016, 0.01, '#71674c', 0.55, y, 0.487);
  ellipsoid(root, '#d29356', 0.555, 0.815, 0.486, 0.017, 0.014, 0.010, 10);
  for (let x = -0.56; x < 0.65; x += 0.11) box(root, 0.047, 0.013, 0.20, '#4d4131', x, 1.781, -0.17);
  cylinder(root, 0.12, 0.14, 0.08, '#5a5a49', 0, 1.806, -0.20, 14);
  for (const side of [-1, 1]) {
    beam(root, new THREE.Vector3(0, 1.85, -0.20), new THREE.Vector3(side * 0.47, 2.37, -0.23), 0.014, '#a9ac97', 8);
    ellipsoid(root, '#d3cdb0', side * 0.47, 2.37, -0.23, 0.025, 0.025, 0.025, 10);
  }
  for (let i = 0; i < 6; i++) box(root, 0.10, 0.006, 0.012, '#bea37b', -0.65 + i * 0.19, 0.739, 0.38);
  return root;
}

function dirtyPlate(parent: THREE.Object3D, x: number, y: number, z: number, radius = 0.24, tilt = 0) {
  const plate = new THREE.Group();
  cylinder(plate, radius, radius * 0.87, 0.035, '#e0d4ad', 0, 0, 0, 24);
  const rim = mesh(new THREE.TorusGeometry(radius * 0.92, 0.015, 6, 28), smoothMaterial('#aaa582'));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.022; plate.add(rim);
  for (let i = 0; i < 5; i++) ellipsoid(plate, i % 2 ? '#957849' : '#ae8e54', Math.sin(i * 1.9) * radius * 0.48, 0.024, Math.cos(i * 2.3) * radius * 0.47, 0.039, 0.005, 0.025, 10);
  plate.position.set(x, y, z); plate.rotation.x = tilt; plate.rotation.z = tilt * 0.17;
  parent.add(plate); return plate;
}

function oldCup(parent: THREE.Object3D, x: number, y: number, z: number) {
  const mug = new THREE.Group();
  mug.add(mesh(new THREE.CylinderGeometry(0.10, 0.082, 0.20, 18, 1, true), smoothMaterial('#bdaa80')));
  cylinder(mug, 0.083, 0.079, 0.018, '#67523a', 0, 0.068, 0, 18);
  const handle = mesh(new THREE.TorusGeometry(0.058, 0.016, 6, 16), smoothMaterial('#bdaa80')); handle.position.x = 0.108; mug.add(handle);
  mug.position.set(x, y, z); parent.add(mug);
}

export function createOldSink() {
  const root = new THREE.Group(); root.name = 'Gammal diskbänk med smutsig disk';
  box(root, 2.34, 0.78, 0.87, '#8d8b69', 0, 0.39, 0);
  for (const x of [-1.14, 1.14]) box(root, 0.065, 1.0, 0.87, '#8d8b69', x, 0.50, 0);
  for (const x of [-0.575, 0.575]) {
    const door = box(root, 1.075, 0.80, 0.045, '#b2ac80', x, 0.54, 0.464); door.rotation.z = x < 0 ? 0.012 : -0.025;
    box(root, 0.83, 0.58, 0.014, '#aaa77c', x, 0.54, 0.494);
    roundedBox(root, 0.27, 0.045, 0.065, '#817b5d', x, 0.833, 0.514, 0.013);
    for (let i = 0; i < 5; i++) box(root, 0.05 + i * 0.012, 0.018, 0.005, '#887352', x - 0.38 + i * 0.18, 0.174 + (i % 2) * 0.08, 0.49);
  }
  const steel = smoothMaterial('#a3aaa0', 0.43, 0.48);
  roundedBox(root, 1.14, 0.074, 0.97, steel, 0.66, 1.033, 0, 0.027);
  for (const z of [-0.43, 0.43]) roundedBox(root, 1.33, 0.08, 0.12, steel, -0.565, 1.029, z, 0.015);
  for (const x of [-1.185, 0.043]) roundedBox(root, 0.115, 0.08, 0.86, steel, x, 1.029, 0, 0.015);
  // A real recessed basin, not a painted rectangle on top of the cabinet.
  roundedBox(root, 1.04, 0.055, 0.69, '#747f73', -0.57, 0.82, 0, 0.025);
  for (const x of [-1.10, -0.04]) box(root, 0.047, 0.23, 0.72, steel, x, 0.916, 0);
  for (const z of [-0.365, 0.365]) box(root, 1.10, 0.23, 0.045, steel, -0.57, 0.916, z);
  box(root, 1.0, 0.009, 0.65, new THREE.MeshStandardMaterial({ color: '#929c84', transparent: true, opacity: 0.72, roughness: 0.20 }), -0.57, 0.876, 0);
  for (let i = 0; i < 9; i++) roundedBox(root, 0.036, 0.017, 0.67, '#89968a', 0.18 + i * 0.109, 1.078, 0, 0.008);
  const tap = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.60, 1.03, -0.35), new THREE.Vector3(-0.60, 1.44, -0.35),
    new THREE.Vector3(-0.60, 1.50, -0.21), new THREE.Vector3(-0.60, 1.43, -0.05), new THREE.Vector3(-0.60, 1.34, -0.04),
  ]);
  root.add(mesh(new THREE.TubeGeometry(tap, 18, 0.032, 8, false), steel));
  for (const [x, color] of [[-0.88, '#a16c51'], [-0.32, '#648786']] as const) {
    cylinder(root, 0.05, 0.055, 0.11, '#8e9b91', x, 1.10, -0.35, 12);
    box(root, 0.19, 0.025, 0.045, '#adb1a0', x, 1.165, -0.35);
    cylinder(root, 0.025, 0.025, 0.01, color, x, 1.184, -0.35, 12);
  }
  dirtyPlate(root, -0.78, 0.94, 0.12, 0.27, 0.08);
  dirtyPlate(root, -0.61, 1.055, -0.10, 0.28, 0.84);
  dirtyPlate(root, -0.30, 0.967, 0.02, 0.21, -0.17);
  oldCup(root, -0.93, 1.095, 0.18);
  oldCup(root, 0.95, 1.183, 0.24);
  const pan = new THREE.Group();
  pan.add(mesh(new THREE.CylinderGeometry(0.245, 0.22, 0.25, 20, 1, true), smoothMaterial('#606a60', 0.56, 0.34)));
  cylinder(pan, 0.22, 0.21, 0.028, '#5c5943', 0, -0.10, 0, 20);
  for (const x of [-0.30, 0.30]) roundedBox(pan, 0.16, 0.05, 0.08, '#403f32', x, 0.035, 0, 0.02);
  pan.position.set(0.50, 1.213, -0.09); root.add(pan);
  roundedBox(root, 0.21, 0.055, 0.14, '#c3ad54', 1.0, 1.106, -0.29, 0.025);
  roundedBox(root, 0.21, 0.018, 0.14, '#75835b', 1.0, 1.145, -0.29, 0.008);
  roundedBox(root, 0.31, 0.44, 0.035, '#b3a588', 0.56, 0.905, 0.51, 0.012);
  for (let x = 0.44; x < 0.72; x += 0.055) box(root, 0.011, 0.41, 0.008, '#796e53', x, 0.897, 0.535);
  return root;
}

function createKallesTube() {
  const root = new THREE.Group(); root.name = 'Kalles kaviar — blå tub med röd kork';
  const profile = [new THREE.Vector2(0.042, 0.045), new THREE.Vector2(0.066, 0.11), new THREE.Vector2(0.135, 0.18), new THREE.Vector2(0.142, 0.41), new THREE.Vector2(0.13, 0.53), new THREE.Vector2(0.15, 0.58)];
  const tube = mesh(new THREE.LatheGeometry(profile, 24), smoothMaterial('#206b9e', 0.55, 0.12)); tube.scale.z = 0.63; root.add(tube);
  const cap = cylinder(root, 0.061, 0.061, 0.077, '#b75539', 0, 0.045, 0, 16);
  for (let i = 0; i < 12; i++) box(cap, 0.006, 0.061, 0.006, '#d07b49', Math.cos(i * Math.PI / 6) * 0.06, 0, Math.sin(i * Math.PI / 6) * 0.06);
  roundedBox(root, 0.294, 0.035, 0.037, '#d0ba5b', 0, 0.58, 0, 0.007);
  const label = canvasTexture(256, 384, ctx => {
    ctx.fillStyle = '#1d6294'; ctx.fillRect(0, 0, 256, 384);
    ctx.fillStyle = '#e0ba50'; ctx.fillRect(8, 7, 240, 5); ctx.fillRect(8, 369, 240, 5);
    ctx.textAlign = 'center'; ctx.fillStyle = '#efda83'; ctx.font = 'bold italic 64px Georgia'; ctx.fillText('Kalles', 124, 81);
    // A little hand-drawn blond face evokes the familiar tube, without an external asset.
    ctx.fillStyle = '#ecd9aa'; ctx.beginPath(); ctx.ellipse(128, 184, 62, 73, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ebc659'; ctx.beginPath(); ctx.moveTo(65, 168); ctx.bezierCurveTo(45, 89, 204, 85, 190, 165); ctx.lineTo(171, 137); ctx.lineTo(145, 159); ctx.lineTo(125, 132); ctx.lineTo(99, 157); ctx.lineTo(79, 139); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#365362'; for (const x of [105, 151]) { ctx.beginPath(); ctx.ellipse(x, 182, 5, 7, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#a06a46'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(108, 219); ctx.quadraticCurveTo(130, 242, 153, 218); ctx.stroke();
    ctx.fillStyle = '#f4e7bc'; ctx.font = 'bold 36px Arial'; ctx.fillText('KAVIAR', 128, 310);
    ctx.fillStyle = '#d5cbb0'; ctx.font = '20px Arial'; ctx.fillText('ORIGINAL', 128, 344);
  });
  const face = mesh(new THREE.PlaneGeometry(0.246, 0.382), new THREE.MeshStandardMaterial({ map: label, roughness: 0.7 }));
  face.position.set(0, 0.352, 0.091); root.add(face);
  return root;
}

/** Half a cucumber: dark skin, one rounded end and a pale, seeded cut face. */
export function createHalfCucumber() {
  const root = new THREE.Group(); root.name = 'En halv gurka';
  const body = mesh(new THREE.CylinderGeometry(0.093, 0.080, 0.46, 20), smoothMaterial('#4d6c32'));
  body.rotation.x = Math.PI / 2; root.add(body);
  ellipsoid(root, '#3d5f30', 0, 0, -0.231, 0.08, 0.079, 0.033, 16);
  const cut = mesh(new THREE.CircleGeometry(0.090, 28), smoothMaterial('#c9d38f'));
  cut.position.z = 0.232; root.add(cut);
  const flesh = mesh(new THREE.CircleGeometry(0.073, 24), smoothMaterial('#dee0b0'));
  flesh.position.z = 0.234; root.add(flesh);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const a = j * Math.PI * 2 / 3 + i * 0.18;
    const seed = ellipsoid(root, '#f2eacb', Math.cos(a) * (0.021 + i * 0.012), Math.sin(a) * (0.021 + i * 0.012), 0.239, 0.006, 0.011, 0.002, 10);
    seed.rotation.z = a;
  }
  for (let j = 0; j < 9; j++) {
    const a = j * Math.PI * 2 / 9;
    const stripe = new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a) * 0.081, Math.sin(a) * 0.081, -0.20), new THREE.Vector3(Math.cos(a + 0.03) * 0.089, Math.sin(a + 0.03) * 0.089, 0), new THREE.Vector3(Math.cos(a) * 0.092, Math.sin(a) * 0.092, 0.225)]);
    root.add(mesh(new THREE.TubeGeometry(stripe, 8, 0.003, 4, false), smoothMaterial(j % 2 ? '#7b8b48' : '#35572c')));
  }
  return root;
}

export function createOldFridge() {
  const root = new THREE.Group(); root.name = 'Litet gammalt kylskåp';
  const enamel = smoothMaterial('#c9c3a0', 0.78), inside = smoothMaterial('#d6deca', 0.83);
  // Separate panels leave an actual hollow fridge, with room for shelves and food.
  for (const x of [-0.65, 0.65]) roundedBox(root, 0.13, 1.72, 1.04, enamel, x, 0.94, 0, 0.048);
  roundedBox(root, 1.30, 0.13, 1.04, enamel, 0, 1.745, 0, 0.04);
  roundedBox(root, 1.30, 0.13, 1.04, enamel, 0, 0.15, 0, 0.035);
  box(root, 1.18, 1.52, 0.10, inside, 0, 0.95, -0.459);
  for (const x of [-0.569, 0.569]) box(root, 0.024, 1.49, 0.91, inside, x, 0.95, 0.005);
  for (const x of [-0.53, 0.53]) for (const z of [-0.35, 0.34]) cylinder(root, 0.055, 0.045, 0.17, '#666d57', x, 0.087, z, 10);
  box(root, 1.14, 0.05, 0.83, '#bbc9b5', 0, 0.265, 0.015);
  const contents = new THREE.Group(); contents.name = 'Kylens hyllor och Kalles-tub'; root.add(contents);
  for (const y of [0.65, 1.38]) {
    box(contents, 1.13, 0.025, 0.78, '#b7c9ba', 0, y, 0.025);
    box(contents, 1.13, 0.034, 0.035, '#e4e5c9', 0, y, 0.417);
    for (let x = -0.46; x < 0.52; x += 0.12) box(contents, 0.012, 0.012, 0.72, '#d9dfc8', x, y + 0.018, 0.025);
  }
  roundedBox(contents, 0.79, 0.16, 0.51, '#b2c1b1', -0.05, 1.535, -0.08, 0.017);
  box(contents, 0.65, 0.03, 0.025, '#7c9384', -0.05, 1.51, 0.193);
  const tube = createKallesTube(); tube.position.set(0.17, 0.67, 0.31); tube.rotation.z = -0.08; tube.rotation.x = -0.08; contents.add(tube);
  ellipsoid(contents, new THREE.MeshBasicMaterial({ color: '#fff0b3' }), -0.46, 1.57, 0.25, 0.038, 0.066, 0.045, 12);
  const cucumber = createHalfCucumber(); cucumber.position.set(-0.25, 0.765, 0.18); cucumber.rotation.y = -0.18; contents.add(cucumber);
  contents.visible = false;
  const door = new THREE.Group(); door.name = 'Kylskåpsdörr — vänstergångjärn'; door.position.set(-0.67, 0, 0.565); root.add(door);
  roundedBox(door, 1.34, 1.69, 0.16, enamel, 0.67, 0.945, 0, 0.058);
  roundedBox(door, 1.20, 1.55, 0.025, '#8e9984', 0.67, 0.945, -0.09, 0.035);
  roundedBox(door, 1.12, 1.47, 0.045, inside, 0.67, 0.945, -0.12, 0.025);
  for (const y of [0.43, 1.00]) {
    box(door, 0.98, 0.04, 0.20, '#ced6b8', 0.67, y, -0.22);
    roundedBox(door, 0.98, 0.14, 0.04, '#bbc7aa', 0.67, y + 0.07, -0.31, 0.009);
  }
  roundedBox(door, 0.075, 0.41, 0.09, '#8f927a', 1.16, 1.14, 0.14, 0.025);
  for (const y of [0.97, 1.31]) box(door, 0.08, 0.04, 0.10, '#a0a38a', 1.16, y, 0.09);
  for (const y of [0.40, 1.47]) roundedBox(root, 0.085, 0.13, 0.15, '#8d9078', -0.70, y, 0.55, 0.023);
  for (let i = 0; i < 10; i++) {
    const chip = box(door, 0.021 + (i % 3) * 0.012, 0.012 + (i % 2) * 0.013, 0.007, '#a0855c', 0.18 + i * 0.105, 0.194 + (i % 3) * 0.02, 0.088);
    chip.rotation.z = i * 0.67;
  }
  const noteMap = canvasTexture(128, 160, ctx => {
    ctx.fillStyle = '#d4c38b'; ctx.fillRect(0, 0, 128, 160); ctx.fillStyle = '#6d7052'; ctx.textAlign = 'center'; ctx.font = 'bold 16px monospace';
    ['KÖP:', 'KAFFE', 'BRÖD', 'NÅN MAT?'].forEach((line, i) => ctx.fillText(line, 64, 32 + i * 32));
  });
  const note = mesh(new THREE.PlaneGeometry(0.28, 0.35), new THREE.MeshStandardMaterial({ map: noteMap, roughness: 1 })); note.position.set(0.45, 1.14, 0.088); note.rotation.z = -0.11; door.add(note);
  ellipsoid(door, '#a76c44', 0.43, 1.29, 0.10, 0.033, 0.033, 0.013, 12);
  roundedBox(root, 0.24, 0.035, 0.28, '#b3a77c', -0.24, 1.835, -0.06, 0.008);
  mergeStaticMeshes(door); mergeStaticMeshes(contents);
  mergeStaticMeshes(root, new Set([door, contents]));
  return { root, door, contents };
}

export function oldWallpaper() {
  const map = canvasTexture(256, 128, ctx => {
    ctx.fillStyle = '#c5ba90'; ctx.fillRect(0, 0, 256, 128);
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = '#a49b7340'; ctx.fillRect(x, 0, 2, 128);
      for (let y = 20; y < 128; y += 43) {
        ctx.strokeStyle = '#8b89644d'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x + 16, y - 12); ctx.quadraticCurveTo(x + 32, y, x + 16, y + 12); ctx.quadraticCurveTo(x, y, x + 16, y - 12); ctx.stroke();
        ctx.fillStyle = '#a3906477'; ctx.beginPath(); ctx.arc(x + 16, y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (let i = 0; i < 120; i++) { ctx.fillStyle = i % 2 ? '#dccea623' : '#655b3320'; ctx.fillRect((i * 31) % 256, (i * 47) % 128, 2 + i % 13, 1 + i % 4); }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(3.4, 1);
  return new THREE.MeshStandardMaterial({ map, roughness: 1 });
}

export function oldRug() {
  const texture = canvasTexture(256, 384, ctx => {
    ctx.fillStyle = '#8c6046'; ctx.fillRect(0, 0, 256, 384);
    ctx.strokeStyle = '#bb9866'; ctx.lineWidth = 12; ctx.strokeRect(16, 16, 224, 352);
    ctx.strokeStyle = '#555f49'; ctx.lineWidth = 5; ctx.strokeRect(33, 33, 190, 318);
    for (let y = 78; y < 340; y += 75) for (let x = 62; x < 230; x += 67) {
      ctx.fillStyle = '#b2935e'; ctx.beginPath(); ctx.moveTo(x, y - 27); ctx.lineTo(x + 24, y); ctx.lineTo(x, y + 27); ctx.lineTo(x - 24, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#697051'; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 14); ctx.lineTo(x - 12, y); ctx.closePath(); ctx.fill();
    }
    for (let i = 0; i < 2200; i++) { ctx.fillStyle = i % 3 ? '#ead8ad18' : '#2e342712'; ctx.fillRect((i * 73) % 256, (i * 41) % 384, 2 + i % 4, 1); }
  });
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
}
