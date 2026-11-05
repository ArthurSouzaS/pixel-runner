import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { t } from '../i18n';
import type { BossHooks, BossLike } from './Boss';
import type { Player } from './Player';

export const ECLIPSE_MAX_HP = 16;

export interface EclipseHooks extends BossHooks {
  /** Varredura de laser horizontal na altura `y`: avisa por `warnMs` e fica ligada por `onMs`. */
  beam: (y: number, warnMs: number, onMs: number) => void;
  /** Inverte (ou restaura) a gravidade de todos os jogadores. */
  setGravity: (dir: 1 | -1) => void;
  gravity: () => 1 | -1;
}

type EclipseMode = 'sleep' | 'intro' | 'hover' | 'descend' | 'rest' | 'rise' | 'roar' | 'vanish' | 'dying';

/**
 * Eclipse — chefe final (fase 15). 16 de vida e 4 fases de ataque:
 *  1. Bombardeio: rajadas estelares miradas no jogador.
 *  2. Varredura: lasers que cruzam a arena na altura do jogador.
 *  3. Gravidade: inverte a gravidade da arena periodicamente.
 *  4. Fúria: teleportes, explosões radiais e descansos curtos.
 * Recebe dano por pisão (do lado da gravidade do jogador) ou investida.
 */
export class EclipseBoss extends Phaser.Physics.Arcade.Sprite implements BossLike {
  declare body: Phaser.Physics.Arcade.Body;
  readonly maxHp = ECLIPSE_MAX_HP;
  hp = ECLIPSE_MAX_HP;

