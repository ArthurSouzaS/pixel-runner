import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { createTileset, GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { THEME_KEYS, THEME_NAMES, themeByKey } from '../levels/themes';
import {
  EDITOR_HEIGHT,
  EDITOR_SLOTS,
  EDITOR_TOOLS,
  type CustomLevel,
  type EditorSlots,
  type EditorTool,
  createCustomLevel,
  deserializeCustomLevel,
  getCell,
  levelWidth,
  loadEditorSlots,
  MAX_NAME_LENGTH,
  resizeLevel,
  saveEditorSlot,
  serializeCustomLevel,
  setCell,
  toLevelData,
  validateCustomLevel,
} from '../logic/editor';
import { TILE_SIZE, TileIndex } from '../logic/levelParser';
import { saveManager } from '../systems/saveManager';
import { MenuList } from '../ui/MenuList';
import { pixelText } from '../ui/text';

const TOP = 22;
const PALETTE_H = 34;
const MAP_ZOOM = 0.78;
const REGISTRY_KEY = 'editor-working';

interface WorkingState {
  level: CustomLevel;
  slot: number;
  scrollX: number;
}

/** Ícone (textura + frame) de cada ferramenta, para a paleta e para o mapa. */
const ICONS: Record<string, { key: string; frame?: number | string; scale?: number; dy?: number }> = {
  '^': { key: 'spike' },
  o: { key: 'coin', frame: 0 },
  K: { key: 'checkpoint', frame: 1 },
  S: { key: 'spring', frame: 0 },
  F: { key: 'faller', dy: -4 },
  w: { key: 'walker', frame: 0 },
  h: { key: 'hopper', frame: 0 },
  b: { key: 'bat', frame: 0 },
  t: { key: 'turret', frame: 0 },
  a: { key: 'armored', frame: 0 },
  P: { key: 'pix', frame: 0 },
  G: { key: 'portal', frame: 0, dy: -8 },
};

const TERRAIN: Record<string, number> = { '#': TileIndex.Top, X: TileIndex.Block, '-': TileIndex.Platform, I: TileIndex.Ice, Q: TileIndex.Breakable };

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Editor de fases: grade de tiles, objetos e inimigos; salvar, exportar, importar e testar. */
export class EditorScene extends Phaser.Scene {
  private level!: CustomLevel;
  private slot = 0;
  private slots: EditorSlots = [];
  private tool: EditorTool = EDITOR_TOOLS[0];
  private undoStack: CustomLevel[] = [];
  private dirty = false;

  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private mapLayer: Phaser.GameObjects.Layer | null = null;
  private uiLayer!: Phaser.GameObjects.Layer;
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private terrain: Phaser.Tilemaps.TilemapLayer | null = null;
  private entities = new Map<string, Phaser.GameObjects.Image>();
  private cursorRect!: Phaser.GameObjects.Rectangle;
  private painting = false;
  private eraseStroke = false;
  private scrollDir = 0;

  private nameText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private toolText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private paletteButtons: { tool: EditorTool; box: Phaser.GameObjects.Rectangle }[] = [];
  private menuPanel: Phaser.GameObjects.Container | null = null;
  private menuList: MenuList | null = null;
  private keys!: Record<'left' | 'right' | 'a' | 'd', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Editor');
  }

  create(): void {
    this.slots = loadEditorSlots(getStorage());
    const working = this.registry.get(REGISTRY_KEY) as WorkingState | undefined;
    this.level = working?.level ?? this.slots[0] ?? createCustomLevel();
    this.slot = working?.slot ?? 0;
    this.undoStack = [];
    this.entities = new Map();
    this.paletteButtons = [];
    this.menuPanel = null;
    this.menuList = null;
    this.mapLayer = null;
    sfx.playMusic('menu');

    // Câmera principal = mapa (com zoom); câmera de UI fixa por cima.
    const cam = this.cameras.main;
    cam.setViewport(0, TOP, GAME_WIDTH, GAME_HEIGHT - TOP - PALETTE_H).setZoom(MAP_ZOOM).setBackgroundColor(0x1a1c2c);
    this.uiCam = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT, false, 'ui');
    this.uiLayer = this.add.layer().setDepth(100);
    cam.ignore(this.uiLayer);

    this.buildUi();
    this.rebuildMap();
    cam.scrollX = working?.scrollX ?? 0;
    this.input.mouse?.disableContextMenu();
    this.setupInput();
    this.toast('Clique para desenhar, botão direito apaga. Esc abre o menu.');
  }

  // -------------------------------------------------------------------------
  // Construção do mapa
  // -------------------------------------------------------------------------

  private addToMap<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.mapLayer?.add(obj);
    this.uiCam.ignore(obj);
    return obj;
  }

  private addToUi<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.uiLayer.add(obj);
    return obj;
  }

  private rebuildMap(): void {
    this.mapLayer?.destroy();
    this.tilemap?.destroy();
    this.entities.clear();
    this.mapLayer = this.add.layer();
    this.uiCam.ignore(this.mapLayer);
    const width = levelWidth(this.level);
    const worldW = width * TILE_SIZE;
    const worldH = EDITOR_HEIGHT * TILE_SIZE;
    const theme = themeByKey(this.level.theme);

    this.addToMap(this.add.rectangle(0, 0, worldW, worldH, theme.skyTop).setOrigin(0));
    this.addToMap(this.add.rectangle(0, worldH * 0.5, worldW, worldH * 0.5, theme.skyBottom, 0.6).setOrigin(0));
    const grid = this.addToMap(this.add.graphics());
    grid.lineStyle(1, 0xffffff, 0.12);
    for (let x = 0; x <= width; x++) grid.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, worldH);
    for (let y = 0; y <= EDITOR_HEIGHT; y++) grid.lineBetween(0, y * TILE_SIZE, worldW, y * TILE_SIZE);

    const tilesetKey = createTileset(this, this.level.theme);
    this.tilemap = this.make.tilemap({ width, height: EDITOR_HEIGHT, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = this.tilemap.addTilesetImage(tilesetKey, tilesetKey, TILE_SIZE, TILE_SIZE, 0, 0);
    this.terrain = tileset ? this.tilemap.createBlankLayer('terrain', tileset) : null;
    if (this.terrain) this.addToMap(this.terrain);

    for (let y = 0; y < EDITOR_HEIGHT; y++) for (let x = 0; x < width; x++) this.drawCell(x, y);

    this.cursorRect = this.addToMap(this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE).setOrigin(0).setStrokeStyle(1, COLORS.yellow).setVisible(false));
    this.cameras.main.setBounds(0, 0, Math.max(worldW, GAME_WIDTH / MAP_ZOOM), worldH);
    this.refreshInfo();
  }

  /** Redesenha uma célula (tile ou objeto). */
  private drawCell(x: number, y: number): void {
    const ch = getCell(this.level, x, y);
    const key = `${x},${y}`;
    this.entities.get(key)?.destroy();
    this.entities.delete(key);
    if (this.terrain) {
      const tile = TERRAIN[ch];
      if (tile === undefined) this.terrain.removeTileAt(x, y);
      else this.terrain.putTileAt(ch === '#' && getCell(this.level, x, y - 1) === '#' ? TileIndex.Fill : tile, x, y);
    }
    const icon = ICONS[ch];
    if (icon) {
      const img = this.add.image(x * TILE_SIZE + 8, y * TILE_SIZE + 8 + (icon.dy ?? 0), icon.key, icon.frame);
      this.addToMap(img);
      this.entities.set(key, img);
    }
  }

  private paintAt(worldX: number, worldY: number, erase: boolean): void {
    const x = Math.floor(worldX / TILE_SIZE);
    const y = Math.floor(worldY / TILE_SIZE);
    const ch = erase ? '.' : this.tool.char;
    const before = this.level;
    const after = setCell(before, x, y, ch);
    if (after === before) return;
    this.level = after;
    this.dirty = true;
    if (ch === 'P' || ch === 'G') {
      // Início/chegada únicos: redesenha onde estavam antes.
      before.map.forEach((row, ry) => {
        const rx = row.indexOf(ch);
        if (rx >= 0) this.drawCell(rx, ry);
      });
    }
    this.drawCell(x, y);
    this.drawCell(x, y + 1);
    if (!erase) sfx.play('select');
    this.refreshInfo();
  }

  // -------------------------------------------------------------------------
  // Interface
  // -------------------------------------------------------------------------

  private button(x: number, y: number, label: string, onClick: () => void, color: number = COLORS.white): Phaser.GameObjects.Text {
    const t = this.addToUi(pixelText(this, x, y, label, { size: 8, color }).setOrigin(0.5));
    t.setInteractive({ useHandCursor: true });
    t.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      onClick();
    });
    t.on('pointerover', () => t.setAlpha(0.7));
    t.on('pointerout', () => t.setAlpha(1));
    return t;
  }

  private buildUi(): void {
    this.addToUi(this.add.rectangle(0, 0, GAME_WIDTH, TOP, COLORS.ink, 0.95).setOrigin(0));
    this.button(28, 11, 'MENU', () => this.openMenu(), COLORS.yellow);
    this.nameText = this.addToUi(pixelText(this, 62, 11, '', { size: 8 }).setOrigin(0, 0.5));
    this.nameText.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.rename());
    this.infoText = this.addToUi(pixelText(this, 360, 11, '', { size: 8, color: COLORS.gray }).setOrigin(1, 0.5));
    this.button(GAME_WIDTH - 40, 11, 'TESTAR', () => this.playTest(), COLORS.lightGreen);

    // Botões de rolagem (úteis no toque)
    const mapMid = TOP + (GAME_HEIGHT - TOP - PALETTE_H) / 2;
    for (const dir of [-1, 1]) {
      const bx = dir < 0 ? 12 : GAME_WIDTH - 12;
      const b = this.addToUi(this.add.rectangle(bx, mapMid, 20, 40, COLORS.ink, 0.5).setStrokeStyle(1, COLORS.white, 0.4));
      this.addToUi(pixelText(this, bx, mapMid, dir < 0 ? '<' : '>', { size: 10 }).setOrigin(0.5));
      b.setInteractive();
      b.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.scrollDir = dir;
      });
      b.on('pointerup', () => (this.scrollDir = 0));
      b.on('pointerout', () => (this.scrollDir = 0));
    }

    // Paleta de ferramentas
    const py = GAME_HEIGHT - PALETTE_H;
    this.addToUi(this.add.rectangle(0, py, GAME_WIDTH, PALETTE_H, COLORS.ink, 0.95).setOrigin(0));
    this.toolText = this.addToUi(pixelText(this, GAME_WIDTH / 2, py - 8, '', { size: 8, color: COLORS.yellow }).setOrigin(0.5));
    const step = GAME_WIDTH / EDITOR_TOOLS.length;
    EDITOR_TOOLS.forEach((tool, i) => {
      const x = step * i + step / 2;
      const y = py + 17;
      const box = this.addToUi(this.add.rectangle(x, y, step - 3, 26, COLORS.white, 0.08).setStrokeStyle(1, COLORS.white, 0.3));
      this.addToUi(this.toolIcon(tool, x, y));
      box.setInteractive({ useHandCursor: true });
      box.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.selectTool(tool);
      });
      box.on('pointerover', () => this.toolText.setText(tool.label));
      box.on('pointerout', () => this.toolText.setText(this.tool.label));
      this.paletteButtons.push({ tool, box });
    });

    this.toastText = this.addToUi(
      pixelText(this, GAME_WIDTH / 2, TOP + 14, '', { size: 8, color: COLORS.white, align: 'center', wrap: 440 }).setOrigin(0.5, 0).setAlpha(0),
    );
    this.selectTool(EDITOR_TOOLS[0]);
  }

  private toolIcon(tool: EditorTool, x: number, y: number): Phaser.GameObjects.GameObject {
    const terrain = TERRAIN[tool.char];
    if (terrain !== undefined) {
      const key = createTileset(this, 'grass');
      const tex = this.textures.get(key);
      const frame = `t${terrain}`;
      if (!tex.has(frame)) tex.add(frame, 0, terrain * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
      return this.add.image(x, y, key, frame);
    }
    const icon = ICONS[tool.char];
    if (icon) return this.add.image(x, y, icon.key, icon.frame).setScale(tool.char === 'G' ? 0.5 : 1);
    return pixelText(this, x, y, 'X', { size: 12, color: COLORS.red }).setOrigin(0.5);
  }

  private selectTool(tool: EditorTool): void {
    this.tool = tool;
    this.paletteButtons.forEach((b) => b.box.setStrokeStyle(b.tool === tool ? 2 : 1, b.tool === tool ? COLORS.yellow : COLORS.white, b.tool === tool ? 1 : 0.3));
    this.toolText.setText(tool.label);
  }

  private refreshInfo(): void {
    this.nameText.setText(`${this.level.name}${this.dirty ? '*' : ''}`);
    this.infoText.setText(`SLOT ${this.slot + 1}  ${levelWidth(this.level)}x${EDITOR_HEIGHT}`);
  }

  private toast(message: string, color: number = COLORS.white): void {
    this.toastText.setText(message).setColor(`#${color.toString(16).padStart(6, '0')}`).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2600, duration: 500 });
  }

  // -------------------------------------------------------------------------
  // Entrada
  // -------------------------------------------------------------------------

  private setupInput(): void {
    const kb = this.input.keyboard;
    const K = Phaser.Input.Keyboard.KeyCodes;
    if (kb) {
      this.keys = kb.addKeys({ left: K.LEFT, right: K.RIGHT, a: K.A, d: K.D }) as typeof this.keys;
      kb.on('keydown-ESC', () => (this.menuPanel ? this.closeMenu() : this.openMenu()));
      kb.on('keydown-T', () => !this.menuPanel && this.playTest());
      kb.on('keydown', (e: KeyboardEvent) => {
        if (this.menuPanel) return;
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
          e.preventDefault();
          this.undo();
        } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
          e.preventDefault();
          this.save();
        } else if (/^Digit[1-9]$/.test(e.code)) {
          const tool = EDITOR_TOOLS[Number(e.code.slice(5)) - 1];
          if (tool) this.selectTool(tool);
        }
      });
    }

    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, dx: number, dy: number) => {
      this.cameras.main.scrollX += (Math.abs(dx) > Math.abs(dy) ? dx : dy) * 0.5;
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.menuPanel || !this.inMapArea(pointer)) return;
      this.painting = true;
      this.eraseStroke = pointer.rightButtonDown();
      this.undoStack.push(this.level);
      if (this.undoStack.length > 60) this.undoStack.shift();
      const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.paintAt(p.x, p.y, this.eraseStroke);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const inside = this.inMapArea(pointer) && !this.menuPanel;
      const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.cursorRect.setVisible(inside).setPosition(Math.floor(p.x / TILE_SIZE) * TILE_SIZE, Math.floor(p.y / TILE_SIZE) * TILE_SIZE);
      if (this.painting && inside && pointer.isDown) this.paintAt(p.x, p.y, this.eraseStroke);
    });
    this.input.on('pointerup', () => {
      this.painting = false;
      this.scrollDir = 0;
    });
  }

  private inMapArea(pointer: Phaser.Input.Pointer): boolean {
    return pointer.y > TOP && pointer.y < GAME_HEIGHT - PALETTE_H && pointer.x > 24 && pointer.x < GAME_WIDTH - 24;
  }

  update(_t: number, delta: number): void {
    if (this.menuPanel) return;
    const k = this.keys;
    let dir = this.scrollDir;
    if (k?.left.isDown || k?.a.isDown) dir = -1;
    if (k?.right.isDown || k?.d.isDown) dir = 1;
    if (dir !== 0) this.cameras.main.scrollX += dir * delta * 0.5;
  }

  // -------------------------------------------------------------------------
  // Ações
  // -------------------------------------------------------------------------

  private undo(): void {
    const prev = this.undoStack.pop();
    if (!prev) {
      this.toast('Nada para desfazer.');
      return;
    }
    const resized = levelWidth(prev) !== levelWidth(this.level) || prev.theme !== this.level.theme;
    this.level = prev;
    this.dirty = true;
    if (resized) this.rebuildMap();
    else for (let y = 0; y < EDITOR_HEIGHT; y++) for (let x = 0; x < levelWidth(prev); x++) this.drawCell(x, y);
    this.refreshInfo();
  }

  private remember(): void {
    this.registry.set(REGISTRY_KEY, { level: this.level, slot: this.slot, scrollX: this.cameras.main.scrollX } satisfies WorkingState);
  }

  private playTest(): void {
    const result = validateCustomLevel(this.level);
    if (!result.valid) {
      sfx.play('hurt');
      this.toast(result.errors[0], COLORS.red);
      return;
    }
    sfx.play('confirm');
    this.remember();
    saveManager.stat('editorTests');
    this.scene.start('Level', { levelIndex: 0, custom: toLevelData(this.level) });
  }

  private save(): void {
    const result = validateCustomLevel(this.level);
    if (!result.valid) {
      this.toast(`Não salvou: ${result.errors[0]}`, COLORS.red);
      return;
    }
    this.slots = saveEditorSlot(getStorage(), this.slots, this.slot, this.level);
    this.dirty = false;
    this.refreshInfo();
    this.remember();
    sfx.play('checkpoint');
    this.toast(`Fase salva no slot ${this.slot + 1}!`, COLORS.lightGreen);
  }

  private loadSlot(slot: number): void {
    const saved = this.slots[slot];
    this.slot = slot;
    this.level = saved ?? createCustomLevel(undefined, `Fase ${slot + 1}`);
    this.undoStack = [];
    this.dirty = false;
    this.cameras.main.scrollX = 0;
    this.rebuildMap();
    this.remember();
    this.toast(saved ? `Slot ${slot + 1} carregado.` : `Slot ${slot + 1} vazio: nova fase criada.`);
  }

  private newLevel(): void {
    this.undoStack.push(this.level);
    this.level = createCustomLevel(undefined, this.level.name, this.level.theme);
    this.dirty = true;
    this.rebuildMap();
    this.toast('Nova fase criada.');
  }

  private rename(): void {
    const name = window.prompt('Nome da fase:', this.level.name);
    if (name === null) return;
    const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
    if (!trimmed) return;
    this.level = { ...this.level, name: trimmed };
    this.dirty = true;
    this.refreshInfo();
  }

  private cycleTheme(): void {
    const i = THEME_KEYS.indexOf(this.level.theme);
    this.undoStack.push(this.level);
    this.level = { ...this.level, theme: THEME_KEYS[(i + 1) % THEME_KEYS.length] };
    this.dirty = true;
    this.rebuildMap();
    this.toast(`Tema: ${THEME_NAMES[this.level.theme]}`);
  }

  private resize(delta: number): void {
    this.undoStack.push(this.level);
    this.level = resizeLevel(this.level, levelWidth(this.level) + delta);
    this.dirty = true;
    this.rebuildMap();
    this.toast(`Largura: ${levelWidth(this.level)} colunas`);
  }

  private exportJson(): void {
    const json = serializeCustomLevel(this.level);
    const fileName = `${this.level.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'fase'}.json`;
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Sem download disponível: a área de transferência abaixo ainda ajuda.
    }
    navigator.clipboard?.writeText(json).catch(() => undefined);
    this.toast(`Exportado: ${fileName} (também copiado)`, COLORS.lightGreen);
  }

  private importJson(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      file
        .text()
        .then((text) => {
          const result = deserializeCustomLevel(text);
          if (!result.ok) {
            sfx.play('hurt');
            this.toast(`Erro ao importar: ${result.error}`, COLORS.red);
            return;
          }
          this.undoStack.push(this.level);
          this.level = result.level;
          this.dirty = true;
          this.cameras.main.scrollX = 0;
          this.rebuildMap();
          sfx.play('confirm');
          this.toast(`"${result.level.name}" importada! Salve para guardar.`, COLORS.lightGreen);
        })
        .catch(() => this.toast('Não foi possível ler o arquivo.', COLORS.red));
    };
    input.click();
  }

  private openMenu(): void {
    if (this.menuPanel) return;
    this.painting = false;
    const cx = GAME_WIDTH / 2;
    this.menuPanel = this.addToUi(this.add.container(0, 0));
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.75).setOrigin(0).setInteractive();
    this.menuPanel.add(shade);
    this.menuPanel.add(pixelText(this, cx, 18, 'EDITOR DE FASES', { size: 12, color: COLORS.yellow }).setOrigin(0.5));
    const items = [
      { label: 'Testar fase (T)', action: () => this.closeMenu(() => this.playTest()) },
      { label: `Salvar no slot ${this.slot + 1} (Ctrl+S)`, action: () => this.closeMenu(() => this.save()) },
      ...Array.from({ length: EDITOR_SLOTS }, (_, i) => ({
        label: `Abrir slot ${i + 1}: ${this.slots[i]?.name ?? 'vazio'}`,
        action: () => this.closeMenu(() => this.loadSlot(i)),
      })),
      { label: 'Nova fase', action: () => this.closeMenu(() => this.newLevel()) },
      { label: 'Renomear', action: () => this.closeMenu(() => this.rename()) },
      { label: `Tema: ${THEME_NAMES[this.level.theme]}`, action: () => this.closeMenu(() => this.cycleTheme()) },
      { label: 'Largura +10', action: () => this.closeMenu(() => this.resize(10)) },
      { label: 'Largura -10', action: () => this.closeMenu(() => this.resize(-10)) },
      { label: 'Exportar JSON', action: () => this.closeMenu(() => this.exportJson()) },
      { label: 'Importar JSON', action: () => this.closeMenu(() => this.importJson()) },
      { label: 'Desfazer (Ctrl+Z)', action: () => this.closeMenu(() => this.undo()) },
      { label: 'Voltar ao jogo', action: () => this.exit() },
    ];
    this.menuList = new MenuList(this, cx, 38, items, 15, 8);
    this.menuList.getTexts().forEach((t) => this.menuPanel?.add(t));
    this.menuPanel.add(this.menuList.getCursor());
  }

  private closeMenu(then?: () => void): void {
    // Espera um instante para o mesmo clique/tecla não desenhar no mapa.
    this.time.delayedCall(60, () => {
      this.menuList?.destroy();
      this.menuList = null;
      this.menuPanel?.destroy();
      this.menuPanel = null;
      then?.();
    });
  }

  private exit(): void {
    this.remember();
    this.scene.start('Menu');
  }
}
