import Phaser from 'phaser';
import type { LevelTheme, ThemeKey } from '../levels/types';
import { TILE_SIZE } from '../logic/levelParser';
import { hex, PALETTE } from './palette';
import { createCanvasTexture, createSheet, drawArt, seededRandom } from './pixelArt';
import {
  BAT_FRAMES,
  BOSS_FRAMES,
  BULLET_ART,
  CHECKPOINT_FRAMES,
  COIN_FRAMES,
  HEART_ART,
  HOPPER_FRAMES,
  LOCK_ART,
  PIX_FRAMES,
  PORTAL_FRAMES,
  SPIKE_ART,
  STAR_ART,
  TURRET_FRAMES,
  WALKER_FRAMES,
} from './sprites';

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Gera todas as texturas fixas do jogo (sprites e ícones). */
export function createSpriteTextures(scene: Phaser.Scene): void {
  createSheet(scene, 'pix', PIX_FRAMES);
  createSheet(scene, 'walker', WALKER_FRAMES);
  createSheet(scene, 'hopper', HOPPER_FRAMES);
  createSheet(scene, 'bat', BAT_FRAMES);
  createSheet(scene, 'turret', TURRET_FRAMES);
  createSheet(scene, 'boss', BOSS_FRAMES, 2);
  createSheet(scene, 'coin', COIN_FRAMES);
  createSheet(scene, 'spike', [SPIKE_ART]);
  createSheet(scene, 'checkpoint', CHECKPOINT_FRAMES);
  createSheet(scene, 'portal', PORTAL_FRAMES);
  createSheet(scene, 'bullet', [BULLET_ART]);
  createSheet(scene, 'heart', [HEART_ART]);
  createSheet(scene, 'lock', [LOCK_ART]);
  createSheet(scene, 'star', [STAR_ART]);

  // Partícula: quadradinho branco que é colorido com tint.
  createCanvasTexture(scene, 'px', 2, 2, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2, 2);
  });
  createCanvasTexture(scene, 'px4', 4, 4, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 4, 4);
  });

  // Gradiente escuro que marca os abismos no fundo da tela.
  createCanvasTexture(scene, 'void', 4, 40, (ctx) => {
    for (let y = 0; y < 40; y++) {
      ctx.fillStyle = `rgba(26, 28, 44, ${Math.min(1, (y / 30) ** 1.5).toFixed(2)})`;
      ctx.fillRect(0, y, 4, 1);
    }
  });

  createCanvasTexture(scene, 'cloud', 48, 20, (ctx) => {
    const art = [
      '..........wwwww.................................',
      '.......wwwwwwwwww...............................',
      '......wwwwwwwwwwwww.......wwwwww................',
      '....wwwwwwwwwwwwwwwww...wwwwwwwwwww.............',
      '...wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww..........',
      '..wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.......',
      '.wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww....',
      'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww.',
      'gggwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwgggg',
      '..ggggggggwwwwwwwwwwggggggggwwwwwwwwwggggggg....',
      '.......ggggggggggggg......ggggggggggg...........',
    ];
    drawArt(ctx, art, 0, 4);
  });

  createSheet(scene, 'button-arrow', [
    [
      '....kk....',
      '...kwwk...',
      '..kwwwwk..',
      '.kwwwwwwk.',
      'kwwwwwwwwk',
      'kkkwwwwkkk',
      '..kwwwwk..',
      '..kwwwwk..',
      '..kwwwwk..',
      '..kkkkkk..',
    ],
  ]);
}

// ---------------------------------------------------------------------------
// Tiles por tema
// ---------------------------------------------------------------------------

interface TileColors {
  top: string;
  topLight: string;
  topDark: string;
  fill: string;
  fillDark: string;
  fillLight: string;
  block: string;
  blockLight: string;
  blockDark: string;
}

const TILE_COLORS: Record<ThemeKey, TileColors> = {
  grass: {
    top: PALETTE.t, topLight: PALETTE.l, topDark: PALETTE.T,
    fill: PALETTE.u, fillDark: PALETTE.U, fillLight: '#a8714a',
    block: PALETTE.G, blockLight: PALETTE.g, blockDark: PALETTE.d,
  },
  cave: {
    top: PALETTE.B, topLight: PALETTE.c, topDark: PALETTE.b,
    fill: PALETTE.d, fillDark: PALETTE.n, fillLight: PALETTE.G,
    block: PALETTE.n, blockLight: PALETTE.b, blockDark: PALETTE.k,
  },
  factory: {
    top: PALETTE.y, topLight: PALETTE.w, topDark: PALETTE.o,
    fill: PALETTE.G, fillDark: PALETTE.d, fillLight: PALETTE.g,
    block: PALETTE.r, blockLight: PALETTE.o, blockDark: PALETTE.p,
  },
  ice: {
    top: PALETTE.w, topLight: '#ffffff', topDark: PALETTE.g,
    fill: PALETTE.B, fillDark: PALETTE.b, fillLight: PALETTE.c,
    block: PALETTE.c, blockLight: PALETTE.w, blockDark: PALETTE.B,
  },
  castle: {
    top: PALETTE.g, topLight: PALETTE.w, topDark: PALETTE.G,
    fill: PALETTE.p, fillDark: PALETTE.k, fillLight: PALETTE.r,
    block: PALETTE.d, blockLight: PALETTE.G, blockDark: PALETTE.k,
  },
};

