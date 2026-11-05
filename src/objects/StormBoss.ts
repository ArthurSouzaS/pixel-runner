import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { tOr } from '../i18n';
import type { BossHooks, BossLike } from './Boss';
import type { Player } from './Player';

export const STORM_MAX_HP = 12;

type StormState = 'sleep' | 'intro' | 'hover' | 'swoop' | 'aim' | 'dive' | 'rest' | 'rise' | 'roar' | 'dying';

/**
 * Tempestade Rubra — chefe do Mundo 2. Flutua pela arena e tem 3 fases de ataque:
 *  1. Chuva de fragmentos de gelo e rasantes baixos.
 *  2. Explosões radiais de fragmentos e rasantes mais rápidos.
 *  3. Mergulhos certeiros sobre o jogador com ondas de choque.
 * Fica vulnerável a pisões principalmente quando desce até o chão.
 */
export class StormBoss extends Phaser.Physics.Arcade.Sprite implements BossLike {
  declare body: Phaser.Physics.Arcade.Body;
  readonly maxHp = STORM_MAX_HP;
  get displayName(): string {
    return tOr('boss.storm', 'TEMPESTADE RUBRA');
  }
  hp = STORM_MAX_HP;

  private mode: StormState = 'sleep';
  private timer = 0;
  private attackTimer = 0;
  private attacks = 0;
  private invulnerable = 0;
  private t = 0;
  private phaseShown = 1;
  private readonly home: Phaser.Math.Vector2;
  private readonly hoverY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly arena: { minX: number; maxX: number; groundY: number },
    private readonly hooks: BossHooks,
  ) {
    super(scene, x, y, 'storm', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.home = new Phaser.Math.Vector2(x, y);
    this.hoverY = 72;
    this.setDepth(6);
    this.body.setAllowGravity(false);
    this.body.setSize(24, 22).setOffset(4, 4);
  }

  /** Fase de ataque atual (1 a 3), conforme a vida restante. */
  get phase(): 1 | 2 | 3 {
    if (this.hp > 8) return 1;
    if (this.hp > 4) return 2;
    return 3;
  }

  get isVulnerable(): boolean {
    return this.invulnerable <= 0 && !['sleep', 'intro', 'dying', 'roar'].includes(this.mode);
  }

  get isActive(): boolean {
    return this.mode !== 'sleep' && this.mode !== 'dying';
  }

  wake(): void {
    if (this.mode !== 'sleep') return;
    this.mode = 'intro';
    this.timer = 1300;
    sfx.play('thunder');
    this.hooks.shake(500, 0.008);
    this.hooks.onHealthChange(this.hp, this.maxHp);
  }

  reset(): void {
    this.hp = this.maxHp;
    this.mode = 'sleep';
    this.attacks = 0;
    this.phaseShown = 1;
    this.invulnerable = 0;
    this.setFrame(0).setAlpha(1).clearTint();
    this.body.reset(this.home.x, this.home.y);
    this.hooks.onHealthChange(this.hp, this.maxHp);
  }

  hit(): boolean {
    if (!this.isVulnerable) return false;
    this.hp -= 1;
    this.invulnerable = 800;
    this.hooks.onHealthChange(this.hp, this.maxHp);
    this.hooks.shake(180, 0.01);
    sfx.play('bossHit');
    this.setFrame(2);
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    if (this.phase !== this.phaseShown) {
      // Mudou de fase: ruge e sobe de novo.
      this.phaseShown = this.phase;
      this.mode = 'roar';
      this.timer = 1000;
      this.invulnerable = 1400;
      sfx.play('thunder');
      this.hooks.shake(600, 0.014);
    } else if (this.mode === 'rest') {
      this.mode = 'rise';
    }
    return true;
  }

  private die(): void {
    this.mode = 'dying';
    this.setVelocity(0, 0);
    this.body.checkCollision.none = true;
    this.scene.time.addEvent({
      delay: 120,
      repeat: 12,
      callback: () => {
        this.hooks.dust(this.x + Phaser.Math.Between(-16, 16), this.y + Phaser.Math.Between(-16, 16), 10);
        this.hooks.shake(100, 0.008);
        this.setFrame(Math.random() < 0.5 ? 1 : 2);
      },
    });
    this.scene.time.delayedCall(1700, () => {
      sfx.play('explosion');
      sfx.play('thunder');
      this.hooks.shake(700, 0.02);
      this.hooks.dust(this.x, this.y, 50);
      this.hooks.onDefeated(this.x, this.y);
      this.destroy();
    });
  }

  /** Move suavemente em direção a um ponto (por velocidade). */
  private seek(tx: number, ty: number, speed: number): number {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) {
      this.body.setVelocity(0, 0);
      return 0;
    }
    const v = Math.min(speed, dist * 6);
    this.body.setVelocity((dx / dist) * v, (dy / dist) * v);
    return dist;
  }

  private shard(x: number, y: number, vx: number, vy: number): void {
    this.hooks.fireBullet(x, y, vx, vy, 'shard');
  }

  think(player: Player, delta: number): void {
    if (this.mode === 'sleep' || this.mode === 'dying') return;
    const dt = delta / 1000;
    this.t += dt;
    this.timer -= delta;
    this.invulnerable -= delta;
    this.setAlpha(this.invulnerable > 0 ? (Math.floor(this.invulnerable / 70) % 2 ? 0.5 : 1) : 1);
    if (this.invulnerable <= 0 && String(this.frame.name) === '2') this.setFrame(this.phase === 3 ? 1 : 0);

    const { minX, maxX, groundY } = this.arena;
    const phase = this.phase;
    const restY = groundY - 16;

    switch (this.mode) {
      case 'intro':
        this.seek(this.home.x, this.hoverY, 80);
        if (this.timer <= 0) this.toHover();
        break;

      case 'roar':
        this.seek((minX + maxX) / 2, this.hoverY, 160);
        this.setFrame(Math.floor(this.timer / 100) % 2 ? 1 : 2);
        if (this.timer <= 0) this.toHover();
        break;

      case 'hover': {
        const cx = (minX + maxX) / 2;
        const range = (maxX - minX) / 2 - 24;
        const tx = cx + Math.sin(this.t * (0.6 + phase * 0.15)) * range;
        const ty = this.hoverY + Math.sin(this.t * 2.2) * 10;
        this.seek(tx, ty, 140 + phase * 30);
        this.attackTimer -= delta;
        if (this.attackTimer <= 0) {
          this.attacks++;
          this.attackTimer = 1500 - phase * 250;
          if (phase === 1) {
            for (const off of [-48, 0, 48]) this.shard(this.x + off, this.y + 12, 0, 150);
            sfx.play('shoot');
          } else {
            const n = phase === 2 ? 8 : 10;
            for (let i = 0; i < n; i++) {
              const a = (i / n) * Math.PI * 2 + this.t;
              this.shard(this.x, this.y, Math.cos(a) * 120, Math.sin(a) * 120);
            }
            sfx.play('shoot');
          }
          if (this.attacks % 3 === 0) {
            if (phase === 3) {
              this.mode = 'aim';
              this.timer = 600;
            } else {
              this.mode = 'swoop';
              this.timer = 2600;
            }
          }
        }
        break;
      }

      case 'swoop': {
        // Desce e varre a arena rente ao chão, depois descansa.
        const dist = this.seek(player.x, restY, 120 + phase * 50);
        if (dist < 10 || this.timer <= 0) this.toRest();
        break;
      }

      case 'aim':
        this.seek(player.x, this.hoverY - 10, 260);
        this.setFrame(Math.floor(this.timer / 80) % 2 ? 1 : 2);
        if (this.timer <= 0) {
          this.mode = 'dive';
          this.body.setVelocity(0, 520);
          sfx.play('dash');
        }
        break;

      case 'dive':
        this.body.setVelocityX(0);
        if (this.y >= restY) {
          this.y = restY;
          this.hooks.shake(350, 0.016);
          this.hooks.dust(this.x, groundY, 18);
          sfx.play('bossLand');
          this.shard(this.x - 18, groundY - 6, -170, 0);
          this.shard(this.x + 18, groundY - 6, 170, 0);
          this.toRest();
        }
        break;

      case 'rest':
        this.body.setVelocity(0, 0);
        this.setFrame(0);
        if (this.timer <= 0) this.mode = 'rise';
        break;

      case 'rise':
        if (this.seek(this.x, this.hoverY, 160) < 6) this.toHover();
        break;
    }
    this.x = Phaser.Math.Clamp(this.x, minX + 16, maxX - 16);
  }

  private toHover(): void {
    this.mode = 'hover';
    this.attackTimer = 900;
    this.setFrame(this.phase === 3 ? 1 : 0);
  }

  private toRest(): void {
    this.mode = 'rest';
    this.timer = 1500 - this.phase * 150;
    this.body.setVelocity(0, 0);
  }
}
