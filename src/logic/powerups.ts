/**
 * Power-ups temporários do modo Infinito: escolhidos entre as salas, valem só para a sala seguinte.
 * Módulo puro.
 */
import { hashString, mulberry32 } from './procgen';

export type PowerUpId = 'shield' | 'magnet' | 'jump' | 'speed' | 'life' | 'slow';

export interface PowerUp {
  id: PowerUpId;
  /** Cor do ícone. */
  color: number;
}

export const POWERUPS: readonly PowerUp[] = [
  { id: 'shield', color: 0x41a6f6 },
  { id: 'magnet', color: 0xb13e53 },
  { id: 'jump', color: 0x38b764 },
  { id: 'speed', color: 0xffcd75 },
  { id: 'life', color: 0xef7d57 },
  { id: 'slow', color: 0x73eff7 },
];

/** Três opções diferentes, sempre as mesmas para a mesma seed e sala. */
export function powerUpChoices(seed: string, room: number): PowerUpId[] {
  const random = mulberry32(hashString(`${seed}:power:${room}`));
  const pool = POWERUPS.map((p) => p.id);
  const out: PowerUpId[] = [];
  while (out.length < 3) {
    const id = pool.splice(Math.floor(random() * pool.length), 1)[0];
    out.push(id);
  }
  return out;
}

/** Efeitos numéricos de cada power-up na sala. */
export function powerUpEffects(id: PowerUpId | null): { jumpScale: number; speedScale: number; enemyScale: number; shield: boolean; magnet: boolean } {
  return {
    jumpScale: id === 'jump' ? 1.18 : 1,
    speedScale: id === 'speed' ? 1.15 : 1,
    enemyScale: id === 'slow' ? 0.7 : 1,
    shield: id === 'shield',
    magnet: id === 'magnet',
  };
}

export interface InfiniteEntry {
  seed: string;
  rooms: number;
  score: number;
  /** Data (AAAA-MM-DD). */
  date: string;
}

export const INFINITE_BOARD_SIZE = 5;

/** Insere uma corrida no placar (mais salas primeiro; empate pela pontuação). */
export function addInfiniteEntry(board: readonly InfiniteEntry[], entry: InfiniteEntry): InfiniteEntry[] {
  return [...board, entry].sort((a, b) => b.rooms - a.rooms || b.score - a.score).slice(0, INFINITE_BOARD_SIZE);
}

export function sanitizeInfiniteBoard(raw: unknown): InfiniteEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (e): e is InfiniteEntry =>
        !!e && typeof e === 'object' && typeof e.seed === 'string' && Number.isFinite(e.rooms) && Number.isFinite(e.score) && typeof e.date === 'string',
    )
    .map((e) => ({ seed: e.seed.slice(0, 12), rooms: Math.max(0, Math.floor(e.rooms)), score: Math.max(0, Math.floor(e.score)), date: e.date.slice(0, 10) }))
    .sort((a, b) => b.rooms - a.rooms || b.score - a.score)
    .slice(0, INFINITE_BOARD_SIZE);
}
