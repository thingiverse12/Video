// Ren terräng- och zonlogik: inga THREE-objekt, ingen DOM. Används av motorn,
// världsbygget och de webbläsarfria testerna (scripts/game-logic-test.mjs).
import { HOME, SHOP, type HomeFloor } from './types';

export interface Point2 { x: number; z: number }

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Myrsjöns spegel: mittpunkt, halvaxlar, vattenytans höjd och sänkans djup. */
export const LAKE = { x: 55, z: -52, rx: 19.2, rz: 14.8, surfaceY: -0.06, depth: 1.1 };

/** Normerat avstånd från sjöns mitt: 1.0 precis vid vattenspegelns kant. */
export function lakeRadius(x: number, z: number) {
  // Math.sqrt i stället för Math.hypot: hypot allokerar i V8 och det här anropas ofta.
  const dx = (x - LAKE.x) / LAKE.rx, dz = (z - LAKE.z) / LAKE.rz;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Markhöjden i världen: platt by, mjuka kullar längst ut och en sänka under Myrsjön.
 * Kullarna tonas ut mot stranden och bottnen sluttar ner under vattenytan, så att
 * strandlinjen hamnar där marken bryter igenom vattnet (ungefär vid lakeRadius 0.96).
 */
export function groundHeight(x: number, z: number) {
  const distance = Math.sqrt(x * x + z * z);
  const factor = Math.max(0, Math.min(1, (distance - 66) / 35));
  const hills = factor * (Math.sin(x * 0.04) * 3.4 + Math.cos(z * 0.057) * 2.4 + 3);
  const r = lakeRadius(x, z);
  if (r >= 1.45) return hills;
  return hills * smoothstep(1.0, 1.45, r) - LAKE.depth * (1 - smoothstep(0.55, 1.03, r));
}

/** Grusvägarnas kontrollpunkter [x, z]. Väg 0 och 2 slutar på stranden vid Myrsjön, aldrig i vattnet. */
export const ROAD_POINTS = [
  [[17, 52], [15, 30], [7, 12], [7, 2], [13, -8], [26, -15], [35, -17], [53, -22], [68, -37]],
  [[7, 3], [3, -12], [-6, -23], [-18, -31], [-26, -42], [-27, -54], [-38, -68]],
  [[30, -16], [33, -26], [37, -35], [38, -44]],
  [[14, 27], [23, 27], [32, 29], [40, 28]],
];

export function isInsideHome(position: Point2) {
  return Math.abs(position.x - HOME.center.x) < 5.51 && position.z > -10.01 && position.z < -1.92;
}

export function isInsideShop(position: Point2) {
  return Math.abs(position.x - SHOP.center.x) < 7.03 && position.z > SHOP.center.z - 5.2 && position.z < SHOP.center.z + 5.35;
}

/** Golv- eller markhöjd där figurer får stå. Våning 1 och loftet finns bara inne i stugan. */
export function walkableHeight(x: number, z: number, floor: HomeFloor = 0) {
  if (Math.abs(x - HOME.center.x) < 5.5 && Math.abs(z - HOME.center.z) < 4.05) return floor === 2 ? HOME.loftY : floor === 1 ? HOME.upperY : HOME.groundY;
  if (x > -8.9 && x < -5.05 && z >= -1.95 && z < 0.47) return 0.70;
  if (Math.abs(x - SHOP.center.x) < 7.03 && z > SHOP.center.z - 5.2 && z < SHOP.center.z + 5.35) return 0.155;
  if (Math.abs(x - SHOP.center.x) < 11.5 && z >= SHOP.center.z + 5.35 && z < SHOP.center.z + 16.9) return 0.09;
  return groundHeight(x, z);
}

export function nearFridge(position: Point2, floor: HomeFloor) {
  // Framsidan av kylen, aldrig genom ytterväggen eller bänken.
  return floor === 0 && isInsideHome(position) && position.z > HOME.fridge.z + 0.55
    && Math.hypot(position.x - HOME.fridge.x, position.z - HOME.fridge.z - 0.65) < 2.05;
}

export function nearStairs(position: Point2, floor: HomeFloor) {
  if (floor === 2) return false;
  const target = floor === 1 ? HOME.stairsTop : HOME.stairsBase;
  return isInsideHome(position) && Math.hypot(position.x - target.x, position.z - target.z) < 1.32;
}

/** Loftstegen: foten står i Bills rum, toppen vid luckan i loftets räcke. */
export function nearLadder(position: Point2, floor: HomeFloor) {
  if (floor === 0) return false;
  const target = floor === 2 ? HOME.ladderTop : HOME.ladderBase;
  return isInsideHome(position) && Math.hypot(position.x - target.x, position.z - target.z) < 1.25;
}

/** Framför bakmaskinens bord på loftet, aldrig genom gaveln. */
export function nearBreadMachine(position: Point2, floor: HomeFloor) {
  return floor === 2 && isInsideHome(position)
    && Math.hypot(position.x - (HOME.breadMachine.x - 0.75), position.z - (HOME.breadMachine.z + 0.45)) < 1.75;
}

export function nearComputer(position: Point2, floor: HomeFloor) {
  return floor === 1 && isInsideHome(position) && position.z > HOME.computer.z + 0.65
    && Math.hypot(position.x - HOME.computer.x, position.z - HOME.computer.z - 0.75) < 1.85;
}

export function nearRifleRack(position: Point2) {
  return isInsideHome(position) && Math.hypot(position.x - HOME.rifle.x, position.z - HOME.rifle.z) < 2.4;
}
