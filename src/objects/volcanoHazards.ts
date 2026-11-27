import Phaser from 'phaser';
import { COLORS } from '../gfx/palette';
import type { ConveyorData, GeyserData } from '../levels/types';
import { TILE_SIZE } from '../logic/levelParser';
import { type GeyserState, geyserRect, geyserStateAt } from '../logic/volcano';

/** Gêiser de fogo: borbulha (aviso) e dispara um jato que mata enquanto está ligado. */
export class Geyser {
  readonly rect: Phaser.Geom.Rectangle;
  state: GeyserState = 'off';
  private readonly flame: Phaser.GameObjects.Graphics;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    scene: Phaser.Scene,
    private readonly data: GeyserData,
  ) {
    const r = geyserRect(data, TILE_SIZE);
    this.rect = new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height);
    scene.add.image(data.x * TILE_SIZE + 8, data.y * TILE_SIZE + 12, 'vent').setDepth(6);
    this.flame = scene.add.graphics().setDepth(7);
    this.sparks = scene.add.particles(data.x * TILE_SIZE + 8, data.y * TILE_SIZE + 8, 'px', {
      speedY: { min: -120, max: -60 },
      speedX: { min: -20, max: 20 },
      lifespan: 400,
      scale: { start: 2, end: 0 },
      tint: [0xffcd75, 0xef7d57],
      frequency: 90,
      emitting: false,
    });
    this.sparks.setDepth(7);
  }

  update(timeMs: number): void {
    const next = geyserStateAt(this.data, timeMs);
    this.state = next;
    this.sparks.emitting = next === 'warning';
    const g = this.flame;
    g.clear();
    if (next !== 'on') return;
    // Coluna de fogo tremulando: borda vermelha, meio laranja, centro amarelo.
    const { x, y, width, height } = this.rect;
    const wob = Math.sin(timeMs / 40) * 1.5;
    g.fillStyle(COLORS.red, 0.9).fillRect(x - 1 + wob, y, width + 2, height);
    g.fillStyle(COLORS.orange, 0.95).fillRect(x + 1, y + 3, width - 2, height - 3);
    g.fillStyle(COLORS.yellow, 1).fillRect(x + 3 - wob, y + 8, width - 6, height - 8);
  }

  /** O fogo só machuca ligado. */
  hits(body: Phaser.Physics.Arcade.Body): boolean {
    return this.state === 'on' && Phaser.Geom.Rectangle.Overlaps(this.rect, new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height));
  }
}

/** Esteira: plataforma sólida que empurra quem está em cima. */
export class Conveyor {
  readonly sprite: Phaser.GameObjects.TileSprite;
  readonly speed: number;

  constructor(scene: Phaser.Scene, data: ConveyorData) {
    const w = data.width * TILE_SIZE;
    this.speed = data.speed;
    this.sprite = scene.add.tileSprite(data.x * TILE_SIZE + w / 2, data.y * TILE_SIZE + 4, w, 8, 'conveyor').setDepth(4);
    scene.physics.add.existing(this.sprite, true);
  }

  get body(): Phaser.Physics.Arcade.StaticBody {
    return this.sprite.body as Phaser.Physics.Arcade.StaticBody;
  }

  /** A faixa rola na direção do empurrão. */
  update(delta: number): void {
    this.sprite.tilePositionX -= (this.speed * delta) / 1000;
  }

  /** O jogador está de pé em cima desta esteira? */
  carries(body: Phaser.Physics.Arcade.Body): boolean {
    const b = this.body;
    return Math.abs(body.bottom - b.top) <= 2 && body.right > b.left + 2 && body.left < b.right - 2;
  }
}
