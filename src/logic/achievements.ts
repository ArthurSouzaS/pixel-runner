/**
 * Conquistas: cada uma é uma condição sobre as estatísticas e o progresso salvo.
 * Módulo puro.
 */
import type { PlayerStats } from './stats';

/** Parte do save que as conquistas consultam. */
export interface AchievementContext {
  stats: PlayerStats;
  unlockedLevels: number;
  abilities: readonly string[];
  ownedSkins: readonly string[];
  ownedTrails: readonly string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-steps', name: 'Primeiros passos', description: 'Conclua sua primeira fase.', check: (c) => c.stats.levelsCleared >= 1 },
  { id: 'coins-100', name: 'Cofrinho', description: 'Colete 100 moedas.', check: (c) => c.stats.coins >= 100 },
  { id: 'coins-500', name: 'Tesouro', description: 'Colete 500 moedas.', check: (c) => c.stats.coins >= 500 },
  { id: 'enemies-25', name: 'Caçador', description: 'Derrote 25 inimigos.', check: (c) => c.stats.enemies >= 25 },
  { id: 'enemies-150', name: 'Exterminador', description: 'Derrote 150 inimigos.', check: (c) => c.stats.enemies >= 150 },
  { id: 'combo-4', name: 'Combo quádruplo', description: 'Pise em 4 inimigos sem tocar o chão.', check: (c) => c.stats.maxCombo >= 4 },
  { id: 'boss-core', name: 'Núcleo desligado', description: 'Derrote o Núcleo Ancestral.', check: (c) => c.stats.bossCore >= 1 },
  { id: 'boss-storm', name: 'Céu limpo', description: 'Derrote a Tempestade Rubra.', check: (c) => c.stats.bossStorm >= 1 },
  { id: 'world-1', name: 'Terras de Pix', description: 'Conclua o Mundo 1.', check: (c) => c.unlockedLevels >= 6 },
  { id: 'world-2', name: 'Herói dos dois mundos', description: 'Termine o jogo.', check: (c) => c.stats.gameCompleted >= 1 },
  { id: 'perfect', name: 'Perfeccionista', description: 'Pegue todas as moedas de uma fase.', check: (c) => c.stats.perfectLevels >= 1 },
  { id: 'flawless', name: 'Intocável', description: 'Conclua uma fase sem perder vidas.', check: (c) => c.stats.flawlessLevels >= 1 },
  { id: 'fast', name: 'Velocista', description: 'Conclua uma fase na metade do tempo de referência.', check: (c) => c.stats.fastClears >= 1 },
  { id: 'climber', name: 'Alpinista', description: 'Aprenda a escalar paredes.', check: (c) => c.abilities.includes('wallClimb') },
  { id: 'all-abilities', name: 'Mestre das habilidades', description: 'Conquiste as três habilidades.', check: (c) => c.abilities.length >= 3 },
  { id: 'dashes-100', name: 'Relâmpago', description: 'Use o dash 100 vezes.', check: (c) => c.stats.dashes >= 100 },
  { id: 'jumps-500', name: 'Mola humana', description: 'Pule 500 vezes.', check: (c) => c.stats.jumps + c.stats.doubleJumps >= 500 },
  { id: 'blocks-20', name: 'Quebra-tudo', description: 'Quebre 20 blocos rachados.', check: (c) => c.stats.blocksBroken >= 20 },
  { id: 'deaths-50', name: 'Nunca desista', description: 'Perca 50 vidas e continue tentando.', check: (c) => c.stats.deaths >= 50 },
  { id: 'coop', name: 'Dupla dinâmica', description: 'Conclua uma fase no modo cooperativo.', check: (c) => c.stats.coopClears >= 1 },
  { id: 'race', name: 'Pé na tábua', description: 'Termine uma corrida.', check: (c) => c.stats.raceFinishes >= 1 },
  { id: 'editor', name: 'Arquiteto', description: 'Teste uma fase criada no editor.', check: (c) => c.stats.editorTests >= 1 },
  { id: 'shopper', name: 'Estiloso', description: 'Compre um item na loja.', check: (c) => c.ownedSkins.length + c.ownedTrails.length > 2 },
];

export function findAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Retorna os ids das conquistas que passaram a valer agora (ainda não desbloqueadas). */
export function newlyUnlocked(ctx: AchievementContext, unlocked: readonly string[]): string[] {
  return ACHIEVEMENTS.filter((a) => !unlocked.includes(a.id) && a.check(ctx)).map((a) => a.id);
}

export function sanitizeAchievements(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && !!findAchievement(id)))];
}

export function achievementProgress(unlocked: readonly string[]): { done: number; total: number } {
  return { done: unlocked.filter((id) => findAchievement(id)).length, total: ACHIEVEMENTS.length };
}
