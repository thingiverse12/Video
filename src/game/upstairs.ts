import * as THREE from 'three';
import { beam, box, cylinder, ellipsoid, mesh, roundedBox, sign, smoothMaterial } from './primitives';
import { createWornSofa, oldRug, oldWallpaper } from './furniture';
import { mergeStaticMeshes } from './optimize';
import { HOME } from './types';

export function createWoodenStaircase() {
  const root = new THREE.Group(); root.name = 'Gammal trätrappa till övervåningen';
  root.position.set(HOME.center.x, 0, HOME.center.z);
  const x = HOME.stairsBase.x - HOME.center.x, count = 14, run = 3.84, tread = run / count;
  const rise = (HOME.upperY - HOME.groundY) / count;
  for (let i = 0; i < count; i++) {
    const z = 3.06 - (i + 0.5) * tread, y = HOME.groundY + (i + 1) * rise;
    box(root, 1.51, 0.087, tread + 0.036, ['#97704a', '#a17b52', '#8b6946'][i % 3], x, y - 0.0435, z);
    box(root, 1.39, rise - 0.05, 0.052, '#785a3b', x, y - rise * 0.5 - 0.04, z + tread * 0.5 - 0.03);
    box(root, 1.38, 0.023, 0.036, '#b39569', x, y - 0.018, z + tread * 0.5 + 0.01);
    for (const dx of [-0.54, 0.54]) cylinder(root, 0.012, 0.012, 0.003, '#554833', x + dx, y + 0.002, z + 0.07, 8);
    for (let j = 0; j < 3; j++) box(root, 0.07 + j * 0.03, 0.004, 0.008, '#c2a474', x - 0.22 + j * 0.24, y + 0.003, z + (i % 2) * 0.04);
  }
  for (const side of [-1, 1]) {
    const sx = x + side * 0.78;
    beam(root, new THREE.Vector3(sx, HOME.groundY + 0.13, 3.03), new THREE.Vector3(sx, HOME.upperY - 0.07, -0.76), 0.055, '#6f5238');
    for (let i = 0; i <= 7; i++) {
      const t = i / 7, z = THREE.MathUtils.lerp(3.03, -0.77, t), y = THREE.MathUtils.lerp(HOME.groundY + 0.15, HOME.upperY, t);
      roundedBox(root, 0.075, 0.85, 0.075, '#a08155', sx, y + 0.42, z, 0.012);
      if (i === 0 || i === 7) ellipsoid(root, '#b69a6a', sx, y + 0.90, z, 0.075, 0.075, 0.075, 12);
    }
    beam(root, new THREE.Vector3(sx, HOME.groundY + 1.00, 3.03), new THREE.Vector3(sx, HOME.upperY + 0.86, -0.77), 0.047, '#ad8a5b', 8);
  }
  sign(root, 'UPP TILL EBBE', x, 2.40, 3.32, 1.46, 0.30, '#d7c596');
  mergeStaticMeshes(root); root.visible = false;
  return root;
}

