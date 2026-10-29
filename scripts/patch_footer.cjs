const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'web_studio', 'src', 'components', 'AppFooterWeb.tsx'),
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'src', 'components', 'AppFooterWeb.tsx')
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

  // 1. Tagline Center Alignment on Mobile
  const oldTagline = `<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 sm:pb-8 border-b border-slate-800/90">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-400 border border-amber-400/30">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />
                </span>
                <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  खबर देखने से खबर बनाने तक,{' '}
                  <span className="text-amber-400 drop-shadow-sm font-black">
                    सिर्फ 2 मिनट में
                  </span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm md:text-base font-bold text-slate-600 dark:text-slate-300">
                डिजिटल न्यूज़ चैनलों का AI स्टूडियो —{' '}
                <span className="text-amber-300/90">12 शक्तिशाली सुविधाओं के साथ</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">`;

  const newTagline = `<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 sm:pb-8 border-b border-slate-800/90 text-center md:text-left items-center md:items-start">
            <div className="space-y-2 flex flex-col items-center md:items-start">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-400 border border-amber-400/30">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />
                </span>
                <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  खबर देखने से खबर बनाने तक,{' '}
                  <span className="text-amber-400 drop-shadow-sm font-black">
                    सिर्फ 2 मिनट में
                  </span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm md:text-base font-bold text-slate-600 dark:text-slate-300">
                डिजिटल न्यूज़ चैनलों का AI स्टूडियो —{' '}
                <span className="text-amber-300/90">12 शक्तिशाली सुविधाओं के साथ</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-center lg:self-center">`;

  if (code.includes(oldTagline)) {
    code = code.replace(oldTagline, newTagline);
    console.log(`[OK] Centered tagline on mobile in: ${file}`);
  }

  // 2. Feature Cards: 8 cards on mobile in 2 columns (4 rows x 2 cards), 12 on desktop
  const oldGrid = `<div
            id="footer-12-features-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-6"
          >
            {CANONICAL_12_FEATURES.map((feat) => {`;

  const newGrid = `<div
            id="footer-12-features-grid"
            className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 pt-6"
          >
            {CANONICAL_12_FEATURES.map((feat, idx) => {`;

  if (code.includes(oldGrid)) {
    code = code.replace(oldGrid, newGrid);
    console.log(`[OK] Changed feature grid to grid-cols-2 in: ${file}`);
  }

  const oldCard = `className={\`group rounded-xl p-3 sm:p-4 bg-white dark:bg-slate-950/80 hover:bg-slate-50 dark:hover:bg-slate-900 border \${feat.borderColor} transition-all duration-200 flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer relative overflow-hidden\`}`;
  const newCard = `className={\`group rounded-xl p-2.5 sm:p-4 bg-white dark:bg-slate-950/80 hover:bg-slate-50 dark:hover:bg-slate-900 border \${feat.borderColor} transition-all duration-200 flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer relative overflow-hidden \${idx >= 8 ? 'hidden md:flex' : 'flex'}\`}`;

  if (code.includes(oldCard)) {
    code = code.replace(oldCard, newCard);
    console.log(`[OK] Configured 8 cards on mobile in: ${file}`);
  }

  // 3. Center-align brand ownership and Support Inbox on mobile
  const oldBrand = `<div className="lg:col-span-7 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">`;
  const newBrand = `<div className="lg:col-span-7 flex flex-col sm:flex-row items-center md:items-start text-center md:text-left gap-4 sm:gap-5">`;

  if (code.includes(oldBrand)) {
    code = code.replace(oldBrand, newBrand);
    console.log(`[OK] Centered brand area in: ${file}`);
  }

  const oldSupport = `<div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">`;
  const newSupport = `<div className="flex items-center sm:items-start justify-between gap-3 flex-col sm:flex-row text-center sm:text-left">`;

  if (code.includes(oldSupport)) {
    code = code.replace(oldSupport, newSupport);
    console.log(`[OK] Centered support panel in: ${file}`);
  }

  // 4. Format copyright on 2 lines with emphasis for "भारत के डिजिटल मीडिया समुदाय के लिए"
  const oldLegal = `{/* Left Side: Copyright & Year */}
          <div className="text-center md:text-left text-slate-400">
            <span>© {currentYear} AI News Maker</span>
            <span className="mx-2 text-slate-600">|</span>
            <span>सर्वाधिकार सुरक्षित</span>
            <span className="mx-2 text-slate-600">|</span>
            <span className="text-slate-400">भारत के डिजिटल मीडिया समुदाय के लिए</span>
          </div>`;

  const newLegal = `{/* Left Side: Copyright & Year (2-line formatted with emphasis) */}
          <div className="text-center md:text-left text-xs text-slate-400 space-y-1">
            <div>
              <span>© {currentYear} AI News Maker</span>
              <span className="mx-2 text-slate-600">|</span>
              <span>सर्वाधिकार सुरक्षित</span>
            </div>
            <div className="font-bold text-amber-400/90 tracking-wide">
              भारत के डिजिटल मीडिया समुदाय के लिए
            </div>
          </div>`;

  if (code.includes(oldLegal)) {
    code = code.replace(oldLegal, newLegal);
    console.log(`[OK] 2-line copyright with emphasis in: ${file}`);
  }

  fs.writeFileSync(file, code, 'utf8');
});
