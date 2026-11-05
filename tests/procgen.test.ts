import { describe, expect, it } from 'vitest';
import { CHUNKS } from '../src/levels/chunks';
import { parseLevel, validateLevel } from '../src/logic/levelParser';
import {
  generateRoom,
  hashString,
  isCompletable,
  joinChunks,
  mulberry32,
  normalizeSeed,
  randomSeed,
  roomOptions,
} from '../src/logic/procgen';

describe('seeds', () => {
  it('o mesmo texto gera sempre os mesmos números', () => {
    const a = mulberry32(hashString('ABC123'));
    const b = mulberry32(hashString('ABC123'));
    const seqA = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(seqA);
    expect(Array.from({ length: 5 }, mulberry32(hashString('ABC124')))).not.toEqual(seqA);
  });

  it('cria seeds legíveis e limpa o que o jogador digita', () => {
    expect(randomSeed()).toMatch(/^[A-Z2-9]{6}$/);
    expect(normalizeSeed('  ab-12 c ')).toBe('AB12C');
    expect(normalizeSeed('!!!')).toBeNull();
  });
});

describe('blocos de fase', () => {
  it('todos conectam pelas bordas e têm 17 linhas', () => {
    for (const c of CHUNKS) {
      expect(c.map).toHaveLength(17);
      const w = c.map[0].length;
      expect(c.map.every((r) => r.length === w)).toBe(true);
      for (const x of [0, w - 1]) {
        expect(c.map[15][x] + c.map[16][x]).toBe('##');
        for (let y = 0; y < 15; y++) expect('.o').toContain(c.map[y][x]);
      }
    }
  });

  it('cada bloco é possível de atravessar sozinho', () => {
    const start = CHUNKS.find((c) => c.id === 'start')!;
    const end = CHUNKS.find((c) => c.id === 'end')!;
    for (const c of CHUNKS.filter((c) => c.tier > 0)) {
      expect(isCompletable(joinChunks([start, c, end])), c.id).toBe(true);
    }
  });

  it('há blocos em todos os níveis de dificuldade', () => {
    for (let tier = 1; tier <= 5; tier++) expect(CHUNKS.filter((c) => c.tier === tier).length).toBeGreaterThanOrEqual(3);
  });
});

describe('geração de salas', () => {
  it('a mesma seed gera sempre a mesma sala', () => {
    expect(generateRoom('PIXEL1', 3)).toEqual(generateRoom('PIXEL1', 3));
    expect(generateRoom('PIXEL1', 3).level.map).not.toEqual(generateRoom('PIXEL2', 3).level.map);
    expect(generateRoom('PIXEL1', 3).level.map).not.toEqual(generateRoom('PIXEL1', 4).level.map);
  });

  it('a dificuldade cresce com as salas', () => {
    expect(roomOptions(0)).toEqual({ chunks: 4, minTier: 1, maxTier: 1 });
    expect(roomOptions(8).maxTier).toBe(5);
    expect(roomOptions(30).chunks).toBeLessThanOrEqual(9);
    const w0 = generateRoom('GROW', 0).level.map[0].length;
    const w9 = generateRoom('GROW', 9).level.map[0].length;
    expect(w9).toBeGreaterThan(w0);
  });

  it('toda sala gerada é válida e possível de terminar', () => {
    for (let s = 0; s < 60; s++) {
      const seed = randomSeed(mulberry32(s + 1));
      for (const room of [0, 1, 3, 6, 10]) {
        const { level } = generateRoom(seed, room);
        expect(validateLevel(parseLevel(level.map)), `${seed}#${room}`).toEqual([]);
        expect(isCompletable(level.map), `${seed}#${room}`).toBe(true);
      }
    }
  });

  it('o verificador detecta salas impossíveis', () => {
    const start = CHUNKS.find((c) => c.id === 'start')!;
    const end = CHUNKS.find((c) => c.id === 'end')!;
    const wall = { id: 'x', tier: 1, map: Array.from({ length: 17 }, (_, y) => (y >= 15 ? '#'.repeat(5) : y >= 2 ? '..X..' : '.....')) };
    expect(isCompletable(joinChunks([start, wall, end]))).toBe(false);
    const pit = { id: 'y', tier: 1, map: Array.from({ length: 17 }, (_, y) => (y >= 15 ? '#' + '.'.repeat(12) + '#' : '.'.repeat(14))) };
    expect(isCompletable(joinChunks([start, pit, end]))).toBe(false);
  });
});

describe('power-ups e placar do Infinito', async () => {
  const { powerUpChoices, powerUpEffects, addInfiniteEntry, sanitizeInfiniteBoard, INFINITE_BOARD_SIZE } = await import('../src/logic/powerups');

  it('oferece 3 power-ups diferentes, sempre os mesmos para a mesma seed', () => {
    const a = powerUpChoices('SEED', 2);
    expect(new Set(a).size).toBe(3);
    expect(powerUpChoices('SEED', 2)).toEqual(a);
  });

  it('cada power-up tem um efeito', () => {
    expect(powerUpEffects('jump').jumpScale).toBeGreaterThan(1);
    expect(powerUpEffects('speed').speedScale).toBeGreaterThan(1);
    expect(powerUpEffects('slow').enemyScale).toBeLessThan(1);
    expect(powerUpEffects('shield').shield).toBe(true);
    expect(powerUpEffects('magnet').magnet).toBe(true);
    expect(powerUpEffects(null)).toEqual({ jumpScale: 1, speedScale: 1, enemyScale: 1, shield: false, magnet: false });
  });

  it('o placar guarda as melhores corridas', () => {
    let board = addInfiniteEntry([], { seed: 'A', rooms: 2, score: 900, date: '2026-01-01' });
    board = addInfiniteEntry(board, { seed: 'B', rooms: 5, score: 100, date: '2026-01-01' });
    board = addInfiniteEntry(board, { seed: 'C', rooms: 2, score: 1200, date: '2026-01-01' });
    expect(board.map((e) => e.seed)).toEqual(['B', 'C', 'A']);
    for (let i = 0; i < 10; i++) board = addInfiniteEntry(board, { seed: 'X', rooms: 0, score: i, date: '2026-01-01' });
    expect(board).toHaveLength(INFINITE_BOARD_SIZE);
    expect(sanitizeInfiniteBoard([{ seed: 'Z', rooms: 1.7, score: -3, date: '2026-01-02T10' }, { nope: 1 }])).toEqual([{ seed: 'Z', rooms: 1, score: 0, date: '2026-01-02' }]);
  });
});
