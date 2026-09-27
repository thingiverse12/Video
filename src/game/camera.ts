import type { Vector3 } from 'three';

// The look-at point is already smoothed by the engine. Follow that same anchor
// exactly; smoothing world-space camera position again adds a second lag and
// makes the view pitch/rock when walking starts or stops. Only zoom/orbit offsets
// need their own transition.
export function positionFollowCamera(
  position: Vector3,
  target: Vector3,
  offset: Vector3,
  desiredOffset: Vector3,
  dt: number,
) {
  offset.lerp(desiredOffset, 1 - Math.exp(-Math.max(0, dt) * 4.2));
  position.copy(target).add(offset);
}
