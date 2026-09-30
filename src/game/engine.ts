import * as THREE from 'three';
import { animateCharacter, createCar, createCharacter, createShoppingBag, material, mesh, type CharacterModel, type CharacterKind, type CarModel } from './models';
import { createWorld, type World } from './world';
import { buildColliderTable, collidesAt, type ColliderTable } from './colliders';
import { groundHeight, isInsideHome, isInsideShop, nearBreadMachine, nearComputer, nearFridge, nearLadder, nearRifleRack, nearStairs, walkableHeight } from './terrain';
import { advanceProgress, applyShotImpact, bailiffChasedOff, canUseRifle, carEntryWaypoint, caughtInShop, clerkNotices, createSkatteVisit, pickUpRifle, respawnPenalty, shopRiskStep, skatteVisitAborted, skatteVisitStep, takeMeat, takeToolbox, trackMission, SHOP_CLERK_ANGER_SECONDS, SHOP_CLERK_CATCH_DISTANCE, SHOP_CLERK_FORGET_DISTANCE, SHOP_GRACE_SECONDS, SKATTE_CUTSCENE_SECONDS, type ProgressContext, type SkatteVisit } from './rules';
import { restoreSave, serializeSave, SAVE_KEY } from './save';
import { GameAudio } from './audio';
import { outdoorReflections, skyDome } from './look';
import { GameInput } from './input';
import { positionFollowCamera } from './camera';
import { createHuntingRifle } from './equipment';
import { HuntingProjectiles, RIFLE_MUZZLE, SHOT_INTERVAL, type ShotImpact } from './hunting';
import { DESTINATIONS, INITIAL_SNAPSHOT, MISSIONS, SHOP, HOME, type PlayerId, type DestinationId, type GameCallbacks, type GameSnapshot, type HomeFloor, type MissionId, type WorldLabel } from './types';

interface Actor {
  id: string;
  model: CharacterModel;
  health: number;
  home: THREE.Vector3;
  angry: number;
  stunned: number;
  flee: boolean;
  cooldown: number;
  punch: number;
  speed: number;
  /** Tillfälligt mål som går före det vanliga AI-målet, t.ex. Skattemasarna på väg till bilen. */
  goalOverride: THREE.Vector3 | null;
}
interface Particle { object: THREE.Mesh; velocity: THREE.Vector3; life: number; total: number; }
interface Speech { id: string; text: string; position: THREE.Vector3; actor?: Actor; until: number; }
/** Största simuleringssteg i sekunder; längre bildrutor delas upp. */
export const SIMULATION_STEP = 0.05;
/** Mest speltid som simuleras per bildruta; därutöver går spelet långsammare.
 *  Tre steg räcker för att en tappad bildruta ska hämtas in, men håller stegen
 *  korta nog (under en meter) för att styrningen ska kännas exakt även när
 *  maskinen bara orkar några bildrutor per sekund. */
