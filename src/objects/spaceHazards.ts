import Phaser from 'phaser';
import type { AsteroidData, LaserData } from '../levels/types';
import { type LaserState, laserStateAt } from '../logic/laser';
import { TILE_SIZE } from '../logic/levelParser';

/** Asteroide que flutua indo e voltando e gira. Encostar machuca. */
export class Asteroid extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;
  private readonly sx: number;
  private readonly sy: number;
  private readonly dx: number;
  private readonly dy: number;
  private readonly period: number;
  private readonly spin: number;

  constructor(scene: Phaser.Scene, data: AsteroidData) {
    const x = data.x * TILE_SIZE + 8;
    const y = data.y * TILE_SIZE + 8;
    super(scene, x, y, 'asteroid');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.sx = x;
    this.sy = y;
    this.dx = data.dx * TILE_SIZE;
    this.dy = data.dy * TILE_SIZE;
    this.period = Math.max(0.5, data.period);
    this.spin = (data.x % 2 === 0 ? 1 : -1) * (90 + data.period * 10);
    const scale = data.size >= 2 ? 2 : 1;
    this.setScale(scale).setDepth(6);
    this.body.setAllowGravity(false);
    this.body.setCircle(6, 2, 2);
  }

  /** Posição em `seconds` (vai e volta suavemente). */
  positionAt(seconds: number): { x: number; y: number } {
    const k = 0.5 - 0.5 * Math.cos((seconds / this.period) * Math.PI * 2);
    return { x: this.sx + this.dx * k, y: this.sy + this.dy * k };
  }

  step(seconds: number, delta: number): void {
    const dt = Math.max(delta / 1000, 0.001);
    const target = this.positionAt(seconds + dt);
    this.body.setVelocity((target.x - this.x) / dt, (target.y - this.y) / dt);
    this.angle += this.spin * dt;
  }
}

export { LASER_WARNING_MS, type LaserState, laserStateAt } from '../logic/laser';

/** Laser entre dois emissores. Mata enquanto está ligado. */
export class Laser {
  readonly rect: Phaser.Geom.Rectangle;
  private readonly beam: Phaser.GameObjects.Rectangle;
  private readonly glow: Phaser.GameObjects.Rectangle;
  state: LaserState = 'off';

  constructor(
    scene: Phaser.Scene,
    private readonly data: LaserData,
  ) {
    const len = data.length * TILE_SIZE;
    const x0 = data.x * TILE_SIZE;
    const y0 = data.y * TILE_SIZE;
    if (data.vertical) {
      this.rect = new Phaser.Geom.Rectangle(x0 + 6, y0, 4, len);
      scene.add.image(x0 + 8, y0 + 4, 'laser-emitter').setDepth(7);
      scene.add.image(x0 + 8, y0 + len - 4, 'laser-emitter').setDepth(7);
    } else {
      this.rect = new Phaser.Geom.Rectangle(x0, y0 + 6, len, 4);
      scene.add.image(x0 + 4, y0 + 8, 'laser-emitter').setDepth(7);
      scene.add.image(x0 + len - 4, y0 + 8, 'laser-emitter').setDepth(7);
    }
    const r = this.rect;
    this.glow = scene.add.rectangle(r.centerX, r.centerY, r.width + (data.vertical ? 6 : 0), r.height + (data.vertical ? 0 : 6), 0xb13e53, 0.35).setDepth(6);
    this.beam = scene.add.rectangle(r.centerX, r.centerY, r.width, r.height, 0xf4f4f4, 1).setDepth(6);
  }

  update(timeMs: number): void {
    this.state = laserStateAt(this.data, timeMs);
    const on = this.state === 'on';
    const warn = this.state === 'warning';
    this.beam.setVisible(on || (warn && Math.floor(timeMs / 80) % 2 === 0));
    this.beam.setAlpha(on ? 1 : 0.4).setScale(this.data.vertical ? (on ? 1 : 0.25) : 1, this.data.vertical ? 1 : on ? 1 : 0.25);
    this.glow.setVisible(on);
  }

  /** O laser atinge este retângulo agora? */
  hits(body: { x: number; y: number; width: number; height: number }): boolean {
    if (this.state !== 'on') return false;
    const r = this.rect;
    return body.x < r.right && body.x + body.width > r.x && body.y < r.bottom && body.y + body.height > r.y;
  }
}
