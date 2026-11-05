/**
 * Regras de progressão entre fases (desbloqueio e sequência).
 * Módulo puro, sem dependência do Phaser.
 */

/** Quantidade de fases desbloqueadas (mínimo 1, máximo total). */
export function clampUnlocked(unlocked: number, totalLevels: number): number {
  if (!Number.isFinite(unlocked)) return 1;
  return Math.max(1, Math.min(totalLevels, Math.floor(unlocked)));
}

export function isLevelUnlocked(levelIndex: number, unlocked: number): boolean {
  return levelIndex >= 0 && levelIndex < unlocked;
}

/** Retorna quantas fases ficam desbloqueadas após concluir `clearedIndex`. */
export function unlockAfterClear(unlocked: number, clearedIndex: number, totalLevels: number): number {
  const next = clearedIndex + 2; // índice base 0 -> contagem base 1, mais a próxima fase
  return clampUnlocked(Math.max(unlocked, next), totalLevels);
}

/** Próxima fase, ou `null` se a fase concluída foi a última. */
export function nextLevelIndex(clearedIndex: number, totalLevels: number): number | null {
  const next = clearedIndex + 1;
  return next < totalLevels ? next : null;
}

export function isFinalLevel(levelIndex: number, totalLevels: number): boolean {
  return levelIndex === totalLevels - 1;
}
