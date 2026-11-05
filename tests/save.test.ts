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

describe('save da versão 2', () => {
  const TOTAL_V2 = 10;

  it('migra um save da v1 mantendo o progresso e criando os campos novos', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, highScore: 9000, unlockedLevels: 5, bestTimes: { 0: 40, 4: 120 }, muted: true }));
    const save = loadSave(storage, TOTAL_V2);
    expect(save).toMatchObject({ version: 2, highScore: 9000, unlockedLevels: 5, bestTimes: { 0: 40, 4: 120 }, muted: true });
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
      bestTimes: { 0: 30, 7: 99.5 },
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
