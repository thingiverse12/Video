// Kollisionstabell utan THREE och DOM. Kolliderarna packas i typade fält så att
// bildruteloopen slipper hoppa mellan små objekt och V8 slipper boxa talen; det
// är både snabbare och fritt från skräp (scripts/perf-smoke-test.mjs mäter det).

export type Collider =
  | { type: 'circle'; x: number; z: number; radius: number }
  | { type: 'box'; x: number; z: number; w: number; d: number };

export interface ColliderTable {
  count: number;
  /** 0 = cirkel, 1 = låda. */
  kind: Uint8Array;
  x: Float64Array;
  z: Float64Array;
  /** Cirkel: radie. Låda: halva bredden. */
  a: Float64Array;
  /** Låda: halva djupet. */
  b: Float64Array;
}

export function buildColliderTable(colliders: readonly Collider[]): ColliderTable {
  const count = colliders.length;
  const table: ColliderTable = { count, kind: new Uint8Array(count), x: new Float64Array(count), z: new Float64Array(count), a: new Float64Array(count), b: new Float64Array(count) };
  colliders.forEach((collider, i) => {
    table.x[i] = collider.x;
    table.z[i] = collider.z;
    if (collider.type === 'circle') { table.kind[i] = 0; table.a[i] = collider.radius; }
    else { table.kind[i] = 1; table.a[i] = collider.w * 0.5; table.b[i] = collider.d * 0.5; }
  });
  return table;
}

/** Sant om en cirkel med mittpunkt (px, pz) och given radie överlappar någon kolliderare. */
export function collidesAt(table: ColliderTable, px: number, pz: number, radius: number) {
  const { count, kind, x, z, a, b } = table;
  for (let i = 0; i < count; i++) {
    const dx = px - x[i], dz = pz - z[i];
    if (kind[i] === 0) {
      const reach = radius + a[i];
      if (dx * dx + dz * dz < reach * reach) return true;
    } else if (Math.abs(dx) < a[i] + radius && Math.abs(dz) < b[i] + radius) return true;
  }
  return false;
}
