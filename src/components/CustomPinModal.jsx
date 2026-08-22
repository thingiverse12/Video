import React, { useState } from 'react';
import { X, MapPin, Tag, Palette } from 'lucide-react';
import { audio } from '../utils/audio';

const PIN_COLORS = [
  '#e2b34a', // Gold
  '#38bdf8', // Cyan
  '#ef4444', // Red
  '#22c55e', // Green
  '#a855f7', // Purple
  '#f97316', // Orange
];

export default function CustomPinModal({
  coordinates,
  onSave,
  onClose,
  isSwedish
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PIN_COLORS[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: `custom-pin-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || (isSwedish ? "Egen användarmarkör" : "Custom user waypoint"),
      color: selectedColor,
      type: 'custom',
      x: coordinates.x,
      y: coordinates.y,
      fastTravelUnlocked: false,
      discovered: true,
      completed: false
    });
    audio.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: selectedColor }}
            >
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-slate-100 gold-gradient-text">
                {isSwedish ? "Placera Egen Markör" : "Place Custom Pin"}
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                X: {coordinates.x}, Y: {coordinates.y}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              {isSwedish ? "Namn på Markör" : "Pin Title"}
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isSwedish ? "t.ex. Hemlig grotta, Drakfälla..." : "e.g. Secret cave, Hidden camp..."}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              {isSwedish ? "Anteckningar / Beskrivning" : "Notes / Description"}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isSwedish ? "Skriv en minnesanteckning om denna plats..." : "Add personal exploration notes..."}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              {isSwedish ? "Välj Färg" : "Marker Color"}
            </label>
            <div className="flex items-center gap-2">
              {PIN_COLORS.map(color => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    selectedColor === color ? 'scale-125 ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
            >
              {isSwedish ? "Avbryt" : "Cancel"}
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20"
            >
              {isSwedish ? "Spara Markör" : "Save Pin"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
