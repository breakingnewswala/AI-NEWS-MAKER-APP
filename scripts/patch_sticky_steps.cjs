const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'web_studio', 'src', 'App.tsx'),
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'src', 'App.tsx')
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

  // Ensure sticky top-0 on mobile steps bar with backdrop blur and high z-index
  const oldStepsDiv = `<div className="sticky top-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-sm dark:shadow-xl my-1">`;
  const newStepsDiv = `<div className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-xl my-1 ring-1 ring-slate-800">`;

  if (code.includes(oldStepsDiv)) {
    code = code.replace(oldStepsDiv, newStepsDiv);
    console.log(`[OK] Enhanced sticky step navigator in: ${file}`);
  }

  fs.writeFileSync(file, code, 'utf8');
});