export const MAX_FRAME_TIME = 0.15;
const up = new THREE.Vector3(0, 1, 0);
// Återanvända vektorer för bildruteloopen. Simuleringen ska inte skapa nya objekt
// per bildruta (scripts/perf-smoke-test.mjs mäter det); varje användning är kort
// och synkron, så en handfull räcker. Blanda aldrig två som lever samtidigt.
const scratchMove = new THREE.Vector3(), scratchLocal = new THREE.Vector3(), scratchCandidate = new THREE.Vector3();
const scratchBefore = new THREE.Vector3(), scratchGoal = new THREE.Vector3(), scratchStep = new THREE.Vector3();
const scratchTarget = new THREE.Vector3(), scratchOffset = new THREE.Vector3(), scratchFocus = new THREE.Vector3();
const scratchLabel = new THREE.Vector3(), scratchProject = new THREE.Vector3(), scratchBurst = new THREE.Vector3();
const INTRO_TARGET = new THREE.Vector3(-1.8, 1.2, .6);
const FLEE_GOAL = new THREE.Vector3(20, 0, 62);
/** Klippets kameravinkel: kameran ligger på den röjda grusvägen, klar sikt hela vägen. */
const SKATTE_CAMERA_YAW = -0.1;
/** Skattemasarnas bil: en egen grå bil som följer grusvägen in på gården. */
const SKATTE_PATH = [
  new THREE.Vector3(17.2, 0, 43), new THREE.Vector3(15.3, 0, 31), new THREE.Vector3(11.6, 0, 21.5),
  new THREE.Vector3(9.5, 0, 13.5), new THREE.Vector3(10.6, 0, 9.2),
];
const SKATTE_CAR_DOOR = new THREE.Vector3(11.4, 0, 8.6);
const scratchSkatteNext = new THREE.Vector3(), scratchSkatteBefore = new THREE.Vector3();
/** Catmull-Rom-punkt längs infarten för parametern u (0..1); skriver till `out`. */
function sampleSkattePath(u: number, out: THREE.Vector3) {
  const segments = SKATTE_PATH.length - 1;
  const scaled = Math.min(1, Math.max(0, u)) * segments;
  const i = Math.min(segments - 1, Math.floor(scaled));
  const t = scaled - i;
  const p0 = SKATTE_PATH[i === 0 ? 0 : i - 1], p1 = SKATTE_PATH[i], p2 = SKATTE_PATH[i + 1], p3 = SKATTE_PATH[Math.min(segments, i + 2)];
  const t2 = t * t, t3 = t2 * t;
  out.set(
    0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0,
    0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3));
  return out;
}
const COMPANION_WAIT_HOME = new THREE.Vector3(HOME.door.x + 2.6, 0, HOME.door.z + 1.3);
const COMPANION_WAIT_SHOP = new THREE.Vector3(SHOP.door.x + 2.7, 0, SHOP.door.z + 1.1);
const STAIRS_BASE = new THREE.Vector3(HOME.stairsBase.x, HOME.groundY, HOME.stairsBase.z);
const STAIRS_TOP = new THREE.Vector3(HOME.stairsTop.x, HOME.upperY, HOME.stairsTop.z);
const LADDER_BASE = new THREE.Vector3(HOME.ladderBase.x, HOME.upperY, HOME.ladderBase.z);
const LADDER_TOP = new THREE.Vector3(HOME.ladderTop.x, HOME.loftY, HOME.ladderTop.z);
const LOFT_CENTRE_X = (HOME.loft.minX + HOME.loft.maxX) / 2, LOFT_HALF_WIDTH = (HOME.loft.maxX - HOME.loft.minX) / 2;
/** Punkten `dy` meter ovanför `position`, i en delad vektor. Använd resultatet direkt. */
const above = (position: THREE.Vector3, dy: number, into = scratchLabel) => { into.copy(position); into.y += dy; return into; };
// Math.sqrt i stället för Math.hypot: hypot allokerar i V8 och det här anropas varje simuleringssteg.
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => { const dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); };
const angleLerp = (a: number, b: number, factor: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * factor;

export class GameEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: World;
  private car: CarModel;
  private officialCar: CarModel;
  private avatars: Record<PlayerId, Actor>;
  private rurik: Actor;
  private shopkeeper: Actor;
  private bags: Record<PlayerId, THREE.Group>;
  private rifles: Record<PlayerId, THREE.Group>;
  private huntingTimer = 0;
  private hunting: HuntingProjectiles;
  private aimNDC = new THREE.Vector2(0, .28);
  private aimPoint = new THREE.Vector3();
  private aimRay = new THREE.Raycaster();
  private shotFeedbackTime = 0;
  private stairTravel: { direction: 'up' | 'down'; kind: 'stairs' | 'ladder'; elapsed: number; start: THREE.Vector3 } | null = null;
  private homeCamera: { elevation: number; distance: number } | null = null;
  private shopGraceUntil = 0;
  private shopCamera: { elevation: number; distance: number } | null = null;
  private bailiffs: Actor[] = [];
  /** Figurer bilen kan köra på; byggs en gång så att bildruteloopen slipper skapa listor. */
  private runOverCandidates: Actor[] = [];
  /** Kolliderare i typade fält, en tabell per våning. */
  private groundColliders: ColliderTable;
  private upstairsColliders: ColliderTable;
  private loftColliders: ColliderTable;
  /** Återanvänds varje steg av updateProgress i stället för ett nytt objekt per bildruta. */
  private progressContext: ProgressContext;
  private ring: THREE.Mesh;
  private input = new GameInput();
  private callbacks: GameCallbacks;
  private element: HTMLElement;
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private disposed = false;
  private previousTime = 0;
  private elapsed = 0;
  private activeTime = 0;
  private lastEmit = 0;
  private lastSave = 0;
  private lastBird = 0;
  private lastDamage = -20;
  private lastStep = 0;
  private particles: Particle[] = [];
  private speech: Speech[] = [];
  private cameraYaw = 0.61;
  private cameraElevation = 0.57;
  private cameraDistance = 15.8;
  /** Nedtonade rörelser (prefers-reduced-motion): färre partiklar, ingen kränging, stramare kamera. */
  private reducedMotion = false;
  private cameraTarget = new THREE.Vector3(-3, 1.6, -3);
  private cameraOffset = new THREE.Vector3();
  private dragging = false;
  private cameraPointer: number | null = null;
  private lastPointer = { x: 0, y: 0 };
  private carVelocity = 0;
  private carSteering = 0;
  private punchTimer = 0;
  private bailiffArrival = -1;
  private bailiffFled = 0;
  /** Skattemasarnas besök: bil, inspektörer och fas i det korta klippet. */
  private skatteCar: CarModel;
  private skatte: Actor[] = [];
  private skatteVisit: SkatteVisit = createSkatteVisit();
  private skatteFocus = new THREE.Vector3();
  private cutsceneFocus: THREE.Vector3 | null = null;
  private cutsceneSnap = false;
  /** Var på infarten bilen står just nu (0 = vägen, 1 = gården). */
  private skattePathU = 0;
  /** Bilens väg ut igen längs infarten; -1 när den inte lämnar. */
  private skatteCarExit = -1;
  private skatteLine = 0;
  private toolboxTaken = false;
  private ready = false;
  private needsRender = true;
  private rewardClaimed = new Set<MissionId>();
  private state: GameSnapshot = structuredClone(INITIAL_SNAPSHOT);
  private listenerCleanups: (() => void)[] = [];
  private shadowLight: THREE.DirectionalLight;
  private reflections: THREE.WebGLRenderTarget | null = null;
  private highQuality = !window.matchMedia('(pointer: coarse)').matches;
  paused = false;
  audio = new GameAudio();

  constructor(element: HTMLElement, callbacks: GameCallbacks) {
    this.element = element;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#c5d8d1');
    this.scene.fog = new THREE.FogExp2('#c5d8d1', 0.0048);
    this.camera = new THREE.PerspectiveCamera(43, 1, 0.15, 330);
    this.camera.position.set(27.5, 21.8, 35.5);
    this.cameraOffset.copy(this.camera.position).sub(this.cameraTarget);
    this.camera.lookAt(this.cameraTarget);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.highQuality ? 1.8 : 1.25));
    this.renderer.setSize(element.clientWidth, element.clientHeight);
    this.renderer.shadowMap.enabled = this.highQuality;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.domElement.setAttribute('aria-label', 'Spelvärlden Gråmyren i 3D. Använd WASD för att gå, E för att interagera och F för att slå.');
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.className = 'world-canvas';
    element.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight('#cee5f4', '#344b35', 1.65));
    this.scene.add(skyDome());
    this.reflections = outdoorReflections(this.renderer);
    this.shadowLight = new THREE.DirectionalLight('#fff0dc', 2.65);
    this.shadowLight.position.set(-35, 58, 29);
    this.shadowLight.castShadow = true;
    this.shadowLight.shadow.mapSize.set(2048, 2048);
    this.shadowLight.shadow.camera.left = -40; this.shadowLight.shadow.camera.right = 40;
    this.shadowLight.shadow.camera.top = 40; this.shadowLight.shadow.camera.bottom = -40;
    this.shadowLight.shadow.camera.near = 1; this.shadowLight.shadow.camera.far = 180;
    this.shadowLight.shadow.normalBias = 0.022;
    this.shadowLight.shadow.radius = 2;
    this.shadowLight.shadow.bias = -0.0003;
    this.shadowLight.target.position.set(0, 0, -16);
    this.scene.add(this.shadowLight, this.shadowLight.target);
    const fill = new THREE.DirectionalLight('#b8d5ed', 0.48);
    fill.position.set(25, 20, -35); this.scene.add(fill);

    this.world = createWorld();
    this.scene.add(this.world.root);
    this.car = createCar();
    this.car.root.position.set(2.1, 0, 7.0); this.car.root.rotation.y = -0.30;
    this.scene.add(this.car.root);
    this.officialCar = createCar('#666e66', true);
    this.officialCar.root.visible = false;
    this.officialCar.root.position.set(16, 0, 37); this.officialCar.root.rotation.y = Math.PI + 0.16;
    this.scene.add(this.officialCar.root);
    this.skatteCar = createCar('#8a9199', true, 'skattemasarnas bil', 'GM 312', 'SKATTEKOLL');
    this.skatteCar.root.visible = false;
    sampleSkattePath(0, this.skatteCar.root.position); this.skatteCar.root.rotation.y = Math.PI + 0.15;
    this.scene.add(this.skatteCar.root);
    this.avatars = {
      leffe: this.createActor('leffe', 6.1, 9.2),
      bill: this.createActor('bill', 8.5, 8.15),
    };
    this.avatars.leffe.model.root.rotation.y = 0.51;
    this.avatars.bill.model.root.rotation.y = 0.28;
    this.rurik = this.createActor('rurik', 35.4, -17.9);
    this.shopkeeper = this.createActor('shopkeeper', SHOP.clerk.x, SHOP.clerk.z);
    this.shopkeeper.model.root.rotation.y = -0.70;
    this.bags = { leffe: createShoppingBag(), bill: createShoppingBag() };
    this.avatars.leffe.model.arms[0].add(this.bags.leffe);
    this.avatars.bill.model.arms[0].add(this.bags.bill);
    this.rifles = { leffe: createHuntingRifle(), bill: createHuntingRifle() };
    for (const avatar of ['leffe', 'bill'] as PlayerId[]) {
      this.avatars[avatar].model.body.add(this.rifles[avatar]);
      this.rifles[avatar].visible = false;
    }
    this.bailiffs = [this.createActor('bailiff', 12, 12, 'matare-1'), this.createActor('bailiff', 14, 10, 'matare-2')];
    this.skatte = [this.createActor('inspector', 10.2, 5.4, 'skatte-1'), this.createActor('inspector', 12.1, 3.6, 'skatte-2')];
    this.runOverCandidates = [this.rurik, this.shopkeeper, ...this.bailiffs, ...this.skatte];
    this.groundColliders = buildColliderTable(this.world.colliders);
    this.upstairsColliders = buildColliderTable(this.world.home.upstairs.colliders);
    this.loftColliders = buildColliderTable(this.world.home.loft.colliders);
    this.progressContext = { player: this.playerPosition, rurik: this.rurik.model.root.position, toolboxTaken: false, claimed: this.rewardClaimed };
    this.bailiffs.forEach(a => a.model.root.visible = false);
    this.skatte.forEach(a => a.model.root.visible = false);
    this.hunting = new HuntingProjectiles(this.world,
      () => [this.companion, this.rurik, this.shopkeeper, ...this.bailiffs, ...this.skatte].map(actor => ({ root: actor.model.root })),
      () => [this.car.root, this.officialCar.root, this.skatteCar.root], impact => this.onShotImpact(impact));
    this.scene.add(this.hunting.root);

    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.81, 40), new THREE.MeshBasicMaterial({ color: '#ecd28e', transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.scene.add(this.ring);
    // Reflections only on glossy/metal surfaces; the forest keeps a cheap matte shader.
    if (this.reflections) this.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material instanceof THREE.MeshStandardMaterial && (material.metalness >= .2 || material.roughness < .35)) {
          material.envMap = this.reflections!.texture; material.envMapIntensity = .65;
        }
      }
    });
    this.load();
    this.setupEvents();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(element);
    this.resize();
    this.ready = true;
    this.state.ready = true;
    this.frame = requestAnimationFrame(this.tick);
    this.emit();
  }

  private createActor(kind: CharacterKind, x: number, z: number, id: string = kind): Actor {
    const model = createCharacter(kind);
    model.root.position.set(x, this.walkableHeight(x, z), z);
    this.scene.add(model.root);
    return { id, model, health: 3, home: new THREE.Vector3(x, 0, z), angry: 0, stunned: 0, flee: false, cooldown: 0, punch: 0, speed: 0, goalOverride: null };
  }

  private get player() { return this.avatars[this.state.character]; }
  private get companion() { return this.avatars[this.state.character === 'leffe' ? 'bill' : 'leffe']; }
  private get playerPosition() { return this.state.inCar ? this.car.root.position : this.player.model.root.position; }

  private listen<K extends keyof WindowEventMap>(target: Window, type: K, handler: (event: WindowEventMap[K]) => void) {
    target.addEventListener(type, handler);
    this.listenerCleanups.push(() => target.removeEventListener(type, handler));
  }

  private stopCameraDrag() {
    const pointer = this.cameraPointer;
    this.cameraPointer = null;
    this.dragging = false;
    const canvas = this.renderer.domElement;
    if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
  }

  private setupEvents() {
    this.listen(window, 'keydown', (event) => {
      const target = event.target as HTMLElement;
      if (target.matches('input, textarea, select') || target.isContentEditable || this.paused) return;
      const accepted = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyF', 'KeyV', 'Space', 'KeyH', 'KeyQ'];
      if (!accepted.includes(event.code)) return;
      // Buttons retain their native keyboard behaviour rather than accidentally driving the car.
      if ((event.code === 'Space') && target.closest('button')) return;
      event.preventDefault();
      this.renderer.domElement.focus({ preventScroll: true });
      this.input.add(event.code);
      if (event.repeat) return;
      if (!this.state.started) this.start();
      if (event.code === 'KeyQ') this.toggleAiming();
      if (event.code === 'Space' && this.state.aiming) this.shoot();
      if (event.code === 'KeyE') this.interact();
      if (event.code === 'KeyF') this.primaryAction();
      if (event.code === 'KeyV') this.switchCharacter();
      if (event.code === 'KeyH' && this.state.inCar) this.honk();
    });
    this.listen(window, 'keyup', (event) => { this.input.delete(event.code); });
    this.listen(window, 'blur', () => { this.input.clear(); this.stopCameraDrag(); });
    const visibility = () => { if (document.hidden) { this.input.clear(); this.stopCameraDrag(); } };
    document.addEventListener('visibilitychange', visibility);
    this.listenerCleanups.push(() => document.removeEventListener('visibilitychange', visibility));
    const canvas = this.renderer.domElement;
    const down = (e: PointerEvent) => {
      if (this.paused) return;
      if (e.button === 2) { e.preventDefault(); this.toggleAiming(); return; }
      if (e.button !== 0 || this.cameraPointer !== null) return;
      e.preventDefault();
      this.cameraPointer = e.pointerId;
      if (this.state.aiming) {
        canvas.setPointerCapture(e.pointerId);
        canvas.focus({ preventScroll: true });
        this.setAimScreen(e.clientX, e.clientY);
        // Touch places the sight without shooting under the same fingertip.
        if (e.pointerType !== 'touch') this.shoot();
        return;
      }
      this.dragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
      canvas.focus({ preventScroll: true });
    };
    const move = (e: PointerEvent) => {
      if (this.paused) return;
      if (this.state.aiming) {
        if ((e.pointerType === 'mouse' && this.cameraPointer === null) || e.pointerId === this.cameraPointer) this.setAimScreen(e.clientX, e.clientY);
        return;
      }
      if (!this.dragging || e.pointerId !== this.cameraPointer) return;
      this.cameraYaw -= (e.clientX - this.lastPointer.x) * 0.006;
      this.cameraElevation = THREE.MathUtils.clamp(this.cameraElevation + (e.clientY - this.lastPointer.y) * 0.004, 0.24, 1.08);
      this.lastPointer = { x: e.clientX, y: e.clientY };
    };
    const end = (e: PointerEvent) => { if (e.pointerId === this.cameraPointer) this.stopCameraDrag(); };
    const wheel = (e: WheelEvent) => {
      if (this.paused) return;
      e.preventDefault();
      this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + e.deltaY * 0.012, 8, 30);
    };
    const context = (e: Event) => e.preventDefault();
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('lostpointercapture', end);
    canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('contextmenu', context);
    this.listenerCleanups.push(() => {
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end); canvas.removeEventListener('pointercancel', end); canvas.removeEventListener('lostpointercapture', end);
      canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('contextmenu', context);
    });
  }

  private resize() {
    const w = this.element.clientWidth, h = this.element.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.needsRender = true;
  }

  start() {
    if (this.state.started) return;
    this.state.started = true;
    const controls = window.matchMedia('(pointer: coarse)').matches
      ? 'Håll en pil för att gå. Håll Spring med andra fingret. E använder föremål.'
      : 'WASD går. E vid bilen hoppar in. Myrboden finns på kartan (M).';
    this.callbacks.onToast({ title: 'Nu kör vi!', detail: controls, kind: 'info' });
    this.emit();
  }

  setPaused(value: boolean) {
    this.paused = value;
    this.input.clear(); this.stopCameraDrag();
    this.audio.engine(this.carVelocity, this.state.inCar && !value);
  }

  setKey(code: string, down: boolean) {
    if (this.paused) return;
    if (down) { this.start(); this.input.add(code); } else this.input.delete(code);
  }

  setTouchInput(pointer: number, codes: readonly string[]) {
    // Release events must always work, including while a menu or stair animation pauses input.
    if (!codes.length) { this.input.releasePointer(pointer); return; }
    if (this.paused || this.state.onStairs) return;
    this.start(); this.input.setPointer(pointer, codes);
  }
  clearTouchInput() { this.input.clearPointers(); }

  toggleSound() { this.state.sound = this.audio.toggle(); this.emit(); return this.state.sound; }
  setVolume(value: number) { this.audio.setVolume(value); }
  toggleMusic() {
    const failed = () => {
      this.state.music = false;
      this.callbacks.onToast({ title: 'Musiken kunde inte starta', detail: 'Tryck på notknappen för att försöka igen.', kind: 'warning' });
      this.emit();
    };
    try { this.state.music = this.audio.toggleMusic(failed); } catch { failed(); }
    this.emit();
    return this.state.music;
  }
  setMusicVolume(value: number) { this.audio.setMusicVolume(value); }
  setDialogueOpen(open: boolean) { this.audio.setDialogueOpen(open); }

  private canUseRifle() { return canUseRifle(this.state, this.playerPosition); }

  private aimingDistance() { return this.cameraDistance * Math.max(1, Math.min(1.45, .7 / this.camera.aspect)); }

  toggleAiming() { this.setAiming(!this.state.aiming); }

  private setAiming(enabled: boolean) {
    if (enabled) {
      if (this.paused || this.state.onStairs) return;
      this.start();
      if (!this.state.hasRifle) {
        this.state.activeMission = 'hunt'; this.state.waypoint = 'home';
        this.callbacks.onToast({ title: 'Jaktgeväret saknas', detail: 'Det går inte att jaga utan gevär. Hämta jaktgeväret inne i huset med E först.', kind: 'warning' });
        this.emit(); return;
      }
      if (!this.canUseRifle()) {
        this.callbacks.onToast({ title: 'Geväret får vänta', detail: 'Sikta utomhus, till fots och utan matkassen i handen.', kind: 'info' }); return;
      }
      this.aimNDC.set(0, .28);
      this.state.shotFeedback = 'ready'; this.shotFeedbackTime = 0;
    }
    this.stopCameraDrag(); this.input.clearPointers();
    this.state.aiming = enabled;
    this.state.aimPlaced = false;
    if (enabled) {
      // Finish any travel/intro camera transition before aiming. A stationary
      // player's sight must not drift because the view is still zooming in.
      const elevation = this.cameraElevation, dist = this.aimingDistance();
      this.cameraTarget.copy(this.playerPosition).add(new THREE.Vector3(0, 1.3, 0));
      this.cameraOffset.set(Math.sin(this.cameraYaw) * Math.cos(elevation) * dist,
        Math.sin(elevation) * dist, Math.cos(this.cameraYaw) * Math.cos(elevation) * dist);
      this.updateCamera(0);
      this.updateAim();
      this.renderer.domElement.focus({ preventScroll: true });
    }
    this.updateEquipment(); this.emit();
  }

  private cancelHunting() {
    this.state.aiming = false; this.state.aimPlaced = false; this.huntingTimer = 0;
    this.state.shotFeedback = 'ready'; this.shotFeedbackTime = 0;
    this.hunting.clear(); this.stopCameraDrag();
  }

  private setAimScreen(clientX: number, clientY: number) {
    if (!this.state.aiming || this.paused) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.aimNDC.set(THREE.MathUtils.clamp((clientX - rect.left) / rect.width * 2 - 1, -.98, .98),
      THREE.MathUtils.clamp(1 - (clientY - rect.top) / rect.height * 2, -.98, .98));
    this.state.aimPlaced = true;
    this.updateAim(); this.updateEquipment(); this.emit();
  }

  private updateAim() {
    this.camera.updateMatrixWorld();
    this.aimRay.setFromCamera(this.aimNDC, this.camera);
    const ray = this.aimRay.ray;
    const hit = this.hunting.trace(ray.origin, ray.direction, 160);
    if (hit) this.aimPoint.copy(hit.point); else this.aimPoint.copy(ray.origin).addScaledVector(ray.direction, 160);
    const p = this.playerPosition;
    const dx = this.aimPoint.x - p.x, dz = this.aimPoint.z - p.z;
    if (dx * dx + dz * dz > .05 * .05) this.player.model.root.rotation.y = Math.atan2(dx, dz);
  }

  shoot() {
    if (this.paused || !this.state.aiming || !this.state.aimPlaced || !this.canUseRifle() || this.huntingTimer > 0) return;
    this.updateAim(); this.updateEquipment();
    const rifle = this.rifles[this.state.character];
    rifle.updateWorldMatrix(true, true);
    const origin = rifle.localToWorld(RIFLE_MUZZLE.clone());
    const shoulder = rifle.getWorldPosition(new THREE.Vector3());
    const muzzleLine = origin.clone().sub(shoulder);
    const blocked = this.hunting.trace(shoulder, muzzleLine.clone().normalize(), muzzleLine.length());
    if (blocked) {
      this.state.shotFeedback = 'blocked'; this.shotFeedbackTime = 1.2; this.emit(); return;
    }
    const direction = this.aimPoint.clone().sub(origin).normalize();
    this.hunting.fire(origin, direction);
    this.huntingTimer = SHOT_INTERVAL;
    this.state.shotsFired++;
    this.state.shotFeedback = 'flying'; this.shotFeedbackTime = 1.4;
    this.burst(origin, '#ffe2a1', 5);
    this.audio.play('hunt');
    this.emit();
  }

  private onShotImpact(impact: ShotImpact) {
    const outcome = applyShotImpact(this.state, impact.kind, impact.elk?.alive === true, this.rewardClaimed);
    if (outcome.hit && impact.elk) {
      const elk = impact.elk;
      elk.alive = false; elk.model.root.visible = false; elk.respawnAt = this.activeTime + 80;
      this.burst(impact.point, '#dfce99', 24);
      if (outcome.rewarded) this.announceReward('hunt');
      this.save();
      this.callbacks.onToast({ title: 'Träff! Jaktlycka! +50 kr', detail: 'Kulan träffade älgen. Bara tecknad, blodfri jakt.', kind: 'success' });
    } else if (impact.kind !== 'miss' && impact.kind !== 'person') this.burst(impact.point, '#cbbd92', 5);
    this.shotFeedbackTime = 1.6;
    this.emit();
  }

  /** Följer webbläsarens prefers-reduced-motion. Spelet fungerar likadant, men rör sig lugnare. */
  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
    if (value) this.car.root.rotation.z = 0;
  }

  setQuality(high: boolean) {
    if (this.highQuality === high) return;
    this.highQuality = high;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.8 : 1.25));
    this.renderer.shadowMap.enabled = high;
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach(m => m.needsUpdate = true);
      }
    });
    this.resize();
  }

  switchCharacter() {
    if (this.state.onStairs) return;
    this.cancelHunting();
    const previousPosition = this.playerPosition.clone();
    const otherPosition = this.companion.model.root.position.clone();
    this.state.character = this.state.character === 'leffe' ? 'bill' : 'leffe';
    this.player.stunned = 0; this.player.health = 3;
    if ((this.state.carryingMeat || this.state.insideHome) && !this.state.inCar) {
      this.player.model.root.position.copy(previousPosition);
      this.companion.model.root.position.copy(otherPosition);
    }
    this.updateEquipment();
    this.audio.play('click');
    this.say(this.player, this.state.character === 'bill' ? 'Det här blir ju skitbra!' : 'Låt mig sköta det här.');
    this.emit(); this.save();
  }

  trackMission(id: MissionId) {
    trackMission(this.state, id);
    this.callbacks.onToast({ title: `Följer: ${MISSIONS[id].title}`, detail: 'Platsen är markerad på kartan.', kind: 'info' });
    this.audio.play('click');
    this.save(); this.emit();
  }

  setWaypoint(id: DestinationId | null) {
    this.state.waypoint = id;
    if (id) this.callbacks.onToast({ title: 'Vägpunkt satt', detail: DESTINATIONS.find(d => d.id === id)?.name, kind: 'info' });
    this.emit();
  }

  travel(id: DestinationId) {
    if (this.state.carryingMeat) {
      this.callbacks.onToast({ title: 'Inga genvägar med matkassen', detail: 'Gå eller kör hem med köttet. Snabbresa öppnas igen när det är levererat.', kind: 'warning' });
      return;
    }
    const dest = DESTINATIONS.find(d => d.id === id)!;
    this.cancelHunting();
    this.stairTravel = null; this.state.onStairs = false; this.state.onLadder = false; this.state.homeFloor = 0;
    this.start();
    this.input.clear(); this.stopCameraDrag();
    this.carVelocity = 0;
    if (this.state.inCar) {
      this.car.root.position.set(dest.x, 0, dest.z + 3);
      this.car.root.rotation.y = Math.PI;
    } else {
      this.player.model.root.position.set(dest.x, 0, dest.z);
      this.companion.model.root.position.set(dest.x + 2.7, 0, dest.z + 1.1);
    }
    this.cameraTarget.copy(this.playerPosition).add(new THREE.Vector3(0, 1.3, 0));
    this.state.waypoint = id;
    this.callbacks.onToast({ title: dest.name, detail: 'Framme! Resten är upp till er.', kind: 'success' });
    this.updateShop(0);
    this.updateProgress();
    this.emit();
  }

  interact() {
    if (this.paused || this.state.onStairs) return;
    if (this.state.aiming) { this.setAiming(false); return; }
    this.start();
    if (this.state.inCar) {
      this.carVelocity = 0;
      this.state.inCar = false;
      const right = new THREE.Vector3(Math.cos(this.car.root.rotation.y), 0, -Math.sin(this.car.root.rotation.y));
      const base = this.car.root.position.clone();
      const exit = base.clone().addScaledVector(right, 2.35);
      if (this.collides(exit, 0.48, false)) exit.copy(base).addScaledVector(right, -2.35);
      this.player.model.root.position.copy(exit);
      this.companion.model.root.position.copy(base).addScaledVector(right, -2.55).add(new THREE.Vector3(0, 0, -1));
      this.player.model.root.visible = true; this.companion.model.root.visible = true;
      this.say(this.player, 'Den går som en klocka. Nästan.');
      this.audio.engine(0, false);
      this.emit(); return;
    }
    const p = this.playerPosition;
    if (this.state.homeFloor === 2) {
      if (nearBreadMachine(p, this.state.homeFloor)) { this.toggleBreadMachine(); return; }
      if (nearLadder(p, this.state.homeFloor)) { this.beginStairTravel('ladder'); return; }
      this.callbacks.onToast({ title: 'Loftet', detail: 'Bakmaskinen står vid gaveln: E stänger av den. Loftstegen vid räcket tar dig ner till Bills rum.', kind: 'info' });
      return;
    }
    if (this.state.homeFloor === 1) {
      if (nearComputer(p, this.state.homeFloor)) {
        this.state.computerOn = !this.state.computerOn;
        this.world.home.upstairs.computer.setPowered(this.state.computerOn);
        this.audio.play('click'); this.emit(); return;
      }
      if (nearLadder(p, this.state.homeFloor)) { this.beginStairTravel('ladder'); return; }
      if (nearStairs(p, this.state.homeFloor)) { this.beginStairTravel('stairs'); return; }
      this.callbacks.onToast({ title: 'Bills rum', detail: 'Gå fram till datorn och tryck E, klättra upp på loftet via stegen, eller gå tillbaka till trätrappan för att komma ner.', kind: 'info' });
      return;
    }
    if (nearStairs(p, this.state.homeFloor)) { this.beginStairTravel('stairs'); return; }
    if (!this.state.hasRifle && nearRifleRack(p)) {
      pickUpRifle(this.state);
      this.world.home.rifle.visible = false;
      this.updateEquipment(); this.audio.play('click');
      this.say(this.player, 'Så där! Nu har vi det viktigaste.');
      this.callbacks.onToast({ title: 'Jaktgeväret är med!', detail: 'Geväret delas av vännerna. Ta er till jaktmarken, välj Sikta, sikta på älgen och tryck Skjut. Kulan måste träffa.', kind: 'success' });
      this.save(); this.emit(); return;
    }
    if (nearFridge(p, this.state.homeFloor)) {
      this.state.fridgeOpen = !this.state.fridgeOpen;
      this.audio.play('click');
      this.emit(); return;
    }
    if (isInsideHome(p) && Math.hypot(p.x - HOME.entry.x, p.z - HOME.entry.z) < 2.65) {
      p.set(HOME.door.x, 0, HOME.door.z + 0.65);
      this.companion.model.root.position.set(HOME.door.x + 2.6, 0, HOME.door.z + 1.3);
      this.updateShop(0); this.emit(); return;
    }
    if (!isInsideHome(p) && Math.hypot(p.x - HOME.door.x, p.z - HOME.door.z) < 2.6) {
      p.set(HOME.entry.x, 0.565, HOME.entry.z);
      this.companion.model.root.position.set(HOME.door.x + 2.6, 0, HOME.door.z + 1.3);
      this.updateShop(0);
      if (!this.state.hasRifle) this.callbacks.onToast({ title: 'Hemma hos vännerna', detail: 'Jaktgeväret står i stället längst in till vänster. Gå nära och tryck E för att ta det.', kind: 'info' });
      this.emit(); return;
    }
    if (isInsideShop(p) && !this.state.carryingMeat && this.state.progress.shop < 3 && Math.hypot(p.x - SHOP.meat.x, p.z - SHOP.meat.z) < 3.15) {
      takeMeat(this.state);
      this.shopGraceUntil = this.activeTime + SHOP_GRACE_SECONDS;
      this.shopkeeper.angry = SHOP_CLERK_ANGER_SECONDS;
      this.world.shop.loot.visible = false;
      this.updateEquipment();
      this.say(this.shopkeeper, 'Hörrni! Det där är inte ett smakprov!');
      this.audio.play('warning');
      this.callbacks.onToast({ title: 'Köttet ligger i påsen!', detail: 'Marta kommer! Spring ut och ta dig hem till gården. Ingen snabbresa med köttpåsen.', kind: 'warning' });
      this.save(); this.emit(); return;
    }
    if (isInsideShop(p) && Math.hypot(p.x - SHOP.entry.x, p.z - SHOP.entry.z) < 3.4) {
      p.set(SHOP.door.x, 0, SHOP.door.z + 1.6);
      this.companion.model.root.position.set(SHOP.door.x + 2.7, 0, SHOP.door.z + 2.8);
      this.updateShop(0); this.emit(); return;
    }
    if (!isInsideShop(p) && Math.hypot(p.x - SHOP.door.x, p.z - SHOP.door.z) < 3.5) {
      p.set(SHOP.entry.x, 0, SHOP.entry.z);
      this.companion.model.root.position.set(SHOP.door.x + 2.7, 0, SHOP.door.z + 1.1);
      this.updateShop(0);
      this.say(this.shopkeeper, this.state.progress.shop === 3 ? 'Ni igen? Inget mer bus idag.' : 'Välkomna! Köttdisken är till vänster.');
      this.emit(); return;
    }
    if (!this.toolboxTaken && distance(p, this.world.toolbox.position) < 3.0) {
      this.toolboxTaken = true; this.world.toolbox.visible = false;
      takeToolbox(this.state);
      this.rurik.angry = 40;
      this.say(this.rurik, 'Hörru! Den där är MIN!');
      this.audio.play('warning');
      this.callbacks.onToast({ title: 'Lånat utan att fråga', detail: 'Du har verktygslådan. Dags att dra härifrån!', kind: 'warning' });
      this.save(); this.emit(); return;
    }
    if (this.world.elk.some(e => e.alive && distance(p, e.model.root.position) < 16)) {
      this.setAiming(true); return;
    }
    if (distance(p, this.car.root.position) < 4.6) {
      this.state.inCar = true;
      this.player.model.root.visible = false; this.companion.model.root.visible = false;
      this.companion.stunned = 0;
      const waypoint = carEntryWaypoint(this.state);
      if (waypoint) this.state.waypoint = waypoint;
      this.callbacks.onToast({ title: 'Blå faran · blå sedan', detail: this.state.activeMission === 'hunt' && !this.state.hasRifle ? 'Geväret ligger fortfarande i huset. Hämta det innan ni ger er ut på jakt.' : 'WASD kör · Mellanslag bromsar · H tutar · E kliver ur', kind: 'info' });
      this.cameraYaw = this.car.root.rotation.y + Math.PI;
      this.audio.play('click');
      this.save(); this.emit(); return;
    }
    if (distance(p, this.rurik.model.root.position) < 3.7 && !this.rurik.stunned) {
      this.callbacks.onDialogue('rurik'); return;
    }
    if (Math.hypot(p.x - HOME.coffee.x, p.z - HOME.coffee.z) < 2.4) {
      this.state.health = 100;
      this.say(this.player, 'En kopp så är man som ny.');
      this.callbacks.onToast({ title: 'Kaffepaus', detail: 'Hälsan är återställd. Nu orkar ni med mer hyss.', kind: 'success' });
      this.audio.play('coin'); this.emit(); return;
    }
    if (distance(p, this.companion.model.root.position) < 3.5) { this.callbacks.onDialogue('bill'); return; }
    this.callbacks.onToast({ title: 'Kom lite närmare', detail: 'E använder föremål. Q tar fram geväret; sikta själv och klicka eller tryck Skjut.', kind: 'info' });
  }

  talk(choice: 'forest' | 'toolbox' | 'bye') {
    if (choice === 'forest') {
      this.state.waypoint = 'forest';
      this.say(this.rurik, 'Bortom granarna. Och håll er där!');
      this.callbacks.onToast({ title: 'Rurik pekade ut jaktmarken', detail: 'En vägpunkt har lagts till på kartan.', kind: 'info' });
    } else if (choice === 'toolbox') this.say(this.rurik, 'Rör inte mina grejer!');
    else this.say(this.player, 'Vi skulle ändå precis gå.');
    this.emit();
  }

  primaryAction() {
    // The main action follows the equipped mode. Never lower a raised rifle and
    // throw a punch when the player presses the visible F/Skjut control.
    if (this.state.aiming) this.shoot();
    else this.punch();
  }

  punch() {
    if (this.paused || this.state.onStairs) return;
    if (this.state.aiming) this.setAiming(false);
    this.start();
    if (this.state.inCar) { this.honk(); return; }
    if (this.punchTimer > 0.08) return;
    this.punchTimer = 0.43;
    this.audio.play('hit');
    const candidates = [this.companion, this.rurik, this.shopkeeper, ...this.bailiffs].filter(a => a.model.root.visible && !a.flee && !a.stunned && Math.abs(this.playerPosition.y - a.model.root.position.y) < 1.5 && distance(this.playerPosition, a.model.root.position) < 3.3);
    candidates.sort((a, b) => distance(this.playerPosition, a.model.root.position) - distance(this.playerPosition, b.model.root.position));
    const target = candidates[0];
    if (target) {
      this.player.model.root.rotation.y = Math.atan2(target.model.root.position.x - this.playerPosition.x, target.model.root.position.z - this.playerPosition.z);
      this.hitActor(target, 1);
    } else this.burst(this.playerPosition.clone().add(new THREE.Vector3(Math.sin(this.player.model.root.rotation.y) * 1.0, 1.7, Math.cos(this.player.model.root.rotation.y) * 1.0)), '#e4d8af', 4);
  }

  private hitActor(target: Actor, amount: number) {
    target.health -= amount;
    target.cooldown = 0.75;
    this.burst(target.model.root.position.clone().add(new THREE.Vector3(0, 1.9, 0)), '#f2d388', 13);
    const push = target.model.root.position.clone().sub(this.playerPosition); push.y = 0;
    if (push.lengthSq() > 0) { push.normalize().multiplyScalar(0.66); this.move(target.model.root, push, 0.45); }
    if (target === this.rurik) {
      target.angry = 32; this.state.wanted = Math.min(3, this.state.wanted + 1);
      this.say(target, ['Men vad håller ni på med?!', 'Ut från min gård!', 'Nu får det vara nog!'][Math.max(0, target.health) % 3]);
    } else if (target === this.shopkeeper) {
      target.angry = 30; this.state.wanted = Math.max(2, this.state.wanted);
      this.say(target, 'Det här är en matbutik, inte en boxningsklubb!');
    } else if (target === this.companion) this.say(target, target.id === 'bill' ? 'Aj! Vi är ju på samma lag!' : 'Men skärp dig, Bill!');
    else if (target.id.startsWith('skatte')) this.say(target, 'Det här kommer med i protokollet!');
    else this.say(target, 'Det här står inte i blanketten!');
    if (target.health <= 0) {
      if (target.id.startsWith('matare')) {
        target.flee = true; this.bailiffFled++;
        this.say(target, 'Vi får rita om kartan!');
        if (bailiffChasedOff(this.state, this.bailiffFled, this.rewardClaimed)) {
          this.audio.play('coin'); this.save();
          this.callbacks.onToast({ title: 'Stigen tar en annan väg!', detail: 'Mätarlaget lämnade gården. +200 kr', kind: 'success' });
        }
      } else if (target.id.startsWith('skatte')) {
        target.flee = true; target.goalOverride = null;
        this.say(target, 'Vi noterar det här!');
        if (this.skatte.every(a => a.flee) && skatteVisitAborted(this.skatteVisit)) {
          this.cutsceneFocus = null;
          if (this.skatteCar.root.visible) this.skatteCarExit = this.skattePathU;
          this.callbacks.onToast({ title: 'Skattemasarna avbröt besöket', detail: 'De springer till bilen. Det här kommer med i nästa deklaration.', kind: 'warning' });
        }
      } else {
        target.stunned = 7;
        target.angry = target === this.rurik ? 0 : target.angry;
        this.say(target, 'Jag… tar en liten paus.');
      }
    }
    this.emit();
  }

  honk() { this.audio.play('horn'); this.say(this.player, 'TUUUT!'); }

  summonBailiffs() {
    if (this.state.bailiffsActive || this.bailiffArrival > 0) {
      this.callbacks.onToast({ title: 'De är redan här', detail: 'Leta efter mätarna vid gården.', kind: 'info' }); return;
    }
    if (this.state.progress.bailiff === 3) {
      this.callbacks.onToast({ title: 'De fick nog för idag', detail: 'Mätarlaget återkommer i nästa spelomgång.', kind: 'info' }); return;
    }
    this.start();
    this.state.activeMission = 'bailiff'; this.state.waypoint = 'home';
    this.state.bailiffsActive = true; this.state.bailiffETA = 0;
    this.bailiffArrival = 4.5;
    this.officialCar.root.visible = true;
    this.officialCar.root.position.set(16, 0, 36);
    this.audio.play('warning');
    this.callbacks.onToast({ title: 'Oväntat besök!', detail: 'Mätarlaget vill märka ut en stig genom gården.', kind: 'warning' });
    this.emit();
  }

  /** Ljud, toast och sparning när en belöning just betalats ut (själva regeln ligger i rules.ts). */
  private announceReward(id: MissionId) {
    this.audio.play('coin');
    this.callbacks.onToast({ title: `Uppdrag klart: ${MISSIONS[id].title}`, detail: `+${MISSIONS[id].reward} kr i fickan. Vad hittar ni på härnäst?`, kind: 'success' });
    this.save();
  }

  private collides(position: THREE.Vector3, radius: number, includeCar: boolean, floor: HomeFloor = 0) {
    if (Math.abs(position.x) > 89 || Math.abs(position.z) > 89) return true;
    if (floor === 1 && (Math.abs(position.x - HOME.center.x) > 5.44 - radius || Math.abs(position.z - HOME.center.z) > 3.94 - radius)) return true;
    // Loftet är ett halvplan: utanför plankorna finns bara luften ovanför Bills rum.
    if (floor === 2 && (Math.abs(position.x - LOFT_CENTRE_X) > LOFT_HALF_WIDTH - radius || Math.abs(position.z - HOME.center.z) > HOME.loft.halfDepth - radius)) return true;
    // The sedan can park outside, but it cannot be driven through the shop doorway.
    if (radius > 1 && Math.abs(position.x - HOME.center.x) < 5.7 + radius && Math.abs(position.z - HOME.center.z) < 4.2 + radius) return true;
    if (radius > 1 && Math.abs(position.x - SHOP.center.x) < 7.4 + radius && position.z > SHOP.center.z - 5.5 - radius && position.z < SHOP.center.z + 5.3 + radius) return true;
    if (collidesAt(floor === 2 ? this.loftColliders : floor === 1 ? this.upstairsColliders : this.groundColliders, position.x, position.z, radius)) return true;
    if (includeCar && floor === 0) {
      const local = scratchLocal.copy(position).sub(this.car.root.position).applyAxisAngle(up, -this.car.root.rotation.y);
      if (Math.abs(local.x) < 1.04 + radius && Math.abs(local.z) < 2.48 + radius) return true;
    }
    return false;
  }

  private move(object: THREE.Object3D, delta: THREE.Vector3, radius: number, includeCar = false) {
    const beforeX = object.position.x, beforeZ = object.position.z;
    const floor = object === this.player.model.root ? this.state.homeFloor : 0;
    const candidate = scratchCandidate.copy(object.position);
    candidate.x += delta.x;
    if (!this.collides(candidate, radius, includeCar, floor)) object.position.x = candidate.x;
    candidate.copy(object.position); candidate.z += delta.z;
    if (!this.collides(candidate, radius, includeCar, floor)) object.position.z = candidate.z;
    object.position.y = this.walkableHeight(object.position.x, object.position.z, floor);
    const movedX = object.position.x - beforeX, movedZ = object.position.z - beforeZ;
    return Math.sqrt(movedX * movedX + movedZ * movedZ);
  }

  private updatePlayer(dt: number) {
    if (this.stairTravel) { this.updateStairTravel(dt); return; }
    const forward = (this.input.has('KeyW') || (!this.state.aiming && this.input.has('ArrowUp')) ? 1 : 0) - (this.input.has('KeyS') || (!this.state.aiming && this.input.has('ArrowDown')) ? 1 : 0);
    const horizontal = (this.input.has('KeyD') || (!this.state.aiming && this.input.has('ArrowRight')) ? 1 : 0) - (this.input.has('KeyA') || (!this.state.aiming && this.input.has('ArrowLeft')) ? 1 : 0);
    this.punchTimer = Math.max(0, this.punchTimer - dt);
    this.huntingTimer = Math.max(0, this.huntingTimer - dt);
    this.shotFeedbackTime = Math.max(0, this.shotFeedbackTime - dt);
    if (!this.shotFeedbackTime) this.state.shotFeedback = 'ready';
    if (this.state.aiming) {
      if (!this.canUseRifle()) this.setAiming(false);
      else {
        // Keyboard-only aiming: WASD still moves; arrows move the sight.
        const x = Number(this.input.has('ArrowRight')) - Number(this.input.has('ArrowLeft'));
        const y = Number(this.input.has('ArrowUp')) - Number(this.input.has('ArrowDown'));
        if (dt > 0 && (x || y)) {
          this.aimNDC.x = THREE.MathUtils.clamp(this.aimNDC.x + x * dt * 1.15, -.98, .98);
          this.aimNDC.y = THREE.MathUtils.clamp(this.aimNDC.y + y * dt * 1.15, -.98, .98);
          this.state.aimPlaced = true;
        }
        this.updateAim();
      }
    }
    if (this.state.inCar) {
      if (forward !== 0) this.carVelocity += forward * (forward > 0 ? 8.0 : 7.4) * dt;
      else this.carVelocity *= Math.exp(-dt * 0.60);
      if (this.input.has('Space')) this.carVelocity *= Math.exp(-dt * 5.8);
      this.carVelocity = THREE.MathUtils.clamp(this.carVelocity, -8.2, 20.5);
      this.carSteering = THREE.MathUtils.lerp(this.carSteering, -horizontal * 0.49, 1 - Math.exp(-dt * 7));
      if (Math.abs(this.carVelocity) > 0.2) this.car.root.rotation.y += this.carSteering * Math.min(1, Math.abs(this.carVelocity) / 5) * Math.sign(this.carVelocity) * dt * 1.80;
      const delta = scratchMove.set(Math.sin(this.car.root.rotation.y), 0, Math.cos(this.car.root.rotation.y)).multiplyScalar(this.carVelocity * dt);
      const before = scratchBefore.copy(this.car.root.position);
      this.move(this.car.root, delta, 1.20);
      if (delta.length() > 0.025 && before.distanceTo(this.car.root.position) < delta.length() * 0.3) {
        if (Math.abs(this.carVelocity) > 5) { this.audio.play('hit'); this.burst(above(this.car.root.position, 0.7, scratchBurst), '#c4b788', 6); }
        this.carVelocity *= -0.14;
      }
      // Karossen kränger i kurvor – utom när spelaren bett om lugnare rörelser.
      this.car.root.rotation.z = this.reducedMotion ? 0 : THREE.MathUtils.lerp(this.car.root.rotation.z, this.carSteering * this.carVelocity * -0.007, dt * 7);
      for (const lamp of this.car.brakeLights) (lamp.material as THREE.MeshStandardMaterial).emissiveIntensity = this.input.has('Space') || forward < 0 ? 0.95 : 0.15;
      for (const wheel of this.car.frontWheels) wheel.rotation.y = this.carSteering;
      const spin = this.carVelocity * dt * 0.9;
      for (const wheel of this.car.wheels) for (const part of wheel.children) part.rotation.x += spin;
      this.player.model.root.position.copy(this.car.root.position);
      this.companion.model.root.position.copy(this.car.root.position);
      this.audio.engine(this.carVelocity, true);
      if (Math.abs(this.carVelocity) > 4) {
        for (const actor of this.runOverCandidates) {
          if (actor.model.root.visible && !actor.flee && !actor.stunned && distance(this.car.root.position, actor.model.root.position) < 2.3) {
            this.hitActor(actor, 3); this.carVelocity *= 0.5;
          }
        }
      }
    } else {
      const running = this.input.has('ShiftLeft') || this.input.has('ShiftRight');
      const speed = this.state.aiming ? 2.4 : running ? 7.9 : 4.35;
      const desired = scratchMove;
      let travelled = 0;
      if (forward || horizontal) {
        desired.set(-Math.sin(this.cameraYaw) * forward + Math.cos(this.cameraYaw) * horizontal, 0, -Math.cos(this.cameraYaw) * forward - Math.sin(this.cameraYaw) * horizontal).normalize();
        const yaw = Math.atan2(desired.x, desired.z);
        if (!this.state.aiming) this.player.model.root.rotation.y = angleLerp(this.player.model.root.rotation.y, yaw, 1 - Math.exp(-dt * 13));
        travelled = this.move(this.player.model.root, desired.multiplyScalar(speed * dt), 0.43, true);
        if (travelled > 0.001 && this.activeTime - this.lastStep > (running ? 0.24 : 0.38)) { this.audio.play('step'); this.lastStep = this.activeTime; }
      }
      this.player.speed = dt > 0 ? Math.min(speed, travelled / dt) : 0;
      animateCharacter(this.player.model, this.elapsed, this.player.speed, this.punchTimer / 0.43, Math.max(0, 0.5 - (this.activeTime - this.lastDamage)) * 2, dt);
      this.audio.engine(0, false);
    }
    this.ring.visible = !this.state.inCar;
    above(this.playerPosition, 0.04, this.ring.position);
    this.ring.rotation.z = this.elapsed * 0.3;
    if (this.activeTime - this.lastDamage > 12) this.state.health = Math.min(100, this.state.health + dt * 1.5);
  }

  private updateActor(actor: Actor, dt: number) {
    if (!actor.model.root.visible) return;
    actor.cooldown = Math.max(0, actor.cooldown - dt);
    actor.punch = Math.max(0, actor.punch - dt);
    actor.angry = Math.max(0, actor.angry - dt);
    actor.speed = 0;
    if (actor.stunned > 0) {
      actor.stunned -= dt;
      actor.model.body.rotation.set(0, 0, 0.65);
      actor.model.body.position.y = -0.5;
      if (actor.stunned <= 0) { actor.health = 3; actor.model.body.rotation.z = 0; actor.model.body.position.y = 0; }
      return;
    }
    const current = actor.model.root.position;
    let goal: THREE.Vector3 | null = null;
    let speed = 3.5;
    if (actor.flee) {
      goal = FLEE_GOAL; speed = 7.2;
      if (distance(current, goal) < 4) { actor.model.root.visible = false; return; }
    } else if (actor === this.companion && this.state.insideHome) {
      if (distance(current, COMPANION_WAIT_HOME) > 1.0) { goal = COMPANION_WAIT_HOME; speed = 4.6; }
    } else if (actor === this.companion && this.state.insideShop) {
      if (distance(current, COMPANION_WAIT_SHOP) > 1.1) { goal = COMPANION_WAIT_SHOP; speed = 4.6; }
    } else if (actor === this.companion) {
      if (!this.state.inCar && distance(current, this.playerPosition) > 4.2) {
        goal = this.playerPosition; speed = distance(current, goal) > 12 ? 8.5 : 4.6;
      }
      if (!this.state.inCar && distance(current, this.playerPosition) > 40) {
        current.copy(this.playerPosition); current.x -= 2.4; current.z += 1;
      }
    } else if (actor === this.shopkeeper && this.state.carryingMeat && actor.angry > 0) {
      const d = distance(current, this.playerPosition);
      if (d < SHOP_CLERK_CATCH_DISTANCE && Math.abs(current.y - this.playerPosition.y) < 1.5 && this.activeTime > this.shopGraceUntil && !this.state.inCar) { this.caughtInShop(); return; }
      if (d > 1.6 && d < 34) { goal = this.playerPosition; speed = 4.9; }
    } else if ((actor.angry > 0 || (actor.id.startsWith('matare') && this.state.bailiffsActive)) && !actor.flee) {
      const d = distance(current, this.playerPosition);
      if (d > 2.2 && d < 42) { goal = this.playerPosition; speed = actor === this.rurik ? 4.5 : 3.1; }
      if (d < 2.4 && Math.abs(current.y - this.playerPosition.y) < 1.5 && actor.cooldown === 0 && !this.state.inCar && !this.state.onStairs) {
        actor.punch = 0.43; actor.cooldown = 1.8;
        this.state.health -= actor === this.rurik ? 10 : 7;
        this.lastDamage = this.activeTime;
        this.audio.play('hit');
        this.burst(above(this.playerPosition, 1.8, scratchBurst), '#e8ca91', 6);
        if (this.state.health <= 0) this.respawn();
      }
    } else if (actor.goalOverride) {
      goal = actor.goalOverride; speed = 3.6;
    } else if (distance(current, actor.home) > 2) { goal = actor.home; speed = 2.0; }
    if (goal) {
      if (actor === this.shopkeeper) {
        const inside = isInsideShop(current), targetInside = isInsideShop(goal);
        if (inside && !targetInside) {
          if (Math.abs(current.x - SHOP.entry.x) > 0.6 && current.z < 20.7) goal = scratchGoal.set(SHOP.entry.x, 0, Math.min(current.z, 19.5));
          else goal = scratchGoal.set(SHOP.door.x, 0, SHOP.door.z + 1.7);
        } else if (!inside && targetInside) {
          goal = Math.abs(current.x - SHOP.door.x) > 0.6 || current.z > SHOP.door.z + 1.9
            ? scratchGoal.set(SHOP.door.x, 0, SHOP.door.z + 1.7)
            : scratchGoal.set(SHOP.entry.x, 0, 17.0);
        }
      }
      const delta = scratchStep.copy(goal).sub(current); delta.y = 0;
      actor.model.root.rotation.y = angleLerp(actor.model.root.rotation.y, Math.atan2(delta.x, delta.z), 1 - Math.exp(-dt * 6));
      delta.normalize().multiplyScalar(speed * dt);
      const travelled = this.move(actor.model.root, delta, 0.45, true);
      actor.speed = dt > 0 ? Math.min(speed, travelled / dt) : 0;
    }
    animateCharacter(actor.model, this.elapsed + (actor.id === 'bill' ? 1.4 : 0.6), actor.speed, actor.punch / 0.43, 0, dt);
  }

  private respawn() {
    this.cancelHunting();
    this.stairTravel = null;
    respawnPenalty(this.state);
    this.shopkeeper.angry = 0; this.shopkeeper.model.root.position.copy(this.shopkeeper.home);
    this.world.shop.loot.visible = this.state.progress.shop < 3; this.updateEquipment();
    this.player.model.root.visible = true; this.companion.model.root.visible = true;
    this.player.model.root.position.set(-5, 0, 4); this.companion.model.root.position.set(-3, 0, 5);
    this.rurik.angry = 0; this.rurik.model.root.position.copy(this.rurik.home);
    this.bailiffs.forEach(a => { if (!a.flee) { a.model.root.position.copy(a.home); a.cooldown = 10; } });
    this.skatte.forEach(a => { if (!a.flee) { a.model.root.position.copy(a.home); a.cooldown = 10; } });
    this.callbacks.onToast({ title: 'En ofrivillig tupplur', detail: 'Tillbaka på gården, 25 kr fattigare. Alla är hela igen.', kind: 'warning' });
    this.save();
  }

  private walkableHeight(x: number, z: number, floor: HomeFloor = 0) { return walkableHeight(x, z, floor); }

  private updateEquipment() {
    for (const avatar of ['leffe', 'bill'] as PlayerId[]) {
      const selected = this.state.character === avatar;
      this.bags[avatar].visible = this.state.carryingMeat && selected;
      const rifle = this.rifles[avatar];
      rifle.visible = this.state.hasRifle && selected;
      if (selected && this.state.aiming && !this.state.inCar) {
        // Keep the barrel beside the shoulder, visible from behind.
        rifle.position.set(.58, 1.50, .16);
        this.player.model.body.updateWorldMatrix(true, true);
        const localDirection = this.player.model.body.worldToLocal(this.aimPoint.clone()).sub(rifle.position).normalize();
        rifle.quaternion.setFromUnitVectors(up, localDirection);
        this.player.model.arms[0].rotation.x = -1.26;
        this.player.model.arms[1].rotation.x = -1.40;
      } else {
        // Utanpå varselvästens ryggstycke (yttre yta z ≈ −0.35), inte inuti det.
        rifle.position.set(0.18, 0.73, -0.40); rifle.rotation.set(0, 0, -0.37);
      }
    }
  }

  /** Trätrappan går mellan botten- och övervåningen, loftstegen mellan Bills rum och loftet. */
  private beginStairTravel(kind: 'stairs' | 'ladder') {
    this.cancelHunting();
    const direction = (kind === 'stairs' ? this.state.homeFloor === 0 : this.state.homeFloor === 1) ? 'up' : 'down';
    this.stairTravel = { direction, kind, elapsed: 0, start: this.playerPosition.clone() };
    this.state.onStairs = true; this.state.onLadder = kind === 'ladder'; this.state.fridgeOpen = false;
    this.input.clear(); this.stopCameraDrag(); this.punchTimer = 0; this.huntingTimer = 0;
    this.cameraYaw = 0; this.cameraElevation = 0.87; this.cameraDistance = 14.8;
    this.audio.play('step'); this.emit();
  }

  private updateStairTravel(dt: number) {
    const travel = this.stairTravel!;
    travel.elapsed += dt;
    const ladder = travel.kind === 'ladder';
    const lower = ladder ? LADDER_BASE : STAIRS_BASE, upper = ladder ? LADDER_TOP : STAIRS_TOP;
    const from = travel.direction === 'up' ? lower : upper, to = travel.direction === 'up' ? upper : lower;
    const lowerFloor: HomeFloor = ladder ? 1 : 0, upperFloor: HomeFloor = ladder ? 2 : 1;
    const duration = ladder ? 2.2 : 2.85;
    if (travel.elapsed < 0.35) this.playerPosition.lerpVectors(travel.start, from, travel.elapsed / 0.35);
    else {
      const t = THREE.MathUtils.clamp((travel.elapsed - 0.35) / duration, 0, 1);
      this.playerPosition.lerpVectors(from, to, t);
      if (ladder) {
        // Pinne för pinne uppför stegen: åtta steg på 2,3 meter.
        const climbed = travel.direction === 'up' ? t : 1 - t;
        this.playerPosition.y = HOME.upperY + Math.ceil(climbed * 8) / 8 * (HOME.loftY - HOME.upperY);
      } else {
        const heightFraction = THREE.MathUtils.clamp((HOME.center.z + 3.06 - this.playerPosition.z) / 3.84, 0, 1);
        this.playerPosition.y = HOME.groundY + Math.ceil(heightFraction * 14) / 14 * (HOME.upperY - HOME.groundY);
      }
      if (travel.direction === 'down' && t > 0.12) this.state.homeFloor = lowerFloor;
      if (travel.direction === 'up' && t > 0.9) this.state.homeFloor = upperFloor;
      if (t === 1) {
        this.playerPosition.copy(to);
        this.state.homeFloor = travel.direction === 'up' ? upperFloor : lowerFloor;
        this.state.onStairs = false; this.state.onLadder = false; this.stairTravel = null; this.input.clear(); this.stopCameraDrag();
        this.cameraElevation = this.state.homeFloor === 0 ? 0.90 : 0.86;
        this.cameraDistance = this.state.homeFloor === 2 ? 13.6 : this.state.homeFloor === 1 ? 14.5 : 13.8;
        this.updateHome(); this.emit();
      }
    }
    // Trappan går rakt in i huset (−z); stegen lutar mot loftet åt +x och klättras med ansiktet mot pinnarna.
    this.player.model.root.rotation.y = ladder ? Math.PI / 2 : travel.direction === 'up' ? Math.PI : 0;
    animateCharacter(this.player.model, this.elapsed, 2.8, 0, 0, dt);
    above(this.playerPosition, 0.035, this.ring.position);
    if (this.activeTime - this.lastStep > 0.24) { this.audio.play('step'); this.lastStep = this.activeTime; }
  }

  private toggleBreadMachine() {
    this.state.breadMachineOn = !this.state.breadMachineOn;
    this.world.home.loft.setRunning(this.state.breadMachineOn);
    this.audio.play('click');
    const bill = this.avatars.bill, leffe = this.avatars.leffe;
    if (!this.state.breadMachineOn) {
      this.say(bill, 'Oj. Den skulle bara gå över natten…');
      this.say(leffe, 'Bill. Det var i julas.');
      this.callbacks.onToast({ title: 'Bakmaskinen är avstängd', detail: 'Den har gått sedan förra julen. Limpan är numera en tegelsten och loftet luktar bränt bröd i ett år till.', kind: 'success' });
    } else {
      this.say(bill, 'Bara en limpa till. Jag lovar.');
      this.callbacks.onToast({ title: 'Bakmaskinen är igång igen', detail: 'Den röda lampan blinkar och det ryker. Leffe suckar.', kind: 'info' });
    }
    this.save(); this.emit();
  }

  private updateHome() {
    const inside = !this.state.inCar && isInsideHome(this.playerPosition);
    if (inside !== this.state.insideHome) {
      if (inside) {
        this.homeCamera = { elevation: this.cameraElevation, distance: this.cameraDistance };
        this.cameraYaw = 0; this.cameraElevation = 0.90; this.cameraDistance = 13.8;
      } else if (this.homeCamera) {
        this.cameraElevation = this.homeCamera.elevation; this.cameraDistance = this.homeCamera.distance;
        this.homeCamera = null;
      }
    }
    this.state.insideHome = inside;
    if (!inside) {
      this.state.fridgeOpen = false; this.state.homeFloor = 0; this.state.onStairs = false; this.state.onLadder = false;
      this.stairTravel = null; this.state.computerOn = false; this.world.home.upstairs.computer.setPowered(false);
    }
    this.world.home.shell.visible = !inside;
    this.world.home.interior.visible = inside;
    this.world.home.staircase.visible = inside;
    // Övervåningen syns även från loftet (loftet är ett halvplan ovanför Bills rum), loftet bara uppifrån.
    this.world.home.upstairs.root.visible = inside && this.state.homeFloor >= 1;
    this.world.home.loft.root.visible = inside && this.state.homeFloor === 2;
  }

  private updateShop(dt: number) {
    this.updateHome();
    if (!this.state.onStairs) this.playerPosition.y = this.walkableHeight(this.playerPosition.x, this.playerPosition.z, this.state.homeFloor);
    const inside = !this.state.inCar && isInsideShop(this.playerPosition);
    if (inside !== this.state.insideShop) {
      if (inside) {
        this.shopCamera = { elevation: this.cameraElevation, distance: this.cameraDistance }; // tillåten allokering: bara när man kliver in i butiken
        this.cameraYaw = 0; this.cameraElevation = 0.91; this.cameraDistance = 14.8;
      } else if (this.shopCamera) {
        this.cameraElevation = this.shopCamera.elevation; this.cameraDistance = this.shopCamera.distance;
        this.shopCamera = null;
      }
      this.state.insideShop = inside;
      this.world.shop.structure.visible = !inside;
    }
    this.updateEquipment();
    if (this.state.carryingMeat && distance(this.playerPosition, SHOP.center) > SHOP_CLERK_FORGET_DISTANCE) this.shopkeeper.angry = 0;
    const noticed = this.state.carryingMeat && clerkNotices(this.shopkeeper.angry, this.shopkeeper.stunned, inside, distance(this.playerPosition, this.shopkeeper.model.root.position));
    if (shopRiskStep(this.state, dt, noticed, inside, this.activeTime > this.shopGraceUntil) === 'caught') this.caughtInShop();
  }

  private caughtInShop() {
    if (!caughtInShop(this.state)) return;
    this.world.shop.loot.visible = true; this.updateEquipment();
    this.player.model.root.position.set(SHOP.door.x, 0, SHOP.door.z + 2.7);
    this.companion.model.root.position.set(SHOP.door.x + 2.7, 0, SHOP.door.z + 3.0);
    this.shopkeeper.model.root.position.copy(this.shopkeeper.home); this.shopkeeper.angry = 0; this.shopkeeper.cooldown = 2;
    this.input.clear(); this.stopCameraDrag(); this.updateShop(0);
    this.say(this.shopkeeper, 'Köttet stannar här. Ut med er!');
    this.audio.play('warning');
    this.callbacks.onToast({ title: 'Marta tog er på bar gärning!', detail: 'Köttet är tillbaka i disken. −20 kr för besväret. Ni kan gå in och försöka igen.', kind: 'warning' });
    this.save(); this.emit();
  }

  /** Uppdragsövergångar räknas ut i rules.ts; här kopplas de till toasts, repliker och rekvisita. */
  private updateProgress() {
    // Belöningar annonseras bara när de betalas ut just nu; två uppslag i stället för en kopia av mängden.
    const shopClaimed = this.rewardClaimed.has('shop'), rurikClaimed = this.rewardClaimed.has('rurik');
    const ctx = this.progressContext;
    ctx.player = this.playerPosition; ctx.toolboxTaken = this.toolboxTaken;
    const events = advanceProgress(this.state, ctx);
    for (const event of events) {
      switch (event) {
        case 'shop-discovered':
          this.callbacks.onToast({ title: 'Myrboden', detail: 'Parkera bilen och gå fram till entrén. E öppnar butiksäventyret.', kind: 'info' });
          this.save(); break;
        case 'meat-delivered':
          this.shopkeeper.angry = 0;
          this.updateEquipment(); this.world.shop.loot.visible = false;
          if (!shopClaimed) this.announceReward('shop');
          this.say(this.player, 'Det blir visst middag ändå!'); break;
        case 'hunt-arrived':
          this.callbacks.onToast({ title: 'Framme vid jaktmarken', detail: 'Q eller Sikta tar fram geväret. Placera siktet på älgen och klicka, tryck mellanslag eller Skjut. Du kan missa!', kind: 'success' });
          this.save(); break;
        case 'rurik-discovered':
          this.callbacks.onToast({ title: 'Välkommen till Rurik', detail: 'Prata med E, bråka med F. Verktygslådan står på bordet.', kind: 'info' });
          this.save(); break;
        case 'rurik-escaped':
          this.rurik.angry = 0;
          if (!rurikClaimed) this.announceReward('rurik'); break;
        case 'waypoint-reached': break;
      }
    }
  }

  private updateBailiffs(dt: number) {
    if (this.bailiffArrival > 0) {
      this.bailiffArrival -= dt;
      const t = 1 - this.bailiffArrival / 4.5;
      this.officialCar.root.position.set(THREE.MathUtils.lerp(16, 10, t), 0, THREE.MathUtils.lerp(36, 8, t));
      if (this.bailiffArrival <= 0) {
        this.state.progress.bailiff = Math.max(1, this.state.progress.bailiff);
        for (let i = 0; i < this.bailiffs.length; i++) {
          const a = this.bailiffs[i];
          a.model.root.visible = true; a.model.root.position.set(11.9 + i * 1.3, 0, 7.0 - i * 2.5); a.health = 3; a.flee = false;
        }
        this.say(this.bailiffs[0], 'Enligt vår karta går stigen här!');
        this.callbacks.onToast({ title: 'Mätarlaget är på gården', detail: 'Gå nära mätarna och tryck F för att jaga bort dem.', kind: 'warning' });
      }
    }
    if (!this.state.bailiffsActive && this.state.progress.bailiff < 3) {
      this.state.bailiffETA = Math.max(0, 180 - this.activeTime);
      if (this.state.bailiffETA <= 0) this.summonBailiffs();
    }
    if (this.state.progress.bailiff === 3 && this.officialCar.root.visible) {
      this.officialCar.root.rotation.y = angleLerp(this.officialCar.root.rotation.y, 0.17, dt);
      this.officialCar.root.position.z += dt * 4;
      if (this.officialCar.root.position.z > 65) this.officialCar.root.visible = false;
    }
  }

  /**
   * Flyttar Skattemasarnas bil längs infarten till parametern u (0 = vägen,
   * 1 = gården). Hjulen snurrar med farten och framhjulen styr i svängarna,
   * så bilen kör som en bil i stället för att glida som en klump.
   */
  private moveSkatteCarAlongPath(u: number, dt: number, reverse = false) {
    scratchSkatteBefore.copy(this.skatteCar.root.position);
    this.skattePathU = u;
    sampleSkattePath(u, this.skatteCar.root.position);
    sampleSkattePath(u < 0.97 ? u + 0.03 : u - 0.03, scratchSkatteNext);
    const dirSign = u < 0.97 ? 1 : -1;
    const heading = Math.atan2(dirSign * (scratchSkatteNext.x - this.skatteCar.root.position.x), dirSign * (scratchSkatteNext.z - this.skatteCar.root.position.z));
    const turn = Math.atan2(Math.sin(heading - this.skatteCar.root.rotation.y), Math.cos(heading - this.skatteCar.root.rotation.y));
    this.skatteCar.root.rotation.y = angleLerp(this.skatteCar.root.rotation.y, heading, 1 - Math.exp(-dt * 3.2));
    for (const wheel of this.skatteCar.frontWheels) wheel.rotation.y = THREE.MathUtils.clamp(turn * 1.6, -0.38, 0.38);
    const spin = (reverse ? -1 : 1) * distance(scratchSkatteBefore, this.skatteCar.root.position) / 0.45;
    for (const wheel of this.skatteCar.wheels) for (const part of wheel.children) part.rotation.x += spin;
  }

  /**
   * Skattemasarnas besök — det korta klippet: bilen rullar in på gården 13
   * sekunder efter start, inspektörerna kliver ur medan kameran följer dem,
   * stämmer av era inkomster en stund och åker sedan vidare. Ingen peng
   * byter händ; bara tid, repliker och en kameraåkning.
   */
  private updateSkatte(dt: number) {
    const event = skatteVisitStep(this.skatteVisit, this.activeTime, dt);
    if (event === 'cutscene-start') {
      this.skatteCar.root.visible = true;
      this.skatteCarExit = -1;
      this.moveSkatteCarAlongPath(0, dt);
      this.skatteLine = 0;
      this.audio.play('warning');
      this.callbacks.onToast({ title: 'Oväntat besök!', detail: 'Skattemasarna kommer för att stämma av era inkomster.', kind: 'warning' });
      // Klippet klipper direkt till bilen; med nedtonade rörelser stannar kameran hos spelaren.
      if (!this.reducedMotion) { this.cutsceneFocus = this.skatteFocus; this.cutsceneSnap = true; }
    } else if (event === 'arrived') {
      this.cutsceneFocus = null;
    } else if (event === 'leave') {
      this.say(this.skatte[0], 'Tack för att vi störde. Vi återkommer vid nästa deklaration.');
      for (const a of this.skatte) if (!a.flee) a.goalOverride = SKATTE_CAR_DOOR;
    } else if (event === 'done') {
      this.cutsceneFocus = null;
      this.skatteCarExit = this.skattePathU;
      for (const a of this.skatte) { a.model.root.visible = false; a.goalOverride = null; }
    }
    const phase = this.skatteVisit.phase;
    if (phase === 'cutscene') {
      const raw = Math.min(1, this.skatteVisit.timer / SKATTE_CUTSCENE_SECONDS);
      // Mjuk start och inbromsning: bilen rullar fram som en bil.
      this.moveSkatteCarAlongPath(raw * raw * (3 - 2 * raw), dt);
      if (this.skatteVisit.timer > SKATTE_CUTSCENE_SECONDS - 1.7 && !this.skatte[0].model.root.visible) {
        for (let i = 0; i < this.skatte.length; i++) {
          const a = this.skatte[i];
          a.model.root.visible = true;
          a.model.root.position.set(SKATTE_CAR_DOOR.x + 1.1 + i * 1.15, 0, SKATTE_CAR_DOOR.z - 1.2 - i * 2.3);
          a.health = 3; a.flee = false; a.stunned = 0;
        }
        this.say(this.skatte[1], 'God dag! Vi är från Skattemasarna.');
      }
      // Kameran glider från bilen till inspektörerna när de kliver ur.
      if (this.skatte[0].model.root.visible) {
        this.skatteFocus.set((this.skatte[0].model.root.position.x + this.skatte[1].model.root.position.x) / 2, 1.7,
          (this.skatte[0].model.root.position.z + this.skatte[1].model.root.position.z) / 2);
      } else {
        this.skatteFocus.set(this.skatteCar.root.position.x, 1.5, this.skatteCar.root.position.z);
      }
    } else if (phase === 'visit') {
      const timer = this.skatteVisit.timer;
      if (this.skatteLine === 0 && timer > 4.2) { this.skatteLine = 1; this.say(this.skatte[1], 'Vi har några frågor om era inkomster.'); }
      else if (this.skatteLine === 1 && timer > 9.2) { this.skatteLine = 2; this.say(this.skatte[0], 'Allt ni tjänar ska med i deklarationen. Även köttet.'); }
    } else if (phase === 'leave') {
      for (const a of this.skatte) {
        if (a.flee || !a.goalOverride) continue;
        if (distance(a.model.root.position, a.goalOverride) < 1.5) { a.model.root.visible = false; a.goalOverride = null; }
      }
    }
    // Sedan backar bilen ut längs infarten och försvinner ner på vägen.
    if (this.skatteCarExit >= 0) {
      this.skatteCarExit = Math.max(0, this.skatteCarExit - dt * 0.16);
      this.moveSkatteCarAlongPath(this.skatteCarExit, dt, true);
      if (this.skatteCarExit === 0) { this.skatteCar.root.visible = false; this.skatteCarExit = -1; }
    }
  }

  private updateEnvironment(dt: number) {
    const water = this.world.water.material as THREE.MeshStandardMaterial;
    if (water.bumpMap) water.bumpMap.offset.set(this.elapsed * .005, this.elapsed * .003);
    const fridge = this.world.home.fridge;
    fridge.door.rotation.y = THREE.MathUtils.lerp(fridge.door.rotation.y, this.state.fridgeOpen ? -1.94 : 0, 1 - Math.exp(-dt * 7.5));
    fridge.contents.visible = Math.abs(fridge.door.rotation.y) > 0.16;
    // Vanliga loopar i stället för forEach med pilfunktioner: inga nya closures per bildruta.
    const { smoke, clouds, birds } = this.world;
    for (let i = 0; i < smoke.length; i++) {
      const p = smoke[i];
      const phase = (this.elapsed * 0.3 + i * 0.7) % 5.6;
      p.position.set(-12.6 + phase * 0.45, 8.7 + phase * 1.04, -6.8 + Math.sin(phase) * 0.15);
      p.scale.setScalar(0.5 + phase * 0.20);
      (p.material as THREE.MeshStandardMaterial).opacity = (1 - phase / 5.6) * 0.20;
    }
    const loft = this.world.home.loft;
    if (loft.root.visible && this.state.breadMachineOn) {
      // Bakmaskinen på loftet: lampan blinkar och det stiger tunn rök ur locket.
      loft.led.emissiveIntensity = 0.5 + 0.9 * (Math.sin(this.elapsed * 6) > 0 ? 1 : 0);
      for (let i = 0; i < loft.smoke.length; i++) {
        const puff = loft.smoke[i];
        const phase = (this.elapsed * 0.45 + i * 0.5) % 2.4;
        puff.position.set(loft.smokeOrigin.x + Math.sin(phase * 2.1 + i) * 0.06, loft.smokeOrigin.y + phase * 0.42, loft.smokeOrigin.z + Math.cos(phase * 1.7) * 0.05);
        puff.scale.setScalar(0.6 + phase * 0.55);
        (puff.material as THREE.MeshStandardMaterial).opacity = (1 - phase / 2.4) * 0.28;
      }
    }
    for (let i = 0; i < clouds.length; i++) { const c = clouds[i]; c.position.x += dt * (0.09 + i * 0.005); if (c.position.x > 145) c.position.x = -145; }
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      b.position.x = Math.sin(this.elapsed * 0.027 + i * 0.11) * 35;
      b.position.z = -33 + Math.cos(this.elapsed * 0.027 + i * 0.11) * 18;
      b.rotation.y = this.elapsed * 0.027 + i * 0.11 + Math.PI / 2;
      const flap = Math.sin(this.elapsed * 5.5 + i) * 0.46;
      for (let j = 0; j < b.children.length; j++) b.children[j].rotation.z = flap * (j === 0 ? -1 : 1);
    }
    for (const e of this.world.elk) {
      if (!e.alive) {
        if (this.activeTime > e.respawnAt) { e.alive = true; e.model.root.visible = true; }
        continue;
      }
      const a = this.elapsed * 0.032 + e.phase;
      e.model.root.position.x = e.origin.x + Math.sin(a) * 2.1;
      e.model.root.position.z = e.origin.z + Math.cos(a) * 1.8;
      e.model.root.rotation.y = Math.atan2(Math.cos(a), -Math.sin(a));
      for (let i = 0; i < e.model.legs.length; i++) e.model.legs[i].rotation.x = Math.sin(this.elapsed * 1.8 + i * 2.0) * 0.085;
    }
    if (this.state.sound && this.elapsed - this.lastBird > 5.5) { this.audio.play('bird'); this.lastBird = this.elapsed + Math.random() * 3; }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.object); p.object.geometry.dispose(); (p.object.material as THREE.Material).dispose(); this.particles.splice(i, 1); continue; }
      p.velocity.y -= dt * 5;
      p.object.position.addScaledVector(p.velocity, dt);
      p.object.rotation.x += dt * 3; p.object.rotation.y += dt * 4;
      p.object.scale.setScalar(p.life / p.total);
    }
    // Plocka bort utgångna repliker på plats; en ny lista varje bildruta vore onödigt skräp.
    for (let i = this.speech.length - 1; i >= 0; i--) if (this.speech[i].until <= this.elapsed) this.speech.splice(i, 1);
  }

  private burst(position: THREE.Vector3, color: string, count: number) {
    if (this.reducedMotion) count = Math.min(count, 2);
    for (let i = 0; i < count; i++) {
      const p = mesh(new THREE.IcosahedronGeometry(0.07 + Math.random() * 0.13, 0), new THREE.MeshBasicMaterial({ color }), false);
      p.position.copy(position);
      this.scene.add(p);
      const life = 0.45 + Math.random() * 0.4;
      this.particles.push({ object: p, velocity: new THREE.Vector3((Math.random() - 0.5) * 4.5, 1 + Math.random() * 2.8, (Math.random() - 0.5) * 4.5), life, total: life });
    }
  }

  private say(actor: Actor, text: string) {
    this.speech = this.speech.filter(s => s.actor !== actor);
    this.speech.push({ id: `speech-${actor.id}`, actor, text, position: actor.model.root.position.clone(), until: this.elapsed + 3.8 });
  }

  private updateCamera(dt: number) {
    // The body may lean in a turn, but its contact shadow stays flat on the road.
    this.car.shadow.rotation.z = -this.car.root.rotation.z;
    this.officialCar.shadow.rotation.z = -this.officialCar.root.rotation.z;
    const desiredTarget = this.cutsceneFocus ?? (this.state.started ? above(this.playerPosition, this.state.inCar ? 1.25 : 1.3, scratchTarget) : INTRO_TARGET);
    // Med nedtonade rörelser följer kameran stramare och zoomar utan långa svep.
    // Klippets första bildruta klipper direkt till bilen i stället för att glida dit.
    const ease = this.reducedMotion ? 4 : 1;
    const snap = this.cutsceneSnap;
    this.cutsceneSnap = false;
    if (snap) this.cameraTarget.copy(desiredTarget);
    else this.cameraTarget.lerp(desiredTarget, 1 - Math.exp(-dt * ease * (this.state.started ? 5 : 1)));
    if (this.state.inCar && !this.dragging && !this.cutsceneFocus && Math.abs(this.carVelocity) > 1.8) {
      this.cameraYaw = angleLerp(this.cameraYaw, this.car.root.rotation.y + Math.PI, 1 - Math.exp(-dt * 1.45));
    }
    if (this.cutsceneFocus && !this.dragging) {
      this.cameraYaw = angleLerp(this.cameraYaw, SKATTE_CAMERA_YAW, 1 - Math.exp(-dt * 0.9));
    }
    const dist = this.cutsceneFocus ? 15 : (this.state.started ? (this.state.aiming ? this.aimingDistance() : this.cameraDistance + (this.state.inCar ? 4 : 0)) : 44);
    const elevation = this.cutsceneFocus ? 0.31 : (this.state.started ? this.cameraElevation : this.cameraElevation - 0.06);
    const offset = scratchOffset.set(Math.sin(this.cameraYaw) * Math.cos(elevation) * dist, Math.sin(elevation) * dist, Math.cos(this.cameraYaw) * Math.cos(elevation) * dist);
    positionFollowCamera(this.camera.position, this.cameraTarget, this.cameraOffset, offset, snap ? 2 : dt * ease);
    this.camera.position.y = Math.max(this.camera.position.y, groundHeight(this.camera.position.x, this.camera.position.z) + 2.4);
    this.camera.lookAt(this.cameraTarget);
    if (this.highQuality) {
      // Tighter, texel-snapped sunlight follows the play area for cleaner shadows.
      const size = 80 / 2048;
      const x = Math.round(this.cameraTarget.x / size) * size, z = Math.round(this.cameraTarget.z / size) * size;
      this.shadowLight.target.position.set(x, 0, z);
      this.shadowLight.position.set(x - 35, 58, z + 45);
      this.shadowLight.target.updateMatrixWorld();
    }
    const visibleFocus = above(this.playerPosition, this.state.inCar ? 1.1 : 1.5, scratchFocus);
    this.world.updateAimingFoliage(this.camera.position, visibleFocus, this.state.aiming ? this.aimPoint : visibleFocus);
  }

  /** Ett simuleringssteg. Anropas en eller flera gånger per bildruta. */
  private simulate(dt: number) {
    this.elapsed += dt;
    this.updateEnvironment(dt);
    if (this.state.started) {
      this.activeTime += dt;
      this.updatePlayer(dt);
      this.updateShop(dt);
      this.updateActor(this.shopkeeper, dt);
      this.updateActor(this.companion, dt);
      this.updateActor(this.rurik, dt);
      for (const bailiff of this.bailiffs) this.updateActor(bailiff, dt);
      this.updateBailiffs(dt);
      this.updateSkatte(dt);
      for (const inspector of this.skatte) this.updateActor(inspector, dt);
      this.hunting.update(dt);
      this.updateProgress();
    } else {
      animateCharacter(this.player.model, this.elapsed, 0, 0, 0, dt);
      animateCharacter(this.companion.model, this.elapsed + 1, 0, 0, 0, dt);
      animateCharacter(this.rurik.model, this.elapsed, 0, 0, 0, dt);
      animateCharacter(this.shopkeeper.model, this.elapsed, 0, 0, 0, dt);
      above(this.playerPosition, 0.04, this.ring.position);
    }
    this.updateCamera(dt);
  }

  private tick = (time: number) => {
    if (this.disposed) return;
    // Speltiden följer klockan även när bildrutorna är långsamma (svag telefon,
    // programvarurenderad testkörning): en lång bildruta delas i steg om högst
    // SIMULATION_STEP så att kollisioner och timers räknar lika oavsett bildfrekvens.
    // Över MAX_FRAME_TIME (t.ex. efter flikbyte) saktar spelet hellre ner än hoppar.
    let remaining = Math.min((time - (this.previousTime || time)) / 1000, MAX_FRAME_TIME);
    this.previousTime = time;
    if (!this.paused) {
      do {
        const dt = Math.min(remaining, SIMULATION_STEP);
        remaining -= dt;
        this.simulate(dt);
      } while (remaining > 0);
    }
    if (!this.paused || this.needsRender) {
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
    }
    if (!this.paused && time - this.lastEmit > 110) { this.emit(); this.lastEmit = time; }
    if (this.state.started && !this.paused && time - this.lastSave > 8000) { this.save(); this.lastSave = time; }
    this.frame = requestAnimationFrame(this.tick);
  };

  private project(position: THREE.Vector3) {
    const projected = scratchProject.copy(position).project(this.camera);
    return { x: (projected.x * 0.5 + 0.5) * this.element.clientWidth, y: (-projected.y * 0.5 + 0.5) * this.element.clientHeight, visible: projected.z > 0 && projected.z < 1 && Math.abs(projected.x) < 0.96 && Math.abs(projected.y) < 0.95 };
  }

  private getLabels(): WorldLabel[] {
    const labels: WorldLabel[] = [];
    const add = (id: string, text: string, pos: THREE.Vector3, kind: WorldLabel['kind']) => {
      const p = this.project(pos);
      if (p.visible) labels.push({ id, text, x: p.x, y: p.y, kind });
    };
    const speaking = new Set(this.speech.map(s => s.actor?.id));
    if (!this.state.inCar) {
      for (const avatar of [this.avatars.leffe, this.avatars.bill]) {
        if (!speaking.has(avatar.id) && avatar.model.root.visible) add(avatar.id, avatar.id === 'leffe' ? 'Leffe' : 'Bill', above(avatar.model.root.position, 3.45), 'name');
      }
    }
    if (this.state.insideHome && this.state.homeFloor === 2) {
      add('ladder-down', 'Stegen ner · E', new THREE.Vector3(HOME.ladderTop.x, HOME.loftY + 1.35, HOME.ladderTop.z + 0.1), 'target');
      add('bread-machine', this.state.breadMachineOn ? 'Bills bakmaskin · igång sedan i julas' : 'Bills bakmaskin · avstängd', new THREE.Vector3(HOME.breadMachine.x, HOME.loftY + 1.95, HOME.breadMachine.z), 'target');
      return labels;
    }
    if (this.state.insideHome && this.state.homeFloor === 1) {
      add('stairs-down', 'Trappan ner · E', new THREE.Vector3(HOME.stairsTop.x, HOME.upperY + 1.20, HOME.stairsTop.z + 0.15), 'target');
      add('bill-computer', this.state.computerOn ? 'Bills dator · på' : 'Bills gamla dator · E', new THREE.Vector3(HOME.computer.x, HOME.upperY + 2.52, HOME.computer.z), 'target');
      add('loft-ladder', 'Loftstegen · E', new THREE.Vector3(HOME.ladderBase.x, HOME.upperY + 2.30, HOME.ladderBase.z), 'target');
      return labels;
    }
    if (distance(this.playerPosition, this.car.root.position) < 22 && !this.state.inCar) add('sedan', 'Blå faran · sedan', above(this.car.root.position, 2.70), 'car');
    if (this.state.started && Math.hypot(this.playerPosition.x - HOME.center.x, this.playerPosition.z - HOME.center.z) < 28) {
      if (!this.state.insideHome) add('home-door', this.state.hasRifle ? 'Vännernas stuga' : 'Huset · hämta geväret', new THREE.Vector3(HOME.door.x, 4.5, -1.0), 'target');
      if (this.state.insideHome && !this.state.hasRifle) add('rifle', 'Jaktgeväret', new THREE.Vector3(HOME.rifle.x, 2.94, HOME.rifle.z), 'target');
      if (this.state.insideHome && Math.hypot(this.playerPosition.x - HOME.fridge.x, this.playerPosition.z - HOME.fridge.z) < 6.2) add('fridge', this.state.fridgeOpen ? 'örtkräm · halv gurka' : 'Gamla kylen · E', new THREE.Vector3(HOME.fridge.x, 2.98, HOME.fridge.z + 0.3), 'target');
      if (this.state.insideHome) add('stairs-up', 'Trätrappan · E', new THREE.Vector3(HOME.stairsBase.x, 2.80, HOME.stairsBase.z), 'target');
      if (this.state.insideHome) add('home-exit', 'Ut på gården', new THREE.Vector3(HOME.entry.x, 0.85, HOME.entry.z + 0.50), 'target');
    }
    if (this.state.started && Math.hypot(this.playerPosition.x - SHOP.center.x, this.playerPosition.z - SHOP.center.z) < 28) {
      if (!this.state.insideShop) add('market', 'Myrboden', new THREE.Vector3(SHOP.door.x, 4.6, SHOP.door.z - 1), 'target');
      if (this.state.insideShop && !this.state.carryingMeat && this.state.progress.shop < 3) add('meat', 'Köttdisken', new THREE.Vector3(SHOP.meat.x, 2.3, SHOP.meat.z), 'target');
      if (this.state.insideShop) add('shop-exit', 'Utgång', new THREE.Vector3(SHOP.entry.x, 0.65, SHOP.entry.z + 0.7), 'target');
      if (!speaking.has('shopkeeper')) add('shopkeeper', this.shopkeeper.angry > 0 ? 'Marta · förbannad' : 'Marta · handlaren', above(this.shopkeeper.model.root.position, 3.25), 'name');
    }
    if (this.state.started && distance(this.playerPosition, this.rurik.model.root.position) < 18 && !speaking.has('rurik')) add('rurik', this.rurik.angry > 0 ? 'Rurik · förbannad' : 'Rurik', above(this.rurik.model.root.position, 3.25), 'name');
    if (this.state.started && !this.toolboxTaken && distance(this.playerPosition, this.world.toolbox.position) < 18) add('toolbox', 'Ruriks verktygslåda', above(this.world.toolbox.position, 1.4), 'target');
    if (this.state.started) for (const elk of this.world.elk) {
      if (elk.alive && distance(this.playerPosition, elk.model.root.position) < 25) add(`elk-${elk.phase}`, 'Skogens konung', above(elk.model.root.position, 4.8), 'target');
    }
    for (const b of this.bailiffs) if (b.model.root.visible && !speaking.has(b.id) && distance(this.playerPosition, b.model.root.position) < 25) add(b.id, b.flee ? 'På väg härifrån' : 'Mätarlaget', above(b.model.root.position, 3.3), 'target');
    for (const s of this.skatte) if (s.model.root.visible && !speaking.has(s.id) && distance(this.playerPosition, s.model.root.position) < 25) add(s.id, s.flee ? 'På väg härifrån' : 'Skattemasarna', above(s.model.root.position, 3.3), 'target');
    for (const s of this.speech) {
      add(s.id, s.text, above(s.actor ? s.actor.model.root.position : s.position, this.state.inCar && s.actor === this.player ? 3.3 : 3.7), 'speech');
    }
    return labels;
  }

  private context(): string | null {
    if (this.state.onStairs) return null;
    if (this.state.aiming) return 'Lägg ner geväret';
    if (this.state.inCar) return 'Kliv ur bilen';
    const p = this.playerPosition;
    const floor = this.state.homeFloor;
    if (floor === 2) {
      if (nearBreadMachine(p, floor)) return this.state.breadMachineOn ? 'Stäng av bakmaskinen' : 'Sätt på bakmaskinen igen';
      return nearLadder(p, floor) ? 'Klättra ner från loftet' : null;
    }
    if (floor === 1) {
      if (nearComputer(p, floor)) return this.state.computerOn ? 'Stäng av Bills dator' : 'Starta Bills dator';
      if (nearLadder(p, floor)) return 'Klättra upp på loftet';
      return nearStairs(p, floor) ? 'Gå nerför trätrappan' : null;
    }
    if (nearStairs(p, floor)) return 'Gå upp till Bills rum';
    if (!this.state.hasRifle && nearRifleRack(p)) return 'Ta jaktgeväret';
    if (nearFridge(p, floor)) return this.state.fridgeOpen ? 'Stäng kylskåpet' : 'Öppna kylskåpet';
    if (isInsideHome(p) && Math.hypot(p.x - HOME.entry.x, p.z - HOME.entry.z) < 2.65) return 'Gå ut ur huset';
    if (!isInsideHome(p) && Math.hypot(p.x - HOME.door.x, p.z - HOME.door.z) < 2.6) return 'Gå in i huset';
    if (isInsideShop(p) && !this.state.carryingMeat && this.state.progress.shop < 3 && Math.hypot(p.x - SHOP.meat.x, p.z - SHOP.meat.z) < 3.15) return 'Försök sno köttpaketet';
    if (isInsideShop(p) && Math.hypot(p.x - SHOP.entry.x, p.z - SHOP.entry.z) < 3.4) return 'Gå ut från Myrboden';
    if (!isInsideShop(p) && Math.hypot(p.x - SHOP.door.x, p.z - SHOP.door.z) < 3.5) return 'Gå in på Myrboden';
    if (!this.toolboxTaken && distance(p, this.world.toolbox.position) < 3.0) return 'Låna verktygslådan';
    if (this.world.elk.some(e => e.alive && distance(p, e.model.root.position) < 16)) return this.state.hasRifle ? 'Sikta med geväret' : 'Jaktgeväret saknas';
    if (distance(p, this.car.root.position) < 4.6) return 'Hoppa in i bilen';
    if (distance(p, this.rurik.model.root.position) < 3.7 && !this.rurik.stunned) return 'Prata med Rurik';
    if (Math.hypot(p.x - HOME.coffee.x, p.z - HOME.coffee.z) < 2.4) return 'Ta en kaffepaus';
    if (distance(p, this.companion.model.root.position) < 3.5) return `Snacka med ${this.state.character === 'leffe' ? 'Bill' : 'Leffe'}`;
    return null;
  }

  private location() {
    const p = this.playerPosition;
    if (this.state.onStairs) return 'Trätrappan · mellan våningarna';
    if (this.state.insideHome) return this.state.homeFloor === 2 ? 'Loftet · under taket' : this.state.homeFloor === 1 ? 'Bills rum · övervåningen' : 'Inne i vännernas stuga';
    if (Math.hypot(p.x - SHOP.center.x, p.z - SHOP.center.z) < 21) return this.state.insideShop ? 'Inne på Myrboden' : 'Myrboden';
    const near = (x: number, z: number, radius: number) => Math.hypot(p.x - x, p.z - z) < radius;
    if (p.z < -35 && near(48, -49, 22)) return 'Myrsjön';
    if (near(36, -24, 19)) return 'Reparationsboden';
    if (near(-27, -44, 21)) return 'Jaktmarken';
    if (near(48, -49, 22)) return 'Myrsjön';
    if (near(-5, 0, 29)) return 'Hemma på gården';
    return 'De djupa skogarna';
  }

  private emit() {
    if (!this.ready || this.disposed) return;
    const minutes = 14 * 60 + 32 + Math.floor(this.activeTime / 5);
    const p = this.playerPosition;
    this.state.time = `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    this.state.location = this.location();
    this.state.health = Math.max(0, Math.min(100, this.state.health));
    this.state.speed = Math.round(Math.abs(this.carVelocity) * 3.6);
    this.state.position = { x: p.x, y: p.y, z: p.z, heading: this.state.inCar ? this.car.root.rotation.y : this.player.model.root.rotation.y };
    this.state.carPosition = { x: this.car.root.position.x, z: this.car.root.position.z, heading: this.car.root.rotation.y };
    this.state.canAim = this.canUseRifle();
    this.state.aim = { x: (this.aimNDC.x + 1) / 2, y: (1 - this.aimNDC.y) / 2 };
    this.state.shotCooldown = this.huntingTimer;
    this.state.projectiles = this.hunting.snapshot;
    this.state.huntTargets = [];
    for (const e of this.world.elk) if (e.alive) this.state.huntTargets.push({ id: e.phase, ...this.project(above(e.model.root.position, 1.82)) });
    this.state.cameraYaw = this.cameraYaw;
    this.state.cameraDistance = this.camera.position.distanceTo(this.cameraTarget);
    this.state.walkSpeed = this.state.inCar ? 0 : this.player.speed;
    this.state.context = this.context();
    this.state.labels = this.getLabels();
    this.callbacks.onUpdate({ ...this.state, progress: { ...this.state.progress }, labels: [...this.state.labels] });
  }

  private save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(serializeSave(this.state, this.toolboxTaken)));
      this.state.saved = true;
    } catch { this.state.saved = false; }
  }

  private load() {
    let raw: string | null = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch { return; /* Blockerad lagring hindrar aldrig spelet. */ }
    const restored = restoreSave(raw, this.state);
    if (!restored) return;
    for (const id of restored.claimed) this.rewardClaimed.add(id);
    this.toolboxTaken = restored.toolboxTaken;
    this.world.home.rifle.visible = !this.state.hasRifle;
    this.world.home.loft.setRunning(this.state.breadMachineOn);
    this.world.shop.loot.visible = !this.state.carryingMeat && this.state.progress.shop < 3;
    this.world.toolbox.visible = !this.toolboxTaken;
    this.updateEquipment();
  }

  reset() {
    this.cancelHunting();
    try { localStorage.removeItem(SAVE_KEY); } catch { /* storage is optional */ }
    const { sound, music } = this.state;
    this.state = structuredClone(INITIAL_SNAPSHOT);
    this.state.ready = true; this.state.sound = sound; this.state.music = music;
    this.huntingTimer = 0; this.homeCamera = null; this.stairTravel = null;
    this.world.home.staircase.visible = false; this.world.home.upstairs.root.visible = false; this.world.home.loft.root.visible = false;
    this.world.home.upstairs.computer.setPowered(false); this.world.home.loft.setRunning(true);
    this.world.home.rifle.visible = true; this.world.home.shell.visible = true; this.world.home.interior.visible = false;
    this.world.home.fridge.door.rotation.y = 0; this.world.home.fridge.contents.visible = false;
    this.activeTime = 0; this.rewardClaimed.clear(); this.toolboxTaken = false;
    this.world.toolbox.visible = true; this.bailiffArrival = -1; this.bailiffFled = 0;
    this.bailiffs.forEach(a => { a.model.root.visible = false; a.flee = false; a.health = 3; a.stunned = 0; a.angry = 0; });
    this.officialCar.root.visible = false;
    this.skatteVisit = createSkatteVisit(); this.skatteLine = 0; this.cutsceneFocus = null; this.cutsceneSnap = false;
    this.skattePathU = 0; this.skatteCarExit = -1;
    this.skatte.forEach(a => { a.model.root.visible = false; a.flee = false; a.health = 3; a.stunned = 0; a.angry = 0; a.goalOverride = null; });
    this.skatteCar.root.visible = false; sampleSkattePath(0, this.skatteCar.root.position);
    this.shopkeeper.model.root.position.copy(this.shopkeeper.home); this.shopkeeper.angry = 0; this.shopkeeper.health = 3; this.shopkeeper.stunned = 0;
    this.world.shop.structure.visible = true; this.world.shop.loot.visible = true; this.shopGraceUntil = 0; this.shopCamera = null; this.updateEquipment();
    this.rurik.model.root.position.copy(this.rurik.home); this.rurik.health = 3; this.rurik.angry = 0; this.rurik.stunned = 0;
    this.avatars.leffe.model.root.position.set(6.1, 0, 9.2); this.avatars.bill.model.root.position.set(8.5, 0, 8.15);
    Object.values(this.avatars).forEach(a => { a.model.root.visible = true; a.health = 3; a.stunned = 0; a.angry = 0; });
    this.car.root.position.set(2.1, 0, 7); this.car.root.rotation.set(0, -0.3, 0); this.carVelocity = 0;
    this.world.elk.forEach(e => { e.alive = true; e.model.root.visible = true; });
    this.input.clear(); this.stopCameraDrag(); this.speech = []; this.cameraYaw = 0.61; this.cameraElevation = 0.57; this.cameraDistance = 15.8;
    this.audio.engine(0, false);
    this.callbacks.onToast({ title: 'En ny dag i Gråmyren', detail: 'Alla uppdrag och sparade framsteg är återställda.', kind: 'info' });
    this.emit();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    if (this.state.started) this.save();
    this.resizeObserver.disconnect();
    this.listenerCleanups.forEach(cleanup => cleanup());
    this.audio.dispose();
    this.hunting.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        geometries.add(obj.geometry);
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => materials.add(m));
      }
    });
    this.world.home.upstairs.computer.textures.forEach(texture => texture.dispose());
    geometries.forEach(g => g.dispose());
    materials.forEach(m => {
      for (const value of Object.values(m)) if (value instanceof THREE.Texture && value !== this.reflections?.texture) value.dispose();
      m.dispose();
    });
    this.reflections?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
