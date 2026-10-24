const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. App Icon SVG (Optimized for 1:1 mobile app launcher icon)
const appIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF500" />
      <stop offset="45%" stop-color="#FFDD00" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>

    <!-- Globe Sphere Shading -->
    <radialGradient id="globeSphere" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFE600" />
      <stop offset="60%" stop-color="#FACC15" />
      <stop offset="100%" stop-color="#CA8A04" />
    </radialGradient>

    <!-- Outer Shadow -->
    <filter id="dropShadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.35" />
    </filter>
    
    <!-- Text Shadow -->
    <filter id="textGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Base Icon Background with Rounded Corners -->
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad)" stroke="#DC2626" stroke-width="12" />

  <!-- Inner Red Accent Line -->
  <rect x="28" y="28" width="456" height="456" rx="96" fill="none" stroke="#DC2626" stroke-width="2.5" stroke-opacity="0.4" />

  <!-- Top Center: The Iconic 3D Blue & Gold Globe -->
  <g transform="translate(256, 172)" filter="url(#dropShadow)">
    <!-- Globe Circle -->
    <circle cx="0" cy="0" r="110" fill="url(#globeSphere)" stroke="#DC2626" stroke-width="5" />
    
    <!-- Longitude Grids -->
    <ellipse cx="0" cy="0" rx="80" ry="109" fill="none" stroke="#CA8A04" stroke-width="2.5" opacity="0.75" />
    <ellipse cx="0" cy="0" rx="42" ry="109" fill="none" stroke="#CA8A04" stroke-width="2.5" opacity="0.75" />
    <line x1="0" y1="-110" x2="0" y2="110" stroke="#CA8A04" stroke-width="2.5" opacity="0.75" />

    <!-- Latitude Grids -->
    <line x1="-109" y1="0" x2="109" y2="0" stroke="#CA8A04" stroke-width="2.5" opacity="0.85" />
    <ellipse cx="0" cy="-45" rx="100" ry="24" fill="none" stroke="#CA8A04" stroke-width="2" opacity="0.7" />
    <ellipse cx="0" cy="45" rx="100" ry="24" fill="none" stroke="#CA8A04" stroke-width="2" opacity="0.7" />

    <!-- Continents in Deep Royal Blue (Africa, Europe, Asia / India) -->
    <!-- Africa & Middle East -->
    <path d="M -14 -10 C -12 -28 10 -35 25 -25 C 38 -15 32 15 28 35 C 24 55 5 70 -5 72 C -18 68 -28 45 -22 25 C -15 15 -18 0 -14 -10 Z" fill="#1D4ED8" stroke="#1E40AF" stroke-width="1.5" />
    <!-- Europe -->
    <path d="M -30 -38 C -22 -55 5 -60 15 -48 C 22 -40 10 -30 -5 -32 C -15 -35 -24 -28 -30 -38 Z" fill="#1D4ED8" />
    <!-- Asia & India -->
    <path d="M 18 -45 C 35 -55 65 -45 75 -25 C 80 -10 65 15 50 18 C 42 28 32 38 28 42 C 24 35 30 18 35 5 C 25 -10 12 -25 18 -45 Z" fill="#1D4ED8" />
    <!-- Americas hint on left -->
    <path d="M -75 -40 C -60 -45 -55 -25 -70 -10 C -82 5 -88 -20 -75 -40 Z" fill="#1D4ED8" opacity="0.9" />
    <path d="M -72 15 C -62 30 -65 55 -78 60 C -85 45 -82 25 -72 15 Z" fill="#1D4ED8" opacity="0.9" />
  </g>

  <!-- Lower Section: Red Headline Banner with Devanagari Typography -->
  <!-- "ब्रेकिंग" -->
  <text x="256" y="342" text-anchor="middle" font-family="'Baloo 2', 'Noto Sans Devanagari', 'Mukta', sans-serif" font-size="62" font-weight="900" fill="#DC2626" stroke="#991B1B" stroke-width="1.5" filter="url(#textGlow)">
    ब्रेकिंग
  </text>

  <!-- "न्यूजवाला" -->
  <text x="256" y="415" text-anchor="middle" font-family="'Baloo 2', 'Noto Sans Devanagari', 'Mukta', sans-serif" font-size="66" font-weight="900" fill="#DC2626" stroke="#991B1B" stroke-width="1.5" filter="url(#textGlow)">
    न्यूजवाला
  </text>

  <!-- Tagline Underline -->
  <line x1="80" y1="438" x2="432" y2="438" stroke="#DC2626" stroke-width="3" stroke-linecap="round" />

  <!-- Tagline Text -->
  <text x="256" y="464" text-anchor="middle" font-family="'Noto Sans Devanagari', sans-serif" font-size="20" font-weight="800" fill="#18181B" letter-spacing="0.5">
    भारत के जिलों से, आपके दिलों तक
  </text>
