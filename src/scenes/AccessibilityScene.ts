import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, hex } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import { COLORBLIND_MODES } from '../logic/accessibility';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

interface Row {
  label: () => string;
  change: (dir: 1 | -1) => void;
}

/** Acessibilidade: daltonismo, tremida, flashes, velocidade, tamanho do texto e remapear controles. */
export class AccessibilityScene extends Phaser.Scene {
  private tick: () => void = () => {};
  private rows: Row[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private index = 0;
  private preview!: Phaser.GameObjects.Text;

  constructor() {
    super('Accessibility');
  }

  create(): void {
    this.tick = createMenuBackdrop(this, 0);
    this.index = 0;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.65).setOrigin(0);
    pixelText(this, GAME_WIDTH / 2, 20, t('access.title'), { size: 14, color: COLORS.yellow }).setOrigin(0.5);
    const a = () => saveManager.get().access;
    const onOff = (v: boolean) => (v ? t('common.on') : t('common.off'));
    this.rows = [
      {
        label: () => t('access.colorblind', { mode: t(`access.cb.${a().colorblind}`) }),
        change: (dir) => {
          const i = COLORBLIND_MODES.indexOf(a().colorblind);
          saveManager.setAccess({ colorblind: COLORBLIND_MODES[Phaser.Math.Wrap(i + dir, 0, COLORBLIND_MODES.length)] });
        },
      },
      { label: () => t('access.shake', { state: onOff(a().shake) }), change: () => saveManager.setAccess({ shake: !a().shake }) },
      { label: () => t('access.flash', { state: onOff(a().flash) }), change: () => saveManager.setAccess({ flash: !a().flash }) },
      { label: () => t('access.speed', { n: Math.round(a().speed * 100) }), change: () => saveManager.setAccess({ speed: a().speed === 1 ? 0.75 : 1 }) },
      { label: () => t('access.text', { size: a().textScale > 1 ? t('access.large') : t('access.normal') }), change: () => saveManager.setAccess({ textScale: a().textScale > 1 ? 1 : 1.25 }) },
      { label: () => t('access.remap'), change: () => this.scene.start('Remap') },
      { label: () => t('common.back'), change: () => this.scene.start('Options') },
    ];
    this.texts = this.rows.map((row, i) => {
      const txt = pixelText(this, GAME_WIDTH / 2, 50 + i * 22, '', { size: 10 }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      txt.on('pointerdown', (p: Phaser.Input.Pointer) => {
        this.index = i;
        row.change(p.x < txt.x ? -1 : 1);
        this.refresh();
      });
      return txt;
    });
    // Amostra de cores para conferir o filtro de daltonismo.
    const swatch = [0xb13e53, 0xef7d57, 0xffcd75, 0x38b764, 0x41a6f6, 0x5d275d];
    swatch.forEach((c, i) => this.add.rectangle(GAME_WIDTH / 2 - 75 + i * 30, 214, 24, 12, c).setStrokeStyle(1, COLORS.white));
    this.preview = pixelText(this, GAME_WIDTH / 2, 232, '', { size: 8, color: COLORS.gray, scalable: true, align: 'center' }).setOrigin(0.5);
    pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT - 10, t('access.hint'), { size: 8, color: COLORS.gray }).setOrigin(0.5);

    const kb = this.input.keyboard;
    kb?.on('keydown-UP', () => this.move(-1));
    kb?.on('keydown-DOWN', () => this.move(1));
    kb?.on('keydown-W', () => this.move(-1));
    kb?.on('keydown-S', () => this.move(1));
    kb?.on('keydown-LEFT', () => this.change(-1));
    kb?.on('keydown-RIGHT', () => this.change(1));
    kb?.on('keydown-ENTER', () => this.change(1));
    kb?.on('keydown-SPACE', () => this.change(1));
    kb?.on('keydown-ESC', () => this.scene.start('Options'));
    this.refresh();
  }

  private move(dir: number): void {
    this.index = Phaser.Math.Wrap(this.index + dir, 0, this.rows.length);
    sfx.play('select');
    this.refresh();
  }

  private change(dir: 1 | -1): void {
    sfx.play('confirm');
    this.rows[this.index].change(dir);
    if (this.scene.isActive()) this.refresh();
  }

  private refresh(): void {
    this.texts.forEach((txt, i) => txt.setText(this.rows[i].label()).setColor(hex(i === this.index ? COLORS.yellow : COLORS.white)));
    this.preview.setText(t('access.preview'));
  }

  update(): void {
    this.tick();
  }
}
