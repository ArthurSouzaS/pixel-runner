import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS, hex } from '../gfx/palette';
import { GAME_WIDTH } from '../gfx/textures';
import { t } from '../i18n';
import {
  TOUCH_SCALE_STEP,
  TOUCH_TOP_LIMIT,
  type TouchButtonId,
  type TouchLayout,
  defaultTouchLayout,
  moveTouchButton,
  resizeTouchButton,
  touchRadius,
  visibleTouchIds,
} from '../logic/touchLayout';
import { saveManager } from '../systems/saveManager';
import { drawTouchButton } from '../ui/TouchControls';
import { pixelText } from '../ui/text';
import { createMenuBackdrop } from './menuBackdrop';

/**
 * Editor dos botões de toque: arraste para mudar o lugar, "−" e "+" para o tamanho.
 * Funciona também com mouse e teclado (Tab escolhe, setas movem, Q/E mudam o tamanho).
 */
export class TouchLayoutScene extends Phaser.Scene {
  private tick: () => void = () => {};
  private layout!: TouchLayout;
  private selected: TouchButtonId = 'jump';
  private gfx = new Map<TouchButtonId, Phaser.GameObjects.Container>();
  private ring!: Phaser.GameObjects.Arc;
  private sizeText!: Phaser.GameObjects.Text;
  private drag: { id: TouchButtonId; dx: number; dy: number } | null = null;
  /** Botões do modo atual (com joystick, ele entra no lugar de esquerda/direita). */
  private ids: TouchButtonId[] = [];

  constructor() {
    super('TouchLayout');
  }

  create(): void {
    this.tick = createMenuBackdrop(this, 1);
    this.layout = saveManager.get().access.touch;
    this.selected = 'jump';
    this.drag = null;
    this.gfx = new Map();
    this.ids = visibleTouchIds(saveManager.get().access.touchStick);

    // Barra do HUD (os botões não podem ficar em cima dela).
    this.add.rectangle(0, 0, GAME_WIDTH, TOUCH_TOP_LIMIT, COLORS.ink, 0.7).setOrigin(0);
    pixelText(this, GAME_WIDTH / 2, 6, t('touch.title'), { size: 8, color: COLORS.yellow }).setOrigin(0.5, 0);

    // Barra de ferramentas.
    const y = 38;
    const button = (x: number, label: string, onClick: () => void, color: number = COLORS.white) => {
      const txt = pixelText(this, x, y, label, { size: 8, color }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      txt.setPadding(4, 3, 4, 3).setBackgroundColor('#333c57');
      txt.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        onClick();
      });
      return txt;
    };
    button(26, '-', () => this.resize(-TOUCH_SCALE_STEP));
    this.sizeText = pixelText(this, 92, y, '', { size: 8 }).setOrigin(0.5);
    button(158, '+', () => this.resize(TOUCH_SCALE_STEP));
    button(244, t('touch.reset'), () => this.reset());
    button(330, t('touch.cancel'), () => this.leave(false), COLORS.gray);
    button(410, t('touch.done'), () => this.leave(true), COLORS.lightGreen);
    pixelText(this, GAME_WIDTH / 2, 60, t('touch.hint'), { size: 8, color: COLORS.cyan, align: 'center' }).setOrigin(0.5);
    pixelText(this, GAME_WIDTH / 2, 74, t('touch.keys'), { size: 8, color: COLORS.gray, align: 'center' }).setOrigin(0.5);

    this.ring = this.add.circle(0, 0, 10).setStrokeStyle(2, COLORS.yellow).setDepth(5);
    this.tweens.add({ targets: this.ring, alpha: 0.4, duration: 400, yoyo: true, repeat: -1 });
    for (const id of this.ids) this.redraw(id);
    this.refresh();

    // Arrastar com o dedo ou o mouse.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const hit = [...this.ids].reverse().find((id) => Phaser.Math.Distance.Between(p.x, p.y, this.layout[id].x, this.layout[id].y) <= touchRadius(id, this.layout) * 1.2);
      if (!hit) return;
      this.selected = hit;
      this.drag = { id: hit, dx: this.layout[hit].x - p.x, dy: this.layout[hit].y - p.y };
      sfx.play('select');
      this.refresh();
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag || !p.isDown) return;
      this.move(this.drag.id, p.x + this.drag.dx, p.y + this.drag.dy);
    });
    this.input.on('pointerup', () => (this.drag = null));

    const kb = this.input.keyboard;
    const nudge = (dx: number, dy: number) => () => this.move(this.selected, this.layout[this.selected].x + dx, this.layout[this.selected].y + dy);
    kb?.on('keydown-LEFT', nudge(-4, 0));
    kb?.on('keydown-RIGHT', nudge(4, 0));
    kb?.on('keydown-UP', nudge(0, -4));
    kb?.on('keydown-DOWN', nudge(0, 4));
    kb?.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      this.selected = this.ids[(this.ids.indexOf(this.selected) + 1) % this.ids.length];
      sfx.play('select');
      this.refresh();
    });
    kb?.on('keydown-Q', () => this.resize(-TOUCH_SCALE_STEP));
    kb?.on('keydown-E', () => this.resize(TOUCH_SCALE_STEP));
    kb?.on('keydown-R', () => this.reset());
    kb?.on('keydown-ENTER', () => this.leave(true));
    kb?.on('keydown-ESC', () => this.leave(false));
  }

  private redraw(id: TouchButtonId): void {
    this.gfx.get(id)?.destroy();
    const b = this.layout[id];
    const c = drawTouchButton(this, id, b.x, b.y, touchRadius(id, this.layout)).setDepth(4).setAlpha(0.9);
    this.gfx.set(id, c);
  }

  private move(id: TouchButtonId, x: number, y: number): void {
    this.layout = moveTouchButton(this.layout, id, x, y);
    this.gfx.get(id)?.setPosition(this.layout[id].x, this.layout[id].y);
    this.refresh();
  }

  private resize(delta: number): void {
    this.layout = resizeTouchButton(this.layout, this.selected, delta);
    this.redraw(this.selected);
    sfx.play('select');
    this.refresh();
  }

  private reset(): void {
    this.layout = defaultTouchLayout();
    for (const id of this.ids) this.redraw(id);
    sfx.play('confirm');
    this.refresh();
  }

  private refresh(): void {
    const b = this.layout[this.selected];
    this.ring.setPosition(b.x, b.y).setRadius(touchRadius(this.selected, this.layout) + 4);
    this.sizeText.setText(t('touch.size', { n: Math.round(b.scale * 100) }));
    for (const [id, c] of this.gfx) c.setAlpha(id === this.selected ? 1 : 0.7);
    this.sizeText.setColor(hex(COLORS.white));
  }

  private leave(save: boolean): void {
    if (save) {
      saveManager.setAccess({ touch: this.layout });
      sfx.play('confirm');
    }
    this.scene.start('Accessibility');
  }

  update(): void {
    this.tick();
  }
}
