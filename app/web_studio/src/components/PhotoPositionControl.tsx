import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Maximize2,
} from 'lucide-react';

interface PhotoPositionControlProps {
  label?: string;
  crop: { x: number; y: number; zoom?: number };
  onChange: (updates: { x?: number; y?: number; zoom?: number }) => void;
  compact?: boolean;
}

export const PhotoPositionControl: React.FC<PhotoPositionControlProps> = ({
  label,
  crop,
  onChange,
  compact = false,
}) => {
  const [stepSize, setStepSize] = useState<number>(5);

  const currentX = Math.round(crop.x ?? 50);
  const currentY = Math.round(crop.y ?? 50);
  const currentZoom = Number((crop.zoom ?? 1).toFixed(2));

  const moveLeft = () => onChange({ x: Math.max(0, currentX - stepSize) });
  const moveRight = () => onChange({ x: Math.min(100, currentX + stepSize) });
  const moveUp = () => onChange({ y: Math.max(0, currentY - stepSize) });
  const moveDown = () => onChange({ y: Math.min(100, currentY + stepSize) });
  const resetCenter = () => onChange({ x: 50, y: 50, zoom: 1 });

  return (
    <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 space-y-3">
      {/* Header with Title & Live Coordinates */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-yellow-400" />
          <span>{label || 'फोटो स्थिति व कर्सर (Move / Position)'}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-yellow-400 font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
            X: {currentX}% | Y: {currentY}% | {Math.round(currentZoom * 100)}%
          </span>
          <button
            type="button"
            onClick={resetCenter}
            className="text-[10px] text-neutral-400 hover:text-yellow-400 flex items-center gap-1 cursor-pointer transition-colors"
            title="सेंटर (50%, 50%) पर रीसेट करें"
          >
            <RotateCcw className="w-3 h-3" />
            <span>रीसेट</span>
          </button>
        </div>
      </div>

      {/* Main Cursor Controller (D-Pad) + Quick Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* The 4-Way Directional D-Pad Cursor */}
        <div className="flex flex-col items-center select-none shrink-0 bg-neutral-900/90 border border-neutral-800 p-2 rounded-2xl shadow-inner">
          {/* UP Button */}
          <button
            type="button"
            onClick={moveUp}
            title="ऊपर ले जाएं (Up)"
            className="w-10 h-8 bg-neutral-800 hover:bg-yellow-400 hover:text-neutral-950 text-neutral-200 rounded-lg flex items-center justify-center cursor-pointer shadow transition-all active:scale-90"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          {/* LEFT / CENTER / RIGHT Row */}
          <div className="flex items-center gap-1 my-1">
            <button
              type="button"
              onClick={moveLeft}
              title="बाईं ओर ले जाएं (Left)"
              className="w-8 h-10 bg-neutral-800 hover:bg-yellow-400 hover:text-neutral-950 text-neutral-200 rounded-lg flex items-center justify-center cursor-pointer shadow transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={resetCenter}
              title="सेंटर में रीसेट (50%, 50%)"
              className={`w-10 h-10 rounded-lg font-bold text-xs flex flex-col items-center justify-center cursor-pointer shadow transition-all active:scale-90 ${
                currentX === 50 && currentY === 50
                  ? 'bg-yellow-400 text-neutral-950 font-black'
                  : 'bg-neutral-950 text-neutral-300 border border-neutral-700 hover:border-yellow-400'
              }`}
            >
              <span className="text-[11px] leading-none">🎯</span>
              <span className="text-[8px] mt-0.5">मध्य</span>
            </button>

            <button
              type="button"
              onClick={moveRight}
              title="दाईं ओर ले जाएं (Right)"
              className="w-8 h-10 bg-neutral-800 hover:bg-yellow-400 hover:text-neutral-950 text-neutral-200 rounded-lg flex items-center justify-center cursor-pointer shadow transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* DOWN Button */}
          <button
            type="button"
            onClick={moveDown}
            title="नीचे ले जाएं (Down)"
            className="w-10 h-8 bg-neutral-800 hover:bg-yellow-400 hover:text-neutral-950 text-neutral-200 rounded-lg flex items-center justify-center cursor-pointer shadow transition-all active:scale-90"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Right side controls: Step size and quick corner presets */}
        <div className="flex-1 w-full space-y-2">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>कर्सर मूवमेंट स्टेप (प्रति क्लिक दूरी):</span>
            <div className="inline-flex rounded-lg bg-neutral-900 p-0.5 border border-neutral-800">
              {[
                { val: 2, label: '2% सूक्ष्म' },
                { val: 5, label: '5% सामान्य' },
                { val: 10, label: '10% तेज' },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setStepSize(s.val)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                    stepSize === s.val
                      ? 'bg-yellow-400 text-neutral-950 shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Corner / Position Presets */}
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: '⬆️ टॉप', x: currentX, y: 0 },
              { label: '⬇️ बॉटम', x: currentX, y: 100 },
              { label: '⬅️ लेफ्ट', x: 0, y: currentY },
              { label: '➡️ राइट', x: 100, y: currentY },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange({ x: p.x, y: p.y })}
                className="py-1 px-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-[10px] font-bold text-neutral-300 text-center cursor-pointer active:scale-95"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Zoom In / Out Controls */}
          <div className="pt-1 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-neutral-300 flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-amber-400" />
              <span>ज़ूम (Scale):</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ zoom: Math.max(1, currentZoom - 0.1) })}
                className="w-7 h-7 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded flex items-center justify-center cursor-pointer"
                title="ज़ूम आउट"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-yellow-400 font-bold min-w-[42px] text-center">
                {currentZoom.toFixed(2)}x
              </span>
              <button
                type="button"
                onClick={() => onChange({ zoom: Math.min(3, currentZoom + 0.1) })}
                className="w-7 h-7 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded flex items-center justify-center cursor-pointer"
                title="ज़ूम इन"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sliders for continuous fine dragging */}
      {!compact && (
        <div className="space-y-2 pt-1 border-t border-neutral-800/80">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>लेफ्ट ⟷ राइट स्लाइडर:</span>
              <span className="text-yellow-400 font-mono text-[10px]">{currentX}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={currentX}
              onChange={(e) => onChange({ x: parseInt(e.target.value, 10) })}
              className="w-full accent-yellow-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>ऊपर ⟷ नीचे स्लाइडर:</span>
              <span className="text-yellow-400 font-mono text-[10px]">{currentY}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={currentY}
              onChange={(e) => onChange({ y: parseInt(e.target.value, 10) })}
              className="w-full accent-yellow-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
