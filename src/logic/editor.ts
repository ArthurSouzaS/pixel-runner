/**
 * Lógica do editor de fases: criar, editar, validar, serializar e guardar.
 * Módulo puro (sem Phaser), coberto por testes.
 */
import type { LevelData, ThemeKey } from '../levels/types';
import { isThemeKey, themeByKey } from '../levels/themes';
import { parseLevel, validateLevel } from './levelParser';
import type { StorageLike } from './save';

export const EDITOR_FORMAT = 'pixel-runner-level';
export const EDITOR_VERSION = 1;
export const EDITOR_HEIGHT = 17;
export const EDITOR_MIN_WIDTH = 30;
export const EDITOR_MAX_WIDTH = 200;
export const EDITOR_DEFAULT_WIDTH = 60;
export const EDITOR_SLOTS = 3;
export const EDITOR_STORAGE_KEY = 'pixel-runner:editor';
export const MAX_NAME_LENGTH = 24;

/** Fase criada pelo jogador. */
export interface CustomLevel {
  name: string;
  theme: ThemeKey;
  /** 17 linhas com a mesma largura, no formato ASCII das fases oficiais. */
  map: string[];
}

export type ToolCategory = 'terreno' | 'objetos' | 'inimigos' | 'especial';

export interface EditorTool {
  char: string;
  label: string;
  category: ToolCategory;
}

/** Ferramentas da paleta do editor (o caractere é o mesmo do formato das fases). */
export const EDITOR_TOOLS: readonly EditorTool[] = [
  { char: '#', label: 'Chão', category: 'terreno' },
  { char: 'X', label: 'Bloco', category: 'terreno' },
  { char: '-', label: 'Plataforma', category: 'terreno' },
  { char: 'I', label: 'Gelo', category: 'terreno' },
  { char: 'Q', label: 'Bloco rachado', category: 'terreno' },
  { char: '^', label: 'Espinhos', category: 'objetos' },
  { char: 'o', label: 'Moeda', category: 'objetos' },
  { char: 'K', label: 'Checkpoint', category: 'objetos' },
  { char: 'S', label: 'Mola', category: 'objetos' },
  { char: 'F', label: 'Plataforma que cai', category: 'objetos' },
  { char: 'w', label: 'Gosma', category: 'inimigos' },
  { char: 'h', label: 'Saltador', category: 'inimigos' },
  { char: 'b', label: 'Morcego', category: 'inimigos' },
  { char: 't', label: 'Torreta', category: 'inimigos' },
  { char: 'a', label: 'Blindado', category: 'inimigos' },
  { char: 'P', label: 'Início', category: 'especial' },
  { char: 'G', label: 'Chegada', category: 'especial' },
  { char: '.', label: 'Apagar', category: 'especial' },
];

const VALID_CHARS = new Set(EDITOR_TOOLS.map((t) => t.char));
/** Caracteres que só podem aparecer uma vez. */
const UNIQUE_CHARS = ['P', 'G'];

export function createCustomLevel(width = EDITOR_DEFAULT_WIDTH, name = 'Minha fase', theme: ThemeKey = 'grass'): CustomLevel {
  const w = clampWidth(width);
  const map: string[] = [];
  for (let y = 0; y < EDITOR_HEIGHT; y++) map.push((y >= EDITOR_HEIGHT - 2 ? '#' : '.').repeat(w));
  let level: CustomLevel = { name, theme, map };
  level = setCell(level, 2, EDITOR_HEIGHT - 3, 'P');
  level = setCell(level, w - 3, EDITOR_HEIGHT - 3, 'G');
  return level;
}

export function clampWidth(width: number): number {
  if (!Number.isFinite(width)) return EDITOR_DEFAULT_WIDTH;
  return Math.max(EDITOR_MIN_WIDTH, Math.min(EDITOR_MAX_WIDTH, Math.round(width)));
}

export function levelWidth(level: CustomLevel): number {
  return level.map[0]?.length ?? 0;
}

export function getCell(level: CustomLevel, x: number, y: number): string {
  return level.map[y]?.[x] ?? '.';
}

/** Coloca um caractere numa célula. Início e chegada são únicos: o anterior é removido. */
export function setCell(level: CustomLevel, x: number, y: number, ch: string): CustomLevel {
  const width = levelWidth(level);
  if (x < 0 || y < 0 || x >= width || y >= level.map.length) return level;
  if (!VALID_CHARS.has(ch) || getCell(level, x, y) === ch) return level;
  let map = level.map;
  if (UNIQUE_CHARS.includes(ch)) map = map.map((row) => row.split(ch).join('.'));
  map = map.map((row, ry) => (ry === y ? row.slice(0, x) + ch + row.slice(x + 1) : row));
  return { ...level, map };
}

/** Muda a largura, cortando ou completando à direita (o chão das duas últimas linhas é estendido). */
export function resizeLevel(level: CustomLevel, width: number): CustomLevel {
  const w = clampWidth(width);
  const current = levelWidth(level);
  const map = level.map.map((row, y) => {
    if (w <= current) return row.slice(0, w);
    const fill = y >= EDITOR_HEIGHT - 2 ? '#' : '.';
    return row + fill.repeat(w - current);
  });
  let resized: CustomLevel = { ...level, map };
  // Se a chegada ficou de fora, recoloca no fim.
  if (!map.some((row) => row.includes('G'))) resized = setCell(resized, w - 3, EDITOR_HEIGHT - 3, 'G');
  if (!map.some((row) => row.includes('P'))) resized = setCell(resized, 2, EDITOR_HEIGHT - 3, 'P');
  return resized;
}

