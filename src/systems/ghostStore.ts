import { type GhostData, isGhostData } from '../logic/ghost';

const KEY = 'pixel-runner:ghosts';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Fantasmas do speedrun (o melhor de cada fase), guardados fora do save principal. */
class GhostStore {
  private cache: Record<string, GhostData> | null = null;

  private load(): Record<string, GhostData> {
    if (this.cache) return this.cache;
    const out: Record<string, GhostData> = {};
    try {
      const raw = JSON.parse(storage()?.getItem(KEY) ?? '{}') as Record<string, unknown>;
      for (const [level, ghost] of Object.entries(raw)) if (isGhostData(ghost)) out[level] = ghost;
    } catch {
      // Dados corrompidos: começa do zero.
    }
    this.cache = out;
    return out;
  }

  get(levelIndex: number): GhostData | null {
    return this.load()[String(levelIndex)] ?? null;
  }

  /** Guarda se for mais rápido que o fantasma atual. Retorna true se guardou. */
  offer(levelIndex: number, ghost: GhostData): boolean {
    const all = this.load();
    const current = all[String(levelIndex)];
    if (current && current.time <= ghost.time) return false;
    all[String(levelIndex)] = ghost;
    try {
      storage()?.setItem(KEY, JSON.stringify(all));
    } catch {
      // Sem espaço: mantém só na memória.
    }
    return true;
  }
}

export const ghostStore = new GhostStore();
