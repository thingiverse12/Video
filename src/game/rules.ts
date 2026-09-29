// Spelregler utan THREE och DOM: uppdragsövergångar, butiksrisk, jaktutfall och
// straff. Motorn (engine.ts) äger scenen och kopplar ihop reglerna med ljud,
// toasts och 3D-objekt; reglerna själva kan stegas igenom i Node
// (scripts/game-logic-test.mjs) utan webbläsare.
import { DESTINATIONS, MISSIONS, SHOP, type DestinationId, type GameSnapshot, type MissionId } from './types';
import { isInsideHome, isInsideShop, type Point2 } from './terrain';

// Math.sqrt i stället för Math.hypot: hypot allokerar i V8 och advanceProgress körs varje simuleringssteg.
const distance = (a: Point2, b: Point2) => { const dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); };

/** Platser som uppdragen räknar avstånd till. */
export const HUNT_AREA = { x: -25, z: -43, radius: 16 };
export const RURIK_AREA = { x: 36, z: -22, radius: 14, escapeRadius: 19, escapeFromRurik: 12 };
export const HOME_YARD = { x: 2, z: 6, radius: 14 };
export const SHOP_DISCOVERY_RADIUS = 17;
export const WAYPOINT_REACHED_RADIUS = 6;

/** Belöningar och straff i kronor. */
export const ELK_BOUNTY = 50;
export const CAUGHT_IN_SHOP_FINE = 20;
export const RESPAWN_FINE = 25;
export const DELIVERY_HEALTH_BONUS = 25;

/** Butiksrisk: hur snabbt Marta får syn på er och hur snabbt ni skakar av henne. */
export const SHOP_RISK_START = 22;
export const SHOP_RISK_RISE_PER_SECOND = 15;
export const SHOP_RISK_FALL_PER_SECOND = 20;
export const SHOP_CLERK_NOTICE_DISTANCE = 7;
export const SHOP_CLERK_FORGET_DISTANCE = 29;
export const SHOP_CLERK_CATCH_DISTANCE = 1.90;
export const SHOP_GRACE_SECONDS = 2.35;
export const SHOP_CLERK_ANGER_SECONDS = 45;

export type ProgressEvent =
  | 'shop-discovered'
  | 'meat-delivered'
  | 'hunt-arrived'
  | 'rurik-discovered'
  | 'rurik-escaped'
  | 'waypoint-reached';

/** Motorn återanvänder ett och samma objekt varje steg; det är därför fälten är muterbara. */
export interface ProgressContext {
  /** Spelarens (eller bilens) position. */
  player: Point2;
  /** Var Rurik står just nu. */
  rurik: Point2;
  toolboxTaken: boolean;
  /** Uppdrag vars belöning redan betalats ut. Muteras när ett nytt uppdrag betalas. */
  claimed: Set<MissionId>;
}

/** Sätter uppdraget som slutfört. Returnerar true om belöningen betalades ut nu. */
export function completeMission(state: GameSnapshot, id: MissionId, claimed: Set<MissionId>) {
  state.progress[id] = 3;
  if (claimed.has(id)) return false;
  state.money += MISSIONS[id].reward;
  claimed.add(id);
  return true;
}

/** Vägpunkten ett uppdrag pekar på just nu: hem först om geväret eller köttet kräver det. */
export function missionWaypoint(state: GameSnapshot, id: MissionId): DestinationId {
  return (id === 'shop' && state.carryingMeat) || (id === 'hunt' && !state.hasRifle) ? 'home' : MISSIONS[id].destination;
}

/** Vägpunkt när man kliver in i bilen; null lämnar den orörd. */
export function carEntryWaypoint(state: GameSnapshot): DestinationId | null {
  return state.activeMission === 'hunt' || state.activeMission === 'shop' ? missionWaypoint(state, state.activeMission) : null;
}

export function trackMission(state: GameSnapshot, id: MissionId) {
  state.activeMission = id;
  state.waypoint = missionWaypoint(state, id);
}

/** Geväret får bara höjas utomhus, till fots, utan matkasse och när spelet är igång. */
export function canUseRifle(state: GameSnapshot, position: Point2) {
  return state.started && state.hasRifle && !state.inCar && !state.onStairs
    && !isInsideHome(position) && !isInsideShop(position) && !state.carryingMeat;
}

export function pickUpRifle(state: GameSnapshot) {
  state.hasRifle = true;
  state.progress.hunt = Math.max(1, state.progress.hunt);
  state.activeMission = 'hunt';
  state.waypoint = 'forest';
}