function px(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w = 1, h = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawFill(ctx: CanvasRenderingContext2D, ox: number, c: TileColors, rand: () => number): void {
  px(ctx, c.fill, ox, 0, TILE_SIZE, TILE_SIZE);
  for (let i = 0; i < 10; i++) {
    const x = ox + Math.floor(rand() * 15);
    const y = Math.floor(rand() * 15);
    px(ctx, rand() > 0.5 ? c.fillDark : c.fillLight, x, y, rand() > 0.6 ? 2 : 1, 1);
  }
}

/** Tileset com 4 tiles: topo, preenchimento, bloco e plataforma atravessável. */
export function createTileset(scene: Phaser.Scene, theme: ThemeKey): string {
  const key = `tiles-${theme}`;
  const c = TILE_COLORS[theme];
  const rand = seededRandom(theme.length * 977);
  createCanvasTexture(scene, key, TILE_SIZE * 4, TILE_SIZE, (ctx) => {
    // 0: topo (superfície)
    drawFill(ctx, 0, c, rand);
    px(ctx, c.top, 0, 0, 16, 5);
    px(ctx, c.topLight, 0, 0, 16, 1);
    px(ctx, c.topDark, 0, 5, 16, 1);
    for (let x = 0; x < 16; x += 3) {
      const h = 1 + Math.floor(rand() * 2);
      px(ctx, c.top, x, 5, 2, h);
      px(ctx, c.topDark, x, 5 + h, 2, 1);
    }
    if (theme === 'factory') {
      for (let x = 0; x < 16; x += 4) px(ctx, PALETTE.k, x, 1, 2, 3);
    }
    if (theme === 'cave') {
      px(ctx, PALETTE.w, 3, 1, 1, 1);
      px(ctx, PALETTE.w, 11, 2, 1, 1);
    }

    // 1: preenchimento
    drawFill(ctx, 16, c, rand);
    if (theme === 'factory') {
      px(ctx, c.fillLight, 16, 0, 16, 1);
      px(ctx, c.fillDark, 16, 15, 16, 1);
      px(ctx, PALETTE.g, 18, 2);
      px(ctx, PALETTE.g, 29, 2);
      px(ctx, PALETTE.g, 18, 13);
      px(ctx, PALETTE.g, 29, 13);
    }

    // 2: bloco sólido (tijolo)
    const bx = 32;
    px(ctx, c.block, bx, 0, 16, 16);
    px(ctx, c.blockLight, bx, 0, 16, 1);
    px(ctx, c.blockLight, bx, 0, 1, 16);
    px(ctx, c.blockDark, bx, 15, 16, 1);
    px(ctx, c.blockDark, bx + 15, 0, 1, 16);
    px(ctx, c.blockDark, bx, 7, 16, 1);
    px(ctx, c.blockDark, bx + 7, 0, 1, 7);
    px(ctx, c.blockDark, bx + 3, 8, 1, 7);
    px(ctx, c.blockDark, bx + 11, 8, 1, 7);
    px(ctx, c.blockLight, bx + 8, 1, 6, 1);
    px(ctx, c.blockLight, bx + 1, 8, 2, 1);

    // 3: plataforma atravessável (prancha fina)
    const pxo = 48;
    px(ctx, PALETTE.k, pxo, 0, 16, 7);
    px(ctx, c.blockLight, pxo, 1, 16, 4);
    px(ctx, c.block, pxo, 3, 16, 2);
    px(ctx, c.blockDark, pxo, 5, 16, 1);
    px(ctx, PALETTE.k, pxo + 4, 1, 1, 4);
    px(ctx, PALETTE.k, pxo + 12, 1, 1, 4);
  });
  return key;
}

/** Textura da plataforma móvel com a largura pedida, em tiles. */
export function createMoverTexture(scene: Phaser.Scene, theme: ThemeKey, widthTiles: number): string {
  const key = `mover-${theme}-${widthTiles}`;
  const c = TILE_COLORS[theme];
  const w = widthTiles * TILE_SIZE;
  createCanvasTexture(scene, key, w, 10, (ctx) => {
    px(ctx, PALETTE.k, 0, 0, w, 10);
    px(ctx, c.blockLight, 1, 1, w - 2, 2);
    px(ctx, c.block, 1, 3, w - 2, 4);
    px(ctx, c.blockDark, 1, 7, w - 2, 2);
    for (let x = 6; x < w - 4; x += 8) {
      px(ctx, PALETTE.y, x, 4, 2, 2);
    }
  });
  return key;
}

// ---------------------------------------------------------------------------
// Fundos (céu em faixas + duas camadas de silhuetas para parallax)
// ---------------------------------------------------------------------------

function lerpColor(a: number, b: number, t: number): number {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

export function createSkyTexture(scene: Phaser.Scene, theme: LevelTheme): string {
  const key = `sky-${theme.key}`;
  createCanvasTexture(scene, key, 4, GAME_HEIGHT, (ctx) => {
    const bands = 10;
    const bandH = Math.ceil(GAME_HEIGHT / bands);
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = hex(lerpColor(theme.skyTop, theme.skyBottom, i / (bands - 1)));
      ctx.fillRect(0, i * bandH, 4, bandH);
    }
  });
  return key;
}

type SilhouetteStyle = 'round' | 'peaks' | 'blocks' | 'towers' | 'stalactites';

const STYLE_BY_THEME: Record<ThemeKey, [SilhouetteStyle, SilhouetteStyle]> = {
  grass: ['round', 'round'],
  cave: ['stalactites', 'peaks'],
  factory: ['blocks', 'towers'],
  ice: ['peaks', 'peaks'],
  castle: ['towers', 'blocks'],
};

function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  style: SilhouetteStyle,
  color: string,
  width: number,
  height: number,
  base: number,
  amplitude: number,
  rand: () => number,
  snow?: string,
): void {
  ctx.fillStyle = color;
  if (style === 'round') {
    const f1 = (Math.PI * 2 * (1 + Math.floor(rand() * 2))) / width;
    const f2 = (Math.PI * 2 * (3 + Math.floor(rand() * 2))) / width;
    for (let x = 0; x < width; x += 2) {
      const y = base - amplitude * (0.6 * Math.sin(x * f1) + 0.4 * Math.sin(x * f2 + 1.3)) - amplitude;
      ctx.fillRect(x, Math.round(y), 2, height - Math.round(y));
    }
  } else if (style === 'peaks') {
    const peaks = 5 + Math.floor(rand() * 3);
    const step = width / peaks;
    for (let x = 0; x < width; x++) {
      const local = (x % step) / step;
      const tri = 1 - Math.abs(local - 0.5) * 2;
      const peakIndex = Math.floor(x / step);
      const peakH = amplitude * (0.7 + 0.3 * Math.sin(peakIndex * 2.1));
      const y = Math.round(base - tri * peakH * 2);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, height - y);
      if (snow && tri > 0.75) {
        ctx.fillStyle = snow;
        ctx.fillRect(x, y, 1, Math.max(1, Math.round((tri - 0.75) * 24)));
      }
    }
  } else if (style === 'blocks' || style === 'towers') {
    let x = 0;
    while (x < width) {
      const w = style === 'towers' ? 14 + Math.floor(rand() * 18) : 24 + Math.floor(rand() * 40);
      const h = amplitude * (0.6 + rand() * 1.4);
      const top = Math.round(base - h);
      ctx.fillStyle = color;
      ctx.fillRect(x, top, w, height - top);
      if (style === 'towers') {
        for (let bx = x; bx < x + w; bx += 4) ctx.fillRect(bx, top - 4, 2, 4);
      } else if (rand() > 0.5) {
        ctx.fillRect(x + Math.floor(w / 3), top - 14, 5, 14);
      }
      x += w + (style === 'towers' ? 6 + Math.floor(rand() * 20) : 0);
    }
  } else if (style === 'stalactites') {
    for (let x = 0; x < width; x += 6) {
      const h = Math.round(10 + rand() * amplitude * 1.5);
      for (let i = 0; i < h; i++) {
        const half = Math.max(0, Math.round(3 * (1 - i / h)));
        ctx.fillRect(x + 3 - half, i, half * 2, 1);
      }
    }
    const f = (Math.PI * 4) / width;
    for (let x = 0; x < width; x += 2) {
      const y = Math.round(base - amplitude * 0.5 * (1 + Math.sin(x * f)));
      ctx.fillRect(x, y, 2, height - y);
    }
  }
}

export interface BackgroundKeys {
  sky: string;
  far: string;
  near: string;
}

export function createBackgroundTextures(scene: Phaser.Scene, theme: LevelTheme): BackgroundKeys {
  const [farStyle, nearStyle] = STYLE_BY_THEME[theme.key];
  const sky = createSkyTexture(scene, theme);
  const far = `bg-far-${theme.key}`;
  const near = `bg-near-${theme.key}`;
  const snow = theme.key === 'ice' ? PALETTE.w : undefined;
  createCanvasTexture(scene, far, GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    drawSilhouette(ctx, farStyle, hex(theme.farHills), GAME_WIDTH, GAME_HEIGHT, 170, 30, seededRandom(11), snow);
  });
  createCanvasTexture(scene, near, GAME_WIDTH, GAME_HEIGHT, (ctx) => {
    drawSilhouette(ctx, nearStyle, hex(theme.nearHills), GAME_WIDTH, GAME_HEIGHT, 215, 22, seededRandom(23));
  });
  return { sky, far, near };
}
