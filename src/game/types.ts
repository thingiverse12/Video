export type Brother = 'nils' | 'ebbe';
export type MissionId = 'hunt' | 'rurik' | 'bailiff' | 'shop';
export const MISSION_IDS: MissionId[] = ['shop', 'hunt', 'rurik', 'bailiff'];
export type DestinationId = 'home' | 'rurik' | 'forest' | 'lake' | 'market';
export type Menu = 'missions' | 'map' | 'guide' | 'settings' | 'pause' | null;

export interface Destination {
  id: DestinationId;
  name: string;
  subtitle: string;
  description: string;
  x: number;
  z: number;
}

export const HOME = {
  center: { x: -10, z: -6 },
  groundY: 0.565,
  upperY: 3.65,
  stairsBase: { x: -14.4, z: -2.8 },
  stairsTop: { x: -14.4, z: -7.45 },
  computer: { x: -8.5, z: -9.0 },
  door: { x: -6.95, z: 0.8 },
  entry: { x: -6.95, z: -3.2 },
  rifle: { x: -13.2, z: -9.1 },
  fridge: { x: -9.02, z: -9.25 },
  coffee: { x: -2.0, z: 1.6 },
};

export const SHOP = {
  center: { x: 40, z: 16 },
  door: { x: 40, z: 23.1 },
  entry: { x: 40, z: 19.7 },
  meat: { x: 35.9, z: 14.6 },
  clerk: { x: 44.1, z: 16.8 },
};

export const DESTINATIONS: Destination[] = [
  { id: 'market', name: 'Myrboden', subtitle: 'KYLEN ÄR TOM. IDÉERNA ÄR SÄMRE.', description: 'Byns lilla matbutik med köttdisk, kundvagnar och handlaren Marta. Ett helt påhittat butiksäventyr. Gå in och försök ta ett köttpaket – men Marta kan stoppa er.', x: 40, z: 25.8 },
  { id: 'home', name: 'Hemma på gården', subtitle: 'HEM LJUVA HEM', description: 'Hemma hos bröderna. Gå upp till verandan och tryck E för att gå in. Här finns slitna soffor, en gammal tjock-tv, smutsig disk och en avskärmad tv-hörna, matplats och en kyl med örtkräm och en halv gurka. E öppnar kylen. Vid trätrappan går E upp till Ebbes rum och hans gamla dator. Hämta också jaktgeväret innan ni jagar.', x: 6, z: 10 },
  { id: 'rurik', name: 'Ruriks gård', subtitle: 'GRANNEN PÅ ANDRA SIDAN', description: 'Rurik gillar lugn och ro. Och sin verktygslåda. Försök att inte reta upp honom. Eller gör det.', x: 33, z: -15 },
  { id: 'forest', name: 'Jaktmarken', subtitle: 'LÅNGT FRÅN FOLK', description: 'Följ grusvägen in bland granarna. Här ute finns älgar, frisk luft och tveksamma beslut.', x: -25, z: -40 },
  { id: 'lake', name: 'Myrsjön', subtitle: 'EN STUNDS LUGN', description: 'En stilla skogssjö med en gammal brygga. Ett bra ställe att gömma sig från sina bekymmer.', x: 39, z: -42 },
];

export const MISSIONS = {
  shop: {
    title: 'Kött till kvällsmaten',
    kicker: 'ETT HYSS PÅ MYRBODEN',
    description: 'Tomt i kylen igen. Försök sno ett köttpaket i byns matbutik och få hem det. Blir ni tagna tar Marta tillbaka köttet.',
    short: 'Myrboden har kött. Ni har en väldigt tveksam middagsplan.',
    steps: ['Besök Myrboden', 'Försök sno ett köttpaket', 'Ta köttet hem till gården'],
    reward: 120,
    destination: 'market' as DestinationId,
  },
  hunt: {
    title: 'Ut i det fria',
    kicker: 'EN SVÄNG I SKOGEN',
    description: 'Hämta jaktgeväret inne i huset innan ni drar till skogen. Utan geväret blir det ingen jakt, oavsett hur bra Ebbes idé är.',
    short: 'Kaffet är packat. Hämta geväret i huset och ta kombin till jaktmarken.',
    steps: ['Hämta geväret i huset', 'Ta dig till jaktmarken', 'Sikta och träffa en älg'],
    reward: 150,
    destination: 'forest' as DestinationId,
  },
  rurik: {
    title: 'Bara låna lite',
    kicker: 'ETT BESÖK HOS RURIK',
    description: 'Rurik har en fin verktygslåda. Ni har en bil med gott om plats. Vad skulle kunna gå fel?',
    short: 'Hälsa på grannen och låna hans verktygslåda. Utan att fråga, förstås.',
    steps: ['Besök Ruriks gård', 'Ta verktygslådan', 'Kom undan från Rurik'],
    reward: 100,
    destination: 'rurik' as DestinationId,
  },
  bailiff: {
    title: 'Oväntat besök',
    kicker: 'INDRIVARNA KOMMER',
    description: 'Två kostymer på uppfarten. Inga goda nyheter. Visa dem vänligt men bestämt var utfarten ligger.',
    short: 'Indrivarna är på väg. Håll gården fri från oönskade besökare.',
    steps: ['Möt indrivarna', 'Jaga bort första fogden', 'Jaga bort andra fogden'],
    reward: 200,
    destination: 'home' as DestinationId,
  },
} as const;

