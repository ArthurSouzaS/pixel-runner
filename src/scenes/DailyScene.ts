import Phaser from 'phaser';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import { dailySeed, todayString } from '../logic/daily';
import { createRun, formatTimePrecise } from '../logic/score';
import { saveManager } from '../systems/saveManager';
import { MenuList } from '../ui/MenuList';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

export interface DailySceneData {
  result?: { cleared: boolean; time: number; rank: number };
}

/** Desafio diário: a fase do dia, o placar local do dia e o histórico. */
export class DailyScene extends Phaser.Scene {
  private tick: () => void = () => {};

  constructor() {
    super('Daily');
  }

  create(data: DailySceneData = {}): void {
    const date = todayString();
    const state = saveManager.dailyToday(date);
    this.tick = createMenuBackdrop(this, 7);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.65).setOrigin(0);
    const cx = GAME_WIDTH / 2;
    pixelText(this, cx, 18, t('daily.heading'), { size: 14, color: COLORS.yellow }).setOrigin(0.5);
    pixelText(this, cx, 36, t('daily.info', { date, seed: dailySeed(date), attempts: state.attempts }), { size: 8, color: COLORS.cyan }).setOrigin(0.5);

    if (data.result) {
      const r = data.result;
      const msg = r.cleared ? t('daily.yourTime', { time: formatTimePrecise(r.time) }) + (r.rank >= 0 ? `  ${t('daily.rank', { n: r.rank + 1 })}` : '') : t('daily.failed');
      pixelText(this, cx, 52, msg, { size: 8, color: r.cleared ? COLORS.lightGreen : COLORS.red }).setOrigin(0.5);
    }

    // Placar do dia
    pixelText(this, 30, 66, t('daily.board'), { size: 8, color: COLORS.yellow });
    if (state.entries.length === 0) pixelText(this, 30, 82, t('daily.noEntries'), { size: 8, color: COLORS.gray });
    state.entries.forEach((e, i) => {
      const highlight = data.result?.rank === i;
      pixelText(this, 30, 80 + i * 13, `${String(i + 1).padStart(2, ' ')}. ${e.name.padEnd(8, ' ')} ${formatTimePrecise(e.time)}  ${e.coins}c`, {
        size: 8,
        color: highlight ? COLORS.lightGreen : COLORS.white,
      });
    });
    // Histórico
    pixelText(this, 300, 66, t('daily.history'), { size: 8, color: COLORS.yellow });
    if (state.history.length === 0) pixelText(this, 300, 82, '-', { size: 8, color: COLORS.gray });
    state.history.forEach((h, i) => pixelText(this, 300, 80 + i * 13, `${h.date.slice(5)}  ${formatTimePrecise(h.time)}`, { size: 8, color: COLORS.gray }));

    new MenuList(this, 380, 200, [
      { label: t('daily.play'), action: () => this.scene.start('Level', { levelIndex: 0, run: createRun(0), infinite: { seed: dailySeed(date), room: 0, powerup: null, daily: date } }) },
      {
        label: () => t('daily.name', { name: saveManager.get().playerName }),
        action: () => {
          const name = window.prompt(t('daily.namePrompt'), saveManager.get().playerName);
          if (name) saveManager.setPlayerName(name);
        },
      },
      { label: t('common.back'), action: () => this.scene.start('Modes') },
    ], 18, 8);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Modes'));
  }

  update(): void {
    this.tick();
  }
}
