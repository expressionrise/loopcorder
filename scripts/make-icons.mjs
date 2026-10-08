// Generates the PWA icons (amber LED on graphite) from an SVG. Run: npm run icons
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const svg = (inset) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#16171a"/>
<g transform="translate(256 256) scale(${1 - inset}) translate(-256 -256)">
<circle cx="256" cy="256" r="170" fill="none" stroke="#3a3e46" stroke-width="28"/>
<path d="M256 86 A170 170 0 1 1 86 256" fill="none" stroke="#ffb547" stroke-width="28" stroke-linecap="round"/>
<circle cx="256" cy="256" r="62" fill="#ffb547"/>
</g></svg>`;

writeFileSync('public/icons/icon.svg', svg(0));
await sharp(Buffer.from(svg(0))).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(Buffer.from(svg(0))).resize(512, 512).png().toFile('public/icons/icon-512.png');
// Maskable: keep the artwork inside the central safe zone.
await sharp(Buffer.from(svg(0.25))).resize(512, 512).png().toFile('public/icons/icon-maskable-512.png');
console.log('icons written');
