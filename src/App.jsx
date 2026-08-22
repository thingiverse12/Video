import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import WorldMap2D from './components/WorldMap2D';
import World3DExplorer from './components/World3DExplorer';
import MapControls from './components/MapControls';
import POIDetailModal from './components/POIDetailModal';
import CustomPinModal from './components/CustomPinModal';
import QuestJournal from './components/QuestJournal';
import WorldCompendium from './components/WorldCompendium';
import PhotoMode from './components/PhotoMode';
import MiniMap from './components/MiniMap';
import { INITIAL_POIS, QUESTS } from './data/worldData';
import { audio } from './utils/audio';

export default function App() {
  // Persistence state
  const [pois, setPois] = useState(() => {
    const saved = localStorage.getItem('aethelgard_pois');
    return saved ? JSON.parse(saved) : INITIAL_POIS;
  });

  const [customPins, setCustomPins] = useState(() => {
    const saved = localStorage.getItem('aethelgard_custom_pins');
    return saved ? JSON.parse(saved) : [];
  });

  const [quests, setQuests] = useState(() => {
    const saved = localStorage.getItem('aethelgard_quests');
    return saved ? JSON.parse(saved) : QUESTS;
  });

  // UI & Gameplay State
  const [viewMode, setViewMode] = useState('2d'); // '2d' | '3d'
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [playerPos, setPlayerPos] = useState({ x: 480, y: 520, heading: 0 });
  const [activeWaypoint, setActiveWaypoint] = useState(null);
  const [activeQuest, setActiveQuest] = useState(quests[0]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Atmosphere & Settings
  const [timeOfDay, setTimeOfDay] = useState(12);
  const [weather, setWeather] = useState('clear');
  const [isMuted, setIsMuted] = useState(false);
  const [isSwedish, setIsSwedish] = useState(true);

  // Map Display Toggles
  const [fogOfWarRevealed, setFogOfWarRevealed] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showRegionBorders, setShowRegionBorders] = useState(true);
  const [showContours, setShowContours] = useState(true);

  // Tools & Modals
  const [measuringMode, setMeasuringMode] = useState(false);
  const [pinPlacementMode, setPinPlacementMode] = useState(false);
  const [pendingPinCoords, setPendingPinCoords] = useState(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [compendiumOpen, setCompendiumOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('aethelgard_pois', JSON.stringify(pois));
  }, [pois]);

  useEffect(() => {
    localStorage.setItem('aethelgard_custom_pins', JSON.stringify(customPins));
  }, [customPins]);

  useEffect(() => {
    localStorage.setItem('aethelgard_quests', JSON.stringify(quests));
  }, [quests]);

  // Ambient sound management
  useEffect(() => {
    if (!isMuted) {
      audio.startAmbient(weather);
    } else {
      audio.stopAmbient();
    }
    return () => audio.stopAmbient();
  }, [weather, isMuted]);

  // Show Toast
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Discover location when player gets close
  useEffect(() => {
    pois.forEach(poi => {
      if (!poi.discovered) {
        const dist = Math.hypot(poi.x - playerPos.x, poi.y - playerPos.y);
        if (dist < 40) {
          setPois(prev => prev.map(p => p.id === poi.id ? { ...p, discovered: true, fastTravelUnlocked: true } : p));
          triggerToast(isSwedish ? `Upptäckte plats: ${poi.name}!` : `Discovered: ${poi.nameEn}!`);
          confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
        }
      }
    });
  }, [playerPos, pois, isSwedish]);

  // Fast Travel handler
  const handleFastTravel = (targetPoi) => {
    setPlayerPos({ x: targetPoi.x, y: targetPoi.y, heading: 0 });
    setSelectedPoi(null);
    triggerToast(isSwedish ? `Snabbresan till ${targetPoi.name} slutförd!` : `Fast traveled to ${targetPoi.nameEn}!`);
    confetti({ particleCount: 40, spread: 70, origin: { y: 0.5 } });
  };

  // Synchronize Viewpoint Tower
  const handleSyncTower = (towerPoi) => {
    setPois(prev => prev.map(p => {
      if (p.id === towerPoi.id) {
        return { ...p, completed: true, discovered: true, fastTravelUnlocked: true };
      }
      // Reveal nearby pois
      const d = Math.hypot(p.x - towerPoi.x, p.y - towerPoi.y);
      if (d < 250) {
        return { ...p, discovered: true };
      }
      return p;
    }));

    triggerToast(isSwedish ? `Utsiktstorn synkroniserat! Kartan har avslöjats!` : `Viewpoint synchronized! Region unveiled!`);
    confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } });
  };

  // Toggle POI Completed
  const handleToggleComplete = (poiId) => {
    setPois(prev => prev.map(p => p.id === poiId ? { ...p, completed: !p.completed } : p));
  };

  // Custom Pin handlers
  const handleStartAddPin = () => {
    setPinPlacementMode(true);
    setMeasuringMode(false);
  };

  const handleMapClickForPin = (coords) => {
    setPendingPinCoords(coords);
  };

  const handleSaveCustomPin = (newPin) => {
    setCustomPins(prev => [...prev, newPin]);
    setPendingPinCoords(null);
    triggerToast(isSwedish ? `Markör "${newPin.name}" sparad!` : `Pin "${newPin.name}" saved!`);
  };

  const handleDeleteCustomPin = (pinId) => {
    setCustomPins(prev => prev.filter(p => p.id !== pinId));
    triggerToast(isSwedish ? "Markör borttagen" : "Pin removed");
  };

  // Quest Steps & Complete
  const handleToggleQuestStep = (questId, stepIdx) => {
    setQuests(prev => prev.map(q => {
      if (q.id !== questId) return q;
      const newSteps = [...q.steps];
      newSteps[stepIdx].done = !newSteps[stepIdx].done;
      return { ...q, steps: newSteps };
    }));
  };

  const handleCompleteQuest = (questId) => {
    setQuests(prev => prev.map(q => q.id === questId ? { ...q, completed: true } : q));
    triggerToast(isSwedish ? "Uppdrag slutfört! Belöningar utdelade!" : "Quest completed! Rewards claimed!");
    confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
  };

  const handleTrackQuest = (quest) => {
    setActiveQuest(quest);
    if (quest.targetPoiId) {
      const targetPoi = pois.find(p => p.id === quest.targetPoiId);
      if (targetPoi) {
        setActiveWaypoint(targetPoi);
        setSelectedPoi(targetPoi);
      }
    }
  };

  const discoveredCount = pois.filter(p => p.discovered).length;
  const completedCount = pois.filter(p => p.completed).length;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0e17] text-slate-100 font-sans">
      
      {/* Top Map Controls Header & Search */}
      <MapControls
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        timeOfDay={timeOfDay}
        setTimeOfDay={setTimeOfDay}
        weather={weather}
        setWeather={setWeather}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        isSwedish={isSwedish}
        setIsSwedish={setIsSwedish}
        onOpenJournal={() => setJournalOpen(true)}
        onOpenCompendium={() => setCompendiumOpen(true)}
        onOpenPhoto={() => setPhotoOpen(true)}
        onStartAddPin={handleStartAddPin}
        measuringMode={measuringMode}
        setMeasuringMode={setMeasuringMode}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showRegionBorders={showRegionBorders}
        setShowRegionBorders={setShowRegionBorders}
        showContours={showContours}
        setShowContours={setShowContours}
        fogOfWarRevealed={fogOfWarRevealed}
        setFogOfWarRevealed={setFogOfWarRevealed}
        pois={pois}
        discoveredCount={discoveredCount}
        completedCount={completedCount}
      />

      {/* Main Viewport: 2D World Map OR 3D Open World Explorer */}
      {viewMode === '2d' ? (
        <WorldMap2D
          pois={pois}
          selectedPoi={selectedPoi}
          onSelectPoi={setSelectedPoi}
          playerPos={playerPos}
          activeWaypoint={activeWaypoint}
          onSetWaypoint={setActiveWaypoint}
          activeQuest={activeQuest}
          fogOfWarRevealed={fogOfWarRevealed}
          onRevealFog={setFogOfWarRevealed}
          customPins={customPins}
          onAddCustomPin={handleMapClickForPin}
          activeFilter={activeFilter}
          searchQuery={searchQuery}
          timeOfDay={timeOfDay}
          weather={weather}
          measuringMode={measuringMode}
          setMeasuringMode={setMeasuringMode}
          pinPlacementMode={pinPlacementMode}
          setPinPlacementMode={setPinPlacementMode}
          isSwedish={isSwedish}
          onSyncTower={handleSyncTower}
          showGrid={showGrid}
          showRegionBorders={showRegionBorders}
          showContours={showContours}
        />
      ) : (
        <World3DExplorer
          pois={pois}
          selectedPoi={selectedPoi}
          onSelectPoi={setSelectedPoi}
          playerPos={playerPos}
          onUpdatePlayerPos={setPlayerPos}
          activeWaypoint={activeWaypoint}
          timeOfDay={timeOfDay}
          weather={weather}
          isSwedish={isSwedish}
          onSyncTower={handleSyncTower}
        />
      )}

      {/* Floating Corner MiniMap in 3D Mode */}
      {viewMode === '3d' && (
        <div className="absolute top-20 right-6 z-30">
          <MiniMap
            playerPos={playerPos}
            pois={pois}
            isSwedish={isSwedish}
            onExpandMap={() => setViewMode('2d')}
          />
        </div>
      )}

      {/* POI Details Modal Drawer */}
      {selectedPoi && (
        <POIDetailModal
          poi={selectedPoi}
          onClose={() => setSelectedPoi(null)}
          onFastTravel={handleFastTravel}
          onSetWaypoint={setActiveWaypoint}
          isWaypoint={activeWaypoint?.id === selectedPoi.id}
          onToggleComplete={handleToggleComplete}
          onDeleteCustomPin={handleDeleteCustomPin}
          isSwedish={isSwedish}
        />
      )}

      {/* Custom Pin Placement Modal */}
      {pendingPinCoords && (
        <CustomPinModal
          coordinates={pendingPinCoords}
          onSave={handleSaveCustomPin}
          onClose={() => setPendingPinCoords(null)}
          isSwedish={isSwedish}
        />
      )}

      {/* Quest Journal Modal */}
      {journalOpen && (
        <QuestJournal
          quests={quests}
          activeQuest={activeQuest}
          onSelectQuest={setActiveQuest}
          onToggleQuestStep={handleToggleQuestStep}
          onCompleteQuest={handleCompleteQuest}
          onTrackQuestOnMap={handleTrackQuest}
          onClose={() => setJournalOpen(false)}
          isSwedish={isSwedish}
        />
      )}

      {/* World Lore & Bestiary Codex */}
      {compendiumOpen && (
        <WorldCompendium
          onClose={() => setCompendiumOpen(false)}
          isSwedish={isSwedish}
        />
      )}

      {/* Photo Mode / Map Exporter */}
      {photoOpen && (
        <PhotoMode
          onClose={() => setPhotoOpen(false)}
          isSwedish={isSwedish}
        />
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-amber-500/50 rounded-2xl px-5 py-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 text-xs font-bold font-serif gold-gradient-text">
            <span>✨</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

    </div>
  );
}
