import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { onTouchModeChange, touchState, usingTouch } from '../input/touchState';
import { type TouchButtonId, type TouchLayout, touchRadius } from '../logic/touchLayout';
import { saveManager } from '../systems/saveManager';
import { pixelText } from './text';

export type { TouchButtonId } from '../logic/touchLayout';

interface TouchButton {
  id: TouchButtonId;
  x: number;
  y: number;
  r: number;
  gfx: Phaser.GameObjects.Container;
  pressed: boolean;
}

/** Desenho de um botão virtual (usado no jogo e no editor de layout). */
export function drawTouchButton(scene: Phaser.Scene, id: TouchButtonId, x: number, y: number, r: number, label?: string): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  c.add(scene.add.circle(0, 0, r, COLORS.white, 0.18).setStrokeStyle(2, COLORS.white, 0.5));
  const text = label ?? (id === 'jump' ? 'A' : id === 'dash' ? 'B' : id === 'charge' ? 'C' : null);
  const k = r / 24;
  if (text) c.add(pixelText(scene, 0, 1, text, { size: 12 }).setOrigin(0.5).setAlpha(0.85).setScale(Math.max(0.75, k)));
  else c.add(scene.add.image(0, 0, 'button-arrow').setScale(1.6 * k).setRotation(id === 'left' ? -Math.PI / 2 : Math.PI / 2).setAlpha(0.85));
  return c;
}

/**
 * Botões virtuais na tela (celular/tablet). Lê todos os dedos a cada quadro,
 * o que permite deslizar o dedo entre os botões. Só aparecem (e só respondem)
 * no modo de toque: somem ao usar teclado/gamepad e voltam ao tocar na tela.
 * Posição e tamanho vêm das opções (Acessibilidade → Botões na tela).
 */
export class TouchControls {
  private buttons: TouchButton[] = [];
  private shown = usingTouch();
  private layout: TouchLayout = saveManager.get().access.touch;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly labels: { dash?: string } = {},
  ) {
    scene.input.addPointer(3);
    for (const id of ['left', 'right', 'dash', 'jump'] as const) this.add(id);
    const offMode = onTouchModeChange((active) => this.show(active));
    // Se o layout mudar (editor), redesenha com as novas posições.
    const offAccess = saveManager.onAccessChange((a) => {
      if (a.touch === this.layout) return;
      this.layout = a.touch;
      const ids = this.buttons.map((b) => b.id);
      this.buttons.forEach((b) => b.gfx.destroy());
      this.buttons = [];
      ids.forEach((id) => this.add(id));
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offMode();
      offAccess();
    });
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

  /** Adiciona um botão na posição salva (a investida entra quando a habilidade é conquistada). */
  add(id: TouchButtonId): void {
    if (this.has(id)) return;
    const { x, y } = this.layout[id];
    const r = touchRadius(id, this.layout);
    const label = id === 'dash' ? this.labels.dash : undefined;
    const c = drawTouchButton(this.scene, id, x, y, r, label).setScrollFactor(0).setDepth(150).setVisible(this.shown).setAlpha(0.75);
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
