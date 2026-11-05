import type { LaserData } from '../levels/types';

export type LaserState = 'off' | 'warning' | 'on';

export const LASER_WARNING_MS = 500;

/** Estado de um laser temporizado num instante (ms). Função pura para testes. */
export function laserStateAt(data: Pick<LaserData, 'on' | 'off' | 'offset'>, timeMs: number): LaserState {
  const cycle = data.on + data.off;
  if (cycle <= 0) return 'on';
  const t = (((timeMs + data.offset) % cycle) + cycle) % cycle;
  if (t < data.on) return 'on';
  return t >= cycle - LASER_WARNING_MS ? 'warning' : 'off';
}
