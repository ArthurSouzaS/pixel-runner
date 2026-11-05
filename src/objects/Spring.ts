import Phaser from 'phaser';

/** Mola: lança o jogador bem alto ao ser pisada. */
export class Spring extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  static readonly LAUNCH_VELOCITY = 560;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'spring', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(4);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(12, 8).setOffset(2, 8);
  }

  /** Animação de compressão. */
  boing(): void {
    this.setFrame(1);
    this.scene.time.delayedCall(140, () => this.active && this.setFrame(0));
  }
}
