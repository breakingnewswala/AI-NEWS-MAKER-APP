import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, Crop, Wand2, Maximize2, Square, Circle } from 'lucide-react';

interface LogoCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onApplyCroppedPng: (pngDataUrl: string) => void;
}

export const LogoCropperModal: React.FC<LogoCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onApplyCroppedPng,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [removeWhiteBg, setRemoveWhiteBg] = useState<boolean>(false);
  // Support full/natural, square, and circle (default to full/rectangle to never cut borders!)
  const [cropShape, setCropShape] = useState<'full' | 'square' | 'circle'>('full');

  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
    };
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSaveCropped = () => {
    const img = imageRef.current;
    if (!img) return;

    // For 'full' shape, preserve the original natural aspect ratio
    let targetWidth = 512;
    let targetHeight = 512;
    if (cropShape === 'full') {
      const aspect = img.width / img.height;
      if (aspect >= 1) {
        targetWidth = 512;
        targetHeight = Math.round(512 / aspect);
      } else {
        targetHeight = 512;
        targetWidth = Math.round(512 * aspect);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, targetWidth, targetHeight);

    if (cropShape === 'circle') {
      const radius = Math.min(targetWidth, targetHeight) / 2;
      ctx.beginPath();
      ctx.arc(targetWidth / 2, targetHeight / 2, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    if (cropShape === 'full') {
      // Draw entire image naturally with zoom & offset
      const drawWidth = targetWidth * zoom;
      const drawHeight = targetHeight * zoom;
      const cx = (targetWidth - drawWidth) / 2 + offset.x;
      const cy = (targetHeight - drawHeight) / 2 + offset.y;
      ctx.drawImage(img, cx, cy, drawWidth, drawHeight);
    } else {
      // Square or circle bounding box
      const baseScale = Math.max(targetWidth / img.width, targetHeight / img.height);
      const finalScale = baseScale * zoom;
      const drawWidth = img.width * finalScale;
      const drawHeight = img.height * finalScale;
      const cx = (targetWidth - drawWidth) / 2 + offset.x * (targetWidth / 240);
      const cy = (targetHeight - drawHeight) / 2 + offset.y * (targetHeight / 240);
      ctx.drawImage(img, cx, cy, drawWidth, drawHeight);
    }

    // If transparent background requested, remove near-white pixels
    if (removeWhiteBg) {
      const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0; // Transparent
        } else if (r > 225 && g > 225 && b > 225) {
          const diff = Math.min(255 - r, 255 - g, 255 - b);
          data[i + 3] = Math.max(0, Math.min(255, diff * 8));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const pngDataUrl = canvas.toDataURL('image/png', 1.0);
    onApplyCroppedPng(pngDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-800/90 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-amber-400" />
            <h3 className="text-white font-bold text-sm sm:text-base font-['Baloo_2']">
              लोगो मैनुअल क्रॉप व एडजस्टमेंट
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col items-center gap-3">
          <p className="text-xs text-neutral-300 text-center font-['Noto_Sans_Devanagari']">
            फुल साइज़ लोगो को ड्रैग या ज़ूम करें। डिफ़ॉल्ट रूप से कोई बॉर्डर नहीं कटेगी।
          </p>

          {/* Interactive Crop Viewport */}
          <div
            className="relative w-64 h-64 bg-neutral-950 rounded-xl overflow-hidden border-2 border-dashed border-amber-400/60 cursor-move flex items-center justify-center select-none shadow-inner"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Checkerboard Pattern for Transparency */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              }}
            />

            {/* Target Image */}
            <img
              src={imageSrc}
              alt="Crop target"
              className="max-w-none transition-transform pointer-events-none object-contain"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                maxHeight: cropShape === 'full' ? '90%' : '100%',
                maxWidth: cropShape === 'full' ? '90%' : '100%',
              }}
            />

            {/* Visual Guide Overlay */}
            {cropShape === 'circle' && (
              <div className="absolute inset-4 border-2 border-amber-400 pointer-events-none rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]" />
            )}
            {cropShape === 'square' && (
              <div className="absolute inset-4 border-2 border-amber-400 pointer-events-none rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]" />
            )}
            {cropShape === 'full' && (
              <div className="absolute inset-2 border border-amber-400/50 pointer-events-none rounded-lg" />
            )}
          </div>

          {/* Controls */}
          <div className="w-full space-y-2.5 px-1">
            {/* Zoom Slider */}
            <div className="flex items-center gap-2">
              <ZoomOut className="w-4 h-4 text-neutral-400" />
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-amber-400 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
              />
              <ZoomIn className="w-4 h-4 text-neutral-400" />
              <span className="text-xs text-neutral-300 font-mono w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Shape Selectors */}
            <div className="flex items-center gap-1 bg-neutral-800 p-1 rounded-xl border border-neutral-700">
              <button
                type="button"
                onClick={() => setCropShape('full')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition ${
                  cropShape === 'full'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>फुल साइज़ (मूल)</span>
              </button>
              <button
                type="button"
                onClick={() => setCropShape('square')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition ${
                  cropShape === 'square'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>चौकोर</span>
              </button>
              <button
                type="button"
                onClick={() => setCropShape('circle')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition ${
                  cropShape === 'circle'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Circle className="w-3.5 h-3.5" />
                <span>गोलाकार</span>
              </button>
            </div>

            {/* White Bg Removal Toggle */}
            <button
              type="button"
              onClick={() => setRemoveWhiteBg(!removeWhiteBg)}
              className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                removeWhiteBg
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                  : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:text-white'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {removeWhiteBg
                  ? '✓ सफेद बैकग्राउंड हटाया जा रहा है'
                  : 'सफेद बैकग्राउंड हटाएं (Make Transparent PNG)'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-neutral-800/80 border-t border-neutral-700 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-xl transition cursor-pointer"
          >
            रद्द करें
          </button>
          <button
            type="button"
            onClick={handleSaveCropped}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black text-xs rounded-xl shadow-lg active:scale-95 transition cursor-pointer"
          >
            <Check className="w-4 h-4 text-black" />
            <span>सेव करें</span>
          </button>
        </div>
      </div>
    </div>
  );
};
