import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, Lock, Unlock, RotateCcw, Check, Sparkles, Sliders, Move, X } from 'lucide-react';

export interface CropConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  isLockedRatio: boolean;
  aspectRatio?: number;
  originalWidth: number;
  originalHeight: number;
}

interface AdvancedLogoCropEditorProps {
  imageSrc: string;
  onApplyCrop: (croppedPngDataUrl: string, config: CropConfig) => void;
  onCancel?: () => void;
  initialCrop?: Partial<CropConfig>;
}

export const AdvancedLogoCropEditor: React.FC<AdvancedLogoCropEditorProps> = ({
  imageSrc,
  onApplyCrop,
  onCancel,
  initialCrop,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [displayedSize, setDisplayedSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Crop rectangle in natural image coordinate pixels [0..naturalWidth, 0..naturalHeight]
  const [crop, setCrop] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [isLockedRatio, setIsLockedRatio] = useState<boolean>(false);
  const [lockedRatio, setLockedRatio] = useState<number>(1);
  const [removeWhiteBg, setRemoveWhiteBg] = useState<boolean>(false);

  // Dragging state
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; crop: { x: number; y: number; width: number; height: number } }>({
    clientX: 0,
    clientY: 0,
    crop: { x: 0, y: 0, width: 0, height: 0 },
  });

  // Load natural image dimensions
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      const nw = img.naturalWidth || img.width || 400;
      const nh = img.naturalHeight || img.height || 400;
      setNaturalSize({ width: nw, height: nh });

      const defaultW = Math.round(nw * 0.9);
      const defaultH = Math.round(nh * 0.9);
      const defaultX = Math.round((nw - defaultW) / 2);
      const defaultY = Math.round((nh - defaultH) / 2);

      const initX = initialCrop?.x !== undefined ? Math.max(0, Math.min(nw - 10, initialCrop.x)) : defaultX;
      const initY = initialCrop?.y !== undefined ? Math.max(0, Math.min(nh - 10, initialCrop.y)) : defaultY;
      const initW = initialCrop?.width !== undefined ? Math.min(nw - initX, initialCrop.width) : defaultW;
      const initH = initialCrop?.height !== undefined ? Math.min(nh - initY, initialCrop.height) : defaultH;

      setCrop({ x: initX, y: initY, width: initW, height: initH });
      setLockedRatio(initW / (initH || 1));
      setIsLockedRatio(Boolean(initialCrop?.isLockedRatio));
    };
  }, [imageSrc, initialCrop]);

  // Update displayed size on window resize or load
  const updateDisplayedSize = useCallback(() => {
    if (imgRef.current) {
      setDisplayedSize({
        width: imgRef.current.clientWidth || 300,
        height: imgRef.current.clientHeight || 200,
      });
    }
  }, []);

  useEffect(() => {
    updateDisplayedSize();
    window.addEventListener('resize', updateDisplayedSize);
    return () => window.removeEventListener('resize', updateDisplayedSize);
  }, [updateDisplayedSize, naturalSize]);

  // Conversion scale between natural image coords and screen display coords
  const scaleX = naturalSize.width > 0 ? (displayedSize.width / naturalSize.width) : 1;
  const scaleY = naturalSize.height > 0 ? (displayedSize.height / naturalSize.height) : 1;

  // Screen coordinates of crop box
  const screenCrop = {
    x: Math.round(crop.x * scaleX),
    y: Math.round(crop.y * scaleY),
    width: Math.round(crop.width * scaleX),
    height: Math.round(crop.height * scaleY),
  };

  // Drag start
  const handlePointerDown = (handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveHandle(handle);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      crop: { ...crop },
    };
  };

  // Drag move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle) return;
    e.preventDefault();

    const dxDisplay = e.clientX - dragStartRef.current.clientX;
    const dyDisplay = e.clientY - dragStartRef.current.clientY;

    const dxNatural = Math.round(dxDisplay / (scaleX || 1));
    const dyNatural = Math.round(dyDisplay / (scaleY || 1));

    const start = dragStartRef.current.crop;
    const nw = naturalSize.width;
    const nh = naturalSize.height;

    let newX = start.x;
    let newY = start.y;
    let newW = start.width;
    let newH = start.height;

    const minSize = 20;

    if (activeHandle === 'move') {
      newX = Math.max(0, Math.min(nw - newW, start.x + dxNatural));
      newY = Math.max(0, Math.min(nh - newH, start.y + dyNatural));
    } else {
      // Edge / corner resizing
      if (activeHandle.includes('left')) {
        const potentialX = Math.max(0, Math.min(start.x + start.width - minSize, start.x + dxNatural));
        newW = start.width + (start.x - potentialX);
        newX = potentialX;
      }
      if (activeHandle.includes('right')) {
        newW = Math.max(minSize, Math.min(nw - start.x, start.width + dxNatural));
      }
      if (activeHandle.includes('top')) {
        const potentialY = Math.max(0, Math.min(start.y + start.height - minSize, start.y + dyNatural));
        newH = start.height + (start.y - potentialY);
        newY = potentialY;
      }
      if (activeHandle.includes('bottom')) {
        newH = Math.max(minSize, Math.min(nh - start.y, start.height + dyNatural));
      }

      // Aspect ratio lock enforcement
      if (isLockedRatio && lockedRatio > 0) {
        if (activeHandle === 'left' || activeHandle === 'right') {
          newH = Math.round(newW / lockedRatio);
          if (newY + newH > nh) {
            newH = nh - newY;
            newW = Math.round(newH * lockedRatio);
          }
        } else if (activeHandle === 'top' || activeHandle === 'bottom') {
          newW = Math.round(newH * lockedRatio);
          if (newX + newW > nw) {
            newW = nw - newX;
            newH = Math.round(newW / lockedRatio);
          }
        } else {
          // Corners: constrain to aspect ratio
          newH = Math.round(newW / lockedRatio);
          if (newY + newH > nh) {
            newH = nh - newY;
            newW = Math.round(newH * lockedRatio);
          }
        }
      }
    }

    setCrop({
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setActiveHandle(null);
    }
  };

  // Generate cropped PNG via HTML5 Canvas preserving Alpha & natural proportions
  const handleGenerateCroppedPng = () => {
    if (!naturalSize.width || !naturalSize.height) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      const cw = Math.max(1, crop.width);
      const ch = Math.max(1, crop.height);

      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw exactly the cropped region from original image
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, crop.x, crop.y, cw, ch, 0, 0, cw, ch);

      // Optional transparent conversion for near-white backgrounds
      if (removeWhiteBg) {
        const imgData = ctx.getImageData(0, 0, cw, ch);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 240 && g > 240 && b > 240) {
            data[i + 3] = 0;
          } else if (r > 225 && g > 225 && b > 225) {
            const diff = Math.min(255 - r, 255 - g, 255 - b);
            data[i + 3] = Math.max(0, Math.min(255, diff * 8));
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const croppedPng = canvas.toDataURL('image/png', 1.0);
      onApplyCrop(croppedPng, {
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
        isLockedRatio,
        aspectRatio: isLockedRatio ? lockedRatio : undefined,
        originalWidth: naturalSize.width,
        originalHeight: naturalSize.height,
      });
    };
  };

  const handleResetCrop = () => {
    if (!naturalSize.width) return;
    setCrop({
      x: 0,
      y: 0,
      width: naturalSize.width,
      height: naturalSize.height,
    });
    setLockedRatio(naturalSize.width / (naturalSize.height || 1));
  };

  return (
    <div className="bg-slate-950 border border-amber-500/50 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Crop className="w-4 h-4 text-amber-400" />
          <span className="text-xs sm:text-sm font-black text-amber-300">
            एडवांस्ड लोगो क्रॉप एडिटर (Manual Crop Editor)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const next = !isLockedRatio;
              setIsLockedRatio(next);
              if (next && crop.height > 0) {
                setLockedRatio(crop.width / crop.height);
              }
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition cursor-pointer ${
              isLockedRatio
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={isLockedRatio ? 'अनुपात लॉक है (Locked Ratio)' : 'मुक्त आकार मोड (Free Crop Mode)'}
          >
            {isLockedRatio ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
            <span>{isLockedRatio ? 'Locked Ratio' : 'Free Crop'}</span>
          </button>
          <button
            type="button"
            onClick={handleResetCrop}
            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="रीसेट करें (Reset Crop)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-300 hover:text-white transition cursor-pointer"
              title="बंद करें"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Visual Canvas Area with Crop Handles */}
      <div
        ref={containerRef}
        className="relative mx-auto bg-slate-900/90 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center select-none"
        style={{ minHeight: 220, maxHeight: 340 }}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Crop Target"
          onLoad={updateDisplayedSize}
          className="max-h-[300px] w-auto max-w-full object-contain pointer-events-none"
        />

        {/* Dark Dim Overlay Outside Crop Box */}
        {displayedSize.width > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.65)`,
              left: screenCrop.x,
              top: screenCrop.y,
              width: screenCrop.width,
              height: screenCrop.height,
            }}
          />
        )}

        {/* Interactive Crop Box Overlay */}
        {displayedSize.width > 0 && (
          <div
            onPointerDown={(e) => handlePointerDown('move', e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute border-2 border-amber-400 bg-amber-400/10 cursor-move shadow-2xl touch-none"
            style={{
              left: screenCrop.x,
              top: screenCrop.y,
              width: screenCrop.width,
              height: screenCrop.height,
            }}
          >
            {/* Rule of Thirds Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
              <div className="border-r border-b border-amber-300/50" />
              <div className="border-r border-b border-amber-300/50" />
              <div className="border-b border-amber-300/50" />
              <div className="border-r border-b border-amber-300/50" />
              <div className="border-r border-b border-amber-300/50" />
              <div className="border-b border-amber-300/50" />
              <div className="border-r border-amber-300/50" />
              <div className="border-r border-amber-300/50" />
              <div />
            </div>

            {/* Center Move Indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="p-1 rounded-full bg-black/60 text-amber-300 opacity-60">
                <Move className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* 4 Edge Handles */}
            {/* Top */}
            <div
              onPointerDown={(e) => handlePointerDown('top', e)}
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3.5 bg-amber-400 rounded-full cursor-ns-resize shadow-md touch-none hover:scale-110 transition-transform"
            />
            {/* Bottom */}
            <div
              onPointerDown={(e) => handlePointerDown('bottom', e)}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-3.5 bg-amber-400 rounded-full cursor-ns-resize shadow-md touch-none hover:scale-110 transition-transform"
            />
            {/* Left */}
            <div
              onPointerDown={(e) => handlePointerDown('left', e)}
              className="absolute top-1/2 -left-2 -translate-y-1/2 w-3.5 h-8 bg-amber-400 rounded-full cursor-ew-resize shadow-md touch-none hover:scale-110 transition-transform"
            />
            {/* Right */}
            <div
              onPointerDown={(e) => handlePointerDown('right', e)}
              className="absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-8 bg-amber-400 rounded-full cursor-ew-resize shadow-md touch-none hover:scale-110 transition-transform"
            />

            {/* 4 Corner Handles */}
            <div
              onPointerDown={(e) => handlePointerDown('top-left', e)}
              className="absolute -top-2 -left-2 w-4 h-4 bg-amber-300 border-2 border-slate-950 rounded cursor-nwse-resize shadow-md touch-none"
            />
            <div
              onPointerDown={(e) => handlePointerDown('top-right', e)}
              className="absolute -top-2 -right-2 w-4 h-4 bg-amber-300 border-2 border-slate-950 rounded cursor-nesw-resize shadow-md touch-none"
            />
            <div
              onPointerDown={(e) => handlePointerDown('bottom-left', e)}
              className="absolute -bottom-2 -left-2 w-4 h-4 bg-amber-300 border-2 border-slate-950 rounded cursor-nesw-resize shadow-md touch-none"
            />
            <div
              onPointerDown={(e) => handlePointerDown('bottom-right', e)}
              className="absolute -bottom-2 -right-2 w-4 h-4 bg-amber-300 border-2 border-slate-950 rounded cursor-nwse-resize shadow-md touch-none"
            />

            {/* Crop Size Badge */}
            <div className="absolute -bottom-6 left-0 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono font-bold text-amber-300 pointer-events-none whitespace-nowrap">
              {crop.width} × {crop.height} px
            </div>
          </div>
        )}
      </div>

      {/* Numeric Inputs for Pixel-Perfect Adjustments */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">X (बायाँ):</label>
          <input
            type="number"
            min={0}
            max={Math.max(0, naturalSize.width - crop.width)}
            value={crop.x}
            onChange={(e) => {
              const val = Math.max(0, Math.min(naturalSize.width - crop.width, parseInt(e.target.value) || 0));
              setCrop((prev) => ({ ...prev, x: val }));
            }}
            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-amber-400 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Y (ऊपर):</label>
          <input
            type="number"
            min={0}
            max={Math.max(0, naturalSize.height - crop.height)}
            value={crop.y}
            onChange={(e) => {
              const val = Math.max(0, Math.min(naturalSize.height - crop.height, parseInt(e.target.value) || 0));
              setCrop((prev) => ({ ...prev, y: val }));
            }}
            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-amber-400 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">W (चौड़ाई):</label>
          <input
            type="number"
            min={20}
            max={naturalSize.width - crop.x}
            value={crop.width}
            onChange={(e) => {
              const val = Math.max(20, Math.min(naturalSize.width - crop.x, parseInt(e.target.value) || 20));
              setCrop((prev) => {
                const nextH = isLockedRatio && lockedRatio > 0 ? Math.min(naturalSize.height - prev.y, Math.round(val / lockedRatio)) : prev.height;
                return { ...prev, width: val, height: nextH };
              });
            }}
            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-amber-400 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">H (ऊंचाई):</label>
          <input
            type="number"
            min={20}
            max={naturalSize.height - crop.y}
            value={crop.height}
            onChange={(e) => {
              const val = Math.max(20, Math.min(naturalSize.height - crop.y, parseInt(e.target.value) || 20));
              setCrop((prev) => {
                const nextW = isLockedRatio && lockedRatio > 0 ? Math.min(naturalSize.width - prev.x, Math.round(val * lockedRatio)) : prev.width;
                return { ...prev, height: val, width: nextW };
              });
            }}
            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-amber-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Convert to PNG and Transparent Options */}
      <div className="flex items-center justify-between gap-2 p-2 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
          <input
            type="checkbox"
            checked={removeWhiteBg}
            onChange={(e) => setRemoveWhiteBg(e.target.checked)}
            className="w-4 h-4 accent-amber-400 rounded"
          />
          <span className="font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>पारदर्शी बैकग्राउंड (Transparent PNG)</span>
          </span>
        </label>
        <span className="text-[10px] text-slate-400">
          (सफेद खाली स्पेस हटाएं)
        </span>
      </div>

      {/* Action Buttons: Apply / Convert */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition"
          >
            रद्द करें
          </button>
        )}
        <button
          type="button"
          onClick={handleGenerateCroppedPng}
          className="px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
        >
          <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
          <span>क्रॉप लागू करें और PNG तैयार करें</span>
        </button>
      </div>
    </div>
  );
};
