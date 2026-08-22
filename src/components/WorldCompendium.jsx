import React, { useState } from 'react';
import { X, BookOpen, Shield, Skull, Sparkles, Map, Swords, Flame, Snowflake, Zap } from 'lucide-react';
import { LORE_ENTRIES, REGIONS } from '../data/worldData';
import { audio } from '../utils/audio';

export default function WorldCompendium({ onClose, isSwedish }) {
  const [activeTab, setActiveTab] = useState('factions'); // 'factions' | 'bestiary' | 'regions'

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-gradient-to-r from-purple-950/20 via-slate-900 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif gold-gradient-text tracking-wide uppercase">
                {isSwedish ? "Aethelgards Krönika & Kunskapsbok" : "Chronicles of Aethelgard & Codex"}
              </h2>
              <span className="text-xs text-purple-200/60 font-mono">
                {isSwedish ? "Världshistoria, fraktioner och monsterguide" : "World history, faction archives and bestiary"}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => { setActiveTab('factions'); audio.playClick(); }}
            className={`pb-3 px-3 text-xs font-bold font-serif uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'factions'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isSwedish ? "Fraktioner & Riken" : "Factions & Realms"}
          </button>

          <button
            onClick={() => { setActiveTab('bestiary'); audio.playClick(); }}
            className={`pb-3 px-3 text-xs font-bold font-serif uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'bestiary'
                ? 'border-red-400 text-red-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isSwedish ? "Bestiarium (Monster)" : "Bestiary (Creatures)"}
          </button>

          <button
            onClick={() => { setActiveTab('regions'); audio.playClick(); }}
            className={`pb-3 px-3 text-xs font-bold font-serif uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'regions'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isSwedish ? "Regioner & Biomer" : "Regions & Biomes"}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Factions Tab */}
          {activeTab === 'factions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LORE_ENTRIES[0].items.map((faction, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/30 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-bold font-serif text-amber-200">
                        {isSwedish ? faction.name : faction.nameEn}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isSwedish ? faction.description : faction.descriptionEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bestiary Tab */}
          {activeTab === 'bestiary' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LORE_ENTRIES[1].items.map((monster, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 hover:border-rose-500/50 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Skull className="w-4 h-4 text-rose-400" />
                      <h3 className="text-sm font-bold font-serif text-rose-200">
                        {isSwedish ? monster.name : monster.nameEn}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-rose-950 text-rose-300 border border-rose-800 inline-block mb-2">
                      {isSwedish ? monster.type : monster.typeEn}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {monster.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-rose-900/40 text-[11px] text-amber-300">
                    <span className="text-slate-400">{isSwedish ? "Svaghet: " : "Weakness: "}</span>
                    <b>{isSwedish ? monster.weakness : monster.weaknessEn}</b>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Regions Tab */}
          {activeTab === 'regions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REGIONS.map((region) => (
                <div 
                  key={region.id} 
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold font-serif text-slate-100" style={{ color: region.color }}>
                      {isSwedish ? region.name : region.nameEn}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      {isSwedish ? region.dangerLevel : region.dangerLevelEn}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-2">
                    {isSwedish ? region.description : region.descriptionEn}
                  </p>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span>{isSwedish ? "Klimat / Väder: " : "Weather: "}</span>
                    <b className="text-amber-200">{isSwedish ? region.weather : region.weatherEn}</b>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
