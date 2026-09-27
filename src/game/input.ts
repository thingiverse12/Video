// Keyboard and each held touch have separate owners. Releasing one finger must
// not release another finger (or a physical key) that holds the same action.
export class GameInput {
  private keyboard = new Set<string>();
  private pointers = new Map<number, ReadonlySet<string>>();

  add(code: string) { this.keyboard.add(code); }
  delete(code: string) { this.keyboard.delete(code); }
  has(code: string) {
    if (this.keyboard.has(code)) return true;
    for (const keys of this.pointers.values()) if (keys.has(code)) return true;
    return false;
  }
  setPointer(id: number, codes: readonly string[]) {
    if (codes.length) this.pointers.set(id, new Set(codes));
    else this.pointers.delete(id);
  }
  releasePointer(id: number) { this.pointers.delete(id); }
  clearPointers() { this.pointers.clear(); }
  clear() { this.keyboard.clear(); this.clearPointers(); }
}

export function padDirection(x: number, y: number, size: number) {
  // x/y are relative to the centre. A small dead zone prevents fingertip jitter.
  if (Math.hypot(x, y) < size * .14) return { x: 0, y: 0 };
  const direction = {
    x: Math.abs(x) > Math.abs(y) * .45 ? Math.sign(x) : 0,
    y: Math.abs(y) > Math.abs(x) * .45 ? -Math.sign(y) : 0,
  };
  return direction;
}

export function directionKeys(direction: { x: number; y: number }) {
  const codes: string[] = [];
  if (direction.x) codes.push(direction.x > 0 ? 'KeyD' : 'KeyA');
  if (direction.y) codes.push(direction.y > 0 ? 'KeyW' : 'KeyS');
  return codes;
}
