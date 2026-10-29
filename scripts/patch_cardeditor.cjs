const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'web_studio', 'src', 'components', 'CardEditor.tsx'),
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'src', 'components', 'CardEditor.tsx')
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

  // 1. Part 10.1: Headline Font Selector 2 lines max with horizontal scrolling on mobile
  const oldFontGrid = `<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">`;
  const newFontGrid = `<div className="grid grid-rows-2 grid-flow-col auto-cols-[135px] sm:auto-cols-auto sm:grid-rows-none sm:grid-flow-row sm:grid-cols-3 lg:grid-cols-4 overflow-x-auto sm:overflow-x-visible overflow-y-hidden sm:overflow-y-auto max-h-24 sm:max-h-48 gap-1.5 pb-1 pr-1 scrollbar-thin">`;

  if (code.includes(oldFontGrid)) {
    code = code.replace(oldFontGrid, newFontGrid);
    console.log(`[OK] Limited font selector to 2 rows on mobile in: ${file}`);
  }

  // 2. Part 10.3: Sticky Bottom Navigation Bar in renderMobileStepNavigation
  const oldStepNav = `<div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2 text-xs">`;
  const newStepNav = `<div className="sticky bottom-0 z-30 bg-neutral-950/95 backdrop-blur-md pt-2.5 pb-3 border-t border-neutral-800 flex items-center justify-between gap-2 text-xs shadow-2xl px-1 -mx-1">`;

  if (code.includes(oldStepNav)) {
    code = code.replace(oldStepNav, newStepNav);
    console.log(`[OK] Made step navigation sticky bottom in: ${file}`);
  }

  // 3. Part 11: Compact 'Off' button and Balanced 50/50 Symbolic & AI Generated options
  const oldWatermarkGridRegex = /<div className="grid grid-cols-3 gap-2">[\s\S]*?<\/div>\s*\)\s*\}\s*\{\/\* Optional custom text input/;

  const newWatermarkControls = `<div className="space-y-2">
              {/* Top row: Compact Off button (Part 11.1) */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-neutral-400">टैग विकल्प:</span>
                <button
                  type="button"
                  onClick={() => {
                    onChange({
                      photoDisclaimerType: 'none',
                      showAiGenerated: false,
                      photoWatermarkTag: undefined,
                    });
                  }}
                  className={\`px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 \${
                    (!card.photoDisclaimerType || card.photoDisclaimerType === 'none') && !card.showAiGenerated
                      ? 'bg-neutral-800 text-amber-300 border-amber-500/50 shadow-xs ring-1 ring-amber-400/30 font-black'
                      : 'bg-neutral-900/80 hover:bg-neutral-850 text-neutral-400 border-neutral-800'
                  }\`}
                  title="वॉटरमार्क ऑफ करें (No Tag)"
                >
                  <span className="text-xs">✕</span>
                  <span>ऑफ (कोई टैग नहीं)</span>
                </button>
              </div>

              {/* Bottom row: Balanced 50/50 Option Boxes (Part 11.2) */}
              <div className="grid grid-cols-2 gap-2 w-full">
                {/* Option A: प्रतीकात्मक फोटो */}
                <button
                  type="button"
                  onClick={() => {
                    onChange({
                      photoDisclaimerType: 'representative',
                      showAiGenerated: false,
                      photoWatermarkTag: 'प्रतीकात्मक फोटो',
                      representativePhotoText: card.representativePhotoText || 'प्रतीकात्मक फोटो',
                    });
                  }}
                  className={\`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer active:scale-95 \${
                    card.photoDisclaimerType === 'representative'
                      ? 'bg-amber-400 text-neutral-950 font-black border-amber-300 shadow-md ring-1 ring-amber-300'
                      : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border-neutral-800'
                  }\`}
                >
                  <span className="text-xs font-black flex items-center gap-1.5 truncate">
                    <span>📷</span>
                    <span className="truncate">प्रतीकात्मक फोटो</span>
                  </span>
                  <span className={\`text-[10px] \${card.photoDisclaimerType === 'representative' ? 'text-neutral-900/80 font-bold' : 'text-neutral-400'}\`}>
                    सांकेतिक तस्वीर
                  </span>
                </button>

                {/* Option B: AI जनरेटेड */}
                <button
                  type="button"
                  onClick={() => {
                    onChange({
                      photoDisclaimerType: 'ai',
                      showAiGenerated: true,
                      photoWatermarkTag: 'AI जनरेटेड',
                      aiGeneratedText: card.aiGeneratedText || 'AI जनरेटेड',
                    });
                  }}
                  className={\`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer active:scale-95 \${
                    card.photoDisclaimerType === 'ai' || card.showAiGenerated
                      ? 'bg-amber-400 text-neutral-950 font-black border-amber-300 shadow-md ring-1 ring-amber-300'
                      : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border-neutral-800'
                  }\`}
                >
                  <span className="text-xs font-black flex items-center gap-1.5 truncate">
                    <span>✨</span>
                    <span className="truncate">AI जनरेटेड</span>
                  </span>
                  <span className={\`text-[10px] \${card.photoDisclaimerType === 'ai' || card.showAiGenerated ? 'text-neutral-900/80 font-bold' : 'text-neutral-400'}\`}>
                    AI जनरेटेड इमेज
                  </span>
                </button>
              </div>
            </div>
            )}

            {/* Optional custom text input`;

  if (oldWatermarkGridRegex.test(code)) {
    code = code.replace(oldWatermarkGridRegex, newWatermarkControls);
    console.log(`[OK] Balanced watermark 50/50 controls in: ${file}`);
  } else {
    console.warn(`[WARN] Watermark regex not matched in: ${file}`);
  }

  fs.writeFileSync(file, code, 'utf8');
});
