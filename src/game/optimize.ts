import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Bake immobile pieces sharing a material into a single draw call.
 * Animated joints, instanced vegetation and vertex-coloured terrain stay intact.
 */
export function mergeStaticMeshes(root: THREE.Object3D, exclude: Set<THREE.Object3D> = new Set()) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const buckets = new Map<string, THREE.Mesh[]>();
  const visit = (object: THREE.Object3D) => {
    if (exclude.has(object)) return;
    if (object instanceof THREE.Mesh && !(object instanceof THREE.InstancedMesh) && !Array.isArray(object.material) && !object.geometry.getAttribute('color')) {
      const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}:${object.renderOrder}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(object);
    }
    for (const child of object.children) visit(child);
  };
  for (const child of root.children) visit(child);
  for (const pieces of buckets.values()) {
    if (pieces.length < 2) continue;
    const geometries = pieces.map(piece => {
      const geometry = piece.geometry.index ? piece.geometry.toNonIndexed() : piece.geometry.clone();
      geometry.applyMatrix4(inverse.clone().multiply(piece.matrixWorld));
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
      if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2));
      for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
      return geometry;
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(g => g.dispose());
    if (!merged) continue;
    const combined = new THREE.Mesh(merged, pieces[0].material);
    combined.castShadow = pieces[0].castShadow;
    combined.receiveShadow = pieces[0].receiveShadow;
    combined.renderOrder = pieces[0].renderOrder;
    combined.name = `Batched ${pieces.length} static pieces`;
    for (const piece of pieces) { piece.removeFromParent(); piece.geometry.dispose(); }
    root.add(combined);
  }
}
