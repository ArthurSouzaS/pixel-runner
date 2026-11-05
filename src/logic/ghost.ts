/**
 * Fantasma do speedrun: grava os comandos de cada quadro (compactados) e posições-chave,
 * e permite reproduzir a corrida. Módulo puro.
 */

export interface GhostInput {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  dashPressed: boolean;
  chargeHeld: boolean;
}

const BITS: (keyof GhostInput)[] = ['left', 'right', 'jumpHeld', 'jumpPressed', 'dashPressed', 'chargeHeld'];

export function encodeInput(input: GhostInput): number {
  return BITS.reduce((mask, key, i) => (input[key] ? mask | (1 << i) : mask), 0);
}

export function decodeInput(mask: number): GhostInput {
  const out = {} as GhostInput;
  BITS.forEach((key, i) => (out[key] = (mask & (1 << i)) !== 0));
  return out;
}

/** Quadro-chave: tempo (ms), posição, quadro de animação e lado. */
export type Keyframe = [t: number, x: number, y: number, frame: number, flip: number];

export interface GhostData {
  version: 1;
  /** Tempo final da corrida (s). */
  time: number;
  /** Comandos em RLE: pares [máscara, quantidade de quadros]. */
  inputs: [number, number][];
  /** Duração (ms) de cada quadro, em RLE: pares [ms, quantidade]. */
  steps: [number, number][];
  keys: Keyframe[];
}

export const KEYFRAME_EVERY = 6;

/** Grava uma corrida quadro a quadro. */
export class GhostRecorder {
  private inputs: [number, number][] = [];
  private steps: [number, number][] = [];
  private keys: Keyframe[] = [];
  private frames = 0;
  private clock = 0;

  push(input: GhostInput, deltaMs: number, x: number, y: number, frame: number, flip: boolean): void {
    const mask = encodeInput(input);
    const ms = Math.round(deltaMs);
    pushRle(this.inputs, mask);
    pushRle(this.steps, ms);
    this.clock += ms;
    if (this.frames % KEYFRAME_EVERY === 0) this.keys.push([this.clock, Math.round(x), Math.round(y), frame, flip ? 1 : 0]);
    this.frames++;
  }

  get frameCount(): number {
    return this.frames;
  }

  finish(time: number, x: number, y: number, frame: number, flip: boolean): GhostData {
    this.keys.push([this.clock, Math.round(x), Math.round(y), frame, flip ? 1 : 0]);
    return { version: 1, time, inputs: this.inputs.map((p) => [...p] as [number, number]), steps: this.steps.map((p) => [...p] as [number, number]), keys: [...this.keys] };
  }
}

function pushRle(list: [number, number][], value: number): void {
  const last = list[list.length - 1];
  if (last && last[0] === value) last[1]++;
  else list.push([value, 1]);
}

/** Expande o RLE em uma lista por quadro. */
export function expandRle(list: readonly [number, number][]): number[] {
  const out: number[] = [];
  for (const [value, count] of list) for (let i = 0; i < count; i++) out.push(value);
  return out;
}

/** Reprodução: entrega os comandos e a posição esperada para cada instante. */
export class GhostPlayback {
  private readonly inputs: number[];
  private readonly steps: number[];
  private index = 0;
  private clock = 0;

  constructor(private readonly data: GhostData) {
    this.inputs = expandRle(data.inputs);
    this.steps = expandRle(data.steps);
  }

  get finished(): boolean {
    return this.index >= this.inputs.length;
  }

  /** Avança até `timeMs` e devolve os comandos dos quadros percorridos (com a duração de cada). */
  advance(timeMs: number): { input: GhostInput; ms: number }[] {
    const out: { input: GhostInput; ms: number }[] = [];
    while (this.index < this.inputs.length && this.clock + this.steps[this.index] <= timeMs) {
      out.push({ input: decodeInput(this.inputs[this.index]), ms: this.steps[this.index] });
      this.clock += this.steps[this.index];
      this.index++;
    }
    return out;
  }

  /** Posição interpolada nos quadros-chave. */
  positionAt(timeMs: number): { x: number; y: number; frame: number; flip: boolean } | null {
    return ghostPositionAt(this.data.keys, timeMs);
  }
}

export function ghostPositionAt(keys: readonly Keyframe[], timeMs: number): { x: number; y: number; frame: number; flip: boolean } | null {
  if (keys.length === 0) return null;
  if (timeMs <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], frame: keys[0][3], flip: keys[0][4] === 1 };
  // Busca binária pelo quadro-chave anterior.
  let lo = 0;
  let hi = keys.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (keys[mid][0] <= timeMs) lo = mid;
    else hi = mid - 1;
  }
  const a = keys[lo];
  const b = keys[Math.min(lo + 1, keys.length - 1)];
  const span = b[0] - a[0];
  const k = span > 0 ? Math.min(1, (timeMs - a[0]) / span) : 0;
  return { x: a[1] + (b[1] - a[1]) * k, y: a[2] + (b[2] - a[2]) * k, frame: a[3], flip: a[4] === 1 };
}

export function isGhostData(raw: unknown): raw is GhostData {
  if (!raw || typeof raw !== 'object') return false;
  const g = raw as Partial<GhostData>;
  const pairs = (v: unknown) => Array.isArray(v) && v.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => Number.isFinite(n)));
  return (
    g.version === 1 &&
    typeof g.time === 'number' &&
    g.time > 0 &&
    pairs(g.inputs) &&
    pairs(g.steps) &&
    Array.isArray(g.keys) &&
    g.keys.every((k) => Array.isArray(k) && k.length === 5 && k.every((n) => Number.isFinite(n)))
  );
}
