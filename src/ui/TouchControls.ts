import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { COLORS } from '../gfx/palette';
import { type TouchState, onTouchModeChange, touchStates, usingTouch } from '../input/touchState';
import {
  type TouchButtonId,
  type TouchCircle,
  type TouchLayout,
  stickInput,
  touchRadius,
  twoPlayerTouchLayout,
  visibleTouchIds,
} from '../logic/touchLayout';
import { saveManager } from '../systems/saveManager';
import { pixelText } from './text';

export type { TouchButtonId } from '../logic/touchLayout';

type ActionId = 'left' | 'right' | 'jump' | 'dash' | 'charge';

interface TouchButton {
  id: ActionId;
  state: TouchState;
  x: number;
  y: number;
  r: number;
  gfx: Phaser.GameObjects.Container;
  pressed: boolean;
}

interface TouchStick {
  state: TouchState;
  x: number;
  y: number;
  r: number;
  base: Phaser.GameObjects.Container;
  knob: Phaser.GameObjects.Arc;
  /** Dedo que começou no joystick (fica preso a ele até soltar). */
  pointerId: number | null;
}

/** Desenho de um botão virtual (usado no jogo e no editor de layout). */
export function drawTouchButton(scene: Phaser.Scene, id: TouchButtonId, x: number, y: number, r: number, label?: string, tint: number = COLORS.white): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  if (id === 'stick') {
    c.add(scene.add.circle(0, 0, r, tint, 0.12).setStrokeStyle(2, tint, 0.5));
    c.add(scene.add.circle(0, 0, r * 0.45, tint, 0.35).setStrokeStyle(2, tint, 0.7));
    return c;
  }
  c.add(scene.add.circle(0, 0, r, COLORS.white, 0.18).setStrokeStyle(2, tint, 0.5));
  const text = label ?? (id === 'jump' ? 'A' : id === 'dash' ? 'B' : id === 'charge' ? 'C' : null);
  const k = r / 24;
  if (text) c.add(pixelText(scene, 0, 1, text, { size: 12 }).setOrigin(0.5).setAlpha(0.85).setScale(Math.max(0.7, k)));
  else c.add(scene.add.image(0, 0, 'button-arrow').setScale(1.6 * k).setRotation(id === 'left' ? -Math.PI / 2 : Math.PI / 2).setAlpha(0.85));
  return c;
}

/**
 * Botões virtuais na tela (celular/tablet). Lê todos os dedos a cada quadro,
 * o que permite deslizar o dedo entre os botões. Só aparecem (e só respondem)
 * no modo de toque: somem ao usar teclado/gamepad e voltam ao tocar na tela.
 * Um jogador: posição e tamanho vêm das opções, com botões ou joystick.
 * Dois jogadores: cada um tem joystick e botões no seu lado da tela.
 */
