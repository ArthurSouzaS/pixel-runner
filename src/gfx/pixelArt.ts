import Phaser from 'phaser';
import { PALETTE } from './palette';

/** Um frame de pixel art: cada string é uma linha, cada caractere uma cor da paleta (`.` = transparente). */
export type PixelArt = readonly string[];

export function artSize(art: PixelArt): { w: number; h: number } {
  return { w: art.reduce((m, row) => Math.max(m, row.length), 0), h: art.length };
}

export function drawArt(
  ctx: CanvasRenderingContext2D,
  art: PixelArt,
  ox: number,
  oy: number,
  scale = 1,
  palette: Record<string, string> = PALETTE,
): void {
  art.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  });
}

/**
 * Cria uma textura com vários frames lado a lado, a partir de pixel art.
 * Os frames ficam acessíveis pelos índices 0..n-1.
 */
export function createSheet(scene: Phaser.Scene, key: string, frames: readonly PixelArt[], scale = 1): void {
  if (scene.textures.exists(key)) return;
  const sizes = frames.map(artSize);
  const fw = Math.max(...sizes.map((s) => s.w)) * scale;
  const fh = Math.max(...sizes.map((s) => s.h)) * scale;
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh);
  if (!tex) return;
  const ctx = tex.getContext();
  frames.forEach((art, i) => {
    drawArt(ctx, art, i * fw, 0, scale);
    tex.add(i, 0, i * fw, 0, fw, fh);
  });
  tex.refresh();
}

/** Cria uma textura desenhando livremente num canvas. */
export function createCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, width, height);
  if (!tex) return;
  draw(tex.getContext());
  tex.refresh();
}

/** Gerador pseudoaleatório determinístico (mulberry32), para texturas sempre iguais. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
