/**
 * Posição e tamanho dos botões de toque (configuráveis pelo jogador).
 * Módulo puro (sem Phaser), coberto por testes.
 */
export type TouchButtonId = 'left' | 'right' | 'jump' | 'dash' | 'charge';
export const TOUCH_BUTTON_IDS: readonly TouchButtonId[] = ['left', 'right', 'jump', 'dash', 'charge'];

export interface TouchButtonLayout {
  /** Centro do botão em coordenadas do jogo (480 x 270). */
  x: number;
  y: number;
  /** Tamanho relativo ao raio base (1 = padrão). */
  scale: number;
}

export type TouchLayout = Record<TouchButtonId, TouchButtonLayout>;

/** Raio base de cada botão (px do jogo). */
export const TOUCH_BASE_RADIUS: Record<TouchButtonId, number> = { left: 24, right: 24, dash: 22, jump: 26, charge: 18 };

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
  };
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