  private mode: EclipseMode = 'sleep';
  private timer = 0;
  private attackTimer = 0;
  private attacks = 0;
  private flipTimer = 0;
  private invulnerable = 0;
  private t = 0;
  private phaseShown = 1;
  private readonly home: Phaser.Math.Vector2;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly arena: { minX: number; maxX: number; groundY: number; ceilY: number },
    private readonly hooks: EclipseHooks,
  ) {
    super(scene, x, y, 'eclipse', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.home = new Phaser.Math.Vector2(x, y);
    this.setDepth(6);
    this.body.setAllowGravity(false);
    this.body.setSize(24, 22).setOffset(4, 4);
  }

  get displayName(): string {
    return t('boss.eclipse');
  }

  /** Fase de ataque (1 a 4), conforme a vida. */
  get phase(): 1 | 2 | 3 | 4 {
    if (this.hp > 12) return 1;
    if (this.hp > 8) return 2;
    if (this.hp > 4) return 3;
    return 4;
  }

  get isVulnerable(): boolean {
    return this.invulnerable <= 0 && !['sleep', 'intro', 'dying', 'roar', 'vanish'].includes(this.mode);
  }

  get isActive(): boolean {
    return this.mode !== 'sleep' && this.mode !== 'dying';
  }

  private get hoverY(): number {
    return (this.arena.groundY + this.arena.ceilY) / 2 - 20;
  }

  wake(): void {
    if (this.mode !== 'sleep') return;
    this.mode = 'intro';
    this.timer = 1500;
    sfx.play('thunder');
    this.hooks.shake(600, 0.01);
    this.hooks.onHealthChange(this.hp, this.maxHp);
  }

  reset(): void {
    this.hp = this.maxHp;
    this.mode = 'sleep';
    this.attacks = 0;
    this.phaseShown = 1;
    this.invulnerable = 0;
    this.setFrame(0).setAlpha(1).setVisible(true);
    this.body.reset(this.home.x, this.home.y);
    this.hooks.setGravity(1);
    this.hooks.onHealthChange(this.hp, this.maxHp);
  }

  hit(): boolean {
    if (!this.isVulnerable) return false;
    this.hp -= 1;
    this.invulnerable = 750;
    this.hooks.onHealthChange(this.hp, this.maxHp);
    this.hooks.shake(180, 0.01);
    sfx.play('bossHit');
    this.setFrame(2);
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    if (this.phase !== this.phaseShown) {
      this.phaseShown = this.phase;
      this.mode = 'roar';
      this.timer = 1200;
      this.invulnerable = 1600;
      sfx.play('thunder');
      this.hooks.shake(700, 0.016);
      // A fase da gravidade começa invertendo; a fúria final restaura o normal.
      if (this.phase === 3) this.flipTimer = 600;
      if (this.phase === 4) this.hooks.setGravity(1);
    } else if (this.mode === 'rest') {
      this.mode = 'rise';
    }
    return true;
  }

  private die(): void {
    this.mode = 'dying';
    this.setVelocity(0, 0);
    this.body.checkCollision.none = true;
    this.hooks.setGravity(1);
    this.scene.time.addEvent({
      delay: 110,
      repeat: 16,
      callback: () => {
        this.hooks.dust(this.x + Phaser.Math.Between(-18, 18), this.y + Phaser.Math.Between(-18, 18), 12);
        this.hooks.shake(100, 0.01);
        this.setFrame(Math.random() < 0.5 ? 1 : 2);
      },
    });
    this.scene.time.delayedCall(2000, () => {
      sfx.play('explosion');
      sfx.play('thunder');
      this.hooks.shake(900, 0.025);
      this.hooks.dust(this.x, this.y, 60);
      this.hooks.onDefeated(this.x, this.y);
      this.destroy();
    });
  }

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

  private bolt(vx: number, vy: number): void {
    this.hooks.fireBullet(this.x, this.y, vx, vy, 'starbolt');
  }

  private aimedVolley(player: Player, spread: number[], speed: number): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    for (const s of spread) this.bolt(Math.cos(angle + s) * speed, Math.sin(angle + s) * speed);
    sfx.play('shoot');
  }

  private radial(n: number, speed: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.t;
      this.bolt(Math.cos(a) * speed, Math.sin(a) * speed);
    }
    sfx.play('shoot');
  }

  think(player: Player, delta: number): void {
    if (this.mode === 'sleep' || this.mode === 'dying') return;
    const dt = delta / 1000;
    this.t += dt;
    this.timer -= delta;
    this.invulnerable -= delta;
    this.setAlpha(this.mode === 'vanish' ? 0.15 : this.invulnerable > 0 ? (Math.floor(this.invulnerable / 70) % 2 ? 0.5 : 1) : 1);
    if (this.invulnerable <= 0 && String(this.frame.name) === '2') this.setFrame(this.phase >= 3 ? 1 : 0);

    const { minX, maxX, groundY, ceilY } = this.arena;
    const phase = this.phase;

    // Fase 3: a gravidade da arena vira de tempos em tempos.
    if (phase === 3 && this.isActive && this.mode !== 'roar') {
      this.flipTimer -= delta;
      if (this.flipTimer <= 0) {
        this.flipTimer = 4200;
        this.hooks.setGravity(this.hooks.gravity() === 1 ? -1 : 1);
        this.hooks.shake(300, 0.012);
        sfx.play('gate');
      }
    }

    switch (this.mode) {
      case 'intro':
        this.seek(this.home.x, this.hoverY, 90);
        if (this.timer <= 0) this.toHover();
        break;

      case 'roar':
        this.seek((minX + maxX) / 2, this.hoverY, 160);
        this.setFrame(Math.floor(this.timer / 90) % 2 ? 1 : 2);
        if (this.timer <= 0) this.toHover();
        break;

      case 'hover': {
        const cx = (minX + maxX) / 2;
        const range = (maxX - minX) / 2 - 30;
        this.seek(cx + Math.sin(this.t * (0.7 + phase * 0.1)) * range, this.hoverY + Math.sin(this.t * 2.4) * 18, 150 + phase * 25);
        this.attackTimer -= delta;
        if (this.attackTimer <= 0) {
          this.attacks++;
          this.attackTimer = 1500 - phase * 180;
          if (phase === 1) this.aimedVolley(player, [-0.2, 0, 0.2], 150);
          else if (phase === 2) {
            if (this.attacks % 2 === 0) this.hooks.beam(player.y, 700, 650);
            else this.aimedVolley(player, [-0.15, 0.15], 170);
          } else if (phase === 3) this.radial(8, 110);
          else {
            this.radial(12, 130);
            if (this.attacks % 2 === 0) this.aimedVolley(player, [-0.25, 0, 0.25], 190);
          }
          const restEvery = phase === 4 ? 4 : 3;
          if (this.attacks % restEvery === 0) {
            if (phase === 4) {
              this.mode = 'vanish';
              this.timer = 700;
              sfx.play('dash');
            } else {
              this.mode = 'descend';
              this.timer = 2200;
            }
          }
        }
        break;
      }

      case 'vanish':
        // Some e reaparece perto do jogador, já descendo para descansar.
        this.body.setVelocity(0, 0);
        if (this.timer <= 0) {
          const x = Phaser.Math.Clamp(player.x + (Math.random() < 0.5 ? -70 : 70), minX + 24, maxX - 24);
          this.setPosition(x, this.hoverY);
          this.mode = 'descend';
          this.timer = 1600;
          this.hooks.dust(this.x, this.y, 16);
        }
        break;

      case 'descend': {
        // Desce até o "chão" do lado da gravidade do jogador, onde pode ser pisado.
        const restY = this.hooks.gravity() === 1 ? groundY - 18 : ceilY + 18;
        const dist = this.seek(Phaser.Math.Clamp(player.x, minX + 24, maxX - 24), restY, 140 + phase * 35);
        if (dist < 8 || this.timer <= 0) {
          this.mode = 'rest';
          this.timer = 1600 - phase * 180;
          this.body.setVelocity(0, 0);
          this.hooks.shake(200, 0.01);
          sfx.play('bossLand');
          this.hooks.dust(this.x, restY, 12);
        }
        break;
      }

      case 'rest':
        this.body.setVelocity(0, 0);
        this.setFrame(0);
        if (this.timer <= 0) this.mode = 'rise';
        break;

      case 'rise':
        if (this.seek(this.x, this.hoverY, 170) < 6) this.toHover();
        break;
    }
    this.x = Phaser.Math.Clamp(this.x, minX + 16, maxX - 16);
  }

  private toHover(): void {
    this.mode = 'hover';
    this.attackTimer = 800;
    this.setFrame(this.phase >= 3 ? 1 : 0);
  }
}
