import Phaser from 'phaser';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import { normalizeSeed, randomSeed } from '../logic/procgen';
import { createRun, formatScore } from '../logic/score';
import { saveManager } from '../systems/saveManager';
import { MenuList } from '../ui/MenuList';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

/** Menu do modo Infinito: nova corrida com seed aleatória ou digitada, e o placar. */
export class InfiniteScene extends Phaser.Scene {
  private tick: () => void = () => {};

  constructor() {
    super('Infinite');
  }

  create(): void {
    this.tick = createMenuBackdrop(this, 12);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.6).setOrigin(0);
    const cx = GAME_WIDTH / 2;
    pixelText(this, cx, 22, t('infinite.title'), { size: 16, color: COLORS.yellow }).setOrigin(0.5);
    pixelText(this, cx, 44, t('infinite.about'), { size: 8, color: COLORS.cyan, align: 'center', wrap: 440 }).setOrigin(0.5);

    const start = (seed: string): void => {
      this.scene.start('Level', { levelIndex: 0, run: createRun(0), infinite: { seed, room: 0, powerup: null } });
    };
    new MenuList(this, cx, 80, [
      { label: t('infinite.new'), action: () => start(randomSeed()) },
      {
        label: t('infinite.useSeed'),
        action: () => {
          const typed = window.prompt(t('infinite.prompt'), '');
          const seed = typed ? normalizeSeed(typed) : null;
          if (seed) start(seed);
        },
      },
      { label: t('common.back'), action: () => this.scene.start('Modes') },
    ]);

    pixelText(this, cx, 148, t('infinite.best'), { size: 8, color: COLORS.yellow }).setOrigin(0.5);
    const board = saveManager.get().infinite;
    if (board.length === 0) pixelText(this, cx, 172, t('infinite.empty'), { size: 8, color: COLORS.gray }).setOrigin(0.5);
    board.forEach((e, i) => {
      pixelText(this, cx, 166 + i * 16, `${i + 1}. ${t('infinite.rooms', { n: e.rooms })}  ${formatScore(e.score)}  ${e.seed}  ${e.date}`, { size: 8 }).setOrigin(0.5);
    });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Modes'));
  }

  update(): void {
    this.tick();
  }
}
