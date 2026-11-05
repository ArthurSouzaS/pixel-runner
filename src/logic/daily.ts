/**
 * Desafio diário: uma fase gerada com a seed do dia (igual para todo mundo) e placar local.
 * Módulo puro.
 */
import type { RoomOptions } from './procgen';

/** Data no formato AAAA-MM-DD (UTC, para ser o mesmo dia para todo mundo). */
export function todayString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Seed do dia, ex.: "D20261105". */
export function dailySeed(date: string): string {
  return `D${date.replace(/-/g, '')}`;
}

/** O desafio é uma fase longa de dificuldade média-alta. */
export const DAILY_OPTIONS: RoomOptions = { chunks: 10, minTier: 2, maxTier: 4 };

export interface DailyEntry {
  name: string;
  /** Tempo em segundos (menor é melhor). */
  time: number;
  coins: number;
}

export interface DailyState {
  date: string;
  attempts: number;
  entries: DailyEntry[];
  /** Melhor tempo de dias anteriores (mais recente primeiro). */
  history: { date: string; time: number }[];
}

export const DAILY_BOARD_SIZE = 10;
export const DAILY_HISTORY_SIZE = 7;

export function emptyDaily(date = ''): DailyState {
  return { date, attempts: 0, entries: [], history: [] };
}

/** Garante que o estado é do dia `date`; se for de outro dia, arquiva o melhor tempo e zera. */
export function rollDaily(state: DailyState, date: string): DailyState {
  if (state.date === date) return state;
  const history = [...state.history];
  if (state.date && state.entries.length > 0) history.unshift({ date: state.date, time: state.entries[0].time });
  return { date, attempts: 0, entries: [], history: history.slice(0, DAILY_HISTORY_SIZE) };
}

export function addAttempt(state: DailyState, date: string): DailyState {
  const s = rollDaily(state, date);
  return { ...s, attempts: s.attempts + 1 };
}

export interface DailyResult {
  state: DailyState;
  /** Posição no placar do dia (0 = primeiro) ou -1 se não entrou. */
  rank: number;
}

export function addDailyEntry(state: DailyState, date: string, entry: DailyEntry): DailyResult {
  const s = rollDaily(state, date);
  const clean = { name: entry.name.slice(0, 8) || 'PIX', time: Math.max(0, entry.time), coins: Math.max(0, Math.floor(entry.coins)) };
  const entries = [...s.entries, clean].sort((a, b) => a.time - b.time || b.coins - a.coins).slice(0, DAILY_BOARD_SIZE);
  return { state: { ...s, entries }, rank: entries.indexOf(clean) };
}

export function sanitizeDaily(raw: unknown): DailyState {
  if (!raw || typeof raw !== 'object') return emptyDaily();
  const d = raw as Partial<Record<keyof DailyState, unknown>>;
  const date = typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : '';
  const entries = Array.isArray(d.entries)
    ? d.entries
        .filter((e): e is DailyEntry => !!e && typeof e === 'object' && Number.isFinite(e.time) && e.time >= 0)
        .map((e) => ({ name: typeof e.name === 'string' ? e.name.slice(0, 8) : 'PIX', time: e.time, coins: Number.isFinite(e.coins) ? Math.max(0, Math.floor(e.coins)) : 0 }))
        .sort((a, b) => a.time - b.time)
        .slice(0, DAILY_BOARD_SIZE)
    : [];
  const history = Array.isArray(d.history)
    ? d.history.filter((h): h is { date: string; time: number } => !!h && typeof h.date === 'string' && Number.isFinite(h.time)).slice(0, DAILY_HISTORY_SIZE)
    : [];
  const attempts = typeof d.attempts === 'number' && Number.isFinite(d.attempts) && d.attempts > 0 ? Math.floor(d.attempts) : 0;
  return { date, attempts, entries, history };
}
