import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { 
  User, Bird, Orbit, Compass, Zap, Eye, Volume2, 
  VolumeX, Maximize2, Shield, Heart, Sparkles, Navigation 
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
  onSyncTower
}) {
  const mountRef = useRef(null);
  const [controlMode, setControlMode] = useState('third_person'); // 'third_person' | 'eagle' | 'orbit'
  const [hudStats, setHudStats] = useState({
    fps: 60,
    speed: 0,
    altitude: 20,
    stamina: 100,
    health: 100,
    nearestPoi: null
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // References to keep across render loops
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const playerMeshRef = useRef(null);
  const terrainMeshRef = useRef(null);
  const waterMeshRef = useRef(null);
  const weatherParticlesRef = useRef(null);
  const controlsStateRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    yaw: 0,
    pitch: 0.3,
    distance: 18,
    isMouseDown: false,
    lastMouseX: 0,
    lastMouseY: 0
  });

  // World size in 3D units: 1000 x 1000 (matching 2D map 0..1000)
  // Height function for terrain
  const getTerrainHeight = (wx, wy) => {
    // Center at 500, 500
    const x = (wx - 500) / 10;
    const y = (wy - 500) / 10;

    let h = 0;
    // Base continental slope
    const distFromCenter = Math.sqrt(x * x + y * y);
    if (distFromCenter > 45) {
      h -= (distFromCenter - 45) * 1.5;
    }

    // Northern Mountain Range (Frostfall)
    if (wy < 300) {
      const mFactor = Math.max(0, (300 - wy) / 300);
      h += Math.sin(x * 0.15) * Math.cos(y * 0.15) * 25 * mFactor;
      h += Math.sin(x * 0.3 + 1.2) * 12 * mFactor;
      h += Math.cos(y * 0.4) * 8 * mFactor;
      h += 35 * mFactor;
    }

    // Volcanic Crags (Embermaw - South East)
    if (wx > 600 && wy > 500) {
      const eFactor = Math.min(1, ((wx - 600) + (wy - 500)) / 600);
      h += Math.sin(x * 0.2) * Math.sin(y * 0.2) * 18 * eFactor + 20 * eFactor;
    }

    // Desert Dunes (Solis - North East)
    if (wx > 600 && wy < 500) {
      const dFactor = (wx - 600) / 400;
      h += Math.sin(x * 0.15 + y * 0.1) * 8 * dFactor + 12 * dFactor;
    }

    // Shadowfen Marshes (South West - low and flat)
    if (wx < 450 && wy > 600) {
      h *= 0.3;
      h += Math.sin(x * 0.1) * 2;
    }

    // Whisperwood rolling hills (West)
    if (wx < 350 && wy > 300 && wy < 600) {
      h += Math.sin(x * 0.12) * Math.cos(y * 0.12) * 10 + 8;
    }

    // Central Eldoria River / Lake depression
    const riverDist = Math.abs(wx - 480);
    if (riverDist < 30 && wy > 350 && wy < 700) {
      h -= (30 - riverDist) * 0.3;
    }

    return Math.max(-10, h);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1220);
    scene.fog = new THREE.FogExp2(0x0c1220, 0.0035);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.5, 2000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.45);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.2);
    sunLight.position.set(200, 350, 200);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 800;
    sunLight.shadow.camera.left = -250;
    sunLight.shadow.camera.right = 250;
    sunLight.shadow.camera.top = 250;
    sunLight.shadow.camera.bottom = -250;
    scene.add(sunLight);

    // 3. Procedural 3D Terrain Construction
    const terrainRes = 120;
    const terrainGeo = new THREE.PlaneGeometry(1000, 1000, terrainRes, terrainRes);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colorAttr = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i) + 500; // Map to 0..1000
      const vz = posAttr.getZ(i) + 500;
      const vy = getTerrainHeight(vx, vz);
      posAttr.setY(i, vy);

      // Vertex Biome Color Blending
      let r = 0.2, g = 0.5, b = 0.2; // default meadow green

      if (vy < 0.5) {
        // Sand / Shoreline
        r = 0.76; g = 0.70; b = 0.50;
      } else if (vz < 300) {
        // Frostfall Peaks: Snow / Glacier
        const snowAmt = Math.min(1, Math.max(0, (vy - 15) / 25));
        r = THREE.MathUtils.lerp(0.35, 0.95, snowAmt);
        g = THREE.MathUtils.lerp(0.45, 0.97, snowAmt);
        b = THREE.MathUtils.lerp(0.55, 1.0, snowAmt);
      } else if (vx > 600 && vz > 500) {
        // Embermaw: Obsidian rock with red magma tint
        r = 0.22 + Math.sin(vx * 0.05) * 0.05;
        g = 0.12;
        b = 0.12;
        if (vy < 10) {
          // Magma glow
          r = 0.95; g = 0.35; b = 0.05;
        }
      } else if (vx > 600 && vz < 500) {
        // Solis: Golden desert sand
        r = 0.88; g = 0.72; b = 0.35;
      } else if (vx < 450 && vz > 600) {
        // Shadowfen: Murky swamp moss
        r = 0.22; g = 0.32; b = 0.25;
      } else if (vx < 350) {
        // Whisperwood: Deep forest emerald
        r = 0.12; g = 0.42; b = 0.18;
      } else {
        // Eldoria: Lush grass with stone elevation
        if (vy > 25) {
          r = 0.45; g = 0.45; b = 0.45; // Mountain stone
        } else {
          r = 0.28; g = 0.58; b = 0.25; // Grass
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
      metalness: 0.7,
      transparent: true,
      opacity: 0.75
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
        // Valencrest / Jotunheim / Obsidian Castle Keep
        const castleGroup = new THREE.Group();
        castleGroup.position.set(px, py, pz);

        // Keep
        const keepGeo = new THREE.BoxGeometry(16, 22, 16);
        const stoneMat = new THREE.MeshStandardMaterial({ 
          color: poi.region === 'embermaw' ? 0x27272a : poi.region === 'frostfall' ? 0x93c5fd : 0xd4d4d8,
          roughness: 0.6 
        });
        const keep = new THREE.Mesh(keepGeo, stoneMat);
        keep.position.y = 11;
        keep.castShadow = true;
        castleGroup.add(keep);

        // 4 Corner Towers
        const towerGeo = new THREE.CylinderGeometry(3.5, 4, 28, 8);
        const roofGeo = new THREE.ConeGeometry(4.2, 8, 8);
        const roofMat = new THREE.MeshStandardMaterial({ 
          color: poi.region === 'embermaw' ? 0xd97706 : poi.region === 'frostfall' ? 0x38bdf8 : 0x2563eb 
        });

        [[-9, -9], [9, -9], [-9, 9], [9, 9]].forEach(([tx, tz]) => {
          const tower = new THREE.Mesh(towerGeo, stoneMat);
          tower.position.set(tx, 14, tz);
          tower.castShadow = true;
          castleGroup.add(tower);

          const roof = new THREE.Mesh(roofGeo, roofMat);
          roof.position.set(tx, 32, tz);
          castleGroup.add(roof);
        });

        // Golden Spire Beacon
        const spireLight = new THREE.PointLight(0xfbbf24, 2, 40);
        spireLight.position.set(0, 35, 0);
        castleGroup.add(spireLight);

        landmarksGroup.add(castleGroup);

      } else if (poi.type === 'viewpoint') {
        // Sync Watchtower
        const towerGroup = new THREE.Group();
        towerGroup.position.set(px, py, pz);

        const towerPillarGeo = new THREE.CylinderGeometry(2, 3, 32, 8);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
        const pillar = new THREE.Mesh(towerPillarGeo, towerMat);
        pillar.position.y = 16;
        towerGroup.add(pillar);

        // Lookout Platform
        const platformGeo = new THREE.CylinderGeometry(6, 6, 2, 8);
        const platMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
        const plat = new THREE.Mesh(platformGeo, platMat);
        plat.position.y = 32;
        towerGroup.add(plat);

        // Floating Mystical Rune Crystal on top
        const crystalGeo = new THREE.OctahedronGeometry(2.5, 0);
        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0xa855f7,
          emissive: 0x9333ea,
          emissiveIntensity: 0.9,
          roughness: 0.2
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.y = 38;
        crystal.name = 'viewpointCrystal';
        towerGroup.add(crystal);

        landmarksGroup.add(towerGroup);

      } else if (poi.type === 'fast_travel') {
        // Fast Travel Rune Obelisk with Sky Light Beam
        const obeliskGroup = new THREE.Group();
        obeliskGroup.position.set(px, py, pz);

        const obGeo = new THREE.BoxGeometry(2, 14, 2);
        const obMat = new THREE.MeshStandardMaterial({ 
          color: 0x38bdf8, 
          emissive: 0x0284c7, 
          emissiveIntensity: 0.6 
        });
        const obelisk = new THREE.Mesh(obGeo, obMat);
        obelisk.position.y = 7;
        obeliskGroup.add(obelisk);

        // Light Beam into sky
        const beamGeo = new THREE.CylinderGeometry(0.6, 1.2, 120, 8);
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 65;
        obeliskGroup.add(beam);

        landmarksGroup.add(obeliskGroup);

      } else if (poi.type === 'dungeon' || poi.type === 'boss') {
        // Dungeon Portal / Dragon Roost
        const dgGroup = new THREE.Group();
        dgGroup.position.set(px, py, pz);

        const portalRingGeo = new THREE.TorusGeometry(5, 1, 8, 24);
        const portalMat = new THREE.MeshStandardMaterial({
          color: poi.type === 'boss' ? 0xef4444 : 0x8b5cf6,
          emissive: poi.type === 'boss' ? 0xdc2626 : 0x7c3aed,
          emissiveIntensity: 0.8
        });
        const portal = new THREE.Mesh(portalRingGeo, portalMat);
        portal.position.y = 6;
        dgGroup.add(portal);

        landmarksGroup.add(dgGroup);
      }
    });

    // 6. Procedural Instanced 3D Forests / Trees
    const treeTrunkGeo = new THREE.CylinderGeometry(0.4, 0.7, 4, 5);
    const treeConeGeo = new THREE.ConeGeometry(2.5, 7, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
    const leafGreenMat = new THREE.MeshStandardMaterial({ color: 0x166534, flatShading: true });
    const leafSnowMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, flatShading: true });
    const leafPalmMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, flatShading: true });

    const treesGroup = new THREE.Group();

    // Place trees based on biomes
    for (let i = 0; i < 180; i++) {
      const tx = (Math.random() * 900) + 50;
      const tz = (Math.random() * 900) + 50;
      const ty = getTerrainHeight(tx, tz);

      // Skip underwater or very steep peaks
      if (ty < 2 || ty > 70) continue;

      const tGroup = new THREE.Group();
      tGroup.position.set(tx - 500, ty, tz - 500);

      const trunk = new THREE.Mesh(treeTrunkGeo, trunkMat);
      trunk.position.y = 2;
      tGroup.add(trunk);

      let leafMat = leafGreenMat;
      if (tz < 320) leafMat = leafSnowMat;
      else if (tx > 600 && tz < 500) leafMat = leafPalmMat;
      else if (tx > 600 && tz > 500) continue; // no trees in magma

      const leaves = new THREE.Mesh(treeConeGeo, leafMat);
      leaves.position.y = 6;
      leaves.castShadow = true;
      tGroup.add(leaves);

      const s = 0.7 + Math.random() * 0.6;
      tGroup.scale.set(s, s, s);
      treesGroup.add(tGroup);
    }

    scene.add(treesGroup);
    scene.add(landmarksGroup);

    // 7. Playable 3D Character Model (Knight with Cape & Helmet)
    const playerGroup = new THREE.Group();
    
    // Body Armor
    const bodyGeo = new THREE.BoxGeometry(1.2, 1.8, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.6;
    body.castShadow = true;
    playerGroup.add(body);

    // Helmet & Visor
    const helmGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const helmMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
    const helm = new THREE.Mesh(helmGeo, helmMat);
    helm.position.y = 2.9;
    helm.castShadow = true;
    playerGroup.add(helm);

    const visorGeo = new THREE.BoxGeometry(0.7, 0.2, 0.2);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 2.9, 0.45);
    playerGroup.add(visor);

    // Golden Knight Cape
    const capeGeo = new THREE.BoxGeometry(1.0, 1.6, 0.15);
    const capeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 1.4, -0.45);
    cape.rotation.x = 0.15;
    playerGroup.add(cape);

    // Glowing Sword on back
    const swordGeo = new THREE.BoxGeometry(0.15, 2.4, 0.4);
    const swordMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.7 });
    const sword = new THREE.Mesh(swordGeo, swordMat);
    sword.position.set(0.6, 2.0, -0.4);
    sword.rotation.z = -0.4;
    playerGroup.add(sword);

    // Position player
    const pInitY = getTerrainHeight(playerPos.x, playerPos.y);
    playerGroup.position.set(playerPos.x - 500, pInitY, playerPos.y - 500);
    scene.add(playerGroup);
    playerMeshRef.current = playerGroup;

    // 8. Weather Particle Systems in 3D
    const particleCount = 600;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 400;
      particlePos[i + 1] = Math.random() * 150;
      particlePos[i + 2] = (Math.random() - 0.5) * 400;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 1.5,
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.6
    });

    const weatherParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(weatherParticles);
    weatherParticlesRef.current = weatherParticles;

    // 9. Input & Control Event Listeners
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') controlsStateRef.current.forward = true;
      if (key === 's' || key === 'arrowdown') controlsStateRef.current.backward = true;
      if (key === 'a' || key === 'arrowleft') controlsStateRef.current.left = true;
      if (key === 'd' || key === 'arrowright') controlsStateRef.current.right = true;
      if (key === 'shift') controlsStateRef.current.sprint = true;
      if (key === ' ' || key === 'space') controlsStateRef.current.jump = true;

      // E Key to interact with nearest tower / POI
      if (key === 'e') {
        checkInteractNearby();
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

      controlsStateRef.current.yaw -= dx * 0.005;
      controlsStateRef.current.pitch = Math.max(
        -0.2, 
        Math.min(1.4, controlsStateRef.current.pitch + dy * 0.005)
      );
    };

    const handlePointerUp = () => {
      controlsStateRef.current.isMouseDown = false;
    };

    const handleWheel3D = (e) => {
      controlsStateRef.current.distance = Math.max(
        6, 
        Math.min(70, controlsStateRef.current.distance + e.deltaY * 0.04)
      );
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    container.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    container.addEventListener('wheel', handleWheel3D, { passive: true });

    // Handle Window Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    // 10. Main 3D Render & Physics Loop
    let lastTime = performance.now();
    let velocityY = 0;
    let isGrounded = true;
    let animId;

    const checkInteractNearby = () => {
      const p = playerMeshRef.current;
      if (!p) return;
      const wx = p.position.x + 500;
      const wy = p.position.z + 500;

      pois.forEach(poi => {
        const d = Math.hypot(poi.x - wx, poi.y - wy);
        if (d < 30) {
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
        controlsStateRef.current.pitch = 0.6;
        if (step >= 100) {
          clearInterval(syncInterval);
          setIsSyncing(false);
          setSyncProgress(0);
          onSyncTower(towerPoi);
        }
      }, 30);
    };

    const animate = (currentTime) => {
      animId = requestAnimationFrame(animate);

      const delta = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const player = playerMeshRef.current;
      const controls = controlsStateRef.current;

      // Animate Water Plane Sine Waves
      if (waterMeshRef.current) {
        waterMeshRef.current.position.y = 1.0 + Math.sin(currentTime * 0.002) * 0.35;
      }

      // Rotate viewpoint crystals
      scene.traverse(obj => {
        if (obj.name === 'viewpointCrystal') {
          obj.rotation.y += delta * 1.5;
          obj.position.y = 38 + Math.sin(currentTime * 0.003) * 0.8;
        }
      });

      // Animate Weather Particles
      if (weatherParticlesRef.current) {
        const pAttr = weatherParticlesRef.current.geometry.attributes.position;
        for (let i = 1; i < pAttr.count * 3; i += 3) {
          pAttr.array[i] -= delta * (weather === 'storm' ? 80 : 35);
          if (pAttr.array[i] < 0) {
            pAttr.array[i] = 120;
          }
        }
        pAttr.needsUpdate = true;
      }

      // Player Movement Logic
      if (player && controlMode === 'third_person') {
        const moveSpeed = controls.sprint ? 35 : 18;
        let moveX = 0;
        let moveZ = 0;

        // Direction relative to camera yaw
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
          moveX = (moveX / moveLen) * moveSpeed * delta;
          moveZ = (moveZ / moveLen) * moveSpeed * delta;

          player.position.x += moveX;
          player.position.z += moveZ;

          // Keep in bounds
          player.position.x = Math.max(-480, Math.min(480, player.position.x));
          player.position.z = Math.max(-480, Math.min(480, player.position.z));

          // Rotate character towards movement direction
          player.rotation.y = Math.atan2(moveX, moveZ);
        }

        // Jump & Gravity
        const groundHeight = getTerrainHeight(player.position.x + 500, player.position.z + 500);

        if (controls.jump && isGrounded) {
          velocityY = 16;
          isGrounded = false;
        }

        velocityY -= 38 * delta; // Gravity
        player.position.y += velocityY * delta;

        if (player.position.y <= groundHeight) {
          player.position.y = groundHeight;
          velocityY = 0;
          isGrounded = true;
        }

        // Update Camera to follow player smoothly
        const camDist = controls.distance;
        const camTargetX = player.position.x;
        const camTargetY = player.position.y + 2.5;
        const camTargetZ = player.position.z;

        const camX = camTargetX + Math.sin(controls.yaw) * Math.cos(controls.pitch) * camDist;
        const camY = camTargetY + Math.sin(controls.pitch) * camDist + 2;
        const camZ = camTargetZ + Math.cos(controls.yaw) * Math.cos(controls.pitch) * camDist;

        camera.position.set(camX, camY, camZ);
        camera.lookAt(camTargetX, camTargetY, camTargetZ);

        // Update player coordinates back to 2D map
        const curWx = Math.round(player.position.x + 500);
        const curWz = Math.round(player.position.z + 500);
        const headingDeg = (controls.yaw * (180 / Math.PI)) % 360;

        if (moveLen > 0) {
          onUpdatePlayerPos({ x: curWx, y: curWz, heading: headingDeg });
        }

        // HUD updates
        setHudStats(prev => ({
          ...prev,
          speed: Math.round(moveLen > 0 ? (controls.sprint ? 32 : 16) : 0),
          altitude: Math.round(player.position.y)
        }));

      } else if (player && controlMode === 'eagle') {
        // Eagle Flight Navigation
        const flySpeed = controls.sprint ? 70 : 40;
        const forwardX = -Math.sin(controls.yaw);
        const forwardZ = -Math.cos(controls.yaw);

        player.position.x += forwardX * flySpeed * delta;
        player.position.z += forwardZ * flySpeed * delta;
        player.position.y = Math.max(35, player.position.y + (controls.pitch - 0.3) * flySpeed * delta);

        player.rotation.y = controls.yaw + Math.PI;

        const camX = player.position.x + Math.sin(controls.yaw) * 12;
        const camY = player.position.y + 5;
        const camZ = player.position.z + Math.cos(controls.yaw) * 12;

        camera.position.set(camX, camY, camZ);
        camera.lookAt(player.position.x, player.position.y, player.position.z);

        const curWx = Math.round(player.position.x + 500);
        const curWz = Math.round(player.position.z + 500);
        onUpdatePlayerPos({ x: curWx, y: curWz, heading: controls.yaw * (180 / Math.PI) });
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
  }, [controlMode, weather]);

  // Sync player position prop if teleported / fast-traveled externally
  useEffect(() => {
    if (playerMeshRef.current) {
      const py = getTerrainHeight(playerPos.x, playerPos.y);
      playerMeshRef.current.position.set(playerPos.x - 500, py, playerPos.y - 500);
    }
  }, [playerPos.x, playerPos.y]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* Top 3D Control Mode Switcher */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-amber-500/30 rounded-xl p-1.5 shadow-2xl">
        <button
          onClick={() => { setControlMode('third_person'); audio.playClick(); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
            controlMode === 'third_person' 
              ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{isSwedish ? "Tredjeperson" : "Third Person"}</span>
        </button>

        <button
          onClick={() => { setControlMode('eagle'); audio.playClick(); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
            controlMode === 'eagle' 
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20' 
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Bird className="w-4 h-4" />
          <span>{isSwedish ? "Örnflykt" : "Eagle Flight"}</span>
        </button>
      </div>

      {/* Top Compass & Objective Banner */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-xl max-w-xs">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-bold font-serif mb-1">
            <Compass className="w-4 h-4 animate-spin-slow" />
            <span>{isSwedish ? "Aktivt Mål" : "Active Objective"}</span>
          </div>
          <div className="text-xs text-slate-200 truncate">
            {activeWaypoint ? (isSwedish ? activeWaypoint.name : activeWaypoint.nameEn) : (isSwedish ? "Ingen waypoint vald" : "No waypoint selected")}
          </div>
        </div>
      </div>

      {/* 3D Keyboard Guide Overlay */}
      <div className="absolute bottom-6 left-6 z-20 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 shadow-2xl flex flex-col gap-1.5">
        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">
          {isSwedish ? "3D Kontroller" : "3D Controls"}
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">W A S D</kbd>
          <span className="text-slate-400">{isSwedish ? "Förflytta karaktär" : "Move Character"}</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">Shift</kbd>
          <span className="text-slate-400">{isSwedish ? "Sprinta / Flyg snabbt" : "Sprint / Fast Fly"}</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">Mellanslag</kbd>
          <span className="text-slate-400">{isSwedish ? "Hoppa" : "Jump"}</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono text-[10px]">Musdrag</kbd>
          <span className="text-slate-400">{isSwedish ? "Rotera kamera" : "Rotate Camera"}</span>
        </div>
      </div>

      {/* Bottom Right HUD: Health, Stamina & Speed */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl flex flex-col gap-2 w-48">
          {/* Health Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-red-400 font-bold mb-1">
              <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 fill-red-500" /> HP</span>
              <span>100 / 100</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-rose-400 w-full rounded-full" />
            </div>
          </div>

          {/* Stamina Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold mb-1">
              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 fill-emerald-500" /> Uthållighet</span>
              <span>100%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 w-full rounded-full" />
            </div>
          </div>

          {/* Stats Readout */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
            <span>Hastighet: <b className="text-amber-300">{hudStats.speed} km/h</b></span>
            <span>Höjd: <b className="text-cyan-300">{hudStats.altitude} m</b></span>
          </div>
        </div>
      </div>

      {/* Viewpoint Synchronization Cinematic Overlay */}
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
