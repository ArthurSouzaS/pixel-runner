import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, hex } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { ACHIEVEMENTS, achievementProgress } from '../logic/achievements';
import { STAT_LABELS, formatStat } from '../logic/stats';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

const COLS = 2;
const ROW_H = 15;

/** Conquistas (com descrição) e estatísticas do jogador, em duas abas. */
export class AchievementsScene extends Phaser.Scene {
  private tick: () => void = () => {};
  private tab: 'achievements' | 'stats' = 'achievements';
  private index = 0;
  private content!: Phaser.GameObjects.Container;
  private desc!: Phaser.GameObjects.Text;
  private tabs: Phaser.GameObjects.Text[] = [];
  private cells: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Achievements');
  }

  create(): void {
    saveManager.flush();
    this.tick = createMenuBackdrop(this, 4);
    this.tabs = [];
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.72).setOrigin(0);
    ['CONQUISTAS', 'ESTATÍSTICAS'].forEach((label, i) => {
      const t = pixelText(this, 20 + i * 130, 10, label, { size: 10 }).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this.setTab(i === 0 ? 'achievements' : 'stats'));
      this.tabs.push(t);
    });
    pixelText(this, GAME_WIDTH - 12, 12, '< VOLTAR', { size: 8, color: COLORS.gray })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Menu'));
    this.content = this.add.container(0, 0);
    this.desc = pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT - 18, '', { size: 8, color: COLORS.cyan, align: 'center' }).setOrigin(0.5);

    const kb = this.input.keyboard;
    kb?.on('keydown-LEFT', () => this.move(-1));
    kb?.on('keydown-RIGHT', () => this.move(1));
    kb?.on('keydown-UP', () => this.move(-COLS));
    kb?.on('keydown-DOWN', () => this.move(COLS));
    kb?.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      this.setTab(this.tab === 'achievements' ? 'stats' : 'achievements');
    });
    kb?.on('keydown-Q', () => this.setTab('achievements'));
    kb?.on('keydown-E', () => this.setTab('stats'));
    kb?.on('keydown-ESC', () => this.scene.start('Menu'));
    kb?.on('keydown-ENTER', () => this.setTab(this.tab === 'achievements' ? 'stats' : 'achievements'));
    this.setTab('achievements');
  }

  private setTab(tab: 'achievements' | 'stats'): void {
    if (tab !== this.tab) sfx.play('select');
    this.tab = tab;
    this.index = 0;
    this.content.removeAll(true);
    this.cells = [];
    this.tabs.forEach((t, i) => t.setColor(hex((i === 0) === (tab === 'achievements') ? COLORS.yellow : COLORS.gray)));
    const save = saveManager.get();

    if (tab === 'achievements') {
      const { done, total } = achievementProgress(save.achievements);
      this.content.add(pixelText(this, GAME_WIDTH / 2, 30, `${done}/${total} desbloqueadas`, { size: 8, color: COLORS.lightGreen }).setOrigin(0.5, 0));
      ACHIEVEMENTS.forEach((a, i) => {
        const unlocked = save.achievements.includes(a.id);
        const x = 30 + (i % COLS) * 226;
        const y = 46 + Math.floor(i / COLS) * ROW_H;
        this.content.add(this.add.image(x, y + 4, unlocked ? 'star' : 'lock').setScale(unlocked ? 1.4 : 0.8));
        const cell = pixelText(this, x + 12, y, unlocked ? a.name : '???', { size: 8, color: unlocked ? COLORS.white : COLORS.gray }).setInteractive({ useHandCursor: true });
        cell.on('pointerdown', () => {
          this.index = i;
          this.refresh();
        });
        this.cells.push(cell);
        this.content.add(cell);
      });
    } else {
      this.content.add(pixelText(this, GAME_WIDTH / 2, 30, `Recorde: ${save.highScore}   Carteira: ${save.wallet} moedas`, { size: 8, color: COLORS.lightGreen }).setOrigin(0.5, 0));
      STAT_LABELS.forEach(([key, label], i) => {
        const x = 24 + (i % COLS) * 228;
        const y = 50 + Math.floor(i / COLS) * ROW_H;
        this.content.add(pixelText(this, x, y, label, { size: 8, color: COLORS.gray }));
        this.content.add(pixelText(this, x + 214, y, formatStat(key, save.stats[key]), { size: 8, color: COLORS.white }).setOrigin(1, 0));
      });
    }
    this.refresh();
  }

  private move(dir: number): void {
    if (this.tab !== 'achievements') return;
    this.index = Phaser.Math.Clamp(this.index + dir, 0, ACHIEVEMENTS.length - 1);
    sfx.play('select');
    this.refresh();
  }

  private refresh(): void {
    if (this.tab !== 'achievements') {
      this.desc.setText('Tab/Q/E: trocar aba   Esc: voltar');
      return;
    }
    const save = saveManager.get();
    this.cells.forEach((c, i) => c.setColor(hex(i === this.index ? COLORS.yellow : save.achievements.includes(ACHIEVEMENTS[i].id) ? COLORS.white : COLORS.gray)));
    const a = ACHIEVEMENTS[this.index];
    this.desc.setText(`${a.name}: ${a.description}`);
  }

  update(): void {
    this.tick();
  }
}
