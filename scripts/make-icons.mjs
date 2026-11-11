// Generates the app icons (PNG) with no dependencies: a simple perfume-bottle
// glyph on a plum background. Run with `npm run icons`; output is committed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../public/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x / size, y / size);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PLUM = [123, 63, 97];
const CREAM = [247, 242, 236];
const roundRect = (x, y, x0, y0, x1, y1, r) => {
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= x0 && x <= x1 && y >= y0 && y <= y1;
};

/** `pad` shrinks the glyph so maskable icons survive circular crops. */
function bottle(pad) {
  const s = (v) => 0.5 + (v - 0.5) * (1 - pad);
  return (x, y) => {
    const body = roundRect(x, y, s(0.28), s(0.42), s(0.72), s(0.86), 0.09 * (1 - pad));
    const neck = roundRect(x, y, s(0.43), s(0.3), s(0.57), s(0.43), 0.01);
    const cap = roundRect(x, y, s(0.38), s(0.15), s(0.62), s(0.3), 0.04 * (1 - pad));
    const shine = roundRect(x, y, s(0.34), s(0.5), s(0.4), s(0.74), 0.03 * (1 - pad));
    if (shine) return [...PLUM.map((c) => Math.round(c + (255 - c) * 0.35)), 255];
    if (body || neck || cap) return [...CREAM, 255];
    // Soft vertical gradient on the background.
    const t = y * 0.25;
    return [...PLUM.map((c) => Math.round(c * (1 - t))), 255];
  };
}

const files = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['apple-touch-icon.png', 180, 0],
  ['icon-maskable-512.png', 512, 0.3],
];
for (const [name, size, pad] of files) {
  writeFileSync(new URL(name, OUT), png(size, bottle(pad)));
  console.log(`wrote public/icons/${name}`);
}
