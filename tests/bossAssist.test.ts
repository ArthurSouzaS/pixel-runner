import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { parseLevel } from '../src/logic/levelParser';
import { BOSS_ASSIST_EVERY_MS, BOSS_ASSIST_FIRST_MS, BossAssistSchedule } from '../src/logic/bossAssist';
import { mulberry32 } from '../src/logic/procgen';

const spots = [{ x: 10, y: 5 }, { x: 20, y: 5 }, { x: 30, y: 9 }];

describe('orbes de energia nas lutas de chefe', () => {
  it('não aparece nada antes da luta nem antes do primeiro intervalo', () => {
    const s = new BossAssistSchedule({ spots });
    expect(s.update(100000)).toBeNull();
    s.start(1000);
    expect(s.update(1000 + BOSS_ASSIST_FIRST_MS - 1)).toBeNull();
    expect(s.update(1000 + BOSS_ASSIST_FIRST_MS)).not.toBeNull();
  });

  it('só existe um orbe por vez; o próximo vem depois de pegar o atual', () => {
    const s = new BossAssistSchedule({ spots }, mulberry32(3));
    s.start(0);
    expect(s.update(BOSS_ASSIST_FIRST_MS)).not.toBeNull();
    expect(s.update(BOSS_ASSIST_FIRST_MS + 60000)).toBeNull();
    s.collected(20000);
    expect(s.update(20000 + BOSS_ASSIST_EVERY_MS - 1)).toBeNull();
    expect(s.update(20000 + BOSS_ASSIST_EVERY_MS)).not.toBeNull();
  });

  it('nunca repete a mesma plataforma duas vezes seguidas', () => {
    const s = new BossAssistSchedule({ spots, firstMs: 0, everyMs: 0 }, mulberry32(9));
    s.start(0);
    let prev = -1;
    for (let i = 0; i < 200; i++) {
      s.update(i);
      expect(s.active).not.toBe(prev);
      prev = s.active!;
      s.collected(i);
    }
  });

  it('parar cancela o orbe e os próximos', () => {
    const s = new BossAssistSchedule({ spots, firstMs: 0 });
    s.start(0);
    s.update(0);
    s.stop();
    expect(s.active).toBeNull();
    expect(s.update(1e9)).toBeNull();
  });

  it('as fases 10 e 15 têm orbes, sempre em cima de plataformas livres da arena', () => {
    for (const index of [9, 14]) {
      const level = LEVELS[index];
      expect(level.bossAssist?.spots.length, level.name).toBeGreaterThanOrEqual(3);
      const map = level.map;
      for (const spot of level.bossAssist!.spots) {
        const tx = Math.floor(spot.x);
        // O orbe fica num espaço vazio, com uma plataforma logo abaixo.
        expect(map[spot.y][tx], `${level.name} ${spot.x},${spot.y}`).toBe('.');
        expect(map[spot.y + 1][tx], `${level.name} ${spot.x},${spot.y}`).toBe('-');
        // E dentro da arena (depois do portão do chefe).
        expect(tx).toBeGreaterThan(parseLevel(map).gate[0].x);
      }
    }
  });
});
