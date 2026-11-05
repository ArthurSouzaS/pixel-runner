/**
 * Converte o mapa ASCII de uma fase em dados estruturados.
 * Módulo puro: o Phaser só consome o resultado.
 */

export const TILE_SIZE = 16;

/** Índices dos tiles dentro do tileset gerado no BootScene. */
export const TileIndex = {
  Empty: -1,
  Top: 0,
  Fill: 1,
  Block: 2,
  Platform: 3,
  Ice: 4,
  Breakable: 5,
} as const;

/** Índices de tiles sólidos (usados para colisão). */
export const SOLID_TILES: readonly number[] = [TileIndex.Top, TileIndex.Fill, TileIndex.Block, TileIndex.Platform, TileIndex.Ice, TileIndex.Breakable];

export type EnemyKind = 'walker' | 'hopper' | 'bat' | 'turret' | 'fish' | 'armored';

export interface GridPoint {
  x: number;
  y: number;
}

export interface EnemySpawn extends GridPoint {
  kind: EnemyKind;
}

export interface ParsedLevel {
  width: number;
  height: number;
  /** Matriz [linha][coluna] com índices de {@link TileIndex}. */
  tiles: number[][];
  start: GridPoint | null;
  goal: GridPoint | null;
  boss: GridPoint | null;
  /** Colunas do portão da arena do chefe. */
  gate: GridPoint[];
  coins: GridPoint[];
  checkpoints: GridPoint[];
  spikes: GridPoint[];
  springs: GridPoint[];
  fallers: GridPoint[];
  /** Posição do orbe de habilidade (`A`), se houver. */
  ability: GridPoint | null;
  enemies: EnemySpawn[];
}

const ENEMY_CHARS: Record<string, EnemyKind> = {
  w: 'walker',
  h: 'hopper',
  b: 'bat',
  t: 'turret',
  f: 'fish',
  a: 'armored',
};

const isGround = (ch: string | undefined): boolean => ch === '#';

export function parseLevel(map: readonly string[]): ParsedLevel {
  const height = map.length;
  const width = map.reduce((max, row) => Math.max(max, row.length), 0);
  const rows = map.map((row) => row.padEnd(width, '.'));

  const result: ParsedLevel = {
    width,
    height,
    tiles: [],
    start: null,
    goal: null,
    boss: null,
    gate: [],
    coins: [],
    checkpoints: [],
    spikes: [],
    springs: [],
    fallers: [],
    ability: null,
    enemies: [],
  };

  for (let y = 0; y < height; y++) {
    const tileRow: number[] = [];
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x];
      let tile: number = TileIndex.Empty;
      switch (ch) {
        case '#':
          tile = isGround(rows[y - 1]?.[x]) ? TileIndex.Fill : TileIndex.Top;
          break;
        case 'X':
          tile = TileIndex.Block;
          break;
        case '-':
          tile = TileIndex.Platform;
          break;
        case 'I':
          tile = TileIndex.Ice;
          break;
        case 'Q':
          tile = TileIndex.Breakable;
          break;
        case 'A':
          result.ability = { x, y };
          break;
        case 'S':
          result.springs.push({ x, y });
          break;
        case 'F':
          result.fallers.push({ x, y });
          break;
        case '^':
          result.spikes.push({ x, y });
          break;
        case 'o':
          result.coins.push({ x, y });
          break;
        case 'P':
          result.start = { x, y };
          break;
        case 'G':
          result.goal = { x, y };
          break;
        case 'K':
          result.checkpoints.push({ x, y });
          break;
        case 'B':
          result.boss = { x, y };
          break;
        case '|':
          result.gate.push({ x, y });
          break;
        default:
          if (ch in ENEMY_CHARS) result.enemies.push({ kind: ENEMY_CHARS[ch], x, y });
      }
      tileRow.push(tile);
    }
    result.tiles.push(tileRow);
  }

  return result;
}

/** Converte coordenada de tile para o centro em pixels. */
export function tileCenter(point: GridPoint): GridPoint {
  return { x: point.x * TILE_SIZE + TILE_SIZE / 2, y: point.y * TILE_SIZE + TILE_SIZE / 2 };
}

/** Verifica se uma fase é jogável: tem início, chegada e nenhum problema óbvio. */
export function validateLevel(level: ParsedLevel): string[] {
  const errors: string[] = [];
  if (!level.start) errors.push('fase sem ponto de início (P)');
  if (!level.goal) errors.push('fase sem chegada (G)');
  if (level.start && level.goal && level.goal.x <= level.start.x) errors.push('chegada antes do início');
  if (level.start) {
    const below = level.tiles[level.start.y + 1]?.[level.start.x];
    if (below === undefined || below === TileIndex.Empty) errors.push('início sem chão logo abaixo');
  }
  if (level.gate.length > 0 && !level.boss) errors.push('portão sem chefe');
  return errors;
}
