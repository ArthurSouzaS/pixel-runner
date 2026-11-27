import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { ensurePixSkin } from '../gfx/skins';
import { GAME_HEIGHT, GAME_WIDTH, createBackgroundTextures, createTileset } from '../gfx/textures';
import { t } from '../i18n';
import { InputHub } from '../input/controls';
import { GamepadSource, gamepads } from '../input/gamepad';
import { isTouchDevice, usingTouch } from '../input/touchState';
import { LEVELS } from '../levels';
import { SOLID_TILES, TILE_SIZE, parseLevel } from '../logic/levelParser';
import { findSkin } from '../logic/shop';
import { Player } from '../objects/Player';
import { SECRET_BOSSES, type SecretBossSlot, secretBossReady } from '../story/secretBosses';
import type { DialogueLine } from '../story/story';
import { saveManager } from '../systems/saveManager';
import { DialogueBox } from '../ui/DialogueBox';
import { TouchControls } from '../ui/TouchControls';
import { pixelText } from '../ui/text';

/** Largura do planeta em tiles. */
const W = 44;
const TERMINAL_X = 6;
const PORTAL_X = [16, 26, 36];

interface Spot {
  kind: 'terminal' | 'portal';
  x: number;
  slot?: SecretBossSlot;
  label: Phaser.GameObjects.Text;
}

function planetMap(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < 17; y++) {
    let row = '';
    for (let x = 0; x < W; x++) row += y >= 15 || ((x === 0 || x === W - 1) && y < 15) ? (y >= 15 ? '#' : 'X') : '.';
    rows.push(row);
  }
  return rows;
}

/**
 * Planeta secreto (achado clicando ou tocando no planeta anelado do mapa).
 * Três portais levarão a lutas contra chefes novos; por enquanto estão selados ("Em breve").
 */
export class SecretPlanetScene extends Phaser.Scene {
  private player!: Player;
  private inputs!: InputHub;
  private dialogue!: DialogueBox;
  private prompt!: Phaser.GameObjects.Text;
  private spots: Spot[] = [];
  private nearby: Spot | null = null;
  private leaving = false;
  private touch: TouchControls | null = null;
  private far!: Phaser.GameObjects.TileSprite;

  constructor() {
    super('SecretPlanet');
  }

  create(): void {
    this.spots = [];
    this.nearby = null;
    this.leaving = false;
    this.touch = null;
    sfx.playMusic('nebula');

    // Céu do espaço, estrelas e o planeta anelado gigante ao fundo.
    const keys = createBackgroundTextures(this, LEVELS[12].theme);
    this.add.image(0, 0, keys.sky).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setScrollFactor(0).setDepth(-30);
    const stars = this.add.graphics().setScrollFactor(0.1).setDepth(-25);
    for (let i = 0; i < 70; i++) stars.fillStyle(COLORS.white, Phaser.Math.FloatBetween(0.3, 1)).fillRect(Phaser.Math.Between(0, GAME_WIDTH + 80), Phaser.Math.Between(22, 200), 1, 1);
    const giant = this.add.graphics().setScrollFactor(0.15).setDepth(-22);
    giant.fillStyle(0xef7d57).fillCircle(330, 92, 46);
    giant.fillStyle(0xffcd75, 0.8).fillCircle(316, 78, 18);
    giant.lineStyle(3, 0xffcd75, 0.9).strokeEllipse(330, 92, 150, 34);
    this.far = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, keys.far).setOrigin(0).setScrollFactor(0).setDepth(-20).setAlpha(0.7);

