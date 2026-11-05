/**
 * Persistência do progresso no localStorage.
 * Recebe um "StorageLike" para poder ser testado sem navegador.
 */
import { type AbilityId, grantAbility, isAbilityId } from './abilities';
import { sanitizeAchievements } from './achievements';
import { type VolumeSettings, defaultVolumes, sanitizeVolumes } from './audioSettings';
import { clampUnlocked, unlockAfterClear } from './progress';
import { type ShopState, defaultShopState, sanitizeShop } from './shop';
import { type PlayerStats, emptyStats, sanitizeStats } from './stats';

export const SAVE_KEY = 'pixel-runner:save';
export const SAVE_VERSION = 3;

export interface SaveData extends ShopState {
  version: number;
  highScore: number;
  /** Quantidade de fases desbloqueadas (base 1). */
  unlockedLevels: number;
  /** Melhor tempo (segundos) por índice de fase. */
  bestTimes: Record<number, number>;
  muted: boolean;
  /** Habilidades já conquistadas. */
  abilities: AbilityId[];
  stats: PlayerStats;
  /** Ids das conquistas desbloqueadas. */
  achievements: string[];
  volumes: VolumeSettings;
  /** Cenas de história já vistas. */
  storySeen: string[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultSave(): SaveData {
  return { version: SAVE_VERSION, highScore: 0, unlockedLevels: 1, bestTimes: {}, muted: false, abilities: [], ...defaultShopState(), stats: emptyStats(), achievements: [], volumes: defaultVolumes(), storySeen: [] };
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

  // Migração: quem concluiu a última fase liberada ganha a próxima. Isso libera o
  // Mundo 3 para quem zerou a v2 (que parava na fase 10) e corrige saves inconsistentes.
  const lastCleared = Math.max(-1, ...Object.keys(bestTimes).map(Number));
  const unlocked = Math.max(toNonNegative(data.unlockedLevels, 1), lastCleared + 2);

  return {
    version: SAVE_VERSION,
    highScore: Math.floor(toNonNegative(data.highScore, 0)),
    unlockedLevels: clampUnlocked(unlocked, totalLevels),
    bestTimes,
    muted: data.muted === true,
    abilities: Array.isArray(data.abilities) ? grantAllValid(data.abilities) : [],
    ...sanitizeShop(data),
    stats: sanitizeStats(data.stats),
    achievements: sanitizeAchievements(data.achievements),
    volumes: sanitizeVolumes(data.volumes),
    storySeen: Array.isArray(data.storySeen) ? [...new Set(data.storySeen.filter((v): v is string => typeof v === 'string'))] : [],
  };
}

function grantAllValid(list: unknown[]): AbilityId[] {
  return list.filter(isAbilityId).reduce<AbilityId[]>((acc, id) => grantAbility(acc, id), []);
}

export function saveWithAbility(save: SaveData, id: AbilityId): SaveData {
  return { ...save, abilities: grantAbility(save.abilities, id) };
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
