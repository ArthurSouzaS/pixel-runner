import Phaser from 'phaser';

const SHAKE_MS = 450;
const RESPAWN_MS = 2800;

/**
 * Plataforma que treme ao ser pisada, cai e reaparece depois de um tempo.
 * Colide só por cima, como as plataformas atravessáveis.
 */
export class FallingPlatform extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;
  private readonly homeX: number;
  private readonly homeY: number;
  private mode: 'idle' | 'shaking' | 'falling' | 'gone' = 'idle';
  private timer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'faller');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.homeX = x;
    this.homeY = y;
    this.setDepth(4);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(16, 6).setOffset(0, 0);
    this.body.checkCollision.down = false;
    this.body.checkCollision.left = false;
    this.body.checkCollision.right = false;
  }

  /** Chamado quando o jogador pisa na plataforma. */
  trigger(): void {
    if (this.mode !== 'idle') return;
    this.mode = 'shaking';
    this.timer = SHAKE_MS;
  }

  step(delta: number, worldBottom: number): void {
    this.timer -= delta;
    switch (this.mode) {
      case 'shaking':
        this.x = this.homeX + (Math.random() < 0.5 ? -1 : 1);
        if (this.timer <= 0) {
          this.mode = 'falling';
          this.x = this.homeX;
          this.body.setAllowGravity(true);
          this.body.setImmovable(false);
          this.timer = RESPAWN_MS;
        }
        break;
      case 'falling':
        if (this.y > worldBottom + 32 || this.timer <= 0) {
          this.mode = 'gone';
          this.setVisible(false);
          this.body.enable = false;
          this.timer = 600;
        }
        break;
      case 'gone':
        if (this.timer <= 0) this.reset();
        break;
    }
  }

  reset(): void {
    this.mode = 'idle';
    this.body.enable = true;
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.reset(this.homeX, this.homeY);
    this.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 250 });
  }
}
