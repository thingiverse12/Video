import * as THREE from 'three';
import { animateCharacter, createCar, createCharacter, createShoppingBag, material, mesh, type CharacterModel, type CharacterKind, type CarModel } from './models';
import { createWorld, groundHeight, type World } from './world';
import { GameAudio } from './audio';
import { outdoorReflections, skyDome } from './look';
import { GameInput } from './input';
import { positionFollowCamera } from './camera';
import { createHuntingRifle } from './equipment';
import { HuntingProjectiles, RIFLE_MUZZLE, SHOT_INTERVAL, type ShotImpact } from './hunting';
import { DESTINATIONS, INITIAL_SNAPSHOT, MISSIONS, MISSION_IDS, SHOP, HOME, type PlayerId, type DestinationId, type GameCallbacks, type GameSnapshot, type MissionId, type WorldLabel } from './types';

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
}
interface Particle { object: THREE.Mesh; velocity: THREE.Vector3; life: number; total: number; }
interface Speech { id: string; text: string; position: THREE.Vector3; actor?: Actor; until: number; }
const SAVE_KEY = 'gramyren-adventure-v1';
const up = new THREE.Vector3(0, 1, 0);
const distance = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);
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
  private stairTravel: { direction: 'up' | 'down'; elapsed: number; start: THREE.Vector3 } | null = null;
  private homeCamera: { elevation: number; distance: number } | null = null;
  private shopGraceUntil = 0;
  private shopCamera: { elevation: number; distance: number } | null = null;
  private bailiffs: Actor[] = [];
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
    this.avatars = {
      nils: this.createActor('nils', 6.1, 9.2),
      ebbe: this.createActor('ebbe', 8.5, 8.15),
    };
    this.avatars.nils.model.root.rotation.y = 0.51;
    this.avatars.ebbe.model.root.rotation.y = 0.28;
    this.rurik = this.createActor('rurik', 35.4, -17.9);
    this.shopkeeper = this.createActor('shopkeeper', SHOP.clerk.x, SHOP.clerk.z);
    this.shopkeeper.model.root.rotation.y = -0.70;
    this.bags = { nils: createShoppingBag(), ebbe: createShoppingBag() };
    this.avatars.nils.model.arms[0].add(this.bags.nils);
    this.avatars.ebbe.model.arms[0].add(this.bags.ebbe);
    this.rifles = { nils: createHuntingRifle(), ebbe: createHuntingRifle() };
    for (const avatar of ['nils', 'ebbe'] as PlayerId[]) {
      this.avatars[avatar].model.body.add(this.rifles[avatar]);
      this.rifles[avatar].visible = false;
    }
    this.bailiffs = [this.createActor('bailiff', 12, 12, 'matare-1'), this.createActor('bailiff', 14, 10, 'matare-2')];
    this.bailiffs.forEach(a => a.model.root.visible = false);
    this.hunting = new HuntingProjectiles(this.world,
      () => [this.companion, this.rurik, this.shopkeeper, ...this.bailiffs].map(actor => ({ root: actor.model.root })),
      () => [this.car.root, this.officialCar.root], impact => this.onShotImpact(impact));
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
    return { id, model, health: 3, home: new THREE.Vector3(x, 0, z), angry: 0, stunned: 0, flee: false, cooldown: 0, punch: 0, speed: 0 };
  }

  private get player() { return this.avatars[this.state.character]; }
  private get companion() { return this.avatars[this.state.character === 'nils' ? 'ebbe' : 'nils']; }
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
      : 'WASD går. E vid kombin hoppar in. Myrboden finns på kartan (M).';
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

  private canUseRifle() {
    return this.state.started && this.state.hasRifle && !this.state.inCar && !this.state.onStairs
      && !this.isInsideHome(this.playerPosition) && !this.isInsideShop(this.playerPosition) && !this.state.carryingMeat;
  }

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
    this.aimPoint.copy(hit ? hit.point : ray.origin.clone().addScaledVector(ray.direction, 160));
    const p = this.playerPosition;
    if (Math.hypot(this.aimPoint.x - p.x, this.aimPoint.z - p.z) > .05) this.player.model.root.rotation.y = Math.atan2(this.aimPoint.x - p.x, this.aimPoint.z - p.z);
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
    if (impact.kind === 'elk' && impact.elk?.alive) {
      const elk = impact.elk;
      elk.alive = false; elk.model.root.visible = false; elk.respawnAt = this.activeTime + 80;
      this.burst(impact.point, '#dfce99', 24);
      this.state.shotsHit++; this.state.shotFeedback = 'hit';
      this.state.money += 50; this.state.wanted = Math.max(1, this.state.wanted);
      this.complete('hunt');
      this.save();
      this.callbacks.onToast({ title: 'Träff! Jaktlycka! +50 kr', detail: 'Kulan träffade älgen. Bara tecknad, blodfri jakt.', kind: 'success' });
    } else {
      this.state.shotFeedback = impact.kind === 'obstacle' ? 'blocked' : impact.kind === 'person' ? 'person' : 'miss';
      if (impact.kind !== 'miss' && impact.kind !== 'person') this.burst(impact.point, '#cbbd92', 5);
    }
    this.shotFeedbackTime = 1.6;
    this.emit();
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
    this.state.character = this.state.character === 'nils' ? 'ebbe' : 'nils';
    this.player.stunned = 0; this.player.health = 3;
    if ((this.state.carryingMeat || this.state.insideHome) && !this.state.inCar) {
      this.player.model.root.position.copy(previousPosition);
      this.companion.model.root.position.copy(otherPosition);
    }
    this.updateEquipment();
    this.audio.play('click');
    this.say(this.player, this.state.character === 'ebbe' ? 'Det här blir ju skitbra!' : 'Låt mig sköta det här.');
    this.emit(); this.save();
  }

  trackMission(id: MissionId) {
    this.state.activeMission = id;
    this.state.waypoint = (id === 'shop' && this.state.carryingMeat) || (id === 'hunt' && !this.state.hasRifle) ? 'home' : MISSIONS[id].destination;
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
    this.stairTravel = null; this.state.onStairs = false; this.state.homeFloor = 0;
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
    if (this.state.homeFloor === 1) {
      if (this.nearComputer(p)) {
        this.state.computerOn = !this.state.computerOn;
        this.world.home.upstairs.computer.setPowered(this.state.computerOn);
        this.audio.play('click'); this.emit(); return;
      }
      if (this.nearStairs(p)) { this.beginStairTravel(); return; }
      this.callbacks.onToast({ title: 'Ebbes rum', detail: 'Gå fram till datorn och tryck E, eller gå tillbaka till trätrappan för att komma ner.', kind: 'info' });
      return;
    }
    if (this.nearStairs(p)) { this.beginStairTravel(); return; }
    if (this.isInsideHome(p) && !this.state.hasRifle && Math.hypot(p.x - HOME.rifle.x, p.z - HOME.rifle.z) < 2.4) {
      this.state.hasRifle = true;
      this.world.home.rifle.visible = false;
      this.state.progress.hunt = Math.max(1, this.state.progress.hunt);
      this.state.activeMission = 'hunt'; this.state.waypoint = 'forest';
      this.updateEquipment(); this.audio.play('click');
      this.say(this.player, 'Så där! Nu har vi det viktigaste.');
      this.callbacks.onToast({ title: 'Jaktgeväret är med!', detail: 'Geväret delas av vännerna. Ta er till jaktmarken, välj Sikta, sikta på älgen och tryck Skjut. Kulan måste träffa.', kind: 'success' });
      this.save(); this.emit(); return;
    }
    if (this.nearFridge(p)) {
      this.state.fridgeOpen = !this.state.fridgeOpen;
      this.audio.play('click');
      this.emit(); return;
    }
    if (this.isInsideHome(p) && Math.hypot(p.x - HOME.entry.x, p.z - HOME.entry.z) < 2.65) {
      p.set(HOME.door.x, 0, HOME.door.z + 0.65);
      this.companion.model.root.position.set(HOME.door.x + 2.6, 0, HOME.door.z + 1.3);
      this.updateShop(0); this.emit(); return;
    }
    if (!this.isInsideHome(p) && Math.hypot(p.x - HOME.door.x, p.z - HOME.door.z) < 2.6) {
      p.set(HOME.entry.x, 0.565, HOME.entry.z);
      this.companion.model.root.position.set(HOME.door.x + 2.6, 0, HOME.door.z + 1.3);
      this.updateShop(0);
      if (!this.state.hasRifle) this.callbacks.onToast({ title: 'Hemma hos vännerna', detail: 'Jaktgeväret står i stället längst in till vänster. Gå nära och tryck E för att ta det.', kind: 'info' });
      this.emit(); return;
    }
    if (this.isInsideShop(p) && !this.state.carryingMeat && this.state.progress.shop < 3 && Math.hypot(p.x - SHOP.meat.x, p.z - SHOP.meat.z) < 3.15) {
      this.state.carryingMeat = true;
      this.state.progress.shop = 2;
      this.state.activeMission = 'shop';
      this.state.waypoint = 'home';
      this.state.shopRisk = 22;
      this.state.wanted = Math.max(2, this.state.wanted);
      this.shopGraceUntil = this.activeTime + 2.35;
      this.shopkeeper.angry = 45;
      this.world.shop.loot.visible = false;
      this.updateEquipment();
      this.say(this.shopkeeper, 'Hörrni! Det där är inte ett smakprov!');
      this.audio.play('warning');
      this.callbacks.onToast({ title: 'Köttet ligger i påsen!', detail: 'Marta kommer! Spring ut och ta dig hem till gården. Ingen snabbresa med köttpåsen.', kind: 'warning' });
      this.save(); this.emit(); return;
    }
    if (this.isInsideShop(p) && Math.hypot(p.x - SHOP.entry.x, p.z - SHOP.entry.z) < 3.4) {
      p.set(SHOP.door.x, 0, SHOP.door.z + 1.6);
      this.companion.model.root.position.set(SHOP.door.x + 2.7, 0, SHOP.door.z + 2.8);
      this.updateShop(0); this.emit(); return;
    }
    if (!this.isInsideShop(p) && Math.hypot(p.x - SHOP.door.x, p.z - SHOP.door.z) < 3.5) {
      p.set(SHOP.entry.x, 0, SHOP.entry.z);
      this.companion.model.root.position.set(SHOP.door.x + 2.7, 0, SHOP.door.z + 1.1);
      this.updateShop(0);
      this.say(this.shopkeeper, this.state.progress.shop === 3 ? 'Ni igen? Inget mer bus idag.' : 'Välkomna! Köttdisken är till vänster.');
      this.emit(); return;
    }
    if (!this.toolboxTaken && distance(p, this.world.toolbox.position) < 3.0) {
      this.toolboxTaken = true; this.world.toolbox.visible = false;
      this.state.progress.rurik = Math.max(this.state.progress.rurik, 2);
      this.state.wanted = Math.max(2, this.state.wanted);
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
      if (this.state.activeMission === 'hunt') this.state.waypoint = this.state.hasRifle ? 'forest' : 'home';
      else if (this.state.activeMission === 'shop') this.state.waypoint = this.state.carryingMeat ? 'home' : 'market';
      this.callbacks.onToast({ title: 'blå kombi · Blå faran', detail: this.state.activeMission === 'hunt' && !this.state.hasRifle ? 'Geväret ligger fortfarande i huset. Hämta det innan ni ger er ut på jakt.' : 'WASD kör · Mellanslag bromsar · H tutar · E kliver ur', kind: 'info' });
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
    if (distance(p, this.companion.model.root.position) < 3.5) { this.callbacks.onDialogue('ebbe'); return; }
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
    } else if (target === this.companion) this.say(target, target.id === 'ebbe' ? 'Aj! Vi är ju på samma lag!' : 'Men skärp dig, Ebbe!');
    else this.say(target, 'Det här står inte i blanketten!');
    if (target.health <= 0) {
      if (target.id.startsWith('matare')) {
        target.flee = true; this.bailiffFled++;
        this.state.progress.bailiff = Math.min(3, 1 + this.bailiffFled);
        this.say(target, 'Vi får rita om kartan!');
        if (this.bailiffFled >= 2) {
          this.state.bailiffsActive = false;
          this.complete('bailiff');
          this.callbacks.onToast({ title: 'Stigen tar en annan väg!', detail: 'Mätarlaget lämnade gården. +200 kr', kind: 'success' });
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

  private complete(id: MissionId) {
    this.state.progress[id] = 3;
    if (!this.rewardClaimed.has(id)) {
      this.state.money += MISSIONS[id].reward;
      this.rewardClaimed.add(id);
      this.audio.play('coin');
      if (id !== 'bailiff') this.callbacks.onToast({ title: `Uppdrag klart: ${MISSIONS[id].title}`, detail: `+${MISSIONS[id].reward} kr i fickan. Vad hittar ni på härnäst?`, kind: 'success' });
      this.save();
    }
  }

  private collides(position: THREE.Vector3, radius: number, includeCar: boolean, floor: 0 | 1 = 0) {
    if (Math.abs(position.x) > 89 || Math.abs(position.z) > 89) return true;
    if (floor === 1 && (Math.abs(position.x - HOME.center.x) > 5.44 - radius || Math.abs(position.z - HOME.center.z) > 3.94 - radius)) return true;
    // The kombi can park outside, but it cannot be driven through the shop doorway.
    if (radius > 1 && Math.abs(position.x - HOME.center.x) < 5.7 + radius && Math.abs(position.z - HOME.center.z) < 4.2 + radius) return true;
    if (radius > 1 && Math.abs(position.x - SHOP.center.x) < 7.4 + radius && position.z > SHOP.center.z - 5.5 - radius && position.z < SHOP.center.z + 5.3 + radius) return true;
    const colliders = floor === 1 ? this.world.home.upstairs.colliders : this.world.colliders;
    for (const collider of colliders) {
      if (collider.type === 'circle') {
        if ((position.x - collider.x) ** 2 + (position.z - collider.z) ** 2 < (radius + collider.radius) ** 2) return true;
      } else {
        if (Math.abs(position.x - collider.x) < collider.w * 0.5 + radius && Math.abs(position.z - collider.z) < collider.d * 0.5 + radius) return true;
      }
    }
    if (includeCar && floor === 0) {
      const local = position.clone().sub(this.car.root.position).applyAxisAngle(up, -this.car.root.rotation.y);
      if (Math.abs(local.x) < 1.04 + radius && Math.abs(local.z) < 2.48 + radius) return true;
    }
    return false;
  }

  private move(object: THREE.Object3D, delta: THREE.Vector3, radius: number, includeCar = false) {
    const beforeX = object.position.x, beforeZ = object.position.z;
    const floor = object === this.player.model.root ? this.state.homeFloor : 0;
    const candidate = object.position.clone();
    candidate.x += delta.x;
    if (!this.collides(candidate, radius, includeCar, floor)) object.position.x = candidate.x;
    candidate.copy(object.position); candidate.z += delta.z;
    if (!this.collides(candidate, radius, includeCar, floor)) object.position.z = candidate.z;
    object.position.y = this.walkableHeight(object.position.x, object.position.z, floor);
    return Math.hypot(object.position.x - beforeX, object.position.z - beforeZ);
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
      const delta = new THREE.Vector3(Math.sin(this.car.root.rotation.y), 0, Math.cos(this.car.root.rotation.y)).multiplyScalar(this.carVelocity * dt);
      const before = this.car.root.position.clone();
      this.move(this.car.root, delta, 1.20);
      if (delta.length() > 0.025 && before.distanceTo(this.car.root.position) < delta.length() * 0.3) {
        if (Math.abs(this.carVelocity) > 5) { this.audio.play('hit'); this.burst(this.car.root.position.clone().add(new THREE.Vector3(0, 0.7, 0)), '#c4b788', 6); }
        this.carVelocity *= -0.14;
      }
      this.car.root.rotation.z = THREE.MathUtils.lerp(this.car.root.rotation.z, this.carSteering * this.carVelocity * -0.007, dt * 7);
      for (const lamp of this.car.brakeLights) (lamp.material as THREE.MeshStandardMaterial).emissiveIntensity = this.input.has('Space') || forward < 0 ? 0.95 : 0.15;
      this.car.frontWheels.forEach(w => w.rotation.y = this.carSteering);
      this.car.wheels.forEach(w => w.children.forEach(c => { c.rotation.x += this.carVelocity * dt * 0.9; }));
      this.player.model.root.position.copy(this.car.root.position);
      this.companion.model.root.position.copy(this.car.root.position);
      this.audio.engine(this.carVelocity, true);
      for (const actor of [this.rurik, this.shopkeeper, ...this.bailiffs]) {
        if (actor.model.root.visible && !actor.flee && !actor.stunned && Math.abs(this.carVelocity) > 4 && distance(this.car.root.position, actor.model.root.position) < 2.3) {
          this.hitActor(actor, 3); this.carVelocity *= 0.5;
        }
      }
    } else {
      const running = this.input.has('ShiftLeft') || this.input.has('ShiftRight');
      const speed = this.state.aiming ? 2.4 : running ? 7.9 : 4.35;
      const desired = new THREE.Vector3();
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
    this.ring.position.copy(this.playerPosition).add(new THREE.Vector3(0, 0.04, 0));
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
      goal = new THREE.Vector3(20, 0, 62); speed = 7.2;
      if (distance(current, goal) < 4) { actor.model.root.visible = false; return; }
    } else if (actor === this.companion && this.state.insideHome) {
      const waiting = new THREE.Vector3(HOME.door.x + 2.6, 0, HOME.door.z + 1.3);
      if (distance(current, waiting) > 1.0) { goal = waiting; speed = 4.6; }
    } else if (actor === this.companion && this.state.insideShop) {
      const waiting = new THREE.Vector3(SHOP.door.x + 2.7, 0, SHOP.door.z + 1.1);
      if (distance(current, waiting) > 1.1) { goal = waiting; speed = 4.6; }
    } else if (actor === this.companion) {
      if (!this.state.inCar && distance(current, this.playerPosition) > 4.2) {
        goal = this.playerPosition; speed = distance(current, goal) > 12 ? 8.5 : 4.6;
      }
      if (!this.state.inCar && distance(current, this.playerPosition) > 40) {
        current.copy(this.playerPosition).add(new THREE.Vector3(-2.4, 0, 1));
      }
    } else if (actor === this.shopkeeper && this.state.carryingMeat && actor.angry > 0) {
      const d = distance(current, this.playerPosition);
      if (d < 1.90 && Math.abs(current.y - this.playerPosition.y) < 1.5 && this.activeTime > this.shopGraceUntil && !this.state.inCar) { this.caughtInShop(); return; }
      if (d > 1.6 && d < 34) { goal = this.playerPosition; speed = 4.9; }
    } else if ((actor.angry > 0 || (actor.id.startsWith('matare') && this.state.bailiffsActive)) && !actor.flee) {
      const d = distance(current, this.playerPosition);
      if (d > 2.2 && d < 42) { goal = this.playerPosition; speed = actor === this.rurik ? 4.5 : 3.1; }
      if (d < 2.4 && Math.abs(current.y - this.playerPosition.y) < 1.5 && actor.cooldown === 0 && !this.state.inCar && !this.state.onStairs) {
        actor.punch = 0.43; actor.cooldown = 1.8;
        this.state.health -= actor === this.rurik ? 10 : 7;
        this.lastDamage = this.activeTime;
        this.audio.play('hit');
        this.burst(this.playerPosition.clone().add(new THREE.Vector3(0, 1.8, 0)), '#e8ca91', 6);
        if (this.state.health <= 0) this.respawn();
      }
    } else if (distance(current, actor.home) > 2) { goal = actor.home; speed = 2.0; }
    if (goal) {
      if (actor === this.shopkeeper) {
        const inside = this.isInsideShop(current), targetInside = this.isInsideShop(goal);
        if (inside && !targetInside) {
          if (Math.abs(current.x - SHOP.entry.x) > 0.6 && current.z < 20.7) goal = new THREE.Vector3(SHOP.entry.x, 0, Math.min(current.z, 19.5));
          else goal = new THREE.Vector3(SHOP.door.x, 0, SHOP.door.z + 1.7);
        } else if (!inside && targetInside) {
          goal = Math.abs(current.x - SHOP.door.x) > 0.6 || current.z > SHOP.door.z + 1.9
            ? new THREE.Vector3(SHOP.door.x, 0, SHOP.door.z + 1.7)
            : new THREE.Vector3(SHOP.entry.x, 0, 17.0);
        }
      }
      const delta = goal.clone().sub(current); delta.y = 0;
      actor.model.root.rotation.y = angleLerp(actor.model.root.rotation.y, Math.atan2(delta.x, delta.z), 1 - Math.exp(-dt * 6));
      delta.normalize().multiplyScalar(speed * dt);
      const travelled = this.move(actor.model.root, delta, 0.45, true);
      actor.speed = dt > 0 ? Math.min(speed, travelled / dt) : 0;
    }
    animateCharacter(actor.model, this.elapsed + (actor.id === 'ebbe' ? 1.4 : 0.6), actor.speed, actor.punch / 0.43, 0, dt);
  }

  private respawn() {
    this.cancelHunting();
    this.stairTravel = null; this.state.onStairs = false; this.state.homeFloor = 0;
    this.state.health = 100; this.state.money = Math.max(0, this.state.money - 25);
    if (this.state.carryingMeat) { this.state.carryingMeat = false; this.state.progress.shop = 1; }
    this.state.shopRisk = 0; this.shopkeeper.angry = 0; this.shopkeeper.model.root.position.copy(this.shopkeeper.home);
    this.world.shop.loot.visible = this.state.progress.shop < 3; this.updateEquipment();
    this.state.inCar = false; this.state.wanted = 0;
    this.player.model.root.visible = true; this.companion.model.root.visible = true;
    this.player.model.root.position.set(-5, 0, 4); this.companion.model.root.position.set(-3, 0, 5);
    this.rurik.angry = 0; this.rurik.model.root.position.copy(this.rurik.home);
    this.bailiffs.forEach(a => { if (!a.flee) { a.model.root.position.copy(a.home); a.cooldown = 10; } });
    this.callbacks.onToast({ title: 'En ofrivillig tupplur', detail: 'Tillbaka på gården, 25 kr fattigare. Alla är hela igen.', kind: 'warning' });
    this.save();
  }

  private walkableHeight(x: number, z: number, floor: 0 | 1 = 0) {
    if (Math.abs(x - HOME.center.x) < 5.5 && Math.abs(z - HOME.center.z) < 4.05) return floor === 1 ? HOME.upperY : HOME.groundY;
    if (x > -8.9 && x < -5.05 && z >= -1.95 && z < 0.47) return 0.70;
    if (Math.abs(x - SHOP.center.x) < 7.03 && z > SHOP.center.z - 5.2 && z < SHOP.center.z + 5.35) return 0.155;
    if (Math.abs(x - SHOP.center.x) < 11.5 && z >= SHOP.center.z + 5.35 && z < SHOP.center.z + 16.9) return 0.09;
    return groundHeight(x, z);
  }

  private isInsideShop(position: THREE.Vector3) {
    return Math.abs(position.x - SHOP.center.x) < 7.03 && position.z > SHOP.center.z - 5.2 && position.z < SHOP.center.z + 5.35;
  }

  private updateEquipment() {
    for (const avatar of ['nils', 'ebbe'] as PlayerId[]) {
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
        rifle.position.set(0.18, 0.73, -0.31); rifle.rotation.set(0, 0, -0.37);
      }
    }
  }

  private isInsideHome(position: THREE.Vector3) {
    return Math.abs(position.x - HOME.center.x) < 5.51 && position.z > -10.01 && position.z < -1.92;
  }

  private nearFridge(position: THREE.Vector3) {
    // Use the front of the appliance, never through the outside wall or counter.
    return this.state.homeFloor === 0 && this.isInsideHome(position) && position.z > HOME.fridge.z + 0.55
      && Math.hypot(position.x - HOME.fridge.x, position.z - HOME.fridge.z - 0.65) < 2.05;
  }

  private nearStairs(position: THREE.Vector3) {
    const target = this.state.homeFloor === 1 ? HOME.stairsTop : HOME.stairsBase;
    return this.isInsideHome(position) && Math.hypot(position.x - target.x, position.z - target.z) < 1.32;
  }

  private nearComputer(position: THREE.Vector3) {
    return this.state.homeFloor === 1 && this.isInsideHome(position) && position.z > HOME.computer.z + 0.65
      && Math.hypot(position.x - HOME.computer.x, position.z - HOME.computer.z - 0.75) < 1.85;
  }

  private beginStairTravel() {
    this.cancelHunting();
    const direction = this.state.homeFloor === 0 ? 'up' : 'down';
    this.stairTravel = { direction, elapsed: 0, start: this.playerPosition.clone() };
    this.state.onStairs = true; this.state.fridgeOpen = false;
    this.input.clear(); this.stopCameraDrag(); this.punchTimer = 0; this.huntingTimer = 0;
    this.cameraYaw = 0; this.cameraElevation = 0.87; this.cameraDistance = 14.8;
    this.audio.play('step'); this.emit();
  }

  private updateStairTravel(dt: number) {
    const travel = this.stairTravel!;
    travel.elapsed += dt;
    const base = new THREE.Vector3(HOME.stairsBase.x, HOME.groundY, HOME.stairsBase.z);
    const top = new THREE.Vector3(HOME.stairsTop.x, HOME.upperY, HOME.stairsTop.z);
    const from = travel.direction === 'up' ? base : top, to = travel.direction === 'up' ? top : base;
    if (travel.elapsed < 0.35) this.playerPosition.lerpVectors(travel.start, from, travel.elapsed / 0.35);
    else {
      const t = THREE.MathUtils.clamp((travel.elapsed - 0.35) / 2.85, 0, 1);
      this.playerPosition.lerpVectors(from, to, t);
      const heightFraction = THREE.MathUtils.clamp((HOME.center.z + 3.06 - this.playerPosition.z) / 3.84, 0, 1);
      this.playerPosition.y = HOME.groundY + Math.ceil(heightFraction * 14) / 14 * (HOME.upperY - HOME.groundY);
      if (travel.direction === 'down' && t > 0.12) this.state.homeFloor = 0;
      if (travel.direction === 'up' && t > 0.9) this.state.homeFloor = 1;
      if (t === 1) {
        this.playerPosition.copy(to);
        this.state.homeFloor = travel.direction === 'up' ? 1 : 0;
        this.state.onStairs = false; this.stairTravel = null; this.input.clear(); this.stopCameraDrag();
        this.cameraElevation = this.state.homeFloor === 1 ? 0.86 : 0.90;
        this.cameraDistance = this.state.homeFloor === 1 ? 14.5 : 13.8;
        this.updateHome(); this.emit();
      }
    }
    this.player.model.root.rotation.y = travel.direction === 'up' ? Math.PI : 0;
    animateCharacter(this.player.model, this.elapsed, 2.8, 0, 0, dt);
    this.ring.position.copy(this.playerPosition).add(new THREE.Vector3(0, 0.035, 0));
    if (this.activeTime - this.lastStep > 0.24) { this.audio.play('step'); this.lastStep = this.activeTime; }
  }

  private updateHome() {
    const inside = !this.state.inCar && this.isInsideHome(this.playerPosition);
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
      this.state.fridgeOpen = false; this.state.homeFloor = 0; this.state.onStairs = false;
      this.stairTravel = null; this.state.computerOn = false; this.world.home.upstairs.computer.setPowered(false);
    }
    this.world.home.shell.visible = !inside;
    this.world.home.interior.visible = inside;
    this.world.home.staircase.visible = inside;
    this.world.home.upstairs.root.visible = inside && this.state.homeFloor === 1;
  }

  private updateShop(dt: number) {
    this.updateHome();
    if (!this.state.onStairs) this.playerPosition.y = this.walkableHeight(this.playerPosition.x, this.playerPosition.z, this.state.homeFloor);
    const inside = !this.state.inCar && this.isInsideShop(this.playerPosition);
    if (inside !== this.state.insideShop) {
      if (inside) {
        this.shopCamera = { elevation: this.cameraElevation, distance: this.cameraDistance };
        this.cameraYaw = 0; this.cameraElevation = 0.91; this.cameraDistance = 14.8;
      } else if (this.shopCamera) {
        this.cameraElevation = this.shopCamera.elevation; this.cameraDistance = this.shopCamera.distance;
        this.shopCamera = null;
      }
      this.state.insideShop = inside;
      this.world.shop.structure.visible = !inside;
    }
    this.updateEquipment();
    if (!this.state.carryingMeat) { this.state.shopRisk = Math.max(0, this.state.shopRisk - dt * 20); return; }
    const away = Math.hypot(this.playerPosition.x - SHOP.center.x, this.playerPosition.z - SHOP.center.z);
    const clerkDistance = distance(this.playerPosition, this.shopkeeper.model.root.position);
    if (away > 29) this.shopkeeper.angry = 0;
    const noticed = this.shopkeeper.stunned <= 0 && this.shopkeeper.angry > 0 && (inside || clerkDistance < 7);
    this.state.shopRisk = THREE.MathUtils.clamp(this.state.shopRisk + dt * (noticed ? 15 : -20), 0, 100);
    if (this.state.shopRisk >= 100 && inside && this.activeTime > this.shopGraceUntil) this.caughtInShop();
  }

  private caughtInShop() {
    if (!this.state.carryingMeat) return;
    this.state.carryingMeat = false; this.state.shopRisk = 0; this.state.progress.shop = 1;
    this.state.money = Math.max(0, this.state.money - 20); this.state.wanted = Math.max(0, this.state.wanted - 1);
    this.state.waypoint = 'market'; this.world.shop.loot.visible = true; this.updateEquipment();
    this.player.model.root.position.set(SHOP.door.x, 0, SHOP.door.z + 2.7);
    this.companion.model.root.position.set(SHOP.door.x + 2.7, 0, SHOP.door.z + 3.0);
    this.shopkeeper.model.root.position.copy(this.shopkeeper.home); this.shopkeeper.angry = 0; this.shopkeeper.cooldown = 2;
    this.input.clear(); this.stopCameraDrag(); this.updateShop(0);
    this.say(this.shopkeeper, 'Köttet stannar här. Ut med er!');
    this.audio.play('warning');
    this.callbacks.onToast({ title: 'Marta tog er på bar gärning!', detail: 'Köttet är tillbaka i disken. −20 kr för besväret. Ni kan gå in och försöka igen.', kind: 'warning' });
    this.save(); this.emit();
  }

  private updateProgress() {
    const p = this.playerPosition;
    if (Math.hypot(p.x - SHOP.center.x, p.z - SHOP.center.z) < 17 && this.state.progress.shop === 0) {
      this.state.progress.shop = 1;
      this.callbacks.onToast({ title: 'Myrboden', detail: 'Parkera kombin och gå fram till entrén. E öppnar butiksäventyret.', kind: 'info' });
      this.save();
    }
    if (this.state.carryingMeat && Math.hypot(p.x - 2, p.z - 6) < 14) {
      this.state.carryingMeat = false; this.state.shopRisk = 0;
      this.shopkeeper.angry = 0; this.state.wanted = Math.max(0, this.state.wanted - 2);
      this.state.health = Math.min(100, this.state.health + 25);
      this.updateEquipment(); this.world.shop.loot.visible = false;
      this.complete('shop');
      this.say(this.player, 'Det blir visst middag ändå!');
    }
    if (this.state.hasRifle && distance(p, new THREE.Vector3(-25, 0, -43)) < 16 && this.state.progress.hunt === 1) {
      this.state.progress.hunt = 2;
      this.callbacks.onToast({ title: 'Framme vid jaktmarken', detail: 'Q eller Sikta tar fram geväret. Placera siktet på älgen och klicka, tryck mellanslag eller Skjut. Du kan missa!' , kind: 'success' });
      this.save();
    }
    if (distance(p, new THREE.Vector3(36, 0, -22)) < 14 && this.state.progress.rurik === 0) {
      this.state.progress.rurik = 1;
      this.callbacks.onToast({ title: 'Välkommen till Rurik', detail: 'Prata med E, bråka med F. Verktygslådan står på bordet.', kind: 'info' });
      this.save();
    }
    if (this.toolboxTaken && this.state.progress.rurik === 2 && distance(p, new THREE.Vector3(36, 0, -22)) > 19 && distance(p, this.rurik.model.root.position) > 12) {
      this.complete('rurik');
      this.rurik.angry = 0;
      this.state.wanted = Math.max(0, this.state.wanted - 1);
    }
    if (this.state.waypoint) {
      const dest = DESTINATIONS.find(d => d.id === this.state.waypoint)!;
      if (Math.hypot(p.x - dest.x, p.z - dest.z) < 6) this.state.waypoint = null;
    }
  }

  private updateBailiffs(dt: number) {
    if (this.bailiffArrival > 0) {
      this.bailiffArrival -= dt;
      const t = 1 - this.bailiffArrival / 4.5;
      this.officialCar.root.position.set(THREE.MathUtils.lerp(16, 10, t), 0, THREE.MathUtils.lerp(36, 8, t));
      if (this.bailiffArrival <= 0) {
        this.state.progress.bailiff = Math.max(1, this.state.progress.bailiff);
        this.bailiffs.forEach((a, i) => {
          a.model.root.visible = true; a.model.root.position.set(11.9 + i * 1.3, 0, 7.0 - i * 2.5); a.health = 3; a.flee = false;
        });
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

  private updateEnvironment(dt: number) {
    const water = this.world.water.material as THREE.MeshStandardMaterial;
    if (water.bumpMap) water.bumpMap.offset.set(this.elapsed * .005, this.elapsed * .003);
    const fridge = this.world.home.fridge;
    fridge.door.rotation.y = THREE.MathUtils.lerp(fridge.door.rotation.y, this.state.fridgeOpen ? -1.94 : 0, 1 - Math.exp(-dt * 7.5));
    fridge.contents.visible = Math.abs(fridge.door.rotation.y) > 0.16;
    this.world.smoke.forEach((p, i) => {
      const phase = (this.elapsed * 0.3 + i * 0.7) % 5.6;
      p.position.set(-12.6 + phase * 0.45, 8.7 + phase * 1.04, -6.8 + Math.sin(phase) * 0.15);
      p.scale.setScalar(0.5 + phase * 0.20);
      (p.material as THREE.MeshStandardMaterial).opacity = (1 - phase / 5.6) * 0.20;
    });
    this.world.clouds.forEach((c, i) => { c.position.x += dt * (0.09 + i * 0.005); if (c.position.x > 145) c.position.x = -145; });
    this.world.birds.forEach((b, i) => {
      b.position.x = Math.sin(this.elapsed * 0.027 + i * 0.11) * 35;
      b.position.z = -33 + Math.cos(this.elapsed * 0.027 + i * 0.11) * 18;
      b.rotation.y = this.elapsed * 0.027 + i * 0.11 + Math.PI / 2;
      b.children.forEach((w, j) => w.rotation.z = Math.sin(this.elapsed * 5.5 + i) * 0.46 * (j === 0 ? -1 : 1));
    });
    this.world.elk.forEach(e => {
      if (!e.alive) {
        if (this.activeTime > e.respawnAt) { e.alive = true; e.model.root.visible = true; }
        return;
      }
      const a = this.elapsed * 0.032 + e.phase;
      e.model.root.position.x = e.origin.x + Math.sin(a) * 2.1;
      e.model.root.position.z = e.origin.z + Math.cos(a) * 1.8;
      e.model.root.rotation.y = Math.atan2(Math.cos(a), -Math.sin(a));
      e.model.legs.forEach((leg, i) => leg.rotation.x = Math.sin(this.elapsed * 1.8 + i * 2.0) * 0.085);
    });
    if (this.state.sound && this.elapsed - this.lastBird > 5.5) { this.audio.play('bird'); this.lastBird = this.elapsed + Math.random() * 3; }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.object); p.object.geometry.dispose(); (p.object.material as THREE.Material).dispose(); this.particles.splice(i, 1); continue; }
      p.velocity.y -= dt * 5;
      p.object.position.addScaledVector(p.velocity, dt);
      p.object.rotation.x += dt * 3; p.object.rotation.y += dt * 4;
      p.object.scale.setScalar(p.life / p.total);
    }
    this.speech = this.speech.filter(s => s.until > this.elapsed);
  }

  private burst(position: THREE.Vector3, color: string, count: number) {
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
    const desiredTarget = this.state.started ? this.playerPosition.clone().add(new THREE.Vector3(0, this.state.inCar ? 1.25 : 1.3, 0)) : new THREE.Vector3(-1.8, 1.2, .6);
    this.cameraTarget.lerp(desiredTarget, 1 - Math.exp(-dt * (this.state.started ? 5 : 1)));
    if (this.state.inCar && !this.dragging && Math.abs(this.carVelocity) > 1.8) {
      this.cameraYaw = angleLerp(this.cameraYaw, this.car.root.rotation.y + Math.PI, 1 - Math.exp(-dt * 1.45));
    }
    const dist = this.state.started ? (this.state.aiming ? this.aimingDistance() : this.cameraDistance + (this.state.inCar ? 4 : 0)) : 44;
    const elevation = this.state.started ? this.cameraElevation : this.cameraElevation - 0.06;
    const offset = new THREE.Vector3(Math.sin(this.cameraYaw) * Math.cos(elevation) * dist, Math.sin(elevation) * dist, Math.cos(this.cameraYaw) * Math.cos(elevation) * dist);
    positionFollowCamera(this.camera.position, this.cameraTarget, this.cameraOffset, offset, dt);
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
    const visibleFocus = this.playerPosition.clone().add(new THREE.Vector3(0, this.state.inCar ? 1.1 : 1.5, 0));
    this.world.updateAimingFoliage(this.camera.position, visibleFocus, this.state.aiming ? this.aimPoint : visibleFocus);
  }

  private tick = (time: number) => {
    if (this.disposed) return;
    const dt = Math.min((time - (this.previousTime || time)) / 1000, 0.05);
    this.previousTime = time;
    if (!this.paused) {
      this.elapsed += dt;
      this.updateEnvironment(dt);
      if (this.state.started) {
        this.activeTime += dt;
        this.updatePlayer(dt);
        this.updateShop(dt);
        this.updateActor(this.shopkeeper, dt);
        this.updateActor(this.companion, dt);
        this.updateActor(this.rurik, dt);
        this.bailiffs.forEach(a => this.updateActor(a, dt));
        this.updateBailiffs(dt);
        this.hunting.update(dt);
        this.updateProgress();
      } else {
        animateCharacter(this.player.model, this.elapsed, 0, 0, 0, dt);
        animateCharacter(this.companion.model, this.elapsed + 1, 0, 0, 0, dt);
        animateCharacter(this.rurik.model, this.elapsed, 0, 0, 0, dt);
        animateCharacter(this.shopkeeper.model, this.elapsed, 0, 0, 0, dt);
        this.ring.position.copy(this.playerPosition).add(new THREE.Vector3(0, 0.04, 0));
      }
      this.updateCamera(dt);
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
    const projected = position.clone().project(this.camera);
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
      for (const avatar of [this.avatars.nils, this.avatars.ebbe]) {
        if (!speaking.has(avatar.id) && avatar.model.root.visible) add(avatar.id, avatar.id === 'nils' ? 'Nils' : 'Ebbe', avatar.model.root.position.clone().add(new THREE.Vector3(0, 3.45, 0)), 'name');
      }
    }
    if (this.state.insideHome && this.state.homeFloor === 1) {
      add('stairs-down', 'Trappan ner · E', new THREE.Vector3(HOME.stairsTop.x, HOME.upperY + 1.20, HOME.stairsTop.z + 0.15), 'target');
      add('ebbe-computer', this.state.computerOn ? 'Ebbes dator · på' : 'Ebbes gamla dator · E', new THREE.Vector3(HOME.computer.x, HOME.upperY + 2.52, HOME.computer.z), 'target');
      return labels;
    }
    if (distance(this.playerPosition, this.car.root.position) < 22 && !this.state.inCar) add('kombi', 'kombi · Blå faran', this.car.root.position.clone().add(new THREE.Vector3(0, 2.70, 0)), 'car');
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
      if (!speaking.has('shopkeeper')) add('shopkeeper', this.shopkeeper.angry > 0 ? 'Marta · förbannad' : 'Marta · handlaren', this.shopkeeper.model.root.position.clone().add(new THREE.Vector3(0, 3.25, 0)), 'name');
    }
    if (this.state.started && distance(this.playerPosition, this.rurik.model.root.position) < 18 && !speaking.has('rurik')) add('rurik', this.rurik.angry > 0 ? 'Rurik · förbannad' : 'Rurik', this.rurik.model.root.position.clone().add(new THREE.Vector3(0, 3.25, 0)), 'name');
    if (this.state.started && !this.toolboxTaken && distance(this.playerPosition, this.world.toolbox.position) < 18) add('toolbox', 'Ruriks verktygslåda', this.world.toolbox.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 'target');
    if (this.state.started) for (const elk of this.world.elk) {
      if (elk.alive && distance(this.playerPosition, elk.model.root.position) < 25) add(`elk-${elk.phase}`, 'Skogens konung', elk.model.root.position.clone().add(new THREE.Vector3(0, 4.8, 0)), 'target');
    }
    for (const b of this.bailiffs) if (b.model.root.visible && !speaking.has(b.id) && distance(this.playerPosition, b.model.root.position) < 25) add(b.id, b.flee ? 'På väg härifrån' : 'Mätarlaget', b.model.root.position.clone().add(new THREE.Vector3(0, 3.3, 0)), 'target');
    for (const s of this.speech) {
      const pos = s.actor ? s.actor.model.root.position.clone() : s.position.clone();
      pos.y += this.state.inCar && s.actor === this.player ? 3.3 : 3.7;
      add(s.id, s.text, pos, 'speech');
    }
    return labels;
  }

  private context(): string | null {
    if (this.state.onStairs) return null;
    if (this.state.aiming) return 'Lägg ner geväret';
    if (this.state.inCar) return 'Kliv ur kombin';
    const p = this.playerPosition;
    if (this.state.homeFloor === 1) {
      if (this.nearComputer(p)) return this.state.computerOn ? 'Stäng av Ebbes dator' : 'Starta Ebbes dator';
      return this.nearStairs(p) ? 'Gå nerför trätrappan' : null;
    }
    if (this.nearStairs(p)) return 'Gå upp till Ebbes rum';
    if (this.isInsideHome(p) && !this.state.hasRifle && Math.hypot(p.x - HOME.rifle.x, p.z - HOME.rifle.z) < 2.4) return 'Ta jaktgeväret';
    if (this.nearFridge(p)) return this.state.fridgeOpen ? 'Stäng kylskåpet' : 'Öppna kylskåpet';
    if (this.isInsideHome(p) && Math.hypot(p.x - HOME.entry.x, p.z - HOME.entry.z) < 2.65) return 'Gå ut ur huset';
    if (!this.isInsideHome(p) && Math.hypot(p.x - HOME.door.x, p.z - HOME.door.z) < 2.6) return 'Gå in i huset';
    if (this.isInsideShop(p) && !this.state.carryingMeat && this.state.progress.shop < 3 && Math.hypot(p.x - SHOP.meat.x, p.z - SHOP.meat.z) < 3.15) return 'Försök sno köttpaketet';
    if (this.isInsideShop(p) && Math.hypot(p.x - SHOP.entry.x, p.z - SHOP.entry.z) < 3.4) return 'Gå ut från Myrboden';
    if (!this.isInsideShop(p) && Math.hypot(p.x - SHOP.door.x, p.z - SHOP.door.z) < 3.5) return 'Gå in på Myrboden';
    if (!this.toolboxTaken && distance(p, this.world.toolbox.position) < 3.0) return 'Låna verktygslådan';
    if (this.world.elk.some(e => e.alive && distance(p, e.model.root.position) < 16)) return this.state.hasRifle ? 'Sikta med geväret' : 'Jaktgeväret saknas';
    if (distance(p, this.car.root.position) < 4.6) return 'Hoppa in i kombin';
    if (distance(p, this.rurik.model.root.position) < 3.7 && !this.rurik.stunned) return 'Prata med Rurik';
    if (Math.hypot(p.x - HOME.coffee.x, p.z - HOME.coffee.z) < 2.4) return 'Ta en kaffepaus';
    if (distance(p, this.companion.model.root.position) < 3.5) return `Snacka med ${this.state.character === 'nils' ? 'Ebbe' : 'Nils'}`;
    return null;
  }

  private location() {
    const p = this.playerPosition;
    if (this.state.onStairs) return 'Trätrappan · mellan våningarna';
    if (this.state.insideHome) return this.state.homeFloor === 1 ? 'Ebbes rum · övervåningen' : 'Inne i vännernas stuga';
    if (Math.hypot(p.x - SHOP.center.x, p.z - SHOP.center.z) < 21) return this.state.insideShop ? 'Inne på Myrboden' : 'Myrboden';
    if (p.z < -35 && distance(p, new THREE.Vector3(48, 0, -49)) < 22) return 'Myrsjön';
    if (distance(p, new THREE.Vector3(36, 0, -24)) < 19) return 'Reparationsboden';
    if (distance(p, new THREE.Vector3(-27, 0, -44)) < 21) return 'Jaktmarken';
    if (distance(p, new THREE.Vector3(48, 0, -49)) < 22) return 'Myrsjön';
    if (distance(p, new THREE.Vector3(-5, 0, 0)) < 29) return 'Hemma på gården';
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
    this.state.huntTargets = this.world.elk.filter(e => e.alive).map(e => ({ id: e.phase, ...this.project(e.model.root.position.clone().add(new THREE.Vector3(0, 1.82, 0))) }));
    this.state.cameraYaw = this.cameraYaw;
    this.state.cameraDistance = this.camera.position.distanceTo(this.cameraTarget);
    this.state.walkSpeed = this.state.inCar ? 0 : this.player.speed;
    this.state.context = this.context();
    this.state.labels = this.getLabels();
    this.callbacks.onUpdate({ ...this.state, progress: { ...this.state.progress }, labels: [...this.state.labels] });
  }

  private save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 3, hasRifle: this.state.hasRifle, carryingMeat: this.state.carryingMeat, money: this.state.money, progress: this.state.progress, character: this.state.character, activeMission: this.state.activeMission, toolboxTaken: this.toolboxTaken }));
      this.state.saved = true;
    } catch { this.state.saved = false; }
  }

  private load() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!data || ![1, 2, 3].includes(data.version)) return;
      if (typeof data.money === 'number' && Number.isFinite(data.money) && data.money >= 0 && data.money <= 1000000) this.state.money = Math.floor(data.money);
      if (data.character === 'nils' || data.character === 'ebbe') this.state.character = data.character;
      for (const id of MISSION_IDS) {
        const value = data.progress?.[id];
        if (Number.isInteger(value) && value >= 0 && value <= 3) this.state.progress[id] = value;
        if (this.state.progress[id] === 3) this.rewardClaimed.add(id);
      }
      this.state.hasRifle = data.version >= 3 && data.hasRifle === true;
      // Old, unfinished hunts started with a car rather than a rifle. Preserve
      // completed rewards but require the new pickup for every unarmed hunter.
      if (this.state.progress.hunt < 3) {
        if (!this.state.hasRifle) this.state.progress.hunt = 0;
        else this.state.progress.hunt = Math.max(1, this.state.progress.hunt);
      }
      this.world.home.rifle.visible = !this.state.hasRifle;
      // An unfinished encounter restarts cleanly, rather than saving absent NPCs.
      if (this.state.progress.bailiff < 3) this.state.progress.bailiff = 0;
      if (MISSION_IDS.includes(data.activeMission)) this.state.activeMission = data.activeMission;
      if (data.version === 1) this.state.activeMission = 'shop';
      this.state.carryingMeat = data.carryingMeat === true && this.state.progress.shop === 2;
      if (this.state.progress.shop === 2 && !this.state.carryingMeat) this.state.progress.shop = 1;
      this.world.shop.loot.visible = !this.state.carryingMeat && this.state.progress.shop < 3;
      this.updateEquipment();
      this.toolboxTaken = data.toolboxTaken === true;
      this.world.toolbox.visible = !this.toolboxTaken;
      this.state.saved = true;
    } catch { /* Invalid or blocked storage never prevents playing. */ }
  }

  reset() {
    this.cancelHunting();
    try { localStorage.removeItem(SAVE_KEY); } catch { /* storage is optional */ }
    const { sound, music } = this.state;
    this.state = structuredClone(INITIAL_SNAPSHOT);
    this.state.ready = true; this.state.sound = sound; this.state.music = music;
    this.huntingTimer = 0; this.homeCamera = null; this.stairTravel = null;
    this.world.home.staircase.visible = false; this.world.home.upstairs.root.visible = false;
    this.world.home.upstairs.computer.setPowered(false);
    this.world.home.rifle.visible = true; this.world.home.shell.visible = true; this.world.home.interior.visible = false;
    this.world.home.fridge.door.rotation.y = 0; this.world.home.fridge.contents.visible = false;
    this.activeTime = 0; this.rewardClaimed.clear(); this.toolboxTaken = false;
    this.world.toolbox.visible = true; this.bailiffArrival = -1; this.bailiffFled = 0;
    this.bailiffs.forEach(a => { a.model.root.visible = false; a.flee = false; a.health = 3; a.stunned = 0; a.angry = 0; });
    this.officialCar.root.visible = false;
    this.shopkeeper.model.root.position.copy(this.shopkeeper.home); this.shopkeeper.angry = 0; this.shopkeeper.health = 3; this.shopkeeper.stunned = 0;
    this.world.shop.structure.visible = true; this.world.shop.loot.visible = true; this.shopGraceUntil = 0; this.shopCamera = null; this.updateEquipment();
    this.rurik.model.root.position.copy(this.rurik.home); this.rurik.health = 3; this.rurik.angry = 0; this.rurik.stunned = 0;
    this.avatars.nils.model.root.position.set(6.1, 0, 9.2); this.avatars.ebbe.model.root.position.set(8.5, 0, 8.15);
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
