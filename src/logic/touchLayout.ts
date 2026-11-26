/**
 * Posição e tamanho dos botões de toque (configuráveis pelo jogador).
 * Módulo puro (sem Phaser), coberto por testes.
 */
export type TouchButtonId = 'left' | 'right' | 'jump' | 'dash' | 'charge' | 'stick';
export const TOUCH_BUTTON_IDS: readonly TouchButtonId[] = ['left', 'right', 'jump', 'dash', 'charge', 'stick'];

/** Botões que aparecem (e que o editor mostra) em cada modo de movimento. */
export function visibleTouchIds(stick: boolean): TouchButtonId[] {
  return stick ? ['stick', 'dash', 'jump', 'charge'] : ['left', 'right', 'dash', 'jump', 'charge'];
}

export interface TouchButtonLayout {
  /** Centro do botão em coordenadas do jogo (480 x 270). */
  x: number;
  y: number;
  /** Tamanho relativo ao raio base (1 = padrão). */
  scale: number;
}

export type TouchLayout = Record<TouchButtonId, TouchButtonLayout>;

/** Raio base de cada botão (px do jogo). */
export const TOUCH_BASE_RADIUS: Record<TouchButtonId, number> = { left: 24, right: 24, dash: 22, jump: 26, charge: 18, stick: 32 };

export const TOUCH_SCALE_MIN = 0.7;
export const TOUCH_SCALE_MAX = 1.6;
export const TOUCH_SCALE_STEP = 0.1;
/** Os botões não podem subir sobre a barra do HUD. */
export const TOUCH_TOP_LIMIT = 22;

const VIEW_W = 480;
const VIEW_H = 270;

/** Layout original do jogo. */
export function defaultTouchLayout(): TouchLayout {
  const by = VIEW_H - 36;
  return {
    left: { x: 38, y: by, scale: 1 },
    right: { x: 100, y: by, scale: 1 },
    dash: { x: VIEW_W - 100, y: by + 6, scale: 1 },
    jump: { x: VIEW_W - 40, y: by - 12, scale: 1 },
    charge: { x: VIEW_W - 150, y: VIEW_H - 26, scale: 1 },
    stick: { x: 62, y: VIEW_H - 54, scale: 1 },
  };
}

// ---------------------------------------------------------------------------
// Joystick virtual
// ---------------------------------------------------------------------------

/** Fração do raio que o dedo precisa andar para contar como esquerda/direita. */
export const STICK_DEADZONE = 0.3;

/** Direção do joystick a partir do deslocamento do dedo em relação ao centro. */
export function stickInput(dx: number, dy: number, radius: number): { left: boolean; right: boolean; knobX: number; knobY: number } {
  const len = Math.hypot(dx, dy);
  const k = len > radius ? radius / len : 1;
  const knobX = dx * k;
  const knobY = dy * k;
  return { left: knobX < -radius * STICK_DEADZONE, right: knobX > radius * STICK_DEADZONE, knobX, knobY };
}

// ---------------------------------------------------------------------------
// Dois jogadores no mesmo celular
// ---------------------------------------------------------------------------

export interface TouchCircle {
  x: number;
  y: number;
  r: number;
}

export interface PlayerTouchCluster {
  player: 0 | 1;
  stick: TouchCircle;
  jump: TouchCircle;
  dash: TouchCircle;
  charge: TouchCircle;
}

/** Cada jogador com joystick e botões perto dele: P1 à esquerda, P2 espelhado à direita. */
export function twoPlayerTouchLayout(): PlayerTouchCluster[] {
  const p1: PlayerTouchCluster = {
    player: 0,
    stick: { x: 50, y: VIEW_H - 52, r: 28 },
    jump: { x: 118, y: VIEW_H - 74, r: 19 },
    dash: { x: 124, y: VIEW_H - 26, r: 16 },
    charge: { x: 86, y: VIEW_H - 106, r: 14 },
  };
  const mirror = (c: TouchCircle): TouchCircle => ({ ...c, x: VIEW_W - c.x });
  const p2: PlayerTouchCluster = { player: 1, stick: mirror(p1.stick), jump: mirror(p1.jump), dash: mirror(p1.dash), charge: mirror(p1.charge) };
  return [p1, p2];
}

export function touchRadius(id: TouchButtonId, layout: TouchLayout): number {
  return TOUCH_BASE_RADIUS[id] * layout[id].scale;
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

function clampScale(scale: number): number {
  return Math.round(clamp(scale, TOUCH_SCALE_MIN, TOUCH_SCALE_MAX) * 10) / 10;
}

/** Mantém o botão inteiro dentro da tela e abaixo do HUD. */
function placed(id: TouchButtonId, x: number, y: number, scale: number): TouchButtonLayout {
  const s = clampScale(scale);
  const r = TOUCH_BASE_RADIUS[id] * s;
  return {
    x: Math.round(clamp(x, r, VIEW_W - r)),
    y: Math.round(clamp(y, TOUCH_TOP_LIMIT + r, VIEW_H - r)),
    scale: s,
  };
}

export function moveTouchButton(layout: TouchLayout, id: TouchButtonId, x: number, y: number): TouchLayout {
  return { ...layout, [id]: placed(id, x, y, layout[id].scale) };
}

export function resizeTouchButton(layout: TouchLayout, id: TouchButtonId, delta: number): TouchLayout {
  const b = layout[id];
  return { ...layout, [id]: placed(id, b.x, b.y, b.scale + delta) };
}

/** Valida o que veio do save (saves antigos não têm layout: usam o padrão). */
export function sanitizeTouchLayout(raw: unknown): TouchLayout {
  const base = defaultTouchLayout();
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base };
  for (const id of TOUCH_BUTTON_IDS) {
    const b = (raw as Record<string, unknown>)[id] as Partial<TouchButtonLayout> | undefined;
    if (!b || typeof b !== 'object') continue;
    const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
    out[id] = placed(id, num(b.x, base[id].x), num(b.y, base[id].y), num(b.scale, 1));
  }
  return out;
}
