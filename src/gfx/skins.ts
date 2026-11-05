import Phaser from 'phaser';
import { createSheet } from './pixelArt';
import { PIX_FRAMES } from './sprites';

/**
 * Troca de cores do Pix: cada skin mapeia letras da paleta para outras.
 * Capacete: l (brilho), t (base), T (sombra). Cachecol: o.
 */
export type ColorMap = Record<string, string>;

/** Cria (uma vez) a textura e as animações de uma skin do Pix. Retorna a chave da textura. */
export function ensurePixSkin(scene: Phaser.Scene, id: string, colors: ColorMap): string {
  const key = id === 'classic' ? 'pix' : `pix-${id}`;
  if (!scene.textures.exists(key)) {
    const frames = PIX_FRAMES.map((art) => art.map((row) => row.replace(/[ltTo]/g, (ch) => colors[ch] ?? ch)));
    createSheet(scene, key, frames);
  }
  const anims = scene.anims;
  if (!anims.exists(`${key}-idle`)) {
    const f = (list: number[]) => list.map((frame) => ({ key, frame }));
    anims.create({ key: `${key}-idle`, frames: f([0, 0, 0, 0, 0, 0, 1]), frameRate: 6, repeat: -1 });
    anims.create({ key: `${key}-run`, frames: f([2, 3, 4, 5]), frameRate: 12, repeat: -1 });
  }
  return key;
}

/** Skin padrão do jogador 2 (capacete azul, cachecol amarelo). */
export const PLAYER2_COLORS: ColorMap = { l: 'c', t: 'B', T: 'b', o: 'y' };
