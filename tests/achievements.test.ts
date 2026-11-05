import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  type AchievementContext,
  achievementProgress,
  findAchievement,
  newlyUnlocked,
  sanitizeAchievements,
} from '../src/logic/achievements';
import { defaultSave, sanitizeSave } from '../src/logic/save';
import { STAT_KEYS, STAT_LABELS, addStat, emptyStats, formatStat, maxStat, sanitizeStats } from '../src/logic/stats';

function ctx(partial: Partial<AchievementContext> = {}): AchievementContext {
  return { stats: emptyStats(), unlockedLevels: 1, abilities: [], ownedSkins: ['classic'], ownedTrails: ['none'], ...partial };
}

describe('estatísticas', () => {
  it('começam zeradas e somam valores positivos', () => {
    const stats = emptyStats();
    expect(STAT_KEYS.every((k) => stats[k] === 0)).toBe(true);
    expect(addStat(stats, 'jumps').jumps).toBe(1);
    expect(addStat(stats, 'coins', 5).coins).toBe(5);
    expect(addStat(stats, 'coins', -2)).toBe(stats);
  });

  it('guarda o maior valor em estatísticas de máximo', () => {
    let stats = maxStat(emptyStats(), 'maxCombo', 3);
    expect(stats.maxCombo).toBe(3);
    stats = maxStat(stats, 'maxCombo', 2);
    expect(stats.maxCombo).toBe(3);
  });

  it('formata o tempo de jogo', () => {
    expect(formatStat('playSeconds', 75)).toBe('1min 15s');
    expect(formatStat('playSeconds', 3725)).toBe('1h 02min');
    expect(formatStat('coins', 12.7)).toBe('12');
  });

  it('todas as estatísticas exibidas existem', () => {
    for (const [key] of STAT_LABELS) expect(STAT_KEYS).toContain(key);
  });

  it('descarta valores inválidos ao ler o save', () => {
    const stats = sanitizeStats({ jumps: 10, coins: -3, deaths: 'muitas', foo: 9 });
    expect(stats.jumps).toBe(10);
    expect(stats.coins).toBe(0);
    expect(stats.deaths).toBe(0);
    expect(sanitizeStats(null)).toEqual(emptyStats());
  });
});

describe('conquistas', () => {
  it('há pelo menos 15 conquistas com ids únicos e textos', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
    }
  });

  it('nenhuma é desbloqueada num save novo', () => {
    expect(newlyUnlocked(ctx(), [])).toEqual([]);
  });

  it('desbloqueia conforme as estatísticas', () => {
    let stats = addStat(emptyStats(), 'levelsCleared');
    stats = addStat(stats, 'coins', 120);
    const fresh = newlyUnlocked(ctx({ stats }), []);
    expect(fresh).toContain('first-steps');
    expect(fresh).toContain('coins-100');
    expect(fresh).not.toContain('coins-500');
  });

  it('não repete conquistas já desbloqueadas', () => {
    const stats = addStat(emptyStats(), 'levelsCleared');
    expect(newlyUnlocked(ctx({ stats }), ['first-steps'])).toEqual([]);
  });

  it('usa progresso, habilidades e compras', () => {
    const fresh = newlyUnlocked(ctx({ unlockedLevels: 6, abilities: ['wallClimb', 'glide', 'charge'], ownedSkins: ['classic', 'gold'] }), []);
    expect(fresh).toEqual(expect.arrayContaining(['world-1', 'climber', 'all-abilities', 'shopper']));
  });

  it('cada conquista pode ser alcançada', () => {
    const stats = emptyStats();
    for (const key of STAT_KEYS) stats[key] = 10_000;
    const all = newlyUnlocked(ctx({ stats, unlockedLevels: 15, abilities: ['wallClimb', 'glide', 'charge'], ownedSkins: ['classic', 'gold'], ownedTrails: ['none'] }), []);
    expect(all).toHaveLength(ACHIEVEMENTS.length);
  });

  it('valida a lista salva e calcula o progresso', () => {
    expect(sanitizeAchievements(['coop', 'coop', 'nada', 3])).toEqual(['coop']);
    expect(sanitizeAchievements('coop')).toEqual([]);
    expect(achievementProgress(['coop', 'nada'])).toEqual({ done: 1, total: ACHIEVEMENTS.length });
    expect(findAchievement('race')?.name).toBe('Pé na tábua');
  });

  it('o save guarda estatísticas e conquistas', () => {
    expect(defaultSave().achievements).toEqual([]);
    const save = sanitizeSave({ achievements: ['editor'], stats: { jumps: 4 } }, 10);
    expect(save.achievements).toEqual(['editor']);
    expect(save.stats.jumps).toBe(4);
  });
});
