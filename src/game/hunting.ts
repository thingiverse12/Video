import * as THREE from 'three';
import { groundHeight, type World, type ElkEntity } from './world';

// Deliberately readable cartoon projectiles, not real-world ballistics.
export const SHOT_SPEED = 28;
export const SHOT_RANGE = 56;
export const SHOT_INTERVAL = .72;
export const RIFLE_MUZZLE = new THREE.Vector3(0, 1.515, .035);
export type ShotImpact = { kind: 'elk' | 'obstacle' | 'person' | 'ground' | 'miss'; point: THREE.Vector3; distance: number; elk?: ElkEntity };
type Person = { root: THREE.Object3D };
interface Projectile { id: number; object: THREE.Group; velocity: THREE.Vector3; travelled: number; }

/** Swept segment/box collision, including a segment beginning inside a solid. */
export function segmentBoxHit(start: THREE.Vector3, end: THREE.Vector3, box: THREE.Box3): number | null {
  if (box.containsPoint(start)) return 0;
  const delta = end.clone().sub(start), length = delta.length();
  if (length < 1e-9) return null;
  const hit = new THREE.Ray(start, delta.divideScalar(length)).intersectBox(box, new THREE.Vector3());
  if (!hit) return null;
  const distance = hit.distanceTo(start);
  return distance <= length + 1e-6 ? distance : null;
}

export class HuntingProjectiles {
  readonly root = new THREE.Group();
  private projectiles: Projectile[] = [];
  private nextId = 1;
  private raycaster = new THREE.Raycaster();
  private boxPoint = new THREE.Vector3();
  private boxes: THREE.Box3[];
  private bulletGeometry = new THREE.SphereGeometry(.10, 10, 6);
  private trailGeometry = new THREE.CylinderGeometry(.036, .016, 1.10, 6);
  private bulletMaterial = new THREE.MeshBasicMaterial({ color: '#fff2b6', toneMapped: false });
  private trailMaterial = new THREE.MeshBasicMaterial({ color: '#ffc85d', transparent: true, opacity: .8, depthWrite: false, toneMapped: false });

  constructor(private world: World, private people: () => Person[], private vehicles: () => THREE.Object3D[], private onImpact: (impact: ShotImpact) => void) {
    this.root.name = 'Synliga jaktkulor';
    // Lightweight physical blockers: tree trunks and solid structures. The large
    // lake movement collider is not a wall; low shots meet the ground/water instead.
    this.boxes = world.colliders.filter(c => c.type !== 'circle' || c.radius < 3).map(c => {
      const x = c.type === 'circle' ? c.radius : c.w / 2;
      const z = c.type === 'circle' ? c.radius : c.d / 2;
      const bottom = groundHeight(c.x, c.z);
      return new THREE.Box3(new THREE.Vector3(c.x - x, bottom, c.z - z), new THREE.Vector3(c.x + x, bottom + (c.type === 'circle' ? 8 : 4.7), c.z + z));
    });
    // Outside house shells are solid even across an interactive doorway.
    for (const [x, z, w, d, h] of [[-10, -6, 11.4, 8.4, 7.5], [40, 16, 14.4, 10.6, 5.7]]) {
      this.boxes.push(new THREE.Box3(new THREE.Vector3(x - w / 2, 0, z - d / 2), new THREE.Vector3(x + w / 2, h, z + d / 2)));
    }
  }

