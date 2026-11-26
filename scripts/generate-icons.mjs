// Generates the app icons in /public (PNG, no dependencies). Run with: node scripts/generate-icons.mjs
//
// Pitfalls guarded against:
// - Edges are anti-aliased by 4x4 supersampling so icons look clean at every size.
// - "maskable" icons are full-bleed with the mark kept inside the central safe zone, because
//   Android crops them to a circle or squircle; normal icons keep rounded corners instead.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(outDir, { recursive: true });

const BG = [37, 99, 235]; // primary-600
const FG = [255, 255, 255];

// Distance from point to a line segment
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Signed distance to a rounded square covering [0,1]^2 with corner radius r
function roundedSquareDist(x, y, r) {
  const qx = Math.abs(x - 0.5) - (0.5 - r);
  const qy = Math.abs(y - 0.5) - (0.5 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function render(size, { rounded, markScale }) {
  const SS = 4;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  // Check mark in unit coordinates, scaled around the centre
  const s = markScale;
  const pt = (x, y) => [0.5 + (x - 0.5) * s, 0.5 + (y - 0.5) * s];
  const [a1x, a1y] = pt(0.27, 0.53);
  const [a2x, a2y] = pt(0.43, 0.69);
  const [a3x, a3y] = pt(0.74, 0.34);
  const halfStroke = 0.055 * s;

  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let bgCov = 0, fgCov = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const inside = rounded ? roundedSquareDist(u, v, 0.22) <= 0 : true;
          if (!inside) continue;
          bgCov++;
          const d = Math.min(
            segDist(u, v, a1x, a1y, a2x, a2y),
            segDist(u, v, a2x, a2y, a3x, a3y),
          );
          if (d <= halfStroke) fgCov++;
        }
      }
      const total = SS * SS;
      const alpha = bgCov / total;
      const mix = bgCov ? fgCov / bgCov : 0;
      const i = y * (size * 4 + 1) + 1 + x * 4;
      for (let c = 0; c < 3; c++) raw[i + c] = Math.round(BG[c] * (1 - mix) + FG[c] * mix);
      raw[i + 3] = Math.round(alpha * 255);
    }
  }
  return raw;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, opts) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(render(size, opts), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const files = [
  ['icon-192.png', 192, { rounded: true, markScale: 1 }],
  ['icon-512.png', 512, { rounded: true, markScale: 1 }],
  ['icon-maskable-512.png', 512, { rounded: false, markScale: 0.72 }],
  ['apple-touch-icon.png', 180, { rounded: false, markScale: 0.8 }],
];
for (const [name, size, opts] of files) {
  writeFileSync(join(outDir, name), png(size, opts));
  console.log('wrote', name);
}

writeFileSync(join(outDir, 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#2563eb"/>
  <path d="M17.3 33.9l10.2 10.2 20-22.4" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`);
console.log('wrote icon.svg');
