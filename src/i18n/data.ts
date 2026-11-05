/**
 * Traduções de dados do jogo (fases, conquistas, itens...). O texto em português vem
 * dos próprios dados; o inglês fica no dicionário com chaves derivadas do id.
 */
import type { LevelData } from '../levels/types';
import { tOr } from './index';

export const levelName = (l: LevelData): string => (l.id > 0 ? tOr(`level.${l.id}.name`, l.name) : l.name);
export const levelSubtitle = (l: LevelData): string => (l.id > 0 ? tOr(`level.${l.id}.subtitle`, l.subtitle) : l.subtitle);
export const hintText = (l: LevelData, index: number, text: string): string => (l.id > 0 ? tOr(`level.${l.id}.hint.${index}`, text) : text);
export const hintTouchText = (l: LevelData, index: number, text: string): string => (l.id > 0 ? tOr(`level.${l.id}.hintTouch.${index}`, text) : text);
export const worldName = (id: number, fallback: string): string => tOr(`world.${id}`, fallback);
export const achievementName = (id: string, fallback: string): string => tOr(`ach.${id}.name`, fallback);
export const achievementDesc = (id: string, fallback: string): string => tOr(`ach.${id}.desc`, fallback);
export const abilityText = (id: string, field: 'name' | 'description' | 'keyboard' | 'touch', fallback: string): string => tOr(`ability.${id}.${field}`, fallback);
export const skinName = (id: string, fallback: string): string => tOr(`skin.${id}`, fallback);
export const trailName = (id: string, fallback: string): string => tOr(`trail.${id}`, fallback);
export const statLabel = (key: string, fallback: string): string => tOr(`stat.${key}`, fallback);
export const toolLabel = (char: string, fallback: string): string => tOr(`tool.${char === '.' ? 'erase' : char === '#' ? 'ground' : char === '-' ? 'platform' : char === '^' ? 'spikes' : char}`, fallback);
export const themeName = (key: string, fallback: string): string => tOr(`theme.${key}`, fallback);
