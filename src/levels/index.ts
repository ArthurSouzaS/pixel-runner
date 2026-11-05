import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import { level6 } from './level6';
import { level7 } from './level7';
import { level8 } from './level8';
import { level9 } from './level9';
import { level10 } from './level10';
import type { LevelData } from './types';

/** Todas as fases, em ordem. Cada mundo tem 5 fases, a última com chefe. */
export const LEVELS: readonly LevelData[] = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10];

export const TOTAL_LEVELS = LEVELS.length;
export const LEVELS_PER_WORLD = 5;

export interface WorldInfo {
  id: number;
  name: string;
  /** Índice (base 0) da primeira fase do mundo em LEVELS. */
  firstLevel: number;
}

export const WORLDS: readonly WorldInfo[] = [
  { id: 1, name: 'Terras de Pix', firstLevel: 0 },
  { id: 2, name: 'Arquipélago Celeste', firstLevel: 5 },
];

export function worldOfLevel(levelIndex: number): WorldInfo {
  return WORLDS[Math.min(WORLDS.length - 1, Math.floor(levelIndex / LEVELS_PER_WORLD))];
}

export type { LevelData, LevelTheme, MoverData, HintData, ThemeKey, TileRect, WindZone, BossKind } from './types';
