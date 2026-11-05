import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  dashPressed: boolean;
}

/** Parâmetros de movimento (px/s e ms). Ajustados para um controle responsivo. */
export const PLAYER_TUNING = {
  runSpeed: 140,
  groundAccel: 1500,
  airAccel: 1000,
  groundDecel: 1800,
  jumpVelocity: 335,
  doubleJumpVelocity: 300,
  jumpCutVelocity: 130,
  maxFall: 430,
  coyoteMs: 90,
  jumpBufferMs: 120,
  dashSpeed: 330,
  dashMs: 150,
  dashCooldownMs: 380,
  invulnerableMs: 1500,
};

/** Pix, o protagonista. Corre, pula, faz pulo duplo e dash. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  facing: 1 | -1 = 1;
  dead = false;
  frozen = false;
  /** Pisões seguidos sem tocar o chão (para o combo). */
  combo = 0;

  private coyoteTimer = 0;
  private jumpBuffer = 0;
  private canDoubleJump = true;
  private canDash = true;
  private dashTimer = 0;
  private dashCooldown = 0;
  private dashDir: 1 | -1 = 1;
  private invulnerableTimer = 0;
  private ghostTimer = 0;
  private wasOnGround = false;
  /** Verdadeiro durante um pulo iniciado pelo jogador (permite altura variável). */
  private jumping = false;

  /** Disparados para a cena criar partículas/efeitos. */
  onLand?: () => void;
  onJump?: (double: boolean) => void;
  onDash?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'pix', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);
    this.body.setSize(8, 14).setOffset(4, 2);
    this.body.setMaxVelocityY(PLAYER_TUNING.maxFall);
    this.body.setCollideWorldBounds(true);
  }

  get isDashing(): boolean {
    return this.dashTimer > 0;
  }

  get isInvulnerable(): boolean {
    return this.invulnerableTimer > 0;
  }

  get onGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  respawn(x: number, y: number): void {
    this.dead = false;
    this.frozen = false;
    this.enableBody(true, x, y, true, true);
    this.body.setAllowGravity(true);
    this.setVelocity(0, 0);
    this.setAngle(0);
    this.setAlpha(1);
    this.dashTimer = 0;
    this.combo = 0;
    this.invulnerableTimer = PLAYER_TUNING.invulnerableMs;
  }

  /** Quique ao pisar num inimigo. */
  bounce(strong = false, jumpHeld = false): void {
    this.setVelocityY(-(strong ? 380 : jumpHeld ? 330 : 250));
    this.jumping = false;
    this.canDoubleJump = true;
    this.canDash = true;
    this.dashTimer = 0;
    this.body.setAllowGravity(true);
  }

  /** Animação de morte: o corpo sai da física, sobe e cai para fora da tela. */
  die(): void {
    if (this.dead) return;
    this.dead = true;
    this.dashTimer = 0;
    this.body.setAllowGravity(true);
    this.setFrame(9);
    this.anims.stop();
    this.body.checkCollision.none = true;
    this.body.setCollideWorldBounds(false);
    this.setVelocity(0, -320);
    this.setTint(0xffffff);
  }

  revive(): void {
    this.body.checkCollision.none = false;
    this.body.setCollideWorldBounds(true);
    this.clearTint();
  }

  update(input: PlayerInput, delta: number): void {
    if (this.dead) return;
    const T = PLAYER_TUNING;
    const dt = delta / 1000;
    const body = this.body;

    if (this.frozen) {
      body.setVelocityX(body.velocity.x * 0.85);
      this.updateAnimation();
      return;
    }

    const onGround = this.onGround;
    if (onGround) {
      this.coyoteTimer = T.coyoteMs;
      this.canDoubleJump = true;
      this.canDash = true;
      this.combo = 0;
      if (!this.wasOnGround && body.velocity.y >= 0) this.onLand?.();
    } else {
      this.coyoteTimer -= delta;
    }
    this.wasOnGround = onGround;

    this.jumpBuffer = input.jumpPressed ? T.jumpBufferMs : this.jumpBuffer - delta;
    this.dashCooldown -= delta;
    this.invulnerableTimer -= delta;

    // Piscar enquanto invulnerável.
    this.setAlpha(this.isInvulnerable ? (Math.floor(this.invulnerableTimer / 80) % 2 ? 0.35 : 1) : 1);

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) this.facing = dir as 1 | -1;

    // Dash ---------------------------------------------------------------
    if (input.dashPressed && this.canDash && this.dashCooldown <= 0 && !this.isDashing) {
      this.dashDir = dir !== 0 ? (dir as 1 | -1) : this.facing;
      this.dashTimer = T.dashMs;
      this.dashCooldown = T.dashCooldownMs;
      if (!onGround) this.canDash = false;
      body.setAllowGravity(false);
      sfx.play('dash');
      this.onDash?.();
    }

    if (this.isDashing) {
      this.dashTimer -= delta;
      body.setVelocity(this.dashDir * T.dashSpeed, 0);
      this.ghostTimer -= delta;
      if (this.ghostTimer <= 0) {
        this.ghostTimer = 28;
        this.spawnGhost();
      }
      if (this.dashTimer <= 0) {
        body.setAllowGravity(true);
        body.setVelocityX(this.dashDir * T.runSpeed);
      }
      this.updateAnimation();
      return;
    }

    // Corrida horizontal com aceleração ------------------------------------
    const target = dir * T.runSpeed;
    const vx = body.velocity.x;
    const accel = dir !== 0 ? (onGround ? T.groundAccel : T.airAccel) : onGround ? T.groundDecel : T.airAccel * 0.4;
    let next = vx;
    if (vx < target) next = Math.min(target, vx + accel * dt);
    else if (vx > target) next = Math.max(target, vx - accel * dt);
    body.setVelocityX(next);

    // Pulo, pulo duplo e altura variável ----------------------------------
    if (this.jumpBuffer > 0) {
      if (this.coyoteTimer > 0) {
        body.setVelocityY(-T.jumpVelocity);
        this.jumping = true;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        sfx.play('jump');
        this.onJump?.(false);
      } else if (this.canDoubleJump && input.jumpPressed) {
        body.setVelocityY(-T.doubleJumpVelocity);
        this.jumping = true;
        this.canDoubleJump = false;
        this.jumpBuffer = 0;
        sfx.play('doubleJump');
        this.onJump?.(true);
        this.scene.tweens.add({ targets: this, angle: this.facing * 360, duration: 280, onComplete: () => this.setAngle(0) });
      }
    }
    if (body.velocity.y >= 0) this.jumping = false;
    if (this.jumping && !input.jumpHeld && body.velocity.y < -T.jumpCutVelocity) {
      body.setVelocityY(-T.jumpCutVelocity);
      this.jumping = false;
    }

    this.updateAnimation();
  }

  private spawnGhost(): void {
    const ghost = this.scene.add
      .image(this.x, this.y, 'pix', 8)
      .setFlipX(this.flipX)
      .setTint(0x73eff7)
      .setAlpha(0.6)
      .setDepth(9)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
  }

  private updateAnimation(): void {
    this.setFlipX(this.facing < 0);
    if (this.isDashing) {
      this.anims.stop();
      this.setFrame(8);
      return;
    }
    if (!this.onGround) {
      this.anims.stop();
      this.setFrame(this.body.velocity.y < 0 ? 6 : 7);
      return;
    }
    if (Math.abs(this.body.velocity.x) > 20) this.anims.play('pix-run', true);
    else this.anims.play('pix-idle', true);
  }
}
