/**
 * Persistência do progresso no localStorage.
 * Recebe um "StorageLike" para poder ser testado sem navegador.
 */
import { clampUnlocked, unlockAfterClear } from './progress';

export const SAVE_KEY = 'pixel-runner:save';
export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  highScore: number;
  /** Quantidade de fases desbloqueadas (base 1). */
  unlockedLevels: number;
  /** Melhor tempo (segundos) por índice de fase. */
  bestTimes: Record<number, number>;
  muted: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultSave(): SaveData {
  return { version: SAVE_VERSION, highScore: 0, unlockedLevels: 1, bestTimes: {}, muted: false };
}

function toNonNegative(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Valida e normaliza dados vindos do armazenamento (que podem estar corrompidos). */
export function sanitizeSave(raw: unknown, totalLevels: number): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<Record<keyof SaveData, unknown>>;

  const bestTimes: Record<number, number> = {};
  if (data.bestTimes && typeof data.bestTimes === 'object') {
    for (const [key, value] of Object.entries(data.bestTimes as Record<string, unknown>)) {
      const index = Number(key);
      if (Number.isInteger(index) && index >= 0 && index < totalLevels && typeof value === 'number' && value > 0) {
        bestTimes[index] = value;
      }
    }
  }

  return {
    version: SAVE_VERSION,
    highScore: Math.floor(toNonNegative(data.highScore, 0)),
    unlockedLevels: clampUnlocked(toNonNegative(data.unlockedLevels, 1), totalLevels),
    bestTimes,
    muted: data.muted === true,
  };
}

export function loadSave(storage: StorageLike | null | undefined, totalLevels: number): SaveData {
  if (!storage) return defaultSave();
  try {
    const text = storage.getItem(SAVE_KEY);
    if (!text) return defaultSave();
    return sanitizeSave(JSON.parse(text), totalLevels);
  } catch {
    return defaultSave();
  }
}

/** Grava os dados. Retorna `false` se o armazenamento falhar (modo privado, cota cheia...). */
export function writeSave(storage: StorageLike | null | undefined, data: SaveData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export interface HighScoreResult {
  save: SaveData;
  isNewRecord: boolean;
}

export function submitScore(save: SaveData, score: number): HighScoreResult {
  if (score > save.highScore) {
    return { save: { ...save, highScore: Math.floor(score) }, isNewRecord: true };
  }
  return { save, isNewRecord: false };
}

export interface LevelClearSaveResult {
  save: SaveData;
  isBestTime: boolean;
}

/** Registra a conclusão de uma fase: desbloqueia a próxima e guarda o melhor tempo. */
export function recordLevelClear(
  save: SaveData,
  levelIndex: number,
  seconds: number,
  totalLevels: number,
): LevelClearSaveResult {
  const previous = save.bestTimes[levelIndex];
  const isBestTime = seconds > 0 && (previous === undefined || seconds < previous);
  return {
    save: {
      ...save,
      unlockedLevels: unlockAfterClear(save.unlockedLevels, levelIndex, totalLevels),
      bestTimes: isBestTime ? { ...save.bestTimes, [levelIndex]: seconds } : save.bestTimes,
    },
    isBestTime,
  };
}
