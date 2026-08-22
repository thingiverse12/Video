import React, { useState } from 'react';
import { X, Camera, Download, Sparkles, Sliders, Eye, EyeOff } from 'lucide-react';
import { audio } from '../utils/audio';

export default function PhotoMode({ onClose, isSwedish }) {
  const [filter, setFilter] = useState('natural'); // 'natural' | 'sepia' | 'cyber' | 'noir' | 'vibrant'
  const [showWatermark, setShowWatermark] = useState(true);

  const filters = [
    { id: 'natural', name: 'Naturlig / Fantasy', nameEn: 'Natural Fantasy', style: '' },
    { id: 'sepia', name: 'Gammalt Pergament', nameEn: 'Vintage Parchment', style: 'sepia(0.6) contrast(1.1)' },
    { id: 'vibrant', name: 'Mättad HDR', nameEn: 'Vibrant HDR', style: 'saturate(1.6) contrast(1.15)' },
    { id: 'noir', name: 'Mörk Legend', nameEn: 'Dark Legend', style: 'grayscale(0.8) contrast(1.3)' },
    { id: 'cyber', name: 'Eteriskt Norrsken', nameEn: 'Aurora Glow', style: 'hue-rotate(45deg) saturate(1.4)' },
  ];

  const handleCapture = () => {
    audio.playFastTravel();
    // Simulate image capture
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `Aethelgard-WorldMap-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-6">
      
      {/* Top Banner */}
      <div className="pointer-events-auto flex items-center justify-between bg-slate-950/85 backdrop-blur-xl border border-amber-500/30 rounded-2xl px-5 py-3 shadow-2xl max-w-xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold font-serif gold-gradient-text uppercase tracking-wider">
            {isSwedish ? "Fotoläge & Kartstudio" : "Photo Studio & Map Exporter"}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Watermark in bottom corner */}
      {showWatermark && (
        <div className="pointer-events-none absolute bottom-8 left-8 text-amber-300/80 font-serif font-bold text-lg drop-shadow-lg tracking-widest uppercase">
          ✦ Aethelgard: The Open World Chronicle ✦
        </div>
      )}

      {/* Bottom Filter Controls Toolbar */}
      <div className="pointer-events-auto flex items-center justify-between bg-slate-950/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-2xl max-w-2xl mx-auto w-full">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); audio.playClick(); }}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${
                filter === f.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              {isSwedish ? f.name : f.nameEn}
            </button>
          ))}
        </div>

        {/* Capture & Download Button */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <button
            onClick={handleCapture}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{isSwedish ? "Spara Bild" : "Save Image"}</span>
          </button>
        </div>

      </div>

    </div>
  );
}
