import React, { useState } from 'react';
import { 
  Map as MapIcon, Box, Search, Filter, Layers, 
  Sun, Moon, CloudRain, CloudSnow, Flame, Wind, 
  Volume2, VolumeX, Globe, BookOpen, Scroll, Camera, 
  Plus, Ruler, Eye, EyeOff, Compass, Crosshair, ChevronDown 
} from 'lucide-react';
import { POI_CATEGORIES } from '../data/worldData';
import { audio } from '../utils/audio';

export default function MapControls({
  viewMode,
  setViewMode,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  timeOfDay,
  setTimeOfDay,
  weather,
  setWeather,
  isMuted,
  setIsMuted,
  isSwedish,
  setIsSwedish,
  onOpenJournal,
  onOpenCompendium,
  onOpenPhoto,
  onStartAddPin,
  measuringMode,
  setMeasuringMode,
  showGrid,
  setShowGrid,
  showRegionBorders,
  setShowRegionBorders,
  showContours,
  setShowContours,
  fogOfWarRevealed,
  setFogOfWarRevealed,
  pois,
  discoveredCount,
  completedCount
}) {
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showAtmosphereMenu, setShowAtmosphereMenu] = useState(false);

  const totalPOIs = pois.length;
  const progressPercent = Math.round((discoveredCount / totalPOIs) * 100);

  const weatherOptions = [
    { id: 'clear', label: 'Klart', labelEn: 'Clear', icon: Sun },
    { id: 'rain', label: 'Regn & Åska', labelEn: 'Rain & Storm', icon: CloudRain },
    { id: 'snow', label: 'Snöstorm', labelEn: 'Blizzard', icon: CloudSnow },
    { id: 'ashfall', label: 'Asknedfall', labelEn: 'Ashfall', icon: Flame },
  ];

  return (
    <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-4 flex flex-col gap-3">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pointer-events-auto bg-slate-950/85 backdrop-blur-xl border border-amber-500/30 rounded-2xl px-5 py-3 shadow-2xl">
        
        {/* World Title & Stats Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-base font-bold font-serif gold-gradient-text tracking-wide uppercase leading-none">
                Aethelgard
              </h1>
              <span className="text-[10px] text-amber-200/70 uppercase tracking-widest font-mono">
                {isSwedish ? "Öppen Världskarta" : "Open World Atlas"}
              </span>
            </div>
          </div>

          {/* Progress Tracker Pill */}
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-800">
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                <span>{isSwedish ? "Utforskat" : "Explored"}</span>
                <span className="text-amber-300 font-bold font-mono">{progressPercent}%</span>
              </div>
              <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {discoveredCount}/{totalPOIs} POIs
            </span>
          </div>
        </div>

        {/* View Mode Toggle (2D Map / 3D World) */}
        <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-inner">
          <button
            onClick={() => { setViewMode('2d'); audio.playClick(); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === '2d' 
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>2D {isSwedish ? "Karta" : "Map"}</span>
          </button>

          <button
            onClick={() => { setViewMode('3d'); audio.playClick(); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === '3d' 
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D {isSwedish ? "Värld" : "World"}</span>
          </button>
        </div>

        {/* Quick Utilities & Modals Trigger */}
        <div className="flex items-center gap-2">
          
          {/* Quests Button */}
          <button
            onClick={() => { onOpenJournal(); audio.playClick(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all shadow-sm"
          >
            <Scroll className="w-4 h-4" />
            <span className="hidden sm:inline">{isSwedish ? "Uppdrag" : "Quests"}</span>
          </button>

          {/* Lore Codex Button */}
          <button
            onClick={() => { onOpenCompendium(); audio.playClick(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">{isSwedish ? "Kunskapsbok" : "Codex"}</span>
          </button>

          {/* Photo Mode Button */}
          <button
            onClick={() => { onOpenPhoto(); audio.playClick(); }}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all"
            title={isSwedish ? "Fotoläge / Exportera Karta" : "Photo Mode / Export"}
          >
            <Camera className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Atmosphere & Weather Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowAtmosphereMenu(!showAtmosphereMenu)}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-amber-300 transition-all"
              title={isSwedish ? "Tid & Väder" : "Time & Weather"}
            >
              <Sun className="w-4 h-4" />
            </button>

            {showAtmosphereMenu && (
              <div className="absolute right-0 mt-2 w-64 p-3 bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-xl shadow-2xl flex flex-col gap-3 text-xs z-50">
                <div>
                  <div className="flex items-center justify-between text-slate-300 font-bold mb-1">
                    <span>{isSwedish ? "Tid på dygnet" : "Time of Day"}</span>
                    <span className="text-amber-300 font-mono">{timeOfDay}:00</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="23"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="text-slate-300 font-bold mb-1.5">{isSwedish ? "Väder" : "Weather"}</div>
                  <div className="grid grid-cols-2 gap-1">
                    {weatherOptions.map(opt => {
                      const IconComp = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => { setWeather(opt.id); audio.playClick(); }}
                          className={`flex items-center gap-1.5 p-1.5 rounded text-[11px] ${
                            weather === opt.id 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                          <span>{isSwedish ? opt.label : opt.labelEn}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Map Layers Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all"
              title={isSwedish ? "Kartlager" : "Map Layers"}
            >
              <Layers className="w-4 h-4" />
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 mt-2 w-52 p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl flex flex-col gap-2 text-xs z-50">
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                  {isSwedish ? "Kartlager & Filter" : "Map Layers"}
                </div>

                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span>{isSwedish ? "Utforskningsdimma" : "Fog of War"}</span>
                  <input
                    type="checkbox"
                    checked={fogOfWarRevealed}
                    onChange={(e) => setFogOfWarRevealed(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span>{isSwedish ? "Regiongränser" : "Region Borders"}</span>
                  <input
                    type="checkbox"
                    checked={showRegionBorders}
                    onChange={(e) => setShowRegionBorders(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span>{isSwedish ? "Kartrutnät" : "Coordinate Grid"}</span>
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span>{isSwedish ? "Höjdkonturer" : "Contours"}</span>
                  <input
                    type="checkbox"
                    checked={showContours}
                    onChange={(e) => setShowContours(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              audio.setMuted(newMuted);
            }}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all"
            title={isMuted ? "Slå på ljud" : "Tysta ljud"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Language Switch */}
          <button
            onClick={() => setIsSwedish(!isSwedish)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold font-mono transition-all"
            title="Byt språk / Toggle language"
          >
            {isSwedish ? "🇸🇪 SV" : "🇬🇧 EN"}
          </button>
        </div>

      </div>

      {/* Sub-Bar: Search & Category Filter Pills & Tools */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pointer-events-auto pb-1">
        
        {/* Search Input */}
        <div className="relative min-w-[200px] max-w-[260px] flex-shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isSwedish ? "Sök städer, grottor, bossar..." : "Search places, quests..."}
            className="w-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-xl"
          />
        </div>

        {/* Category Pills Carousel */}
        <div className="flex items-center gap-1.5 flex-nowrap">
          {POI_CATEGORIES.map(cat => {
            const isCatActive = activeFilter === cat.id;
            const count = cat.id === 'all' 
              ? pois.length 
              : pois.filter(p => p.type === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => { setActiveFilter(cat.id); audio.playClick(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all backdrop-blur-md border ${
                  isCatActive
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-950/80 text-slate-300 hover:text-white hover:bg-slate-900 border-slate-800'
                }`}
              >
                <span>{isSwedish ? cat.label : cat.labelEn}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isCatActive ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Tools: Custom Pin & Ruler */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800 flex-shrink-0">
          <button
            onClick={() => { onStartAddPin(); audio.playClick(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-medium transition-all shadow-xl"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isSwedish ? "Ny Markör" : "Add Pin"}</span>
          </button>

          <button
            onClick={() => { setMeasuringMode(!measuringMode); audio.playClick(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-xl ${
              measuringMode 
                ? 'bg-cyan-950 text-cyan-300 border-cyan-400' 
                : 'bg-slate-950/80 text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>{isSwedish ? "Mät Avstånd" : "Measure"}</span>
          </button>
        </div>

      </div>

    </div>
  );
}
