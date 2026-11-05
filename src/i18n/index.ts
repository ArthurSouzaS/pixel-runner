/**
 * Traduções do jogo. `t('chave', { nome: 'valor' })` devolve o texto no idioma atual,
 * trocando `{nome}` pelos parâmetros. Se faltar no idioma atual, usa o português.
 */
import { en } from './en';
import { pt } from './pt';

export type Lang = 'pt' | 'en';
export type Dictionary = Record<string, string>;

const DICTS: Record<Lang, Dictionary> = { pt, en };
export const LANGS: readonly Lang[] = ['pt', 'en'];

let current: Lang = 'pt';

export function setLang(lang: Lang): void {
  current = lang;
}

export function getLang(): Lang {
  return current;
}

export function isLang(value: unknown): value is Lang {
  return value === 'pt' || value === 'en';
}

export function hasKey(key: string, lang: Lang = current): boolean {
  return key in DICTS[lang];
}

export function t(key: string, params?: Record<string, string | number>): string {
  const text = DICTS[current][key] ?? DICTS.pt[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** Traduz se a chave existir; senão devolve o texto original (útil para dados antigos). */
export function tOr(key: string, fallback: string): string {
  return hasKey(key) || hasKey(key, 'pt') ? t(key) : fallback;
}

export function dictionaries(): Readonly<Record<Lang, Dictionary>> {
  return DICTS;
}