function computerTexture(on: boolean) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 384;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = on ? '#598480' : '#29352d'; ctx.fillRect(0, 0, 512, 384);
  if (on) {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#dbcb8d'; ctx.fillRect(26, 32 + i * 77, 28, 27);
      ctx.fillStyle = '#426461'; ctx.fillRect(30, 39 + i * 77, 20, 13);
      ctx.fillStyle = '#e7e4c1'; ctx.font = '14px monospace'; ctx.fillText(['SPEL', 'EBBE', 'SKRÄP'][i], 21, 76 + i * 77);
    }
    ctx.fillStyle = '#243b3977'; ctx.fillRect(109, 62, 348, 233);
    ctx.fillStyle = '#dadac2'; ctx.fillRect(100, 53, 345, 232);
    ctx.fillStyle = '#375f71'; ctx.fillRect(105, 58, 335, 29);
    ctx.fillStyle = '#f2ecd1'; ctx.font = 'bold 18px monospace'; ctx.fillText('EBBES DATOR', 117, 79);
    ctx.fillStyle = '#8f9d6a'; ctx.fillRect(119, 104, 306, 125);
    for (let i = 0; i < 7; i++) {
      const x = 140 + i * 43; ctx.fillStyle = i % 2 ? '#3e684c' : '#527b56';
      ctx.beginPath(); ctx.moveTo(x, 112 + (i % 2) * 10); ctx.lineTo(x - 25, 209); ctx.lineTo(x + 25, 209); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#eee5ba'; ctx.font = 'bold 17px monospace'; ctx.fillText('ÄLGSPANAREN 95', 142, 221);
    ctx.fillStyle = '#535d46'; ctx.font = '17px monospace'; ctx.fillText('Välkommen, Ebbe!', 135, 262);
    ctx.fillStyle = '#ced2bd'; ctx.fillRect(0, 351, 512, 33);
    ctx.fillStyle = '#596d53'; ctx.font = 'bold 17px monospace'; ctx.fillText('START', 19, 374); ctx.fillText('14:32', 438, 374);
  } else {
    ctx.fillStyle = '#a8b3a61a'; ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(240, 20); ctx.lineTo(30, 198); ctx.closePath(); ctx.fill();
  }
  for (let y = 0; y < 384; y += 3) { ctx.fillStyle = '#172d2827'; ctx.fillRect(0, y, 512, 1); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createOldComputer() {
  const root = new THREE.Group(); root.name = 'Ebbes gamla beige dator med tjockskärm';
  // Scuffed desk and a beige PC tower with floppy/CD drives.
  box(root, 2.56, 0.12, 1.05, '#9a7952', 0, 1.04, 0);
  for (const x of [-1.11, 1.11]) for (const z of [-0.36, 0.36]) box(root, 0.10, 1.05, 0.10, '#775b3e', x, 0.525, z);
  box(root, 0.64, 0.73, 0.80, '#ad9061', -0.83, 0.65, -0.01);
  for (let i = 0; i < 3; i++) {
    box(root, 0.59, 0.21, 0.033, '#b2986b', -0.83, 0.42 + i * 0.23, 0.41);
    roundedBox(root, 0.23, 0.033, 0.043, '#776e50', -0.83, 0.43 + i * 0.23, 0.44, 0.01);
  }
  roundedBox(root, 0.41, 0.84, 0.73, '#b7b497', 0.71, 0.48, -0.025, 0.03);
  box(root, 0.37, 0.79, 0.037, '#d0c6a3', 0.71, 0.48, 0.355);
  for (const y of [0.62, 0.74]) { box(root, 0.31, 0.07, 0.022, '#a5a58c', 0.71, y, 0.381); box(root, 0.24, 0.012, 0.005, '#565e4d', 0.71, y + 0.004, 0.397); }
  for (let i = 0; i < 6; i++) box(root, 0.29, 0.016, 0.017, '#909b84', 0.71, 0.18 + i * 0.044, 0.383);
  const led = new THREE.MeshStandardMaterial({ color: '#6a8354', emissive: '#769854', emissiveIntensity: 0.04 });
  ellipsoid(root, led, 0.81, 0.525, 0.399, 0.023, 0.018, 0.008, 10);
  // Deep monitor enclosure, pedestal, physical keyboard and wired mouse.
  roundedBox(root, 0.56, 0.075, 0.40, '#b4b293', -0.13, 1.143, -0.10, 0.025);
  cylinder(root, 0.11, 0.14, 0.20, '#a3a58a', -0.13, 1.25, -0.14, 16);
  roundedBox(root, 1.06, 0.85, 0.83, '#c6bea0', -0.13, 1.70, -0.17, 0.09);
  roundedBox(root, 0.96, 0.72, 0.057, '#ddd1ac', -0.13, 1.72, 0.26, 0.026);
  roundedBox(root, 0.79, 0.59, 0.043, '#636d5c', -0.13, 1.745, 0.297, 0.02);
  const off = computerTexture(false), on = computerTexture(true);
  const screenMaterial = new THREE.MeshStandardMaterial({ map: off, emissive: '#b5c5a2', emissiveMap: off, emissiveIntensity: 0.04, roughness: 0.35 });
  roundedBox(root, 0.725, 0.53, 0.027, screenMaterial, -0.13, 1.745, 0.325, 0.013);
  ellipsoid(root, led, 0.28, 1.396, 0.300, 0.018, 0.014, 0.006, 10);
  for (let i = 0; i < 4; i++) box(root, 0.048, 0.026, 0.018, '#9b9d81', -0.39 + i * 0.12, 1.396, 0.300);
  const keyboard = new THREE.Group(); keyboard.position.set(-0.26, 1.133, 0.37); keyboard.rotation.x = -0.06;
  roundedBox(keyboard, 1.12, 0.055, 0.30, '#cfc4a3', 0, 0, 0, 0.02);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 14; col++) roundedBox(keyboard, 0.057, 0.015, 0.043, (col + row) % 9 ? '#dfd7b7' : '#b6b18d', -0.495 + col * 0.075, 0.035, -0.108 + row * 0.063, 0.005);
  box(keyboard, 0.33, 0.014, 0.037, '#ddd2ac', -0.13, 0.037, 0.109); root.add(keyboard);
  box(root, 0.43, 0.018, 0.45, '#648277', 0.66, 1.116, 0.25);
  ellipsoid(root, '#c3b99b', 0.64, 1.17, 0.28, 0.082, 0.045, 0.13, 16);
  box(root, 0.006, 0.006, 0.12, '#858d79', 0.64, 1.215, 0.24);
  const wire = new THREE.CatmullRomCurve3([new THREE.Vector3(0.64, 1.16, 0.14), new THREE.Vector3(0.87, 1.12, -0.13), new THREE.Vector3(0.70, 1.10, -0.40), new THREE.Vector3(0.32, 0.9, -0.40)]);
  root.add(mesh(new THREE.TubeGeometry(wire, 16, 0.008, 5, false), smoothMaterial('#4b5143')));
  for (let i = 0; i < 3; i++) { roundedBox(root, 0.22, 0.018, 0.23, '#495c61', -1.01, 1.119 + i * 0.022, 0.25, 0.006); box(root, 0.13, 0.002, 0.08, '#cfc4a3', -1.01, 1.131 + i * 0.022, 0.25); }
  const setPowered = (powered: boolean) => {
    screenMaterial.map = powered ? on : off; screenMaterial.emissiveMap = screenMaterial.map;
    screenMaterial.emissiveIntensity = powered ? 0.55 : 0.04;
    led.emissiveIntensity = powered ? 0.95 : 0.04;
  };
  // Return both maps so the engine can dispose even the inactive screen.
  return { root, setPowered, textures: [off, on] };
}

