import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { GAME_WIDTH } from '../gfx/textures';
import type { Achievement } from '../logic/achievements';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';

/** Camada sempre ativa que mostra avisos de conquistas desbloqueadas. */
export class ToastScene extends Phaser.Scene {
  private queue: Achievement[] = [];
  private showing = false;

  constructor() {
    super('Toast');
  }

  create(): void {
    const off = saveManager.onAchievement((a) => {
      this.queue.push(a);
      this.next();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  private next(): void {
    if (this.showing) return;
    const achievement = this.queue.shift();
    if (!achievement) return;
    this.showing = true;
    this.scene.bringToTop();
    sfx.play('checkpoint');
    const w = 200;
    const c = this.add.container(GAME_WIDTH + w / 2, 40).setDepth(100);
    c.add(this.add.rectangle(0, 0, w, 34, COLORS.ink, 0.92).setStrokeStyle(2, COLORS.yellow));
    c.add(this.add.image(-w / 2 + 16, 0, 'star').setScale(2));
    c.add(pixelText(this, -w / 2 + 30, -9, 'CONQUISTA!', { size: 8, color: COLORS.yellow }));
    c.add(pixelText(this, -w / 2 + 30, 3, achievement.name, { size: 8 }));
    this.tweens.add({
      targets: c,
      x: GAME_WIDTH - w / 2 - 6,
      duration: 350,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: c,
          x: GAME_WIDTH + w / 2,
          delay: 2400,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => {
            c.destroy();
            this.showing = false;
            this.next();
          },
        });
      },
    });
  }
}
