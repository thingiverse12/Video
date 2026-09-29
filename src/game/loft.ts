import * as THREE from 'three';
import { beam, box, cylinder, ellipsoid, mesh, roundedBox, sign, smoothMaterial } from './primitives';
import { mergeStaticMeshes } from './optimize';
import { HOME } from './types';
import { logWall, LOG_PITCH } from './timber';

// Loftet: ett halvplan under taknocken ovanför Bills rum. Här står Bills bakmaskin,
// som han "bara skulle testa" förra julen och sedan glömde. Den har gått hela året.

/** Loftets utbredning i stugans lokala koordinater (HOME.center är origo). */
const LOFT_MIN_X = HOME.loft.minX - HOME.center.x, LOFT_MAX_X = HOME.loft.maxX - HOME.center.x, LOFT_HALF_DEPTH = HOME.loft.halfDepth;
const RISE = HOME.loftY - HOME.upperY;
const LADDER_FOOT_X = HOME.ladderBase.x - HOME.center.x - 0.56, LADDER_Z = HOME.ladderBase.z - HOME.center.z;
const LADDER_LEAN = 0.326; // meter i sidled per meter höjd

/** Den branta loftstegen från Bills rum. Läggs i övervåningens grupp så att den syns från båda planen. */
export function createLoftLadder(parent: THREE.Object3D) {
  const top = RISE + 1.0;
  for (const side of [-1, 1]) {
    const z = LADDER_Z + side * 0.30;
    beam(parent, new THREE.Vector3(LADDER_FOOT_X, 0.02, z), new THREE.Vector3(LADDER_FOOT_X + top * LADDER_LEAN, top, z), 0.045, '#9c7a4e', 8);
  }
  for (let y = 0.30; y < top - 0.1; y += 0.30) {
    const x = LADDER_FOOT_X + y * LADDER_LEAN;
    const rung = cylinder(parent, 0.028, 0.028, 0.60, y % 0.6 < 0.01 ? '#b28d5c' : '#a8845a', x, y, LADDER_Z, 8);
    rung.rotation.x = Math.PI / 2;
  }
  // Gummifötter och ett par slitmärken på golvet där stegen stått i åratal.
  for (const side of [-1, 1]) box(parent, 0.10, 0.04, 0.09, '#3f3d36', LADDER_FOOT_X, 0.02, LADDER_Z + side * 0.30);
  const label = sign(parent, 'UPP PÅ LOFTET', LADDER_FOOT_X + 0.62, 1.55, LADDER_Z + 0.75, 1.30, 0.28, '#d7c596');
  label.rotation.y = -Math.PI / 2;
}

