import Phaser from 'phaser';
import type { PlayerInput } from '../objects/Player';
import { touchState } from './touchState';

export type GameMode = 'single' | 'coop' | 'race';

/** Teclas (KeyboardEvent.code) de cada ação. */
export interface KeyBinding {
  left: string[];
  right: string[];
  jump: string[];
  dash: string[];
  charge: string[];
}

/** Um jogador: todas as teclas clássicas. */
export const SINGLE_BINDING: KeyBinding = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space', 'ArrowUp', 'KeyW', 'KeyZ'],
  dash: ['ShiftLeft', 'ShiftRight', 'KeyX', 'KeyK'],
  charge: ['KeyC', 'KeyL'],
};

/** Dois jogadores no mesmo teclado: P1 à esquerda, P2 nas setas. */
export const P1_BINDING: KeyBinding = {
  left: ['KeyA'],
  right: ['KeyD'],
  jump: ['KeyW', 'Space'],
  dash: ['KeyS'],
  charge: ['KeyE'],
};

export const P2_BINDING: KeyBinding = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  jump: ['ArrowUp'],
  dash: ['ArrowDown'],
  charge: ['Enter', 'NumpadEnter', 'Numpad0'],
};

export const PAUSE_CODES = ['Escape', 'KeyP'];

export function bindingsFor(mode: GameMode): KeyBinding[] {
  return mode === 'single' ? [SINGLE_BINDING] : [P1_BINDING, P2_BINDING];
}

/** Uma fonte extra de entrada (ex.: gamepad) para um jogador. */
export interface InputSource {
  read(playerIndex: number): Partial<PlayerInput> | null;
}

/**
 * Junta teclado, toque (jogador 1) e fontes extras numa entrada por jogador.
 * Pressionamentos ficam numa fila, então nem um toque muito rápido se perde.
 */
export class InputHub {
  private held = new Set<string>();
  private queued: { jump: boolean; dash: boolean }[];
  private pauseQueued = false;
  private readonly bindings: KeyBinding[];
  extraSources: InputSource[] = [];

  constructor(scene: Phaser.Scene, mode: GameMode) {
    this.bindings = bindingsFor(mode);
    this.queued = this.bindings.map(() => ({ jump: false, dash: false }));
    const kb = scene.input.keyboard;
    if (!kb) return;
    const K = Phaser.Input.Keyboard.KeyCodes;
    kb.addCapture([K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT]);
    kb.on('keydown', (event: KeyboardEvent) => {
      this.held.add(event.code);
      if (event.repeat) return;
      if (PAUSE_CODES.includes(event.code)) this.pauseQueued = true;
      this.bindings.forEach((b, i) => {
        if (b.jump.includes(event.code)) this.queued[i].jump = true;
        if (b.dash.includes(event.code)) this.queued[i].dash = true;
      });
    });
    kb.on('keyup', (event: KeyboardEvent) => this.held.delete(event.code));
  }

  get playerCount(): number {
    return this.bindings.length;
  }

  /** Esquece teclas seguradas (ex.: ao voltar da pausa). */
  reset(): void {
    this.held.clear();
    this.queued.forEach((q) => {
      q.jump = q.dash = false;
    });
    this.pauseQueued = false;
    touchState.reset();
  }

  /** Enfileira ações vindas de fora (gamepad). */
  queue(playerIndex: number, action: 'jump' | 'dash' | 'pause'): void {
    if (action === 'pause') this.pauseQueued = true;
    else if (this.queued[playerIndex]) this.queued[playerIndex][action] = true;
  }

  consumePause(): boolean {
    const value = this.pauseQueued || touchState.consume('pauseQueued') || this.extraPause();
    this.pauseQueued = false;
    return value;
  }

  /** Verificação extra de pausa (Start do gamepad). */
  extraPause: () => boolean = () => false;

  private any(codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  read(index: number): PlayerInput {
    const b = this.bindings[index];
    const q = this.queued[index];
    const input: PlayerInput = {
      left: this.any(b.left),
      right: this.any(b.right),
      jumpHeld: this.any(b.jump),
      jumpPressed: q.jump,
      dashPressed: q.dash,
      chargeHeld: this.any(b.charge),
    };
    q.jump = q.dash = false;
    if (index === 0) {
      input.left ||= touchState.left;
      input.right ||= touchState.right;
      input.jumpHeld ||= touchState.jump;
      input.chargeHeld ||= touchState.charge;
      input.jumpPressed ||= touchState.consume('jumpQueued');
      input.dashPressed ||= touchState.consume('dashQueued');
    }
    for (const source of this.extraSources) {
      const extra = source.read(index);
      if (!extra) continue;
      input.left ||= !!extra.left;
      input.right ||= !!extra.right;
      input.jumpHeld ||= !!extra.jumpHeld;
      input.chargeHeld ||= !!extra.chargeHeld;
      input.jumpPressed ||= !!extra.jumpPressed;
      input.dashPressed ||= !!extra.dashPressed;
    }
    return input;
  }

  /** Se o pulo está seguro agora (para o quique mais alto ao pisar). */
  jumpHeld(index: number): boolean {
    return this.any(this.bindings[index].jump) || (index === 0 && touchState.jump);
  }
}
