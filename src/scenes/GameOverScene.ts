import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import type { GameMode } from '../input/controls';
import { formatScore } from '../logic/score';
import { saveManager } from '../systems/saveManager';
import { MenuList } from '../ui/MenuList';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

export interface GameOverData {
  victory: boolean;
  score: number;
  levelIndex: number;
  isNewRecord: boolean;
  mode?: GameMode;
  /** Corrida: jogador vencedor (1 ou 2). */
  winner?: number;
}

/** Tela de fim de jogo (derrota ou vitória). */
export class GameOverScene extends Phaser.Scene {
  private tick: () => void = () => {};

  constructor() {
    super('GameOver');
  }

  create(data: GameOverData): void {
    const cx = GAME_WIDTH / 2;
    if (data.mode === 'race') {
      this.createRaceResult(data);
      return;
    }
    this.tick = createMenuBackdrop(this, data.victory ? 0 : 4);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, data.victory ? 0.35 : 0.6).setOrigin(0);
    this.cameras.main.fadeIn(400, 26, 28, 44);

    if (data.victory) {
      sfx.play('victory');
      const confetti = this.add.particles(0, -10, 'px4', {
        x: { min: 0, max: GAME_WIDTH },
        lifespan: 4000,
        speedY: { min: 30, max: 80 },
        speedX: { min: -20, max: 20 },
        rotate: { min: 0, max: 360 },
        frequency: 60,
        tint: [0xffcd75, 0x38b764, 0x41a6f6, 0xb13e53, 0xf4f4f4],
      });
      confetti.setDepth(5);
      const pix = this.add.sprite(cx, GAME_HEIGHT - 40, 'pix').setScale(2);
      this.tweens.add({ targets: pix, y: pix.y - 24, duration: 350, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    }

    const title = pixelText(this, cx, 52, data.victory ? 'VITÓRIA!' : 'GAME OVER', {
      size: 26,
      color: data.victory ? COLORS.yellow : COLORS.red,
      strokeThickness: 6,
    }).setOrigin(0.5);
    title.setScale(0.3);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.easeOut' });

    const subtitle = data.victory ? 'Você salvou os dois mundos!' : `Você chegou até a fase ${data.levelIndex + 1}`;
    pixelText(this, cx, 84, subtitle, { size: 8 }).setOrigin(0.5);
    pixelText(this, cx, 106, `PONTOS  ${formatScore(data.score)}`, { size: 10 }).setOrigin(0.5);
    pixelText(this, cx, 122, `RECORDE ${formatScore(saveManager.get().highScore)}`, { size: 10, color: COLORS.cyan }).setOrigin(0.5);

    if (data.isNewRecord) {
      const record = pixelText(this, cx, 140, 'NOVO RECORDE!', { size: 10, color: COLORS.lightGreen }).setOrigin(0.5);
      this.tweens.add({ targets: record, alpha: 0.2, duration: 300, yoyo: true, repeat: -1 });
    }

    const retryLevel = data.victory ? 0 : data.levelIndex;
    new MenuList(this, cx, 170, [
      { label: data.victory ? 'Jogar de novo' : 'Tentar de novo', action: () => this.scene.start('Level', { levelIndex: retryLevel, mode: data.mode ?? 'single' }) },
      { label: 'Mapa do mundo', action: () => this.scene.start('WorldMap') },
      { label: 'Menu principal', action: () => this.scene.start('Menu') },
    ]);
  }

  private createRaceResult(data: GameOverData): void {
    const cx = GAME_WIDTH / 2;
    this.tick = createMenuBackdrop(this, 0);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.45).setOrigin(0);
    sfx.play('victory');
    const color = data.winner === 1 ? COLORS.lightGreen : COLORS.cyan;
    const title = pixelText(this, cx, 60, `JOGADOR ${data.winner} VENCEU!`, { size: 18, color, strokeThickness: 5 }).setOrigin(0.5);
    title.setScale(0.3);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.easeOut' });
    const key = data.winner === 1 ? 'pix' : 'pix-p2';
    const pix = this.add.sprite(cx, 112, this.textures.exists(key) ? key : 'pix', 0).setScale(3);
    this.tweens.add({ targets: pix, y: 100, duration: 300, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    const next = Math.min(data.levelIndex + 1, saveManager.get().unlockedLevels - 1);
    new MenuList(this, cx, 170, [
      { label: 'Revanche', action: () => this.scene.start('Level', { levelIndex: data.levelIndex, mode: 'race' }) },
      { label: 'Próxima fase', action: () => this.scene.start('Level', { levelIndex: next, mode: 'race' }), enabled: () => next !== data.levelIndex },
      { label: 'Menu principal', action: () => this.scene.start('Menu') },
    ]);
  }

  update(): void {
    this.tick();
  }
}
