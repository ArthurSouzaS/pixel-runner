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
  it('possui 20 fases (4 mundos) com ids sequenciais', () => {
    expect(TOTAL_LEVELS).toBe(20);
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(LEVELS.map((l) => l.world)).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4]);
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

  it('nos mundos 1 a 3, só a última fase tem chefe e portão (o Mundo 4 termina com a fuga da lava)', () => {
    const bosses = LEVELS.map((l) => parseLevel(l.map).boss !== null);
    expect(bosses).toEqual(LEVELS.map((_, i) => i % 5 === 4 && i < 15));
    expect(LEVELS.filter((l) => l.boss).map((l) => l.boss)).toEqual(['core', 'storm', 'eclipse']);
    for (const i of [4, 9, 14]) expect(parseLevel(LEVELS[i].map).gate.length).toBeGreaterThan(0);
  });

  it('usa vários tipos de inimigo ao longo do jogo', () => {
    const kinds = new Set(LEVELS.flatMap((l) => parseLevel(l.map).enemies.map((e) => e.kind)));
    expect([...kinds].sort()).toEqual(['armored', 'bat', 'drone', 'ember', 'fish', 'hopper', 'turret', 'walker']);
  });

  it('o Mundo 4 apresenta as mecânicas vulcânicas', () => {
    const w4 = LEVELS.filter((l) => l.world === 4);
    expect(w4).toHaveLength(5);
    expect(w4.every((l) => parseLevel(l.map).lava.length > 0 || l.lavaTide)).toBe(true);
    expect(w4.some((l) => (l.geysers ?? []).length > 0)).toBe(true);
    expect(w4.some((l) => (l.conveyors ?? []).length > 0)).toBe(true);
    expect(w4.some((l) => parseLevel(l.map).enemies.some((e) => e.kind === 'ember'))).toBe(true);
    expect(w4.filter((l) => l.lavaTide).map((l) => l.id)).toEqual([19]);
    expect(w4.filter((l) => l.lavaChase).map((l) => l.id)).toEqual([20]);
  });

  it('gêiseres, esteiras e brasas ficam em lugares coerentes', () => {
    for (const l of LEVELS.filter((x) => x.world === 4)) {
      const map = l.map;
      for (const g of l.geysers ?? []) {
        // Bico apoiado no chão, sem nada sólido no caminho do fogo.
        expect(map[g.y + 1][g.x], `${l.name} gêiser ${g.x}`).toMatch(/[#X]/);
        for (let y = g.y - g.height + 1; y <= g.y; y++) expect(map[y][g.x], `${l.name} gêiser ${g.x},${y}`).not.toMatch(/[#XI]/);
      }
      for (const c of l.conveyors ?? []) {
        for (let x = c.x; x < c.x + c.width; x++) expect(map[c.y - 1][x], `${l.name} esteira ${x}`).not.toMatch(/[#XI]/);
        expect(Math.abs(c.speed)).toBeLessThan(140);
      }
      const p = parseLevel(map);
      for (const e of p.enemies.filter((x) => x.kind === 'ember')) expect(map[e.y + 1][e.x], `${l.name} brasa ${e.x}`).toBe('L');
      if (l.lavaChase) expect(l.lavaChase.speed).toBeLessThan(100);
    }
  });

  it('o Mundo 3 apresenta as mecânicas espaciais', () => {
    const w3 = LEVELS.filter((l) => l.world === 3);
    expect(w3.every((l) => (l.gravity ?? 1) < 1)).toBe(true);
    expect(w3.some((l) => parseLevel(l.map).flippers.length > 0)).toBe(true);
    expect(w3.some((l) => (l.portals ?? []).length > 0)).toBe(true);
    expect(w3.some((l) => (l.asteroids ?? []).length > 0)).toBe(true);
    expect(w3.some((l) => (l.lasers ?? []).length > 0)).toBe(true);
  });

  it('portais, asteroides e lasers ficam dentro do mapa', () => {
    for (const l of LEVELS) {
      const p = parseLevel(l.map);
      const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < p.width && y < p.height;
      for (const pt of l.portals ?? []) expect(inside(pt.ax, pt.ay) && inside(pt.bx, pt.by)).toBe(true);
      for (const a of l.asteroids ?? []) expect(inside(a.x, a.y) && inside(a.x + a.dx, a.y + a.dy)).toBe(true);
      for (const lz of l.lasers ?? []) {
        expect(inside(lz.x, lz.y)).toBe(true);
        expect(lz.vertical ? lz.y + lz.length : lz.x + lz.length).toBeLessThanOrEqual(lz.vertical ? p.height : p.width);
        expect(lz.on).toBeGreaterThan(0);
        expect(lz.off).toBeGreaterThan(500);
      }
    }
  });

  it('cada inversor de gravidade no chão tem um par no teto da mesma fase', () => {
    for (const l of LEVELS) {
      const flippers = parseLevel(l.map).flippers;
      const low = flippers.filter((f) => f.y > 8).length;
      const high = flippers.filter((f) => f.y <= 8).length;
      expect(high).toBe(low);
    }
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
