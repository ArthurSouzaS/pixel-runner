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
import { level11 } from './level11';
import { level12 } from './level12';
import { level13 } from './level13';
import { level14 } from './level14';
import { level15 } from './level15';
import { level16 } from './level16';
import { level17 } from './level17';
import { level18 } from './level18';
import { level19 } from './level19';
import { level20 } from './level20';
import type { LevelData } from './types';

/**
 * Todas as fases, em ordem. Cada mundo tem 5 fases. Nos mundos 1 a 3 a última tem chefe
 * (a 15 é o chefe final da história); no Mundo 4 a última é a fuga da lava.
 */
export const LEVELS: readonly LevelData[] = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10, level11, level12, level13, level14, level15, level16, level17, level18, level19, level20];

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
  { id: 3, name: 'Fronteira Estelar', firstLevel: 10 },
  { id: 4, name: 'Vale Vulcânico', firstLevel: 15 },
];

export function worldOfLevel(levelIndex: number): WorldInfo {
  return WORLDS[Math.min(WORLDS.length - 1, Math.floor(levelIndex / LEVELS_PER_WORLD))];
}

export type { LevelData, LevelTheme, MoverData, HintData, ThemeKey, TileRect, WindZone, BossKind, PortalData, AsteroidData, LaserData, GeyserData, ConveyorData, LavaTideData, LavaChaseData } from './types';
