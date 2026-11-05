import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, hex } from '../gfx/palette';
import { ensurePixSkin } from '../gfx/skins';
import { createBackgroundTextures, createTileset, GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import { InputHub } from '../input/controls';
import { GamepadSource, gamepads } from '../input/gamepad';
import { isTouchDevice } from '../input/touchState';
import { LEVELS, WORLDS } from '../levels';
import { SOLID_TILES, TILE_SIZE, parseLevel } from '../logic/levelParser';
import { findSkin } from '../logic/shop';
import { Player } from '../objects/Player';
import { type NpcId, NPCS, hubChatter } from '../story/story';
import { saveManager } from '../systems/saveManager';
import { DialogueBox } from '../ui/DialogueBox';
import { pixelText } from '../ui/text';
import { TouchControls } from '../ui/TouchControls';

const W = 72;

/** Mapa da vila: chão com uma colina e algumas plataformas. */
function villageMap(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < 17; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      let ch = '.';
      if (y >= 15) ch = '#';
      if (y === 14 && x >= 33 && x <= 39) ch = '#';
      if (y === 10 && x >= 34 && x <= 38) ch = '-';
      if ((x === 0 || x === W - 1) && y < 15) ch = 'X';
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

type InteractKind = 'npc' | 'portal' | 'shop' | 'board';

interface Interactable {
  kind: InteractKind;
  x: number;
  y: number;
  npc?: NpcId;
  world?: number;
  label: Phaser.GameObjects.Text;
}

/** Vila central: NPCs para conversar, a loja e os portais dos 3 mundos. */
export class HubScene extends Phaser.Scene {
  private player!: Player;
  private inputs!: InputHub;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private items: Interactable[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private nearby: Interactable | null = null;
  private dialogue!: DialogueBox;
  private touch: TouchControls | null = null;
  private far!: Phaser.GameObjects.TileSprite;
  private near!: Phaser.GameObjects.TileSprite;
  private leaving = false;

  constructor() {
    super('Hub');
  }

  create(): void {
    this.items = [];
    this.nearby = null;
    this.leaving = false;
    sfx.playMusic('menu');
    const theme = LEVELS[0].theme;
    const keys = createBackgroundTextures(this, theme);
    this.add.image(0, 0, keys.sky).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setScrollFactor(0).setDepth(-30);
    this.far = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, keys.far).setOrigin(0).setScrollFactor(0).setDepth(-20);
    this.near = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, keys.near).setOrigin(0).setScrollFactor(0).setDepth(-10);

    const parsed = parseLevel(villageMap());
    const tilesetKey = createTileset(this, 'grass');
    const map = this.make.tilemap({ data: parsed.tiles, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage(tilesetKey, tilesetKey, TILE_SIZE, TILE_SIZE, 0, 0);
    this.layer = map.createLayer(0, tileset!, 0, 0)!;
    this.layer.setCollision([...SOLID_TILES]);
    this.layer.forEachTile((tile) => {
      if (tile.index === 3) tile.setCollision(false, false, true, false);
    });

    this.drawVillage();
    const save = saveManager.get();

    // Portais dos mundos
    const portalX = [6, 48, 66];
    WORLDS.forEach((world, i) => {
      const x = portalX[i] * TILE_SIZE + 8;
      const open = save.unlockedLevels > world.firstLevel;
      const sprite = this.add.sprite(x, 14 * TILE_SIZE, 'warp').setDepth(2).play('warp-spin');
      if (!open) sprite.setTint(0x333c57).anims.pause();
      this.addItem('portal', x, 14 * TILE_SIZE, t('hub.portal', { n: world.id }), { world: i });
    });

    // NPCs
    const npcX: Record<NpcId, number> = { elder: 14, lumi: 24, captain: 41, astro: 57 };
    for (const id of Object.keys(npcX) as NpcId[]) {
      const x = npcX[id] * TILE_SIZE + 8;
      const visible = id === 'elder' || id === 'lumi' || (id === 'captain' && save.unlockedLevels > 5) || (id === 'astro' && save.unlockedLevels > 10);
      if (!visible) continue;
      this.add.sprite(x, 14 * TILE_SIZE, NPCS[id].texture, 0).setDepth(3).play(`npc-${id}-idle`);
      this.addItem('npc', x, 14 * TILE_SIZE, t(NPCS[id].nameKey), { npc: id });
    }

    // Loja
    this.addItem('shop', 30 * TILE_SIZE + 8, 14 * TILE_SIZE, t('hub.shop'));

    // Jogador
    const skin = findSkin(save.equippedSkin);
    const startX = (this.registry.get('hub-x') as number | undefined) ?? 10 * TILE_SIZE;
    this.player = new Player(this, startX, 13 * TILE_SIZE, ensurePixSkin(this, skin.id, skin.colors));
    this.physics.add.collider(this.player, this.layer);
    this.physics.world.gravity.y = 950;
    this.physics.world.setBounds(0, 0, W * TILE_SIZE, 17 * TILE_SIZE);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W * TILE_SIZE, 17 * TILE_SIZE);
    cam.startFollow(this.player, true, 0.15, 0.15);
    cam.fadeIn(400, 26, 28, 44);

    this.inputs = new InputHub(this, 'single');
    this.inputs.extraSources.push(new GamepadSource('single'));
    this.inputs.reset();

    // Interface
    this.add.rectangle(0, 0, GAME_WIDTH, 20, COLORS.ink, 0.7).setOrigin(0).setScrollFactor(0).setDepth(100);
    pixelText(this, 8, 6, t('hub.title'), { size: 8, color: COLORS.yellow }).setScrollFactor(0).setDepth(101);
    this.add.image(GAME_WIDTH - 130, 10, 'coin', 0).setScrollFactor(0).setDepth(101);
    pixelText(this, GAME_WIDTH - 122, 6, String(save.wallet), { size: 8, color: COLORS.yellow }).setScrollFactor(0).setDepth(101);
    pixelText(this, GAME_WIDTH - 8, 6, t('hub.menu'), { size: 8, color: COLORS.gray }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
    this.prompt = pixelText(this, 0, 0, '', { size: 8, color: COLORS.white }).setOrigin(0.5).setDepth(50).setVisible(false);
    this.prompt.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.interact());

    this.dialogue = new DialogueBox(this);
    if (isTouchDevice()) this.touch = new TouchControls(this, { dash: '!' });

    const kb = this.input.keyboard;
    for (const key of ['keydown-DOWN', 'keydown-S', 'keydown-E', 'keydown-ENTER']) kb?.on(key, () => this.interact());
    kb?.on('keydown-ESC', () => this.leave('Menu'));
  }

  private addItem(kind: InteractKind, x: number, y: number, name: string, extra: Partial<Interactable> = {}): void {
    const label = pixelText(this, x, y - 26, name, { size: 8, color: kind === 'portal' ? COLORS.cyan : COLORS.white }).setOrigin(0.5).setDepth(4);
    this.items.push({ kind, x, y, label, ...extra });
  }

  /** Casas, árvores e postes desenhados com formas simples. */
  private drawVillage(): void {
    const g = this.add.graphics().setDepth(-5);
    const ground = 15 * TILE_SIZE;
    const house = (x: number, w: number, h: number, wall: number, roof: number) => {
      g.fillStyle(wall).fillRect(x, ground - h, w, h);
      g.fillStyle(0x1a1c2c).fillRect(x, ground - h, w, 2);
      g.fillStyle(roof).fillTriangle(x - 6, ground - h, x + w / 2, ground - h - 24, x + w + 6, ground - h);
      g.fillStyle(0x5e3a28).fillRect(x + w / 2 - 6, ground - 20, 12, 20);
      g.fillStyle(0xffcd75).fillRect(x + 6, ground - h + 10, 10, 8).fillRect(x + w - 16, ground - h + 10, 10, 8);
    };
    house(11 * TILE_SIZE, 64, 48, 0xc4cfdb, 0xb13e53);
    house(27 * TILE_SIZE, 80, 54, 0xffcd75, 0x3b5dc9);
    house(53 * TILE_SIZE, 64, 50, 0x94b0c2, 0x5d275d);
    pixelText(this, 27 * TILE_SIZE + 40, ground - 40, 'LOJA', { size: 8, color: COLORS.ink, strokeThickness: 0 }).setOrigin(0.5).setDepth(-4);
    for (const tx of [3, 20, 44, 61, 69]) {
      const x = tx * TILE_SIZE;
      g.fillStyle(0x5e3a28).fillRect(x - 3, ground - 26, 6, 26);
      g.fillStyle(0x38b764).fillCircle(x, ground - 34, 14);
      g.fillStyle(0xa7f070).fillCircle(x - 4, ground - 38, 6);
    }
    // Telescópio da Dra. Órbita
    g.fillStyle(0x566c86).fillRect(60 * TILE_SIZE, ground - 30, 4, 30);
    g.fillStyle(0x94b0c2).fillRect(60 * TILE_SIZE - 10, ground - 38, 24, 8);
  }

  private interact(): void {
    if (this.dialogue.busy || this.leaving) return;
    const item = this.nearby;
    if (!item) return;
    sfx.play('select');
    const save = saveManager.get();
    switch (item.kind) {
      case 'npc':
        this.dialogue.play(hubChatter(item.npc!, save.unlockedLevels, save.stats.bossEclipse > 0));
        break;
      case 'portal': {
        const world = WORLDS[item.world!];
        if (save.unlockedLevels > world.firstLevel) {
          sfx.play('confirm');
          this.leave('WorldMap', { world: item.world, from: 'Hub' });
        } else {
          this.dialogue.play([{ speaker: 'elder', key: 'hub.locked' }]);
        }
        break;
      }
      case 'shop':
        this.leave('Shop', { from: 'Hub' });
        break;
      case 'board':
        break;
    }
  }

  private leave(scene: string, data?: object): void {
    if (this.leaving) return;
    this.leaving = true;
    this.registry.set('hub-x', this.player.x);
    this.cameras.main.fadeOut(300, 26, 28, 44);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(scene, data));
  }

  update(_t: number, delta: number): void {
    const dt = Math.min(delta, 50);
    this.touch?.update();
    const cam = this.cameras.main;
    this.far.tilePositionX = cam.scrollX * 0.15;
    this.near.tilePositionX = cam.scrollX * 0.35;

    const input = this.inputs.read(0);
    // Na vila, o dash (e o botão "!") serve para interagir.
    if (input.dashPressed) this.interact();
    if (this.inputs.consumePause() && !this.dialogue.open) this.leave('Menu');
    const frozen = this.dialogue.open || this.leaving;
    this.player.frozen = frozen;
    this.player.update({ ...input, dashPressed: false, chargeHeld: false, jumpPressed: frozen ? false : input.jumpPressed }, dt);

    // Interação mais próxima
    const p = this.player;
    this.nearby = this.items.find((i) => Math.abs(i.x - p.x) < 20 && Math.abs(i.y - p.y) < 24) ?? null;
    for (const i of this.items) i.label.setAlpha(i === this.nearby ? 1 : 0.6);
    if (this.nearby && !frozen) {
      const verb = this.nearby.kind === 'npc' ? t('hub.talk') : t('hub.enter');
      const key = isTouchDevice() || gamepads.connectedCount > 0 ? '!' : '↓';
      this.prompt.setText(`${key} ${verb}`).setPosition(this.nearby.x, this.nearby.y - 40).setVisible(true).setColor(hex(COLORS.yellow));
    } else {
      this.prompt.setVisible(false);
    }
  }
}
