import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, hex } from '../gfx/palette';
import { ensurePixSkin } from '../gfx/skins';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { LEVELS, LEVELS_PER_WORLD, WORLDS, worldOfLevel } from '../levels';
import { ABILITIES } from '../logic/abilities';
import { isLevelUnlocked } from '../logic/progress';
import { findSkin } from '../logic/shop';
import { formatScore, formatTime } from '../logic/score';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';

/** Posição de cada fase no mapa (pixels da tela). */
const NODES: { x: number; y: number }[] = [
  { x: 52, y: 196 },
  { x: 96, y: 160 },
  { x: 146, y: 186 },
  { x: 178, y: 138 },
  { x: 202, y: 90 },
  { x: 276, y: 92 },
  { x: 318, y: 132 },
  { x: 364, y: 104 },
  { x: 398, y: 152 },
  { x: 438, y: 96 },
];

/** Mapa de seleção de mundos e fases. */
export class WorldMapScene extends Phaser.Scene {
  private index = 0;
  private pix!: Phaser.GameObjects.Sprite;
  private nodes: Phaser.GameObjects.Container[] = [];
  private title!: Phaser.GameObjects.Text;
  private info!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private starting = false;

  constructor() {
    super('WorldMap');
  }

  create(): void {
    const save = saveManager.get();
    this.nodes = [];
    this.starting = false;
    this.index = Math.min(save.unlockedLevels - 1, LEVELS.length - 1);
    sfx.playMusic('worldmap');
    this.cameras.main.fadeIn(300, 26, 28, 44);

    this.drawSea();
    this.drawIslands();
    this.drawPaths(save.unlockedLevels);
    LEVELS.forEach((_, i) => this.nodes.push(this.drawNode(i)));

    const skin = findSkin(save.equippedSkin);
    const key = ensurePixSkin(this, skin.id, skin.colors);
    this.pix = this.add.sprite(NODES[this.index].x, NODES[this.index].y - 14, key, 0).setDepth(20);
    this.pix.play(`${key}-idle`);

    // Barra superior
    this.add.rectangle(0, 0, GAME_WIDTH, 20, COLORS.ink, 0.75).setOrigin(0).setDepth(30);
    pixelText(this, 8, 6, 'MAPA', { size: 8, color: COLORS.yellow }).setDepth(31);
    pixelText(this, GAME_WIDTH / 2, 6, `RECORDE ${formatScore(save.highScore)}`, { size: 8, color: COLORS.cyan }).setOrigin(0.5, 0).setDepth(31);
    this.add.image(GAME_WIDTH - 60, 10, 'coin', 0).setDepth(31);
    pixelText(this, GAME_WIDTH - 52, 6, String(save.wallet), { size: 8, color: COLORS.yellow }).setDepth(31);

    // Painel inferior
    this.add.rectangle(0, GAME_HEIGHT - 48, GAME_WIDTH, 48, COLORS.ink, 0.85).setOrigin(0).setDepth(30);
    this.title = pixelText(this, 10, GAME_HEIGHT - 42, '', { size: 8, color: COLORS.cyan }).setDepth(31);
    this.info = pixelText(this, 10, GAME_HEIGHT - 28, '', { size: 8 }).setDepth(31).setLineSpacing(4);
    this.hint = pixelText(this, GAME_WIDTH - 10, GAME_HEIGHT - 16, '', { size: 8, color: COLORS.lightGreen }).setOrigin(1, 0.5).setDepth(31);
    this.hint.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.play());
    pixelText(this, GAME_WIDTH - 10, GAME_HEIGHT - 38, 'Esc: menu', { size: 8, color: COLORS.gray })
      .setOrigin(1, 0.5)
      .setDepth(31)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.back());

    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => this.select(this.index - 1));
    kb?.on('keydown-A', () => this.select(this.index - 1));
    kb?.on('keydown-RIGHT', () => this.select(this.index + 1));
    kb?.on('keydown-D', () => this.select(this.index + 1));
    kb?.on('keydown-UP', () => this.switchWorld(1));
    kb?.on('keydown-W', () => this.switchWorld(1));
    kb?.on('keydown-DOWN', () => this.switchWorld(-1));
    kb?.on('keydown-S', () => this.switchWorld(-1));
    kb?.on('keydown-ENTER', () => this.play());
    kb?.on('keydown-SPACE', () => this.play());
    kb?.on('keydown-ESC', () => this.back());
    this.refresh(false);
  }

  // -------------------------------------------------------------------------
  // Desenho
  // -------------------------------------------------------------------------

  private drawSea(): void {
    const g = this.add.graphics();
    const bands = [0x29366f, 0x2e4588, 0x3b5dc9, 0x3b6bd4];
    bands.forEach((c, i) => {
      g.fillStyle(c);
      g.fillRect(0, (i * GAME_HEIGHT) / bands.length, GAME_WIDTH, GAME_HEIGHT / bands.length + 1);
    });
    // Ondinhas animadas
    for (let i = 0; i < 26; i++) {
      const wave = this.add.rectangle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(26, GAME_HEIGHT - 52), 6, 1, 0x73eff7, 0.6);
      this.tweens.add({ targets: wave, x: wave.x + 10, alpha: 0.1, duration: Phaser.Math.Between(1200, 2400), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private blob(g: Phaser.GameObjects.Graphics, cx: number, cy: number, rx: number, ry: number, color: number, seed: number): void {
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const wobble = 1 + 0.12 * Math.sin(a * 3 + seed) + 0.06 * Math.sin(a * 7 + seed * 2);
      points.push(new Phaser.Math.Vector2(Math.round(cx + Math.cos(a) * rx * wobble), Math.round(cy + Math.sin(a) * ry * wobble)));
    }
    g.fillStyle(color);
    g.fillPoints(points, true);
  }

  private drawIslands(): void {
    const g = this.add.graphics();
    // Mundo 1: ilha verde com praia
    this.blob(g, 128, 150, 112, 76, 0xffcd75, 1);
    this.blob(g, 128, 148, 100, 66, 0x38b764, 1);
    this.blob(g, 118, 160, 60, 34, 0xa7f070, 4);
    // Montanha e fortaleza do chefe
    g.fillStyle(0x566c86);
    g.fillTriangle(180, 112, 204, 62, 228, 112);
    g.fillStyle(0xf4f4f4);
    g.fillTriangle(198, 74, 204, 62, 210, 74);
    // Mundo 2: ilhas flutuantes de nuvem e gelo
    this.blob(g, 360, 124, 102, 70, 0xc4cfdb, 2);
    this.blob(g, 360, 120, 92, 60, 0xf4f4f4, 2);
    this.blob(g, 340, 132, 50, 26, 0x73eff7, 5);
    g.fillStyle(0x5d275d);
    g.fillTriangle(420, 104, 438, 58, 456, 104);
    pixelText(this, 70, 36, WORLDS[0].name, { size: 8, color: COLORS.white }).setOrigin(0.5);
    pixelText(this, 360, 196, WORLDS[1].name, { size: 8, color: COLORS.white }).setOrigin(0.5);
  }

  private drawPaths(unlocked: number): void {
    const g = this.add.graphics();
    for (let i = 0; i < NODES.length - 1; i++) {
      const a = NODES[i];
      const b = NODES[i + 1];
      const open = isLevelUnlocked(i + 1, unlocked);
      const steps = Math.ceil(Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) / 6);
      g.fillStyle(open ? 0xf4f4f4 : 0x333c57);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        g.fillRect(Math.round(a.x + (b.x - a.x) * t) - 1, Math.round(a.y + (b.y - a.y) * t) - 1, 2, 2);
      }
    }
  }

  private drawNode(i: number): Phaser.GameObjects.Container {
    const save = saveManager.get();
    const { x, y } = NODES[i];
    const unlocked = isLevelUnlocked(i, save.unlockedLevels);
    const cleared = save.bestTimes[i] !== undefined;
    const boss = !!LEVELS[i].boss;
    const c = this.add.container(x, y).setDepth(10);
    const fill = !unlocked ? COLORS.darkGray : cleared ? COLORS.green : COLORS.yellow;
    const r = boss ? 11 : 9;
    c.add(this.add.circle(0, 2, r, COLORS.ink));
    c.add(this.add.circle(0, 0, r, fill).setStrokeStyle(2, COLORS.ink));
    if (unlocked) c.add(pixelText(this, 0, 1, String(i + 1), { size: 8, color: COLORS.ink, strokeThickness: 0 }).setOrigin(0.5));
    else c.add(this.add.image(0, 0, 'lock'));
    if (cleared) c.add(this.add.image(r - 2, -r + 2, 'star'));
    if (boss && unlocked) c.add(this.add.image(0, -r - 10, LEVELS[i].boss === 'storm' ? 'storm' : 'boss', 0).setScale(0.4));
    c.setSize(r * 2 + 6, r * 2 + 6).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => {
      if (this.index === i) this.play();
      else this.select(i);
    });
    return c;
  }

  // -------------------------------------------------------------------------
  // Navegação
  // -------------------------------------------------------------------------

  private select(i: number): void {
    if (this.starting || i < 0 || i >= LEVELS.length || i === this.index) return;
    this.index = i;
    sfx.play('select');
    this.refresh(true);
  }

  private switchWorld(dir: number): void {
    const world = worldOfLevel(this.index);
    const target = WORLDS[Phaser.Math.Clamp(WORLDS.indexOf(world) + dir, 0, WORLDS.length - 1)];
    if (target === world) return;
    const unlocked = saveManager.get().unlockedLevels;
    // Vai para a última fase liberada daquele mundo (ou a primeira, se nenhuma).
    const last = Math.min(target.firstLevel + LEVELS_PER_WORLD - 1, Math.max(target.firstLevel, unlocked - 1));
    this.select(last);
  }

  private refresh(animate: boolean): void {
    const save = saveManager.get();
    const level = LEVELS[this.index];
    const world = worldOfLevel(this.index);
    const unlocked = isLevelUnlocked(this.index, save.unlockedLevels);
    const node = NODES[this.index];
    this.nodes.forEach((n, i) => n.setScale(i === this.index ? 1.2 : 1));
    if (animate) {
      this.tweens.killTweensOf(this.pix);
      this.pix.setFlipX(node.x < this.pix.x);
      this.tweens.add({ targets: this.pix, x: node.x, duration: 260, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.pix, y: node.y - 26, duration: 130, yoyo: true, ease: 'Quad.easeOut', onComplete: () => this.pix.setY(node.y - 14) });
    }
    this.pix.setAlpha(unlocked ? 1 : 0.4);

    this.title.setText(`MUNDO ${world.id} · ${world.name.toUpperCase()}`);
    if (!unlocked) {
      this.info.setText(`Fase ${level.id}: ${level.name}\nConclua a fase anterior para liberar.`).setColor(hex(COLORS.gray));
      this.hint.setText('BLOQUEADA').setColor(hex(COLORS.red));
      return;
    }
    const best = save.bestTimes[this.index];
    const extras = [best !== undefined ? `Melhor tempo ${formatTime(best)}` : 'Ainda não concluída'];
    if (level.ability) extras.push(`Orbe: ${ABILITIES[level.ability].name}`);
    if (level.boss) extras.push('Chefe!');
    this.info.setText(`Fase ${level.id}: ${level.name}\n${extras.join('  ·  ')}`).setColor(hex(COLORS.white));
    this.hint.setText('ENTER: JOGAR').setColor(hex(COLORS.lightGreen));
  }

  private play(): void {
    if (this.starting) return;
    if (!isLevelUnlocked(this.index, saveManager.get().unlockedLevels)) {
      sfx.play('hurt');
      this.cameras.main.shake(120, 0.005);
      return;
    }
    this.starting = true;
    sfx.unlock();
    sfx.play('confirm');
    this.cameras.main.fadeOut(300, 26, 28, 44);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Level', { levelIndex: this.index }));
  }

  private back(): void {
    sfx.play('select');
    this.scene.start('Menu');
  }
}
