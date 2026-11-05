// Gera os ícones PNG do PWA a partir da pixel art do Pix (sem dependências externas).
// Uso: node scripts/generate-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const PALETTE = {
  k: [26, 28, 44], t: [56, 183, 100], l: [167, 240, 112], T: [37, 113, 121], o: [239, 125, 87],
  w: [244, 244, 244], B: [65, 166, 246], G: [86, 108, 134], y: [255, 205, 117],
};
const BG = [26, 28, 44];
const BG2 = [41, 54, 111];

// Pix (16x16), o mesmo desenho do jogo.
const PIX = [
  '......kkkkk.....',
  '.....kttttlk....',
  '....ktttttttk...',
  '....ktkkkkkkk...',
  '....ktkBwBBwk...',
  '....ktkkkkkkk...',
  '...okttttttTk...',
  '.oookooooooook..',
  'oo..kttttttTk...',
  '....kTtttttTk...',
  '....kTTtttTTk...',
  '.....kkkkkkk....',
  '......kGk.kGk...',
  '......kGk.kGk...',
  '.....kGGk.kGGk..',
  '.....kkkk.kkkk..',
];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
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
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** Ícone: fundo com faixa de céu, estrelas e o Pix centralizado. `pad` = margem (maskable precisa de mais). */
function icon(size, pad) {
  const scale = Math.floor((size * (1 - 2 * pad)) / 16);
  const off = Math.floor((size - scale * 16) / 2);
  return png(size, (x, y) => {
    const px = Math.floor((x - off) / scale);
    const py = Math.floor((y - off) / scale);
    const ch = PIX[py]?.[px];
    if (ch && ch !== '.' && x >= off && y >= off) return [...PALETTE[ch], 255];
    const cell = Math.max(2, Math.floor(size / 96));
    const sx = Math.floor(x / cell);
    const sy = Math.floor(y / cell);
    const star = (((sx * 73856093) ^ (sy * 19349663)) >>> 0) % 37 === 0 && y < size * 0.6;
    if (star) return [244, 244, 244, 255];
    return y > size * 0.78 ? [56, 183, 100, 255] : y > size * 0.74 ? [167, 240, 112, 255] : [...(y < size / 2 ? BG : BG2), 255];
  });
}

const out = new URL('../public/icons/', import.meta.url);
writeFileSync(new URL('icon-192.png', out), icon(192, 0.12));
writeFileSync(new URL('icon-512.png', out), icon(512, 0.12));
writeFileSync(new URL('icon-maskable-512.png', out), icon(512, 0.22));
writeFileSync(new URL('apple-touch-icon.png', out), icon(180, 0.12));
console.log('Ícones gerados em public/icons/');
