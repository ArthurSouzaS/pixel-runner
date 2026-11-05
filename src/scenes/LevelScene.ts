import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { createBackgroundTextures, createMoverTexture, createTileset, GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { isTouchDevice, touchState } from '../input/touchState';
import { LEVELS, TOTAL_LEVELS, worldOfLevel, type LevelData } from '../levels';
import { SOLID_TILES, TILE_SIZE, TileIndex, parseLevel, tileCenter, type ParsedLevel } from '../logic/levelParser';
import { ABILITIES, type AbilityId } from '../logic/abilities';
import { nextLevelIndex } from '../logic/progress';
import {
  POINTS,
  addPoints,
  collectCoin,
  createRun,
  enemyPoints,
  formatTime,
  levelClearBonus,
  loseLife,
  type RunState,
} from '../logic/score';
import { Boss, BOSS_MAX_HP, type BossHooks, type BossLike } from '../objects/Boss';
import { FallingPlatform } from '../objects/FallingPlatform';
import { Spring } from '../objects/Spring';
import { StormBoss } from '../objects/StormBoss';
import { createEnemy, type Enemy, type EnemyContext } from '../objects/enemies';
import { MovingPlatform } from '../objects/MovingPlatform';
import { Player, type PlayerInput } from '../objects/Player';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';

export interface LevelSceneData {
  levelIndex: number;
  run?: RunState;
}

export interface HudState {
  levelNumber: number;
  levelName: string;
  lives: number;
  score: number;
  coins: number;
  coinsTotal: number;
  time: number;
  bossHp: number;
  bossMax: number;
  bossVisible: boolean;
  bossName: string;
}

type Keys = Record<'left' | 'right' | 'a' | 'd' | 'up' | 'w' | 'space' | 'z' | 'c' | 'l', Phaser.Input.Keyboard.Key>;

const JUMP_CODES = new Set(['Space', 'ArrowUp', 'KeyW', 'KeyZ']);
const DASH_CODES = new Set(['ShiftLeft', 'ShiftRight', 'KeyX', 'KeyK']);
const PAUSE_CODES = new Set(['Escape', 'KeyP']);

/** Cena "Fase": monta o mapa a partir dos dados e roda o jogo. */
export class LevelScene extends Phaser.Scene {
  private levelIndex = 0;
  private level!: LevelData;
  private parsed!: ParsedLevel;
  private run!: RunState;
  private runAtStart!: RunState;

  private player!: Player;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private enemies: Enemy[] = [];
  private movers: MovingPlatform[] = [];
  private coins!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private spikes!: Phaser.Physics.Arcade.StaticGroup;
  private checkpoints!: Phaser.Physics.Arcade.StaticGroup;
  private goal!: Phaser.Physics.Arcade.Sprite;
  private boss: BossLike | null = null;
  private springs: Spring[] = [];
  private abilityOrb: Phaser.Physics.Arcade.Sprite | null = null;
  private fallers: FallingPlatform[] = [];
  private waterRects: Phaser.Geom.Rectangle[] = [];
  private windZones: { rect: Phaser.Geom.Rectangle; vx: number; vy: number }[] = [];
  private bossDefeated = false;
  private gateClosed = false;

  private keys!: Keys;
  private respawnPoint = { x: 0, y: 0 };
  private elapsed = 0;
  private moverClock = 0;
  private coinsCollected = 0;
  private finished = false;
  private bossHud = { hp: BOSS_MAX_HP, max: BOSS_MAX_HP, visible: false, name: '' };

  private bg!: { far: Phaser.GameObjects.TileSprite; near: Phaser.GameObjects.TileSprite; clouds: Phaser.GameObjects.Image[] };
  private fx!: {
    dust: Phaser.GameObjects.Particles.ParticleEmitter;
    sparkle: Phaser.GameObjects.Particles.ParticleEmitter;
    pop: Phaser.GameObjects.Particles.ParticleEmitter;
    splash: Phaser.GameObjects.Particles.ParticleEmitter;
    confetti: Phaser.GameObjects.Particles.ParticleEmitter;
  };

  constructor() {
    super('Level');
  }

  init(data: LevelSceneData): void {
    this.levelIndex = Phaser.Math.Clamp(data.levelIndex ?? 0, 0, TOTAL_LEVELS - 1);
    this.level = LEVELS[this.levelIndex];
    this.run = data.run ? { ...data.run, levelIndex: this.levelIndex } : createRun(this.levelIndex);
    this.runAtStart = { ...this.run };
    this.enemies = [];
    this.movers = [];
    this.boss = null;
    this.bossDefeated = false;
    this.gateClosed = false;
    this.elapsed = 0;
    this.moverClock = 0;
    this.coinsCollected = 0;
    this.finished = false;
    this.bossHud = { hp: BOSS_MAX_HP, max: BOSS_MAX_HP, visible: false, name: '' };
    this.springs = [];
    this.abilityOrb = null;
    this.fallers = [];
    this.waterRects = [];
    this.windZones = [];
  }

  create(): void {
    this.parsed = parseLevel(this.level.map);
    const worldW = this.parsed.width * TILE_SIZE;
    const worldH = this.parsed.height * TILE_SIZE;
    touchState.reset();

    this.createBackground();
    this.createMap();
    this.createFx();
    this.createObjects();
    this.createEnvironment();
    this.createHints();

    this.physics.world.setBounds(0, -64, worldW, worldH + 64, true, true, true, false);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.player, true, 0.15, 0.12);
    cam.setDeadzone(24, 40);
    cam.fadeIn(350, 26, 28, 44);

    this.createColliders();
    this.createInput();

    sfx.playMusic(this.level.theme.key);

    this.scene.launch('HUD', { level: this });
    this.game.events.on(Phaser.Core.Events.BLUR, this.autoPause, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.autoPause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.autoPause, this);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.autoPause, this);
      this.scene.stop('HUD');
    });
  }

  // -------------------------------------------------------------------------
  // Montagem da fase
  // -------------------------------------------------------------------------

  private createBackground(): void {
    const theme = this.level.theme;
    const keys = createBackgroundTextures(this, theme);
    this.add.image(0, 0, keys.sky).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setScrollFactor(0).setDepth(-30);

    const clouds: Phaser.GameObjects.Image[] = [];
    if (theme.key === 'grass' || theme.key === 'ice' || theme.key === 'factory') {
      for (let i = 0; i < 6; i++) {
        const cloud = this.add
          .image(i * 110 + Phaser.Math.Between(0, 60), Phaser.Math.Between(20, 90), 'cloud')
          .setScrollFactor(0)
          .setDepth(-25)
          .setAlpha(theme.key === 'factory' ? 0.25 : 0.9);
        clouds.push(cloud);
      }
    } else {
      // Cristais/estrelas cintilando ao fundo.
      for (let i = 0; i < 40; i++) {
        const star = this.add
          .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(10, 160), 'px')
          .setScrollFactor(0)
          .setDepth(-25)
          .setTint(theme.key === 'cave' ? COLORS.cyan : COLORS.yellow);
        this.tweens.add({ targets: star, alpha: 0.1, duration: Phaser.Math.Between(600, 1800), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
      }
    }

    const far = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, keys.far).setOrigin(0).setScrollFactor(0).setDepth(-20);
    const near = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, keys.near).setOrigin(0).setScrollFactor(0).setDepth(-10);
    this.add.image(0, GAME_HEIGHT - 40, 'void').setOrigin(0).setDisplaySize(GAME_WIDTH, 40).setScrollFactor(0).setDepth(-5);
    this.bg = { far, near, clouds };
  }

  private createMap(): void {
    const tilesetKey = createTileset(this, this.level.theme.key);
    const map = this.make.tilemap({ data: this.parsed.tiles, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage(tilesetKey, tilesetKey, TILE_SIZE, TILE_SIZE, 0, 0);
    if (!tileset) throw new Error('Falha ao criar tileset');
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error('Falha ao criar camada do mapa');
    this.layer = layer;
    layer.setCollision([...SOLID_TILES]);
    // Plataformas finas só colidem por cima.
    layer.forEachTile((tile) => {
      if (tile.index === TileIndex.Platform) tile.setCollision(false, false, true, false);
    });
  }

  private createFx(): void {
    const base = { emitting: false, lifespan: 400 };
    this.fx = {
      dust: this.add.particles(0, 0, 'px', { ...base, speed: { min: 15, max: 60 }, angle: { min: 200, max: 340 }, gravityY: 200, scale: { start: 1.2, end: 0 }, tint: [0xf4f4f4, 0x94b0c2] }).setDepth(11),
      sparkle: this.add.particles(0, 0, 'px', { ...base, speed: { min: 30, max: 90 }, scale: { start: 1, end: 0 }, tint: [0xffcd75, 0xf4f4f4, 0xef7d57] }).setDepth(11),
      pop: this.add.particles(0, 0, 'px4', { ...base, lifespan: 500, speed: { min: 60, max: 160 }, gravityY: 400, scale: { start: 1, end: 0.2 }, tint: [0xb13e53, 0xf4f4f4, 0xef7d57, 0x5d275d] }).setDepth(11),
      splash: this.add.particles(0, 0, 'px', { ...base, lifespan: 500, speed: { min: 40, max: 120 }, angle: { min: 220, max: 320 }, gravityY: 500, tint: [0x73eff7, 0xf4f4f4, 0x41a6f6] }).setDepth(13),
      confetti: this.add.particles(0, 0, 'px4', { ...base, lifespan: 1400, speed: { min: 80, max: 220 }, angle: { min: 220, max: 320 }, gravityY: 260, rotate: { min: 0, max: 360 }, tint: [0xffcd75, 0x38b764, 0x41a6f6, 0xb13e53, 0xf4f4f4] }).setDepth(20),
    };
  }

  private createObjects(): void {
    const p = this.parsed;
    const theme = this.level.theme.key;

    // Espinhos
    this.spikes = this.physics.add.staticGroup();
    for (const s of p.spikes) {
      const c = tileCenter(s);
      const spike = this.spikes.create(c.x, c.y, 'spike') as Phaser.Physics.Arcade.Sprite;
      (spike.body as Phaser.Physics.Arcade.StaticBody).setSize(12, 6).setOffset(2, 10);
    }

    // Moedas
    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const coin of p.coins) {
      const c = tileCenter(coin);
      const sprite = this.coins.create(c.x, c.y, 'coin') as Phaser.Physics.Arcade.Sprite;
      sprite.play({ key: 'coin-spin', startFrame: (coin.x + coin.y) % 4 });
      this.tweens.add({ targets: sprite, y: c.y - 2, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (coin.x % 5) * 80 });
    }

    // Checkpoints
    this.checkpoints = this.physics.add.staticGroup();
    for (const cp of p.checkpoints) {
      const c = tileCenter(cp);
      const flag = this.checkpoints.create(c.x + 4, c.y, 'checkpoint', 0) as Phaser.Physics.Arcade.Sprite;
      flag.setDepth(3).setData('active', false);
      (flag.body as Phaser.Physics.Arcade.StaticBody).setSize(10, 16).setOffset(0, 0);
    }

    // Chegada (portal)
    const g = p.goal ?? { x: p.width - 3, y: p.height - 3 };
    const gc = tileCenter(g);
    this.goal = this.physics.add.staticSprite(gc.x, gc.y - 8, 'portal', 0).setDepth(3);
    this.goal.play('portal-glow');
    if (p.boss) this.goal.setVisible(false).disableBody(false, false);

    // Plataformas móveis
    for (const m of this.level.movers ?? []) {
      this.movers.push(new MovingPlatform(this, m, createMoverTexture(this, theme, m.width)));
    }

    // Jogador
    const start = tileCenter(p.start ?? { x: 2, y: p.height - 3 });
    this.respawnPoint = { x: start.x, y: start.y };
    this.player = new Player(this, start.x, start.y);
    for (const a of saveManager.get().abilities) this.player.abilities.add(a);
    this.player.isWallAt = (x, y) => {
      const tile = this.layer.getTileAtWorldXY(x, y);
      return !!tile && tile.collides && tile.index !== TileIndex.Platform;
    };

    // Orbe de habilidade (só aparece se ainda não foi conquistada)
    const abilityId = this.level.ability;
    if (p.ability && abilityId && !this.player.abilities.has(abilityId)) {
      const c = tileCenter(p.ability);
      const orb = this.physics.add.staticSprite(c.x, c.y, 'orb').setTint(ABILITIES[abilityId].color).setDepth(6);
      this.tweens.add({ targets: orb, y: c.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: orb, scale: 1.15, duration: 350, yoyo: true, repeat: -1 });
      this.abilityOrb = orb;
    }
    this.player.onLand = () => this.fx.dust.explode(6, this.player.x, this.player.body.bottom);
    this.player.onJump = (double) => this.fx.dust.explode(double ? 10 : 5, this.player.x, this.player.body.bottom);
    this.player.onDash = () => {
      this.fx.dust.explode(8, this.player.x, this.player.y);
      this.cameras.main.shake(60, 0.002);
    };

    // Inimigos
    for (const e of p.enemies) {
      const c = tileCenter(e);
      this.enemies.push(createEnemy(this, e.kind, c.x, c.y));
    }

    // Projéteis
    this.bullets = this.physics.add.group({ allowGravity: false });

    // Molas e plataformas que caem
    for (const sp of p.springs) {
      const c = tileCenter(sp);
      this.springs.push(new Spring(this, c.x, c.y));
    }
    for (const f of p.fallers) {
      const c = tileCenter(f);
      this.fallers.push(new FallingPlatform(this, c.x, c.y - 4));
    }

    // Chefe
    if (p.boss) {
      const c = tileCenter(p.boss);
      const hooks: BossHooks = {
        fireBullet: (x, y, vx, vy, texture) => this.fireBullet(x, y, vx, vy, texture),
        shake: (d, i) => this.cameras.main.shake(d, i),
        dust: (x, y, n) => this.fx.pop.explode(n, x, y),
        onHealthChange: (hp, max) => {
          this.bossHud.hp = hp;
          this.bossHud.max = max;
        },
        onDefeated: (x, y) => this.onBossDefeated(x, y),
      };
      if (this.level.boss === 'storm') {
        const gateX = p.gate.length > 0 ? p.gate[0].x : 0;
        this.boss = new StormBoss(this, c.x, c.y, { minX: (gateX + 1) * TILE_SIZE, maxX: (p.width - 1) * TILE_SIZE, groundY: (p.height - 2) * TILE_SIZE }, hooks);
      } else {
        this.boss = new Boss(this, c.x, c.y - 8, hooks);
      }
      this.bossHud.name = this.boss.displayName;
      this.bossHud.hp = this.bossHud.max = this.boss.maxHp;
    }
  }

  /** Água e vento (regiões definidas nos dados da fase). */
  private createEnvironment(): void {
    for (const w of this.level.water ?? []) {
      const rect = new Phaser.Geom.Rectangle(w.x * TILE_SIZE, w.y * TILE_SIZE, w.w * TILE_SIZE, w.h * TILE_SIZE);
      this.waterRects.push(rect);
      this.add.rectangle(rect.x, rect.y, rect.width, rect.height, COLORS.blue, 0.42).setOrigin(0).setDepth(12);
      const surface = this.add.tileSprite(rect.x, rect.y - 2, rect.width, 4, 'px').setOrigin(0).setDepth(12).setTint(COLORS.cyan).setAlpha(0.7);
      this.tweens.add({ targets: surface, y: rect.y - 1, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.add.particles(0, 0, 'px', {
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(rect.x, rect.y + 8, rect.width, rect.height - 8), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
        frequency: 380,
        lifespan: 1400,
        speedY: { min: -30, max: -12 },
        alpha: { start: 0.8, end: 0 },
        tint: 0xf4f4f4,
      }).setDepth(12);
    }
    for (const z of this.level.winds ?? []) {
      const rect = new Phaser.Geom.Rectangle(z.x * TILE_SIZE, z.y * TILE_SIZE, z.w * TILE_SIZE, z.h * TILE_SIZE);
      this.windZones.push({ rect, vx: z.vx, vy: z.vy });
      const updraft = z.vy < 0;
      this.add.particles(0, 0, 'px', {
        emitZone: { type: 'random', source: rect, quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
        frequency: updraft ? 70 : 90,
        lifespan: 700,
        speedX: updraft ? { min: -5, max: 5 } : { min: z.vx * 1.6, max: z.vx * 2.4 },
        speedY: updraft ? { min: -260, max: -160 } : { min: -6, max: 6 },
        scaleX: updraft ? 0.5 : 3,
        scaleY: updraft ? 3 : 0.5,
        alpha: { start: 0.6, end: 0 },
        tint: this.level.theme.key === 'sky' || this.level.theme.key === 'frost' ? 0x3b5dc9 : 0xf4f4f4,
      }).setDepth(1);
    }
  }

  /** Atualiza gelo, água e vento para o jogador. */
  private updateEnvironment(): void {
    const p = this.player;
    const env = p.env;
    const under = p.onGround ? this.layer.getTileAtWorldXY(p.x, p.body.bottom + 2) : null;
    env.onIce = under?.index === TileIndex.Ice;
    const wasInWater = env.inWater;
    env.inWater = this.waterRects.some((r) => r.contains(p.x, p.y));
    if (env.inWater !== wasInWater && !p.dead) {
      sfx.play('splash');
      this.fx.splash.explode(10, p.x, p.y);
    }
    env.windX = 0;
    env.windY = 0;
    for (const z of this.windZones) {
      if (z.rect.contains(p.x, p.y)) {
        env.windX += z.vx;
        env.windY += z.vy;
      }
    }
  }

  private createHints(): void {
    const touch = isTouchDevice();
    for (const hint of this.level.hints ?? []) {
      const text = pixelText(this, hint.x * TILE_SIZE, hint.y * TILE_SIZE, touch && hint.touchText ? hint.touchText : hint.text, {
        size: 8,
        align: 'center',
        wrap: 170,
        color: COLORS.white,
      })
        .setOrigin(0.5)
        .setDepth(2);
      this.tweens.add({ targets: text, y: text.y - 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private createColliders(): void {
    const solidEnemies = this.enemies.filter((e) => e.solid);
    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.player, this.movers);
    this.physics.add.collider(this.player, this.fallers, (_p, f) => {
      const faller = f as FallingPlatform;
      if (faller.body.touching.up) {
        if (faller.visible) sfx.play('crumble');
        faller.trigger();
      }
    });
    this.physics.add.overlap(this.player, this.springs, (_p, s) => this.touchSpring(s as Spring));
    this.physics.add.collider(solidEnemies, this.layer);
    this.physics.add.collider(this.bullets, this.layer, (bullet) => this.popBullet(bullet as Phaser.Physics.Arcade.Image));

    this.physics.add.overlap(this.player, this.coins, (_p, coin) => this.collectCoin(coin as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.spikes, () => {
      if (!this.player.isInvulnerable) this.killPlayer();
    });
    this.physics.add.overlap(this.player, this.checkpoints, (_p, flag) => this.activateCheckpoint(flag as Phaser.Physics.Arcade.Sprite));
    this.physics.add.overlap(this.player, this.enemies, (_p, enemy) => this.touchEnemy(enemy as Enemy));
    this.physics.add.overlap(this.player, this.bullets, (_p, bullet) => this.touchBullet(bullet as Phaser.Physics.Arcade.Image));
    this.physics.add.overlap(this.player, this.goal, () => this.reachGoal());
    if (this.abilityOrb) this.physics.add.overlap(this.player, this.abilityOrb, () => this.collectAbility());

    if (this.boss) {
      this.physics.add.collider(this.boss, this.layer);
      this.physics.add.overlap(this.player, this.boss, () => this.touchBoss());
    }
  }

  private createInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      left: K.LEFT, right: K.RIGHT, a: K.A, d: K.D,
      up: K.UP, w: K.W, space: K.SPACE, z: K.Z,
      c: K.C, l: K.L,
    }) as Keys;
    kb.addCapture([K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT]);
    // Pressionamentos vão para uma fila: assim nem um toque muito rápido
    // (apertar e soltar no mesmo frame) é perdido.
    kb.on('keydown', (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (JUMP_CODES.has(event.code)) touchState.jumpQueued = true;
      else if (DASH_CODES.has(event.code)) touchState.dashQueued = true;
      else if (PAUSE_CODES.has(event.code)) touchState.pauseQueued = true;
    });
  }

  // -------------------------------------------------------------------------
  // Loop principal
  // -------------------------------------------------------------------------

  private readInput(): PlayerInput {
    const k = this.keys;
    return {
      left: (k?.left.isDown || k?.a.isDown || touchState.left) ?? false,
      right: (k?.right.isDown || k?.d.isDown || touchState.right) ?? false,
      jumpHeld: (k?.space.isDown || k?.up.isDown || k?.w.isDown || k?.z.isDown || touchState.jump) ?? false,
      jumpPressed: touchState.consume('jumpQueued'),
      dashPressed: touchState.consume('dashQueued'),
      chargeHeld: (k?.c.isDown || k?.l.isDown || touchState.charge) ?? false,
    };
  }

  update(_time: number, delta: number): void {
    // Limita o delta para evitar "teletransportes" após travadas.
    const dt = Math.min(delta, 50);
    const cam = this.cameras.main;
    this.bg.far.tilePositionX = cam.scrollX * 0.15;
    this.bg.near.tilePositionX = cam.scrollX * 0.35;
    for (const [i, cloud] of this.bg.clouds.entries()) {
      cloud.x -= dt * 0.004 * (1 + (i % 3));
      if (cloud.x < -40) cloud.x = GAME_WIDTH + 40;
    }

    if (touchState.consume('pauseQueued')) {
      this.openPause();
      return;
    }

    this.moverClock += dt / 1000;
    for (const mover of this.movers) mover.step(this.moverClock, dt);

    const worldBottom = this.parsed.height * TILE_SIZE;
    for (const f of this.fallers) f.step(dt, worldBottom);

    this.updateEnvironment();
    if (this.player.isRushing) this.breakBlocksAhead();
    const input = this.readInput();
    if (!this.finished && !this.player.dead) this.elapsed += dt / 1000;
    this.player.update(input, dt);

    const ctx: EnemyContext = {
      player: this.player,
      layer: this.layer,
      difficulty: 1 + this.levelIndex * 0.15,
      fireBullet: (x, y, vx, vy) => this.fireBullet(x, y, vx, vy),
    };
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      // Só "pensa" quem está perto da câmera, para economizar e ser justo.
      if (Math.abs(enemy.x - this.player.x) < GAME_WIDTH) enemy.think(ctx, dt);
      else enemy.body.setVelocityX(0);
      if (enemy.y > this.parsed.height * TILE_SIZE + 32) enemy.destroy();
    }

    for (const bullet of this.bullets.getChildren() as Phaser.Physics.Arcade.Image[]) {
      const age = (bullet.getData('age') as number) + dt;
      bullet.setData('age', age);
      if (age > 4000) bullet.destroy();
    }

    if (this.boss?.active) {
      this.boss.think(this.player, dt);
      if (!this.gateClosed && !this.bossDefeated && this.parsed.gate.length > 0) {
        const triggerX = (this.parsed.gate[0].x + 4) * TILE_SIZE;
        if (this.player.x > triggerX && !this.player.dead) this.startBossFight();
      }
    }

    if (!this.player.dead && this.player.y > this.parsed.height * TILE_SIZE + 16) {
      this.killPlayer(true);
    }
  }

  // -------------------------------------------------------------------------
  // Interações
  // -------------------------------------------------------------------------

  private floatingText(x: number, y: number, text: string, color: number = COLORS.white): void {
    const t = pixelText(this, x, y, text, { size: 8, color }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 800, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Sprite): void {
    if (!coin.active) return;
    this.fx.sparkle.explode(8, coin.x, coin.y);
    coin.destroy();
    this.coinsCollected++;
    const result = collectCoin(this.run);
    this.run = result.run;
    sfx.play('coin');
    if (result.extraLife) {
      sfx.play('extraLife');
      this.floatingText(this.player.x, this.player.y - 14, '+1 VIDA', COLORS.lightGreen);
    }
  }

  private activateCheckpoint(flag: Phaser.Physics.Arcade.Sprite): void {
    if (flag.getData('active') || this.player.dead) return;
    flag.setData('active', true);
    flag.play('checkpoint-wave');
    this.respawnPoint = { x: flag.x, y: flag.y };
    this.run = addPoints(this.run, POINTS.checkpoint);
    sfx.play('checkpoint');
    this.fx.confetti.explode(16, flag.x, flag.y - 8);
    this.floatingText(flag.x, flag.y - 20, 'CHECKPOINT!', COLORS.lightGreen);
  }

  private touchEnemy(enemy: Enemy): void {
    if (enemy.dead || this.player.dead || this.finished) return;
    const pb = this.player.body;
    const stomp = pb.velocity.y > 0 && pb.bottom <= enemy.body.top + 10;
    if (enemy.armored && !this.player.isRushing) {
      // Blindado: pisão e dash só ricocheteiam. Encostar de lado machuca.
      if (stomp || this.player.isDashing) {
        sfx.play('clank');
        this.fx.sparkle.explode(6, enemy.x, enemy.body.top);
        if (stomp) this.player.bounce(false, this.readHeldJump());
        else this.player.setVelocityX(this.player.x < enemy.x ? -160 : 160);
      } else if (!this.player.isInvulnerable) {
        this.killPlayer();
      }
      return;
    }
    if (stomp || this.player.isDashing || this.player.isRushing) {
      if (stomp) {
        this.player.combo++;
        this.player.bounce(false, this.readHeldJump());
      }
      const points = enemyPoints(Math.max(1, this.player.combo));
      this.run = addPoints(this.run, points);
      this.floatingText(enemy.x, enemy.y - 10, String(points), this.player.combo > 1 ? COLORS.yellow : COLORS.white);
      this.fx.pop.explode(12, enemy.x, enemy.y);
      this.cameras.main.shake(90, 0.004);
      sfx.play('stomp');
      enemy.kill();
    } else if (!this.player.isInvulnerable) {
      this.killPlayer();
    }
  }

  /** Investida: quebra blocos rachados à frente do jogador. */
  private breakBlocksAhead(): void {
    const p = this.player;
    let broke = false;
    // Abre uma passagem de dois blocos de altura à frente.
    for (const dx of [10, 20]) {
      for (const y of [p.body.top - 10, p.body.center.y, p.body.bottom - 2]) {
        const tile = this.layer.getTileAtWorldXY(p.x + p.facingRush * dx, y);
        if (tile?.index === TileIndex.Breakable) {
          this.layer.removeTileAt(tile.x, tile.y);
          this.fx.pop.explode(10, tile.getCenterX(), tile.getCenterY());
          broke = true;
        }
      }
    }
    if (broke) {
      sfx.play('break');
      this.cameras.main.shake(100, 0.006);
    }
  }

  private collectAbility(): void {
    const orb = this.abilityOrb;
    const id = this.level.ability;
    if (!orb || !id || !orb.active || this.player.dead) return;
    orb.destroy();
    this.abilityOrb = null;
    this.grantAbility(id);
  }

  private grantAbility(id: AbilityId): void {
    saveManager.grantAbility(id);
    this.player.abilities.add(id);
    sfx.play('ability');
    this.fx.confetti.explode(40, this.player.x, this.player.y);
    this.cameras.main.flash(250, 255, 255, 255);
    touchState.reset();
    this.scene.pause();
    this.scene.launch('Tutorial', { ability: id });
    this.scene.bringToTop('Tutorial');
  }

  hasAbility(id: AbilityId): boolean {
    return this.player?.abilities.has(id) ?? false;
  }

  private touchSpring(spring: Spring): void {
    const pb = this.player.body;
    if (this.player.dead || pb.velocity.y < 0 || pb.bottom > spring.body.top + 8) return;
    this.player.launch(Spring.LAUNCH_VELOCITY);
    spring.boing();
    sfx.play('spring');
    this.fx.dust.explode(8, spring.x, spring.y);
  }

  private readHeldJump(): boolean {
    const k = this.keys;
    return (k?.space.isDown || k?.up.isDown || k?.w.isDown || k?.z.isDown || touchState.jump) ?? false;
  }

  private fireBullet(x: number, y: number, vx: number, vy: number, texture = 'bullet'): void {
    const bullet = this.bullets.create(x, y, texture) as Phaser.Physics.Arcade.Image;
    bullet.setDepth(7).setData('age', 0);
    bullet.setVelocity(vx, vy);
    (bullet.body as Phaser.Physics.Arcade.Body).setSize(4, 4).setOffset(1, 1);
  }

  private popBullet(bullet: Phaser.Physics.Arcade.Image): void {
    this.fx.sparkle.explode(4, bullet.x, bullet.y);
    bullet.destroy();
  }

  private touchBullet(bullet: Phaser.Physics.Arcade.Image): void {
    if (this.player.dead || this.player.isDashing || this.player.isRushing || this.player.isInvulnerable) return;
    this.popBullet(bullet);
    this.killPlayer();
  }

  private touchBoss(): void {
    const boss = this.boss;
    if (!boss || !boss.active || this.player.dead) return;
    const pb = this.player.body;
    const stomp = pb.velocity.y > 0 && pb.bottom <= boss.body.top + 12;
    if (this.player.isRushing) {
      // A investida também fere os chefes, mas ricocheteia o jogador.
      if (boss.hit()) {
        this.run = addPoints(this.run, POINTS.bossHit);
        this.floatingText(boss.x, boss.y - 24, String(POINTS.bossHit), COLORS.yellow);
      }
      this.player.stopRush(true);
    } else if (stomp) {
      if (boss.hit()) {
        this.run = addPoints(this.run, POINTS.bossHit);
        this.floatingText(boss.x, boss.y - 24, String(POINTS.bossHit), COLORS.yellow);
        this.fx.pop.explode(16, this.player.x, pb.bottom);
      }
      this.player.bounce(true);
    } else if (boss.isActive && !this.player.isInvulnerable) {
      this.killPlayer();
    }
  }

  private setGate(closed: boolean): void {
    this.gateClosed = closed;
    for (const g of this.parsed.gate) {
      if (closed) this.layer.putTileAt(TileIndex.Block, g.x, g.y);
      else this.layer.removeTileAt(g.x, g.y);
    }
  }

  private startBossFight(): void {
    if (!this.boss) return;
    this.setGate(true);
    sfx.play('gate');
    this.cameras.main.shake(400, 0.01);
    this.bossHud.visible = true;
    this.boss.wake();
  }

  private onBossDefeated(x: number, y: number): void {
    this.bossDefeated = true;
    this.bossHud.visible = false;
    this.run = addPoints(this.run, POINTS.boss);
    this.floatingText(x, y - 20, `+${POINTS.boss}`, COLORS.yellow);
    this.fx.confetti.explode(60, x, y);
    this.bullets.clear(true, true);
    this.goal.setVisible(true).enableBody(false, 0, 0, true, true).setScale(0);
    this.tweens.add({ targets: this.goal, scale: 1, duration: 600, ease: 'Back.easeOut' });
    this.cameras.main.flash(300, 255, 255, 255);
  }

  private killPlayer(fell = false): void {
    if (this.player.dead || this.finished) return;
    this.player.die();
    if (fell) this.player.setVisible(false).setVelocity(0, 0);
    sfx.play('hurt');
    this.cameras.main.shake(260, 0.012);
    this.cameras.main.flash(120, 177, 62, 83);
    this.fx.pop.explode(14, this.player.x, Math.min(this.player.y, this.parsed.height * TILE_SIZE));

    this.time.delayedCall(1100, () => {
      const result = loseLife(this.run);
      this.run = result.run;
      if (result.gameOver) {
        this.gameOver();
        return;
      }
      this.respawn();
    });
  }

  private respawn(): void {
    this.bullets.clear(true, true);
    if (this.boss?.active && !this.bossDefeated) {
      this.boss.reset();
      this.bossHud.visible = false;
      this.setGate(false);
    }
    this.player.setVisible(true);
    this.player.revive();
    this.player.respawn(this.respawnPoint.x, this.respawnPoint.y);
    this.fx.sparkle.explode(16, this.respawnPoint.x, this.respawnPoint.y);
  }

  private gameOver(): void {
    this.finished = true;
    sfx.stopMusic();
    sfx.play('gameOver');
    const isNewRecord = saveManager.submitScore(this.run.score);
    this.cameras.main.fadeOut(600, 26, 28, 44);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('GameOver', { victory: false, score: this.run.score, levelIndex: this.levelIndex, isNewRecord });
    });
  }

  private reachGoal(): void {
    if (this.finished || this.player.dead || !this.goal.visible) return;
    this.finished = true;
    this.player.frozen = true;
    sfx.stopMusic();
    sfx.play('levelClear');
    this.fx.confetti.explode(40, this.goal.x, this.goal.y - 10);

    const bonus = levelClearBonus({
      seconds: this.elapsed,
      parSeconds: this.level.par,
      coinsCollected: this.coinsCollected,
      coinsTotal: this.parsed.coins.length,
    });
    this.run = addPoints(this.run, bonus.total);
    const bestTime = saveManager.levelCleared(this.levelIndex, this.elapsed);
    const isNewRecord = saveManager.submitScore(this.run.score);

    this.tweens.add({ targets: this.player, x: this.goal.x, alpha: 0, scale: 0.4, angle: 360, duration: 700, ease: 'Quad.easeIn' });

    const cx = GAME_WIDTH / 2;
    const panel = this.add.rectangle(cx, GAME_HEIGHT / 2, 300, 150, COLORS.ink, 0.85).setScrollFactor(0).setDepth(50).setStrokeStyle(2, COLORS.yellow);
    const lines = [
      `Conclusão ......... +${bonus.clear}`,
      `Tempo ${formatTime(this.elapsed).padStart(5, ' ')} ...... +${bonus.time}`,
      `Todas as moedas ... +${bonus.coins}`,
    ];
    const next = nextLevelIndex(this.levelIndex, TOTAL_LEVELS);
    const worldClear = next === null || worldOfLevel(next).id !== worldOfLevel(this.levelIndex).id;
    const title = pixelText(this, cx, 78, worldClear ? 'MUNDO CONCLUÍDO!' : 'FASE CONCLUÍDA!', { size: 14, color: COLORS.yellow }).setOrigin(0.5).setScrollFactor(0).setDepth(51);
    const body = pixelText(this, cx, 132, lines.join('\n'), { size: 8, align: 'left' }).setOrigin(0.5).setScrollFactor(0).setDepth(51).setLineSpacing(6);
    const extra = [bestTime ? 'Novo melhor tempo!' : '', isNewRecord ? 'Novo recorde!' : ''].filter(Boolean).join('  ');
    const footer = pixelText(this, cx, 180, extra, { size: 8, color: COLORS.lightGreen }).setOrigin(0.5).setScrollFactor(0).setDepth(51);
    for (const obj of [panel, title, body, footer]) {
      obj.setAlpha(0);
      this.tweens.add({ targets: obj, alpha: 1, duration: 300, delay: 300 });
    }

    this.time.delayedCall(3400, () => {
      this.cameras.main.fadeOut(400, 26, 28, 44);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        if (next === null) {
          this.scene.start('GameOver', { victory: true, score: this.run.score, levelIndex: this.levelIndex, isNewRecord });
        } else {
          this.scene.restart({ levelIndex: next, run: { ...this.run, levelIndex: next } } satisfies LevelSceneData);
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // Pausa e API para o HUD/pausa
  // -------------------------------------------------------------------------

  private autoPause(): void {
    if (this.scene.isActive()) this.openPause();
  }

  openPause(): void {
    if (this.finished || this.player.dead || !this.scene.isActive()) return;
    sfx.play('pause');
    touchState.reset();
    this.scene.pause();
    this.scene.launch('Pause', { levelIndex: this.levelIndex });
    this.scene.bringToTop('Pause');
  }

  /** Reinicia a fase atual com o estado da partida do início da fase. */
  restartLevel(): void {
    this.scene.restart({ levelIndex: this.levelIndex, run: this.runAtStart } satisfies LevelSceneData);
  }

  /** Sai para o menu, registrando a pontuação alcançada. */
  quitToMenu(): void {
    saveManager.submitScore(this.run.score);
    sfx.stopMusic();
    this.scene.start('Menu');
  }

  getHudState(): HudState {
    return {
      levelNumber: this.level.id,
      levelName: this.level.name,
      lives: this.run.lives,
      score: this.run.score,
      coins: this.coinsCollected,
      coinsTotal: this.parsed.coins.length,
      time: this.elapsed,
      bossHp: this.bossHud.hp,
      bossMax: this.bossHud.max,
      bossVisible: this.bossHud.visible,
      bossName: this.bossHud.name,
    };
  }

  getLevelInfo(): { number: number; name: string; subtitle: string } {
    return { number: this.level.id, name: this.level.name, subtitle: this.level.subtitle };
  }
}
