import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { GAME_WIDTH } from '../gfx/textures';
import { gamepads } from '../input/gamepad';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';

/** Camada sempre ativa que mostra avisos de conquistas desbloqueadas. */
export class ToastScene extends Phaser.Scene {
  private queue: { title: string; text: string; icon: string }[] = [];
  private showing = false;

  constructor() {
    super('Toast');
  }

  create(): void {
    const off = saveManager.onAchievement((a) => this.notify('CONQUISTA!', a.name, 'star'));
    gamepads.onConnect = (_name, connected) => this.notify('CONTROLE', connected ? 'Conectado!' : 'Desconectado', 'heart');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      gamepads.onConnect = undefined;
    });
  }

  /** Mostra um aviso no canto da tela (fila). */
  notify(title: string, text: string, icon = 'star'): void {
    this.queue.push({ title, text, icon });
    this.next();
  }

  private next(): void {
    if (this.showing) return;
    const item = this.queue.shift();
    if (!item) return;
    this.showing = true;
    this.scene.bringToTop();
    sfx.play('checkpoint');
    const w = 200;
    const c = this.add.container(GAME_WIDTH + w / 2, 40).setDepth(100);
    c.add(this.add.rectangle(0, 0, w, 34, COLORS.ink, 0.92).setStrokeStyle(2, COLORS.yellow));
    c.add(this.add.image(-w / 2 + 16, 0, item.icon).setScale(2));
    c.add(pixelText(this, -w / 2 + 30, -9, item.title, { size: 8, color: COLORS.yellow }));
    c.add(pixelText(this, -w / 2 + 30, 3, item.text, { size: 8 }));
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