export function createLoft() {
  const root = new THREE.Group(); root.name = 'Loftet — under taket, med Bills bakmaskin';
  root.position.set(HOME.center.x, HOME.loftY, HOME.center.z);
  const colliders: { type: 'box'; x: number; z: number; w: number; d: number }[] = [];
  const block = (x: number, z: number, w: number, d: number) => colliders.push({ type: 'box', x: HOME.center.x + x, z: HOME.center.z + z, w, d });
  const width = LOFT_MAX_X - LOFT_MIN_X, centreX = (LOFT_MIN_X + LOFT_MAX_X) / 2;

  // Golv av breda, ohyvlade plankor som ligger på bjälkarna från våningen under.
  box(root, width, 0.16, LOFT_HALF_DEPTH * 2, '#7d684d', centreX, -0.09, 0);
  for (let z = -LOFT_HALF_DEPTH + 0.17; z < LOFT_HALF_DEPTH; z += 0.34) {
    box(root, width - 0.02, 0.022, 0.323, ['#a68c62', '#b39a70', '#9e8459'][Math.round((z + LOFT_HALF_DEPTH) / 0.34) % 3], centreX, -0.011, z);
  }
  for (const z of [-LOFT_HALF_DEPTH + 0.6, 0.4, LOFT_HALF_DEPTH - 0.7]) for (let x = LOFT_MIN_X + 0.4; x < LOFT_MAX_X; x += 1.1) box(root, 0.05, 0.004, 0.012, '#6b5537', x + (z > 0 ? 0.3 : 0), 0.002, z);
  for (const x of [LOFT_MIN_X + 0.05, centreX, LOFT_MAX_X - 0.05]) box(root, 0.16, 0.20, LOFT_HALF_DEPTH * 2, '#6e5a42', x, -0.27, 0);

  // Timrad gavel som smalnar av mot nocken, och låga knävägar under takfallen.
  const gableTop = logWall(root, [LOFT_MAX_X, -LOFT_HALF_DEPTH], [LOFT_MAX_X, LOFT_HALF_DEPTH], 0, 7, { tone: 1, taperPerRow: 0.365, startOverhang: 0.24, endOverhang: 0.24 });
  for (const side of [-1, 1]) {
    logWall(root, [LOFT_MIN_X, side * LOFT_HALF_DEPTH], [LOFT_MAX_X, side * LOFT_HALF_DEPTH], 0, 2, { stagger: true, tone: side < 0 ? 2 : 3, startOverhang: 0.12 });
  }
  // Nockås och takstolar: bara några få, så att kameran ser in på loftet.
  const ridgeY = gableTop + 0.05, kneeY = LOG_PITCH * 2 + 0.05;
  beam(root, new THREE.Vector3(LOFT_MIN_X - 0.3, ridgeY, 0), new THREE.Vector3(LOFT_MAX_X + 0.25, ridgeY, 0), 0.075, '#8a6c47', 8);
  for (const x of [LOFT_MIN_X + 0.35, LOFT_MIN_X + 2.05, LOFT_MIN_X + 3.75, LOFT_MIN_X + 5.45]) {
    for (const side of [-1, 1]) beam(root, new THREE.Vector3(x, kneeY, side * (LOFT_HALF_DEPTH + 0.1)), new THREE.Vector3(x, ridgeY - 0.02, side * 0.08), 0.055, '#96774f', 6);
  }
  // Räcke längs den öppna kanten, med en lucka där stegen kommer upp.
  const gap: [number, number] = [LADDER_Z - 0.42, LADDER_Z + 0.42];
  for (const [z0, z1] of [[-LOFT_HALF_DEPTH, gap[0]], [gap[1], LOFT_HALF_DEPTH]] as [number, number][]) {
    roundedBox(root, 0.08, 0.075, z1 - z0, '#b99c6b', LOFT_MIN_X + 0.08, 0.92, (z0 + z1) / 2, 0.02);
    for (let z = z0 + 0.12; z < z1; z += 0.36) roundedBox(root, 0.06, 0.90, 0.06, '#a08055', LOFT_MIN_X + 0.08, 0.45, Math.min(z, z1 - 0.06), 0.01);
    block(LOFT_MIN_X + 0.08, (z0 + z1) / 2, 0.16, z1 - z0);
  }
  for (const z of gap) ellipsoid(root, '#b69a6a', LOFT_MIN_X + 0.08, 0.98, z, 0.07, 0.07, 0.07, 12);
  sign(root, 'LOFTET', LOFT_MIN_X + 0.35, 1.22, LADDER_Z + 1.30, 1.05, 0.28, '#d7c596');

  // Bakmaskinen står på ett litet bord vid gaveln, med locket på glänt.
  const table = new THREE.Group();
  const bx = HOME.breadMachine.x - HOME.center.x, bz = HOME.breadMachine.z - HOME.center.z;
  table.position.set(bx, 0, bz);
  roundedBox(table, 0.98, 0.07, 0.64, '#a98459', 0, 0.76, 0, 0.015);
  for (const x of [-0.42, 0.42]) for (const z of [-0.25, 0.25]) box(table, 0.07, 0.74, 0.07, '#7d6141', x, 0.37, z);
  box(table, 0.86, 0.05, 0.05, '#7d6141', 0, 0.20, -0.25);
  root.add(table); block(bx, bz, 1.0, 0.7);
  const machine = new THREE.Group(); machine.position.set(-0.08, 0.795, 0.02); table.add(machine);
  roundedBox(machine, 0.40, 0.34, 0.34, '#e6dfcb', 0, 0.17, 0, 0.04);
  roundedBox(machine, 0.41, 0.05, 0.35, '#8e8877', 0, 0.025, 0, 0.012);
  roundedBox(machine, 0.30, 0.16, 0.24, '#1b1714', 0, 0.36, 0, 0.03); // den förkolnade limpan
  for (let i = 0; i < 4; i++) box(machine, 0.03, 0.01, 0.02, '#0f0d0b', -0.10 + i * 0.07, 0.445, -0.03 + (i % 2) * 0.05);
  const lid = new THREE.Group(); lid.position.set(0, 0.34, -0.17); lid.rotation.x = -0.62; machine.add(lid);
  roundedBox(lid, 0.38, 0.06, 0.34, '#d5cdb4', 0, 0.03, 0.17, 0.015);
  box(lid, 0.16, 0.012, 0.13, '#2a3130', 0, 0.062, 0.17);
  roundedBox(lid, 0.14, 0.03, 0.05, '#c2b99f', 0, 0.075, 0.325, 0.01);
  // Manöverpanel: en gulgrön display, fyra knappar och en röd lampa som blinkar när den går.
  box(machine, 0.28, 0.11, 0.012, '#3b4340', 0, 0.20, 0.176);
  const lcd = new THREE.MeshStandardMaterial({ color: '#8fbf7e', emissive: '#9fd28c', emissiveIntensity: 0.9, roughness: 0.4 });
  box(machine, 0.11, 0.045, 0.006, lcd, -0.06, 0.215, 0.184);
  for (let i = 0; i < 4; i++) roundedBox(machine, 0.028, 0.02, 0.008, i === 3 ? '#c3574a' : '#d9d2bb', 0.03 + i * 0.033, 0.168, 0.184, 0.004);
  const led = new THREE.MeshStandardMaterial({ color: '#ff5a3c', emissive: '#ff3b1f', emissiveIntensity: 1.2, roughness: 0.3 });
  ellipsoid(machine, led, 0.085, 0.228, 0.185, 0.014, 0.014, 0.008, 10);
  // Sladden går ned från bordet till en skarvsladdsvinda på golvet: därför har den kunnat gå så länge.
  const cord = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.15, 0.06, -0.15), new THREE.Vector3(-0.32, -0.02, -0.34), new THREE.Vector3(-0.50, -0.55, -0.42),
    new THREE.Vector3(-0.62, -0.80, -0.20), new THREE.Vector3(-0.95, -0.80, 0.10),
  ]);
  machine.add(mesh(new THREE.TubeGeometry(cord, 24, 0.009, 6, false), smoothMaterial('#3c3f38')));
  const reel = cylinder(table, 0.13, 0.13, 0.11, '#d9702f', -1.10, 0.13, 0.16, 14); reel.rotation.z = Math.PI / 2;
  cylinder(table, 0.05, 0.05, 0.14, '#2d2c28', -1.10, 0.13, 0.16, 10).rotation.z = Math.PI / 2;
  box(table, 0.10, 0.05, 0.08, '#e1e3dc', -1.02, 0.03, 0.05);
  // Bevis på ett års bakning: en trave kolsvarta limpor, mjölpåsen och lite spill.
  for (let i = 0; i < 6; i++) {
    const brick = roundedBox(table, 0.24, 0.085, 0.13, i % 2 ? '#211d19' : '#2a2521', 0.30 + (i % 2) * 0.03, 0.84 + Math.floor(i / 2) * 0.088, -0.12 + (i % 3) * 0.02, 0.02);
    brick.rotation.y = (i % 3 - 1) * 0.12;
  }
  roundedBox(table, 0.24, 0.31, 0.15, '#efe6d0', 0.31, 0.95, 0.20, 0.03).rotation.z = -0.18;
  box(table, 0.18, 0.05, 0.02, '#c8a15d', 0.29, 0.99, 0.28);
  for (let i = 0; i < 5; i++) box(table, 0.08 + (i % 3) * 0.04, 0.004, 0.06, '#f4efe1', -0.35 + i * 0.13, 0.797, 0.22 - (i % 2) * 0.1);
  // Rök från maskinen; motorn låter den stiga när bakmaskinen är igång.
  const smoke: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const puff = mesh(new THREE.IcosahedronGeometry(0.09, 1), new THREE.MeshStandardMaterial({ color: '#d8d4c6', transparent: true, opacity: 0.2, depthWrite: false }), false);
    puff.position.set(bx - 0.08, 1.30 + i * 0.25, bz + 0.02); root.add(puff); smoke.push(puff);
  }
  const smokeOrigin = new THREE.Vector3(bx - 0.08, 1.28, bz + 0.02);
  const label = sign(root, 'BILLS BAKMASKIN', LOFT_MAX_X - 0.14, 1.28, bz, 1.55, 0.28, '#dfd2a9'); label.rotation.y = -Math.PI / 2;
  // Väggalmanackan hänger kvar på december: ingen har varit här uppe sedan dess.
  const calendar = sign(root, 'DECEMBER', LOFT_MAX_X - 0.14, 0.86, bz + 1.35, 0.62, 0.50, '#f1e9d3'); calendar.rotation.y = -Math.PI / 2;
  box(root, 0.02, 0.36, 0.56, '#c9412f', LOFT_MAX_X - 0.145, 0.66, bz + 1.35);
  box(root, 0.02, 0.34, 0.54, '#f6f0df', LOFT_MAX_X - 0.15, 0.66, bz + 1.35);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) box(root, 0.006, 0.04, 0.05, (r * 6 + c) % 7 === 6 ? '#c9412f' : '#7a7466', LOFT_MAX_X - 0.155, 0.79 - r * 0.075, bz + 1.13 + c * 0.088);

  // Sovhörna med madrass, kudde och filt, plus två flyttkartonger med julsakerna.
  const bed = new THREE.Group(); bed.position.set(2.45, 0, 1.45); root.add(bed); block(2.45, 1.45, 2.0, 1.0);
  roundedBox(bed, 1.95, 0.20, 0.92, '#c9c2a7', 0, 0.10, 0, 0.05);
  for (let x = -0.85; x < 0.9; x += 0.24) box(bed, 0.05, 0.005, 0.90, '#98a3b2', x, 0.203, 0);
  roundedBox(bed, 1.15, 0.10, 0.88, '#7f8c6c', 0.32, 0.245, 0, 0.035);
  roundedBox(bed, 0.52, 0.14, 0.40, '#ece4cd', -0.62, 0.27, 0, 0.06).rotation.y = -0.12;
  for (const [x, z, h] of [[0.25, -1.65, 0.62], [1.05, -1.72, 0.48]] as [number, number, number][]) {
    roundedBox(root, 0.66, h, 0.62, '#b8955f', x, h / 2, z, 0.015);
    box(root, 0.68, 0.03, 0.05, '#8f7346', x, h - 0.06, z + 0.30);
    box(root, 0.30, 0.16, 0.012, '#f1e9d3', x, h * 0.55, z + 0.315);
  }
  block(0.65, -1.68, 1.5, 0.7);
  // En naken glödlampa i en sladd från nockåsen.
  cylinder(root, 0.006, 0.006, 0.60, '#3c3f38', 2.0, ridgeY - 0.30, 0, 6);
  cylinder(root, 0.035, 0.03, 0.06, '#8d8f86', 2.0, ridgeY - 0.63, 0, 10);
  ellipsoid(root, new THREE.MeshStandardMaterial({ color: '#fff1c8', emissive: '#ffd27a', emissiveIntensity: 1.1, roughness: 0.3 }), 2.0, ridgeY - 0.73, 0, 0.055, 0.075, 0.055, 12);

  mergeStaticMeshes(root, new Set<THREE.Object3D>(smoke));
  root.visible = false;
  const setRunning = (running: boolean) => {
    led.emissiveIntensity = running ? 1.2 : 0.0; led.color.set(running ? '#ff5a3c' : '#5a3a33');
    lcd.emissiveIntensity = running ? 0.9 : 0.0; lcd.color.set(running ? '#8fbf7e' : '#4c5a49');
    for (const puff of smoke) puff.visible = running;
  };
  return { root, colliders, smoke, smokeOrigin, led, setRunning };
}
