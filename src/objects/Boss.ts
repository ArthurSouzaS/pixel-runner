import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { tOr } from '../i18n';
import type { Player } from './Player';

export const BOSS_MAX_HP = 8;

type BossState = 'sleep' | 'intro' | 'walk' | 'windup' | 'leap' | 'shoot' | 'charge' | 'stunned' | 'dying';

export interface BossHooks {
  fireBullet: (x: number, y: number, vx: number, vy: number, texture?: string) => void;
  shake: (duration: number, intensity: number) => void;
  dust: (x: number, y: number, amount: number) => void;
  onHealthChange: (hp: number, max: number) => void;
  onDefeated: (x: number, y: number) => void;
}

/** O que a cena da fase precisa de qualquer chefe. */
export interface BossLike extends Phaser.Physics.Arcade.Sprite {
  body: Phaser.Physics.Arcade.Body;
  hp: number;
  readonly maxHp: number;
  readonly displayName: string;
  readonly isVulnerable: boolean;
  readonly isActive: boolean;
  wake(): void;
  reset(): void;
  hit(): boolean;
  think(player: Player, delta: number): void;
}

/**
 * Núcleo Ancestral — chefe da fase 5.
 * Alterna entre andar, saltar (onda de choque ao pousar), rajada de tiros
 * e, na segunda metade da vida, investidas rápidas de um lado ao outro.
 * Só recebe dano ao ser pisado.
 */
export class Boss extends Phaser.Physics.Arcade.Sprite implements BossLike {
  declare body: Phaser.Physics.Arcade.Body;

