/**
 * Estatísticas do jogador, acumuladas entre partidas. Módulo puro.
 */

export const STAT_KEYS = [
  'jumps',
  'doubleJumps',
  'dashes',
  'rushes',
  'coins',
  'enemies',
  'deaths',
  'levelsCleared',
  'perfectLevels',
  'flawlessLevels',
  'fastClears',
  'bossCore',
  'bossStorm',
  'gameCompleted',
  'coopClears',
  'raceFinishes',
  'blocksBroken',
  'springs',
  'editorTests',
  'purchases',
  'playSeconds',
  'maxCombo',
] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type PlayerStats = Record<StatKey, number>;

/** Rótulos para a tela de estatísticas (na ordem de exibição). */
export const STAT_LABELS: [StatKey, string][] = [
  ['playSeconds', 'Tempo de jogo'],
  ['levelsCleared', 'Fases concluídas'],
  ['coins', 'Moedas coletadas'],
  ['enemies', 'Inimigos derrotados'],
  ['maxCombo', 'Maior combo'],
  ['jumps', 'Pulos'],
  ['doubleJumps', 'Pulos duplos'],
  ['dashes', 'Dashes'],
  ['rushes', 'Investidas'],
  ['blocksBroken', 'Blocos quebrados'],
  ['springs', 'Molas usadas'],
  ['deaths', 'Vidas perdidas'],
  ['perfectLevels', 'Todas as moedas'],
  ['flawlessLevels', 'Fases sem morrer'],
  ['bossCore', 'Núcleo derrotado'],
  ['bossStorm', 'Tempestade derrotada'],
  ['coopClears', 'Fases no cooperativo'],
  ['raceFinishes', 'Corridas disputadas'],
  ['editorTests', 'Testes no editor'],
  ['purchases', 'Compras na loja'],
];

export function emptyStats(): PlayerStats {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as PlayerStats;
}

export function isStatKey(value: unknown): value is StatKey {
  return typeof value === 'string' && (STAT_KEYS as readonly string[]).includes(value);
}

export function addStat(stats: PlayerStats, key: StatKey, amount = 1): PlayerStats {
  if (!Number.isFinite(amount) || amount <= 0) return stats;
  return { ...stats, [key]: stats[key] + amount };
}

/** Guarda o maior valor já visto (ex.: maior combo). */
export function maxStat(stats: PlayerStats, key: StatKey, value: number): PlayerStats {
  if (!Number.isFinite(value) || value <= stats[key]) return stats;
  return { ...stats, [key]: value };
}

export function sanitizeStats(raw: unknown): PlayerStats {
  const stats = emptyStats();
  if (!raw || typeof raw !== 'object') return stats;
  for (const key of STAT_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) stats[key] = value;
  }
  return stats;
}

/** Formata o valor para exibição (tempo em h/min, o resto inteiro). */
export function formatStat(key: StatKey, value: number): string {
  if (key === 'playSeconds') {
    const total = Math.floor(value);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min ${String(s).padStart(2, '0')}s`;
  }
  return String(Math.floor(value));
}
