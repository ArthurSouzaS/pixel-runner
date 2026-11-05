import Phaser from 'phaser';
import { t } from '../i18n';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { touchState } from '../input/touchState';
import { saveManager } from '../systems/saveManager';
import { MenuList } from '../ui/MenuList';
import { pixelText } from '../ui/text';
import type { LevelScene } from './LevelScene';

/** Menu de pausa exibido por cima da fase. */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    const level = this.scene.get('Level') as LevelScene;
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.7).setOrigin(0);
    this.add.rectangle(cx, GAME_HEIGHT / 2, 220, 150, COLORS.ink, 0.9).setStrokeStyle(2, COLORS.cyan);
    pixelText(this, cx, 78, t('pause.title'), { size: 16, color: COLORS.cyan }).setOrigin(0.5);

    const resume = (): void => {
      touchState.reset();
      this.scene.resume('Level');
      this.scene.stop();
    };

    new MenuList(this, cx, 112, [
      { label: t('pause.continue'), action: resume },
      {
        label: t('pause.restart'),
        action: () => {
          this.scene.stop();
          level.restartLevel();
        },
      },
      { label: () => t('common.sound', { state: sfx.isMuted() ? t('common.off') : t('common.on') }), action: () => saveManager.toggleMute() },
      {
        label: level.getLevelInfo().custom ? t('pause.toEditor') : t('pause.toMenu'),
        action: () => {
          this.scene.stop();
          level.quitToMenu();
        },
      },
    ]);

    pixelText(this, cx, GAME_HEIGHT - 24, t('pause.hint'), { size: 8, color: COLORS.gray }).setOrigin(0.5);
    this.input.keyboard?.on('keydown-ESC', resume);
    this.input.keyboard?.on('keydown-P', resume);
  }
}
