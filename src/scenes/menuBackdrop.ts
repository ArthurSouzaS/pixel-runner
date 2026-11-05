import Phaser from 'phaser';
import { createBackgroundTextures, createTileset, GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { LEVELS } from '../levels';
import { TILE_SIZE } from '../logic/levelParser';

/** Cenário animado (parallax rolando sozinho) usado no menu e nas telas finais. */
export function createMenuBackdrop(scene: Phaser.Scene, themeIndex = 0): () => void {
  const theme = LEVELS[themeIndex].theme;
  const keys = createBackgroundTextures(scene, theme);
  scene.add.image(0, 0, keys.sky).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
  const clouds = [0, 1, 2, 3].map((i) => scene.add.image(i * 140 + 40, 30 + (i % 2) * 40, 'cloud').setAlpha(0.85));
  const far = scene.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, keys.far).setOrigin(0);
  const near = scene.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, keys.near).setOrigin(0);

  const tiles = createTileset(scene, theme.key);
  const texture = scene.textures.get(tiles);
  if (!texture.has('top')) {
    texture.add('top', 0, 0, 0, TILE_SIZE, TILE_SIZE);
    texture.add('fill', 0, TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  }
  const groundY = GAME_HEIGHT - TILE_SIZE * 2;
  const groundTop = scene.add.tileSprite(0, groundY, GAME_WIDTH, TILE_SIZE, tiles, 'top').setOrigin(0);
  const groundFill = scene.add.tileSprite(0, groundY + TILE_SIZE, GAME_WIDTH, TILE_SIZE, tiles, 'fill').setOrigin(0);

  let offset = 0;
  return () => {
    offset += 0.6;
    far.tilePositionX = offset * 0.2;
    near.tilePositionX = offset * 0.5;
    groundTop.tilePositionX = offset;
    groundFill.tilePositionX = offset;
    for (const c of clouds) {
      c.x -= 0.15;
      if (c.x < -30) c.x = GAME_WIDTH + 30;
    }
  };
}