export function takeMeat(state: GameSnapshot) {
  state.carryingMeat = true;
  state.progress.shop = 2;
  state.activeMission = 'shop';
  state.waypoint = 'home';
  state.shopRisk = SHOP_RISK_START;
  state.wanted = Math.max(2, state.wanted);
}

export function takeToolbox(state: GameSnapshot) {
  state.progress.rurik = Math.max(state.progress.rurik, 2);
  state.wanted = Math.max(2, state.wanted);
}

/** Marta ser er när hon är arg och vaken, och ni är inne eller nära henne. */
export function clerkNotices(angry: number, stunned: number, inside: boolean, clerkDistance: number) {
  return stunned <= 0 && angry > 0 && (inside || clerkDistance < SHOP_CLERK_NOTICE_DISTANCE);
}

/**
 * Ett tidssteg för butiksrisken. Utan kött sjunker risken bara. Returnerar
 * 'caught' när risken slår i taket inne i butiken efter nådetiden.
 */
export function shopRiskStep(state: GameSnapshot, dt: number, noticed: boolean, inside: boolean, graceOver: boolean): 'caught' | null {
  if (!state.carryingMeat) {
    state.shopRisk = Math.max(0, state.shopRisk - dt * SHOP_RISK_FALL_PER_SECOND);
    return null;
  }
  const change = dt * (noticed ? SHOP_RISK_RISE_PER_SECOND : -SHOP_RISK_FALL_PER_SECOND);
  state.shopRisk = Math.min(100, Math.max(0, state.shopRisk + change));
  return state.shopRisk >= 100 && inside && graceOver ? 'caught' : null;
}

/** Marta tar tillbaka köttet: litet bötesbelopp, uppdraget backar ett steg. */
export function caughtInShop(state: GameSnapshot) {
  if (!state.carryingMeat) return false;
  state.carryingMeat = false;
  state.shopRisk = 0;
  state.progress.shop = 1;
  state.money = Math.max(0, state.money - CAUGHT_IN_SHOP_FINE);
  state.wanted = Math.max(0, state.wanted - 1);
  state.waypoint = 'market';
  return true;
}

/** Slagen medvetslös: tillbaka på gården, köttet borta, lite fattigare. */
export function respawnPenalty(state: GameSnapshot) {
  state.health = 100;
  state.money = Math.max(0, state.money - RESPAWN_FINE);
  if (state.carryingMeat) { state.carryingMeat = false; state.progress.shop = 1; }
  state.shopRisk = 0;
  state.inCar = false;
  state.wanted = 0;
  state.onStairs = false;
  state.onLadder = false;
  state.homeFloor = 0;
}

export type ShotKind = 'elk' | 'obstacle' | 'person' | 'ground' | 'miss';

/** Utfallet av ett skott. En träff på en levande älg betalar skottpengar och slutför jakten. */
export function applyShotImpact(state: GameSnapshot, kind: ShotKind, elkAlive: boolean, claimed: Set<MissionId>) {
  if (kind === 'elk' && elkAlive) {
    state.shotsHit++;
    state.shotFeedback = 'hit';
    state.money += ELK_BOUNTY;
    state.wanted = Math.max(1, state.wanted);
    const rewarded = completeMission(state, 'hunt', claimed);
    return { hit: true, rewarded };
  }
  state.shotFeedback = kind === 'obstacle' ? 'blocked' : kind === 'person' ? 'person' : 'miss';
  return { hit: false, rewarded: false };
}

/** En mätare har jagats bort. Returnerar true när båda är borta och uppdraget klart. */
export function bailiffChasedOff(state: GameSnapshot, fledCount: number, claimed: Set<MissionId>) {
  state.progress.bailiff = Math.min(3, 1 + fledCount);
  if (fledCount < 2) return false;
  state.bailiffsActive = false;
  completeMission(state, 'bailiff', claimed);
  return true;
}

// Skattemasarnas besök — spelets fiktiva skatteparodi (i samma anda som
// Mätarlaget): ett kort klipp där byråkraternas bil rullar in på gården strax
// efter att ni startat, inspektörerna kliver ur och stämmer av era inkomster,
// och sedan åker de vidare. Bara tid styr besöket; inga pengar byter händ.

/** Spelet har gått i 13 sekunder när bilen rullar in. */
export const SKATTE_ARRIVAL_SECONDS = 13;
/** Längden på det korta klippet: bilen kör fram, inspektörerna kliver ur. */
export const SKATTE_CUTSCENE_SECONDS = 5.4;
/** Hur länge inspektörerna stannar kvar på gården och småpratar. */
export const SKATTE_STAY_SECONDS = 15;
/** Tiden från att de går tillbaka tills bilen kört iväg. */
export const SKATTE_LEAVE_SECONDS = 6;

