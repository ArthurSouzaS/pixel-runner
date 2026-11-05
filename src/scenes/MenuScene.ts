import Phaser from 'phaser';
import { getLang, t } from '../i18n';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { TOTAL_LEVELS } from '../levels';
import { formatScore } from '../logic/score';
import { findSkin } from '../logic/shop';
import { ensurePixSkin } from '../gfx/skins';
import { saveManager } from '../systems/saveManager';
import { MenuList } from '../ui/MenuList';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

/** Menu inicial. */
export class MenuScene extends Phaser.Scene {
  private tick: () => void = () => {};

  constructor() {
    super('Menu');
  }

  create(): void {
    this.tick = createMenuBackdrop(this, 0);
    this.cameras.main.fadeIn(300, 26, 28, 44);
    sfx.playMusic('menu');

    const cx = GAME_WIDTH / 2;
    const title = pixelText(this, cx, 38, 'PIXEL RUNNER', { size: 28, color: COLORS.yellow, strokeThickness: 6 }).setOrigin(0.5);
    title.setShadow(3, 3, '#5d275d', 0, true, true);
    const two = pixelText(this, cx + 196, 26, '3', { size: 20, color: COLORS.red, strokeThickness: 5 }).setOrigin(0.5).setAngle(12);
    this.tweens.add({ targets: [title], y: 42, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: two, scale: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    pixelText(this, cx, 66, t('menu.tagline'), { size: 8, color: COLORS.white }).setOrigin(0.5);

    // Pix correndo no chão do menu.
    const skin = findSkin(saveManager.get().equippedSkin);
    const skinKey = ensurePixSkin(this, skin.id, skin.colors);
    const pix = this.add.sprite(70, GAME_HEIGHT - 40, skinKey).play(`${skinKey}-run`).setScale(2);
    this.tweens.add({ targets: pix, x: GAME_WIDTH - 70, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onYoyo: () => pix.setFlipX(true), onRepeat: () => pix.setFlipX(false) });

    const panel = this.add.rectangle(cx, 140, 220, 126, COLORS.ink, 0.65).setStrokeStyle(2, COLORS.white, 0.4);
    panel.setDepth(-1);

    const save = saveManager.get();
    new MenuList(
      this,
      cx,
      88,
      [
        {
          label: save.unlockedLevels > 1 ? t('menu.continue') : t('menu.newGame'),
          action: () =>
            save.storySeen.includes('intro') ? this.scene.start('Hub') : this.scene.start('Cutscene', { id: 'intro', next: { scene: 'Hub' } }),
        },
        { label: t('menu.modes'), action: () => this.scene.start('Modes') },
        { label: t('menu.shop'), action: () => this.scene.start('Shop') },
        { label: t('menu.achievements'), action: () => this.scene.start('Achievements') },
        { label: t('menu.options'), action: () => this.scene.start('Options') },
        { label: t('menu.credits'), action: () => this.scene.start('Credits') },
        { label: () => t('menu.language'), action: () => this.toggleLanguage() },
      ],
      17,
      10,
    );

    pixelText(this, 8, 6, t('menu.record', { score: formatScore(save.highScore) }), { size: 8, color: COLORS.cyan });
    this.add.image(GAME_WIDTH - 84, 10, 'coin', 0);
    pixelText(this, GAME_WIDTH - 76, 6, `${save.wallet}`, { size: 8, color: COLORS.yellow });
    pixelText(this, cx, 230, t('menu.progress', { levels: save.unlockedLevels, total: TOTAL_LEVELS, ach: save.achievements.length }), { size: 8, color: COLORS.white }).setOrigin(0.5);


    // Desbloqueia o áudio no primeiro toque/tecla.
    this.input.once('pointerdown', () => sfx.unlock());
    this.input.keyboard?.once('keydown', () => sfx.unlock());
  }

  private toggleLanguage(): void {
    saveManager.setLang(getLang() === 'pt' ? 'en' : 'pt');
    this.time.delayedCall(80, () => this.scene.restart());
  }

  update(): void {
    this.tick();
  }
}
