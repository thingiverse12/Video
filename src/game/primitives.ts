import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const materialCache = new Map<string, THREE.MeshStandardMaterial>();
export function material(color: THREE.ColorRepresentation, roughness = 0.86, metalness = 0) {
  const key = `${color}-${roughness}-${metalness}`;
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true }));
  return materialCache.get(key)!;
}

export function mesh(geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation | THREE.Material, castShadow = true) {
  const result = new THREE.Mesh(geometry, color instanceof THREE.Material ? color : material(color));
  result.castShadow = castShadow;
  result.receiveShadow = true;
  return result;
}

export function box(parent: THREE.Object3D, w: number, h: number, d: number, color: THREE.ColorRepresentation | THREE.Material, x = 0, y = 0, z = 0) {
  const result = mesh(new THREE.BoxGeometry(w, h, d), color);
  result.position.set(x, y, z);
  parent.add(result);
  return result;
}

export function cylinder(parent: THREE.Object3D, rt: number, rb: number, h: number, color: THREE.ColorRepresentation, x = 0, y = 0, z = 0, segments = 8) {
  const result = mesh(new THREE.CylinderGeometry(rt, rb, h, segments), color);
  result.position.set(x, y, z);
  parent.add(result);
  return result;
}

export function beam(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radius: number, color: THREE.ColorRepresentation, segments = 6) {
  const direction = b.clone().sub(a);
  const result = mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), segments), color);
  result.position.copy(a).add(b).multiplyScalar(0.5);
  result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  parent.add(result);
  return result;
}

export function makeTextTexture(text: string, background = '#eaddb9', foreground = '#384432', width = 512, height = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = foreground;
  ctx.lineWidth = 3;
  ctx.strokeRect(7, 7, width - 14, height - 14);
  ctx.font = `bold ${Math.floor(height * 0.43)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = foreground;
  ctx.fillText(text, width / 2, height * 0.53, width * 0.9);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function sign(parent: THREE.Object3D, text: string, x: number, y: number, z: number, width = 2.6, height = 0.65, background = '#eaddb9') {
  const group = new THREE.Group();
  box(group, width + 0.10, height + 0.08, 0.13, '#76634a');
  const face = mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: makeTextTexture(text, background), roughness: 1 }));
  face.position.z = 0.076;
  group.add(face);
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

const smoothCache = new Map<string, THREE.MeshStandardMaterial>();
export function smoothMaterial(color: THREE.ColorRepresentation, roughness = 0.78, metalness = 0) {
  const key = `${color}-${roughness}-${metalness}`;
  if (!smoothCache.has(key)) smoothCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  return smoothCache.get(key)!;
}

export function ellipsoid(parent: THREE.Object3D, color: THREE.ColorRepresentation | THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, segments = 20) {
  const object = mesh(new THREE.SphereGeometry(1, segments, Math.max(10, Math.floor(segments * 0.7))), color instanceof THREE.Material ? color : smoothMaterial(color));
  object.position.set(x, y, z);
  object.scale.set(sx, sy, sz);
  parent.add(object);
  return object;
}

export function roundedBox(parent: THREE.Object3D, w: number, h: number, d: number, color: THREE.ColorRepresentation | THREE.Material, x = 0, y = 0, z = 0, radius = 0.08) {
  const r = Math.min(radius, w * 0.48, h * 0.48, d * 0.48);
  const object = mesh(new RoundedBoxGeometry(w, h, d, 2, r), color instanceof THREE.Material ? color : smoothMaterial(color));
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}
