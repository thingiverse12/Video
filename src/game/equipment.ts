import * as THREE from 'three';
import { mesh, roundedBox, smoothMaterial } from './primitives';
import { mergeStaticMeshes } from './optimize';

/** A deliberately simplified, stylized game prop. The long axis points up (+Y)
 * so the same model can stand in the house, hang on a back or be raised to aim. */
export function createHuntingRifle() {
  const root = new THREE.Group();
  root.name = 'Jaktgevär — spelrekvisita';
  const wood = smoothMaterial('#92633d', 0.79);
  const steel = smoothMaterial('#445451', 0.38, 0.42);
  roundedBox(root, 0.205, 0.37, 0.115, wood, -0.033, 0.185, 0, 0.045).rotation.z = -0.13;
  roundedBox(root, 0.225, 0.055, 0.124, '#303c35', -0.052, 0.027, 0, 0.018);
  roundedBox(root, 0.088, 0.31, 0.10, wood, 0.015, 0.429, 0, 0.028).rotation.z = 0.12;
  roundedBox(root, 0.083, 0.25, 0.09, steel, 0, 0.635, 0, 0.02);
  roundedBox(root, 0.10, 0.32, 0.085, wood, 0.009, 0.830, -0.015, 0.035);
  const barrel = mesh(new THREE.CylinderGeometry(0.025, 0.030, 0.83, 12), steel);
  barrel.position.set(0, 1.09, 0.035); root.add(barrel);
  roundedBox(root, 0.042, 0.047, 0.035, '#68736b', 0, 1.478, 0.05, 0.008);
  const slingPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.042, 0.17, -0.05), new THREE.Vector3(0.16, 0.44, -0.10),
    new THREE.Vector3(0.18, 0.80, -0.10), new THREE.Vector3(0.032, 1.11, -0.02),
  ]);
  root.add(mesh(new THREE.TubeGeometry(slingPath, 16, 0.019, 5, false), smoothMaterial('#6c6046')));
  mergeStaticMeshes(root);
  return root;
}
