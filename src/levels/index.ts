import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import type { LevelData } from './types';

/** Todas as fases, em ordem de dificuldade crescente. */
export const LEVELS: readonly LevelData[] = [level1, level2, level3, level4, level5];

export const TOTAL_LEVELS = LEVELS.length;

export type { LevelData, LevelTheme, MoverData, HintData, ThemeKey } from './types';
