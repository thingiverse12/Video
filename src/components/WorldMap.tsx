import { useEffect, useRef } from 'react';
import { ArrowUpRight, Home, MapPin, TreePine, Waves, Store } from 'lucide-react';
import { DESTINATIONS, type DestinationId, type GameSnapshot } from '../game/types';

const roads = [
  [[17, 52], [15, 30], [7, 12], [7, 2], [13, -8], [26, -15], [35, -17], [53, -22], [66, -40]],
  [[7, 3], [3, -12], [-6, -23], [-18, -31], [-26, -42], [-27, -54], [-38, -68]],
  [[30, -16], [33, -26], [37, -35], [39, -45]],
  [[14, 27], [23, 27], [32, 29], [40, 28]],
];
const mapPoint = (x: number, z: number) => ({ x: (x + 63) / 143 * 680, y: (z + 78) / 131 * 590 });
const DestinationIcon = ({ id, size = 18 }: { id: DestinationId; size?: number }) => id === 'market' ? <Store size={size} /> : id === 'forest' ? <TreePine size={size} /> : id === 'lake' ? <Waves size={size} /> : <Home size={size} />;

export function MiniMap({ state, onOpen }: { state: GameSnapshot; onOpen: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = 336;
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#b7c19d'; ctx.fillRect(0, 0, s, s);
    const to = (x: number, z: number) => ({ x: (x + 49) / 116 * s, y: (z + 69) / 115 * s });
    // Contour lines and forest flecks evoke a worn Swedish field map.
    ctx.strokeStyle = 'rgba(87,115,69,.20)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath(); ctx.ellipse(40 + i * 3, 70 + i * 5, 45 + i * 14, 27 + i * 11, -0.4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#9daa86';
    for (let i = 0; i < 130; i++) {
      const x = ((i * 73 + 15) % 330), y = ((i * 113 + 23) % 331);
      ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x - 3, y + 3); ctx.lineTo(x + 3, y + 3); ctx.fill();
    }
    const lake = to(55, -52);
    ctx.fillStyle = '#8eadab'; ctx.beginPath(); ctx.ellipse(lake.x, lake.y, 47, 35, -0.35, 0, Math.PI * 2); ctx.fill();
    const home = to(-8, -5), rurik = to(38, -25);
    ctx.fillStyle = '#cdc5a2'; ctx.beginPath(); ctx.ellipse(home.x, home.y, 30, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(rurik.x, rurik.y, 24, 21, 0, 0, Math.PI * 2); ctx.fill();
    for (const road of roads) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#d9cfb0'; ctx.lineWidth = 9;
      ctx.beginPath(); road.forEach(([x, z], i) => { const p = to(x, z); if (!i) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); ctx.stroke();
      ctx.strokeStyle = '#f0e4c4'; ctx.lineWidth = 5; ctx.stroke();
    }
    for (const [x, z, color] of [[-10, -6, '#98644b'], [38, -26, '#aa8d4f'], [-22, -14, '#8e7353'], [40, 16, '#517b63']] as [number, number, string][]) {
      const p = to(x, z); ctx.fillStyle = color; ctx.fillRect(p.x - 8, p.y - 5, 16, 10);
    }
    const shop = to(40, 16);
    ctx.fillStyle = '#f4e4cc'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.fillText('MYR', shop.x, shop.y + 2.5);
    if (state.waypoint) {
      const dest = DESTINATIONS.find(d => d.id === state.waypoint)!;
      const p = to(dest.x, dest.z);
      ctx.strokeStyle = '#db784c'; ctx.lineWidth = 2.5; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#d77343'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
    }
    if (state.bailiffsActive) {
      const p = to(12, 7); ctx.fillStyle = '#ae6945'; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    }
    const car = to(state.carPosition.x, state.carPosition.z);
    ctx.fillStyle = '#4d7386'; ctx.fillRect(car.x - 3.5, car.y - 5.5, 7, 11);
    const p = to(state.position.x, state.position.z);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI - state.position.heading);
    ctx.shadowColor = 'rgba(36,60,38,.30)'; ctx.shadowBlur = 7;
    ctx.fillStyle = '#f9f4dc'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#d57747'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6.4, 6.8); ctx.lineTo(0, 3.6); ctx.lineTo(-6.4, 6.8); ctx.closePath(); ctx.fill(); ctx.restore();
  }, [state.position.x, state.position.z, state.position.heading, state.carPosition.x, state.carPosition.z, state.waypoint, state.bailiffsActive]);
  return <button className="minimap" onClick={onOpen} aria-label="Öppna världskartan">
    <div className="minimap-heading"><span>GRÅMYREN</span><span className="minimap-north">N <span>↑</span></span></div>
    <canvas ref={canvasRef} width="336" height="336" />
    <div className="minimap-footer"><span>Du är här</span><span className="keycap">M</span></div>
    <span className="minimap-expand"><ArrowUpRight size={15} /></span>
  </button>;
}

