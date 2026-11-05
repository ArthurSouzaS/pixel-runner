import { beforeEach, describe, expect, it } from 'vitest';
import {
  SAVE_KEY,
  type StorageLike,
  defaultSave,
  loadSave,
  recordLevelClear,
  sanitizeSave,
  submitScore,
  writeSave,
} from '../src/logic/save';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const TOTAL = 5;

describe('save no localStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('retorna o save padrão quando não há nada salvo', () => {
    expect(loadSave(storage, TOTAL)).toEqual(defaultSave());
    expect(loadSave(null, TOTAL)).toEqual(defaultSave());
  });

  it('grava e lê os dados de volta', () => {
    const save = { ...defaultSave(), highScore: 4200, unlockedLevels: 3, bestTimes: { 0: 41.5 }, muted: true };
    expect(writeSave(storage, save)).toBe(true);
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
    expect(loadSave(storage, TOTAL)).toEqual(save);
  });

  it('ignora JSON corrompido', () => {
    storage.setItem(SAVE_KEY, '{nao-e-json');
    expect(loadSave(storage, TOTAL)).toEqual(defaultSave());
  });

  it('não quebra se o armazenamento lançar erro', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('cota cheia');
      },
    };
    expect(loadSave(broken, TOTAL)).toEqual(defaultSave());
    expect(writeSave(broken, defaultSave())).toBe(false);
  });

  it('corrige valores inválidos', () => {
    const save = sanitizeSave(
      { highScore: -50, unlockedLevels: 99, bestTimes: { 0: 30, 1: -4, 7: 10, foo: 3 }, muted: 'sim' },
      TOTAL,
    );
    expect(save.highScore).toBe(0);
    expect(save.unlockedLevels).toBe(TOTAL);
    expect(save.bestTimes).toEqual({ 0: 30 });
    expect(save.muted).toBe(false);
    expect(sanitizeSave('texto', TOTAL)).toEqual(defaultSave());
  });
});

describe('recorde', () => {
  it('atualiza apenas quando a pontuação é maior', () => {
    const save = { ...defaultSave(), highScore: 1000 };
    expect(submitScore(save, 500)).toEqual({ save, isNewRecord: false });
    expect(submitScore(save, 1000).isNewRecord).toBe(false);
    const result = submitScore(save, 1500);
    expect(result.isNewRecord).toBe(true);
    expect(result.save.highScore).toBe(1500);
    expect(save.highScore).toBe(1000);
  });
});

describe('recordLevelClear', () => {
  it('desbloqueia a próxima fase e guarda o melhor tempo', () => {
    const first = recordLevelClear(defaultSave(), 0, 60, TOTAL);
    expect(first.save.unlockedLevels).toBe(2);
    expect(first.save.bestTimes[0]).toBe(60);
    expect(first.isBestTime).toBe(true);

    const slower = recordLevelClear(first.save, 0, 75, TOTAL);
    expect(slower.isBestTime).toBe(false);
    expect(slower.save.bestTimes[0]).toBe(60);

    const faster = recordLevelClear(slower.save, 0, 52, TOTAL);
    expect(faster.isBestTime).toBe(true);
    expect(faster.save.bestTimes[0]).toBe(52);
  });
});

describe('migração para a versão 3', () => {
  it('quem zerou a v2 (fase 10) ganha acesso ao Mundo 3', () => {
    const storage = new MemoryStorage();
    const times = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i, 60 + i]));
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 2, unlockedLevels: 10, bestTimes: times, abilities: ['wallClimb', 'glide', 'charge'], wallet: 50 }));
    const save = loadSave(storage, 15);
    expect(save.version).toBe(3);
    expect(save.unlockedLevels).toBe(11);
    expect(save.abilities).toEqual(['wallClimb', 'glide', 'charge']);
    expect(save.wallet).toBe(50);
  });

  it('não libera nada a mais para quem não concluiu a última fase liberada', () => {
    const save = sanitizeSave({ version: 2, unlockedLevels: 7, bestTimes: { 0: 30, 1: 40, 2: 50, 3: 60, 4: 70, 5: 80 } }, 15);
    expect(save.unlockedLevels).toBe(7);
  });

  it('nunca passa do total de fases', () => {
    const times = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [i, 60]));
    expect(sanitizeSave({ unlockedLevels: 15, bestTimes: times }, 15).unlockedLevels).toBe(15);
  });
});

