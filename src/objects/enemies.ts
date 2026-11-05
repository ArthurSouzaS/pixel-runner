import Phaser from 'phaser';
import type { EnemyKind } from '../logic/levelParser';
import { sfx } from '../audio/Sfx';
import type { Player } from './Player';

/** O que um inimigo precisa saber do mundo para decidir o que fazer. */
export interface EnemyContext {
  player: Player;
  layer: Phaser.Tilemaps.TilemapLayer;
  /** Multiplicador de dificuldade (cresce a cada fase). */
  difficulty: number;
  fireBullet: (x: number, y: number, vx: number, vy: number) => void;
}

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  abstract readonly kind: EnemyKind;
  dead = false;
  /** Se colide com o cenário (andarilhos e saltadores sim, voadores não). */
  readonly solid: boolean = true;
  /** Blindados resistem a pisões e dash: só a investida os derrota. */
  readonly armored: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5);
  }

  abstract think(ctx: EnemyContext, delta: number): void;

  /** Chamado ao ser derrotado (pisão ou dash). */
  kill(): void {
    if (this.dead) return;
    this.dead = true;
    this.anims.stop();
    this.body.checkCollision.none = true;
    this.body.setAllowGravity(false);
    this.setVelocity(0, 0);
    this.setTintFill(0xffffff);
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.2,
      scaleX: 1.4,
      alpha: 0,
      y: this.y + 4,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
  }
}

/** Gosma: patrulha e vira ao bater numa parede ou chegar na beirada. */
export class Walker extends Enemy {
  readonly kind: EnemyKind = 'walker';
  protected dir: 1 | -1 = -1;
  protected speed = 38;

  constructor(scene: Phaser.Scene, x: number, y: number, texture = 'walker') {
    super(scene, x, y, texture);
    this.body.setSize(14, 9).setOffset(1, 7);
    this.anims.play(`${texture}-move`);
  }

  think(ctx: EnemyContext): void {
    if (this.dead) return;
    const body = this.body;
    if (body.blocked.left) this.dir = 1;
    else if (body.blocked.right) this.dir = -1;
    else if (body.blocked.down) {
      const aheadX = this.dir > 0 ? body.right + 2 : body.left - 2;
      const ground = ctx.layer.getTileAtWorldXY(aheadX, body.bottom + 4);
      if (!ground) this.dir = this.dir > 0 ? -1 : 1;
    }
    body.setVelocityX(this.dir * this.speed * ctx.difficulty);
    this.setFlipX(this.dir > 0);
  }
}

/** Gosma blindada: capacete com espinhos, mais lenta e resistente. */
export class Armored extends Walker {
  override readonly kind: EnemyKind = 'armored';
  override readonly armored = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'armored');
    this.speed = 28;
    this.body.setSize(14, 11).setOffset(1, 5);
  }
}

/** Saltador: espera um pouco e pula na direção do jogador. */
export class Hopper extends Enemy {
  readonly kind = 'hopper';
  private wait = 800 + Math.random() * 600;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'hopper');
    this.body.setSize(10, 10).setOffset(3, 6);
  }

  think(ctx: EnemyContext, delta: number): void {
    if (this.dead) return;
    const body = this.body;
    if (body.blocked.down) {
      body.setVelocityX(0);
      this.setFrame(0);
      this.wait -= delta;
      if (this.wait <= 0) {
        const dx = ctx.player.x - this.x;
        const dir = Math.abs(dx) < 220 ? Math.sign(dx) || 1 : Math.random() < 0.5 ? -1 : 1;
        body.setVelocity(dir * 80 * ctx.difficulty, -290);
        this.setFlipX(dir < 0);
        this.wait = Math.max(500, 1300 - ctx.difficulty * 250) + Math.random() * 400;
      }
    } else {
      this.setFrame(1);
      if (body.blocked.left || body.blocked.right) body.setVelocityX(-body.velocity.x);
    }
  }
}

