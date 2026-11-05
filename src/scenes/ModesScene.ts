import Phaser from 'phaser';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import { MenuList } from '../ui/MenuList';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

/** Modos de jogo além da campanha. */
export class ModesScene extends Phaser.Scene {
  private tick: () => void = () => {};

  constructor() {
    super('Modes');
  }

  create(): void {
    this.tick = createMenuBackdrop(this, 6);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.5).setOrigin(0);
    const cx = GAME_WIDTH / 2;
    pixelText(this, cx, 30, t('modes.title'), { size: 16, color: COLORS.yellow }).setOrigin(0.5);
    const desc = pixelText(this, cx, GAME_HEIGHT - 30, '', { size: 8, color: COLORS.cyan, align: 'center', wrap: 440 }).setOrigin(0.5);
    const items: { key: string; scene: string }[] = [
      { key: 'infinite', scene: 'Infinite' },
      { key: 'daily', scene: 'Daily' },
      { key: 'speedrun', scene: 'Speedrun' },
      { key: 'twoPlayers', scene: 'TwoPlayer' },
      { key: 'editor', scene: 'Editor' },
    ];
    const list = new MenuList(this, cx, 80, [
      ...items.map((it) => ({ label: t(`modes.${it.key}`), action: () => this.scene.start(it.scene) })),
      { label: t('common.back'), action: () => this.scene.start('Menu') },
    ], 22, 10);
    const texts = list.getTexts();
    texts.forEach((txt, i) => txt.on('pointerover', () => desc.setText(items[i] ? t(`modes.${items[i].key}.desc`) : '')));
    this.input.keyboard?.on('keydown', () => {
      const idx = texts.findIndex((tx) => tx.style.color === '#ffcd75');
      desc.setText(items[idx] ? t(`modes.${items[idx].key}.desc`) : '');
    });
    desc.setText(t('modes.infinite.desc'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Menu'));
  }

  update(): void {
    this.tick();
  }
}
