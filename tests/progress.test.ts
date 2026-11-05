import { describe, expect, it } from 'vitest';
import { clampUnlocked, isFinalLevel, isLevelUnlocked, nextLevelIndex, unlockAfterClear } from '../src/logic/progress';

describe('progresso entre fases', () => {
  it('sempre deixa ao menos a primeira fase desbloqueada', () => {
    expect(clampUnlocked(0, 5)).toBe(1);
    expect(clampUnlocked(Number.NaN, 5)).toBe(1);
    expect(clampUnlocked(9, 5)).toBe(5);
  });

  it('verifica se uma fase está liberada', () => {
    expect(isLevelUnlocked(0, 1)).toBe(true);
    expect(isLevelUnlocked(1, 1)).toBe(false);
    expect(isLevelUnlocked(2, 3)).toBe(true);
    expect(isLevelUnlocked(-1, 3)).toBe(false);
  });

  it('desbloqueia a próxima fase ao concluir', () => {
    expect(unlockAfterClear(1, 0, 5)).toBe(2);
    expect(unlockAfterClear(2, 1, 5)).toBe(3);
  });

  it('não perde progresso ao repetir uma fase antiga', () => {
    expect(unlockAfterClear(4, 0, 5)).toBe(4);
  });

  it('não passa do total de fases', () => {
    expect(unlockAfterClear(5, 4, 5)).toBe(5);
  });

  it('indica a próxima fase ou o fim do jogo', () => {
    expect(nextLevelIndex(0, 5)).toBe(1);
    expect(nextLevelIndex(4, 5)).toBeNull();
    expect(isFinalLevel(4, 5)).toBe(true);
    expect(isFinalLevel(3, 5)).toBe(false);
  });
});