export class TouchControls {
  private buttons: TouchButton[] = [];
  private sticks: TouchStick[] = [];
  private objects: Phaser.GameObjects.GameObject[] = [];
  private shown = usingTouch();
  private layout: TouchLayout = saveManager.get().access.touch;
  private stickMode = saveManager.get().access.touchStick;
  private hasCharge = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly labels: { dash?: string } = {},
    private readonly players: 1 | 2 = 1,
  ) {
    scene.input.addPointer(players === 2 ? 5 : 3);
    this.build();
    const offMode = onTouchModeChange((active) => this.show(active));
    // Se o layout ou o modo (botões/joystick) mudar, redesenha.
    const offAccess = saveManager.onAccessChange((a) => {
      if (a.touch === this.layout && a.touchStick === this.stickMode) return;
      this.layout = a.touch;
      this.stickMode = a.touchStick;
      this.build();
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offMode();
      offAccess();
    });
  }

  private build(): void {
    this.release();
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
    this.buttons = [];
    this.sticks = [];
    if (this.players === 2) {
      // Cores das etiquetas P1 (verde) e P2 (azul).
      for (const cluster of twoPlayerTouchLayout()) {
        const state = touchStates[cluster.player];
        const tint = cluster.player === 0 ? COLORS.lightGreen : COLORS.cyan;
        this.addStick(state, cluster.stick, tint);
        this.addButton('jump', state, cluster.jump, tint);
        this.addButton('dash', state, cluster.dash, tint);
        if (this.hasCharge) this.addButton('charge', state, cluster.charge, tint);
        const tag = pixelText(this.scene, cluster.stick.x, cluster.stick.y - cluster.stick.r - 8, `P${cluster.player + 1}`, { size: 8, color: tint });
        this.objects.push(tag.setOrigin(0.5).setScrollFactor(0).setDepth(150).setVisible(this.shown).setAlpha(0.8));
      }
      return;
    }
    const state = touchStates[0];
    for (const id of visibleTouchIds(this.stickMode)) {
      if (id === 'charge' && !this.hasCharge) continue;
      const circle = { x: this.layout[id].x, y: this.layout[id].y, r: touchRadius(id, this.layout) };
      if (id === 'stick') this.addStick(state, circle, COLORS.white);
      else this.addButton(id, state, circle, COLORS.white, id === 'dash' ? this.labels.dash : undefined);
    }
  }

  private addButton(id: ActionId, state: TouchState, c: TouchCircle, tint: number, label?: string): void {
    const gfx = drawTouchButton(this.scene, id, c.x, c.y, c.r, label, tint).setScrollFactor(0).setDepth(150).setVisible(this.shown).setAlpha(0.75);
    this.objects.push(gfx);
    this.buttons.push({ id, state, x: c.x, y: c.y, r: c.r, gfx, pressed: false });
  }

  private addStick(state: TouchState, c: TouchCircle, tint: number): void {
    const base = this.scene.add.container(c.x, c.y).setScrollFactor(0).setDepth(150).setVisible(this.shown);
    base.add(this.scene.add.circle(0, 0, c.r, tint, 0.12).setStrokeStyle(2, tint, 0.5));
    const knob = this.scene.add.circle(0, 0, c.r * 0.45, tint, 0.35).setStrokeStyle(2, tint, 0.7);
    base.add(knob);
    this.objects.push(base);
    this.sticks.push({ state, x: c.x, y: c.y, r: c.r, base, knob, pointerId: null });
  }

  private show(active: boolean): void {
    this.shown = active;
    this.setVisible(active);
    if (!active) this.release();
  }

  /** Solta tudo (ao esconder, para nada ficar "preso" apertado). */
  private release(): void {
    for (const b of this.buttons) {
      b.pressed = false;
      b.state[b.id] = false;
      b.gfx.setScale(1).setAlpha(0.75);
    }
    for (const s of this.sticks) {
      s.pointerId = null;
      s.state.left = s.state.right = false;
      s.knob.setPosition(0, 0);
    }
  }

  /** Adiciona um botão (a investida entra quando a habilidade é conquistada). */
  add(id: TouchButtonId): void {
    if (id !== 'charge' || this.hasCharge) return;
    this.hasCharge = true;
    this.build();
  }

  has(id: TouchButtonId): boolean {
    return id === 'charge' ? this.hasCharge : this.buttons.some((b) => b.id === id) || (id === 'stick' && this.sticks.length > 0);
  }

  setVisible(visible: boolean): void {
    this.objects.forEach((o) => (o as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(visible));
  }

  update(): void {
    if (!this.shown) return;
    // Só dedos: um clique de mouse nessa região não aperta os botões virtuais.
    const pointers = this.scene.input.manager.pointers.filter((p) => p.isDown && p.wasTouch);
    const captured = new Set<number>();

    for (const s of this.sticks) {
      let pointer = s.pointerId !== null ? pointers.find((p) => p.id === s.pointerId) : undefined;
      if (!pointer) {
        s.pointerId = null;
        // Um dedo que encosta perto do joystick passa a controlá-lo.
        pointer = pointers.find((p) => !captured.has(p.id) && Phaser.Math.Distance.Between(p.downX, p.downY, s.x, s.y) < s.r * 1.4);
        if (pointer) {
          s.pointerId = pointer.id;
          sfx.unlock();
        }
      }
      if (pointer) {
        captured.add(pointer.id);
        const dir = stickInput(pointer.x - s.x, pointer.y - s.y, s.r);
        s.state.left = dir.left;
        s.state.right = dir.right;
        s.knob.setPosition(dir.knobX, dir.knobY);
      } else {
        s.state.left = s.state.right = false;
        s.knob.setPosition(0, 0);
      }
    }

    for (const button of this.buttons) {
      const pressed = pointers.some((p) => !captured.has(p.id) && Phaser.Math.Distance.Between(p.x, p.y, button.x, button.y) < button.r * 1.35);
      if (pressed && !button.pressed) {
        sfx.unlock();
        if (button.id === 'jump') button.state.jumpQueued = true;
        if (button.id === 'dash') button.state.dashQueued = true;
      }
      button.pressed = pressed;
      button.state[button.id] = pressed;
      button.gfx.setScale(pressed ? 0.9 : 1).setAlpha(pressed ? 1 : 0.75);
    }
  }
}
