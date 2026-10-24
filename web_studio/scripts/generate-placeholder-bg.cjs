const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const placeholderSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <defs>
    <linearGradient id="darkBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1c1917" />
      <stop offset="40%" stop-color="#0c0a09" />
      <stop offset="100%" stop-color="#000000" />
    </linearGradient>

    <radialGradient id="amberGlow" cx="50%" cy="42%" r="45%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.18" />
      <stop offset="60%" stop-color="#dc2626" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <pattern id="dotPattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="15" cy="15" r="1.5" fill="#ffffff" fill-opacity="0.04" />
    </pattern>
  </defs>

  <!-- Background Base -->
  <rect width="1080" height="1350" fill="url(#darkBg)" />
  <rect width="1080" height="1350" fill="url(#amberGlow)" />
  <rect width="1080" height="1350" fill="url(#dotPattern)" />

  <!-- Center dashed guide frame -->
  <rect x="70" y="80" width="940" height="1190" rx="32" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="14 12" stroke-opacity="0.4" />

  <!-- Center Guidance Visual -->
  <g transform="translate(540, 500)">
    <!-- Circular Icon Container -->
    <circle cx="0" cy="0" r="100" fill="#292524" stroke="#eab308" stroke-width="5" stroke-opacity="0.7" />
    <circle cx="0" cy="0" r="116" fill="none" stroke="#eab308" stroke-width="2" stroke-dasharray="8 6" stroke-opacity="0.4" />

    <!-- Camera Icon in SVG -->
    <g transform="translate(-48, -48) scale(1.0)">
      <!-- Camera Body -->
      <path d="M 20 28 L 32 16 L 64 16 L 76 28 L 88 28 C 92.4 28 96 31.6 96 36 L 96 80 C 96 84.4 92.4 88 88 88 L 8 88 C 3.6 88 0 84.4 0 80 L 0 36 C 0 31.6 3.6 28 8 28 Z" fill="#eab308" />
      <!-- Lens Circle -->
      <circle cx="48" cy="56" r="22" fill="#1c1917" stroke="#fef08a" stroke-width="5" />
      <circle cx="48" cy="56" r="11" fill="#eab308" />
      <circle cx="53" cy="51" r="3.5" fill="#ffffff" />
      <!-- Flash/Viewfinder -->
      <rect x="72" y="34" width="10" height="6" rx="2" fill="#1c1917" />
    </g>

    <!-- Upload Badge -->
    <rect x="-140" y="140" width="280" height="42" rx="21" fill="#dc2626" />
    <text x="0" y="167" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-size="22" font-weight="800" fill="#ffffff" letter-spacing="1">
      📷 स्टेप 3: फोटो जोड़ें
    </text>

    <!-- Main Guidance Headline -->
    <text x="0" y="235" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-size="44" font-weight="900" fill="#ffffff">
      कृपया अपनी न्यूज़ फोटो अपलोड करें
    </text>

    <!-- Instruction Subtitle 1 -->
    <text x="0" y="280" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-size="28" font-weight="700" fill="#facc15">
      गैलरी या कैमरे से मुख्य खबर की तस्वीर लगाएं
    </text>

    <!-- Instruction Subtitle 2 -->
    <text x="0" y="325" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-size="22" font-weight="500" fill="#a8a29e">
      (1, 2, 3 या 4 फोटो लेआउट का चयन भी कर सकते हैं)
    </text>
  </g>
</svg>
`;

async function main() {
  const publicDir = path.resolve(__dirname, '../public');
  const assetsDir = path.join(publicDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Write SVG
  fs.writeFileSync(path.join(assetsDir, 'placeholder_news_photo.svg'), placeholderSvg.trim());
  fs.writeFileSync(path.join(publicDir, 'placeholder_news_photo.svg'), placeholderSvg.trim());

  // Also convert to PNG
  await sharp(Buffer.from(placeholderSvg))
    .resize(1080, 1350)
    .png({ quality: 90 })
    .toFile(path.join(assetsDir, 'placeholder_news_photo.png'));
  await sharp(Buffer.from(placeholderSvg))
    .resize(1080, 1350)
    .png({ quality: 90 })
    .toFile(path.join(publicDir, 'placeholder_news_photo.png'));

  console.log('Placeholder news photo created successfully!');
}

main().catch(console.error);
