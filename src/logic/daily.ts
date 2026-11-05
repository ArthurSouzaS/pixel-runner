/**
 * Desafio diário: data do dia e placar local. Módulo puro.
 */

/** Data no formato AAAA-MM-DD (UTC, para ser o mesmo dia para todo mundo). */
export function todayString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
