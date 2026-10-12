import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. App Icon SVG (Square 512x512) for Mobile App Icon & Home Screen Shortcut
const appIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#241400"/>
      <stop offset="45%" stop-color="#120c02"/>
      <stop offset="100%" stop-color="#050301"/>
    </radialGradient>

    <!-- Globe Sphere Shading -->
    <radialGradient id="globeSphere" cx="38%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#FFF59D"/>
      <stop offset="25%" stop-color="#FDD835"/>
      <stop offset="65%" stop-color="#FBC02D"/>
      <stop offset="90%" stop-color="#F57F17"/>
      <stop offset="100%" stop-color="#E65100"/>
    </radialGradient>

    <!-- Globe Specular Highlight -->
    <radialGradient id="globeGlow" cx="30%" cy="25%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>

    <!-- Continent Blue Color -->
    <linearGradient id="oceanGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2A5CE8"/>
      <stop offset="100%" stop-color="#1836B2"/>
    </linearGradient>

    <!-- Yellow Plaque Gradient -->
    <linearGradient id="plaqueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFF200"/>
      <stop offset="100%" stop-color="#FFD700"/>
    </linearGradient>

    <!-- Red Banner Gradient -->
    <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D50000"/>
      <stop offset="100%" stop-color="#B71C1C"/>
    </linearGradient>

    <!-- Badge Drop Shadow -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.7"/>
    </filter>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Base App Background (Squircle / Rounded Box for Modern App Launcher) -->
  <rect width="512" height="512" rx="108" fill="url(#bgGrad)"/>
  
  <!-- Subtle Outer Border -->
  <rect x="2" y="2" width="508" height="508" rx="106" fill="none" stroke="#FFD700" stroke-width="3" stroke-opacity="0.4"/>

  <!-- Golden Ambient Glow behind Globe -->
  <circle cx="256" cy="206" r="150" fill="#FFC107" opacity="0.18" filter="url(#glow)"/>

  <!-- ================= 3D GLOBE EMBLEM ================= -->
  <g transform="translate(256, 196)">
    <!-- Main Yellow Sphere -->
    <circle cx="0" cy="0" r="142" fill="url(#globeSphere)" stroke="#B71C1C" stroke-width="4"/>

    <!-- Globe Grid Lines (Meridians & Parallels) -->
    <g fill="none" stroke="#B71C1C" stroke-width="1.8" opacity="0.55">
      <!-- Latitude Lines -->
      <line x1="-142" y1="0" x2="142" y2="0"/>
      <ellipse cx="0" cy="-50" rx="133" ry="24"/>
      <ellipse cx="0" cy="50" rx="133" ry="24"/>
      <ellipse cx="0" cy="-96" rx="104" ry="16"/>
      <ellipse cx="0" cy="96" rx="104" ry="16"/>
      
      <!-- Longitude Lines -->
      <line x1="0" y1="-142" x2="0" y2="142"/>
      <ellipse cx="0" cy="0" rx="60" ry="142"/>
      <ellipse cx="0" cy="0" rx="110" ry="142"/>
    </g>

    <!-- Blue Continents (Africa, Europe, Middle East, India) matching official logo -->
    <!-- Africa continent shape -->
    <path d="M-60,-22 C-55,-35 -38,-42 -22,-36 C-12,-32 -4,-28 10,-32 C18,-35 24,-24 22,-14 C20,-4 32,8 30,22 C28,34 38,44 32,60 C26,72 16,84 -2,94 C-16,102 -18,110 -22,112 C-26,114 -28,94 -34,80 C-40,68 -48,60 -56,52 C-66,42 -76,32 -74,18 C-72,4 -64,-10 -60,-22 Z" fill="url(#oceanGrad)"/>
    
    <!-- Europe continent shape -->
    <path d="M-52,-78 C-42,-88 -26,-92 -12,-86 C-4,-82 12,-90 24,-84 C32,-80 34,-68 28,-60 C22,-52 14,-46 -2,-48 C-14,-50 -26,-58 -38,-56 C-46,-54 -54,-68 -52,-78 Z" fill="url(#oceanGrad)"/>
    
    <!-- Middle East / Asia West -->
    <path d="M26,-36 C34,-44 48,-46 58,-40 C66,-34 76,-22 72,-10 C68,0 56,12 48,16 C42,18 36,8 34,-6 C32,-20 20,-28 26,-36 Z" fill="url(#oceanGrad)"/>

    <!-- Asia East / India tip outline -->
    <path d="M68,-40 C80,-52 98,-46 108,-34 C118,-22 124,-8 122,8 C120,18 108,24 96,16 C88,10 82,-4 76,-18 C72,-28 62,-32 68,-40 Z" fill="url(#oceanGrad)"/>

    <!-- Specular Lighting Overlay on Globe -->
    <circle cx="0" cy="0" r="142" fill="url(#globeGlow)" pointer-events="none"/>
    <!-- Outer 3D Rim Ring -->
    <circle cx="0" cy="0" r="142" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.4"/>
  </g>

  <!-- ================= LOWER BRAND PLAQUE / BANNER ================= -->
  <g transform="translate(256, 396)">
    <!-- Yellow Plaque matching the logo -->
    <rect x="-210" y="-48" width="420" height="96" rx="20" fill="url(#plaqueGrad)" stroke="#B71C1C" stroke-width="4" filter="url(#shadow)"/>

    <!-- Internal Red Accent Rim -->
    <rect x="-205" y="-43" width="410" height="86" rx="16" fill="none" stroke="#B71C1C" stroke-width="1.5" opacity="0.6"/>

    <!-- Main Title: ब्रेकिंग न्यूजवाला in Bold Red with Devanagari text -->
    <text x="0" y="-8" text-anchor="middle" font-family="'Baloo 2', 'Noto Sans Devanagari', Arial, sans-serif" font-weight="900" font-size="44" fill="#C62828" letter-spacing="0.5">
      ब्रेकिंग न्यूजवाला
    </text>

    <!-- Tagline: भारत के जिलों से, आपके दिलों तक -->
    <text x="0" y="26" text-anchor="middle" font-family="'Baloo 2', 'Noto Sans Devanagari', Arial, sans-serif" font-weight="800" font-size="19" fill="#1C1917" letter-spacing="0.2">
      भारत के जिलों से, आपके दिलों तक
    </text>
  </g>

  <!-- Top Notification / Live Pill -->
  <g transform="translate(256, 42)">
    <rect x="-70" y="-14" width="140" height="28" rx="14" fill="#D50000" stroke="#FFFFFF" stroke-width="2"/>
    <circle cx="-46" cy="0" r="5" fill="#FFFFFF"/>
    <text x="6" y="5" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-weight="900" font-size="14" fill="#FFFFFF" letter-spacing="1">
      STUDIO
    </text>
  </g>