export function WorldMap({ state, selected, onSelect }: { state: GameSnapshot; selected: DestinationId; onSelect: (id: DestinationId) => void }) {
  const player = mapPoint(state.position.x, state.position.z);
  const car = mapPoint(state.carPosition.x, state.carPosition.z);
  return <div className="world-map">
    <svg viewBox="0 0 680 590" aria-label="Karta över Gråmyren med gården, Rurik, jaktmarken, Myrsjön och Myrboden" role="img">
      <defs>
        <pattern id="map-trees" width="36" height="36" patternUnits="userSpaceOnUse"><path d="m8 5-4 7h2l-3 5h10l-3-5h2L8 5Zm18 18-3 5h1l-2 4h8l-2-4h1l-3-5Z" fill="#8ba07e" opacity=".30" /></pattern>
        <filter id="map-shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity=".15" /></filter>
      </defs>
      <rect width="680" height="590" fill="#d9dec9" />
      <rect width="680" height="590" fill="url(#map-trees)" />
      <g fill="none" stroke="#aabb97" strokeWidth="1.2" opacity=".42">
        {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M ${-30 + i * 13} 0 C ${50 + i * 27} ${125 - i * 3}, ${-70 + i * 33} ${210 + i * 12}, ${65 + i * 32} ${282 + i * 21} S ${80 + i * 50} 540, ${220 + i * 37} 630`} />)}
        {Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx="557" cy="163" rx={102 + i * 14} ry={57 + i * 17} transform="rotate(-18 557 163)" />)}
      </g>
      <path d="M477 99c32-45 122-47 164-15s17 75-25 99-92 25-119-5-37-54-20-79Z" fill="#95b4ae" stroke="#b8c8b2" strokeWidth="8" />
      <path d="M508 125c28-14 56-18 82-13m-60 27c21-11 49-13 75-11m-48 23c19-8 40-7 56-6" fill="none" stroke="#d4e1cb" strokeWidth="1.5" opacity=".7" />
      <ellipse cx="278" cy="369" rx="72" ry="55" fill="#dcd3b2" />
      <ellipse cx="472" cy="254" rx="55" ry="42" fill="#dcd3b2" />
      <ellipse cx="490" cy="433" rx="59" ry="55" fill="#d9cbb0" />
      <ellipse cx="176" cy="154" rx="62" ry="53" fill="#c5d0ad" />
      {roads.map((points, i) => {
        const d = points.map(([x, z], n) => { const p = mapPoint(x, z); return `${n ? 'L' : 'M'}${p.x} ${p.y}`; }).join(' ');
        return <g key={i}><path d={d} fill="none" stroke="#c9bb98" strokeWidth={i === 2 ? 8 : 17} strokeLinecap="round" strokeLinejoin="round" /><path d={d} fill="none" stroke="#f2e8cb" strokeWidth={i === 2 ? 5 : 12} strokeLinecap="round" strokeLinejoin="round" /></g>;
      })}
      <g stroke="#f3ead2" strokeWidth="3"><rect x="244" y="350" width="49" height="29" rx="2" fill="#a9745c" /><rect x="221" y="320" width="23" height="18" fill="#aa8060" /><rect x="459" y="231" width="41" height="26" rx="2" fill="#b89c64" /></g>
      <g><rect x="455" y="398" width="67" height="46" rx="3" fill="#b96951" stroke="#f4e8c9" strokeWidth="3" /><text x="488" y="427" textAnchor="middle" fill="#fff0d8" fontFamily="Arial" fontStyle="italic" fontWeight="bold" fontSize="17">LIVS</text><path d="M459 450v18m15-18v18m15-18v18m15-18v18m15-18v18" stroke="#eee2c1" strokeWidth="2" /></g>
      <g fontFamily="DM Sans, sans-serif" textAnchor="middle" fill="#69795d">
        <text x="117" y="294" fontSize="11" letterSpacing="4" transform="rotate(-32 117 294)">STORSKOGEN</text>
        <text x="582" y="225" fontSize="10" letterSpacing="3">MYRSJÖN</text>
        <text x="523" y="548" fontSize="10" letterSpacing="3" transform="rotate(-18 523 548)">SÖDRA MYREN</text>
      </g>
      <g transform={`translate(${car.x} ${car.y}) rotate(${180 - state.carPosition.heading * 180 / Math.PI})`}><rect x="-4" y="-8" width="8" height="16" rx="2" fill="#537889" stroke="#f7f2de" strokeWidth="2" /></g>
      <g transform={`translate(${player.x} ${player.y})`} filter="url(#map-shadow)"><circle r="12" fill="#fbf7e9" /><path d="m0-8 6 15-6-4-6 4L0-8Z" fill="#d87344" transform={`rotate(${180 - state.position.heading * 180 / Math.PI})`} /></g>
      <g transform="translate(620 524)" fill="#728468"><text y="-18" textAnchor="middle" fontSize="10" fontWeight="700">N</text><path d="m0-11 5 20-5-4-5 4 5-20Z" /><path d="M-12 12h24" stroke="#728468" /><text y="29" fontSize="8" textAnchor="middle">NORRLAND</text></g>
      <g fill="#7e896c" fontFamily="DM Sans, sans-serif" fontSize="9"><path d="M29 550h75m-75-4v8m75-8v8" stroke="#7e896c" /><text x="29" y="572">0</text><text x="80" y="572">25 m</text></g>
    </svg>
    {DESTINATIONS.map(dest => {
      const p = mapPoint(dest.x, dest.z);
      return <button key={dest.id} className={`map-marker ${selected === dest.id ? 'selected' : ''}`} style={{ left: `${p.x / 680 * 100}%`, top: `${p.y / 590 * 100}%` }} onClick={() => onSelect(dest.id)} aria-label={`Välj ${dest.name}`} aria-pressed={selected === dest.id}>
        <span className="map-marker-icon"><DestinationIcon id={dest.id} /></span><span>{dest.id === 'home' ? 'Gården' : dest.name}</span>
      </button>;
    })}
    <div className="map-paper-label"><MapPin size={12} /><span>64° N · DÄR VÄGEN TAR SLUT</span></div>
  </div>;
}
