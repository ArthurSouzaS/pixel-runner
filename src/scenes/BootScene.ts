import Phaser from 'phaser';
import { createSpriteTextures } from '../gfx/textures';

/** Gera todas as texturas e animações a partir do código e segue para o menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    createSpriteTextures(this);
    this.createAnimations();
    this.scene.launch('Toast');
    this.scene.start('Menu');
  }

  private createAnimations(): void {
    const anims = this.anims;
    const frames = (key: string, list: number[]): Phaser.Types.Animations.AnimationFrame[] => list.map((frame) => ({ key, frame }));
    anims.create({ key: 'pix-idle', frames: frames('pix', [0, 0, 0, 0, 0, 0, 1]), frameRate: 6, repeat: -1 });
    anims.create({ key: 'pix-run', frames: frames('pix', [2, 3, 4, 5]), frameRate: 12, repeat: -1 });
    anims.create({ key: 'walker-move', frames: frames('walker', [0, 1]), frameRate: 4, repeat: -1 });
    anims.create({ key: 'bat-fly', frames: frames('bat', [0, 1]), frameRate: 8, repeat: -1 });
    anims.create({ key: 'coin-spin', frames: frames('coin', [0, 1, 2, 3]), frameRate: 8, repeat: -1 });
    anims.create({ key: 'checkpoint-wave', frames: frames('checkpoint', [1, 2]), frameRate: 4, repeat: -1 });
    anims.create({ key: 'armored-move', frames: frames('armored', [0, 1]), frameRate: 3, repeat: -1 });
    anims.create({ key: 'fish-swim', frames: frames('fish', [0, 1]), frameRate: 5, repeat: -1 });
    anims.create({ key: 'portal-glow', frames: frames('portal', [0, 1, 2]), frameRate: 6, repeat: -1 });
  }
}
