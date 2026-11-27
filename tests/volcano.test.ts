import { describe, expect, it } from 'vitest';
import { GEYSER_WARNING_MS, chaseWallX, geyserRect, geyserStateAt, tideSurfaceY } from '../src/logic/volcano';
import { parseLevel } from '../src/logic/levelParser';

describe('Mundo 4: mecânicas vulcânicas', () => {
  it('gêiser: ligado, desligado e aviso antes de disparar', () => {
    const g = { on: 1000, off: 2000, offset: 0 };
    expect(geyserStateAt(g, 0)).toBe('on');
    expect(geyserStateAt(g, 999)).toBe('on');
    expect(geyserStateAt(g, 1500)).toBe('off');
    expect(geyserStateAt(g, 3000 - GEYSER_WARNING_MS)).toBe('warning');
    expect(geyserStateAt(g, 3000)).toBe('on');
    expect(geyserStateAt({ ...g, offset: 1000 }, 0)).toBe('off');
  });

  it('o fogo do gêiser sobe a partir do bico', () => {
    const r = geyserRect({ x: 10, y: 14, height: 5 });
    expect(r.y + r.height).toBe(14 * 16 + 8);
    expect(r.height).toBe(80);
    expect(r.x).toBeGreaterThan(160);
    expect(r.x + r.width).toBeLessThan(176);
  });

  it('maré de lava oscila entre a linha mais baixa e a mais alta', () => {
    const tide = { low: 16, high: 11, period: 8 };
    expect(tideSurfaceY(tide, 0)).toBeCloseTo(16 * 16);
    expect(tideSurfaceY(tide, 4)).toBeCloseTo(11 * 16);
    expect(tideSurfaceY(tide, 8)).toBeCloseTo(16 * 16);
    for (let s = 0; s < 16; s += 0.37) {
      const y = tideSurfaceY(tide, s);
      expect(y).toBeGreaterThanOrEqual(11 * 16 - 0.001);
      expect(y).toBeLessThanOrEqual(16 * 16 + 0.001);
    }
  });

  it('parede de lava espera e depois avança em velocidade constante', () => {
    const chase = { speed: 70, delay: 2, gap: 10 };
    expect(chaseWallX(chase, 100, 0)).toBe(100);
    expect(chaseWallX(chase, 100, 2)).toBe(100);
    expect(chaseWallX(chase, 100, 4)).toBe(240);
  });

  it('o mapa reconhece lava (L) e brasas (e)', () => {
    const map = Array.from({ length: 17 }, (_, y) => (y === 14 ? 'P....e..G' : y === 15 ? '###LLL###' : y === 16 ? '#########' : '.........'));
    const p = parseLevel(map);
    expect(p.lava).toEqual([{ x: 3, y: 15 }, { x: 4, y: 15 }, { x: 5, y: 15 }]);
    expect(p.enemies).toEqual([{ kind: 'ember', x: 5, y: 14 }]);
    expect(p.tiles[15][3]).toBe(-1);
  });
});