export function countChar(level: CustomLevel, ch: string): number {
  return level.map.reduce((n, row) => n + row.split(ch).length - 1, 0);
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Confere se a fase pode ser jogada e salva. */
export function validateCustomLevel(level: CustomLevel): ValidationResult {
  const errors: string[] = [];
  if (!level.name.trim()) errors.push('A fase precisa de um nome.');
  if (level.name.length > MAX_NAME_LENGTH) errors.push(`O nome pode ter no máximo ${MAX_NAME_LENGTH} letras.`);
  if (!isThemeKey(level.theme)) errors.push('Tema inválido.');
  if (level.map.length !== EDITOR_HEIGHT) errors.push(`O mapa deve ter ${EDITOR_HEIGHT} linhas.`);
  const width = levelWidth(level);
  if (width < EDITOR_MIN_WIDTH || width > EDITOR_MAX_WIDTH) errors.push(`A largura deve ficar entre ${EDITOR_MIN_WIDTH} e ${EDITOR_MAX_WIDTH}.`);
  if (level.map.some((row) => row.length !== width)) errors.push('Todas as linhas devem ter a mesma largura.');
  if (level.map.some((row) => [...row].some((ch) => !VALID_CHARS.has(ch)))) errors.push('O mapa tem caracteres inválidos.');
  for (const ch of UNIQUE_CHARS) {
    const n = countChar(level, ch);
    const what = ch === 'P' ? 'início' : 'chegada';
    if (n === 0) errors.push(`Coloque um ${what} (${ch}).`);
    if (n > 1) errors.push(`Só pode haver um ${what}.`);
  }
  if (errors.length === 0) {
    const parsed = parseLevel(level.map);
    for (const e of validateLevel(parsed)) {
      if (e.includes('chão')) errors.push('O início precisa ter chão logo abaixo.');
      else if (e.includes('antes')) errors.push('A chegada deve ficar à direita do início.');
    }
  }
  return { valid: errors.length === 0, errors };
}

/** Converte para o formato usado pela cena da fase. */
export function toLevelData(level: CustomLevel): LevelData {
  const width = levelWidth(level);
  return {
    id: 0,
    world: 0,
    name: level.name,
    subtitle: 'Fase criada no editor',
    par: Math.max(30, Math.round(width * 0.8)),
    theme: themeByKey(level.theme),
    map: [...level.map],
  };
}

// ---------------------------------------------------------------------------
// JSON (exportar / importar)
// ---------------------------------------------------------------------------

export function serializeCustomLevel(level: CustomLevel): string {
  return JSON.stringify({ format: EDITOR_FORMAT, version: EDITOR_VERSION, name: level.name, theme: level.theme, map: level.map }, null, 2);
}

export type ImportResult = { ok: true; level: CustomLevel } | { ok: false; error: string };

export function deserializeCustomLevel(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' };
  }
  const level = sanitizeCustomLevel(raw);
  if (!level) return { ok: false, error: 'O arquivo não é uma fase do Pixel Runner.' };
  const result = validateCustomLevel(level);
  if (!result.valid) return { ok: false, error: result.errors[0] };
  return { ok: true, level };
}

/** Lê um objeto qualquer e devolve uma fase, ou null se o formato não bate. */
export function sanitizeCustomLevel(raw: unknown): CustomLevel | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (data.format !== undefined && data.format !== EDITOR_FORMAT) return null;
  if (typeof data.version === 'number' && data.version > EDITOR_VERSION) return null;
  if (!Array.isArray(data.map) || !data.map.every((row) => typeof row === 'string')) return null;
  const name = typeof data.name === 'string' ? data.name.slice(0, MAX_NAME_LENGTH) : 'Fase importada';
  const theme = isThemeKey(data.theme) ? data.theme : 'grass';
  return { name, theme, map: [...(data.map as string[])] };
}

// ---------------------------------------------------------------------------
// Slots no localStorage
// ---------------------------------------------------------------------------

export type EditorSlots = (CustomLevel | null)[];

export function loadEditorSlots(storage: StorageLike | null | undefined): EditorSlots {
  const empty: EditorSlots = Array.from({ length: EDITOR_SLOTS }, () => null);
  if (!storage) return empty;
  try {
    const text = storage.getItem(EDITOR_STORAGE_KEY);
    if (!text) return empty;
    const raw = JSON.parse(text);
    if (!Array.isArray(raw)) return empty;
    return empty.map((_, i) => {
      const level = sanitizeCustomLevel(raw[i]);
      return level && validateCustomLevel(level).valid ? level : null;
    });
  } catch {
    return empty;
  }
}

export function saveEditorSlot(storage: StorageLike | null | undefined, slots: EditorSlots, index: number, level: CustomLevel): EditorSlots {
  if (index < 0 || index >= EDITOR_SLOTS) return slots;
  const next = slots.map((s, i) => (i === index ? level : s));
  if (storage) {
    try {
      storage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Armazenamento indisponível: a fase continua na memória.
    }
  }
  return next;
}
