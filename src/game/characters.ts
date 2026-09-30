import * as THREE from 'three';
import { box, ellipsoid, makeTextTexture, mesh, roundedBox, smoothMaterial } from './primitives';
import { mergeStaticMeshes } from './optimize';
import { contactShadow } from './look';

export type CharacterKind = 'leffe' | 'bill' | 'rurik' | 'bailiff' | 'shopkeeper' | 'inspector';
export interface CharacterModel {
  root: THREE.Group;
  body: THREE.Group;
  arms: THREE.Group[];
  legs: THREE.Group[];
  head: THREE.Group;
  eyes: THREE.Group[];
  gait: { phase: number; blend: number };
}

function stitch(parent: THREE.Object3D, points: number[][], radius: number, color: string) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number])));
  const object = mesh(new THREE.TubeGeometry(curve, 10, radius, 5, false), smoothMaterial(color));
  parent.add(object);
  return object;
}

// Varselväst: fluorescerande tyg lyser lite av sig självt, reflexbanden är blanka
// och lätt metalliska så att de fångar solen. Samma materialinstanser återanvänds
// så att mergeStaticMeshes kan slå ihop alla bitar per figur.
const hiVisCache = new Map<string, THREE.MeshStandardMaterial>();
function hiVis(color: string, glow: string) {
  const key = `${color}-${glow}`;
  if (!hiVisCache.has(key)) hiVisCache.set(key, new THREE.MeshStandardMaterial({ color, emissive: glow, emissiveIntensity: 0.55, roughness: 0.9 }));
  return hiVisCache.get(key)!;
}
let reflexTape: THREE.MeshStandardMaterial | null = null;
function reflex() {
  reflexTape ??= new THREE.MeshStandardMaterial({ color: '#e3e8ea', emissive: '#4a5256', emissiveIntensity: 0.45, roughness: 0.3, metalness: 0.55 });
  return reflexTape;
}

/** Ett böjt tygstycke som sluter om ryggen: en ringsektor i xz-planet, utdragen i höjdled. */
function curvedPanel(parent: THREE.Object3D, material: THREE.Material, innerRadius: number, thickness: number,
  height: number, halfAngle: number, y: number, zCentre: number) {
  const outer = innerRadius + thickness;
  const from = Math.PI / 2 - halfAngle, to = Math.PI / 2 + halfAngle;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, from, to, false);
  shape.absarc(0, 0, innerRadius, to, from, true);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 18 });
  // Formen ritas i uv-planet med ryggen åt +v; efter vridningen pekar +v mot −z (bakåt).
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y - height / 2, zCentre);
  const panel = mesh(geometry, material);
  parent.add(panel);
  return panel;
}

/** Öppen varselväst med reflexband: böjt ryggstycke, axelband och två framstycken som hänger fritt över magen. */
function addVest(body: THREE.Group, color: string, glow: string) {
  const cloth = hiVis(color, glow), tape = reflex();
  // Ryggstycket böjer sig svagt (radie 0.9) så att tyget ligger utanför bålens rygg ända ut till
  // ärmhålen, där det försvinner in under ärmarna; reflexbanden följer med runt.
  // Geväret bärs utanpå ryggstycket (yttre yta z ≈ −0.35, se updateEquipment i motorn).
  curvedPanel(body, cloth, 0.90, 0.045, 0.68, 0.545, 1.38, 0.595);
  for (const y of [1.22, 1.46]) curvedPanel(body, tape, 0.94, 0.012, 0.065, 0.555, y, 0.595);
  for (const side of [-1, 1]) {
    roundedBox(body, 0.23, 0.07, 0.54, cloth, side * 0.30, 1.735, -0.03, 0.03);
    roundedBox(body, 0.075, 0.075, 0.54, tape, side * 0.30, 1.735, -0.03, 0.015);
    // Framstycket hänger från axeln och lägger sig mot magen; mitten lämnas öppen.
    const panel = new THREE.Group();
    panel.position.set(side * 0.255, 1.71, 0.265);
    panel.rotation.set(-0.24, side * 0.07, side * 0.04);
    roundedBox(panel, 0.29, 0.72, 0.075, cloth, 0, -0.35, 0, 0.04);
    for (const y of [-0.25, -0.49]) roundedBox(panel, 0.30, 0.065, 0.08, tape, 0, y, 0, 0.02);
    // Bröstficka med penna på vänster sida, ID-ficka på höger: små detaljer som syns nära.
    if (side < 0) {
      roundedBox(panel, 0.17, 0.12, 0.03, '#2f3538', 0, -0.13, 0.045, 0.01);
      roundedBox(panel, 0.022, 0.11, 0.022, '#e9e4d6', 0.045, -0.085, 0.055, 0.008);
    } else {
      roundedBox(panel, 0.15, 0.10, 0.02, '#f2efe4', 0, -0.13, 0.045, 0.008);
      roundedBox(panel, 0.11, 0.03, 0.006, '#7a8d9a', 0, -0.115, 0.058, 0.002);
    }
    body.add(panel);
  }
}