    const parsed = parseLevel(planetMap());
    const tilesetKey = createTileset(this, 'moon');
    const map = this.make.tilemap({ data: parsed.tiles, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage(tilesetKey, tilesetKey, TILE_SIZE, TILE_SIZE, 0, 0);
    const layer = map.createLayer(0, tileset!, 0, 0)!;
    layer.setCollision([...SOLID_TILES]);

    this.createTerminal();
    SECRET_BOSSES.forEach((slot, i) => this.createPortal(slot, PORTAL_X[i] ?? 16 + i * 10));

    const skin = findSkin(saveManager.get().equippedSkin);
    this.player = new Player(this, 3 * TILE_SIZE, 13 * TILE_SIZE, ensurePixSkin(this, skin.id, skin.colors));
    this.physics.add.collider(this.player, layer);
    this.physics.world.gravity.y = 950;
    this.physics.world.setBounds(0, 0, W * TILE_SIZE, 17 * TILE_SIZE);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W * TILE_SIZE, 17 * TILE_SIZE);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.fadeIn(500, 255, 255, 255);

    this.inputs = new InputHub(this, 'single', { ...saveManager.get().access.keys });
    this.inputs.extraSources.push(new GamepadSource('single'));
    this.inputs.reset();

    // Barra superior
    this.add.rectangle(0, 0, GAME_WIDTH, 20, COLORS.ink, 0.7).setOrigin(0).setScrollFactor(0).setDepth(100);
    pixelText(this, 8, 6, t('secret.title'), { size: 8, color: COLORS.yellow }).setScrollFactor(0).setDepth(101);
    const touch = usingTouch();
    const back = pixelText(this, GAME_WIDTH - 8, touch ? 3 : 6, t(touch ? 'secret.backTouch' : 'secret.backKey'), { size: 8, color: touch ? COLORS.white : COLORS.gray })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(101);
    if (touch) back.setPadding(4, 3, 4, 3).setBackgroundColor('#333c57');
    back.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!this.dialogue.busy) this.leave();
    });

    this.prompt = pixelText(this, 0, 0, '', { size: 8, color: COLORS.yellow }).setOrigin(0.5).setDepth(50).setVisible(false);
    this.prompt.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.interact());
    this.dialogue = new DialogueBox(this);
    if (isTouchDevice() || usingTouch()) this.touch = new TouchControls(this, { dash: '!' });

    const kb = this.input.keyboard;
    for (const key of ['keydown-DOWN', 'keydown-S', 'keydown-E', 'keydown-ENTER']) kb?.on(key, () => this.interact());
    kb?.on('keydown-ESC', () => this.leave());

    // Primeira visita: conquista e a transmissão da Dra. Órbita abre sozinha.
    if (!saveManager.get().storySeen.includes('secret-planet')) {
      saveManager.markStory('secret-planet');
      this.time.delayedCall(700, () => this.dialogue.play(this.terminalLines()));
    }
  }

  private createTerminal(): void {
    const x = TERMINAL_X * TILE_SIZE + 8;
    const ground = 15 * TILE_SIZE;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x333c57).fillRect(x - 3, ground - 22, 6, 22);
    g.fillStyle(0x1a1c2c).fillRect(x - 14, ground - 40, 28, 20);
    g.fillStyle(0x566c86).fillRect(x - 12, ground - 38, 24, 16);
    const screen = this.add.rectangle(x, ground - 30, 20, 12, 0x73eff7, 0.8).setDepth(3);
    this.tweens.add({ targets: screen, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });
    const mark = pixelText(this, x, ground - 52, '!', { size: 10, color: COLORS.yellow }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: mark, y: mark.y - 3, duration: 400, yoyo: true, repeat: -1 });
    const label = pixelText(this, x, ground - 64, t('secret.terminal'), { size: 8, color: COLORS.cyan }).setOrigin(0.5).setDepth(4);
    this.spots.push({ kind: 'terminal', x, label });
  }

  private createPortal(slot: SecretBossSlot, tx: number): void {
    const x = tx * TILE_SIZE + 8;
    const y = 14 * TILE_SIZE;
    const ready = secretBossReady(slot);
    const glow = this.add.circle(x, y, 18, slot.color, 0.25).setDepth(1);
    this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.08, duration: 1100, yoyo: true, repeat: -1 });
    this.add.sprite(x, y, 'warp').setDepth(2).setScale(1.3).setTint(slot.color).play('warp-spin');
    if (!ready) {
      // Selado: cadeado e a placa "EM BREVE".
      this.add.image(x, y, 'lock').setDepth(3).setScale(1.5);
      const badge = pixelText(this, x, y - 48, t('secret.soon'), { size: 8, color: COLORS.ink, strokeThickness: 0 })
        .setOrigin(0.5)
        .setDepth(5)
        .setPadding(3, 2, 3, 2)
        .setBackgroundColor('#ffcd75');
      this.tweens.add({ targets: badge, alpha: 0.45, duration: 600, yoyo: true, repeat: -1 });
    }
    const label = pixelText(this, x, y - 32, t(slot.nameKey), { size: 8, color: COLORS.cyan }).setOrigin(0.5).setDepth(4);
    this.spots.push({ kind: 'portal', x, slot, label });
  }

  private terminalLines(): DialogueLine[] {
    return [
      { speaker: 'astro', key: 'secret.sign.1' },
      { speaker: 'astro', key: 'secret.sign.2' },
      { speaker: 'astro', key: 'secret.sign.3' },
    ];
  }

  private interact(): void {
    if (this.dialogue.busy || this.leaving || !this.nearby) return;
    sfx.play('select');
    const spot = this.nearby;
    if (spot.kind === 'terminal') {
      this.dialogue.play(this.terminalLines());
      return;
    }
    const slot = spot.slot!;
    if (secretBossReady(slot)) {
      sfx.play('confirm');
      this.leave('Level', { levelIndex: 0, custom: slot.level, secret: slot.id });
      return;
    }
    this.dialogue.play([{ speaker: 'astro', key: 'secret.sealed', params: { name: t(slot.nameKey) } }]);
  }

  private leave(scene = 'WorldMap', data?: object): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 26, 28, 44);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(scene, data));
  }

  update(_t: number, delta: number): void {
    const dt = Math.min(delta, 50);
    this.touch?.update();
    this.far.tilePositionX = this.cameras.main.scrollX * 0.3;
    const input = this.inputs.read(0);
    // Como na vila: o dash (e o botão "!") interage.
    if (input.dashPressed) this.interact();
    if (this.inputs.consumePause() && !this.dialogue.open) this.leave();
    const frozen = this.dialogue.open || this.leaving;
    this.player.frozen = frozen;
    this.player.update({ ...input, dashPressed: false, chargeHeld: false, jumpPressed: frozen ? false : input.jumpPressed }, dt);

    const p = this.player;
    this.nearby = this.spots.find((s) => Math.abs(s.x - p.x) < 20 && p.y > 12 * TILE_SIZE) ?? null;
    for (const s of this.spots) s.label.setAlpha(s === this.nearby ? 1 : 0.6);
    if (this.nearby && !frozen) {
      const key = usingTouch() || gamepads.connectedCount > 0 ? '!' : '↓';
      const verb = this.nearby.kind === 'terminal' ? t('secret.read') : t('hub.enter');
      const top = this.nearby.kind === 'terminal' ? 15 * TILE_SIZE - 78 : 14 * TILE_SIZE - 64;
      this.prompt.setText(`${key} ${verb}`).setPosition(this.nearby.x, top).setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }
}