export type SkattePhase = 'waiting' | 'cutscene' | 'visit' | 'leave' | 'done';
export type SkatteEvent = 'cutscene-start' | 'arrived' | 'leave' | 'done';
export interface SkatteVisit {
  phase: SkattePhase;
  /** Tid i den nuvarande fasen, i sekunder. */
  timer: number;
}

export function createSkatteVisit(): SkatteVisit {
  return { phase: 'waiting', timer: 0 };
}

/**
 * Ett tidssteg för besöket. Returnerar händelsen som just skedde (eller null)
 * så att motorn kan koppla in ljud, toast, repliker och kameran i rätt ögonblick.
 */
export function skatteVisitStep(visit: SkatteVisit, activeTime: number, dt: number): SkatteEvent | null {
  if (visit.phase === 'done') return null;
  if (visit.phase === 'waiting') {
    if (activeTime < SKATTE_ARRIVAL_SECONDS) return null;
    visit.phase = 'cutscene'; visit.timer = 0;
    return 'cutscene-start';
  }
  visit.timer += dt;
  if (visit.phase === 'cutscene' && visit.timer >= SKATTE_CUTSCENE_SECONDS) {
    visit.phase = 'visit'; visit.timer = 0;
    return 'arrived';
  }
  if (visit.phase === 'visit' && visit.timer >= SKATTE_STAY_SECONDS) {
    visit.phase = 'leave'; visit.timer = 0;
    return 'leave';
  }
  if (visit.phase === 'leave' && visit.timer >= SKATTE_LEAVE_SECONDS) {
    visit.phase = 'done'; visit.timer = 0;
    return 'done';
  }
  return null;
}

/** Besöket avbryts när inspektörerna sprungit iväg. Redan avslutat lämnas orört. */
export function skatteVisitAborted(visit: SkatteVisit) {
  if (visit.phase === 'done') return false;
  visit.phase = 'done'; visit.timer = 0;
  return true;
}

/**
 * Uppdragsövergångar som beror på var spelaren är. Muterar tillståndet och
 * returnerar vilka övergångar som skedde, så att motorn kan visa rätt toast.
 */
const NO_EVENTS: readonly ProgressEvent[] = Object.freeze([]);
const DESTINATION_BY_ID = Object.fromEntries(DESTINATIONS.map(d => [d.id, d])) as Record<DestinationId, (typeof DESTINATIONS)[number]>;
// tillåten allokering: händelselistan skapas bara det steg något faktiskt händer.
const record = (events: ProgressEvent[] | null, event: ProgressEvent) => { (events ??= []).push(event); return events; };

export function advanceProgress(state: GameSnapshot, ctx: ProgressContext): readonly ProgressEvent[] {
  // Anropas varje simuleringssteg; se record() – inga nya objekt de steg inget händer.
  let events: ProgressEvent[] | null = null;
  const p = ctx.player;
  if (distance(p, SHOP.center) < SHOP_DISCOVERY_RADIUS && state.progress.shop === 0) {
    state.progress.shop = 1;
    events = record(events, 'shop-discovered');
  }
  if (state.carryingMeat && distance(p, HOME_YARD) < HOME_YARD.radius) {
    state.carryingMeat = false;
    state.shopRisk = 0;
    state.wanted = Math.max(0, state.wanted - 2);
    state.health = Math.min(100, state.health + DELIVERY_HEALTH_BONUS);
    completeMission(state, 'shop', ctx.claimed);
    events = record(events, 'meat-delivered');
  }
  if (state.hasRifle && distance(p, HUNT_AREA) < HUNT_AREA.radius && state.progress.hunt === 1) {
    state.progress.hunt = 2;
    events = record(events, 'hunt-arrived');
  }
  if (distance(p, RURIK_AREA) < RURIK_AREA.radius && state.progress.rurik === 0) {
    state.progress.rurik = 1;
    events = record(events, 'rurik-discovered');
  }
  if (ctx.toolboxTaken && state.progress.rurik === 2 && distance(p, RURIK_AREA) > RURIK_AREA.escapeRadius && distance(p, ctx.rurik) > RURIK_AREA.escapeFromRurik) {
    completeMission(state, 'rurik', ctx.claimed);
    state.wanted = Math.max(0, state.wanted - 1);
    events = record(events, 'rurik-escaped');
  }
  if (state.waypoint) {
    const dest = DESTINATION_BY_ID[state.waypoint];
    if (distance(p, dest) < WAYPOINT_REACHED_RADIUS) {
      state.waypoint = null;
      events = record(events, 'waypoint-reached');
    }
  }
  return events ?? NO_EVENTS;
}