</svg>
`;

// 2. Maskable Icon SVG (with 15% outer safe margin so Android circular masks don't clip)
const maskableIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF500" />
      <stop offset="45%" stop-color="#FFDD00" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>

    <radialGradient id="globeSphereMask" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FFE600" />
      <stop offset="60%" stop-color="#FACC15" />
      <stop offset="100%" stop-color="#CA8A04" />
    </radialGradient>
  </defs>

  <!-- Full-bleed background for maskable -->
  <rect x="0" y="0" width="512" height="512" fill="url(#bgGradMask)" />

  <!-- Safe Zone Scale (80% inside safe margin) -->
  <g transform="translate(256, 256) scale(0.82) translate(-256, -256)">
    <!-- Globe -->
    <g transform="translate(256, 155)">
      <circle cx="0" cy="0" r="100" fill="url(#globeSphereMask)" stroke="#DC2626" stroke-width="5" />
      <ellipse cx="0" cy="0" rx="72" ry="99" fill="none" stroke="#CA8A04" stroke-width="2.5" opacity="0.75" />
      <ellipse cx="0" cy="0" rx="38" ry="99" fill="none" stroke="#CA8A04" stroke-width="2.5" opacity="0.75" />
      <line x1="0" y1="-100" x2="0" y2="100" stroke="#CA8A04" stroke-width="2.5" opacity="0.75" />
      <line x1="-99" y1="0" x2="99" y2="0" stroke="#CA8A04" stroke-width="2.5" opacity="0.85" />
      <ellipse cx="0" cy="-40" rx="90" ry="22" fill="none" stroke="#CA8A04" stroke-width="2" opacity="0.7" />
      <ellipse cx="0" cy="40" rx="90" ry="22" fill="none" stroke="#CA8A04" stroke-width="2" opacity="0.7" />
      <path d="M -14 -10 C -12 -28 10 -35 25 -25 C 38 -15 32 15 28 35 C 24 55 5 70 -5 72 C -18 68 -28 45 -22 25 C -15 15 -18 0 -14 -10 Z" fill="#1D4ED8" stroke="#1E40AF" stroke-width="1.5" />
      <path d="M -30 -38 C -22 -55 5 -60 15 -48 C 22 -40 10 -30 -5 -32 C -15 -35 -24 -28 -30 -38 Z" fill="#1D4ED8" />
      <path d="M 18 -45 C 35 -55 65 -45 75 -25 C 80 -10 65 15 50 18 C 42 28 32 38 28 42 C 24 35 30 18 35 5 C 25 -10 12 -25 18 -45 Z" fill="#1D4ED8" />
    </g>

    <!-- Text -->
    <text x="256" y="325" text-anchor="middle" font-family="'Baloo 2', 'Noto Sans Devanagari', 'Mukta', sans-serif" font-size="64" font-weight="900" fill="#DC2626" stroke="#991B1B" stroke-width="1.5">
      ब्रेकिंग
    </text>
    <text x="256" y="398" text-anchor="middle" font-family="'Baloo 2', 'Noto Sans Devanagari', 'Mukta', sans-serif" font-size="68" font-weight="900" fill="#DC2626" stroke="#991B1B" stroke-width="1.5">
      न्यूजवाला
    </text>
    <line x1="80" y1="422" x2="432" y2="422" stroke="#DC2626" stroke-width="3" stroke-linecap="round" />
    <text x="256" y="448" text-anchor="middle" font-family="'Noto Sans Devanagari', sans-serif" font-size="20" font-weight="800" fill="#18181B">
      भारत के जिलों से, आपके दिलों तक
    </text>
  </g>
</svg>
`;

async function main() {
  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write SVG files
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), appIconSvg.trim());
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), appIconSvg.trim());
  console.log('Written icon.svg and favicon.svg');

  // Convert SVG buffers to PNGs via sharp
  const iconBuffer = Buffer.from(appIconSvg);
  const maskableBuffer = Buffer.from(maskableIconSvg);

  // 1. pwa-512x512.png
  await sharp(iconBuffer)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Generated pwa-512x512.png');

  // 2. pwa-192x192.png
  await sharp(iconBuffer)
    .resize(192, 192)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Generated pwa-192x192.png');

  // 3. pwa-maskable-512x512.png
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Generated pwa-maskable-512x512.png');

  // 4. apple-touch-icon.png (180x180)
  await sharp(iconBuffer)
    .resize(180, 180)
    .png({ quality: 95 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 5. favicon-32x32.png and favicon.png (64x64) and favicon.ico
  await sharp(iconBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(iconBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated favicon-32x32.png and favicon.png');

  // Also copy/make favicon.ico as a png container or 32x32
  await sharp(iconBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Generated favicon.ico');

  console.log('All icons generated successfully!');
}

main().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
