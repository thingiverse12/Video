import * as THREE from 'three';
import { box, cylinder } from './primitives';

// Stugan är timrad invändigt: liggande furustockar med utstickande knutändar,
// varannan rad förskjuten som i en riktig knuttimring. Färgerna växlar varv för
// varv så att väggen inte ser ut som ett enda rör. Allt slås ihop av
// mergeStaticMeshes efteråt, så antalet stockar spelar ingen roll för prestandan.
const LOG_TONES = ['#c39b63', '#b28a55', '#cca66e', '#ab8350'];
export const LOG_RADIUS = 0.125;
/** Avståndet mellan två stockrader: något mindre än diametern så att stockarna vilar i varandra. */
export const LOG_PITCH = LOG_RADIUS * 1.9;
const PLANK_TONES = ['#c9a674', '#bd9a68', '#d1ad79'];

export interface LogWallOptions {
  /** Hur långt stockändarna sticker ut förbi väggens början respektive slut (knutarna). */
  startOverhang?: number;
  endOverhang?: number;
  /** Förskjut raderna ett halvt varv, för väggar som möter en oförskjuten vägg i en knut. */
  stagger?: boolean;
  /** Startpunkt i färgcykeln så att två väggar inte får exakt samma rand. */
  tone?: number;
  /** Kortar varje rad med så här mycket per sida per varv (gavelspets under ett tak). */
  taperPerRow?: number;
}

/**
 * En timrad vägg mellan två axelparallella punkter (x, z) i förälderns koordinater.
 * Returnerar överkanten på översta stocken.
 */
export function logWall(parent: THREE.Object3D, from: [number, number], to: [number, number], baseY: number, rows: number, options: LogWallOptions = {}) {
  const { startOverhang = 0.24, endOverhang = 0.24, stagger = false, tone = 0, taperPerRow = 0 } = options;
  const alongX = Math.abs(to[0] - from[0]) >= Math.abs(to[1] - from[1]);
  const a = alongX ? Math.min(from[0], to[0]) : Math.min(from[1], to[1]);
  const b = alongX ? Math.max(from[0], to[0]) : Math.max(from[1], to[1]);
  const across = alongX ? from[1] : from[0];
  let top = baseY;
  for (let i = 0; i < rows; i++) {
    const taper = i * taperPerRow;
    const start = a - startOverhang + taper, end = b + endOverhang - taper;
    if (end - start < LOG_RADIUS) break;
    const y = baseY + LOG_RADIUS + i * LOG_PITCH + (stagger ? LOG_PITCH / 2 : 0);
    const centre = (start + end) / 2;
    const log = cylinder(parent, LOG_RADIUS, LOG_RADIUS, end - start, LOG_TONES[(i + tone) % LOG_TONES.length],
      alongX ? centre : across, y, alongX ? across : centre, 10);
    if (alongX) log.rotation.z = Math.PI / 2; else log.rotation.x = Math.PI / 2;
    // Bearbetade ändytor: en ljusare skiva ytterst så att knutarna läses som kapade stockar.
    for (const end2 of [start, end]) {
      const cap = cylinder(parent, LOG_RADIUS * 0.82, LOG_RADIUS * 0.82, 0.012, '#dcbf8e',
        alongX ? end2 : across, y, alongX ? across : end2, 10);
      if (alongX) cap.rotation.z = Math.PI / 2; else cap.rotation.x = Math.PI / 2;
    }
    top = y + LOG_RADIUS;
  }
  return top;
}

/** Innervägg av stående furubrädor (pärlspont) med en profilerad överliggare. */
export function plankWall(parent: THREE.Object3D, from: [number, number], to: [number, number], baseY: number, height: number, thickness = 0.12) {
  const alongX = Math.abs(to[0] - from[0]) >= Math.abs(to[1] - from[1]);
  const a = alongX ? Math.min(from[0], to[0]) : Math.min(from[1], to[1]);
  const b = alongX ? Math.max(from[0], to[0]) : Math.max(from[1], to[1]);
  const across = alongX ? from[1] : from[0];
  const width = 0.17;
  let i = 0;
  for (let s = a; s < b - 0.01; s += width, i++) {
    const w = Math.min(width, b - s) - 0.012;
    const centre = s + Math.min(width, b - s) / 2;
    box(parent, alongX ? w : thickness, height, alongX ? thickness : w, PLANK_TONES[i % PLANK_TONES.length], alongX ? centre : across, baseY + height / 2, alongX ? across : centre);
  }
  const length = b - a;
  box(parent, alongX ? length + 0.05 : thickness + 0.05, 0.06, alongX ? thickness + 0.05 : length + 0.05, '#9a7a50', alongX ? (a + b) / 2 : across, baseY + height + 0.03, alongX ? across : (a + b) / 2);
  box(parent, alongX ? length + 0.02 : thickness + 0.03, 0.09, alongX ? thickness + 0.03 : length + 0.02, '#8a6a45', alongX ? (a + b) / 2 : across, baseY + 0.045, alongX ? across : (a + b) / 2);
}

/** Dörr- eller fönsterfoder: två stolpar och en överliggare av grövre virke. */
export function timberFrame(parent: THREE.Object3D, x: number, z: number, alongX: boolean, opening: number, height: number, baseY: number, color = '#8d6b45') {
  for (const side of [-1, 1]) {
    const offset = side * (opening / 2 + 0.06);
    box(parent, alongX ? 0.12 : 0.20, height, alongX ? 0.20 : 0.12, color, alongX ? x + offset : x, baseY + height / 2, alongX ? z : z + offset);
  }
  box(parent, alongX ? opening + 0.24 : 0.20, 0.12, alongX ? 0.20 : opening + 0.24, color, x, baseY + height + 0.06, z);
}
