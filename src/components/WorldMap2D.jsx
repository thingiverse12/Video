import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Compass, Navigation, Eye, Skull, Castle, Scroll, Swords, 
  Beer, Gem, Landmark, Sparkles, MapPin, Check, Crosshair, 
  ZoomIn, ZoomOut, Maximize, Route, Ruler, CloudRain, Sun, 
  CloudSnow, Flame, Wind
} from 'lucide-react';
import { REGIONS } from '../data/worldData';
import { audio } from '../utils/audio';

const ICON_MAP = {
  city: Castle,
  fast_travel: Navigation,
  dungeon: Skull,
  viewpoint: Eye,
  quest: Scroll,
  boss: Swords,
  tavern: Beer,
  treasure: Gem,
  ruins: Landmark,
  custom: MapPin,
  all: Sparkles,
};

export default function WorldMap2D({
  pois,
  selectedPoi,
  onSelectPoi,
  playerPos,
  activeWaypoint,
  onSetWaypoint,
  activeQuest,
  fogOfWarRevealed,
  onRevealFog,
  customPins,
  onAddCustomPin,
  activeFilter,
  searchQuery,
  timeOfDay,
  weather,
  measuringMode,
  setMeasuringMode,
  pinPlacementMode,
  setPinPlacementMode,
  isSwedish,
  onSyncTower,
  showGrid,
  showRegionBorders,
  showContours
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Transform state: Pan (x, y) & Zoom (scale)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredPoi, setHoveredPoi] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [cursorCoord, setCursorCoord] = useState({ x: 500, y: 500 });
  const [animFrame, setAnimFrame] = useState(0);

  // Animation ticker for rivers, waves, glowing beacons, pulse
  useEffect(() => {
    let frameId;
    const loop = () => {
      setAnimFrame(prev => (prev + 1) % 1000);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Zoom handlers
  const handleZoom = (delta, clientCenter) => {
    setTransform(prev => {
      const newScale = Math.max(0.6, Math.min(3.5, prev.scale * delta));
      if (!clientCenter || !containerRef.current) {
        return { ...prev, scale: newScale };
      }
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = clientCenter.x - rect.left;
      const mouseY = clientCenter.y - rect.top;
      
      const scaleRatio = newScale / prev.scale;
      const newX = mouseX - (mouseX - prev.x) * scaleRatio;
      const newY = mouseY - (mouseY - prev.y) * scaleRatio;
      
      return { x: newX, y: newY, scale: newScale };
    });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.15 : 0.85;
    handleZoom(delta, { x: e.clientX, y: e.clientY });
  };

  // Convert screen coordinates to world map coordinates (0 - 1000)
  const screenToWorld = useCallback((screenX, screenY) => {
    if (!containerRef.current) return { x: 500, y: 500 };
    const rect = containerRef.current.getBoundingClientRect();
    const mapPixelSize = Math.min(rect.width, rect.height) * 0.95;
    const originX = (rect.width - mapPixelSize) / 2 + transform.x;
    const originY = (rect.height - mapPixelSize) / 2 + transform.y;

    const normX = ((screenX - rect.left - originX) / (mapPixelSize * transform.scale)) * 1000;
    const normY = ((screenY - rect.top - originY) / (mapPixelSize * transform.scale)) * 1000;
    return {
      x: Math.round(Math.max(0, Math.min(1000, normX))),
      y: Math.round(Math.max(0, Math.min(1000, normY)))
    };
  }, [transform]);

  // Convert world coordinates (0 - 1000) to screen coordinates
  const worldToScreen = useCallback((worldX, worldY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const mapPixelSize = Math.min(rect.width, rect.height) * 0.95;
    const originX = (rect.width - mapPixelSize) / 2 + transform.x;
    const originY = (rect.height - mapPixelSize) / 2 + transform.y;

    const screenX = originX + (worldX / 1000) * mapPixelSize * transform.scale;
    const screenY = originY + (worldY / 1000) * mapPixelSize * transform.scale;
    return { x: screenX, y: screenY };
  }, [transform]);

  // Center map on coordinates
  const focusCoordinates = (worldX, worldY, zoomLevel = 1.6) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mapPixelSize = Math.min(rect.width, rect.height) * 0.95;
    
    const targetScreenX = rect.width / 2;
    const targetScreenY = rect.height / 2;
    
    const originX = (rect.width - mapPixelSize) / 2;
    const originY = (rect.height - mapPixelSize) / 2;

    const newX = targetScreenX - originX - (worldX / 1000) * mapPixelSize * zoomLevel;
    const newY = targetScreenY - originY - (worldY / 1000) * mapPixelSize * zoomLevel;

    setTransform({ x: newX, y: newY, scale: zoomLevel });
  };

  // Center on player initially or when focused
  const centerOnPlayer = () => {
    focusCoordinates(playerPos.x, playerPos.y, 1.4);
    audio.playClick();
  };

  // Reset View to fit entire world map
  const resetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
    audio.playClick();
  };

  // Filter POIs based on search and active category
  const filteredPois = pois.filter(poi => {
    if (activeFilter !== 'all' && poi.type !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = poi.name.toLowerCase().includes(q) || poi.nameEn.toLowerCase().includes(q);
      const matchDesc = poi.description.toLowerCase().includes(q) || poi.descriptionEn.toLowerCase().includes(q);
      const matchRegion = poi.region.toLowerCase().includes(q);
      return matchName || matchDesc || matchRegion;
    }
    return true;
  });

  // Calculate distance between two world points in meters / kilometers
  const calculateDistance = (p1, p2) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // 1000 world units ~ 10,000 meters (10 km)
    const meters = Math.round(dist * 10);
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  // Canvas Drawing for High-Detail Map Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    const rect = containerRef.current.getBoundingClientRect();
    
    // Support high DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const mapSize = Math.min(width, height) * 0.95;
    const originX = (width - mapSize) / 2 + transform.x;
    const originY = (height - mapSize) / 2 + transform.y;
    const scale = transform.scale;

    // Helper: Map Coord (0-1000) to Canvas Screen Coord
    const toCanvas = (wx, wy) => ({
      x: originX + (wx / 1000) * mapSize * scale,
      y: originY + (wy / 1000) * mapSize * scale
    });

    // 1. Clear & Background (Deep Ocean with bathymetry shading)
    ctx.fillStyle = '#0a101d';
    ctx.fillRect(0, 0, width, height);

    // Ocean ripples / wave lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
    ctx.lineWidth = 1.5;
    const waveOffset = (animFrame * 0.4) % 40;
    for (let r = 50; r < 1200; r += 40) {
      const c = toCanvas(500, 500);
      ctx.beginPath();
      ctx.arc(c.x, c.y, (r + waveOffset) * (mapSize / 1000) * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Draw Landmass Base (The Great Continent of Aethelgard)
    // Smooth coastline polygon
    const coastline = [
      [240, 60], [420, 30], [600, 30], [740, 70], [860, 140], 
      [960, 260], [980, 420], [950, 620], [920, 800], [820, 940], 
      [640, 960], [450, 920], [280, 950], [120, 890], [50, 740], 
      [30, 560], [40, 380], [90, 220], [160, 120]
    ];

    ctx.save();
    ctx.beginPath();
    const firstP = toCanvas(coastline[0][0], coastline[0][1]);
    ctx.moveTo(firstP.x, firstP.y);
    for (let i = 1; i < coastline.length; i++) {
      const p = toCanvas(coastline[i][0], coastline[i][1]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();

    // Land gradient
    const landGrad = ctx.createRadialGradient(
      toCanvas(500, 500).x, toCanvas(500, 500).y, 50 * scale,
      toCanvas(500, 500).x, toCanvas(500, 500).y, 500 * (mapSize / 1000) * scale
    );
    landGrad.addColorStop(0, '#1c2838');
    landGrad.addColorStop(0.5, '#162232');
    landGrad.addColorStop(1, '#0e1724');
    ctx.fillStyle = landGrad;
    ctx.fill();

    // Coastline glow & stroke
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5 * Math.min(1.5, scale);
    ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 3. Draw Biome Regions & Coloring
    REGIONS.forEach(region => {
      ctx.save();
      ctx.beginPath();
      const p0 = toCanvas(region.polygon[0][0], region.polygon[0][1]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < region.polygon.length; i++) {
        const pt = toCanvas(region.polygon[i][0], region.polygon[i][1]);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();

      // Biome Fill
      let fillCol = 'rgba(30, 41, 59, 0.4)';
      if (region.biome === 'grassland') fillCol = 'rgba(34, 197, 94, 0.14)';
      if (region.biome === 'snow') fillCol = 'rgba(224, 242, 254, 0.22)';
      if (region.biome === 'forest') fillCol = 'rgba(16, 185, 129, 0.18)';
      if (region.biome === 'swamp') fillCol = 'rgba(168, 85, 247, 0.18)';
      if (region.biome === 'volcanic') fillCol = 'rgba(239, 68, 68, 0.2)';
      if (region.biome === 'desert') fillCol = 'rgba(234, 179, 8, 0.18)';

      ctx.fillStyle = fillCol;
      ctx.fill();

      // Region border lines
      if (showRegionBorders) {
        ctx.strokeStyle = region.borderColor;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Region Label
        const centerPt = toCanvas(region.center.x, region.center.y);
        ctx.font = `600 ${Math.max(11, 14 * scale)}px "Cinzel", Georgia, serif`;
        ctx.fillStyle = region.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 8;
        ctx.fillText(isSwedish ? region.name : region.nameEn, centerPt.x, centerPt.y);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    });

    // 4. Draw Terrain Contours & Mountain Ridges
    if (showContours) {
      ctx.save();
      ctx.strokeStyle = 'rgba(226, 179, 74, 0.15)';
      ctx.lineWidth = 1;
      // Contour rings in mountain area
      const mountainPeaks = [
        { x: 500, y: 140, r: 80 }, { x: 380, y: 180, r: 60 }, { x: 620, y: 150, r: 70 },
        { x: 820, y: 720, r: 90 }, { x: 180, y: 440, r: 50 }
      ];
      mountainPeaks.forEach(peak => {
        for (let ring = 20; ring <= peak.r; ring += 15) {
          const pt = toCanvas(peak.x, peak.y);
          ctx.beginPath();
          ctx.ellipse(
            pt.x, pt.y, 
            ring * (mapSize / 1000) * scale * 1.4, 
            ring * (mapSize / 1000) * scale * 0.8, 
            Math.PI / 6, 0, Math.PI * 2
          );
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    // 5. Draw Mountain Icons / Peaks
    const mountains = [
      { x: 450, y: 120 }, { x: 490, y: 100 }, { x: 540, y: 130 }, { x: 590, y: 110 }, { x: 640, y: 140 },
      { x: 380, y: 160 }, { x: 420, y: 190 }, { x: 670, y: 180 }, { x: 710, y: 150 },
      { x: 800, y: 680 }, { x: 850, y: 710 }, { x: 890, y: 660 }, { x: 760, y: 740 }
    ];
    ctx.save();
    mountains.forEach(m => {
      const pt = toCanvas(m.x, m.y);
      const mSize = 14 * scale;
      ctx.fillStyle = m.y < 300 ? '#e2e8f0' : '#475569';
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y - mSize);
      ctx.lineTo(pt.x + mSize * 0.9, pt.y + mSize * 0.6);
      ctx.lineTo(pt.x - mSize * 0.9, pt.y + mSize * 0.6);
      ctx.closePath();
      ctx.fill();

      // Shadow slope
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y - mSize);
      ctx.lineTo(pt.x + mSize * 0.9, pt.y + mSize * 0.6);
      ctx.lineTo(pt.x, pt.y + mSize * 0.6);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();

    // 6. Draw Winding Rivers
    const rivers = [
      // Northern Glacier River into Eldoria lake
      [[500, 160], [480, 280], [460, 390], [480, 520], [530, 610], [590, 720], [640, 840], [640, 960]],
      // Whisperwood Stream
      [[170, 380], [210, 460], [260, 520], [330, 570], [460, 550]],
      // Volcanic Magma Flow
      [[880, 650], [840, 700], [800, 750], [770, 840], [820, 940]]
    ];

    rivers.forEach((river, rIdx) => {
      ctx.save();
      ctx.beginPath();
      const p0 = toCanvas(river[0][0], river[0][1]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < river.length; i++) {
        const pt = toCanvas(river[i][0], river[i][1]);
        ctx.lineTo(pt.x, pt.y);
      }
      if (rIdx === 2) {
        // Magma
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 3 * scale;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
      } else {
        // Water
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5 * scale;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
        ctx.shadowBlur = 6;
      }
      ctx.stroke();
      ctx.restore();
    });

    // 7. Draw Major Roads / Cobblestone Trade Routes
    const roads = [
      // Valencrest to Frost Citadel
      [[480, 520], [450, 400], [420, 280], [490, 110]],
      // Valencrest to Solis Oasis & Pyramid
      [[480, 520], [600, 480], [730, 380], [820, 280]],
      // Valencrest to Whisperwood Tree
      [[480, 520], [380, 480], [240, 440], [170, 430]],
      // Valencrest to Shadowfen Galleon
      [[480, 520], [410, 620], [310, 720], [180, 730]],
      // Valencrest to Obsidian Bastion
      [[480, 520], [620, 600], [740, 680], [820, 750]]
    ];

    ctx.save();
    roads.forEach(road => {
      ctx.beginPath();
      const p0 = toCanvas(road[0][0], road[0][1]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < road.length; i++) {
        const pt = toCanvas(road[i][0], road[i][1]);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = 'rgba(217, 180, 120, 0.4)';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([4 * scale, 4 * scale]);
      ctx.stroke();
    });
    ctx.restore();

    // 8. Draw Grid Overlay (Cartographic Latitude/Longitude)
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 100; x < 1000; x += 100) {
        const topP = toCanvas(x, 0);
        const botP = toCanvas(x, 1000);
        ctx.beginPath();
        ctx.moveTo(topP.x, topP.y);
        ctx.lineTo(botP.x, botP.y);
        ctx.stroke();

        // Coordinate tag
        ctx.font = '9px "Fira Code", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.fillText(`${x}E`, topP.x + 3, topP.y + 12);
      }
      for (let y = 100; y < 1000; y += 100) {
        const leftP = toCanvas(0, y);
        const rightP = toCanvas(1000, y);
        ctx.beginPath();
        ctx.moveTo(leftP.x, leftP.y);
        ctx.lineTo(rightP.x, rightP.y);
        ctx.stroke();

        ctx.font = '9px "Fira Code", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.fillText(`${y}N`, leftP.x + 4, leftP.y - 3);
      }
      ctx.restore();
    }

    // 9. Draw Active Waypoint Navigation Breadcrumb Trail & Distance Line
    if (activeWaypoint) {
      const pScreen = toCanvas(playerPos.x, playerPos.y);
      const wScreen = toCanvas(activeWaypoint.x, activeWaypoint.y);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pScreen.x, pScreen.y);
      ctx.lineTo(wScreen.x, wScreen.y);
      ctx.strokeStyle = '#e2b34a';
      ctx.lineWidth = 2.5 * scale;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -animFrame * 0.6;
      ctx.shadowColor = '#e2b34a';
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Midpoint Distance Tag
      const midX = (pScreen.x + wScreen.x) / 2;
      const midY = (pScreen.y + wScreen.y) / 2;
      const distStr = calculateDistance(playerPos, activeWaypoint);

      ctx.setLineDash([]);
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#e2b34a';
      ctx.lineWidth = 1;
      const tagW = 75;
      const tagH = 22;
      ctx.fillRect(midX - tagW / 2, midY - tagH / 2, tagW, tagH);
      ctx.strokeRect(midX - tagW / 2, midY - tagH / 2, tagW, tagH);

      ctx.font = 'bold 11px "Fira Code", monospace';
      ctx.fillStyle = '#fbe29a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(distStr, midX, midY);
      ctx.restore();
    }

    // 10. Draw Measurement Line (Ruler Mode)
    if (measurePoints.length > 0) {
      ctx.save();
      const p1 = toCanvas(measurePoints[0].x, measurePoints[0].y);
      const p2 = measurePoints.length > 1 
        ? toCanvas(measurePoints[1].x, measurePoints[1].y)
        : toCanvas(cursorCoord.x, cursorCoord.y);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();

      // Points circles
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Measurement tag
      const dist = calculateDistance(
        measurePoints[0], 
        measurePoints.length > 1 ? measurePoints[1] : cursorCoord
      );
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2 - 12;
      ctx.font = 'bold 12px "Fira Code", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`📏 ${dist}`, mx, my);
      ctx.restore();
    }

    // 11. Draw Fog of War Overlay (Dark Mist Mask)
    if (fogOfWarRevealed) {
      // Create offscreen fog canvas or alpha mask
      // Transparent cutouts around discovered POIs & player
      ctx.save();
      const fogGrad = ctx.createRadialGradient(
        toCanvas(500, 500).x, toCanvas(500, 500).y, 100 * scale,
        toCanvas(500, 500).x, toCanvas(500, 500).y, 700 * (mapSize / 1000) * scale
      );
      fogGrad.addColorStop(0, 'rgba(8, 12, 20, 0.4)');
      fogGrad.addColorStop(1, 'rgba(6, 9, 15, 0.7)');

      // Draw misty clouds
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, 0, width, height);

      // Cutout circles of light
      ctx.globalCompositeOperation = 'destination-out';
      
      // Player vision circle
      const pPos = toCanvas(playerPos.x, playerPos.y);
      const pGrad = ctx.createRadialGradient(pPos.x, pPos.y, 10, pPos.x, pPos.y, 110 * scale);
      pGrad.addColorStop(0, 'rgba(0,0,0,1)');
      pGrad.addColorStop(0.7, 'rgba(0,0,0,0.8)');
      pGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(pPos.x, pPos.y, 110 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Discovered POIs vision circles
      pois.filter(p => p.discovered).forEach(p => {
        const pt = toCanvas(p.x, p.y);
        const radius = p.type === 'viewpoint' ? 160 * scale : 75 * scale;
        const rGrad = ctx.createRadialGradient(pt.x, pt.y, 5, pt.x, pt.y, radius);
        rGrad.addColorStop(0, 'rgba(0,0,0,1)');
        rGrad.addColorStop(0.7, 'rgba(0,0,0,0.85)');
        rGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }

    // 12. Weather Particle Simulation on Canvas (Rain, Snow, Ash)
    ctx.save();
    if (weather === 'rain' || weather === 'storm') {
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.4)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 70; i++) {
        const rx = (Math.sin(i * 99 + animFrame * 0.05) * 0.5 + 0.5) * width;
        const ry = ((i * 37 + animFrame * 12) % height);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 4, ry + 16);
        ctx.stroke();
      }
    } else if (weather === 'snow' || weather === 'blizzard') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (let i = 0; i < 80; i++) {
        const sx = ((Math.sin(i * 47 + animFrame * 0.02) * 0.5 + 0.5) * width + Math.sin(animFrame * 0.05 + i) * 20);
        const sy = ((i * 29 + animFrame * 2) % height);
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 3) + 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (weather === 'ashfall') {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.7)';
      for (let i = 0; i < 50; i++) {
        const ax = ((Math.sin(i * 31 + animFrame * 0.03) * 0.5 + 0.5) * width);
        const ay = ((i * 43 - animFrame * 1.5 + height * 10) % height);
        ctx.beginPath();
        ctx.arc(ax, ay, (i % 2) + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

  }, [
    transform, pois, playerPos, activeWaypoint, measurePoints, 
    cursorCoord, animFrame, fogOfWarRevealed, weather, timeOfDay, 
    showGrid, showRegionBorders, showContours, isSwedish
  ]);

  // Pointer & Interaction Event Listeners
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e) => {
    const worldC = screenToWorld(e.clientX, e.clientY);
    setCursorCoord(worldC);

    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Click on Map for Measuring or Custom Pin Placement
  const handleMapClick = (e) => {
    // If clicked on an interactive marker button, ignore
    if (e.target.closest('.poi-marker-btn')) return;

    const coords = screenToWorld(e.clientX, e.clientY);

    if (measuringMode) {
      if (measurePoints.length === 0) {
        setMeasurePoints([coords]);
        audio.playClick();
      } else if (measurePoints.length === 1) {
        setMeasurePoints(prev => [...prev, coords]);
        audio.playClick();
      } else {
        setMeasurePoints([coords]);
        audio.playClick();
      }
      return;
    }

    if (pinPlacementMode) {
      onAddCustomPin(coords);
      setPinPlacementMode(false);
      audio.playClick();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#0a0e17] cursor-grab active:cursor-grabbing select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleMapClick}
    >
      {/* 1. Underlying Canvas Rendering Engine */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* 2. Interactive SVG & DOM POI Markers Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {filteredPois.map(poi => {
          const screenPos = worldToScreen(poi.x, poi.y);
          const isSelected = selectedPoi?.id === poi.id;
          const isWaypoint = activeWaypoint?.id === poi.id;
          const isHovered = hoveredPoi?.id === poi.id;
          const IconComponent = ICON_MAP[poi.type] || MapPin;

          // Check if within visible screen bounds
          if (
            screenPos.x < -80 || 
            screenPos.x > window.innerWidth + 80 || 
            screenPos.y < -80 || 
            screenPos.y > window.innerHeight + 80
          ) {
            return null;
          }

          let markerBg = 'bg-slate-800 text-slate-200 border-slate-600';
          let glowClass = '';

          if (poi.type === 'city') {
            markerBg = 'bg-blue-600/90 text-white border-blue-300';
            glowClass = 'shadow-blue-glow';
          } else if (poi.type === 'fast_travel') {
            markerBg = 'bg-cyan-500/90 text-white border-cyan-200';
            glowClass = 'shadow-blue-glow animate-pulse';
          } else if (poi.type === 'boss') {
            markerBg = 'bg-red-600/90 text-white border-red-300';
            glowClass = 'shadow-red-500/50';
          } else if (poi.type === 'dungeon') {
            markerBg = 'bg-rose-700/90 text-white border-rose-400';
          } else if (poi.type === 'viewpoint') {
            markerBg = 'bg-purple-600/90 text-white border-purple-300';
          } else if (poi.type === 'quest') {
            markerBg = 'bg-amber-500/90 text-white border-amber-200';
            glowClass = 'shadow-gold-glow animate-bounce';
          } else if (poi.type === 'treasure') {
            markerBg = 'bg-emerald-600/90 text-white border-emerald-300';
          } else if (poi.type === 'tavern') {
            markerBg = 'bg-orange-600/90 text-white border-orange-300';
          }

          return (
            <div
              key={poi.id}
              style={{
                transform: `translate(${screenPos.x}px, ${screenPos.y}px) translate(-50%, -50%) scale(${isSelected ? 1.25 : 1})`,
                zIndex: isSelected ? 40 : isWaypoint ? 35 : 20,
              }}
              className="absolute pointer-events-auto transition-transform duration-150 ease-out"
            >
              {/* Waypoint Beacon Pulse */}
              {isWaypoint && (
                <div className="absolute -inset-3 rounded-full bg-amber-400/40 animate-ping pointer-events-none" />
              )}

              {/* Fast Travel / Discovery Beacon */}
              {poi.fastTravelUnlocked && !poi.completed && (
                <div className="absolute -inset-2 rounded-full border border-cyan-400/50 animate-pulse pointer-events-none" />
              )}

              <button
                className={`poi-marker-btn group relative flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg transition-all duration-200 ${markerBg} ${glowClass} hover:scale-125`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPoi(poi);
                  audio.playMarkerSelect();
                }}
                onMouseEnter={() => setHoveredPoi(poi)}
                onMouseLeave={() => setHoveredPoi(null)}
                aria-label={poi.name}
              >
                <IconComponent className="w-4 h-4" />

                {/* Completed Checkmark Badge */}
                {poi.completed && (
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center border border-slate-900 shadow">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}

                {/* Level Badge */}
                {poi.level > 1 && (
                  <div className="absolute -bottom-1 -left-1 px-1 bg-slate-950/90 border border-slate-700 rounded text-[9px] font-mono text-amber-300 font-bold leading-none py-0.5">
                    {poi.level}
                  </div>
                )}

                {/* Hover Tooltip Card */}
                {(isHovered || isSelected) && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/30 rounded-lg p-2.5 shadow-2xl text-left">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-bold text-amber-300 truncate font-serif">
                          {isSwedish ? poi.name : poi.nameEn}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 line-clamp-2 mb-1.5 leading-snug">
                        {isSwedish ? poi.description : poi.descriptionEn}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                        <span className="text-cyan-400 font-mono">
                          Nivå / Lvl {poi.level}
                        </span>
                        <span className="text-amber-400/90">
                          {poi.completed ? '✓ Utförd' : poi.fastTravelUnlocked ? '⚡ Snabbresa' : 'Ej utforskad'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}

        {/* Custom User Dropped Pins */}
        {customPins.map(pin => {
          const screenPos = worldToScreen(pin.x, pin.y);
          return (
            <div
              key={pin.id}
              style={{
                transform: `translate(${screenPos.x}px, ${screenPos.y}px) translate(-50%, -100%)`,
                zIndex: 30
              }}
              className="absolute pointer-events-auto group"
            >
              <div 
                className="flex flex-col items-center cursor-pointer transition-transform hover:scale-125"
                onClick={() => onSelectPoi(pin)}
              >
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white"
                  style={{ backgroundColor: pin.color || '#e2b34a' }}
                >
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="w-1.5 h-2 bg-white/80 rounded-b shadow" />

                <div className="hidden group-hover:block absolute bottom-full mb-1 bg-slate-900/95 border border-slate-700 rounded px-2 py-1 text-xs text-amber-200 whitespace-nowrap shadow-xl">
                  {pin.name || (isSwedish ? 'Egen Markör' : 'Custom Pin')}
                </div>
              </div>
            </div>
          );
        })}

        {/* 3. Player Character Location Marker */}
        {(() => {
          const pScreen = worldToScreen(playerPos.x, playerPos.y);
          return (
            <div
              style={{
                transform: `translate(${pScreen.x}px, ${pScreen.y}px) translate(-50%, -50%)`,
                zIndex: 50
              }}
              className="absolute pointer-events-auto"
            >
              <div className="relative flex items-center justify-center">
                {/* Vision Cone / Direction Indicator */}
                <div 
                  style={{ transform: `rotate(${playerPos.heading || 0}deg)` }}
                  className="absolute w-24 h-24 pointer-events-none"
                >
                  <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[36px] border-b-cyan-400/25 mx-auto" />
                </div>

                {/* Player Pulsing Halo */}
                <div className="absolute w-10 h-10 rounded-full bg-cyan-500/30 animate-ping pointer-events-none" />

                {/* Player Pin Icon */}
                <button 
                  onClick={centerOnPlayer}
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-sky-400 border-2 border-white shadow-xl flex items-center justify-center text-slate-950 font-bold text-xs hover:scale-110 transition-transform"
                  title={isSwedish ? "Spelarens Position (Klicka för att centrera)" : "Player Position (Click to center)"}
                >
                  <Crosshair className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Floating HUD Controls Overlay */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-30">
        {/* Zoom In */}
        <button
          onClick={() => handleZoom(1.25)}
          className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-amber-400 hover:border-amber-400/50 shadow-xl flex items-center justify-center transition-all"
          title={isSwedish ? "Zooma in" : "Zoom in"}
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => handleZoom(0.8)}
          className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-amber-400 hover:border-amber-400/50 shadow-xl flex items-center justify-center transition-all"
          title={isSwedish ? "Zooma ut" : "Zoom out"}
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        {/* Center on Player */}
        <button
          onClick={centerOnPlayer}
          className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-cyan-400 hover:border-cyan-400/50 shadow-xl flex items-center justify-center transition-all"
          title={isSwedish ? "Centrera på spelaren" : "Center on Player"}
        >
          <Crosshair className="w-5 h-5" />
        </button>

        {/* Fit Map / Reset View */}
        <button
          onClick={resetView}
          className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-amber-400 hover:border-amber-400/50 shadow-xl flex items-center justify-center transition-all"
          title={isSwedish ? "Återställ vy" : "Reset View"}
        >
          <Maximize className="w-5 h-5" />
        </button>
      </div>

      {/* Compass Rose in Top Right */}
      <div className="absolute top-6 right-6 pointer-events-none z-20 flex flex-col items-center">
        <div className="relative w-14 h-14 flex items-center justify-center compass-rose">
          <div className="absolute inset-0 rounded-full border border-amber-500/30 bg-slate-950/60 backdrop-blur-sm" />
          <Compass className="w-10 h-10 text-amber-400/80 animate-spin-slow" />
          <span className="absolute -top-1 font-serif text-[11px] font-bold text-amber-300">N</span>
        </div>
      </div>

      {/* Bottom Coordinates & Scale Bar HUD */}
      <div className="absolute bottom-6 left-6 pointer-events-none z-20 flex items-center gap-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 shadow-xl">
        <div>
          <span className="text-slate-500">X:</span> <span className="text-amber-300">{cursorCoord.x}</span>
          <span className="text-slate-500 ml-2">Y:</span> <span className="text-amber-300">{cursorCoord.y}</span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Skala:</span>
          <div className="w-12 h-1 bg-amber-400/60 relative">
            <div className="absolute -top-1 left-0 w-0.5 h-3 bg-amber-400" />
            <div className="absolute -top-1 right-0 w-0.5 h-3 bg-amber-400" />
          </div>
          <span className="text-[10px] text-amber-200">1 km</span>
        </div>
      </div>

      {/* Measuring Mode Banner */}
      {measuringMode && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-cyan-950/90 border border-cyan-500/50 rounded-full px-4 py-1.5 text-xs text-cyan-200 backdrop-blur-md shadow-2xl flex items-center gap-2">
          <Ruler className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>
            {isSwedish 
              ? "Mätverktyg aktivt: Klicka på två punkter för att mäta avstånd." 
              : "Ruler Mode active: Click two points on the map to measure distance."}
          </span>
          <button 
            onClick={() => { setMeasuringMode(false); setMeasurePoints([]); }}
            className="ml-2 text-slate-400 hover:text-white underline"
          >
            {isSwedish ? "Avsluta" : "Cancel"}
          </button>
        </div>
      )}

      {/* Pin Placement Banner */}
      {pinPlacementMode && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-amber-950/90 border border-amber-500/50 rounded-full px-4 py-1.5 text-xs text-amber-200 backdrop-blur-md shadow-2xl flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-400 animate-bounce" />
          <span>
            {isSwedish 
              ? "Klicka var som helst på kartan för att placera en egen markör." 
              : "Click anywhere on the map to place a custom pin."}
          </span>
          <button 
            onClick={() => setPinPlacementMode(false)}
            className="ml-2 text-slate-400 hover:text-white underline"
          >
            {isSwedish ? "Avbryt" : "Cancel"}
          </button>
        </div>
      )}
    </div>
  );
}
