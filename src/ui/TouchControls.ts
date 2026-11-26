import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../gfx/textures';
import { onTouchModeChange, touchState, usingTouch } from '../input/touchState';
import { pixelText } from './text';

export type TouchButtonId = 'left' | 'right' | 'jump' | 'dash' | 'charge';

interface TouchButton {
  id: TouchButtonId;
  x: number;
  y: number;
  r: number;
  gfx: Phaser.GameObjects.Container;
  pressed: boolean;
}

/**
 * Botões virtuais na tela (celular/tablet). Lê todos os dedos a cada quadro,
 * o que permite deslizar o dedo entre os botões. Só aparecem (e só respondem)
 * no modo de toque: somem ao usar teclado/gamepad e voltam ao tocar na tela.
 */
export class TouchControls {
  private buttons: TouchButton[] = [];
  private shown = usingTouch();

  constructor(
    private readonly scene: Phaser.Scene,
    labels: { dash?: string } = {},
  ) {
    scene.input.addPointer(3);
    const by = GAME_HEIGHT - 36;
    this.add('left', 38, by, 24, null, -Math.PI / 2);
    this.add('right', 100, by, 24, null, Math.PI / 2);
    this.add('dash', GAME_WIDTH - 100, by + 6, 22, labels.dash ?? 'B');
    this.add('jump', GAME_WIDTH - 40, by - 12, 26, 'A');
    const off = onTouchModeChange((active) => this.show(active));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  private show(active: boolean): void {
    this.shown = active;
    this.setVisible(active);
    if (!active) this.release();
  }

  /** Solta todos os botões (ao esconder, para nada ficar "preso" apertado). */
  private release(): void {
    for (const button of this.buttons) {
      button.pressed = false;
      touchState[button.id] = false;
      button.gfx.setScale(1).setAlpha(0.75);
    }
  }

  add(id: TouchButtonId, x: number, y: number, r: number, label: string | null, rotation = 0): void {
    const c = this.scene.add.container(x, y).setScrollFactor(0).setDepth(150);
    c.add(this.scene.add.circle(0, 0, r, COLORS.white, 0.18).setStrokeStyle(2, COLORS.white, 0.5));
    if (label) c.add(pixelText(this.scene, 0, 1, label, { size: 12 }).setOrigin(0.5).setAlpha(0.85));
    else c.add(this.scene.add.image(0, 0, 'button-arrow').setScale(1.6).setRotation(rotation).setAlpha(0.85));
    c.setVisible(this.shown);
    this.buttons.push({ id, x, y, r, gfx: c, pressed: false });
  }

  has(id: TouchButtonId): boolean {
    return this.buttons.some((b) => b.id === id);
  }

  setVisible(visible: boolean): void {
    this.buttons.forEach((b) => b.gfx.setVisible(visible));
  }

  update(): void {
    if (!this.shown) return;
    // Só dedos: um clique de mouse nessa região não aperta os botões virtuais.
    const pointers = this.scene.input.manager.pointers.filter((p) => p.isDown && p.wasTouch);
    for (const button of this.buttons) {
      const pressed = pointers.some((p) => Phaser.Math.Distance.Between(p.x, p.y, button.x, button.y) < button.r * 1.35);
      if (pressed && !button.pressed) {
        sfx.unlock();
        if (button.id === 'jump') touchState.jumpQueued = true;
        if (button.id === 'dash') touchState.dashQueued = true;
      }
      button.pressed = pressed;
      touchState[button.id] = pressed;
      button.gfx.setScale(pressed ? 0.9 : 1).setAlpha(pressed ? 1 : 0.75);
    }
  }
}