describe('save da versão 2', () => {
  const TOTAL_V2 = 10;

  it('migra um save da v1 mantendo o progresso e criando os campos novos', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, highScore: 9000, unlockedLevels: 5, bestTimes: { 0: 40, 4: 120 }, muted: true }));
    const save = loadSave(storage, TOTAL_V2);
    // A fase 5 (índice 4) foi concluída, então a 6 é liberada pela migração.
    expect(save).toMatchObject({ version: 3, highScore: 9000, unlockedLevels: 6, bestTimes: { 0: 40, 4: 120 }, muted: true });
    expect(save.abilities).toEqual([]);
    expect(save.wallet).toBe(0);
    expect(save.equippedSkin).toBe('classic');
    expect(save.achievements).toEqual([]);
    expect(save.stats.jumps).toBe(0);
    expect(save.volumes).toEqual(defaultSave().volumes);
  });

  it('grava e lê todos os campos sem perdas', () => {
    const storage = new MemoryStorage();
    const save = {
      ...defaultSave(),
      highScore: 12345,
      unlockedLevels: 8,
      bestTimes: { 0: 30, 6: 99.5 },
      abilities: ['wallClimb', 'glide'] as ('wallClimb' | 'glide' | 'charge')[],
      wallet: 321,
      ownedSkins: ['classic', 'ruby'],
      equippedSkin: 'ruby',
      ownedTrails: ['none', 'stars'],
      equippedTrail: 'stars',
      achievements: ['first-steps', 'climber'],
      stats: { ...defaultSave().stats, jumps: 77, playSeconds: 600 },
      volumes: { master: 0.5, music: 0.3, sfx: 1 },
    };
    writeSave(storage, save);
    expect(loadSave(storage, TOTAL_V2)).toEqual(save);
  });

  it('desbloqueia as 10 fases em sequência sem passar do total', () => {
    let save = defaultSave();
    for (let i = 0; i < TOTAL_V2; i++) save = recordLevelClear(save, i, 60, TOTAL_V2).save;
    expect(save.unlockedLevels).toBe(TOTAL_V2);
    expect(Object.keys(save.bestTimes)).toHaveLength(TOTAL_V2);
  });

  it('descarta melhores tempos de fases que não existem', () => {
    const save = sanitizeSave({ bestTimes: { 9: 50, 10: 40 } }, TOTAL_V2);
    expect(save.bestTimes).toEqual({ 9: 50 });
  });
});

describe('migração completa de saves antigos para a v3', () => {
  const TOTAL_V3 = 15;
  /** Save típico de quem jogou a parte 2 inteira (formato gravado pela v2). */
  const v2Save = {
    version: 2,
    highScore: 48210,
    unlockedLevels: 10,
    bestTimes: { 0: 31.2, 1: 44, 5: 70.5, 9: 182.4 },
    muted: false,
    abilities: ['wallClimb', 'glide', 'charge'],
    wallet: 1234,
    ownedSkins: ['classic', 'ruby', 'gold'],
    equippedSkin: 'gold',
    ownedTrails: ['none', 'fire'],
    equippedTrail: 'fire',
    stats: { jumps: 5400, dashes: 800, coins: 2100 },
    achievements: ['first-steps', 'coins-100'],
    volumes: { master: 0.6, music: 0.3, sfx: 0.9 },
  };

  it('mantém tudo da parte 2, libera o Mundo 3 e cria os campos novos', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify(v2Save));
    const save = loadSave(storage, TOTAL_V3);
    expect(save).toMatchObject({
      version: 3,
      highScore: 48210,
      unlockedLevels: 11,
      bestTimes: { 0: 31.2, 1: 44, 5: 70.5, 9: 182.4 },
      abilities: ['wallClimb', 'glide', 'charge'],
      wallet: 1234,
      ownedSkins: ['classic', 'ruby', 'gold'],
      equippedSkin: 'gold',
      ownedTrails: ['none', 'fire'],
      equippedTrail: 'fire',
      achievements: ['first-steps', 'coins-100'],
      volumes: { master: 0.6, music: 0.3, sfx: 0.9 },
    });
    expect(save.stats.jumps).toBe(5400);
    expect(save.stats.coins).toBe(2100);
    const fresh = defaultSave();
    expect(save.storySeen).toEqual([]);
    expect(save.missions).toEqual(fresh.missions);
    expect(save.infinite).toEqual([]);
    expect(save.daily).toEqual(fresh.daily);
    expect(save.speedrun).toEqual({});
    expect(save.access).toEqual(fresh.access);
    expect(save.lang).toBe('');
  });

  it('a migração é estável: migrar de novo não muda nada', () => {
    const once = sanitizeSave(v2Save, TOTAL_V3);
    const twice = sanitizeSave(JSON.parse(JSON.stringify(once)), TOTAL_V3);
    expect(twice).toEqual(once);
  });

  it('gravar e ler o save migrado preserva tudo', () => {
    const storage = new MemoryStorage();
    const migrated = sanitizeSave(v2Save, TOTAL_V3);
    writeSave(storage, migrated);
    expect(loadSave(storage, TOTAL_V3)).toEqual(migrated);
  });

  it('campos com tipos errados voltam ao padrão sem perder o resto', () => {
    const broken = { ...v2Save, wallet: 'muito', stats: 'x', achievements: [1, null, 'first-steps'], access: 42, missions: [], daily: 'hoje', speedrun: null, lang: 'fr' };
    const save = sanitizeSave(broken, TOTAL_V3);
    const fresh = defaultSave();
    expect(save.highScore).toBe(48210);
    expect(save.wallet).toBe(0);
    expect(save.stats).toEqual(fresh.stats);
    expect(save.achievements).toEqual(['first-steps']);
    expect(save.access).toEqual(fresh.access);
    expect(save.missions).toEqual(fresh.missions);
    expect(save.daily).toEqual(fresh.daily);
    expect(save.speedrun).toEqual({});
    expect(save.lang).toBe('');
  });
});
