import React from 'react';
import { 
  X, Navigation, Check, Flag, Skull, Shield, 
  Sparkles, Award, MapPin, ExternalLink, Trash2 
} from 'lucide-react';
import { audio } from '../utils/audio';

export default function POIDetailModal({
  poi,
  onClose,
  onFastTravel,
  onSetWaypoint,
  isWaypoint,
  onToggleComplete,
  onDeleteCustomPin,
  isSwedish
}) {
  if (!poi) return null;

  const isCustomPin = poi.type === 'custom';

  return (
    <div className="absolute top-20 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-right duration-200">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
        
        {/* Header with Biome Gradient */}
        <div className="relative p-5 pb-4 bg-gradient-to-b from-slate-800/80 to-transparent border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {poi.type.replace('_', ' ')}
            </span>
            {poi.region && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {poi.region.toUpperCase()}
              </span>
            )}
            {poi.level && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800 ml-auto">
                NIVÅ {poi.level}
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold font-serif text-slate-100 gold-gradient-text leading-tight">
            {isSwedish ? poi.name : poi.nameEn || poi.name}
          </h2>

          <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-400">
            <span>X: <b className="text-amber-300">{poi.x}</b></span>
            <span>Y: <b className="text-amber-300">{poi.y}</b></span>
            {poi.z !== undefined && <span>Z: <b className="text-cyan-300">{poi.z}m</b></span>}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-300">
          
          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              {isSwedish ? "Beskrivning" : "Description"}
            </h4>
            <p className="text-slate-200 leading-relaxed text-xs">
              {isSwedish ? poi.description : poi.descriptionEn || poi.description}
            </p>
          </div>

          {/* Lore */}
          {poi.lore && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/20 text-xs italic text-amber-200/90 font-serif">
              "{isSwedish ? poi.lore : poi.loreEn || poi.lore}"
            </div>
          )}

          {/* Rewards */}
          {poi.rewards && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSwedish ? "Belöning vid utforskning" : "Exploration Rewards"}</span>
              </div>
              <div className="text-xs text-amber-200">
                {isSwedish ? poi.rewards : poi.rewardsEn || poi.rewards}
              </div>
            </div>
          )}

          {/* Enemies */}
          {poi.enemies && poi.enemies.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                <Skull className="w-3.5 h-3.5 text-rose-400" />
                <span>{isSwedish ? "Fiender & Hot" : "Enemies & Threats"}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(isSwedish ? poi.enemies : poi.enemiesEn || poi.enemies).map((enemy, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-900/50 text-[11px]">
                    {enemy}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Set Waypoint Button */}
            <button
              onClick={() => {
                onSetWaypoint(isWaypoint ? null : poi);
                audio.playClick();
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium transition-all ${
                isWaypoint
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Flag className="w-4 h-4" />
              <span>{isWaypoint ? (isSwedish ? "Aktiv Rutt" : "Active Route") : (isSwedish ? "Sätt Rutt" : "Set Route")}</span>
            </button>

            {/* Fast Travel Button */}
            <button
              onClick={() => {
                onFastTravel(poi);
                audio.playFastTravel();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition-all"
            >
              <Navigation className="w-4 h-4" />
              <span>{isSwedish ? "Snabbresa Hit" : "Fast Travel"}</span>
            </button>
          </div>

          {/* Mark as Completed Button */}
          {!isCustomPin && (
            <button
              onClick={() => {
                onToggleComplete(poi.id);
                audio.playClick();
              }}
              className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                poi.completed
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                  : 'bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{poi.completed ? (isSwedish ? "Markerad som Avklarad" : "Marked as Cleared") : (isSwedish ? "Markera som Avklarad" : "Mark as Cleared")}</span>
            </button>
          )}

          {/* Delete Custom Pin Button */}
          {isCustomPin && (
            <button
              onClick={() => {
                onDeleteCustomPin(poi.id);
                onClose();
                audio.playClick();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isSwedish ? "Ta bort markör" : "Delete Pin"}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
