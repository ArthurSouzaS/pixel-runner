import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { ensurePixSkin, ensurePlayer2Skin } from '../gfx/skins';
import { findSkin, findTrail } from '../logic/shop';
import { createTrailEmitter } from './ShopScene';
import { createBackgroundTextures, createMoverTexture, createTileset, GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { InputHub, type GameMode } from '../input/controls';
import { GamepadSource, gamepads } from '../input/gamepad';
import { isTouchDevice } from '../input/touchState';
import { LEVELS, TOTAL_LEVELS, worldOfLevel, type LevelData } from '../levels';
import { ABILITIES, type AbilityId } from '../logic/abilities';
import { SOLID_TILES, TILE_SIZE, TileIndex, parseLevel, tileCenter, type ParsedLevel } from '../logic/levelParser';
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
import { createEnemy, type Enemy, type EnemyContext } from '../objects/enemies';
import { FallingPlatform } from '../objects/FallingPlatform';
import { MovingPlatform } from '../objects/MovingPlatform';
import { Player } from '../objects/Player';
import { Spring } from '../objects/Spring';
import { StormBoss } from '../objects/StormBoss';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';

export interface LevelSceneData {
  levelIndex: number;
  run?: RunState;
  /** 'single' (padrão), 'coop' ou 'race'. */
  mode?: GameMode;
  /** Fase criada no editor (substitui `levelIndex`). */
  custom?: LevelData;
}

export interface HudState {
  mode: GameMode;
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
  /** Corrida: progresso (0..1) e moedas de cada jogador. */
  raceProgress: number[];
  raceCoins: number[];
}

const NO_NUMBERS: number[] = [];

/** Zoom mínimo da câmera quando os dois jogadores se afastam. */
const MIN_ZOOM = 0.6;

/** Cena "Fase": monta o mapa a partir dos dados e roda o jogo (1 ou 2 jogadores). */
export class LevelScene extends Phaser.Scene {
  private levelIndex = 0;
  private level!: LevelData;
  private parsed!: ParsedLevel;
  private run!: RunState;
  private runAtStart!: RunState;
  private mode: GameMode = 'single';
  private custom: LevelData | null = null;

  private players: Player[] = [];
  private respawnPoints: { x: number; y: number }[] = [];
  private raceCoins: number[] = [];
  private inputs!: InputHub;
  private focus!: Phaser.GameObjects.Zone;

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

  private elapsed = 0;
  private moverClock = 0;
  private coinsCollected = 0;
  private finished = false;
  private deposited = false;
  private deathsThisLevel = 0;
  private playTime = 0;
  private envEmitters: { emitter: Phaser.GameObjects.Particles.ParticleEmitter; rect: Phaser.Geom.Rectangle }[] = [];
  private frame = 0;
  private trail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private bossHud = { hp: BOSS_MAX_HP, max: BOSS_MAX_HP, visible: false, name: '' };

  private bg!: {
    root: Phaser.GameObjects.Container;
    far: Phaser.GameObjects.TileSprite;
    near: Phaser.GameObjects.TileSprite;
    clouds: Phaser.GameObjects.Image[];
  };
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

  /** Jogador 1 (sempre existe). */
  get player(): Player {
    return this.players[0];
  }

  init(data: LevelSceneData): void {
    this.levelIndex = Phaser.Math.Clamp(data.levelIndex ?? 0, 0, TOTAL_LEVELS - 1);
    this.custom = data.custom ?? null;
    this.level = this.custom ?? LEVELS[this.levelIndex];
    this.mode = data.mode ?? 'single';
    this.run = data.run ? { ...data.run, levelIndex: this.levelIndex } : createRun(this.levelIndex);
    this.runAtStart = { ...this.run };
    this.players = [];
    this.respawnPoints = [];
    this.raceCoins = [];
    this.enemies = [];
    this.movers = [];
    this.boss = null;
    this.bossDefeated = false;
    this.gateClosed = false;
    this.elapsed = 0;
    this.moverClock = 0;
    this.coinsCollected = 0;
    this.finished = false;
    this.deposited = false;
    this.deathsThisLevel = 0;
    this.playTime = 0;
    this.envEmitters = [];
    this.frame = 0;
    this.trail = null;
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
    this.inputs = new InputHub(this, this.mode);
    this.inputs.extraSources.push(new GamepadSource(this.mode));
    this.inputs.extraPause = () => gamepads.consumePause();
    this.inputs.reset();

    this.createBackground();
    this.createMap();
    this.createFx();
    this.createObjects();
    this.createEnvironment();
    this.createHints();

    this.physics.world.setBounds(0, -64, worldW, worldH + 64, true, true, true, false);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    this.focus = this.add.zone(this.player.x, this.player.y, 1, 1);
    if (this.mode === 'single') {
      cam.startFollow(this.player, true, 0.15, 0.12);
      cam.setDeadzone(24, 40);
    } else {
      cam.startFollow(this.focus, true, 0.12, 0.1);
    }
    cam.fadeIn(350, 26, 28, 44);

    this.createColliders();
    sfx.playMusic(this.level.theme.key);

    this.scene.launch('HUD', { level: this });
    this.game.events.on(Phaser.Core.Events.BLUR, this.autoPause, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.autoPause, this);
    // Os eventos da cena sobrevivem a reinícios: tudo que é registrado aqui é removido no shutdown.
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.autoPause, this);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.autoPause, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
      this.commitPlayTime();
      saveManager.flush();
      this.scene.stop('HUD');
    });
  }

  private onResume(): void {
    this.inputs.reset();
  }

  /** Soma o tempo de jogo acumulado nas estatísticas (evita mexer no save a cada quadro). */
  private commitPlayTime(): void {
    if (this.playTime <= 0) return;
    saveManager.stat('playSeconds', this.playTime, false);
    this.playTime = 0;
  }

  // -------------------------------------------------------------------------
  // Montagem da fase
  // -------------------------------------------------------------------------

  private createBackground(): void {
    const theme = this.level.theme;
    const keys = createBackgroundTextures(this, theme);
    // Tudo do fundo fica num contêiner fixo na tela, que é reescalado quando a câmera dá zoom.
    const root = this.add.container(0, 0).setScrollFactor(0).setDepth(-30);
    root.add(this.add.image(0, 0, keys.sky).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT));

    const clouds: Phaser.GameObjects.Image[] = [];
    if (['grass', 'ice', 'factory', 'frost', 'sky', 'reef', 'ruins'].includes(theme.key)) {
      for (let i = 0; i < 6; i++) {
        const cloud = this.add
          .image(i * 110 + Phaser.Math.Between(0, 60), Phaser.Math.Between(20, 90), 'cloud')
          .setAlpha(theme.key === 'factory' || theme.key === 'ruins' ? 0.3 : 0.9);
        clouds.push(cloud);
        root.add(cloud);
      }
    } else {
      // Cristais/estrelas cintilando ao fundo.
      for (let i = 0; i < 40; i++) {
        const star = this.add
          .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(10, 160), 'px')
          .setTint(theme.key === 'cave' ? COLORS.cyan : COLORS.yellow);
        root.add(star);
        this.tweens.add({ targets: star, alpha: 0.1, duration: Phaser.Math.Between(600, 1800), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
      }
    }

    const far = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, keys.far).setOrigin(0);
    const near = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, keys.near).setOrigin(0);
    root.add([far, near, this.add.image(0, GAME_HEIGHT - 40, 'void').setOrigin(0).setDisplaySize(GAME_WIDTH, 40)]);
    this.bg = { root, far, near, clouds };
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

  private createPlayer(index: number, x: number, y: number): Player {
    const skin = findSkin(saveManager.get().equippedSkin);
    const texture = index === 0 ? ensurePixSkin(this, skin.id, skin.colors) : ensurePlayer2Skin(this, skin.colors);
    const player = new Player(this, x, y, texture, index);
    for (const a of saveManager.get().abilities) player.abilities.add(a);
    player.isWallAt = (wx, wy) => {
      const tile = this.layer.getTileAtWorldXY(wx, wy);
      return !!tile && tile.collides && tile.index !== TileIndex.Platform;
    };
    player.onLand = () => this.fx.dust.explode(6, player.x, player.body.bottom);
    player.onJump = (double) => {
      this.fx.dust.explode(double ? 10 : 5, player.x, player.body.bottom);
      saveManager.stat(double ? 'doubleJumps' : 'jumps');
    };
    player.onDash = () => {
      this.fx.dust.explode(8, player.x, player.y);
      this.cameras.main.shake(60, 0.002);
      saveManager.stat('dashes');
    };
    player.onRush = () => {
      this.fx.dust.explode(12, player.x, player.y);
      saveManager.stat('rushes');
    };
    if (index === 0) {
      this.trail = createTrailEmitter(this, findTrail(saveManager.get().equippedTrail), player);
      this.trail?.setDepth(9);
    }
    if (this.mode !== 'single') {
      const tag = pixelText(this, x, y - 16, `P${index + 1}`, { size: 8, color: index === 0 ? COLORS.lightGreen : COLORS.cyan }).setOrigin(0.5).setDepth(31);
      player.setData('tag', tag);
    }
    return player;
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

    // Jogadores
    const start = tileCenter(p.start ?? { x: 2, y: p.height - 3 });
    for (let i = 0; i < this.inputs.playerCount; i++) {
      const x = start.x + i * 14;
      this.players.push(this.createPlayer(i, x, start.y));
      this.respawnPoints.push({ x, y: start.y });
      this.raceCoins.push(0);
    }

    // Orbe de habilidade (só aparece se ainda não foi conquistada)
    const abilityId = this.level.ability;
    if (p.ability && abilityId && !this.player.abilities.has(abilityId)) {
      const c = tileCenter(p.ability);
      const orb = this.physics.add.staticSprite(c.x, c.y, 'orb').setTint(ABILITIES[abilityId].color).setDepth(6);
      this.tweens.add({ targets: orb, y: c.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: orb, scale: 1.15, duration: 350, yoyo: true, repeat: -1 });
      this.abilityOrb = orb;
    }

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
      const bubbles = this.add.particles(0, 0, 'px', {
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(rect.x, rect.y + 8, rect.width, rect.height - 8), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
        frequency: 380,
        lifespan: 1400,
        speedY: { min: -30, max: -12 },
        alpha: { start: 0.8, end: 0 },
        tint: 0xf4f4f4,
      }).setDepth(12);
      this.envEmitters.push({ emitter: bubbles, rect });
    }
    for (const z of this.level.winds ?? []) {
      const rect = new Phaser.Geom.Rectangle(z.x * TILE_SIZE, z.y * TILE_SIZE, z.w * TILE_SIZE, z.h * TILE_SIZE);
      this.windZones.push({ rect, vx: z.vx, vy: z.vy });
      const updraft = z.vy < 0;
      const streaks = this.add.particles(0, 0, 'px', {
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
      this.envEmitters.push({ emitter: streaks, rect });
    }
  }

  /** Atualiza gelo, água e vento para um jogador. */
  private updateEnvironment(p: Player): void {
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
    this.physics.add.collider(solidEnemies, this.layer);
    this.physics.add.collider(this.bullets, this.layer, (bullet) => this.popBullet(bullet as Phaser.Physics.Arcade.Image));
    if (this.boss) this.physics.add.collider(this.boss, this.layer);

    for (const player of this.players) {
      this.physics.add.collider(player, this.layer);
      this.physics.add.collider(player, this.movers);
      this.physics.add.collider(player, this.fallers, (_p, f) => {
        const faller = f as FallingPlatform;
        if (faller.body.touching.up) {
          if (faller.visible) sfx.play('crumble');
          faller.trigger();
        }
      });
      this.physics.add.overlap(player, this.springs, (_p, s) => this.touchSpring(player, s as Spring));
      this.physics.add.overlap(player, this.coins, (_p, coin) => this.collectCoin(player, coin as Phaser.Physics.Arcade.Sprite));
      this.physics.add.overlap(player, this.spikes, () => {
        if (!player.isInvulnerable) this.killPlayer(player);
      });
      this.physics.add.overlap(player, this.checkpoints, (_p, flag) => this.activateCheckpoint(player, flag as Phaser.Physics.Arcade.Sprite));
      this.physics.add.overlap(player, this.enemies, (_p, enemy) => this.touchEnemy(player, enemy as Enemy));
      this.physics.add.overlap(player, this.bullets, (_p, bullet) => this.touchBullet(player, bullet as Phaser.Physics.Arcade.Image));
      this.physics.add.overlap(player, this.goal, () => this.reachGoal(player));
      if (this.abilityOrb) this.physics.add.overlap(player, this.abilityOrb, () => this.collectAbility(player));
      if (this.boss) this.physics.add.overlap(player, this.boss, () => this.touchBoss(player));
    }
  }

  // -------------------------------------------------------------------------
  // Loop principal
  // -------------------------------------------------------------------------

  private alivePlayers(): Player[] {
    return this.players.filter((p) => !p.dead);
  }

  private nearestPlayer(x: number): Player {
    const alive = this.alivePlayers();
    const list = alive.length > 0 ? alive : this.players;
    return list.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best), list[0]);
  }

  update(_time: number, delta: number): void {
    // Limita o delta para evitar "teletransportes" após travadas.
    const dt = Math.min(delta, 50);
    this.updateCamera();
    this.updateBackground(dt);
    // A cada 10 quadros, liga só os efeitos de água/vento visíveis na câmera.
    if (this.frame++ % 10 === 0 && this.envEmitters.length > 0) {
      const view = this.cameras.main.worldView;
      for (const e of this.envEmitters) e.emitter.emitting = Phaser.Geom.Rectangle.Overlaps(view, e.rect);
    }

    if (this.inputs.consumePause()) {
      this.openPause();
      return;
    }

    this.moverClock += dt / 1000;
    for (const mover of this.movers) mover.step(this.moverClock, dt);
    const worldBottom = this.parsed.height * TILE_SIZE;
    for (const f of this.fallers) f.step(dt, worldBottom);

    if (!this.finished && this.alivePlayers().length > 0) {
      this.elapsed += dt / 1000;
      this.playTime += dt / 1000;
    }
    if (this.trail) this.trail.emitting = !this.player.dead && this.player.visible && Math.abs(this.player.body.velocity.x) + Math.abs(this.player.body.velocity.y) > 60;
    for (const player of this.players) {
      this.updateEnvironment(player);
      if (player.isRushing) this.breakBlocksAhead(player);
      player.update(this.inputs.read(player.index), dt);
      const tag = player.getData('tag') as Phaser.GameObjects.Text | undefined;
      tag?.setPosition(player.x, player.y - 16).setVisible(player.visible && !player.dead);
      if (!player.dead && player.y > worldBottom + 16) this.killPlayer(player, true);
    }

    const ctx: EnemyContext = {
      player: this.player,
      layer: this.layer,
      difficulty: 1 + this.levelIndex * 0.12,
      fireBullet: (x, y, vx, vy) => this.fireBullet(x, y, vx, vy),
    };
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      ctx.player = this.nearestPlayer(enemy.x);
      // Só "pensa" quem está perto de algum jogador, para economizar e ser justo.
      if (Math.abs(enemy.x - ctx.player.x) < GAME_WIDTH) enemy.think(ctx, dt);
      else if (enemy.solid) enemy.body.setVelocityX(0);
      else enemy.body.setVelocity(0, 0);
      if (enemy.y > worldBottom + 32) enemy.destroy();
    }

    for (const bullet of this.bullets.getChildren() as Phaser.Physics.Arcade.Image[]) {
      const age = (bullet.getData('age') as number) + dt;
      bullet.setData('age', age);
      if (age > 4000) bullet.destroy();
    }

    if (this.boss?.active) {
      this.boss.think(this.nearestPlayer(this.boss.x), dt);
      if (!this.gateClosed && !this.bossDefeated && this.parsed.gate.length > 0) {
        const triggerX = (this.parsed.gate[0].x + 4) * TILE_SIZE;
        if (this.alivePlayers().some((p) => p.x > triggerX)) this.startBossFight();
      }
    }
  }

  /** Com 2 jogadores, a câmera mira o ponto médio e se afasta para mostrar os dois. */
  private updateCamera(): void {
    const cam = this.cameras.main;
    if (this.mode === 'single' || this.finished) {
      if (this.finished && cam.zoom !== 1) cam.setZoom(Phaser.Math.Linear(cam.zoom, 1, 0.1));
      return;
    }
    const alive = this.alivePlayers().filter((p) => p.visible);
    if (alive.length === 0) return;
    const xs = alive.map((p) => p.x);
    const ys = alive.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    this.focus.setPosition((minX + maxX) / 2, (minY + maxY) / 2);
    const target = Phaser.Math.Clamp(Math.min(GAME_WIDTH / (maxX - minX + 140), GAME_HEIGHT / (maxY - minY + 110)), MIN_ZOOM, 1);
    cam.setZoom(Phaser.Math.Linear(cam.zoom, target, 0.08));
    // Com zoom, a fase (baixa) fica alinhada à base da tela e o céu ocupa o espaço de cima.
    const worldW = this.parsed.width * TILE_SIZE;
    const worldH = this.parsed.height * TILE_SIZE;
    const viewH = GAME_HEIGHT / cam.zoom;
    cam.setBounds(0, Math.min(0, worldH - viewH), worldW, Math.max(worldH, viewH));

    // Se um jogador ficar para trás além do zoom mínimo, ele é puxado para perto do outro.
    const limit = GAME_WIDTH / MIN_ZOOM - 70;
    if (alive.length === 2 && maxX - minX > limit) {
      const [behind, ahead] = alive[0].x < alive[1].x ? alive : [alive[1], alive[0]];
      this.fx.sparkle.explode(12, behind.x, behind.y);
      behind.respawn(ahead.x - 10, ahead.y - 8);
      if (this.mode === 'race') behind.stun(900);
      this.fx.sparkle.explode(12, behind.x, behind.y);
    }
  }

  private updateBackground(dt: number): void {
    const cam = this.cameras.main;
    const z = cam.zoom;
    // Mantém o fundo cobrindo a tela mesmo com zoom diferente de 1.
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.bg.root.setScale(1 / z).setPosition(cx - cx / z, cy - cy / z);
    this.bg.far.tilePositionX = cam.scrollX * 0.15;
    this.bg.near.tilePositionX = cam.scrollX * 0.35;
    for (const [i, cloud] of this.bg.clouds.entries()) {
      cloud.x -= dt * 0.004 * (1 + (i % 3));
      if (cloud.x < -40) cloud.x = GAME_WIDTH + 40;
    }
  }

  // -------------------------------------------------------------------------
  // Interações
  // -------------------------------------------------------------------------

  private floatingText(x: number, y: number, text: string, color: number = COLORS.white): void {
    const t = pixelText(this, x, y, text, { size: 8, color }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 800, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  private collectCoin(player: Player, coin: Phaser.Physics.Arcade.Sprite): void {
    if (!coin.active || player.dead) return;
    this.fx.sparkle.explode(8, coin.x, coin.y);
    coin.destroy();
    this.coinsCollected++;
    this.raceCoins[player.index]++;
    saveManager.stat('coins');
    const result = collectCoin(this.run);
    this.run = result.run;
    sfx.play('coin');
    if (result.extraLife && this.mode !== 'race') {
      sfx.play('extraLife');
      this.floatingText(player.x, player.y - 14, '+1 VIDA', COLORS.lightGreen);
    }
  }

  private activateCheckpoint(player: Player, flag: Phaser.Physics.Arcade.Sprite): void {
    if (player.dead) return;
    const point = { x: flag.x, y: flag.y };
    if (this.mode === 'race') {
      // Na corrida, cada jogador tem o próprio checkpoint.
      const current = this.respawnPoints[player.index];
      if (current.x >= point.x) return;
      this.respawnPoints[player.index] = point;
    } else {
      if (flag.getData('active')) return;
      this.respawnPoints = this.respawnPoints.map(() => ({ ...point }));
      this.run = addPoints(this.run, POINTS.checkpoint);
      this.floatingText(flag.x, flag.y - 20, 'CHECKPOINT!', COLORS.lightGreen);
    }
    if (!flag.getData('active')) {
      flag.setData('active', true);
      flag.play('checkpoint-wave');
    }
    sfx.play('checkpoint');
    this.fx.confetti.explode(16, flag.x, flag.y - 8);
  }

  private touchEnemy(player: Player, enemy: Enemy): void {
    if (enemy.dead || player.dead || this.finished) return;
    const pb = player.body;
    const stomp = pb.velocity.y > 0 && pb.bottom <= enemy.body.top + 10;
    if (enemy.armored && !player.isRushing) {
      // Blindado: pisão e dash só ricocheteiam. Encostar de lado machuca.
      if (stomp || player.isDashing) {
        sfx.play('clank');
        this.fx.sparkle.explode(6, enemy.x, enemy.body.top);
        if (stomp) player.bounce(false, this.inputs.jumpHeld(player.index));
        else player.setVelocityX(player.x < enemy.x ? -160 : 160);
      } else if (!player.isInvulnerable) {
        this.killPlayer(player);
      }
      return;
    }
    if (stomp || player.isDashing || player.isRushing) {
      if (stomp) {
        player.combo++;
        player.bounce(false, this.inputs.jumpHeld(player.index));
      }
      const points = enemyPoints(Math.max(1, player.combo));
      this.run = addPoints(this.run, points);
      this.floatingText(enemy.x, enemy.y - 10, String(points), player.combo > 1 ? COLORS.yellow : COLORS.white);
      this.fx.pop.explode(12, enemy.x, enemy.y);
      this.cameras.main.shake(90, 0.004);
      sfx.play('stomp');
      enemy.kill();
      saveManager.stat('enemies');
      saveManager.statMax('maxCombo', player.combo);
    } else if (!player.isInvulnerable) {
      this.killPlayer(player);
    }
  }

  /** Investida: quebra blocos rachados à frente do jogador. */
  private breakBlocksAhead(p: Player): void {
    let broke = 0;
    // Abre uma passagem de dois blocos de altura à frente.
    for (const dx of [10, 20]) {
      for (const y of [p.body.top - 10, p.body.center.y, p.body.bottom - 2]) {
        const tile = this.layer.getTileAtWorldXY(p.x + p.facingRush * dx, y);
        if (tile?.index === TileIndex.Breakable) {
          this.layer.removeTileAt(tile.x, tile.y);
          this.fx.pop.explode(10, tile.getCenterX(), tile.getCenterY());
          broke++;
        }
      }
    }
    if (broke > 0) {
      sfx.play('break');
      this.cameras.main.shake(100, 0.006);
      saveManager.stat('blocksBroken', broke);
    }
  }

  private collectAbility(player: Player): void {
    const orb = this.abilityOrb;
    const id = this.level.ability;
    if (!orb || !id || !orb.active || player.dead) return;
    orb.destroy();
    this.abilityOrb = null;
    saveManager.grantAbility(id);
    for (const p of this.players) p.abilities.add(id);
    sfx.play('ability');
    this.fx.confetti.explode(40, player.x, player.y);
    this.cameras.main.flash(250, 255, 255, 255);
    this.inputs.reset();
    this.scene.pause();
    this.scene.launch('Tutorial', { ability: id });
    this.scene.bringToTop('Tutorial');
  }

  hasAbility(id: AbilityId): boolean {
    return this.players[0]?.abilities.has(id) ?? false;
  }

  private touchSpring(player: Player, spring: Spring): void {
    const pb = player.body;
    if (player.dead || pb.velocity.y < 0 || pb.bottom > spring.body.top + 8) return;
    player.launch(Spring.LAUNCH_VELOCITY);
    spring.boing();
    sfx.play('spring');
    saveManager.stat('springs');
    this.fx.dust.explode(8, spring.x, spring.y);
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

  private touchBullet(player: Player, bullet: Phaser.Physics.Arcade.Image): void {
    if (player.dead || player.isDashing || player.isRushing || player.isInvulnerable) return;
    this.popBullet(bullet);
    this.killPlayer(player);
  }

  private hitBoss(boss: BossLike): void {
    if (!boss.hit()) return;
    this.run = addPoints(this.run, POINTS.bossHit);
    this.floatingText(boss.x, boss.y - 24, String(POINTS.bossHit), COLORS.yellow);
  }

  private touchBoss(player: Player): void {
    const boss = this.boss;
    if (!boss || !boss.active || player.dead) return;
    const pb = player.body;
    const stomp = pb.velocity.y > 0 && pb.bottom <= boss.body.top + 12;
    if (player.isRushing) {
      // A investida também fere os chefes, mas ricocheteia o jogador.
      this.hitBoss(boss);
      player.stopRush(true);
    } else if (stomp) {
      this.hitBoss(boss);
      this.fx.pop.explode(16, player.x, pb.bottom);
      player.bounce(true);
    } else if (boss.isActive && !player.isInvulnerable) {
      this.killPlayer(player);
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
    // Quem ficou do lado de fora da arena é trazido para dentro.
    const gateX = this.parsed.gate[0].x * TILE_SIZE;
    const inside = this.players.find((p) => p.x > gateX && !p.dead);
    for (const p of this.players) {
      if (inside && p !== inside && p.x <= gateX + 8 && !p.dead) p.respawn(inside.x - 12, inside.y - 8);
    }
    this.setGate(true);
    sfx.play('gate');
    sfx.playMusic(this.level.boss === 'storm' ? 'boss2' : 'boss1');
    this.cameras.main.shake(400, 0.01);
    this.bossHud.visible = true;
    this.boss.wake();
  }

  private onBossDefeated(x: number, y: number): void {
    this.bossDefeated = true;
    this.bossHud.visible = false;
    sfx.playMusic(this.level.theme.key);
    saveManager.stat(this.level.boss === 'storm' ? 'bossStorm' : 'bossCore');
    this.run = addPoints(this.run, POINTS.boss);
    this.floatingText(x, y - 20, `+${POINTS.boss}`, COLORS.yellow);
    this.fx.confetti.explode(60, x, y);
    this.bullets.clear(true, true);
    this.goal.setVisible(true).enableBody(false, 0, 0, true, true).setScale(0);
    this.tweens.add({ targets: this.goal, scale: 1, duration: 600, ease: 'Back.easeOut' });
    this.cameras.main.flash(300, 255, 255, 255);
  }

  private killPlayer(player: Player, fell = false): void {
    if (player.dead || this.finished) return;
    player.die();
    this.deathsThisLevel++;
    saveManager.stat('deaths');
    saveManager.flush();
    if (fell) player.setVisible(false).setVelocity(0, 0);
    sfx.play('hurt');
    this.cameras.main.shake(260, 0.012);
    if (this.mode === 'single') this.cameras.main.flash(120, 177, 62, 83);
    this.fx.pop.explode(14, player.x, Math.min(player.y, this.parsed.height * TILE_SIZE));

    this.time.delayedCall(this.mode === 'race' ? 900 : 1100, () => {
      if (this.finished) return;
      if (this.mode === 'race') {
        this.respawn(player, this.respawnPoints[player.index]);
        return;
      }
      const result = loseLife(this.run);
      this.run = result.run;
      if (result.gameOver) {
        this.gameOver();
        return;
      }
      // Cooperativo: renasce ao lado do parceiro, se ele estiver vivo.
      const partner = this.players.find((p) => p !== player && !p.dead && p.visible);
      if (partner && !partner.env.inWater) this.respawn(player, { x: partner.x, y: partner.y - 8 }, false);
      else this.respawn(player, this.respawnPoints[player.index], true);
    });
  }

  private respawn(player: Player, point: { x: number; y: number }, resetBoss = true): void {
    if (resetBoss && this.mode !== 'race' && this.alivePlayers().length === 0) {
      this.bullets.clear(true, true);
      if (this.boss?.active && !this.bossDefeated) {
        this.boss.reset();
        this.bossHud.visible = false;
        this.setGate(false);
        sfx.playMusic(this.level.theme.key);
      }
    }
    player.setVisible(true);
    player.revive();
    player.respawn(point.x, point.y);
    this.fx.sparkle.explode(16, point.x, point.y);
  }

  /** Guarda as moedas coletadas na carteira da loja (uma vez por fase). */
  private depositCoins(): void {
    if (this.deposited || this.custom) return;
    this.deposited = true;
    saveManager.depositCoins(this.coinsCollected);
  }

  private gameOver(): void {
    this.finished = true;
    this.depositCoins();
    saveManager.flush();
    sfx.stopMusic();
    sfx.play('gameOver');
    if (this.custom) {
      this.showPanel('FIM DE JOGO', ['Suas vidas acabaram.', 'Volte ao editor e ajuste a fase!'], '', COLORS.red);
      this.time.delayedCall(2500, () => this.fadeTo(() => this.scene.start('Editor')));
      return;
    }
    const isNewRecord = saveManager.submitScore(this.run.score);
    this.cameras.main.fadeOut(600, 26, 28, 44);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('GameOver', { victory: false, score: this.run.score, levelIndex: this.levelIndex, isNewRecord, mode: this.mode });
    });
  }

  private showPanel(title: string, lines: string[], footer: string, color: number = COLORS.yellow): void {
    // O painel vai para o HUD (que não sofre zoom da câmera).
    this.events.emit('panel', { title, lines, footer, color });
  }

  private reachGoal(player: Player): void {
    if (this.finished || player.dead || !this.goal.visible) return;
    this.finished = true;
    this.depositCoins();
    for (const p of this.players) p.frozen = true;
    sfx.stopMusic();
    sfx.play(this.mode === 'race' ? 'victory' : 'levelClear');
    this.fx.confetti.explode(40, this.goal.x, this.goal.y - 10);
    this.tweens.add({ targets: player, x: this.goal.x, alpha: 0, scale: 0.4, angle: 360, duration: 700, ease: 'Quad.easeIn' });

    if (this.custom) {
      this.showPanel('FASE CONCLUÍDA!', [`Tempo: ${formatTime(this.elapsed)}`, `Moedas: ${this.coinsCollected}/${this.parsed.coins.length}`], 'Voltando ao editor...');
      this.time.delayedCall(3000, () => this.fadeTo(() => this.scene.start('Editor')));
      return;
    }
    this.recordClearStats();
    this.commitPlayTime();
    saveManager.flush();
    if (this.mode === 'race') {
      const winner = player.index + 1;
      this.showPanel(`JOGADOR ${winner} VENCEU!`, [`Tempo: ${formatTime(this.elapsed)}`, `Moedas P1: ${this.raceCoins[0]}   P2: ${this.raceCoins[1]}`], 'Boa corrida!', winner === 1 ? COLORS.lightGreen : COLORS.cyan);
      this.time.delayedCall(3400, () => this.fadeTo(() => this.scene.start('GameOver', { victory: true, score: 0, levelIndex: this.levelIndex, isNewRecord: false, mode: 'race', winner, winnerTexture: player.texture.key })));
      return;
    }

    const bonus = levelClearBonus({
      seconds: this.elapsed,
      parSeconds: this.level.par,
      coinsCollected: this.coinsCollected,
      coinsTotal: this.parsed.coins.length,
    });
    this.run = addPoints(this.run, bonus.total);
    const bestTime = saveManager.levelCleared(this.levelIndex, this.elapsed);
    const isNewRecord = saveManager.submitScore(this.run.score);

    const next = nextLevelIndex(this.levelIndex, TOTAL_LEVELS);
    const worldClear = next === null || worldOfLevel(next).id !== worldOfLevel(this.levelIndex).id;
    const extra = [bestTime ? 'Novo melhor tempo!' : '', isNewRecord ? 'Novo recorde!' : ''].filter(Boolean).join('  ');
    this.showPanel(
      worldClear ? 'MUNDO CONCLUÍDO!' : 'FASE CONCLUÍDA!',
      [`Conclusão ......... +${bonus.clear}`, `Tempo ${formatTime(this.elapsed).padStart(5, ' ')} ...... +${bonus.time}`, `Todas as moedas ... +${bonus.coins}`],
      extra,
    );

    this.time.delayedCall(3400, () =>
      this.fadeTo(() => {
        if (next === null) {
          this.scene.start('GameOver', { victory: true, score: this.run.score, levelIndex: this.levelIndex, isNewRecord, mode: this.mode });
        } else {
          this.scene.restart({ levelIndex: next, run: { ...this.run, levelIndex: next }, mode: this.mode } satisfies LevelSceneData);
        }
      }),
    );
  }

  private recordClearStats(): void {
    if (this.custom) return;
    if (this.mode === 'race') {
      saveManager.stat('raceFinishes');
      return;
    }
    saveManager.stat('levelsCleared');
    if (this.parsed.coins.length > 0 && this.coinsCollected >= this.parsed.coins.length) saveManager.stat('perfectLevels');
    if (this.deathsThisLevel === 0) saveManager.stat('flawlessLevels');
    if (this.elapsed <= this.level.par / 2) saveManager.stat('fastClears');
    if (this.mode === 'coop') saveManager.stat('coopClears');
    if (nextLevelIndex(this.levelIndex, TOTAL_LEVELS) === null) saveManager.stat('gameCompleted');
  }

  private fadeTo(next: () => void): void {
    this.cameras.main.fadeOut(400, 26, 28, 44);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, next);
  }

  // -------------------------------------------------------------------------
  // Pausa e API para o HUD/pausa
  // -------------------------------------------------------------------------

  private autoPause(): void {
    if (this.scene.isActive()) this.openPause();
  }

  openPause(): void {
    if (this.finished || this.alivePlayers().length === 0 || !this.scene.isActive()) return;
    sfx.play('pause');
    this.commitPlayTime();
    saveManager.flush();
    this.inputs.reset();
    this.scene.pause();
    this.scene.launch('Pause', { levelIndex: this.levelIndex });
    this.scene.bringToTop('Pause');
  }

  /** Reinicia a fase atual com o estado da partida do início da fase. */
  restartLevel(): void {
    this.depositCoins();
    this.scene.restart({ levelIndex: this.levelIndex, run: this.runAtStart, mode: this.mode, custom: this.custom ?? undefined } satisfies LevelSceneData);
  }

  /** Sai para o menu, registrando a pontuação alcançada. */
  quitToMenu(): void {
    this.depositCoins();
    saveManager.flush();
    sfx.stopMusic();
    if (this.custom) {
      this.scene.start('Editor');
      return;
    }
    if (this.mode !== 'race') saveManager.submitScore(this.run.score);
    this.scene.start('Menu');
  }

  getHudState(): HudState {
    const width = this.parsed.width * TILE_SIZE;
    return {
      mode: this.mode,
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
      raceProgress: this.mode === 'race' ? this.players.map((p) => Phaser.Math.Clamp(p.x / width, 0, 1)) : NO_NUMBERS,
      raceCoins: this.mode === 'race' ? this.raceCoins : NO_NUMBERS,
    };
  }

  /** Textura de cada jogador (o HUD usa nos marcadores da corrida). */
  playerTextures(): string[] {
    return this.players.map((p) => p.texture.key);
  }

  getLevelInfo(): { number: number; name: string; subtitle: string; mode: GameMode; custom: boolean } {
    return { number: this.level.id, name: this.level.name, subtitle: this.level.subtitle, mode: this.mode, custom: this.custom !== null };
  }
}