  /** Used for sight placement, and independently for every bullet's travelled
   * segment. Sight placement NEVER awards a hit, bends a shot or selects an elk. */
  trace(origin: THREE.Vector3, direction: THREE.Vector3, range: number): ShotImpact | null {
    const end = origin.clone().addScaledVector(direction, range);
    let nearest: ShotImpact | null = null;
    const consider = (distance: number | null, kind: ShotImpact['kind'], elk?: ElkEntity) => {
      if (distance === null || (nearest && distance >= nearest.distance)) return;
      nearest = { kind, elk, distance, point: origin.clone().addScaledVector(direction, distance) };
    };
    this.raycaster.set(origin, direction);
    // Reuse the ray/scratch point for hundreds of static blockers every frame.
    for (const box of this.boxes) {
      if (box.containsPoint(origin)) { consider(0, 'obstacle'); continue; }
      const hit = this.raycaster.ray.intersectBox(box, this.boxPoint);
      if (hit) { const distance = hit.distanceTo(origin); if (distance <= range + 1e-6) consider(distance, 'obstacle'); }
    }
    for (const { root } of this.people()) {
      if (!root.visible) continue;
      const p = root.position;
      // NPCs stop a shot but are never injured by the hunting rifle.
      const box = new THREE.Box3(new THREE.Vector3(p.x - .46, p.y, p.z - .46), new THREE.Vector3(p.x + .46, p.y + 3.1, p.z + .46));
      consider(segmentBoxHit(origin, end, box), 'person');
    }
    for (const car of this.vehicles()) {
      if (!car.visible) continue;
      const inverse = new THREE.Matrix4().compose(car.position, car.quaternion, car.scale).invert();
      const localStart = origin.clone().applyMatrix4(inverse), localEnd = end.clone().applyMatrix4(inverse);
      const box = new THREE.Box3(new THREE.Vector3(-1.03, .12, -2.48), new THREE.Vector3(1.03, 1.85, 2.48));
      consider(segmentBoxHit(localStart, localEnd, box), 'obstacle');
    }
    this.raycaster.set(origin, direction);
    this.raycaster.near = 0; this.raycaster.far = range;
    for (const elk of this.world.elk) {
      if (!elk.alive) continue;
      elk.model.root.updateWorldMatrix(true, true);
      const hit = this.raycaster.intersectObject(elk.model.root, true)[0];
      if (hit) consider(hit.distance, 'elk', elk);
    }
    // Sample and bisect the terrain crossing; short swept segments cannot jump
    // through a hill, and high shots can visibly miss into the distance.
    const groundAt = (t: number) => {
      const x = origin.x + direction.x * t, y = origin.y + direction.y * t, z = origin.z + direction.z * t;
      return y - Math.max(.07, groundHeight(x, z));
    };
    if (groundAt(0) <= 0) consider(0, 'ground');
    else {
      let previous = 0;
      for (let t = Math.min(.7, range); t <= range + 1e-7; t = Math.min(t + .7, range)) {
        if (groundAt(t) <= 0) {
          let low = previous, high = t;
          for (let i = 0; i < 8; i++) { const mid = (low + high) / 2; if (groundAt(mid) > 0) low = mid; else high = mid; }
          consider(high, 'ground'); break;
        }
        if (t >= range) break;
        previous = t;
      }
    }
    return nearest;
  }

  fire(origin: THREE.Vector3, direction: THREE.Vector3) {
    const object = new THREE.Group();
    object.name = `Jaktkula ${this.nextId}`;
    const bullet = new THREE.Mesh(this.bulletGeometry, this.bulletMaterial);
    bullet.scale.set(.8, .8, 1.6);
    const trail = new THREE.Mesh(this.trailGeometry, this.trailMaterial);
    trail.rotation.x = Math.PI / 2; trail.position.z = -.6;
    object.add(bullet, trail);
    object.position.copy(origin);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    this.root.add(object);
    this.projectiles.push({ id: this.nextId++, object, velocity: direction.clone().multiplyScalar(SHOT_SPEED), travelled: 0 });
  }

  update(dt: number) {
    if (dt <= 0) return;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const shot = this.projectiles[i];
      const direction = shot.velocity.clone().normalize();
      const step = Math.min(SHOT_SPEED * dt, SHOT_RANGE - shot.travelled);
      const impact = this.trace(shot.object.position, direction, step);
      if (impact) {
        shot.object.position.copy(impact.point);
        this.projectiles.splice(i, 1); shot.object.removeFromParent();
        this.onImpact(impact);
      } else {
        shot.object.position.addScaledVector(direction, step);
        shot.travelled += step;
        if (shot.travelled >= SHOT_RANGE - 1e-6) {
          this.projectiles.splice(i, 1); shot.object.removeFromParent();
          this.onImpact({ kind: 'miss', point: shot.object.position.clone(), distance: shot.travelled });
        }
      }
    }
  }

  get snapshot() {
    return this.projectiles.map(shot => ({ id: shot.id, x: shot.object.position.x, y: shot.object.position.y, z: shot.object.position.z }));
  }
  clear() { this.projectiles = []; this.root.clear(); }
  dispose() {
    this.clear(); this.root.removeFromParent();
    this.bulletGeometry.dispose(); this.trailGeometry.dispose();
    this.bulletMaterial.dispose(); this.trailMaterial.dispose();
  }
}