  readonly maxHp = BOSS_MAX_HP;
  get displayName(): string {
    return tOr('boss.core', 'NÚCLEO ANCESTRAL');
  }
  hp = BOSS_MAX_HP;
  state: BossState = 'sleep';
  private timer = 0;
  private attackCount = 0;
  private invulnerable = 0;
  private dir: 1 | -1 = -1;
  private readonly home: Phaser.Math.Vector2;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly hooks: BossHooks,
  ) {
    super(scene, x, y, 'boss', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.home = new Phaser.Math.Vector2(x, y);
    this.setDepth(6);
    this.body.setSize(26, 26).setOffset(3, 6);
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocityY(600);
  }

  get enraged(): boolean {
    return this.hp <= BOSS_MAX_HP / 2;
  }

  get isVulnerable(): boolean {
    return this.invulnerable <= 0 && this.state !== 'dying' && this.state !== 'sleep' && this.state !== 'intro';
  }

  get isActive(): boolean {
    return this.state !== 'sleep' && this.state !== 'dying';
  }

  /** Volta ao estado inicial (quando o jogador morre na arena). */
  reset(): void {
    this.hp = BOSS_MAX_HP;
    this.state = 'sleep';
    this.attackCount = 0;
    this.invulnerable = 0;
    this.clearTint();
    this.setFrame(0);
    this.setAlpha(1);
    this.body.reset(this.home.x, this.home.y);
    this.body.setAllowGravity(true);
    this.hooks.onHealthChange(this.hp, BOSS_MAX_HP);
  }

  wake(): void {
    if (this.state !== 'sleep') return;
    this.state = 'intro';
    this.timer = 1200;
    this.setFrame(1);
    this.hooks.shake(400, 0.006);
    this.hooks.onHealthChange(this.hp, BOSS_MAX_HP);
  }

  /** Recebe um pisão. Retorna true se o golpe contou. */
  hit(): boolean {
    if (!this.isVulnerable) return false;
    this.hp -= 1;
    this.invulnerable = 900;
    this.hooks.onHealthChange(this.hp, BOSS_MAX_HP);
    this.hooks.shake(180, 0.01);
    sfx.play('bossHit');
    this.setFrame(2);
    if (this.hp <= 0) {
      this.die();
    } else {
      this.state = 'stunned';
      this.timer = 450;
      this.setVelocityX(0);
    }
    return true;
  }

  private die(): void {
    this.state = 'dying';
    this.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    this.body.checkCollision.none = true;
    let blasts = 0;
    this.scene.time.addEvent({
      delay: 140,
      repeat: 10,
      callback: () => {
        blasts++;
        this.hooks.dust(this.x + Phaser.Math.Between(-14, 14), this.y + Phaser.Math.Between(-14, 14), 10);
        this.hooks.shake(120, 0.008);
        this.setFrame(blasts % 2 ? 2 : 1);
        sfx.play('stomp');
      },
    });
    this.scene.time.delayedCall(1600, () => {
      sfx.play('explosion');
      this.hooks.shake(600, 0.02);
      this.hooks.dust(this.x, this.y, 40);
      this.hooks.onDefeated(this.x, this.y);
      this.destroy();
    });
  }

  think(player: Player, delta: number): void {
    if (this.state === 'sleep' || this.state === 'dying') return;
    const body = this.body;
    const onGround = body.blocked.down;
    this.timer -= delta;
    this.invulnerable -= delta;

    if (this.invulnerable > 0) this.setAlpha(Math.floor(this.invulnerable / 70) % 2 ? 0.5 : 1);
    else this.setAlpha(1);

    const toPlayer = player.x < this.x ? -1 : 1;
    const speedBoost = this.enraged ? 1.5 : 1;

    switch (this.state) {
      case 'intro':
        body.setVelocityX(0);
        if (this.timer <= 0) this.toWalk();
        break;

      case 'walk':
        this.setFrame(this.enraged ? 1 : 0);
        this.dir = toPlayer;
        body.setVelocityX(this.dir * 55 * speedBoost);
        if (this.timer <= 0 && onGround) this.chooseAttack();
        break;

      case 'windup':
        body.setVelocityX(0);
        this.setFrame(Math.floor(this.timer / 80) % 2 ? 1 : 0);
        if (this.timer <= 0) {
          this.state = 'charge';
          this.timer = 1600;
          this.dir = toPlayer;
          sfx.play('dash');
        }
        break;

      case 'charge':
        body.setVelocityX(this.dir * 270);
        if (Math.random() < 0.4) this.hooks.dust(this.x - this.dir * 12, this.y + 14, 1);
        if (body.blocked.left || body.blocked.right || this.timer <= 0) {
          this.hooks.shake(250, 0.012);
          sfx.play('bossLand');
          this.hooks.dust(this.x + this.dir * 14, this.y, 12);
          this.state = 'stunned';
          this.timer = 900;
          body.setVelocityX(0);
        }
        break;

      case 'leap':
        if (onGround && this.timer <= 0) {
          body.setVelocityX(0);
          this.hooks.shake(300, 0.015);
          this.hooks.dust(this.x, this.y + 14, 16);
          sfx.play('bossLand');
          // Onda de choque: dois projéteis rasteiros.
          this.hooks.fireBullet(this.x - 16, this.y + 10, -150 * speedBoost, 0);
          this.hooks.fireBullet(this.x + 16, this.y + 10, 150 * speedBoost, 0);
          this.toWalk();
        }
        break;

      case 'shoot':
        body.setVelocityX(0);
        if (this.timer <= 0) {
          const angle = Phaser.Math.Angle.Between(this.x, this.y - 6, player.x, player.y);
          const spread = this.enraged ? [-0.35, -0.17, 0, 0.17, 0.35] : [-0.25, 0, 0.25];
          for (const s of spread) {
            this.hooks.fireBullet(this.x, this.y - 6, Math.cos(angle + s) * 150, Math.sin(angle + s) * 150);
          }
          sfx.play('shoot');
          this.toWalk();
        }
        break;

      case 'stunned':
        body.setVelocityX(0);
        if (this.timer <= 0) this.toWalk();
        break;
    }
  }

  private toWalk(): void {
    this.state = 'walk';
    this.timer = (this.enraged ? 900 : 1500) + Math.random() * 500;
  }

  private chooseAttack(): void {
    this.attackCount++;
    const options: BossState[] = this.enraged ? ['leap', 'shoot', 'windup', 'leap'] : ['leap', 'shoot'];
    const next = options[this.attackCount % options.length];
    const body = this.body;
    if (next === 'leap') {
      this.state = 'leap';
      this.timer = 200;
      body.setVelocity(this.dir * 120, this.enraged ? -460 : -400);
    } else if (next === 'shoot') {
      this.state = 'shoot';
      this.timer = 500;
      this.setFrame(1);
    } else {
      this.state = 'windup';
      this.timer = 600;
    }
  }
}
