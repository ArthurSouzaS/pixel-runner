import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { CHARGE_TIME_MS, type AbilityId } from '../logic/abilities';

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  dashPressed: boolean;
  /** Botão da investida segurado. */
  chargeHeld: boolean;
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
  // Gelo
  iceAccel: 380,
  iceDecel: 140,
  // Água
  swimVelocity: 175,
  waterGravityScale: 0.32,
  waterMaxFall: 85,
  waterSpeedScale: 0.62,
  // Habilidades
  climbSpeed: 85,
  wallJumpX: 230,
  wallJumpY: 310,
  wallJumpLockMs: 170,
  glideFall: 55,
  rushSpeed: 420,
  rushMs: 320,
};

/** Condições do ambiente onde o jogador está, atualizadas pela cena a cada frame. */
export interface PlayerEnvironment {
  onIce: boolean;
  inWater: boolean;
  /** Deslocamento horizontal do vento (px/s). */
  windX: number;
  /** Aceleração vertical do vento (px/s², negativa = para cima). */
  windY: number;
}

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

  env: PlayerEnvironment = { onIce: false, inWater: false, windX: 0, windY: 0 };
  /** Habilidades desbloqueadas. */
  abilities = new Set<AbilityId>();
  /** Diz se há uma parede sólida (tile) no ponto, para escalar só paredes de verdade. */
  isWallAt?: (x: number, y: number) => boolean;
  /** -1/1 quando agarrado numa parede à esquerda/direita. */
  onWall: -1 | 0 | 1 = 0;
  gliding = false;
  private wallJumpLock = 0;
  private chargeMs = 0;
  private rushTimer = 0;
  private rushDir: 1 | -1 = 1;
  private wasInWater = false;
  /** 1 = gravidade normal, -1 = invertida (anda no teto). */
  gravityDir: 1 | -1 = 1;

  /** Disparados para a cena criar partículas/efeitos. */
  onLand?: () => void;
  onJump?: (double: boolean) => void;
  onDash?: () => void;
  onRush?: () => void;

  /** Índice do jogador (0 = P1, 1 = P2). */
  readonly index: number;

  constructor(scene: Phaser.Scene, x: number, y: number, texture = 'pix', index = 0) {
    super(scene, x, y, texture, 0);
    this.index = index;
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

  /** Em investida: derrota qualquer inimigo e quebra blocos rachados. */
  get isRushing(): boolean {
    return this.rushTimer > 0;
  }

  get facingRush(): 1 | -1 {
    return this.rushDir;
  }

  get isCharging(): boolean {
    return this.chargeMs > 0;
  }

  get isInvulnerable(): boolean {
    return this.invulnerableTimer > 0;
  }

  get onGround(): boolean {
    return this.gravityDir > 0 ? this.body.blocked.down || this.body.touching.down : this.body.blocked.up || this.body.touching.up;
  }

  /** Inverte (ou restaura) a gravidade do jogador. */
  setGravityDir(dir: 1 | -1): void {
    if (this.gravityDir === dir) return;
    this.gravityDir = dir;
    this.setFlipY(dir < 0);
    // A arte ocupa o quadro inteiro: o corpo acompanha o lado dos pés.
    this.body.setOffset(4, dir > 0 ? 2 : 0);
    this.body.setVelocityY(this.body.velocity.y * 0.3);
  }

  /** Velocidade vertical no sentido "para baixo" da gravidade atual. */
  get fallSpeed(): number {
    return this.body.velocity.y * this.gravityDir;
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
    this.rushTimer = 0;
    this.chargeMs = 0;
    this.combo = 0;
    this.setGravityDir(1);
    this.invulnerableTimer = PLAYER_TUNING.invulnerableMs;
  }

  /** Quique ao pisar num inimigo. */
  bounce(strong = false, jumpHeld = false): void {
    this.setVelocityY(-this.gravityDir * (strong ? 380 : jumpHeld ? 330 : 250));
    this.jumping = false;
    this.canDoubleJump = true;
    this.canDash = true;
    this.dashTimer = 0;
    this.body.setAllowGravity(true);
  }

  /** Congela o jogador por um tempo (usado na corrida ao ser puxado pela câmera). */
  stun(ms: number): void {
    this.frozen = true;
    this.scene.time.delayedCall(ms, () => {
      if (!this.dead) this.frozen = false;
    });
  }

  /** Lançamento vertical (mola). */
  launch(velocity: number): void {
    this.setVelocityY(-this.gravityDir * velocity);
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
    this.rushTimer = 0;
    this.chargeMs = 0;
    this.onWall = 0;
    this.gliding = false;
    this.body.setAllowGravity(true);
    this.setFrame(9);
    this.anims.stop();
    this.body.checkCollision.none = true;
    this.body.setCollideWorldBounds(false);
    this.setVelocity(0, -320 * this.gravityDir);
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

    const g = this.gravityDir;
    const onGround = this.onGround;
    if (onGround) {
      this.coyoteTimer = T.coyoteMs;
      this.canDoubleJump = true;
      this.canDash = true;
      this.combo = 0;
      if (!this.wasOnGround && body.velocity.y * g >= 0) this.onLand?.();
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

    // Água: gravidade reduzida, queda lenta e braçadas ilimitadas.
    const env = this.env;
    if (env.inWater !== this.wasInWater) {
      this.wasInWater = env.inWater;
      if (env.inWater) body.setVelocityY(body.velocity.y * 0.35);
    }
    const gravity = this.scene.physics.world.gravity.y;
    // Gravidade invertida: soma -2g à gravidade do mundo para o resultado ser -g.
    body.setGravityY(env.inWater ? -gravity * (1 - T.waterGravityScale) : g < 0 ? -2 * gravity : 0);
    body.setMaxVelocityY(env.inWater ? T.waterMaxFall : T.maxFall);
    if (env.inWater) {
      this.canDoubleJump = true;
      this.canDash = true;
    }
    if (env.windY !== 0 && !this.isDashing) body.setVelocityY(body.velocity.y + env.windY * dt);

    // Investida: segurar para carregar, soltar para avançar ------------------
    if (this.abilities.has('charge') && !this.isRushing) {
      if (input.chargeHeld) {
        this.chargeMs += delta;
        const ready = this.chargeMs >= CHARGE_TIME_MS;
        this.setTint(ready ? (Math.floor(this.chargeMs / 60) % 2 ? 0xff6060 : 0xffffff) : 0xffb0b0);
      } else if (this.chargeMs > 0) {
        if (this.chargeMs >= CHARGE_TIME_MS) this.startRush(dir);
        this.chargeMs = 0;
        this.clearTint();
      }
    }
    if (this.isRushing) {
      this.rushTimer -= delta;
      body.setVelocity(this.rushDir * T.rushSpeed, 0);
      this.ghostTimer -= delta;
      if (this.ghostTimer <= 0) {
        this.ghostTimer = 24;
        this.spawnGhost(0xb13e53);
      }
      const blocked = this.rushDir > 0 ? body.blocked.right : body.blocked.left;
      if (this.rushTimer <= 0 || blocked) this.endRush();
      this.updateAnimation();
      return;
    }

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
        this.spawnGhost(0x73eff7);
      }
      if (this.dashTimer <= 0) {
        body.setAllowGravity(true);
        body.setVelocityX(this.dashDir * T.runSpeed);
      }
      this.updateAnimation();
      return;
    }

    // Corrida horizontal com aceleração ------------------------------------
    const speedScale = env.inWater ? T.waterSpeedScale : env.onIce && onGround ? 1.15 : 1;
    const target = dir * T.runSpeed * speedScale + env.windX;
    const vx = body.velocity.x;
    let accel = dir !== 0 ? (onGround ? T.groundAccel : T.airAccel) : onGround ? T.groundDecel : T.airAccel * 0.4;
    if (onGround && env.onIce) accel = dir !== 0 ? T.iceAccel : T.iceDecel;
    if (this.isCharging && onGround) accel *= 0.5;
    let next = vx;
    if (vx < target) next = Math.min(target, vx + accel * dt);
    else if (vx > target) next = Math.max(target, vx - accel * dt);
    this.wallJumpLock -= delta;
    if (this.wallJumpLock <= 0) body.setVelocityX(next);

    // Escalar paredes ------------------------------------------------------
    let wallDir: -1 | 0 | 1 = 0;
    if (this.abilities.has('wallClimb') && !onGround && !env.inWater) {
      if (body.blocked.left && this.isWallAt?.(body.left - 2, body.center.y)) wallDir = -1;
      else if (body.blocked.right && this.isWallAt?.(body.right + 2, body.center.y)) wallDir = 1;
    }
    this.onWall = wallDir !== 0 && dir === wallDir ? wallDir : 0;
    if (this.onWall !== 0) {
      body.setVelocityY(-g * T.climbSpeed);
      this.facing = this.onWall;
      this.canDoubleJump = true;
      this.canDash = true;
      this.jumping = false;
    }

    // Pulo, pulo duplo e altura variável ----------------------------------
    if (env.inWater && input.jumpPressed) {
      // Braçada: dá para "nadar" para cima quantas vezes quiser.
      body.setVelocityY(-T.swimVelocity);
      this.jumpBuffer = 0;
      this.jumping = false;
      sfx.play('swim');
      this.onJump?.(false);
    } else if (this.onWall !== 0 && input.jumpPressed) {
      // Salto na parede: impulso para o lado oposto.
      body.setVelocity(-this.onWall * T.wallJumpX, -g * T.wallJumpY);
      this.facing = this.onWall === 1 ? -1 : 1;
      this.wallJumpLock = T.wallJumpLockMs;
      this.onWall = 0;
      this.jumping = true;
      this.jumpBuffer = 0;
      sfx.play('jump');
      this.onJump?.(false);
    } else if (this.jumpBuffer > 0) {
      if (this.coyoteTimer > 0) {
        body.setVelocityY(-g * T.jumpVelocity);
        this.jumping = true;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        sfx.play('jump');
        this.onJump?.(false);
      } else if (this.canDoubleJump && input.jumpPressed) {
        body.setVelocityY(-g * T.doubleJumpVelocity);
        this.jumping = true;
        this.canDoubleJump = false;
        this.jumpBuffer = 0;
        sfx.play('doubleJump');
        this.onJump?.(true);
        this.scene.tweens.add({ targets: this, angle: this.facing * 360, duration: 280, onComplete: () => this.setAngle(0) });
      }
    }
    if (body.velocity.y * g >= 0) this.jumping = false;
    if (this.jumping && !input.jumpHeld && body.velocity.y * g < -T.jumpCutVelocity) {
      body.setVelocityY(-g * T.jumpCutVelocity);
      this.jumping = false;
    }

    // Planar ----------------------------------------------------------------
    this.gliding =
      this.abilities.has('glide') && !onGround && !env.inWater && this.onWall === 0 && input.jumpHeld && !this.jumping && body.velocity.y * g > 0;
    if (this.gliding) {
      body.setVelocityY(g * Math.min(body.velocity.y * g, T.glideFall));
      // Correntes de ar sobem ainda mais com o cachecol aberto.
      if (env.windY < 0) body.setVelocityY(body.velocity.y + env.windY * dt * 0.6);
    }

    this.updateAnimation();
  }

  private startRush(dir: number): void {
    this.rushDir = dir !== 0 ? (dir as 1 | -1) : this.facing;
    this.facing = this.rushDir;
    this.rushTimer = PLAYER_TUNING.rushMs;
    this.body.setAllowGravity(false);
    sfx.play('rush');
    this.scene.cameras.main.shake(120, 0.004);
    this.onRush?.();
  }

  /** Interrompe a investida, opcionalmente ricocheteando para trás. */
  stopRush(knockback = false): void {
    if (!this.isRushing) return;
    this.endRush();
    if (knockback) this.body.setVelocity(-this.rushDir * 180, -220 * this.gravityDir);
  }

  private endRush(): void {
    this.rushTimer = 0;
    this.body.setAllowGravity(true);
    this.body.setVelocityX(this.rushDir * PLAYER_TUNING.runSpeed);
  }

  private spawnGhost(color: number): void {
    const ghost = this.scene.add
      .image(this.x, this.y, this.texture.key, 8)
      .setFlipX(this.flipX)
      .setFlipY(this.flipY)
      .setTint(color)
      .setAlpha(0.6)
      .setDepth(9)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
  }

  private updateAnimation(): void {
    this.setFlipX(this.facing < 0);
    if (this.isDashing || this.isRushing) {
      this.anims.stop();
      this.setFrame(8);
      return;
    }
    if (this.onWall !== 0) {
      this.anims.stop();
      this.setFrame(11);
      return;
    }
    if (this.gliding) {
      this.anims.stop();
      this.setFrame(10);
      return;
    }
    if (!this.onGround) {
      this.anims.stop();
      this.setFrame(this.fallSpeed < 0 ? 6 : 7);
      return;
    }
    const key = this.texture.key;
    if (Math.abs(this.body.velocity.x) > 20) this.anims.play(`${key}-run`, true);
    else this.anims.play(`${key}-idle`, true);
  }
}
