// Renders public/og.png (1200 × 630, the link preview) from an SVG drawn here,
// with the app icon placed on it. Run after changing it: npm run og
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="g" cx="0.78" cy="0.35" r="0.6">
      <stop offset="0" stop-color="#ff3912" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ff3912" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M56 0H0V56" fill="none" stroke="#ffffff" stroke-opacity="0.05"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="#080808"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <text x="160" y="140" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="34" font-weight="600" fill="#ffffff" letter-spacing="-0.5">DarkShell</text>
  <text x="80" y="300" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="78" font-weight="700" fill="#ffffff" letter-spacing="-3">Money that minds</text>
  <text x="80" y="388" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="78" font-weight="700" fill="#ffffff" letter-spacing="-3">its own business.</text>
  <text x="80" y="470" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="28" fill="#ffffff" fill-opacity="0.65">The private wallet for Secret Network · Android</text>
  <rect x="80" y="520" width="12" height="12" rx="6" fill="#ff3912"/>
  <text x="104" y="532" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22" fill="#ffffff" fill-opacity="0.5">Encrypted balance · fees taken care of · pay in any token</text>
</svg>`;

const icon = await sharp(await readFile(new URL('../public/avatar.webp', import.meta.url)))
	.resize(64, 64)
	.composite([{ input: Buffer.from('<svg width="64" height="64"><circle cx="32" cy="32" r="32"/></svg>'), blend: 'dest-in' }])
	.png()
	.toBuffer();

await sharp(Buffer.from(svg))
	.composite([{ input: icon, left: 80, top: 96 }])
	.png({ compressionLevel: 9 })
	.toFile(new URL('../public/og.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

console.log('public/og.png written');
