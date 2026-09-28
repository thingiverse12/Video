import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, ArrowUpRight, Backpack,
  BriefcaseBusiness, CarFront, Check, CheckCheck, CheckCircle2, ChevronRight, Clock3,
  Coins, Compass, Coffee, Flag, Footprints, Heart, HelpCircle, Home, Keyboard,
  Leaf, Map as MapIcon, MapPin, Maximize2, Minimize2, Mouse, Navigation, Pause,
  Play, RotateCcw, Settings2, ShieldAlert, Sparkles, Sun, TreePine, Trees,
  Volume2, VolumeX, Waves, X, Zap, Store, Beef, ShoppingBag, Refrigerator, Monitor, Music2,
} from 'lucide-react';
import type { GameEngine } from './game/engine';
import { DESTINATIONS, INITIAL_SNAPSHOT, MISSIONS, MISSION_IDS, type DestinationId, type GameSnapshot, type Menu, type MissionId, type ToastMessage } from './game/types';
import { Portrait } from './components/Portrait';
import { MiniMap, WorldMap } from './components/WorldMap';
import { TouchControls } from './components/TouchControls';
import { HuntingControls } from './components/HuntingControls';
import { isMobilePlayer } from './game/mobile';

const missionIds = MISSION_IDS;
const MissionIcon = ({ id, size = 19 }: { id: MissionId; size?: number }) => id === 'shop' ? <ShoppingBag size={size} /> : id === 'hunt' ? <TreePine size={size} /> : id === 'rurik' ? <Backpack size={size} /> : <BriefcaseBusiness size={size} />;
const Key = ({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) => <kbd className={`keycap ${wide ? 'wide' : ''}`}>{children}</kbd>;

function MissionArt({ id }: { id: MissionId }) {
  return <div className={`mission-art ${id}`}>
    <svg viewBox="0 0 240 128" fill="none" aria-hidden="true">
      <circle cx="194" cy="24" r="35" fill="currentColor" opacity=".05" />
      <path d="M-5 116c54-42 82-8 126-21s74-21 124-11v50H-5Z" fill="currentColor" opacity=".07" />
      {id === 'shop' ? <>
        <rect x="66" y="39" width="125" height="63" rx="3" fill="#e4d7b7" />
        <path d="M61 39h135V25H61v14Z" fill="#517b63" />
        <text x="72" y="35" fontFamily="Arial" fontWeight="bold" fontStyle="italic" fontSize="12" fill="#fff1d1">MYR</text>
        <text x="106" y="35" fontFamily="Arial" fontWeight="bold" fontSize="8" letterSpacing="1" fill="#fff1d1">MYRBODEN</text>
        <path d="M115 51h22v51h-22z" fill="#8da294" /><path d="M74 51h30v25H74zm74 0h33v25h-33z" fill="#9dae98" />
        <path d="M70 79h34m44 0h37" stroke="#b99167" strokeWidth="3" />
        <rect x="31" y="86" width="56" height="30" rx="5" fill="#fbf4dc" transform="rotate(-10 31 86)" />
        <ellipse cx="59" cy="96" rx="18" ry="8" fill="#b97b65" transform="rotate(-10 59 96)" />
        <path d="m56 90 7 9" stroke="#efd6b3" strokeWidth="3" strokeLinecap="round" />
        <path d="M180 104h31m-29-20 5 15h16l6-15h-27Zm6 21v3m13-3v3" stroke="#79866b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </> : id === 'hunt' ? <>
        <path d="m42 14-17 29h7L17 68h17L18 91h50L53 68h16L53 43h6L42 14Zm147 22-12 24h6l-13 22h37l-12-22h6l-12-24Z" fill="#56764e" opacity=".7" />
        <path d="M42 85v24m146-33v24" stroke="#6b6d48" strokeWidth="4" />
        <path d="m97 83 1 24m35-24 5 24m-27-23-4 24m36-34 5 33" stroke="#746749" strokeWidth="5" strokeLinecap="round" />
        <path d="M92 70c8-7 34-10 48-6l5-17 11-3 8 17-13 9c-4 13-11 18-33 17s-33-8-26-17Z" fill="#8b7955" />
        <path d="m143 47-2-14-10-8m10 9-15 1m30 9 8-17 8-5m-10 11 12 3m-38-9-2-8m-2 16-8-6m43-5 1-7" stroke="#9a8b5e" strokeWidth="3" strokeLinecap="round" />
        <circle cx="155" cy="53" r="1.4" fill="#2f4032" /><path d="m159 57 10 4-8 6-7-5" fill="#6b6546" />
        <path d="m74 105 3-11 4 11m80 5 4-14 4 14" stroke="#91a171" strokeWidth="2" />
      </> : id === 'rurik' ? <>
        <path d="M152 94V45l30-20 31 20v49h-61Z" fill="#c2a677" /><path d="m146 47 35-26 39 27" stroke="#67735a" strokeWidth="8" strokeLinejoin="round" />
        <path d="M174 66h15v28h-15z" fill="#6f795d" /><path d="M199 55h8v12h-8z" fill="#e9dab3" />
        <path d="M51 72h75v27H51z" fill="#bd704b" /><path d="M46 67h85v10H46z" fill="#d48a5c" /><path d="M75 67V54h27v13" stroke="#60674d" strokeWidth="6" strokeLinejoin="round" />
        <path d="M65 76v10m48-10v10" stroke="#e6c593" strokeWidth="5" /><path d="M41 101h92" stroke="#8e8d67" strokeWidth="3" strokeLinecap="round" />
        <path d="m27 45 2-6 3 6 6 2-6 3-3 5-2-5-6-3 6-2Z" fill="#d29c53" />
      </> : <>
        <path d="m35 88 7-11 36 3 23 25H24l11-17Z" fill="#9b9f88" /><path d="m43 77 10-20h26l18 26-54-6Z" fill="#7e8c7e" /><path d="m55 61-6 15 37 3-12-18H55Z" fill="#b5c2af" /><circle cx="42" cy="104" r="8" fill="#526554" /><circle cx="84" cy="104" r="8" fill="#526554" />
        <path d="M137 106V53c0-9 9-13 22-13s23 4 23 13v53h-45Z" fill="#bf9949" /><path d="m152 43 7 16 8-16" fill="#e1c880" /><path d="m159 49-3 7 3 23 3-23-3-7Z" fill="#73907c" /><path d="M147 105v15m24-15v15" stroke="#42594f" strokeWidth="8" />
        <circle cx="159" cy="27" r="14" fill="#ccae86" /><path d="M145 24c-1-19 29-17 28 1l-7-8-21 7Z" fill="#6f6650" /><path d="M146 27h10v5h-10zm15 0h10v5h-10z" fill="#43594c" /><path d="M156 29h5" stroke="#43594c" strokeWidth="2" />
        <rect x="174" y="67" width="24" height="30" rx="2" fill="#c5a56b" transform="rotate(10 174 67)" /><path d="m180 73 13 2m-14 3 12 2m-13 3 9 1" stroke="#f0deb2" strokeWidth="2" />
        <path d="M109 23v13m0 7v2" stroke="#c78c5d" strokeWidth="3" strokeLinecap="round" />
      </>}
    </svg>
    <span className="mission-art-number">0{missionIds.indexOf(id) + 1}</span>
  </div>;
}

export default function App() {
  const appRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const engine = useRef<GameEngine | null>(null);
  const [state, setState] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const [menu, setMenu] = useState<Menu>(null);
  const [dialogue, setDialogue] = useState<'rurik' | 'ebbe' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<(ToastMessage & { id: number })[]>([]);
  const toastCounter = useRef(0);
  const toastTimers = useRef<number[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<DestinationId>('market');
  const [fullscreen, setFullscreen] = useState(false);
  const [mobilePlayer, setMobilePlayer] = useState(isMobilePlayer);
  const [highQuality, setHighQuality] = useState(() => !isMobilePlayer());
  const [volume, setVolume] = useState(45);
  const [musicVolume, setMusicVolume] = useState(30);
  const [confirmReset, setConfirmReset] = useState(false);
  const [guideTab, setGuideTab] = useState<'controls' | 'world'>('controls');
  const [showTouch, setShowTouch] = useState(false);

  useEffect(() => {
    const pointer = window.matchMedia('(pointer: coarse)');
    const update = () => setMobilePlayer(isMobilePlayer());
    const touch = (event: PointerEvent) => { if (event.pointerType === 'touch') setMobilePlayer(true); };
    pointer.addEventListener('change', update);
    window.addEventListener('pointerdown', touch, { passive: true });
    return () => { pointer.removeEventListener('change', update); window.removeEventListener('pointerdown', touch); };
  }, []);

  const toast = useCallback((message: ToastMessage) => {
    const id = ++toastCounter.current;
    setToasts(current => [...current.slice(-2), { ...message, id }]);
    const timer = window.setTimeout(() => setToasts(current => current.filter(t => t.id !== id)), 5300);
    toastTimers.current.push(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Let the page paint the loading state before generating the world.
    const timer = window.setTimeout(async () => {
      if (cancelled || !sceneRef.current) return;
      try {
        const { GameEngine: Engine } = await import('./game/engine');
        if (cancelled || !sceneRef.current) return;
        engine.current = new Engine(sceneRef.current, {
          onUpdate: setState,
          onToast: toast,
          onDialogue: setDialogue,
          onError: setError,
        });
        // A dev hot refresh should honour the preset already shown in the UI.
        engine.current.setQuality(highQuality);
      } catch (e) {
        console.error('Kunde inte starta spelvärlden:', e);
        setError('Din webbläsare kunde inte starta 3D-världen. Prova en uppdaterad webbläsare med WebGL och hårdvaruacceleration.');
      }
    }, 60);
    return () => { cancelled = true; window.clearTimeout(timer); engine.current?.dispose(); engine.current = null; toastTimers.current.forEach(window.clearTimeout); };
  }, [toast]);

  useEffect(() => { engine.current?.setPaused(!!menu || !!dialogue); }, [menu, dialogue]);
  useEffect(() => { engine.current?.setDialogueOpen(!!dialogue); }, [dialogue]);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, select') || target.isContentEditable) return;
      if (e.code === 'Escape') { e.preventDefault(); if (dialogue) setDialogue(null); else setMenu(current => current ? null : state.started ? 'pause' : null); }
      if (e.code === 'KeyM') { e.preventDefault(); setDialogue(null); setMenu(current => current === 'map' ? null : 'map'); }
      if (e.code === 'KeyI') { e.preventDefault(); setDialogue(null); setMenu(current => current === 'missions' ? null : 'missions'); }
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [dialogue, state.started]);

  // All modal controls are reachable with the keyboard, and focus stays in the dialog.
  useEffect(() => {
    if (!menu && !dialogue) return;
    const previous = document.activeElement as HTMLElement;
    const timer = window.setTimeout(() => modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus(), 10);
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = [...modalRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, [tabindex="0"]')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', trap);
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', trap); previous?.focus?.({ preventScroll: true }); };
  }, [menu, dialogue]);

  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (appRef.current?.requestFullscreen) await appRef.current.requestFullscreen();
      else setFullscreen(f => !f);
    } catch { setFullscreen(f => !f); }
  };
  const closeModal = () => { setMenu(null); setDialogue(null); setConfirmReset(false); };
  const play = () => { closeModal(); engine.current?.start(); };
  const travel = () => { engine.current?.travel(selectedPlace); closeModal(); };
  const active = MISSIONS[state.activeMission];
  const progress = state.progress[state.activeMission];
  const completed = missionIds.filter(id => state.progress[id] === 3).length;
  const place = DESTINATIONS.find(d => d.id === selectedPlace)!;
  const waypoint = state.waypoint ? DESTINATIONS.find(d => d.id === state.waypoint) : null;
  const homeInfo = state.onStairs
    ? { kicker: 'DEN GAMLA TRÄTRAPPAN', title: 'Ett steg i taget…', text: 'Vännerna går mellan våningarna. Snart framme.' }
    : state.homeFloor === 1
      ? { kicker: 'ÖVERVÅNINGEN · EBBES RUM', title: state.computerOn ? 'Datorn surrar.' : 'Ebbes krypin.', text: state.computerOn ? 'Den gamla datorn är igång. E stänger av. E vid trappan går ner igen.' : 'Gå fram till den gamla datorn och tryck E. Trätrappan tar dig ner igen.' }
      : state.fridgeOpen
        ? { kicker: 'DEN GAMLA KYLEN', title: 'Lite kvar i kylen.', text: 'örtkräm och en halv gurka på hyllan. E vid kylen stänger dörren.' }
        : { kicker: 'TV-RUM · MATPLATS', title: state.hasRifle ? 'Välkommen hem.' : 'Glöm inte geväret.', text: state.hasRifle ? 'E öppnar kylen. Vid matplatsens trätrappa går E upp till Ebbes rum.' : 'Geväret står längst in till vänster. Trätrappan vid matplatsen går upp till Ebbe.' };
  const modalTitle = dialogue ? 'En liten pratstund' : menu === 'missions' ? 'Vad hittar vi på?' : menu === 'map' ? 'Välkommen till vischan.' : menu === 'guide' ? 'Inte så krångligt.' : menu === 'settings' ? 'Precis som du vill ha det.' : 'En liten kaffepaus.';

  return <div className={`app ${fullscreen ? 'is-fullscreen' : ''} ${mobilePlayer ? 'touch-device' : ''}`} ref={appRef}>
    <header className="site-header">
      <button className="brand" onClick={() => { setMenu(null); setDialogue(null); }} aria-label="Nils och Ebbe — tillbaka till spelet">
        <span className="brand-emblem"><Trees size={30} strokeWidth={1.7} /><span className="emblem-ground" /></span>
        <span className="brand-wordmark">GRÅMYREN<small>ETT EGET SKOGSÄVENTYR</small></span>
      </button>
      <nav className="main-nav" aria-label="Huvudmeny">
        <button aria-label="Spela" className={!menu ? 'active' : ''} onClick={() => { setMenu(null); setDialogue(null); }}><Play size={15} fill={!menu ? 'currentColor' : 'none'} /><span>Spela</span></button>
        <button aria-label="Uppdrag" className={menu === 'missions' ? 'active' : ''} onClick={() => setMenu(menu === 'missions' ? null : 'missions')}><Flag size={16} /><span>Uppdrag</span>{completed > 0 && <span className="nav-count">{completed}</span>}</button>
        <button aria-label="Världskarta" className={menu === 'map' ? 'active' : ''} onClick={() => setMenu(menu === 'map' ? null : 'map')}><MapIcon size={16} /><span>Världskarta</span></button>
        <button aria-label="Spelguide" className={menu === 'guide' ? 'active' : ''} onClick={() => setMenu(menu === 'guide' ? null : 'guide')}><HelpCircle size={16} /><span>Spelguide</span></button>
      </nav>
      <div className="header-tools">
        <span className="version-tag"><span /> FRI VÄRLD <b>v0.8</b></span>
        <div className="header-divider" />
        <button className={`icon-button music-toggle ${state.music ? 'enabled' : ''}`} title={state.music ? 'Stäng av musik' : 'Slå på musik'} aria-label={state.music ? 'Stäng av musik' : 'Slå på musik'} aria-pressed={state.music} disabled={!state.ready} onClick={() => engine.current?.toggleMusic()}><Music2 size={18} /></button>
        <button className={`icon-button ${state.sound ? 'enabled' : ''}`} title={state.sound ? 'Stäng av spelljud' : 'Slå på spelljud'} aria-label={state.sound ? 'Stäng av spelljud' : 'Slå på spelljud'} onClick={() => engine.current?.toggleSound()}>{state.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
        <button className="icon-button" title="Inställningar" aria-label="Inställningar" onClick={() => setMenu('settings')}><Settings2 size={18} /></button>
      </div>
    </header>

    <main className="main-content">
      <section className={`game-stage ${state.started ? 'is-playing' : 'is-intro'} ${!state.ready ? 'is-loading' : ''} ${state.aiming ? 'is-aiming' : ''}`} aria-label="Nils och Ebbe — spelet" data-input-mode={mobilePlayer ? 'touch' : 'keyboard'} data-player-x={state.position.x.toFixed(2)} data-player-z={state.position.z.toFixed(2)} data-inside-home={state.insideHome} data-has-rifle={state.hasRifle} data-fridge-open={state.fridgeOpen} data-home-floor={state.homeFloor} data-on-stairs={state.onStairs} data-computer-on={state.computerOn} data-player-y={state.position.y.toFixed(2)} data-music={state.music} data-camera-yaw={state.cameraYaw.toFixed(4)} data-camera-distance={(state.cameraDistance ?? 15.8).toFixed(2)} data-player-heading={state.position.heading.toFixed(4)} data-walk-speed={state.walkSpeed.toFixed(3)} data-render-quality={highQuality ? 'finfin' : 'lagom'} data-aiming={state.aiming} data-aim-placed={state.aimPlaced} data-shots-fired={state.shotsFired} data-shots-hit={state.shotsHit} data-projectiles={JSON.stringify(state.projectiles)} data-hunt-targets={JSON.stringify(state.huntTargets)} data-shot-feedback={state.shotFeedback}>
        <div className="scene-container" ref={sceneRef} />
        <div className="scene-vignette" />
        {!state.started && <div className="intro-shade" />}

        {!state.ready && !error && <div className="loading-screen"><Trees size={42} strokeWidth={1.3} /><span className="eyebrow">EN BIT BORT FRÅN ALLT</span><h2>På väg till Gråmyren…</h2><span className="loading-line"><i /></span><p>Packar kaffet och värmer upp bilen.</p></div>}
        {error && <div className="loading-screen error-screen"><TreePine size={40} /><h2>Vi kom inte riktigt fram.</h2><p>{error}</p><button className="primary-button" onClick={() => window.location.reload()}><RotateCcw size={16} />Försök igen</button></div>}

        {state.ready && <>
          <div className="location-hud"><span className="location-icon"><MapPin size={16} /></span><span><strong>{state.location}</strong><small>GRÅMYREN, NORRLAND</small></span></div>
          <div className="weather-hud"><Sun size={15} /><span>{state.time}</span><i /><span>16°</span></div>
          <div className="resources-hud">
            <div className="health-meter" aria-label={`Hälsa: ${Math.round(state.health)} av 100`} title={`Hälsa: ${Math.round(state.health)} / 100`}>
              {[0, 1, 2].map(i => <Heart key={i} size={16} className={state.health > i * 33.33 ? 'full' : 'empty'} fill={state.health > i * 33.33 ? 'currentColor' : 'none'} strokeWidth={1.7} />)}
            </div><i /><div className="wallet"><Coins size={18} /><strong>{state.money.toLocaleString('sv-SE')}</strong><span>kr</span></div>
          </div>

          {!state.started && <button className="store-teaser" onClick={() => { setSelectedPlace('market'); setMenu('map'); }}><Store size={13} /><b>NYTT</b><span>Myrboden</span><ArrowUpRight size={13} /></button>}
          {!state.started && <div className="welcome-panel">
            <div className="welcome-eyebrow"><span /> INGEN STRESS. LITE HYSS.</div>
            <h1>SKOGEN VÄNTAR.<br /><span>PLANER KAN ÄNDRAS.</span></h1>
            <p>Två vänner delar en gammal skogsstuga.<br />Den ena lagar. Den andra hittar omvägar.</p>
            <div className="welcome-badges"><span><Trees size={13} />Fri värld</span><span><Flag size={12} />Fyra upptåg</span><span><Coffee size={13} />Ingen stress</span></div>
            <button className="start-button" onClick={play}><Play size={16} fill="currentColor" /><span>{state.saved ? 'Fortsätt äventyret' : 'Nu kör vi'}</span><ArrowRight size={19} /></button>
            <span className="welcome-footnote">Helt fritt. Här börjar äventyret.</span>
          </div>}

          <aside className={`objective-card ${progress === 3 ? 'is-complete' : ''}`}>
            <div className="objective-eyebrow"><span className="objective-symbol">{progress === 3 ? <Check size={15} /> : <MissionIcon id={state.activeMission} size={15} />}</span><span>{progress === 3 ? 'SNYGGT JOBBAT' : 'DAGENS UPPTÅG'}</span><span className="objective-counter">0{missionIds.indexOf(state.activeMission) + 1}</span></div>
            <h2>{active.title}</h2>
            <p>{progress === 3 ? 'Det där gick ju nästan enligt plan. Dags för nästa dåliga idé?' : state.activeMission === 'hunt' && state.hasRifle ? 'Geväret är med. Vid jaktmarken: välj Sikta, sikta på älgen och Skjut. Kulan måste träffa.' : active.short}</p>
            <div className="objective-next">{progress === 3 ? <CheckCircle2 size={15} /> : <span className="objective-dot" />}<span>{progress === 3 ? 'Uppdrag slutfört' : active.steps[Math.min(progress, 2)]}</span></div>
            <div className="objective-progress" aria-label={`${progress} av 3 steg klara`}>{[0, 1, 2].map(i => <span key={i} className={progress > i ? 'done' : progress === i ? 'current' : ''} />)}</div>
            <button className="objective-footer" onClick={() => setMenu('missions')}><span>Alla uppdrag</span><span>{completed}/{missionIds.length} <ArrowUpRight size={14} /></span></button>
          </aside>

          {state.started && state.wanted > 0 && <div className="mischief-hud"><ShieldAlert size={14} /><span>{state.wanted === 1 ? 'Lite misstänkt' : state.wanted === 2 ? 'Någon är förbannad' : 'Nu är det livat'}</span><span className="mischief-dots">{[0, 1, 2].map(i => <i key={i} className={state.wanted > i ? 'on' : ''} />)}</span></div>}
          {state.started && waypoint && <button className="waypoint-hud" onClick={() => { setSelectedPlace(waypoint.id); setMenu('map'); }}><Navigation size={14} /><span>{waypoint.name}</span><b>{Math.round(Math.hypot(state.position.x - waypoint.x, state.position.z - waypoint.z))} m</b></button>}

          {state.started && (state.insideShop || state.carryingMeat) && <aside className={`shop-hud ${state.carryingMeat ? 'carrying' : ''}`} aria-label="Butiksuppdrag">
            <div className="shop-hud-title"><span>{state.carryingMeat ? <Beef size={19} /> : <Store size={19} />}</span><div><small>{state.carryingMeat ? 'KÖTT I PÅSEN' : 'MYRBODEN'}</small><strong>{state.carryingMeat ? 'Nu gäller det att komma hem.' : state.progress.shop === 3 ? 'Middagen är redan fixad.' : 'Bara ett litet köttpaket…'}</strong></div></div>
            {state.carryingMeat ? <><div className="shop-risk-label"><span>{state.shopRisk > 0 ? 'Marta är er på spåren' : 'Ni har skakat av er Marta'}</span><b>{Math.round(state.shopRisk)}%</b></div><div className="shop-risk-meter" role="progressbar" aria-label="Risk att bli upptäckt" aria-valuenow={Math.round(state.shopRisk)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${state.shopRisk}%` }} /></div><p>Gå eller kör bilen hem. Snabbresa är pausad medan ni har köttet.</p><button onClick={() => { setSelectedPlace('home'); setMenu('map'); }}><MapPin size={12} />Visa gården<ArrowUpRight size={12} /></button></> : <p>{state.progress.shop === 3 ? 'Ni har klarat butiksuppdraget. Marta behöver en paus från er.' : 'Gå till köttdisken till vänster. E försöker ta ett paket. Blir ni tagna kan ni försöka igen.'}</p>}
          </aside>}

          {state.started && state.insideHome && <aside className={`home-hud ${state.hasRifle ? 'equipped' : ''} ${state.fridgeOpen ? 'fridge-open' : ''} ${state.homeFloor === 1 ? 'upstairs' : ''}`} aria-label="Hemma hos vännerna">
            <span className="home-hud-icon">{state.onStairs ? <ArrowUp size={19} /> : state.homeFloor === 1 ? <Monitor size={19} /> : state.fridgeOpen ? <Refrigerator size={19} /> : <Home size={19} />}</span>
            <div><small>{homeInfo.kicker}</small><strong>{homeInfo.title}</strong><p>{homeInfo.text}</p></div>
          </aside>}

          <div className="world-labels" aria-hidden="true">{state.labels.map(label => <span key={label.id} className={`world-label ${label.kind} ${label.id === state.character ? 'selected' : ''}`} style={{ left: label.x, top: label.y }}>{label.kind === 'car' && <CarFront size={12} />}{label.kind === 'target' && <span className="label-dot" />}{label.text}{label.id === state.character && <span className="you-dot" />}</span>)}</div>

          <button className="character-card" onClick={() => engine.current?.switchCharacter()} aria-label={`Byt till ${state.character === 'nils' ? 'Ebbe' : 'Nils'}`} title="Byt figur · V">
            <Portrait character={state.character} className="character-portrait" /><span className="character-info"><small>DU SPELAR SOM</small><strong>{state.character === 'nils' ? 'Nils' : 'Ebbe'}</strong><span className={`equipment-status ${state.hasRifle ? 'equipped' : ''}`} title={state.hasRifle ? 'Jaktgeväret är hämtat och följer med när du byter figur.' : 'Hämta jaktgeväret inne i huset innan du jagar.'}>{state.hasRifle ? <Check size={10} /> : <Backpack size={10} />}{state.hasRifle ? 'Gevär med' : 'Inget gevär'}</span></span><span className="character-switch"><ArrowLeftRight size={15} /><Key>V</Key></span>
          </button>

          {state.started && state.context && <button className="interact-prompt" onClick={() => engine.current?.interact()}><Key>E</Key><span>{state.context}</span><ChevronRight size={15} /></button>}
          {state.started && state.inCar && <div className="speedometer"><strong>{state.speed}</strong><span>KM/H</span><i /><CarFront size={19} /><small>kombi<br />BLÅ FARAN</small></div>}

          <div className={`control-hud ${state.started ? '' : 'intro-control'}`}>
            {state.started ? <>
              <span><span className="wasd-keys">WASD</span><small>{state.inCar ? 'Kör' : 'Gå'}</small></span><i />
              <span><Key wide>{state.inCar ? 'SPACE' : 'SHIFT'}</Key><small>{state.inCar ? 'Bromsa' : 'Spring'}</small></span><i />
              <button onClick={() => engine.current?.primaryAction()} disabled={state.aiming && (!state.aimPlaced || state.shotCooldown > 0)} title={state.aiming ? 'Skjut med F eller mellanslag' : state.inCar ? 'Tuta med F eller H' : 'Slå med F'}><Key>F</Key><small>{state.aiming ? 'Skjut' : state.inCar ? 'Tuta' : 'Slå'}</small></button><i />
              <button onClick={() => setMenu('pause')}><Key wide>ESC</Key><small>Paus</small></button>
            </> : <><Mouse size={16} strokeWidth={1.5} /><span>Dra för att se dig omkring</span><span className="hint-dot" /><span>Scrolla för att zooma</span></>}
          </div>

          <HuntingControls state={state} onAim={() => engine.current?.toggleAiming()} onShoot={() => engine.current?.shoot()} />
          <MiniMap state={state} onOpen={() => setMenu('map')} />
          <button className="fullscreen-button" onClick={toggleFullscreen} title={fullscreen ? 'Avsluta helskärm' : 'Helskärm'} aria-label={fullscreen ? 'Avsluta helskärm' : 'Helskärm'}>{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
          {state.started && !mobilePlayer && <button className="touch-toggle" onClick={() => setShowTouch(!showTouch)} aria-pressed={showTouch} aria-label="Visa touchkontroller"><Keyboard size={18} /></button>}
          {state.started && <TouchControls forced={mobilePlayer || showTouch} disabled={!!menu || !!dialogue || state.onStairs} inCar={state.inCar} aiming={state.aiming} canShoot={state.canAim && state.aimPlaced && state.shotCooldown <= 0}
            onInput={(pointer, keys) => engine.current?.setTouchInput(pointer, keys)}
            onClear={() => engine.current?.clearTouchInput()}
            onInteract={() => engine.current?.interact()} onAction={() => engine.current?.primaryAction()} />}
        </>}

        <div className="toast-stack" aria-live="polite">{toasts.map(t => <div key={t.id} className={`toast ${t.kind ?? 'info'}`}><span className="toast-icon">{t.kind === 'success' ? <CheckCircle2 size={20} /> : t.kind === 'warning' ? <ShieldAlert size={20} /> : <Leaf size={20} />}</span><div><strong>{t.title}</strong>{t.detail && <p>{t.detail}</p>}</div><button onClick={() => setToasts(current => current.filter(other => other.id !== t.id))} aria-label="Stäng notis"><X size={13} /></button></div>)}</div>
      </section>

      <footer className="site-footer"><span><span className="footer-dot" />ETT FRISTÅENDE SKOGSÄVENTYR<span className="footer-separator">/</span><a href="/licenses/NOTICE.txt" target="_blank" rel="noopener noreferrer">LICENSER</a></span><span className="footer-middle"><TreePine size={13} /> Långt från stan. Nära till trubbel.</span><button onClick={() => { setGuideTab('world'); setMenu('guide'); }}><CheckCheck size={14} /><span>{state.saved ? 'Framstegen är sparade lokalt' : 'Dina framsteg sparas lokalt'}</span></button></footer>
    </main>

    {(menu || dialogue) && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className={`modal modal-${dialogue ? 'dialogue' : menu}`} ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close icon-button" onClick={closeModal} aria-label="Stäng"><X size={19} /></button>
        <header className="modal-header"><span className="eyebrow">{dialogue ? 'ORD ÄR OCKSÅ ETT ALTERNATIV' : menu === 'missions' ? 'FYRA SÄTT ATT STÄLLA TILL DET' : menu === 'map' ? 'EN LITEN PLATS. STORA MÖJLIGHETER.' : menu === 'guide' ? 'EN SNABB GENOMGÅNG' : menu === 'settings' ? 'INSTÄLLNINGAR' : 'SPELET ÄR PAUSAT'}</span><h2 id="modal-title">{modalTitle}</h2>{menu === 'missions' && <p>Ingen chef. Inga tider att passa. Bara några riktigt tveksamma idéer.</p>}{menu === 'map' && <p>Välj en plats, sätt en vägpunkt eller ta en genväg genom skogen.</p>}</header>

        {menu === 'missions' && <>
          <div className="mission-list">{missionIds.map(id => {
            const m = MISSIONS[id], p = state.progress[id], done = p === 3;
            return <article className={`mission-tile ${state.activeMission === id ? 'tracked' : ''}`} key={id}>
              <MissionArt id={id} /><div className="mission-tile-body"><span className="eyebrow">{m.kicker}</span><h3>{m.title}</h3><p>{m.description}</p><ol className="mission-checklist">{m.steps.map((step, i) => <li key={step} className={p > i ? 'done' : ''}><span>{p > i ? <Check size={11} strokeWidth={3} /> : i + 1}</span>{step}</li>)}</ol>
                <div className="mission-reward"><span><Coins size={15} />{m.reward} kr</span><small>{done ? 'KLART!' : `${p} / 3 STEG`}</small></div>
                <button disabled={done} className={`mission-action ${state.activeMission === id ? 'primary-button' : 'secondary-button'}`} onClick={() => { engine.current?.trackMission(id); if (id === 'bailiff') engine.current?.summonBailiffs(); else engine.current?.start(); closeModal(); }}>{done ? <><CheckCheck size={15} />Avklarat</> : <>{id === 'bailiff' && !state.bailiffsActive ? 'Framkalla besöket' : state.activeMission === id ? 'Fortsätt uppdraget' : 'Följ uppdraget'}<ArrowRight size={15} /></>}</button>
              </div>
            </article>;
          })}</div>
          <div className="modal-footnote"><Compass size={15} /><span>Du behöver inte följa planen. Hela världen är öppen från början.</span><b>{completed} av {missionIds.length} klara</b></div>
        </>}

        {menu === 'map' && <div className="map-layout"><WorldMap state={state} selected={selectedPlace} onSelect={setSelectedPlace} /><aside className="map-place-panel"><span className="place-icon">{place.id === 'market' ? <Store size={30} strokeWidth={1.5} /> : place.id === 'forest' ? <Trees size={30} strokeWidth={1.5} /> : place.id === 'lake' ? <Waves size={30} strokeWidth={1.5} /> : <Home size={28} strokeWidth={1.5} />}</span><span className="eyebrow">{place.subtitle}</span><h3>{place.name}</h3><p>{place.description}</p><div className="map-distance"><Footprints size={16} /><span>Från dig</span><b>{Math.round(Math.hypot(state.position.x - place.x, state.position.z - place.z))} m</b></div><button className="primary-button" onClick={() => { engine.current?.setWaypoint(place.id); closeModal(); }}><MapPin size={16} />Sätt vägpunkt<ArrowRight size={16} /></button><button className="secondary-button" onClick={travel} disabled={state.carryingMeat}><Zap size={15} />Snabbresa hit</button><span className="map-travel-note">{state.carryingMeat ? 'Ingen snabbresa med köttpåsen. Följ vägpunkten hem.' : state.inCar ? 'Bilen följer med på resan.' : 'Genvägen är gratis. Bilen står kvar.'}</span><div className="map-legend"><span><i className="legend-player" />Du</span><span><i className="legend-car" />bilen</span><span><i className="legend-target" />Vägpunkt</span></div></aside></div>}

        {menu === 'guide' && <>
          <div className="modal-tabs"><button className={guideTab === 'controls' ? 'active' : ''} onClick={() => setGuideTab('controls')}><Keyboard size={16} />Kontroller</button><button className={guideTab === 'world' ? 'active' : ''} onClick={() => setGuideTab('world')}><Compass size={16} />Livet i Gråmyren</button></div>
          {guideTab === 'controls' ? <div className="guide-content"><div className="control-list">{[
            ['WASD', 'Gå eller kör', 'Piltangenterna går också, men flyttar siktet när geväret är höjt.'], ['SHIFT', 'Spring', 'När det är lite bråttom därifrån.'], ['E', 'Interagera', 'Gå in i huset, hämta geväret eller låna. Vid en älg tar E fram siktet.'], ['Q', 'Sikta med geväret', 'Hämta geväret först. Q eller högerklick tar fram/lägger ner det.'], ['F', 'Skjut / slå', 'Skjuter när du siktar med geväret. Annars tecknade slagsmål.'], ['V', 'Byt figur', 'Spela som Nils eller Ebbe.'], ['SPACE', 'Skjut / bromsa', 'Med siktet framme skjuter du. I bilen bromsar du.'], ['H', 'Tuta', 'bilens viktigaste funktion.'], ['M / I', 'Karta / uppdrag', 'Hitta rätt eller hitta på något.'],
          ].map(([key, title, text]) => <div className="guide-control" key={key}><Key wide>{key}</Key><span><strong>{title}</strong><small>{text}</small></span></div>)}</div><div className="guide-camera"><Mouse size={23} strokeWidth={1.4} /><div><strong>Se dig omkring</strong><p>Utan siktet: dra för att vrida kameran och scrolla för att zooma. Med siktet: placera det med musen eller piltangenterna först. Vänsterklick, F eller mellanslag skjuter kombi. På pekskärm pekar eller drar du siktet och trycker Skjut. Esc pausar.</p></div></div><button className="guide-touch-button" onClick={() => { setShowTouch(true); engine.current?.start(); closeModal(); }}><Keyboard size={16} />På mobil visas knapparna automatiskt. Visa touchkontroller här<ArrowRight size={15} /></button></div> : <div className="world-guide"><div><Store size={24} /><h3>Myrboden</h3><p>Gå fram till entrén och tryck E. Inne i den fiktiva butiken finns köttdisken till vänster. Försök ta ett paket med E och ta det hem. Marta kan stoppa er: då lämnas köttet tillbaka och ni får försöka igen. Shift springer. Ingen snabbresa med köttpåsen.</p></div><div><CarFront size={24} /><h3>Blå faran · femdörrars kombi</h3><p>Gå fram till den blå bilen och tryck E. Ebbe hänger med. Kör på grusvägen eller ta den tveksamma vägen genom skogen.</p></div><div><Refrigerator size={24} /><h3>Gammalt men hemtrevligt</h3><p>Huset har nedsuttna soffor, en tjock-tv framför soffan, blekta tapeter och en diskho full med smutsig disk. Gå fram till det lilla gamla kylskåpet och tryck E för att öppna. På hyllan står en tub örtkräm och en halv gurka. E stänger igen. Samma E-knapp fungerar på pekskärmen.</p></div><div><Monitor size={24} /><h3>Ebbes rum på övervåningen</h3><p>Tv-rummet och matplatsen är avskärmade med väggar och öppna dörrpassager. Gå in på matplatsen och fram till trätrappan längs vänstra väggen. E går upp. På övervåningen finns Ebbes sovrum med en gammal beige dator, tjockskärm, tangentbord och mus. E startar och stänger av datorn. Gå tillbaka till trappan och tryck E för att gå ner.</p></div><div><Home size={24} /><h3>Geväret står hemma</h3><p>Gå till verandan på det röda huset och tryck E för att gå in. Geväret står längst in till vänster. Gå nära och hämta det med E. Det följer med när du byter figur och sparas till nästa gång. Gå tillbaka till dörren och tryck E för att gå ut.</p></div><div><TreePine size={24} /><h3>Skogens konung</h3><p>Utan jaktgeväret går det inte att jaga. När det är hämtat: ta dig till jaktmarken och kliv ur. Tryck Q eller Sikta, placera siktet på älgen och vänsterklicka, tryck mellanslag eller Skjut. En synlig kula lämnar pipan. Bara en verklig träff räknas; missar och hinder ger ingen belöning. Ingen automatisk siktning. Du måste själv placera siktet innan skottet kan avlossas. F skjuter när geväret är höjt; sänk det med Q eller E för att slåss igen. Geväret är bara för tecknad älgjakt.</p></div><div><Backpack size={24} /><h3>Reparationer och omvägar</h3><p>Rurik arbetar i sin verkstad. Prata med E, slåss med F eller ta verktygslådan från bordet. Kom undan för att klara uppdraget.</p></div><div><BriefcaseBusiness size={24} /><h3>Besök som inte bjudits in</h3><p>Mätarlaget vill lägga en stig genom gården efter tre minuters speltid. Du kan också framkalla besöket under Uppdrag. Tre tecknade träffar per mätare räcker.</p></div><div className="guide-save-note"><CheckCheck size={20} /><span><strong>Inga konton. Inget krångel.</strong><p>Pengar, uppdragssteg, jaktgevär och vald figur sparas i den här webbläsaren. Du startar alltid hemma. Nollställ under Inställningar.</p></span></div></div>}
          <div className="original-note"><Leaf size={16} /><p>Gråmyren är en påhittad plats med egna figurer, egen butik och egen musik. Alla upptåg stannar i spelet.</p></div>
        </>}

        {menu === 'settings' && <div className="settings-content">
          <div className="setting-row music-setting"><div className="setting-label"><Music2 size={20} /><span><strong>Bakgrundsmusik · Myrstigen</strong><small>En lugn, egen folkmusikinspirerad slinga. Dämpas i dialoger.</small></span></div><button className={`toggle ${state.music ? 'on' : ''}`} disabled={!state.ready} onClick={() => engine.current?.toggleMusic()} aria-label="Bakgrundsmusik" role="switch" aria-checked={state.music}><span /></button></div>
          <div className="setting-volume"><span>Musikvolym</span><input type="range" min="0" max="100" value={musicVolume} aria-label="Musikvolym" onChange={e => { const v = Number(e.target.value); setMusicVolume(v); engine.current?.setMusicVolume(v / 100); }} /><b>{musicVolume}%</b></div>
          <div className="setting-row"><div className="setting-label"><Volume2 size={20} /><span><strong>Lite ljud från vischan</strong><small>Fåglar, fotsteg och en trött bilmotor.</small></span></div><button className={`toggle ${state.sound ? 'on' : ''}`} onClick={() => engine.current?.toggleSound()} aria-label="Spelljud" role="switch" aria-checked={state.sound}><span /></button></div>
          <div className="setting-volume"><span>Spelljud</span><input type="range" min="0" max="100" value={volume} aria-label="Ljudvolym" onChange={e => { const v = Number(e.target.value); setVolume(v); engine.current?.setVolume(v / 100); }} /><b>{volume}%</b></div>
          <div className="setting-row"><div className="setting-label"><Sun size={20} /><span><strong>Hur fin ska skogen vara?</strong><small>Lagom har mjuka markskuggor och passar pekskärmar. Finfin lägger till solskuggor och högre upplösning.</small></span></div><div className="segmented"><button className={!highQuality ? 'selected' : ''} onClick={() => { setHighQuality(false); engine.current?.setQuality(false); }}>Lagom</button><button className={highQuality ? 'selected' : ''} onClick={() => { setHighQuality(true); engine.current?.setQuality(true); }}>Finfin</button></div></div>
          <div className="setting-row"><div className="setting-label"><Maximize2 size={20} /><span><strong>Mer Norrland på skärmen</strong><small>Spela utan sådant som stör.</small></span></div><button className="text-button" onClick={toggleFullscreen}>{fullscreen ? 'Lämna helskärm' : 'Helskärm'}<ArrowUpRight size={16} /></button></div>
          <div className="reset-section"><div className="setting-label"><RotateCcw size={20} /><span><strong>En helt ny dag</strong><small>Radera sparade framsteg och börja om.</small></span></div>{!confirmReset ? <button className="text-button danger" onClick={() => setConfirmReset(true)}>Börja om</button> : <div className="reset-confirmation"><p>Pengar, uppdrag och utrustning återställs. Säkert?</p><button className="secondary-button" onClick={() => setConfirmReset(false)}>Avbryt</button><button className="danger-button" onClick={() => { engine.current?.reset(); closeModal(); }}>Ja, börja om</button></div>}</div>
          <button className="primary-button settings-done" onClick={closeModal}>Så där ja<Check size={16} /></button>
        </div>}

        {menu === 'pause' && <div className="pause-content"><div className="pause-art"><Coffee size={49} strokeWidth={1.25} /><span>KAFFET KAN VÄNTA.<br />ÄVENTYRET LIKASÅ.</span></div><p>Skogen står kvar. Ta den tid du behöver.</p><button className="primary-button" onClick={closeModal}><Play size={16} fill="currentColor" />Fortsätt äventyret<ArrowRight size={17} /></button><button className="secondary-button" onClick={() => setMenu('missions')}><Flag size={16} />Se uppdrag<span>{completed}/{missionIds.length}</span></button><div className="pause-links"><button onClick={() => setMenu('guide')}><HelpCircle size={15} />Spelguide</button><button onClick={() => setMenu('settings')}><Settings2 size={15} />Inställningar</button></div><span className="pause-saved"><CheckCheck size={14} />Framstegen sparas automatiskt</span></div>}

        {dialogue && <div className="dialogue-content"><div className="dialogue-speaker">{dialogue === 'ebbe' ? <Portrait character={state.character === 'nils' ? 'ebbe' : 'nils'} /> : <span className="rurik-avatar">R<span>〰</span></span>}<span><small>DU PRATAR MED</small><strong>{dialogue === 'rurik' ? 'Rurik' : state.character === 'nils' ? 'Ebbe' : 'Nils'}</strong></span></div><blockquote>”{dialogue === 'rurik' ? (state.progress.rurik >= 2 ? 'Jag vet att ni har mina grejer. Jag VET det.' : 'Jaha? Ni igen. Vad vill ni nu då?') : state.character === 'nils' ? 'Ska vi dra till skogen? Jag har en riktigt bra dålig idé.' : 'Bara vi får igång bilen så löser sig resten.'}”</blockquote><div className="dialogue-choices"><button onClick={() => { if (dialogue === 'rurik') engine.current?.talk('forest'); else engine.current?.setWaypoint('forest'); closeModal(); }}><span>Var ligger jaktmarken?</span><ArrowRight size={16} /></button>{dialogue === 'rurik' && <button onClick={() => { engine.current?.talk('toolbox'); closeModal(); }}><span>Fin verktygslåda du har…</span><ArrowRight size={16} /></button>}<button onClick={() => { engine.current?.talk('bye'); closeModal(); }}><span>{dialogue === 'rurik' ? 'Bara kikar. Vi drar nu.' : 'Nu kör vi!'}</span><ArrowRight size={16} /></button></div></div>}
      </div>
    </div>}
  </div>;
}