/** Fullskägg med mustasch; munnen ritas som en ljusare läpp ovanpå skägget. */
function addBeard(head: THREE.Group, color: string, grey: string | null, skinShade: string) {
  ellipsoid(head, color, 0, -0.235, 0.105, 0.32, 0.235, 0.27, 20);
  for (const side of [-1, 1]) {
    ellipsoid(head, color, side * 0.255, -0.11, 0.06, 0.10, 0.20, 0.19, 14).rotation.z = side * 0.2;
    ellipsoid(head, color, side * 0.07, -0.145, 0.36, 0.095, 0.036, 0.036, 12).rotation.z = side * 0.16;
  }
  if (grey) for (const [x, y] of [[-0.09, -0.31], [0.11, -0.26], [0.0, -0.40]]) ellipsoid(head, grey, x, y, 0.33, 0.045, 0.06, 0.03, 8);
  ellipsoid(head, skinShade, 0, -0.205, 0.375, 0.07, 0.021, 0.018, 12);
}

function fabric(base: string, stripe: string, plaid = true) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
  if (plaid) {
    ctx.fillStyle = stripe;
    for (let i = 0; i < 128; i += 32) {
      ctx.globalAlpha = 0.35; ctx.fillRect(i, 0, 9, 128); ctx.fillRect(0, i, 128, 9);
      ctx.globalAlpha = 0.65; ctx.fillRect(i + 15, 0, 1.5, 128); ctx.fillRect(0, i + 15, 128, 1.5);
    }
  }
  ctx.globalAlpha = 0.11; ctx.fillStyle = '#fff1d5';
  for (let i = 0; i < 128; i += 4) ctx.fillRect(i, 0, 1, 128);
  ctx.globalAlpha = 0.08; ctx.fillStyle = '#202820';
  for (let i = 0; i < 128; i += 4) ctx.fillRect(0, i, 128, 1);
  // Tiny crossed fibres keep the checks readable without a plastic-looking surface.
  ctx.globalAlpha = .075;
  for (let y = 0; y < 128; y += 2) for (let x = y % 4; x < 128; x += 4) {
    ctx.fillStyle = (x + y) % 8 ? '#fff4d9' : '#243b30'; ctx.fillRect(x, y, 1, 1);
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: .009, roughness: 0.93 });
}