</svg>`;

// 2. Horizontal Logo SVG (Official Logo replica for headers, watermarks, etc.)
const horizontalLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 340" width="850" height="340">
  <defs>
    <!-- Globe Sphere Shading -->
    <radialGradient id="hGlobeSphere" cx="38%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#FFF59D"/>
      <stop offset="25%" stop-color="#FDD835"/>
      <stop offset="65%" stop-color="#FBC02D"/>
      <stop offset="90%" stop-color="#F57F17"/>
      <stop offset="100%" stop-color="#E65100"/>
    </radialGradient>
    <radialGradient id="hGlobeGlow" cx="30%" cy="25%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hOceanGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2A5CE8"/>
      <stop offset="100%" stop-color="#1836B2"/>
    </linearGradient>
    <linearGradient id="hPlaqueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFF200"/>
      <stop offset="100%" stop-color="#FFDE00"/>
    </linearGradient>
  </defs>

  <!-- Right Plaque (Rounded Rectangle with curved top-right corner) -->
  <path d="M 180,24 
           L 720,24 
           A 96,96 0 0 1 816,120 
           L 816,280 
           A 24,24 0 0 1 792,304 
           L 180,304 
           Z" 
        fill="url(#hPlaqueGrad)" 
        stroke="#C62828" 
        stroke-width="7"/>

  <!-- Inner border accent -->
  <path d="M 195,36 
           L 715,36 
           A 84,84 0 0 1 799,120 
           L 799,289 
           A 14,14 0 0 1 785,303 
           L 195,303 
           Z" 
        fill="none" 
        stroke="#C62828" 
        stroke-width="2" 
        opacity="0.5"/>

  <!-- Text inside plaque: 'ब्रेकिंग' and 'न्यूजवाला' -->
  <!-- Line 1: ब्रेकिंग -->
  <text x="495" y="145" text-anchor="middle" font-family="'Baloo 2', 'Noto Sans Devanagari', Arial, sans-serif" font-weight="900" font-size="114" fill="#D50000" letter-spacing="1">
    ब्रेकिंग
  </text>

  <!-- Red divider line -->
  <rect x="350" y="162" width="430" height="6" rx="3" fill="#D50000"/>

  <!-- Line 2: न्यूजवाला -->
  <text x="500" y="248" text-anchor="middle" font-family="'Baloo 2', 'Noto Sans Devanagari', Arial, sans-serif" font-weight="900" font-size="88" fill="#D50000" letter-spacing="1">
    न्यूजवाला
  </text>

  <!-- Tagline: भारत के जिलों से, आपके दिलों तक -->
  <text x="515" y="286" text-anchor="middle" font-family="'Baloo 2', 'Noto Sans Devanagari', Arial, sans-serif" font-weight="800" font-size="28" fill="#1C1917" letter-spacing="0.5">
    भारत के जिलों से, आपके दिलों तक
  </text>

  <!-- Left: Globe 3D Sphere overlapping plaque -->
  <g transform="translate(170, 170)">
    <!-- Globe Body -->
    <circle cx="0" cy="0" r="150" fill="url(#hGlobeSphere)" stroke="#C62828" stroke-width="6"/>

    <!-- Grid lines -->
    <g fill="none" stroke="#C62828" stroke-width="2" opacity="0.6">
      <line x1="-150" y1="0" x2="150" y2="0"/>
      <ellipse cx="0" cy="-55" rx="140" ry="26"/>
      <ellipse cx="0" cy="55" rx="140" ry="26"/>
      <ellipse cx="0" cy="-105" rx="110" ry="18"/>
      <ellipse cx="0" cy="105" rx="110" ry="18"/>
      <line x1="0" y1="-150" x2="0" y2="150"/>
      <ellipse cx="0" cy="0" rx="65" ry="150"/>
      <ellipse cx="0" cy="0" rx="115" ry="150"/>
    </g>

    <!-- Blue continents -->
    <path d="M-64,-24 C-58,-38 -40,-46 -24,-38 C-12,-34 -4,-30 12,-34 C20,-38 26,-26 24,-14 C22,-4 34,10 32,24 C30,36 40,46 34,64 C28,76 18,88 -2,100 C-18,108 -20,116 -24,118 C-28,120 -30,100 -36,86 C-42,72 -50,64 -60,56 C-70,44 -80,34 -78,20 C-76,4 -68,-10 -64,-24 Z" fill="url(#hOceanGrad)"/>
    <path d="M-56,-82 C-46,-94 -28,-98 -14,-92 C-4,-88 12,-96 26,-90 C34,-86 36,-72 30,-64 C24,-56 16,-50 -2,-52 C-14,-54 -28,-62 -40,-60 C-50,-58 -58,-72 -56,-82 Z" fill="url(#hOceanGrad)"/>
    <path d="M28,-38 C36,-48 52,-50 62,-44 C70,-38 82,-24 78,-12 C74,-2 60,12 52,16 C46,18 38,8 36,-6 C34,-22 22,-30 28,-38 Z" fill="url(#hOceanGrad)"/>
    <path d="M72,-44 C86,-56 104,-50 114,-36 C124,-24 130,-8 128,8 C126,20 114,26 102,18 C94,12 88,-4 82,-20 C76,-30 66,-36 72,-44 Z" fill="url(#hOceanGrad)"/>

    <!-- Specular shine -->
    <circle cx="0" cy="0" r="150" fill="url(#hGlobeGlow)"/>
    <circle cx="0" cy="0" r="150" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.5"/>
  </g>
</svg>`;

async function run() {
  console.log('Writing SVGs...');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), appIconSvg);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), appIconSvg);
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), horizontalLogoSvg);

  const appIconBuffer = Buffer.from(appIconSvg);
  const horizontalLogoBuffer = Buffer.from(horizontalLogoSvg);

  console.log('Generating PNG raster icons...');
  // 512x512 PWA Icon
  await sharp(appIconBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 192x192 PWA Icon
  await sharp(appIconBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 180x180 Apple Touch Icon (iOS Safari)
  await sharp(appIconBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 512x512 Maskable Icon with 10% safe zone padding
  await sharp(appIconBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#0a0a0a',
    })
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 32x32 Favicon PNG & ICO
  await sharp(appIconBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  // Full Logo PNG
  await sharp(horizontalLogoBuffer)
    .resize(850, 340)
    .png()
    .toFile(path.join(publicDir, 'logo.png'));

  console.log('Icons generated successfully!');
}

run().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