export function createUpstairs() {
  const root = new THREE.Group(); root.name = 'Övervåningen — Ebbes rum';
  root.position.set(HOME.center.x, HOME.upperY, HOME.center.z);
  const colliders: { type: 'box'; x: number; z: number; w: number; d: number }[] = [];
  const block = (x: number, z: number, w: number, d: number) => colliders.push({ type: 'box', x: HOME.center.x + x, z: HOME.center.z + z, w, d });
  const paper = oldWallpaper();
  // A genuine stairwell opening in the upper floor, with railings around it.
  box(root, 8.90, 0.16, 8, '#7d684d', 1.05, -0.09, 0);
  box(root, 2.10, 0.16, 3.20, '#7d684d', -4.45, -0.09, -2.40);
  box(root, 2.10, 0.16, 0.45, '#7d684d', -4.45, -0.09, 3.775);
  for (let x = -5.30; x < 5.5; x += 0.34) {
    const left = x < -3.4;
    box(root, 0.323, 0.022, left ? 3.13 : 7.90, ['#a28b66', '#b19b75', '#a99168'][Math.round((x + 5.30) / 0.34) % 3], x, -0.011, left ? -2.39 : 0);
  }
  for (const x of [-5.44, 5.44]) { box(root, 0.14, 1.09, 8, paper, x, 0.545, 0); box(root, 0.17, 0.07, 8, '#b59d74', x, 1.13, 0); block(x, 0, 0.20, 8.2); }
  for (const z of [-3.94, 3.94]) { box(root, 10.85, 1.09, 0.14, paper, 0, 0.545, z); box(root, 11, 0.07, 0.17, '#b59d74', 0, 1.13, z); block(0, z, 11.0, 0.20); }
  block(-4.46, 1.36, 1.93, 4.33);
  for (let z = -0.70; z < 3.62; z += 0.38) roundedBox(root, 0.065, 0.89, 0.065, '#a08055', -3.48, 0.44, z, 0.01);
  roundedBox(root, 0.09, 0.085, 4.42, '#b99c6b', -3.48, 0.92, 1.41, 0.025);
  for (const z of [-0.80, 3.60]) { box(root, 1.86, 0.078, 0.09, '#b99c6b', -4.42, 0.92, z); for (const x of [-5.2, -4.84, -4.0, -3.65]) box(root, 0.065, 0.88, 0.065, '#a08055', x, 0.44, z); }
  // Room doorway off the landing; walls stay low in the cutaway view.
  for (const [z, d] of [[-3.18, 1.50], [1.85, 4.18]]) { box(root, 0.15, 1.31, d, paper, -2.30, 0.655, z); box(root, 0.19, 0.07, d, '#b69b70', -2.30, 1.345, z); block(-2.30, z, 0.15, d); }
  for (const z of [-2.38, -0.22]) box(root, 0.15, 2.67, 0.12, '#997b54', -2.30, 1.335, z);
  box(root, 0.18, 0.12, 2.30, '#997b54', -2.30, 2.73, -1.30);
  const roomSign = sign(root, 'EBBES RUM', -2.30, 2.98, -1.30, 1.65, 0.33, '#ded0a7'); roomSign.rotation.y = -Math.PI / 2;
  sign(root, 'EBBE', 1.60, 1.48, -3.83, 1.45, 0.31, '#cfc4a3');

  const computer = createOldComputer();
  computer.root.position.set(HOME.computer.x - HOME.center.x, 0, HOME.computer.z - HOME.center.z); root.add(computer.root);
  block(computer.root.position.x, computer.root.position.z, 2.59, 1.10);
  // A well-used office chair set to the side, so the keyboard remains reachable.
  const chair = new THREE.Group();
  cylinder(chair, 0.07, 0.10, 0.57, '#6b6d57', 0, 0.34, 0, 12);
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; beam(chair, new THREE.Vector3(0, 0.13, 0), new THREE.Vector3(Math.cos(a) * 0.40, 0.08, Math.sin(a) * 0.40), 0.035, '#74765d', 8); ellipsoid(chair, '#464f42', Math.cos(a) * 0.41, 0.075, Math.sin(a) * 0.41, 0.065, 0.060, 0.048, 10); }
  roundedBox(chair, 0.62, 0.12, 0.59, '#637765', 0, 0.64, 0, 0.07);
  roundedBox(chair, 0.61, 0.63, 0.10, '#71846b', 0, 1.0, -0.25, 0.07).rotation.x = -0.10;
  chair.position.set(-0.12, 0, -2.27); chair.rotation.y = 0.24; root.add(chair); block(-0.12, -2.27, 0.66, 0.66);
  // Old wooden bed, checked cover, a pillow and a bedside table.
  const bed = new THREE.Group();
  for (const x of [-0.70, 0.70]) for (const z of [-1.28, 1.28]) roundedBox(bed, 0.12, 0.78, 0.12, '#896541', x, 0.39, z, 0.017);
  for (const z of [-1.30, 1.30]) { box(bed, 1.48, 0.42, 0.10, '#9c7c53', 0, z < 0 ? 0.91 : 0.58, z); for (const x of [-0.50, -0.25, 0, 0.25, 0.50]) box(bed, 0.045, 0.42, 0.025, '#b59463', x, z < 0 ? 0.91 : 0.58, z + 0.06); }
  roundedBox(bed, 1.44, 0.21, 2.47, '#b4b28f', 0, 0.55, 0, 0.07);
  roundedBox(bed, 1.45, 0.09, 1.88, '#7f8c6c', 0, 0.697, 0.22, 0.035);
  for (const x of [-0.56, -0.25, 0.07, 0.39, 0.66]) box(bed, 0.040, 0.005, 1.87, '#b0aa7f', x, 0.746, 0.22);
  for (let z = -0.64; z < 1.2; z += 0.27) box(bed, 1.43, 0.005, 0.038, '#a0a481', 0, 0.747, z);
  roundedBox(bed, 0.91, 0.16, 0.51, '#d7ceb0', 0, 0.746, -0.88, 0.09).rotation.y = 0.10;
  bed.position.set(4.16, 0, 0.55); root.add(bed); block(4.16, 0.55, 1.60, 2.78);
  box(root, 0.63, 0.67, 0.61, '#93784e', 2.98, 0.335, -0.20);
  box(root, 0.69, 0.085, 0.67, '#b19866', 2.98, 0.71, -0.20);
  block(2.98, -0.20, 0.69, 0.67);
  roundedBox(root, 0.34, 0.16, 0.10, '#535e4c', 2.97, 0.827, -0.21, 0.024);
  const sofa = createWornSofa(true); sofa.scale.setScalar(0.77); sofa.position.set(0.22, 0, 2.83); sofa.rotation.y = Math.PI; root.add(sofa); block(0.22, 2.83, 2.25, 1.10);
  const rug = mesh(new THREE.PlaneGeometry(2.7, 2.80), oldRug(), false); rug.rotation.x = -Math.PI / 2; rug.position.set(0.60, 0.012, 0.17); root.add(rug);
  box(root, 0.62, 0.085, 0.42, '#8b6a48', -1.08, 0.12, 1.79);
  for (let i = 0; i < 3; i++) box(root, 0.29, 0.055, 0.38, ['#b6a16c', '#70846e', '#a38259'][i], -1.08, 0.19 + i * 0.06, 1.79);
  sign(root, 'STÖR EJ. SPELAR.', -0.85, 1.17, -3.83, 1.76, 0.35, '#c6c3a0');
  mergeStaticMeshes(root);
  root.visible = false;
  return { root, colliders, computer };
}
