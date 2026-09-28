import * as THREE from 'three';
import { beam, box, ellipsoid, makeTextTexture, mesh, roundedBox, smoothMaterial } from './primitives';
import { mergeStaticMeshes } from './optimize';
import { contactShadow } from './look';

export interface CarModel {
  root: THREE.Group;
  wheels: THREE.Group[];
  frontWheels: THREE.Group[];
  brakeLights: THREE.Mesh[];
  shadow: THREE.Mesh;
}

function loft(sections: { z: number; w: number; top: number; bottom: number }[]) {
  const vertices: number[] = [], indices: number[] = [];
  for (const s of sections) {
    const bevel = 0.075;
    for (const [x, y] of [[-s.w + bevel, s.bottom], [s.w - bevel, s.bottom], [s.w, s.bottom + bevel], [s.w, s.top - bevel], [s.w - bevel, s.top], [-s.w + bevel, s.top], [-s.w, s.top - bevel], [-s.w, s.bottom + bevel]]) vertices.push(x, y, s.z);
  }
  for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < 8; j++) {
    const a = i * 8 + j, b = i * 8 + (j + 1) % 8, c = a + 8, d = b + 8;
    indices.push(a, c, b, b, c, d);
  }
  for (let j = 1; j < 7; j++) { indices.push(0, j, j + 1); const end = (sections.length - 1) * 8; indices.push(end, end + j + 1, end + j); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

/** Original, unbadged blue five-door wagon with a boxy nose. */
export function createCar(color = '#467a9d', official = false): CarModel {
  const root = new THREE.Group(); root.name = official ? 'mätarlagets terrängbil' : 'blå kombi — Blå faran';
  const shadow = contactShadow(3.35, 6.45, .38); shadow.rotation.reorder('ZXY'); root.add(shadow);
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, metalness: 0.40, clearcoat: 0.88, clearcoatRoughness: 0.18 });
  const dark = smoothMaterial(official ? '#485653' : '#2b526d', 0.45, 0.17);
  const glass = new THREE.MeshStandardMaterial({ color: '#496f7b', roughness: 0.14, metalness: 0.34, side: THREE.DoubleSide });
  const trim = smoothMaterial('#283e42', 0.56);
  const chrome = smoothMaterial('#d6deda', 0.22, 0.72);
  const body = mesh(loft([
    { z: -2.42, w: 0.88, bottom: 0.54, top: 1.15 },
    { z: -2.18, w: 0.965, bottom: 0.52, top: 1.23 },
    { z: -1.45, w: 1.0, bottom: 0.51, top: 1.22 },
    { z: 0.35, w: 1.0, bottom: 0.51, top: 1.21 },
    { z: 1.62, w: 0.975, bottom: 0.53, top: 1.15 },
    { z: 2.31, w: 0.915, bottom: 0.58, top: 1.075 },
    { z: 2.43, w: 0.82, bottom: 0.62, top: 1.00 },
  ]), paint); root.add(body);
  roundedBox(root, 1.92, 0.14, 4.75, dark, 0, 0.55, 0.02, 0.05);
  // Extended roof and upright hatch give this a clear five-door wagon profile.
  // The older-looking square bonnet is an aesthetic cue, not a model-specific badge.
  root.add(mesh(loft([
    { z: -2.32, w: 0.86, bottom: 1.18, top: 1.80 },
    { z: -2.04, w: 0.86, bottom: 1.18, top: 1.89 },
    { z: -1.19, w: 0.86, bottom: 1.19, top: 1.91 },
    { z: -0.41, w: 0.87, bottom: 1.19, top: 1.93 },
    { z: 0.35, w: 0.86, bottom: 1.19, top: 1.90 },
    { z: 1.04, w: 0.92, bottom: 1.16, top: 1.23 },
  ]), paint));
  roundedBox(root, 1.68, 0.072, 2.25, paint, 0, 1.91, -0.74, 0.022);
  // Thin, unbadged luggage rails, not a copy of the photographed roof.
  if (!official) for (const side of [-1, 1]) {
    roundedBox(root, 0.035, 0.068, 2.03, trim, side * 0.69, 1.99, -0.84, 0.014);
    for (const z of [-1.69, -0.04]) roundedBox(root, 0.075, 0.065, 0.10, trim, side * 0.69, 1.94, z, 0.018);
  }

  const glint = new THREE.MeshBasicMaterial({ color: '#d9edf1', transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

  // Polygonal windows follow the slanted pillars instead of floating boxes.
  const pane = (points: THREE.Vector3[]) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(p => [p.x, p.y, p.z]), 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]); geometry.computeVertexNormals();
    root.add(mesh(geometry, glass));
    const strip = [points[0].clone().lerp(points[3], .19), points[1].clone().lerp(points[2], .19), points[1].clone().lerp(points[2], .32), points[0].clone().lerp(points[3], .32)];
    const reflectionGeometry = new THREE.BufferGeometry();
    reflectionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(strip.flatMap(p => [p.x, p.y, p.z]), 3));
    reflectionGeometry.setIndex([0, 1, 2, 0, 2, 3]); reflectionGeometry.computeVertexNormals();
    root.add(mesh(reflectionGeometry, glint, false));
    for (let i = 0; i < 4; i++) beam(root, points[i], points[(i + 1) % 4], 0.016, '#263e46', 6);
  };
  pane([new THREE.Vector3(-0.81, 1.873, 0.378), new THREE.Vector3(0.81, 1.873, 0.378), new THREE.Vector3(0.90, 1.26, 0.994), new THREE.Vector3(-0.90, 1.26, 0.994)]);
  pane([new THREE.Vector3(-0.77, 1.76, -2.345), new THREE.Vector3(-0.78, 1.29, -2.395), new THREE.Vector3(0.78, 1.29, -2.395), new THREE.Vector3(0.77, 1.76, -2.345)]);
  for (const side of [-1, 1]) {
    const panels = [
      [[0.90, 1.272, 0.973], [0.885, 1.845, 0.323], [0.90, 1.858, -0.44], [0.984, 1.274, -0.44]],
      [[0.902, 1.852, -0.535], [0.852, 1.853, -1.16], [0.932, 1.274, -1.57], [0.984, 1.274, -0.535]],
      [[0.847, 1.839, -1.26], [0.856, 1.815, -2.03], [0.912, 1.275, -2.22], [0.930, 1.274, -1.68]],
    ];
    for (const panel of panels) pane(panel.map(([x, y, z]) => new THREE.Vector3(x * side, y, z)));
    for (const [a, b] of [[0.27, -0.41], [-0.57, -1.13], [-1.39, -2.00]]) beam(root, new THREE.Vector3(side * 0.895, 1.80, a), new THREE.Vector3(side * 0.897, 1.80, b), 0.009, '#bfd0c7', 5);
    roundedBox(root, 0.035, 0.055, 3.65, trim, side * 1.003, 0.88, -0.02, 0.012);
    roundedBox(root, 0.020, 0.024, 3.27, chrome, side * 0.995, 1.248, -0.59, 0.008);
    for (const z of [-0.38, -1.22]) {
      roundedBox(root, 0.065, 0.053, 0.22, dark, side * 1.008, 1.129, z, 0.023);
      roundedBox(root, 0.074, 0.020, 0.18, chrome, side * 1.013, 1.139, z, 0.008);
    }
    for (const z of [-0.48, -1.33, 0.90]) box(root, 0.016, 0.43, 0.011, dark, side * 1.006, 0.99, z);
    ellipsoid(root, paint, side * 1.06, 1.40, 0.59, 0.185, 0.109, 0.192, 16);
    roundedBox(root, 0.019, 0.122, 0.236, glass, side * 1.215, 1.405, 0.581, 0.04);
    roundedBox(root, 0.037, 0.028, 2.42, chrome, side * 0.81, 1.944, -0.78, 0.009);
    for (const z of [-1.49, 1.46]) {
      const arch = mesh(new THREE.TorusGeometry(0.486, 0.036, 6, 22, Math.PI), dark);
      arch.rotation.y = side * Math.PI / 2; arch.position.set(side * 1.0, 0.466, z); root.add(arch);
    }
    // Subtle hood creases, body-coloured rather than a flat rectangular bonnet.
    beam(root, new THREE.Vector3(side * 0.65, 1.224, 1.045), new THREE.Vector3(side * 0.68, 1.11, 2.19), 0.009, official ? '#828d81' : '#6694ad', 5);
  }
  // Wipers, mirrors and a plain horizontal grille; no brand mark.
  for (const side of [-1, 1]) beam(root, new THREE.Vector3(side * 0.47, 1.274, 0.985), new THREE.Vector3(side * 0.05, 1.345, 0.914), 0.011, '#293d3e');
  beam(root, new THREE.Vector3(-0.39, 1.40, -2.407), new THREE.Vector3(0.19, 1.48, -2.407), 0.011, '#293d3e');
  roundedBox(root, 1.84, 0.23, 0.21, paint, 0, 0.698, 2.386, 0.08);
  roundedBox(root, 1.86, 0.072, 0.14, trim, 0, 0.635, 2.421, 0.026);
  roundedBox(root, 0.78, 0.145, 0.028, trim, 0, 0.66, 2.517, 0.025);
  roundedBox(root, 0.83, 0.235, 0.065, trim, 0, 0.966, 2.394, 0.018);
  for (let j = -2; j <= 2; j++) roundedBox(root, 0.69, 0.014, 0.022, '#afc1bc', 0, 0.966 + j * 0.038, 2.435, 0.004);
  // No diagonal bar, badge, maker name, photograph or copied plate number.
  const lamp = new THREE.MeshStandardMaterial({ color: '#efe9d1', roughness: 0.2, metalness: 0.2, emissive: '#f3dfae', emissiveIntensity: 0.12 });
  const rearLamp = new THREE.MeshStandardMaterial({ color: '#b74539', roughness: 0.27, emissive: '#d5432d', emissiveIntensity: 0.15 });
  const brakeLights: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    roundedBox(root, 0.44, 0.235, 0.078, lamp, side * 0.68, 0.97, 2.348, 0.022);
    roundedBox(root, 0.10, 0.22, 0.07, '#d5a35b', side * 0.96, 0.97, 2.328, 0.014);
    roundedBox(root, 0.40, 0.11, 0.037, '#dedac5', side * 0.69, 0.65, 2.499, 0.014);
    // A simple upright lamp stack sits beside the unbadged rear hatch.
    const rear = roundedBox(root, 0.18, 0.53, 0.082, rearLamp, side * 0.84, 1.34, -2.393, 0.018);
    brakeLights.push(rear);
    roundedBox(root, 0.18, 0.16, 0.084, '#daa35e', side * 0.84, 1.02, -2.394, 0.014);
    roundedBox(root, 0.17, 0.14, 0.083, '#e2dbbd', side * 0.84, 0.89, -2.395, 0.014);
  }
  roundedBox(root, 1.81, 0.187, 0.20, paint, 0, 0.687, -2.391, 0.055);
  roundedBox(root, 1.81, 0.055, 0.09, trim, 0, 0.72, -2.494, 0.022);
  roundedBox(root, 0.48, 0.025, 0.017, chrome, 0, 1.22, -2.434, 0.008);
  roundedBox(root, 1.58, 0.032, 0.024, trim, 0, 1.80, -2.409, 0.008);
  const decal = (text: string, x: number, y: number, z: number, w: number, h: number, back = false, background = '#edeedc', ink = '#304640') => {
    const label = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: makeTextTexture(text, background, ink), roughness: 0.7 }));
    label.position.set(x, y, z); if (back) label.rotation.y = Math.PI; root.add(label); return label;
  };
  decal(official ? 'GM 108' : 'GM 248', 0, 0.728, 2.526, 0.59, 0.143);
  decal(official ? 'GM 108' : 'GM 248', 0, 1.041, -2.451, 0.60, 0.153, true);
  const wheels: THREE.Group[] = [], frontWheels: THREE.Group[] = [];
  for (const z of [-1.49, 1.46]) for (const side of [-1, 1]) {
    const wheel = new THREE.Group(); wheel.position.set(side * 1.00, 0.461, z);
    const tire = mesh(new THREE.CylinderGeometry(0.454, 0.454, 0.25, 24), smoothMaterial('#273333', 0.98)); tire.rotation.z = Math.PI / 2; wheel.add(tire);
    const rim = mesh(new THREE.CylinderGeometry(0.297, 0.297, 0.265, 22), smoothMaterial('#6c8186', 0.29, 0.6)); rim.rotation.z = Math.PI / 2; wheel.add(rim);
    for (const face of [-1, 1]) {
      const ring = mesh(new THREE.TorusGeometry(0.29, 0.027, 7, 24), chrome); ring.rotation.y = Math.PI / 2; ring.position.x = face * 0.14; wheel.add(ring);
      for (let j = 0; j < 5; j++) {
        const a = j * Math.PI * 2 / 5;
        const spoke = roundedBox(wheel, 0.039, 0.243, 0.057, chrome, face * 0.144, Math.cos(a) * 0.151, Math.sin(a) * 0.151, 0.012); spoke.rotation.x = a;
      }
      const hub = mesh(new THREE.CylinderGeometry(0.071, 0.071, 0.019, 16), chrome); hub.rotation.z = Math.PI / 2; hub.position.x = face * 0.16; wheel.add(hub);
    }
    root.add(wheel); wheels.push(wheel); if (z > 0) frontWheels.push(wheel);
  }
  if (official) {
    const side = decal('FÄLTMÄTNING', 1.013, 1.058, -0.52, 0.76, 0.18, false, '#e6d6a3'); side.rotation.y = Math.PI / 2;
  }
  for (const wheel of wheels) mergeStaticMeshes(wheel);
  mergeStaticMeshes(root, new Set<THREE.Object3D>([...wheels, ...brakeLights]));
  return { root, wheels, frontWheels, brakeLights, shadow };
}
