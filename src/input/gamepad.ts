import type { PlayerInput } from '../objects/Player';
import type { GameMode, InputSource } from './controls';
import { MENU_KEYS, type PadButtons, emptyButtons, justPressed, padForPlayer, readPadButtons } from './gamepadMapping';
import { DEFAULT_PAD, type PadMap } from '../logic/accessibility';

interface PadState {
  now: PadButtons;
  before: PadButtons;
  /** Pressionamentos ainda não consumidos pela fase. */
  queued: { jump: boolean; dash: boolean; start: boolean };
  raw: boolean[];
  /** Repetição de direção segurada nos menus. */
  repeatAt: number;
}

const REPEAT_DELAY = 380;
const REPEAT_RATE = 140;

/**
 * Lê os gamepads a cada quadro. Na fase, alimenta a entrada dos jogadores;
 * fora dela (menus, pausa, tutorial), simula teclas para navegar.
 */
class GamepadManager {
  private pads = new Map<number, PadState>();
  private order: number[] = [];
  /** Botões configurados pelo jogador. */
  mapping: PadMap = DEFAULT_PAD;
  /** Chamado com o índice do botão apertado (tela de remapear). */
  onAnyButton?: (button: number) => void;
  private primed = false;

  /** Captura o próximo botão apertado (remapear). Passe `undefined` para parar. */
  capture(callback?: (button: number) => void): void {
    this.onAnyButton = callback;
    this.primed = false;
  }
  onConnect?: (name: string, connected: boolean) => void;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('gamepadconnected', (e) => this.onConnect?.(e.gamepad.id, true));
    window.addEventListener('gamepaddisconnected', (e) => {
      this.pads.delete(e.gamepad.index);
      this.onConnect?.(e.gamepad.id, false);
    });
  }

  get connectedCount(): number {
    return this.order.length;
  }

  /** Chamado uma vez por quadro. `gameplay` = a fase está rodando (sem pausa). */
  update(gameplay: boolean, now: number): void {
    const wasPrimed = this.primed;
    const list = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    this.order = [];
    for (const gp of list) {
      if (!gp || !gp.connected) continue;
      this.order.push(gp.index);
      const state = this.pads.get(gp.index) ?? { now: emptyButtons(), before: emptyButtons(), queued: { jump: false, dash: false, start: false }, repeatAt: 0, raw: [] };
      state.before = state.now;
      state.now = readPadButtons(gp.buttons, gp.axes, this.mapping);
      if (this.onAnyButton) {
        // Na primeira leitura só memoriza o que já estava apertado.
        const pressed = this.primed ? gp.buttons.findIndex((b, i) => b.pressed && !state.raw[i]) : -1;
        state.raw = gp.buttons.map((b) => b.pressed);
        this.pads.set(gp.index, state);
        if (pressed >= 0 && pressed < 12) {
          this.onAnyButton(pressed);
          continue;
        }
      }
      const edge = justPressed(state.now, state.before);
      if (gameplay) {
        state.queued.jump ||= edge.jump;
        state.queued.dash ||= edge.dash;
        state.queued.start ||= edge.start;
      } else {
        state.queued = { jump: false, dash: false, start: false };
        this.emulateMenuKeys(state, edge, now);
      }
      this.pads.set(gp.index, state);
    }
    if (this.onAnyButton && !wasPrimed) this.primed = true;
  }

  private emulateMenuKeys(state: PadState, edge: PadButtons, now: number): void {
    const dirs: (keyof PadButtons)[] = ['up', 'down', 'left', 'right'];
    for (const key of Object.keys(MENU_KEYS) as (keyof PadButtons)[]) {
      let fire = edge[key];
      // Direção segurada repete, como uma tecla.
      if (!fire && dirs.includes(key) && state.now[key] && now >= state.repeatAt && state.repeatAt > 0) {
        fire = true;
        state.repeatAt = now + REPEAT_RATE;
      }
      if (fire) {
        if (dirs.includes(key) && edge[key]) state.repeatAt = now + REPEAT_DELAY;
        dispatchKey(MENU_KEYS[key]!);
      }
    }
    if (!dirs.some((d) => state.now[d])) state.repeatAt = 0;
  }

  /** Estado do controle de um jogador (ou null). */
  private statesFor(mode: GameMode, playerIndex: number): PadState[] {
    const slot = padForPlayer(mode, playerIndex, this.order.length);
    if (slot === null) return [];
    if (slot === 'any') return this.order.map((i) => this.pads.get(i)).filter((s): s is PadState => !!s);
    const state = this.pads.get(this.order[slot]);
    return state ? [state] : [];
  }

  read(mode: GameMode, playerIndex: number): Partial<PlayerInput> | null {
    const states = this.statesFor(mode, playerIndex);
    if (states.length === 0) return null;
    const input: Partial<PlayerInput> = {};
    for (const s of states) {
      input.left ||= s.now.left;
      input.right ||= s.now.right;
      input.jumpHeld ||= s.now.jump;
      input.chargeHeld ||= s.now.charge;
      input.jumpPressed ||= s.queued.jump;
      input.dashPressed ||= s.queued.dash;
      s.queued.jump = s.queued.dash = false;
    }
    return input;
  }

  /** Start apertado em qualquer controle durante a fase. */
  consumePause(): boolean {
    let pressed = false;
    for (const s of this.pads.values()) {
      pressed ||= s.queued.start;
      s.queued.start = false;
    }
    return pressed;
  }
}

function dispatchKey(k: { key: string; code: string; keyCode: number }): void {
  for (const type of ['keydown', 'keyup'] as const) {
    const event = new KeyboardEvent(type, { key: k.key, code: k.code, bubbles: true, cancelable: true });
    // O Phaser usa keyCode, que não pode ser passado no construtor.
    Object.defineProperty(event, 'keyCode', { get: () => k.keyCode });
    Object.defineProperty(event, 'which', { get: () => k.keyCode });
    window.dispatchEvent(event);
  }
}

export const gamepads = new GamepadManager();

/** Fonte de entrada do gamepad para o InputHub da fase. */
export class GamepadSource implements InputSource {
  constructor(private readonly mode: GameMode) {}

  read(playerIndex: number): Partial<PlayerInput> | null {
    return gamepads.read(this.mode, playerIndex);
  }
}