/** Original, articulated miniature figures with different silhouettes and clothing. */
export function createCharacter(kind: CharacterKind): CharacterModel {
  const leffe = kind === 'leffe', bill = kind === 'bill', rurik = kind === 'rurik', surveyor = kind === 'bailiff', clerk = kind === 'shopkeeper', inspector = kind === 'inspector';
  // Vännerna är rejäla karlar: bredare bål, mage över bältet, skägg och varselväst.
  const stout = leffe || bill;
  const skin = leffe ? '#dcb38f' : bill ? '#ebcbb5' : rurik ? '#c39573' : clerk ? '#c99b78' : '#d4b197';
  const hair = leffe ? '#74533a' : bill ? '#9a784d' : '#67513d';
  const coat = leffe ? '#246b78' : bill ? '#715787' : rurik ? '#969054' : clerk ? '#bc4439' : inspector ? '#46525f' : '#ca9f43';
  const denim = leffe ? '#3c4942' : bill ? '#415e6b' : rurik ? '#495f68' : inspector ? '#39424e' : '#4d625b';
  const shirt = fabric(leffe ? '#d4bb72' : '#c9c8ca', leffe ? '#a6854a' : '#8e839c', false);
  const outerFabric = fabric(coat, coat, false);
  const trouserFabric = fabric(denim, denim, false);
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(contactShadow(1.7, 1.4, .30), body);
  roundedBox(body, stout ? 0.88 : 0.84, 0.79, stout ? 0.54 : 0.50, outerFabric, 0, 1.32, 0, 0.18);
  roundedBox(body, stout ? 0.76 : 0.69, 0.23, stout ? 0.48 : 0.41, trouserFabric, 0, 0.92, 0, 0.08);
  ellipsoid(body, skin, 0, 1.78, 0, 0.135, 0.16, 0.135);
  const legs: THREE.Group[] = [], arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * 0.208, 0.94, 0);
    roundedBox(leg, 0.30, 0.75, 0.35, trouserFabric, 0, -0.32, 0, 0.11);
    roundedBox(leg, 0.235, 0.19, 0.015, leffe ? '#515b51' : '#637e87', 0, -0.32, 0.176, 0.045);
    stitch(leg, [[side * 0.135, -0.02, 0.03], [side * 0.143, -0.30, 0.02], [side * 0.13, -0.66, 0.02]], 0.007, '#819084');
    roundedBox(leg, 0.33, 0.28, 0.39, '#514c39', 0, -0.69, 0.012, 0.08);
    roundedBox(leg, 0.35, 0.24, 0.56, '#3b3c31', 0, -0.80, 0.095, 0.10);
    roundedBox(leg, 0.355, 0.06, 0.57, '#272e28', 0, -0.915, 0.095, 0.025);
    for (let j = 0; j < 3; j++) roundedBox(leg, 0.17, 0.018, 0.025, '#908973', 0, -0.694 + j * 0.014, 0.19 - j * 0.07, 0.007);
    body.add(leg); legs.push(leg);

    const arm = new THREE.Group(); arm.position.set(side * 0.467, 1.59, 0.0);
    const sleeve = outerFabric;
    roundedBox(arm, 0.31, 0.37, 0.34, sleeve, 0, -0.135, 0, 0.135);
    const lower = roundedBox(arm, 0.275, 0.36, 0.30, sleeve, 0, -0.43, 0.05, 0.11); lower.rotation.x = -0.12;
    if (leffe) roundedBox(arm, 0.32, 0.14, 0.33, '#d8b258', 0, 0.004, 0, 0.055);
    roundedBox(arm, 0.266, 0.09, 0.29, surveyor ? '#ba873c' : leffe ? '#344937' : '#899b89', 0, -0.595, 0.071, 0.035);
    ellipsoid(arm, skin, 0, -0.71, 0.082, 0.134, 0.159, 0.13, 14);
    ellipsoid(arm, skin, -side * 0.115, -0.677, 0.141, 0.060, 0.089, 0.060, 12);
    for (let j = 0; j < 3; j++) roundedBox(arm, 0.014, 0.046, 0.010, '#b48463', (j - 1) * 0.05, -0.782, 0.187, 0.004);
    arm.rotation.z = side * 0.055;
    body.add(arm); arms.push(arm);
  }
  if (stout) {
    // Leffe: turkos regnjacka öppen över en rutig skjorta. Bill: lila huvtröja.
    // Magen buktar ut under bröstet och hänger över bältet; västen hänger öppen över den.
    ellipsoid(body, leffe ? shirt : outerFabric, 0, 1.09, 0.13, 0.385, 0.285, 0.31, 22);
    roundedBox(body, 0.78, 0.10, 0.50, '#4a3a2c', 0, 0.90, 0.0, 0.03);
    roundedBox(body, 0.10, 0.08, 0.03, '#b9a46a', 0, 0.90, 0.255, 0.012);
    if (leffe) {
      roundedBox(body, .24, .40, .08, shirt, 0, 1.50, .288, .03);
      for (const side of [-1, 1]) {
        const lapel = roundedBox(body, .20, .40, .075, '#1b5765', side * .21, 1.50, .31, .025);
        lapel.rotation.z = side * .18;
      }
      roundedBox(body, .45, .12, .10, '#dab763', 0, 1.70, .235, .04);
      roundedBox(body, .11, .34, .10, '#e2bf6c', 0, 1.47, .355, .035);
      addVest(body, '#ff6f12', '#8a2f00');
    } else {
      const pocket = roundedBox(body, .56, .22, .09, '#5a4673', 0, 1.02, .40, .05); pocket.rotation.x = 0.42;
      roundedBox(body, .44, .12, .07, '#967cae', 0, 1.72, .26, .03);
      for (const side of [-1, 1]) roundedBox(body, .04, .25, .04, '#e1ceaa', side * .06, 1.55, .325, .012);
      addVest(body, '#e6f227', '#5f6b00');
    }
  }
  if (surveyor) {
    // Fictional path surveyors: rain jackets and field maps, no formal uniform.
    roundedBox(body, 0.47, 0.56, 0.055, '#e0b252', 0, 1.39, 0.272, 0.025);
    for (const side of [-1, 1]) {
      roundedBox(body, 0.20, 0.34, 0.054, '#e1c777', side * 0.19, 1.48, 0.305, 0.016);
      roundedBox(arms[side < 0 ? 0 : 1], 0.32, 0.065, 0.33, '#edcf7c', 0, -0.36, 0.045, 0.024);
    }
    roundedBox(body, 0.31, 0.15, 0.07, '#5c7568', 0, 1.12, 0.312, 0.026);
    roundedBox(arms[0], 0.41, 0.52, 0.10, '#8c754b', 0, -0.61, 0.18, 0.025);
    roundedBox(arms[0], 0.32, 0.34, 0.012, '#d7d1a4', 0, -0.57, 0.242, 0.004);
    for (let j = 0; j < 3; j++) box(arms[0], 0.20, 0.009, 0.008, '#638078', 0, -0.49 - j * 0.056, 0.25);
  }
  if (inspector) {
    // Skattemasarna: mörk kavaj, smal slips och portföljer fulla med blanketter.
    roundedBox(body, 0.40, 0.46, 0.05, '#e8e4d4', 0, 1.47, 0.275, 0.028);
    roundedBox(body, 0.085, 0.34, 0.03, '#8c3b34', 0, 1.42, 0.312, 0.016);
    roundedBox(body, 0.26, 0.13, 0.045, '#2f3942', 0, 1.12, 0.30, 0.022);
    roundedBox(arms[0], 0.40, 0.30, 0.11, '#6b5138', 0, -0.60, 0.16, 0.024);
    roundedBox(arms[1], 0.28, 0.20, 0.055, '#d7d1a4', 0, -0.56, 0.155, 0.018);
  }
  if (rurik) {
    roundedBox(body, 0.25, 0.10, 0.05, '#b5b083', 0, 1.69, 0.25, 0.04);
    roundedBox(body, 0.69, 0.08, 0.44, '#534331', 0, 0.995, 0, 0.03);
    roundedBox(body, 0.105, 0.10, 0.035, '#cbbd8e', 0, 0.997, 0.233, 0.013);
  }
  if (clerk) {
    roundedBox(body, 0.63, 0.69, 0.052, '#f3ebd8', 0, 1.21, 0.29, 0.065);
    for (const side of [-1, 1]) roundedBox(body, 0.06, 0.43, 0.05, '#eee4ce', side * 0.20, 1.52, 0.27, 0.016);
    const label = mesh(new THREE.PlaneGeometry(0.26, 0.16), new THREE.MeshStandardMaterial({ map: makeTextTexture('MB', '#f3ebd8', '#486f61', 128, 80), roughness: 1 }));
    label.position.set(0, 1.43, 0.323); body.add(label);
    roundedBox(body, 0.29, 0.20, 0.035, '#ded7c4', 0, 1.12, 0.324, 0.018);
  }

  const head = new THREE.Group(); head.position.set(0, 2.08, 0.015);
  ellipsoid(head, skin, 0, 0, 0, 0.359, 0.438, 0.326, 28);
  ellipsoid(head, skin, 0, -.246, .057, .251, .153, .229, 20);
  ellipsoid(head, skin, -0.22, -0.093, 0.229, 0.12, 0.142, 0.09, 14);
  ellipsoid(head, skin, 0.22, -0.093, 0.229, 0.12, 0.142, 0.09, 14);
  for (const side of [-1, 1]) {
    ellipsoid(head, skin, side * 0.362, -0.009, 0, 0.073, 0.115, 0.076, 14);
    ellipsoid(head, bill ? '#d9aa95' : '#c18b6c', side * 0.399, -0.005, 0.035, 0.023, 0.058, 0.027, 10);
    ellipsoid(head, hair, side * 0.321, 0.13, -0.07, 0.05, 0.19, 0.178, 12);
    stitch(head, [[side * 0.208, 0.125, 0.285], [side * 0.13, leffe ? 0.136 : 0.151, 0.322], [side * 0.068, 0.123, 0.324]], leffe ? 0.021 : 0.017, hair);
  }
  const eyes: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(side * 0.130, 0.047, 0.303);
    ellipsoid(eye, '#f1eadd', 0, 0, 0, 0.061, 0.043, 0.032, 14);
    ellipsoid(eye, leffe ? '#67796d' : '#667981', -side * 0.005, -0.001, 0.028, 0.025, 0.030, 0.011, 12);
    ellipsoid(eye, '#2c3532', -side * 0.005, -0.001, 0.038, 0.012, 0.020, 0.007, 10);
    ellipsoid(eye, '#fff7e6', -side * 0.009 + 0.006, 0.012, 0.044, 0.007, 0.009, 0.004, 8);
    head.add(eye); eyes.push(eye);
  }
  ellipsoid(head, skin, 0, -0.025, 0.321, 0.061, 0.126, 0.051, 16);
  ellipsoid(head, bill ? '#dfb49c' : '#d39c74', 0, -0.085, 0.372, 0.070, 0.051, 0.055, 16);
  for (const side of [-1, 1]) ellipsoid(head, '#a67456', side * 0.037, -0.110, 0.397, 0.011, 0.008, 0.005, 8);
  if (stout) addBeard(head, leffe ? '#4a3c36' : '#a67a4b', leffe ? '#8b7f76' : '#cbb58c', bill ? '#b98a78' : '#a56f5c');
  else stitch(head, [[-0.082, -0.188, 0.304], [0, -0.218, 0.318], [0.082, -0.188, 0.304]], 0.012, '#895f51');
  if (rurik || clerk) for (const side of [-1, 1]) ellipsoid(head, hair, side * 0.058, -0.152, 0.319, 0.078, 0.036, 0.025, 12).rotation.z = side * 0.10;
  if (surveyor) {
    const hat = mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), smoothMaterial('#668474'));
    hat.scale.set(.38, .26, .35); hat.position.y = .28; head.add(hat);
    roundedBox(head, .74, .09, .70, '#496a61', 0, .28, 0, .045);
    roundedBox(head, .35, .035, .18, '#496a61', 0, .30, .35, .018);
  }
  if (clerk) {
    const cap = new THREE.Group(); cap.position.y = 0.275;
    const capColor = leffe ? '#285c47' : bill ? '#273a45' : '#b84739';
    const trim = leffe ? '#dba24d' : bill ? '#a66c5a' : '#eee0c4';
    const crown = mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), smoothMaterial(capColor));
    crown.scale.set(0.39, 0.247, 0.353); cap.add(crown);
    const band = mesh(new THREE.CylinderGeometry(0.386, 0.386, 0.044, 28), smoothMaterial(trim)); band.scale.z = 0.91; band.position.y = 0.008; cap.add(band);
    const shape = new THREE.Shape();
    shape.moveTo(-0.335, 0.12); shape.quadraticCurveTo(-0.435, 0.51, -0.19, 0.60); shape.quadraticCurveTo(0, 0.68, 0.19, 0.60); shape.quadraticCurveTo(0.435, 0.51, 0.335, 0.12); shape.quadraticCurveTo(0, 0.28, -0.335, 0.12);
    const brimGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.030, bevelEnabled: true, bevelSize: 0.009, bevelThickness: 0.008, bevelSegments: 2, steps: 1, curveSegments: 14 });
    brimGeometry.rotateX(Math.PI / 2);
    const underside = mesh(brimGeometry, smoothMaterial(trim)); underside.position.set(0, 0.023, 0); cap.add(underside);
    const top = mesh(brimGeometry.clone(), smoothMaterial(capColor)); top.position.y = 0.044; cap.add(top);
    stitch(cap, [[-0.32, 0.063, 0.32], [-0.24, 0.063, 0.51], [0, 0.063, 0.58], [0.24, 0.063, 0.51], [0.32, 0.063, 0.32]], 0.006, leffe ? '#a8b07a' : '#968578');
    for (const side of [-1, 1]) stitch(cap, [[side * 0.25, 0.047, 0.263], [side * 0.18, 0.18, 0.17], [0, 0.248, 0]], 0.006, leffe ? '#729173' : '#647067');
    ellipsoid(cap, capColor, 0, 0.248, 0, 0.042, 0.021, 0.041, 12);
    roundedBox(cap, clerk ? 0.20 : 0.17, 0.068, 0.014, clerk ? '#eee1c9' : leffe ? '#c8b981' : '#b98574', 0, 0.12, 0.320, 0.015);
    if (bill) stitch(cap, [[-0.053, 0.168, 0.279], [0, 0.185, 0.284], [0.058, 0.168, 0.279]], 0.008, '#b58979');
    cap.rotation.z = leffe ? 0.025 : -0.035;
    head.add(cap);
  }
  if (leffe || bill) {
    const hairTop = mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * .48), smoothMaterial(leffe ? '#51443e' : '#d4c5af'));
    hairTop.scale.set(.374, .45, .34); hairTop.position.y = .07; head.add(hairTop);
    if (leffe) {
      for (const side of [-1, 1]) {
        const lens = mesh(new THREE.TorusGeometry(.103, .014, 6, 18), smoothMaterial('#475c56'));
        lens.position.set(side * .15, .038, .351); head.add(lens);
      }
      roundedBox(head, .10, .019, .025, '#475c56', 0, .045, .363, .007);
    } else {
      for (const x of [-.17, -.06, .06, .18]) {
        const fringe = ellipsoid(head, '#d4c5af', x, .288 - Math.abs(x) * .28, .249, .093, .109, .07, 12);
        fringe.rotation.z = .35;
      }
    }
  }
  body.add(head);
  root.scale.setScalar(1.10);
  for (const joint of [...arms, ...legs]) mergeStaticMeshes(joint);
  for (const eye of eyes) mergeStaticMeshes(eye);
  mergeStaticMeshes(head, new Set(eyes));
  mergeStaticMeshes(body, new Set([...arms, ...legs, head]));
  return { root, body, arms, legs, head, eyes, gait: { phase: 0, blend: 0 } };
}

