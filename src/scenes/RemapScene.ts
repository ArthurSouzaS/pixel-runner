import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, hex } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import { gamepads } from '../input/gamepad';
import { ACTIONS, type Action, DEFAULT_KEYS, DEFAULT_PAD, type PadMap, assignKey, assignPadButton, keyLabel } from '../logic/accessibility';
import { saveManager } from '../systems/saveManager';
import { pixelText } from '../ui/text';

const PAD_ACTIONS: (keyof PadMap)[] = ['jump', 'dash', 'charge', 'pause'];
const PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Select', 'Start', 'L3', 'R3'];

/** Remapear teclas (modo de um jogador) e botões do gamepad. */
export class RemapScene extends Phaser.Scene {
  private index = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private waiting: { kind: 'key'; action: Action } | { kind: 'pad'; action: keyof PadMap } | null = null;
  private status!: Phaser.GameObjects.Text;
  private items: { label: () => string; activate: () => void }[] = [];

  constructor() {
    super('Remap');
  }

  create(): void {
    this.index = 0;
    this.waiting = null;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink).setOrigin(0);
    pixelText(this, GAME_WIDTH / 2, 16, t('remap.title'), { size: 14, color: COLORS.yellow }).setOrigin(0.5);
    const access = () => saveManager.get().access;
    this.items = [
      ...ACTIONS.map((action) => ({
        label: () => `${t(`remap.action.${action}`).padEnd(12, ' ')} ${access().keys[action].map(keyLabel).join(' / ')}`,
        activate: () => this.wait({ kind: 'key', action }),
      })),
      ...PAD_ACTIONS.map((action) => ({
        label: () => `${t('remap.pad')} ${t(`remap.action.${action}`).padEnd(8, ' ')} ${access().pad[action].map((b) => PAD_NAMES[b] ?? b).join(' / ')}`,
        activate: () => this.wait({ kind: 'pad', action }),
      })),
      {
        label: () => t('remap.reset'),
        activate: () => {
          saveManager.setAccess({ keys: structuredClone(DEFAULT_KEYS), pad: structuredClone(DEFAULT_PAD) });
          sfx.play('confirm');
        },
      },
      { label: () => t('common.back'), activate: () => this.leave() },
    ];
    this.texts = this.items.map((item, i) => {
      const txt = pixelText(this, 40, 38 + i * 17, '', { size: 8 }).setInteractive({ useHandCursor: true });
      txt.on('pointerdown', () => {
        this.index = i;
        item.activate();
        this.refresh();
      });
      return txt;
    });
    this.status = pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT - 16, '', { size: 8, color: COLORS.cyan, align: 'center' }).setOrigin(0.5);

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.waiting?.kind === 'key') {
        e.preventDefault();
        if (e.code !== 'Escape') saveManager.setAccess({ keys: assignKey(saveManager.get().access.keys, this.waiting.action, e.code) });
        this.stopWaiting();
        return;
      }
      if (this.waiting) {
        if (e.code === 'Escape') this.stopWaiting();
        return;
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.move(-1);
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.move(1);
      else if (e.code === 'Enter' || e.code === 'Space') this.items[this.index].activate();
      else if (e.code === 'Escape') this.leave();
      this.refresh();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => gamepads.capture(undefined));
    this.refresh();
  }

  private wait(w: NonNullable<RemapScene['waiting']>): void {
    // Espera um instante para a tecla/botão que abriu a espera não ser capturada.
    this.time.delayedCall(150, () => {
      this.waiting = w;
      if (w.kind === 'pad') {
        gamepads.capture((button) => {
          saveManager.setAccess({ pad: assignPadButton(saveManager.get().access.pad, w.action, button) });
          this.stopWaiting();
        });
      }
      this.refresh();
    });
  }

  private stopWaiting(): void {
    this.waiting = null;
    gamepads.capture(undefined);
    sfx.play('confirm');
    this.refresh();
  }

  private move(dir: number): void {
    this.index = Phaser.Math.Wrap(this.index + dir, 0, this.items.length);
    sfx.play('select');
  }

  private leave(): void {
    this.scene.start('Accessibility');
  }

  private refresh(): void {
    this.texts.forEach((txt, i) => txt.setText(`${i === this.index ? '>' : ' '} ${this.items[i].label()}`).setColor(hex(i === this.index ? COLORS.yellow : COLORS.white)));
    this.status.setText(this.waiting ? (this.waiting.kind === 'key' ? t('remap.pressKey') : t('remap.pressButton')) : t('remap.hint'));
  }
}
