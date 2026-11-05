/**
 * Speedrun: categorias, splits e recordes pessoais. Módulo puro.
 * Os tempos são o tempo de jogo de cada fase (sem contar transições).
 */
import { LEVELS_PER_WORLD, TOTAL_LEVELS } from '../levels';

export interface SpeedrunCategory {
  id: string;
  /** Índices das fases, em ordem. */
  levels: number[];
}

export function categoryFor(id: string): SpeedrunCategory | null {
  if (id === 'all') return { id, levels: Array.from({ length: TOTAL_LEVELS }, (_, i) => i) };
  const world = /^world-(\d)$/.exec(id);
  if (world) {
    const w = Number(world[1]) - 1;
    if (w < 0 || w * LEVELS_PER_WORLD >= TOTAL_LEVELS) return null;
    return { id, levels: Array.from({ length: LEVELS_PER_WORLD }, (_, i) => w * LEVELS_PER_WORLD + i) };
  }
  const level = /^level-(\d+)$/.exec(id);
  if (level) {
    const l = Number(level[1]);
    return l >= 0 && l < TOTAL_LEVELS ? { id, levels: [l] } : null;
  }
  return null;
}

/** Categorias disponíveis conforme as fases liberadas. */
export function availableCategories(unlockedLevels: number): string[] {
  const out: string[] = [];
  const worlds = Math.ceil(TOTAL_LEVELS / LEVELS_PER_WORLD);
  for (let w = 1; w <= worlds; w++) if (unlockedLevels >= w * LEVELS_PER_WORLD) out.push(`world-${w}`);
  if (unlockedLevels >= TOTAL_LEVELS) out.push('all');
  for (let l = 0; l < Math.min(unlockedLevels, TOTAL_LEVELS); l++) out.push(`level-${l}`);
  return out;
}

export interface PersonalBest {
  /** Tempo total do recorde (s) ou null se nunca terminou. */
  pb: number | null;
  /** Tempos acumulados do recorde ao fim de cada fase. */
  splits: number[];
  /** Melhor tempo já feito em cada trecho (fase), mesmo em corridas sem recorde. */
  bestSegments: number[];
}

export type SpeedrunRecords = Record<string, PersonalBest>;

export function emptyBest(): PersonalBest {
  return { pb: null, splits: [], bestSegments: [] };
}

/** Diferença do tempo acumulado atual para o do recorde no mesmo ponto (negativo = mais rápido). */
export function splitDelta(best: PersonalBest | undefined, index: number, cumulative: number): number | null {
  const ref = best?.splits[index];
  return ref === undefined ? null : cumulative - ref;
}

/** Converte tempos por fase em tempos acumulados. */
export function cumulative(segments: readonly number[]): number[] {
  let sum = 0;
  return segments.map((s) => (sum += s));
}

/** Soma dos melhores trechos (o "tempo teórico"). */
export function sumOfBest(best: PersonalBest, count: number): number | null {
  if (best.bestSegments.length < count) return null;
  return best.bestSegments.slice(0, count).reduce((a, b) => a + b, 0);
}

export interface FinishResult {
  best: PersonalBest;
  isPb: boolean;
}

/** Registra uma corrida completa (tempos por fase). */
export function finishRun(previous: PersonalBest | undefined, segments: readonly number[]): FinishResult {
  const prev = previous ?? emptyBest();
  const splits = cumulative(segments);
  const total = splits[splits.length - 1] ?? 0;
  const bestSegments = segments.map((s, i) => Math.min(s, prev.bestSegments[i] ?? Infinity));
  const isPb = prev.pb === null || total < prev.pb;
  return { best: isPb ? { pb: total, splits, bestSegments } : { ...prev, bestSegments }, isPb };
}

/** Atualiza só os melhores trechos (corrida abandonada no meio). */
export function recordSegments(previous: PersonalBest | undefined, segments: readonly number[]): PersonalBest {
  const prev = previous ?? emptyBest();
  const bestSegments = [...prev.bestSegments];
  segments.forEach((s, i) => (bestSegments[i] = Math.min(s, bestSegments[i] ?? Infinity)));
  return { ...prev, bestSegments };
}

export function sanitizeSpeedrun(raw: unknown): SpeedrunRecords {
  const out: SpeedrunRecords = {};
  if (!raw || typeof raw !== 'object') return out;
  const nums = (v: unknown): number[] => (Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0) : []);
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!categoryFor(id) || !value || typeof value !== 'object') continue;
    const v = value as Partial<Record<keyof PersonalBest, unknown>>;
    out[id] = {
      pb: typeof v.pb === 'number' && Number.isFinite(v.pb) && v.pb > 0 ? v.pb : null,
      splits: nums(v.splits),
      bestSegments: nums(v.bestSegments),
    };
  }
  return out;
}
