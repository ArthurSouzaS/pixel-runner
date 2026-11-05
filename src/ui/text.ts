import Phaser from 'phaser';
import { COLORS, hex } from '../gfx/palette';

export const FONT = '"Press Start 2P", monospace';

export interface TextOptions {
  size?: number;
  color?: number;
  stroke?: number;
  strokeThickness?: number;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
}

/** Cria um texto com a fonte pixel e contorno, padrão visual do jogo. */
export function pixelText(scene: Phaser.Scene, x: number, y: number, text: string, opts: TextOptions = {}): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, text, {
    fontFamily: FONT,
    fontSize: `${opts.size ?? 8}px`,
    color: hex(opts.color ?? COLORS.white),
    stroke: hex(opts.stroke ?? COLORS.ink),
    strokeThickness: opts.strokeThickness ?? 3,
    align: opts.align ?? 'left',
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    resolution: 2,
  });
  return t;
}
