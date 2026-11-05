/**
 * Opções de acessibilidade. Módulo puro (sem Phaser), coberto por testes.
 */
import { tOr } from '../i18n';

export type ColorblindMode = 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export const COLORBLIND_MODES: readonly ColorblindMode[] = ['off', 'protanopia', 'deuteranopia', 'tritanopia'];

export type Action = 'left' | 'right' | 'jump' | 'dash' | 'charge' | 'pause';
export const ACTIONS: readonly Action[] = ['left', 'right', 'jump', 'dash', 'charge', 'pause'];

/** Teclas (KeyboardEvent.code) por ação, para o modo de um jogador. */
export type KeyMap = Record<Action, string[]>;
/** Botões do gamepad (índices do mapeamento padrão) por ação (direções ficam fixas). */
export type PadMap = Record<'jump' | 'dash' | 'charge' | 'pause', number[]>;

export const DEFAULT_KEYS: KeyMap = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space', 'ArrowUp', 'KeyW', 'KeyZ'],
  dash: ['ShiftLeft', 'ShiftRight', 'KeyX', 'KeyK'],
  charge: ['KeyC', 'KeyL'],
  pause: ['Escape', 'KeyP'],
};

export const DEFAULT_PAD: PadMap = { jump: [0], dash: [2, 3, 5], charge: [1, 4], pause: [9] };

export interface AccessSettings {
  colorblind: ColorblindMode;
  shake: boolean;
  flash: boolean;
  /** Velocidade do jogo: 1 (100%) ou 0.75 (75%). */
  speed: number;
  /** Tamanho do texto: 1 (normal) ou 1.25 (grande). */
  textScale: number;
  keys: KeyMap;
  pad: PadMap;
}

export function defaultAccess(): AccessSettings {
  return {
    colorblind: 'off',
    shake: true,
    flash: true,
    speed: 1,
    textScale: 1,
    keys: cloneKeys(DEFAULT_KEYS),
    pad: { jump: [...DEFAULT_PAD.jump], dash: [...DEFAULT_PAD.dash], charge: [...DEFAULT_PAD.charge], pause: [...DEFAULT_PAD.pause] },
  };
}

function cloneKeys(map: KeyMap): KeyMap {
  return Object.fromEntries(ACTIONS.map((a) => [a, [...map[a]]])) as KeyMap;
}

/**
 * Define a tecla de uma ação. Se a tecla já era usada por outra ação, ela sai de lá
 * (e, se a outra ação ficar sem teclas, recebe a tecla antiga desta ação: troca).
 */
export function assignKey(map: KeyMap, action: Action, code: string): KeyMap {
  const next = cloneKeys(map);
  const previous = next[action][0];
  for (const other of ACTIONS) {
    if (other === action) continue;
    next[other] = next[other].filter((c) => c !== code);
    if (next[other].length === 0 && previous) next[other] = [previous];
  }
  next[action] = [code];
  return next;
}

export function assignPadButton(map: PadMap, action: keyof PadMap, button: number): PadMap {
  const next: PadMap = { jump: [...map.jump], dash: [...map.dash], charge: [...map.charge], pause: [...map.pause] };
  const previous = next[action][0];
  for (const other of Object.keys(next) as (keyof PadMap)[]) {
    if (other === action) continue;
    next[other] = next[other].filter((b) => b !== button);
    if (next[other].length === 0 && previous !== undefined) next[other] = [previous];
  }
  next[action] = [button];
  return next;
}

/** Nome curto de uma tecla para mostrar na tela. */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const names: Record<string, string> = {
    ArrowLeft: 'Seta E', ArrowRight: 'Seta D', ArrowUp: 'Seta C', ArrowDown: 'Seta B', Space: 'Espaço', ShiftLeft: 'Shift', ShiftRight: 'Shift D',
    ControlLeft: 'Ctrl', ControlRight: 'Ctrl D', Enter: 'Enter', Escape: 'Esc', Tab: 'Tab', Backspace: 'Apagar', AltLeft: 'Alt',
  };
  const name = names[code];
  return name ? tOr(`key.${code}`, name) : code;
}

export function sanitizeAccess(raw: unknown): AccessSettings {
  const base = defaultAccess();
  if (!raw || typeof raw !== 'object') return base;
  const d = raw as Record<string, unknown>;
  const keys = cloneKeys(base.keys);
  if (d.keys && typeof d.keys === 'object') {
    for (const a of ACTIONS) {
      const v = (d.keys as Record<string, unknown>)[a];
      const codes = Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string' && c.length > 0 && c.length < 24) : [];
      if (codes.length > 0) keys[a] = [...new Set(codes)];
    }
  }
  const pad = { ...base.pad };
  if (d.pad && typeof d.pad === 'object') {
    for (const a of Object.keys(pad) as (keyof PadMap)[]) {
      const v = (d.pad as Record<string, unknown>)[a];
      const btns = Array.isArray(v) ? v.filter((b): b is number => Number.isInteger(b) && b >= 0 && b < 32) : [];
      if (btns.length > 0) pad[a] = [...new Set(btns)];
    }
  }
  return {
    colorblind: COLORBLIND_MODES.includes(d.colorblind as ColorblindMode) ? (d.colorblind as ColorblindMode) : 'off',
    shake: d.shake !== false,
    flash: d.flash !== false,
    speed: d.speed === 0.75 ? 0.75 : 1,
    textScale: d.textScale === 1.25 ? 1.25 : 1,
    keys,
    pad,
  };
}

// ---------------------------------------------------------------------------
// Daltonismo: correção de cores ("daltonize")
// ---------------------------------------------------------------------------

type M3 = [number, number, number, number, number, number, number, number, number];

/** Simulação de cada tipo de daltonismo (matrizes de Machado et al., severidade 1). */
const SIMULATION: Record<Exclude<ColorblindMode, 'off'>, M3> = {
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};

/** Para onde o erro (informação perdida) é redistribuído. */
const SHIFT: M3 = [0, 0, 0, 0.7, 1, 0, 0.7, 0, 1];

function mul(a: M3, b: M3): M3 {
  const out = new Array(9).fill(0) as M3;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) out[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
  return out;
}

/** Matriz 3x3 de correção: C = I + SHIFT · (I − S). */
export function daltonizeMatrix(mode: ColorblindMode): M3 {
  const identity: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  if (mode === 'off') return identity;
  const s = SIMULATION[mode];
  const diff = identity.map((v, i) => v - s[i]) as M3;
  const shifted = mul(SHIFT, diff);
  return identity.map((v, i) => v + shifted[i]) as M3;
}

/** Converte para o formato 4x5 (20 números) da ColorMatrix do Phaser. */
export function toColorMatrix(m: M3): number[] {
  return [m[0], m[1], m[2], 0, 0, m[3], m[4], m[5], 0, 0, m[6], m[7], m[8], 0, 0, 0, 0, 0, 1, 0];
}
