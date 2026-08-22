import React, { useRef, useEffect } from 'react';
import { Compass } from 'lucide-react';

export default function MiniMap({ playerPos, pois, isSwedish, onExpandMap }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radarRadius = size * 0.45;

    ctx.clearRect(0, 0, size, size);

    // Mini radar background
    ctx.fillStyle = 'rgba(11, 15, 25, 0.9)';
    ctx.beginPath();
    ctx.arc(center, center, radarRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(226, 179, 74, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Radar rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.beginPath();
    ctx.arc(center, center, radarRadius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Nearby POIs
    const viewRange = 250; // map units
    pois.forEach(poi => {
      const dx = poi.x - playerPos.x;
      const dy = poi.y - playerPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < viewRange) {
        const nx = center + (dx / viewRange) * radarRadius;
        const ny = center + (dy / viewRange) * radarRadius;

        ctx.fillStyle = poi.type === 'city' ? '#38bdf8' : poi.type === 'boss' ? '#ef4444' : '#e2b34a';
        ctx.beginPath();
        ctx.arc(nx, ny, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Player arrow in center
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(((playerPos.heading || 0) * Math.PI) / 180);

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

  }, [playerPos, pois]);

  return (
    <div 
      onClick={onExpandMap}
      className="cursor-pointer group relative w-28 h-28 flex items-center justify-center bg-slate-950/80 backdrop-blur-md rounded-full border border-amber-500/30 shadow-2xl transition-transform hover:scale-105"
      title={isSwedish ? "Klicka för att växla till stor karta" : "Click to expand world map"}
    >
      <canvas ref={canvasRef} width={112} height={112} className="w-full h-full" />
      <span className="absolute top-1 text-[9px] font-serif font-bold text-amber-300 pointer-events-none">N</span>
    </div>
  );
}
