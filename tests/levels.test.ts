import { describe, expect, it } from 'vitest';
import { LEVELS, TOTAL_LEVELS } from '../src/levels';
import { TileIndex, parseLevel, tileCenter, validateLevel } from '../src/logic/levelParser';

describe('parseLevel', () => {
  const sample = ['..o..', 'P.w.G', '##-##'];

  it('mede o mapa e encontra os elementos', () => {
    const level = parseLevel(sample);
    expect(level.width).toBe(5);
    expect(level.height).toBe(3);
    expect(level.start).toEqual({ x: 0, y: 1 });
    expect(level.goal).toEqual({ x: 4, y: 1 });
    expect(level.coins).toEqual([{ x: 2, y: 0 }]);
    expect(level.enemies).toEqual([{ kind: 'walker', x: 2, y: 1 }]);
  });

  it('usa tile de topo apenas na superfície do chão', () => {
    const level = parseLevel(['#', '#', '#']);
    expect(level.tiles.map((row) => row[0])).toEqual([TileIndex.Top, TileIndex.Fill, TileIndex.Fill]);
  });

  it('completa linhas curtas com vazio', () => {
    const level = parseLevel(['P..', '#']);
    expect(level.tiles[1]).toEqual([TileIndex.Top, TileIndex.Empty, TileIndex.Empty]);
  });

  it('valida problemas comuns', () => {
    expect(validateLevel(parseLevel(sample))).toEqual([]);
    expect(validateLevel(parseLevel(['....', '####']))).toContain('fase sem ponto de início (P)');
    expect(validateLevel(parseLevel(['G..P', '####']))).toContain('chegada antes do início');
    expect(validateLevel(parseLevel(['P.|G', '####']))).toContain('portão sem chefe');
  });

  it('converte tile para pixels', () => {
    expect(tileCenter({ x: 2, y: 3 })).toEqual({ x: 40, y: 56 });
  });
});

describe('fases do jogo', () => {
  it('possui 10 fases (2 mundos) com ids sequenciais', () => {
    expect(TOTAL_LEVELS).toBe(10);
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(LEVELS.map((l) => l.world)).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 2]);
  });

  it.each(LEVELS.map((l) => [l.name, l] as const))('%s é válida', (_name, data) => {
    const level = parseLevel(data.map);
    expect(validateLevel(level)).toEqual([]);
    expect(level.height).toBe(17);
    expect(data.map.every((row) => row.length === level.width)).toBe(true);
    expect(level.coins.length).toBeGreaterThan(10);
    expect(level.enemies.length).toBeGreaterThan(0);
    expect(level.checkpoints.length).toBeGreaterThan(0);
    for (const mover of data.movers ?? []) {
      expect(mover.x + mover.width + Math.max(0, mover.dx)).toBeLessThanOrEqual(level.width);
      expect(mover.period).toBeGreaterThan(0);
    }
  });

  it('dificuldade cresce: mais inimigos e fases maiores', () => {
    const parsed = LEVELS.slice(0, 4).map((l) => parseLevel(l.map));
    for (let i = 1; i < parsed.length; i++) {
      expect(parsed[i].enemies.length).toBeGreaterThanOrEqual(parsed[i - 1].enemies.length);
      expect(parsed[i].width).toBeGreaterThanOrEqual(parsed[i - 1].width);
    }
    // O Mundo 2 é mais difícil: o tempo de referência médio é maior que o do Mundo 1.
    const avgPar = (w: number) => LEVELS.filter((l) => l.world === w).reduce((a, l) => a + l.par, 0) / 5;
    expect(avgPar(2)).toBeGreaterThan(avgPar(1));
  });

  it('apenas a última fase de cada mundo tem chefe e portão', () => {
    const bosses = LEVELS.map((l) => parseLevel(l.map).boss !== null);
    expect(bosses).toEqual([false, false, false, false, true, false, false, false, false, true]);
    expect(LEVELS.map((l) => l.boss ?? null)).toEqual([null, null, null, null, 'core', null, null, null, null, 'storm']);
    for (const i of [4, 9]) expect(parseLevel(LEVELS[i].map).gate.length).toBeGreaterThan(0);
  });

  it('usa vários tipos de inimigo ao longo do jogo', () => {
    const kinds = new Set(LEVELS.flatMap((l) => parseLevel(l.map).enemies.map((e) => e.kind)));
    expect([...kinds].sort()).toEqual(['armored', 'bat', 'fish', 'hopper', 'turret', 'walker']);
  });

  it('o Mundo 2 apresenta as mecânicas novas', () => {
    const w2 = LEVELS.filter((l) => l.world === 2);
    const parsed = w2.map((l) => parseLevel(l.map));
    expect(parsed.some((p) => p.tiles.some((row) => row.includes(TileIndex.Ice)))).toBe(true);
    expect(parsed.some((p) => p.springs.length > 0)).toBe(true);
    expect(parsed.some((p) => p.fallers.length > 0)).toBe(true);
    expect(w2.some((l) => (l.water ?? []).length > 0)).toBe(true);
    expect(w2.some((l) => (l.winds ?? []).some((w) => w.vx !== 0))).toBe(true);
    expect(w2.some((l) => (l.winds ?? []).some((w) => w.vy < 0))).toBe(true);
  });

  it('regiões de água e vento ficam dentro do mapa', () => {
    for (const l of LEVELS) {
      const p = parseLevel(l.map);
      for (const r of [...(l.water ?? []), ...(l.winds ?? [])]) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(p.width);
        expect(r.y + r.h).toBeLessThanOrEqual(p.height);
      }
    }
  });

  it('reconhece gelo, molas, plataformas que caem e peixes', () => {
    const level = parseLevel(['P.S.F.f', 'IIIIIII']);
    expect(level.springs).toEqual([{ x: 2, y: 0 }]);
    expect(level.fallers).toEqual([{ x: 4, y: 0 }]);
    expect(level.enemies).toEqual([{ kind: 'fish', x: 6, y: 0 }]);
    expect(level.tiles[1].every((t) => t === TileIndex.Ice)).toBe(true);
  });
});
