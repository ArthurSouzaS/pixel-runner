import { LEVELS } from './index';
import type { LevelTheme, ThemeKey } from './types';

/** Temas disponíveis (na ordem em que aparecem no jogo) e seus nomes. */
export const THEME_KEYS: readonly ThemeKey[] = ['grass', 'cave', 'factory', 'ice', 'castle', 'frost', 'reef', 'ruins', 'sky', 'storm'];

export const THEME_NAMES: Record<ThemeKey, string> = {
  grass: 'Campos',
  cave: 'Caverna',
  factory: 'Fábrica',
  ice: 'Picos',
  castle: 'Fortaleza',
  frost: 'Lago gelado',
  reef: 'Recife',
  ruins: 'Ruínas',
  sky: 'Penhasco',
  storm: 'Tempestade',
};

/** Paleta completa de um tema, reaproveitando as cores das fases oficiais. */
export function themeByKey(key: ThemeKey): LevelTheme {
  const found = LEVELS.find((l) => l.theme.key === key);
  return found ? found.theme : LEVELS[0].theme;
}

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && (THEME_KEYS as readonly string[]).includes(value);
}