export function createShoppingBag() {
  const root = new THREE.Group();
  roundedBox(root, 0.43, 0.50, 0.27, '#f1e5c9', 0, -0.23, 0, 0.035);
  stitch(root, [[-0.12, 0.02, 0.025], [-0.11, 0.17, 0.025], [0.11, 0.17, 0.025], [0.12, 0.02, 0.025]], 0.021, '#c8b99b');
  const label = mesh(new THREE.PlaneGeometry(0.25, 0.16), new THREE.MeshStandardMaterial({ map: makeTextTexture('MB', '#f1e5c9', '#486f61', 128, 80), roughness: 1 }));
  label.position.set(0, -0.2, 0.140); root.add(label);
  mergeStaticMeshes(root);
  root.position.set(0, -0.83, 0.10);
  root.visible = false;
  return root;
}

export function animateCharacter(model: CharacterModel, time: number, speed: number, punch = 0, hurt = 0, dt = 1 / 60) {
  // Advance a continuous, per-character stride rather than multiplying the game
  // clock by a changing frequency (which snapped limbs when sprint was toggled).
  const step = Math.max(0, Math.min(dt, .05));
  const target = THREE.MathUtils.clamp(speed / 3, 0, 1);
  model.gait.blend += (target - model.gait.blend) * (1 - Math.exp(-step * 14));
  const walking = model.gait.blend;
  const cadence = THREE.MathUtils.lerp(7.6, 11, THREE.MathUtils.clamp((speed - 4.35) / 3.55, 0, 1));
  model.gait.phase = (model.gait.phase + step * cadence * walking) % (Math.PI * 2);
  const swing = Math.sin(model.gait.phase);
  model.legs[0].rotation.x = swing * 0.59 * walking;
  model.legs[1].rotation.x = -swing * 0.59 * walking;
  model.arms[0].rotation.x = -swing * 0.42 * walking - 0.05;
  model.arms[1].rotation.x = swing * 0.42 * walking - 0.05 - Math.sin(punch * Math.PI) * 2.05;
  // No automatic torso/head movement: the player asked for no rocking at all.
  // Keep only the limb gait, punch and eye blink; damage has particle/UI feedback.
  model.body.position.y = 0;
  model.body.rotation.set(0, 0, 0);
  model.head.rotation.set(0, 0, 0);
  const blink = time % 5.7 < 0.13 ? 0.12 : 1;
  for (const eye of model.eyes) eye.scale.y = blink;
}
