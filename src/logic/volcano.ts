/**
 * Contas das mecânicas do Mundo 4 (Vale Vulcânico). Módulo puro, coberto por testes.
 */
import type { GeyserData, LavaChaseData, LavaTideData } from '../levels/types';

export type GeyserState = 'off' | 'warning' | 'on';

/** Quanto tempo antes de disparar o gêiser começa a borbulhar (aviso). */
export const GEYSER_WARNING_MS = 700;

/** Estado do gêiser num instante (ms). O ciclo começa ligado, como os lasers. */
export function geyserStateAt(data: Pick<GeyserData, 'on' | 'off' | 'offset'>, timeMs: number): GeyserState {
  const cycle = data.on + data.off;
  if (cycle <= 0) return 'on';
  const t = (((timeMs + data.offset) % cycle) + cycle) % cycle;
  if (t < data.on) return 'on';
  return t >= cycle - GEYSER_WARNING_MS ? 'warning' : 'off';
}

/** Área do fogo (px) quando o gêiser está ligado: sobe `height` tiles a partir do bico. */
export function geyserRect(data: Pick<GeyserData, 'x' | 'y' | 'height'>, tile = 16): { x: number; y: number; width: number; height: number } {
  const bottom = data.y * tile + tile / 2;
  return { x: data.x * tile + 3, y: bottom - data.height * tile, width: tile - 6, height: data.height * tile };
}

/** Altura (px, topo da lava) da maré num instante (s). Começa embaixo e sobe suavemente. */
export function tideSurfaceY(tide: LavaTideData, seconds: number, tile = 16): number {
  const phase = ((seconds + (tide.offset ?? 0)) / tide.period) * Math.PI * 2;
  const k = 0.5 - 0.5 * Math.cos(phase); // 0 = mais baixa, 1 = mais alta
  const low = tide.low * tile;
  const high = tide.high * tile;
  return low + (high - low) * k;
}

/** Posição (px) da frente da parede de lava `elapsed` segundos depois de (re)começar. */
export function chaseWallX(chase: LavaChaseData, startX: number, elapsed: number): number {
  return startX + Math.max(0, elapsed - chase.delay) * chase.speed;
}
