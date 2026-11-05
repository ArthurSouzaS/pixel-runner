/**
 * Geração procedural de salas a partir de blocos prontos (modo Infinito e Desafio diário).
 * Tudo é determinístico: a mesma seed gera sempre a mesma sala.
 */
import { CHUNKS, type ChunkDef } from '../levels/chunks';
import { THEME_KEYS, themeByKey } from '../levels/themes';
import type { LevelData, ThemeKey } from '../levels/types';

// ---------------------------------------------------------------------------
// Seeds e números aleatórios
// ---------------------------------------------------------------------------

const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const SEED_LENGTH = 6;

/** Hash FNV-1a de 32 bits. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Gerador mulberry32: rápido e sempre igual para a mesma semente. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed nova, fácil de ler e compartilhar (sem letras parecidas como O/0 e I/1). */
export function randomSeed(random: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < SEED_LENGTH; i++) s += SEED_CHARS[Math.floor(random() * SEED_CHARS.length)];
  return s;
}

/** Limpa o texto digitado pelo jogador. Devolve null se não sobrar nada. */
export function normalizeSeed(input: string): string | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return s.length > 0 ? s : null;
}

// ---------------------------------------------------------------------------
// Geração de salas
// ---------------------------------------------------------------------------

export interface RoomOptions {
  /** Quantidade de blocos (sem contar início, fim e checkpoint). */
  chunks: number;
  minTier: number;
  maxTier: number;
}

/** Dificuldade crescente: salas maiores e blocos mais difíceis a cada sala. */
export function roomOptions(room: number): RoomOptions {
  const maxTier = Math.min(5, 1 + Math.floor(room / 2));
  return { chunks: Math.min(9, 4 + Math.floor(room / 2)), minTier: Math.max(1, maxTier - 2), maxTier };
}

function pick<T>(random: () => number, list: readonly T[]): T {
  return list[Math.floor(random() * list.length)];
}

/** Escolhe a sequência de blocos de uma sala. */
export function chooseChunks(random: () => number, opts: RoomOptions): ChunkDef[] {
  const pool = CHUNKS.filter((c) => c.tier >= opts.minTier && c.tier <= opts.maxTier);
  const special = (id: string) => CHUNKS.find((c) => c.id === id)!;
  const middle: ChunkDef[] = [];
  for (let i = 0; i < opts.chunks; i++) {
    // Favorece os blocos mais difíceis do intervalo e evita repetir o anterior.
    const hard = pool.filter((c) => c.tier === opts.maxTier);
    let next = random() < 0.45 && hard.length > 0 ? pick(random, hard) : pick(random, pool);
    if (middle.length > 0 && next.id === middle[middle.length - 1].id) next = pick(random, pool);
    middle.push(next);
  }
  middle.splice(Math.floor(middle.length / 2), 0, special('checkpoint'));
  return [special('start'), ...middle, special('end')];
}

export function joinChunks(chunks: readonly ChunkDef[]): string[] {
  const rows: string[] = Array.from({ length: 17 }, () => '');
  for (const c of chunks) c.map.forEach((row, y) => (rows[y] += row));
  return rows;
}

export interface GeneratedRoom {
  level: LevelData;
  chunkIds: string[];
}

/** Fase do Desafio diário de uma data (AAAA-MM-DD). */
export function generateDaily(date: string): GeneratedRoom {
  const seed = `D${date.replace(/-/g, '')}`;
  const room = generateRoom(seed, 0, { chunks: 10, minTier: 2, maxTier: 4 });
  return { ...room, level: { ...room.level, name: date, par: Math.round(room.level.map[0].length * 0.55) } };
}

/** Gera a sala `room` (0, 1, 2...) de uma seed. */
export function generateRoom(seed: string, room: number, opts: RoomOptions = roomOptions(room)): GeneratedRoom {
  const random = mulberry32(hashString(`${seed}:${room}`));
  const chunks = chooseChunks(random, opts);
  const map = joinChunks(chunks);
  const usable = THEME_KEYS.filter((k) => !['reef'].includes(k)) as ThemeKey[];
  const theme = themeByKey(pick(random, usable));
  return {
    level: {
      id: 0,
      world: 0,
      name: `#${room + 1}`,
      subtitle: seed,
      par: Math.round(map[0].length * 0.6),
      theme,
      map,
    },
    chunkIds: chunks.map((c) => c.id),
  };
}

// ---------------------------------------------------------------------------
// Verificação: dá para terminar a sala?
// ---------------------------------------------------------------------------

/** Capacidades conservadoras (pulo + pulo duplo, sem habilidades). */
export const REACH = { up: 5, across: 6 };

const SOLID = new Set(['#', 'X', 'I', 'Q']);
const PLATFORM = new Set(['-', 'F']);

/**
 * Busca em largura entre lugares onde dá para ficar de pé, usando um modelo de pulo
 * "retangular" (sobe, atravessa na altura do ápice e desce) com alcance conservador.
 * Inimigos são ignorados; espinhos e buracos contam como obstáculos.
 */
export function isCompletable(map: readonly string[]): boolean {
  const h = map.length;
  const w = map[0]?.length ?? 0;
  const at = (x: number, y: number): string => (y < 0 ? '.' : (map[y]?.[x] ?? '#'));
  const solid = (x: number, y: number) => SOLID.has(at(x, y));
  const blocked = (x: number, y: number) => solid(x, y) || at(x, y) === '^';
  const standable = (x: number, y: number) => y < h - 1 && !blocked(x, y) && (SOLID.has(at(x, y + 1)) || PLATFORM.has(at(x, y + 1)));

  let start: [number, number] | null = null;
  let goal: [number, number] | null = null;
  const stands: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (at(x, y) === 'P') start = [x, y];
      if (at(x, y) === 'G') goal = [x, y];
      if (standable(x, y)) stands.push([x, y]);
    }
  }
  if (!start || !goal) return false;

  const clearColumn = (x: number, from: number, to: number) => {
    for (let r = Math.min(from, to); r <= Math.max(from, to); r++) if (blocked(x, r)) return false;
    return true;
  };
  const canMove = (x: number, y: number, x2: number, y2: number): boolean => {
    const dx = Math.abs(x2 - x);
    const up = y - y2;
    if (up > REACH.up) return false;
    const reach = up >= 0 ? REACH.across : REACH.across + Math.floor(-up / 2);
    if (dx > reach) return false;
    const step = x2 > x ? 1 : -1;
    // Tenta alturas de ápice possíveis, da mais baixa para a mais alta.
    for (let apex = Math.min(y, y2); apex >= y - REACH.up; apex--) {
      if (apex < 0) break;
      if (!clearColumn(x, apex, y) || !clearColumn(x2, apex, y2)) continue;
      let ok = true;
      for (let cx = x + step; cx !== x2; cx += step) {
        if (blocked(cx, apex)) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  };

  const key = (x: number, y: number) => y * w + x;
  const seen = new Set<number>([key(start[0], start[1])]);
  const queue: [number, number][] = [start];
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    if (x === goal[0] && y === goal[1]) return true;
    for (const [x2, y2] of stands) {
      if (Math.abs(x2 - x) > REACH.across + 8 || seen.has(key(x2, y2))) continue;
      if (canMove(x, y, x2, y2)) {
        seen.add(key(x2, y2));
        queue.push([x2, y2]);
      }
    }
    // A chegada também conta mesmo que não seja "de pé" num tile especial.
    if (!seen.has(key(goal[0], goal[1])) && canMove(x, y, goal[0], goal[1])) {
      seen.add(key(goal[0], goal[1]));
      queue.push(goal);
    }
  }
  return false;
}
