import React, { useState } from 'react';
import { 
  X, Scroll, Award, CheckCircle2, Circle, Flag, 
  Sparkles, Coins, Compass, ChevronRight 
} from 'lucide-react';
import { audio } from '../utils/audio';

export default function QuestJournal({
  quests,
  activeQuest,
  onSelectQuest,
  onToggleQuestStep,
  onCompleteQuest,
  onTrackQuestOnMap,
  onClose,
  isSwedish
}) {
  const [selectedQuestId, setSelectedQuestId] = useState(activeQuest?.id || quests[0]?.id);

  const currentQuest = quests.find(q => q.id === selectedQuestId) || quests[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-gradient-to-r from-amber-950/20 via-slate-900 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scroll className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif gold-gradient-text tracking-wide uppercase">
                {isSwedish ? "Uppdragslogg & Kontrakt" : "Quest Journal & Contracts"}
              </h2>
              <span className="text-xs text-amber-200/60 font-mono">
                {isSwedish ? "Aethelgards hjältedåd och efterlysningar" : "Aethelgard Heroic Quests & Bounties"}
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

        {/* 2-Column Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Quest List */}
          <div className="md:col-span-5 border-r border-slate-800 p-4 overflow-y-auto space-y-2">
            {quests.map(quest => {
              const isSelected = quest.id === selectedQuestId;
              const isDone = quest.completed;

              return (
                <div
                  key={quest.id}
                  onClick={() => {
                    setSelectedQuestId(quest.id);
                    audio.playClick();
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/50 hover:bg-slate-800/40 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-amber-300 border border-amber-500/20">
                      {isSwedish ? quest.category : quest.categoryEn}
                    </span>
                    {isDone && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        {isSwedish ? "Avklarat" : "Completed"}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 font-serif leading-snug">
                    {isSwedish ? quest.title : quest.titleEn}
                  </h3>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Coins className="w-3 h-3" /> {quest.gold}g
                    </span>
                    <span className="flex items-center gap-1 text-cyan-400">
                      <Sparkles className="w-3 h-3" /> +{quest.xp} XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Active Quest Details */}
          {currentQuest && (
            <div className="md:col-span-7 p-6 overflow-y-auto flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-mono tracking-widest text-amber-400">
                    {isSwedish ? currentQuest.category : currentQuest.categoryEn} • {currentQuest.region.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-950/40 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> {currentQuest.gold} Guld
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> +{currentQuest.xp} XP
                    </span>
                  </div>
                </div>

                <h2 className="text-2xl font-bold font-serif text-slate-100 gold-gradient-text leading-snug">
                  {isSwedish ? currentQuest.title : currentQuest.titleEn}
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                  {isSwedish ? currentQuest.description : currentQuest.descriptionEn}
                </p>

                {/* Quest Objectives Steps */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {isSwedish ? "Målsättningar" : "Objectives"}
                  </h4>
                  <div className="space-y-2">
                    {currentQuest.steps.map((step, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          onToggleQuestStep(currentQuest.id, idx);
                          audio.playClick();
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          step.done
                            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 line-through'
                            : 'bg-slate-950/50 border-slate-800 text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {step.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        )}
                        <span className="text-xs font-medium">
                          {isSwedish ? step.text : step.textEn}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    onTrackQuestOnMap(currentQuest);
                    onClose();
                    audio.playClick();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
                >
                  <Compass className="w-4 h-4" />
                  <span>{isSwedish ? "Spåra på Kartan" : "Track on World Map"}</span>
                </button>

                <button
                  onClick={() => {
                    onCompleteQuest(currentQuest.id);
                    audio.playQuestComplete();
                  }}
                  disabled={currentQuest.completed}
                  className={`py-3 px-4 rounded-xl font-bold text-xs transition-all ${
                    currentQuest.completed
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  }`}
                >
                  {currentQuest.completed ? (isSwedish ? "Slutfört" : "Completed") : (isSwedish ? "Kräv Belöning" : "Claim Reward")}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
