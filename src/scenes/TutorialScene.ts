import Phaser from 'phaser';
import { t } from '../i18n';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { isTouchDevice, touchState } from '../input/touchState';
import { ABILITIES, type AbilityId } from '../logic/abilities';
import { pixelText } from '../ui/text';
import { abilityText } from '../i18n/data';

/** Tutorial curto exibido ao ganhar uma habilidade nova. */
export class TutorialScene extends Phaser.Scene {
  constructor() {
    super('Tutorial');
  }

  create(data: { ability: AbilityId }): void {
    const info = ABILITIES[data.ability];
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.6).setOrigin(0);
    const panel = this.add.container(cx, GAME_HEIGHT / 2);
    panel.add(this.add.rectangle(0, 0, 360, 170, COLORS.ink, 0.95).setStrokeStyle(2, info.color));
    panel.add(pixelText(this, 0, -66, t('tutorial.new'), { size: 8, color: COLORS.yellow }).setOrigin(0.5));
    panel.add(this.add.image(-118, -40, 'orb').setTint(info.color).setScale(1.5));
    panel.add(pixelText(this, 10, -40, abilityText(info.id, 'name', info.name).toUpperCase(), { size: 14, color: info.color }).setOrigin(0.5));
    panel.add(pixelText(this, 0, -6, abilityText(info.id, 'description', info.description), { size: 8, align: 'center', wrap: 330, scalable: true }).setOrigin(0.5).setLineSpacing(4));
    const how = isTouchDevice() ? abilityText(info.id, 'touch', info.touch) : abilityText(info.id, 'keyboard', info.keyboard);
    panel.add(pixelText(this, 0, 36, how, { size: 8, color: COLORS.cyan, align: 'center', wrap: 330, scalable: true }).setOrigin(0.5).setLineSpacing(4));
    const cont = pixelText(this, 0, 70, t('tutorial.continue'), { size: 8, color: COLORS.gray }).setOrigin(0.5).setAlpha(0);
    panel.add(cont);
    panel.setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });

    // Pequena espera para o jogador não fechar sem querer.
    this.time.delayedCall(700, () => {
      cont.setAlpha(1);
      this.tweens.add({ targets: cont, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });
      const close = (): void => {
        touchState.reset();
        this.scene.resume('Level');
        this.scene.stop();
      };
      this.input.keyboard?.once('keydown', close);
      this.input.once('pointerdown', close);
    });
  }
}
