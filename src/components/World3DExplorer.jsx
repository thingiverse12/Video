import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  User, Bird, Orbit, Compass, Zap, Eye, Volume2, 
  VolumeX, Maximize2, Shield, Heart, Sparkles, Navigation,
  Swords, Flame, Award, Crosshair, Map, Plus, ChevronRight,
  Info
} from 'lucide-react';
import { audio } from '../utils/audio';

export default function World3DExplorer({
  pois,
  selectedPoi,
  onSelectPoi,
  playerPos,
  onUpdatePlayerPos,
  activeWaypoint,
  timeOfDay,
  weather,
  isSwedish,
  onSyncTower,
  onOpenMap
}) {
  const mountRef = useRef(null);

  // Gameplay state
  const [controlMode, setControlMode] = useState('third_person'); // 'third_person' | 'eagle' | 'orbit'
  const [isMounted, setIsMounted] = useState(false); // Horse / Mount mode
  const [hudStats, setHudStats] = useState({
    speed: 0,
    altitude: 20,
    stamina: 100,
    health: 100,
    heading: 0,
    nearbyPoi: null,
    distToNearby: 0
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [combatSlashActive, setCombatSlashActive] = useState(false);
  const [nearbyInteractivePoi, setNearbyInteractivePoi] = useState(null);

  // References to keep across render loops
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const playerMeshRef = useRef(null);
  const horseMeshRef = useRef(null);
  const swordSlashRef = useRef(null);
  const terrainMeshRef = useRef(null);
  const waterMeshRef = useRef(null);
  const weatherParticlesRef = useRef(null);
  const monstersRef = useRef([]);

  const controlsStateRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    attack: false,
    mount: false,
    yaw: 0,
    pitch: 0.25,
    distance: 16,
    isMouseDown: false,
    lastMouseX: 0,
    lastMouseY: 0
  });

  // Terrain heightmap math (World size: 1000 x 1000)
  const getTerrainHeight = useCallback((wx, wy) => {
    const x = (wx - 500) / 10;
    const y = (wy - 500) / 10;

    let h = 0;
    const distFromCenter = Math.sqrt(x * x + y * y);
    if (distFromCenter > 45) {
      h -= (distFromCenter - 45) * 1.5;
    }

    // Northern Mountain Range (Frostfall Peaks)
    if (wy < 300) {
      const mFactor = Math.max(0, (300 - wy) / 300);
      h += Math.sin(x * 0.15) * Math.cos(y * 0.15) * 28 * mFactor;
      h += Math.sin(x * 0.3 + 1.2) * 14 * mFactor;
      h += Math.cos(y * 0.4) * 9 * mFactor;
      h += 38 * mFactor;
    }

    // Volcanic Crags (Embermaw - South East)
    if (wx > 600 && wy > 500) {
      const eFactor = Math.min(1, ((wx - 600) + (wy - 500)) / 600);
      h += Math.sin(x * 0.2) * Math.sin(y * 0.2) * 20 * eFactor + 22 * eFactor;
    }

    // Desert Dunes (Solis - North East)
    if (wx > 600 && wy < 500) {
      const dFactor = (wx - 600) / 400;
      h += Math.sin(x * 0.15 + y * 0.1) * 9 * dFactor + 12 * dFactor;
    }

    // Shadowfen Marshes (South West)
    if (wx < 450 && wy > 600) {
      h *= 0.25;
      h += Math.sin(x * 0.1) * 2.5;
    }

    // Whisperwood rolling hills (West)
    if (wx < 350 && wy > 300 && wy < 600) {
      h += Math.sin(x * 0.12) * Math.cos(y * 0.12) * 11 + 9;
    }

    // Central Eldoria River / Lake
    const riverDist = Math.abs(wx - 480);
    if (riverDist < 30 && wy > 350 && wy < 700) {
      h -= (30 - riverDist) * 0.35;
    }

    return Math.max(-10, h);
  }, []);

  // Attack Trigger
  const triggerAttack = useCallback(() => {
    setCombatSlashActive(true);
    audio.playSwordSlash();
    setTimeout(() => setCombatSlashActive(false), 300);
  }, []);

  // Toggle Mount (Horse)
  const toggleMount = useCallback(() => {
    setIsMounted(prev => {
      const next = !prev;
      audio.playFastTravel();
      return next;
    });
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    
    // Sky color based on time of day
    const isNight = timeOfDay < 6 || timeOfDay > 20;
    const isSunset = (timeOfDay >= 18 && timeOfDay <= 20) || (timeOfDay >= 5 && timeOfDay <= 7);
    
    let skyColor = isNight ? 0x050914 : isSunset ? 0x7c2d12 : 0x0284c7;
    let fogColor = isNight ? 0x080f20 : isSunset ? 0x451a03 : 0x38bdf8;
    
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(fogColor, 0.0032);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.5, 2500);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Lighting System
    const hemiLight = new THREE.HemisphereLight(
      isNight ? 0x1e293b : 0xe0f2fe, 
      isNight ? 0x020617 : 0x334155, 
      isNight ? 0.4 : 0.7
    );
    scene.add(hemiLight);

    const sunAngle = ((timeOfDay - 6) / 18) * Math.PI;
    const sunX = Math.cos(sunAngle) * 450;
    const sunY = Math.sin(sunAngle) * 350 + 20;
    const sunZ = 200;

    const sunLight = new THREE.DirectionalLight(
      isNight ? 0x93c5fd : isSunset ? 0xfb923c : 0xffedd5, 
      isNight ? 0.4 : 1.3
    );
    sunLight.position.set(sunX, Math.max(40, sunY), sunZ);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 1000;
    sunLight.shadow.camera.left = -300;
    sunLight.shadow.camera.right = 300;
    sunLight.shadow.camera.top = 300;
    sunLight.shadow.camera.bottom = -300;
    scene.add(sunLight);

    // Stars at night
    if (isNight) {
      const starGeo = new THREE.BufferGeometry();
      const starCount = 800;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 2000;
        starPositions[i + 1] = Math.random() * 800 + 200;
        starPositions[i + 2] = (Math.random() - 0.5) * 2000;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0.85 });
      const stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);
    }

    // 3. Terrain Geometry & Multi-Biome Shading
    const terrainRes = 130;
    const terrainGeo = new THREE.PlaneGeometry(1000, 1000, terrainRes, terrainRes);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colorAttr = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i) + 500;
      const vz = posAttr.getZ(i) + 500;
      const vy = getTerrainHeight(vx, vz);
      posAttr.setY(i, vy);

      let r = 0.22, g = 0.55, b = 0.22;

      if (vy < 0.5) {
        // Sand Shore
        r = 0.82; g = 0.75; b = 0.52;
      } else if (vz < 300) {
        // Frostfall Peaks
        const snowAmt = Math.min(1, Math.max(0, (vy - 12) / 25));
        r = THREE.MathUtils.lerp(0.35, 0.95, snowAmt);
        g = THREE.MathUtils.lerp(0.45, 0.98, snowAmt);
        b = THREE.MathUtils.lerp(0.55, 1.0, snowAmt);
      } else if (vx > 600 && vz > 500) {
        // Embermaw Volcanic
        r = 0.22 + Math.sin(vx * 0.05) * 0.05;
        g = 0.12;
        b = 0.12;
        if (vy < 10) {
          r = 0.98; g = 0.35; b = 0.05; // Magma Glow
        }
      } else if (vx > 600 && vz < 500) {
        // Solis Desert
        r = 0.90; g = 0.75; b = 0.38;
      } else if (vx < 450 && vz > 600) {
        // Shadowfen Swamps
        r = 0.20; g = 0.34; b = 0.26;
      } else if (vx < 350) {
        // Whisperwood Forest
        r = 0.10; g = 0.44; b = 0.16;
      } else {
        // Eldoria
        if (vy > 25) {
          r = 0.48; g = 0.48; b = 0.48;
        } else {
          r = 0.28; g = 0.62; b = 0.25;
        }
      }

      colorAttr[i * 3] = r;
      colorAttr[i * 3 + 1] = g;
      colorAttr[i * 3 + 2] = b;
    }

    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);
    terrainMeshRef.current = terrainMesh;

    // 4. Animated Water Surface
    const waterGeo = new THREE.PlaneGeometry(1000, 1000, 40, 40);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.8
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 1.0;
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // 5. Build 3D Landmarks & POI Structures
    const landmarksGroup = new THREE.Group();

    pois.forEach(poi => {
      const px = poi.x - 500;
      const pz = poi.y - 500;
      const py = getTerrainHeight(poi.x, poi.y);

      if (poi.type === 'city') {
        // Valencrest Castle Keep & Towers
        const castleGroup = new THREE.Group();
        castleGroup.position.set(px, py, pz);

        const keepGeo = new THREE.BoxGeometry(18, 24, 18);
        const stoneMat = new THREE.MeshStandardMaterial({ 
          color: poi.region === 'embermaw' ? 0x27272a : poi.region === 'frostfall' ? 0x93c5fd : 0xd4d4d8,
          roughness: 0.6 
        });
        const keep = new THREE.Mesh(keepGeo, stoneMat);
        keep.position.y = 12;
        keep.castShadow = true;
        castleGroup.add(keep);

        const towerGeo = new THREE.CylinderGeometry(3.8, 4.2, 30, 8);
        const roofGeo = new THREE.ConeGeometry(4.6, 9, 8);
        const roofMat = new THREE.MeshStandardMaterial({ 
          color: poi.region === 'embermaw' ? 0xd97706 : poi.region === 'frostfall' ? 0x38bdf8 : 0x2563eb 
        });

        [[-10, -10], [10, -10], [-10, 10], [10, 10]].forEach(([tx, tz]) => {
          const tower = new THREE.Mesh(towerGeo, stoneMat);
          tower.position.set(tx, 15, tz);
          tower.castShadow = true;
          castleGroup.add(tower);

          const roof = new THREE.Mesh(roofGeo, roofMat);
          roof.position.set(tx, 34, tz);
          castleGroup.add(roof);
        });

        // Golden Sky Pillar
        const lightPillarGeo = new THREE.CylinderGeometry(0.8, 1.6, 180, 8);
        const lightPillarMat = new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide
        });
        const lightPillar = new THREE.Mesh(lightPillarGeo, lightPillarMat);
        lightPillar.position.y = 90;
        castleGroup.add(lightPillar);

        landmarksGroup.add(castleGroup);

      } else if (poi.type === 'viewpoint') {
        // Sync Watchtower
        const towerGroup = new THREE.Group();
        towerGroup.position.set(px, py, pz);

        const towerPillarGeo = new THREE.CylinderGeometry(2.5, 3.5, 36, 8);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
        const pillar = new THREE.Mesh(towerPillarGeo, towerMat);
        pillar.position.y = 18;
        towerGroup.add(pillar);

        const platformGeo = new THREE.CylinderGeometry(6.5, 6.5, 2, 8);
        const platMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
        const plat = new THREE.Mesh(platformGeo, platMat);
        plat.position.y = 36;
        towerGroup.add(plat);

        // Floating Mystical Rune Crystal
        const crystalGeo = new THREE.OctahedronGeometry(3.0, 0);
        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0xa855f7,
          emissive: 0x9333ea,
          emissiveIntensity: 1.0,
          roughness: 0.2
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.y = 42;
        crystal.name = 'viewpointCrystal';
        towerGroup.add(crystal);

        // Light Beam into sky
        const beamGeo = new THREE.CylinderGeometry(0.6, 1.2, 160, 8);
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0xa855f7,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 90;
        towerGroup.add(beam);

        landmarksGroup.add(towerGroup);

      } else if (poi.type === 'fast_travel') {
        // Fast Travel Obelisk
        const obGroup = new THREE.Group();
        obGroup.position.set(px, py, pz);

        const obGeo = new THREE.BoxGeometry(2.5, 16, 2.5);
        const obMat = new THREE.MeshStandardMaterial({ 
          color: 0x38bdf8, 
          emissive: 0x0284c7, 
          emissiveIntensity: 0.8 
        });
        const obelisk = new THREE.Mesh(obGeo, obMat);
        obelisk.position.y = 8;
        obGroup.add(obelisk);

        const beamGeo = new THREE.CylinderGeometry(0.8, 1.4, 200, 8);
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 100;
        obGroup.add(beam);

        landmarksGroup.add(obGroup);

      } else if (poi.type === 'dungeon' || poi.type === 'boss') {
        // Dungeon Portal / Dragon Roost
        const dgGroup = new THREE.Group();
        dgGroup.position.set(px, py, pz);

        const portalRingGeo = new THREE.TorusGeometry(6, 1.2, 8, 24);
        const portalMat = new THREE.MeshStandardMaterial({
          color: poi.type === 'boss' ? 0xef4444 : 0x8b5cf6,
          emissive: poi.type === 'boss' ? 0xdc2626 : 0x7c3aed,
          emissiveIntensity: 0.9
        });
        const portal = new THREE.Mesh(portalRingGeo, portalMat);
        portal.position.y = 7;
        portal.name = 'dungeonPortal';
        dgGroup.add(portal);

        landmarksGroup.add(dgGroup);
      }
    });

    // 6. Instanced 3D Forest Trees
    const treeTrunkGeo = new THREE.CylinderGeometry(0.4, 0.7, 4, 5);
    const treeConeGeo = new THREE.ConeGeometry(2.6, 7.5, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
    const leafGreenMat = new THREE.MeshStandardMaterial({ color: 0x166534, flatShading: true });
    const leafSnowMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, flatShading: true });
    const leafPalmMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, flatShading: true });

    const treesGroup = new THREE.Group();

    for (let i = 0; i < 220; i++) {
      const tx = (Math.random() * 900) + 50;
      const tz = (Math.random() * 900) + 50;
      const ty = getTerrainHeight(tx, tz);

      if (ty < 2 || ty > 75) continue;

      const tGroup = new THREE.Group();
      tGroup.position.set(tx - 500, ty, tz - 500);

      const trunk = new THREE.Mesh(treeTrunkGeo, trunkMat);
      trunk.position.y = 2;
      tGroup.add(trunk);

      let leafMat = leafGreenMat;
      if (tz < 320) leafMat = leafSnowMat;
      else if (tx > 600 && tz < 500) leafMat = leafPalmMat;
      else if (tx > 600 && tz > 500) continue;

      const leaves = new THREE.Mesh(treeConeGeo, leafMat);
      leaves.position.y = 6.2;
      leaves.castShadow = true;
      tGroup.add(leaves);

      const s = 0.75 + Math.random() * 0.6;
      tGroup.scale.set(s, s, s);
      treesGroup.add(tGroup);
    }

    scene.add(treesGroup);
    scene.add(landmarksGroup);

    // 7. Character Model (Knight with Armor, Visor, Animated Cape & Runic Sword)
    const playerGroup = new THREE.Group();
    
    // Body Armor
    const bodyGeo = new THREE.BoxGeometry(1.3, 1.9, 0.85);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.7;
    body.castShadow = true;
    playerGroup.add(body);

    // Helmet & Glowing Blue Visor
    const helmGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const helmMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
    const helm = new THREE.Mesh(helmGeo, helmMat);
    helm.position.y = 3.0;
    helm.castShadow = true;
    playerGroup.add(helm);

    const visorGeo = new THREE.BoxGeometry(0.75, 0.2, 0.25);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 3.0, 0.48);
    playerGroup.add(visor);

    // Gold / Amber Knight Cape
    const capeGeo = new THREE.BoxGeometry(1.1, 1.8, 0.15);
    const capeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 1.5, -0.48);
    cape.name = 'playerCape';
    playerGroup.add(cape);

    // Glowing Runic Sword
    const swordGroup = new THREE.Group();
    const swordBladeGeo = new THREE.BoxGeometry(0.18, 2.6, 0.35);
    const swordBladeMat = new THREE.MeshStandardMaterial({ 
      color: 0x38bdf8, 
      emissive: 0x0284c7, 
      emissiveIntensity: 0.85 
    });
    const swordBlade = new THREE.Mesh(swordBladeGeo, swordBladeMat);
    swordBlade.position.y = 1.3;
    swordGroup.add(swordBlade);

    const hiltGeo = new THREE.BoxGeometry(0.6, 0.15, 0.2);
    const hiltMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    swordGroup.add(hilt);

    swordGroup.position.set(0.65, 1.6, 0.4);
    swordGroup.name = 'playerSword';
    playerGroup.add(swordGroup);

    // Sword Arc Slash Effect (Crescent Mesh)
    const slashGeo = new THREE.RingGeometry(1.8, 2.6, 16, 1, 0, Math.PI * 0.8);
    const slashMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const slashMesh = new THREE.Mesh(slashGeo, slashMat);
    slashMesh.rotation.x = Math.PI / 2;
    slashMesh.position.set(0, 1.8, 1.2);
    slashMesh.name = 'slashEffect';
    playerGroup.add(slashMesh);
    swordSlashRef.current = slashMesh;

    // Horse Mount Model (Hidden initially unless mounted)
    const horseGroup = new THREE.Group();
    const horseBodyGeo = new THREE.BoxGeometry(1.6, 1.8, 3.2);
    const horseMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
    const horseBody = new THREE.Mesh(horseBodyGeo, horseMat);
    horseBody.position.y = 1.6;
    horseGroup.add(horseBody);

    const horseNeckGeo = new THREE.BoxGeometry(1.0, 2.0, 1.2);
    const horseNeck = new THREE.Mesh(horseNeckGeo, horseMat);
    horseNeck.position.set(0, 2.6, 1.4);
    horseNeck.rotation.x = -0.4;
    horseGroup.add(horseNeck);

    const horseHeadGeo = new THREE.BoxGeometry(0.9, 0.9, 1.4);
    const horseHead = new THREE.Mesh(horseHeadGeo, horseMat);
    horseHead.position.set(0, 3.4, 2.0);
    horseGroup.add(horseHead);

    horseGroup.visible = false;
    playerGroup.add(horseGroup);
    horseMeshRef.current = horseGroup;

    // Initial position
    const pInitY = getTerrainHeight(playerPos.x, playerPos.y);
    playerGroup.position.set(playerPos.x - 500, pInitY, playerPos.y - 500);
    scene.add(playerGroup);
    playerMeshRef.current = playerGroup;

    // 8. 3D Weather Particle Systems
    const particleCount = 700;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 450;
      particlePos[i + 1] = Math.random() * 160;
      particlePos[i + 2] = (Math.random() - 0.5) * 450;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      size: weather === 'snow' ? 2.5 : 1.6,
      color: weather === 'ashfall' ? 0xf97316 : weather === 'snow' ? 0xffffff : 0xbae6fd,
      transparent: true,
      opacity: 0.7
    });

    const weatherParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(weatherParticles);
    weatherParticlesRef.current = weatherParticles;

    // 9. Input & Controls Event Handlers
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') controlsStateRef.current.forward = true;
      if (key === 's' || key === 'arrowdown') controlsStateRef.current.backward = true;
      if (key === 'a' || key === 'arrowleft') controlsStateRef.current.left = true;
      if (key === 'd' || key === 'arrowright') controlsStateRef.current.right = true;
      if (key === 'shift') controlsStateRef.current.sprint = true;
      if (key === ' ' || key === 'space') controlsStateRef.current.jump = true;

      // H Key for Horse Mount
      if (key === 'h') {
        toggleMount();
      }

      // J Key or Left Click for Attack
      if (key === 'j' || key === 'k') {
        triggerAttack();
      }

      // E Key to interact with nearest tower / POI
      if (key === 'e') {
        checkInteract();
      }

      // M Key to open 2D Map
      if (key === 'm') {
        onOpenMap();
        audio.playClick();
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') controlsStateRef.current.forward = false;
      if (key === 's' || key === 'arrowdown') controlsStateRef.current.backward = false;
      if (key === 'a' || key === 'arrowleft') controlsStateRef.current.left = false;
      if (key === 'd' || key === 'arrowright') controlsStateRef.current.right = false;
      if (key === 'shift') controlsStateRef.current.sprint = false;
      if (key === ' ' || key === 'space') controlsStateRef.current.jump = false;
    };

    const handlePointerDown = (e) => {
      // Left click attack if not dragging heavily
      if (e.button === 0) {
        triggerAttack();
      }
      controlsStateRef.current.isMouseDown = true;
      controlsStateRef.current.lastMouseX = e.clientX;
      controlsStateRef.current.lastMouseY = e.clientY;
    };

    const handlePointerMove = (e) => {
      if (!controlsStateRef.current.isMouseDown) return;
      const dx = e.clientX - controlsStateRef.current.lastMouseX;
      const dy = e.clientY - controlsStateRef.current.lastMouseY;

      controlsStateRef.current.lastMouseX = e.clientX;
      controlsStateRef.current.lastMouseY = e.clientY;

      controlsStateRef.current.yaw -= dx * 0.0045;
      controlsStateRef.current.pitch = Math.max(
        -0.2, 
        Math.min(1.3, controlsStateRef.current.pitch + dy * 0.0045)
      );
    };

    const handlePointerUp = () => {
      controlsStateRef.current.isMouseDown = false;
    };

    const handleWheel3D = (e) => {
      controlsStateRef.current.distance = Math.max(
        5, 
        Math.min(65, controlsStateRef.current.distance + e.deltaY * 0.035)
      );
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    container.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    container.addEventListener('wheel', handleWheel3D, { passive: true });

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    // 10. Check Proximity Interactions
    const checkInteract = () => {
      const p = playerMeshRef.current;
      if (!p) return;
      const wx = p.position.x + 500;
      const wy = p.position.z + 500;

      pois.forEach(poi => {
        const d = Math.hypot(poi.x - wx, poi.y - wy);
        if (d < 35) {
          if (poi.type === 'viewpoint' && !poi.completed) {
            triggerSyncSequence(poi);
          } else {
            onSelectPoi(poi);
            audio.playMarkerSelect();
          }
        }
      });
    };

    const triggerSyncSequence = (towerPoi) => {
      setIsSyncing(true);
      audio.playTowerSync();
      let step = 0;
      const syncInterval = setInterval(() => {
        step += 2;
        setSyncProgress(step);
        controlsStateRef.current.yaw += 0.08;
        controlsStateRef.current.pitch = 0.55;
        if (step >= 100) {
          clearInterval(syncInterval);
          setIsSyncing(false);
          setSyncProgress(0);
          onSyncTower(towerPoi);
        }
      }, 30);
    };

    // 11. Main 3D Game Loop
    let lastTime = performance.now();
    let velocityY = 0;
    let isGrounded = true;
    let animId;
    let runTicker = 0;

    const animate = (currentTime) => {
      animId = requestAnimationFrame(animate);

      const delta = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const player = playerMeshRef.current;
      const controls = controlsStateRef.current;

      // Animate Water Plane Ripples
      if (waterMeshRef.current) {
        waterMeshRef.current.position.y = 1.0 + Math.sin(currentTime * 0.002) * 0.35;
      }

      // Rotate Viewpoint Crystals & Portals
      scene.traverse(obj => {
        if (obj.name === 'viewpointCrystal') {
          obj.rotation.y += delta * 1.5;
          obj.position.y = 42 + Math.sin(currentTime * 0.003) * 0.8;
        }
        if (obj.name === 'dungeonPortal') {
          obj.rotation.z += delta * 1.0;
        }
      });

      // Animate Weather Particles
      if (weatherParticlesRef.current) {
        const pAttr = weatherParticlesRef.current.geometry.attributes.position;
        for (let i = 1; i < pAttr.count * 3; i += 3) {
          pAttr.array[i] -= delta * (weather === 'storm' ? 85 : 38);
          if (pAttr.array[i] < 0) {
            pAttr.array[i] = 140;
          }
        }
        pAttr.needsUpdate = true;
      }

      // Handle Character Movement & Physics
      if (player && controlMode === 'third_person') {
        const baseSpeed = isMounted ? (controls.sprint ? 55 : 35) : (controls.sprint ? 34 : 18);
        let moveX = 0;
        let moveZ = 0;

        const forwardX = -Math.sin(controls.yaw);
        const forwardZ = -Math.cos(controls.yaw);
        const rightX = Math.cos(controls.yaw);
        const rightZ = -Math.sin(controls.yaw);

        if (controls.forward) {
          moveX += forwardX;
          moveZ += forwardZ;
        }
        if (controls.backward) {
          moveX -= forwardX;
          moveZ -= forwardZ;
        }
        if (controls.left) {
          moveX -= rightX;
          moveZ -= rightZ;
        }
        if (controls.right) {
          moveX += rightX;
          moveZ += rightZ;
        }

        const moveLen = Math.hypot(moveX, moveZ);
        if (moveLen > 0) {
          runTicker += delta * (isMounted ? 14 : 10);
          moveX = (moveX / moveLen) * baseSpeed * delta;
          moveZ = (moveZ / moveLen) * baseSpeed * delta;

          player.position.x += moveX;
          player.position.z += moveZ;

          player.position.x = Math.max(-480, Math.min(480, player.position.x));
          player.position.z = Math.max(-480, Math.min(480, player.position.z));

          player.rotation.y = Math.atan2(moveX, moveZ);

          // Cape wavy animation
          const capeObj = player.getObjectByName('playerCape');
          if (capeObj) {
            capeObj.rotation.x = 0.3 + Math.sin(runTicker) * 0.15;
          }
        }

        // Jump & Gravity
        const groundHeight = getTerrainHeight(player.position.x + 500, player.position.z + 500);

        if (controls.jump && isGrounded) {
          velocityY = isMounted ? 20 : 16;
          isGrounded = false;
        }

        velocityY -= 38 * delta;
        player.position.y += velocityY * delta;

        if (player.position.y <= groundHeight) {
          player.position.y = groundHeight;
          velocityY = 0;
          isGrounded = true;
        }

        // Camera Follow
        const camDist = controls.distance;
        const camTargetX = player.position.x;
        const camTargetY = player.position.y + (isMounted ? 3.5 : 2.5);
        const camTargetZ = player.position.z;

        const camX = camTargetX + Math.sin(controls.yaw) * Math.cos(controls.pitch) * camDist;
        const camY = camTargetY + Math.sin(controls.pitch) * camDist + 2;
        const camZ = camTargetZ + Math.cos(controls.yaw) * Math.cos(controls.pitch) * camDist;

        camera.position.set(camX, camY, camZ);
        camera.lookAt(camTargetX, camTargetY, camTargetZ);

        // Update state to 2D
        const curWx = Math.round(player.position.x + 500);
        const curWz = Math.round(player.position.z + 500);
        const headingDeg = Math.round((controls.yaw * (180 / Math.PI) + 360) % 360);

        if (moveLen > 0) {
          onUpdatePlayerPos({ x: curWx, y: curWz, heading: headingDeg });
        }

        // Check nearest POI for HUD
        let closestPoi = null;
        let minDist = 9999;
        pois.forEach(poi => {
          const d = Math.hypot(poi.x - curWx, poi.y - curWz);
          if (d < minDist) {
            minDist = d;
            closestPoi = poi;
          }
        });

        if (minDist < 35) {
          setNearbyInteractivePoi(closestPoi);
        } else {
          setNearbyInteractivePoi(null);
        }

        setHudStats({
          speed: Math.round(moveLen > 0 ? baseSpeed : 0),
          altitude: Math.round(player.position.y),
          stamina: 100,
          health: 100,
          heading: headingDeg,
          nearbyPoi: closestPoi,
          distToNearby: Math.round(minDist * 10)
        });

      } else if (player && controlMode === 'eagle') {
        const flySpeed = controls.sprint ? 75 : 45;
        const forwardX = -Math.sin(controls.yaw);
        const forwardZ = -Math.cos(controls.yaw);

        player.position.x += forwardX * flySpeed * delta;
        player.position.z += forwardZ * flySpeed * delta;
        player.position.y = Math.max(30, player.position.y + (controls.pitch - 0.25) * flySpeed * delta);

        player.rotation.y = controls.yaw + Math.PI;

        const camX = player.position.x + Math.sin(controls.yaw) * 14;
        const camY = player.position.y + 6;
        const camZ = player.position.z + Math.cos(controls.yaw) * 14;

        camera.position.set(camX, camY, camZ);
        camera.lookAt(player.position.x, player.position.y, player.position.z);

        const curWx = Math.round(player.position.x + 500);
        const curWz = Math.round(player.position.z + 500);
        onUpdatePlayerPos({ x: curWx, y: curWz, heading: controls.yaw * (180 / Math.PI) });
      }

      // Animate Sword Slash Mesh
      if (swordSlashRef.current) {
        if (combatSlashActive) {
          swordSlashRef.current.material.opacity = 0.85;
          swordSlashRef.current.rotation.z += delta * 15;
        } else {
          swordSlashRef.current.material.opacity = 0;
        }
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [controlMode, weather, timeOfDay, isMounted, combatSlashActive, getTerrainHeight, pois, onSelectPoi, onSyncTower, onUpdatePlayerPos, toggleMount, triggerAttack, onOpenMap]);

  // Sync mount visibility
  useEffect(() => {
    if (horseMeshRef.current) {
      horseMeshRef.current.visible = isMounted;
    }
  }, [isMounted]);

  // Teleport player if position changed externally
  useEffect(() => {
    if (playerMeshRef.current) {
      const py = getTerrainHeight(playerPos.x, playerPos.y);
      playerMeshRef.current.position.set(playerPos.x - 500, py, playerPos.y - 500);
    }
  }, [playerPos.x, playerPos.y, getTerrainHeight]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* Top Center Compass Bar (Skyrim / Witcher style) */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
        <div className="relative w-80 h-8 bg-slate-950/80 backdrop-blur-md border border-amber-500/30 rounded-full flex items-center justify-center overflow-hidden shadow-2xl px-4">
          <div className="absolute w-0.5 h-full bg-amber-400 z-10" />
          
          {/* Rotating Compass Tape */}
          <div 
            style={{ transform: `translateX(${-hudStats.heading * 1.5}px)` }}
            className="flex items-center gap-10 text-xs font-mono font-bold text-slate-400 whitespace-nowrap transition-transform duration-75"
          >
            <span>N</span>
            <span className="text-[10px] text-slate-600">45°</span>
            <span className="text-amber-300">Ö / E</span>
            <span className="text-[10px] text-slate-600">135°</span>
            <span>S</span>
            <span className="text-[10px] text-slate-600">225°</span>
            <span className="text-amber-300">V / W</span>
            <span className="text-[10px] text-slate-600">315°</span>
            <span>N</span>
          </div>
        </div>

        {/* Active Objective Pill */}
        {activeWaypoint && (
          <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-medium backdrop-blur-md shadow-lg">
            <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span>{isSwedish ? "Mål: " : "Target: "}</span>
            <b className="text-white">{isSwedish ? activeWaypoint.name : activeWaypoint.nameEn}</b>
          </div>
        )}
      </div>

      {/* Top 3D Control Switcher: Foot / Horse / Eagle */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-amber-500/30 rounded-2xl p-1.5 shadow-2xl">
        <button
          onClick={() => { setControlMode('third_person'); setIsMounted(false); audio.playClick(); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            controlMode === 'third_person' && !isMounted
              ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{isSwedish ? "Till fots" : "On Foot"}</span>
        </button>

        <button
          onClick={() => { setControlMode('third_person'); toggleMount(); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            isMounted
              ? 'bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-400/20' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>{isSwedish ? "Rid Häst (H)" : "Ride Mount (H)"}</span>
        </button>

        <button
          onClick={() => { setControlMode('eagle'); setIsMounted(false); audio.playClick(); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            controlMode === 'eagle' 
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Bird className="w-4 h-4" />
          <span>{isSwedish ? "Örnflykt" : "Eagle Flight"}</span>
        </button>
      </div>

      {/* Proximity Interaction Prompt (e.g. Near Castles, Viewpoints, Dungeons) */}
      {nearbyInteractivePoi && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => {
              if (nearbyInteractivePoi.type === 'viewpoint' && !nearbyInteractivePoi.completed) {
                onSyncTower(nearbyInteractivePoi);
              } else {
                onSelectPoi(nearbyInteractivePoi);
              }
              audio.playMarkerSelect();
            }}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500 text-slate-950 font-bold text-sm shadow-2xl shadow-amber-500/30 hover:bg-amber-400 hover:scale-105 transition-all border-2 border-white/40"
          >
            <kbd className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 font-mono text-xs">E</kbd>
            <span>
              {nearbyInteractivePoi.type === 'viewpoint' && !nearbyInteractivePoi.completed
                ? (isSwedish ? `Synkronisera ${nearbyInteractivePoi.name}` : `Synchronize ${nearbyInteractivePoi.nameEn}`)
                : (isSwedish ? `Utforska ${nearbyInteractivePoi.name}` : `Explore ${nearbyInteractivePoi.nameEn}`)}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3D Keyboard & Controls HUD */}
      <div className="absolute bottom-6 left-6 z-20 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 shadow-2xl flex flex-col gap-2 max-w-xs">
        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>{isSwedish ? "🎮 3D Spelkontroller" : "🎮 3D Controls"}</span>
          <span className="text-[10px] text-slate-500 font-mono">60 FPS</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">W A S D</kbd>
            <span className="text-slate-400">{isSwedish ? "Gå" : "Walk"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">Vänsterklick</kbd>
            <span className="text-slate-400">{isSwedish ? "Svärdshugg" : "Attack"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">H</kbd>
            <span className="text-slate-400">{isSwedish ? "Häst" : "Mount"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">Mellanslag</kbd>
            <span className="text-slate-400">{isSwedish ? "Hoppa" : "Jump"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">M</kbd>
            <span className="text-slate-400">{isSwedish ? "Öppna Karta" : "Open Map"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">Musdrag</kbd>
            <span className="text-slate-400">{isSwedish ? "Kamera" : "Camera"}</span>
          </div>
        </div>
      </div>

      {/* Bottom Right RPG Status Bars & Quick Actions */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-2">
        
        {/* Attack Sword Action Button (Mobile / Clickable) */}
        <button
          onClick={triggerAttack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold text-xs shadow-xl shadow-red-600/30 active:scale-95 transition-all"
        >
          <Swords className="w-4 h-4" />
          <span>{isSwedish ? "Hugg Svärd (Klick / J)" : "Sword Slash (J)"}</span>
        </button>

        {/* Health & Stamina Panel */}
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-2.5 w-52">
          {/* Health */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-red-400 font-bold mb-1">
              <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 fill-red-500" /> HP</span>
              <span>100 / 100</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-rose-400 w-full rounded-full" />
            </div>
          </div>

          {/* Stamina */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold mb-1">
              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 fill-emerald-500" /> Uthållighet</span>
              <span>{isMounted ? "150%" : "100%"}</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 w-full rounded-full" />
            </div>
          </div>

          {/* Stats Readout */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800">
            <span>Fart: <b className="text-amber-300">{hudStats.speed} km/h</b></span>
            <span>Höjd: <b className="text-cyan-300">{hudStats.altitude} m</b></span>
          </div>
        </div>
      </div>

      {/* Tower Synchronization Cinematic 360 Spin */}
      {isSyncing && (
        <div className="absolute inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-300">
          <div className="relative flex flex-col items-center">
            <div className="w-24 h-24 rounded-full border-4 border-amber-400 border-t-transparent animate-spin mb-4" />
            <Sparkles className="w-10 h-10 text-amber-300 absolute top-7 animate-pulse" />
            <h2 className="text-2xl font-bold font-serif gold-gradient-text tracking-widest uppercase mb-2">
              {isSwedish ? "Synkroniserar Utsiktstorn..." : "Synchronizing Viewpoint..."}
            </h2>
            <p className="text-xs text-amber-200/80 font-mono">
              {isSwedish ? `Skingrar dimman över regionen: ${syncProgress}%` : `Dispersing Fog of War: ${syncProgress}%`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