/** Morcego: voa em forma de "8" ao redor do ponto de origem. */
export class Bat extends Enemy {
  readonly kind = 'bat';
  override readonly solid = false;
  private t = Math.random() * Math.PI * 2;
  private readonly homeX: number;
  private readonly homeY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bat');
    this.homeX = x;
    this.homeY = y;
    this.body.setAllowGravity(false);
    this.body.setSize(12, 8).setOffset(2, 4);
    this.anims.play('bat-fly');
  }

  think(ctx: EnemyContext, delta: number): void {
    if (this.dead) return;
    const dt = Math.max(delta / 1000, 0.001);
    this.t += dt * 1.1 * ctx.difficulty;
    const tx = this.homeX + Math.sin(this.t) * 44;
    const ty = this.homeY + Math.sin(this.t * 2) * 14;
    this.body.setVelocity((tx - this.x) / dt, (ty - this.y) / dt);
    this.setFlipX(Math.cos(this.t) > 0);
  }
}

/** Torreta: vira para o jogador e atira quando ele se aproxima. */
export class Turret extends Enemy {
  readonly kind = 'turret';
  private cooldown = 1200;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'turret');
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(12, 12).setOffset(2, 4);
  }

  think(ctx: EnemyContext, delta: number): void {
    if (this.dead) return;
    const dx = ctx.player.x - this.x;
    const dy = ctx.player.y - this.y;
    const facing = dx < 0 ? -1 : 1;
    this.setFlipX(facing > 0);
    const inRange = Math.abs(dx) < 230 && Math.abs(dy) < 90 && !ctx.player.dead;
    this.cooldown -= delta;
    this.setFrame(inRange && this.cooldown < 300 ? 1 : 0);
    if (inRange && this.cooldown <= 0) {
      this.cooldown = Math.max(1100, 2400 - ctx.difficulty * 500);
      ctx.fireBullet(this.x + facing * 9, this.y - 1, facing * 125 * ctx.difficulty, 0);
      sfx.play('shoot');
    }
  }
}

/** Peixe-espinho: patrulha a água de um lado para o outro, ondulando. */
export class Fish extends Enemy {
  readonly kind = 'fish';
  override readonly solid = false;
  private t = Math.random() * Math.PI * 2;
  private readonly homeX: number;
  private readonly homeY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'fish');
    this.homeX = x;
    this.homeY = y;
    this.body.setAllowGravity(false);
    this.body.setSize(14, 8).setOffset(1, 5);
    this.anims.play('fish-swim');
  }

  think(ctx: EnemyContext, delta: number): void {
    if (this.dead) return;
    const dt = Math.max(delta / 1000, 0.001);
    this.t += dt * 0.8 * ctx.difficulty;
    const tx = this.homeX + Math.sin(this.t) * 56;
    const ty = this.homeY + Math.sin(this.t * 3) * 4;
    this.body.setVelocity((tx - this.x) / dt, (ty - this.y) / dt);
    this.setFlipX(Math.cos(this.t) > 0);
  }
}

/** Drone: flutua e persegue o jogador devagar quando ele chega perto. */
export class Drone extends Enemy {
  readonly kind = 'drone';
  override readonly solid = false;
  private t = Math.random() * Math.PI * 2;
  private readonly homeX: number;
  private readonly homeY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'drone');
    this.homeX = x;
    this.homeY = y;
    this.body.setAllowGravity(false);
    this.body.setSize(10, 10).setOffset(3, 3);
    this.anims.play('drone-fly');
  }

  think(ctx: EnemyContext, delta: number): void {
    if (this.dead) return;
    const dt = Math.max(delta / 1000, 0.001);
    this.t += dt;
    const p = ctx.player;
    const near = !p.dead && Math.abs(p.x - this.x) < 150 && Math.abs(p.y - this.y) < 110;
    const speed = 34 * ctx.difficulty;
    let tx = this.homeX + Math.sin(this.t * 0.8) * 16;
    let ty = this.homeY + Math.sin(this.t * 2) * 6;
    if (near) {
      tx = p.x;
      ty = p.y - 4;
    }
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const v = Math.min(speed, dist * 4);
    this.body.setVelocity((dx / dist) * v, (dy / dist) * v);
    this.setFlipX(dx > 0);
  }
}

export function createEnemy(scene: Phaser.Scene, kind: EnemyKind, x: number, y: number): Enemy {
  switch (kind) {
    case 'walker':
      return new Walker(scene, x, y);
    case 'hopper':
      return new Hopper(scene, x, y);
    case 'bat':
      return new Bat(scene, x, y);
    case 'turret':
      return new Turret(scene, x, y);
    case 'fish':
      return new Fish(scene, x, y);
    case 'armored':
      return new Armored(scene, x, y);
    case 'drone':
      return new Drone(scene, x, y);
  }
}