export interface WorldLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  kind: 'name' | 'car' | 'target' | 'speech';
}

export interface GameSnapshot {
  ready: boolean;
  started: boolean;
  character: Brother;
  health: number;
  money: number;
  wanted: number;
  inCar: boolean;
  insideShop: boolean;
  insideHome: boolean;
  fridgeOpen: boolean;
  homeFloor: 0 | 1;
  onStairs: boolean;
  computerOn: boolean;
  hasRifle: boolean;
  aiming: boolean;
  aimPlaced: boolean;
  canAim: boolean;
  aim: { x: number; y: number };
  shotCooldown: number;
  shotFeedback: 'ready' | 'flying' | 'hit' | 'miss' | 'blocked' | 'person';
  shotsFired: number;
  shotsHit: number;
  projectiles: { id: number; x: number; y: number; z: number }[];
  huntTargets: { id: number; x: number; y: number; visible: boolean }[];
  carryingMeat: boolean;
  shopRisk: number;
  speed: number;
  walkSpeed: number;
  cameraYaw: number;
  cameraDistance: number;
  location: string;
  time: string;
  activeMission: MissionId;
  progress: Record<MissionId, number>;
  bailiffsActive: boolean;
  bailiffETA: number;
  context: string | null;
  position: { x: number; y: number; z: number; heading: number };
  carPosition: { x: number; z: number; heading: number };
  waypoint: DestinationId | null;
  labels: WorldLabel[];
  saved: boolean;
  sound: boolean;
  music: boolean;
}

export const INITIAL_SNAPSHOT: GameSnapshot = {
  ready: false,
  started: false,
  character: 'nils',
  health: 100,
  money: 240,
  wanted: 0,
  inCar: false,
  insideShop: false,
  insideHome: false,
  fridgeOpen: false,
  homeFloor: 0,
  onStairs: false,
  computerOn: false,
  hasRifle: false,
  aiming: false,
  aimPlaced: false,
  canAim: false,
  aim: { x: .5, y: .36 },
  shotCooldown: 0,
  shotFeedback: 'ready',
  shotsFired: 0,
  shotsHit: 0,
  projectiles: [],
  huntTargets: [],
  carryingMeat: false,
  shopRisk: 0,
  speed: 0,
  walkSpeed: 0,
  cameraYaw: 0.61,
  cameraDistance: 15.8,
  location: 'Hemma på gården',
  time: '14:32',
  activeMission: 'shop',
  progress: { hunt: 0, rurik: 0, bailiff: 0, shop: 0 },
  bailiffsActive: false,
  bailiffETA: 180,
  context: 'Hoppa in i kombin',
  position: { x: 6, y: 0, z: 9, heading: 0 },
  carPosition: { x: 2, z: 7, heading: -0.25 },
  waypoint: null,
  labels: [],
  saved: false,
  sound: false,
  music: false,
};

export interface ToastMessage {
  title: string;
  detail?: string;
  kind?: 'success' | 'info' | 'warning';
}

export interface GameCallbacks {
  onUpdate: (snapshot: GameSnapshot) => void;
  onToast: (message: ToastMessage) => void;
  onDialogue: (person: 'rurik' | 'ebbe') => void;
  onError: (message: string) => void;
}
