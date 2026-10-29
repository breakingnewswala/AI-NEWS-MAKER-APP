const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, getPixelRgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
      const off = 1 + x * 4;
      row[off] = r;
      row[off + 1] = g;
      row[off + 2] = b;
      row[off + 3] = a;
    }
    rawRows.push(row);
  }
  const idat = makeChunk('IDAT', zlib.deflateSync(Buffer.concat(rawRows)));
  const iend = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

const outDir = path.join(__dirname, '../public/assets/icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 1. Facebook: Blue circle #1877F2 with white 'f'
const fbPng = createPng(256, 256, (x, y, w, h) => {
  const cx = 128, cy = 128, r = 128;
  const dist = Math.hypot(x - cx, y - cy);
  if (dist > r) return [0, 0, 0, 0];
  // 'f' shape
  // vertical bar: x around 130 to 165, y from 100 to 256
  // crossbar: x around 105 to 190, y 100 to 132
  // top curve: arch up and to the right
  const inStem = (x >= 134 && x <= 168 && y >= 100 && y <= 256);
  const inBar = (x >= 105 && x <= 195 && y >= 100 && y <= 132);
  const inArch = (x >= 134 && x <= 185 && y >= 48 && y <= 100 && Math.hypot(x - 185, y - 90) <= 50 && !(x < 155 && y < 75));
  if (inStem || inBar || inArch) {
    return [255, 255, 255, 255];
  }
  return [24, 119, 242, 255];
});
fs.writeFileSync(path.join(outDir, 'facebook.png'), fbPng);

// 2. Instagram: Squircle gradient + camera
const igPng = createPng(256, 256, (x, y, w, h) => {
  // rounded rectangle border radius 55
  const rx = 55;
  const inSquircle = (
    (x >= rx && x <= w - rx) ||
    (y >= rx && y <= h - rx) ||
    Math.hypot(x - rx, y - rx) <= rx ||
    Math.hypot(x - (w - rx), y - rx) <= rx ||
    Math.hypot(x - rx, y - (h - rx)) <= rx ||
    Math.hypot(x - (w - rx), y - (h - rx)) <= rx
  );
  if (!inSquircle) return [0, 0, 0, 0];

  // Camera elements
  // Outer square: 52 to 204
  const camR = 38;
  const inCamOuter = (x >= 52 && x <= 204 && y >= 52 && y <= 204 &&
    ((x >= 52 + camR && x <= 204 - camR) ||
     (y >= 52 + camR && y <= 204 - camR) ||
     Math.hypot(x - (52 + camR), y - (52 + camR)) <= camR ||
     Math.hypot(x - (204 - camR), y - (52 + camR)) <= camR ||
     Math.hypot(x - (52 + camR), y - (204 - camR)) <= camR ||
     Math.hypot(x - (204 - camR), y - (204 - camR)) <= camR));

  const camInnerR = 24;
  const inCamInner = (x >= 66 && x <= 190 && y >= 66 && y <= 190 &&
    ((x >= 66 + camInnerR && x <= 190 - camInnerR) ||
     (y >= 66 + camInnerR && y <= 190 - camInnerR) ||
     Math.hypot(x - (66 + camInnerR), y - (66 + camInnerR)) <= camInnerR ||
     Math.hypot(x - (190 - camInnerR), y - (66 + camInnerR)) <= camInnerR ||
     Math.hypot(x - (66 + camInnerR), y - (190 - camInnerR)) <= camInnerR ||
     Math.hypot(x - (190 - camInnerR), y - (190 - camInnerR)) <= camInnerR));

  const isCamBorder = inCamOuter && !inCamInner;

  // Center lens circle
  const distCenter = Math.hypot(x - 128, y - 128);
  const isLensBorder = distCenter >= 26 && distCenter <= 40;

  // Dot at (176, 80)
  const isDot = Math.hypot(x - 176, y - 80) <= 9;

  if (isCamBorder || isLensBorder || isDot) {
    return [255, 255, 255, 255];
  }

  // Instagram gradient: bottom-left yellow to top-right purple
  const t = (x + (h - y)) / (w + h);
  const r = Math.round(253 * (1 - t) + 131 * t);
  const g = Math.round(152 * (1 - t) + 58 * t);
  const b = Math.round(39 * (1 - t) + 180 * t);
  return [r, g, b, 255];
});
fs.writeFileSync(path.join(outDir, 'instagram.png'), igPng);

// 3. Twitter / X: Black squircle with white X
const xPng = createPng(256, 256, (x, y, w, h) => {
  const rx = 50;
  const inSquircle = (
    (x >= rx && x <= w - rx) ||
    (y >= rx && y <= h - rx) ||
    Math.hypot(x - rx, y - rx) <= rx ||
    Math.hypot(x - (w - rx), y - rx) <= rx ||
    Math.hypot(x - rx, y - (h - rx)) <= rx ||
    Math.hypot(x - (w - rx), y - (h - rx)) <= rx
  );
  if (!inSquircle) return [0, 0, 0, 0];

  // Draw X:
  // Stroke 1: diagonal top-left to bottom-right
  // Stroke 2: diagonal top-right to bottom-left
  const nx = (x - 128) / 70;
  const ny = (y - 128) / 70;
  const d1 = Math.abs(nx - ny);
  const d2 = Math.abs(nx + ny);
  if ((d1 < 0.22 && Math.abs(nx) < 1.1 && Math.abs(ny) < 1.1) ||
      (d2 < 0.22 && Math.abs(nx) < 1.1 && Math.abs(ny) < 1.1)) {
    return [255, 255, 255, 255];
  }
  return [0, 0, 0, 255];
});
fs.writeFileSync(path.join(outDir, 'twitter.png'), xPng);

// 4. YouTube: Red squircle with white play triangle
const ytPng = createPng(256, 256, (x, y, w, h) => {
  const rx = 52;
  const inRect = (
    (x >= rx && x <= w - rx) ||
    (y >= rx && y <= h - rx) ||
    Math.hypot(x - rx, y - rx) <= rx ||
    Math.hypot(x - (w - rx), y - rx) <= rx ||
    Math.hypot(x - rx, y - (h - rx)) <= rx ||
    Math.hypot(x - (w - rx), y - (h - rx)) <= rx
  );
  if (!inRect) return [0, 0, 0, 0];

  // Triangle: (108, 80) to (174, 128) to (108, 176)
  if (x >= 108 && x <= 174) {
    const halfH = ((x - 108) / 66) * 48;
    const maxHalf = 48 - ((x - 108) / 66) * 48;
    if (y >= 128 - maxHalf && y <= 128 + maxHalf) {
      return [255, 255, 255, 255];
    }
  }
  return [255, 0, 0, 255];
});
fs.writeFileSync(path.join(outDir, 'youtube.png'), ytPng);

// 5. LinkedIn: Blue circle #0A66C2 with white 'in'
const inPng = createPng(256, 256, (x, y, w, h) => {
  const cx = 128, cy = 128, r = 128;
  if (Math.hypot(x - cx, y - cy) > r) return [0, 0, 0, 0];

  // 'i': dot at (95, 78) r=12, stem at x 83 to 107, y 104 to 184
  const inDot = Math.hypot(x - 95, y - 78) <= 13;
  const inStemI = (x >= 83 && x <= 107 && y >= 104 && y <= 184);

  // 'n': left stem x 124 to 148, y 104 to 184
  const inStemN1 = (x >= 124 && x <= 148 && y >= 104 && y <= 184);
  // 'n': right stem x 172 to 196, y 126 to 184
  const inStemN2 = (x >= 172 && x <= 196 && y >= 126 && y <= 184);
  // 'n': shoulder arch
  const inArchN = (x >= 134 && x <= 196 && y >= 104 && y <= 138 && Math.hypot(x - 160, y - 138) <= 36 && !(x >= 148 && x <= 172 && y >= 128));

  if (inDot || inStemI || inStemN1 || inStemN2 || inArchN) {
    return [255, 255, 255, 255];
  }
  return [10, 102, 194, 255];
});
fs.writeFileSync(path.join(outDir, 'linkedin.png'), inPng);

// 6. WhatsApp: Green circle #25D366 with white phone in bubble
const waPng = createPng(256, 256, (x, y, w, h) => {
  const cx = 128, cy = 128, r = 128;
  if (Math.hypot(x - cx, y - cy) > r) return [0, 0, 0, 0];

  // Speech bubble body r=82
  const dBubble = Math.hypot(x - 128, y - 128);
  const inTail = (x >= 70 && x <= 110 && y >= 165 && y <= 210);
  const inBubble = (dBubble <= 82) || inTail;

  if (inBubble) {
    // Phone handset inside (centered at 128, 128)
    const dPhone = Math.hypot(x - 128, y - 128);
    // Green cutout inside bubble
    if (dPhone < 68) {
      // White handset receiver:
      const rx = (x - 128) * 0.707 + (y - 128) * 0.707;
      const ry = -(x - 128) * 0.707 + (y - 128) * 0.707;
      const inHandle = (Math.abs(rx) <= 14 && Math.abs(ry) <= 42);
      const inEarpiece = (Math.hypot(rx - 10, ry - 38) <= 18);
      const inMouthpiece = (Math.hypot(rx - 10, ry + 38) <= 18);
      if (inHandle || inEarpiece || inMouthpiece) {
        return [255, 255, 255, 255];
      }
      return [37, 211, 102, 255];
    }
    return [255, 255, 255, 255];
  }
  return [37, 211, 102, 255];
});
fs.writeFileSync(path.join(outDir, 'whatsapp.png'), waPng);
fs.writeFileSync(path.join(outDir, 'WhatsApp Icon.png'), waPng);

// 7. Website: Black circular globe wireframe
const webPng = createPng(256, 256, (x, y, w, h) => {
  const cx = 128, cy = 128, r = 114;
  const dist = Math.hypot(x - cx, y - cy);
  if (dist > r) return [0, 0, 0, 0];

  // Outer border thickness 14
  if (dist >= r - 14) return [0, 0, 0, 255];

  // Equator horizontal line
  if (Math.abs(y - cy) <= 7) return [0, 0, 0, 255];

  // Prime meridian vertical line
  if (Math.abs(x - cx) <= 7) return [0, 0, 0, 255];

  // Latitude curves
  const lat1 = Math.abs(Math.hypot(x - cx, (y - cy) * 1.5) - 80);
  if (lat1 <= 6) return [0, 0, 0, 255];

  // Longitude curves (ellipses)
  const lon1 = Math.abs(Math.hypot((x - cx) * 2.2, y - cy) - 108);
  if (lon1 <= 7) return [0, 0, 0, 255];

  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(outDir, 'website.png'), webPng);
fs.writeFileSync(path.join(outDir, 'web icon.png'), webPng);

console.log('Successfully created all 7 PNG icon files in public/assets/icons');
