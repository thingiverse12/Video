// Sparfilen: vad som skrivs till webbläsarens lagring och hur gamla eller
// trasiga sparningar tolkas. Ingen DOM här – motorn skickar in strängen.
import { MISSION_IDS, type GameSnapshot, type MissionId, type PlayerId } from './types';

export const SAVE_KEY = 'gramyren-adventure-v1';
export const SAVE_VERSION = 3;
const ACCEPTED_VERSIONS = [1, 2, 3];
const MAX_MONEY = 1_000_000;

export interface SaveData {
  version: number;
  hasRifle: boolean;
  carryingMeat: boolean;
  money: number;
  progress: Record<MissionId, number>;
  character: PlayerId;
  activeMission: MissionId;
  toolboxTaken: boolean;
}

export interface RestoredSave {
  toolboxTaken: boolean;
  /** Uppdrag vars belöning redan är utbetald och inte ska betalas igen. */
  claimed: MissionId[];
}

export function serializeSave(state: GameSnapshot, toolboxTaken: boolean): SaveData {
  return {
    version: SAVE_VERSION,
    hasRifle: state.hasRifle,
    carryingMeat: state.carryingMeat,
    money: state.money,
    progress: { ...state.progress },
    character: state.character,
    activeMission: state.activeMission,
    toolboxTaken,
  };
}

/**
 * Läser in en sparning i tillståndet. Returnerar null om inget giltigt fanns,
 * och då lämnas tillståndet orört. Ogiltiga fält hoppas över var för sig.
 */
export function restoreSave(raw: string | null | undefined, state: GameSnapshot): RestoredSave | null {
  let data: Partial<SaveData> & { version?: unknown } | null;
  try { data = raw ? JSON.parse(raw) : null; } catch { return null; }
  if (!data || typeof data !== 'object' || !ACCEPTED_VERSIONS.includes(data.version as number)) return null;
  const version = data.version as number;

  if (typeof data.money === 'number' && Number.isFinite(data.money) && data.money >= 0 && data.money <= MAX_MONEY) state.money = Math.floor(data.money);
  if (data.character === 'leffe' || data.character === 'bill') state.character = data.character;
  const claimed: MissionId[] = [];
  for (const id of MISSION_IDS) {
    const value = data.progress?.[id];
    if (Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 3) state.progress[id] = value as number;
    if (state.progress[id] === 3) claimed.push(id);
  }
  state.hasRifle = version >= 3 && data.hasRifle === true;
  // Gamla, oavslutade jakter började med bilen i stället för geväret. Utbetalda
  // belöningar behålls, men alla obeväpnade jägare måste hämta geväret på nytt.
  if (state.progress.hunt < 3) state.progress.hunt = state.hasRifle ? Math.max(1, state.progress.hunt) : 0;
  // Ett oavslutat besök startar om rent i stället för att spara frånvarande figurer.
  if (state.progress.bailiff < 3) state.progress.bailiff = 0;
  if (MISSION_IDS.includes(data.activeMission as MissionId)) state.activeMission = data.activeMission as MissionId;
  if (version === 1) state.activeMission = 'shop';
  state.carryingMeat = data.carryingMeat === true && state.progress.shop === 2;
  if (state.progress.shop === 2 && !state.carryingMeat) state.progress.shop = 1;
  state.saved = true;
  return { toolboxTaken: data.toolboxTaken === true, claimed };
}
