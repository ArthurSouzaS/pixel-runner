import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, hex } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import { LEVELS } from '../levels';
import { availableCategories, categoryFor, sumOfBest } from '../logic/speedrun';
import { formatTimePrecise } from '../logic/score';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

const VISIBLE = 9;

/** Escolha da categoria de speedrun, com recordes e fantasma. */
export class SpeedrunScene extends Phaser.Scene {
  private tick: () => void = () => {};
  private categories: string[] = [];
  private index = 0;
  private rows: Phaser.GameObjects.Text[] = [];
  private ghostText!: Phaser.GameObjects.Text;
  private ghostOn = true;

  constructor() {
    super('Speedrun');
  }

  create(data: { result?: { category: string; total: number; isPb: boolean } } = {}): void {
    this.tick = createMenuBackdrop(this, 11);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.7).setOrigin(0);
    const cx = GAME_WIDTH / 2;
    pixelText(this, cx, 16, t('speedrun.title'), { size: 14, color: COLORS.yellow }).setOrigin(0.5);
    this.ghostOn = (this.registry.get('speedrun-ghost') as boolean | undefined) ?? true;
    this.categories = availableCategories(saveManager.get().unlockedLevels);
    this.index = data.result ? Math.max(0, this.categories.indexOf(data.result.category)) : 0;
    if (data.result) {
      const r = data.result;
      pixelText(this, cx, 34, `${r.isPb ? t('speedrun.newPb') : t('speedrun.finished')}  ${formatTimePrecise(r.total)}`, { size: 8, color: r.isPb ? COLORS.lightGreen : COLORS.white }).setOrigin(0.5);
    }
    pixelText(this, 20, 50, t('speedrun.category'), { size: 8, color: COLORS.cyan });
    pixelText(this, 300, 50, t('speedrun.pb'), { size: 8, color: COLORS.cyan });
    pixelText(this, 390, 50, t('speedrun.sob'), { size: 8, color: COLORS.cyan });
    this.rows = Array.from({ length: VISIBLE }, (_, i) => {
      const row = pixelText(this, 20, 66 + i * 16, '', { size: 8 }).setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => {
        const target = this.firstVisible() + i;
        if (target === this.index) this.start();
        else if (target < this.categories.length) {
          this.index = target;
          this.refresh();
        }
      });
      return row;
    });
    this.ghostText = pixelText(this, 20, GAME_HEIGHT - 44, '', { size: 8, color: COLORS.white }).setInteractive({ useHandCursor: true });
    this.ghostText.on('pointerdown', () => this.toggleGhost());
    pixelText(this, GAME_WIDTH - 20, GAME_HEIGHT - 28, t('speedrun.hint'), { size: 8, color: COLORS.gray }).setOrigin(1, 0);

    const kb = this.input.keyboard;
    kb?.on('keydown-UP', () => this.move(-1));
    kb?.on('keydown-W', () => this.move(-1));
    kb?.on('keydown-DOWN', () => this.move(1));
    kb?.on('keydown-S', () => this.move(1));
    kb?.on('keydown-ENTER', () => this.start());
    kb?.on('keydown-SPACE', () => this.start());
    kb?.on('keydown-G', () => this.toggleGhost());
    kb?.on('keydown-ESC', () => this.scene.start('Modes'));
    this.refresh();
  }

  private label(id: string): string {
    const cat = categoryFor(id)!;
    if (id === 'all') return t('speedrun.cat.all');
    if (id.startsWith('world-')) return t('speedrun.cat.world', { n: id.slice(6) });
    const level = LEVELS[cat.levels[0]];
    return `${level.id}. ${level.name}`;
  }

  private firstVisible(): number {
    return Phaser.Math.Clamp(this.index - Math.floor(VISIBLE / 2), 0, Math.max(0, this.categories.length - VISIBLE));
  }

  private move(dir: number): void {
    if (this.categories.length === 0) return;
    this.index = Phaser.Math.Wrap(this.index + dir, 0, this.categories.length);
    sfx.play('select');
    this.refresh();
  }

  private toggleGhost(): void {
    this.ghostOn = !this.ghostOn;
    this.registry.set('speedrun-ghost', this.ghostOn);
    sfx.play('select');
    this.refresh();
  }

  private refresh(): void {
    const records = saveManager.get().speedrun;
    const first = this.firstVisible();
    this.rows.forEach((row, i) => {
      const id = this.categories[first + i];
      if (!id) {
        row.setText('');
        return;
      }
      const best = records[id];
      const count = categoryFor(id)!.levels.length;
      const sob = best ? sumOfBest(best, count) : null;
      const pb = best?.pb ? formatTimePrecise(best.pb) : '--';
      const selected = first + i === this.index;
      row
        .setText(`${selected ? '>' : ' '} ${this.label(id).slice(0, 30).padEnd(31, ' ')}  ${pb.padEnd(10, ' ')}  ${sob !== null ? formatTimePrecise(sob) : '--'}`)
        .setColor(hex(selected ? COLORS.yellow : COLORS.white));
    });
    this.ghostText.setText(t('speedrun.ghost', { state: this.ghostOn ? t('common.on') : t('common.off') }));
  }

  private start(): void {
    const id = this.categories[this.index];
    if (!id) return;
    sfx.unlock();
    sfx.play('confirm');
    const cat = categoryFor(id)!;
    this.scene.start('Level', { levelIndex: cat.levels[0], mode: 'single', speedrun: { category: id, position: 0, segments: [], ghost: this.ghostOn } });
  }

  update(): void {
    this.tick();
  }
}
